import express from "express";
import {
  logPerformance,
  getPerformanceHistory,
  getSessionPerformance,
} from "../controllers/performanceController.js";
import { protect, authorizeChild } from "../middleware/auth.js";

const router = express.Router();

// All routes are protected
router.use(protect);

router.post("/log", logPerformance);
router.get("/:userId", authorizeChild, getPerformanceHistory);
router.get("/session/:sessionId", getSessionPerformance);

export default router;
