import { BloodGroup, Donor, EmergencyRequest, RankedDonorMatch, MatchingFlowStage } from "../types";
import { calculateDistance } from "./store";

/**
 * Standard Clinical Red Blood Cell Compatibility Matrix
 * Key: Donor Blood Group -> Array of Recipient Blood Groups who can safely receive it
 */
export const BLOOD_COMPATIBILITY_MAP: Record<BloodGroup, BloodGroup[]> = {
  "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"], // Universal RBC Donor
  "O+": ["O+", "A+", "B+", "AB+"],
  "A-": ["A-", "A+", "AB-", "AB+"],
  "A+": ["A+", "AB+"],
  "B-": ["B-", "B+", "AB-", "AB+"],
  "B+": ["B+", "AB+"],
  "AB-": ["AB-", "AB+"],
  "AB+": ["AB+"] // Universal Recipient, only donates to AB+
};

/**
 * Checks if a donor's blood group is clinically compatible with the recipient's required blood group
 */
export function checkBloodCompatibility(donorGroup: BloodGroup, neededGroup: BloodGroup): {
  compatible: boolean;
  isExact: boolean;
  label: "Exact Match" | "Compatible Group" | "Incompatible";
} {
  if (donorGroup === neededGroup) {
    return { compatible: true, isExact: true, label: "Exact Match" };
  }
  const compatibleRecipients = BLOOD_COMPATIBILITY_MAP[donorGroup] || [];
  if (compatibleRecipients.includes(neededGroup)) {
    return { compatible: true, isExact: false, label: "Compatible Group" };
  }
  return { compatible: false, isExact: false, label: "Incompatible" };
}

/**
 * Calculates days elapsed since last donation date (WHO safe interval is 56 days / 8 weeks for whole blood)
 */
export function checkDonorEligibility(lastDonationDate: string | null): {
  isEligible: boolean;
  daysSinceLastDonation: number | null;
  cooldownDaysRemaining: number;
  reason: string;
} {
  if (!lastDonationDate) {
    return {
      isEligible: true,
      daysSinceLastDonation: null,
      cooldownDaysRemaining: 0,
      reason: "No prior donation on record — fully eligible for whole blood donation"
    };
  }

  const lastDate = new Date(lastDonationDate);
  const now = new Date();
  const diffTime = now.getTime() - lastDate.getTime();
  const daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const WHO_COOLDOWN_DAYS = 56;

  if (daysElapsed >= WHO_COOLDOWN_DAYS) {
    return {
      isEligible: true,
      daysSinceLastDonation: daysElapsed,
      cooldownDaysRemaining: 0,
      reason: `Cleared WHO 56-day cooldown interval (${daysElapsed} days since last donation)`
    };
  } else {
    const remaining = Math.max(1, WHO_COOLDOWN_DAYS - daysElapsed);
    return {
      isEligible: false,
      daysSinceLastDonation: daysElapsed,
      cooldownDaysRemaining: remaining,
      reason: `In medical cooldown: ${remaining} day(s) remaining for WHO safe interval`
    };
  }
}

/**
 * Stage 1 — Algorithm:
 * Evaluates and ranks all potential donors in the database against an Emergency Request.
 * Uses a weighted multi-factor scoring function:
 * - Blood Compatibility: 45% (Exact = 45pts, Compatible = 38pts, Incompatible = 0pts)
 * - Proximity / Distance: 30% (<5km = 30pts, <15km = 24pts, <30km = 18pts, <50km = 10pts, >50km = 4pts)
 * - Availability & Safe Interval: 15% (Online = 10pts, Eligible/No Cooldown = 5pts)
 * - Track Record / Reliability: 10% (>5 donations = 10pts, 1-5 donations = 7pts, 0 donations = 4pts)
 */
