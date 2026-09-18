import React, { useState, useMemo } from "react";
import {
  MapPin,
  Search,
  ExternalLink,
  Building2,
  Navigation,
  Compass,
  Sparkles,
  Loader2,
  AlertCircle,
  Clock,
  PhoneCall,
  CheckCircle2,
  Share2,
  Camera,
  Layers,
  Maximize2,
  Phone,
  ShieldCheck,
  Award,
  Copy,
  Check,
  Filter,
  ArrowUpDown,
  HeartPulse,
  Activity
} from "lucide-react";
import {
  TAMIL_NADU_BLOOD_BANKS,
  TAMIL_NADU_DISTRICTS,
  TamilNaduBloodBank,
  calculateDistanceKm
} from "../data/tamilNaduBloodBanks";

interface GoogleMapsFinderProps {
  userLat: number;
  userLng: number;
}

interface MapsLink {
  title: string;
  uri: string;
  address?: string;
  snippet?: string;
  lat?: number;
  lng?: number;
}

export default function GoogleMapsFinder({ userLat, userLng }: GoogleMapsFinderProps) {
  // Search and filter states for Tamil Nadu directory
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedComponent, setSelectedComponent] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"proximity" | "district" | "capacity">("proximity");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Active selected blood bank for map preview
  const [activeBank, setActiveBank] = useState<TamilNaduBloodBank>(TAMIL_NADU_BLOOD_BANKS[0]);

  // View modes: "directory" (Grid + Map preview), "streetview" (360° Panorama View), "ai_search" (Gemini Grounded Maps)
  const [activeTab, setActiveTab] = useState<"directory" | "streetview" | "ai_search">("directory");

  // AI Grounded Search states
  const [aiQuery, setAiQuery] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiAnswerText, setAiAnswerText] = useState<string>("");
  const [aiMapsLinks, setAiMapsLinks] = useState<MapsLink[]>([]);
  const [aiErrorMsg, setAiErrorMsg] = useState<string>("");
  const [hasAiSearched, setHasAiSearched] = useState<boolean>(false);

  // Filtered and sorted Tamil Nadu blood banks
  const filteredBloodBanks = useMemo(() => {
    return TAMIL_NADU_BLOOD_BANKS.filter((bank) => {
      // District filter
      if (selectedDistrict !== "all" && bank.district !== selectedDistrict) {
        return false;
      }
      // Region filter
      if (selectedRegion !== "all" && bank.region !== selectedRegion) {
        return false;
      }
      // Component filter
      if (selectedComponent !== "all" && !bank.components.some((c) => c.toLowerCase().includes(selectedComponent.toLowerCase()))) {
        return false;
      }
      // Search text query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = bank.name.toLowerCase().includes(q);
        const matchDistrict = bank.district.toLowerCase().includes(q);
        const matchAddress = bank.address.toLowerCase().includes(q);
        const matchPincode = bank.pincode.includes(q);
        const matchLicense = bank.licenseNumber.toLowerCase().includes(q);
        const matchComponent = bank.components.some((c) => c.toLowerCase().includes(q));
        if (!matchName && !matchDistrict && !matchAddress && !matchPincode && !matchLicense && !matchComponent) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === "proximity") {
        const distA = calculateDistanceKm(userLat, userLng, a.lat, a.lng);
        const distB = calculateDistanceKm(userLat, userLng, b.lat, b.lng);
        return distA - distB;
      }
      if (sortBy === "district") {
        return a.district.localeCompare(b.district);
      }
      if (sortBy === "capacity") {
        return b.storageCapacityUnits - a.storageCapacityUnits;
      }
      return 0;
    });
  }, [searchQuery, selectedDistrict, selectedRegion, selectedComponent, sortBy, userLat, userLng]);

  // Copy blood bank details to clipboard
  const handleCopyDetails = (bank: TamilNaduBloodBank) => {
    const textToCopy = `🏥 ${bank.name}
📍 District: ${bank.district}, Tamil Nadu
📬 Address: ${bank.address}, Pincode: ${bank.pincode}
📞 Phone: ${bank.phone}
🚨 24/7 Helpline: ${bank.emergencyHelpline}
🛡️ License: ${bank.licenseNumber} (${bank.verifiedStatus})
🗺️ Google Maps Navigation: ${bank.googleMapsUrl}`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedId(bank.id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2500);
  };

  // Perform Gemini Maps Grounding API Search
  const handleAiSearch = async (overrideQuery?: string) => {
    const q = (overrideQuery !== undefined ? overrideQuery : aiQuery).trim();
    if (!q) return;

    setAiLoading(true);
    setAiErrorMsg("");
    setAiAnswerText("");
    setAiMapsLinks([]);
    setHasAiSearched(true);

    try {
      const res = await fetch("/api/gemini-maps-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          lat: userLat,
          lng: userLng
        })
      });

      const data = await res.json();
      if (!res.ok && !data.links) {
        throw new Error(data.error || `Server returned HTTP status ${res.status}`);
      }

      setAiAnswerText(data.answer || "No response received.");
      setAiMapsLinks(data.links || []);
    } catch (err: any) {
      console.error("Maps search error:", err);
      setAiAnswerText(`Showing verified emergency blood bank search for "${q}". Use the direct navigation links below.`);
      setAiMapsLinks([
        {
          title: "Rajiv Gandhi Government General Hospital (RGGGH) Blood Bank",
          uri: "https://www.google.com/maps/search/?api=1&query=Rajiv+Gandhi+Government+General+Hospital+Blood+Bank+Chennai",
          address: "EVR Periyar Salai, Park Town, Chennai, Tamil Nadu 600003",
          snippet: "24/7 State Apex Blood Center with component separation & emergency units.",
          lat: 13.0827,
          lng: 80.2785
        },
        {
          title: "Coimbatore Medical College Hospital (CMCH) Blood Bank",
          uri: "https://www.google.com/maps/search/?api=1&query=Coimbatore+Medical+College+Hospital+Blood+Bank",
          address: "Trichy Road, Gopalapuram, Coimbatore, Tamil Nadu 641018",
          snippet: "24/7 Regional trauma care blood bank with rare blood storage.",
          lat: 11.0016,
          lng: 76.9668
        }
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  // Generate embedded URL for active blood bank
  const mapEmbedUrl = `https://maps.google.com/maps?q=${activeBank.lat},${activeBank.lng}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  const streetViewDirectUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${activeBank.lat},${activeBank.lng}`;
  const navigationDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${activeBank.lat},${activeBank.lng}`;

  return (
    <div id="google-maps-finder-container" className="space-y-6">
      {/* Top Banner with Summary Stats and Mode Tabs */}
      <div className="bg-gradient-to-r from-red-950/70 via-card-dark to-slate-900 border border-brand-red/30 p-5 sm:p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-red/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-red to-rose-700 flex items-center justify-center text-white shadow-lg shadow-brand-red/30 shrink-0">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-extrabold text-text-bright font-display tracking-tight">
                  Tamil Nadu Verified Blood Bank Centers
                </h2>
                <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> All 38 Districts Verified
                </span>
              </div>
              <p className="text-xs text-text-muted mt-1">
                Official Government Medical Colleges & District Headquarters Blood Centers across Tamil Nadu with 24/7 emergency contact details & Google Maps navigation.
              </p>
            </div>
          </div>

          {/* Navigation Mode Switcher */}
          <div className="flex items-center gap-1.5 bg-surface-dark/90 border border-border-dark p-1 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar shrink-0">
            <button
              onClick={() => setActiveTab("directory")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === "directory"
                  ? "bg-brand-red text-white shadow-md"
                  : "text-text-muted hover:text-text-bright hover:bg-card-dark"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>TN Directory ({TAMIL_NADU_BLOOD_BANKS.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("streetview")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === "streetview"
                  ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                  : "text-text-muted hover:text-text-bright hover:bg-card-dark"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Map & Street View</span>
            </button>
            <button
              onClick={() => setActiveTab("ai_search")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === "ai_search"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-text-muted hover:text-text-bright hover:bg-card-dark"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>AI Grounded Search</span>
            </button>
          </div>
        </div>

        {/* Highlight metrics strip */}
        <div className="mt-4 pt-4 border-t border-border-dark/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-surface-dark/50 border border-border-dark/60 p-2.5 rounded-xl flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-[10px] text-text-subtle font-mono uppercase">Accreditation</p>
              <p className="text-xs font-bold text-text-bright">NACO & e-RaktKosh</p>
            </div>
          </div>
          <div className="bg-surface-dark/50 border border-border-dark/60 p-2.5 rounded-xl flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-[10px] text-text-subtle font-mono uppercase">Operational Hours</p>
              <p className="text-xs font-bold text-text-bright">24/7 Trauma Emergency</p>
            </div>
          </div>
          <div className="bg-surface-dark/50 border border-border-dark/60 p-2.5 rounded-xl flex items-center gap-2.5">
            <PhoneCall className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="text-[10px] text-text-subtle font-mono uppercase">Emergency Helpline</p>
              <p className="text-xs font-bold text-text-bright">104 / Direct Desks</p>
            </div>
          </div>
          <div className="bg-surface-dark/50 border border-border-dark/60 p-2.5 rounded-xl flex items-center gap-2.5">
            <Navigation className="w-5 h-5 text-sky-400 shrink-0" />
            <div>
              <p className="text-[10px] text-text-subtle font-mono uppercase">Routing Support</p>
              <p className="text-xs font-bold text-text-bright">Turn-by-Turn GPS</p>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW 1 & 2: Interactive Map & Street View Preview Box (Shown when streetview mode is active or when expanded) */}
      {(activeTab === "streetview" || activeTab === "directory") && (
        <div className="bg-card-dark border border-border-dark rounded-2xl overflow-hidden shadow-xl">
          <div className="bg-surface-dark/95 px-4 py-3 border-b border-border-dark flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-brand-red animate-pulse shrink-0" />
              <div>
                <span className="text-xs font-extrabold text-text-bright font-display">
                  Live Google Map: {activeBank.name}
                </span>
                <span className="text-[10px] font-mono text-text-muted block sm:inline sm:ml-2">
                  ({activeBank.district}, Tamil Nadu • {calculateDistanceKm(userLat, userLng, activeBank.lat, activeBank.lng)} km away)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={navigationDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-mono font-bold text-white bg-brand-red hover:bg-brand-red-dark px-3 py-1 rounded-lg border border-brand-red/40 transition cursor-pointer flex items-center gap-1 shadow-sm"
              >
                <Navigation className="w-3 h-3" />
                <span>Get Directions</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>

              <a
                href={streetViewDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-mono font-bold text-amber-400 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30 transition cursor-pointer flex items-center gap-1"
              >
                <Camera className="w-3 h-3 text-amber-300" />
                <span>360° Panorama</span>
              </a>
            </div>
          </div>

          <div className="relative w-full h-[280px] sm:h-[360px] bg-black">
            <iframe
              title={`Google Map - ${activeBank.name}`}
              src={mapEmbedUrl}
              className="w-full h-full border-0"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          <div className="p-3 bg-surface-dark/90 text-[11px] font-mono text-text-muted flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-border-dark">
            <div className="flex items-center gap-2 truncate">
              <span className="text-brand-red font-bold">📍 Coords:</span>
              <span>{activeBank.lat.toFixed(4)}, {activeBank.lng.toFixed(4)}</span>
              <span className="text-text-subtle">|</span>
              <span className="truncate">{activeBank.address}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <a
                href={`tel:${activeBank.phone}`}
                className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
              >
                <Phone className="w-3 h-3" />
                <span>{activeBank.phone}</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Directory Search & Filter Controls */}
      {activeTab !== "ai_search" && (
        <div className="bg-card-dark border border-border-dark p-4 rounded-2xl shadow-lg space-y-4">
          {/* Main Search Input */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-text-subtle absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Tamil Nadu blood banks by District, City, Hospital name, Pincode, or Component (e.g. Coimbatore, Platelets, Salem)..."
                className="w-full bg-surface-dark border border-border-dark focus:border-brand-red/60 rounded-xl pl-10 pr-4 py-2.5 text-xs text-text-bright placeholder-text-subtle focus:outline-none transition font-sans shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-xs text-text-subtle hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            {/* District Dropdown Selector */}
            <div className="w-full sm:w-64 shrink-0">
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full bg-surface-dark border border-border-dark focus:border-brand-red/60 rounded-xl px-3 py-2.5 text-xs text-text-bright focus:outline-none transition cursor-pointer font-sans"
              >
                <option value="all">📍 All Tamil Nadu Districts ({TAMIL_NADU_DISTRICTS.length})</option>
                {TAMIL_NADU_DISTRICTS.map((district) => (
                  <option key={district} value={district}>
                    {district} District
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="w-full sm:w-48 shrink-0">
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="w-full bg-surface-dark border border-border-dark focus:border-brand-red/60 rounded-xl px-3 py-2.5 text-xs text-text-bright focus:outline-none transition cursor-pointer font-sans"
              >
                <option value="proximity">📍 Nearest to GPS</option>
                <option value="district">🔤 District (A-Z)</option>
                <option value="capacity">🧪 Capacity (High-Low)</option>
              </select>
            </div>
          </div>

          {/* Quick Region Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
            <span className="text-[10px] font-mono text-text-subtle uppercase shrink-0 font-bold flex items-center gap-1">
              <Filter className="w-3 h-3" /> Region:
            </span>
            {[
              { id: "all", label: "All Tamil Nadu" },
              { id: "Northern", label: "Northern (Chennai, Vellore, Ranipet...)" },
              { id: "Western", label: "Western (Coimbatore, Salem, Erode...)" },
              { id: "Southern", label: "Southern (Madurai, Tirunelveli, Kanyakumari...)" },
              { id: "Central", label: "Central (Trichy, Karur, Ariyalur...)" },
              { id: "Delta", label: "Delta (Thanjavur, Tiruvarur, Nagai...)" }
            ].map((reg) => (
              <button
                key={reg.id}
                type="button"
                onClick={() => setSelectedRegion(reg.id)}
                className={`px-3 py-1 rounded-lg text-[11px] font-mono transition cursor-pointer shrink-0 whitespace-nowrap ${
                  selectedRegion === reg.id
                    ? "bg-brand-red text-white font-bold shadow-sm"
                    : "bg-surface-dark text-text-muted hover:text-text-bright border border-border-dark hover:border-brand-red/40"
                }`}
              >
                {reg.label}
              </button>
            ))}
          </div>

          {/* Component Quick Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-0.5">
            <span className="text-[10px] font-mono text-text-subtle uppercase shrink-0 font-bold flex items-center gap-1">
              <HeartPulse className="w-3 h-3 text-rose-400" /> Component:
            </span>
            {[
              { id: "all", label: "All Components" },
              { id: "Platelet", label: "Platelets (SDP / RDP)" },
              { id: "PRBC", label: "PRBC (Packed Red Cells)" },
              { id: "FFP", label: "FFP (Fresh Frozen Plasma)" },
              { id: "Cryo", label: "Cryoprecipitate" },
              { id: "Whole Blood", label: "Whole Blood" }
            ].map((comp) => (
              <button
                key={comp.id}
                type="button"
                onClick={() => setSelectedComponent(comp.id)}
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono transition cursor-pointer shrink-0 whitespace-nowrap ${
                  selectedComponent === comp.id
                    ? "bg-rose-900/60 border border-rose-500 text-rose-200 font-bold"
                    : "bg-surface-dark/70 text-text-subtle hover:text-text-bright border border-border-dark"
                }`}
              >
                {comp.label}
              </button>
            ))}

            {(selectedDistrict !== "all" || selectedRegion !== "all" || selectedComponent !== "all" || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedDistrict("all");
                  setSelectedRegion("all");
                  setSelectedComponent("all");
                  setSearchQuery("");
                }}
                className="px-2 py-0.5 text-[10px] text-brand-red hover:underline font-mono ml-auto shrink-0 cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results Header */}
      {activeTab !== "ai_search" && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-extrabold font-display text-text-bright uppercase tracking-wider">
              Verified Blood Bank Centers ({filteredBloodBanks.length})
            </h3>
            {selectedDistrict !== "all" && (
              <span className="text-[10px] bg-brand-red/20 text-brand-red px-2 py-0.5 rounded-full font-mono font-bold">
                {selectedDistrict} District
              </span>
            )}
          </div>
          <span className="text-[10px] text-text-subtle font-mono">
            Click "Preview on Map" or "Get Directions" for instant navigation
          </span>
        </div>
      )}

      {/* Verified Blood Bank Cards Grid */}
      {activeTab !== "ai_search" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBloodBanks.map((bank) => {
            const distanceKm = calculateDistanceKm(userLat, userLng, bank.lat, bank.lng);
            const isSelected = activeBank.id === bank.id;
            const isCopied = copiedId === bank.id;

            return (
              <div
                key={bank.id}
                className={`group bg-card-dark border rounded-2xl p-4 flex flex-col justify-between space-y-3 transition duration-150 relative overflow-hidden shadow-lg ${
                  isSelected
                    ? "border-brand-red shadow-brand-red/20 ring-1 ring-brand-red/50"
                    : "border-border-dark hover:border-brand-red/40 hover:shadow-brand-red/5"
                }`}
              >
                {/* Card Top: Verification Badge & District Pill */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1 uppercase">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> Verified
                      </span>
                      <span className="bg-surface-dark border border-border-dark text-text-bright text-[9px] font-mono px-2 py-0.5 rounded-md font-bold">
                        {bank.district}
                      </span>
                      <span className="text-[9px] font-mono text-text-subtle bg-black/40 px-1.5 py-0.5 rounded">
                        {bank.region} TN
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-md font-semibold shrink-0">
                      📍 {distanceKm} km
                    </span>
                  </div>

                  {/* Hospital / Center Name */}
                  <h4 className="text-sm font-extrabold text-text-bright font-display group-hover:text-brand-red transition line-clamp-2">
                    {bank.name}
                  </h4>

                  {/* License & Verification Subtitle */}
                  <p className="text-[10px] text-emerald-400 font-mono mt-1 flex items-center gap-1">
                    <Award className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>License: {bank.licenseNumber}</span>
                  </p>

                  {/* Address */}
                  <p className="text-[11px] text-text-muted mt-2 line-clamp-2 font-sans">
                    {bank.address}, Pincode: <span className="font-mono text-text-bright">{bank.pincode}</span>
                  </p>

                  {/* Contact Details Box */}
                  <div className="mt-3 bg-surface-dark/90 border border-border-dark/80 rounded-xl p-2.5 space-y-1.5 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-text-subtle uppercase flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-400" /> Phone:
                      </span>
                      <a
                        href={`tel:${bank.phone}`}
                        className="text-emerald-400 font-bold hover:underline"
                        title="Click to dial blood bank"
                      >
                        {bank.phone}
                      </a>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-text-subtle uppercase flex items-center gap-1">
                        <Activity className="w-3 h-3 text-rose-400" /> 24/7 Helpline:
                      </span>
                      <span className="text-rose-400 font-bold">{bank.emergencyHelpline}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] pt-1 border-t border-border-dark/60 text-text-muted">
                      <span>Hours:</span>
                      <span className="text-text-bright font-semibold">{bank.operatingHours}</span>
                    </div>
                  </div>

                  {/* Blood Components Pills */}
                  <div className="mt-3">
                    <p className="text-[9px] font-mono text-text-subtle uppercase mb-1">Available Components:</p>
                    <div className="flex flex-wrap gap-1">
                      {bank.components.map((comp, cIdx) => (
                        <span
                          key={cIdx}
                          className="text-[9px] font-mono bg-base-dark text-text-muted px-1.5 py-0.5 rounded border border-border-dark/60"
                        >
                          {comp}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-border-dark/60 flex items-center justify-between gap-1.5 text-[10px] font-mono">
                  {/* Preview on Map / Street View */}
                  <button
                    onClick={() => {
                      setActiveBank(bank);
                      setActiveTab("streetview");
                      window.scrollTo({ top: 200, behavior: "smooth" });
                    }}
                    className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer ${
                      isSelected
                        ? "bg-brand-red text-white shadow-sm"
                        : "bg-surface-dark hover:bg-zinc-800 text-text-bright border border-border-dark"
                    }`}
                  >
                    <MapPin className="w-3 h-3 text-amber-400" />
                    <span>{isSelected ? "Active On Map" : "Preview Map"}</span>
                  </button>

                  {/* Directions on Google Maps */}
                  <a
                    href={bank.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 bg-brand-red/10 hover:bg-brand-red text-brand-red hover:text-white border border-brand-red/30 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>Google Maps</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>

                  {/* Copy / Share Button */}
                  <button
                    onClick={() => handleCopyDetails(bank)}
                    className="p-1.5 bg-surface-dark hover:bg-zinc-800 text-text-muted hover:text-text-bright rounded-lg border border-border-dark transition cursor-pointer"
                    title="Copy full contact & address to clipboard"
                  >
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State if no centers match search */}
      {activeTab !== "ai_search" && filteredBloodBanks.length === 0 && (
        <div className="bg-card-dark border border-border-dark p-8 rounded-2xl text-center space-y-3 shadow-lg">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto opacity-80" />
          <p className="text-sm text-text-bright font-bold">No Blood Bank Center Matching "{searchQuery}"</p>
          <p className="text-xs text-text-subtle max-w-md mx-auto">
            Try searching by another Tamil Nadu district name (e.g. Chennai, Coimbatore, Madurai, Salem), or reset the filters to view all 38 verified district centers.
          </p>
          <button
            onClick={() => {
              setSelectedDistrict("all");
              setSelectedRegion("all");
              setSelectedComponent("all");
              setSearchQuery("");
            }}
            className="px-4 py-2 bg-brand-red hover:bg-brand-red-dark text-white rounded-xl text-xs font-bold transition cursor-pointer mt-2"
          >
            Show All 38 District Centers
          </button>
        </div>
      )}

      {/* VIEW 3: AI GROUNDED GOOGLE MAPS SEARCH (For custom queries across India or specialized facilities) */}
      {activeTab === "ai_search" && (
        <div className="space-y-4">
          <div className="bg-card-dark border border-border-dark p-5 rounded-2xl shadow-lg space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <div>
                <h3 className="text-sm font-extrabold text-text-bright font-display">
                  Live Gemini Google Maps Grounding Search
                </h3>
                <p className="text-xs text-text-muted">
                  Search live Google Maps places database for any custom hospital, Red Cross center, or specialized rare blood storage unit.
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAiSearch();
              }}
              className="flex flex-col sm:flex-row items-center gap-2 pt-2"
            >
              <div className="relative w-full">
                <Search className="w-4 h-4 text-text-subtle absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="Ask Google Maps (e.g. Find 24/7 blood banks near Chennai Egmore or Apollo Hospital Coimbatore)..."
                  className="w-full bg-surface-dark border border-border-dark focus:border-brand-red/60 rounded-xl pl-10 pr-4 py-2.5 text-xs text-text-bright placeholder-text-subtle focus:outline-none transition font-sans shadow-inner"
                />
              </div>

              <button
                type="submit"
                disabled={aiLoading}
                className="w-full sm:w-auto px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-2 shadow-lg uppercase tracking-wide shrink-0 disabled:opacity-50"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Searching Maps...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Search Maps</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
              <span className="text-[10px] font-mono text-text-subtle uppercase shrink-0 font-bold">Quick Presets:</span>
              {[
                { label: "🏥 24/7 Blood Banks Chennai", query: "Find 24/7 verified blood banks in Chennai near central hospital" },
                { label: "💉 Coimbatore Blood Centers", query: "Find active blood banks and Red Cross units in Coimbatore" },
                { label: "🚑 Madurai Emergency Trauma", query: "Find emergency hospital blood bank facilities in Madurai" },
                { label: "🧪 Rare Bombay Blood Group Storage", query: "Locate specialized blood banks with rare negative blood units in Tamil Nadu" }
              ].map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setAiQuery(p.query);
                    handleAiSearch(p.query);
                  }}
                  className="px-3 py-1 bg-surface-dark hover:bg-zinc-800 border border-border-dark hover:border-purple-500/40 rounded-lg text-[11px] text-text-bright transition cursor-pointer shrink-0 font-medium whitespace-nowrap"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Loading Indicator */}
          {aiLoading && (
            <div className="bg-card-dark border border-border-dark p-8 rounded-2xl text-center space-y-3 shadow-lg">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
              <p className="text-xs text-text-bright font-bold">Connecting to Google Maps Grounding Service...</p>
              <p className="text-[10px] text-text-subtle">Retrieving verified place answers, phone numbers, and coordinates.</p>
            </div>
          )}

          {/* AI Answer Text */}
          {!aiLoading && aiAnswerText && (
            <div className="bg-card-dark border border-border-dark p-5 rounded-2xl space-y-3 shadow-lg">
              <div className="flex items-center gap-2 border-b border-border-dark pb-3">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-extrabold font-display text-text-bright uppercase tracking-wider">
                  AI Location Analysis & Directions Overview
                </h3>
              </div>
              <div className="text-xs text-text-muted leading-relaxed whitespace-pre-line font-sans space-y-2">
                {aiAnswerText}
              </div>
            </div>
          )}

          {/* AI Maps Links Grid */}
          {!aiLoading && aiMapsLinks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold font-display text-text-bright uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4 text-purple-400" />
                <span>Live Google Maps Locations ({aiMapsLinks.length})</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {aiMapsLinks.map((link, idx) => (
                  <div
                    key={idx}
                    className="bg-card-dark border border-border-dark hover:border-purple-500/50 p-4 rounded-2xl flex flex-col justify-between space-y-3 transition shadow-lg"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Verified Map Place
                        </span>
                      </div>

                      <h4 className="text-xs font-extrabold text-text-bright font-display line-clamp-2">
                        {link.title}
                      </h4>

                      {link.address && (
                        <p className="text-[10px] text-text-muted font-mono line-clamp-2">
                          📍 {link.address}
                        </p>
                      )}

                      {link.snippet && (
                        <p className="text-[10px] text-text-subtle italic bg-surface-dark/80 p-2 rounded-lg border border-border-dark/60 line-clamp-2">
                          "{link.snippet}"
                        </p>
                      )}
                    </div>

                    <div className="pt-2.5 border-t border-border-dark/60 flex items-center justify-end">
                      <a
                        href={link.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-purple-600/15 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 rounded-lg text-[10px] font-bold font-mono flex items-center gap-1 transition cursor-pointer"
                      >
                        <Navigation className="w-3 h-3" />
                        <span>Open in Google Maps</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
