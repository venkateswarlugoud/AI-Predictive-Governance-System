import Complaint from "../models/Complaint.js";
import { predictComplaint } from "../services/aiService.js";
import { refinePriority } from "../services/priorityRules.js";
import { refineCategory } from "../services/categoryRules.js";

// =======================================
// CREATE COMPLAINT (Citizen) – AI + RULES
// =======================================
export const createComplaint = async (req, res) => {
  try {
    const { title, description, location, ward } = req.body;

    if (!title || !description || !location || !ward) {
      return res.status(400).json({
        success: false,
        message: "Title, description, location and ward are required",
      });
    }

    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Step 1: AI prediction
    const aiInputText = `${title}. ${description}`;
    const aiResult = await predictComplaint(aiInputText);

    // Step 2: Rule-based category refinement
    const finalCategory = refineCategory(aiInputText, aiResult.category);

    // Step 3: Rule-based priority refinement
    const finalPriority = refinePriority(aiInputText, aiResult.priority);

    // Step 4: Persist complaint
    const complaint = await Complaint.create({
      title,
      description,
      location,
      ward,
      category: finalCategory,
      priority: finalPriority,
      user: req.user._id,
    });

    return res.status(201).json({
      success: true,
      aiPrediction: aiResult,
      finalDecision: {
        category: finalCategory,
        priority: finalPriority,
      },
      complaint,
    });
  } catch (error) {
    console.error("Create complaint error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create complaint",
    });
  }
};

// =======================================
// GET ALL COMPLAINTS (Admin – Sorted)
// =======================================
export const getAllComplaints = async (req, res) => {
  try {
    const { category, priority, status, ward } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (status) filter.status = status;
    if (ward) filter.ward = ward;

    const complaints = await Complaint.aggregate([
      { $match: filter },
      {
        $addFields: {
          priorityOrder: {
            $switch: {
              branches: [
                { case: { $eq: ["$priority", "High"] }, then: 1 },
                { case: { $eq: ["$priority", "Medium"] }, then: 2 },
                { case: { $eq: ["$priority", "Low"] }, then: 3 },
              ],
              default: 4,
            },
          },
        },
      },
      { $sort: { priorityOrder: 1, createdAt: -1 } },
    ]);

    return res.status(200).json({
      success: true,
      complaints,
    });
  } catch (error) {
    console.error("Get complaints error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch complaints",
    });
  }
};

// =======================================
// GET MY COMPLAINTS (Citizen)
// =======================================
export const getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      complaints,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch complaints",
    });
  }
};

// =======================================
// UPDATE STATUS (Admin)
// =======================================
export const updateComplaintStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["New", "In Progress", "Resolved"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const updated = await Complaint.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      complaint: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update status",
    });
  }
};
