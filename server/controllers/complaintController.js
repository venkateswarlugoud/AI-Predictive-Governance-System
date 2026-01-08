import Complaint from "../models/Complaint.js";
import cloudinary from "../config/cloudinary.js";

// CREATE COMPLAINT (Citizen)
export const createComplaint = async (req, res) => {
  try {
    console.log("=== CREATE COMPLAINT CALLED ===");
    console.log("req.user:", req.user);
    console.log("req.user type:", typeof req.user);
    
    const { title, description, category, location } = req.body;
    console.log("Request body:", { title, description, category, location });

    if (!title || !description || !category || !location) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    // Check if user is authenticated
    if (!req.user) {
      console.error("❌ req.user is missing - authentication failed");
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    // Try both _id and id in case of different formats
    const userId = req.user._id || req.user.id;
    
    if (!userId) {
      console.error("❌ User ID not found. req.user:", JSON.stringify(req.user, null, 2));
      return res.status(401).json({
        success: false,
        message: "User ID not found"
      });
    }

    console.log("✅ User authenticated. User ID:", userId);
    console.log("User ID type:", typeof userId);

    const complaintData = {
      title,
      description,
      category,
      location,
      user: userId
    };

    console.log("📝 Complaint data before create:", JSON.stringify(complaintData, null, 2));

    const complaint = await Complaint.create(complaintData);

    res.status(201).json({
      success: true,
      message: "Complaint created successfully",
      complaint
    });

  } catch (error) {
    console.error("Error creating complaint:", error);
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
