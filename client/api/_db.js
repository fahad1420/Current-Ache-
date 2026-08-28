import mongoose from 'mongoose';
import dns from 'dns';

// Fallback DNS to Google & Cloudflare DNS in case local/lambda DNS fails on SRV
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return null;
  }

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      dbName: process.env.MONGODB_DB_NAME || 'electricity_status_bd',
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      maxPoolSize: 10,
    };
    cached.promise = mongoose
      .connect(uri, opts)
      .then((m) => {
        return m;
      })
      .catch((err) => {
        console.warn('MongoDB Atlas connection notice:', err.message);
        cached.promise = null;
        return null;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    cached.conn = null;
  }

  return cached.conn;
}

// Schemas & Models
const LocationSchema = new mongoose.Schema(
  {
    nameBn: { type: String, required: true },
    nameEn: { type: String, required: true },
    division: { type: String, required: true },
    divisionBn: { type: String, required: true },
    district: { type: String, required: true },
    districtBn: { type: String, required: true },
    upazila: String,
    upazilaBn: String,
    slug: { type: String, required: true, index: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    status: {
      type: String,
      enum: ['available', 'unavailable', 'insufficient_data', 'mixed'],
      default: 'insufficient_data',
      index: true,
    },
    totalRecentReports: { type: Number, default: 0 },
    availablePercentage: { type: Number, default: 0 },
    unavailablePercentage: { type: Number, default: 0 },
    lastReportAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

const ReportSchema = new mongoose.Schema(
  {
    locationId: { type: mongoose.Schema.Types.Mixed, ref: 'Location', required: true },
    status: {
      type: String,
      enum: ['available', 'unavailable'],
      required: true,
      index: true,
    },
    duration: { type: String, default: 'just_now' },
    customMinutes: { type: Number, default: null },
    locality: { type: String, default: '' },
    clientFingerprint: { type: String, default: '' },
    source: { type: String, default: 'web' },
    isFlagged: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const LocationModel =
  mongoose.models.Location || mongoose.model('Location', LocationSchema, 'locations');
export const ReportModel =
  mongoose.models.ElectricityReport ||
  mongoose.model('ElectricityReport', ReportSchema, 'electricityreports');
