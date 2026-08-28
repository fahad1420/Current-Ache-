import jwt from 'jsonwebtoken';
import { AdminUser } from '../models/AdminUser.js';
import { ElectricityReport } from '../models/ElectricityReport.js';
import { Location } from '../models/Location.js';

/**
 * Admin Login
 */
export const adminLogin = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'ব্যবহারকারীর নাম ও পাসওয়ার্ড প্রদান করুন।',
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    const envAdminUser = process.env.ADMIN_USERNAME;
    const envAdminPass = process.env.ADMIN_PASSWORD;

    if (!jwtSecret || !envAdminUser || !envAdminPass) {
      throw new Error('FATAL CONFIGURATION ERROR: ADMIN_USERNAME, ADMIN_PASSWORD, and JWT_SECRET are required environment variables.');
    }

    let isValid = false;
    let userRole = 'admin';
    let adminId = 'admin_user';

    // 1. Check database admin user first
    const dbAdmin = await AdminUser.findOne({ username: username.toLowerCase() });
    if (dbAdmin) {
      isValid = await dbAdmin.comparePassword(password);
      userRole = dbAdmin.role;
      adminId = dbAdmin._id;
    } else if (username === envAdminUser && password === envAdminPass) {
      isValid = true;
    }

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'ভুল ব্যবহারকারীর নাম অথবা পাসওয়ার্ড।',
        messageEn: 'Invalid username or password.',
      });
    }

    const token = jwt.sign(
      { id: adminId, username, role: userRole },
      jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'লগইন সফল হয়েছে।',
      token,
      admin: {
        username,
        role: userRole,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get reports for admin inspection
 */
export const getAdminReports = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '30', 10), 100);
    const status = req.query.status;
    const isFlagged = req.query.isFlagged;

    const query = {};
    if (status) query.status = status;
    if (isFlagged !== undefined) query.isFlagged = isFlagged === 'true';

    const total = await ElectricityReport.countDocuments(query);
    const reports = await ElectricityReport.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('locationId', 'nameBn nameEn districtBn divisionBn')
      .lean();

    res.json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: reports,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a fraudulent report
 */
export const deleteReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await ElectricityReport.findByIdAndDelete(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'রিপোর্টটি পাওয়া যায়নি।',
      });
    }

    res.json({
      success: true,
      message: 'রিপোর্টটি সফলভাবে মুছে ফেলা হয়েছে।',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle flagged status of a report
 */
export const toggleFlagReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await ElectricityReport.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'রিপোর্ট পাওয়া যায়নি।',
      });
    }

    report.isFlagged = !report.isFlagged;
    await report.save();

    res.json({
      success: true,
      message: report.isFlagged ? 'রিপোর্টটি ফ্ল্যাগ করা হয়েছে।' : 'রিপোর্ট আনফ্ল্যাগ করা হয়েছে।',
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle active status of a location
 */
export const toggleLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const location = await Location.findById(id);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'এলাকা পাওয়া যায়নি।',
      });
    }

    location.isActive = !location.isActive;
    await location.save();

    res.json({
      success: true,
      message: `এলাকাটি ${location.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে।`,
      data: location,
    });
  } catch (error) {
    next(error);
  }
};
