import { Donor } from "../types";
import { getDonorSavedUnits, getMilestoneTier, MilestoneTier } from "./milestones";

export interface DonationEligibilityInfo {
  isEligible: boolean;
  daysRemaining: number;
  lastDonationDate: string | null;
  lastDonatedFormatted: string;
  nextEligibleDate: string;
  nextDateFormatted: string;
  recommendation: string;
  statusType: "cleared" | "cooldown" | "first_time";
}

export interface DonorPassVerificationResult {
  isValid: boolean;
  isOfficialFormat: boolean;
  matchedDonor: Donor | null;
  donorId: string;
  name: string;
  bloodGroup: string;
  location: string;
  status: string;
  validUntil: string;
  eligibility: DonationEligibilityInfo;
  milestone: MilestoneTier;
  savedUnits: number;
  verificationTimestamp: string;
  rawPayload: any;
  securityHash: string;
  warning?: string;
}

/**
 * Format Donor ID strictly matching the reference card: BD-2026-00125
 */
export function formatDonorId(donor: Partial<Donor>): string {
  if (!donor) return "BD-2026-00000";
  const year = donor.createdAt ? new Date(donor.createdAt).getFullYear() : 2026;
  const rawUid = donor.uid || "00000";
  const numPart = rawUid.replace(/\D/g, "");
  const suffix = (numPart || rawUid.slice(-5)).padStart(5, "0").slice(-5).toUpperCase();
  return `BD-${year}-${suffix}`;
}

/**
 * Generates the standardized QR payload string for a donor pass.
 */
export function generateDonorPassQrPayload(donor: Donor): string {
  const donorId = formatDonorId(donor);
  const location = [donor.city || "Coimbatore", donor.state || "Tamil Nadu"].filter(Boolean).join(", ");
  return JSON.stringify({
    app: "Blood Donation App",
    type: "DONOR_PASS_VERIFIED",
    donorId,
    uid: donor.uid,
    name: donor.fullName,
    bloodGroup: donor.bloodGroup,
    location,
    status: donor.isAvailable ? "AVAILABLE" : "COOLDOWN",
    donationCount: donor.donationCount || 0,
    savedUnits: getDonorSavedUnits(donor),
    lastDonationDate: donor.lastDonationDate || null,
    validUntil: "2027-12-31",
    issuedAt: donor.createdAt || new Date().toISOString()
  });
}

/**
 * Calculates WHO 56-day whole-blood cooldown eligibility.
 */
export function getDonationEligibility(lastDonationDateStr?: string | null): DonationEligibilityInfo {
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };

  if (!lastDonationDateStr || lastDonationDateStr === "Never Logged" || lastDonationDateStr === "Never") {
    return {
      isEligible: true,
      daysRemaining: 0,
      lastDonationDate: null,
      lastDonatedFormatted: "No prior donation record",
      nextEligibleDate: new Date().toISOString().split("T")[0],
      nextDateFormatted: "Cleared to Donate Immediately",
      recommendation: "Donor has no active cooldown. Cleared for medical screening and standard 450ml draw.",
      statusType: "first_time"
    };
  }

  const lastDate = new Date(lastDonationDateStr);
  if (isNaN(lastDate.getTime())) {
    return {
      isEligible: true,
      daysRemaining: 0,
      lastDonationDate: null,
      lastDonatedFormatted: String(lastDonationDateStr),
      nextEligibleDate: new Date().toISOString().split("T")[0],
      nextDateFormatted: "Cleared to Donate Immediately",
      recommendation: "Prior donation timestamp unparsed. Cleared upon physical vitals check.",
      statusType: "cleared"
    };
  }

  const COOLDOWN_DAYS = 56;
  const nextDate = new Date(lastDate.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diffMs = nextDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const lastDonatedFormatted = lastDate.toLocaleDateString("en-US", options);
  const nextDateFormatted = nextDate.toLocaleDateString("en-US", options);

  if (daysLeft <= 0) {
    return {
      isEligible: true,
      daysRemaining: 0,
      lastDonationDate: lastDonationDateStr,
      lastDonatedFormatted,
      nextEligibleDate: nextDate.toISOString().split("T")[0],
      nextDateFormatted,
      recommendation: `WHO 56-day cooldown complete (${Math.abs(daysLeft)} days past eligibility). Fully approved for blood donation.`,
      statusType: "cleared"
    };
  }

  return {
    isEligible: false,
    daysRemaining: daysLeft,
    lastDonationDate: lastDonationDateStr,
    lastDonatedFormatted,
    nextEligibleDate: nextDate.toISOString().split("T")[0],
    nextDateFormatted,
    recommendation: `In mandatory cooldown. ${daysLeft} days remaining until ${nextDateFormatted} to protect red cell regeneration.`,
    statusType: "cooldown"
  };
}

