import { isDemoMantraActive, isFreshWorkspace } from "./onboardingWorkspace";
import { getStoredProcesses } from "./useProcessStore";
import { logStageMove, type StageMove } from "./useAutomationStore";

export const PROCESS_LOGS_STORE_EVENT = "processLogs_updated";
const STORAGE_KEY = "callLogs";
/** Flag set once every `callLogs` key variant has been migrated to the process-instance model. */
export const CALL_LOGS_SCHEMA_FLAG = "callLogs_schema_v2";

/** Where a process instance came from (e.g. the appointment that triggered it). */
export interface ProcessInstanceSource {
  type: string; // "appointment" | "manual" | "call" | "import" | "process" | "legacy" | …
  id: string;
  /** Human title used on cards, e.g. "Eye exam — 2026-11-20 10:30 (Appt #123)". */
  title?: string;
}

export type ProcessInstanceStatus = "active" | "completed" | "cancelled";

/**
 * A row in the `callLogs` store is EITHER a real call ("call") OR a client-in-process
 * row ("process_instance"). Real calls may carry a `process` name too (calls placed from a
 * process stage), so the process name alone cannot tell them apart.
 */
export type CallLogKind = "call" | "process_instance";

export interface CallLog {
  id: string;
  client: string;
  clientId: string;
  type: string;
  status: string;
  process: string;
  lastStage?: string;
  currentStage: string;
  duration: string;
  date: string;
  hasRecording: boolean;
  hasTranscript: boolean;
  hasScheduledCall: boolean;
  parentCallId?: string;
  childCallIds?: string[];
  relationshipReason?: "Call Trigger" | "Stage Change" | "Retry" | "Manual Trigger";
  /** Explicit discriminator. Rows written before this field existed are classified by isProcessInstanceRow(). */
  kind?: CallLogKind;

  // ── Process-instance fields (only on kind === "process_instance" rows) ──
  /** Unique id of this client-in-process instance. Equal to the row `id`. */
  instanceId?: string;
  /** Process (workflow) id; `process` stays as the denormalized name. */
  processId?: string;
  source?: ProcessInstanceSource;
  /** clientId|processId(or name)|sourceType:sourceId — creation is idempotent per key. */
  dedupeKey?: string;
  /** Lifecycle of the instance (distinct from `status`, which is the call status). */
  instanceStatus?: ProcessInstanceStatus;
  parentInstanceId?: string;
  /** Display title (card/list). */
  title?: string;
  createdAt?: string;
}

/**
 * True when the row is a client-in-process row rather than a real call.
 * Uses the explicit `kind` when present; for legacy rows falls back to the id shapes the
 * old writers produced (`PRC-…` and the `CALL-<PROCESS-NAME>` fallback creator).
 */
export function isProcessInstanceRow(log: Pick<CallLog, "id"> & { kind?: CallLogKind }): boolean {
  if (!log) return false;
  if (log.kind) return log.kind === "process_instance";
  const id = String(log.id || "");
  if (id.startsWith("PRC-")) return true;
  // Legacy fallback creator in updateProcessCallLogFields: id = CALL-<PROCESS NAME UPPER>, never numeric.
  if (/^CALL-[A-Z][A-Z0-9-]*$/.test(id)) return true;
  return false;
}

