import express from "express";
import { protectRoute } from "../middleware/auth.js";
import { adminOnly } from "../middleware/roleMiddleware.js";

import {
  getAnalyticsSummary,
  getComplaintsByCategory,
  getComplaintsByPriority,
  getMonthlyComplaintTrends,
  getMonthlyCategoryTrends,
  getMonthlyWardTrends,
  getCategoryTrendDirection,
  getWardTrendDirection,
  forecastCategoryComplaints,
  forecastWardComplaints
} from "../controllers/analyticsController.js";

const router = express.Router();

router.get("/summary", protectRoute, adminOnly, getAnalyticsSummary);
router.get("/by-category", protectRoute, adminOnly, getComplaintsByCategory);
router.get("/by-priority", protectRoute, adminOnly, getComplaintsByPriority);

router.get("/monthly", protectRoute, adminOnly, getMonthlyComplaintTrends);
router.get("/category/monthly", protectRoute, adminOnly, getMonthlyCategoryTrends);
router.get("/ward/monthly", protectRoute, adminOnly, getMonthlyWardTrends);

router.get("/trend/category", protectRoute, adminOnly, getCategoryTrendDirection);
router.get("/trend/ward", protectRoute, adminOnly, getWardTrendDirection);

router.get("/forecast/category", protectRoute, adminOnly, forecastCategoryComplaints);
router.get("/forecast/ward", protectRoute, adminOnly, forecastWardComplaints);

export default router;
