/**
 * AdminProductsServices.tsx
 * Path: src/app/pages/admin/AdminProductsServices.tsx
 *
 * Dedicated Admin Console for Products & Services Catalog Configuration.
 * Allows administrators to configure master service offerings, clinical billing codes,
 * pricing parameters, and tenant scoping rules.
 */

import React, { useState, useMemo } from "react";
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Clock,
  Briefcase,
  Check,
  X,
  Layers,
  GripVertical,
  Shield,
  Percent,
} from "lucide-react";
import { toast } from "sonner";
import PageHeader from "../../components/layout/PageHeader";
import PageTopBar from "../../components/layout/PageTopBar";
import TableComponent, { TableColumn, TableRowAction } from "../../components/ui/TableComponent";
import DrawerShell from "../../components/ui/DrawerShell";
import CPTCodeInput from "../../components/ui/CPTCodeInput";
import { AdminControlAccordion } from "./components/AdminControlAccordion";
import type { ScopingRule } from "../../context/FieldRegistryContext";
import {
  INITIAL_CATEGORIES,
  INITIAL_INDUSTRIES,
  STANDARD_LOCATIONS,
  getIndustriesForCategory,
} from "../../../data/industryReferenceData";
import { CURRENCIES, getCurrencySymbol } from "../../../lib/servicesStore";

export interface AdminServiceItem {
  id: string;
  name: string;
  description: string;
  category: string; // Service category (e.g. Consultation, Dental, Diagnostics, General)
  cptCode?: string;
  duration: number; // in minutes
  slotDuration?: number;
  price: number;
  currency: string;
  tax?: number;
  isActive: boolean;
  isPrepaid?: boolean;
  prepaidDepositType?: "full" | "deposit";
  prepaidDepositAmount?: number;
  isSystemRecord?: boolean;
  createdAt: string;
  // Admin Scoping & Rules
  industryCategory?: string;
  industry?: string;
  scopingRules?: ScopingRule[];
}

const STORAGE_KEY = "ma_admin_services_store_v2";

const SERVICE_CATEGORY_PRESETS = [
  "General",
  "Consultation",
  "Dental",
  "Diagnostics",
  "Treatment",
  "Surgical",
  "Preventive Care",
  "Therapy",
  "Specialist Evaluation",
  "Maintenance & Inspection",
  "Advisory",
  "Technical Service",
];

