/**
 * clientsStore.ts
 * Path: src/lib/clientsStore.ts
 *
 * Centralized, reactive Client store for MantraAssist.
 * Shared across Clients.tsx, Appointments.tsx, Deals.tsx, and AI Receptionist.
 */

import { useState, useEffect } from "react";
import { initialClients as canonicalClients, type Client } from "../data/canonicalClients";
import { getStoredProcesses, DEMO_PATIENT_PORTAL_PROCESS_ID } from "./useProcessStore";

export type { Client };
export const CLIENTS_STORE_EVENT = "clientsStore_updated";
export const CLIENTS_STORAGE_KEY = "clients";
export const CLIENTS_CHANNEL_NAME = "clients_store_broadcast_channel";

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    broadcastChannel = new BroadcastChannel(CLIENTS_CHANNEL_NAME);
  } catch (e) {
    console.warn("BroadcastChannel not supported:", e);
  }
}

export function getStoredClients(): Client[] {
  if (typeof window === "undefined") return canonicalClients;
  try {
    const saved = window.localStorage?.getItem(CLIENTS_STORAGE_KEY) || window.sessionStorage?.getItem(CLIENTS_STORAGE_KEY);
    if (saved) {
      let parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let changed = false;
        parsed = parsed.map((c: Client) => {
          const canonical = canonicalClients.find((cc) => cc.id === c.id);
          let updated = { ...c };
          let clientChanged = false;

          if (c.id === "CL-001") {
            const desired = ["Patient Care Journey", "Client Intake", "Appointment Scheduling"];
            const merged = Array.from(new Set([...desired, ...(c.processes || [])]));
            if (JSON.stringify(c.processes) !== JSON.stringify(merged)) {
              updated.processes = merged;
              clientChanged = true;
            }
            if (!["Client Checked In", "Book Appointment", "Move to Pharmacy", "Pay Bill", "Payment Done"].includes(c.stage)) {
              updated.stage = "Client Checked In";
              clientChanged = true;
            }
          } else if (canonical && canonical.processes && canonical.processes.length > (c.processes?.length || 0)) {
            const merged = Array.from(new Set([...(c.processes || []), ...canonical.processes]));
            if (JSON.stringify(c.processes) !== JSON.stringify(merged)) {
              updated.processes = merged;
              clientChanged = true;
            }
          }

          if (clientChanged) {
            changed = true;
            return updated;
          }
          return c;
        });
        // Sanitize any client with invalid, empty, or 'new' ID
        let maxExisting = 30;
        parsed.forEach((c: Client) => {
          const m = c.id?.match(/^CL-(\d+)$/i);
          if (m) {
            const n = parseInt(m[1], 10);
            if (n > maxExisting) maxExisting = n;
          }
        });

        parsed = parsed.map((c: Client) => {
          if (!c.id || c.id === "new" || c.id.trim() === "") {
            changed = true;
            maxExisting++;
            return {
              ...c,
              id: `CL-${String(maxExisting).padStart(3, "0")}`,
            };
          }
          return c;
        });

        if (changed) {
          try {
            window.localStorage?.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(parsed));
            window.sessionStorage?.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(parsed));
          } catch {}
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Failed to parse clients from storage:", err);
  }
  // Initialize storage with canonical clients if not present
  try {
    const serialized = JSON.stringify(canonicalClients);
    window.localStorage?.setItem(CLIENTS_STORAGE_KEY, serialized);
    window.sessionStorage?.setItem(CLIENTS_STORAGE_KEY, serialized);
  } catch {}
  return canonicalClients;
}

export function saveStoredClients(clients: Client[]): void {
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(clients);
    window.localStorage?.setItem(CLIENTS_STORAGE_KEY, serialized);
    window.sessionStorage?.setItem(CLIENTS_STORAGE_KEY, serialized);
    window.dispatchEvent(new CustomEvent(CLIENTS_STORE_EVENT, { detail: clients }));
    broadcastChannel?.postMessage({ type: CLIENTS_STORE_EVENT, count: clients.length });
  } catch (err) {
    console.error("Failed to save clients:", err);
  }
}

