// Donor Pass Avatar & Gender Detection utilities

export const SAMPLE_AVATARS = {
  maleDavid: "/avatars/male_passport_david.jpg",
  maleDinesh: "/avatars/male_passport_dinesh.jpg",
  femaleSarah: "/avatars/female_passport_sarah.jpg",
};

// Known female name tokens (common English, Indian & international names)
const FEMALE_NAMES = new Set([
  "sarah", "sara", "thompson", "priya", "ananya", "divya", "kavitha", "sneha",
  "pooja", "deepa", "lakshmi", "swathi", "ramya", "aarthi", "meena", "shreya",
  "sangeetha", "gayathri", "keerthi", "bhavani", "radha", "geetha", "kavya",
  "harini", "nithya", "vidya", "sunita", "rekha", "anita", "neha", "rachel",
  "emma", "olivia", "sophia", "isabella", "mia", "charlotte", "amelia", "harper",
  "evelyn", "abigail", "elizabeth", "ella", "scarlett", "victoria", "grace",
  "chloe", "camila", "penelope", "layla", "hannah", "lily", "zoe", "natalie",
  "leah", "hazel", "audrey", "claire", "anna", "maya", "naomi", "elena", "hailey",
  "autumn", "quinn", "delilah", "allison", "serenity", "valentina", "isla",
  "eliana", "madelyn", "piper", "lucia", "alyssa", "rose", "mary", "eva",
  "adeline", "vivian", "luna", "clara", "ashley", "fiona", "julia", "stephanie",
  "rebecca", "laura", "sharon", "amy", "angela", "helen", "nicole", "christine",
  "maria", "julie", "lauren", "megan", "andrea", "jennifer", "jessica", "michelle",
  "lisa", "nancy", "karen", "betty", "sandra", "donna", "carol", "ruth",
  "shirley", "brenda", "pamela", "debra", "janet", "catherine", "deborah",
  "janice", "theresa", "beverly", "tammy", "irene", "jane", "lori", "judy",
  "marilyn", "tina", "judith", "alice", "doris", "ann", "jean", "gloria",
  "cheryl", "martha", "frances", "diana", "kayla", "amber", "brittany",
  "danielle", "heather", "melissa", "kelly", "tiffany", "crystal", "erica",
  "monica", "courtney", "vanessa", "kristen", "katie", "chelsea", "alicia",
  "leslie", "jamie", "shannon", "lindsey", "whitney", "casey", "dana",
  "alisha", "kristin", "bethany", "stacy", "melanie", "holly", "bridget",
  "wendy", "heidi", "claudia", "valerie", "erika", "paula", "tara", "jill",
  "dawn", "connie", "tamara", "april", "robin", "kendra", "karla", "darlene",
  "cindy", "fatima", "aisha", "zainab", "noor", "maryam", "yasmin", "amina",
  "leila", "sultana", "parveen", "nasreen", "shabana", "farida", "salma"
]);

/**
 * Automatically determine gender based on name & explicit gender field
 */
export function determineGenderFromName(fullName: string, explicitGender?: string): "Male" | "Female" {
  if (explicitGender === "Female") return "Female";
  if (explicitGender === "Male") return "Male";

  if (!fullName || typeof fullName !== "string") return "Male";

  const lower = fullName.toLowerCase().trim();

  // Check prefix titles
  if (/^(mrs|ms|miss|smt|dr\.\s*(mrs|ms))\b/.test(lower)) {
    return "Female";
  }
  if (/^(mr|shri|master)\b/.test(lower)) {
    return "Male";
  }

  // Split into tokens
  const tokens = lower.split(/[\s,._-]+/).filter(Boolean);

  for (const token of tokens) {
    if (FEMALE_NAMES.has(token)) {
      return "Female";
    }

    // Common Indian feminine suffixes
    if (
      token.endsWith("devi") ||
      token.endsWith("kumari") ||
      token.endsWith("vathi") ||
      token.endsWith("shree") ||
      token.endsWith("priya") ||
      token.endsWith("amman")
    ) {
      return "Female";
    }
  }

  // Default to Male
  return "Male";
}

/**
 * Returns the matching passport photo URL based on user name, gender, or custom upload
 */
export function getDonorPassPhotoUrl(options: {
  fullName: string;
  explicitGender?: string;
  profilePhotoUrl?: string;
  preferredAvatarKey?: "maleDavid" | "maleDinesh" | "femaleSarah" | "auto";
}): { photoUrl: string; detectedGender: "Male" | "Female"; label: string } {
  const detectedGender = determineGenderFromName(options.fullName, options.explicitGender);

  // If user explicitly chose an avatar key
  if (options.preferredAvatarKey === "femaleSarah") {
    return { photoUrl: SAMPLE_AVATARS.femaleSarah, detectedGender: "Female", label: "Sarah J. Thompson (Female Passport)" };
  }
  if (options.preferredAvatarKey === "maleDavid") {
    return { photoUrl: SAMPLE_AVATARS.maleDavid, detectedGender: "Male", label: "David M. Chen (Male Passport)" };
  }
  if (options.preferredAvatarKey === "maleDinesh") {
    return { photoUrl: SAMPLE_AVATARS.maleDinesh, detectedGender: "Male", label: "S.S. Dinesh (Male Passport)" };
  }

  // If a custom photo URL is provided (not empty and not default SVG/placeholder)
  if (
    options.profilePhotoUrl &&
    (options.profilePhotoUrl.startsWith("http") ||
     options.profilePhotoUrl.startsWith("data:image") ||
     options.profilePhotoUrl.startsWith("blob:") ||
     options.profilePhotoUrl.startsWith("/")) &&
    !options.profilePhotoUrl.includes("ui-avatars")
  ) {
    return { photoUrl: options.profilePhotoUrl, detectedGender, label: "Custom Profile Photo" };
  }

  // Auto-detect based on name
  if (detectedGender === "Female") {
    return {
      photoUrl: SAMPLE_AVATARS.femaleSarah,
      detectedGender: "Female",
      label: "Sarah J. Thompson (Auto: Female)"
    };
  }

  // Male: if name contains Dinesh or S.S., use Dinesh photo, otherwise David M. Chen
  const lowerName = (options.fullName || "").toLowerCase();
  if (lowerName.includes("dinesh") || lowerName.includes("s.s") || lowerName.includes("kumar")) {
    return {
      photoUrl: SAMPLE_AVATARS.maleDinesh,
      detectedGender: "Male",
      label: "S.S. Dinesh (Auto: Male)"
    };
  }

  return {
    photoUrl: SAMPLE_AVATARS.maleDavid,
    detectedGender: "Male",
    label: "David M. Chen (Auto: Male)"
  };
}
