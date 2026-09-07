"use client";

import React, { useState, useMemo, useEffect } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pill } from "@/components/ui/Pill";
import { SideDrawer } from "@/components/ui/SideDrawer";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useIndustryTemplateStore } from "@/lib/industry-template-store";
import {
  SlidersHorizontal,
  Plus,
  Hash,
  Type,
  Calendar,
  ToggleLeft,
  List,
  Search,
  Filter,
  Trash2,
  Edit2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Layers,
  Sparkles,
  Check,
  X,
  FolderPlus,
  Tag,
  Building2,
  PhoneCall,
  Activity,
  Package,
  CalendarDays,
  Users,
  Menu,
} from "lucide-react";

// Predefined Modules
export const MODULES = [
  "Clients",
  "Call Logs",
  "Processes",
  "Products / Services",
  "Organisation",
  "Appointments",
] as const;

export type ModuleType = (typeof MODULES)[number];

// Available Industries & Associated Services
export const AVAILABLE_INDUSTRIES = [
  "Healthcare",
  "IT/Tech",
  "Automobile",
  "Real Estate",
  "Coaching & Advisory",
  "Household Care",
  "Wellness & Lifestyle",
] as const;

export const INDUSTRY_SERVICES_MAP: Record<string, string[]> = {
  "Healthcare": [
    "Cardiologist",
    "Cataract",
    "Clinical Psychologist",
    "Contoura Vision",
    "Dentist",
    "General Physician",
  ],
  "IT/Tech": [
    "AI/ML Strategy/ Model Development",
    "App Development",
    "Automation/Workflow Consultation",
    "Chatbot/Voice Agent Development",
    "Cloud Migration Consultation",
    "Cybersecurity Audit",
  ],
  "Automobile": [
    "Accessory/Customization",
    "Automobile",
    "Car Inspection / Valuations",
    "Test Drive Scheduling",
  ],
  "Real Estate": [
    "Commercial Real Estates",
    "Property Buying & Advisory",
    "Property Management",
    "Residential Leasing",
  ],
  "Coaching & Advisory": [
    "Career Coaching",
    "Executive Coaching",
    "Financial Advisory",
    "Life & Wellness Coaching",
  ],
  "Household Care": [
    "AC Repair & Maintenance",
    "Carpentry & Woodwork",
    "Deep Home Cleaning",
    "Electrical Installations",
    "Plumbing Services",
  ],
  "Wellness & Lifestyle": [
    "Fitness & Personal Training",
    "Mindfulness & Meditation",
    "Nutrition & Diet Planning",
    "Yoga Coaching",
  ],
};

// Templates belonging strictly to each Service
export const SERVICE_TEMPLATES_MAP: Record<string, string[]> = {
  // Healthcare
  "Cardiologist": [
    "Cardiology Patient Intake",
    "Post-Op Follow-up Routine",
    "ECG / Heart Rhythm Consultation",
  ],
  "Cataract": [
    "Cataract Surgery Pre-Op Checklist",
    "Lens Replacement Evaluation",
    "Post-Cataract Eye Care Journey",
  ],
  "Clinical Psychologist": [
    "Mental Health Initial Screener",
    "Therapy Session Check-in",
    "Anxiety & Stress Assessment",
  ],
  "Contoura Vision": [
    "Corneal Topography Intake",
    "Laser Refractive Candidacy",
    "Vision Recovery Protocol",
  ],
  "Dentist": [
    "Dental Hygiene & Cavity Screening",
    "Root Canal Pre-Assessment",
    "Orthodontic Aligners Consultation",
  ],
  "General Physician": [
    "General Symptom Triage",
    "Prescription Refill Flow",
    "Annual Preventive Health Checkup",
  ],
  // IT/Tech
  "AI/ML Strategy/ Model Development": [
    "Custom LLM Fine-tuning Journey",
    "Computer Vision Feasibility",
    "Predictive ML Model Architecture",
  ],
  "App Development": [
    "Mobile App MVP Discovery",
    "Full-Stack Web App Scope",
    "Cross-Platform Migration Plan",
  ],
  "Automation/Workflow Consultation": [
    "AI Workflow Assessment",
    "RPA Automation Blueprint",
    "Webhook & Pipeline Integration",
  ],
  "Chatbot/Voice Agent Development": [
    "Voice AI Prompt Tree Setup",
    "Telephony SIP Trunking Config",
    "Customer Support Agent Workflow",
  ],
  "Cloud Migration Consultation": [
    "AWS / Azure Infrastructure Audit",
    "Database Migration & Cutover",
    "Serverless Architecture Review",
  ],
  "Cybersecurity Audit": [
    "Vulnerability & Penetration Testing",
    "SOC2 Compliance Readiness",
    "Zero-Trust Access Architecture",
  ],
  // Automobile
  "Accessory/Customization": [
    "Custom Trim & Paint Inquiry",
    "Audio & Infotainment Upgrade",
    "Performance Kit Fitting",
  ],
  "Automobile": [
    "Vehicle Service Booking",
    "Emergency Roadside Assist",
    "Periodic Maintenance Schedule",
  ],
  "Car Inspection / Valuations": [
    "Pre-Purchase Inspection",
    "Insurance Damage Valuation",
    "Used Car Condition Report",
  ],
  "Test Drive Scheduling": [
    "EV Fleet Test Drive",
    "Luxury Sedan Experience",
    "Weekend Test Drive Journey",
  ],
  // Real Estate
  "Commercial Real Estates": [
    "Office Space Requirement Intake",
    "Retail Lease Negotiation",
    "Industrial Warehouse Survey",
  ],
  "Property Buying & Advisory": [
    "Buyer Budget & Preference Discovery",
    "Mortgage Pre-Approval Flow",
    "Site Visit & Inspection Booking",
  ],
  "Property Management": [
    "Tenant Onboarding & Lease Sign",
    "Maintenance Request Workflow",
    "Rent Collection & Notice Dispatch",
  ],
  "Residential Leasing": [
    "Apartment Rental Application",
    "Virtual Tour Booking",
    "Security Deposit & Handover",
  ],
  // Coaching & Advisory
  "Career Coaching": [
    "Resume & Interview Prep",
    "Career Transition Roadmap",
    "Executive Leadership Assessment",
  ],
  "Executive Coaching": [
    "C-Suite Strategy Alignment",
    "Quarterly OKR Guidance",
    "High-Performance Team Coaching",
  ],
  "Financial Advisory": [
    "Wealth & Portfolio Discovery",
    "Retirement Strategy Intake",
    "Tax Optimization Review",
  ],
  "Life & Wellness Coaching": [
    "Goal Setting & Habit Formation",
    "Work-Life Balance Assessment",
    "Mindset Growth Blueprint",
  ],
  // Household Care
  "AC Repair & Maintenance": [
    "AC Gas Refill & Leak Check",
    "Seasonal Compressor Servicing",
    "Emergency AC Breakdown",
  ],
  "Carpentry & Woodwork": [
    "Custom Furniture Estimation",
    "Door/Window Repair Scope",
    "Cabinet & Modular Fitting",
  ],
  "Deep Home Cleaning": [
    "Full Villa Deep Clean Scope",
    "Kitchen & Bathroom Sanitization",
    "Move-in / Move-out Cleaning",
  ],
  "Electrical Installations": [
    "Short Circuit & Fuse Diagnostic",
    "Smart Home Wiring Setup",
    "Appliance Connection & Safety",
  ],
  "Plumbing Services": [
    "Pipe Leak & Water Pressure Audit",
    "Bathroom Fixture Replacement",
    "Drainage & Sewage Unclogging",
  ],
  // Wellness & Lifestyle
  "Fitness & Personal Training": [
    "Fitness Assessment & Body Metric",
    "Custom Workout Routine Builder",
    "1-on-1 Trainer Session Schedule",
  ],
  "Mindfulness & Meditation": [
    "Stress Reduction Guided Routine",
    "Daily Meditation Tracking",
    "Sleep Quality Consultation",
  ],
  "Nutrition & Diet Planning": [
    "Dietary Habit & Allergy Audit",
    "Macro & Calorie Target Plan",
    "Weekly Meal Prep Consultation",
  ],
  "Yoga Coaching": [
    "Flexibility & Posture Intake",
    "Beginner Yoga Flow Routine",
    "Breathwork (Pranayama) Session",
  ],
};

