import React, { useRef, useState, useEffect, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import * as htmlToImage from "html-to-image";
import jsPDF from "jspdf";
import { Donor, AppUser, BloodGroup, Gender } from "../types";
import { store } from "../lib/store";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../lib/firebase";
import {
  SAMPLE_AVATARS,
  getDonorPassPhotoUrl,
  determineGenderFromName
} from "../lib/donorPassPhotos";
import {
  Droplet,
  ShieldCheck,
  Printer,
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
  Download,
  RotateCcw,
  RefreshCw,
  Check,
  Info,
  User,
  CreditCard,
  PhoneCall,
  Clock,
  ExternalLink,
  Camera,
  Award,
  Share2
} from "lucide-react";
import { MilestoneBadge } from "./MilestoneBadge";
import { getDonorSavedUnits, getMilestoneTier } from "../lib/milestones";
import { HemolinkIcon } from "./HemolinkLogo";

interface DonorIdentityPassModalProps {
  donor: Donor;
  user?: AppUser | null;
  onClose: () => void;
}

const COOLDOWN_DAYS = 56;

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

// Format Donor ID strictly matching the reference card: BD-2026-00125
function formatDonorId(donor: Donor): string {
  const year = donor.createdAt ? new Date(donor.createdAt).getFullYear() : 2026;
  const numPart = donor.uid.replace(/\D/g, "");
  const suffix = (numPart || donor.uid.slice(-5)).padStart(5, "0").slice(-5).toUpperCase();
  return `BD-${year}-${suffix}`;
}

export default function DonorIdentityPassModal({
  donor: initialDonor,
  user,
  onClose
}: DonorIdentityPassModalProps) {
  const bothCardsRef = useRef<HTMLDivElement>(null);
  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);

  // Active donor state, auto-synced with store updates
  const [donor, setDonor] = useState<Donor>(initialDonor);
  const [viewMode, setViewMode] = useState<"both" | "front" | "back">("both");
  const [isFlipped, setIsFlipped] = useState(false);
  const [preferredAvatarKey, setPreferredAvatarKey] = useState<"auto" | "maleDavid" | "maleDinesh" | "femaleSarah">("auto");
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "shared" | "copied">("idle");

  // Edit form state
  const [editForm, setEditForm] = useState({
    fullName: donor.fullName,
    bloodGroup: donor.bloodGroup,
    gender: donor.gender,
    phone: donor.phone || "",
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
      phone: donor.phone || "",
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

  // Photo resolution: Use sample photos (Sarah J. Thompson for female, David M. Chen / Dinesh for male)
  const resolvedPhoto = useMemo(() => {
    return getDonorPassPhotoUrl({
      fullName: donor.fullName,
      explicitGender: donor.gender,
      profilePhotoUrl: donor.profilePhotoUrl,
      preferredAvatarKey
    });
  }, [donor.fullName, donor.gender, donor.profilePhotoUrl, preferredAvatarKey]);

  // Registration date calculation
  const registrationDateDisplay = useMemo(() => {
    if (donor.createdAt) return formatDisplayDate(donor.createdAt);
    if (user?.createdAt) return formatDisplayDate(user.createdAt);
    return "12 Jan 2026";
  }, [donor.createdAt, user?.createdAt]);

  // Next Eligibility calculation
  const { nextEligibilityDisplay, isEligible } = useMemo(() => {
    const now = new Date();
    let lastDate: Date | null = donor.lastDonationDate ? new Date(donor.lastDonationDate) : null;
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
  }, [donor.lastDonationDate]);

  // Last donation display
  const lastDonationDisplay = useMemo(() => {
    return formatDisplayDate(donor.lastDonationDate, "20 May 2025");
  }, [donor.lastDonationDate]);

  // Donor ID
  const donorId = useMemo(() => formatDonorId(donor), [donor]);

  // Location display
  const locationDisplay = useMemo(() => {
    const parts = [donor.city || "Coimbatore", donor.state || "Tamil Nadu"].filter(Boolean);
    return parts.join(", ");
  }, [donor.city, donor.state]);

  // QR code verification URL payload
  const qrPayload = useMemo(() => {
    return JSON.stringify({
      app: "Blood Donation App",
      type: "DONOR_PASS_VERIFIED",
      donorId,
      uid: donor.uid,
      name: donor.fullName,
      bloodGroup: donor.bloodGroup,
      location: locationDisplay,
      status: donor.isAvailable ? "AVAILABLE" : "COOLDOWN",
      savedUnits: getDonorSavedUnits(donor),
      donationCount: donor.donationCount || 0,
      lastDonationDate: donor.lastDonationDate || null,
      validUntil: "2027-12-31"
    });
  }, [donorId, donor.uid, donor.fullName, donor.bloodGroup, locationDisplay, donor.isAvailable, donor]);

  // Save manual edits and auto-update pass
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updates: Partial<Donor> = {
        fullName: editForm.fullName,
        bloodGroup: editForm.bloodGroup as BloodGroup,
        gender: editForm.gender as Gender,
        phone: editForm.phone,
        city: editForm.city,
        state: editForm.state,
        pincode: editForm.pincode,
        profilePhotoUrl: editForm.profilePhotoUrl,
        isAvailable: editForm.isAvailable,
        donationCount: Number(editForm.donationCount) || 0,
        lastDonationDate: editForm.lastDonationDate || null
      };

      // If updating current user's profile
      if (user && donor.uid === user.uid) {
        store.updateDonorProfile(updates);
      }

      setDonor((prev) => ({
        ...prev,
        ...updates
      }));

      setShowEditModal(false);
    } catch (err: any) {
      alert(err.message || "Failed to update profile");
    }
  };

  // Generate high quality composite PDF of front and back sides
  const handleDownloadPDF = async () => {
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
        orientation: rect.width > rect.height ? "landscape" : "portrait",
        unit: "px",
        format: [rect.width * 2, rect.height * 2]
      });

      pdf.addImage(imgData, "JPEG", 0, 0, rect.width * 2, rect.height * 2);
      pdf.save(`Blood_Donation_Pass_${donor.fullName.replace(/\s+/g, "_")}.pdf`);
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

  const handlePrint = () => {
    try {
      window.focus();
      window.print();
    } catch (e) {
      console.warn("Print execution error, retrying window.print():", e);
      window.print();
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

              <div>
                <label className="text-[10px] text-text-subtle font-mono uppercase block mb-1">Custom Photo URL (Optional)</label>
                <input
                  type="text"
                  value={editForm.profilePhotoUrl}
                  onChange={(e) => setEditForm({ ...editForm, profilePhotoUrl: e.target.value })}
                  placeholder="Leave empty to use automatic sample photos"
                  className="w-full bg-[#1C1C20] border border-border-dark rounded-xl p-2.5 text-white text-[11px] focus:border-brand-red outline-none"
                />
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
        className="relative w-full max-w-5xl bg-[#0F0F12] border border-border-dark rounded-2xl sm:rounded-3xl shadow-2xl overflow-y-auto max-h-[96vh] z-10 my-auto animate-in fade-in zoom-in-95 duration-200 print:bg-white print:border-none print:shadow-none print:max-w-none print:overflow-visible"
      >
        {/* Top Header Bar */}
        <div
          id="donor-pass-header-toolbar"
          className="sticky top-0 bg-[#0F0F12]/95 backdrop-blur-md border-b border-border-dark px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-3 z-30 no-print"
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
            {/* View Mode Toggle Buttons */}
            <div className="flex items-center bg-[#1A1A1E] p-0.5 sm:p-1 rounded-xl border border-border-dark text-[10px] sm:text-[11px]">
              <button
                type="button"
                onClick={() => setViewMode("both")}
                className={`px-2 sm:px-3 py-1 rounded-lg font-bold transition whitespace-nowrap ${
                  viewMode === "both" ? "bg-brand-red text-white shadow" : "text-text-muted hover:text-white"
                }`}
              >
                Both
              </button>
              <button
                type="button"
                onClick={() => setViewMode("front")}
                className={`px-2 sm:px-3 py-1 rounded-lg font-bold transition whitespace-nowrap ${
                  viewMode === "front" ? "bg-brand-red text-white shadow" : "text-text-muted hover:text-white"
                }`}
              >
                Front
              </button>
              <button
                type="button"
                onClick={() => setViewMode("back")}
                className={`px-2 sm:px-3 py-1 rounded-lg font-bold transition whitespace-nowrap ${
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

            {/* Quick Print Button in Header */}
            <button
              type="button"
              id="top-print-donor-pass-btn"
              onClick={handlePrint}
              aria-label="Print Donor Identity Pass"
              title="Print Donor Identity Pass (window.print)"
              className="text-text-subtle hover:text-white bg-surface-dark hover:bg-zinc-800 p-1.5 sm:p-2 rounded-full transition shrink-0"
            >
              <Printer className="w-4 h-4 sm:w-5 sm:h-5 text-rose-300 hover:text-white" />
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close pass modal"
              className="text-text-subtle hover:text-white bg-surface-dark hover:bg-zinc-800 p-1.5 sm:p-2 rounded-full transition shrink-0"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Pass Render Canvas Area */}
        <div
          id="donor-pass-printable-area"
          className="p-2 xs:p-3 sm:p-8 bg-[#0B0B0E] flex justify-center items-center print:p-0 print:bg-white overflow-x-hidden"
        >
          <div
            ref={bothCardsRef}
            id="donor-pass-cards-wrapper"
            className="flex flex-col lg:flex-row items-center justify-center gap-6 sm:gap-8 print:gap-4 print:flex-row print:justify-around w-full max-w-4xl"
          >
            {/* ========================================================================= */}
            {/* FRONT SIDE CARD (Exact Replica of Reference Design)                      */}
            {/* ========================================================================= */}
            {(viewMode === "both" || viewMode === "front") && (
              <div className="flex flex-col items-center w-full max-w-[340px] xs:max-w-[350px] sm:w-[360px]">
                <span className="text-xs font-black uppercase tracking-widest text-text-muted mb-2 sm:mb-3 font-mono no-print">
                  FRONT SIDE
                </span>

                <div
                  ref={frontCardRef}
                  id="donor-pass-front"
                  className="w-full min-h-[540px] sm:h-[550px] bg-white rounded-3xl shadow-2xl overflow-hidden relative flex flex-col justify-between border border-gray-200 select-none print:shadow-none print:border print:border-gray-300"
                  style={{
                    boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.5)"
                  }}
                >
                  {/* Top White Header with Logo & Brand */}
                  <div className="pt-3 sm:pt-3.5 px-4 sm:px-5 pb-2 sm:pb-2.5 flex items-center justify-start gap-2.5 sm:gap-3 bg-white z-10">
                    {/* Official Hemolink Emblem */}
                    <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 relative flex items-center justify-center p-0.5">
                      <HemolinkIcon className="w-full h-full text-[#9B1B28]" />
                    </div>

                    <div className="leading-tight text-left min-w-0">
                      <h2 className="text-[15px] sm:text-[17px] font-black text-[#9B1B28] tracking-tight uppercase font-display truncate">
                        HEMOLINK
                      </h2>
                      <p className="text-[10px] sm:text-[11px] font-bold">
                        <span className="text-gray-800">Donate Blood, </span>
                        <span className="text-[#9B1B28] font-extrabold">Save Lives</span>
                      </p>
                    </div>
                  </div>

                  {/* Arched Crimson Red Banner with Pulse & Subtitle */}
                  <div className="relative bg-gradient-to-b from-[#8B0000] via-[#A00000] to-[#700000] text-white pt-3.5 sm:pt-4 pb-12 sm:pb-14 px-3 sm:px-4 text-center overflow-hidden">
                    {/* Watermark Blood Drops & Crosses */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none flex justify-around items-center">
                      <Droplet className="w-20 h-20 -rotate-12 transform" />
                      <div className="text-6xl font-bold">+</div>
                      <Droplet className="w-16 h-16 rotate-12 transform" />
                    </div>

                    {/* Arched top overlay mask */}
                    <div className="absolute -top-6 left-0 right-0 h-6 bg-white rounded-b-[100%]" />

                    <div className="relative z-10 flex items-center justify-center gap-1.5 sm:gap-2">
                      {/* Pulse ECG Left */}
                      <svg className="w-6 sm:w-8 h-3.5 sm:h-4 text-white/80" viewBox="0 0 50 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M 0 10 L 15 10 L 20 2 L 25 18 L 30 7 L 35 12 L 50 10" />
                      </svg>

                      <h3 className="text-lg sm:text-xl font-black tracking-wider uppercase font-display text-white drop-shadow">
                        DONOR PASS
                      </h3>

                      {/* Pulse ECG Right */}
                      <svg className="w-8 h-4 text-white/80" viewBox="0 0 50 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M 0 10 L 15 10 L 20 2 L 25 18 L 30 7 L 35 12 L 50 10" />
                      </svg>
                    </div>

                    <p className="relative z-10 text-[10px] sm:text-[11px] text-rose-100 font-medium tracking-wide mt-0.5 sm:mt-1">
                      Thank you for being a lifesaver!
                    </p>
                  </div>

                  {/* Centered Circular Portrait Photo */}
                  <div className="relative -mt-10 sm:-mt-12 z-20 flex justify-center">
                    <div className="w-[88px] h-[88px] sm:w-[102px] sm:h-[102px] rounded-full border-4 border-white shadow-xl bg-gray-100 overflow-hidden relative">
                      <img
                        src={resolvedPhoto.photoUrl}
                        alt={donor.fullName}
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover object-center"
                      />
                    </div>
                  </div>

                  {/* Clean Information Table Card */}
                  <div className="px-3 sm:px-4 pt-2 sm:pt-2.5 pb-1.5 sm:pb-2 flex-1 flex flex-col justify-center">
                    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden divide-y divide-gray-100 text-[10.5px] sm:text-[11px]">
                      {/* Row 1: Donor ID */}
                      <div className="flex items-center px-2.5 sm:px-3 py-1.5 gap-2">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-[#A00000] flex items-center justify-center text-white shrink-0 shadow-xs">
                          <CreditCard className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </div>
                        <span className="font-bold text-gray-700 w-20 sm:w-24 shrink-0 uppercase tracking-wide text-[9.5px] sm:text-[10.5px]">
                          DONOR ID
                        </span>
                        <span className="text-gray-400 font-bold text-[10px] sm:text-[11px]">:</span>
                        <span className="font-extrabold text-[#B31D1D] font-mono tracking-wide text-[10.5px] sm:text-xs truncate">
                          {donorId}
                        </span>
                      </div>

                      {/* Row 2: Name */}
                      <div className="flex items-center px-2.5 sm:px-3 py-1.5 gap-2">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-[#A00000] flex items-center justify-center text-white shrink-0 shadow-xs">
                          <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </div>
                        <span className="font-bold text-gray-700 w-20 sm:w-24 shrink-0 uppercase tracking-wide text-[9.5px] sm:text-[10.5px]">
                          NAME
                        </span>
                        <span className="text-gray-400 font-bold text-[10px] sm:text-[11px]">:</span>
                        <span className="font-extrabold text-gray-900 truncate text-[11px] sm:text-xs" title={donor.fullName}>
                          {donor.fullName}
                        </span>
                      </div>

                      {/* Row 3: Blood Group */}
                      <div className="flex items-center px-2.5 sm:px-3 py-1.5 gap-2">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-[#A00000] flex items-center justify-center text-white shrink-0 shadow-xs">
                          <Droplet className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-white" />
                        </div>
                        <span className="font-bold text-gray-700 w-20 sm:w-24 shrink-0 uppercase tracking-wide text-[9.5px] sm:text-[10.5px]">
                          BLOOD GROUP
                        </span>
                        <span className="text-gray-400 font-bold text-[10px] sm:text-[11px]">:</span>
                        <span className="font-black text-[#B31D1D] text-xs sm:text-sm">
                          {donor.bloodGroup}
                        </span>
                      </div>

                      {/* Row 4: Location */}
                      <div className="flex items-center px-2.5 sm:px-3 py-1.5 gap-2">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-[#A00000] flex items-center justify-center text-white shrink-0 shadow-xs">
                          <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </div>
                        <span className="font-bold text-gray-700 w-20 sm:w-24 shrink-0 uppercase tracking-wide text-[9.5px] sm:text-[10.5px]">
                          LOCATION
                        </span>
                        <span className="text-gray-400 font-bold text-[10px] sm:text-[11px]">:</span>
                        <span className="font-bold text-gray-900 truncate text-[10px] sm:text-[11px]" title={locationDisplay}>
                          {locationDisplay}
                        </span>
                      </div>

                      {/* Row 5: Status */}
                      <div className="flex items-center px-2.5 sm:px-3 py-1.5 gap-2">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-[#A00000] flex items-center justify-center text-white shrink-0 shadow-xs">
                          <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </div>
                        <span className="font-bold text-gray-700 w-20 sm:w-24 shrink-0 uppercase tracking-wide text-[9.5px] sm:text-[10.5px]">
                          STATUS
                        </span>
                        <span className="text-gray-400 font-bold text-[10px] sm:text-[11px]">:</span>
                        <span
                          className={`font-black tracking-wide text-[10px] sm:text-[11px] ${
                            donor.isAvailable ? "text-[#00875A]" : "text-amber-600"
                          }`}
                        >
                          {donor.isAvailable ? "AVAILABLE" : "COOLDOWN"}
                        </span>
                      </div>

                      {/* Row 6: Milestone Badge */}
                      <div className="flex items-center px-2.5 sm:px-3 py-1.5 gap-2">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-[#A00000] flex items-center justify-center text-white shrink-0 shadow-xs">
                          <Award className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </div>
                        <span className="font-bold text-gray-700 w-20 sm:w-24 shrink-0 uppercase tracking-wide text-[9.5px] sm:text-[10.5px]">
                          MILESTONE
                        </span>
                        <span className="text-gray-400 font-bold text-[10px] sm:text-[11px]">:</span>
                        <div className="flex items-center truncate">
                          <MilestoneBadge donor={donor} variant="pill" className="py-0.5 px-1.5 text-[8.5px] sm:text-[9.5px]" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* QR Code & Scan verification strip */}
                  <div className="bg-[#7A0000] px-3.5 sm:px-5 py-2 sm:py-2.5 flex items-center justify-start gap-3 sm:gap-4">
                    <div
                      id="donor-pass-qr-container"
                      className="bg-white p-1 sm:p-1.5 rounded-lg shrink-0 shadow flex items-center justify-center w-14 h-14 sm:w-[60px] sm:h-[60px] aspect-square"
                    >
                      <QRCodeSVG
                        value={qrPayload}
                        className="w-full h-full aspect-square"
                        level="M"
                        includeMargin={false}
                      />
                    </div>

                    <div className="flex items-center gap-1.5 text-left text-white min-w-0">
                      <span className="text-xs shrink-0">◀</span>
                      <p className="text-[10.5px] sm:text-[11.5px] font-semibold leading-snug text-rose-50">
                        Scan this QR code to verify donor profile
                      </p>
                    </div>
                  </div>

                  {/* Bottom Dark Crimson Footer Strip */}
                  <div className="bg-[#520000] py-1.5 px-3 flex items-center justify-center gap-1.5 text-white text-[9.5px] sm:text-[10px] font-bold tracking-wide">
                    <ShieldCheck className="w-3.5 h-3.5 text-rose-300" />
                    <span>Every Drop Counts, Every Donor Matters</span>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* BACK SIDE CARD (Exact Replica of Reference Design)                       */}
            {/* ========================================================================= */}
            {(viewMode === "both" || viewMode === "back") && (
              <div className="flex flex-col items-center w-full max-w-[340px] xs:max-w-[350px] sm:w-[360px]">
                <span className="text-xs font-black uppercase tracking-widest text-text-muted mb-2 sm:mb-3 font-mono no-print">
                  BACK SIDE
                </span>

                <div
                  ref={backCardRef}
                  id="donor-pass-back"
                  className="w-full min-h-[540px] sm:h-[550px] bg-white rounded-3xl shadow-2xl overflow-hidden relative flex flex-col justify-between border border-gray-200 select-none print:shadow-none print:border print:border-gray-300"
                  style={{
                    boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.5)"
                  }}
                >
                  {/* Top Arched Crimson Red Banner */}
                  <div className="bg-[#8B0000] text-white py-2.5 sm:py-3 px-3 sm:px-4 flex items-center justify-center gap-2 rounded-b-2xl shadow-sm">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white flex items-center justify-center text-[#8B0000] shrink-0 shadow-xs">
                      <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </div>
                    <h3 className="text-xs sm:text-sm font-black tracking-wider uppercase font-display text-white">
                      TOGETHER, WE SAVE LIVES
                    </h3>
                  </div>

                  {/* History & Stats List (Registration, Last Donation, Total, Next Eligible) */}
                  <div className="px-3.5 sm:px-5 pt-2.5 sm:pt-3 pb-1 space-y-1.5 sm:space-y-2 text-[10px] sm:text-[11px]">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 gap-1.5">
                      <div className="flex items-center gap-1.5 sm:gap-2 text-gray-800 font-bold min-w-0">
                        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#A00000] shrink-0" />
                        <span className="uppercase tracking-wide text-[9px] sm:text-[10.5px] truncate">DATE OF REGISTRATION</span>
                      </div>
                      <div className="font-bold text-gray-900 shrink-0 text-[10px] sm:text-[11px]">
                        : <span className="ml-1">{registrationDateDisplay}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 gap-1.5">
                      <div className="flex items-center gap-1.5 sm:gap-2 text-gray-800 font-bold min-w-0">
                        <Droplet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#A00000] fill-[#A00000] shrink-0" />
                        <span className="uppercase tracking-wide text-[9px] sm:text-[10.5px] truncate">LAST DONATION DATE</span>
                      </div>
                      <div className="font-bold text-gray-900 shrink-0 text-[10px] sm:text-[11px]">
                        : <span className="ml-1">{lastDonationDisplay}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 gap-1.5">
                      <div className="flex items-center gap-1.5 sm:gap-2 text-gray-800 font-bold min-w-0">
                        <div className="flex -space-x-1 shrink-0">
                          <Droplet className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#A00000] fill-[#A00000]" />
                          <Droplet className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#A00000] fill-[#A00000]" />
                        </div>
                        <span className="uppercase tracking-wide text-[9px] sm:text-[10.5px] truncate">TOTAL DONATIONS</span>
                      </div>
                      <div className="font-black text-[#B31D1D] shrink-0 text-[10px] sm:text-[11px]">
                        : <span className="ml-1">{donor.donationCount || 0} Times</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 gap-1.5">
                      <div className="flex items-center gap-1.5 sm:gap-2 text-gray-800 font-bold min-w-0">
                        <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#A00000] shrink-0" />
                        <span className="uppercase tracking-wide text-[9px] sm:text-[10.5px] truncate">SAVED UNITS & BADGE</span>
                      </div>
                      <div className="font-black text-amber-700 font-mono shrink-0 text-[9.5px] sm:text-[10.5px]">
                        : <span className="ml-1">{getDonorSavedUnits(donor)} Units ({getMilestoneTier(getDonorSavedUnits(donor)).name})</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pb-1 gap-1.5">
                      <div className="flex items-center gap-1.5 sm:gap-2 text-gray-800 font-bold min-w-0">
                        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#A00000] shrink-0" />
                        <span className="uppercase tracking-wide text-[9px] sm:text-[10.5px] truncate">NEXT ELIGIBLE DONATION</span>
                      </div>
                      <div className="font-black text-[#00875A] shrink-0 text-[10px] sm:text-[11px]">
                        : <span className="ml-1">{nextEligibilityDisplay}</span>
                      </div>
                    </div>
                  </div>

                  {/* IMPORTANT Rules Box */}
                  <div className="px-3.5 sm:px-5">
                    {/* Centered Heading with Rule lines */}
                    <div className="flex items-center justify-center gap-2 my-0.5 sm:my-1">
                      <div className="h-[1px] bg-[#A00000] flex-1 max-w-[40px] sm:max-w-[50px]" />
                      <span className="text-[10px] sm:text-[11px] font-black tracking-widest text-[#8B0000] uppercase font-display">
                        IMPORTANT
                      </span>
                      <div className="h-[1px] bg-[#A00000] flex-1 max-w-[40px] sm:max-w-[50px]" />
                    </div>

                    <div className="border border-red-200/80 bg-white rounded-xl p-2 sm:p-2.5 space-y-1 sm:space-y-1.5 text-[9.5px] sm:text-[10.5px] text-gray-800 font-medium leading-tight">
                      <div className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#A00000] shrink-0 mt-0.5" />
                        <span>Please carry this pass when donating blood.</span>
                      </div>

                      <div className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#A00000] shrink-0 mt-0.5" />
                        <span>This pass is non-transferable.</span>
                      </div>

                      <div className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#A00000] shrink-0 mt-0.5" />
                        <span>Use your Donor ID for all communications.</span>
                      </div>

                      <div className="flex items-start gap-1.5">
                        <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-[#A00000] text-white flex items-center justify-center text-[8.5px] sm:text-[9px] font-black shrink-0 mt-0.5">
                          +
                        </span>
                        <span>Eligibility for donation is subject to medical assessment.</span>
                      </div>
                    </div>
                  </div>

                  {/* IN CASE OF EMERGENCY Hotline Box */}
                  <div className="px-3.5 sm:px-5 py-0.5 sm:py-1">
                    <div className="bg-[#FFF5F5] border border-red-200 rounded-xl p-2 sm:p-2.5 flex items-center justify-between gap-2 shadow-xs">
                      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#B31D1D] flex items-center justify-center text-white shrink-0 shadow-sm">
                          <PhoneCall className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-[9px] sm:text-[10px] font-black text-[#A00000] uppercase tracking-wide truncate">
                            IN CASE OF EMERGENCY
                          </p>
                          <p className="text-[8px] sm:text-[9px] text-gray-600 font-medium truncate">
                            Contact Blood Bank / Helpline
                          </p>
                        </div>
                      </div>

                      <a
                        href="tel:1800-123-4567"
                        className="text-xs sm:text-sm font-black font-mono text-[#B31D1D] hover:underline shrink-0 whitespace-nowrap"
                      >
                        1800-123-4567
                      </a>
                    </div>
                  </div>

                  {/* Blood Donation App Footer */}
                  <div className="px-3.5 sm:px-5 pt-0.5 sm:pt-1 pb-1.5 sm:pb-2 text-center flex flex-col items-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 relative flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
                          <path
                            d="M 20 60 C 20 82, 45 92, 50 92 C 55 92, 80 82, 80 60 C 80 50, 75 42, 68 45 C 62 48, 62 60, 50 78 C 38 60, 38 48, 32 45 C 25 42, 20 50, 20 60 Z"
                            fill="#C4161C"
                          />
                          <path
                            d="M 50 15 C 50 15, 26 48, 26 62 C 26 76, 36 86, 50 86 C 64 86, 74 76, 74 62 C 74 48, 50 15, 50 15 Z"
                            fill="#E5232A"
                          />
                          <path
                            d="M 50 50 C 47 45, 41 45, 38 48 C 35 52, 35 57, 38 61 L 50 72 L 62 61 C 65 57, 65 52, 62 48 C 59 45, 53 45, 50 50 Z"
                            fill="#FFFFFF"
                          />
                        </svg>
                      </div>

                      <div className="text-left leading-tight min-w-0">
                        <p className="text-[11px] sm:text-xs font-black text-gray-900 font-display truncate">
                          Blood Donation App
                        </p>
                        <p className="text-[9.5px] sm:text-[10px] font-bold text-[#A00000] truncate">
                          Donate Blood, Save Lives
                        </p>
                      </div>
                    </div>

                    <div className="text-[8px] sm:text-[9px] text-gray-600 font-mono mt-1 flex items-center justify-center gap-1.5 flex-wrap">
                      <span>🌐 blooddonationapp.com</span>
                      <span className="hidden xs:inline">|</span>
                      <span>✉️ support@blooddonationapp.com</span>
                    </div>
                  </div>

                  {/* Bottom Dark Crimson Strip */}
                  <div className="bg-[#520000] py-1.5 px-3 text-center text-white text-[9.5px] sm:text-[10px] font-bold tracking-wide flex items-center justify-center gap-1">
                    <span>Thank you for being a hero.</span>
                    <Heart className="w-3 h-3 text-rose-300 fill-rose-300" />
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
                shareStatus !== "idle" ? "bg-emerald-400 animate-ping" : "bg-emerald-400 animate-pulse"
              }`}
            />
            {shareStatus === "shared" ? (
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
              title="Print Donor Identity Pass (triggers browser window.print)"
              className="px-2.5 sm:px-3.5 py-2 rounded-xl bg-surface-dark hover:bg-zinc-800 border border-border-dark text-text-subtle hover:text-white text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm active:scale-95 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-brand-red" />
              <span>Print Pass</span>
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
    </div>
  );
}
