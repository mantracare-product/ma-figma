/**
 * submissionsStore.ts
 *
 * Single source of truth for client-linked form submissions, backed by
 * sessionStorage("clientFormSubmissions"). This module is the ONLY place
 * that reads/writes that key so the seeding and serialisation logic stays
 * in one spot.
 *
 * Consumers:
 *  - ClientProfile.tsx  (read)
 *  - WebForms.tsx       (write on handlePreviewSubmit / handleShareSend)
 *  - WebFormsTest.tsx   (write on handleSubmit)
 */

import { CLIENT_FORM_SUBMISSIONS, ClientFormSubmission } from "./clientFormSubmissions";

const STORAGE_KEY = "clientFormSubmissions";

/** Load all client-linked form submissions. Falls back to the static seed. */
export function loadClientSubmissions(): ClientFormSubmission[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
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
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
  } catch {
    // sessionStorage full / unavailable — silently ignore
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
