import express from "express";
import { protectRoute } from "../middleware/auth.js";
import { adminOnly } from "../middleware/roleMiddleware.js";
import { testEmail } from "../controllers/debugController.js";

const router = express.Router();

// Temporary admin-only endpoint to verify SMTP with real Gmail
router.get("/test-email", protectRoute, adminOnly, testEmail);
router.post("/test-email", protectRoute, adminOnly, testEmail);

export default router;
