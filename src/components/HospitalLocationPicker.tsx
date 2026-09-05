import React, { useState, useEffect, useRef } from "react";
import {
  MapPin,
  LocateFixed,
  ExternalLink,
  Building2,
  Check,
  AlertCircle,
  Search,
  Navigation
} from "lucide-react";
import { CITY_HOSPITAL_PRESETS, HospitalPreset, getStoredHospitalsForCity } from "../lib/hospitals";

interface HospitalLocationPickerProps {
  hospitalName: string;
  hospitalAddress: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  onChange: (data: {
    hospitalName: string;
    hospitalAddress: string;
    city: string;
    state: string;
    lat: number;
    lng: number;
  }) => void;
}

export default function HospitalLocationPicker({
  hospitalName,
  hospitalAddress,
  city,
  state,
  lat,
  lng,
  onChange
}: HospitalLocationPickerProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"preset" | "gps" | "manual">("preset");
  const [searchQuery, setSearchQuery] = useState("");
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const cityKey = (city || "chennai").toLowerCase().trim();
  const presets: HospitalPreset[] = getStoredHospitalsForCity(city);

  // Filter presets if search query entered
  const filteredPresets = searchQuery.trim()
    ? presets.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.address.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : presets;

  // Initialize and update Leaflet map for interactive hospital pin picking
  useEffect(() => {
    if (!window.L || !mapContainerRef.current) return;
    const L = window.L;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([lat, lng], 14);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19
      }).addTo(map);

      // Create a prominent red hospital marker
      const hospitalIcon = L.divIcon({
        className: "custom-hospital-pin",
        html: `
          <div style="
            background-color: #EF4444;
            color: white;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: bold;
            box-shadow: 0 0 15px rgba(239, 68, 68, 0.6);
            border: 2px solid white;
          ">
            🏥
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const marker = L.marker([lat, lng], {
        icon: hospitalIcon,
        draggable: true
      }).addTo(map);

      marker.bindPopup(`
        <div style="color: #111; font-family: sans-serif; padding: 4px;">
          <strong style="font-size: 12px; color: #DC2626;">Hospital Location</strong>
          <div style="font-size: 11px; margin-top: 2px;">Drag pin to adjust exact location</div>
        </div>
      `);

      marker.on("dragend", (e: any) => {
        const newPos = e.target.getLatLng();
        onChange({
          hospitalName,
          hospitalAddress,
          city,
          state,
          lat: Number(newPos.lat.toFixed(5)),
          lng: Number(newPos.lng.toFixed(5))
        });
      });

      // Allow clicking on map to move marker
      map.on("click", (e: any) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        marker.setLatLng([clickLat, clickLng]);
        onChange({
          hospitalName,
          hospitalAddress,
          city,
          state,
          lat: Number(clickLat.toFixed(5)),
          lng: Number(clickLng.toFixed(5))
        });
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    } else {
      // Pan to new coords if changed externally
      mapInstanceRef.current.setView([lat, lng], mapInstanceRef.current.getZoom() || 14);
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      }
    }
  }, [lat, lng]);

  // Handle GPS detection for current hospital location
  const handleDetectCurrentGPS = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser");
      return;
    }
    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const newLat = Number(pos.coords.latitude.toFixed(5));
        const newLng = Number(pos.coords.longitude.toFixed(5));
        onChange({
          hospitalName: hospitalName || "Hospital at Current Location",
          hospitalAddress: hospitalAddress || `GPS Coordinates: ${newLat}, ${newLng}`,
          city,
          state,
          lat: newLat,
          lng: newLng
        });
        setActiveTab("gps");
      },
      (err) => {
        setIsLocating(false);
        setGpsError(`Unable to retrieve GPS: ${err.message}. Please use presets or map pin.`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSelectPreset = (preset: HospitalPreset) => {
    onChange({
      hospitalName: preset.name,
      hospitalAddress: preset.address,
      city: preset.city,
      state: preset.state,
      lat: preset.lat,
      lng: preset.lng
    });
    setGpsError(null);
  };

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  return (
    <div id="hospital-location-picker" className="bg-[#141212] border border-border-dark rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-dark pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-red/15 border border-brand-red/30 flex items-center justify-center text-brand-red">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-text-bright text-sm flex items-center gap-1.5">
              <span>Hospital Location on Google Maps</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-mono px-2 py-0.5 rounded border border-emerald-500/30">
                GPS Verified
              </span>
            </h4>
            <p className="text-[11px] text-text-muted mt-0.5">
              Accurate coordinates guide donor navigation routes and dispatch timing
            </p>
          </div>
        </div>

        {/* GPS Quick Action */}
        <button
          type="button"
          id="btn-detect-hospital-gps"
          onClick={handleDetectCurrentGPS}
          disabled={isLocating}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-red hover:bg-brand-red-dark text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-md disabled:opacity-50 shrink-0"
        >
          <LocateFixed className={`w-3.5 h-3.5 ${isLocating ? "animate-spin" : ""}`} />
          <span>{isLocating ? "Acquiring GPS..." : "📍 Use Hospital GPS"}</span>
        </button>
      </div>

      {gpsError && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-2.5 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* Tabs for choosing method */}
      <div className="flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("preset")}
          className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
            activeTab === "preset"
              ? "bg-surface-dark text-brand-red border border-brand-red/30 font-bold"
              : "text-text-muted hover:text-text-bright"
          }`}
        >
          Verified City Hospitals ({presets.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("manual")}
          className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
            activeTab === "manual"
              ? "bg-surface-dark text-brand-red border border-brand-red/30 font-bold"
              : "text-text-muted hover:text-text-bright"
          }`}
        >
          Adjust Pin / Coordinates
        </button>
      </div>

      {/* Preset List Selection */}
      {activeTab === "preset" && presets.length > 0 && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-text-subtle absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={`Search ${city} hospitals...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1c1b1e] border border-border-dark focus:border-brand-red rounded-xl pl-9 pr-3 py-1.5 text-xs text-text-bright placeholder-text-subtle"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
            {filteredPresets.map((preset, idx) => {
              const isSelected =
                hospitalName.toLowerCase() === preset.name.toLowerCase() ||
                (Math.abs(lat - preset.lat) < 0.001 && Math.abs(lng - preset.lng) < 0.001);

              return (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleSelectPreset(preset)}
                  className={`text-left p-2.5 rounded-xl border transition cursor-pointer flex items-start justify-between gap-2 text-xs ${
                    isSelected
                      ? "bg-brand-red/10 border-brand-red text-text-bright shadow-sm"
                      : "bg-[#18181A] border-border-dark hover:border-text-subtle text-text-muted hover:text-text-bright"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-bold text-[11px] truncate text-text-bright">
                      {preset.name}
                    </p>
                    <p className="text-[10px] text-text-subtle truncate mt-0.5">
                      {preset.address}
                    </p>
                  </div>
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-brand-red text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Interactive Map Preview & Pin Placement */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[11px] font-mono text-text-muted flex items-center gap-1">
            <MapPin className="w-3 h-3 text-brand-red" />
            <span>Click or drag marker on map to refine hospital entrance:</span>
          </span>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 font-mono"
          >
            <span>Open in Google Maps</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Map Container */}
        <div className="relative h-44 w-full rounded-xl overflow-hidden border border-border-dark shadow-inner">
          <div ref={mapContainerRef} className="w-full h-full" />
          <div className="absolute bottom-2 left-2 z-[400] bg-black/80 backdrop-blur border border-border-dark px-2.5 py-1 rounded-lg text-[10px] font-mono text-text-bright">
            📍 Lat: <span className="text-emerald-400">{lat}</span>, Lng: <span className="text-emerald-400">{lng}</span>
          </div>
        </div>
      </div>

      {/* Manual coordinate adjustment */}
      {activeTab === "manual" && (
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-text-subtle uppercase">Latitude</label>
            <input
              type="number"
              step="0.0001"
              value={lat}
              onChange={(e) =>
                onChange({
                  hospitalName,
                  hospitalAddress,
                  city,
                  state,
                  lat: parseFloat(e.target.value) || lat,
                  lng
                })
              }
              className="w-full bg-[#1c1b1e] border border-border-dark rounded-xl px-3 py-1.5 text-xs text-text-bright font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-text-subtle uppercase">Longitude</label>
            <input
              type="number"
              step="0.0001"
              value={lng}
              onChange={(e) =>
                onChange({
                  hospitalName,
                  hospitalAddress,
                  city,
                  state,
                  lat,
                  lng: parseFloat(e.target.value) || lng
                })
              }
              className="w-full bg-[#1c1b1e] border border-border-dark rounded-xl px-3 py-1.5 text-xs text-text-bright font-mono"
            />
          </div>
        </div>
      )}
    </div>
  );
}
