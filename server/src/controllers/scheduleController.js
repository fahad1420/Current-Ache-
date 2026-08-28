import { PowerSchedule } from '../models/PowerSchedule.js';
import { Location } from '../models/Location.js';
import { hashIp } from '../utils/hashIp.js';

/**
 * Calculate trust level and percentage for a schedule
 */
function calculateScheduleTrust(correct, incorrect) {
  const total = correct + incorrect;
  if (total === 0) {
    return {
      percentage: 0,
      totalVotes: 0,
      confidence: 'new', // 'high' | 'medium' | 'low' | 'new'
      confidenceLabelBn: 'নতুন ডাটা — কমিউনিটি যাচাই প্রয়োজন',
      confidenceLabelEn: 'More community verification needed',
    };
  }

  const percentage = Math.round((correct / total) * 100);

  let confidence = 'low';
  let confidenceLabelBn = 'স্বল্প কমিউনিটি যাচাই';
  let confidenceLabelEn = 'Limited community verification';

  if (total >= 10 && percentage >= 80) {
    confidence = 'high';
    confidenceLabelBn = 'উচ্চ কমিউনিটি আস্থা';
    confidenceLabelEn = 'High confidence';
  } else if (total >= 5 && percentage >= 60) {
    confidence = 'medium';
    confidenceLabelBn = 'মাঝারি কমিউনিটি আস্থা';
    confidenceLabelEn = 'Medium confidence';
  }

  return {
    percentage,
    totalVotes: total,
    confidence,
    confidenceLabelBn,
    confidenceLabelEn,
  };
}

/**
 * Get active community power schedules for a specific location
 */