const initialPatientCareJourneyLogsRaw: CallLog[] = [
  { id: "PRC-CL-001", client: "Sarah Johnson", clientId: "CL-001", type: "Inbound", status: "Completed", process: "Patient Care Journey", currentStage: "Client Checked In", duration: "2:45", date: "2026-10-12 10:15", hasRecording: true, hasTranscript: true, hasScheduledCall: true },
  { id: "PRC-CL-013", client: "Priya Sharma", clientId: "CL-013", type: "Outbound", status: "Completed", process: "Patient Care Journey", currentStage: "Book Appointment", duration: "4:12", date: "2026-10-12 09:30", hasRecording: true, hasTranscript: true, hasScheduledCall: true },
  { id: "PRC-CL-014", client: "Rahul Patel", clientId: "CL-014", type: "Inbound", status: "Completed", process: "Patient Care Journey", currentStage: "Move to Pharmacy", duration: "3:20", date: "2026-10-11 16:45", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "PRC-CL-002", client: "Michael Chen", clientId: "CL-002", type: "Outbound", status: "Completed", process: "Patient Care Journey", currentStage: "Pay Bill", duration: "1:50", date: "2026-10-11 14:10", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "PRC-CL-003", client: "Emily Davis", clientId: "CL-003", type: "Inbound", status: "Completed", process: "Patient Care Journey", currentStage: "Payment Done", duration: "5:05", date: "2026-10-11 11:00", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
];

export const initialPatientCareJourneyLogs: CallLog[] = initialPatientCareJourneyLogsRaw.map((l) => {
  const source: ProcessInstanceSource = { type: "legacy", id: "primary" };
  return {
    ...l,
    kind: "process_instance" as const,
    instanceId: l.id,
    instanceStatus: "active" as const,
    source,
    dedupeKey: buildDedupeKey(l.clientId, l.process, source),
  };
});

const initialCallLogs: CallLog[] = [
  ...initialPatientCareJourneyLogs,
  // Latest calls first (Apr 13-14)
  { id: "CALL-001", client: "Sarah Johnson", clientId: "CL-001", type: "Outbound", status: "Completed", process: "Client Intake", currentStage: "Contacted", duration: "4:32", date: "2024-04-13 14:30", hasRecording: true, hasTranscript: true, hasScheduledCall: true },
  { id: "CALL-002", client: "Priya Sharma", clientId: "CL-013", type: "Outbound", status: "Completed", process: "Client Reactivation", currentStage: "Outreach", duration: "3:45", date: "2024-04-13 13:15", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-003", client: "Ahmed Al-Mansoori", clientId: "CL-023", type: "Inbound", status: "Completed", process: "Client Intake", currentStage: "Initial Contact", duration: "5:20", date: "2024-04-13 11:40", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-004", client: "Jennifer White", clientId: "CL-011", type: "Outbound", status: "Completed", process: "Client Intake", currentStage: "Initial Contact", duration: "2:15", date: "2024-04-13 10:00", hasRecording: true, hasTranscript: true, hasScheduledCall: true },
  { id: "CALL-005", client: "Arjun Desai", clientId: "CL-018", type: "Outbound", status: "Pending", process: "Client Reactivation", currentStage: "Contacted", duration: "", date: "2024-04-13 09:30", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-006", client: "Charlotte Evans", clientId: "CL-029", type: "Outbound", status: "Completed", process: "Client Intake", currentStage: "Interested", duration: "6:10", date: "2024-04-13 08:15", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-007", client: "David Martinez", clientId: "CL-006", type: "Inbound", status: "Completed", process: "Client Reactivation", currentStage: "Outreach", duration: "3:55", date: "2024-04-12 16:45", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-008", client: "Deepika Nair", clientId: "CL-021", type: "Outbound", status: "Completed", process: "Client Intake", currentStage: "Contacted", duration: "2:30", date: "2024-04-12 15:20", hasRecording: true, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-009", client: "Youssef Said", clientId: "CL-027", type: "Outbound", status: "Completed", process: "Client Reactivation", currentStage: "Reactivated", duration: "4:48", date: "2024-04-12 14:10", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-010", client: "Michael Chen", clientId: "CL-002", type: "Outbound", status: "Failed", process: "Client Intake", currentStage: "Initial Contact", duration: "0:00", date: "2024-04-12 13:00", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-011", client: "Priya Sharma", clientId: "CL-013", type: "Outbound", status: "Completed", process: "Client Intake", currentStage: "Contacted", duration: "5:15", date: "2024-04-12 11:30", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-012", client: "Lisa Anderson", clientId: "CL-007", type: "Inbound", status: "Completed", process: "Client Reactivation", currentStage: "Call Back Later", duration: "3:20", date: "2024-04-12 10:15", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-013", client: "Emily Davis", clientId: "CL-003", type: "Outbound", status: "Completed", process: "Client Reactivation", currentStage: "Contacted", duration: "4:05", date: "2024-04-11 16:00", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-014", client: "Rahul Patel", clientId: "CL-014", type: "Inbound", status: "Completed", process: "Client Intake", currentStage: "Interested", duration: "2:45", date: "2024-04-11 15:30", hasRecording: true, hasTranscript: false, hasScheduledCall: false },
  { id: "CALL-015", client: "James Taylor", clientId: "CL-008", type: "Outbound", status: "Completed", process: "Client Intake", currentStage: "Initial Contact", duration: "3:35", date: "2024-04-11 14:20", hasRecording: true, hasTranscript: true, hasScheduledCall: true },
  { id: "CALL-016", client: "Kavya Iyer", clientId: "CL-019", type: "Outbound", status: "Completed", process: "Client Reactivation", currentStage: "Outreach", duration: "5:50", date: "2024-04-11 13:00", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-017", client: "Omar Al-Rashid", clientId: "CL-025", type: "Outbound", status: "Pending", process: "Client Intake", currentStage: "Call Back Later", duration: "", date: "2024-04-11 11:45", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-018", client: "Ananya Reddy", clientId: "CL-015", type: "Outbound", status: "Completed", process: "Client Reactivation", currentStage: "Reactivated", duration: "6:25", date: "2024-04-11 10:30", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-019", client: "Fatima Hassan", clientId: "CL-024", type: "Inbound", status: "Completed", process: "Client Reactivation", currentStage: "Lost", duration: "4:18", date: "2024-04-10 16:40", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-020", client: "Amanda Clark", clientId: "CL-009", type: "Outbound", status: "Failed", process: "Client Intake", currentStage: "Initial Contact", duration: "0:00", date: "2024-04-10 15:15", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-021", client: "Sarah Johnson", clientId: "CL-001", type: "Inbound", status: "Completed", process: "Client Reactivation", currentStage: "Outreach", duration: "5:05", date: "2024-04-10 14:00", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
];

export const PROCESS_LOGS_CHANNEL_NAME = "process_logs_broadcast_channel";

let processLogsChannel: BroadcastChannel | null = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    processLogsChannel = new BroadcastChannel(PROCESS_LOGS_CHANNEL_NAME);
  } catch (e) {
    console.warn("BroadcastChannel not supported in processLogsStore:", e);
  }
}

function notifyProcessLogsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PROCESS_LOGS_STORE_EVENT));
  processLogsChannel?.postMessage({ type: PROCESS_LOGS_STORE_EVENT });
}

