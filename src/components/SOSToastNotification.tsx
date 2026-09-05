import React, { useState, useEffect } from "react";
import {
  Flame,
  Droplet,
  MapPin,
  Clock,
  X,
  Bell,
  Volume2,
  VolumeX,
  ChevronRight,
  ShieldAlert,
  Hospital
} from "lucide-react";
import { EmergencyRequest } from "../types";

export interface SOSToastItem extends EmergencyRequest {
  toastId: string;
  autoDismissMs?: number;
}

interface SOSToastNotificationProps {
  toasts: SOSToastItem[];
  onDismiss: (toastId: string) => void;
  onDismissAll: () => void;
  onViewSOS: (requestId: string) => void;
  userCity: string;
  browserPermission: NotificationPermission | "unsupported";
  onRequestPermission: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onTestToast?: () => void;
}

export default function SOSToastNotification({
  toasts,
  onDismiss,
  onDismissAll,
  onViewSOS,
  userCity,
  browserPermission,
  onRequestPermission,
  soundEnabled,
  onToggleSound,
  onTestToast
}: SOSToastNotificationProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <aside
      id="sos-toast-container"
      aria-label="Emergency SOS Notifications"
      className="fixed top-4 sm:top-5 right-4 sm:right-5 z-[9999] max-w-[420px] w-full flex flex-col gap-3 pointer-events-none"
    >
      {/* Top Banner Control: Stack count & permission/sound toggles */}
      {toasts.length > 1 && (
        <div className="pointer-events-auto bg-[#181517]/95 border border-brand-red/40 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs text-text-bright shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-rose-400 font-bold">
            <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
            <span>{toasts.length} High-Urgency Alerts Active</span>
          </div>
          <button
            onClick={onDismissAll}
            className="text-[10px] text-text-muted hover:text-text-bright underline font-mono cursor-pointer transition"
          >
            Dismiss All
          </button>
        </div>
      )}

      {toasts.map((toast) => (
        <ToastCard
          key={toast.toastId}
          toast={toast}
          userCity={userCity}
          onDismiss={onDismiss}
          onViewSOS={onViewSOS}
          browserPermission={browserPermission}
          onRequestPermission={onRequestPermission}
          soundEnabled={soundEnabled}
          onToggleSound={onToggleSound}
        />
      ))}
    </aside>
  );
}

interface ToastCardProps {
  key?: React.Key;
  toast: SOSToastItem;
  userCity: string;
  onDismiss: (toastId: string) => void;
  onViewSOS: (requestId: string) => void;
  browserPermission: NotificationPermission | "unsupported";
  onRequestPermission: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

function ToastCard({
  toast,
  userCity,
  onDismiss,
  onViewSOS,
  browserPermission,
  onRequestPermission,
  soundEnabled,
  onToggleSound
}: ToastCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(100);
  const duration = toast.autoDismissMs || 10000;

  useEffect(() => {
    if (isHovered) return;

    const intervalTime = 100;
    const decrement = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= decrement) {
          clearInterval(timer);
          onDismiss(toast.toastId);
          return 0;
        }
        return prev - decrement;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isHovered, duration, onDismiss, toast.toastId]);

  const isCritical = toast.urgencyLevel === "Critical";

