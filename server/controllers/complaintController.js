import Complaint from "../models/Complaint.js";
import { refinePriority } from "../services/priorityRules.js";
import { refineCategory } from "../services/categoryRules.js";
import { predictComplaint } from "../services/aiService.js";
import { evaluateConfidence } from "../services/confidenceGovernance.js";

/**
 * =======================================
 * CREATE COMPLAINT (Citizen)
 * =======================================
 *
 * GOVERNANCE NOTES:
 * - AI-first approach with confidence governance
 * - Rule-based fallback if AI unavailable
 * - All decisions are auditable and traceable
 * - Low confidence predictions require human review
 */
export const createComplaint = async (req, res) => {
  try {
    const { title, description, location, ward } = req.body;

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

    const combinedText = `${title}. ${description}`;
    const now = new Date();

    // ========================================
    // STEP 1: ATTEMPT AI PREDICTION
    // ========================================
    let aiCategory = null;
    let aiCategoryConfidence = 0;
    let aiPriority = null;
    let aiPriorityConfidence = 0;
    let aiModelVersion = null;
    let aiServiceAvailable = false;

    try {
      const aiResponse = await predictComplaint(combinedText);
      
      if (aiResponse && aiResponse.category && aiResponse.priority) {
        aiServiceAvailable = true;
        aiCategory = aiResponse.category;
        aiCategoryConfidence = aiResponse.categoryConfidence || 0;
        aiPriority = aiResponse.priority;
        aiPriorityConfidence = aiResponse.priorityConfidence || 0;
        aiModelVersion = aiResponse.model_version || aiResponse.modelVersion || null;

        // AUDIT LOG: AI Prediction Received
        console.log("📊 AI PREDICTION RECEIVED:", {
          category: aiCategory,
          categoryConfidence: aiCategoryConfidence,
          priority: aiPriority,
          priorityConfidence: aiPriorityConfidence,
          modelVersion: aiModelVersion,
          textPreview: combinedText.substring(0, 50) + "..."
        });
      }
    } catch (aiError) {
      // AI service unavailable - will use rule-based fallback
      console.warn("⚠️ AI SERVICE UNAVAILABLE - Using rule-based fallback:", aiError.message);
      aiServiceAvailable = false;
    }

    // ========================================
    // STEP 2: APPLY CONFIDENCE GOVERNANCE
    // ========================================
    let finalCategory, finalPriority;
    let categorySource, prioritySource;
    let categoryDecisionStatus, priorityDecisionStatus;
    let categoryConfidence, priorityConfidence;

    if (aiServiceAvailable) {
      // Apply confidence governance to category
      const categoryGovernance = evaluateConfidence(aiCategory, aiCategoryConfidence);
      categoryDecisionStatus = categoryGovernance.decisionStatus;
      categoryConfidence = aiCategoryConfidence;

      // Apply confidence governance to priority
      const priorityGovernance = evaluateConfidence(aiPriority, aiPriorityConfidence);
      priorityDecisionStatus = priorityGovernance.decisionStatus;
      priorityConfidence = aiPriorityConfidence;

      // Determine final values based on governance
      if (categoryGovernance.decisionStatus === "REQUIRES_REVIEW" || aiCategory === "Uncertain") {
        // Low confidence or uncertain - use rule-based fallback
        // Use a valid default category for rule-based refinement
        finalCategory = refineCategory(combinedText, "Sanitation");
        categorySource = "RULE";
        categoryDecisionStatus = "FALLBACK_RULE";
        // Keep AI confidence for audit trail
        categoryConfidence = aiCategoryConfidence;
        
        // AUDIT LOG: Category Fallback
        console.log("🔄 CATEGORY FALLBACK TO RULES:", {
          aiCategory: aiCategory,
          aiConfidence: aiCategoryConfidence,
          finalCategory: finalCategory,
          reason: "Low confidence or uncertain prediction"
        });
      } else {
        // Use AI prediction
        finalCategory = aiCategory;
        categorySource = "AI";
      }

      if (priorityGovernance.decisionStatus === "REQUIRES_REVIEW") {
        // Low confidence - use rule-based fallback
        finalPriority = refinePriority(combinedText, aiPriority);
        prioritySource = "RULE";
        priorityDecisionStatus = "FALLBACK_RULE";
        // Keep AI confidence for audit trail
        priorityConfidence = aiPriorityConfidence;
        
        // AUDIT LOG: Priority Fallback
        console.log("🔄 PRIORITY FALLBACK TO RULES:", {
          aiPriority: aiPriority,
          aiConfidence: aiPriorityConfidence,
          finalPriority: finalPriority,
          reason: "Low confidence prediction"
        });
      } else {
        // Use AI prediction
        finalPriority = aiPriority;
        prioritySource = "AI";
      }

      // AUDIT LOG: Final Governance Decision
      console.log("✅ GOVERNANCE DECISION:", {
        category: {
          value: finalCategory,
          source: categorySource,
          decisionStatus: categoryDecisionStatus,
          confidence: categoryConfidence
        },
        priority: {
          value: finalPriority,
          source: prioritySource,
          decisionStatus: priorityDecisionStatus,
          confidence: priorityConfidence
        },
        modelVersion: aiModelVersion
      });

    } else {
      // ========================================
      // STEP 3: FALLBACK TO RULE-BASED LOGIC
      // ========================================
      finalCategory = refineCategory(combinedText, "Sanitation");
      finalPriority = refinePriority(combinedText, "Medium");
      categorySource = "RULE";
      prioritySource = "RULE";
      categoryDecisionStatus = "FALLBACK_RULE";
      priorityDecisionStatus = "FALLBACK_RULE";
      categoryConfidence = 1.0; // Rule-based has full confidence
      priorityConfidence = 1.0;

      // AUDIT LOG: Rule-based Fallback
      console.log("🔄 RULE-BASED FALLBACK:", {
        category: finalCategory,
        priority: finalPriority,
        reason: "AI service unavailable"
      });
    }

    // ========================================
    // STEP 4: CREATE COMPLAINT WITH GOVERNANCE FIELDS
    // ========================================
    const complaint = await Complaint.create({
      title,
      description,
      location,
      ward,
      category: finalCategory,
      priority: finalPriority,
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
    });

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
    const complaints = await Complaint.find()
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      complaints,
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

    return res.json({
      success: true,
      complaints,
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
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    return res.json({
      success: true,
      complaint,
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

    const updatedComplaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!updatedComplaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    return res.json({
      success: true,
      complaint: updatedComplaint,
    });
  } catch (error) {
    console.error("❌ UPDATE STATUS ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update complaint status",
    });
  }
};
