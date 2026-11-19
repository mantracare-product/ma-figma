/**
 * ensureRcmFieldSeeds (Slice 3, item 3.1): registers the eligibility / authorization field groups EG1-EG5 as
 * custom fields in the stored field registry (mantra_field_registry_v1, a module-keyed object), so clinics can
 * attach and edit them like any other field. Keys are namespaced `elig_*` / `auth_*` to avoid colliding with
 * callLogs row keys.
 *
 *   process (instance) : EG1 full, EG2, EG3, EG4 history table, EG5 benefit-lines table  (scoped with processIds)
 *   appointment        : EG1 / EG3 summaries
 *   claim              : EG1 summary at date of service + EG3 auth number / status
 *
 * Idempotent: a field is added only when its key is missing from that module; existing (possibly edited) fields
 * are never touched. The React context re-reads the registry on load/storage events.
 *
 * TODO(rcm): fields are seeded without a section, so drawers show them in the default section; dedicated
 * "Eligibility" / "Authorization" sections are not seeded yet. Status-like fields are plain text until the
 * option-list config is seeded.
 */
import { FIELD_REGISTRY_KEY } from "./fieldRegistryCore";
import { SAMPLE_COVERAGE_PROCESS_ID } from "./rcmSampleIds";
import { DEFAULT_PAYMENT_MODES } from "./paymentMode";

type Mod = "process" | "appointment" | "claim" | "client";

interface SeedField {
  key: string;
  label: string;
  inputType: string;
  subFields?: Array<{ id: string; name: string; inputType: string; options?: any[] }>;
  options?: Array<{ id: string; label: string; value: string }>;
  sectionId?: string;
}

const T = (key: string, label: string, inputType = "text"): SeedField => ({ key, label, inputType });
const TABLE = (key: string, label: string, cols: Array<[string, string, string?]>): SeedField => ({
  key,
  label,
  inputType: "table",
  subFields: cols.map(([id, name, inputType]) => ({ id, name, inputType: inputType || "text" })),
});

export const EG1: SeedField[] = [
  T("elig_status", "Eligibility status"),
  T("elig_payer", "Payer"),
  T("elig_plan", "Plan"),
  T("elig_copay", "Copay", "money"),
  T("elig_deductible_remaining", "Deductible remaining", "money"),
  T("elig_coinsurance", "Coinsurance %", "number"),
  T("elig_oop_remaining", "Out-of-pocket remaining", "money"),
  T("elig_network", "Network"),
  T("elig_plan_begin", "Plan begin", "date"),
  T("elig_plan_end", "Plan end", "date"),
  T("elig_other_payers", "Other payers"),
  T("elig_checked_at", "Checked at", "date_time"),
  T("elig_source", "Source"),
];

export const EG2: SeedField[] = [
  T("elig_reason_code", "Reason code"),
  T("elig_reason_category", "Reason category"),
  T("elig_action_taken", "Action taken"),
  T("elig_attempt", "Attempt #", "number"),
  T("elig_message", "What to fix", "textarea"),
];

export const EG3: SeedField[] = [
  T("auth_required", "Authorization required", "yes_no"),
  T("auth_status", "Authorization status"),
  T("auth_number", "Authorization #"),
  T("auth_units_approved", "Units approved", "number"),
  T("auth_units_used", "Units used", "number"),
  T("auth_valid_from", "Valid from", "date"),
  T("auth_valid_to", "Valid to", "date"),
  T("auth_requested_at", "Requested", "date"),
  T("auth_decided_at", "Decided", "date"),
  T("auth_referring_provider", "Referring provider"),
  T("auth_rule_id", "Rule id"),
];

export const EG4: SeedField = TABLE("elig_history", "Check history", [
  ["checkedAt", "Checked at", "date_time"],
  ["trigger", "Trigger"],
  ["source", "Source"],
  ["status", "Status"],
  ["reasonCode", "Reason code"],
  ["summary", "Summary"],
  ["sourceRecord", "Source record"],
  ["rawRef", "Raw ref"],
]);

export const EG5: SeedField = TABLE("elig_benefits", "Benefit lines", [
  ["serviceType", "Service type"],
  ["kind", "Kind"],
  ["level", "Level"],
  ["network", "Network"],
  ["amount", "Amount / %"],
  ["remaining", "Remaining"],
  ["period", "Period"],
  ["confidence", "Confidence"],
]);

const opts = (...vals: string[]) => vals.map((v) => ({ id: v, label: v.charAt(0).toUpperCase() + v.slice(1), value: v }));
const SEL = (key: string, label: string, values: string[], sectionId?: string): SeedField => ({ key, label, inputType: "list_select", options: opts(...values), sectionId });
const TS = (key: string, label: string, sectionId: string, inputType = "text"): SeedField => ({ key, label, inputType, sectionId });

