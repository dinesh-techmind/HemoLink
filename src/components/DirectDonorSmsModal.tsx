import React, { useState, useEffect } from "react";
import {
  X,
  Smartphone,
  Send,
  MessageSquare,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  ExternalLink,
  FileText,
  User,
  AlertCircle
} from "lucide-react";
import { Donor, EmergencyRequest, SmsLogEntry } from "../types";
import { store } from "../lib/store";
import { generateNativeSmsUrl } from "../lib/smartMatching";

interface DirectDonorSmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  donor: Donor | null;
  emergency?: EmergencyRequest | null;
  allDonors?: Donor[];
}

export const DirectDonorSmsModal: React.FC<DirectDonorSmsModalProps> = ({
  isOpen,
  onClose,
  donor: initialDonor,
  emergency,
  allDonors = []
}) => {
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(initialDonor);
  const [targetPhone, setTargetPhone] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [templateKey, setTemplateKey] = useState<string>("sos_match");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [lastDeliveredReceipt, setLastDeliveredReceipt] = useState<SmsLogEntry | null>(null);
  const [smsHistory, setSmsHistory] = useState<SmsLogEntry[]>([]);

  useEffect(() => {
    setSelectedDonor(initialDonor);
    if (initialDonor) {
      setTargetPhone(initialDonor.phone || "");
    }
  }, [initialDonor]);

  useEffect(() => {
    if (selectedDonor) {
      setTargetPhone(selectedDonor.phone || "");
    }
  }, [selectedDonor]);

  // Load SMS history for the current donor or general logs
  useEffect(() => {
    if (isOpen) {
      const allLogs = store.getSmsLogs();
      if (selectedDonor) {
        setSmsHistory(allLogs.filter((l) => l.donorUid === selectedDonor.uid || l.donorPhone === selectedDonor.phone));
      } else {
        setSmsHistory(allLogs.slice(0, 10));
      }
    }
  }, [isOpen, selectedDonor, lastDeliveredReceipt]);

  // Set default message based on template
  useEffect(() => {
    if (!isOpen) return;

    const donorName = selectedDonor?.fullName || "Lifesaver";
    const bloodGroup = selectedDonor?.bloodGroup || "Blood";

    if (templateKey === "sos_match" && emergency) {
      setMessage(
        `[HEMOLINK URGENT] Hello ${donorName}, Patient ${emergency.patientName} urgently requires ${emergency.unitsNeeded} unit(s) of ${emergency.bloodGroupNeeded} blood at ${emergency.hospitalName}, ${emergency.city}. You are a suitable ${bloodGroup} match. Please open your portal or call us immediately.`
      );
    } else if (templateKey === "sos_match") {
      setMessage(
        `[HEMOLINK URGENT] Hello ${donorName}, there is an urgent requisition for ${bloodGroup} blood at a nearby hospital in your city. Your blood type can save patient lives today. Please check your HemoLink app.`
      );
    } else if (templateKey === "cooldown_cleared") {
      setMessage(
        `[HEMOLINK NOTICE] Hello ${donorName}, thank you for being a registered lifesaver! Your 56-day clinical interval cooldown has cleared and your profile is now ready to respond to critical blood requisitions.`
      );
    } else if (templateKey === "direct_arrival_eta") {
      setMessage(
        `[HEMOLINK CLINICAL] Hello ${donorName}, our medical team at the blood bank counter is ready. Could you reply with your approximate arrival ETA so we can prep the donation station? Thank you!`
      );
    } else if (templateKey === "lifesaver_thanks") {
      setMessage(
        `[HEMOLINK APPRECIATION] Dear ${donorName}, thank you for your selfless blood donation! 1 unit donated can save up to 3 lives. Your digital lifesaver badge and verified donation units have been updated in your profile.`
      );
    }
  }, [templateKey, selectedDonor, emergency, isOpen]);

  if (!isOpen) return null;

  const charCount = message.length;
  const segmentsCount = Math.ceil(charCount / 160) || 1;

  const handleSendViaGateway = async () => {
    if (!targetPhone.trim()) {
      alert("Please enter a valid registered mobile number.");
      return;
    }
    if (!message.trim()) {
      alert("Please enter an SMS message content.");
      return;
    }

    setIsSending(true);
    try {
      const receipt = await store.sendSeparateSms(
        targetPhone.trim(),
        selectedDonor?.fullName || "Registered Donor",
        selectedDonor?.uid || "",
        message.trim(),
        templateKey,
        emergency?.requestId,
        true
      );
      setLastDeliveredReceipt(receipt);
    } catch (err: any) {
      console.error("SMS dispatch failed:", err);
      alert("Failed to dispatch SMS: " + (err?.message || "Network issue"));
    } finally {
      setIsSending(false);
    }
  };

  const nativeSmsUrl = generateNativeSmsUrl(targetPhone, message);

  return (
    <div
      id="direct-donor-sms-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-[#18181B] border border-zinc-700/80 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl shadow-black/80 overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="bg-[#1F1F23] border-b border-zinc-700/80 px-4 sm:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white leading-tight">
                  Registered Mobile SMS Dispatcher
                </h3>
                <span className="bg-sky-500/15 text-sky-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-sky-500/30">
                  Direct Cellular Gateway
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Send dedicated SMS alerts directly to the donor's registered mobile number
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Target Donor Header / Selector */}
          <div className="bg-[#121214] border border-zinc-800 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-mono font-bold text-zinc-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-sky-400" />
                Target Donor Profile
              </span>

              {allDonors.length > 0 && !initialDonor && (
                <div className="text-xs">
                  <select
                    value={selectedDonor?.uid || ""}
                    onChange={(e) => {
                      const d = allDonors.find((item) => item.uid === e.target.value);
                      setSelectedDonor(d || null);
                    }}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="">Select Donor From Registry...</option>
                    {allDonors.map((d) => (
                      <option key={d.uid} value={d.uid}>
                        {d.fullName} ({d.bloodGroup}) — {d.phone || "No phone"} ({d.city})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {selectedDonor ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-red/20 border border-brand-red/40 flex items-center justify-center font-bold text-brand-red text-sm">
                    {selectedDonor.bloodGroup}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      {selectedDonor.fullName}
                      <span className="bg-emerald-500/15 text-emerald-400 text-[10px] px-1.5 py-0.2 rounded font-mono">
                        Verified Donor
                      </span>
                    </h4>
                    <p className="text-xs text-zinc-400">
                      {selectedDonor.city}, {selectedDonor.state} • {selectedDonor.donationCount} past donations
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500 block uppercase font-mono">
                      Registered Mobile Number
                    </span>
                    <input
                      type="text"
                      value={targetPhone}
                      onChange={(e) => setTargetPhone(e.target.value)}
                      placeholder="+91 98840 12345"
                      className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-sky-300 w-36 text-right focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-amber-400 flex items-center gap-2 p-2 bg-amber-500/10 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>No donor selected. Select a donor above or enter registered mobile number directly below.</span>
              </div>
            )}
          </div>

          {/* Quick Message Templates */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <span>Select Preset SMS Template</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTemplateKey("sos_match")}
                className={`text-left p-2.5 rounded-xl border text-xs transition cursor-pointer ${
                  templateKey === "sos_match"
                    ? "bg-brand-red/15 border-brand-red/60 text-white"
                    : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                }`}
              >
                <div className="font-bold flex items-center gap-1 text-white">
                  <span>🚨 Urgent SOS Match</span>
                </div>
                <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                  Direct match requisition alert with patient & hospital
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTemplateKey("direct_arrival_eta")}
                className={`text-left p-2.5 rounded-xl border text-xs transition cursor-pointer ${
                  templateKey === "direct_arrival_eta"
                    ? "bg-sky-500/15 border-sky-500/60 text-white"
                    : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                }`}
              >
                <div className="font-bold flex items-center gap-1 text-white">
                  <span>🏥 Hospital Arrival ETA Request</span>
                </div>
                <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                  Request donor's direct estimated arrival time
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTemplateKey("cooldown_cleared")}
                className={`text-left p-2.5 rounded-xl border text-xs transition cursor-pointer ${
                  templateKey === "cooldown_cleared"
                    ? "bg-emerald-500/15 border-emerald-500/60 text-white"
                    : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                }`}
              >
                <div className="font-bold flex items-center gap-1 text-white">
                  <span>⏰ Cooldown Cleared Reminder</span>
                </div>
                <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                  Notify that 56-day safe interval is cleared
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTemplateKey("lifesaver_thanks")}
                className={`text-left p-2.5 rounded-xl border text-xs transition cursor-pointer ${
                  templateKey === "lifesaver_thanks"
                    ? "bg-amber-500/15 border-amber-500/60 text-white"
                    : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                }`}
              >
                <div className="font-bold flex items-center gap-1 text-white">
                  <span>🎖️ Donation Appreciation & Units</span>
                </div>
                <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                  Lifesaver appreciation & digital badge update
                </p>
              </button>
            </div>
          </div>

          {/* Message Textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                <span>SMS Content to Registered Mobile</span>
              </label>
              <div className="text-[11px] font-mono text-zinc-400">
                <span className={charCount > 160 ? "text-amber-400 font-bold" : "text-zinc-400"}>
                  {charCount}
                </span>{" "}
                / 160 chars ({segmentsCount} {segmentsCount === 1 ? "part" : "parts"})
              </div>
            </div>

            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type SMS text to be dispatched directly to the registered phone..."
              className="w-full bg-[#111114] border border-zinc-700 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition resize-y"
            />
            <p className="text-[11px] text-zinc-500">
              Message will be transmitted via the registered cellular carrier gateway (Airtel/Jio GSM). Standard telecommunication delivery reports are generated instantly.
            </p>
          </div>

          {/* Delivery Receipt Notification Banner */}
          {lastDeliveredReceipt && (
            <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-xl p-3.5 space-y-1.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  SMS Dispatched & Delivered to Registered Mobile
                </span>
                <span className="font-mono text-[10px] text-emerald-300/80">
                  {new Date(lastDeliveredReceipt.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono text-zinc-300 pt-1">
                <div>
                  <span className="text-zinc-500 block text-[10px]">Recipient:</span>
                  <span className="text-white font-bold">{lastDeliveredReceipt.donorPhone}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">Carrier Gateway:</span>
                  <span className="text-sky-300">{lastDeliveredReceipt.carrier}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">Reference ID:</span>
                  <span className="text-amber-300">{lastDeliveredReceipt.referenceId}</span>
                </div>
              </div>
            </div>
          )}

          {/* Recent SMS Dispatch History */}
          {smsHistory.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <span className="text-[11px] uppercase font-mono font-bold text-zinc-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                Recent SMS Dispatch History ({smsHistory.length})
              </span>
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {smsHistory.slice(0, 4).map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-[#121214] border border-zinc-800 rounded-lg p-2.5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sky-400 text-[11px]">
                        To: {entry.donorName} ({entry.donorPhone})
                      </span>
                      <span className="bg-emerald-500/15 text-emerald-300 text-[10px] font-mono px-1.5 py-0.5 rounded">
                        ✓ {entry.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-300 line-clamp-1">"{entry.message}"</p>
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                      <span>Ref: {entry.referenceId}</span>
                      <span>{new Date(entry.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-[#1F1F23] border-t border-zinc-700/80 px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>Encrypted Cellular SMS Delivery Pipeline</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Close
            </button>

            {/* Native SMS URI fallback */}
            <a
              href={nativeSmsUrl}
              className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-sky-300 hover:text-sky-200 border border-sky-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Open default messaging app on device"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Native SMS App</span>
            </a>

            {/* Direct Gateway dispatch */}
            <button
              type="button"
              id="send-sms-gateway-btn"
              disabled={isSending || !targetPhone.trim() || !message.trim()}
              onClick={handleSendViaGateway}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-sky-600/25 transition cursor-pointer active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? "Dispatching SMS..." : "Send SMS to Registered Mobile"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
