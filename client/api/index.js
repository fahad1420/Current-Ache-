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

const inMemoryReports = [];
const inMemorySchedules = [];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname.replace(/^\/api/, '');

  try {
    // 1. Health check
    if (pathname === '/health' || pathname === '') {
      return res.status(200).json({
        status: 'ok',
        service: 'Electricity Status BD API (কারেন্ট আছে?)',
        locationsCount: defaultLocations.length,
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Locations: Map Status
    if (pathname === '/locations/map-status') {
      const summary = {
        total: defaultLocations.length,
        available: 0,
        unavailable: 0,
        insufficient: defaultLocations.length
      };

      return res.status(200).json({
        success: true,
        count: defaultLocations.length,
        summary,
        data: defaultLocations
      });
    }

    // 3. Locations: Search
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

    // 4. Locations: List with optional division filter
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

    // 5. Locations: Single by ID or Slug
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
          recentReports: []
        }
      });
    }

    // 6. Locations: History
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

    // 7. Reports: Recent ticker
    if (pathname === '/reports/recent') {
      return res.status(200).json({
        success: true,
        count: inMemoryReports.length,
        data: inMemoryReports.slice(0, 10)
      });
    }

    // 8. Reports: Submit
    if (pathname === '/reports' && req.method === 'POST') {
      const body = req.body || {};
      const { locationId, status, locality } = body;
      const matched = defaultLocations.find(l => l._id === locationId || l.slug === locationId);

      const newReport = {
        _id: `rep_${Date.now()}`,
        locationId: matched || { nameBn: 'এলাকা', nameEn: 'Area', districtBn: 'ঢাকা', district: 'Dhaka' },
        status: status || 'available',
        locality: locality || '',
        createdAt: new Date().toISOString()
      };

      inMemoryReports.unshift(newReport);
      if (inMemoryReports.length > 50) inMemoryReports.pop();

      return res.status(201).json({
        success: true,
        message: 'ধন্যবাদ! আপনার রিপোর্টটি গ্রহণ করা হয়েছে।',
        data: newReport
      });
    }

    // 9. Stats
    if (pathname === '/stats') {
      return res.status(200).json({
        success: true,
        data: {
          totalReportsToday: inMemoryReports.length,
          activeAreasCount: defaultLocations.length,
          areasAvailableCount: 0,
          areasUnavailableCount: 0,
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
      const body = req.body || {};
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

    // Default fallback
    return res.status(200).json({
      success: true,
      service: 'Electricity Status BD API',
      locations: defaultLocations.length
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
