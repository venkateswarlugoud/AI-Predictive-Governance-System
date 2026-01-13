import Complaint from "../models/Complaint.js";

// ==================================================
// SPIKE DETECTION CONSTANTS
// ==================================================
const CURRENT_WINDOW_DAYS = 7;
const BASELINE_WINDOW_DAYS = 30;
const SPIKE_MULTIPLIER_THRESHOLD = 2.0;
const MIN_BASELINE_COMPLAINTS = 5;

// Severity thresholds
const SEVERITY_MODERATE_MIN = 2.0;
const SEVERITY_MODERATE_MAX = 2.9;
const SEVERITY_SEVERE_MIN = 3.0;

/**
 * Detects abnormal spikes in complaints for ward + category combinations.
 * 
 * A spike is identified when:
 * - Baseline weekly average >= MIN_BASELINE_COMPLAINTS
 * - Current week count >= (Baseline weekly average × SPIKE_MULTIPLIER_THRESHOLD)
 * 
 * Baseline Calculation:
 * - Average weekly complaints over last 30 days (excluding current 7 days)
 * - This provides a stable historical reference for comparison
 * 
 * This is a rule-based, deterministic algorithm suitable for
 * government audit and early-warning governance alerts.
 * 
 * @returns {Promise<Array>} Array of spike objects with ward, category,
 *                           baselineWeeklyAvg, currentWeekCount, spikeRatio, and severity
 */
export const detectSpikes = async () => {
  try {
    const now = new Date();
    
    // Calculate date boundaries
    // Current window: last 7 days (inclusive)
    const currentWindowStart = new Date(now);
    currentWindowStart.setDate(currentWindowStart.getDate() - CURRENT_WINDOW_DAYS);
    currentWindowStart.setHours(0, 0, 0, 0);
    
    // Baseline window: days 8-37 ago (30 days, excluding current 7 days)
    const baselineWindowEnd = new Date(currentWindowStart);
    const baselineWindowStart = new Date(baselineWindowEnd);
    baselineWindowStart.setDate(baselineWindowStart.getDate() - BASELINE_WINDOW_DAYS);
    baselineWindowStart.setHours(0, 0, 0, 0);

    // MongoDB aggregation pipeline to detect spikes
    const spikes = await Complaint.aggregate([
      // Step 1: Filter complaints that fall within either window
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
      // Step 2: Classify each complaint into current or baseline window
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
      // Step 3: Group by ward and category, count current and baseline separately
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
      // Step 4: Calculate baseline weekly average
      // Average weekly = (total complaints in 30 days) / (30/7) = total * 7 / 30
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
      // Step 5: Calculate spike ratio
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
          }
        }
      },
      // Step 6: Filter for spikes that meet threshold conditions
      // Condition: baselineWeeklyAvg >= MIN_BASELINE_COMPLAINTS AND
      //            currentWeekCount >= (baselineWeeklyAvg × SPIKE_MULTIPLIER_THRESHOLD)
      {
        $match: {
          baselineWeeklyAvg: { $gte: MIN_BASELINE_COMPLAINTS },
          spikeRatio: { $gte: SPIKE_MULTIPLIER_THRESHOLD }
        }
      },
      // Step 7: Assign severity based on spike ratio
      // 2.0 - 2.9 => "Moderate"
      // >= 3.0 => "Severe"
      {
        $addFields: {
          severity: {
            $cond: {
              if: { $gte: ["$spikeRatio", SEVERITY_SEVERE_MIN] },
              then: "Severe",
              else: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$spikeRatio", SEVERITY_MODERATE_MIN] },
                      { $lte: ["$spikeRatio", SEVERITY_MODERATE_MAX] }
                    ]
                  },
                  then: "Moderate",
                  else: "Moderate" // Fallback (shouldn't happen due to filter above)
                }
              }
            }
          }
        }
      },
      // Step 8: Reshape output to required format
      {
        $project: {
          _id: 0,
          ward: "$_id.ward",
          category: "$_id.category",
          baselineWeeklyAvg: { $round: ["$baselineWeeklyAvg", 1] },
          currentWeekCount: "$currentWeekCount",
          spikeRatio: { $round: ["$spikeRatio", 1] },
          severity: 1
        }
      },
      // Step 9: Sort by spike ratio (descending) for prioritization
      {
        $sort: { spikeRatio: -1 }
      }
    ]);

    return spikes;
  } catch (error) {
    console.error("Error detecting spikes:", error);
    throw new Error("Failed to detect spikes");
  }
};
