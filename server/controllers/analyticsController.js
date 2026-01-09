import Complaint from "../models/Complaint.js";

// 1️⃣ OVERALL SUMMARY
export const getAnalyticsSummary = async (req, res) => {
  try {
    const total = await Complaint.countDocuments();

    const byStatus = await Complaint.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      totalComplaints: total,
      statusBreakdown: byStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 2️⃣ CATEGORY ANALYTICS
export const getComplaintsByCategory = async (req, res) => {
  try {
    const result = await Complaint.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      categories: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 3️⃣ PRIORITY ANALYTICS
export const getComplaintsByPriority = async (req, res) => {
  try {
    const result = await Complaint.aggregate([
      // ✅ Ignore documents without priority
      { $match: { priority: { $ne: null } } },

      { $group: { _id: "$priority", count: { $sum: 1 } } },

      {
        $addFields: {
          priorityOrder: {
            $switch: {
              branches: [
                { case: { $eq: ["$_id", "High"] }, then: 1 },
                { case: { $eq: ["$_id", "Medium"] }, then: 2 },
                { case: { $eq: ["$_id", "Low"] }, then: 3 }
              ],
              default: 4
            }
          }
        }
      },
      { $sort: { priorityOrder: 1 } }
    ]);

    res.status(200).json({
      success: true,
      priorities: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
