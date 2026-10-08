import React, { useState, useMemo, useEffect } from "react";
import {
  FileCode,
  Plus,
  Trash2,
  Pencil,
  Globe,
  SlidersHorizontal,
  ChevronDown,
  User,
  Zap,
  Calendar,
  Receipt,
  FileText,
  Copy,
  CheckCircle2,
  Search,
  Filter,
} from "lucide-react";
import PageHeader from "../../components/layout/PageHeader";
import PageTopBar from "../../components/layout/PageTopBar";
import TableComponent, { TableColumn, TableRowAction } from "../../components/ui/TableComponent";
import { Modal } from "../../components/ui/Modal";
import AddDocumentTemplateDrawer from "../../components/profile/AddDocumentTemplateDrawer";
import {
  DocumentTemplate,
  TemplateEntity,
  getStoredDocumentTemplates,
  saveDocumentTemplate,
  deleteDocumentTemplate,
  DOCUMENT_TEMPLATES_EVENT,
  isDocumentTemplateMatchingScope,
} from "../../../lib/documentTemplatesStore";
import { AdminScopingRulesEditor } from "./components/AdminScopingRulesEditor";
import { AdminControlAccordion } from "./components/AdminControlAccordion";
import type { ScopingRule } from "../../context/FieldRegistryContext";
import {
  INITIAL_CATEGORIES,
  INITIAL_INDUSTRIES,
  STANDARD_LOCATIONS,
  getIndustriesForCategory,
} from "../../../data/industryReferenceData";
import { toast } from "sonner";

