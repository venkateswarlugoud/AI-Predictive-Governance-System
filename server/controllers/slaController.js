import Complaint from "../models/Complaint.js";
import { computeSlaForComplaint, computeSlaSummary } from "../services/slaService.js";

/**
 * =======================================
 * SLA SUMMARY (Admin, Read-only)
 * =======================================
 *
 * GOVERNANCE NOTES:
 * - Advisory only; no automatic actions are triggered.
 * - Uses current server time for SLA computation.
 * - Does NOT modify complaint records or statuses.
 */
export const getSlaSummary = async (req, res) => {
  try {
    // By default, focus on active complaints (not yet resolved)
    const activeComplaints = await Complaint.find({
      status: { $ne: "Resolved" },
    }).select("createdAt priority status");

    const summary = computeSlaSummary(activeComplaints);

    return res.status(200).json({
      success: true,
      ...summary,
      generatedAt: new Date().toISOString(),
      governanceNote:
        "SLA indicators are advisory only. No automatic status changes or escalations are performed. Final decisions rest with authorized municipal officials.",
    });
  } catch (error) {
    console.error("❌ SLA SUMMARY ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to compute SLA summary",
    });
  }
};

/**
 * =======================================
 * SLA BY COMPLAINT (Admin, Read-only)
 * =======================================
 *
 * GOVERNANCE NOTES:
 * - Advisory only; no automatic actions are triggered.
 * - Uses current server time for SLA computation.
 * - Does NOT modify complaint records or statuses.
 */
export const getSlaByComplaintId = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    const sla = computeSlaForComplaint(complaint);

    return res.status(200).json({
      success: true,
      complaintId: complaint._id,
      priority: complaint.priority,
      status: complaint.status,
      createdAt: complaint.createdAt,
      ...sla,
      governanceNote:
        "SLA Status (Advisory): This SLA view is for monitoring only. It does not close, escalate, or otherwise change the complaint.",
    });
  } catch (error) {
    console.error("❌ SLA BY COMPLAINT ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to compute SLA for complaint",
    });
  }
};

