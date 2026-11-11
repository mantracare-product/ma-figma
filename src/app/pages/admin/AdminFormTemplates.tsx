import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  CheckSquare,
  Plus,
  Trash2,
  Pencil,
  Globe,
  SlidersHorizontal,
  ChevronDown,
  Copy,
  CheckCircle2,
  Shield,
  Lock,
  ArrowRight,
  FileText,
  UserCheck,
  Share2,
  Eye,
  Settings,
  Search,
  X,
  GitMerge,
  ArrowLeft,
  GripVertical,
} from "lucide-react";
import PageHeader from "../../components/layout/PageHeader";
import PageTopBar from "../../components/layout/PageTopBar";
import TableComponent, { TableColumn, TableRowAction } from "../../components/ui/TableComponent";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import {
  Form,
  FormPermissions,
  ScopingRule,
  getStoredForms,
  saveStoredForms,
  saveForm,
  deleteForm,
  WEB_FORMS_EVENT,
  isFormMatchingScope,
} from "../../../data/forms";
import {
  FormFlow,
  FlowStep,
  getStoredFlows,
  saveStoredFlows,
  FORM_FLOWS_EVENT,
  deleteFlow as deleteStoredFlow,
} from "../../../data/intakeFlows";
import { AdminScopingRulesEditor } from "./components/AdminScopingRulesEditor";
import { AdminControlAccordion } from "./components/AdminControlAccordion";
import FormBuilderDrawer from "../../components/form-builder/FormBuilderDrawer";
import FormFlowDrawer from "../../components/forms/FormFlowDrawer";
import FormFlowCreateDrawer from "../../components/forms/FormFlowCreateDrawer";
import FormCreateDrawer from "../../components/forms/FormCreateDrawer";
import {
  INITIAL_CATEGORIES,
  INITIAL_INDUSTRIES,
  STANDARD_LOCATIONS,
  getIndustriesForCategory,
} from "../../../data/industryReferenceData";
import { toast } from "sonner";

interface RoleOption {
  id: string;
  label: string;
  desc: string;
  badgeClass: string;
}

