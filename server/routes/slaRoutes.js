import express from "express";
import { protectRoute } from "../middleware/auth.js";
import { adminOnly } from "../middleware/roleMiddleware.js";
import { getSlaSummary, getSlaByComplaintId } from "../controllers/slaController.js";

const router = express.Router();

// SLA monitoring endpoints (Admin-only, Read-only)
router.get("/summary", protectRoute, adminOnly, getSlaSummary);
router.get("/by-complaint/:id", protectRoute, adminOnly, getSlaByComplaintId);

export default router;