// Seed Catalog with Admin Scoping Rules
const INITIAL_ADMIN_SERVICES: AdminServiceItem[] = [
  // Healthcare
  {
    id: "as-1",
    name: "Comprehensive Initial Consultation",
    description: "Full clinical intake evaluation, health history review, and initial diagnostic assessment.",
    category: "Consultation",
    industryCategory: "Healthcare",
    industry: "General Physician",
    scopingRules: [
      {
        id: "sr-1",
        industryCategory: "Healthcare",
        industries: ["General Physician"],
        locations: [],
      },
    ],
    cptCode: "99204",
    duration: 45,
    slotDuration: 45,
    price: 150,
    currency: "USD",
    tax: 0,
    isActive: true,
    isPrepaid: false,
    isSystemRecord: true,
    createdAt: "2025-01-10T08:00:00.000Z",
  },
  {
    id: "as-2",
    name: "Cardiovascular Stress Test & ECG",
    description: "Treadmill stress monitoring with 12-lead continuous rhythm recording and interpretation.",
    category: "Diagnostics",
    industryCategory: "Healthcare",
    industry: "Cardiologist",
    scopingRules: [
      {
        id: "sr-2",
        industryCategory: "Healthcare",
        industries: ["Cardiologist"],
        locations: [],
      },
    ],
    cptCode: "93015",
    duration: 60,
    slotDuration: 60,
    price: 320,
    currency: "USD",
    tax: 0,
    isActive: true,
    isPrepaid: true,
    prepaidDepositType: "deposit",
    prepaidDepositAmount: 50,
    isSystemRecord: true,
    createdAt: "2025-01-12T10:30:00.000Z",
  },
  {
    id: "as-3",
    name: "Comprehensive Dental Prophylaxis",
    description: "Ultrasonic scaling, plaque debridement, enamel polishing, and periodontal probing.",
    category: "Dental",
    industryCategory: "Healthcare",
    industry: "Dentist",
    scopingRules: [
      {
        id: "sr-3",
        industryCategory: "Healthcare",
        industries: ["Dentist"],
        locations: [],
      },
    ],
    cptCode: "D1110",
    duration: 50,
    slotDuration: 60,
    price: 135,
    currency: "USD",
    tax: 0,
    isActive: true,
    isPrepaid: false,
    isSystemRecord: true,
    createdAt: "2025-01-15T11:00:00.000Z",
  },
  {
    id: "as-4",
    name: "Dermatological Full-Body Screening",
    description: "Dermoscopy examination of pigmented lesions, mole mapping, and biopsy consultation.",
    category: "Diagnostics",
    industryCategory: "Healthcare",
    industry: "Dermatologist",
    scopingRules: [
      {
        id: "sr-4",
        industryCategory: "Healthcare",
        industries: ["Dermatologist"],
        locations: [],
      },
    ],
    cptCode: "99214",
    duration: 30,
    slotDuration: 30,
    price: 180,
    currency: "USD",
    tax: 0,
    isActive: true,
    isPrepaid: false,
    isSystemRecord: true,
    createdAt: "2025-01-20T09:15:00.000Z",
  },
  {
    id: "as-5",
    name: "Clinical Mental Health Therapy Session",
    description: "60-minute individual cognitive-behavioral counseling and therapeutic intervention.",
    category: "Therapy",
    industryCategory: "Healthcare",
    industry: "Therapist",
    scopingRules: [
      {
        id: "sr-5",
        industryCategory: "Healthcare",
        industries: ["Therapist"],
        locations: [],
      },
    ],
    cptCode: "90837",
    duration: 60,
    slotDuration: 60,
    price: 160,
    currency: "USD",
    tax: 0,
    isActive: true,
    isPrepaid: true,
    prepaidDepositType: "full",
    isSystemRecord: true,
    createdAt: "2025-02-01T14:00:00.000Z",
  },

  // Automobile
  {
    id: "as-6",
    name: "Comprehensive Vehicle Multi-Point Inspection",
    description: "60-point electronic scan, brake lining measurement, tire depth inspection, and fluid analysis.",
    category: "Maintenance & Inspection",
    industryCategory: "Automobile",
    industry: "Auto Dealership & Service",
    scopingRules: [
      {
        id: "sr-6",
        industryCategory: "Automobile",
        industries: ["Auto Dealership & Service"],
        locations: [],
      },
    ],
    duration: 45,
    slotDuration: 45,
    price: 89,
    currency: "USD",
    tax: 5,
    isActive: true,
    isPrepaid: false,
    isSystemRecord: true,
    createdAt: "2025-02-10T10:00:00.000Z",
  },
  {
    id: "as-7",
    name: "EV High-Voltage Battery Diagnostic & Health Check",
    description: "Cell balance check, degradation analytics, thermal system test, and inverter diagnostics.",
    category: "Diagnostics",
    industryCategory: "Automobile",
    industry: "Electric Vehicle (EV) Specialization",
    scopingRules: [
      {
        id: "sr-7",
        industryCategory: "Automobile",
        industries: ["Electric Vehicle (EV) Specialization"],
        locations: [],
      },
    ],
    duration: 75,
    slotDuration: 90,
    price: 220,
    currency: "USD",
    tax: 5,
    isActive: true,
    isPrepaid: true,
    prepaidDepositType: "deposit",
    prepaidDepositAmount: 75,
    isSystemRecord: true,
    createdAt: "2025-02-15T13:20:00.000Z",
  },

  // Coaching & Advisory
  {
    id: "as-8",
    name: "Executive Leadership Strategy Intensive",
    description: "One-on-one executive mentorship covering quarterly OKRs, organizational design, and stakeholder alignment.",
    category: "Advisory",
    industryCategory: "Coaching & Advisory",
    industry: "Executive Leadership Mentorship",
    scopingRules: [
      {
        id: "sr-8",
        industryCategory: "Coaching & Advisory",
        industries: ["Executive Leadership Mentorship"],
        locations: [],
      },
    ],
    duration: 90,
    slotDuration: 90,
    price: 450,
    currency: "USD",
    tax: 0,
    isActive: true,
    isPrepaid: true,
    prepaidDepositType: "full",
    isSystemRecord: true,
    createdAt: "2025-02-18T16:00:00.000Z",
  },

  // Household Care
  {
    id: "as-9",
    name: "HVAC Seasonal Efficiency Tune-Up & Safety Check",
    description: "Refrigerant pressure verification, coil cleaning, heat exchanger inspection, and thermostat calibration.",
    category: "Maintenance & Inspection",
    industryCategory: "Household Care",
    industry: "HVAC & Air Conditioning Repair",
    scopingRules: [
      {
        id: "sr-9",
        industryCategory: "Household Care",
        industries: ["HVAC & Air Conditioning Repair"],
        locations: [],
      },
    ],
    duration: 60,
    slotDuration: 60,
    price: 140,
    currency: "USD",
    tax: 0,
    isActive: true,
    isPrepaid: false,
    isSystemRecord: true,
    createdAt: "2025-02-22T08:30:00.000Z",
  },
  {
    id: "as-10",
    name: "Emergency Plumbing Leak Diagnostics & Camera Inspection",
    description: "Acoustic line leak detection and video line inspection with diagnostic report.",
    category: "Diagnostics",
    industryCategory: "Household Care",
    industry: "Plumbing & Water Systems",
    scopingRules: [
      {
        id: "sr-10",
        industryCategory: "Household Care",
        industries: ["Plumbing & Water Systems"],
        locations: [],
      },
    ],
    duration: 60,
    slotDuration: 60,
    price: 195,
    currency: "USD",
    tax: 0,
    isActive: true,
    isPrepaid: false,
    isSystemRecord: true,
    createdAt: "2025-02-25T11:45:00.000Z",
  },

  // IT / Tech
  {
    id: "as-11",
    name: "Cloud Infrastructure & Security Posture Audit",
    description: "AWS/GCP architectural benchmark, IAM vulnerability evaluation, and cost optimization report.",
    category: "Technical Service",
    industryCategory: "IT/Tech",
    industry: "Cloud Migration Consultation",
    scopingRules: [
      {
        id: "sr-11",
        industryCategory: "IT/Tech",
        industries: ["Cloud Migration Consultation"],
        locations: [],
      },
    ],
    duration: 120,
    slotDuration: 120,
    price: 600,
    currency: "USD",
    tax: 0,
    isActive: true,
    isPrepaid: true,
    prepaidDepositType: "deposit",
    prepaidDepositAmount: 200,
    isSystemRecord: true,
    createdAt: "2025-03-01T15:10:00.000Z",
  },
  {
    id: "as-12",
    name: "Conversational AI & Voice Agent Feasibility Scoping",
    description: "Technical discovery for LLM workflow integration, telephony bridging, and latency analysis.",
    category: "Technical Service",
    industryCategory: "IT/Tech",
    industry: "Chatbot/Voice Agent Development",
    scopingRules: [
      {
        id: "sr-12",
        industryCategory: "IT/Tech",
        industries: ["Chatbot/Voice Agent Development"],
        locations: [],
      },
    ],
    duration: 60,
    slotDuration: 60,
    price: 250,
    currency: "USD",
    tax: 0,
    isActive: true,
    isPrepaid: false,
    isSystemRecord: true,
    createdAt: "2025-03-05T09:00:00.000Z",
  },

  // Real Estate
  {
    id: "as-13",
    name: "Commercial Property Valuation & Lease Analysis",
    description: "In-depth tenant lease review, cash-flow cap rate modeling, and competitive market valuation.",
    category: "Advisory",
    industryCategory: "Real Estate",
    industry: "Commercial Property Leasing",
    scopingRules: [
      {
        id: "sr-13",
        industryCategory: "Real Estate",
        industries: ["Commercial Property Leasing"],
        locations: [],
      },
    ],
    duration: 90,
    slotDuration: 90,
    price: 350,
    currency: "USD",
    tax: 0,
    isActive: true,
    isPrepaid: false,
    isSystemRecord: true,
    createdAt: "2025-03-10T12:00:00.000Z",
  },

  // Wellness & Lifestyle
  {
    id: "as-14",
    name: "Comprehensive Nutrition & Metabolic Assessment",
    description: "Bioimpedance body scan, micronutrient dietary analysis, and customized 4-week meal blueprint.",
    category: "Consultation",
    industryCategory: "Wellness & Lifestyle",
    industry: "Holistic Nutrition & Dietetics",
    scopingRules: [
      {
        id: "sr-14",
        industryCategory: "Wellness & Lifestyle",
        industries: ["Holistic Nutrition & Dietetics"],
        locations: [],
      },
    ],
    duration: 60,
    slotDuration: 60,
    price: 175,
    currency: "USD",
    tax: 0,
    isActive: true,
    isPrepaid: true,
    prepaidDepositType: "deposit",
    prepaidDepositAmount: 50,
    isSystemRecord: true,
    createdAt: "2025-03-14T10:15:00.000Z",
  },
];

