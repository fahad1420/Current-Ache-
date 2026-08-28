import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ChevronRight, Layers } from 'lucide-react';
import api from '../services/api';

export const LocationHierarchySelector = ({ onSelect, selectedLocation = null }) => {
  const [allLocations, setAllLocations] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState('');
  const [availableDistricts, setAvailableDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [availableUpazilas, setAvailableUpazilas] = useState([]);
  const [selectedUpazila, setSelectedUpazila] = useState('');
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await api.get('/locations');
        if (res.data?.success) {
          const data = res.data.data || [];
          setAllLocations(data);

          // Extract distinct divisions
          const divMap = new Map();
          data.forEach(loc => {
            if (loc.division && !divMap.has(loc.division)) {
              divMap.set(loc.division, { en: loc.division, bn: loc.divisionBn });
            }
          });
          setDivisions(Array.from(divMap.values()));
        }
      } catch (err) {
        console.error('Error fetching location hierarchy:', err);
      } finally {
        setLoading(false);
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
    <div className="bg-stone-50 dark:bg-[#111214] border border-stone-200/90 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-2 text-stone-900 dark:text-zinc-100 font-bold text-sm">
        <Layers className="w-4 h-4 text-emerald-600" />
        <span>ধাপে ধাপে এলাকা নির্বাচন করুন (বিভাগ &rarr; জেলা &rarr; উপজেলা/থানা)</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Division Dropdown */}
        <div>
          <label className="block text-xs font-semibold text-stone-600 dark:text-zinc-400 mb-1">১. বিভাগ নির্বাচন করুন</label>
          <select
            value={selectedDivision}
            onChange={(e) => handleDivisionChange(e.target.value)}
            disabled={loading}
            className="w-full py-2.5 px-3 bg-white dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 rounded-xl text-sm font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all disabled:opacity-50"
          >
            <option value="">-- বিভাগ নির্বাচন --</option>
            {divisions.map((div) => (
              <option key={div.en} value={div.en}>
                {div.bn} ({div.en})
              </option>
            ))}
          </select>
        </div>

        {/* District Dropdown */}
        <div>
          <label className="block text-xs font-semibold text-stone-600 dark:text-zinc-400 mb-1">২. জেলা নির্বাচন করুন</label>
          <select
            value={selectedDistrict}
            onChange={(e) => handleDistrictChange(e.target.value)}
            disabled={!selectedDivision || availableDistricts.length === 0}
            className="w-full py-2.5 px-3 bg-white dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 rounded-xl text-sm font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all disabled:opacity-50 disabled:bg-stone-100 dark:disabled:bg-zinc-900"
          >
            <option value="">-- জেলা নির্বাচন --</option>
            {availableDistricts.map((dist) => (
              <option key={dist.en} value={dist.en}>
                {dist.bn} ({dist.en})
              </option>
            ))}
          </select>
        </div>

        {/* Upazila/Thana Dropdown */}
        <div>
          <label className="block text-xs font-semibold text-stone-600 dark:text-zinc-400 mb-1">৩. উপজেলা/থানা নির্বাচন করুন</label>
          <select
            value={selectedUpazila}
            onChange={(e) => handleUpazilaChange(e.target.value)}
            disabled={!selectedDistrict || availableUpazilas.length === 0}
            className="w-full py-2.5 px-3 bg-white dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 rounded-xl text-sm font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all disabled:opacity-50 disabled:bg-stone-100 dark:disabled:bg-zinc-900"
          >
            <option value="">-- উপজেলা / থানা নির্বাচন --</option>
            {availableUpazilas.map((upz) => (
              <option key={upz._id} value={upz._id}>
                {upz.nameBn} ({upz.nameEn})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
