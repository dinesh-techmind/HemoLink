import React, { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { HemolinkIcon } from "./HemolinkLogo";
import { auth } from "../lib/firebase";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";

interface ResetPasswordViewProps {
  resetToken?: string; // Generated upon successful 6-digit OTP verification
  resetCode?: string;  // Fallback for Firebase action codes / links
  email?: string;
  onBackToLogin: () => void;
  onRequestNewLink: () => void;
}

export default function ResetPasswordView({
  resetToken = "",
  resetCode = "",
  email = "",
  onBackToLogin,
  onRequestNewLink,
}: ResetPasswordViewProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isVerifying, setIsVerifying] = useState(Boolean(resetCode && !resetToken));
  const [codeValid, setCodeValid] = useState(Boolean(resetToken || resetCode));
  const [associatedEmail, setAssociatedEmail] = useState(email);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // If using an action code link (oobCode), verify it
  useEffect(() => {
    let isMounted = true;
    async function checkActionCode() {
      if (resetToken) {
        setCodeValid(true);
        setIsVerifying(false);
        return;
      }

      if (!resetCode) {
        if (isMounted) {
          setError("No valid password reset authorization detected. Please start over.");
          setIsVerifying(false);
          setCodeValid(false);
        }
        return;
      }

      try {
        const verifiedEmail = await verifyPasswordResetCode(auth, resetCode);
        if (isMounted) {
          setAssociatedEmail(verifiedEmail);
          setCodeValid(true);
          setIsVerifying(false);
        }
      } catch (err: any) {
        console.warn("Invalid or expired reset code:", err);
        if (isMounted) {
          setError("This password reset session has expired or is invalid. Please request a new code.");
          setCodeValid(false);
          setIsVerifying(false);
        }
      }
    }

    checkActionCode();
    return () => {
      isMounted = false;
    };
  }, [resetCode, resetToken]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError("");

    // 1. Password non-empty
    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }

    // 2. Application password policy: minimum 6 characters
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    // 3. Confirm password match
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (resetToken) {
        // Backend 6-Digit OTP Verified Reset Flow
        const response = await fetch("/api/forgot-password/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resetToken,
            newPassword,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to reset password. Please try again.");
        }

        setIsSuccess(true);
      } else if (resetCode) {
        // Firebase Auth action code flow
        await confirmPasswordReset(auth, resetCode, newPassword);
        setIsSuccess(true);
      } else {
        throw new Error("No valid reset authorization found.");
      }
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/invalid-action-code" || code === "auth/expired-action-code") {
        setError("This reset session has expired. Please request a new code.");
        setCodeValid(false);
      } else {
        setError(err.message || "Failed to reset password. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. Loading verification state
  if (isVerifying) {
    return (
      <div className="bg-white rounded-[2rem] p-8 shadow-2xl text-center space-y-4 max-w-md w-full">
        <div className="w-12 h-12 bg-red-50 text-[#ba1111] rounded-2xl flex items-center justify-center mx-auto">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Verifying authorization...</h2>
        <p className="text-xs text-gray-500">Checking your password reset session token.</p>
      </div>
    );
  }

  // 2. Invalid code state
  if (!codeValid && !isSuccess) {
    return (
      <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-2xl space-y-6 max-w-md w-full text-center">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-gray-900 font-display">Session Expired</h2>
          <p className="text-xs text-gray-600 font-medium leading-relaxed">
            {error || "This password reset session is invalid or has expired."}
          </p>
        </div>
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={onRequestNewLink}
            className="w-full bg-[#ba1111] hover:bg-[#9a0f0f] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-lg shadow-[#ba1111]/20"
          >
            Request New OTP
          </button>
          <button
            type="button"
            onClick={onBackToLogin}
            className="w-full text-xs font-bold text-gray-600 hover:text-gray-900 py-2 cursor-pointer transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // 3. Success state (STEP 15)
  if (isSuccess) {
    return (
      <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-2xl space-y-6 max-w-md w-full text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-extrabold text-gray-900 font-display tracking-tight">
            Password Reset Successful
          </h1>
          <p className="text-xs text-gray-600 font-medium leading-relaxed">
            Your password has been changed successfully.
          </p>
        </div>
        <button
          type="button"
          id="go-to-login-btn"
          onClick={onBackToLogin}
          className="w-full bg-[#ba1111] hover:bg-[#9a0f0f] text-white py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all shadow-lg shadow-[#ba1111]/20 cursor-pointer flex items-center justify-center gap-2"
        >
          Go to Login <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // 4. Create New Password form (STEP 12 - 14)
  return (
    <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-2xl space-y-6 max-w-md w-full">
      {/* Header */}
      <div className="text-center space-y-1 relative">
        <div className="w-13 h-13 bg-[#fff4f4] rounded-2xl flex items-center justify-center mx-auto mb-3 border border-[#ffdfdf] p-2 shadow-sm">
          <HemolinkIcon className="w-9 h-9 text-[#9B1B28]" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 font-display">
          Create New Password
        </h1>
        <p className="text-xs text-gray-600 font-medium max-w-xs mx-auto leading-relaxed">
          Create a strong new password for your account.
        </p>
        {associatedEmail && (
          <p className="text-[11px] font-bold text-[#ba1111] bg-red-50 py-0.5 px-2.5 rounded-full inline-block mt-1">
            {associatedEmail}
          </p>
        )}
      </div>

      <form onSubmit={handleResetPassword} className="space-y-4">
        {/* New Password input with eye toggle */}
        <div className="space-y-1.5">
          <label htmlFor="reset-new-password" className="text-xs font-bold text-gray-800 ml-1">
            New Password
          </label>
          <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-[#ba1111] focus-within:ring-1 focus-within:ring-[#ba1111] transition-all bg-white">
            <Lock className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              id="reset-new-password"
              type={showNewPassword ? "text" : "password"}
              placeholder="Enter new password (min 6 characters)"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (error) setError("");
              }}
              required
              minLength={6}
              className="w-full outline-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400"
            />
            <button
              type="button"
              id="toggle-new-password-visibility"
              onClick={() => setShowNewPassword((prev) => !prev)}
              aria-label={showNewPassword ? "Hide password" : "Show password"}
              className="focus:outline-none text-gray-400 hover:text-gray-600 p-1 cursor-pointer transition-colors"
            >
              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Confirm New Password input with eye toggle */}
        <div className="space-y-1.5">
          <label htmlFor="reset-confirm-password" className="text-xs font-bold text-gray-800 ml-1">
            Confirm New Password
          </label>
          <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-[#ba1111] focus-within:ring-1 focus-within:ring-[#ba1111] transition-all bg-white">
            <Lock className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              id="reset-confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm your new password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (error) setError("");
              }}
              required
              minLength={6}
              className="w-full outline-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400"
            />
            <button
              type="button"
              id="toggle-confirm-password-visibility"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              className="focus:outline-none text-gray-400 hover:text-gray-600 p-1 cursor-pointer transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Reset Password submit button */}
        <button
          type="submit"
          id="submit-reset-password-btn"
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
              Resetting Password...
            </>
          ) : (
            <>
              Reset Password <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={onBackToLogin}
            className="text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer transition-colors"
          >
            Cancel and Return to Login
          </button>
        </div>
      </form>
    </div>
  );
}
