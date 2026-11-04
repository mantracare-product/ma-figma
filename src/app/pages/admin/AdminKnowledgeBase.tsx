/**
 * AdminKnowledgeBase.tsx
 * Path: src/app/pages/admin/AdminKnowledgeBase.tsx
 *
 * Dedicated Admin Console for Master Knowledge Base Templates & Sources.
 * Allows administrators to manage system-wide knowledge documents, FAQ Q&A libraries,
 * and web reference guides, scoped dynamically to tenant industries and workflows.
 */

import React, { useState, useMemo, useRef } from "react";
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Copy,
  FileText,
  Link as LinkIcon,
  Type,
  Check,
  X,
  Upload,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import PageHeader from "../../components/layout/PageHeader";
import PageTopBar from "../../components/layout/PageTopBar";
import TableComponent, { TableColumn, TableRowAction } from "../../components/ui/TableComponent";
import DrawerShell from "../../components/ui/DrawerShell";
import { AdminControlAccordion } from "./components/AdminControlAccordion";
import type { ScopingRule } from "../../context/FieldRegistryContext";
import {
  INITIAL_CATEGORIES,
  INITIAL_INDUSTRIES,
  STANDARD_LOCATIONS,
  getIndustriesForCategory,
} from "../../../data/industryReferenceData";

export type KnowledgeType = "faq" | "document" | "url" | "text";

export interface KnowledgeScopeSelection {
  processId: string;
  stageIds: string[]; // empty = all stages in this process
}

export interface AdminKnowledgeItem {
  id: string;
  title: string;
  type: KnowledgeType;
  content: string; // Answer, markdown content, or description
  url?: string;
  fileName?: string;
  fileSizeLabel?: string;
  tags: string[];
  allProcesses?: boolean;
  scopes?: KnowledgeScopeSelection[];
  isActive: boolean;
  isSystemRecord?: boolean;
  createdAt: string;
  updatedAt: string;
  // Admin Scoping
  industryCategory?: string;
  industry?: string;
  scopingRules?: ScopingRule[];
}

export interface IndustryWorkflowDef {
  id: string;
  name: string;
  category: string;
  stages: Array<{ id: string; name: string }>;
}

// Comprehensive Workflow Templates Mapped by Industry Category
export const INDUSTRY_WORKFLOW_TEMPLATES: IndustryWorkflowDef[] = [
  // Healthcare
  {
    id: "wf-hc-1",
    name: "Patient Intake",
    category: "Healthcare",
    stages: [
      { id: "st-hc-1-1", name: "Initial Contact" },
      { id: "st-hc-1-2", name: "Insurance Verify" },
      { id: "st-hc-1-3", name: "Schedule Appointment" },
    ],
  },
  {
    id: "wf-hc-2",
    name: "Follow-up Calls",
    category: "Healthcare",
    stages: [
      { id: "st-hc-2-1", name: "Post-Visit Check" },
      { id: "st-hc-2-2", name: "Medication Reminder" },
    ],
  },
  {
    id: "wf-hc-3",
    name: "Emergency Triage",
    category: "Healthcare",
    stages: [
      { id: "st-hc-3-1", name: "Symptom Assessment" },
      { id: "st-hc-3-2", name: "Physician Routing" },
    ],
  },
  {
    id: "wf-hc-4",
    name: "Clinical Billing & Claims",
    category: "Healthcare",
    stages: [
      { id: "st-hc-4-1", name: "Superbill Draft" },
      { id: "st-hc-4-2", name: "Insurance Claim Filed" },
      { id: "st-hc-4-3", name: "Patient Co-Pay" },
    ],
  },

  // Automobile
  {
    id: "wf-auto-1",
    name: "Vehicle Intake & Inspection",
    category: "Automobile",
    stages: [
      { id: "st-auto-1-1", name: "Customer Arrival" },
      { id: "st-auto-1-2", name: "Multi-Point Check" },
      { id: "st-auto-1-3", name: "Diagnostic Scan" },
    ],
  },
  {
    id: "wf-auto-2",
    name: "Repair Progress & Authorization",
    category: "Automobile",
    stages: [
      { id: "st-auto-2-1", name: "Estimate Sent" },
      { id: "st-auto-2-2", name: "Owner Approved" },
      { id: "st-auto-2-3", name: "Work in Progress" },
    ],
  },
  {
    id: "wf-auto-3",
    name: "Vehicle Delivery & Checkout",
    category: "Automobile",
    stages: [
      { id: "st-auto-3-1", name: "Quality Inspection" },
      { id: "st-auto-3-2", name: "Payment Settlement" },
      { id: "st-auto-3-3", name: "Key Handover" },
    ],
  },

  // Real Estate
  {
    id: "wf-re-1",
    name: "Buyer Intake & Pre-Approval",
    category: "Real Estate",
    stages: [
      { id: "st-re-1-1", name: "Initial Inquiry" },
      { id: "st-re-1-2", name: "Budget Verification" },
      { id: "st-re-1-3", name: "Property Tour Scheduled" },
    ],
  },
  {
    id: "wf-re-2",
    name: "Escrow & Contract Lifecycle",
    category: "Real Estate",
    stages: [
      { id: "st-re-2-1", name: "Offer Submitted" },
      { id: "st-re-2-2", name: "Inspection Contingency" },
      { id: "st-re-2-3", name: "Closing Complete" },
    ],
  },

  // IT / Tech
  {
    id: "wf-it-1",
    name: "Technical Support Intake",
    category: "IT/Tech",
    stages: [
      { id: "st-it-1-1", name: "Ticket Created" },
      { id: "st-it-1-2", name: "Tier 2 Triage" },
      { id: "st-it-1-3", name: "Deployment & Resolution" },
    ],
  },
  {
    id: "wf-it-2",
    name: "Cloud Migration Discovery",
    category: "IT/Tech",
    stages: [
      { id: "st-it-2-1", name: "Architecture Assessment" },
      { id: "st-it-2-2", name: "Cost Estimation" },
      { id: "st-it-2-3", name: "Migration Kickoff" },
    ],
  },

  // Coaching & Advisory
  {
    id: "wf-ca-1",
    name: "Executive Mentorship Enrollment",
    category: "Coaching & Advisory",
    stages: [
      { id: "st-ca-1-1", name: "Discovery Call" },
      { id: "st-ca-1-2", name: "Curriculum Scoping" },
      { id: "st-ca-1-3", name: "Retainer Active" },
    ],
  },

  // Household Care
  {
    id: "wf-hh-1",
    name: "Home Service Booking & Dispatch",
    category: "Household Care",
    stages: [
      { id: "st-hh-1-1", name: "Quote Request" },
      { id: "st-hh-1-2", name: "Technician Dispatch" },
      { id: "st-hh-1-3", name: "Job Complete" },
    ],
  },

  // Wellness & Lifestyle
  {
    id: "wf-wl-1",
    name: "Client Intake & Consultation",
    category: "Wellness & Lifestyle",
    stages: [
      { id: "st-wl-1-1", name: "Wellness Assessment" },
      { id: "st-wl-1-2", name: "Session Scheduling" },
      { id: "st-wl-1-3", name: "Follow-up" },
    ],
  },
];