function getStoredAdminServices(): AdminServiceItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ADMIN_SERVICES));
      return INITIAL_ADMIN_SERVICES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_ADMIN_SERVICES;
  } catch {
    return INITIAL_ADMIN_SERVICES;
  }
}

function saveStoredAdminServices(services: AdminServiceItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(services));
  } catch (err) {
    console.error("Failed to save admin services:", err);
  }
}

function isServiceMatchingScope(
  service: AdminServiceItem,
  scope: { category: string; industry: string }
): boolean {
  if (scope.category === "All" && scope.industry === "All") return true;

  if (service.scopingRules && service.scopingRules.length > 0) {
    return service.scopingRules.some((rule) => {
      const ruleCat = rule.industryCategory?.trim() || "All";
      const ruleInds = rule.industries || [];

      // Category check
      if (scope.category !== "All" && ruleCat !== "All" && ruleCat !== scope.category) {
        return false;
      }

      // Industry check
      if (scope.industry !== "All") {
        if (ruleInds.length > 0 && !ruleInds.includes("All") && !ruleInds.includes(scope.industry)) {
          return false;
        }
      }

      return true;
    });
  }

  // Fallback to legacy fields
  if (scope.category !== "All" && service.industryCategory && service.industryCategory !== scope.category) {
    return false;
  }
  if (scope.industry !== "All" && service.industry && service.industry !== scope.industry) {
    return false;
  }

  return true;
}

