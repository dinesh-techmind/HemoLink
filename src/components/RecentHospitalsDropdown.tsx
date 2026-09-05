import React, { useState, useEffect } from "react";
import {
  Building2,
  MapPin,
  Check,
  RotateCcw,
  Sparkles,
  Navigation,
  PlusCircle,
  Clock
} from "lucide-react";
import {
  StoredHospital,
  getStoredHospitalsForCity,
  saveRecentHospital,
  clearRecentHospitalsForCity
} from "../lib/hospitals";

interface RecentHospitalsDropdownProps {
  city: string;
  selectedHospitalName: string;
  currentAddress: string;
  currentLat: number;
  currentLng: number;
  currentState: string;
  onSelectHospital: (hospital: {
    name: string;
    address: string;
    city: string;
    state: string;
    lat: number;
    lng: number;
  }) => void;
}

export default function RecentHospitalsDropdown({
  city,
  selectedHospitalName,
  currentAddress,
  currentLat,
  currentLng,
  currentState,
  onSelectHospital
}: RecentHospitalsDropdownProps) {
  const [storedHospitals, setStoredHospitals] = useState<StoredHospital[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [lastAutoFilledName, setLastAutoFilledName] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Reload stored list whenever the city changes
  useEffect(() => {
    const list = getStoredHospitalsForCity(city);
    setStoredHospitals(list);
    setSelectedId("");
    setLastAutoFilledName(null);
  }, [city]);

  // Keep dropdown selection in sync if hospital matches
  useEffect(() => {
    if (!selectedHospitalName) {
      setSelectedId("");
      return;
    }
    const match = storedHospitals.find(
      (h) =>
        h.name.toLowerCase().trim() === selectedHospitalName.toLowerCase().trim() ||
        (Math.abs(h.lat - currentLat) < 0.001 && Math.abs(h.lng - currentLng) < 0.001)
    );
    if (match) {
      setSelectedId(match.id);
    } else {
      setSelectedId("");
    }
  }, [selectedHospitalName, currentLat, currentLng, storedHospitals]);

  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const hospId = e.target.value;
    setSelectedId(hospId);

    if (!hospId) return;

    const hospital = storedHospitals.find((h) => h.id === hospId);
    if (hospital) {
      onSelectHospital({
        name: hospital.name,
        address: hospital.address,
        city: hospital.city,
        state: hospital.state,
        lat: hospital.lat,
        lng: hospital.lng
      });
      setLastAutoFilledName(hospital.name);
      setSaveSuccessMsg(null);
    }
  };

  const handleQuickSelect = (hospital: StoredHospital) => {
    setSelectedId(hospital.id);
    onSelectHospital({
      name: hospital.name,
      address: hospital.address,
      city: hospital.city,
      state: hospital.state,
      lat: hospital.lat,
      lng: hospital.lng
    });
    setLastAutoFilledName(hospital.name);
    setSaveSuccessMsg(null);
  };

  const handleSaveCurrentAsRecent = () => {
    if (!selectedHospitalName.trim() || !currentAddress.trim()) {
      alert("Please enter both Hospital Name and Hospital Address before saving as a frequent hospital.");
      return;
    }

    const saved = saveRecentHospital({
      name: selectedHospitalName.trim(),
      address: currentAddress.trim(),
      city: city || "Chennai",
      state: currentState || "Tamil Nadu",
      lat: currentLat,
      lng: currentLng
    });

    const refreshed = getStoredHospitalsForCity(city);
    setStoredHospitals(refreshed);
    setSelectedId(saved.id);
    setSaveSuccessMsg(`Saved "${saved.name}" to frequently used hospitals in ${city}!`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleResetPresets = () => {
    if (confirm(`Reset stored hospitals for ${city} to default verified hospital presets?`)) {
      clearRecentHospitalsForCity(city);
      const refreshed = getStoredHospitalsForCity(city);
      setStoredHospitals(refreshed);
      setSelectedId("");
      setLastAutoFilledName(null);
    }
  };

  return (
    <div
      id="recent-hospitals-section"
      className="bg-gradient-to-br from-[#1C1616] to-[#141212] border border-brand-red/35 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3.5"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-dark/60 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-red/20 border border-brand-red/40 flex items-center justify-center text-brand-red">
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <label
              htmlFor="recent-hospitals-select"
              className="text-xs font-bold text-text-bright flex items-center gap-2 font-display uppercase tracking-wider"
            >
              <span>Recent Hospitals in {city}</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-mono px-2 py-0.2 rounded border border-emerald-500/30 normal-case">
                Auto-Populates Address & Coordinates
              </span>
            </label>
            <p className="text-[11px] text-text-muted mt-0.5">
              Select from stored and frequently used clinical facilities in {city} for instant GPS targeting
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetPresets}
          className="text-[10px] text-text-subtle hover:text-text-muted font-mono flex items-center gap-1 transition cursor-pointer self-start sm:self-auto"
          title="Reset to default verified hospital presets"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          <span>Reset Presets</span>
        </button>
      </div>

      {/* Primary Dropdown Control */}
      <div className="space-y-2">
        <div className="relative">
          <select
            id="recent-hospitals-select"
            value={selectedId}
            onChange={handleDropdownChange}
            className="w-full bg-[#201D1D] hover:bg-[#252222] border border-brand-red/40 focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red rounded-xl px-3.5 py-2.5 text-xs text-text-bright font-medium cursor-pointer transition appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23EF4444%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:9px_9px] bg-[position:right_14px_center] bg-no-repeat shadow-inner pr-8"
          >
            <option value="">
              -- Select a Frequently Used Hospital in {city} ({storedHospitals.length} available) --
            </option>
            {storedHospitals.map((hosp) => (
              <option key={hosp.id} value={hosp.id}>
                {hosp.name} • {hosp.address} (GPS: {hosp.lat}, {hosp.lng})
                {hosp.usageCount > 1 ? ` [${hosp.usageCount} SOS uses]` : " [Frequent]"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Auto-filled Feedback Confirmation Notification */}
      {lastAutoFilledName && (
        <div
          id="recent-hospital-autofill-notification"
          className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 animate-fade-in"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <div className="truncate">
              <span className="font-bold text-text-bright">Populated:</span>{" "}
              <span className="text-emerald-300 font-semibold">{lastAutoFilledName}</span>
              <span className="text-text-muted text-[11px] ml-2 font-mono">
                (GPS: {currentLat}, {currentLng})
              </span>
            </div>
          </div>
          <span className="text-[10px] uppercase font-mono bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300 shrink-0">
            Coordinates Loaded
          </span>
        </div>
      )}

      {saveSuccessMsg && (
        <div className="bg-brand-red/10 border border-brand-red/30 text-rose-300 px-3 py-2 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5 shrink-0 text-brand-red" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Quick-Pick Chips for Top Frequently Used Hospitals */}
      {storedHospitals.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[10px] text-text-subtle font-mono uppercase tracking-wider">
            <span className="flex items-center gap-1 font-semibold">
              <Clock className="w-3 h-3 text-brand-red" />
              <span>Frequent Hospitals in {city} (1-Click Fill):</span>
            </span>
            <span>{storedHospitals.length} stored</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {storedHospitals.slice(0, 4).map((hosp) => {
              const isSelected = selectedId === hosp.id;
              return (
                <button
                  key={hosp.id}
                  type="button"
                  onClick={() => handleQuickSelect(hosp)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border text-left ${
                    isSelected
                      ? "bg-brand-red text-white border-brand-red shadow-md shadow-brand-red/20"
                      : "bg-[#201D1D] text-text-muted hover:text-text-bright border-border-dark hover:border-zinc-500"
                  }`}
                  title={`${hosp.address} (Lat: ${hosp.lat}, Lng: ${hosp.lng})`}
                >
                  <MapPin className={`w-3 h-3 shrink-0 ${isSelected ? "text-white" : "text-brand-red"}`} />
                  <span className="truncate max-w-[180px] sm:max-w-[240px]">{hosp.name}</span>
                  {isSelected && <Check className="w-3 h-3 text-white shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Save current entered hospital button */}
      <div className="flex items-center justify-between pt-1 border-t border-border-dark/50 text-[11px]">
        <span className="text-text-subtle font-mono text-[10px]">
          Using a different hospital? Enter details below to auto-save, or click:
        </span>
        <button
          type="button"
          id="btn-save-as-recent-hospital"
          onClick={handleSaveCurrentAsRecent}
          className="text-brand-red hover:text-rose-400 font-semibold font-mono flex items-center gap-1 cursor-pointer transition hover:underline"
        >
          <PlusCircle className="w-3 h-3" />
          <span>Save Current to Recent List</span>
        </button>
      </div>
    </div>
  );
}
