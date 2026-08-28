import React from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  Users,
  Cpu,
  Lock,
  ShieldCheck,
  ArrowUpRight,
  Compass,
  MapPin,
  Clock,
  Calendar,
  BarChart3,
  ShieldAlert,
  HelpCircle,
  ExternalLink,
  Code
} from 'lucide-react';
import { DisclaimerBox } from '../components/DisclaimerBox';
import { useLanguage } from '../context/LanguageContext';

export const About = () => {
  const { t, isBn } = useLanguage();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* 1. Header / Hero */}
      <div className="text-center space-y-2.5 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/60 text-xs font-bold shadow-xs">
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>{isBn ? 'কারেন্ট আছে? (CurrentAche BD)' : 'CurrentAche BD Tracker'}</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-stone-900 dark:text-zinc-100 tracking-tight leading-tight">
          {t('aboutPageTitle')}
        </h1>
        <p className="text-stone-600 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed">
          {t('aboutPageSubtitle')}
        </p>
      </div>

      {/* 2. Platform Core Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pillar 1: Community Driven */}
        <div className="bg-white dark:bg-[#111214] p-5 sm:p-6 rounded-2xl border border-stone-200 dark:border-zinc-800 shadow-xs space-y-2.5">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-500 dark:text-orange-400 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-stone-900 dark:text-zinc-100 text-sm sm:text-base">
            {isBn ? 'কমিউনিটি চালিত উদ্যোগ' : 'Community-Powered'}
          </h3>
          <p className="text-xs text-stone-600 dark:text-zinc-400 leading-relaxed">
            {isBn
              ? 'কোনো জটিল সাইনআপ বা ফর্ম পূরণ ছাড়াই দেশের যেকোনো নাগরিক ১-ট্যাপে নিজের এলাকার বিদ্যুৎ পরিস্থিতি সরাসরি ম্যাপে রিপোর্ট করতে পারেন।'
              : 'Citizens across Bangladesh can report their local power status in 1 tap without any login or registration barriers.'}
          </p>
        </div>

        {/* Pillar 2: Smart Consensus */}
        <div className="bg-white dark:bg-[#111214] p-5 sm:p-6 rounded-2xl border border-stone-200 dark:border-zinc-800 shadow-xs space-y-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-stone-900 dark:text-zinc-100 text-sm sm:text-base">
            {isBn ? 'স্মার্ট কনসেনসাস অ্যালগরিদম' : 'Smart Consensus Engine'}
          </h3>
          <p className="text-xs text-stone-600 dark:text-zinc-400 leading-relaxed">
            {isBn
              ? 'একটি একক ভুল রিপোর্টের ওপর নির্ভর না করে সাম্প্রতিক সময়ের (গত ৬০ মিনিট) একাধিক রিপোর্টের অনুপাত ও কনসেনসাসের ভিত্তিতে লাইভ স্ট্যাটাস নির্ধারিত হয়।'
              : 'Live status is calculated via weighted multi-report consensus over a dynamic 60-minute window, filtering out isolated false reports.'}
          </p>
        </div>

        {/* Pillar 3: Privacy by Design */}
        <div className="bg-white dark:bg-[#111214] p-5 sm:p-6 rounded-2xl border border-stone-200 dark:border-zinc-800 shadow-xs space-y-2.5">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-stone-900 dark:text-zinc-100 text-sm sm:text-base">
            {isBn ? 'গোপনীয়তা ও সুরক্ষা' : 'Privacy & Security'}
          </h3>
          <p className="text-xs text-stone-600 dark:text-zinc-400 leading-relaxed">
            {isBn
              ? 'ব্যবহারকারীর কোনো ব্যক্তিগত তথ্য বা র\' আইপি অ্যাড্রেস সংরক্ষণ করা হয় না। স্প্যাম রোধে ক্রিপ্টোগ্রাফিক সল্টেড হ্যাশিং প্রযুক্তি ব্যবহৃত হয়।'
              : 'No personally identifiable data or raw IP addresses are ever stored. Salted cryptographic hashing prevents spam anonymously.'}
          </p>
        </div>
      </div>

      {/* 3. Developer & Creator Card */}
      <div className="bg-white dark:bg-[#111214] rounded-2xl p-5 sm:p-6 border border-stone-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold text-xs">
              FH
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-zinc-500 block">
                {t('designedBy')}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-zinc-100">
                Fahad Hossain
              </h3>
            </div>
          </div>
          <p className="text-xs text-stone-500 dark:text-zinc-400 max-w-xl">
            {isBn
              ? 'বাংলাদেশি নাগরিকদের জন্য একটি দ্রুত, উন্মুক্ত ও নির্ভরযোগ্য নাগরিক প্ল্যাটফর্ম হিসেবে ডিজাইন ও ডেভেলপ করা হয়েছে।'
              : 'Designed & developed with modern open-source web technologies for transparent public utility monitoring in Bangladesh.'}
          </p>
        </div>

        <a
          href="https://x.com/f_a_h_a_d_04?s=21"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2.5 rounded-xl bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-xs flex items-center gap-1.5 hover:bg-orange-500 dark:hover:bg-orange-400 dark:hover:text-zinc-900 transition-colors shadow-xs shrink-0 self-stretch sm:self-auto justify-center"
        >
          <span>Connect on X / Twitter</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* 4. Quick Navigation Links Directory */}
      <div className="bg-white dark:bg-[#111214] rounded-2xl p-5 sm:p-6 border border-stone-200 dark:border-zinc-800 shadow-xs space-y-4">
        <h3 className="font-bold text-stone-900 dark:text-zinc-100 text-sm sm:text-base flex items-center gap-2">
          <Compass className="w-4 h-4 text-orange-500" />
          <span>{isBn ? 'ওয়েবসাইটের প্রধান বিভাগসমূহ' : 'Key Platform Sections'}</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          <Link
            to="/"
            className="p-3 rounded-xl bg-stone-50 dark:bg-zinc-800/60 hover:bg-orange-50 dark:hover:bg-zinc-800 border border-stone-200/80 dark:border-zinc-700/80 flex flex-col items-center text-center gap-1.5 transition-colors group"
          >
            <Compass className="w-4 h-4 text-stone-600 dark:text-zinc-400 group-hover:text-orange-500" />
            <span className="font-bold text-stone-800 dark:text-zinc-200 group-hover:text-orange-500">{t('navMap')}</span>
          </Link>

          <Link
            to="/areas"
            className="p-3 rounded-xl bg-stone-50 dark:bg-zinc-800/60 hover:bg-orange-50 dark:hover:bg-zinc-800 border border-stone-200/80 dark:border-zinc-700/80 flex flex-col items-center text-center gap-1.5 transition-colors group"
          >
            <MapPin className="w-4 h-4 text-stone-600 dark:text-zinc-400 group-hover:text-orange-500" />
            <span className="font-bold text-stone-800 dark:text-zinc-200 group-hover:text-orange-500">{t('navAreas')}</span>
          </Link>

          <Link
            to="/history"
            className="p-3 rounded-xl bg-stone-50 dark:bg-zinc-800/60 hover:bg-orange-50 dark:hover:bg-zinc-800 border border-stone-200/80 dark:border-zinc-700/80 flex flex-col items-center text-center gap-1.5 transition-colors group"
          >
            <Clock className="w-4 h-4 text-stone-600 dark:text-zinc-400 group-hover:text-orange-500" />
            <span className="font-bold text-stone-800 dark:text-zinc-200 group-hover:text-orange-500">{t('navHistory')}</span>
          </Link>

          <Link
            to="/schedules"
            className="p-3 rounded-xl bg-stone-50 dark:bg-zinc-800/60 hover:bg-orange-50 dark:hover:bg-zinc-800 border border-stone-200/80 dark:border-zinc-700/80 flex flex-col items-center text-center gap-1.5 transition-colors group"
          >
            <Calendar className="w-4 h-4 text-stone-600 dark:text-zinc-400 group-hover:text-orange-500" />
            <span className="font-bold text-stone-800 dark:text-zinc-200 group-hover:text-orange-500">{t('navSchedules')}</span>
          </Link>

          <Link
            to="/stats"
            className="p-3 rounded-xl bg-stone-50 dark:bg-zinc-800/60 hover:bg-orange-50 dark:hover:bg-zinc-800 border border-stone-200/80 dark:border-zinc-700/80 flex flex-col items-center text-center gap-1.5 transition-colors group"
          >
            <BarChart3 className="w-4 h-4 text-stone-600 dark:text-zinc-400 group-hover:text-orange-500" />
            <span className="font-bold text-stone-800 dark:text-zinc-200 group-hover:text-orange-500">{t('navStats')}</span>
          </Link>

          <Link
            to="/admin"
            className="p-3 rounded-xl bg-stone-50 dark:bg-zinc-800/60 hover:bg-purple-50 dark:hover:bg-zinc-800 border border-stone-200/80 dark:border-zinc-700/80 flex flex-col items-center text-center gap-1.5 transition-colors group"
          >
            <ShieldAlert className="w-4 h-4 text-stone-600 dark:text-zinc-400 group-hover:text-purple-600" />
            <span className="font-bold text-stone-800 dark:text-zinc-200 group-hover:text-purple-600">{t('navAdmin')}</span>
          </Link>
        </div>
      </div>

      {/* 5. Transparency & Official Disclaimer */}
      <DisclaimerBox />

      {/* 6. Legal & Copyright Notice */}
      <div className="text-center text-[11px] text-stone-400 dark:text-zinc-500 pt-2 border-t border-stone-200 dark:border-zinc-800/80">
        <p>&copy; {new Date().getFullYear()} {t('brandName')} (CurrentAche BD). {t('allRightsReserved')}</p>
        <p className="mt-0.5">{t('madeWithCare')} &bull; Fahad Hossain</p>
      </div>
    </div>
  );
};
export default About;
