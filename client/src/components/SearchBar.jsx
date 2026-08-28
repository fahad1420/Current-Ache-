import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, X, Loader2, ChevronRight, Crosshair, Command } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import defaultLocations from '../data/bangladeshLocations.json';
import api from '../services/api';

export const SearchBar = ({
  onSelect,
  onNearMe,
  isLocating = false,
  autoFocus = false,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { t, isBn } = useLanguage();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global Command / Ctrl + K shortcut
  useEffect(() => {
    const handleKeyDownGlobal = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        if (results.length > 0) setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDownGlobal);
    return () => window.removeEventListener('keydown', handleKeyDownGlobal);
  }, [results]);

  // Debounced search with local fallback
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setResults([]);
      setIsLoading(false);
      setSelectedIndex(-1);
      return;
    }

    setIsLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const res = await api.get(`/locations/search?q=${encodeURIComponent(trimmed)}`);
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setResults(res.data.data);
          setIsOpen(true);
          setSelectedIndex(-1);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        // Fallback to local verified search
      }

      // Local fallback search across all 593 official locations
      const q = trimmed.toLowerCase();
      const localMatches = defaultLocations.filter((l) =>
        l.nameBn?.toLowerCase().includes(q) ||
        l.nameEn?.toLowerCase().includes(q) ||
        l.district?.toLowerCase().includes(q) ||
        l.districtBn?.includes(q) ||
        l.division?.toLowerCase().includes(q) ||
        l.divisionBn?.includes(q) ||
        (l.upazila && l.upazila.toLowerCase().includes(q)) ||
        (l.upazilaBn && l.upazilaBn.includes(q))
      ).slice(0, 10);

      setResults(localMatches);
      setIsOpen(true);
      setSelectedIndex(-1);
      setIsLoading(false);
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Keyboard navigation support
  const handleKeyDown = (e) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handleSelectLocation(results[selectedIndex]);
      } else if (results.length > 0) {
        handleSelectLocation(results[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelectLocation = (loc) => {
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(-1);
    if (onSelect) {
      onSelect(loc);
    } else {
      navigate(`/area/${loc.slug || loc._id}`);
    }
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-xl mx-auto">
      <div className="flex items-center gap-1.5 bg-white/95 dark:bg-[#111214]/95 border border-stone-200/90 dark:border-zinc-800 p-1.5 rounded-2xl border shadow-md">
        {/* Search Input Box */}
        <div className="relative flex-1 flex items-center">
          <div className="absolute left-3 pointer-events-none text-stone-400">
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
            ) : (
              <Search className="w-4 h-4 text-stone-400" />
            )}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (results.length > 0) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            autoFocus={autoFocus}
            placeholder={t('searchPlaceholder')}
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-transparent text-stone-900 dark:text-zinc-100 outline-none placeholder:text-stone-400 dark:placeholder:text-zinc-500 font-medium"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                inputRef.current?.focus();
              }}
              className="absolute right-2 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-zinc-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="absolute right-2 hidden sm:flex items-center gap-0.5 text-[9px] font-semibold text-stone-400 bg-stone-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded pointer-events-none">
              <Command className="w-2.5 h-2.5" /> K
            </div>
          )}
        </div>

        {/* Near Me Quick Button */}
        {onNearMe && (
          <button
            type="button"
            onClick={onNearMe}
            disabled={isLocating}
            className="px-3 py-2 rounded-xl bg-stone-50 dark:bg-zinc-800/80 hover:bg-orange-50 dark:hover:bg-orange-950/40 border border-stone-200/80 dark:border-zinc-700 text-stone-700 dark:text-zinc-300 hover:text-orange-600 dark:hover:text-orange-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shrink-0 active:scale-95 disabled:opacity-60"
            title={t('nearMeBtn')}
          >
            <Crosshair className={`w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 ${isLocating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isLocating ? t('locatingBtn') : t('nearMeBtn')}</span>
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-[#111214] border border-stone-200 dark:border-zinc-800 rounded-xl shadow-xl border overflow-hidden z-50 max-h-72 overflow-y-auto">
          {results.length > 0 ? (
            <div className="p-1 space-y-0.5">
              <div className="px-2.5 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center justify-between">
                <span>{isBn ? `খুঁজে পাওয়া গেছে (${results.length})` : `Found (${results.length})`}</span>
                <span className="text-[9px] text-stone-400 font-normal">{isBn ? 'Enter চাপুন' : 'Press Enter'}</span>
              </div>
              {results.map((loc, idx) => (
                <button
                  key={loc._id || loc.slug}
                  onClick={() => handleSelectLocation(loc)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between group ${
                    selectedIndex === idx
                      ? 'bg-orange-50 dark:bg-zinc-800 text-stone-900 dark:text-zinc-100'
                      : 'hover:bg-stone-50 dark:hover:bg-zinc-800/60 text-stone-800 dark:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin className={`w-3.5 h-3.5 shrink-0 ${
                      selectedIndex === idx ? 'text-orange-500' : 'text-stone-400 group-hover:text-orange-500'
                    }`} />
                    <div>
                      <div className="font-bold text-xs leading-tight">
                        {isBn ? `${loc.nameBn} (${loc.nameEn})` : `${loc.nameEn} (${loc.nameBn})`}
                      </div>
                      <div className="text-[10px] text-stone-500 dark:text-zinc-400 mt-0.5">
                        {isBn
                          ? `${loc.divisionBn} বিভাগ • ${loc.districtBn} জেলা`
                          : `${loc.district} • ${loc.division}`}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          ) : !isLoading ? (
            <div className="p-4 text-center text-stone-500 dark:text-zinc-400 text-xs">
              {isBn
                ? 'কোনো এলাকা পাওয়া যায়নি। জেলা বা উপজেলার নাম সঠিক বানানে লিখুন।'
                : 'No locations found. Try searching by district or upazila name.'}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
export default SearchBar;
