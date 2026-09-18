import React, { useState, useEffect } from "react";
import { ArrowRight, ArrowLeft, Clock, CheckCircle2, AlertCircle, RefreshCw, KeyRound, Mail, Sparkles } from "lucide-react";

interface VerifyOtpViewProps {
  email: string;
  onVerified: (resetToken: string, email: string) => void;
  onBackToEmail: () => void;
}

export default function VerifyOtpView({ email, onVerified, onBackToEmail }: VerifyOtpViewProps) {
  // 5-digit OTP state
  const [otp, setOtp] = useState(["", "", "", "", ""]);
  const [secondsLeft, setSecondsLeft] = useState(300); // 5 minutes expiration countdown
  const [cooldown, setCooldown] = useState(30); // 30 seconds resend cooldown
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [previewNotice, setPreviewNotice] = useState<string | null>(null);

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
      // Handle paste of full 5 digits
      const pasted = numeric.slice(0, 5).split("");
      pasted.forEach((ch, idx) => {
        if (idx < 5) newOtp[idx] = ch;
      });
      setOtp(newOtp);
      const nextInput = document.getElementById(`otp-input-${Math.min(pasted.length, 4)}`);
      nextInput?.focus();
      return;
    }

    newOtp[index] = numeric.slice(-1);
    setOtp(newOtp);
    if (error) setError("");

    // Auto-advance to next input field (0 -> 4)
    if (numeric && index < 4) {
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
      setError("This 5-digit verification code has expired. Please request a new OTP.");
      return;
    }

    if (fullOtp.length !== 5) {
      setError("Please enter the complete 5-digit verification code.");
      return;
    }

    setError("");
    setIsVerifying(true);

    try {
      const response = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: fullOtp, type: "forgot_password" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Invalid or expired 5-digit OTP.");
      }

      setSuccessMsg("5-Digit OTP verified successfully.");
      setTimeout(() => {
        onVerified(data.resetToken, email);
      }, 600);
    } catch (err: any) {
      setError(err.message || "Invalid or expired 5-digit verification code.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;

    setIsResending(true);
    setError("");
    setSuccessMsg("");
    setPreviewNotice(null);

    try {
      const response = await fetch("/api/otp/generate-and-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: "forgot_password" }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to resend 5-digit OTP.");
      }

      setCooldown(data.cooldown || 30);
      setSecondsLeft(300); // Reset 5-minute timer
      setOtp(["", "", "", "", ""]);
      setSuccessMsg("A new 5-digit verification code has been dispatched to your Gmail.");
      
      if (data.previewOtp) {
        setPreviewNotice(`Test Mode: 5-Digit OTP is ${data.previewOtp}`);
      }

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
        <div className="w-13 h-13 bg-[#fff4f4] rounded-2xl flex items-center justify-center mx-auto mb-3 border border-[#ffdfdf]">
          <KeyRound className="w-6 h-6 text-[#ba1111]" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 font-display">
          Verify 5-Digit OTP
        </h1>
        <p className="text-xs text-gray-600 font-medium max-w-xs mx-auto leading-relaxed">
          Enter the 5-digit verification code automatically generated and sent to your Gmail account.
        </p>
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#ba1111] bg-red-50 py-1 px-3.5 rounded-full mt-1 border border-red-100">
          <Mail className="w-3.5 h-3.5" />
          <span>{email}</span>
        </div>
        <div className="flex justify-center mt-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span>Generated & Protected via Google Gemini AI</span>
          </span>
        </div>
      </div>

      {/* Test / Sandbox delivery notice */}
      {previewNotice && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-center">
          <p className="text-xs font-bold text-amber-800">{previewNotice}</p>
        </div>
      )}

      {/* Countdown Timer Display */}
      <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-gray-700">
        <Clock className={`w-4 h-4 ${secondsLeft <= 60 ? "text-red-500 animate-pulse" : "text-gray-400"}`} />
        <span>
          Code expires in:{" "}
          <span className={`font-mono ${secondsLeft <= 60 ? "text-red-600 font-extrabold" : "text-gray-900"}`}>
            {formatTimer(secondsLeft)}
          </span>
        </span>
      </div>

      <form onSubmit={handleVerify} className="space-y-5">
        {/* 5-Digit Inputs */}
        <div className="flex justify-center gap-2 sm:gap-3">
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
              className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-black rounded-xl border transition-all outline-none ${
                digit
                  ? "border-[#ba1111] bg-red-50/40 text-gray-900 ring-2 ring-[#ba1111]/30"
                  : "border-gray-200 bg-white text-gray-900 focus:border-[#ba1111] focus:ring-2 focus:ring-[#ba1111]/20"
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
          disabled={isVerifying || fullOtp.length !== 5 || secondsLeft <= 0}
          className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-sm shadow-lg ${
            isVerifying || fullOtp.length !== 5 || secondsLeft <= 0
              ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
              : "bg-[#ba1111] hover:bg-[#9a0f0f] text-white shadow-[#ba1111]/20 cursor-pointer"
          }`}
        >
          {isVerifying ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Verifying 5-Digit Code...
            </>
          ) : (
            <>
              Verify 5-Digit OTP <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Resend OTP Section */}
        <div className="text-center pt-2 space-y-1">
          <p className="text-xs text-gray-500">Didn't receive the 5-digit code?</p>
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
              Resend 5-Digit OTP
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
