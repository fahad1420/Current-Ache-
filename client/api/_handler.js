import fs from 'fs';
import path from 'path';

// Read verified official dataset
let defaultLocations = [];
try {
  const locationsPath = path.join(process.cwd(), 'src', 'data', 'bangladeshLocations.json');
  if (fs.existsSync(locationsPath)) {
    defaultLocations = JSON.parse(fs.readFileSync(locationsPath, 'utf8'));
  } else {
    const altPath = path.join(process.cwd(), 'client', 'src', 'data', 'bangladeshLocations.json');
    if (fs.existsSync(altPath)) {
      defaultLocations = JSON.parse(fs.readFileSync(altPath, 'utf8'));
    }
  }
} catch (e) {
  defaultLocations = [];
}

const inMemoryReports = [
  {
    _id: 'rep_init_1',
    locationId: { nameBn: 'মিরপুর', nameEn: 'Mirpur', districtBn: 'ঢাকা', district: 'Dhaka' },
    status: 'available',
    locality: 'সেক্টর ১',
    createdAt: new Date(Date.now() - 15 * 60000).toISOString()
  },
  {
    _id: 'rep_init_2',
    locationId: { nameBn: 'উত্তরা', nameEn: 'Uttara', districtBn: 'ঢাকা', district: 'Dhaka' },
    status: 'available',
    locality: 'সেক্টর ৭',
    createdAt: new Date(Date.now() - 45 * 60000).toISOString()
  }
];

const inMemorySchedules = [];

