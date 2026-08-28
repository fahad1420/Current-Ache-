import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Clock, RefreshCw, ChevronLeft, Share2, Zap, ZapOff, CheckCircle2 } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { ConsensusBar } from '../components/ConsensusBar';
import { ReportCard } from '../components/ReportCard';
import { DisclaimerBox } from '../components/DisclaimerBox';
import { CardSkeleton } from '../components/SkeletonLoader';
import { getBanglaRelativeTime } from '../utils/timeAgo';
import { toBn } from '../utils/banglaDigits';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export const AreaStatus = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { addToast } = useToast();

  const fetchAreaDetails = useCallback(async (showRefreshingSpinner = false) => {
    if (showRefreshingSpinner) setRefreshing(true);
    try {
      const res = await api.get(`/locations/${id}`);
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching area status:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    fetchAreaDetails();

    // Auto-polling refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAreaDetails(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchAreaDetails]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${data?.location?.nameBn} এলাকার বিদ্যুতের স্ট্যাটাস`,
          text: `দেখুন ${data?.location?.nameBn} এলাকায় কারেন্ট আছে কি না:`,
          url: window.location.href,
        });
      } catch {
        // Ignored
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      addToast('লিঙ্ক কপি করা হয়েছে!', 'info');
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
        <h2 className="text-2xl font-bold text-stone-900 dark:text-zinc-100">এলাকাটি পাওয়া যায়নি</h2>
        <p className="text-stone-500 dark:text-zinc-400">অনুরোধকৃত এলাকার তথ্য পাওয়া যায়নি।</p>
        <Link
          to="/areas"
          className="inline-block px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold"
        >
          সকল এলাকা দেখুন
        </Link>
      </div>
    );
  }

  const { location, status } = data;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Breadcrumb & Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-stone-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> লাইভ ম্যাপে ফিরে যান
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchAreaDetails(true)}
            className="p-2 rounded-xl text-stone-600 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="রিফ্রেশ করুন"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span className="hidden sm:inline">রিফ্রেশ</span>
          </button>
          <button
            onClick={handleShare}
            className="p-2 rounded-xl text-stone-600 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="শেয়ার করুন"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">শেয়ার</span>
          </button>
        </div>
      </div>

      {/* Main Area Status Hero Card */}
      <div className="bg-white dark:bg-[#111214] rounded-3xl p-6 sm:p-8 shadow-sm border border-stone-200/80 dark:border-zinc-800 space-y-6">
        {/* Header with Hierarchy */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 dark:text-zinc-400 mb-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{location.divisionBn} বিভাগ</span>
            <span>&bull;</span>
            <span>{location.districtBn} জেলা</span>
            {location.upazilaBn && (
              <>
                <span>&bull;</span>
                <span>{location.upazilaBn}</span>
              </>
            )}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-950 dark:text-slate-100">
              {location.nameBn}{' '}
              <span className="text-lg sm:text-xl font-normal text-stone-500 dark:text-zinc-400">
                ({location.nameEn})
              </span>
            </h1>
            <div>
              <StatusBadge status={status.status} size="lg" />
            </div>
          </div>
        </div>

        {/* Live Consensus and Percentages */}
        <ConsensusBar
          availablePercentage={status.availablePercentage}
          unavailablePercentage={status.unavailablePercentage}
          confidenceLabelBn={status.confidenceLabelBn}
          totalRecentReports={status.totalRecentReports}
        />

        {/* Freshness & Timestamps */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500 dark:text-zinc-400 pt-2 border-t border-stone-100 dark:border-zinc-800">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-stone-400 dark:text-zinc-500" />
            <span>
              সর্বশেষ রিপোর্ট:{' '}
              <strong className="text-slate-700 dark:text-slate-300 font-medium">
                {status.lastReportAt ? getBanglaRelativeTime(status.lastReportAt) : 'কোনো তথ্য নেই'}
              </strong>
            </span>
          </div>
          <div>
            সর্বমোট রিপোর্ট:{' '}
            <strong className="text-slate-700 dark:text-slate-300 font-medium">{toBn(status.totalReportsCountAllTime)}টি</strong>
          </div>
        </div>

        {/* Recent Locality Mentions */}
        {status.recentLocalities && status.recentLocalities.length > 0 && (
          <div className="bg-stone-50 dark:bg-zinc-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-xs font-semibold text-stone-500 dark:text-zinc-400 block mb-1.5">
              সাম্প্রতিক উল্লেখিত নির্দিষ্ট মহল্লা / সেক্টর:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {status.recentLocalities.map((locName, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 shadow-xs"
                >
                  📍 {locName}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 1-Tap Reporting Card */}
      <ReportCard
        location={location}
        onReportSuccess={(newStatus) => {
          if (newStatus) {
            setData((prev) => ({ ...prev, status: newStatus }));
          } else {
            fetchAreaDetails(false);
          }
        }}
      />

      <DisclaimerBox />
    </div>
  );
};
