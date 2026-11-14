import { Navigate, Outlet } from "react-router";
import { toast } from "sonner";
import { useEffect, useRef } from "react";
import { useCurrentPermissions } from "../../hooks/useCurrentPermissions";
import type { Action } from "../../../types/permissions";

/** Route guard driven by a role permission key instead of SystemAdmin. Use as a layout route. */
export default function PermissionGuard({ moduleKey, action = "read" }: { moduleKey: string; action?: Action }) {
  const { hasPermission } = useCurrentPermissions();
  const allowed = hasPermission(moduleKey, action);
  const warned = useRef(false);

  useEffect(() => {
    if (!allowed && !warned.current) {
      warned.current = true;
      toast.error("Access restricted: you don't have permission to open this page.");
    }
  }, [allowed]);

  return allowed ? <Outlet /> : <Navigate to="/" replace />;
}
