import Complaint from "../models/Complaint.js";

/* ==================================================
   1️⃣ OVERALL SUMMARY
================================================== */
export const getAnalyticsSummary = async (req, res) => {
  try {
    const total = await Complaint.countDocuments();
    const byStatus = await Complaint.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    res.status(200).json({ success: true, totalComplaints: total, statusBreakdown: byStatus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ==================================================
   2️⃣ CATEGORY SNAPSHOT
================================================== */
export const getComplaintsByCategory = async (req, res) => {
  try {
    const result = await Complaint.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    res.status(200).json({ success: true, categories: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ==================================================
   3️⃣ PRIORITY SNAPSHOT
================================================== */
export const getComplaintsByPriority = async (req, res) => {
  try {
    const result = await Complaint.aggregate([
      { $match: { priority: { $ne: null } } },
      { $group: { _id: "$priority", count: { $sum: 1 } } }
    ]);
    res.status(200).json({ success: true, priorities: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ==================================================
   COMMON FILTER (LEGACY DATA PROTECTION)
================================================== */
const validTimeFilter = {
  $match: {
    complaintMonth: { $ne: null },
    complaintYear: { $ne: null }
  }
};

/* ==================================================
   4️⃣ MONTHLY TRENDS (FEATURE 2)
================================================== */
export const getMonthlyComplaintTrends = async (req, res) => {
  try {
    const data = await Complaint.aggregate([
      validTimeFilter,
      { $group: { _id: { year: "$complaintYear", month: "$complaintMonth" }, total: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);
    res.status(200).json({ success: true, trends: data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ==================================================
   5️⃣ CATEGORY MONTHLY TRENDS (FEATURE 2)
================================================== */
export const getMonthlyCategoryTrends = async (req, res) => {
  try {
    const data = await Complaint.aggregate([
      validTimeFilter,
      { $group: { _id: { year: "$complaintYear", month: "$complaintMonth", category: "$category" }, count: { $sum: 1 } } }
    ]);
    res.status(200).json({ success: true, trends: data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ==================================================
   6️⃣ WARD MONTHLY TRENDS (FEATURE 2)
================================================== */
export const getMonthlyWardTrends = async (req, res) => {
  try {
    const data = await Complaint.aggregate([
      validTimeFilter,
      { $group: { _id: { year: "$complaintYear", month: "$complaintMonth", ward: "$ward" }, count: { $sum: 1 } } }
    ]);
    res.status(200).json({ success: true, trends: data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ==================================================
   7️⃣ CATEGORY TREND DIRECTION (FEATURE 3)
================================================== */
export const getCategoryTrendDirection = async (req, res) => {
  try {
    const data = await Complaint.aggregate([
      validTimeFilter,
      { $group: { _id: { year: "$complaintYear", month: "$complaintMonth", category: "$category" }, count: { $sum: 1 } } },
      { $sort: { "_id.year": -1, "_id.month": -1 } }
    ]);

    const map = {};
    data.forEach(d => {
      if (!map[d._id.category]) map[d._id.category] = [];
      map[d._id.category].push(d.count);
    });

    const trends = Object.keys(map)
      .filter(k => map[k].length >= 2)
      .map(k => ({
        category: k,
        previousMonthCount: map[k][1],
        currentMonthCount: map[k][0],
        trend: map[k][0] > map[k][1] ? "increasing" : map[k][0] < map[k][1] ? "decreasing" : "stable"
      }));

    res.status(200).json({ success: true, trends });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ==================================================
   8️⃣ WARD TREND DIRECTION (FEATURE 3)
================================================== */
export const getWardTrendDirection = async (req, res) => {
  try {
    const data = await Complaint.aggregate([
      validTimeFilter,
      { $group: { _id: { year: "$complaintYear", month: "$complaintMonth", ward: "$ward" }, count: { $sum: 1 } } },
      { $sort: { "_id.year": -1, "_id.month": -1 } }
    ]);

    const map = {};
    data.forEach(d => {
      if (!map[d._id.ward]) map[d._id.ward] = [];
      map[d._id.ward].push(d.count);
    });

    const trends = Object.keys(map)
      .filter(k => map[k].length >= 2)
      .map(k => ({
        ward: k,
        previousMonthCount: map[k][1],
        currentMonthCount: map[k][0],
        trend: map[k][0] > map[k][1] ? "increasing" : map[k][0] < map[k][1] ? "decreasing" : "stable"
      }));

    res.status(200).json({ success: true, trends });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ==================================================
   9️⃣ CATEGORY FORECAST (FEATURE 4)
================================================== */
export const forecastCategoryComplaints = async (req, res) => {
  try {
    const data = await Complaint.aggregate([
      validTimeFilter,
      { $group: { _id: { year: "$complaintYear", month: "$complaintMonth", category: "$category" }, count: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const map = {};
    data.forEach(d => {
      if (!map[d._id.category]) map[d._id.category] = [];
      map[d._id.category].push(d.count);
    });

    const forecasts = Object.keys(map)
      .filter(k => map[k].length >= 2)
      .map(k => {
        const len = map[k].length;
        const last = map[k][len - 1];
        const prev = map[k][len - 2];
        return {
          category: k,
          lastMonthCount: last,
          predictedNextMonth: Math.max(0, last + (last - prev)),
          method: "Linear Trend Projection"
        };
      });

    res.status(200).json({ success: true, forecasts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ==================================================
   🔟 WARD FORECAST (FEATURE 4)
================================================== */
export const forecastWardComplaints = async (req, res) => {
  try {
    const data = await Complaint.aggregate([
      validTimeFilter,
      { $group: { _id: { year: "$complaintYear", month: "$complaintMonth", ward: "$ward" }, count: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const map = {};
    data.forEach(d => {
      if (!map[d._id.ward]) map[d._id.ward] = [];
      map[d._id.ward].push(d.count);
    });

    const forecasts = Object.keys(map)
      .filter(k => map[k].length >= 2)
      .map(k => {
        const len = map[k].length;
        const last = map[k][len - 1];
        const prev = map[k][len - 2];
        return {
          ward: k,
          lastMonthCount: last,
          predictedNextMonth: Math.max(0, last + (last - prev)),
          method: "Linear Trend Projection"
        };
      });

    res.status(200).json({ success: true, forecasts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
