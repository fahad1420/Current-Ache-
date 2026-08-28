import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const Footer = () => {
  const { t, isBn } = useLanguage();

  return (
    <footer className="bg-stone-50 dark:bg-[#0a0a0b] text-stone-600 dark:text-zinc-400 mt-8 border-t border-stone-200 dark:border-zinc-800 transition-colors pb-16 lg:pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {/* 1. Brand & Mission */}
          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-orange-500 flex items-center justify-center text-white shadow-xs">
                <Zap className="w-3.5 h-3.5 fill-current" />
              </div>
              <span className="text-base font-bold text-stone-900 dark:text-zinc-100 tracking-tight">
                {t('brandName')} <span className="text-xs font-normal text-stone-400 dark:text-zinc-500">({t('brandEnglishContext')})</span>
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-zinc-400 leading-relaxed max-w-md">
              {t('footerDesc')}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-zinc-400 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{t('privacyNote')}</span>
            </div>
          </div>

          {/* 2. Quick Directory Links */}
          <div>
            <h4 className="text-stone-900 dark:text-zinc-100 font-bold text-xs uppercase tracking-wider mb-2.5">{t('quickLinksTitle')}</h4>
            <ul className="space-y-1 text-xs">
              <li>
                <Link to="/" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">{t('navMap')}</Link>
              </li>
              <li>
                <Link to="/areas" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">{t('navAreas')}</Link>
              </li>
              <li>
                <Link to="/history" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">{t('navHistory')}</Link>
              </li>
              <li>
                <Link to="/schedules" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">{t('navSchedules')}</Link>
              </li>
              <li>
                <Link to="/stats" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">{t('navStats')}</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">{t('navAbout')}</Link>
              </li>
            </ul>
          </div>

          {/* 3. Developer Credit & Management */}
          <div>
            <h4 className="text-stone-900 dark:text-zinc-100 font-bold text-xs uppercase tracking-wider mb-2.5">{t('developerTitle')}</h4>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#111214]/90 border border-stone-200 dark:border-zinc-800 space-y-0.5 shadow-xs">
                <span className="text-[10px] text-stone-400 dark:text-zinc-500 block font-medium">{t('designedBy')}</span>
                <a
                  href="https://x.com/f_a_h_a_d_04?s=21"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-stone-900 dark:text-zinc-100 hover:text-orange-600 dark:hover:text-orange-400 transition-colors flex items-center justify-between group text-xs"
                >
                  <span>Fahad Hossain</span>
                  <span className="text-[11px] text-stone-400 dark:text-zinc-400 group-hover:text-orange-500 flex items-center gap-0.5 font-normal">
                    @f_a_h_a_d_04 <ArrowUpRight className="w-3 h-3" />
                  </span>
                </a>
              </div>

              <div>
                <Link to="/admin" className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-zinc-200 transition-colors">
                  {t('navAdmin')}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer Notice */}
        <div className="border-t border-stone-200 dark:border-zinc-800/80 pt-3 pb-2">
          <div className="bg-white/80 dark:bg-[#111214]/60 rounded-xl p-2.5 border border-stone-200 dark:border-zinc-800 text-[11px] text-stone-500 dark:text-zinc-400 leading-relaxed">
            <span className="font-bold text-orange-600 dark:text-orange-400 block mb-0.5">
              {isBn ? 'স্বচ্ছতা ও কমিউনিটি বিজ্ঞপ্তি:' : 'Transparency & Community Disclaimer:'}
            </span>
            {t('disclaimerText')}
          </div>
        </div>

        {/* Copyright & Credit */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-stone-400 dark:text-zinc-500 pt-2 gap-1">
          <span>&copy; {new Date().getFullYear()} {t('brandName')}. {t('allRightsReserved')}</span>
          <span className="flex items-center gap-1">
            {t('madeWithCare')} &bull; <a href="https://x.com/f_a_h_a_d_04?s=21" target="_blank" rel="noopener noreferrer" className="text-stone-700 dark:text-zinc-300 hover:text-orange-500 font-semibold underline">Fahad Hossain</a>
          </span>
        </div>
      </div>
    </footer>
  );
};
