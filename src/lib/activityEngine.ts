/**
 * Activity Engine
 * ===============
 * Lightweight, sessionStorage-backed activity store + pub/sub.
 * Pattern mirrors CLIENTS_STORE_EVENT in clientProcessState.ts.
 *
 * Consumers (ActivityTab, ClientProfile, ProcessDetailDrawer) call:
 *   getActivity(clientId, processId?)   — read
 *   appendActivity(entry)               — write + notify
 *   subscribeToActivity(clientId, cb)   — live update
 */

export const ACTIVITY_ENGINE_EVENT = "activityEngine_updated";
const STORAGE_KEY = "activityEngine_v1";

// ─── Common base ──────────────────────────────────────────────────────────────

export interface ActivityBase {
  id: string;
  timestamp: string;         // ISO string — always present, used for sorting
  clientActionId?: string;   // Idempotency key for user action initiation
  seq?: number;              // Monotonic sequence number for tie-breaking timestamps
  processId?: string;
  processName?: string;
  clientId?: string;
  createdBy?: "system" | "ai" | "user";
  sourceStepName?: string;
  /** Backward-compat fallback rendered when no type-specific block applies */
  details?: { primary: string; secondary?: string };
}

// ─── Per-type payloads ────────────────────────────────────────────────────────

export interface CallActivityEntry extends ActivityBase {
  type: "call" | "inbound_call" | "outbound_call" | "failed_call";
  callId: string;
  direction: "inbound" | "outbound";
  status: "completed" | "failed" | "no_answer" | "voicemail" | "scheduled";
  durationSeconds?: number;           // only when completed
  nextScheduledCall?: { date: string; time: string };
  outcomeSummary?: string;            // 1-line AI summary
}

export interface WhatsAppActivityEntry extends ActivityBase {
  type: "whatsapp";
  direction: "sent" | "received";
  status: "delivered" | "read" | "failed" | "pending";
  messageText: string;
  phoneNumber: string;
}

export interface SmsActivityEntry extends ActivityBase {
  type: "sms";
  direction: "sent" | "received";
  status: "delivered" | "read" | "failed" | "pending";
  messageText: string;
  phoneNumber: string;
}

export interface EmailActivityEntry extends ActivityBase {
  type: "email";
  direction: "sent" | "received";
  status: "delivered" | "opened" | "bounced" | "pending";
  subject: string;
  bodyPreview: string;
  toOrFrom: string;
}

export interface AppointmentActivityEntry extends ActivityBase {
  type: "appointment_booked";
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
  date: string;
  time: string;
  location?: string;
  notes?: string;
  appointmentTitle?: string;
}

export interface FormSubmittedActivityEntry extends ActivityBase {
  type: "form_submitted";
  formName: string;
  status: "completed" | "partial" | "pending";
  fieldsSummary: { label: string; value: string }[];
}

export interface StageActivityEntry extends ActivityBase {
  type: "stage_update" | "stage_change";
  fromStage: string;
  toStage: string;
}

export interface FieldUpdateActivityEntry extends ActivityBase {
  type: "field_update";
  fieldLabel: string;
  oldValue?: string;
  newValue: string;
}

export interface SystemActivityEntry extends ActivityBase {
  type: "process_entry" | "webhook_trigger" | "process_completed" | "website_message" | "website";
  status?: string;
  /** refId for navigation (e.g. whatsapp thread) */
  refId?: string;
  direction?: "inbound" | "outbound";
}

/** Discriminated union of all activity entry types */
export type ActivityEntry =
  | CallActivityEntry
  | WhatsAppActivityEntry
  | SmsActivityEntry
  | EmailActivityEntry
  | AppointmentActivityEntry
  | FormSubmittedActivityEntry
  | StageActivityEntry
  | FieldUpdateActivityEntry
  | SystemActivityEntry;

/**
 * Distributive Omit — applies Omit to each union member individually,
 * so variant-specific fields (e.g. `status` on AppointmentActivityEntry)
 * are preserved rather than collapsed away.
 */
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

