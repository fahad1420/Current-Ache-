import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import { Zap, PlugZap, HelpCircle, ArrowRight, Navigation } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

// Geographic center and bounds of Bangladesh
const BANGLADESH_CENTER = [23.8103, 90.4125];
const BANGLADESH_BOUNDS = [
  [20.0, 87.5],
  [27.0, 93.0],
];

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

  // Smooth pan/zoom when a location is selected from search, list, or GPS
  useEffect(() => {
    if (selectedLocation?.latitude && selectedLocation?.longitude) {
      map.flyTo([selectedLocation.latitude, selectedLocation.longitude], 12, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  }, [selectedLocation, map]);

  // Smooth pan/zoom when user GPS coordinates are detected
  useEffect(() => {
    if (userCoords?.latitude && userCoords?.longitude && !selectedLocation) {
      map.flyTo([userCoords.latitude, userCoords.longitude], 12, {
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

// Create custom glowing marker icons dynamically for ALL 593 locations
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
    // Neutral dot for locations with insufficient / no recent data (all 593 upazilas)
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

// User GPS Location Marker (Distinct Cyan Dot with Radar Ring)
const createUserLocationIcon = () => {
  return L.divIcon({
    className: '',
    html: `
      <div class="relative flex items-center justify-center">
        <span class="absolute w-6 h-6 rounded-full bg-cyan-500/30 animate-radar"></span>
        <div class="w-3.5 h-3.5 rounded-full bg-cyan-500 border-2 border-white dark:border-zinc-900 shadow-sm flex items-center justify-center text-white">
          <div class="w-1 h-1 rounded-full bg-white"></div>
        </div>
      </div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  });
};

// Marker cluster layer for ALL 593 locations
const MarkerClusterWrapper = ({ locations, onSelectLocation, selectedLocation }) => {
  const map = useMap();
  const clusterGroupRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    const clusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 40,
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster) => {
        const markers = cluster.getAllChildMarkers();
        let availableCount = 0;
        let unavailableCount = 0;

        markers.forEach((m) => {
          if (m.options.status === 'available') availableCount++;
          if (m.options.status === 'unavailable') unavailableCount++;
        });

        const total = markers.length;
        let clusterBg = 'bg-zinc-800 text-white border-zinc-700';

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
}) => {
  const { t, isBn } = useLanguage();
  const { isDark } = useTheme();

  // Filter locations dynamically while preserving ALL 593 administrative locations
  const filteredLocations = useMemo(() => {
    if (activeFilter === 'available') {
      return locations.filter((loc) => loc.status === 'available');
    }
    if (activeFilter === 'unavailable') {
      return locations.filter((loc) => loc.status === 'unavailable');
    }
    return locations;
  }, [locations, activeFilter]);

  // Standard OpenStreetMap Tiles (100% Free, Zero API Keys, Zero Watermarks)
  // In Dark Mode, CSS filter .dark .leaflet-tile-pane renders a high-contrast dark basemap!
  const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ width: '100%', height: '100%', minHeight: '480px' }}
    >
      <MapContainer
        center={BANGLADESH_CENTER}
        zoom={window.innerWidth < 768 ? 6.5 : 7.2}
        minZoom={6}
        maxZoom={18}
        maxBounds={BANGLADESH_BOUNDS}
        maxBoundsViscosity={0.7}
        scrollWheelZoom={true}
        zoomControl={false}
        className="w-full h-full"
        style={{ width: '100%', height: '100%', minHeight: '480px' }}
      >
        <TileLayer
          key={isDark ? 'osm-dark' : 'osm-light'}
          attribution={tileAttribution}
          url={tileUrl}
          subdomains={['a', 'b', 'c']}
          maxZoom={19}
        />

        <MapController
          selectedLocation={selectedLocation}
          userCoords={userCoords}
          triggerReset={triggerReset}
        />

        {/* User GPS Location Marker */}
        {userCoords?.latitude && userCoords?.longitude && (
          <>
            <Circle
              center={[userCoords.latitude, userCoords.longitude]}
              radius={400}
              pathOptions={{
                color: '#06b6d4',
                fillColor: '#06b6d4',
                fillOpacity: 0.12,
                weight: 1,
              }}
            />
            <Marker
              position={[userCoords.latitude, userCoords.longitude]}
              icon={createUserLocationIcon()}
            >
              <Popup className="custom-popup" closeButton={false}>
                <div className="p-2 bg-white dark:bg-[#111214] text-xs font-bold text-stone-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-cyan-500 fill-current" />
                  <span>{t('youAreHere')}</span>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* Marker Cluster for ALL 593 administrative locations */}
        <MarkerClusterWrapper
          locations={filteredLocations}
          onSelectLocation={onSelectLocation}
          selectedLocation={selectedLocation}
        />
      </MapContainer>
    </div>
  );
};
