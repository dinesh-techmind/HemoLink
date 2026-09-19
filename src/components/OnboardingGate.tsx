import React, { useState } from "react";
import {
  Droplet,
  ShieldCheck,
  User,
  ArrowRight,
  Calendar,
  Phone,
  RefreshCw,
  CheckCircle,
  MapPin,
  Mail,
  Info,
  Smartphone,
  UserPlus,
  X,
} from "lucide-react";
import { auth, db } from "../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { ConfirmationResult, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { store } from "../lib/store";
import { BloodGroup, Gender, GeoLocation } from "../types";
import TermsAndConditionsModal from "./TermsAndConditionsModal";
import PrivacyPolicyModal from "./PrivacyPolicyModal";
import SharedOtpVerificationView from "./SharedOtpVerificationView";
import AccountRecoveryView from "./AccountRecoveryView";
import { HemolinkIcon } from "./HemolinkLogo";
import {
  SUPPORTED_COUNTRIES,
  formatToE164,
  isValidE164,
  sendFirebasePhoneOtp,
  getFriendlyPhoneAuthError,
  clearRecaptcha,
  arePhonesEqual,
} from "../lib/phoneAuth";

const BLOOD_GROUPS: BloodGroup[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS: Gender[] = ["Male", "Female", "Other"];

const BLOOD_DONATION_QUOTES = [
  "A single pint can save up to three lives; a single gesture can create a million smiles.",
  "Donate blood and be the reason for someone's heartbeat.",
  "The blood you donate gives someone another chance at life.",
  "Heroes come in all types, and today yours can be A, B, AB, or O.",
  "You don't need a medical degree to save a life — just a willing heart and a pint of blood.",
  "Tears of a mother cannot save her child, but your blood can.",
  "Share life, give blood. It is the most precious gift of all."
];

const GoogleGIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

const RootBg = ({ children }: { children: React.ReactNode }) => (
  <div
    className="min-h-screen bg-[#750000] relative flex flex-col items-center justify-center p-4 overflow-y-auto"
    style={{
      backgroundImage:
        "radial-gradient(circle, rgba(255,255,255,0.08) 1.5px, transparent 1.5px)",
      backgroundSize: "24px 24px",
    }}
  >
    <div className="absolute top-4 left-4 sm:top-6 sm:left-8 flex items-center gap-3 text-white z-0">
      <div className="flex items-center gap-2 font-extrabold text-sm tracking-wider">
        <HemolinkIcon className="w-5 h-5 text-white" />
        <span>HEMOLINK</span>
      </div>
      <div className="bg-[#ba1111] text-white text-[9px] px-2 py-0.5 rounded-sm font-extrabold tracking-widest uppercase shadow-sm">
        EMERGENCY HUB
      </div>
    </div>
    <div className="absolute top-4 right-4 sm:top-6 sm:right-8 flex items-center gap-2 text-white/90 text-xs font-semibold z-0">
      <ShieldCheck className="w-4 h-4" />
      <span className="hidden sm:inline">Firebase Phone & Google Authentication</span>
    </div>
    <div className="relative z-10 w-full max-w-[440px] my-16">{children}</div>
  </div>
);

interface OnboardingGateProps {
  onComplete: () => void;
  authStep?: "credentials" | "otp";
  setAuthStep?: (step: "credentials" | "otp") => void;
  isSignUp?: boolean;
  setIsSignUp?: (isSignUp: boolean) => void;
}

export default function OnboardingGate({
  onComplete,
  authStep,
  setAuthStep,
  isSignUp,
  setIsSignUp,
}: OnboardingGateProps) {
  // Navigation views
  const [view, setViewInternal] = useState<"login" | "register" | "otp" | "donor_form" | "recovery">(
    isSignUp ? "register" : authStep === "otp" ? "otp" : "login"
  );

  const setView = (newView: "login" | "register" | "otp" | "donor_form" | "recovery") => {
    setViewInternal(newView);
    if (newView === "register") {
      setIsSignUp?.(true);
      setAuthStep?.("credentials");
    } else if (newView === "login") {
      setIsSignUp?.(false);
      setAuthStep?.("credentials");
    } else if (newView === "otp") {
      setAuthStep?.("otp");
    }
  };
  
  // Phone input states
  const [countryCode, setCountryCode] = useState<string>("+91");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [donorPhoneInput, setDonorPhoneInput] = useState<string>("");
  const [authAvatarUrl, setAuthAvatarUrl] = useState<string>("");
  const [authProviderUsed, setAuthProviderUsed] = useState<"phone" | "google">("phone");

  // Active Firebase Phone Auth confirmation result
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [verifiedUid, setVerifiedUid] = useState<string>("");
  const [verifiedPhone, setVerifiedPhone] = useState<string>("");

  // Step 4: Donor profile completion state
  const [signInUserName, setSignInUserName] = useState<string>("");
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<Gender>("Male");
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>("O+");
  const [city, setCity] = useState("Coimbatore");
  const [state, setState] = useState("Tamil Nadu");
  const [pincode, setPincode] = useState("641001");
  const [contactEmail, setContactEmail] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [location, setLocation] = useState<GeoLocation>({ lat: 11.0168, lng: 76.9558 });
  const [quoteIndex, setQuoteIndex] = useState<number>(0);

  // Backend mobile registration verification states
  const [isCheckingDatabase, setIsCheckingDatabase] = useState<boolean>(false);
  const [showRegisterPromptModal, setShowRegisterPromptModal] = useState<boolean>(false);
  const [unregisteredPhone, setUnregisteredPhone] = useState<string>("");
  const [registeredMatchName, setRegisteredMatchName] = useState<string | null>(null);
  const [registrationPrefillNotice, setRegistrationPrefillNotice] = useState<string | null>(null);

  const cleanE164 = formatToE164(countryCode, phoneNumber);

  // Real-time backend phone registration check as user types
  const handlePhoneChange = (rawNumber: string, dialCode: string) => {
    setAuthError("");
    const formatted = formatToE164(dialCode, rawNumber);
    const digits = rawNumber.replace(/\D/g, "");
    if (digits.length >= 10) {
      const match = store.isPhoneRegistered(formatted);
      if (match.isRegistered) {
        setRegisteredMatchName(match.name || "Registered User");
        if (!signInUserName.trim() && match.name) {
          setSignInUserName(match.name);
        }
      } else {
        setRegisteredMatchName(null);
      }
    } else {
      setRegisteredMatchName(null);
    }
  };

  // Modal action: seamlessly transitions unregistered new user into registration with pre-filled inputs
  const handleSwitchToRegisterFromModal = () => {
    setShowRegisterPromptModal(false);
    setView("register");
    setAuthError("");
    if (signInUserName.trim() && !fullName.trim()) {
      setFullName(signInUserName.trim());
    }
    setRegistrationPrefillNotice(
      `Mobile number ${unregisteredPhone || cleanE164} is ready. Please complete your donor profile details below.`
    );
  };

  const finishWithLoading = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onComplete();
    }, 1000);
  };

  // --------------------------------------------------------------------------
  // Continue with Google Authentication
  // --------------------------------------------------------------------------
  const handleGoogleSignIn = async () => {
    setAuthError("");
    setIsGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope("profile");
      provider.addScope("email");
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const email = user.email || "";
      const displayName = user.displayName || email.split("@")[0] || "Google Member";
      const phone = user.phoneNumber || "";
      const photo = user.photoURL || "";

      setAuthAvatarUrl(photo);
      setAuthProviderUsed("google");

      // Check if user already exists as donor in store
      const existingDonor = store.getDonors().find(
        (d) => d.uid === user.uid || (email && d.email.toLowerCase() === email.toLowerCase())
      );

      if (existingDonor) {
        // User already has an active donor profile - ensure profile consistency across AppUser and Donor
        store.registerGoogleUser(
          user.uid,
          existingDonor.email || email,
          existingDonor.fullName || displayName,
          existingDonor.phone || phone,
          photo || existingDonor.photoURL
        );
        finishWithLoading();
      } else if (view === "register") {
        // In "New Donor" registration mode:
        // Pre-fill verified details from Google profile to speed up registration
        setVerifiedUid(user.uid);
        if (displayName) setFullName(displayName);
        if (email) setContactEmail(email);
        if (phone) {
          const rawDigits = phone.replace(/^\+91/, "").replace(/\D/g, "");
          if (rawDigits) setPhoneNumber(rawDigits);
        }
      } else {
        // In "Sign In" mode:
        // Directly sign in to HemoLink with Google credentials
        store.registerGoogleUser(user.uid, email, displayName, phone, photo);
        finishWithLoading();
      }
    } catch (err: any) {
      console.warn("Google Sign-In Error:", err);
      if (err?.code === "auth/popup-closed-by-user") {
        setAuthError("Google sign-in popup was closed before completing.");
      } else if (err?.code === "auth/popup-blocked") {
        setAuthError("Popup was blocked by your browser. Please allow popups or open in a new tab.");
      } else if (err?.code === "auth/cancelled-popup-request") {
        // benign
      } else {
        setAuthError(err?.message || "Google authentication failed. Please try again or use Mobile OTP.");
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Step 1 & 2: Send OTP via Firebase Phone Authentication
  // Handles both Sign-In and New Donor Registration
  // --------------------------------------------------------------------------
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (view === "register") {
      // Validate New Donor details
      if (!fullName.trim()) {
        setAuthError("Please enter your full name.");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!contactEmail.trim() || !emailRegex.test(contactEmail.trim())) {
        setAuthError("Please enter a valid email address.");
        return;
      }

      if (!age.trim()) {
        setAuthError("Please enter your age.");
        return;
      }

      // Backend age validation: strictly age > 19 (enforced in backend, not showcased in frontend)
      const numAge = parseInt(age, 10);
      if (isNaN(numAge) || numAge <= 19) {
        setAuthError("Registration requirement not met: Age must be greater than 19.");
        return;
      }

      if (!phoneNumber.trim()) {
        setAuthError("Please enter your mobile phone number.");
        return;
      }

      if (!isValidE164(cleanE164)) {
        setAuthError("Please enter a valid mobile number with country code (e.g. 98765 43210).");
        return;
      }

      if (!termsAccepted) {
        setAuthError("You must accept the Terms & Conditions and Privacy Policy to register.");
        return;
      }

      // Check if this mobile number is already registered in backend database
      const checkExisting = store.isPhoneRegistered(cleanE164);
      if (checkExisting.isRegistered) {
        setAuthError(
          `This mobile number is already registered to ${checkExisting.name || "an existing profile"}. Please switch to the Sign In tab to access your account.`
        );
        return;
      }
    } else {
      // Sign-in mode: Old users only. Validate registered status in backend database
      if (!phoneNumber.trim()) {
        setAuthError("Please enter your registered mobile phone number.");
        return;
      }

      if (!isValidE164(cleanE164)) {
        setAuthError("Please enter a valid phone number with standard digits (e.g. 98765 43210).");
        return;
      }

      // Check in backend database whether mobile number is already registered or not
      setIsCheckingDatabase(true);
      setAuthError("");
      let dbCheck;
      try {
        dbCheck = await store.checkPhoneInBackend(cleanE164);
      } catch (checkErr) {
        console.warn("Backend phone registration check error:", checkErr);
        dbCheck = store.isPhoneRegistered(cleanE164);
      } finally {
        setIsCheckingDatabase(false);
      }

      if (!dbCheck.isRegistered) {
        // Mobile number is NOT registered in backend database!
        // Show pop up modal asking user to register their new profile or account
        setUnregisteredPhone(cleanE164);
        setShowRegisterPromptModal(true);
        return;
      }

      // If registered and user did not enter a user name, prefill from database
      if (dbCheck.name && !signInUserName.trim()) {
        setSignInUserName(dbCheck.name);
      }
      setRegisteredMatchName(dbCheck.name || null);
    }

    setIsSendingOtp(true);
    try {
      const containerId = "recaptcha-container";
      const confirmation = await sendFirebasePhoneOtp(cleanE164, containerId);
      setConfirmationResult(confirmation);
      if (typeof window !== "undefined") {
        (window as any).confirmationResult = confirmation;
      }
      setVerifiedPhone(cleanE164);
      setView("otp");
    } catch (err: any) {
      console.warn("Firebase Phone Auth send error:", err);
      setAuthError(getFriendlyPhoneAuthError(err));
    } finally {
      setIsSendingOtp(false);
    }
  };

  // --------------------------------------------------------------------------
  // Step 3: Verify OTP via Firebase Phone Authentication
  // --------------------------------------------------------------------------
  const handleVerifyOtp = async (otpCode: string) => {
    const activeConfirmation = confirmationResult || (typeof window !== "undefined" ? (window as any).confirmationResult : null);
    if (!activeConfirmation) {
      setAuthError("Verification session expired. Please request a new code.");
      return;
    }

    setIsVerifyingOtp(true);
    setAuthError("");

    try {
      const userCredential = await activeConfirmation.confirm(otpCode);
      const user = userCredential.user;
      const uid = user.uid;
      const phoneE164 = user.phoneNumber || cleanE164;

      setVerifiedUid(uid);
      setVerifiedPhone(phoneE164);

      // Store cryptographic phone verification proof in Firestore
      try {
        await setDoc(doc(db, "phone_verifications", uid), {
          uid,
          verifiedPhone: phoneE164,
          verified: true,
          verifiedAt: new Date().toISOString(),
        });
      } catch (verifErr) {
        console.warn("Could not write phone verification proof:", verifErr);
      }

      // Check if this was a new donor registration with collected details
      if (fullName.trim() && age.trim()) {
        const numAge = parseInt(age, 10);
        const finalPhone = phoneE164;
        const cleanEmail = contactEmail.trim().toLowerCase() || `${finalPhone.replace(/\D/g, "")}@donor.hemolink.org`;

        const appUser = authProviderUsed === "google"
          ? store.registerGoogleUser(
              uid,
              cleanEmail,
              fullName.trim(),
              finalPhone,
              authAvatarUrl || undefined
            )
          : store.registerMobileUser(
              uid,
              finalPhone,
              fullName.trim(),
              cleanEmail,
              "user"
            );

        store.registerDirectDonor({
          uid: appUser.uid,
          fullName: fullName.trim(),
          email: cleanEmail,
          phone: finalPhone,
          photoURL: authAvatarUrl || undefined,
          profilePhotoUrl: authAvatarUrl || undefined,
          authProvider: authProviderUsed === "google" ? "both" : "phone",
          age: numAge,
          gender,
          bloodGroup,
          city: city.trim() || "Coimbatore",
          state: state.trim() || "Tamil Nadu",
          pincode: pincode.trim() || "641001",
          location,
          isAvailable: true,
          lastDonationDate: null,
          donationCount: 0,
          savedUnits: 0,
        });

        finishWithLoading();
        return;
      }

      // Resolve existing donor or user record in backend database
      const existingDonor = store.getDonors().find(
        (d) => d.uid === uid || arePhonesEqual(d.phone, phoneE164)
      );
      const existingUser = store.getAllUsers().find(
        (u) => u.uid === uid || (u.phone && arePhonesEqual(u.phone, phoneE164))
      );

      const resolvedName =
        signInUserName.trim() ||
        existingDonor?.fullName ||
        existingUser?.fullName ||
        "Verified Member";

      const resolvedEmail =
        existingDonor?.email ||
        existingUser?.email ||
        `${phoneE164.replace(/\D/g, "")}@donor.hemolink.org`;

      // Log in / register the mobile user
      store.registerMobileUser(
        uid,
        phoneE164,
        resolvedName,
        resolvedEmail,
        existingUser?.role || "user"
      );

      // If user had an existing donor profile, update display name if user customized it
      if (existingDonor && signInUserName.trim()) {
        existingDonor.fullName = signInUserName.trim();
      }

      // Immediately move to home page of website
      finishWithLoading();
      return;
    } catch (err: any) {
      console.warn("Firebase Phone Auth verify error:", err);
      setAuthError(getFriendlyPhoneAuthError(err));
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    setAuthError("");
    try {
      const containerId = "recaptcha-container";
      const confirmation = await sendFirebasePhoneOtp(cleanE164, containerId);
      setConfirmationResult(confirmation);
      if (typeof window !== "undefined") {
        (window as any).confirmationResult = confirmation;
      }
    } catch (err: any) {
      setAuthError(getFriendlyPhoneAuthError(err));
      throw err;
    }
  };

  // --------------------------------------------------------------------------
  // Step 4: Submit Donor Registration Form
  // --------------------------------------------------------------------------
  const handleCompleteDonorRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (!fullName.trim()) {
      setAuthError("Please enter your full legal name.");
      return;
    }
    const numAge = parseInt(age, 10);
    if (isNaN(numAge) || numAge <= 19) {
      setAuthError("Registration requirement not met: Age must be greater than 19.");
      return;
    }
    if (!city.trim() || !state.trim() || !pincode.trim()) {
      setAuthError("Please complete your city, state, and pincode.");
      return;
    }
    if (!termsAccepted) {
      setAuthError("Please review and accept the Terms & Conditions and Privacy Policy.");
      return;
    }

    const finalPhone = (verifiedPhone || donorPhoneInput).trim();
    if (!finalPhone) {
      setAuthError("Please provide an emergency contact mobile number.");
      return;
    }

    const cleanEmail = contactEmail.trim().toLowerCase() || `${finalPhone.replace(/\D/g, "")}@donor.hemolink.org`;

    // 1. Create or link user in store with profile consistency
    const appUser = authProviderUsed === "google"
      ? store.registerGoogleUser(
          verifiedUid,
          cleanEmail,
          fullName.trim(),
          finalPhone,
          authAvatarUrl || undefined
        )
      : store.registerMobileUser(
          verifiedUid,
          finalPhone,
          fullName.trim(),
          cleanEmail,
          "user"
        );

    // 2. Create donor document in Firestore & store
    store.registerDirectDonor({
      uid: appUser.uid,
      fullName: fullName.trim(),
      email: cleanEmail,
      phone: finalPhone,
      photoURL: authAvatarUrl || undefined,
      profilePhotoUrl: authAvatarUrl || undefined,
      authProvider: authProviderUsed === "google" ? (finalPhone ? "both" : "google") : "phone",
      age: numAge,
      gender,
      bloodGroup,
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      location,
      isAvailable: true,
      lastDonationDate: null,
      donationCount: 0,
      savedUnits: 0,
    });

    finishWithLoading();
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#e01f1f] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-30 bg-gradient-to-tr from-black/20 via-transparent to-black/20 mix-blend-overlay"></div>
        <div
          className="absolute w-48 h-48 sm:w-64 sm:h-64 border-2 border-black/20 rounded-full animate-ping"
          style={{ animationDuration: "2s" }}
        ></div>
        <div
          className="absolute w-96 h-96 sm:w-[32rem] sm:h-[32rem] border-2 border-black/10 rounded-full animate-ping"
          style={{ animationDuration: "3s", animationDelay: "0.5s" }}
        ></div>
        <div className="relative z-10 w-24 h-24 bg-white/10 rounded-full backdrop-blur-md border border-white/20 shadow-2xl flex items-center justify-center">
          <Droplet className="w-10 h-10 text-white animate-pulse" />
        </div>
      </div>
    );
  }

  // View: Account Recovery
  if (view === "recovery") {
    return (
      <RootBg>
        <AccountRecoveryView
          onBackToLogin={() => {
            setView("login");
            setAuthError("");
          }}
        />
      </RootBg>
    );
  }

  // View: Shared OTP Verification
  if (view === "otp") {
    return (
      <RootBg>
        <div id="recaptcha-container"></div>
        <SharedOtpVerificationView
          phoneNumber={verifiedPhone || cleanE164}
          onVerify={handleVerifyOtp}
          onResend={handleResendOtp}
          onChangeNumber={() => {
            clearRecaptcha();
            setView(fullName ? "register" : "login");
            setAuthError("");
          }}
          isVerifying={isVerifyingOtp}
          isResending={isSendingOtp}
          error={authError}
          clearError={() => setAuthError("")}
          subtitleContext="Enter the 6-digit code sent to your registered mobile number via SMS."
          registeredDonor={
            fullName.trim()
              ? { fullName: fullName.trim(), email: contactEmail }
              : signInUserName.trim()
              ? { fullName: signInUserName.trim(), email: "" }
              : undefined
          }
        />
      </RootBg>
    );
  }

  // View: Step 4 Donor Profile Completion
  if (view === "donor_form") {
    return (
      <RootBg>
        <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-1">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center p-2.5 border border-red-100 shadow-sm">
                <HemolinkIcon className="w-full h-full text-[#9B1B28]" />
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-[10px] font-extrabold uppercase tracking-widest border border-emerald-200">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>{verifiedPhone ? "Mobile OTP Verified" : "Google Account Verified"}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Complete Donor Profile
            </h1>
            <p className="text-xs text-gray-600">
              Step 4: Enter your clinical details to activate your verified donor pass.
            </p>
          </div>

          <form onSubmit={handleCompleteDonorRegistration} className="space-y-4">
            {authProviderUsed === "google" && (
              <div className="flex items-center gap-3 bg-blue-50/70 border border-blue-200/80 rounded-xl p-3">
                {authAvatarUrl ? (
                  <img
                    src={authAvatarUrl}
                    alt="Google Profile"
                    className="w-10 h-10 rounded-full border border-blue-200 object-cover shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center shrink-0">
                    <GoogleGIcon className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-gray-900 truncate">{fullName || "Google Member"}</span>
                    <span className="text-[9px] font-extrabold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                      GOOGLE LINKED
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-600 truncate block">{contactEmail || "Signed in with Google"}</span>
                </div>
              </div>
            )}

            {/* Verified Phone or Emergency Mobile */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-800 ml-1">
                {verifiedPhone ? "Verified Mobile Number" : "Emergency Contact Mobile"}
              </label>
              {verifiedPhone ? (
                <div className="flex items-center justify-between border border-emerald-300 bg-emerald-50/50 rounded-xl px-4 py-2.5">
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <span>{verifiedPhone}</span>
                  </div>
                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    VERIFIED
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-2.5 bg-white focus-within:border-[#ba1111] focus-within:ring-1 focus-within:ring-[#ba1111]">
                    <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={donorPhoneInput}
                      onChange={(e) => setDonorPhoneInput(e.target.value)}
                      required
                      className="w-full text-sm outline-none text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 ml-1">Needed for clinical and hospital emergency dispatches.</p>
                </div>
              )}
            </div>

            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-800 ml-1">Full Legal Name</label>
              <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-2.5 bg-white focus-within:border-[#ba1111] focus-within:ring-1 focus-within:ring-[#ba1111]">
                <User className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="e.g. Rahul Varma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full text-sm outline-none text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Age and Gender */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-800 ml-1">Age</label>
                <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus-within:border-[#ba1111]">
                  <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                  <input
                    type="number"
                    placeholder="e.g. 24"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    required
                    className="w-full text-sm outline-none text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-800 ml-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender)}
                  className="w-full h-[42px] border border-gray-200 rounded-xl px-3 text-xs font-bold text-gray-900 bg-white outline-none focus:border-[#ba1111]"
                >
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Blood Group */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-800 ml-1">Blood Group</label>
              <div className="grid grid-cols-4 gap-2">
                {BLOOD_GROUPS.map((bg) => (
                  <button
                    key={bg}
                    type="button"
                    onClick={() => setBloodGroup(bg)}
                    className={`py-2 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                      bloodGroup === bg
                        ? "bg-[#ba1111] text-white border-[#ba1111] shadow-md shadow-red-600/20"
                        : "bg-gray-50 text-gray-800 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {bg}
                  </button>
                ))}
              </div>
            </div>

            {/* City & State */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-800 ml-1">City</label>
                <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-white focus-within:border-[#ba1111]">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
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

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-800 ml-1">Pincode</label>
                <input
                  type="text"
                  placeholder="641001"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  required
                  className="w-full h-[37px] border border-gray-200 rounded-xl px-3 text-xs outline-none text-gray-900 bg-white focus:border-[#ba1111]"
                />
              </div>
            </div>

            {/* Optional Email */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-800 ml-1">
                Contact Email <span className="text-gray-400 font-normal">(Optional for reports)</span>
              </label>
              <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-2.5 bg-white focus-within:border-[#ba1111]">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full text-sm outline-none text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Terms and Privacy Checkbox */}
            <div className="flex items-start gap-2 pt-1 ml-1">
              <input
                type="checkbox"
                id="donor-terms-checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-[#ba1111] focus:ring-[#ba1111] cursor-pointer"
              />
              <span className="text-[10px] text-gray-500 leading-tight select-none">
                I agree to the{" "}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-[#ba1111] font-bold cursor-pointer hover:underline inline p-0 bg-transparent border-0 text-[10px]"
                >
                  Terms & Conditions
                </button>{" "}
                and{" "}
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(true)}
                  className="text-[#ba1111] font-bold cursor-pointer hover:underline inline p-0 bg-transparent border-0 text-[10px]"
                >
                  Privacy Policy
                </button>
                .
              </span>
            </div>

            {authError && (
              <p className="text-xs text-red-500 text-center font-medium bg-red-50 p-2.5 rounded-xl">
                {authError}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-[#ba1111] hover:bg-[#9a0f0f] text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#ba1111]/20 cursor-pointer text-sm"
            >
              <span>Complete Registration & Save Lives</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <TermsAndConditionsModal
            isOpen={showTermsModal}
            onClose={() => setShowTermsModal(false)}
            onAccept={() => {
              setTermsAccepted(true);
              setAuthError("");
            }}
          />

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

  // --------------------------------------------------------------------------
  // Default Views: Login & Register Initial Phone Input
  // --------------------------------------------------------------------------
  return (
    <RootBg>
      <div id="recaptcha-container"></div>

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
              <p className="text-[#ba1111] font-bold text-xs mt-1.5">
                Connecting Blood. Saving Lives.
              </p>
            </div>
          </div>
          {/* Blood Donation Motivational Quote */}
          <div className="mt-3 bg-red-50/70 border border-red-100/90 rounded-xl px-3.5 py-2 text-left flex items-start gap-2.5 shadow-sm">
            <span className="text-base text-[#9B1B28] leading-none shrink-0 select-none font-serif">“</span>
            <p className="text-[11px] text-[#750000] italic leading-snug font-medium flex-1">
              {BLOOD_DONATION_QUOTES[quoteIndex]}
            </p>
            <button
              type="button"
              onClick={() => setQuoteIndex((prev) => (prev + 1) % BLOOD_DONATION_QUOTES.length)}
              className="text-[#9B1B28]/60 hover:text-[#9B1B28] p-0.5 rounded transition-colors shrink-0"
              title="Next quote"
              aria-label="Next quote"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Tab switch between Login and Register */}
        <div className="bg-gray-100 p-1.5 rounded-xl flex items-center">
          <button
            type="button"
            onClick={() => {
              setView("login");
              setAuthError("");
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
              view === "login"
                ? "bg-[#ba1111] text-white shadow-md"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" /> SIGN IN
          </button>
          <button
            type="button"
            onClick={() => {
              setView("register");
              setAuthError("");
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
              view === "register"
                ? "bg-[#ba1111] text-white shadow-md"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <User className="w-3.5 h-3.5" /> NEW DONOR
          </button>
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-xl font-extrabold text-gray-900">
            {view === "login" ? "Welcome Back to HemoLink" : "New Donor Registration"}
          </h2>
          <p className="text-xs text-gray-600">
            {view === "login"
              ? "Sign in with Google or your registered mobile number."
              : "Enter your details and verify your registered mobile number via SMS OTP."}
          </p>
        </div>

        {/* Continue with Google Action */}
        <div className="space-y-3">
          <button
            type="button"
            id="continue-with-google-btn"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isSendingOtp}
            className="w-full py-3 px-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50/90 bg-white text-gray-800 font-bold flex items-center justify-center gap-3 transition-all shadow-sm hover:shadow active:scale-[0.99] cursor-pointer text-sm disabled:opacity-60 disabled:cursor-not-allowed group"
          >
            {isGoogleLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#ba1111]" />
                <span className="text-gray-700">Connecting to Google...</span>
              </>
            ) : (
              <>
                <GoogleGIcon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                <span>{view === "register" ? "Prefill Details with Google" : "Continue with Google"}</span>
              </>
            )}
          </button>

          {/* Clean Divider */}
          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-gray-200 w-full"></div>
            <span className="bg-white px-3 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest whitespace-nowrap">
              {view === "register" ? "or enter details manually" : "or use mobile number"}
            </span>
            <div className="border-t border-gray-200 w-full"></div>
          </div>
        </div>

        {view === "register" ? (
          /* New Donor Registration Page */
          <form onSubmit={handleSendOtp} className="space-y-3.5">
            {registrationPrefillNotice && (
              <div className="flex items-center justify-between text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-xl p-3 font-medium animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{registrationPrefillNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRegistrationPrefillNotice(null)}
                  className="text-blue-500 hover:text-blue-700 font-bold p-0.5"
                  aria-label="Dismiss notice"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-800 ml-1">Full Name</label>
              <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-2.5 bg-white focus-within:border-[#ba1111] focus-within:ring-1 focus-within:ring-[#ba1111] transition-all">
                <User className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="e.g. Rahul Varma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full text-sm outline-none text-gray-900 placeholder:text-gray-400 bg-transparent font-medium"
                />
              </div>
            </div>

            {/* Email ID */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-800 ml-1">Email ID</label>
              <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-2.5 bg-white focus-within:border-[#ba1111] focus-within:ring-1 focus-within:ring-[#ba1111] transition-all">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="email"
                  placeholder="e.g. rahul.varma@example.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  required
                  className="w-full text-sm outline-none text-gray-900 placeholder:text-gray-400 bg-transparent font-medium"
                />
              </div>
            </div>

            {/* Age & Blood Group */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-800 ml-1">Age</label>
                <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus-within:border-[#ba1111] focus-within:ring-1 focus-within:ring-[#ba1111] transition-all">
                  <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                  <input
                    type="number"
                    placeholder="e.g. 24"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    required
                    className="w-full text-sm outline-none text-gray-900 placeholder:text-gray-400 bg-transparent font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-800 ml-1">Blood Group</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                  className="w-full h-[42px] border border-gray-200 rounded-xl px-3 text-xs font-bold text-gray-900 bg-white outline-none focus:border-[#ba1111] cursor-pointer"
                >
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mobile Number */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-800 ml-1">
                Mobile Number
              </label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2.5 text-xs font-bold text-gray-800 outline-none focus:border-[#ba1111] transition-all cursor-pointer"
                >
                  {SUPPORTED_COUNTRIES.map((c) => (
                    <option key={`cc-${c.code}`} value={c.dialCode}>
                      {c.flag} {c.dialCode}
                    </option>
                  ))}
                </select>
                <div className="flex-1 flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-2.5 bg-white focus-within:border-[#ba1111] focus-within:ring-1 focus-within:ring-[#ba1111] transition-all">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  <input
                    type="tel"
                    placeholder="98765 43210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    className="w-full text-sm outline-none text-gray-900 placeholder:text-gray-400 bg-transparent font-medium"
                  />
                </div>
              </div>
              <p className="text-[10px] text-gray-400 ml-1">
                SMS verification code will be sent to this registered mobile number.
              </p>
            </div>

            {/* Terms and Privacy Checkbox */}
            <div className="flex items-start gap-2.5 pt-1 ml-1 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
              <input
                type="checkbox"
                id="donor-reg-terms"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-[#ba1111] focus:ring-[#ba1111] cursor-pointer"
              />
              <label htmlFor="donor-reg-terms" className="text-[11px] text-gray-600 leading-snug cursor-pointer select-none">
                I agree to the{" "}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-[#ba1111] font-bold cursor-pointer hover:underline inline p-0 bg-transparent border-0 text-[11px]"
                >
                  Terms & Conditions
                </button>{" "}
                and{" "}
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(true)}
                  className="text-[#ba1111] font-bold cursor-pointer hover:underline inline p-0 bg-transparent border-0 text-[11px]"
                >
                  Privacy Policy
                </button>
                .
              </label>
            </div>

            {authError && (
              <p className="text-xs text-red-500 text-center font-medium bg-red-50 p-2.5 rounded-xl border border-red-100">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSendingOtp}
              className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg text-sm ${
                isSendingOtp
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-[#ba1111] hover:bg-[#9a0f0f] text-white shadow-[#ba1111]/20 cursor-pointer"
              }`}
            >
              {isSendingOtp ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending SMS OTP to Registered Mobile...</span>
                </>
              ) : (
                <>
                  <span>Verify Mobile & Move to OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Sign In Page */
          <form onSubmit={handleSendOtp} className="space-y-3.5">
            {/* User Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-800 ml-1 flex items-center justify-between">
                <span>User Name</span>
                <span className="text-[10px] text-gray-400 font-normal">
                  {registeredMatchName ? "Verified from database" : "Optional if registered"}
                </span>
              </label>
              <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-2.5 bg-white focus-within:border-[#ba1111] focus-within:ring-1 focus-within:ring-[#ba1111] transition-all">
                <User className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="e.g. virat or Virat Kohli"
                  value={signInUserName}
                  onChange={(e) => setSignInUserName(e.target.value)}
                  className="w-full text-sm outline-none text-gray-900 placeholder:text-gray-400 bg-transparent font-medium"
                />
              </div>
            </div>

            {/* Mobile Phone Number */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-800 ml-1 flex items-center justify-between">
                <span>Registered Mobile Phone</span>
                <span className="text-[10px] text-[#ba1111] font-semibold">Existing Members Only</span>
              </label>
              <div className="flex gap-2">
                {/* Country Code Picker */}
                <select
                  value={countryCode}
                  onChange={(e) => {
                    setCountryCode(e.target.value);
                    handlePhoneChange(phoneNumber, e.target.value);
                  }}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2.5 text-xs font-bold text-gray-800 outline-none focus:border-[#ba1111] transition-all cursor-pointer"
                >
                  {SUPPORTED_COUNTRIES.map((c) => (
                    <option key={`cc-${c.code}`} value={c.dialCode}>
                      {c.flag} {c.dialCode}
                    </option>
                  ))}
                </select>

                {/* Number Input */}
                <div className="flex-1 flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-2.5 bg-white focus-within:border-[#ba1111] focus-within:ring-1 focus-within:ring-[#ba1111] transition-all">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  <input
                    type="tel"
                    id="signin-mobile-phone-input"
                    placeholder="98765 43210"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      handlePhoneChange(e.target.value, countryCode);
                    }}
                    onBlur={() => {
                      if (phoneNumber.replace(/\D/g, "").length >= 10 && !registeredMatchName) {
                        const quick = store.isPhoneRegistered(cleanE164);
                        if (!quick.isRegistered) {
                          setUnregisteredPhone(cleanE164);
                          setShowRegisterPromptModal(true);
                        }
                      }
                    }}
                    required
                    className="w-full text-sm outline-none text-gray-900 placeholder:text-gray-400 bg-transparent font-medium"
                  />
                </div>
              </div>

              {/* Real-time database match status */}
              {registeredMatchName ? (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 mt-1 font-medium animate-in fade-in duration-150">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Registered account: <strong>{registeredMatchName}</strong> (Ready to Sign In)</span>
                </div>
              ) : phoneNumber.replace(/\D/g, "").length >= 10 ? (
                <div className="flex items-center justify-between gap-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-1 animate-in fade-in duration-150">
                  <span className="flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    Number not registered in database.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setUnregisteredPhone(cleanE164);
                      setShowRegisterPromptModal(true);
                    }}
                    className="text-[#ba1111] font-bold hover:underline cursor-pointer"
                  >
                    Register Profile →
                  </button>
                </div>
              ) : (
                <p className="text-[10px] text-gray-400 ml-1">
                  Database check runs on entry. Unregistered numbers will be prompted to register.
                </p>
              )}
            </div>

            {authError && (
              <p className="text-xs text-red-500 text-center font-medium bg-red-50 p-2.5 rounded-xl border border-red-100">
                {authError}
              </p>
            )}

            <button
              type="submit"
              id="signin-submit-btn"
              disabled={isSendingOtp || isCheckingDatabase}
              className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg text-sm ${
                isSendingOtp || isCheckingDatabase
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-[#ba1111] hover:bg-[#9a0f0f] text-white shadow-[#ba1111]/20 cursor-pointer"
              }`}
            >
              {isCheckingDatabase ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Mobile in Database...</span>
                </>
              ) : isSendingOtp ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending SMS OTP via Firebase...</span>
                </>
              ) : (
                <>
                  <span>Sign In & Send OTP Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Account Recovery Helper Link */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setView("recovery");
                  setAuthError("");
                }}
                className="text-xs text-[#ba1111] font-bold hover:underline cursor-pointer bg-transparent border-0 p-0"
              >
                Need help accessing your account?
              </button>
            </div>

            {/* Quick Demo Login (One-Click) */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">
                Quick Demo Access (One-Click Persona Switch)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    store.switchUser("admin_super");
                    finishWithLoading();
                  }}
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
                  onClick={() => {
                    store.switchUser("donor_rahul_1");
                    finishWithLoading();
                  }}
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
                  onClick={() => {
                    store.switchUser("donor_priya_2");
                    finishWithLoading();
                  }}
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
                  onClick={() => {
                    store.switchUser("user_seeker_1");
                    finishWithLoading();
                  }}
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
          </form>
        )}

        <TermsAndConditionsModal
          isOpen={showTermsModal}
          onClose={() => setShowTermsModal(false)}
          onAccept={() => {
            setTermsAccepted(true);
            setAuthError("");
          }}
        />

        <PrivacyPolicyModal
          isOpen={showPrivacyModal}
          onClose={() => setShowPrivacyModal(false)}
          onAcknowledge={() => {
            setTermsAccepted(true);
            setAuthError("");
          }}
        />

        {/* Unregistered Mobile Number Pop-Up Prompt Modal */}
        {showRegisterPromptModal && (
          <div
            id="unregistered-user-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="unregistered-modal-title"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          >
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-red-100 text-center relative animate-in zoom-in-95 duration-200">
              {/* Dismiss button */}
              <button
                type="button"
                id="close-unregistered-modal-btn"
                onClick={() => setShowRegisterPromptModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon Graphic */}
              <div className="w-16 h-16 mx-auto bg-red-50 text-[#ba1111] rounded-2xl flex items-center justify-center mb-4 border border-red-100 shadow-sm">
                <UserPlus className="w-8 h-8" />
              </div>

              {/* Badges & Titles */}
              <span className="inline-block bg-amber-50 text-amber-800 text-[11px] font-bold px-3 py-1 rounded-full border border-amber-200 mb-2.5">
                Mobile Number Not Registered
              </span>
              <h3
                id="unregistered-modal-title"
                className="text-xl font-extrabold text-gray-900 mb-2 font-display"
              >
                Register Your New Profile
              </h3>

              {/* Descriptive Explanations */}
              <p className="text-sm text-gray-600 mb-2 leading-relaxed">
                The mobile number <span className="font-bold text-gray-900">{unregisteredPhone || cleanE164}</span> was checked against our backend database and is not yet registered.
              </p>
              <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 mb-5 text-left flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-gray-600 leading-relaxed">
                  Existing users can sign in immediately. To protect donor accounts and life-saving communication, new members must register their profile first.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  id="modal-register-new-profile-btn"
                  onClick={handleSwitchToRegisterFromModal}
                  className="w-full py-3.5 px-4 bg-[#ba1111] hover:bg-[#9a0f0f] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#ba1111]/20 transition-all text-sm cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register Your New Profile</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </button>

                <button
                  type="button"
                  id="modal-change-number-btn"
                  onClick={() => setShowRegisterPromptModal(false)}
                  className="w-full py-2.5 px-4 text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
                >
                  Change Mobile Number
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RootBg>
  );
}
