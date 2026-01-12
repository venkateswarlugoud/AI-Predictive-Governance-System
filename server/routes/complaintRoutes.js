import express from "express";
import {
  createComplaint,
  getAllComplaints,
  getMyComplaints,
  updateComplaintStatus,
} from "../controllers/complaintController.js";

import { protectRoute } from "../middleware/auth.js";
import { adminOnly } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/", protectRoute,createComplaint);
router.get("/my", protectRoute, getMyComplaints);
router.get("/", protectRoute, adminOnly, getAllComplaints);
router.put("/:id", protectRoute, adminOnly, updateComplaintStatus);

export default router;
