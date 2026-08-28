import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Clock, RefreshCw, ChevronLeft, Share2, Zap, ZapOff, CheckCircle2, Calendar } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { ConsensusBar } from '../components/ConsensusBar';
import { ReportCard } from '../components/ReportCard';
import { DisclaimerBox } from '../components/DisclaimerBox';
import { CardSkeleton } from '../components/SkeletonLoader';
import { getBanglaRelativeTime } from '../utils/timeAgo';
import { toBn } from '../utils/banglaDigits';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import defaultLocations from '../data/bangladeshLocations.json';
import api from '../services/api';

export const AreaStatus = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { addToast } = useToast();
  const { t, isBn } = useLanguage();

  const fetchAreaDetails = useCallback(async (showRefreshingSpinner = false) => {
    if (showRefreshingSpinner) setRefreshing(true);
    try {
      const res = await api.get(`/locations/${id}`);
      if (res.data?.success) {
        setData(res.data.data);
      } else {
        // Fallback to static location if API returned false
        const matched = defaultLocations.find(l => l.slug === id || l._id === id);
        if (matched) {
          setData({ location: matched, status: 'insufficient_data', recentReports: [] });
        }
      }
    } catch (err) {
      // Fallback to static location if offline
      const matched = defaultLocations.find(l => l.slug === id || l._id === id);
      if (matched) {
        setData({ location: matched, status: 'insufficient_data', recentReports: [] });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    fetchAreaDetails();

    const interval = setInterval(() => {
      fetchAreaDetails(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchAreaDetails]);

  const handleShare = async () => {
    const areaName = isBn ? data?.location?.nameBn : data?.location?.nameEn;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${areaName} এলাকার বিদ্যুতের স্ট্যাটাস`,
          text: `দেখুন ${areaName} এলাকায় কারেন্ট আছে কি না:`,
          url: window.location.href,
        });
      } catch {
        // Ignored
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      addToast(isBn ? 'লিঙ্ক কপি করা হয়েছে!' : 'Link copied to clipboard!', 'info');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (!data?.location) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-2xl font-bold text-stone-900 dark:text-zinc-100">
          {isBn ? 'এলাকাটি পাওয়া যায়নি' : 'Location Not Found'}
        </h2>
        <p className="text-stone-500 dark:text-zinc-400">
          {isBn ? 'অনুরোধকৃত এলাকার তথ্য পাওয়া যায়নি।' : 'The requested area information could not be found.'}
        </p>
        <Link
          to="/areas"
          className="inline-block px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors shadow-xs"
        >
          {isBn ? 'সকল এলাকা দেখুন' : 'Browse All Areas'}
        </Link>
      </div>
    );
  }

  const { location, status } = data;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Breadcrumb & Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-stone-600 dark:text-zinc-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> {isBn ? 'লাইভ ম্যাপে ফিরে যান' : 'Back to Live Map'}
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchAreaDetails(true)}
            disabled={refreshing}
            className="p-2 rounded-xl bg-white dark:bg-[#111214] border border-stone-200 dark:border-zinc-800 text-stone-600 dark:text-zinc-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors text-xs font-semibold flex items-center gap-1 shadow-xs"
            title={isBn ? 'রিফ্রেশ করুন' : 'Refresh'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-orange-500' : ''}`} />
            <span className="hidden sm:inline">{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="p-2 rounded-xl bg-white dark:bg-[#111214] border border-stone-200 dark:border-zinc-800 text-stone-600 dark:text-zinc-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors text-xs font-semibold flex items-center gap-1 shadow-xs"
            title={isBn ? 'শেয়ার করুন' : 'Share'}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isBn ? 'শেয়ার' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Main Status Hero Card */}
      <div className="bg-white dark:bg-[#111214] rounded-3xl p-6 sm:p-8 shadow-sm border border-stone-200/80 dark:border-zinc-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-stone-100 dark:border-zinc-800 pb-6">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-zinc-400 mb-1">
              <MapPin className="w-3.5 h-3.5 text-orange-500" />
              <span>{isBn ? `${location.divisionBn} বিভাগ` : location.division}</span>
              <span>&bull;</span>
              <span>{isBn ? `${location.districtBn} জেলা` : location.district}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-stone-900 dark:text-zinc-100 tracking-tight">
              {isBn ? location.nameBn : location.nameEn}{' '}
              <span className="text-base sm:text-lg font-normal text-stone-400 dark:text-zinc-500">
                ({isBn ? location.nameEn : location.nameBn})
              </span>
            </h1>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1.5">
            <StatusBadge status={status} size="lg" />
            <span className="text-xs text-stone-400 dark:text-zinc-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {location.lastReportAt ? getBanglaRelativeTime(location.lastReportAt) : (isBn ? 'কোনো সাম্প্রতিক রিপোর্ট নেই' : 'No recent reports')}
            </span>
          </div>
        </div>

        {/* Live Community Consensus */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-stone-900 dark:text-zinc-100">
            {isBn ? 'কমিউনিটি কনসেনসাস ও রিপোর্ট অনুপাত:' : 'Community Consensus & Ratio:'}
          </h3>
          <ConsensusBar
            availablePercentage={location.availablePercentage || 0}
            unavailablePercentage={location.unavailablePercentage || 0}
            confidenceLabelBn={isBn ? 'উচ্চ নির্ভরযোগ্যতা' : 'High Reliability'}
            totalRecentReports={location.totalRecentReports || 0}
          />
        </div>

        {/* Action Links */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-100 dark:border-zinc-800">
          <Link
            to={`/history?id=${location.slug || location._id}`}
            className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-700 text-stone-900 dark:text-zinc-100 font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Clock className="w-3.5 h-3.5 text-orange-500" />
            <span>{isBn ? 'সম্পূর্ণ ইতিহাস ও অ্যানালিটিক্স' : 'Outage History & Analytics'}</span>
          </Link>

          <Link
            to={`/schedules?id=${location.slug || location._id}`}
            className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-700 text-stone-900 dark:text-zinc-100 font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 text-orange-500" />
            <span>{isBn ? 'বিদ্যুৎ সময়সূচি' : 'Power Schedule'}</span>
          </Link>
        </div>
      </div>

      {/* 1-Tap Report Card */}
      <ReportCard location={location} onReportSuccess={() => fetchAreaDetails(true)} />

      {/* Disclaimer */}
      <DisclaimerBox />
    </div>
  );
};
export default AreaStatus;
