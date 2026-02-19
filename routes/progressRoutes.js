import express from "express";
import {
  getUserProgress,
  getModuleProgress,
  updateProgress,
  getAnalytics,
  getInsights,
} from "../controllers/progressController.js";
import { protect, authorizeChild } from "../middleware/auth.js";

const router = express.Router();

// All routes are protected
router.use(protect);

router.get("/:userId", authorizeChild, getUserProgress);
router.get("/:userId/:moduleName", authorizeChild, getModuleProgress);
router.post("/update", updateProgress);
router.get("/analytics/:userId", authorizeChild, getAnalytics);
router.get("/insights/:userId", authorizeChild, getInsights);

export default router;