const PRESET_TAGS = [
  "HIPAA",
  "Compliance",
  "Intake",
  "Consent",
  "Insurance",
  "Billing",
  "Emergency",
  "Triage",
  "Warranty",
  "OEM Parts",
  "EV",
  "SLA",
  "Policy",
  "FAQ",
  "Onboarding",
  "Support",
];

const STORAGE_KEY = "ma_admin_knowledge_store_v2";

// Rich initial seed across industries
const INITIAL_ADMIN_KNOWLEDGE: AdminKnowledgeItem[] = [
  // Healthcare
  {
    id: "ak-1",
    title: "Patient Intake & HIPAA Privacy Practice Disclosure",
    type: "document",
    industryCategory: "Healthcare",
    industry: "General Physician",
    content: "Comprehensive patient health information rights, emergency contact authorization, electronic health records (EHR) privacy protections, and consent terms.",
    fileName: "HIPAA_Privacy_Practices_2025.pdf",
    fileSizeLabel: "1.4 MB",
    tags: ["HIPAA", "Compliance", "Intake", "Consent"],
    allProcesses: false,
    scopes: [{ processId: "wf-hc-1", stageIds: ["st-hc-1-1", "st-hc-1-2"] }],
    scopingRules: [
      {
        id: "sr-1",
        industryCategory: "Healthcare",
        industries: ["General Physician"],
        locations: [],
      },
    ],
    isActive: true,
    isSystemRecord: true,
    createdAt: "2025-01-10T10:00:00.000Z",
    updatedAt: "2025-02-15T12:00:00.000Z",
  },
  {
    id: "ak-2",
    title: "What commercial and public insurance plans are in-network?",
    type: "faq",
    industryCategory: "Healthcare",
    industry: "Hospital & Clinics",
    content: "We accept Blue Cross Blue Shield, Aetna, Cigna, UnitedHealthcare, Medicare Part B, and most PPO plans. Medicaid is accepted for pediatric and maternal services. HMO plans require an advance primary care physician (PCP) referral.",
    tags: ["Insurance", "Billing", "Eligibility"],
    allProcesses: false,
    scopes: [{ processId: "wf-hc-1", stageIds: ["st-hc-1-2"] }, { processId: "wf-hc-4", stageIds: [] }],
    scopingRules: [
      {
        id: "sr-2",
        industryCategory: "Healthcare",
        industries: ["General Physician", "Dentist"],
        locations: [],
      },
    ],
    isActive: true,
    isSystemRecord: true,
    createdAt: "2025-01-12T11:30:00.000Z",
    updatedAt: "2025-02-20T09:45:00.000Z",
  },
  {
    id: "ak-3",
    title: "Clinical Emergency Triage & Escalation Protocol",
    type: "text",
    industryCategory: "Healthcare",
    industry: "Cardiologist",
    content: "If a patient reports acute chest pain radiating to the jaw/arm, severe shortness of breath, sudden numbness, or anaphylaxis, the AI agent must immediately interrupt automated booking and route the call to 911 / the emergency on-call physician triage queue.",
    tags: ["Emergency", "Triage", "Safety"],
    allProcesses: false,
    scopes: [{ processId: "wf-hc-3", stageIds: [] }],
    scopingRules: [
      {
        id: "sr-3",
        industryCategory: "Healthcare",
        industries: ["Cardiologist"],
        locations: [],
      },
    ],
    isActive: true,
    isSystemRecord: true,
    createdAt: "2025-01-15T14:20:00.000Z",
    updatedAt: "2025-03-01T16:10:00.000Z",
  },
  {
    id: "ak-4",
    title: "Dental Emergency & Same-Day Appointment Guidelines",
    type: "faq",
    industryCategory: "Healthcare",
    industry: "Dentist",
    content: "Same-day emergency appointments are reserved for severe toothaches, facial swelling, broken restorations, or avulsed permanent teeth. Patients should keep dislodged teeth in milk or saline and arrive within 60 minutes for highest re-implantation viability.",
    tags: ["Emergency", "Dental", "FAQ"],
    allProcesses: false,
    scopes: [{ processId: "wf-hc-1", stageIds: ["st-hc-1-3"] }],
    scopingRules: [
      {
        id: "sr-4",
        industryCategory: "Healthcare",
        industries: ["Dentist"],
        locations: [],
      },
    ],
    isActive: true,
    isSystemRecord: true,
    createdAt: "2025-01-18T08:00:00.000Z",
    updatedAt: "2025-02-10T14:30:00.000Z",
  },

  // Automobile
  {
    id: "ak-5",
    title: "Standard Dealership Warranty & 24-Month Parts Guarantee",
    type: "document",
    industryCategory: "Automobile",
    industry: "Auto Dealership & Service",
    content: "All OEM replacement components and labor performed by certified master technicians are backed by a 24-month / 24,000-mile nationwide warranty. Wear-and-tear items (wiper blades, brake pads) carry standard 6-month limited defect coverage.",
    fileName: "Warranty_Guidelines_2025.pdf",
    fileSizeLabel: "820 KB",
    tags: ["Warranty", "OEM Parts", "Guarantee"],
    allProcesses: false,
    scopes: [{ processId: "wf-auto-2", stageIds: ["st-auto-2-1", "st-auto-2-2"] }],
    scopingRules: [
      {
        id: "sr-5",
        industryCategory: "Automobile",
        industries: ["Auto Dealership & Service"],
        locations: [],
      },
    ],
    isActive: true,
    isSystemRecord: true,
    createdAt: "2025-02-01T09:15:00.000Z",
    updatedAt: "2025-02-28T11:20:00.000Z",
  },
  {
    id: "ak-6",
    title: "Live EV Charging Network & Diagnostic Portal",
    type: "url",
    industryCategory: "Automobile",
    industry: "Electric Vehicle (EV) Specialization",
    content: "Public live status endpoint for fast DC charging availability, mobile service dispatch zones, and telemetry error code lookup.",
    url: "https://network.ev-diagnostic-portal.io/status",
    tags: ["EV", "Charging", "Diagnostics"],
    allProcesses: false,
    scopes: [{ processId: "wf-auto-1", stageIds: [] }],
    scopingRules: [
      {
        id: "sr-6",
        industryCategory: "Automobile",
        industries: ["Electric Vehicle (EV) Specialization"],
        locations: [],
      },
    ],
    isActive: true,
    isSystemRecord: true,
    createdAt: "2025-02-05T13:40:00.000Z",
    updatedAt: "2025-03-02T15:00:00.000Z",
  },

  // IT / Tech
  {
    id: "ak-7",
    title: "Service Level Agreement (SLA) & Incident Severity Escalation",
    type: "document",
    industryCategory: "IT/Tech",
    industry: "Cloud Migration Consultation",
    content: "Defines P1 (Critical Outage: 15m initial response, 4h workaround target), P2 (Major Impact: 1h response), P3 (Minor: 4h response), and P4 (Informational) response obligations across business hours.",
    fileName: "SLA_Incident_Escalation_Matrix.pdf",
    fileSizeLabel: "2.1 MB",
    tags: ["SLA", "Incident", "P1 Severity"],
    allProcesses: false,
    scopes: [{ processId: "wf-it-1", stageIds: [] }],
    scopingRules: [
      {
        id: "sr-7",
        industryCategory: "IT/Tech",
        industries: ["Cloud Migration Consultation"],
        locations: [],
      },
    ],
    isActive: true,
    isSystemRecord: true,
    createdAt: "2025-02-12T16:00:00.000Z",
    updatedAt: "2025-03-04T10:30:00.000Z",
  },
  {
    id: "ak-8",
    title: "What security compliance frameworks does the cloud tenant meet?",
    type: "faq",
    industryCategory: "IT/Tech",
    industry: "Chatbot/Voice Agent Development",
    content: "Our cloud environment is certified SOC 2 Type II, ISO 27001, and HIPAA compliant. All tenant data at rest is encrypted via AES-256 with customer-managed AWS KMS keys, and data in transit is enforced under TLS 1.3.",
    tags: ["Security", "SOC2", "Compliance"],
    allProcesses: true,
    scopes: [],
    scopingRules: [
      {
        id: "sr-8",
        industryCategory: "IT/Tech",
        industries: ["Chatbot/Voice Agent Development"],
        locations: [],
      },
    ],
    isActive: true,
    isSystemRecord: true,
    createdAt: "2025-02-15T11:00:00.000Z",
    updatedAt: "2025-03-05T14:15:00.000Z",
  },
];

