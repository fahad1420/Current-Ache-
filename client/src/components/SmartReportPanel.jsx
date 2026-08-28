import React, { useState } from 'react';
import {
  Zap,
  PlugZap,
  CheckCircle2,
  Clock,
  MapPin,
  X,
  Loader2,
  Send,
  Search,
  Crosshair,
  Sliders,
  Navigation,
  Check,
  AlertCircle
} from 'lucide-react';
import { toBn } from '../utils/banglaDigits';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import defaultLocations from '../data/bangladeshLocations.json';
import api from '../services/api';

export const SmartReportPanel = ({
  isOpen,
  onClose,
  selectedLocation,
  onClearSelection,
  onReportSuccess,
  allLocations = defaultLocations,
  onSelectLocation,
  onNearMe,
  isLocating = false,
}) => {
  const [status, setStatus] = useState('available');
  const [duration, setDuration] = useState('just_now');
  const [locality, setLocality] = useState('');
  const [customHours, setCustomHours] = useState('');
  const [customMins, setCustomMins] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isChangingArea, setIsChangingArea] = useState(false);
  const { addToast } = useToast();
  const { t, isBn } = useLanguage();

  if (!isOpen) return null;

  const durationOptions = [
    { label: t('durJustNow') || 'এখনই', value: 'just_now' },
    { label: t('dur15m') || '১৫ মিনিট', value: '15_min' },
    { label: t('dur30m') || '৩০ মিনিট', value: '30_min' },
    { label: t('dur1h') || '১ ঘণ্টা', value: '1_hour' },
    { label: t('dur2h') || '২ ঘণ্টা', value: '2_hours' },
    { label: t('dur4h') || '৪+ ঘণ্টা', value: '4_hours_plus' },
    { label: t('durCustom') || 'কাস্টম', value: 'custom' },
  ];

  const searchResults = searchQuery.trim()
    ? allLocations.filter(
        (l) =>
          l.nameBn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.nameEn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.district?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.districtBn?.includes(searchQuery)
      ).slice(0, 6)
    : [];

  const handleSendReport = async () => {
    if (!selectedLocation) {
      addToast(t('selectAreaFirstError') || 'অনুগ্রহ করে প্রথমে এলাকা নির্বাচন করুন।', 'error');
      return;
    }

    let calculatedCustomMinutes = null;
    if (duration === 'custom') {
      const h = parseInt(customHours || '0', 10);
      const m = parseInt(customMins || '0', 10);
      calculatedCustomMinutes = (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
      if (calculatedCustomMinutes <= 0) {
        calculatedCustomMinutes = 10;
      }
    }

    setSubmitting(true);

    try {
      const res = await api.post('/reports', {
        locationId: selectedLocation._id || selectedLocation.slug,
        locationName: selectedLocation.nameBn || selectedLocation.nameEn,
        district: selectedLocation.district || 'বাংলাদেশ',
        division: selectedLocation.division || 'Dhaka',
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        isGpsCustom: Boolean(selectedLocation.isGpsCustom || selectedLocation.isMapClick),
        status,
        duration: duration || 'just_now',
        locality: locality.trim() || undefined,
        customMinutes: calculatedCustomMinutes,
        source: 'web',
      });

      if (res.data?.success) {
        const areaName = isBn ? selectedLocation.nameBn : selectedLocation.nameEn;
        addToast(
          isBn
            ? `✓ রিপোর্ট সফলভাবে গ্রহণ করা হয়েছে: ${areaName}`
            : `✓ Report recorded for ${areaName}`,
          'success'
        );
        if (onReportSuccess) onReportSuccess();
        if (onClose) onClose();
      } else {
        addToast(res.data?.message || t('reportFailedToast') || 'রিপোর্ট পাঠানো যায়নি। আবার চেষ্টা করুন।', 'error');
      }
    } catch (err) {
      console.error('Report submission error:', err);
      addToast(
        err.response?.data?.message || t('reportFailedToast') || 'রিপোর্ট পাঠানো যায়নি। আবার চেষ্টা করুন।',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isLocationSourceGps = selectedLocation?.isGpsDetected;
  const isLocationSourceMap = selectedLocation?.isMapClick;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-in fade-in duration-150 p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/50 dark:bg-black/80 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card / Bottom Sheet (Unified across mobile, tablet, and desktop) */}
      <div className="relative w-full max-w-lg bg-white dark:bg-[#111214] shadow-2xl rounded-t-3xl sm:rounded-3xl border border-stone-200 dark:border-zinc-800 flex flex-col max-h-[92vh] sm:max-h-[85vh] z-10 animate-in slide-in-from-bottom-4 duration-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-stone-50/40 dark:bg-[#151619]">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
              <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                {isBn ? 'লাইভ ক্রাউডসোর্স রিপোর্ট' : 'Live Community Report'}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-zinc-100 mt-0.5">
              {isBn ? 'বিদ্যুৎ পরিস্থিতি জানান' : 'Report Electricity Status'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 pb-6">
          {/* Section 1: Area Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-700 dark:text-zinc-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-orange-500" />
                <span>{isBn ? '১. আপনার এলাকা' : '1. Selected Area'}</span>
              </label>

              {selectedLocation && (
                <button
                  type="button"
                  onClick={() => setIsChangingArea(!isChangingArea)}
                  className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline"
                >
                  {isChangingArea ? (isBn ? 'বাতিল' : 'Cancel') : (isBn ? 'পরিবর্তন করুন' : 'Change Area')}
                </button>
              )}
            </div>

            {selectedLocation && !isChangingArea ? (
              <div className="p-3.5 rounded-2xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900/50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm sm:text-base text-stone-900 dark:text-zinc-100">
                      {isBn ? selectedLocation.nameBn : selectedLocation.nameEn}
                    </span>
                    {isLocationSourceGps && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">
                        <Navigation className="w-2.5 h-2.5" />
                        {isBn ? 'GPS লোকেশন' : 'GPS Location'}
                      </span>
                    )}
                    {isLocationSourceMap && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                        <MapPin className="w-2.5 h-2.5" />
                        {isBn ? 'ম্যাপে চিহ্নিত' : 'Map Pinned'}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">
                    {isBn
                      ? `${selectedLocation.divisionBn} বিভাগ • ${selectedLocation.districtBn} জেলা`
                      : `${selectedLocation.district} • ${selectedLocation.division}`}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsChangingArea(true)}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-stone-700 dark:text-zinc-300 shadow-xs"
                >
                  {isBn ? 'পরিবর্তন' : 'Change'}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isBn ? 'উপজেলা বা এলাকার নাম দিয়ে খুঁজুন...' : 'Search upazila or area name...'}
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-stone-50 dark:bg-zinc-800/80 border border-stone-200 dark:border-zinc-700 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none text-stone-900 dark:text-zinc-100 placeholder:text-stone-400 font-medium"
                  />
                </div>

                {onNearMe && (
                  <button
                    type="button"
                    onClick={() => {
                      onNearMe();
                      setIsChangingArea(false);
                    }}
                    disabled={isLocating}
                    className="w-full py-2 px-3 rounded-xl bg-stone-100 dark:bg-zinc-800 text-stone-800 dark:text-zinc-200 text-xs font-bold flex items-center justify-center gap-2 border border-stone-200 dark:border-zinc-700 hover:bg-orange-50 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <Crosshair className={`w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 ${isLocating ? 'animate-spin' : ''}`} />
                    <span>{isLocating ? (isBn ? 'GPS লোকেশন খোঁজা হচ্ছে...' : 'Locating...') : (isBn ? 'GPS দিয়ে বর্তমান অবস্থান ব্যবহার করুন' : 'Use Current GPS Location')}</span>
                  </button>
                )}

                {searchResults.length > 0 && (
                  <div className="bg-white dark:bg-zinc-800 rounded-xl border border-stone-200 dark:border-zinc-700 shadow-md divide-y divide-stone-100 dark:divide-zinc-700 overflow-hidden max-h-48 overflow-y-auto">
                    {searchResults.map((loc) => (
                      <button
                        key={loc._id || loc.slug}
                        type="button"
                        onClick={() => {
                          if (onSelectLocation) onSelectLocation(loc);
                          setIsChangingArea(false);
                          setSearchQuery('');
                        }}
                        className="w-full p-2.5 text-left text-xs hover:bg-orange-50 dark:hover:bg-zinc-700/60 flex items-center justify-between transition-colors"
                      >
                        <div>
                          <div className="font-bold text-stone-900 dark:text-zinc-100">
                            {isBn ? loc.nameBn : loc.nameEn}
                          </div>
                          <div className="text-[10px] text-stone-400">
                            {isBn ? `${loc.districtBn} জেলা • ${loc.divisionBn}` : `${loc.district} • ${loc.division}`}
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

          {/* Section 2: Current Status Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 dark:text-zinc-300 block">
              ২. {isBn ? 'বর্তমান বিদ্যুতের অবস্থা' : '2. Electricity Status'}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Option A: Available */}
              <button
                type="button"
                onClick={() => setStatus('available')}
                className={`p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${
                  status === 'available'
                    ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 shadow-sm'
                    : 'border-stone-200 dark:border-zinc-700 bg-stone-50/50 dark:bg-zinc-800/40 text-stone-600 dark:text-zinc-400 hover:border-stone-300'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  status === 'available'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-stone-200 dark:bg-zinc-700 text-stone-600 dark:text-zinc-300'
                }`}>
                  <Zap className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <div className="font-extrabold text-xs sm:text-sm leading-tight">
                    {isBn ? 'কারেন্ট আছে' : 'Power Available'}
                  </div>
                  <div className="text-[10px] text-stone-500 dark:text-zinc-400 mt-0.5">
                    {isBn ? 'বিদ্যুৎ সচল' : 'Normal supply'}
                  </div>
                </div>
              </button>

              {/* Option B: Unavailable */}
              <button
                type="button"
                onClick={() => setStatus('unavailable')}
                className={`p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${
                  status === 'unavailable'
                    ? 'border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 shadow-sm'
                    : 'border-stone-200 dark:border-zinc-700 bg-stone-50/50 dark:bg-zinc-800/40 text-stone-600 dark:text-zinc-400 hover:border-stone-300'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  status === 'unavailable'
                    ? 'bg-rose-500 text-white'
                    : 'bg-stone-200 dark:bg-zinc-700 text-stone-600 dark:text-zinc-300'
                }`}>
                  <PlugZap className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-xs sm:text-sm leading-tight">
                    {isBn ? 'কারেন্ট নেই' : 'No Electricity'}
                  </div>
                  <div className="text-[10px] text-stone-500 dark:text-zinc-400 mt-0.5">
                    {isBn ? 'লোডশেডিং / বিভ্রাট' : 'Outage'}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Section 3: Duration Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 dark:text-zinc-300 block">
              ৩. {isBn ? 'কতক্ষণ ধরে এই অবস্থা?' : '3. Observation Duration'}
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {durationOptions.map((opt) => {
                const isSelected = duration === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDuration(opt.value)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'bg-stone-100 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300 hover:bg-stone-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {duration === 'custom' && (
              <div className="flex items-center gap-2 pt-2 animate-in fade-in duration-150">
                <input
                  type="number"
                  min="0"
                  max="24"
                  value={customHours}
                  onChange={(e) => setCustomHours(e.target.value)}
                  placeholder="ঘণ্টা"
                  className="w-1/2 py-2 px-3 text-xs bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 rounded-xl outline-none text-stone-900 dark:text-zinc-100"
                />
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={customMins}
                  onChange={(e) => setCustomMins(e.target.value)}
                  placeholder="মিনিট"
                  className="w-1/2 py-2 px-3 text-xs bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 rounded-xl outline-none text-stone-900 dark:text-zinc-100"
                />
              </div>
            )}
          </div>

          {/* Section 4: Specific Locality/Moholla (Optional) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700 dark:text-zinc-300 block">
              ৪. {isBn ? 'নির্দিষ্ট মহল্লা / সেক্টর / পাড়া (ঐচ্ছিক)' : '4. Specific Locality / Sector (Optional)'}
            </label>
            <input
              type="text"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              placeholder={isBn ? 'যেমন: ব্লক-সি, রোড নং ৪, বাজার মোড়...' : 'e.g. Sector 4, Main Road, Block B...'}
              className="w-full py-2.5 px-3.5 text-xs bg-stone-50 dark:bg-zinc-800/80 border border-stone-200 dark:border-zinc-700 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none text-stone-900 dark:text-zinc-100 placeholder:text-stone-400 font-medium"
            />
          </div>
        </div>

        {/* Footer Submit Button */}
        <div className="p-4 sm:p-5 border-t border-stone-100 dark:border-zinc-800 bg-stone-50/50 dark:bg-[#111214] shrink-0">
          <button
            type="button"
            onClick={handleSendReport}
            disabled={submitting || !selectedLocation}
            className="w-full py-3.5 px-4 rounded-2xl bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white font-extrabold text-sm sm:text-base shadow-lg shadow-orange-950/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{isBn ? 'রিপোর্ট পাঠানো হচ্ছে...' : 'Submitting Report...'}</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>{isBn ? 'রিপোর্ট জমা দিন' : 'Submit Report'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
export default SmartReportPanel;
