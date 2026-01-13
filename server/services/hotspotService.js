import Complaint from "../models/Complaint.js";

// ==================================================
// HOTSPOT IDENTIFICATION CONSTANTS
// ==================================================
const TIME_WINDOW_DAYS = 30;
const MIN_COMPLAINTS = 10;
const HOTSPOT_SCORE_THRESHOLD = 25;

// Priority weights for hotspot score calculation
const PRIORITY_WEIGHT = {
  High: 3,
  Medium: 2,
  Low: 1,
};

// Severity thresholds for hotspot classification
const SEVERITY_MEDIUM_MAX = 34;
const SEVERITY_HIGH_MIN = 35;

/**
 * Identifies high-risk wards and categories (hotspots) based on
 * complaint volume and priority within a recent time window.
 * 
 * This is a rule-based, deterministic algorithm suitable for
 * government audit and decision-making.
 * 
 * @returns {Promise<Array>} Array of hotspot objects with ward, category,
 *                           complaintCount, hotspotScore, and severity
 */
export const identifyHotspots = async () => {
  try {
    // Calculate the cutoff date (30 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - TIME_WINDOW_DAYS);

    // MongoDB aggregation pipeline to identify hotspots
    const hotspots = await Complaint.aggregate([
      // Step 1: Filter complaints within the time window
      {
        $match: {
          createdAt: { $gte: cutoffDate },
          ward: { $ne: null, $exists: true },
          category: { $ne: null, $exists: true },
          priority: { $ne: null, $exists: true },
        },
      },
      // Step 2: Group by ward, category, and priority to count complaints
      {
        $group: {
          _id: {
            ward: "$ward",
            category: "$category",
            priority: "$priority",
          },
          count: { $sum: 1 },
        },
      },
      // Step 3: Regroup by ward and category to calculate hotspot scores
      {
        $group: {
          _id: {
            ward: "$_id.ward",
            category: "$_id.category",
          },
          priorityCounts: {
            $push: {
              priority: "$_id.priority",
              count: "$count",
            },
          },
          totalComplaints: { $sum: "$count" },
        },
      },
      // Step 4: Calculate hotspot score using priority weights
      // Formula: Sum(priorityWeight × complaintCount) for each priority level
      {
        $addFields: {
          hotspotScore: {
            $sum: {
              $map: {
                input: "$priorityCounts",
                as: "pc",
                in: {
                  $multiply: [
                    {
                      $switch: {
                        branches: [
                          { case: { $eq: ["$$pc.priority", "High"] }, then: 3 },
                          { case: { $eq: ["$$pc.priority", "Medium"] }, then: 2 },
                          { case: { $eq: ["$$pc.priority", "Low"] }, then: 1 },
                        ],
                        default: 0,
                      },
                    },
                    "$$pc.count",
                  ],
                },
              },
            },
          },
        },
      },
      // Step 5: Filter hotspots that meet minimum thresholds
      {
        $match: {
          totalComplaints: { $gte: MIN_COMPLAINTS },
          hotspotScore: { $gte: HOTSPOT_SCORE_THRESHOLD },
        },
      },
      // Step 6: Assign severity based on hotspot score
      {
        $addFields: {
          severity: {
            $cond: {
              if: { $gte: ["$hotspotScore", SEVERITY_HIGH_MIN] },
              then: "High",
              else: "Medium",
            },
          },
        },
      },
      // Step 7: Reshape output to required format
      {
        $project: {
          _id: 0,
          ward: "$_id.ward",
          category: "$_id.category",
          complaintCount: "$totalComplaints",
          hotspotScore: 1,
          severity: 1,
        },
      },
      // Step 8: Sort by hotspot score (descending) for prioritization
      {
        $sort: { hotspotScore: -1 },
      },
    ]);

    return hotspots;
  } catch (error) {
    console.error("Error identifying hotspots:", error);
    throw new Error("Failed to identify hotspots");
  }
};