function getStoredAdminKnowledge(): AdminKnowledgeItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ADMIN_KNOWLEDGE));
      return INITIAL_ADMIN_KNOWLEDGE;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_ADMIN_KNOWLEDGE;
  } catch {
    return INITIAL_ADMIN_KNOWLEDGE;
  }
}

function saveStoredAdminKnowledge(items: AdminKnowledgeItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error("Failed to save admin knowledge:", err);
  }
}

function isKnowledgeMatchingScope(
  item: AdminKnowledgeItem,
  scope: { category: string; industry: string }
): boolean {
  if (scope.category === "All" && scope.industry === "All") return true;

  if (item.scopingRules && item.scopingRules.length > 0) {
    return item.scopingRules.some((rule) => {
      const ruleCat = rule.industryCategory?.trim() || "All";
      const ruleInds = rule.industries || [];

      if (scope.category !== "All" && ruleCat !== "All" && ruleCat !== scope.category) {
        return false;
      }

      if (scope.industry !== "All") {
        if (ruleInds.length > 0 && !ruleInds.includes("All") && !ruleInds.includes(scope.industry)) {
          return false;
        }
      }

      return true;
    });
  }

  // Fallback to legacy fields
  if (scope.category !== "All" && item.industryCategory && item.industryCategory !== scope.category) {
    return false;
  }
  if (scope.industry !== "All" && item.industry && item.industry !== scope.industry) {
    return false;
  }

  return true;
}

