import React from 'react';
import { Link } from 'react-router-dom';
import { ZapOff, ArrowLeft } from 'lucide-react';

export const NotFound = () => {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center space-y-5">
      <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
        <ZapOff className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900">৪০৪ - পেজটি পাওয়া যায়নি</h1>
      <p className="text-slate-500 text-sm">
        আপনি যে পৃষ্ঠাটি খুঁজছেন তা স্থানান্তরিত হয়েছে অথবা মুছে ফেলা হয়েছে।
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> হোম পেজে ফিরে যান
      </Link>
    </div>
  );
};
