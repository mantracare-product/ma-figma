/**
 * Sample RCM roles — sample DATA only, created on demand from Settings > Team > Roles ("Add sample RCM roles").
 * Nothing in the app logic refers to these names; clinics are free to edit or delete them.
 */
import type { ModulePermissions, Role, RcmPermissionKey } from "../types/permissions";

const NONE: ModulePermissions = { read: "deny", add: "deny", edit: "deny", delete: "deny", export: "deny", import: "deny" };
const READ: ModulePermissions = { ...NONE, read: "all" };
const FULL: ModulePermissions = { read: "all", add: "all", edit: "all", delete: "all", export: "all", import: "all" };

function role(id: string, name: string, description: string, grants: Partial<Record<RcmPermissionKey, ModulePermissions>>): Role {
  const permissions: any = {
    clients: { ...READ },
    processes: { ...READ },
    calls: { ...NONE },
    chats: { ...NONE },
    knowledgeBase: { ...NONE },
    settings: { ...NONE },
    processSettings: { ...NONE },
    webForms: { ...NONE },
    appointments: { ...READ },
    services: { ...NONE },
    billingSetup: { ...NONE },
    eligibility: { ...NONE },
    priorAuth: { ...NONE },
    claims: { ...NONE },
    rcmPayments: { ...NONE },
    denials: { ...NONE },
    rcmReports: { ...NONE },
    processInstances: {},
  };
  for (const [k, v] of Object.entries(grants)) permissions[k] = { ...(v as ModulePermissions) };
  return { id, name, description, isDefault: false, permissions };
}

export function buildSampleRcmRoles(): Role[] {
  return [
    role("sample-rcm-billing-setup", "Billing Setup Admin", "Can open and edit Billing setup only", { billingSetup: FULL }),
    role("sample-rcm-front-desk", "Front Desk (Eligibility)", "Runs eligibility checks and views prior auths", { eligibility: FULL, priorAuth: READ }),
    role("sample-rcm-biller", "Biller", "Works claims, payments and denials", {
      claims: FULL,
      rcmPayments: FULL,
      denials: FULL,
      eligibility: READ,
      priorAuth: READ,
      rcmReports: READ,
    }),
  ];
}
