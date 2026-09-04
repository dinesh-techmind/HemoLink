const fs = require('fs');
let code = fs.readFileSync('src/components/MapContainer.tsx', 'utf8');

// Rename MapContainer to LeafletFallbackMap
code = code.replace('export default function MapContainer(', 'function LeafletFallbackMap(');

// Add imports for Google Maps
const googleImports = `import React, { useState, useEffect, useRef } from "react";
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin, InfoWindow } from "@vis.gl/react-google-maps";
`;

code = code.replace('import { useEffect, useRef } from "react";', googleImports);

// Create the new MapContainer
const newMapContainer = `
export default function MapContainer(props: MapContainerProps) {
  const [googleKey] = useState(() => localStorage.getItem("hemolink_maps_key") || (window as any)._googleMapsApiKey);
  const [authFailed, setAuthFailed] = useState(false);
  const [activeMarker, setActiveMarker] = useState<string | null>(null);

  useEffect(() => {
    (window as any).gm_authFailure = () => {
      console.warn("Google Maps authentication failed. Falling back to Leaflet.");
      setAuthFailed(true);
    };
  }, []);

  if (!googleKey || authFailed) {
    return <LeafletFallbackMap {...props} />;
  }

  return (
    <div className="relative w-full h-full min-h-[350px] md:min-h-[450px] border border-border-dark rounded-2xl overflow-hidden shadow-2xl">
      <APIProvider apiKey={googleKey} onLoad={() => console.log('Maps API Loaded')}>
        <GoogleMap
          defaultCenter={{ lat: props.userLat, lng: props.userLng }}
          defaultZoom={13}
          mapId="hemolink_dark_map"
          disableDefaultUI={true}
          style={{ width: '100%', height: '100%' }}
        >
          {/* User Marker */}
          <AdvancedMarker position={{ lat: props.userLat, lng: props.userLng }}>
             <div className="w-5 h-5 rounded-full bg-blue-500/80 border-2 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.6)] animate-pulse" />
          </AdvancedMarker>

          {/* Donors */}
          {props.donors.map(donor => {
            const { lat, lng } = donor.location;
            if (!lat || !lng) return null;
            const iconBg = donor.isAvailable ? "#E63946" : "#6B7280";
            return (
              <AdvancedMarker 
                key={donor.uid} 
                position={{ lat, lng }}
                onClick={() => setActiveMarker(donor.uid)}
              >
                 <div className="flex items-center justify-center rounded-full border-2 border-[#2A2A2A] shadow-lg text-white font-bold transition hover:scale-110"
                      style={{ backgroundColor: iconBg, width: "34px", height: "34px", fontFamily: "'Syne', sans-serif", fontSize: "13px" }}>
                    {donor.bloodGroup}
                 </div>
                 {activeMarker === donor.uid && (
                    <InfoWindow position={{lat, lng}} onCloseClick={() => setActiveMarker(null)} headerDisabled={true}>
                      <div className="p-1 font-sans text-xs min-w-[200px] text-black">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-sm bg-brand-red px-1.5 py-0.5 rounded text-white">{donor.bloodGroup}</span>
                          <span className="font-bold text-gray-900">{donor.fullName}</span>
                        </div>
                        <p className="text-gray-600 text-[11px] mb-2">City: {donor.city} • Age: {donor.age}</p>
                        <button onClick={() => props.onContactDonor(donor)} className="w-full bg-[#E63946] hover:bg-red-700 text-white font-semibold py-1.5 rounded transition duration-200 text-[11px]">
                          Contact Donor
                        </button>
                      </div>
                    </InfoWindow>
                 )}
              </AdvancedMarker>
            );
          })}

          {/* Emergencies */}
          {props.emergencies.filter(e => e.status === "Active").map(req => {
            const { lat, lng } = req.location;
            if (!lat || !lng) return null;
            const urgencyColor = req.urgencyLevel === "Critical" ? "#EF4444" : req.urgencyLevel === "Urgent" ? "#F59E0B" : "#10B981";
            return (
              <AdvancedMarker 
                key={req.requestId} 
                position={{ lat, lng }}
                onClick={() => setActiveMarker(req.requestId)}
              >
                <div className="relative flex items-center justify-center animate-pulse duration-1000" style={{ width: "38px", height: "38px" }}>
                  <div className="absolute inset-0 rounded-full opacity-25 scale-125 animate-ping" style={{ backgroundColor: urgencyColor }}></div>
                  <div className="flex items-center justify-center rounded-lg border-2 border-white shadow-xl text-white font-extrabold"
                       style={{ backgroundColor: urgencyColor, width: "28px", height: "28px", fontFamily: "'Syne', sans-serif", fontSize: "11px" }}>
                    SOS
                  </div>
                </div>
                {activeMarker === req.requestId && (
                  <InfoWindow position={{lat, lng}} onCloseClick={() => setActiveMarker(null)} headerDisabled={true}>
                    <div className="p-1 font-sans text-xs min-w-[200px] text-black">
                      <div className="mb-1.5 flex items-center gap-1.5 justify-between">
                        <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded" style={{ backgroundColor: urgencyColor + "44", color: urgencyColor }}>
                          {req.urgencyLevel} SOS
                        </span>
                      </div>
                      <h4 className="font-bold text-gray-900 text-sm mb-1">{req.hospitalName}</h4>
                      <p className="text-[11px] text-gray-600 mb-2">{req.hospitalAddress}</p>
                      <button onClick={() => props.onContactRequester(req)} className="w-full bg-gray-900 hover:bg-black text-white font-semibold py-1.5 rounded transition duration-200 text-[11px]">
                        Respond to Request
                      </button>
                    </div>
                  </InfoWindow>
                )}
              </AdvancedMarker>
            );
          })}
        </GoogleMap>
      </APIProvider>
    </div>
  );
}
`;

code = code + newMapContainer;

fs.writeFileSync('src/components/MapContainer.tsx', code);
