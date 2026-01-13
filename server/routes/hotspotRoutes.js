import express from "express";
import { protectRoute } from "../middleware/auth.js";
import { adminOnly } from "../middleware/roleMiddleware.js";
import { getHotspots } from "../controllers/hotspotController.js";

const router = express.Router();

/**
 * GET /api/hotspots
 * 
 * Admin-only endpoint to retrieve high-risk wards and categories
 * based on complaint volume and priority within the last 30 days.
 */
router.get("/", protectRoute, adminOnly, getHotspots);

export default router;
