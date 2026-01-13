import { detectSpikes } from "../services/spikeDetectionService.js";
import Complaint from "../models/Complaint.js";

/**
 * Controller for spike detection endpoint.
 * 
 * Returns abnormal spikes in complaints for ward + category combinations.
 * This is an early-warning signal for municipal authorities to identify
 * sudden increases in complaint volume compared to historical baseline.
 * 
 * Access: Admin-only
 */
export const getSpikes = async (req, res) => {
  try {
    const spikes = await detectSpikes();
    
    res.status(200).json(spikes);
  } catch (error) {
    console.error("Error in getSpikes controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve spike data"
    });
  }
};

/**
 * Debug endpoint to see intermediate data for spike detection.
 * Helps understand why spikes might not be detected.
 * 
 * Access: Admin-only
 */
export const getSpikeDebug = async (req, res) => {
  try {
    const Complaint = (await import("../models/Complaint.js")).default;
    const now = new Date();
    
    const CURRENT_WINDOW_DAYS = 7;
    const BASELINE_WINDOW_DAYS = 30;
    const MIN_BASELINE_COMPLAINTS = 5;
    
    const currentWindowStart = new Date(now);
    currentWindowStart.setDate(currentWindowStart.getDate() - CURRENT_WINDOW_DAYS);
    currentWindowStart.setHours(0, 0, 0, 0);
    
    const baselineWindowEnd = new Date(currentWindowStart);
    const baselineWindowStart = new Date(baselineWindowEnd);
    baselineWindowStart.setDate(baselineWindowStart.getDate() - BASELINE_WINDOW_DAYS);
    baselineWindowStart.setHours(0, 0, 0, 0);

    const debugData = await Complaint.aggregate([
      {
        $match: {
          createdAt: {
            $gte: baselineWindowStart,
            $lt: now
          },
          ward: { $ne: null, $exists: true },
          category: { $ne: null, $exists: true }
        }
      },
      {
        $addFields: {
          isCurrentWindow: {
            $gte: ["$createdAt", currentWindowStart]
          },
          isBaselineWindow: {
            $and: [
              { $gte: ["$createdAt", baselineWindowStart] },
              { $lt: ["$createdAt", baselineWindowEnd] }
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            ward: "$ward",
            category: "$category"
          },
          currentWeekCount: {
            $sum: {
              $cond: ["$isCurrentWindow", 1, 0]
            }
          },
          baselineTotalCount: {
            $sum: {
              $cond: ["$isBaselineWindow", 1, 0]
            }
          }
        }
      },
      {
        $addFields: {
          baselineWeeklyAvg: {
            $divide: [
              { $multiply: ["$baselineTotalCount", 7] },
              BASELINE_WINDOW_DAYS
            ]
          }
        }
      },
      {
        $addFields: {
          spikeRatio: {
            $cond: {
              if: { $gt: ["$baselineWeeklyAvg", 0] },
              then: {
                $divide: ["$currentWeekCount", "$baselineWeeklyAvg"]
              },
              else: 0
            }
          },
          meetsMinBaseline: {
            $gte: ["$baselineWeeklyAvg", MIN_BASELINE_COMPLAINTS]
          }
        }
      },
      {
        $addFields: {
          meetsSpikeThreshold: {
            $gte: ["$spikeRatio", 2.0]
          }
        }
      },
      {
        $project: {
          _id: 0,
          ward: "$_id.ward",
          category: "$_id.category",
          baselineTotalCount: 1,
          baselineWeeklyAvg: { $round: ["$baselineWeeklyAvg", 2] },
          currentWeekCount: 1,
          spikeRatio: { $round: ["$spikeRatio", 2] },
          meetsMinBaseline: 1,
          meetsSpikeThreshold: 1,
          wouldBeSpike: {
            $and: [
              { $gte: ["$baselineWeeklyAvg", MIN_BASELINE_COMPLAINTS] },
              { $gte: ["$spikeRatio", 2.0] }
            ]
          }
        }
      },
      {
        $sort: { baselineWeeklyAvg: -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      dateRanges: {
        now: now.toISOString(),
        currentWindowStart: currentWindowStart.toISOString(),
        baselineWindowStart: baselineWindowStart.toISOString(),
        baselineWindowEnd: baselineWindowEnd.toISOString()
      },
      thresholds: {
        minBaselineComplaints: MIN_BASELINE_COMPLAINTS,
        spikeMultiplierThreshold: 2.0
      },
      data: debugData,
      summary: {
        totalWardCategoryCombos: debugData.length,
        withMinBaseline: debugData.filter(d => d.meetsMinBaseline).length,
        withSpikeThreshold: debugData.filter(d => d.meetsSpikeThreshold).length,
        actualSpikes: debugData.filter(d => d.wouldBeSpike).length
      }
    });
  } catch (error) {
    console.error("Error in getSpikeDebug controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve debug data"
    });
  }
};

/**
 * Simple endpoint to check if there's any complaint data at all.
 * Helps verify data exists before debugging spike detection.
 * 
 * Access: Admin-only
 */
export const checkComplaintData = async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtySevenDaysAgo = new Date(now);
    thirtySevenDaysAgo.setDate(thirtySevenDaysAgo.getDate() - 37);

    const totalComplaints = await Complaint.countDocuments();
    const last7Days = await Complaint.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });
    const last30Days = await Complaint.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });
    const baselineWindow = await Complaint.countDocuments({
      createdAt: {
        $gte: thirtySevenDaysAgo,
        $lt: sevenDaysAgo
      }
    });
    const withWardAndCategory = await Complaint.countDocuments({
      ward: { $ne: null, $exists: true },
      category: { $ne: null, $exists: true }
    });

    const sampleComplaints = await Complaint.find({
      ward: { $ne: null, $exists: true },
      category: { $ne: null, $exists: true }
    })
      .select("ward category createdAt")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.status(200).json({
      success: true,
      summary: {
        totalComplaints,
        withWardAndCategory,
        last7Days,
        last30Days,
        baselineWindowCount: baselineWindow,
        dateRanges: {
          now: now.toISOString(),
          sevenDaysAgo: sevenDaysAgo.toISOString(),
          thirtyDaysAgo: thirtyDaysAgo.toISOString(),
          baselineWindow: {
            start: thirtySevenDaysAgo.toISOString(),
            end: sevenDaysAgo.toISOString()
          }
        }
      },
      sampleComplaints
    });
  } catch (error) {
    console.error("Error in checkComplaintData:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to check complaint data"
    });
  }
};
