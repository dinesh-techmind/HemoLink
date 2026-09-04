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
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  Sparkles,
  Edit3,
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState(initialDonor);
  
  const [isUploading, setIsUploading] = useState(false);

  // Calculate Next Eligibility Date
  const now = new Date();
  let lastDate: Date | null = donor.lastDonationDate ? new Date(donor.lastDonationDate) : null;
  if (lastDate && isNaN(lastDate.getTime())) {
    lastDate = null;
  }

  let nextEligibilityDate: Date | null = null;
  let isEligible = true;

  if (lastDate) {
    nextEligibilityDate = new Date(lastDate);
    nextEligibilityDate.setDate(nextEligibilityDate.getDate() + COOLDOWN_DAYS);
    
    if (nextEligibilityDate > now) {
      isEligible = false;
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

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      store.updateDonorProfile({
        phone: editForm.phone,
        city: editForm.city,
        state: editForm.state,
        pincode: editForm.pincode,
        profilePhotoUrl: editForm.profilePhotoUrl
      });
      setDonor(editForm);
      setShowEditModal(false);
    } catch (e: any) {
      alert(e.message);
    }
  };
  
  const handleSaveToDrive = async () => {
    setIsUploading(true);
    try {
        let token = (window as any)._googleOAuthToken;
        if (!token) {
            const provider = new GoogleAuthProvider();
            provider.addScope('https://www.googleapis.com/auth/drive.file');
            const result = await signInWithPopup(auth, provider);
            const credential = GoogleAuthProvider.credentialFromResult(result);
            token = credential?.accessToken;
            if (token) (window as any)._googleOAuthToken = token;
        }

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
            name: `Hemolink_Donor_Pass_${donor.fullName.replace(/\s+/g, '_')}.txt`,
            mimeType: 'text/plain'
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([fileContent], { type: 'text/plain' }));

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: form
        });

        if (response.ok) {
            alert('Donor pass saved to Google Drive successfully!');
            handlePrint();
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
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm no-print" onClick={onClose}></div>

      {showEditModal && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowEditModal(false)}></div>
             <div className="relative w-full max-w-md bg-card-dark border border-border-dark rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95">
                 <div className="flex justify-between items-center mb-4">
                     <h2 className="text-lg font-bold text-white font-display">Modify Pass Details</h2>
                     <button onClick={() => setShowEditModal(false)} className="text-text-muted hover:text-white">
                         <X className="w-5 h-5" />
                     </button>
                 </div>
                 <form onSubmit={handleSaveEdit} className="space-y-4">
                     <div>
                        <label className="text-[10px] text-text-subtle font-mono uppercase">Profile Photo URL</label>
                        <input type="text" value={editForm.profilePhotoUrl || ""} onChange={e => setEditForm({...editForm, profilePhotoUrl: e.target.value})} className="w-full bg-surface-dark border border-border-dark rounded-lg p-2.5 text-xs text-white" placeholder="https://..." />
                    </div>
                    <div>
                        <label className="text-[10px] text-text-subtle font-mono uppercase">Phone Number</label>
                        <input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full bg-surface-dark border border-border-dark rounded-lg p-2.5 text-xs text-white" required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] text-text-subtle font-mono uppercase">City</label>
                            <input type="text" value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} className="w-full bg-surface-dark border border-border-dark rounded-lg p-2.5 text-xs text-white" required />
                        </div>
                        <div>
                            <label className="text-[10px] text-text-subtle font-mono uppercase">State</label>
                            <input type="text" value={editForm.state} onChange={e => setEditForm({...editForm, state: e.target.value})} className="w-full bg-surface-dark border border-border-dark rounded-lg p-2.5 text-xs text-white" required />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] text-text-subtle font-mono uppercase">Pincode</label>
                        <input type="text" value={editForm.pincode} onChange={e => setEditForm({...editForm, pincode: e.target.value})} className="w-full bg-surface-dark border border-border-dark rounded-lg p-2.5 text-xs text-white" required />
                    </div>
                    <button type="submit" className="w-full bg-brand-red text-white py-3 rounded-lg text-xs font-bold uppercase tracking-wider">
                        Confirm & Update
                    </button>
                 </form>
             </div>
         </div>
      )}

      <div className="relative w-full max-w-2xl bg-[#0D0D0D] border border-border-dark rounded-3xl shadow-2xl overflow-hidden print:shadow-none print:border-none print:rounded-none z-10 my-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="h-2 w-full bg-gradient-to-r from-brand-red via-rose-500 to-amber-500 print:hidden"></div>
        <button onClick={onClose} className="absolute top-4 right-4 text-text-subtle hover:text-white bg-surface-dark p-2 rounded-full transition no-print z-20"><X className="w-5 h-5" /></button>

        <div className="p-6 sm:p-8 space-y-6">
          <div ref={cardRef} className="bg-card-dark border border-border-dark p-6 sm:p-8 rounded-2xl relative overflow-hidden print:border-none print:p-0">
            <div className="absolute -right-16 -top-16 opacity-5 pointer-events-none print:opacity-10">
              <ShieldCheck className="w-64 h-64 text-brand-red" />
            </div>

            <div className="flex items-start justify-between relative z-10 border-b border-border-dark pb-4">
              <div>
                <h1 className="text-2xl font-black text-white font-display uppercase tracking-tight flex items-center gap-2">
                  <ShieldCheck className="w-7 h-7 text-brand-red" /> Donor Identity Pass
                </h1>
                <p className="text-[10px] text-brand-red font-bold uppercase tracking-widest mt-1">Global Emergency Network</p>
              </div>
              <div className="text-right">
                <span className="inline-block bg-surface-dark border border-border-dark text-text-bright text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider shadow-inner">
                 VERIFIED DONOR PASS
                </span>
                <p className="text-[9px] text-text-subtle font-mono mt-1">ID: HL-{donor.uid.slice(-8).toUpperCase()}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-5 items-center">
              <div className="flex flex-col items-center justify-center text-center space-y-3 sm:border-r sm:border-border-dark sm:pr-4">
                <div className="relative">
                  {donor.profilePhotoUrl ? (
                    <img src={donor.profilePhotoUrl} alt={donor.fullName} className="w-24 h-24 rounded-2xl object-cover border-2 border-brand-red shadow-xl" />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-brand-red to-rose-900 flex items-center justify-center text-white text-3xl font-black font-display border-2 border-brand-red/50 shadow-xl">
                      {donor.fullName ? donor.fullName[0].toUpperCase() : "D"}
                    </div>
                  )}
                  <span className="absolute -bottom-2 -right-2 bg-brand-red text-white text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase shadow-lg border border-white/20">PASS</span>
                </div>
                
                <div className="bg-brand-red/10 border-2 border-brand-red px-4 py-1.5 rounded-xl">
                  <span className="text-[9px] text-text-muted font-bold uppercase block tracking-wider">BLOOD GROUP</span>
                  <span className="text-2xl font-black font-display text-brand-red tracking-tight">{donor.bloodGroup}</span>
                </div>
              </div>

              <div className="sm:col-span-2 space-y-3">
                  <div>
                    <h2 className="text-xl font-extrabold text-white font-display leading-tight">{donor.fullName}</h2>
                    <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-brand-red" />
                      <span>{donor.city}, {donor.state} ({donor.pincode})</span>
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border-dark">
                    <div className="space-y-0.5 mt-2">
                      <span className="text-[9px] text-text-subtle uppercase font-mono font-semibold block">Total Donated</span>
                      <span className="text-xs font-bold text-white font-mono flex items-center gap-1"><Droplet className="w-3 h-3 text-brand-red fill-brand-red" />{donor.donationCount} Units Saved</span>
                    </div>
                    
                    <div className="space-y-0.5 mt-2">
                      <span className="text-[9px] text-text-subtle uppercase font-mono font-semibold block">Availability Status</span>
                      <span className={`text-xs font-bold font-mono flex items-center gap-1 ${donor.isAvailable ? "text-emerald-400" : "text-amber-400"}`}>
                        <CheckCircle2 className="w-3 h-3" /> {donor.isAvailable ? "Ready to Donate" : "Away / Cooldown"}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[9px] text-text-subtle uppercase font-mono font-semibold block">Phone Contact</span>
                      <span className="text-[11px] font-semibold text-text-bright font-mono flex items-center gap-1 truncate"><Phone className="w-3 h-3 text-text-muted" />{donor.phone || "Not Listed"}</span>
                    </div>
                    
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-text-subtle uppercase font-mono font-semibold block">Registered Email</span>
                      <span className="text-[11px] font-semibold text-text-bright font-mono flex items-center gap-1 truncate"><Mail className="w-3 h-3 text-text-muted" />{donor.email || "Verified"}</span>
                    </div>
                  </div>

                  <div className="bg-surface-dark border border-border-dark p-2.5 rounded-xl flex items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="text-[9px] text-text-muted uppercase font-bold tracking-wider block">Last Donation</span>
                      <span className="text-xs font-bold text-white font-mono">{donor.lastDonationDate || "Never Logged"}</span>
                    </div>
                    <div className="h-6 w-[1px] bg-border-dark"></div>
                    <div>
                      <span className="text-[9px] text-text-muted uppercase font-bold tracking-wider block">Next Eligible Date</span>
                      <span className={`text-xs font-extrabold font-mono ${isEligible ? "text-emerald-400" : "text-amber-400"}`}>
                        {nextEligibilityDate ? nextEligibilityDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Eligible Now"}
                      </span>
                    </div>
                  </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border-dark flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-dark p-3.5 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-xl shadow-md shrink-0">
                  <QRCodeSVG value={qrPayload} size={72} level="H" includeMargin={false} />
                </div>
                <div className="text-left space-y-0.5">
                  <p className="text-xs font-extrabold text-white flex items-center gap-1 font-mono">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>SCAN FOR VERIFICATION</span>
                  </p>
                  <p className="text-[10px] text-text-muted leading-tight">Scan code at partnered medical centers to verify authenticity.</p>
                  <p className="text-[9px] text-text-subtle font-mono">Security Token: HL-SEC-{donor.uid.slice(-6).toUpperCase()}-2026</p>
                </div>
              </div>
            </div>

            <div className="mt-4 text-center">
              <p className="text-[9px] text-text-subtle uppercase tracking-widest font-mono">
                Official Emergency Pass • Issued by HEMOLINK Network
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 no-print">
            <button onClick={() => setShowEditModal(true)} className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-surface-dark border border-border-dark text-text-subtle hover:text-white text-xs font-bold flex items-center gap-2">
                <Edit3 className="w-4 h-4" /> Modify Pass Details
            </button>
            <button id="print-donor-pass-btn" onClick={handleSaveToDrive} disabled={isUploading} className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand-red hover:bg-brand-red-dark text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg">
               {isUploading ? "Uploading..." : <><HardDrive className="w-4 h-4" /> Save to Drive & Print</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
INNER_EOF