export function rankDonorsForEmergency(
  request: EmergencyRequest,
  donors: Donor[],
  options: { includeIncompatible?: boolean } = { includeIncompatible: false }
): RankedDonorMatch[] {
  const reqLoc = request.location || { lat: 13.0827, lng: 80.2707 };

  const evaluated: RankedDonorMatch[] = donors.map((donor) => {
    // 1. Blood Compatibility
    const compat = checkBloodCompatibility(donor.bloodGroup, request.bloodGroupNeeded);
    let bloodScore = 0;
    if (compat.isExact) {
      bloodScore = 45;
    } else if (compat.compatible) {
      bloodScore = 38;
    } else {
      bloodScore = 0;
    }

    // 2. Distance from Hospital
    const dLoc = donor.location || { lat: 13.0827, lng: 80.2707 };
    const distanceKm = Math.round(calculateDistance(reqLoc.lat, reqLoc.lng, dLoc.lat, dLoc.lng) * 10) / 10;
    let distanceScore = 4;
    if (distanceKm <= 5) {
      distanceScore = 30;
    } else if (distanceKm <= 15) {
      distanceScore = 24;
    } else if (distanceKm <= 30) {
      distanceScore = 18;
    } else if (distanceKm <= 50) {
      distanceScore = 10;
    } else {
      distanceScore = 4;
    }

    // 3. Availability & Cooldown Eligibility
    const eligibility = checkDonorEligibility(donor.lastDonationDate);
    let availabilityScore = 0;
    if (donor.isAvailable) {
      availabilityScore += 10;
    }
    if (eligibility.isEligible) {
      availabilityScore += 5;
    }

    // 4. Experience & Reliability
    const count = donor.donationCount || 0;
    let reliabilityScore = 4;
    if (count > 5) {
      reliabilityScore = 10;
    } else if (count >= 1) {
      reliabilityScore = 7;
    }

    // Composite Score (0 - 100)
    const rawScore = compat.compatible
      ? bloodScore + distanceScore + availabilityScore + reliabilityScore
      : 0;
    const matchScore = Math.min(100, Math.max(0, Math.round(rawScore)));

    // Badges
    const matchBadges: string[] = [];
    if (compat.isExact) {
      matchBadges.push("Exact Blood Match");
    } else if (compat.compatible) {
      matchBadges.push(`Universal/Compatible (${donor.bloodGroup})`);
    }

    if (distanceKm <= 5) {
      matchBadges.push(`Immediate Vicinity (${distanceKm} km)`);
    } else if (distanceKm <= 15) {
      matchBadges.push(`Nearby (${distanceKm} km)`);
    }

    if (donor.isAvailable) {
      matchBadges.push("Available Online");
    }
    if (eligibility.isEligible) {
      matchBadges.push("Cleared Cooldown");
    } else {
      matchBadges.push(`Cooldown (${eligibility.cooldownDaysRemaining}d left)`);
    }

    if (count >= 5) {
      matchBadges.push(`Star Donor (${count} saves)`);
    }

    return {
      donor,
      rank: 0, // Assigned after sorting
      matchScore,
      compatibility: compat,
      distanceKm,
      eligibility,
      scoringBreakdown: {
        bloodScore,
        distanceScore,
        availabilityScore,
        reliabilityScore
      },
      matchBadges
    };
  });

  // Filter if not including incompatible donors
  const filtered = options.includeIncompatible
    ? evaluated
    : evaluated.filter((m) => m.compatibility.compatible);

  // Sort by match score descending, then distance ascending
  filtered.sort((a, b) => {
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    return a.distanceKm - b.distanceKm;
  });

  // Assign ranks
  filtered.forEach((m, idx) => {
    m.rank = idx + 1;
  });

  return filtered;
}

/**
 * Visual descriptions and metadata for each stage in the 8-step Smart Matching flow
 */
export const FLOW_STAGES: Array<{
  stage: MatchingFlowStage;
  number: number;
  title: string;
  shortDesc: string;
  category: "Request" | "Algorithm" | "Review" | "Action" | "Completion";
}> = [
  {
    stage: "request_submitted",
    number: 1,
    title: "Emergency Request",
    shortDesc: "Requisition logged with clinical blood specifications & hospital location",
    category: "Request"
  },
  {
    stage: "smart_matching",
    number: 2,
    title: "Smart Matching",
    shortDesc: "Stage 1 Algorithm computes compatibility, proximity & safe intervals",
    category: "Algorithm"
  },
  {
    stage: "ranked_donors",
    number: 3,
    title: "Ranked Donors",
    shortDesc: "Top-matching donors ordered by composite medical score",
    category: "Algorithm"
  },
  {
    stage: "admin_review",
    number: 4,
    title: "Admin Review",
    shortDesc: "Stage 2 Human Confirmation: Admin/requester evaluates & selects candidates",
    category: "Review"
  },
  {
    stage: "notify_donors",
    number: 5,
    title: "Notify Donors",
    shortDesc: "Targeted cellular SMS & in-app alerts dispatched only to chosen donors",
    category: "Action"
  },
  {
    stage: "donor_accepted",
    number: 6,
    title: "Donor Accepts",
    shortDesc: "Verified volunteer responds, unlocks phone line & commits to donate",
    category: "Action"
  },
  {
    stage: "donation_confirmed",
    number: 7,
    title: "Donation Confirmed",
    shortDesc: "Clinical verification recorded; cooldown restarted & save units credited",
    category: "Completion"
  },
  {
    stage: "request_fulfilled",
    number: 8,
    title: "Request Fulfilled",
    shortDesc: "Crisis resolved successfully; archived in permanent emergency audit log",
    category: "Completion"
  }
];

export function determineCurrentFlowStage(req: EmergencyRequest): MatchingFlowStage {
  if (req.status === "Fulfilled") return "request_fulfilled";
  if (req.confirmedDonationAt) return "donation_confirmed";
  if (req.acceptedDonorId || (req.respondedDonors && req.respondedDonors.length > 0)) {
    return "donor_accepted";
  }
  if (req.notifiedDonors && req.notifiedDonors.length > 0) {
    return "notify_donors";
  }
  if (req.selectedDonors && req.selectedDonors.length > 0) {
    return "admin_review";
  }
  return "smart_matching";
}
