import React from 'react';
import { Link } from 'react-router-dom';
import { X, MapPin, Clock, ArrowRight, Zap, HelpCircle } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { ConsensusBar } from './ConsensusBar';
import { getBanglaRelativeTime } from '../utils/timeAgo';
import { toBn } from '../utils/banglaDigits';
import { useLanguage } from '../context/LanguageContext';

export const LocationBottomSheet = ({
  location,
  onClose,
  onOpenReportModal,
}) => {
  const { t, isBn } = useLanguage();
  if (!location) return null;

  const hasData = location.totalRecentReports > 0;

  return (
    <div className="fixed inset-x-0 bottom-0 sm:bottom-6 sm:left-auto sm:right-6 sm:w-96 z-40 animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto">
      <div className="bg-white/95 dark:bg-[#111214]/95 backdrop-blur-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-stone-200/80 dark:border-zinc-800 text-stone-900 dark:text-zinc-100 max-h-[85vh] overflow-y-auto">
        {/* Mobile Pull Bar */}
        <div className="w-12 h-1.5 bg-stone-300 dark:bg-zinc-700 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-stone-100 dark:border-zinc-800 pb-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-zinc-400 mb-0.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{isBn ? `${location.divisionBn} বিভাগ` : location.division}</span>
              <span>&bull;</span>
              <span>{isBn ? `${location.districtBn} জেলা` : location.district}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">
              {isBn ? location.nameBn : location.nameEn}{' '}
              <span className="text-sm font-normal text-stone-400 dark:text-zinc-500">
                ({isBn ? location.nameEn : location.nameBn})
              </span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 dark:text-zinc-500 hover:text-stone-600 dark:hover:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Close bottom sheet"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Badge & Freshness */}
        <div className="py-4 space-y-4">
          <div className="flex items-center justify-between">
            <StatusBadge status={location.status} size="md" />
            <div className="text-right text-xs text-stone-400 dark:text-zinc-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{location.lastReportAt ? getBanglaRelativeTime(location.lastReportAt) : t('noReportYet')}</span>
            </div>
          </div>

          {/* Consensus Bar */}
          <ConsensusBar
            availablePercentage={location.availablePercentage || 0}
            unavailablePercentage={location.unavailablePercentage || 0}
            confidenceLabelBn={hasData ? t('communityConfidence') : ''}
            totalRecentReports={location.totalRecentReports || 0}
          />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => onOpenReportModal(location)}
            className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>{t('reportNowBtn')}</span>
          </button>

          <Link
            to={`/area/${location.slug || location._id}`}
            className="py-3 px-4 rounded-xl bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-700 text-stone-800 dark:text-zinc-200 font-bold text-sm flex items-center justify-center gap-1 transition-colors"
          >
            <span>{t('viewDetailsBtn')}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