const AVAILABLE_ROLES: RoleOption[] = [
  { id: "admin", label: "Admin", desc: "Full control over templates & settings", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "manager", label: "Manager", desc: "Can manage and customize forms", badgeClass: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: "reception", label: "Reception", desc: "Front desk access & operations", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "staff", label: "Staff / Provider", desc: "Clinical & team members", badgeClass: "bg-teal-50 text-teal-700 border-teal-200" },
  { id: "client", label: "Client / Public", desc: "Public submission / fill access", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
];

export default function AdminFormTemplates() {
  const navigate = useNavigate();
  const [forms, setForms] = useState<Form[]>(getStoredForms);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("All");
  const [selectedIndustryFilter, setSelectedIndustryFilter] = useState<string>("All");
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>("All");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");

  // Form Builder Drawer State
  const [isBuilderDrawerOpen, setIsBuilderDrawerOpen] = useState(false);
  const [activeBuilderForm, setActiveBuilderForm] = useState<Form | null>(null);

  // Sub-tabs: Forms vs Form Flows
  const [subTab, setSubTab] = useState<"forms" | "flows">("forms");

  // Form Flows state
  const [flows, setFlows] = useState<FormFlow[]>(getStoredFlows);
  const [flowSearchQuery, setFlowSearchQuery] = useState("");
  const [flowCategoryFilter, setFlowCategoryFilter] = useState("All");
  const [flowStatusFilter, setFlowStatusFilter] = useState("all");
  const [activeFlow, setActiveFlow] = useState<FormFlow | null>(null);
  const [drawerFlow, setDrawerFlow] = useState<FormFlow | null>(null);

  // Flow step editor state
  const [editingFlowName, setEditingFlowName] = useState(false);
  const [flowNameDraft, setFlowNameDraft] = useState("");
  const [addStepOpen, setAddStepOpen] = useState(false);
  const [selectedFormIdToAdd, setSelectedFormIdToAdd] = useState<number | null>(null);
  const [isStepRequiredToAdd, setIsStepRequiredToAdd] = useState(true);

  // Creation Drawer States
  const [isCreateFormDrawerOpen, setIsCreateFormDrawerOpen] = useState(false);
  const [isCreateFlowDrawerOpen, setIsCreateFlowDrawerOpen] = useState(false);

  // Sync flows with storage changes
  useEffect(() => {
    const handleFlowsUpdate = () => {
      setFlows(getStoredFlows());
    };
    window.addEventListener(FORM_FLOWS_EVENT, handleFlowsUpdate);
    window.addEventListener("storage", handleFlowsUpdate);
    return () => {
      window.removeEventListener(FORM_FLOWS_EVENT, handleFlowsUpdate);
      window.removeEventListener("storage", handleFlowsUpdate);
    };
  }, []);

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createCategory, setCreateCategory] = useState("Healthcare");
  const [createScopingRules, setCreateScopingRules] = useState<ScopingRule[]>([]);
  const [createRoles, setCreateRoles] = useState<string[]>(["admin", "manager", "reception"]);
  const [createPermissions, setCreatePermissions] = useState<FormPermissions>({
    canView: true,
    canEdit: true,
    canDelete: false,
    canShare: true,
  });

  // Scope & Permissions Modal State (for existing template)
  const [showScopeModal, setShowScopeModal] = useState(false);
  const [scopingTargetForm, setScopingTargetForm] = useState<Form | null>(null);
  const [pendingScopingRules, setPendingScopingRules] = useState<ScopingRule[]>([]);
  const [pendingRoles, setPendingRoles] = useState<string[]>([]);
  const [pendingPermissions, setPendingPermissions] = useState<FormPermissions>({
    canView: true,
    canEdit: true,
    canDelete: false,
    canShare: true,
  });

  // Sync with storage changes
  useEffect(() => {
    const handleUpdate = () => {
      setForms(getStoredForms());
    };
    window.addEventListener(WEB_FORMS_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(WEB_FORMS_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const availableIndustriesForFilter = useMemo(() => {
    if (selectedCategoryFilter === "All") {
      return Array.from(new Set(INITIAL_INDUSTRIES.map((i) => i.name)));
    }
    return getIndustriesForCategory(selectedCategoryFilter);
  }, [selectedCategoryFilter]);

  // Filter forms list
  const filteredForms = useMemo(() => {
    return forms.filter((f) => {
      // 1. Status filter
      if (selectedStatusFilter !== "all" && f.status !== selectedStatusFilter) {
        return false;
      }

      // 2. Admin Scope match
      const matchesScope = isFormMatchingScope(f, {
        category: selectedCategoryFilter,
        industry: selectedIndustryFilter,
        location: selectedLocationFilter,
      });
      if (!matchesScope) return false;

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = f.name.toLowerCase().includes(q);
        const descMatch = (f.description || "").toLowerCase().includes(q);
        const catMatch = (f.category || "").toLowerCase().includes(q);
        if (!nameMatch && !descMatch && !catMatch) return false;
      }

      return true;
    });
  }, [
    forms,
    selectedStatusFilter,
    selectedCategoryFilter,
    selectedIndustryFilter,
    selectedLocationFilter,
    searchQuery,
  ]);

  // Filter flows list
  const filteredFlows = useMemo(() => {
    return flows.filter((fl) => {
      if (flowStatusFilter === "active" && fl.enabled === false) return false;
      if (flowStatusFilter === "draft" && fl.enabled !== false) return false;
      if (flowCategoryFilter !== "All" && fl.category !== flowCategoryFilter) return false;
      if (flowSearchQuery.trim()) {
        const q = flowSearchQuery.toLowerCase();
        const matchName = fl.name.toLowerCase().includes(q);
        const matchDesc = (fl.description || "").toLowerCase().includes(q);
        const matchCat = (fl.category || "").toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchCat) return false;
      }
      return true;
    });
  }, [flows, flowStatusFilter, flowCategoryFilter, flowSearchQuery]);

  // Handlers
  const handleOpenCreateModal = () => {
    setIsCreateFormDrawerOpen(true);
  };

  const handleContinueToFlowBuilder = () => {
    if (!createName.trim()) {
      toast.error("Please enter a form name before continuing to Flow Builder.");
      return;
    }

    const newForm: Form = {
      id: Date.now(),
      name: createName.trim(),
      description: createDescription.trim(),
      formType: "standard",
      createdBy: "Admin User",
      fieldCount: 0,
      fields: [],
      status: "draft",
      submissions: 0,
      enabled: false,
      createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      lastUpdated: new Date().toISOString(),
      category: createCategory,
      scopingRules: createScopingRules.length > 0 ? createScopingRules : undefined,
      roles: createRoles,
      permissions: createPermissions,
    };

    saveForm(newForm);
    setIsCreateModalOpen(false);
    toast.success(`Form template "${newForm.name}" created!`);

    // Open directly in Form Builder Side Drawer
    setActiveBuilderForm(newForm);
    setIsBuilderDrawerOpen(true);
  };

  const handleEditInBuilder = (form: Form) => {
    setActiveBuilderForm(form);
    setIsBuilderDrawerOpen(true);
  };

  const handleOpenScopeModal = (form: Form) => {
    setScopingTargetForm(form);
    setPendingScopingRules(form.scopingRules ? [...form.scopingRules] : []);
    setPendingRoles(form.roles ? [...form.roles] : ["admin", "manager", "reception"]);
    setPendingPermissions(
      form.permissions || {
        canView: true,
        canEdit: true,
        canDelete: false,
        canShare: true,
      }
    );
    setShowScopeModal(true);
  };

  const handleSaveScopeModal = () => {
    if (!scopingTargetForm) return;

    const updated: Form = {
      ...scopingTargetForm,
      scopingRules: pendingScopingRules,
      roles: pendingRoles,
      permissions: pendingPermissions,
      lastUpdated: new Date().toISOString(),
    };

    saveForm(updated);
    toast.success(`Scope and permissions updated for "${updated.name}" ✓`);
    setShowScopeModal(false);
    setScopingTargetForm(null);
  };

  const handleDuplicate = (form: Form) => {
    const copy: Form = {
      ...form,
      id: Date.now(),
      name: `${form.name} (Copy)`,
      status: "draft",
      submissions: 0,
      createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      lastUpdated: new Date().toISOString(),
      createdBy: "Admin User",
    };
    saveForm(copy);
    toast.success(`Duplicated "${form.name}" successfully!`);
  };

  const handleToggleStatus = (form: Form) => {
    const nextStatus = form.status === "live" ? "draft" : "live";
    const updated: Form = {
      ...form,
      status: nextStatus,
      enabled: nextStatus === "live",
      lastUpdated: new Date().toISOString(),
    };
    saveForm(updated);
    toast.success(`Form "${form.name}" marked as ${nextStatus.toUpperCase()}`);
  };

  const handleDelete = (form: Form) => {
    deleteForm(form.id);
    toast.success(`Template "${form.name}" deleted.`);
  };

  // Helper for scope summary pill
  const renderScopeSummary = (form: Form) => {
    const rules = form.scopingRules || [];
    if (rules.length === 0) {
      return (
        <span className="text-xs text-gray-600 font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
          All industries, All countries
        </span>
      );
    }

    const categories: string[] = [];
    const industries: string[] = [];
    const locations: string[] = [];

    for (const r of rules) {
      if (r.industryCategory && r.industryCategory !== "All" && !categories.includes(r.industryCategory)) {
        categories.push(r.industryCategory);
      }
      if (r.industries && r.industries.length > 0) {
        for (const ind of r.industries) {
          if (ind && ind !== "All" && !industries.includes(ind)) industries.push(ind);
        }
      }
      if (r.locations && r.locations.length > 0) {
        for (const loc of r.locations) {
          if (loc && loc !== "All" && !locations.includes(loc)) locations.push(loc);
        }
      }
    }

    const indCount = industries.length > 0 ? industries.length : INITIAL_INDUSTRIES.length;
    const locCount = locations.length > 0 ? locations.length : STANDARD_LOCATIONS.length;

    return (
      <span className="text-xs text-gray-600 font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
        {indCount} {indCount === 1 ? "industry" : "industries"}, {locCount} {locCount === 1 ? "country" : "countries"}
      </span>
    );
  };

  // Table Columns (Roles & Permissions and Status removed, remaining columns share width evenly)
  const columns: TableColumn<Form>[] = [
    {
      id: "name",
      header: "Template Name",
      align: "left",
      width: "45%",
      render: (f) => (
        <span
          onClick={() => handleEditInBuilder(f)}
          className="font-semibold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer text-xs sm:text-sm block truncate"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {f.name}
        </span>
      ),
    },
    {
      id: "scope",
      header: "Scope",
      align: "left",
      width: "35%",
      render: (f) => renderScopeSummary(f),
    },
    {
      id: "fields",
      header: "Fields",
      align: "left",
      width: "10%",
      render: (f) => {
        const count = f.fieldCount ?? (f.fields ? f.fields.length : 0);
        return (
          <span
            className="px-2 py-0.5 text-xs font-semibold rounded-md bg-gray-100 text-gray-700 border border-gray-200 inline-block"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {count} {count === 1 ? "field" : "fields"}
          </span>
        );
      },
    },
    {
      id: "updated",
      header: "Created / Updated",
      align: "left",
      width: "10%",
      render: (f) => (
        <span className="text-xs text-gray-600 font-medium block truncate" style={{ fontFamily: "Outfit, sans-serif" }}>
          {f.createdAt || "Recent"}
        </span>
      ),
    },
  ];

  const rowActions: TableRowAction<Form>[] = [
    {
      label: "Edit in Flow Builder",
      icon: <Pencil className="w-3.5 h-3.5 text-blue-600" />,
      onClick: (f) => handleEditInBuilder(f),
    },
    {
      label: "Scope & Permissions",
      icon: <Shield className="w-3.5 h-3.5 text-indigo-600" />,
      onClick: (f) => handleOpenScopeModal(f),
    },
    {
      label: "Duplicate Template",
      icon: <Copy className="w-3.5 h-3.5 text-gray-600" />,
      onClick: (f) => handleDuplicate(f),
    },
    {
      label: "Toggle Live / Draft",
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      onClick: (f) => handleToggleStatus(f),
    },
    {
      label: "Delete",
      icon: <Trash2 className="w-3.5 h-3.5 text-red-500" />,
      onClick: (f) => handleDelete(f),
    },
  ];

  // ── Form Flow Columns & Actions ──
  const flowColumns: TableColumn<FormFlow>[] = [
    {
      id: "name",
      header: "Flow Name",
      align: "left",
      render: (flow) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span
              className="font-semibold text-slate-900 text-xs hover:underline cursor-pointer"
              style={{ fontFamily: "DM Sans, sans-serif" }}
              onClick={() => setDrawerFlow(flow)}
            >
              {flow.name}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-100">
              <FileText className="w-3 h-3" />
              {flow.steps.length} {flow.steps.length === 1 ? "step" : "steps"}
            </span>
          </div>
          {flow.description && (
            <p className="text-[11px] text-slate-500 truncate max-w-[340px]">{flow.description}</p>
          )}
        </div>
      ),
    },
    {
      id: "category",
      header: "Category",
      align: "left",
      render: (flow) => (
        <span className="text-xs text-slate-700 font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
          {flow.category || "General"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      align: "center",
      render: (flow) => {
        const isLive = flow.enabled !== false;
        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
              isLive
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-slate-100 text-slate-600 border border-slate-200"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-green-500" : "bg-slate-400"}`} />
            {isLive ? "Live" : "Draft"}
          </span>
        );
      },
    },
    {
      id: "createdAt",
      header: "Created",
      align: "right",
      render: (flow) => (
        <span className="text-xs text-slate-500" style={{ fontFamily: "JetBrains Mono, monospace" }}>
          {flow.createdAt}
        </span>
      ),
    },
  ];

  const flowRowActions: TableRowAction<FormFlow>[] = [
    {
      label: "Configure Steps",
      icon: <Pencil className="w-3.5 h-3.5 text-blue-600" />,
      onClick: (fl) => setActiveFlow(fl),
    },
    {
      label: "Preview & Details",
      icon: <Eye className="w-3.5 h-3.5 text-slate-600" />,
      onClick: (fl) => setDrawerFlow(fl),
    },
    {
      label: "Duplicate",
      icon: <Copy className="w-3.5 h-3.5 text-slate-600" />,
      onClick: (fl) => {
        const copy: FormFlow = {
          ...fl,
          id: Date.now(),
          name: `${fl.name} (Copy)`,
          createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        };
        const updated = [copy, ...flows];
        setFlows(updated);
        saveStoredFlows(updated);
        toast.success(`Duplicated "${fl.name}"`);
      },
    },
    {
      label: "Toggle Status",
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />,
      onClick: (fl) => {
        const nextEnabled = fl.enabled === false ? true : false;
        const updatedFlow = { ...fl, enabled: nextEnabled };
        const updated = flows.map((f) => (f.id === fl.id ? updatedFlow : f));
        setFlows(updated);
        saveStoredFlows(updated);
        toast.success(`Flow "${fl.name}" set to ${nextEnabled ? "Live" : "Draft"}`);
      },
    },
    {
      label: "Delete",
      icon: <Trash2 className="w-3.5 h-3.5 text-red-500" />,
      onClick: (fl) => {
        if (window.confirm(`Are you sure you want to delete form flow "${fl.name}"?`)) {
          const updated = flows.filter((f) => f.id !== fl.id);
          setFlows(updated);
          saveStoredFlows(updated);
          deleteStoredFlow(fl.id);
          toast.success(`Form flow "${fl.name}" deleted.`);
        }
      },
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="px-10 sm:px-12 py-7.5 sm:py-8 w-full space-y-7">
        {/* Page Header */}
        <PageHeader
          title={subTab === "forms" ? "Form Templates" : "Form Flows"}
          subtitle={
            subTab === "forms"
              ? "Manage standardized form templates, define industry scope rules, and establish role-based access permissions."
              : "Sequence multiple forms into automated guided step-by-step experiences for clients."
          }
          badge={subTab === "forms" ? `${filteredForms.length} Templates` : `${filteredFlows.length} Flows`}
        />

        {/* ── Sub-tab Switcher: Forms vs Form Flows ── */}
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <button
            type="button"
            onClick={() => {
              setSubTab("forms");
              setActiveFlow(null);
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              subTab === "forms"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Forms ({forms.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setSubTab("flows");
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              subTab === "flows"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <GitMerge className="w-3.5 h-3.5" />
            <span>Form Flows ({flows.length})</span>
          </button>
        </div>

        {/* ── FORMS TAB ── */}
        {subTab === "forms" && (
          <div className="space-y-4">
            {/* Reordered Toolbar: Search first, then compact filters, then New Form on the far right */}
            <div className="bg-white p-2.5 px-3.5 border border-[#E2E8F0] rounded-xl shadow-xs flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 min-w-0">
              {/* Left: Search (max-w ~360px) + 12px gap + Compact Filters (8px gap) */}
              <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap lg:flex-nowrap">
                {/* Search Input */}
                <div className="relative flex-1 max-w-[360px] min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search form templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-9 pl-9 pr-8 bg-[#F8FAFC] hover:bg-white focus:bg-white border border-[#E2E8F0] rounded-lg text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A] p-0.5 rounded cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Compact Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Category Filter */}
                  <div className="relative inline-flex items-center">
                    <select
                      value={selectedCategoryFilter}
                      onChange={(e) => {
                        setSelectedCategoryFilter(e.target.value);
                        setSelectedIndustryFilter("All");
                      }}
                      className={`h-8 pl-3 pr-7 appearance-none rounded-lg text-[13px] font-medium border cursor-pointer outline-none transition-all w-auto max-w-[160px] min-w-[120px] truncate ${
                        selectedCategoryFilter !== "All"
                          ? "bg-[#F1F5F9] text-[#0F172A] font-semibold border-[#CBD5E1]"
                          : "bg-white text-gray-700 border-[#E2E8F0] hover:bg-[#F8FAFC]"
                      } focus:ring-2 focus:ring-[#2563EB] focus:border-transparent`}
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <option value="All">All Categories</option>
                      {INITIAL_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-[#64748B] pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                  </div>

                  {/* Industry Filter */}
                  <div className="relative inline-flex items-center">
                    <select
                      value={selectedIndustryFilter}
                      onChange={(e) => setSelectedIndustryFilter(e.target.value)}
                      className={`h-8 pl-3 pr-7 appearance-none rounded-lg text-[13px] font-medium border cursor-pointer outline-none transition-all w-auto max-w-[160px] min-w-[120px] truncate ${
                        selectedIndustryFilter !== "All"
                          ? "bg-[#F1F5F9] text-[#0F172A] font-semibold border-[#CBD5E1]"
                          : "bg-white text-gray-700 border-[#E2E8F0] hover:bg-[#F8FAFC]"
                      } focus:ring-2 focus:ring-[#2563EB] focus:border-transparent`}
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <option value="All">All Industries</option>
                      {availableIndustriesForFilter.map((ind) => (
                        <option key={ind} value={ind}>
                          {ind}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-[#64748B] pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                  </div>

                  {/* Location Filter */}
                  <div className="relative inline-flex items-center">
                    <select
                      value={selectedLocationFilter}
                      onChange={(e) => setSelectedLocationFilter(e.target.value)}
                      className={`h-8 pl-3 pr-7 appearance-none rounded-lg text-[13px] font-medium border cursor-pointer outline-none transition-all w-auto max-w-[160px] min-w-[120px] truncate ${
                        selectedLocationFilter !== "All"
                          ? "bg-[#F1F5F9] text-[#0F172A] font-semibold border-[#CBD5E1]"
                          : "bg-white text-gray-700 border-[#E2E8F0] hover:bg-[#F8FAFC]"
                      } focus:ring-2 focus:ring-[#2563EB] focus:border-transparent`}
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <option value="All">All Locations</option>
                      {STANDARD_LOCATIONS.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-[#64748B] pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                  </div>

                  {/* Status Filter */}
                  <div className="relative inline-flex items-center">
                    <select
                      value={selectedStatusFilter}
                      onChange={(e) => setSelectedStatusFilter(e.target.value)}
                      className={`h-8 pl-3 pr-7 appearance-none rounded-lg text-[13px] font-medium border cursor-pointer outline-none transition-all w-auto max-w-[150px] min-w-[115px] truncate ${
                        selectedStatusFilter !== "all"
                          ? "bg-[#F1F5F9] text-[#0F172A] font-semibold border-[#CBD5E1]"
                          : "bg-white text-gray-700 border-[#E2E8F0] hover:bg-[#F8FAFC]"
                      } focus:ring-2 focus:ring-[#2563EB] focus:border-transparent`}
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <option value="all">All Statuses</option>
                      <option value="live">Live Only</option>
                      <option value="draft">Draft Only</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-[#64748B] pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              {/* Right: New Form Button */}
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="h-9 px-4 rounded-lg bg-black hover:bg-black/90 text-white text-[13px] font-medium flex items-center justify-center gap-1.5 shrink-0 shadow-2xs cursor-pointer transition-colors ml-auto lg:ml-0"
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                <Plus className="w-4 h-4" />
                <span>New Form</span>
              </button>
            </div>

            {/* Templates Table View */}
            <TableComponent
              data={filteredForms}
              columns={columns}
              getRowId={(f) => String(f.id)}
              rowActions={rowActions}
              onRowClick={(f) => handleEditInBuilder(f)}
              defaultRowsPerPage={10}
              emptyMessage="No form templates found matching your filters. Click '+ New Form' to create one."
              tableId="admin-form-templates-table"
            />
          </div>
        )}

        {/* ── FORM FLOWS TAB ── */}
        {subTab === "flows" && (
          <div className="space-y-4">
            {/* Flow Step Editor if activeFlow is selected */}
            {activeFlow !== null ? (
              <div className="space-y-6">
                {/* Header row */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => {
                        setActiveFlow(null);
                        setEditingFlowName(false);
                        setAddStepOpen(false);
                      }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Form Flows</span>
                    </button>
                    <span className="text-slate-300">·</span>
                    {editingFlowName ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={flowNameDraft}
                          onChange={(e) => setFlowNameDraft(e.target.value)}
                          onBlur={() => {
                            if (flowNameDraft.trim()) {
                              const updated = { ...activeFlow, name: flowNameDraft.trim() };
                              setActiveFlow(updated);
                              const newFlows = flows.map((f) => (f.id === updated.id ? updated : f));
                              setFlows(newFlows);
                              saveStoredFlows(newFlows);
                            }
                            setEditingFlowName(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              if (flowNameDraft.trim()) {
                                const updated = { ...activeFlow, name: flowNameDraft.trim() };
                                setActiveFlow(updated);
                                const newFlows = flows.map((f) => (f.id === updated.id ? updated : f));
                                setFlows(newFlows);
                                saveStoredFlows(newFlows);
                              }
                              setEditingFlowName(false);
                            }
                            if (e.key === "Escape") setEditingFlowName(false);
                          }}
                          className="px-2 py-1 border border-slate-300 rounded-lg text-sm font-bold bg-white text-slate-900 outline-none"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingFlowName(true);
                          setFlowNameDraft(activeFlow.name);
                        }}
                        className="flex items-center gap-2 group cursor-pointer text-left"
                      >
                        <h2 className="text-base font-bold text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                          {activeFlow.name}
                        </h2>
                        <Pencil className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
                      </button>
                    )}
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-50 text-purple-700 rounded-md border border-purple-100">
                      {activeFlow.category || "General"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDrawerFlow(activeFlow)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview & Embed</span>
                    </button>
                  </div>
                </div>

                {/* Steps sequence container */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Flow Sequence ({activeFlow.steps.length} Steps)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Form templates respondents will complete sequentially in this flow.
                      </p>
                    </div>
                    <button
                      onClick={() => setAddStepOpen(true)}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-black transition-colors flex items-center gap-1 cursor-pointer"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Step</span>
                    </button>
                  </div>

                  {/* Steps List */}
                  {activeFlow.steps.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                      <p className="text-xs text-slate-500">
                        No form steps added yet. Click "Add Step" to select a template form.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {activeFlow.steps.map((step, idx) => {
                        const stepForm = forms.find((f) => f.id === step.formId);
                        return (
                          <div
                            key={`${step.formId}-${idx}`}
                            className="flex items-center justify-between p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0">
                                {idx + 1}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-900 truncate" style={{ fontFamily: "Outfit, sans-serif" }}>
                                  {stepForm?.name ?? `Form #${step.formId}`}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  {stepForm?.category || "Healthcare"} · {stepForm?.fields?.length || 0} fields
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                                <input
                                  type="checkbox"
                                  checked={step.required}
                                  onChange={(e) => {
                                    const newSteps = activeFlow.steps.map((s, i) =>
                                      i === idx ? { ...s, required: e.target.checked } : s
                                    );
                                    const updated = { ...activeFlow, steps: newSteps };
                                    setActiveFlow(updated);
                                    const newFlows = flows.map((f) => (f.id === updated.id ? updated : f));
                                    setFlows(newFlows);
                                    saveStoredFlows(newFlows);
                                  }}
                                  className="rounded border-slate-300"
                                />
                                <span className="text-slate-600 font-medium">Required</span>
                              </label>

                              {/* Move Up */}
                              {idx > 0 && (
                                <button
                                  onClick={() => {
                                    const newSteps = [...activeFlow.steps];
                                    const temp = newSteps[idx - 1];
                                    newSteps[idx - 1] = newSteps[idx];
                                    newSteps[idx] = temp;
                                    const updated = { ...activeFlow, steps: newSteps };
                                    setActiveFlow(updated);
                                    const newFlows = flows.map((f) => (f.id === updated.id ? updated : f));
                                    setFlows(newFlows);
                                    saveStoredFlows(newFlows);
                                  }}
                                  className="px-1.5 py-0.5 text-xs text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded cursor-pointer"
                                  title="Move up"
                                >
                                  ↑
                                </button>
                              )}

                              {/* Move Down */}
                              {idx < activeFlow.steps.length - 1 && (
                                <button
                                  onClick={() => {
                                    const newSteps = [...activeFlow.steps];
                                    const temp = newSteps[idx + 1];
                                    newSteps[idx + 1] = newSteps[idx];
                                    newSteps[idx] = temp;
                                    const updated = { ...activeFlow, steps: newSteps };
                                    setActiveFlow(updated);
                                    const newFlows = flows.map((f) => (f.id === updated.id ? updated : f));
                                    setFlows(newFlows);
                                    saveStoredFlows(newFlows);
                                  }}
                                  className="px-1.5 py-0.5 text-xs text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded cursor-pointer"
                                  title="Move down"
                                >
                                  ↓
                                </button>
                              )}

                              {/* Remove Step */}
                              <button
                                onClick={() => {
                                  const newSteps = activeFlow.steps.filter((_, i) => i !== idx);
                                  const updated = { ...activeFlow, steps: newSteps };
                                  setActiveFlow(updated);
                                  const newFlows = flows.map((f) => (f.id === updated.id ? updated : f));
                                  setFlows(newFlows);
                                  saveStoredFlows(newFlows);
                                  toast.success("Step removed from flow");
                                }}
                                className="p-1 text-red-400 hover:text-red-600 rounded cursor-pointer"
                                title="Remove step"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add Step Dialog inline */}
                  {addStepOpen && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 mt-3">
                      <p className="text-xs font-semibold text-slate-800">Add Existing Form Template to Flow</p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <select
                          value={selectedFormIdToAdd ?? ""}
                          onChange={(e) => setSelectedFormIdToAdd(e.target.value ? Number(e.target.value) : null)}
                          className="flex-1 min-w-[200px] h-9 px-3 text-xs border border-slate-200 rounded-lg bg-white outline-none"
                        >
                          <option value="">Select a form template...</option>
                          {forms.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name} ({f.category || "General"})
                            </option>
                          ))}
                        </select>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isStepRequiredToAdd}
                            onChange={(e) => setIsStepRequiredToAdd(e.target.checked)}
                            className="rounded border-slate-300"
                          />
                          <span className="text-slate-700 font-medium">Required step</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setAddStepOpen(false);
                              setSelectedFormIdToAdd(null);
                            }}
                            className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-white cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            disabled={!selectedFormIdToAdd}
                            onClick={() => {
                              if (!selectedFormIdToAdd) return;
                              const newSteps = [
                                ...activeFlow.steps,
                                { formId: selectedFormIdToAdd, required: isStepRequiredToAdd },
                              ];
                              const updated = { ...activeFlow, steps: newSteps };
                              setActiveFlow(updated);
                              const newFlows = flows.map((f) => (f.id === updated.id ? updated : f));
                              setFlows(newFlows);
                              saveStoredFlows(newFlows);
                              setAddStepOpen(false);
                              setSelectedFormIdToAdd(null);
                              toast.success("Step added to flow");
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-black disabled:opacity-50 cursor-pointer"
                          >
                            Add Step
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Flows list view */
              <div className="space-y-4">
                {/* Flows Toolbar */}
                <div className="bg-white p-2.5 px-3.5 border border-[#E2E8F0] rounded-xl shadow-xs flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap lg:flex-nowrap">
                    <div className="relative flex-1 max-w-[360px] min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search form flows..."
                        value={flowSearchQuery}
                        onChange={(e) => setFlowSearchQuery(e.target.value)}
                        className="w-full h-9 pl-9 pr-8 bg-[#F8FAFC] hover:bg-white focus:bg-white border border-[#E2E8F0] rounded-lg text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      />
                      {flowSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setFlowSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A] p-0.5 rounded cursor-pointer"
                          title="Clear search"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Category Filter */}
                    <div className="relative inline-flex items-center">
                      <select
                        value={flowCategoryFilter}
                        onChange={(e) => setFlowCategoryFilter(e.target.value)}
                        className="h-8 pl-3 pr-7 appearance-none rounded-lg text-[13px] font-medium border cursor-pointer outline-none bg-white text-gray-700 border-[#E2E8F0] hover:bg-[#F8FAFC]"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        <option value="All">All Categories</option>
                        {INITIAL_CATEGORIES.map((cat) => (
                          <option key={cat.id} value={cat.name}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-[#64748B] pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                    </div>

                    {/* Status Filter */}
                    <div className="relative inline-flex items-center">
                      <select
                        value={flowStatusFilter}
                        onChange={(e) => setFlowStatusFilter(e.target.value)}
                        className="h-8 pl-3 pr-7 appearance-none rounded-lg text-[13px] font-medium border cursor-pointer outline-none bg-white text-gray-700 border-[#E2E8F0] hover:bg-[#F8FAFC]"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        <option value="all">All Statuses</option>
                        <option value="active">Active Only</option>
                        <option value="draft">Draft Only</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-[#64748B] pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {/* Right: + New Form Flow Button */}
                  <button
                    type="button"
                    onClick={() => setIsCreateFlowDrawerOpen(true)}
                    className="h-9 px-4 rounded-lg bg-black hover:bg-black/90 text-white text-[13px] font-medium flex items-center justify-center gap-1.5 shrink-0 shadow-2xs cursor-pointer transition-colors ml-auto lg:ml-0"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Form Flow</span>
                  </button>
                </div>

                {/* Form Flows Table View */}
                <TableComponent
                  data={filteredFlows}
                  columns={flowColumns}
                  getRowId={(fl) => String(fl.id)}
                  rowActions={flowRowActions}
                  onRowClick={(fl) => setActiveFlow(fl)}
                  defaultRowsPerPage={10}
                  emptyMessage="No form flows found. Click '+ New Form Flow' to sequence form templates."
                  tableId="admin-form-flows-table"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── CREATE FORM TEMPLATE SIDE DRAWER ──────────────────────────────── */}
      <FormCreateDrawer
        isOpen={isCreateFormDrawerOpen}
        onClose={() => setIsCreateFormDrawerOpen(false)}
        onContinueToBuilder={(newForm) => {
          setForms(getStoredForms());
          setActiveBuilderForm(newForm);
          setIsBuilderDrawerOpen(true);
        }}
        isAdmin={true}
      />

      {/* ─── CREATE FORM FLOW SIDE DRAWER ─────────────────────────────────── */}
      <FormFlowCreateDrawer
        isOpen={isCreateFlowDrawerOpen}
        onClose={() => setIsCreateFlowDrawerOpen(false)}
        onCreated={(newFlow) => {
          const updated = [newFlow, ...flows.filter((f) => f.id !== newFlow.id)];
          setFlows(updated);
          saveStoredFlows(updated);
          setDrawerFlow(newFlow);
        }}
        availableForms={forms}
        isAdmin={true}
      />

      {/* ─── FORM FLOW DETAIL DRAWER ─────────────────────────────────────── */}
      <FormFlowDrawer
        flow={drawerFlow}
        forms={forms}
        onClose={() => setDrawerFlow(null)}
        onEdit={(fl) => {
          setDrawerFlow(null);
          setActiveFlow(fl);
        }}
        onOpenPreview={(fl) => {
          setDrawerFlow(null);
          setActiveFlow(fl);
        }}
      />

      {/* ─── SCOPE & PERMISSIONS CONFIGURATION MODAL (EXISTING FORM) ───────── */}
      {showScopeModal && scopingTargetForm && (
        <Modal
          isOpen={showScopeModal}
          onClose={() => {
            setShowScopeModal(false);
            setScopingTargetForm(null);
          }}
          title={`Scope & Permissions: ${scopingTargetForm.name}`}
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => {
                  setShowScopeModal(false);
                  setScopingTargetForm(null);
                }}
                className="text-xs font-semibold"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveScopeModal}
                className="text-xs font-semibold"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Save Changes
              </Button>
            </div>
          }
        >
          <div className="space-y-4 py-1 text-left">
            <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
              Configure industry visibility rules and role-based permissions for this form template.
            </p>

            <AdminControlAccordion
              scopingRules={pendingScopingRules}
              onScopingRulesChange={setPendingScopingRules}
              allowEntities={false}
              scopeTooltip="Define industry categories, industries, and locations that can access this form template."
              permissionsTooltip="Configure assigned user roles and granular action permissions for this form."
              defaultAdminControlOpen={true}
              defaultScopeOpen={true}
              defaultPermissionsOpen={true}
              permissionsContent={
                <div className="space-y-4">
                  {/* Role Assignment */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Allowed Roles
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {AVAILABLE_ROLES.map((role) => {
                        const isSelected = pendingRoles.includes(role.id);
                        return (
                          <label
                            key={role.id}
                            className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
                              isSelected ? "border-blue-400 bg-blue-50/40" : "border-gray-200 bg-gray-50/30 hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setPendingRoles((prev) =>
                                  isSelected ? prev.filter((r) => r !== role.id) : [...prev, role.id]
                                );
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer mt-0.5"
                            />
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-gray-800 block" style={{ fontFamily: "Outfit, sans-serif" }}>
                                {role.label}
                              </span>
                              <span className="text-[11px] text-gray-500 block truncate" style={{ fontFamily: "Outfit, sans-serif" }}>
                                {role.desc}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Permission Flags */}
                  <div className="pt-2 border-t border-gray-100">
                    <label className="block text-xs font-semibold text-gray-700 mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Role Permissions
                    </label>
                    <div className="flex items-center gap-5 flex-wrap">
                      <label className="flex items-center gap-1.5 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pendingPermissions.canView !== false}
                          onChange={(e) =>
                            setPendingPermissions((prev) => ({ ...prev, canView: e.target.checked }))
                          }
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-xs font-medium text-gray-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                          Can View
                        </span>
                      </label>

                      <label className="flex items-center gap-1.5 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pendingPermissions.canEdit !== false}
                          onChange={(e) =>
                            setPendingPermissions((prev) => ({ ...prev, canEdit: e.target.checked }))
                          }
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-xs font-medium text-gray-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                          Can Edit
                        </span>
                      </label>

                      <label className="flex items-center gap-1.5 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pendingPermissions.canShare !== false}
                          onChange={(e) =>
                            setPendingPermissions((prev) => ({ ...prev, canShare: e.target.checked }))
                          }
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-xs font-medium text-gray-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                          Can Share / Embed
                        </span>
                      </label>

                      <label className="flex items-center gap-1.5 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pendingPermissions.canDelete === true}
                          onChange={(e) =>
                            setPendingPermissions((prev) => ({ ...prev, canDelete: e.target.checked }))
                          }
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-xs font-medium text-gray-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                          Can Delete
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              }
            />
          </div>
        </Modal>
      )}

      {/* ─── FORM BUILDER SIDE DRAWER ────────────────────────────────────────── */}
      <FormBuilderDrawer
        isOpen={isBuilderDrawerOpen}
        onClose={() => {
          setIsBuilderDrawerOpen(false);
          setActiveBuilderForm(null);
        }}
        initialForm={activeBuilderForm}
        returnTo="/admin/forms"
        onSaveSuccess={(savedForm) => {
          setForms(getStoredForms());
        }}
      />
    </div>
  );
}

