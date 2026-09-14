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

import React, { useState, useMemo } from "react";
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
import { AdminSectionDrawer } from "./components/AdminSectionDrawer";
import { AdminFieldDrawer } from "./components/AdminFieldDrawer";
import {
  INITIAL_INDUSTRIES,
  STANDARD_LOCATIONS,
  getIndustriesForCategory,
} from "../../../data/industryReferenceData";

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
  { label: "Textarea (Long)", value: "textarea" },
  { label: "Number", value: "number" },
  { label: "Money / Currency", value: "money" },
  { label: "Date", value: "date" },
  { label: "List", value: "list_select" },
  { label: "Open List (Tags)", value: "list_open" },
  { label: "Boolean (Yes/No)", value: "yes_no" },
  { label: "Email", value: "email" },
  { label: "Phone Number", value: "tel" },
  { label: "Link / URL", value: "link" },
  { label: "Table / Matrix", value: "table" },
  { label: "Group / Composite", value: "group" },
  { label: "CRM Bind", value: "crm_bind" },
  { label: "Digital Signature", value: "signature" },
  { label: "File Attachment", value: "file" },
  { label: "User / Member", value: "user" },
];

const FIELD_TYPE_REVERSE_MAP: Record<string, string> = {
  text: "String / Text",
  table: "Table",
  signature: "Drawing / Signature",
  drawing: "Drawing / Signature",
  list_select: "List",
  list_open: "Open List",
  group: "Group / Composite",
  group_repeatable: "Open List (Structured)",
  crm_bind: "CRM Bind",
  select: "List",
  multiselect: "List (Multi)",
  date: "Date",
  date_time: "Date & Time",
  number: "Number",
  money: "Money / Currency",
  textarea: "Address / Text Area",
  richtext: "Rich Text",
  link: "Link",
  whatsapp_link: "WhatsApp Link",
  yes_no: "Yes / No",
  file: "File / Attachment",
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
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* ── Page Title ── */}
      <div>
        <h1 className="text-[22px] font-bold text-[#111827] leading-tight">Sections/Fields</h1>
        <p className="text-xs text-gray-500 mt-0.5">Manage entity schemas and layout sections.</p>
      </div>


      {/* ── Pill toggle + Search (matches client Settings layout) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex items-center gap-0 bg-gray-100 p-1 rounded-lg border border-gray-200">
          <button type="button" onClick={() => setActiveTab("fields")}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "fields" ? "bg-white text-[#111827] shadow-xs font-bold" : "text-gray-500 hover:text-gray-800"
            }`}>
            Custom Fields
          </button>
          <button type="button" onClick={() => setActiveTab("sections")}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "sections" ? "bg-white text-[#111827] shadow-xs font-bold" : "text-gray-500 hover:text-gray-800"
            }`}>
            Custom Sections
          </button>
        </div>
        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text"
            placeholder={activeTab === "fields" ? "Search fields..." : "Search sections..."}
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400" />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ── UNIFIED CONTAINER: TAB BAR JOINED DIRECTLY WITH TABLE ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        {/* Module Tabs Bar */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gray-200 bg-white">
          {/* Rectangular Module Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {MODULE_TABS.map((m) => {
              const isSelected = activeModule === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setActiveModule(m.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? "bg-[#111827] text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Action Button inside Bar */}
          {activeTab === "fields" ? (
            <button
              type="button"
              onClick={handleOpenCreateField}
              className="px-3.5 py-1.5 bg-[#111827] text-white rounded-lg text-xs font-semibold hover:bg-[#1f2937] transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ml-3"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Field
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditingSection(null);
                setSectionDrawerOpen(true);
              }}
              className="px-3.5 py-1.5 bg-[#111827] text-white rounded-lg text-xs font-semibold hover:bg-[#1f2937] transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ml-3"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Section
            </button>
          )}
        </div>

        {/* TAB 1: CUSTOM FIELDS TABLE VIEW */}
        {activeTab === "fields" && (
          <table className="w-full">
            <thead className="bg-[#F8FAFC] border-b border-gray-200">
              <tr>
                <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Label</th>
                <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Key</th>
                <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Required</th>
                <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Scope</th>
                <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFields.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center">
                    <p className="text-sm text-gray-500">No fields found for this module.</p>
                    <p className="text-xs text-gray-400 mt-1">Click "Add Field" above to define one.</p>
                  </td>
                </tr>
              ) : (
                filteredFields.map((field) => {
                  const scribeSeed = isScribeSeed(field);
                  const systemField = isSystemField(field);

                  const typeName =
                    field.inputType === "list_open"
                      ? field.listEntryType === "structured"
                        ? "Open List (Structured)"
                        : "Open List (Tags)"
                      : FIELD_TYPE_REVERSE_MAP[field.inputType] || field.inputType.toUpperCase();
                  let typeBadgeStyle = "bg-blue-50 text-blue-700";
                  let TypeIcon = Type;
                  if (field.inputType === "table") { typeBadgeStyle = "bg-indigo-50 text-indigo-700"; TypeIcon = TableIcon; }
                  else if (field.inputType === "signature" || field.inputType === "drawing") { typeBadgeStyle = "bg-rose-50 text-rose-700"; TypeIcon = PenTool; }
                  else if (field.inputType === "select" || field.inputType === "list" || field.inputType === "list_select") {
                    typeBadgeStyle = field.selectionMode === "multiple" ? "bg-teal-50 text-teal-700" : "bg-emerald-50 text-emerald-700";
                    TypeIcon = ClipboardList;
                  }
                  else if (field.inputType === "multiselect") { typeBadgeStyle = "bg-teal-50 text-teal-700"; TypeIcon = Tag; }
                  else if (field.inputType === "list_open") {
                    if (field.listEntryType === "structured") {
                      typeBadgeStyle = "bg-purple-50 text-purple-700";
                      TypeIcon = Layers;
                    } else {
                      typeBadgeStyle = "bg-emerald-50 text-emerald-700";
                      TypeIcon = Tag;
                    }
                  }
                  else if (field.inputType === "group" || field.inputType === "group_repeatable") { typeBadgeStyle = "bg-purple-50 text-purple-700"; TypeIcon = Layers; }
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
                    <tr
                      key={`${field.module}-${field.key}`}
                      className="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50/60"
                    >
                      <td className="px-5 py-3.5 text-center">
                        <span className="text-sm font-medium text-[#111827]">{field.label}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{field.key}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${typeBadgeStyle}`}>
                          <TypeIcon className="w-3.5 h-3.5" />
                          <span>{typeName}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {field.required ? (
                          <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/50">Required</span>
                        ) : (
                          <span className="text-xs text-gray-400">Optional</span>
                        )}
                      </td>
                      {/* Scope */}
                      <td className="px-5 py-3.5 text-center">
                        {renderScopeCell(field)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditField(field)}
                            className="p-1.5 text-gray-400 hover:text-[#111827] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                            title={scribeSeed ? "View details (protected)" : "Edit field"}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {scribeSeed ? (
                            <button
                              type="button"
                              disabled
                              className="p-1.5 text-amber-400 cursor-not-allowed opacity-60"
                              title="Scribe seed fields cannot be deleted"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          ) : systemField ? (
                            <button
                              type="button"
                              disabled
                              className="p-1.5 text-gray-300 cursor-not-allowed opacity-40"
                              title="Built-in system fields cannot be deleted"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget({ type: "field", id: field.id, name: field.label })}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete field"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {/* TAB 2: CUSTOM SECTIONS TABLE VIEW */}
        {activeTab === "sections" && (
          <table className="w-full">
            <thead className="bg-[#F8FAFC] border-b border-gray-200">
              <tr>
                <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Section</th>
                <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Scope</th>
                <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Fields</th>
                <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSections.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center">
                    <p className="text-sm text-gray-500">No sections found for this module.</p>
                    <p className="text-xs text-gray-400 mt-1">Click "Add Section" above to define one.</p>
                  </td>
                </tr>
              ) : (
                filteredSections.map((sec) => {
                  const isSystem = isSystemSection(sec);
                  const assignedFieldCount = (sec.fieldKeys || []).length;

                  return (
                    <tr
                      key={sec.id}
                      className="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50/60"
                    >
                      <td className="px-5 py-3.5 text-center">
                        <span className="text-sm font-medium text-[#111827]">{sec.title}</span>
                      </td>
                      {/* Description */}
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className="text-xs text-gray-500 max-w-[240px] truncate inline-block"
                          title={sec.description || ""}
                        >
                          {sec.description || <span className="text-gray-300 italic">—</span>}
                        </span>
                      </td>
                      {/* Scope */}
                      <td className="px-5 py-3.5 text-center">
                        {renderScopeCell(sec)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="text-xs text-gray-500 font-medium">
                          {assignedFieldCount} {assignedFieldCount === 1 ? "field" : "fields"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSection(sec);
                              setSectionDrawerOpen(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-[#111827] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit section"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {!isSystem ? (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget({ type: "section", id: sec.id, name: sec.title })}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete section"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="w-7" />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

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
  );
}

export default AdminCustomFields;
