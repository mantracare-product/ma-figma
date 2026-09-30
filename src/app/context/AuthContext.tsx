import { createContext, useContext, useState, ReactNode } from "react";
import type { Role } from "../config/navigation";

interface UserData {
  name: string;
  email: string;
  role: Role;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserData | null;
  role: Role;
  setRole: (role: Role) => void;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Check if user is authenticated on initial load
    return localStorage.getItem("auth_token") !== null;
  });

  const [role, setRoleState] = useState<Role>(() => {
    return (localStorage.getItem("user_role") as Role) || "SystemAdmin";
  });

  const [user, setUser] = useState<UserData | null>(() => {
    const raw = localStorage.getItem("user_data");
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // fallback
      }
    }
    return {
      name: "Admin User",
      email: "admin@mantrahealth.com",
      role: (localStorage.getItem("user_role") as Role) || "SystemAdmin",
    };
  });

  const setRole = (newRole: Role) => {
    localStorage.setItem("user_role", newRole);
    setRoleState(newRole);
    setUser((prev) => (prev ? { ...prev, role: newRole } : { name: "User", email: "user@mantrahealth.com", role: newRole }));
  };

  const login = () => {
    localStorage.setItem("auth_token", "dummy_token");
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
    sessionStorage.clear();
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, role, setRole, login, logout }}>
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
