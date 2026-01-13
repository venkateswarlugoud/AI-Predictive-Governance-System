import express from "express";
import { protectRoute } from "../middleware/auth.js";
import { adminOnly } from "../middleware/roleMiddleware.js";
import {
  getAllAlerts,
  updateAlertStatus,
  triggerAlertGeneration,
  acknowledgeAlert,
  resolveAlert,
} from "../controllers/alertController.js";

const router = express.Router();

// GET /api/alerts - Get all governance alerts
// Admin-only access for municipal authority review
router.get("/", protectRoute, adminOnly, getAllAlerts);

// POST /api/alerts/generate - Manually trigger alert generation
// Admin-only access for on-demand alert creation
router.post("/generate", protectRoute, adminOnly, triggerAlertGeneration);

// PUT /api/alerts/:id/acknowledge - Acknowledge an alert
// Admin-only access for formal alert acknowledgment workflow
// Must come before /:id route to avoid route conflicts
router.put("/:id/acknowledge", protectRoute, adminOnly, acknowledgeAlert);

// PUT /api/alerts/:id/resolve - Resolve an alert with official remarks
// Admin-only access for formal alert resolution workflow
// Must come before /:id route to avoid route conflicts
router.put("/:id/resolve", protectRoute, adminOnly, resolveAlert);

// PUT /api/alerts/:id - Update alert status
// Admin-only access for alert management
// Generic route must come after specific routes
router.put("/:id", protectRoute, adminOnly, updateAlertStatus);

export default router;
