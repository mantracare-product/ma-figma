/**
 * adminRolesStore.ts
 * Path: src/lib/adminRolesStore.ts
 *
 * Dedicated RBAC subsystem for MantraAssist Admin:
 * - Roles & Permissions model matching client architecture
 * - Admin-specific module definitions
 * - System roles protection (SystemAdmin is locked; system roles cannot be deleted)
 * - Persistent storage with live event synchronization and audit logging
 */

import { useState, useEffect, useCallback } from "react";
import { recordAuditLog } from "./auditLogsStore";
import { PermissionAction } from "../app/components/settings/PermissionSelect";

export type ScopeLevelOption = "all" | "department" | "own" | "deny";

export interface AdminModulePermission {
  actions: PermissionAction[];
  level: ScopeLevelOption;
}

export interface AdminRoleItem {
  id: string;
  name: string;
  description: string;
  isSystem: boolean; // System roles cannot be deleted
  isLocked?: boolean; // SystemAdmin is locked from editing
  permissions: Record<string, AdminModulePermission>;
  createdDate: string;
}

export interface AdminModuleDefinition {
  id: string;
  label: string;
  group: string;
  path: string;
}

export const ADMIN_MODULES: AdminModuleDefinition[] = [
  // Corporate
  { id: "organizations", label: "Organizations", group: "Corporate", path: "/admin/organizations" },
  { id: "tasks", label: "Tasks", group: "Corporate", path: "/admin/tasks" },
  { id: "industries", label: "Industries", group: "Corporate", path: "/admin/industry-category" },
  // Billing & Orders
  { id: "orders", label: "Orders", group: "Billing & Orders", path: "/admin/billing/orders" },
  { id: "subscriptions", label: "Subscriptions", group: "Billing & Orders", path: "/admin/billing/subscriptions" },
  { id: "plans", label: "Plans & Credits", group: "Billing & Orders", path: "/admin/plans" },
  // Product Analytics
  { id: "productAnalyticsCalls", label: "Product Analytics: Calls", group: "Product Analytics", path: "/admin/product-analytics/calls" },
  // Templates
  { id: "workflows", label: "Workflows", group: "Templates", path: "/admin/workflows" },
  { id: "automations", label: "Automations", group: "Templates", path: "/admin/automations" },
  { id: "forms", label: "Forms", group: "Templates", path: "/admin/forms" },
  { id: "documentTemplates", label: "Document Templates", group: "Templates", path: "/admin/document-templates" },
  { id: "services", label: "Product / Services", group: "Templates", path: "/admin/services" },
  { id: "knowledgeBase", label: "Knowledge Base", group: "Templates", path: "/admin/knowledge-base" },
  { id: "customFields", label: "Sections/Fields", group: "Templates", path: "/admin/custom-fields" },
  { id: "sidebarNavigation", label: "Sidebar Navigation", group: "Templates", path: "/admin/sidebar-config" },
  // Integrations
  { id: "aiVoicesModels", label: "AI Voices & Models", group: "Integrations", path: "/admin/ai-voices-models" },
  { id: "telephonyProviders", label: "Telephony: Providers", group: "Integrations", path: "/admin/integrations/telephony?tab=providers" },
  { id: "telephonyNumbers", label: "Telephony: Numbers", group: "Integrations", path: "/admin/integrations/telephony?tab=numbers" },
  // Settings
  { id: "userManagement", label: "User Management", group: "Settings", path: "/admin/settings/users" },
  { id: "roles", label: "Roles", group: "Settings", path: "/admin/settings/users?tab=roles" },
  { id: "auditLogs", label: "Audit Logs", group: "Settings", path: "/admin/settings/logs" },
];

export const ADMIN_ROLES_STORAGE_KEY = "mantra_admin_roles_v2";
export const ADMIN_ROLES_EVENT = "mantra-admin-roles-updated";

function makeFullPermissions(): Record<string, AdminModulePermission> {
  const result: Record<string, AdminModulePermission> = {};
  ADMIN_MODULES.forEach((mod) => {
    result[mod.id] = { actions: ["read", "write", "delete", "import", "export"], level: "all" };
  });
  return result;
}

function makeViewOnlyPermissions(): Record<string, AdminModulePermission> {
  const result: Record<string, AdminModulePermission> = {};
  ADMIN_MODULES.forEach((mod) => {
    result[mod.id] = { actions: ["read", "export"], level: "all" };
  });
  return result;
}

