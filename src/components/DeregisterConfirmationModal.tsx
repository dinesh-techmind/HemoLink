import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Donor, AppUser, EmergencyRequest } from "../types";
import {
  AlertTriangle,
  X,
  ShieldAlert,
  Droplet,
  Award,
  Clock,
  UserX,
  MapPin,
  CheckSquare,
  Square,
  ArrowRight,
  HeartOff,
  Radio,
  AlertOctagon,
  Flame,
  Hospital,
  Activity,
  BellRing,
  MessageSquareQuote,
  Check,
  ChevronLeft,
  HeartHandshake
} from "lucide-react";

interface DeregisterConfirmationModalProps {
  donor: Donor;
  currentUser: AppUser | null;
  emergencies?: EmergencyRequest[];
  isOpen: boolean;
  onClose: () => void;
  onConfirmDeregister: () => void;
}

const EXIT_REASONS = [
  { id: "relocated", label: "Relocated / Moved to a different city or region" },
  { id: "medical", label: "Medical reasons, pregnancy, or clinical deferral" },
  { id: "notifications", label: "Receive too many emergency alerts / calls" },
  { id: "privacy", label: "Privacy or personal contact sharing concerns" },
  { id: "offline_donor", label: "Prefer donating directly via local hospital blood banks" },
  { id: "other", label: "Other / Personal preference" }
];

