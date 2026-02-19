import express from "express";
import {
  getRecommendation,
  getAdaptiveParameters,
  getPerformanceTrends,
  getConceptMastery,
  getComprehensiveFeedback,
} from "../controllers/adaptiveController.js";
import { protect, authorizeChild } from "../middleware/auth.js";

const router = express.Router();

// All routes are protected
router.use(protect);

router.get(
  "/recommendation/:userId/:moduleName",
  authorizeChild,
  getRecommendation,
);
router.get(
  "/parameters/:userId/:moduleName",
  authorizeChild,
  getAdaptiveParameters,
);
router.get("/trends/:userId/:moduleName", authorizeChild, getPerformanceTrends);
router.get(
  "/mastery/:userId/:moduleName/:concept",
  authorizeChild,
  getConceptMastery,
);
router.get(
  "/comprehensive-feedback/:userId/:moduleName/:sessionId",
  authorizeChild,
  getComprehensiveFeedback,
);

export default router;