export const INITIAL_ADMIN_ROLES: AdminRoleItem[] = [
  {
    id: "role-sysadmin",
    name: "SystemAdmin",
    description: "Unrestricted platform administrator with root control over carriers, billing, and credentials.",
    isSystem: true,
    isLocked: true,
    permissions: makeFullPermissions(),
    createdDate: "2023-11-01T08:00:00.000Z",
  },
  {
    id: "role-admin",
    name: "Admin",
    description: "Standard administrative operator with workspace management, user administration, and template control.",
    isSystem: true,
    permissions: makeFullPermissions(),
    createdDate: "2023-11-01T08:00:00.000Z",
  },
  {
    id: "role-billing",
    name: "BillingAdmin",
    description: "Financial operator focused on orders, subscriptions, recurring revenue metrics, and invoice reconciliation.",
    isSystem: true,
    permissions: {
      ...makeViewOnlyPermissions(),
      orders: { actions: ["read", "write", "delete", "export"], level: "all" },
      subscriptions: { actions: ["read", "write", "delete", "export"], level: "all" },
      plans: { actions: ["read", "write", "export"], level: "all" },
      productAnalyticsRevenueInvoices: { actions: ["read", "export"], level: "all" },
      productAnalyticsOverview: { actions: ["read"], level: "all" },
    },
    createdDate: "2024-01-10T10:00:00.000Z",
  },
  {
    id: "role-support",
    name: "SupportSpecialist",
    description: "Technical support personnel with access to tenant DID inventory, call diagnostics, and task resolution.",
    isSystem: true,
    permissions: {
      ...makeViewOnlyPermissions(),
      telephonyNumbers: { actions: ["read", "write", "export"], level: "all" },
      telephonyProviders: { actions: ["read"], level: "all" },
      organizations: { actions: ["read", "write"], level: "all" },
      tasks: { actions: ["read", "write", "delete"], level: "all" },
      knowledgeBase: { actions: ["read", "write"], level: "all" },
    },
    createdDate: "2024-02-01T09:00:00.000Z",
  },
  {
    id: "role-auditor",
    name: "ReadonlyAuditor",
    description: "Compliance officer with read-only inspection access and CSV export capabilities across all modules.",
    isSystem: true,
    permissions: makeViewOnlyPermissions(),
    createdDate: "2024-02-15T11:00:00.000Z",
  },
  {
    id: "role-clin-ops",
    name: "Clinical Operations Lead",
    description: "Oversees healthcare process movement, intake forms, and automated scheduling workflows.",
    isSystem: false,
    permissions: {
      ...makeViewOnlyPermissions(),
      organizations: { actions: ["read", "write"], level: "all" },
      workflows: { actions: ["read", "write", "delete", "import", "export"], level: "all" },
      automations: { actions: ["read", "write", "delete", "import", "export"], level: "all" },
      forms: { actions: ["read", "write", "delete", "export"], level: "all" },
      tasks: { actions: ["read", "write", "delete"], level: "all" },
      productAnalyticsProcessMovement: { actions: ["read", "export"], level: "all" },
    },
    createdDate: "2024-03-01T12:00:00.000Z",
  },
];

export function getStoredAdminRoles(): AdminRoleItem[] {
  try {
    if (typeof window === "undefined") return INITIAL_ADMIN_ROLES;
    const raw = localStorage.getItem(ADMIN_ROLES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ADMIN_ROLES_STORAGE_KEY, JSON.stringify(INITIAL_ADMIN_ROLES));
      return INITIAL_ADMIN_ROLES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_ADMIN_ROLES;
  } catch {
    return INITIAL_ADMIN_ROLES;
  }
}

export function saveStoredAdminRoles(roles: AdminRoleItem[]): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(ADMIN_ROLES_STORAGE_KEY, JSON.stringify(roles));
      window.dispatchEvent(new CustomEvent(ADMIN_ROLES_EVENT));
    }
  } catch (err) {
    console.error("Failed to save admin roles:", err);
  }
}

export function canAdminRoleView(roleName: string, moduleId: string): boolean {
  if (!roleName) return false;
  if (roleName === "SystemAdmin" || roleName === "Admin") return true;

  const roles = getStoredAdminRoles();
  const found = roles.find((r) => r.name.toLowerCase() === roleName.toLowerCase());
  if (!found) return true; // fallback allow if role not found

  const perm = found.permissions[moduleId];
  if (!perm) return false;
  return perm.actions.includes("read") || perm.actions.includes("write");
}

export function canAdminRoleAction(
  roleName: string,
  moduleId: string,
  action: PermissionAction
): boolean {
  if (!roleName) return false;
  if (roleName === "SystemAdmin" || roleName === "Admin") return true;

  const roles = getStoredAdminRoles();
  const found = roles.find((r) => r.name.toLowerCase() === roleName.toLowerCase());
  if (!found) return true;

  const perm = found.permissions[moduleId];
  if (!perm) return false;
  if (perm.actions.includes("write")) return true; // write grants full action access
  return perm.actions.includes(action);
}

