import { identifyHotspots } from "../services/hotspotService.js";

/**
 * GET /api/hotspots
 * 
 * Retrieves high-risk wards and categories (hotspots) based on
 * complaint volume and priority within the last 30 days.
 * 
 * Access: Admin-only (enforced by middleware)
 * 
 * Response format:
 * [
 *   {
 *     "ward": "Ward-3",
 *     "category": "Sanitation",
 *     "complaintCount": 18,
 *     "hotspotScore": 31,
 *     "severity": "Medium"
 *   }
 * ]
 */
export const getHotspots = async (req, res) => {
  try {
    const hotspots = await identifyHotspots();

    return res.status(200).json({
      success: true,
      hotspots,
    });
  } catch (error) {
    console.error("Error in getHotspots controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve hotspots",
      error: error.message,
    });
  }
};
