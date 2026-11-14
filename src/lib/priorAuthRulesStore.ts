/**
 * Prior-auth rules (Slice 3, item 3.3): which payer x service combinations need authorization.
 * Plain localStorage store managed in Billing setup > Payers. The 8 sample rows are MOCK data seeded only by
 * seedPriorAuthRuleSamples() ("Load sample templates").
 */
import { createListStore, seedMissing } from "./refStore";

export const PRIOR_AUTH_RULES_EVENT = "mantra_prior_auth_rules_updated";

export interface PriorAuthRule {
  id: string;
  payerId: string;
  serviceId?: string | number;
  cptCode?: string;
  required: boolean;
  units?: number;
  validityDays?: number;
  notes?: string;
  sample?: boolean;
}

export const priorAuthRulesStore = createListStore<PriorAuthRule>("mantra_prior_auth_rules_v1", PRIOR_AUTH_RULES_EVENT);

export const getRules = () => priorAuthRulesStore.get();
export const saveRule = (r: PriorAuthRule) => priorAuthRulesStore.upsert(r);
export const deleteRule = (id: string) => priorAuthRulesStore.remove(id);

/** The most specific rule for a payer + service: serviceId match, else CPT match. */
export function getRule(payerId: string, service: { serviceId?: string | number; cptCode?: string }): PriorAuthRule | undefined {
  const rules = priorAuthRulesStore.get().filter((r) => r.payerId === payerId);
  const bySvc = service.serviceId !== undefined && service.serviceId !== "" ? rules.find((r) => r.serviceId !== undefined && String(r.serviceId) === String(service.serviceId)) : undefined;
  if (bySvc) return bySvc;
  return service.cptCode ? rules.find((r) => !!r.cptCode && r.cptCode === service.cptCode) : undefined;
}

export interface AuthRequirement {
  /** true | false | "unknown" (no rule and no per-service default). */
  required: boolean | "unknown";
  rule?: PriorAuthRule;
  /** "rule" | "service_default" | "none" */
  source: "rule" | "service_default" | "none";
}

/** Rule first, then the service's own default (`requiresAuthDefault`), else unknown. */
export function isAuthRequired(
  payerId: string | undefined,
  service: { serviceId?: string | number; cptCode?: string; requiresAuthDefault?: boolean }
): AuthRequirement {
  const rule = payerId ? getRule(payerId, service) : undefined;
  if (rule) return { required: rule.required, rule, source: "rule" };
  if (service.requiresAuthDefault !== undefined) return { required: service.requiresAuthDefault, source: "service_default" };
  return { required: "unknown", source: "none" };
}

const S = (id: string, payerId: string, cptCode: string, required: boolean, units?: number, validityDays?: number, notes?: string): PriorAuthRule => ({
  id: `pa-sample-${id}`, payerId, cptCode, required, units, validityDays, notes, sample: true,
});

export const SAMPLE_PRIOR_AUTH_RULES: PriorAuthRule[] = [
  S("bcbs-99214", "payer-bcbs", "99214", false),
  S("bcbs-70553", "payer-bcbs", "70553", true, 1, 60),
  S("aetna-70553", "payer-aetna", "70553", true, 1, 90),
  S("uhc-97110", "payer-uhc", "97110", true, 12, 30),
  S("cigna-66984", "payer-cigna", "66984", true, 1, 60),
  S("medicare-99214", "payer-medicare", "99214", false),
  S("medicare-70553", "payer-medicare", "70553", false),
  S("medicaid-66984", "payer-medicaid", "66984", true, 1, 30, "state form"),
];

export function seedPriorAuthRuleSamples(): number {
  return seedMissing(priorAuthRulesStore, SAMPLE_PRIOR_AUTH_RULES);
}