/** Legacy section ids (R2.2 Insurance tab). Replaced by the single "Insurance" section on the Overview tab. */
export const SEC_BILLING_DEMOGRAPHICS = "sec-billing-demographics";
export const SEC_COVERAGES = "sec-coverages";
export const SEC_INSURANCE = "sec-insurance";
export const SEC_APPT_ELIGIBILITY = "sec-appt-eligibility";
export const SEC_APPT_AUTHORIZATION = "sec-appt-authorization";
export const SEC_CLAIM_RCM = "sec-clm-revenue-cycle";
export const SEC_CLAIM_ELIGIBILITY = "sec-clm-eligibility";
export const SEC_CLAIM_AUTH = "sec-clm-authorization";
export const SEC_CLAIM_BILLING = "sec-clm-billing";

/** Client Overview > Insurance section: the Coverages table (rows sync to the coverages store) + guarantor, self-pay, consents. */
export const CLIENT_FIELDS: SeedField[] = [
  TS("dob", "Date of birth", SEC_INSURANCE, "date"),
  SEL("sex", "Sex", ["female", "male", "other", "unknown"], SEC_INSURANCE),
  TS("address", "Address", SEC_INSURANCE),
  TS("guarantor", "Guarantor", SEC_INSURANCE),
  TS("selfPay", "Self-pay", SEC_INSURANCE, "yes_no"),
  TS("consent_sms", "Consent: SMS", SEC_INSURANCE, "yes_no"),
  TS("consent_voice", "Consent: voice calls", SEC_INSURANCE, "yes_no"),
  TS("consent_cardOnFile", "Consent: card on file", SEC_INSURANCE, "yes_no"),
  {
    key: "ins_coverages",
    label: "Coverages",
    inputType: "table",
    sectionId: SEC_INSURANCE,
    subFields: [
      { id: "payer", name: "Payer", inputType: "list_select" },
      { id: "member_id", name: "Member ID", inputType: "text" },
      { id: "group", name: "Group", inputType: "text" },
      { id: "priority", name: "Priority", inputType: "list_select", options: opts("primary", "secondary", "tertiary") },
      { id: "effective", name: "Effective", inputType: "date" },
      { id: "term", name: "Term", inputType: "date" },
      { id: "subscriber", name: "Subscriber", inputType: "text" },
    ],
  },
];

/** Claim drawer: revenue-cycle facts (assignee, priority, filing deadline, authorization, denial and appeal). */
export const CLAIM_RCM_FIELDS: SeedField[] = [
  TS("rcm_assignee", "Assignee", SEC_CLAIM_RCM),
  SEL("rcm_priority", "Priority", ["low", "normal", "high", "urgent"], SEC_CLAIM_RCM),
  TS("rcm_timely_filing", "Timely filing deadline", SEC_CLAIM_RCM, "date"),
  TS("rcm_auth_status", "Authorization status", SEC_CLAIM_RCM),
  TS("rcm_denial_category", "Denial category", SEC_CLAIM_RCM),
  TS("rcm_denial_summary", "Denial reason", SEC_CLAIM_RCM, "textarea"),
  TS("rcm_appeal_deadline", "Appeal deadline", SEC_CLAIM_RCM, "date"),
  TS("rcm_appeal_draft", "Appeal draft (proposed)", SEC_CLAIM_RCM, "textarea"),
  TS("rcm_scrub_issues", "Scrub issues", SEC_CLAIM_RCM, "textarea"),
];

/** Claim drawer: billing details section. */
export const CLAIM_BILLING_FIELDS: SeedField[] = [
  TS("billing_location", "Billing location", SEC_CLAIM_BILLING),
  TS("place_of_service", "Place of service", SEC_CLAIM_BILLING),
  TS("accept_assignment", "Accept assignment", SEC_CLAIM_BILLING, "yes_no"),
  TS("timely_filing_days", "Timely filing days", SEC_CLAIM_BILLING, "number"),
  TS("signature_on_file", "Signature on file", SEC_CLAIM_BILLING, "yes_no"),
  TS("release_of_information", "Release of information", SEC_CLAIM_BILLING, "yes_no"),
  TS("frequency_code", "Frequency code", SEC_CLAIM_BILLING, "text"),
];

