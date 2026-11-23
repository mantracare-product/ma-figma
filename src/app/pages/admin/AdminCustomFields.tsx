/**
 * AdminCustomFields.tsx
 * Path: src/app/pages/admin/AdminCustomFields.tsx
 *
 * Dedicated Admin Console for Custom Fields & Layout Sections.
 * Fully aligned with the reference UI design specification:
 * - 32px bold header & subtitle
 * - Dark pill capsule action buttons (border-radius: 999px)
 * - Segmented pill tab switcher for modules & sections
 * - Reference table styling: uppercase headers, chip badges, green REQUIRED / OPTIONAL
 * - Option B compliance: Scribe seeds treated as non-deletable system fields
 * - Centered "Create/Edit Custom Field" modal with "FIELD CONFIGURATION" divider
 */

import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Lock,
  FileText,
  AlertTriangle,
  Check,
  ChevronDown,
  X,
  Type,
  Table as TableIcon,
  PenTool,
  ClipboardList,
  Tag,
  Calendar,
  Hash,
  DollarSign,
  AlignLeft,
  Link as LinkIcon,
  CheckCircle2,
  Star,
  User,
  Globe,
  Layers,
  GitBranch,
  Mail,
  Phone,
  Clock,
  Send,
  Upload,
} from "lucide-react";

import type {
  FieldDefinition,
  FieldInputType,
  FieldModule,
  SectionDefinition,
  ScopingRule,
} from "../../context/FieldRegistryContext";
import {
  useFieldRegistry,
  INITIAL_SCRIBE_CUSTOM_FIELDS,
  isFieldMatchingContactCategory,
  isSectionMatchingContactCategory,
} from "../../context/FieldRegistryContext";
import { useContactCategories, addContactCategory } from "../../../lib/contactCategoriesStore";
import PageHeader from "../../components/layout/PageHeader";
import PageTopBar from "../../components/layout/PageTopBar";
import TableComponent, { TableColumn, TableRowAction } from "../../components/ui/TableComponent";
import { AdminSectionDrawer } from "./components/AdminSectionDrawer";
import { AdminFieldDrawer } from "./components/AdminFieldDrawer";
import AdminSidebarConfig from "./AdminSidebarConfig";
import { toast } from "sonner";
import {
  INITIAL_INDUSTRIES,
  STANDARD_LOCATIONS,
  getIndustriesForCategory,
} from "../../../data/industryReferenceData";
import {
  Process,
  getStoredProcesses,
  PROCESS_STORE_EVENT,
} from "../../../lib/useProcessStore";

// Scribe seed keys set for O(1) detection of non-deletable seed fields
const SCRIBE_SEED_KEYS = new Set(INITIAL_SCRIBE_CUSTOM_FIELDS.map((f) => f.key));

function getScopingTags(item: {
  scopingRules?: ScopingRule[];
  industryCategory?: string;
  industry?: string;
  locations?: string[];
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

  const cat = item.industryCategory && item.industryCategory !== "All" ? [item.industryCategory] : ["All"];
  const ind = item.industry && item.industry !== "All" ? [item.industry] : ["All"];
  const loc = item.locations && item.locations.length > 0 && !item.locations.includes("All") ? item.locations : ["All"];

  return { categories: cat, industries: ind, locations: loc };
}

function renderScopeCell(item: {
  scopingRules?: ScopingRule[];
  industryCategory?: string;
  industry?: string;
  locations?: string[];
}) {
  const scoping = getScopingTags(item);
  const isAllCats = scoping.categories.includes("All") || scoping.categories.length === 0;
  const isAllInds = scoping.industries.includes("All") || scoping.industries.length === 0;
  const isAllLocs = scoping.locations.includes("All") || scoping.locations.length === 0;

  // Calculate industry count (pure number)
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

  // Calculate country/location count (pure number)
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

function renderProcessesCell(
  item: { processIds?: string[] },
  allProcesses: Process[]
) {
  const isAll = !item.processIds || item.processIds.length === 0 || item.processIds.includes("all");
  if (isAll) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
        All Processes
      </span>
    );
  }

  const selectedNames = item.processIds.map(
    (id) => allProcesses.find((p) => p.id === id)?.name || `Process #${id}`
  );

  if (selectedNames.length === 1) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-lg max-w-[200px] truncate"
        title={selectedNames[0]}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
        <span className="truncate">{selectedNames[0]}</span>
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-lg cursor-help shadow-2xs"
      title={selectedNames.join(", ")}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
      <span>{selectedNames.length} Processes</span>
    </span>
  );
}

