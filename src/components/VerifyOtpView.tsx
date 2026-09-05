import React, { useState, useEffect } from "react";
import { ArrowRight, ArrowLeft, Droplet, Clock, CheckCircle2, AlertCircle, RefreshCw, KeyRound } from "lucide-react";

interface VerifyOtpViewProps {
  email: string;
  onVerified: (resetToken: string, email: string) => void;
  onBackToEmail: () => void;
}

export default function VerifyOtpView({ email, onVerified, onBackToEmail }: VerifyOtpViewProps) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [secondsLeft, setSecondsLeft] = useState(300); // 5 minutes expiration countdown
  const [cooldown, setCooldown] = useState(30); // 30 seconds resend cooldown
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // 5-minute OTP countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  // 30-second Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleOtpChange = (index: number, val: string) => {
    // Only accept numeric inputs
    const numeric = val.replace(/\D/g, "");
    if (!numeric && val !== "") return;

    const newOtp = [...otp];
    if (numeric.length > 1) {
      // Handle paste of full 6 digits
      const pasted = numeric.slice(0, 6).split("");
      pasted.forEach((ch, idx) => {
        if (idx < 6) newOtp[idx] = ch;
      });
      setOtp(newOtp);
      const nextInput = document.getElementById(`otp-input-${Math.min(pasted.length, 5)}`);
      nextInput?.focus();
      return;
    }

    newOtp[index] = numeric.slice(-1);
    setOtp(newOtp);
    if (error) setError("");

    // Auto-advance to next input field
    if (numeric && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const fullOtp = otp.join("");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifying) return;

    if (secondsLeft <= 0) {
      setError("Invalid or expired OTP. Please request a new code.");
      return;
    }

    if (fullOtp.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setError("");
    setIsVerifying(true);

    try {
      const response = await fetch("/api/forgot-password/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: fullOtp }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Invalid or expired OTP.");
      }

      setSuccessMsg("OTP verified.");
      setTimeout(() => {
        onVerified(data.resetToken, email);
      }, 700);
    } catch (err: any) {
      setError(err.message || "Invalid or expired OTP.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;

    setIsResending(true);
    setError("");
    setSuccessMsg("");

    try {
      const response = await fetch("/api/forgot-password/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to resend OTP.");
      }

      setCooldown(30);
      setSecondsLeft(300); // Reset 5-minute timer
      setOtp(["", "", "", "", "", ""]);
      setSuccessMsg("A new verification code has been dispatched.");
      const firstInput = document.getElementById("otp-input-0");
      firstInput?.focus();
    } catch (err: any) {
      setError(err.message || "Unable to resend OTP. Please try again later.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-2xl space-y-6">
      {/* Header */}
      <div className="text-center space-y-1 relative">
        <div className="w-12 h-12 bg-[#fff4f4] rounded-2xl flex items-center justify-center mx-auto mb-3 border border-[#ffdfdf]">
          <KeyRound className="w-6 h-6 text-[#ba1111]" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 font-display">
          Verify OTP
        </h1>
        <p className="text-xs text-gray-600 font-medium max-w-xs mx-auto leading-relaxed">
          Enter the 6-digit verification code sent to your email.
        </p>
        <p className="text-[11px] font-bold text-[#ba1111] bg-red-50 py-1 px-3 rounded-full inline-block mt-1">
          {email}
        </p>
      </div>

      {/* Anti-enumeration info notice */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
        <p className="text-[11px] text-gray-600 leading-normal">
          If an account exists for this email address, a verification code has been sent. Please check your inbox and spam folder.
        </p>
      </div>

      {/* Countdown Timer Display */}
      <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-gray-700">
        <Clock className={`w-4 h-4 ${secondsLeft <= 60 ? "text-red-500 animate-pulse" : "text-gray-400"}`} />
        <span>
          OTP expires in:{" "}
          <span className={`font-mono ${secondsLeft <= 60 ? "text-red-600 font-extrabold" : "text-gray-900"}`}>
            {formatTimer(secondsLeft)}
          </span>
        </span>
      </div>

      <form onSubmit={handleVerify} className="space-y-5">
        {/* 6-Digit Inputs */}
        <div className="flex justify-center gap-2 sm:gap-2.5">
          {otp.map((digit, idx) => (
            <input
              key={idx}
              id={`otp-input-${idx}`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              autoFocus={idx === 0}
              disabled={isVerifying}
              className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-extrabold rounded-xl border transition-all outline-none ${
                digit
                  ? "border-[#ba1111] bg-red-50/40 text-gray-900 ring-1 ring-[#ba1111]"
                  : "border-gray-200 bg-white text-gray-900 focus:border-[#ba1111] focus:ring-1 focus:ring-[#ba1111]"
              }`}
            />
          ))}
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Feedback */}
        {successMsg && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs p-3 rounded-xl font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Verify OTP Button */}
        <button
          type="submit"
          id="verify-otp-btn"
          disabled={isVerifying || fullOtp.length !== 6 || secondsLeft <= 0}
          className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-sm shadow-lg ${
            isVerifying || fullOtp.length !== 6 || secondsLeft <= 0
              ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
              : "bg-[#ba1111] hover:bg-[#9a0f0f] text-white shadow-[#ba1111]/20 cursor-pointer"
          }`}
        >
          {isVerifying ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              Verify OTP <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Resend OTP Section */}
        <div className="text-center pt-2 space-y-1">
          <p className="text-xs text-gray-500">Didn't receive the code?</p>
          {cooldown > 0 ? (
            <p className="text-xs font-semibold text-gray-400">
              Resend available in <span className="text-[#ba1111] font-bold">{cooldown}s</span>
            </p>
          ) : (
            <button
              type="button"
              id="resend-otp-btn"
              onClick={handleResend}
              disabled={isResending}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#ba1111] hover:underline cursor-pointer bg-transparent border-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResending ? "animate-spin" : ""}`} />
              Resend OTP
            </button>
          )}
        </div>

        {/* Back navigation */}
        <div className="pt-1 text-center">
          <button
            type="button"
            id="back-to-email-btn"
            onClick={onBackToEmail}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Email
          </button>
        </div>
      </form>
    </div>
  );
}
