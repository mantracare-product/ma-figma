/**
 * submissionsStore.ts
 *
 * Single source of truth for client-linked form submissions, backed by
 * localStorage("clientFormSubmissions") with sessionStorage fallback.
 *
 * Consumers:
 *  - ClientProfile.tsx  (read)
 *  - WebForms.tsx       (write on handlePreviewSubmit / handleShareSend)
 *  - WebFormsTest.tsx   (write on handleSubmit)
 *  - PatientForms.tsx   (read/write for patient submissions)
 */

import { CLIENT_FORM_SUBMISSIONS, type ClientFormSubmission } from "./clientFormSubmissions";
import { broadcastSync, onSyncEvent } from "../lib/syncBroadcast";
export type { ClientFormSubmission };

const STORAGE_KEY = "clientFormSubmissions";
export const SUBMISSIONS_STORE_EVENT = "submissionsStore_updated";

if (typeof window !== "undefined") {
  onSyncEvent("SUBMISSIONS_UPDATED", () => {
    window.dispatchEvent(new Event(SUBMISSIONS_STORE_EVENT));
  });
}

/** Load all client-linked form submissions. Falls back to the static seed. */
export function loadClientSubmissions(): ClientFormSubmission[] {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        localStorage.setItem(STORAGE_KEY, raw);
      }
    }
    if (raw) return JSON.parse(raw) as ClientFormSubmission[];
  } catch {
    // JSON parse failure — fall through to seed
  }
  // First load: seed with static demo data so mock clients still show submissions.
  const seed = CLIENT_FORM_SUBMISSIONS;
  saveClientSubmissions(seed);
  return seed;
}

/** Persist the full submissions array. */
export function saveClientSubmissions(submissions: ClientFormSubmission[]): void {
  try {
    const serialized = JSON.stringify(submissions);
    localStorage.setItem(STORAGE_KEY, serialized);
    sessionStorage.setItem(STORAGE_KEY, serialized);
    window.dispatchEvent(new Event(SUBMISSIONS_STORE_EVENT));
    broadcastSync("SUBMISSIONS_UPDATED");
  } catch {
    // storage full / unavailable — silently ignore
  }
}

/**
 * Append a single new submission record. If `clientId` is empty the record is
 * still saved (it will just not appear on any client's Forms tab).
 */
export function appendClientSubmission(
  sub: Omit<ClientFormSubmission, "id">
): ClientFormSubmission {
  const all = loadClientSubmissions();
  const id = `SUB-${String(Date.now()).slice(-8)}-${Math.floor(Math.random() * 1000)}`;
  const newSub: ClientFormSubmission = { id, ...sub };
  saveClientSubmissions([newSub, ...all]);
  return newSub;
}
