/**
 * auditLogsStore.ts
 * Path: src/lib/auditLogsStore.ts
 *
 * Centralized, immutable Audit Logging subsystem for MantraAssist Admin.
 * Records administrative mutations with actor metadata, before/after diffs,
 * and request details. Read-only in the UI.
 */

import { useState, useEffect, useCallback } from "react";

export type AuditAction =
  | "created"
  | "updated"
  | "deleted"
  | "suspended"
  | "reactivated"
  | "login"
  | "export"
  | "assigned"
  | "unassigned"
  | "reset_password"
  | "invite_sent"
  | "refunded";

export type AuditModule =
  | "Organizations"
  | "Users"
  | "Plans"
  | "Phone Numbers"
  | "Orders"
  | "Subscriptions"
  | "Telephony"
  | "Security"
  | "Roles"
  | "Templates"
  | "RCM";

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO string
  actorId: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  action: AuditAction;
  module: AuditModule;
  entityType: string;
  entityId: string;
  targetName: string;
  summary: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  ip: string;
  userAgent: string;
}

export const AUDIT_LOGS_STORAGE_KEY = "mantra_admin_audit_logs";
export const AUDIT_LOGS_STORE_EVENT = "mantra-audit-logs-updated";

// Seeded realistic audit log records
export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: "aud-001",
    timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(), // 18 mins ago
    actorId: "usr-admin-1",
    actorName: "Alexander Vance",
    actorEmail: "alexander.v@mantra.care",
    actorRole: "SystemAdmin",
    action: "updated",
    module: "Organizations",
    entityType: "Organization",
    entityId: "org-0001",
    targetName: "Eye Mantra Super Specialty",
    summary: "Updated operating hours and primary telephony configuration to Twilio SIP Trunk",
    before: {
      operatingHours: "MON-FRI: 09:00-18:00",
      telephonyChoice: "default",
      callVolume: "25-100 a day",
    },
    after: {
      operatingHours: "MON-SAT: 09:00-19:00",
      telephonyChoice: "twilio_sip",
      callVolume: "100-300 a day",
    },
    ip: "192.168.1.145",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0 Safari/537.36",
  },
  {
    id: "aud-002",
    timestamp: new Date(Date.now() - 1000 * 60 * 54).toISOString(), // 54 mins ago
    actorId: "usr-admin-2",
    actorName: "Elena Rostova",
    actorEmail: "elena.r@mantra.care",
    actorRole: "Admin",
    action: "assigned",
    module: "Phone Numbers",
    entityType: "PhoneNumber",
    entityId: "num-101",
    targetName: "+1 (555) 234-5678",
    summary: "Assigned toll-free number to Demo Mantra Care for 24/7 AI Receptionist routing",
    before: {
      status: "Unassigned",
      assignedOrgId: null,
      assignedOrgName: null,
      assignedTo: null,
    },
    after: {
      status: "In Use",
      assignedOrgId: "org-0002",
      assignedOrgName: "Demo Mantra Care",
      assignedTo: "AI Receptionist",
    },
    ip: "74.125.210.82",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15",
  },
  {
    id: "aud-003",
    timestamp: new Date(Date.now() - 1000 * 60 * 140).toISOString(), // 2.3 hours ago
    actorId: "usr-admin-1",
    actorName: "Alexander Vance",
    actorEmail: "alexander.v@mantra.care",
    actorRole: "SystemAdmin",
    action: "created",
    module: "Users",
    entityType: "User",
    entityId: "usr-104",
    targetName: "Dr. Marcus Chen",
    summary: "Created user profile and issued intake coordinator permissions invite",
    before: null,
    after: {
      name: "Dr. Marcus Chen",
      email: "marcus.chen@eyemantra.org",
      role: "Intake Coordinator",
      status: "Invited",
      department: "Clinical Intake",
    },
    ip: "192.168.1.145",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0 Safari/537.36",
  },
  {
    id: "aud-004",
    timestamp: new Date(Date.now() - 1000 * 60 * 320).toISOString(), // ~5 hours ago
    actorId: "usr-admin-3",
    actorName: "Finance System",
    actorEmail: "billing@mantra.care",
    actorRole: "Finance",
    action: "created",
    module: "Orders",
    entityType: "Order",
    entityId: "ord-8831",
    targetName: "ORD-8831 (Heart Care Clinic)",
    summary: "Processed automated recurring order renewal for AI Clinic Receptionist Pro Plan",
    before: null,
    after: {
      orderId: "ORD-8831",
      orgName: "Heart Care Clinic",
      planName: "AI Clinic Receptionist Pro",
      amount: 299,
      currency: "USD",
      paymentStatus: "Paid",
      orderStatus: "Completed",
    },
    ip: "10.0.0.8",
    userAgent: "MantraBillingWorker/2.4 (Node.js 20)",
  },
  {
    id: "aud-005",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    actorId: "usr-admin-2",
    actorName: "Elena Rostova",
    actorEmail: "elena.r@mantra.care",
    actorRole: "Admin",
    action: "updated",
    module: "Subscriptions",
    entityType: "Subscription",
    entityId: "sub-441",
    targetName: "Zenith Wellness & Yoga",
    summary: "Upgraded monthly plan from Starter to Wellness Growth Tier and added 250 bonus credits",
    before: {
      planName: "AI Receptionist Starter",
      creditsIncluded: 500,
      mrr: 149,
      status: "Active",
    },
    after: {
      planName: "AI Wellness Growth Tier",
      creditsIncluded: 750,
      mrr: 299,
      status: "Active",
    },
    ip: "74.125.210.82",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15",
  },
  {
    id: "aud-006",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(), // 1.5 days ago
    actorId: "usr-admin-1",
    actorName: "Alexander Vance",
    actorEmail: "alexander.v@mantra.care",
    actorRole: "SystemAdmin",
    action: "deleted",
    module: "Users",
    entityType: "User",
    entityId: "usr-098",
    targetName: "Robert Hayes",
    summary: "Deleted staff user account and revoked administrative access credentials",
    before: {
      status: "Active",
      email: "robert.h@eyemantra.org",
    },
    after: null,
    ip: "192.168.1.145",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0 Safari/537.36",
  },
  {
    id: "aud-007",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    actorId: "usr-admin-1",
    actorName: "Alexander Vance",
    actorEmail: "alexander.v@mantra.care",
    actorRole: "SystemAdmin",
    action: "created",
    module: "Templates",
    entityType: "DocumentTemplate",
    entityId: "tmpl-doc-04",
    targetName: "HIPAA Patient Consent & Telehealth Release v2",
    summary: "Created clinical document template \"HIPAA Patient Consent & Telehealth Release v2\"",
    before: null,
    after: {
      templateName: "HIPAA Patient Consent & Telehealth Release v2",
      fieldsCount: 12,
      eSignatureRequired: true,
    },
    ip: "192.168.1.145",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0 Safari/537.36",
  },
  {
    id: "aud-008",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 60).toISOString(), // 2.5 days ago
    actorId: "usr-admin-2",
    actorName: "Elena Rostova",
    actorEmail: "elena.r@mantra.care",
    actorRole: "Admin",
    action: "updated",
    module: "Templates",
    entityType: "WorkflowTemplate",
    entityId: "tmpl-wf-12",
    targetName: "Post-Op Physical Therapy Evaluation Workflow",
    summary: "Updated clinical intake workflow template stages and automated task dispatch rules",
    before: {
      stagesCount: 4,
      autoDispatch: false,
    },
    after: {
      stagesCount: 5,
      autoDispatch: true,
      slaHours: 24,
    },
    ip: "74.125.210.82",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15",
  },
];

