import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Zap,
  PlugZap,
  Check,
  X,
  Plus,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Search,
  MapPin,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ArrowRight,
  Info
} from 'lucide-react';
import { toBn } from '../utils/banglaDigits';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import defaultLocations from '../data/bangladeshLocations.json';
import api from '../services/api';

export const SchedulesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialLocId = searchParams.get('id') || searchParams.get('location') || '';
  const { t, isBn } = useLanguage();
  const { addToast } = useToast();

  const [allLocations, setAllLocations] = useState(defaultLocations);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New schedule form state
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [events, setEvents] = useState([
    { time: '01:00 PM', status: 'available', note: '' },
    { time: '03:00 PM', status: 'unavailable', note: '' },
    { time: '04:30 PM', status: 'available', note: '' },
    { time: '06:10 PM', status: 'unavailable', note: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);

  // Fetch all locations
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
        console.error('Error fetching locations:', err);
      }
    };
    fetchLocations();
  }, [initialLocId]);

  // Fetch schedules for selected location
  const fetchSchedules = async (locId) => {
    setLoading(true);
    try {
      const res = await api.get(`/schedules/location/${locId}`);
      if (res.data?.success) {
        setSchedules(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedLocation) {
      fetchSchedules(selectedLocation._id || selectedLocation.slug);
    } else {
      setSchedules([]);
    }
  }, [selectedLocation]);

  // Vote on schedule
  const handleVote = async (scheduleId, voteType) => {
    try {
      const res = await api.post(`/schedules/${scheduleId}/vote`, { vote: voteType });
      if (res.data?.success) {
        addToast(isBn ? res.data.message : res.data.messageEn, 'success');
        if (selectedLocation) {
          fetchSchedules(selectedLocation._id || selectedLocation.slug);
        }
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Error recording feedback', 'error');
    }
  };

  // Add/Remove events in form
  const handleAddEventRow = () => {
    setEvents([...events, { time: '', status: 'available', note: '' }]);
  };

  const handleRemoveEventRow = (idx) => {
    if (events.length <= 2) {
      addToast(isBn ? 'নূন্যতম ২টি ধাপ থাকা আবশ্যক' : 'Minimum 2 time events required', 'error');
      return;
    }
    setEvents(events.filter((_, i) => i !== idx));
  };

  const handleEventChange = (idx, field, value) => {
    const updated = [...events];
    updated[idx][field] = value;
    setEvents(updated);
  };

  // Submit new schedule
  const handleSubmitSchedule = async (e) => {
    e.preventDefault();
    if (!selectedLocation) {
      addToast(t('selectAreaFirstError'), 'error');
      return;
    }

    const invalidEvent = events.find((ev) => !ev.time.trim());
    if (invalidEvent) {
      addToast(isBn ? 'অনুগ্রহ করে সকল ধাপের সময় পূরণ করুন' : 'Please fill all time steps', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/schedules', {
        locationId: selectedLocation._id,
        title: scheduleTitle,
        events,
      });

      if (res.data?.success) {
        addToast(isBn ? res.data.message : res.data.messageEn, 'success');
        setIsModalOpen(false);
        setScheduleTitle('');
        setEvents([
          { time: '01:00 PM', status: 'available', note: '' },
          { time: '03:00 PM', status: 'unavailable', note: '' },
          { time: '04:30 PM', status: 'available', note: '' },
          { time: '06:10 PM', status: 'unavailable', note: '' },
        ]);
        fetchSchedules(selectedLocation._id || selectedLocation.slug);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to submit schedule', 'error');
    } finally {
      setSubmitting(false);
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/60 text-xs font-bold mb-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>{t('navSchedules')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-zinc-100 tracking-tight">
            {t('scheduleTitle')}
          </h1>
          <p className="text-stone-500 dark:text-zinc-400 text-xs sm:text-sm mt-1 max-w-2xl">
            {t('scheduleSubtitle')}
          </p>
        </div>

        {selectedLocation && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('addScheduleBtn')}</span>
          </button>
        )}
      </div>

      {/* Grid: Search & Location Switcher + Schedules Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Location Selector */}
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

            {/* Selected Location Card */}
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
                  {isBn ? 'নির্দিষ্ট এলাকার সম্ভাব্য বিদ্যুৎ রুটিন ও প্যাটার্ন দেখতে পাবেন।' : 'View community power routine and patterns for specific areas.'}
                </p>
              </div>
            )}
          </div>

          <div className="bg-stone-50 dark:bg-[#111214] p-3.5 rounded-2xl border border-stone-200 dark:border-zinc-800 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-stone-500 dark:text-zinc-400 leading-relaxed font-normal">
              {t('disclaimerSchedule')}
            </p>
          </div>
        </div>

        {/* Right Column: Schedules Timeline & Verification */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedLocation ? (
            <div className="bg-white dark:bg-[#111214] rounded-2xl p-12 border border-stone-200 dark:border-zinc-800 text-center space-y-2">
              <Calendar className="w-8 h-8 text-orange-500 mx-auto" />
              <h3 className="text-base font-bold text-stone-900 dark:text-zinc-100">
                {isBn ? 'এলাকা নির্বাচন করুন' : 'Select an Area'}
              </h3>
              <p className="text-xs text-stone-500 dark:text-zinc-400 max-w-sm mx-auto">
                {isBn
                  ? 'বামে দেওয়া সার্চ বক্সে আপনার উপজেলা বা এলাকার নাম লিখে নির্বাচন করুন।'
                  : 'Search for your upazila or thana name on the left to view community power schedules.'}
              </p>
            </div>
          ) : loading ? (
            <div className="bg-white dark:bg-[#111214] rounded-2xl p-12 border border-stone-200 dark:border-zinc-800 flex justify-center items-center">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            </div>
          ) : schedules.length > 0 ? (
            <div className="space-y-4">
              {schedules.map((sch) => (
                <div
                  key={sch._id}
                  className="bg-white dark:bg-[#111214] rounded-2xl border border-stone-200 dark:border-zinc-800 p-5 shadow-xs space-y-4"
                >
                  {/* Schedule Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 dark:border-zinc-800 pb-3">
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-stone-900 dark:text-zinc-100">
                        {sch.title || (isBn ? 'দৈনিক সম্ভাব্য রুটিন' : 'Daily Expected Pattern')}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-stone-400 dark:text-zinc-500">
                          {isBn ? 'কমিউনিটি রিপোর্ট' : 'Community Submission'}
                        </span>
                        {sch.status === 'admin_verified' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
                            <ShieldCheck className="w-3 h-3" />
                            {isBn ? 'অ্যাডমিন যাচাইকৃত' : 'Admin Verified'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Trust Indicator Pill */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                          sch.trust.confidence === 'high'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60'
                            : sch.trust.confidence === 'medium'
                            ? 'bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-300 border-orange-200/60 dark:border-orange-800/60'
                            : 'bg-stone-50 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 border-stone-200 dark:border-zinc-700'
                        }`}
                      >
                        {sch.trust.totalVotes > 0
                          ? `${isBn ? toBn(sch.trust.percentage) : sch.trust.percentage}% ${t('verifiedByCommunity')}`
                          : (isBn ? sch.trust.confidenceLabelBn : sch.trust.confidenceLabelEn)}
                      </span>
                    </div>
                  </div>

                  {/* Clean Visual Timeline */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                    {sch.events.map((ev, idx) => {
                      const isAvail = ev.status === 'available';
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                            isAvail
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40 text-emerald-950 dark:text-emerald-100'
                              : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-900/40 text-rose-950 dark:text-rose-100'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold tracking-tight">
                              {ev.time}
                            </span>
                            {isAvail ? (
                              <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 fill-current" />
                            ) : (
                              <PlugZap className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                            )}
                          </div>

                          <div className="mt-2">
                            <span
                              className={`text-[11px] font-bold block ${
                                isAvail ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                              }`}
                            >
                              {isAvail ? t('powerOnTag') : t('powerOffTag')}
                            </span>
                            {ev.note && (
                              <span className="text-[10px] text-stone-500 dark:text-zinc-400 truncate block">
                                {ev.note}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Verification Voting Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-zinc-800 text-xs">
                    <div className="text-[11px] text-stone-400 dark:text-zinc-500">
                      {isBn ? toBn(sch.correctVotesCount) : sch.correctVotesCount} {t('scheduleVotesCount')} •{' '}
                      {isBn ? toBn(sch.incorrectVotesCount) : sch.incorrectVotesCount} {t('scheduleIncorrectCount')}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleVote(sch._id, 'correct')}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                          sch.userVote === 'correct'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-stone-50 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300 border-stone-200 dark:border-zinc-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700'
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{t('voteCorrect')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleVote(sch._id, 'incorrect')}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                          sch.userVote === 'incorrect'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-stone-50 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300 border-stone-200 dark:border-zinc-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700'
                        }`}
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                        <span>{t('voteIncorrect')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#111214] rounded-2xl p-10 border border-stone-200 dark:border-zinc-800 text-center space-y-3">
              <Clock className="w-8 h-8 text-stone-400 mx-auto" />
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-zinc-100">
                  {t('noSchedulesForArea')}
                </h3>
                <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">
                  {t('beFirstToCreateSchedule')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{t('addScheduleBtn')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="fixed inset-0 bg-stone-900/50 dark:bg-black/70 backdrop-blur-xs"
            onClick={() => setIsModalOpen(false)}
          />

          <div className="relative w-full max-w-lg bg-white dark:bg-[#111214] rounded-2xl border border-stone-200 dark:border-zinc-800 shadow-2xl p-5 sm:p-6 z-10 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-stone-900 dark:text-zinc-100">
                  {t('addScheduleBtn')}
                </h3>
                <p className="text-xs text-stone-500 dark:text-zinc-400">
                  {isBn ? selectedLocation?.nameBn : selectedLocation?.nameEn} (
                  {isBn ? selectedLocation?.districtBn : selectedLocation?.district} জেলা)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSchedule} className="space-y-4">
              {/* Schedule Title */}
              <div>
                <label className="text-xs font-bold text-stone-700 dark:text-zinc-300 block mb-1">
                  {t('scheduleTitlePlaceholder')}
                </label>
                <input
                  type="text"
                  value={scheduleTitle}
                  onChange={(e) => setScheduleTitle(e.target.value)}
                  placeholder={t('scheduleTitlePlaceholder')}
                  className="w-full p-2.5 rounded-xl bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-xs font-medium text-stone-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Event Rows */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-700 dark:text-zinc-300 block">
                  {t('scheduleTimelineTitle')}
                </label>

                <div className="space-y-2">
                  {events.map((ev, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 rounded-xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/80 dark:border-zinc-700/80"
                    >
                      <input
                        type="text"
                        value={ev.time}
                        onChange={(e) => handleEventChange(idx, 'time', e.target.value)}
                        placeholder="01:00 PM"
                        required
                        className="w-28 p-1.5 rounded-lg bg-white dark:bg-[#111214] border border-stone-200 dark:border-zinc-700 text-xs font-bold text-center text-stone-900 dark:text-zinc-100"
                      />

                      <select
                        value={ev.status}
                        onChange={(e) => handleEventChange(idx, 'status', e.target.value)}
                        className="flex-1 p-1.5 rounded-lg bg-white dark:bg-[#111214] border border-stone-200 dark:border-zinc-700 text-xs font-bold text-stone-900 dark:text-zinc-100"
                      >
                        <option value="available">⚡ {t('statusAvailableBtn')}</option>
                        <option value="unavailable">🔌 {t('statusUnavailableBtn')}</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleRemoveEventRow(idx)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                        title={t('removeTimeEvent')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddEventRow}
                  className="w-full py-2 rounded-xl border border-dashed border-stone-300 dark:border-zinc-700 hover:bg-stone-50 dark:hover:bg-zinc-800 text-xs font-bold text-stone-600 dark:text-zinc-300 flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('addTimeEvent')}</span>
                </button>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-stone-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-zinc-700 text-xs font-bold text-stone-600 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-800"
                >
                  {t('closeBtn')}
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{submitting ? t('savingSchedule') : t('saveScheduleBtn')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
