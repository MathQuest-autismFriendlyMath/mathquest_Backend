import express from 'express';
import {
  logInteractionEvent,
  logInteractionEventsBatch,
  getSessionEvents,
  getSessionMetrics,
  getUserInteractionPatterns,
  getAdaptiveFeedback
} from '../controllers/interactionController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Event logging
router.post('/event', logInteractionEvent);
router.post('/events/batch', logInteractionEventsBatch);

// Session analytics
router.get('/session/:sessionId', getSessionEvents);
router.get('/session/:sessionId/metrics', getSessionMetrics);

// User patterns
router.get('/patterns', getUserInteractionPatterns);

// Adaptive feedback
router.post('/adaptive-feedback', getAdaptiveFeedback);

export default router;