export function getStoredCallLogs(): CallLog[] {
  try {
    ensureInstanceMigration();
    if (isDemoMantraActive()) {
      const demoRaw =
        (typeof window !== "undefined" &&
          (localStorage.getItem("callLogs_demo") || localStorage.getItem(STORAGE_KEY))) ||
        null;
      if (demoRaw) {
        try {
          const logs = JSON.parse(demoRaw);
          if (Array.isArray(logs) && logs.length > 0) return logs;
        } catch {}
      }
      return initialCallLogs;
    }

    if (isFreshWorkspace()) {
      const activeOrgId = localStorage.getItem("mantra_active_org_id_v1");
      const raw =
        (typeof window !== "undefined" &&
          ((activeOrgId && localStorage.getItem(`callLogs_${activeOrgId}`)) ||
            localStorage.getItem("callLogs_signup"))) ||
        null;
      if (raw) {
        try {
          const logs = JSON.parse(raw);
          if (Array.isArray(logs)) return logs;
        } catch {}
      }
      return [];
    }

    const raw =
      (typeof window !== "undefined" &&
        (localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY))) ||
      null;

    if (raw !== null && raw !== undefined) {
      const logs = JSON.parse(raw);
      if (Array.isArray(logs)) {
        if (logs.length === 0) return [];
        return logs;
      }
    }

    let logs = initialCallLogs;
    let migrated = false;

    // Ensure Patient Care Journey logs are present in logs only in demo mode
    const hasPatientCare = logs.some((l: CallLog) => l.process === "Patient Care Journey");
    if (!hasPatientCare) {
      logs = [...initialPatientCareJourneyLogs, ...logs];
      migrated = true;
    }

    if (migrated) {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
      }
    }
    return logs;
  } catch {
    return [];
  }
}

/** Real calls only (process rows excluded). Use for call lists, call counts and call drawers. */
export function getCallsOnly(): CallLog[] {
  return getStoredCallLogs().filter((l) => !isProcessInstanceRow(l));
}

/** Client-in-process rows only (no real calls). */
export function getProcessInstances(): CallLog[] {
  return getStoredCallLogs().filter((l) => isProcessInstanceRow(l));
}

export function saveCallLogs(logs: CallLog[]): void {
  try {
    const serialized = JSON.stringify(logs);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, serialized);
      sessionStorage.setItem(STORAGE_KEY, serialized);
    }
    notifyProcessLogsChanged();
  } catch {}
}


// ─── Process instances (client-in-process rows) ───────────────────────────────
// A "process instance" is ONE client's enrollment in ONE process, created from a source record
// (for example an appointment). The same client can be in the same process many times; each
// instance has its own id, stage and field values. The row `id` is the `instanceId`.

function nowLogDate(): string {
  return new Date().toISOString().replace("T", " ").substring(0, 16);
}

function norm(s: unknown): string {
  return String(s ?? "").trim().toLowerCase();
}

let instanceSeq = 0;
/** Collision-safe instance id: time + per-session counter + random suffix. */
export function makeInstanceId(): string {
  instanceSeq = (instanceSeq + 1) % 46656;
  const rnd = Math.random().toString(36).slice(2, 6).padEnd(4, "0");
  return `PI-${Date.now().toString(36)}${instanceSeq.toString(36)}-${rnd}`;
}

/**
 * clientId|processKey|sourceType:sourceId. `processKey` is the process id when known, otherwise the
 * process name. It is lower-cased so id- and name-based keys stay comparable.
 */
export function buildDedupeKey(
  clientId: string,
  processKey: string,
  source: Pick<ProcessInstanceSource, "type" | "id">
): string {
  return `${String(clientId)}|${norm(processKey)}|${source.type}:${source.id}`;
}

function resolveProcessId(processName: string): string | undefined {
  try {
    const p = getStoredProcesses().find((pr) => norm(pr.name) === norm(processName));
    return p?.id;
  } catch {
    return undefined;
  }
}

