/**
 * Eligibility building blocks (Slice 3, item 3.2): mock payer adapter with AAA-style reason codes, the reason
 * resolver and the benefit normalizer. Pure functions + one tiny settings store; no UI, no engine.
 *
 * ALL results from the adapter are MOCK data (source: "mock").
 */
import { createObjectStore } from "./refStore";

// ── Mock adapter ────────────────────────────────────────────────────────────────────────────────

export type MockScenario = "auto" | "active" | "inactive" | "not_found" | "provider_not_enrolled" | "payer_down" | "timeout";

export const ELIGIBILITY_SETTINGS_EVENT = "mantra_eligibility_settings_updated";
export const eligibilitySettingsStore = createObjectStore<{ scenario: MockScenario }>(
  "mantra_eligibility_settings_v1",
  ELIGIBILITY_SETTINGS_EVENT,
  { scenario: "auto" }
);
export const getMockScenario = (): MockScenario => eligibilitySettingsStore.get().scenario || "auto";
export const setMockScenario = (scenario: MockScenario) => eligibilitySettingsStore.save({ scenario });

export interface EligibilityRequest {
  payerId: string;
  payerEnrolled?: boolean;
  memberId: string;
  firstName?: string;
  lastName?: string;
  dob?: string;
  serviceDate: string;
  serviceTypes: string[];
  /** 0-based attempt/variant number (the resolver may change the request between attempts). */
  attempt?: number;
  /** Forces a scenario for this call (otherwise the stored mock scenario is used). */
  scenario?: MockScenario;
}

export interface RawBenefit {
  /** X12-like service type code, e.g. "30" (general), "98" (professional visit), "AL" (vision). */
  serviceType: string;
  /** "copay" | "coinsurance" | "deductible" | "oop" | "limitation" | "active" | "inactive" */
  kind: string;
  level?: "individual" | "family";
  network?: "in" | "out";
  amount?: number;
  percent?: number;
  remaining?: number;
  period?: string;
}

export interface EligibilityResponse {
  /** "response" = payer answered; "transport_error" = no usable answer (timeout, 5xx). */
  kind: "response" | "transport_error";
  active?: boolean;
  /** AAA-style rejection code when the payer could not process the inquiry. */
  aaaCode?: string;
  planName?: string;
  planBegin?: string;
  planEnd?: string;
  otherPayers?: string[];
  benefits?: RawBenefit[];
  error?: string;
  source: "mock";
}

const ACTIVE_BENEFITS: RawBenefit[] = [
  { serviceType: "30", kind: "active", level: "individual", network: "in" },
  { serviceType: "98", kind: "copay", level: "individual", network: "in", amount: 30 },
  { serviceType: "AL", kind: "copay", level: "individual", network: "in", amount: 20 },
  { serviceType: "30", kind: "deductible", level: "individual", network: "in", amount: 1500, remaining: 600, period: "calendar year" },
  { serviceType: "30", kind: "coinsurance", level: "individual", network: "in", percent: 20 },
  { serviceType: "30", kind: "oop", level: "individual", network: "in", amount: 5000, remaining: 3200, period: "calendar year" },
];

/** Mock payer call. Deterministic: the scenario decides, and "auto" derives the answer from the request. */
export function mockEligibilityCheck(req: EligibilityRequest): EligibilityResponse {
  const scenario = req.scenario || getMockScenario();
  const member = String(req.memberId || "").toUpperCase();
  const base = { source: "mock" as const, planName: "Sample PPO", planBegin: "2025-01-01", planEnd: "2025-12-31", otherPayers: [] as string[] };

  const s: MockScenario =
    scenario !== "auto"
      ? scenario
      : member.includes("NOTFOUND")
      ? "not_found"
      : member.includes("INACTIVE")
      ? "inactive"
      : member.includes("DOWN")
      ? "payer_down"
      : member.includes("TIMEOUT")
      ? "timeout"
      : req.payerEnrolled === false
      ? "provider_not_enrolled"
      : "active";

  switch (s) {
    case "active":
      return { ...base, kind: "response", active: true, benefits: ACTIVE_BENEFITS };
    case "inactive":
      return { ...base, kind: "response", active: false, benefits: [{ serviceType: "30", kind: "inactive" }] };
    case "not_found":
      return { ...base, kind: "response", aaaCode: "75" };
    case "provider_not_enrolled":
      return { ...base, kind: "response", aaaCode: "43" };
    case "payer_down":
      return { ...base, kind: "response", aaaCode: "95" };
    case "timeout":
    default:
      return { ...base, kind: "transport_error", error: "Request timed out" };
  }
}

// ── Resolver ────────────────────────────────────────────────────────────────────────────────────

export type ResultStatus = "active" | "inactive" | "not_found" | "provider_setup" | "inconclusive" | "no_coverage";
export type ReasonCategory = "name_dob_id" | "provider_setup" | "payer_unavailable" | "inactive" | "transport" | "none";

export interface Resolution {
  status: ResultStatus;
  category: ReasonCategory;
  code?: string;
  /** What was done / what the user should do. */
  action: string;
  message: string;
  /** Another attempt with a changed request is worthwhile. */
  retry: boolean;
}

