import React, { useState } from "react";
import { Mail, ArrowRight, ArrowLeft, AlertCircle, RefreshCw } from "lucide-react";
import { HemolinkIcon } from "./HemolinkLogo";

interface ForgotPasswordViewProps {
  onBackToLogin: () => void;
  onOtpSent: (email: string) => void;
  initialEmail?: string;
}

export default function ForgotPasswordView({ onBackToLogin, onOtpSent, initialEmail = "" }: ForgotPasswordViewProps) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmail = (val: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError("");
    const cleanEmail = email.trim().toLowerCase();

    // 1. Check empty
    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    // 2. Validate format
    if (!validateEmail(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/otp/generate-and-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, type: "forgot_password" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to send 5-digit verification code. Please try again.");
      }

      // Navigate to OTP verification step
      onOtpSent(cleanEmail);
    } catch (err: any) {
      console.warn("Forgot password error:", err);
      setError(err.message || "Unable to send 5-digit verification code. Please check your network and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-2xl space-y-6">
      {/* Header */}
      <div className="text-center space-y-1 relative">
        <div className="w-13 h-13 bg-[#fff4f4] rounded-2xl flex items-center justify-center mx-auto mb-3 border border-[#ffdfdf] p-2 shadow-sm">
          <HemolinkIcon className="w-9 h-9 text-[#9B1B28]" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 font-display">
          Forgot Password?
        </h1>
        <p className="text-xs text-gray-600 font-medium max-w-xs mx-auto leading-relaxed">
          Enter your registered Gmail address and we'll send you a 5-digit verification code.
        </p>
      </div>

      {/* Email Submission Form */}
      <form onSubmit={handleSendOtp} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="forgot-email-input" className="text-xs font-bold text-gray-800 ml-1">
            Email Address
          </label>
          <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-[#ba1111] focus-within:ring-1 focus-within:ring-[#ba1111] transition-all bg-white">
            <Mail className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              id="forgot-email-input"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Enter your registered email address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              disabled={isSubmitting}
              required
              className="w-full outline-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Send OTP button */}
        <button
          type="submit"
          id="send-otp-btn"
          disabled={isSubmitting}
          className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all mt-2 text-sm shadow-lg ${
            isSubmitting
              ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
              : "bg-[#ba1111] hover:bg-[#9a0f0f] text-white shadow-[#ba1111]/20 cursor-pointer"
          }`}
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Sending OTP...
            </>
          ) : (
            <>
              Send OTP <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Back Navigation */}
        <div className="pt-2 text-center">
          <button
            type="button"
            id="back-to-login-btn"
            onClick={onBackToLogin}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
          </button>
        </div>
      </form>
    </div>
  );
}
