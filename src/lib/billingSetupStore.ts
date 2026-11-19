/**
 * Billing setup reference stores (Slice 2, item 2.3): billing entity, locations/POS, payers + enrollment,
 * fee schedules, claim defaults, scrub rules and provider credentials. Plain localStorage stores + change events.
 *
 * Nothing here is hard-coded into logic. The SAMPLE_* arrays are sample data, inserted only by
 * seedBillingSetupSamples() ("Load sample templates" / "Enable demo set"); seeding never overwrites edits.
 * All sample data is MOCK data and flagged `sample: true` so the UI can label it.
 */
import { createListStore, createObjectStore, seedMissing } from "./refStore";

export const BILLING_SETUP_EVENT = "mantra_billing_setup_updated";

// ── Types ───────────────────────────────────────────────────────────────────────────────────────

export interface BillingEntity {
  legalName: string;
  dbaName: string;
  ein: string;
  npi: string;
  taxonomy: string;
  address: string;
  phone: string;
  sample?: boolean;
}

export interface BillingLocation {
  id: string;
  name: string;
  /** Place-of-service code, e.g. "11". */
  pos: string;
  address?: string;
  sample?: boolean;
}

export type EnrollmentStatus = "not_started" | "pending" | "enrolled" | "rejected";

export interface EnrollmentFunctionDetail {
  status: EnrollmentStatus;
  submittedAt?: string;
  enrolledAt?: string;
  notes?: string;
}

export interface PayerEnrollment {
  status: EnrollmentStatus;
  eligibility?: EnrollmentFunctionDetail;
  claims?: EnrollmentFunctionDetail;
  era?: EnrollmentFunctionDetail;
  submittedAt?: string;
  enrolledAt?: string;
  notes?: string;
}

export interface Payer {
  id: string;
  name: string;
  payerIdCode: string;
  phone?: string;
  type?: "commercial" | "medicare" | "medicaid" | "other";
  timelyFilingDays?: number;
  active?: boolean;
  enrollment: PayerEnrollment;
  sample?: boolean;
}

export interface FeeScheduleLine {
  cpt: string;
  amount: number;
}

export interface FeeSchedule {
  id: string;
  name: string;
  /** Empty = default schedule for every payer. */
  payerId?: string;
  lines: FeeScheduleLine[];
  sample?: boolean;
}

export interface ClaimDefaults {
  frequencyCode: string;
  defaultPos: string;
  acceptAssignment: boolean;
  timelyFilingDays: number;
  defaultBillingLocationId: string;
  signatureOnFile?: boolean;
  releaseOfInformation?: boolean;
}

export type ScrubSeverity = "error" | "warning";

export interface ScrubRule {
  id: string;
  name: string;
  /** What is checked; interpreted by the scrubber (S4.5): required_field | line_modifier | icd_required | custom */
  check: "required_field" | "line_modifier" | "icd_required" | "billing_entity" | "rendering_npi";
  /** For required_field: claim property name. For line_modifier: CPT the modifier is required for. */
  target?: string;
  severity: ScrubSeverity;
  enabled: boolean;
  message?: string;
  sample?: boolean;
}

export interface ProviderCredential {
  /** Team member id (as string). */
  id: string;
  name?: string;
  npi: string;
  taxonomy: string;
  licenseNumber: string;
  licenseState: string;
  sample?: boolean;
}

// ── Stores ──────────────────────────────────────────────────────────────────────────────────────

const EMPTY_ENTITY: BillingEntity = { legalName: "", dbaName: "", ein: "", npi: "", taxonomy: "", address: "", phone: "" };
const DEFAULT_CLAIM_DEFAULTS: ClaimDefaults = {
  frequencyCode: "1",
  defaultPos: "",
  acceptAssignment: true,
  timelyFilingDays: 90,
  defaultBillingLocationId: "",
  signatureOnFile: true,
  releaseOfInformation: true,
};

