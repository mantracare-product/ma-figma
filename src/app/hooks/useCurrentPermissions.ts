import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getStoredTeamMembers, TEAM_STORE_EVENT } from "../../lib/teamStore";
import { getStoredRoles, ROLES_STORE_EVENT } from "../../lib/rolesStore";
import { findMemberByEmail, hasPermission as roleHasPermission, resolveMemberRole } from "../../lib/permissions";
import type { Action } from "../../types/permissions";

/**
 * Permissions of the signed-in user: user email -> TeamMember -> roleId -> Role -> hasPermission.
 * SystemAdmin is always allowed. Unknown user, member without a role, or a missing key => denied.
 */
export function useCurrentPermissions() {
  const { user, role: sessionRole } = useAuth();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener(ROLES_STORE_EVENT, bump);
    window.addEventListener(TEAM_STORE_EVENT, bump);
    return () => {
      window.removeEventListener(ROLES_STORE_EVENT, bump);
      window.removeEventListener(TEAM_STORE_EVENT, bump);
    };
  }, []);

  return useMemo(() => {
    const isSystemAdmin = sessionRole === "SystemAdmin";
    const member = findMemberByEmail(getStoredTeamMembers(), user?.email);
    const { role } = resolveMemberRole(member, getStoredRoles());
    return {
      isSystemAdmin,
      member,
      role,
      hasPermission: (moduleKey: string, action: Action = "read") =>
        isSystemAdmin || roleHasPermission(role, moduleKey, action),
    };
    // tick re-evaluates after role/team edits
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email, sessionRole, tick]);
}
