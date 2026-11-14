/**
 * CARC / RARC categorization (Slice 5, item 5.2). A subset of claim adjustment reason codes, grouped into the
 * categories the denial workflow acts on. Unknown codes fall back to "other" (needs human review).
 */
export type DenialCategory = "patient_responsibility" | "contractual" | "correctable" | "appealable" | "timely_filing" | "coverage" | "other";

export interface CarcInfo {
  category: DenialCategory;
  text: string;
}

export const CARC: Record<string, CarcInfo> = {
  "1": { category: "patient_responsibility", text: "Deductible amount" },
  "2": { category: "patient_responsibility", text: "Coinsurance amount" },
  "3": { category: "patient_responsibility", text: "Co-payment amount" },
  "45": { category: "contractual", text: "Charge exceeds the fee schedule / maximum allowable" },
  "253": { category: "contractual", text: "Sequestration reduction" },
  "4": { category: "correctable", text: "Procedure code inconsistent with the modifier or a required modifier is missing" },
  "16": { category: "correctable", text: "Claim lacks information needed for adjudication" },
  "18": { category: "correctable", text: "Exact duplicate claim / service" },
  "22": { category: "correctable", text: "Care may be covered by another payer (coordination of benefits)" },
  "50": { category: "appealable", text: "Not deemed a medical necessity by the payer" },
  "96": { category: "appealable", text: "Non-covered charge(s)" },
  "97": { category: "appealable", text: "Benefit included in the payment for another service (bundled)" },
  "119": { category: "appealable", text: "Benefit maximum for this time period has been reached" },
  "197": { category: "appealable", text: "Precertification / authorization absent" },
  "29": { category: "timely_filing", text: "The time limit for filing has expired" },
  "27": { category: "coverage", text: "Expenses incurred after coverage terminated" },
  "31": { category: "coverage", text: "Patient cannot be identified as our insured" },
  "109": { category: "coverage", text: "Claim not covered by this payer / contractor" },
};

export const RARC: Record<string, string> = {
  N130: "Consult plan benefit documents for information about restrictions for this service",
  N522: "Duplicate of a claim processed or in process as a crossover claim",
  M51: "Missing / incomplete / invalid procedure code(s)",
};

export interface DenialAssessment {
  category: DenialCategory;
  /** Codes that drove the category, as "CO-97". */
  codes: string[];
  /** What the clinic can do next. */
  next: "appeal" | "correct_and_resubmit" | "bill_patient" | "write_off" | "review";
  summary: string;
}

const PRIORITY: DenialCategory[] = ["timely_filing", "coverage", "correctable", "appealable", "other", "patient_responsibility", "contractual"];

/** Categorize a denial from its adjustments. The most actionable category present wins. */
export function categorizeDenial(adjustments: Array<{ group: string; carc: string; rarc?: string }>): DenialAssessment {
  const found = adjustments.map((a) => ({ a, info: CARC[a.carc] || { category: "other" as DenialCategory, text: `Unrecognised reason ${a.carc}` } }));
  const category = PRIORITY.find((p) => found.some((f) => f.info.category === p)) || "other";
  const driving = found.filter((f) => f.info.category === category);
  const next: DenialAssessment["next"] =
    category === "appealable" ? "appeal"
    : category === "correctable" ? "correct_and_resubmit"
    : category === "patient_responsibility" ? "bill_patient"
    : category === "timely_filing" || category === "coverage" ? "write_off"
    : category === "contractual" ? "write_off"
    : "review";
  return {
    category,
    codes: found.map((f) => `${f.a.group}-${f.a.carc}`),
    next,
    summary: driving.map((f) => f.info.text).join("; ") || "Needs review",
  };
}
