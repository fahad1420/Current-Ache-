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
