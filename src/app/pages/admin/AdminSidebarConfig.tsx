import React, { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  Globe,
  Copy,
  Search,
  Filter,
  CheckCircle2,
  LayoutTemplate,
  Stethoscope,
  GitBranch,
} from "lucide-react";
import PageHeader from "../../components/layout/PageHeader";
import PageTopBar from "../../components/layout/PageTopBar";
import TableComponent, { TableColumn, TableRowAction } from "../../components/ui/TableComponent";
import { Modal } from "../../components/ui/Modal";
import SidebarTemplateDrawer from "./components/SidebarTemplateDrawer";
import { AdminControlAccordion } from "./components/AdminControlAccordion";
import {
  AdminSidebarTemplate,
  getStoredSidebarTemplates,
  saveSidebarTemplate,
  deleteSidebarTemplate,
  isSidebarTemplateMatchingScope,
  SIDEBAR_TEMPLATES_EVENT,
} from "../../../lib/sidebarTemplateStore";
import {
  INITIAL_CATEGORIES,
  INITIAL_INDUSTRIES,
  STANDARD_LOCATIONS,
  getIndustriesForCategory,
} from "../../../data/industryReferenceData";
import { ScopingRule } from "../../../lib/useProcessStore";
import { toast } from "sonner";

function getScopingTags(item: {
  scopingRules?: ScopingRule[];
}) {
  if (item.scopingRules && item.scopingRules.length > 0) {
    const categories: string[] = [];
    const industries: string[] = [];
    const locations: string[] = [];

    for (const r of item.scopingRules) {
      if (r.industryCategory && r.industryCategory !== "All") {
        if (!categories.includes(r.industryCategory)) categories.push(r.industryCategory);
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

    return {
      categories: categories.length > 0 ? categories : ["All"],
      industries: industries.length > 0 ? industries : ["All"],
      locations: locations.length > 0 ? locations : ["All"],
    };
  }

  return { categories: ["All"], industries: ["All"], locations: ["All"] };
}

function renderScopeCell(item: {
  scopingRules?: ScopingRule[];
}) {
  const rules = item.scopingRules || [];
  if (rules.length === 0) {
    return (
      <span className="text-xs text-gray-600 font-medium">
        All industries, All countries
      </span>
    );
  }

  const scoping = getScopingTags(item);
  const isAllCats = scoping.categories.includes("All") || scoping.categories.length === 0;
  const isAllInds = scoping.industries.includes("All") || scoping.industries.length === 0;
  const isAllLocs = scoping.locations.includes("All") || scoping.locations.length === 0;

  let indCount = scoping.industries.filter((i) => i !== "All").length;
  if (isAllInds) {
    if (!isAllCats) {
      let totalInCats = 0;
      for (const c of scoping.categories) {
        totalInCats += getIndustriesForCategory(c).length;
      }
      indCount = totalInCats > 0 ? totalInCats : INITIAL_INDUSTRIES.length;
    } else {
      indCount = INITIAL_INDUSTRIES.length;
    }
  }

  let locCount = scoping.locations.filter((l) => l !== "All").length;
  if (isAllLocs) {
    locCount = STANDARD_LOCATIONS.length;
  }

  return (
    <span className="text-xs text-gray-600 font-medium">
      {indCount} {indCount === 1 ? "industry" : "industries"}, {locCount} {locCount === 1 ? "country" : "countries"}
    </span>
  );
}

export default function AdminSidebarConfig() {
  const [templates, setTemplates] = useState<AdminSidebarTemplate[]>(getStoredSidebarTemplates);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("All");
  const [selectedIndustryFilter, setSelectedIndustryFilter] = useState<string>("All");
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>("All");

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AdminSidebarTemplate | null>(null);

  // Quick Scope Modal state
  const [showScopeModal, setShowScopeModal] = useState(false);
  const [scopingTargetTemplate, setScopingTargetTemplate] = useState<AdminSidebarTemplate | null>(null);
  const [pendingScopingRules, setPendingScopingRules] = useState<ScopingRule[]>([]);

  // Sync with store events
  useEffect(() => {
    const handleUpdate = () => {
      setTemplates(getStoredSidebarTemplates());
    };
    window.addEventListener(SIDEBAR_TEMPLATES_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(SIDEBAR_TEMPLATES_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // Dynamic industry list based on category filter
  const availableIndustriesForFilter = useMemo(() => {
    if (selectedCategoryFilter === "All") {
      return Array.from(new Set(INITIAL_INDUSTRIES.map((i) => i.name)));
    }
    return getIndustriesForCategory(selectedCategoryFilter);
  }, [selectedCategoryFilter]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      // 1. Admin Scope Match
      const matchesScope = isSidebarTemplateMatchingScope(template, {
        category: selectedCategoryFilter,
        industry: selectedIndustryFilter,
        location: selectedLocationFilter,
      });
      if (!matchesScope) return false;

      // 2. Search query match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = template.name.toLowerCase().includes(q);
        const descMatch = (template.description || "").toLowerCase().includes(q);
        const hasMatchingWorkflow = template.sections.some((s) =>
          s.items.some((i) => i.isWorkflow && i.label.toLowerCase().includes(q))
        );
        if (!nameMatch && !descMatch && !hasMatchingWorkflow) return false;
      }

      return true;
    });
  }, [templates, selectedCategoryFilter, selectedIndustryFilter, selectedLocationFilter, searchQuery]);

  // Handlers
  const handleCreateNew = () => {
    setEditingTemplate(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = (tpl: AdminSidebarTemplate) => {
    setEditingTemplate(tpl);
    setIsDrawerOpen(true);
  };

  const handleDuplicate = (tpl: AdminSidebarTemplate) => {
    const now = new Date().toISOString().replace("T", " ").substring(0, 16);
    const copy: AdminSidebarTemplate = {
      ...tpl,
      id: `tpl-${Date.now()}`,
      name: `${tpl.name} (Copy)`,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
      createdBy: "Admin User",
    };
    saveSidebarTemplate(copy);
    toast.success(`Duplicated "${tpl.name}" successfully ✓`);
  };

  const handleDelete = (tpl: AdminSidebarTemplate) => {
    if (tpl.isSystem && tpl.id === "tpl-default-global") {
      toast.error("Cannot delete the system fallback baseline template");
      return;
    }
    const ok = deleteSidebarTemplate(tpl.id);
    if (ok) {
      toast.success(`Template "${tpl.name}" deleted`);
    } else {
      toast.error("Failed to delete template");
    }
  };

  const handleOpenQuickScope = (tpl: AdminSidebarTemplate) => {
    setScopingTargetTemplate(tpl);
    setPendingScopingRules(tpl.scopingRules ? JSON.parse(JSON.stringify(tpl.scopingRules)) : []);
    setShowScopeModal(true);
  };

  const handleSaveQuickScope = () => {
    if (!scopingTargetTemplate) return;
    const updated: AdminSidebarTemplate = {
      ...scopingTargetTemplate,
      scopingRules: pendingScopingRules,
      updatedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
    };
    saveSidebarTemplate(updated);
    toast.success(`Scope rules updated for "${updated.name}" ✓`);
    setShowScopeModal(false);
    setScopingTargetTemplate(null);
  };

  // Table Columns
  const columns: TableColumn<AdminSidebarTemplate>[] = [
    {
      id: "name",
      header: "Name",
      align: "left",
      width: "28%",
      render: (tpl) => (
        <span
          onClick={() => handleEdit(tpl)}
          className="font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer text-xs sm:text-sm block truncate"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {tpl.name}
        </span>
      ),
    },
    {
      id: "scope",
      header: "Scope",
      align: "left",
      width: "24%",
      render: (tpl) => renderScopeCell(tpl),
    },
    {
      id: "sections",
      header: "Sections",
      align: "left",
      width: "12%",
      render: (tpl) => (
        <span className="text-xs font-semibold text-gray-800">
          {tpl.sections?.length || 0} sections
        </span>
      ),
    },
    {
      id: "pinnedWorkflows",
      header: "Pinned Workflows",
      align: "left",
      width: "24%",
      render: (tpl) => {
        const workflowItems = tpl.sections.flatMap((s) => s.items).filter((i) => i.isWorkflow && i.visible);

        if (workflowItems.length === 0) {
          return <span className="text-xs text-gray-400">None pinned</span>;
        }

        return (
          <div className="flex flex-wrap gap-1 max-w-xs">
            {workflowItems.map((wf) => (
              <span
                key={wf.id}
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1 truncate max-w-[170px]"
                title={wf.label}
              >
                <Stethoscope className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">{wf.label}</span>
              </span>
            ))}
          </div>
        );
      },
    },
    {
      id: "items",
      header: "Items",
      align: "left",
      width: "12%",
      render: (tpl) => {
        let visibleCount = 0;
        let totalCount = 0;
        tpl.sections.forEach((sec) => {
          sec.items.forEach((item) => {
            totalCount++;
            if (item.visible) visibleCount++;
          });
        });

        return (
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-gray-800">
              {totalCount} items
            </span>
            <span className="text-[11px] text-gray-400 block">
              {visibleCount} visible
            </span>
          </div>
        );
      },
    },
  ];

  // Row Actions
  const rowActions: TableRowAction<AdminSidebarTemplate>[] = [
    {
      label: "Edit Layout & Items",
      icon: <Pencil className="w-3.5 h-3.5" />,
      onClick: handleEdit,
    },
    {
      label: "Configure Scope Rules",
      icon: <Globe className="w-3.5 h-3.5" />,
      onClick: handleOpenQuickScope,
    },
    {
      label: "Duplicate Template",
      icon: <Copy className="w-3.5 h-3.5" />,
      onClick: handleDuplicate,
    },
    {
      label: "Delete Template",
      icon: <Trash2 className="w-3.5 h-3.5 text-red-500" />,
      isDanger: true,
      onClick: handleDelete,
      disabled: (tpl) => Boolean(tpl.isSystem && tpl.id === "tpl-default-global"),
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="px-10 sm:px-12 py-7.5 sm:py-8 w-full space-y-7">
        {/* Top Header Portaled into Admin Header */}
        <PageHeader
          title="Sidebar Navigation Templates"
          subtitle="Configure default client sidebar layouts, section order, visibility, and pinned workflows based on admin scope."
        />

        {/* Unified Action Bar powered by PageTopBar with Integrated Admin Scope Filters & Add Button */}
        <PageTopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search template names, pinned workflows, scopes..."
          leftElement={
            <div className="flex items-center gap-2 flex-wrap">
              {/* Category Filter */}
              <select
                value={selectedCategoryFilter}
                onChange={(e) => {
                  setSelectedCategoryFilter(e.target.value);
                  setSelectedIndustryFilter("All");
                }}
                className="h-[36px] px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none cursor-pointer shadow-2xs hover:border-gray-300"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <option value="All">All Categories</option>
                {INITIAL_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>

              {/* Industry Filter */}
              <select
                value={selectedIndustryFilter}
                onChange={(e) => setSelectedIndustryFilter(e.target.value)}
                className="h-[36px] px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none cursor-pointer shadow-2xs hover:border-gray-300"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <option value="All">All Industries</option>
                {availableIndustriesForFilter.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>

              {/* Location Filter */}
              <select
                value={selectedLocationFilter}
                onChange={(e) => setSelectedLocationFilter(e.target.value)}
                className="h-[36px] px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none cursor-pointer shadow-2xs hover:border-gray-300"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <option value="All">All Locations</option>
                {STANDARD_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          }
          onClearAllFilters={() => {
            setSelectedCategoryFilter("All");
            setSelectedIndustryFilter("All");
            setSelectedLocationFilter("All");
            setSearchQuery("");
          }}
          primaryAction={{
            label: "Add Sidebar Template",
            icon: <Plus className="w-3.5 h-3.5" />,
            onClick: handleCreateNew,
          }}
        />

        {/* Clean Standard Table Component View */}
        <TableComponent
          data={filteredTemplates}
          columns={columns}
          rowActions={rowActions}
          onRowClick={(tpl) => handleEdit(tpl)}
          getRowId={(tpl) => tpl.id}
          tableId="admin_sidebar_templates_table"
          emptyMessage="No sidebar templates match the selected admin scope and search filters. Click 'Add Sidebar Template' to create one."
          defaultRowsPerPage={10}
        />
      </div>

      {/* SIDEBAR TEMPLATE DRAWER (STUDIO & PREVIEW) */}
      <SidebarTemplateDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        template={editingTemplate}
        onSaveSuccess={() => setTemplates(getStoredSidebarTemplates())}
      />

      {/* QUICK SCOPE RULES MODAL */}
      <Modal
        isOpen={showScopeModal}
        onClose={() => setShowScopeModal(false)}
        title={`Scope Rules: ${scopingTargetTemplate?.name || ""}`}
        maxWidth="lg"
      >
        <div className="space-y-4" style={{ fontFamily: "Outfit, sans-serif" }}>
          <p className="text-xs text-gray-500">
            Define which tenant organizations will inherit this sidebar layout by default when created or loaded.
          </p>

          <AdminControlAccordion
            scopingRules={pendingScopingRules}
            onScopingRulesChange={setPendingScopingRules}
            defaultAdminControlOpen={true}
            defaultScopeOpen={true}
          />

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowScopeModal(false)}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-gray-600 hover:bg-gray-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveQuickScope}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#1456f0] text-white hover:bg-blue-700 cursor-pointer"
            >
              Save Scope Rules
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
