import express from "express";
import { protectRoute } from "../middleware/auth.js";
import { adminOnly } from "../middleware/roleMiddleware.js";
import {
  getEscalationSummary,
  getEscalationByComplaintId,
} from "../controllers/escalationController.js";

const router = express.Router();

// Escalation indicators (Admin-only, Read-only, Advisory)
router.get("/summary", protectRoute, adminOnly, getEscalationSummary);
router.get("/by-complaint/:id", protectRoute, adminOnly, getEscalationByComplaintId);

export default router;

