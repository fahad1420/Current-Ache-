import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Zap,
  PlugZap,
  Clock,
  MapPin,
  Calendar,
  Sparkles,
  Wifi,
  WifiOff,
  Navigation,
  Compass,
  BarChart3,
  Info,
  X,
  ArrowRight,
  Send,
  Loader2,
  Search,
  Crosshair
} from 'lucide-react';
import { BangladeshMap } from '../components/BangladeshMap';
import { SearchBar } from '../components/SearchBar';
import { StatusHUD } from '../components/StatusHUD';
import { SmartReportPanel } from '../components/SmartReportPanel';
import { AreaHistoryDrawer } from '../components/AreaHistoryDrawer';
import { RecentReportsTicker } from '../components/RecentReportsTicker';
import { DisclaimerBox } from '../components/DisclaimerBox';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { findNearestLocation, resolveGpsLocation } from '../utils/geolocation';
import defaultLocations from '../data/bangladeshLocations.json';
import api from '../services/api';

export const Home = () => {
  const [locations, setLocations] = useState(defaultLocations);
  const [summary, setSummary] = useState({
    total: defaultLocations.length,
    available: 0,
    unavailable: 0,
    insufficient: defaultLocations.length,
  });
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyTargetLocation, setHistoryTargetLocation] = useState(null);
  const [triggerReset, setTriggerReset] = useState(0);

  // GPS / User coords state
  const [userCoords, setUserCoords] = useState(null);
  const [detectedLocation, setDetectedLocation] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('idle'); // 'idle' | 'searching' | 'detected' | 'denied'

  // Network offline/online indicator
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [networkToast, setNetworkToast] = useState('');

  const { addToast } = useToast();
  const { t, isBn } = useLanguage();

  const fetchMapData = useCallback(async () => {
    try {
      const res = await api.get('/locations/map-status');
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setLocations(res.data.data);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }
    } catch (err) {
      console.warn('Map live status fetch error:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchMapData();
    const interval = setInterval(fetchMapData, 30000);
    return () => clearInterval(interval);
  }, [fetchMapData]);

  // Network Online/Offline listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setNetworkToast(t('networkOnline') || 'ইন্টারনেট সংযোগ চালু হয়েছে');
      fetchMapData();
      setTimeout(() => setNetworkToast(''), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setNetworkToast(t('networkOffline') || 'ইন্টারনেট সংযোগ বিচ্ছিন্ন');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchMapData, t]);

  const handleResetMap = () => {
    setSelectedLocation(null);
    setActiveFilter('all');
    setTriggerReset((prev) => prev + 1);
  };

  const handleSelectLocation = (loc) => {
    const matched = locations.find((l) => l._id === loc._id || l.slug === loc.slug) || loc;
    setSelectedLocation(matched);
    setHistoryTargetLocation(matched);
  };

  // User-Triggered Near Me / GPS Button Handler
  const handleNearMe = () => {
    if (!navigator.geolocation) {
      addToast(t('gpsDeniedMsg') || 'আপনার ব্রাউজারে লোকেশন পারমিশন চালু নেই।', 'error');
      return;
    }

    setGpsStatus('searching');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setUserCoords({ latitude, longitude, accuracy });
        try {
          const detected = await resolveGpsLocation(latitude, longitude, locations);
          if (detected) {
            setDetectedLocation(detected);
            setSelectedLocation(detected);
            setGpsStatus('detected');
            addToast(
              isBn
                ? `🛰️ GPS অবস্থান সনাক্ত হয়েছে: ${detected.nameBn} (${detected.districtBn})`
                : `🛰️ GPS Location Detected: ${detected.nameEn} (${detected.district})`,
              'info'
            );
          }
        } catch (err) {
          setGpsStatus('idle');
        }
      },
      (error) => {
        setGpsStatus('denied');
        if (error.code === 1) { // PERMISSION_DENIED
          addToast(
            isBn
              ? 'আপনার ব্রাউজারে লোকেশন পারমিশন বন্ধ আছে। পারমিশন চালু করুন অথবা সার্চ বক্সে এলাকার নাম লিখুন।'
              : 'Location permission is denied. Please allow location access or search manually.',
            'error'
          );
        } else if (error.code === 2) { // POSITION_UNAVAILABLE
          addToast(
            isBn
              ? 'আপনার ফোনের জিপিএস/লোকেশন বন্ধ আছে, সেটি খুলুন অথবা সার্চ বক্সে এলাকার নাম লিখুন'
              : "Your phone's GPS/location is turned off. Please turn it on, or enter an area name in the search box.",
            'error'
          );
        } else if (error.code === 3) { // TIMEOUT
          addToast(
            isBn
              ? 'অবস্থান শনাক্তকরণে অতিরিক্ত সময় লেগেছে। পুনরায় চেষ্টা করুন অথবা সার্চ বক্সে এলাকার নাম লিখুন।'
              : 'Location detection timed out. Please try again or search manually.',
            'error'
          );
        } else {
          addToast(
            isBn
              ? 'আপনার ফোনের জিপিএস/লোকেশন বন্ধ আছে, সেটি খুলুন অথবা সার্চ বক্সে এলাকার নাম লিখুন'
              : "Your phone's GPS/location is turned off. Please turn it on, or enter an area name in the search box.",
            'error'
          );
        }
      },
      { timeout: 12000, enableHighAccuracy: true }
    );
  };

  // Map click location handler (Problem 5)
  const handleMapClickLocation = (mapLoc) => {
    setSelectedLocation(mapLoc);
    setHistoryTargetLocation(mapLoc);
  };

  const [reportRefreshKey, setReportRefreshKey] = useState(0);

  const handleReportSuccess = () => {
    fetchMapData();
    setReportRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="relative flex flex-col min-h-[calc(100vh-52px)] bg-[#fafaf9] dark:bg-[#0a0a0b] transition-colors pb-14 lg:pb-0">
      {/* Network Status Toast */}
      {networkToast && (
        <div className={`fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-200 ${
          isOnline ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        }`}>
          {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          <span>{networkToast}</span>
        </div>
      )}

      {/* 1. Main Interactive Map Canvas Stage */}
      <div className="relative flex-1 w-full h-[76vh] sm:h-[82vh] lg:h-[calc(100vh-52px)] overflow-hidden">
        <main className="relative w-full h-full min-h-[480px]">
          {/* Leaflet Map Component */}
          <BangladeshMap
            locations={locations}
            selectedLocation={selectedLocation}
            onSelectLocation={handleSelectLocation}
            activeFilter={activeFilter}
            triggerReset={triggerReset}
            userCoords={userCoords}
            onMapClickLocation={handleMapClickLocation}
          />

          {/* Top Controls Bar */}
          <div className="absolute top-4 left-4 right-4 z-20 pointer-events-none flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Report CTA Button (Desktop & Tablet) */}
            <div className="hidden lg:block pointer-events-auto shrink-0">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-extrabold text-xs shadow-md flex items-center gap-2 transition-all hover:scale-105"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>{isBn ? '⚡ রিপোর্ট দিন' : '⚡ Report Status'}</span>
              </button>
            </div>

            {/* Center: SearchBar Overlay */}
            <div className="pointer-events-auto w-full max-w-md mx-auto">
              <SearchBar
                onSelect={handleSelectLocation}
                onNearMe={handleNearMe}
                isLocating={gpsStatus === 'searching'}
              />

              {/* GPS / Map Click Detected Area Banner */}
              {(detectedLocation || selectedLocation?.isMapClick) && (
                <div className="mt-2 p-2.5 px-3.5 rounded-xl bg-white/95 dark:bg-[#111214]/95 backdrop-blur-md border border-stone-200/90 dark:border-zinc-800 shadow-md flex items-center justify-between gap-3 text-xs animate-in fade-in duration-200 w-full">
                  <div className="flex items-center gap-2 truncate">
                    <Navigation className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                    <span className="font-bold text-stone-900 dark:text-zinc-100 truncate">
                      {selectedLocation?.isMapClick ? (isBn ? 'ম্যাপে চিহ্নিত:' : 'Map Pinned:') : (isBn ? 'GPS অবস্থান:' : 'GPS Location:')}{' '}
                      {isBn ? (selectedLocation?.nameBn || detectedLocation?.nameBn) : (selectedLocation?.nameEn || detectedLocation?.nameEn)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(true)}
                    className="px-3 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition-colors shrink-0 flex items-center gap-1 shadow-xs"
                  >
                    <span>{isBn ? 'রিপোর্ট দিন' : 'Report'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Right: Status HUD */}
            <div className="pointer-events-auto shrink-0 self-center md:self-auto">
              <StatusHUD
                summary={summary}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                onResetMap={handleResetMap}
                onMyLocation={handleNearMe}
                isLocating={gpsStatus === 'searching'}
              />
            </div>
          </div>

          {/* Selected Location Contextual Card (Bottom-Right on Map) */}
          {selectedLocation && (
            <div className="absolute bottom-6 right-4 left-4 sm:left-auto sm:right-6 sm:w-84 z-20 pointer-events-auto bg-white/95 dark:bg-[#111214]/95 backdrop-blur-md p-4 rounded-2xl border border-stone-200/90 dark:border-zinc-800 shadow-xl space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-stone-400 dark:text-zinc-500 uppercase tracking-wider block">
                    {isBn ? `${selectedLocation.divisionBn} বিভাগ` : `${selectedLocation.division}`}
                  </span>
                  <h3 className="font-bold text-base text-stone-900 dark:text-zinc-100">
                    {isBn ? selectedLocation.nameBn : selectedLocation.nameEn}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-zinc-400">
                    {isBn ? selectedLocation.districtBn : selectedLocation.district} জেলা
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedLocation(null)}
                  className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-zinc-200"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-stone-50 dark:bg-[#111214]/60 border border-stone-200/80 dark:border-zinc-700/80 text-xs">
                <span className="text-stone-600 dark:text-zinc-400 font-medium">{t('currentConsensus') || 'বর্তমান অবস্থা'}</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded-md ${
                    selectedLocation.status === 'available'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : selectedLocation.status === 'unavailable'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-stone-200 text-stone-700 dark:bg-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {selectedLocation.status === 'available'
                    ? (t('statusYes') || 'আছে')
                    : selectedLocation.status === 'unavailable'
                    ? (t('statusNo') || 'নেই')
                    : (t('statusUncertain') || 'অনিশ্চিত')}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(true)}
                  className="py-2 px-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center justify-center gap-1 transition-colors shadow-xs"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>{isBn ? 'রিপোর্ট দিন' : 'Report'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setHistoryTargetLocation(selectedLocation);
                    setIsHistoryOpen(true);
                  }}
                  className="py-2 px-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-stone-900 dark:text-zinc-100 font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                >
                  <Clock className="w-3.5 h-3.5 text-orange-500" />
                  <span>{t('viewFullHistory') || 'ইতিহাস'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Mobile Bottom Sticky Reporting CTA */}
          <div className="fixed bottom-16 left-0 right-0 z-30 flex justify-center px-4 lg:hidden pointer-events-none pb-safe">
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="pointer-events-auto w-full max-w-md py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-orange-950/20 flex items-center justify-center gap-2 transition-all"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>{isBn ? '⚡ আপনার এলাকায় কারেন্ট আছে? রিপোর্ট দিন' : '⚡ Report Power Status in Your Area'}</span>
            </button>
          </div>
        </main>
      </div>

      {/* Unified Responsive Report Modal / Bottom Sheet (Desktop, Laptop, Tablet, Mobile) */}
      <SmartReportPanel
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        selectedLocation={selectedLocation}
        onClearSelection={() => setSelectedLocation(null)}
        onReportSuccess={handleReportSuccess}
        allLocations={locations}
        onSelectLocation={handleSelectLocation}
        onNearMe={handleNearMe}
        isLocating={gpsStatus === 'searching'}
      />

      {/* Power Interruption History & Analytics Drawer */}
      <AreaHistoryDrawer
        location={historyTargetLocation}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onOpenReport={(loc) => {
          setSelectedLocation(loc);
          setIsReportModalOpen(true);
        }}
      />

      {/* 2. Below-the-Map Live Community Activity & Disclaimer */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full space-y-6">
        <RecentReportsTicker refreshTrigger={reportRefreshKey} />
        <DisclaimerBox />
      </section>
    </div>
  );
};
export default Home;