// Scoping summary matching other admin tables
function getScopingSummary(
  scopingRules?: ScopingRule[],
  fallbackCategory?: string,
  fallbackIndustry?: string
): string {
  const rules = scopingRules || [];
  if (rules.length === 0) {
    if (fallbackCategory && fallbackCategory !== "Global / Cross-Domain" && fallbackCategory !== "All") {
      return "1 industry, All countries";
    }
    return "All industries, All countries";
  }

  const categories = new Set<string>();
  const industries = new Set<string>();
  const locations = new Set<string>();

  for (const r of rules) {
    if (r.industryCategory && r.industryCategory !== "All") {
      categories.add(r.industryCategory);
    }
    if (r.industries && r.industries.length > 0) {
      for (const ind of r.industries) {
        if (ind && ind !== "All") industries.add(ind);
      }
    }
    if (r.locations && r.locations.length > 0) {
      for (const loc of r.locations) {
        if (loc && loc !== "All") locations.add(loc);
      }
    }
  }

  const isAllCats = categories.size === 0;
  const isAllInds = industries.size === 0;
  const isAllLocs = locations.size === 0;

  let indCount = industries.size;
  if (isAllInds) {
    if (!isAllCats) {
      let total = 0;
      for (const cat of categories) {
        total += getIndustriesForCategory(cat).length;
      }
      indCount = total > 0 ? total : INITIAL_INDUSTRIES.length;
    } else {
      indCount = INITIAL_INDUSTRIES.length;
    }
  }

  let locCount = locations.size;
  if (isAllLocs) {
    locCount = STANDARD_LOCATIONS.length;
  }

  if (isAllCats && isAllInds && isAllLocs) {
    return "All industries, All countries";
  }

  return `${indCount} ${indCount === 1 ? "industry" : "industries"}, ${locCount} ${locCount === 1 ? "country" : "countries"}`;
}

// Type badge: URL, File, Text (matching client MA)
function renderTypeBadge(type: KnowledgeType) {
  const label = type === "document" ? "File" : type === "url" ? "URL" : "Text";
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium">
      {label}
    </span>
  );
}

// Renders the workflows and stages where this knowledge item is applicable
function renderWorkflowsBadge(
  item: AdminKnowledgeItem,
  workflowsList: IndustryWorkflowDef[]
) {
  if (item.allProcesses || !item.scopes || item.scopes.length === 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold">
        All Workflows
      </span>
    );
  }

  const badges: string[] = [];
  item.scopes.forEach((sc) => {
    const wf = workflowsList.find((w) => w.id === sc.processId);
    if (!wf) return;
    if (!sc.stageIds || sc.stageIds.length === 0) {
      badges.push(wf.name);
    } else {
      sc.stageIds.forEach((stId) => {
        const stage = wf.stages.find((s) => s.id === stId);
        if (stage) {
          badges.push(`${wf.name}: ${stage.name}`);
        }
      });
    }
  });

  if (badges.length === 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-medium">
        No workflows linked
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1 max-w-xs items-center">
      {badges.slice(0, 2).map((label, idx) => (
        <span
          key={idx}
          className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-medium truncate max-w-[180px]"
          title={label}
        >
          {label}
        </span>
      ))}
      {badges.length > 2 && (
        <span
          className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-medium"
          title={badges.slice(2).join(", ")}
        >
          +{badges.length - 2} more
        </span>
      )}
    </div>
  );
}

