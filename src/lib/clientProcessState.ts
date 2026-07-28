export interface ClientProcessStage {
  processId: string;
  processName: string;
  stageId: string;
  stageName: string;
}

// Reads/writes an additive field on the existing client record stored under
// sessionStorage "clients" (same key Clients.tsx/ClientProfile.tsx already use).
// Does not touch any other field on the client object.
export function getClientProcessStages(clientId: string): ClientProcessStage[] {
  try {
    const raw = sessionStorage.getItem("clients");
    const clients = raw ? JSON.parse(raw) : [];
    const client = clients.find((c: any) => c.id === clientId);
    return client?.processStages ?? [];
  } catch {
    return [];
  }
}

export function setClientProcessStage(clientId: string, entry: ClientProcessStage) {
  try {
    const raw = sessionStorage.getItem("clients");
    const clients = raw ? JSON.parse(raw) : [];
    const updated = clients.map((c: any) => {
      if (c.id !== clientId) return c;
      const existing: ClientProcessStage[] = c.processStages ?? [];
      const withoutThisProcess = existing.filter((e) => e.processId !== entry.processId);
      return { ...c, processStages: [...withoutThisProcess, entry] };
    });
    sessionStorage.setItem("clients", JSON.stringify(updated));
  } catch {}
}

export function findClientByPhone(phone: string): any | null {
  try {
    const raw = sessionStorage.getItem("clients");
    const clients = raw ? JSON.parse(raw) : [];
    return clients.find((c: any) => c.phone?.replace(/\s/g, "") === phone.replace(/\s/g, "")) ?? null;
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
    const raw = sessionStorage.getItem("clients");
    const clients = raw ? JSON.parse(raw) : [];
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
      responsible: "",
      lastContact: new Date().toISOString().split("T")[0],
      status: "Active",
      processStages: [entry],
    };
    sessionStorage.setItem("clients", JSON.stringify([newClient, ...clients]));
    return newClient;
  } catch {
    return null;
  }
}
