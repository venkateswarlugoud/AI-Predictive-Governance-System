import Complaint from "../models/Complaint.js";
import { predictComplaint } from "../services/aiService.js";
import { evaluateConfidence } from "../services/confidenceGovernance.js";
import { computeSlaForComplaint } from "../services/slaService.js";
import { deriveEscalationLevel } from "../services/escalationService.js";
import User from "../models/User.js";
import {
  NOTIFICATION_TYPES,
  isWithinNotificationRateLimit,
  sendEmail,
  buildAcknowledgementEmail,
  buildResolutionConfirmationEmail,
  buildStatusUpdateEmail,
} from "../services/notificationService.js";

/**
 * =======================================
 * CREATE COMPLAINT (Citizen)
 * =======================================
 *
 * GOVERNANCE NOTES:
 * - AI-first approach with confidence governance
 * - All decisions are auditable and traceable
 * - Low confidence predictions require human review
 */
export const createComplaint = async (req, res) => {
  try {
    const { title, description, location, ward, geoLocation } = req.body;

    // Basic validation
    if (!title || !description || !location || !ward) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Authentication check
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    // ========================================
    // GEO-LOCATION VALIDATION (Phase-2)
    // ========================================
    let validatedGeoLocation = null;
    // Only process geoLocation if it exists AND has coordinates
    // This prevents Mongoose from creating empty geoLocation objects
    if (geoLocation && geoLocation.coordinates) {
      // Validate geoLocation structure
      if (!Array.isArray(geoLocation.coordinates) || geoLocation.coordinates.length !== 2) {
        return res.status(400).json({
          success: false,
          message: "geoLocation.coordinates must be an array of 2 numbers [longitude, latitude]",
        });
      }

      const [longitude, latitude] = geoLocation.coordinates;

      // Validate coordinate types
      if (typeof longitude !== "number" || typeof latitude !== "number") {
        return res.status(400).json({
          success: false,
          message: "geoLocation.coordinates must contain numbers only",
        });
      }

      // Validate longitude range (-180 to 180)
      if (longitude < -180 || longitude > 180) {
        return res.status(400).json({
          success: false,
          message: "Longitude must be between -180 and 180",
        });
      }

      // Validate latitude range (-90 to 90)
      if (latitude < -90 || latitude > 90) {
        return res.status(400).json({
          success: false,
          message: "Latitude must be between -90 and 90",
        });
      }

      // Construct valid GeoJSON Point
      validatedGeoLocation = {
        type: "Point",
        coordinates: [longitude, latitude],
      };
    }

    const combinedText = `${title}. ${description}`.trim();
    const now = new Date();

    // ========================================
    // STEP 1: ATTEMPT AI PREDICTION
    // ========================================
    let aiCategory = "Uncertain";
    let aiCategoryConfidence = 0;
    let aiPriority = "Medium";
    let aiPriorityConfidence = 0;
    let aiModelVersion = null;
    let aiServiceAvailable = false;

    try {
      const aiResponse = await predictComplaint(combinedText);
      
      if (
        aiResponse &&
        typeof aiResponse === "object" &&
        typeof aiResponse.category === "string" &&
        typeof aiResponse.priority === "string"
      ) {
        aiServiceAvailable = true;
        aiCategory = aiResponse.category;
        aiCategoryConfidence =
          typeof aiResponse.categoryConfidence === "number"
            ? aiResponse.categoryConfidence
            : 0;
        aiPriority = aiResponse.priority;
        aiPriorityConfidence =
          typeof aiResponse.priorityConfidence === "number"
            ? aiResponse.priorityConfidence
            : 0;
        aiModelVersion = aiResponse.model_version || aiResponse.modelVersion || null;
      }
    } catch (aiError) {
      // AI service unavailable - will use safe fallback
      aiServiceAvailable = false;
    }

    // ========================================
    // STEP 2: APPLY CONFIDENCE GOVERNANCE
    // ========================================
    let finalCategory = "Uncertain";
    let finalPriority = "Medium";
    let categorySource = "RULE";
    let prioritySource = "RULE";
    let categoryDecisionStatus = "FALLBACK_RULE";
    let priorityDecisionStatus = "FALLBACK_RULE";
    let categoryConfidence = null;
    let priorityConfidence = null;

    if (aiServiceAvailable) {
      // Apply confidence governance to category
      const categoryGovernance = evaluateConfidence(aiCategory, aiCategoryConfidence);

      // Apply confidence governance to priority
      const priorityGovernance = evaluateConfidence(aiPriority, aiPriorityConfidence);

      // AI is the single source of truth; governance only annotates confidence/decision status.
      finalCategory = aiCategory;
      finalPriority = aiPriority;
      categorySource = "AI";
      prioritySource = "AI";
      categoryDecisionStatus = categoryGovernance.decisionStatus;
      priorityDecisionStatus = priorityGovernance.decisionStatus;
      categoryConfidence = aiCategoryConfidence;
      priorityConfidence = aiPriorityConfidence;

    } else {
      // ========================================
      // STEP 3: SAFE FALLBACK (NO AI)
      // ========================================
      categorySource = "RULE";
      prioritySource = "RULE";
      categoryDecisionStatus = "FALLBACK_RULE";
      priorityDecisionStatus = "FALLBACK_RULE";
      categoryConfidence = null;
      priorityConfidence = null;
    }

    // ========================================
    // STEP 3.5: ENFORCE SCHEMA-SAFE OUTPUTS
    // ========================================
    const ALLOWED_CATEGORIES = new Set([
      "Sanitation",
      "Roads",
      "Electricity",
      "Water",
      "Uncertain",
    ]);
    const ALLOWED_PRIORITIES = new Set(["Low", "Medium", "High"]);

    if (!ALLOWED_CATEGORIES.has(finalCategory)) {
      finalCategory = "Uncertain";
      categorySource = "RULE";
      categoryDecisionStatus = "FALLBACK_RULE";
      categoryConfidence = null;
    }

    if (!ALLOWED_PRIORITIES.has(finalPriority)) {
      finalPriority = "Medium";
      prioritySource = "RULE";
      priorityDecisionStatus = "FALLBACK_RULE";
      priorityConfidence = null;
    }

    // ========================================
    // STEP 4: CREATE COMPLAINT WITH GOVERNANCE FIELDS
    // ========================================
    const complaintData = {
      title,
      description,
      location,
      ward,
      category: finalCategory,
      priority: finalPriority,
      finalCategory: finalCategory,
      finalPriority: finalPriority,
      categoryConfidence,
      priorityConfidence,
      categorySource,
      categoryDecisionStatus,
      prioritySource,
      priorityDecisionStatus,
      aiModelVersion,
      status: "New",
      user: req.user._id,
      complaintMonth: now.getMonth() + 1,
      complaintYear: now.getFullYear(),
      createdAt: now,
    };

    // Initialize AI prediction history when AI service returned a prediction
    if (aiServiceAvailable) {
      complaintData.aiPredictionHistory = [
        {
          modelVersion: aiModelVersion || "unknown",
          category: finalCategory,
          priority: finalPriority,
          categoryConfidence: aiCategoryConfidence || null,
          priorityConfidence: aiPriorityConfidence || null,
          predictedAt: now,
        },
      ];
    }

    // Add geoLocation if provided (Phase-2)
    // Only add if we have valid coordinates to prevent MongoDB errors
    if (validatedGeoLocation && 
        validatedGeoLocation.coordinates && 
        Array.isArray(validatedGeoLocation.coordinates) && 
        validatedGeoLocation.coordinates.length === 2) {
      complaintData.geoLocation = validatedGeoLocation;
    } else {
      // CRITICAL: Explicitly ensure geoLocation is NEVER in complaintData when invalid
      // Prevents MongoDB "Can't extract geo keys" error from 2dsphere index
      delete complaintData.geoLocation;
    }

    // Use new + save instead of create to ensure pre-save hook runs and strips invalid geoLocation
    const complaint = new Complaint(complaintData);
    // Double-check: remove invalid geoLocation before save (belt-and-suspenders)
    if (complaint.geoLocation && (!complaint.geoLocation?.coordinates || !Array.isArray(complaint.geoLocation.coordinates) || complaint.geoLocation.coordinates.length !== 2)) {
      complaint.geoLocation = undefined;
    }
    await complaint.save();

    // Best-effort acknowledgement email (does not affect complaint creation).
    try {
      const user = await User.findById(req.user._id).select("name email");
      if (user && user.email && isWithinNotificationRateLimit(complaint, 0)) {
        const emailPayload = buildAcknowledgementEmail(complaint, user);
        const result = await sendEmail({
          to: user.email,
          subject: emailPayload.subject,
          text: emailPayload.text,
        });
        if (result.success) {
          complaint.lastNotifiedAt = new Date();
          await complaint.save();
        } else {
          console.error("⚠️ ACK EMAIL FAILED (non-blocking):", result.error);
        }
      }
    } catch (notifyError) {
      console.error("⚠️ ACK EMAIL FAILED (non-blocking):", notifyError.code, notifyError.response, notifyError.message);
    }

    return res.status(201).json({
      success: true,
      complaint,
    });

  } catch (error) {
    console.error("❌ CREATE COMPLAINT ERROR:", error.message);
    console.error("❌ ERROR STACK:", error.stack);

    return res.status(500).json({
      success: false,
      message: "Failed to create complaint",
    });
  }
};