function readClientsRaw(): any[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("clients") || sessionStorage.getItem("clients");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeClientsRaw(clients: any[]): void {
  const serialized = JSON.stringify(clients);
  localStorage.setItem("clients", serialized);
  sessionStorage.setItem("clients", serialized);
  window.dispatchEvent(new CustomEvent("clientsStore_updated", { detail: clients }));
}

function findClientByKey(key: string): any | undefined {
  if (!key) return undefined;
  return readClientsRaw().find((c) => c.id === key || (c.name && norm(c.name) === norm(key)));
}

function rowMatchesClient(l: CallLog, clientKey: string): boolean {
  if (!clientKey) return false;
  return l.clientId === clientKey || (!!l.client && norm(l.client) === norm(clientKey));
}

export function isActiveInstance(l: CallLog): boolean {
  return !l.instanceStatus || l.instanceStatus === "active";
}

export function getProcessInstanceById(instanceId: string): CallLog | undefined {
  if (!instanceId) return undefined;
  return getStoredCallLogs().find(
    (l) => isProcessInstanceRow(l) && (l.instanceId === instanceId || l.id === instanceId)
  );
}

/** All instances of a client (by id or name), optionally limited to one process name. */
export function getInstancesForClient(clientKey: string, processName?: string): CallLog[] {
  return getStoredCallLogs().filter(
    (l) =>
      isProcessInstanceRow(l) &&
      rowMatchesClient(l, clientKey) &&
      (!processName || norm(l.process) === norm(processName))
  );
}

/**
 * The "primary" instance of a process for a client = the most recent ACTIVE one (falls back to the
 * most recent of any status). Used by the legacy name-based shims; warns when it is ambiguous.
 */
export function getPrimaryInstance(
  clientKey: string,
  processName: string,
  opts: { warn?: boolean } = {}
): CallLog | undefined {
  const all = getInstancesForClient(clientKey, processName);
  if (all.length === 0) return undefined;
  const active = all.filter(isActiveInstance);
  const pool = active.length > 0 ? active : all;
  // Stable sort: ties keep store order (the store is newest-first).
  const sorted = [...pool].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  if (active.length > 1 && opts.warn !== false) {
    console.warn(
      `[processLogsStore] ${active.length} active instances of "${processName}" for client "${clientKey}"; ` +
        `name-based API resolved to the most recent (${sorted[0].instanceId || sorted[0].id}). Use the instanceId API.`
    );
  }
  return sorted[0];
}

export interface StartProcessInstanceInput {
  clientId: string;
  clientName: string;
  processName: string;
  processId?: string;
  stageName: string;
  /** Record that triggered this instance. Without one, a unique manual source is used (never deduped). */
  source?: ProcessInstanceSource;
  title?: string;
  /** Override the default dedupe key (clientId|processId|sourceType:sourceId). */
  dedupeKey?: string;
  parentInstanceId?: string;
  channel?: string;
}

export interface StartProcessInstanceResult {
  instance: CallLog;
  alreadyExisted: boolean;
}

/**
 * Create a process instance, idempotently per dedupe key. Re-saving or rescheduling the same
 * booking (same source) returns the existing instance and does NOT change its stage.
 */
export function startProcessInstance(input: StartProcessInstanceInput): StartProcessInstanceResult {
  const logs = getStoredCallLogs();
  const processId = input.processId || resolveProcessId(input.processName);
  const source: ProcessInstanceSource = input.source || { type: "manual", id: makeInstanceId() };

  const defaultKey = buildDedupeKey(input.clientId, processId || input.processName, source);
  const candidateKeys = Array.from(
    new Set(
      [input.dedupeKey, defaultKey, buildDedupeKey(input.clientId, input.processName, source)].filter(
        Boolean
      ) as string[]
    )
  );
  const existing = logs.find(
    (l) => isProcessInstanceRow(l) && !!l.dedupeKey && candidateKeys.includes(l.dedupeKey)
  );
  if (existing) return { instance: existing, alreadyExisted: true };

  let id = makeInstanceId();
  while (logs.some((l) => l.id === id)) id = makeInstanceId();

  const row: CallLog = {
    id,
    kind: "process_instance",
    instanceId: id,
    client: input.clientName,
    clientId: input.clientId,
    type: input.channel === "sms" ? "SMS" : "WhatsApp",
    status: "In Progress",
    process: input.processName,
    processId,
    currentStage: input.stageName,
    duration: "0:00",
    date: nowLogDate(),
    hasRecording: false,
    hasTranscript: true,
    hasScheduledCall: false,
    source,
    dedupeKey: input.dedupeKey || defaultKey,
    instanceStatus: "active",
    parentInstanceId: input.parentInstanceId,
    title: input.title || source.title,
    createdAt: new Date().toISOString(),
  };
  saveCallLogs([row, ...logs]);
  syncInstanceToClient(row);
  return { instance: row, alreadyExisted: false };
}

/**
 * Mirror an instance's stage onto the client record. Writes `processInstanceStages[instanceId]` and,
 * for the primary instance of that process only, the legacy name-keyed `processStagesMap`.
 * It deliberately does NOT write `client.stage` (instance moves never touch the client's own stage).
 */
function syncInstanceToClient(row: CallLog): void {
  if (typeof window === "undefined") return;
  try {
    const clients = readClientsRaw();
    if (clients.length === 0) return;
    const primary = getPrimaryInstance(row.clientId, row.process, { warn: false });
    let changed = false;
    const next = clients.map((c: any) => {
      const isThisClient = c.id === row.clientId || (c.name && norm(c.name) === norm(row.clientId));
      if (!isThisClient) return c;
      changed = true;
      const processInstanceStages = {
        ...(c.processInstanceStages || {}),
        [row.instanceId || row.id]: {
          processId: row.processId,
          processName: row.process,
          stageName: row.currentStage,
        },
      };
      const processStagesMap = { ...(c.processStagesMap || {}) };
      if (primary && (primary.instanceId || primary.id) === (row.instanceId || row.id)) {
        processStagesMap[row.process] = row.currentStage;
      }
      return { ...c, processInstanceStages, processStagesMap, lastUpdatedProcess: row.process };
    });
    if (changed) writeClientsRaw(next);
  } catch (e) {
    console.warn("Failed to sync instance stage to clients store:", e);
  }
}

/**
 * Mirror an instance's stage onto its deal card(s). Cards are matched by instanceId. A legacy card
 * without an instanceId is only adopted when the client has exactly ONE active instance of the
 * process, so one move can never drag another instance's card along.
 */
/** Storage key of the deal cards for the active workspace (fresh workspaces keep their own list). */
export function dealsStorageKey(): string {
  try {
    if (isFreshWorkspace()) return `deals_${localStorage.getItem("signup_org_id") || "signup"}`;
  } catch {
    /* fall through */
  }
  return "deals";
}

function syncInstanceToDeals(row: CallLog): void {
  if (typeof window === "undefined") return;
  try {
    const dealsKey = dealsStorageKey();
    const raw = localStorage.getItem(dealsKey) || sessionStorage.getItem(dealsKey);
    if (!raw) return;
    const deals = JSON.parse(raw);
    if (!Array.isArray(deals)) return;
    const instanceId = row.instanceId || row.id;
    const singleActive =
      getInstancesForClient(row.clientId, row.process).filter(isActiveInstance).length <= 1;
    let changed = false;
    const updated = deals.map((d: any) => {
      const byInstance = d.instanceId && d.instanceId === instanceId;
      const legacyAdopt =
        !d.instanceId &&
        singleActive &&
        (d.clientId === row.clientId || (d.clientName && norm(d.clientName) === norm(row.client))) &&
        d.stage &&
        norm(d.stage).startsWith(norm(row.process));
      if (byInstance || legacyAdopt) {
        changed = true;
        return { ...d, instanceId, stage: `${row.process}: ${row.currentStage}` };
      }
      return d;
    });
    if (changed) {
      const serialized = JSON.stringify(updated);
      localStorage.setItem(dealsKey, serialized);
      sessionStorage.setItem(dealsKey, serialized);
      window.dispatchEvent(new CustomEvent("deals_updated"));
    }
  } catch (e) {
    console.warn("Failed to sync instance stage to deals:", e);
  }
}

/**
 * Legacy rows: demo "call" rows that also carry a process + stage (e.g. CALL-001 in "Client Intake"). They are not
 * instances, but the name-based APIs used to update them, and Deals still lists them, so by-row updates keep working.
 * Mirrors the stage to the client's name-keyed map and to an UNAMBIGUOUS legacy deal card; never writes client.stage.
 */
function syncLegacyRowToClientAndDeals(row: CallLog): void {
  if (typeof window === "undefined") return;
  try {
    const clients = readClientsRaw();
    let clientsChanged = false;
    const nextClients = clients.map((c: any) => {
      const isThisClient = c.id === row.clientId || (c.name && norm(c.name) === norm(row.clientId));
      if (!isThisClient) return c;
      clientsChanged = true;
      return {
        ...c,
        processStagesMap: { ...(c.processStagesMap || {}), [row.process]: row.currentStage },
        lastUpdatedProcess: row.process,
      };
    });
    if (clientsChanged) writeClientsRaw(nextClients);
  } catch (e) {
    console.warn("Failed to sync legacy row stage to clients store:", e);
  }
  try {
    const dealsKey = dealsStorageKey();
    const raw = localStorage.getItem(dealsKey) || sessionStorage.getItem(dealsKey);
    if (!raw) return;
    const deals = JSON.parse(raw);
    if (!Array.isArray(deals)) return;
    const sameRows = getStoredCallLogs().filter(
      (l) => rowMatchesClient(l, row.clientId) && norm(l.process) === norm(row.process)
    ).length;
    if (sameRows !== 1) return; // ambiguous: do not guess which card belongs to this row
    let changed = false;
    const updated = deals.map((d: any) => {
      const mine =
        !d.instanceId &&
        (d.clientId === row.clientId || (d.clientName && norm(d.clientName) === norm(row.client))) &&
        d.stage &&
        norm(d.stage).startsWith(`${norm(row.process)}:`);
      if (!mine) return d;
      changed = true;
      return { ...d, stage: `${row.process}: ${row.currentStage}` };
    });
    if (changed) {
      const serialized = JSON.stringify(updated);
      localStorage.setItem(dealsKey, serialized);
      sessionStorage.setItem(dealsKey, serialized);
      window.dispatchEvent(new CustomEvent("deals_updated"));
    }
  } catch (e) {
    console.warn("Failed to sync legacy row stage to deals:", e);
  }
}

/** Move ONE instance to a stage (by instanceId). Returns the updated row, or null if not found. */
export function updateProcessInstanceStage(
  instanceId: string,
  newStageName: string
): CallLog | null {
  const logs = getStoredCallLogs();
  const idx = logs.findIndex(
    (l) => isProcessInstanceRow(l) && (l.instanceId === instanceId || l.id === instanceId)
  );
  if (idx < 0) return null;
  const updatedRow: CallLog = { ...logs[idx], currentStage: newStageName, date: nowLogDate() };
  const next = [...logs];
  next[idx] = updatedRow;
  saveCallLogs(next);
  syncInstanceToClient(updatedRow);
  syncInstanceToDeals(updatedRow);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("patient_portal_client_changed", { detail: updatedRow.clientId }));
  }
  return updatedRow;
}

