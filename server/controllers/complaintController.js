import Complaint from "../models/Complaint.js";
import { predictComplaint } from "../services/aiService.js";

// ===============================
// CREATE COMPLAINT (Citizen) – AI ENABLED
// ===============================
export const createComplaint = async (req, res) => {
  try {
    const { title, description, location } = req.body;

    if (!title || !description || !location) {
      return res.status(400).json({
        success: false,
        message: "Title, description and location are required",
      });
    }

    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // 🔥 Call AI service
    const aiResult = await predictComplaint(description);

    const complaint = await Complaint.create({
      title,
      description,
      location,
      category: aiResult.category,
      priority: aiResult.priority,
      user: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Complaint submitted with AI prediction",
      complaint,
    });
  } catch (error) {
    console.error("Create complaint error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to create complaint",
    });
  }
};

// ===============================
// GET ALL COMPLAINTS (Admin) – AI PRIORITY SORTED
// ===============================
export const getAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.aggregate([
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

    res.status(200).json({
      success: true,
      complaints,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// GET COMPLAINTS BY CATEGORY (Admin)
// ===============================
export const getComplaintsByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const complaints = await Complaint.find({ category })
      .sort({ createdAt: -1 })
      .populate("user", "name email");

    res.status(200).json({
      success: true,
      complaints,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// GET MY COMPLAINTS (Citizen)
// ===============================
export const getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ user: req.user._id });

    res.status(200).json({
      success: true,
      complaints,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// UPDATE COMPLAINT STATUS (Admin)
// ===============================
export const updateComplaintStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["New", "In Progress", "Resolved"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
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

    res.status(200).json({
      success: true,
      message: "Complaint status updated",
      complaint: updatedComplaint,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
