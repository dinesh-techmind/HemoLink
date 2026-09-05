import React, { useEffect, useRef, useState } from "react";
import { EmergencyRequest } from "../types";
import { calculateDistance } from "../lib/store";
import {
  X,
  MapPin,
  Navigation,
  ExternalLink,
  Phone,
  Copy,
  Check,
  Calendar,
  Compass,
  AlertTriangle,
  Droplet,
  Clock
} from "lucide-react";

interface HospitalMapModalProps {
  emergency: EmergencyRequest;
  userLat: number;
  userLng: number;
  onClose: () => void;
  onContactRequester: (emergency: EmergencyRequest) => void;
  onScheduleCalendar?: (emergency: EmergencyRequest) => void;
  onNavigateToLiveMap?: (emergency: EmergencyRequest) => void;
}

export default function HospitalMapModal({
  emergency,
  userLat,
  userLng,
  onClose,
  onContactRequester,
  onScheduleCalendar,
  onNavigateToLiveMap
}: HospitalMapModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [copied, setCopied] = useState(false);

  const hospitalLat = emergency.location.lat;
  const hospitalLng = emergency.location.lng;

  const distanceKm = calculateDistance(userLat, userLng, hospitalLat, hospitalLng);
  // Estimate driving time assuming ~28 km/h city emergency traffic + 3 mins buffer
  const driveMinutes = Math.max(4, Math.round((distanceKm / 28) * 60));

  // Direct Google Maps links
  const googleMapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${hospitalLat},${hospitalLng}&travelmode=driving`;
  const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(emergency.hospitalName + " " + emergency.city)}`;
  const googleStreetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${hospitalLat},${hospitalLng}`;

  // Initialize interactive Leaflet map showing hospital & donor
  useEffect(() => {
    if (!window.L || !mapContainerRef.current) return;
    const L = window.L;

    try {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19
      }).addTo(map);

      // 1. Hospital Marker
      const hospitalIcon = L.divIcon({
        className: "hospital-pin-icon",
        html: `
          <div style="
            background: #DC2626;
            color: white;
            width: 38px;
            height: 38px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            font-weight: bold;
            box-shadow: 0 0 20px rgba(220, 38, 38, 0.8);
            border: 2px solid #FFFFFF;
          ">
            🏥
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      });

      const hospitalMarker = L.marker([hospitalLat, hospitalLng], { icon: hospitalIcon }).addTo(map);
      hospitalMarker.bindPopup(`
        <div style="color: #111; font-family: sans-serif; padding: 4px; max-width: 200px;">
          <strong style="color: #DC2626; font-size: 13px;">${emergency.hospitalName}</strong>
          <div style="font-size: 11px; margin-top: 3px; color: #444;">${emergency.hospitalAddress}</div>
          <div style="margin-top: 6px; font-weight: bold; font-size: 11px; color: #B91C1C;">
            Needs ${emergency.unitsNeeded} Units of ${emergency.bloodGroupNeeded}
          </div>
        </div>
      `).openPopup();

      // 2. Donor Location Marker
      const donorIcon = L.divIcon({
        className: "donor-user-icon",
        html: `
          <div style="
            background: #2563EB;
            color: white;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            box-shadow: 0 0 15px rgba(37, 99, 235, 0.7);
            border: 2px solid #FFFFFF;
          ">
            📍
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      const donorMarker = L.marker([userLat, userLng], { icon: donorIcon }).addTo(map);
      donorMarker.bindPopup(`
        <div style="color: #111; font-family: sans-serif; padding: 4px;">
          <strong>Your Current Location</strong>
          <div style="font-size: 11px; color: #555;">${distanceKm} km to hospital</div>
        </div>
      `);

      // 3. Polyline route connecting donor to hospital
      const routeLine = L.polyline(
        [
          [userLat, userLng],
          [hospitalLat, hospitalLng]
        ],
        {
          color: "#EF4444",
          weight: 3,
          dashArray: "6, 8",
          opacity: 0.8
        }
      ).addTo(map);

      // Fit bounds to encompass both locations
      const group = L.featureGroup([hospitalMarker, donorMarker, routeLine]);
      map.fitBounds(group.getBounds().pad(0.2));

      mapInstanceRef.current = map;
    } catch (err) {
      console.error("Map initialization failed", err);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [emergency, userLat, userLng, hospitalLat, hospitalLng, distanceKm]);

  const handleCopyLocation = () => {
    const text = `${emergency.hospitalName}, ${emergency.hospitalAddress}, ${emergency.city} (GPS: ${hospitalLat}, ${hospitalLng})`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="hospital-map-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        id="hospital-map-modal-content"
        className="bg-[#110D0D] border-2 border-brand-red rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-950/60 to-[#141212] p-5 sm:p-6 border-b border-border-dark flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-brand-red/20 border border-brand-red/40 flex items-center justify-center text-brand-red shrink-0 shadow-lg">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase font-mono font-extrabold tracking-widest px-2.5 py-0.5 rounded bg-brand-red text-white">
                  SOS Blood Emergency
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {emergency.urgencyLevel} Urgency
                </span>
                <span className="text-[10px] font-mono text-text-subtle">
                  ID: #{emergency.requestId.slice(-5)}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-text-bright mt-1 tracking-tight">
                {emergency.hospitalName}
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                {emergency.hospitalAddress}, {emergency.city}, {emergency.state}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-surface-dark border border-border-dark text-text-muted hover:text-text-bright transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vital Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#18181A] p-3 sm:px-6 border-b border-border-dark text-center text-xs">
          <div className="p-2 rounded-xl bg-card-dark border border-border-dark">
            <span className="text-[10px] uppercase text-text-subtle font-mono block">Required Blood</span>
            <span className="text-base font-extrabold text-brand-red font-display">
              {emergency.bloodGroupNeeded} ({emergency.unitsNeeded} Units)
            </span>
          </div>
          <div className="p-2 rounded-xl bg-card-dark border border-border-dark">
            <span className="text-[10px] uppercase text-text-subtle font-mono block">Distance from You</span>
            <span className="text-base font-extrabold text-emerald-400 font-display">
              📍 {distanceKm} km
            </span>
          </div>
          <div className="p-2 rounded-xl bg-card-dark border border-border-dark">
            <span className="text-[10px] uppercase text-text-subtle font-mono block">Estimated Drive</span>
            <span className="text-base font-extrabold text-amber-400 font-display">
              ⏱ ~{driveMinutes} mins
            </span>
          </div>
          <div className="p-2 rounded-xl bg-card-dark border border-border-dark">
            <span className="text-[10px] uppercase text-text-subtle font-mono block">Patient Name</span>
            <span className="text-base font-bold text-text-bright truncate block">
              {emergency.patientName}
            </span>
          </div>
        </div>

        {/* Interactive Map View */}
        <div className="relative h-64 sm:h-80 w-full bg-[#0A0A0A] border-b border-border-dark">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Quick HUD overlay */}
          <div className="absolute top-3 left-3 z-[400] bg-black/80 backdrop-blur-md border border-border-dark px-3 py-2 rounded-xl text-xs space-y-1 shadow-xl">
            <div className="flex items-center gap-2 text-text-bright font-mono text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-red animate-pulse"></span>
              <span>Destination: {emergency.hospitalName}</span>
            </div>
            <div className="text-[10px] text-text-muted font-mono">
              GPS: {hospitalLat.toFixed(4)}, {hospitalLng.toFixed(4)}
            </div>
          </div>

          <div className="absolute bottom-3 right-3 z-[400] flex gap-2">
            <a
              href={googleStreetViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-black/85 hover:bg-black text-white text-[11px] font-semibold rounded-xl border border-border-dark backdrop-blur shadow-lg flex items-center gap-1.5 transition"
            >
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>360° Street View</span>
            </a>
          </div>
        </div>

        {/* Action Controls & Navigation CTA */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto bg-[#110D0D]">
          {/* Clinical Notes Banner */}
          {emergency.additionalNotes && (
            <div className="bg-surface-dark/90 border border-border-dark p-3 rounded-xl text-xs space-y-1">
              <span className="text-[10px] uppercase font-mono text-text-subtle font-bold block">
                Clinical Directives & Hospital Ward:
              </span>
              <p className="text-text-muted italic leading-relaxed">
                "{emergency.additionalNotes}"
              </p>
            </div>
          )}

          {/* Primary Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Direct Google Maps Turn-by-Turn Directions */}
            <a
              id="btn-google-maps-directions"
              href={googleMapsDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 bg-brand-red hover:bg-brand-red-dark text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-brand-red/20 cursor-pointer"
            >
              <Navigation className="w-4 h-4" />
              <span>Start Turn-by-Turn Navigation</span>
              <ExternalLink className="w-3.5 h-3.5 ml-auto" />
            </a>

            {/* Respond & Connect with Family/Requester */}
            <button
              id="btn-modal-respond"
              onClick={() => {
                onClose();
                onContactRequester(emergency);
              }}
              className="w-full py-3 px-4 bg-card-dark hover:bg-surface-dark border border-brand-red/40 text-rose-300 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow cursor-pointer"
            >
              <Droplet className="w-4 h-4 text-brand-red" />
              <span>Respond & Volunteer to Donate</span>
            </button>
          </div>

          {/* Secondary Utility Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
            <a
              href={`tel:${emergency.requesterPhone}`}
              className="p-2.5 bg-surface-dark hover:bg-zinc-800 text-text-bright border border-border-dark rounded-xl flex items-center justify-center gap-1.5 transition font-semibold"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Call Hotline</span>
            </a>

            <button
              type="button"
              onClick={handleCopyLocation}
              className="p-2.5 bg-surface-dark hover:bg-zinc-800 text-text-bright border border-border-dark rounded-xl flex items-center justify-center gap-1.5 transition font-semibold cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-text-subtle" />
                  <span>Copy Address</span>
                </>
              )}
            </button>

            {onScheduleCalendar && (
              <button
                type="button"
                onClick={() => {
                  onScheduleCalendar(emergency);
                }}
                className="p-2.5 bg-surface-dark hover:bg-zinc-800 text-rose-300 border border-border-dark rounded-xl flex items-center justify-center gap-1.5 transition font-semibold cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-rose-400" />
                <span>Google Calendar</span>
              </button>
            )}

            {onNavigateToLiveMap && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToLiveMap(emergency);
                }}
                className="p-2.5 bg-surface-dark hover:bg-zinc-800 text-text-bright border border-border-dark rounded-xl flex items-center justify-center gap-1.5 transition font-semibold cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-blue-400" />
                <span>Live Map Tab</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
