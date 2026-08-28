import { ElectricityReport } from '../models/ElectricityReport.js';
import { Location } from '../models/Location.js';
import { hashIp } from '../utils/hashIp.js';
import { checkReportCooldown } from '../services/spamProtection.js';
import { calculateLocationStatus } from '../services/statusCalculator.js';

/**
 * Submit an electricity report (available or unavailable)
 */
export const createReport = async (req, res, next) => {
  try {
    const { locationId, status, duration, customMinutes, locality, clientFingerprint, source } = req.body;

    // Validation
    if (!locationId) {
      return res.status(400).json({
        success: false,
        message: 'এলাকা নির্বাচন করা বাধ্যতামূলক।',
        messageEn: 'Location ID is required.',
      });
    }

    if (!['available', 'unavailable'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'স্ট্যাটাস অবশ্যই "available" অথবা "unavailable" হতে হবে।',
        messageEn: 'Invalid status value.',
      });
    }

    // Validate customMinutes
    let validatedCustomMinutes = null;
    if (duration === 'custom') {
      const parsed = parseInt(customMinutes, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 2880) {
        validatedCustomMinutes = parsed;
      } else {
        validatedCustomMinutes = 10;
      }
    }

    // Verify location exists
    const location = await Location.findById(locationId);
    if (!location || !location.isActive) {
      return res.status(404).json({
        success: false,
        message: 'সঠিক এলাকা পাওয়া যায়নি বা এটি নিষ্ক্রিয় রয়েছে।',
        messageEn: 'Location not found or inactive.',
      });
    }

    // Extract IP and hash it
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1';
    const ipHash = hashIp(clientIp);

    // Spam / Cooldown protection
    const cooldownCheck = await checkReportCooldown(locationId, ipHash);
    if (!cooldownCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: `আপনি সম্প্রতি এই এলাকার জন্য রিপোর্ট করেছেন। অনুগ্রহ করে আরও ${cooldownCheck.minutesRemaining} মিনিট অপেক্ষা করুন।`,
        messageEn: `You recently reported for this area. Please wait ${cooldownCheck.minutesRemaining} more minutes.`,
        cooldownRemainingMinutes: cooldownCheck.minutesRemaining,
      });
    }

    // Create Report
    const cleanLocality = (locality || '').trim().slice(0, 100);

    const newReport = await ElectricityReport.create({
      locationId,
      status,
      duration: duration || 'just_now',
      customMinutes: validatedCustomMinutes,
      locality: cleanLocality,
      ipHash,
      clientFingerprint: clientFingerprint || '',
      source: source === 'mobile_web' ? 'mobile_web' : 'web',
    });

    // Calculate immediate updated status for instant frontend update
    const updatedStatus = await calculateLocationStatus(locationId);

    res.status(201).json({
      success: true,
      message: 'ধন্যবাদ! আপনার এলাকার বিদ্যুতের অবস্থা সফলভাবে রেকর্ড করা হয়েছে।',
      messageEn: 'Thank you! Your electricity status report has been recorded.',
      data: {
        reportId: newReport._id,
        location: {
          _id: location._id,
          nameBn: location.nameBn,
          nameEn: location.nameEn,
          divisionBn: location.divisionBn,
          districtBn: location.districtBn,
        },
        status: updatedStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get nationwide recent reports stream (live community feed)
 */
export const getRecentReports = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);

    const reports = await ElectricityReport.find({ isFlagged: false })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('locationId', 'nameBn nameEn divisionBn division districtBn district upazilaBn upazila slug')
      .lean();

    // Sanitize response to ensure NO IP or personal info is ever leaked
    const sanitizedReports = reports
      .filter(r => r.locationId)
      .map(r => ({
        id: r._id,
        status: r.status,
        duration: r.duration,
        customMinutes: r.customMinutes,
        locality: r.locality || '',
        createdAt: r.createdAt,
        location: {
          id: r.locationId._id,
          nameBn: r.locationId.nameBn,
          nameEn: r.locationId.nameEn,
          divisionBn: r.locationId.divisionBn,
          districtBn: r.locationId.districtBn,
          slug: r.locationId.slug,
        }
      }));

    res.json({
      success: true,
      count: sanitizedReports.length,
      data: sanitizedReports,
    });
  } catch (error) {
    next(error);
  }
};
