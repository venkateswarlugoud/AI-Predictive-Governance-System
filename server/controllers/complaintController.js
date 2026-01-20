import Complaint from "../models/Complaint.js";
import { refinePriority } from "../services/priorityRules.js";
import { refineCategory } from "../services/categoryRules.js";

/**
 * =======================================
 * CREATE COMPLAINT (Citizen)
 * =======================================
 *
 * GOVERNANCE NOTES:
 * - Complaint creation is OPERATIONAL
 * - No Phase-2 (embedding / similarity) logic here
 * - No repeat flags stored
 * - Fully explainable rule-based classification
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

    // Phase-1: Rule-based, explainable classification
    const category = refineCategory(combinedText, "Sanitation"); // fallback only
    const priority = refinePriority(combinedText, "Medium");     // fallback only

    const now = new Date();

    const complaint = await Complaint.create({
      title,
      description,
      location,
      ward,
      category,
      priority,
      categoryConfidence: 1,
      priorityConfidence: 1,
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
