import React, { useState } from "react";
import { X, ShieldCheck, Phone, ArrowRight, RefreshCw, AlertCircle, CheckCircle, Smartphone } from "lucide-react";
import { SUPPORTED_COUNTRIES, formatToE164, isValidE164, sendFirebasePhoneOtp, getFriendlyPhoneAuthError, clearRecaptcha } from "../lib/phoneAuth";
import { store } from "../lib/store";
import { ConfirmationResult } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import SharedOtpVerificationView from "./SharedOtpVerificationView";

interface ChangePhoneNumberModalProps {
  isOpen: boolean;
  currentPhone: string;
  onClose: () => void;
  onSuccess: (newPhone: string) => void;
}

export default function ChangePhoneNumberModal({
  isOpen,
  currentPhone,
  onClose,
  onSuccess,
}: ChangePhoneNumberModalProps) {
  const [step, setStep] = useState<"input" | "verify" | "success">("input");
  const [countryCode, setCountryCode] = useState("+91");
  const [rawNumber, setRawNumber] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [verifiedNumber, setVerifiedNumber] = useState("");

  if (!isOpen) return null;

  const formattedNewPhone = formatToE164(countryCode, rawNumber);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!rawNumber.trim() || !isValidE164(formattedNewPhone)) {
      setError("Please enter a valid mobile phone number with standard digits.");
      return;
    }

    if (formattedNewPhone === currentPhone) {
      setError("New phone number cannot be identical to your current phone number.");
      return;
    }

    // Check if phone is already registered to another donor
    const existing = store.getDonors().find(
      (d) => d.phone === formattedNewPhone && d.uid !== store.getCurrentUser()?.uid
    );
    if (existing) {
      setError("This mobile number is already registered to another active donor.");
      return;
    }

    setIsLoading(true);
    try {
      const confirmation = await sendFirebasePhoneOtp(formattedNewPhone, "change-phone-recaptcha-container");
      setConfirmationResult(confirmation);
      setStep("verify");
    } catch (err: any) {
      console.warn("Change Phone Send OTP error:", err);
      setError(getFriendlyPhoneAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (otp: string) => {
    const activeConfirmation = confirmationResult || (typeof window !== "undefined" ? (window as any).confirmationResult : null);
    if (!activeConfirmation) {
      setError("Verification session expired. Please request a new code.");
      return;
    }
    setIsVerifyingOtp(true);
    setError("");

    try {
      await activeConfirmation.confirm(otp);
      
      // Store phone verification record in Firestore to prove OTP ownership
      try {
        const uid = store.getCurrentUser()?.uid || auth.currentUser?.uid;
        if (uid) {
          await setDoc(doc(db, "phone_verifications", uid), {
            uid,
            verifiedPhone: formattedNewPhone,
            verified: true,
            verifiedAt: new Date().toISOString(),
          });
        }
      } catch (verifErr) {
        console.warn("Could not write phone verification proof:", verifErr);
      }

      // Update phone number in store and Firestore
      store.updatePhoneNumber(formattedNewPhone);
      setVerifiedNumber(formattedNewPhone);
      setStep("success");
      onSuccess(formattedNewPhone);
    } catch (err: any) {
      console.warn("Change Phone OTP verification error:", err);
      setError(getFriendlyPhoneAuthError(err));
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendCode = async () => {
    setIsResendingOtp(true);
    setError("");
    try {
      const confirmation = await sendFirebasePhoneOtp(formattedNewPhone, "change-phone-recaptcha-container");
      setConfirmationResult(confirmation);
    } catch (err: any) {
      setError(getFriendlyPhoneAuthError(err));
    } finally {
      setIsResendingOtp(false);
    }
  };

  const handleClose = () => {
    clearRecaptcha();
    setStep("input");
    setError("");
    setRawNumber("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div id="change-phone-recaptcha-container"></div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 text-gray-900 relative">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-5 right-5 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {step === "input" && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div className="text-center space-y-1.5 pt-2">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto text-[#ba1111] border border-red-100">
                <Smartphone className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-gray-900">Change Mobile Number</h2>
              <p className="text-xs text-gray-600">
                Current Number: <strong className="text-gray-900">{currentPhone || "Not set"}</strong>
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-800 ml-1">New Mobile Number</label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-2 text-xs font-bold text-gray-800 outline-none"
                >
                  {SUPPORTED_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.dialCode}>
                      {c.flag} {c.dialCode}
                    </option>
                  ))}
                </select>
                <div className="flex-1 flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus-within:border-[#ba1111] focus-within:ring-1 focus-within:ring-[#ba1111]">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={rawNumber}
                    onChange={(e) => setRawNumber(e.target.value)}
                    required
                    className="w-full text-sm outline-none text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 font-medium leading-tight">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm text-white shadow-lg transition-all ${
                isLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[#ba1111] hover:bg-[#9a0f0f] shadow-[#ba1111]/20 cursor-pointer"
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending SMS OTP...</span>
                </>
              ) : (
                <>
                  <span>Send Verification Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {step === "verify" && (
          <SharedOtpVerificationView
            phoneNumber={formattedNewPhone}
            onVerify={handleVerifyCode}
            onResend={handleResendCode}
            onChangeNumber={() => {
              clearRecaptcha();
              setStep("input");
              setError("");
            }}
            isVerifying={isVerifyingOtp}
            isResending={isResendingOtp}
            error={error}
            clearError={() => setError("")}
            subtitleContext="A 6-digit SMS code was sent to your new phone number to confirm ownership."
          />
        )}

        {step === "success" && (
          <div className="text-center space-y-4 py-4">
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-200 text-emerald-600">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-gray-900 font-display">Mobile Number Updated!</h3>
              <p className="text-xs text-gray-600">
                Your registered phone number is now <strong className="text-gray-900">{verifiedNumber}</strong>.
              </p>
            </div>
            <p className="text-[11px] text-gray-500">
              Your profile, donation milestones, and badges have been updated and synchronized with Firebase.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="w-full py-3 bg-[#ba1111] hover:bg-[#9a0f0f] text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer transition"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
