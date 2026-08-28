import React from 'react';
import { Zap, ZapOff, AlertCircle, HelpCircle } from 'lucide-react';

export const StatusBadge = ({ status, size = 'md', showIcon = true }) => {
  const configs = {
    available: {
      bg: 'bg-emerald-500 text-white shadow-emerald-500/25',
      lightBg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300',
      icon: Zap,
      labelBn: 'কারেন্ট আছে',
      labelEn: 'Available',
    },
    unavailable: {
      bg: 'bg-rose-600 text-white shadow-rose-600/25',
      lightBg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300',
      icon: ZapOff,
      labelBn: 'কারেন্ট নেই',
      labelEn: 'Unavailable',
    },
    mixed: {
      bg: 'bg-orange-500 text-white shadow-orange-500/25',
      lightBg: 'bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-300',
      icon: AlertCircle,
      labelBn: 'মিশ্র রিপোর্ট',
      labelEn: 'Mixed',
    },
    insufficient_data: {
      bg: 'bg-stone-500 dark:bg-zinc-700 text-white',
      lightBg: 'bg-stone-100 dark:bg-zinc-800 border-stone-200 dark:border-zinc-700 text-stone-700 dark:text-zinc-300',
      icon: HelpCircle,
      labelBn: 'পর্যাপ্ত তথ্য নেই',
      labelEn: 'No Recent Data',
    },
  };

  const config = configs[status] || configs.insufficient_data;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-[11px] px-2.5 py-0.5 gap-1 font-semibold',
    md: 'text-xs sm:text-sm px-3.5 py-1.5 gap-1.5 font-bold',
    lg: 'text-sm sm:text-base px-5 py-2.5 gap-2 font-extrabold shadow-md',
  };

  return (
    <div
      className={`inline-flex items-center rounded-full transition-transform ${config.bg} ${sizeClasses[size]}`}
    >
      {showIcon && <Icon className={size === 'lg' ? 'w-4 h-4 sm:w-5 sm:h-5 fill-current' : 'w-3.5 h-3.5'} />}
      <span>{config.labelBn}</span>
    </div>
  );
};
