import express from 'express';
import {
  getSchedulesByLocation,
  createSchedule,
  voteSchedule,
  adminGetSchedules,
  adminUpdateSchedule,
} from '../controllers/scheduleController.js';
import { requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public schedule endpoints
router.get('/location/:locationId', getSchedulesByLocation);
router.post('/', createSchedule);
router.post('/:id/vote', voteSchedule);

// Admin-only schedule moderation
router.get('/admin/all', requireAdmin, adminGetSchedules);
router.patch('/admin/:id', requireAdmin, adminUpdateSchedule);

export default router;
