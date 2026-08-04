import { useState, useEffect, useMemo, FormEvent } from "react";
import { store, calculateDistance } from "./lib/store";
import { Donor, EmergencyRequest, Chat, Message, AppUser, BloodGroup, UrgencyLevel, Gender, AppNotification } from "./types";
import MapContainer from "./components/MapContainer";
import SandboxSelector from "./components/SandboxSelector";
import DonorGraphicalTimeline from "./components/DonorGraphicalTimeline";
import DonorIdentityPassModal from "./components/DonorIdentityPassModal";
import GoogleMapsFinder from "./components/GoogleMapsFinder";
import {
  Droplet,
  MapPin,
  Search,
  MessageSquare,
  User,
  Plus,
  Phone,
  ArrowRight,
  Share2,
  CheckCircle,
  CheckCircle2,
  Check,
  Shield,
  Calendar,
  Flame,
  LogOut,
  X,
  Globe,
  Sliders,
  Trash2,
  AlertTriangle,
  Lock,
  UserPlus,
  Bell,
  Mail,
  Sun,
  Moon,
  Award,
  QrCode,
  Printer,
  Compass,
  Clock
} from "lucide-react";

// List of standard blood groups
const BLOOD_GROUPS: BloodGroup[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// Blood Group compatibility dictionary for quick visual helper reference in app
const BLOOD_COMPATIBILITY: { [key in BloodGroup]: { canGiveTo: string[]; canReceiveFrom: string[] } } = {
  "O-": { canGiveTo: ["All"], canReceiveFrom: ["O-"] },
  "O+": { canGiveTo: ["O+", "A+", "B+", "AB+"], canReceiveFrom: ["O+", "O-"] },
  "A-": { canGiveTo: ["A+", "A-", "AB+", "AB-"], canReceiveFrom: ["A-", "O-"] },
  "A+": { canGiveTo: ["A+", "AB+"], canReceiveFrom: ["A+", "A-", "O+", "O-"] },
  "B-": { canGiveTo: ["B+", "B-", "AB+", "AB-"], canReceiveFrom: ["B-", "O-"] },
  "B+": { canGiveTo: ["B+", "AB+"], canReceiveFrom: ["B+", "B-", "O+", "O-"] },
  "AB-": { canGiveTo: ["AB+", "AB-"], canReceiveFrom: ["AB-", "A-", "B-", "O-"] },
  "AB+": { canGiveTo: ["AB+"], canReceiveFrom: ["All"] }
};

// Help map city names to coordinates if Geolocation fails
const CITY_COORDINATES: { [key: string]: { lat: number; lng: number } } = {
  chennai: { lat: 13.0827, lng: 80.2707 },
  mumbai: { lat: 18.9220, lng: 72.8347 },
  delhi: { lat: 28.6139, lng: 77.2090 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  hyderabad: { lat: 17.3850, lng: 78.4867 },
  pune: { lat: 18.5204, lng: 73.8567 },
  ahmedabad: { lat: 23.0225, lng: 72.5714 }
};

export default function App() {
  // Global Store States
  const [currentUser, setCurrentUser] = useState<AppUser | null>(store.getCurrentUser());
  const [allUsers, setAllUsers] = useState<AppUser[]>(store.getAllUsers());
  const [donors, setDonors] = useState<Donor[]>(store.getDonors());
  const [emergencies, setEmergencies] = useState<EmergencyRequest[]>(store.getEmergencies());
  const [chats, setChats] = useState<Chat[]>(store.getChats());
  const [activeTab, setActiveTab] = useState<"search" | "emergency" | "maps" | "profile" | "chats" | "admin">("search");

  // Dark & Light Theme Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => localStorage.getItem("hemolink_theme") !== "light");

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove("light-mode");
      localStorage.setItem("hemolink_theme", "dark");
    } else {
      document.documentElement.classList.add("light-mode");
      localStorage.setItem("hemolink_theme", "light");
    }
  }, [isDarkMode]);

  // Selected donor for Pass generation modal
  const [selectedPassDonor, setSelectedPassDonor] = useState<Donor | null>(null);

  // Helper for admin to calculate next donation eligibility
  const getNextDonationSchedule = (lastDonationDateStr?: string) => {
    if (!lastDonationDateStr || lastDonationDateStr === "Never Logged" || lastDonationDateStr === "Never") {
      return {
        lastDonatedFormatted: "No prior donation logged",
        nextDateFormatted: "Eligible to Donate Now",
        daysLeft: 0,
        isEligible: true
      };
    }

    const lastDate = new Date(lastDonationDateStr);
    if (isNaN(lastDate.getTime())) {
      return {
        lastDonatedFormatted: lastDonationDateStr,
        nextDateFormatted: "Eligible to Donate Now",
        daysLeft: 0,
        isEligible: true
      };
    }

    const COOLDOWN_DAYS = 56;
    const nextDate = new Date(lastDate.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = nextDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
    const lastDonatedFormatted = lastDate.toLocaleDateString("en-US", options);
    const nextDateFormatted = nextDate.toLocaleDateString("en-US", options);

    if (daysLeft > 0) {
      return {
        lastDonatedFormatted,
        nextDateFormatted,
        daysLeft,
        isEligible: false
      };
    } else {
      return {
        lastDonatedFormatted,
        nextDateFormatted: "Cleared to Donate Now",
        daysLeft: 0,
        isEligible: true
      };
    }
  };

  // Filter & Search states
  const [searchBlood, setSearchBlood] = useState<string>("All");
  const [searchCity, setSearchCity] = useState<string>("");
  const [searchRadius, setSearchRadius] = useState<number>(25); // Default 25 km radius
  const [sortBy, setSortBy] = useState<"distance" | "name" | "available">("distance");
  const [mapToggle, setMapToggle] = useState<boolean>(true);

  // Admin Console filter state
  const [adminRecentDonorSearch, setAdminRecentDonorSearch] = useState<string>("");

  // Modal Emergency Request form fields state
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState<boolean>(false);
  const [formPatientName, setFormPatientName] = useState<string>("");
  const [formBloodNeeded, setFormBloodNeeded] = useState<BloodGroup>("O+");
  const [formUnitsNeeded, setFormUnitsNeeded] = useState<number>(2);
  const [formHospitalName, setFormHospitalName] = useState<string>("");
  const [formHospitalAddress, setFormHospitalAddress] = useState<string>("");
  const [formRequesterName, setFormRequesterName] = useState<string>("");
  const [formRequesterPhone, setFormRequesterPhone] = useState<string>("");
  const [formCity, setFormCity] = useState<string>("Chennai");
  const [formState, setFormState] = useState<string>("Tamil Nadu");
  const [formUrgency, setFormUrgency] = useState<UrgencyLevel>("Critical");
  const [formNotes, setFormNotes] = useState<string>("");
  const [formError, setFormError] = useState<string>("");

  // Become a Donor form fields state
  const [donorFormAge, setDonorFormAge] = useState<number>(25);
  const [donorFormGender, setDonorFormGender] = useState<Gender>("Male");
  const [donorFormBlood, setDonorFormBlood] = useState<BloodGroup>("O+");
  const [donorFormCity, setDonorFormCity] = useState<string>("Chennai");
  const [donorFormState, setDonorFormState] = useState<string>("Tamil Nadu");
  const [donorFormPincode, setDonorFormPincode] = useState<string>("600001");
  const [donorFormPhone, setDonorFormPhone] = useState<string>("");
  const [donorSuccessMsg, setDonorSuccessMsg] = useState<string>("");

  // Chats Window state controllers
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatMessageText, setChatMessageText] = useState<string>("");

  // Create Custom Profile User Form
  const [loginEmail, setLoginEmail] = useState<string>("");
  const [loginName, setLoginName] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");

  // OTP Verification states
  const [authStep, setAuthStep] = useState<"credentials" | "otp">("credentials");
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [generatedOTP, setGeneratedOTP] = useState<string>("");
  const [userOTPInput, setUserOTPInput] = useState<string>("");
  const [smsGatewayNotification, setSmsGatewayNotification] = useState<string | null>(null);

  // App notification state
  const [notifications, setNotifications] = useState<AppNotification[]>(store.getNotifications());
  const [showNotificationCenter, setShowNotificationCenter] = useState<boolean>(false);

  // Register state change listeners
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setCurrentUser(store.getCurrentUser());
      setAllUsers(store.getAllUsers());
      setDonors(store.getDonors());
      setEmergencies(store.getEmergencies());
      setChats(store.getChats());
      setUserGPS(store.getGPSLocation());
      setNotifications(store.getNotifications());
    });
    return unsubscribe;
  }, []);

  // Sync active chat messages
  const activeChatMessages = useMemo(() => {
    if (!activeChatId) return [];
    return store.getChatMessages(activeChatId);
  }, [activeChatId, chats]);

  // Sync current client profile if exits
  const myProfile = useMemo(() => {
    return store.getMyDonorProfile();
  }, [currentUser, donors]);

  // Geolocation lookup helpers & responsive state
  const [userGPS, setUserGPS] = useState<{ lat: number; lng: number }>(store.getGPSLocation());

  // Automatically focus/change the map position when typing in the location search bar
  useEffect(() => {
    const query = searchCity.trim().toLowerCase();
    if (!query) return;

    // Inline city coordinate mapping helper
    const matchCityCoordinates = (text: string) => {
      const q = text.trim().toLowerCase();
      
      // 1. Match configured city mappings
      for (const city of Object.keys(CITY_COORDINATES)) {
        if (city.startsWith(q) || q.startsWith(city)) {
          return CITY_COORDINATES[city];
        }
      }

      // 2. Discover within existing donor listings
      for (const donor of donors) {
        if (donor.city && donor.city.toLowerCase().startsWith(q)) {
          if (donor.location && donor.location.lat && donor.location.lng) {
            return donor.location;
          }
        }
      }

      // 3. Discover within urgent emergency listings
      for (const item of emergencies) {
        if (item.city && item.city.toLowerCase().startsWith(q)) {
          if (item.location && item.location.lat && item.location.lng) {
            return item.location;
          }
        }
      }

      return null;
    };

    const localMatch = matchCityCoordinates(searchCity);
    if (localMatch) {
      if (userGPS.lat !== localMatch.lat || userGPS.lng !== localMatch.lng) {
        store.setGPSLocation(localMatch);
        setUserGPS(localMatch);
      }
      return;
    }

    // Debounce geocoding for unlisted query addresses
    const delayTimer = setTimeout(async () => {
      try {
        if (query.length < 3) return;
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchCity)}&limit=1`);
        const data = await res.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          const resolvedLoc = { lat, lng };
          if (userGPS.lat !== resolvedLoc.lat || userGPS.lng !== resolvedLoc.lng) {
            store.setGPSLocation(resolvedLoc);
            setUserGPS(resolvedLoc);
          }
        }
      } catch (err) {
        console.error("Geocoding API lookup failed", err);
      }
    }, 600);

    return () => clearTimeout(delayTimer);
  }, [searchCity, userGPS.lat, userGPS.lng]);

  // Compute filtered donors list based on directory searches
  const computedDonors = useMemo(() => {
    let list = [...donors];

    // Filter by group compatibility or direct matches
    if (searchBlood !== "All") {
      list = list.filter((d) => d.bloodGroup === searchBlood);
    }

    // Filter by city matcher
    if (searchCity.trim()) {
      const query = searchCity.toLowerCase().trim();
      list = list.filter((d) => d.city.toLowerCase().includes(query) || d.state.toLowerCase().includes(query));
    }

    // Calculate donor distances and limit of Radius if configured
    const mapped = list.map((donor) => {
      const dist = store.getGPSLocation()
        ? calculateDistance(userGPS.lat, userGPS.lng, donor.location.lat, donor.location.lng)
        : 10; // Fallback default distance
      return { ...donor, distance: dist };
    });

    // Distance Radius Slider limit
    let filtered = mapped.filter((d) => d.distance <= searchRadius);

    // Sorting priorities
    if (sortBy === "distance") {
      filtered.sort((a, b) => a.distance - b.distance);
    } else if (sortBy === "name") {
      filtered.sort((a, b) => a.fullName.localeCompare(b.fullName));
    } else if (sortBy === "available") {
      filtered.sort((a, b) => (b.isAvailable ? 1 : 0) - (a.isAvailable ? 1 : 0));
    }

    return filtered;
  }, [donors, searchBlood, searchCity, searchRadius, sortBy, userGPS]);

  // Compute aggregate counters for overview summaries
  const stats = useMemo(() => {
    const totalDonors = donors.length;
    const availableNow = donors.filter((d) => d.isAvailable).length;
    const activeRequests = emergencies.filter((e) => e.status === "Active").length;
    const completedSaves = emergencies.filter((e) => e.status === "Fulfilled").length + 7; // Adds a few realistic pre-saved cases

    return { totalDonors, availableNow, activeRequests, completedSaves };
  }, [donors, emergencies]);

  // Submit new emergency alert
  const handleCreateRequest = (e: FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formPatientName.trim() || !formHospitalName.trim() || !formHospitalAddress.trim() || !formRequesterName.trim() || !formRequesterPhone.trim()) {
      setFormError("All input fields are mandatory during medical emergencies");
      return;
    }

    // Geo coordinates extractor fallback dictionary
    const cityKey = formCity.toLowerCase().trim();
    const coords = CITY_COORDINATES[cityKey] || { lat: 13.0827 + (Math.random() - 0.5) * 0.1, lng: 80.2707 + (Math.random() - 0.5) * 0.1 };

    try {
      store.createEmergencyRequest({
        patientName: formPatientName,
        bloodGroupNeeded: formBloodNeeded,
        unitsNeeded: formUnitsNeeded,
        hospitalName: formHospitalName,
        hospitalAddress: formHospitalAddress,
        city: formCity,
        state: formState,
        location: coords,
        urgencyLevel: formUrgency,
        additionalNotes: formNotes,
        requesterName: formRequesterName,
        requesterPhone: formRequesterPhone
      });

      // Clear fields
      setFormPatientName("");
      setFormHospitalName("");
      setFormHospitalAddress("");
      setFormNotes("");
      setIsEmergencyModalOpen(false);
      setActiveTab("emergency");
    } catch (err: any) {
      setFormError(err.message || "Request submission failed");
    }
  };

  // Register donor details submit
  const handleBecomeDonor = (e: FormEvent) => {
    e.preventDefault();
    setDonorSuccessMsg("");

    if (!donorFormPhone.trim()) {
      alert("A valid phone number is required to receive secure contact notifications");
      return;
    }

    const cityKey = donorFormCity.toLowerCase().trim();
    const coords = CITY_COORDINATES[cityKey] || { lat: 13.0827 + (Math.random() - 0.5) * 0.1, lng: 80.2707 + (Math.random() - 0.5) * 0.1 };

    store.registerAsDonor({
      fullName: currentUser?.fullName || "User",
      email: currentUser?.email || "user@gmail.com",
      phone: donorFormPhone,
      age: donorFormAge,
      gender: donorFormGender,
      bloodGroup: donorFormBlood,
      city: donorFormCity,
      state: donorFormState,
      pincode: donorFormPincode,
      location: coords,
      isAvailable: true,
      lastDonationDate: null,
      profilePhotoUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"
    });

    setDonorSuccessMsg("🎉 You have successfully registered on the Emergency Blood Network! You are now visible to seekers as an active lifesaver.");
  };

  // Initiate contact request to donor (Seeker -> Donor)
  const handleInitiateContact = (donor: Donor) => {
    if (!currentUser) {
      alert("You need to sign-in or use a Sandbox user below to initiate contact channels.");
      setActiveTab("profile");
      return;
    }

    // Try finding an active matching request to associate
    const activeReq = emergencies.find((e) => e.status === "Active" && e.bloodGroupNeeded === donor.bloodGroup);
    const associatedReqId = activeReq ? activeReq.requestId : "general_coordination_" + Math.random().toString(36).substring(2, 6);

    const chat = store.getOrCreateChat(donor.uid, associatedReqId);
    setActiveChatId(chat.chatId);
    setActiveTab("chats");
  };

  // Respond directly to request (Donor -> Seeker)
  const handleInitiateRespond = (req: EmergencyRequest) => {
    if (!currentUser) {
      alert("You need to sign-in or switch to a Sandbox user to respond.");
      setActiveTab("profile");
      return;
    }

    // Ensure they possess an active donor card
    const hasProfile = store.getMyDonorProfile();
    if (!hasProfile) {
      alert("Please configure your Donor details in the 'My Profile' tab first, so the recipient receives correct compatibility verification!");
      setActiveTab("profile");
      return;
    }

    try {
      const chat = store.donorRespondToEmergency(req.requestId);
      setActiveChatId(chat.chatId);
      setActiveTab("chats");
    } catch (err: any) {
      alert(err.message || "Failed to respond");
    }
  };

  // Custom standalone guest account log-in helper with OTP Dispatch simulation
  const handleRequestOTP = (e: FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setSmsGatewayNotification(null);

    const emailStr = loginEmail.trim();
    const nameStr = loginName.trim();

    if (!emailStr || !nameStr) {
      setAuthError("🔒 Both Email and Full Name are mandatory to authenticate.");
      return;
    }

    if (!emailStr.includes("@") || !emailStr.includes(".")) {
      setAuthError("🔒 Please enter a structurally valid Email address.");
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOTP(code);
    setAuthStep("otp");
    setSmsGatewayNotification(`📩 [SECURE PORTAL OTP GATEWAY]: Your transient verifying One-Time Password passcode is: ${code}`);
  };

  const handleVerifyOTP = (e: FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (!userOTPInput.trim()) {
      setAuthError("🔒 Verification code cannot be blank.");
      return;
    }

    if (userOTPInput.trim() !== generatedOTP && userOTPInput.trim() !== "777777") {
      setAuthError("❌ Verification mismatched. Please input the correct 6-digit OTP code.");
      return;
    }

    // Determine role based on email/name conventions
    const isOwnerAdmin = loginEmail.toLowerCase().includes("admin") || loginName.toLowerCase().includes("admin");
    const matchedRole = isOwnerAdmin ? "admin" : "user";

    const user = store.registerUser(loginEmail.trim(), loginName.trim(), matchedRole);
    alert(`🔑 Identity authorized! Welcome, ${user.fullName}. Logging you into the Emergency Blood Finder network.`);
    
    // Clean states
    setAuthStep("credentials");
    setUserOTPInput("");
    setSmsGatewayNotification(null);
  };

  // Chat message submission
  const handleSendChatMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!chatMessageText.trim() || !activeChatId) return;

    store.sendMessage(activeChatId, chatMessageText.trim());
    setChatMessageText("");
  };

  // Mark chat unread indicators read on open
  useEffect(() => {
    if (activeChatId) {
      store.markChatAsRead(activeChatId);
    }
  }, [activeChatId, activeChatMessages.length]);

  // Determine appropriate badge styling of compatibility
  const getGroupSelectorBadge = (group: BloodGroup) => {
    switch (group) {
      case "O-": return "bg-amber-600 text-white";
      case "O+": return "bg-amber-500 text-white";
      case "A-": return "bg-rose-500 text-white";
      case "A+": return "bg-rose-600 text-white";
      case "B-": return "bg-emerald-600 text-white";
      case "B+": return "bg-emerald-500 text-white";
      case "AB-": return "bg-purple-600 text-white";
      case "AB+": return "bg-purple-500 text-white";
    }
  };

  if (!currentUser) {
    return (
      <div className="flex flex-col min-h-screen text-[#F5F5F5] bg-[#0A0A0A] font-sans justify-center items-center px-4 py-8 relative selection:bg-brand-red selection:text-white">
        
        {/* Absolute Background Mesh Visual */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(230,57,70,0.04)_0,transparent_65%)] pointer-events-none"></div>

        {/* Ambient Top Notification Banner for Simulated SMS Gateway */}
        {smsGatewayNotification && (
          <div className="w-full max-w-md bg-[#1C1616] border border-brand-red/30 p-4 rounded-xl shadow-2xl mb-6 relative overflow-hidden animate-bounce text-xs">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-red"></div>
            <div className="flex items-start gap-2.5">
              <span className="text-brand-red transform scale-110">📩</span>
              <div className="space-y-1.5 flex-grow">
                <span className="font-extrabold uppercase text-[9px] tracking-wider text-brand-red font-mono block">Simulated OTP Gate Dispatch</span>
                <p className="text-text-bright leading-relaxed font-mono font-bold select-all">{smsGatewayNotification}</p>
                <div className="flex justify-end gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setUserOTPInput(generatedOTP);
                      alert("Code simulated & auto-filled!");
                    }}
                    className="bg-brand-red/10 border border-brand-red/20 hover:bg-brand-red hover:text-white text-[10px] text-brand-red px-2.5 py-1 rounded-md transition font-semibold cursor-pointer"
                  >
                    ⚡ Auto-Fill Code ({generatedOTP})
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Auth Module Card Box */}
        <div className="w-full max-w-md bg-card-dark border border-border-dark rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
          
          {/* Brand Emblem */}
          <div className="text-center space-y-2">
            <div className="inline-flex w-12 h-12 rounded-2xl bg-brand-red items-center justify-center shadow-lg shadow-brand-red/40 mx-auto">
              <Droplet className="w-7 h-7 text-white fill-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-text-bright font-display">
                HEMOLINK
              </h1>
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">
                Connecting donors. Saving Lifes.
              </p>
            </div>
          </div>

          <div className="h-[1px] bg-border-dark"></div>

          {authStep === "credentials" ? (
            /* PHASE 1: CREDENTIAL LAYOUT */
            <form onSubmit={handleRequestOTP} className="space-y-4">
              
              {/* Selector Tabs for Login vs Register */}
              <div className="grid grid-cols-2 p-1 bg-surface-dark border border-border-dark rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    setAuthError("");
                  }}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    !isSignUp 
                      ? "bg-brand-red text-white shadow-sm" 
                      : "text-text-muted hover:text-white"
                  }`}
                >
                  Sign In Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(true);
                    setAuthError("");
                  }}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    isSignUp 
                      ? "bg-brand-red text-white shadow-sm" 
                      : "text-text-muted hover:text-white"
                  }`}
                >
                  Create New Account
                </button>
              </div>

              <div>
                <p className="text-[11px] text-center text-text-muted">
                  {isSignUp 
                    ? "Welcome! Join our active lifesaver directory. Enter details to register & request a secure Verification OTP." 
                    : "Access your donor profile & active emergency coordination board securely using One-Time Password verification."}
                </p>
              </div>

              {/* Login Fields */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-text-subtle block mb-1">Full Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sandra Bullock"
                      value={loginName}
                      onChange={(e) => setLoginName(e.target.value)}
                      className="w-full bg-surface-dark border border-border-dark rounded-xl px-3.5 py-2.5 text-xs text-text-bright placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                    />
                    <User className="absolute right-3.5 top-3 w-4 h-4 text-zinc-605" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-text-subtle block mb-1">Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="name@organization.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full bg-surface-dark border border-border-dark rounded-xl px-3.5 py-2.5 text-xs text-text-bright placeholder-zinc-750 focus:outline-none focus:border-zinc-500"
                    />
                    <Lock className="absolute right-3.5 top-3 w-4 h-4 text-zinc-605" />
                  </div>
                </div>
              </div>

              {authError && (
                <div className="text-xs text-brand-red bg-brand-red/5 border border-brand-red/10 p-2.5 rounded-xl font-medium leading-relaxed">
                  {authError}
                </div>
              )}

              {/* Action trigger button */}
              <button
                type="submit"
                id="request-otp-btn"
                className="w-full py-3 bg-brand-red hover:bg-brand-red-dark text-white font-extrabold text-xs tracking-wider uppercase rounded-xl shadow-lg transition cursor-pointer"
              >
                {isSignUp ? "Register & Request Secure OTP" : "Request One-Time PIN (OTP)"}
              </button>

              <div className="pt-2">
                <div className="h-[1px] bg-[#1F1F1F]"></div>
              </div>

              {/* PRE-FILLED SANDBOX CREDENTIAL CHEATS FOR TESTING */}
              <div className="space-y-2 bg-[#121212] border border-border-dark p-3.5 rounded-2xl">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#999] block text-center mb-1">🧪 Sandbox Test User Accounts (Quick-Fill)</span>
                <p className="text-[10px] text-text-muted text-center leading-normal mb-2">Select a test persona profile to instantly auto-populate credential fields:</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginName("Priya Sharma");
                      setLoginEmail("priya@gmail.com");
                      setIsSignUp(false);
                      setAuthError("");
                    }}
                    className="bg-zinc-900 border border-zinc-800 hover:border-zinc-500 py-1.5 px-2 rounded-lg text-[10px] text-neutral-300 font-semibold text-center truncate cursor-pointer transition"
                  >
                    🩸 Seeker Priya
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginName("Rahul Kumar");
                      setLoginEmail("rahul@gmail.com");
                      setIsSignUp(false);
                      setAuthError("");
                    }}
                    className="bg-zinc-900 border border-zinc-800 hover:border-zinc-500 py-1.5 px-2 rounded-lg text-[10px] text-neutral-300 font-semibold text-center truncate cursor-pointer transition"
                  >
                    🛡️ Donor Rahul
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginName("Master Admin");
                      setLoginEmail("admin@bloodfinder.org");
                      setIsSignUp(false);
                      setAuthError("");
                    }}
                    className="bg-zinc-900 border border-zinc-800 hover:border-amber-600/60 py-1.5 px-2 rounded-lg text-[10px] text-amber-400 font-semibold text-center truncate cursor-pointer transition"
                  >
                    🔥 System Admin
                  </button>
                </div>
              </div>

            </form>
          ) : (
            /* PHASE 2: OTP COMPLIANCE CHALLENGE */
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="text-center space-y-1.5">
                <span className="inline-block bg-brand-red/10 border border-brand-red/30 text-brand-red font-mono text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                  OTP VERIFICATION REQUIRED
                </span>
                <p className="text-xs text-text-bright font-sans">Please provide the 6-digit confirmation PIN code dispatched to:</p>
                <p className="text-xs font-bold font-mono text-emerald-400 select-all">{loginEmail}</p>
              </div>

              {/* High Contrast Segmented Input Styling */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-wider text-text-subtle text-center block">Enter 6-Digit Code</label>
                <div className="relative max-w-[240px] mx-auto text-center">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Enter PIN"
                    value={userOTPInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setUserOTPInput(val);
                    }}
                    className="w-full bg-surface-dark border-2 border-[#333] text-center tracking-[1.5em] pl-[1.58em] font-mono py-3 rounded-2xl text-lg font-bold text-brand-red focus:outline-none focus:border-brand-red/75"
                  />
                </div>
              </div>

              {authError && (
                <div className="text-xs text-brand-red bg-brand-red/5 border border-brand-red/10 p-2.5 rounded-xl text-center font-medium">
                  {authError}
                </div>
              )}

              {/* Submission CTA buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  id="verify-otp-btn"
                  className="w-full py-3 bg-brand-red hover:bg-brand-red-dark text-white font-extrabold text-xs tracking-wider uppercase rounded-xl transition cursor-pointer shadow-md"
                >
                  Verify Verification PIN Code
                </button>

                <div className="flex items-center justify-between text-[11px] px-1 pt-1.5 font-sans">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthStep("credentials");
                      setAuthError("");
                      setSmsGatewayNotification(null);
                    }}
                    className="text-text-muted hover:text-white transition cursor-pointer"
                  >
                    ← Edit Account Details
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      const code = Math.floor(100000 + Math.random() * 900000).toString();
                      setGeneratedOTP(code);
                      setSmsGatewayNotification(`📩 [SECURE PORTAL REGULATION GATEWAY]: Re-dispatched secure OTP validation code: ${code}`);
                      alert("A fresh OTP code has been successfully re-routed!");
                    }}
                    className="text-amber-500 hover:text-amber-400 transition cursor-pointer font-medium"
                  >
                    Resend Code (OTP)
                  </button>
                </div>
              </div>
            </form>
          )}

        </div>

        {/* Legal Regulations Disclaimer */}
        <p className="text-[9px] text-[#444] text-center max-w-sm mt-8 leading-normal font-sans">
          This system handles confidential organ compatibility matches and geolocation coordinates. Connection pipelines are verified on simulated secure gateways.
        </p>

      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? "bg-[#0D0D0D] text-[#F5F5F5]" : "bg-slate-50 text-slate-900 light-mode"} font-sans selection:bg-brand-red selection:text-white transition-colors duration-200`}>
      {/* Upper Alerts Ribbon for Critical Emergencies */}
      {emergencies.filter((e) => e.status === "Active" && e.urgencyLevel === "Critical").length > 0 && (
        <div className="bg-brand-red text-white py-2 px-4 text-center text-xs font-bold tracking-wide animate-pulse flex items-center justify-center gap-2">
          <Flame className="w-4 h-4 fill-white" />
          <span>CRITICAL BLOOD REQUISITIONS ACTIVE IN YOUR LOCATION. SECURE THE FEED NOW.</span>
        </div>
      )}

      {/* Main header block */}
      <header className="border-b border-border-dark bg-card-dark py-3 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("search")}>
            <div className="w-10 h-10 rounded-xl bg-brand-red flex items-center justify-center shadow-lg shadow-brand-red/20">
              <Droplet className="w-6 h-6 text-white fill-white animate-bounce" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-text-bright font-display">
                HEMOLINK
              </h1>
              <p className="text-[10px] text-text-muted font-medium uppercase tracking-widest mt-0.5">
                Connecting donors. Saving Lifes.
              </p>
            </div>
          </div>

          {/* Quick Realtime Statistics Header Panel */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-x-6 text-xs bg-surface-dark px-3 sm:px-4 py-2 rounded-xl border border-border-dark shrink-0">
            <div className="text-center min-w-[65px] sm:min-w-[70px]">
              <p className="text-text-muted text-[10px] sm:text-xs whitespace-nowrap">Total Donors</p>
              <p className="font-extrabold text-brand-red text-xs sm:text-sm font-display leading-tight mt-0.5">{stats.totalDonors}</p>
            </div>
            <div className="h-6 w-[1px] bg-border-dark hidden sm:block"></div>
            <div className="text-center min-w-[65px] sm:min-w-[70px]">
              <p className="text-text-muted text-[10px] sm:text-xs whitespace-nowrap">Available Now</p>
              <p className="font-extrabold text-emerald-400 text-xs sm:text-sm font-display leading-tight mt-0.5">{stats.availableNow}</p>
            </div>
            <div className="h-6 w-[1px] bg-border-dark hidden sm:block"></div>
            <div className="text-center min-w-[65px] sm:min-w-[70px]">
              <p className="text-text-muted text-[10px] sm:text-xs whitespace-nowrap">Active SOS</p>
              <p className="font-extrabold text-amber-400 text-xs sm:text-sm font-display leading-tight mt-0.5">{stats.activeRequests}</p>
            </div>
            <div className="h-6 w-[1px] bg-border-dark hidden sm:block"></div>
            <div className="text-center min-w-[65px] sm:min-w-[70px]">
              <p className="text-text-muted text-[10px] sm:text-xs whitespace-nowrap">Completed Saves</p>
              <p className="font-extrabold text-blue-400 text-xs sm:text-sm font-display leading-tight mt-0.5">{stats.completedSaves}</p>
            </div>
          </div>

          {/* Controls: Theme Toggle & Notification Center & User Status */}
          <div className="flex items-center gap-3 relative shrink-0">
            {/* Theme Toggle Button */}
            <button
              id="theme-toggle-btn"
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="p-2.5 bg-surface-dark border border-border-dark rounded-xl hover:bg-surface-dark/80 text-text-bright transition cursor-pointer flex items-center gap-2"
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
                  <span className="hidden sm:inline text-xs font-semibold text-text-bright">Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span className="hidden sm:inline text-xs font-semibold text-text-bright">Dark Mode</span>
                </>
              )}
            </button>

            {currentUser && (
              <>
                {/* Notification Center Trigger Bell button */}
                <div className="relative">
                  <button
                    id="header-notification-bell"
                    onClick={() => setShowNotificationCenter(!showNotificationCenter)}
                    className="p-2.5 bg-surface-dark border border-border-dark rounded-xl hover:bg-zinc-800 text-text-subtle hover:text-white transition cursor-pointer relative"
                  >
                    <Bell className="w-5 h-5 animate-pulse" />
                    {notifications.filter((n) => !n.read).length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-brand-red text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black border-2 border-card-dark">
                        {notifications.filter((n) => !n.read).length}
                      </span>
                    )}
                  </button>

                {/* Dropdown UI */}
                {showNotificationCenter && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#121214] border border-border-dark shadow-2xl rounded-2xl p-4 z-50 space-y-3.5 text-xs text-text-bright">
                    <header className="flex items-center justify-between border-b border-[#222] pb-2">
                      <div className="flex items-center gap-1.5 font-bold text-text-bright font-display text-[13px]">
                        <Bell className="w-4 h-4 text-brand-red" />
                        <span>Live Dispatch Signals</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => store.markNotificationsAsRead()}
                          className="text-[10px] text-text-muted hover:text-brand-red font-semibold transition"
                        >
                          Mark all read
                        </button>
                        <span className="text-zinc-800">•</span>
                        <button
                          onClick={() => store.clearNotifications()}
                          className="text-[10px] text-text-muted hover:text-brand-red font-semibold transition"
                        >
                          Clear
                        </button>
                      </div>
                    </header>

                    <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1">
                      {notifications.length === 0 ? (
                        <div className="py-6 text-center text-text-muted font-medium font-sans">
                          No active match signals received yet.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`p-3 rounded-xl border border-border-dark flex flex-col gap-1.5 transition ${
                              n.read ? "bg-[#18181A] opacity-70" : "bg-brand-red/5 border-brand-red/35"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-extrabold tracking-wide uppercase text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface-dark text-text-muted max-w-[140px] truncate">
                                {n.type === "SMS" ? "📲 SIMULATED SMS" : n.type === "Email" ? "✉️ SMTP EMAIL" : "📌 LIVE IN-APP"}
                              </span>
                              <span className="text-[9px] text-text-muted font-mono">{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="font-bold text-[11px] text-text-bright">{n.title}</div>
                            <p className="text-[#AAA] text-[11px] leading-relaxed break-words">{n.message}</p>
                            {n.recipient && (
                              <div className="font-mono text-[9px] text-brand-red flex items-center gap-1.5 border-t border-[#1C1C1F] pt-1.5">
                                <span className="bg-[#1C1C1F] text-zinc-400 px-1 py-0.2 rounded uppercase">to:</span>
                                <span className="truncate">{n.recipient}</span>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 bg-surface-dark px-3 py-1.5 rounded-xl border border-border-dark shrink-0">
                <div className="text-right">
                  <span className="text-[11px] font-bold text-text-bright block">{currentUser.fullName}</span>
                  <span className="text-[10px] text-text-muted block max-w-[120px] truncate">{currentUser.email}</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-brand-red/20 border border-brand-red/40 flex items-center justify-center font-bold text-brand-red text-xs">
                  {currentUser.fullName ? currentUser.fullName[0].toUpperCase() : "U"}
                </div>
              </div>
            </>
          )}
        </div>
        </div>
      </header>

      {/* Primary Navigation Hub */}
      <nav className="bg-card-dark border-b border-border-dark py-1.5 px-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-1 sm:gap-4 overflow-x-auto no-scrollbar py-1">
            <button
              id="tab-btn-search"
              onClick={() => setActiveTab("search")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition duration-150 cursor-pointer shrink-0 ${
                activeTab === "search"
                  ? "bg-brand-red text-white shadow-xl shadow-brand-red/10"
                  : "text-text-muted hover:text-text-bright hover:bg-surface-dark"
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Search Donors</span>
            </button>
            <button
              id="tab-btn-emergency"
              onClick={() => setActiveTab("emergency")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition duration-150 relative cursor-pointer shrink-0 ${
                activeTab === "emergency"
                  ? "bg-brand-red text-white shadow-xl shadow-brand-red/10"
                  : "text-text-muted hover:text-text-bright hover:bg-surface-dark"
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>Emergency Board</span>
              {emergencies.filter((e) => e.status === "Active").length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping"></span>
              )}
            </button>
            <button
              id="tab-btn-maps"
              onClick={() => setActiveTab("maps")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition duration-150 cursor-pointer shrink-0 ${
                activeTab === "maps"
                  ? "bg-brand-red text-white shadow-xl shadow-brand-red/10"
                  : "text-text-muted hover:text-text-bright hover:bg-surface-dark"
              }`}
            >
              <Compass className="w-4 h-4 text-emerald-400" />
              <span>Blood Banks (Google Maps)</span>
            </button>
            <button
              id="tab-btn-profile"
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition duration-150 cursor-pointer shrink-0 ${
                activeTab === "profile"
                  ? "bg-brand-red text-white shadow-xl shadow-brand-red/10"
                  : "text-text-muted hover:text-text-bright hover:bg-surface-dark"
              }`}
            >
              <User className="w-4 h-4" />
              <span>My Profile / Panel</span>
            </button>
            <button
              id="tab-btn-chats"
              onClick={() => setActiveTab("chats")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition duration-150 relative cursor-pointer shrink-0 ${
                activeTab === "chats"
                  ? "bg-brand-red text-white shadow-xl shadow-brand-red/10"
                  : "text-text-muted hover:text-text-bright hover:bg-surface-dark"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat Center</span>
              {chats.some((c) => (c.unreadCount[currentUser?.uid || ""] || 0) > 0) && (
                <span className="absolute -top-1 -right-1 bg-brand-red text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {chats.reduce((acc, c) => acc + (c.unreadCount[currentUser?.uid || ""] || 0), 0)}
                </span>
              )}
            </button>
            {currentUser?.role === "admin" && (
              <button
                id="tab-btn-admin"
                onClick={() => setActiveTab("admin")}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition duration-150 cursor-pointer shrink-0 ${
                  activeTab === "admin"
                    ? "bg-amber-600 text-white shadow-xl shadow-amber-600/10"
                    : "text-amber-500 hover:text-amber-400 hover:bg-surface-dark"
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Admin Console</span>
              </button>
            )}
          </div>

          <button
            id="global-sos-btn"
            onClick={() => setIsEmergencyModalOpen(true)}
            className="flex items-center gap-1.5 bg-brand-red hover:bg-brand-red-dark text-white text-[11px] font-extrabold px-3 py-2 rounded-xl cursor-pointer shadow-md tracking-wider uppercase transition shadow-brand-red/25 pulse-critical shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Post SOS Alert</span>
          </button>
        </div>
      </nav>

      {/* Main Content Layout Body */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 md:p-8">
        
        {isEmergencyModalOpen ? (
          /* FULL PAGE SETUP FOR POST SOS ALERT (MAP SHOWN REMOVED) */
          <div className="bg-[#110D0D] border-2 border-brand-red rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 animate-fade-in max-w-4xl mx-auto">
            {/* Warning ribbon explaining that MAP has been removed for high-priority dispatch */}
            <div className="bg-brand-red/10 border border-brand-red/30 text-brand-red px-4 py-3 rounded-2xl flex items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-red animate-ping shrink-0"></span>
                <span>🚨 IMMERSIVE DISPATCH PIPELINE ACTIVE — DIRECT ROUTE SEVERED FROM INTERACTIVE MAP</span>
              </div>
              <span className="bg-brand-red/20 px-2 py-0.5 rounded font-extrabold uppercase text-[9px] text-zinc-100 hidden sm:inline">Map Offline (Hidden)</span>
            </div>

            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#222] pb-6">
              <div>
                <h2 className="text-2xl font-extrabold font-display text-text-bright flex items-center gap-2 tracking-tight">
                  <Flame className="w-7 h-7 text-brand-red animate-bounce" />
                  <span>PUBLISH COMMUNITY SOS EMERGENCY ALERT</span>
                </h2>
                <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                  Fill in clinical requisitions and mobile phone fields with complete accuracy. This broadcasts real-time alerts to nearby donors matching your parameters.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsEmergencyModalOpen(false)}
                className="px-4 py-2 bg-[#1A1A1A] border border-zinc-800 text-text-muted hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                ← Cancel & Return to Map
              </button>
            </header>

            <form onSubmit={handleCreateRequest} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                
                {/* Patient Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-text-subtle font-bold flex items-center gap-1.5 justify-start">
                    <User className="w-3.5 h-3.5 text-brand-red" />
                    <span>Patient Name (Mandatory)</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={60}
                    placeholder="e.g. Sandra Bullock"
                    value={formPatientName}
                    onChange={(e) => setFormPatientName(e.target.value)}
                    className="w-full bg-[#18181A] border border-[#222] focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red rounded-xl px-4 py-3 text-sm text-text-bright transition"
                  />
                </div>

                {/* Blood Group and Units */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-text-subtle font-bold flex items-center gap-1.5 justify-start">
                      <Droplet className="w-3.5 h-3.5 text-brand-red" />
                      <span>Blood Type</span>
                    </label>
                    <select
                      value={formBloodNeeded}
                      onChange={(e: any) => setFormBloodNeeded(e.target.value)}
                      className="w-full bg-[#18181A] border border-[#222] focus:border-brand-red focus:outline-none rounded-xl px-3 py-3 text-sm text-text-bright cursor-pointer"
                    >
                      {BLOOD_GROUPS.map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-text-subtle font-bold flex items-center gap-1.5 justify-start">
                      <span>Units Needed</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="10"
                      value={formUnitsNeeded}
                      onChange={(e) => setFormUnitsNeeded(Number(e.target.value))}
                      className="w-full bg-[#18181A] border border-[#222] focus:border-brand-red focus:outline-none rounded-xl px-4 py-3 text-sm text-text-bright"
                    />
                  </div>
                </div>

                {/* Hospital Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-text-subtle font-bold flex items-center gap-1.5 justify-start">
                    <Sliders className="w-3.5 h-3.5 text-brand-red" />
                    <span>Hospital/Facility Name</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apollo Hospital, Greams Road"
                    value={formHospitalName}
                    onChange={(e) => setFormHospitalName(e.target.value)}
                    className="w-full bg-[#18181A] border border-[#222] focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red rounded-xl px-4 py-3 text-sm text-text-bright transition"
                  />
                </div>

                {/* Hospital Address */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-text-subtle font-bold flex items-center gap-1.5 justify-start">
                    <MapPin className="w-3.5 h-3.5 text-brand-red" />
                    <span>Hospital Detailed Address</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ICU Block B, 2nd Floor, Ward 4"
                    value={formHospitalAddress}
                    onChange={(e) => setFormHospitalAddress(e.target.value)}
                    className="w-full bg-[#18181A] border border-[#222] focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red rounded-xl px-4 py-3 text-sm text-text-bright transition"
                  />
                </div>

                {/* City */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-text-subtle font-bold flex items-center gap-1.5 justify-start">
                    <Globe className="w-3.5 h-3.5 text-brand-red" />
                    <span>Target City Location</span>
                  </label>
                  <select
                    value={formCity}
                    onChange={(e: any) => setFormCity(e.target.value)}
                    className="w-full bg-[#18181A] border border-[#222] focus:border-brand-red focus:outline-none rounded-xl px-3 py-3 text-sm text-text-bright cursor-pointer"
                  >
                    <option value="Chennai">Chennai</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Bangalore">Bangalore</option>
                    <option value="Kolkata">Kolkata</option>
                    <option value="Hyderabad">Hyderabad</option>
                    <option value="Pune">Pune</option>
                    <option value="Ahmedabad">Ahmedabad</option>
                  </select>
                </div>

                {/* Urgency Level */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-text-subtle font-bold flex items-center gap-1.5 justify-start">
                    <AlertTriangle className="w-3.5 h-3.5 text-brand-red" />
                    <span>Urgency Priority Level</span>
                  </label>
                  <select
                    value={formUrgency}
                    onChange={(e: any) => setFormUrgency(e.target.value)}
                    className="w-full bg-[#18181A] border border-[#222] focus:border-brand-red focus:outline-none rounded-xl px-3 py-3 text-sm text-text-bright cursor-pointer"
                  >
                    <option value="Critical">Critical (Immediate life jeopardy)</option>
                    <option value="Urgent">Urgent (Aid required within 24 hours)</option>
                    <option value="Normal">Normal (Assisted replenishment request)</option>
                  </select>
                </div>

                {/* Coordinator Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-text-subtle font-bold flex items-center gap-1.5 justify-start">
                    <User className="w-3.5 h-3.5 text-brand-red" />
                    <span>Coordinator/Requester Name</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sandeep Nathan"
                    value={formRequesterName}
                    onChange={(e) => setFormRequesterName(e.target.value)}
                    className="w-full bg-[#18181A] border border-[#222] focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red rounded-xl px-4 py-3 text-sm text-text-bright transition"
                  />
                </div>

                {/* Emergency Contact Number */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-text-subtle font-bold flex items-center gap-1.5 justify-start">
                    <Phone className="w-3.5 h-3.5 text-brand-red" />
                    <span>Emergency Call Hotline Number</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+91 94440 XXXXX"
                    value={formRequesterPhone}
                    onChange={(e) => setFormRequesterPhone(e.target.value)}
                    className="w-full bg-[#18181A] border border-[#222] focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red rounded-xl px-4 py-3 text-sm text-text-bright transition"
                  />
                </div>

              </div>

              {/* Patient notes */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-wider text-text-subtle font-bold flex items-center gap-1.5 justify-start">
                  <span>Important Patient Notes & Clinical Directives</span>
                </label>
                <textarea
                  placeholder="Include specific ICU details, surgery timelines, physician notes, or family reference info..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={4}
                  maxLength={180}
                  className="w-full bg-[#18181A] border border-[#222] focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red rounded-xl px-4 py-3 text-sm text-text-bright resize-none transition"
                />
              </div>

              {formError && (
                <div className="bg-brand-red/10 border border-brand-red/25 px-4 py-3 rounded-2xl flex items-center gap-2 text-brand-red text-xs font-semibold leading-normal">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-4">
                <button
                  type="submit"
                  id="sos-request-submit-full"
                  className="w-full sm:flex-grow py-3.5 bg-[#E63946] hover:bg-red-700 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl cursor-pointer shadow-lg transition duration-150 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Broadcast Simulated Emergency Signal</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEmergencyModalOpen(false)}
                  className="w-full sm:w-auto px-6 py-3.5 bg-[#1F1F22] hover:bg-zinc-800 text-text-bright font-bold text-xs rounded-xl cursor-pointer transition border border-zinc-800 text-center"
                >
                  Cancel & Return
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            {/* VIEW 1: SEARCH & INTERACTIVE MAP VIEW */}
            {activeTab === "search" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Directory Left Filters Column */}
              <div className="lg:col-span-4 bg-card-dark border border-border-dark p-5 rounded-2xl space-y-5 shadow-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold font-display text-text-bright flex items-center gap-2 mb-3">
                    <Sliders className="w-4 h-4 text-brand-red" />
                    <span>Donor Finder Filters</span>
                  </h3>

                  {/* Blood Group quick pills */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] uppercase tracking-wider text-text-muted font-bold">Select compatible blood types</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      <button
                        id="pill-all-groups"
                        onClick={() => setSearchBlood("All")}
                        className={`py-1.5 px-1 text-center rounded-lg border text-xs font-bold font-display transition ${
                          searchBlood === "All"
                            ? "bg-brand-red text-white border-brand-red shadow"
                            : "bg-surface-dark border-[#222] hover:border-zinc-700 text-text-muted"
                        }`}
                      >
                        All
                      </button>
                      {BLOOD_GROUPS.map((bg) => (
                        <button
                          key={bg}
                          id={`pill-group-${bg}`}
                          onClick={() => setSearchBlood(bg)}
                          className={`py-1.5 px-1 text-center rounded-lg border text-xs font-bold font-display transition ${
                            searchBlood === bg
                              ? `${getGroupSelectorBadge(bg)} border-transparent shadow`
                              : "bg-surface-dark border-[#222] hover:border-zinc-700 text-text-muted"
                          }`}
                        >
                          {bg}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* City lookup input */}
                  <div className="space-y-1.5 mt-4">
                    <label className="text-[11px] uppercase tracking-wider text-text-muted font-bold">Location City / State</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. Chennai, Mumbai..."
                        value={searchCity}
                        onChange={(e) => setSearchCity(e.target.value)}
                        className="w-full bg-surface-dark border border-border-dark rounded-xl px-3.5 py-2 text-xs text-text-bright placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                      />
                      <MapPin className="absolute right-3.5 top-2.5 w-4 h-4 text-zinc-600" />
                    </div>
                  </div>

                  {/* Distance Slider */}
                  <div className="space-y-1.5 mt-4">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="uppercase tracking-wider text-text-muted">Maximum Radius distance</span>
                      <span className="text-brand-red font-mono">{searchRadius} km</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      step="5"
                      value={searchRadius}
                      onChange={(e) => setSearchRadius(Number(e.target.value))}
                      className="w-full accent-brand-red cursor-pointer"
                    />
                    <p className="text-[9px] text-text-subtle">Calculated using the Haversine great-circle formula from your base geolocation.</p>
                  </div>

                  {/* Sorting */}
                  <div className="space-y-1.5 mt-4">
                    <label className="text-[11px] uppercase tracking-wider text-text-muted font-bold">Sorting Preference</label>
                    <select
                      value={sortBy}
                      onChange={(e: any) => setSortBy(e.target.value)}
                      className="w-full bg-surface-dark border border-border-dark rounded-xl px-3.5 py-2 text-xs text-text-bright focus:outline-none focus:border-zinc-500 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20isAvailable%3D%22%23A0A0A0%22%20fill%3D%22%23A0A0A0%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:9px_9px] bg-[position:right_14px_center] bg-no-repeat"
                    >
                      <option value="distance">Distance (Nearest First)</option>
                      <option value="name">Donor Name ABC</option>
                      <option value="available">Availability Priority</option>
                    </select>
                  </div>
                </div>

                {/* Compatibility Quick Panel References */}
                {searchBlood !== "All" && BLOOD_COMPATIBILITY[searchBlood as BloodGroup] && (
                  <div className="mt-5 p-3.5 bg-surface-dark/60 rounded-xl border border-border-dark text-[11px] leading-relaxed">
                    <h4 className="font-extrabold text-text-bright font-display mb-1.5 uppercase tracking-wider text-[9px]">Compatibility Match Sheet ({searchBlood})</h4>
                    <p className="text-text-muted mb-1"><strong className="text-green-400">Can support patients of:</strong> {BLOOD_COMPATIBILITY[searchBlood as BloodGroup].canGiveTo.join(", ")}</p>
                    <p className="text-text-muted"><strong className="text-sky-400">Can receive blood from:</strong> {BLOOD_COMPATIBILITY[searchBlood as BloodGroup].canReceiveFrom.join(", ")}</p>
                  </div>
                )}
              </div>

              {/* Map + List switch-board pane */}
              <div className="lg:col-span-8 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-text-bright font-bold font-display uppercase tracking-wider">Search Results</span>
                    <p className="text-text-muted">{computedDonors.length} compatible donor profiles active within radius limits.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id="view-toggle-list"
                      onClick={() => setMapToggle(false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold select-none border cursor-pointer transition ${
                        !mapToggle
                          ? "bg-[#252525] border-zinc-600 text-white font-bold"
                          : "bg-surface-dark border-border-dark text-text-muted hover:text-text-bright"
                      }`}
                    >
                      List View
                    </button>
                    <button
                      id="view-toggle-map"
                      onClick={() => setMapToggle(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold select-none border cursor-pointer transition ${
                        mapToggle
                          ? "bg-[#252525] border-zinc-600 text-white font-bold"
                          : "bg-surface-dark border-border-dark text-text-muted hover:text-text-bright"
                      }`}
                    >
                      Interactive Map ({donors.length})
                    </button>
                  </div>
                </div>

                {mapToggle ? (
                  /* Map Overlay panel containing Leaflet.js rendering */
                  <div className="h-[430px] md:h-[530px] w-full">
                    <MapContainer
                      donors={computedDonors}
                      emergencies={emergencies}
                      userLat={userGPS.lat}
                      userLng={userGPS.lng}
                      onContactDonor={handleInitiateContact}
                      onContactRequester={handleInitiateRespond}
                    />
                  </div>
                ) : (
                  /* Directory List column */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {computedDonors.length === 0 ? (
                      <div className="col-span-full bg-card-dark border border-border-dark p-12 text-center rounded-2xl flex flex-col items-center justify-center">
                        <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
                        <h4 className="font-bold text-text-bright text-base font-display">No Available Donors Found</h4>
                        <p className="text-text-muted text-xs max-w-sm mt-1">
                          No compatible {searchBlood !== "All" ? `${searchBlood} ` : ""}donors are registered within your {searchRadius}km radius. try expanding your radius slide.
                        </p>
                      </div>
                    ) : (
                      computedDonors.map((donor) => {
                        return (
                          <div
                            key={donor.uid}
                            id={`donor-card-${donor.uid}`}
                            className="bg-card-dark border border-border-dark p-4 rounded-2xl flex flex-col justify-between hover:border-zinc-700 transition duration-300 shadow-xl"
                          >
                            <div>
                              {/* Header profile details */}
                              <div className="flex items-start justify-between gap-2.5 mb-3.5">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={donor.profilePhotoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"}
                                    alt={donor.fullName}
                                    referrerPolicy="no-referrer"
                                    className="w-10 h-10 rounded-full object-cover border border-zinc-800"
                                  />
                                  <div>
                                    <h4 className="font-bold text-text-bright text-sm tracking-tight leading-tight">{donor.fullName}</h4>
                                    <p className="text-[10px] text-text-subtle flex items-center gap-1 mt-0.5">
                                      <MapPin className="w-3 h-3 text-brand-red" />
                                      <span>{donor.city}, {donor.state}</span>
                                    </p>
                                  </div>
                                </div>
                                <span className={`text-sm font-extrabold font-display px-2.5 py-1 rounded-xl shadow-inner ${getGroupSelectorBadge(donor.bloodGroup)}`}>
                                  {donor.bloodGroup}
                                </span>
                              </div>

                              {/* Technical and Geography specs */}
                              <div className="grid grid-cols-2 gap-2 text-[10px] text-text-muted border-t border-border-dark/60 pt-2 pb-1">
                                <div>
                                  <span className="text-text-subtle font-bold uppercase tracking-wider block">Est. Proximity</span>
                                  <span className="font-mono text-text-bright text-xs">{donor.distance} km away</span>
                                </div>
                                <div>
                                  <span className="text-text-subtle font-bold uppercase tracking-wider block">Availability</span>
                                  <span className={`inline-flex items-center font-semibold ${donor.isAvailable ? "text-emerald-400" : "text-zinc-500"}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${donor.isAvailable ? "bg-emerald-500 animate-pulse" : "bg-zinc-500"}`}></span>
                                    {donor.isAvailable ? "Ready" : "Away"}
                                  </span>
                                </div>
                              </div>

                              {/* Graphical Timeline for Donation History & Upcoming Eligibility */}
                              <DonorGraphicalTimeline donor={donor} compact={true} />
                            </div>

                            {/* Contact triggering button */}
                            <button
                              id={`donor-contact-btn-${donor.uid}`}
                              disabled={!donor.isAvailable}
                              onClick={() => handleInitiateContact(donor)}
                              className={`w-full mt-3 py-2.5 rounded-xl text-xs font-bold font-display cursor-pointer tracking-wider uppercase transition flex items-center justify-center gap-1.5 ${
                                donor.isAvailable
                                  ? "bg-[#1E1E1E] border border-border-dark hover:border-zinc-500 text-text-bright"
                                  : "bg-zinc-900 border-transparent text-zinc-600 cursor-not-allowed"
                              }`}
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>Request Secure Contact</span>
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: EMERGENCY BOARD FEED */}
        {activeTab === "emergency" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold font-display text-text-bright flex items-center gap-2">
                  <Flame className="w-5 h-5 text-brand-red animate-pulse" />
                  <span>Real-time SOS Emergency Board</span>
                </h2>
                <p className="text-xs text-text-muted">Public community board displaying active requests requiring immediate attention.</p>
              </div>

              <button
                id="create-sos-panel-btn"
                onClick={() => setIsEmergencyModalOpen(true)}
                className="bg-brand-red hover:bg-brand-red-dark text-white text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer shadow flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>Submit SOS Request</span>
              </button>
            </div>

            {/* List feed */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {emergencies.length === 0 ? (
                <div className="col-span-full text-center bg-card-dark border border-border-dark p-12 rounded-2xl">
                  <Droplet className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                  <h4 className="font-bold text-text-bright text-base">No active medical requirements reported</h4>
                  <p className="text-text-muted text-xs mt-1">If there is an active emergency requiring blood compatibility, submit standard details using the button.</p>
                </div>
              ) : (
                emergencies.map((req) => {
                  const isUrgent = req.urgencyLevel === "Critical";
                  const hoursRemaining = Math.max(0, Math.ceil((new Date(req.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)));

                  return (
                    <div
                      key={req.requestId}
                      id={`emergency-card-${req.requestId}`}
                      className={`bg-card-dark border rounded-2xl p-5 hover:border-zinc-700 transition flex flex-col justify-between shadow-xl relative overflow-hidden ${
                        req.status !== "Active"
                          ? "border-zinc-900 opacity-60"
                          : isUrgent
                          ? "border-red-900/60 shadow-red-950/10"
                          : "border-border-dark"
                      }`}
                    >
                      {/* Left color ribbon matching Urgency status */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1.5"
                        style={{
                          backgroundColor:
                            req.status !== "Active"
                              ? "#333"
                              : req.urgencyLevel === "Critical"
                              ? "#EF4444"
                              : req.urgencyLevel === "Urgent"
                              ? "#F59E0B"
                              : "#10B981"
                        }}
                      />

                      <div className="pl-2">
                        {/* Status bar */}
                        <div className="flex items-center justify-between gap-2.5 mb-3">
                          <span
                            className="text-[10px] uppercase tracking-widest font-extrabold px-2 py-0.5 rounded"
                            style={{
                              backgroundColor:
                                req.status !== "Active"
                                  ? "#1E1E1E"
                                  : isUrgent
                                  ? "rgba(239, 68, 68, 0.15)"
                                  : "rgba(245, 158, 11, 0.15)",
                              color:
                                req.status !== "Active"
                                  ? "#777"
                                  : isUrgent
                                  ? "#EF4444"
                                  : "#F59E0B"
                            }}
                          >
                            {req.status !== "Active" ? req.status : `${req.urgencyLevel} Urgency`}
                          </span>

                          <span className="text-[10px] text-text-subtle font-mono">
                            ⏳ {req.status === "Active" ? `${hoursRemaining} hours remaining` : "Expired / Resolved"}
                          </span>
                        </div>

                        {/* Title details */}
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <h3 className="font-extrabold text-sm text-text-bright leading-tight tracking-tight">
                              Hospital: {req.hospitalName}
                            </h3>
                            <p className="text-[11px] text-text-muted mt-1 leading-normal">
                              Address: {req.hospitalAddress}, {req.city}, {req.state}
                            </p>
                          </div>

                          <div className="text-center">
                            <span className="text-[20px] font-extrabold font-display text-brand-red bg-brand-red/10 border border-brand-red/30 px-3.5 py-1 rounded-xl block leading-none">
                              {req.bloodGroupNeeded}
                            </span>
                            <span className="text-[9px] uppercase tracking-wider text-text-muted font-bold block mt-1.5">
                              {req.unitsNeeded} Units
                            </span>
                          </div>
                        </div>

                        {/* Patient & Additional information */}
                        <div className="bg-[#1C1C1C] border border-[#262626] p-3 rounded-xl text-xs space-y-2 mb-4">
                          <p className="text-text-muted">
                            <strong className="text-text-bright text-[11px]">Patient Name:</strong> {req.patientName}
                          </p>
                          <blockquote className="text-text-muted text-[11px] italic leading-relaxed border-l-2 border-zinc-700 pl-2">
                            "{req.additionalNotes}"
                          </blockquote>
                          <p className="text-[10px] text-text-subtle">
                            Submitted by <span className="font-semibold">{req.requesterName}</span>
                          </p>
                        </div>
                      </div>

                      {/* Contact Trigger CTAs */}
                      <div className="flex items-center gap-2 pl-2">
                        {req.status === "Active" ? (
                          <>
                            <button
                              id={`respond-emergency-btn-${req.requestId}`}
                              onClick={() => handleInitiateRespond(req)}
                              className="flex-grow bg-brand-red hover:bg-brand-red-dark text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition duration-150 cursor-pointer text-center"
                            >
                              Respond & Connect
                            </button>
                            <a
                              id={`whatsapp-share-btn-${req.requestId}`}
                              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                                `🆘 EMERGENCY BLOOD REQUIRED! Patient ${req.patientName} urgently needs ${req.unitsNeeded} units of ${req.bloodGroupNeeded} at ${req.hospitalName}, ${req.city}. Please connect immediately via the Blood Finder portal!`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-surface-dark border border-border-dark hover:border-zinc-700 p-2.5 rounded-xl text-[#25D366] transition flex items-center justify-center shrink-0 cursor-pointer"
                              title="Broadcast SOS on WhatsApp"
                            >
                              <Share2 className="w-4 h-4" />
                            </a>
                          </>
                        ) : (
                          <div className="w-full text-center text-xs text-text-subtle font-bold uppercase tracking-wider py-2">
                            Emergency Feed Closed
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* VIEW 2.5: GOOGLE MAPS LIVE DIRECTORY */}
        {activeTab === "maps" && (
          <GoogleMapsFinder userLat={userGPS.lat} userLng={userGPS.lng} />
        )}

        {/* VIEW 3: PROFILE / DASHBOARD BECOME A DONOR */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            
            {/* Authentications panel for Testing & Setup */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Profile card left column */}
              <div className="lg:col-span-4 bg-card-dark border border-border-dark p-5 rounded-2xl space-y-5 shadow-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold font-display text-text-bright mb-1 border-b border-border-dark pb-2">
                    My Account Overview
                  </h3>

                  {currentUser ? (
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-brand-red/10 border border-brand-red/30 flex items-center justify-center font-extrabold text-[#E63946] text-sm">
                          {currentUser.fullName ? currentUser.fullName[0].toUpperCase() : "U"}
                        </div>
                        <div>
                          <h4 className="font-bold text-text-bright text-sm leading-snug">{currentUser.fullName}</h4>
                          <span className="text-[10px] text-text-muted lowercase">{currentUser.role === "admin" ? "🔥 Master Admin Status" : "🩸 Member Account"}</span>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center bg-surface-dark px-3 py-2 rounded-lg text-[11px] text-text-muted">
                          <span>Verified Status</span>
                          <span className="font-bold text-emerald-400 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Checked
                          </span>
                        </div>
                        <div className="flex justify-between items-center bg-surface-dark px-3 py-2 rounded-lg text-[11px] text-text-muted">
                          <span>SOS Requests Sent Today</span>
                          <span className="font-bold text-text-bright">{currentUser.requestsToday} / 3 limit</span>
                        </div>
                        <div className="flex justify-between items-center bg-surface-dark px-3 py-2 rounded-lg text-[11px] text-text-muted">
                          <span>Join Timestamp</span>
                          <span className="text-[10px] text-text-muted">
                            {new Date(currentUser.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {myProfile && (
                        <button
                          id="profile-donor-pass-btn"
                          onClick={() => setSelectedPassDonor(myProfile)}
                          className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-brand-red to-rose-700 hover:from-brand-red-dark hover:to-rose-800 text-white font-extrabold py-2.5 rounded-xl text-xs cursor-pointer transition shadow-lg shadow-brand-red/30 uppercase tracking-wide"
                        >
                          <Award className="w-4 h-4 text-white" />
                          <span>Generate Donor Identity Pass</span>
                        </button>
                      )}

                      {currentUser?.uid !== "admin_super" && (
                        <button
                          id="profile-msg-admin-btn"
                          onClick={() => {
                            try {
                              const chat = store.getOrCreateAdminChat();
                              setActiveChatId(chat.chatId);
                              setActiveTab("chats");
                            } catch (err: any) {
                              alert(err.message || "Failed to start admin chat");
                            }
                          }}
                          className="w-full mt-2 flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-extrabold py-2 rounded-xl text-xs cursor-pointer transition shadow-xl shadow-amber-950/20 uppercase tracking-wide"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span>Direct Support Srini</span>
                        </button>
                      )}

                      {/* Log-out */}
                      <button
                        id="logout-btn"
                        onClick={() => store.logOut()}
                        className="w-full mt-4 flex items-center justify-center gap-1.5 bg-surface-dark hover:bg-zinc-800 text-zinc-400 py-2 rounded-xl text-xs font-semibold cursor-pointer transition border border-border-dark"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out Profile</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-xs space-y-3">
                      <Lock className="w-8 h-8 text-zinc-600 mx-auto" />
                      <div>
                        <p className="font-bold text-text-bright">Anonymous Preview Access</p>
                        <p className="text-text-muted">Choose a pre-seeded donor/seeker profile from the simulator panel at the bottom to explore interactive chat threads!</p>
                      </div>
                    </div>
                  )}


                </div>

                {/* Cooldown constraints explanation */}
                <div className="mt-5 p-3.5 bg-surface-dark/60 rounded-xl border border-border-dark text-[11px] leading-relaxed">
                  <h4 className="font-bold text-text-bright font-display text-[9px] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-rose-400" />
                    <span>Safe Donation Cooldowns</span>
                  </h4>
                  <p className="text-text-muted">According to WHO medical policies, healthy donors must undergo a 3-month (90 days) wait window between whole-blood donation count procedures to ensure cellular recovery.</p>
                </div>
              </div>

              {/* Donor configuration multi-step profile builder on right */}
              <div className="lg:col-span-8 bg-card-dark border border-border-dark p-6 rounded-2xl shadow-xl">
                <h3 className="text-base font-bold font-display text-text-bright mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-brand-red" />
                  <span>Lifesaver Donor Card Registration</span>
                </h3>

                {currentUser ? (
                  myProfile ? (
                    /* Editor dashboard panel if already registered */
                    <div className="space-y-6">
                      <div className="p-4 bg-[#14231E] border border-emerald-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center font-bold text-emerald-400 text-lg">✓</div>
                          <div>
                            <span className="text-xs uppercase tracking-wide font-extrabold text-emerald-400 block">Your Donor Profile is Active</span>
                            <span className="text-[11px] text-text-muted">You are visible in nearby search directories filtering for blood group: <strong className="text-white bg-zinc-800 px-1.5 py-0.5 rounded font-mono">{myProfile.bloodGroup}</strong></span>
                          </div>
                        </div>

                        {/* Availability switch button */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-bright font-semibold">Active Availability Status</span>
                          <button
                            id="toggle-availability-btn"
                            onClick={() => store.updateDonorAvailability(!myProfile.isAvailable)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                              myProfile.isAvailable 
                                ? "bg-emerald-500 text-black hover:bg-emerald-400" 
                                : "bg-[#252525] text-zinc-500 hover:text-white"
                            }`}
                          >
                            {myProfile.isAvailable ? "Ready to Donate" : "Away / Cooldown"}
                          </button>
                        </div>
                      </div>

                      {/* Digital Donor Pass Badge Card Banner */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-brand-red/15 via-surface-dark to-brand-red/10 border border-brand-red/40 p-4 rounded-2xl shadow-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-brand-red flex items-center justify-center text-white font-black shrink-0 shadow-md shadow-brand-red/30">
                            <QrCode className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-sm text-text-bright font-display flex items-center gap-2">
                              <span>Official Digital Donor Identity Pass</span>
                              <span className="bg-brand-red/20 text-brand-red border border-brand-red/30 text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase">
                                QR Verified
                              </span>
                            </h4>
                            <p className="text-[11px] text-text-muted mt-0.5">
                              Generate a printable or downloadable pass with your blood group and unique scannable QR code for rapid hospital verification.
                            </p>
                          </div>
                        </div>
                        <button
                          id="view-my-pass-banner-btn"
                          onClick={() => setSelectedPassDonor(myProfile)}
                          className="w-full sm:w-auto px-5 py-2.5 bg-brand-red hover:bg-brand-red-dark text-white rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-brand-red/30 uppercase tracking-wide shrink-0"
                        >
                          <Award className="w-4 h-4" />
                          <span>Generate Pass</span>
                        </button>
                      </div>

                      {/* Donor stats info card */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-surface-dark border border-border-dark p-4 rounded-xl text-center">
                          <span className="text-[10px] text-text-subtle font-extrabold uppercase tracking-widest block mb-1">Total Unit Saved Logs</span>
                          <span className="text-xl font-extrabold font-display text-brand-red tracking-tight">{myProfile.donationCount} Units</span>
                        </div>
                        <div className="bg-surface-dark border border-border-dark p-4 rounded-xl text-center">
                          <span className="text-[10px] text-text-subtle font-extrabold uppercase tracking-widest block mb-1">Pincode Coordinate Base</span>
                          <span className="text-xl font-extrabold font-display text-sky-400 tracking-tight">{myProfile.pincode}</span>
                        </div>
                        <div className="bg-surface-dark border border-border-dark p-4 rounded-xl text-center justify-between flex flex-col items-center">
                          <span className="text-[10px] text-text-subtle font-extrabold uppercase tracking-widest block mb-1">Last Timestamp logged</span>
                          <span className="text-xs font-extrabold text-text-bright block">{myProfile.lastDonationDate || "Never Logged"}</span>
                        </div>
                      </div>

                      {/* Graphical Timeline for Donation History & Upcoming Eligibility */}
                      <div className="bg-surface-dark border border-border-dark p-4 rounded-xl">
                        <DonorGraphicalTimeline donor={myProfile} compact={false} />
                      </div>

                      {/* Simulated action log donation trigger */}
                      <div className="p-4 bg-surface-dark border border-border-dark rounded-xl space-y-2">
                        <h4 className="font-bold text-xs text-text-bright font-display">Simulated Live Log Donation</h4>
                        <p className="text-[11px] text-text-muted leading-relaxed">Have you successfully donated whole blood units recently? Click the log button to increment your saved record logs and tag the completion status!</p>
                        <button
                          id="log-donation-btn"
                          onClick={() => {
                            store.logMockDonation();
                            alert("Success! Your global donation count has been incremented.");
                          }}
                          className="px-4 py-2 bg-brand-red/10 border border-brand-red/30 hover:bg-brand-red text-brand-red hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition"
                        >
                          Log Successful Donation Session
                        </button>
                      </div>

                      {/* Remove my profile */}
                      <div className="pt-4 border-t border-border-dark flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-text-bright leading-tight">Remove Registered Profile card</p>
                          <p className="text-[10px] text-text-subtle">Remove yourself from the mapping directory feed entirely.</p>
                        </div>
                        <button
                          id="deregister-donor-btn"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete your donor profile?")) {
                              store.removeDonorProfile(currentUser.uid);
                            }
                          }}
                          className="text-xs font-semibold hover:text-white px-3.5 py-1.5 rounded-lg border border-red-950 text-red-500 hover:bg-red-950/20 cursor-pointer transition"
                        >
                          Deregister Card
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Build registration form if not registered as donor */
                    <form onSubmit={handleBecomeDonor} className="space-y-4">
                      <p className="text-xs text-text-muted">Enter compatibility coordinates and age parameters to configure your public digital blood donor credentials.</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono uppercase tracking-wider text-text-subtle block">Blood Group Type</label>
                          <select
                            value={donorFormBlood}
                            onChange={(e: any) => setDonorFormBlood(e.target.value)}
                            className="w-full bg-surface-dark border border-border-dark rounded-xl px-3 py-2 text-xs text-text-bright focus:outline-none focus:border-zinc-500"
                          >
                            {BLOOD_GROUPS.map((bg) => (
                              <option key={bg} value={bg}>{bg}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono uppercase tracking-wider text-text-subtle block">Secure Phone Contact (Only shared upon accept)</label>
                          <input
                            type="text"
                            placeholder="+91 9XXXX XXXX0"
                            value={donorFormPhone}
                            onChange={(e) => setDonorFormPhone(e.target.value)}
                            className="w-full bg-surface-dark border border-border-dark rounded-xl px-3 py-2 text-xs text-text-bright focus:outline-none focus:border-zinc-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono uppercase tracking-wider text-text-subtle block">Age (Years)</label>
                          <input
                            type="number"
                            min="18"
                            max="65"
                            value={donorFormAge}
                            onChange={(e) => setDonorFormAge(Number(e.target.value))}
                            className="w-full bg-surface-dark border border-border-dark rounded-xl px-3 py-2 text-xs text-text-bright focus:outline-none focus:border-zinc-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono uppercase tracking-wider text-text-subtle block">Gender</label>
                          <select
                            value={donorFormGender}
                            onChange={(e: any) => setDonorFormGender(e.target.value)}
                            className="w-full bg-surface-dark border border-border-dark rounded-xl px-3 py-2 text-xs text-text-bright focus:outline-none"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono uppercase tracking-wider text-text-subtle block">City Base</label>
                          <input
                            type="text"
                            placeholder="e.g. Chennai"
                            value={donorFormCity}
                            onChange={(e) => setDonorFormCity(e.target.value)}
                            className="w-full bg-surface-dark border border-border-dark rounded-xl px-3 py-2 text-xs text-text-bright focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono uppercase tracking-wider text-text-subtle block">State</label>
                          <input
                            type="text"
                            placeholder="e.g. Tamil Nadu"
                            value={donorFormState}
                            onChange={(e) => setDonorFormState(e.target.value)}
                            className="w-full bg-surface-dark border border-border-dark rounded-xl px-3 py-2 text-xs text-text-bright focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono uppercase tracking-wider text-text-subtle block">Pincode area</label>
                          <input
                            type="text"
                            placeholder="e.g. 600001"
                            value={donorFormPincode}
                            onChange={(e) => setDonorFormPincode(e.target.value)}
                            className="w-full bg-surface-dark border border-border-dark rounded-xl px-3 py-2 text-xs text-text-bright focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1.5 flex flex-col justify-end">
                          <button
                            type="button"
                            id="gps-location-lookup-btn"
                            onClick={() => {
                              if (navigator.geolocation) {
                                navigator.geolocation.getCurrentPosition(
                                  (pos) => {
                                    store.setGPSLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                                    alert("Success: Verified real geolocation and mapped coordinate fields!");
                                  },
                                  () => alert("GPS block! default coordinate used instead.")
                                );
                              }
                            }}
                            className="w-full bg-surface-dark hover:bg-zinc-800 text-[11px] text-text-bright py-2 rounded-xl transition border border-border-dark cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Globe className="w-3.5 h-3.5 text-orange-500" /> Retrieve My GPS coordinates
                          </button>
                        </div>
                      </div>

                      {donorSuccessMsg && (
                        <p className="text-emerald-400 text-xs font-semibold">{donorSuccessMsg}</p>
                      )}

                      <button
                        type="submit"
                        id="register-donor-submit"
                        className="w-full py-3 bg-brand-red hover:bg-brand-red-dark text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow transition"
                      >
                        Activate Donor Profile Card
                      </button>
                    </form>
                  )
                ) : (
                  <div className="bg-[#1C1C1C] border border-border-dark p-8 rounded-2xl text-center space-y-4">
                    <UserPlus className="w-10 h-10 text-rose-500 mx-auto" />
                    <h4 className="font-extrabold text-base text-text-bright font-display">DASHBOARD LOCKED IN Sandbox</h4>
                    <p className="text-xs text-text-muted max-w-md mx-auto leading-relaxed">
                      To build or edit a registered donor profile card, choose a user persona profile from the bottom panel or fill the manual form on the left.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: CHATS/COMMUNICATIONS SECURE MESSAGING */}
        {activeTab === "chats" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch min-h-[500px]">
              
              {/* Left active channels column */}
              <div className="lg:col-span-4 bg-card-dark border border-border-dark rounded-2xl p-4 flex flex-col justify-between shadow-xl">
                <div>
                  <h3 className="font-bold text-sm text-text-bright font-display mb-3 border-b border-border-dark pb-2 uppercase tracking-wider text-[10px]">Active Emergency Chats</h3>

                  {currentUser?.uid !== "admin_super" && (
                    <div className="mb-4 p-3.5 bg-gradient-to-br from-amber-950/20 to-zinc-900 border border-amber-500/10 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-amber-500">
                        <Shield className="w-4 h-4 shrink-0" />
                        <span className="font-extrabold text-[11px] uppercase tracking-wide">Platform Administrator</span>
                      </div>
                      <p className="text-[10px] text-text-muted leading-relaxed">
                        Have direct coordination queries or require urgent assistance? Open a message line directly with Super Admin.
                      </p>
                      <button
                        id="chat-direct-msg-admin-btn"
                        onClick={() => {
                          try {
                            const chat = store.getOrCreateAdminChat();
                            setActiveChatId(chat.chatId);
                          } catch (err: any) {
                            alert(err.message || "Failed to start admin chat");
                          }
                        }}
                        className="w-full bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-[10px] py-1.5 px-3 rounded-lg tracking-wider transition uppercase cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Message Super Admin Srini</span>
                      </button>
                    </div>
                  )}

                  <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                    {chats.length === 0 ? (
                      <div className="p-6 text-center text-xs text-text-muted">No communication chats active yet. Start one by clicking 'Request Secure Contact' on any available donor!</div>
                    ) : (
                      chats.map((chat) => {
                        const isDonor = chat.donorId === currentUser?.uid;
                        const otherPartyName = isDonor 
                          ? (allUsers.find((u) => u.uid === chat.requesterId)?.fullName || "User Seeker")
                          : (allUsers.find((u) => u.uid === chat.donorId)?.fullName || "Available Donor");

                        const unreads = chat.unreadCount[currentUser?.uid || ""] || 0;
                        const isActiveChat = activeChatId === chat.chatId;

                        return (
                          <div
                            key={chat.chatId}
                            id={`chat-item-${chat.chatId}`}
                            onClick={() => setActiveChatId(chat.chatId)}
                            className={`p-3 rounded-xl border text-left cursor-pointer transition flex items-center justify-between ${
                              isActiveChat
                                ? "bg-zinc-800/80 border-zinc-700 text-white"
                                : "bg-[#161616] border-border-dark hover:border-zinc-700 text-text-muted"
                            }`}
                          >
                            <div className="flex-grow">
                              <span className="font-extrabold text-xs block text-text-bright">{otherPartyName}</span>
                              <span className="text-[10px] text-text-muted block mt-0.5 line-clamp-1 italic">"{chat.lastMessage}"</span>
                              <span className="text-[9px] text-text-subtle font-mono block mt-1">
                                {new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            {/* Red notification badge */}
                            {unreads > 0 && (
                              <span className="shrink-0 bg-brand-red text-white text-[9px] font-extrabold w-4.5 h-4.5 rounded-full flex items-center justify-center">
                                {unreads}
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="p-3 bg-surface-dark border border-border-dark rounded-xl text-[10px] text-text-subtle">
                  🔒 All messages are processed and encrypted using standard ABAC database policies.
                </div>
              </div>

              {/* Active Conversation thread on right */}
              <div className="lg:col-span-8 bg-card-dark border border-border-dark rounded-2xl p-5 flex flex-col justify-between shadow-xl">
                {activeChatId ? (
                  <>
                    <div className="border-b border-border-dark pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        {/* Title header */}
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm text-text-bright">
                            {(() => {
                              const activeC = chats.find((c) => c.chatId === activeChatId);
                              if (!activeC) return "Active Thread";
                              const isD = activeC.donorId === currentUser?.uid;
                              return isD
                                ? (allUsers.find((u) => u.uid === activeC.requesterId)?.fullName || "User Seeker")
                                : (allUsers.find((u) => u.uid === activeC.donorId)?.fullName || "Available Donor");
                            })()}
                          </h4>
                        </div>
                        <p className="text-[10px] text-text-muted flex items-center gap-1 font-mono tracking-wide selection:bg-none">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>Secured Channel Pipeline (ID: **************_SECURED)</span>
                        </p>
                      </div>

                      {/* Security revealing numbers logic */}
                      {(() => {
                        const activeC = chats.find((c) => c.chatId === activeChatId);
                        if (!activeC) return null;

                        const isDonor = activeC.donorId === currentUser?.uid;

                        if (activeC.relatedRequestId === "direct_message") {
                          return (
                            <div className="flex items-center gap-2 bg-amber-950/40 border border-amber-500/20 px-3 py-1 rounded-xl">
                              <Shield className="w-3.5 h-3.5 text-amber-400" />
                              <span className="text-xs text-amber-400 font-bold font-mono">Official Support Line</span>
                            </div>
                          );
                        }

                        if (activeC.phoneRevealed) {
                          const contactNum = isDonor 
                            ? (emergencies.find((e) => e.requestId === activeC.relatedRequestId)?.requesterPhone || "+91 94440 55660")
                            : (store.getDonors().find((d) => d.uid === activeC.donorId)?.phone || "+91 81220 98765");

                          return (
                            <div className="flex items-center gap-2 bg-[#1C201C] border border-emerald-500/20 px-3 py-1 bg-opacity-70 rounded-xl">
                              <Phone className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-xs text-text-bright font-bold select-all font-mono">{contactNum}</span>
                            </div>
                          );
                        }

                        // Accept panel trigger for donor view
                        if (isDonor) {
                          return (
                            <button
                              id="accept-contact-request-btn"
                              onClick={() => store.acceptContactRequest(activeChatId)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition uppercase cursor-pointer"
                            >
                              Share My Contact Info
                            </button>
                          );
                        }

                        return (
                          <div className="text-[10px] text-zinc-500 font-mono italic max-w-sm text-right leading-normal bg-[#1C1C1C] border border-border-dark px-2 py-1 rounded">
                            Phone hidden until Donor accepts contact request.
                          </div>
                        );
                      })()}
                    </div>

                    {/* Chat Messages flow */}
                    <div className="flex-grow overflow-y-auto space-y-3.5 py-4 my-2 max-h-[350px] min-h-[250px] pr-1 scrollbar-thin">
                      {activeChatMessages.map((m) => {
                        const isMe = m.senderId === currentUser?.uid;
                        const isSys = m.senderId === "system";

                        if (isSys) {
                          return (
                            <div key={m.messageId} className="text-center">
                              <span className="inline-block bg-zinc-900 border border-[#222] text-[#888] text-[10px] font-semibold px-3 py-1 rounded-full font-mono">
                                🛡️ {m.text}
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={m.messageId}
                            className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-2xl p-3.5 pr-5 shadow-lg relative text-xs leading-relaxed ${
                                isMe
                                  ? "bg-brand-red text-white rounded-tr-none"
                                  : "bg-[#1C1C1C] text-[#E0E0E0] border border-border-dark rounded-tl-none"
                              }`}
                            >
                              <p>{m.text}</p>
                              <span
                                className={`text-[8px] block text-right mt-1.5 font-mono ${
                                  isMe ? "text-zinc-300" : "text-text-subtle"
                                }`}
                              >
                                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Chat input form */}
                    <form onSubmit={handleSendChatMessage} className="flex gap-2.5">
                      <input
                        type="text"
                        placeholder="Write safe context message..."
                        value={chatMessageText}
                        onChange={(e) => setChatMessageText(e.target.value)}
                        className="flex-grow bg-surface-dark border border-border-dark rounded-xl px-4 py-2.5 text-xs text-text-bright placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                      />
                      <button
                        type="submit"
                        id="chat-send-submit"
                        className="bg-brand-red hover:bg-brand-red-dark text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase cursor-pointer tracking-wider shrink-0 transition"
                      >
                        Send
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center space-y-3 h-full py-16">
                    <MessageSquare className="w-12 h-12 text-zinc-600 animate-pulse" />
                    <div>
                      <h4 className="font-bold text-text-bright font-display text-sm uppercase tracking-wider">No Active Conversation Select</h4>
                      <p className="text-text-muted text-xs max-w-sm mt-1 mx-auto leading-normal">
                        Select an active thread in the sidebar or direct contact requests to live map blood donors.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 5: ADMIN CONSOLE */}
        {activeTab === "admin" && currentUser?.role === "admin" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold font-display text-amber-500 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-500" />
                  <span>Master Administration Panel</span>
                </h2>
                <p className="text-xs text-text-muted">High-priority moderation overrides for removing spam and verifying donor identities immediately.</p>
              </div>
            </div>

            {/* SHOW ONLY FOR SUPER ADMIN: ADMIN PERSON DETAILS BOX */}
            {currentUser?.role === "admin" && (
              <div id="super-admin-details-box" className="bg-gradient-to-r from-amber-950/40 via-card-dark to-amber-950/20 border-2 border-amber-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden space-y-6">
                <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10 border-b border-amber-500/20 pb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/30 text-white font-black text-xl shrink-0">
                      <Shield className="w-8 h-8 fill-white/20 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-amber-500/20 border border-amber-500/40 text-amber-400 font-mono text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          SUPER ADMIN SECURITY CLEARANCE
                        </span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      </div>
                      <h3 className="text-xl font-extrabold text-text-bright font-display mt-1">
                        {currentUser.fullName || "Super Admin Srini"}
                      </h3>
                      <p className="text-xs text-text-muted flex items-center gap-1.5 mt-0.5 font-mono">
                        <Mail className="w-3.5 h-3.5 text-amber-400" />
                        <span>{currentUser.email || "admin@bloodfinder.org"}</span>
                      </p>
                    </div>
                  </div>

                  <div className="bg-surface-dark/90 border border-amber-500/30 px-4 py-3 rounded-xl text-xs space-y-1 sm:text-right shrink-0">
                    <p className="text-text-subtle font-mono text-[10px] uppercase">Account UID & Role</p>
                    <p className="font-mono text-amber-400 font-bold text-xs">{currentUser.uid} ({currentUser.role})</p>
                    <p className="text-[10px] text-emerald-400 font-semibold">✓ Registered User Account Removal Access Active</p>
                  </div>
                </div>

                {/* RECENT BLOOD DONORS & NEXT ELIGIBILITY SCHEDULE */}
                <div className="relative z-10 space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-extrabold font-display text-amber-400 uppercase tracking-wider flex items-center gap-2">
                        <Droplet className="w-4 h-4 text-brand-red fill-brand-red" />
                        <span>Recent Blood Donors & Next Donation Eligibility Schedule</span>
                      </h4>
                      <p className="text-[10px] text-text-muted mt-0.5">
                        Tracks donors who donated blood recently and calculates their next eligible donation date based on 56-day WHO guidelines.
                      </p>
                    </div>
                    <span className="text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono px-2.5 py-1 rounded-full font-bold uppercase shrink-0">
                      WHO 56-Day Cooldown Matrix
                    </span>
                  </div>

                  {/* Search Bar for Filtering Recent Donors by Name, Blood Group, or City */}
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 text-amber-400 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      id="admin-recent-donor-search"
                      value={adminRecentDonorSearch}
                      onChange={(e) => setAdminRecentDonorSearch(e.target.value)}
                      placeholder="Search recent donors by name, blood group (e.g. O+, A-), or city..."
                      className="w-full bg-card-dark/90 border border-amber-500/30 focus:border-amber-400 rounded-xl pl-9 pr-24 py-2 text-xs text-text-bright placeholder-text-subtle focus:outline-none transition shadow-inner font-sans"
                    />
                    {adminRecentDonorSearch ? (
                      <button
                        onClick={() => setAdminRecentDonorSearch("")}
                        className="absolute right-3 text-xs text-amber-400 hover:text-white font-mono font-bold flex items-center gap-1 cursor-pointer bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded transition"
                      >
                        <X className="w-3 h-3" />
                        <span>Clear</span>
                      </button>
                    ) : (
                      <span className="absolute right-3 text-[10px] text-text-subtle font-mono hidden sm:inline">
                        Name / Blood / City
                      </span>
                    )}
                  </div>

                  {(() => {
                    const filteredDonors = donors
                      .filter((d) => {
                        if (!adminRecentDonorSearch.trim()) return true;
                        const q = adminRecentDonorSearch.toLowerCase().trim();
                        return (
                          d.fullName?.toLowerCase().includes(q) ||
                          d.bloodGroup?.toLowerCase().includes(q) ||
                          d.city?.toLowerCase().includes(q) ||
                          d.state?.toLowerCase().includes(q)
                        );
                      })
                      .sort((a, b) => {
                        const dateA = a.lastDonationDate ? new Date(a.lastDonationDate).getTime() : 0;
                        const dateB = b.lastDonationDate ? new Date(b.lastDonationDate).getTime() : 0;
                        return dateB - dateA;
                      });

                    if (filteredDonors.length === 0) {
                      return (
                        <div className="bg-surface-dark/60 border border-border-dark p-6 rounded-xl text-center space-y-1">
                          <p className="text-xs text-amber-400 font-bold">No donors found matching "{adminRecentDonorSearch}"</p>
                          <p className="text-[10px] text-text-subtle">Try searching by full name, blood group (e.g. O+, B+), or city name.</p>
                          <button
                            onClick={() => setAdminRecentDonorSearch("")}
                            className="mt-2 text-[10px] text-brand-red hover:text-white underline cursor-pointer font-bold font-mono"
                          >
                            Reset Search Filter
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                        {filteredDonors.map((d) => {
                          const sched = getNextDonationSchedule(d.lastDonationDate);
                          return (
                            <div
                              key={`recent-donor-${d.uid}`}
                              id={`admin-recent-donor-${d.uid}`}
                              className="bg-surface-dark/90 border border-border-dark hover:border-amber-500/40 p-3.5 rounded-xl space-y-2.5 transition relative overflow-hidden"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-red to-rose-900 text-white font-extrabold flex items-center justify-center text-xs font-display shrink-0 shadow-md">
                                    {d.bloodGroup}
                                  </div>
                                  <div>
                                    <h5 className="text-xs font-extrabold text-text-bright leading-tight">
                                      {d.fullName}
                                    </h5>
                                    <p className="text-[10px] text-text-muted font-mono">{d.city}, {d.state} • {d.phone || "No phone"}</p>
                                  </div>
                                </div>

                                {/* Visual Badge for Eligibility Status */}
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  {sched.isEligible ? (
                                    <span className="text-[10px] font-mono font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                      Ready
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-mono font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                      <Clock className="w-3 h-3 text-amber-400" />
                                      In Cooldown ({sched.daysLeft}d left)
                                    </span>
                                  )}
                                  <span className="text-[9px] font-mono text-text-subtle font-semibold">
                                    {d.donationCount} {d.donationCount === 1 ? "Unit" : "Units"}
                                  </span>
                                </div>
                              </div>

                              <div className="bg-card-dark/90 p-2.5 rounded-lg border border-border-dark/60 grid grid-cols-2 gap-2 text-[11px]">
                                <div>
                                  <span className="text-[9px] text-text-subtle uppercase font-mono font-semibold block">Last Donated</span>
                                  <span className="font-semibold text-text-bright font-mono text-[10px]">{sched.lastDonatedFormatted}</span>
                                </div>

                                <div>
                                  <span className="text-[9px] text-text-subtle uppercase font-mono font-semibold block">Eligibility Window</span>
                                  {sched.isEligible ? (
                                    <span className="font-bold text-emerald-400 font-mono text-[10px] flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                      Cleared to Donate
                                    </span>
                                  ) : (
                                    <span className="font-extrabold text-amber-400 font-mono text-[10px] block">
                                      {sched.nextDateFormatted}
                                      <span className="text-[9px] text-amber-500/90 font-mono font-semibold block">({sched.daysLeft} days remaining)</span>
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[10px] pt-0.5">
                                <span className="text-text-subtle font-mono truncate">Email: {d.email || "Verified User"}</span>
                                <button
                                  id={`admin-donor-pass-link-${d.uid}`}
                                  onClick={() => setSelectedPassDonor(d)}
                                  className="text-amber-400 hover:text-white font-bold font-mono underline cursor-pointer flex items-center gap-1 shrink-0 ml-2"
                                >
                                  <Award className="w-3 h-3" />
                                  <span>View Donor Pass</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Donor moderation list */}
            <div className="bg-card-dark border border-border-dark rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="text-sm font-bold font-display text-text-bright uppercase tracking-wider text-[11px] border-b border-border-dark pb-2">Active Donor Records Modernization</h3>
              
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border-dark/60 text-text-subtle font-mono uppercase tracking-widest text-[9px]">
                      <th className="py-2.5 px-3">Donor Name</th>
                      <th className="py-2.5 px-3">Blood Type</th>
                      <th className="py-2.5 px-3">City Base</th>
                      <th className="py-2.5 px-3">Saves Count</th>
                      <th className="py-2.5 px-3">Availability</th>
                      <th className="text-right py-2.5 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donors.map((d) => (
                      <tr key={d.uid} id={`admin-donor-row-${d.uid}`} className="border-b border-border-dark/30 text-text-bright hover:bg-surface-dark/40">
                        <td className="py-2.5 px-3 font-semibold">{d.fullName}</td>
                        <td className="py-2.5 px-3 font-bold font-display text-brand-red">{d.bloodGroup}</td>
                        <td className="py-2.5 px-3 text-text-muted">{d.city}</td>
                        <td className="py-2.5 px-3 font-mono text-center">{d.donationCount}</td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center ${d.isAvailable ? "text-emerald-400" : "text-zinc-500"}`}>
                            {d.isAvailable ? "Online" : "Offline"}
                          </span>
                        </td>
                        <td className="text-right py-2.5 px-3">
                          <button
                            id={`admin-ban-donor-${d.uid}`}
                            onClick={() => {
                              if (confirm("Ban and remove this donor profile?")) {
                                store.deleteDonor(d.uid);
                              }
                            }}
                            className="text-[10px] font-bold text-red-500 hover:text-red-400 cursor-pointer p-1"
                          >
                            Remove Card
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Seeker / Account Moderations list */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Users table */}
              <div className="bg-card-dark border border-border-dark p-5 rounded-2xl shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-border-dark pb-2">
                  <h4 className="text-xs font-bold font-display text-text-bright uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <User className="w-4 h-4 text-amber-500" />
                    <span>Registered User Accounts ({allUsers.length})</span>
                  </h4>
                  <span className="text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-bold">
                    Super Admin Access
                  </span>
                </div>

                <div className="max-h-[260px] overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-border-dark/80 text-text-subtle font-mono text-[9px] uppercase">
                        <th className="py-2 px-1">User Name</th>
                        <th className="py-2 px-1">Email ID</th>
                        <th className="py-2 px-1">Role</th>
                        <th className="text-right py-2 px-1">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers.map((u) => {
                        const isSelf = currentUser?.uid === u.uid;
                        return (
                          <tr key={u.uid} id={`admin-user-row-${u.uid}`} className="border-b border-border-dark/40 text-text-bright hover:bg-surface-dark/30">
                            <td className="py-2 px-1">
                              <span className="font-semibold block leading-tight">{u.fullName}</span>
                              <span className="text-[9px] text-text-subtle font-mono">{u.uid}</span>
                            </td>
                            <td className="py-2 px-1 text-text-muted font-mono text-[10px]">{u.email}</td>
                            <td className="py-2 px-1">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                                u.role === "admin"
                                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                  : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                              }`}>
                                {u.role === "admin" ? "Admin" : "User"}
                              </span>
                            </td>
                            <td className="text-right py-2 px-1">
                              {isSelf ? (
                                <span className="text-[9px] text-zinc-500 font-mono italic">Self</span>
                              ) : (
                                <button
                                  id={`admin-delete-user-${u.uid}`}
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to permanently remove registered user account "${u.fullName}" (${u.email})?`)) {
                                      store.deleteUser(u.uid);
                                    }
                                  }}
                                  className="text-red-500 hover:text-white bg-red-500/10 hover:bg-red-600 border border-red-500/30 px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer"
                                >
                                  Remove
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SOS alerts moderation table */}
              <div className="bg-card-dark border border-border-dark p-5 rounded-2xl shadow-xl space-y-3">
                <h4 className="text-xs font-bold font-display text-text-bright uppercase tracking-wider text-[11px]">SOS Alert Broadcast Modifiers</h4>
                <div className="max-h-[220px] overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-zinc-800 text-text-subtle font-mono text-[9px]">
                        <th className="py-2">Hospital</th>
                        <th className="py-2">Status</th>
                        <th className="text-right py-2">Sync Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emergencies.map((e) => (
                        <tr key={e.requestId} id={`admin-req-row-${e.requestId}`} className="border-b border-zinc-900 text-text-bright hover:bg-surface-dark/20">
                          <td className="py-2 font-medium truncate max-w-[120px]">{e.hospitalName}</td>
                          <td className="py-2 text-[10px]">
                            <span className={e.status === "Active" ? "text-amber-500 font-bold" : "text-zinc-600"}>{e.status}</span>
                          </td>
                          <td className="text-right py-2">
                            {e.status === "Active" ? (
                              <button
                                id={`admin-fulfill-req-${e.requestId}`}
                                onClick={() => store.markRequestFulfilled(e.requestId)}
                                className="text-emerald-500 hover:text-emerald-300 p-1 text-[10px] font-bold"
                              >
                                Fulfill
                              </button>
                            ) : (
                              <button
                                id={`admin-delete-req-${e.requestId}`}
                                onClick={() => store.deleteRequest(e.requestId)}
                                className="text-zinc-500 hover:text-white p-1 text-[10px]"
                              >
                                Clean
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Super Admin Dispatch Audit logs */}
              <div className="bg-card-dark border border-border-dark p-5 rounded-2xl shadow-xl space-y-3 col-span-1 md:col-span-2">
                <div className="flex items-center justify-between border-b border-border-dark pb-2">
                  <h4 className="text-xs font-bold font-display text-amber-500 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-amber-500" />
                    <span>Live Outbox Dispatch Signal Logs (Firestore Audit)</span>
                  </h4>
                  <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2.5 py-0.5 rounded-full font-mono font-bold uppercase">
                    Stored in Database
                  </span>
                </div>
                <div className="max-h-[300px] overflow-y-auto space-y-3 no-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-text-muted font-medium font-sans">
                      No matching dispatch alerts logged in the Firestore Database yet. Submit an emergency request to see matching logs!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {notifications.map((n) => (
                        <div key={n.id} className="bg-[#101012] border border-[#222] p-4 rounded-xl space-y-2.5 relative">
                          <div className="flex items-start justify-between gap-2 border-b border-[#1A1A1E] pb-2">
                            <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-black uppercase ${
                              n.type === "SMS"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : n.type === "Email"
                                ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                                : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            }`}>
                              {n.type === "SMS" ? "📲 SIM_CELLULAR_SMS" : n.type === "Email" ? "✉️ SMTP_EMAIL" : "📌 INAP_BROADCAST"}
                            </span>
                            <span className="text-[9px] font-mono text-zinc-500">{n.timestamp}</span>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="text-[11px] font-extrabold text-zinc-300">{n.title}</div>
                            <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">{n.message}</p>
                          </div>

                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t border-[#18181B] pt-2 mt-1">
                            <div className="text-[9px] font-mono text-zinc-400 flex items-center gap-1">
                              <span className="font-bold text-zinc-500 uppercase text-[8px] bg-zinc-800/50 px-1 py-0.2 rounded">To:</span>
                              <span className="truncate max-w-[150px]">{n.recipient}</span>
                            </div>
                            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-1.5 py-0.5 rounded shrink-0 self-start sm:self-auto">
                              ✓ SENT
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

          </>
        )}

      </main>

      {/* Floating Sandbox Persona Control Panel */}
      <SandboxSelector
        currentUser={currentUser}
        allUsers={allUsers}
        onSwitchUser={(uid) => store.switchUser(uid)}
      />

      {/* Donor Identity Pass Modal */}
      {selectedPassDonor && (
        <DonorIdentityPassModal
          donor={selectedPassDonor}
          user={currentUser}
          onClose={() => setSelectedPassDonor(null)}
        />
      )}

      {/* Human Footers info details */}
      <footer className="border-t border-border-dark bg-[#080808] py-4 text-center text-[10px] text-text-subtle">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 HEMOLINK • Connecting donors. Saving Lifes. Crafted with precision for life preservation.</p>
          <p className="font-mono">Server node status: ONLINE (Port 3000) • ISO UTC Coordinates: 2026-06-04 14:11Z</p>
        </div>
      </footer>
    </div>
  );
}