/**
 * Parses and verifies raw scanned QR code text against the clinic donors registry.
 */
export function parseAndVerifyDonorPass(
  rawScanText: string,
  donors: Donor[]
): DonorPassVerificationResult {
  const trimmed = rawScanText.trim();
  const nowStr = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  });

  let parsed: any = null;
  let isOfficialFormat = false;

  try {
    parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object") {
      isOfficialFormat = parsed.type === "DONOR_PASS_VERIFIED" || parsed.app === "Blood Donation App";
    }
  } catch {
    parsed = null;
  }

  // Find matching donor from registry
  let matched: Donor | null = null;

  if (parsed) {
    // 1. Match by UID
    if (parsed.uid) {
      matched = donors.find((d) => d.uid === parsed.uid) || null;
    }
    // 2. Match by donorId
    if (!matched && parsed.donorId) {
      matched = donors.find((d) => formatDonorId(d) === parsed.donorId) || null;
    }
    // 3. Match by name and blood group
    if (!matched && parsed.name && parsed.bloodGroup) {
      matched =
        donors.find(
          (d) =>
            d.fullName.toLowerCase().trim() === String(parsed.name).toLowerCase().trim() &&
            d.bloodGroup.toUpperCase() === String(parsed.bloodGroup).toUpperCase()
        ) || null;
    }
  }

  // If not JSON, check if trimmed string is a donorId or UID
  if (!matched) {
    // Match by formatted ID (e.g. BD-2026-00055)
    matched = donors.find((d) => formatDonorId(d).toLowerCase() === trimmed.toLowerCase()) || null;
  }
  if (!matched) {
    // Match by direct UID
    matched = donors.find((d) => d.uid.toLowerCase() === trimmed.toLowerCase()) || null;
  }
  if (!matched) {
    // Match by phone number
    matched = donors.find((d) => d.phone && d.phone.replace(/\D/g, "") === trimmed.replace(/\D/g, "")) || null;
  }

  const donorId = matched ? formatDonorId(matched) : parsed?.donorId || (trimmed.startsWith("BD-") ? trimmed : "BD-EXT-" + trimmed.slice(0, 5).toUpperCase());
  const name = matched?.fullName || parsed?.name || (trimmed.startsWith("{") ? "Unknown Scanned Donor" : trimmed);
  const bloodGroup = matched?.bloodGroup || parsed?.bloodGroup || "O+";
  const location = matched ? `${matched.city}, ${matched.state}` : parsed?.location || "Tamil Nadu, India";
  const status = matched ? (matched.isAvailable ? "AVAILABLE" : "COOLDOWN") : parsed?.status || "AVAILABLE";
  const lastDonationDate = matched ? matched.lastDonationDate : parsed?.lastDonationDate || null;
  const validUntil = parsed?.validUntil || "2027-12-31";

  const eligibility = getDonationEligibility(lastDonationDate);
  const savedUnits = matched ? getDonorSavedUnits(matched) : typeof parsed?.savedUnits === "number" ? parsed.savedUnits : 15;
  const milestone = getMilestoneTier(savedUnits);

  // Generate a mock cryptographic seal hash
  const securityHash = `HL-SEC-${donorId}-${Math.abs(
    (name + bloodGroup + donorId).split("").reduce((acc, c) => (acc << 5) - acc + c.charCodeAt(0), 0)
  ).toString(16).toUpperCase()}`;

  const isValid = Boolean(matched || (parsed && parsed.name && parsed.bloodGroup));

  return {
    isValid,
    isOfficialFormat: isOfficialFormat || Boolean(matched),
    matchedDonor: matched,
    donorId,
    name,
    bloodGroup,
    location,
    status,
    validUntil,
    eligibility,
    milestone,
    savedUnits,
    verificationTimestamp: nowStr,
    rawPayload: parsed || trimmed,
    securityHash,
    warning: !matched
      ? "Scanned pass data is valid, but donor record is not yet in the active local clinic database."
      : undefined
  };
}
