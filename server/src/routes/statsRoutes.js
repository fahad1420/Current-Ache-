import express from 'express';
import { getNationwideStats } from '../controllers/statsController.js';

const router = express.Router();

router.get('/', getNationwideStats);

export default router;
