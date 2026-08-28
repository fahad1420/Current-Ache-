import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import { Zap, PlugZap, HelpCircle, ArrowRight, Navigation, MapPin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { resolveGpsLocation } from '../utils/geolocation';

// Geographic center and bounds of Bangladesh
const BANGLADESH_CENTER = [23.8103, 90.4125];
const BANGLADESH_BOUNDS = [
  [20.0, 87.5],
  [27.0, 93.0],
];

// Map Event Listener for Map-Click location picking (Problem 5)
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      if (onMapClick) {
        onMapClick(lat, lng);
      }
    },
  });
  return null;
};

// Helper controller component to manage map sizing, pan & zoom
const MapController = ({ selectedLocation, userCoords, triggerReset }) => {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 600);

    const handleResize = () => {
      map.invalidateSize();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  // Smooth pan/zoom when a location is selected
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
        duration: 1.4,
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

// Marker cluster layer with smooth zooming
const MarkerClusterWrapper = ({ locations, onSelectLocation, selectedLocation }) => {
  const map = useMap();
  const clusterGroupRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    const clusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 35, // Natural regional clustering
      spiderfyOnMaxZoom: false, // Prevents radial spiderweb explosion!
      zoomToBoundsOnClick: true, // Smooth zoom to cluster bounds
      disableClusteringAtZoom: 12, // Shows individual pins cleanly at street level
      iconCreateFunction: (cluster) => {
        const markers = cluster.getAllChildMarkers();
        let availableCount = 0;
        let unavailableCount = 0;

        markers.forEach((m) => {
          if (m.options.status === 'available') availableCount++;
          if (m.options.status === 'unavailable') unavailableCount++;
        });

        const total = markers.length;
        let clusterBg = 'bg-stone-800 text-white border-stone-600';

        if (unavailableCount > 0 && availableCount === 0) {
          clusterBg = 'bg-rose-600 text-white border-rose-200';
        } else if (availableCount > 0 && unavailableCount === 0) {
          clusterBg = 'bg-emerald-600 text-white border-emerald-200';
        } else if (unavailableCount > 0 && availableCount > 0) {
          clusterBg = 'bg-orange-500 text-white border-orange-200';
        }

        return L.divIcon({
          html: `<div class="flex items-center justify-center rounded-full font-bold text-xs border shadow-sm ${clusterBg}" style="width: 28px; height: 28px;">${total}</div>`,
          className: '',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
      },
    });

    locations.forEach((loc) => {
      if (!loc.latitude || !loc.longitude) return;
      const isSelected = selectedLocation?._id === loc._id || selectedLocation?.slug === loc.slug;
      const icon = createCustomMarkerIcon(loc.status, isSelected);

      const marker = L.marker([loc.latitude, loc.longitude], {
        icon,
        status: loc.status || 'insufficient_data',
      });

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectLocation(loc);
      });

      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;

    return () => {
      if (clusterGroupRef.current) {
        map.removeLayer(clusterGroupRef.current);
      }
    };
  }, [map, locations, selectedLocation, onSelectLocation]);

  return null;
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

  // Reliable, 100% free tile layers without any API keys
  const tileLayerUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

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
        />

        {/* Listen for map clicks */}
        <MapClickHandler onMapClick={handleMapClick} />

        {/* Clustered Marker Layer */}
        <MarkerClusterWrapper
          locations={filteredLocations}
          onSelectLocation={onSelectLocation}
          selectedLocation={selectedLocation}
        />

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
                          isGpsDetected: true
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
