import { Location } from '../models/Location.js';
import { ElectricityReport } from '../models/ElectricityReport.js';
import { calculateLocationStatus } from '../services/statusCalculator.js';

/**
 * Extract parsed duration in minutes from a report, or null if unspecified/unreliable
 */
function getReportedDurationMinutes(r) {
  if (r.customMinutes && typeof r.customMinutes === 'number' && r.customMinutes > 0 && r.customMinutes <= 2880) {
    return r.customMinutes;
  }
  if (r.duration === '15_min') return 15;
  if (r.duration === '30_min') return 30;
  if (r.duration === '1_hour') return 60;
  if (r.duration === '2_hours') return 120;
  if (r.duration === '4_hours_plus') return 240;
  return null; // Do not poison stats with arbitrary default minutes
}

/**
 * Status-transition-aware grouping of raw reports into distinct historical events
 */
export function groupReportsIntoEvents(reports) {
  if (!reports || reports.length === 0) {
    return { events: [], outageEvents: [], restorationEvents: [] };
  }

  // Sort chronological ascending
  const sorted = [...reports].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const events = [];

  let currentEvent = null;

  for (const r of sorted) {
    const rTime = new Date(r.createdAt).getTime();
    const reportedDur = getReportedDurationMinutes(r);

    // If report stated it had already lasted X mins, inferred start is rTime - dur
    const inferredStart = reportedDur ? new Date(rTime - reportedDur * 60000) : new Date(rTime);

    if (!currentEvent) {
      currentEvent = {
        status: r.status,
        startTime: inferredStart,
        firstReportTime: new Date(rTime),
        endTime: new Date(rTime),
        reportedDurationMinutes: reportedDur,
        reportsCount: 1,
      };
    } else if (currentEvent.status === r.status && (rTime - currentEvent.endTime.getTime()) <= 45 * 60 * 1000) {
      // Same status and within 45 min window -> merge into existing event
      currentEvent.endTime = new Date(rTime);
      currentEvent.reportsCount += 1;
      if (inferredStart < currentEvent.startTime) {
        currentEvent.startTime = inferredStart;
      }
      if (reportedDur && (!currentEvent.reportedDurationMinutes || reportedDur > currentEvent.reportedDurationMinutes)) {
        currentEvent.reportedDurationMinutes = reportedDur;
      }
    } else {
      // Status transition OR time gap > 45 mins -> ALWAYS start a new distinct event!
      events.push(currentEvent);
      currentEvent = {
        status: r.status,
        startTime: inferredStart,
        firstReportTime: new Date(rTime),
        endTime: new Date(rTime),
        reportedDurationMinutes: reportedDur,
        reportsCount: 1,
      };
    }
  }

  if (currentEvent) {
    events.push(currentEvent);
  }

  // Calculate final effective duration for each event based on transitions or reported duration
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (ev.status === 'unavailable') {
      const nextEv = events[i + 1];
      if (nextEv && nextEv.status === 'available') {
        // Real restoration transition duration
        const transitionDuration = Math.round((nextEv.startTime.getTime() - ev.startTime.getTime()) / 60000);
        ev.effectiveDurationMinutes = Math.max(5, transitionDuration);
        ev.isCompleted = true;
      } else if (ev.reportedDurationMinutes) {
        ev.effectiveDurationMinutes = ev.reportedDurationMinutes;
        ev.isCompleted = i < events.length - 1; // Completed if followed by subsequent event
      } else {
        ev.effectiveDurationMinutes = null; // Unspecified duration, exclude from duration median
        ev.isCompleted = i < events.length - 1;
      }
    } else {
      ev.isCompleted = true;
    }
  }

  const outageEvents = events.filter(e => e.status === 'unavailable');
  const restorationEvents = events.filter(e => e.status === 'available');

  return { events, outageEvents, restorationEvents };
}

/**
 * Get lightweight map locations along with their live calculated electricity status
 */
