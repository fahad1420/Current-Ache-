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
  Sliders
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
  const [customHours, setCustomHours] = useState('');
  const [customMins, setCustomMins] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { addToast } = useToast();
  const { t, isBn } = useLanguage();

  if (!isOpen) return null;

  const durationOptions = [
    { label: t('durJustNow'), value: 'just_now' },
    { label: t('dur15m'), value: '15_min' },
    { label: t('dur30m'), value: '30_min' },
    { label: t('dur1h'), value: '1_hour' },
    { label: t('dur2h'), value: '2_hours' },
    { label: t('dur4h'), value: '4_hours_plus' },
    { label: t('durCustom'), value: 'custom' },
  ];

  const searchResults = searchQuery.trim()
    ? allLocations.filter(
        (l) =>
          l.nameBn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.nameEn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.district?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.districtBn?.includes(searchQuery)
      ).slice(0, 5)
    : [];

  const handleSendReport = async () => {
    if (!selectedLocation) {
      addToast(t('selectAreaFirstError'), 'error');
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
        locationId: selectedLocation._id,
        status,
        duration: duration || 'just_now',
        customMinutes: calculatedCustomMinutes,
        source: 'mobile_web',
      });

      if (res.data?.success) {
        const areaName = isBn ? selectedLocation.nameBn : selectedLocation.nameEn;
        addToast(
          isBn
            ? `✓ রিপোর্ট গ্রহণ করা হয়েছে: ${areaName}`
            : `✓ Report recorded for ${areaName}`,
          'success'
        );
        if (onReportSuccess) onReportSuccess();
        if (onClose) onClose();
      }
    } catch (err) {
      addToast(
        err.response?.data?.message || t('reportFailedToast'),
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/40 dark:bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-Over Drawer / Bottom Sheet */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#111214] shadow-2xl border-l border-stone-200 dark:border-zinc-800 flex flex-col justify-between h-full z-10 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
              {isBn ? 'বিদ্যুৎ পরিস্থিতি আপডেট' : 'Power Status Update'}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-zinc-100 mt-0.5">
              {t('reportPanelTitle')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Step 1: Area Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 dark:text-zinc-300 block">
              {t('stepAreaLabel')}
            </label>

            {selectedLocation ? (
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/80 dark:border-zinc-700/80 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-stone-900 dark:text-zinc-100">
                    {isBn ? selectedLocation.nameBn : selectedLocation.nameEn}
                    <span className="text-xs font-normal text-stone-400 dark:text-zinc-500 ml-1">
                      ({isBn ? selectedLocation.nameEn : selectedLocation.nameBn})
                    </span>
                  </div>
                  <div className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">
                    {isBn
                      ? `${selectedLocation.divisionBn} বিভাগ • ${selectedLocation.districtBn} জেলা`
                      : `${selectedLocation.district} • ${selectedLocation.division}`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClearSelection}
                  className="text-xs text-orange-600 dark:text-orange-400 hover:underline font-bold px-2 py-1"
                >
                  {t('changeAreaBtn')}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isBn ? "উপজেলা বা এলাকার নাম খুঁজুন..." : "Search upazila or area name..."}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-stone-900 dark:text-zinc-100 placeholder:text-stone-400 font-medium"
                  />
                </div>

                {onNearMe && (
                  <button
                    type="button"
                    onClick={onNearMe}
                    disabled={isLocating}
                    className="w-full py-1.5 px-3 rounded-xl bg-stone-100 dark:bg-zinc-800/80 hover:bg-orange-50 dark:hover:bg-orange-950/40 text-stone-700 dark:text-zinc-300 hover:text-orange-600 dark:hover:text-orange-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-stone-200 dark:border-zinc-700"
                  >
                    <Crosshair className={`w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 ${isLocating ? 'animate-spin' : ''}`} />
                    <span>{isLocating ? t('locatingBtn') : t('nearMeBtn')}</span>
                  </button>
                )}

                {searchResults.length > 0 && (
                  <div className="bg-white dark:bg-zinc-800 rounded-xl border border-stone-200 dark:border-zinc-700 shadow-lg overflow-hidden divide-y divide-stone-100 dark:divide-zinc-700">
                    {searchResults.map((loc) => (
                      <button
                        key={loc._id}
                        type="button"
                        onClick={() => {
                          onSelectLocation(loc);
                          setSearchQuery('');
                        }}
                        className="w-full p-2.5 text-left text-xs hover:bg-orange-50 dark:hover:bg-zinc-700/60 flex items-center justify-between transition-colors"
                      >
                        <div>
                          <div className="font-bold text-stone-900 dark:text-zinc-100 text-xs">
                            {isBn ? loc.nameBn : loc.nameEn} ({isBn ? loc.nameEn : loc.nameBn})
                          </div>
                          <div className="text-[10px] text-stone-400">
                            {isBn ? `${loc.divisionBn} • ${loc.districtBn}` : `${loc.district} • ${loc.division}`}
                          </div>
                        </div>
                        <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
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
                onClick={() => setStatus('available')}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all ${
                  status === 'available'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-zinc-800 text-stone-700 dark:text-zinc-300 border-stone-200 dark:border-zinc-700 hover:bg-stone-50 dark:hover:bg-zinc-700/60'
                }`}
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>{t('statusAvailableBtn')}</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('unavailable')}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all ${
                  status === 'unavailable'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-white dark:bg-zinc-800 text-stone-700 dark:text-zinc-300 border-stone-200 dark:border-zinc-700 hover:bg-stone-50 dark:hover:bg-zinc-700/60'
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
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {durationOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDuration(opt.value)}
                  className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-all border ${
                    duration === opt.value
                      ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                      : 'bg-stone-50 dark:bg-zinc-800/80 text-stone-700 dark:text-zinc-300 border-stone-200 dark:border-zinc-700 hover:bg-stone-100 dark:hover:bg-zinc-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Custom Duration Fields */}
            {duration === 'custom' && (
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-zinc-800/80 border border-stone-200 dark:border-zinc-700 space-y-2 mt-2">
                <span className="text-[11px] font-bold text-stone-600 dark:text-zinc-400 block">
                  {t('setCustomDuration')}
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="48"
                      value={customHours}
                      onChange={(e) => setCustomHours(e.target.value)}
                      placeholder="0"
                      className="w-full p-1.5 rounded-lg bg-white dark:bg-[#111214] border border-stone-200 dark:border-zinc-700 text-xs font-bold text-center text-stone-900 dark:text-zinc-100"
                    />
                    <span className="text-[11px] text-stone-500">{t('customHours')}</span>
                  </div>

                  <div className="flex-1 flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={customMins}
                      onChange={(e) => setCustomMins(e.target.value)}
                      placeholder="30"
                      className="w-full p-1.5 rounded-lg bg-white dark:bg-[#111214] border border-stone-200 dark:border-zinc-700 text-xs font-bold text-center text-stone-900 dark:text-zinc-100"
                    />
                    <span className="text-[11px] text-stone-500">{t('customMins')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 sm:p-5 border-t border-stone-100 dark:border-zinc-800 space-y-2">
          <button
            type="button"
            disabled={submitting || !selectedLocation}
            onClick={handleSendReport}
            className="w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{submitting ? t('submittingReportBtn') : t('submitReportBtn')}</span>
          </button>

          <p className="text-[10px] text-stone-400 text-center">
            {t('reportHelpNotice')}
          </p>
        </div>
      </div>
    </div>
  );
};
