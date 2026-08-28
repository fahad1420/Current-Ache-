import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, MapPin, ChevronRight, Layers, AlertCircle, RefreshCw } from 'lucide-react';
import { LocationHierarchySelector } from '../components/LocationHierarchySelector';
import { ListSkeleton } from '../components/SkeletonLoader';
import { toBn } from '../utils/banglaDigits';
import { useLanguage } from '../context/LanguageContext';
import defaultLocations from '../data/bangladeshLocations.json';
import api from '../services/api';

export const AreasExplorer = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialDivision = searchParams.get('division') || 'All';
  const { t, isBn } = useLanguage();

  const [locations, setLocations] = useState(defaultLocations);
  const [selectedDivision, setSelectedDivision] = useState(initialDivision);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [showHierarchy, setShowHierarchy] = useState(false);

  const divisions = [
    { nameBn: 'সকল বিভাগ', nameEn: 'All' },
    { nameBn: 'ঢাকা', nameEn: 'Dhaka' },
    { nameBn: 'চট্টগ্রাম', nameEn: 'Chattogram' },
    { nameBn: 'রাজশাহী', nameEn: 'Rajshahi' },
    { nameBn: 'খুলনা', nameEn: 'Khulna' },
    { nameBn: 'বরিশাল', nameEn: 'Barishal' },
    { nameBn: 'সিলেট', nameEn: 'Sylhet' },
    { nameBn: 'রংপুর', nameEn: 'Rangpur' },
    { nameBn: 'ময়মনসিংহ', nameEn: 'Mymensingh' },
  ];

  const fetchLiveLocations = async () => {
    setLoading(true);
    setApiError(false);
    try {
      let url = '/locations';
      if (selectedDivision !== 'All') {
        url += `?division=${encodeURIComponent(selectedDivision)}`;
      }
      const res = await api.get(url);
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setLocations(res.data.data);
      } else {
        // Fallback to static official dataset if DB has 0 seeded records
        if (selectedDivision === 'All') {
          setLocations(defaultLocations);
        } else {
          setLocations(defaultLocations.filter(l => l.division.toLowerCase() === selectedDivision.toLowerCase()));
        }
      }
    } catch (err) {
      console.warn('Live API unavailable, using verified administrative dataset:', err.message);
      // Fallback to verified local administrative dataset
      if (selectedDivision === 'All') {
        setLocations(defaultLocations);
      } else {
        setLocations(defaultLocations.filter(l => l.division.toLowerCase() === selectedDivision.toLowerCase()));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveLocations();
  }, [selectedDivision]);

  const handleDivisionChange = (divEn) => {
    setSelectedDivision(divEn);
    if (divEn === 'All') {
      searchParams.delete('division');
    } else {
      searchParams.set('division', divEn);
    }
    setSearchParams(searchParams);
  };

  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      // Division match
      if (selectedDivision !== 'All' && loc.division?.toLowerCase() !== selectedDivision.toLowerCase()) {
        return false;
      }
      // Query match
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        loc.nameBn?.toLowerCase().includes(q) ||
        loc.nameEn?.toLowerCase().includes(q) ||
        loc.districtBn?.toLowerCase().includes(q) ||
        loc.district?.toLowerCase().includes(q) ||
        loc.divisionBn?.toLowerCase().includes(q) ||
        loc.division?.toLowerCase().includes(q) ||
        (loc.upazila && loc.upazila.toLowerCase().includes(q)) ||
        (loc.upazilaBn && loc.upazilaBn.toLowerCase().includes(q))
      );
    });
  }, [locations, selectedDivision, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-zinc-100 tracking-tight">
            {t('areasPageTitle')}
          </h1>
          <p className="text-stone-500 dark:text-zinc-400 text-xs sm:text-sm mt-1 max-w-2xl">
            {t('areasPageSubtitle')}
          </p>
        </div>

        <button
          onClick={() => setShowHierarchy(!showHierarchy)}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-[#111214] text-stone-800 dark:text-zinc-200 border border-stone-200 dark:border-zinc-800 text-xs font-bold flex items-center gap-1.5 hover:bg-stone-200 dark:hover:bg-zinc-800 transition-colors shadow-xs"
        >
          <Layers className="w-4 h-4 text-orange-500" />
          <span>{showHierarchy ? (isBn ? 'ড্রপডাউন লুকান' : 'Hide Filter') : (isBn ? 'ধাপে ধাপে নির্বাচন' : 'Hierarchical Filter')}</span>
        </button>
      </div>

      {showHierarchy && (
        <div className="animate-in fade-in-50 duration-200">
          <LocationHierarchySelector />
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Division Pills (Horizontal Scrollable) */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
          {divisions.map((div) => {
            const isSelected = selectedDivision === div.nameEn;
            return (
              <button
                key={div.nameEn}
                type="button"
                onClick={() => handleDivisionChange(div.nameEn)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-white dark:bg-[#111214] border border-stone-200 dark:border-zinc-800 text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800'
                }`}
              >
                {isBn ? div.nameBn : div.nameEn}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchAreaInput')}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-white dark:bg-[#111214] border border-stone-200 dark:border-zinc-800 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none text-stone-900 dark:text-zinc-100 placeholder:text-stone-400 dark:placeholder:text-zinc-500 font-medium"
          />
        </div>
      </div>

      {/* Content Rendering: Loading vs Results vs Empty vs Error */}
      {loading ? (
        <div className="space-y-4">
          <div className="text-xs text-stone-500 dark:text-zinc-400 flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-500" />
            <span>{isBn ? 'তথ্য লোড হচ্ছে...' : 'Loading areas...'}</span>
          </div>
          <ListSkeleton count={9} />
        </div>
      ) : apiError ? (
        <div className="p-8 text-center bg-white dark:bg-[#111214] rounded-2xl border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto" />
          <p className="text-sm font-semibold">{isBn ? 'লাইভ তথ্য এখন পাওয়া যাচ্ছে না। আবার চেষ্টা করুন।' : 'Live information is currently unavailable. Please try again.'}</p>
          <button
            onClick={fetchLiveLocations}
            className="px-4 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-colors"
          >
            {isBn ? 'পুনরায় চেষ্টা করুন' : 'Retry'}
          </button>
        </div>
      ) : filteredLocations.length > 0 ? (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-stone-400 dark:text-zinc-500">
            {t('totalLocationsCount')} {isBn ? toBn(filteredLocations.length) : filteredLocations.length}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredLocations.map((loc) => (
              <Link
                key={loc._id || loc.slug}
                to={`/area/${loc.slug || loc._id}`}
                className="bg-white dark:bg-[#111214] p-4 rounded-xl border border-stone-200 dark:border-zinc-800 hover:border-orange-400 dark:hover:border-orange-500 hover:shadow-xs transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-zinc-800 group-hover:bg-orange-50 dark:group-hover:bg-orange-950/50 text-stone-600 dark:text-zinc-400 group-hover:text-orange-500 dark:group-hover:text-orange-400 flex items-center justify-center transition-colors">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900 dark:text-zinc-100 group-hover:text-orange-500 transition-colors text-sm leading-tight">
                      {isBn ? loc.nameBn : loc.nameEn}{' '}
                      <span className="text-xs font-normal text-stone-400 dark:text-zinc-500">
                        ({isBn ? loc.nameEn : loc.nameBn})
                      </span>
                    </h3>
                    <p className="text-[11px] text-stone-400 dark:text-zinc-500 mt-0.5">
                      {isBn ? `${loc.divisionBn} বিভাগ • ${loc.districtBn} জেলা` : `${loc.district} • ${loc.division}`}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white dark:bg-[#111214] rounded-2xl border border-stone-200 dark:border-zinc-800 text-stone-500 dark:text-zinc-400 text-sm">
          {selectedDivision !== 'All'
            ? (isBn ? 'এই বিভাগে কোনো এলাকা পাওয়া যায়নি।' : 'No locations found in this division.')
            : (isBn ? 'কোনো এলাকা খুঁজে পাওয়া যায়নি।' : 'No locations found matching your query.')}
        </div>
      )}
    </div>
  );
};
export default AreasExplorer;
