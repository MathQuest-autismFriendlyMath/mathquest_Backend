import express from 'express';
import {
  getRecommendation,
  getAdaptiveParameters,
  getPerformanceTrends,
  getConceptMastery,
} from '../controllers/adaptiveController.js';
import { protect, authorizeChild } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/recommendation/:userId/:moduleName', authorizeChild, getRecommendation);
router.get('/parameters/:userId/:moduleName', authorizeChild, getAdaptiveParameters);
router.get('/trends/:userId/:moduleName', authorizeChild, getPerformanceTrends);
router.get('/mastery/:userId/:moduleName/:concept', authorizeChild, getConceptMastery);

export default router;
