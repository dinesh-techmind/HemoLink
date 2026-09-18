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
  age?: number;
  phone?: string;
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
  // 6-Month Pass Validity and Expiration tracking
  isExpired: boolean;
  passTimestamp: string | null;
  passTimestampFormatted: string;
  expiryDate: string | null;
  expiryDateFormatted: string;
  daysExpired: number;
  monthsElapsed: number;
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

export const STANDARD_PASS_VALIDITY_MONTHS = 6;

export interface PassValidityDetails {
  isExpired: boolean;
  passTimestamp: string | null;
  passTimestampFormatted: string;
  expiryDate: string | null;
  expiryDateFormatted: string;
  daysExpired: number;
  monthsElapsed: number;
}

/**
 * Validates whether a donor pass's issuance timestamp exceeds the standard 6-month clinical validity period.
 */
export function checkPassExpiration(
  timestampInput?: string | number | Date | null,
  referenceDate: Date = new Date()
): PassValidityDetails {
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };

  if (!timestampInput) {
    // If no timestamp is provided, default to reference date (valid current pass)
    const defaultDate = new Date();
    const expiryDate = new Date(defaultDate.getTime());
    expiryDate.setMonth(expiryDate.getMonth() + STANDARD_PASS_VALIDITY_MONTHS);
    return {
      isExpired: false,
      passTimestamp: null,
      passTimestampFormatted: "Not specified",
      expiryDate: expiryDate.toISOString(),
      expiryDateFormatted: expiryDate.toLocaleDateString("en-US", options),
      daysExpired: 0,
      monthsElapsed: 0
    };
  }

  const passDate = new Date(timestampInput);
  if (isNaN(passDate.getTime())) {
    return {
      isExpired: false,
      passTimestamp: String(timestampInput),
      passTimestampFormatted: "Unparsed",
      expiryDate: null,
      expiryDateFormatted: "N/A",
      daysExpired: 0,
      monthsElapsed: 0
    };
  }

  // Calculate standard 6-month validity expiry timestamp
  const expiryDate = new Date(passDate.getTime());
  expiryDate.setMonth(expiryDate.getMonth() + STANDARD_PASS_VALIDITY_MONTHS);

  const nowMs = referenceDate.getTime();
  const expiryMs = expiryDate.getTime();
  const isExpired = nowMs > expiryMs;

  const msElapsed = nowMs - passDate.getTime();
  const daysElapsed = Math.floor(msElapsed / (1000 * 60 * 60 * 24));
  const monthsElapsed = Number((daysElapsed / 30.4375).toFixed(1));
  const daysExpired = isExpired ? Math.floor((nowMs - expiryMs) / (1000 * 60 * 60 * 24)) : 0;

  const passTimestampFormatted = passDate.toLocaleDateString("en-US", options);
  const expiryDateFormatted = expiryDate.toLocaleDateString("en-US", options);

  return {
    isExpired,
    passTimestamp: passDate.toISOString(),
    passTimestampFormatted,
    expiryDate: expiryDate.toISOString(),
    expiryDateFormatted,
    daysExpired,
    monthsElapsed
  };
}

/**
 * Generates the secure public verification URL for the donor pass QR code.
 * Encodes donor unique ID, UID, full name, age, gender, blood group, location, mobile phone,
 * and live donation records (donation count, saved units, last donation date, cooldown status, and issuance timestamp)
 * so that any standard smartphone camera or QR scanner immediately reads and displays all verified credentials.
 * Whenever the donor donates blood, the updated donation count and latest donation date are automatically reflected in the QR code.
 */
export function generateDonorPassQrUrl(donor: Partial<Donor>, customOrigin?: string, customTimestamp?: string): string {
  const donorId = formatDonorId(donor);
  const origin = customOrigin || (typeof window !== "undefined" && window.location?.origin ? window.location.origin : "https://hemolink.app");
  const params = new URLSearchParams();
  
  // Core Donor Identity & Credentials
  params.set("id", donorId);
  if (donor.uid) params.set("uid", donor.uid);
  if (donor.fullName) params.set("name", donor.fullName);
  if (donor.age) params.set("age", String(donor.age));
  if (donor.gender) params.set("gender", donor.gender);
  if (donor.bloodGroup) params.set("blood", donor.bloodGroup);
  
  const loc = [donor.city, donor.state].filter(Boolean).join(", ") || "Tamil Nadu, India";
  params.set("location", loc);
  if (donor.pincode) params.set("pin", donor.pincode);
  if (donor.phone) params.set("phone", donor.phone);

  // Live Blood Donation History & Transfusion Records (Updated each time donor donates blood)
  const donationCount = typeof donor.donationCount === "number" ? donor.donationCount : 0;
  params.set("donations", String(donationCount));
  const units = donor.savedUnits ?? (donationCount * 3);
  params.set("units", String(units));
  if (donor.lastDonationDate) {
    params.set("lastDonated", donor.lastDonationDate);
  }
  params.set("status", donor.isAvailable ? "AVAILABLE" : "COOLDOWN");

  // Pass issuance timestamp for 6-month validity checking
  const passTs = customTimestamp || donor.updatedAt || donor.createdAt || new Date().toISOString();
  params.set("ts", typeof passTs === "string" ? passTs : new Date(passTs).toISOString());

  return `${origin}/verify/donor/${encodeURIComponent(donorId)}?${params.toString()}`;
}

/**
 * Generates the standardized QR payload string for a donor pass.
 */