export const getSchedulesByLocation = async (req, res, next) => {
  try {
    const { locationId } = req.params;

    let location;
    if (locationId.match(/^[0-9a-fA-F]{24}$/)) {
      location = await Location.findById(locationId).lean();
    } else {
      location = await Location.findOne({ slug: locationId.toLowerCase(), isActive: true }).lean();
    }

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'এলাকাটি খুঁজে পাওয়া যায়নি।',
        messageEn: 'Location not found.',
      });
    }

    const schedules = await PowerSchedule.find({
      locationId: location._id,
      status: { $in: ['active', 'admin_verified'] },
    })
      .sort({ status: -1, correctVotesCount: -1, createdAt: -1 })
      .lean();

    const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1';
    const ipHash = hashIp(clientIp);

    const formatted = schedules.map((s) => {
      const trust = calculateScheduleTrust(s.correctVotesCount || 0, s.incorrectVotesCount || 0);
      const userVoteObj = (s.votes || []).find((v) => v.ipHash === ipHash);

      return {
        _id: s._id,
        locationId: s.locationId,
        title: s.title || '',
        days: s.days || ['everyday'],
        events: s.events || [],
        status: s.status,
        correctVotesCount: s.correctVotesCount || 0,
        incorrectVotesCount: s.incorrectVotesCount || 0,
        trust,
        userVote: userVoteObj ? userVoteObj.vote : null,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      };
    });

    res.json({
      success: true,
      count: formatted.length,
      location: {
        _id: location._id,
        nameBn: location.nameBn,
        nameEn: location.nameEn,
        divisionBn: location.divisionBn,
        districtBn: location.districtBn,
        slug: location.slug,
      },
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit a new community power schedule
 */
export const createSchedule = async (req, res, next) => {
  try {
    const { locationId, title, events, clientFingerprint } = req.body;

    if (!locationId) {
      return res.status(400).json({
        success: false,
        message: 'এলাকা নির্বাচন করা বাধ্যতামূলক।',
        messageEn: 'Location is required.',
      });
    }

    if (!Array.isArray(events) || events.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'সময়সূচিতে নূন্যতম ২টি সময়ের ধাপ (Time events) থাকা আবশ্যক।',
        messageEn: 'Schedule must contain at least 2 time events.',
      });
    }

    // Validate each event
    const cleanedEvents = [];
    for (const ev of events) {
      const time = (ev.time || '').trim();
      const status = ev.status;
      if (!time || !['available', 'unavailable'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'প্রতিটি ধাপের সঠিক সময় ও স্ট্যাটাস (কারেন্ট আছে/নেই) দেওয়া আবশ্যক।',
          messageEn: 'Each step must have a valid time and status.',
        });
      }
      cleanedEvents.push({
        time,
        status,
        note: (ev.note || '').trim().slice(0, 100),
      });
    }

    const location = await Location.findById(locationId);
    if (!location || !location.isActive) {
      return res.status(404).json({
        success: false,
        message: 'সঠিক এলাকা পাওয়া যায়নি।',
        messageEn: 'Location not found.',
      });
    }

    const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1';
    const ipHash = hashIp(clientIp);

    // Duplicate check: check if an identical schedule events list exists for this location
    const existingSchedules = await PowerSchedule.find({
      locationId: location._id,
      status: { $in: ['active', 'admin_verified'] },
    }).lean();

    const newEventsSignature = cleanedEvents.map((e) => `${e.time.toLowerCase()}_${e.status}`).join('|');
    const isDuplicate = existingSchedules.some((s) => {
      const sig = (s.events || []).map((e) => `${e.time.toLowerCase()}_${e.status}`).join('|');
      return sig === newEventsSignature;
    });

    if (isDuplicate) {
      return res.status(409).json({
        success: false,
        message: 'এই এলাকার জন্য হুবহু একই সময়সূচি ইতিমধ্যে যুক্ত রয়েছে। অনুগ্রহ করে বিদ্যমান সময়সূচিতে ভোট দিন।',
        messageEn: 'An identical schedule already exists for this area. Please verify the existing schedule.',
      });
    }

    const newSchedule = await PowerSchedule.create({
      locationId: location._id,
      title: (title || '').trim().slice(0, 120),
      events: cleanedEvents,
      createdByIpHash: ipHash,
      clientFingerprint: clientFingerprint || '',
      status: 'active',
      correctVotesCount: 1, // Author automatic initial verification
      votes: [{ ipHash, vote: 'correct' }],
    });

    res.status(201).json({
      success: true,
      message: 'সম্ভাব্য বিদ্যুৎ সময়সূচি সফলভাবে প্রকাশ করা হয়েছে।',
      messageEn: 'Community power schedule published successfully.',
      data: newSchedule,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Vote on a community power schedule (Correct vs Incorrect) with auto-invalidation rule
 */
export const voteSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { vote } = req.body; // 'correct' | 'incorrect'

    if (!['correct', 'incorrect'].includes(vote)) {
      return res.status(400).json({
        success: false,
        message: 'ভোট অবশ্যই "correct" অথবা "incorrect" হতে হবে।',
        messageEn: 'Vote must be correct or incorrect.',
      });
    }

    const schedule = await PowerSchedule.findById(id);
    if (!schedule || schedule.status === 'deleted') {
      return res.status(404).json({
        success: false,
        message: 'সময়সূচিটি খুঁজে পাওয়া যায়নি।',
        messageEn: 'Schedule not found.',
      });
    }

    const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1';
    const ipHash = hashIp(clientIp);

    // Check if IP has already voted on this schedule
    const existingVoteIndex = schedule.votes.findIndex((v) => v.ipHash === ipHash);

    if (existingVoteIndex !== -1) {
      const prevVote = schedule.votes[existingVoteIndex].vote;
      if (prevVote === vote) {
        return res.json({
          success: true,
          message: 'আপনি ইতিমধ্যে এই মতামত দিয়েছেন।',
          messageEn: 'You have already recorded this feedback.',
          data: {
            correctVotesCount: schedule.correctVotesCount,
            incorrectVotesCount: schedule.incorrectVotesCount,
            status: schedule.status,
          },
        });
      }

      // Switch vote
      if (prevVote === 'correct') schedule.correctVotesCount = Math.max(0, schedule.correctVotesCount - 1);
      if (prevVote === 'incorrect') schedule.incorrectVotesCount = Math.max(0, schedule.incorrectVotesCount - 1);

      if (vote === 'correct') schedule.correctVotesCount += 1;
      if (vote === 'incorrect') schedule.incorrectVotesCount += 1;

      schedule.votes[existingVoteIndex].vote = vote;
    } else {
      // New vote
      if (vote === 'correct') schedule.correctVotesCount += 1;
      if (vote === 'incorrect') schedule.incorrectVotesCount += 1;

      schedule.votes.push({ ipHash, vote });
    }

    // AUTOMATIC INVALIDATION RULE:
    // If a schedule receives 5 or more valid "ভুল" (incorrect) reports, automatically invalidate it
    if (schedule.incorrectVotesCount >= 5 && schedule.status !== 'admin_verified') {
      schedule.status = 'invalid';
      schedule.invalidatedAt = new Date();
      schedule.invalidReason = `অতিরিক্ত (${schedule.incorrectVotesCount}টি) কমিউনিটি ভুল রিপোর্টের কারণে স্বয়ংক্রিয়ভাবে স্থগিত।`;
    }

    await schedule.save();

    const trust = calculateScheduleTrust(schedule.correctVotesCount, schedule.incorrectVotesCount);

    res.json({
      success: true,
      message: vote === 'correct' ? 'মতামত গৃহীত: সঠিক ✅' : 'মতামত গৃহীত: ভুল ❌',
      messageEn: 'Vote recorded successfully.',
      data: {
        _id: schedule._id,
        status: schedule.status,
        correctVotesCount: schedule.correctVotesCount,
        incorrectVotesCount: schedule.incorrectVotesCount,
        trust,
        userVote: vote,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: View all schedules (active, invalid, admin_verified, deleted)
 */
export const adminGetSchedules = async (req, res, next) => {
  try {
    const { status, locationId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (locationId) filter.locationId = locationId;

    const schedules = await PowerSchedule.find(filter)
      .populate('locationId', 'nameBn nameEn districtBn divisionBn slug')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: schedules.length,
      data: schedules,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Moderation update for schedule
 */
export const adminUpdateSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, events, title } = req.body;

    const schedule = await PowerSchedule.findById(id);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'সময়সূচি পাওয়া যায়নি।',
      });
    }

    if (status && ['active', 'invalid', 'admin_verified', 'deleted'].includes(status)) {
      schedule.status = status;
    }
    if (adminNotes !== undefined) schedule.adminNotes = adminNotes;
    if (title !== undefined) schedule.title = title;
    if (events && Array.isArray(events) && events.length >= 2) {
      schedule.events = events;
    }

    await schedule.save();

    res.json({
      success: true,
      message: 'সময়সূচি সফলভাবে আপডেট করা হয়েছে।',
      data: schedule,
    });
  } catch (error) {
    next(error);
  }
};
