/**
 * Client coverages (Slice 2, item 2.4): the insurance reference table for each client, plus typed demographics.
 * Saving or removing a coverage emits `coverage.updated` (trigger for eligibility re-checks, sample rule A3).
 */
import { createListStore, newId, seedMissing } from "./refStore";
import { eventBus } from "./eventBus";
import { getStoredClients, saveStoredClients } from "./clientsStore";

export const COVERAGES_EVENT = "mantra_coverages_updated";

export type CoveragePriority = "primary" | "secondary" | "tertiary";

export interface Coverage {
  id: string;
  clientId: string;
  payerId: string;
  memberId: string;
  groupNumber?: string;
  planName?: string;
  priority: CoveragePriority;
  subscriberName?: string;
  subscriberRelationship?: "self" | "spouse" | "child" | "other";
  subscriberDob?: string;
  effectiveDate?: string; // YYYY-MM-DD
  termDate?: string; // YYYY-MM-DD, empty = open ended
  cardFront?: string;
  cardBack?: string;
  sample?: boolean;
}

export const coveragesStore = createListStore<Coverage>("mantra_coverages_v1", COVERAGES_EVENT);

const ORDER: CoveragePriority[] = ["primary", "secondary", "tertiary"];

export function getCoveragesForClient(clientId: string): Coverage[] {
  return coveragesStore
    .get()
    .filter((c) => c.clientId === clientId)
    .sort((a, b) => ORDER.indexOf(a.priority) - ORDER.indexOf(b.priority));
}

/** Is the coverage in force on `date` (YYYY-MM-DD)? Missing dates are open ended. */
export function isCoverageActiveOn(c: Coverage, date: string): boolean {
  if (c.effectiveDate && date < c.effectiveDate) return false;
  if (c.termDate && date > c.termDate) return false;
  return true;
}

/** The coverage of the given priority in force on `date` (default: primary, today). */
export function getCoverageOn(clientId: string, date: string = new Date().toISOString().slice(0, 10), priority: CoveragePriority = "primary"): Coverage | undefined {
  return getCoveragesForClient(clientId).find((c) => c.priority === priority && isCoverageActiveOn(c, date));
}

export function getPrimaryCoverage(clientId: string, date?: string): Coverage | undefined {
  return getCoverageOn(clientId, date, "primary");
}

export interface SaveCoverageResult {
  coverage: Coverage;
  /** Coverages of the same client that were demoted because this one took their priority. */
  demoted: string[];
}

/**
 * Save a coverage. A client has at most one coverage per priority: taking an occupied priority moves the
 * previous holder down one level (primary -> secondary -> tertiary; a tertiary holder is dropped to the end as
 * "tertiary" only if free, otherwise it is removed). Emits `coverage.updated`.
 */
export function saveCoverage(input: Omit<Coverage, "id"> & { id?: string }): SaveCoverageResult {
  const coverage: Coverage = { ...input, id: input.id || newId("cov"), sample: input.sample ?? false };
  const demoted: string[] = [];
  let list = coveragesStore.get().filter((c) => c.id !== coverage.id);
  const clash = list.find((c) => c.clientId === coverage.clientId && c.priority === coverage.priority);
  if (clash) {
    const next = ORDER[ORDER.indexOf(clash.priority) + 1];
    if (next && !list.some((c) => c.clientId === coverage.clientId && c.priority === next)) {
      list = list.map((c) => (c.id === clash.id ? { ...c, priority: next } : c));
      demoted.push(clash.id);
    } else {
      list = list.filter((c) => c.id !== clash.id);
    }
  }
  coveragesStore.save([...list, coverage]);
  void eventBus.emit("coverage.updated", "client", coverage.clientId, { clientId: coverage.clientId, coverageId: coverage.id });
  return { coverage, demoted };
}

export function removeCoverage(id: string): void {
  const existing = coveragesStore.find(id);
  coveragesStore.remove(id);
  if (existing) void eventBus.emit("coverage.updated", "client", existing.clientId, { clientId: existing.clientId, coverageId: id, removed: true });
}

// ── Typed client demographics ──────────────────────────────────────────────────────────────────

export interface ClientDemographics {
  legalFirstName?: string;
  legalLastName?: string;
  dob?: string;
  sex?: "male" | "female" | "other" | "unknown";
  address?: string;
  guarantor?: string;
  selfPay?: boolean;
  consents?: { sms?: boolean; voice?: boolean; cardOnFile?: boolean };
}

export const DEMOGRAPHIC_KEYS: Array<keyof ClientDemographics> = [
  "legalFirstName", "legalLastName", "dob", "sex", "address", "guarantor", "selfPay", "consents",
];

export function getClientDemographics(clientId: string): ClientDemographics {
  const c: any = (getStoredClients() as any[]).find((x) => x.id === clientId) || {};
  const out: ClientDemographics = {};
  for (const k of DEMOGRAPHIC_KEYS) if (c[k] !== undefined) (out as any)[k] = c[k];
  return out;
}

export function saveClientDemographics(clientId: string, patch: ClientDemographics): boolean {
  const clients = getStoredClients() as any[];
  if (!clients.some((c) => c.id === clientId)) return false;
  saveStoredClients(clients.map((c) => (c.id === clientId ? { ...c, ...patch } : c)) as any);
  return true;
}

// ── Sample (mock) data ───────────────────────────────────────────────────────────────────────────

const SAMPLE_PAYER_IDS = ["payer-bcbs", "payer-aetna", "payer-uhc", "payer-cigna", "payer-medicare", "payer-medicaid"];

/**
 * Mock coverages + demographics for clients whose contact type is "Client" (up to `limit`; canonicalClients holds 20).
 * Idempotent (rows keyed by client id); demographics are only filled where empty, never overwritten.
 */
export function seedCoverageSamples(limit = 40): { coverages: number; clients: number } {
  const clients = (getStoredClients() as any[]).filter((c) => c.contactType === "Client" || c.contact_type === "Client").slice(0, limit);
  const rows: Coverage[] = clients.map((c, i) => {
    const parts = String(c.name || "").trim().split(/\s+/);
    return {
      id: `cov-sample-${c.id}`,
      clientId: c.id,
      payerId: SAMPLE_PAYER_IDS[i % SAMPLE_PAYER_IDS.length],
      memberId: `MBR${String(100000 + i * 37)}`,
      groupNumber: `GRP${100 + i}`,
      planName: "Sample PPO",
      priority: "primary" as const,
      subscriberName: c.name,
      subscriberRelationship: "self" as const,
      effectiveDate: "2025-01-01",
      sample: true,
    };
  });
  const added = seedMissing(coveragesStore, rows);

  let touchedClients = 0;
  const all = getStoredClients() as any[];
  const sampleIds = new Set(clients.map((c) => c.id));
  const next = all.map((c, idx) => {
    if (!sampleIds.has(c.id)) return c;
    const parts = String(c.name || "").trim().split(/\s+/);
    const patch: Record<string, any> = {};
    if (!c.legalFirstName) patch.legalFirstName = parts[0] || "";
    if (!c.legalLastName) patch.legalLastName = parts.slice(1).join(" ");
    if (!c.dob) patch.dob = `19${60 + (idx % 35)}-0${1 + (idx % 9)}-1${idx % 9}`;
    if (!c.sex) patch.sex = idx % 2 === 0 ? "female" : "male";
    if (Object.keys(patch).length) {
      touchedClients += 1;
      return { ...c, ...patch };
    }
    return c;
  });
  if (touchedClients > 0) saveStoredClients(next as any);
  return { coverages: added, clients: touchedClients };
}
