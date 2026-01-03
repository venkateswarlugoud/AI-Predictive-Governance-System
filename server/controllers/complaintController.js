import Complaint from "../models/Complaint.js";
import cloudinary from "../config/cloudinary.js";

// CREATE COMPLAINT (Citizen)
export const createComplaint = async (req, res) => {
  try {
    const { title, description, category, location } = req.body;

    if (!title || !description || !category || !location) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    const complaint = await Complaint.create({
      title,
      description,
      category,
      location,
      userId: req.user.id
    });

    res.status(201).json({
      success: true,
      message: "Complaint created successfully",
      complaint
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET ALL COMPLAINTS (Admin)
export const getAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find()
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

// GET MY COMPLAINTS (Citizen)
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

// UPDATE COMPLAINT STATUS (Admin)
export const updateComplaintStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["Pending", "In Progress", "Resolved"].includes(status)) {
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
