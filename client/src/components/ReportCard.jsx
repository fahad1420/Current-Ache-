import React, { useState } from 'react';
import { Zap, ZapOff, Loader2, MapPin } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { toBn } from '../utils/banglaDigits';

export const ReportCard = ({ location, onReportSuccess }) => {
  const [locality, setLocality] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(null);
  const [submittedStatus, setSubmittedStatus] = useState(null);
  const { addToast } = useToast();

  const handleReport = async (status) => {
    if (!location?._id) return;
    setSubmitting(true);
    setSubmittedStatus(status);

    try {
      const res = await api.post('/reports', {
        locationId: location._id,
        status,
        locality: locality.trim(),
        source: window.innerWidth < 768 ? 'mobile_web' : 'web',
      });

      if (res.data?.success) {
        addToast(res.data.message || 'ধন্যবাদ! আপনার রিপোর্টটি গ্রহণ করা হয়েছে।', 'success');
        setLocality('');
        if (onReportSuccess) {
          onReportSuccess(res.data.data?.status);
        }
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'রিপোর্ট পাঠাতে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।';
      addToast(errorMessage, 'error');

      if (err.response?.data?.cooldownRemainingMinutes) {
        setCooldownTime(err.response.data.cooldownRemainingMinutes);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#111214] rounded-3xl p-5 sm:p-7 shadow-xl shadow-sm border border-stone-200/80 dark:border-zinc-800">
      <div className="text-center mb-6">
        <span className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 rounded-full text-xs font-bold tracking-wide uppercase mb-2">
          ১-ট্যাপে জানান
        </span>
        <h3 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-zinc-100 tracking-tight">
          আপনার এলাকার বিদ্যুতের অবস্থা কী?
        </h3>
        <p className="text-stone-500 dark:text-zinc-400 text-sm mt-1">
          {location?.nameBn ? `${location.nameBn}, ${location.districtBn}` : 'আপনার এলাকা'} নির্বাচন করা আছে
        </p>
      </div>

      {/* Big 1-Tap Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-5">
        {/* Available Button */}
        <button
          type="button"
          disabled={submitting}
          onClick={() => handleReport('available')}
          className="relative group p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 active:scale-[0.98] text-white shadow-lg shadow-emerald-500/25 transition-all duration-200 flex items-center justify-center gap-3 font-bold text-lg disabled:opacity-60 disabled:pointer-events-none"
        >
          {submitting && submittedStatus === 'available' ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 fill-current" />
            </div>
          )}
          <div className="text-left">
            <div className="text-lg sm:text-xl font-extrabold leading-tight">🟢 কারেন্ট আছে</div>
            <div className="text-xs text-emerald-100 font-normal">বিদ্যুৎ সরবরাহ চালু আছে</div>
          </div>
        </button>

        {/* Unavailable Button */}
        <button
          type="button"
          disabled={submitting}
          onClick={() => handleReport('unavailable')}
          className="relative group p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 active:scale-[0.98] text-white shadow-lg shadow-rose-500/25 transition-all duration-200 flex items-center justify-center gap-3 font-bold text-lg disabled:opacity-60 disabled:pointer-events-none"
        >
          {submitting && submittedStatus === 'unavailable' ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ZapOff className="w-6 h-6" />
            </div>
          )}
          <div className="text-left">
            <div className="text-lg sm:text-xl font-extrabold leading-tight">🔴 কারেন্ট নেই</div>
            <div className="text-xs text-rose-100 font-normal">লোডশেডিং / বিদ্যুৎ বিভ্রাট</div>
          </div>
        </button>
      </div>

      {/* Optional Locality Input */}
      <div className="mt-4 pt-4 border-t border-stone-100 dark:border-zinc-800">
        <label className="block text-xs font-semibold text-stone-600 dark:text-zinc-400 mb-1.5">
          নির্দিষ্ট এলাকা বা মহল্লার নাম (ঐচ্ছিক):
        </label>
        <div className="relative flex items-center">
          <MapPin className="w-4 h-4 text-stone-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
            placeholder="যেমন: মিরপুর ১০, ব্লক-সি, হাউজিং এস্টেট..."
            maxLength={100}
            className="w-full pl-9 pr-3 py-2 text-sm bg-stone-50 dark:bg-zinc-800/80 border border-stone-200 dark:border-zinc-700 rounded-xl focus:bg-white dark:focus:bg-[#111214] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-stone-400 dark:placeholder:text-slate-500 text-slate-800 dark:text-slate-100"
          />
        </div>
      </div>

      {cooldownTime && (
        <div className="mt-3 text-xs text-orange-600 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/40 p-2.5 rounded-xl border border-orange-200 dark:border-orange-800 text-center">
          ⏳ স্প্যাম রোধে প্রতি ১০ মিনিটে ১ বার রিপোর্ট গ্রহণ করা হয়। পরবর্তী রিপোর্টের জন্য আরও {toBn(cooldownTime)} মিনিট অপেক্ষা করুন।
        </div>
      )}
    </div>
  );
};
