import mongoose from 'mongoose';
import dns from 'dns';

/**
 * Configure trusted public DNS resolvers by default in local environments
 */
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  // Ignored in restricted environments
}

/**
 * Global cache for MongoDB connection across serverless / watch reloads
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export const maskMongoUri = (uri = '') => {
  if (!uri) return '[EMPTY_URI]';
  return uri.replace(/\/\/(.*?)@/, '//***:***@');
};

export const connectDB = async () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const uri = process.env.MONGODB_URI;

  if (!uri && isProduction) {
    throw new Error('FATAL CONFIGURATION ERROR: MONGODB_URI environment variable is required in production.');
  }

  const connectionUri = uri || 'mongodb://127.0.0.1:27017/electricity_status_bd';

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: true,
      serverSelectionTimeoutMS: 10000,
      autoIndex: !isProduction,
      dbName: process.env.MONGODB_DB_NAME || 'electricity_status_bd',
    };

    cached.promise = mongoose.connect(connectionUri, opts).then((m) => {
      console.log(`[MongoDB] Connected: ${m.connection.host}/${m.connection.name}`);
      return m;
    }).catch((err) => {
      console.error(`[MongoDB Connection Error]: ${err.message}`);
      cached.promise = null;
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
};
