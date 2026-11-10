/**
 * onboardingWorkspace.ts
 * Path: src/lib/onboardingWorkspace.ts
 *
 * Handles workspace initialization for new signup / onboarding users.
 * Supports organization-level scoping so:
 * - "Demo Mantra" retains all its rich sample data (573 calls, canonical clients, appointments, processes, deals).
 * - Newly built organizations from signup (default: "Eye Mantra") start completely fresh (0 calls, 0 contacts, 0 appointments)
 *   while displaying ONLY the data entered during onboarding (organization details, locations, services, knowledge base).
 */

import { formatBytes } from "../app/pages/auth/onboardingHelpers";
import { assignFreePlanForCategory } from "./plansBillingStore";

export const FRESH_ACCOUNT_STORAGE_KEY = "account_mode"; // "fresh" | "demo"
export const WORKSPACE_FRESH_MODE_KEY = "workspace_fresh_mode";

export const DEFAULT_DEMO_ORGANIZATIONS = [
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
    status: "Active" as const,
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
    status: "Active" as const,
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
    status: "Active" as const,
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
    status: "Active" as const,
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
    status: "Active" as const,
  },
];

export interface FreshWorkspacePayload {
  orgData: any;
  locations: any[];
  services: Array<{ id: string | number; name: string; description?: string }>;
  uploadedDocs: Array<{ id: string; name: string; size?: number; sizeLabel?: string }>;
  website?: string;
  skipFreePlan?: boolean;
}

/**
 * Returns true if the active organization is "Demo Mantra" or "Demo Mantra Care".
 * In this mode, the application displays the full demo / sample dataset.
 */
