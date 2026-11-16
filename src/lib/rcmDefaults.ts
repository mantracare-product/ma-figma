/**
 * RCM defaults (R2.3). The revenue-cycle starting set (claim workflows and stages, queue views, automation rules A1-A30,
 * payers and prior-auth rules, message templates, field groups) is created ONCE per workspace as ordinary, editable items.
 * There is no "demo set" switch: users edit, disable or delete these like anything they created themselves, and
 * they are never re-created or overwritten afterwards (guarded by a flag, and every seeder is idempotent by id).
 *
 * Rules ship ENABLED, except:
 *  - alternates of a choice (e.g. the three other moments to create a claim: the clinic enables the one it wants), and
 *  - rules whose actions reach outside the clinic on their own (message a patient, place a call, submit a claim to a payer);
 *    those stay off until the clinic turns them on.
 */
import "./sampleBundlesRegistry";
import "./sampleRuleSets";
import { listSampleRuleSets, listTemplateSeeders, loadSampleRules, type SampleRuleDef } from "./sampleBundles";
import { getStoredRules, saveStoredRules } from "./useAutomationStore";

export const RCM_DEFAULTS_FLAG = "mantra_rcm_defaults_v1";

/** Steps that act outside the clinic without a person looking first. */
export const OUTBOUND_STEPS = ["send_message", "start_call", "submit_claim"];

/** Groups that are demo content for the demo org only (not part of the product starting set). */
const SKIP_SEEDERS = new Set(["coverages", "sample-roles"]);

export function isUnsafeByDefault(def: SampleRuleDef): boolean {
  return (def.actions || []).some((a: any) => OUTBOUND_STEPS.includes(a.stepKey));
}

export interface DefaultsResult {
  already: boolean;
  seeded: number;
  rules: number;
  enabled: number;
}

export function ensureRcmDefaults(): DefaultsResult {
  let flagged = false;
  try { flagged = localStorage.getItem(RCM_DEFAULTS_FLAG) === "1"; } catch { /* ignore */ }
  if (flagged) return { already: true, seeded: 0, rules: 0, enabled: 0 };

  let seeded = 0;
  for (const s of listTemplateSeeders()) {
    if (SKIP_SEEDERS.has(s.id)) continue;
    try { seeded += s.seed(); } catch (e) { console.warn(`[rcmDefaults] seeder "${s.id}" failed:`, e); }
  }

  let rules = 0;
  let enabled = 0;
  for (const set of listSampleRuleSets()) {
    const defs = set.rules();
    const before = new Set(getStoredRules().map((r) => r.id));
    rules += loadSampleRules(set.id);
    const turnOn = new Set(defs.filter((d) => !before.has(d.id) && d.demoDefault !== false && !isUnsafeByDefault(d)).map((d) => d.id));
    if (turnOn.size) {
      const now = new Date().toISOString();
      saveStoredRules(getStoredRules().map((r) => (turnOn.has(r.id) && !r.enabled ? (enabled++, { ...r, enabled: true, updatedAt: now }) : r)));
    }
  }
  try { localStorage.setItem(RCM_DEFAULTS_FLAG, "1"); } catch { /* ignore */ }
  return { already: false, seeded, rules, enabled };
}
