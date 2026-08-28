import React, { useState, useEffect } from 'react';
import {
  Zap,
  PlugZap,
  Clock,
  MapPin,
  X,
  Share2,
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  TrendingDown,
  ShieldCheck,
  Check,
  ArrowRight
} from 'lucide-react';
import { toBn } from '../utils/banglaDigits';
import { getBanglaRelativeTime } from '../utils/timeAgo';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';

export const AreaHistoryDrawer = ({
  location,
  isOpen,
  onClose,
  onOpenReport,
}) => {
  const [activePeriod, setActivePeriod] = useState('24h');
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { addToast } = useToast();
  const { t, isBn } = useLanguage();

  useEffect(() => {
    if (location && isOpen) {
      const fetchHistory = async () => {
        setLoading(true);
        try {
          const res = await api.get(`/locations/${location._id || location.slug}/history`);
          if (res.data?.success) {
            setHistoryData(res.data.data);
          }
        } catch (err) {
          console.error('Failed to load area history:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchHistory();
    }
  }, [location, isOpen]);

  if (!isOpen || !location) return null;

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
    const shareUrl = `${window.location.origin}/history?id=${location.slug || location._id}`;
    const shareText = isBn
      ? `⚡ কারেন্ট আছে?: ${location.nameBn} (${location.districtBn}) এর বর্তমান বিদ্যুৎ পরিস্থিতি ও বিভ্রাট হিস্ট্রি দেখুন:`
      : `⚡ CurrentAche BD: Check live electricity status & outage history for ${location.nameEn}:`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: isBn ? `${location.nameBn} - কারেন্ট আছে?` : `${location.nameEn} - CurrentAche BD`,
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

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/40 dark:bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-lg bg-white dark:bg-[#111214] shadow-2xl border-l border-stone-200 dark:border-zinc-800 flex flex-col justify-between h-full z-10 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 dark:border-zinc-800 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-stone-400 dark:text-zinc-500 uppercase tracking-wider">
                {isBn ? `${location.divisionBn} বিভাগ • ${location.districtBn} জেলা` : `${location.district} • ${location.division}`}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-zinc-100 mt-0.5">
              {isBn ? location.nameBn : location.nameEn}{' '}
              <span className="text-xs font-normal text-stone-400 dark:text-zinc-500">
                ({isBn ? location.nameEn : location.nameBn})
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleShare}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
              title={t('shareAreaBtn')}
              aria-label="Share area status"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-orange-500" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Estimated Power Restoration Time Banner */}
          {historyData?.restorationEstimate && (
            <div className="space-y-2">
              {historyData.restorationEstimate.isActiveOutage ? (
                <div className="p-4 rounded-2xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/70 dark:border-orange-900/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-orange-950 dark:text-orange-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-orange-500 fill-current" />
                      {t('estimatedRestorationTitle')}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 text-stone-700 dark:text-zinc-300 border border-stone-200 dark:border-zinc-700">
                      {historyData.restorationEstimate.isDefaultEstimate
                        ? t('estimatedDefaultNote')
                        : t('estimatedCommunityNote')}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <div>
                      <span className="text-[10px] text-stone-500 dark:text-zinc-400 block font-medium">
                        {t('expectedReturnTime')}
                      </span>
                      <div className="text-lg font-bold text-stone-900 dark:text-zinc-100">
                        {formatLocalTime(historyData.restorationEstimate.estimatedTimeISO)}
                      </div>
                    </div>

                    <div className="text-xs font-bold text-orange-600 dark:text-orange-400">
                      {t('approxRemaining')} {formatDuration(historyData.restorationEstimate.estimatedDurationMinutes)}
                    </div>
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
          )}

          {/* Current Status & Reliability Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Status Card */}
            <div className="p-3 rounded-xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/80 dark:border-zinc-700/80">
              <span className="text-[10px] font-bold text-stone-400 dark:text-zinc-500 block mb-1">
                {t('stepStatusLabel')}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    location.status === 'available'
                      ? 'bg-emerald-500 animate-pulse'
                      : location.status === 'unavailable'
                      ? 'bg-rose-500 animate-pulse'
                      : 'bg-stone-400'
                  }`}
                />
                <span className="font-bold text-xs sm:text-sm text-stone-900 dark:text-zinc-100">
                  {location.status === 'available'
                    ? t('statusAvailableBtn')
                    : location.status === 'unavailable'
                    ? t('statusUnavailableBtn')
                    : t('insufficientDataBadge')}
                </span>
              </div>
            </div>

            {/* Reliability Score Card */}
            <div className="p-3 rounded-xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/80 dark:border-zinc-700/80">
              <span className="text-[10px] font-bold text-stone-400 dark:text-zinc-500 block mb-1">
                {t('reliabilityScore')}
              </span>
              {historyData?.reliability?.score !== null && historyData?.reliability?.score !== undefined ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {isBn ? toBn(historyData.reliability.score) : historyData.reliability.score}%
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    {historyData.reliability.grade === 'high'
                      ? t('reliabilityHigh')
                      : historyData.reliability.grade === 'moderate'
                      ? t('reliabilityModerate')
                      : t('reliabilityLow')}
                  </span>
                </div>
              ) : (
                <div className="text-xs text-stone-400 dark:text-zinc-500 font-medium">
                  {t('reliabilityInsufficient')}
                </div>
              )}
            </div>
          </div>

          {/* Historical Periods Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-stone-900 dark:text-zinc-100">
                {t('historyTitle')}
              </h3>
              <span className="text-[10px] text-stone-400 dark:text-zinc-500">{t('historySubtitle')}</span>
            </div>

            {/* Period Selector Pills */}
            <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-zinc-800/80 rounded-xl border border-stone-200/80 dark:border-zinc-700/80 text-xs font-bold overflow-x-auto">
              {periods.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setActivePeriod(p.key)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all whitespace-nowrap ${
                    activePeriod === p.key
                      ? 'bg-white dark:bg-zinc-700 text-stone-900 dark:text-white shadow-xs'
                      : 'text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Period Metrics Grid */}
            {loading ? (
              <div className="p-8 flex justify-center items-center">
                <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-zinc-800/40 border border-stone-200/70 dark:border-zinc-800 text-center">
                  <span className="text-[10px] text-stone-400 dark:text-zinc-500 block">{t('totalOutages')}</span>
                  <span className="text-base font-bold text-rose-600 dark:text-rose-400">
                    {isBn ? toBn(currentStats.outageEvents) : currentStats.outageEvents} {t('timesOutageUnit')}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-zinc-800/40 border border-stone-200/70 dark:border-zinc-800 text-center">
                  <span className="text-[10px] text-stone-400 dark:text-zinc-500 block">{t('totalRestorations')}</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {isBn ? toBn(currentStats.restorationEvents) : currentStats.restorationEvents} {t('timesOutageUnit')}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-zinc-800/40 border border-stone-200/70 dark:border-zinc-800 text-center">
                  <span className="text-[10px] text-stone-400 dark:text-zinc-500 block">{t('totalOutageTime')}</span>
                  <span className="text-xs font-bold text-stone-800 dark:text-zinc-200">
                    {formatDuration(currentStats.totalOutageMinutes)}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-zinc-800/40 border border-stone-200/70 dark:border-zinc-800 text-center">
                  <span className="text-[10px] text-stone-400 dark:text-zinc-500 block">{t('avgOutageTime')}</span>
                  <span className="text-xs font-bold text-stone-800 dark:text-zinc-200">
                    {formatDuration(currentStats.averageOutageMinutes)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Recent Interruption Timeline */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-stone-900 dark:text-zinc-100">
              {t('recentTimelineTitle')}
            </h4>

            {historyData?.recentTimeline && historyData.recentTimeline.length > 0 ? (
              <div className="divide-y divide-stone-100 dark:divide-zinc-800 border border-stone-200/80 dark:border-zinc-800 rounded-xl overflow-hidden">
                {historyData.recentTimeline.map((item) => {
                  const isAvail = item.status === 'available';
                  return (
                    <div key={item.id} className="p-2.5 px-3 flex items-center justify-between text-xs bg-white dark:bg-[#111214]">
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
              <div className="p-4 text-center text-xs text-stone-400 dark:text-zinc-500 bg-stone-50 dark:bg-zinc-800/40 rounded-xl border border-stone-200/70 dark:border-zinc-800">
                {t('reliabilityInsufficient')}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-stone-100 dark:border-zinc-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenReport) onOpenReport(location);
            }}
            className="flex-1 py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs transition-all"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>{t('reportNowBtn')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
