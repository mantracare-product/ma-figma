import type { Role, Action, ItemPermissions } from "../types/permissions";

export function canDoAction(
  user: { role: string; id: number },
  roles: Role[],
  record: { assignedToUserId: number },
  moduleKey: keyof Omit<ItemPermissions, "processInstances">,
  action: Action,
  processId?: string
): boolean {
  const role = roles.find((r) => r.name === user.role);
  if (!role) return false;

  const perms =
    moduleKey === "processes" && processId && role.permissions.processInstances?.[processId]
      ? role.permissions.processInstances[processId]
      : role.permissions[moduleKey];

  if (!perms) return false;
  const scope = perms[action];
  if (scope === "deny" || !scope) return false;
  if (scope === "all") return true;
  return user.id === record.assignedToUserId;
}

export function canAccess(
  user: { role: string; id: number },
  roles: Role[],
  record: { assignedToUserId: number },
  moduleKey: keyof Omit<ItemPermissions, "processInstances">
): boolean {
  return canDoAction(user, roles, record, moduleKey, "read");
}