/** Sections registered in the section registry (module -> list). */
const SECTIONS: Array<{ module: "client" | "appointment" | "claim"; id: string; title: string; description: string; iconName: string; fieldKeys: string[] }> = [
  { module: "client", id: SEC_INSURANCE, title: "Insurance", description: "Coverages in priority order, guarantor, self-pay and consents", iconName: "shield", fieldKeys: ["ins_coverages", "guarantor", "selfPay", "consent_sms", "consent_voice", "consent_cardOnFile", "dob", "sex", "address"] },
  { module: "claim", id: SEC_CLAIM_ELIGIBILITY, title: "Eligibility", description: "Result of the insurance check", iconName: "shield", fieldKeys: [...EG1, ...EG2, EG4, EG5].map((f) => f.key) },
  { module: "claim", id: SEC_CLAIM_AUTH, title: "Authorization", description: "Prior authorization for this visit", iconName: "file-text", fieldKeys: EG3.map((f) => f.key) },
  { module: "appointment", id: SEC_APPT_ELIGIBILITY, title: "Eligibility", description: "Latest eligibility result for this visit", iconName: "shield", fieldKeys: ["elig_status", "elig_copay", "elig_deductible_remaining", "elig_checked_at"] },
  { module: "appointment", id: SEC_APPT_AUTHORIZATION, title: "Authorization", description: "Prior authorization for this visit", iconName: "file-text", fieldKeys: ["auth_required", "auth_status", "auth_number"] },
  { module: "claim", id: SEC_CLAIM_RCM, title: "Revenue cycle", description: "Assignee, priority, deadlines, authorization, denial and appeal", iconName: "layers", fieldKeys: CLAIM_RCM_FIELDS.map((f) => f.key) },
  { module: "claim", id: SEC_CLAIM_BILLING, title: "Billing details", description: "Location, place of service, accept assignment, filing deadline, signature and release consents", iconName: "file-text", fieldKeys: CLAIM_BILLING_FIELDS.map((f) => f.key) },
];

const APPT_SECTION_OF: Record<string, string> = { elig_status: SEC_APPT_ELIGIBILITY, elig_copay: SEC_APPT_ELIGIBILITY, elig_deductible_remaining: SEC_APPT_ELIGIBILITY, elig_checked_at: SEC_APPT_ELIGIBILITY, auth_required: SEC_APPT_AUTHORIZATION, auth_status: SEC_APPT_AUTHORIZATION, auth_number: SEC_APPT_AUTHORIZATION };

const APPT_SUMMARY = ["elig_status", "elig_copay", "elig_deductible_remaining", "elig_checked_at", "auth_required", "auth_status", "auth_number"];
const CLAIM_SUMMARY = ["elig_status", "elig_copay", "elig_deductible_remaining", "elig_checked_at", "auth_status", "auth_number"];

const all = [...EG1, ...EG2, ...EG3];
const byKey = (k: string) => all.find((f) => f.key === k)!;

function plan(): Record<Mod, SeedField[]> {
  return {
    process: [...EG1, ...EG2, ...EG3, EG4, EG5],
    appointment: [...APPT_SUMMARY.map(byKey), T("elig_instance_id", "Eligibility instance"), { key: "paymentMode", label: "Payment mode", inputType: "list_select", options: DEFAULT_PAYMENT_MODES }],
    // R4.4: the claim module carries the full eligibility / authorization groups (the insurance record's journey)
    claim: [
      ...[...EG1, ...EG2, EG4, EG5].map((f) => ({ ...f, sectionId: SEC_CLAIM_ELIGIBILITY })),
      ...EG3.map((f) => ({ ...f, sectionId: SEC_CLAIM_AUTH })),
      ...CLAIM_RCM_FIELDS,
      ...CLAIM_BILLING_FIELDS,
    ],
    client: CLIENT_FIELDS,
  };
}

const SEED_ID_BASE = 9_100_000;
const SECTION_KEY = "mantra_section_registry_v1";

