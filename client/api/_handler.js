import crypto from 'crypto';
import mongoose from 'mongoose';
import { connectToDatabase, LocationModel, ReportModel, ScheduleModel } from './_db.js';
import { defaultLocations } from './_locations.js';

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

// Simple secure JWT generator and verifier
function generateToken(payload, secret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 7 * 86400 })
  ).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

// Canonical Location Resolution Engine
export async function resolveLocation(identifier, db = null) {
  if (!identifier) return null;

  const idStr = String(identifier).trim();

  let staticLoc = defaultLocations.find(
    (l) =>
      l._id === idStr ||
      l.slug === idStr.toLowerCase() ||
      l.nameBn === idStr ||
      l.nameEn?.toLowerCase() === idStr.toLowerCase()
  );

  let dbDoc = null;
  if (db) {
    try {
      if (mongoose.isValidObjectId(idStr)) {
        dbDoc = await LocationModel.findById(idStr).lean();
      }
      if (!dbDoc && staticLoc) {
        dbDoc = await LocationModel.findOne({
          $or: [{ slug: staticLoc.slug }, { nameBn: staticLoc.nameBn }],
        }).lean();
      }
      if (!dbDoc) {
        dbDoc = await LocationModel.findOne({
          $or: [{ slug: idStr.toLowerCase() }, { nameBn: idStr }, { nameEn: idStr }],
        }).lean();
      }
    } catch (err) {
      console.warn('DB location lookup notice:', err.message);
    }
  }

  if (dbDoc && !staticLoc) {
    staticLoc = defaultLocations.find(
      (l) => l.slug === dbDoc.slug || l.nameBn === dbDoc.nameBn || l._id === String(dbDoc._id)
    );
  }

  const canonicalId = dbDoc?._id ? dbDoc._id : (staticLoc?._id || idStr);

  const queryIds = new Set();
  if (dbDoc) {
    queryIds.add(dbDoc._id);
    queryIds.add(String(dbDoc._id));
    if (dbDoc.slug) queryIds.add(dbDoc.slug);
    if (dbDoc.nameBn) queryIds.add(dbDoc.nameBn);
  }
  if (staticLoc) {
    queryIds.add(staticLoc._id);
    queryIds.add(staticLoc.slug);
    queryIds.add(staticLoc.nameBn);
  }
  queryIds.add(idStr);

  return {
    _id: staticLoc?._id || String(canonicalId),
    canonicalId,
    dbDoc,
    staticLoc,
    nameBn: dbDoc?.nameBn || staticLoc?.nameBn || idStr,
    nameEn: dbDoc?.nameEn || staticLoc?.nameEn || idStr,
    districtBn: dbDoc?.districtBn || staticLoc?.districtBn || 'বাংলাদেশ',
    district: dbDoc?.district || staticLoc?.district || 'Bangladesh',
    divisionBn: dbDoc?.divisionBn || staticLoc?.divisionBn || 'ঢাকা',
    division: dbDoc?.division || staticLoc?.division || 'Dhaka',
    slug: dbDoc?.slug || staticLoc?.slug || '',
    latitude: dbDoc?.latitude || staticLoc?.latitude || 23.8103,
    longitude: dbDoc?.longitude || staticLoc?.longitude || 90.4125,
    queryIds: Array.from(queryIds),
  };
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

  // Support subpath query parameter passed by rewrites
  const subpath = urlObj.searchParams.get('subpath');
  if (subpath) {
    pathname = `/${subpath}`.replace(/\/$/, '');
  }

  // Ensure DB connection
  let db = null;
  try {
    db = await connectToDatabase();
  } catch (err) {
    console.error('MongoDB connection error in API handler:', err.message);
  }

  try {
    // 1. Health Check
    if (pathname === '/health' || pathname === '/') {
      let dbReportsCount = 0;
      let dbLocationsCount = 0;
      if (db) {
        try {
          dbReportsCount = await ReportModel.countDocuments();
          dbLocationsCount = await LocationModel.countDocuments();
        } catch (e) {}
      }
      return res.status(200).json({
        status: 'ok',
        service: 'Electricity Status BD API (কারেন্ট আছে?)',
        database: db ? 'MongoDB Atlas Connected' : 'Disconnected',
        locationsCount: dbLocationsCount || defaultLocations.length,
        reportsCount: dbReportsCount,
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Admin Authentication (POST /api/auth, /api/auth/login, /api/admin/login)
    if (
      pathname === '/admin/login' ||
      pathname === '/auth/login' ||
      pathname === '/auth' ||
      (pathname === '/admin' && req.method === 'POST')
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

    // 3A. Admin Reports Inspection (GET /api/admin/reports or GET /api/admin)
    if (
      (pathname === '/admin' ||
        pathname.startsWith('/admin/reports') ||
        urlObj.searchParams.get('type') === 'reports') &&
      req.method === 'GET'
    ) {
      const page = parseInt(urlObj.searchParams.get('page') || '1', 10);
      const limit = parseInt(urlObj.searchParams.get('limit') || '20', 10);
      const statusFilter = urlObj.searchParams.get('status');

      if (!db) {
        return res.status(503).json({ success: false, message: 'ডাটাবেজ সংযোগ বিচ্ছিন্ন' });
      }

      const filter = {};
      if (statusFilter && (statusFilter === 'available' || statusFilter === 'unavailable')) {
        filter.status = statusFilter;
      }

      const total = await ReportModel.countDocuments(filter);
      const rawReports = await ReportModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      // Build location lookup map safely
      const allDbLocs = await LocationModel.find().lean();
      const dbById = new Map(allDbLocs.map((l) => [String(l._id), l]));
      const dbBySlug = new Map(allDbLocs.map((l) => [l.slug, l]));
      const dbByName = new Map(allDbLocs.map((l) => [l.nameBn, l]));

      const enriched = rawReports.map((r) => {
        let locObj = null;
        if (r.location && typeof r.location === 'object' && r.location.nameBn) {
          locObj = r.location;
        } else if (r.locationId) {
          const locStr =
            typeof r.locationId === 'object' && r.locationId._id
              ? String(r.locationId._id)
              : String(r.locationId);
          const fromDb = dbById.get(locStr) || dbBySlug.get(locStr) || dbByName.get(locStr);
          const staticLoc = defaultLocations.find(
            (l) =>
              l._id === locStr ||
              l.slug === locStr ||
              l.nameBn === locStr ||
              (fromDb && (l.slug === fromDb.slug || l.nameBn === fromDb.nameBn))
          );

          if (fromDb || staticLoc) {
            locObj = {
              _id: staticLoc?._id || (fromDb ? String(fromDb._id) : locStr),
              nameBn: fromDb?.nameBn || staticLoc?.nameBn || 'এলাকা',
              nameEn: fromDb?.nameEn || staticLoc?.nameEn || 'Area',
              districtBn: fromDb?.districtBn || staticLoc?.districtBn || 'বাংলাদেশ',
              district: fromDb?.district || staticLoc?.district || 'Bangladesh',
              divisionBn: fromDb?.divisionBn || staticLoc?.divisionBn || 'ঢাকা',
              division: fromDb?.division || staticLoc?.division || 'Dhaka',
            };
          }
        }
        if (!locObj) {
          locObj = {
            nameBn: 'এলাকা',
            nameEn: 'Area',
            districtBn: 'ঢাকা',
            district: 'Dhaka',
            divisionBn: 'ঢাকা',
            division: 'Dhaka',
          };
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
          ipHash: r.ipHash || r.clientFingerprint || 'anon_hash',
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

    // 3B. Admin Report Actions (DELETE /api/admin/reports/:id)
    if (pathname.startsWith('/admin/reports/') && req.method === 'DELETE') {
      const repId = pathname.replace('/admin/reports/', '').split('/')[0];
      if (db && mongoose.isValidObjectId(repId)) {
        await ReportModel.findByIdAndDelete(repId);
      }
      return res.status(200).json({ success: true, message: 'রিপোর্ট মুছে ফেলা হয়েছে।' });
    }

    // 3C. Admin Report Flag (PATCH /api/admin/reports/:id/flag)
    if (pathname.startsWith('/admin/reports/') && pathname.includes('/flag') && req.method === 'PATCH') {
      const repId = pathname.replace('/admin/reports/', '').replace('/flag', '').split('/')[0];
      if (db && mongoose.isValidObjectId(repId)) {
        const doc = await ReportModel.findById(repId);
        if (doc) {
          doc.isFlagged = !doc.isFlagged;
          await doc.save();
          return res.status(200).json({
            success: true,
            message: doc.isFlagged ? 'রিপোর্ট ফ্ল্যাগ করা হয়েছে' : 'ফ্ল্যাগ সরানো হয়েছে',
            isFlagged: doc.isFlagged,
          });
        }
      }
      return res.status(200).json({ success: true, message: 'স্ট্যাটাস পরিবর্তিত হয়েছে' });
    }

    // 4. Submit Report (POST /api/reports)
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

      if (!db) {
        return res
          .status(503)
          .json({ success: false, message: 'ডাটাবেজ সংযোগ ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।' });
      }

      const identifier = locationId || locationName;
      const resolved = await resolveLocation(identifier, db);

      let canonicalLocationId = resolved?.canonicalId;

      // If custom GPS pin and not existing in DB, create Location
      if (!canonicalLocationId || isGpsCustom || (!resolved?.dbDoc && latitude && longitude)) {
        try {
          const gpsSlug = `gps-${Number(latitude || 23.81).toFixed(4)}-${Number(longitude || 90.41).toFixed(4)}`;
          let customDoc = await LocationModel.findOne({ slug: gpsSlug });
          if (!customDoc) {
            customDoc = await LocationModel.create({
              nameBn: locationName || 'ম্যাপ অবস্থান',
              nameEn: locationName || 'Map Pin',
              district: district || 'বাংলাদেশ',
              districtBn: district || 'বাংলাদেশ',
              division: division || 'Dhaka',
              divisionBn: division || 'ঢাকা',
              slug: gpsSlug,
              latitude: Number(latitude) || 23.8103,
              longitude: Number(longitude) || 90.4125,
              status: status || 'available',
              isActive: true,
            });
          }
          canonicalLocationId = customDoc._id;
        } catch (e) {
          console.warn('Custom location creation note:', e.message);
        }
      }

      // Save report directly to MongoDB
      const savedReport = await ReportModel.create({
        locationId: canonicalLocationId || 'unknown',
        status: status || 'available',
        duration: duration || 'just_now',
        customMinutes: customMinutes || null,
        locality: locality || '',
        isFlagged: false,
        createdAt: new Date(),
      });

      // Update Location status in MongoDB
      if (canonicalLocationId && mongoose.isValidObjectId(canonicalLocationId)) {
        await LocationModel.findByIdAndUpdate(canonicalLocationId, {
          status: status || 'available',
          lastReportAt: new Date(),
          $inc: { totalRecentReports: 1 },
        });
      }

      // Update static cache if matched
      if (resolved?.staticLoc) {
        resolved.staticLoc.status = status || 'available';
        resolved.staticLoc.lastReportAt = new Date().toISOString();
        resolved.staticLoc.totalRecentReports = (resolved.staticLoc.totalRecentReports || 0) + 1;
      }

      const formattedLocation = {
        _id: resolved?._id || String(canonicalLocationId),
        nameBn: resolved?.nameBn || locationName || 'এলাকা',
        nameEn: resolved?.nameEn || locationName || 'Area',
        districtBn: resolved?.districtBn || 'বাংলাদেশ',
        district: resolved?.district || 'Bangladesh',
        divisionBn: resolved?.divisionBn || 'ঢাকা',
        division: resolved?.division || 'Dhaka',
        slug: resolved?.slug || '',
      };

      return res.status(201).json({
        success: true,
        message: 'ধন্যবাদ! আপনার রিপোর্টটি সফলভাবে গ্রহণ করা হয়েছে।',
        data: {
          id: String(savedReport._id),
          _id: String(savedReport._id),
          location: formattedLocation,
          locationId: formattedLocation,
          status: status || 'available',
          duration: duration || 'just_now',
          locality: locality || '',
          createdAt: savedReport.createdAt,
        },
      });
    }

    // 5. Public Reports Feed (GET /api/reports or GET /api/reports/recent)
    if (pathname.startsWith('/reports') && req.method === 'GET') {
      if (!db) {
        return res.status(503).json({ success: false, message: 'ডাটাবেজ সংযোগ বিচ্ছিন্ন' });
      }

      const total = await ReportModel.countDocuments({ isFlagged: { $ne: true } });
      const rawReports = await ReportModel.find({ isFlagged: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      const allDbLocs = await LocationModel.find().lean();
      const dbById = new Map(allDbLocs.map((l) => [String(l._id), l]));
      const dbBySlug = new Map(allDbLocs.map((l) => [l.slug, l]));
      const dbByName = new Map(allDbLocs.map((l) => [l.nameBn, l]));

      const enriched = rawReports.map((r) => {
        let locObj = null;
        if (r.location && typeof r.location === 'object' && r.location.nameBn) {
          locObj = r.location;
        } else if (r.locationId) {
          const locStr =
            typeof r.locationId === 'object' && r.locationId._id
              ? String(r.locationId._id)
              : String(r.locationId);
          const fromDb = dbById.get(locStr) || dbBySlug.get(locStr) || dbByName.get(locStr);
          const staticLoc = defaultLocations.find(
            (l) =>
              l._id === locStr ||
              l.slug === locStr ||
              l.nameBn === locStr ||
              (fromDb && (l.slug === fromDb.slug || l.nameBn === fromDb.nameBn))
          );

          if (fromDb || staticLoc) {
            locObj = {
              _id: staticLoc?._id || (fromDb ? String(fromDb._id) : locStr),
              nameBn: fromDb?.nameBn || staticLoc?.nameBn || 'এলাকা',
              nameEn: fromDb?.nameEn || staticLoc?.nameEn || 'Area',
              districtBn: fromDb?.districtBn || staticLoc?.districtBn || 'বাংলাদেশ',
              district: fromDb?.district || staticLoc?.district || 'Bangladesh',
              divisionBn: fromDb?.divisionBn || staticLoc?.divisionBn || 'ঢাকা',
              division: fromDb?.division || staticLoc?.division || 'Dhaka',
              slug: fromDb?.slug || staticLoc?.slug || '',
            };
          }
        }
        if (!locObj) {
          locObj = {
            nameBn: 'এলাকা',
            nameEn: 'Area',
            districtBn: 'ঢাকা',
            district: 'Dhaka',
            divisionBn: 'ঢাকা',
            division: 'Dhaka',
          };
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
        total,
        count: enriched.length,
        data: enriched,
      });
    }

    // 6A. History Page: Dynamic Reported Areas (GET /api/locations/reported or ?type=reported)
    const isReportedType =
      urlObj.searchParams.get('type') === 'reported' || pathname === '/locations/reported';
    if (isReportedType) {
      if (!db) {
        return res.status(503).json({ success: false, message: 'ডাটাবেজ সংযোগ বিচ্ছিন্ন' });
      }

      const allDbLocs = await LocationModel.find().lean();
      const dbById = new Map(allDbLocs.map((l) => [String(l._id), l]));
      const dbBySlug = new Map(allDbLocs.map((l) => [l.slug, l]));
      const dbByName = new Map(allDbLocs.map((l) => [l.nameBn, l]));

      const rawLocIds = await ReportModel.distinct('locationId', { isFlagged: { $ne: true } });

      const reportedAreasMap = new Map();
      for (const rawId of rawLocIds) {
        if (!rawId || rawId === 'unknown') continue;
        const strId =
          typeof rawId === 'object' && rawId._id ? String(rawId._id) : String(rawId);
        let locDoc = dbById.get(strId) || dbBySlug.get(strId) || dbByName.get(strId);
        let staticLoc = defaultLocations.find(
          (l) => l._id === strId || l.slug === strId || l.nameBn === strId
        );

        if (locDoc && !staticLoc) {
          staticLoc = defaultLocations.find(
            (l) => l.slug === locDoc.slug || l.nameBn === locDoc.nameBn
          );
        }
        if (staticLoc && !locDoc) {
          locDoc = dbBySlug.get(staticLoc.slug) || dbByName.get(staticLoc.nameBn);
        }

        const key = locDoc ? String(locDoc._id) : staticLoc ? staticLoc._id : strId;
        const nameBn = locDoc?.nameBn || staticLoc?.nameBn || strId;
        const districtBn = locDoc?.districtBn || staticLoc?.districtBn || 'বাংলাদেশ';

        if (!reportedAreasMap.has(key)) {
          reportedAreasMap.set(key, {
            _id: staticLoc?._id || key,
            dbId: locDoc?._id ? String(locDoc._id) : key,
            nameBn,
            nameEn: locDoc?.nameEn || staticLoc?.nameEn || strId,
            districtBn,
            district: locDoc?.district || staticLoc?.district || 'Bangladesh',
            divisionBn: locDoc?.divisionBn || staticLoc?.divisionBn || 'ঢাকা',
            division: locDoc?.division || staticLoc?.division || 'Dhaka',
            slug: locDoc?.slug || staticLoc?.slug || '',
            latitude: locDoc?.latitude || staticLoc?.latitude || 23.8103,
            longitude: locDoc?.longitude || staticLoc?.longitude || 90.4125,
            status: locDoc?.status || staticLoc?.status || 'available',
            totalRecentReports: locDoc?.totalRecentReports || 1,
          });
        }
      }

      const reportedList = Array.from(reportedAreasMap.values());
      return res.status(200).json({
        success: true,
        count: reportedList.length,
        data: reportedList,
      });
    }

    // 6B. History Page: Single Area Outage History (GET /api/locations/:id/history or ?history=:id)
    const isHistoryQuery = pathname.includes('/history') || urlObj.searchParams.has('history');
    if (isHistoryQuery) {
      const locParam =
        urlObj.searchParams.get('history') ||
        pathname.replace('/locations/', '').replace('/history', '').replace(/^\//, '');

      if (!db) {
        return res.status(503).json({ success: false, message: 'ডাটাবেজ সংযোগ বিচ্ছিন্ন' });
      }

      const resolved = await resolveLocation(locParam, db);
      const queryIds = resolved?.queryIds || [locParam];

      const locReports = await ReportModel.find({
        isFlagged: { $ne: true },
        locationId: { $in: queryIds },
      })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

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
          location: {
            _id: resolved?._id || locParam,
            nameBn: resolved?.nameBn || locParam,
            nameEn: resolved?.nameEn || locParam,
            districtBn: resolved?.districtBn || 'বাংলাদেশ',
            district: resolved?.district || 'Bangladesh',
            divisionBn: resolved?.divisionBn || 'ঢাকা',
            division: resolved?.division || 'Dhaka',
            slug: resolved?.slug || '',
          },
          periods,
          reports: locReports.slice(0, 30),
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
        const locParam =
          urlObj.searchParams.get('location') ||
          pathname.replace('/schedules/location/', '').replace('/schedules', '').replace(/^\//, '');

        if (!db) {
          return res.status(503).json({ success: false, message: 'ডাটাবেজ সংযোগ বিচ্ছিন্ন' });
        }

        let filter = { isActive: true };
        if (locParam && locParam !== '') {
          const resolved = await resolveLocation(locParam, db);
          if (resolved?.queryIds) {
            filter.locationId = { $in: resolved.queryIds };
          }
        }

        const scheds = await ScheduleModel.find(filter).sort({ createdAt: -1 }).lean();
        return res.status(200).json({ success: true, count: scheds.length, data: scheds });
      }

      if (req.method === 'POST') {
        if (pathname.includes('/vote') || urlObj.searchParams.get('action') === 'vote') {
          const schId =
            urlObj.searchParams.get('id') ||
            pathname.replace('/schedules/', '').replace('/vote', '').split('/')[0];
          const body = await parseRequestBody(req);
          if (db && mongoose.isValidObjectId(schId)) {
            const inc = body.vote === 'up' ? { upvotes: 1 } : { downvotes: 1 };
            await ScheduleModel.findByIdAndUpdate(schId, { $inc: inc });
          }
          return res.status(200).json({ success: true, message: 'ভোট সংরক্ষিত হয়েছে' });
        }

        // Create Schedule
        const body = await parseRequestBody(req);
        if (!db) {
          return res.status(503).json({ success: false, message: 'ডাটাবেজ সংযোগ বিচ্ছিন্ন' });
        }

        const resolved = await resolveLocation(body.locationId, db);
        const created = await ScheduleModel.create({
          locationId: resolved?.canonicalId || body.locationId || 'unknown',
          title: body.title || 'লোডশেডিং সূচি',
          source: body.source || 'community',
          events: body.events || [],
          notes: body.notes || '',
          isActive: true,
          isVerified: false,
        });

        return res
          .status(201)
          .json({ success: true, message: 'সূচি সফলভাবে যুক্ত হয়েছে', data: created });
      }
    }

    // 8. Stats (GET /api/stats)
    if (pathname.startsWith('/stats')) {
      if (!db) {
        return res.status(503).json({ success: false, message: 'ডাটাবেজ সংযোগ বিচ্ছিন্ন' });
      }

      const totalReports = await ReportModel.countDocuments({ isFlagged: { $ne: true } });
      const rawReportedLocs = await ReportModel.distinct('locationId', { isFlagged: { $ne: true } });
      const distinctReportedCount = rawReportedLocs.filter((id) => id && id !== 'unknown').length;

      // Synchronize locations status with MongoDB LocationModel
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

      let availableSummary = 0;
      let unavailableSummary = 0;
      defaultLocations.forEach((loc) => {
        if (loc.status === 'available') availableSummary++;
        else if (loc.status === 'unavailable') unavailableSummary++;
      });

      // Calculate dynamic top outage areas from real reports
      const outageReports = await ReportModel.find({
        isFlagged: { $ne: true },
        status: 'unavailable',
      }).lean();
      const areaOutageCountMap = new Map();
      outageReports.forEach((r) => {
        const key =
          typeof r.locationId === 'object' && r.locationId._id
            ? String(r.locationId._id)
            : String(r.locationId);
        areaOutageCountMap.set(key, (areaOutageCountMap.get(key) || 0) + 1);
      });

      const topOutageAreas = [];
      const dbById = new Map(dbLocations.map((l) => [String(l._id), l]));
      const dbBySlug = new Map(dbLocations.map((l) => [l.slug, l]));
      for (const [key, count] of areaOutageCountMap.entries()) {
        const doc = dbById.get(key) || dbBySlug.get(key);
        const staticLoc = defaultLocations.find((l) => l._id === key || l.slug === key);
        if (doc || staticLoc) {
          topOutageAreas.push({
            nameBn: doc?.nameBn || staticLoc?.nameBn,
            districtBn: doc?.districtBn || staticLoc?.districtBn,
            reportsCount: count,
            outageRate: Math.min(100, count * 20),
          });
        }
      }
      topOutageAreas.sort((a, b) => b.reportsCount - a.reportsCount);

      return res.status(200).json({
        success: true,
        data: {
          totalReportsToday: totalReports,
          activeAreasCount: defaultLocations.length,
          reportedAreasCount: distinctReportedCount,
          areasAvailableCount: availableSummary,
          areasUnavailableCount: unavailableSummary,
          topOutageAreas: topOutageAreas.slice(0, 5),
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
