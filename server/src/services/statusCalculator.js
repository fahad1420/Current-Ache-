import { ElectricityReport } from '../models/ElectricityReport.js';

/**
 * Calculates real-time electricity status for a given location ID
 * based on community-submitted crowd-sourced reports.
 */
export const calculateLocationStatus = async (locationId) => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

  // Fetch reports in the last 4 hours
  const recentReports = await ElectricityReport.find({
    locationId,
    isFlagged: false,
    createdAt: { $gte: fourHoursAgo }
  }).sort({ createdAt: -1 }).lean();

  const totalReportsCountAllTime = await ElectricityReport.countDocuments({
    locationId,
    isFlagged: false,
  });

  if (!recentReports || recentReports.length === 0) {
    return {
      status: 'insufficient_data', // 'available' | 'unavailable' | 'insufficient_data' | 'mixed'
      statusLabelBn: 'পর্যাপ্ত তথ্য নেই',
      statusLabelEn: 'Insufficient Data',
      availableCount: 0,
      unavailableCount: 0,
      totalRecentReports: 0,
      totalReportsCountAllTime,
      availablePercentage: 0,
      unavailablePercentage: 0,
      confidence: 'none', // 'high' | 'medium' | 'low' | 'none'
      confidenceLabelBn: 'কোনো সাম্প্রতিক রিপোর্ট নেই',
      lastReportAt: null,
      lastReportStatus: null,
      recentLocalities: [],
    };
  }

  // Split into fresh (last 60 mins) and older (1-4 hours)
  const freshReports = recentReports.filter(r => new Date(r.createdAt) >= oneHourAgo);
  const olderReports = recentReports.filter(r => new Date(r.createdAt) < oneHourAgo);

  let availableScore = 0;
  let unavailableScore = 0;
  let availableCount = 0;
  let unavailableCount = 0;

  // Fresh reports have weight 1.0
  freshReports.forEach(r => {
    if (r.status === 'available') {
      availableScore += 1.0;
      availableCount++;
    } else {
      unavailableScore += 1.0;
      unavailableCount++;
    }
  });

  // Older reports (1-4 hours) have decay weight 0.35
  olderReports.forEach(r => {
    if (r.status === 'available') {
      availableScore += 0.35;
      availableCount++;
    } else {
      unavailableScore += 0.35;
      unavailableCount++;
    }
  });

  const totalWeight = availableScore + unavailableScore;
  const availablePercentage = totalWeight > 0 ? Math.round((availableScore / totalWeight) * 100) : 0;
  const unavailablePercentage = totalWeight > 0 ? 100 - availablePercentage : 0;

  const totalRecentCount = recentReports.length;
  const freshCount = freshReports.length;
  const latestReport = recentReports[0];

  // Determine Confidence
  let confidence = 'low';
  let confidenceLabelBn = 'অল্প রিপোর্ট';

  if (freshCount >= 5) {
    confidence = 'high';
    confidenceLabelBn = 'অনেক ব্যবহারকারীর রিপোর্ট (উচ্চ নির্ভরতা)';
  } else if (freshCount >= 2) {
    confidence = 'medium';
    confidenceLabelBn = 'মাঝারি সংখ্যক রিপোর্ট';
  } else if (freshCount === 1) {
    confidence = 'low';
    confidenceLabelBn = 'মাত্র ১টি সাম্প্রতিক রিপোর্ট';
  } else {
    confidence = 'low';
    confidenceLabelBn = 'পূর্বের তথ্যের ভিত্তিতে (কম নির্ভরযোগ্য)';
  }

  // Determine Status
  let status = 'insufficient_data';
  let statusLabelBn = 'পর্যাপ্ত তথ্য নেই';
  let statusLabelEn = 'Insufficient Data';

  if (freshCount === 0 && olderReports.length > 0) {
    // Only older reports available
    if (availablePercentage >= 65) {
      status = 'available';
      statusLabelBn = 'সম্ভবত কারেন্ট আছে (পুরোনো রিপোর্ট)';
      statusLabelEn = 'Likely Available (Older data)';
    } else if (unavailablePercentage >= 65) {
      status = 'unavailable';
      statusLabelBn = 'সম্ভবত কারেন্ট নেই (পুরোনো রিপোর্ট)';
      statusLabelEn = 'Likely Unavailable (Older data)';
    } else {
      status = 'insufficient_data';
      statusLabelBn = 'পর্যাপ্ত তথ্য নেই';
      statusLabelEn = 'Insufficient Data';
    }
  } else {
    // Has fresh reports
    if (availablePercentage >= 60) {
      status = 'available';
      statusLabelBn = 'বর্তমানে কারেন্ট আছে';
      statusLabelEn = 'Electricity Available';
    } else if (unavailablePercentage >= 60) {
      status = 'unavailable';
      statusLabelBn = 'বর্তমানে কারেন্ট নেই';
      statusLabelEn = 'Electricity Unavailable';
    } else if (totalRecentCount >= 2) {
      status = 'mixed';
      statusLabelBn = 'মিশ্র প্রতিক্রিয়া (কিছু এলাকায় বিভ্রাট হতে পারে)';
      statusLabelEn = 'Mixed Reports';
    } else {
      // 1 single report
      status = latestReport.status;
      statusLabelBn = latestReport.status === 'available' ? 'কারেন্ট আছে' : 'কারেন্ট নেই';
      statusLabelEn = latestReport.status === 'available' ? 'Available' : 'Unavailable';
    }
  }

  // Extract distinct recent locality mentions
  const recentLocalities = Array.from(
    new Set(
      recentReports
        .map(r => r.locality)
        .filter(loc => Boolean(loc && loc.trim().length > 0))
    )
  ).slice(0, 5);

  return {
    status,
    statusLabelBn,
    statusLabelEn,
    availableCount,
    unavailableCount,
    totalRecentReports: totalRecentCount,
    freshReportsCount: freshCount,
    totalReportsCountAllTime,
    availablePercentage,
    unavailablePercentage,
    confidence,
    confidenceLabelBn,
    lastReportAt: latestReport ? latestReport.createdAt : null,
    lastReportStatus: latestReport ? latestReport.status : null,
    recentLocalities,
  };
};
