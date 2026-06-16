import { createContext, useContext, useState, ReactNode } from "react";

export interface Organization {
  id: string;
  name: string;
  industry: string;
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
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

const defaultOrganizations: Organization[] = [
  {
    id: "1",
    name: "Healthcare Org",
    industry: "Healthcare",
    email: "contact@healthcareorg.com",
    phone: "+1 (555) 123-4567",
    status: "Active",
  },
  {
    id: "2",
    name: "Dental Care Org",
    industry: "Dental",
    email: "contact@dentalcare.com",
    phone: "+1 (555) 987-6543",
    status: "Active",
  },
];

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>(defaultOrganizations);
  const [activeOrganization, setActiveOrganizationState] = useState<Organization>(defaultOrganizations[0]);

  const setActiveOrganization = (org: Organization) => {
    setActiveOrganizationState(org);
    // Trigger a storage event to notify other components
    window.dispatchEvent(new CustomEvent("organizationChanged", { detail: org }));
  };

  const addOrganization = (orgData: Omit<Organization, "id">) => {
    const newOrg: Organization = {
      ...orgData,
      id: Date.now().toString(),
    };
    setOrganizations((prev) => [...prev, newOrg]);
    setActiveOrganization(newOrg);
  };

  const updateOrganization = (id: string, updates: Partial<Organization>) => {
    setOrganizations((prev) =>
      prev.map((org) => (org.id === id ? { ...org, ...updates } : org))
    );
    if (activeOrganization.id === id) {
      setActiveOrganizationState((prev) => ({ ...prev, ...updates }));
    }
  };

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        activeOrganization,
        setActiveOrganization,
        addOrganization,
        updateOrganization,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
}
