import { Donor } from "../types";

export type MilestoneTierId = "starter" | "bronze" | "silver" | "gold" | "diamond";

export interface MilestoneTier {
  id: MilestoneTierId;
  name: string;
  rankTitle: string;
  minUnits: number;
  badgeLabel: string;
  shortLabel: string;
  description: string;
  perks: string[];
  colors: {
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    iconColor: string;
    ringColor: string;
    glowColor: string;
    gradient: string;
    metallicBg: string;
    passStampBorder: string;
    passStampText: string;
    passStampBg: string;
  };
}

export const MILESTONE_TIERS: Record<MilestoneTierId, MilestoneTier> = {
  diamond: {
    id: "diamond",
    name: "Diamond Legend",
    rankTitle: "Legendary Lifesaver",
    minUnits: 1000,
    badgeLabel: "Diamond • 1000+ Lives",
    shortLabel: "Diamond",
    description: "Transcendent humanitarian dedication: 1,000+ lives protected through consistent blood donations.",
    perks: [
      "Certified Diamond Legend on Digital Identity Pass",
      "Priority VIP notification for rare emergency matches",
      "National Blood Council Gold Honour Roll nomination",
      "Universal life-saver tribute crest"
    ],
    colors: {
      badgeBg: "bg-cyan-500/15",
      badgeBorder: "border-cyan-400/60",
      badgeText: "text-cyan-200",
      iconColor: "text-cyan-300",
      ringColor: "ring-cyan-400",
      glowColor: "rgba(6, 182, 212, 0.4)",
      gradient: "from-cyan-400 via-sky-300 to-blue-500",
      metallicBg: "bg-gradient-to-r from-cyan-950 via-[#0a2533] to-sky-950",
      passStampBorder: "border-cyan-600",
      passStampText: "text-cyan-800",
      passStampBg: "bg-cyan-50"
    }
  },
  gold: {
    id: "gold",
    name: "Gold Champion",
    rankTitle: "Master Champion",
    minUnits: 500,
    badgeLabel: "Gold • 500+ Units",
    shortLabel: "Gold",
    description: "Exceptional life champion who has provided over 500 units of life-sustaining whole blood and platelets.",
    perks: [
      "Gold Star verified certification on Donor Identity Pass",
      "Direct rapid-response badge on regional search feeds",
      "Commemorative state donor registry honours",
      "Exempt from clinic queuing at affiliated blood banks"
    ],
    colors: {
      badgeBg: "bg-amber-500/15",
      badgeBorder: "border-amber-400/60",
      badgeText: "text-amber-200",
      iconColor: "text-amber-300",
      ringColor: "ring-amber-400",
      glowColor: "rgba(245, 158, 11, 0.35)",
      gradient: "from-amber-300 via-yellow-400 to-amber-500",
      metallicBg: "bg-gradient-to-r from-amber-950 via-[#2d2208] to-yellow-950",
      passStampBorder: "border-amber-600",
      passStampText: "text-amber-800",
      passStampBg: "bg-amber-50"
    }
  },
  silver: {
    id: "silver",
    name: "Silver Guardian",
    rankTitle: "Senior Guardian",
    minUnits: 100,
    badgeLabel: "Silver • 100+ Units",
    shortLabel: "Silver",
    description: "Steadfast guardian with 100+ blood units donated, supporting dozens of emergency trauma cases.",
    perks: [
      "Silver Guardian shield emblem on Donor Identity Pass",
      "Special acknowledgement badge on community directory",
      "Access to priority donor calendar bookings"
    ],
    colors: {
      badgeBg: "bg-slate-300/15",
      badgeBorder: "border-slate-300/50",
      badgeText: "text-slate-100",
      iconColor: "text-slate-200",
      ringColor: "ring-slate-300",
      glowColor: "rgba(203, 213, 225, 0.3)",
      gradient: "from-slate-200 via-gray-300 to-zinc-400",
      metallicBg: "bg-gradient-to-r from-slate-900 via-[#1c2128] to-zinc-900",
      passStampBorder: "border-slate-500",
      passStampText: "text-slate-700",
      passStampBg: "bg-slate-50"
    }
  },
  bronze: {
    id: "bronze",
    name: "Bronze Lifesaver",
    rankTitle: "Verified Lifesaver",
    minUnits: 50,
    badgeLabel: "Bronze • 50+ Units",
    shortLabel: "Bronze",
    description: "Recognized lifesaver achieving the landmark 50+ units milestone. Every unit contributes to emergency survival.",
    perks: [
      "Official Bronze Lifesaver medal badge on profile",
      "Verified donor status across emergency dispatchers",
      "Community recognition on hospital intake systems"
    ],
    colors: {
      badgeBg: "bg-amber-900/25",
      badgeBorder: "border-amber-700/60",
      badgeText: "text-amber-300",
      iconColor: "text-amber-400",
      ringColor: "ring-amber-600",
      glowColor: "rgba(180, 83, 9, 0.3)",
      gradient: "from-amber-600 via-yellow-700 to-amber-800",
      metallicBg: "bg-gradient-to-r from-[#29160a] via-[#3d2010] to-[#29160a]",
      passStampBorder: "border-amber-700",
      passStampText: "text-amber-900",
      passStampBg: "bg-orange-50"
    }
  },
  starter: {
    id: "starter",
    name: "Rising Hero",
    rankTitle: "Rising Lifesaver",
    minUnits: 0,
    badgeLabel: "Rising • First Steps",
    shortLabel: "Rising",
    description: "Passionate volunteer on their journey to achieving the landmark Bronze milestone.",
    perks: [
      "Verified donor profile status",
      "Trackable impact meter toward Bronze milestone (50 units)"
    ],
    colors: {
      badgeBg: "bg-rose-500/10",
      badgeBorder: "border-rose-500/30",
      badgeText: "text-rose-300",
      iconColor: "text-rose-400",
      ringColor: "ring-rose-500",
      glowColor: "rgba(225, 29, 72, 0.2)",
      gradient: "from-rose-500 to-red-600",
      metallicBg: "bg-gradient-to-r from-rose-950/40 via-red-950/30 to-zinc-900",
      passStampBorder: "border-rose-400",
      passStampText: "text-rose-800",
      passStampBg: "bg-rose-50"
    }
  }
};

