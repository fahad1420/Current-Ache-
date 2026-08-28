import { ElectricityReport } from '../models/ElectricityReport.js';

// Cooldown window in minutes per location & IP
const COOLDOWN_MINUTES = 10;

/**
 * Checks if a client is attempting to spam reports for the same location
 */
export const checkReportCooldown = async (locationId, ipHash) => {
  const cooldownThreshold = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000);

  const recentSubmission = await ElectricityReport.findOne({
    locationId,
    ipHash,
    createdAt: { $gte: cooldownThreshold },
  }).sort({ createdAt: -1 });

  if (recentSubmission) {
    const minutesRemaining = Math.ceil(
      (recentSubmission.createdAt.getTime() + COOLDOWN_MINUTES * 60 * 1000 - Date.now()) / (60 * 1000)
    );
    return {
      allowed: false,
      minutesRemaining: Math.max(1, minutesRemaining),
      lastStatus: recentSubmission.status,
    };
  }

  return { allowed: true };
};
