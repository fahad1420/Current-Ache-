import React from 'react';
import { Crosshair, RotateCcw, Zap, PlugZap } from 'lucide-react';
import { toBn } from '../utils/banglaDigits';
import { useLanguage } from '../context/LanguageContext';

export const StatusHUD = ({
  summary = { total: 593, available: 0, unavailable: 0, insufficient: 593 },
  activeFilter = 'all',
  onFilterChange,
  onResetMap,
  onMyLocation,
  isLocating = false,
}) => {
  const { t, isBn } = useLanguage();

  return (
    <div className="flex items-center gap-1.5 bg-white/95 dark:bg-[#111214]/95 border border-stone-200/90 dark:border-zinc-800 px-2.5 py-1.5 rounded-xl border shadow-md text-xs transition-colors">
      {/* Available Count Pill */}
      <div className="flex items-center gap-1.5 px-2 py-0.5 text-emerald-700 dark:text-emerald-400 font-bold shrink-0">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>{isBn ? toBn(summary.available || 0) : summary.available || 0}</span>
        <span className="text-[10px] font-normal text-stone-500 dark:text-zinc-400 hidden xl:inline">
          {t('inAreasAvailable')}
        </span>
      </div>

      <span className="w-px h-3.5 bg-stone-200 dark:bg-zinc-800 mx-0.5 shrink-0"></span>

      {/* Outage Count Pill */}
      <div className="flex items-center gap-1.5 px-2 py-0.5 text-rose-700 dark:text-rose-400 font-bold shrink-0">
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
        <span>{isBn ? toBn(summary.unavailable || 0) : summary.unavailable || 0}</span>
        <span className="text-[10px] font-normal text-stone-500 dark:text-zinc-400 hidden xl:inline">
          {t('inAreasUnavailable')}
        </span>
      </div>

      <span className="w-px h-3.5 bg-stone-200 dark:bg-zinc-800 mx-0.5 shrink-0"></span>

      {/* Filter Segmented Buttons */}
      <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-zinc-800/80 p-0.5 rounded-lg text-[11px] font-bold shrink-0">
        <button
          type="button"
          onClick={() => onFilterChange('all')}
          className={`px-2 py-0.5 rounded-md transition-all ${
            activeFilter === 'all'
              ? 'bg-white dark:bg-zinc-700 text-stone-900 dark:text-white shadow-xs'
              : 'text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white'
          }`}
        >
          {t('filterAll')}
        </button>
        <button
          type="button"
          onClick={() => onFilterChange('available')}
          className={`px-2 py-0.5 rounded-md transition-all ${
            activeFilter === 'available'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white'
          }`}
        >
          {t('filterAvailable')}
        </button>
        <button
          type="button"
          onClick={() => onFilterChange('unavailable')}
          className={`px-2 py-0.5 rounded-md transition-all ${
            activeFilter === 'unavailable'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white'
          }`}
        >
          {t('filterUnavailable')}
        </button>
      </div>

      <span className="w-px h-3.5 bg-stone-200 dark:bg-zinc-800 mx-0.5 shrink-0"></span>

      {/* Manual Geolocation Trigger Button (NO auto-trigger) */}
      {onMyLocation && (
        <button
          type="button"
          onClick={onMyLocation}
          disabled={isLocating}
          className="p-1.5 rounded-lg text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 shrink-0"
          title={t('myLocationTooltip')}
          aria-label={t('myLocationTooltip')}
        >
          <Crosshair className={`w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 ${isLocating ? 'animate-spin' : ''}`} />
        </button>
      )}

      {/* Reset Map View */}
      {onResetMap && (
        <button
          type="button"
          onClick={onResetMap}
          className="p-1.5 rounded-lg text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
          title={t('resetMapTooltip')}
          aria-label={t('resetMapTooltip')}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