export function getStoredAuditLogs(): AuditLogEntry[] {
  try {
    if (typeof window === "undefined") return INITIAL_AUDIT_LOGS;
    const raw = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(INITIAL_AUDIT_LOGS));
      return INITIAL_AUDIT_LOGS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_AUDIT_LOGS;

    // Migrate any legacy "suspended" logs to "deleted" and ensure template examples exist
    const sanitized: AuditLogEntry[] = parsed.map((l: any) =>
      l.action === "suspended"
        ? {
            ...l,
            action: "deleted" as AuditAction,
            summary: "Deleted staff user account and revoked administrative access credentials",
          }
        : l
    );

    const hasTemplates = sanitized.some((l) => l.module === "Templates");
    if (!hasTemplates) {
      const templateEntries = INITIAL_AUDIT_LOGS.filter((l) => l.module === "Templates");
      sanitized.push(...templateEntries);
    }

    return sanitized;
  } catch {
    return INITIAL_AUDIT_LOGS;
  }
}

function saveStoredAuditLogs(logs: AuditLogEntry[]): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(logs));
      window.dispatchEvent(new CustomEvent(AUDIT_LOGS_STORE_EVENT));
    }
  } catch (err) {
    console.error("Failed to save audit logs:", err);
  }
}

/**
 * Reusable audit log recorder called on any admin mutation.
 */
export function recordAuditLog(
  entry: Omit<AuditLogEntry, "id" | "timestamp" | "ip" | "userAgent"> &
    Partial<Pick<AuditLogEntry, "ip" | "userAgent">>
): AuditLogEntry {
  const currentLogs = getStoredAuditLogs();
  const newLog: AuditLogEntry = {
    ...entry,
    id: `aud-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    ip: entry.ip || "192.168.1.145",
    userAgent:
      entry.userAgent ||
      (typeof navigator !== "undefined" ? navigator.userAgent : "MantraAssistAdminConsole/3.0"),
  };

  const updated = [newLog, ...currentLogs];
  saveStoredAuditLogs(updated);
  return newLog;
}

export function useAuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>(() => getStoredAuditLogs());

  useEffect(() => {
    const handleUpdate = () => {
      setLogs(getStoredAuditLogs());
    };
    window.addEventListener(AUDIT_LOGS_STORE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(AUDIT_LOGS_STORE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return { logs };
}

