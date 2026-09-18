import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode, Html5QrcodeCameraScanConfig } from "html5-qrcode";
import jsQR from "jsqr";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "motion/react";
import {
  Camera,
  Upload,
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  RefreshCw,
  Award,
  Droplet,
  User,
  MapPin,
  Phone,
  Calendar,
  Sparkles,
  ExternalLink,
  Printer,
  ChevronRight,
  Info,
  Maximize2,
  Check
} from "lucide-react";
import { Donor, AppUser } from "../types";
import { store } from "../lib/store";
import { MilestoneBadge } from "./MilestoneBadge";
import {
  parseAndVerifyDonorPass,
  generateDonorPassQrPayload,
  formatDonorId,
  DonorPassVerificationResult
} from "../lib/donorVerification";
import { getDonorPassPhotoUrl } from "../lib/donorPassPhotos";

interface AdminQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminUser: AppUser;
  onOpenPassModal?: (donor: Donor) => void;
}

type ScanTab = "camera" | "upload" | "samples" | "manual";

// Simple synthesized beep sound for successful scan
function playScanChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12); // E6
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch {
    // AudioContext blocked or not allowed, ignore silently
  }
}

export function AdminQrScannerModal({
  isOpen,
  onClose,
  adminUser,
  onOpenPassModal
}: AdminQrScannerModalProps) {
  const [activeTab, setActiveTab] = useState<ScanTab>("camera");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [verificationResult, setVerificationResult] = useState<DonorPassVerificationResult | null>(null);
  const [manualInput, setManualInput] = useState<string>("");
  const [donationLoggedNotice, setDonationLoggedNotice] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const donors = store.getDonors();

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setVerificationResult(null);
      setDonationLoggedNotice(null);
      setCameraError(null);
    } else {
      stopCamera();
    }
  }, [isOpen]);

  // Clean up scanner when component unmounts or activeTab changes
  useEffect(() => {
    if (activeTab !== "camera") {
      stopCamera();
    } else if (isOpen && !verificationResult) {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [activeTab, isOpen, verificationResult]);

  // Stop camera helper
  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn("Failed to stop Html5Qrcode cleanly:", err);
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
  };

  // Start camera helper
  const startCamera = async () => {
    setCameraError(null);
    setIsScanning(true);

    try {
      // Ensure target element exists
      const readerElement = document.getElementById("admin-qr-reader");
      if (!readerElement) {
        setIsScanning(false);
        return;
      }

      // Stop any existing instance
      await stopCamera();

      const html5QrCode = new Html5Qrcode("admin-qr-reader");
      html5QrCodeRef.current = html5QrCode;

      // Query available cameras
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setAvailableCameras(devices.map((d) => ({ id: d.id, label: d.label || `Camera ${d.id.slice(0, 4)}` })));
          if (!selectedCameraId) {
            // Default to back/environment camera if available
            const backCam = devices.find((d) => d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("rear"));
            setSelectedCameraId(backCam ? backCam.id : devices[0].id);
          }
        }
      } catch (e) {
        console.warn("Could not list video devices, falling back to facingMode constraint", e);
      }

      const config: Html5QrcodeCameraScanConfig = {
        fps: 10,
        qrbox: { width: 240, height: 240 },
        aspectRatio: 1.0
      };

      const cameraIdOrConstraint = selectedCameraId ? selectedCameraId : { facingMode: "environment" };

      await html5QrCode.start(
        cameraIdOrConstraint,
        config,
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {
          // Frame scan failures are frequent before a QR code is centered, ignore
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error("Camera start error:", err);
      setIsScanning(false);
      setCameraError(
        err?.message ||
          "Camera access could not be initialized. Please grant camera permission, or use the 'Upload / Drop Pass Photo' tab."
      );
    }
  };

  // Reset / rescan next pass handler
  const handleRescanNext = () => {
    setVerificationResult(null);
    setDonationLoggedNotice(null);
    setActiveTab("camera");
    setTimeout(() => {
      startCamera();
    }, 60);
  };

  // Handle successful scan from any source
  const handleScanSuccess = (decodedText: string) => {
    playScanChime();
    stopCamera();

    const result = parseAndVerifyDonorPass(decodedText, store.getDonors());
    setVerificationResult(result);
    setDonationLoggedNotice(null);
    if (result.isValid) {
      setActiveTab("camera");
    }
  };

  // Image Upload / Drag and Drop Handler
  const handleImageUpload = async (file: File) => {
    setUploadLoading(true);
    setUploadError(null);

    try {
      // 1. Try with Html5Qrcode file scanner
      const tempScanner = new Html5Qrcode("admin-qr-temp-reader");
      try {
        const decoded = await tempScanner.scanFile(file, true);
        await tempScanner.clear();
        handleScanSuccess(decoded);
        setUploadLoading(false);
        return;
      } catch {
        await tempScanner.clear();
      }

      // 2. Fallback to jsQR via Canvas
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            setUploadError("Could not initialize 2D canvas context for QR decoding.");
            setUploadLoading(false);
            return;
          }
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0, img.width, img.height);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert"
          });

          if (code && code.data) {
            handleScanSuccess(code.data);
          } else {
            // Try inverted scan
            const invertedCode = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "onlyInvert"
            });
            if (invertedCode && invertedCode.data) {
              handleScanSuccess(invertedCode.data);
            } else {
              setUploadError("No valid QR code was detected in this image. Please ensure the QR code on the donor pass is clearly visible and well-lit.");
            }
          }
          setUploadLoading(false);
        };
        img.onerror = () => {
          setUploadError("Failed to load the selected image file.");
          setUploadLoading(false);
        };
        img.src = reader.result as string;
      };
      reader.onerror = () => {
        setUploadError("Failed to read image file.");
        setUploadLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error("Upload scanning error:", err);
      setUploadError("QR code processing failed. Please try another image or manual input.");
      setUploadLoading(false);
    }
  };

  // Admin logs a completed donation session
  const handleLogDonationNow = () => {
    if (!verificationResult) return;
    const targetDonor = verificationResult.matchedDonor;
    if (!targetDonor) {
      alert("Cannot log donation for unregistered/external pass record. Please register the donor first.");
      return;
    }

    // Add donation in store
    store.logMockDonation(5, targetDonor.uid); // adds 5 saved units and resets lastDonationDate to today

    // Refresh verification result with updated donor state
    const updatedDonor = store.getDonors().find((d) => d.uid === targetDonor.uid) || {
      ...targetDonor,
      donationCount: targetDonor.donationCount + 1,
      lastDonationDate: new Date().toISOString().split("T")[0],
      savedUnits: (targetDonor.savedUnits || 0) + 5
    };

    const rechecked = parseAndVerifyDonorPass(formatDonorId(updatedDonor), store.getDonors());
    setVerificationResult(rechecked);
    setDonationLoggedNotice(
      `✓ Donation session recorded! Added +5 saved units (${updatedDonor.donationCount} total sessions). WHO 56-day cooldown timer has been restarted from today.`
    );
  };

  // Toggle donor availability status
  const handleToggleAvailability = () => {
    if (!verificationResult?.matchedDonor) return;
    const d = verificationResult.matchedDonor;
    const newStatus = !d.isAvailable;
    store.adminUpdateDonor(d.uid, { isAvailable: newStatus });

    const updated = { ...d, isAvailable: newStatus };
    setVerificationResult({
      ...verificationResult,
      matchedDonor: updated,
      status: newStatus ? "AVAILABLE" : "COOLDOWN"
    });
  };

  // Admin renews expired pass (re-issuing with fresh 6-month clinical validity period)
  const handleRenewPass = () => {
    if (!verificationResult) return;
    const targetDonor = verificationResult.matchedDonor;
    const nowIso = new Date().toISOString();

    if (targetDonor) {
      store.adminUpdateDonor(targetDonor.uid, {
        updatedAt: nowIso
      });
    }

    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
    const newExpiry = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);

    const renewed: DonorPassVerificationResult = {
      ...verificationResult,
      isExpired: false,
      passTimestamp: nowIso,
      passTimestampFormatted: new Date(nowIso).toLocaleDateString("en-US", options),
      expiryDate: newExpiry.toISOString(),
      expiryDateFormatted: newExpiry.toLocaleDateString("en-US", options),
      daysExpired: 0,
      monthsElapsed: 0,
      warning: undefined
    };

    setVerificationResult(renewed);
    playScanChime();
    setDonationLoggedNotice(
      `✓ Donor pass renewed successfully for ${verificationResult.name}! New 6-month validity period active until ${renewed.expiryDateFormatted}.`
    );
  };

  if (!isOpen) return null;

  return (
    <div
      id="admin-qr-scanner-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Hidden container used for temporary file QR decoding */}
      <div id="admin-qr-temp-reader" className="hidden" />

      <div
        id="admin-qr-scanner-modal-container"
        className="bg-card-dark border-2 border-amber-500/40 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Banner */}
        <div className="bg-gradient-to-r from-amber-950/70 via-card-dark to-amber-950/40 px-5 py-4 border-b border-amber-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                  ADMIN VERIFICATION STATION
                </span>
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Ready
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold font-display text-text-bright mt-0.5">
                Scan & Verify Donor Pass
              </h3>
            </div>
          </div>

          <button
            id="admin-close-qr-scanner-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-surface-dark border border-border-dark text-text-muted hover:text-text-bright hover:bg-zinc-800 flex items-center justify-center transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex items-center border-b border-border-dark bg-surface-dark/50 px-4 pt-2 gap-1 overflow-x-auto no-scrollbar shrink-0">
          <button
            id="qr-tab-camera"
            onClick={() => setActiveTab("camera")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-xl transition cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === "camera"
                ? "border-amber-400 text-amber-400 bg-card-dark shadow-sm"
                : "border-transparent text-text-muted hover:text-text-bright"
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Live Camera</span>
            {verificationResult?.isValid && (
              verificationResult.isExpired ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse ml-0.5" title="Warning: Expired Pass" />
                  <span className="text-[9px] font-mono font-bold bg-red-500/25 text-red-300 px-1 py-0.2 rounded border border-red-500/50">
                    EXPIRED PASS
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" title="Pass Verified" />
                  <span className="text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded border border-emerald-500/40">
                    VERIFIED
                  </span>
                </>
              )
            )}
          </button>

          <button
            id="qr-tab-upload"
            onClick={() => setActiveTab("upload")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-xl transition cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === "upload"
                ? "border-amber-400 text-amber-400 bg-card-dark shadow-sm"
                : "border-transparent text-text-muted hover:text-text-bright"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Pass Photo</span>
          </button>

          <button
            id="qr-tab-samples"
            onClick={() => setActiveTab("samples")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-xl transition cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === "samples"
                ? "border-amber-400 text-amber-400 bg-card-dark shadow-sm"
                : "border-transparent text-text-muted hover:text-text-bright"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Sample Test Passes</span>
          </button>

          <button
            id="qr-tab-manual"
            onClick={() => setActiveTab("manual")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-xl transition cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === "manual"
                ? "border-amber-400 text-amber-400 bg-card-dark shadow-sm"
                : "border-transparent text-text-muted hover:text-text-bright"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Manual ID</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Global Notice Banner if donation was logged */}
          {donationLoggedNotice && (
            <div className="bg-emerald-950/60 border-2 border-emerald-500/60 text-emerald-200 p-3 rounded-xl text-xs flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">{donationLoggedNotice}</span>
            </div>
          )}

          {/* TAB 1: LIVE CAMERA VIEWPORT & VERIFIED CONFIRMATION BADGE */}
          {activeTab === "camera" && (
            <div className="space-y-4">
              {/* THE CAMERA VIEWPORT:
                  Replaced immediately with a 'Verified' confirmation badge and subtle visual indicator animation upon valid detection.
                  When unverified, shows the invalid notification with retry.
                  When not verified, displays the live camera stream.
              */}
              {verificationResult?.isValid ? (
                <div
                  id="admin-camera-verified-viewport"
                  className={`relative rounded-2xl overflow-hidden border-2 min-h-[320px] sm:min-h-[340px] flex flex-col items-center justify-center p-5 sm:p-6 text-center select-none shadow-xl ${
                    verificationResult.isExpired
                      ? "border-red-500/70 bg-gradient-to-b from-red-950/70 via-card-dark to-[#160a0a] shadow-red-950/50"
                      : "border-emerald-500/60 bg-gradient-to-b from-emerald-950/50 via-card-dark to-[#0a1410] shadow-emerald-950/40"
                  }`}
                >
                  {/* Subtle Radar Ripple Rings Radiating Outward */}
                  <motion.div
                    key={`pulse-1-${verificationResult.donorId}-${verificationResult.isExpired ? "exp" : "val"}`}
                    initial={{ scale: 0.6, opacity: 0.8 }}
                    animate={{ scale: 2.1, opacity: 0 }}
                    transition={{ duration: 1.0, ease: "easeOut" }}
                    className={`absolute w-44 h-44 rounded-full border-2 blur-sm pointer-events-none ${
                      verificationResult.isExpired
                        ? "border-red-400/70 bg-red-500/20"
                        : "border-emerald-400/70 bg-emerald-500/20"
                    }`}
                  />
                  <motion.div
                    key={`pulse-2-${verificationResult.donorId}-${verificationResult.isExpired ? "exp" : "val"}`}
                    initial={{ scale: 0.8, opacity: 0.4 }}
                    animate={{ scale: 2.7, opacity: 0 }}
                    transition={{ duration: 1.4, ease: "easeOut", delay: 0.12 }}
                    className={`absolute w-44 h-44 rounded-full border pointer-events-none ${
                      verificationResult.isExpired
                        ? "border-red-400/40"
                        : "border-emerald-400/40"
                    }`}
                  />

                  {/* Subtle Laser Sweep Flash on Lock */}
                  <motion.div
                    key={`sweep-${verificationResult.donorId}-${verificationResult.isExpired ? "exp" : "val"}`}
                    initial={{ y: "-100%", opacity: 0.8 }}
                    animate={{ y: "150%", opacity: 0 }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                    className={`absolute inset-x-0 h-1 pointer-events-none ${
                      verificationResult.isExpired
                        ? "bg-gradient-to-r from-transparent via-red-400 to-transparent shadow-[0_0_15px_#f87171]"
                        : "bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#34d399]"
                    }`}
                  />

                  {/* Confirmation Badge Container: 'Verified' or 'Warning: Expired Pass' */}
                  <motion.div
                    key={`badge-${verificationResult.donorId}-${verificationResult.isExpired ? "exp" : "val"}`}
                    initial={{ opacity: 0, scale: 0.88, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className="relative z-10 w-full max-w-md flex flex-col items-center"
                  >
                    {/* Animated Emblem: ShieldCheck for valid, ShieldAlert for expired */}
                    <motion.div
                      initial={{ scale: 0, rotate: -15 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 420, damping: 20, delay: 0.06 }}
                      className="relative mb-3"
                    >
                      {verificationResult.isExpired ? (
                        <>
                          <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-red-500/25 via-red-600/35 to-red-950/70 border-2 border-red-400 text-red-300 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.35)]">
                            <ShieldAlert className="w-9 h-9 sm:w-10 sm:h-10 text-red-400 stroke-[2.2]" />
                          </div>
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 18, delay: 0.2 }}
                            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center border-2 border-card-dark font-black shadow"
                          >
                            <Clock className="w-3.5 h-3.5 stroke-[3]" />
                          </motion.div>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-emerald-500/25 via-emerald-600/35 to-emerald-950/70 border-2 border-emerald-400 text-emerald-300 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.35)]">
                            <ShieldCheck className="w-9 h-9 sm:w-10 sm:h-10 text-emerald-300 stroke-[2.2]" />
                          </div>
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 18, delay: 0.2 }}
                            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center border-2 border-card-dark font-black shadow"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                          </motion.div>
                        </>
                      )}
                    </motion.div>

                    {/* Status Pill Badge: 'Warning: Expired Pass' with red badge vs 'VERIFIED OFFICIAL DONOR PASS' */}
                    {verificationResult.isExpired ? (
                      <motion.div
                        id="admin-expired-pass-badge"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.14 }}
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/25 border-2 border-red-500 text-red-200 font-mono text-[11px] font-extrabold tracking-wider uppercase mb-2.5 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse"
                      >
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        <span>Warning: Expired Pass</span>
                        <span className="text-[10px] bg-red-950/90 text-red-300 px-1.5 py-0.2 rounded border border-red-500/50 font-bold ml-0.5">
                          &gt; 6 Mos
                        </span>
                      </motion.div>
                    ) : (
                      <motion.div
                        id="admin-verified-pass-badge"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.14 }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-mono text-[11px] font-extrabold tracking-wider uppercase mb-3 shadow-inner"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>VERIFIED OFFICIAL DONOR PASS</span>
                      </motion.div>
                    )}

                    {/* Expired Pass Validity Warning Details Strip */}
                    {verificationResult.isExpired && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.18 }}
                        className="w-full bg-red-950/80 border border-red-500/50 rounded-xl px-3.5 py-2 mb-3 text-center space-y-0.5"
                      >
                        <div className="flex items-center justify-center gap-1.5 text-red-200 font-bold text-xs font-display">
                          <Clock className="w-3.5 h-3.5 text-red-400" />
                          <span>Standard 6-Month Clinical Validity Exceeded</span>
                        </div>
                        <p className="text-[11px] text-red-300/90 font-mono">
                          Issued: <span className="font-bold text-white">{verificationResult.passTimestampFormatted}</span> • Expired: <span className="font-bold text-red-200">{verificationResult.expiryDateFormatted}</span> ({verificationResult.monthsElapsed} mos ago)
                        </p>
                      </motion.div>
                    )}

                    {/* Authenticated Donor Profile Strip */}
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className={`w-full bg-surface-dark/95 border rounded-2xl p-3 sm:p-3.5 shadow-lg flex items-center justify-between gap-3 text-left mb-3.5 ${
                        verificationResult.isExpired ? "border-red-500/40" : "border-emerald-500/40"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={
                              verificationResult.matchedDonor
                                ? getDonorPassPhotoUrl({
                                    fullName: verificationResult.name,
                                    explicitGender: verificationResult.matchedDonor.gender,
                                    profilePhotoUrl: verificationResult.matchedDonor.profilePhotoUrl
                                  })
                                : "/avatars/male_passport_dinesh.jpg"
                            }
                            alt={verificationResult.name}
                            className={`w-12 h-12 sm:w-13 sm:h-13 rounded-xl object-cover border-2 shadow ${
                              verificationResult.isExpired ? "border-red-400/60" : "border-emerald-400/60"
                            }`}
                          />
                          <div className="absolute -bottom-1 -right-1 bg-brand-red text-white text-[9.5px] font-black px-1.5 py-0.2 rounded-md border border-white/40 shadow">
                            {verificationResult.bloodGroup}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-white truncate font-display">
                              {verificationResult.name}
                            </h4>
                            {verificationResult.isExpired && (
                              <span className="text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-red-500/30 text-red-300 border border-red-500/50 shrink-0">
                                Expired Pass
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs flex-wrap font-mono mt-0.5">
                            <span className="text-amber-400 font-bold">{verificationResult.donorId}</span>
                            <span className="text-zinc-600">•</span>
                            <span className={`font-bold ${verificationResult.status === "AVAILABLE" ? "text-emerald-400" : "text-amber-400"}`}>
                              {verificationResult.status}
                            </span>
                            <span className="text-zinc-600">•</span>
                            <span className="text-text-muted">{verificationResult.age || verificationResult.matchedDonor?.age || 28} Yrs</span>
                          </div>
                          <p className="text-[10.5px] text-text-muted truncate mt-0.5 font-mono">
                            {verificationResult.location || "Coimbatore, Tamil Nadu"} • {verificationResult.phone || verificationResult.matchedDonor?.phone || "+91 94432 10987"}
                          </p>
                        </div>
                      </div>
                    </motion.div>

                    {/* Quick Action Controls on the Badge */}
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.26 }}
                      className="flex items-center gap-2 flex-wrap justify-center w-full"
                    >
                      <button
                        id="admin-badge-scan-next-btn"
                        type="button"
                        onClick={handleRescanNext}
                        className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500 border border-amber-500/40 text-amber-300 hover:text-black rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Scan Next Pass</span>
                      </button>

                      {verificationResult.isExpired && (
                        <button
                          id="admin-badge-renew-btn"
                          type="button"
                          onClick={handleRenewPass}
                          className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-red-900/30"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Renew Pass (Reset 6 Mos)</span>
                        </button>
                      )}

                      <button
                        id="admin-badge-log-donation-btn"
                        type="button"
                        onClick={handleLogDonationNow}
                        disabled={!verificationResult.matchedDonor}
                        className="px-4 py-2 bg-brand-red hover:bg-brand-red-dark disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-brand-red/25"
                      >
                        <Droplet className="w-3.5 h-3.5 fill-white" />
                        <span>Log Donation (+5 Units)</span>
                      </button>

                      {verificationResult.matchedDonor && onOpenPassModal && (
                        <button
                          id="admin-badge-view-pass-btn"
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenPassModal(verificationResult.matchedDonor!);
                          }}
                          className="px-3 py-2 bg-surface-dark hover:bg-zinc-800 border border-border-dark text-text-bright rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Award className="w-3.5 h-3.5 text-amber-400" />
                          <span>Open Pass Card</span>
                        </button>
                      )}
                    </motion.div>
                  </motion.div>
                </div>
              ) : verificationResult && !verificationResult.isValid ? (
                /* Unverified / Invalid Pass Alert Replacing Camera View */
                <div className="relative rounded-2xl overflow-hidden border-2 border-red-500/50 bg-gradient-to-b from-red-950/40 via-card-dark to-surface-dark min-h-[260px] flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-text-bright">Unverified or Invalid QR Pass</h4>
                  <p className="text-xs text-red-300 max-w-sm">
                    {verificationResult.warning || "The scanned QR code could not be verified against the official hospital registry."}
                  </p>
                  <button
                    type="button"
                    onClick={handleRescanNext}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Live Scanner</span>
                  </button>
                </div>
              ) : (
                /* Live Camera Scanner View */
                <div className="space-y-3">
                  <div className="bg-black relative rounded-2xl overflow-hidden border border-border-dark min-h-[300px] flex items-center justify-center">
                    {/* Viewfinder Target / Overlay */}
                    <div id="admin-qr-reader" className="w-full h-full min-h-[300px]" />

                    {/* Camera Error Message fallback */}
                    {cameraError && (
                      <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                          <Camera className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-text-bright">Camera Not Available</h4>
                        <p className="text-xs text-text-muted max-w-sm">{cameraError}</p>
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                          <button
                            onClick={startCamera}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-lg transition cursor-pointer"
                          >
                            Retry Camera
                          </button>
                          <button
                            onClick={() => setActiveTab("upload")}
                            className="px-3 py-1.5 bg-surface-dark border border-border-dark text-text-bright font-semibold text-xs rounded-lg transition cursor-pointer"
                          >
                            Upload Photo Instead
                          </button>
                          <button
                            onClick={() => setActiveTab("samples")}
                            className="px-3 py-1.5 bg-surface-dark border border-border-dark text-amber-300 font-semibold text-xs rounded-lg transition cursor-pointer"
                          >
                            Try Sample Pass
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Camera Controls & Selector */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-text-muted">
                    <p className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>Align the QR code on the donor's ID card or mobile screen inside the frame.</span>
                    </p>

                    {availableCameras.length > 1 && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono">Camera:</span>
                        <select
                          value={selectedCameraId}
                          onChange={(e) => {
                            setSelectedCameraId(e.target.value);
                            startCamera();
                          }}
                          className="bg-surface-dark border border-border-dark text-text-bright rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-amber-400"
                        >
                          {availableCameras.map((cam) => (
                            <option key={cam.id} value={cam.id}>
                              {cam.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Clinical Details & WHO Matrix (rendered directly below the camera viewport when verified) */}
              {verificationResult && verificationResult.isValid && (
                <div className="space-y-4 animate-fadeIn pt-1">
                  {/* Warning: Expired Pass Callout Banner */}
                  {verificationResult.isExpired && (
                    <div
                      id="admin-expired-pass-callout"
                      className="bg-red-950/60 border-2 border-red-500/70 p-4 rounded-2xl text-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-red-950/30 animate-fadeIn"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
                          <AlertTriangle className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-sm text-red-100 uppercase tracking-wide font-display">
                              Warning: Expired Pass
                            </h4>
                            <span className="text-[10px] font-mono font-bold bg-red-500/30 text-red-200 px-2 py-0.5 rounded-full border border-red-500/60">
                              {verificationResult.daysExpired > 0 ? `${verificationResult.daysExpired} Days Overdue` : "Expired (>6 Months)"}
                            </span>
                          </div>
                          <p className="text-xs text-red-300/90 mt-1">
                            This digital donor pass was issued on <span className="font-bold text-white font-mono">{verificationResult.passTimestampFormatted}</span> and exceeded the standard 6-month validity period on <span className="font-bold text-red-200 font-mono">{verificationResult.expiryDateFormatted}</span> ({verificationResult.monthsElapsed} months elapsed). Administrative pass re-issue or renewal required.
                          </p>
                        </div>
                      </div>
                      <button
                        id="admin-renew-pass-details-btn"
                        type="button"
                        onClick={handleRenewPass}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shrink-0 whitespace-nowrap"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Renew Pass (Reset 6 Mos)</span>
                      </button>
                    </div>
                  )}

                  {/* Warning if external or not in local clinic db */}
                  {verificationResult.warning && !verificationResult.isExpired && (
                    <div className="bg-amber-950/40 border border-amber-500/40 p-3 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                      <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>{verificationResult.warning}</span>
                    </div>
                  )}

                  {/* Primary Verification Details Box */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Col 1: Identity & Photo */}
                    <div className="bg-surface-dark border border-border-dark p-4 rounded-2xl space-y-3 flex flex-col items-center text-center">
                      <div className="relative">
                        <img
                          src={
                            verificationResult.matchedDonor
                              ? getDonorPassPhotoUrl({
                                  fullName: verificationResult.name,
                                  explicitGender: verificationResult.matchedDonor.gender,
                                  profilePhotoUrl: verificationResult.matchedDonor.profilePhotoUrl
                                })
                              : "/avatars/male_passport_dinesh.jpg"
                          }
                          alt={verificationResult.name}
                          className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-500/50 shadow-md"
                        />
                        <div className="absolute -bottom-2 -right-2 bg-brand-red text-white text-xs font-black px-2 py-0.5 rounded-lg border border-white/40 shadow">
                          {verificationResult.bloodGroup}
                        </div>
                      </div>

                      <div>
                        <h5 className="text-sm font-bold text-text-bright">{verificationResult.name}</h5>
                        <p className="text-xs text-text-muted flex items-center justify-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-brand-red shrink-0" />
                          <span className="truncate">{verificationResult.location}</span>
                        </p>
                      </div>

                      <div className="w-full pt-2 border-t border-border-dark/60 space-y-1 text-xs text-left">
                        <div className="flex justify-between text-text-muted">
                          <span>Blood Group</span>
                          <span className="font-extrabold text-brand-red font-display">
                            {verificationResult.bloodGroup}
                          </span>
                        </div>
                        <div className="flex justify-between text-text-muted">
                          <span>Age</span>
                          <span className="font-bold text-amber-300 font-mono">
                            {verificationResult.age || verificationResult.matchedDonor?.age || 28} Years
                          </span>
                        </div>
                        <div className="flex justify-between text-text-muted">
                          <span>Mobile</span>
                          <span className="font-mono text-emerald-300 font-bold">
                            {verificationResult.phone || verificationResult.matchedDonor?.phone || "+91 94432 10987"}
                          </span>
                        </div>
                        <div className="flex justify-between text-text-muted">
                          <span>Pass Status</span>
                          <span
                            className={`font-bold font-mono text-[10px] ${
                              verificationResult.isExpired
                                ? "text-red-400 bg-red-950/50 px-1.5 py-0.2 rounded border border-red-500/40"
                                : verificationResult.status === "AVAILABLE"
                                ? "text-emerald-400"
                                : "text-amber-400"
                            }`}
                          >
                            {verificationResult.isExpired ? "EXPIRED (>6 MOS)" : verificationResult.status}
                          </span>
                        </div>
                        <div className="flex justify-between text-text-muted">
                          <span>Issued / Expired</span>
                          <span className={`font-mono text-[10px] font-semibold ${verificationResult.isExpired ? "text-red-300" : "text-text-subtle"}`}>
                            {verificationResult.passTimestampFormatted?.split(",")[0] || "Active"} / {verificationResult.expiryDateFormatted?.split(",")[0] || "6 Mos"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Col 2: WHO 56-Day Whole Blood Cooldown Matrix */}
                    <div className="bg-surface-dark border border-border-dark p-4 rounded-2xl space-y-3 md:col-span-2">
                      <div className="flex items-center justify-between border-b border-border-dark pb-2">
                        <div className="flex items-center gap-2">
                          <Droplet className="w-4 h-4 text-brand-red fill-brand-red" />
                          <h5 className="font-bold text-xs text-text-bright uppercase tracking-wider font-display">
                            WHO 56-Day Whole Blood Eligibility
                          </h5>
                        </div>
                        <span className="text-[9px] font-mono bg-zinc-800 text-text-subtle px-2 py-0.5 rounded">
                          Standard Protocol
                        </span>
                      </div>

                      {/* Eligibility Status Alert Box */}
                      <div
                        className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                          verificationResult.eligibility.isEligible
                            ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-200"
                            : "bg-amber-950/40 border-amber-500/50 text-amber-200"
                        }`}
                      >
                        {verificationResult.eligibility.isEligible ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        )}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">
                              {verificationResult.eligibility.isEligible
                                ? "CLEARED TO DONATE TODAY"
                                : `IN COOLDOWN (${verificationResult.eligibility.daysRemaining} DAYS REMAINING)`}
                            </span>
                          </div>
                          <p className="text-xs opacity-90 leading-relaxed">
                            {verificationResult.eligibility.recommendation}
                          </p>
                        </div>
                      </div>

                      {/* Cooldown Schedule Data */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                        <div className="bg-card-dark p-2.5 rounded-xl border border-border-dark/60 text-center">
                          <span className="text-[9px] text-text-subtle font-mono uppercase block">Last Donated</span>
                          <span className="font-mono font-bold text-text-bright text-[11px]">
                            {verificationResult.eligibility.lastDonatedFormatted}
                          </span>
                        </div>

                        <div className="bg-card-dark p-2.5 rounded-xl border border-border-dark/60 text-center">
                          <span className="text-[9px] text-text-subtle font-mono uppercase block">Next Eligible</span>
                          <span className="font-mono font-bold text-amber-400 text-[11px]">
                            {verificationResult.eligibility.nextDateFormatted}
                          </span>
                        </div>

                        <div className="bg-card-dark p-2.5 rounded-xl border border-border-dark/60 text-center">
                          <span className="text-[9px] text-text-subtle font-mono uppercase block">Total Sessions</span>
                          <span className="font-display font-extrabold text-brand-red text-sm">
                            {verificationResult.matchedDonor?.donationCount || 0} Times
                          </span>
                        </div>

                        <div className="bg-card-dark p-2.5 rounded-xl border border-border-dark/60 text-center">
                          <span className="text-[9px] text-text-subtle font-mono uppercase block">Saved Units</span>
                          <span className="font-display font-extrabold text-amber-400 text-sm">
                            {verificationResult.savedUnits} Units
                          </span>
                        </div>
                      </div>

                      {/* Gamified Milestone Pill */}
                      <div className="flex items-center justify-between bg-card-dark/80 p-2.5 rounded-xl border border-border-dark/60">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-amber-400" />
                          <span className="text-xs font-semibold text-text-bright">Lifesaver Rank</span>
                        </div>
                        {verificationResult.matchedDonor ? (
                          <MilestoneBadge donor={verificationResult.matchedDonor} variant="pill" />
                        ) : (
                          <span className="text-xs font-bold text-amber-400">{verificationResult.milestone.name}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Administrative Actions Bar */}
                  <div className="bg-surface-dark border border-border-dark p-4 rounded-2xl space-y-3">
                    <h5 className="text-xs font-bold text-text-bright uppercase tracking-wider font-display flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      <span>Administrative Clinic Actions</span>
                    </h5>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Action 1: Log whole blood donation now */}
                      <button
                        id="admin-log-donation-btn"
                        onClick={handleLogDonationNow}
                        disabled={!verificationResult.matchedDonor}
                        className="px-4 py-2.5 bg-brand-red hover:bg-brand-red-dark disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md shadow-brand-red/25"
                      >
                        <Droplet className="w-4 h-4 fill-white" />
                        <span>Check-In & Log Donation (+5 Units)</span>
                      </button>

                      {/* Action 1.5: Pass Expiry Renewal Action */}
                      {verificationResult.isExpired ? (
                        <button
                          id="admin-actions-renew-btn"
                          onClick={handleRenewPass}
                          className="px-3.5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-red-900/30"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Renew Expired Pass (Reset 6 Mos)</span>
                        </button>
                      ) : (
                        <div className="px-3 py-2 bg-card-dark border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-1.5 font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Pass Active ({verificationResult.expiryDateFormatted})</span>
                        </div>
                      )}

                      {/* Action 2: Toggle availability */}
                      {verificationResult.matchedDonor && (
                        <button
                          id="admin-toggle-availability-btn"
                          onClick={handleToggleAvailability}
                          className="px-3.5 py-2.5 bg-surface-dark hover:bg-zinc-800 border border-border-dark text-text-bright rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                          <span>
                            Status: {verificationResult.status === "AVAILABLE" ? "Set Cooldown" : "Set Available"}
                          </span>
                        </button>
                      )}

                      {/* Action 3: Open Full Digital Pass Modal */}
                      {verificationResult.matchedDonor && onOpenPassModal && (
                        <button
                          id="admin-open-full-pass-btn"
                          onClick={() => {
                            onClose();
                            onOpenPassModal(verificationResult.matchedDonor!);
                          }}
                          className="px-3.5 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>Open Full Pass Card</span>
                        </button>
                      )}

                      {/* Action 4: Print verification slip */}
                      <button
                        id="admin-print-slip-btn"
                        onClick={() => window.print()}
                        className="px-3.5 py-2.5 bg-surface-dark hover:bg-zinc-800 border border-border-dark text-text-muted hover:text-text-bright rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Slip</span>
                      </button>

                      {/* Action 5: Scan Next Pass */}
                      <button
                        id="admin-actions-scan-next-btn"
                        onClick={handleRescanNext}
                        className="px-3.5 py-2.5 bg-amber-500/20 hover:bg-amber-500 border border-amber-500/40 text-amber-300 hover:text-black rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ml-auto"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Scan Next Pass</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

              {/* TAB 2: UPLOAD / DRAG & DROP PHOTO */}
              {activeTab === "upload" && (
                <div className="space-y-4">
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleImageUpload(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-amber-500/40 hover:border-amber-400 bg-surface-dark/60 hover:bg-surface-dark/90 p-8 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition space-y-3 min-h-[240px]"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleImageUpload(e.target.files[0]);
                        }
                      }}
                    />
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Upload className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-bright">
                        {uploadLoading ? "Scanning QR code in image..." : "Upload or Drag & Drop Donor Pass Photo"}
                      </p>
                      <p className="text-xs text-text-muted mt-1 max-w-sm">
                        Accepts JPG, PNG, WebP screenshots or photos taken of physical donor identity cards.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={uploadLoading}
                      className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      {uploadLoading ? "Processing..." : "Select Image from Device"}
                    </button>
                  </div>

                  {uploadError && (
                    <div className="bg-red-950/40 border border-red-500/40 text-red-300 p-3 rounded-xl text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: SAMPLE TEST PASSES (Instant Verification Testing) */}
              {activeTab === "samples" && (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-text-bright uppercase tracking-wider font-display flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Instant Verification Test Sandbox</span>
                    </h4>
                    <p className="text-xs text-text-muted mt-0.5">
                      Click any registered donor below to simulate scanning their live QR code pass.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Section 1: Active Valid Passes (< 6 Months Validity) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Active / Valid Passes (&lt; 6 Months Validity)</span>
                        </span>
                        <span className="text-[10px] text-emerald-400/80 font-mono">Tests standard verified state</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {donors.slice(0, 2).map((d) => {
                          const payload = generateDonorPassQrPayload(d);
                          return (
                            <div
                              key={`sample-valid-${d.uid}`}
                              onClick={() => handleScanSuccess(payload)}
                              className="bg-surface-dark border border-emerald-500/30 hover:border-emerald-500/70 p-3.5 rounded-2xl cursor-pointer transition space-y-2 group shadow-sm"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-red to-rose-900 text-white font-black flex items-center justify-center text-xs shadow shrink-0">
                                    {d.bloodGroup}
                                  </div>
                                  <div className="text-left">
                                    <div className="flex items-center gap-1.5">
                                      <h5 className="text-xs font-bold text-text-bright group-hover:text-emerald-300 transition">
                                        {d.fullName}
                                      </h5>
                                      <span className="text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded border border-emerald-500/40">
                                        VALID
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-text-muted font-mono">{d.city}, {d.state}</p>
                                  </div>
                                </div>
                                <div className="bg-white p-1 rounded-md shrink-0 shadow-sm border border-emerald-500/30">
                                  <QRCodeSVG value={payload} size={36} level="L" />
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-border-dark/60 text-[10px]">
                                <span className="font-mono text-text-subtle">{formatDonorId(d)}</span>
                                <span className="text-emerald-400 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition">
                                  Simulate Valid Scan <ChevronRight className="w-3 h-3" />
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Section 2: Expired Test Passes (> 6 Months Validity Exceeded) */}
                    <div className="space-y-2 pt-2 border-t border-border-dark/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-red-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Expired Test Passes (&gt; 6 Months Validity Exceeded)</span>
                        </span>
                        <span className="text-[10px] text-red-300/80 font-mono">Tests Warning: Expired Pass state</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {donors.slice(2, 4).map((d, idx) => {
                          // Simulate passes issued 8 months ago or 14 months ago (> 6 month validity window)
                          const simulatedTimestamp = idx === 0
                            ? new Date(Date.now() - 240 * 24 * 60 * 60 * 1000).toISOString() // 8 months ago
                            : new Date(Date.now() - 420 * 24 * 60 * 60 * 1000).toISOString(); // 14 months ago
                          const elapsedText = idx === 0 ? "8 Months Ago" : "14 Months Ago";
                          const payload = generateDonorPassQrPayload({
                            ...d,
                            updatedAt: simulatedTimestamp,
                            createdAt: simulatedTimestamp
                          });

                          return (
                            <div
                              key={`sample-expired-${d.uid}`}
                              onClick={() => handleScanSuccess(payload)}
                              className="bg-surface-dark border border-red-500/40 hover:border-red-500/80 p-3.5 rounded-2xl cursor-pointer transition space-y-2 group shadow-sm hover:shadow-red-950/40"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-900 to-red-950 text-red-200 border border-red-500/40 font-black flex items-center justify-center text-xs shadow shrink-0">
                                    {d.bloodGroup}
                                  </div>
                                  <div className="text-left">
                                    <div className="flex items-center gap-1.5">
                                      <h5 className="text-xs font-bold text-text-bright group-hover:text-red-300 transition">
                                        {d.fullName}
                                      </h5>
                                      <span className="text-[9px] font-mono font-bold bg-red-500/25 text-red-300 px-1.5 py-0.2 rounded border border-red-500/50 animate-pulse">
                                        &gt;6 MOS EXPIRED
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-red-300/80 font-mono">Issued: {elapsedText}</p>
                                  </div>
                                </div>
                                <div className="bg-white p-1 rounded-md shrink-0 shadow-sm border border-red-400">
                                  <QRCodeSVG value={payload} size={36} level="L" />
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-border-dark/60 text-[10px]">
                                <span className="font-mono text-text-subtle">{formatDonorId(d)}</span>
                                <span className="text-red-400 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition">
                                  Simulate Expired Scan <ChevronRight className="w-3 h-3" />
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: MANUAL PASS ID ENTRY */}
              {activeTab === "manual" && (
                <div className="space-y-4">
                  <div className="bg-surface-dark p-5 rounded-2xl border border-border-dark space-y-3">
                    <div>
                      <h4 className="text-xs font-bold text-text-bright uppercase tracking-wider font-display">
                        Enter Donor ID or Raw QR String
                      </h4>
                      <p className="text-xs text-text-muted mt-0.5">
                        Type an official Donor ID (e.g. <span className="font-mono text-amber-400">BD-2026-00055</span>) or paste raw pass JSON.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        id="admin-manual-pass-input"
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        placeholder="e.g. BD-2026-00055, or donor phone / UID"
                        className="flex-1 bg-card-dark border border-border-dark focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-text-bright placeholder-text-subtle focus:outline-none font-mono"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && manualInput.trim()) {
                            handleScanSuccess(manualInput.trim());
                          }
                        }}
                      />
                      <button
                        type="button"
                        id="admin-manual-verify-btn"
                        onClick={() => {
                          if (manualInput.trim()) {
                            handleScanSuccess(manualInput.trim());
                          }
                        }}
                        className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-xl transition cursor-pointer shrink-0"
                      >
                        Verify
                      </button>
                    </div>

                    <div className="pt-2 space-y-2">
                      <span className="text-[10px] text-text-subtle block font-mono">Quick Match Shortcuts:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {donors.slice(0, 2).map((d) => (
                          <button
                            key={`quick-valid-${d.uid}`}
                            type="button"
                            onClick={() => {
                              const id = formatDonorId(d);
                              setManualInput(id);
                              handleScanSuccess(id);
                            }}
                            className="text-[10px] font-mono bg-card-dark hover:bg-zinc-800 border border-emerald-500/40 text-emerald-300 px-2 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span>{formatDonorId(d)} ({d.fullName})</span>
                          </button>
                        ))}

                        {/* Quick Expired Pass Test Button */}
                        {donors.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const target = donors[2];
                              const expiredTimestamp = new Date(Date.now() - 240 * 24 * 60 * 60 * 1000).toISOString();
                              const expiredPayload = generateDonorPassQrPayload({
                                ...target,
                                updatedAt: expiredTimestamp,
                                createdAt: expiredTimestamp
                              });
                              setManualInput(`EXPIRED: ${formatDonorId(target)} (8 Mos Ago)`);
                              handleScanSuccess(expiredPayload);
                            }}
                            className="text-[10px] font-mono bg-red-950/60 hover:bg-red-900/60 border border-red-500/60 text-red-300 px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 font-bold animate-pulse"
                          >
                            <AlertTriangle className="w-3 h-3 text-red-400" />
                            <span>Test Expired Pass (&gt; 6 Mos)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-surface-dark/80 px-5 py-3 border-t border-border-dark flex items-center justify-between text-xs text-text-muted shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono text-[11px]">Authorized Admin: {adminUser.fullName || adminUser.email}</span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-card-dark hover:bg-zinc-800 border border-border-dark text-text-bright font-semibold rounded-lg transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
