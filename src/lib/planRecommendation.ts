/**
 * planRecommendation.ts
 * Path: src/lib/planRecommendation.ts
 *
 * Source of truth for feature options, category matching, and tier recommendation
 * based on the MantraAssist pricing sheet.
 */

export type PlanCategoryType = "AI Receptionist" | "AI Scribe" | "AI EHR" | "AI RCM";
export type RecommendedTierType = "Starter" | "Growth" | "Scale";

export interface FeatureRequirementOption {
  name: string;
  category: PlanCategoryType;
  minTier: RecommendedTierType;
}

export const REQUIREMENT_OPTIONS_BY_CATEGORY: Record<PlanCategoryType, FeatureRequirementOption[]> = {
  "AI Receptionist": [
    { name: "24/7 AI Receptionist", category: "AI Receptionist", minTier: "Starter" },
    { name: "Missed, Inbound & Outbound Calls Handling", category: "AI Receptionist", minTier: "Starter" },
    { name: "Appointment Scheduling & Reminders", category: "AI Receptionist", minTier: "Starter" },
    { name: "Human / Live-Agent Transfer", category: "AI Receptionist", minTier: "Starter" },
    { name: "AI Lead Management & Followups", category: "AI Receptionist", minTier: "Starter" },
    { name: "WhatsApp, SMS & Email Automation", category: "AI Receptionist", minTier: "Starter" },
    { name: "AI Website & WhatsApp Chatbot", category: "AI Receptionist", minTier: "Growth" },
    { name: "Website / Google / Meta Lead Capture", category: "AI Receptionist", minTier: "Growth" },
    { name: "Patient Reactivation", category: "AI Receptionist", minTier: "Growth" },
    { name: "Referral Management", category: "AI Receptionist", minTier: "Growth" },
  ],
  "AI Scribe": [
    { name: "AI Documentation & Coding", category: "AI Scribe", minTier: "Starter" },
    { name: "Automated Session Notes / Prescription", category: "AI Scribe", minTier: "Starter" },
    { name: "Custom Templates", category: "AI Scribe", minTier: "Starter" },
    { name: "Specialty-Specific Templates", category: "AI Scribe", minTier: "Scale" },
  ],
  "AI EHR": [
    { name: "Patient Scheduling & Management", category: "AI EHR", minTier: "Starter" },
    { name: "Document Templates", category: "AI EHR", minTier: "Growth" },
    { name: "EHR / Software Integrations", category: "AI EHR", minTier: "Growth" },
    { name: "Custom Fields, Forms & Appointment Types", category: "AI EHR", minTier: "Scale" },
    { name: "Patient Intake & Digital Forms", category: "AI EHR", minTier: "Scale" },
  ],
  "AI RCM": [
    { name: "Eligibility & Benefits Verification", category: "AI RCM", minTier: "Starter" },
    { name: "Claims Status & Follow-up", category: "AI RCM", minTier: "Growth" },
    { name: "Automated Claims Follow-up", category: "AI RCM", minTier: "Growth" },
    { name: "Denial & AR Management", category: "AI RCM", minTier: "Scale" },
  ],
};

export const ALL_FEATURE_OPTIONS: FeatureRequirementOption[] = [
  ...REQUIREMENT_OPTIONS_BY_CATEGORY["AI Receptionist"],
  ...REQUIREMENT_OPTIONS_BY_CATEGORY["AI Scribe"],
  ...REQUIREMENT_OPTIONS_BY_CATEGORY["AI EHR"],
  ...REQUIREMENT_OPTIONS_BY_CATEGORY["AI RCM"],
];

export const REQUIREMENT_GROUPED_OPTIONS: Record<string, string[]> = {
  "AI Receptionist": REQUIREMENT_OPTIONS_BY_CATEGORY["AI Receptionist"].map((f) => f.name),
  "AI Scribe": REQUIREMENT_OPTIONS_BY_CATEGORY["AI Scribe"].map((f) => f.name),
  "AI EHR": REQUIREMENT_OPTIONS_BY_CATEGORY["AI EHR"].map((f) => f.name),
  "AI RCM": REQUIREMENT_OPTIONS_BY_CATEGORY["AI RCM"].map((f) => f.name),
};

