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

type Mod = "process" | "appointment" | "claim";

interface SeedField {
  key: string;
  label: string;
  inputType: string;
  subFields?: Array<{ id: string; name: string; inputType: string }>;
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

const APPT_SUMMARY = ["elig_status", "elig_copay", "elig_deductible_remaining", "elig_checked_at", "auth_required", "auth_status", "auth_number"];
const CLAIM_SUMMARY = ["elig_status", "elig_copay", "elig_deductible_remaining", "elig_checked_at", "auth_status", "auth_number"];

const all = [...EG1, ...EG2, ...EG3];
const byKey = (k: string) => all.find((f) => f.key === k)!;

function plan(): Record<Mod, SeedField[]> {
  return {
    process: [...EG1, ...EG2, ...EG3, EG4, EG5],
    appointment: [...APPT_SUMMARY.map(byKey), T("elig_instance_id", "Eligibility instance")],
    claim: CLAIM_SUMMARY.map(byKey),
  };
}

const SEED_ID_BASE = 9_100_000;

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
        id: SEED_ID_BASE + (mod === "process" ? 0 : mod === "appointment" ? 1000 : 2000) + seq,
        key: sf.key,
        label: sf.label,
        module: mod,
        source: "custom",
        createdIn: "admin",
        createdAt: 0,
        inputType: sf.inputType,
        ...(sf.subFields ? { subFields: sf.subFields, compositeDisplayMode: "table" } : {}),
        ...(mod === "process" ? { processIds: [SAMPLE_COVERAGE_PROCESS_ID] } : {}),
        isReusable: false,
        sampleSeed: true,
      });
      added += 1;
    }
    registry[mod] = list;
  });
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