export interface CustomField {
  id: string;
  name: string;
  key: string;
  type: "Text" | "Number" | "Boolean (Yes/No)" | "Date" | "Select (Dropdown)";
  module: ModuleType;
  options?: string[];
  isRequired: boolean;
  createdAt?: string;
}

export interface CustomSection {
  id: string;
  name: string;
  industry?: string;
  service?: string;
  module: ModuleType;
  template?: string;
  description?: string;
  fieldIds: string[]; // Ordered list of CustomField IDs
  rowTemplates?: Record<string, string>; // Template choice per row if module is Processes
  createdAt?: string;
}

// Initial Sample Data
const INITIAL_FIELDS: CustomField[] = [
  {
    id: "cf-1",
    name: "Hospital Location",
    key: "hospital_location",
    type: "Text",
    module: "Clients",
    isRequired: false,
  },
  {
    id: "cf-2",
    name: "Appointment Date Time",
    key: "appointment_date_time",
    type: "Date",
    module: "Appointments",
    isRequired: true,
  },
  {
    id: "cf-3",
    name: "Doctor Assigned",
    key: "doctor_assigned",
    type: "Select (Dropdown)",
    module: "Appointments",
    options: ["Dr. Sharma (Cardiology)", "Dr. Mehta (Ophthalmology)", "Dr. Patel (General)"],
    isRequired: true,
  },
  {
    id: "cf-4",
    name: "Budget",
    key: "budget",
    type: "Number",
    module: "Processes",
    isRequired: false,
  },
  {
    id: "cf-5",
    name: "Customer Sentiment Score",
    key: "customer_sentiment_score",
    type: "Number",
    module: "Call Logs",
    isRequired: false,
  },
  {
    id: "cf-6",
    name: "Preferred Callback Time",
    key: "preferred_callback_time",
    type: "Text",
    module: "Clients",
    isRequired: true,
  },
  {
    id: "cf-7",
    name: "VIP Account Flag",
    key: "is_vip_account",
    type: "Boolean (Yes/No)",
    module: "Clients",
    isRequired: false,
  },
  {
    id: "cf-8",
    name: "Service Plan Code",
    key: "service_plan_code",
    type: "Text",
    module: "Products / Services",
    isRequired: true,
  },
  {
    id: "cf-9",
    name: "Branch Tax ID",
    key: "branch_tax_id",
    type: "Text",
    module: "Organisation",
    isRequired: false,
  },
];

const INITIAL_SECTIONS: CustomSection[] = [
  {
    id: "sec-1",
    name: "Patient Vitals & Intake",
    industry: "Healthcare",
    service: "Cardiologist",
    module: "Clients",
    description: "Primary client intake details and priority flags",
    fieldIds: ["cf-1", "cf-6", "cf-7"],
  },
  {
    id: "sec-2",
    name: "Consultation Scheduling",
    industry: "Healthcare",
    service: "Cardiologist",
    module: "Appointments",
    description: "Doctor assignment and timing coordinates",
    fieldIds: ["cf-2", "cf-3"],
  },
  {
    id: "sec-3",
    name: "Call Resolution Metrics",
    industry: "IT/Tech",
    service: "Automation/Workflow Consultation",
    module: "Call Logs",
    description: "Automated analysis scores and voice sentiment telemetry",
    fieldIds: ["cf-5"],
  },
];

const SECTIONS_STORAGE_KEY = "mantra_custom_sections_v2";

