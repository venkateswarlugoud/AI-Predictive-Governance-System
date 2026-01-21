import Complaint from "../models/Complaint.js";
import { predictComplaint } from "../services/aiService.js";
import { evaluateConfidence } from "../services/confidenceGovernance.js";

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
