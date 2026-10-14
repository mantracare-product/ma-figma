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

export const initialPatientCareJourneyLogs: CallLog[] = [
  { id: "PRC-CL-001", client: "Sarah Johnson", clientId: "CL-001", type: "Inbound", status: "Completed", process: "Patient Care Journey", currentStage: "Client Checked In", duration: "2:45", date: "2026-10-12 10:15", hasRecording: true, hasTranscript: true, hasScheduledCall: true },
  { id: "PRC-CL-013", client: "Priya Sharma", clientId: "CL-013", type: "Outbound", status: "Completed", process: "Patient Care Journey", currentStage: "Book Appointment", duration: "4:12", date: "2026-10-12 09:30", hasRecording: true, hasTranscript: true, hasScheduledCall: true },
  { id: "PRC-CL-014", client: "Rahul Patel", clientId: "CL-014", type: "Inbound", status: "Completed", process: "Patient Care Journey", currentStage: "Move to Pharmacy", duration: "3:20", date: "2026-10-11 16:45", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "PRC-CL-002", client: "Michael Chen", clientId: "CL-002", type: "Outbound", status: "Completed", process: "Patient Care Journey", currentStage: "Pay Bill", duration: "1:50", date: "2026-10-11 14:10", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "PRC-CL-003", client: "Emily Davis", clientId: "CL-003", type: "Inbound", status: "Completed", process: "Patient Care Journey", currentStage: "Payment Done", duration: "5:05", date: "2026-10-11 11:00", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
];

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
    const raw = (typeof window !== "undefined" && (localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY))) || null;
    let logs = raw ? JSON.parse(raw) : initialCallLogs;
    if (!Array.isArray(logs) || logs.length === 0) {
      logs = initialCallLogs;
    }
    let migrated = false;

    // Ensure Patient Care Journey logs are present in logs
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
  const nowStr = new Date().toISOString().replace("T", " ").substring(0, 16);
  let found = false;
  const updated = currentLogs.map((l) => {
    if (
      (l.clientId === clientId || (l.client && clientId && l.client.toLowerCase() === clientId.toLowerCase())) &&
      l.process.toLowerCase() === processName.toLowerCase()
    ) {
      found = true;
      return { ...l, currentStage: newStageName, date: nowStr };
    }
    return l;
  });

  const rawClientsStr = typeof window !== "undefined" ? (localStorage.getItem("clients") || sessionStorage.getItem("clients")) : null;
  let clientDisplayName = clientId;
  if (rawClientsStr) {
    try {
      const parsedClients = JSON.parse(rawClientsStr);
      const foundClient = parsedClients.find((c: any) => c.id === clientId || c.name?.toLowerCase() === clientId.toLowerCase());
      if (foundClient?.name) clientDisplayName = foundClient.name;
    } catch {}
  }

  if (!found) {
    const newLog: CallLog = {
      id: `PRC-${clientId}-${Date.now().toString().slice(-4)}`,
      client: clientDisplayName,
      clientId: clientId,
      type: "Inbound",
      status: "In Progress",
      process: processName,
      currentStage: newStageName,
      duration: "0:00",
      date: nowStr,
      hasRecording: false,
      hasTranscript: true,
      hasScheduledCall: true,
    };
    updated.unshift(newLog);
  }

  saveCallLogs(updated);

  // Synchronize to clients in storage and dispatch cross-view events
  if (typeof window !== "undefined") {
    try {
      const rawClients = localStorage.getItem("clients") || sessionStorage.getItem("clients");
      if (rawClients) {
        const clients = JSON.parse(rawClients);
        let changed = false;
        const nextClients = clients.map((c: any) => {
          if (
            c.id === clientId ||
            (c.name && clientId && c.name.toLowerCase() === clientId.toLowerCase())
          ) {
            changed = true;
            const newMap = { ...(c.processStagesMap || {}), [processName]: newStageName };
            return {
              ...c,
              processStagesMap: newMap,
              stage: newStageName,
              lastUpdatedProcess: processName,
            };
          }
          return c;
        });

        if (changed) {
          const serialized = JSON.stringify(nextClients);
          localStorage.setItem("clients", serialized);
          sessionStorage.setItem("clients", serialized);
          window.dispatchEvent(new CustomEvent("clientsStore_updated", { detail: nextClients }));
        }
      }
    } catch (e) {
      console.warn("Failed to sync stage to clients store:", e);
    }

    // Synchronize to deals in storage
    try {
      const rawDeals = localStorage.getItem("deals") || sessionStorage.getItem("deals");
      if (rawDeals) {
        const deals = JSON.parse(rawDeals);
        let dealChanged = false;
        const updatedDeals = deals.map((d: any) => {
          if (
            (d.clientId === clientId || (d.clientName && clientId && d.clientName.toLowerCase() === clientId.toLowerCase())) &&
            d.stage &&
            d.stage.toLowerCase().startsWith(processName.toLowerCase())
          ) {
            dealChanged = true;
            return { ...d, stage: `${processName}: ${newStageName}` };
          }
          return d;
        });
        if (dealChanged) {
          const serializedDeals = JSON.stringify(updatedDeals);
          localStorage.setItem("deals", serializedDeals);
          sessionStorage.setItem("deals", serializedDeals);
          window.dispatchEvent(new CustomEvent("deals_updated"));
        }
      }
    } catch (e) {
      console.warn("Failed to sync stage to deals:", e);
    }

    window.dispatchEvent(new CustomEvent("patient_portal_client_changed", { detail: clientId }));
  }
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
