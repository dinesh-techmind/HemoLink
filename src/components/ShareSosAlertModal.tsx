import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Twitter,
  Facebook,
  Linkedin,
  Send,
  Mail,
  Smartphone,
  Building2,
  MapPin,
  Clock,
  Sparkles,
  Link as LinkIcon,
  AlertTriangle,
  Megaphone
} from "lucide-react";
import { EmergencyRequest } from "../types";

interface ShareSosAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: EmergencyRequest | null;
}

export const ShareSosAlertModal: React.FC<ShareSosAlertModalProps> = ({
  isOpen,
  onClose,
  request
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [templateType, setTemplateType] = useState<"detailed" | "compact">("detailed");
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);

  if (!isOpen || !request) return null;

  // Build the live deep link pointing directly to this emergency request
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  const shareUrl = `${origin}${pathname}?emergencyId=${encodeURIComponent(request.requestId)}`;

  const cleanBloodTag = request.bloodGroupNeeded.replace("+", "Positive").replace("-", "Negative");
  const hoursRemaining = Math.max(
    0,
    Math.ceil((new Date(request.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60))
  );

  // Pre-filled formatted message variations
  const detailedMessage =
`🚨 URGENT SOS: ${request.bloodGroupNeeded} BLOOD REQUIRED IMMEDIATELY!

👤 Patient: ${request.patientName}
🩸 Blood Type: ${request.bloodGroupNeeded} (${request.unitsNeeded} Units Required)
⚠️ Urgency: ${request.urgencyLevel.toUpperCase()}
🏥 Hospital: ${request.hospitalName}
📍 Location: ${request.hospitalAddress}, ${request.city}, ${request.state}
⏳ Time Window: Expiring in approx ${hoursRemaining} hours
${request.additionalNotes ? `📝 Clinical Note: ${request.additionalNotes}\n` : ""}📞 Contact Coordinator: ${request.requesterName} (${request.requesterPhone})

🔗 Respond or Check Compatibility on Hemolink Portal:
${shareUrl}

#BloodDonation #SOSBlood #${cleanBloodTag} #EmergencyBlood #SaveALife`;

  const compactMessage =
`🆘 EMERGENCY: ${request.bloodGroupNeeded} blood (${request.unitsNeeded}U) urgently required for ${request.patientName} at ${request.hospitalName}, ${request.city}. Please respond or share immediately: ${shareUrl}`;

  const activeMessage = templateType === "detailed" ? detailedMessage : compactMessage;

  // Social platform definitions with pre-filled URLs
  const socialPlatforms = [
    {
      id: "whatsapp",
      name: "WhatsApp",
      description: "Direct broadcast to family, friends & donor groups",
      icon: MessageCircle,
      accentColor: "#25D366",
      bgHover: "hover:bg-emerald-500/10 hover:border-emerald-500/40",
      buttonBg: "bg-emerald-600 hover:bg-emerald-500 text-white",
      getUrl: () => `https://api.whatsapp.com/send?text=${encodeURIComponent(activeMessage)}`
    },
    {
      id: "twitter",
      name: "X (Twitter)",
      description: "Broadcast with pre-filled tags to emergency networks",
      icon: Twitter,
      accentColor: "#1DA1F2",
      bgHover: "hover:bg-sky-500/10 hover:border-sky-500/40",
      buttonBg: "bg-sky-600 hover:bg-sky-500 text-white",
      getUrl: () => {
        const xText = `🚨 URGENT: ${request.bloodGroupNeeded} blood needed for patient ${request.patientName} (${request.unitsNeeded} Units) at ${request.hospitalName}, ${request.city}! Help save a life:`;
        return `https://twitter.com/intent/tweet?text=${encodeURIComponent(xText)}&url=${encodeURIComponent(shareUrl)}&hashtags=${encodeURIComponent(`BloodDonation,SOSBlood,${cleanBloodTag},Emergency`)}`;
      }
    },
    {
      id: "telegram",
      name: "Telegram",
      description: "Share instantly to Telegram blood alert channels",
      icon: Send,
      accentColor: "#229ED9",
      bgHover: "hover:bg-cyan-500/10 hover:border-cyan-500/40",
      buttonBg: "bg-cyan-600 hover:bg-cyan-500 text-white",
      getUrl: () => `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(activeMessage)}`
    },
    {
      id: "facebook",
      name: "Facebook",
      description: "Post to community groups & local volunteer timelines",
      icon: Facebook,
      accentColor: "#1877F2",
      bgHover: "hover:bg-blue-500/10 hover:border-blue-500/40",
      buttonBg: "bg-blue-600 hover:bg-blue-500 text-white",
      getUrl: () => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(activeMessage)}`
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      description: "Post to professional workplace & CSR networks",
      icon: Linkedin,
      accentColor: "#0A66C2",
      bgHover: "hover:bg-indigo-500/10 hover:border-indigo-500/40",
      buttonBg: "bg-indigo-600 hover:bg-indigo-500 text-white",
      getUrl: () => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    },
    {
      id: "email",
      name: "Email Alert",
      description: "Send formatted requisition to organization mailing lists",
      icon: Mail,
      accentColor: "#EA4335",
      bgHover: "hover:bg-rose-500/10 hover:border-rose-500/40",
      buttonBg: "bg-rose-600 hover:bg-rose-500 text-white",
      getUrl: () => {
        const subject = `[URGENT SOS] ${request.bloodGroupNeeded} Blood Needed - ${request.hospitalName}, ${request.city}`;
        return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(activeMessage)}`;
      }
    }
  ];

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(activeMessage);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleCopyPlatformUrl = async (platformId: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedPlatform(platformId);
      setTimeout(() => setCopiedPlatform(null), 2000);
    } catch {
      // fallback
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `🆘 URGENT: ${request.bloodGroupNeeded} Blood Needed for ${request.patientName}`,
          text: activeMessage,
          url: shareUrl
        });
      } catch (err) {
        // User cancelled or share failed
      }
    }
  };

  const hasNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div
      id="share-sos-alert-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2 }}
        className="bg-card-dark border border-border-dark w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-red-900/40 via-amber-900/30 to-zinc-900 border-b border-border-dark p-4 sm:p-5 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-text-bright flex items-center gap-2 font-display">
                  <span>Share SOS Alert</span>
                </h3>
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  External Awareness
                </span>
                <span
                  className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded font-mono ${
                    request.urgencyLevel === "Critical"
                      ? "bg-red-500/20 text-red-300 border border-red-500/40"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  }`}
                >
                  {request.urgencyLevel}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-1 leading-snug">
                Generate pre-filled social media links to broadcast this requisition across external networks, WhatsApp chats, and local communities.
              </p>
            </div>
          </div>

          <button
            id="close-share-sos-modal-btn"
            onClick={onClose}
            className="text-text-subtle hover:text-text-bright p-1.5 rounded-lg hover:bg-surface-dark transition shrink-0 cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto flex-grow">
          {/* Requisition Snapshot Card */}
          <div className="bg-surface-dark/90 border border-border-dark rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-brand-red/20 border border-brand-red/50 flex flex-col items-center justify-center shrink-0">
                <span className="text-sm font-black text-brand-red font-display leading-none">
                  {request.bloodGroupNeeded}
                </span>
                <span className="text-[9px] text-zinc-400 font-mono mt-0.5">
                  {request.unitsNeeded} Units
                </span>
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-text-bright">
                  Patient: {request.patientName}
                </h4>
                <p className="text-xs text-text-muted flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-brand-red shrink-0" />
                  <span>{request.hospitalName}, {request.city}</span>
                </p>
                <p className="text-[11px] text-text-subtle font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3 shrink-0" />
                  <span>Remaining: {hoursRemaining}h before expiration</span>
                </p>
              </div>
            </div>

            {hasNativeShare && (
              <button
                id="native-device-share-btn"
                type="button"
                onClick={handleNativeShare}
                className="bg-surface-dark hover:bg-zinc-800 border border-border-dark text-text-bright font-bold text-xs py-2 px-3.5 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer self-start sm:self-auto shrink-0 shadow-sm active:scale-95"
              >
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span>Device Share Menu</span>
              </button>
            )}
          </div>

          {/* Social Platforms Pre-filled Grid */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold text-text-bright uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Instant Social Media Broadcast</span>
              </h4>
              <span className="text-[11px] text-text-muted">
                Pre-filled with patient details & direct link
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {socialPlatforms.map((platform) => {
                const IconComponent = platform.icon;
                const linkUrl = platform.getUrl();
                const isCopied = copiedPlatform === platform.id;

                return (
                  <div
                    key={platform.id}
                    id={`share-channel-${platform.id}`}
                    className={`bg-surface-dark/70 border border-border-dark ${platform.bgHover} p-3 rounded-xl transition flex flex-col justify-between gap-2.5`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
                          style={{
                            backgroundColor: `${platform.accentColor}18`,
                            borderColor: `${platform.accentColor}40`,
                            color: platform.accentColor
                          }}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-text-bright leading-tight">
                            {platform.name}
                          </div>
                          <div className="text-[10px] text-text-subtle line-clamp-1">
                            {platform.description}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-border-dark/40">
                      <a
                        id={`open-share-link-${platform.id}`}
                        href={linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex-grow ${platform.buttonBg} text-xs font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition text-center`}
                        title={`Open pre-filled ${platform.name} link`}
                      >
                        <span>Share on {platform.name}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 opacity-80" />
                      </a>

                      <button
                        type="button"
                        id={`copy-share-url-${platform.id}`}
                        onClick={() => handleCopyPlatformUrl(platform.id, linkUrl)}
                        className="bg-surface-dark border border-border-dark hover:border-zinc-500 text-text-muted hover:text-text-bright p-1.5 rounded-lg text-xs transition shrink-0 cursor-pointer"
                        title={`Copy pre-filled ${platform.name} URL`}
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Direct Pre-filled Link Section */}
          <div className="bg-surface-dark/60 border border-border-dark rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-text-bright uppercase tracking-wider font-mono flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-sky-400" />
                <span>Pre-filled Requisition Link</span>
              </label>
              <span className="text-[11px] text-text-subtle">
                Recipients land directly on this emergency card
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="share-sos-direct-link-input"
                type="text"
                readOnly
                value={shareUrl}
                className="flex-grow bg-background-dark/90 border border-border-dark rounded-lg py-2 px-3 text-xs text-text-muted font-mono select-all focus:outline-none focus:border-sky-500"
              />
              <button
                id="copy-share-sos-link-btn"
                type="button"
                onClick={handleCopyLink}
                className={`py-2 px-3.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                  copiedLink
                    ? "bg-emerald-600 text-white"
                    : "bg-sky-600 hover:bg-sky-500 text-white"
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied Link</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Pre-filled Message Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-text-bright uppercase tracking-wider font-mono">
                  Message Format
                </span>
                <div className="inline-flex p-0.5 rounded-lg bg-surface-dark border border-border-dark">
                  <button
                    type="button"
                    onClick={() => setTemplateType("detailed")}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition cursor-pointer ${
                      templateType === "detailed"
                        ? "bg-zinc-800 text-text-bright shadow-sm"
                        : "text-text-subtle hover:text-text-muted"
                    }`}
                  >
                    Full Details
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplateType("compact")}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition cursor-pointer ${
                      templateType === "compact"
                        ? "bg-zinc-800 text-text-bright shadow-sm"
                        : "text-text-subtle hover:text-text-muted"
                    }`}
                  >
                    Compact (SMS/Post)
                  </button>
                </div>
              </div>

              <button
                id="copy-formatted-broadcast-btn"
                type="button"
                onClick={handleCopyText}
                className={`text-xs font-bold py-1 px-3 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                  copiedText
                    ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/50"
                    : "bg-surface-dark border border-border-dark text-text-muted hover:text-text-bright hover:border-zinc-500"
                }`}
              >
                {copiedText ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied Message!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Message</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              <textarea
                id="share-sos-message-preview"
                rows={templateType === "detailed" ? 7 : 4}
                readOnly
                value={activeMessage}
                className="w-full bg-background-dark/80 border border-border-dark rounded-xl p-3 text-xs text-text-muted font-mono leading-relaxed resize-none focus:outline-none select-all"
              />
              <div className="absolute right-3 bottom-3 text-[10px] text-text-subtle font-mono bg-card-dark/80 px-1.5 py-0.5 rounded border border-border-dark/60">
                {activeMessage.length} characters
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-surface-dark border-t border-border-dark p-3.5 sm:p-4 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-text-subtle flex items-center gap-1.5 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Spreading awareness speeds up donor response times by 78%</span>
          </div>

          <button
            id="close-share-sos-dialog-btn"
            type="button"
            onClick={onClose}
            className="bg-zinc-800 hover:bg-zinc-700 text-text-bright text-xs font-bold py-2 px-4 rounded-xl transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ShareSosAlertModal;
