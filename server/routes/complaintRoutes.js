import express from "express";
import { protectRoute } from "../middleware/auth.js";
import { adminOnly } from "../middleware/roleMiddleware.js";
import {
  createComplaint,
  getAllComplaints,
  getMyComplaints,
  updateComplaintStatus,
} from "../controllers/complaintController.js";

const router = express.Router();

// Citizen routes
router.post("/", protectRoute, createComplaint);
router.get("/my", protectRoute, getMyComplaints);

// Admin routes
router.get("/", protectRoute, adminOnly, getAllComplaints);
router.put("/:id", protectRoute, adminOnly, updateComplaintStatus);

export default router;
