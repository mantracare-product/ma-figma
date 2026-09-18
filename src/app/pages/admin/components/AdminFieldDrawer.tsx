/**
 * AdminFieldDrawer.tsx
 * Path: src/app/pages/admin/components/AdminFieldDrawer.tsx
 *
 * Slide-in right-panel for creating or editing a custom FieldDefinition.
 * Rendered by AdminCustomFields.tsx, reachable at /admin/custom-fields.
 * Also rendered in edit mode on client records via DraggableOverviewSections.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  ChevronDown,
  Check,
  Plus,
  Trash2,
  Lock,
  AlertCircle,
  Settings2,
  Globe,
  Shield,
  Link2,
  Layers,
  Star,
  Database,
  Type,
  Calendar,
  Hash,
  Paperclip,
  Phone,
  FileText,
  AlignLeft,
  Sparkles,
  ArrowUpDown,
  Search,
  Copy,
  ChevronUp,
} from "lucide-react";
import type {
  FieldDefinition,
  FieldInputType,
  FieldModule,
  FieldOption,
  OptionValueType,
  ListValueType,
  SectionDefinition,
  TableColumnConfig,
  ScopingRule,
  FieldPermissions,
  CrmBindModule,
  SubFieldConfig,
  SubFieldInputType,
  ListBindConfig,
  ListFieldConfig,
} from "../../../context/FieldRegistryContext";
import {
  useFieldRegistry,
  normalizeLegacyColumn,
  CURRENCY_SYMBOLS,
  getSuggestedPlaceholderForType,
} from "../../../context/FieldRegistryContext";
import { AdminScopingRulesEditor } from "./AdminScopingRulesEditor";
import { getStoredProcesses, Process, PROCESS_STORE_EVENT } from "../../../../lib/useProcessStore";
import { InfoTooltip } from "../../../components/help/InfoTooltip";
import { FieldInputRenderer } from "../../../components/fields/FieldInputRenderer";
import { AdminSelect } from "../../../components/ui/AdminSelect";
import { StageMultiSelect } from "./StageMultiSelect";

// MODULE_OPTIONS values must EXACTLY match normalizeModuleKey() recognised strings.
export const MODULE_OPTIONS: { label: string; value: Exclude<FieldModule, "deal"> }[] = [
  { label: "Client",       value: "client" },
  { label: "Process",      value: "process" },
  { label: "Appointment",  value: "appointment" },
  { label: "Call Log",     value: "call" },
  { label: "Service",      value: "service" },
  { label: "Organization", value: "organization" },
  { label: "Team Member",  value: "teamMember" },
  { label: "AI Scribe",    value: "scribe" },
];

export type PrimaryFieldTypeCategory =
  | "text"
  | "number"
  | "date_time"
  | "money"
  | "tel"
  | "email"
  | "link"
  | "whatsapp_link"
  | "list"
  | "yes_no"
  | "rating"
  | "composite"
  | "crm_bind"
  | "media"
  | "signature"
  | "user";

const CONSOLIDATED_FIELD_TYPES: {
  category: string;
  items: {
    id: PrimaryFieldTypeCategory;
    label: string;
    description: string;
  }[];
}[] = [
  {
    category: "Text & Content",
    items: [
      { id: "text", label: "Text", description: "Short text inputs or formatted multiline paragraphs" },
      { id: "tel", label: "Phone Number", description: "Phone number with country codes and formatting" },
      { id: "email", label: "Email", description: "Standard email address input" },
      { id: "link", label: "Link / URL", description: "Web links and external URLs" },
      { id: "whatsapp_link", label: "WhatsApp Link", description: "Direct WhatsApp chat link" },
    ],
  },
  {
    category: "Numbers & Dates",
    items: [
      { id: "number", label: "Number", description: "Integer counts or bounded numeric range sliders" },
      { id: "money", label: "Money / Currency", description: "Financial values with currency denomination" },
      { id: "date_time", label: "Date & Time", description: "Date capture, time capture, or combined timestamp" },
      { id: "rating", label: "Rating / Score", description: "Star ratings and score assessments" },
    ],
  },
  {
    category: "Options & Logic",
    items: [
      { id: "list", label: "List", description: "Typed options, search filters, sorting, and 2-way sync" },
      { id: "yes_no", label: "Yes / No", description: "Binary boolean toggle" },
    ],
  },
  {
    category: "Advanced & Media",
    items: [
      { id: "composite", label: "Composite Field", description: "Multi-field records presented as Table View or Group View" },
      { id: "crm_bind", label: "Link to Mantra Entities", description: "Dynamically link to team members, clients, or services" },
      { id: "media", label: "Media Attach", description: "Image, document, or audio upload attachments" },
      { id: "signature", label: "Digital Signature", description: "Interactive touchscreen drawing signature pad" },
      { id: "user", label: "User / Member", description: "Assign staff or team members" },
    ],
  },
];

const COMMON_DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (e.g. 24/08/2026)" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (e.g. 08/24/2026)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (e.g. 2026-08-24)" },
  { value: "D MMMM YYYY", label: "D MMMM YYYY (e.g. 24 August 2026)" },
  { value: "MMM D, YYYY", label: "MMM D, YYYY (e.g. Aug 24, 2026)" },
];

const COMMON_PHONE_FORMATS = [
  { value: "+1 (555) 123-4567", label: "+1 (555) 123-4567 (US / Canada)" },
  { value: "555-123-4567", label: "555-123-4567 (National Hyphenated)" },
  { value: "+91 98765 43210", label: "+91 98765 43210 (India Spaced)" },
  { value: "international", label: "International E.164 (+XX XXXXXXXXXX)" },
  { value: "(XXX) XXX-XXXX", label: "(XXX) XXX-XXXX (Generic Parentheses)" },
];

const COMMON_TIMEZONES = [
  { value: "Local", label: "Local User Timezone" },
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST +5:30)" },
  { value: "America/New_York", label: "America/New_York (EST/EDT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST/PDT)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST +4:00)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT +8:00)" },
];

const MEDIA_PRESET_FORMATS: Record<"image" | "document" | "audio", string[]> = {
  image: ["JPG", "PNG", "WEBP", "SVG", "GIF"],
  document: ["PDF", "DOCX", "XLSX", "TXT", "CSV"],
  audio: ["MP3", "WAV", "AAC", "M4A", "OGG"],
};

const LIST_OPTION_VALUE_TYPES: { value: ListValueType; label: string; category: string }[] = CONSOLIDATED_FIELD_TYPES.flatMap((grp) =>
  grp.items
    .filter((i) => i.id !== "list")
    .map((i) => ({
      value: i.id as ListValueType,
      label: i.label,
      category: grp.category,
    }))
);

export function formatCompositePreview(val: any): string {
  if (val === undefined || val === null || val === "") return "";
  if (Array.isArray(val)) {
    return val.filter((v) => v !== undefined && v !== null && String(v).trim() !== "").join(", ");
  }
  if (typeof val === "object") {
    return Object.values(val).filter((v) => v !== undefined && v !== null && String(v).trim() !== "").join(", ");
  }
  const str = String(val);
  return str.split(",").map((s) => s.trim()).filter(Boolean).join(", ");
}

interface FieldFormState {
  label: string;
  key: string;
  module: Exclude<FieldModule, "deal">;
  selectedModules: Exclude<FieldModule, "deal">[];
  primaryCategory: PrimaryFieldTypeCategory;
  placeholder: string;
  tooltip: string;
  required: boolean;
  requiredStages: string[];
  showAlways: boolean;
  userVisibility: boolean;
  sectionId: string;
  scopingRules: ScopingRule[];
  processIds: string[];
  permissions: FieldPermissions;

  // Text configuration
  textMode: "short" | "paragraph";
  maxChars?: number;
  richText: boolean;

  // Date & Time configuration
  dateTimeCapture: "date" | "time" | "both";
  dateFormat: string;
  timeFormat: "12h" | "24h";
  timezone: string;

  // Composite field configuration
  compositeDisplayMode: "table" | "group";
  tableColumns: TableColumnConfig[];

  // Media Attach configuration
  mediaType: "image" | "document" | "audio";
  acceptedFormats: string[];
  maxFileSizeMB: number;
  allowMultipleFiles: boolean;
  maxFiles?: number;

  // Number configuration
  numberMode: "integer" | "range";
  maxCap?: number;
  minRange?: number;
  maxRange?: number;

  // Phone configuration
  phoneCountryDisplay: "name" | "code";
  phoneShowFlags: boolean;
  phoneRegex: string;
  phoneFormat: string;

  // Currency & Rating
  currency: string;
  maxRating: number;

  // Options & List Redesign
  listValueType: ListValueType;
  inheritedFieldKey: string;
  liveSync: boolean;
  options: FieldOption[];
  selectionMode: "single" | "multiple";
  allowSearch: boolean;
  sortOrder: "alphabetical_asc" | "alphabetical_desc" | "manual" | "recent";
  liveLinkedFieldKey: string;

  // CRM Bind / Link to Mantra Entities
  crmBindModule: CrmBindModule;
  crmBindSelectionMode: "single" | "multiple";

  // Default value
  defaultValue?: any;
}

function resolvePrimaryCategory(f: FieldDefinition): PrimaryFieldTypeCategory {
  const t = f.inputType;
  if (t === "text" || t === "textarea" || t === "richtext") return "text";
  if (t === "number") return "number";
  if (t === "date" || t === "date_time") return "date_time";
  if (t === "money") return "money";
  if (t === "tel") return "tel";
  if (t === "email") return "email";
  if (t === "link") return "link";
  if (t === "whatsapp_link") return "whatsapp_link";
  if (t === "yes_no") return "yes_no";
  if (t === "rating") return "rating";
  if (t === "table" || t === "group" || t === "group_repeatable") return "composite";
  if (t === "crm_bind") return "crm_bind";
  if (t === "file") return "media";
  if (t === "signature" || t === "drawing") return "signature";
  if (t === "user") return "user";
  if (t === "list_select" || t === "list_open" || t === "select" || t === "multiselect" || t === "list") return "list";
  return "text";
}

function defaultForm(module: Exclude<FieldModule, "deal">, initialCategory: PrimaryFieldTypeCategory = "text"): FieldFormState {
  return {
    label: "",
    key: "",
    module,
    selectedModules: [module],
    primaryCategory: initialCategory,
    placeholder: "",
    tooltip: "",
    required: false,
    requiredStages: [],
    showAlways: true,
    userVisibility: true,
    sectionId: "",
    scopingRules: [],
    processIds: [],
    permissions: {
      canHide: true,
      canEdit: true,
      canAddOptions: true,
      canDelete: true,
    },
    // Text
    textMode: "short",
    maxChars: undefined,
    richText: false,
    // Date
    dateTimeCapture: "date",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "12h",
    timezone: "Local",
    // Composite
    compositeDisplayMode: "table",
    tableColumns: [
      { id: "col_1", name: "Item Name", type: "Text", placeholder: "e.g. Consulting Hours" },
      { id: "col_2", name: "Quantity", type: "Number", placeholder: "e.g. 1" },
      { id: "col_3", name: "Unit Price", type: "Money", currency: "INR", placeholder: "e.g. 500.00" },
    ],
    // Media
    mediaType: "document",
    acceptedFormats: ["PDF", "DOCX", "JPG", "PNG"],
    maxFileSizeMB: 10,
    allowMultipleFiles: false,
    maxFiles: undefined,
    // Number
    numberMode: "integer",
    maxCap: undefined,
    minRange: 0,
    maxRange: 100,
    // Phone
    phoneCountryDisplay: "name",
    phoneShowFlags: true,
    phoneRegex: "",
    phoneFormat: "+1 (555) 123-4567",
    // Rating / Currency
    currency: "INR",
    maxRating: 5,
    // List Redesign
    listValueType: "text",
    inheritedFieldKey: "",
    liveSync: false,
    options: [],
    selectionMode: "single",
    allowSearch: true,
    sortOrder: "manual",
    liveLinkedFieldKey: "",
    // CRM Bind
    crmBindModule: "teamMember",
    crmBindSelectionMode: "single",
    defaultValue: undefined,
  };
}

export function initFormFromField(f: FieldDefinition): FieldFormState {
  let rules: ScopingRule[] = f.scopingRules ? [...f.scopingRules] : [];
  if (rules.length === 0 && (f.industryCategory || f.industry || (f.locations && f.locations.length > 0))) {
    rules = [
      {
        id: `rule_legacy_${Date.now()}`,
        industryCategory: f.industryCategory || "All",
        industries: f.industry && f.industry !== "All" ? [f.industry] : [],
        locations: f.locations && f.locations.length > 0 && !f.locations.includes("All") ? f.locations : [],
      },
    ];
  }

  const primaryCategory = resolvePrimaryCategory(f);
  const rawModules: Exclude<FieldModule, "deal">[] = [
    f.module as Exclude<FieldModule, "deal">,
    ...((f.reusableModules as Exclude<FieldModule, "deal">[]) || []),
  ];
  const selectedModules = Array.from(new Set(rawModules)).filter(Boolean);

  const isMultiSelect = f.inputType === "multiselect" || f.selectionMode === "multiple";

  const rawOptions = f.options ?? [];

  const typedOptions: FieldOption[] = rawOptions.map((opt, idx) => ({
    id: opt.id || idx + 1,
    label: opt.label,
    value: opt.value,
    index: opt.index ?? idx + 1,
  }));

  const tableColumns: TableColumnConfig[] = f.tableColumns
    ? f.tableColumns.map((col) => ({ ...col, placeholder: col.placeholder ?? "" }))
    : f.subFields
    ? f.subFields.map((sf) => ({
        id: sf.id,
        name: sf.name,
        type: sf.inputType === "list_select" ? "Select" : sf.inputType === "money" ? "Money" : sf.inputType === "number" ? "Number" : sf.inputType === "date" ? "Date" : sf.inputType === "date_time" ? "Date & Time" : sf.inputType === "textarea" ? "Long Text" : sf.inputType === "yes_no" ? "Yes / No" : sf.inputType === "email" ? "Email" : sf.inputType === "tel" ? "Phone" : sf.inputType === "link" ? "Link" : sf.inputType === "rating" ? "Rating" : sf.inputType === "crm_bind" ? "crm_bind" : "Text",
        inputType: sf.inputType,
        placeholder: sf.placeholder ?? "",
        options: sf.options,
        currency: sf.currency,
        selectionMode: sf.selectionMode || "single",
        crmBindConfig: sf.crmBindConfig,
        maxRating: sf.maxRating || 5,
        listBindConfig: sf.listBindConfig,
        defaultValue: sf.defaultValue,
      }))
    : [
        { id: "col_1", name: "Item Name", type: "Text", placeholder: "e.g. Consulting Hours" },
        { id: "col_2", name: "Quantity", type: "Number", placeholder: "e.g. 1" },
        { id: "col_3", name: "Unit Price", type: "Money", currency: "INR", placeholder: "e.g. 500.00" },
      ];

  return {
    label: f.label,
    key: f.key,
    module: f.module as Exclude<FieldModule, "deal">,
    selectedModules: selectedModules.length > 0 ? selectedModules : [f.module as Exclude<FieldModule, "deal">],
    primaryCategory,
    placeholder: f.placeholder ?? "",
    tooltip: f.tooltip ?? "",
    required: Boolean(f.required),
    requiredStages: f.requiredStages ? [...f.requiredStages] : [],
    showAlways: f.showAlways !== false,
    userVisibility: f.userVisibility !== false,
    sectionId: f.sectionId ?? "",
    scopingRules: rules,
    processIds: f.processIds ? [...f.processIds] : [],
    permissions: {
      canHide: f.permissions?.canHide !== false,
      canEdit: f.permissions?.canEdit !== false,
      canAddOptions: f.permissions?.canAddOptions !== false,
      canDelete: f.permissions?.canDelete !== false,
    },
    // Text
    textMode: f.textConfig?.textMode || (f.inputType === "textarea" || f.inputType === "richtext" ? "paragraph" : "short"),
    maxChars: f.textConfig?.maxChars,
    richText: f.textConfig?.richText ?? (f.inputType === "richtext"),
    // Date
    dateTimeCapture: f.dateConfig?.capture || (f.inputType === "date_time" ? "both" : "date"),
    dateFormat: f.dateConfig?.dateFormat || "DD/MM/YYYY",
    timeFormat: f.dateConfig?.timeFormat || "12h",
    timezone: f.dateConfig?.timezone || "Local",
    // Composite
    compositeDisplayMode: f.compositeDisplayMode || (f.inputType === "group" || f.inputType === "group_repeatable" ? "group" : "table"),
    tableColumns,
    // Media
    mediaType: f.mediaConfig?.mediaType || "document",
    acceptedFormats: f.mediaConfig?.acceptedFormats || MEDIA_PRESET_FORMATS[f.mediaConfig?.mediaType || "document"],
    maxFileSizeMB: f.mediaConfig?.maxFileSizeMB || 10,
    allowMultipleFiles: Boolean(f.mediaConfig?.allowMultiple),
    maxFiles: f.mediaConfig?.maxFiles,
    // Number
    numberMode: f.numberConfig?.numberMode || "integer",
    maxCap: f.numberConfig?.numberMode === "integer" ? f.numberConfig?.max : undefined,
    minRange: f.numberConfig?.min ?? 0,
    maxRange: f.numberConfig?.max ?? 100,
    // Phone
    phoneCountryDisplay: f.phoneConfig?.countryCodeDisplay || "name",
    phoneShowFlags: f.phoneConfig?.showFlags ?? true,
    phoneRegex: f.phoneConfig?.regexValidation || "",
    phoneFormat: f.phoneConfig?.numberFormat || "+1 (555) 123-4567",
    // Rating / Currency
    currency: f.currency || "INR",
    maxRating: f.maxRating || 5,
    // List Redesign
    listValueType: (f.listConfig?.valueType as ListValueType) || "text",
    inheritedFieldKey: f.listConfig?.inheritedFieldKey || "",
    liveSync: Boolean(f.listConfig?.liveLinkedFieldKey),
    options: typedOptions,
    selectionMode: isMultiSelect ? "multiple" : "single",
    allowSearch: f.listConfig?.allowSearch !== false,
    sortOrder: f.listConfig?.sortOrder || "manual",
    liveLinkedFieldKey: f.listConfig?.liveLinkedFieldKey || "",
    // CRM Bind
    crmBindModule: f.crmBindConfig?.sourceModule || "teamMember",
    crmBindSelectionMode: f.crmBindConfig?.selectionMode || "single",
    defaultValue: f.defaultValue,
  };
}

export const fieldToForm = initFormFromField;

export interface AdminFieldDrawerProps {
  field: FieldDefinition | null;
  initialModule: Exclude<FieldModule, "deal">;
  sections?: SectionDefinition[];
  isScribeSeed?: boolean;
  isAdmin?: boolean;
  lockModule?: boolean;
  lockCategory?: boolean;
  initialCategory?: PrimaryFieldTypeCategory;
  zIndex?: number;
  onClose: () => void;
  onSaved?: (field: FieldDefinition) => void;
}

export function AdminFieldDrawer({
  field,
  initialModule,
  sections = [],
  isScribeSeed = false,
  isAdmin = true,
  lockModule = false,
  lockCategory = false,
  initialCategory,
  zIndex = 10001,
  onClose,
  onSaved,
}: AdminFieldDrawerProps) {
  const { addCustomField, updateCustomField, getAllFields } = useFieldRegistry();
  const isEdit = field !== null;
  const isReadOnly = isScribeSeed;

  const [form, setForm] = useState<FieldFormState>(
    isEdit ? initFormFromField(field!) : defaultForm(initialModule, initialCategory || "text")
  );

  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [modulePickerOpen, setModulePickerOpen] = useState(false);
  const [existingFieldPickerOpen, setExistingFieldPickerOpen] = useState(false);
  const [fieldSettingsOpen, setFieldSettingsOpen] = useState(false);
  const [scopeDropdownOpen, setScopeDropdownOpen] = useState(false);
  const [permissionsDropdownOpen, setPermissionsDropdownOpen] = useState(false);
  const [allProcesses, setAllProcesses] = useState<Process[]>(getStoredProcesses);
  const [errors, setErrors] = useState<{ label?: string }>({});

  const typePickerRef = useRef<HTMLDivElement>(null);
  const modulePickerRef = useRef<HTMLDivElement>(null);
  const existingFieldPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleUpdate = () => setAllProcesses(getStoredProcesses());
    window.addEventListener(PROCESS_STORE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(PROCESS_STORE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const availableProcesses = useMemo(() => {
    if (!form.scopingRules || form.scopingRules.length === 0) return allProcesses;
    return allProcesses.filter((proc) => {
      return form.scopingRules.some((rule) => {
        const rCat = rule.industryCategory?.trim();
        const rInds = (rule.industries || []).map((i) => i.trim()).filter((i) => i && i !== "All" && i !== "*");
        const rLocs = (rule.locations || []).map((l) => l.trim()).filter((l) => l && l !== "All" && l !== "*");
        const hasCat = Boolean(rCat && rCat !== "All" && rCat !== "*");
        const hasInd = rInds.length > 0;
        const hasLoc = rLocs.length > 0;
        if (!hasCat && !hasInd && !hasLoc) return true;
        if (hasCat && proc.industryCategory && proc.industryCategory !== "All") {
          if (proc.industryCategory.toLowerCase() !== rCat!.toLowerCase()) return false;
        }
        if (hasInd && proc.industry && proc.industry !== "All") {
          if (!rInds.some((ind) => ind.toLowerCase() === proc.industry!.toLowerCase())) return false;
        }
        if (hasLoc && proc.locations && proc.locations.length > 0 && !proc.locations.includes("All")) {
          const hasLocationOverlap = proc.locations.some((pl) =>
            rLocs.some((rl) => rl.toLowerCase() === pl.toLowerCase())
          );
          if (!hasLocationOverlap) return false;
        }
        return true;
      });
    });
  }, [allProcesses, form.scopingRules]);

  const availableStagesForProcess = useMemo(() => {
    if (!form.selectedModules.includes("process")) return [];
    const targetProcesses = form.processIds.length > 0
      ? availableProcesses.filter((p) => form.processIds.includes(p.id) || form.processIds.includes(p.name))
      : availableProcesses;

    const stageMap = new Map<string, string>();
    targetProcesses.forEach((p) => {
      (p.stages || []).forEach((st) => {
        if (st.name && !stageMap.has(st.name)) {
          stageMap.set(st.name, st.name);
        }
      });
    });
    return Array.from(stageMap.keys()).map((name) => ({ id: name, name }));
  }, [form.selectedModules, form.processIds, availableProcesses]);

  // Existing fields in current primary module
  const allFieldsInPrimaryModule = useMemo(() => {
    try {
      return getAllFields(form.module);
    } catch {
      return [];
    }
  }, [getAllFields, form.module]);

  const availableFieldsForComposite = useMemo(() => {
    return allFieldsInPrimaryModule.filter(
      (f) =>
        f.key !== form.key &&
        f.inputType !== "table" &&
        f.inputType !== "group" &&
        f.inputType !== "group_repeatable"
    );
  }, [allFieldsInPrimaryModule, form.key]);

  // Existing List fields in this module for Mode 2 (Copy options) and Live Link Option
  const availableListFieldsInModule = useMemo(() => {
    return allFieldsInPrimaryModule.filter(
      (f) =>
        f.key !== form.key &&
        (f.inputType === "list_select" ||
          f.inputType === "select" ||
          f.inputType === "multiselect" ||
          f.inputType === "list" ||
          (f.options && f.options.length > 0))
    );
  }, [allFieldsInPrimaryModule, form.key]);

  const importExistingFieldToColumn = (f: FieldDefinition) => {
    let colType = "Text";
    if (f.inputType === "number") colType = "Number";
    else if (f.inputType === "money") colType = "Money";
    else if (f.inputType === "list_select" || f.inputType === "select" || f.inputType === "multiselect") colType = "Select";
    else if (f.inputType === "date") colType = "Date";
    else if (f.inputType === "date_time") colType = "Date & Time";
    else if (f.inputType === "textarea") colType = "Long Text";
    else if (f.inputType === "yes_no") colType = "Yes / No";
    else if (f.inputType === "email") colType = "Email";
    else if (f.inputType === "tel") colType = "Phone";
    else if (f.inputType === "link") colType = "Link";
    else if (f.inputType === "rating") colType = "Rating";
    else if (f.inputType === "crm_bind") colType = "crm_bind";

    const newCol: TableColumnConfig = {
      id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: f.label,
      type: colType,
      inputType: (f.inputType as SubFieldInputType) || "text",
      placeholder: f.placeholder || "",
      options: f.options ? [...f.options] : undefined,
      currency: f.currency || (f.inputType === "money" ? "INR" : undefined),
      selectionMode: f.selectionMode || "single",
      crmBindConfig: f.crmBindConfig ? { ...f.crmBindConfig } : undefined,
    };
    setForm((p) => ({
      ...p,
      tableColumns: [...p.tableColumns, newCol],
    }));
  };

  const [nestedDrawerOpen, setNestedDrawerOpen] = useState(false);
  const [nestedDrawerCategory, setNestedDrawerCategory] = useState<PrimaryFieldTypeCategory>("text");

  // Matching fields in this module for type inheritance
  const matchingFieldsInModule = useMemo(() => {
    return allFieldsInPrimaryModule.filter((f) => {
      if (f.key === form.key) return false;
      const cat = resolvePrimaryCategory(f);
      return cat === form.listValueType;
    });
  }, [allFieldsInPrimaryModule, form.key, form.listValueType]);

  // Inherited Field definition used for rendering option value inputs
  const inheritedFieldDef = useMemo(() => {
    if (form.inheritedFieldKey) {
      const found = allFieldsInPrimaryModule.find((f) => f.key === form.inheritedFieldKey);
      if (found) return found;
    }
    // Fallback synthetic FieldDefinition
    return {
      id: "synthetic_opt_field",
      key: "option_val",
      label: "Option Value",
      module: form.module,
      source: "custom",
      createdAt: new Date().toISOString(),
      inputType: form.listValueType === "date_time" ? "date_time" :
                 form.listValueType === "composite" ? "table" :
                 form.listValueType === "tel" ? "tel" :
                 form.listValueType === "money" ? "money" :
                 form.listValueType === "number" ? "number" :
                 form.listValueType === "yes_no" ? "yes_no" :
                 form.listValueType === "link" ? "link" :
                 form.listValueType === "whatsapp_link" ? "whatsapp_link" :
                 form.listValueType === "email" ? "email" :
                 form.listValueType === "rating" ? "rating" :
                 form.listValueType === "signature" ? "signature" :
                 form.listValueType === "media" ? "file" :
                 form.listValueType === "user" ? "user" :
                 form.listValueType === "crm_bind" ? "crm_bind" :
                 "text",
      currency: form.currency || "INR",
      dateFormat: form.dateFormat,
      timeFormat: form.timeFormat,
      phoneFormat: form.phoneFormat,
      phoneCountryDisplay: form.phoneCountryDisplay,
      tableColumns: form.tableColumns,
      crmBindConfig: {
        sourceModule: form.crmBindModule || "teamMember",
        displayField: "name",
        selectionMode: form.crmBindSelectionMode || "single",
      },
      mediaConfig: {
        mediaType: form.mediaType,
        maxFileSizeMB: form.maxFileSizeMB,
        allowMultiple: form.allowMultipleFiles,
      },
    } as unknown as FieldDefinition;
  }, [
    form.inheritedFieldKey,
    form.listValueType,
    form.module,
    allFieldsInPrimaryModule,
    form.currency,
    form.dateFormat,
    form.timeFormat,
    form.phoneFormat,
    form.phoneCountryDisplay,
    form.tableColumns,
    form.crmBindModule,
    form.crmBindSelectionMode,
    form.mediaType,
    form.maxFileSizeMB,
    form.allowMultipleFiles,
  ]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (typePickerRef.current && !typePickerRef.current.contains(e.target as Node)) setTypePickerOpen(false);
      if (modulePickerRef.current && !modulePickerRef.current.contains(e.target as Node)) setModulePickerOpen(false);
      if (existingFieldPickerRef.current && !existingFieldPickerRef.current.contains(e.target as Node)) setExistingFieldPickerOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const handleLabelChange = useCallback((value: string) => {
    setForm((prev) => ({
      ...prev,
      label: value,
      key: isEdit ? prev.key : value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
    }));
  }, [isEdit]);

  const toggleModuleSelection = (modVal: Exclude<FieldModule, "deal">) => {
    if (isReadOnly || lockModule) return;
    setForm((p) => {
      const isAlreadySelected = p.selectedModules.includes(modVal);
      if (isAlreadySelected) {
        if (p.selectedModules.length === 1) return p;
        const nextSelected = p.selectedModules.filter((m) => m !== modVal);
        return {
          ...p,
          selectedModules: nextSelected,
          module: p.module === modVal ? nextSelected[0] : p.module,
        };
      } else {
        return {
          ...p,
          selectedModules: [...p.selectedModules, modVal],
        };
      }
    });
  };

  const validate = (): boolean => {
    const errs: { label?: string } = {};
    if (!form.label.trim()) errs.label = "Field name is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const computeEffectiveInputType = (): FieldInputType => {
    switch (form.primaryCategory) {
      case "text":
        if (form.textMode === "paragraph") {
          return form.richText ? "richtext" : "textarea";
        }
        return "text";
      case "number":
        return "number";
      case "date_time":
        return form.dateTimeCapture === "date" ? "date" : "date_time";
      case "money":
        return "money";
      case "tel":
        return "tel";
      case "email":
        return "email";
      case "link":
        return "link";
      case "whatsapp_link":
        return "whatsapp_link";
      case "yes_no":
        return "yes_no";
      case "rating":
        return "rating";
      case "composite":
        return form.compositeDisplayMode === "table" ? "table" : "group";
      case "crm_bind":
        return "crm_bind";
      case "media":
        return "file";
      case "signature":
        return "signature";
      case "user":
        return "user";
      case "list":
        return form.selectionMode === "multiple" ? "multiselect" : "list_select";
      default:
        return "text";
    }
  };

  const handleSave = () => {
    if (isReadOnly || !validate()) return;

    const primaryModule = form.selectedModules[0] || form.module;
    const additionalModules = form.selectedModules.filter((m) => m !== primaryModule);
    const effectiveInputType = computeEffectiveInputType();
    const targetKey = form.key.trim() || form.label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

    const firstRule = form.scopingRules[0];
    const legacyCategory = firstRule?.industryCategory && firstRule.industryCategory !== "All" ? firstRule.industryCategory : undefined;
    const legacyIndustry = firstRule?.industries && firstRule.industries.length > 0 ? firstRule.industries[0] : undefined;
    const legacyLocations = firstRule?.locations && firstRule.locations.length > 0 ? firstRule.locations : undefined;

    const targetSource: "template" | "custom" = isAdmin ? "template" : "custom";
    const targetCreatedIn: "admin" | "client" = isAdmin ? "admin" : "client";

    const payload: Omit<FieldDefinition, "id" | "createdAt"> & { source: "system" | "custom" | "template"; createdIn?: "admin" | "client" } = {
      label: form.label.trim(),
      key: targetKey,
      module: primaryModule,
      source: isEdit && field ? field.source : targetSource,
      createdIn: isEdit && field ? field.createdIn : targetCreatedIn,
      inputType: effectiveInputType,
      placeholder: form.placeholder.trim() || getSuggestedPlaceholderForType(effectiveInputType, form.label),
      tooltip: form.tooltip.trim() || undefined,
      required: form.required,
      requiredStages: form.selectedModules.includes("process") && form.required && form.requiredStages.length > 0 ? form.requiredStages : undefined,
      showAlways: form.showAlways,
      userVisibility: form.userVisibility,
      sectionId: form.sectionId || undefined,
      scopingRules: form.scopingRules.length > 0 ? form.scopingRules : undefined,
      processIds: form.selectedModules.includes("process") && form.processIds.length > 0 ? form.processIds : undefined,
      isReusable: additionalModules.length > 0,
      reusableModules: additionalModules.length > 0 ? additionalModules : undefined,
      permissions: form.permissions,
      industryCategory: legacyCategory,
      industry: legacyIndustry,
      locations: legacyLocations,

      // Text Config
      textConfig: form.primaryCategory === "text" ? {
        textMode: form.textMode,
        maxChars: form.textMode === "short" ? form.maxChars : undefined,
        richText: form.textMode === "paragraph" ? form.richText : undefined,
      } : undefined,

      // Date Config
      dateConfig: form.primaryCategory === "date_time" ? {
        capture: form.dateTimeCapture,
        dateFormat: form.dateTimeCapture !== "time" ? form.dateFormat : undefined,
        timeFormat: form.dateTimeCapture !== "date" ? form.timeFormat : undefined,
        timezone: form.dateTimeCapture !== "date" ? form.timezone : undefined,
      } : undefined,

      // Composite Field Config
      compositeDisplayMode: form.primaryCategory === "composite" ? form.compositeDisplayMode : undefined,
      tableColumns: form.primaryCategory === "composite" ? form.tableColumns : undefined,
      subFields: form.primaryCategory === "composite" && form.tableColumns.length > 0
        ? form.tableColumns.map(normalizeLegacyColumn).filter((c): c is SubFieldConfig => c !== null)
        : undefined,

      // Media Config
      mediaConfig: form.primaryCategory === "media" ? {
        mediaType: form.mediaType,
        acceptedFormats: form.acceptedFormats,
        maxFileSizeMB: form.maxFileSizeMB,
        allowMultiple: form.allowMultipleFiles,
        maxFiles: form.allowMultipleFiles ? form.maxFiles : undefined,
      } : undefined,

      // Number Config
      numberConfig: form.primaryCategory === "number" ? {
        numberMode: form.numberMode,
        min: form.numberMode === "range" ? form.minRange : undefined,
        max: form.numberMode === "range" ? form.maxRange : form.maxCap,
      } : undefined,

      // Phone Config
      phoneConfig: form.primaryCategory === "tel" ? {
        countryCodeDisplay: form.phoneCountryDisplay,
        showFlags: form.phoneShowFlags,
        regexValidation: form.phoneRegex.trim() || undefined,
        numberFormat: form.phoneFormat,
      } : undefined,

      // List Redesign Config
      options: form.primaryCategory === "list" ? form.options.map((opt, i) => ({ ...opt, index: i + 1 })) : undefined,
      selectionMode: form.primaryCategory === "crm_bind"
        ? form.crmBindSelectionMode
        : form.primaryCategory === "list"
        ? form.selectionMode
        : undefined,
      listConfig: form.primaryCategory === "list" ? {
        valueType: form.listValueType,
        inheritedFieldKey: form.inheritedFieldKey.trim() || undefined,
        allowSearch: form.allowSearch,
        sortOrder: form.sortOrder,
        liveLinkedFieldKey: (form.liveSync && form.inheritedFieldKey.trim()) ? form.inheritedFieldKey.trim() : undefined,
      } : undefined,

      // CRM Bind
      crmBindConfig: form.primaryCategory === "crm_bind" ? {
        sourceModule: form.crmBindModule || "teamMember",
        displayField: "name",
        selectionMode: form.crmBindSelectionMode || "single",
      } : undefined,

      currency: form.primaryCategory === "money" ? (form.currency || "INR") : undefined,
      maxRating: form.primaryCategory === "rating" ? (form.maxRating || 5) : undefined,
      defaultValue: form.defaultValue !== undefined && form.defaultValue !== "" ? form.defaultValue : undefined,
    };

    if (isEdit && field) {
      updateCustomField(form.module, field.id, payload);
      onSaved?.({ ...field, ...payload });
    } else {
      const created = addCustomField(primaryModule, payload);
      onSaved?.(created);
    }
    onClose();
  };

  // Add option (starts blank without pre-seeded placeholder values)
  const addOption = () => {
    if (!form.inheritedFieldKey) return;
    const newIdx = form.options.length + 1;
    setForm((p) => ({
      ...p,
      options: [
        ...p.options,
        {
          id: Date.now(),
          label: "",
          value: "",
          index: newIdx,
        },
      ],
    }));
  };

  const updateOption = (idx: number, patch: Partial<FieldOption>) => {
    setForm((p) => ({
      ...p,
      options: p.options.map((o, i) => {
        if (i !== idx) return o;
        const updated = { ...o, ...patch };
        if (p.listValueType !== "composite" && patch.label !== undefined && patch.value === undefined && (!o.value || o.value === o.label.toLowerCase().replace(/\s+/g, "_"))) {
          updated.value = patch.label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
        }
        return updated;
      }),
    }));
  };

  const moveOption = (idx: number, dir: -1 | 1) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= form.options.length) return;
    setForm((p) => {
      const copy = [...p.options];
      const [item] = copy.splice(idx, 1);
      copy.splice(targetIdx, 0, item);
      return {
        ...p,
        options: copy.map((o, i) => ({ ...o, index: i + 1 })),
      };
    });
  };

  const removeOption = (idx: number) => {
    setForm((p) => ({
      ...p,
      options: p.options.filter((_, i) => i !== idx).map((o, i) => ({ ...o, index: i + 1 })),
    }));
  };

  const addColumn = () => setForm((p) => ({
    ...p,
    tableColumns: [
      ...p.tableColumns,
      {
        id: `col_${Date.now()}`,
        name: `Sub-field ${p.tableColumns.length + 1}`,
        type: "Text",
        placeholder: "",
      },
    ],
  }));
  const updateColumn = (idx: number, patch: Partial<TableColumnConfig>) => setForm((p) => ({ ...p, tableColumns: p.tableColumns.map((c, i) => i === idx ? { ...c, ...patch } : c) }));
  const removeColumn = (idx: number) => setForm((p) => ({ ...p, tableColumns: p.tableColumns.filter((_, i) => i !== idx) }));

  const selectedTypeItem = useMemo(() => {
    for (const grp of CONSOLIDATED_FIELD_TYPES) {
      const found = grp.items.find((i) => i.id === form.primaryCategory);
      if (found) return found;
    }
    return CONSOLIDATED_FIELD_TYPES[0].items[0];
  }, [form.primaryCategory]);

  const inputCls = (err?: string) => `w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs font-medium text-slate-800 transition-all ${err ? "border-red-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-500" : "border-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"}`;
  const roCls = "border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed";

  return (
    <div className="fixed inset-0 flex" style={{ pointerEvents: "none", zIndex }}>
      <style>{`@keyframes slideInFromRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
      <div className="flex-1 bg-black/40 backdrop-blur-[1px]" style={{ pointerEvents: "auto" }} onClick={onClose} />
      <div className="flex flex-col bg-white" style={{ width: 540, maxWidth: "100%", height: "100vh", boxShadow: "-4px 0 40px rgba(0,0,0,0.14)", animation: "slideInFromRight 220ms cubic-bezier(0.16,1,0.3,1)", pointerEvents: "auto" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-[#111827]">
              {isReadOnly ? "System Field" : isEdit ? "Edit Field" : "New Custom Field"}
            </h2>
            {isReadOnly && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-semibold text-amber-700">
                <Lock className="w-2.5 h-2.5" />System · Non-deletable
              </span>
            )}
            {!isReadOnly && isEdit && (
              <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-semibold text-blue-700">Custom</span>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-slate-400 hover:text-slate-700" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scribe seed warning */}
        {isReadOnly && (
          <div className="mx-6 mt-4 flex items-start gap-2.5 px-3.5 py-3 bg-amber-50 border border-amber-200 rounded-xl flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>System Protected Field:</strong> Scribe seed fields are required by default workflows and re-injected automatically. Deletion is disabled to prevent silent data loss.
            </p>
          </div>
        )}

        {/* Body — Vertical hierarchy */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-5">

          {/* 1. Module Multi-Select Dropdown */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Module <span className="text-red-500">*</span>
              </label>
              <InfoTooltip text="Select the CRM entity modules this field belongs to. Selecting multiple modules shares this field across them." size="sm" />
            </div>

            <div className="relative" ref={modulePickerRef}>
              <button
                type="button"
                disabled={isReadOnly || lockModule}
                onClick={() => !isReadOnly && !lockModule && setModulePickerOpen((v) => !v)}
                className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs font-medium flex items-center justify-between transition-all select-none min-h-[40px] ${
                  isReadOnly || lockModule
                    ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                    : "border-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-2xs"
                }`}
              >
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  {form.selectedModules.map((m) => {
                    const opt = MODULE_OPTIONS.find((o) => o.value === m);
                    return (
                      <span key={m} className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200/80 text-blue-700 text-[11px] font-semibold">
                        {opt?.label || m}
                      </span>
                    );
                  })}
                  {form.selectedModules.length > 1 && (
                    <span className="text-[10px] text-slate-400 font-medium ml-1">
                      (Shared across {form.selectedModules.length} modules)
                    </span>
                  )}
                </div>
                {!isReadOnly && !lockModule && (
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${modulePickerOpen ? "rotate-180" : ""}`} />
                )}
              </button>

              {modulePickerOpen && !isReadOnly && !lockModule && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden p-1.5">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/80 rounded-md mb-1">
                    Select Target Modules
                  </div>
                  <div className="space-y-0.5">
                    {MODULE_OPTIONS.map((opt) => {
                      const isChecked = form.selectedModules.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => toggleModuleSelection(opt.value)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer select-none ${
                            isChecked ? "bg-blue-50/80 text-blue-900 font-semibold" : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span>{opt.label}</span>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            isChecked ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 bg-white"
                          }`}>
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. Field Name */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Field Name <span className="text-red-500">*</span>
              </label>
              <InfoTooltip text="User-facing label displayed across client records, tables, and forms." size="sm" />
            </div>
            <input
              type="text"
              value={form.label}
              readOnly={isReadOnly}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="e.g. Policy Coverage"
              className={isReadOnly ? `${inputCls()} ${roCls}` : inputCls(errors.label)}
            />
            {errors.label && <p className="text-[11px] text-red-500 mt-1">{errors.label}</p>}
          </div>

          {/* 3. Field Type Picker */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Field Type <span className="text-red-500">*</span>
              </label>
              <InfoTooltip text="Select the data type and format for this field." size="sm" />
            </div>

            <div className="relative" ref={typePickerRef}>
              <button
                type="button"
                disabled={isReadOnly || lockCategory}
                onClick={() => !isReadOnly && !lockCategory && setTypePickerOpen((v) => !v)}
                className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs font-medium flex items-center justify-between transition-all select-none min-h-[40px] ${
                  isReadOnly || lockCategory
                    ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                    : "border-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-2xs"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-slate-900">{selectedTypeItem.label}</span>
                </div>
                {!isReadOnly && !lockCategory && <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${typePickerOpen ? "rotate-180" : ""}`} />}
              </button>

              {typePickerOpen && !isReadOnly && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-y-auto p-1.5" style={{ maxHeight: 320 }}>
                  {CONSOLIDATED_FIELD_TYPES.map((grp) => (
                    <div key={grp.category} className="mb-1.5 last:mb-0">
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/80 rounded-md mb-0.5">
                        {grp.category}
                      </div>
                      {grp.items.map((item) => {
                        const isItemActive = form.primaryCategory === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setForm((p) => ({
                                ...p,
                                primaryCategory: item.id,
                                placeholder: p.placeholder || getSuggestedPlaceholderForType(item.id, p.label),
                              }));
                              setTypePickerOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer select-none ${
                              isItemActive ? "bg-blue-50/90 text-blue-900 font-semibold" : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                          >
                            <div>
                              <div className="font-semibold">{item.label}</div>
                            </div>
                            {isItemActive && <Check className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* TYPE-SPECIFIC FIELD CONFIGURATION PANELS */}
          {/* ═══════════════════════════════════════════════════════════ */}

          {/* 3A. Text Configuration (Short Text vs Paragraph) */}
          {form.primaryCategory === "text" && (
            <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Text Format
                  </label>
                  <InfoTooltip text="Choose between single-line short text or multiline paragraph." size="sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => setForm((p) => ({ ...p, textMode: "short" }))}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      form.textMode === "short"
                        ? "bg-white border-blue-500 text-blue-700 shadow-2xs"
                        : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
                    }`}
                  >
                    Short Text (Single Line)
                  </button>
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => setForm((p) => ({ ...p, textMode: "paragraph" }))}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      form.textMode === "paragraph"
                        ? "bg-white border-blue-500 text-blue-700 shadow-2xs"
                        : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
                    }`}
                  >
                    Paragraph (Multiline)
                  </button>
                </div>
              </div>

              {form.textMode === "short" && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Max Characters (Optional)
                    </label>
                    <InfoTooltip text="Limit the maximum number of characters allowed in this text field. Leave blank for unlimited." size="sm" />
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={form.maxChars || ""}
                    disabled={isReadOnly}
                    onChange={(e) => setForm((p) => ({ ...p, maxChars: e.target.value ? Number(e.target.value) : undefined }))}
                    placeholder="e.g. 255"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {form.textMode === "paragraph" && (
                <div className="pt-2 border-t border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Rich Text Editor
                      </label>
                      <InfoTooltip text="Enable rich text formatting toolbar (bold, lists, links) on client-facing records." size="sm" />
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.richText}
                        disabled={isReadOnly}
                        onChange={(e) => setForm((p) => ({ ...p, richText: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3B. Number Configuration (Integer vs Range) */}
          {form.primaryCategory === "number" && (
            <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Number Mode
                  </label>
                  <InfoTooltip text="Select standard integer input or bounded numeric range slider." size="sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => setForm((p) => ({ ...p, numberMode: "integer" }))}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      form.numberMode === "integer"
                        ? "bg-white border-blue-500 text-blue-700 shadow-2xs"
                        : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
                    }`}
                  >
                    Integer (Standard)
                  </button>
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => setForm((p) => ({ ...p, numberMode: "range" }))}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      form.numberMode === "range"
                        ? "bg-white border-blue-500 text-blue-700 shadow-2xs"
                        : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
                    }`}
                  >
                    Range (Min / Max Bound)
                  </button>
                </div>
              </div>

              {form.numberMode === "integer" ? (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Max Value Cap (Optional)
                    </label>
                    <InfoTooltip text="Limit how high the number value can go. Leave blank for no limit." size="sm" />
                  </div>
                  <input
                    type="number"
                    value={form.maxCap ?? ""}
                    disabled={isReadOnly}
                    onChange={(e) => setForm((p) => ({ ...p, maxCap: e.target.value ? Number(e.target.value) : undefined }))}
                    placeholder="e.g. 1000"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Min Bound
                      </label>
                      <InfoTooltip text="Minimum boundary for the range input." size="sm" />
                    </div>
                    <input
                      type="number"
                      value={form.minRange ?? 0}
                      disabled={isReadOnly}
                      onChange={(e) => setForm((p) => ({ ...p, minRange: Number(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Max Bound
                      </label>
                      <InfoTooltip text="Maximum boundary for the range input." size="sm" />
                    </div>
                    <input
                      type="number"
                      value={form.maxRange ?? 100}
                      disabled={isReadOnly}
                      onChange={(e) => setForm((p) => ({ ...p, maxRange: Number(e.target.value) || 100 }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3C. Date & Time Configuration */}
          {form.primaryCategory === "date_time" && (
            <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Capture Format
                  </label>
                  <InfoTooltip text="Choose whether to capture Date only, Time only, or Both." size="sm" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["date", "time", "both"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => setForm((p) => ({ ...p, dateTimeCapture: mode }))}
                      className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        form.dateTimeCapture === mode
                          ? "bg-white border-blue-500 text-blue-700 shadow-2xs"
                          : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
                      }`}
                    >
                      {mode === "date" ? "Date only" : mode === "time" ? "Time only" : "Both"}
                    </button>
                  ))}
                </div>
              </div>

              {form.dateTimeCapture !== "time" && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Date Format
                    </label>
                    <InfoTooltip text="Standard date display format on client records and views." size="sm" />
                  </div>
                  <AdminSelect
                    value={form.dateFormat}
                    disabled={isReadOnly}
                    onChange={(val) => setForm((p) => ({ ...p, dateFormat: val }))}
                    options={COMMON_DATE_FORMATS}
                  />
                </div>
              )}

              {form.dateTimeCapture !== "date" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Time Format
                      </label>
                      <InfoTooltip text="Choose 12-hour or 24-hour clock display." size="sm" />
                    </div>
                    <AdminSelect
                      value={form.timeFormat}
                      disabled={isReadOnly}
                      onChange={(val) => setForm((p) => ({ ...p, timeFormat: val as "12h" | "24h" }))}
                      options={[
                        { value: "12h", label: "12-hour (1:30 PM)" },
                        { value: "24h", label: "24-hour (13:30)" },
                      ]}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Timezone
                      </label>
                      <InfoTooltip text="Reference timezone for time formatting." size="sm" />
                    </div>
                    <AdminSelect
                      value={form.timezone}
                      disabled={isReadOnly}
                      onChange={(val) => setForm((p) => ({ ...p, timezone: val }))}
                      options={COMMON_TIMEZONES}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3D. Composite Field (Table + Group View) */}
          {form.primaryCategory === "composite" && (
            <div className="space-y-3.5 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Display Mode
                  </label>
                  <InfoTooltip text="Choose how this composite field appears on records. Data structure is shared between Table View and Group View." size="sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => setForm((p) => ({ ...p, compositeDisplayMode: "table" }))}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      form.compositeDisplayMode === "table"
                        ? "bg-white border-blue-500 text-blue-700 shadow-2xs"
                        : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
                    }`}
                  >
                    Table View (Spreadsheet Row)
                  </button>
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => setForm((p) => ({ ...p, compositeDisplayMode: "group" }))}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      form.compositeDisplayMode === "group"
                        ? "bg-white border-blue-500 text-blue-700 shadow-2xs"
                        : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
                    }`}
                  >
                    Group View (Card / Repeatable)
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Sub-Fields & Columns
                    </label>
                    <InfoTooltip text="Define the structure of this composite field using existing module fields or custom sub-fields." size="sm" />
                  </div>

                  {!isReadOnly && (
                    <div className="flex items-center gap-2">
                      <div className="relative" ref={existingFieldPickerRef}>
                        <button
                          type="button"
                          onClick={() => setExistingFieldPickerOpen((v) => !v)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-blue-600 bg-white border border-slate-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer shadow-2xs"
                          title="Import from an existing field in this module"
                        >
                          <Layers className="w-3 h-3 text-slate-500" />
                          <span>Use Existing Field</span>
                          <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${existingFieldPickerOpen ? "rotate-180" : ""}`} />
                        </button>
                        {existingFieldPickerOpen && (
                          <div className="absolute right-0 top-full mt-1 w-64 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1 space-y-0.5">
                            <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Fields in {MODULE_OPTIONS.find((m) => m.value === form.module)?.label || form.module}
                            </div>
                            {availableFieldsForComposite.length === 0 ? (
                              <div className="px-3 py-2 text-xs text-slate-400 italic">No existing fields found in this module</div>
                            ) : (
                              availableFieldsForComposite.map((f) => (
                                <button
                                  key={f.key}
                                  type="button"
                                  onClick={() => {
                                    importExistingFieldToColumn(f);
                                    setExistingFieldPickerOpen(false);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-50 flex items-center justify-between text-xs cursor-pointer group"
                                >
                                  <span className="font-medium text-slate-700 group-hover:text-blue-700 truncate">{f.label}</span>
                                  <span className="text-[10px] text-slate-400 uppercase font-mono px-1.5 py-0.5 bg-slate-100 rounded">
                                    {f.inputType}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={addColumn}
                        className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200"
                      >
                        <Plus className="w-3 h-3" /> Add sub-field
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {form.tableColumns.map((col, idx) => (
                    <div key={col.id} className="space-y-2.5 p-3 border border-slate-200 rounded-xl bg-white shadow-2xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="text"
                          value={col.name}
                          readOnly={isReadOnly}
                          onChange={(e) => updateColumn(idx, { name: e.target.value })}
                          placeholder="Sub-field name"
                          className={`flex-1 min-w-0 px-3 py-1.5 border rounded-lg text-xs font-medium transition-all ${isReadOnly ? roCls : "border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"}`}
                        />
                        <AdminSelect
                          value={col.type}
                          disabled={isReadOnly}
                          onChange={(newType) => {
                            const patch: Partial<TableColumnConfig> = { type: newType };
                            if (newType === "Select" && (!col.options || col.options.length === 0)) {
                              patch.options = [
                                { id: 1, label: "Option A", value: "option_a" },
                                { id: 2, label: "Option B", value: "option_b" },
                              ];
                            }
                            if (newType === "Money" && !col.currency) patch.currency = "INR";
                            updateColumn(idx, patch);
                          }}
                          size="sm"
                          className="w-36 shrink-0 min-w-0"
                          options={[
                            { value: "Text", label: "Text" },
                            { value: "Long Text", label: "Long Text" },
                            { value: "Number", label: "Number" },
                            { value: "Money", label: "Money" },
                            { value: "Select", label: "Select List" },
                            { value: "Date", label: "Date" },
                            { value: "Date & Time", label: "Date & Time" },
                            { value: "Yes / No", label: "Yes / No" },
                            { value: "Email", label: "Email" },
                            { value: "Phone", label: "Phone" },
                            { value: "Link", label: "Link" },
                            { value: "Rating", label: "Rating" },
                          ]}
                        />
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => removeColumn(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-500 cursor-pointer rounded-lg hover:bg-red-50 transition-colors shrink-0"
                            title="Delete sub-field"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100 min-w-0">
                        <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                          Placeholder:
                        </span>
                        <input
                          type="text"
                          value={col.placeholder || ""}
                          readOnly={isReadOnly}
                          onChange={(e) => updateColumn(idx, { placeholder: e.target.value })}
                          placeholder={getSuggestedPlaceholderForType(col.type, col.name)}
                          className="flex-1 min-w-0 px-2.5 py-1 bg-slate-50/50 border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3E. Media Attach Configuration (replaces File) */}
          {form.primaryCategory === "media" && (
            <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Media Category
                  </label>
                  <InfoTooltip text="Select whether this field accepts Image, Document, or Audio uploads." size="sm" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["image", "document", "audio"] as const).map((mType) => (
                    <button
                      key={mType}
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => setForm((p) => ({
                        ...p,
                        mediaType: mType,
                        acceptedFormats: MEDIA_PRESET_FORMATS[mType],
                      }))}
                      className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer capitalize ${
                        form.mediaType === mType
                          ? "bg-white border-blue-500 text-blue-700 shadow-2xs"
                          : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
                      }`}
                    >
                      {mType}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Accepted Formats
                  </label>
                  <InfoTooltip text="Allowed file formats for upload." size="sm" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {MEDIA_PRESET_FORMATS[form.mediaType].map((fmt) => {
                    const isFmtActive = form.acceptedFormats.includes(fmt);
                    return (
                      <button
                        key={fmt}
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => {
                          setForm((p) => {
                            const exists = p.acceptedFormats.includes(fmt);
                            const next = exists
                              ? p.acceptedFormats.filter((f) => f !== fmt)
                              : [...p.acceptedFormats, fmt];
                            return { ...p, acceptedFormats: next.length > 0 ? next : [fmt] };
                          });
                        }}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                          isFmtActive
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {fmt}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Max File Size (MB)
                    </label>
                    <InfoTooltip text="Maximum allowed file size per upload." size="sm" />
                  </div>
                  <AdminSelect
                    value={String(form.maxFileSizeMB)}
                    disabled={isReadOnly}
                    onChange={(val) => setForm((p) => ({ ...p, maxFileSizeMB: Number(val) || 10 }))}
                    options={[
                      { value: "5", label: "5 MB" },
                      { value: "10", label: "10 MB" },
                      { value: "25", label: "25 MB" },
                      { value: "50", label: "50 MB" },
                      { value: "100", label: "100 MB" },
                    ]}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Upload Mode
                    </label>
                    <InfoTooltip text="Allow uploading single file or multiple attachments." size="sm" />
                  </div>
                  <AdminSelect
                    value={form.allowMultipleFiles ? "multiple" : "single"}
                    disabled={isReadOnly}
                    onChange={(val) => setForm((p) => ({ ...p, allowMultipleFiles: val === "multiple" }))}
                    options={[
                      { value: "single", label: "Single File" },
                      { value: "multiple", label: "Multiple Files" },
                    ]}
                  />
                </div>
              </div>

              {form.allowMultipleFiles && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Max File Count (Optional)
                    </label>
                    <InfoTooltip text="Maximum number of files users can attach. Leave blank for unlimited." size="sm" />
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={form.maxFiles || ""}
                    disabled={isReadOnly}
                    onChange={(e) => setForm((p) => ({ ...p, maxFiles: e.target.value ? Number(e.target.value) : undefined }))}
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* 3F. Phone Number Configuration */}
          {form.primaryCategory === "tel" && (
            <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Country Picker Label
                    </label>
                    <InfoTooltip text="Choose how country selector displays options." size="sm" />
                  </div>
                  <AdminSelect
                    value={form.phoneCountryDisplay}
                    disabled={isReadOnly}
                    onChange={(val) => setForm((p) => ({ ...p, phoneCountryDisplay: val as "name" | "code" }))}
                    options={[
                      { value: "name", label: "Country Name (United States (+1))" },
                      { value: "code", label: "Country Code (+1)" },
                    ]}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Number Format
                    </label>
                    <InfoTooltip text="Masking and formatting template for telephone inputs." size="sm" />
                  </div>
                  <AdminSelect
                    value={form.phoneFormat}
                    disabled={isReadOnly}
                    onChange={(val) => setForm((p) => ({ ...p, phoneFormat: val }))}
                    options={COMMON_PHONE_FORMATS}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Regex Validation (Optional)
                  </label>
                  <InfoTooltip text="Custom regular expression to enforce phone number patterns." size="sm" />
                </div>
                <input
                  type="text"
                  value={form.phoneRegex}
                  disabled={isReadOnly}
                  onChange={(e) => setForm((p) => ({ ...p, phoneRegex: e.target.value }))}
                  placeholder="e.g. ^\+?[1-9]\d{1,14}$"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* 3G. Link to Mantra Entities (formerly CRM Bind) */}
          {form.primaryCategory === "crm_bind" && (
            <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">Link to Entity</label>
                  <InfoTooltip text="Select CRM entity records to dynamically link with real-time sync." size="sm" />
                </div>
                <AdminSelect
                  value={form.crmBindModule}
                  disabled={isReadOnly}
                  onChange={(val) => setForm((p) => ({ ...p, crmBindModule: val as CrmBindModule }))}
                  options={[
                    { value: "teamMember", label: "Team Members (Staff & Doctors)" },
                    { value: "client", label: "Clients (Profiles & Contacts)" },
                    { value: "organization", label: "Organizations (Companies / Accounts)" },
                    { value: "service", label: "Services (Treatments & Catalog)" },
                    { value: "process", label: "Processes (Workflows & Pipelines)" },
                  ]}
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <label className="text-xs font-semibold text-slate-700">Selection Mode</label>
                  <InfoTooltip text="Choose whether users can link a single record or multiple records." size="sm" />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="crmSelectionMode"
                      disabled={isReadOnly}
                      checked={form.crmBindSelectionMode !== "multiple"}
                      onChange={() => setForm((p) => ({ ...p, crmBindSelectionMode: "single" }))}
                      className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer accent-blue-600"
                    />
                    <span>Single Record</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="crmSelectionMode"
                      disabled={isReadOnly}
                      checked={form.crmBindSelectionMode === "multiple"}
                      onChange={() => setForm((p) => ({ ...p, crmBindSelectionMode: "multiple" }))}
                      className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer accent-blue-600"
                    />
                    <span>Multiple Records</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 3H. REDESIGNED LIST FIELD CONFIGURATION */}
          {form.primaryCategory === "list" && (
            <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-4">
              {/* 1. Value Type Selector (Applies to all options in this list) */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    List Option Value Type <span className="text-red-500">*</span>
                  </label>
                  <InfoTooltip text="Choose the data type for every option in this list (Text, Phone Number, Money, Date & Time, Composite, etc.)." size="sm" />
                </div>
                <AdminSelect
                  value={form.listValueType}
                  disabled={isReadOnly}
                  onChange={(val) => {
                    setForm((p) => ({
                      ...p,
                      listValueType: val as ListValueType,
                      inheritedFieldKey: "", // reset inherited field when value type changes
                    }));
                  }}
                  options={LIST_OPTION_VALUE_TYPES.map((t) => ({
                    value: t.value,
                    label: t.label,
                    subtitle: t.category,
                  }))}
                />
              </div>

              {/* 2. Type Inheritance: "Inherit Format From" */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-semibold text-slate-800">
                      Inherit Format From
                    </label>
                    <InfoTooltip text="Inherit input formatting, validation rules, and configuration (e.g. phone masking, currency, date format) from an existing field of the same type in this module." size="sm" />
                  </div>

                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        setNestedDrawerCategory(form.listValueType as PrimaryFieldTypeCategory);
                        setNestedDrawerOpen(true);
                      }}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/80 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Field</span>
                    </button>
                  )}
                </div>

                {matchingFieldsInModule.length > 0 ? (
                  <div className="space-y-1.5">
                    <AdminSelect
                      value={form.inheritedFieldKey}
                      disabled={isReadOnly}
                      onChange={(val) => setForm((p) => ({
                        ...p,
                        inheritedFieldKey: val,
                        liveLinkedFieldKey: p.liveSync ? val : "",
                      }))}
                      placeholder="— Select an existing field to inherit format —"
                      options={[
                        { value: "", label: "— Select an existing field to inherit format —" },
                        ...matchingFieldsInModule.map((f) => ({
                          value: f.key,
                          label: `${f.label} (${f.key})`,
                          subtitle: f.module ? `Module: ${f.module}` : undefined,
                        })),
                      ]}
                    />
                    {form.inheritedFieldKey ? (
                      <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Inheriting rules and format from <strong>{inheritedFieldDef?.label || form.inheritedFieldKey}</strong></span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-amber-600 font-medium">
                        Please select an existing field or click &ldquo;+ Add Field&rdquo; above to inherit its configuration.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">
                      No existing <strong>{LIST_OPTION_VALUE_TYPES.find((t) => t.value === form.listValueType)?.label || form.listValueType}</strong> fields found in this module.
                    </p>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          setNestedDrawerCategory(form.listValueType as PrimaryFieldTypeCategory);
                          setNestedDrawerOpen(true);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer shrink-0"
                      >
                        + Add Field
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Defined Options List (Value-only, no separate label field) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Defined Options ({form.options.length})
                    </span>
                    <InfoTooltip text={`Each option has its own typed value under ${LIST_OPTION_VALUE_TYPES.find((t) => t.value === form.listValueType)?.label || form.listValueType}.`} size="sm" />
                  </div>

                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={form.inheritedFieldKey ? addOption : undefined}
                      disabled={!form.inheritedFieldKey}
                      title={!form.inheritedFieldKey ? "Select an existing field or click '+ Add Field' above first" : undefined}
                      className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border transition-colors ${
                        form.inheritedFieldKey
                          ? "text-blue-600 hover:text-blue-700 cursor-pointer bg-blue-50 border-blue-200"
                          : "text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed opacity-60"
                      }`}
                    >
                      <Plus className="w-3 h-3" /> Add Option
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {!form.inheritedFieldKey ? (
                    <div className="p-4 bg-slate-50 border border-slate-200 border-dashed rounded-xl text-center space-y-2">
                      <p className="text-xs font-semibold text-slate-700">
                        Inherited Field Required
                      </p>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                        Please select an existing field or click <strong>+ Add Field</strong> in &ldquo;Inherit Format From&rdquo; above to enable adding options.
                      </p>
                      {matchingFieldsInModule.length === 0 && !isReadOnly && (
                        <button
                          type="button"
                          onClick={() => {
                            setNestedDrawerCategory(form.listValueType as PrimaryFieldTypeCategory);
                            setNestedDrawerOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs cursor-pointer transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Create New {LIST_OPTION_VALUE_TYPES.find((t) => t.value === form.listValueType)?.label || "Field"}</span>
                        </button>
                      )}
                    </div>
                  ) : form.options.length === 0 ? (
                    <div className="p-4 bg-white border border-slate-200 border-dashed rounded-xl text-xs text-slate-400 text-center space-y-1">
                      <p className="font-semibold text-slate-600">No options defined yet</p>
                      <p className="text-[11px] text-slate-400">Click &ldquo;+ Add Option&rdquo; above to define your first option value.</p>
                    </div>
                  ) : (
                    form.options.map((opt, idx) => (
                      <div
                        key={opt.id || idx}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                            #{idx + 1}
                          </span>

                          {/* Value Input only (Requirement 1: NO separate display label input) */}
                          <div className="flex-1 min-w-0">
                            {form.listValueType === "date_time" ? (
                              <input
                                type="date"
                                value={typeof opt.value === "string" ? opt.value : ""}
                                readOnly={isReadOnly}
                                onChange={(e) => updateOption(idx, { value: e.target.value })}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-500"
                              />
                            ) : form.listValueType === "tel" ? (
                              <input
                                type="tel"
                                value={opt.value ?? ""}
                                readOnly={isReadOnly}
                                onChange={(e) => updateOption(idx, { value: e.target.value })}
                                placeholder={inheritedFieldDef?.phoneConfig?.numberFormat || "+1 (555) 123-4567"}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-500 font-mono"
                              />
                            ) : form.listValueType === "money" ? (
                              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden focus-within:bg-white focus-within:border-blue-500">
                                <span className="px-2.5 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 border-r border-slate-200 select-none">
                                  {CURRENCY_SYMBOLS[inheritedFieldDef?.currency || form.currency || "INR"] || "₹"}
                                </span>
                                <input
                                  type="number"
                                  value={opt.value ?? ""}
                                  readOnly={isReadOnly}
                                  onChange={(e) => updateOption(idx, { value: e.target.value !== "" ? Number(e.target.value) : "" })}
                                  placeholder="0.00"
                                  className="w-full px-2.5 py-1.5 bg-transparent text-xs font-medium text-slate-800 outline-none"
                                />
                              </div>
                            ) : form.listValueType === "number" ? (
                              <input
                                type="number"
                                value={opt.value ?? ""}
                                readOnly={isReadOnly}
                                onChange={(e) => updateOption(idx, { value: e.target.value !== "" ? Number(e.target.value) : "" })}
                                placeholder="e.g. 100"
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-500"
                              />
                            ) : form.listValueType === "email" ? (
                              <input
                                type="email"
                                value={opt.value ?? ""}
                                readOnly={isReadOnly}
                                onChange={(e) => updateOption(idx, { value: e.target.value })}
                                placeholder="e.g. user@example.com"
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-500"
                              />
                            ) : form.listValueType === "link" || form.listValueType === "whatsapp_link" ? (
                              <input
                                type="url"
                                value={opt.value ?? ""}
                                readOnly={isReadOnly}
                                onChange={(e) => updateOption(idx, { value: e.target.value })}
                                placeholder="e.g. https://example.com"
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-500 font-mono"
                              />
                            ) : form.listValueType === "yes_no" ? (
                              <select
                                value={String(opt.value)}
                                disabled={isReadOnly}
                                onChange={(e) => updateOption(idx, { value: e.target.value === "true" })}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
                              >
                                <option value="true">Yes / True</option>
                                <option value="false">No / False</option>
                              </select>
                            ) : form.listValueType === "composite" ? (
                              <input
                                type="text"
                                value={typeof opt.value === "string" ? opt.value : Array.isArray(opt.value) ? opt.value.join(", ") : formatCompositePreview(opt.value)}
                                readOnly={isReadOnly}
                                onChange={(e) => updateOption(idx, { value: e.target.value })}
                                placeholder="e.g. John, Mumbai (comma-separated parts)"
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-500"
                              />
                            ) : (
                              <input
                                type="text"
                                value={opt.value ?? ""}
                                readOnly={isReadOnly}
                                onChange={(e) => updateOption(idx, { value: e.target.value })}
                                placeholder="e.g. Option value"
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-500 font-mono"
                              />
                            )}
                          </div>

                          {!isReadOnly && (
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveOption(idx, -1)}
                                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                                title="Move up"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === form.options.length - 1}
                                onClick={() => moveOption(idx, 1)}
                                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                                title="Move down"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeOption(idx)}
                                className="p-1 text-slate-300 hover:text-red-500 cursor-pointer rounded"
                                title="Delete option"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Composite preview banner */}
                        {form.listValueType === "composite" && (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200/70 rounded-md text-[11px]">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Display Preview:</span>
                            <span className="font-semibold text-slate-700 truncate">
                              {formatCompositePreview(opt.value) || <span className="text-slate-400 italic">No parts entered</span>}
                            </span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 4. LIST BEHAVIOR CONFIGURATION (Applicable to all modes) */}
              <div className="pt-3 border-t border-slate-200/80 space-y-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  List Render & Behavior Configuration
                </div>

                {/* 1. Allow Search Bar Toggle */}
                <div className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-xs font-semibold text-slate-800">Allow Search Bar</span>
                    <InfoTooltip text="Show a search and filter input at the top of the option dropdown." size="sm" />
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.allowSearch}
                      disabled={isReadOnly}
                      onChange={(e) => setForm((p) => ({ ...p, allowSearch: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* 2. Sorting Order Dropdown */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                      <label className="block text-xs font-semibold text-slate-700">
                        Sorting Order
                      </label>
                      <InfoTooltip text="Order in which options are presented in client dropdowns." size="sm" />
                    </div>
                    <AdminSelect
                      value={form.sortOrder}
                      disabled={isReadOnly}
                      onChange={(val) => setForm((p) => ({ ...p, sortOrder: val as any }))}
                      options={[
                        { value: "manual", label: "Manual Order (Admin Defined)" },
                        { value: "alphabetical_asc", label: "Alphabetical (A - Z)" },
                        { value: "alphabetical_desc", label: "Alphabetical (Z - A)" },
                        { value: "recent", label: "Most Recently Added First" },
                      ]}
                    />
                  </div>

                  {/* 3. Selection Mode */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Selection Mode
                      </label>
                      <InfoTooltip text="Allow picking a single choice or multiple options." size="sm" />
                    </div>
                    <AdminSelect
                      value={form.selectionMode}
                      disabled={isReadOnly}
                      onChange={(val) => setForm((p) => ({ ...p, selectionMode: val as "single" | "multiple" }))}
                      options={[
                        { value: "single", label: "Single Selection" },
                        { value: "multiple", label: "Multiple (Multiselect)" },
                      ]}
                    />
                  </div>
                </div>

                {/* 4. Live Two-Way Field Sync Toggle */}
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-xs font-bold text-slate-800">
                        Live Two-Way Field Sync
                      </span>
                      <InfoTooltip text="When enabled, any new value entered into the inherited field on records automatically becomes selectable in this list, and selections sync back." size="sm" />
                    </div>
                    <label className={`relative inline-flex items-center select-none ${(!form.inheritedFieldKey || isReadOnly) ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                      <input
                        type="checkbox"
                        checked={Boolean(form.liveSync && form.inheritedFieldKey)}
                        disabled={isReadOnly || !form.inheritedFieldKey}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setForm((p) => ({
                            ...p,
                            liveSync: checked,
                            liveLinkedFieldKey: checked ? p.inheritedFieldKey : "",
                          }));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {form.inheritedFieldKey ? (
                    form.liveSync ? (
                      <div className="text-[11px] text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0"></span>
                        <span>
                          Live sync active: automatically synchronizing values with <strong>{inheritedFieldDef?.label || form.inheritedFieldKey}</strong>.
                        </span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500">
                        Toggle ON to enable two-way live discovery sync with <strong>{inheritedFieldDef?.label || form.inheritedFieldKey}</strong>.
                      </p>
                    )
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">
                      Select a field in &ldquo;Inherit Format From&rdquo; above to enable live two-way sync.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3I. Currency Picker for Money fields */}
          {form.primaryCategory === "money" && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">Currency</label>
                <InfoTooltip text="Select the currency denomination displayed alongside monetary amounts." size="sm" />
              </div>
              <AdminSelect
                value={form.currency || "INR"}
                disabled={isReadOnly}
                onChange={(val) => setForm((p) => ({ ...p, currency: val }))}
                options={Object.entries(CURRENCY_SYMBOLS).map(([code, symbol]) => ({
                  value: code,
                  label: `${code} (${symbol})`,
                  badge: symbol,
                }))}
              />
            </div>
          )}

          {/* 3J. Rating Max Stars */}
          {form.primaryCategory === "rating" && (
            <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Maximum Rating
                  </label>
                  <InfoTooltip text="Choose the maximum rating stars for this field." size="sm" />
                </div>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                  {form.maxRating || 5} Stars
                </span>
              </div>
              <div className="flex items-center gap-2">
                {[3, 5, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => setForm((p) => ({ ...p, maxRating: num }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      (form.maxRating || 5) === num
                        ? "bg-[#111827] text-white border-[#111827] shadow-2xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {num} Stars
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Placeholder for standard non-composite fields */}
          {form.primaryCategory !== "composite" && form.primaryCategory !== "signature" && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Placeholder
                </label>
                <InfoTooltip text="Hint or example text displayed inside the field when empty to guide user input." size="sm" />
              </div>
              <input
                type="text"
                value={form.placeholder}
                readOnly={isReadOnly}
                onChange={(e) => setForm((p) => ({ ...p, placeholder: e.target.value }))}
                placeholder={getSuggestedPlaceholderForType(form.primaryCategory, form.label)}
                className={isReadOnly ? `${inputCls()} ${roCls}` : inputCls()}
              />
            </div>
          )}

          {/* 4. Client-Facing Help Text / Tooltip */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Client-Facing Help Text
              </label>
              <InfoTooltip text="Shown as a tooltip next to this field's name when users fill it in." size="sm" />
            </div>
            <input
              type="text"
              value={form.tooltip}
              readOnly={isReadOnly}
              onChange={(e) => setForm((p) => ({ ...p, tooltip: e.target.value }))}
              placeholder="e.g. Enter the client's official registered legal name"
              className={isReadOnly ? `${inputCls()} ${roCls}` : inputCls()}
            />
          </div>

          {/* 5. Default Value Configurator */}
          {!isReadOnly && form.primaryCategory !== "signature" && form.primaryCategory !== "media" && (
            <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Default Value
                  </label>
                  <InfoTooltip text="Pre-fill new client records with this default value. Leave blank for no default." size="sm" />
                </div>
                {form.defaultValue !== undefined && form.defaultValue !== "" && (
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, defaultValue: undefined }))}
                    className="text-[11px] font-medium text-slate-400 hover:text-red-500 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <FieldInputRenderer
                field={{
                  inputType: computeEffectiveInputType(),
                  options: form.options,
                  currency: form.currency || "INR",
                  selectionMode: form.primaryCategory === "list" ? form.selectionMode : (form.crmBindSelectionMode || "single"),
                  listConfig: form.primaryCategory === "list" ? {
                    allowSearch: form.allowSearch,
                    sortOrder: form.sortOrder,
                    liveLinkedFieldKey: form.liveLinkedFieldKey || undefined,
                  } : undefined,
                  crmBindConfig: form.primaryCategory === "crm_bind" ? {
                    sourceModule: form.crmBindModule || "teamMember",
                    displayField: "name",
                    selectionMode: form.crmBindSelectionMode || "single",
                  } : undefined,
                  maxRating: form.maxRating || 5,
                  subFields: form.tableColumns.map(normalizeLegacyColumn).filter((c): c is SubFieldConfig => c !== null),
                  placeholder: form.placeholder || getSuggestedPlaceholderForType(form.primaryCategory, form.label),
                }}
                value={form.defaultValue}
                onChange={(val) => setForm((p) => ({ ...p, defaultValue: val }))}
                mode="admin_default"
              />
            </div>
          )}

          {/* 6. Field Settings & Admin Control */}
          <div className="pt-2 border-t border-slate-100">
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <button
                type="button"
                onClick={() => setFieldSettingsOpen((v) => !v)}
                className="w-full px-4 py-3 bg-slate-50/80 hover:bg-slate-100/70 flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Settings2 className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Field Settings</span>
                    {form.required && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        Required
                      </span>
                    )}
                    {form.showAlways && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        Show always
                      </span>
                    )}
                    {form.selectedModules.length > 1 && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        Shared ({form.selectedModules.length})
                      </span>
                    )}
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${fieldSettingsOpen ? "rotate-180" : ""}`} />
              </button>

              {fieldSettingsOpen && (
                <div className="p-4 space-y-3.5 border-t border-slate-100 bg-white">
                  {/* Required Checkbox */}
                  <div>
                    <div className="flex items-center">
                      <label className={`flex items-center gap-2 select-none ${isReadOnly ? "opacity-60" : "cursor-pointer"}`}>
                        <input
                          type="checkbox"
                          checked={form.required}
                          disabled={isReadOnly}
                          onChange={(e) => setForm((p) => ({ ...p, required: e.target.checked }))}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-slate-800">Required field</span>
                      </label>
                      <InfoTooltip text="Users must provide a value before saving records." size="sm" />
                    </div>

                    {form.required && form.selectedModules.includes("process") && (
                      <div className="ml-6 pt-2">
                        <StageMultiSelect
                          selectedStages={form.requiredStages}
                          onChange={(requiredStages) => setForm((p) => ({ ...p, requiredStages }))}
                          availableStages={availableStagesForProcess}
                          isReadOnly={isReadOnly}
                        />
                      </div>
                    )}
                  </div>

                  {/* Show Always Checkbox */}
                  <div className="flex items-center">
                    <label className={`flex items-center gap-2 select-none ${isReadOnly ? "opacity-60" : "cursor-pointer"}`}>
                      <input
                        type="checkbox"
                        checked={form.showAlways}
                        disabled={isReadOnly}
                        onChange={(e) => setForm((p) => ({ ...p, showAlways: e.target.checked }))}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-slate-800">Show always</span>
                    </label>
                    <InfoTooltip text="Display the field in the form even if it is not filled in." size="sm" />
                  </div>

                  {/* User Visibility Checkbox */}
                  <div className="flex items-center">
                    <label className={`flex items-center gap-2 select-none ${isReadOnly ? "opacity-60" : "cursor-pointer"}`}>
                      <input
                        type="checkbox"
                        checked={form.userVisibility !== false}
                        disabled={isReadOnly}
                        onChange={(e) => setForm((p) => ({ ...p, userVisibility: e.target.checked }))}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-slate-800">User Visibility</span>
                    </label>
                    <InfoTooltip text="Configure whether this field is visible to standard tenant users." size="sm" />
                  </div>

                  {/* Admin Control (Scope Rules + Permissions) */}
                  {isAdmin && (
                    <div className="pt-3 border-t border-slate-100 space-y-2.5">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Admin Controls
                      </div>

                      {/* Scope Rules Accordion */}
                      <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
                        <button
                          type="button"
                          onClick={() => setScopeDropdownOpen((v) => !v)}
                          className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between text-left transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Globe className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            <span className="text-xs font-semibold text-slate-800">Scope Rules</span>
                            <span onClick={(e) => e.stopPropagation()}>
                              <InfoTooltip text="Define which tenant organizations have visibility to this field." size="sm" />
                            </span>
                          </div>
                          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${scopeDropdownOpen ? "rotate-180" : ""}`} />
                        </button>
                        {scopeDropdownOpen && (
                          <div className="p-3 border-t border-slate-200 bg-white">
                            <AdminScopingRulesEditor
                              rules={form.scopingRules}
                              onChange={(rules) => setForm((p) => ({ ...p, scopingRules: rules }))}
                              isReadOnly={isReadOnly}
                            />
                          </div>
                        )}
                      </div>

                      {/* Permissions Accordion */}
                      <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
                        <button
                          type="button"
                          onClick={() => setPermissionsDropdownOpen((v) => !v)}
                          className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between text-left transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Lock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            <span className="text-xs font-semibold text-slate-800">Permissions</span>
                            <span onClick={(e) => e.stopPropagation()}>
                              <InfoTooltip text="Configure what tenant users are permitted to do with this field." size="sm" />
                            </span>
                          </div>
                          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${permissionsDropdownOpen ? "rotate-180" : ""}`} />
                        </button>
                        {permissionsDropdownOpen && (
                          <div className="p-3 border-t border-slate-200 bg-white">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex items-center">
                                <label className={`flex items-center gap-1.5 select-none ${isReadOnly ? "opacity-60" : "cursor-pointer"}`}>
                                  <input
                                    type="checkbox"
                                    checked={form.permissions.canHide !== false}
                                    disabled={isReadOnly}
                                    onChange={(e) => setForm((p) => ({
                                      ...p,
                                      permissions: { ...p.permissions, canHide: e.target.checked }
                                    }))}
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                  <span className="text-xs font-medium text-slate-800">Hide</span>
                                </label>
                                <InfoTooltip text="Tenant users can choose to show or hide this field in workspace views." size="sm" />
                              </div>

                              <div className="flex items-center">
                                <label className={`flex items-center gap-1.5 select-none ${isReadOnly ? "opacity-60" : "cursor-pointer"}`}>
                                  <input
                                    type="checkbox"
                                    checked={form.permissions.canEdit !== false}
                                    disabled={isReadOnly}
                                    onChange={(e) => setForm((p) => ({
                                      ...p,
                                      permissions: { ...p.permissions, canEdit: e.target.checked }
                                    }))}
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                  <span className="text-xs font-medium text-slate-800">Edit</span>
                                </label>
                                <InfoTooltip text="Tenant users can customize the label, placeholder, and configuration of this field." size="sm" />
                              </div>

                              <div className="flex items-center">
                                <label className={`flex items-center gap-1.5 select-none ${isReadOnly ? "opacity-60" : "cursor-pointer"}`}>
                                  <input
                                    type="checkbox"
                                    checked={form.permissions.canAddOptions !== false}
                                    disabled={isReadOnly}
                                    onChange={(e) => setForm((p) => ({
                                      ...p,
                                      permissions: { ...p.permissions, canAdd: e.target.checked, canAddOptions: e.target.checked }
                                    }))}
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                  <span className="text-xs font-medium text-slate-800">Add Options</span>
                                </label>
                                <InfoTooltip text="Tenant users can add custom options on top of admin-configured choices." size="sm" />
                              </div>

                              <div className="flex items-center">
                                <label className={`flex items-center gap-1.5 select-none ${isReadOnly ? "opacity-60" : "cursor-pointer"}`}>
                                  <input
                                    type="checkbox"
                                    checked={form.permissions.canDelete !== false}
                                    disabled={isReadOnly}
                                    onChange={(e) => setForm((p) => ({
                                      ...p,
                                      permissions: { ...p.permissions, canDelete: e.target.checked }
                                    }))}
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                  <span className="text-xs font-medium text-slate-800">Delete</span>
                                </label>
                                <InfoTooltip text="Field can be deleted by the user from workspace views (retained in Admin)." size="sm" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 7. Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            {isReadOnly ? "Close" : "Cancel"}
          </button>
          {!isReadOnly && (
            <button
              onClick={handleSave}
              disabled={!form.label.trim()}
              className="px-5 py-2 bg-[#111827] text-white text-sm font-semibold rounded-lg hover:bg-[#1f2937] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isEdit ? "Save Changes" : "Create Field"}
            </button>
          )}
        </div>
      </div>

      {/* Stacked Nested Field Drawer (creates new field of chosen type and inherits it) */}
      {nestedDrawerOpen && (
        <AdminFieldDrawer
          field={null}
          initialModule={form.module}
          initialCategory={nestedDrawerCategory}
          lockCategory={true}
          lockModule={true}
          sections={sections}
          zIndex={zIndex + 20}
          onClose={() => setNestedDrawerOpen(false)}
          onSaved={(createdField) => {
            setNestedDrawerOpen(false);
            setForm((p) => ({
              ...p,
              inheritedFieldKey: createdField.key,
            }));
          }}
        />
      )}
    </div>
  );
}

export default AdminFieldDrawer;
