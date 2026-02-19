import express from 'express';
import {
  getUserWorlds,
  getWorld,
  updateWorldProgress,
  getRecommendedWorld,
} from '../controllers/worldController.js';
import { protect, authorizeChild } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/:userId', authorizeChild, getUserWorlds);
router.get('/:userId/:worldName', authorizeChild, getWorld);
router.post('/update', updateWorldProgress);
router.get('/recommend/:userId', authorizeChild, getRecommendedWorld);

export default router;