export function isDemoMantraActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const rawOrgs = localStorage.getItem("mantra_organizations_v1");
    const orgs = rawOrgs ? JSON.parse(rawOrgs) : [];
    const activeOrgId = localStorage.getItem("mantra_active_org_id_v1") || (orgs[0] && orgs[0].id) || "demo";

    if (activeOrgId === "demo" || activeOrgId === "1" || activeOrgId === "default") {
      const active = orgs.find((o: any) => o.id === activeOrgId);
      if (!active || (active.name || "").toLowerCase().includes("demo") || (active.name || "").toLowerCase().includes("mantra care")) {
        return true;
      }
    }

    const active = orgs.find((o: any) => o.id === activeOrgId);
    if (active) {
      const name = (active.name || "").toLowerCase();
      if (name.includes("demo mantra") || active.id === "demo") {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Returns true if the active organization is a newly built organization from signup (e.g. "Eye Mantra").
 * In this mode, operational data is completely fresh (0 calls, 0 contacts, 0 appointments)
 * and only onboarding-configured data (org, locations, services, knowledge base) is shown.
 */
export function isFreshWorkspace(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // If Demo Mantra is active, never treat as fresh — preserve full sample data!
    if (isDemoMantraActive()) {
      return false;
    }

    const signupOrgId = localStorage.getItem("signup_org_id");
    const activeOrgId = localStorage.getItem("mantra_active_org_id_v1");

    if (signupOrgId && activeOrgId === signupOrgId) {
      return true;
    }

    const rawOrgs = localStorage.getItem("mantra_organizations_v1");
    if (rawOrgs) {
      const orgs = JSON.parse(rawOrgs);
      const active = orgs.find((o: any) => o.id === activeOrgId);
      if (active && (active.name?.toLowerCase().includes("eye mantra") || (active as any).isSignupOrg)) {
        return true;
      }
    }

    return (
      localStorage.getItem(FRESH_ACCOUNT_STORAGE_KEY) === "fresh" ||
      localStorage.getItem(WORKSPACE_FRESH_MODE_KEY) === "true" ||
      localStorage.getItem("verify_origin") === "signup"
    );
  } catch {
    return false;
  }
}

export function initializeFreshSignupWorkspace({
  orgData,
  locations = [],
  services = [],
  uploadedDocs = [],
  website = "",
  skipFreePlan = false,
}: FreshWorkspacePayload) {
  if (typeof window === "undefined") return;

  const cleanOrgName = (orgData?.name || "Eye Mantra").trim();
  const orgId = "org_" + Date.now();
  const cleanWebsite = (website || orgData?.website || "https://www.eyemantra.com").trim();

  const formattedLocations = locations.map((loc: any) =>
    loc.address && loc.address.trim()
      ? `${loc.name}: ${loc.address.trim()} (${(loc.operatingDays || ["MON", "TUE", "WED", "THU", "FRI", "SAT"]).join(", ")}, ${loc.opensAt || "09:00"}–${loc.closesAt || "19:00"})`
      : `${loc.name} (${(loc.operatingDays || ["MON", "TUE", "WED", "THU", "FRI", "SAT"]).join(", ")}, ${loc.opensAt || "09:00"}–${loc.closesAt || "19:00"})`
  );

  const primaryLoc = locations[0] || {
    name: "Eye Mantra Super Specialty Clinic",
    address: "A-10, Paschim Vihar, New Delhi, 110063",
    operatingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
    opensAt: "09:00",
    closesAt: "19:00",
  };

  const formattedOrg = {
    ...orgData,
    id: orgId,
    name: cleanOrgName,
    isSignupOrg: true,
    locations: formattedLocations.length > 0 ? formattedLocations : [primaryLoc.name],
    primaryLocation: primaryLoc.name,
    operatingHours: `${primaryLoc.operatingDays.join(", ")}: ${primaryLoc.opensAt}–${primaryLoc.closesAt}`,
    website: cleanWebsite || undefined,
    status: "Active" as const,
  };

  // 1. Mark account as fresh
  localStorage.setItem(FRESH_ACCOUNT_STORAGE_KEY, "fresh");
  localStorage.setItem(WORKSPACE_FRESH_MODE_KEY, "true");
  localStorage.setItem("onboarding_complete", "true");

  // 2. Organization list: Keep Demo Mantra & demo clinics so user can switch between Demo Mantra and Eye Mantra
  let existingOrgs = DEFAULT_DEMO_ORGANIZATIONS;
  try {
    const raw = localStorage.getItem("mantra_organizations_v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        existingOrgs = parsed;
      }
    }
  } catch {}

  const usedCodes = new Set<string>(["ORG-0001"]);
  let codeNum = 2;
  const filteredExisting = existingOrgs
    .filter(
      (o: any) => o.id !== orgId && (o.name || "").toLowerCase() !== cleanOrgName.toLowerCase()
    )
    .map((o: any) => {
      let code = o.orgCode;
      if (!code || usedCodes.has(code)) {
        code = `ORG-${String(codeNum++).padStart(4, "0")}`;
      }
      usedCodes.add(code);
      return { ...o, orgCode: code };
    });

  const mergedOrgs = [
    { ...formattedOrg, orgCode: "ORG-0001" },
    ...filteredExisting,
  ];

  localStorage.setItem("mantra_organizations_v1", JSON.stringify(mergedOrgs));
  localStorage.setItem("mantra_active_org_id_v1", orgId);
  localStorage.setItem("signup_org_id", orgId);
  localStorage.setItem("active_organization_name", cleanOrgName);
  localStorage.setItem("user_organization", JSON.stringify(formattedOrg));
  sessionStorage.removeItem("mantra_org_session_override_v1");

  // Assign Free plan of matched default_category to new organization (skipped in pricing flow)
  if (!skipFreePlan && !orgData?.skipFreePlan) {
    try {
      assignFreePlanForCategory(orgId, (formattedOrg as any).default_category || "AI Receptionist");
    } catch (err) {
      console.error("Error assigning free plan for fresh workspace:", err);
    }
  }

  // 3. Products & Services: Seeded ONLY with the onboarding services for Eye Mantra
  const seededServices = services.map((s, idx) => ({
    id: idx + 1,
    name: s.name,
    description: s.description || "",
    category: orgData?.industryCategory || "Ophthalmologist",
    cptCode: "",
    duration: 30,
    slotDuration: 30,
    price: 100,
    currency: "USD",
    tax: 0,
    isActive: true,
    availableForAppointment: true,
    assignedEmployees: [1],
    createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    activity: "Added during onboarding",
    locationIds: locations.map((l: any) => l.id),
  }));
  localStorage.setItem("ma_services_store", JSON.stringify(seededServices));
  localStorage.setItem(`ma_services_${orgId}`, JSON.stringify(seededServices));
  localStorage.setItem("ma_services_store_signup", JSON.stringify(seededServices));

  // 4. Knowledge Base: Seeded ONLY with onboarding uploaded docs + website + practice summary for Eye Mantra
  const kbSources: any[] = [];
  (uploadedDocs || []).forEach((doc: any, idx: number) => {
    kbSources.push({
      id: doc.id || `doc_${Date.now()}_${idx}`,
      name: doc.name,
      type: "document",
      fileName: doc.name,
      fileSizeLabel: doc.size ? formatBytes(doc.size) : (doc.sizeLabel || "1.8 MB"),
      tags: ["Onboarding", "Document"],
      scopes: [],
      allProcesses: true,
      status: "completed",
      createdAt: new Date().toISOString(),
    });
  });

  if (cleanWebsite) {
    kbSources.push({
      id: `url_${Date.now()}`,
      name: `${cleanOrgName} Website`,
      type: "url",
      url: cleanWebsite.startsWith("http") ? cleanWebsite : `https://${cleanWebsite}`,
      scopeNote: "single-page-only",
      tags: ["Website", "Onboarding"],
      scopes: [],
      allProcesses: true,
      status: "completed",
      createdAt: new Date().toISOString(),
    });
  }

  const formattedServicesList = services.map((s) => s.name).join(", ");
  kbSources.push({
    id: `text_${Date.now()}`,
    name: `${cleanOrgName} Clinical Policies & Hours`,
    type: "text",
    title: `${cleanOrgName} Clinical Policies & Hours`,
    content: `Organization: ${cleanOrgName}\nLocation: ${primaryLoc.name} (${primaryLoc.address || "Main Clinic"})\nHours: ${primaryLoc.operatingDays?.join(", ")}: ${primaryLoc.opensAt}–${primaryLoc.closesAt}\nIndustry: ${orgData?.industry || "Healthcare & Clinic"} - ${orgData?.industryCategory || "Ophthalmologist"}\nServices: ${formattedServicesList || "Comprehensive Eye Examination, Cataract Surgery Consultation"}`,
    tags: ["Policy", "Hours", "Onboarding"],
    scopes: [],
    allProcesses: true,
    status: "completed",
    createdAt: new Date().toISOString(),
  });

  localStorage.setItem("ma_knowledge_base_sources", JSON.stringify(kbSources));
  localStorage.setItem(`ma_kb_${orgId}`, JSON.stringify(kbSources));
  localStorage.setItem("ma_kb_sources_signup", JSON.stringify(kbSources));

  // 5. Scoped Fresh Operational Data (Empty for Eye Mantra)
  localStorage.setItem(`clients_${orgId}`, "[]");
  localStorage.setItem(`callLogs_${orgId}`, "[]");
  localStorage.setItem(`processes_${orgId}`, "[]");
  localStorage.setItem(`appointments_${orgId}`, "[]");
  localStorage.setItem(`deals_${orgId}`, "[]");
  localStorage.setItem(`invoices_${orgId}`, "[]");
  localStorage.setItem(`claims_${orgId}`, "[]");

  // Also set current active keys to empty
  localStorage.setItem("clients", "[]");
  sessionStorage.setItem("clients", "[]");
  localStorage.setItem("processes", "[]");
  localStorage.setItem("appointments_v1", "[]");
  sessionStorage.setItem("appointments_v1", "[]");
  localStorage.setItem("callLogs", "[]");
  sessionStorage.setItem("callLogs", "[]");
  localStorage.setItem("mantra_call_logs", "[]");
  sessionStorage.setItem("mantra_call_logs", "[]");
  localStorage.setItem("invoices", "[]");
  sessionStorage.setItem("invoices", "[]");
  localStorage.setItem("mantra_invoices_v1", "[]");
  sessionStorage.setItem("mantra_invoices_v1", "[]");
  localStorage.setItem("mantra_payments_v1", "[]");
  sessionStorage.setItem("mantra_payments_v1", "[]");
  localStorage.setItem("claims", "[]");
  sessionStorage.setItem("claims", "[]");
  localStorage.setItem("mantra_claims_v1", "[]");
  sessionStorage.setItem("mantra_claims_v1", "[]");
  localStorage.setItem("deals", "[]");
  sessionStorage.setItem("deals", "[]");

  // Dispatch events to refresh all open pages and reactive stores
  try {
    window.dispatchEvent(new CustomEvent("organizationChanged", { detail: formattedOrg }));
    window.dispatchEvent(new CustomEvent("mantra_organization_changed", { detail: formattedOrg }));
    window.dispatchEvent(new Event("clientsStore_updated"));
    window.dispatchEvent(new Event("processLogs_updated"));
    window.dispatchEvent(new Event("mantra_appointments_changed"));
    window.dispatchEvent(new Event("ma_services_changed"));
    window.dispatchEvent(new Event("ma_knowledge_base_changed"));
    window.dispatchEvent(new Event("mantra_invoices_changed"));
    window.dispatchEvent(new Event("deals_updated"));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("processes_updated"));
  } catch {}
}

// Auto-migrate if user has completed onboarding previously
if (typeof window !== "undefined") {
  try {
    const onboardingComplete = localStorage.getItem("onboarding_complete") === "true";
    const userOrgStr = localStorage.getItem("user_organization");
    const alreadyMigrated = localStorage.getItem("fresh_workspace_migrated_v2") === "true";
    if (onboardingComplete && userOrgStr && !alreadyMigrated) {
      localStorage.setItem("fresh_workspace_migrated_v2", "true");
      const parsedOrg = JSON.parse(userOrgStr);
      initializeFreshSignupWorkspace({
        orgData: parsedOrg,
        locations: parsedOrg.locations || [],
        services: (parsedOrg.services || []).map((s: any, i: number) => ({ id: i + 1, name: typeof s === "string" ? s : s.name })),
        uploadedDocs: parsedOrg.uploadedDocuments || [],
        website: parsedOrg.website,
      });
    }
  } catch {}
}