/**
 * =======================================
 * GET ALL COMPLAINTS (Admin)
 * =======================================
 *
 * GOVERNANCE NOTES:
 * - Admin-only
 * - Read-only access
 */
export const getAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find().sort({ createdAt: -1 });

    // Attach SLA and escalation (read-only, not persisted)
    const complaintsWithSla = complaints.map((complaint) => {
      const base = complaint.toObject ? complaint.toObject() : complaint;
      const sla = computeSlaForComplaint(base);
      const escalationLevel = deriveEscalationLevel({
        complaintStatus: base.status,
        slaStatus: sla.slaStatus,
        priority: base.priority,
      });
      return {
        ...base,
        ...sla,
        escalationLevel,
      };
    });

    return res.json({
      success: true,
      complaints: complaintsWithSla,
    });
  } catch (error) {
    console.error("❌ FETCH ALL COMPLAINTS ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch complaints",
    });
  }
};

/**
 * =======================================
 * GET MY COMPLAINTS (Citizen)
 * =======================================
 *
 * GOVERNANCE NOTES:
 * - Citizen sees ONLY own complaints
 */
export const getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({
      user: req.user._id,
    }).sort({ createdAt: -1 });

    // Attach SLA and escalation for citizen view (read-only)
    const complaintsWithSla = complaints.map((complaint) => {
      const base = complaint.toObject ? complaint.toObject() : complaint;
      const sla = computeSlaForComplaint(base);
      const escalationLevel = deriveEscalationLevel({
        complaintStatus: base.status,
        slaStatus: sla.slaStatus,
        priority: base.priority,
      });
      return {
        ...base,
        ...sla,
        escalationLevel,
      };
    });

    return res.json({
      success: true,
      complaints: complaintsWithSla,
    });
  } catch (error) {
    console.error("❌ FETCH MY COMPLAINTS ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch user complaints",
    });
  }
};

