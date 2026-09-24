export const PROCESS_LOGS_STORE_EVENT = "processLogs_updated";
const STORAGE_KEY = "callLogs";

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
}

const initialCallLogs: CallLog[] = [
  { id: "CALL-001", client: "Sarah Johnson", clientId: "CL-001", type: "Outbound", status: "Completed", process: "Patient Intake", currentStage: "Insurance Verification", duration: "4:32", date: "2024-04-13 14:30", hasRecording: true, hasTranscript: true, hasScheduledCall: true },
  { id: "CALL-002", client: "Priya Sharma", clientId: "CL-013", type: "Outbound", status: "Completed", process: "Follow-up Calls", currentStage: "Follow-up", duration: "3:45", date: "2024-04-13 13:15", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-003", client: "Ahmed Al-Mansoori", clientId: "CL-023", type: "Inbound", status: "Completed", process: "Insurance Verification", currentStage: "Document Check", duration: "5:20", date: "2024-04-13 11:40", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-004", client: "Jennifer White", clientId: "CL-011", type: "Outbound", status: "Completed", process: "Patient Intake", currentStage: "Initial Contact", duration: "2:15", date: "2024-04-13 10:00", hasRecording: true, hasTranscript: true, hasScheduledCall: true },
  { id: "CALL-005", client: "Arjun Desai", clientId: "CL-018", type: "Outbound", status: "Pending", process: "Billing Support", currentStage: "Billing Inquiry", duration: "", date: "2024-04-13 09:30", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-006", client: "Charlotte Evans", clientId: "CL-029", type: "Outbound", status: "Completed", process: "Insurance Verification", currentStage: "Approval", duration: "6:10", date: "2024-04-13 08:15", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-007", client: "David Martinez", clientId: "CL-006", type: "Inbound", status: "Completed", process: "Follow-up Calls", currentStage: "Follow-up", duration: "3:55", date: "2024-04-12 16:45", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-008", client: "Deepika Nair", clientId: "CL-021", type: "Outbound", status: "Completed", process: "Appointment Scheduling", currentStage: "Confirmation", duration: "2:30", date: "2024-04-12 15:20", hasRecording: true, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-009", client: "Youssef Said", clientId: "CL-027", type: "Outbound", status: "Completed", process: "Follow-up Calls", currentStage: "Follow-up", duration: "4:48", date: "2024-04-12 14:10", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-010", client: "Michael Chen", clientId: "CL-002", type: "Outbound", status: "Failed", process: "Appointment Scheduling", currentStage: "Initial Contact", duration: "0:00", date: "2024-04-12 13:00", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-011", client: "Priya Sharma", clientId: "CL-013", type: "Outbound", status: "Completed", process: "Patient Intake", currentStage: "Insurance Verification", duration: "5:15", date: "2024-04-12 11:30", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-012", client: "Lisa Anderson", clientId: "CL-007", type: "Inbound", status: "Completed", process: "Billing Support", currentStage: "Payment Reminder", duration: "3:20", date: "2024-04-12 10:15", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-013", client: "Emily Davis", clientId: "CL-003", type: "Outbound", status: "Completed", process: "Billing Support", currentStage: "Billing Inquiry", duration: "4:05", date: "2024-04-11 16:00", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-014", client: "Rahul Patel", clientId: "CL-014", type: "Inbound", status: "Completed", process: "Follow-up Calls", currentStage: "Follow-up", duration: "2:45", date: "2024-04-11 15:30", hasRecording: true, hasTranscript: false, hasScheduledCall: false },
  { id: "CALL-015", client: "James Taylor", clientId: "CL-008", type: "Outbound", status: "Completed", process: "Patient Intake", currentStage: "Schedule Appointment", duration: "3:35", date: "2024-04-11 14:20", hasRecording: true, hasTranscript: true, hasScheduledCall: true },
  { id: "CALL-016", client: "Kavya Iyer", clientId: "CL-019", type: "Outbound", status: "Completed", process: "Insurance Verification", currentStage: "Document Check", duration: "5:50", date: "2024-04-11 13:00", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-017", client: "Omar Al-Rashid", clientId: "CL-025", type: "Outbound", status: "Pending", process: "Appointment Scheduling", currentStage: "Slot Selection", duration: "", date: "2024-04-11 11:45", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-018", client: "Ananya Reddy", clientId: "CL-015", type: "Outbound", status: "Completed", process: "Billing Support", currentStage: "Issue Resolution", duration: "6:25", date: "2024-04-11 10:30", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-019", client: "Fatima Hassan", clientId: "CL-024", type: "Inbound", status: "Completed", process: "Billing Support", currentStage: "Billing Inquiry", duration: "4:18", date: "2024-04-10 16:40", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-020", client: "Amanda Clark", clientId: "CL-009", type: "Outbound", status: "Failed", process: "Appointment Scheduling", currentStage: "Confirmation", duration: "0:00", date: "2024-04-10 15:15", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-021", client: "Sarah Johnson", clientId: "CL-001", type: "Inbound", status: "Completed", process: "Follow-up Calls", currentStage: "Follow-up", duration: "5:05", date: "2024-04-10 14:00", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
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
    const raw = (typeof window !== "undefined" && (localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY))) || null;
    return raw ? JSON.parse(raw) : initialCallLogs;
  } catch {
    return initialCallLogs;
  }
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

export function addProcessCallLog(entry: {
  clientId: string;
  clientName: string;
  processName: string;
  stageName: string;
  channel?: string;
}): CallLog {
  const currentLogs = getStoredCallLogs();
  
  // Check if this client is already in this process in callLogs
  const existingIndex = currentLogs.findIndex(
    (l) => l.clientId === entry.clientId && l.process === entry.processName
  );

  const nowStr = new Date().toISOString().replace("T", " ").substring(0, 16);

  if (existingIndex >= 0) {
    const updated = [...currentLogs];
    updated[existingIndex] = {
      ...updated[existingIndex],
      currentStage: entry.stageName,
      date: nowStr,
    };
    saveCallLogs(updated);
    return updated[existingIndex];
  } else {
    const newLog: CallLog = {
      id: `PRC-${entry.clientId}-${Date.now().toString().slice(-4)}`,
      client: entry.clientName,
      clientId: entry.clientId,
      type: entry.channel === "sms" ? "SMS" : "WhatsApp",
      status: "In Progress",
      process: entry.processName,
      currentStage: entry.stageName,
      duration: "0:00",
      date: nowStr,
      hasRecording: false,
      hasTranscript: true,
      hasScheduledCall: false,
    };
    const updated = [newLog, ...currentLogs];
    saveCallLogs(updated);
    return newLog;
  }
}

export function updateProcessCallLogStage(clientId: string, processName: string, newStageName: string): void {
  const currentLogs = getStoredCallLogs();
  const updated = currentLogs.map((l) => {
    if (l.clientId === clientId && l.process.toLowerCase() === processName.toLowerCase()) {
      return { ...l, currentStage: newStageName };
    }
    return l;
  });
  saveCallLogs(updated);
}

export function updateProcessCallLogFields(
  clientId: string,
  processName: string,
  fieldValues: Record<string, any>
): void {
  const currentLogs = getStoredCallLogs();
  const existingIndex = currentLogs.findIndex(
    (l) =>
      (l.clientId === clientId || (l.client && clientId && l.client.toLowerCase() === clientId.toLowerCase())) &&
      l.process.toLowerCase() === processName.toLowerCase()
  );
  if (existingIndex >= 0) {
    const updated = [...currentLogs];
    updated[existingIndex] = { ...updated[existingIndex], ...fieldValues };
    saveCallLogs(updated);
  } else {
    const newLog: CallLog & Record<string, any> = {
      id: `CALL-${processName.toUpperCase().replace(/\s+/g, "-")}`,
      client: clientId,
      clientId: clientId,
      type: "Outbound",
      status: "In Progress",
      process: processName,
      currentStage: "Initial Stage",
      duration: "0:00",
      date: new Date().toISOString().replace("T", " ").substring(0, 16),
      hasRecording: false,
      hasTranscript: false,
      hasScheduledCall: false,
      ...fieldValues,
    };
    saveCallLogs([newLog, ...currentLogs]);
  }
}
