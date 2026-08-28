import express from 'express';
import {
  getLocations,
  getMapLocationsStatus,
  searchLocations,
  getLocationById,
  getLocationStatus,
  getLocationHistory,
} from '../controllers/locationController.js';

const router = express.Router();

router.get('/', getLocations);
router.get('/map-status', getMapLocationsStatus);
router.get('/search', searchLocations);
router.get('/:id', getLocationById);
router.get('/:id/status', getLocationStatus);
router.get('/:id/history', getLocationHistory);

export default router;