/**
 * =======================================
 * GET SINGLE COMPLAINT BY ID (Admin)
 * =======================================
 *
 * GOVERNANCE NOTES:
 * - Admin-only
 * - Used for complaint detail view
 */
export const getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate(
      "decisionAudit.decidedBy",
      "name role"
    );

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }
    const base = complaint.toObject ? complaint.toObject() : complaint;
    const sla = computeSlaForComplaint(base);
    const escalationLevel = deriveEscalationLevel({
      complaintStatus: base.status,
      slaStatus: sla.slaStatus,
      priority: base.priority,
    });

    return res.json({
      success: true,
      complaint: {
        ...base,
        ...sla,
        escalationLevel,
      },
    });
  } catch (error) {
    console.error("❌ FETCH COMPLAINT BY ID ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch complaint",
    });
  }
};

/**
 * =======================================
 * UPDATE COMPLAINT STATUS (Admin)
 * =======================================
 *
 * GOVERNANCE NOTES:
 * - Status updates are ADMIN actions
 * - Used to mark complaints as Resolved
 * - Phase-2 repeat detection depends on this status
 */
export const updateComplaintStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const existingComplaint = await Complaint.findById(req.params.id);

    if (!existingComplaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    const previousStatus = existingComplaint.status;
    existingComplaint.status = status;
    const updatedComplaint = await existingComplaint.save();

    // Best-effort, governance-safe notifications on admin status change.
    try {
      const populatedComplaint = await Complaint.findById(updatedComplaint._id).populate(
        "user"
      );
      const citizen = populatedComplaint?.user;

      // Always notify on status change; rate limiting is handled at other notification endpoints.
      if (citizen && citizen.email) {
        if (status === "Resolved" && previousStatus !== "Resolved") {
          const resolutionPayload = buildResolutionConfirmationEmail(
            populatedComplaint,
            citizen
          );
          const result = await sendEmail({
            to: citizen.email,
            subject: resolutionPayload.subject,
            text: resolutionPayload.text,
          });
          if (result.success) {
            populatedComplaint.lastNotifiedAt = new Date();
            await populatedComplaint.save();
          } else {
            console.error("⚠️ RESOLUTION EMAIL FAILED (non-blocking):", result.error);
          }
        } else if (status !== previousStatus) {
          const statusPayload = buildStatusUpdateEmail(
            populatedComplaint,
            citizen,
            previousStatus
          );
          const result = await sendEmail({
            to: citizen.email,
            subject: statusPayload.subject,
            text: statusPayload.text,
          });
          if (result.success) {
            populatedComplaint.lastNotifiedAt = new Date();
            await populatedComplaint.save();
          } else {
            console.error("⚠️ STATUS UPDATE EMAIL FAILED (non-blocking):", result.error);
          }
        }
      }
    } catch (notifyError) {
      console.error("⚠️ STATUS UPDATE EMAIL FAILED (non-blocking):", notifyError.code, notifyError.response, notifyError.message);
    }

    // Re-fetch complaint so response includes lastNotifiedAt/apologySent if they were just updated
    const complaintToReturn = await Complaint.findById(updatedComplaint._id);
    const base = complaintToReturn.toObject ? complaintToReturn.toObject() : complaintToReturn;
    const sla = computeSlaForComplaint(base);
    const escalationLevel = deriveEscalationLevel({
      complaintStatus: base.status,
      slaStatus: sla.slaStatus,
      priority: base.priority,
    });

    return res.json({
      success: true,
      complaint: { ...base, ...sla, escalationLevel },
    });
  } catch (error) {
    console.error("❌ UPDATE STATUS ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update complaint status",
    });
  }
};

