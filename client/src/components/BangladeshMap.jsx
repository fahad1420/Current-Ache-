import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Zap, PlugZap, HelpCircle, ArrowRight, Navigation, MapPin, ChevronRight, ChevronLeft, RotateCcw } from 'lucide-react';
import { toBn } from '../utils/banglaDigits';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { resolveGpsLocation } from '../utils/geolocation';

// Geographic center and bounds of Bangladesh
const BANGLADESH_CENTER = [23.8103, 90.4125];
const BANGLADESH_BOUNDS = [
  [20.0, 87.5],
  [27.0, 93.0],
];

// Division centers with approximate coordinates
const DIVISION_CENTERS = {
  Dhaka: { lat: 23.8103, lng: 90.4125, nameBn: 'ঢাকা', nameEn: 'Dhaka', zoom: 8.5 },
  Chattogram: { lat: 22.3569, lng: 91.7832, nameBn: 'চট্টগ্রাম', nameEn: 'Chattogram', zoom: 8.5 },
  Rajshahi: { lat: 24.3636, lng: 88.6241, nameBn: 'রাজশাহী', nameEn: 'Rajshahi', zoom: 8.5 },
  Khulna: { lat: 22.8456, lng: 89.5403, nameBn: 'খুলনা', nameEn: 'Khulna', zoom: 8.5 },
  Barishal: { lat: 22.7010, lng: 90.3535, nameBn: 'বরিশাল', nameEn: 'Barishal', zoom: 8.5 },
  Sylhet: { lat: 24.8949, lng: 91.8687, nameBn: 'সিলেট', nameEn: 'Sylhet', zoom: 8.5 },
  Rangpur: { lat: 25.7439, lng: 89.2752, nameBn: 'রংপুর', nameEn: 'Rangpur', zoom: 8.5 },
  Mymensingh: { lat: 24.7471, lng: 90.4203, nameBn: 'ময়মনসিংহ', nameEn: 'Mymensingh', zoom: 8.5 },
};

// Map Click Handler for Problem 5
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      if (onMapClick) {
        onMapClick(lat, lng);
      }
    },
  });
  return null;
};

