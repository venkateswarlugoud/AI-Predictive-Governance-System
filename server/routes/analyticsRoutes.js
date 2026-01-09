import express from "express";
import { protectRoute } from "../middleware/auth.js";
import { adminOnly } from "../middleware/roleMiddleware.js";

import {
  getAnalyticsSummary,
  getComplaintsByCategory,
  getComplaintsByPriority
} from "../controllers/analyticsController.js";

const router = express.Router();

router.get("/summary", protectRoute, adminOnly, getAnalyticsSummary);
router.get("/by-category", protectRoute, adminOnly, getComplaintsByCategory);
router.get("/by-priority", protectRoute, adminOnly, getComplaintsByPriority);

export default router;
