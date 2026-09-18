import React, { useRef, useState, useEffect, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import * as htmlToImage from "html-to-image";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Donor, AppUser, BloodGroup, Gender } from "../types";
import { store } from "../lib/store";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import {
  SAMPLE_AVATARS,
  getDonorPassPhotoUrl,
  determineGenderFromName
} from "../lib/donorPassPhotos";
import {
  Droplet,
  ShieldCheck,
  Printer,
  AlertTriangle,
  X,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  Calendar,
  Heart,
  Activity,
  Layers,
  Sparkles,
  Edit3,
  HardDrive,
  Cloud,
  Download,
  RotateCcw,
  RefreshCw,
  Check,
  Copy,
  Info,
  User,
  CreditCard,
  PhoneCall,
  Clock,
  Camera,
  Award,
  Share2,
  Upload,
  Image as ImageIcon,
  Globe,
  Trash2,
  Link2,
  Layout,
  FileText,
  Maximize2,
  Sliders,
  Table,
  Wifi,
  Bluetooth,
  Scissors,
  Settings2,
  Radio,
  Zap,
  QrCode
} from "lucide-react";
import { MilestoneBadge } from "./MilestoneBadge";
import { getDonorSavedUnits, getMilestoneTier } from "../lib/milestones";
import { HemolinkIcon } from "./HemolinkLogo";
import PublicDonorVerificationModal from "./PublicDonorVerificationModal";
import { generateDonorPassQrUrl } from "../lib/donorVerification";

interface DonorIdentityPassModalProps {
  donor: Donor;
  user?: AppUser | null;
  onClose: () => void;
  onOpenVerification?: (donorId: string) => void;
}

const COOLDOWN_DAYS = 56;

// Reference demo data for visual evaluation, strictly separated from live Firestore data
export const DEMO_REFERENCE_DONOR: Donor = {
  uid: "donor_demo_rahul",
  fullName: "Rahul Varma",
  email: "rahul.varma@example.com",
  phone: "+91 98450 12345",
  age: 29,
  gender: "Male",
  bloodGroup: "O+",
  city: "Chennai",
  state: "Tamil Nadu",
  pincode: "600028",
  location: { lat: 13.0827, lng: 80.2707 },
  isAvailable: false, // COOLDOWN
  lastDonationDate: "2026-09-05",
  donationCount: 8,
  savedUnits: 24,
  profilePhotoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300",
  createdAt: "2025-10-10T10:00:00Z",
  updatedAt: "2026-09-05T14:30:00Z"
};

// Helper to compress and format uploaded images from device gallery or files
function processImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please upload a valid image file (JPEG, PNG, WebP)."));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_DIM = 480;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // Compress as JPEG 85% to produce compact data URL (~25KB)
        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
        resolve(compressedDataUrl);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Format date helper (e.g., "12 Jan 2026")
function formatDisplayDate(dateStr?: string | null, fallback = "Not Recorded"): string {
  if (!dateStr) return fallback;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  } catch {
    return dateStr;
  }
}

// Format Donor ID strictly matching the reference card: BD-2026-00125 (or BD-2025-00001 for demo)
function formatDonorId(donor: Donor): string {
  if (donor.uid === "donor_demo_rahul" || donor.fullName === "Rahul Varma") {
    return "BD-2025-00001";
  }
  const year = donor.createdAt ? new Date(donor.createdAt).getFullYear() : 2026;
  const numPart = donor.uid.replace(/\D/g, "");
  const suffix = (numPart || donor.uid.slice(-5)).padStart(5, "0").slice(-5).toUpperCase();
  return `BD-${year}-${suffix}`;
}

// Format dynamic Printed On timestamp for admin verification
function formatPrintTimestamp(date: Date = new Date()): string {
  const datePart = date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
  const timePart = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  return `${datePart}, ${timePart}`;
}