// Helper to parse request body in serverless
export async function parseRequestBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (req.body && typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
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

export async function handleApiRequest(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = url.pathname.replace(/^\/api/, '');
  if (!pathname || pathname === '') pathname = '/';

  try {
    // 1. Health check
    if (pathname === '/health' || pathname === '/') {
      return res.status(200).json({
        status: 'ok',
        service: 'Electricity Status BD API (কারেন্ট আছে?)',
        locationsCount: defaultLocations.length,
        reportsCount: inMemoryReports.length,
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Reports: Submit (POST /api/reports)
    if ((pathname === '/reports' || pathname.startsWith('/reports')) && req.method === 'POST') {
      const body = await parseRequestBody(req);
      const { locationId, locationName, district, division, latitude, longitude, isGpsCustom, status, duration, locality, customMinutes } = body;

      if (!locationId && (!latitude || !longitude) && !locationName) {
        return res.status(400).json({
          success: false,
          message: 'এলাকা নির্বাচন করা বাধ্যতামূলক।',
          messageEn: 'Location required.',
        });
      }

      let matched = defaultLocations.find(
        l => l._id === locationId ||
             l.slug === locationId ||
             (locationName && (l.nameBn === locationName || l.nameEn === locationName))
      );

      // If user reported from GPS coordinates or map click outside existing 593:
      if (!matched && (isGpsCustom || (latitude && longitude))) {
        matched = {
          _id: locationId || `gps_${Date.now()}`,
          nameBn: locationName || `ম্যাপ অবস্থান`,
          nameEn: locationName || `Map Location`,
          district: district || 'বাংলাদেশ',
          districtBn: district || 'বাংলাদেশ',
          division: division || 'Dhaka',
          divisionBn: division || 'ঢাকা',
          latitude: Number(latitude) || 23.8103,
          longitude: Number(longitude) || 90.4125,
          status: status || 'available',
          totalRecentReports: 1,
          availablePercentage: status === 'available' ? 100 : 0,
          unavailablePercentage: status === 'unavailable' ? 100 : 0,
          lastReportAt: new Date().toISOString()
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

      const newReport = {
        _id: `rep_${Date.now()}`,
        locationId: matched || { nameBn: locationName || 'এলাকা', nameEn: 'Area', districtBn: 'ঢাকা', district: 'Dhaka' },
        status: status || 'available',
        duration: duration || 'just_now',
        customMinutes: customMinutes || null,
        locality: locality || '',
        createdAt: new Date().toISOString()
      };

      inMemoryReports.unshift(newReport);
      if (inMemoryReports.length > 200) inMemoryReports.pop();

      return res.status(201).json({
        success: true,
        message: 'ধন্যবাদ! আপনার রিপোর্টটি সফলভাবে গ্রহণ করা হয়েছে।',
        data: newReport
      });
    }

    // 3. Reports: Recent ticker (GET /api/reports/recent or GET /api/reports)
    if (pathname === '/reports/recent' || pathname === '/reports') {
      return res.status(200).json({
        success: true,
        count: inMemoryReports.length,
        data: inMemoryReports.slice(0, 15)
      });
    }

    // 4. Locations: Map Status
    if (pathname === '/locations/map-status') {
      let availableSummary = 0;
      let unavailableSummary = 0;
      let insufficientSummary = 0;

      defaultLocations.forEach(loc => {
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
          insufficient: insufficientSummary
        },
        data: defaultLocations
      });
    }

    // 5. Locations: Search
    if (pathname === '/locations/search') {
      const q = (url.searchParams.get('q') || '').toLowerCase().trim();
      if (!q) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }

      const results = defaultLocations.filter(loc =>
        loc.nameBn?.toLowerCase().includes(q) ||
        loc.nameEn?.toLowerCase().includes(q) ||
        loc.district?.toLowerCase().includes(q) ||
        loc.districtBn?.includes(q) ||
        loc.division?.toLowerCase().includes(q) ||
        loc.divisionBn?.includes(q) ||
        (loc.upazila && loc.upazila.toLowerCase().includes(q))
      ).slice(0, 15);

      return res.status(200).json({ success: true, count: results.length, data: results });
    }

    // 6. Locations: List with optional division filter
    if (pathname === '/locations') {
      const division = url.searchParams.get('division');
      let results = defaultLocations;
      if (division && division !== 'All') {
        results = defaultLocations.filter(
          loc => loc.division?.toLowerCase() === division.toLowerCase()
        );
      }
      return res.status(200).json({ success: true, count: results.length, data: results });
    }

    // 7. Locations: Single by ID or Slug
    if (pathname.startsWith('/locations/') && !pathname.endsWith('/history')) {
      const idOrSlug = pathname.replace('/locations/', '');
      const matched = defaultLocations.find(l => l._id === idOrSlug || l.slug === idOrSlug);
      if (!matched) {
        return res.status(404).json({ success: false, message: 'Location not found' });
      }
      return res.status(200).json({
        success: true,
        data: {
          location: matched,
          status: matched.status || 'insufficient_data',
          recentReports: inMemoryReports.filter(r => r.locationId?._id === matched._id).slice(0, 5)
        }
      });
    }

    // 8. Locations: History
    if (pathname.startsWith('/locations/') && pathname.endsWith('/history')) {
      const idOrSlug = pathname.replace('/locations/', '').replace('/history', '');
      const matched = defaultLocations.find(l => l._id === idOrSlug || l.slug === idOrSlug);
      return res.status(200).json({
        success: true,
        data: {
          location: matched || { nameBn: idOrSlug, nameEn: idOrSlug },
          periods: {
            '24h': { outageCount: 0, totalOutageMinutes: 0, uptimePercentage: 100, outageEvents: [], restorationEvents: [] },
            '48h': { outageCount: 0, totalOutageMinutes: 0, uptimePercentage: 100, outageEvents: [], restorationEvents: [] },
            '7d': { outageCount: 0, totalOutageMinutes: 0, uptimePercentage: 100, outageEvents: [], restorationEvents: [] },
            '30d': { outageCount: 0, totalOutageMinutes: 0, uptimePercentage: 100, outageEvents: [], restorationEvents: [] },
            'lifetime': { outageCount: 0, totalOutageMinutes: 0, uptimePercentage: 100, outageEvents: [], restorationEvents: [] },
          }
        }
      });
    }

    // 9. Stats
    if (pathname === '/stats') {
      const availCount = defaultLocations.filter(l => l.status === 'available').length;
      const unavailCount = defaultLocations.filter(l => l.status === 'unavailable').length;

      return res.status(200).json({
        success: true,
        data: {
          totalReportsToday: inMemoryReports.length,
          activeAreasCount: defaultLocations.length,
          areasAvailableCount: availCount,
          areasUnavailableCount: unavailCount,
          topOutageAreas: []
        }
      });
    }

    // 10. Schedules
    if (pathname.startsWith('/schedules/location/')) {
      const locId = pathname.replace('/schedules/location/', '');
      const matchedSchedules = inMemorySchedules.filter(s => s.locationId === locId);
      return res.status(200).json({
        success: true,
        count: matchedSchedules.length,
        data: matchedSchedules
      });
    }

    if (pathname === '/schedules' && req.method === 'POST') {
      const body = await parseRequestBody(req);
      const newSchedule = {
        _id: `sch_${Date.now()}`,
        ...body,
        votes: { correct: 0, incorrect: 0 },
        isInvalidated: false,
        createdAt: new Date().toISOString()
      };
      inMemorySchedules.unshift(newSchedule);
      return res.status(201).json({
        success: true,
        message: 'সময়সূচি সফলভাবে তৈরি হয়েছে',
        data: newSchedule
      });
    }

    if (pathname.includes('/vote') && req.method === 'POST') {
      return res.status(200).json({
        success: true,
        message: 'আপনার ভোট গণনা করা হয়েছে'
      });
    }

    return res.status(200).json({
      success: true,
      service: 'Electricity Status BD API',
      locations: defaultLocations.length
    });
  } catch (err) {
    console.error('API Handler Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