function readRegistry(): Record<string, any> {
  try {
    const raw = localStorage.getItem(FIELD_REGISTRY_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (Array.isArray(parsed)) {
      // flat array (self-heals in the context): distribute by module first so we can merge safely
      const obj: Record<string, any[]> = {};
      parsed.forEach((f: any) => (obj[f.module || "client"] ||= []).push(f));
      return obj;
    }
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** Returns the number of fields added. */
export function ensureRcmFieldSeeds(): number {
  const registry = readRegistry();
  const p = plan();
  let added = 0;
  let seq = 0;
  (Object.keys(p) as Mod[]).forEach((mod) => {
    const list: any[] = Array.isArray(registry[mod]) ? registry[mod] : [];
    const have = new Set(list.map((f) => f.key));
    for (const sf of p[mod]) {
      seq += 1;
      if (have.has(sf.key)) continue;
      list.push({
        id: SEED_ID_BASE + (mod === "process" ? 0 : mod === "appointment" ? 1000 : mod === "claim" ? 2000 : 3000) + seq,
        key: sf.key,
        label: sf.label,
        module: mod,
        // ordinary editable custom fields (createdIn "client", never "admin": admin-created fields are shown as templates)
        source: "custom",
        createdIn: "client",
        createdAt: 0,
        inputType: sf.inputType,
        ...(sf.sectionId || (mod === "appointment" && APPT_SECTION_OF[sf.key]) ? { sectionId: sf.sectionId || APPT_SECTION_OF[sf.key] } : {}),
        ...(sf.options ? { options: sf.options, selectionMode: "single" } : {}),
        ...(sf.subFields ? { subFields: sf.subFields, compositeDisplayMode: "table" } : {}),
        ...(mod === "process" ? { processIds: [SAMPLE_COVERAGE_PROCESS_ID] } : {}),
        isReusable: false,
      });
      added += 1;
    }
    registry[mod] = list;
  });
  // earlier builds marked these as admin-created (shown as "Template"): they are ordinary client fields
  for (const m of Object.keys(registry)) {
    for (const f of Array.isArray(registry[m]) ? registry[m] : []) {
      if (typeof f.id === "number" && f.id >= SEED_ID_BASE && f.id < SEED_ID_BASE + 400000 && (f.createdIn === "admin" || f.sampleSeed)) {
        f.createdIn = "client";
        delete f.sampleSeed;
        added += 1;
      }
    }
  }
  // R3.2: the Insurance tab is gone; its two sections are one "Insurance" section on the Overview tab. Existing field
  // definitions are re-pointed (nothing is deleted); the legal-name fields simply stop being placed in a section.
  for (const f of Array.isArray(registry.client) ? registry.client : []) {
    if (f.sectionId === SEC_BILLING_DEMOGRAPHICS || f.sectionId === SEC_COVERAGES) {
      if (f.key === "legalFirstName" || f.key === "legalLastName") delete f.sectionId;
      else f.sectionId = SEC_INSURANCE;
      added += 1;
    }
  }
  // keep the Coverages table's payer options in step with the payers list (only touches our own sub-field)
  try {
    const payers = JSON.parse(localStorage.getItem("mantra_payers_v1") || "[]") as Array<{ id: string; name: string; active?: boolean }>;
    const cov = (registry.client || []).find((f: any) => f.key === "ins_coverages");
    const sub = cov && (cov.subFields || []).find((s: any) => s.id === "payer");
    if (sub && payers.length) {
      const activePayers = payers.filter((p) => p.active !== false);
      const next = activePayers.map((p) => ({ id: p.id, label: p.name, value: p.id }));
      if (JSON.stringify(sub.options || []) !== JSON.stringify(next)) { sub.options = next; added += 1; }
    }
  } catch { /* ignore */ }
  // sections
  try {
    const raw = localStorage.getItem(SECTION_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const secs: Record<string, any[]> = Array.isArray(parsed) ? {} : parsed && typeof parsed === "object" ? parsed : {};
    if (Array.isArray(secs.client) && secs.client.some((x: any) => x.id === SEC_BILLING_DEMOGRAPHICS || x.id === SEC_COVERAGES)) {
      secs.client = secs.client.filter((x: any) => x.id !== SEC_BILLING_DEMOGRAPHICS && x.id !== SEC_COVERAGES);
      added += 1;
    }
    for (const s of SECTIONS) {
      const list: any[] = Array.isArray(secs[s.module]) ? secs[s.module] : [];
      if (!list.some((x) => x.id === s.id)) {
        list.push({ id: s.id, title: s.title, description: s.description, module: s.module, source: "custom", createdIn: "client", iconName: s.iconName, fieldKeys: s.fieldKeys, isReusable: false });
        added += 1;
      }
      secs[s.module] = list;
    }
    localStorage.setItem(SECTION_KEY, JSON.stringify(secs));
  } catch { /* ignore */ }
  if (added > 0) {
    localStorage.setItem(FIELD_REGISTRY_KEY, JSON.stringify(registry));
    try {
      if (typeof window !== "undefined" && typeof window.dispatchEvent === "function" && typeof StorageEvent !== "undefined") {
        window.dispatchEvent(new StorageEvent("storage", { key: FIELD_REGISTRY_KEY }));
      }
    } catch {
      /* best effort */
    }
  }
  return added;
}

export const RCM_FIELD_KEYS = {
  eg1: EG1.map((f) => f.key),
  eg2: EG2.map((f) => f.key),
  eg3: EG3.map((f) => f.key),
  history: EG4.key,
  benefits: EG5.key,
};
