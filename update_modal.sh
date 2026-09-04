#!/bin/bash
cat << 'INNER_EOF' > src/components/DonorIdentityPassModal.tsx
import React, { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Donor, AppUser } from "../types";
import { store } from "../lib/store";
import { auth } from "../lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
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
  Sparkles,
  Edit3,
  Save,
  HardDrive
} from "lucide-react";

interface DonorIdentityPassModalProps {
  donor: Donor;
  user?: AppUser | null;
  onClose: () => void;
}

const COOLDOWN_DAYS = 56;

export default function DonorIdentityPassModal({ donor: initialDonor, user, onClose }: DonorIdentityPassModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  
  const [donor, setDonor] = useState(initialDonor);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(initialDonor);
  
  const [showDriveConfirm, setShowDriveConfirm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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
    nextEligibilityDate = new Date(lastDate);
    nextEligibilityDate.setDate(nextEligibilityDate.getDate() + COOLDOWN_DAYS);
    
    if (nextEligibilityDate > now) {
      isEligible = false;
      const diffTime = Math.abs(nextEligibilityDate.getTime() - now.getTime());
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  }

  const handlePrint = () => {
    window.print();
  };

  const qrPayload = JSON.stringify({
    uid: donor.uid,
    bg: donor.bloodGroup,
    v: "2.0"
  });

  const handleSaveEdit = () => {
    try {
      store.updateDonorProfile({
        phone: editForm.phone,
        city: editForm.city,
        state: editForm.state,
        pincode: editForm.pincode,
        profilePhotoUrl: editForm.profilePhotoUrl
      });
      setDonor(editForm);
      setIsEditing(false);
    } catch (e: any) {
      alert(e.message);
    }
  };
  
  const handleSaveToDrive = async () => {
    setIsUploading(true);
    try {
        const provider = new GoogleAuthProvider();
        provider.addScope('https://www.googleapis.com/auth/drive.file');
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken;

        if (!token) throw new Error("Could not get Google Drive access token.");

        // Upload to Drive
        const fileContent = `
HEMOLINK VERIFIED DONOR PASS
----------------------------------------
ID: HL-${donor.uid.slice(-8).toUpperCase()}
Name: ${donor.fullName}
Blood Group: ${donor.bloodGroup}
Age: ${donor.age}
Gender: ${donor.gender}
Location: ${donor.city}, ${donor.state} (${donor.pincode})
Contact Phone: ${donor.phone}
Contact Email: ${donor.email}
Total Donations: ${donor.donationCount} Units Saved
Availability: ${donor.isAvailable ? "Ready to Donate" : "Cooldown"}
----------------------------------------
Official Emergency Pass • Issued by HEMOLINK Network
        `;
        
        const metadata = {
            name: \`Hemolink_Donor_Pass_\${donor.fullName.replace(/\\s+/g, '_')}.txt\`,
            mimeType: 'text/plain'
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([fileContent], { type: 'text/plain' }));

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                Authorization: \`Bearer \${token}\`
            },
            body: form
        });

        if (response.ok) {
            alert('Donor pass saved to Google Drive successfully!');
            handlePrint();
            setShowDriveConfirm(false);
        } else {
            const err = await response.text();
            alert('Failed to save to Drive: ' + err);
        }
    } catch (e: any) {
        console.error(e);
        alert('Google Drive integration failed: ' + e.message);
    } finally {
        setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 print:p-0">
      {/* Backdrop overlay (hidden on print) */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm no-print"
        onClick={onClose}
      ></div>

      {/* Modal Content container */}
      <div className="relative w-full max-w-2xl bg-[#0D0D0D] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden print:shadow-none print:border-none print:rounded-none z-10 my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Accent Bar */}
        <div className="h-2 w-full bg-gradient-to-r from-brand-red via-rose-500 to-amber-500 print:hidden"></div>
        
        {/* Close button (hidden on print) */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white bg-zinc-900 hover:bg-zinc-800 p-2 rounded-full transition no-print z-20"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Print specific branding header */}
          <div className="hidden print:flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <Droplet className="w-6 h-6 text-brand-red fill-brand-red" />
              <span className="font-display font-black text-white text-lg tracking-wider">HEMOLINK</span>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-zinc-500 font-mono">Printed on: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div 
            ref={cardRef}
            className="bg-card-dark border border-zinc-800/80 p-6 sm:p-8 rounded-2xl relative overflow-hidden print:border-none print:p-0"
          >
            {/* Background watermark */}
            <div className="absolute -right-16 -top-16 opacity-5 pointer-events-none print:opacity-10">
              <ShieldCheck className="w-64 h-64 text-brand-red" />
            </div>

            {/* Pass Header */}
            <div className="flex items-start justify-between relative z-10 border-b border-zinc-800 pb-4">
              <div>
                <h1 className="text-2xl font-black text-white font-display uppercase tracking-tight flex items-center gap-2">
                  <ShieldCheck className="w-7 h-7 text-brand-red" />
                  Donor Identity Pass
                </h1>
                <p className="text-[10px] text-brand-red font-bold uppercase tracking-widest mt-1">
                  Global Emergency Network • Active Access
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block bg-zinc-900 border border-zinc-700 text-zinc-300 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider shadow-inner">
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
                
                {isEditing ? (
                  <div className="space-y-3 p-3 bg-surface-dark border border-border-dark rounded-xl">
                    <div>
                        <label className="text-[10px] text-text-subtle font-mono uppercase">Phone</label>
                        <input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full bg-[#1C1C1C] border border-border-dark rounded p-1.5 text-xs text-text-bright" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] text-text-subtle font-mono uppercase">City</label>
                            <input type="text" value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} className="w-full bg-[#1C1C1C] border border-border-dark rounded p-1.5 text-xs text-text-bright" />
                        </div>
                        <div>
                            <label className="text-[10px] text-text-subtle font-mono uppercase">State</label>
                            <input type="text" value={editForm.state} onChange={e => setEditForm({...editForm, state: e.target.value})} className="w-full bg-[#1C1C1C] border border-border-dark rounded p-1.5 text-xs text-text-bright" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] text-text-subtle font-mono uppercase">Pincode</label>
                        <input type="text" value={editForm.pincode} onChange={e => setEditForm({...editForm, pincode: e.target.value})} className="w-full bg-[#1C1C1C] border border-border-dark rounded p-1.5 text-xs text-text-bright" />
                    </div>
                    <div>
                        <label className="text-[10px] text-text-subtle font-mono uppercase">Photo URL</label>
                        <input type="text" value={editForm.profilePhotoUrl || ""} onChange={e => setEditForm({...editForm, profilePhotoUrl: e.target.value})} className="w-full bg-[#1C1C1C] border border-border-dark rounded p-1.5 text-xs text-text-bright" placeholder="https://..." />
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                        <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-xs text-text-subtle border border-border-dark rounded">Cancel</button>
                        <button onClick={handleSaveEdit} className="px-3 py-1.5 text-xs bg-brand-red text-white font-bold rounded flex items-center gap-1"><Save className="w-3 h-3"/> Save</button>
                    </div>
                  </div>
                ) : (
                  <>
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
                  </>
                )}
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
            {showDriveConfirm ? (
              <div className="bg-surface-dark border border-border-dark p-3 rounded-xl flex items-center gap-3 w-full sm:w-auto">
                 <p className="text-[10px] text-text-bright font-bold">Are your details correct?</p>
                 <button onClick={() => { setIsEditing(true); setShowDriveConfirm(false); }} className="px-3 py-1.5 text-[10px] border border-border-dark text-text-muted hover:text-white rounded flex items-center gap-1">
                    <Edit3 className="w-3 h-3" /> Modify Details
                 </button>
                 <button onClick={handleSaveToDrive} disabled={isUploading} className="px-3 py-1.5 text-[10px] bg-brand-red text-white font-bold rounded flex items-center gap-1">
                    {isUploading ? "Uploading..." : <><HardDrive className="w-3 h-3" /> Yes, Save & Print</>}
                 </button>
              </div>
            ) : (
                <>
                <button 
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-surface-dark hover:bg-zinc-800 text-text-subtle hover:text-white text-xs font-bold transition cursor-pointer border border-border-dark"
                >
                Close
                </button>
                <button 
                id="print-donor-pass-btn"
                onClick={() => setShowDriveConfirm(true)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand-red hover:bg-brand-red-dark text-white text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-brand-red/30"
                >
                <Printer className="w-4 h-4" />
                <span>Save to Drive & Print</span>
                </button>
                </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
INNER_EOF
