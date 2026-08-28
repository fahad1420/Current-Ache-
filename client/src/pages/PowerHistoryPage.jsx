import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Clock,
  Zap,
  PlugZap,
  Search,
  MapPin,
  Calendar,
  Activity,
  AlertCircle,
  Share2,
  Check,
  Loader2,
  TrendingDown,
  ShieldCheck,
  Layers,
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { toBn } from '../utils/banglaDigits';
import { getBanglaRelativeTime } from '../utils/timeAgo';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import defaultLocations from '../data/bangladeshLocations.json';
import api from '../services/api';

export const PowerHistoryPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialLocId = searchParams.get('id') || searchParams.get('location') || '';
  const { t, isBn } = useLanguage();
  const { addToast } = useToast();

  const [allLocations, setAllLocations] = useState(defaultLocations);
  const [reportedLocations, setReportedLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activePeriod, setActivePeriod] = useState('24h');
  const [historyData, setHistoryData] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [copied, setCopied] = useState(false);

  // Fetch all 593 locations & dynamic reported areas from MongoDB
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await api.get('/locations');
        if (res.data?.success) {
          const locs = res.data.data || [];
          setAllLocations(locs);

          if (initialLocId && locs.length > 0) {
            const matched = locs.find(
              (l) => l._id === initialLocId || l.slug === initialLocId.toLowerCase()
            );
            if (matched) setSelectedLocation(matched);
          }
        }
      } catch (err) {
        console.error('Error fetching locations for history:', err);
      } finally {
        setLoadingLocations(false);
      }
    };

    const fetchReported = async () => {
      try {
        let res;
        try {
          res = await api.get('/locations/reported');
        } catch (e) {
          res = await api.get('/locations?type=reported');
        }
        if (res.data?.success && Array.isArray(res.data.data)) {
          setReportedLocations(res.data.data);
        }
      } catch (e) {}
    };

    fetchLocations();
    fetchReported();
  }, [initialLocId]);

  // Fetch history for selected location
  useEffect(() => {
    if (selectedLocation) {
      const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
          const res = await api.get(`/locations/${selectedLocation._id || selectedLocation.slug}/history`);
          if (res.data?.success) {
            setHistoryData(res.data.data);
          }
        } catch (err) {
          console.error('Failed to load history:', err);
        } finally {
          setLoadingHistory(false);
        }
      };

      fetchHistory();
    } else {
      setHistoryData(null);
    }
  }, [selectedLocation]);

  const periods = [
    { key: '24h', label: t('period24h') },
    { key: '48h', label: t('period48h') },
    { key: '7d', label: t('period7d') },
    { key: '30d', label: t('period30d') },
    { key: 'lifetime', label: t('periodLifetime') },
  ];

  const currentStats = historyData?.periods?.[activePeriod] || {
    totalReports: 0,
    outageEvents: 0,
    restorationEvents: 0,
    totalOutageMinutes: 0,
    averageOutageMinutes: 0,
  };

  const formatDuration = (totalMins) => {
    if (!totalMins || totalMins === 0) return isBn ? `০ ${t('minutesUnit')}` : `0 ${t('minutesUnit')}`;
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hours > 0) {
      const hStr = isBn ? toBn(hours) : hours;
      const mStr = isBn ? toBn(mins) : mins;
      return mins > 0
        ? `${hStr} ${t('hoursUnit')} ${mStr} ${t('minutesUnit')}`
        : `${hStr} ${t('hoursUnit')}`;
    }
    return `${isBn ? toBn(mins) : mins} ${t('minutesUnit')}`;
  };

  // Browser's local time formatting
  const formatLocalTime = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      let hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const minFormatted = minutes < 10 ? '0' + minutes : minutes;

      if (isBn) {
        return `${toBn(hours)}:${toBn(minFormatted)} ${ampm}`;
      }
      return `${hours}:${minFormatted} ${ampm}`;
    } catch (e) {
      return '';
    }
  };

  const handleShare = async () => {
    if (!selectedLocation) return;
    const shareUrl = `${window.location.origin}/history?id=${selectedLocation.slug || selectedLocation._id}`;
    const shareText = isBn
      ? `⚡ ${selectedLocation.nameBn} (${selectedLocation.districtBn}) এর বিদ্যুৎ বিভ্রাট ও লোডশেডিং ইতিহাস দেখুন:`
      : `⚡ Check power interruption history for ${selectedLocation.nameEn} on CurrentAche BD:`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: isBn ? `${selectedLocation.nameBn} - বিদ্যুৎ ইতিহাস` : `${selectedLocation.nameEn} - Power History`,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {}
    } else {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      addToast(isBn ? '✓ লিঙ্ক কপি করা হয়েছে!' : '✓ Link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const searchResults = searchQuery.trim()
    ? allLocations.filter(
        (l) =>
          l.nameBn.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.districtBn.includes(searchQuery) ||
          l.district.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 8)
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/60 text-xs font-bold mb-2">
            <Clock className="w-3.5 h-3.5" />
            <span>{t('navHistory')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-zinc-100 tracking-tight">
            {t('historyPageTitle')}
          </h1>
          <p className="text-stone-500 dark:text-zinc-400 text-xs sm:text-sm mt-1 max-w-2xl">
            {t('historyPageSubtitle')}
          </p>
        </div>

        {selectedLocation && (
          <button
            type="button"
            onClick={handleShare}
            className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-[#111214] text-stone-800 dark:text-zinc-200 border border-stone-200 dark:border-zinc-800 text-xs font-bold flex items-center gap-1.5 hover:bg-stone-200 dark:hover:bg-zinc-800 transition-colors shadow-xs"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-orange-500" />}
            <span>{t('shareAreaBtn')}</span>
          </button>
        )}
      </div>

      {/* Main Grid: Location Search Selector + Analytics Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Search & Location Switcher */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#111214] p-4 rounded-2xl border border-stone-200 dark:border-zinc-800 shadow-xs space-y-3">
            <h2 className="text-xs font-bold text-stone-700 dark:text-zinc-300 uppercase tracking-wider">
              {t('stepAreaLabel')}
            </h2>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-zinc-800/80 border border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
              />
            </div>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="border border-stone-200 dark:border-zinc-700 rounded-xl divide-y divide-stone-100 dark:divide-zinc-800 overflow-hidden max-h-56 overflow-y-auto">
                {searchResults.map((loc) => (
                  <button
                    key={loc._id}
                    type="button"
                    onClick={() => {
                      setSelectedLocation(loc);
                      setSearchParams({ id: loc.slug || loc._id });
                      setSearchQuery('');
                    }}
                    className="w-full p-2.5 text-left text-xs hover:bg-orange-50 dark:hover:bg-zinc-800 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="font-bold text-stone-900 dark:text-zinc-100">
                        {isBn ? loc.nameBn : loc.nameEn}
                      </div>
                      <div className="text-[10px] text-stone-400">
                        {isBn ? `${loc.divisionBn} • ${loc.districtBn}` : `${loc.district} • ${loc.division}`}
                      </div>
                    </div>
                    <MapPin className="w-3.5 h-3.5 text-orange-500" />
                  </button>
                ))}
              </div>
            )}

              {/* Dynamic Reported Areas Section from MongoDB */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-500 dark:text-zinc-400">
                  {isBn ? 'রিপোর্টপ্রাপ্ত সক্রিয় এলাকা' : 'Active Reported Areas'}
                </span>
                <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-400">
                  {isBn ? `${toBn(reportedLocations.length)} টি এলাকা` : `${reportedLocations.length} areas`}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-0.5">
                {reportedLocations
                  .filter((loc) =>
                    searchQuery.trim()
                      ? loc.nameBn.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        loc.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
                      : true
                  )
                  .map((loc) => {
                    const isSelected = selectedLocation?._id === loc._id || selectedLocation?.slug === loc.slug;
                    return (
                      <button
                        key={loc._id || loc.slug}
                        type="button"
                        onClick={() => {
                          setSelectedLocation(loc);
                          setSearchParams({ id: loc.slug || loc._id });
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-orange-500 text-white shadow-xs'
                            : 'bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-stone-700 dark:text-zinc-300'
                        }`}
                      >
                        <MapPin className="w-3 h-3 text-orange-500 shrink-0" />
                        <span>{isBn ? loc.nameBn : loc.nameEn}</span>
                        <span className="text-[10px] opacity-70">
                          ({isBn ? loc.districtBn : loc.district})
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Currently Selected Location Banner */}
            {selectedLocation ? (
              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/80 dark:border-zinc-700/80 space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  {isBn ? `${selectedLocation.divisionBn} বিভাগ • ${selectedLocation.districtBn} জেলা` : `${selectedLocation.district} • ${selectedLocation.division}`}
                </span>
                <h3 className="font-bold text-base text-stone-900 dark:text-zinc-100">
                  {isBn ? selectedLocation.nameBn : selectedLocation.nameEn}
                </h3>

                <div className="pt-2 flex items-center justify-between">
                  <Link
                    to={`/?focus=${selectedLocation.slug || selectedLocation._id}`}
                    className="text-xs font-bold text-orange-500 dark:text-orange-400 hover:underline flex items-center gap-1"
                  >
                    <span>{t('viewOnMapBtn')}</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLocation(null);
                      setSearchParams({});
                    }}
                    className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-zinc-300 font-medium"
                  >
                    {t('changeAreaBtn')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-stone-200 dark:border-zinc-700 text-center space-y-1">
                <MapPin className="w-5 h-5 text-stone-400 mx-auto" />
                <p className="text-xs font-semibold text-stone-600 dark:text-zinc-400">
                  {isBn ? 'উপরে সার্চ করে এলাকা নির্বাচন করুন' : 'Search and select an area above'}
                </p>
                <p className="text-[11px] text-stone-400">
                  {isBn ? 'যেকোনো উপজেলা বা থানার বিদ্যুৎ বিভ্রাট ও লোডশেডিং রেকর্ড দেখতে পারবেন।' : 'View power outage and restoration logs for any upazila or thana.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (2 cols): Historical Analytics & Estimation */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedLocation ? (
            <div className="bg-white dark:bg-[#111214] rounded-2xl p-12 border border-stone-200 dark:border-zinc-800 text-center space-y-2">
              <Clock className="w-8 h-8 text-orange-500 mx-auto" />
              <h3 className="text-base font-bold text-stone-900 dark:text-zinc-100">
                {isBn ? 'এলাকা নির্বাচন করুন' : 'Select an Area'}
              </h3>
              <p className="text-xs text-stone-500 dark:text-zinc-400 max-w-sm mx-auto">
                {isBn
                  ? 'বামে দেওয়া সার্চ বক্সে আপনার উপজেলা বা এলাকার নাম লিখে নির্বাচন করুন।'
                  : 'Search for your upazila or thana name on the left to view detailed power history.'}
              </p>
            </div>
          ) : loadingHistory ? (
            <div className="bg-white dark:bg-[#111214] rounded-2xl p-12 border border-stone-200 dark:border-zinc-800 flex justify-center items-center">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            </div>
          ) : historyData ? (
            <div className="space-y-4">
              {/* Estimated Power Restoration Card (Only when outage is active, else show online status) */}
              <div className="bg-white dark:bg-[#111214] p-5 rounded-2xl border border-stone-200 dark:border-zinc-800 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-orange-500 fill-current" />
                      {t('estimatedRestorationTitle')}
                    </h3>
                    <p className="text-[11px] text-stone-500 dark:text-zinc-400 mt-0.5">
                      {t('estimatedRestorationSub')}
                    </p>
                  </div>

                  {historyData.restorationEstimate?.isActiveOutage && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        historyData.restorationEstimate?.isDefaultEstimate
                          ? 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-300 border-stone-200 dark:border-zinc-700'
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60'
                      }`}
                    >
                      {historyData.restorationEstimate?.isDefaultEstimate
                        ? t('estimatedDefaultNote')
                        : t('estimatedCommunityNote')}
                    </span>
                  )}
                </div>

                {historyData.restorationEstimate?.isActiveOutage ? (
                  <div className="p-3.5 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] text-stone-500 dark:text-zinc-400 font-medium block">
                        {t('expectedReturnTime')}
                      </span>
                      <div className="text-xl font-bold text-stone-900 dark:text-zinc-100 tracking-tight">
                        {formatLocalTime(historyData.restorationEstimate?.estimatedTimeISO)}
                      </div>
                    </div>

                    <div className="text-xs font-bold text-orange-600 dark:text-orange-400">
                      {t('approxRemaining')} {formatDuration(historyData.restorationEstimate?.estimatedDurationMinutes)}
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      {isBn ? 'বর্তমানে এই এলাকায় বিদ্যুৎ সচল রয়েছে।' : 'Electricity is currently active in this area.'}
                    </span>
                  </div>
                )}
              </div>

              {/* Period Selector Tabs */}
              <div className="bg-white dark:bg-[#111214] p-4 rounded-2xl border border-stone-200 dark:border-zinc-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-stone-700 dark:text-zinc-300 uppercase tracking-wider">
                    {t('historyTitle')}
                  </h3>
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {t('reliabilityScore')}:{' '}
                    {historyData?.reliability?.score != null
                      ? `${isBn ? toBn(historyData.reliability.score) : historyData.reliability.score}%`
                      : t('reliabilityInsufficient')}
                  </div>
                </div>

                {/* Period Pills */}
                <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-zinc-800/80 rounded-xl border border-stone-200/80 dark:border-zinc-700/80 text-xs font-bold overflow-x-auto">
                  {periods.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setActivePeriod(p.key)}
                      className={`flex-1 py-1.5 px-2.5 rounded-lg text-center transition-all whitespace-nowrap ${
                        activePeriod === p.key
                          ? 'bg-white dark:bg-zinc-700 text-stone-900 dark:text-white shadow-xs'
                          : 'text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Metrics Grid for Selected Period */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-zinc-800/40 border border-stone-200/70 dark:border-zinc-800 text-center">
                    <span className="text-[10px] text-stone-400 dark:text-zinc-500 block font-medium">
                      {t('totalOutages')}
                    </span>
                    <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                      {isBn ? toBn(currentStats.outageEvents) : currentStats.outageEvents} {t('timesOutageUnit')}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-zinc-800/40 border border-stone-200/70 dark:border-zinc-800 text-center">
                    <span className="text-[10px] text-stone-400 dark:text-zinc-500 block font-medium">
                      {t('totalRestorations')}
                    </span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {isBn ? toBn(currentStats.restorationEvents) : currentStats.restorationEvents} {t('timesOutageUnit')}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-zinc-800/40 border border-stone-200/70 dark:border-zinc-800 text-center">
                    <span className="text-[10px] text-stone-400 dark:text-zinc-500 block font-medium">
                      {t('totalOutageTime')}
                    </span>
                    <span className="text-xs font-bold text-stone-800 dark:text-zinc-200">
                      {formatDuration(currentStats.totalOutageMinutes)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-zinc-800/40 border border-stone-200/70 dark:border-zinc-800 text-center">
                    <span className="text-[10px] text-stone-400 dark:text-zinc-500 block font-medium">
                      {t('avgOutageTime')}
                    </span>
                    <span className="text-xs font-bold text-stone-800 dark:text-zinc-200">
                      {formatDuration(currentStats.averageOutageMinutes)}
                    </span>
                  </div>
                </div>

                {/* Recent Interruption Timeline */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-stone-900 dark:text-zinc-100">
                    {t('recentTimelineTitle')}
                  </h4>

                  {historyData.recentTimeline && historyData.recentTimeline.length > 0 ? (
                    <div className="divide-y divide-stone-100 dark:divide-zinc-800 border border-stone-200/80 dark:border-zinc-800 rounded-xl overflow-hidden">
                      {historyData.recentTimeline.map((item) => {
                        const isAvail = item.status === 'available';
                        return (
                          <div
                            key={item.id}
                            className="p-2.5 px-3 flex items-center justify-between text-xs bg-white dark:bg-[#111214]"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isAvail ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                              />
                              <span className="font-bold text-stone-800 dark:text-zinc-200">
                                {isAvail ? t('statusAvailableBtn') : t('statusUnavailableBtn')}
                              </span>
                            </div>
                            <span className="text-[11px] text-stone-400 dark:text-zinc-500">
                              {getBanglaRelativeTime(item.createdAt)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-stone-400 dark:text-zinc-500 bg-stone-50 dark:bg-zinc-800/40 rounded-xl border border-stone-200/70 dark:border-zinc-800">
                      {t('reliabilityInsufficient')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white dark:bg-[#111214] rounded-2xl border border-stone-200 dark:border-zinc-800 text-stone-500 text-sm">
              {t('reliabilityInsufficient')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