function getScopingSummary(scopingRules?: ScopingRule[], fallbackCategory?: string, fallbackIndustry?: string): string {
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

export default function AdminProductsServices() {
  const [services, setServices] = useState<AdminServiceItem[]>(() => getStoredAdminServices());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");
  const [selectedIndustryFilter, setSelectedIndustryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">("All");

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"add" | "edit">("add");
  const [editingItem, setEditingItem] = useState<AdminServiceItem | null>(null);

  // Drawer Form State
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("General");
  const [formCptCode, setFormCptCode] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState<number>(0);
  const [formCurrency, setFormCurrency] = useState("USD");
  const [formTax, setFormTax] = useState<number>(0);
  const [formDuration, setFormDuration] = useState<number>(45);
  const [formSlotDuration, setFormSlotDuration] = useState<number>(45);
  const [formIsPrepaid, setFormIsPrepaid] = useState(false);
  const [formPrepaidDepositType, setFormPrepaidDepositType] = useState<"full" | "deposit">("full");
  const [formPrepaidDepositAmount, setFormPrepaidDepositAmount] = useState<number>(0);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formScopingRules, setFormScopingRules] = useState<ScopingRule[]>([]);

  // Update localStorage helper
  const updateServicesList = (newList: AdminServiceItem[]) => {
    setServices(newList);
    saveStoredAdminServices(newList);
  };

  // Industries available for filter based on selectedCategoryFilter
  const availableIndustriesForFilter = useMemo(() => {
    if (selectedCategoryFilter === "All") {
      return Array.from(new Set(INITIAL_INDUSTRIES.map((i) => i.name)));
    }
    return getIndustriesForCategory(selectedCategoryFilter);
  }, [selectedCategoryFilter]);

  // Filtered Services
  const filteredServices = useMemo(() => {
    return services.filter((svc) => {
      // 1. Scope filter
      const matchesScope = isServiceMatchingScope(svc, {
        category: selectedCategoryFilter,
        industry: selectedIndustryFilter,
      });
      if (!matchesScope) return false;

      // 2. Status filter
      if (statusFilter === "Active" && !svc.isActive) return false;
      if (statusFilter === "Inactive" && svc.isActive) return false;

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = svc.name.toLowerCase().includes(q);
        const matchDesc = (svc.description || "").toLowerCase().includes(q);
        const matchCpt = (svc.cptCode || "").toLowerCase().includes(q);
        const matchCat = (svc.category || "").toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchCpt && !matchCat) return false;
      }

      return true;
    });
  }, [services, selectedCategoryFilter, selectedIndustryFilter, statusFilter, searchQuery]);

  // Drawer open handlers
  const handleOpenDrawer = (mode: "add" | "edit", item?: AdminServiceItem) => {
    setDrawerMode(mode);
    if (mode === "edit" && item) {
      setEditingItem(item);
      setFormName(item.name);
      setFormCategory(item.category || "General");
      setFormCptCode(item.cptCode || "");
      setFormDescription(item.description || "");
      setFormPrice(item.price || 0);
      setFormCurrency(item.currency || "USD");
      setFormTax(item.tax || 0);
      setFormDuration(item.duration || 45);
      setFormSlotDuration(item.slotDuration || item.duration || 45);
      setFormIsPrepaid(Boolean(item.isPrepaid));
      setFormPrepaidDepositType(item.prepaidDepositType || "full");
      setFormPrepaidDepositAmount(item.prepaidDepositAmount || 0);
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
      setFormName("");
      setFormCategory("General");
      setFormCptCode("");
      setFormDescription("");
      setFormPrice(100);
      setFormCurrency("USD");
      setFormTax(0);
      setFormDuration(45);
      setFormSlotDuration(45);
      setFormIsPrepaid(false);
      setFormPrepaidDepositType("full");
      setFormPrepaidDepositAmount(0);
      setFormIsActive(true);
      // Pre-fill scoping rules from active filter if chosen
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

  const handleSaveService = () => {
    const trimmedName = formName.trim();
    if (!trimmedName) {
      toast.error("Service Name is required.");
      return;
    }

    const firstRule = formScopingRules[0];
    const derivedCategory = firstRule?.industryCategory || "Healthcare";
    const derivedIndustry = firstRule?.industries?.[0] || "General Physician";

    if (drawerMode === "edit" && editingItem) {
      const updated: AdminServiceItem = {
        ...editingItem,
        name: trimmedName,
        category: formCategory,
        cptCode: formCptCode.trim() || undefined,
        description: formDescription.trim(),
        price: Number(formPrice) || 0,
        currency: formCurrency,
        tax: Number(formTax) || 0,
        duration: Number(formDuration) || 45,
        slotDuration: Number(formSlotDuration) || Number(formDuration) || 45,
        isPrepaid: formIsPrepaid,
        prepaidDepositType: formIsPrepaid ? formPrepaidDepositType : undefined,
        prepaidDepositAmount:
          formIsPrepaid && formPrepaidDepositType === "deposit"
            ? Number(formPrepaidDepositAmount) || 0
            : undefined,
        isActive: formIsActive,
        industryCategory: derivedCategory,
        industry: derivedIndustry,
        scopingRules: formScopingRules,
      };

      const newList = services.map((s) => (s.id === editingItem.id ? updated : s));
      updateServicesList(newList);
      toast.success(`Service "${trimmedName}" updated successfully!`);
    } else {
      const newItem: AdminServiceItem = {
        id: `as-${Date.now()}`,
        name: trimmedName,
        category: formCategory,
        cptCode: formCptCode.trim() || undefined,
        description: formDescription.trim(),
        price: Number(formPrice) || 0,
        currency: formCurrency,
        tax: Number(formTax) || 0,
        duration: Number(formDuration) || 45,
        slotDuration: Number(formSlotDuration) || Number(formDuration) || 45,
        isPrepaid: formIsPrepaid,
        prepaidDepositType: formIsPrepaid ? formPrepaidDepositType : undefined,
        prepaidDepositAmount:
          formIsPrepaid && formPrepaidDepositType === "deposit"
            ? Number(formPrepaidDepositAmount) || 0
            : undefined,
        isActive: formIsActive,
        isSystemRecord: false,
        createdAt: new Date().toISOString(),
        industryCategory: derivedCategory,
        industry: derivedIndustry,
        scopingRules: formScopingRules,
      };

      updateServicesList([newItem, ...services]);
      toast.success(`Service "${trimmedName}" created successfully!`);
    }

    handleCloseDrawer();
  };

  const handleDuplicate = (item: AdminServiceItem) => {
    const copy: AdminServiceItem = {
      ...item,
      id: `as-${Date.now()}`,
      name: `${item.name} (Copy)`,
      createdAt: new Date().toISOString(),
      isSystemRecord: false,
    };
    updateServicesList([copy, ...services]);
    toast.success(`Duplicated "${item.name}"`);
  };

  const handleDelete = (item: AdminServiceItem) => {
    const remaining = services.filter((s) => s.id !== item.id);
    updateServicesList(remaining);
    toast.success(`Deleted "${item.name}"`);
  };

  // Table Columns
  const columns: TableColumn<AdminServiceItem>[] = [
    {
      id: "name",
      header: "PRODUCT / SERVICE",
      align: "left",
      render: (svc) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            onClick={() => handleOpenDrawer("edit", svc)}
            className="text-xs font-semibold text-gray-900 hover:text-blue-600 hover:underline cursor-pointer"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {svc.name}
          </span>
          {svc.cptCode && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold shrink-0">
              CPT {svc.cptCode}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "category",
      header: "CATEGORY",
      align: "left",
      render: (svc) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs font-medium">
          {svc.category || "General"}
        </span>
      ),
    },
    {
      id: "duration",
      header: "DURATION",
      align: "left",
      render: (svc) => (
        <span className="text-xs text-gray-600 font-medium">
          {svc.duration} min
        </span>
      ),
    },
    {
      id: "price",
      header: "PRICE",
      align: "left",
      render: (svc) => (
        <span className="text-xs font-bold text-gray-900">
          {getCurrencySymbol(svc.currency || "USD")}
          {Number(svc.price).toFixed(2)}
        </span>
      ),
    },
    {
      id: "tax",
      header: "TAX",
      align: "left",
      render: (svc) => (
        <span className="text-xs text-gray-600 font-medium">
          {Number(svc.tax || 0)}%
        </span>
      ),
    },
    {
      id: "adminScope",
      header: "ADMIN SCOPE",
      align: "left",
      render: (svc) => (
        <span className="text-xs text-gray-600 font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
          {getScopingSummary(svc.scopingRules, svc.industryCategory, svc.industry)}
        </span>
      ),
    },
    {
      id: "status",
      header: "STATUS",
      align: "center",
      render: (svc) => (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
            svc.isActive
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-gray-100 text-gray-600 border border-gray-200"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              svc.isActive ? "bg-emerald-500" : "bg-gray-400"
            }`}
          />
          {svc.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
  ];

  // Row Actions
  const rowActions: TableRowAction<AdminServiceItem>[] = [
    {
      label: "Edit Service",
      icon: <Edit2 className="w-3.5 h-3.5" />,
      onClick: (svc) => handleOpenDrawer("edit", svc),
    },
    {
      label: "Duplicate",
      icon: <Copy className="w-3.5 h-3.5" />,
      onClick: (svc) => handleDuplicate(svc),
    },
    {
      label: "Delete",
      icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />,
      isDanger: true,
      onClick: (svc) => handleDelete(svc),
    },
  ];

  // Drawer tabs matching client MA
  const drawerTabs = (
    <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
      <button
        type="button"
        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 inline-flex items-center gap-1.5 shadow-2xs"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        <Layers className="w-3.5 h-3.5 text-blue-600" />
        Overview
      </button>
    </div>
  );

  // Drawer Footer matching client MA (without availability checkbox)
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
        onClick={handleSaveService}
        className="flex items-center gap-1.5 px-4 py-2 bg-[#1F2937] hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-xs"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        {drawerMode === "edit" ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        <span>{drawerMode === "edit" ? "Save Changes" : "Add Product"}</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="px-10 sm:px-12 py-7.5 sm:py-8 w-full space-y-7">
        {/* PageHeader with NO actions (keeps global header clean) */}
        <PageHeader
          title="Product / Services Catalog"
          subtitle="Configure master service offerings, clinical billing codes, and tenant scoping rules."
        />

        {/* Action Bar powered by PageTopBar with Industry Category & Industry Dropdowns */}
        <PageTopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search services by name, CPT code, category..."
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

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-[36px] px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none cursor-pointer shadow-2xs hover:border-gray-300 transition-colors"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active Only</option>
                <option value="Inactive">Inactive Only</option>
              </select>
            </div>
          }
          onClearAllFilters={() => {
            setSelectedCategoryFilter("All");
            setSelectedIndustryFilter("All");
            setStatusFilter("All");
            setSearchQuery("");
          }}
          primaryAction={{
            label: "Add Service",
            icon: <Plus className="w-3.5 h-3.5" />,
            onClick: () => handleOpenDrawer("add"),
          }}
        />

        {/* Services Table View using TableComponent */}
        <TableComponent
          data={filteredServices}
          columns={columns}
          getRowId={(svc) => svc.id}
          rowActions={rowActions}
          onRowClick={(svc) => handleOpenDrawer("edit", svc)}
          defaultRowsPerPage={10}
          emptyMessage="No services found matching active filters. Click 'Add Service' to create one."
          tableId="admin-products-services-table"
        />
      </div>

      {/* Product / Service Drawer (mirrors Client MA Drawer without client-specific availability) */}
      <DrawerShell
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title={drawerMode === "edit" ? "Product Details" : "Add New Product"}
        subtitle={
          drawerMode === "edit"
            ? editingItem?.name || "Edit service offering"
            : "Define a product or service offering for your team"
        }
        icon={<Briefcase className="w-4 h-4 text-blue-600" />}
        width="max-w-xl"
        zIndex={600}
        tabs={drawerTabs}
        bodyClassName="p-5 sm:p-6 space-y-5 bg-[#fafafa]"
        footer={drawerFooter}
      >
        <div className="space-y-4">
          {/* Card 1: SERVICE DETAILS */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                <span
                  className="text-xs font-bold text-gray-800 uppercase tracking-wider"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  SERVICE DETAILS
                </span>
              </div>
            </div>

            {/* Service Name */}
            <div className="space-y-1">
              <label
                className="block text-[11px] font-semibold text-gray-700"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                SERVICE NAME <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Initial Consultation"
                className="w-full px-3.5 py-2 bg-gray-50/80 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-medium text-gray-800 transition-colors outline-none shadow-2xs"
                style={{ fontFamily: "Outfit, sans-serif" }}
              />
            </div>

            {/* Category Dropdown */}
            <div className="space-y-1">
              <label
                className="block text-[11px] font-semibold text-gray-700"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                CATEGORY
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-50/80 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-semibold text-gray-800 transition-colors outline-none cursor-pointer shadow-2xs"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {SERVICE_CATEGORY_PRESETS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* CPT / Service Code Input */}
            <div className="space-y-1">
              <label
                className="block text-[11px] font-semibold text-gray-700"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                CPT / SERVICE CODE
              </label>
              <CPTCodeInput
                value={formCptCode}
                onChange={(code) => setFormCptCode(code)}
                placeholder="Search or enter CPT code..."
              />
            </div>

            {/* Description Textarea */}
            <div className="space-y-1">
              <label
                className="block text-[11px] font-semibold text-gray-700"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                DESCRIPTION
              </label>
              <textarea
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Brief description of the service offering..."
                className="w-full px-3.5 py-2 bg-gray-50/80 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-normal text-gray-800 transition-colors outline-none resize-none shadow-2xs"
                style={{ fontFamily: "Outfit, sans-serif" }}
              />
            </div>

            {/* + Add Field Mock Action */}
            <div className="pt-1 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => toast.info("Custom fields can be defined via Admin Custom Fields.")}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Field
              </button>
            </div>
          </div>

          {/* Card 2: PRICING & DURATION */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                <span
                  className="text-xs font-bold text-gray-800 uppercase tracking-wider"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  PRICING & DURATION
                </span>
              </div>
            </div>

            {/* Pricing & Currency */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
              <div className="sm:col-span-7 space-y-1">
                <label
                  className="block text-[11px] font-semibold text-gray-700"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  PRICING & CURRENCY
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2 text-xs font-bold text-gray-500">
                    {getCurrencySymbol(formCurrency)}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={formPrice}
                    onChange={(e) => setFormPrice(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-3.5 py-2 bg-gray-50/80 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-bold text-gray-800 transition-colors outline-none shadow-2xs"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  />
                </div>
              </div>

              <div className="sm:col-span-5 space-y-1">
                <label
                  className="block text-[11px] font-semibold text-gray-700"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  CURRENCY
                </label>
                <select
                  value={formCurrency}
                  onChange={(e) => setFormCurrency(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50/80 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-semibold text-gray-800 transition-colors outline-none cursor-pointer shadow-2xs"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tax & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
              <div className="space-y-1">
                <label
                  className="block text-[11px] font-semibold text-gray-700"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  TAX (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formTax}
                    onChange={(e) => setFormTax(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 bg-gray-50/80 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-semibold text-gray-800 transition-colors outline-none shadow-2xs"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  />
                  <Percent className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  className="block text-[11px] font-semibold text-gray-700"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  DURATION (MIN)
                </label>
                <input
                  type="number"
                  min={5}
                  step={5}
                  value={formDuration}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 5;
                    setFormDuration(val);
                    if (!formSlotDuration || formSlotDuration === formDuration) {
                      setFormSlotDuration(val);
                    }
                  }}
                  className="w-full px-3.5 py-2 bg-gray-50/80 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-semibold text-gray-800 transition-colors outline-none shadow-2xs"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
              </div>

              <div className="space-y-1">
                <label
                  className="block text-[11px] font-semibold text-gray-700"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  SLOT DURATION (MIN)
                </label>
                <input
                  type="number"
                  min={5}
                  step={5}
                  value={formSlotDuration}
                  onChange={(e) => setFormSlotDuration(parseInt(e.target.value, 10) || 5)}
                  className="w-full px-3.5 py-2 bg-gray-50/80 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-semibold text-gray-800 transition-colors outline-none shadow-2xs"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
              </div>
            </div>

            {/* Upfront Deposit Option */}
            <div className="pt-2 border-t border-gray-100 space-y-2.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formIsPrepaid}
                  onChange={(e) => setFormIsPrepaid(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span
                  className="text-xs font-semibold text-gray-700"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Require Upfront Payment / Deposit
                </span>
              </label>

              {formIsPrepaid && (
                <div className="grid grid-cols-2 gap-3 pl-6 animate-in fade-in-50 duration-150">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-gray-500">
                      DEPOSIT TYPE
                    </label>
                    <select
                      value={formPrepaidDepositType}
                      onChange={(e) => setFormPrepaidDepositType(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 cursor-pointer"
                    >
                      <option value="full">100% Upfront (Full Amount)</option>
                      <option value="deposit">Fixed Deposit Amount</option>
                    </select>
                  </div>
                  {formPrepaidDepositType === "deposit" && (
                    <div className="space-y-1">
                      <label className="block text-[10px] font-semibold text-gray-500">
                        DEPOSIT AMOUNT ($)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formPrepaidDepositAmount}
                        onChange={(e) => setFormPrepaidDepositAmount(parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* + Add Field Mock Action */}
            <div className="pt-1 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => toast.info("Custom fields can be defined via Admin Custom Fields.")}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Field
              </button>
            </div>
          </div>

          {/* Card 3: ADMIN CONTROL (Scope component instead of plain industry/category dropdowns) */}
          <div className="space-y-2">
            <AdminControlAccordion
              scopingRules={formScopingRules}
              onScopingRulesChange={(newRules) => setFormScopingRules(newRules)}
              defaultAdminControlOpen={true}
              defaultScopeOpen={true}
              defaultPermissionsOpen={false}
              scopeTooltip="Define which tenant organization categories, industries, and locations have visibility to this product/service template."
            />
          </div>

          {/* Card 4: Active Template Switch */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
            <div>
              <p
                className="text-xs font-bold text-gray-800"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Publish as Active Template
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Active templates are provisioned across client workspaces.
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
