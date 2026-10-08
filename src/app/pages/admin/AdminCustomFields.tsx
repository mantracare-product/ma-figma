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
} from "../../context/FieldRegistryContext";
import PageHeader from "../../components/layout/PageHeader";
import PageTopBar from "../../components/layout/PageTopBar";
import TableComponent, { TableColumn, TableRowAction } from "../../components/ui/TableComponent";
import { AdminSectionDrawer } from "./components/AdminSectionDrawer";
import { AdminFieldDrawer } from "./components/AdminFieldDrawer";
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
  { label: "Clients",       value: "client" },
  { label: "Call Logs",     value: "call" },
  { label: "Processes",     value: "process" },
  { label: "Appointments",  value: "appointment" },
  { label: "Services",      value: "service" },
  { label: "Organizations", value: "organization" },
  { label: "Team Members",  value: "teamMember" },
  { label: "AI Scribe",     value: "scribe" },
];

const FIELD_TYPES: { label: string; value: FieldInputType }[] = [
  { label: "Text", value: "text" },
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
  textarea: "Text (Paragraph)",
  richtext: "Text (Rich Text)",
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
  const [activeModule, setActiveModule] = useState<Exclude<FieldModule, "deal">>("client");
  const [activeTab, setActiveTab] = useState<"fields" | "sections">("fields");
  const [searchQuery, setSearchQuery] = useState("");

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
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allFields;
    return allFields.filter(
      (f) =>
        f.label.toLowerCase().includes(q) ||
        f.key.toLowerCase().includes(q) ||
        f.inputType.toLowerCase().includes(q)
    );
  }, [allFields, searchQuery]);

  // Filtered Sections
  const filteredSections = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allSections;
    return allSections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q))
    );
  }, [allSections, searchQuery]);

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
          title="Sections & Fields"
          subtitle="Configure system and custom fields, layout sections, validation rules, and scoping across modules"
        />

        {/* ── UNIFIED TOOLBAR powered by PageTopBar ── */}
      <PageTopBar
        modes={[
          { id: "fields", label: "Fields" },
          { id: "sections", label: "Sections" },
        ]}
        activeMode={activeTab}
        onModeChange={(m) => setActiveTab(m as typeof activeTab)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={
          activeTab === "fields"
            ? `Search ${currentModLabel.toLowerCase()} fields...`
            : `Search ${currentModLabel.toLowerCase()} sections...`
        }
        leftElement={
          <div className="relative border border-gray-200 rounded-lg bg-gray-50 px-2.5 py-1 flex items-center mr-1">
            <select
              value={activeModule}
              onChange={(e) => setActiveModule(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-gray-800 pr-4 outline-none cursor-pointer appearance-none"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {MODULE_TABS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-gray-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
            : [
                {
                  id: "all",
                  label: "All Sections",
                  isActive: !searchQuery,
                  onClick: () => setSearchQuery(""),
                },
              ]
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
            : [
                {
                  id: "title",
                  label: "Section Title",
                  type: "text",
                  placeholder: "Filter sections...",
                  value: searchQuery,
                  onChange: (val) => setSearchQuery(val || ""),
                },
              ]
        }
        primaryAction={{
          label: activeTab === "fields" ? "Add Field" : "Add Section",
          icon: <Plus className="w-4 h-4" />,
          onClick: () => {
            if (activeTab === "fields") {
              handleOpenCreateField();
            } else {
              setEditingSection(null);
              setSectionDrawerOpen(true);
            }
          },
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
                  field.compositeDisplayMode !== undefined ||
                  field.inputType === "table" ||
                  field.inputType === "group" ||
                  field.inputType === "group_repeatable" ||
                  (field.inputType === "list_open" && (field.listEntryType === "structured" || (field.subFields && field.subFields.length > 0))) ||
                  (field.tableColumns && field.tableColumns.length > 0 && field.inputType !== "list_select" && field.inputType !== "multiselect" && !field.listConfig);

                const isListField =
                  !isCompositeField &&
                  (field.inputType === "list_open" ||
                  field.inputType === "list_select" ||
                  field.inputType === "select" ||
                  field.inputType === "multiselect" ||
                  field.inputType === "list");

                const typeName =
                  isCompositeField
                    ? field.compositeDisplayMode === "table" || field.inputType === "table"
                      ? "Group Field (Table)"
                      : "Group Field (Group)"
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

      {/* ── Field Drawer (Right Side) ── */}
      {fieldModalOpen && (
        <AdminFieldDrawer
          field={editingField}
          initialModule={activeModule}
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
          onClose={() => {
            setSectionDrawerOpen(false);
            setEditingSection(null);
          }}
        />
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
