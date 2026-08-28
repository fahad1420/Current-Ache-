import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Zap, PlugZap, Activity, AlertTriangle } from 'lucide-react';
import { toBn } from '../utils/banglaDigits';
import { getBanglaRelativeTime } from '../utils/timeAgo';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';

export const Stats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t, isBn } = useLanguage();

  const formatNumber = (num) => (isBn ? toBn(num) : num);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/stats');
        if (res.data?.success) {
          setStats(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-pulse">
        <div className="h-8 bg-stone-200 dark:bg-zinc-800 rounded-xl w-1/3"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-28 bg-stone-100 dark:bg-[#111214] rounded-2xl"></div>
          <div className="h-28 bg-stone-100 dark:bg-[#111214] rounded-2xl"></div>
          <div className="h-28 bg-stone-100 dark:bg-[#111214] rounded-2xl"></div>
          <div className="h-28 bg-stone-100 dark:bg-[#111214] rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/60 text-xs font-bold mb-2">
          <Activity className="w-3.5 h-3.5" />
          <span>{isBn ? 'সারাদেশের কমিউনিটি বিশ্লেষণ' : 'National Real-Time Analysis'}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-zinc-100 tracking-tight">
          {t('statsPageTitle')}
        </h1>
        <p className="text-stone-500 dark:text-zinc-400 text-xs sm:text-sm mt-1 max-w-xl">
          {t('statsPageSubtitle')}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111214] p-5 rounded-2xl border border-stone-200 dark:border-zinc-800 shadow-xs space-y-1">
          <div className="text-xs font-bold text-stone-500 dark:text-zinc-400">{t('statsTodayReports')}</div>
          <div className="text-3xl font-bold text-stone-900 dark:text-zinc-100">
            {formatNumber(stats?.totalReportsToday || 0)}
          </div>
          <div className="text-[11px] text-stone-400 dark:text-zinc-500">{isBn ? 'আজ মধ্যরাত থেকে গণনা' : 'Counted from midnight'}</div>
        </div>

        <div className="bg-white dark:bg-[#111214] p-5 rounded-2xl border border-stone-200 dark:border-zinc-800 shadow-xs space-y-1">
          <div className="text-xs font-bold text-stone-500 dark:text-zinc-400">{isBn ? 'সক্রিয় মনিটরকৃত এলাকা' : 'Active Monitored Areas'}</div>
          <div className="text-3xl font-bold text-orange-500 dark:text-orange-400">
            {formatNumber(stats?.activeAreasCount || 0)}
          </div>
          <div className="text-[11px] text-stone-400 dark:text-zinc-500">{isBn ? 'গত ৪ ঘণ্টার রিপোর্ট অনুযায়ী' : 'Based on last 4 hours'}</div>
        </div>

        <div className="bg-white dark:bg-[#111214] p-5 rounded-2xl border border-stone-200 dark:border-zinc-800 shadow-xs space-y-1">
          <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>{isBn ? 'বিদ্যুৎ সচল এলাকা' : 'Power Online Areas'}</span>
          </div>
          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatNumber(stats?.areasAvailableCount || 0)}
          </div>
          <div className="text-[11px] text-stone-400 dark:text-zinc-500">{isBn ? 'সংখ্যাগরিষ্ঠ সচল রিপোর্ট' : 'Majority online reports'}</div>
        </div>

        <div className="bg-white dark:bg-[#111214] p-5 rounded-2xl border border-stone-200 dark:border-zinc-800 shadow-xs space-y-1">
          <div className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1">
            <PlugZap className="w-3.5 h-3.5" />
            <span>{isBn ? 'লোডশেডিং / বিভ্রাট এলাকা' : 'Active Outage Areas'}</span>
          </div>
          <div className="text-3xl font-bold text-rose-600 dark:text-rose-400">
            {formatNumber(stats?.areasUnavailableCount || 0)}
          </div>
          <div className="text-[11px] text-stone-400 dark:text-zinc-500">{isBn ? 'সংখ্যাগরিষ্ঠ বিভ্রাট রিপোর্ট' : 'Majority outage reports'}</div>
        </div>
      </div>

      {/* Top Outages List */}
      <div className="bg-white dark:bg-[#111214] rounded-2xl p-5 sm:p-6 border border-stone-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-zinc-100">
            {isBn ? 'সর্বাধিক লোডশেডিং/বিভ্রাটের রিপোর্ট পাওয়া জেলা' : 'Districts with Most Outage Reports'}
          </h2>
        </div>

        {stats?.topOutageAreas && stats.topOutageAreas.length > 0 ? (
          <div className="divide-y divide-stone-100 dark:divide-zinc-800">
            {stats.topOutageAreas.map((item, idx) => {
              const districtName = isBn
                ? (item.districtBn || item.nameBn || item.location?.districtBn || item.location?.nameBn || 'জেলা')
                : (item.districtEn || item.nameEn || item.location?.district || item.location?.nameEn || 'District');
              const divisionName = isBn
                ? (item.divisionBn || item.location?.divisionBn || '')
                : (item.divisionEn || item.location?.division || '');
              const count = item.outageReportsCount || item.reportsCount || 0;

              return (
                <div
                  key={idx}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 font-bold text-xs flex items-center justify-center shrink-0">
                      {isBn ? toBn(idx + 1) : idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-stone-900 dark:text-zinc-100 text-sm">
                        {districtName} {isBn ? 'জেলা' : 'District'}
                      </div>
                      {divisionName && !divisionName.includes('undefined') && (
                        <div className="text-xs text-stone-500 dark:text-zinc-400">
                          {isBn ? `${divisionName} বিভাগ` : `${divisionName} Division`}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60 rounded-full text-xs font-bold">
                      {formatNumber(count)} {isBn ? 'বার' : 'times'}
                    </span>
                    {item.lastOutageReport && (
                      <div className="text-xs text-stone-400 dark:text-zinc-500">
                        {getBanglaRelativeTime(item.lastOutageReport)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center text-stone-500 dark:text-zinc-400 text-xs bg-stone-50 dark:bg-[#111214]/60 rounded-xl">
            {isBn ? 'সাম্প্রতিক সময়ে কোনো উল্লেখযোগ্য লোডশেডিং রিপোর্ট জমা পড়েনি।' : 'No major outage hotspots reported recently.'}
          </div>
        )}
      </div>
    </div>
  );
};
