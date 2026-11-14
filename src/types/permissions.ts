export type ActionScope = "inherit" | "deny" | "own" | "role" | "all";

export const ACTIONS = ["read", "add", "edit", "delete", "export", "import"] as const;
export type Action = (typeof ACTIONS)[number];

export type ModulePermissions = Record<Action, ActionScope>;

// Fixed, flat, top-level modules. No nesting, no other modules allowed.
export interface ItemPermissions {
  clients: ModulePermissions;
  processes: ModulePermissions;
  calls: ModulePermissions;
  chats: ModulePermissions;
  knowledgeBase: ModulePermissions;
  settings: ModulePermissions;
  processSettings: ModulePermissions;
  webForms: ModulePermissions;
  appointments: ModulePermissions;
  services: ModulePermissions;

  // Modules listed in the Roles drawer that had no typed key (they used to be dropped on save).
  billings?: ModulePermissions;
  dashboard?: ModulePermissions;
  documentTemplates?: ModulePermissions;
  integrations?: ModulePermissions;

  // RCM modules (optional so roles saved before RCM existed stay valid; a missing key means deny).
  billingSetup?: ModulePermissions;
  eligibility?: ModulePermissions;
  priorAuth?: ModulePermissions;
  claims?: ModulePermissions;
  rcmPayments?: ModulePermissions; // not "payments": that name is the Settings billing sub-tab
  denials?: ModulePermissions;
  rcmReports?: ModulePermissions;

  // Dynamic: one entry per real process, keyed by process id.
  processInstances: Record<string, ModulePermissions>;

  // Dynamic: stage level overrides, keyed by `${processId}_${stageId}`.
  stageInstances?: Record<string, Partial<Record<Action, ActionScope>>>;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  department?: string;
  isDefault?: boolean;
  permissions: ItemPermissions;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
}

/** Permission keys added for RCM. Optional on ItemPermissions; absent => deny. */
export const RCM_PERMISSION_KEYS = [
  "billingSetup",
  "eligibility",
  "priorAuth",
  "claims",
  "rcmPayments",
  "denials",
  "rcmReports",
] as const;
export type RcmPermissionKey = (typeof RCM_PERMISSION_KEYS)[number];

export const RCM_PERMISSION_LABELS: Record<RcmPermissionKey, string> = {
  billingSetup: "Billing setup",
  eligibility: "Eligibility",
  priorAuth: "Prior authorization",
  claims: "Claims",
  rcmPayments: "RCM payments",
  denials: "Denials & appeals",
  rcmReports: "RCM reports",
};
