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

    // Top affected outage locations aggregated by DISTRICT
    const topOutages = await ElectricityReport.aggregate([
      {
        $match: {
          status: 'unavailable',
          isFlagged: false,
        }
      },
      {
        $lookup: {
          from: 'locations',
          localField: 'locationId',
          foreignField: '_id',
          as: 'loc'
        }
      },
      {
        $unwind: {
          path: '$loc',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          createdAt: 1,
          districtBn: {
            $ifNull: ['$loc.districtBn', { $ifNull: ['$district', 'ঢাকা'] }]
          },
          districtEn: {
            $ifNull: ['$loc.district', { $ifNull: ['$district', 'Dhaka'] }]
          },
          divisionBn: {
            $ifNull: ['$loc.divisionBn', { $ifNull: ['$division', 'ঢাকা'] }]
          },
          divisionEn: {
            $ifNull: ['$loc.division', { $ifNull: ['$division', 'Dhaka'] }]
          }
        }
      },
      {
        $group: {
          _id: '$districtBn',
          districtBn: { $first: '$districtBn' },
          districtEn: { $first: '$districtEn' },
          divisionBn: { $first: '$divisionBn' },
          divisionEn: { $first: '$divisionEn' },
          outageReportsCount: { $sum: 1 },
          lastOutageReport: { $max: '$createdAt' }
        }
      },
      { $sort: { outageReportsCount: -1 } },
      { $limit: 10 }
    ]);

    const formattedTopOutages = topOutages.map(item => ({
      nameBn: item.districtBn,
      nameEn: item.districtEn,
      districtBn: item.districtBn,
      districtEn: item.districtEn,
      divisionBn: item.divisionBn,
      divisionEn: item.divisionEn,
      outageReportsCount: item.outageReportsCount,
      reportsCount: item.outageReportsCount,
      lastOutageReport: item.lastOutageReport,
      location: {
        nameBn: item.districtBn,
        nameEn: item.districtEn,
        districtBn: item.districtBn,
        district: item.districtEn,
        divisionBn: item.divisionBn,
        division: item.divisionEn
      }
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
        topOutageDistricts: formattedTopOutages,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
};
