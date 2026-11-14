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

export interface Payer {
  id: string;
  name: string;
  payerIdCode: string;
  phone?: string;
  type?: "commercial" | "medicare" | "medicaid" | "other";
  enrollment: { status: EnrollmentStatus; submittedAt?: string; enrolledAt?: string; notes?: string };
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
};

export const billingEntityStore = createObjectStore<BillingEntity>("mantra_billing_entity_v1", BILLING_SETUP_EVENT, EMPTY_ENTITY);
export const claimDefaultsStore = createObjectStore<ClaimDefaults>("mantra_claim_defaults_v1", BILLING_SETUP_EVENT, DEFAULT_CLAIM_DEFAULTS);
export const billingLocationsStore = createListStore<BillingLocation>("mantra_billing_locations_v1", BILLING_SETUP_EVENT);
export const payersStore = createListStore<Payer>("mantra_payers_v1", BILLING_SETUP_EVENT);
export const feeSchedulesStore = createListStore<FeeSchedule>("mantra_fee_schedules_v1", BILLING_SETUP_EVENT);
export const scrubRulesStore = createListStore<ScrubRule>("mantra_scrub_rules_v1", BILLING_SETUP_EVENT);
export const providerCredentialsStore = createListStore<ProviderCredential>("mantra_provider_credentials_v1", BILLING_SETUP_EVENT);

export const getPayers = () => payersStore.get();
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

const P = (id: string, name: string, code: string, type: Payer["type"], enrolled = true): Payer => ({
  id: `payer-${id}`,
  name,
  payerIdCode: code,
  type,
  phone: "800-555-0100",
  enrollment: enrolled ? { status: "enrolled", enrolledAt: "2025-01-15" } : { status: "not_started" },
  sample: true,
});

export const SAMPLE_PAYERS: Payer[] = [
  P("bcbs", "Blue Cross Blue Shield (Sample)", "BCBS1", "commercial"),
  P("aetna", "Aetna (Sample)", "AETNA", "commercial"),
  P("uhc", "UnitedHealthcare (Sample)", "UHC01", "commercial"),
  P("cigna", "Cigna (Sample)", "CIGNA", "commercial"),
  P("medicare", "Medicare (Sample)", "MCARE", "medicare"),
  P("medicaid", "Medicaid (Sample)", "MCAID", "medicaid"),
  P("humana", "Humana (Sample)", "HUMAN", "commercial"),
  P("anthem", "Anthem (Sample)", "ANTHM", "commercial"),
  P("kaiser", "Kaiser Permanente (Sample)", "KAISR", "commercial"),
  P("tricare", "Tricare (Sample)", "TRICR", "other"),
  P("molina", "Molina Healthcare (Sample)", "MOLNA", "medicaid", false),
  P("centene", "Centene (Sample)", "CENTN", "commercial"),
  P("oscar", "Oscar Health (Sample)", "OSCAR", "commercial", false),
  P("emblem", "EmblemHealth (Sample)", "EMBLM", "commercial"),
  P("highmark", "Highmark (Sample)", "HGHMK", "commercial"),
];

export const SAMPLE_LOCATIONS: BillingLocation[] = [
  { id: "loc-sample-main", name: "Main clinic (Sample)", pos: "11", address: "100 Sample Street", sample: true },
  { id: "loc-sample-branch", name: "Branch clinic (Sample)", pos: "11", address: "200 Sample Avenue", sample: true },
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
    name: "Default fee schedule (Sample)",
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
    name: "BCBS contracted (Sample)",
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
  { id: "scrub-sample-entity", name: "Billing entity is set", check: "billing_entity", severity: "error", enabled: true, message: "Fill in Billing setup > Billing entity", sample: true },
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
  added += seedMissing(billingLocationsStore, SAMPLE_LOCATIONS);
  added += seedMissing(feeSchedulesStore, SAMPLE_FEE_SCHEDULES);
  added += seedMissing(scrubRulesStore, SAMPLE_SCRUB_RULES);
  added += seedMissing(providerCredentialsStore, SAMPLE_PROVIDER_CREDENTIALS);
  const entity = billingEntityStore.get();
  if (!entity.legalName && !entity.ein && !entity.npi) {
    billingEntityStore.save({ ...SAMPLE_ENTITY });
    added += 1;
  }
  const defaults = claimDefaultsStore.get();
  if (!defaults.defaultPos && !defaults.defaultBillingLocationId) {
    claimDefaultsStore.save({ ...defaults, defaultPos: "11", defaultBillingLocationId: SAMPLE_LOCATIONS[0].id });
    added += 1;
  }
  return { added };
}
