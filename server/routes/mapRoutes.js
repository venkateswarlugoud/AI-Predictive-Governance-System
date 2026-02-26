import express from "express";
import { protectRoute } from "../middleware/auth.js";
import { adminOnly } from "../middleware/roleMiddleware.js";
import {
  getNearbyComplaints,
  getHeatmap,
  getWardRiskMap,
} from "../controllers/mapController.js";

const router = express.Router();

/**
 * GET /api/map/near
 * 
 * Get complaints near a specific location
 * Query params: lng, lat, distance (optional)
 * 
 * Access: Protected (authenticated users)
 */
router.get("/near", protectRoute, getNearbyComplaints);

/**
 * GET /api/map/heatmap
 * 
 * Get heatmap data for visualization
 * Query params: timeFilter (optional: last7, last30, last90)
 * 
 * Access: Protected (authenticated users)
 */
router.get("/heatmap", protectRoute, getHeatmap);

/**
 * GET /api/map/ward-risk
 * 
 * Get ward risk data for risk visualization
 * 
 * Access: Admin-only
 */
router.get("/ward-risk", protectRoute, adminOnly, getWardRiskMap);

export default router;