export default function CustomFieldsPage({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const { categories, getIndustriesByCategory } = useIndustryTemplateStore();

  const [activeMainTab, setActiveMainTab] = useState<"FIELDS" | "SECTIONS">("FIELDS");
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>("All");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("All");
  const [selectedIndustryFilter, setSelectedIndustryFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const [fields, setFields] = useState<CustomField[]>(INITIAL_FIELDS);
  const [sections, setSections] = useState<CustomSection[]>(INITIAL_SECTIONS);

  // Available industries dynamically filtered by selected category
  const availableIndustriesForFilter = useMemo(() => {
    return getIndustriesByCategory(selectedCategoryFilter);
  }, [selectedCategoryFilter, getIndustriesByCategory]);

  // Sync sections with shared localStorage & custom event listener
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(SECTIONS_STORAGE_KEY);
        if (stored) {
          setSections(JSON.parse(stored));
        } else {
          localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify(INITIAL_SECTIONS));
        }
      } catch (e) {
        console.error("Error loading sections from localStorage", e);
      }

      const handleSectionsUpdated = () => {
        try {
          const stored = localStorage.getItem(SECTIONS_STORAGE_KEY);
          if (stored) {
            setSections(JSON.parse(stored));
          }
        } catch (e) {}
      };

      window.addEventListener("mantra_custom_sections_updated", handleSectionsUpdated);
      window.addEventListener("storage", handleSectionsUpdated);

      return () => {
        window.removeEventListener("mantra_custom_sections_updated", handleSectionsUpdated);
        window.removeEventListener("storage", handleSectionsUpdated);
      };
    }
  }, []);

  const persistSections = (newSections: CustomSection[]) => {
    setSections(newSections);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify(newSections));
        window.dispatchEvent(new CustomEvent("mantra_custom_sections_updated"));
      } catch (e) {}
    }
  };

  // Drawer States
  const [isFieldDrawerOpen, setIsFieldDrawerOpen] = useState(false);
  const [isSectionDrawerOpen, setIsSectionDrawerOpen] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  // Hamburger Action Dropdowns State
  const [activeFieldActionId, setActiveFieldActionId] = useState<string | null>(null);
  const [activeSectionActionId, setActiveSectionActionId] = useState<string | null>(null);

  // Create Field Form State
  const [fieldForm, setFieldForm] = useState<{
    name: string;
    key: string;
    type: CustomField["type"];
    module: ModuleType;
    isRequired: boolean;
    options: string[];
    newOptionInput: string;
  }>({
    name: "",
    key: "",
    type: "Text",
    module: "Clients",
    isRequired: false,
    options: [],
    newOptionInput: "",
  });

  // Create/Edit Section Form State with row-based module & field pairs
  interface SectionFieldRow {
    rowId: string;
    module: ModuleType;
    template?: string;
    fieldId: string;
  }

  const [sectionForm, setSectionForm] = useState<{
    name: string;
    description: string;
    industry: string;
    service: string;
    module: ModuleType;
    template?: string;
    rows: SectionFieldRow[];
  }>({
    name: "",
    description: "",
    industry: "Healthcare",
    service: "Cardiologist",
    module: "Clients",
    template: "",
    rows: [{ rowId: "row-1", module: "Clients", template: "", fieldId: "" }],
  });

  // Helper to auto-generate key from label
  const handleLabelChange = (label: string) => {
    const autoKey = label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    setFieldForm((prev) => ({
      ...prev,
      name: label,
      key: autoKey,
    }));
  };

  // Add Option to Select dropdown type
  const handleAddOption = () => {
    if (fieldForm.newOptionInput.trim()) {
      setFieldForm((prev) => ({
        ...prev,
        options: [...prev.options, prev.newOptionInput.trim()],
        newOptionInput: "",
      }));
    }
  };

  const handleRemoveOption = (index: number) => {
    setFieldForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  // Create Field Submit
  const handleCreateField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldForm.name.trim()) return;

    const newField: CustomField = {
      id: `cf-${Date.now()}`,
      name: fieldForm.name.trim(),
      key: fieldForm.key.trim() || fieldForm.name.toLowerCase().replace(/\s+/g, "_"),
      type: fieldForm.type,
      module: fieldForm.module,
      options: fieldForm.type === "Select (Dropdown)" ? fieldForm.options : undefined,
      isRequired: fieldForm.isRequired,
      createdAt: new Date().toISOString(),
    };

    setFields([newField, ...fields]);
    setFieldForm({
      name: "",
      key: "",
      type: "Text",
      module: "Clients",
      isRequired: false,
      options: [],
      newOptionInput: "",
    });
    setIsFieldDrawerOpen(false);
  };

  // Open Section Drawer (Create or Edit)
  const handleOpenSectionDrawer = (section?: CustomSection) => {
    if (section) {
      setEditingSectionId(section.id);
      const mappedRows: SectionFieldRow[] = section.fieldIds.map((fId, idx) => {
        const foundField = fields.find((f) => f.id === fId);
        return {
          rowId: `row-${idx}-${Date.now()}`,
          module: foundField ? foundField.module : section.module,
          template: (section.rowTemplates && section.rowTemplates[fId]) || "",
          fieldId: fId,
        };
      });

      setSectionForm({
        name: section.name,
        description: section.description || "",
        industry: section.industry || "Healthcare",
        service: section.service || "Cardiologist",
        module: section.module,
        template: section.template || "",
        rows:
          mappedRows.length > 0
            ? mappedRows
            : [{ rowId: `row-1`, module: section.module, template: "", fieldId: "" }],
      });
    } else {
      setEditingSectionId(null);
      setSectionForm({
        name: "",
        description: "",
        industry: "Healthcare",
        service: "Cardiologist",
        module: selectedModuleFilter !== "All" ? (selectedModuleFilter as ModuleType) : "Clients",
        template: "",
        rows: [{ rowId: `row-${Date.now()}`, module: "Clients", template: "", fieldId: "" }],
      });
    }
    setIsSectionDrawerOpen(true);
  };

  // Add a new row of [Module Dropdown, Template Dropdown (if Process), Field Dropdown]
  const handleAddFieldRow = () => {
    setSectionForm((prev) => ({
      ...prev,
      rows: [
        ...prev.rows,
        {
          rowId: `row-${Date.now()}`,
          module: prev.module,
          template:
            prev.module === "Processes"
              ? (SERVICE_TEMPLATES_MAP[prev.service] || [])[0] || ""
              : "",
          fieldId: "",
        },
      ],
    }));
  };

  // Update row module
  const handleRowModuleChange = (rowIndex: number, newModule: ModuleType) => {
    setSectionForm((prev) => {
      const updated = [...prev.rows];
      const availableForMod = fields.filter((f) => f.module === newModule);
      const availableTemplatesForService = SERVICE_TEMPLATES_MAP[prev.service] || [];
      updated[rowIndex] = {
        ...updated[rowIndex],
        module: newModule,
        template: newModule === "Processes" ? availableTemplatesForService[0] || "" : "",
        fieldId: availableForMod[0]?.id || "",
      };
      return { ...prev, rows: updated };
    });
  };

  // Update row template (for Processes module)
  const handleRowTemplateChange = (rowIndex: number, newTemplate: string) => {
    setSectionForm((prev) => {
      const updated = [...prev.rows];
      updated[rowIndex] = {
        ...updated[rowIndex],
        template: newTemplate,
      };
      return { ...prev, rows: updated };
    });
  };

  // Update row field
  const handleRowFieldChange = (rowIndex: number, newFieldId: string) => {
    setSectionForm((prev) => {
      const updated = [...prev.rows];
      updated[rowIndex] = {
        ...updated[rowIndex],
        fieldId: newFieldId,
      };
      return { ...prev, rows: updated };
    });
  };

  // Remove row
  const handleRemoveFieldRow = (rowIndex: number) => {
    setSectionForm((prev) => ({
      ...prev,
      rows: prev.rows.filter((_, idx) => idx !== rowIndex),
    }));
  };

  // Drag and drop reordering state
  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);
  const [dragOverRowIndex, setDragOverRowIndex] = useState<number | null>(null);

  // Drag reorder handler
  const handleDragReorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    const updated = [...sectionForm.rows];
    const [movedItem] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, movedItem);
    setSectionForm((prev) => ({ ...prev, rows: updated }));
  };

  // Save Section Submit
  const handleSaveSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionForm.name.trim()) return;

    // Extract valid non-empty unique fieldIds in order
    const orderedFieldIds = sectionForm.rows
      .map((r) => r.fieldId)
      .filter((fId) => fId && fId.trim() !== "");

    const rowTemplates: Record<string, string> = {};
    sectionForm.rows.forEach((r) => {
      if (r.module === "Processes" && r.template && r.fieldId) {
        rowTemplates[r.fieldId] = r.template;
      }
    });

    if (editingSectionId) {
      persistSections(
        sections.map((sec) =>
          sec.id === editingSectionId
            ? {
                ...sec,
                name: sectionForm.name.trim(),
                description: sectionForm.description.trim(),
                industry: sectionForm.industry,
                service: sectionForm.service,
                module: sectionForm.module,
                template: sectionForm.module === "Processes" ? sectionForm.template : undefined,
                fieldIds: orderedFieldIds,
                rowTemplates,
              }
            : sec
        )
      );
    } else {
      const newSec: CustomSection = {
        id: `sec-${Date.now()}`,
        name: sectionForm.name.trim(),
        description: sectionForm.description.trim(),
        industry: sectionForm.industry,
        service: sectionForm.service,
        module: sectionForm.module,
        template: sectionForm.module === "Processes" ? sectionForm.template : undefined,
        fieldIds: orderedFieldIds,
        rowTemplates,
        createdAt: new Date().toISOString(),
      };
      persistSections([newSec, ...sections]);
    }

    setIsSectionDrawerOpen(false);
  };

  // Filtered fields based on module filter and search
  const filteredFields = useMemo(() => {
    return fields.filter((f) => {
      const matchModule =
        selectedModuleFilter === "All" || f.module === selectedModuleFilter;
      const matchSearch =
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.module.toLowerCase().includes(searchQuery.toLowerCase());
      return matchModule && matchSearch;
    });
  }, [fields, selectedModuleFilter, searchQuery]);

  // Filtered sections based on search, category, industry, and module
  const filteredSections = useMemo(() => {
    return sections.filter((s) => {
      const matchModule =
        selectedModuleFilter === "All" || s.module === selectedModuleFilter;

      const matchCategory =
        selectedCategoryFilter === "All" ||
        (s.industry && (
          s.industry.toLowerCase() === selectedCategoryFilter.toLowerCase() ||
          s.industry.toLowerCase().includes(selectedCategoryFilter.toLowerCase())
        ));

      const matchIndustry =
        selectedIndustryFilter === "All" ||
        (s.service && s.service.toLowerCase() === selectedIndustryFilter.toLowerCase()) ||
        (s.industry && s.industry.toLowerCase() === selectedIndustryFilter.toLowerCase());

      const matchSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.industry && s.industry.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.service && s.service.toLowerCase().includes(searchQuery.toLowerCase())) ||
        s.module.toLowerCase().includes(searchQuery.toLowerCase());

      return matchModule && matchCategory && matchIndustry && matchSearch;
    });
  }, [sections, selectedModuleFilter, selectedCategoryFilter, selectedIndustryFilter, searchQuery]);

  // Module filter & search inside the Create Section Drawer field picker
  const [drawerModuleFilter, setDrawerModuleFilter] = useState<string>("All");
  const [drawerFieldSearch, setDrawerFieldSearch] = useState<string>("");

  // Available fields in the section drawer (can choose from ANY module)
  const availableDrawerFields = useMemo(() => {
    return fields.filter((f) => {
      const matchModule =
        drawerModuleFilter === "All" || f.module === drawerModuleFilter;
      const matchSearch =
        f.name.toLowerCase().includes(drawerFieldSearch.toLowerCase()) ||
        f.key.toLowerCase().includes(drawerFieldSearch.toLowerCase()) ||
        f.module.toLowerCase().includes(drawerFieldSearch.toLowerCase());
      return matchModule && matchSearch;
    });
  }, [fields, drawerModuleFilter, drawerFieldSearch]);

  const getTypeIcon = (type: CustomField["type"]) => {
    switch (type) {
      case "Number":
        return <Hash className="w-3.5 h-3.5 text-[#1456f0]" />;
      case "Date":
        return <Calendar className="w-3.5 h-3.5 text-purple-600" />;
      case "Boolean (Yes/No)":
        return <ToggleLeft className="w-3.5 h-3.5 text-emerald-600" />;
      case "Select (Dropdown)":
        return <List className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <Type className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getModuleIcon = (mod: ModuleType) => {
    switch (mod) {
      case "Clients":
        return <Users className="w-3.5 h-3.5 text-blue-600" />;
      case "Call Logs":
        return <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />;
      case "Processes":
        return <Activity className="w-3.5 h-3.5 text-purple-600" />;
      case "Products / Services":
        return <Package className="w-3.5 h-3.5 text-sky-600" />;
      case "Organisation":
        return <Building2 className="w-3.5 h-3.5 text-amber-600" />;
      case "Appointments":
        return <CalendarDays className="w-3.5 h-3.5 text-rose-600" />;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Top Header Row with Page Titles on Left and Custom Fields / Sections Toggle on Rightmost Corner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#222222]">
            Custom Fields & Sections
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure dynamic conversation variables, CRM attributes, and modular field sections.
          </p>
        </div>

        {/* Rightmost Corner Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-white/60 backdrop-blur-md rounded-2xl border border-white/70 shadow-xs shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setActiveMainTab("FIELDS");
              setSearchQuery("");
            }}
            className={`
              px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer
              ${
                activeMainTab === "FIELDS"
                  ? "bg-[#181e25] text-white shadow-sm"
                  : "text-slate-500 hover:text-[#222222] hover:bg-white/40"
              }
            `}
          >
            Custom Fields
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveMainTab("SECTIONS");
              setSearchQuery("");
            }}
            className={`
              px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer
              ${
                activeMainTab === "SECTIONS"
                  ? "bg-[#181e25] text-white shadow-sm"
                  : "text-slate-500 hover:text-[#222222] hover:bg-white/40"
              }
            `}
          >
            Custom Sections
          </button>
        </div>
      </div>

      {/* Main Glass Workspace */}
      <GlassCard variant="default" rounded="3xl" padding="lg" className="space-y-5">
        {/* Action Header: Search Bar on Left + Dynamic Filters & Action Button on Right */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeMainTab === "FIELDS"
                  ? "Search custom fields..."
                  : "Search custom sections..."
              }
              className="
                w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-white/70 backdrop-blur-md
                border border-slate-200/80 rounded-2xl placeholder:text-slate-400 text-[#222222]
                shadow-xs transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-[#1456f0]/40 focus:border-[#1456f0]/60 focus:bg-white
              "
            />
          </div>

          {/* Right Side Filters & Action Button */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* When CUSTOM SECTIONS is active: Show Industry Category & Industry Filters */}
            {activeMainTab === "SECTIONS" && (
              <>
                {/* 1. Category Filter */}
                <div className="w-40 shrink-0">
                  <CustomSelect
                    value={selectedCategoryFilter}
                    onChange={(val) => {
                      setSelectedCategoryFilter(val);
                      setSelectedIndustryFilter("All");
                    }}
                    options={[
                      { value: "All", label: "All Categories" },
                      ...categories.map((c) => ({ value: c.name, label: c.name })),
                    ]}
                    label="Industry Category"
                    placeholder="All Categories"
                  />
                </div>

                {/* 2. Industry Filter */}
                <div className="w-40 shrink-0">
                  <CustomSelect
                    value={selectedIndustryFilter}
                    onChange={(val) => setSelectedIndustryFilter(val)}
                    options={[
                      { value: "All", label: "All Industries" },
                      ...availableIndustriesForFilter.map((ind) => ({
                        value: ind.name,
                        label: ind.name,
                      })),
                    ]}
                    label="Industry"
                    placeholder="All Industries"
                  />
                </div>
              </>
            )}

            {/* Module Filter Dropdown */}
            <div className="w-38 shrink-0">
              <CustomSelect
                value={selectedModuleFilter}
                onChange={(val) => setSelectedModuleFilter(val)}
                options={[
                  { value: "All", label: "All Modules" },
                  ...MODULES.map((m) => ({ value: m, label: m })),
                ]}
                label="Module Filter"
                placeholder="All Modules"
              />
            </div>

            {/* Right-Aligned Action Button */}
            {activeMainTab === "FIELDS" ? (
              <Pill
                variant="navy"
                size="md"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setIsFieldDrawerOpen(true)}
                className="shadow-sm shrink-0"
              >
                Add Field
              </Pill>
            ) : (
              <Pill
                variant="navy"
                size="md"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => handleOpenSectionDrawer()}
                className="shadow-sm shrink-0"
              >
                Create Section
              </Pill>
            )}
          </div>
        </div>

        {/* TAB 1: CUSTOM FIELDS TABLE */}
        {activeMainTab === "FIELDS" ? (
          <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/40 backdrop-blur-xs shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white uppercase text-[11px] font-bold tracking-wider border-b border-[#181e25]">
                  <tr>
                    <th className="px-6 py-4">Field Label</th>
                    <th className="px-6 py-4">API Key</th>
                    <th className="px-6 py-4">Module</th>
                    <th className="px-6 py-4">Data Type</th>
                    <th className="px-6 py-4">Requirement</th>
                    <th className="px-6 py-4">Created On</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/70">
                  {filteredFields.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
                        No custom fields found for this module or query.
                      </td>
                    </tr>
                  ) : (
                    filteredFields.map((field) => (
                      <tr
                        key={field.id}
                        className="hover:bg-white/70 transition-colors duration-150 group"
                      >
                        <td className="px-6 py-4 font-semibold text-[#222222] whitespace-nowrap">
                          {field.name}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-[#1456f0] whitespace-nowrap">
                          <span className="bg-blue-50/60 border border-blue-100/80 px-2 py-0.5 rounded-md">
                            {`{{${field.key}}}`}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-semibold text-xs text-[#181e25]">
                            {field.module}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-medium text-xs text-slate-600">
                            {field.type}
                            {field.options && field.options.length > 0 && (
                              <span className="text-[10px] text-slate-400 ml-1">
                                ({field.options.length})
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-medium text-xs text-slate-600">
                            {field.isRequired ? "Required" : "Optional"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-medium text-xs text-slate-600">
                            {field.createdAt
                              ? new Date(field.createdAt).toLocaleDateString("en-US", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "12 Jan 2026"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveFieldActionId(activeFieldActionId === field.id ? null : field.id);
                              }}
                              className={`p-2 rounded-xl border transition-all ${
                                activeFieldActionId === field.id
                                  ? "bg-[#181e25] text-white border-transparent shadow-xs"
                                  : "bg-white/80 hover:bg-white text-slate-600 border-slate-200/80 hover:border-slate-300 shadow-2xs"
                              }`}
                              title="More Options"
                            >
                              <Menu className="w-4 h-4" />
                            </button>

                            {activeFieldActionId === field.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-40 cursor-default"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveFieldActionId(null);
                                  }}
                                />
                                <div className="absolute right-0 top-full mt-1.5 w-40 rounded-2xl bg-white border border-slate-200/90 shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveFieldActionId(null);
                                      setFieldForm({
                                        name: field.name,
                                        key: field.key,
                                        type: field.type,
                                        module: field.module,
                                        isRequired: field.isRequired,
                                        options: field.options || [],
                                        newOptionInput: "",
                                      });
                                      setIsFieldDrawerOpen(true);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-[#1456f0] hover:bg-blue-50/80 rounded-xl transition-colors text-left"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Edit Field</span>
                                  </button>

                                  <div className="h-px bg-slate-100 my-1" />

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveFieldActionId(null);
                                      if (confirm(`Delete field "${field.name}"?`)) {
                                        setFields(fields.filter((f) => f.id !== field.id));
                                      }
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50/80 rounded-xl transition-colors text-left"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                    <span>Delete Field</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* TAB 2: CUSTOM SECTIONS TABLE */
          <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/40 backdrop-blur-xs shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white uppercase text-[11px] font-bold tracking-wider border-b border-[#181e25]">
                  <tr>
                    <th className="px-6 py-4">Section Name</th>
                    <th className="px-6 py-4">Industry</th>
                    <th className="px-6 py-4">Service</th>
                    <th className="px-6 py-4">Target Module</th>
                    <th className="px-6 py-4">Field Count</th>
                    <th className="px-6 py-4">Created On</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/70">
                  {filteredSections.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
                        No custom sections created yet for this module.
                      </td>
                    </tr>
                  ) : (
                    filteredSections.map((sec) => (
                      <tr
                        key={sec.id}
                        className="hover:bg-white/70 transition-colors duration-150 group"
                      >
                        <td className="px-6 py-4 font-bold text-sm text-[#181e25] whitespace-nowrap">
                          {sec.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-semibold text-xs text-[#181e25]">
                            {sec.industry || "General"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-medium text-xs text-slate-600">
                            {sec.service || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-semibold text-xs text-[#181e25]">
                            {sec.module}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium">
                          {sec.fieldIds.length} fields
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-medium text-xs text-slate-600">
                            {sec.createdAt
                              ? new Date(sec.createdAt).toLocaleDateString("en-US", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "12 Jan 2026"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveSectionActionId(activeSectionActionId === sec.id ? null : sec.id);
                              }}
                              className={`p-2 rounded-xl border transition-all ${
                                activeSectionActionId === sec.id
                                  ? "bg-[#181e25] text-white border-transparent shadow-xs"
                                  : "bg-white/80 hover:bg-white text-slate-600 border-slate-200/80 hover:border-slate-300 shadow-2xs"
                              }`}
                              title="More Options"
                            >
                              <Menu className="w-4 h-4" />
                            </button>

                            {activeSectionActionId === sec.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-40 cursor-default"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveSectionActionId(null);
                                  }}
                                />
                                <div className="absolute right-0 top-full mt-1.5 w-40 rounded-2xl bg-white border border-slate-200/90 shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveSectionActionId(null);
                                      handleOpenSectionDrawer(sec);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-[#1456f0] hover:bg-blue-50/80 rounded-xl transition-colors text-left"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Edit Section</span>
                                  </button>

                                  <div className="h-px bg-slate-100 my-1" />

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveSectionActionId(null);
                                      if (confirm(`Delete section "${sec.name}"?`)) {
                                        persistSections(sections.filter((s) => s.id !== sec.id));
                                      }
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50/80 rounded-xl transition-colors text-left"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                    <span>Delete Section</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </GlassCard>

      {/* SIDE DRAWER 1: CREATE CUSTOM FIELD */}
      <SideDrawer
        isOpen={isFieldDrawerOpen}
        onClose={() => setIsFieldDrawerOpen(false)}
        title="Create Custom Field"
        subtitle="Define a new custom field for your organization."
        width="lg"
        footer={
          <>
            <Pill
              variant="ghost"
              size="md"
              type="button"
              onClick={() => setIsFieldDrawerOpen(false)}
            >
              Cancel
            </Pill>
            <Pill
              variant="navy"
              size="md"
              type="button"
              onClick={handleCreateField}
            >
              Save Field
            </Pill>
          </>
        }
      >
        <form onSubmit={handleCreateField} className="space-y-5">
          {/* Field Label */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#181e25] flex items-center gap-1">
              <span>Field Label</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={fieldForm.name}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="e.g. Budget, Callback Time, Hospital Location"
              className="
                w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white/70 backdrop-blur-md
                border border-slate-200/80 rounded-xl placeholder:text-slate-400 text-[#222222]
                shadow-xs focus:outline-none focus:ring-2 focus:ring-[#1456f0]/40 focus:border-[#1456f0]/60 focus:bg-white
              "
            />
          </div>

          {/* System API Key (Auto generated) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#181e25]">
              API Key (Auto-Generated)
            </label>
            <div className="relative">
              <input
                type="text"
                value={fieldForm.key}
                onChange={(e) => setFieldForm({ ...fieldForm, key: e.target.value })}
                placeholder="e.g. hospital_location"
                className="
                  w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono bg-slate-50/80
                  border border-slate-200/80 rounded-xl text-[#1456f0] shadow-xs
                  focus:outline-none focus:ring-2 focus:ring-[#1456f0]/40 focus:border-[#1456f0]/60 focus:bg-white
                "
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Used in voice agent prompts and webhook payloads as <span className="font-mono text-[#1456f0]">{`{{${fieldForm.key || "key"}}}`}</span>
            </p>
          </div>

          {/* Module Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#181e25] flex items-center gap-1">
              <span>Module</span>
              <span className="text-rose-500">*</span>
            </label>
            <CustomSelect
              value={fieldForm.module}
              onChange={(val) =>
                setFieldForm({ ...fieldForm, module: val as ModuleType })
              }
              options={[...MODULES]}
              label="Select Module"
            />
          </div>

          {/* Data Type Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#181e25] flex items-center gap-1">
              <span>Data Type</span>
              <span className="text-rose-500">*</span>
            </label>
            <CustomSelect
              value={fieldForm.type}
              onChange={(val) =>
                setFieldForm({
                  ...fieldForm,
                  type: val as CustomField["type"],
                })
              }
              options={[
                "Text",
                "Number",
                "Date",
                "Boolean (Yes/No)",
                "Select (Dropdown)",
              ]}
              label="Select Data Type"
            />
          </div>

          {/* Options Config (Only for Select type) */}
          {fieldForm.type === "Select (Dropdown)" && (
            <div className="space-y-2.5 p-4 rounded-2xl bg-white/50 border border-slate-200/80">
              <label className="text-xs font-bold uppercase tracking-wider text-[#181e25] block">
                Dropdown Options
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={fieldForm.newOptionInput}
                  onChange={(e) =>
                    setFieldForm({ ...fieldForm, newOptionInput: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddOption();
                    }
                  }}
                  placeholder="Type an option and press Add..."
                  className="
                    flex-1 px-3 py-2 text-xs bg-white border border-slate-200/80 rounded-xl
                    text-[#222222] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1456f0]/40
                  "
                />
                <Pill
                  variant="navy"
                  size="sm"
                  type="button"
                  onClick={handleAddOption}
                >
                  Add Option
                </Pill>
              </div>

              {fieldForm.options.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {fieldForm.options.map((opt, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs text-[#222222]"
                    >
                      {opt}
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">
                  No options added yet. Add at least one option.
                </p>
              )}
            </div>
          )}

          {/* Mark Required Checkbox */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="markRequired"
              checked={fieldForm.isRequired}
              onChange={(e) =>
                setFieldForm({ ...fieldForm, isRequired: e.target.checked })
              }
              className="w-4 h-4 rounded border-slate-300 text-[#1456f0] focus:ring-[#1456f0]"
            />
            <label htmlFor="markRequired" className="text-xs font-bold text-[#181e25] cursor-pointer">
              Mark as required field
            </label>
          </div>
        </form>
      </SideDrawer>

      {/* SIDE DRAWER 2: CREATE / EDIT CUSTOM SECTION (WITH INDUSTRY, SERVICE, TEMPLATES & REORDERING) */}
      <SideDrawer
        isOpen={isSectionDrawerOpen}
        onClose={() => setIsSectionDrawerOpen(false)}
        title={editingSectionId ? "Edit Custom Section" : "Create Custom Section"}
        subtitle="Group and order custom fields into logical sections."
        width="lg"
        footer={
          <>
            <Pill
              variant="ghost"
              size="md"
              type="button"
              onClick={() => setIsSectionDrawerOpen(false)}
            >
              Cancel
            </Pill>
            <Pill
              variant="navy"
              size="md"
              type="button"
              onClick={handleSaveSection}
            >
              {editingSectionId ? "Update Section" : "Save Section"}
            </Pill>
          </>
        }
      >
        <form onSubmit={handleSaveSection} className="space-y-5">
          {/* 1. Section Label */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#181e25] flex items-center gap-1">
              <span>Section Label</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={sectionForm.name}
              onChange={(e) =>
                setSectionForm({ ...sectionForm, name: e.target.value })
              }
              placeholder="e.g. Patient Vitals, Billing Information"
              className="
                w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white/70 backdrop-blur-md
                border border-slate-200/80 rounded-xl placeholder:text-slate-400 text-[#222222]
                shadow-xs focus:outline-none focus:ring-2 focus:ring-[#1456f0]/40 focus:border-[#1456f0]/60 focus:bg-white
              "
            />
          </div>

          {/* 2. Description (Placed directly after Section Label) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#181e25]">
              Description
            </label>
            <input
              type="text"
              value={sectionForm.description}
              onChange={(e) =>
                setSectionForm({ ...sectionForm, description: e.target.value })
              }
              placeholder="Brief description of this section's purpose..."
              className="
                w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white/70 backdrop-blur-md
                border border-slate-200/80 rounded-xl placeholder:text-slate-400 text-[#222222]
                shadow-xs focus:outline-none focus:ring-2 focus:ring-[#1456f0]/40 focus:border-[#1456f0]/60 focus:bg-white
              "
            />
          </div>

          {/* 3. Industry & Services Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Industry Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#181e25] flex items-center gap-1">
                <span>Industry</span>
                <span className="text-rose-500">*</span>
              </label>
              <CustomSelect
                value={sectionForm.industry}
                onChange={(newInd) => {
                  const availableServs = INDUSTRY_SERVICES_MAP[newInd] || [];
                  const newServ = availableServs[0] || "";
                  const availableTemps = SERVICE_TEMPLATES_MAP[newServ] || [];
                  setSectionForm({
                    ...sectionForm,
                    industry: newInd,
                    service: newServ,
                    template: sectionForm.module === "Processes" ? availableTemps[0] || "" : "",
                    rows: sectionForm.rows.map((r) =>
                      r.module === "Processes"
                        ? { ...r, template: availableTemps[0] || "" }
                        : r
                    ),
                  });
                }}
                options={[...AVAILABLE_INDUSTRIES]}
                label="Choose Industry"
              />
            </div>

            {/* Relevant Services Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#181e25] flex items-center gap-1">
                <span>Service</span>
                <span className="text-rose-500">*</span>
              </label>
              <CustomSelect
                value={sectionForm.service}
                onChange={(newServ) => {
                  const availableTemps = SERVICE_TEMPLATES_MAP[newServ] || [];
                  setSectionForm({
                    ...sectionForm,
                    service: newServ,
                    template: sectionForm.module === "Processes" ? availableTemps[0] || "" : "",
                    rows: sectionForm.rows.map((r) =>
                      r.module === "Processes"
                        ? { ...r, template: availableTemps[0] || "" }
                        : r
                    ),
                  });
                }}
                options={INDUSTRY_SERVICES_MAP[sectionForm.industry] || []}
                label={`Services (${sectionForm.industry})`}
              />
            </div>
          </div>

          {/* 4. Target Module Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#181e25] flex items-center gap-1">
              <span>Target Module</span>
              <span className="text-rose-500">*</span>
            </label>
            <CustomSelect
              value={sectionForm.module}
              onChange={(val) => {
                const newMod = val as ModuleType;
                const availableTemps = SERVICE_TEMPLATES_MAP[sectionForm.service] || [];
                setSectionForm({
                  ...sectionForm,
                  module: newMod,
                  template: newMod === "Processes" ? availableTemps[0] || "" : "",
                });
              }}
              options={[...MODULES]}
              label="Target Module"
            />
          </div>

          {/* 5. If Process is chosen: Choose Template dropdown below Target Module */}
          {sectionForm.module === "Processes" && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="text-xs font-bold uppercase tracking-wider text-[#181e25] flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <span>Choose Template</span>
                  <span className="text-rose-500">*</span>
                </span>
                <span className="text-[11px] font-semibold text-[#1456f0] lowercase tracking-normal">
                  ({sectionForm.service})
                </span>
              </label>
              <CustomSelect
                value={sectionForm.template || ""}
                onChange={(val) =>
                  setSectionForm({ ...sectionForm, template: val })
                }
                options={SERVICE_TEMPLATES_MAP[sectionForm.service] || []}
                placeholder="-- Choose Template --"
                label={`Templates (${sectionForm.service})`}
                triggerClassName="bg-blue-50/40 border-blue-200/80 text-[#181e25]"
              />
            </div>
          )}

          {/* SECTION LAYOUT (Renamed & styled with bluish-black header) */}
          <div className="space-y-3 pt-3 border-t border-slate-200/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#181e25] block">
                Section Layout
              </label>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#1456f0]">
                {sectionForm.rows.filter((r) => r.fieldId).length} fields configured
              </span>
            </div>

            {sectionForm.rows.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white/40 border border-dashed border-slate-200/80 text-center space-y-2">
                <p className="text-xs text-slate-500">No fields added to this section yet.</p>
                <Pill
                  variant="navy"
                  size="sm"
                  type="button"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={handleAddFieldRow}
                >
                  Add First Field
                </Pill>
              </div>
            ) : (
              <div className="space-y-2.5">
                {sectionForm.rows.map((row, index) => {
                  // Get fields available for this specific row's module
                  const availableForThisRow = fields.filter(
                    (f) => f.module === row.module
                  );
                  // Get templates belonging strictly to the selected service
                  const serviceTemplates = SERVICE_TEMPLATES_MAP[sectionForm.service] || [];

                  return (
                    <div
                      key={row.rowId}
                      draggable
                      onDragStart={() => setDraggedRowIndex(index)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverRowIndex(index);
                      }}
                      onDragLeave={() => setDragOverRowIndex(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedRowIndex !== null) {
                          handleDragReorder(draggedRowIndex, index);
                        }
                        setDraggedRowIndex(null);
                        setDragOverRowIndex(null);
                      }}
                      onDragEnd={() => {
                        setDraggedRowIndex(null);
                        setDragOverRowIndex(null);
                      }}
                      className={`
                        p-3 rounded-2xl bg-white/90 backdrop-blur-md
                        border shadow-xs transition-all duration-150 space-y-2
                        cursor-grab active:cursor-grabbing select-none
                        ${
                          draggedRowIndex === index
                            ? "opacity-30 border-dashed border-[#1456f0]"
                            : "border-slate-200/80 hover:border-slate-300"
                        }
                        ${
                          dragOverRowIndex === index
                            ? "ring-2 ring-[#1456f0]/50 bg-blue-50/30"
                            : ""
                        }
                      `}
                    >
                      {/* Header line for drag handle and delete action */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-400">
                          <GripVertical className="w-4 h-4 cursor-grab active:cursor-grabbing shrink-0" />
                        </div>

                        {/* Delete Action Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveFieldRow(index)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete field row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Dropdown Fields: If module is Processes, also show Available Templates */}
                      <div
                        className={`grid gap-2 ${
                          row.module === "Processes"
                            ? "grid-cols-1 sm:grid-cols-3"
                            : "grid-cols-1 sm:grid-cols-2"
                        }`}
                      >
                        {/* 1. Module Dropdown */}
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-[#181e25] block mb-1">
                            Module
                          </label>
                          <CustomSelect
                            value={row.module}
                            onChange={(val) =>
                              handleRowModuleChange(index, val as ModuleType)
                            }
                            options={[...MODULES]}
                            label="Module"
                            triggerClassName="py-2"
                          />
                        </div>

                        {/* 2. Available Templates (Condition: only if module is "Processes") */}
                        {row.module === "Processes" && (
                          <div className="animate-in fade-in zoom-in-95 duration-150">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-[#181e25] block mb-1 flex items-center justify-between">
                              <span>Available Templates</span>
                              <span className="text-[9px] font-semibold text-[#1456f0] lowercase tracking-normal">
                                ({sectionForm.service})
                              </span>
                            </label>
                            <CustomSelect
                              value={row.template || ""}
                              onChange={(val) =>
                                handleRowTemplateChange(index, val)
                              }
                              options={serviceTemplates}
                              placeholder="-- Choose Template --"
                              label={`Templates (${sectionForm.service})`}
                              triggerClassName="py-2 bg-blue-50/40 border-blue-200/80 text-[#181e25]"
                            />
                          </div>
                        )}

                        {/* 3. Custom Field Dropdown */}
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-[#181e25] block mb-1">
                            Custom Field
                          </label>
                          <CustomSelect
                            value={row.fieldId}
                            onChange={(val) =>
                              handleRowFieldChange(index, val)
                            }
                            options={availableForThisRow.map((f) => ({
                              value: f.id,
                              label: f.name,
                              badge: f.type,
                            }))}
                            placeholder="-- Choose Field --"
                            label={`Fields (${row.module})`}
                            searchable={availableForThisRow.length > 5}
                            triggerClassName="py-2"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* + Add Field Option Button */}
                <button
                  type="button"
                  onClick={handleAddFieldRow}
                  className="
                    w-full py-2.5 px-4 rounded-2xl border border-dashed border-slate-300 hover:border-[#1456f0]
                    bg-white/50 hover:bg-blue-50/50 text-[#1456f0] text-xs font-semibold
                    flex items-center justify-center gap-2 transition-all duration-200 shadow-xs
                  "
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Another Field</span>
                </button>
              </div>
            )}
          </div>
        </form>
      </SideDrawer>
    </div>
  );
}
