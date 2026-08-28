import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { connectToDatabase, LocationModel, ReportModel } from './_db.js';

import { defaultLocations } from './_locations.js';

// Fallback in-memory reports if MongoDB is connecting
let fallbackReports = [
  {
    _id: 'rep_init_1',
    location: { nameBn: 'মিরপুর', nameEn: 'Mirpur', districtBn: 'ঢাকা', district: 'Dhaka', divisionBn: 'ঢাকা', division: 'Dhaka' },
    locationId: { nameBn: 'মিরপুর', nameEn: 'Mirpur', districtBn: 'ঢাকা', district: 'Dhaka', divisionBn: 'ঢাকা', division: 'Dhaka' },
    status: 'available',
    locality: 'সেক্টর ১',
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    _id: 'rep_init_2',
    location: { nameBn: 'উত্তরা', nameEn: 'Uttara', districtBn: 'ঢাকা', district: 'Dhaka', divisionBn: 'ঢাকা', division: 'Dhaka' },
    locationId: { nameBn: 'উত্তরা', nameEn: 'Uttara', districtBn: 'ঢাকা', district: 'Dhaka', divisionBn: 'ঢাকা', division: 'Dhaka' },
    status: 'available',
    locality: 'সেক্টর ৭',
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
  },
];

// Helper to parse request body in serverless
export async function parseRequestBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (req.body && typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (e) {
      return {};
    }
  }
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

