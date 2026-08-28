import React from 'react';
import { toBn } from '../utils/banglaDigits';
import { ShieldCheck } from 'lucide-react';

export const ConsensusBar = ({ availablePercentage = 0, unavailablePercentage = 0, confidenceLabelBn = '', totalRecentReports = 0 }) => {
  const hasData = totalRecentReports > 0;

  return (
    <div className="w-full space-y-2 bg-stone-50 dark:bg-zinc-800/60 p-3.5 sm:p-4 rounded-2xl border border-stone-200/80 dark:border-zinc-700/80">
      {/* Numbers */}
      <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>আছে: {hasData ? `${toBn(availablePercentage)}%` : '০%'}</span>
        </div>
        <div className="text-[11px] sm:text-xs text-stone-500 dark:text-zinc-400 font-medium">
          {hasData ? `${toBn(totalRecentReports)}টি রিপোর্ট` : 'কোনো রিপোর্ট নেই'}
        </div>
        <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
          <span>নেই: {hasData ? `${toBn(unavailablePercentage)}%` : '০%'}</span>
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500"></span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="h-3 w-full bg-stone-200 dark:bg-zinc-700 rounded-full overflow-hidden flex p-0.5 shadow-inner">
        {hasData ? (
          <>
            <div
              style={{ width: `${availablePercentage}%` }}
              className="bg-emerald-500 h-full rounded-l-full transition-all duration-700"
            />
            <div
              style={{ width: `${unavailablePercentage}%` }}
              className="bg-rose-500 h-full rounded-r-full transition-all duration-700"
            />
          </>
        ) : (
          <div className="w-full bg-stone-300 dark:bg-zinc-600 h-full rounded-full" />
        )}
      </div>

      {/* Confidence Label */}
      {confidenceLabelBn && (
        <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-zinc-400 pt-0.5">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-stone-400 dark:text-zinc-500" />
            <span>নির্ভরযোগ্যতা: <strong className="text-stone-800 dark:text-zinc-200 font-medium">{confidenceLabelBn}</strong></span>
          </div>
          <span className="text-[10px] text-stone-400 dark:text-zinc-500">গত ৬০ মিনিট</span>
        </div>
      )}
    </div>
  );
};
