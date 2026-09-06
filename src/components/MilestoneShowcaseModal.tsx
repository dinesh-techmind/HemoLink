import React from "react";
import { X, CheckCircle, Lock, Sparkles, TrendingUp, Award, Droplet, ShieldCheck, HeartHandshake } from "lucide-react";
import { Donor } from "../types";
import {
  ORDERED_TIERS,
  getDonorSavedUnits,
  getMilestoneTier,
  getNextMilestoneProgress,
  MilestoneTier
} from "../lib/milestones";
import { MilestoneTierIcon } from "./MilestoneBadge";

interface MilestoneShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  donor?: Partial<Donor> | null;
  isMyProfile?: boolean;
}

export const MilestoneShowcaseModal: React.FC<MilestoneShowcaseModalProps> = ({
  isOpen,
  onClose,
  donor,
  isMyProfile = false
}) => {
  if (!isOpen) return null;

  const units = getDonorSavedUnits(donor);
  const currentTier = getMilestoneTier(units);
  const progress = getNextMilestoneProgress(units);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className="bg-card-dark border border-border-dark rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8 relative flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-red-950 via-card-dark to-zinc-900 p-6 border-b border-border-dark flex items-start justify-between relative">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-brand-red/20 border border-brand-red/40 flex items-center justify-center text-brand-red shadow-lg">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-brand-red bg-brand-red/10 px-2 py-0.5 rounded-full border border-brand-red/20">
                  Donor Gamification System
                </span>
                <span className="text-[10px] text-text-subtle font-mono">
                  Every Drop Counts
                </span>
              </div>
              <h2 className="text-xl font-black text-text-bright font-display mt-1">
                LifeSaver Milestone Badges
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Celebrating heroic donors across community emergency blood and platelet drives
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-surface-dark border border-border-dark text-text-muted hover:text-text-bright transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-text-bright">
          {/* Active Donor Progress Showcase */}
          <div className={`p-5 rounded-2xl border ${currentTier.colors.metallicBg} ${currentTier.colors.badgeBorder} space-y-3.5 shadow-xl`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br ${currentTier.colors.gradient}`}
                >
                  <MilestoneTierIcon tierId={currentTier.id} className="w-7 h-7 text-white drop-shadow" />
                </div>
                <div>
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider block ${currentTier.colors.badgeText}`}>
                    {donor?.fullName ? `${donor.fullName}'s Current Standing` : "Donor Standing"}
                  </span>
                  <h3 className="text-lg font-black text-text-bright font-display">
                    {currentTier.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs font-bold text-white bg-black/40 px-2 py-0.5 rounded border border-white/10">
                      {units} Saved Units / Lives Impact
                    </span>
                    <span className="text-text-subtle text-[11px]">
                      • {donor?.bloodGroup || "Blood"} Donor
                    </span>
                  </div>
                </div>
              </div>

              {progress.nextTier ? (
                <div className="text-left sm:text-right bg-black/30 p-2.5 rounded-xl border border-white/10 sm:min-w-[140px]">
                  <span className="text-[10px] uppercase font-mono text-text-subtle block">Next Rank Target</span>
                  <span className="text-xs font-extrabold text-amber-300 font-display block">
                    {progress.nextTier.name}
                  </span>
                  <span className="text-[10px] font-mono text-text-muted">
                    {progress.unitsNeeded} units needed
                  </span>
                </div>
              ) : (
                <div className="text-left sm:text-right bg-cyan-950/40 p-2.5 rounded-xl border border-cyan-500/30">
                  <span className="text-[10px] uppercase font-mono text-cyan-300 font-bold block flex items-center gap-1 justify-end">
                    <Sparkles className="w-3 h-3" /> Apex Rank
                  </span>
                  <span className="text-xs font-black text-white font-display block">
                    Diamond Legend Status
                  </span>
                </div>
              )}
            </div>

            {/* Level progress bar */}
            <div className="space-y-1.5 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text-muted">
                  {progress.nextTier
                    ? `Progress: ${units} of ${progress.nextTarget} units to ${progress.nextTier.name}`
                    : "1,000+ Units / Lives Milestone Secured"}
                </span>
                <span className="font-mono font-bold text-white">
                  {progress.progressPercent}% Complete
                </span>
              </div>
              <div className="w-full h-3 bg-black/50 rounded-full overflow-hidden p-0.5 border border-white/10">
                <div
                  className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${currentTier.colors.gradient}`}
                  style={{ width: `${progress.progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Milestone Tier Ladder (The 4 tiers + starter) */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold font-display uppercase tracking-wider text-text-bright flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-red" />
              <span>Milestone Achievement Ladder</span>
            </h4>

            <div className="grid grid-cols-1 gap-3">
              {ORDERED_TIERS.filter((t) => t.id !== "starter").map((t) => {
                const isUnlocked = units >= t.minUnits;
                const isCurrent = currentTier.id === t.id;

                return (
                  <div
                    key={t.id}
                    className={`p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden ${
                      isCurrent
                        ? `${t.colors.metallicBg} ${t.colors.badgeBorder} ring-2 ${t.colors.ringColor} shadow-xl`
                        : isUnlocked
                        ? "bg-surface-dark border-border-dark"
                        : "bg-surface-dark/40 border-border-dark/50 opacity-70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md ${
                            isUnlocked
                              ? `bg-gradient-to-br ${t.colors.gradient}`
                              : "bg-zinc-800 text-zinc-500"
                          }`}
                        >
                          <MilestoneTierIcon tierId={t.id} className="w-6 h-6" />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-sm font-extrabold font-display text-text-bright">
                              {t.name}
                            </h5>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                isUnlocked
                                  ? `${t.colors.badgeBg} ${t.colors.badgeText} border ${t.colors.badgeBorder}`
                                  : "bg-zinc-800 text-zinc-400"
                              }`}
                            >
                              {t.minUnits}+ {t.id === "diamond" ? "Lives" : "Units"}
                            </span>
                            {isCurrent && (
                              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                                ACTIVE BADGE
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                            {t.description}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center">
                        {isUnlocked ? (
                          <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Unlocked</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-zinc-500 font-mono text-[11px] bg-zinc-800/80 px-2.5 py-1 rounded-lg border border-zinc-700">
                            <Lock className="w-3.5 h-3.5" />
                            <span>{t.minUnits - units} units to go</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Perks breakdown */}
                    <div className="mt-3 pt-2.5 border-t border-border-dark/60 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {t.perks.map((perk, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[10.5px] text-text-subtle">
                          <span className={`w-1.5 h-1.5 rounded-full ${isUnlocked ? t.colors.iconColor : "bg-zinc-600"}`} />
                          <span className={isUnlocked ? "text-text-muted" : "text-zinc-500"}>{perk}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Automated Milestone Tracking Notice */}
          <div className="p-4 bg-surface-dark border border-border-dark rounded-2xl space-y-2.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <h5 className="font-bold text-xs text-text-bright font-display">
                Automated Clinical Milestone Progression
              </h5>
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed">
              Milestone tiers cannot be modified manually. Badges are strictly awarded by the system as blood units are registered through verified blood donations at certified blood banks or emergency SOS fulfillments.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="bg-[#121214] p-2.5 rounded-xl border border-[#222] text-center">
                <span className="text-[9px] font-mono text-text-subtle uppercase block">Bronze Tier</span>
                <span className="text-xs font-bold text-amber-400">50 Units</span>
                <span className="text-[9px] text-text-muted block">~5 donations</span>
              </div>
              <div className="bg-[#121214] p-2.5 rounded-xl border border-[#222] text-center">
                <span className="text-[9px] font-mono text-text-subtle uppercase block">Silver Tier</span>
                <span className="text-xs font-bold text-slate-300">100 Units</span>
                <span className="text-[9px] text-text-muted block">~10 donations</span>
              </div>
              <div className="bg-[#121214] p-2.5 rounded-xl border border-[#222] text-center">
                <span className="text-[9px] font-mono text-text-subtle uppercase block">Gold Tier</span>
                <span className="text-xs font-bold text-yellow-400">500 Units</span>
                <span className="text-[9px] text-text-muted block">~50 donations</span>
              </div>
              <div className="bg-[#121214] p-2.5 rounded-xl border border-[#222] text-center">
                <span className="text-[9px] font-mono text-text-subtle uppercase block">Diamond Legend</span>
                <span className="text-xs font-bold text-cyan-300">1,000+ Lives</span>
                <span className="text-[9px] text-text-muted block">Apex Honor</span>
              </div>
            </div>
          </div>

          {/* Blood Donation Impact Statement */}
          <div className="p-3.5 bg-brand-red/10 border border-brand-red/30 rounded-2xl flex items-center gap-3">
            <HeartHandshake className="w-5 h-5 text-brand-red shrink-0" />
            <p className="text-[11px] text-rose-200 leading-relaxed">
              <strong>Medical Fact:</strong> 1 single whole-blood donation yields red blood cells, plasma, and platelets, which can directly save up to <strong>3 emergency patient lives</strong>.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-surface-dark border-t border-border-dark flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-brand-red hover:bg-brand-red-dark text-white font-bold text-xs rounded-xl shadow cursor-pointer transition uppercase tracking-wider font-display"
          >
            Close Milestone Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