export default function AdminKnowledgeBase() {
  const [items, setItems] = useState<AdminKnowledgeItem[]>(() => getStoredAdminKnowledge());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");
  const [selectedIndustryFilter, setSelectedIndustryFilter] = useState("All");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"add" | "edit">("add");
  const [editingItem, setEditingItem] = useState<AdminKnowledgeItem | null>(null);

  // Form State matching client MA
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState<KnowledgeType>("document");
  const [formContent, setFormContent] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formFileName, setFormFileName] = useState("");
  const [formFileSizeLabel, setFormFileSizeLabel] = useState("");
  const [formTags, setFormTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [processDropdownOpen, setProcessDropdownOpen] = useState(false);
  const [formAllProcesses, setFormAllProcesses] = useState(true);
  const [formScopes, setFormScopes] = useState<KnowledgeScopeSelection[]>([]);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formScopingRules, setFormScopingRules] = useState<ScopingRule[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update storage
  const updateKnowledgeList = (newList: AdminKnowledgeItem[]) => {
    setItems(newList);
    saveStoredAdminKnowledge(newList);
  };

  // Industries available for filter based on selectedCategoryFilter
  const availableIndustriesForFilter = useMemo(() => {
    if (selectedCategoryFilter === "All") {
      return Array.from(new Set(INITIAL_INDUSTRIES.map((i) => i.name)));
    }
    return getIndustriesForCategory(selectedCategoryFilter);
  }, [selectedCategoryFilter]);

  // Derived effective category for scoping workflows in the drawer
  const drawerEffectiveCategory = useMemo(() => {
    if (formScopingRules.length > 0 && formScopingRules[0]?.industryCategory) {
      const c = formScopingRules[0].industryCategory;
      if (c !== "All") return c;
    }
    if (selectedCategoryFilter !== "All") return selectedCategoryFilter;
    return "Healthcare";
  }, [formScopingRules, selectedCategoryFilter]);

  // Available workflows based on admin scope
  const availableWorkflows = useMemo(() => {
    if (drawerEffectiveCategory === "All") {
      return INDUSTRY_WORKFLOW_TEMPLATES;
    }
    const filtered = INDUSTRY_WORKFLOW_TEMPLATES.filter(
      (w) => w.category.toLowerCase() === drawerEffectiveCategory.toLowerCase()
    );
    return filtered.length > 0 ? filtered : INDUSTRY_WORKFLOW_TEMPLATES;
  }, [drawerEffectiveCategory]);

  // Filtered preset tags not already selected
  const filteredPresets = useMemo(() => {
    return PRESET_TAGS.filter(
      (pt) =>
        !formTags.includes(pt) &&
        pt.toLowerCase().includes(tagInput.toLowerCase().trim())
    );
  }, [formTags, tagInput]);

  // Filtered items list
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Admin Scope filter
      const matchesScope = isKnowledgeMatchingScope(item, {
        category: selectedCategoryFilter,
        industry: selectedIndustryFilter,
      });
      if (!matchesScope) return false;

      // 2. Type filter
      if (selectedTypeFilter !== "all") {
        if (selectedTypeFilter === "file" && item.type !== "document") return false;
        if (selectedTypeFilter === "text" && item.type !== "text" && item.type !== "faq") return false;
        if (selectedTypeFilter === "url" && item.type !== "url") return false;
        if (selectedTypeFilter !== "file" && selectedTypeFilter !== "text" && selectedTypeFilter !== "url" && item.type !== selectedTypeFilter) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchContent = item.content.toLowerCase().includes(q);
        const matchTags = item.tags.some((t) => t.toLowerCase().includes(q));
        const matchFile = (item.fileName || "").toLowerCase().includes(q);
        if (!matchTitle && !matchContent && !matchTags && !matchFile) return false;
      }

      return true;
    });
  }, [items, selectedCategoryFilter, selectedIndustryFilter, selectedTypeFilter, searchQuery]);

  // Open drawer handlers
  const handleOpenDrawer = (mode: "add" | "edit", item?: AdminKnowledgeItem) => {
    setDrawerMode(mode);
    setTagDropdownOpen(false);
    setProcessDropdownOpen(false);
    setTagInput("");

    if (mode === "edit" && item) {
      setEditingItem(item);
      setFormTitle(item.title);
      setFormType(item.type);
      setFormContent(item.content);
      setFormUrl(item.url || "");
      setFormFileName(item.fileName || "");
      setFormFileSizeLabel(item.fileSizeLabel || "");
      setFormTags([...item.tags]);
      setFormAllProcesses(item.allProcesses ?? true);
      setFormScopes(item.scopes ? JSON.parse(JSON.stringify(item.scopes)) : []);
      setFormIsActive(item.isActive ?? true);
      setFormScopingRules(
        item.scopingRules && item.scopingRules.length > 0
          ? [...item.scopingRules]
          : [
              {
                id: `sr-${Date.now()}`,
                industryCategory: item.industryCategory || INITIAL_CATEGORIES[0]?.name || "Healthcare",
                industries: item.industry ? [item.industry] : [],
                locations: [],
              },
            ]
      );
    } else {
      setEditingItem(null);
      setFormTitle("");
      setFormType("document");
      setFormContent("");
      setFormUrl("");
      setFormFileName("");
      setFormFileSizeLabel("");
      setFormTags(["Compliance", "FAQ"]);
      setFormAllProcesses(true);
      setFormScopes([]);
      setFormIsActive(true);

      const defaultCat =
        selectedCategoryFilter !== "All"
          ? selectedCategoryFilter
          : INITIAL_CATEGORIES[0]?.name || "Healthcare";
      const defaultInds =
        selectedIndustryFilter !== "All" ? [selectedIndustryFilter] : [];
      setFormScopingRules([
        {
          id: `sr-${Date.now()}`,
          industryCategory: defaultCat,
          industries: defaultInds,
          locations: [],
        },
      ]);
    }
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditingItem(null);
  };

  const handleToggleWorkflow = (wfId: string) => {
    setFormAllProcesses(false);
    const exists = formScopes.some((s) => s.processId === wfId);
    if (exists) {
      setFormScopes(formScopes.filter((s) => s.processId !== wfId));
    } else {
      setFormScopes([...formScopes, { processId: wfId, stageIds: [] }]);
    }
  };

  const handleToggleStage = (wfId: string, stageId: string) => {
    setFormAllProcesses(false);
    const scopeItem = formScopes.find((s) => s.processId === wfId);
    if (!scopeItem) {
      setFormScopes([...formScopes, { processId: wfId, stageIds: [stageId] }]);
    } else {
      const stageExists = scopeItem.stageIds.includes(stageId);
      const newStageIds = stageExists
        ? scopeItem.stageIds.filter((s) => s !== stageId)
        : [...scopeItem.stageIds, stageId];

      setFormScopes(
        formScopes.map((s) =>
          s.processId === wfId ? { ...s, stageIds: newStageIds } : s
        )
      );
    }
  };

  const handleSaveKnowledge = () => {
    const trimmedTitle = formTitle.trim();
    if (!trimmedTitle) {
      toast.error("Knowledge Name is required.");
      return;
    }

    const firstRule = formScopingRules[0];
    const derivedCat = firstRule?.industryCategory || "Healthcare";
    const derivedInd = firstRule?.industries?.[0] || "General Physician";
    const nowIso = new Date().toISOString();

    if (drawerMode === "edit" && editingItem) {
      const updated: AdminKnowledgeItem = {
        ...editingItem,
        title: trimmedTitle,
        type: formType,
        content: formContent.trim(),
        url: formType === "url" ? formUrl.trim() : undefined,
        fileName: formType === "document" ? formFileName || "document.pdf" : undefined,
        fileSizeLabel: formType === "document" ? formFileSizeLabel || "1.2 MB" : undefined,
        tags: formTags,
        allProcesses: formAllProcesses,
        scopes: formAllProcesses ? [] : formScopes,
        isActive: formIsActive,
        industryCategory: derivedCat,
        industry: derivedInd,
        scopingRules: formScopingRules,
        updatedAt: nowIso,
      };

      const newList = items.map((i) => (i.id === editingItem.id ? updated : i));
      updateKnowledgeList(newList);
      toast.success(`Knowledge item "${trimmedTitle}" updated successfully!`);
    } else {
      const newItem: AdminKnowledgeItem = {
        id: `ak-${Date.now()}`,
        title: trimmedTitle,
        type: formType,
        content: formContent.trim(),
        url: formType === "url" ? formUrl.trim() : undefined,
        fileName: formType === "document" ? formFileName || "new_document.pdf" : undefined,
        fileSizeLabel: formType === "document" ? formFileSizeLabel || "1.0 MB" : undefined,
        tags: formTags,
        allProcesses: formAllProcesses,
        scopes: formAllProcesses ? [] : formScopes,
        isActive: formIsActive,
        isSystemRecord: false,
        createdAt: nowIso,
        updatedAt: nowIso,
        industryCategory: derivedCat,
        industry: derivedInd,
        scopingRules: formScopingRules,
      };

      updateKnowledgeList([newItem, ...items]);
      toast.success(`Knowledge item "${trimmedTitle}" created successfully!`);
    }

    handleCloseDrawer();
  };

  const handleDuplicate = (item: AdminKnowledgeItem) => {
    const copy: AdminKnowledgeItem = {
      ...item,
      id: `ak-${Date.now()}`,
      title: `${item.title} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSystemRecord: false,
    };
    updateKnowledgeList([copy, ...items]);
    toast.success(`Duplicated "${item.title}"`);
  };

  const handleDelete = (item: AdminKnowledgeItem) => {
    const remaining = items.filter((i) => i.id !== item.id);
    updateKnowledgeList(remaining);
    toast.success(`Deleted "${item.title}"`);
  };

  // Table Columns (no icons in name, no subtext, plain admin scope matching other tables)
  const columns: TableColumn<AdminKnowledgeItem>[] = [
    {
      id: "title",
      header: "NAME / QUESTION",
      align: "left",
      render: (item) => (
        <span
          onClick={() => handleOpenDrawer("edit", item)}
          className="text-xs font-semibold text-gray-900 hover:text-blue-600 hover:underline cursor-pointer block truncate max-w-sm"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {item.title}
        </span>
      ),
    },
    {
      id: "type",
      header: "TYPE",
      align: "left",
      render: (item) => renderTypeBadge(item.type),
    },
    {
      id: "workflows",
      header: "APPLICABLE WORKFLOWS",
      align: "left",
      render: (item) => renderWorkflowsBadge(item, INDUSTRY_WORKFLOW_TEMPLATES),
    },
    {
      id: "adminScope",
      header: "ADMIN SCOPE",
      align: "left",
      render: (item) => (
        <span className="text-xs text-gray-600 font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
          {getScopingSummary(item.scopingRules, item.industryCategory, item.industry)}
        </span>
      ),
    },
    {
      id: "tags",
      header: "TAGS",
      align: "left",
      render: (item) => (
        <div className="flex flex-wrap gap-1 max-w-[200px] items-center">
          {item.tags.slice(0, 2).map((t) => (
            <span
              key={t}
              className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium whitespace-nowrap"
            >
              {t}
            </span>
          ))}
          {item.tags.length > 2 && (
            <span
              className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-medium"
              title={item.tags.slice(2).join(", ")}
            >
              +{item.tags.length - 2}
            </span>
          )}
          {item.tags.length === 0 && <span className="text-gray-400 text-xs">—</span>}
        </div>
      ),
    },
    {
      id: "status",
      header: "STATUS",
      align: "center",
      render: (item) => (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
            item.isActive
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-gray-100 text-gray-600 border border-gray-200"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              item.isActive ? "bg-emerald-500" : "bg-gray-400"
            }`}
          />
          {item.isActive ? "Active" : "Draft"}
        </span>
      ),
    },
    {
      id: "createdAt",
      header: "CREATED",
      align: "left",
      render: (item) => (
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {new Date(item.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      ),
    },
  ];

  // Row Actions
  const rowActions: TableRowAction<AdminKnowledgeItem>[] = [
    {
      label: "Edit Item",
      icon: <Edit2 className="w-3.5 h-3.5" />,
      onClick: (item) => handleOpenDrawer("edit", item),
    },
    {
      label: "Duplicate",
      icon: <Copy className="w-3.5 h-3.5" />,
      onClick: (item) => handleDuplicate(item),
    },
    {
      label: "Delete",
      icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />,
      isDanger: true,
      onClick: (item) => handleDelete(item),
    },
  ];

  // Drawer Footer matching client MA
  const drawerFooter = (
    <div className="flex items-center justify-end w-full gap-2.5">
      <button
        type="button"
        onClick={handleCloseDrawer}
        className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleSaveKnowledge}
        className="flex items-center gap-1.5 px-4 py-2 bg-[#1F2937] hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-xs"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        {drawerMode === "edit" ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        <span>{drawerMode === "edit" ? "Save Changes" : "Create Knowledge Base"}</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="px-10 sm:px-12 py-7.5 sm:py-8 w-full space-y-7">
        {/* PageHeader with NO actions (keeps global header clean) */}
        <PageHeader
          title="Knowledge Base Templates"
          subtitle="Manage system-wide knowledge documents, FAQ Q&A libraries, and reference guidelines provisioned to AI agents."
        />

        {/* Action Bar powered by PageTopBar with Industry Category & Industry Dropdowns */}
        <PageTopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search knowledge templates by title, question, or tag..."
          leftElement={
            <div className="flex items-center gap-2 flex-wrap">
              {/* Industry Category Dropdown */}
              <select
                value={selectedCategoryFilter}
                onChange={(e) => {
                  setSelectedCategoryFilter(e.target.value);
                  setSelectedIndustryFilter("All");
                }}
                className="h-[36px] px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none cursor-pointer shadow-2xs hover:border-gray-300 transition-colors"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <option value="All">All Categories</option>
                {INITIAL_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>

              {/* Industry Dropdown */}
              <select
                value={selectedIndustryFilter}
                onChange={(e) => setSelectedIndustryFilter(e.target.value)}
                className="h-[36px] px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none cursor-pointer shadow-2xs hover:border-gray-300 transition-colors"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <option value="All">All Industries</option>
                {availableIndustriesForFilter.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>

              {/* Type Filter */}
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="h-[36px] px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none cursor-pointer shadow-2xs hover:border-gray-300 transition-colors"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <option value="all">All Types</option>
                <option value="file">File</option>
                <option value="text">Text</option>
                <option value="url">URL</option>
              </select>
            </div>
          }
          onClearAllFilters={() => {
            setSelectedCategoryFilter("All");
            setSelectedIndustryFilter("All");
            setSelectedTypeFilter("all");
            setSearchQuery("");
          }}
          primaryAction={{
            label: "Add Knowledge Item",
            icon: <Plus className="w-3.5 h-3.5" />,
            onClick: () => handleOpenDrawer("add"),
          }}
        />

        {/* Knowledge Table View using TableComponent */}
        <TableComponent
          data={filteredItems}
          columns={columns}
          getRowId={(item) => item.id}
          rowActions={rowActions}
          onRowClick={(item) => handleOpenDrawer("edit", item)}
          defaultRowsPerPage={10}
          emptyMessage="No knowledge templates found matching active filters. Click 'Add Knowledge Item' to create one."
          tableId="admin-knowledge-base-table"
        />
      </div>

      {/* Side Drawer identical in structure to Client MA KnowledgeBase Drawer + Admin Scope */}
      <DrawerShell
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title={drawerMode === "edit" ? "Edit Knowledge Base" : "Create Knowledge Base"}
        subtitle="Add reference material for your AI agent to use in conversations."
        icon={<BookOpen className="w-4 h-4 text-blue-600" />}
        width="max-w-xl"
        zIndex={600}
        bodyClassName="p-5 sm:p-6 space-y-5 bg-white"
        footer={drawerFooter}
      >
        <div className="space-y-5 pb-6">
          {/* 1. Name */}
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}
            >
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Insurance Policy FAQs"
              className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
          </div>

          {/* 2. Tags / Categories Combo Dropdown */}
          <div className="relative">
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}
            >
              Tags / Categories
            </label>
            <div className="relative">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => {
                  setTagInput(e.target.value);
                  setTagDropdownOpen(true);
                }}
                onFocus={() => setTagDropdownOpen(true)}
                placeholder="Select tags or type custom..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const trimmed = tagInput.trim();
                    if (trimmed && !formTags.includes(trimmed)) {
                      setFormTags([...formTags, trimmed]);
                      setTagInput("");
                    }
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                style={{ fontFamily: "Outfit, sans-serif" }}
              />
              {tagDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setTagDropdownOpen(false)} />
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg z-45 max-h-[220px] overflow-y-auto p-1.5 space-y-0.5">
                    {filteredPresets.map((pt) => (
                      <button
                        type="button"
                        key={pt}
                        onClick={() => {
                          setFormTags([...formTags, pt]);
                          setTagInput("");
                          setTagDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-blue-50 text-gray-700 transition-colors cursor-pointer"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {pt}
                      </button>
                    ))}
                    {tagInput.trim() && !formTags.includes(tagInput.trim()) && !filteredPresets.includes(tagInput.trim()) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormTags([...formTags, tagInput.trim()]);
                          setTagInput("");
                          setTagDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-blue-50 text-blue-600 font-semibold transition-colors cursor-pointer"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        Add "{tagInput.trim()}"
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Selected Chips */}
            {formTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {formTags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => setFormTags(formTags.filter((tag) => tag !== t))}
                      className="hover:text-blue-900 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs mt-1.5 text-slate-400" style={{ fontFamily: "Outfit, sans-serif" }}>
              Select presets from the dropdown or type a custom tag and press Enter.
            </p>
          </div>

          {/* 3. Applicable Processes Dropdown */}
          <div className="relative">
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}
            >
              Applicable Processes <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setProcessDropdownOpen((prev) => !prev)}
              className="w-full h-10 px-3 flex items-center justify-between bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-left cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <span className={formAllProcesses || formScopes.length > 0 ? "text-gray-700" : "text-gray-400"}>
                {formAllProcesses
                  ? "All Processes"
                  : formScopes.length > 0
                  ? `${formScopes.length} process(es) configured`
                  : "Select processes…"}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            {processDropdownOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setProcessDropdownOpen(false)} />
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg z-45 p-4 max-h-[350px] overflow-y-auto space-y-3">
                  <p className="text-xs text-slate-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Select the processes and stages for <strong className="text-blue-700">{drawerEffectiveCategory}</strong> where this knowledge base will be available.
                  </p>

                  <label className="flex items-center gap-2 cursor-pointer select-none pb-2 border-b border-gray-100">
                    <input
                      type="checkbox"
                      checked={formAllProcesses}
                      onChange={(e) => {
                        setFormAllProcesses(e.target.checked);
                        if (e.target.checked) setFormScopes([]);
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-semibold text-gray-800">
                      All Processes
                    </span>
                  </label>

                  {!formAllProcesses && (
                    <div className="space-y-2 pt-1">
                      {availableWorkflows.map((wf) => {
                        const scopeEntry = formScopes.find((s) => s.processId === wf.id);
                        const isWfChecked = Boolean(scopeEntry);

                        return (
                          <div key={wf.id} className="border border-gray-100 rounded-xl p-2.5 bg-gray-50/50 space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isWfChecked}
                                onChange={() => handleToggleWorkflow(wf.id)}
                                className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-xs font-bold text-gray-800">{wf.name}</span>
                            </label>

                            {isWfChecked && (
                              <div className="pl-5 pt-1 space-y-1 border-l-2 border-blue-200 ml-1.5">
                                <div className="flex flex-wrap gap-1.5">
                                  {wf.stages.map((stage) => {
                                    const isStageChecked =
                                      scopeEntry?.stageIds?.includes(stage.id) ?? false;
                                    return (
                                      <label
                                        key={stage.id}
                                        className="inline-flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer bg-white px-2 py-1 rounded-md border border-gray-200"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isStageChecked}
                                          onChange={() => handleToggleStage(wf.id, stage.id)}
                                          className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-[11px] font-medium">{stage.name}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex justify-end pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setProcessDropdownOpen(false)}
                      className="px-3 py-1.5 bg-[#1F2937] text-white text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Selected scope chips */}
            {(formAllProcesses || formScopes.length > 0) && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {formAllProcesses ? (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    All Processes
                    <button
                      type="button"
                      onClick={() => setFormAllProcesses(false)}
                      className="hover:text-blue-900 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ) : (
                  formScopes.map((sc) => {
                    const wf = availableWorkflows.find((w) => w.id === sc.processId);
                    if (!wf) return null;
                    return (
                      <span
                        key={sc.processId}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {wf.name} {sc.stageIds.length > 0 ? `(${sc.stageIds.length} stages)` : ""}
                        <button
                          type="button"
                          onClick={() => setFormScopes(formScopes.filter((s) => s.processId !== sc.processId))}
                          className="hover:text-blue-900 transition-colors cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* 4. Content Type (3 large buttons matching Client MA: Text, File, URL) */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}
            >
              Content Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Text */}
              <button
                type="button"
                onClick={() => setFormType("text")}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all w-full h-11 justify-center cursor-pointer ${
                  formType === "text" || formType === "faq"
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-blue-300"
                }`}
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                <div
                  className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: formType === "text" || formType === "faq" ? "#2563EB" : "#94A3B8" }}
                >
                  <Type className="w-3.5 h-3.5 text-white" />
                </div>
                Text
              </button>

              {/* File */}
              <button
                type="button"
                onClick={() => setFormType("document")}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all w-full h-11 justify-center cursor-pointer ${
                  formType === "document"
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-blue-300"
                }`}
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                <div
                  className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: formType === "document" ? "#2563EB" : "#94A3B8" }}
                >
                  <FileText className="w-3.5 h-3.5 text-white" />
                </div>
                File
              </button>

              {/* URL */}
              <button
                type="button"
                onClick={() => setFormType("url")}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all w-full h-11 justify-center cursor-pointer ${
                  formType === "url"
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-blue-300"
                }`}
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                <div
                  className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: formType === "url" ? "#2563EB" : "#94A3B8" }}
                >
                  <LinkIcon className="w-3.5 h-3.5 text-white" />
                </div>
                URL
              </button>
            </div>

            {/* In case of text */}
            {(formType === "text" || formType === "faq") && (
              <div className="mt-3 space-y-1">
                <label className="block text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                  In case of text
                </label>
                <textarea
                  rows={4}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Paste or type the reference text here…"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl resize-none text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
              </div>
            )}

            {/* In case of File */}
            {formType === "document" && (
              <div className="mt-3 space-y-2">
                <label className="block text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                  In case of File — Drag and drop file etc
                </label>
                {formFileName ? (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-white shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-600 text-white">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                          {formFileName}
                        </p>
                        <p className="text-xs text-gray-400">{formFileSizeLabel || "PDF document"}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormFileName("");
                        setFormFileSizeLabel("");
                      }}
                      className="p-1.5 rounded hover:bg-rose-50 text-rose-500 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setFormFileName(file.name);
                          setFormFileSizeLabel(`${(file.size / 1024 / 1024).toFixed(1)} MB`);
                          if (!formTitle) setFormTitle(file.name.replace(/\.[^/.]+$/, ""));
                          toast.success(`Attached "${file.name}"`);
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="border-2 border-dashed border-blue-200 rounded-xl bg-blue-50/50 p-6 text-center cursor-pointer hover:bg-blue-50 transition-colors">
                      <Upload className="w-6 h-6 text-blue-500 mx-auto mb-1.5" />
                      <p className="text-xs font-semibold text-gray-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Click or drag files here to upload
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">PDF, DOCX, TXT, or CSV (Max 25 MB)</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* In case of URL */}
            {formType === "url" && (
              <div className="mt-3 space-y-1">
                <label className="block text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                  In case of URL
                </label>
                <input
                  type="url"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://example.com/knowledge-doc"
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
              </div>
            )}
          </div>

          {/* 5. Admin Control (Admin Scope component) */}
          <div className="pt-2 border-t border-gray-100 space-y-2">
            <AdminControlAccordion
              scopingRules={formScopingRules}
              onScopingRulesChange={(newRules) => setFormScopingRules(newRules)}
              defaultAdminControlOpen={true}
              defaultScopeOpen={true}
              defaultPermissionsOpen={false}
              scopeTooltip="Define which tenant organization categories, industries, and locations have visibility to this knowledge base item."
            />
          </div>

          {/* 6. Publish Active Switch */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                Publish as Active Knowledge Template
              </p>
              <p className="text-[11px] text-gray-500">
                Active templates are provisioned to AI agents across client workspaces.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>
      </DrawerShell>
    </div>
  );
}
