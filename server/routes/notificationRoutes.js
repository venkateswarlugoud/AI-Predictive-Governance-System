import express from "express";
import { protectRoute } from "../middleware/auth.js";
import { adminOnly } from "../middleware/roleMiddleware.js";
import {
  sendNotificationForComplaint,
  getNotificationHistory,
} from "../controllers/notificationController.js";

const router = express.Router();

// Admin-safe notification APIs
router.post("/send", protectRoute, adminOnly, sendNotificationForComplaint);
router.get(
  "/history/:complaintId",
  protectRoute,
  adminOnly,
  getNotificationHistory
);

export default router;

