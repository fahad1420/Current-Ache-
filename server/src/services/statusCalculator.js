import { ElectricityReport } from '../models/ElectricityReport.js';

/**
 * Calculates real-time electricity status for a given location ID
 * based on community-submitted crowd-sourced reports.
 * 
 * IMPORTANT: Reports do NOT expire after 4 hours.
 * The latest valid report establishes and maintains the active status
 * indefinitely until another report changes it.
 */
export const calculateLocationStatus = async (locationId) => {
  // Fetch all unflagged reports sorted newest first
  const reports = await ElectricityReport.find({
    locationId,
    isFlagged: false,
  }).sort({ createdAt: -1 }).lean();

  const totalReportsCountAllTime = reports.length;

  if (!reports || reports.length === 0) {
    return {
      status: 'insufficient_data', // 'available' | 'unavailable' | 'insufficient_data' | 'mixed'
      statusLabelBn: 'পর্যাপ্ত তথ্য নেই',
      statusLabelEn: 'Insufficient Data',
      availableCount: 0,
      unavailableCount: 0,
      totalRecentReports: 0,
      totalReportsCountAllTime: 0,
      availablePercentage: 0,
      unavailablePercentage: 0,
      confidence: 'none',
      confidenceLabelBn: 'কোনো রিপোর্ট নেই',
      lastReportAt: null,
      lastReportStatus: null,
      recentLocalities: [],
    };
  }

  const latestReport = reports[0];
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Group reports into recent (last 24 hours)
  const recent24h = reports.filter(r => (now - new Date(r.createdAt)) <= 24 * 60 * 60 * 1000);
  const activeReports = recent24h.length > 0 ? recent24h : reports.slice(0, 10);

  let availableScore = 0;
  let unavailableScore = 0;
  let availableCount = 0;
  let unavailableCount = 0;

  activeReports.forEach(r => {
    const isFresh = new Date(r.createdAt) >= oneHourAgo;
    const weight = isFresh ? 1.0 : 0.75;
    if (r.status === 'available') {
      availableScore += weight;
      availableCount++;
    } else {
      unavailableScore += weight;
      unavailableCount++;
    }
  });

  const totalWeight = availableScore + unavailableScore;
  const availablePercentage = totalWeight > 0 ? Math.round((availableScore / totalWeight) * 100) : 0;
  const unavailablePercentage = totalWeight > 0 ? 100 - availablePercentage : 0;

  // Determine Confidence
  let confidence = 'low';
  let confidenceLabelBn = 'কম রিপোর্ট';

  if (activeReports.length >= 5) {
    confidence = 'high';
    confidenceLabelBn = 'অনেক ব্যবহারকারীর রিপোর্ট (উচ্চ নির্ভরতা)';
  } else if (activeReports.length >= 2) {
    confidence = 'medium';
    confidenceLabelBn = 'একাধিক রিপোর্ট';
  } else {
    confidence = 'low';
    confidenceLabelBn = '১টি রিপোর্ট অনুযায়ী';
  }

  // Determine Status: The latest valid report sets the current state indefinitely
  let status = latestReport.status;
  if (activeReports.length >= 3) {
    if (availablePercentage >= 65) status = 'available';
    else if (unavailablePercentage >= 65) status = 'unavailable';
    else status = 'mixed';
  }

  let statusLabelBn = status === 'available' ? 'বর্তমানে কারেন্ট আছে' : status === 'unavailable' ? 'বর্তমানে কারেন্ট নেই' : 'মিশ্র পরিস্থিতি';
  let statusLabelEn = status === 'available' ? 'Electricity Available' : status === 'unavailable' ? 'Electricity Unavailable' : 'Mixed Reports';

  const recentLocalities = Array.from(
    new Set(
      reports
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
    totalRecentReports: activeReports.length,
    totalReportsCountAllTime,
    availablePercentage,
    unavailablePercentage,
    confidence,
    confidenceLabelBn,
    lastReportAt: latestReport.createdAt,
    lastReportStatus: latestReport.status,
    recentLocalities,
  };
};
