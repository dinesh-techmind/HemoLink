/**
 * Browser Notification and Audio Telemetry Utilities for Emergency SOS Alerts
 */

export interface BrowserNotificationPayload {
  title: string;
  body: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: any;
  onClick?: () => void;
}

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getBrowserNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isBrowserNotificationSupported()) {
    return "unsupported";
  }
  try {
    return Notification.permission;
  } catch {
    return "unsupported";
  }
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isBrowserNotificationSupported()) {
    return "unsupported";
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn("Could not request browser notification permission:", err);
    return "unsupported";
  }
}

export function triggerBrowserNotification(payload: BrowserNotificationPayload): boolean {
  if (!isBrowserNotificationSupported()) {
    return false;
  }

  if (Notification.permission !== "granted") {
    return false;
  }

  try {
    const notification = new Notification(payload.title, {
      body: payload.body,
      tag: payload.tag || "emergency-sos-alert",
      icon: "https://api.iconify.design/lucide:droplet.svg?color=%23EF4444",
      badge: "https://api.iconify.design/lucide:flame.svg?color=%23EF4444",
      requireInteraction: payload.requireInteraction ?? true,
      data: payload.data
    });

    notification.onclick = () => {
      try {
        window.focus();
      } catch {
        // ignore
      }
      if (payload.onClick) {
        payload.onClick();
      }
      notification.close();
    };

    return true;
  } catch (err) {
    console.warn("Failed to create browser Notification object:", err);
    return false;
  }
}

/**
 * Play a synthesized dual-tone emergency telemetry audio chime using Web Audio API
 */
export function playEmergencyAlertSound(): void {
  try {
    const soundEnabled = localStorage.getItem("emergency_audio_enabled") !== "false";
    if (!soundEnabled) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // Dual-tone urgent alert: tone 1 (high urgency E5), tone 2 (urgent A5)
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now); // E5
    osc1.frequency.setValueAtTime(880.0, now + 0.12); // A5
    osc1.frequency.setValueAtTime(1046.5, now + 0.24); // C6

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(329.63, now); // E4
    osc2.frequency.setValueAtTime(440.0, now + 0.12); // A4
    osc2.frequency.setValueAtTime(523.25, now + 0.24); // C5

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.18, now + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  } catch (err) {
    // Non-fatal if audio context blocked by browser autoplay policy
    console.debug("Emergency audio chime blocked by browser policy:", err);
  }
}
