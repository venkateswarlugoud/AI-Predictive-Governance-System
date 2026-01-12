import Complaint from "../models/Complaint.js";
import { refinePriority } from "../services/priorityRules.js";
import { refineCategory } from "../services/categoryRules.js";

// =======================================
// CREATE COMPLAINT (Citizen)
// =======================================
export const createComplaint = async (req, res) => {
  try {
    console.log("📝 CREATE COMPLAINT HIT");
    console.log("REQ BODY:", req.body);
    console.log("REQ USER:", req.user);

    const { title, description, location, ward } = req.body;

    // Validation
    if (!title || !description || !location || !ward) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Auth check
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const text = `${title}. ${description}`;

    // ✅ RULE-BASED LOGIC ONLY (NO AI)
    const category = refineCategory(text, "Sanitation");
    const priority = refinePriority(text, "Medium");

    const complaint = await Complaint.create({
      title,
      description,
      location,
      ward,
      category,
      priority,
      categoryConfidence: 1,
      priorityConfidence: 1,
      isRepeated: false,
      similarityScore: 0,
      matchedComplaint: null,
      user: req.user._id,
    });

    console.log("✅ COMPLAINT CREATED:", complaint._id);

    return res.status(201).json({
      success: true,
      complaint,
    });

  } catch (e) {
    console.error("❌ CREATE ERROR MESSAGE:", e.message);
    console.error("❌ CREATE ERROR STACK:", e.stack);

    return res.status(500).json({
      success: false,
      message: "Failed to create complaint",
    });
  }
};

// =======================================
// GET ALL COMPLAINTS (Admin)
// =======================================
export const getAllComplaints = async (req, res) => {
  const complaints = await Complaint.find().sort({ createdAt: -1 });
  res.json({ success: true, complaints });
};

// =======================================
// GET MY COMPLAINTS (Citizen)
// =======================================
export const getMyComplaints = async (req, res) => {
  const complaints = await Complaint.find({ user: req.user._id });
  res.json({ success: true, complaints });
};

// =======================================
// UPDATE STATUS (Admin)
// =======================================
export const updateComplaintStatus = async (req, res) => {
  const updated = await Complaint.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  );
  res.json({ success: true, complaint: updated });
};
