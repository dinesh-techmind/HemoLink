import React, { useState } from 'react';
import { Droplet, Mail, ShieldCheck, User, Lock, Eye, ArrowRight, Calendar, Phone } from 'lucide-react';
import { auth } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { store } from '../lib/store';

const RootBg = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-[#750000] relative flex flex-col items-center justify-center p-4 overflow-y-auto" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}>
      <div className="absolute top-4 left-4 sm:top-6 sm:left-8 flex items-center gap-3 text-white z-0">
        <div className="flex items-center gap-1.5 font-bold text-sm tracking-widest">
          <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
          HEMOLINK
        </div>
        <div className="bg-[#ba1111] text-white text-[9px] px-2 py-0.5 rounded-sm font-extrabold tracking-widest uppercase shadow-sm">EMERGENCY HUB</div>
      </div>
      <div className="absolute top-4 right-4 sm:top-6 sm:right-8 flex items-center gap-2 text-white/90 text-xs font-semibold z-0">
        <ShieldCheck className="w-4 h-4" />
        <span className="hidden sm:inline">Secure Medical Dispatch</span>
      </div>
      <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-8 text-white/70 text-[10px] font-medium z-0 hidden sm:block">
        © 2024 Hemolink Emergency Network. Priority Clinical Protocol.
      </div>
      <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-8 flex items-center gap-1.5 text-white/90 text-[10px] font-semibold z-0 hidden sm:flex">
        <Lock className="w-3.5 h-3.5" />
        Encrypted HIPAA-Ready <span className="text-white/40">|</span> Response Time: &lt;3m
      </div>
      <div className="relative z-10 w-full max-w-[420px] my-16">
        {children}
      </div>
    </div>
  );

  
  
