import Complaint from "../models/Complaint.js";
import { identifyHotspots } from "./hotspotService.js";

/**
 * ==================================================
 * MAP SERVICE - Geospatial Mapping & Risk Visualization
 * Phase-2: Production-grade geospatial services
 * ==================================================
 */

/**
 * Get complaints near a specific location using MongoDB geospatial queries
 * 
 * @param {Number} lng - Longitude
 * @param {Number} lat - Latitude
 * @param {Number} distance - Distance in meters
 * @returns {Promise<Array>} Array of complaints sorted by proximity
 */
export const getComplaintsNear = async (lng, lat, distance = 5000) => {
  try {
    // Validate coordinates
    if (typeof lng !== "number" || typeof lat !== "number") {
      throw new Error("Longitude and latitude must be numbers");
    }
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      throw new Error("Invalid coordinate range");
    }
    if (distance <= 0 || distance > 50000) {
      throw new Error("Distance must be between 1 and 50000 meters");
    }

    // MongoDB $near query requires 2dsphere index
    const complaints = await Complaint.find({
      geoLocation: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
          $maxDistance: distance, // in meters
        },
      },
    })
      .select("title description category priority status location ward geoLocation createdAt")
      .sort({ createdAt: -1 })
      .limit(100); // Limit results for performance

    return complaints;
  } catch (error) {
    console.error("Error getting complaints near location:", error);
    throw new Error(`Failed to get nearby complaints: ${error.message}`);
  }
};

/**
 * Get heatmap data by aggregating complaints into grid cells
 * 
 * @param {String} timeFilter - Optional: "last7", "last30", "last90" (default: "last30")
 * @returns {Promise<Array>} Array of { lat, lng, weight } objects
 */
export const getHeatmapData = async (timeFilter = "last30") => {
  try {
    // Calculate date cutoff based on filter
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (timeFilter) {
      case "last7":
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case "last30":
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case "last90":
        cutoffDate.setDate(now.getDate() - 90);
        break;
      default:
        cutoffDate.setDate(now.getDate() - 30);
    }

    // MongoDB aggregation pipeline for heatmap data
    const heatmapData = await Complaint.aggregate([
      // Step 1: Filter complaints with geoLocation and within time window
      {
        $match: {
          geoLocation: {
            $exists: true,
            $ne: null,
          },
          "geoLocation.coordinates": {
            $exists: true,
            $size: 2,
          },
          createdAt: { $gte: cutoffDate },
        },
      },
      // Step 2: Round coordinates to 2 decimal places (~1.1km precision)
      {
        $addFields: {
          roundedLng: {
            $round: [{ $arrayElemAt: ["$geoLocation.coordinates", 0] }, 2],
          },
          roundedLat: {
            $round: [{ $arrayElemAt: ["$geoLocation.coordinates", 1] }, 2],
          },
        },
      },
      // Step 3: Group by rounded coordinates and count complaints
      {
        $group: {
          _id: {
            lng: "$roundedLng",
            lat: "$roundedLat",
          },
          count: { $sum: 1 },
          // Calculate weighted count based on priority
          weightedCount: {
            $sum: {
              $switch: {
                branches: [
                  { case: { $eq: ["$priority", "High"] }, then: 3 },
                  { case: { $eq: ["$priority", "Medium"] }, then: 2 },
                  { case: { $eq: ["$priority", "Low"] }, then: 1 },
                ],
                default: 1,
              },
            },
          },
        },
      },
      // Step 4: Reshape output
      {
        $project: {
          _id: 0,
          lng: "$_id.lng",
          lat: "$_id.lat",
          weight: "$weightedCount", // Use weighted count for better visualization
          count: "$count", // Also include raw count
        },
      },
      // Step 5: Sort by weight (descending)
      {
        $sort: { weight: -1 },
      },
    ]);

    return heatmapData;
  } catch (error) {
    console.error("Error getting heatmap data:", error);
    throw new Error(`Failed to get heatmap data: ${error.message}`);
  }
};

/**
 * Get ward risk data by reusing hotspot service
 * 
 * @returns {Promise<Array>} Array of { ward, riskScore, severity } objects
 */
export const getWardRiskData = async () => {
  try {
    // Reuse existing hotspot service (Phase-1 logic, not modified)
    const hotspots = await identifyHotspots();

    // Transform hotspot data to ward risk format
    // Aggregate by ward (combining all categories for a ward)
    const wardRiskMap = new Map();

    hotspots.forEach((hotspot) => {
      const { ward, hotspotScore, severity } = hotspot;

      if (!wardRiskMap.has(ward)) {
        wardRiskMap.set(ward, {
          ward,
          riskScore: 0,
          severity: "Low",
          categoryCount: 0,
        });
      }

      const wardData = wardRiskMap.get(ward);
      wardData.riskScore += hotspotScore;
      wardData.categoryCount += 1;

      // Update severity to highest found
      const severityOrder = { Low: 0, Medium: 1, High: 2 };
      if (severityOrder[severity] > severityOrder[wardData.severity]) {
        wardData.severity = severity;
      }
    });

    // Convert map to array and calculate average risk score
    const wardRiskData = Array.from(wardRiskMap.values()).map((wardData) => {
      // Normalize risk score (average across categories)
      const normalizedRiskScore = Math.round(
        wardData.riskScore / Math.max(wardData.categoryCount, 1)
      );

      return {
        ward: wardData.ward,
        riskScore: normalizedRiskScore,
        severity: wardData.severity,
        categoryCount: wardData.categoryCount,
      };
    });

    // Sort by risk score (descending)
    wardRiskData.sort((a, b) => b.riskScore - a.riskScore);

    return wardRiskData;
  } catch (error) {
    console.error("Error getting ward risk data:", error);
    throw new Error(`Failed to get ward risk data: ${error.message}`);
  }
};
