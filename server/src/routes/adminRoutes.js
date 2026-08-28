import express from 'express';
import {
  adminLogin,
  getAdminReports,
  deleteReport,
  toggleFlagReport,
  toggleLocation,
} from '../controllers/adminController.js';
import { requireAdmin } from '../middleware/authMiddleware.js';
import { loginLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/login', loginLimiter, adminLogin);
router.get('/reports', requireAdmin, getAdminReports);
router.delete('/reports/:id', requireAdmin, deleteReport);
router.patch('/reports/:id/flag', requireAdmin, toggleFlagReport);
router.patch('/locations/:id/toggle', requireAdmin, toggleLocation);

export default router;