export function addOrUpdateClient(data: Partial<Client> & { name: string }): Client {
  const currentClients = getStoredClients();
  const cleanName = data.name.trim();
  const cleanPhone = (data.phone || (data as any).phoneNumber || "").replace(/\D/g, "");
  const normName = cleanName.toLowerCase().replace(/\s+/g, " ").trim();
  const normPhone = cleanPhone.length >= 7 ? cleanPhone.slice(-10) : cleanPhone;

  // Look for existing client by ID, OR by (normalized name AND normalized phone)
  const existingIndex = currentClients.findIndex((c) => {
    if (data.id && c.id === data.id) return true;
    const cNormName = (c.name || "").toLowerCase().replace(/\s+/g, " ").trim();
    const cPhoneRaw = (c.phone || (c as any).phoneNumber || "").replace(/\D/g, "");
    const cNormPhone = cPhoneRaw.length >= 7 ? cPhoneRaw.slice(-10) : cPhoneRaw;

    if (normName && cNormName && normName === cNormName) {
      if (normPhone && cNormPhone) {
        return normPhone === cNormPhone;
      }
      return true;
    }
    return false;
  });

  const todayStr = new Date().toISOString().split("T")[0];

  if (existingIndex !== -1) {
    const existing = currentClients[existingIndex];
    const cNormName = (existing.name || "").toLowerCase().replace(/\s+/g, " ").trim();
    const finalName = (normName && cNormName && normName === cNormName) ? existing.name : (cleanName || existing.name);

    const updated: Client = {
      ...existing,
      ...data,
      id: existing.id,
      name: finalName,
      phone: data.phone || existing.phone,
      email: data.email || existing.email,
      responsible: data.responsible || existing.responsible || "John Smith",
      processes: data.processes && data.processes.length > 0 ? data.processes : existing.processes,
      stage: data.stage || existing.stage,
      lastContact: todayStr,
      status: data.status || existing.status || "Active",
    };
    currentClients[existingIndex] = updated;
    // Move updated client to the top of the list for immediate visibility
    const [moved] = currentClients.splice(existingIndex, 1);
    currentClients.unshift(moved);
    saveStoredClients(currentClients);
    return updated;
  }

  // Generate new ID (e.g. CL-035)
  const maxNumericId = currentClients.reduce((max, c) => {
    const match = c.id?.match(/^CL-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > max ? num : max;
    }
    return max;
  }, 30);
  const newId = (data.id && data.id !== "new" && data.id.trim() !== "") ? data.id : `CL-${String(maxNumericId + 1).padStart(3, "0")}`;

  const newClient: Client = {
    id: newId,
    name: cleanName,
    email: data.email || "",
    phone: data.phone || "",
    country: data.country || (data.phone?.startsWith("+1") ? "US" : "IN"),
    countryCode: data.countryCode || (data.phone?.startsWith("+1") ? "+1" : "+91"),
    countryFlag: data.countryFlag || (data.phone?.startsWith("+1") ? "🇺🇸" : "🇮🇳"),
    processes: data.processes && data.processes.length > 0 ? data.processes : ["Appointment Scheduling"],
    stage: data.stage || "Confirmed",
    responsible: data.responsible || "John Smith",
    lastContact: todayStr,
    status: data.status || "Active",
    location: data.location || "Mumbai, India",
    companyName: data.companyName,
    jobPosition: data.jobPosition,
    numberOfEmployees: data.numberOfEmployees,
  };

  currentClients.unshift(newClient);
  saveStoredClients(currentClients);
  return newClient;
}

export function deleteStoredClient(id: string): void {
  const currentClients = getStoredClients();
  const filtered = currentClients.filter((c) => c.id !== id);
  saveStoredClients(filtered);
}

