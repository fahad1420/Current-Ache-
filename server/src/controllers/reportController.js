import mongoose from 'mongoose';
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
    const {
      locationId,
      locationName,
      district,
      division,
      latitude,
      longitude,
      isGpsCustom,
      status,
      duration,
      customMinutes,
      locality,
      clientFingerprint,
      source,
    } = req.body;

    // Validation
    if (!locationId && (!latitude || !longitude)) {
      return res.status(400).json({
        success: false,
        message: 'এলাকা নির্বাচন করা বাধ্যতামূলক।',
        messageEn: 'Location ID or coordinates required.',
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

    // Robust Location Resolution (ById, BySlug, ByCoordinates, or Create New)
    let location = null;

    if (locationId && mongoose.isValidObjectId(locationId)) {
      location = await Location.findById(locationId);
    }

    if (!location && locationId) {
      location = await Location.findOne({
        $or: [{ slug: locationId }, { nameEn: locationId }, { nameBn: locationId }],
      });
    }

    // If still not found and coordinates exist (GPS / Map-Click):
    if (!location && (latitude || longitude || isGpsCustom)) {
      const parsedLat = parseFloat(latitude) || 23.8103;
      const parsedLng = parseFloat(longitude) || 90.4125;
      const generatedSlug = `loc-${parsedLat.toFixed(4)}-${parsedLng.toFixed(4)}`;

      location = await Location.findOne({ slug: generatedSlug });
      if (!location) {
        location = await Location.create({
          nameBn: locationName || `এলাকা (${parsedLat.toFixed(2)}, ${parsedLng.toFixed(2)})`,
          nameEn: locationName || `Area (${parsedLat.toFixed(2)}, ${parsedLng.toFixed(2)})`,
          division: division || 'Dhaka',
          divisionBn: division === 'Chattogram' ? 'চট্টগ্রাম' : 'ঢাকা',
          district: district || 'ঢাকা',
          districtBn: district || 'ঢাকা',
          slug: generatedSlug,
          latitude: parsedLat,
          longitude: parsedLng,
          type: 'custom',
          isActive: true,
          status: status,
        });
      }
    }

    if (!location) {
      // Fallback: lookup default location or create
      location = await Location.findOne({ isActive: true });
    }

    if (!location) {
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
    const cooldownCheck = await checkReportCooldown(String(location._id), ipHash);
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
      locationId: location._id,
      status,
      duration: duration || 'just_now',
      customMinutes: validatedCustomMinutes,
      locality: cleanLocality,
      ipHash,
      clientFingerprint: clientFingerprint || '',
      source: source === 'mobile_web' ? 'mobile_web' : 'web',
    });

    // Update location status in database indefinitely
    await Location.findByIdAndUpdate(location._id, {
      status: status,
      lastReportAt: new Date(),
    });

    // Calculate immediate updated status
    const updatedStatus = await calculateLocationStatus(location._id);

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
    console.error('createReport error:', error);
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
        },
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
