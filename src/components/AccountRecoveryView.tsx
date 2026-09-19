import React, { useState } from "react";
import { ShieldCheck, Phone, ArrowLeft, ArrowRight, AlertCircle, CheckCircle, RefreshCw, User, MapPin, Droplet, Mail, Info } from "lucide-react";
import { HemolinkIcon } from "./HemolinkLogo";
import { db } from "../lib/firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { SUPPORTED_COUNTRIES, formatToE164, isValidE164, sendFirebasePhoneOtp, getFriendlyPhoneAuthError, clearRecaptcha } from "../lib/phoneAuth";
import { BloodGroup } from "../types";
import SharedOtpVerificationView from "./SharedOtpVerificationView";
import { ConfirmationResult } from "firebase/auth";

interface AccountRecoveryViewProps {
  onBackToLogin: () => void;
}

const BLOOD_GROUPS: BloodGroup[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function AccountRecoveryView({ onBackToLogin }: AccountRecoveryViewProps) {
  const [step, setStep] = useState<"info_form" | "otp_verify" | "submitted">("info_form");
  const [fullName, setFullName] = useState("");
  const [previousPhone, setPreviousPhone] = useState("");
  const [prevCountryCode, setPrevCountryCode] = useState("+91");
  const [newPhone, setNewPhone] = useState("");
  const [newCountryCode, setNewCountryCode] = useState("+91");
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>("O+");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [submittedRefId, setSubmittedRefId] = useState("");

  const formattedPrevious = formatToE164(prevCountryCode, previousPhone);
  const formattedNew = formatToE164(newCountryCode, newPhone);

  const handleSubmitRecoveryForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) {
      setError("Please enter your registered full name.");
      return;
    }
    if (!previousPhone.trim() || !isValidE164(formattedPrevious)) {
      setError("Please enter your previous registered phone number.");
      return;
    }
    if (!newPhone.trim() || !isValidE164(formattedNew)) {
      setError("Please enter your new active phone number.");
      return;
    }
    if (formattedPrevious === formattedNew) {
      setError("Your new phone number must be different from your previous phone number.");
      return;
    }
    if (!city.trim()) {
      setError("Please enter your registered city.");
      return;
    }

    setIsLoading(true);
    try {
      // Authenticate ownership of the new phone number via Firebase Phone Auth
      const confirmation = await sendFirebasePhoneOtp(formattedNew, "recovery-recaptcha-container");
      setConfirmationResult(confirmation);
      setStep("otp_verify");
    } catch (err: any) {
      console.warn("Recovery Phone OTP error:", err);
      setError(getFriendlyPhoneAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyNewPhoneOtp = async (otp: string) => {
    const activeConfirmation = confirmationResult || (typeof window !== "undefined" ? (window as any).confirmationResult : null);
    if (!activeConfirmation) {
      setError("Verification session expired. Please request a new code.");
      return;
    }
    setIsVerifyingOtp(true);
    setError("");

    try {
      const userCredential = await activeConfirmation.confirm(otp);
      const verifiedUid = userCredential.user.uid;
      const refId = `REC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // Save recovery request in Firestore
      await setDoc(doc(db, "account_recovery_requests", refId), {
        id: refId,
        uid: verifiedUid,
        fullName: fullName.trim(),
        previousPhone: formattedPrevious,
        newPhone: formattedNew,
        bloodGroup,
        city: city.trim(),
        registeredEmail: email.trim().toLowerCase(),
        additionalDetails: notes.trim(),
        status: "pending",
        submittedAt: new Date().toISOString(),
      });

      setSubmittedRefId(refId);
      setStep("submitted");
    } catch (err: any) {
      console.warn("Recovery OTP confirmation error:", err);
      setError(getFriendlyPhoneAuthError(err));
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    setIsResendingOtp(true);
    setError("");
    try {
      const confirmation = await sendFirebasePhoneOtp(formattedNew, "recovery-recaptcha-container");
      setConfirmationResult(confirmation);
    } catch (err: any) {
      setError(getFriendlyPhoneAuthError(err));
    } finally {
      setIsResendingOtp(false);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-2xl space-y-6">
      <div id="recovery-recaptcha-container"></div>

      {step === "info_form" && (
        <>
          <div className="text-center space-y-1.5">
            <div className="flex justify-center mb-1">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center p-2.5 border border-red-100 shadow-sm">
                <HemolinkIcon className="w-full h-full text-[#9B1B28]" />
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-red-50 text-[#ba1111] rounded-full text-[10px] font-extrabold uppercase tracking-widest border border-red-100">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Secure Account Recovery</span>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Need Help Accessing HemoLink?
            </h1>
            <p className="text-xs text-gray-600 max-w-sm mx-auto">
              HemoLink uses passwordless Mobile OTP. If you have your phone, you can sign in directly from the login page.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left space-y-1">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Lost Access to Your Registered Phone?</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              To safeguard patient confidentiality and clinical records, verifying an arbitrary new phone number cannot claim another donor's profile without identity confirmation. Please submit this verification request.
            </p>
          </div>

          <form onSubmit={handleSubmitRecoveryForm} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-800 ml-1">Registered Full Name</label>
              <div className="flex items-center gap-2.5 border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus-within:border-[#ba1111] focus-within:ring-1 focus-within:ring-[#ba1111]">
                <User className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Full name as on your profile"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full text-sm outline-none text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-800 ml-1">Previous Registered Phone (Lost Number)</label>
              <div className="flex gap-2">
                <select
                  value={prevCountryCode}
                  onChange={(e) => setPrevCountryCode(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-2 text-xs font-bold text-gray-800 outline-none"
                >
                  {SUPPORTED_COUNTRIES.map((c) => (
                    <option key={`prev-${c.code}`} value={c.dialCode}>
                      {c.flag} {c.dialCode}
                    </option>
                  ))}
                </select>
                <div className="flex-1 flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus-within:border-[#ba1111] focus-within:ring-1 focus-within:ring-[#ba1111]">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  <input
                    type="tel"
                    placeholder="Old phone number"
                    value={previousPhone}
                    onChange={(e) => setPreviousPhone(e.target.value)}
                    required
                    className="w-full text-sm outline-none text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-800 ml-1">New Active Phone Number (To Verify via SMS)</label>
              <div className="flex gap-2">
                <select
                  value={newCountryCode}
                  onChange={(e) => setNewCountryCode(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-2 text-xs font-bold text-gray-800 outline-none"
                >
                  {SUPPORTED_COUNTRIES.map((c) => (
                    <option key={`new-${c.code}`} value={c.dialCode}>
                      {c.flag} {c.dialCode}
                    </option>
                  ))}
                </select>
                <div className="flex-1 flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus-within:border-[#ba1111] focus-within:ring-1 focus-within:ring-[#ba1111]">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  <input
                    type="tel"
                    placeholder="New phone to receive OTP"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    required
                    className="w-full text-sm outline-none text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-800 ml-1">Blood Group</label>
                <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus-within:border-[#ba1111]">
                  <Droplet className="w-4 h-4 text-rose-600 shrink-0" />
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                    className="w-full text-xs font-bold outline-none bg-transparent text-gray-900"
                  >
                    {BLOOD_GROUPS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-800 ml-1">Registered City</label>
                <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus-within:border-[#ba1111]">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="e.g. Coimbatore"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    className="w-full text-xs outline-none text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-800 ml-1">Backup Contact Email (Optional)</label>
              <div className="flex items-center gap-2.5 border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus-within:border-[#ba1111]">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="email"
                  placeholder="e.g. donor@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-sm outline-none text-gray-900 placeholder:text-gray-400"
                />
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
                  <span>Sending SMS OTP to New Phone...</span>
                </>
              ) : (
                <>
                  <span>Verify New Phone & Submit</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={onBackToLogin}
                className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 font-medium bg-transparent border-0 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Phone Login</span>
              </button>
            </div>
          </form>
        </>
      )}

      {step === "otp_verify" && (
        <SharedOtpVerificationView
          phoneNumber={formattedNew}
          onVerify={handleVerifyNewPhoneOtp}
          onResend={handleResendOtp}
          onChangeNumber={() => {
            clearRecaptcha();
            setStep("info_form");
            setError("");
          }}
          isVerifying={isVerifyingOtp}
          isResending={isResendingOtp}
          error={error}
          clearError={() => setError("")}
          subtitleContext="Confirm control of your new phone number by entering the 6-digit SMS code."
        />
      )}

      {step === "submitted" && (
        <div className="text-center space-y-5 py-4">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-200 text-emerald-600">
            <CheckCircle className="w-9 h-9" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900 font-display">
              Recovery Request Submitted
            </h2>
            <p className="text-xs text-gray-600 max-w-sm mx-auto leading-relaxed">
              Your new mobile number has been verified via SMS. Your recovery ticket has been registered in the clinical verification queue.
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-left space-y-2">
            <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-200">
              <span className="text-gray-500 font-medium">Ticket Reference:</span>
              <span className="font-mono font-bold text-gray-900">{submittedRefId}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-medium">Donor Name:</span>
              <span className="font-bold text-gray-900">{fullName}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-medium">New Verified Phone:</span>
              <span className="font-bold text-emerald-700">{formattedNew}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onBackToLogin}
            className="w-full py-3.5 bg-[#ba1111] hover:bg-[#9a0f0f] text-white font-bold rounded-xl text-sm shadow-lg shadow-[#ba1111]/20 cursor-pointer transition-colors"
          >
            Return to Login
          </button>
        </div>
      )}
    </div>
  );
}