/** @deprecated Billing entity: use the Organization record (orgBilling.ts). Kept only so the one-time migration can read it. */
export const billingEntityStore = createObjectStore<BillingEntity>("mantra_billing_entity_v1", BILLING_SETUP_EVENT, EMPTY_ENTITY);
export const claimDefaultsStore = createObjectStore<ClaimDefaults>("mantra_claim_defaults_v1", BILLING_SETUP_EVENT, DEFAULT_CLAIM_DEFAULTS);
/** @deprecated Locations and POS: use the Organization record (orgBilling.ts). Kept only for the one-time migration. */
export const billingLocationsStore = createListStore<BillingLocation>("mantra_billing_locations_v1", BILLING_SETUP_EVENT);
export const payersStore = createListStore<Payer>("mantra_payers_v1", BILLING_SETUP_EVENT);
export const feeSchedulesStore = createListStore<FeeSchedule>("mantra_fee_schedules_v1", BILLING_SETUP_EVENT);
export const scrubRulesStore = createListStore<ScrubRule>("mantra_scrub_rules_v1", BILLING_SETUP_EVENT);
export const providerCredentialsStore = createListStore<ProviderCredential>("mantra_provider_credentials_v1", BILLING_SETUP_EVENT);

export const getPayers = (includeInactive = true) => {
  const all = payersStore.get();
  return includeInactive ? all : all.filter((p) => p.active !== false);
};
export const getActivePayers = () => payersStore.get().filter((p) => p.active !== false);
export const getPayer = (id?: string | null) => (id ? payersStore.find(id) : undefined);

/** Fee for a CPT: the payer's schedule first, else the default (no payer) schedule. */
export function lookupFee(cpt: string, payerId?: string): number | undefined {
  const schedules = feeSchedulesStore.get();
  const ordered = [...schedules.filter((s) => payerId && s.payerId === payerId), ...schedules.filter((s) => !s.payerId)];
  for (const s of ordered) {
    const line = s.lines.find((l) => l.cpt === cpt);
    if (line) return line.amount;
  }
  return undefined;
}

export function getProviderCredential(memberId: string | number): ProviderCredential | undefined {
  return providerCredentialsStore.find(String(memberId));
}

// ── Sample (mock) data ───────────────────────────────────────────────────────────────────────────

const P = (id: string, name: string, code: string, type: Payer["type"], phone?: string, enrolled = true): Payer => ({
  id: `payer-${id}`,
  name,
  payerIdCode: code,
  type,
  phone,
  timelyFilingDays: 90,
  active: true,
  enrollment: enrolled
    ? {
        status: "enrolled",
        eligibility: { status: "enrolled", enrolledAt: "2025-01-15" },
        claims: { status: "enrolled", enrolledAt: "2025-01-15" },
        era: { status: "enrolled", enrolledAt: "2025-01-15" },
        enrolledAt: "2025-01-15",
      }
    : {
        status: "not_started",
        eligibility: { status: "not_started" },
        claims: { status: "not_started" },
        era: { status: "not_started" },
      },
  sample: true,
});

export const SAMPLE_PAYERS: Payer[] = [
  P("bcbs", "Blue Cross Blue Shield", "BCBS1", "commercial", "800-262-2583"),
  P("aetna", "Aetna", "AETNA", "commercial", "800-872-3862"),
  P("uhc", "UnitedHealthcare", "UHC01", "commercial", "877-842-3210"),
  P("cigna", "Cigna", "CIGNA", "commercial", "800-882-4462"),
  P("medicare", "Medicare", "MCARE", "medicare", "800-633-4227"),
  P("medicaid", "Medicaid", "MCAID", "medicaid", "800-562-3022"),
  P("humana", "Humana", "HUMAN", "commercial", "800-448-6262"),
  P("anthem", "Anthem", "ANTHM", "commercial", "800-676-2583"),
  P("kaiser", "Kaiser Permanente", "KAISR", "commercial", "800-464-4000"),
  P("tricare", "Tricare", "TRICR", "other", "800-444-5445"),
  P("molina", "Molina Healthcare", "MOLNA", "medicaid", undefined, false),
  P("centene", "Centene", "CENTN", "commercial", "877-687-1180"),
  P("oscar", "Oscar Health", "OSCAR", "commercial", undefined, false),
  P("emblem", "EmblemHealth", "EMBLM", "commercial", "888-447-7747"),
  P("highmark", "Highmark", "HGHMK", "commercial", "800-547-3627"),
];

