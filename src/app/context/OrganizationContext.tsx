import { createContext, useContext, useState, useMemo, useEffect, ReactNode } from "react";

export interface Organization {
  id: string;
  name: string;
  orgCode?: string;
  industryCategory?: string;
  industry: string;
  locations?: string[];
  location?: string;
  primaryLocation?: string;
  availability?: string;
  operatingHours?: string | null;
  teamSize?: string;
  primaryRequirements?: string[];
  uploadedDocuments?: any[];
  telephonyChoice?: string | null;
  website?: string;
  description?: string;
  callVolume?: string | null;
  internationalCalls?: boolean | null;
  operatingCountries?: string[];
  country?: string;
  currency?: string;
  email: string;
  phone: string;
  status: "Active" | "Inactive";
  aiProvider?: "LiveKit" | "Dograh";
  default_category?: string;
  recommended_tier?: string;
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
    id: "eye-mantra",
    name: "Eye Mantra New",
    industryCategory: "Healthcare",
    industry: "Ophthalmology Clinic",
    locations: ["California", "New York"],
    country: "United States",
    currency: "USD",
    email: "care@eyemantra.com",
    phone: "+1 (555) 345-6789",
    status: "Active",
    aiProvider: "LiveKit",
  },
  {
    id: "demo",
    name: "Demo Mantra Care",
    industryCategory: "Healthcare",
    industry: "General Physician",
    locations: ["California", "New York"],
    country: "United States",
    currency: "USD",
    email: "contact@mantraassist.com",
    phone: "+1 (555) 123-4567",
    status: "Active",
    aiProvider: "Dograh",
  },
  {
    id: "1",
    name: "Heart Care Clinic",
    industryCategory: "Healthcare",
    industry: "Cardiologist",
    locations: ["California"],
    country: "United States",
    currency: "USD",
    email: "contact@heartcare.com",
    phone: "+1 (555) 123-4567",
    status: "Active",
    aiProvider: "LiveKit",
  },
  {
    id: "2",
    name: "Zenith Wellness & Yoga",
    industryCategory: "Wellness & Lifestyle",
    industry: "Yoga & Mindfulness Studio",
    locations: ["Bangalore", "Delhi"],
    country: "India",
    currency: "INR",
    email: "contact@zenithwellness.in",
    phone: "+91 98765 43210",
    status: "Active",
    aiProvider: "Dograh",
  },
  {
    id: "3",
    name: "Skyline Realty Group",
    industryCategory: "Real Estate",
    industry: "Residential Real Estate Brokerage",
    locations: ["London"],
    country: "United Kingdom",
    currency: "GBP",
    email: "sales@skylinerealty.co.uk",
    phone: "+44 20 7946 0958",
    status: "Active",
  },
  {
    id: "4",
    name: "Apex Auto Care",
    industryCategory: "Automobile",
    industry: "Auto Dealership & Service",
    locations: ["California", "Nevada"],
    country: "United States",
    currency: "USD",
    email: "service@apexauto.com",
    phone: "+1 (555) 345-6789",
    status: "Active",
  },
];

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>(() => {
    try {
      const saved = localStorage.getItem("mantra_organizations_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasDemo = parsed.some((o: any) => o.id === "demo" || o.name?.toLowerCase().includes("demo mantra"));
          if (!hasDemo) {
            return [...parsed, ...defaultOrganizations];
          }
          return parsed;
        }
      }

      const userOrg = localStorage.getItem("user_organization");
      if (userOrg) {
        const parsedUserOrg = JSON.parse(userOrg);
        return [{ ...parsedUserOrg, id: parsedUserOrg.id || "org-fresh-1" }, ...defaultOrganizations];
      }

      return defaultOrganizations;
    } catch {
      return defaultOrganizations;
    }
  });

  const [activeOrgId, setActiveOrgId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("mantra_active_org_id_v1");
      if (saved) return saved;

      const savedOrgs = localStorage.getItem("mantra_organizations_v1");
      if (savedOrgs) {
        const parsed = JSON.parse(savedOrgs);
        if (Array.isArray(parsed) && parsed[0]?.id) return parsed[0].id;
      }
      return defaultOrganizations[0].id;
    } catch {
      return defaultOrganizations[0].id;
    }
  });

  useEffect(() => {
    const handleOrgChanged = (e?: any) => {
      try {
        const saved = localStorage.getItem("mantra_organizations_v1");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const hasDemo = parsed.some((o: any) => o.id === "demo" || o.name?.toLowerCase().includes("demo mantra"));
            setOrganizations(hasDemo ? parsed : [...parsed, ...defaultOrganizations]);
          }
        }
        const activeId = localStorage.getItem("mantra_active_org_id_v1");
        if (activeId) {
          setActiveOrgId(activeId);
        }
      } catch {}
    };

    window.addEventListener("organizationChanged", handleOrgChanged);
    window.addEventListener("mantra_organization_changed", handleOrgChanged);
    window.addEventListener("storage", handleOrgChanged);
    return () => {
      window.removeEventListener("organizationChanged", handleOrgChanged);
      window.removeEventListener("mantra_organization_changed", handleOrgChanged);
      window.removeEventListener("storage", handleOrgChanged);
    };
  }, []);

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
    localStorage.setItem("active_organization_name", org.name);
    window.dispatchEvent(new CustomEvent("organizationChanged", { detail: org }));
    window.dispatchEvent(new CustomEvent("mantra_organization_changed", { detail: org }));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("clientsStore_updated"));
    window.dispatchEvent(new Event("processLogs_updated"));
    window.dispatchEvent(new Event("mantra_appointments_changed"));
    window.dispatchEvent(new Event("ma_services_changed"));
    window.dispatchEvent(new Event("ma_knowledge_base_changed"));
    window.dispatchEvent(new Event("mantra_invoices_changed"));
    window.dispatchEvent(new Event("deals_updated"));
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

    if (id === activeOrgId && updates.name) {
      localStorage.setItem("active_organization_name", updates.name);
    }

    const detail = { id, ...updates };
    window.dispatchEvent(new CustomEvent("organizationChanged", { detail }));
    window.dispatchEvent(new CustomEvent("mantra_organization_changed", { detail }));
    window.dispatchEvent(new Event("storage"));
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
