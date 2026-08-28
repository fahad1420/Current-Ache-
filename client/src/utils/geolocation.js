// Haversine distance formula between two GPS coordinates (in km)
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Find nearest administrative Upazila/Thana from 593 locations list
export function findNearestLocation(userLat, userLng, locations = []) {
  if (!locations || locations.length === 0) return null;

  let nearest = null;
  let minDistance = Infinity;

  for (const loc of locations) {
    if (loc.latitude && loc.longitude) {
      const dist = calculateHaversineDistance(userLat, userLng, loc.latitude, loc.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = loc;
      }
    }
  }

  return nearest ? { ...nearest, distanceKm: Math.round(minDistance * 10) / 10 } : null;
}

// Map English district/division names to Bengali
const districtBnMap = {
  Dhaka: 'ঢাকা', Chattogram: 'চট্টগ্রাম', Chittagong: 'চট্টগ্রাম', Rajshahi: 'রাজশাহী',
  Khulna: 'খুলনা', Barishal: 'বরিশাল', Sylhet: 'সিলেট', Rangpur: 'রংপুর', Mymensingh: 'ময়মনসিংহ',
  Gazipur: 'গাজীপুর', Narayanganj: 'নারায়ণগঞ্জ', Cumilla: 'কুমিল্লা', Comilla: 'কুমিল্লা',
  Bogura: 'বগুড়া', Bogra: 'বগুড়া', CoxsBazar: "কক্সবাজার", "Cox's Bazar": "কক্সবাজার",
  Jessore: 'যশোর', Jashore: 'যশোর', Dinajpur: 'দিনাজপুর', Pabna: 'পাবনা', Kushtia: 'কুষ্টিয়া',
  Tangail: 'টাঙ্গাইল', Feni: 'ফেনী', Noakhali: 'নোয়াখালী', Brahmanbaria: 'ব্রাহ্মণবাড়িয়া'
};

// Full GPS Resolver: checks nearby administrative areas and performs reverse geocoding
export async function resolveGpsLocation(userLat, userLng, locations = []) {
  const nearest = findNearestLocation(userLat, userLng, locations);

  // Try reverse geocoding via OpenStreetMap Nominatim with 3s timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${userLat}&lon=${userLng}&format=json&accept-language=bn,en`,
      { signal: controller.signal, headers: { 'User-Agent': 'CurrentAcheBD-Tracker/2.0' } }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};

      const localNameBn = addr.suburb || addr.neighbourhood || addr.village || addr.quarter || addr.town || addr.city_district || addr.county || data.name;
      const districtName = addr.state_district || addr.county || addr.city || (nearest?.district) || 'ঢাকা';
      const divisionName = addr.state || (nearest?.division) || 'Dhaka';

      if (localNameBn) {
        return {
          _id: `gps_${userLat.toFixed(4)}_${userLng.toFixed(4)}`,
          nameBn: localNameBn,
          nameEn: addr.suburb_en || addr.town || localNameBn,
          district: districtName,
          districtBn: districtBnMap[districtName] || districtName,
          division: divisionName,
          divisionBn: districtBnMap[divisionName] || divisionName,
          latitude: userLat,
          longitude: userLng,
          isGpsCustom: true,
          isGpsDetected: true,
          distanceKm: nearest?.distanceKm || 0,
          rawAddress: data.display_name
        };
      }
    }
  } catch (err) {
    console.warn('Reverse geocoding timed out or failed, using nearest GIS location:', err.message);
  }

  // If user is within 15 km of a known administrative Upazila/Thana:
  if (nearest && nearest.distanceKm <= 15) {
    return {
      ...nearest,
      isGpsDetected: true,
      userLatitude: userLat,
      userLongitude: userLng,
    };
  }

  // If outside 15 km of known locations:
  return {
    _id: `gps_${userLat.toFixed(4)}_${userLng.toFixed(4)}`,
    nameBn: `GPS অবস্থান (${userLat.toFixed(4)}, ${userLng.toFixed(4)})`,
    nameEn: `GPS Location (${userLat.toFixed(4)}, ${userLng.toFixed(4)})`,
    district: nearest?.district || 'বাংলাদেশ',
    districtBn: nearest?.districtBn || 'বাংলাদেশ',
    division: nearest?.division || 'Dhaka',
    divisionBn: nearest?.divisionBn || 'ঢাকা',
    latitude: userLat,
    longitude: userLng,
    isGpsCustom: true,
    isGpsDetected: true,
    distanceKm: nearest?.distanceKm || 0,
  };
}
