/**
 * Default roles (moved out of RolesPermissionsDrawer so non-UI code, e.g. sample bundles, can seed the roles store).
 */
import type { ActionScope, ModulePermissions, Role } from "../types/permissions";

// ─── DEFAULT ROLES ────────────────────────────────────────────────────────────

export const makeModulePerms = (
  read: ActionScope,
  add: ActionScope,
  edit: ActionScope,
  del: ActionScope,
  exp: ActionScope,
  imp: ActionScope
): ModulePermissions => ({
  read,
  add,
  edit,
  delete: del,
  export: exp,
  import: imp,
});

const ALL_PERMS = makeModulePerms("all", "all", "all", "all", "all", "all");
const OPERATIONAL_PERMS = makeModulePerms("all", "all", "all", "own", "all", "all");

export const DEFAULT_ROLES: Role[] = [
  {
    id: "admin",
    name: "Admin",
    description: "Full access to every module and action",
    isDefault: true,
    permissions: {
      clients: { ...ALL_PERMS },
      processes: { ...ALL_PERMS },
      calls: { ...ALL_PERMS },
      chats: { ...ALL_PERMS },
      knowledgeBase: { ...ALL_PERMS },
      settings: { ...ALL_PERMS },
      processSettings: { ...ALL_PERMS },
      webForms: { ...ALL_PERMS },
      appointments: { ...ALL_PERMS },
      services: { ...ALL_PERMS },
      billings: { ...ALL_PERMS },
      dashboard: { ...ALL_PERMS },
      documentTemplates: { ...ALL_PERMS },
      integrations: { ...ALL_PERMS },
      billingSetup: { ...ALL_PERMS },
      eligibility: { ...ALL_PERMS },
      priorAuth: { ...ALL_PERMS },
      claims: { ...ALL_PERMS },
      rcmPayments: { ...ALL_PERMS },
      denials: { ...ALL_PERMS },
      rcmReports: { ...ALL_PERMS },
      processInstances: {},
    },
  },
  {
    id: "manager",
    name: "Manager",
    description: "Operational access across all modules, restricted system settings",
    isDefault: true,
    permissions: {
      clients: { ...OPERATIONAL_PERMS },
      processes: { ...OPERATIONAL_PERMS },
      calls: { ...OPERATIONAL_PERMS },
      chats: { ...OPERATIONAL_PERMS },
      knowledgeBase: { ...OPERATIONAL_PERMS },
      settings: { ...makeModulePerms("deny", "deny", "deny", "deny", "deny", "deny") },
      processSettings: { ...OPERATIONAL_PERMS },
      webForms: { ...OPERATIONAL_PERMS },
      appointments: { ...OPERATIONAL_PERMS },
      services: { ...OPERATIONAL_PERMS },
      billings: { ...OPERATIONAL_PERMS },
      dashboard: { ...OPERATIONAL_PERMS },
      documentTemplates: { ...OPERATIONAL_PERMS },
      integrations: { ...OPERATIONAL_PERMS },
      processInstances: {},
    },
  },
  {
    id: "agent",
    name: "Executive",
    description: "Can manage all clients and calls",
    isDefault: false,
    permissions: {
      clients: { ...OPERATIONAL_PERMS },
      processes: { ...OPERATIONAL_PERMS },
      calls: { ...OPERATIONAL_PERMS },
      chats: { ...OPERATIONAL_PERMS },
      knowledgeBase: { ...OPERATIONAL_PERMS },
      settings: { ...makeModulePerms("deny", "deny", "deny", "deny", "deny", "deny") },
      processSettings: { ...OPERATIONAL_PERMS },
      webForms: { ...OPERATIONAL_PERMS },
      appointments: { ...OPERATIONAL_PERMS },
      services: { ...OPERATIONAL_PERMS },
      billings: { ...OPERATIONAL_PERMS },
      dashboard: { ...OPERATIONAL_PERMS },
      documentTemplates: { ...OPERATIONAL_PERMS },
      integrations: { ...OPERATIONAL_PERMS },
      processInstances: {},
    },
  },
];