/**
 * Log and emit the stage move of a process instance: ONE stage.entered (and one stage.exited when there was a
 * previous stage) with recordId = instanceId and data carrying instanceId / clientId / source / processId.
 * Call it AFTER updateProcessInstanceStage / startProcessInstance. `fromStageName` undefined = new enrollment.
 * Instance moves never write client.stage.
 */
export function logInstanceStageMove(
  row: CallLog,
  fromStageName: string | undefined,
  cause: StageMove["cause"] = { type: "manual" },
  extra?: { fromProcessId?: string; fromProcessName?: string; recordData?: Record<string, any> }
): StageMove {
  const processId = row.processId || resolveProcessId(row.process) || row.process;
  // Only real instances have an instanceId. A legacy call row that carries a process is logged against the client.
  const instanceId = isProcessInstanceRow(row) ? row.instanceId || row.id : undefined;
  return logStageMove(
    {
      orgId: "default",
      recordType: "client",
      recordId: instanceId || row.clientId || row.id,
      fromStageName,
      toStageId: "", // resolved from the stage name by logStageMove
      toStageName: row.currentStage,
      processId,
      processName: row.process,
      fromProcessId: extra?.fromProcessId,
      fromProcessName: extra?.fromProcessName,
      instanceId,
      clientId: row.clientId,
      source: row.source,
      cause,
    },
    { recordData: extra?.recordData }
  );
}

