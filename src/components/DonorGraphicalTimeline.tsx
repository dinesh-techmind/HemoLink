import { useState, useMemo } from "react";
import { Donor } from "../types";
import {
  Calendar,
  Clock,
  Droplet,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Activity,
  HeartHandshake,
  UserCheck,
  Sparkles
} from "lucide-react";

interface DonorGraphicalTimelineProps {
  donor: Donor;
  compact?: boolean; // if true, shows compact preview by default
}

export interface TimelineMilestone {
  id: string;
  dateStr: string;
  dateObj: Date;
  title: string;
  subtitle: string;
  type: "registration" | "donation" | "eligibility";
  status: "completed" | "active_cooldown" | "eligible_now" | "upcoming";
  badgeText?: string;
  units?: number;
}

const COOLDOWN_DAYS = 56; // Standard 8-week (56-day) whole blood donation interval

export default function DonorGraphicalTimeline({ donor, compact = false }: DonorGraphicalTimelineProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(!compact);

  // Compute timeline math and milestone nodes
  const timelineData = useMemo(() => {
    const now = new Date();
    const createdDate = new Date(donor.createdAt || "2025-01-01");
    
    let lastDate: Date | null = donor.lastDonationDate ? new Date(donor.lastDonationDate) : null;
    if (lastDate && isNaN(lastDate.getTime())) {
      lastDate = null;
    }

    let nextEligibilityDate: Date | null = null;
    let isEligible = true;
    let daysRemaining = 0;
    let daysElapsed = 0;
    let progressPercent = 100;

    if (lastDate) {
      nextEligibilityDate = new Date(lastDate.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
      const diffMs = nextEligibilityDate.getTime() - now.getTime();
      const elapsedMs = now.getTime() - lastDate.getTime();
      
      daysElapsed = Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)));

      if (diffMs > 0) {
        isEligible = false;
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const totalCooldownMs = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
        progressPercent = Math.min(100, Math.max(0, Math.round((elapsedMs / totalCooldownMs) * 100)));
      } else {
        isEligible = true;
        daysRemaining = 0;
        progressPercent = 100;
      }
    }

    // Generate chronological milestone items
    const milestones: TimelineMilestone[] = [];

    // 1. Account Created Milestone
    milestones.push({
      id: "registration",
      dateObj: createdDate,
      dateStr: createdDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      title: "Registered Donor",
      subtitle: `Verified in ${donor.city}, ${donor.state}`,
      type: "registration",
      status: "completed"
    });

    // 2. Historical Donation Milestones
    if (donor.donationCount > 0 && lastDate) {
      const countToShow = Math.min(donor.donationCount, 3);
      for (let i = countToShow; i >= 1; i--) {
        // Space milestones backwards from lastDate if count > 1
        const offsetDays = (countToShow - i) * (COOLDOWN_DAYS + 14);
        const dDate = new Date(lastDate.getTime() - offsetDays * 24 * 60 * 60 * 1000);
        
        const isLatest = i === countToShow;
        milestones.push({
          id: `donation_${i}`,
          dateObj: dDate,
          dateStr: dDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          title: isLatest ? "Most Recent Donation" : `Donation Milestone #${donor.donationCount - (countToShow - i)}`,
          subtitle: "1 Unit Whole Blood Donated",
          type: "donation",
          status: "completed",
          badgeText: "1 Unit Saved",
          units: 1
        });
      }
    }

    // Sort historical items chronologically before eligibility target
    milestones.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    // 3. Upcoming / Current Eligibility Target Milestone
    if (lastDate && nextEligibilityDate) {
      if (!isEligible) {
        milestones.push({
          id: "eligibility_upcoming",
          dateObj: nextEligibilityDate,
          dateStr: nextEligibilityDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          title: "Upcoming Eligibility Date",
          subtitle: `56-day WHO cooldown period (${daysRemaining} days remaining)`,
          type: "eligibility",
          status: "active_cooldown",
          badgeText: `${daysRemaining} Days Cooldown`
        });
      } else {
        milestones.push({
          id: "eligibility_cleared",
          dateObj: nextEligibilityDate,
          dateStr: nextEligibilityDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          title: "Cooldown Cleared",
          subtitle: `Eligible for next donation since ${nextEligibilityDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
          type: "eligibility",
          status: "eligible_now",
          badgeText: "Eligible Now"
        });
      }
    } else {
      // First time donor (no previous donation date recorded)
      milestones.push({
        id: "eligibility_first",
        dateObj: now,
        dateStr: "Today",
        title: "Immediate Eligibility",
        subtitle: "No active cooldowns — Ready to save lives",
        type: "eligibility",
        status: "eligible_now",
        badgeText: "First-Time Ready"
      });
    }

    return {
      lastDate,
      nextEligibilityDate,
      isEligible,
      daysRemaining,
      daysElapsed,
      progressPercent,
      milestones
    };
  }, [donor]);

  const formattedLastDonation = timelineData.lastDate
    ? timelineData.lastDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "No prior records";

  const formattedNextEligibility = timelineData.nextEligibilityDate
    ? timelineData.nextEligibilityDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Eligible Today";

  return (
    <div className="mt-3 pt-3 border-t border-border-dark/60 text-xs">
      
      {/* 1. Header Eligibility Banner & Cooldown Progress */}
      <div className="bg-[#18181B] border border-border-dark rounded-xl p-3 space-y-2.5">
        
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-bold font-display text-[11px] text-text-bright">
            <Activity className="w-3.5 h-3.5 text-brand-red animate-pulse" />
            <span>Donation Timeline & Eligibility</span>
          </div>

          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 font-mono uppercase tracking-wider ${
              timelineData.isEligible
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
            }`}
          >
            {timelineData.isEligible ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Eligible Now</span>
              </>
            ) : (
              <>
                <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                <span>{timelineData.daysRemaining}d Cooldown</span>
              </>
            )}
          </span>
        </div>

        {/* Cooldown recovery bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-text-subtle font-mono">
            <span>Last: {formattedLastDonation}</span>
            <span>Next Eligible: {formattedNextEligibility}</span>
          </div>

          <div className="w-full bg-[#27272A] rounded-full h-2 overflow-hidden p-0.5 border border-zinc-800 relative">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                timelineData.isEligible
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-400"
                  : "bg-gradient-to-r from-amber-600 via-orange-500 to-emerald-500"
              }`}
              style={{ width: `${timelineData.progressPercent}%` }}
            ></div>
          </div>

          <div className="flex justify-between items-center text-[9px] text-text-subtle pt-0.5">
            <span className="text-zinc-500">56-Day Medical Interval</span>
            <span className="font-mono text-zinc-400 font-semibold">{timelineData.progressPercent}% Cellular Recovery</span>
          </div>
        </div>

        {/* 2. Interactive Graphical Timeline Node Bar (Horizontal Stepper) */}
        <div className="pt-2 border-t border-zinc-800/80">
          <div className="relative flex items-center justify-between px-2 py-1">
            {/* Connecting baseline bar */}
            <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-0.5 bg-zinc-800 z-0"></div>
            
            {/* Active progress segment on line */}
            <div
              className="absolute left-4 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-500 transition-all duration-300 z-0"
              style={{
                width: timelineData.isEligible ? "calc(100% - 32px)" : `calc(${timelineData.progressPercent}% - 16px)`
              }}
            ></div>

            {/* Stepper nodes */}
            {timelineData.milestones.map((m, idx) => {
              const isLast = idx === timelineData.milestones.length - 1;
              const isCompleted = m.status === "completed" || m.status === "eligible_now";
              const isCooldown = m.status === "active_cooldown";

              return (
                <div key={m.id} className="relative z-10 flex flex-col items-center group cursor-pointer">
                  {/* Node Icon Circle */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all transform group-hover:scale-110 shadow-md ${
                      isCompleted
                        ? "bg-emerald-950 text-emerald-400 border-2 border-emerald-500 shadow-emerald-950/50"
                        : isCooldown
                        ? "bg-amber-950 text-amber-400 border-2 border-amber-500 animate-pulse shadow-amber-950/50"
                        : "bg-zinc-900 text-zinc-500 border-2 border-zinc-700"
                    }`}
                  >
                    {m.type === "registration" && <UserCheck className="w-3.5 h-3.5" />}
                    {m.type === "donation" && <Droplet className="w-3.5 h-3.5 text-brand-red fill-brand-red/20" />}
                    {m.type === "eligibility" && (
                      isCompleted ? <ShieldCheck className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />
                    )}
                  </div>

                  {/* Node Label underneath */}
                  <span className="text-[9px] font-bold text-text-subtle group-hover:text-text-bright mt-1 tracking-tight text-center max-w-[64px] truncate">
                    {m.dateStr}
                  </span>

                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block bg-[#09090B] border border-zinc-700 text-text-bright text-[10px] p-2 rounded-lg shadow-2xl z-50 whitespace-nowrap pointer-events-none">
                    <p className="font-bold text-emerald-400">{m.title}</p>
                    <p className="text-zinc-400 text-[9px]">{m.subtitle}</p>
                    <p className="text-zinc-500 text-[8px] font-mono mt-0.5">{m.dateStr}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Toggle Expand Details button */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full pt-1 text-[10px] font-bold text-text-muted hover:text-brand-red transition flex items-center justify-center gap-1 cursor-pointer select-none"
        >
          <span>{isExpanded ? "Collapse Timeline Logs" : "Expand Full History & Milestones"}</span>
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* 3. Detailed Expanded Milestone History View */}
      {isExpanded && (
        <div className="mt-2.5 p-3 bg-surface-dark/90 border border-border-dark rounded-xl space-y-3 animate-fade-in">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
            <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3 text-brand-red" />
              <span>Full Life Cycle History ({timelineData.milestones.length} Events)</span>
            </span>
            <span className="text-[9px] text-zinc-500 font-mono">
              Total Saved: <strong className="text-brand-red">{donor.donationCount} Units</strong>
            </span>
          </div>

          <div className="relative pl-3 space-y-3 border-l border-zinc-800">
            {timelineData.milestones.map((m) => {
              const isCompleted = m.status === "completed" || m.status === "eligible_now";
              const isCooldown = m.status === "active_cooldown";

              return (
                <div key={m.id} className="relative pl-3 group">
                  {/* Timeline dot */}
                  <div
                    className={`absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full border ${
                      isCompleted
                        ? "bg-emerald-500 border-emerald-400"
                        : isCooldown
                        ? "bg-amber-500 border-amber-400 animate-ping"
                        : "bg-zinc-700 border-zinc-600"
                    }`}
                  ></div>

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h5 className="font-bold text-[11px] text-text-bright leading-tight flex items-center gap-1.5">
                        <span>{m.title}</span>
                        {m.badgeText && (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-extrabold ${
                              isCompleted
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : "bg-amber-950 text-amber-400 border border-amber-800"
                            }`}
                          >
                            {m.badgeText}
                          </span>
                        )}
                      </h5>
                      <p className="text-[10px] text-text-muted mt-0.5">{m.subtitle}</p>
                    </div>

                    <span className="text-[9px] font-mono text-zinc-500 shrink-0">{m.dateStr}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Medical WHO Note */}
          <div className="bg-[#121214] p-2 rounded-lg border border-zinc-800/60 flex items-center gap-2 text-[9px] text-text-subtle">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              WHO Medical Standard: Whole blood donors require 56 days between sessions for safe hemoglobin recovery.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
