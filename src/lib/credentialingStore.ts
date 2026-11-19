import { eventBus } from "./eventBus";
import { getStoredTeamMembers, type TeamMember } from "./teamStore";
import { getStoredTasks, createTaskRecord, saveStoredTasks } from "./tasksStore";

export const CREDENTIALING_STORAGE_KEY = "mantra_credentialing_v1";
export const CREDENTIALING_UPDATED_EVENT = "credentialing.updated";

export type CredentialingScope = "organization" | "provider";
export type NetworkStatus = "in_network" | "out_of_network";
export type CredentialingStatus =
  | "not_started"
  | "submitted"
  | "in_review"
  | "credentialed"
  | "denied"
  | "expired"
  | "terminated";

export interface CredentialingRecord {
  id: string;
  scope: CredentialingScope;
  memberId?: string; // TeamMember.id for provider scope
  memberName?: string;
  payerId: string; // Payer EDI ID or internal payer id
  payerName?: string;
  payerAssignedId?: string;
  billingNpi?: string; // override for org, defaults to group NPI
  networkStatus: NetworkStatus;
  status: CredentialingStatus;
  effectiveDate?: string;
  expiresDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export function getStoredCredentialing(): CredentialingRecord[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(CREDENTIALING_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to read credentialing records:", e);
    return [];
  }
}

export function saveStoredCredentialing(records: CredentialingRecord[]): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(CREDENTIALING_STORAGE_KEY, JSON.stringify(records));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("mantra:credentialing_changed"));
    }
  } catch (e) {
    console.error("Failed to save credentialing records:", e);
  }
}

export function upsertCredentialingRecord(record: Partial<CredentialingRecord> & { scope: CredentialingScope; payerId: string }): CredentialingRecord {
  const current = getStoredCredentialing();
  const timestamp = new Date().toISOString();

  const id =
    record.id ||
    (record.scope === "organization"
      ? `cred-org-${record.payerId}`
      : `cred-prov-${record.memberId || "unknown"}-${record.payerId}`);

  const existingIdx = current.findIndex(
    (c) =>
      c.id === id ||
      (c.scope === record.scope &&
        c.payerId === record.payerId &&
        (record.scope === "organization" || String(c.memberId) === String(record.memberId)))
  );

  const finalRecord: CredentialingRecord = {
    id,
    scope: record.scope,
    memberId: record.memberId ? String(record.memberId) : undefined,
    memberName: record.memberName,
    payerId: record.payerId,
    payerName: record.payerName,
    payerAssignedId: record.payerAssignedId,
    billingNpi: record.billingNpi,
    networkStatus: record.networkStatus || "in_network",
    status: record.status || "not_started",
    effectiveDate: record.effectiveDate,
    expiresDate: record.expiresDate,
    notes: record.notes,
    createdAt: existingIdx >= 0 ? current[existingIdx].createdAt : timestamp,
    updatedAt: timestamp,
  };

  let updated: CredentialingRecord[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = finalRecord;
  } else {
    updated = [...current, finalRecord];
  }

  saveStoredCredentialing(updated);

  // Emit event bus notification
  void eventBus.emit(CREDENTIALING_UPDATED_EVENT, "claim", finalRecord.id, finalRecord);

  return finalRecord;
}

export function deleteCredentialingRecord(id: string): void {
  const current = getStoredCredentialing();
  const filtered = current.filter((c) => c.id !== id);
  if (filtered.length !== current.length) {
    saveStoredCredentialing(filtered);
    void eventBus.emit(CREDENTIALING_UPDATED_EVENT, "claim", id, { deletedId: id });
  }
}

export function getOrgCredentialing(payerId: string): CredentialingRecord | undefined {
  return getStoredCredentialing().find(
    (c) => c.scope === "organization" && (c.payerId === payerId || c.payerName?.toLowerCase() === payerId.toLowerCase())
  );
}

