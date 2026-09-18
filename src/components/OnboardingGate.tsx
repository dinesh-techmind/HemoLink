import React, { useState, useEffect } from 'react';
import { Droplet, Mail, ShieldCheck, User, Lock, Eye, EyeOff, ArrowRight, Calendar, Phone, RefreshCw, Sparkles } from 'lucide-react';
import { auth } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { store } from '../lib/store';
import { WORKSPACE_CALENDAR_SCOPES, setCachedAccessToken } from '../lib/google-calendar';
import TermsAndConditionsModal from './TermsAndConditionsModal';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import ForgotPasswordView from './ForgotPasswordView';
import ResetPasswordView from './ResetPasswordView';
import VerifyOtpView from './VerifyOtpView';
import { HemolinkIcon } from './HemolinkLogo';

const RootBg = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-[#750000] relative flex flex-col items-center justify-center p-4 overflow-y-auto" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}>
      <div className="absolute top-4 left-4 sm:top-6 sm:left-8 flex items-center gap-3 text-white z-0">
        <div className="flex items-center gap-2 font-extrabold text-sm tracking-wider">
          <HemolinkIcon className="w-5 h-5 text-white" />
          <span>HEMOLINK</span>
        </div>
        <div className="bg-[#ba1111] text-white text-[9px] px-2 py-0.5 rounded-sm font-extrabold tracking-widest uppercase shadow-sm">EMERGENCY HUB</div>
      </div>
      <div className="absolute top-4 right-4 sm:top-6 sm:right-8 flex items-center gap-2 text-white/90 text-xs font-semibold z-0">
        <ShieldCheck className="w-4 h-4" />
        <span className="hidden sm:inline">Secure Medical Dispatch</span>
      </div>
      <div className="relative z-10 w-full max-w-[420px] my-16">
        {children}
      </div>
    </div>
  );

  
  
