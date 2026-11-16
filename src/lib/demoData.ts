/**
 * Demo org data guard.
 *
 * Why this exists: the browser test tooling once cleared whole stores of the "Demo Mantra Care" org and left test
 * records behind, so the demo clients/tasks/deals/... were gone or hidden. Two functions repair that and keep it safe:
 *
 *  - purgeTestRecords(): removes every record that carries a test marker ("RCMTEST") from any stored JSON array
 *    (and any storage key named after a test record). Real records are never touched.
 *  - ensureDemoData(): for the demo org only, any store that is now EMPTY is cleared so the store's own default seed
 *    applies again (tasks, deals, call logs, claims, conversations, team, services ...), and the client list is
 *    re-seeded from canonicalClients. Non-empty stores are never overwritten. Idempotent.
 *
 * Appointments have no seed in code (INITIAL_APPOINTMENTS is empty): if they were created by hand they cannot be rebuilt.
 */
import { initialClients as canonicalClients } from "../data/canonicalClients";
import { getActiveOrgId, getOrgBilling, migrateBillingSetupToOrg, saveOrgBilling } from "./orgBilling";
import { isDemoMantraActive } from "./onboardingWorkspace";

export const TEST_MARKER = "RCMTEST";

/** Stores whose own getter falls back to a default seed when the key is missing or an empty array. */
const SEED_BACKED_KEYS = ["callLogs", "callLogs_demo", "deals", "mantra_tasks_store", "whatsappMockConversations", "ma_services_store", "ma_services_demo"];

function readArray(storage: Storage, key: string): any[] | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

/** Remove test records from every JSON array in local/session storage. Returns how many records were removed. */
export function purgeTestRecords(): number {
  if (typeof localStorage === "undefined") return 0;
  let removed = 0;
  for (const storage of [localStorage, sessionStorage]) {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) keys.push(storage.key(i) as string);
    for (const key of keys) {
      if (key.startsWith("__rcmtest_")) continue; // the test harness's own state
      if (key.indexOf(TEST_MARKER) >= 0) {
        storage.removeItem(key);
        removed += 1;
        continue;
      }
      const raw = storage.getItem(key);
      if (!raw || raw.indexOf(TEST_MARKER) < 0) continue;
      const arr = readArray(storage, key);
      if (!arr) continue;
      const kept = arr.filter((rec) => {
        try {
          return JSON.stringify(rec).indexOf(TEST_MARKER) < 0;
        } catch {
          return true;
        }
      });
      if (kept.length !== arr.length) {
        removed += arr.length - kept.length;
        if (kept.length === 0) storage.removeItem(key);
        else storage.setItem(key, JSON.stringify(kept));
      }
    }
  }
  return removed;
}

export interface EnsureDemoResult {
  purged: number;
  reseeded: string[];
}

/** Idempotent. Purges test leftovers, then lets empty demo stores fall back to their seeds. */
/** A browser test run is in progress (its state lives in sessionStorage); the purge must not eat the records it just created. */
export function testRunActive(): boolean {
  try {
    const r = JSON.parse(sessionStorage.getItem("__rcmtest_run") || "null");
    return !!(r && r.running);
  } catch {
    return false;
  }
}

export function ensureDemoData(): EnsureDemoResult {
  const result: EnsureDemoResult = { purged: 0, reseeded: [] };
  if (typeof localStorage === "undefined") return result;
  if (testRunActive()) return result;
  try {
    result.purged = purgeTestRecords();
    if (!isDemoMantraActive()) return result;

    for (const key of SEED_BACKED_KEYS) {
      const arr = readArray(localStorage, key);
      if (arr && arr.length === 0) {
        localStorage.removeItem(key);
        result.reseeded.push(key);
      }
    }
    // Clients: the getter reads clients_demo first, then clients; both empty/missing => canonical demo clients.
    const clients = readArray(localStorage, "clients");
    const clientsDemo = readArray(localStorage, "clients_demo");
    if ((!clients || clients.length === 0) && (!clientsDemo || clientsDemo.length === 0)) {
      localStorage.setItem("clients", JSON.stringify(canonicalClients));
      result.reseeded.push("clients");
    }
    // The demo organization carries a billing identity so claims can be built end to end (never over an entered one).
    migrateBillingSetupToOrg();
    const b = getOrgBilling();
    if (!b.legalName && !b.ein && !b.groupNpi) {
      saveOrgBilling(getActiveOrgId(), { legalName: "Demo Mantra Care LLC", ein: "12-3456789", groupNpi: "1234567893", taxonomy: "207Q00000X", phone: "(555) 123-4567", address: "123 Innovation Blvd, Suite 400, San Francisco, CA 94107", contactName: "Finance Lead", contactEmail: "billing@mantraassist.com" });
      result.reseeded.push("org_billing");
    }
    // Services written by a test would hide DEFAULT_SERVICES: an empty list falls back (handled above); nothing else to do.
  } catch (e) {
    console.warn("[demoData] ensureDemoData failed:", e);
  }
  return result;
}
