import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

export default function SettingsGuard() {
  const { role } = useAuth();
  const isAuthorized = role === "SystemAdmin";
  const warnedRef = useRef(false);

  useEffect(() => {
    if (!isAuthorized && !warnedRef.current) {
      warnedRef.current = true;
      toast.error("Access restricted: Settings requires System Admin privileges.");
    }
  }, [isAuthorized]);

  if (!isAuthorized) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