const MODULE_TABS: { label: string; value: Exclude<FieldModule, "deal"> }[] = [
  { label: "Contact",       value: "client" },
  { label: "Call Logs",     value: "call" },
  { label: "Processes",     value: "process" },
  { label: "Appointments",  value: "appointment" },
  { label: "Services",      value: "service" },
  { label: "Invoices",      value: "invoice" },
  { label: "Insurance & Claims", value: "claim" },
  { label: "Organizations", value: "organization" },
  { label: "Team Members",  value: "teamMember" },
];

const FIELD_TYPES: { label: string; value: FieldInputType }[] = [
  { label: "Text", value: "text" },
  { label: "String", value: "string" },
  { label: "Number", value: "number" },
  { label: "Money / Currency", value: "money" },
  { label: "Date & Time", value: "date_time" },
  { label: "Date", value: "date" },
  { label: "List", value: "new_list" },
  { label: "Open List (Tags)", value: "list_open" },
  { label: "Boolean (Yes/No)", value: "yes_no" },
  { label: "Email", value: "email" },
  { label: "Phone Number", value: "tel" },
  { label: "Link / URL", value: "link" },
  { label: "Group Field", value: "composite" as any },
  { label: "Link to Mantra Entities", value: "crm_bind" },
  { label: "Digital Signature", value: "signature" },
  { label: "Media Attach", value: "file" },
  { label: "User / Member", value: "user" },
];

const FIELD_TYPE_REVERSE_MAP: Record<string, string> = {
  text: "Text",
  string: "String",
  table: "Group Field (Table)",
  signature: "Digital Signature",
  drawing: "Digital Signature",
  list_select: "List",
  new_list: "List",
  list_open: "Open List",
  group: "Group Field (Group)",
  group_repeatable: "Group Field (Group)",
  crm_bind: "Link to Mantra Entities",
  select: "List",
  multiselect: "List (Multi)",
  date: "Date",
  date_time: "Date & Time",
  number: "Number",
  money: "Money / Currency",
  textarea: "String (Paragraph)",
  richtext: "String (Rich Text)",
  link: "Link",
  whatsapp_link: "WhatsApp Link",
  yes_no: "Yes / No",
  file: "Media Attach",
  rating: "Rating / Score",
  user: "User / Member",
};

