import mongoose from 'mongoose';

const scheduleEventSchema = new mongoose.Schema(
  {
    time: {
      type: String,
      required: [true, 'Event time is required (e.g. 01:00 PM)'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['available', 'unavailable'],
      required: [true, 'Event status is required (available or unavailable)'],
    },
    note: {
      type: String,
      trim: true,
      maxLength: 100,
      default: '',
    },
  },
  { _id: false }
);

const scheduleVoteSchema = new mongoose.Schema(
  {
    ipHash: {
      type: String,
      required: true,
    },
    vote: {
      type: String,
      enum: ['correct', 'incorrect'],
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const powerScheduleSchema = new mongoose.Schema(
  {
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: [true, 'Location ID is required'],
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxLength: 120,
      default: '',
    },
    days: {
      type: [String],
      default: ['everyday'], // 'everyday', 'weekdays', 'friday', etc.
    },
    events: {
      type: [scheduleEventSchema],
      validate: [
        (val) => val && val.length >= 2,
        'Schedule must contain at least 2 time events',
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'invalid', 'admin_verified', 'deleted'],
      default: 'active',
      index: true,
    },
    correctVotesCount: {
      type: Number,
      default: 0,
    },
    incorrectVotesCount: {
      type: Number,
      default: 0,
    },
    votes: {
      type: [scheduleVoteSchema],
      default: [],
    },
    createdByIpHash: {
      type: String,
      required: true,
      index: true,
    },
    clientFingerprint: {
      type: String,
      default: '',
    },
    invalidatedAt: {
      type: Date,
      default: null,
    },
    invalidReason: {
      type: String,
      default: '',
    },
    adminNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

powerScheduleSchema.index({ locationId: 1, status: 1, createdAt: -1 });

export const PowerSchedule = mongoose.model('PowerSchedule', powerScheduleSchema);
