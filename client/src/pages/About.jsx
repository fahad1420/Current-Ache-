import React from 'react';
import { Zap, Users, Cpu, Lock, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { DisclaimerBox } from '../components/DisclaimerBox';
import { useLanguage } from '../context/LanguageContext';

export const About = () => {
  const { t, isBn } = useLanguage();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/60 text-xs font-bold">
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>{isBn ? 'আমাদের লক্ষ্য ও কর্মপদ্ধতি' : 'Our Mission & Approach'}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 dark:text-zinc-100 tracking-tight">
          {t('aboutPageTitle')}
        </h1>
        <p className="text-stone-600 dark:text-zinc-400 text-xs sm:text-sm max-w-xl mx-auto">
          {t('aboutPageSubtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#111214] p-5 rounded-2xl border border-stone-200 dark:border-zinc-800 shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-500 dark:text-orange-400 flex items-center justify-center font-bold">
            <Users className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-stone-900 dark:text-zinc-100 text-sm">
            {isBn ? 'কমিউনিটি চালিত' : 'Community Driven'}
          </h3>
          <p className="text-xs text-stone-500 dark:text-zinc-400 leading-relaxed">
            {isBn
              ? 'কোনো জটিল সাইনআপ ছাড়াই দেশের যেকোনো নাগরিক ১-ট্যাপে নিজের এলাকার বিদ্যুতের খবর শেয়ার করতে পারেন।'
              : 'Citizens can report their local power status in 1 tap without any tedious registration requirements.'}
          </p>
        </div>

        <div className="bg-white dark:bg-[#111214] p-5 rounded-2xl border border-stone-200 dark:border-zinc-800 shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-500 dark:text-orange-400 flex items-center justify-center font-bold">
            <Cpu className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-stone-900 dark:text-zinc-100 text-sm">
            {isBn ? 'স্মার্ট কনসেনসাস অ্যালগরিদম' : 'Smart Consensus'}
          </h3>
          <p className="text-xs text-stone-500 dark:text-zinc-400 leading-relaxed">
            {isBn
              ? 'একটি একক রিপোর্টের ওপর নির্ভর না করে সাম্প্রতিক সময়ের (গত ৬০ মিনিট) সকল রিপোর্টের অনুপাত ও কনসেনসাসের ভিত্তিতে স্ট্যাটাস গণনা করা হয়।'
              : 'Status calculations are based on multi-report ratios over a 60-minute decay window rather than single isolated submissions.'}
          </p>
        </div>

        <div className="bg-white dark:bg-[#111214] p-5 rounded-2xl border border-stone-200 dark:border-zinc-800 shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-500 dark:text-orange-400 flex items-center justify-center font-bold">
            <Lock className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-stone-900 dark:text-zinc-100 text-sm">
            {isBn ? 'গোপনীয়তা ও সুরক্ষা' : 'Privacy by Design'}
          </h3>
          <p className="text-xs text-stone-500 dark:text-zinc-400 leading-relaxed">
            {isBn
              ? 'ব্যবহারকারীর কোনো ব্যক্তিগত নাম বা র\' আইপি অ্যাড্রেস সংরক্ষণ করা হয় না। স্প্যাম রোধে ক্রিপ্টোগ্রাফিক সল্টেড হ্যাশিং ব্যবহৃত হয়।'
              : 'We do not collect or store raw IP addresses or personally identifiable information. Salted hashing protects privacy.'}
          </p>
        </div>
      </div>

      {/* Developer Card */}
      <div className="bg-white dark:bg-[#111214] rounded-2xl p-5 sm:p-6 border border-stone-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-zinc-500">Developer</span>
          <h3 className="text-lg font-bold text-stone-900 dark:text-zinc-100">Fahad Hossain</h3>
          <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">
            Designed & Developed with modern full-stack open-source standards.
          </p>
        </div>
        <a
          href="https://x.com/f_a_h_a_d_04?s=21"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3.5 py-2 rounded-xl bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-xs flex items-center gap-1.5 hover:bg-orange-500 dark:hover:bg-orange-400 dark:hover:text-zinc-900 transition-colors shadow-xs"
        >
          <span>Connect on X / Twitter</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      </div>

      <DisclaimerBox />
    </div>
  );
};