export default function AdminDocumentTemplates() {
  const [templates, setTemplates] = useState<DocumentTemplate[]>(getStoredDocumentTemplates);

  // Filter state
  const [selectedEntityFilter, setSelectedEntityFilter] = useState<string>("client");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("All");
  const [selectedIndustryFilter, setSelectedIndustryFilter] = useState<string>("All");
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>("All");

  // Drawer & modal state
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);

  // Quick Scope Config Modal
  const [showScopeConfigModal, setShowScopeConfigModal] = useState(false);
  const [scopingTargetTemplate, setScopingTargetTemplate] = useState<DocumentTemplate | null>(null);
  const [pendingScopingRules, setPendingScopingRules] = useState<ScopingRule[]>([]);
  const [pendingEntities, setPendingEntities] = useState<TemplateEntity[]>(["client"]);

  useEffect(() => {
    const handleUpdate = () => {
      setTemplates(getStoredDocumentTemplates());
    };
    window.addEventListener(DOCUMENT_TEMPLATES_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(DOCUMENT_TEMPLATES_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const availableIndustriesForFilter = useMemo(() => {
    if (selectedCategoryFilter === "All") {
      return Array.from(new Set(INITIAL_INDUSTRIES.map((i) => i.name)));
    }
    return getIndustriesForCategory(selectedCategoryFilter);
  }, [selectedCategoryFilter]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      // 1. Entity filter
      if (selectedEntityFilter !== "all") {
        const ents = t.entities || ["client", "process", "appointment", "invoice"];
        if (!ents.includes(selectedEntityFilter as TemplateEntity)) {
          return false;
        }
      }

      // 2. Admin Scope match
      const matchesScope = isDocumentTemplateMatchingScope(t, {
        category: selectedCategoryFilter,
        industry: selectedIndustryFilter,
        location: selectedLocationFilter,
      });
      if (!matchesScope) return false;

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = t.name.toLowerCase().includes(q);
        const catMatch = (t.category || "").toLowerCase().includes(q);
        const fileMatch = (t.fileName || "").toLowerCase().includes(q);
        if (!nameMatch && !catMatch && !fileMatch) return false;
      }

      return true;
    });
  }, [
    templates,
    selectedEntityFilter,
    selectedCategoryFilter,
    selectedIndustryFilter,
    selectedLocationFilter,
    searchQuery,
  ]);

  // Counts by entity
  const entityCounts = useMemo(() => {
    const counts = {
      all: templates.length,
      client: 0,
      process: 0,
      appointment: 0,
      invoice: 0,
    };
    templates.forEach((t) => {
      const ents = t.entities || ["client", "process", "appointment", "invoice"];
      if (ents.includes("client")) counts.client++;
      if (ents.includes("process")) counts.process++;
      if (ents.includes("appointment")) counts.appointment++;
      if (ents.includes("invoice")) counts.invoice++;
    });
    return counts;
  }, [templates]);

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setIsAddDrawerOpen(true);
  };

  const handleEditTemplate = (template: DocumentTemplate) => {
    setEditingTemplate(template);
    setIsAddDrawerOpen(true);
  };

  const handleDuplicate = (template: DocumentTemplate) => {
    const copy: DocumentTemplate = {
      ...template,
      id: `tpl-${Date.now()}`,
      name: `${template.name} (Copy)`,
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
      createdBy: "Admin User",
    };
    saveDocumentTemplate(copy);
    toast.success(`Duplicated "${template.name}" successfully!`);
  };

  const handleDelete = (template: DocumentTemplate) => {
    deleteDocumentTemplate(template.id);
    toast.success(`Template "${template.name}" deleted.`);
  };

  const handleSaveQuickScope = () => {
    if (!scopingTargetTemplate) return;
    const allEnts = pendingScopingRules.flatMap((r) =>
      r.entities && r.entities.length > 0
        ? (r.entities as TemplateEntity[])
        : (["client", "process", "appointment", "invoice"] as TemplateEntity[])
    );
    const unique = Array.from(new Set(allEnts));
    const effectiveEntities: TemplateEntity[] =
      unique.length > 0 ? unique : ["client", "process", "appointment", "invoice"];

    const updated: DocumentTemplate = {
      ...scopingTargetTemplate,
      entities: effectiveEntities,
      scopingRules: pendingScopingRules,
    };
    saveDocumentTemplate(updated);
    toast.success(`Scope rules updated for "${updated.name}" ✓`);
    setShowScopeConfigModal(false);
    setScopingTargetTemplate(null);
  };

  const togglePendingEntity = (ent: TemplateEntity) => {
    setPendingEntities((prev) => {
      if (prev.includes(ent)) {
        if (prev.length === 1) return prev;
        return prev.filter((e) => e !== ent);
      } else {
        return [...prev, ent];
      }
    });
  };function getScopingTags(item: {
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

  // Table Columns
  const columns: TableColumn<DocumentTemplate>[] = [
    {
      id: "name",
      header: "Name",
      align: "left",
      width: "30%",
      render: (t) => (
        <span
          onClick={() => handleEditTemplate(t)}
          className="font-semibold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer text-xs sm:text-sm block truncate"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {t.name}
        </span>
      ),
    },
    {
      id: "entities",
      header: "Entity",
      align: "left",
      width: "22%",
      render: (t) => {
        const ents = t.entities && t.entities.length > 0 ? t.entities : ["client", "process", "appointment", "invoice"];
        const labels = ents.map((e) => {
          if (e === "client") return "Client";
          if (e === "process") return "Process";
          if (e === "appointment") return "Appointment";
          if (e === "invoice") return "Invoice";
          return e;
        });
        return (
          <span className="text-xs text-gray-700 font-medium">
            {labels.join(", ")}
          </span>
        );
      },
    },
    {
      id: "category",
      header: "Category",
      align: "left",
      width: "16%",
      render: (t) => (
        <span className="text-xs text-gray-700 font-medium">
          {t.category || "General"}
        </span>
      ),
    },
    {
      id: "scope",
      header: "Scope",
      align: "left",
      width: "18%",
      render: (t) => renderScopeCell(t),
    },
    {
      id: "fields",
      header: "Fillable Fields",
      align: "left",
      width: "14%",
      render: (t) => (
        <span className="text-xs text-gray-700 font-medium">
          {t.extractedFields?.length || 0} fields
        </span>
      ),
    },
  ];

  const rowActions: TableRowAction<DocumentTemplate>[] = [
    {
      label: "Configure Scope & Entities",
      icon: <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />,
      onClick: (t) => {
        setScopingTargetTemplate(t);
        const rules = (t.scopingRules && t.scopingRules.length > 0)
          ? t.scopingRules.map((r) => ({
              ...r,
              entities: r.entities || t.entities || ["client", "process", "appointment", "invoice"],
            }))
          : [];
        setPendingScopingRules(rules);
        setPendingEntities(t.entities && t.entities.length > 0 ? [...t.entities] : ["client", "process", "appointment", "invoice"]);
        setShowScopeConfigModal(true);
      },
    },
    {
      label: "Edit Template",
      icon: <Pencil className="w-3.5 h-3.5 text-gray-700" />,
      onClick: (t) => handleEditTemplate(t),
    },
    {
      label: "Duplicate",
      icon: <Copy className="w-3.5 h-3.5 text-gray-700" />,
      onClick: (t) => handleDuplicate(t),
    },
    {
      label: "Delete",
      icon: <Trash2 className="w-3.5 h-3.5 text-red-600" />,
      onClick: (t) => handleDelete(t),
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="px-10 sm:px-12 py-7.5 sm:py-8 w-full space-y-7">
        <PageHeader
          title="Document Templates"
          subtitle="Manage standardized document templates, entity availability, and tenant scoping rules."
        />

        {/* Action Bar powered by PageTopBar with Admin Scope Filters */}
        <PageTopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search template names, categories, files..."
          leftElement={
            <div className="flex items-center gap-2 flex-wrap">
              {/* Entity Filter Dropdown in Top Bar (Specific entities only) */}
              <select
                value={selectedEntityFilter}
                onChange={(e) => setSelectedEntityFilter(e.target.value)}
                className="h-[36px] px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none cursor-pointer shadow-2xs hover:border-gray-300"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <option value="client">Client ({entityCounts.client})</option>
                <option value="process">Process ({entityCounts.process})</option>
                <option value="appointment">Appointment ({entityCounts.appointment})</option>
                <option value="invoice">Invoice ({entityCounts.invoice})</option>
              </select>

              {/* Category */}
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

              {/* Industry */}
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

              {/* Location */}
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
            setSelectedEntityFilter("client");
            setSelectedCategoryFilter("All");
            setSelectedIndustryFilter("All");
            setSelectedLocationFilter("All");
            setSearchQuery("");
          }}
          primaryAction={{
            label: "Add Document Template",
            icon: <Plus className="w-3.5 h-3.5" />,
            onClick: handleCreateNew,
          }}
        />

        {/* Templates Table View */}
        <TableComponent
          data={filteredTemplates}
          columns={columns}
          getRowId={(t) => t.id}
          rowActions={rowActions}
          onRowClick={(t) => handleEditTemplate(t)}
          defaultRowsPerPage={10}
          emptyMessage="No document templates found matching active filters. Click 'Add Document Template' to create one."
          tableId="admin-document-templates-table"
        />
      </div>

      {/* Add / Edit Document Template Drawer */}
      <AddDocumentTemplateDrawer
        isOpen={isAddDrawerOpen}
        onClose={() => {
          setIsAddDrawerOpen(false);
          setEditingTemplate(null);
        }}
        initialTemplate={editingTemplate}
        isAdminMode={true}
        onTemplateCreated={() => {
          setTemplates(getStoredDocumentTemplates());
        }}
      />

      {/* Quick Scope & Entity Configuration Modal */}
      {showScopeConfigModal && scopingTargetTemplate && (
        <Modal
          isOpen={showScopeConfigModal}
          onClose={() => {
            setShowScopeConfigModal(false);
            setScopingTargetTemplate(null);
          }}
          title={`Configure Scope & Entity — ${scopingTargetTemplate.name}`}
        >
          <div className="space-y-4 p-1">
            {/* Admin Control (Scope Rules & Permissions) */}
            <AdminControlAccordion
              scopingRules={pendingScopingRules}
              onScopingRulesChange={setPendingScopingRules}
              allowEntities={true}
              defaultAdminControlOpen={true}
              defaultScopeOpen={true}
              defaultPermissionsOpen={false}
              scopeTooltip="Define entity availability and restrict visibility by tenant industry category, industries, and locations."
              permissionsTooltip="Configure what tenant users are permitted to do with this document template."
            />

            <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowScopeConfigModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuickScope}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Save Scope Rules</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