/** Display title for an instance created from an appointment, e.g. "Eye exam — 2026-11-20 10:30 (Appt #123)". */
export function appointmentInstanceTitle(a: {
  id: number | string;
  serviceName?: string;
  title?: string;
  date?: string;
  time?: string;
}): string {
  const what = a.serviceName || a.title || "Appointment";
  const when = [a.date, a.time].filter(Boolean).join(" ");
  return `${what}${when ? ` — ${when}` : ""} (Appt #${a.id})`;
}

const PROTECTED_INSTANCE_KEYS = ["id", "instanceId", "kind", "dedupeKey", "source"];

/** Merge field values onto ONE instance (by instanceId). Identity keys are never overwritten. */
export function updateProcessInstanceFields(
  instanceId: string,
  fieldValues: Record<string, any>
): CallLog | null {
  const logs = getStoredCallLogs();
  const idx = logs.findIndex(
    (l) => isProcessInstanceRow(l) && (l.instanceId === instanceId || l.id === instanceId)
  );
  if (idx < 0) return null;
  const safe: Record<string, any> = {};
  for (const [k, v] of Object.entries(fieldValues || {})) {
    if (!PROTECTED_INSTANCE_KEYS.includes(k)) safe[k] = v;
  }
  const updatedRow = { ...logs[idx], ...safe } as CallLog;
  const next = [...logs];
  next[idx] = updatedRow;
  saveCallLogs(next);
  return updatedRow;
}

/** Set the lifecycle status of an instance (active | completed | cancelled). */
export function setProcessInstanceStatus(
  instanceId: string,
  status: ProcessInstanceStatus
): CallLog | null {
  return updateProcessInstanceFields(instanceId, { instanceStatus: status });
}

// ─── Legacy name-based shims ──────────────────────────────────────────────────
// Keep working for callers that only know (client, process NAME). They resolve to the PRIMARY
// instance (most recent active) and warn when there is more than one. New code must use the
// instanceId API above.

const LEGACY_SOURCE: ProcessInstanceSource = { type: "legacy", id: "primary" };

function resolveClientForShim(clientKey: string): { id: string; name: string } {
  const c = findClientByKey(clientKey);
  if (c) return { id: c.id, name: c.name || clientKey };
  return { id: clientKey, name: clientKey };
}

/** The legacy "call row that also carries a process" (not an instance) for a client + process, most recent first. */
function findLegacyProcessRow(clientKey: string, processName: string): CallLog | undefined {
  const rows = getStoredCallLogs().filter(
    (l) => !isProcessInstanceRow(l) && rowMatchesClient(l, clientKey) && norm(l.process) === norm(processName)
  );
  return [...rows].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))[0];
}

