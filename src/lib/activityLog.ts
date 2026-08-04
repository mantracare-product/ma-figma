import { getActivity, appendActivity } from "./activityEngine";

export const ACTIVITY_LOG_EVENT = "activityEngine_event";

export interface ActivityLogRecord {
  id: string;
  clientId: string;
  processId: string;
  processName: string;
  type: "process_entry" | "stage_update" | "whatsapp" | "sms" | "email" | "field_update" | "website_message" | string;
  timestamp: string; // ISO
  status?: "success" | "failed" | "pending" | string;
  refId: string;
  direction?: "inbound" | "outbound";
  details: { primary: string; secondary?: string };
}

export function addActivityEntry(entry: Omit<ActivityLogRecord, "id" | "timestamp"> & { timestamp?: string }) {
  return appendActivity(entry as any);
}

// Activity for one process (used by ProcessDetailDrawer)
export function getActivityForProcess(clientId: string, processId: string): ActivityLogRecord[] {
  if (!clientId) return [];
  return getActivity(String(clientId), processId) as unknown as ActivityLogRecord[];
}

// Activity across every process the client is enrolled in (used by ClientProfile)
export function getActivityForClient(clientId: string): ActivityLogRecord[] {
  if (!clientId) return [];
  return getActivity(String(clientId)) as unknown as ActivityLogRecord[];
}