/**
 * =======================================
 * OVERRIDE COMPLAINT DECISION (Admin)
 * =======================================
 *
 * GOVERNANCE NOTES:
 * - Only finalCategory/finalPriority are overridden.
 * - AI advisory fields (category, priority, confidences, sources,
 *   decision statuses, aiModelVersion) remain immutable.
 * - Resolved complaints cannot be overridden.
 */
export const overrideComplaintDecision = async (req, res) => {
  try {
    const { finalCategory, finalPriority, overrideReason } = req.body || {};

    if (!overrideReason || typeof overrideReason !== "string" || overrideReason.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "overrideReason is required",
      });
    }

    if (finalCategory === undefined && finalPriority === undefined) {
      return res.status(400).json({
        success: false,
        message: "At least one of finalCategory or finalPriority must be provided",
      });
    }

    const allowedCategories = new Set(["Sanitation", "Roads", "Electricity", "Water", "Uncertain"]);
    const allowedPriorities = new Set(["Low", "Medium", "High"]);

    if (finalCategory !== undefined) {
      if (typeof finalCategory !== "string" || !allowedCategories.has(finalCategory)) {
        return res.status(400).json({
          success: false,
          message: "Invalid finalCategory value",
        });
      }
    }

    if (finalPriority !== undefined) {
      if (typeof finalPriority !== "string" || !allowedPriorities.has(finalPriority)) {
        return res.status(400).json({
          success: false,
          message: "Invalid finalPriority value",
        });
      }
    }

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    if (complaint.status === "Resolved") {
      return res.status(400).json({
        success: false,
        message: "Cannot override a resolved complaint.",
      });
    }

    if (finalCategory !== undefined) {
      complaint.finalCategory = finalCategory;
    }

    if (finalPriority !== undefined) {
      complaint.finalPriority = finalPriority;
    }

    complaint.decisionAudit = {
      decidedBy: req.user._id,
      decidedAt: new Date(),
      overrideReason: overrideReason.trim(),
    };

    const updatedComplaint = await complaint.save();

    return res.status(200).json({
      success: true,
      message: "Complaint decision overridden successfully",
      complaint: updatedComplaint,
    });
  } catch (error) {
    console.error("❌ OVERRIDE COMPLAINT DECISION ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to override complaint decision",
    });
  }
};