/**
 * Move ONE exact row (by id) to a stage. Instance rows go through updateProcessInstanceStage; legacy call rows that
 * carry a process are updated in place and mirrored. Never writes client.stage. Returns the updated row or null.
 */
export function updateProcessRowStage(rowId: string, newStageName: string): CallLog | null {
  const logs = getStoredCallLogs();
  const row = logs.find((l) => l.id === rowId || (l.instanceId && l.instanceId === rowId));
  if (!row) return null;
  if (isProcessInstanceRow(row)) return updateProcessInstanceStage(row.instanceId || row.id, newStageName);
  const updatedRow: CallLog = { ...row, currentStage: newStageName, date: nowLogDate() };
  saveCallLogs(logs.map((l) => (l.id === row.id ? updatedRow : l)));
  syncLegacyRowToClientAndDeals(updatedRow);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("patient_portal_client_changed", { detail: updatedRow.clientId }));
  }
  return updatedRow;
}

/** Merge field values onto ONE exact row (by id). Instance identity keys are protected. */
export function updateProcessRowFields(rowId: string, fieldValues: Record<string, any>): CallLog | null {
  const logs = getStoredCallLogs();
  const row = logs.find((l) => l.id === rowId || (l.instanceId && l.instanceId === rowId));
  if (!row) return null;
  if (isProcessInstanceRow(row)) return updateProcessInstanceFields(row.instanceId || row.id, fieldValues);
  const updatedRow = { ...row, ...fieldValues, id: row.id } as CallLog;
  saveCallLogs(logs.map((l) => (l.id === row.id ? updatedRow : l)));
  return updatedRow;
}

/** Primary instance, else the legacy call row for this client + process (what the old name-based API updated). */
function resolveShimRow(clientKey: string, processName: string): CallLog | undefined {
  return getPrimaryInstance(clientKey, processName) || findLegacyProcessRow(clientKey, processName);
}

export function addProcessCallLog(entry: {
  clientId: string;
  clientName: string;
  processName: string;
  stageName: string;
  channel?: string;
}): CallLog {
  const existing = resolveShimRow(entry.clientId, entry.processName);
  if (existing) {
    return updateProcessRowStage(existing.id, entry.stageName) || existing;
  }
  return startProcessInstance({
    clientId: entry.clientId,
    clientName: entry.clientName,
    processName: entry.processName,
    stageName: entry.stageName,
    channel: entry.channel,
    source: LEGACY_SOURCE,
  }).instance;
}

export function updateProcessCallLogStage(clientId: string, processName: string, newStageName: string): void {
  let row = resolveShimRow(clientId, processName);
  if (!row) {
    const client = resolveClientForShim(clientId);
    row = startProcessInstance({
      clientId: client.id,
      clientName: client.name,
      processName,
      stageName: newStageName,
      source: LEGACY_SOURCE,
    }).instance;
  }
  updateProcessRowStage(row.id, newStageName);
}

export function updateProcessCallLogFields(
  clientId: string,
  processName: string,
  fieldValues: Record<string, any>
): void {
  let row = resolveShimRow(clientId, processName);
  if (!row) {
    const client = resolveClientForShim(clientId);
    row = startProcessInstance({
      clientId: client.id,
      clientName: client.name,
      processName,
      stageName: "Initial Stage",
      source: LEGACY_SOURCE,
    }).instance;
  }
  updateProcessRowFields(row.id, fieldValues);
}

// ─── One-time migration to the instance model ─────────────────────────────────

let instanceMigrationChecked = false;

/** Run the migration at most once per page load, and only until the persistent flag is set. */
export function ensureInstanceMigration(): void {
  if (instanceMigrationChecked || typeof window === "undefined") return;
  instanceMigrationChecked = true;
  try {
    if (localStorage.getItem(CALL_LOGS_SCHEMA_FLAG) === "1") return;
    migrateProcessInstances();
    localStorage.setItem(CALL_LOGS_SCHEMA_FLAG, "1");
  } catch (e) {
    console.warn("[processLogsStore] instance migration failed (will retry next load):", e);
  }
}

/** Test hook. */
export function __resetInstanceMigrationForTests(): void {
  instanceMigrationChecked = false;
}

function storageKeys(store: Storage): string[] {
  const keys: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (k) keys.push(k);
  }
  return keys;
}

/**
 * Idempotent. For every `callLogs` key variant (callLogs, callLogs_demo, callLogs_signup, callLogs_<org>
 * in localStorage, plus sessionStorage callLogs): classify rows, stamp `kind`, backfill
 * instanceId/clientId/processId/source/dedupeKey/instanceStatus, collapse duplicate legacy
 * (client, process) pairs to the newest, then backfill `deals` rows and activity entries.
 */
