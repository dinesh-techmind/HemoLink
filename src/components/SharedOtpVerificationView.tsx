import React, { useState, useEffect, useRef } from "react";
import { ShieldCheck, ArrowRight, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";
import { HemolinkIcon } from "./HemolinkLogo";
import { maskPhoneNumber } from "../lib/phoneAuth";

interface SharedOtpVerificationViewProps {
  phoneNumber: string;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  onChangeNumber: () => void;
  isVerifying: boolean;
  isResending: boolean;
  error?: string;
  clearError?: () => void;
  subtitleContext?: string;
  registeredDonor?: {
    fullName: string;
    email: string;
  };
}

export default function SharedOtpVerificationView({
  phoneNumber,
  onVerify,
  onResend,
  onChangeNumber,
  isVerifying,
  isResending,
  error,
  clearError,
  subtitleContext = "Enter the 6-digit code sent to your mobile number.",
  registeredDonor,
}: SharedOtpVerificationViewProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [cooldown, setCooldown] = useState<number>(60);
  const [incomingSmsOtp, setIncomingSmsOtp] = useState<string>("123456");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Listen for custom SMS dispatch events in sandbox
  useEffect(() => {
    const handleSms = (e: any) => {
      if (e.detail?.code) {
        setIncomingSmsOtp(e.detail.code);
      }
    };
    window.addEventListener("hemolink_sms_received", handleSms);
    return () => window.removeEventListener("hemolink_sms_received", handleSms);
  }, []);

  // 60-second cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (clearError) clearError();
    const cleanDigits = value.replace(/\D/g, "");

    // Handle full paste into an input
    if (cleanDigits.length > 1) {
      const newDigits = [...digits];
      cleanDigits.slice(0, 6).split("").forEach((char, i) => {
        if (i < 6) newDigits[i] = char;
      });
      setDigits(newDigits);
      const nextIndex = Math.min(cleanDigits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleanDigits.slice(-1);
    setDigits(newDigits);

    // Auto-advance if digit entered
    if (cleanDigits && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;

    if (clearError) clearError();
    const newDigits = [...digits];
    pastedData.split("").forEach((char, i) => {
      if (i < 6) newDigits[i] = char;
    });
    setDigits(newDigits);
    const targetIdx = Math.min(pastedData.length, 5);
    inputRefs.current[targetIdx]?.focus();
  };

  const fullOtp = digits.join("");
  const isComplete = fullOtp.length === 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComplete || isVerifying) return;
    await onVerify(fullOtp);
  };

  const handleTriggerResend = async () => {
    if (cooldown > 0 || isResending) return;
    await onResend();
    setCooldown(60);
    setDigits(["", "", "", "", "", ""]);
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-2xl space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-1">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center p-2.5 border border-red-100 shadow-sm">
            <HemolinkIcon className="w-full h-full text-[#9B1B28]" />
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-[#ba1111] rounded-full text-[10px] font-extrabold uppercase tracking-widest border border-red-100">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Firebase Phone Authentication</span>
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
          Verify Your Mobile Number
        </h1>
        <p className="text-xs text-gray-600 max-w-sm mx-auto">
          {subtitleContext}
        </p>
        <div className="pt-1 space-y-2">
          <span className="font-bold text-[#ba1111] bg-red-50 py-1 px-3 rounded-full text-xs inline-block border border-red-100">
            OTP sent to registered mobile: {phoneNumber}
          </span>
          {registeredDonor && registeredDonor.fullName && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-left flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">{registeredDonor.fullName}</p>
                <p className="text-[11px] text-gray-500 truncate">{registeredDonor.email}</p>
              </div>
              <span className="text-[10px] font-extrabold uppercase bg-red-100 text-[#ba1111] px-2 py-0.5 rounded-full shrink-0">
                New Donor
              </span>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Sandbox / Testing Notice Banner with 1-click Auto Fill */}
        <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0">📲</span>
            <div className="leading-tight truncate">
              <span className="font-bold text-amber-950">Verification Code: </span>
              <span className="font-mono font-black text-[#ba1111] bg-white px-1.5 py-0.5 rounded border border-amber-300">
                {incomingSmsOtp}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (clearError) clearError();
              const newDigits = incomingSmsOtp.split("").slice(0, 6);
              setDigits(newDigits);
              inputRefs.current[5]?.focus();
            }}
            className="px-2.5 py-1 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors shrink-0 shadow-sm cursor-pointer"
          >
            Auto-fill
          </button>
        </div>

        {/* 6-Digit OTP Inputs */}
        <div className="flex justify-center gap-2 sm:gap-2.5">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              disabled={isVerifying}
              id={`otp-digit-${index}`}
              aria-label={`Digit ${index + 1}`}
              className={`w-11 h-13 sm:w-13 sm:h-15 border rounded-xl text-center text-2xl font-black focus:outline-none transition-all ${
                digit
                  ? "border-[#ba1111] bg-red-50/40 text-gray-900 ring-2 ring-[#ba1111]/30"
                  : "border-gray-200 bg-white text-gray-900 focus:border-[#ba1111] focus:ring-2 focus:ring-[#ba1111]/20"
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-left">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs text-red-600 font-medium leading-tight">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!isComplete || isVerifying}
          className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-sm shadow-lg ${
            !isComplete || isVerifying
              ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
              : "bg-[#ba1111] hover:bg-[#9a0f0f] text-white shadow-[#ba1111]/20 cursor-pointer"
          }`}
        >
          {isVerifying ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Verifying 6-Digit OTP...</span>
            </>
          ) : (
            <>
              <span>Verify OTP & Continue</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <div className="text-center pt-1 space-y-3">
          <p className="text-xs text-gray-500">
            Didn't receive the SMS?{" "}
            {cooldown > 0 ? (
              <span className="font-semibold text-gray-400">
                Resend in <strong className="text-[#ba1111]">{cooldown}s</strong>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleTriggerResend}
                disabled={isResending}
                className="text-[#ba1111] font-bold cursor-pointer hover:underline bg-transparent border-0 p-0 text-xs inline"
              >
                {isResending ? "Sending SMS OTP..." : "Resend OTP"}
              </button>
            )}
          </p>

          <div>
            <button
              type="button"
              onClick={onChangeNumber}
              disabled={isVerifying}
              className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 font-medium bg-transparent border-0 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change Mobile Number</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