export const ORDERED_TIERS: MilestoneTier[] = [
  MILESTONE_TIERS.starter,
  MILESTONE_TIERS.bronze,
  MILESTONE_TIERS.silver,
  MILESTONE_TIERS.gold,
  MILESTONE_TIERS.diamond
];

/**
 * Derives total units / lives saved from donor record.
 * Uses explicit savedUnits if set, otherwise calculates from donationCount (each donation ~10-15 units of impact).
 */
export function getDonorSavedUnits(donor: Partial<Donor> | null | undefined): number {
  if (!donor) return 0;
  if (typeof donor.savedUnits === "number" && !isNaN(donor.savedUnits)) {
    return Math.max(0, donor.savedUnits);
  }
  // Default fallback derived from donation sessions
  const count = donor.donationCount || 0;
  return Math.max(0, count * 10);
}

/**
 * Returns active milestone tier based on units saved.
 */
export function getMilestoneTier(savedUnits: number): MilestoneTier {
  if (savedUnits >= 1000) return MILESTONE_TIERS.diamond;
  if (savedUnits >= 500) return MILESTONE_TIERS.gold;
  if (savedUnits >= 100) return MILESTONE_TIERS.silver;
  if (savedUnits >= 50) return MILESTONE_TIERS.bronze;
  return MILESTONE_TIERS.starter;
}

/**
 * Computes gamified progression towards next milestone tier.
 */
export function getNextMilestoneProgress(savedUnits: number): {
  currentTier: MilestoneTier;
  nextTier: MilestoneTier | null;
  progressPercent: number;
  unitsNeeded: number;
  nextTarget: number;
  currentTierBase: number;
} {
  const currentTier = getMilestoneTier(savedUnits);

  let nextTier: MilestoneTier | null = null;
  if (currentTier.id === "starter") nextTier = MILESTONE_TIERS.bronze;
  else if (currentTier.id === "bronze") nextTier = MILESTONE_TIERS.silver;
  else if (currentTier.id === "silver") nextTier = MILESTONE_TIERS.gold;
  else if (currentTier.id === "gold") nextTier = MILESTONE_TIERS.diamond;
  else nextTier = null; // Already max tier (Diamond)

  if (!nextTier) {
    return {
      currentTier,
      nextTier: null,
      progressPercent: 100,
      unitsNeeded: 0,
      nextTarget: 1000,
      currentTierBase: 1000
    };
  }

  const currentTierBase = currentTier.minUnits;
  const nextTarget = nextTier.minUnits;
  const span = nextTarget - currentTierBase;
  const progressWithinTier = Math.max(0, savedUnits - currentTierBase);
  const progressPercent = Math.min(100, Math.round((progressWithinTier / span) * 100));
  const unitsNeeded = Math.max(0, nextTarget - savedUnits);

  return {
    currentTier,
    nextTier,
    progressPercent,
    unitsNeeded,
    nextTarget,
    currentTierBase
  };
}
