import API from "./axios";

/**
 * Admin API Services
 * 
 * Service functions for admin dashboard features:
 * - Hotspot Monitoring
 * - Spike Detection
 * - Governance Alerts
 */

/**
 * Get hotspots (high-risk wards and categories)
 * @returns {Promise<Array>} Array of hotspot objects
 */
export const getHotspots = async () => {
  try {
    const response = await API.get("/hotspots");
    if (response.data.success && response.data.hotspots) {
      return response.data.hotspots;
    }
    return [];
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch hotspots");
  }
};

/**
 * Get spike detections (early warnings)
 * @returns {Promise<Array>} Array of spike objects
 */
export const getSpikes = async () => {
  try {
    const response = await API.get("/spikes");
    // Response is directly an array
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch spikes");
  }
};

/**
 * Get all governance alerts
 * @returns {Promise<Array>} Array of alert objects
 */
export const getAllAlerts = async () => {
  try {
    const response = await API.get("/alerts");
    // Response is directly an array
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch alerts");
  }
};

/**
 * Acknowledge an alert
 * @param {string} alertId - Alert ID
 * @returns {Promise<Object>} Updated alert object
 */
export const acknowledgeAlert = async (alertId) => {
  try {
    const response = await API.put(`/alerts/${alertId}/acknowledge`);
    if (response.data.success && response.data.alert) {
      return response.data.alert;
    }
    throw new Error("Invalid response format");
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to acknowledge alert");
  }
};

/**
 * Resolve an alert with resolution note
 * @param {string} alertId - Alert ID
 * @param {string} resolutionNote - Resolution note (required)
 * @returns {Promise<Object>} Updated alert object
 */
export const resolveAlert = async (alertId, resolutionNote) => {
  try {
    const response = await API.put(`/alerts/${alertId}/resolve`, {
      resolutionNote,
    });
    if (response.data.success && response.data.alert) {
      return response.data.alert;
    }
    throw new Error("Invalid response format");
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to resolve alert");
  }
};

/**
 * ==================================================
 * MAP API SERVICES (Phase-2)
 * ==================================================
 */

/**
 * Get complaints near a location
 * @param {number} lng - Longitude
 * @param {number} lat - Latitude
 * @param {number} distance - Distance in meters (optional, default: 5000)
 * @returns {Promise<Object>} Response with complaints array
 */
export const getNearbyComplaints = async (lng, lat, distance = 5000) => {
  try {
    const response = await API.get("/map/near", {
      params: { lng, lat, distance },
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch nearby complaints");
  }
};

/**
 * Get heatmap data
 * @param {string} timeFilter - Optional: "last7", "last30", "last90" (default: "last30")
 * @returns {Promise<Object>} Response with heatmap data array
 */
export const getHeatmapData = async (timeFilter = "last30") => {
  try {
    const response = await API.get("/map/heatmap", {
      params: { timeFilter },
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch heatmap data");
  }
};

/**
 * Get ward risk data
 * @returns {Promise<Object>} Response with ward risk data array
 */
export const getWardRiskData = async () => {
  try {
    const response = await API.get("/map/ward-risk");
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch ward risk data");
  }
};