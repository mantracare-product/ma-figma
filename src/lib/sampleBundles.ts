/**
 * Sample bundle plumbing (Slice 2, item 2.6).
 *
 * "Load sample templates" seeds every registered template group (reference data, queue views, field groups,
 * sample processes ...) and loads every registered sample RULE as DISABLED. "Enable demo set X" turns on the
 * sample rules of one capability group. Nothing here runs unless a user presses the button, seeding is idempotent
 * (by id) and never overwrites an edited item; enabling/disabling only flips `enabled`.
 *
 * Later slices register their bundles with registerTemplateSeeder / registerSampleRuleSet from their own files
 * (imported by ./sampleBundlesRegistry).
 */
import { getStoredRules, saveStoredRules, type AutomationRule } from "./useAutomationStore";

export type SampleSetId = "E" | "E2" | "C" | "M";

export interface TemplateSeeder {
  id: string;
  label: string;
  /** Idempotent; returns the number of items added. */
  seed: () => number;
}

export type SampleRuleDef = Omit<AutomationRule, "createdAt" | "updatedAt" | "enabled" | "orgId"> & {
  id: string;
  /** false = a variant: loaded disabled and NOT switched on by "Enable demo set" (the clinic picks one variant). */
  demoDefault?: boolean;
};

interface RuleSet {
  id: SampleSetId;
  label: string;
  description: string;
  rules: () => SampleRuleDef[];
  requires: string[];
}

const seeders: TemplateSeeder[] = [];
const ruleSets = new Map<SampleSetId, RuleSet>();

export function registerTemplateSeeder(s: TemplateSeeder): void {
  const i = seeders.findIndex((x) => x.id === s.id);
  if (i >= 0) seeders[i] = s;
  else seeders.push(s);
}

export function registerSampleRuleSet(set: RuleSet): void {
  ruleSets.set(set.id, set);
}

export const listTemplateSeeders = () => [...seeders];
export const listSampleRuleSets = () => Array.from(ruleSets.values());

/** Sample rules are tagged so they can be told apart from clinic-authored rules. */
const SAMPLE_TAG = "sampleSet";

function asRule(def: SampleRuleDef, setId: SampleSetId, now: string): AutomationRule {
  return {
    orgId: "default",
    enabled: false, // every sample ships disabled
    ...def,
    createdAt: now,
    updatedAt: now,
    [SAMPLE_TAG]: setId,
    source: "template",
  } as AutomationRule;
}

/** Add the set's sample rules that do not exist yet (by id), disabled. Never touches existing rules. */
export function loadSampleRules(setId: SampleSetId): number {
  const set = ruleSets.get(setId);
  if (!set) return 0;
  const current = getStoredRules();
  const have = new Set(current.map((r) => r.id));
  const now = new Date().toISOString();
  // Keep definition order as creation order so ties in `order` resolve predictably.
  const fresh = set.rules().filter((d) => !have.has(d.id)).map((d, i) => asRule(d, setId, new Date(Date.parse(now) + i).toISOString()));
  if (fresh.length) saveStoredRules([...fresh, ...current]);
  return fresh.length;
}

export interface LoadResult {
  seeded: Record<string, number>;
  rules: Record<string, number>;
  total: number;
}

/** "Load sample templates": all seeders + all sample rules (disabled). Idempotent. */
export function loadSampleTemplates(): LoadResult {
  const seeded: Record<string, number> = {};
  const rules: Record<string, number> = {};
  let total = 0;
  for (const s of seeders) {
    try {
      seeded[s.id] = s.seed();
    } catch (e) {
      console.warn(`[sampleBundles] seeder "${s.id}" failed:`, e);
      seeded[s.id] = 0;
    }
    total += seeded[s.id];
  }
  for (const set of ruleSets.values()) {
    rules[set.id] = loadSampleRules(set.id);
    total += rules[set.id];
  }
  return { seeded, rules, total };
}

export interface SetStatus {
  id: SampleSetId;
  label: string;
  description: string;
  loaded: number;
  total: number;
  enabled: number;
}

export function getSampleSetStatus(setId: SampleSetId): SetStatus | undefined {
  const set = ruleSets.get(setId);
  if (!set) return undefined;
  // Status counts the default rules only (variants are opt-in).
  const ids = new Set(set.rules().filter((r) => r.demoDefault !== false).map((r) => r.id));
  const rules = getStoredRules().filter((r) => ids.has(r.id));
  return { id: set.id, label: set.label, description: set.description, loaded: rules.length, total: ids.size, enabled: rules.filter((r) => r.enabled).length };
}

function setEnabled(setId: SampleSetId, enabled: boolean): number {
  const set = ruleSets.get(setId);
  if (!set) return 0;
  // Enabling touches default rules only; disabling turns off every rule of the set, variants included.
  const ids = new Set(set.rules().filter((r) => !enabled || r.demoDefault !== false).map((r) => r.id));
  let changed = 0;
  const next = getStoredRules().map((r) => {
    if (!ids.has(r.id) || r.enabled === enabled) return r;
    changed += 1;
    return { ...r, enabled, updatedAt: new Date().toISOString() };
  });
  if (changed) saveStoredRules(next);
  return changed;
}

/**
 * "Enable demo set": make sure the templates the set needs are loaded, load its rules if missing, then enable them.
 * Returns how many rules were switched on.
 */
export function enableDemoSet(setId: SampleSetId): number {
  const set = ruleSets.get(setId);
  if (!set) return 0;
  for (const id of set.requires) seeders.find((s) => s.id === id)?.seed();
  loadSampleRules(setId);
  return setEnabled(setId, true);
}

export function disableDemoSet(setId: SampleSetId): number {
  return setEnabled(setId, false);
}

export function isSampleRule(r: AutomationRule): boolean {
  return !!(r as any)[SAMPLE_TAG];
}