export const ALL_REQUIREMENT_NAMES: string[] = ALL_FEATURE_OPTIONS.map((f) => f.name);

export const FEATURE_MAP = new Map<string, FeatureRequirementOption>(
  ALL_FEATURE_OPTIONS.map((f) => [f.name, f])
);

export const TIER_RANK: Record<RecommendedTierType, number> = {
  Starter: 1,
  Growth: 2,
  Scale: 3,
};

/**
 * 2. Category matching (runs when Step 4/5 is submitted)
 * - Count the selected options per category. The category with the most selections is the matched category.
 * - If two categories tie, use the category of the first option the user selected.
 * - If nothing maps to a category, fall back to AI Receptionist.
 * - Save the result on the organization as default_category.
 */
export function computeDefaultCategory(selectedOptions: string[]): PlanCategoryType {
  if (!selectedOptions || selectedOptions.length === 0) {
    return "AI Receptionist";
  }

  const counts: Record<PlanCategoryType, number> = {
    "AI Receptionist": 0,
    "AI Scribe": 0,
    "AI EHR": 0,
    "AI RCM": 0,
  };

  const firstCategorySeen = new Map<PlanCategoryType, number>();

  selectedOptions.forEach((optName, index) => {
    const feat = FEATURE_MAP.get(optName);
    if (feat) {
      counts[feat.category] = (counts[feat.category] || 0) + 1;
      if (!firstCategorySeen.has(feat.category)) {
        firstCategorySeen.set(feat.category, index);
      }
    }
  });

  const categories = Object.keys(counts) as PlanCategoryType[];
  const maxCount = Math.max(...categories.map((c) => counts[c]));

  if (maxCount === 0) {
    return "AI Receptionist";
  }

  const tiedCategories = categories.filter((c) => counts[c] === maxCount);

  if (tiedCategories.length === 1) {
    return tiedCategories[0];
  }

  // If two categories tie, use the category of the first option the user selected
  tiedCategories.sort((a, b) => {
    const firstA = firstCategorySeen.get(a) ?? 9999;
    const firstB = firstCategorySeen.get(b) ?? 9999;
    return firstA - firstB;
  });

  return tiedCategories[0] || "AI Receptionist";
}

/**
 * 3. Tier recommendation (runs together with step 2)
 * Within the matched category, the recommended tier is the highest of these three:
 * - Feature tier: the lowest tier that includes every selected option, using the minimum tiers above.
 * - Team tier: from the selected team size, using the sheet's team limits.
 *   AI Scribe: Starter up to 3, Growth up to 10, Scale up to 25.
 *   AI Receptionist, AI EHR and AI RCM: Starter up to 8, Growth up to 25, Scale up to 100.
 *   Use the upper end of the selected range.
 * - Call volume tier: from the selected calls per day, mapped to the lowest band as Starter,
 *   the middle band as Growth, the highest band as Scale. Apply this only when the matched category is AI Receptionist.
 */