// Mutations
export function createAdminRole(role: Omit<AdminRoleItem, "id" | "isSystem" | "createdDate">): AdminRoleItem {
  const roles = getStoredAdminRoles();
  const newRole: AdminRoleItem = {
    ...role,
    id: `role-custom-${Date.now().toString(36)}`,
    isSystem: false,
    createdDate: new Date().toISOString(),
  };

  const updated = [...roles, newRole];
  saveStoredAdminRoles(updated);

  recordAuditLog({
    actorId: "usr-admin-1",
    actorName: "Alexander Vance",
    actorEmail: "alexander.v@mantra.care",
    actorRole: "SystemAdmin",
    action: "created",
    module: "Roles",
    entityType: "AdminRole",
    entityId: newRole.id,
    targetName: newRole.name,
    summary: `Created custom admin role "${newRole.name}" with specified permissions matrix`,
    before: null,
    after: { name: newRole.name, description: newRole.description },
  });

  return newRole;
}

export function updateAdminRole(roleId: string, updates: Partial<AdminRoleItem>): AdminRoleItem | null {
  const roles = getStoredAdminRoles();
  const idx = roles.findIndex((r) => r.id === roleId);
  if (idx === -1) return null;

  const prev = roles[idx];
  if (prev.isLocked) {
    throw new Error("SystemAdmin role is locked and cannot be edited.");
  }

  const updated: AdminRoleItem = {
    ...prev,
    ...updates,
    isSystem: prev.isSystem, // preserve system role flag
  };

  roles[idx] = updated;
  saveStoredAdminRoles(roles);

  recordAuditLog({
    actorId: "usr-admin-1",
    actorName: "Alexander Vance",
    actorEmail: "alexander.v@mantra.care",
    actorRole: "SystemAdmin",
    action: "updated",
    module: "Roles",
    entityType: "AdminRole",
    entityId: updated.id,
    targetName: updated.name,
    summary: `Updated permissions matrix and description for admin role "${updated.name}"`,
    before: { name: prev.name, description: prev.description },
    after: { name: updated.name, description: updated.description },
  });

  return updated;
}

export function duplicateAdminRole(roleId: string): AdminRoleItem | null {
  const roles = getStoredAdminRoles();
  const target = roles.find((r) => r.id === roleId);
  if (!target) return null;

  const newRole: AdminRoleItem = {
    ...target,
    id: `role-custom-${Date.now().toString(36)}`,
    name: `${target.name} (Copy)`,
    description: `Duplicated from ${target.name}`,
    isSystem: false,
    isLocked: false,
    createdDate: new Date().toISOString(),
  };

  const updated = [...roles, newRole];
  saveStoredAdminRoles(updated);

  recordAuditLog({
    actorId: "usr-admin-1",
    actorName: "Alexander Vance",
    actorEmail: "alexander.v@mantra.care",
    actorRole: "SystemAdmin",
    action: "created",
    module: "Roles",
    entityType: "AdminRole",
    entityId: newRole.id,
    targetName: newRole.name,
    summary: `Duplicated admin role "${target.name}" into new role "${newRole.name}"`,
    before: null,
    after: { name: newRole.name, duplicatedFrom: target.name },
  });

  return newRole;
}

export function deleteAdminRole(roleId: string): boolean {
  const roles = getStoredAdminRoles();
  const target = roles.find((r) => r.id === roleId);
  if (!target) return false;

  if (target.isSystem) {
    throw new Error(`System role "${target.name}" is protected and cannot be deleted.`);
  }

  const updated = roles.filter((r) => r.id !== roleId);
  saveStoredAdminRoles(updated);

  recordAuditLog({
    actorId: "usr-admin-1",
    actorName: "Alexander Vance",
    actorEmail: "alexander.v@mantra.care",
    actorRole: "SystemAdmin",
    action: "deleted",
    module: "Roles",
    entityType: "AdminRole",
    entityId: target.id,
    targetName: target.name,
    summary: `Deleted custom admin role "${target.name}"`,
    before: { name: target.name, description: target.description },
    after: null,
  });

  return true;
}

export function useAdminRoles() {
  const [roles, setRoles] = useState<AdminRoleItem[]>(getStoredAdminRoles);

  const refresh = useCallback(() => {
    setRoles(getStoredAdminRoles());
  }, []);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener(ADMIN_ROLES_EVENT, handler);
    return () => window.removeEventListener(ADMIN_ROLES_EVENT, handler);
  }, [refresh]);

  return { roles, refresh };
}

