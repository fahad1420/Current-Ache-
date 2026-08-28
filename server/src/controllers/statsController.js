import { ElectricityReport } from '../models/ElectricityReport.js';
import { Location } from '../models/Location.js';
import { calculateLocationStatus } from '../services/statusCalculator.js';

/**
 * Get nationwide summary statistics
 */
export const getNationwideStats = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

    // Total reports submitted today
    const totalReportsToday = await ElectricityReport.countDocuments({
      createdAt: { $gte: startOfToday },
      isFlagged: false,
    });

    // Total reports all-time
    const totalReportsAllTime = await ElectricityReport.countDocuments({ isFlagged: false });

    // Distinct locations active in last 4 hours
    const activeLocationIds = await ElectricityReport.distinct('locationId', {
      createdAt: { $gte: fourHoursAgo },
      isFlagged: false,
    });

    // Fetch status for active locations to summarize
    const activeStatuses = await Promise.all(
      activeLocationIds.map(async (locId) => {
        const status = await calculateLocationStatus(locId);
        return {
          locationId: locId,
          ...status,
        };
      })
    );

    let areasAvailableCount = 0;
    let areasUnavailableCount = 0;
    let areasMixedCount = 0;

    activeStatuses.forEach(s => {
      if (s.status === 'available') areasAvailableCount++;
      else if (s.status === 'unavailable') areasUnavailableCount++;
      else if (s.status === 'mixed') areasMixedCount++;
    });

    // Top affected outage locations
    const topOutages = await ElectricityReport.aggregate([
      {
        $match: {
          status: 'unavailable',
          isFlagged: false,
          createdAt: { $gte: fourHoursAgo }
        }
      },
      {
        $group: {
          _id: '$locationId',
          outageReportsCount: { $sum: 1 },
          lastOutageReport: { $max: '$createdAt' }
        }
      },
      { $sort: { outageReportsCount: -1 } },
      { $limit: 6 }
    ]);

    const populatedTopOutages = await Location.populate(topOutages, {
      path: '_id',
      select: 'nameBn nameEn divisionBn districtBn slug'
    });

    const formattedTopOutages = populatedTopOutages
      .filter(item => item._id)
      .map(item => ({
        location: item._id,
        outageReportsCount: item.outageReportsCount,
        lastOutageReport: item.lastOutageReport,
      }));

    res.json({
      success: true,
      data: {
        totalReportsToday,
        totalReportsAllTime,
        activeAreasCount: activeLocationIds.length,
        areasAvailableCount,
        areasUnavailableCount,
        areasMixedCount,
        topOutageAreas: formattedTopOutages,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
};
