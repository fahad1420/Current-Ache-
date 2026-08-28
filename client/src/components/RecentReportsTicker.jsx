import React, { useState, useEffect, useCallback } from 'react';
import { Zap, PlugZap, Clock, Radio, ChevronDown, Loader2 } from 'lucide-react';
import { getBanglaRelativeTime } from '../utils/timeAgo';
import { toBn } from '../utils/banglaDigits';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';

export const RecentReportsTicker = ({ refreshTrigger = 0 }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const { t, isBn } = useLanguage();

  const fetchReports = useCallback(async (targetPage = 1, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      }
      const res = await api.get(`/reports?page=${targetPage}&limit=100`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        const incoming = res.data.data;
        const totalCount = res.data.total || incoming.length;
        setTotal(totalCount);

        if (append) {
          setReports((prev) => {
            const existingIds = new Set(prev.map((r) => r._id || r.id));
            const newUnique = incoming.filter((r) => !existingIds.has(r._id || r.id));
            const combined = [...prev, ...newUnique];
            setHasMore(combined.length < totalCount && (res.data.hasMore ?? (targetPage * 100 < totalCount)));
            return combined;
          });
          setPage(targetPage);
        } else {
          setReports(incoming);
          setPage(1);
          setHasMore(incoming.length < totalCount && (res.data.hasMore ?? (100 < totalCount)));
        }
      }
    } catch (err) {
      console.warn('Error fetching recent reports stream:', err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchReports(1, false);
    const interval = setInterval(() => {
      // Background silent refresh for current view without resetting if user loaded more
      fetchReports(1, false);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchReports]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchReports(1, false);
    }
  }, [refreshTrigger, fetchReports]);

  const handleViewMore = () => {
    if (loadingMore || !hasMore) return;
    fetchReports(page + 1, true);
  };

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

        {total > 0 && (
          <span className="text-[11px] font-medium text-stone-400 dark:text-zinc-500">
            {isBn ? `মোট ${toBn(reports.length)}/${toBn(total)} টি রিপোর্ট` : `${reports.length}/${total} reports`}
          </span>
        )}
      </div>

      {reports.length > 0 ? (
        <>
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

          {/* Paginate / View More Button */}
          {hasMore && (
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={handleViewMore}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-stone-800 dark:text-zinc-200 font-bold text-xs flex items-center gap-2 transition-all border border-stone-200/80 dark:border-zinc-700/80 shadow-xs active:scale-[0.98] disabled:opacity-60"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
                    <span>{isBn ? 'লোড হচ্ছে...' : 'Loading...'}</span>
                  </>
                ) : (
                  <>
                    <span>{isBn ? 'আরও দেখুন' : 'View More'}</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="p-4 text-center text-xs text-stone-400 dark:text-zinc-500 bg-white dark:bg-[#111214] rounded-xl border border-stone-200 dark:border-zinc-800">
          {t('noRecentReports') || 'এখনও কোনো লাইভ রিপোর্ট পাওয়া যায়নি।'}
        </div>
      )}
    </div>
  );
};
export default RecentReportsTicker;
