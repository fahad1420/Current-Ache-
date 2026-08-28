import React, { useState, useEffect } from 'react';
import { X, Zap, PlugZap, Loader2, MapPin, Search } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { toBn } from '../utils/banglaDigits';
import api from '../services/api';

export const ReportModal = ({
  isOpen,
  onClose,
  preselectedLocation = null,
  onReportSuccess,
}) => {
  const [selectedLocation, setSelectedLocation] = useState(preselectedLocation);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [locality, setLocality] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(null);
  const { addToast } = useToast();
  const { t, isBn } = useLanguage();

  useEffect(() => {
    if (preselectedLocation) {
      setSelectedLocation(preselectedLocation);
    }
  }, [preselectedLocation]);

  // Debounced search when user types inside modal
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 1) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await api.get(`/locations/search?q=${encodeURIComponent(q)}`);
        if (res.data?.success) {
          setSearchResults(res.data.data || []);
        }
      } catch (err) {
        console.error('Search error in modal:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  if (!isOpen) return null;

  const handleSubmitReport = async (status) => {
    if (!selectedLocation?._id) {
      addToast(t('selectAreaFirstError'), 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/reports', {
        locationId: selectedLocation._id,
        status,
        locality: locality.trim(),
        source: window.innerWidth < 768 ? 'mobile_web' : 'web',
      });

      if (res.data?.success) {
        addToast(
          isBn
            ? `✓ রিপোর্ট গ্রহণ করা হয়েছে: ${selectedLocation.nameBn}`
            : `✓ Report recorded for ${selectedLocation.nameEn}`,
          'success'
        );
        setLocality('');
        onClose();
        if (onReportSuccess) {
          onReportSuccess(res.data.data);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || t('reportFailedToast');
      addToast(msg, 'error');
      if (err.response?.data?.cooldownRemainingMinutes) {
        setCooldownRemaining(err.response.data.cooldownRemainingMinutes);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111214] rounded-3xl w-full max-w-lg shadow-2xl border border-stone-200 dark:border-zinc-800 text-stone-900 dark:text-zinc-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-stone-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold leading-tight">{t('reportPanelTitle')}</h2>
              <span className="text-xs text-stone-400 dark:text-zinc-500 font-normal">{t('reportPanelSubtitle')}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 dark:text-zinc-500 hover:text-stone-600 dark:hover:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Location Selection Box */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-stone-400 dark:text-zinc-500 mb-1.5">
              ১. {t('stepAreaLabel')}
            </label>

            {selectedLocation ? (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <strong className="text-sm text-stone-900 dark:text-zinc-100 block">
                      {isBn ? selectedLocation.nameBn : selectedLocation.nameEn}{' '}
                      <span className="font-normal text-xs text-stone-500">({isBn ? selectedLocation.nameEn : selectedLocation.nameBn})</span>
                    </strong>
                    <span className="text-xs text-stone-500 dark:text-stone-400 dark:text-zinc-500">
                      {isBn ? `${selectedLocation.divisionBn} বিভাগ • ${selectedLocation.districtBn} জেলা` : `${selectedLocation.district} • ${selectedLocation.division}`}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLocation(null)}
                  className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline px-2 py-1"
                >
                  {t('changeAreaBtn')}
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-stone-400 dark:text-zinc-500 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('searchPlaceholder')}
                    className="w-full pl-10 pr-4 py-3 text-sm bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 rounded-xl focus:bg-white dark:focus:bg-[#111214] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  />
                  {isSearching && <Loader2 className="w-4 h-4 text-emerald-500 animate-spin absolute right-3" />}
                </div>

                {searchResults.length > 0 && (
                  <div className="mt-1.5 max-h-44 overflow-y-auto rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-slate-800 shadow-lg divide-y divide-stone-100 dark:divide-zinc-700">
                    {searchResults.map((loc) => (
                      <button
                        key={loc._id}
                        type="button"
                        onClick={() => {
                          setSelectedLocation(loc);
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                        className="w-full text-left p-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-xs flex items-center justify-between"
                      >
                        <div>
                          <strong className="text-stone-800 dark:text-zinc-200">{isBn ? loc.nameBn : loc.nameEn}</strong> ({isBn ? loc.nameEn : loc.nameBn})
                          <div className="text-[11px] text-stone-400 dark:text-zinc-500">{isBn ? `${loc.divisionBn} • ${loc.districtBn}` : `${loc.district} • ${loc.division}`}</div>
                        </div>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">{isBn ? 'বাছাই করুন' : 'Select'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Optional Locality */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-stone-400 dark:text-zinc-500 mb-1.5">
              ২. {isBn ? 'নির্দিষ্ট মহল্লা / সেক্টর / পাড়া (ঐচ্ছিক):' : 'Specific locality / sector (optional):'}
            </label>
            <input
              type="text"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              placeholder={isBn ? "যেমন: সেক্টর ৭, হাউজিং এস্টেট, ব্লক-ডি..." : "e.g. Sector 7, Block D..."}
              maxLength={80}
              className="w-full px-3.5 py-2.5 text-sm bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 rounded-xl focus:bg-white dark:focus:bg-[#111214] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
            />
          </div>

          {/* Big Reporting Buttons */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-600 dark:text-stone-400 dark:text-zinc-500 mb-2">
              ৩. {t('stepStatusLabel')}
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                disabled={submitting || !selectedLocation}
                onClick={() => handleSubmitReport('available')}
                className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 active:scale-[0.98] text-white shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 font-bold disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />}
                <div className="text-left">
                  <div className="text-base font-black leading-tight">{t('statusAvailableBtn')}</div>
                  <div className="text-[11px] text-emerald-100 font-normal">{isBn ? 'বিদ্যুৎ সরবরাহ সচল' : 'Grid power online'}</div>
                </div>
              </button>

              <button
                type="button"
                disabled={submitting || !selectedLocation}
                onClick={() => handleSubmitReport('unavailable')}
                className="p-4 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 active:scale-[0.98] text-white shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-3 font-bold disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlugZap className="w-5 h-5" />}
                <div className="text-left">
                  <div className="text-base font-black leading-tight">{t('statusUnavailableBtn')}</div>
                  <div className="text-[11px] text-rose-100 font-normal">{isBn ? 'লোডশেডিং / বিভ্রাট' : 'Outage / Load shedding'}</div>
                </div>
              </button>
            </div>
          </div>

          {cooldownRemaining && (
            <div className="p-3 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-xl text-xs text-orange-800 dark:text-orange-300 text-center">
              ⏳ {isBn ? `স্প্যাম রোধে প্রতি ১০ মিনিটে ১ বার রিপোর্ট গ্রহণ করা হয়। আরও ${toBn(cooldownRemaining)} মিনিট অপেক্ষা করুন।` : `To prevent spam, 1 report allowed per 10 mins. Please wait ${cooldownRemaining} more minutes.`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
