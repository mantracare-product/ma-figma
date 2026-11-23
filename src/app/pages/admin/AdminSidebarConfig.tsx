import React, { useState, useMemo, useEffect, forwardRef, useImperativeHandle } from "react";
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
  RefreshCw,
  Building2,
  Check,
  AlertCircle,
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
import { TENANT_ORGANIZATIONS, TenantOrganization } from "../../../data/tenantOrganizations";
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

export interface AdminSidebarConfigRef {
  openCreateDrawer: () => void;
}

export interface AdminSidebarConfigProps {
  embedded?: boolean;
  hideTopBar?: boolean;
  searchQuery?: string;
  selectedCategory?: string;
  selectedIndustry?: string;
  selectedLocation?: string;
  selectedOrg?: string;
}

export const AdminSidebarConfig = forwardRef<AdminSidebarConfigRef, AdminSidebarConfigProps>(
  function AdminSidebarConfig(
    {
      embedded = false,
      hideTopBar = false,
      searchQuery: externalSearchQuery,
      selectedCategory: externalCategory,
      selectedIndustry: externalIndustry,
      selectedLocation: externalLocation,
      selectedOrg: externalOrg,
    },
    ref
  ) {
    const [templates, setTemplates] = useState<AdminSidebarTemplate[]>(getStoredSidebarTemplates);

    // Filter state (used when standalone)
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("All");
    const [selectedIndustryFilter, setSelectedIndustryFilter] = useState<string>("All");
    const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>("All");

    // Drawer state
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<AdminSidebarTemplate | null>(null);

    // Sync Modal state
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [syncTargetTemplate, setSyncTargetTemplate] = useState<AdminSidebarTemplate | null>(null);
    const [selectedSyncOrgIds, setSelectedSyncOrgIds] = useState<string[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);

    // Quick Scope Modal state (legacy fallback)
    const [showScopeModal, setShowScopeModal] = useState(false);
    const [scopingTargetTemplate, setScopingTargetTemplate] = useState<AdminSidebarTemplate | null>(null);
    const [pendingScopingRules, setPendingScopingRules] = useState<ScopingRule[]>([]);

    // Expose drawer trigger to parent
    useImperativeHandle(ref, () => ({
      openCreateDrawer: handleCreateNew,
    }));

    // Dynamic industry list based on category filter
    const availableIndustriesForFilter = useMemo(() => {
      if (selectedCategoryFilter === "All") {
        return Array.from(new Set(INITIAL_INDUSTRIES.map((i) => i.name)));
      }
      return getIndustriesForCategory(selectedCategoryFilter);
    }, [selectedCategoryFilter]);

    // Active filters
    const activeSearch = hideTopBar ? (externalSearchQuery ?? "") : searchQuery;
    const activeCategory = hideTopBar ? (externalCategory ?? "All") : selectedCategoryFilter;
    const activeIndustry = hideTopBar ? (externalIndustry ?? "All") : selectedIndustryFilter;
    const activeLocation = hideTopBar ? (externalLocation ?? "All") : selectedLocationFilter;
    const activeOrg = hideTopBar ? (externalOrg ?? "All") : "All";

    // Filter templates
    const filteredTemplates = useMemo(() => {
      return templates.filter((template) => {
        // 1. Admin Scope Match
        const matchesScope = isSidebarTemplateMatchingScope(template, {
          category: activeCategory,
          industry: activeIndustry,
          location: activeLocation,
        });
        if (!matchesScope) return false;

        // 2. Target Org match
        if (activeOrg !== "All") {
          const orgMatches =
            !template.scopingRules?.length ||
            template.scopingRules.some(
              (r) =>
                !r.locations?.length ||
                r.locations.includes("All") ||
                (r as any).organization === activeOrg ||
                (r as any).organizations?.includes(activeOrg)
            );
          if (!orgMatches) return false;
        }

        // 3. Search query match
        if (activeSearch.trim()) {
          const q = activeSearch.toLowerCase();
          const nameMatch = template.name.toLowerCase().includes(q);
          const descMatch = (template.description || "").toLowerCase().includes(q);
          const hasMatchingWorkflow = template.sections.some((s) =>
            s.items.some((i) => i.isWorkflow && i.label.toLowerCase().includes(q))
          );
          if (!nameMatch && !descMatch && !hasMatchingWorkflow) return false;
        }

        return true;
      });
    }, [templates, activeCategory, activeIndustry, activeLocation, activeOrg, activeSearch]);

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

  const handleOpenSyncModal = (tpl: AdminSidebarTemplate) => {
    setSyncTargetTemplate(tpl);
    const matching = TENANT_ORGANIZATIONS.filter((org) => {
      if (!tpl.scopingRules || tpl.scopingRules.length === 0) return true;
      return isSidebarTemplateMatchingScope(tpl, {
        category: org.category,
        industry: org.industry,
        location: org.location,
      });
    });
    setSelectedSyncOrgIds(matching.map((o) => o.id));
    setShowSyncModal(true);
  };

  const handleConfirmSync = () => {
    if (!syncTargetTemplate) return;
    if (selectedSyncOrgIds.length === 0) {
      toast.error("Please select at least one organization to synchronize");
      return;
    }
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setShowSyncModal(false);
      toast.success(
        `Template "${syncTargetTemplate.name}" synchronized across ${selectedSyncOrgIds.length} organization(s) ✓`
      );
    }, 400);
  };

  const matchingOrganizations = useMemo(() => {
    if (!syncTargetTemplate) return [];
    return TENANT_ORGANIZATIONS.filter((org) => {
      if (!syncTargetTemplate.scopingRules || syncTargetTemplate.scopingRules.length === 0) {
        return true;
      }
      return isSidebarTemplateMatchingScope(syncTargetTemplate, {
        category: org.category,
        industry: org.industry,
        location: org.location,
      });
    });
  }, [syncTargetTemplate]);

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
      label: "Sync Template",
      icon: <RefreshCw className="w-3.5 h-3.5" />,
      onClick: handleOpenSyncModal,
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
    <div className={embedded ? "space-y-4" : "min-h-screen bg-[#fafafa]"}>
      <div className={embedded ? "w-full" : "px-10 sm:px-12 py-7.5 sm:py-8 w-full space-y-7"}>
        {/* Top Header Portaled into Admin Header - only if standalone */}
        {!embedded && (
          <PageHeader
            title="Sidebar Navigation Templates"
            subtitle="Configure default client sidebar layouts, section order, visibility, and pinned workflows based on admin scope."
          />
        )}

        {/* Unified Action Bar powered by PageTopBar with Integrated Admin Scope Filters & Add Button */}
        {!hideTopBar && (
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
        )}

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

      {/* SYNC TEMPLATE TO ORGANIZATIONS MODAL */}
      <Modal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        title="Sync Template to Organizations"
        maxWidth="lg"
      >
        {syncTargetTemplate && (() => {
          const scoping = getScopingTags(syncTargetTemplate);
          const isGlobal = !syncTargetTemplate.scopingRules || syncTargetTemplate.scopingRules.length === 0;

          return (
            <div className="space-y-4" style={{ fontFamily: "Outfit, sans-serif" }}>
              {/* Header explanation callout */}
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 text-blue-600 mt-0.5">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-blue-950">
                    Synchronizing "{syncTargetTemplate.name}"
                  </h4>
                  <p className="text-[12px] text-blue-900/80 leading-relaxed">
                    This template will be synchronized across tenant organizations matching the defined scope rules.
                    Navigation items, section hierarchy, and visibility settings will take effect immediately.
                  </p>
                </div>
              </div>

              {/* Scope Rules Summary */}
              <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    Template Scope Rules
                  </span>
                  <span className="text-[11px] font-medium text-gray-500">
                    {isGlobal ? "Global Scope (All Organizations)" : "Scoped by Rules"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white border border-gray-200 text-gray-700 shadow-2xs">
                    <span className="text-gray-400 font-normal">Category:</span> {scoping.categories.join(", ")}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white border border-gray-200 text-gray-700 shadow-2xs">
                    <span className="text-gray-400 font-normal">Industry:</span> {scoping.industries.join(", ")}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white border border-gray-200 text-gray-700 shadow-2xs">
                    <span className="text-gray-400 font-normal">Location:</span> {scoping.locations.join(", ")}
                  </span>
                </div>
              </div>

              {/* Matching Organizations List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-800">
                      Matching Organizations
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100/80 text-blue-800">
                      {selectedSyncOrgIds.length} of {matchingOrganizations.length} selected
                    </span>
                  </div>

                  {matchingOrganizations.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedSyncOrgIds(matchingOrganizations.map((o) => o.id))}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedSyncOrgIds([])}
                        className="text-[11px] font-semibold text-gray-500 hover:text-gray-700 cursor-pointer"
                      >
                        Deselect All
                      </button>
                    </div>
                  )}
                </div>

                {matchingOrganizations.length === 0 ? (
                  <div className="py-8 text-center bg-gray-50 border border-dashed border-gray-200 rounded-xl">
                    <AlertCircle className="w-6 h-6 text-gray-400 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-gray-700">No organizations match this template's scope rules</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Edit this template in the builder to adjust scoping rules.</p>
                  </div>
                ) : (
                  <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1 border border-gray-100 rounded-xl p-1 bg-white">
                    {matchingOrganizations.map((org) => {
                      const isSelected = selectedSyncOrgIds.includes(org.id);
                      return (
                        <div
                          key={org.id}
                          onClick={() => {
                            setSelectedSyncOrgIds((prev) =>
                              isSelected ? prev.filter((id) => id !== org.id) : [...prev, org.id]
                            );
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-blue-50/50 border-blue-200 text-gray-900"
                              : "bg-white border-gray-100 hover:border-gray-200 text-gray-600"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                            />
                            <div className="w-7 h-7 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                              <Building2 className="w-3.5 h-3.5 text-gray-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-gray-900">{org.name}</span>
                                {org.tier && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-gray-100 text-gray-600">
                                    {org.tier}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-gray-500">
                                {org.category} • {org.industry}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-gray-500 font-medium bg-gray-50 border border-gray-100 px-2 py-0.5 rounded">
                              {org.location}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                              <Check className="w-3 h-3 text-emerald-600" /> Matches Scope
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-[11px] text-gray-500">
                  {selectedSyncOrgIds.length} organization(s) selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSyncModal(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-gray-600 hover:bg-gray-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={selectedSyncOrgIds.length === 0 || isSyncing}
                    onClick={handleConfirmSync}
                    className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#1456f0] text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                    <span>{isSyncing ? "Syncing..." : `Sync to ${selectedSyncOrgIds.length} Organizations`}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

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
});

export default AdminSidebarConfig;
