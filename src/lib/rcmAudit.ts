/**
 * Audit entries for user-initiated RCM changes (Slice 6, item 6.5). Thin wrapper over auditLogsStore.recordAuditLog
 * that fills in the actor from the signed-in user. Never throws: a failed audit write must not block the action.
 */
import { recordAuditLog, type AuditAction } from "./auditLogsStore";

export interface RcmAuditInput {
  action: AuditAction;
  entityType: string;
  entityId: string;
  summary: string;
  targetName?: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  /** "user" (default: the signed-in user) or a rule/automation name for system changes. */
  actor?: string;
}

function currentUser(): { name: string; email: string; role: string } {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem("user_data") : null;
    const u = raw ? JSON.parse(raw) : null;
    return { name: u?.name || "User", email: u?.email || "", role: u?.role || localStorage.getItem("user_role") || "" };
  } catch {
    return { name: "User", email: "", role: "" };
  }
}

export function recordRcmAudit(a: RcmAuditInput): void {
  try {
    const u = a.actor ? { name: a.actor, email: "", role: "automation" } : currentUser();
    recordAuditLog({
      actorId: u.email || u.name,
      actorName: u.name,
      actorEmail: u.email,
      actorRole: u.role,
      action: a.action,
      module: "RCM",
      entityType: a.entityType,
      entityId: a.entityId,
      targetName: a.targetName || a.entityId,
      summary: a.summary,
      before: a.before ?? null,
      after: a.after ?? null,
    });
  } catch (e) {
    console.warn("[rcmAudit] could not record audit entry:", e);
  }
}