/** AAA reject reasons we recognise (subset). Unknown codes resolve to "inconclusive". */
export const AAA_REASONS: Record<string, { category: ReasonCategory; text: string; retry?: boolean }> = {
  "15": { category: "name_dob_id", text: "Required application data missing" },
  "33": { category: "name_dob_id", text: "Input errors" },
  "58": { category: "name_dob_id", text: "Invalid / missing date of birth" },
  "64": { category: "name_dob_id", text: "Invalid / missing patient ID" },
  "65": { category: "name_dob_id", text: "Invalid / missing patient name" },
  "67": { category: "name_dob_id", text: "Patient not found" },
  "71": { category: "name_dob_id", text: "Patient date of birth does not match" },
  "72": { category: "name_dob_id", text: "Invalid / missing subscriber ID" },
  "73": { category: "name_dob_id", text: "Invalid / missing subscriber name" },
  "74": { category: "name_dob_id", text: "Invalid / missing subscriber name or date of birth" },
  "75": { category: "name_dob_id", text: "Subscriber / insured not found", retry: true },
  "76": { category: "name_dob_id", text: "Duplicate subscriber ID" },
  "77": { category: "name_dob_id", text: "Subscriber found, patient not found" },
  "78": { category: "name_dob_id", text: "Subscriber not in group / plan" },
  "41": { category: "provider_setup", text: "Authorization / access restrictions" },
  "43": { category: "provider_setup", text: "Invalid / missing provider identification" },
  "44": { category: "provider_setup", text: "Invalid / missing provider name" },
  "51": { category: "provider_setup", text: "Provider not on file" },
  "79": { category: "provider_setup", text: "Invalid participant identification" },
  "42": { category: "payer_unavailable", text: "Unable to respond at current time", retry: true },
  "80": { category: "payer_unavailable", text: "No response received", retry: true },
  "95": { category: "payer_unavailable", text: "Payer system unavailable", retry: true },
  "98": { category: "payer_unavailable", text: "Payer experiencing technical difficulties", retry: true },
};

/** Turn a payer response into a status, category and the next step. */
export function resolveEligibilityResponse(res: EligibilityResponse): Resolution {
  if (res.kind === "transport_error") {
    return { status: "inconclusive", category: "transport", action: "retry", message: res.error || "No usable answer from the payer", retry: true };
  }
  if (res.aaaCode) {
    const r = AAA_REASONS[res.aaaCode];
    if (!r) return { status: "inconclusive", category: "payer_unavailable", code: res.aaaCode, action: "review", message: `Unrecognised payer reject ${res.aaaCode}`, retry: false };
    const status: ResultStatus = r.category === "name_dob_id" ? "not_found" : r.category === "provider_setup" ? "provider_setup" : "inconclusive";
    const action =
      r.category === "name_dob_id" ? "Fix name, date of birth or member ID on the client's Insurance tab"
      : r.category === "provider_setup" ? "Check the provider's enrollment with this payer"
      : "Payer unavailable, will retry";
    return { status, category: r.category, code: res.aaaCode, action, message: r.text, retry: !!r.retry };
  }
  if (res.active === false) {
    return { status: "inactive", category: "inactive", action: "Update insurance with the patient", message: "Coverage is inactive", retry: false };
  }
  return { status: "active", category: "none", action: "none", message: "Coverage active", retry: false };
}

/** Variants tried between attempts: 0 as given, 1 without dashes/spaces in the member id, 2 with the leading prefix removed. */
export function requestVariant(req: EligibilityRequest, attempt: number): EligibilityRequest {
  if (attempt <= 0) return { ...req, attempt: 0 };
  const stripped = String(req.memberId || "").replace(/[\s-]/g, "");
  if (attempt === 1) return { ...req, memberId: stripped, attempt };
  return { ...req, memberId: stripped.replace(/^[A-Za-z]{3}/, ""), attempt };
}

// ── Benefit normalizer ────────────────────────────────────────────────────────────────────────────

export interface BenefitLine {
  serviceType: string;
  kind: string;
  level: string;
  network: string;
  amount: string;
  remaining: string;
  period: string;
  confidence: string;
}

export interface BenefitSummary {
  copay?: number;
  deductibleRemaining?: number;
  coinsurancePercent?: number;
  oopRemaining?: number;
  network?: string;
}

/**
 * Normalize raw benefits into table lines + one summary. For the summary, in-network individual lines win, and the
 * copay prefers a service type listed in `serviceTypes` (first match), else the general (30) line.
 */
export function normalizeBenefits(raw: RawBenefit[] = [], serviceTypes: string[] = []): { lines: BenefitLine[]; summary: BenefitSummary } {
  const lines: BenefitLine[] = raw.map((b) => ({
    serviceType: b.serviceType,
    kind: b.kind,
    level: b.level || "individual",
    network: b.network || "in",
    amount: b.percent !== undefined ? `${b.percent}%` : b.amount !== undefined ? String(b.amount) : "",
    remaining: b.remaining !== undefined ? String(b.remaining) : "",
    period: b.period || "",
    confidence: "payer response",
  }));
  const pick = (kind: string, types: string[]) => {
    const inNet = raw.filter((b) => b.kind === kind && (b.network || "in") === "in" && (b.level || "individual") === "individual");
    for (const t of types) {
      const hit = inNet.find((b) => b.serviceType === t);
      if (hit) return hit;
    }
    return inNet[0];
  };
  const copay = pick("copay", [...serviceTypes, "30"]);
  const ded = pick("deductible", ["30"]);
  const coins = pick("coinsurance", [...serviceTypes, "30"]);
  const oop = pick("oop", ["30"]);
  return {
    lines,
    summary: {
      copay: copay?.amount,
      deductibleRemaining: ded?.remaining,
      coinsurancePercent: coins?.percent,
      oopRemaining: oop?.remaining,
      network: copay?.network || ded?.network || "in",
    },
  };
}
