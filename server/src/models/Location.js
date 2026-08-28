import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema(
  {
    nameBn: {
      type: String,
      required: [true, 'Bengali name is required'],
      trim: true,
      index: true,
    },
    nameEn: {
      type: String,
      required: [true, 'English name is required'],
      trim: true,
      index: true,
    },
    division: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    divisionBn: {
      type: String,
      required: true,
      trim: true,
    },
    district: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    districtBn: {
      type: String,
      required: true,
      trim: true,
    },
    upazila: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    upazilaBn: {
      type: String,
      trim: true,
      default: '',
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    latitude: {
      type: Number,
      required: true,
      default: 23.6850,
      index: true,
    },
    longitude: {
      type: Number,
      required: true,
      default: 90.3563,
      index: true,
    },
    type: {
      type: String,
      enum: ['division', 'district', 'upazila', 'thana', 'locality'],
      default: 'upazila',
    },
    parentLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    popularPriority: {
      type: Number,
      default: 0,
    }
  },
  {
    timestamps: true,
  }
);

// Compound text index for fast search in Bangla or English
locationSchema.index({
  nameBn: 'text',
  nameEn: 'text',
  divisionBn: 'text',
  division: 'text',
  districtBn: 'text',
  district: 'text',
  upazilaBn: 'text',
  upazila: 'text',
});

// Common filter compound indexes
locationSchema.index({ division: 1, district: 1 });
locationSchema.index({ slug: 1, isActive: 1 });
locationSchema.index({ latitude: 1, longitude: 1 });

export const Location = mongoose.model('Location', locationSchema);