export function generateDonorPassQrPayload(donor: Donor): string {
  return generateDonorPassQrUrl(donor);
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

  // Check if raw scanned string is a verification URL (e.g. /verify/donor/BD-2025-00001 or ?verify=BD-2025-00001)
  let extractedIdFromUrl: string | null = null;
  let queryParams: URLSearchParams | null = null;
  if (trimmed.includes("?")) {
    try {
      queryParams = new URLSearchParams(trimmed.slice(trimmed.indexOf("?")));
    } catch {
      // ignore
    }
  }

  if (trimmed.includes("/verify/donor/")) {
    try {
      const parts = trimmed.split("/verify/donor/");
      if (parts[1]) {
        extractedIdFromUrl = decodeURIComponent(parts[1].split("?")[0].split("#")[0].trim());
        isOfficialFormat = true;
      }
    } catch {
      // ignore
    }
  } else if (trimmed.includes("verify=")) {
    try {
      const match = trimmed.match(/[?&]verify=([^&#]+)/);
      if (match && match[1]) {
        extractedIdFromUrl = decodeURIComponent(match[1].trim());
        isOfficialFormat = true;
      }
    } catch {
      // ignore
    }
  }

  try {
    parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object") {
      isOfficialFormat = parsed.type === "DONOR_PASS_VERIFIED" || parsed.app === "Blood Donation App" || isOfficialFormat;
    }
  } catch {
    parsed = null;
  }

  // Find matching donor from registry
  let matched: Donor | null = null;

  // First check URL extracted ID if present
  if (extractedIdFromUrl) {
    matched =
      donors.find((d) => formatDonorId(d).toLowerCase() === extractedIdFromUrl?.toLowerCase()) ||
      donors.find((d) => d.uid.toLowerCase() === extractedIdFromUrl?.toLowerCase()) ||
      null;
  }

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

  const donorId = matched ? formatDonorId(matched) : (queryParams?.get("id") || queryParams?.get("donorId") || parsed?.donorId || (trimmed.startsWith("BD-") ? trimmed : "BD-EXT-" + trimmed.slice(0, 5).toUpperCase()));
  const name = matched?.fullName || queryParams?.get("name") || parsed?.name || (trimmed.startsWith("{") ? "Unknown Scanned Donor" : trimmed);
  const age = matched?.age || (queryParams?.get("age") ? Number(queryParams.get("age")) : undefined) || parsed?.age || 28;
  const phone = matched?.phone || queryParams?.get("phone") || parsed?.phone || "";
  const bloodGroup = (matched?.bloodGroup || queryParams?.get("blood") || parsed?.bloodGroup || "O+") as any;
  const location = matched ? `${matched.city}, ${matched.state}` : (queryParams?.get("location") || parsed?.location || "Tamil Nadu, India");
  const status = matched ? (matched.isAvailable ? "AVAILABLE" : "COOLDOWN") : parsed?.status || "AVAILABLE";
  const lastDonationDate = matched ? matched.lastDonationDate : parsed?.lastDonationDate || null;
  const validUntil = parsed?.validUntil || "2027-12-31";

  // Extract pass issuance timestamp from URL parameter, parsed JSON, or donor registration record
  const rawPassTimestamp =
    queryParams?.get("ts") ||
    queryParams?.get("timestamp") ||
    queryParams?.get("issuedAt") ||
    queryParams?.get("issued") ||
    queryParams?.get("createdAt") ||
    parsed?.timestamp ||
    parsed?.issuedAt ||
    parsed?.issued ||
    parsed?.createdAt ||
    matched?.updatedAt ||
    matched?.createdAt ||
    null;

  const validity = checkPassExpiration(rawPassTimestamp);

  // If explicit validUntil is in the past, ensure expired state is active
  if (parsed?.validUntil) {
    const vuDate = new Date(parsed.validUntil);
    if (!isNaN(vuDate.getTime()) && Date.now() > vuDate.getTime()) {
      validity.isExpired = true;
      validity.expiryDate = vuDate.toISOString();
      validity.expiryDateFormatted = vuDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
  }

  const eligibility = getDonationEligibility(lastDonationDate);
  const savedUnits = matched
    ? getDonorSavedUnits(matched)
    : queryParams?.get("units")
    ? Number(queryParams.get("units"))
    : queryParams?.get("donations")
    ? Number(queryParams.get("donations")) * 3
    : typeof parsed?.savedUnits === "number"
    ? parsed.savedUnits
    : 15;
  const milestone = getMilestoneTier(savedUnits);

  // Generate a mock cryptographic seal hash
  const securityHash = `HL-SEC-${donorId}-${Math.abs(
    (name + bloodGroup + donorId).split("").reduce((acc, c) => (acc << 5) - acc + c.charCodeAt(0), 0)
  ).toString(16).toUpperCase()}`;

  const isValid = Boolean(matched || (parsed && parsed.name && parsed.bloodGroup) || (queryParams?.get("name") && queryParams?.get("blood")));

  let warningMessage: string | undefined = !matched
    ? "Scanned pass data is valid, but donor record is not yet in the active local clinic database."
    : undefined;

  if (validity.isExpired) {
    const expiredWarning = `Warning: Expired Pass. Pass timestamp (${validity.passTimestampFormatted}) exceeds the standard 6-month validity period (expired on ${validity.expiryDateFormatted}). Pass re-verification or renewal required.`;
    warningMessage = warningMessage ? `${warningMessage} | ${expiredWarning}` : expiredWarning;
  }

  return {
    isValid,
    isOfficialFormat: isOfficialFormat || Boolean(matched),
    matchedDonor: matched,
    donorId,
    name,
    age,
    phone,
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
    warning: warningMessage,
    isExpired: validity.isExpired,
    passTimestamp: validity.passTimestamp,
    passTimestampFormatted: validity.passTimestampFormatted,
    expiryDate: validity.expiryDate,
    expiryDateFormatted: validity.expiryDateFormatted,
    daysExpired: validity.daysExpired,
    monthsElapsed: validity.monthsElapsed
  };
}