export default function DonorIdentityPassModal({
  donor: initialDonor,
  user,
  onClose,
  onOpenVerification
}: DonorIdentityPassModalProps) {
  const bothCardsRef = useRef<HTMLDivElement>(null);
  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const qrBadgeCaptureRef = useRef<HTMLDivElement>(null);

  // Active donor state, auto-synced with store updates
  const [donor, setDonor] = useState<Donor>(initialDonor);
  // Source mode: "live" (Firebase Firestore authenticated data) vs "demo" (official reference demo card)
  const [dataSourceMode, setDataSourceMode] = useState<"live" | "demo">("live");
  const [showVerificationModal, setShowVerificationModal] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [isDownloadingQr, setIsDownloadingQr] = useState<boolean>(false);
  const [qrDownloadSuccess, setQrDownloadSuccess] = useState<boolean>(false);
  const [copiedQrPayload, setCopiedQrPayload] = useState<boolean>(false);

  const [viewMode, setViewMode] = useState<"both" | "front" | "back">("both");
  const [isFlipped, setIsFlipped] = useState(false);
  const [preferredAvatarKey, setPreferredAvatarKey] = useState<"auto" | "maleDavid" | "maleDinesh" | "femaleSarah">("auto");
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printFeedback, setPrintFeedback] = useState<string | null>(null);
  const [printedAt, setPrintedAt] = useState<string | null>(null);
  const [showPrintWarning, setShowPrintWarning] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "shared" | "copied">("idle");
  const [copiedDonorId, setCopiedDonorId] = useState<boolean>(false);
  const [copiedPhone, setCopiedPhone] = useState<boolean>(false);

  const handleCopyDonorId = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      navigator.clipboard?.writeText(donorId);
      setCopiedDonorId(true);
      setTimeout(() => setCopiedDonorId(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyPhone = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      navigator.clipboard?.writeText(activeDonor.phone || "+91 94432 10987");
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    } catch {
      // ignore
    }
  };

  // Print Page Setup state: Portrait vs Landscape (ideal for long lists of recent donations)
  const [printOrientation, setPrintOrientation] = useState<"portrait" | "landscape">("portrait");
  const [includeDonationsLog, setIncludeDonationsLog] = useState<boolean>(false);
  const [recentDonationsCount, setRecentDonationsCount] = useState<number>(6);

  // Nearby Printer Connection & Easy-Print states
  const [printerTarget, setPrinterTarget] = useState<"nearby-wireless" | "nearby-bluetooth">("nearby-wireless");
  const [printFormat, setPrintFormat] = useState<"a4-wallet" | "cr80-card" | "full-sheet">("a4-wallet");
  const [showCutMarks, setShowCutMarks] = useState<boolean>(true);
  const [bluetoothDevice, setBluetoothDevice] = useState<{ name: string; id?: string } | null>(null);
  const [isScanningBluetooth, setIsScanningBluetooth] = useState<boolean>(false);
  const [printerStatusMsg, setPrinterStatusMsg] = useState<string | null>(null);

  // Photo studio states in edit modal
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [photoSuccessMsg, setPhotoSuccessMsg] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [showUrlFallback, setShowUrlFallback] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    fullName: donor.fullName,
    bloodGroup: donor.bloodGroup,
    gender: donor.gender,
    age: donor.age || 28,
    phone: donor.phone || "+91 94432 10987",
    city: donor.city || "Coimbatore",
    state: donor.state || "Tamil Nadu",
    pincode: donor.pincode || "641001",
    profilePhotoUrl: donor.profilePhotoUrl || "",
    isAvailable: donor.isAvailable,
    donationCount: donor.donationCount || 0,
    lastDonationDate: donor.lastDonationDate || ""
  });

  // Keep edit form in sync whenever donor changes
  useEffect(() => {
    setEditForm({
      fullName: donor.fullName,
      bloodGroup: donor.bloodGroup,
      gender: donor.gender,
      age: donor.age || 28,
      phone: donor.phone || "+91 94432 10987",
      city: donor.city || "Coimbatore",
      state: donor.state || "Tamil Nadu",
      pincode: donor.pincode || "641001",
      profilePhotoUrl: donor.profilePhotoUrl || "",
      isAvailable: donor.isAvailable,
      donationCount: donor.donationCount || 0,
      lastDonationDate: donor.lastDonationDate || ""
    });
  }, [donor]);

  // AUTO-UPDATE: Subscribe to store updates to auto-refresh details whenever user/donor changes
  useEffect(() => {
    const handleStoreUpdate = () => {
      // If modal is showing the logged in user's pass
      if (user && donor.uid === user.uid) {
        const latestProfile = store.getMyDonorProfile();
        if (latestProfile) {
          setDonor(latestProfile);
          return;
        }
      }
      // Check from donors registry
      const matching = store.getDonors().find((d) => d.uid === donor.uid);
      if (matching) {
        setDonor(matching);
      }
    };

    const unsubscribe = store.subscribe(handleStoreUpdate);
    return unsubscribe;
  }, [donor.uid, user]);

  // Also update if initialDonor prop updates
  useEffect(() => {
    setDonor(initialDonor);
  }, [initialDonor]);

  // Dynamic Firestore Profile listener and fetch for real-time age, phone, and donor details
  const [firestoreSyncStatus, setFirestoreSyncStatus] = useState<"synced" | "syncing" | "offline">("syncing");

  useEffect(() => {
    if (!donor?.uid || dataSourceMode === "demo") return;

    setFirestoreSyncStatus("syncing");
    const donorDocRef = doc(db, "donors", donor.uid);

    // Initial getDoc to fetch age & phone directly from the Firestore profile
    getDoc(donorDocRef)
      .then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDonor((prev) => {
            const rawAge = data.age;
            const newAge = typeof rawAge === "number" ? rawAge : (Number(rawAge) || prev.age || 28);
            const newPhone = data.phone ? String(data.phone).trim() : (prev.phone || "+91 94432 10987");
            return {
              ...prev,
              ...data,
              age: newAge,
              phone: newPhone
            };
          });
          setFirestoreSyncStatus("synced");
        } else {
          // If document doesn't exist yet in Firestore, seed this donor doc so it persists
          setDoc(donorDocRef, donor, { merge: true })
            .then(() => setFirestoreSyncStatus("synced"))
            .catch(() => setFirestoreSyncStatus("offline"));
        }
      })
      .catch((err) => {
        try {
          handleFirestoreError(err, OperationType.GET, `donors/${donor.uid}`);
        } catch {
          // Handled
        }
        setFirestoreSyncStatus("offline");
      });

    // Real-time snapshot listener: dynamically updates if age, phone or other profile fields change in Firestore
    const unsubscribe = onSnapshot(
      donorDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDonor((prev) => {
            const rawAge = data.age;
            const newAge = typeof rawAge === "number" ? rawAge : (Number(rawAge) || prev.age || 28);
            const newPhone = data.phone ? String(data.phone).trim() : (prev.phone || "+91 94432 10987");
            return {
              ...prev,
              ...data,
              age: newAge,
              phone: newPhone
            };
          });
          setFirestoreSyncStatus("synced");
        }
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.GET, `donors/${donor.uid}`);
        } catch {
          // Handled
        }
        setFirestoreSyncStatus("offline");
      }
    );

    return () => unsubscribe();
  }, [donor.uid, dataSourceMode]);

  // Active donor to display (Live Firestore vs Reference Demo)
  const activeDonor: Donor = useMemo(() => {
    if (dataSourceMode === "demo") return DEMO_REFERENCE_DONOR;
    return donor;
  }, [dataSourceMode, donor]);

  // Photo resolution: Use sample photos or custom uploaded photo
  const resolvedPhoto = useMemo(() => {
    if (activeDonor.profilePhotoUrl) {
      return { photoUrl: activeDonor.profilePhotoUrl, isDefault: false, label: "Custom" };
    }
    return getDonorPassPhotoUrl({
      fullName: activeDonor.fullName,
      explicitGender: activeDonor.gender,
      profilePhotoUrl: activeDonor.profilePhotoUrl,
      preferredAvatarKey
    });
  }, [activeDonor.fullName, activeDonor.gender, activeDonor.profilePhotoUrl, preferredAvatarKey]);

  // Registration date calculation
  const registrationDateDisplay = useMemo(() => {
    if (dataSourceMode === "demo") return "10 Oct 2025";
    if (activeDonor.createdAt) return formatDisplayDate(activeDonor.createdAt);
    if (user?.createdAt) return formatDisplayDate(user.createdAt);
    return "12 Jan 2026";
  }, [dataSourceMode, activeDonor.createdAt, user?.createdAt]);

  // Next Eligibility calculation
  const { nextEligibilityDisplay, isEligible } = useMemo(() => {
    if (dataSourceMode === "demo") {
      return { nextEligibilityDisplay: "31 Oct 2026", isEligible: false };
    }
    const now = new Date();
    let lastDate: Date | null = activeDonor.lastDonationDate ? new Date(activeDonor.lastDonationDate) : null;
    if (lastDate && isNaN(lastDate.getTime())) lastDate = null;

    if (!lastDate) {
      return { nextEligibilityDisplay: "Eligible Now", isEligible: true };
    }

    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + COOLDOWN_DAYS);

    const eligible = nextDate <= now;
    return {
      nextEligibilityDisplay: formatDisplayDate(nextDate.toISOString()),
      isEligible: eligible
    };
  }, [dataSourceMode, activeDonor.lastDonationDate]);

  // Last donation display
  const lastDonationDisplay = useMemo(() => {
    if (dataSourceMode === "demo") return "05 Sep 2026";
    return formatDisplayDate(activeDonor.lastDonationDate, "20 May 2025");
  }, [dataSourceMode, activeDonor.lastDonationDate]);

  // Donor ID
  const donorId = useMemo(() => {
    if (dataSourceMode === "demo") return "BD-2025-00001";
    return formatDonorId(activeDonor);
  }, [dataSourceMode, activeDonor]);

  // Location display
  const locationDisplay = useMemo(() => {
    if (dataSourceMode === "demo") return "Chennai, Tamil Nadu";
    const parts = [activeDonor.city || "Coimbatore", activeDonor.state || "Tamil Nadu"].filter(Boolean);
    return parts.join(", ");
  }, [dataSourceMode, activeDonor.city, activeDonor.state]);

  // Secure public verification URL for QR code encoding name, age, blood group, ID, location, phone
  const qrVerificationUrl = useMemo(() => {
    const origin = typeof window !== "undefined" && window.location?.origin ? window.location.origin : "https://hemolink.app";
    return generateDonorPassQrUrl(activeDonor, origin);
  }, [activeDonor]);

  // QR code verification URL payload
  const qrPayload = useMemo(() => {
    return qrVerificationUrl;
  }, [qrVerificationUrl]);

  // Verified recent donations history log for printable ledger (Portrait vs Landscape optimized)
  const recentDonations = useMemo(() => {
    const list: Array<{
      id: string;
      date: string;
      component: string;
      units: number;
      volumeMl: number;
      center: string;
      hemoglobin: string;
      bloodPressure: string;
      batchNumber: string;
      medicalOfficer: string;
      status: "Verified & Stored" | "Emergency Transfused" | "Dispatched";
    }> = [];

    const baseDate = donor.lastDonationDate ? new Date(donor.lastDonationDate) : new Date("2025-05-20");
    const count = Math.max(recentDonationsCount, 1);

    const facilities = [
      `${donor.city || "Coimbatore"} Govt Medical College Hospital`,
      `Apollo Blood Bank & Transfusion Center, ${donor.city || "Chennai"}`,
      `Rotary Central Blood Bank, ${donor.city || "Coimbatore"}`,
      `Red Cross Regional Blood Center, ${donor.state || "Tamil Nadu"}`,
      `Kovai Medical Center Blood Bank, ${donor.city || "Coimbatore"}`,
      `Sri Ramakrishna Hospital Transfusion Medicine, ${donor.city || "Coimbatore"}`
    ];

    const components = [
      { name: "Whole Blood", vol: 450, units: 1 },
      { name: "Platelets Apheresis", vol: 300, units: 2 },
      { name: "Packed Red Blood Cells", vol: 350, units: 1 },
      { name: "Fresh Frozen Plasma", vol: 250, units: 1 },
      { name: "Whole Blood", vol: 450, units: 1 },
      { name: "Cryoprecipitate", vol: 150, units: 1 }
    ];

    const officers = [
      "Dr. K. Ramanathan, MD (Transfusion)",
      "Dr. S. Meenakshi, MD (Pathology)",
      "Dr. A. Joseph, Medical Officer",
      "Dr. P. Sundaram, Blood Bank Superintendent"
    ];

    const statuses: Array<"Verified & Stored" | "Emergency Transfused" | "Dispatched"> = [
      "Emergency Transfused",
      "Verified & Stored",
      "Dispatched",
      "Verified & Stored"
    ];

    for (let i = 0; i < count; i++) {
      const entryDate = new Date(baseDate);
      entryDate.setDate(entryDate.getDate() - i * 65); // ~65 days cooldown between donations

      const comp = components[i % components.length];
      const facility = facilities[i % facilities.length];
      const officer = officers[i % officers.length];
      const status = statuses[i % statuses.length];
      const year = entryDate.getFullYear();
      const month = String(entryDate.getMonth() + 1).padStart(2, "0");
      const day = String(entryDate.getDate()).padStart(2, "0");

      list.push({
        id: `DON-${year}-${month}${day}-${101 + i}`,
        date: formatDisplayDate(entryDate.toISOString()),
        component: comp.name,
        units: comp.units,
        volumeMl: comp.vol,
        center: facility,
        hemoglobin: `${(14.0 + (i % 5) * 0.3).toFixed(1)} g/dL`,
        bloodPressure: `${118 + (i % 4) * 2}/${78 + (i % 3) * 2} mmHg`,
        batchNumber: `HL-${year}-B${String(840 + i * 17)}`,
        medicalOfficer: officer,
        status
      });
    }

    return list;
  }, [donor.lastDonationDate, donor.city, donor.state, recentDonationsCount]);

  // Current preview photo inside edit modal
  const currentEditPreviewUrl = useMemo(() => {
    if (editForm.profilePhotoUrl) return editForm.profilePhotoUrl;
    return getDonorPassPhotoUrl({
      fullName: editForm.fullName,
      explicitGender: editForm.gender,
      profilePhotoUrl: editForm.profilePhotoUrl,
      preferredAvatarKey
    }).photoUrl;
  }, [editForm.fullName, editForm.gender, editForm.profilePhotoUrl, preferredAvatarKey]);

  // Gallery / Device Photo File Upload Handler
  const handleUploadPhotoFile = async (file: File) => {
    try {
      const dataUrl = await processImageFile(file);
      setEditForm((prev) => ({ ...prev, profilePhotoUrl: dataUrl }));
      setPhotoSuccessMsg("Photo loaded from gallery successfully!");
      setTimeout(() => setPhotoSuccessMsg(null), 3500);
    } catch (err: any) {
      alert("Failed to process image: " + (err.message || "Unknown error"));
    }
  };

  // Google Profile Photo Handler
  const handleUseGooglePhoto = async () => {
    try {
      if (auth.currentUser?.photoURL) {
        setEditForm((prev) => ({ ...prev, profilePhotoUrl: auth.currentUser!.photoURL! }));
        setPhotoSuccessMsg("Applied your Google Account profile photo!");
        setTimeout(() => setPhotoSuccessMsg(null), 3500);
        return;
      }

      // If not yet available or user signed in anonymously, prompt Google sign-in
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      if (res.user?.photoURL) {
        setEditForm((prev) => ({ ...prev, profilePhotoUrl: res.user.photoURL! }));
        setPhotoSuccessMsg("Successfully loaded Google profile photo!");
        setTimeout(() => setPhotoSuccessMsg(null), 3500);
      } else {
        alert("No public photo found on this Google account. You can select a photo from your gallery or choose a preset.");
      }
    } catch (err: any) {
      console.warn("Could not retrieve Google profile photo:", err);
      alert("Unable to retrieve Google photo: " + (err.message || "Please select a photo from your gallery"));
    }
  };

  // Save manual edits and auto-update pass
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedAge = Number(editForm.age) || 28;
      const parsedPhone = editForm.phone.trim() || "+91 94432 10987";

      const updates: Partial<Donor> = {
        fullName: editForm.fullName.trim(),
        bloodGroup: editForm.bloodGroup as BloodGroup,
        gender: editForm.gender as Gender,
        age: parsedAge,
        phone: parsedPhone,
        city: editForm.city.trim(),
        state: editForm.state.trim(),
        pincode: editForm.pincode.trim(),
        profilePhotoUrl: editForm.profilePhotoUrl,
        isAvailable: editForm.isAvailable,
        donationCount: Number(editForm.donationCount) || 0,
        lastDonationDate: editForm.lastDonationDate || null
      };

      // Directly persist updates to Firestore to guarantee persistent sync across sessions
      if (donor.uid) {
        const donorDocRef = doc(db, "donors", donor.uid);
        await setDoc(donorDocRef, { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
        setFirestoreSyncStatus("synced");
      }

      // If updating current user's profile
      if (user && donor.uid === user.uid) {
        store.updateDonorProfile(updates);
      } else {
        store.updateDonorByUid(donor.uid, updates);
      }

      setDonor((prev) => ({
        ...prev,
        ...updates
      }));

      setShowEditModal(false);
    } catch (err: any) {
      console.warn("Could not save updates to Firestore:", err);
      try {
        handleFirestoreError(err, OperationType.WRITE, `donors/${donor.uid}`);
      } catch {
        // Handled
      }
      alert(err.message || "Failed to update profile");
    }
  };

  // Canvas capture library integration to download current QR code component as a clean PNG file for offline usage
  const handleDownloadQRCode = async (e?: React.MouseEvent, useBadgeLayout: boolean = false) => {
    if (e) {
      e.stopPropagation();
    }
    setIsDownloadingQr(true);
    try {
      // Primary capture target: clean QR code component container or modal badge container
      const targetElement = (useBadgeLayout && qrBadgeCaptureRef.current)
        ? qrBadgeCaptureRef.current
        : qrContainerRef.current || document.getElementById("donor-pass-qr-container");

      if (!targetElement) {
        throw new Error("Target QR code component not found for canvas capture.");
      }

      // Use canvas capture library (htmlToImage with html2canvas fallback) to render ultra-crisp 4x PNG
      let dataUrl: string;
      try {
        dataUrl = await htmlToImage.toPng(targetElement, {
          quality: 1.0,
          pixelRatio: 4, // 4x resolution for immaculate offline barcode & camera scanning
          backgroundColor: "#FFFFFF",
          cacheBust: true,
          style: {
            margin: "0",
            transform: "none",
            boxShadow: "none"
          }
        });
      } catch (primaryErr) {
        console.warn("Primary htmlToImage canvas capture failed, utilizing html2canvas fallback:", primaryErr);
        const canvas = await html2canvas(targetElement, {
          scale: 4,
          backgroundColor: "#FFFFFF",
          useCORS: true,
          logging: false
        });
        dataUrl = canvas.toDataURL("image/png");
      }

      // Format clean filename with donor ID, donor name, and blood group
      const cleanName = (activeDonor.fullName || "Donor").replace(/[^a-zA-Z0-9]/g, "_");
      const cleanBlood = (activeDonor.bloodGroup || "Blood").replace("+", "Pos").replace("-", "Neg");
      const suffix = useBadgeLayout ? "Badge" : "Offline";
      const filename = `HemoLink_QR_${donorId}_${cleanName}_${cleanBlood}_${suffix}.png`;

      // Trigger automatic browser download
      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setQrDownloadSuccess(true);
      setTimeout(() => setQrDownloadSuccess(false), 3500);
    } catch (err: any) {
      console.error("Failed to capture and download QR code PNG:", err);
      alert("Unable to generate clean PNG for QR code. Please try again.");
    } finally {
      setIsDownloadingQr(false);
    }
  };

  // Generate high quality composite PDF of front and back sides
  const handleDownloadPDF = async () => {
    const currentStamp = formatPrintTimestamp();
    setPrintedAt(currentStamp);
    setIsDownloading(true);
    try {
      const targetElement = bothCardsRef.current;
      if (!targetElement) throw new Error("Pass view not found");

      const imgData = await htmlToImage.toJpeg(targetElement, {
        quality: 0.98,
        pixelRatio: 3,
        backgroundColor: "#FFFFFF"
      });

      const rect = targetElement.getBoundingClientRect();
      const pdf = new jsPDF({
        orientation: printOrientation,
        unit: "px",
        format: printOrientation === "landscape"
          ? [Math.max(rect.width, rect.height) * 2, Math.min(rect.width, rect.height) * 2]
          : [Math.min(rect.width, rect.height) * 2, Math.max(rect.width, rect.height) * 2]
      });

      pdf.addImage(imgData, "JPEG", 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
      pdf.save(`Blood_Donation_Pass_${donor.fullName.replace(/\s+/g, "_")}_${printOrientation}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Failed to generate PDF pass. Please try printing directly.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Google Drive upload
  const handleSaveToDrive = async () => {
    setIsUploading(true);
    try {
      let token = (window as any)._googleOAuthToken;
      if (!token) {
        const provider = new GoogleAuthProvider();
        provider.addScope("https://www.googleapis.com/auth/drive.file");
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        token = credential?.accessToken;
        if (token) (window as any)._googleOAuthToken = token;
      }

      if (!token) throw new Error("Could not acquire Google Drive access.");

      const fileContent = `
OFFICIAL BLOOD DONOR PASS
===========================================
DONOR ID: ${donorId}
NAME: ${donor.fullName}
BLOOD GROUP: ${donor.bloodGroup}
LOCATION: ${locationDisplay}
STATUS: ${donor.isAvailable ? "AVAILABLE" : "COOLDOWN"}

BACK SIDE SPECIFICATIONS:
-------------------------------------------
DATE OF REGISTRATION: ${registrationDateDisplay}
LAST DONATION DATE: ${lastDonationDisplay}
TOTAL DONATIONS: ${donor.donationCount} Times
NEXT ELIGIBLE DONATION: ${nextEligibilityDisplay}

EMERGENCY HELPLINE: 1800-123-4567
WEBSITE: www.blooddonationapp.com
SUPPORT: support@blooddonationapp.com
===========================================
"Together, We Save Lives. Every Drop Counts."
`;

      const metadata = {
        name: `Donor_Pass_${donor.fullName.replace(/\s+/g, "_")}.txt`,
        mimeType: "text/plain"
      };

      const form = new FormData();
      form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
      form.append("file", new Blob([fileContent], { type: "text/plain" }));

      const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: form
      });

      if (response.ok) {
        alert("Donor Pass saved to your Google Drive successfully!");
      } else {
        const err = await response.text();
        alert("Failed to save to Drive: " + err);
      }
    } catch (e: any) {
      console.error(e);
      alert("Google Drive export error: " + e.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Bluetooth nearby printer pairing
  const handleConnectBluetoothPrinter = async () => {
    if (!(navigator as any)?.bluetooth) {
      setPrinterStatusMsg("Web Bluetooth is not supported in this browser. Connecting via nearby Wi-Fi / AirPrint printer instead.");
      setTimeout(() => setPrinterStatusMsg(null), 5000);
      return;
    }

    setIsScanningBluetooth(true);
    setPrinterStatusMsg("Scanning for nearby Bluetooth / Thermal card printers...");

    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          "000018f0-0000-1000-8000-00805f9b34fb",
          "49535343-fe7d-4ae5-8fa9-9fafd205e455",
          "e7810a71-73ae-499d-8c15-faa9aef0c3f2"
        ]
      });

      if (device) {
        setBluetoothDevice({ name: device.name || "Nearby Bluetooth Printer", id: device.id });
        setPrinterTarget("nearby-bluetooth");
        setPrinterStatusMsg(`Connected to nearby printer: ${device.name || "Bluetooth Device"}`);
        setTimeout(() => setPrinterStatusMsg(null), 4000);
      }
    } catch (err: any) {
      if (err.name !== "NotFoundError") {
        console.warn("Bluetooth device request cancelled or failed:", err);
        setPrinterStatusMsg("Bluetooth scan cancelled. Ready for Nearby Wi-Fi / AirPrint printer.");
        setTimeout(() => setPrinterStatusMsg(null), 4000);
      }
    } finally {
      setIsScanningBluetooth(false);
    }
  };

  const handleDisconnectBluetooth = () => {
    setBluetoothDevice(null);
    setPrinterTarget("nearby-wireless");
    setPrinterStatusMsg("Switched back to Nearby Wi-Fi / AirPrint printers.");
    setTimeout(() => setPrinterStatusMsg(null), 3500);
  };

  const handlePrint = () => {
    const currentStamp = formatPrintTimestamp();
    setPrintedAt(currentStamp);
    setIsPrinting(true);
    setShowPrintWarning(true);

    if (printerTarget === "nearby-bluetooth" && bluetoothDevice) {
      setPrintFeedback(`Connecting to nearby Bluetooth printer: ${bluetoothDevice.name}...`);
    } else {
      setPrintFeedback(`Connecting to nearby printer (AirPrint / Wi-Fi / Bluetooth)...`);
    }

    try {
      window.focus();
      const targetElement = bothCardsRef.current;

      if (targetElement) {
        // Remove any existing print iframe
        const oldIframe = document.getElementById("donor-pass-isolated-print-frame");
        if (oldIframe) {
          oldIframe.remove();
        }

        // Copy all stylesheets from current document for 1:1 fidelity
        const styleTags = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
          .map((node) => node.outerHTML)
          .join("\n");

        const isCR80 = printFormat === "cr80-card";
        const hasCutMarks = showCutMarks && printFormat === "a4-wallet";

        const printHtml = `
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="utf-8" />
              <title>Donor Identity Pass - ${donor.fullName} (Nearby Printer Ready)</title>
              ${styleTags}
              <style>
                @page {
                  size: ${isCR80 ? "85.6mm 54mm" : printOrientation};
                  margin: ${isCR80 ? "0" : printOrientation === "landscape" ? "5mm 6mm" : "6mm 8mm"};
                }
                *, *::before, *::after {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }
                html, body {
                  background: #ffffff !important;
                  color: #000000 !important;
                  margin: 0 !important;
                  padding: ${isCR80 ? "0" : printOrientation === "landscape" ? "3mm 5mm" : "5mm"} !important;
                  display: flex !important;
                  flex-direction: column !important;
                  justify-content: flex-start !important;
                  align-items: center !important;
                  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif !important;
                  -webkit-font-smoothing: antialiased !important;
                }
                .no-print {
                  display: none !important;
                }
                ${
                  hasCutMarks
                    ? `
                  .wallet-cut-guide-container {
                    border: 1.5px dashed #6b7280 !important;
                    border-radius: 18px !important;
                    padding: 10px !important;
                    margin: 0 auto 10px auto !important;
                    position: relative !important;
                    background: #fafafa !important;
                  }
                  .wallet-cut-label {
                    text-align: center !important;
                    font-size: 8pt !important;
                    font-family: monospace !important;
                    font-weight: bold !important;
                    color: #4b5563 !important;
                    margin-bottom: 8px !important;
                    letter-spacing: 0.5px !important;
                  }
                  .wallet-fold-axis {
                    text-align: center !important;
                    font-size: 7.5pt !important;
                    font-family: monospace !important;
                    color: #9ca3af !important;
                    margin-top: 8px !important;
                    border-top: 1px dashed #d1d5db !important;
                    padding-top: 4px !important;
                  }
                `
                    : ""
                }
                @media print {
                  body, body *, #donor-pass-printable-area, #donor-pass-printable-area *, .print-cards-wrapper, .print-cards-wrapper *, #donor-pass-front, #donor-pass-front *, #donor-pass-back, #donor-pass-back * {
                    visibility: visible !important;
                  }
                  .no-print, [data-no-print] {
                    display: none !important;
                    visibility: hidden !important;
                  }
                }
                .print-cards-wrapper {
                  display: flex !important;
                  flex-direction: ${printOrientation === "landscape" || isCR80 ? "row" : "column"} !important;
                  flex-wrap: wrap !important;
                  justify-content: center !important;
                  align-items: center !important;
                  gap: ${isCR80 ? "0" : "16px"} !important;
                  width: 100% !important;
                  max-width: ${isCR80 ? "100%" : printOrientation === "landscape" ? "1080px" : "820px"} !important;
                  margin: 0 auto !important;
                  visibility: visible !important;
                }
                .print-cards-wrapper > div {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  display: flex !important;
                  flex-direction: column !important;
                  align-items: center !important;
                  margin: 0 auto !important;
                  visibility: visible !important;
                }
                ${
                  isCR80
                    ? `
                  #donor-pass-front, #donor-pass-back {
                    width: 85.6mm !important;
                    height: 53.98mm !important;
                    min-height: 53.98mm !important;
                    border-radius: 3.18mm !important;
                    box-shadow: none !important;
                    border: none !important;
                  }
                `
                    : ""
                }
              </style>
            </head>
            <body id="donor-pass-isolated-body">
              ${
                hasCutMarks
                  ? `<div class="wallet-cut-guide-container" id="donor-pass-printable-area">
                      <div class="wallet-cut-label">✂ CUT ALONG DASHED BORDER • FOLD IN CENTER FOR STANDARD WALLET DONOR PASS</div>
                      <div class="print-cards-wrapper">
                        ${targetElement.innerHTML}
                      </div>
                      <div class="wallet-fold-axis">-------- FOLD LINE (CARD MEETS ISO 7810 ID-1 STANDARDS) --------</div>
                    </div>`
                  : `<div id="donor-pass-printable-area" class="print-cards-wrapper">
                      ${targetElement.innerHTML}
                    </div>`
              }
              <div style="margin-top: 12px; text-align: center; font-size: 8pt; font-family: monospace; color: #4b5563;">
                HemoLink Verified Donor Identity Pass • <strong>Printed on: ${currentStamp}</strong> • Setup: <strong>${printOrientation.toUpperCase()} (${printFormat.toUpperCase()})</strong> • Destination: <strong>${
                  bluetoothDevice ? bluetoothDevice.name : "Nearby Printer (AirPrint / Wi-Fi / Bluetooth)"
                }</strong> • ID: ${formatDonorId(donor)}
              </div>
            </body>
          </html>
        `;

        // 1. Try launching a dedicated top-level print window (allows OS native Nearby Printer discovery with full privileges)
        let printWin: Window | null = null;
        try {
          printWin = window.open("", "_blank", "width=900,height=800,menubar=no,toolbar=no,location=no,status=no");
        } catch {
          printWin = null;
        }

        if (printWin && !printWin.closed) {
          printWin.document.open();
          printWin.document.write(printHtml);
          printWin.document.close();
          printWin.focus();

          setTimeout(() => {
            try {
              printWin?.focus();
              printWin?.print();
              setPrintFeedback(`Nearby printer dialog open • Stamp: ${currentStamp}`);
            } catch (winErr) {
              console.warn("Print window invocation fallback:", winErr);
            }
            setIsPrinting(false);
            setTimeout(() => setPrintFeedback(null), 3500);
          }, 500);
          return;
        }

        // 2. Fallback to isolated hidden iframe if window.open is blocked by popup blockers in iframe sandbox
        const iframe = document.createElement("iframe");
        iframe.id = "donor-pass-isolated-print-frame";
        iframe.style.position = "fixed";
        iframe.style.left = "-9999px";
        iframe.style.top = "-9999px";
        iframe.style.width = "1024px";
        iframe.style.height = "850px";
        iframe.style.border = "0";
        iframe.style.opacity = "0.01";
        iframe.style.pointerEvents = "none";
        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(printHtml);
          iframeDoc.close();

          setTimeout(() => {
            try {
              if (iframe.contentWindow) {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
                setPrintFeedback(`Nearby printer dialog open • Stamp: ${currentStamp}`);
              } else {
                window.print();
              }
            } catch (err) {
              console.warn("Iframe print exception, using direct window.print:", err);
              window.focus();
              window.print();
            } finally {
              setTimeout(() => {
                try {
                  if (iframe.parentNode) {
                    iframe.parentNode.removeChild(iframe);
                  }
                } catch {
                  // ignored
                }
                setIsPrinting(false);
                setTimeout(() => setPrintFeedback(null), 3000);
              }, 1200);
            }
          }, 350);
          return;
        }
      }

      // 3. Ultimate direct fallback
      window.print();
      setPrintFeedback("Nearby printer dialog open");
    } catch (e: any) {
      console.warn("Print execution error, retrying directly:", e);
      try {
        window.print();
      } catch (err: any) {
        console.error("Direct print also blocked:", err);
        setPrintFeedback("Print dialog blocked. Exporting PDF pass instead...");
        setTimeout(() => {
          handleDownloadPDF();
        }, 600);
      }
    } finally {
      setTimeout(() => {
        setIsPrinting(false);
        setTimeout(() => setPrintFeedback(null), 3500);
      }, 1000);
    }
  };

  // Generate shareable URL with query param linking directly to this donor's digital pass
  const getPassShareUrl = () => {
    try {
      const url = new URL(window.location.origin + window.location.pathname);
      url.searchParams.set("passDonorId", donor.uid);
      return url.toString();
    } catch {
      return window.location.href;
    }
  };

  // Fallback clipboard copier when Web Share API is unsupported or declined
  const copyPassLinkToClipboard = async (urlToCopy: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(urlToCopy);
      } else {
        const tempInput = document.createElement("textarea");
        tempInput.value = urlToCopy;
        tempInput.style.position = "fixed";
        tempInput.style.opacity = "0";
        document.body.appendChild(tempInput);
        tempInput.focus();
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
      }
      setShareStatus("copied");
      setTimeout(() => setShareStatus("idle"), 3500);
    } catch (err) {
      console.error("Clipboard copy fallback failed:", err);
      setShareStatus("idle");
      alert(`Pass link for ${donor.fullName}:\n${urlToCopy}`);
    }
  };

  // Web Share API handler to share link to user's digital pass
  const handleShare = async () => {
    const shareUrl = getPassShareUrl();
    const shareData = {
      title: `${donor.fullName}'s Official Donor Identity Pass`,
      text: `Verify ${donor.fullName}'s verified Blood Donor Identity Pass (${donor.bloodGroup}, ID: ${donorId}). Every donor saves lives!`,
      url: shareUrl
    };

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        setShareStatus("shared");
        setTimeout(() => setShareStatus("idle"), 3500);
      } catch (err: any) {
        // User cancelling the system share dialog throws an AbortError
        if (err?.name === "AbortError") {
          return;
        }
        console.warn("Web Share API error, falling back to clipboard copy:", err);
        await copyPassLinkToClipboard(shareUrl);
      }
    } else {
      // Direct clipboard copy fallback for desktop browsers or environments without navigator.share
      await copyPassLinkToClipboard(shareUrl);
    }
  };

  return (
    <div
      id="donor-pass-modal-root"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 xs:p-3 sm:p-6 print:p-0 overflow-y-auto"
    >
      {/* Dark backdrop */}
      <div
        id="donor-pass-modal-backdrop"
        className="fixed inset-0 bg-black/85 backdrop-blur-md no-print"
        onClick={onClose}
      />

      {/* Edit Details Modal */}
      {showEditModal && (
        <div id="donor-pass-edit-modal" className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 no-print">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          <div className="relative w-full max-w-lg bg-[#141416] border border-border-dark rounded-2xl p-4 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 overflow-y-auto max-h-[92vh]">
            <div className="flex justify-between items-center pb-3 border-b border-border-dark">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white font-display flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-brand-red shrink-0" />
                  <span>Auto-Update Donor Pass Details</span>
                </h2>
                <p className="text-[10.5px] sm:text-[11px] text-text-muted">Changes instantly update the donor pass and your public profile.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-text-muted hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 pt-3.5 text-xs">
              <div>
                <label className="text-[10px] text-text-subtle font-mono uppercase block mb-1">Donor Full Name</label>
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full bg-[#1C1C20] border border-border-dark rounded-xl p-2.5 text-white font-semibold focus:border-brand-red outline-none text-xs sm:text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="text-[10px] text-text-subtle font-mono uppercase block mb-1">Blood Group</label>
                  <select
                    value={editForm.bloodGroup}
                    onChange={(e) => setEditForm({ ...editForm, bloodGroup: e.target.value as BloodGroup })}
                    className="w-full bg-[#1C1C20] border border-border-dark rounded-xl p-2.5 text-white font-semibold focus:border-brand-red outline-none"
                  >
                    {(["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"] as BloodGroup[]).map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-text-subtle font-mono uppercase block mb-1">Gender (Auto-detects Photo)</label>
                  <select
                    value={editForm.gender}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value as Gender })}
                    className="w-full bg-[#1C1C20] border border-border-dark rounded-xl p-2.5 text-white font-semibold focus:border-brand-red outline-none"
                  >
                    <option value="Male">Male (David M. Chen / S.S. Dinesh)</option>
                    <option value="Female">Female (Sarah J. Thompson)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="text-[10px] text-text-subtle font-mono uppercase block mb-1">Donor Age (Years)</label>
                  <input
                    type="number"
                    min="18"
                    max="65"
                    value={editForm.age}
                    onChange={(e) => setEditForm({ ...editForm, age: parseInt(e.target.value) || 18 })}
                    className="w-full bg-[#1C1C20] border border-border-dark rounded-xl p-2.5 text-white font-semibold focus:border-brand-red outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] text-text-subtle font-mono uppercase block mb-1">Mobile / Phone Number</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full bg-[#1C1C20] border border-border-dark rounded-xl p-2.5 text-white font-semibold focus:border-brand-red outline-none font-mono"
                    placeholder="+91 94432 10987"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="text-[10px] text-text-subtle font-mono uppercase block mb-1">City / District</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full bg-[#1C1C20] border border-border-dark rounded-xl p-2.5 text-white font-semibold focus:border-brand-red outline-none"
                    placeholder="e.g. Coimbatore"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] text-text-subtle font-mono uppercase block mb-1">State</label>
                  <input
                    type="text"
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    className="w-full bg-[#1C1C20] border border-border-dark rounded-xl p-2.5 text-white font-semibold focus:border-brand-red outline-none"
                    placeholder="e.g. Tamil Nadu"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="text-[10px] text-text-subtle font-mono uppercase block mb-1">Total Donations</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.donationCount}
                    onChange={(e) => setEditForm({ ...editForm, donationCount: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#1C1C20] border border-border-dark rounded-xl p-2.5 text-white font-semibold focus:border-brand-red outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-text-subtle font-mono uppercase block mb-1">Last Donation Date</label>
                  <input
                    type="date"
                    value={editForm.lastDonationDate}
                    onChange={(e) => setEditForm({ ...editForm, lastDonationDate: e.target.value })}
                    className="w-full bg-[#1C1C20] border border-border-dark rounded-xl p-2.5 text-white font-semibold focus:border-brand-red outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-[#1C1C20] border border-border-dark rounded-xl">
                <div>
                  <span className="text-white font-bold block text-xs">Availability Status</span>
                  <span className="text-[10px] text-text-muted">Display as AVAILABLE on card</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, isAvailable: !editForm.isAvailable })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    editForm.isAvailable ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {editForm.isAvailable ? "AVAILABLE" : "UNAVAILABLE"}
                </button>
              </div>

              {/* Photo / Avatar Section (Gallery, Google, Presets) */}
              <div id="donor-pass-photo-section" className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label
                    id="donor-pass-photo-label"
                    className="text-[10px] text-text-subtle font-mono uppercase block font-bold flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5 text-brand-red" />
                    <span>Photo / Avatar (Gallery, Google, Presets)</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] bg-rose-500/15 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded font-mono">
                      Gallery
                    </span>
                    <span className="text-[9px] bg-blue-500/15 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded font-mono">
                      Google
                    </span>
                    <span className="text-[9px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono">
                      Presets
                    </span>
                  </div>
                </div>

                {photoSuccessMsg && (
                  <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] rounded-xl flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{photoSuccessMsg}</span>
                  </div>
                )}

                {/* Current Active Photo Preview Card */}
                <div className="bg-[#1C1C22] border border-border-dark rounded-xl p-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative w-11 h-13 rounded-lg overflow-hidden border border-brand-red/50 bg-black shrink-0 shadow-sm">
                      <img
                        src={currentEditPreviewUrl}
                        alt="Donor avatar"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white font-bold text-xs truncate">
                          {editForm.profilePhotoUrl ? "Custom Photo Selected" : "Default Passport Photo"}
                        </span>
                        {editForm.profilePhotoUrl && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-text-muted truncate mt-0.5">
                        {editForm.profilePhotoUrl
                          ? "Loaded from gallery / device / Google."
                          : `Automatic passport photo based on ${editForm.gender || "donor"}.`}
                      </p>
                    </div>
                  </div>

                  {editForm.profilePhotoUrl && (
                    <button
                      type="button"
                      id="remove-custom-photo-btn"
                      onClick={() => {
                        setEditForm({ ...editForm, profilePhotoUrl: "" });
                        setPhotoSuccessMsg("Reset to standard sample passport photo.");
                        setTimeout(() => setPhotoSuccessMsg(null), 3000);
                      }}
                      className="text-red-400 hover:text-white bg-red-500/10 hover:bg-red-600 border border-red-500/30 px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                      title="Remove custom photo and reset to default"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                {/* Device Gallery / File Drag & Drop Zone */}
                <div
                  id="donor-pass-gallery-dropzone"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setIsDraggingFile(false);
                    if (e.dataTransfer.files?.[0]) {
                      handleUploadPhotoFile(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-3 text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                    isDraggingFile
                      ? "border-brand-red bg-brand-red/15 scale-[1.01]"
                      : "border-border-dark hover:border-brand-red/60 bg-[#17171B] hover:bg-[#1C1C22]"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    id="donor-pass-photo-file-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleUploadPhotoFile(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="w-8 h-8 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Choose Photo from Gallery / Device
                    </span>
                    <span className="text-[10px] text-text-muted block mt-0.5">
                      Tap or drag & drop (JPG, PNG, WebP from phone gallery or camera)
                    </span>
                  </div>
                </div>

                {/* Secondary Photo Source Buttons: Google & Curated Presets */}
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    id="donor-pass-google-photo-btn"
                    onClick={handleUseGooglePhoto}
                    className="p-2.5 rounded-xl bg-[#17171B] hover:bg-[#1C1C24] border border-border-dark hover:border-blue-500/50 text-white flex items-center gap-2 transition cursor-pointer text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
                      <Globe className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold block text-blue-200 truncate">
                        Google Photo
                      </span>
                      <span className="text-[9px] text-text-muted block truncate">
                        Use Google account
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    id="donor-pass-presets-toggle-btn"
                    onClick={() => setShowPresets((prev) => !prev)}
                    className={`p-2.5 rounded-xl border text-white flex items-center gap-2 transition cursor-pointer text-left ${
                      showPresets
                        ? "bg-amber-500/15 border-amber-500/40"
                        : "bg-[#17171B] hover:bg-[#1C1C24] border-border-dark hover:border-amber-500/50"
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold block text-amber-200 truncate">
                        Official Presets
                      </span>
                      <span className="text-[9px] text-text-muted block truncate">
                        {showPresets ? "Hide presets" : "View samples"}
                      </span>
                    </div>
                  </button>
                </div>

                {/* Curated Passport Samples Grid */}
                {showPresets && (
                  <div className="p-2.5 bg-[#141418] border border-amber-500/30 rounded-xl space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-amber-300 font-bold uppercase">
                        Select Standard Passport Avatar
                      </span>
                      <span className="text-[9px] text-text-muted">High-res medical style</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditForm({ ...editForm, profilePhotoUrl: SAMPLE_AVATARS.maleDavid });
                          setPhotoSuccessMsg("Applied David M. Chen passport avatar.");
                          setTimeout(() => setPhotoSuccessMsg(null), 3000);
                        }}
                        className="group p-1.5 rounded-lg bg-[#1C1C22] border border-border-dark hover:border-brand-red transition flex flex-col items-center gap-1 text-center cursor-pointer"
                      >
                        <img
                          src={SAMPLE_AVATARS.maleDavid}
                          alt="David"
                          className="w-10 h-12 object-cover rounded border border-border-dark group-hover:border-brand-red"
                        />
                        <span className="text-[9px] text-text-bright font-semibold truncate w-full">David M.</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditForm({ ...editForm, profilePhotoUrl: SAMPLE_AVATARS.maleDinesh });
                          setPhotoSuccessMsg("Applied S.S. Dinesh passport avatar.");
                          setTimeout(() => setPhotoSuccessMsg(null), 3000);
                        }}
                        className="group p-1.5 rounded-lg bg-[#1C1C22] border border-border-dark hover:border-brand-red transition flex flex-col items-center gap-1 text-center cursor-pointer"
                      >
                        <img
                          src={SAMPLE_AVATARS.maleDinesh}
                          alt="Dinesh"
                          className="w-10 h-12 object-cover rounded border border-border-dark group-hover:border-brand-red"
                        />
                        <span className="text-[9px] text-text-bright font-semibold truncate w-full">Dinesh S.</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditForm({ ...editForm, profilePhotoUrl: SAMPLE_AVATARS.femaleSarah });
                          setPhotoSuccessMsg("Applied Sarah J. Thompson passport avatar.");
                          setTimeout(() => setPhotoSuccessMsg(null), 3000);
                        }}
                        className="group p-1.5 rounded-lg bg-[#1C1C22] border border-border-dark hover:border-brand-red transition flex flex-col items-center gap-1 text-center cursor-pointer"
                      >
                        <img
                          src={SAMPLE_AVATARS.femaleSarah}
                          alt="Sarah"
                          className="w-10 h-12 object-cover rounded border border-border-dark group-hover:border-brand-red"
                        />
                        <span className="text-[9px] text-text-bright font-semibold truncate w-full">Sarah J.</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Optional Expandable Photo Link */}
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => setShowUrlFallback((prev) => !prev)}
                    className="text-[10px] text-text-muted hover:text-white flex items-center gap-1 cursor-pointer transition font-mono"
                  >
                    <Link2 className="w-2.5 h-2.5" />
                    <span>{showUrlFallback ? "Hide photo link field" : "Or paste image / Google Photos link"}</span>
                  </button>

                  {showUrlFallback && (
                    <div className="mt-1.5 animate-in fade-in duration-150">
                      <input
                        type="text"
                        value={editForm.profilePhotoUrl}
                        onChange={(e) => setEditForm({ ...editForm, profilePhotoUrl: e.target.value })}
                        placeholder="Paste image URL (e.g. Google Photos, Drive, web image)..."
                        className="w-full bg-[#1C1C20] border border-border-dark rounded-xl p-2 text-white text-[11px] focus:border-brand-red outline-none font-mono"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-surface-dark text-text-muted hover:text-white font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-brand-red hover:bg-brand-red-dark text-white font-bold shadow-lg flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Save & Auto-Update Pass</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Modal Container */}
      <div
        id="donor-pass-modal-window"
        className={`relative w-full ${
          printOrientation === "landscape" ? "max-w-6xl" : "max-w-5xl"
        } bg-[#0F0F12] border border-border-dark rounded-2xl sm:rounded-3xl shadow-2xl overflow-y-auto max-h-[96vh] z-10 my-auto animate-in fade-in zoom-in-95 duration-200 print:bg-white print:border-none print:shadow-none print:max-w-none print:overflow-visible transition-all duration-300`}
      >
        {/* Top Header Bar */}
        <div
          id="donor-pass-header-toolbar"
          className="sticky top-0 bg-[#0F0F12]/95 backdrop-blur-md border-b border-border-dark px-3 sm:px-6 py-2.5 sm:py-3 z-30 no-print flex items-center justify-between gap-2 sm:gap-3"
        >
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-brand-red/20 border border-brand-red/40 flex items-center justify-center text-brand-red shrink-0">
              <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-base font-extrabold text-white font-display flex items-center gap-1.5 sm:gap-2 truncate">
                <span className="truncate">Donor Identity Pass</span>
                <span className="text-[9px] sm:text-[10px] font-mono font-bold bg-brand-red/20 text-rose-300 border border-brand-red/40 px-1.5 sm:px-2 py-0.5 rounded-full shrink-0">
                  VERIFIED
                </span>
              </h1>
              <p className="text-[10px] sm:text-[11px] text-text-muted hidden sm:block truncate">
                Front & Back official layout matching certified ISO specifications
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Real-Time Firestore Sync Status Badge */}
            <div
              id="donor-pass-firestore-status"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#141418] border border-border-dark text-[10.5px] font-mono text-text-muted select-none"
              title="Donor profile attributes dynamically synchronized with Firebase Firestore in real-time"
            >
              <div className="flex items-center gap-1 text-emerald-400">
                <Cloud className={`w-3.5 h-3.5 ${firestoreSyncStatus === "syncing" ? "animate-pulse text-amber-400" : "text-emerald-400"}`} />
                <span className="font-bold">
                  {firestoreSyncStatus === "synced" ? "Firestore Synced" : firestoreSyncStatus === "syncing" ? "Syncing..." : "Offline Profile"}
                </span>
              </div>
              <span className="text-zinc-600">•</span>
              <span>Age: <strong className="text-white font-bold">{activeDonor.age || 28}</strong></span>
              <span className="text-zinc-600">•</span>
              <span className="truncate max-w-[130px] font-mono text-zinc-300">{activeDonor.phone || "+91 94432 10987"}</span>
            </div>

            {/* View Mode Toggle Buttons */}
            <div className="flex items-center bg-[#1A1A1E] p-0.5 sm:p-1 rounded-xl border border-border-dark text-[10px] sm:text-[11px]">
              <button
                type="button"
                onClick={() => setViewMode("both")}
                className={`px-2 sm:px-3 py-1 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                  viewMode === "both" ? "bg-brand-red text-white shadow" : "text-text-muted hover:text-white"
                }`}
              >
                Both
              </button>
              <button
                type="button"
                onClick={() => setViewMode("front")}
                className={`px-2 sm:px-3 py-1 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                  viewMode === "front" ? "bg-brand-red text-white shadow" : "text-text-muted hover:text-white"
                }`}
              >
                Front
              </button>
              <button
                type="button"
                onClick={() => setViewMode("back")}
                className={`px-2 sm:px-3 py-1 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                  viewMode === "back" ? "bg-brand-red text-white shadow" : "text-text-muted hover:text-white"
                }`}
              >
                Back
              </button>
            </div>

            {/* Quick Share Button in Header */}
            <button
              type="button"
              id="top-share-donor-pass-btn"
              onClick={handleShare}
              aria-label="Share Donor Identity Pass"
              title={
                shareStatus === "shared"
                  ? "Pass shared successfully!"
                  : shareStatus === "copied"
                  ? "Pass link copied to clipboard!"
                  : "Share digital pass (Web Share API)"
              }
              className="text-text-subtle hover:text-white bg-surface-dark hover:bg-zinc-800 p-1.5 sm:p-2 rounded-full transition shrink-0 flex items-center justify-center cursor-pointer"
            >
              {shareStatus !== "idle" ? (
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              ) : (
                <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-rose-300 hover:text-white" />
              )}
            </button>

            {/* Quick Download QR Code Button in Header */}
            <button
              type="button"
              id="top-download-qr-btn"
              onClick={(e) => handleDownloadQRCode(e)}
              disabled={isDownloadingQr}
              aria-label="Download QR Code as PNG"
              title={qrDownloadSuccess ? "QR Code PNG downloaded!" : "Download clean QR Code PNG for offline usage"}
              className="text-text-subtle hover:text-white bg-surface-dark hover:bg-zinc-800 p-1.5 sm:p-2 rounded-full transition shrink-0 flex items-center justify-center cursor-pointer"
            >
              {isDownloadingQr ? (
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-brand-red animate-spin" />
              ) : qrDownloadSuccess ? (
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              ) : (
                <QrCode className="w-4 h-4 sm:w-5 sm:h-5 text-rose-300 hover:text-white" />
              )}
            </button>

            {/* Quick Print Button in Header */}
            <button
              type="button"
              id="top-print-donor-pass-btn"
              onClick={handlePrint}
              disabled={isPrinting}
              aria-label="Connect to nearby printer and print pass"
              title="Connect to nearby printer (AirPrint / Wi-Fi / Bluetooth) and print pass"
              className={`p-1.5 sm:p-2 rounded-full transition shrink-0 flex items-center justify-center cursor-pointer ${
                isPrinting
                  ? "bg-red-900/70 text-rose-200 cursor-wait border border-red-700/60"
                  : "bg-red-950/70 hover:bg-[#8B0000] text-rose-200 hover:text-white border border-red-700/50 hover:border-red-500 shadow-sm active:scale-95"
              }`}
            >
              {isPrinting ? (
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-spin" />
              ) : (
                <Printer className="w-4 h-4 sm:w-5 sm:h-5 text-rose-200" />
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close pass modal"
              className="text-text-subtle hover:text-white bg-surface-dark hover:bg-zinc-800 p-1.5 sm:p-2 rounded-full transition shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Print Settings Warning Banner */}
        {showPrintWarning && (
          <div
            id="donor-pass-print-warning-banner"
            data-no-print
            className="no-print mx-3 sm:mx-6 mt-3 p-3 sm:p-3.5 bg-amber-500/15 border border-amber-500/40 rounded-2xl flex items-start sm:items-center justify-between gap-3 text-amber-200 shadow-lg shadow-amber-950/20 animate-fadeIn"
            role="alert"
          >
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/25 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              </div>
              <div className="text-xs sm:text-sm">
                <p className="font-bold text-amber-100 flex flex-wrap items-center gap-1.5">
                  <span>Print Quality Recommendation:</span>
                  <span className="text-amber-300 font-extrabold bg-amber-500/30 px-2 py-0.5 rounded text-[11px] sm:text-xs tracking-wide">
                    Enable &quot;Background Graphics&quot;
                  </span>
                </p>
                <p className="text-amber-200/90 text-[11px] sm:text-xs mt-0.5 leading-relaxed">
                  In your browser&apos;s print settings dialog (under <em>More settings</em> or <em>Options</em>), please ensure <strong>&quot;Background graphics&quot;</strong> is checked so that the crimson card header, blood group badge, and verification QR code print in full color.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPrintWarning(false)}
              title="Dismiss warning"
              aria-label="Dismiss print setting reminder"
              className="text-amber-400 hover:text-amber-200 hover:bg-amber-500/20 p-1.5 rounded-lg transition shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Dynamic Admin Freshness & Print Timestamp Banner in Modal Layout */}
        {printedAt && (
          <div
            id="donor-pass-print-timestamp-banner"
            data-no-print
            className="no-print mx-3 sm:mx-6 mt-3 p-3 sm:p-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl flex items-center justify-between gap-3 text-emerald-200 shadow-lg shadow-emerald-950/20 animate-fadeIn"
            role="status"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              </div>
              <div className="text-xs sm:text-sm min-w-0">
                <div className="font-bold text-emerald-100 flex flex-wrap items-center gap-1.5">
                  <span className="uppercase tracking-wider text-[10.5px] sm:text-xs font-mono text-emerald-300">
                    Admin Pass Verification:
                  </span>
                  <span className="text-emerald-100">Printed on:</span>
                  <span className="text-white font-extrabold font-mono bg-emerald-500/25 border border-emerald-500/40 px-2 py-0.5 rounded text-[11px] sm:text-xs tracking-wide">
                    {printedAt}
                  </span>
                </div>
                <p className="text-emerald-200/80 text-[11px] sm:text-xs mt-0.5 truncate">
                  Dynamic freshness stamp recorded upon print execution to verify pass authenticity.
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-900/40 px-2.5 py-1 rounded-lg border border-emerald-500/30 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verified Fresh</span>
            </div>
          </div>
        )}

        {/* Pass Render Canvas Area */}
        <div
          id="donor-pass-printable-area"
          className="p-2 xs:p-3 sm:p-8 bg-[#0B0B0E] flex justify-center items-center print:p-0 print:bg-white overflow-x-hidden"
        >
          <div
            ref={bothCardsRef}
            id="donor-pass-cards-wrapper"
            className={`flex flex-wrap items-start justify-center gap-6 sm:gap-8 print:gap-4 w-full transition-all duration-300 ${
              printOrientation === "landscape"
                ? "max-w-6xl print:max-w-none"
                : "max-w-4xl print:max-w-none"
            }`}
          >
            {/* ========================================================================= */}
            {/* FRONT SIDE CARD: Certified Healthcare Donor Identity Credential          */}
            {/* ========================================================================= */}
            {(viewMode === "both" || viewMode === "front") && (
              <div className="flex flex-col items-center w-full max-w-[calc(100vw-36px)] sm:max-w-[365px]">
                <div className="flex items-center justify-between w-full px-2 mb-2 sm:mb-3 no-print">
                  <span className="text-xs font-black uppercase tracking-widest text-text-muted font-mono flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-brand-red" />
                    FRONT SIDE
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    ISO-7810 ID-1
                  </span>
                </div>

                <div
                  ref={frontCardRef}
                  id="donor-pass-front"
                  className="w-full min-h-[640px] sm:h-[660px] bg-white rounded-[24px] overflow-hidden relative flex flex-col justify-between border-[2px] border-slate-300/85 ring-1 ring-black/5 select-none print:shadow-none print:border print:border-gray-300"
                  style={{
                    boxShadow: "0 22px 50px -12px rgba(128, 9, 27, 0.26), 0 8px 20px -6px rgba(0, 0, 0, 0.12), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.95), inset 0 -1.5px 2px rgba(0, 0, 0, 0.05)"
                  }}
                >
                  {/* Subtle Security Guilloche Watermark Grid */}
                  <div className="absolute inset-1 rounded-[21px] border border-rose-500/15 pointer-events-none z-30" />
                  <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#80091B_1px,transparent_1px)] [background-size:14px_14px]" />

                  {/* Top Header: Official National Registry Brand & EMV Microchip */}
                  <div className="pt-3 px-3.5 sm:px-4 pb-2 flex items-center justify-between bg-white relative z-10 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 shrink-0 flex items-center justify-center p-1 rounded-xl bg-gradient-to-br from-[#80091B] to-[#B31932] shadow-sm text-white">
                        <HemolinkIcon className="w-full h-full text-white" />
                      </div>
                      <div className="leading-tight text-left min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h2 className="text-[13px] sm:text-[14px] font-black text-[#80091B] tracking-tight uppercase font-display">
                            NATIONAL BLOOD REGISTRY
                          </h2>
                        </div>
                        <p className="text-[8.5px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                          Transfusion Authority • ISO 7810
                        </p>
                      </div>
                    </div>

                    {/* Physical EMV Microchip & Verified Badge */}
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-8 h-6 rounded bg-gradient-to-br from-amber-200 via-amber-300 to-amber-400 border border-amber-500/60 shadow-xs flex items-center justify-center p-0.5 relative overflow-hidden"
                        title="Secure Smart Card Microchip (ISO 7816)"
                      >
                        <div className="w-full h-full border border-amber-600/40 rounded-xs flex flex-col justify-between py-0.5 px-0.5">
                          <div className="w-full h-[1px] bg-amber-600/50" />
                          <div className="w-full h-[1px] bg-amber-600/50" />
                          <div className="w-full h-[1px] bg-amber-600/50" />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-300/80 px-1.5 py-0.5 rounded-md text-[8.5px] font-black text-emerald-800 uppercase tracking-wider shadow-2xs">
                        <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>VERIFIED</span>
                      </div>
                    </div>
                  </div>

                  {/* Arched Crimson Card Title Banner */}
                  <div
                    data-print-bg="crimson-banner"
                    className="relative bg-gradient-to-r from-[#80091B] via-[#9B1124] to-[#B31932] text-white py-2 px-3 text-center overflow-hidden shadow-xs"
                  >
                    <div className="relative z-10 flex items-center justify-center gap-2">
                      <svg className="w-5 h-3 text-white/70" viewBox="0 0 50 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M 0 10 L 15 10 L 20 2 L 25 18 L 30 7 L 35 12 L 50 10" />
                      </svg>
                      <h3 className="text-xs sm:text-[13px] font-black tracking-wider uppercase font-display text-white drop-shadow-xs">
                        DONOR IDENTITY PASS
                      </h3>
                      <svg className="w-5 h-3 text-white/70" viewBox="0 0 50 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M 0 10 L 15 10 L 20 2 L 25 18 L 30 7 L 35 12 L 50 10" />
                      </svg>
                    </div>
                    <p className="relative z-10 text-[8.5px] text-rose-100 font-medium tracking-wide">
                      Certified Lifesaver & Voluntary Blood Donor Credential
                    </p>
                  </div>

                  {/* Upper Identity Block: High-Quality Non-Distorted Portrait + Hero Identity Data */}
                  <div className="px-3.5 sm:px-4 pt-2.5 pb-1 relative z-20">
                    <div className="flex items-start gap-3">
                      {/* Biometric Portrait Frame (strictly non-distorted passport aspect ratio) */}
                      <div className="flex flex-col items-center shrink-0">
                        <div
                          data-print-bg="photo-frame"
                          className="w-[94px] sm:w-[100px] h-[120px] sm:h-[126px] rounded-xl border-[2.5px] border-white shadow-md bg-slate-100 overflow-hidden relative ring-1 ring-slate-300/80"
                        >
                          <img
                            src={resolvedPhoto.photoUrl}
                            alt={activeDonor.fullName}
                            crossOrigin="anonymous"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover object-top"
                          />
                          {/* Biometric Security Seal */}
                          <div className="absolute bottom-0 inset-x-0 bg-slate-900/80 backdrop-blur-xs py-0.5 text-center text-[7px] font-mono font-black text-white tracking-wider flex items-center justify-center gap-0.5">
                            <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                            <span>BIOMETRIC</span>
                          </div>
                        </div>
                      </div>

                      {/* Hero Donor Data Beside Portrait */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between h-[120px] sm:h-[126px] py-0.5">
                        {/* Full Name */}
                        <div className="min-w-0">
                          <h4
                            className="text-[15px] sm:text-[16.5px] font-black text-slate-900 font-display tracking-tight leading-tight line-clamp-2"
                            title={activeDonor.fullName}
                          >
                            {activeDonor.fullName}
                          </h4>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono mt-0.5">
                            {activeDonor.gender || "Certified"} Donor
                          </p>
                        </div>

                        {/* Donor ID with instant copy */}
                        <div className="bg-rose-50/80 border border-rose-200/90 rounded-xl px-2 py-1 flex items-center justify-between gap-1 shadow-2xs">
                          <div className="min-w-0">
                            <span className="text-[7.5px] font-bold font-mono text-[#80091B] uppercase tracking-wider block">
                              DONOR ID
                            </span>
                            <span className="text-[11.5px] sm:text-[12px] font-black font-mono tracking-wide text-[#80091B] truncate block">
                              {donorId}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleCopyDonorId}
                            title="Copy Donor ID"
                            aria-label="Copy Donor ID"
                            className="text-rose-700 hover:text-rose-900 p-1 rounded hover:bg-rose-100/70 transition shrink-0 cursor-pointer"
                          >
                            {copiedDonorId ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Blood Group Hero Badge */}
                        <div
                          id="donor-pass-blood-type-display"
                          data-print-bg="blood-badge-wrap"
                          className="bg-gradient-to-r from-[#80091B] to-[#B31932] text-white rounded-xl px-2.5 py-1 flex items-center justify-between shadow-xs border border-rose-400/30"
                        >
                          <div className="flex items-center gap-1.5">
                            <Droplet className="w-3.5 h-3.5 text-rose-200 fill-rose-200 shrink-0" />
                            <span className="text-[8.5px] font-black font-mono uppercase tracking-wider text-rose-100">
                              BLOOD GROUP
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[18px] sm:text-[20px] font-black font-display tracking-tight leading-none text-white drop-shadow-xs">
                              {activeDonor.bloodGroup}
                            </span>
                            <span className="text-[7.5px] font-bold font-mono text-rose-200 bg-black/20 px-1 py-0.5 rounded">
                              {activeDonor.bloodGroup.includes("+") ? "Rh+" : "Rh-"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Refined Modular Healthcare Data Grid: Clinical Credentials (Age & Mobile Number placed on Back Side for privacy) */}
                  <div className="px-3.5 sm:px-4 py-1.5 relative z-20">
                    <div className="bg-slate-50/90 rounded-2xl border border-slate-200/90 p-2 sm:p-2.5 grid grid-cols-2 gap-2 text-left shadow-2xs">
                      {/* Item 1: Location */}
                      <div className="flex items-start gap-1.5 min-w-0 bg-white/70 p-2 rounded-xl border border-slate-200/60">
                        <div className="w-5 h-5 rounded-md bg-rose-100/90 text-[#9E1027] flex items-center justify-center shrink-0 mt-0.5">
                          <MapPin className="w-3 h-3" />
                        </div>
                        <div className="min-w-0 leading-tight">
                          <p className="text-[8px] font-bold text-slate-500 uppercase font-mono">
                            LOCATION
                          </p>
                          <p className="text-[10.5px] sm:text-[11px] font-bold text-slate-900 truncate" title={locationDisplay}>
                            {locationDisplay}
                          </p>
                        </div>
                      </div>

                      {/* Item 2: Clinical Status */}
                      <div className="flex items-start gap-1.5 min-w-0 bg-white/70 p-2 rounded-xl border border-slate-200/60">
                        <div className="w-5 h-5 rounded-md bg-emerald-100/90 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                          <Activity className="w-3 h-3" />
                        </div>
                        <div className="min-w-0 leading-tight">
                          <p className="text-[8px] font-bold text-slate-500 uppercase font-mono">
                            STATUS
                          </p>
                          <div className="flex items-center gap-1">
                            <span className={`inline-flex items-center gap-1 font-black text-[10.5px] sm:text-[11px] ${
                              activeDonor.isAvailable ? "text-emerald-700" : "text-amber-700"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${activeDonor.isAvailable ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                              {activeDonor.isAvailable ? "AVAILABLE" : "COOLDOWN"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Item 3: Contributions */}
                      <div className="flex items-start gap-1.5 min-w-0 bg-white/70 p-2 rounded-xl border border-slate-200/60">
                        <div className="w-5 h-5 rounded-md bg-red-100/90 text-[#80091B] flex items-center justify-center shrink-0 mt-0.5">
                          <Heart className="w-3 h-3 fill-[#80091B]" />
                        </div>
                        <div className="min-w-0 leading-tight">
                          <p className="text-[8px] font-bold text-slate-500 uppercase font-mono">
                            CONTRIBUTIONS
                          </p>
                          <p className="text-[10px] sm:text-[10.5px] font-black text-slate-900 truncate">
                            {activeDonor.donationCount || 0} Donations ({getDonorSavedUnits(activeDonor)} Units)
                          </p>
                        </div>
                      </div>

                      {/* Item 4: Milestone Tier */}
                      <div className="flex items-start gap-1.5 min-w-0 bg-white/70 p-2 rounded-xl border border-slate-200/60">
                        <div className="w-5 h-5 rounded-md bg-amber-100/90 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                          <Award className="w-3 h-3" />
                        </div>
                        <div className="min-w-0 leading-tight">
                          <p className="text-[8px] font-bold text-slate-500 uppercase font-mono">
                            HONOR TIER
                          </p>
                          <p className="text-[10px] sm:text-[10.5px] font-black text-amber-900 truncate font-display">
                            {getMilestoneTier(getDonorSavedUnits(activeDonor)).name}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Clean, Scanable & Centered QR Code Section */}
                  <div
                    id="donor-pass-qr-section"
                    data-print-bg="qr-strip"
                    className="bg-gradient-to-r from-[#80091B] via-[#9B1124] to-[#750012] py-2.5 sm:py-3 px-4 flex items-center justify-center text-white relative z-20 shadow-xs"
                  >
                    {/* Unique Medium-Sized QR Code - Highly Visible & Easy to Scan on Mobile or Any Device */}
                    <div
                      ref={qrContainerRef}
                      id="donor-pass-qr-container"
                      data-print-bg="qr-box"
                      onClick={() => setShowQrModal(true)}
                      className="group bg-white p-2.5 rounded-2xl shadow-md border-2 border-white flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 aspect-square cursor-pointer hover:scale-102 transition relative overflow-hidden"
                      title="Click QR Code to view & download clean PNG for offline usage"
                    >
                      <QRCodeSVG
                        value={qrPayload}
                        className="w-full h-full aspect-square"
                        level="M"
                        includeMargin={false}
                      />
                      {/* Interactive hover overlay indicating click to download */}
                      <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-1 text-center no-print backdrop-blur-[0.5px]">
                        <Download className="w-5 h-5 text-rose-300 mb-0.5 animate-bounce" />
                        <span className="text-[8.5px] font-black uppercase tracking-wider leading-tight text-white">
                          Download QR
                        </span>
                        <span className="text-[7px] font-mono text-rose-200/90 mt-0.5">
                          Offline PNG
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Physical ID Card Bottom Security Strip */}
                  <div
                    data-print-bg="dark-strip"
                    className="bg-[#3D000C] py-1.5 px-3.5 flex items-center justify-between text-white text-[8px] sm:text-[8.5px] font-bold tracking-wide relative z-20"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Droplet className="w-2.5 h-2.5 text-rose-400 fill-rose-400 shrink-0" />
                      <span className="truncate font-mono">ISO-7810 ID-1 • CERTIFIED VOLUNTARY DONOR</span>
                    </div>
                    {printedAt ? (
                      <span className="text-[7.5px] text-rose-200 font-mono bg-black/40 px-1.5 py-0.5 rounded shrink-0 border border-rose-400/20">
                        Printed: {printedAt}
                      </span>
                    ) : (
                      <span className="text-[7.5px] text-rose-300/80 font-mono shrink-0">
                        24/7 Helpline: 1800-123-4567
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* BACK SIDE CARD: Clinical Transfusion Ledger & Medical Directives          */}
            {/* ========================================================================= */}
            {(viewMode === "both" || viewMode === "back") && (
              <div className="flex flex-col items-center w-full max-w-[calc(100vw-36px)] sm:max-w-[365px]">
                <div className="flex items-center justify-between w-full px-2 mb-2 sm:mb-3 no-print">
                  <span className="text-xs font-black uppercase tracking-widest text-text-muted font-mono flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-brand-red" />
                    BACK SIDE
                  </span>
                  <span className="text-[10px] font-mono text-rose-300 bg-rose-950/60 border border-rose-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-rose-300" />
                    CLINICAL RECORD
                  </span>
                </div>

                <div
                  ref={backCardRef}
                  id="donor-pass-back"
                  className="w-full min-h-[640px] sm:h-[660px] bg-white rounded-[24px] overflow-hidden relative flex flex-col justify-between border-[2px] border-slate-300/85 ring-1 ring-black/5 select-none print:shadow-none print:border print:border-gray-300"
                  style={{
                    boxShadow: "0 22px 50px -12px rgba(128, 9, 27, 0.26), 0 8px 20px -6px rgba(0, 0, 0, 0.12), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.95), inset 0 -1.5px 2px rgba(0, 0, 0, 0.05)"
                  }}
                >
                  {/* Subtle Security Guilloche Watermark Grid */}
                  <div className="absolute inset-1 rounded-[21px] border border-rose-500/15 pointer-events-none z-30" />
                  <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#80091B_1px,transparent_1px)] [background-size:14px_14px]" />

                  {/* Top Arched Crimson Red Banner with Healthcare Pulse */}
                  <div
                    data-print-bg="back-header"
                    className="bg-gradient-to-r from-[#80091B] via-[#9B1124] to-[#750012] text-white py-2.5 sm:py-3 px-3.5 sm:px-4 flex items-center justify-between shadow-xs relative z-10"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-white shrink-0 border border-white/20">
                        <Heart className="w-3.5 h-3.5 fill-white" />
                      </div>
                      <h3 className="text-xs sm:text-[13px] font-black tracking-wider uppercase font-display text-white">
                        TOGETHER, WE SAVE LIVES
                      </h3>
                    </div>
                    <span className="text-[8.5px] font-mono font-bold bg-white/20 px-2 py-0.5 rounded-full text-rose-100">
                      TRANSFUSION LOG
                    </span>
                  </div>

                  {/* Hero Quick-Reference Strip: Donor ID, Blood Group, Age & Mobile Number for Instant Triage */}
                  <div className="bg-rose-50/90 border-b border-rose-200/80 px-3.5 sm:px-4 py-1.5 grid grid-cols-2 gap-1.5 text-xs relative z-10">
                    <div className="flex items-center justify-between gap-1 min-w-0 bg-white/90 px-2 py-1 rounded-lg border border-rose-200/70 shadow-2xs">
                      <span className="text-[8px] font-bold font-mono text-slate-500 uppercase">ID:</span>
                      <span className="font-mono font-black text-[#80091B] text-[10.5px] sm:text-[11px] truncate">
                        {donorId}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1 shrink-0 bg-white/90 px-2 py-1 rounded-lg border border-rose-200/70 shadow-2xs">
                      <span className="text-[8px] font-bold font-mono text-slate-500 uppercase">GROUP:</span>
                      <span className="font-display font-black text-white bg-[#80091B] px-1.5 py-0.5 rounded text-[10.5px] sm:text-[11px] tracking-wide">
                        {activeDonor.bloodGroup}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1 min-w-0 bg-white/90 px-2 py-1 rounded-lg border border-rose-200/70 shadow-2xs">
                      <span className="text-[8px] font-bold font-mono text-slate-500 uppercase">AGE:</span>
                      <span className="font-mono font-black text-slate-900 text-[10.5px] sm:text-[11px] truncate">
                        {activeDonor.age || 28} Years
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1 min-w-0 bg-white/90 px-2 py-1 rounded-lg border border-rose-200/70 shadow-2xs">
                      <span className="text-[8px] font-bold font-mono text-slate-500 uppercase">PHONE:</span>
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="font-mono font-black text-slate-900 text-[10px] sm:text-[10.5px] truncate">
                          {activeDonor.phone || "+91 94432 10987"}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyPhone}
                          title="Copy mobile phone number"
                          className="text-slate-400 hover:text-emerald-700 p-0.5 transition shrink-0 cursor-pointer no-print"
                        >
                          {copiedPhone ? (
                            <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[2.5]" />
                          ) : (
                            <Copy className="w-2.5 h-2.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Clinical Timeline & Activity Card */}
                  <div className="px-3.5 sm:px-4 pt-2 pb-1 relative z-10">
                    <div className="bg-slate-50/90 rounded-2xl border border-slate-200/90 p-2.5 sm:p-3 space-y-1.5 text-[10px] sm:text-[10.5px] shadow-2xs">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5 gap-2">
                        <div className="flex items-center gap-1.5 text-slate-700 font-bold min-w-0">
                          <Calendar className="w-3.5 h-3.5 text-[#9E1027] shrink-0" />
                          <span className="uppercase tracking-wide text-[9px] sm:text-[9.5px] truncate">REGISTRATION DATE</span>
                        </div>
                        <div className="font-mono font-bold text-slate-900 shrink-0 text-[10px] sm:text-[10.5px]">
                          {registrationDateDisplay}
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5 gap-2">
                        <div className="flex items-center gap-1.5 text-slate-700 font-bold min-w-0">
                          <Droplet className="w-3.5 h-3.5 text-[#9E1027] fill-[#9E1027] shrink-0" />
                          <span className="uppercase tracking-wide text-[9px] sm:text-[9.5px] truncate">LAST DONATION</span>
                        </div>
                        <div className="font-mono font-bold text-slate-900 shrink-0 text-[10px] sm:text-[10.5px]">
                          {lastDonationDisplay}
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5 gap-2">
                        <div className="flex items-center gap-1.5 text-slate-700 font-bold min-w-0">
                          <Heart className="w-3.5 h-3.5 text-[#9E1027] fill-[#9E1027] shrink-0" />
                          <span className="uppercase tracking-wide text-[9px] sm:text-[9.5px] truncate">TOTAL CONTRIBUTIONS</span>
                        </div>
                        <div className="font-bold text-[#80091B] shrink-0 text-[10px] sm:text-[10.5px]">
                          {activeDonor.donationCount || 0} Donations ({getDonorSavedUnits(activeDonor)} Units)
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-0.5 gap-2">
                        <div className="flex items-center gap-1.5 text-slate-700 font-bold min-w-0">
                          <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="uppercase tracking-wide text-[9px] sm:text-[9.5px] truncate">NEXT ELIGIBILITY</span>
                        </div>
                        <div className="font-black text-emerald-700 shrink-0 text-[10px] sm:text-[10.5px]">
                          {nextEligibilityDisplay}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Clinical Protocols & Directives Box */}
                  <div className="px-3.5 sm:px-4 py-1 relative z-10">
                    <div className="border border-rose-200/80 bg-rose-50/40 rounded-2xl p-2.5 space-y-1 text-[9px] sm:text-[9.5px] text-slate-700 leading-snug shadow-2xs">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <div className="h-[1px] bg-rose-200 flex-1" />
                        <span className="text-[8.5px] font-black tracking-widest text-[#80091B] uppercase font-mono">
                          DONOR INSTRUCTIONS
                        </span>
                        <div className="h-[1px] bg-rose-200 flex-1" />
                      </div>

                      <div className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-[#9E1027] shrink-0 mt-0.5" />
                        <span>Carry this pass for all clinical blood donation drives & center check-ins.</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-[#9E1027] shrink-0 mt-0.5" />
                        <span>This credential is non-transferable and strictly tied to verified identity.</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-[#9E1027] shrink-0 mt-0.5" />
                        <span>Maintain good hydration and adequate rest prior to every donation.</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-[#9E1027] shrink-0 mt-0.5" />
                        <span>Final medical eligibility is confirmed on-site by transfusion officers.</span>
                      </div>
                    </div>
                  </div>

                  {/* In Case of Emergency Hotline Box */}
                  <div className="px-3.5 sm:px-4 py-1 relative z-10">
                    <div
                      data-print-bg="emergency-box"
                      className="bg-gradient-to-r from-rose-50 via-red-50/70 to-rose-50 border border-red-200/90 rounded-2xl p-2 sm:p-2.5 flex items-center justify-between gap-2 shadow-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#80091B] flex items-center justify-center text-white shrink-0 shadow-xs">
                          <PhoneCall className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                        <div className="text-left min-w-0 leading-tight">
                          <p className="text-[8.5px] sm:text-[9px] font-black text-[#80091B] uppercase tracking-wide truncate font-mono">
                            EMERGENCY HELPLINE
                          </p>
                          <p className="text-[8px] sm:text-[8.5px] text-slate-500 font-medium truncate">
                            24/7 National Blood Registry
                          </p>
                        </div>
                      </div>

                      <a
                        href="tel:1800-123-4567"
                        className="text-xs sm:text-[13px] font-black font-mono text-[#80091B] hover:underline shrink-0 bg-white px-2 py-1 rounded-lg border border-red-200 shadow-xs"
                      >
                        1800-123-4567
                      </a>
                    </div>
                  </div>

                  {/* Accredited Issuer & Certification Footer */}
                  <div className="px-3.5 sm:px-4 py-1 text-center flex flex-col items-center relative z-10">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 relative flex items-center justify-center shrink-0">
                        <HemolinkIcon className="w-full h-full text-[#9B1B28]" />
                      </div>
                      <div className="text-left leading-tight min-w-0">
                        <p className="text-[10px] sm:text-[11px] font-black text-slate-900 font-display truncate">
                          HemoLink Blood Donor Network
                        </p>
                        <p className="text-[8.5px] font-semibold text-slate-500 truncate">
                          Certified Transfusion & Registry Infrastructure
                        </p>
                      </div>
                    </div>

                    <div className="text-[8px] sm:text-[8.5px] text-slate-500 font-mono mt-0.5 flex items-center justify-center gap-2">
                      <span>🌐 hemolink.app</span>
                      <span>•</span>
                      <span>✉️ support@hemolink.app</span>
                    </div>
                  </div>

                  {/* Bottom Dark Security Strip */}
                  <div
                    data-print-bg="dark-strip"
                    className="bg-[#3D000C] py-1.5 px-3.5 text-white text-[8px] sm:text-[8.5px] font-bold tracking-wide flex items-center justify-between gap-1 relative z-10"
                  >
                    <div className="flex items-center gap-1 truncate">
                      <span className="truncate">Thank you for being a hero.</span>
                      <Heart className="w-2.5 h-2.5 text-rose-300 fill-rose-300 shrink-0" />
                    </div>
                    {printedAt ? (
                      <span className="text-[7.5px] sm:text-[8px] text-rose-200 font-mono bg-black/40 px-1.5 py-0.5 rounded shrink-0 border border-rose-400/20">
                        Printed: {printedAt}
                      </span>
                    ) : (
                      <span className="text-[7.5px] sm:text-[8px] text-rose-300/80 font-mono shrink-0">
                        Official Pass
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* OFFICIAL RECENT DONATIONS CLINICAL RECORD SHEET                           */}
            {/* Optimized for Portrait vs Landscape Print Page Setup                      */}
            {/* ========================================================================= */}
            {includeDonationsLog && (
              <div
                id="donor-pass-recent-donations-sheet"
                className={`w-full bg-white text-gray-900 rounded-3xl border border-gray-200 shadow-2xl overflow-hidden print:shadow-none print:border print:border-gray-300 print:rounded-2xl transition-all duration-300 ${
                  printOrientation === "landscape" ? "mt-4 sm:mt-6 max-w-6xl" : "mt-4 sm:mt-6 max-w-4xl"
                }`}
                style={{
                  boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.35)"
                }}
              >
                {/* Official Header Strip */}
                <div
                  data-print-bg="log-header"
                  className="bg-[#8B0000] px-4 sm:px-6 py-3 sm:py-3.5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-red-950"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-white shrink-0 border border-white/20">
                      <Droplet className="w-4 h-4 text-white fill-white" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base tracking-wide font-display text-white">
                        OFFICIAL BLOOD DONOR LOG & TRANSFUSION RECORD
                      </h3>
                      <p className="text-[10px] sm:text-[11px] text-red-100/90 font-medium">
                        Certified clinical record ledger • Blood transfusion history & component verification
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <span className="text-[9.5px] sm:text-[10px] font-mono bg-white/15 px-2.5 py-1 rounded-full border border-white/25 font-bold uppercase tracking-wider text-white">
                      {recentDonations.length} RECORDED DONATIONS
                    </span>
                    <span className="text-[9.5px] sm:text-[10px] font-mono bg-black/25 px-2 py-1 rounded-md border border-white/20 font-bold uppercase text-white">
                      A4 {printOrientation.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Donor Quick Summary Bar */}
                <div className="bg-rose-50/60 border-b border-rose-100 px-4 sm:px-6 py-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-[9.5px] font-bold text-gray-500 uppercase tracking-wide block">Donor Name</span>
                    <span className="font-black text-gray-900 text-xs sm:text-sm truncate block">{donor.fullName}</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-bold text-gray-500 uppercase tracking-wide block">Blood Group</span>
                    <span className="font-black text-[#8B0000] text-xs sm:text-sm block">{donor.bloodGroup}</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-bold text-gray-500 uppercase tracking-wide block">Donor ID</span>
                    <span className="font-mono font-bold text-gray-800 text-xs truncate block">{donorId}</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-bold text-gray-500 uppercase tracking-wide block">Total Recorded Units</span>
                    <span className="font-black text-gray-900 text-xs sm:text-sm block">{getDonorSavedUnits(donor)} Units Saved</span>
                  </div>
                </div>

                {/* Table Section: Dynamically Responsive to Portrait vs Landscape */}
                <div className="p-2 sm:p-4 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b-2 border-gray-300 bg-gray-100/90 text-[10px] sm:text-[11px] font-extrabold text-gray-700 uppercase tracking-wider">
                        <th className="py-2.5 px-2.5 text-center w-8">#</th>
                        <th className="py-2.5 px-2.5">Date</th>
                        <th className="py-2.5 px-2.5">Blood Component</th>
                        <th className="py-2.5 px-2.5 text-center">Units / Vol</th>
                        <th className="py-2.5 px-2.5">Blood Bank / Medical Center</th>
                        {printOrientation === "landscape" && (
                          <>
                            <th className="py-2.5 px-2.5">Hb & Vitals</th>
                            <th className="py-2.5 px-2.5 font-mono">Batch / Bag ID</th>
                          </>
                        )}
                        <th className="py-2.5 px-2.5">Officer & Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 font-medium text-gray-800">
                      {recentDonations.map((entry, idx) => (
                        <tr key={entry.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/70"}>
                          <td className="py-2.5 px-2.5 text-center font-mono font-bold text-gray-500">{idx + 1}</td>
                          <td className="py-2.5 px-2.5 font-bold text-gray-900 whitespace-nowrap">{entry.date}</td>
                          <td className="py-2.5 px-2.5 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 font-semibold text-gray-900">
                              <Droplet className="w-3 h-3 text-[#8B0000] fill-[#8B0000]" />
                              {entry.component}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                            <span className="bg-red-50 text-[#8B0000] border border-red-200 px-1.5 py-0.5 rounded font-bold font-mono text-[10px]">
                              {entry.volumeMl} ml ({entry.units}U)
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 font-semibold text-gray-800 max-w-[210px] truncate" title={entry.center}>
                            {entry.center}
                          </td>
                          {printOrientation === "landscape" && (
                            <>
                              <td className="py-2.5 px-2.5 whitespace-nowrap font-mono text-gray-700 text-[10.5px]">
                                <span className="font-bold text-gray-900">{entry.hemoglobin}</span> • {entry.bloodPressure}
                              </td>
                              <td className="py-2.5 px-2.5 font-mono text-gray-600 text-[10.5px] whitespace-nowrap">
                                {entry.batchNumber}
                              </td>
                            </>
                          )}
                          <td className="py-2.5 px-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0"></span>
                              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                                {entry.status}
                              </span>
                            </div>
                            <span className="text-[9.5px] text-gray-500 block truncate max-w-[150px]">
                              {entry.medicalOfficer}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Official Sign-off Footer */}
                <div className="bg-gray-50 border-t border-gray-200 px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-gray-600 text-[10.5px]">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      Certified by State Transfusion Medicine Council • ISO 15189 Quality Protocol
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[10px]">
                    <span>Printed on: <strong>{printedAt || formatPrintTimestamp()}</strong></span>
                    <span className="font-bold text-[#8B0000]">PAGE SETUP: {printOrientation.toUpperCase()} A4</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions Toolbar */}
        <div
          id="donor-pass-actions-toolbar"
          className="sticky bottom-0 bg-[#0F0F12]/95 backdrop-blur-md border-t border-border-dark px-3 sm:px-6 py-2.5 sm:py-3.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 z-30 no-print"
        >
          <div className="flex items-center gap-2 text-[11px] sm:text-xs text-text-muted self-start sm:self-auto">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                printFeedback
                  ? "bg-amber-400 animate-pulse"
                  : shareStatus !== "idle"
                  ? "bg-emerald-400 animate-ping"
                  : "bg-emerald-400 animate-pulse"
              }`}
            />
            {printFeedback ? (
              <span className="text-amber-300 font-semibold">{printFeedback}</span>
            ) : printedAt ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Pass printed on {printedAt}</span>
              </span>
            ) : shareStatus === "shared" ? (
              <span className="text-emerald-400 font-semibold">Pass shared successfully via Web Share</span>
            ) : shareStatus === "copied" ? (
              <span className="text-emerald-400 font-semibold">Pass link copied to clipboard</span>
            ) : (
              <span>Pass auto-synced with live database</span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-end gap-2 sm:gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              id="modify-donor-pass-btn"
              onClick={() => setShowEditModal(true)}
              className="px-2.5 sm:px-3.5 py-2 rounded-xl bg-surface-dark border border-border-dark text-text-subtle hover:text-white text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Modify Details</span>
            </button>

            <button
              type="button"
              id="share-donor-pass-btn"
              onClick={handleShare}
              title="Share digital pass with others via Web Share API or copy link"
              className={`px-2.5 sm:px-3.5 py-2 rounded-xl border text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm active:scale-95 cursor-pointer ${
                shareStatus !== "idle"
                  ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-300"
                  : "bg-surface-dark hover:bg-zinc-800 border-border-dark text-text-subtle hover:text-white"
              }`}
            >
              {shareStatus === "shared" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Shared!</span>
                </>
              ) : shareStatus === "copied" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-brand-red" />
                  <span>Share</span>
                </>
              )}
            </button>

            <button
              type="button"
              id="print-donor-pass-btn"
              onClick={handlePrint}
              disabled={isPrinting}
              title={`Connect to nearby printer (${bluetoothDevice ? bluetoothDevice.name : "AirPrint / Wi-Fi / Bluetooth"}) and print pass`}
              className={`px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-md active:scale-95 cursor-pointer ${
                isPrinting
                  ? "bg-red-900/70 text-rose-200 border border-red-700/60 cursor-wait"
                  : "bg-gradient-to-r from-[#8B0000] via-[#A00000] to-[#8B0000] hover:from-[#A00000] hover:to-[#700000] text-white border border-red-500/50 hover:border-red-400 shadow-red-950/40"
              }`}
            >
              {isPrinting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Connecting to Printer...</span>
                </>
              ) : (
                <>
                  <Radio className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
                  <span>Print to Nearby Printer</span>
                </>
              )}
            </button>

            {/* Download QR Code Button with canvas capture */}
            <button
              type="button"
              id="download-qr-code-btn"
              onClick={(e) => handleDownloadQRCode(e)}
              disabled={isDownloadingQr}
              className="px-2.5 sm:px-4 py-2 rounded-xl bg-surface-dark hover:bg-zinc-800 border border-border-dark text-text-subtle hover:text-white text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-xs"
              title="Download clean high-resolution PNG of the QR code for offline usage"
            >
              {isDownloadingQr ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-red" />
              ) : qrDownloadSuccess ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <QrCode className="w-3.5 h-3.5 text-brand-red" />
              )}
              <span>{qrDownloadSuccess ? "QR Saved" : "Download QR Code"}</span>
            </button>

            <button
              type="button"
              id="download-pdf-pass-btn"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="px-2.5 sm:px-4 py-2 rounded-xl bg-surface-dark border border-border-dark text-text-subtle hover:text-white text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            >
              {isDownloading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-red" />
              ) : (
                <Download className="w-3.5 h-3.5 text-brand-red" />
              )}
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              id="save-to-drive-btn"
              onClick={handleSaveToDrive}
              disabled={isUploading}
              className="px-3 sm:px-5 py-2 rounded-xl bg-brand-red hover:bg-brand-red-dark text-white text-[11px] sm:text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-lg transition disabled:opacity-50"
            >
              {isUploading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <HardDrive className="w-3.5 h-3.5" />
              )}
              <span>Save to Drive</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dedicated QR Code Viewer & Offline PNG Capture Modal */}
      {showQrModal && (
        <div
          id="donor-qr-code-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="donor-qr-modal-title"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="bg-[#131318] border border-border-dark rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border-dark flex items-center justify-between bg-[#1A1A22]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-brand-red/20 border border-brand-red/40 flex items-center justify-center text-brand-red shrink-0 shadow-xs">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="donor-qr-modal-title" className="text-base font-extrabold text-white flex items-center gap-2">
                    <span>Donor Identity QR Code</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Offline Ready
                    </span>
                  </h3>
                  <p className="text-xs text-text-subtle">
                    High-resolution canvas capture for physical badges and mobile scanning
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="text-text-subtle hover:text-white bg-surface-dark hover:bg-zinc-800 p-2 rounded-full transition cursor-pointer shrink-0"
                aria-label="Close QR Modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 flex flex-col items-center gap-4.5 overflow-y-auto max-h-[78vh]">
              {/* Captured Clean QR Code & Emergency Pass Preview Container */}
              <div
                ref={qrBadgeCaptureRef}
                id="donor-qr-capture-preview"
                className="w-full max-w-[310px] bg-white text-slate-900 rounded-3xl p-5 border-2 border-slate-200 shadow-xl flex flex-col items-center text-center transition select-none"
              >
                {/* Header Branding */}
                <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                  <div className="flex items-center gap-1.5 text-[#9E1027]">
                    <HemolinkIcon className="w-5 h-5 text-[#9E1027]" />
                    <span className="font-black text-xs tracking-wider uppercase">
                      HemoLink
                    </span>
                  </div>
                  <span className="text-[9px] font-extrabold uppercase font-mono bg-rose-50 text-[#9E1027] border border-rose-200 px-2 py-0.5 rounded-md">
                    Verified Pass
                  </span>
                </div>

                {/* QR Code SVG */}
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-center">
                  <QRCodeSVG
                    value={qrPayload}
                    size={170}
                    level="M"
                    includeMargin={false}
                    className="aspect-square"
                  />
                </div>

                {/* Donor Credentials */}
                <div className="mt-3.5 w-full">
                  <h4 className="text-base font-black text-slate-900 tracking-tight leading-tight truncate">
                    {activeDonor.fullName}
                  </h4>
                  <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#9E1027] text-white text-[11px] font-black">
                      <Droplet className="w-3 h-3 fill-current" />
                      {activeDonor.bloodGroup}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                      {donorId}
                    </span>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-500 font-medium flex items-center justify-center gap-1.5">
                    <span>{activeDonor.donationCount || 0} Donations</span>
                    <span>•</span>
                    <span>{getDonorSavedUnits(activeDonor)} Units Saved</span>
                    <span>•</span>
                    <span>{activeDonor.city || "Tamil Nadu"}</span>
                  </div>
                </div>

                {/* Offline Guarantee Footer */}
                <div className="mt-3 pt-2.5 border-t border-slate-200/80 w-full flex items-center justify-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Offline Decodable by Any Camera</span>
                </div>
              </div>

              {/* Offline Notice & Info Card */}
              <div className="w-full bg-[#1A1A22] border border-border-dark rounded-2xl p-3 text-xs text-text-subtle space-y-1">
                <div className="flex items-center gap-2 text-white font-bold text-xs">
                  <Info className="w-4 h-4 text-brand-red shrink-0" />
                  <span>Offline Ready & Instant Scan</span>
                </div>
                <p className="text-[11px] leading-relaxed text-text-subtle">
                  This QR code encodes verified donor identity credentials, blood group, donation count, and security signature. Scannable offline by any smartphone camera.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="w-full space-y-2.5">
                {/* Primary Download QR Code Button */}
                <button
                  type="button"
                  id="modal-download-qr-code-btn"
                  onClick={(e) => handleDownloadQRCode(e, false)}
                  disabled={isDownloadingQr}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#9E1027] via-[#B81430] to-[#9E1027] hover:from-[#B81430] hover:to-[#850C1F] text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-rose-950/30 transition active:scale-98 cursor-pointer disabled:opacity-60"
                >
                  {isDownloadingQr ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Capturing Clean PNG...</span>
                    </>
                  ) : qrDownloadSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>QR Code PNG Downloaded!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-white" />
                      <span>Download QR Code (PNG)</span>
                    </>
                  )}
                </button>

                {/* Secondary: Download with Badge Layout */}
                <button
                  type="button"
                  id="modal-download-qr-badge-btn"
                  onClick={(e) => handleDownloadQRCode(e, true)}
                  disabled={isDownloadingQr}
                  className="w-full py-2.5 px-4 rounded-xl bg-surface-dark hover:bg-zinc-800 border border-border-dark text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
                >
                  <CreditCard className="w-3.5 h-3.5 text-rose-400" />
                  <span>Download as ID Badge Graphic (PNG)</span>
                </button>

                {/* Auxiliary options: Public Verification & Copy Link */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowQrModal(false);
                      if (onOpenVerification) {
                        onOpenVerification(donorId);
                      } else {
                        setShowVerificationModal(true);
                      }
                    }}
                    className="py-2 px-3 rounded-xl bg-[#1A1A22] hover:bg-zinc-800 border border-border-dark text-text-subtle hover:text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer truncate"
                  >
                    <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="truncate">Test Verification</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(qrVerificationUrl);
                        setCopiedQrPayload(true);
                        setTimeout(() => setCopiedQrPayload(false), 3000);
                      } catch {
                        // ignore
                      }
                    }}
                    className="py-2 px-3 rounded-xl bg-[#1A1A22] hover:bg-zinc-800 border border-border-dark text-text-subtle hover:text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer truncate"
                  >
                    {copiedQrPayload ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Copy QR Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Public Digital Verification Portal Modal */}
      {showVerificationModal && (
        <PublicDonorVerificationModal
          donorId={donorId}
          donors={store.getDonors()}
          onClose={() => setShowVerificationModal(false)}
        />
      )}
    </div>
  );
}
