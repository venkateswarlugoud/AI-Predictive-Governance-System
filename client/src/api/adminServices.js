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