/**
 * Move a client to a target stage in a process (e.g. "Patient Care Journey")
 * and notifies all listeners, patient portal views, and call logs.
 */
export function moveClientToStage(
  clientId: string,
  targetStageIdOrName: string,
  processIdOrName?: string
): Client | null {
  if (!clientId || !targetStageIdOrName) return null;
  const currentClients = getStoredClients();
  const index = currentClients.findIndex(
    (c) => c.id === clientId || c.name?.toLowerCase() === clientId.toLowerCase()
  );
  if (index === -1) {
    console.warn(`[clientsStore] moveClientToStage: Client "${clientId}" not found.`);
    return null;
  }

  const client = currentClients[index];

  // Dynamically resolve target process and stage name
  let targetProcessName = "Patient Care Journey";
  let targetStageName = targetStageIdOrName;

  try {
    const allProcesses = getStoredProcesses();
    const targetProcess = allProcesses.find(
      (p: any) =>
        p.id === processIdOrName ||
        p.name === processIdOrName ||
        p.id === DEMO_PATIENT_PORTAL_PROCESS_ID ||
        p.name === "Patient Care Journey"
    );

    if (targetProcess) {
      targetProcessName = targetProcess.name || "Patient Care Journey";
      if (Array.isArray(targetProcess.stages)) {
        const q = targetStageIdOrName.trim().toLowerCase();
        const matched = targetProcess.stages.find(
          (s: any) =>
            s.id?.toLowerCase() === q ||
            s.name?.toLowerCase() === q ||
            s.name?.toLowerCase().includes(q) ||
            q.includes(s.name?.toLowerCase())
        );
        if (matched) {
          targetStageName = matched.name;
        }
      }
    }
  } catch (err) {
    console.warn("[clientsStore] Could not load process definitions for stage resolution:", err);
  }

  const existingProcesses = Array.isArray(client.processes) ? [...client.processes] : [];
  if (targetProcessName && !existingProcesses.includes(targetProcessName)) {
    existingProcesses.push(targetProcessName);
  }

  const updatedClient: Client = {
    ...client,
    stage: targetStageName,
    processes: existingProcesses,
  };

  currentClients[index] = updatedClient;
  saveStoredClients(currentClients);

  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent("patient_portal_client_changed", { detail: updatedClient.id })
      );
    } catch {}
  }

  return updatedClient;
}

/**
 * Reactive React Hook for subscribing to the live Client Store.
 */
export function useClients() {
  const [clients, setClients] = useState<Client[]>(() => getStoredClients());

  useEffect(() => {
    const handleUpdate = (e?: any) => {
      const fresh = getStoredClients();
      console.log(`[clientsStore] useClients received update event (${e?.type || 'channel'}), new count:`, fresh.length, 'Top client:', fresh[0]?.name);
      setClients(fresh);
    };

    const handleVisibility = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        handleUpdate({ type: 'visibilitychange' });
      }
    };

    window.addEventListener(CLIENTS_STORE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("focus", handleUpdate);
    document.addEventListener("visibilitychange", handleVisibility);

    let channel: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        channel = new BroadcastChannel(CLIENTS_CHANNEL_NAME);
        channel.onmessage = handleUpdate;
      } catch (e) {
        console.warn("Failed to create BroadcastChannel in useClients:", e);
      }
    }

    return () => {
      window.removeEventListener(CLIENTS_STORE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("focus", handleUpdate);
      document.removeEventListener("visibilitychange", handleVisibility);
      channel?.close();
    };
  }, []);

  return {
    clients,
    setClients: (newClients: Client[] | ((prev: Client[]) => Client[])) => {
      if (typeof newClients === "function") {
        const updated = newClients(getStoredClients());
        saveStoredClients(updated);
        setClients(updated);
      } else {
        saveStoredClients(newClients);
        setClients(newClients);
      }
    },
    addClient: addOrUpdateClient,
    deleteClient: deleteStoredClient,
  };
}