export const SAMPLE_LOCATIONS: BillingLocation[] = [
  { id: "loc-sample-main", name: "Main clinic", pos: "11", address: "100 Sample Street", sample: true },
  { id: "loc-sample-branch", name: "Branch clinic", pos: "11", address: "200 Sample Avenue", sample: true },
];

export const SAMPLE_ENTITY: BillingEntity = {
  legalName: "Sample Eye Care Group LLC",
  dbaName: "Sample Eye Care",
  ein: "12-3456789",
  npi: "1234567893",
  taxonomy: "207W00000X",
  address: "100 Sample Street",
  phone: "555-0100",
  sample: true,
};

export const SAMPLE_FEE_SCHEDULES: FeeSchedule[] = [
  {
    id: "fee-sample-default",
    name: "Default fee schedule",
    lines: [
      { cpt: "99214", amount: 150 },
      { cpt: "92014", amount: 180 },
      { cpt: "92134", amount: 95 },
      { cpt: "66984", amount: 2400 },
      { cpt: "70553", amount: 1200 },
      { cpt: "97110", amount: 75 },
    ],
    sample: true,
  },
  {
    id: "fee-sample-bcbs",
    name: "BCBS contracted",
    payerId: "payer-bcbs",
    lines: [
      { cpt: "99214", amount: 120 },
      { cpt: "92014", amount: 140 },
      { cpt: "66984", amount: 1900 },
    ],
    sample: true,
  },
];

export const SAMPLE_SCRUB_RULES: ScrubRule[] = [
  { id: "scrub-sample-icd", name: "At least one diagnosis code", check: "icd_required", severity: "error", enabled: true, message: "Add at least one ICD-10 code", sample: true },
  { id: "scrub-sample-entity", name: "Billing entity is set", check: "billing_entity", severity: "error", enabled: true, message: "Fill in Billing Info on the Organization (legal name and group NPI)", sample: true },
  { id: "scrub-sample-npi", name: "Rendering provider NPI", check: "rendering_npi", severity: "error", enabled: true, message: "Rendering provider NPI is missing", sample: true },
  { id: "scrub-sample-modifier", name: "Laterality modifier on cataract surgery", check: "line_modifier", target: "66984", severity: "error", enabled: true, message: "Add RT/LT modifier", sample: true },
  { id: "scrub-sample-auth", name: "Prior auth number present", check: "required_field", target: "priorAuthNumber", severity: "warning", enabled: false, message: "Prior authorization number is empty", sample: true },
];

/** Three sample providers keyed by the seeded team member ids. */
export const SAMPLE_PROVIDER_CREDENTIALS: ProviderCredential[] = [
  { id: "1", name: "Sample provider 1", npi: "1111111112", taxonomy: "207W00000X", licenseNumber: "LIC-0001", licenseState: "CA", sample: true },
  { id: "2", name: "Sample provider 2", npi: "2222222226", taxonomy: "207WX0009X", licenseNumber: "LIC-0002", licenseState: "CA", sample: true },
  { id: "3", name: "Sample provider 3", npi: "3333333330", taxonomy: "152W00000X", licenseNumber: "LIC-0003", licenseState: "CA", sample: true },
];

/**
 * Insert sample (mock) Billing setup data. Idempotent: list rows are added by id only if missing; the single
 * entity/defaults objects are written only while still empty, so user edits are never overwritten.
 */
export function seedBillingSetupSamples(): { added: number } {
  let added = 0;
  added += seedMissing(payersStore, SAMPLE_PAYERS);
  added += seedMissing(feeSchedulesStore, SAMPLE_FEE_SCHEDULES);
  added += seedMissing(scrubRulesStore, SAMPLE_SCRUB_RULES);
  added += seedMissing(providerCredentialsStore, SAMPLE_PROVIDER_CREDENTIALS);
  // The billing entity and the locations (with their POS) live on the Organization record now (see orgBilling.ts).
  const defaults = claimDefaultsStore.get();
  if (!defaults.defaultPos) {
    claimDefaultsStore.save({ ...defaults, defaultPos: "11" });
    added += 1;
  }
  return { added };
}
