import React, { useState, useEffect } from 'react';
import { Zap, PlugZap, Clock, Radio, ChevronRight } from 'lucide-react';
import { getBanglaRelativeTime } from '../utils/timeAgo';
import { toBn } from '../utils/banglaDigits';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';

export const RecentReportsTicker = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t, isBn } = useLanguage();

  const fetchReports = async () => {
    try {
      const res = await api.get('/reports/recent?limit=8');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setReports(res.data.data);
      }
    } catch (err) {
      console.warn('Error fetching recent reports stream:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    const interval = setInterval(fetchReports, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-4 bg-stone-200 dark:bg-zinc-800 rounded w-36"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="h-14 bg-stone-100 dark:bg-zinc-800/60 rounded-xl"></div>
          <div className="h-14 bg-stone-100 dark:bg-zinc-800/60 rounded-xl"></div>
          <div className="h-14 bg-stone-100 dark:bg-zinc-800/60 rounded-xl"></div>
          <div className="h-14 bg-stone-100 dark:bg-zinc-800/60 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
          </span>
          <h2 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-zinc-100 tracking-tight flex items-center gap-1.5">
            <span>{t('recentReportsTitle')}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/60 font-bold">
              {t('recentReportsLiveTag')}
            </span>
          </h2>
        </div>
      </div>

      {reports.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {reports.map((report, idx) => {
            const isAvailable = report.status === 'available';
            const loc = report.location || report.locationId || {};
            const locName = isBn ? (loc.nameBn || loc.nameEn || 'এলাকা') : (loc.nameEn || loc.nameBn || 'Area');
            const distName = isBn ? (loc.districtBn || loc.district || '') : (loc.district || loc.districtBn || '');

            return (
              <div
                key={report.id || report._id || `rep_${idx}`}
                className="p-2.5 bg-white dark:bg-[#111214] hover:bg-stone-50 dark:hover:bg-zinc-800/80 rounded-xl transition-colors border border-stone-200/80 dark:border-zinc-800/80 shadow-xs flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isAvailable
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {isAvailable ? (
                      <Zap className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <PlugZap className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-xs text-stone-900 dark:text-zinc-100 truncate">
                      {locName}
                    </div>
                    <div className="text-[10px] text-stone-400 dark:text-zinc-500 truncate">
                      {distName ? (isBn ? `${distName} জেলা` : `${distName}`) : ''}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 pl-2">
                  <span
                    className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      isAvailable
                        ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {isAvailable ? (t('statusYes') || 'আছে') : (t('statusNo') || 'নেই')}
                  </span>
                  <div className="text-[9px] text-stone-400 dark:text-zinc-500 mt-0.5">
                    {getBanglaRelativeTime(report.createdAt)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-4 text-center text-xs text-stone-400 dark:text-zinc-500 bg-white dark:bg-[#111214] rounded-xl border border-stone-200 dark:border-zinc-800">
          {t('noRecentReports') || 'এখনও কোনো লাইভ রিপোর্ট পাওয়া যায়নি।'}
        </div>
      )}
    </div>
  );
};
export default RecentReportsTicker;