export const getMapLocationsStatus = async (req, res, next) => {
  try {
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const locations = await Location.find({ isActive: true })
      .select('nameBn nameEn division divisionBn district districtBn upazila upazilaBn slug latitude longitude type popularPriority')
      .lean();

    const recentReports = await ElectricityReport.find({
      isFlagged: false,
      createdAt: { $gte: fourHoursAgo },
    })
      .select('locationId status createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const reportMap = new Map();
    recentReports.forEach((r) => {
      const locIdStr = String(r.locationId);
      if (!reportMap.has(locIdStr)) {
        reportMap.set(locIdStr, []);
      }
      reportMap.get(locIdStr).push(r);
    });

    let availableSummary = 0;
    let unavailableSummary = 0;
    let insufficientSummary = 0;

    const mapData = locations.map((loc) => {
      const locIdStr = String(loc._id);
      const reports = reportMap.get(locIdStr) || [];

      let status = 'insufficient_data';
      let availablePercentage = 0;
      let unavailablePercentage = 0;
      let availableCount = 0;
      let unavailableCount = 0;
      let lastReportAt = null;

      if (reports.length > 0) {
        lastReportAt = reports[0].createdAt;
        const freshReports = reports.filter((r) => new Date(r.createdAt) >= oneHourAgo);
        const olderReports = reports.filter((r) => new Date(r.createdAt) < oneHourAgo);

        let availableScore = 0;
        let unavailableScore = 0;

        freshReports.forEach((r) => {
          if (r.status === 'available') {
            availableScore += 1.0;
            availableCount++;
          } else {
            unavailableScore += 1.0;
            unavailableCount++;
          }
        });

        olderReports.forEach((r) => {
          if (r.status === 'available') {
            availableScore += 0.35;
            availableCount++;
          } else {
            unavailableScore += 0.35;
            unavailableCount++;
          }
        });

        const totalWeight = availableScore + unavailableScore;
        availablePercentage = totalWeight > 0 ? Math.round((availableScore / totalWeight) * 100) : 0;
        unavailablePercentage = totalWeight > 0 ? 100 - availablePercentage : 0;

        if (freshReports.length === 0 && olderReports.length > 0) {
          if (availablePercentage >= 65) status = 'available';
          else if (unavailablePercentage >= 65) status = 'unavailable';
          else status = 'insufficient_data';
        } else {
          if (availablePercentage >= 60) status = 'available';
          else if (unavailablePercentage >= 60) status = 'unavailable';
          else if (reports.length >= 2) status = 'mixed';
          else status = reports[0].status;
        }
      }

      if (status === 'available') availableSummary++;
      else if (status === 'unavailable') unavailableSummary++;
      else insufficientSummary++;

      return {
        _id: loc._id,
        nameBn: loc.nameBn,
        nameEn: loc.nameEn,
        division: loc.division,
        divisionBn: loc.divisionBn,
        district: loc.district,
        districtBn: loc.districtBn,
        upazila: loc.upazila,
        upazilaBn: loc.upazilaBn,
        slug: loc.slug,
        latitude: loc.latitude,
        longitude: loc.longitude,
        type: loc.type,
        popularPriority: loc.popularPriority,
        status,
        availablePercentage,
        unavailablePercentage,
        totalRecentReports: reports.length,
        availableCount,
        unavailableCount,
        lastReportAt,
      };
    });

    res.json({
      success: true,
      count: mapData.length,
      summary: {
        total: mapData.length,
        available: availableSummary,
        unavailable: unavailableSummary,
        insufficient: insufficientSummary,
      },
      data: mapData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all locations with optional filtering
 */
export const getLocations = async (req, res, next) => {
  try {
    const { division, district, type } = req.query;
    const filter = { isActive: true };

    if (division) filter.division = new RegExp(`^${division}$`, 'i');
    if (district) filter.district = new RegExp(`^${district}$`, 'i');
    if (type) filter.type = type;

    const locations = await Location.find(filter)
      .sort({ popularPriority: -1, nameBn: 1 })
      .lean();

    res.json({
      success: true,
      count: locations.length,
      data: locations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search locations by Bangla or English name
 */
export const searchLocations = async (req, res, next) => {
  try {
    const query = (req.query.q || '').trim();
    if (!query || query.length < 1) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const locations = await Location.find({
      isActive: true,
      $or: [
        { nameBn: regex },
        { nameEn: regex },
        { districtBn: regex },
        { district: regex },
        { upazilaBn: regex },
        { upazila: regex },
        { divisionBn: regex },
        { division: regex },
      ],
    })
      .sort({ popularPriority: -1 })
      .limit(15)
      .lean();

    res.json({
      success: true,
      count: locations.length,
      data: locations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single location by ID or Slug with calculated status
 */
export const getLocationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let location;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      location = await Location.findById(id).lean();
    } else {
      location = await Location.findOne({ slug: id.toLowerCase(), isActive: true }).lean();
    }

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'এলাকাটি খুঁজে পাওয়া যায়নি।',
        messageEn: 'Location not found.',
      });
    }

    const statusData = await calculateLocationStatus(location._id);

    res.json({
      success: true,
      data: {
        location,
        status: statusData,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get status of location
 */
export const getLocationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const location = await Location.findById(id).select('nameBn nameEn division district upazila slug latitude longitude').lean();

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'এলাকাটি খুঁজে পাওয়া যায়নি।',
      });
    }

    const statusData = await calculateLocationStatus(location._id);

    res.json({
      success: true,
      data: {
        location,
        ...statusData,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get power interruption history & reliability analytics for a specific location
 */
export const getLocationHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    let location;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      location = await Location.findById(id).lean();
    } else {
      location = await Location.findOne({ slug: id.toLowerCase(), isActive: true }).lean();
    }

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'এলাকাটি খুঁজে পাওয়া যায়নি।',
      });
    }

    const now = new Date();
    const t24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const t48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const t7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const t30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const allReports = await ElectricityReport.find({
      locationId: location._id,
      isFlagged: false,
    })
      .sort({ createdAt: -1 })
      .lean();

    // 1. Live status check
    const statusData = await calculateLocationStatus(location._id);
    const isCurrentlyUnavailable = statusData.status === 'unavailable';

    // 2. Group reports into status-transition-aware events
    const calcPeriodStats = (reports) => {
      const { outageEvents, restorationEvents } = groupReportsIntoEvents(reports);

      let totalOutageMins = 0;
      const validDurations = [];

      outageEvents.forEach((ev) => {
        if (ev.effectiveDurationMinutes && typeof ev.effectiveDurationMinutes === 'number') {
          totalOutageMins += ev.effectiveDurationMinutes;
          validDurations.push(ev.effectiveDurationMinutes);
        }
      });

      let medianOutageMins = 0;
      if (validDurations.length > 0) {
        const sortedDurs = [...validDurations].sort((a, b) => a - b);
        const mid = Math.floor(sortedDurs.length / 2);
        medianOutageMins = sortedDurs.length % 2 !== 0
          ? sortedDurs[mid]
          : Math.round((sortedDurs[mid - 1] + sortedDurs[mid]) / 2);
      }

      const avgOutageMins = validDurations.length > 0 ? Math.round(totalOutageMins / validDurations.length) : 0;

      return {
        totalReports: reports.length,
        outageEvents: outageEvents.length,
        restorationEvents: restorationEvents.length,
        totalOutageMinutes: totalOutageMins,
        averageOutageMinutes: avgOutageMins,
        medianOutageMinutes: medianOutageMins,
        validDurationCount: validDurations.length,
      };
    };

    const stats24h = calcPeriodStats(allReports.filter((r) => new Date(r.createdAt) >= t24h));
    const stats48h = calcPeriodStats(allReports.filter((r) => new Date(r.createdAt) >= t48h));
    const stats7d = calcPeriodStats(allReports.filter((r) => new Date(r.createdAt) >= t7d));
    const stats30d = calcPeriodStats(allReports.filter((r) => new Date(r.createdAt) >= t30d));
    const statsLifetime = calcPeriodStats(allReports);

    // 3. Transparent reliability score
    let reliabilityScore = null;
    let reliabilityGrade = 'insufficient';

    if (stats30d.totalReports >= 2 || statsLifetime.totalReports >= 2) {
      const activeStats = stats30d.totalReports >= 2 ? stats30d : statsLifetime;
      const totalEvents = activeStats.outageEvents + activeStats.restorationEvents;
      if (totalEvents > 0) {
        const score = Math.round((activeStats.restorationEvents / totalEvents) * 100);
        reliabilityScore = Math.min(100, Math.max(0, score));
        if (reliabilityScore >= 80) reliabilityGrade = 'high';
        else if (reliabilityScore >= 50) reliabilityGrade = 'moderate';
        else reliabilityGrade = 'low';
      }
    }

    // 4. Latest reports
    const lastOutageReport = allReports.find((r) => r.status === 'unavailable');
    const lastRestorationReport = allReports.find((r) => r.status === 'available');

    // 5. RESTORATION ESTIMATION PIPELINE (Status-gated & strictly without double-counting)
    let restorationEstimate = null;

    if (isCurrentlyUnavailable) {
      // Find the active ongoing outage start time without double-counting
      let elapsedMins = 0;
      if (lastOutageReport) {
        const rTime = new Date(lastOutageReport.createdAt).getTime();
        const reportedDur = getReportedDurationMinutes(lastOutageReport) || 0;
        // The outage started at (rTime - reportedDur). Elapsed time from that moment to NOW:
        const inferredOutageStart = rTime - reportedDur * 60000;
        elapsedMins = Math.max(0, Math.round((now.getTime() - inferredOutageStart) / 60000));
      }

      // Check historical completed outages (requiring >= 2 valid durations)
      let expectedTotalMins = 60;
      let isDefault = true;
      let confidence = 'insufficient';

      if (stats30d.validDurationCount >= 2 && stats30d.medianOutageMinutes > 0) {
        expectedTotalMins = stats30d.medianOutageMinutes;
        isDefault = false;
        confidence = stats30d.validDurationCount >= 5 ? 'high' : 'medium';
      } else if (statsLifetime.validDurationCount >= 2 && statsLifetime.medianOutageMinutes > 0) {
        expectedTotalMins = statsLifetime.medianOutageMinutes;
        isDefault = false;
        confidence = 'low';
      }

      let remainingMins = 60;
      if (isDefault) {
        // Strict requirement: default estimate is exactly NOW + 60 minutes
        remainingMins = 60;
      } else {
        remainingMins = Math.max(5, expectedTotalMins - elapsedMins);
      }

      const estimatedClockDate = new Date(now.getTime() + remainingMins * 60 * 1000);

      restorationEstimate = {
        isActiveOutage: true,
        estimatedDurationMinutes: remainingMins,
        isDefaultEstimate: isDefault,
        confidence,
        estimatedTimeISO: estimatedClockDate.toISOString(),
        elapsedMinutes: elapsedMins,
      };
    } else {
      restorationEstimate = {
        isActiveOutage: false,
        message: 'বর্তমানে বিদ্যুৎ সচল রয়েছে।',
        messageEn: 'Power is currently online.',
      };
    }

    res.json({
      success: true,
      data: {
        location: {
          _id: location._id,
          nameBn: location.nameBn,
          nameEn: location.nameEn,
          division: location.division,
          divisionBn: location.divisionBn,
          district: location.district,
          districtBn: location.districtBn,
          upazila: location.upazila,
          upazilaBn: location.upazilaBn,
          slug: location.slug,
          latitude: location.latitude,
          longitude: location.longitude,
        },
        currentStatus: statusData.status,
        reliability: {
          score: reliabilityScore,
          grade: reliabilityGrade,
          confidence: allReports.length >= 5 ? 'high' : allReports.length >= 2 ? 'medium' : 'low',
        },
        restorationEstimate,
        periods: {
          '24h': stats24h,
          '48h': stats48h,
          '7d': stats7d,
          '30d': stats30d,
          lifetime: statsLifetime,
        },
        lastOutageAt: lastOutageReport ? lastOutageReport.createdAt : null,
        lastRestorationAt: lastRestorationReport ? lastRestorationReport.createdAt : null,
        recentTimeline: allReports.slice(0, 10).map((r) => ({
          id: r._id,
          status: r.status,
          duration: r.duration,
          customMinutes: r.customMinutes,
          createdAt: r.createdAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
