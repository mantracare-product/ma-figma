export const ACTIVITY_LOG_EVENT = "activityLog_updated";
const STORAGE_KEY = "processActivityLog";

export interface ActivityLogRecord {
  id: string;
  clientId: string;
  processId: string;
  processName: string;
  type: "process_entry" | "stage_update" | "whatsapp" | "sms" | "email" | "field_update" | "website_message";
  timestamp: string; // ISO
  status?: "success" | "failed" | "pending";
  refId: string;
  direction?: "inbound" | "outbound";
  details: { primary: string; secondary?: string };
}

function readAll(): ActivityLogRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(records: ActivityLogRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  window.dispatchEvent(new Event(ACTIVITY_LOG_EVENT));
}

export function addActivityEntry(entry: Omit<ActivityLogRecord, "id" | "timestamp"> & { timestamp?: string }) {
  const records = readAll();
  records.push({
    ...entry,
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: entry.timestamp ?? new Date().toISOString(),
  });
  writeAll(records);
}

// Activity for one process (used by ProcessDetailDrawer)
export function getActivityForProcess(clientId: string, processId: string): ActivityLogRecord[] {
  return readAll().filter((r) => r.clientId === clientId && (r.processId === processId || r.processName === processId));
}

// Activity across every process the client is enrolled in (used by ClientProfile)
export function getActivityForClient(clientId: string): ActivityLogRecord[] {
  return readAll().filter((r) => r.clientId === clientId);
}
