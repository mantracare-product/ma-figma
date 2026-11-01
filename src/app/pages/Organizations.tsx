/**
 * Organizations.tsx
 * Path: src/app/pages/Organizations.tsx
 *
 * Dedicated Admin Console for Organizations (User Management):
 * - Organizations are the users of MantraAssist, managed here by Admin.
 * - Same table and top bar components as Plans & Credits (AdminPlans.tsx).
 * - Full page width without horizontal scrollbars, hover ellipsis tooltips.
 * - Table columns:
 *   1. Org ID (shortest readable form, e.g. ORG-0001, always visible)
 *   2. Organization (name only)
 *   3. Email
 *   4. Industry (specific industry only, e.g. "Ophthalmologist")
 *   5. Plan (plan name only, e.g. "AI Clinic Receptionist Pro" or "No plan")
 *   6. Created (date only)
 *   7. Status (Invite sent, Onboarding, Active, Suspended)
 *   8. Actions (fixed-width column at far right with consistent 3-dot dropdown menu)
 * - Actions menu items: Assign plan, Upgrade plan, Remove plan, Suspend organization, Delete organization.
 * - Upgrade plan drawer showing higher tier plans in current category.
 * - 4-Step Add Organization Drawer without subtext/helper lines, info tooltips, full onboarding fields,
 *   knowledge base section, 6 plan categories (AI Receptionist, AI Scribe, EHR, RCM, Internal, Onboarding).
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Trash2,
  Users,
  Search,
  Coins,
  Building2,
  Check,
  ExternalLink,
  MoreVertical,
  Settings,
  X,
  CreditCard,
  Lock,
  Sparkles,
  Globe,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Copy,
  CheckCircle2,
  FileText,
  FileUp,
  TrendingUp,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import PageHeader from "../components/layout/PageHeader";
import PageTopBar from "../components/layout/PageTopBar";
import { TableComponent, TableColumn } from "../components/ui/TableComponent";
import { Modal } from "../components/ui/Modal";
import { Tooltip } from "../components/ui/Tooltip";
import { WebsiteDetectedCapsule } from "./auth/Onboarding";
import {
  getStoredPlans,
  getStoredSubscriptions,
  assignPlanToWorkspace,
  assignFreePlanForCategory,
  IndustryPlan,
  WorkspaceSubscription,
  PLANS_BILLING_CHANGED_EVENT,
  PLAN_CATEGORIES,
  INITIAL_INDUSTRY_PLANS,
} from "../../lib/plansBillingStore";
import {
  COUNTRIES,
  INDUSTRY_OPTIONS,
  CATEGORY_SPECIALTIES,
} from "./auth/Onboarding";
import { ALL_REQUIREMENT_NAMES } from "../../lib/planRecommendation";

const DEFAULT_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
const ALL_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export interface AdminDrawerLocation {
  id: string;
  name: string;
  address: string;
  operatingDays: string[];
  opensAt: string;
  closesAt: string;
}

const DEFAULT_DRAWER_LOCATIONS: AdminDrawerLocation[] = [
  {
    id: "loc-1",
    name: "Eye Mantra Super Specialty Clinic",
    address: "A-10, Paschim Vihar, New Delhi, 110063",
    operatingDays: DEFAULT_DAYS,
    opensAt: "09:00",
    closesAt: "19:00",
  },
];

export type OrganizationStatus = "Invite sent" | "Onboarding" | "Active" | "Suspended";

export interface OrganizationItem {
  id: string;
  orgCode: string; // e.g. ORG-0001
  name: string;
  email: string;
  website?: string;
  country?: string;
  currency?: string;
  industryCategory?: string;
  industry: string;
  specialty?: string;
  serviceCategory?: string;
  location?: string;
  locations?: string[];
  primaryLocation?: string;
  operatingHours?: string | null;
  services?: Array<{ id: string | number; name: string; description?: string }>;
  teamSize?: string;
  callVolume?: string | null;
  internationalCalls?: boolean | null;
  telephonyChoice?: string | null;
  primaryRequirements?: string[];
  uploadedDocuments?: Array<{ id: string; name: string; sizeLabel: string }>;
  status: OrganizationStatus;
  createdDate: string;
  createdAt?: string;
  createdPlanName?: string;
  createdIndustry?: string;
  assignedPlanId?: string;
  assignedPlanName?: string;
  assignedPlanCategory?: string;
  inviteToken?: string;
  inviteSentAt?: string;
  inviteUsed?: boolean;
}

const TIER_ORDER: Record<string, number> = {
  free: 0,
  starter: 1,
  growth: 2,
  professional: 2,
  pro: 2,
  scale: 3,
  custom: 4,
  enterprise: 4,
};

// ── Sanitize Data: Never use localhost or current page URL as name or website ──
function sanitizeOrg(o: any, idx: number): OrganizationItem {
  let name = (o.name || "").trim();
  const lowerName = name.toLowerCase();
  if (
    !name ||
    lowerName.includes("localhost") ||
    lowerName.includes("127.0.0.1") ||
    lowerName.includes("5173") ||
    lowerName.includes("admin/organizations") ||
    lowerName.startsWith("http://") ||
    lowerName.startsWith("https://") ||
    name.includes("/") ||
    name.includes(":")
  ) {
    if (
      o.confirmedData?.name &&
      !o.confirmedData.name.toLowerCase().includes("localhost") &&
      !o.confirmedData.name.startsWith("http") &&
      !o.confirmedData.name.includes("/")
    ) {
      name = o.confirmedData.name;
    } else {
      const ind = (o.specialty || o.industry || "").toLowerCase();
      if (ind.includes("ophthal") || ind.includes("eye")) {
        name = idx === 0 ? "Apex Eye Care" : idx === 1 ? "Vision Mantra Clinic" : "Eye Mantra";
      } else if (ind.includes("cardio") || ind.includes("heart")) {
        name = "Heart Care Clinic";
      } else if (ind.includes("dental")) {
        name = "Nova Dental Care";
      } else if (ind.includes("wellness") || ind.includes("therapy")) {
        name = "Zenith Wellness & Yoga";
      } else if (o.email && o.email.includes("@")) {
        const domain = o.email.split("@")[1].split(".")[0];
        if (
          domain &&
          !["gmail", "yahoo", "hotmail", "outlook", "icloud"].includes(domain.toLowerCase())
        ) {
          name = domain.charAt(0).toUpperCase() + domain.slice(1);
        } else {
          name = idx === 0 ? "Mantra Health Clinic" : `Care Center ${idx + 1}`;
        }
      } else {
        name = idx === 0 ? "Mantra Health Clinic" : `Care Center ${idx + 1}`;
      }
    }
  }

  let website = o.website;
  if (website) {
    const lowerWeb = website.toLowerCase();
    if (
      lowerWeb.includes("localhost") ||
      lowerWeb.includes("127.0.0.1") ||
      lowerWeb.includes("5173") ||
      lowerWeb.includes("admin/organizations")
    ) {
      website = undefined;
    }
  }

  const orgCode = o.orgCode || `ORG-${String(idx + 1).padStart(4, "0")}`;

  return {
    ...o,
    id: String(o.id || `org-${idx + 1}`),
    orgCode,
    name,
    website,
    email: o.email || "contact@org.com",
    country: o.country || "India",
    currency: o.currency || "INR",
    industryCategory: o.industryCategory || "Healthcare",
    industry: o.industry || "Healthcare & Clinic",
    specialty: o.specialty || o.serviceCategory || "General Physician",
    serviceCategory: o.serviceCategory || o.specialty || "General Physician",
    location: o.location || (o.locations && o.locations[0]) || "New Delhi",
    locations: o.locations || (o.location ? [o.location] : ["Main Clinic"]),
    primaryLocation: o.primaryLocation || "Main Clinic",
    operatingHours: o.operatingHours || "MON-SAT: 09:00–19:00",
    services: o.services || [],
    teamSize: o.teamSize || "2–5",
    callVolume: o.callVolume || "25–100 a day",
    internationalCalls: Boolean(o.internationalCalls),
    telephonyChoice: o.telephonyChoice || "default",
    primaryRequirements: o.primaryRequirements || ["24/7 AI Receptionist"],
    uploadedDocuments: o.uploadedDocuments || [
      { id: "kb-1", name: "Eye_Mantra_Clinical_Overview_&_Hours.pdf", sizeLabel: "1.8 MB" },
      { id: "kb-2", name: "Eye_Care_Services_Pricing_&_Treatment_Guide.pdf", sizeLabel: "2.4 MB" },
      { id: "kb-3", name: "Patient_Eye_Care_Preparation_&_Insurance_Policy.pdf", sizeLabel: "1.2 MB" },
    ],
    status: (o.status === "Suspended" || o.status === "Invite sent" || o.status === "Onboarding"
      ? o.status
      : "Active") as OrganizationStatus,
    createdDate: o.createdDate || "Jul 06, 2026",
    createdAt: o.createdAt || new Date(Date.now() - (idx + 1) * 86400000).toISOString(),
    createdPlanName: o.createdPlanName || "AI Receptionist Starter",
    createdIndustry: o.createdIndustry || `${o.industry || "Healthcare & Clinic"} · ${o.specialty || "General"}`,
    assignedPlanId: o.assignedPlanId,
    assignedPlanName: o.assignedPlanName,
    assignedPlanCategory: o.assignedPlanCategory,
    inviteToken: o.inviteToken,
    inviteSentAt: o.inviteSentAt,
  };
}

// ── Reusable Label with Info Tooltip (replaces all subtext in drawer) ──
function DrawerFieldLabel({
  label,
  tooltip,
  required,
}: {
  label: string;
  tooltip?: string;
  required?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <label
        className="block text-xs font-semibold text-slate-800"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        {label}
        {required && <span className="text-slate-400 font-normal ml-0.5">*</span>}
      </label>
      {tooltip && (
        <Tooltip content={tooltip} position="top">
          <span className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 cursor-help inline-flex items-center">
            <Info className="w-3.5 h-3.5" />
          </span>
        </Tooltip>
      )}
    </div>
  );
}

export default function Organizations() {
  const [organizations, setOrganizations] = useState<OrganizationItem[]>(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("mantra_organizations_v1") : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = parsed.map((o: any, idx: number) => sanitizeOrg(o, idx));
          localStorage.setItem("mantra_organizations_v1", JSON.stringify(sanitized));
          return sanitized;
        }
      }
      const initial: OrganizationItem[] = [
        sanitizeOrg(
          {
            id: "demo",
            orgCode: "ORG-0001",
            name: "Demo Mantra Care",
            email: "contact@mantraassist.com",
            website: "https://www.mantracare.com",
            country: "India",
            currency: "INR",
            industryCategory: "Healthcare",
            industry: "Healthcare & Clinic",
            specialty: "General Physician",
            serviceCategory: "General Physician",
            location: "New Delhi",
            locations: ["New Delhi Branch", "Bangalore Clinic"],
            primaryLocation: "New Delhi Branch",
            operatingHours: "MON-SAT: 09:00–19:00",
            teamSize: "11–25",
            callVolume: "100–300 a day",
            status: "Active",
            createdDate: "Jul 06, 2026",
            createdAt: new Date("2026-07-06T10:00:00Z").toISOString(),
            createdPlanName: "AI Receptionist Starter",
            createdIndustry: "Healthcare & Clinic · General Physician",
            assignedPlanName: "AI Clinic Receptionist Pro",
            assignedPlanCategory: "AI Receptionist",
          },
          0
        ),
        sanitizeOrg(
          {
            id: "1",
            orgCode: "ORG-0002",
            name: "Heart Care Clinic",
            email: "contact@heartcare.com",
            website: "https://www.heartcare.org",
            country: "United States",
            currency: "USD",
            industryCategory: "Healthcare",
            industry: "Healthcare & Clinic",
            specialty: "Cardiologist",
            serviceCategory: "Cardiologist",
            location: "California",
            locations: ["San Francisco Medical Suite"],
            primaryLocation: "San Francisco Medical Suite",
            operatingHours: "MON-FRI: 08:30–17:30",
            teamSize: "6–10",
            callVolume: "25–100 a day",
            status: "Active",
            createdDate: "Jun 15, 2026",
            createdAt: new Date("2026-06-15T09:30:00Z").toISOString(),
            createdPlanName: "AI Clinic Receptionist Pro",
            createdIndustry: "Healthcare & Clinic · Cardiologist",
            assignedPlanName: "AI Clinic Receptionist Pro",
            assignedPlanCategory: "AI Receptionist",
          },
          1
        ),
        sanitizeOrg(
          {
            id: "2",
            orgCode: "ORG-0003",
            name: "Zenith Wellness & Yoga",
            email: "contact@zenithwellness.in",
            website: "https://www.zenithwellness.in",
            country: "India",
            currency: "INR",
            industryCategory: "Wellness & Lifestyle",
            industry: "Wellness & Therapy",
            specialty: "Life & Health Coach",
            serviceCategory: "Life & Health Coach",
            location: "Bangalore",
            locations: ["Indiranagar Studio"],
            primaryLocation: "Indiranagar Studio",
            operatingHours: "MON-SUN: 06:00–20:00",
            teamSize: "2–5",
            callVolume: "Under 25 a day",
            status: "Active",
            createdDate: "May 20, 2026",
            createdAt: new Date("2026-05-20T14:15:00Z").toISOString(),
            createdPlanName: "AI Receptionist Starter",
            createdIndustry: "Wellness & Therapy · Life & Health Coach",
            assignedPlanName: "AI Receptionist Starter",
            assignedPlanCategory: "AI Receptionist",
          },
          2
        ),
      ];
      localStorage.setItem("mantra_organizations_v1", JSON.stringify(initial));
      return initial;
    } catch {
      return [];
    }
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [subscriptions, setSubscriptions] = useState<Record<string, WorkspaceSubscription>>(() =>
    getStoredSubscriptions()
  );

  const refreshSubscriptions = () => {
    setSubscriptions(getStoredSubscriptions());
  };

  useEffect(() => {
    const handlePlansChange = () => {
      refreshSubscriptions();
    };
    window.addEventListener(PLANS_BILLING_CHANGED_EVENT, handlePlansChange);
    window.addEventListener("mantra_organization_changed", handlePlansChange);
    return () => {
      window.removeEventListener(PLANS_BILLING_CHANGED_EVENT, handlePlansChange);
      window.removeEventListener("mantra_organization_changed", handlePlansChange);
    };
  }, []);

  // ── On-mount migration: clean any stale localhost/URL names from localStorage ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mantra_organizations_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          let needsUpdate = false;
          const cleaned = parsed.map((item: any, idx: number) => {
            const s = sanitizeOrg(item, idx);
            if (s.name !== item.name || s.website !== item.website || !item.orgCode) {
              needsUpdate = true;
            }
            return s;
          });
          if (needsUpdate) {
            setOrganizations(cleaned);
            localStorage.setItem("mantra_organizations_v1", JSON.stringify(cleaned));
            window.dispatchEvent(new CustomEvent("mantra_organization_changed"));
          }
        }
      }
    } catch (e) {
      console.error("Failed to run organizations migration", e);
    }
  }, []);

  const saveOrganizations = (updated: OrganizationItem[]) => {
    setOrganizations(updated);
    try {
      localStorage.setItem("mantra_organizations_v1", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("mantra_organization_changed"));
    } catch (e) {
      console.error("Failed to save organizations", e);
    }
  };

  // ── 6 Plan Categories (AI Receptionist, AI Scribe, EHR, RCM, Internal, Onboarding) ──
  const planCategories = useMemo(() => {
    return [
      "AI Receptionist",
      "AI Scribe",
      "EHR",
      "RCM",
      "Internal",
      "Onboarding",
    ];
  }, []);

  const allPlans = useMemo(() => getStoredPlans(), [organizations]);

  // Check if organization has higher tier plans in current category for Upgrade
  const canUpgrade = (org: OrganizationItem): boolean => {
    const currentPlanName = (org.assignedPlanName || "").toLowerCase().trim();
    if (!currentPlanName || currentPlanName === "no plan") return false;

    const currentPlan = allPlans.find(
      (p) => p.name.toLowerCase() === currentPlanName || p.id === org.assignedPlanId
    );
    if (!currentPlan) return false;

    const currentCategory = (currentPlan.category || org.assignedPlanCategory || "AI Receptionist").toLowerCase();
    const currentTierRank = TIER_ORDER[currentPlan.tier?.toLowerCase() || ""] ?? 1;

    return allPlans.some((p) => {
      if (p.isActive === false) return false;
      const catMatch = (p.category || "").toLowerCase() === currentCategory;
      const rank = TIER_ORDER[p.tier?.toLowerCase() || ""] ?? 0;
      return catMatch && rank > currentTierRank;
    });
  };

  // ── Actions Dropdown State (Popover aligned to button, never clipped) ──
  const [activeActionMenu, setActiveActionMenu] = useState<{
    org: OrganizationItem;
    position: { top: number; left: number };
  } | null>(null);

  useEffect(() => {
    const handleCloseMenu = () => setActiveActionMenu(null);
    if (activeActionMenu) {
      window.addEventListener("click", handleCloseMenu);
      window.addEventListener("resize", handleCloseMenu);
      window.addEventListener("scroll", handleCloseMenu, true);
    }
    return () => {
      window.removeEventListener("click", handleCloseMenu);
      window.removeEventListener("resize", handleCloseMenu);
      window.removeEventListener("scroll", handleCloseMenu, true);
    };
  }, [activeActionMenu]);

  // ── Confirmation Modal State ──
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: "remove_plan" | "suspend" | "unsuspend" | "delete";
    org: OrganizationItem | null;
  }>({
    isOpen: false,
    type: "remove_plan",
    org: null,
  });

  const handleConfirmAction = () => {
    const { type, org } = confirmModal;
    if (!org) return;

    if (type === "remove_plan") {
      // Revert to Free Onboarding Plan
      const targetCategory = org.assignedPlanCategory || "AI Receptionist";
      assignFreePlanForCategory(org.id, targetCategory);

      const updated = organizations.map((o) =>
        o.id === org.id
          ? {
              ...o,
              assignedPlanId: undefined,
              assignedPlanName: undefined,
              assignedPlanCategory: undefined,
            }
          : o
      );
      saveOrganizations(updated);
      refreshSubscriptions();
      toast.success(`Plan removed for ${org.name}. Organization moved to Free plan.`);
    } else if (type === "suspend") {
      const updated = organizations.map((o) =>
        o.id === org.id ? { ...o, status: "Suspended" as const } : o
      );
      saveOrganizations(updated);
      toast.success(`${org.name} has been suspended. Organization users cannot log in.`);
    } else if (type === "unsuspend") {
      const updated = organizations.map((o) =>
        o.id === org.id ? { ...o, status: "Active" as const } : o
      );
      saveOrganizations(updated);
      toast.success(`${org.name} has been reactivated.`);
    } else if (type === "delete") {
      const updated = organizations.filter((o) => o.id !== org.id);
      saveOrganizations(updated);
      refreshSubscriptions();
      toast.success(`${org.name} has been permanently deleted.`);
    }

    setConfirmModal({ isOpen: false, type: "remove_plan", org: null });
  };

  // ── Plan Drawer (Used for both Assign Plan and Upgrade Plan) ──
  const [isPlanDrawerOpen, setIsPlanDrawerOpen] = useState(false);
  const [planDrawerMode, setPlanDrawerMode] = useState<"assign" | "upgrade">("assign");
  const [selectedOrgForPlan, setSelectedOrgForPlan] = useState<OrganizationItem | null>(null);
  const [planDrawerCategoryTab, setPlanDrawerCategoryTab] = useState<string>("AI Receptionist");
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");

  const handleOpenAssignPlan = (org: OrganizationItem) => {
    setSelectedOrgForPlan(org);
    setPlanDrawerMode("assign");
    const initialCat = org.assignedPlanCategory || "AI Receptionist";
    setPlanDrawerCategoryTab(initialCat);
    setSelectedPlanId(org.assignedPlanId || "");
    setIsPlanDrawerOpen(true);
    setActiveActionMenu(null);
  };

  const handleOpenUpgradePlan = (org: OrganizationItem) => {
    setSelectedOrgForPlan(org);
    setPlanDrawerMode("upgrade");
    const currentPlan = allPlans.find(
      (p) => p.name.toLowerCase() === (org.assignedPlanName || "").toLowerCase() || p.id === org.assignedPlanId
    );
    const category = currentPlan?.category || org.assignedPlanCategory || "AI Receptionist";
    setPlanDrawerCategoryTab(category);
    setSelectedPlanId("");
    setIsPlanDrawerOpen(true);
    setActiveActionMenu(null);
  };

  const handleApplyPlan = () => {
    if (!selectedOrgForPlan || !selectedPlanId) {
      toast.error("Please select a plan to continue");
      return;
    }
    const plan = allPlans.find((p) => p.id === selectedPlanId);
    if (!plan) return;

    assignPlanToWorkspace(selectedOrgForPlan.id, plan.id, "monthly", selectedOrgForPlan.currency || "INR");

    const updated = organizations.map((o) =>
      o.id === selectedOrgForPlan.id
        ? {
            ...o,
            assignedPlanId: plan.id,
            assignedPlanName: plan.name,
            assignedPlanCategory: plan.category,
          }
        : o
    );
    saveOrganizations(updated);
    refreshSubscriptions();

    toast.success(
      planDrawerMode === "upgrade"
        ? `Successfully upgraded ${selectedOrgForPlan.name} to ${plan.name}!`
        : `Successfully assigned ${plan.name} to ${selectedOrgForPlan.name}!`
    );
    setIsPlanDrawerOpen(false);
  };

  // ── PART 2: ADD ORGANIZATION DRAWER STATE ──
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false);

  // Step 1: Email & Website
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteWebsite, setInviteWebsite] = useState("");
  const [step1Error, setStep1Error] = useState<string | null>(null);

  // Step 2: Information
  const [isFetchedFromWebsite, setIsFetchedFromWebsite] = useState(false);
  const [orgName, setOrgName] = useState("Eye Mantra Super Specialty");
  const [country, setCountry] = useState("India");
  const [selectedIndustry, setSelectedIndustry] = useState("Healthcare & Clinic");
  const [selectedServiceCategory, setSelectedServiceCategory] = useState("Ophthalmologist");
  const [drawerLocations, setDrawerLocations] = useState<AdminDrawerLocation[]>(DEFAULT_DRAWER_LOCATIONS);

  const [servicesList, setServicesList] = useState<Array<{ id: string | number; name: string; description?: string }>>([
    { id: "srv-1", name: "Comprehensive Eye Examination", description: "30 mins complete refraction & retina check" },
    { id: "srv-2", name: "Cataract Surgery Consultation", description: "45 mins advanced surgical evaluation" },
    { id: "srv-3", name: "LASIK Screening", description: "Corneal topography & vision correction suitability" },
  ]);

  // Setup Fields (all 5 required)
  const [selectedTeamSize, setSelectedTeamSize] = useState("2–5");
  const [selectedCallVolume, setSelectedCallVolume] = useState("25–100 a day");
  const [selectedRequirements, setSelectedRequirements] = useState<string[]>([
    "24/7 AI Receptionist",
    "Appointment Scheduling & Reminders",
  ]);
  const [selectedIntl, setSelectedIntl] = useState<"Yes" | "No">("No");
  const [selectedPhone, setSelectedPhone] = useState<string>("Use a number from MantraAssist");

  // Knowledge base documents (new)
  const [uploadedDocs, setUploadedDocs] = useState<Array<{ id: string; name: string; sizeLabel: string }>>([
    { id: "kb-1", name: "Eye_Mantra_Clinical_Overview_&_Hours.pdf", sizeLabel: "1.8 MB" },
    { id: "kb-2", name: "Eye_Care_Services_Pricing_&_Treatment_Guide.pdf", sizeLabel: "2.4 MB" },
    { id: "kb-3", name: "Patient_Eye_Care_Preparation_&_Insurance_Policy.pdf", sizeLabel: "1.2 MB" },
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step2Error, setStep2Error] = useState<string | null>(null);

  // Step 3: Plan
  const [planCategoryTab, setPlanCategoryTab] = useState<string>("AI Receptionist");
  const [selectedPlanForInvite, setSelectedPlanForInvite] = useState<IndustryPlan | null>(null);

  // Step 4: Send
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [sendInviteError, setSendInviteError] = useState<string | null>(null);

  const resetDrawerState = () => {
    setCurrentStep(1);
    setInviteEmail("");
    setInviteWebsite("");
    setStep1Error(null);
    setIsFetchedFromWebsite(false);
    setOrgName("Eye Mantra Super Specialty");
    setCountry("India");
    setSelectedIndustry("Healthcare & Clinic");
    setSelectedServiceCategory("Ophthalmologist");
    setDrawerLocations(DEFAULT_DRAWER_LOCATIONS);
    setSelectedTeamSize("2–5");
    setSelectedCallVolume("25–100 a day");
    setSelectedRequirements(["24/7 AI Receptionist", "Appointment Scheduling & Reminders"]);
    setSelectedIntl("No");
    setSelectedPhone("Use a number from MantraAssist");
    setUploadedDocs([
      { id: "kb-1", name: "Eye_Mantra_Clinical_Overview_&_Hours.pdf", sizeLabel: "1.8 MB" },
      { id: "kb-2", name: "Eye_Care_Services_Pricing_&_Treatment_Guide.pdf", sizeLabel: "2.4 MB" },
      { id: "kb-3", name: "Patient_Eye_Care_Preparation_&_Insurance_Policy.pdf", sizeLabel: "1.2 MB" },
    ]);
    setStep2Error(null);
    setPlanCategoryTab("AI Receptionist");
    setSelectedPlanForInvite(null);
    setIsSendingInvite(false);
    setSendInviteError(null);
    setShowDiscardPrompt(false);
  };

  const hasEnteredData = Boolean(
    inviteEmail.trim() || inviteWebsite.trim() || (currentStep > 1 && orgName.trim())
  );

  const handleAttemptCloseDrawer = () => {
    if (hasEnteredData) {
      setShowDiscardPrompt(true);
    } else {
      setIsAddDrawerOpen(false);
      resetDrawerState();
    }
  };

  // Step 1 -> Step 2
  const handleProceedStep1 = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!inviteEmail.trim() || !emailRegex.test(inviteEmail.trim())) {
      setStep1Error("Please enter a valid organization email address");
      return;
    }
    const cleanUrl = inviteWebsite.trim();
    if (!cleanUrl || cleanUrl.length < 4 || (!cleanUrl.includes(".") && !cleanUrl.startsWith("http"))) {
      setStep1Error("Please enter a valid website URL (e.g. https://www.eyemantra.com)");
      return;
    }

    setStep1Error(null);

    // Auto detect name from website without falling back to URL
    let detectedName = "";
    const cleanDomain = cleanUrl.replace(/^https?:\/\/(www\.)?/, "").split("/")[0].split(".")[0];
    if (
      cleanDomain &&
      cleanDomain.length > 2 &&
      !cleanDomain.toLowerCase().includes("localhost") &&
      !cleanDomain.includes("127")
    ) {
      detectedName = cleanDomain.charAt(0).toUpperCase() + cleanDomain.slice(1);
      if (cleanDomain.toLowerCase().includes("eye")) detectedName = "Eye Mantra Super Specialty";
      else detectedName = `${detectedName} Clinic`;
    }

    if (!detectedName && inviteEmail.includes("@")) {
      const domain = inviteEmail.split("@")[1].split(".")[0];
      if (domain && !["gmail", "yahoo", "outlook", "hotmail"].includes(domain.toLowerCase())) {
        detectedName = `${domain.charAt(0).toUpperCase() + domain.slice(1)} Health`;
      }
    }

    if (!detectedName) {
      detectedName = "Eye Mantra Super Specialty";
    }

    setOrgName(detectedName);
    setIsFetchedFromWebsite(true);
    setCurrentStep(2);
  };

  // Step 2 -> Step 3
  const handleProceedStep2 = () => {
    if (!orgName.trim()) {
      setStep2Error("Please enter the organization name");
      return;
    }
    if (drawerLocations.length === 0 || !drawerLocations[0].name.trim()) {
      setStep2Error("Please enter at least one location name");
      return;
    }
    if (servicesList.length === 0 || !servicesList[0].name.trim()) {
      setStep2Error("Please add at least one product or service");
      return;
    }

    setStep2Error(null);
    setCurrentStep(3);
  };

  // Step 3 -> Step 4
  const handleProceedStep3 = () => {
    if (!selectedPlanForInvite) {
      toast.error("Please select a plan for this organization");
      return;
    }
    setCurrentStep(4);
  };

  // Step 4: Send Invite
  const handleSendInvite = () => {
    if (!selectedPlanForInvite) {
      setSendInviteError("A plan is required to send the invite");
      return;
    }

    setIsSendingInvite(true);
    setSendInviteError(null);

    setTimeout(() => {
      try {
        const inviteToken = "inv_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 7);
        const newOrgId = "org_" + Date.now();
        const nextIndex = organizations.length + 1;
        const orgCode = `ORG-${String(nextIndex).padStart(4, "0")}`;
        const primaryLocName = drawerLocations[0]?.name.trim() || "Main Clinic";
        const allLocStrings = drawerLocations.map(
          (l) => `${l.name.trim()}${l.address.trim() ? " - " + l.address.trim() : ""}`
        );
        const primaryHours = drawerLocations[0]
          ? `${drawerLocations[0].operatingDays.join(", ")}: ${drawerLocations[0].opensAt}–${drawerLocations[0].closesAt}`
          : "MON-SAT: 09:00–19:00";
        const createdDate = new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

        const newOrg: OrganizationItem = {
          id: newOrgId,
          orgCode,
          name: orgName.trim(),
          email: inviteEmail.trim().toLowerCase(),
          website: inviteWebsite.trim(),
          country: country.trim(),
          currency: country.trim() === "India" ? "INR" : "USD",
          industryCategory: selectedIndustry,
          industry: selectedIndustry,
          specialty: selectedServiceCategory,
          serviceCategory: selectedServiceCategory,
          location: primaryLocName,
          locations: allLocStrings,
          primaryLocation: primaryLocName,
          operatingHours: primaryHours,
          services: servicesList,
          teamSize: selectedTeamSize,
          callVolume: selectedCallVolume,
          internationalCalls: selectedIntl === "Yes",
          telephonyChoice: selectedPhone === "Use my own number" ? "bring_own" : "default",
          primaryRequirements: selectedRequirements,
          uploadedDocuments: uploadedDocs,
          status: "Invite sent",
          createdDate,
          createdAt: new Date().toISOString(),
          createdPlanName: selectedPlanForInvite.name,
          createdIndustry: selectedServiceCategory,
          assignedPlanId: selectedPlanForInvite.id,
          assignedPlanName: selectedPlanForInvite.name,
          assignedPlanCategory: selectedPlanForInvite.category,
          inviteToken,
          inviteSentAt: new Date().toISOString(),
        };

        // Assign Plan to Workspace Subscription
        assignPlanToWorkspace(newOrg.id, selectedPlanForInvite.id, "monthly", newOrg.currency);

        // Save Invite Data
        const inviteData = {
          token: inviteToken,
          orgId: newOrg.id,
          email: newOrg.email,
          website: newOrg.website,
          confirmedData: newOrg,
          planId: selectedPlanForInvite.id,
        };
        localStorage.setItem("mantra_invite_" + inviteToken, JSON.stringify(inviteData));

        // Save to Organizations (newest at top)
        const updated = [newOrg, ...organizations.filter((o) => o.id !== newOrg.id)];
        saveOrganizations(updated);
        refreshSubscriptions();

        setIsSendingInvite(false);
        setIsAddDrawerOpen(false);
        resetDrawerState();

        const inviteUrl = `${window.location.origin}/invite?token=${inviteToken}`;
        toast.success(
          <div className="space-y-1">
            <div className="font-semibold text-sm">Invite sent to {newOrg.email}!</div>
            <div className="text-xs text-gray-500 truncate max-w-xs">{inviteUrl}</div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(inviteUrl);
                toast.info("Invite link copied to clipboard ✓");
              }}
              className="mt-1 inline-flex items-center gap-1 px-2.5 py-1 bg-gray-900 text-white rounded text-xs font-semibold hover:bg-black cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              <span>Copy Link</span>
            </button>
          </div>,
          { duration: 8000 }
        );
      } catch (err: any) {
        setIsSendingInvite(false);
        setSendInviteError(err?.message || "Failed to send invite. Please check details and retry.");
      }
    }, 600);
  };

  // ── FILTER ORGANIZATIONS (Search by name and email) ──
  const filteredOrganizations = useMemo(() => {
    let list = [...organizations];
    // Always newest first
    list.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (org) =>
          org.name.toLowerCase().includes(q) ||
          org.email.toLowerCase().includes(q) ||
          org.orgCode.toLowerCase().includes(q)
      );
    }
    return list;
  }, [organizations, searchQuery]);

  // ─────────────────────────────────────────────────────────────
  // TABLE COLUMNS CONFIGURATION (PART 1, ITEMS 1-8)
  // ─────────────────────────────────────────────────────────────
  const columns: TableColumn<OrganizationItem>[] = [
    // 1. Actions: Three-dot button in FRONT (Column 1), vertically centered on every row
    {
      id: "actions",
      header: "Actions",
      width: "56px",
      minWidth: "56px",
      maxWidth: "60px",
      align: "center",
      render: (org) => {
        const isOpen = activeActionMenu?.org.id === org.id;
        return (
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                const menuHeight = 175;
                const showAbove = rect.bottom + menuHeight > window.innerHeight;
                setActiveActionMenu(
                  isOpen
                    ? null
                    : {
                        org,
                        position: {
                          top: showAbove ? rect.top - menuHeight : rect.bottom + 4,
                          left: Math.max(8, rect.left),
                        },
                      }
                );
              }}
              className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                isOpen
                  ? "bg-slate-200 text-slate-800"
                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              }`}
              title="Actions"
              aria-label="Actions"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },

    // 2. Org ID: unique ID, shortest readable form (e.g. ORG-0001). Always visible, not truncated.
    {
      id: "orgId",
      header: "Org ID",
      width: "105px",
      minWidth: "95px",
      render: (org) => (
        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100/90 px-2 py-0.5 rounded border border-slate-200/80 whitespace-nowrap">
          {org.orgCode}
        </span>
      ),
    },

    // 3. Name: organization name only. Renamed to Name. Remove website line under it.
    {
      id: "name",
      header: "Name",
      render: (org) => (
        <span
          className="font-semibold text-gray-900 text-xs sm:text-[13px] truncate block"
          title={org.name}
        >
          {org.name}
        </span>
      ),
    },

    // 4. Email
    {
      id: "email",
      header: "Email",
      render: (org) => (
        <span className="text-xs text-gray-700 truncate block" title={org.email}>
          {org.email || "—"}
        </span>
      ),
    },

    // 5. Industry: specific industry only (e.g. "Ophthalmologist"). Remove category and remove secondary line.
    {
      id: "industry",
      header: "Industry",
      render: (org) => {
        const specificIndustry = org.specialty || org.serviceCategory || org.industry;
        return (
          <span className="text-xs font-medium text-gray-800 truncate block" title={specificIndustry}>
            {specificIndustry}
          </span>
        );
      },
    },

    // 6. Plan: plan name only (e.g. "AI Clinic Receptionist Pro"). Remove category after name. Show "No plan" if none.
    {
      id: "plan",
      header: "Plan",
      render: (org) => {
        const sub = subscriptions[org.id];
        const rawPlanName =
          sub?.planName && sub.planName !== "No Plan Assigned"
            ? sub.planName
            : org.assignedPlanName || "No plan";

        return (
          <span
            className={`text-xs font-medium truncate block ${
              rawPlanName === "No plan" ? "text-gray-400 italic" : "text-gray-900"
            }`}
            title={rawPlanName}
          >
            {rawPlanName}
          </span>
        );
      },
    },

    // 7. Created: date only. Remove line under it that shows plan, industry and specialty.
    {
      id: "created",
      header: "Created",
      width: "110px",
      render: (org) => (
        <span className="text-xs font-medium text-gray-600 truncate whitespace-nowrap block">
          {org.createdDate || "Recently"}
        </span>
      ),
    },

    // 8. Status: unchanged (Invite sent, Onboarding, Active, Suspended)
    {
      id: "status",
      header: "Status",
      width: "115px",
      render: (org) => {
        const badgeStyles: Record<OrganizationStatus, string> = {
          "Invite sent": "bg-amber-50 text-amber-700 border-amber-200/80",
          "Onboarding": "bg-blue-50 text-blue-700 border-blue-200/80",
          "Active": "bg-emerald-50 text-emerald-700 border-emerald-200/80",
          "Suspended": "bg-rose-50 text-rose-700 border-rose-200/80",
        };
        const badgeStyle = badgeStyles[org.status] || badgeStyles["Active"];
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badgeStyle} shrink-0 whitespace-nowrap`}
          >
            {org.status}
          </span>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="px-10 sm:px-12 py-7.5 sm:py-8 w-full space-y-7 animate-in fade-in duration-200">
        {/* Page Heading & Subtext */}
        <PageHeader
          title="Organizations"
          subtitle="Manage your organization hierarchy and system settings with precision"
        />

        {/* Top Bar matching AdminPlans: Search left, Add Organization right */}
        <PageTopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by organization name or email..."
          primaryAction={{
            label: "Add Organization",
            icon: <Plus className="w-3.5 h-3.5 stroke-[2.5]" />,
            onClick: () => {
              resetDrawerState();
              setIsAddDrawerOpen(true);
            },
          }}
        />

        {/* Organizations Table (Fits Page Width Without Horizontal Scroll) */}
        <div className="w-full">
          <TableComponent<OrganizationItem>
            data={filteredOrganizations}
            columns={columns}
            getRowId={(org) => org.id}
            actionIcon="dots"
            enableSelection={false}
            enableColumnCustomization={false}
            defaultRowsPerPage={20}
            pageSizeOptions={[20, 50, 100]}
            emptyMessage="No organizations found matching your search."
            tableId="admin-organizations-user-management-table"
          />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ACTIONS DROPDOWN MENU (PORTALED, NEVER CLIPPED BY TABLE)
          Items: Assign plan, Upgrade plan, Remove plan, Suspend, Delete
          ───────────────────────────────────────────────────────────── */}
      {activeActionMenu &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: `${activeActionMenu.position.top}px`,
              left: `${activeActionMenu.position.left}px`,
              zIndex: 9999,
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 animate-in fade-in zoom-in-95 duration-100"
          >
            {/* 1. Assign plan */}
            <button
              type="button"
              onClick={() => handleOpenAssignPlan(activeActionMenu.org)}
              className="w-full h-8.5 px-3 py-1.5 flex items-center gap-2.5 text-xs text-left font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Assign plan</span>
            </button>

            {/* 2. Upgrade plan (new): shown only if org has plan and higher tier plans exist */}
            {canUpgrade(activeActionMenu.org) && (
              <button
                type="button"
                onClick={() => handleOpenUpgradePlan(activeActionMenu.org)}
                className="w-full h-8.5 px-3 py-1.5 flex items-center gap-2.5 text-xs text-left font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <TrendingUp className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Upgrade plan</span>
              </button>
            )}

            {/* 3. Remove plan: red style, confirmation dialog */}
            {Boolean(
              subscriptions[activeActionMenu.org.id]?.planName !== "No Plan Assigned" ||
                activeActionMenu.org.assignedPlanName
            ) && (
              <button
                type="button"
                onClick={() => {
                  setConfirmModal({
                    isOpen: true,
                    type: "remove_plan",
                    org: activeActionMenu.org,
                  });
                  setActiveActionMenu(null);
                }}
                className="w-full h-8.5 px-3 py-1.5 flex items-center gap-2.5 text-xs text-left font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 shrink-0" />
                <span>Remove plan</span>
              </button>
            )}

            {/* 4. Suspend / Reactivate organization: red style for suspend, confirmation dialog */}
            {activeActionMenu.org.status === "Suspended" ? (
              <button
                type="button"
                onClick={() => {
                  setConfirmModal({
                    isOpen: true,
                    type: "unsuspend",
                    org: activeActionMenu.org,
                  });
                  setActiveActionMenu(null);
                }}
                className="w-full h-8.5 px-3 py-1.5 flex items-center gap-2.5 text-xs text-left font-medium text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4 shrink-0" />
                <span>Reactivate organization</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setConfirmModal({
                    isOpen: true,
                    type: "suspend",
                    org: activeActionMenu.org,
                  });
                  setActiveActionMenu(null);
                }}
                className="w-full h-8.5 px-3 py-1.5 flex items-center gap-2.5 text-xs text-left font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <Lock className="w-4 h-4 shrink-0" />
                <span>Suspend organization</span>
              </button>
            )}

            {/* 5. Delete organization: red style, confirmation dialog showing org name */}
            <button
              type="button"
              onClick={() => {
                setConfirmModal({
                  isOpen: true,
                  type: "delete",
                  org: activeActionMenu.org,
                });
                setActiveActionMenu(null);
              }}
              className="w-full h-8.5 px-3 py-1.5 flex items-center gap-2.5 text-xs text-left font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>Delete organization</span>
            </button>
          </div>,
          document.body
        )}

      {/* ─────────────────────────────────────────────────────────────
          PART 2: ADD ORGANIZATION DRAWER (4 STEPS, SUBTEXT REMOVED)
          ───────────────────────────────────────────────────────────── */}
      {isAddDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200 border-l border-gray-200">
            {/* Drawer Header (Description removed) */}
            <div className="p-5 border-b border-gray-200 shrink-0 bg-gray-50/70">
              <div className="flex items-center justify-between mb-3">
                <h2
                  className="text-lg font-bold text-gray-900 tracking-tight"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Add Organization
                </h2>
                <button
                  type="button"
                  onClick={handleAttemptCloseDrawer}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                  title="Close drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 4-Step Progress Stepper */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[
                  { step: 1, label: "1. Organization" },
                  { step: 2, label: "2. Information" },
                  { step: 3, label: "3. Plan" },
                  { step: 4, label: "4. Review & Send" },
                ].map((s) => (
                  <div
                    key={s.step}
                    className={`text-center py-1.5 px-1 rounded-lg text-xs font-semibold border transition-all ${
                      currentStep === s.step
                        ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                        : currentStep > s.step
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-white text-gray-400 border-gray-200"
                    }`}
                  >
                    {s.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Drawer Content */}
            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              {/* ── STEP 1: ORGANIZATION (Email & Website) ── */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {step1Error && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{step1Error}</span>
                    </div>
                  )}

                  {/* Organization Email */}
                  <div>
                    <DrawerFieldLabel
                      label="Organization email"
                      required
                      tooltip="The secure signup invite and workspace credentials will be sent to this email address."
                    />
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => {
                        setInviteEmail(e.target.value);
                        setStep1Error(null);
                      }}
                      placeholder="e.g. contact@eyemantra.com"
                      className="w-full h-10 px-3.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800"
                      autoFocus
                    />
                  </div>

                  {/* Website */}
                  <div>
                    <DrawerFieldLabel
                      label="Website"
                      required
                      tooltip="Used to detect practice name, location, and specialty."
                    />
                    <input
                      type="text"
                      value={inviteWebsite}
                      onChange={(e) => {
                        setInviteWebsite(e.target.value);
                        setStep1Error(null);
                      }}
                      placeholder="e.g. https://www.eyemantra.com"
                      className="w-full h-10 px-3.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800"
                    />
                  </div>
                </div>
              )}

              {/* ── STEP 2: CONFIRM ONBOARDING INFORMATION (All Onboarding Answers) ── */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Website Detected Capsule (shown only when data really was fetched) */}
                  {isFetchedFromWebsite && (
                    <div className="flex items-center justify-between pb-1">
                      <WebsiteDetectedCapsule
                        label="Fetched from"
                        websiteDisplay={inviteWebsite || "https://www.eyemantra.com"}
                      />
                      <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Auto-detected
                      </span>
                    </div>
                  )}

                  {step2Error && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{step2Error}</span>
                    </div>
                  )}

                  {/* 1. Organization Details */}
                  <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Organization Details
                    </div>

                    <div>
                      <DrawerFieldLabel
                        label="Organization name"
                        required
                        tooltip="Required name of the client organization. Never falls back to the URL."
                      />
                      <input
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="e.g. Eye Mantra Clinic"
                        className="w-full h-9.5 px-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <DrawerFieldLabel label="Country" required />
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full h-9.5 px-3 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-800"
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <DrawerFieldLabel label="Industry" required />
                        <select
                          value={selectedIndustry}
                          onChange={(e) => setSelectedIndustry(e.target.value)}
                          className="w-full h-9.5 px-3 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-800"
                        >
                          {INDUSTRY_OPTIONS.map((ind) => (
                            <option key={ind} value={ind}>
                              {ind}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <DrawerFieldLabel
                        label="Primary service & category"
                        required
                        tooltip="Default clinical focus used to customize conversation workflows."
                      />
                      <select
                        value={selectedServiceCategory}
                        onChange={(e) => setSelectedServiceCategory(e.target.value)}
                        className="w-full h-9.5 px-3 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-800"
                      >
                        {(CATEGORY_SPECIALTIES[selectedIndustry] || ["General Physician"]).map((spec) => (
                          <option key={spec} value={spec}>
                            {spec}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 2. Locations & Operating Hours (Supports Adding Multiple Locations) */}
                  <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Locations & Operating Hours ({drawerLocations.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setDrawerLocations((prev) => [
                            ...prev,
                            {
                              id: `loc-${Date.now()}`,
                              name: `Location ${prev.length + 1}`,
                              address: "",
                              operatingDays: DEFAULT_DAYS,
                              opensAt: "09:00",
                              closesAt: "19:00",
                            },
                          ]);
                        }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add location</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {drawerLocations.map((loc, lIdx) => (
                        <div key={loc.id} className="p-3 bg-white border border-gray-200 rounded-xl space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-gray-700">Location #{lIdx + 1}</span>
                            {drawerLocations.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setDrawerLocations((prev) => prev.filter((x) => x.id !== loc.id))}
                                className="text-gray-400 hover:text-rose-600 p-1"
                                title="Remove location"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div>
                            <DrawerFieldLabel label="Location name" required />
                            <input
                              type="text"
                              value={loc.name}
                              onChange={(e) => {
                                const next = [...drawerLocations];
                                next[lIdx].name = e.target.value;
                                setDrawerLocations(next);
                              }}
                              placeholder="e.g. Eye Mantra Super Specialty Clinic"
                              className="w-full h-9.5 px-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900"
                            />
                          </div>

                          <div>
                            <DrawerFieldLabel label="Address / City & State" />
                            <input
                              type="text"
                              value={loc.address}
                              onChange={(e) => {
                                const next = [...drawerLocations];
                                next[lIdx].address = e.target.value;
                                setDrawerLocations(next);
                              }}
                              placeholder="e.g. A-10, Paschim Vihar, New Delhi, 110063"
                              className="w-full h-9.5 px-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900"
                            />
                          </div>

                          <div>
                            <DrawerFieldLabel
                              label="Operating Days"
                              tooltip="Defines when your AI receptionist handles daytime vs after-hours calls."
                            />
                            <div className="flex flex-wrap gap-1.5">
                              {ALL_DAYS.map((d) => {
                                const isSel = loc.operatingDays.includes(d);
                                return (
                                  <button
                                    key={d}
                                    type="button"
                                    onClick={() => {
                                      const next = [...drawerLocations];
                                      next[lIdx].operatingDays = isSel
                                        ? next[lIdx].operatingDays.filter((x) => x !== d)
                                        : [...next[lIdx].operatingDays, d];
                                      setDrawerLocations(next);
                                    }}
                                    className={`w-8 h-8 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                      isSel
                                        ? "bg-slate-900 text-white shadow-2xs"
                                        : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"
                                    }`}
                                  >
                                    {d}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <DrawerFieldLabel label="Opens At" />
                              <input
                                type="time"
                                value={loc.opensAt}
                                onChange={(e) => {
                                  const next = [...drawerLocations];
                                  next[lIdx].opensAt = e.target.value;
                                  setDrawerLocations(next);
                                }}
                                className="w-full h-9 px-3 bg-white border border-gray-200 rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <DrawerFieldLabel label="Closes At" />
                              <input
                                type="time"
                                value={loc.closesAt}
                                onChange={(e) => {
                                  const next = [...drawerLocations];
                                  next[lIdx].closesAt = e.target.value;
                                  setDrawerLocations(next);
                                }}
                                className="w-full h-9 px-3 bg-white border border-gray-200 rounded-lg text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setDrawerLocations((prev) => [
                          ...prev,
                          {
                            id: `loc-${Date.now()}`,
                            name: `Location ${prev.length + 1}`,
                            address: "",
                            operatingDays: DEFAULT_DAYS,
                            opensAt: "09:00",
                            closesAt: "19:00",
                          },
                        ]);
                      }}
                      className="w-full py-2 px-3 border border-dashed border-gray-300 hover:border-blue-400 bg-white hover:bg-blue-50/30 rounded-xl text-blue-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add location</span>
                    </button>
                  </div>

                  {/* 3. Products & Services */}
                  <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Products & Services ({servicesList.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setServicesList((prev) => [
                            ...prev,
                            {
                              id: `srv-${Date.now()}`,
                              name: `New Service ${prev.length + 1}`,
                              description: "Clinical diagnostic consultation",
                            },
                          ]);
                        }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add service</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {servicesList.map((srv, idx) => (
                        <div key={srv.id} className="p-2.5 bg-white border border-gray-200 rounded-lg space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value={srv.name}
                              onChange={(e) => {
                                const updated = [...servicesList];
                                updated[idx].name = e.target.value;
                                setServicesList(updated);
                              }}
                              placeholder="Service name *"
                              className="font-semibold text-xs text-gray-900 border-b border-transparent focus:border-blue-500 outline-none w-full"
                            />
                            {servicesList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setServicesList((prev) => prev.filter((s) => s.id !== srv.id))}
                                className="text-gray-400 hover:text-rose-600 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            value={srv.description}
                            onChange={(e) => {
                              const updated = [...servicesList];
                              updated[idx].description = e.target.value;
                              setServicesList(updated);
                            }}
                            placeholder="Description / duration"
                            className="text-[11px] text-gray-500 border-b border-transparent focus:border-blue-500 outline-none w-full"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 4. Setup (All 5 fields) */}
                  <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3.5">
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Workspace Setup
                    </div>

                    {/* Row 1: Team size & Call volume */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <DrawerFieldLabel label="Team size" />
                        <select
                          value={selectedTeamSize}
                          onChange={(e) => setSelectedTeamSize(e.target.value)}
                          className="w-full h-9 px-3 bg-white border border-gray-200 rounded-lg text-xs"
                        >
                          {["Just me (1)", "2–5", "6–10", "11–25", "25+"].map((ts) => (
                            <option key={ts} value={ts}>
                              {ts}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <DrawerFieldLabel label="Call volume" />
                        <select
                          value={selectedCallVolume}
                          onChange={(e) => setSelectedCallVolume(e.target.value)}
                          className="w-full h-9 px-3 bg-white border border-gray-200 rounded-lg text-xs"
                        >
                          {["Under 25 a day", "25–100 a day", "100–300 a day", "300+ a day", "Not sure"].map((cv) => (
                            <option key={cv} value={cv}>
                              {cv}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Row 2: International Calls & Phone Number */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <DrawerFieldLabel label="International calls" />
                        <select
                          value={selectedIntl}
                          onChange={(e) => setSelectedIntl(e.target.value as "Yes" | "No")}
                          className="w-full h-9 px-3 bg-white border border-gray-200 rounded-lg text-xs"
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>

                      <div>
                        <DrawerFieldLabel
                          label="Phone number"
                          tooltip="Choose between a dedicated virtual line or forwarding from your existing number."
                        />
                        <select
                          value={selectedPhone}
                          onChange={(e) => setSelectedPhone(e.target.value)}
                          className="w-full h-9 px-3 bg-white border border-gray-200 rounded-lg text-xs"
                        >
                          <option value="Use a number from MantraAssist">Use a number from MantraAssist</option>
                          <option value="Use my own number">Use my own number</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 5. Knowledge Base (New) */}
                  <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                          Knowledge Base ({uploadedDocs.length})
                        </span>
                        <Tooltip content="Clinical documents, pricing guides, and protocols indexed for AI responses." position="top">
                          <span className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 cursor-help inline-flex items-center">
                            <Info className="w-3.5 h-3.5" />
                          </span>
                        </Tooltip>
                      </div>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                      >
                        <FileUp className="w-3.5 h-3.5" />
                        <span>Upload document</span>
                      </button>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadedDocs((prev) => [
                            ...prev,
                            {
                              id: `doc-${Date.now()}`,
                              name: file.name,
                              sizeLabel: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
                            },
                          ]);
                          toast.success(`Uploaded ${file.name}`);
                        }
                      }}
                    />

                    <div className="space-y-2">
                      {uploadedDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-2.5 bg-white border border-gray-200 rounded-lg flex items-center justify-between gap-2.5 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                            <div className="min-w-0">
                              <span className="font-semibold text-gray-800 truncate block">
                                {doc.name}
                              </span>
                              <span className="text-[10px] text-gray-400">{doc.sizeLabel}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setUploadedDocs((prev) => prev.filter((d) => d.id !== doc.id))}
                            className="p-1 text-gray-400 hover:text-rose-600 rounded"
                            title="Remove document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 3: PLAN ASSIGNMENT (6 Categories) ── */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Category Filter Tabs (6 categories) */}
                  <div className="flex flex-wrap gap-1.5 p-1 bg-gray-100 rounded-xl">
                    {planCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setPlanCategoryTab(cat)}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                          planCategoryTab === cat
                            ? "bg-white text-gray-900 shadow-2xs font-bold"
                            : "text-gray-500 hover:text-gray-800"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Active Plans List for Category (Radio buttons) */}
                  <div className="space-y-2">
                    {(() => {
                      const plansForCat = allPlans.filter((p) => {
                        const catMatch =
                          (p.category || "").toLowerCase() === planCategoryTab.toLowerCase() ||
                          (planCategoryTab === "EHR" && (p.category === "AI EHR" || p.category === "EHR")) ||
                          (planCategoryTab === "RCM" && (p.category === "AI RCM" || p.category === "RCM"));
                        return catMatch && p.isActive !== false;
                      });
                      const displayPlans =
                        plansForCat.length > 0
                          ? plansForCat
                          : INITIAL_INDUSTRY_PLANS.filter((p) => {
                              const catMatch =
                                (p.category || "").toLowerCase() === planCategoryTab.toLowerCase() ||
                                (planCategoryTab === "EHR" && (p.category === "AI EHR" || p.category === "EHR")) ||
                                (planCategoryTab === "RCM" && (p.category === "AI RCM" || p.category === "RCM"));
                              return catMatch && p.isActive !== false;
                            });

                      if (displayPlans.length === 0) {
                        return (
                          <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            No plans configured for {planCategoryTab}.
                          </div>
                        );
                      }

                      return displayPlans.map((plan) => {
                        const isSel = selectedPlanForInvite?.id === plan.id;
                        const inrPrice =
                          plan.countryPricing?.find((cp) => cp.currency === "INR")?.monthlyPrice ??
                          plan.countryPricing?.[0]?.monthlyPrice ??
                          0;

                        return (
                          <label
                            key={plan.id}
                            onClick={() => setSelectedPlanForInvite(plan)}
                            className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                              isSel
                                ? "border-blue-500 bg-blue-50/40 ring-1 ring-blue-500/20 shadow-2xs"
                                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
                            }`}
                          >
                            {/* Standard Radio Button */}
                            <div className="pt-0.5 shrink-0">
                              <input
                                type="radio"
                                name="plan-selection-radio"
                                checked={isSel}
                                onChange={() => setSelectedPlanForInvite(plan)}
                                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                              />
                            </div>

                            {/* Plan Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-sm text-gray-900">{plan.name}</span>
                                  <span className="text-[10px] px-2 py-0.5 rounded font-semibold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                                    {plan.tier}
                                  </span>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-sm font-bold text-gray-900">
                                    {inrPrice === 0 ? "Free" : `₹${inrPrice.toLocaleString("en-IN")}`}
                                  </span>
                                  <span className="text-[11px] text-gray-400 ml-1">
                                    {inrPrice === 0 ? "Included" : "/mo"}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 text-xs text-gray-500 mt-1.5">
                                <div className="flex items-center gap-1.5">
                                  <Coins className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{(plan.monthlyCredits || 1000).toLocaleString("en-IN")} credits / mo</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Up to {plan.includedSeats || 8} seats</span>
                                </div>
                              </div>
                            </div>
                          </label>
                        );
                      });
                    })()}
                  </div>

                  {/* Selected Plan Summary under picker */}
                  {selectedPlanForInvite && (
                    <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
                      <div className="text-xs font-semibold text-blue-900">
                        Selected: {selectedPlanForInvite.name} ({selectedPlanForInvite.tier})
                      </div>
                      <div className="text-[11px] text-blue-700">
                        {(selectedPlanForInvite.monthlyCredits || 1000).toLocaleString("en-IN")} credits/mo · Up to{" "}
                        {selectedPlanForInvite.includedSeats || 8} team members · Category: {selectedPlanForInvite.category}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 4: REVIEW & SEND ── */}
              {currentStep === 4 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {sendInviteError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{sendInviteError}</span>
                    </div>
                  )}

                  <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 bg-white text-xs">
                    <div className="p-3.5 flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Organization Email</span>
                      <span className="font-semibold text-gray-900">{inviteEmail}</span>
                    </div>

                    <div className="p-3.5 flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Website</span>
                      <span className="font-semibold text-gray-900">{inviteWebsite}</span>
                    </div>

                    <div className="p-3.5 flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Organization Name</span>
                      <span className="font-semibold text-gray-900">{orgName}</span>
                    </div>

                    <div className="p-3.5 flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Industry</span>
                      <span className="font-semibold text-gray-900">{selectedServiceCategory}</span>
                    </div>

                    <div className="p-3.5 flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Locations</span>
                      <span className="font-semibold text-gray-900">
                        {drawerLocations.map((l) => l.name).filter(Boolean).join(", ") || "1 location configured"}
                      </span>
                    </div>

                    <div className="p-3.5 flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Assigned Plan</span>
                      <span className="font-bold text-slate-900">
                        {selectedPlanForInvite?.name} ({selectedPlanForInvite?.tier})
                      </span>
                    </div>

                    <div className="p-3.5 flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Plan Quotas</span>
                      <span className="font-semibold text-gray-900">
                        {(selectedPlanForInvite?.monthlyCredits || 1000).toLocaleString("en-IN")} credits/mo · Up to {selectedPlanForInvite?.includedSeats || 8} seats
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      An email will be dispatched with a secure one-click link. Onboarding will open pre-filled with this information.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-gray-200 bg-gray-50/80 flex items-center justify-between shrink-0">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
                  className="px-4 py-2 border border-gray-200 hover:bg-white text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAttemptCloseDrawer}
                  className="px-4 py-2 border border-gray-200 hover:bg-white text-gray-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
              )}

              {currentStep === 1 && (
                <button
                  type="button"
                  onClick={handleProceedStep1}
                  className="px-6 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Next: Confirm Information</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {currentStep === 2 && (
                <button
                  type="button"
                  onClick={handleProceedStep2}
                  className="px-6 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Next: Plan Assignment</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {currentStep === 3 && (
                <button
                  type="button"
                  onClick={handleProceedStep3}
                  className="px-6 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Next: Review & Send</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {currentStep === 4 && (
                <button
                  type="button"
                  disabled={isSendingInvite}
                  onClick={handleSendInvite}
                  className="px-7 py-2 bg-[#182230] hover:bg-black text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-75"
                >
                  {isSendingInvite ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sending Invite...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Invite</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          ROW ACTION: ASSIGN PLAN & UPGRADE PLAN DRAWER
          ───────────────────────────────────────────────────────────── */}
      {isPlanDrawerOpen && selectedOrgForPlan && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200 border-l border-gray-200">
            {/* Header */}
            <div className="p-5 border-b border-gray-200 shrink-0 bg-gray-50/70 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {planDrawerMode === "upgrade"
                    ? `Upgrade Plan: ${selectedOrgForPlan.name}`
                    : `Assign Plan: ${selectedOrgForPlan.name}`}
                </h2>
                <p className="text-xs text-gray-500">
                  {planDrawerMode === "upgrade"
                    ? `Select a higher tier plan in ${planDrawerCategoryTab}. Current plan: ${selectedOrgForPlan.assignedPlanName || "Starter"}`
                    : "Select an active plan to apply directly to this organization."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPlanDrawerOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* Category Filter Tabs */}
              {planDrawerMode === "assign" ? (
                <div className="flex flex-wrap gap-1.5 p-1 bg-gray-100 rounded-xl">
                  {planCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setPlanDrawerCategoryTab(cat)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        planDrawerCategoryTab === cat
                          ? "bg-white text-gray-900 shadow-2xs font-bold"
                          : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between">
                  <div className="text-xs font-semibold text-indigo-900">
                    Category: {planDrawerCategoryTab}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded">
                    Upgrade Path
                  </span>
                </div>
              )}

              {/* Plans List */}
              <div className="space-y-2.5">
                {allPlans
                  .filter((p) => {
                    const catMatch =
                      (p.category || "").toLowerCase() === planDrawerCategoryTab.toLowerCase() ||
                      (planDrawerCategoryTab === "EHR" && (p.category === "AI EHR" || p.category === "EHR")) ||
                      (planDrawerCategoryTab === "RCM" && (p.category === "AI RCM" || p.category === "RCM"));

                    if (!catMatch || p.isActive === false) return false;

                    // If in upgrade mode, show only higher tier plans than current
                    if (planDrawerMode === "upgrade" && selectedOrgForPlan) {
                      const curPlan = allPlans.find(
                        (pl) =>
                          pl.name.toLowerCase() === (selectedOrgForPlan.assignedPlanName || "").toLowerCase() ||
                          pl.id === selectedOrgForPlan.assignedPlanId
                      );
                      const curRank = TIER_ORDER[curPlan?.tier?.toLowerCase() || ""] ?? 1;
                      const planRank = TIER_ORDER[p.tier?.toLowerCase() || ""] ?? 0;
                      return planRank > curRank;
                    }

                    return true;
                  })
                  .map((plan) => {
                    const isSel = selectedPlanId === plan.id;
                    const inrPrice =
                      plan.countryPricing?.find((cp) => cp.currency === "INR")?.monthlyPrice ||
                      plan.countryPricing?.[0]?.monthlyPrice ||
                      0;

                    return (
                      <label
                        key={plan.id}
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                          isSel
                            ? "border-blue-500 bg-blue-50/40 ring-1 ring-blue-500/20 shadow-2xs"
                            : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
                        }`}
                      >
                        <div className="pt-0.5 shrink-0">
                          <input
                            type="radio"
                            name="assign-plan-selection-radio"
                            checked={isSel}
                            onChange={() => setSelectedPlanId(plan.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div>
                            <div className="font-bold text-sm flex items-center gap-2">
                              <span>{plan.name}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded font-semibold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                                {plan.tier}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-base font-bold text-gray-900">
                              {inrPrice === 0 ? "Free" : `₹${inrPrice.toLocaleString("en-IN")}`}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              {inrPrice === 0 ? "Included" : "per month"}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-1.5">
                            <Coins className="w-3.5 h-3.5 text-slate-400" />
                            <span>{(plan.monthlyCredits || 1000).toLocaleString("en-IN")} credits / mo</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>Up to {plan.includedSeats || 8} seats</span>
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                  })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50/80 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setIsPlanDrawerOpen(false)}
                className="px-4 py-2 border border-gray-200 hover:bg-white text-gray-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyPlan}
                className="px-6 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>{planDrawerMode === "upgrade" ? "Apply Upgrade" : "Save Plan"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CONFIRMATION MODAL (Remove Plan, Suspend, Delete)
          ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, type: "remove_plan", org: null })}
        title={
          confirmModal.type === "remove_plan"
            ? "Remove Plan Confirmation"
            : confirmModal.type === "suspend"
            ? "Suspend Organization"
            : confirmModal.type === "unsuspend"
            ? "Reactivate Organization"
            : "Delete Organization"
        }
      >
        <div className="space-y-4 pt-1">
          {confirmModal.type === "remove_plan" && (
            <p className="text-sm text-gray-600">
              Are you sure you want to remove the assigned plan from{" "}
              <strong className="text-gray-900">{confirmModal.org?.name}</strong>? The organization will return to its Free plan immediately.
            </p>
          )}

          {confirmModal.type === "suspend" && (
            <p className="text-sm text-gray-600">
              Are you sure you want to suspend{" "}
              <strong className="text-gray-900">{confirmModal.org?.name}</strong>? Suspended organizations cannot log in or access any workspace services until reactivated.
            </p>
          )}

          {confirmModal.type === "unsuspend" && (
            <p className="text-sm text-gray-600">
              Reactivate <strong className="text-gray-900">{confirmModal.org?.name}</strong>? Its users will immediately regain access to their workspace.
            </p>
          )}

          {confirmModal.type === "delete" && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete{" "}
                <strong className="text-gray-900">{confirmModal.org?.name}</strong>?
              </p>
              <p className="text-xs text-rose-600 font-medium">
                This action is irreversible. The organization and all its assigned workspace subscriptions will be removed from the table.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setConfirmModal({ isOpen: false, type: "remove_plan", org: null })}
              className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmAction}
              className={`px-4 py-2 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                confirmModal.type === "unsuspend"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {confirmModal.type === "remove_plan"
                ? "Remove Plan"
                : confirmModal.type === "suspend"
                ? "Suspend"
                : confirmModal.type === "unsuspend"
                ? "Reactivate"
                : "Delete Organization"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Discard Changes Prompt for Drawer */}
      <Modal
        isOpen={showDiscardPrompt}
        onClose={() => setShowDiscardPrompt(false)}
        title="Discard Unsaved Changes?"
      >
        <div className="space-y-3 pt-1">
          <p className="text-sm text-gray-600">
            You have entered information in the Add Organization drawer. Closing now will discard all entered details.
          </p>
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowDiscardPrompt(false)}
              className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Keep Editing
            </button>
            <button
              type="button"
              onClick={() => {
                setShowDiscardPrompt(false);
                setIsAddDrawerOpen(false);
                resetDrawerState();
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              Discard Changes
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