export function getProviderCredentialing(memberId: string | number | undefined, payerId: string): CredentialingRecord | undefined {
  if (!memberId) return undefined;
  const mId = String(memberId);
  const records = getStoredCredentialing();
  const direct = records.find(
    (c) =>
      c.scope === "provider" &&
      String(c.memberId) === mId &&
      (c.payerId === payerId || c.payerName?.toLowerCase() === payerId.toLowerCase())
  );
  if (direct) return direct;

  try {
    const member = getStoredTeamMembers().find((m) => String(m.id) === mId || m.npi === mId);
    if (member) {
      return records.find(
        (c) =>
          c.scope === "provider" &&
          (String(c.memberId) === String(member.id) || (member.npi && String(c.memberId) === member.npi)) &&
          (c.payerId === payerId || c.payerName?.toLowerCase() === payerId.toLowerCase())
      );
    }
  } catch {
    // ignore
  }
  return undefined;
}

export function isOrgCredentialed(payerId: string): boolean {
  if (!payerId) return false;
  const rec = getOrgCredentialing(payerId);
  return rec?.status === "credentialed";
}

export function isProviderCredentialed(
  memberId: string | number | undefined,
  payerId: string,
  dateOfService?: string
): boolean {
  if (!memberId || !payerId) return false;
  const rec = getProviderCredentialing(memberId, payerId);
  if (!rec || rec.status !== "credentialed") return false;

  if (dateOfService) {
    const dos = new Date(dateOfService).getTime();
    if (rec.effectiveDate && new Date(rec.effectiveDate).getTime() > dos) {
      return false;
    }
    if (rec.expiresDate && new Date(rec.expiresDate).getTime() < dos) {
      return false;
    }
  }
  return true;
}

export function getProviderNetworkStatus(
  memberId: string | number | undefined,
  payerId: string
): NetworkStatus {
  if (!memberId || !payerId) return "out_of_network";
  const rec = getProviderCredentialing(memberId, payerId);
  return rec?.networkStatus || "out_of_network";
}

export function getRenderingProviders(): TeamMember[] {
  const members = getStoredTeamMembers();
  return members.filter((m) => Boolean(m.npi) || Boolean((m as any).isRenderingProvider));
}

export function getCredentialedProvidersCount(payerId: string): { credentialed: number; total: number } {
  const renderers = getRenderingProviders();
  const total = renderers.length;
  if (total === 0) return { credentialed: 0, total: 0 };
  let count = 0;
  for (const m of renderers) {
    if (isProviderCredentialed(m.id, payerId)) {
      count++;
    }
  }
  return { credentialed: count, total };
}

export function checkExpiringCredentialing(): number {
  try {
    const records = getStoredCredentialing();
    const tasks = getStoredTasks();
    const now = Date.now();
    let created = 0;

    for (const rec of records) {
      if (rec.status !== "credentialed" || !rec.expiresDate) continue;
      const expireMs = new Date(rec.expiresDate).getTime();
      const diffDays = Math.ceil((expireMs - now) / (1000 * 60 * 60 * 24));

      if (diffDays <= 60 && diffDays >= 0) {
        const taskId = `task-cred-exp-${rec.id}`;
        if (!tasks.some((t) => t.id === taskId)) {
          const targetName = rec.scope === "provider" ? (rec.memberName || "Provider") : "Organization";
          const newTask = createTaskRecord({
            id: taskId,
            code: `CRD-${Math.floor(1000 + Math.random() * 9000)}`,
            title: `Credentialing expiring in ${diffDays} days for ${targetName} (${rec.payerName || rec.payerId})`,
            description: `Credentialing expires on ${rec.expiresDate}. Payer: ${rec.payerName || rec.payerId}.`,
            status: "pending",
            priority: diffDays <= 30 ? "high" : "normal",
            queueId: "queue-billing",
            dueAt: rec.expiresDate,
          } as any);
          tasks.unshift(newTask);
          created++;
        }
      }
    }

    if (created > 0) {
      saveStoredTasks(tasks);
    }
    return created;
  } catch (e) {
    console.error("Failed to check expiring credentialing:", e);
    return 0;
  }
}
