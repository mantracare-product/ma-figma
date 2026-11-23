/**
 * tenantOrganizations.ts
 * Path: src/data/tenantOrganizations.ts
 *
 * Centralized list of tenant organizations for administrative scoping and template synchronization.
 */

export interface TenantOrganization {
  id: string;
  name: string;
  category: string;
  industry: string;
  location: string;
  tier?: string;
  activeUsers?: number;
}

export const TENANT_ORGANIZATIONS: TenantOrganization[] = [
  {
    id: "org-mantracare",
    name: "MantraCare Health",
    category: "Healthcare",
    industry: "Medical Practice",
    location: "United States",
    tier: "Enterprise",
    activeUsers: 48,
  },
  {
    id: "org-apollo",
    name: "Apollo Practice",
    category: "Healthcare",
    industry: "Medical Practice",
    location: "India",
    tier: "Professional",
    activeUsers: 32,
  },
  {
    id: "org-carefirst",
    name: "CareFirst Clinic",
    category: "Healthcare",
    industry: "Dental Clinic",
    location: "United States",
    tier: "Standard",
    activeUsers: 14,
  },
  {
    id: "org-metrolabs",
    name: "Metro Diagnostics",
    category: "Healthcare",
    industry: "Diagnostics / Laboratory",
    location: "Canada",
    tier: "Professional",
    activeUsers: 22,
  },
  {
    id: "org-apex",
    name: "Apex Financial Advisory",
    category: "Finance & Accounting",
    industry: "Accounting & Tax Services",
    location: "United States",
    tier: "Standard",
    activeUsers: 18,
  },
  {
    id: "org-horizon",
    name: "Horizon Tech Innovations",
    category: "Technology",
    industry: "Software Development",
    location: "United Kingdom",
    tier: "Enterprise",
    activeUsers: 64,
  },
];
