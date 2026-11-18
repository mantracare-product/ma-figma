import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { Role } from "../config/navigation";
import { getStoredTeamMembers, TeamMember } from "../../lib/teamStore";

export interface UserData {
  id?: string;
  name: string;
  email: string;
  role: Role;
  department?: string;
  permissions?: any;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserData | null;
  role: Role;
  setRole: (role: Role) => void;
  switchUser: (member: TeamMember) => void;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function resolveInitialUser(): UserData {
  if (typeof window !== "undefined") {
    // Check URL invite parameter (?memberId=... or ?inviteUser=...)
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const memberId = searchParams.get("memberId") || searchParams.get("inviteUser") || searchParams.get("teamMemberId");
      if (memberId) {
        const members = getStoredTeamMembers();
        const found = members.find(
          (m) => String(m.id) === String(memberId) || m.email?.toLowerCase() === memberId.toLowerCase()
        );
        if (found) {
          const u: UserData = {
            id: String(found.id),
            name: found.name,
            email: found.email,
            role: (found.role as Role) || "Specialist",
            department: found.department,
            permissions: found.permissions,
          };
          sessionStorage.setItem("user_data", JSON.stringify(u));
          sessionStorage.setItem("user_role", u.role);
          sessionStorage.setItem("auth_token", "invite_token_" + found.id);
          return u;
        }
      }
    } catch {}

    // Check tab-scoped session first
    const sessionRaw = sessionStorage.getItem("user_data");
    if (sessionRaw) {
      try {
        return JSON.parse(sessionRaw);
      } catch {}
    }

    // Check persistent storage
    const raw = localStorage.getItem("user_data");
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {}
    }
  }

  return {
    id: "1",
    name: "Admin User",
    email: "admin@mantra.care",
    role: "SystemAdmin",
    department: "Administration",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(() => resolveInitialUser());

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("memberId") || searchParams.get("inviteUser")) {
        return true;
      }
      return (
        sessionStorage.getItem("auth_token") !== null ||
        localStorage.getItem("auth_token") !== null ||
        true // default logged in for prototype
      );
    }
    return true;
  });

  const [role, setRoleState] = useState<Role>(() => {
    return user?.role || "SystemAdmin";
  });

  // Ensure role and user stay aligned
  useEffect(() => {
    if (user?.role) {
      setRoleState(user.role);
    }
  }, [user]);

  // Handle URL change or popstate
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleUrlCheck = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const memberId = searchParams.get("memberId") || searchParams.get("inviteUser");
      if (memberId) {
        const members = getStoredTeamMembers();
        const found = members.find(
          (m) => String(m.id) === String(memberId) || m.email?.toLowerCase() === memberId.toLowerCase()
        );
        if (found) {
          const u: UserData = {
            id: String(found.id),
            name: found.name,
            email: found.email,
            role: (found.role as Role) || "Specialist",
            department: found.department,
            permissions: found.permissions,
          };
          sessionStorage.setItem("user_data", JSON.stringify(u));
          sessionStorage.setItem("user_role", u.role);
          sessionStorage.setItem("auth_token", "invite_token_" + found.id);
          setUser(u);
          setRoleState(u.role);
          setIsAuthenticated(true);
        }
      }
    };
    handleUrlCheck();
    window.addEventListener("popstate", handleUrlCheck);
    return () => window.removeEventListener("popstate", handleUrlCheck);
  }, []);

  const setRole = (newRole: Role) => {
    sessionStorage.setItem("user_role", newRole);
    localStorage.setItem("user_role", newRole);
    setRoleState(newRole);
    setUser((prev) => {
      const updated = prev
        ? { ...prev, role: newRole }
        : { id: "1", name: "Admin User", email: "admin@mantra.care", role: newRole };
      sessionStorage.setItem("user_data", JSON.stringify(updated));
      return updated;
    });
  };

  const switchUser = (member: TeamMember) => {
    const u: UserData = {
      id: String(member.id),
      name: member.name,
      email: member.email,
      role: (member.role as Role) || "Specialist",
      department: member.department,
      permissions: member.permissions,
    };
    sessionStorage.setItem("user_data", JSON.stringify(u));
    sessionStorage.setItem("user_role", u.role);
    sessionStorage.setItem("auth_token", "token_" + member.id);
    setUser(u);
    setRoleState(u.role);
    setIsAuthenticated(true);
  };

  const login = () => {
    sessionStorage.setItem("auth_token", "dummy_token");
    localStorage.setItem("auth_token", "dummy_token");
    setIsAuthenticated(true);
  };

  const logout = () => {
    sessionStorage.removeItem("auth_token");
    sessionStorage.removeItem("user_data");
    sessionStorage.removeItem("user_role");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
    sessionStorage.clear();
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, role, setRole, switchUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