export function migrateProcessInstances(): { rowsMigrated: number; collapsed: number } {
  const clients = readClientsRaw();
  const findClient = (key: unknown) =>
    key ? clients.find((c) => c.id === key || (c.name && norm(c.name) === norm(key))) : undefined;
  const processIdCache = new Map<string, string | undefined>();
  const processIdByName = (name: string) => {
    const k = norm(name);
    if (!processIdCache.has(k)) processIdCache.set(k, resolveProcessId(name));
    return processIdCache.get(k);
  };

  const index = new Map<string, CallLog>(); // `${clientKey}|${processKey}` -> instance
  let rowsMigrated = 0;
  let collapsed = 0;

  const migrateRows = (rows: any[]): { rows: any[]; changed: boolean } => {
    let changed = false;
    const out: any[] = [];
    const keptByGroup = new Map<string, number>();
    for (const r of rows) {
      if (!r || typeof r !== "object") {
        out.push(r);
        continue;
      }
      if (!isProcessInstanceRow(r)) {
        if (!r.kind) {
          out.push({ ...r, kind: "call" });
          changed = true;
        } else {
          out.push(r);
        }
        continue;
      }
      const wasLegacy = !r.instanceId;
      const client = findClient(r.clientId) || findClient(r.client);
      const clientId = client?.id || r.clientId;
      const processId = r.processId || processIdByName(r.process);
      const source: ProcessInstanceSource = r.source || { type: "legacy", id: "primary" };
      const next = {
        ...r,
        kind: "process_instance",
        instanceId: r.instanceId || r.id,
        clientId,
        processId,
        source,
        instanceStatus: r.instanceStatus || "active",
        dedupeKey: r.dedupeKey || buildDedupeKey(clientId, processId || r.process, source),
      };
      if (JSON.stringify(next) !== JSON.stringify(r)) changed = true;

      if (wasLegacy) {
        const group = `${norm(clientId)}|${norm(r.process)}`;
        const keptIdx = keptByGroup.get(group);
        if (keptIdx === undefined) {
          keptByGroup.set(group, out.length);
          out.push(next);
        } else {
          // duplicate legacy (client, process) pair: keep the newest (ties keep the earlier row; the store is newest-first)
          if (String(next.date || "") > String(out[keptIdx].date || "")) out[keptIdx] = next;
          collapsed++;
          changed = true;
        }
      } else {
        out.push(next);
      }
    }
    for (const r of out) {
      if (r && typeof r === "object" && r.kind === "process_instance") {
        rowsMigrated++;
        const keys = [norm(r.clientId), norm(r.client)];
        const procKeys = [norm(r.process), r.processId ? norm(r.processId) : ""].filter(Boolean);
        for (const ck of keys) for (const pk of procKeys) if (ck) index.set(`${ck}|${pk}`, r);
      }
    }
    return { rows: out, changed };
  };

  const stores: Storage[] = [localStorage, sessionStorage];
  for (const store of stores) {
    for (const key of storageKeys(store)) {
      const isCallLogsKey =
        key === STORAGE_KEY || (key.startsWith(`${STORAGE_KEY}_`) && key !== CALL_LOGS_SCHEMA_FLAG);
      if (!isCallLogsKey) continue;
      try {
        const parsed = JSON.parse(store.getItem(key) || "null");
        if (!Array.isArray(parsed)) continue;
        const result = migrateRows(parsed);
        if (result.changed) store.setItem(key, JSON.stringify(result.rows));
      } catch {
        /* unparseable key: leave untouched */
      }
    }
  }

  // Backfill deal cards (instanceId / clientId)
  for (const store of stores) {
    for (const key of storageKeys(store)) {
      if (key !== "deals" && !key.startsWith("deals_")) continue;
      try {
        const parsed = JSON.parse(store.getItem(key) || "null");
        if (!Array.isArray(parsed)) continue;
        let changed = false;
        const next = parsed.map((d: any) => {
          if (!d || typeof d !== "object" || d.instanceId) return d;
          const sep = String(d.stage || "").indexOf(":");
          if (sep < 0) return d;
          const proc = norm(String(d.stage).slice(0, sep));
          const inst = index.get(`${norm(d.clientId)}|${proc}`) || index.get(`${norm(d.clientName)}|${proc}`);
          if (!inst) return d;
          changed = true;
          return { ...d, instanceId: inst.instanceId, clientId: d.clientId || inst.clientId };
        });
        if (changed) store.setItem(key, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    }
  }

  // Backfill activity entries (instanceId)
  for (const store of stores) {
    try {
      const raw = store.getItem("activityEngine_v1");
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) continue;
      let changed = false;
      const next = parsed.map((e: any) => {
        if (!e || typeof e !== "object" || e.instanceId || !e.clientId) return e;
        const procKey = norm(e.processName || e.processId);
        if (!procKey) return e;
        const inst = index.get(`${norm(e.clientId)}|${procKey}`);
        if (!inst) return e;
        changed = true;
        return { ...e, instanceId: inst.instanceId };
      });
      if (changed) store.setItem("activityEngine_v1", JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  return { rowsMigrated, collapsed };
}
