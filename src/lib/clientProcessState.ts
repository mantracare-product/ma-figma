import { broadcastSync, onSyncEvent } from "./syncBroadcast";

export const CLIENTS_STORE_EVENT = "clientsStore_updated";

function notifyClientsChanged() {
  window.dispatchEvent(new Event(CLIENTS_STORE_EVENT));
  broadcastSync("CLIENTS_UPDATED");
}

// Auto-sync when another window modifies clients
if (typeof window !== "undefined") {
  onSyncEvent("CLIENTS_UPDATED", () => {
    window.dispatchEvent(new Event(CLIENTS_STORE_EVENT));
  });
}

export interface ClientProcessStage {
  processId: string;
  processName: string;
  stageId: string;
  stageName: string;
  channel?: "whatsapp" | "sms"; // source of this enrollment
  updatedAt?: string;
}

export function getStoredClients(): any[] {
  try {
    // Prefer localStorage for cross-window sync, migrate from sessionStorage if missing
    let raw = localStorage.getItem("clients");
    if (!raw) {
      raw = sessionStorage.getItem("clients");
      if (raw) {
        localStorage.setItem("clients", raw);
      }
    }
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredClients(clients: any[]) {
  try {
    const serialized = JSON.stringify(clients);
    localStorage.setItem("clients", serialized);
    sessionStorage.setItem("clients", serialized);
    notifyClientsChanged();
  } catch {}
}

// Reads/writes an additive field on the existing client record stored under
// localStorage/sessionStorage "clients", plus a dedicated key for guaranteed persistence.
export function getClientProcessStages(clientId: string): ClientProcessStage[] {
  try {
    const dedicatedRaw = localStorage.getItem(`patient_stage_${clientId}`);
    if (dedicatedRaw) {
      const parsed = JSON.parse(dedicatedRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    const clients = getStoredClients();
    const client = clients.find((c: any) => c.id === clientId);
    if (client?.processStages && client.processStages.length > 0) {
      return client.processStages;
    }
    if (clientId === "CL-001") {
      return [
        {
          processId: "op-cataract",
          processName: "Cataract Surgery Daycare",
          stageId: "cat-3",
          stageName: "Pre-Op Prep",
          channel: "sms",
        },
      ];
    }
    return [];
  } catch {
    return [];
  }
}

export function setClientProcessStage(clientId: string, entry: ClientProcessStage) {
  try {
    const stageEntryWithTime = {
      ...entry,
      updatedAt: entry.updatedAt || new Date().toISOString(),
    };

    // 1. Guaranteed storage key
    localStorage.setItem(
      `patient_stage_${clientId}`,
      JSON.stringify([stageEntryWithTime])
    );

    // 2. Main clients collection
    const clients = getStoredClients();
    const exists = clients.some((c: any) => c.id === clientId);
    let updated: any[];

    if (exists) {
      updated = clients.map((c: any) => {
        if (c.id !== clientId) return c;
        const existing: ClientProcessStage[] = c.processStages ?? [];
        const withoutThisProcess = existing.filter((e) => e.processId !== entry.processId);
        return {
          ...c,
          name: c.name === "Sarah Johnson" ? "Ramesh Iyer" : c.name,
          stage: entry.stageName, // also update primary stage for Kanban
          processStages: [...withoutThisProcess, stageEntryWithTime],
        };
      });
    } else {
      const newClient = {
        id: clientId,
        name: clientId === "CL-001" ? "Ramesh Iyer" : `Patient ${clientId}`,
        email: clientId === "CL-001" ? "ramesh.i@example.com" : "",
        phone: clientId === "CL-001" ? "+91 98201 45678" : "",
        country: "IN",
        countryCode: "+91",
        countryFlag: "🇮🇳",
        processes: [entry.processName],
        stage: entry.stageName,
        responsible: "",
        lastContact: new Date().toISOString().split("T")[0],
        status: "Active",
        processStages: [stageEntryWithTime],
      };
      updated = [...clients, newClient];
    }
    saveStoredClients(updated);
  } catch {}
}

export function findClientByPhone(phone: string): any | null {
  try {
    const clients = getStoredClients();
    return clients.find((c: any) => c.phone?.replace(/\s/g, "") === phone.replace(/\s/g, "")) ?? null;
  } catch {
    return null;
  }
}

export function findClientById(clientId: string): any | null {
  try {
    const clients = getStoredClients();
    const found = clients.find((c: any) => c.id === clientId);
    if (found) {
      return {
        ...found,
        name: found.name === "Sarah Johnson" ? "Ramesh Iyer" : found.name,
      };
    }
    if (clientId === "CL-001") {
      return {
        id: "CL-001",
        name: "Ramesh Iyer",
        email: "ramesh.i@example.com",
        phone: "+91 98201 45678",
        age: 62,
        stage: "Pre-Op Prep",
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function createClientWithProcessStage(
  name: string,
  phone: string,
  entry: ClientProcessStage
): any {
  try {
    const clients = getStoredClients();
    const newClient = {
      id: `CL-SIM-${Date.now()}`,
      name,
      email: "",
      phone,
      phoneNumber: phone,
      country: "US",
      countryCode: "+1",
      countryFlag: "🇺🇸",
      processes: [entry.processName],
      stage: entry.stageName,
      source: entry.channel ?? "unknown",
      responsible: "",
      lastContact: new Date().toISOString().split("T")[0],
      status: "Active",
      processStages: [{
        ...entry,
        updatedAt: new Date().toISOString(),
      }],
    };
    saveStoredClients([newClient, ...clients]);
    return newClient;
  } catch {
    return null;
  }
}