// Helper controller component to manage map sizing, pan & zoom
const MapController = ({ selectedLocation, userCoords, triggerReset, targetView }) => {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map]);

  // Smooth pan/zoom when targetView changes (e.g. drilling down division or district)
  useEffect(() => {
    if (targetView?.lat && targetView?.lng) {
      map.flyTo([targetView.lat, targetView.lng], targetView.zoom || 9, {
        duration: 1.0,
        easeLinearity: 0.25,
      });
    }
  }, [targetView, map]);

  // Smooth pan/zoom when a location is selected from search/list
  useEffect(() => {
    if (selectedLocation?.latitude && selectedLocation?.longitude) {
      map.flyTo([selectedLocation.latitude, selectedLocation.longitude], 13, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  }, [selectedLocation, map]);

  // Smooth pan/zoom when user GPS coordinates are detected
  useEffect(() => {
    if (userCoords?.latitude && userCoords?.longitude && !selectedLocation) {
      map.flyTo([userCoords.latitude, userCoords.longitude], 13, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  }, [userCoords, selectedLocation, map]);

  // Reset view to Bangladesh
  useEffect(() => {
    if (triggerReset) {
      map.flyTo(BANGLADESH_CENTER, window.innerWidth < 768 ? 6.5 : 7.2, {
        duration: 1.0,
      });
    }
  }, [triggerReset, map]);

  return null;
};

// Create custom glowing marker icons dynamically
const createCustomMarkerIcon = (status, isSelected = false) => {
  let bgClass = 'bg-zinc-600 text-zinc-200 dark:bg-zinc-700 dark:text-zinc-300';
  let iconHtml = '';
  let size = isSelected ? 30 : 20;

  if (status === 'available') {
    bgClass = 'bg-emerald-600 text-white';
    iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
    size = isSelected ? 30 : 22;
  } else if (status === 'unavailable') {
    bgClass = 'bg-rose-600 text-white';
    iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/></svg>`;
    size = isSelected ? 30 : 22;
  } else if (status === 'mixed') {
    bgClass = 'bg-orange-500 text-white';
    iconHtml = `<span style="font-size: 10px; font-weight: 800;">!</span>`;
    size = isSelected ? 28 : 20;
  } else {
    bgClass = isSelected ? 'bg-orange-500 text-white' : 'bg-zinc-500/80 text-white dark:bg-zinc-600/90';
    iconHtml = `<div class="w-1.5 h-1.5 rounded-full bg-white/90"></div>`;
    size = isSelected ? 26 : 16;
  }

  const borderClass = isSelected
    ? 'ring-3 ring-orange-500 scale-125 shadow-lg z-50'
    : 'border border-white/90 dark:border-zinc-900 shadow-xs';

  return L.divIcon({
    className: '',
    html: `
      <div class="flex items-center justify-center rounded-full transition-all duration-150 ${bgClass} ${borderClass}" style="width: ${size}px; height: ${size}px;">
        ${iconHtml}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

// Create Division Badge Icon (Level 1)
const createDivisionBadgeIcon = (nameBn, count, unavailCount = 0) => {
  const badgeBg = unavailCount > 0 ? 'bg-rose-600 text-white' : 'bg-orange-500 text-white';
  return L.divIcon({
    className: '',
    html: `
      <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full ${badgeBg} shadow-lg border-2 border-white dark:border-zinc-900 font-bold text-xs cursor-pointer hover:scale-105 transition-transform whitespace-nowrap">
        <span>${nameBn}</span>
        <span class="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px]">${toBn(count)}</span>
      </div>
    `,
    iconSize: [80, 30],
    iconAnchor: [40, 15],
  });
};

// Create District Badge Icon (Level 2)
const createDistrictBadgeIcon = (nameBn, count, unavailCount = 0) => {
  const badgeBg = unavailCount > 0 ? 'bg-rose-600 text-white' : 'bg-stone-800 dark:bg-zinc-700 text-white';
  return L.divIcon({
    className: '',
    html: `
      <div class="flex items-center gap-1 px-2 py-1 rounded-xl ${badgeBg} shadow-md border border-white/90 dark:border-zinc-800 font-bold text-[11px] cursor-pointer hover:scale-105 transition-transform whitespace-nowrap">
        <span>${nameBn}</span>
        <span class="px-1 py-0.2 rounded-md bg-white/20 text-[9px]">${toBn(count)}</span>
      </div>
    `,
    iconSize: [70, 24],
    iconAnchor: [35, 12],
  });
};

// Map Click Picked Pin Marker
const createMapClickIcon = () => {
  return L.divIcon({
    className: '',
    html: `
      <div class="relative flex items-center justify-center">
        <span class="absolute w-8 h-8 rounded-full bg-orange-500/30 animate-ping"></span>
        <div class="w-6 h-6 rounded-full bg-orange-500 border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs">
          📍
        </div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

// User GPS Location Marker (Cyan Dot with Radar Ring)
const createUserLocationIcon = () => {
  return L.divIcon({
    className: '',
    html: `
      <div class="relative flex items-center justify-center">
        <span class="absolute w-7 h-7 rounded-full bg-cyan-500/30 animate-radar"></span>
        <div class="w-4 h-4 rounded-full bg-cyan-500 border-2 border-white dark:border-zinc-900 shadow-md flex items-center justify-center text-white">
          <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
        </div>
      </div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -9],
  });
};

export const BangladeshMap = ({
  locations = [],
  selectedLocation,
  onSelectLocation,
  activeFilter = 'all',
  triggerReset = 0,
  userCoords = null,
  onMapClickLocation = null,
}) => {
  const { t, isBn } = useLanguage();
  const { isDark } = useTheme();

  // Hierarchical Navigation State (Problem 3)
  // hierarchy: 'national' | 'division' | 'district' | 'all_pins'
  const [selectedDivision, setSelectedDivision] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [targetView, setTargetView] = useState(null);
  const [clickedPoint, setClickedPoint] = useState(null);

  // Filter locations dynamically
  const filteredLocations = useMemo(() => {
    if (activeFilter === 'available') {
      return locations.filter((loc) => loc.status === 'available');
    }
    if (activeFilter === 'unavailable') {
      return locations.filter((loc) => loc.status === 'unavailable');
    }
    return locations;
  }, [locations, activeFilter]);

  // Reset hierarchy when map is reset
  useEffect(() => {
    if (triggerReset) {
      setSelectedDivision(null);
      setSelectedDistrict(null);
      setTargetView(null);
      setClickedPoint(null);
    }
  }, [triggerReset]);

  // If a location is selected from search or GPS, auto-set hierarchy to show pins
  useEffect(() => {
    if (selectedLocation?.division) {
      setSelectedDivision(selectedLocation.division);
      if (selectedLocation.district) {
        setSelectedDistrict(selectedLocation.district);
      }
    }
  }, [selectedLocation]);

  // 100% Free standard OpenStreetMap tiles (ZERO API KEY REQUIREMENT!)
  const tileLayerUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  // Compute Division Aggregates (Level 1)
  const divisionAggregates = useMemo(() => {
    const map = {};
    Object.keys(DIVISION_CENTERS).forEach((divKey) => {
      map[divKey] = {
        ...DIVISION_CENTERS[divKey],
        count: 0,
        unavailCount: 0,
        availCount: 0,
      };
    });

    filteredLocations.forEach((loc) => {
      if (loc.division && map[loc.division]) {
        map[loc.division].count++;
        if (loc.status === 'unavailable') map[loc.division].unavailCount++;
        if (loc.status === 'available') map[loc.division].availCount++;
      }
    });

    return Object.values(map);
  }, [filteredLocations]);

  // Compute District Aggregates for Selected Division (Level 2)
  const districtAggregates = useMemo(() => {
    if (!selectedDivision) return [];

    const distMap = new Map();
    const divLocs = filteredLocations.filter(
      (l) => l.division?.toLowerCase() === selectedDivision.toLowerCase()
    );

    divLocs.forEach((loc) => {
      const distName = loc.district || 'District';
      if (!distMap.has(distName)) {
        distMap.set(distName, {
          district: distName,
          districtBn: loc.districtBn || distName,
          division: loc.division,
          divisionBn: loc.divisionBn,
          latSum: 0,
          lngSum: 0,
          count: 0,
          unavailCount: 0,
          locations: [],
        });
      }
      const d = distMap.get(distName);
      d.count++;
      if (loc.latitude && loc.longitude) {
        d.latSum += loc.latitude;
        d.lngSum += loc.longitude;
      }
      if (loc.status === 'unavailable') d.unavailCount++;
      d.locations.push(loc);
    });

    return Array.from(distMap.values()).map((d) => ({
      ...d,
      lat: d.count > 0 ? d.latSum / d.count : 23.81,
      lng: d.count > 0 ? d.lngSum / d.count : 90.41,
    }));
  }, [selectedDivision, filteredLocations]);

  // Locations to display (Level 3: when division/district selected or all pins)
  const visiblePinLocations = useMemo(() => {
    if (!selectedDivision) return [];
    if (selectedDistrict) {
      return filteredLocations.filter(
        (l) =>
          l.division?.toLowerCase() === selectedDivision.toLowerCase() &&
          l.district?.toLowerCase() === selectedDistrict.toLowerCase()
      );
    }
    return filteredLocations.filter(
      (l) => l.division?.toLowerCase() === selectedDivision.toLowerCase()
    );
  }, [selectedDivision, selectedDistrict, filteredLocations]);

  // Drill down into a Division
  const handleSelectDivision = (div) => {
    setSelectedDivision(div.nameEn);
    setSelectedDistrict(null);
    setTargetView({ lat: div.lat, lng: div.lng, zoom: 8.8 });
  };

  // Drill down into a District
  const handleSelectDistrict = (dist) => {
    setSelectedDistrict(dist.district);
    setTargetView({ lat: dist.lat, lng: dist.lng, zoom: 11 });
  };

  // Reset to All Bangladesh (Level 1)
  const handleBackToAllDivisions = () => {
    setSelectedDivision(null);
    setSelectedDistrict(null);
    setTargetView({ lat: BANGLADESH_CENTER[0], lng: BANGLADESH_CENTER[1], zoom: window.innerWidth < 768 ? 6.5 : 7.2 });
  };

  // Reset to Current Division (Level 2)
  const handleBackToDivision = () => {
    setSelectedDistrict(null);
    const divCenter = DIVISION_CENTERS[selectedDivision] || { lat: 23.81, lng: 90.41, zoom: 8.8 };
    setTargetView({ lat: divCenter.lat, lng: divCenter.lng, zoom: 8.8 });
  };

  // Handle map click picking (Problem 5)
  const handleMapClick = async (lat, lng) => {
    try {
      const resolved = await resolveGpsLocation(lat, lng, locations);
      const mapLocation = {
        _id: `map_${lat.toFixed(4)}_${lng.toFixed(4)}`,
        nameBn: resolved?.nameBn || `ম্যাপ অবস্থান (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
        nameEn: resolved?.nameEn || `Map Pin (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
        district: resolved?.district || 'বাংলাদেশ',
        districtBn: resolved?.districtBn || 'বাংলাদেশ',
        division: resolved?.division || 'Dhaka',
        divisionBn: resolved?.divisionBn || 'ঢাকা',
        latitude: lat,
        longitude: lng,
        isMapClick: true,
        isGpsCustom: true,
      };

      setClickedPoint(mapLocation);
      if (onMapClickLocation) {
        onMapClickLocation(mapLocation);
      }
    } catch (err) {
      console.warn('Map click resolution error:', err);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[420px] bg-stone-100 dark:bg-[#0a0a0b] select-none transition-colors">
      <MapContainer
        center={BANGLADESH_CENTER}
        zoom={window.innerWidth < 768 ? 6.5 : 7.2}
        minZoom={6}
        maxZoom={18}
        maxBounds={BANGLADESH_BOUNDS}
        maxBoundsViscosity={0.8}
        zoomControl={false}
        scrollWheelZoom={true}
        className="w-full h-full z-0 font-sans"
        attributionControl={false}
      >
        <TileLayer
          url={tileLayerUrl}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />

        <MapController
          selectedLocation={selectedLocation}
          userCoords={userCoords}
          triggerReset={triggerReset}
          targetView={targetView}
        />

        {/* Listen for map clicks anywhere */}
        <MapClickHandler onMapClick={handleMapClick} />

        {/* LEVEL 1: Division Cluster Badges (When at National View) */}
        {!selectedDivision &&
          divisionAggregates.map((div) => (
            <Marker
              key={div.nameEn}
              position={[div.lat, div.lng]}
              icon={createDivisionBadgeIcon(div.nameBn, div.count, div.unavailCount)}
              eventHandlers={{
                click: () => handleSelectDivision(div),
              }}
            />
          ))}

        {/* LEVEL 2: District Badges (When Division is selected and no district yet) */}
        {selectedDivision && !selectedDistrict &&
          districtAggregates.map((dist) => (
            <Marker
              key={dist.district}
              position={[dist.lat, dist.lng]}
              icon={createDistrictBadgeIcon(dist.districtBn, dist.count, dist.unavailCount)}
              eventHandlers={{
                click: () => handleSelectDistrict(dist),
              }}
            />
          ))}

        {/* LEVEL 3 & 4: Actual Upazila / Location Pins */}
        {selectedDivision &&
          visiblePinLocations.map((loc) => {
            if (!loc.latitude || !loc.longitude) return null;
            const isSelected = selectedLocation?._id === loc._id || selectedLocation?.slug === loc.slug;
            return (
              <Marker
                key={loc._id || loc.slug}
                position={[loc.latitude, loc.longitude]}
                icon={createCustomMarkerIcon(loc.status, isSelected)}
                eventHandlers={{
                  click: (e) => {
                    L.DomEvent.stopPropagation(e);
                    if (onSelectLocation) onSelectLocation(loc);
                  },
                }}
              />
            );
          })}

        {/* Map-Click Picked Location Marker (Problem 5) */}
        {clickedPoint && (
          <Marker
            position={[clickedPoint.latitude, clickedPoint.longitude]}
            icon={createMapClickIcon()}
          >
            <Popup className="custom-popup" autoPan={true}>
              <div className="p-2 space-y-1.5 min-w-[180px] text-xs">
                <div className="flex items-center gap-1 text-orange-600 font-extrabold">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{isBn ? 'ম্যাপে চিহ্নিত এলাকা' : 'Pinned Map Location'}</span>
                </div>
                <div className="font-bold text-stone-900 text-xs">
                  {isBn ? clickedPoint.nameBn : clickedPoint.nameEn}
                </div>
                <div className="text-[10px] text-stone-500">
                  {isBn ? `${clickedPoint.districtBn} জেলা` : `${clickedPoint.district}`} &bull; ({clickedPoint.latitude.toFixed(3)}, {clickedPoint.longitude.toFixed(3)})
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectLocation) onSelectLocation(clickedPoint);
                  }}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-orange-500 text-white font-bold text-[11px] hover:bg-orange-600 transition-colors mt-1 shadow-xs"
                >
                  {isBn ? '🚀 এই অবস্থানে রিপোর্ট দিন' : 'Report at this Location'}
                </button>
              </div>
            </Popup>
          </Marker>
        )}

        {/* User GPS Location Marker */}
        {userCoords && (
          <>
            <Marker
              position={[userCoords.latitude, userCoords.longitude]}
              icon={createUserLocationIcon()}
            >
              <Popup className="custom-popup">
                <div className="p-2 space-y-1.5 min-w-[170px] text-xs">
                  <div className="flex items-center gap-1.5 text-cyan-600 font-bold">
                    <Navigation className="w-3.5 h-3.5" />
                    <span>{isBn ? 'আপনার বর্তমান GPS অবস্থান' : 'Your GPS Location'}</span>
                  </div>
                  <div className="text-[10px] text-stone-500">
                    {userCoords.latitude.toFixed(4)}, {userCoords.longitude.toFixed(4)}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectLocation) {
                        onSelectLocation({
                          _id: `gps_${userCoords.latitude.toFixed(4)}_${userCoords.longitude.toFixed(4)}`,
                          nameBn: `GPS এলাকা (${userCoords.latitude.toFixed(4)}, ${userCoords.longitude.toFixed(4)})`,
                          nameEn: `GPS Area (${userCoords.latitude.toFixed(4)}, ${userCoords.longitude.toFixed(4)})`,
                          district: 'বাংলাদেশ',
                          districtBn: 'বাংলাদেশ',
                          division: 'Dhaka',
                          divisionBn: 'ঢাকা',
                          latitude: userCoords.latitude,
                          longitude: userCoords.longitude,
                          isGpsCustom: true,
                          isGpsDetected: true,
                        });
                      }
                    }}
                    className="w-full py-1 px-2 rounded-lg bg-orange-500 text-white font-bold text-[11px] hover:bg-orange-600 transition-colors mt-1"
                  >
                    {isBn ? 'এখানে রিপোর্ট দিন' : 'Report Here'}
                  </button>
                </div>
              </Popup>
            </Marker>
            <Circle
              center={[userCoords.latitude, userCoords.longitude]}
              radius={userCoords.accuracy || 1200}
              pathOptions={{
                color: '#06b6d4',
                fillColor: '#06b6d4',
                fillOpacity: 0.08,
                weight: 1,
                dashArray: '3, 6',
              }}
            />
          </>
        )}
      </MapContainer>

      {/* Hierarchical Breadcrumb Navigation Overlay (Problem 3) */}
      {selectedDivision && (
        <div className="absolute top-[148px] md:top-20 left-3 md:left-4 z-20 pointer-events-auto bg-white/95 dark:bg-[#111214]/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-stone-200/90 dark:border-zinc-800 shadow-md flex items-center gap-1.5 text-xs font-bold text-stone-800 dark:text-zinc-200 animate-in fade-in duration-200 max-w-[calc(100vw-24px)] overflow-x-auto">
          <button
            type="button"
            onClick={handleBackToAllDivisions}
            className="flex items-center gap-1 hover:text-orange-500 text-stone-500 dark:text-zinc-400 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{isBn ? 'সকল বিভাগ' : 'All Divisions'}</span>
          </button>

          <ChevronRight className="w-3.5 h-3.5 text-stone-400" />

          <button
            type="button"
            onClick={handleBackToDivision}
            className={`hover:text-orange-500 transition-colors ${!selectedDistrict ? 'text-orange-600 dark:text-orange-400' : 'text-stone-600 dark:text-zinc-400'}`}
          >
            {isBn ? (DIVISION_CENTERS[selectedDivision]?.nameBn || selectedDivision) : selectedDivision}
          </button>

          {selectedDistrict && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
              <span className="text-orange-600 dark:text-orange-400 font-extrabold truncate max-w-[120px]">
                {selectedDistrict}
              </span>
            </>
          )}
        </div>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-auto bg-white/95 dark:bg-[#111214]/95 backdrop-blur-md px-3 py-2 rounded-xl border border-stone-200/90 dark:border-zinc-800 shadow-sm flex items-center gap-3 text-[10px] sm:text-xs font-semibold text-stone-700 dark:text-zinc-300">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20"></span>
          <span>{t('statusYes') || 'আছে'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-500/20"></span>
          <span>{t('statusNo') || 'নেই'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-stone-400 dark:bg-zinc-600"></span>
          <span>{t('statusUncertain') || 'অনিশ্চিত'}</span>
        </div>
      </div>
    </div>
  );
};
export default BangladeshMap;
