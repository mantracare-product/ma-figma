import { createContext, useContext, useState, useMemo, ReactNode } from "react";

export interface Organization {
  id: string;
  name: string;
  industryCategory?: string;
  industry: string;
  locations?: string[];
  location?: string;
  email: string;
  phone: string;
  status: "Active" | "Inactive";
}

interface OrganizationContextType {
  organizations: Organization[];
  activeOrganization: Organization;
  setActiveOrganization: (org: Organization) => void;
  addOrganization: (org: Omit<Organization, "id">) => void;
  updateOrganization: (id: string, updates: Partial<Organization>) => void;
  sessionOverride: Partial<Organization> | null;
  setSessionOverride: (override: Partial<Organization> | null) => void;
}

const globalForOrg = typeof window !== "undefined" ? (window as any) : (globalThis as any);
const OrganizationContext: React.Context<OrganizationContextType | undefined> =
  globalForOrg.__MANTRA_ORGANIZATION_CONTEXT__ ||
  (globalForOrg.__MANTRA_ORGANIZATION_CONTEXT__ = createContext<OrganizationContextType | undefined>(undefined));

const defaultOrganizations: Organization[] = [
  {
    id: "demo",
    name: "Demo MantraAssist",
    industryCategory: "Healthcare",
    industry: "General Physician",
    locations: ["California", "New York"],
    email: "contact@mantraassist.com",
    phone: "+1 (555) 123-4567",
    status: "Active",
  },
  {
    id: "1",
    name: "Heart Care Clinic",
    industryCategory: "Healthcare",
    industry: "Cardiologist",
    locations: ["California"],
    email: "contact@heartcare.com",
    phone: "+1 (555) 123-4567",
    status: "Active",
  },
  {
    id: "2",
    name: "Smile Dental Center",
    industryCategory: "Healthcare",
    industry: "Dentist",
    locations: ["Texas"],
    email: "contact@smiledental.com",
    phone: "+1 (555) 987-6543",
    status: "Active",
  },
  {
    id: "3",
    name: "Apex Auto Care",
    industryCategory: "Automobile",
    industry: "Auto Dealership & Service",
    locations: ["California", "Nevada"],
    email: "service@apexauto.com",
    phone: "+1 (555) 345-6789",
    status: "Active",
  },
];

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>(() => {
    try {
      const saved = localStorage.getItem("mantra_organizations_v1");
      return saved ? JSON.parse(saved) : defaultOrganizations;
    } catch {
      return defaultOrganizations;
    }
  });

  const [activeOrgId, setActiveOrgId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("mantra_active_org_id_v1");
      return saved || defaultOrganizations[0].id;
    } catch {
      return defaultOrganizations[0].id;
    }
  });

  const [sessionOverride, setSessionOverrideState] = useState<Partial<Organization> | null>(() => {
    try {
      const saved = sessionStorage.getItem("mantra_org_session_override_v1");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const setSessionOverride = (override: Partial<Organization> | null) => {
    setSessionOverrideState(override);
    if (override) {
      sessionStorage.setItem("mantra_org_session_override_v1", JSON.stringify(override));
    } else {
      sessionStorage.removeItem("mantra_org_session_override_v1");
    }
    window.dispatchEvent(new CustomEvent("organizationChanged"));
  };

  const rawActiveOrg = organizations.find((o) => o.id === activeOrgId) || organizations[0] || defaultOrganizations[0];

  // Merge session override if active
  const activeOrganization: Organization = useMemo(() => ({
    ...rawActiveOrg,
    ...(sessionOverride || {}),
  }), [rawActiveOrg, sessionOverride]);

  const setActiveOrganization = (org: Organization) => {
    setActiveOrgId(org.id);
    localStorage.setItem("mantra_active_org_id_v1", org.id);
    window.dispatchEvent(new CustomEvent("organizationChanged", { detail: org }));
  };

  const addOrganization = (orgData: Omit<Organization, "id">) => {
    const newOrg: Organization = {
      ...orgData,
      id: Date.now().toString(),
    };
    setOrganizations((prev) => {
      const next = [...prev, newOrg];
      localStorage.setItem("mantra_organizations_v1", JSON.stringify(next));
      return next;
    });
    setActiveOrganization(newOrg);
  };

  const updateOrganization = (id: string, updates: Partial<Organization>) => {
    setOrganizations((prev) => {
      const next = prev.map((org) => (org.id === id ? { ...org, ...updates } : org));
      localStorage.setItem("mantra_organizations_v1", JSON.stringify(next));
      return next;
    });
  };

  const contextValue = useMemo(() => ({
    organizations,
    activeOrganization,
    setActiveOrganization,
    addOrganization,
    updateOrganization,
    sessionOverride,
    setSessionOverride,
  }), [organizations, activeOrganization, sessionOverride]);

  return (
    <OrganizationContext.Provider value={contextValue}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    return {
      organizations: defaultOrganizations,
      activeOrganization: defaultOrganizations[0],
      setActiveOrganization: () => {},
      addOrganization: () => {},
      updateOrganization: () => {},
      sessionOverride: null,
      setSessionOverride: () => {},
    };
  }
  return context;
}
