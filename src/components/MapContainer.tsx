import { useEffect, useRef } from "react";
import { Donor, EmergencyRequest } from "../types";

interface MapContainerProps {
  donors: Donor[];
  emergencies: EmergencyRequest[];
  userLat: number;
  userLng: number;
  onContactDonor: (donor: Donor) => void;
  onContactRequester: (req: EmergencyRequest) => void;
}

declare global {
  interface Window {
    L: any;
  }
}

export default function MapContainer({
  donors,
  emergencies,
  userLat,
  userLng,
  onContactDonor,
  onContactRequester
}: MapContainerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);

  useEffect(() => {
    // If Leaflet is not loaded on window, wait or skip gracefully
    if (!window.L || !mapContainerRef.current) return;

    try {
      const L = window.L;

      // Initialize map centered at current user GPS coordinates
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([userLat, userLng], 12);

      mapInstanceRef.current = map;

      // Load dark-themed map tiles matching our aesthetic
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19
      }).addTo(map);

      // Add a distinct blue pulsing circle at the user's current GPS location
      const userMarker = L.circle([userLat, userLng], {
        color: "#5C5C5C",
        fillColor: "#3B82F6",
        fillOpacity: 0.6,
        radius: 180
      }).addTo(map);
      
      userMarker.bindPopup("<div class='text-xs font-semibold font-sans text-white'>Your Current Geolocation</div>");
      userMarkerRef.current = userMarker;

      // Layer for donor and emergency pins
      markersLayerRef.current = L.layerGroup().addTo(map);

      renderMarkers();
    } catch (err) {
      console.error("Leaflet map rendering failed", err);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        userMarkerRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, []); // Run on mount only to preserve Leaflet instance

  // Smoothly fly or pan to coordinates when user GPS updates (e.g. searching location)
  useEffect(() => {
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.setView([userLat, userLng], 12);
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([userLat, userLng]);
        }
      } catch (err) {
        console.error("Leaflet panning failed", err);
      }
    }
  }, [userLat, userLng]);

  // Redraw markers whenever donors or emergencies lists alter
  useEffect(() => {
    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();
      renderMarkers();
    }
  }, [donors, emergencies]);

  const renderMarkers = () => {
    const L = window.L;
    if (!L || !mapInstanceRef.current || !markersLayerRef.current) return;

    // 1. Add Donor markers with blood groups
    donors.forEach((donor) => {
      const { lat, lng } = donor.location;
      if (!lat || !lng) return;

      // Create a gorgeous custom SVG divicon corresponding to available blood type colors
      const isAlt = donor.bloodGroup.endsWith("-");
      const iconBg = donor.isAvailable ? "#E63946" : "#6B7280";
      
      const customHtml = `
        <div class="flex items-center justify-center rounded-full border border-[#2A2A2A] shadow-lg text-white font-bold"
             style="background-color: ${iconBg}; width: 34px; height: 34px; font-family: 'Syne', sans-serif; font-size: 13px;">
          ${donor.bloodGroup}
        </div>
      `;

      const customIcon = L.divIcon({
        html: customHtml,
        className: "custom-leaflet-marker",
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const donorMarker = L.marker([lat, lng], { icon: customIcon }).addTo(markersLayerRef.current);

      const statusDot = donor.isAvailable 
        ? `<span class="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></span> Available`
        : `<span class="inline-block w-2.5 h-2.5 bg-zinc-500 rounded-full mr-1.5"></span> Unavailable`;

      const popupContent = document.createElement("div");
      popupContent.className = "p-2 font-sans text-xs bg-[#161616] text-[#F5F5F5] min-w-[200px]";
      popupContent.innerHTML = `
        <div class="flex items-center gap-2 mb-2">
          <span class="font-bold text-sm bg-brand-red px-1.5 py-0.5 rounded text-white font-display">${donor.bloodGroup}</span>
          <span class="font-semibold text-[#F5F5F5]">${donor.fullName}</span>
        </div>
        <p class="text-[#A0A0A0] text-[10px] mb-1.5">City: ${donor.city} • Age: ${donor.age}</p>
        <p class="text-[11px] mb-2 flex items-center">${statusDot}</p>
        <button id="marker-contact-btn-${donor.uid}" class="w-full bg-[#E63946] hover:bg-red-700 text-white font-semibold py-1 rounded transition duration-200 text-[11px] cursor-pointer">
          Contact Donor
        </button>
      `;

      // Mount popup with clickable CTA trigger
      donorMarker.bindPopup(popupContent);
      donorMarker.on("popupopen", () => {
        const btn = document.getElementById(`marker-contact-btn-${donor.uid}`);
        if (btn) {
          btn.onclick = () => {
            onContactDonor(donor);
          };
        }
      });
    });

    // 2. Add Active Emergency markers
    emergencies
      .filter((e) => e.status === "Active")
      .forEach((req) => {
        const { lat, lng } = req.location;
        if (!lat || !lng) return;

        // Custom pulsing triangular warning icon for emergencies
        const urgencyColor = req.urgencyLevel === "Critical" ? "#EF4444" : req.urgencyLevel === "Urgent" ? "#F59E0B" : "#10B981";
        
        const customHtml = `
          <div class="relative flex items-center justify-center animate-pulse duration-1000" style="width: 38px; height: 38px;">
            <div class="absolute inset-0 rounded-full bg-red-600 opacity-25 scale-125 animate-ping"></div>
            <div class="flex items-center justify-center rounded-lg border-2 border-white shadow-xl text-white font-extrabold"
                 style="background-color: ${urgencyColor}; width: 28px; height: 28px; font-family: 'Syne', sans-serif; font-size: 11px;">
              SOS
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: customHtml,
          className: "custom-leaflet-emergency",
          iconSize: [38, 38],
          iconAnchor: [19, 19]
        });

        const reqMarker = L.marker([lat, lng], { icon: customIcon }).addTo(markersLayerRef.current);

        const popupContent = document.createElement("div");
        popupContent.className = "p-2 font-sans text-xs bg-[#161616] text-[#F5F5F5] min-w-[210px]";
        popupContent.innerHTML = `
          <div class="mb-1.5 flex items-center gap-1.5 justify-between">
            <span class="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded" style="background-color: ${urgencyColor}44; color: ${urgencyColor}">
              ${req.urgencyLevel} SOS
            </span>
            <span class="text-[#A0A0A0] text-[10px] font-mono">${req.bloodGroupNeeded} needed</span>
          </div>
          <h4 class="font-bold text-[#F5F5F5] text-sm mb-1">${req.hospitalName}</h4>
          <p class="text-[10px] text-[#A0A0A0] mb-2 leading-snug">${req.hospitalAddress}</p>
          <button id="marker-emergency-btn-${req.requestId}" class="w-full bg-[#1E1E1E] border border-zinc-700 hover:border-zinc-500 text-white font-semibold py-1 rounded transition duration-200 text-[11px] cursor-pointer">
            Respond to Request
          </button>
        `;

        reqMarker.bindPopup(popupContent);
        reqMarker.on("popupopen", () => {
          const btn = document.getElementById(`marker-emergency-btn-${req.requestId}`);
          if (btn) {
            btn.onclick = () => {
              onContactRequester(req);
            };
          }
        });
      });
  };

  return (
    <div className="relative w-full h-full min-h-[350px] md:min-h-[450px] border border-border-dark rounded-2xl overflow-hidden shadow-2xl">
      <div id="leaflet-blood-donor-map" ref={mapContainerRef} className="w-full h-full" />
      
      {/* Absolute Overlays for legend markers */}
      <div className="absolute top-3 right-3 z-[1000] bg-card-dark/95 border border-border-dark px-3 py-2.5 rounded-xl text-xs space-y-2 max-w-[170px] pointer-events-auto backdrop-blur">
        <h5 className="font-bold text-text-bright border-b border-border-dark pb-1 text-[10px] tracking-wider uppercase font-display">Map Legend</h5>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-brand-red border border-zinc-800 inline-block shrink-0"></span>
          <span className="text-text-muted text-[11px]">Active Donor</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#6B7280] border border-zinc-800 inline-block shrink-0"></span>
          <span className="text-text-muted text-[11px]">Donor (Unavailable)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-red-500 rounded relative inline-block shrink-0 flex items-center justify-center text-[8px] text-white font-bold" style={{ width: "12px", height: "12px" }}>!</span>
          <span className="text-text-muted text-[11px]">SOS Emergencies</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500/80 border border-blue-400 inline-block shrink-0"></span>
          <span className="text-text-muted text-[11px]">You (GPS Position)</span>
        </div>
      </div>
    </div>
  );
}
