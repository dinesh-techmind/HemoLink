import React, { useState } from "react";
import {
  Sparkles,
  Shield,
  Send,
  Smartphone,
  Mail,
  CheckCircle2,
  Award,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
  Navigation,
  UserCheck,
  RefreshCw,
  Search,
  Filter
} from "lucide-react";
import { EmergencyRequest, Donor, MatchingFlowStage } from "../types";
import { store } from "../lib/store";
import {
  rankDonorsForEmergency,
  generateGmailComposeUrl,
  formatEmergencyEmailPayload,
  formatEmergencySmsPayload,
  FLOW_STAGES,
  determineCurrentFlowStage
} from "../lib/smartMatching";

interface AdminSmartMatchingReviewProps {
  emergencies: EmergencyRequest[];
  donors: Donor[];
  onOpenMatchingModal: (req: EmergencyRequest) => void;
  onOpenSmsModal: (donor: Donor, req?: EmergencyRequest) => void;
  onOpenPassModal?: (donor: Donor) => void;
}

export const AdminSmartMatchingReview: React.FC<AdminSmartMatchingReviewProps> = ({
  emergencies,
  donors,
  onOpenMatchingModal,
  onOpenSmsModal,
  onOpenPassModal
}) => {
  const [filterStage, setFilterStage] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [selectedDonorsMap, setSelectedDonorsMap] = useState<{ [reqId: string]: string[] }>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Filtered requests
  const filteredEmergencies = emergencies.filter((req) => {
    const stage = req.flowStage || determineCurrentFlowStage(req);

    if (filterStage === "needs_review") {
      if (req.status !== "Active" || stage === "notify_donors" || stage === "donor_accepted" || stage === "donation_confirmed" || stage === "request_fulfilled") {
        return false;
      }
    } else if (filterStage === "notified") {
      if (stage !== "notify_donors") return false;
    } else if (filterStage === "accepted") {
      if (stage !== "donor_accepted") return false;
    } else if (filterStage === "fulfilled") {
      if (req.status !== "Fulfilled" && stage !== "request_fulfilled" && stage !== "donation_confirmed") return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPatient = req.patientName.toLowerCase().includes(q);
      const matchHospital = req.hospitalName.toLowerCase().includes(q);
      const matchCity = req.city.toLowerCase().includes(q);
      const matchBlood = req.bloodGroupNeeded.toLowerCase().includes(q);
      return matchPatient || matchHospital || matchCity || matchBlood;
    }

    return true;
  });

  // Calculate Pipeline Metrics
  const totalRequisitions = emergencies.length;
  const needsReviewCount = emergencies.filter((r) => {
    const s = r.flowStage || determineCurrentFlowStage(r);
    return r.status === "Active" && (s === "smart_matching" || s === "admin_review");
  }).length;
  const notifiedCount = emergencies.filter((r) => (r.flowStage || determineCurrentFlowStage(r)) === "notify_donors").length;
  const acceptedCount = emergencies.filter((r) => (r.flowStage || determineCurrentFlowStage(r)) === "donor_accepted").length;
  const fulfilledCount = emergencies.filter((r) => r.status === "Fulfilled" || (r.flowStage || determineCurrentFlowStage(r)) === "request_fulfilled" || (r.flowStage || determineCurrentFlowStage(r)) === "donation_confirmed").length;

  const toggleExpand = (reqId: string) => {
    if (expandedRequestId === reqId) {
      setExpandedRequestId(null);
    } else {
      setExpandedRequestId(reqId);
      // Pre-select top 3 compatible donors if not already selected
      if (!selectedDonorsMap[reqId]) {
        const req = emergencies.find((r) => r.requestId === reqId);
        if (req) {
          const ranked = rankDonorsForEmergency(req, donors);
          const top3Uids = ranked.slice(0, 3).map((m) => m.donor.uid);
          setSelectedDonorsMap((prev) => ({ ...prev, [reqId]: top3Uids }));
        }
      }
    }
  };

  const handleToggleDonorSelect = (reqId: string, donorUid: string) => {
    const current = selectedDonorsMap[reqId] || [];
    if (current.includes(donorUid)) {
      setSelectedDonorsMap((prev) => ({
        ...prev,
        [reqId]: current.filter((id) => id !== donorUid)
      }));
    } else {
      setSelectedDonorsMap((prev) => ({
        ...prev,
        [reqId]: [...current, donorUid]
      }));
    }
  };

  const handleDispatchGmailAndSms = async (req: EmergencyRequest) => {
    const selectedUids = selectedDonorsMap[req.requestId] || [];
    if (selectedUids.length === 0) {
      alert("Please select at least one donor from the ranked candidates below.");
      return;
    }

    setIsSubmitting(true);
    try {
      store.notifyMatchedDonors(
        req.requestId,
        selectedUids,
        `Admin Reviewed & Dispatched: Patient ${req.patientName} at ${req.hospitalName} needs ${req.unitsNeeded} unit(s) of ${req.bloodGroupNeeded}. Please check your portal.`
      );
      setActionNotice(`✓ Dispatched Gmail and Cellular SMS to ${selectedUids.length} donor(s) registered mobile numbers!`);
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: any) {
      alert("Failed to dispatch notifications: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDonation = (req: EmergencyRequest, donorUid: string) => {
    try {
      store.confirmDonationAndFulfill(req.requestId, donorUid, 1);
      setActionNotice(`✓ Blood donation confirmed for ${req.patientName}! Donor awarded lifesaver units.`);
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: any) {
      alert("Failed to confirm donation: " + err.message);
    }
  };

  return (
    <div id="admin-smart-matching-review" className="space-y-6">
      {/* SECTION HEADER & BANNER */}
      <div className="bg-gradient-to-r from-[#1E1418] via-[#161418] to-[#121216] border border-brand-red/30 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="bg-brand-red/20 text-brand-red font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-brand-red/40 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Clinical Supervision Station
              </span>
              <span className="bg-sky-500/15 text-sky-400 font-mono text-[11px] font-bold px-2 py-0.5 rounded-full border border-sky-500/30">
                Gmail & Registered Mobile SMS
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Smart Donor Matching & Blood Donation Review Console
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl">
              Supervise the multi-factor matching pipeline, review ranked compatible donors, dispatch verified alerts via Gmail and cellular SMS to registered mobile numbers, and monitor donor acceptance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              id="admin-open-sms-station-btn"
              onClick={() => onOpenSmsModal(donors[0] || ({} as Donor))}
              className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-sky-600/20 transition cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>SMS Dispatch Station</span>
            </button>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5 pt-5 border-t border-zinc-800/80">
          <div className="bg-[#121214]/80 border border-zinc-800 p-3 rounded-xl">
            <span className="text-[11px] text-zinc-400 block font-mono">Total Requisitions</span>
            <strong className="text-lg font-black text-white font-display">{totalRequisitions}</strong>
          </div>

          <div className="bg-[#121214]/80 border border-amber-500/30 p-3 rounded-xl">
            <span className="text-[11px] text-amber-400 block font-mono">Needs Match Review</span>
            <strong className="text-lg font-black text-amber-400 font-display">{needsReviewCount}</strong>
          </div>

          <div className="bg-[#121214]/80 border border-sky-500/30 p-3 rounded-xl">
            <span className="text-[11px] text-sky-400 block font-mono">Donors Notified</span>
            <strong className="text-lg font-black text-sky-400 font-display">{notifiedCount}</strong>
          </div>

          <div className="bg-[#121214]/80 border border-emerald-500/30 p-3 rounded-xl">
            <span className="text-[11px] text-emerald-400 block font-mono">Donor Accepted</span>
            <strong className="text-lg font-black text-emerald-400 font-display">{acceptedCount}</strong>
          </div>

          <div className="bg-[#121214]/80 border border-zinc-800 p-3 rounded-xl col-span-2 sm:col-span-1">
            <span className="text-[11px] text-zinc-400 block font-mono">Donations Fulfilled</span>
            <strong className="text-lg font-black text-white font-display">{fulfilledCount}</strong>
          </div>
        </div>
      </div>

      {/* ACTION NOTICE TOAST */}
      {actionNotice && (
        <div className="bg-emerald-950/60 border border-emerald-500/60 rounded-xl p-3 text-xs text-emerald-300 font-bold flex items-center justify-between animate-in fade-in duration-200">
          <span>{actionNotice}</span>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-emerald-400 hover:text-white text-xs underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#18181B] border border-zinc-800 p-3 rounded-2xl">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterStage("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterStage === "all"
                ? "bg-brand-red text-white"
                : "bg-zinc-800/80 text-zinc-400 hover:text-white"
            }`}
          >
            All Requisitions ({emergencies.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStage("needs_review")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterStage === "needs_review"
                ? "bg-amber-600 text-white"
                : "bg-zinc-800/80 text-zinc-400 hover:text-white"
            }`}
          >
            Needs Review ({needsReviewCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStage("notified")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterStage === "notified"
                ? "bg-sky-600 text-white"
                : "bg-zinc-800/80 text-zinc-400 hover:text-white"
            }`}
          >
            Notified Donors ({notifiedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStage("accepted")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterStage === "accepted"
                ? "bg-emerald-600 text-white"
                : "bg-zinc-800/80 text-zinc-400 hover:text-white"
            }`}
          >
            Donor Accepted ({acceptedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStage("fulfilled")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterStage === "fulfilled"
                ? "bg-zinc-700 text-white"
                : "bg-zinc-800/80 text-zinc-400 hover:text-white"
            }`}
          >
            Fulfilled ({fulfilledCount})
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient, hospital, blood group..."
            className="w-full bg-[#121214] border border-zinc-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-red"
          />
        </div>
      </div>

      {/* REQUISITIONS LIST */}
      <div className="space-y-4">
        {filteredEmergencies.length === 0 ? (
          <div className="bg-[#18181B] border border-zinc-800 p-8 rounded-2xl text-center space-y-2">
            <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
            <h4 className="font-bold text-white text-sm">No blood requisitions matching current filter</h4>
            <p className="text-xs text-zinc-400">Try switching filters or adjusting your search keyword.</p>
          </div>
        ) : (
          filteredEmergencies.map((req) => {
            const stage = req.flowStage || determineCurrentFlowStage(req);
            const isExpanded = expandedRequestId === req.requestId;
            const rankedMatches = rankDonorsForEmergency(req, donors);
            const acceptedDonor = donors.find((d) => d.uid === req.acceptedDonorId);
            const selectedDonors = selectedDonorsMap[req.requestId] || [];

            // Stage meta
            const stageMeta = FLOW_STAGES.find((s) => s.stage === stage) || FLOW_STAGES[0];

            return (
              <div
                key={req.requestId}
                id={`admin-requisition-card-${req.requestId}`}
                className={`bg-[#18181B] border rounded-2xl transition overflow-hidden ${
                  stage === "donor_accepted"
                    ? "border-emerald-500/50 shadow-lg shadow-emerald-950/20"
                    : stage === "notify_donors"
                    ? "border-sky-500/40"
                    : req.status === "Fulfilled"
                    ? "border-zinc-800 opacity-80"
                    : "border-zinc-800 hover:border-zinc-700"
                }`}
              >
                {/* Header Summary Row */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1B1B1F]">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-brand-red/20 border border-brand-red/50 flex flex-col items-center justify-center shrink-0">
                      <span className="text-sm font-black text-brand-red leading-none font-display">
                        {req.bloodGroupNeeded}
                      </span>
                      <span className="text-[9px] text-zinc-400 font-mono mt-0.5">
                        {req.unitsNeeded}U
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-base text-white leading-tight">
                          Patient: {req.patientName}
                        </h4>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            req.urgencyLevel === "Critical"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                              : req.urgencyLevel === "Urgent"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "bg-zinc-700/50 text-zinc-300 border border-zinc-600"
                          }`}
                        >
                          {req.urgencyLevel} Urgency
                        </span>

                        <span className="bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1">
                          <Navigation className="w-3 h-3 text-emerald-400" />
                          {req.hospitalName}, {req.city}
                        </span>
                      </div>

                      {/* Stage progress pill */}
                      <div className="flex flex-wrap items-center gap-2 text-xs pt-0.5">
                        <span className="text-zinc-400 text-[11px] font-mono">Current Stage:</span>
                        <span className="bg-zinc-800/90 text-white font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-lg border border-zinc-700 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
                          {stageMeta.title}
                        </span>

                        {req.notifiedDonors && req.notifiedDonors.length > 0 && (
                          <span className="text-sky-400 font-mono text-[11px]">
                            📲 {req.notifiedDonors.length} donor(s) notified via Gmail & SMS
                          </span>
                        )}

                        {acceptedDonor && (
                          <span className="text-emerald-400 font-mono text-[11px] font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Accepted by {acceptedDonor.fullName} ({acceptedDonor.bloodGroup})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Top-Right Quick Action Buttons */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenMatchingModal(req)}
                      className="px-3 py-1.5 bg-brand-red/15 hover:bg-brand-red/25 text-brand-red border border-brand-red/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      title="Open full interactive Smart Matching Studio"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Smart Matching Studio</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleExpand(req.requestId)}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <span>{isExpanded ? "Hide Review" : "Review Candidates"}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* EXPANDED REVIEW DRAWER: ALGORITHM RANKING & DISPATCH CONTROLS */}
                {isExpanded && (
                  <div className="p-4 sm:p-6 border-t border-zinc-800/80 bg-[#121214] space-y-5 animate-in fade-in duration-200">
                    {/* ACCEPTANCE STATUS HIGHLIGHT */}
                    {acceptedDonor && (
                      <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold font-display text-sm">
                            {acceptedDonor.bloodGroup}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-sm font-bold text-white">
                                {acceptedDonor.fullName} accepted this requisition
                              </h5>
                              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                                Direct Contact Active
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400 font-mono">
                              Registered Mobile: <strong className="text-sky-300">{acceptedDonor.phone}</strong> • Email: {acceptedDonor.email} • {acceptedDonor.city}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenSmsModal(acceptedDonor, req)}
                            className="bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                            <span>Send SMS to Mobile</span>
                          </button>

                          {req.status !== "Fulfilled" && (
                            <button
                              type="button"
                              onClick={() => handleConfirmDonation(req, acceptedDonor.uid)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition cursor-pointer"
                            >
                              <Award className="w-3.5 h-3.5" />
                              <span>Confirm Blood Donation</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* STAGE 1 & 2 CANDIDATE REVIEW HEADER */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                      <div>
                        <span className="text-[10px] font-mono uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          Ranked Candidate Donors (Algorithm Stages 1–4)
                        </span>
                        <h5 className="text-sm font-bold text-white">
                          Compatible Donor Pool ({rankedMatches.length} Found)
                        </h5>
                        <p className="text-xs text-zinc-400">
                          Select donors to receive direct Gmail and cellular SMS alerts to their registered mobile numbers.
                        </p>
                      </div>

                      {/* Quick action: Dispatch alerts */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isSubmitting || selectedDonors.length === 0}
                          onClick={() => handleDispatchGmailAndSms(req)}
                          className="bg-brand-red hover:bg-brand-red-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-brand-red/20 transition cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>
                            {isSubmitting
                              ? "Dispatching..."
                              : `Dispatch Gmail & SMS (${selectedDonors.length} Selected)`}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* DONOR CARDS TABLE / LIST */}
                    <div className="space-y-2.5 max-h-96 overflow-y-auto">
                      {rankedMatches.slice(0, 6).map((match) => {
                        const isSelected = selectedDonors.includes(match.donor.uid);
                        const wasNotified = req.notifiedDonors?.includes(match.donor.uid);
                        const isAccepted = req.acceptedDonorId === match.donor.uid;

                        // Email template & compose URL
                        const emailPayload = formatEmergencyEmailPayload(match.donor, req);
                        const gmailUrl = generateGmailComposeUrl(
                          match.donor.email || "",
                          emailPayload.subject,
                          emailPayload.body
                        );

                        return (
                          <div
                            key={match.donor.uid}
                            className={`border rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                              isAccepted
                                ? "bg-emerald-950/30 border-emerald-500/50"
                                : wasNotified
                                ? "bg-[#19161B] border-sky-500/40"
                                : isSelected
                                ? "bg-[#1E1417] border-brand-red/50"
                                : "bg-[#17171A] border-zinc-800 hover:border-zinc-700"
                            }`}
                          >
                            {/* Checkbox & Donor details */}
                            <div className="flex items-start sm:items-center gap-3">
                              <label className="flex items-center cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleDonorSelect(req.requestId, match.donor.uid)}
                                  className="sr-only"
                                />
                                <div
                                  className={`w-4 h-4 rounded border flex items-center justify-center transition cursor-pointer ${
                                    isSelected
                                      ? "bg-brand-red border-brand-red text-white"
                                      : "bg-zinc-800 border-zinc-700 text-transparent"
                                  }`}
                                >
                                  <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                                </div>
                              </label>

                              <div className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                                #{match.rank}
                              </div>

                              <div className="space-y-0.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <strong className="text-xs font-bold text-white">
                                    {match.donor.fullName}
                                  </strong>

                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                                      match.compatibility.isExact
                                        ? "bg-brand-red text-white"
                                        : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                    }`}
                                  >
                                    {match.donor.bloodGroup} • {match.compatibility.label}
                                  </span>

                                  {wasNotified && (
                                    <span className="bg-sky-500/15 text-sky-300 text-[9px] font-mono px-1.5 py-0.2 rounded">
                                      📲 Notified (Gmail + SMS)
                                    </span>
                                  )}

                                  {isAccepted && (
                                    <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-mono px-1.5 py-0.2 rounded font-bold">
                                      ✓ Accepted
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400 font-mono">
                                  <span className="text-sky-300 font-bold">
                                    📱 {match.donor.phone || "No phone"}
                                  </span>
                                  <span>•</span>
                                  <span className="text-emerald-400">
                                    {match.distanceKm} km
                                  </span>
                                  <span>•</span>
                                  <span>{match.donor.city}</span>
                                  <span>•</span>
                                  <span>Score: <strong className="text-white">{match.matchScore}%</strong></span>
                                </div>
                              </div>
                            </div>

                            {/* Actions per donor card */}
                            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                              {/* Open SMS separate modal */}
                              <button
                                type="button"
                                onClick={() => onOpenSmsModal(match.donor, req)}
                                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-sky-300 border border-sky-500/30 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                                title="Send SMS separately to this registered mobile number"
                              >
                                <Smartphone className="w-3 h-3" />
                                <span>Send SMS</span>
                              </button>

                              {/* Open Gmail compose URL */}
                              {match.donor.email && (
                                <a
                                  href={gmailUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-rose-300 border border-rose-500/30 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                                  title="Compose pre-filled emergency requisition email in Gmail"
                                >
                                  <Mail className="w-3 h-3" />
                                  <span>Gmail</span>
                                  <ExternalLink className="w-2.5 h-2.5 text-zinc-500" />
                                </a>
                              )}

                              {/* Inspect pass */}
                              {onOpenPassModal && (
                                <button
                                  type="button"
                                  onClick={() => onOpenPassModal(match.donor)}
                                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg text-[11px] font-mono transition cursor-pointer"
                                  title="View donor identity pass"
                                >
                                  Pass
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
