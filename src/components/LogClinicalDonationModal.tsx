import React, { useState } from "react";
import { X, Droplet, ShieldCheck, Award, Calendar, AlertCircle, Heart, CheckCircle, Hospital } from "lucide-react";
import { Donor } from "../types";
import { store } from "../lib/store";
import { MilestoneTier, getDonorSavedUnits, getMilestoneTier } from "../lib/milestones";
import { TAMIL_NADU_BLOOD_BANKS } from "../data/tamilNaduBloodBanks";

interface LogClinicalDonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  donor: Donor;
  onSuccess?: (result: { newTotalUnits: number; unitsEarned: number; newTier: MilestoneTier; isTierUpgraded: boolean }) => void;
}

export const LogClinicalDonationModal: React.FC<LogClinicalDonationModalProps> = ({
  isOpen,
  onClose,
  donor,
  onSuccess
}) => {
  if (!isOpen) return null;

  const currentUnits = getDonorSavedUnits(donor);
  const currentTier = getMilestoneTier(currentUnits);

  const [selectedCenter, setSelectedCenter] = useState<string>(
    TAMIL_NADU_BLOOD_BANKS[0]?.name || "Rajiv Gandhi Government General Hospital Blood Bank, Chennai"
  );
  const [customCenter, setCustomCenter] = useState<string>("");
  const [donationType, setDonationType] = useState<"Whole Blood" | "Platelets" | "Plasma" | "Double Red Cells">("Whole Blood");
  const [unitsDonated, setUnitsDonated] = useState<number>(1);
  const [donationDate, setDonationDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [certNumber, setCertNumber] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successInfo, setSuccessInfo] = useState<{
    unitsEarned: number;
    newTotalUnits: number;
    newTier: MilestoneTier;
    isTierUpgraded: boolean;
  } | null>(null);

  // Check cooldown from last donation date
  let daysSinceLastDonation: number | null = null;
  if (donor.lastDonationDate) {
    const lastD = new Date(donor.lastDonationDate);
    if (!isNaN(lastD.getTime())) {
      const now = new Date();
      const diffMs = now.getTime() - lastD.getTime();
      daysSinceLastDonation = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }
  }

  // Unit multiplier estimation
  const getExpectedUnits = () => {
    let mult = 10;
    if (donationType === "Double Red Cells") mult = 20;
    else if (donationType === "Platelets") mult = 15;
    else if (donationType === "Plasma") mult = 10;
    return unitsDonated * mult;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const centerName = selectedCenter === "Other" ? (customCenter || "Certified Regional Blood Center") : selectedCenter;

    try {
      const res = store.recordClinicalBloodDonation({
        donorUid: donor.uid,
        centerName,
        donationType,
        unitsDonated,
        donationDate,
        notes: certNumber ? `Certificate Ref: ${certNumber}` : undefined
      });

      setSuccessInfo(res);
      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err: any) {
      alert(`Error logging donation: ${err?.message || "Please try again."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className="bg-[#121214] border border-border-dark rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl my-8 relative flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-950 via-[#181416] to-[#121214] p-5 border-b border-border-dark flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-red/20 border border-brand-red/40 flex items-center justify-center text-brand-red shadow">
              <Droplet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-brand-red bg-brand-red/10 px-2 py-0.5 rounded border border-brand-red/20">
                Tamper-Proof Verification
              </span>
              <h3 className="text-base font-extrabold text-text-bright font-display mt-0.5">
                Record Clinical Blood Donation
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-surface-dark border border-border-dark text-text-muted hover:text-text-bright transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {successInfo ? (
            <div className="py-6 space-y-4 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg animate-bounce">
                <CheckCircle className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-lg font-black text-text-bright font-display">
                  Donation Successfully Verified!
                </h4>
                <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                  Your blood donation was recorded. Blood units were automatically credited and your milestone standing has been updated.
                </p>
              </div>

              <div className="p-4 bg-surface-dark border border-border-dark rounded-2xl max-w-sm mx-auto space-y-2 text-left">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-muted">Blood Units Credited:</span>
                  <span className="font-extrabold text-emerald-400 font-mono">+{successInfo.unitsEarned} Saved Units</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-muted">New Cumulative Total:</span>
                  <span className="font-extrabold text-brand-red font-mono">{successInfo.newTotalUnits} Saved Units</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-muted">Active Milestone Badge:</span>
                  <span className="font-extrabold text-amber-400 font-display">{successInfo.newTier.name}</span>
                </div>
                {successInfo.isTierUpgraded && (
                  <div className="p-2.5 mt-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/40 rounded-xl text-center">
                    <p className="text-[11px] font-extrabold text-amber-300 font-display flex items-center justify-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-400" />
                      <span>NEW BADGE UNLOCKED: {successInfo.newTier.name}!</span>
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-brand-red hover:bg-brand-red-dark text-white rounded-xl font-bold text-xs shadow-lg transition cursor-pointer font-display uppercase tracking-wider"
                >
                  Done & Return to Profile
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Cooldown reminder banner */}
              {daysSinceLastDonation !== null && daysSinceLastDonation < 56 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div className="text-[11px] leading-relaxed">
                    <strong>Medical Safety Advisory:</strong> Your last registered donation was {daysSinceLastDonation} day(s) ago. Standard whole blood donation requires a 56-day recovery interval for hemoglobin replenishment.
                  </div>
                </div>
              )}

              {/* Donor Summary Pill */}
              <div className="p-3 bg-surface-dark border border-border-dark rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brand-red/10 border border-brand-red/30 flex items-center justify-center font-black text-brand-red text-xs">
                    {donor.bloodGroup}
                  </div>
                  <div>
                    <span className="font-bold text-text-bright block text-xs">{donor.fullName}</span>
                    <span className="text-[10px] text-text-muted font-mono">{currentUnits} cumulative units • {currentTier.name}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    +{getExpectedUnits()} Units on Submit
                  </span>
                </div>
              </div>

              {/* Field 1: Certified Blood Center / Hospital */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase font-bold tracking-wider text-text-subtle flex items-center gap-1.5">
                  <Hospital className="w-3 h-3 text-brand-red" />
                  <span>Certified Blood Bank / Hospital Center</span>
                </label>
                <select
                  value={selectedCenter}
                  onChange={(e) => setSelectedCenter(e.target.value)}
                  className="w-full bg-[#18181A] border border-border-dark rounded-xl px-3 py-2 text-xs text-text-bright focus:outline-none focus:border-brand-red"
                  required
                >
                  {TAMIL_NADU_BLOOD_BANKS.slice(0, 15).map((b) => (
                    <option key={b.id} value={`${b.name} (${b.district})`}>
                      {b.name} — {b.district}
                    </option>
                  ))}
                  <option value="Voluntary Health Services (VHS) Blood Bank, Chennai">
                    Voluntary Health Services (VHS) Blood Bank, Chennai
                  </option>
                  <option value="Apollo Hospitals Blood Bank, Chennai">
                    Apollo Hospitals Blood Bank, Chennai
                  </option>
                  <option value="Other">Other Certified Blood Center</option>
                </select>

                {selectedCenter === "Other" && (
                  <input
                    type="text"
                    value={customCenter}
                    onChange={(e) => setCustomCenter(e.target.value)}
                    placeholder="Enter official hospital or blood bank name"
                    className="w-full mt-1.5 bg-[#18181A] border border-border-dark rounded-xl px-3 py-2 text-xs text-text-bright focus:outline-none focus:border-brand-red"
                    required
                  />
                )}
              </div>

              {/* Field 2: Donation Type & Units */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase font-bold tracking-wider text-text-subtle block">
                    Donation Modality
                  </label>
                  <select
                    value={donationType}
                    onChange={(e) => setDonationType(e.target.value as any)}
                    className="w-full bg-[#18181A] border border-border-dark rounded-xl px-3 py-2 text-xs text-text-bright focus:outline-none focus:border-brand-red"
                  >
                    <option value="Whole Blood">Whole Blood (10 units saved/bag)</option>
                    <option value="Platelets">Platelets Apheresis (15 units)</option>
                    <option value="Plasma">Plasma Apheresis (10 units)</option>
                    <option value="Double Red Cells">Double Red Cells (20 units)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase font-bold tracking-wider text-text-subtle block">
                    Bags / Units Donated
                  </label>
                  <select
                    value={unitsDonated}
                    onChange={(e) => setUnitsDonated(Number(e.target.value))}
                    className="w-full bg-[#18181A] border border-border-dark rounded-xl px-3 py-2 text-xs text-text-bright focus:outline-none focus:border-brand-red"
                  >
                    <option value={1}>1 Unit (Standard Session)</option>
                    <option value={2}>2 Units (Double Unit / High Yield)</option>
                  </select>
                </div>
              </div>

              {/* Field 3: Date & Certificate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase font-bold tracking-wider text-text-subtle flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-text-muted" />
                    <span>Donation Date</span>
                  </label>
                  <input
                    type="date"
                    value={donationDate}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setDonationDate(e.target.value)}
                    className="w-full bg-[#18181A] border border-border-dark rounded-xl px-3 py-2 text-xs text-text-bright focus:outline-none focus:border-brand-red"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase font-bold tracking-wider text-text-subtle block">
                    Donor Card / Slip Ref (Optional)
                  </label>
                  <input
                    type="text"
                    value={certNumber}
                    onChange={(e) => setCertNumber(e.target.value)}
                    placeholder="e.g. TN-BB-2026-881"
                    className="w-full bg-[#18181A] border border-border-dark rounded-xl px-3 py-2 text-xs text-text-bright focus:outline-none focus:border-brand-red"
                  />
                </div>
              </div>

              {/* Automated policy reminder */}
              <div className="p-3 bg-surface-dark border border-border-dark rounded-xl flex items-center gap-2.5 text-text-muted">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-[10.5px] leading-relaxed">
                  Upon verification, your cumulative blood units will increase by <strong>+{getExpectedUnits()} units</strong>, and the WHO 56-day recovery interval will reset.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-border-dark">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs text-text-muted hover:text-text-bright transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-brand-red hover:bg-brand-red-dark text-white rounded-xl font-extrabold text-xs shadow-lg shadow-brand-red/20 transition cursor-pointer flex items-center gap-2 font-display uppercase tracking-wide disabled:opacity-50"
                >
                  <Heart className="w-3.5 h-3.5 fill-white" />
                  <span>{isSubmitting ? "Verifying..." : `Confirm & Earn +${getExpectedUnits()} Units`}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