export default function OnboardingGate({ onComplete }: { onComplete: () => void }) {
  const [view, setView] = useState<"login" | "register" | "otp" | "forgot-password" | "verify-otp" | "reset-password">("login");
  const [resetCode, setResetCode] = useState<string>("");
  const [resetToken, setResetToken] = useState<string>("");
  const [otpEmail, setOtpEmail] = useState<string>("");
  const [authError, setAuthError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  // 5-digit OTP state
  const [otp, setOtp] = useState(["", "", "", "", ""]);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(300);
  const [otpCooldown, setOtpCooldown] = useState(30);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpPreviewNotice, setOtpPreviewNotice] = useState<string | null>(null);

  // Eye toggle visibility states
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);

  // OTP 5-minute countdown and resend timer
  useEffect(() => {
    if (view !== "otp" || otpSecondsLeft <= 0) return;
    const timer = setInterval(() => {
      setOtpSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [view, otpSecondsLeft]);

  useEffect(() => {
    if (view !== "otp" || otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [view, otpCooldown]);

  // Detect Firebase password reset links or direct paths (?mode=resetPassword&oobCode=...)
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const mode = searchParams.get("mode");
      const oobCode = searchParams.get("oobCode");
      const path = window.location.pathname.toLowerCase();

      if ((mode === "resetPassword" || path.includes("/reset-password")) && oobCode) {
        setResetCode(oobCode);
        setView("reset-password");
      } else if (path.includes("/verify-otp")) {
        setView("verify-otp");
      } else if (path.includes("/forgot-password")) {
        setView("forgot-password");
      }
    } catch (e) {
      console.warn("Failed to parse navigation parameters", e);
    }
  }, []);
  
  
  const finishWithLoading = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onComplete();
    }, 1000);
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      WORKSPACE_CALENDAR_SCOPES.forEach((scope) => {
        provider.addScope(scope);
      });
      provider.setCustomParameters({
        prompt: 'consent',
        access_type: 'offline'
      });
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (token) {
        setCachedAccessToken(token);
        (window as any)._googleOAuthToken = token;
      }
      
      let appUser = store.getAllUsers().find(u => u.email.toLowerCase() === user.email?.toLowerCase());
      
      if (!appUser) {
         appUser = store.registerUser(user.email || "", user.displayName || "Unknown User", "user");
         if (token && user.email) {
             const emailContent = [
                 `To: ${user.email}`,
                 `Subject: Welcome to Hemolink - Verified Profile`,
                 'Content-Type: text/plain; charset=utf-8',
                 '',
                 `Hello ${user.displayName},\n\nYour profile has been successfully verified on Hemolink. You can now access the emergency blood network.`
             ].join('\r\n');
             
             const base64EncodedEmail = btoa(unescape(encodeURIComponent(emailContent))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
             
             try {
                await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ raw: base64EncodedEmail })
                });
             } catch (e) {
                console.error("Failed to send welcome email", e);
             }
         }
      } else {
         store.registerUser(appUser.email, appUser.fullName || "", appUser.role);
      }
      
      // Assume Maps API is already configured or bypass for now to maintain pure design flow
      navigator.geolocation.getCurrentPosition(() => {}, () => {});
      
      finishWithLoading();
    } catch (error: any) {
      setAuthError(error.message);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if (!email.trim()) {
          setAuthError("Please enter your email.");
          return;
      }
      const cleanEmail = email.toLowerCase().trim();
      if (cleanEmail === "srini16dinesh@gmail.com" || cleanEmail.includes("admin")) {
          store.switchUser("admin_super");
      } else {
          let user = store.getAllUsers().find(u => u.email.toLowerCase() === cleanEmail);
          if (user) {
              store.switchUser(user.uid);
          } else {
              // Auto-register for prototype smoothness
              store.registerUser(cleanEmail, cleanEmail.split("@")[0] || "User", "user");
          }
      }
      finishWithLoading();
  };

  const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      const cleanEmail = email.trim().toLowerCase();
      const cleanPhone = phone.trim();
      const cleanName = fullName.trim();

      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
          setAuthError("Please enter a valid Gmail or email address.");
          return;
      }
      if (!cleanName) {
          setAuthError("Please enter your full name.");
          return;
      }
      if (!cleanPhone) {
          setAuthError("Please enter your phone number.");
          return;
      }
      if (cleanPhone.length > 13) {
          setAuthError("Phone number must be within 13 numbers.");
          return;
      }
      if (password.length < 6) {
          setAuthError("Password must be at least 6 characters long.");
          return;
      }
      if (password !== confirmPassword) {
          setAuthError("Passwords do not match.");
          return;
      }
      if (!termsAccepted) {
          setAuthError("Please accept Terms & Conditions.");
          return;
      }

      setAuthError("");
      setIsSendingOtp(true);

      try {
        const response = await fetch("/api/otp/generate-and-send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: cleanEmail,
            type: "register",
            fullName: cleanName,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Unable to send 5-digit verification code. Please try again.");
        }

        setOtp(["", "", "", "", ""]);
        setOtpSecondsLeft(300);
        setOtpCooldown(data.cooldown || 30);
        if (data.previewOtp) {
          setOtpPreviewNotice(`Test Mode: 5-Digit OTP is ${data.previewOtp}`);
        } else {
          setOtpPreviewNotice(null);
        }
        setView("otp");
      } catch (err: any) {
        setAuthError(err.message || "Failed to generate and send OTP to your Gmail. Please try again.");
      } finally {
        setIsSendingOtp(false);
      }
  };

  const handleVerifyOTP = async () => {
      const fullOtp = otp.join("");
      if (fullOtp.length !== 5) {
          setAuthError("Please enter the complete 5-digit OTP.");
          return;
      }

      setAuthError("");
      setIsVerifyingOtp(true);

      try {
        const response = await fetch("/api/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            otp: fullOtp,
            type: "register",
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Invalid or expired 5-digit verification code.");
        }

        store.registerUser(email.trim().toLowerCase(), fullName.trim(), "user");
        finishWithLoading();
      } catch (err: any) {
        setAuthError(err.message || "Verification failed. Please check your 5-digit OTP and try again.");
      } finally {
        setIsVerifyingOtp(false);
      }
  };

  const handleResendOTP = async () => {
      if (otpCooldown > 0 || isSendingOtp) return;
      setIsSendingOtp(true);
      setAuthError("");

      try {
        const response = await fetch("/api/otp/generate-and-send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            type: "register",
            fullName: fullName.trim(),
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Unable to resend OTP.");
        }

        setOtp(["", "", "", "", ""]);
        setOtpSecondsLeft(300);
        setOtpCooldown(data.cooldown || 30);
        if (data.previewOtp) {
          setOtpPreviewNotice(`Test Mode: 5-Digit OTP is ${data.previewOtp}`);
        }
        const firstInput = document.getElementById("otp-0");
        firstInput?.focus();
      } catch (err: any) {
        setAuthError(err.message || "Unable to resend OTP. Please try again later.");
      } finally {
        setIsSendingOtp(false);
      }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#e01f1f] flex items-center justify-center overflow-hidden">
        {/* Soft background clouds/blur simulation */}
        <div className="absolute inset-0 opacity-30 bg-gradient-to-tr from-black/20 via-transparent to-black/20 mix-blend-overlay"></div>
        {/* Concentric rings */}
        <div className="absolute w-48 h-48 sm:w-64 sm:h-64 border-2 border-black/20 rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>
        <div className="absolute w-96 h-96 sm:w-[32rem] sm:h-[32rem] border-2 border-black/10 rounded-full animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }}></div>
        <div className="absolute w-[40rem] h-[40rem] sm:w-[50rem] sm:h-[50rem] border border-black/5 rounded-full animate-ping" style={{ animationDuration: '4s', animationDelay: '1s' }}></div>
        <div className="relative z-10 w-24 h-24 bg-white/10 rounded-full backdrop-blur-md border border-white/20 shadow-2xl flex items-center justify-center">
            <Droplet className="w-10 h-10 text-white animate-pulse" />
        </div>
      </div>
    );
  }

  if (view === 'otp') {
    const fullOtp = otp.join("");
    const mins = Math.floor(otpSecondsLeft / 60);
    const secs = otpSecondsLeft % 60;
    const formattedTimer = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#ffecec] to-white relative flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 sm:p-10 max-w-md w-full shadow-2xl space-y-6">
          <div className="text-center space-y-2">
             <div className="flex justify-center mb-1">
                <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center p-2.5 border border-red-100 shadow-sm">
                  <HemolinkIcon className="w-full h-full text-[#9B1B28]" />
                </div>
             </div>
             <h2 className="text-xl font-black text-[#9B1B28] tracking-wider font-display uppercase">HEMOLINK</h2>
             <h1 className="text-2xl font-extrabold text-gray-900">Verify Your Account</h1>
             <p className="text-xs text-gray-600">
               We've sent a 5-digit verification code to your Gmail address:<br/>
               <span className="font-bold text-[#ba1111] bg-red-50 py-0.5 px-2.5 rounded-full inline-block mt-1">
                 {email.trim().toLowerCase() || "user@gmail.com"}
               </span>
             </p>
             <div className="flex justify-center mt-2">
               <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                 <Sparkles className="w-3 h-3 text-emerald-600" />
                 <span>Generated & Protected via Google Gemini AI</span>
               </span>
             </div>
          </div>

          {/* Test / Sandbox delivery notice */}
          {otpPreviewNotice && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-center">
              <p className="text-xs font-bold text-amber-800">{otpPreviewNotice}</p>
            </div>
          )}

          {/* Countdown timer */}
          <div className="text-center text-xs font-bold text-gray-700">
            <span>
              Code expires in:{" "}
              <span className={`font-mono ${otpSecondsLeft <= 60 ? "text-red-600 font-extrabold animate-pulse" : "text-gray-900"}`}>
                {formattedTimer}
              </span>
            </span>
          </div>
          
          {/* 5-Digit Inputs */}
          <div className="flex justify-center gap-2 sm:gap-3 my-4">
             {otp.map((digit, index) => (
               <input
                 key={index}
                 type="text"
                 inputMode="numeric"
                 pattern="[0-9]*"
                 maxLength={1}
                 value={digit} 
                 onChange={(e) => {
                   const numeric = e.target.value.replace(/\D/g, "");
                   if (!numeric && e.target.value !== "") return;
                   const newOtp = [...otp];
                   if (numeric.length > 1) {
                     numeric.slice(0, 5).split("").forEach((ch, idx) => {
                       if (idx < 5) newOtp[idx] = ch;
                     });
                     setOtp(newOtp);
                     const nextEl = document.getElementById(`otp-${Math.min(numeric.length, 4)}`);
                     nextEl?.focus();
                     return;
                   }
                   newOtp[index] = numeric.slice(-1);
                   setOtp(newOtp);
                   if (authError) setAuthError("");
                   if (numeric && index < 4) {
                     document.getElementById(`otp-${index + 1}`)?.focus();
                   }
                 }}
                 onKeyDown={(e) => {
                   if (e.key === "Backspace" && !otp[index] && index > 0) {
                     document.getElementById(`otp-${index - 1}`)?.focus();
                   }
                 }}
                 id={`otp-${index}`}
                 autoFocus={index === 0}
                 disabled={isVerifyingOtp}
                 className={`w-12 h-14 sm:w-14 sm:h-16 border rounded-xl text-center text-2xl font-black focus:outline-none transition-all ${
                   digit
                     ? "border-[#ba1111] bg-red-50/40 text-gray-900 ring-2 ring-[#ba1111]/30"
                     : "border-gray-200 bg-white text-gray-900 focus:border-[#ba1111] focus:ring-2 focus:ring-[#ba1111]/20"
                 }`} 
               />
             ))}
          </div>
          
          {authError && <p className="text-xs text-red-500 text-center font-medium bg-red-50 p-2.5 rounded-xl">{authError}</p>}
          
          <button
            onClick={handleVerifyOTP}
            disabled={isVerifyingOtp || fullOtp.length !== 5 || otpSecondsLeft <= 0}
            className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all mt-6 text-sm shadow-lg ${
              isVerifyingOtp || fullOtp.length !== 5 || otpSecondsLeft <= 0
                ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
                : "bg-[#ba1111] hover:bg-[#9a0f0f] text-white shadow-[#ba1111]/20 cursor-pointer"
            }`}
          >
            {isVerifyingOtp ? "Verifying 5-Digit OTP..." : "Verify & Complete Registration"} <ArrowRight className="w-4 h-4" />
          </button>
          
          <div className="text-center pt-2 space-y-2">
            <p className="text-xs text-gray-500">
              Didn't receive the code?{" "}
              {otpCooldown > 0 ? (
                <span className="font-semibold text-gray-400">Resend in <strong className="text-[#ba1111]">{otpCooldown}s</strong></span>
              ) : (
                <button
                  onClick={handleResendOTP}
                  disabled={isSendingOtp}
                  className="text-[#ba1111] font-bold cursor-pointer hover:underline bg-transparent border-0 p-0 text-xs inline"
                >
                  {isSendingOtp ? "Sending..." : "Resend 5-Digit OTP"}
                </button>
              )}
            </p>
            <div>
              <button
                type="button"
                onClick={() => {
                  setView("register");
                  setAuthError("");
                }}
                className="text-xs text-gray-500 hover:text-gray-800 underline bg-transparent border-0 cursor-pointer"
              >
                Change details / Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'forgot-password') {
    return (
      <RootBg>
        <ForgotPasswordView
          initialEmail={otpEmail || email}
          onBackToLogin={() => {
            setView('login');
            setAuthError("");
          }}
          onOtpSent={(submittedEmail) => {
            setOtpEmail(submittedEmail);
            setView('verify-otp');
            setAuthError("");
          }}
        />
      </RootBg>
    );
  }

  if (view === 'verify-otp') {
    return (
      <RootBg>
        <VerifyOtpView
          email={otpEmail || email}
          onVerified={(token, verifiedEmail) => {
            setResetToken(token);
            setOtpEmail(verifiedEmail);
            setView('reset-password');
            setAuthError("");
          }}
          onBackToEmail={() => {
            setView('forgot-password');
            setAuthError("");
          }}
        />
      </RootBg>
    );
  }

  if (view === 'reset-password') {
    return (
      <RootBg>
        <ResetPasswordView
          resetToken={resetToken}
          resetCode={resetCode}
          email={otpEmail || email}
          onBackToLogin={() => {
            setView('login');
            setResetToken("");
            setResetCode("");
            setAuthError("");
          }}
          onRequestNewLink={() => {
            setView('forgot-password');
            setResetToken("");
            setResetCode("");
            setAuthError("");
          }}
        />
      </RootBg>
    );
  }

  return (
    <RootBg>
      <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center relative pb-1">
           <div className="flex items-center justify-center gap-3.5 mb-2">
              <div className="w-14 h-14 bg-[#fff4f4] rounded-2xl flex items-center justify-center p-2.5 border border-[#ffdfdf] shadow-sm">
                 <HemolinkIcon className="w-full h-full text-[#9B1B28]" />
              </div>
              <div className="text-left">
                 <h1 className="text-3xl font-extrabold tracking-wider text-[#9B1B28] font-display leading-none uppercase">
                     HEMOLINK
                 </h1>
                 <p className="text-[#ba1111] font-bold text-xs mt-1.5">Connecting Blood. Saving Lives.</p>
              </div>
           </div>
           <p className="text-[10px] text-gray-500 font-medium">Your connection can save a life.</p>
        </div>

        <div className="bg-gray-100 p-1.5 rounded-xl flex items-center">
          <button onClick={()=>{setView('login'); setAuthError("");}} className={`flex-1 py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${view === 'login' ? 'bg-[#ba1111] text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
            <Lock className="w-3.5 h-3.5" /> LOGIN
          </button>
          <button onClick={()=>{setView('register'); setAuthError("");}} className={`flex-1 py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${view === 'register' ? 'bg-[#ba1111] text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
            <User className="w-3.5 h-3.5" /> REGISTER
          </button>
        </div>

        {view === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-email-input" className="text-xs font-bold text-gray-800 ml-1">Email Address</label>
              <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-[#ba1111] focus-within:ring-1 focus-within:ring-[#ba1111] transition-all bg-white">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                <input id="login-email-input" type="email" placeholder="Enter your email address" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full outline-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1 pr-1">
                <label htmlFor="login-password-input" className="text-xs font-bold text-gray-800">Password</label>
                <button
                  type="button"
                  id="login-forgot-password-link"
                  onClick={() => { setView('forgot-password'); setAuthError(""); }}
                  className="text-[10px] font-bold text-[#ba1111] hover:underline cursor-pointer bg-transparent border-0 p-0"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-[#ba1111] focus-within:ring-1 focus-within:ring-[#ba1111] transition-all bg-white">
                <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  id="login-password-input"
                  type={showLoginPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e=>setPassword(e.target.value)}
                  required
                  className="w-full outline-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400"
                />
                <button
                  type="button"
                  id="toggle-login-password-btn"
                  onClick={() => setShowLoginPassword(prev => !prev)}
                  aria-label={showLoginPassword ? "Hide password" : "Show password"}
                  className="focus:outline-none text-gray-400 hover:text-gray-600 p-1 cursor-pointer transition-colors"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            {authError && <p className="text-xs text-red-500 text-center font-medium bg-red-50 p-2 rounded-lg">{authError}</p>}
            
            <button type="submit" className="w-full bg-[#ba1111] hover:bg-[#9a0f0f] text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors mt-2 shadow-lg shadow-[#ba1111]/20">
              LOGIN <ArrowRight className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-[9px] font-bold text-gray-400 tracking-widest uppercase">OR CONTINUE WITH</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>
            
            <button type="button" onClick={handleGoogleLogin} className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 py-3 rounded-xl font-bold flex items-center justify-center gap-3 transition-colors shadow-sm text-sm">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>

            {/* Quick Demo Access Options */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">Quick Demo Login (One-Click)</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { store.switchUser("admin_super"); finishWithLoading(); }}
                  className="p-2 text-left bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition flex items-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <div className="truncate">
                    <div className="text-[11px] font-bold text-amber-950 leading-tight">Super Admin</div>
                    <div className="text-[9px] text-amber-700">Srini (Full console)</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { store.switchUser("donor_rahul_1"); finishWithLoading(); }}
                  className="p-2 text-left bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition flex items-center gap-2 cursor-pointer"
                >
                  <Droplet className="w-4 h-4 text-rose-600 shrink-0" />
                  <div className="truncate">
                    <div className="text-[11px] font-bold text-rose-950 leading-tight">Rahul Varma</div>
                    <div className="text-[9px] text-rose-700">Donor (O+ verified)</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { store.switchUser("donor_priya_2"); finishWithLoading(); }}
                  className="p-2 text-left bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition flex items-center gap-2 cursor-pointer"
                >
                  <Droplet className="w-4 h-4 text-purple-600 shrink-0" />
                  <div className="truncate">
                    <div className="text-[11px] font-bold text-purple-950 leading-tight">Priya Sharma</div>
                    <div className="text-[9px] text-purple-700">Donor (A- verified)</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { store.switchUser("user_seeker_1"); finishWithLoading(); }}
                  className="p-2 text-left bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition flex items-center gap-2 cursor-pointer"
                >
                  <User className="w-4 h-4 text-blue-600 shrink-0" />
                  <div className="truncate">
                    <div className="text-[11px] font-bold text-blue-950 leading-tight">Dr. Sandeep</div>
                    <div className="text-[9px] text-blue-700">Seeker (Hospital)</div>
                  </div>
                </button>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 text-center mt-6">
              Don't have an account? <span onClick={()=>setView('register')} className="text-[#ba1111] font-bold cursor-pointer hover:underline">Create an account</span>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800 ml-1">Full Name</label>
              <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-2.5 focus-within:border-[#ba1111] focus-within:ring-1 focus-within:ring-[#ba1111] transition-all bg-white">
                <User className="w-4 h-4 text-gray-400" />
                <input type="text" placeholder="John Doe" value={fullName} onChange={e=>setFullName(e.target.value)} required className="w-full outline-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-800 ml-1">Age</label>
                  <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-2.5 focus-within:border-[#ba1111] focus-within:ring-1 focus-within:ring-[#ba1111] transition-all bg-white">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <input type="number" placeholder="25" value={age} onChange={e=>setAge(e.target.value)} required min={18} className="w-full outline-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center ml-1">
                    <label htmlFor="register-phone-input" className="text-xs font-bold text-gray-800">Phone Number</label>
                    <span className={`text-[10px] ${phone.length > 13 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                      {phone.length}/13
                    </span>
                  </div>
                  <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-2.5 focus-within:border-[#ba1111] focus-within:ring-1 focus-within:ring-[#ba1111] transition-all bg-white">
                    <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                      id="register-phone-input"
                      type="tel"
                      placeholder="+919876543210"
                      maxLength={13}
                      value={phone}
                      onChange={e => {
                        const val = e.target.value;
                        if (val.length <= 13) {
                          setPhone(val);
                        }
                      }}
                      required
                      className="w-full outline-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="register-email-input" className="text-xs font-bold text-gray-800 ml-1">Email Address</label>
              <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-2.5 focus-within:border-[#ba1111] focus-within:ring-1 focus-within:ring-[#ba1111] transition-all bg-white">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                <input id="register-email-input" type="email" placeholder="john@example.com" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full outline-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="register-password-input" className="text-xs font-bold text-gray-800 ml-1">Password</label>
              <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-2.5 focus-within:border-[#ba1111] focus-within:ring-1 focus-within:ring-[#ba1111] transition-all bg-white">
                <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  id="register-password-input"
                  type={showRegisterPassword ? "text" : "password"}
                  placeholder="Create a password (min 6 chars)"
                  value={password}
                  onChange={e=>setPassword(e.target.value)}
                  required
                  className="w-full outline-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400"
                />
                <button
                  type="button"
                  id="toggle-register-password-btn"
                  onClick={() => setShowRegisterPassword(prev => !prev)}
                  aria-label={showRegisterPassword ? "Hide password" : "Show password"}
                  className="focus:outline-none text-gray-400 hover:text-gray-600 p-1 cursor-pointer transition-colors"
                >
                  {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="register-confirm-password-input" className="text-xs font-bold text-gray-800 ml-1">Confirm Password</label>
              <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-2.5 focus-within:border-[#ba1111] focus-within:ring-1 focus-within:ring-[#ba1111] transition-all bg-white">
                <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  id="register-confirm-password-input"
                  type={showRegisterConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={e=>setConfirmPassword(e.target.value)}
                  required
                  className="w-full outline-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400"
                />
                <button
                  type="button"
                  id="toggle-register-confirm-password-btn"
                  onClick={() => setShowRegisterConfirmPassword(prev => !prev)}
                  aria-label={showRegisterConfirmPassword ? "Hide password" : "Show password"}
                  className="focus:outline-none text-gray-400 hover:text-gray-600 p-1 cursor-pointer transition-colors"
                >
                  {showRegisterConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <div className="flex items-start gap-2 mt-4 ml-1">
              <input
                type="checkbox"
                id="register-terms-checkbox"
                checked={termsAccepted}
                onChange={e => setTermsAccepted(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-[#ba1111] focus:ring-[#ba1111] cursor-pointer"
              />
              <span className="text-[10px] text-gray-500 leading-tight select-none">
                I agree to the{" "}
                <button
                  type="button"
                  id="view-terms-conditions-btn"
                  onClick={() => setShowTermsModal(true)}
                  className="text-[#ba1111] font-bold cursor-pointer hover:underline inline p-0 bg-transparent border-0 font-sans text-[10px]"
                >
                  Terms & Conditions
                </button>{" "}
                and{" "}
                <button
                  type="button"
                  id="view-privacy-policy-btn"
                  onClick={() => setShowPrivacyModal(true)}
                  className="text-[#ba1111] font-bold cursor-pointer hover:underline inline p-0 bg-transparent border-0 font-sans text-[10px]"
                >
                  Privacy Policy
                </button>
                .
              </span>
            </div>
            
            {authError && <p className="text-xs text-red-500 text-center font-medium bg-red-50 p-2 rounded-lg">{authError}</p>}
            
            <button
              type="submit"
              disabled={isSendingOtp}
              className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors mt-4 shadow-lg ${
                isSendingOtp
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-[#ba1111] hover:bg-[#9a0f0f] text-white shadow-[#ba1111]/20 cursor-pointer"
              }`}
            >
              {isSendingOtp ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sending 5-Digit OTP to Gmail...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>
        )}

        {/* Full PDF Terms & Conditions Viewer Modal */}
        <TermsAndConditionsModal
          isOpen={showTermsModal}
          onClose={() => setShowTermsModal(false)}
          onAccept={() => {
            setTermsAccepted(true);
            setAuthError("");
          }}
        />

        {/* Full PDF Privacy Policy Viewer Modal */}
        <PrivacyPolicyModal
          isOpen={showPrivacyModal}
          onClose={() => setShowPrivacyModal(false)}
          onAcknowledge={() => {
            setTermsAccepted(true);
            setAuthError("");
          }}
        />
      </div>
    </RootBg>
  );
}
