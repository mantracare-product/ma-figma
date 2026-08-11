export type ActionScope = "deny" | "own" | "all";

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

  // Dynamic: one entry per real process, keyed by process id.
  processInstances: Record<string, ModulePermissions>;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  permissions: ItemPermissions;
}
