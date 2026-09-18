// Source: Google Maps Platform Code Assist
import React, { useState, useEffect, useRef } from "react";
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import { Donor, EmergencyRequest } from "../types";
import { Compass, ExternalLink, MapPin, Phone, ShieldAlert, Navigation } from "lucide-react";

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
    _googleMapsApiKey?: string;
    gm_authFailure?: () => void;
  }
}

// Camera controller component to smoothly pan when user coordinates update
function MapCameraController({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.panTo(center);
    }
  }, [map, center.lat, center.lng]);
  return null;
}

function LeafletFallbackMap({
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

  // Smoothly fly or pan to coordinates when user GPS updates
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
    (donors || []).forEach((donor) => {
      const { lat, lng } = donor.location;
      if (!lat || !lng) return;

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
      const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
      popupContent.innerHTML = `
        <div class="flex items-center gap-2 mb-2">
          <span class="font-bold text-sm bg-brand-red px-1.5 py-0.5 rounded text-white font-display">${donor.bloodGroup}</span>
          <span class="font-semibold text-[#F5F5F5]">${donor.fullName}</span>
        </div>
        <p class="text-[#A0A0A0] text-[10px] mb-1.5">City: ${donor.city} • Age: ${donor.age}</p>
        <p class="text-[11px] mb-2 flex items-center">${statusDot}</p>
        <div class="space-y-1.5">
          <button id="marker-contact-btn-${donor.uid}" class="w-full bg-[#E63946] hover:bg-red-700 text-white font-semibold py-1 rounded transition duration-200 text-[11px] cursor-pointer">
            Contact Donor
          </button>
          <a href="${streetViewUrl}" target="_blank" rel="noopener noreferrer" class="w-full bg-[#262626] hover:bg-[#333333] border border-amber-500/40 text-amber-400 font-semibold py-1 rounded transition duration-200 text-[10px] flex items-center justify-center gap-1 cursor-pointer font-mono">
            📷 360° Street View
          </a>
        </div>
      `;

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
        const hospitalStreetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
        popupContent.innerHTML = `
          <div class="mb-1.5 flex items-center gap-1.5 justify-between">
            <span class="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded" style="background-color: ${urgencyColor}44; color: ${urgencyColor}">
              ${req.urgencyLevel} SOS
            </span>
            <span class="text-[#A0A0A0] text-[10px] font-mono">${req.bloodGroupNeeded} needed</span>
          </div>
          <h4 class="font-bold text-[#F5F5F5] text-sm mb-1">${req.hospitalName}</h4>
          <p class="text-[10px] text-[#A0A0A0] mb-2 leading-snug">${req.hospitalAddress}</p>
          <div class="space-y-1.5">
            <button id="marker-emergency-btn-${req.requestId}" class="w-full bg-[#1E1E1E] border border-zinc-700 hover:border-zinc-500 text-white font-semibold py-1 rounded transition duration-200 text-[11px] cursor-pointer">
              Respond to Request
            </button>
            <a href="${hospitalStreetViewUrl}" target="_blank" rel="noopener noreferrer" class="w-full bg-[#262626] hover:bg-[#333333] border border-amber-500/40 text-amber-400 font-semibold py-1 rounded transition duration-200 text-[10px] flex items-center justify-center gap-1 cursor-pointer font-mono">
              📷 Hospital Street View
            </a>
          </div>
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
      
      {/* Fallback Banner & Quick Info */}
      <div className="absolute top-3 left-3 z-[1000] bg-card-dark/95 border border-border-dark px-3 py-2 rounded-xl text-xs flex items-center gap-2 backdrop-blur shadow-lg">
        <Compass className="w-4 h-4 text-brand-red animate-spin" style={{ animationDuration: "12s" }} />
        <span className="text-text-bright font-mono text-[11px]">Interactive Geospatial View</span>
      </div>

      {/* Absolute Overlays for legend markers */}
      <div className="absolute top-3 right-3 z-[1000] bg-card-dark/95 border border-border-dark px-3 py-2.5 rounded-xl text-xs space-y-2 max-w-[170px] pointer-events-auto backdrop-blur shadow-lg">
        <h5 className="font-bold text-text-bright border-b border-border-dark pb-1 text-[10px] tracking-wider uppercase font-display">Map Legend</h5>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-brand-red border border-zinc-800 inline-block shrink-0"></span>
          <span className="text-text-muted text-[11px]">Active Donor</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#6B7280] border border-zinc-800 inline-block shrink-0"></span>
          <span className="text-text-muted text-[11px]">Donor (Away)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-red-500 rounded relative inline-block shrink-0 flex items-center justify-center text-[8px] text-white font-bold" style={{ width: "12px", height: "12px" }}>!</span>
          <span className="text-text-muted text-[11px]">SOS Emergencies</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500/80 border border-blue-400 inline-block shrink-0"></span>
          <span className="text-text-muted text-[11px]">Your GPS</span>
        </div>
      </div>
    </div>
  );
}

export default function MapContainer(props: MapContainerProps) {
  // Resolve Google Maps Platform API key from Vite environment or runtime storage
  const googleKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    (typeof window !== "undefined" && ((window as any)._googleMapsApiKey || localStorage.getItem("hemolink_maps_key")));

  const [authFailed, setAuthFailed] = useState(false);
  const [activeDonor, setActiveDonor] = useState<Donor | null>(null);
  const [activeEmergency, setActiveEmergency] = useState<EmergencyRequest | null>(null);

  useEffect(() => {
    (window as any).gm_authFailure = () => {
      console.warn("Google Maps Platform authentication notification: Falling back gracefully.");
      setAuthFailed(true);
    };
  }, []);

  // If no Google Maps API key is configured or authentication fails, show interactive fallback
  if (!googleKey || authFailed) {
    return (
      <div className="relative w-full h-full flex flex-col">
        {/* Informative Google Maps Quickstart Notice */}
        {!googleKey && (
          <div className="bg-surface-dark/95 border-b border-border-dark px-3.5 py-2 text-xs flex flex-wrap items-center justify-between gap-2 backdrop-blur z-20">
            <div className="flex items-center gap-2 text-text-muted text-[11px]">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span>
                <strong className="text-text-bright font-medium">Google Maps Platform:</strong> Ready for live deployment. Add your <code className="font-mono text-amber-400">VITE_GOOGLE_MAPS_API_KEY</code> in environment variables or Settings.
              </span>
            </div>
            <a
              href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-mono font-bold text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1"
            >
              Get Free Maps Demo Key <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
        <div className="flex-1 w-full relative">
          <LeafletFallbackMap {...props} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[350px] md:min-h-[450px] border border-border-dark rounded-2xl overflow-hidden shadow-2xl">
      <APIProvider apiKey={googleKey} solutionChannel="GMP_visgl_reactgooglemaps_v1_default">
        <GoogleMap
          defaultCenter={{ lat: props.userLat, lng: props.userLng }}
          defaultZoom={12}
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
          gestureHandling="greedy"
          zoomControl={true}
          mapTypeControl={true}
          streetViewControl={true}
          fullscreenControl={true}
          style={{ width: "100%", height: "100%" }}
        >
          {/* Smooth camera repositioning on GPS coordinate change */}
          <MapCameraController center={{ lat: props.userLat, lng: props.userLng }} />

          {/* User Geolocation Pulse Marker */}
          <AdvancedMarker position={{ lat: props.userLat, lng: props.userLng }} title="Your Geolocation">
            <div className="relative flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-400/40 animate-ping absolute" />
              <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-[0_0_12px_rgba(59,130,246,0.8)] z-10" />
            </div>
          </AdvancedMarker>

          {/* Donors Pins */}
          {(props.donors || []).map((donor) => {
            const { lat, lng } = donor.location;
            if (!lat || !lng) return null;
            const isSelected = activeDonor?.uid === donor.uid;

            return (
              <AdvancedMarker
                key={donor.uid}
                position={{ lat, lng }}
                title={`${donor.fullName} (${donor.bloodGroup})`}
                onClick={() => {
                  setActiveEmergency(null);
                  setActiveDonor(donor);
                }}
              >
                <div
                  className={`flex items-center justify-center rounded-full border-2 border-white shadow-xl text-white font-extrabold cursor-pointer transition-all duration-200 ${
                    isSelected ? "scale-125 ring-4 ring-amber-400/60" : "hover:scale-110"
                  }`}
                  style={{
                    backgroundColor: donor.isAvailable ? "#E63946" : "#4B5563",
                    width: "36px",
                    height: "36px",
                    fontFamily: "'Syne', sans-serif",
                    fontSize: "12px"
                  }}
                >
                  {donor.bloodGroup}
                </div>
              </AdvancedMarker>
            );
          })}

          {/* Active Emergencies Pins */}
          {props.emergencies
            .filter((e) => e.status === "Active")
            .map((req) => {
              const { lat, lng } = req.location;
              if (!lat || !lng) return null;
              const urgencyColor = req.urgencyLevel === "Critical" ? "#EF4444" : req.urgencyLevel === "Urgent" ? "#F59E0B" : "#10B981";
              const isSelected = activeEmergency?.requestId === req.requestId;

              return (
                <AdvancedMarker
                  key={req.requestId}
                  position={{ lat, lng }}
                  title={`SOS Emergency: ${req.hospitalName}`}
                  onClick={() => {
                    setActiveDonor(null);
                    setActiveEmergency(req);
                  }}
                >
                  <div className={`relative flex items-center justify-center cursor-pointer ${isSelected ? "scale-125" : "hover:scale-110"}`}>
                    <div
                      className="absolute inset-0 rounded-full opacity-30 animate-ping"
                      style={{ backgroundColor: urgencyColor, width: "38px", height: "38px" }}
                    />
                    <div
                      className="flex items-center justify-center rounded-xl border-2 border-white shadow-2xl text-white font-black"
                      style={{
                        backgroundColor: urgencyColor,
                        width: "32px",
                        height: "32px",
                        fontFamily: "'Syne', sans-serif",
                        fontSize: "11px"
                      }}
                    >
                      SOS
                    </div>
                  </div>
                </AdvancedMarker>
              );
            })}

          {/* Donor InfoWindow */}
          {activeDonor && activeDonor.location.lat && activeDonor.location.lng && (
            <InfoWindow
              position={{ lat: activeDonor.location.lat, lng: activeDonor.location.lng }}
              onCloseClick={() => setActiveDonor(null)}
              headerDisabled={false}
              maxWidth={260}
            >
              <div className="p-2 font-sans text-xs text-gray-900 space-y-2">
                <div className="flex items-center gap-2 border-b border-gray-200 pb-1.5">
                  <span className="font-extrabold text-xs bg-red-600 px-2 py-0.5 rounded text-white font-mono">
                    {activeDonor.bloodGroup}
                  </span>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm leading-none">{activeDonor.fullName}</h4>
                    <span className="text-[10px] text-gray-500">{activeDonor.city}, {activeDonor.state}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-semibold ${activeDonor.isAvailable ? "text-emerald-700" : "text-gray-600"}`}>
                    {activeDonor.isAvailable ? "● Ready to Donate" : "○ Currently Away"}
                  </span>
                </div>

                <div className="pt-1 space-y-1.5">
                  <button
                    onClick={() => props.onContactDonor(activeDonor)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Contact Donor</span>
                  </button>

                  <div className="grid grid-cols-2 gap-1.5">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${activeDonor.location.lat},${activeDonor.location.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-1 rounded text-[10px] flex items-center justify-center gap-1 font-mono transition"
                    >
                      <Navigation className="w-3 h-3 text-blue-600" />
                      <span>Directions</span>
                    </a>
                    <a
                      href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${activeDonor.location.lat},${activeDonor.location.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-1 rounded text-[10px] flex items-center justify-center gap-1 font-mono transition"
                    >
                      <span>📷 360° View</span>
                    </a>
                  </div>
                </div>
              </div>
            </InfoWindow>
          )}

          {/* Emergency SOS InfoWindow */}
          {activeEmergency && activeEmergency.location.lat && activeEmergency.location.lng && (
            <InfoWindow
              position={{ lat: activeEmergency.location.lat, lng: activeEmergency.location.lng }}
              onCloseClick={() => setActiveEmergency(null)}
              headerDisabled={false}
              maxWidth={270}
            >
              <div className="p-2 font-sans text-xs text-gray-900 space-y-2">
                <div className="flex items-center justify-between gap-1 border-b border-gray-200 pb-1.5">
                  <span className="font-extrabold text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-mono uppercase">
                    {activeEmergency.urgencyLevel} SOS
                  </span>
                  <span className="font-bold text-xs text-red-600 font-mono">
                    {activeEmergency.unitsNeeded} unit(s) • {activeEmergency.bloodGroupNeeded}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-gray-950 text-sm leading-tight">{activeEmergency.hospitalName}</h4>
                  <p className="text-[10px] text-gray-600 mt-0.5">{activeEmergency.hospitalAddress}</p>
                </div>

                <div className="pt-1 space-y-1.5">
                  <button
                    onClick={() => props.onContactRequester(activeEmergency)}
                    className="w-full bg-gray-900 hover:bg-black text-white font-semibold py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    <span>Respond to Alert</span>
                  </button>

                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${activeEmergency.location.lat},${activeEmergency.location.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold py-1 rounded text-[10px] flex items-center justify-center gap-1 font-mono transition"
                  >
                    <Navigation className="w-3 h-3 text-blue-600" />
                    <span>Get Directions to Hospital</span>
                  </a>
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </APIProvider>

      {/* Map Legend Overlay */}
      <div className="absolute top-3 right-3 z-10 bg-card-dark/95 border border-border-dark px-3 py-2.5 rounded-xl text-xs space-y-2 max-w-[170px] pointer-events-auto backdrop-blur shadow-xl">
        <h5 className="font-bold text-text-bright border-b border-border-dark pb-1 text-[10px] tracking-wider uppercase font-display flex items-center gap-1.5">
          <MapPin className="w-3 h-3 text-brand-red" />
          <span>Google Map Legend</span>
        </h5>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-brand-red border border-white inline-block shrink-0"></span>
          <span className="text-text-muted text-[11px]">Ready Donor</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#4B5563] border border-zinc-700 inline-block shrink-0"></span>
          <span className="text-text-muted text-[11px]">Away Donor</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-red-500 rounded relative inline-block shrink-0 flex items-center justify-center text-[8px] text-white font-bold" style={{ width: "12px", height: "12px" }}>!</span>
          <span className="text-text-muted text-[11px]">Emergency SOS</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500 border border-white inline-block shrink-0"></span>
          <span className="text-text-muted text-[11px]">Your GPS</span>
        </div>
      </div>
    </div>
  );
}

