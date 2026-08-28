import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BangladeshMap } from '../components/BangladeshMap';
import { SearchBar } from '../components/SearchBar';
import { SmartReportPanel } from '../components/SmartReportPanel';
import { StatusHUD } from '../components/StatusHUD';
import { AreaHistoryDrawer } from '../components/AreaHistoryDrawer';
import { RecentReportsTicker } from '../components/RecentReportsTicker';
import { DisclaimerBox } from '../components/DisclaimerBox';
import {
  Zap,
  PlugZap,
  WifiOff,
  Wifi,
  Navigation,
  ArrowRight,
  Crosshair,
  Search,
  Clock,
  MapPin,
  Send,
  Loader2,
  X,
  Layers,
  BarChart3,
  Compass,
  Calendar,
  Info
} from 'lucide-react';
import { findNearestLocation } from '../utils/geolocation';
import { toBn } from '../utils/banglaDigits';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';

export const Home = () => {
  const [locations, setLocations] = useState([]);
  const [summary, setSummary] = useState({ total: 593, available: 0, unavailable: 0, insufficient: 593 });
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [triggerReset, setTriggerReset] = useState(0);

  // Left Workspace Visibility State (Desktop)
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  // Floating History Drawer State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyTargetLocation, setHistoryTargetLocation] = useState(null);

  // Mobile Report Sheet State
  const [isMobileReportOpen, setIsMobileReportOpen] = useState(false);

  // Left Sidebar Form State
  const [reportStatus, setReportStatus] = useState('available');
  const [reportDuration, setReportDuration] = useState('just_now');
  const [customHours, setCustomHours] = useState('');
  const [customMins, setCustomMins] = useState('');
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // GPS States - ONLY triggered on explicit user click!
  const [userCoords, setUserCoords] = useState(null);
  const [detectedLocation, setDetectedLocation] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('idle'); // 'idle' | 'searching' | 'detected' | 'denied' | 'error'

  // Network State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [networkToast, setNetworkToast] = useState('');
  const { addToast } = useToast();
  const { t, isBn } = useLanguage();
  const locationPath = useLocation();

  const durationOptions = [
    { label: t('durJustNow'), value: 'just_now' },
    { label: t('dur15m'), value: '15_min' },
    { label: t('dur30m'), value: '30_min' },
    { label: t('dur1h'), value: '1_hour' },
    { label: t('dur2h'), value: '2_hours' },
    { label: t('dur4h'), value: '4_hours_plus' },
    { label: t('durCustom'), value: 'custom' },
  ];

  // Fetch real-time map data from backend
  const fetchMapData = useCallback(async () => {
    try {
      const res = await api.get('/locations/map-status');
      if (res.data?.success) {
        setLocations(res.data.data || []);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }
    } catch (err) {
      console.error('Error fetching map status data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMapData();
    const interval = setInterval(fetchMapData, 30000);
    return () => clearInterval(interval);
  }, [fetchMapData]);

  // Invalidate map size when sidebar expands or collapses
  const handleToggleSidebar = (visible) => {
    setIsSidebarVisible(visible);
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 50);
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 250);
  };

  // Network Online/Offline listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setNetworkToast(t('networkOnline'));
      fetchMapData();
      setTimeout(() => setNetworkToast(''), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setNetworkToast(t('networkOffline'));
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

  // Explicit User-Triggered Near Me / GPS Button Handler (NO automatic GPS on mount)
  const handleNearMe = () => {
    if (!navigator.geolocation) {
      addToast(t('gpsDeniedMsg'), 'error');
      return;
    }

    setGpsStatus('searching');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserCoords({ latitude, longitude });
        const nearest = findNearestLocation(latitude, longitude, locations);
        if (nearest) {
          setDetectedLocation(nearest);
          setSelectedLocation(nearest);
          setGpsStatus('detected');
          addToast(
            isBn
              ? `📍 আপনার কাছাকাছি এলাকা: ${nearest.nameBn} (${nearest.districtBn})`
              : `📍 Nearest area: ${nearest.nameEn} (${nearest.district})`,
            'info'
          );
        }
      },
      () => {
        setGpsStatus('denied');
        addToast(t('gpsDeniedMsg'), 'error');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Handle reporting from fixed sidebar
  const handleSidebarSubmit = async () => {
    if (!selectedLocation) {
      addToast(t('selectAreaFirstError'), 'error');
      return;
    }

    let calculatedCustomMinutes = null;
    if (reportDuration === 'custom') {
      const h = parseInt(customHours || '0', 10);
      const m = parseInt(customMins || '0', 10);
      calculatedCustomMinutes = (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
      if (calculatedCustomMinutes <= 0) {
        calculatedCustomMinutes = 10;
      }
    }

    setSubmittingReport(true);
    try {
      const res = await api.post('/reports', {
        locationId: selectedLocation._id,
        status: reportStatus,
        duration: reportDuration || 'just_now',
        customMinutes: calculatedCustomMinutes,
        source: 'web',
      });

      if (res.data?.success) {
        const areaName = isBn ? selectedLocation.nameBn : selectedLocation.nameEn;
        addToast(
          isBn ? `✓ রিপোর্ট গ্রহণ করা হয়েছে: ${areaName}` : `✓ Report recorded for ${areaName}`,
          'success'
        );
        fetchMapData();
      }
    } catch (err) {
      addToast(err.response?.data?.message || t('reportFailedToast'), 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  const sidebarSearchResults = sidebarSearchQuery.trim()
    ? locations.filter(
        (l) =>
          l.nameBn?.toLowerCase().includes(sidebarSearchQuery.toLowerCase()) ||
          l.nameEn?.toLowerCase().includes(sidebarSearchQuery.toLowerCase()) ||
          l.district?.toLowerCase().includes(sidebarSearchQuery.toLowerCase()) ||
          l.districtBn?.includes(sidebarSearchQuery)
      ).slice(0, 5)
    : [];

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

      {/* 1. Main Workspace: Left Fixed Workspace + Right Large Map */}
      <div className="flex flex-col lg:flex-row flex-1 w-full h-[76vh] sm:h-[82vh] lg:h-[calc(100vh-52px)] overflow-hidden">
        {/* Left Fixed Reporting Workspace (Desktop) */}
        {isSidebarVisible && (
          <aside className="hidden lg:flex flex-col justify-between w-[340px] xl:w-[360px] bg-white dark:bg-[#111214] border-r p-4 xl:p-5 z-20 shrink-0 shadow-sm animate-in slide-in-from-left duration-200">
            <div className="space-y-4">
              {/* Workspace Header */}
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-zinc-800 pb-3">
                <div>
                  <h2 className="text-base font-bold text-stone-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                    {t('reportPanelTitle')}
                  </h2>
                  <p className="text-[11px] text-stone-500 dark:text-zinc-400 mt-0.5">
                    {t('reportPanelSubtitle')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleSidebar(false)}
                  className="px-2 py-1 rounded-lg text-xs font-semibold text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
                  title={t('hidePanel')}
                >
                  {t('hidePanel')}
                </button>
              </div>

              {/* Step 1: Area Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-700 dark:text-zinc-300">
                    {t('stepAreaLabel')}
                  </label>
                  {selectedLocation && (
                    <button
                      type="button"
                      onClick={() => setSelectedLocation(null)}
                      className="text-[11px] text-orange-500 dark:text-orange-400 hover:underline font-bold"
                    >
                      {t('changeAreaBtn')}
                    </button>
                  )}
                </div>

                {selectedLocation ? (
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-[#111214]/60 border border-stone-200/80 dark:border-zinc-700/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-stone-900 dark:text-zinc-100">
                        {isBn ? selectedLocation.nameBn : selectedLocation.nameEn}
                      </span>
                      <span className="text-[10px] text-stone-400 dark:text-zinc-500 font-normal">
                        ({isBn ? selectedLocation.nameEn : selectedLocation.nameBn})
                      </span>
                    </div>
                    <div className="text-xs text-stone-500 dark:text-zinc-400">
                      {isBn
                        ? `${selectedLocation.divisionBn} বিভাগ • ${selectedLocation.districtBn} জেলা`
                        : `${selectedLocation.district} • ${selectedLocation.division}`}
                    </div>

                    {/* View History Trigger Link */}
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryTargetLocation(selectedLocation);
                        setIsHistoryOpen(true);
                      }}
                      className="text-xs font-bold text-orange-500 dark:text-orange-400 hover:underline pt-1 flex items-center gap-1"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{t('viewFullHistory')}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        value={sidebarSearchQuery}
                        onChange={(e) => setSidebarSearchQuery(e.target.value)}
                        placeholder={isBn ? "উপজেলা বা এলাকার নাম লিখুন..." : "Search upazila or area..."}
                        className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-[#111214] border border-stone-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-stone-900 dark:text-zinc-100 placeholder:text-stone-400 font-medium"
                      />
                    </div>

                    {/* Quick GPS Location Button */}
                    <button
                      type="button"
                      onClick={handleNearMe}
                      disabled={gpsStatus === 'searching'}
                      className="w-full py-1.5 px-2.5 rounded-xl bg-stone-50 dark:bg-[#111214]/80 hover:bg-orange-50 dark:hover:bg-orange-950/40 text-stone-700 dark:text-zinc-300 hover:text-orange-600 dark:hover:text-orange-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-stone-200 dark:border-zinc-700"
                    >
                      <Crosshair className={`w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 ${gpsStatus === 'searching' ? 'animate-spin' : ''}`} />
                      <span>{gpsStatus === 'searching' ? t('locatingBtn') : t('useMyLocation')}</span>
                    </button>

                    {/* Autocomplete Results */}
                    {sidebarSearchResults.length > 0 && (
                      <div className="bg-white dark:bg-[#111214] rounded-xl border border-stone-200 dark:border-zinc-700 shadow-lg overflow-hidden divide-y divide-stone-100 dark:divide-zinc-800">
                        {sidebarSearchResults.map((loc) => (
                          <button
                            key={loc._id}
                            type="button"
                            onClick={() => {
                              setSelectedLocation(loc);
                              setSidebarSearchQuery('');
                            }}
                            className="w-full p-2 text-left text-xs hover:bg-orange-50 dark:hover:bg-zinc-800/60 flex items-center justify-between transition-colors"
                          >
                            <div>
                              <div className="font-bold text-stone-900 dark:text-zinc-100 text-xs">
                                {isBn ? loc.nameBn : loc.nameEn}
                              </div>
                              <div className="text-[10px] text-stone-400">
                                {isBn ? `${loc.districtBn} জেলা` : `${loc.district}`}
                              </div>
                            </div>
                            <MapPin className="w-3.5 h-3.5 text-orange-500" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step 2: Status Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 dark:text-zinc-300 block">
                  {t('stepStatusLabel')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReportStatus('available')}
                    className={`py-2.5 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all ${
                      reportStatus === 'available'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-[#111214] text-stone-700 dark:text-zinc-300 border-stone-200 dark:border-zinc-700 hover:bg-stone-50 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>{t('statusAvailableBtn')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReportStatus('unavailable')}
                    className={`py-2.5 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all ${
                      reportStatus === 'unavailable'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white dark:bg-[#111214] text-stone-700 dark:text-zinc-300 border-stone-200 dark:border-zinc-700 hover:bg-stone-50 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <PlugZap className="w-3.5 h-3.5" />
                    <span>{t('statusUnavailableBtn')}</span>
                  </button>
                </div>
              </div>

              {/* Step 3: Duration Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 dark:text-zinc-300 block">
                  {t('stepDurationLabel')}
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
                  {durationOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setReportDuration(opt.value)}
                      className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all border ${
                        reportDuration === opt.value
                          ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                          : 'bg-stone-50 dark:bg-zinc-800/80 text-stone-700 dark:text-zinc-300 border-stone-200 dark:border-zinc-700 hover:bg-stone-100 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Custom Duration Fields */}
                {reportDuration === 'custom' && (
                  <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-zinc-800/80 border border-stone-200 dark:border-zinc-700 space-y-1.5 mt-2">
                    <span className="text-[10px] font-bold text-stone-600 dark:text-zinc-400 block">
                      {t('setCustomDuration')}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="48"
                          value={customHours}
                          onChange={(e) => setCustomHours(e.target.value)}
                          placeholder="0"
                          className="w-full p-1.5 rounded-lg bg-white dark:bg-[#111214] border border-stone-200 dark:border-zinc-700 text-xs font-bold text-center"
                        />
                        <span className="text-[10px] text-stone-500">{t('customHours')}</span>
                      </div>

                      <div className="flex-1 flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={customMins}
                          onChange={(e) => setCustomMins(e.target.value)}
                          placeholder="30"
                          className="w-full p-1.5 rounded-lg bg-white dark:bg-[#111214] border border-stone-200 dark:border-zinc-700 text-xs font-bold text-center"
                        />
                        <span className="text-[10px] text-stone-500">{t('customMins')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Step 4: Primary CTA */}
            <div className="pt-3 border-t border-stone-100 dark:border-zinc-800 space-y-1.5">
              <button
                type="button"
                disabled={submittingReport || !selectedLocation}
                onClick={handleSidebarSubmit}
                className="w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
              >
                {submittingReport ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{submittingReport ? t('submittingReportBtn') : t('submitReportBtn')}</span>
              </button>

              <p className="text-[10px] text-stone-400 text-center">
                {t('reportHelpNotice')}
              </p>
            </div>
          </aside>
        )}

        {/* Right Large Map Canvas Stage -> EXPANDS 100% when sidebar is hidden! */}
        <main className="relative flex-1 w-full h-full min-h-[480px]">
          {/* Map Component */}
          <BangladeshMap
            locations={locations}
            selectedLocation={selectedLocation}
            onSelectLocation={handleSelectLocation}
            activeFilter={activeFilter}
            triggerReset={triggerReset}
            userCoords={userCoords}
          />

          {/* Independent Non-Overlapping Top Controls Bar */}
          <div className="absolute top-4 left-4 right-4 z-20 pointer-events-none flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Left: Floating Show Panel button (Desktop when sidebar is hidden) */}
            {!isSidebarVisible ? (
              <div className="hidden lg:block pointer-events-auto shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleSidebar(true)}
                  className="py-2 px-3.5 rounded-xl bg-white/95 dark:bg-[#111214]/95 backdrop-blur-md border border-stone-200/90 dark:border-zinc-800 shadow-md text-xs font-bold text-stone-800 dark:text-zinc-200 flex items-center gap-1.5 hover:bg-orange-50 dark:hover:bg-zinc-800 transition-all hover:scale-105"
                >
                  <Zap className="w-3.5 h-3.5 text-orange-500 fill-current" />
                  <span>{t('showPanel')}</span>
                </button>
              </div>
            ) : (
              <div className="hidden lg:block w-4 shrink-0" />
            )}

            {/* Center: SearchBar Overlay */}
            <div className="pointer-events-auto w-full max-w-md mx-auto">
              <SearchBar
                onSelect={handleSelectLocation}
                onNearMe={handleNearMe}
                isLocating={gpsStatus === 'searching'}
              />

              {/* GPS Detected Area Banner */}
              {detectedLocation && !selectedLocation && (
                <div className="mt-2 p-2 px-3.5 rounded-xl bg-white/95 dark:bg-[#111214]/95 backdrop-blur-md border border-stone-200/90 dark:border-zinc-800 shadow-md flex items-center justify-between gap-3 text-xs animate-in fade-in duration-200 w-full">
                  <div className="flex items-center gap-2 truncate">
                    <Navigation className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                    <span className="font-bold text-stone-900 dark:text-zinc-100 truncate">
                      {t('gpsDetectedPrefix')} {isBn ? detectedLocation.nameBn : detectedLocation.nameEn}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLocation(detectedLocation);
                      setHistoryTargetLocation(detectedLocation);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition-colors shrink-0 flex items-center gap-1"
                  >
                    <span>{t('reportNowBtn')}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Right: Status HUD (Positioned independently with zero overlap!) */}
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
            <div className="absolute bottom-6 right-4 left-4 sm:left-auto sm:right-6 sm:w-80 z-20 pointer-events-auto bg-white/95 dark:bg-[#111214]/95 backdrop-blur-md p-4 rounded-2xl border border-stone-200/90 dark:border-zinc-800 shadow-xl space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
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
                <span className="text-stone-600 dark:text-zinc-400 font-medium">{t('currentConsensus')}</span>
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
                    ? t('statusYes')
                    : selectedLocation.status === 'unavailable'
                    ? t('statusNo')
                    : t('statusUncertain')}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setHistoryTargetLocation(selectedLocation);
                    setIsHistoryOpen(true);
                  }}
                  className="py-2 px-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-stone-900 dark:text-zinc-100 font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                >
                  <Clock className="w-3.5 h-3.5 text-orange-500" />
                  <span>{t('viewFullHistory')}</span>
                </button>

                <Link
                  to={`/schedules?id=${selectedLocation.slug || selectedLocation._id}`}
                  className="py-2 px-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5 text-orange-500" />
                  <span>{t('navSchedules')}</span>
                </Link>
              </div>
            </div>
          )}

          {/* Mobile Bottom Sticky Reporting CTA */}
          <div className="fixed bottom-16 left-0 right-0 z-30 flex justify-center px-4 lg:hidden pointer-events-none pb-safe">
            <button
              type="button"
              onClick={() => setIsMobileReportOpen(true)}
              className="pointer-events-auto w-full max-w-md py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-lg shadow-orange-950/20 flex items-center justify-center gap-2 transition-all"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>{t('mobileReportCTA')}</span>
            </button>
          </div>
        </main>
      </div>

      {/* Mobile Slide-Over Report Sheet */}
      <SmartReportPanel
        isOpen={isMobileReportOpen}
        onClose={() => setIsMobileReportOpen(false)}
        selectedLocation={selectedLocation}
        onClearSelection={() => setSelectedLocation(null)}
        onReportSuccess={fetchMapData}
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
          setIsMobileReportOpen(true);
        }}
      />

      {/* 2. Below-the-Map Live Community Activity & Trust Info */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full space-y-6">
        <RecentReportsTicker />
        <DisclaimerBox />
      </section>

      {/* 3. Mobile Fixed Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0a0a0b]/95 backdrop-blur-md border-t border-stone-200 dark:border-zinc-800 py-1.5 px-2 flex items-center justify-around text-[10px] font-bold text-stone-600 dark:text-zinc-400">
        <Link
          to="/"
          className={`flex flex-col items-center gap-0.5 ${
            locationPath.pathname === '/' ? 'text-orange-500 dark:text-orange-400' : ''
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>{t('mobNavMap')}</span>
        </Link>

        <Link
          to="/areas"
          className={`flex flex-col items-center gap-0.5 ${
            locationPath.pathname === '/areas' ? 'text-orange-500 dark:text-orange-400' : ''
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>{t('mobNavAreas')}</span>
        </Link>

        <Link
          to="/history"
          className={`flex flex-col items-center gap-0.5 ${
            locationPath.pathname === '/history' ? 'text-orange-500 dark:text-orange-400' : ''
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{t('mobNavHistory')}</span>
        </Link>

        <Link
          to="/schedules"
          className={`flex flex-col items-center gap-0.5 ${
            locationPath.pathname === '/schedules' ? 'text-orange-500 dark:text-orange-400' : ''
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{t('mobNavSchedules')}</span>
        </Link>

        <Link
          to="/stats"
          className={`flex flex-col items-center gap-0.5 ${
            locationPath.pathname === '/stats' ? 'text-orange-500 dark:text-orange-400' : ''
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>{t('mobNavStats')}</span>
        </Link>

        <Link
          to="/about"
          className={`flex flex-col items-center gap-0.5 ${
            locationPath.pathname === '/about' ? 'text-orange-500 dark:text-orange-400' : ''
          }`}
        >
          <Info className="w-4 h-4" />
          <span>{t('mobNavAbout')}</span>
        </Link>
      </nav>
    </div>
  );
};
