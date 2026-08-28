import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Compass, MapPin, Clock, Calendar, BarChart3, Info } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const MobileBottomNav = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const pathname = location.pathname;

  // Don't show bottom nav on admin routes
  if (pathname.startsWith('/admin')) {
    return null;
  }

  const navItems = [
    { to: '/', labelKey: 'mobNavMap', defaultLabel: 'ম্যাপ', icon: Compass, exact: true },
    { to: '/areas', labelKey: 'mobNavAreas', defaultLabel: 'এলাকা', icon: MapPin },
    { to: '/history', labelKey: 'mobNavHistory', defaultLabel: 'ইতিহাস', icon: Clock },
    { to: '/schedules', labelKey: 'mobNavSchedules', defaultLabel: 'সময়সূচি', icon: Calendar },
    { to: '/stats', labelKey: 'mobNavStats', defaultLabel: 'পরিসংখ্যান', icon: BarChart3 },
    { to: '/about', labelKey: 'mobNavAbout', defaultLabel: 'সম্পর্কে', icon: Info },
  ];

  const isActive = (item) => {
    if (item.exact) {
      return pathname === item.to;
    }
    return pathname.startsWith(item.to);
  };

  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0a0a0b]/95 backdrop-blur-md border-t border-stone-200/90 dark:border-zinc-800 py-1.5 px-2 flex items-center justify-around text-[10px] font-bold text-stone-600 dark:text-zinc-400 shadow-lg transition-colors pb-[calc(0.375rem+env(safe-area-inset-bottom))]"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-colors ${
              active
                ? 'text-orange-500 dark:text-orange-400 font-extrabold'
                : 'text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100'
            }`}
          >
            <Icon className={`w-4 h-4 ${active ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span className="leading-none text-[10px]">{t(item.labelKey) || item.defaultLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
};
export default MobileBottomNav;
