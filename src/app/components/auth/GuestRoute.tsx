import { Navigate, useLocation } from "react-router";
import { useAuth } from "../../context/AuthContext";

interface GuestRouteProps {
  children: React.ReactNode;
}

export default function GuestRoute({ children }: GuestRouteProps) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (isAuthenticated) {
    const isSignup =
      (location.state as any)?.from === "signup" ||
      localStorage.getItem("verify_origin") === "signup";

    const hasOrg = localStorage.getItem("user_organization");

    if (isSignup && !hasOrg) {
      return <Navigate to="/onboarding" replace />;
    }

    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
