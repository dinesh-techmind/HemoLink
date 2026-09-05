import React, { useState, useMemo } from "react";
import {
  EmergencyRequest,
  Donor,
  RankedDonorMatch,
  MatchingFlowStage
} from "../types";
import { store } from "../lib/store";
import {
  rankDonorsForEmergency,
  FLOW_STAGES,
  determineCurrentFlowStage
} from "../lib/smartMatching";
import {
  X,
  Sparkles,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Building2,
  MapPin,
  Send,
  User,
  Heart,
  Droplet,
  Navigation,
  Check,
  Award,
  IdCard,
  MessageSquare
} from "lucide-react";

interface SmartDonorMatchingModalProps {
  request: EmergencyRequest;
  donors: Donor[];
  isOpen: boolean;
  onClose: () => void;
  onOpenPassModal?: (donor: Donor) => void;
  onOpenChatWithDonor?: (donorUid: string, requestId: string) => void;
}

export const SmartDonorMatchingModal: React.FC<SmartDonorMatchingModalProps> = ({
  request,
  donors,
  isOpen,
  onClose,
  onOpenPassModal,
  onOpenChatWithDonor
}) => {
  if (!isOpen) return null;

  const currentStage: MatchingFlowStage = request.flowStage || determineCurrentFlowStage(request);

  // Compute Stage 1 Algorithm ranking
  const rankedMatches: RankedDonorMatch[] = useMemo(() => {
    return rankDonorsForEmergency(request, donors, { includeIncompatible: false });
  }, [request, donors]);

  // Initial selection: Default to top 3 matches or whatever was previously selected
  const [selectedDonorUids, setSelectedDonorUids] = useState<string[]>(() => {
    if (request.selectedDonors && request.selectedDonors.length > 0) {
      return request.selectedDonors;
    }
    // Pre-select top 3 eligible matches by default
    return rankedMatches
      .filter((m) => m.eligibility.isEligible && m.donor.isAvailable)
      .slice(0, 3)
      .map((m) => m.donor.uid);
  });

  const [customDispatchNote, setCustomDispatchNote] = useState<string>("");
  const [isSubmittingDispatch, setIsSubmittingDispatch] = useState<boolean>(false);
  const [dispatchSuccessMsg, setDispatchSuccessMsg] = useState<string | null>(null);
  const [activeTabFilter, setActiveTabFilter] = useState<"all_compatible" | "exact_only" | "available_only">("all_compatible");

  // Filter ranked list according to selected filter
  const displayedMatches = useMemo(() => {
    if (activeTabFilter === "exact_only") {
      return rankedMatches.filter((m) => m.compatibility.isExact);
    }
    if (activeTabFilter === "available_only") {
      return rankedMatches.filter((m) => m.donor.isAvailable && m.eligibility.isEligible);
    }
    return rankedMatches;
  }, [rankedMatches, activeTabFilter]);

  // Selection toggle handlers
  const handleToggleSelectDonor = (uid: string) => {
    setSelectedDonorUids((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleSelectTopN = (n: number) => {
    const topUids = displayedMatches.slice(0, n).map((m) => m.donor.uid);
    setSelectedDonorUids(topUids);
  };

  const handleSelectExactOnly = () => {
    const exactUids = rankedMatches.filter((m) => m.compatibility.isExact).map((m) => m.donor.uid);
    setSelectedDonorUids(exactUids);
  };

  const handleClearSelection = () => {
    setSelectedDonorUids([]);
  };

  // Stage 2: Send Targeted Notifications Handler
  const handleDispatchNotifications = () => {
    if (selectedDonorUids.length === 0) {
      alert("Please select at least 1 donor to dispatch targeted notifications.");
      return;
    }

    setIsSubmittingDispatch(true);
    try {
      store.notifyMatchedDonors(request.requestId, selectedDonorUids, customDispatchNote);
      setDispatchSuccessMsg(
        `Targeted emergency alerts dispatched successfully to ${selectedDonorUids.length} selected donor(s) via Cellular SMS & In-App notification channels.`
      );
      setTimeout(() => setDispatchSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(err?.message || "Failed to dispatch notifications.");
    } finally {
      setIsSubmittingDispatch(false);
    }
  };

  // Step 6: Donor Accepts Simulation / Confirmation
  const handleSimulateDonorAcceptance = (donorUid: string) => {
    try {
      store.donorAcceptEmergencyMatch(request.requestId, donorUid);
      setDispatchSuccessMsg("Donor acceptance confirmed! Contact coordinates and phone have been securely unlocked.");
      setTimeout(() => setDispatchSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err?.message || "Failed to record donor acceptance.");
    }
  };

  // Step 7 & 8: Confirm Clinical Blood Donation & Fulfill Request
  const handleConfirmDonation = (donorUid?: string) => {
    if (
      confirm(
        `Confirm that the blood donation for patient '${request.patientName}' has been clinically collected? This will credit units saved, restart the donor's WHO 56-day cooldown, and fulfill the emergency request.`
      )
    ) {
      try {
        store.confirmDonationAndFulfill(request.requestId, donorUid, request.unitsNeeded || 1);
        setDispatchSuccessMsg("Donation successfully confirmed and emergency request fulfilled! Lifesaver units credited.");
        setTimeout(() => setDispatchSuccessMsg(null), 5000);
      } catch (err: any) {
        alert(err?.message || "Failed to confirm donation.");
      }
    }
  };

  // Accepted donor details (if any)
  const acceptedDonor = request.acceptedDonorId
    ? donors.find((d) => d.uid === request.acceptedDonorId)
    : null;

  return (
    <div
      id="smart-matching-modal-root"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
    >
      <div
        id="smart-matching-modal-card"
        className="bg-[#0F0F12] border border-border-dark w-full max-w-5xl rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden relative my-auto animate-in fade-in zoom-in-95 duration-200"
      >
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-[#181215] via-[#141214] to-[#111114] border-b border-border-dark px-4 sm:px-6 py-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-red via-rose-700 to-amber-700 flex items-center justify-center text-white shadow-lg shadow-brand-red/20 shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-text-bright font-display tracking-tight flex items-center gap-2">
                  Smart Donor Matching & Clinical Dispatch
                </h3>
                <span className="text-[10px] font-mono uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-bold">
                  Stage 1 Algorithm + Stage 2 Review
                </span>
              </div>
              <p className="text-xs text-text-muted hidden sm:block">
                Ranked potential donors with human confirmation prior to dispatching targeted alerts.
              </p>
            </div>
          </div>

          <button
            type="button"
            id="smart-matching-close-btn"
            onClick={onClose}
            className="text-text-subtle hover:text-white bg-surface-dark hover:bg-zinc-800 p-2 rounded-full transition cursor-pointer shrink-0"
            aria-label="Close Smart Matching Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* OVERALL FLOW PIPELINE STEPPER */}
        <div className="bg-[#141418] border-b border-border-dark/60 px-4 sm:px-6 py-3 shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-[700px]">
            {FLOW_STAGES.map((s, idx) => {
              const isCurrent = s.stage === currentStage;
              const isPast =
                FLOW_STAGES.findIndex((st) => st.stage === currentStage) > idx ||
                (currentStage === "request_fulfilled" && idx < 7);

              return (
                <React.Fragment key={s.stage}>
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition whitespace-nowrap ${
                      isCurrent
                        ? "bg-brand-red text-white shadow-md shadow-brand-red/20 ring-1 ring-rose-400"
                        : isPast
                        ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/40"
                        : "bg-surface-dark/60 text-text-subtle border border-border-dark/40"
                    }`}
                    title={s.shortDesc}
                  >
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-extrabold ${
                        isCurrent
                          ? "bg-white text-brand-red"
                          : isPast
                          ? "bg-emerald-500 text-black"
                          : "bg-zinc-800 text-text-subtle"
                      }`}
                    >
                      {isPast ? "✓" : s.number}
                    </span>
                    <span>{s.title}</span>
                  </div>
                  {idx < FLOW_STAGES.length - 1 && (
                    <span className="text-zinc-600 text-xs font-bold shrink-0">→</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* REQUISITION CONTEXT BANNER */}
        <div className="bg-[#161214] border-b border-border-dark px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-text-muted font-medium">Requisition for:</span>
              <strong className="text-text-bright font-bold">{request.patientName}</strong>
            </div>

            <span className="text-zinc-700">•</span>

            <div className="flex items-center gap-1.5 font-bold">
              <Droplet className="w-3.5 h-3.5 text-brand-red" />
              <span className="bg-brand-red/20 text-rose-300 border border-brand-red/40 px-2 py-0.5 rounded font-mono font-bold">
                {request.bloodGroupNeeded} Required
              </span>
              <span className="text-text-muted font-mono">({request.unitsNeeded} Unit(s))</span>
            </div>

            <span className="text-zinc-700">•</span>

            <div className="flex items-center gap-1.5 text-text-muted">
              <Building2 className="w-3.5 h-3.5 text-text-subtle" />
              <span>{request.hospitalName}, {request.city}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                request.urgencyLevel === "Critical"
                  ? "bg-red-500/15 text-red-400 border border-red-500/30"
                  : request.urgencyLevel === "Urgent"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              }`}
            >
              {request.urgencyLevel} Urgency
            </span>

            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                request.status === "Fulfilled"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-surface-dark text-text-muted border border-border-dark"
              }`}
            >
              Status: {request.status}
            </span>
          </div>
        </div>

        {/* FEEDBACK BANNER (IF ANY) */}
        {dispatchSuccessMsg && (
          <div className="bg-emerald-950/80 border-b border-emerald-600/50 px-4 sm:px-6 py-2.5 text-xs text-emerald-200 font-semibold flex items-center justify-between gap-2 shrink-0 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{dispatchSuccessMsg}</span>
            </div>
            <button
              onClick={() => setDispatchSuccessMsg(null)}
              className="text-emerald-400 hover:text-white text-xs font-mono"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ACCEPTED DONOR CALLOUT (IF DONOR ACCEPTED) */}
        {acceptedDonor && (
          <div className="bg-gradient-to-r from-[#112318] to-[#121A15] border-b border-emerald-500/30 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-extrabold text-sm">
                ✓
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-emerald-300 uppercase tracking-wider">
                    Donor Accepted Requisition
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.2 rounded font-mono font-bold">
                    Direct Contact Unlocked
                  </span>
                </div>
                <p className="text-xs text-text-bright">
                  <strong>{acceptedDonor.fullName}</strong> ({acceptedDonor.bloodGroup}) is responding. Phone:{" "}
                  <strong className="font-mono text-emerald-300">{acceptedDonor.phone}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenChatWithDonor && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenChatWithDonor(acceptedDonor.uid, request.requestId);
                  }}
                  className="bg-surface-dark hover:bg-zinc-800 text-text-bright border border-border-dark px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Open Chat</span>
                </button>
              )}

              {request.status !== "Fulfilled" && (
                <button
                  type="button"
                  id="confirm-donation-btn"
                  onClick={() => handleConfirmDonation(acceptedDonor.uid)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Confirm Blood Donation & Fulfill</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* MAIN BODY: STAGE 1 ALGORITHM METRICS + STAGE 2 HUMAN REVIEW LIST */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* STAGE 1: ALGORITHM OVERVIEW & METRICS BAR */}
          <div className="bg-surface-dark/70 border border-border-dark rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-dark/60 pb-3">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-amber-400 tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Stage 1 — Algorithm Output
                </span>
                <h4 className="text-sm font-bold text-text-bright">
                  Multi-Factor Medical Compatibility & Distance Scoring
                </h4>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-text-muted font-mono">
                <span>Weighted:</span>
                <span className="bg-[#1C181A] px-1.5 py-0.5 rounded border border-border-dark/60 text-rose-300">45% Blood</span>
                <span className="bg-[#1C181A] px-1.5 py-0.5 rounded border border-border-dark/60 text-blue-300">30% Dist</span>
                <span className="bg-[#1C181A] px-1.5 py-0.5 rounded border border-border-dark/60 text-emerald-300">15% Cooldown</span>
                <span className="bg-[#1C181A] px-1.5 py-0.5 rounded border border-border-dark/60 text-amber-300">10% Track</span>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-[#121214] border border-border-dark/60 p-2.5 rounded-xl">
                <span className="text-xs text-text-muted block">Registry Analyzed</span>
                <strong className="text-base font-extrabold text-text-bright font-mono">
                  {donors.length} Donors
                </strong>
              </div>

              <div className="bg-[#121214] border border-border-dark/60 p-2.5 rounded-xl">
                <span className="text-xs text-text-muted block">Compatible Candidates</span>
                <strong className="text-base font-extrabold text-emerald-400 font-mono">
                  {rankedMatches.length} Found
                </strong>
              </div>

              <div className="bg-[#121214] border border-border-dark/60 p-2.5 rounded-xl">
                <span className="text-xs text-text-muted block">Exact {request.bloodGroupNeeded} Matches</span>
                <strong className="text-base font-extrabold text-brand-red font-mono">
                  {rankedMatches.filter((m) => m.compatibility.isExact).length} Donors
                </strong>
              </div>

              <div className="bg-[#121214] border border-border-dark/60 p-2.5 rounded-xl">
                <span className="text-xs text-text-muted block">Closest Verified Proximity</span>
                <strong className="text-base font-extrabold text-blue-400 font-mono">
                  {rankedMatches.length > 0 ? `${rankedMatches[0].distanceKm} km` : "N/A"}
                </strong>
              </div>
            </div>
          </div>

          {/* STAGE 2: HUMAN CONFIRMATION & SELECTION TOOLBAR */}
          <div className="space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-rose-400 tracking-wider flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-rose-400" />
                  Stage 2 — Human Confirmation
                </span>
                <h4 className="text-sm sm:text-base font-bold text-text-bright">
                  Review Ranked Candidates & Select Who To Notify
                </h4>
                <p className="text-xs text-text-muted">
                  Avoid spamming all 50 donors at once. Pick targeted donors to ensure personal coordination.
                </p>
              </div>

              {/* Quick Select Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  id="smart-select-top-3-btn"
                  onClick={() => handleSelectTopN(3)}
                  className="bg-surface-dark hover:bg-zinc-800 text-text-bright border border-border-dark px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Select Top 3
                </button>
                <button
                  type="button"
                  id="smart-select-top-5-btn"
                  onClick={() => handleSelectTopN(5)}
                  className="bg-surface-dark hover:bg-zinc-800 text-text-bright border border-border-dark px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Select Top 5
                </button>
                <button
                  type="button"
                  id="smart-select-exact-btn"
                  onClick={handleSelectExactOnly}
                  className="bg-surface-dark hover:bg-zinc-800 text-rose-300 border border-border-dark px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Exact Match Only
                </button>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-text-subtle hover:text-white text-xs px-2 py-1 cursor-pointer font-mono"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Filter Pills + Selection Counter */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-dark pb-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTabFilter("all_compatible")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeTabFilter === "all_compatible"
                      ? "bg-brand-red text-white"
                      : "bg-surface-dark text-text-muted hover:text-white"
                  }`}
                >
                  All Compatible ({rankedMatches.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabFilter("exact_only")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeTabFilter === "exact_only"
                      ? "bg-brand-red text-white"
                      : "bg-surface-dark text-text-muted hover:text-white"
                  }`}
                >
                  Exact {request.bloodGroupNeeded} ({rankedMatches.filter((m) => m.compatibility.isExact).length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabFilter("available_only")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeTabFilter === "available_only"
                      ? "bg-brand-red text-white"
                      : "bg-surface-dark text-text-muted hover:text-white"
                  }`}
                >
                  Available & Ready ({rankedMatches.filter((m) => m.donor.isAvailable && m.eligibility.isEligible).length})
                </button>
              </div>

              <div className="text-xs font-mono">
                <span className="text-text-muted">Selected to Notify: </span>
                <strong className="text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-700/40 px-2 py-0.5 rounded">
                  {selectedDonorUids.length} Donor(s)
                </strong>
              </div>
            </div>

            {/* RANKED DONOR CARDS LIST */}
            <div className="space-y-3">
              {displayedMatches.length === 0 ? (
                <div className="bg-card-dark border border-border-dark p-8 rounded-2xl text-center space-y-2">
                  <AlertTriangle className="w-7 h-7 text-amber-400 mx-auto" />
                  <h5 className="font-bold text-text-bright text-sm">No donors found matching current filter</h5>
                  <p className="text-xs text-text-muted">Try switching to "All Compatible" to view all clinically matching donors.</p>
                </div>
              ) : (
                displayedMatches.map((match) => {
                  const isSelected = selectedDonorUids.includes(match.donor.uid);
                  const wasNotified = request.notifiedDonors?.includes(match.donor.uid);
                  const isAccepted = request.acceptedDonorId === match.donor.uid || request.respondedDonors?.includes(match.donor.uid);

                  return (
                    <div
                      key={match.donor.uid}
                      id={`ranked-donor-card-${match.donor.uid}`}
                      className={`border rounded-2xl p-4 transition duration-150 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden ${
                        isAccepted
                          ? "bg-[#112318] border-emerald-500/60 shadow-lg shadow-emerald-950/20"
                          : wasNotified
                          ? "bg-[#17141A] border-amber-500/50"
                          : isSelected
                          ? "bg-[#1B1417] border-brand-red/60 shadow-lg shadow-brand-red/10"
                          : "bg-card-dark/80 border-border-dark hover:border-zinc-700"
                      }`}
                    >
                      {/* Left selection checkbox & Rank medal */}
                      <div className="flex items-start sm:items-center gap-3">
                        <label className="flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectDonor(match.donor.uid)}
                            className="sr-only"
                          />
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition cursor-pointer ${
                              isSelected
                                ? "bg-brand-red border-brand-red text-white"
                                : "bg-surface-dark border-border-dark text-transparent"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        </label>

                        {/* Rank Badge */}
                        <div
                          className={`w-8 h-8 rounded-xl font-display font-extrabold flex items-center justify-center text-xs shrink-0 ${
                            match.rank === 1
                              ? "bg-gradient-to-br from-amber-400 to-amber-700 text-black shadow-md shadow-amber-500/20"
                              : match.rank === 2
                              ? "bg-gradient-to-br from-zinc-300 to-zinc-500 text-black"
                              : match.rank === 3
                              ? "bg-gradient-to-br from-amber-700 to-amber-900 text-amber-100"
                              : "bg-surface-dark text-text-muted border border-border-dark"
                          }`}
                        >
                          #{match.rank}
                        </div>

                        {/* Donor details */}
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h5 className="font-extrabold text-sm text-text-bright leading-tight">
                              {match.donor.fullName}
                            </h5>

                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                match.compatibility.isExact
                                  ? "bg-brand-red text-white"
                                  : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              }`}
                            >
                              {match.donor.bloodGroup} • {match.compatibility.label}
                            </span>

                            {wasNotified && (
                              <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                                📲 Notified
                              </span>
                            )}

                            {isAccepted && (
                              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Accepted
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
                            <span className="flex items-center gap-1 text-emerald-400 font-mono font-bold">
                              <Navigation className="w-3 h-3 text-emerald-400" />
                              {match.distanceKm} km from hospital
                            </span>

                            <span>•</span>

                            <span>{match.donor.city}, {match.donor.state}</span>

                            <span>•</span>

                            <span className={match.donor.isAvailable ? "text-emerald-400 font-semibold" : "text-zinc-500"}>
                              {match.donor.isAvailable ? "● Online Now" : "○ Offline"}
                            </span>

                            <span>•</span>

                            <span className={match.eligibility.isEligible ? "text-text-muted" : "text-amber-400 font-medium"}>
                              {match.eligibility.isEligible ? "Safe Interval OK" : `${match.eligibility.cooldownDaysRemaining}d Cooldown`}
                            </span>
                          </div>

                          {/* Match Badges Row */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {match.matchBadges.map((badge, bIdx) => (
                              <span
                                key={bIdx}
                                className="bg-[#121214] text-text-subtle border border-border-dark/80 px-2 py-0.5 rounded-md text-[10px] font-mono"
                              >
                                {badge}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right side: Match Score Meter & Quick Actions */}
                      <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 pl-8 sm:pl-0 shrink-0">
                        {/* Match Score Meter */}
                        <div className="text-right">
                          <div className="flex items-baseline justify-end gap-1">
                            <span className="text-xs text-text-muted font-medium">Match Score:</span>
                            <span
                              className={`text-lg font-black font-display tracking-tight ${
                                match.matchScore >= 90
                                  ? "text-emerald-400"
                                  : match.matchScore >= 75
                                  ? "text-amber-400"
                                  : "text-rose-400"
                              }`}
                            >
                              {match.matchScore}%
                            </span>
                          </div>

                          <div className="w-28 h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1 ml-auto">
                            <div
                              className={`h-full rounded-full ${
                                match.matchScore >= 90
                                  ? "bg-emerald-400"
                                  : match.matchScore >= 75
                                  ? "bg-amber-400"
                                  : "bg-rose-400"
                              }`}
                              style={{ width: `${match.matchScore}%` }}
                            />
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 mt-1">
                          {onOpenPassModal && (
                            <button
                              type="button"
                              onClick={() => onOpenPassModal(match.donor)}
                              className="text-[11px] text-text-muted hover:text-white bg-surface-dark hover:bg-zinc-800 border border-border-dark px-2 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer"
                              title="Inspect Donor Identity Pass"
                            >
                              <IdCard className="w-3 h-3 text-rose-400" />
                              <span>Pass</span>
                            </button>
                          )}

                          {wasNotified && !isAccepted && (
                            <button
                              type="button"
                              onClick={() => handleSimulateDonorAcceptance(match.donor.uid)}
                              className="text-[11px] text-emerald-300 hover:text-white bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-600/40 px-2 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer font-bold"
                              title="Record or simulate that this donor accepted the request"
                            >
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Record Accept</span>
                            </button>
                          )}

                          {isAccepted && request.status !== "Fulfilled" && (
                            <button
                              type="button"
                              onClick={() => handleConfirmDonation(match.donor.uid)}
                              className="text-[11px] text-emerald-300 hover:text-white bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-500/50 px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer font-bold"
                            >
                              <Award className="w-3 h-3" />
                              <span>Confirm Donation</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* CUSTOM NOTIFICATION MESSAGE / COORDINATOR NOTE */}
          <div className="bg-surface-dark/50 border border-border-dark p-4 rounded-2xl space-y-2">
            <label className="text-xs font-bold text-text-bright flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-brand-red" />
              <span>Optional Coordinator Dispatch Note (Included in targeted alerts)</span>
            </label>
            <input
              type="text"
              value={customDispatchNote}
              onChange={(e) => setCustomDispatchNote(e.target.value)}
              placeholder="e.g., Patient is in Emergency Ward Bed 4. Please report to 2nd floor blood bank directly."
              className="w-full bg-[#111114] border border-border-dark rounded-xl px-3.5 py-2 text-xs text-text-bright placeholder-zinc-600 focus:outline-none focus:border-brand-red transition"
            />
            <p className="text-[11px] text-text-muted">
              Alerts will be sent via simulated Cellular SMS and high-priority In-App dispatch notifications directly to chosen donor profiles.
            </p>
          </div>
        </div>

        {/* MODAL FOOTER: DISPATCH ACTION BAR */}
        <div className="bg-[#121216] border-t border-border-dark px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>
              Human Confirmation Gate: Notifications are <strong>only sent</strong> to the {selectedDonorUids.length} selected donor(s).
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-surface-dark hover:bg-zinc-800 text-text-muted hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              id="dispatch-smart-matches-btn"
              disabled={isSubmittingDispatch || selectedDonorUids.length === 0}
              onClick={handleDispatchNotifications}
              className="w-full sm:w-auto px-5 py-2.5 bg-brand-red hover:bg-brand-red-dark disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xl shadow-brand-red/20 transition cursor-pointer active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>
                {isSubmittingDispatch
                  ? "Dispatching Alerts..."
                  : `Send Targeted Notifications (${selectedDonorUids.length} Selected)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
