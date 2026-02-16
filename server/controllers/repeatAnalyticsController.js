import Complaint from "../models/Complaint.js";

/**
 * REPEAT-PATTERN ANALYTICS (READ-ONLY, ADVISORY)
 *
 * IMPORTANT:
 * - Uses MongoDB aggregation pipelines only
 * - Read-only, deterministic analytics on existing complaint data
 * - No modification of AI models or repeat detection logic
 * - No workflow automation or decision-making
 */

// Common match filter: only resolved complaints with valid time metadata
const baseMatchFilter = {
  status: "Resolved",
  complaintMonth: { $ne: null },
  complaintYear: { $ne: null },
};

/**
 * a) Number of repeat complaints grouped by category
 *
 * Definition (deterministic, DB-only):
 * - For each (ward, category) pair, the first resolved complaint is treated as the baseline.
 * - Any additional resolved complaints in the same (ward, category) pair are counted as "repeat".
 * - Repeat count per (ward, category) = max(totalComplaints - 1, 0)
 * - Aggregated by category across all wards.
 */
export const getRepeatComplaintsByCategory = async (req, res) => {
  try {
    const data = await Complaint.aggregate([
      { $match: baseMatchFilter },
      {
        $group: {
          _id: { ward: "$ward", category: "$category" },
          totalComplaints: { $sum: 1 },
        },
      },
      {
        $project: {
          category: "$_id.category",
          repeats: {
            $cond: [
              { $gt: ["$totalComplaints", 1] },
              { $subtract: ["$totalComplaints", 1] },
              0,
            ],
          },
        },
      },
      { $match: { repeats: { $gt: 0 } } },
      {
        $group: {
          _id: "$category",
          repeatCount: { $sum: "$repeats" },
        },
      },
      { $sort: { repeatCount: -1 } },
    ]);

    return res.status(200).json({
      success: true,
      repeats: data,
      advisoryNote:
        "Repeat counts are derived from historical complaint patterns and are advisory only. Human authorities remain final decision-makers.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * b) Number of repeat complaints grouped by ward
 *
 * Same deterministic definition as above, aggregated by ward.
 */
export const getRepeatComplaintsByWard = async (req, res) => {
  try {
    const data = await Complaint.aggregate([
      { $match: baseMatchFilter },
      {
        $group: {
          _id: { ward: "$ward", category: "$category" },
          totalComplaints: { $sum: 1 },
        },
      },
      {
        $project: {
          ward: "$_id.ward",
          repeats: {
            $cond: [
              { $gt: ["$totalComplaints", 1] },
              { $subtract: ["$totalComplaints", 1] },
              0,
            ],
          },
        },
      },
      { $match: { repeats: { $gt: 0 } } },
      {
        $group: {
          _id: "$ward",
          repeatCount: { $sum: "$repeats" },
        },
      },
      { $sort: { repeatCount: -1 } },
    ]);

    return res.status(200).json({
      success: true,
      repeats: data,
      advisoryNote:
        "Ward-level repeat counts highlight historically recurring issues and are advisory only.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * c) Monthly trend of repeat complaints over time
 *
 * - Uses the same deterministic definition of "repeat" at (ward, category) level.
 * - Aggregates repeat counts per (year, month) to produce a time series.
 */
export const getRepeatComplaintTrend = async (req, res) => {
  try {
    const data = await Complaint.aggregate([
      { $match: baseMatchFilter },
      {
        $group: {
          _id: {
            year: "$complaintYear",
            month: "$complaintMonth",
            ward: "$ward",
            category: "$category",
          },
          totalComplaints: { $sum: 1 },
        },
      },
      {
        $project: {
          year: "$_id.year",
          month: "$_id.month",
          repeats: {
            $cond: [
              { $gt: ["$totalComplaints", 1] },
              { $subtract: ["$totalComplaints", 1] },
              0,
            ],
          },
        },
      },
      { $match: { repeats: { $gt: 0 } } },
      {
        $group: {
          _id: { year: "$year", month: "$month" },
          repeatCount: { $sum: "$repeats" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    return res.status(200).json({
      success: true,
      trends: data,
      advisoryNote:
        "Monthly repeat complaint trends are provided for planning and oversight only. No automatic actions are taken.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