// ─── Type guards ──────────────────────────────────────────────────────────────

export function isCallEntry(e: ActivityEntry): e is CallActivityEntry {
  return e.type === "call" || e.type === "inbound_call" || e.type === "outbound_call" || e.type === "failed_call";
}
export function isWhatsAppEntry(e: ActivityEntry): e is WhatsAppActivityEntry {
  return e.type === "whatsapp";
}
export function isSmsEntry(e: ActivityEntry): e is SmsActivityEntry {
  return e.type === "sms";
}
export function isEmailEntry(e: ActivityEntry): e is EmailActivityEntry {
  return e.type === "email";
}
export function isAppointmentEntry(e: ActivityEntry): e is AppointmentActivityEntry {
  return e.type === "appointment_booked";
}
export function isFormEntry(e: ActivityEntry): e is FormSubmittedActivityEntry {
  return e.type === "form_submitted";
}
export function isStageEntry(e: ActivityEntry): e is StageActivityEntry {
  return e.type === "stage_update" || e.type === "stage_change";
}
export function isFieldUpdateEntry(e: ActivityEntry): e is FieldUpdateActivityEntry {
  return e.type === "field_update";
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function readAll(): ActivityEntry[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(entries: ActivityEntry[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new Event(ACTIVITY_ENGINE_EVENT));
  } catch {}
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Read all activity entries for a client, optionally scoped to one process.
 * Returns newest-first by default (sorted descending by timestamp).
 */
export function getActivity(clientId: string, processId?: string): ActivityEntry[] {
  const all = readAll();
  const filtered = all.filter((e) => {
    if (e.clientId !== clientId) return false;
    if (processId && processId !== "all") {
      return e.processId === processId || e.processName === processId;
    }
    return true;
  });
  return filtered.sort((a, b) => {
    const diff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    if (diff !== 0) return diff;
    return (b.seq ?? 0) - (a.seq ?? 0);
  });
}

/**
 * Append a new activity entry. Automatically assigns `id` and `timestamp`
 * if not provided. Fires ACTIVITY_ENGINE_EVENT when done.
 */
export function appendActivity(
  entry: DistributiveOmit<ActivityEntry, "id" | "timestamp"> & { id?: string; timestamp?: string }
): ActivityEntry {
  const existing = readAll();

  // 1. Id-based safeguard
  if (entry.id) {
    const existingById = existing.find((e) => e.id === entry.id);
    if (existingById) return existingById;
  }

  // 2. ClientActionId idempotency key safeguard
  if ((entry as any).clientActionId) {
    const existingByAction = existing.find((e) => (e as any).clientActionId === (entry as any).clientActionId);
    if (existingByAction) return existingByAction;
  }

  const entryTs = entry.timestamp ?? new Date().toISOString();
  const nextSeq = (entry as any).seq ?? (existing.length + 1);

  const complete: ActivityEntry = {
    ...entry,
    id: entry.id ?? `ae-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: entryTs,
    seq: nextSeq,
  } as ActivityEntry;
  writeAll([...existing, complete]);
  return complete;
}

/**
 * Subscribe to live activity changes for a client.
 * Calls `callback` whenever appendActivity fires for any client
 * (the callback re-runs getActivity to filter).
 * Returns an unsubscribe function.
 */
export function subscribeToActivity(
  clientId: string,
  callback: (entries: ActivityEntry[]) => void
): () => void {
  const handler = () => {
    callback(getActivity(clientId));
  };
  window.addEventListener(ACTIVITY_ENGINE_EVENT, handler);
  return () => window.removeEventListener(ACTIVITY_ENGINE_EVENT, handler);
}

// ─── Duration helpers (exported for card rendering) ──────────────────────────

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Format a full ISO/date-time string to "Apr 18, 2:00 PM" style.
 */
export function formatTimestamp(ts: string): string {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
