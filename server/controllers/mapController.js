import {
  getComplaintsNear,
  getHeatmapData,
  getWardRiskData,
} from "../services/mapService.js";

/**
 * ==================================================
 * MAP CONTROLLER - Geospatial Mapping & Risk Visualization
 * Phase-2: Production-grade geospatial endpoints
 * ==================================================
 */

/**
 * GET /api/map/near
 * 
 * Get complaints near a specific location
 * 
 * Query parameters:
 * - lng: Longitude (required, -180 to 180)
 * - lat: Latitude (required, -90 to 90)
 * - distance: Distance in meters (optional, default: 5000, max: 50000)
 * 
 * Access: Protected (authenticated users)
 */
export const getNearbyComplaints = async (req, res) => {
  try {
    const { lng, lat, distance } = req.query;

    // Validate required parameters
    if (lng === undefined || lat === undefined) {
      return res.status(400).json({
        success: false,
        message: "Longitude (lng) and latitude (lat) are required",
      });
    }

    // Parse and validate coordinates
    const longitude = parseFloat(lng);
    const latitude = parseFloat(lat);
    const maxDistance = distance ? parseInt(distance, 10) : 5000;

    if (isNaN(longitude) || isNaN(latitude)) {
      return res.status(400).json({
        success: false,
        message: "Longitude and latitude must be valid numbers",
      });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: "Longitude must be between -180 and 180",
      });
    }

    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: "Latitude must be between -90 and 90",
      });
    }

    if (maxDistance <= 0 || maxDistance > 50000) {
      return res.status(400).json({
        success: false,
        message: "Distance must be between 1 and 50000 meters",
      });
    }

    // Get nearby complaints
    const complaints = await getComplaintsNear(longitude, latitude, maxDistance);

    return res.status(200).json({
      success: true,
      count: complaints.length,
      complaints: complaints,
    });
  } catch (error) {
    console.error("Error in getNearbyComplaints:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get nearby complaints",
    });
  }
};

/**
 * GET /api/map/heatmap
 * 
 * Get heatmap data for visualization
 * 
 * Query parameters:
 * - timeFilter: Optional - "last7", "last30", "last90" (default: "last30")
 * 
 * Access: Protected (authenticated users)
 */
export const getHeatmap = async (req, res) => {
  try {
    const { timeFilter } = req.query;

    // Validate timeFilter if provided
    const validFilters = ["last7", "last30", "last90"];
    const filter = timeFilter && validFilters.includes(timeFilter) ? timeFilter : "last30";

    // Get heatmap data
    const heatmapData = await getHeatmapData(filter);

    return res.status(200).json({
      success: true,
      timeFilter: filter,
      count: heatmapData.length,
      data: heatmapData,
    });
  } catch (error) {
    console.error("Error in getHeatmap:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get heatmap data",
    });
  }
};

/**
 * GET /api/map/ward-risk
 * 
 * Get ward risk data for risk visualization
 * 
 * Access: Admin-only (enforced by middleware)
 */
export const getWardRiskMap = async (req, res) => {
  try {
    // Get ward risk data (reuses hotspot service internally)
    const wardRiskData = await getWardRiskData();

    return res.status(200).json({
      success: true,
      count: wardRiskData.length,
      data: wardRiskData,
    });
  } catch (error) {
    console.error("Error in getWardRiskMap:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get ward risk data",
    });
  }
};
