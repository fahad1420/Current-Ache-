import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ChevronRight, Layers } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import defaultLocations from '../data/bangladeshLocations.json';
import api from '../services/api';

export const LocationHierarchySelector = ({ onSelect, selectedLocation = null }) => {
  const [allLocations, setAllLocations] = useState(defaultLocations);
  const [divisions, setDivisions] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState('');
  const [availableDistricts, setAvailableDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [availableUpazilas, setAvailableUpazilas] = useState([]);
  const [selectedUpazila, setSelectedUpazila] = useState('');
  const [loading, setLoading] = useState(false);
  const { t, isBn } = useLanguage();

  const navigate = useNavigate();

  const parseDivisions = (data) => {
    const divMap = new Map();
    data.forEach(loc => {
      if (loc.division && !divMap.has(loc.division)) {
        divMap.set(loc.division, { en: loc.division, bn: loc.divisionBn });
      }
    });
    return Array.from(divMap.values());
  };

  useEffect(() => {
    setDivisions(parseDivisions(defaultLocations));

    const fetchLocations = async () => {
      try {
        const res = await api.get('/locations');
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setAllLocations(res.data.data);
          setDivisions(parseDivisions(res.data.data));
        }
      } catch (err) {
        // Fallback already populated with verified official dataset
      }
    };

    fetchLocations();
  }, []);

  // When division changes, update district list
  const handleDivisionChange = (divEn) => {
    setSelectedDivision(divEn);
    setSelectedDistrict('');
    setSelectedUpazila('');
    setAvailableUpazilas([]);

    if (!divEn) {
      setAvailableDistricts([]);
      return;
    }

    const distMap = new Map();
    allLocations
      .filter(loc => loc.division === divEn)
      .forEach(loc => {
        if (loc.district && !distMap.has(loc.district)) {
          distMap.set(loc.district, { en: loc.district, bn: loc.districtBn });
        }
      });
    setAvailableDistricts(Array.from(distMap.values()));
  };

  // When district changes, update upazila list
  const handleDistrictChange = (distEn) => {
    setSelectedDistrict(distEn);
    setSelectedUpazila('');

    if (!distEn) {
      setAvailableUpazilas([]);
      return;
    }

    const upzList = allLocations.filter(
      loc => loc.division === selectedDivision && loc.district === distEn
    );
    setAvailableUpazilas(upzList);
  };

  // When upazila changes, trigger selection
  const handleUpazilaChange = (locId) => {
    setSelectedUpazila(locId);
    const chosenLoc = allLocations.find(l => l._id === locId || l.slug === locId);
    if (chosenLoc) {
      if (onSelect) {
        onSelect(chosenLoc);
      } else {
        navigate(`/area/${chosenLoc.slug || chosenLoc._id}`);
      }
    }
  };

  return (
    <div className="bg-stone-50 dark:bg-[#111214] border border-stone-200/90 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
      <div className="flex items-center gap-2 text-stone-900 dark:text-zinc-100 font-bold text-xs sm:text-sm">
        <Layers className="w-4 h-4 text-orange-500" />
        <span>{isBn ? 'ধাপে ধাপে এলাকা নির্বাচন করুন (বিভাগ → জেলা → উপজেলা/থানা)' : 'Hierarchical Area Selector (Division → District → Upazila/Thana)'}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Division Dropdown */}
        <div>
          <label className="block text-xs font-bold text-stone-700 dark:text-zinc-300 mb-1">
            ১. {isBn ? 'বিভাগ নির্বাচন করুন' : '1. Select Division'}
          </label>
          <select
            value={selectedDivision}
            onChange={(e) => handleDivisionChange(e.target.value)}
            disabled={loading}
            className="w-full py-2.5 px-3 bg-white dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 rounded-xl text-xs sm:text-sm font-medium focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all disabled:opacity-50"
          >
            <option value="">-- {isBn ? 'বিভাগ নির্বাচন' : 'Select Division'} --</option>
            {divisions.map((div) => (
              <option key={div.en} value={div.en}>
                {isBn ? div.bn : div.en} ({isBn ? div.en : div.bn})
              </option>
            ))}
          </select>
        </div>

        {/* District Dropdown */}
        <div>
          <label className="block text-xs font-bold text-stone-700 dark:text-zinc-300 mb-1">
            ২. {isBn ? 'জেলা নির্বাচন করুন' : '2. Select District'}
          </label>
          <select
            value={selectedDistrict}
            onChange={(e) => handleDistrictChange(e.target.value)}
            disabled={!selectedDivision || availableDistricts.length === 0}
            className="w-full py-2.5 px-3 bg-white dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 rounded-xl text-xs sm:text-sm font-medium focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all disabled:opacity-50 disabled:bg-stone-100 dark:disabled:bg-zinc-900"
          >
            <option value="">-- {isBn ? 'জেলা নির্বাচন' : 'Select District'} --</option>
            {availableDistricts.map((dist) => (
              <option key={dist.en} value={dist.en}>
                {isBn ? dist.bn : dist.en} ({isBn ? dist.en : dist.bn})
              </option>
            ))}
          </select>
        </div>

        {/* Upazila/Thana Dropdown */}
        <div>
          <label className="block text-xs font-bold text-stone-700 dark:text-zinc-300 mb-1">
            ৩. {isBn ? 'উপজেলা/থানা নির্বাচন করুন' : '3. Select Upazila/Thana'}
          </label>
          <select
            value={selectedUpazila}
            onChange={(e) => handleUpazilaChange(e.target.value)}
            disabled={!selectedDistrict || availableUpazilas.length === 0}
            className="w-full py-2.5 px-3 bg-white dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 rounded-xl text-xs sm:text-sm font-medium focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all disabled:opacity-50 disabled:bg-stone-100 dark:disabled:bg-zinc-900"
          >
            <option value="">-- {isBn ? 'উপজেলা / থানা নির্বাচন' : 'Select Upazila/Thana'} --</option>
            {availableUpazilas.map((upz) => (
              <option key={upz._id || upz.slug} value={upz._id || upz.slug}>
                {isBn ? upz.nameBn : upz.nameEn} ({isBn ? upz.nameEn : upz.nameBn})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
export default LocationHierarchySelector;
