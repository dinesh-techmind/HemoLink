import React, { useState, useMemo } from "react";
import { AppUser, Donor, BloodGroup } from "../types";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Heart,
  Droplet,
  ShieldCheck,
  Calendar,
  Activity,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Info,
  Scale,
  UserCheck,
  RefreshCw,
  Search,
  MapPin,
  ChevronDown,
  ChevronUp,
  FileText,
  Award,
  Zap,
  Check,
  X
} from "lucide-react";

interface BloodDonorEligibilityProps {
  currentUser: AppUser | null;
  myDonorProfile?: Donor | null;
  onNavigateToTab: (tab: "search" | "emergency" | "maps" | "profile" | "chats" | "admin" | "eligibility" | "calendar") => void;
  onOpenPassModal?: (donor: Donor) => void;
}

type DonationType = "whole_blood" | "platelets" | "plasma" | "double_red";

interface ScreeningAnswers {
  age: number;
  weight: number;
  gender: "Male" | "Female" | "Other";
  donationType: DonationType;
  lastDonationDate: string;
  feelingWellToday: boolean;
  healthyHemoglobin: boolean | "unsure";
  pregnantOrRecentBirth: boolean;
  recentTattooOrPiercing: boolean;
  recentAntibioticsOrAspirin: boolean;
  recentSurgeryOrDental: boolean;
  recentAlcohol24h: boolean;
  recentLiveVaccineOrMalariaTravel: boolean;
  chronicHeartOrKidneyDisease: boolean;
}

const DONATION_TYPE_INFO: Record<
  DonationType,
  { label: string; cooldownDays: number; description: string; duration: string; frequency: string }
> = {
  whole_blood: {
    label: "Whole Blood",
    cooldownDays: 56,
    description: "The most common donation. Separated into red cells, plasma, and platelets.",
    duration: "45–60 mins (10 min draw)",
    frequency: "Every 56 days (8 weeks)"
  },
  platelets: {
    label: "Platelets (Apheresis)",
    cooldownDays: 7,
    description: "Vital for cancer patients, trauma surgeries, and organ transplants.",
    duration: "90–120 mins",
    frequency: "Every 7 days (up to 24 times/year)"
  },
  plasma: {
    label: "Plasma",
    cooldownDays: 28,
    description: "Used for trauma, burn victims, severe liver damage, and clotting disorders.",
    duration: "60–90 mins",
    frequency: "Every 28 days (up to 12 times/year)"
  },
  double_red: {
    label: "Double Red Blood Cells",
    cooldownDays: 112,
    description: "Collects twice the amount of red blood cells using automated apheresis.",
    duration: "75–90 mins",
    frequency: "Every 112 days (16 weeks)"
  }
};

const FAQS = [
  {
    category: "General Eligibility",
    q: "How often can I safely donate blood?",
    a: "For whole blood donations, healthy adults must wait at least 56 days (8 weeks) between donations. For platelets (apheresis), you can donate every 7 days (up to 24 times/year). For plasma, the interval is 28 days."
  },
  {
    category: "Health & Medications",
    q: "Can I donate if I have high blood pressure or diabetes?",
    a: "Yes, provided your blood pressure is well-controlled (systolic under 180 and diastolic under 100) and your diabetes is managed with diet or oral medication/insulin, without diabetic complications."
  },
  {
    category: "Health & Medications",
    q: "Can I donate if I am taking over-the-counter medications?",
    a: "Most common painkillers like paracetamol/ibuprofen are fine for whole blood donation. However, if you are donating platelets, you should avoid aspirin and anti-platelet medications for at least 48 hours beforehand."
  },
  {
    category: "Lifestyle & Tattoos",
    q: "How long after getting a tattoo or body piercing can I donate?",
    a: "If your tattoo or piercing was done in a state-regulated, sterile facility with single-use needles, the standard deferral is 3 to 6 months depending on local health authority guidelines. If done informally, a 6-month deferral applies."
  },
  {
    category: "Women's Health",
    q: "Can women donate blood during their menstrual cycle or while pregnant?",
    a: "During menstruation, you can donate as long as you feel well and your hemoglobin levels meet the minimum threshold (≥12.5 g/dL). Blood donation is not permitted during pregnancy and for 6 months post-delivery."
  },
  {
    category: "Travel & Vaccines",
    q: "Does receiving a COVID-19 or Flu vaccine defer me from donating?",
    a: "Inactivated or mRNA vaccines (like standard Flu or COVID mRNA vaccines) have no deferral period if you are symptom-free. Live attenuated vaccines (such as MMR, Yellow Fever, or Chickenpox) require a 2 to 4-week wait."
  }
];

const MYTH_BUSTERS = [
  {
    myth: "Donating blood makes you physically weak and lowers immunity.",
    fact: "Your body replenishes plasma volume within 24–48 hours and red blood cells within 4–6 weeks. Normal daily activities can resume the same day after adequate hydration."
  },
  {
    myth: "You can contract infections or diseases from donating blood.",
    fact: "All blood collection equipment, needles, and bags are 100% sterile, single-use, and disposed of immediately in biomedical biohazard bins. You cannot catch infections."
  },
  {
    myth: "Vegetarians and vegans cannot donate due to low iron.",
    fact: "Anyone with a hemoglobin count ≥12.5 g/dL (women) or ≥13.0 g/dL (men) is eligible. Plant-based iron sources (spinach, lentils, beans, fortified cereals) easily maintain sufficient levels."
  },
  {
    myth: "Blood donation is painful and takes a long time.",
    fact: "The actual blood draw takes only 8–10 minutes with a minor pinch during needle insertion. The rest of the visit includes screening and enjoying post-donation refreshments."
  }
];

