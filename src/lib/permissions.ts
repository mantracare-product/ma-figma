import type { Role, Action, ItemPermissions, ModulePermissions } from "../types/permissions";

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

// ── Record-less, role-based checks (setup screens and RCM modules) ───────────────────────────────

/**
 * Does the role grant `action` on `moduleKey`? Scope (own/role/all) is meaningless without a record, so any
 * scope other than deny counts. A missing role, key or action is DENIED.
 */
export function hasPermission(role: Role | undefined | null, moduleKey: string, action: Action = "read"): boolean {
  if (!role) return false;
  const perms = (role.permissions as any)?.[moduleKey] as ModulePermissions | undefined;
  const scope = perms?.[action];
  return !!scope && scope !== "deny" && scope !== "inherit";
}

interface MemberLike {
  email?: string;
  role?: string;
  roleId?: string;
}

export function findMemberByEmail<T extends MemberLike>(members: T[], email?: string | null): T | undefined {
  const q = String(email || "").trim().toLowerCase();
  if (!q) return undefined;
  return members.find((m) => String(m.email || "").trim().toLowerCase() === q);
}

/**
 * Resolve the Role of a team member: `roleId` first. Matching `member.role` to a Role NAME is a fallback only
 * (older members have no roleId and their seed role strings often match no Role).
 */
export function resolveMemberRole(member: MemberLike | undefined, roles: Role[]): { role?: Role; via?: "roleId" | "name" } {
  if (!member) return {};
  if (member.roleId) {
    const byId = roles.find((r) => r.id === member.roleId);
    if (byId) return { role: byId, via: "roleId" };
  }
  if (member.role) {
    const q = member.role.trim().toLowerCase();
    const byName = roles.find((r) => (r.name || "").trim().toLowerCase() === q);
    if (byName) return { role: byName, via: "name" };
  }
  return {};
}

/**
 * Session role for a login email. Only a member with an EXPLICIT roleId whose role does not grant full
 * Settings access becomes a non-admin session ("Member"); everyone else keeps the existing behavior
 * (stored user_role, default SystemAdmin), so nothing changes for users who were never assigned a role.
 */
export function sessionRoleForMember(member: MemberLike | undefined, roles: Role[], fallback: string): string {
  if (!member?.roleId) return fallback;
  const role = roles.find((r) => r.id === member.roleId);
  if (!role) return fallback;
  return hasPermission(role, "settings", "edit") && hasPermission(role, "settings", "add") ? fallback : "Member";
}
