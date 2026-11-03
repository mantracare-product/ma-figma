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
import { AdminScopingRulesEditor } from "./components/AdminScopingRulesEditor";
import { AdminControlAccordion } from "./components/AdminControlAccordion";
import FormBuilderDrawer from "../../components/form-builder/FormBuilderDrawer";
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

  // Handlers
  const handleOpenCreateModal = () => {
    setCreateName("");
    setCreateDescription("");
    setCreateCategory(selectedCategoryFilter !== "All" ? selectedCategoryFilter : "Healthcare");
    setCreateScopingRules([]);
    setCreateRoles(["admin", "manager", "reception"]);
    setCreatePermissions({
      canView: true,
      canEdit: true,
      canDelete: false,
      canShare: true,
    });
    setIsCreateModalOpen(true);
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

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="px-10 sm:px-12 py-7.5 sm:py-8 w-full space-y-7">
        {/* Page Header */}
        <PageHeader
          title="Form Templates"
          subtitle="Manage standardized form templates, define industry scope rules, and establish role-based access permissions."
          badge={`${filteredForms.length} Templates`}
        />

        {/* Reordered Toolbar: Search first, then compact filters, then New Form on the far right */}
        <div className="bg-white p-2.5 px-3.5 border border-[#E2E8F0] rounded-xl shadow-xs flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 min-w-0">
          {/* Left: Search (max-w ~360px) + 12px gap + Compact Filters (8px gap) */}
          <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap lg:flex-nowrap">
            {/* Search Input (flexible up to 360px, height matching New Form button 36px) */}
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

            {/* Compact Filters: 8px gap between filters, height 32px, 13px font, weight 500, 8px radius */}
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

          {/* Right: New Form Button (height matches search input: 36px, h-9) */}
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

      {/* ─── CREATE FORM TEMPLATE MODAL ────────────────────────────────────── */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Form Template"
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              className="text-xs font-semibold"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleContinueToFlowBuilder}
              className="text-xs font-semibold flex items-center gap-1.5"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <span>Continue to Flow Builder</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        }
      >
        <div className="space-y-5 py-1 text-left">
          {/* Subtitle / Intro */}
          <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
            Configure basic details, industry scope, and role permissions. You will then proceed directly to the Flow Builder to arrange fields.
          </p>

          {/* Form Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
              Form Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="e.g. New Patient Health History, Client Intake Form..."
              className="w-full text-xs"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
              Description
            </label>
            <textarea
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              placeholder="Describe the purpose of this form and instructions for respondents..."
              rows={2}
              className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
          </div>

          {/* Admin Control (Scope Rules & Roles & Permissions) */}
          <div className="pt-2">
            <AdminControlAccordion
              scopingRules={createScopingRules}
              onScopingRulesChange={setCreateScopingRules}
              allowEntities={false}
              scopeTooltip="Define industry categories, industries, and locations that can access this form template."
              permissionsTooltip="Configure assigned user roles and granular action permissions for this form."
              defaultAdminControlOpen={true}
              defaultScopeOpen={true}
              defaultPermissionsOpen={false}
              permissionsContent={
                <div className="space-y-4">
                  {/* Role Assignment */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Allowed Roles
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {AVAILABLE_ROLES.map((role) => {
                        const isSelected = createRoles.includes(role.id);
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
                                setCreateRoles((prev) =>
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
                          checked={createPermissions.canView !== false}
                          onChange={(e) =>
                            setCreatePermissions((prev) => ({ ...prev, canView: e.target.checked }))
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
                          checked={createPermissions.canEdit !== false}
                          onChange={(e) =>
                            setCreatePermissions((prev) => ({ ...prev, canEdit: e.target.checked }))
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
                          checked={createPermissions.canShare !== false}
                          onChange={(e) =>
                            setCreatePermissions((prev) => ({ ...prev, canShare: e.target.checked }))
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
                          checked={createPermissions.canDelete === true}
                          onChange={(e) =>
                            setCreatePermissions((prev) => ({ ...prev, canDelete: e.target.checked }))
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
        </div>
      </Modal>

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

