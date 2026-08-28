import React from 'react';
import { Info } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const DisclaimerBox = () => {
  const { t } = useLanguage();

  return (
    <div className="bg-stone-50 dark:bg-[#111214] border border-stone-200 dark:border-zinc-800 text-stone-600 dark:text-zinc-300 border border-stone-200/80 dark:border-zinc-800 rounded-xl p-3 flex items-start gap-2.5 transition-colors">
      <Info className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
      <p className="text-[11px] sm:text-xs text-stone-500 dark:text-zinc-400 leading-relaxed font-normal">
        {t('disclaimerText')}
      </p>
    </div>
  );
};
