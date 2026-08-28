import mongoose from 'mongoose';

const electricityReportSchema = new mongoose.Schema(
  {
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: [true, 'Location ID is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['available', 'unavailable'],
      required: [true, 'Status is required (available or unavailable)'],
      index: true,
    },
    duration: {
      type: String,
      default: 'just_now',
    },
    customMinutes: {
      type: Number,
      default: null,
    },
    locality: {
      type: String,
      trim: true,
      maxLength: 120,
      default: '',
    },
    ipHash: {
      type: String,
      required: true,
      index: true,
    },
    clientFingerprint: {
      type: String,
      default: '',
      index: true,
    },
    source: {
      type: String,
      enum: ['web', 'mobile_web'],
      default: 'web',
    },
    isFlagged: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound indexes for fast aggregations and anti-spam checks
electricityReportSchema.index({ locationId: 1, createdAt: -1 });
electricityReportSchema.index({ locationId: 1, ipHash: 1, createdAt: -1 });
electricityReportSchema.index({ createdAt: -1 });

export const ElectricityReport = mongoose.model('ElectricityReport', electricityReportSchema);