export default function BloodDonorEligibility({
  currentUser,
  myDonorProfile,
  onNavigateToTab,
  onOpenPassModal
}: BloodDonorEligibilityProps) {
  // Navigation sub-tab within the eligibility module
  const [activeSubTab, setActiveSubTab] = useState<"screener" | "cooldown" | "guidelines" | "compatibility" | "preparation">("screener");

  // Screening form state
  const [answers, setAnswers] = useState<ScreeningAnswers>({
    age: myDonorProfile?.age || 26,
    weight: 65,
    gender: (myDonorProfile?.gender as "Male" | "Female" | "Other") || "Male",
    donationType: "whole_blood",
    lastDonationDate: myDonorProfile?.lastDonationDate && myDonorProfile.lastDonationDate !== "Never Logged"
      ? myDonorProfile.lastDonationDate
      : "",
    feelingWellToday: true,
    healthyHemoglobin: true,
    pregnantOrRecentBirth: false,
    recentTattooOrPiercing: false,
    recentAntibioticsOrAspirin: false,
    recentSurgeryOrDental: false,
    recentAlcohol24h: false,
    recentLiveVaccineOrMalariaTravel: false,
    chronicHeartOrKidneyDisease: false
  });

  // Search filter for FAQs
  const [faqSearch, setFaqSearch] = useState<string>("");
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(0);

  // Selected Blood Group for live compatibility inspector
  const [selectedGroup, setSelectedGroup] = useState<BloodGroup>(myDonorProfile?.bloodGroup || "O+");

  // Cooldown custom date input
  const [customLastDate, setCustomLastDate] = useState<string>(
    myDonorProfile?.lastDonationDate && myDonorProfile.lastDonationDate !== "Never Logged"
      ? myDonorProfile.lastDonationDate
      : ""
  );
  const [customDonationType, setCustomDonationType] = useState<DonationType>("whole_blood");

  // Evaluated eligibility result
  const screeningResult = useMemo(() => {
    const issues: { type: "permanent" | "temporary" | "warning"; reason: string; recommendation: string }[] = [];

    // Age validation
    if (answers.age < 18) {
      issues.push({
        type: "temporary",
        reason: `Age ${answers.age} is below minimum requirement (18 years).`,
        recommendation: "You can register once you celebrate your 18th birthday."
      });
    } else if (answers.age > 65) {
      issues.push({
        type: "temporary",
        reason: `Age ${answers.age} exceeds standard cutoff (65 years).`,
        recommendation: "Regular repeat donors aged 65–70 may donate with specific physician clearance certification."
      });
    }

    // Weight validation
    if (answers.weight < 50) {
      issues.push({
        type: "temporary",
        reason: `Weight of ${answers.weight} kg is below minimum safe threshold (50 kg / 110 lbs).`,
        recommendation: "Standard blood bags require at least 50 kg body weight to ensure blood volume safety."
      });
    }

    // General Wellness
    if (!answers.feelingWellToday) {
      issues.push({
        type: "temporary",
        reason: "Currently not feeling 100% well or experiencing fever/cold symptoms.",
        recommendation: "Please wait until you are fully recovered and symptom-free for at least 48 hours."
      });
    }

    // Hemoglobin
    if (answers.healthyHemoglobin === false) {
      issues.push({
        type: "temporary",
        reason: "Low hemoglobin or iron levels reported.",
        recommendation: "Focus on iron-rich foods (spinach, beans, dates, lean meats) and re-test in 2–4 weeks."
      });
    }

    // Pregnancy / Lactation
    if (answers.pregnantOrRecentBirth) {
      issues.push({
        type: "temporary",
        reason: "Currently pregnant or gave birth within the past 6 months.",
        recommendation: "Defer donation until 6 months after delivery and lactation weaning to protect maternal iron stores."
      });
    }

    // Recent Tattoos / Piercings
    if (answers.recentTattooOrPiercing) {
      issues.push({
        type: "temporary",
        reason: "Tattoo, body piercing, or acupuncture done within the last 6 months.",
        recommendation: "A 6-month safety window is required to eliminate bloodborne viral transmission risks."
      });
    }

    // Antibiotics / Aspirin
    if (answers.recentAntibioticsOrAspirin) {
      issues.push({
        type: "temporary",
        reason: "Recent antibiotic therapy or aspirin usage within the last 48 hours.",
        recommendation: "Complete your antibiotic course and wait 48 hours after your last dose before donating."
      });
    }

    // Surgery or Dental
    if (answers.recentSurgeryOrDental) {
      issues.push({
        type: "temporary",
        reason: "Major surgery in last 6 months or dental extraction in last 72 hours.",
        recommendation: "Wait until surgical wounds have fully healed and dental extraction sockets are closed (72h)."
      });
    }

    // Alcohol within 24h
    if (answers.recentAlcohol24h) {
      issues.push({
        type: "temporary",
        reason: "Alcohol consumed within the last 24 hours.",
        recommendation: "Wait at least 24 hours after alcohol consumption and ensure adequate water hydration."
      });
    }

    // Vaccines or Malaria Travel
    if (answers.recentLiveVaccineOrMalariaTravel) {
      issues.push({
        type: "temporary",
        reason: "Live attenuated vaccine or recent travel to malaria-endemic areas.",
        recommendation: "Live vaccines require 2–4 weeks; malaria travel areas may require 3–12 months deferral."
      });
    }

    // Chronic Disease
    if (answers.chronicHeartOrKidneyDisease) {
      issues.push({
        type: "permanent",
        reason: "Chronic heart disease, renal failure, or active blood clotting disorders.",
        recommendation: "For your safety, blood donation is restricted. You can still champion donor drives and support seekers!"
      });
    }

    // Cooldown check based on last donation date
    if (answers.lastDonationDate) {
      const lastDate = new Date(answers.lastDonationDate);
      if (!isNaN(lastDate.getTime())) {
        const cooldown = DONATION_TYPE_INFO[answers.donationType].cooldownDays;
        const nextEligible = new Date(lastDate.getTime() + cooldown * 24 * 60 * 60 * 1000);
        const now = new Date();
        const diffMs = nextEligible.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (daysRemaining > 0) {
          issues.push({
            type: "temporary",
            reason: `Active donation cooldown for ${DONATION_TYPE_INFO[answers.donationType].label} (${daysRemaining} days remaining).`,
            recommendation: `Next safe donation window opens on ${nextEligible.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric"
            })}.`
          });
        }
      }
    }

    const hasPermanent = issues.some((i) => i.type === "permanent");
    const hasTemporary = issues.some((i) => i.type === "temporary");

    return {
      status: hasPermanent ? "permanent_deferral" : hasTemporary ? "temporary_deferral" : "eligible",
      issues
    };
  }, [answers]);

  // Cooldown calculation helper
  const cooldownCalculation = useMemo(() => {
    const targetType = customDonationType;
    const cooldownDays = DONATION_TYPE_INFO[targetType].cooldownDays;
    const now = new Date();

    if (!customLastDate) {
      return {
        hasDate: false,
        isEligible: true,
        daysRemaining: 0,
        daysElapsed: cooldownDays,
        percent: 100,
        nextDateFormatted: "Eligible to Donate Today",
        lastDateFormatted: "No prior record"
      };
    }

    const lastDate = new Date(customLastDate);
    if (isNaN(lastDate.getTime())) {
      return {
        hasDate: false,
        isEligible: true,
        daysRemaining: 0,
        daysElapsed: cooldownDays,
        percent: 100,
        nextDateFormatted: "Eligible to Donate Today",
        lastDateFormatted: customLastDate
      };
    }

    const nextDate = new Date(lastDate.getTime() + cooldownDays * 24 * 60 * 60 * 1000);
    const diffMs = nextDate.getTime() - now.getTime();
    const elapsedMs = now.getTime() - lastDate.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const daysElapsed = Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)));
    const rawPercent = Math.min(100, Math.max(0, Math.round((daysElapsed / cooldownDays) * 100)));

    const isEligible = daysRemaining <= 0;

    return {
      hasDate: true,
      isEligible,
      daysRemaining,
      daysElapsed,
      percent: isEligible ? 100 : rawPercent,
      nextDateFormatted: nextDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      }),
      lastDateFormatted: lastDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      })
    };
  }, [customLastDate, customDonationType]);

  // Compatibility Data
  const compatibilityMatrix: Record<
    BloodGroup,
    { canGiveTo: BloodGroup[]; canReceiveFrom: BloodGroup[]; roleTitle: string; roleDesc: string }
  > = {
    "O-": {
      canGiveTo: ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
      canReceiveFrom: ["O-"],
      roleTitle: "Universal Red Cell Donor",
      roleDesc: "Your red blood cells can be safely transfused to patients of ANY blood type. In critical trauma emergencies where blood typing is delayed, O-Negative is the primary lifesaver."
    },
    "O+": {
      canGiveTo: ["O+", "A+", "B+", "AB+"],
      canReceiveFrom: ["O+", "O-"],
      roleTitle: "Most Transfused Blood Type",
      roleDesc: "Over 38% of the global population is O+. It can give red blood cells to any positive blood group, making it the most frequently requested type for surgeries."
    },
    "A-": {
      canGiveTo: ["A-", "A+", "AB-", "AB+"],
      canReceiveFrom: ["A-", "O-"],
      roleTitle: "Versatile Platelet & Red Cell Donor",
      roleDesc: "Can donate red cells to both A and AB types, and platelet components are widely compatible."
    },
    "A+": {
      canGiveTo: ["A+", "AB+"],
      canReceiveFrom: ["A+", "A-", "O+", "O-"],
      roleTitle: "High Demand Surgical Resource",
      roleDesc: "One of the most common positive blood groups, crucial for organ transplants, cardiovascular surgery, and cancer therapies."
    },
    "B-": {
      canGiveTo: ["B-", "B+", "AB-", "AB+"],
      canReceiveFrom: ["B-", "O-"],
      roleTitle: "Rare & Valued Donor Type",
      roleDesc: "Occurs in less than 2% of donors. Hospitals maintain targeted reserves for emergency maternal and hematology care."
    },
    "B+": {
      canGiveTo: ["B+", "AB+"],
      canReceiveFrom: ["B+", "B-", "O+", "O-"],
      roleTitle: "Crucial Regional Lifesaver",
      roleDesc: "Highly prevalent across Asian and African demographics, vital for thalassemia and sickle cell disease therapies."
    },
    "AB-": {
      canGiveTo: ["AB-", "AB+"],
      canReceiveFrom: ["AB-", "A-", "B-", "O-"],
      roleTitle: "Universal Plasma Candidate",
      roleDesc: "Extremely rare red cell type (less than 1%), with widely compatible plasma and platelet components."
    },
    "AB+": {
      canGiveTo: ["AB+"],
      canReceiveFrom: ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
      roleTitle: "Universal Red Cell Recipient & Universal Plasma Donor",
      roleDesc: "Can receive red blood cells from ALL blood types! Moreover, AB+ plasma is universal and can be safely given to ANY emergency patient."
    }
  };

  const filteredFaqs = useMemo(() => {
    if (!faqSearch.trim()) return FAQS;
    const qLower = faqSearch.toLowerCase();
    return FAQS.filter(
      (f) =>
        f.q.toLowerCase().includes(qLower) ||
        f.a.toLowerCase().includes(qLower) ||
        f.category.toLowerCase().includes(qLower)
    );
  }, [faqSearch]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner Header */}
      <div className="bg-card-dark border border-border-dark rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-brand-red/10 via-transparent to-transparent pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-brand-red/10 border border-brand-red/30 px-3 py-1 rounded-full text-brand-red text-xs font-mono font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-brand-red" />
              <span>Official Clinical Guidelines & Self-Assessment</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-text-bright tracking-tight">
              Blood Donor Eligibility Center
            </h2>
            <p className="text-xs sm:text-sm text-text-muted max-w-3xl leading-relaxed">
              Verify your medical eligibility, compute your exact whole blood and platelet cooldown timelines, review WHO transfusion standards, and prepare for your next lifesaving donation.
            </p>
          </div>

          {/* Quick Action Badges */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              id="eligibility-find-banks-btn"
              onClick={() => onNavigateToTab("maps")}
              className="px-4 py-2.5 bg-surface-dark hover:bg-zinc-800 text-text-bright border border-border-dark rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Locate Blood Banks</span>
            </button>
            <button
              id="eligibility-view-pass-btn"
              onClick={() => {
                if (myDonorProfile && onOpenPassModal) {
                  onOpenPassModal(myDonorProfile);
                } else {
                  onNavigateToTab("profile");
                }
              }}
              className="px-4 py-2.5 bg-brand-red hover:bg-brand-red-dark text-white rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-brand-red/20 uppercase tracking-wide"
            >
              <Award className="w-4 h-4" />
              <span>{myDonorProfile ? "My Donor Pass" : "Register as Donor"}</span>
            </button>
          </div>
        </div>

        {/* Sub-Navigation Hub */}
        <div className="mt-8 pt-6 border-t border-border-dark flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            id="subtab-screener"
            onClick={() => setActiveSubTab("screener")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-2 cursor-pointer ${
              activeSubTab === "screener"
                ? "bg-brand-red text-white shadow-md shadow-brand-red/20"
                : "bg-surface-dark text-text-muted hover:text-text-bright border border-border-dark"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Interactive Health Screener</span>
          </button>
          <button
            id="subtab-cooldown"
            onClick={() => setActiveSubTab("cooldown")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-2 cursor-pointer ${
              activeSubTab === "cooldown"
                ? "bg-brand-red text-white shadow-md shadow-brand-red/20"
                : "bg-surface-dark text-text-muted hover:text-text-bright border border-border-dark"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Cooldown & Next Date Tracker</span>
          </button>
          <button
            id="subtab-compatibility"
            onClick={() => setActiveSubTab("compatibility")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-2 cursor-pointer ${
              activeSubTab === "compatibility"
                ? "bg-brand-red text-white shadow-md shadow-brand-red/20"
                : "bg-surface-dark text-text-muted hover:text-text-bright border border-border-dark"
            }`}
          >
            <Droplet className="w-4 h-4 text-rose-400" />
            <span>Blood Compatibility Matrix</span>
          </button>
          <button
            id="subtab-guidelines"
            onClick={() => setActiveSubTab("guidelines")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-2 cursor-pointer ${
              activeSubTab === "guidelines"
                ? "bg-brand-red text-white shadow-md shadow-brand-red/20"
                : "bg-surface-dark text-text-muted hover:text-text-bright border border-border-dark"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Clinical Rules & FAQs</span>
          </button>
          <button
            id="subtab-preparation"
            onClick={() => setActiveSubTab("preparation")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-2 cursor-pointer ${
              activeSubTab === "preparation"
                ? "bg-brand-red text-white shadow-md shadow-brand-red/20"
                : "bg-surface-dark text-text-muted hover:text-text-bright border border-border-dark"
            }`}
          >
            <Heart className="w-4 h-4 text-emerald-400" />
            <span>Pre & Post-Donation Care</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: INTERACTIVE CLINICAL SCREENER */}
      {activeSubTab === "screener" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Questionnaire Column */}
          <div className="lg:col-span-7 bg-card-dark border border-border-dark p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-border-dark pb-4">
              <div>
                <h3 className="text-lg font-bold font-display text-text-bright flex items-center gap-2">
                  <Activity className="w-5 h-5 text-brand-red" />
                  <span>Clinical Self-Assessment Questionnaire</span>
                </h3>
                <p className="text-xs text-text-muted mt-0.5">Answer the questions below for an instant confidential eligibility verdict.</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAnswers({
                    age: 26,
                    weight: 65,
                    gender: "Male",
                    donationType: "whole_blood",
                    lastDonationDate: "",
                    feelingWellToday: true,
                    healthyHemoglobin: true,
                    pregnantOrRecentBirth: false,
                    recentTattooOrPiercing: false,
                    recentAntibioticsOrAspirin: false,
                    recentSurgeryOrDental: false,
                    recentAlcohol24h: false,
                    recentLiveVaccineOrMalariaTravel: false,
                    chronicHeartOrKidneyDisease: false
                  });
                }}
                className="text-[11px] text-text-muted hover:text-brand-red flex items-center gap-1 transition cursor-pointer font-mono"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>

            {/* Core Biomarkers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Age */}
              <div className="bg-surface-dark border border-border-dark p-4 rounded-2xl space-y-2">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-subtle flex items-center justify-between">
                  <span>Age (18–65)</span>
                  <span className="text-brand-red font-bold">{answers.age} yrs</span>
                </label>
                <input
                  type="range"
                  min="16"
                  max="75"
                  value={answers.age}
                  onChange={(e) => setAnswers({ ...answers, age: Number(e.target.value) })}
                  className="w-full accent-brand-red cursor-pointer"
                />
                <p className="text-[10px] text-text-muted text-center font-mono">
                  {answers.age >= 18 && answers.age <= 65 ? "✅ In Safe Range" : "⚠️ Outside Standard Range"}
                </p>
              </div>

              {/* Weight */}
              <div className="bg-surface-dark border border-border-dark p-4 rounded-2xl space-y-2">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-subtle flex items-center justify-between">
                  <span>Weight (≥50 kg)</span>
                  <span className="text-brand-red font-bold">{answers.weight} kg</span>
                </label>
                <input
                  type="range"
                  min="40"
                  max="120"
                  value={answers.weight}
                  onChange={(e) => setAnswers({ ...answers, weight: Number(e.target.value) })}
                  className="w-full accent-brand-red cursor-pointer"
                />
                <p className="text-[10px] text-text-muted text-center font-mono">
                  {answers.weight >= 50 ? "✅ Sufficient Volume" : "❌ Below 50 kg"}
                </p>
              </div>

              {/* Donation Type */}
              <div className="bg-surface-dark border border-border-dark p-4 rounded-2xl space-y-2">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-subtle block">
                  Donation Procedure
                </label>
                <select
                  value={answers.donationType}
                  onChange={(e: any) => setAnswers({ ...answers, donationType: e.target.value })}
                  className="w-full bg-card-dark border border-border-dark rounded-xl px-2.5 py-1.5 text-xs text-text-bright focus:outline-none focus:border-brand-red font-sans"
                >
                  <option value="whole_blood">Whole Blood (56d)</option>
                  <option value="platelets">Platelets (7d)</option>
                  <option value="plasma">Plasma (28d)</option>
                  <option value="double_red">Double Red (112d)</option>
                </select>
                <p className="text-[9px] text-text-muted truncate font-mono">
                  Cooldown: {DONATION_TYPE_INFO[answers.donationType].cooldownDays} days
                </p>
              </div>
            </div>

            {/* Prior Donation Date field */}
            <div className="bg-surface-dark border border-border-dark p-4 rounded-2xl space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-bold text-text-bright flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-brand-red" />
                    <span>When was your last blood donation?</span>
                  </label>
                  <p className="text-[11px] text-text-muted">Leave blank if this is your very first time donating.</p>
                </div>
                <input
                  type="date"
                  value={answers.lastDonationDate}
                  onChange={(e) => setAnswers({ ...answers, lastDonationDate: e.target.value })}
                  className="bg-card-dark border border-border-dark rounded-xl px-3 py-1.5 text-xs text-text-bright focus:outline-none focus:border-brand-red font-mono"
                />
              </div>
            </div>

            {/* Checklist items */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-subtle font-mono">
                Health & Lifestyle Screener Checklist
              </h4>

              {/* Item 1 */}
              <div className="p-3.5 bg-surface-dark border border-border-dark rounded-2xl flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-text-bright">Feeling healthy, well, and symptom-free today?</p>
                  <p className="text-[11px] text-text-muted">No active fever, cough, flu, or infection in the past 48 hours.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setAnswers({ ...answers, feelingWellToday: true })}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      answers.feelingWellToday ? "bg-emerald-500 text-black shadow" : "bg-card-dark text-text-muted hover:text-white"
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnswers({ ...answers, feelingWellToday: false })}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      !answers.feelingWellToday ? "bg-rose-500 text-white shadow" : "bg-card-dark text-text-muted hover:text-white"
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              {/* Item 2: Hemoglobin */}
              <div className="p-3.5 bg-surface-dark border border-border-dark rounded-2xl flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-text-bright">Healthy hemoglobin / iron levels?</p>
                  <p className="text-[11px] text-text-muted">≥12.5 g/dL for women, ≥13.0 g/dL for men (tested at blood bank).</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setAnswers({ ...answers, healthyHemoglobin: true })}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      answers.healthyHemoglobin === true ? "bg-emerald-500 text-black shadow" : "bg-card-dark text-text-muted hover:text-white"
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnswers({ ...answers, healthyHemoglobin: false })}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      answers.healthyHemoglobin === false ? "bg-rose-500 text-white shadow" : "bg-card-dark text-text-muted hover:text-white"
                    }`}
                  >
                    Low
                  </button>
                </div>
              </div>

              {/* Item 3: Tattoos / Piercings */}
              <div className="p-3.5 bg-surface-dark border border-border-dark rounded-2xl flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-text-bright">Tattoo, body piercing, or acupuncture in past 6 months?</p>
                  <p className="text-[11px] text-text-muted">Applies to new tattoos or touch-ups within the last 180 days.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setAnswers({ ...answers, recentTattooOrPiercing: false })}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      !answers.recentTattooOrPiercing ? "bg-emerald-500 text-black shadow" : "bg-card-dark text-text-muted hover:text-white"
                    }`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnswers({ ...answers, recentTattooOrPiercing: true })}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      answers.recentTattooOrPiercing ? "bg-amber-500 text-black shadow" : "bg-card-dark text-text-muted hover:text-white"
                    }`}
                  >
                    Yes (Recent)
                  </button>
                </div>
              </div>

              {/* Item 4: Medications & Antibiotics */}
              <div className="p-3.5 bg-surface-dark border border-border-dark rounded-2xl flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-text-bright">Antibiotics or Aspirin taken in the last 48 hours?</p>
                  <p className="text-[11px] text-text-muted">Antibiotic therapies or anti-platelet medications.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setAnswers({ ...answers, recentAntibioticsOrAspirin: false })}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      !answers.recentAntibioticsOrAspirin ? "bg-emerald-500 text-black shadow" : "bg-card-dark text-text-muted hover:text-white"
                    }`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnswers({ ...answers, recentAntibioticsOrAspirin: true })}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      answers.recentAntibioticsOrAspirin ? "bg-amber-500 text-black shadow" : "bg-card-dark text-text-muted hover:text-white"
                    }`}
                  >
                    Yes
                  </button>
                </div>
              </div>

              {/* Item 5: Surgery & Dental */}
              <div className="p-3.5 bg-surface-dark border border-border-dark rounded-2xl flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-text-bright">Major surgery in last 6 mos or tooth extraction in last 72h?</p>
                  <p className="text-[11px] text-text-muted">Tissue healing and absence of dental bleeding.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setAnswers({ ...answers, recentSurgeryOrDental: false })}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      !answers.recentSurgeryOrDental ? "bg-emerald-500 text-black shadow" : "bg-card-dark text-text-muted hover:text-white"
                    }`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnswers({ ...answers, recentSurgeryOrDental: true })}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      answers.recentSurgeryOrDental ? "bg-amber-500 text-black shadow" : "bg-card-dark text-text-muted hover:text-white"
                    }`}
                  >
                    Yes
                  </button>
                </div>
              </div>

              {/* Item 6: Alcohol within 24h */}
              <div className="p-3.5 bg-surface-dark border border-border-dark rounded-2xl flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-text-bright">Alcohol consumed within the last 24 hours?</p>
                  <p className="text-[11px] text-text-muted">Prevents dehydration and dizziness during donation.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setAnswers({ ...answers, recentAlcohol24h: false })}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      !answers.recentAlcohol24h ? "bg-emerald-500 text-black shadow" : "bg-card-dark text-text-muted hover:text-white"
                    }`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnswers({ ...answers, recentAlcohol24h: true })}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      answers.recentAlcohol24h ? "bg-amber-500 text-black shadow" : "bg-card-dark text-text-muted hover:text-white"
                    }`}
                  >
                    Yes
                  </button>
                </div>
              </div>

              {/* Item 7: Pregnancy & Postpartum */}
              <div className="p-3.5 bg-surface-dark border border-border-dark rounded-2xl flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-text-bright">Currently pregnant or given birth in last 6 months?</p>
                  <p className="text-[11px] text-text-muted">Protects maternal iron recovery and postpartum wellness.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setAnswers({ ...answers, pregnantOrRecentBirth: false })}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      !answers.pregnantOrRecentBirth ? "bg-emerald-500 text-black shadow" : "bg-card-dark text-text-muted hover:text-white"
                    }`}
                  >
                    No / N/A
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnswers({ ...answers, pregnantOrRecentBirth: true })}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      answers.pregnantOrRecentBirth ? "bg-amber-500 text-black shadow" : "bg-card-dark text-text-muted hover:text-white"
                    }`}
                  >
                    Yes
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Verdict Result Card Column */}
          <div className="lg:col-span-5 space-y-6 sticky top-20">
            <div
              className={`p-6 sm:p-8 rounded-3xl border shadow-2xl space-y-6 relative overflow-hidden transition-all duration-300 ${
                screeningResult.status === "eligible"
                  ? "bg-gradient-to-br from-[#12281E] to-[#0A1611] border-emerald-500/40 text-emerald-100 shadow-emerald-950/20"
                  : screeningResult.status === "temporary_deferral"
                  ? "bg-gradient-to-br from-[#281F12] to-[#16110A] border-amber-500/40 text-amber-100 shadow-amber-950/20"
                  : "bg-gradient-to-br from-[#281214] to-[#160A0B] border-rose-500/40 text-rose-100 shadow-rose-950/20"
              }`}
            >
              {/* Status Header Badge */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg shrink-0 ${
                    screeningResult.status === "eligible"
                      ? "bg-emerald-500 text-black shadow-emerald-500/30"
                      : screeningResult.status === "temporary_deferral"
                      ? "bg-amber-500 text-black shadow-amber-500/30"
                      : "bg-rose-500 text-white shadow-rose-500/30"
                  }`}
                >
                  {screeningResult.status === "eligible" ? (
                    <CheckCircle2 className="w-7 h-7" />
                  ) : screeningResult.status === "temporary_deferral" ? (
                    <Clock className="w-7 h-7" />
                  ) : (
                    <AlertTriangle className="w-7 h-7" />
                  )}
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-widest font-mono font-extrabold opacity-80 block">
                    Assessment Verdict
                  </span>
                  <h3 className="text-xl font-extrabold font-display leading-tight">
                    {screeningResult.status === "eligible"
                      ? "Cleared: Eligible to Donate!"
                      : screeningResult.status === "temporary_deferral"
                      ? "Temporary Cooldown / Deferral"
                      : "Clinical Consultation Required"}
                  </h3>
                </div>
              </div>

              {/* Status Explanation */}
              <div className="bg-black/30 border border-white/10 p-4 rounded-2xl space-y-2 text-xs leading-relaxed">
                {screeningResult.status === "eligible" ? (
                  <p>
                    Great news! Based on your provided responses, you meet the standard WHO & Red Cross clinical requirements for blood donation.
                  </p>
                ) : screeningResult.status === "temporary_deferral" ? (
                  <p>
                    You are currently in a temporary deferral or cooldown window. Once the conditions below are resolved, you will be cleared to donate!
                  </p>
                ) : (
                  <p>
                    Based on chronic medical considerations, standard blood bank donation is currently restricted for donor safety.
                  </p>
                )}
              </div>

              {/* Issues / Recommendations List */}
              {screeningResult.issues.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider font-mono opacity-80">
                    Clinical Notes ({screeningResult.issues.length})
                  </h4>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {screeningResult.issues.map((issue, idx) => (
                      <div
                        key={idx}
                        className="bg-black/40 border border-white/10 p-3 rounded-xl space-y-1 text-xs"
                      >
                        <p className="font-bold flex items-center gap-1.5 text-white">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{issue.reason}</span>
                        </p>
                        <p className="text-[11px] opacity-80 pl-5">{issue.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTAs based on result */}
              <div className="pt-2 space-y-2.5">
                {screeningResult.status === "eligible" ? (
                  <>
                    <button
                      id="verdict-find-banks-cta"
                      onClick={() => onNavigateToTab("maps")}
                      className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs tracking-wider uppercase rounded-xl transition cursor-pointer shadow-lg flex items-center justify-center gap-2"
                    >
                      <MapPin className="w-4 h-4" />
                      <span>Find Blood Banks on Google Maps</span>
                    </button>
                    <button
                      id="verdict-register-donor-cta"
                      onClick={() => onNavigateToTab("profile")}
                      className="w-full py-2.5 bg-black/40 hover:bg-black/60 text-white font-bold text-xs rounded-xl transition border border-white/20 text-center cursor-pointer"
                    >
                      Activate / Update My Donor Pass
                    </button>
                  </>
                ) : (
                  <button
                    id="verdict-cooldown-tracker-cta"
                    onClick={() => setActiveSubTab("cooldown")}
                    className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs tracking-wider uppercase rounded-xl transition cursor-pointer shadow-lg flex items-center justify-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    <span>View Cooldown Timeline & Tracker</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Reminder Card */}
            <div className="bg-card-dark border border-border-dark p-5 rounded-2xl space-y-2 text-xs text-text-muted">
              <h4 className="font-bold text-text-bright flex items-center gap-1.5">
                <Info className="w-4 h-4 text-brand-red" />
                <span>On-Site Blood Bank Verification</span>
              </h4>
              <p className="leading-relaxed">
                Before every donation, certified medical staff will measure your blood pressure, pulse, temperature, and perform a complimentary finger-prick hemoglobin test to guarantee 100% safety.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: COOLDOWN & NEXT DATE TRACKER */}
      {activeSubTab === "cooldown" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Calculator configuration */}
            <div className="lg:col-span-6 bg-card-dark border border-border-dark p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl">
              <div className="space-y-1 border-b border-border-dark pb-4">
                <h3 className="text-lg font-bold font-display text-text-bright flex items-center gap-2">
                  <Clock className="w-5 h-5 text-brand-red" />
                  <span>Donation Cooldown Interval Calculator</span>
                </h3>
                <p className="text-xs text-text-muted">
                  Different blood components require different cellular recovery intervals. Calculate your exact next clearance date.
                </p>
              </div>

              {/* Component Selector */}
              <div className="space-y-3">
                <label className="text-xs font-mono uppercase tracking-wider text-text-subtle font-bold block">
                  Select Donation Procedure
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(Object.keys(DONATION_TYPE_INFO) as DonationType[]).map((key) => {
                    const info = DONATION_TYPE_INFO[key];
                    const isSelected = customDonationType === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setCustomDonationType(key)}
                        className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 ${
                          isSelected
                            ? "bg-brand-red/10 border-brand-red text-text-bright shadow-lg shadow-brand-red/10"
                            : "bg-surface-dark border-border-dark hover:border-zinc-700 text-text-muted"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-text-bright">{info.label}</span>
                          <span className="text-[10px] font-mono font-extrabold bg-surface-dark px-2 py-0.5 rounded border border-border-dark text-brand-red">
                            {info.cooldownDays} Days
                          </span>
                        </div>
                        <p className="text-[10px] text-text-muted line-clamp-2 leading-relaxed">{info.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date Input */}
              <div className="space-y-2 bg-surface-dark border border-border-dark p-4 rounded-2xl">
                <label className="text-xs font-bold text-text-bright block">
                  Last Donation Date
                </label>
                <input
                  type="date"
                  value={customLastDate}
                  onChange={(e) => setCustomLastDate(e.target.value)}
                  className="w-full bg-card-dark border border-border-dark rounded-xl px-3.5 py-2.5 text-xs text-text-bright focus:outline-none focus:border-brand-red font-mono"
                />
                <div className="flex items-center justify-between text-[10px] text-text-muted pt-1">
                  <span>Logged in profile: {myDonorProfile?.lastDonationDate || "Never"}</span>
                  {myDonorProfile?.lastDonationDate && (
                    <button
                      type="button"
                      onClick={() => setCustomLastDate(myDonorProfile.lastDonationDate)}
                      className="text-brand-red hover:underline font-bold cursor-pointer"
                    >
                      Use Profile Date
                    </button>
                  )}
                </div>
              </div>

              {/* Procedure Details Box */}
              <div className="bg-surface-dark/70 border border-border-dark p-4 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-text-muted">Procedure Duration:</span>
                  <span className="font-bold text-text-bright">{DONATION_TYPE_INFO[customDonationType].duration}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-text-muted">Maximum Frequency:</span>
                  <span className="font-bold text-text-bright">{DONATION_TYPE_INFO[customDonationType].frequency}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-text-muted">Standard Waiting Interval:</span>
                  <span className="font-bold text-brand-red">{DONATION_TYPE_INFO[customDonationType].cooldownDays} Days</span>
                </div>
              </div>
            </div>

            {/* Right Progress Ring & Countdown Display */}
            <div className="lg:col-span-6 bg-card-dark border border-border-dark p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl">
              <div className="text-center space-y-2">
                <span className="text-[10px] uppercase font-mono font-extrabold tracking-widest text-text-subtle">
                  Live Cellular Recovery Status
                </span>
                <h3 className="text-2xl font-extrabold font-display text-text-bright">
                  {cooldownCalculation.isEligible ? "🎉 Cleared to Donate!" : `⏳ ${cooldownCalculation.daysRemaining} Days in Cooldown`}
                </h3>
              </div>

              {/* Visual Progress Bar */}
              <div className="space-y-3 bg-surface-dark border border-border-dark p-6 rounded-3xl">
                <div className="flex items-center justify-between text-xs font-mono font-bold">
                  <span className="text-text-muted">Recovery Progress</span>
                  <span className={cooldownCalculation.isEligible ? "text-emerald-400" : "text-amber-400"}>
                    {cooldownCalculation.percent}% Complete
                  </span>
                </div>

                <div className="w-full h-4 bg-card-dark rounded-full overflow-hidden border border-border-dark p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      cooldownCalculation.isEligible
                        ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-md shadow-emerald-500/30"
                        : "bg-gradient-to-r from-amber-600 to-amber-400"
                    }`}
                    style={{ width: `${cooldownCalculation.percent}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border-dark/60 text-center">
                  <div>
                    <span className="text-[10px] text-text-subtle font-mono uppercase block">Last Session</span>
                    <span className="text-xs font-bold text-text-bright font-mono">{cooldownCalculation.lastDateFormatted}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-subtle font-mono uppercase block">Eligible From</span>
                    <span
                      className={`text-xs font-bold font-mono ${
                        cooldownCalculation.isEligible ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {cooldownCalculation.nextDateFormatted}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Advice banner */}
              <div
                className={`p-4 rounded-2xl border text-xs leading-relaxed flex items-start gap-3 ${
                  cooldownCalculation.isEligible
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-200"
                }`}
              >
                {cooldownCalculation.isEligible ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-300">Ready for your next donation session</p>
                      <p className="text-[11px] text-emerald-200/80 mt-0.5">
                        Your red blood cell and platelet counts have completely replenished. Find a convenient blood bank center nearby to save up to 3 lives!
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-300">Rest & iron replenishment period</p>
                      <p className="text-[11px] text-amber-200/80 mt-0.5">
                        Your bone marrow is synthesizing fresh hemoglobin and ferritin reserves. Maintain hydration and enjoy balanced meals.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  id="cooldown-locate-banks-btn"
                  onClick={() => onNavigateToTab("maps")}
                  className="py-3 bg-brand-red hover:bg-brand-red-dark text-white font-extrabold text-xs rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  <span>Locate Blood Banks</span>
                </button>
                <button
                  id="cooldown-google-calendar-btn"
                  onClick={() => onNavigateToTab("calendar")}
                  className="py-3 bg-card-dark hover:bg-surface-dark text-rose-400 border border-rose-500/30 font-bold text-xs rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Google Calendar</span>
                </button>
                <button
                  id="cooldown-check-screen-btn"
                  onClick={() => setActiveSubTab("screener")}
                  className="py-3 bg-surface-dark hover:bg-zinc-800 text-text-bright border border-border-dark font-bold text-xs rounded-xl transition cursor-pointer text-center"
                >
                  Run Full Screener
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: BLOOD COMPATIBILITY MATRIX */}
      {activeSubTab === "compatibility" && (
        <div className="space-y-8">
          <div className="bg-card-dark border border-border-dark p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-dark pb-6">
              <div>
                <h3 className="text-lg font-bold font-display text-text-bright flex items-center gap-2">
                  <Droplet className="w-5 h-5 text-brand-red" />
                  <span>Interactive Blood Compatibility Matrix</span>
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Select your blood group to see which patients you can safely donate to and receive red blood cells from.
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {(["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"] as BloodGroup[]).map((bg) => (
                  <button
                    key={bg}
                    type="button"
                    onClick={() => setSelectedGroup(bg)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold font-display transition cursor-pointer ${
                      selectedGroup === bg
                        ? "bg-brand-red text-white shadow-lg shadow-brand-red/30 scale-105"
                        : "bg-surface-dark text-text-muted hover:text-white border border-border-dark"
                    }`}
                  >
                    {bg}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Group Detail Spotlight */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-4 bg-surface-dark border border-border-dark p-6 rounded-2xl flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-extrabold font-display bg-brand-red/20 text-brand-red border border-brand-red/40 px-4 py-2 rounded-2xl">
                      {selectedGroup}
                    </span>
                    <div>
                      <h4 className="font-extrabold text-sm text-text-bright font-display">
                        {compatibilityMatrix[selectedGroup].roleTitle}
                      </h4>
                      <span className="text-[10px] text-text-muted font-mono">Antigen Compatibility Profile</span>
                    </div>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">
                    {compatibilityMatrix[selectedGroup].roleDesc}
                  </p>
                </div>

                <div className="pt-4 border-t border-border-dark">
                  <button
                    type="button"
                    onClick={() => onNavigateToTab("search")}
                    className="w-full py-2.5 bg-brand-red/10 border border-brand-red/30 hover:bg-brand-red text-brand-red hover:text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Search Donors Matching {selectedGroup}</span>
                  </button>
                </div>
              </div>

              {/* Can Give To & Can Receive From Columns */}
              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Can Give To */}
                <div className="bg-surface-dark border border-emerald-500/20 p-5 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs font-mono uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>You Can Donate Red Cells To:</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {compatibilityMatrix[selectedGroup].canGiveTo.map((target) => (
                      <span
                        key={target}
                        className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-display font-extrabold text-sm px-3.5 py-1.5 rounded-xl shadow-sm"
                      >
                        {target}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-text-muted pt-2 leading-relaxed">
                    Recipients with these blood types have matching antibodies and will safely accept your transfused red blood cells without immune rejection.
                  </p>
                </div>

                {/* Can Receive From */}
                <div className="bg-surface-dark border border-sky-500/20 p-5 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-sky-400 font-bold text-xs font-mono uppercase tracking-wider">
                    <Droplet className="w-4 h-4" />
                    <span>You Can Receive Red Cells From:</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {compatibilityMatrix[selectedGroup].canReceiveFrom.map((source) => (
                      <span
                        key={source}
                        className="bg-sky-500/10 border border-sky-500/30 text-sky-300 font-display font-extrabold text-sm px-3.5 py-1.5 rounded-xl shadow-sm"
                      >
                        {source}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-text-muted pt-2 leading-relaxed">
                    In emergency surgical situations, blood units from these donor groups can be transfused safely to you.
                  </p>
                </div>
              </div>
            </div>

            {/* Complete Compatibility Grid Table */}
            <div className="mt-8 pt-6 border-t border-border-dark space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-subtle font-mono">
                Full 8-Group Compatibility Matrix Reference
              </h4>
              <div className="overflow-x-auto rounded-2xl border border-border-dark">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-dark text-text-muted font-mono uppercase text-[10px] border-b border-border-dark">
                    <tr>
                      <th className="p-3">Blood Type</th>
                      <th className="p-3">Give Red Blood Cells (RBC) To</th>
                      <th className="p-3">Receive Red Blood Cells From</th>
                      <th className="p-3">Universal Designation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-dark/60 font-mono">
                    {(["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"] as BloodGroup[]).map((bg) => (
                      <tr
                        key={bg}
                        onClick={() => setSelectedGroup(bg)}
                        className={`hover:bg-surface-dark/50 transition cursor-pointer ${
                          selectedGroup === bg ? "bg-brand-red/10" : ""
                        }`}
                      >
                        <td className="p-3 font-extrabold text-brand-red font-display text-sm">{bg}</td>
                        <td className="p-3 text-text-bright">{compatibilityMatrix[bg].canGiveTo.join(", ")}</td>
                        <td className="p-3 text-text-muted">{compatibilityMatrix[bg].canReceiveFrom.join(", ")}</td>
                        <td className="p-3 text-[11px] text-text-subtle">
                          {bg === "O-"
                            ? "⭐ Universal RBC Donor"
                            : bg === "AB+"
                            ? "⭐ Universal Recipient & Plasma Donor"
                            : "Standard Regional Donor"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: CLINICAL RULES, DEFERRALS & FAQS */}
      {activeSubTab === "guidelines" && (
        <div className="space-y-8">
          {/* Deferral Classifications Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Permanent Deferrals */}
            <div className="bg-card-dark border border-rose-500/20 p-6 rounded-3xl space-y-3 shadow-xl">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs font-mono uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                <span>Permanent Deferrals</span>
              </div>
              <h4 className="font-bold text-sm text-text-bright">When donation is strictly restricted</h4>
              <ul className="text-xs text-text-muted space-y-2 list-disc pl-4 leading-relaxed">
                <li>Confirmed Hepatitis B or C, HIV/AIDS, or HTLV infection.</li>
                <li>Chronic heart failure, severe coronary artery disease, or active cardiac arrhythmia.</li>
                <li>Chronic kidney disease or chronic liver failure.</li>
                <li>History of malignant hematological cancers (leukemia, lymphoma).</li>
              </ul>
            </div>

            {/* Temporary Deferrals */}
            <div className="bg-card-dark border border-amber-500/20 p-6 rounded-3xl space-y-3 shadow-xl">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs font-mono uppercase tracking-wider">
                <Clock className="w-4 h-4" />
                <span>Temporary Deferrals</span>
              </div>
              <h4 className="font-bold text-sm text-text-bright">Eligible once cooldown concludes</h4>
              <ul className="text-xs text-text-muted space-y-2 list-disc pl-4 leading-relaxed">
                <li><strong>56 days:</strong> Standard whole blood recovery window.</li>
                <li><strong>6 months:</strong> Tattoos, body piercings, acupuncture, or major surgeries.</li>
                <li><strong>6 months:</strong> Pregnancy and postpartum lactation recovery.</li>
                <li><strong>48 hours:</strong> Antibiotic completion or minor dental extractions.</li>
              </ul>
            </div>

            {/* Permitted Conditions */}
            <div className="bg-card-dark border border-emerald-500/20 p-6 rounded-3xl space-y-3 shadow-xl">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs font-mono uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                <span>Permitted Conditions</span>
              </div>
              <h4 className="font-bold text-sm text-text-bright">Conditions cleared for donation</h4>
              <ul className="text-xs text-text-muted space-y-2 list-disc pl-4 leading-relaxed">
                <li><strong>Controlled High BP:</strong> Systolic under 180 and diastolic under 100.</li>
                <li><strong>Controlled Diabetes:</strong> On oral medications or diet (without vascular issues).</li>
                <li><strong>Mild Allergies:</strong> As long as you do not have acute breathing distress.</li>
                <li><strong>Menstruation:</strong> As long as hemoglobin is ≥12.5 g/dL and feeling well.</li>
              </ul>
            </div>
          </div>

          {/* Myth Busters Section */}
          <div className="bg-card-dark border border-border-dark p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl">
            <div className="space-y-1 border-b border-border-dark pb-4">
              <h3 className="text-lg font-bold font-display text-text-bright flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>Common Blood Donation Myths vs. Clinical Facts</span>
              </h3>
              <p className="text-xs text-text-muted">
                Debunking misconceptions so you can donate with absolute confidence and clarity.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MYTH_BUSTERS.map((mb, idx) => (
                <div
                  key={idx}
                  className="bg-surface-dark border border-border-dark p-5 rounded-2xl space-y-2.5"
                >
                  <div className="flex items-start gap-2 text-xs font-bold text-rose-400">
                    <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-[10px] uppercase font-mono shrink-0">
                      Myth
                    </span>
                    <span>"{mb.myth}"</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-emerald-300 pl-2 border-l-2 border-emerald-500/50">
                    <span className="font-bold font-mono text-[10px] uppercase text-emerald-400 shrink-0">
                      Fact:
                    </span>
                    <p className="text-text-muted text-[11px] leading-relaxed">{mb.fact}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Searchable FAQ Accordion */}
          <div className="bg-card-dark border border-border-dark p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-dark pb-4">
              <div>
                <h3 className="text-lg font-bold font-display text-text-bright flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-brand-red" />
                  <span>Frequently Asked Clinical Questions</span>
                </h3>
                <p className="text-xs text-text-muted mt-0.5">Authoritative answers on medications, travel, and donation intervals.</p>
              </div>

              {/* Search filter */}
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search questions or keywords..."
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  className="w-full bg-surface-dark border border-border-dark rounded-xl px-3 py-2 text-xs text-text-bright placeholder-zinc-600 focus:outline-none focus:border-brand-red"
                />
                <Search className="absolute right-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
              </div>
            </div>

            <div className="space-y-3">
              {filteredFaqs.length === 0 ? (
                <div className="text-center py-8 text-xs text-text-muted">
                  No matching clinical questions found for "{faqSearch}".
                </div>
              ) : (
                filteredFaqs.map((faq, idx) => {
                  const isOpen = expandedFaqIndex === idx;
                  return (
                    <div
                      key={idx}
                      className="bg-surface-dark border border-border-dark rounded-2xl overflow-hidden transition"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedFaqIndex(isOpen ? null : idx)}
                        className="w-full p-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-surface-dark/80 transition"
                      >
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono uppercase font-bold text-brand-red bg-brand-red/10 px-2 py-0.5 rounded">
                            {faq.category}
                          </span>
                          <h4 className="font-bold text-xs text-text-bright">{faq.q}</h4>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-text-muted shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
                        )}
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 pt-1 text-xs text-text-muted leading-relaxed border-t border-border-dark/60 font-sans">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: PRE & POST DONATION CARE GUIDE */}
      {activeSubTab === "preparation" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Before Donation Card */}
            <div className="bg-card-dark border border-border-dark p-6 rounded-3xl space-y-4 shadow-xl">
              <div className="flex items-center gap-2 text-brand-red font-bold text-xs font-mono uppercase tracking-wider">
                <Zap className="w-4 h-4" />
                <span>1. Before Donation (24 Hours)</span>
              </div>
              <h4 className="font-bold text-base text-text-bright">Hydration & Iron Loading</h4>
              <ul className="text-xs text-text-muted space-y-2.5 leading-relaxed">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span><strong>Drink 16–20 oz of water</strong> or fruit juice extra in the 2–3 hours prior.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span><strong>Eat a healthy meal</strong> rich in iron (spinach, beans, dates, lean protein). Avoid fatty fast foods.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span><strong>Get a restful 7–8 hours</strong> of sleep the night before.</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
                  <span><strong>Avoid alcohol</strong> for at least 24 hours beforehand.</span>
                </li>
              </ul>
            </div>

            {/* During Donation Card */}
            <div className="bg-card-dark border border-border-dark p-6 rounded-3xl space-y-4 shadow-xl">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs font-mono uppercase tracking-wider">
                <Activity className="w-4 h-4" />
                <span>2. During the Session</span>
              </div>
              <h4 className="font-bold text-base text-text-bright">Relaxation & Clinical Safety</h4>
              <ul className="text-xs text-text-muted space-y-2.5 leading-relaxed">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span><strong>Bring a photo ID</strong> and your official Digital Donor Identity Pass.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span><strong>Wear comfortable clothing</strong> with sleeves that can easily roll up above the elbow.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span><strong>Relax and breathe slowly</strong>: the blood draw takes only 8–10 minutes.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span><strong>Alert staff immediately</strong> if you experience any lightheadedness or dizziness.</span>
                </li>
              </ul>
            </div>

            {/* After Donation Card */}
            <div className="bg-card-dark border border-border-dark p-6 rounded-3xl space-y-4 shadow-xl">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs font-mono uppercase tracking-wider">
                <Heart className="w-4 h-4" />
                <span>3. After Donation Care</span>
              </div>
              <h4 className="font-bold text-base text-text-bright">Recovery & Refreshments</h4>
              <ul className="text-xs text-text-muted space-y-2.5 leading-relaxed">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span><strong>Rest for 10–15 minutes</strong> in the observation lounge and enjoy fruit juice or snacks.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span><strong>Keep bandage on</strong> for the next 4–6 hours and keep the arm dry.</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
                  <span><strong>Avoid heavy weightlifting</strong> or strenuous exercise for the remainder of the day.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span><strong>Log your donation</strong> in your Hemolink profile to update your cooldown schedule!</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Quick Action Navigation Footer */}
          <div className="bg-card-dark border border-border-dark p-6 sm:p-8 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1">
              <h4 className="font-bold text-base text-text-bright">Ready to take the next step?</h4>
              <p className="text-xs text-text-muted">Search verified blood bank hospitals on Google Maps or generate your digital donor credential pass.</p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onNavigateToTab("maps")}
                className="px-5 py-3 bg-brand-red hover:bg-brand-red-dark text-white rounded-xl text-xs font-extrabold transition cursor-pointer shadow-lg shadow-brand-red/20 uppercase tracking-wide flex items-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                <span>Locate Nearby Blood Banks</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
