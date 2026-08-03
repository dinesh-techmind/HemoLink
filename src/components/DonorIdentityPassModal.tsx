import React, { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Donor, AppUser } from "../types";
import {
  Droplet,
  ShieldCheck,
  Printer,
  X,
  Calendar,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  Award,
  Clock,
  Sparkles
} from "lucide-react";

interface DonorIdentityPassModalProps {
  donor: Donor;
  user?: AppUser | null;
  onClose: () => void;
}

const COOLDOWN_DAYS = 56;

export default function DonorIdentityPassModal({ donor, user, onClose }: DonorIdentityPassModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Calculate Next Eligibility Date
  const now = new Date();
  let lastDate: Date | null = donor.lastDonationDate ? new Date(donor.lastDonationDate) : null;
  if (lastDate && isNaN(lastDate.getTime())) {
    lastDate = null;
  }

  let nextEligibilityDate: Date | null = null;
  let isEligible = true;
  let daysRemaining = 0;

  if (lastDate) {
    nextEligibilityDate = new Date(lastDate.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
    const diffMs = nextEligibilityDate.getTime() - now.getTime();
    if (diffMs > 0) {
      isEligible = false;
      daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }
  }

  const qrPayload = JSON.stringify({
    system: "HEMOLINK_EMERGENCY_NETWORK",
    uid: donor.uid,
    fullName: donor.fullName,
    bloodGroup: donor.bloodGroup,
    city: donor.city,
    isAvailable: donor.isAvailable,
    verificationCode: `HL-DONOR-${donor.uid.slice(-6).toUpperCase()}`
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-donor-pass, #printable-donor-pass * {
            visibility: visible;
          }
          #printable-donor-pass {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: 2px solid #000000 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-xl bg-card-dark border border-border-dark rounded-3xl shadow-2xl overflow-hidden my-auto">
        {/* Top Header bar */}
        <div className="flex items-center justify-between p-4 px-6 bg-surface-dark border-b border-border-dark no-print">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-brand-red animate-pulse" />
            <h2 className="text-sm font-bold text-text-bright font-display tracking-tight">
              HEMOLINK Verified Donor Pass
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-card-dark hover:bg-zinc-800 text-text-subtle hover:text-white transition cursor-pointer"
            title="Close Pass"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Pass Body */}
        <div className="p-6 sm:p-8 space-y-6" id="printable-donor-pass" ref={cardRef}>
          
          {/* Card Frame Visual Container */}
          <div className="relative bg-gradient-to-br from-zinc-900 via-card-dark to-zinc-950 border-2 border-brand-red/40 rounded-2xl p-6 shadow-2xl overflow-hidden">
            
            {/* Background Emblem Watermark */}
            <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
              <Droplet className="w-64 h-64 text-brand-red fill-brand-red" />
            </div>

            {/* Pass Top Branding Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-red flex items-center justify-center shadow-md shadow-brand-red/30 shrink-0">
                  <Droplet className="w-5 h-5 text-white fill-white" />
                </div>
                <div>
                  <h1 className="text-lg font-black tracking-wider text-white font-display uppercase">
                    HEMOLINK
                  </h1>
                  <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
                    Connecting donors. Saving Lifes.
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[9px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  VERIFIED DONOR PASS
                </span>
                <p className="text-[9px] text-zinc-500 font-mono mt-1">
                  ID: HL-{donor.uid.slice(-8).toUpperCase()}
                </p>
              </div>
            </div>

            {/* Main Pass Content Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-5 items-center">
              
              {/* Profile Photo & Blood Group Badge */}
              <div className="flex flex-col items-center justify-center text-center space-y-3 sm:border-r sm:border-zinc-800 sm:pr-4">
                <div className="relative">
                  {donor.profilePhotoUrl ? (
                    <img
                      src={donor.profilePhotoUrl}
                      alt={donor.fullName}
                      className="w-24 h-24 rounded-2xl object-cover border-2 border-brand-red shadow-xl"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-brand-red to-rose-900 flex items-center justify-center text-white text-3xl font-black font-display border-2 border-brand-red/50 shadow-xl">
                      {donor.fullName ? donor.fullName[0].toUpperCase() : "D"}
                    </div>
                  )}
                  <span className="absolute -bottom-2 -right-2 bg-brand-red text-white text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase shadow-lg border border-white/20">
                    PASS
                  </span>
                </div>

                <div className="bg-brand-red/10 border-2 border-brand-red px-4 py-1.5 rounded-xl">
                  <span className="text-[9px] text-zinc-400 font-bold uppercase block tracking-wider">BLOOD GROUP</span>
                  <span className="text-2xl font-black font-display text-brand-red tracking-tight">{donor.bloodGroup}</span>
                </div>
              </div>

              {/* Personal & Medical Info */}
              <div className="sm:col-span-2 space-y-3">
                <div>
                  <h2 className="text-xl font-extrabold text-white font-display leading-tight">
                    {donor.fullName}
                  </h2>
                  <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-brand-red" />
                    <span>{donor.city}, {donor.state} ({donor.pincode})</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-zinc-800/80">
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-zinc-500 uppercase font-mono font-semibold block">Total Donated</span>
                    <span className="text-xs font-bold text-white font-mono flex items-center gap-1">
                      <Droplet className="w-3 h-3 text-brand-red fill-brand-red" />
                      {donor.donationCount} Units Saved
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[9px] text-zinc-500 uppercase font-mono font-semibold block">Availability Status</span>
                    <span className={`text-xs font-bold font-mono flex items-center gap-1 ${donor.isAvailable ? "text-emerald-400" : "text-amber-400"}`}>
                      <CheckCircle2 className="w-3 h-3" />
                      {donor.isAvailable ? "Ready to Donate" : "Away / Cooldown"}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[9px] text-zinc-500 uppercase font-mono font-semibold block">Phone Contact</span>
                    <span className="text-[11px] font-semibold text-zinc-300 font-mono flex items-center gap-1 truncate">
                      <Phone className="w-3 h-3 text-zinc-400" />
                      {donor.phone || "Not Listed"}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[9px] text-zinc-500 uppercase font-mono font-semibold block">Registered Email</span>
                    <span className="text-[11px] font-semibold text-zinc-300 font-mono flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3 text-zinc-400" />
                      {donor.email || "Verified"}
                    </span>
                  </div>
                </div>

                {/* Donation Schedule Bar */}
                <div className="bg-zinc-900/90 border border-zinc-800 p-2.5 rounded-xl flex items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider block">Last Donation</span>
                    <span className="text-xs font-bold text-white font-mono">{donor.lastDonationDate || "Never Logged"}</span>
                  </div>

                  <div className="h-6 w-[1px] bg-zinc-800"></div>

                  <div>
                    <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider block">Next Eligible Date</span>
                    <span className={`text-xs font-extrabold font-mono ${isEligible ? "text-emerald-400" : "text-amber-400"}`}>
                      {nextEligibilityDate ? nextEligibilityDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Eligible Now"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Scannable QR Verification Bar */}
            <div className="mt-6 pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-950/80 p-3.5 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-xl shadow-md shrink-0">
                  <QRCodeSVG
                    value={qrPayload}
                    size={72}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <div className="text-left space-y-0.5">
                  <p className="text-xs font-extrabold text-white flex items-center gap-1 font-mono">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>SCAN FOR QUICK BLOOD BANK VERIFICATION</span>
                  </p>
                  <p className="text-[10px] text-zinc-400 leading-tight">
                    Scan code at partnered medical centers & blood banks to verify donor authenticity instantly.
                  </p>
                  <p className="text-[9px] text-zinc-500 font-mono">
                    Security Token: HL-SEC-{donor.uid.slice(-6).toUpperCase()}-2026
                  </p>
                </div>
              </div>
            </div>

            {/* Verification Footer Text */}
            <div className="mt-4 text-center">
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">
                Official Emergency Pass • Issued by HEMOLINK Network • Connecting donors. Saving Lifes.
              </p>
            </div>

          </div>

          {/* Action buttons (hidden on print) */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 no-print">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-surface-dark hover:bg-zinc-800 text-text-subtle hover:text-white text-xs font-bold transition cursor-pointer border border-border-dark"
            >
              Close
            </button>

            <button
              id="print-donor-pass-btn"
              onClick={handlePrint}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand-red hover:bg-brand-red-dark text-white text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-brand-red/30"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save Donor Pass</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
