import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router";

interface AuthContextType {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Check if user is authenticated on initial load
    return localStorage.getItem("auth_token") !== null;
  });

  const login = () => {
    // Set authentication token (in a real app, this would come from API)
    localStorage.setItem("auth_token", "dummy_token");
    setIsAuthenticated(true);
  };

  const logout = () => {
    // Clear all authentication data
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
    sessionStorage.clear();
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
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
