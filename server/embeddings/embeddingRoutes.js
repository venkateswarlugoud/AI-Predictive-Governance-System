import express from "express";
import { checkRepeatPattern } from "./embeddingController.js";
import { protectRoute } from "../middleware/auth.js";
import { adminOnly } from "../middleware/roleMiddleware.js";



console.log("✅ embeddingRoutes.js loaded");
/**
 * PHASE-2 ADVISORY EMBEDDING ROUTES
 *
 * Admin-only advisory semantic analysis.
 * Does NOT modify Phase-1 data.
 */

const router = express.Router();

router.post(
  "/repeat-check",
  protectRoute,
  adminOnly,
  checkRepeatPattern
);

export default router;