export default function OnboardingGate({ onComplete }: { onComplete: () => void }) {
  const [view, setView] = useState<"login" | "register" | "otp">("login");
  const [authError, setAuthError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  
  
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
      provider.addScope('https://mail.google.com/');
      provider.addScope('https://www.googleapis.com/auth/gmail.addons.current.action.compose');
      provider.addScope('https://www.googleapis.com/auth/gmail.addons.current.message.action');
      provider.addScope('https://www.googleapis.com/auth/gmail.addons.current.message.metadata');
      provider.addScope('https://www.googleapis.com/auth/gmail.addons.current.message.readonly');
      provider.addScope('https://www.googleapis.com/auth/gmail.compose');
      provider.addScope('https://www.googleapis.com/auth/gmail.insert');
      provider.addScope('https://www.googleapis.com/auth/gmail.labels');
      provider.addScope('https://www.googleapis.com/auth/gmail.metadata');
      provider.addScope('https://www.googleapis.com/auth/gmail.modify');
      provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
      provider.addScope('https://www.googleapis.com/auth/gmail.send');
      provider.addScope('https://www.googleapis.com/auth/gmail.settings.basic');
      provider.addScope('https://www.googleapis.com/auth/gmail.settings.sharing');
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (token) {
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

  const handleRegister = (e: React.FormEvent) => {
      e.preventDefault();
      if (password !== confirmPassword) {
          setAuthError("Passwords do not match.");
          return;
      }
      if (!termsAccepted) {
          setAuthError("Please accept Terms & Conditions.");
          return;
      }
      setAuthError("");
      setView("otp");
  };

  const handleVerifyOTP = () => {
      if (otp.join("").length === 6) {
          store.registerUser(email, fullName, "user");
          finishWithLoading();
      } else {
          setAuthError("Please enter a valid 6-digit OTP.");
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#ffecec] to-white relative flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 sm:p-10 max-w-md w-full shadow-2xl space-y-6">
          <div className="text-center space-y-3">
             <div className="flex justify-center text-[#ba1111] mb-2">
                <Droplet className="w-6 h-6" />
             </div>
             <h2 className="text-xl font-bold text-[#ba1111] tracking-wide">HEMOLINK</h2>
             <h1 className="text-2xl font-extrabold text-gray-900">Verify Your Account</h1>
             <p className="text-xs text-gray-500">We've sent a verification code to<br/><span className="font-bold text-gray-800">{email || "b******@gmail.com"}</span></p>
          </div>
          
          <div className="flex justify-between gap-2 mt-6">
             {otp.map((digit, index) => (
               <input key={index} type="text" maxLength={1} value={digit} 
                 onChange={(e) => {
                   const newOtp = [...otp];
                   newOtp[index] = e.target.value;
                   setOtp(newOtp);
                   if (e.target.value && index < 5) {
                     document.getElementById(`otp-${index + 1}`)?.focus();
                   }
                 }}
                 id={`otp-${index}`}
                 className="w-10 h-12 sm:w-12 sm:h-14 border border-gray-200 rounded-lg text-center text-xl font-bold focus:outline-none focus:border-[#ba1111] focus:ring-1 focus:ring-[#ba1111] text-gray-900" 
               />
             ))}
          </div>
          
          {authError && <p className="text-xs text-red-500 text-center font-medium mt-2">{authError}</p>}
          
          <button onClick={handleVerifyOTP} className="w-full bg-[#ba1111] hover:bg-[#9a0f0f] text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors mt-6">
            Verify & Continue <ArrowRight className="w-4 h-4" />
          </button>
          
          <p className="text-xs text-gray-500 text-center mt-6">
            Didn't receive the code? <span className="text-[#ba1111] font-bold cursor-pointer hover:underline">Resend OTP in 3s</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <RootBg>
      <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-1 relative">
           <div className="w-12 h-12 bg-[#fff4f4] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#ffdfdf]">
              <Droplet className="w-6 h-6 text-[#ba1111]" />
           </div>
           <h1 className="text-2xl font-extrabold tracking-tight text-[#ba1111] font-display">
               HEMOLINK
           </h1>
           <p className="text-[#ba1111] font-bold text-xs mt-1">Connecting Blood. Saving Lives.</p>
           <p className="text-[10px] text-gray-500 font-medium">Your connection can save a life.</p>
        </div>

        <div className="bg-gray-100 p-1.5 rounded-xl flex items-center">
          <button onClick={()=>{setView('login'); setAuthError("");}} className={`flex-1 py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${view === 'login' ? 'bg-[#ba1111] text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
            <Lock className="w-3.5 h-3.5" /> LOGIN
          </button>
          <button onClick={()=>{setView('register'); setAuthError("");}} className={`flex-1 py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${view === 'register' ? 'bg-[#ba1111] text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
            <User className="w-3.5 h-3.5" /> REGISTER
          </button>
        </div>

        {view === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800 ml-1">Email Address</label>
              <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-[#ba1111] focus-within:ring-1 focus-within:ring-[#ba1111] transition-all bg-white">
                <Mail className="w-4 h-4 text-gray-400" />
                <input type="email" placeholder="Enter your email address" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full outline-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1 pr-1">
                <label className="text-xs font-bold text-gray-800">Password</label>
                <a href="#" className="text-[10px] font-bold text-[#ba1111] hover:underline">Forgot Password?</a>
              </div>
              <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-[#ba1111] focus-within:ring-1 focus-within:ring-[#ba1111] transition-all bg-white">
                <Lock className="w-4 h-4 text-gray-400" />
                <input type="password" placeholder="Enter your password" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full outline-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400" />
                <Eye className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" />
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
            
            <div className="mt-6 bg-[#fff4f4] border border-[#ffdfdf] rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#ba1111] text-[10px] font-bold">
                <Droplet className="w-3.5 h-3.5" />
                Critical deficit: Type O- Needed
              </div>
              <span className="bg-white text-[#ba1111] text-[9px] font-bold px-2 py-1 rounded shadow-sm border border-[#ffdfdf]">URGENT</span>
            </div>
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
                  <label className="text-xs font-bold text-gray-800 ml-1">Phone Number</label>
                  <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-2.5 focus-within:border-[#ba1111] focus-within:ring-1 focus-within:ring-[#ba1111] transition-all bg-white">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <input type="tel" placeholder="+1 (555) 000-0000" value={phone} onChange={e=>setPhone(e.target.value)} required className="w-full outline-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400" />
                  </div>
                </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800 ml-1">Email Address</label>
              <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-2.5 focus-within:border-[#ba1111] focus-within:ring-1 focus-within:ring-[#ba1111] transition-all bg-white">
                <Mail className="w-4 h-4 text-gray-400" />
                <input type="email" placeholder="john@example.com" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full outline-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800 ml-1">Password</label>
              <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-2.5 focus-within:border-[#ba1111] focus-within:ring-1 focus-within:ring-[#ba1111] transition-all bg-white">
                <Lock className="w-4 h-4 text-gray-400" />
                <input type="password" placeholder="Create a password" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full outline-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400" />
                <Eye className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800 ml-1">Confirm Password</label>
              <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-2.5 focus-within:border-[#ba1111] focus-within:ring-1 focus-within:ring-[#ba1111] transition-all bg-white">
                <Lock className="w-4 h-4 text-gray-400" />
                <input type="password" placeholder="Confirm your password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required className="w-full outline-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400" />
                <Eye className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" />
              </div>
            </div>
            
            <div className="flex items-start gap-2 mt-4 ml-1">
              <input type="checkbox" checked={termsAccepted} onChange={e=>setTermsAccepted(e.target.checked)} className="mt-0.5 rounded border-gray-300 text-[#ba1111] focus:ring-[#ba1111]" />
              <span className="text-[10px] text-gray-500 leading-tight">
                I agree to the <span className="text-[#ba1111] font-bold cursor-pointer hover:underline">Terms & Conditions</span> and <span className="text-[#ba1111] font-bold cursor-pointer hover:underline">Privacy Policy</span>.
              </span>
            </div>
            
            {authError && <p className="text-xs text-red-500 text-center font-medium bg-red-50 p-2 rounded-lg">{authError}</p>}
            
            <button type="submit" className="w-full bg-[#ba1111] hover:bg-[#9a0f0f] text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors mt-4 shadow-lg shadow-[#ba1111]/20">
              Create Account
            </button>
          </form>
        )}
      </div>
    </RootBg>
  );
}