  return (
    <div
      id={`sos-toast-${toast.requestId}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="pointer-events-auto relative overflow-hidden bg-gradient-to-br from-[#1C1416] via-[#161214] to-[#121012] border-2 border-brand-red/70 rounded-2xl shadow-2xl shadow-brand-red/20 backdrop-blur-xl p-4 transition-all duration-300 hover:border-brand-red animate-in fade-in slide-in-from-top-4"
      role="alert"
    >
      {/* Top Accent Strip */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500" />

      {/* Header Row */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-red/25 border border-brand-red/50 flex items-center justify-center text-brand-red shrink-0 shadow-inner">
            <Flame className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-black tracking-wider uppercase font-mono text-rose-400">
                {isCritical ? "CRITICAL SOS BROADCAST" : "HIGH-URGENCY SOS"}
              </span>
              <span
                className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded font-mono ${
                  isCritical
                    ? "bg-red-500/25 text-red-300 border border-red-500/40"
                    : "bg-amber-500/25 text-amber-300 border border-amber-500/40"
                }`}
              >
                {toast.urgencyLevel}
              </span>
            </div>
            <p className="text-[10px] text-text-subtle font-mono mt-0.5 flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5 text-brand-red shrink-0" />
              <span>Matching your city:</span>
              <strong className="text-text-bright font-bold underline decoration-brand-red">
                {toast.city}
              </strong>
            </p>
          </div>
        </div>

        {/* Action Controls: Sound & Close */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onToggleSound}
            className="p-1 rounded-lg text-text-subtle hover:text-text-bright hover:bg-white/5 transition cursor-pointer"
            title={soundEnabled ? "Audio alerts enabled (click to mute)" : "Audio alerts muted (click to unmute)"}
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onDismiss(toast.toastId)}
            className="p-1 rounded-lg text-text-subtle hover:text-text-bright hover:bg-white/5 transition cursor-pointer"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Request Information */}
      <div className="mt-3 bg-[#241A1C]/80 border border-brand-red/30 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-red text-white flex flex-col items-center justify-center font-black shadow-md shrink-0">
              <span className="text-[9px] uppercase leading-none opacity-80">Need</span>
              <span className="text-sm leading-none">{toast.bloodGroupNeeded}</span>
            </div>
            <div>
              <div className="text-xs font-bold text-text-bright flex items-center gap-1.5">
                <span>Patient: {toast.patientName}</span>
                <span className="text-[10px] bg-white/10 text-rose-200 px-1.5 py-0.2 rounded font-mono font-medium">
                  {toast.unitsNeeded} unit{toast.unitsNeeded > 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-[11px] text-text-muted mt-0.5 truncate max-w-[240px]">
                {toast.hospitalName}
              </p>
            </div>
          </div>
        </div>

        {/* Hospital Address snippet */}
        <div className="text-[10px] text-text-subtle font-mono flex items-start gap-1 pt-1 border-t border-brand-red/20">
          <Hospital className="w-3 h-3 text-brand-red shrink-0 mt-0.5" />
          <span className="truncate">{toast.hospitalAddress}</span>
        </div>
      </div>

      {/* Browser Notification Status Prompt (if permission not yet granted) */}
      {browserPermission === "default" && (
        <div className="mt-2.5 bg-brand-red/10 border border-brand-red/30 rounded-xl p-2 flex items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-rose-300 min-w-0">
            <Bell className="w-3.5 h-3.5 text-brand-red shrink-0 animate-bounce" />
            <span className="truncate text-[10px] font-mono">Enable background browser alerts:</span>
          </div>
          <button
            type="button"
            onClick={onRequestPermission}
            className="bg-brand-red hover:bg-brand-red-dark text-white text-[10px] font-bold px-2 py-1 rounded-lg transition shrink-0 cursor-pointer"
          >
            Allow
          </button>
        </div>
      )}

      {browserPermission === "granted" && (
        <div className="mt-1.5 flex items-center justify-between text-[9px] text-emerald-400 font-mono">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            Browser Notification Sent
          </span>
          <span className="text-text-subtle">Auto-closing in {Math.ceil((progress / 100) * (duration / 1000))}s</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            onViewSOS(toast.requestId);
            onDismiss(toast.toastId);
          }}
          className="flex-1 bg-brand-red hover:bg-brand-red-dark text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-brand-red/30 transition cursor-pointer"
        >
          <span>View SOS Alert</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onDismiss(toast.toastId)}
          className="bg-[#262022] hover:bg-[#30282A] text-text-muted hover:text-text-bright border border-border-dark py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer"
        >
          Dismiss
        </button>
      </div>

      {/* Countdown Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
        <div
          className="h-full bg-brand-red transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
