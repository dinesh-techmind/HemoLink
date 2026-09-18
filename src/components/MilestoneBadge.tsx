import React from "react";
import { Medal, Award, Crown, Gem, Droplet, Sparkles, ChevronRight } from "lucide-react";
import { Donor } from "../types";
import {
  MilestoneTier,
  MilestoneTierId,
  getDonorSavedUnits,
  getMilestoneTier,
  getNextMilestoneProgress
} from "../lib/milestones";

interface MilestoneBadgeProps {
  donor?: Partial<Donor> | null;
  savedUnits?: number;
  variant?: "pill" | "card" | "pass" | "large" | "compact";
  showProgress?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const MilestoneTierIcon: React.FC<{ tierId: MilestoneTierId; className?: string }> = ({
  tierId,
  className = "w-4 h-4"
}) => {
  switch (tierId) {
    case "diamond":
      return <Gem className={className} />;
    case "gold":
      return <Crown className={className} />;
    case "silver":
      return <Award className={className} />;
    case "bronze":
      return <Medal className={className} />;
    case "starter":
    default:
      return <Droplet className={className} />;
  }
};

export const MilestoneBadge: React.FC<MilestoneBadgeProps> = ({
  donor,
  savedUnits: propUnits,
  variant = "pill",
  showProgress = false,
  onClick,
  className = "",
  style
}) => {
  const units = typeof propUnits === "number" ? propUnits : getDonorSavedUnits(donor);
  const tier = getMilestoneTier(units);
  const progress = getNextMilestoneProgress(units);

  // Variant 1: Compact Pill Chip (For Directory Cards & Tables)
  if (variant === "pill" || variant === "compact") {
    const hasCustomColor = Boolean(style?.color || className.includes("!text-") || className.includes("text-white"));
    const hasCustomBg = Boolean(style?.backgroundColor || className.includes("!bg-") || className.includes("bg-[#"));

    return (
      <button
        type="button"
        onClick={onClick}
        style={style}
        title={`${tier.name}: ${units} units saved (${tier.description})`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10.5px] font-bold font-display select-none transition-all duration-200 ${
          onClick ? "cursor-pointer hover:scale-105 active:scale-95" : "cursor-default"
        } ${hasCustomBg ? "" : tier.colors.badgeBg} ${tier.colors.badgeBorder} ${hasCustomColor ? "" : tier.colors.badgeText} ${className}`}
      >
        <span className={`${hasCustomColor ? "text-inherit opacity-90" : tier.colors.iconColor} shrink-0`}>
          <MilestoneTierIcon tierId={tier.id} className="w-3.5 h-3.5" />
        </span>
        <span className="font-extrabold uppercase tracking-wide whitespace-nowrap">
          {tier.shortLabel}
        </span>
        <span className={`text-[10px] ${hasCustomColor ? "opacity-95" : "opacity-85"} font-mono`}>
          {units} {tier.id === "diamond" ? "Lives" : "Units"}
        </span>
        {tier.id === "diamond" && (
          <Sparkles className="w-3 h-3 text-cyan-300 animate-pulse shrink-0" />
        )}
      </button>
    );
  }

  // Variant 2: Pass Stamp / Seal for Digital Donor Identity Pass
  if (variant === "pass") {
    return (
      <div
        onClick={onClick}
        title={`${tier.name} (${units} Units Saved)`}
        className={`px-3 py-1 rounded-lg border flex items-center gap-2 select-none shadow-xs ${
          tier.id === "diamond"
            ? "bg-cyan-50 border-cyan-500 text-cyan-900"
            : tier.id === "gold"
            ? "bg-amber-50 border-amber-500 text-amber-900"
            : tier.id === "silver"
            ? "bg-slate-50 border-slate-400 text-slate-900"
            : tier.id === "bronze"
            ? "bg-orange-50 border-amber-700 text-amber-950"
            : "bg-red-50 border-rose-400 text-rose-950"
        } ${onClick ? "cursor-pointer" : ""} ${className}`}
      >
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white shadow-xs ${
            tier.id === "diamond"
              ? "bg-cyan-600"
              : tier.id === "gold"
              ? "bg-amber-600"
              : tier.id === "silver"
              ? "bg-slate-600"
              : tier.id === "bronze"
              ? "bg-amber-800"
              : "bg-rose-600"
          }`}
        >
          <MilestoneTierIcon tierId={tier.id} className="w-3.5 h-3.5" />
        </div>
        <div className="leading-tight text-left">
          <div className="text-[9px] font-black uppercase tracking-wider font-mono opacity-80">
            CERTIFIED MILESTONE
          </div>
          <div className="text-[11px] font-black tracking-tight font-display uppercase">
            {tier.name}
            <span className="ml-1 text-[10px] font-mono opacity-90 font-bold">
              • {units} {tier.id === "diamond" ? "Lives" : "Units"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Variant 3: Large Showcase Badge
  if (variant === "large") {
    return (
      <div
        onClick={onClick}
        className={`relative p-5 rounded-2xl border ${tier.colors.metallicBg} ${tier.colors.badgeBorder} shadow-2xl overflow-hidden ${className}`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br ${tier.colors.gradient} shrink-0`}
          >
            <MilestoneTierIcon tierId={tier.id} className="w-7 h-7 text-white drop-shadow" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-mono uppercase font-bold tracking-widest ${tier.colors.badgeText}`}>
                {tier.rankTitle}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-black/40 text-white/90 font-mono font-bold">
                {units} {tier.id === "diamond" ? "Lives Protected" : "Units Saved"}
              </span>
            </div>
            <h4 className="text-lg font-black font-display text-text-bright tracking-tight mt-0.5">
              {tier.name}
            </h4>
            <p className="text-xs text-text-muted mt-1 leading-relaxed line-clamp-2">
              {tier.description}
            </p>
          </div>
        </div>

        {showProgress && (
          <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted font-medium">
                {progress.nextTier ? `Progress to ${progress.nextTier.name}` : "Highest Tier Attained!"}
              </span>
              <span className="font-mono font-bold text-text-bright">
                {progress.nextTier
                  ? `${units} / ${progress.nextTarget} Units (${progress.progressPercent}%)`
                  : "Diamond Master"}
              </span>
            </div>

            <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div
                className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${tier.colors.gradient}`}
                style={{ width: `${progress.progressPercent}%` }}
              />
            </div>

            {progress.nextTier && (
              <p className="text-[11px] text-text-subtle font-mono text-right">
                {progress.unitsNeeded} more units needed to unlock {progress.nextTier.name}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Variant 4: Card (Default Showcase for Profile Panel)
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-2xl border ${tier.colors.metallicBg} ${tier.colors.badgeBorder} space-y-3 transition shadow-lg ${
        onClick ? "cursor-pointer hover:border-zinc-400" : ""
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md bg-gradient-to-br ${tier.colors.gradient} shrink-0`}
          >
            <MilestoneTierIcon tierId={tier.id} className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider block ${tier.colors.badgeText}`}>
              Active Milestone Tier
            </span>
            <h4 className="text-base font-extrabold text-text-bright font-display leading-tight">
              {tier.name}
            </h4>
            <span className="text-xs font-mono text-text-muted">
              {units} {tier.id === "diamond" ? "Total Lives Saved" : "Total Saved Units"}
            </span>
          </div>
        </div>

        {onClick && (
          <button
            type="button"
            className="text-text-subtle hover:text-text-bright text-xs flex items-center gap-1 font-semibold p-1"
          >
            <span>Details</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {showProgress && (
        <div className="space-y-1.5 pt-2 border-t border-white/10 text-xs">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-text-muted">
              {progress.nextTier ? `Next: ${progress.nextTier.name}` : "Max Rank Achieved"}
            </span>
            <span className="font-mono font-bold text-text-bright">
              {progress.nextTier ? `${progress.unitsNeeded} units to level up` : "1,000+ Lives Saved"}
            </span>
          </div>

          <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/10">
            <div
              className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${tier.colors.gradient}`}
              style={{ width: `${progress.progressPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
