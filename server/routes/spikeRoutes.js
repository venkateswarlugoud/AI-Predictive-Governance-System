import express from "express";
import { protectRoute } from "../middleware/auth.js";
import { adminOnly } from "../middleware/roleMiddleware.js";
import { getSpikes, getSpikeDebug, checkComplaintData } from "../controllers/spikeController.js";

const router = express.Router();

// GET /api/spikes - Get abnormal spikes in complaints
// Admin-only access for early-warning governance alerts
router.get("/", protectRoute, adminOnly, getSpikes);

// GET /api/spikes/debug - Debug endpoint to see intermediate spike detection data
// Admin-only access
router.get("/debug", protectRoute, adminOnly, getSpikeDebug);

// GET /api/spikes/check-data - Simple endpoint to verify complaint data exists
// Admin-only access
router.get("/check-data", protectRoute, adminOnly, checkComplaintData);

export default router;