export default function DeregisterConfirmationModal({
  donor,
  currentUser,
  emergencies = [],
  isOpen,
  onClose,
  onConfirmDeregister
}: DeregisterConfirmationModalProps) {
  const [step, setStep] = useState<"confirm" | "feedback">("confirm");
  const [acknowledged, setAcknowledged] = useState<boolean>(false);
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [feedbackComment, setFeedbackComment] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("confirm");
      setAcknowledged(false);
      setSelectedReason("");
      setFeedbackComment("");
      setIsDeleting(false);
    }
  }, [isOpen]);

  // Compute active emergency requests associated with the donor's account
  const associatedEmergencies = useMemo(() => {
    const donorUid = donor.uid || currentUser?.uid;
    if (!donorUid) return [];

    return emergencies.filter((req) => {
      const isActive = req.status === "Active";
      if (!isActive) return false;

      const isCreator = req.createdBy === donorUid;
      const isResponded = Array.isArray(req.respondedDonors) && req.respondedDonors.includes(donorUid);
      const isMatchingBloodGroup = req.bloodGroupNeeded === donor.bloodGroup;

      return isCreator || isResponded || isMatchingBloodGroup;
    });
  }, [donor, currentUser, emergencies]);

  // Breakdown of associated emergencies
  const creatorEmergencies = useMemo(() => {
    const donorUid = donor.uid || currentUser?.uid;
    return associatedEmergencies.filter((r) => r.createdBy === donorUid);
  }, [associatedEmergencies, donor, currentUser]);

  const committedEmergencies = useMemo(() => {
    const donorUid = donor.uid || currentUser?.uid;
    return associatedEmergencies.filter((r) => donorUid && r.respondedDonors?.includes(donorUid));
  }, [associatedEmergencies, donor, currentUser]);

  // Step 1 -> Step 2 transition
  const handleProceedToFeedback = () => {
    if (!acknowledged) return;
    setStep("feedback");
  };

  // Final confirmation execution (either with feedback submitted or skipped)
  const handleFinalDeregister = (withFeedback: boolean) => {
    setIsDeleting(true);

    if (withFeedback && (selectedReason || feedbackComment.trim())) {
      try {
        const exitFeedbackEntry = {
          donorUid: donor.uid || currentUser?.uid,
          bloodGroup: donor.bloodGroup,
          city: donor.city,
          reason: selectedReason || "unspecified",
          comment: feedbackComment.trim(),
          submittedAt: new Date().toISOString()
        };
        const existingSurveys = JSON.parse(localStorage.getItem("hemolink_exit_feedback") || "[]");
        existingSurveys.push(exitFeedbackEntry);
        localStorage.setItem("hemolink_exit_feedback", JSON.stringify(existingSurveys));
      } catch (err) {
        console.error("Failed to store exit feedback", err);
      }
    }

    setTimeout(() => {
      onConfirmDeregister();
      setIsDeleting(false);
      onClose();
    }, 400);
  };

  const hasActiveEmergencies = associatedEmergencies.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="deregister-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) onClose();
          }}
        >
          <motion.div
            key="deregister-modal-card"
            initial={{ opacity: 0, scale: 0.88, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 24, transition: { duration: 0.2, ease: "easeIn" } }}
            transition={{
              type: "spring",
              stiffness: 360,
              damping: 26,
              mass: 0.85
            }}
            className="bg-card-dark border border-red-500/40 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="deregister-modal-title"
          >
            {/* STEP 1: WARNING & IMPLICATIONS REVIEW */}
            {step === "confirm" && (
              <motion.div
                key="step-confirm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col flex-1 overflow-hidden"
              >
                {/* Header with warning accent */}
                <div className="p-6 bg-gradient-to-r from-red-950/70 via-red-900/40 to-surface-dark border-b border-border-dark flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400 shrink-0 shadow-lg shadow-red-950/50">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-mono font-bold uppercase tracking-wider mb-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Irreversible Action</span>
                      </div>
                      <h3 id="deregister-modal-title" className="text-xl font-bold font-display text-text-bright leading-tight">
                        Deregister Blood Donor Profile
                      </h3>
                    </div>
                  </div>

                  <button
                    id="close-deregister-modal-btn"
                    onClick={onClose}
                    className="p-2 rounded-xl text-text-muted hover:text-text-bright hover:bg-surface-dark transition cursor-pointer"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Scrollable Body */}
                <div className="p-6 overflow-y-auto space-y-6 text-xs text-text-muted">
                  {/* CRITICAL WARNING BANNER: Active Emergency Requests Alert */}
                  {hasActiveEmergencies ? (
                    <div
                      id="active-emergencies-warning-container"
                      className="p-4 bg-gradient-to-br from-red-950/60 via-red-900/30 to-amber-950/30 border-2 border-red-500/60 rounded-2xl space-y-3 shadow-xl relative overflow-hidden animate-pulse"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-red-600/40">
                          <AlertOctagon className="w-6 h-6 animate-bounce" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              id="active-emergencies-warning-badge"
                              className="px-2.5 py-0.5 bg-red-500 text-white text-[10px] font-mono font-extrabold uppercase rounded-full tracking-wider flex items-center gap-1 shadow-sm"
                            >
                              <Flame className="w-3 h-3" />
                              <span>{associatedEmergencies.length} Active Emergency Request{associatedEmergencies.length > 1 ? "s" : ""} Linked</span>
                            </span>
                            <span className="text-[10px] font-mono font-bold text-amber-300">
                              High Critical Urgency
                            </span>
                          </div>
                          <h4 className="text-sm font-extrabold text-text-bright font-display">
                            Urgent: Your Profile is Actively Needed for Life-Saving Blood Requests!
                          </h4>
                        </div>
                      </div>

                      <p className="text-xs text-red-100/90 leading-relaxed pl-1">
                        You currently have <strong>{associatedEmergencies.length} active emergency case{associatedEmergencies.length > 1 ? "s" : ""}</strong> associated with your account or matching your blood group ({donor.bloodGroup}).
                        {committedEmergencies.length > 0 && (
                          <span className="block mt-1 text-amber-200">
                            ⚠️ You have committed as a responded donor for <strong>{committedEmergencies.length} patient request{committedEmergencies.length > 1 ? "s" : ""}</strong> currently in progress.
                          </span>
                        )}
                        {creatorEmergencies.length > 0 && (
                          <span className="block mt-1 text-red-200">
                            ⚠️ You have created <strong>{creatorEmergencies.length} active SOS request{creatorEmergencies.length > 1 ? "s" : ""}</strong> awaiting donor match fulfillment.
                          </span>
                        )}
                        <span className="block mt-1 text-text-bright font-medium">
                          Deregistering right now will break active emergency contact and leave critical trauma and surgical patients without your life-saving blood support.
                        </span>
                      </p>

                      {/* List of Linked Emergencies */}
                      <div className="space-y-2 pt-1">
                        <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300">
                          Associated Emergency Cases:
                        </p>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {associatedEmergencies.slice(0, 3).map((req) => (
                            <div
                              key={req.requestId}
                              className="p-2.5 bg-surface-dark/40 border border-red-500/30 rounded-xl flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-text-bright truncate">
                                    Patient: {req.patientName}
                                  </span>
                                  <span className="px-1.5 py-0.5 bg-red-500/30 border border-red-500/50 text-red-300 rounded text-[9px] font-bold">
                                    {req.bloodGroupNeeded} ({req.unitsNeeded} Units)
                                  </span>
                                </div>
                                <p className="text-[10px] text-text-muted truncate flex items-center gap-1">
                                  <Hospital className="w-3 h-3 text-sky-400 shrink-0" />
                                  <span>{req.hospitalName}, {req.city}</span>
                                </p>
                              </div>

                              <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 bg-red-600/80 text-white rounded shrink-0">
                                {req.urgencyLevel}
                              </span>
                            </div>
                          ))}
                          {associatedEmergencies.length > 3 && (
                            <p className="text-[10px] text-center text-amber-300/80 font-mono">
                              + {associatedEmergencies.length - 3} more active emergency request(s)
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-surface-dark border border-border-dark rounded-2xl flex items-center gap-3 text-xs">
                      <div className="w-8 h-8 rounded-xl bg-surface-dark text-text-muted flex items-center justify-center shrink-0">
                        <BellRing className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-bold text-text-bright text-[11px]">No active SOS requests directly open</p>
                        <p className="text-[11px] text-text-muted">
                          However, emergency blood requests in your region are posted continuously.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Profile snapshot badge */}
                  <div className="p-4 bg-surface-dark border border-border-dark rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-brand-red flex items-center justify-center text-white font-black text-sm shadow-md">
                        {donor.bloodGroup}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-text-bright flex items-center gap-1.5">
                          <span>{donor.fullName}</span>
                          <span className="text-[10px] font-mono text-text-muted bg-surface-dark px-1.5 py-0.5 rounded">
                            Age {donor.age}
                          </span>
                        </h4>
                        <div className="flex items-center gap-3 text-[11px] text-text-subtle mt-0.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-sky-400" />
                            Pincode {donor.pincode}
                          </span>
                          <span className="flex items-center gap-1">
                            <Award className="w-3 h-3 text-amber-400" />
                            {donor.donationCount} Units Donated
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-lg font-bold bg-surface-dark text-text-muted border border-border-dark">
                      Active Record
                    </span>
                  </div>

                  {/* Implications Section */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-bright font-mono flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>Implications of Deregistering:</span>
                    </h4>

                    <div className="grid grid-cols-1 gap-2.5">
                      {/* Implication 1 */}
                      <div className="p-3.5 bg-red-950/20 border border-red-900/30 rounded-xl space-y-1">
                        <div className="font-bold text-red-300 flex items-center gap-1.5">
                          <UserX className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          <span>Permanent Removal from Donor Directory</span>
                        </div>
                        <p className="text-[11px] text-text-muted leading-relaxed pl-5">
                          Your donor card, contact availability, and GPS coordinates will be instantly wiped from public search and emergency maps. Emergency seekers and hospital blood banks will no longer be able to find or reach you during critical SOS alerts.
                        </p>
                      </div>

                      {/* Implication 2 */}
                      <div className="p-3.5 bg-red-950/20 border border-red-900/30 rounded-xl space-y-1">
                        <div className="font-bold text-red-300 flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Revocation of Digital Donor Pass & QR</span>
                        </div>
                        <p className="text-[11px] text-text-muted leading-relaxed pl-5">
                          Your official scannable digital identity pass and QR verification token will be invalidated immediately. Rapid on-site hospital badge verification will no longer function.
                        </p>
                      </div>

                      {/* Implication 3 */}
                      <div className="p-3.5 bg-red-950/20 border border-red-900/30 rounded-xl space-y-1">
                        <div className="font-bold text-red-300 flex items-center gap-1.5">
                          <HeartOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>Donation History & Milestones Reset</span>
                        </div>
                        <p className="text-[11px] text-text-muted leading-relaxed pl-5">
                          Your tracked life-saving count ({donor.donationCount} units recorded), donation session logs, and personalized cellular cooldown calculations will be cleared permanently from the database.
                        </p>
                      </div>

                      {/* Implication 4 */}
                      <div className="p-3.5 bg-red-950/20 border border-red-900/30 rounded-xl space-y-1">
                        <div className="font-bold text-red-300 flex items-center gap-1.5">
                          <Radio className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span>Severed Direct Chat Connections</span>
                        </div>
                        <p className="text-[11px] text-text-muted leading-relaxed pl-5">
                          Any pending patient inquiries or coordinate chats waiting for your blood group response will be marked as inactive.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Alternative Suggestion */}
                  <div className="p-3.5 bg-surface-dark border border-border-dark rounded-xl flex items-start gap-3">
                    <Clock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-text-bright text-[11px]">Need a temporary break instead?</p>
                      <p className="text-[11px] text-text-muted leading-relaxed">
                        You do not need to delete your profile if you are currently sick, traveling, or on cooldown. You can toggle your status to <strong className="text-emerald-400">"Away / Cooldown"</strong> on your profile page to pause emergency requests while keeping your donor pass and donation history intact!
                      </p>
                    </div>
                  </div>

                  {/* Mandatory Acknowledgment Checkbox */}
                  <div
                    onClick={() => setAcknowledged(!acknowledged)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 select-none ${
                      acknowledged
                        ? "bg-red-500/10 border-red-500/40 text-red-200"
                        : "bg-surface-dark border-border-dark text-text-muted hover:border-border-dark"
                    }`}
                  >
                    <div className="shrink-0">
                      {acknowledged ? (
                        <CheckSquare className="w-5 h-5 text-red-400" />
                      ) : (
                        <Square className="w-5 h-5 text-text-subtle" />
                      )}
                    </div>
                    <label
                      id="deregister-acknowledge-label"
                      htmlFor="deregister-acknowledge-check"
                      className="text-xs font-semibold leading-snug cursor-pointer"
                    >
                      I understand that deregistering will permanently erase my donor profile, verified pass, and donation history from HEMOLINK{hasActiveEmergencies ? `, and acknowledge that ${associatedEmergencies.length} active emergency request(s) are currently associated with my account` : ""}.
                    </label>
                    <input
                      type="checkbox"
                      id="deregister-acknowledge-check"
                      checked={acknowledged}
                      onChange={(e) => setAcknowledged(e.target.checked)}
                      className="sr-only"
                    />
                  </div>

                  {/* Explicit Confirmation Prompt Box */}
                  <div
                    id="deregister-confirmation-prompt-card"
                    className={`p-4 rounded-2xl border-2 transition-all space-y-2 text-center ${
                      acknowledged
                        ? "bg-gradient-to-br from-red-950/70 via-red-900/40 to-surface-dark border-red-500/60 shadow-lg shadow-red-950/30"
                        : "bg-surface-dark/60 border-border-dark opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2 text-red-400 font-bold">
                      <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
                      <h4 id="deregister-confirm-prompt-title" className="text-sm sm:text-base font-extrabold text-text-bright font-display">
                        Are you sure you want to permanently remove your profile?
                      </h4>
                    </div>
                    <p className="text-xs text-red-200/90 leading-relaxed max-w-lg mx-auto">
                      Please double check before proceeding. If you continue, your donor listing, verified QR identity pass, GPS emergency beacon, and life-saving donation history will be deleted immediately and cannot be recovered.
                    </p>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-surface-dark/90 border-t border-border-dark flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    id="cancel-deregister-btn"
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto px-5 py-2.5 bg-surface-dark hover:bg-zinc-700 text-text-bright rounded-xl text-xs font-bold transition cursor-pointer border border-border-dark"
                  >
                    No, Keep My Profile
                  </button>

                  <button
                    id="confirm-deregister-donor-btn"
                    type="button"
                    disabled={!acknowledged || isDeleting}
                    onClick={handleProceedToFeedback}
                    className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wide transition flex items-center justify-center gap-2 shadow-lg ${
                      acknowledged && !isDeleting
                        ? "bg-red-600 hover:bg-red-500 text-white shadow-red-950/50 cursor-pointer"
                        : "bg-surface-dark text-text-subtle cursor-not-allowed border border-border-dark/50"
                    }`}
                  >
                    <UserX className="w-4 h-4" />
                    <span>Yes, Permanently Remove Profile</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: OPTIONAL 1-QUESTION FEEDBACK SURVEY */}
            {step === "feedback" && (
              <motion.div
                key="step-feedback"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                id="deregister-feedback-survey-step"
                className="flex flex-col flex-1 overflow-hidden"
              >
                {/* Header */}
                <div className="p-6 bg-gradient-to-r from-zinc-900 via-surface-dark to-zinc-900 border-b border-border-dark flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-950/40">
                      <MessageSquareQuote className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold uppercase tracking-wider mb-1">
                        <HeartHandshake className="w-3 h-3" />
                        <span>Optional Exit Feedback</span>
                      </div>
                      <h3 id="deregister-survey-title" className="text-xl font-bold font-display text-text-bright leading-tight">
                        Why are you leaving?
                      </h3>
                    </div>
                  </div>

                  <button
                    id="close-feedback-modal-btn"
                    onClick={onClose}
                    className="p-2 rounded-xl text-text-muted hover:text-text-bright hover:bg-surface-dark transition cursor-pointer"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Scrollable Body */}
                <div className="p-6 overflow-y-auto space-y-5 text-xs text-text-muted">
                  <p className="text-xs text-text-muted leading-relaxed">
                    Before your donor profile is permanently wiped, we would appreciate knowing what prompted your decision. Your response helps us improve HEMOLINK for active donors and patients in emergency need.
                  </p>

                  {/* Single question multiple choice options */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold font-display text-text-bright block">
                      Please select the reason that best describes why you are leaving: <span className="text-text-subtle font-normal">(Optional)</span>
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {EXIT_REASONS.map((reason) => {
                        const isSelected = selectedReason === reason.id;
                        return (
                          <button
                            key={reason.id}
                            type="button"
                            id={`feedback-reason-${reason.id}`}
                            onClick={() => setSelectedReason(isSelected ? "" : reason.id)}
                            className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between gap-3 cursor-pointer ${
                              isSelected
                                ? "bg-amber-500/15 border-amber-500/60 text-text-bright shadow-sm"
                                : "bg-surface-dark border-border-dark text-text-muted hover:border-border-dark hover:text-text-bright"
                            }`}
                          >
                            <span className="text-xs font-medium">{reason.label}</span>
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? "border-amber-400 bg-amber-500 text-black font-bold"
                                  : "border-border-dark bg-surface-dark"
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Optional comments textarea */}
                  <div className="space-y-1.5 pt-1">
                    <label htmlFor="deregister-feedback-comment-input" className="text-xs font-bold text-text-bright block">
                      Additional comments or suggestions: <span className="text-text-subtle font-normal">(Optional)</span>
                    </label>
                    <textarea
                      id="deregister-feedback-comment-input"
                      rows={3}
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder="Share any thoughts on how HEMOLINK could have worked better for you..."
                      className="w-full p-3 rounded-xl bg-surface-dark border border-border-dark text-text-bright placeholder:text-text-subtle focus:outline-none focus:border-amber-500/60 transition resize-none text-xs"
                    />
                  </div>

                  {/* Gratitude note */}
                  <div className="p-3 bg-surface-dark/60 border border-border-dark rounded-xl flex items-center gap-2.5 text-[11px] text-text-muted">
                    <HeartHandshake className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Thank you for being part of the life-saving blood donor network.</span>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-surface-dark/90 border-t border-border-dark flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    id="back-to-confirm-btn"
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setStep("confirm")}
                    className="w-full sm:w-auto px-4 py-2.5 bg-surface-dark hover:bg-zinc-700 text-text-bright rounded-xl text-xs font-bold transition cursor-pointer border border-border-dark flex items-center justify-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                    <button
                      id="skip-feedback-deregister-btn"
                      type="button"
                      disabled={isDeleting}
                      onClick={() => handleFinalDeregister(false)}
                      className="w-full sm:w-auto px-4 py-2.5 bg-surface-dark hover:bg-zinc-700 text-text-muted hover:text-text-bright rounded-xl text-xs font-semibold transition cursor-pointer border border-border-dark"
                    >
                      {isDeleting ? "Removing..." : "Skip & Delete Profile"}
                    </button>

                    <button
                      id="submit-feedback-deregister-btn"
                      type="button"
                      disabled={isDeleting}
                      onClick={() => handleFinalDeregister(true)}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wide transition flex items-center justify-center gap-2 shadow-lg bg-red-600 hover:bg-red-500 text-white shadow-red-950/50 cursor-pointer"
                    >
                      {isDeleting ? (
                        <span>Removing Profile...</span>
                      ) : (
                        <>
                          <UserX className="w-4 h-4" />
                          <span>{selectedReason || feedbackComment.trim() ? "Submit & Delete Profile" : "Permanently Delete Profile"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

