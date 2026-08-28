import crypto from 'crypto';
import mongoose from 'mongoose';
import { connectToDatabase, LocationModel, ReportModel, ScheduleModel } from './_db.js';
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
      (pathname === '/admin' || pathname === '/admin/login' || pathname === '/auth' || pathname === '/auth/login') &&
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

    // 3. Admin Reports Inspection (GET /api/admin, /api/admin/reports, /api/admin?type=reports)
    if (pathname.startsWith('/admin') && req.method === 'GET') {
      const page = parseInt(urlObj.searchParams.get('page') || '1', 10);
      const limit = parseInt(urlObj.searchParams.get('limit') || '50', 10);
      const statusFilter = urlObj.searchParams.get('status');

      let rawReports = [];
      let total = 0;

      if (db) {
        try {
          const filter = {};
          if (statusFilter && (statusFilter === 'available' || statusFilter === 'unavailable')) {
            filter.status = statusFilter;
          }
          total = await ReportModel.countDocuments(filter);
          rawReports = await ReportModel.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        } catch (e) {
          rawReports = fallbackReports;
          total = fallbackReports.length;
        }
      } else {
        rawReports = fallbackReports;
        total = fallbackReports.length;
      }

      // Build location lookup map safely
      let dbLocationsMap = new Map();
      if (db) {
        try {
          const allDbLocs = await LocationModel.find().lean();
          allDbLocs.forEach((l) => {
            dbLocationsMap.set(String(l._id), l);
            if (l.slug) dbLocationsMap.set(l.slug, l);
            if (l.nameBn) dbLocationsMap.set(l.nameBn, l);
          });
        } catch (e) {}
      }

      // Enrich location info for admin table
      const enriched = rawReports.map((r) => {
        let locObj = null;
        if (r.location && typeof r.location === 'object' && r.location.nameBn) {
          locObj = r.location;
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
            };
          } else {
            const found = defaultLocations.find((l) => l._id === locStr || l.slug === locStr || l.nameBn === locStr);
            if (found) {
              locObj = {
                _id: found._id,
                nameBn: found.nameBn,
                nameEn: found.nameEn,
                districtBn: found.districtBn,
                district: found.district,
                divisionBn: found.divisionBn,
                division: found.division,
              };
            }
          }
        }
        if (!locObj) {
          locObj = { nameBn: 'এলাকা', nameEn: 'Area', districtBn: 'ঢাকা', district: 'Dhaka', divisionBn: 'ঢাকা', division: 'Dhaka' };
        }

        return {
          _id: String(r._id),
          id: String(r._id),
          locationId: locObj,
          location: locObj,
          status: r.status,
          duration: r.duration,
          locality: r.locality || '',
          isFlagged: Boolean(r.isFlagged),
          createdAt: r.createdAt,
          ipHash: r.clientFingerprint || 'anon_hash',
        };
      });

      return res.status(200).json({
        success: true,
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
        data: enriched,
      });
    }

    // 3B. Admin Report Actions (DELETE & PATCH flag)
    if (pathname.startsWith('/admin/reports/') && req.method === 'DELETE') {
      const repId = pathname.replace('/admin/reports/', '');
      if (db && mongoose.isValidObjectId(repId)) {
        await ReportModel.findByIdAndDelete(repId);
      }
      return res.status(200).json({ success: true, message: 'রিপোর্ট মুছে ফেলা হয়েছে।' });
    }

    if (pathname.startsWith('/admin/reports/') && pathname.endsWith('/flag') && req.method === 'PATCH') {
      const repId = pathname.replace('/admin/reports/', '').replace('/flag', '');
      if (db && mongoose.isValidObjectId(repId)) {
        const doc = await ReportModel.findById(repId);
        if (doc) {
          doc.isFlagged = !doc.isFlagged;
          await doc.save();
          return res.status(200).json({ success: true, message: doc.isFlagged ? 'রিপোর্ট ফ্ল্যাগ করা হয়েছে' : 'ফ্ল্যাগ সরানো হয়েছে' });
        }
      }
      return res.status(200).json({ success: true, message: 'স্ট্যাটাস পরিবর্তিত হয়েছে' });
    }

    // 4. Reports: Submit (POST /api/reports)
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

      // Save report in MongoDB Atlas ALWAYS
      let savedReport = null;
      if (db) {
        try {
          savedReport = await ReportModel.create({
            locationId: dbLocationId || matched?._id || matched?.slug || 'unknown',
            status: status || 'available',
            duration: duration || 'just_now',
            customMinutes: customMinutes || null,
            locality: locality || '',
            isFlagged: false,
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

    // 5. Reports: Recent ticker / feed (GET /api/reports/recent or GET /api/reports)
    if (pathname.startsWith('/reports') && req.method === 'GET') {
      let rawReports = [];
      let totalCount = 0;

      if (db) {
        try {
          totalCount = await ReportModel.countDocuments({ isFlagged: { $ne: true } });
          rawReports = await ReportModel.find({ isFlagged: { $ne: true } })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
        } catch (e) {
          rawReports = fallbackReports;
          totalCount = fallbackReports.length;
        }
      } else {
        rawReports = fallbackReports;
        totalCount = fallbackReports.length;
      }

      let dbLocationsMap = new Map();
      if (db) {
        try {
          const allDbLocs = await LocationModel.find().lean();
          allDbLocs.forEach((l) => {
            dbLocationsMap.set(String(l._id), l);
            if (l.slug) dbLocationsMap.set(l.slug, l);
            if (l.nameBn) dbLocationsMap.set(l.nameBn, l);
          });
        } catch (e) {}
      }

      const enrichedReports = rawReports.map((r) => {
        let locObj = null;
        if (r.location && typeof r.location === 'object' && (r.location.nameBn || r.location.nameEn)) {
          locObj = r.location;
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
            const found = defaultLocations.find((l) => l._id === locStr || l.slug === locStr || l.nameBn === locStr);
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
          locObj = { nameBn: 'এলাকা', nameEn: 'Area', districtBn: 'ঢাকা', district: 'Dhaka', divisionBn: 'ঢাকা', division: 'Dhaka' };
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
        total: totalCount || enrichedReports.length,
        count: enrichedReports.length,
        data: enrichedReports,
      });
    }

    // 6A. Locations: Reported Areas for History Page (GET /api/locations?type=reported or /api/locations/reported)
    const typeParam = urlObj.searchParams.get('type');
    if (pathname === '/locations/reported' || typeParam === 'reported') {
      let reportedLocIds = [];
      if (db) {
        try {
          reportedLocIds = await ReportModel.distinct('locationId', { isFlagged: { $ne: true } });
        } catch (e) {}
      }

      if (reportedLocIds.length === 0) {
        reportedLocIds = ['loc_1', 'loc_2', 'loc_91'];
      }

      const strIds = new Set(reportedLocIds.map(String));
      const matchedReported = defaultLocations.filter(
        (l) => strIds.has(String(l._id)) || strIds.has(l.slug) || strIds.has(l.nameBn)
      );

      const finalReported = matchedReported.length > 0 ? matchedReported : defaultLocations.slice(0, 8);

      return res.status(200).json({
        success: true,
        count: finalReported.length,
        data: finalReported,
      });
    }

    // 6B. Locations: Single Area History (GET /api/locations?history=loc_1 or GET /api/locations/:id/history)
    const historyLocId = urlObj.searchParams.get('history') || (pathname.includes('/history') ? pathname.replace('/locations/', '').replace('/history', '') : null);
    if (historyLocId) {
      const locId = historyLocId;
      const matched = defaultLocations.find((l) => l._id === locId || l.slug === locId || l.nameBn === locId);

      let locReports = [];
      if (db) {
        try {
          const query = {
            isFlagged: { $ne: true },
            $or: [
              { locationId: locId },
              { locationId: matched?._id },
              { locationId: matched?.slug },
            ],
          };
          if (matched && mongoose.isValidObjectId(matched._id)) {
            query.$or.push({ locationId: new mongoose.Types.ObjectId(matched._id) });
          }
          locReports = await ReportModel.find(query).sort({ createdAt: -1 }).limit(100).lean();
        } catch (e) {}
      }

      const totalReps = locReports.length;
      const outages = locReports.filter((r) => r.status === 'unavailable').length;
      const availableReps = locReports.filter((r) => r.status === 'available').length;
      const uptimePct = totalReps > 0 ? Math.round((availableReps / totalReps) * 100) : 100;

      const periods = {
        '24h': {
          totalReports: totalReps,
          outageEvents: outages,
          restorationEvents: availableReps,
          totalOutageMinutes: outages * 45,
          averageOutageMinutes: outages > 0 ? 45 : 0,
          uptimePercentage: uptimePct,
        },
        '48h': {
          totalReports: totalReps,
          outageEvents: outages,
          restorationEvents: availableReps,
          totalOutageMinutes: outages * 45,
          averageOutageMinutes: outages > 0 ? 45 : 0,
          uptimePercentage: uptimePct,
        },
        '7d': {
          totalReports: totalReps,
          outageEvents: outages,
          restorationEvents: availableReps,
          totalOutageMinutes: outages * 45,
          averageOutageMinutes: outages > 0 ? 45 : 0,
          uptimePercentage: uptimePct,
        },
        '30d': {
          totalReports: totalReps,
          outageEvents: outages,
          restorationEvents: availableReps,
          totalOutageMinutes: outages * 45,
          averageOutageMinutes: outages > 0 ? 45 : 0,
          uptimePercentage: uptimePct,
        },
        lifetime: {
          totalReports: totalReps,
          outageEvents: outages,
          restorationEvents: availableReps,
          totalOutageMinutes: outages * 45,
          averageOutageMinutes: outages > 0 ? 45 : 0,
          uptimePercentage: uptimePct,
        },
      };

      return res.status(200).json({
        success: true,
        data: {
          location: matched || { nameBn: locId, nameEn: locId, districtBn: 'ঢাকা', district: 'Dhaka' },
          periods,
          reports: locReports.slice(0, 15),
        },
      });
    }

    // 6C. Locations: Map Status & List (GET /api/locations)
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

    // 7. Schedules (GET /api/schedules, POST /api/schedules)
    if (pathname.startsWith('/schedules')) {
      if (req.method === 'GET') {
        const locId = urlObj.searchParams.get('location') || pathname.replace('/schedules/location/', '').replace('/schedules', '');
        let scheds = [];
        if (db) {
          try {
            const filter = { isActive: true };
            if (locId && locId !== '/') {
              filter.locationId = locId;
            }
            scheds = await ScheduleModel.find(filter).sort({ createdAt: -1 }).lean();
          } catch (e) {}
        }
        if (scheds.length === 0) {
          scheds = [
            {
              _id: 'sch_1',
              title: 'সম্ভাব্য লোডশেডিং সূচি',
              source: 'official',
              events: [
                { time: '01:00 PM', status: 'available', note: 'বিদ্যুৎ সচল' },
                { time: '03:00 PM', status: 'unavailable', note: 'লোডশেডিং' },
                { time: '04:30 PM', status: 'available', note: 'বিদ্যুৎ সচল' },
                { time: '06:10 PM', status: 'unavailable', note: 'লোডশেডিং' },
              ],
              upvotes: 8,
              downvotes: 1,
              isVerified: true,
            },
          ];
        }
        return res.status(200).json({ success: true, count: scheds.length, data: scheds });
      }

      if (req.method === 'POST') {
        if (pathname.includes('/vote') || urlObj.searchParams.get('action') === 'vote') {
          const schId = urlObj.searchParams.get('id') || pathname.replace('/schedules/', '').replace('/vote', '');
          const body = await parseRequestBody(req);
          if (db && mongoose.isValidObjectId(schId)) {
            const inc = body.vote === 'up' ? { upvotes: 1 } : { downvotes: 1 };
            await ScheduleModel.findByIdAndUpdate(schId, { $inc: inc });
          }
          return res.status(200).json({ success: true, message: 'ভোট সংরক্ষিত হয়েছে' });
        }

        // Create Schedule
        const body = await parseRequestBody(req);
        let created = null;
        if (db) {
          try {
            created = await ScheduleModel.create({
              locationId: body.locationId || 'loc_1',
              title: body.title || 'লোডশেডিং সূচি',
              source: body.source || 'community',
              events: body.events || [],
              notes: body.notes || '',
              isActive: true,
              isVerified: false,
            });
          } catch (e) {}
        }
        return res.status(201).json({ success: true, message: 'সূচি সফলভাবে যুক্ত হয়েছে', data: created });
      }
    }

    // 8. Stats (GET /api/stats)
    if (pathname.startsWith('/stats')) {
      let totalReports = 0;
      let availableSummary = 0;
      let unavailableSummary = 0;
      let distinctReportedCount = 0;

      if (db) {
        try {
          totalReports = await ReportModel.countDocuments({ isFlagged: { $ne: true } });
          const reportedLocs = await ReportModel.distinct('locationId', { isFlagged: { $ne: true } });
          distinctReportedCount = reportedLocs.length;

          // Merge live DB statuses into locations
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
      if (totalReports === 0) {
        totalReports = fallbackReports.length;
        distinctReportedCount = 2;
      }

      defaultLocations.forEach((loc) => {
        if (loc.status === 'available') availableSummary++;
        else if (loc.status === 'unavailable') unavailableSummary++;
      });

      const topOutageAreas = [
        { nameBn: 'মিরপুর', districtBn: 'ঢাকা', reportsCount: 4, outageRate: 65 },
        { nameBn: 'ধানমন্ডি', districtBn: 'ঢাকা', reportsCount: 3, outageRate: 50 },
        { nameBn: 'গোপালগঞ্জ সদর', districtBn: 'গোপালগঞ্জ', reportsCount: 2, outageRate: 40 },
      ];

      return res.status(200).json({
        success: true,
        data: {
          totalReportsToday: totalReports,
          activeAreasCount: defaultLocations.length,
          reportedAreasCount: distinctReportedCount,
          areasAvailableCount: availableSummary,
          areasUnavailableCount: unavailableSummary,
          topOutageAreas,
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