export function AdminCustomFields() {
  const {
    getAllFields,
    getAllSections,
    deleteCustomField,
    deleteCustomSection,
  } = useFieldRegistry();

  // State
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeModule, setActiveModule] = useState<Exclude<FieldModule, "deal">>("client");
  const [activeTab, setActiveTab] = useState<"fields" | "sections" | "layouts">(() => {
    const tab = searchParams.get("tab");
    if (tab === "layouts") return "layouts";
    if (tab === "sections") return "sections";
    return "fields";
  });
  const [layoutEntity, setLayoutEntity] = useState<string>(() => {
    return searchParams.get("entity") || "sidebar";
  });
  const [selectedService, setSelectedService] = useState<string>("Automobile");
  const [searchQuery, setSearchQuery] = useState("");
  const [activePreviewTab, setActivePreviewTab] = useState<string>("overview");
  const [previewNote, setPreviewNote] = useState<string>("");
  const [previewNotesList, setPreviewNotesList] = useState<Array<{ text: string; date: string }>>([]);

  // Keep activeTab and layoutEntity in sync with URL searchParams
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "layouts" || tab === "sections" || tab === "fields") {
      setActiveTab(tab);
    }
    const entity = searchParams.get("entity");
    if (entity) {
      setLayoutEntity(entity);
    }
  }, [searchParams]);

  // Modal / Drawer states
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<FieldDefinition | null>(null);

  // Section Drawer
  const [sectionDrawerOpen, setSectionDrawerOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionDefinition | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "field" | "section";
    id: number | string;
    name: string;
  } | null>(null);

  // Processes store
  const [allProcesses, setAllProcesses] = useState<Process[]>(getStoredProcesses);

  // Contact Category state
  const [contactCategoryFilter, setContactCategoryFilter] = useState<string>("Lead");
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const contactCategories = useContactCategories();

  useEffect(() => {
    const handleUpdate = () => {
      setAllProcesses(getStoredProcesses());
    };
    window.addEventListener(PROCESS_STORE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(PROCESS_STORE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // Queries
  const allFields = getAllFields(activeModule);
  const allSections = getAllSections(activeModule);

  const isScribeSeed = (field: FieldDefinition): boolean => {
    return field.module === "scribe" && SCRIBE_SEED_KEYS.has(field.key);
  };

  const isSystemField = (field: FieldDefinition): boolean => {
    return field.source === "system" || field.id < 0;
  };

  const isSystemSection = (section: SectionDefinition): boolean => {
    return section.source === "system";
  };

  // Filtered Fields
  const filteredFields = useMemo(() => {
    let list = allFields;
    if (activeModule === "client") {
      list = list.filter((f) => isFieldMatchingContactCategory(f, contactCategoryFilter));
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (f) =>
        f.label.toLowerCase().includes(q) ||
        f.key.toLowerCase().includes(q) ||
        f.inputType.toLowerCase().includes(q)
    );
  }, [allFields, searchQuery, activeModule, contactCategoryFilter]);

  // Filtered Sections
  const filteredSections = useMemo(() => {
    let list = allSections;
    if (activeModule === "client") {
      list = list.filter((s) => isSectionMatchingContactCategory(s, contactCategoryFilter));
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q))
    );
  }, [allSections, searchQuery, activeModule, contactCategoryFilter]);

  // Open Handlers
  const handleOpenCreateField = () => {
    setEditingField(null);
    setFieldModalOpen(true);
  };

  const handleOpenEditField = (field: FieldDefinition) => {
    setEditingField(field);
    setFieldModalOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "field") {
      deleteCustomField(activeModule, deleteTarget.id as number);
    } else {
      deleteCustomSection(activeModule, deleteTarget.id as string);
    }
    setDeleteTarget(null);
  };

  const currentModLabel =
    MODULE_TABS.find((m) => m.value === activeModule)?.label ?? activeModule;

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="px-10 sm:px-12 py-7.5 sm:py-8 w-full space-y-7 animate-in fade-in duration-200">
        <PageHeader
          title="Custom Fields & Sections"
          subtitle="Define and manage prebuilt custom fields, sections, and metadata across all platform entities."
        />

        {/* ── UNIFIED TOOLBAR powered by PageTopBar ── */}
      <PageTopBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={
          activeTab === "fields"
            ? `Search ${currentModLabel.toLowerCase()} fields...`
            : activeTab === "sections"
            ? `Search ${currentModLabel.toLowerCase()} sections...`
            : `Search sections...`
        }
        leftElement={
          <div className="flex items-center gap-1.5 mr-1">
            <div className="relative border border-gray-200 rounded-lg bg-gray-50 px-2.5 py-1 flex items-center">
              <select
                value={activeTab === "layouts" ? "all-sections" : activeModule}
                onChange={(e) => {
                  if (activeTab !== "layouts") {
                    setActiveModule(e.target.value as any);
                  }
                }}
                className="bg-transparent text-xs font-bold text-gray-800 pr-4 outline-none cursor-pointer appearance-none"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {activeTab === "layouts" ? (
                  <option value="all-sections">All Sections</option>
                ) : (
                  MODULE_TABS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="w-3 h-3 text-gray-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {activeTab !== "layouts" && activeModule === "client" && (
              <div className="relative border border-blue-200 rounded-lg bg-blue-50/50 px-2.5 py-1 flex items-center">
                <select
                  value={contactCategoryFilter}
                  onChange={(e) => {
                    if (e.target.value === "__add_category__") {
                      setIsAddCategoryModalOpen(true);
                    } else {
                      setContactCategoryFilter(e.target.value);
                    }
                  }}
                  className="bg-transparent text-xs font-semibold text-blue-700 pr-4 outline-none cursor-pointer appearance-none"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {contactCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="__add_category__">+ Add Category</option>
                </select>
                <ChevronDown className="w-3 h-3 text-blue-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}
          </div>
        }
        filterPresets={
          activeTab === "fields"
            ? [
                {
                  id: "all",
                  label: "All Fields",
                  isActive: !searchQuery,
                  onClick: () => setSearchQuery(""),
                },
                {
                  id: "required",
                  label: "Required Fields",
                  isActive: false,
                  onClick: () => setSearchQuery("required"),
                },
                {
                  id: "text",
                  label: "Text Fields",
                  isActive: false,
                  onClick: () => setSearchQuery("text"),
                },
              ]
            : activeTab === "sections"
            ? [
                {
                  id: "all",
                  label: "All Sections",
                  isActive: !searchQuery,
                  onClick: () => setSearchQuery(""),
                },
              ]
            : undefined
        }
        filterFields={
          activeTab === "fields"
            ? [
                {
                  id: "name",
                  label: "Field Label / Key",
                  type: "text",
                  placeholder: "Filter fields...",
                  value: searchQuery,
                  onChange: (val) => setSearchQuery(val || ""),
                },
                {
                  id: "module",
                  label: "Target Module",
                  type: "select",
                  value: activeModule,
                  onChange: (val) => setActiveModule(val as any),
                  options: MODULE_TABS.map((m) => ({ label: m.label, value: m.value })),
                },
              ]
            : activeTab === "sections"
            ? [
                {
                  id: "title",
                  label: "Section Title",
                  type: "text",
                  placeholder: "Filter sections...",
                  value: searchQuery,
                  onChange: (val) => setSearchQuery(val || ""),
                },
              ]
            : undefined
        }
        secondaryActions={
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-medium text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>
              {activeTab === "layouts"
                ? "0 layout"
                : activeTab === "sections"
                ? `${filteredSections.length} sections`
                : `${filteredFields.length} fields`}
            </span>

            {/* Segmented Modes Tabs: Fields | Sections | Layouts */}
            <div className="inline-flex items-center p-0.5 bg-gray-100/80 border border-gray-200/80 rounded-xl gap-0.5">
              {[
                { id: "fields", label: "Fields" },
                { id: "sections", label: "Sections" },
                { id: "layouts", label: "Layouts" },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      const nextTab = tab.id as "fields" | "sections" | "layouts";
                      setActiveTab(nextTab);
                      setSearchParams((prev) => {
                        const next = new URLSearchParams(prev);
                        next.set("tab", nextTab);
                        if (nextTab === "layouts" && !next.get("entity")) {
                          next.set("entity", layoutEntity || "sidebar");
                        }
                        return next;
                      });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? "bg-white text-gray-900 shadow-2xs font-bold"
                        : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
                    }`}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        }
        onExport={() => toast.info("Exporting configuration...")}
        primaryAction={{
          label: "",
          icon: <Plus className="w-4 h-4" />,
          onClick: () => {
            if (activeTab === "fields") {
              handleOpenCreateField();
            } else if (activeTab === "sections") {
              setEditingSection(null);
              setSectionDrawerOpen(true);
            } else {
              if (layoutEntity === "sidebar") {
                toast.info("Add a new template using 'Add Sidebar Template' below");
              } else {
                toast.info("Create new section for layout");
              }
            }
          },
          className: "!w-[36px] !h-[36px] !p-0 !rounded-full flex items-center justify-center !bg-black hover:!bg-gray-800 text-white shrink-0 cursor-pointer shadow-xs",
        }}
      />

        {/* TAB 1: CUSTOM FIELDS TABLE VIEW */}
        {activeTab === "fields" && (() => {
          const fieldColumns: TableColumn<FieldDefinition>[] = [
            {
              key: "label",
              header: "Label",
              align: "left",
              render: (field) => <span className="text-sm font-medium text-[#111827]">{field.label}</span>,
            },
            {
              key: "key",
              header: "Key",
              align: "left",
              render: (field) => <span className="text-xs font-mono text-gray-600">{field.key}</span>,
            },
            {
              key: "type",
              header: "Type",
              align: "left",
              render: (field) => {
                const isCompositeField =
                  field.inputType !== "new_list" &&
                  (field.compositeDisplayMode !== undefined ||
                  field.inputType === "table" ||
                  field.inputType === "group" ||
                  field.inputType === "group_repeatable" ||
                  (field.inputType === "list_open" && (field.listEntryType === "structured" || (field.subFields && field.subFields.length > 0))) ||
                  (field.tableColumns && field.tableColumns.length > 0 && field.inputType !== "list_select" && field.inputType !== "multiselect" && !field.listConfig));

                const isListField =
                  !isCompositeField &&
                  (field.inputType === "list_open" ||
                  field.inputType === "list_select" ||
                  field.inputType === "select" ||
                  field.inputType === "multiselect" ||
                  field.inputType === "list");

                const isAdvanceList =
                  field.inputType === "new_list" &&
                  (field.newListConfig?.sourceMode === "advance_2" ||
                   (field.newListConfig?.sourceMode as any) === "advance_list" ||
                   Boolean(field.newListConfig?.advanceListId));

                const typeName =
                  isCompositeField
                    ? field.compositeDisplayMode === "table" || field.inputType === "table"
                      ? "Group Field (Table)"
                      : "Group Field (Group)"
                    : isAdvanceList
                    ? "List (Advance)"
                    : field.inputType === "new_list"
                    ? "List"
                    : field.inputType === "list_open"
                    ? "List (Open · Tags)"
                    : isListField
                    ? field.selectionMode === "multiple" || field.inputType === "multiselect"
                      ? "List (Multi-Select)"
                      : "List (Select)"
                    : FIELD_TYPE_REVERSE_MAP[field.inputType] || field.inputType.toUpperCase();
                let typeBadgeStyle = "bg-blue-50 text-blue-700";
                let TypeIcon = Type;
                if (isCompositeField) {
                  typeBadgeStyle = "bg-indigo-50 text-indigo-700";
                  TypeIcon = field.compositeDisplayMode === "table" || field.inputType === "table" ? TableIcon : Layers;
                }
                else if (isAdvanceList) {
                  typeBadgeStyle = "bg-purple-50 text-purple-700";
                  TypeIcon = Layers;
                }
                else if (field.inputType === "signature" || field.inputType === "drawing") { typeBadgeStyle = "bg-rose-50 text-rose-700"; TypeIcon = PenTool; }
                else if (field.inputType === "select" || field.inputType === "list" || field.inputType === "list_select") {
                  typeBadgeStyle = field.selectionMode === "multiple" ? "bg-teal-50 text-teal-700" : "bg-emerald-50 text-emerald-700";
                  TypeIcon = ClipboardList;
                }
                else if (field.inputType === "new_list") {
                  typeBadgeStyle = "bg-indigo-50 text-indigo-700";
                  TypeIcon = Layers;
                }
                else if (field.inputType === "multiselect") { typeBadgeStyle = "bg-teal-50 text-teal-700"; TypeIcon = Tag; }
                else if (field.inputType === "list_open") {
                  typeBadgeStyle = "bg-emerald-50 text-emerald-700";
                  TypeIcon = Tag;
                }
                else if (field.inputType === "crm_bind") { typeBadgeStyle = "bg-blue-50 text-blue-700"; TypeIcon = LinkIcon; }
                else if (field.inputType === "date" || field.inputType === "date_time") { typeBadgeStyle = "bg-amber-50 text-amber-700"; TypeIcon = Calendar; }
                else if (field.inputType === "number") { typeBadgeStyle = "bg-purple-50 text-purple-700"; TypeIcon = Hash; }
                else if (field.inputType === "money") { typeBadgeStyle = "bg-green-50 text-green-700"; TypeIcon = DollarSign; }
                else if (field.inputType === "textarea" || field.inputType === "richtext") { typeBadgeStyle = "bg-orange-50 text-orange-700"; TypeIcon = AlignLeft; }
                else if (field.inputType === "link" || field.inputType === "whatsapp_link") { typeBadgeStyle = "bg-sky-50 text-sky-700"; TypeIcon = LinkIcon; }
                else if (field.inputType === "yes_no") { typeBadgeStyle = "bg-rose-50 text-rose-700"; TypeIcon = CheckCircle2; }
                else if (field.inputType === "file") { typeBadgeStyle = "bg-violet-50 text-violet-700"; TypeIcon = FileText; }
                else if (field.inputType === "rating") { typeBadgeStyle = "bg-amber-50 text-amber-700"; TypeIcon = Star; }
                else if (field.inputType === "user") { typeBadgeStyle = "bg-blue-50 text-blue-700"; TypeIcon = User; }

                return (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${typeBadgeStyle}`}>
                    <TypeIcon className="w-3.5 h-3.5" />
                    <span>{typeName}</span>
                  </span>
                );
              },
            },
            ...(activeModule === "process"
              ? [
                  {
                    key: "process",
                    header: "Process",
                    align: "left" as const,
                    render: (field: FieldDefinition) => renderProcessesCell(field, allProcesses),
                  },
                ]
              : []),
            {
              key: "required",
              header: "Required",
              align: "left",
              render: (field) =>
                field.required ? (
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/50">Required</span>
                ) : (
                  <span className="text-xs text-gray-400">Optional</span>
                ),
            },
            {
              key: "scope",
              header: "Scope",
              align: "left",
              render: (field) => renderScopeCell(field),
            },
          ];

          const getFieldRowActions = (field: FieldDefinition): TableRowAction<FieldDefinition>[] => {
            const scribeSeed = isScribeSeed(field);
            const systemField = isSystemField(field);

            return [
              {
                label: scribeSeed ? "View Details (Protected)" : "Edit Field",
                icon: scribeSeed ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Edit2 className="w-3.5 h-3.5 text-gray-700" />,
                onClick: () => handleOpenEditField(field),
              },
              ...(!systemField && !scribeSeed
                ? [
                    {
                      label: "Delete Field",
                      icon: <Trash2 className="w-3.5 h-3.5 text-red-600" />,
                      isDanger: true,
                      onClick: () => setDeleteTarget({ type: "field", id: field.id, name: field.label }),
                    },
                  ]
                : []),
            ];
          };

          return (
            <TableComponent
              columns={fieldColumns}
              data={filteredFields}
              getRowId={(field) => `${field.module}-${field.key}`}
              rowActions={getFieldRowActions}
              onRowClick={(field) => handleOpenEditField(field)}
              emptyMessage="No fields found for this module. Click 'Add Field' above to define one."
              tableId="admin-custom-fields-table"
            />
          );
        })()}

        {/* TAB 2: CUSTOM SECTIONS TABLE VIEW */}
        {activeTab === "sections" && (() => {
          const sectionColumns: TableColumn<SectionDefinition>[] = [
            {
              key: "title",
              header: "Section",
              align: "left",
              render: (sec) => <span className="text-sm font-medium text-[#111827]">{sec.title}</span>,
            },
            {
              key: "description",
              header: "Description",
              align: "left",
              render: (sec) => (
                <span
                  className="text-xs text-gray-500 max-w-[240px] truncate inline-block"
                  title={sec.description || ""}
                >
                  {sec.description || <span className="text-gray-300 italic">—</span>}
                </span>
              ),
            },
            ...(activeModule === "process"
              ? [
                  {
                    key: "process",
                    header: "Process",
                    align: "left" as const,
                    render: (sec: SectionDefinition) => renderProcessesCell(sec, allProcesses),
                  },
                ]
              : []),
            {
              key: "scope",
              header: "Scope",
              align: "left",
              render: (sec) => renderScopeCell(sec),
            },
            {
              key: "fields",
              header: "Fields",
              align: "left",
              render: (sec) => {
                const assignedFieldCount = (sec.fieldKeys || []).length;
                return (
                  <span className="text-xs text-gray-500 font-medium">
                    {assignedFieldCount} {assignedFieldCount === 1 ? "field" : "fields"}
                  </span>
                );
              },
            },
          ];

          const getSectionRowActions = (sec: SectionDefinition): TableRowAction<SectionDefinition>[] => {
            const isSystem = isSystemSection(sec);

            return [
              {
                label: "Edit Section",
                icon: <Edit2 className="w-3.5 h-3.5 text-gray-700" />,
                onClick: () => {
                  setEditingSection(sec);
                  setSectionDrawerOpen(true);
                },
              },
              ...(!isSystem
                ? [
                    {
                      label: "Delete Section",
                      icon: <Trash2 className="w-3.5 h-3.5 text-red-600" />,
                      isDanger: true,
                      onClick: () => setDeleteTarget({ type: "section", id: sec.id, name: sec.title }),
                    },
                  ]
                : []),
            ];
          };

          return (
            <TableComponent
              columns={sectionColumns}
              data={filteredSections}
              getRowId={(sec) => sec.id}
              rowActions={getSectionRowActions}
              onRowClick={(sec) => {
                setEditingSection(sec);
                setSectionDrawerOpen(true);
              }}
              emptyMessage="No sections found for this module. Click 'Add Section' above to define one."
              tableId="admin-custom-sections-table"
            />
          );
        })()}

        {/* TAB 3: LAYOUTS VIEW */}
        {activeTab === "layouts" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Layout Controls Bar (Matching Reference Screenshot) */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
              {/* Top Row: Layout Type & Service */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-gray-700 whitespace-nowrap" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Layout Type:
                  </label>
                  <div className="relative">
                    <select
                      value={layoutEntity}
                      onChange={(e) => {
                        const next = e.target.value;
                        setLayoutEntity(next);
                        setSearchParams({ tab: "layouts", entity: next });
                      }}
                      className="appearance-none h-9 pl-3.5 pr-8 bg-white border border-gray-200 rounded-full text-xs font-semibold text-gray-800 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-2xs min-w-[140px]"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <option value="sidebar">Side bar</option>
                      <option value="client">Client</option>
                      <option value="appointment">Appointment</option>
                      <option value="invoice">Invoice</option>
                      <option value="claim">Insurance & Claims</option>
                      <option value="task">Tasks</option>
                      <option value="service">Services</option>
                      <option value="process">Processes</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-gray-700 whitespace-nowrap" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Service:
                  </label>
                  <div className="relative">
                    <select
                      value={selectedService}
                      onChange={(e) => setSelectedService(e.target.value)}
                      className="appearance-none h-9 pl-3.5 pr-8 bg-white border border-gray-200 rounded-full text-xs font-semibold text-gray-800 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-2xs min-w-[140px]"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <option value="Automobile">Automobile</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Dental">Dental</option>
                      <option value="Legal">Legal</option>
                      <option value="Financial">Financial</option>
                      <option value="General Practice">General Practice</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Bottom Row: Target Organizations & Sync Layout */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="text-xs font-bold text-gray-700 whitespace-nowrap" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Target Organizations:
                  </label>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50/70 border border-blue-200/80 text-blue-700 text-xs font-semibold">
                    <span>All Organizations</span>
                    <button
                      type="button"
                      onClick={() => toast.info("Organization filter toggled")}
                      className="hover:text-blue-900 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toast.success(`Layout synchronized for ${selectedService} across all organizations ✓`)}
                  className="bg-[#111827] hover:bg-[#1f2937] text-white text-xs font-semibold px-5 py-2.5 rounded-full transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer ml-auto"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Sync Layout
                </button>
              </div>
            </div>

            {/* Entity View Condition */}
            {layoutEntity === "sidebar" ? (
              /* ── SIDE BAR ENTITY: Embed full Sidebar Navigation Template flow ── */
              <div className="space-y-4">
                <AdminSidebarConfig embedded={true} />
              </div>
            ) : (
              /* ── CLIENT & OTHER ENTITIES: Layout Builder & Preview (Matching Screenshot) ── */
              <div className="bg-white border border-gray-200/80 rounded-2xl shadow-2xs overflow-hidden">
                {/* Top Profile Banner */}
                <div className="p-6 pb-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0" style={{ fontFamily: "Outfit, sans-serif" }}>
                    KP
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Kanak B Pandey
                    </h3>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                      +1 1234567890
                    </p>
                  </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex items-center gap-7 px-6 border-b border-gray-100 text-xs font-semibold overflow-x-auto scrollbar-none" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {[
                    { id: "overview", label: "Overview" },
                    { id: "processes", label: "Processes" },
                    { id: "calls", label: "Calls" },
                    { id: "invoices", label: "Invoices" },
                    { id: "documents", label: "Documents" },
                    { id: "notes", label: "Notes" },
                  ].map((tab) => {
                    const isActive = activePreviewTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActivePreviewTab(tab.id)}
                        className={`pb-3 transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
                          isActive
                            ? "border-blue-600 text-blue-600 font-bold"
                            : "border-transparent text-gray-500 hover:text-gray-900"
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* 2-Column Content Grid */}
                <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Column: Form Fields */}
                  <div className="lg:col-span-6 space-y-4">
                    {/* NAME */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span>Name</span>
                      </label>
                      <input
                        type="text"
                        defaultValue="Kanak B Pandey"
                        className="w-full px-3.5 py-2.5 border border-gray-200/90 rounded-xl text-xs font-medium text-gray-800 bg-white shadow-2xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      />
                    </div>

                    {/* EMAIL */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        <span>Email</span>
                      </label>
                      <input
                        type="text"
                        defaultValue="kanak@mantracare.org"
                        className="w-full px-3.5 py-2.5 border border-gray-200/90 rounded-xl text-xs font-medium text-gray-800 bg-white shadow-2xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      />
                    </div>

                    {/* PHONE */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span>Phone</span>
                      </label>
                      <input
                        type="text"
                        defaultValue="+11234567890"
                        className="w-full px-3.5 py-2.5 border border-gray-200/90 rounded-xl text-xs font-medium text-gray-800 bg-white shadow-2xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      />
                    </div>

                    {/* TIMEZONE */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                        <Globe className="w-3.5 h-3.5 text-gray-400" />
                        <span>Timezone</span>
                      </label>
                      <input
                        type="text"
                        defaultValue="Asia/Kolkata"
                        className="w-full px-3.5 py-2.5 border border-gray-200/90 rounded-xl text-xs font-medium text-gray-800 bg-white shadow-2xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      />
                    </div>

                    {/* SOURCE */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                        <Layers className="w-3.5 h-3.5 text-gray-400" />
                        <span>Source</span>
                      </label>
                      <input
                        type="text"
                        defaultValue="Admin Layout Builder"
                        className="w-full px-3.5 py-2.5 border border-gray-200/90 rounded-xl text-xs font-medium text-gray-800 bg-white shadow-2xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      />
                    </div>

                    {/* INQUIRY TYPE */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                        <Tag className="w-3.5 h-3.5 text-gray-400" />
                        <span>Inquiry Type</span>
                      </label>
                      <input
                        type="text"
                        defaultValue={`${selectedService} Consultation`}
                        className="w-full px-3.5 py-2.5 border border-gray-200/90 rounded-xl text-xs font-medium text-gray-800 bg-white shadow-2xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      />
                    </div>
                  </div>

                  {/* Right Column: Activity & Timeline */}
                  <div className="lg:col-span-6 space-y-6">
                    {/* Note Input Box */}
                    <div className="border border-gray-200 rounded-xl p-3.5 bg-white shadow-2xs space-y-3">
                      <textarea
                        rows={3}
                        value={previewNote}
                        onChange={(e) => setPreviewNote(e.target.value)}
                        placeholder="Record new client activity or note..."
                        className="w-full text-xs font-medium text-gray-800 placeholder-gray-400 outline-none resize-none bg-transparent"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      />
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200/60" style={{ fontFamily: "Outfit, sans-serif" }}>
                          Activity
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (!previewNote.trim()) return;
                            setPreviewNotesList((prev) => [
                              { text: previewNote.trim(), date: "Just now" },
                              ...prev,
                            ]);
                            setPreviewNote("");
                            toast.success("Activity note posted");
                          }}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          <Send className="w-3 h-3" />
                          <span>Post</span>
                        </button>
                      </div>
                    </div>

                    {/* Activity Timeline */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                            Activity Timeline ({3 + previewNotesList.length})
                          </span>
                        </div>
                        <div className="relative">
                          <select
                            className="text-xs font-semibold text-gray-500 bg-transparent pr-4 outline-none cursor-pointer"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          >
                            <option value="all">All Events</option>
                            <option value="stages">Stages</option>
                            <option value="calls">Calls</option>
                            <option value="notes">Notes</option>
                          </select>
                          <ChevronDown className="w-3 h-3 text-gray-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      {/* Timeline Items */}
                      <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                        {/* Dynamically added notes */}
                        {previewNotesList.map((n, idx) => (
                          <div key={idx} className="relative flex items-start gap-3">
                            <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center ring-4 ring-white shadow-2xs">
                              <FileText className="w-2.5 h-2.5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                                  Internal Note
                                </span>
                                <span className="text-[11px] text-gray-400 font-medium">
                                  {n.date}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 mt-0.5 font-medium">{n.text}</p>
                            </div>
                          </div>
                        ))}

                        {/* Timeline Item 1: Stage Updated */}
                        <div className="relative flex items-start gap-3">
                          <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center ring-4 ring-white shadow-2xs">
                            <Layers className="w-2.5 h-2.5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                                  Stage Updated
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60" style={{ fontFamily: "Outfit, sans-serif" }}>
                                  In Progress
                                </span>
                              </div>
                              <span className="text-[11px] text-gray-400 font-medium">
                                Sep 22, 2026, 1:59 PM
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5 font-medium">
                              via Pipeline Automation • EM new leads
                            </p>
                          </div>
                        </div>

                        {/* Timeline Item 2: Outbound Call */}
                        <div className="relative flex items-start gap-3">
                          <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center ring-4 ring-white shadow-2xs">
                            <Phone className="w-2.5 h-2.5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                                  Outbound Call Completed
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200/60" style={{ fontFamily: "Outfit, sans-serif" }}>
                                  Scheduled
                                </span>
                              </div>
                              <span className="text-[11px] text-gray-400 font-medium">
                                Sep 22, 2026, 1:59 PM
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5 font-medium">
                              via Voice Assistant
                            </p>
                          </div>
                        </div>

                        {/* Timeline Item 3: Appointment Booked */}
                        <div className="relative flex items-start gap-3">
                          <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center ring-4 ring-white shadow-2xs">
                            <Calendar className="w-2.5 h-2.5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                                  Appointment Booked
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60" style={{ fontFamily: "Outfit, sans-serif" }}>
                                  Confirmed
                                </span>
                              </div>
                              <span className="text-[11px] text-gray-400 font-medium">
                                Sep 21, 2026, 11:30 AM
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5 font-medium">
                              via Calendar Integration
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      {/* ── Field Drawer (Right Side) ── */}
      {fieldModalOpen && (
        <AdminFieldDrawer
          field={editingField}
          initialModule={activeModule}
          initialContactCategory={activeModule === "client" ? contactCategoryFilter : undefined}
          sections={allSections}
          isScribeSeed={editingField ? isScribeSeed(editingField) : false}
          onClose={() => {
            setFieldModalOpen(false);
            setEditingField(null);
          }}
        />
      )}

      {/* ── Section Drawer ── */}
      {sectionDrawerOpen && (
        <AdminSectionDrawer
          section={editingSection}
          initialModule={activeModule}
          initialContactCategory={activeModule === "client" ? contactCategoryFilter : undefined}
          onClose={() => {
            setSectionDrawerOpen(false);
            setEditingSection(null);
          }}
        />
      )}

      {/* ── Add Category Modal ── */}
      {isAddCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                Add Contact Category
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddCategoryModalOpen(false);
                  setNewCategoryName("");
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Create a custom contact category (e.g. Partner, Distributor, Contractor) to segment your fields and sections.
            </p>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g. Partner, Contractor..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && newCategoryName.trim()) {
                  const cat = newCategoryName.trim();
                  addContactCategory(cat);
                  setContactCategoryFilter(cat);
                  setIsAddCategoryModalOpen(false);
                  setNewCategoryName("");
                }
              }}
            />
            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => {
                  setIsAddCategoryModalOpen(false);
                  setNewCategoryName("");
                }}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newCategoryName.trim()) return;
                  const cat = newCategoryName.trim();
                  addContactCategory(cat);
                  setContactCategoryFilter(cat);
                  setIsAddCategoryModalOpen(false);
                  setNewCategoryName("");
                }}
                disabled={!newCategoryName.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}



      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-gray-900">
              Delete {deleteTarget.type === "field" ? "Custom Field" : "Custom Section"}?
            </h3>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-gray-900 font-semibold">"{deleteTarget.name}"</strong>?
              This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default AdminCustomFields;