// Simple secure JWT generator
function generateToken(payload, secret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 7 * 86400 })
  ).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export async function handleApiRequest(req, res) {
  if (!res.status) {
    res.status = function (code) {
      this.statusCode = code;
      return this;
    };
  }
  if (!res.json) {
    res.json = function (body) {
      this.setHeader('Content-Type', 'application/json; charset=utf-8');
      this.end(JSON.stringify(body));
      return this;
    };
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawUrl = req.url || '/';
  const urlObj = new URL(rawUrl, `http://${req.headers['host'] || 'localhost'}`);
  let pathname = urlObj.pathname.replace(/^\/api/, '').replace(/\/$/, '');
  if (!pathname || pathname === '') pathname = '/';

  // Ensure DB connection
  let db = null;
  try {
    db = await connectToDatabase();
  } catch (e) {}

  try {
    // 1. Health check
    if (pathname === '/health' || pathname === '/') {
      let dbCount = 0;
      if (db) {
        try {
          dbCount = await ReportModel.countDocuments();
        } catch (e) {}
      }
      return res.status(200).json({
        status: 'ok',
        service: 'Electricity Status BD API (কারেন্ট আছে?)',
        database: db ? 'MongoDB Atlas Connected' : 'Fallback Local Dataset',
        locationsCount: defaultLocations.length,
        reportsCount: dbCount || fallbackReports.length,
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Admin Authentication (POST /api/admin, /api/admin/login, /api/auth, /api/auth/login)
    if (
      (pathname.startsWith('/admin') || pathname.startsWith('/auth')) &&
      req.method === 'POST'
    ) {
      const body = await parseRequestBody(req);
      const { username, password } = body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'ব্যবহারকারীর নাম ও পাসওয়ার্ড প্রদান করুন।',
          messageEn: 'Username and password required.',
        });
      }

      const envUser = process.env.ADMIN_USERNAME || 'admin';
      const envPass = process.env.ADMIN_PASSWORD || 'currentBD2026!';
      const jwtSecret = process.env.JWT_SECRET || 'electricity-status-bd-super-secret-jwt-key-2026';

      if (username === envUser && password === envPass) {
        const token = generateToken({ username, role: 'admin' }, jwtSecret);
        return res.status(200).json({
          success: true,
          message: 'লগইন সফল হয়েছে।',
          token,
          admin: {
            username,
            role: 'admin',
          },
        });
      } else {
        return res.status(401).json({
          success: false,
          message: 'ভুল ব্যবহারকারীর নাম অথবা পাসওয়ার্ড।',
          messageEn: 'Invalid username or password.',
        });
      }
    }

    // 3. Admin Reports Inspection (GET /api/admin/reports or GET /api/admin?type=reports)
    if (pathname.startsWith('/admin') && req.method === 'GET') {
      let reports = [];
      if (db) {
        try {
          reports = await ReportModel.find().sort({ createdAt: -1 }).limit(100).populate('locationId').lean();
        } catch (e) {
          reports = fallbackReports;
        }
      } else {
        reports = fallbackReports;
      }
      return res.status(200).json({
        success: true,
        total: reports.length,
        page: 1,
        pages: 1,
        data: reports,
      });
    }

    // 4. Reports: Submit (POST /api/reports or POST /api/reports/index)
    if (pathname.startsWith('/reports') && req.method === 'POST') {
      const body = await parseRequestBody(req);
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
        locality,
        customMinutes,
      } = body;

      if (!locationId && (!latitude || !longitude) && !locationName) {
        return res.status(400).json({
          success: false,
          message: 'এলাকা নির্বাচন করা বাধ্যতামূলক।',
          messageEn: 'Location required.',
        });
      }

      let matched = defaultLocations.find(
        (l) =>
          l._id === locationId ||
          l.slug === locationId ||
          (locationName && (l.nameBn === locationName || l.nameEn === locationName))
      );

      // If user reported from GPS coordinates outside existing 593:
      if (!matched && (isGpsCustom || (latitude && longitude))) {
        matched = {
          _id: locationId || `gps_${Date.now()}`,
          nameBn: locationName || `ম্যাপ অবস্থান`,
          nameEn: locationName || `Map Location`,
          district: district || 'বাংলাদেশ',
          districtBn: district || 'বাংলাদেশ',
          division: division || 'Dhaka',
          divisionBn: division || 'ঢাকা',
          slug: `gps-${Number(latitude).toFixed(4)}-${Number(longitude).toFixed(4)}`,
          latitude: Number(latitude) || 23.8103,
          longitude: Number(longitude) || 90.4125,
          status: status || 'available',
          totalRecentReports: 1,
          availablePercentage: status === 'available' ? 100 : 0,
          unavailablePercentage: status === 'unavailable' ? 100 : 0,
          lastReportAt: new Date().toISOString(),
        };
        defaultLocations.push(matched);
      } else if (matched) {
        // PERMANENT STATUS UPDATE: The latest valid community report sets active status indefinitely
        matched.status = status || 'available';
        matched.lastReportAt = new Date().toISOString();
        matched.totalRecentReports = (matched.totalRecentReports || 0) + 1;
        if (status === 'available') {
          matched.availablePercentage = 100;
          matched.unavailablePercentage = 0;
        } else {
          matched.availablePercentage = 0;
          matched.unavailablePercentage = 100;
        }
      }

      // Resolve Location in MongoDB Atlas
      let dbLocationId = null;
      if (db && matched) {
        try {
          let locDoc = null;
          if (locationId && mongoose.isValidObjectId(locationId)) {
            locDoc = await LocationModel.findById(locationId);
          }
          if (!locDoc && matched.slug) {
            locDoc = await LocationModel.findOne({ slug: matched.slug });
          }
          if (!locDoc && matched.nameBn) {
            locDoc = await LocationModel.findOne({ nameBn: matched.nameBn });
          }
          if (!locDoc) {
            locDoc = await LocationModel.create({
              nameBn: matched.nameBn,
              nameEn: matched.nameEn || matched.nameBn,
              division: matched.division || 'Dhaka',
              divisionBn: matched.divisionBn || 'ঢাকা',
              district: matched.district || 'ঢাকা',
              districtBn: matched.districtBn || 'ঢাকা',
              slug: matched.slug || `loc-${Date.now()}`,
              latitude: matched.latitude || 23.8103,
              longitude: matched.longitude || 90.4125,
              status: status || 'available',
              isActive: true,
            });
          }

          if (locDoc) {
            dbLocationId = locDoc._id;
            await LocationModel.findByIdAndUpdate(locDoc._id, {
              status: status || 'available',
              lastReportAt: new Date(),
              $inc: { totalRecentReports: 1 },
            });
          }
        } catch (dbErr) {
          console.warn('Location resolution in MongoDB error:', dbErr.message);
        }
      }

      // Save report in MongoDB Atlas ALWAYS when db is connected
      let savedReport = null;
      if (db) {
        try {
          savedReport = await ReportModel.create({
            locationId: dbLocationId || matched?._id || matched?.slug || 'unknown',
            status: status || 'available',
            duration: duration || 'just_now',
            customMinutes: customMinutes || null,
            locality: locality || '',
            createdAt: new Date(),
          });
        } catch (dbErr) {
          console.warn('Report write in MongoDB error:', dbErr.message);
        }
      }

      const formattedLocation = {
        _id: matched?._id || dbLocationId,
        nameBn: matched?.nameBn || locationName || 'এলাকা',
        nameEn: matched?.nameEn || locationName || 'Area',
        districtBn: matched?.districtBn || 'ঢাকা',
        district: matched?.district || 'Dhaka',
        divisionBn: matched?.divisionBn || 'ঢাকা',
        division: matched?.division || 'Dhaka',
        slug: matched?.slug || '',
      };

      const newReportEntry = {
        id: savedReport?._id ? String(savedReport._id) : `rep_${Date.now()}`,
        _id: savedReport?._id ? String(savedReport._id) : `rep_${Date.now()}`,
        location: formattedLocation,
        locationId: formattedLocation,
        status: status || 'available',
        duration: duration || 'just_now',
        customMinutes: customMinutes || null,
        locality: locality || '',
        createdAt: new Date().toISOString(),
      };

      fallbackReports.unshift(newReportEntry);
      if (fallbackReports.length > 500) fallbackReports.pop();

      return res.status(201).json({
        success: true,
        message: 'ধন্যবাদ! আপনার রিপোর্টটি সফলভাবে গ্রহণ করা হয়েছে।',
        data: newReportEntry,
      });
    }

    // 5. Reports: Recent ticker (GET /api/reports/recent or GET /api/reports)
    if (pathname.startsWith('/reports') && req.method === 'GET') {
      let rawReports = [];
      if (db) {
        try {
          rawReports = await ReportModel.find({ isFlagged: false })
            .sort({ createdAt: -1 })
            .limit(30)
            .populate('locationId')
            .lean();
        } catch (e) {
          rawReports = fallbackReports;
        }
      }
      if (!rawReports || rawReports.length === 0) {
        rawReports = fallbackReports;
      }

      // Build DB location lookup map
      let dbLocationsMap = new Map();
      if (db) {
        try {
          const allDbLocs = await LocationModel.find().lean();
          allDbLocs.forEach((l) => {
            dbLocationsMap.set(String(l._id), l);
            if (l.slug) dbLocationsMap.set(l.slug, l);
          });
        } catch (e) {}
      }

      // Populate full location metadata for every report
      const enrichedReports = rawReports.map((r) => {
        let locObj = null;
        if (r.location && typeof r.location === 'object' && (r.location.nameBn || r.location.nameEn)) {
          locObj = r.location;
        } else if (r.locationId && typeof r.locationId === 'object' && (r.locationId.nameBn || r.locationId.nameEn)) {
          locObj = {
            _id: r.locationId._id,
            nameBn: r.locationId.nameBn,
            nameEn: r.locationId.nameEn,
            districtBn: r.locationId.districtBn,
            district: r.locationId.district,
            divisionBn: r.locationId.divisionBn,
            division: r.locationId.division,
            slug: r.locationId.slug,
          };
        } else if (r.locationId) {
          const locStr = String(r.locationId);
          const fromDb = dbLocationsMap.get(locStr);
          if (fromDb) {
            locObj = {
              _id: fromDb._id,
              nameBn: fromDb.nameBn,
              nameEn: fromDb.nameEn,
              districtBn: fromDb.districtBn,
              district: fromDb.district,
              divisionBn: fromDb.divisionBn,
              division: fromDb.division,
              slug: fromDb.slug,
            };
          } else {
            const found = defaultLocations.find((l) => l._id === locStr || l.slug === locStr);
            if (found) {
              locObj = {
                _id: found._id,
                nameBn: found.nameBn,
                nameEn: found.nameEn,
                districtBn: found.districtBn,
                district: found.district,
                divisionBn: found.divisionBn,
                division: found.division,
                slug: found.slug,
              };
            }
          }
        }

        if (!locObj) {
          locObj = { nameBn: 'এলাকা', nameEn: 'Area', districtBn: 'ঢাকা', district: 'Dhaka' };
        }

        return {
          id: String(r._id),
          _id: String(r._id),
          status: r.status,
          duration: r.duration,
          locality: r.locality || '',
          createdAt: r.createdAt,
          location: locObj,
          locationId: locObj,
        };
      });

      return res.status(200).json({
        success: true,
        count: enrichedReports.length,
        data: enrichedReports.slice(0, 20),
      });
    }

    // 6. Locations: Map Status & Search (GET /api/locations/map-status or GET /api/locations)
    if (pathname.startsWith('/locations') && req.method === 'GET') {
      const q = (urlObj.searchParams.get('q') || '').toLowerCase().trim();
      if (q) {
        const results = defaultLocations
          .filter(
            (loc) =>
              loc.nameBn?.toLowerCase().includes(q) ||
              loc.nameEn?.toLowerCase().includes(q) ||
              loc.district?.toLowerCase().includes(q) ||
              loc.districtBn?.includes(q) ||
              loc.division?.toLowerCase().includes(q) ||
              loc.divisionBn?.includes(q) ||
              (loc.upazila && loc.upazila.toLowerCase().includes(q))
          )
          .slice(0, 15);
        return res.status(200).json({ success: true, count: results.length, data: results });
      }

      if (db) {
        try {
          const dbLocations = await LocationModel.find({ isActive: true }).lean();
          if (dbLocations && dbLocations.length > 0) {
            const dbMap = new Map(dbLocations.map((l) => [l.slug || String(l._id), l]));
            defaultLocations.forEach((loc) => {
              const fromDb = dbMap.get(loc.slug) || dbMap.get(String(loc._id));
              if (fromDb && fromDb.lastReportAt) {
                loc.status = fromDb.status;
                loc.lastReportAt = fromDb.lastReportAt;
                loc.totalRecentReports = fromDb.totalRecentReports;
              }
            });
          }
        } catch (e) {}
      }

      let availableSummary = 0;
      let unavailableSummary = 0;
      let insufficientSummary = 0;

      defaultLocations.forEach((loc) => {
        if (loc.status === 'available') availableSummary++;
        else if (loc.status === 'unavailable') unavailableSummary++;
        else insufficientSummary++;
      });

      return res.status(200).json({
        success: true,
        count: defaultLocations.length,
        summary: {
          total: defaultLocations.length,
          available: availableSummary,
          unavailable: unavailableSummary,
          insufficient: insufficientSummary,
        },
        data: defaultLocations,
      });
    }

    // 7. Stats
    if (pathname.startsWith('/stats')) {
      const availCount = defaultLocations.filter((l) => l.status === 'available').length;
      const unavailCount = defaultLocations.filter((l) => l.status === 'unavailable').length;

      return res.status(200).json({
        success: true,
        data: {
          totalReportsToday: fallbackReports.length,
          activeAreasCount: defaultLocations.length,
          areasAvailableCount: availCount,
          areasUnavailableCount: unavailCount,
          topOutageAreas: [],
        },
      });
    }

    return res.status(200).json({
      success: true,
      service: 'Electricity Status BD API',
      locations: defaultLocations.length,
    });
  } catch (err) {
    console.error('API Handler Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