export function computeRecommendedTier(
  matchedCategory: PlanCategoryType,
  selectedOptions: string[],
  teamSize?: string | null,
  callVolume?: string | null
): RecommendedTierType {
  // A. Feature tier: lowest tier that includes every selected option in matched category
  let featureTier: RecommendedTierType = "Starter";
  const matchedSelections = (selectedOptions || [])
    .map((name) => FEATURE_MAP.get(name))
    .filter((feat): feat is FeatureRequirementOption => Boolean(feat && feat.category === matchedCategory));

  if (matchedSelections.length > 0) {
    for (const feat of matchedSelections) {
      if (TIER_RANK[feat.minTier] > TIER_RANK[featureTier]) {
        featureTier = feat.minTier;
      }
    }
  }

  // B. Team tier: from selected team size using upper end of range
  let teamUpper = 1;
  const tStr = (teamSize || "").toLowerCase();
  if (tStr.includes("25+") || tStr.includes("25 +") || tStr.includes("100")) {
    teamUpper = 100;
  } else if (tStr.includes("11–25") || tStr.includes("11-25") || tStr.includes("25")) {
    teamUpper = 25;
  } else if (tStr.includes("6–10") || tStr.includes("6-10") || tStr.includes("10")) {
    teamUpper = 10;
  } else if (tStr.includes("2–5") || tStr.includes("2-5") || tStr.includes("5")) {
    teamUpper = 5;
  } else {
    teamUpper = 1; // "Just me (1)"
  }

  let teamTier: RecommendedTierType = "Starter";
  if (matchedCategory === "AI Scribe") {
    // AI Scribe: Starter up to 3, Growth up to 10, Scale up to 25
    if (teamUpper <= 3) {
      teamTier = "Starter";
    } else if (teamUpper <= 10) {
      teamTier = "Growth";
    } else {
      teamTier = "Scale";
    }
  } else {
    // AI Receptionist, AI EHR and AI RCM: Starter up to 8, Growth up to 25, Scale up to 100
    if (teamUpper <= 8) {
      teamTier = "Starter";
    } else if (teamUpper <= 25) {
      teamTier = "Growth";
    } else {
      teamTier = "Scale";
    }
  }

  // C. Call volume tier: only when matched category is AI Receptionist
  let callTier: RecommendedTierType = "Starter";
  if (matchedCategory === "AI Receptionist") {
    const cStr = (callVolume || "").toLowerCase();
    if (cStr.includes("300+") || cStr.includes("300 +")) {
      callTier = "Scale";
    } else if (cStr.includes("25–100") || cStr.includes("25-100") || cStr.includes("100–300") || cStr.includes("100-300")) {
      callTier = "Growth";
    } else {
      callTier = "Starter"; // "Under 25 a day" or "Not sure"
    }
  }

  // Return the highest of the three
  let highestTier = featureTier;
  if (TIER_RANK[teamTier] > TIER_RANK[highestTier]) {
    highestTier = teamTier;
  }
  if (TIER_RANK[callTier] > TIER_RANK[highestTier]) {
    highestTier = callTier;
  }

  return highestTier;
}

/**
 * Normalizes between "AI EHR" / "EHR" and "AI RCM" / "RCM"
 * so that both tab labels and internal category names resolve cleanly.
 */
export function normalizeCategoryToTabName(cat?: string | null): string {
  if (!cat) return "AI Receptionist";
  const clean = cat.trim().toLowerCase();
  if (clean.includes("scribe")) return "AI Scribe";
  if (clean.includes("ehr")) return "EHR";
  if (clean.includes("rcm")) return "RCM";
  return "AI Receptionist";
}

/**
 * Normalizes to standard display name with "AI" prefix for "Free Plan · ..."
 */
export function formatCategoryWithPrefix(cat?: string | null): string {
  if (!cat) return "AI Receptionist";
  const clean = cat.trim().toLowerCase();
  if (clean.includes("scribe")) return "AI Scribe";
  if (clean.includes("ehr")) return "AI EHR";
  if (clean.includes("rcm")) return "AI RCM";
  return "AI Receptionist";
}

/**
 * Checks whether a plan card matches the recommended tier
 */
export function isPlanMatchingRecommendedTier(
  planTierRaw?: string,
  planNameRaw?: string,
  recommendedTier?: string | null
): boolean {
  if (!recommendedTier) return false;
  const rTier = recommendedTier.toLowerCase();
  const pTier = (planTierRaw || "").toLowerCase();
  const pName = (planNameRaw || "").toLowerCase();

  if (rTier === "starter") {
    return pTier === "starter" || pName.includes("starter");
  }
  if (rTier === "growth") {
    return pTier === "growth" || pTier === "professional" || pName.includes("pro") || pName.includes("growth");
  }
  if (rTier === "scale") {
    return pTier === "scale" || pTier === "custom" || pTier === "enterprise" || pName.includes("enterprise") || pName.includes("scale");
  }
  return false;
}
