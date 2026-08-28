import express from 'express';
import { createReport, getRecentReports } from '../controllers/reportController.js';
import { reportLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/', reportLimiter, createReport);
router.get('/recent', getRecentReports);

export default router;
