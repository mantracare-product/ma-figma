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
  EyeOff,
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
  NewListConfig,
  NewListSourceMode,
  OptionListConfig,
  OptionListColumnConfig,
} from "../../../context/FieldRegistryContext";
import {
  useFieldRegistry,
  normalizeLegacyColumn,
  CURRENCY_SYMBOLS,
  getSuggestedPlaceholderForType,
  resolveColumnsOrSubFields,
} from "../../../context/FieldRegistryContext";
import { AdminScopingRulesEditor } from "./AdminScopingRulesEditor";
import { getStoredProcesses, Process, PROCESS_STORE_EVENT } from "../../../../lib/useProcessStore";
import { getStoredTeamMembers, TeamMember, TEAM_STORE_EVENT } from "../../../../lib/teamStore";
import { InfoTooltip } from "../../../components/help/InfoTooltip";
import { FieldInputRenderer } from "../../../components/fields/FieldInputRenderer";
import { AdminSelect } from "../../../components/ui/AdminSelect";
import { MediaFormatDropdown } from "./MediaFormatDropdown";
import {
  getAllMediaFormats,
  DEFAULT_MEDIA_PRESETS,
  MediaCategory,
} from "../../../../lib/mediaFormatsStore";
import { toast } from "sonner";

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
  | "new_list"
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
      { id: "new_list", label: "New List", description: "Manual options or composite-linked option list with row overrides" },
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
  { value: "(XXX) XXX-XXXX", label: "(XXX) XXX-XXXX (e.g. (555) 123-4567)" },
  { value: "XXX-XXX-XXXX", label: "XXX-XXX-XXXX (e.g. 555-123-4567)" },
  { value: "XXXXX XXXXX", label: "XXXXX XXXXX (e.g. 98765 43210)" },
  { value: "XXX XXX XXXX", label: "XXX XXX XXXX (e.g. 123 456 7890)" },
  { value: "XXXXXXXXXX", label: "XXXXXXXXXX (e.g. 1234567890)" },
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
  image: DEFAULT_MEDIA_PRESETS.image,
  document: DEFAULT_MEDIA_PRESETS.document,
  audio: DEFAULT_MEDIA_PRESETS.audio,
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
  visibleToUserIds: string[];
  sectionId: string;
  scopingRules: ScopingRule[];
  processIds: string[];
  permissions: FieldPermissions;

  // Text configuration
  textMode: "short" | "paragraph";
  maxChars?: number;
  richText: boolean;

  // Date & Time configuration
  dateTimeIsRange: boolean;
  dateTimeCapture: "date" | "time" | "both";
  dateFormat: string;
  timeFormat: "12h" | "24h";
  timezone: string;
  minDate?: string;
  maxDate?: string;

  // Composite field configuration
  compositeDisplayMode: "table" | "group";
  tableColumns: TableColumnConfig[];
  minEntries?: number;
  maxEntries?: number;

  // Media configuration
  mediaType: "document" | "image" | "audio" | "video" | "any";
  acceptedFormats: string[];
  maxFileSizeMB: number;
  allowMultipleFiles: boolean;
  maxFiles?: number;

  // Number configuration
  numberMode?: "single" | "range";
  maxCap?: number;
  minRange?: number;
  maxRange?: number;

  // Phone configuration
  phoneShowCountryCode: boolean;
  phoneCountryDisplay?: "name" | "code";
  phoneShowFlags: boolean;
  phoneFormat: string;

  // Rating / Currency
  currency: string;
  maxRating: number;

  // List Redesign configuration
  listValueType: ListValueType;
  inheritedFieldKey: string;
  liveSync: boolean;
  options: FieldOption[];
  selectionMode: "single" | "multiple";
  allowSearch: boolean;
  sortOrder: "manual" | "alphabetical_asc" | "alphabetical_desc" | "recent";
  liveLinkedFieldKey: string;

  // New List configuration
  newListSourceMode: NewListSourceMode;
  newListManualType: "single" | "multiple" | "open_list";
  newListSourceCompositeKey: string;
  newListColumnConfigs: OptionListColumnConfig[];

  // CRM Bind configuration
  crmBindModule: CrmBindModule;
  crmBindSelectionMode: "single" | "multiple";

  // Default value
  defaultValue?: any;
}

function resolvePrimaryCategory(f: FieldDefinition): PrimaryFieldTypeCategory {
  const t = f.inputType;
  if (t === "new_list" || f.newListConfig !== undefined) return "new_list";
  if (
    f.compositeDisplayMode !== undefined ||
    t === "table" ||
    t === "group" ||
    t === "group_repeatable" ||
    (t === "list_open" && (f.listEntryType === "structured" || (f.subFields && f.subFields.length > 0))) ||
    (f.tableColumns && f.tableColumns.length > 0 && t !== "list_select" && t !== "multiselect" && !f.listConfig) ||
    (f.subFields && f.subFields.length > 0 && t !== "list_select" && t !== "multiselect" && !f.listConfig)
  ) {
    return "composite";
  }
  if (t === "text" || t === "textarea" || t === "richtext") return "text";
  if (t === "number") return "number";
  if (t === "date" || t === "date_time" || t === "time") return "date_time";
  if (t === "money") return "money";
  if (t === "tel") return "tel";
  if (t === "email") return "email";
  if (t === "link") return "link";
  if (t === "whatsapp_link") return "whatsapp_link";
  if (t === "yes_no") return "yes_no";
  if (t === "rating") return "rating";
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
    visibleToUserIds: [],
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
    dateTimeIsRange: false,
    dateTimeCapture: "date",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "12h",
    timezone: "Local",
    minDate: undefined,
    maxDate: undefined,
    // Composite
    compositeDisplayMode: "table",
    tableColumns: [],
    minEntries: undefined,
    maxEntries: undefined,
    // Media
    mediaType: "document",
    acceptedFormats: getAllMediaFormats("document"),
    maxFileSizeMB: 10,
    allowMultipleFiles: false,
    maxFiles: undefined,
    // Number
    numberMode: "single",
    maxCap: undefined,
    minRange: undefined,
    maxRange: undefined,
    // Phone
    phoneShowCountryCode: true,
    phoneCountryDisplay: "code",
    phoneShowFlags: true,
    phoneFormat: "(XXX) XXX-XXXX",
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
    // New List
    newListSourceMode: "manual",
    newListManualType: "single",
    newListSourceCompositeKey: "",
    newListColumnConfigs: [],
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
    tooltip: f.tooltip || (f as any).helpText || "",
    required: Boolean(f.required),
    requiredStages: f.requiredStages ? [...f.requiredStages] : [],
    showAlways: f.showAlways !== false,
    userVisibility: f.userVisibility !== false,
    visibleToUserIds: f.visibleToUserIds ? f.visibleToUserIds.map(String) : [],
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
    dateTimeIsRange: Boolean(f.dateConfig?.isRange),
    dateTimeCapture: f.dateConfig?.capture || (f.inputType === "time" ? "time" : f.inputType === "date_time" ? "both" : "date"),
    dateFormat: f.dateConfig?.dateFormat || "DD/MM/YYYY",
    timeFormat: f.dateConfig?.timeFormat || "12h",
    timezone: f.dateConfig?.timezone || "Local",
    minDate: f.dateConfig?.minDate,
    maxDate: f.dateConfig?.maxDate,
    // Composite
    compositeDisplayMode: f.compositeDisplayMode || (f.inputType === "group" || f.inputType === "group_repeatable" ? "group" : "table"),
    tableColumns,
    minEntries: f.minEntries,
    maxEntries: f.maxEntries,
    // Media
    mediaType: f.mediaConfig?.mediaType || "document",
    acceptedFormats: f.mediaConfig?.acceptedFormats || getAllMediaFormats((f.mediaConfig?.mediaType || "document") as MediaCategory),
    maxFileSizeMB: f.mediaConfig?.maxFileSizeMB || 10,
    allowMultipleFiles: Boolean(f.mediaConfig?.allowMultiple),
    maxFiles: f.mediaConfig?.maxFiles,
    // Number
    numberMode: f.numberConfig?.numberMode === "range" ? "range" : "single",
    maxCap: f.numberConfig?.numberMode === "integer" ? f.numberConfig?.max : undefined,
    minRange: f.numberConfig?.min,
    maxRange: f.numberConfig?.max,
    // Phone
    phoneShowCountryCode: f.phoneConfig?.showCountryCode !== false,
    phoneCountryDisplay: f.phoneConfig?.countryCodeDisplay || "code",
    phoneShowFlags: f.phoneConfig?.showFlags ?? true,
    phoneFormat: f.phoneConfig?.numberFormat || "(XXX) XXX-XXXX",
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
    // New List
    newListSourceMode: f.newListConfig?.sourceMode || (f.newListConfig?.optionList?.sourceCompositeFieldKey ? "option_list" : "manual"),
    newListManualType: f.newListConfig?.manualType || (isMultiSelect ? "multiple" : (f.listEntryType === "plain_text" ? "open_list" : "single")),
    newListSourceCompositeKey: f.newListConfig?.optionList?.sourceCompositeFieldKey || "",
    newListColumnConfigs: f.newListConfig?.optionList?.columns || [],
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
  activeProcessId?: string;
  activeProcessName?: string;
  processStages?: Array<{ id: string; name: string; color?: string }>;
  onClose: () => void;
  onSaved?: (field: FieldDefinition) => void;
  onHide?: (field: FieldDefinition) => void;
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
  activeProcessId,
  activeProcessName,
  processStages,
  onClose,
  onSaved,
  onHide,
}: AdminFieldDrawerProps) {
  const { addCustomField, updateCustomField, deleteCustomField, getAllFields } = useFieldRegistry();
  const isEdit = field !== null;
  const isClientReadOnly = !isAdmin && isEdit && field?.permissions?.canEdit === false;
  const isReadOnly = isScribeSeed || isClientReadOnly;
  const canClientDelete = isEdit && field && (isAdmin || field.permissions?.canDelete !== false);
  const canClientHide = isEdit && field && (isAdmin || field.permissions?.canHide !== false);
  const canClientAddOptions = isAdmin || field?.permissions?.canAddOptions !== false;

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => getStoredTeamMembers());
  const [teamPickerOpen, setTeamPickerOpen] = useState(false);
  const teamPickerRef = useRef<HTMLDivElement>(null);

  const hasActiveProcessContext = Boolean(
    activeProcessId || activeProcessName || (processStages && processStages.length > 0)
  );

  const [form, setForm] = useState<FieldFormState>(() => {
    if (isEdit) {
      const init = initFormFromField(field!);
      if (activeProcessId && (!init.processIds || init.processIds.length === 0)) {
        return { ...init, processIds: [activeProcessId] };
      }
      return init;
    }
    const def = defaultForm(initialModule, initialCategory || "text");
    if (activeProcessId) {
      return { ...def, processIds: [activeProcessId] };
    }
    return def;
  });

  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [modulePickerOpen, setModulePickerOpen] = useState(false);
  const [processPickerOpen, setProcessPickerOpen] = useState(false);
  const [existingFieldPickerOpen, setExistingFieldPickerOpen] = useState(false);
  const [fieldSettingsOpen, setFieldSettingsOpen] = useState(false);
  const [scopeDropdownOpen, setScopeDropdownOpen] = useState(false);
  const [permissionsDropdownOpen, setPermissionsDropdownOpen] = useState(false);
  const [allProcesses, setAllProcesses] = useState<Process[]>(getStoredProcesses);
  const [errors, setErrors] = useState<{ label?: string }>({});

  const typePickerRef = useRef<HTMLDivElement>(null);
  const modulePickerRef = useRef<HTMLDivElement>(null);
  const processPickerRef = useRef<HTMLDivElement>(null);
  const existingFieldPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleUpdate = () => setAllProcesses(getStoredProcesses());
    const handleTeamUpdate = () => setTeamMembers(getStoredTeamMembers());
    window.addEventListener(PROCESS_STORE_EVENT, handleUpdate);
    window.addEventListener(TEAM_STORE_EVENT, handleTeamUpdate);
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("storage", handleTeamUpdate);
    return () => {
      window.removeEventListener(PROCESS_STORE_EVENT, handleUpdate);
      window.removeEventListener(TEAM_STORE_EVENT, handleTeamUpdate);
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("storage", handleTeamUpdate);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (typePickerRef.current && !typePickerRef.current.contains(e.target as Node)) {
        setTypePickerOpen(false);
      }
      if (modulePickerRef.current && !modulePickerRef.current.contains(e.target as Node)) {
        setModulePickerOpen(false);
      }
      if (processPickerRef.current && !processPickerRef.current.contains(e.target as Node)) {
        setProcessPickerOpen(false);
      }
      if (existingFieldPickerRef.current && !existingFieldPickerRef.current.contains(e.target as Node)) {
        setExistingFieldPickerOpen(false);
      }
      if (teamPickerRef.current && !teamPickerRef.current.contains(e.target as Node)) {
        setTeamPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
    if (!form.selectedModules.includes("process") && form.module !== "process") return [];

    // 1. Explicit processStages passed directly
    if (processStages && processStages.length > 0) {
      return processStages.map((s) => ({ id: s.name, name: s.name, color: s.color }));
    }

    // 2. Explicit active process context (by ID or name)
    if (activeProcessId || activeProcessName) {
      const targetProc = allProcesses.find(
        (p) =>
          (activeProcessId && (p.id === activeProcessId || p.name === activeProcessId)) ||
          (activeProcessName &&
            (p.name.toLowerCase() === activeProcessName.toLowerCase() || p.id === activeProcessName))
      );
      if (targetProc && targetProc.stages && targetProc.stages.length > 0) {
        return targetProc.stages.map((st) => ({ id: st.name, name: st.name, color: st.color }));
      }
    }

    // 3. Fallback to scoped processIds if selected
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
  }, [form.selectedModules, form.module, form.processIds, availableProcesses, processStages, activeProcessId, activeProcessName, allProcesses]);

  const targetProcessesForRequirement = useMemo(() => {
    if (!form.selectedModules.includes("process") && form.module !== "process") return [];
    if (form.processIds && form.processIds.length > 0 && !form.processIds.includes("all")) {
      const filtered = availableProcesses.filter((p) => form.processIds.includes(p.id) || form.processIds.includes(p.name));
      if (filtered.length > 0) return filtered;
    }
    return availableProcesses.length > 0 ? availableProcesses : allProcesses;
  }, [form.selectedModules, form.module, form.processIds, availableProcesses, allProcesses]);

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

  // Existing Composite fields in this module for "New List" Mode 2 (Option List)
  const availableCompositeFieldsInModule = useMemo(() => {
    return allFieldsInPrimaryModule.filter(
      (f) =>
        f.key !== form.key &&
        (f.inputType === "table" ||
          f.inputType === "group" ||
          f.inputType === "group_repeatable" ||
          (f.tableColumns && f.tableColumns.length > 0) ||
          (f.subFields && f.subFields.length > 0) ||
          f.compositeDisplayMode !== undefined)
    );
  }, [allFieldsInPrimaryModule, form.key]);

  const selectedCompositeDef = useMemo(() => {
    if (!form.newListSourceCompositeKey) return undefined;
    return allFieldsInPrimaryModule.find((f) => f.key === form.newListSourceCompositeKey);
  }, [allFieldsInPrimaryModule, form.newListSourceCompositeKey]);

  const selectedCompositeColumns: SubFieldConfig[] = useMemo(() => {
    if (!selectedCompositeDef) return [];
    const baseCols = resolveColumnsOrSubFields(selectedCompositeDef);
    return baseCols.map((col): SubFieldConfig => {
      const matchedField = allFieldsInPrimaryModule.find((f) => 
        f.key === col.id || 
        col.id.startsWith(`col_${f.key}_`) || 
        col.id.startsWith(`col_${f.key}__`) || 
        f.label.toLowerCase() === col.name.toLowerCase()
      );
      if (matchedField) {
        const isMulti = matchedField.inputType === "multiselect" || matchedField.selectionMode === "multiple";
        const finalType: SubFieldInputType = isMulti ? "multiselect" : (col.inputType || (matchedField.inputType as SubFieldInputType) || "text");
        return {
          ...col,
          inputType: finalType,
          options: (col.options && col.options.length > 0) ? col.options : matchedField.options,
          selectionMode: isMulti ? "multiple" : (matchedField.selectionMode || col.selectionMode),
          currency: col.currency || matchedField.currency,
          crmBindConfig: col.crmBindConfig || matchedField.crmBindConfig,
          listBindConfig: col.listBindConfig || matchedField.listBindConfig,
        };
      }
      return col;
    });
  }, [selectedCompositeDef, allFieldsInPrimaryModule]);

  const handleSelectCompositeForNewList = (compositeKey: string) => {
    const targetComp = allFieldsInPrimaryModule.find((f) => f.key === compositeKey);
    const cols = resolveColumnsOrSubFields(targetComp);
    const initialConfigs: OptionListColumnConfig[] = cols.map((c, i) => ({
      columnId: c.id,
      columnName: c.name,
      columnType: c.inputType,
      isPrimary: i === 0,
      isDisable: false,
      isEditable: i !== 0,
    }));
    setForm((p) => ({
      ...p,
      newListSourceCompositeKey: compositeKey,
      newListColumnConfigs: initialConfigs,
    }));
  };

  const importExistingFieldToColumn = (f: FieldDefinition) => {
    let colType = "Text";
    let subInputType: SubFieldInputType = "text";
    const isMulti = f.inputType === "multiselect" || f.selectionMode === "multiple";

    if (f.inputType === "number") { colType = "Number"; subInputType = "number"; }
    else if (f.inputType === "money") { colType = "Money"; subInputType = "money"; }
    else if (f.inputType === "list_select" || f.inputType === "select" || f.inputType === "multiselect" || f.inputType === "list" || f.inputType === "new_list") {
      colType = isMulti ? "Multi Select" : "Select";
      subInputType = isMulti ? "multiselect" : "list_select";
    }
    else if (f.inputType === "date") { colType = "Date"; subInputType = "date"; }
    else if (f.inputType === "time") { colType = "Time"; subInputType = "time"; }
    else if (f.inputType === "date_time") { colType = "Date & Time"; subInputType = "date_time"; }
    else if (f.inputType === "textarea" || f.inputType === "richtext") { colType = "Long Text"; subInputType = "textarea"; }
    else if (f.inputType === "yes_no") { colType = "Yes / No"; subInputType = "yes_no"; }
    else if (f.inputType === "email") { colType = "Email"; subInputType = "email"; }
    else if (f.inputType === "tel") { colType = "Phone"; subInputType = "tel"; }
    else if (f.inputType === "link" || f.inputType === "whatsapp_link") { colType = "Link"; subInputType = "link"; }
    else if (f.inputType === "rating") { colType = "Rating"; subInputType = "rating"; }
    else if (f.inputType === "crm_bind") { colType = "crm_bind"; subInputType = "crm_bind"; }

    const newCol: TableColumnConfig = {
      id: `col_${f.key}_${Date.now()}`,
      name: f.label,
      type: colType,
      inputType: subInputType,
      placeholder: f.placeholder || getSuggestedPlaceholderForType(f.inputType, f.label),
      options: f.options ? [...f.options] : undefined,
      currency: f.currency || (f.inputType === "money" ? "INR" : undefined),
      selectionMode: isMulti ? "multiple" : (f.selectionMode || "single"),
      crmBindConfig: f.crmBindConfig ? { ...f.crmBindConfig } : undefined,
      maxRating: f.maxRating,
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
      phoneConfig: {
        showCountryCode: form.phoneShowCountryCode,
        showFlags: form.phoneShowFlags,
        numberFormat: form.phoneFormat,
      },
      tableColumns: form.tableColumns,
      crmBindConfig: {
        sourceModule: form.crmBindModule || "teamMember",
        displayField: "name",
        selectionMode: form.crmBindSelectionMode || "single",
      },
      mediaConfig: {
        mediaType: form.mediaType,
        acceptedFormats: form.acceptedFormats,
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
    form.phoneShowCountryCode,
    form.phoneShowFlags,
    form.tableColumns,
    form.crmBindModule,
    form.crmBindSelectionMode,
    form.mediaType,
    form.acceptedFormats,
    form.maxFileSizeMB,
    form.allowMultipleFiles,
  ]);

  const inheritedCompositeSubFields = useMemo(() => {
    if (!inheritedFieldDef) return [];
    return resolveColumnsOrSubFields(inheritedFieldDef);
  }, [inheritedFieldDef]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (typePickerRef.current && !typePickerRef.current.contains(e.target as Node)) setTypePickerOpen(false);
      if (modulePickerRef.current && !modulePickerRef.current.contains(e.target as Node)) setModulePickerOpen(false);
      if (processPickerRef.current && !processPickerRef.current.contains(e.target as Node)) setProcessPickerOpen(false);
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
    if (form.primaryCategory === "number") {
      if (form.minRange !== undefined && form.maxRange !== undefined && form.minRange > form.maxRange) {
        toast.error("Min Value cannot be greater than Max Value");
        return false;
      }
      if (form.defaultValue !== undefined && form.defaultValue !== "") {
        const val = Number(form.defaultValue);
        if (!isNaN(val)) {
          if (form.minRange !== undefined && val < form.minRange) {
            toast.error(`Default value (${val}) cannot be less than Min Value (${form.minRange})`);
            return false;
          }
          if (form.maxRange !== undefined && val > form.maxRange) {
            toast.error(`Default value (${val}) cannot exceed Max Value (${form.maxRange})`);
            return false;
          }
        }
      }
    }
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
        if (form.dateTimeCapture === "date") return "date";
        if (form.dateTimeCapture === "time") return "time";
        return "date_time";
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
        return form.compositeDisplayMode === "table" ? "table" : "group_repeatable";
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
      case "new_list":
        return "new_list";
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
      requiredStages: (form.selectedModules.includes("process") || form.module === "process") && form.required && form.requiredStages.length > 0 ? form.requiredStages : undefined,
      showAlways: form.showAlways,
      userVisibility: form.userVisibility,
      visibleToUserIds: form.userVisibility !== false && form.visibleToUserIds.length > 0 ? form.visibleToUserIds : undefined,
      sectionId: form.sectionId || undefined,
      scopingRules: form.scopingRules.length > 0 ? form.scopingRules : undefined,
      processIds: (form.selectedModules.includes("process") || form.module === "process") ? (form.processIds.length > 0 ? form.processIds : (activeProcessId ? [activeProcessId] : undefined)) : undefined,
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
        isRange: false,
        dateFormat: form.dateTimeCapture !== "time" ? form.dateFormat : undefined,
        timeFormat: form.dateTimeCapture !== "date" ? form.timeFormat : undefined,
        timezone: form.dateTimeCapture !== "date" ? form.timezone : undefined,
        minDate: form.minDate?.trim() || undefined,
        maxDate: form.maxDate?.trim() || undefined,
      } : undefined,

      // Composite Field Config
      compositeDisplayMode: form.primaryCategory === "composite" ? form.compositeDisplayMode : undefined,
      minEntries: form.primaryCategory === "composite" ? (form.minEntries !== undefined && !isNaN(form.minEntries) ? form.minEntries : undefined) : undefined,
      maxEntries: form.primaryCategory === "composite" ? (form.maxEntries !== undefined && !isNaN(form.maxEntries) ? form.maxEntries : undefined) : undefined,
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
        numberMode: "single",
        min: form.minRange !== undefined && !isNaN(form.minRange) ? form.minRange : undefined,
        max: form.maxRange !== undefined && !isNaN(form.maxRange) ? form.maxRange : (form.maxCap !== undefined && !isNaN(form.maxCap) ? form.maxCap : undefined),
      } : undefined,

      // Phone Config
      phoneConfig: form.primaryCategory === "tel" ? {
        showCountryCode: form.phoneShowCountryCode,
        showFlags: form.phoneShowFlags,
        numberFormat: form.phoneFormat,
      } : undefined,

      // Options Config
      options: (form.primaryCategory === "list" || form.primaryCategory === "new_list")
        ? form.options.map((opt, i) => ({ ...opt, index: i + 1 }))
        : undefined,
      selectionMode: form.primaryCategory === "crm_bind"
        ? form.crmBindSelectionMode
        : form.primaryCategory === "list"
        ? form.selectionMode
        : form.primaryCategory === "new_list"
        ? (form.newListSourceMode === "manual" ? (form.newListManualType === "multiple" ? "multiple" : "single") : form.selectionMode)
        : undefined,
      listEntryType: (form.primaryCategory === "new_list" && form.newListSourceMode === "manual" && form.newListManualType === "open_list")
        ? "plain_text"
        : undefined,
      listConfig: form.primaryCategory === "list" ? {
        valueType: form.listValueType,
        inheritedFieldKey: form.inheritedFieldKey.trim() || undefined,
        allowSearch: form.allowSearch,
        sortOrder: form.sortOrder,
        liveLinkedFieldKey: (form.liveSync && (form.liveLinkedFieldKey.trim() || form.inheritedFieldKey.trim()))
          ? (form.liveLinkedFieldKey.trim() || form.inheritedFieldKey.trim())
          : undefined,
      } : undefined,

      // New List Config
      newListConfig: form.primaryCategory === "new_list" ? {
        sourceMode: form.newListSourceMode,
        manualType: form.newListSourceMode === "manual" ? form.newListManualType : undefined,
        selectionMode: form.newListSourceMode === "manual"
          ? (form.newListManualType === "multiple" ? "multiple" : "single")
          : form.selectionMode,
        allowSearch: form.allowSearch,
        sortOrder: form.sortOrder,
        optionList: form.newListSourceMode === "option_list" ? {
          sourceCompositeFieldKey: form.newListSourceCompositeKey,
          columns: form.newListColumnConfigs,
        } : undefined,
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
    const initialVal = form.listValueType === "composite" ? {} : "";
    setForm((p) => ({
      ...p,
      options: [
        ...p.options,
        {
          id: Date.now(),
          label: "",
          value: initialVal,
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
  const moveColumn = (idx: number, dir: -1 | 1) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= form.tableColumns.length) return;
    setForm((p) => {
      const copy = [...p.tableColumns];
      const [item] = copy.splice(idx, 1);
      copy.splice(targetIdx, 0, item);
      return { ...p, tableColumns: copy };
    });
  };

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

          {/* 1B. Process Workflow Selector (shown when module includes 'process') */}
          {(form.selectedModules.includes("process") || form.module === "process") && (() => {
            const activeProcessList = availableProcesses.length > 0 ? availableProcesses : allProcesses;
            const allSelected = activeProcessList.length > 0 && activeProcessList.every((p) => form.processIds?.includes(p.id));
            const noneSelected = !form.processIds || form.processIds.length === 0;

            const toggleSelectAllProcesses = () => {
              if (allSelected) {
                setForm((p) => ({ ...p, processIds: [] }));
              } else {
                setForm((p) => ({ ...p, processIds: activeProcessList.map((proc) => proc.id) }));
              }
            };

            return (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Process Workflow
                    </label>
                    <InfoTooltip text="Select the process workflows this field applies to." size="sm" />
                  </div>
                  {activeProcessList.length > 1 && !isReadOnly && (
                    <button
                      type="button"
                      onClick={toggleSelectAllProcesses}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      {allSelected ? "Deselect All" : "Select All"}
                    </button>
                  )}
                </div>

                <div className="relative" ref={processPickerRef}>
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => !isReadOnly && setProcessPickerOpen((v) => !v)}
                    className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs font-medium flex items-center justify-between transition-all select-none min-h-[40px] ${
                      isReadOnly
                        ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                        : "border-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      {noneSelected ? (
                        <span className="text-slate-400 text-xs">
                          Select process workflows...
                        </span>
                      ) : allSelected ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200/80 text-blue-700 text-[11px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                          <span>All ({activeProcessList.length}) Processes Selected</span>
                        </span>
                      ) : (
                        form.processIds.map((pId) => {
                          const proc = allProcesses.find((p) => p.id === pId);
                          return (
                            <span key={pId} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200/80 text-blue-700 text-[11px] font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                              <span className="truncate max-w-[150px]">{proc?.name || `Process #${pId}`}</span>
                            </span>
                          );
                        })
                      )}
                    </div>
                    {!isReadOnly && (
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${processPickerOpen ? "rotate-180" : ""}`} />
                    )}
                  </button>

                  {processPickerOpen && !isReadOnly && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden p-1.5 max-h-60 overflow-y-auto">
                      {/* Select All Row */}
                      <button
                        type="button"
                        onClick={toggleSelectAllProcesses}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer select-none font-semibold ${
                          allSelected ? "bg-blue-50 text-blue-900" : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span>Select All Processes ({activeProcessList.length})</span>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                          allSelected ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 bg-white"
                        }`}>
                          {allSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>

                      <div className="my-1 border-t border-slate-100" />

                      <div className="space-y-0.5">
                        {activeProcessList.map((proc) => {
                          const isChecked = form.processIds && form.processIds.includes(proc.id);
                          return (
                            <button
                              key={proc.id}
                              type="button"
                              onClick={() => {
                                setForm((p) => {
                                  const current = p.processIds || [];
                                  const exists = current.includes(proc.id);
                                  const next = exists
                                    ? current.filter((id) => id !== proc.id)
                                    : [...current, proc.id];
                                  return { ...p, processIds: next };
                                });
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer select-none ${
                                isChecked ? "bg-blue-50/80 text-blue-900 font-semibold" : "text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              <span className="truncate pr-2">{proc.name}</span>
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
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
            );
          })()}

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

          {/* 3B. Number Configuration */}
          {form.primaryCategory === "number" && (
            <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
              {/* Min & Max Bounds Configuration */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Min Value (Optional)
                    </label>
                    <InfoTooltip text="Optional minimum allowed number." size="sm" />
                  </div>
                  <input
                    type="number"
                    value={form.minRange ?? ""}
                    disabled={isReadOnly}
                    onChange={(e) => setForm((p) => ({ ...p, minRange: e.target.value !== "" ? Number(e.target.value) : undefined }))}
                    placeholder="e.g. 0"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Max Value (Optional)
                    </label>
                    <InfoTooltip text="Optional maximum allowed number." size="sm" />
                  </div>
                  <input
                    type="number"
                    value={form.maxRange ?? ""}
                    disabled={isReadOnly}
                    onChange={(e) => setForm((p) => ({ ...p, maxRange: e.target.value !== "" ? Number(e.target.value) : undefined }))}
                    placeholder="e.g. 100"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3C. Date & Time Configuration */}
          {form.primaryCategory === "date_time" && (
            <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
              {/* Capture Format */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Capture Format
                  </label>
                  <InfoTooltip text="Choose whether to capture Date only, Time only, or Both Date & Time." size="sm" />
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
                      {mode === "date" ? "Date only" : mode === "time" ? "Time only" : "Both (Date & Time)"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Format (when capture is date or both) */}
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

              {/* Time Format & Timezone (when capture is time or both) */}
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

              {/* Min & Max Date/Time Bounds (Optional) — Positioned below formats */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Min {form.dateTimeCapture === "time" ? "Time" : "Date"} (Optional)
                    </label>
                    <InfoTooltip text="Earliest selectable date or time constraint." size="sm" />
                  </div>
                  <input
                    type={form.dateTimeCapture === "time" ? "time" : form.dateTimeCapture === "date" ? "date" : "datetime-local"}
                    value={form.minDate || ""}
                    disabled={isReadOnly}
                    onChange={(e) => setForm((p) => ({ ...p, minDate: e.target.value || undefined }))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Max {form.dateTimeCapture === "time" ? "Time" : "Date"} (Optional)
                    </label>
                    <InfoTooltip text="Latest selectable date or time constraint." size="sm" />
                  </div>
                  <input
                    type={form.dateTimeCapture === "time" ? "time" : form.dateTimeCapture === "date" ? "date" : "datetime-local"}
                    value={form.maxDate || ""}
                    disabled={isReadOnly}
                    onChange={(e) => setForm((p) => ({ ...p, maxDate: e.target.value || undefined }))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3D. Composite Field (Group of Existing Fields) */}
          {form.primaryCategory === "composite" && (
            <div className="space-y-3.5 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Grouped Fields ({form.tableColumns.length})
                    </label>
                    <InfoTooltip text="Group existing fields in this module into this composite structure. Each sub-field inherits its format, validation, and type rules without separate configuration." size="sm" />
                  </div>

                  {!isReadOnly && (
                    <div className="relative" ref={existingFieldPickerRef}>
                      <button
                        type="button"
                        onClick={() => setExistingFieldPickerOpen((v) => !v)}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer shadow-2xs"
                        title="Add a field to this group"
                      >
                        <Plus className="w-3.5 h-3.5 text-blue-600" />
                        <span>Add Field</span>
                        <ChevronDown className={`w-3 h-3 text-blue-500 transition-transform ${existingFieldPickerOpen ? "rotate-180" : ""}`} />
                      </button>
                      {existingFieldPickerOpen && (
                        <div className="absolute right-0 top-full mt-1 w-72 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1 space-y-0.5">
                          <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Existing Fields in {MODULE_OPTIONS.find((m) => m.value === form.module)?.label || form.module}
                          </div>
                          {availableFieldsForComposite.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-slate-400 italic">No existing fields found in this module</div>
                          ) : (
                            <div className="space-y-0.5 max-h-48 overflow-y-auto">
                              {availableFieldsForComposite.map((f) => (
                                <button
                                  key={f.key}
                                  type="button"
                                  onClick={() => {
                                    importExistingFieldToColumn(f);
                                    setExistingFieldPickerOpen(false);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-50 flex items-center justify-between text-xs cursor-pointer group"
                                >
                                  <div className="min-w-0 pr-2">
                                    <div className="font-semibold text-slate-700 group-hover:text-blue-700 truncate">{f.label}</div>
                                    <div className="text-[10px] text-slate-400 font-mono truncate">{f.key}</div>
                                  </div>
                                  <span className="text-[10px] text-slate-500 font-medium px-1.5 py-0.5 bg-slate-100 rounded shrink-0">
                                    {f.inputType}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="pt-1 mt-1 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => {
                                setExistingFieldPickerOpen(false);
                                setNestedDrawerCategory("text");
                                setNestedDrawerOpen(true);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-50 text-blue-700 flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5 text-blue-600" />
                              <span>Create New Field</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {form.tableColumns.length === 0 ? (
                  <div className="p-4 bg-white border border-slate-200 border-dashed rounded-xl text-center space-y-2">
                    <p className="text-xs font-semibold text-slate-700">
                      No Fields Grouped Yet
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Select existing fields from this module to group into this composite field, or click <strong>+ Add Field</strong> to create a new one.
                    </p>
                    {!isReadOnly && (
                      <div className="flex items-center justify-center pt-1">
                        <button
                          type="button"
                          onClick={() => setExistingFieldPickerOpen((v) => !v)}
                          className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5 text-blue-600" />
                          <span>Add Field</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {form.tableColumns.map((col, idx) => (
                      <div key={col.id} className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                            #{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-800 truncate">{col.name}</span>
                              <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                {col.type || col.inputType}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate mt-0.5">
                              Inheriting format and validation rules
                            </div>
                          </div>
                        </div>

                        {!isReadOnly && (
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveColumn(idx, -1)}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                              title="Move up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === form.tableColumns.length - 1}
                              onClick={() => moveColumn(idx, 1)}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                              title="Move down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeColumn(idx)}
                              className="p-1 text-slate-300 hover:text-red-500 cursor-pointer rounded"
                              title="Delete sub-field"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Display Mode (placed below Grouped Fields as a Dropdown) */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Display Mode
                  </label>
                  <InfoTooltip text="Choose how this composite field appears on records. Data structure is shared between Table View and Group View." size="sm" />
                </div>
                <AdminSelect
                  value={form.compositeDisplayMode || "table"}
                  disabled={isReadOnly}
                  onChange={(val) => setForm((p) => ({ ...p, compositeDisplayMode: val as "table" | "group" }))}
                  options={[
                    { value: "table", label: "Table View (Spreadsheet Row)" },
                    { value: "group", label: "Group View (Card / Repeatable)" },
                  ]}
                />
              </div>

              {/* Min & Max Entries constraints */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/70">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">Min Entries</label>
                    <InfoTooltip text="Minimum number of entries/rows required. Leave blank or 0 for none." size="sm" />
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={form.minEntries ?? ""}
                    disabled={isReadOnly}
                    placeholder="0"
                    onChange={(e) => {
                      const val = e.target.value === "" ? undefined : Math.max(0, parseInt(e.target.value, 10));
                      setForm((p) => ({ ...p, minEntries: isNaN(val as any) ? undefined : val }));
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">Max Entries</label>
                    <InfoTooltip text="Maximum number of entries/rows allowed. Leave blank for unlimited." size="sm" />
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={form.maxEntries ?? ""}
                    disabled={isReadOnly}
                    placeholder="Unlimited"
                    onChange={(e) => {
                      const val = e.target.value === "" ? undefined : Math.max(1, parseInt(e.target.value, 10));
                      setForm((p) => ({ ...p, maxEntries: isNaN(val as any) ? undefined : val }));
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-blue-500 shadow-2xs"
                  />
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
                        acceptedFormats: getAllMediaFormats(mType),
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

              {/* Format Dropdown with Custom Type-In & Permanent Storage */}
              <MediaFormatDropdown
                category={form.mediaType as MediaCategory}
                selectedFormats={form.acceptedFormats}
                onChange={(fmts) => setForm((p) => ({ ...p, acceptedFormats: fmts }))}
                disabled={isReadOnly}
                zIndex={zIndex + 10}
              />

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
              <div className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-800">Show country code separately</span>
                  <InfoTooltip text="When enabled, a separate country code selector box (e.g. US +1) is shown before the phone input." size="sm" />
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.phoneShowCountryCode}
                    disabled={isReadOnly}
                    onChange={(e) => setForm((p) => ({ ...p, phoneShowCountryCode: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Number Format Mask
                  </label>
                  <InfoTooltip text="Auto-formatting pattern applied as digits are typed." size="sm" />
                </div>
                <AdminSelect
                  value={form.phoneFormat}
                  disabled={isReadOnly}
                  onChange={(val) => setForm((p) => ({ ...p, phoneFormat: val }))}
                  options={COMMON_PHONE_FORMATS}
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

                  {!isReadOnly && canClientAddOptions && (
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
                        className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2.5 hover:border-slate-300 transition-colors"
                      >
                        {form.listValueType === "composite" ? (
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                                  #{idx + 1}
                                </span>
                                <span className="text-xs font-bold text-slate-800">
                                  Option #{idx + 1}
                                </span>
                                {inheritedFieldDef?.label && (
                                  <span className="text-[10px] font-medium text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/80">
                                    {inheritedFieldDef.label}
                                  </span>
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

                            {inheritedCompositeSubFields.length === 0 ? (
                              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-400 italic">
                                No sub-fields configured on inherited composite field.
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-2.5 p-2.5 bg-slate-50/70 border border-slate-200/80 rounded-lg">
                                {inheritedCompositeSubFields.map((sub) => {
                                  const optObj: Record<string, any> =
                                    opt.value && typeof opt.value === "object" && !Array.isArray(opt.value)
                                      ? opt.value
                                      : {};
                                  return (
                                    <div key={sub.id} className="space-y-1">
                                      <label className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wider truncate">
                                        {sub.name} {sub.required && <span className="text-red-500">*</span>}
                                      </label>
                                      <FieldInputRenderer
                                        subField={sub}
                                        value={optObj[sub.id] ?? ""}
                                        onChange={(subVal) => {
                                          const updatedObj = { ...optObj, [sub.id]: subVal };
                                          const preview = formatCompositePreview(updatedObj);
                                          updateOption(idx, {
                                            value: updatedObj,
                                            label: preview || `Option #${idx + 1}`,
                                          });
                                        }}
                                        isSubField={true}
                                        disabled={isReadOnly}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Composite preview banner */}
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200/70 rounded-md text-[11px]">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Display Preview:</span>
                              <span className="font-semibold text-slate-700 truncate">
                                {formatCompositePreview(opt.value) || <span className="text-slate-400 italic">No sub-field values entered</span>}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                              #{idx + 1}
                            </span>

                            <div className="flex-1 min-w-0">
                              <FieldInputRenderer
                                field={inheritedFieldDef}
                                value={opt.value}
                                onChange={(val) => updateOption(idx, {
                                  value: val,
                                  label: typeof val === "string" ? val : String(val ?? ""),
                                })}
                                disabled={isReadOnly}
                              />
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

                {/* 4. Link it with the value Toggle */}
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-xs font-bold text-slate-800">
                        Link it with the value
                      </span>
                      <InfoTooltip
                        text={
                          form.inheritedFieldKey
                            ? `When enabled, values from ${inheritedFieldDef?.label || form.inheritedFieldKey} automatically become selectable options in this list.`
                            : "When enabled, options in this list automatically link and synchronize with values from the inherited field."
                        }
                        size="sm"
                      />
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
                </div>
              </div>
            </div>
          )}

          {/* 3H-2. NEW LIST FIELD CONFIGURATION (Manual List vs Option List) */}
          {form.primaryCategory === "new_list" && (
            <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-4">
              {/* SOURCE MODE DROPDOWN */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Source Mode <span className="text-red-500">*</span>
                  </label>
                  <InfoTooltip
                    text="Choose between defining manual options or referencing an existing Composite field."
                    size="sm"
                  />
                </div>
                <AdminSelect
                  value={form.newListSourceMode}
                  disabled={isReadOnly}
                  onChange={(val) => setForm((p) => ({ ...p, newListSourceMode: val as any }))}
                  options={[
                    { value: "manual", label: "Manual List" },
                    { value: "option_list", label: "Option List" },
                  ]}
                />
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  MODE 1 — MANUAL LIST (Reusing exact List manual-option UI/logic)
                 ───────────────────────────────────────────────────────────── */}
              {form.newListSourceMode === "manual" && (
                <div className="space-y-4 pt-1">
                  {/* Manual Type Choice (Single / Multi / Open-List) */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <label className="text-xs font-semibold text-slate-800">Manual Selection Type</label>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "single", label: "Single Select" },
                        { id: "multiple", label: "Multi-Select" },
                        { id: "open_list", label: "Open-List" },
                      ].map((t) => {
                        const isSelected = form.newListManualType === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            disabled={isReadOnly}
                            onClick={() =>
                              setForm((p) => ({
                                ...p,
                                newListManualType: t.id as any,
                                selectionMode: t.id === "multiple" ? "multiple" : "single",
                              }))
                            }
                            className={`py-2 px-3 rounded-lg border text-center transition-all cursor-pointer text-xs font-semibold ${
                              isSelected
                                ? "bg-blue-50 border-blue-400 text-blue-800"
                                : "bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {t.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Options List Builder (Reused exact logic from List) */}
                  {form.newListManualType !== "open_list" ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Defined Options ({form.options.length})
                        </span>

                        {!isReadOnly && canClientAddOptions && (
                          <button
                            type="button"
                            onClick={() => {
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
                            }}
                            className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border text-blue-600 hover:text-blue-700 cursor-pointer bg-blue-50 border-blue-200 transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Add Option
                          </button>
                        )}
                      </div>

                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {form.options.length === 0 ? (
                          <div className="p-4 bg-white border border-slate-200 border-dashed rounded-xl text-xs text-slate-400 text-center">
                            No options defined yet.
                          </div>
                        ) : (
                          form.options.map((opt, idx) => (
                            <div
                              key={opt.id || idx}
                              className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-slate-300 transition-colors"
                            >
                              <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                                #{idx + 1}
                              </span>

                              <div className="flex-1 min-w-0">
                                <input
                                  type="text"
                                  value={typeof opt.value === "string" ? opt.value : opt.label || ""}
                                  disabled={isReadOnly}
                                  placeholder={`Option #${idx + 1}...`}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    updateOption(idx, { value: val, label: val });
                                  }}
                                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium text-slate-800"
                                />
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
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">Open-List Mode:</span> Users can enter custom tags at runtime.
                    </div>
                  )}

                  {/* List Search & Sorting Configuration */}
                  <div className="pt-3 border-t border-slate-200/80 space-y-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      List Behavior & Sorting
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl">
                      <div className="flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs font-semibold text-slate-800">Allow Search Bar</span>
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

                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                        <label className="block text-xs font-semibold text-slate-700">Sorting Order</label>
                      </div>
                      <AdminSelect
                        value={form.sortOrder}
                        disabled={isReadOnly}
                        onChange={(val) => setForm((p) => ({ ...p, sortOrder: val as any }))}
                        options={[
                          { value: "manual", label: "Manual Order" },
                          { value: "alphabetical_asc", label: "Alphabetical (A - Z)" },
                          { value: "alphabetical_desc", label: "Alphabetical (Z - A)" },
                          { value: "recent", label: "Most Recently Added First" },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  MODE 2 — OPTION LIST (Linked to Existing Composite Field)
                 ───────────────────────────────────────────────────────────── */}
              {form.newListSourceMode === "option_list" && (
                <div className="space-y-4 pt-1">
                  {/* Select Source Composite Field */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Source Composite Field <span className="text-red-500">*</span>
                      </label>
                      {!isReadOnly && availableCompositeFieldsInModule.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setNestedDrawerCategory("composite");
                            setNestedDrawerOpen(true);
                          }}
                          className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Create New</span>
                        </button>
                      )}
                    </div>

                    {availableCompositeFieldsInModule.length > 0 ? (
                      <div className="space-y-1.5">
                        <AdminSelect
                          value={form.newListSourceCompositeKey}
                          disabled={isReadOnly}
                          onChange={(val) => handleSelectCompositeForNewList(val)}
                          placeholder="— Select an existing composite field —"
                          options={[
                            { value: "", label: "— Select an existing composite field —" },
                            ...availableCompositeFieldsInModule.map((cf) => ({
                              value: cf.key,
                              label: `${cf.label} (${cf.key})`,
                              subtitle: `Type: ${cf.inputType === "table" ? "Table" : "Group"} • ${resolveColumnsOrSubFields(cf).length} columns`,
                            })),
                          ]}
                        />
                        {form.newListSourceCompositeKey && selectedCompositeDef && (
                          <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>
                              Connected to <strong>{selectedCompositeDef.label}</strong> ({selectedCompositeColumns.length} columns)
                            </span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 border border-slate-200 border-dashed rounded-xl text-center space-y-2.5">
                        <p className="text-xs font-medium text-slate-600">No composite fields found in this module</p>
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => {
                              setNestedDrawerCategory("composite");
                              setNestedDrawerOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 font-semibold text-xs rounded-lg border border-blue-200 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Create Composite Field</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Column Properties Configuration Table */}
                  {selectedCompositeColumns.length > 0 && (
                    <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Per-Column Behavior Properties
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                          {selectedCompositeColumns.length} Columns
                        </span>
                      </div>

                      {/* Matrix Grid */}
                      <div className="border border-slate-200 rounded-lg overflow-x-auto">
                        <table className="w-full min-w-[480px] text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold text-slate-700">
                              <th className="px-3 py-2 min-w-[140px]">Column Name</th>
                              <th className="px-2 py-2 text-center w-20">Type</th>
                              <th className="px-2 py-2 text-center w-20">
                                <span className="text-blue-700">Primary</span>
                              </th>
                              <th className="px-2 py-2 text-center w-20">
                                <span className="text-slate-600">Disable</span>
                              </th>
                              <th className="px-2 py-2 text-center w-20">
                                <span className="text-emerald-700">Editable</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedCompositeColumns.map((col, idx) => {
                              const existingCfg = form.newListColumnConfigs.find((c) => c.columnId === col.id) || {
                                columnId: col.id,
                                columnName: col.name,
                                columnType: col.inputType,
                                isPrimary: idx === 0,
                                isDisable: false,
                                isEditable: idx !== 0,
                              };

                              const isPrimary = Boolean(existingCfg.isPrimary);
                              const isDisable = Boolean(existingCfg.isDisable);
                              const isEditable = Boolean(existingCfg.isEditable);

                              return (
                                <tr key={col.id} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="px-3 py-2.5">
                                    <div className="font-semibold text-slate-800 text-xs">{col.name}</div>
                                    <div className="text-[10px] font-mono text-slate-400">{col.id}</div>
                                  </td>
                                  <td className="px-2 py-2.5 text-center">
                                    <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200/60 uppercase">
                                      {col.inputType || "text"}
                                    </span>
                                  </td>
                                  {/* 1. Primary Radio (exactly 1 marked Primary) */}
                                  <td className="px-2 py-2.5 text-center">
                                    <label className="inline-flex items-center justify-center p-1 cursor-pointer">
                                      <input
                                        type="radio"
                                        name="primaryColumnRadio"
                                        disabled={isReadOnly}
                                        checked={isPrimary}
                                        onChange={() => {
                                          const next = selectedCompositeColumns.map((c) => {
                                            const cfg = form.newListColumnConfigs.find((x) => x.columnId === c.id) || {
                                              columnId: c.id,
                                              columnName: c.name,
                                              columnType: c.inputType,
                                              isPrimary: false,
                                              isDisable: false,
                                              isEditable: true,
                                            };
                                            const selectedThis = c.id === col.id;
                                            return {
                                              ...cfg,
                                              columnId: c.id,
                                              columnName: c.name,
                                              columnType: c.inputType,
                                              isPrimary: selectedThis,
                                              isDisable: selectedThis ? false : cfg.isDisable,
                                              isEditable: selectedThis ? false : cfg.isEditable,
                                            };
                                          });
                                          setForm((p) => ({ ...p, newListColumnConfigs: next }));
                                        }}
                                        className="w-4 h-4 text-blue-600 cursor-pointer accent-blue-600"
                                      />
                                    </label>
                                  </td>
                                  {/* 2. Disable Checkbox (Multiple allowed) */}
                                  <td className="px-2 py-2.5 text-center">
                                    <label className={`inline-flex items-center justify-center p-1 ${isPrimary || isReadOnly ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}>
                                      <input
                                        type="checkbox"
                                        disabled={isPrimary || isReadOnly}
                                        checked={isDisable}
                                        onChange={(e) => {
                                          const checked = e.target.checked;
                                          const next = selectedCompositeColumns.map((c) => {
                                            const cfg = form.newListColumnConfigs.find((x) => x.columnId === c.id) || {
                                              columnId: c.id,
                                              columnName: c.name,
                                              columnType: c.inputType,
                                              isPrimary: c.id === col.id ? isPrimary : false,
                                              isDisable: false,
                                              isEditable: true,
                                            };
                                            if (c.id === col.id) {
                                              return {
                                                ...cfg,
                                                columnId: c.id,
                                                columnName: c.name,
                                                columnType: c.inputType,
                                                isDisable: checked,
                                                isEditable: checked ? false : cfg.isEditable,
                                              };
                                            }
                                            return cfg;
                                          });
                                          setForm((p) => ({ ...p, newListColumnConfigs: next }));
                                        }}
                                        className="w-4 h-4 text-slate-600 rounded cursor-pointer accent-slate-600"
                                      />
                                    </label>
                                  </td>
                                  {/* 3. Editable Checkbox (Multiple allowed) */}
                                  <td className="px-2 py-2.5 text-center">
                                    <label className={`inline-flex items-center justify-center p-1 ${isPrimary || isReadOnly ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}>
                                      <input
                                        type="checkbox"
                                        disabled={isPrimary || isReadOnly}
                                        checked={isEditable}
                                        onChange={(e) => {
                                          const checked = e.target.checked;
                                          const next = selectedCompositeColumns.map((c) => {
                                            const cfg = form.newListColumnConfigs.find((x) => x.columnId === c.id) || {
                                              columnId: c.id,
                                              columnName: c.name,
                                              columnType: c.inputType,
                                              isPrimary: c.id === col.id ? isPrimary : false,
                                              isDisable: false,
                                              isEditable: true,
                                            };
                                            if (c.id === col.id) {
                                              return {
                                                ...cfg,
                                                columnId: c.id,
                                                columnName: c.name,
                                                columnType: c.inputType,
                                                isEditable: checked,
                                                isDisable: checked ? false : cfg.isDisable,
                                              };
                                            }
                                            return cfg;
                                          });
                                          setForm((p) => ({ ...p, newListColumnConfigs: next }));
                                        }}
                                        className="w-4 h-4 text-emerald-600 rounded cursor-pointer accent-emerald-600"
                                      />
                                    </label>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Defined Option Items / Records for Option List */}
                  {selectedCompositeColumns.length > 0 && (
                    <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Defined Option Rows ({form.options.length})
                        </span>

                        {!isReadOnly && canClientAddOptions && (
                          <button
                            type="button"
                            onClick={() => {
                              const newIdx = form.options.length + 1;
                              const initialRowVals: Record<string, any> = {};
                              selectedCompositeColumns.forEach((c) => {
                                initialRowVals[c.id] = "";
                              });
                              setForm((p) => ({
                                ...p,
                                options: [
                                  ...p.options,
                                  {
                                    id: Date.now() + newIdx,
                                    label: "",
                                    value: initialRowVals,
                                    index: newIdx,
                                  },
                                ],
                              }));
                            }}
                            className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border text-blue-600 hover:text-blue-700 cursor-pointer bg-blue-50 border-blue-200 transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Add Option Row
                          </button>
                        )}
                      </div>

                      {form.options.length === 0 ? (
                        <div className="p-4 bg-white border border-slate-200 border-dashed rounded-xl text-xs text-slate-400 text-center">
                          No option rows defined yet. Click &ldquo;+ Add Option Row&rdquo; above to add options.
                        </div>
                      ) : (
                        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                          {form.options.map((opt, optIdx) => {
                            const primaryCol = form.newListColumnConfigs.find((c) => c.isPrimary)?.columnId || selectedCompositeColumns[0]?.id;
                            const rowVals: Record<string, any> = (typeof opt.value === "object" && opt.value !== null)
                              ? opt.value
                              : { [primaryCol]: opt.label || opt.value || "" };

                            return (
                              <div
                                key={opt.id || optIdx}
                                className="p-3 bg-slate-50/60 border border-slate-200 rounded-xl space-y-2 hover:border-slate-300 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded">
                                    Row #{optIdx + 1}
                                  </span>

                                  {!isReadOnly && (
                                    <div className="flex items-center gap-0.5">
                                      <button
                                        type="button"
                                        disabled={optIdx === 0}
                                        onClick={() => moveOption(optIdx, -1)}
                                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                                        title="Move up"
                                      >
                                        <ChevronUp className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={optIdx === form.options.length - 1}
                                        onClick={() => moveOption(optIdx, 1)}
                                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                                        title="Move down"
                                      >
                                        <ChevronDown className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => removeOption(optIdx)}
                                        className="p-1 text-slate-300 hover:text-red-500 cursor-pointer rounded"
                                        title="Delete row"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  {selectedCompositeColumns.map((col) => {
                                    const colCfg = form.newListColumnConfigs.find((c) => c.columnId === col.id);
                                    const isPrimary = colCfg?.isPrimary ?? (col.id === selectedCompositeColumns[0]?.id);
                                    const currentVal = rowVals[col.id] ?? (isPrimary ? opt.label : "");

                                    return (
                                      <div key={col.id} className="space-y-1">
                                        <label className="text-[10px] font-semibold text-slate-600 flex items-center gap-1">
                                          <span>{col.name}</span>
                                          {isPrimary && (
                                            <span className="text-[9px] bg-blue-100 text-blue-700 px-1 py-0.2 rounded font-normal">
                                              Primary
                                            </span>
                                          )}
                                        </label>
                                        <FieldInputRenderer
                                          subField={col}
                                          value={currentVal}
                                          disabled={isReadOnly}
                                          onChange={(subVal) => {
                                            const nextVals = { ...rowVals, [col.id]: subVal };
                                            const primaryColId = form.newListColumnConfigs.find((c) => c.isPrimary)?.columnId || selectedCompositeColumns[0]?.id;
                                            const updatedLabel = isPrimary
                                              ? (typeof subVal === "string" ? subVal : (Array.isArray(subVal) ? subVal.join(", ") : String(subVal ?? "")))
                                              : (nextVals[primaryColId] || opt.label || (typeof subVal === "string" ? subVal : ""));
                                            updateOption(optIdx, {
                                              label: updatedLabel,
                                              value: nextVals,
                                            });
                                          }}
                                          isSubField={true}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Option List Render & Selection Settings */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Option List Behavior & Selection
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Selection Mode */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <label className="block text-xs font-semibold text-slate-700">Selection Mode</label>
                        </div>
                        <AdminSelect
                          value={form.selectionMode}
                          disabled={isReadOnly}
                          onChange={(val) => setForm((p) => ({ ...p, selectionMode: val as "single" | "multiple" }))}
                          options={[
                            { value: "single", label: "Single Selection (1 Row Block)" },
                            { value: "multiple", label: "Multiple Selection (Multi-Row Blocks)" },
                          ]}
                        />
                      </div>

                      {/* Sorting Order */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                          <label className="block text-xs font-semibold text-slate-700">Sorting Order</label>
                        </div>
                        <AdminSelect
                          value={form.sortOrder}
                          disabled={isReadOnly}
                          onChange={(val) => setForm((p) => ({ ...p, sortOrder: val as any }))}
                          options={[
                            { value: "manual", label: "Source Row Order" },
                            { value: "alphabetical_asc", label: "Primary Column (A - Z)" },
                            { value: "alphabetical_desc", label: "Primary Column (Z - A)" },
                            { value: "recent", label: "Most Recent First" },
                          ]}
                        />
                      </div>
                    </div>

                    {/* Allow Search Bar */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs font-semibold text-slate-800">Allow Search Bar</span>
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
                  </div>
                </div>
              )}
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

          {/* 4. Tool tip */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Tool tip
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
                  dateConfig: {
                    capture: form.dateTimeCapture,
                    isRange: false,
                    dateFormat: form.dateFormat,
                    timeFormat: form.timeFormat,
                    timezone: form.timezone,
                    minDate: form.minDate,
                    maxDate: form.maxDate,
                  },
                  numberConfig: {
                    numberMode: "single",
                    min: form.minRange,
                    max: form.maxRange,
                  },
                  phoneConfig: {
                    showCountryCode: form.phoneShowCountryCode,
                    showFlags: form.phoneShowFlags,
                    numberFormat: form.phoneFormat,
                  },
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
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <label className={`flex items-center gap-2 select-none ${isReadOnly ? "opacity-60" : "cursor-pointer"}`}>
                        <input
                          type="checkbox"
                          checked={form.required}
                          disabled={isReadOnly}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setForm((p) => ({
                              ...p,
                              required: checked,
                            }));
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-slate-800">Required field</span>
                      </label>
                      <InfoTooltip text="Users must provide a value before saving records." size="sm" />
                    </div>

                    {form.required && (form.selectedModules.includes("process") || form.module === "process") && (
                      <div className="mt-2.5 ml-6 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                            Process Stage Requirements
                          </span>
                          <span className="text-[10px] font-medium text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
                            {targetProcessesForRequirement.length} {targetProcessesForRequirement.length === 1 ? "Process" : "Processes"}
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {targetProcessesForRequirement.map((proc) => {
                            const procStages = proc.stages && proc.stages.length > 0 ? proc.stages : [
                              { id: "initial", name: "Initial Contact" },
                              { id: "review", name: "Insurance Verify" },
                              { id: "schedule", name: "Schedule Appointment" },
                              { id: "last", name: "last stage" },
                            ];
                            const selectedStagesInProc = procStages.filter((st) => form.requiredStages.includes(st.name));
                            const allStagesSelected = selectedStagesInProc.length === procStages.length;

                            const toggleSelectAllStagesInProc = () => {
                              setForm((p) => {
                                const currentStages = p.requiredStages || [];
                                if (allStagesSelected) {
                                  const remaining = currentStages.filter((st) => !procStages.some((s) => s.name === st));
                                  return { ...p, requiredStages: remaining };
                                } else {
                                  const procStageNames = procStages.map((s) => s.name);
                                  const otherStages = currentStages.filter((st) => !procStageNames.includes(st));
                                  return { ...p, requiredStages: [...otherStages, ...procStageNames] };
                                }
                              });
                            };

                            const toggleStage = (stageName: string) => {
                              setForm((p) => {
                                const currentStages = p.requiredStages || [];
                                const exists = currentStages.includes(stageName);
                                const next = exists
                                  ? currentStages.filter((s) => s !== stageName)
                                  : [...currentStages, stageName];
                                return { ...p, requiredStages: next };
                              });
                            };

                            return (
                              <div key={proc.id} className="p-3 bg-amber-50/70 border border-amber-200/90 rounded-xl space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                                    <span className="text-xs font-bold text-slate-900 truncate" title={proc.name}>
                                      {proc.name}
                                    </span>
                                  </div>
                                  {!isReadOnly && (
                                    <button
                                      type="button"
                                      onClick={toggleSelectAllStagesInProc}
                                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                                    >
                                      {allStagesSelected ? "Deselect All" : "Select All"}
                                    </button>
                                  )}
                                </div>

                                <div className="space-y-1.5">
                                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                                    Required at Stages ({selectedStagesInProc.length} of {procStages.length})
                                  </label>
                                  
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    {procStages.map((st) => {
                                      const isChecked = form.requiredStages.includes(st.name);
                                      return (
                                        <button
                                          key={st.id || st.name}
                                          type="button"
                                          disabled={isReadOnly}
                                          onClick={() => toggleStage(st.name)}
                                          className={`px-2.5 py-1.5 rounded-lg border text-left text-xs flex items-center justify-between gap-2 transition-all cursor-pointer ${
                                            isChecked
                                              ? "bg-amber-100/90 border-amber-300 text-amber-950 font-semibold shadow-2xs"
                                              : "bg-white/80 border-slate-200 text-slate-700 hover:bg-white"
                                          }`}
                                        >
                                          <span className="truncate">{st.name}</span>
                                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                            isChecked ? "bg-amber-600 border-amber-600 text-white" : "border-slate-300 bg-white"
                                          }`}>
                                            {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <p className="text-[10px] text-amber-800/80 leading-relaxed">
                                  {selectedStagesInProc.length === 0 ? (
                                    <span className="text-slate-400 italic">No stages selected for this process workflow.</span>
                                  ) : allStagesSelected ? (
                                    <>Mandatory across <strong>all {procStages.length} stages</strong> in {proc.name}.</>
                                  ) : (
                                    <>Mandatory when entering <strong>{selectedStagesInProc.map((s) => s.name).join(", ")}</strong> in {proc.name}.</>
                                  )}
                                </p>
                              </div>
                            );
                          })}
                        </div>
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

                  {/* User Visibility Toggle (Admin Mode) */}
                  {isAdmin && (
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
                      <InfoTooltip text="Enable this to allow users in client records to restrict visibility of this field to specific team members." size="sm" />
                    </div>
                  )}

                  {/* User Visibility & Team Members Selection (Client Mode) */}
                  {!isAdmin && form.userVisibility !== false && (
                    <div className="space-y-3 p-3.5 rounded-xl bg-slate-50/80 border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 select-none">
                          <div className="w-4 h-4 rounded bg-blue-600 text-white flex items-center justify-center shadow-2xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                          <span className="text-xs font-semibold text-slate-800">User Visibility</span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        </div>
                        <InfoTooltip text="Specify which team members are permitted to view and edit this field." size="sm" />
                      </div>

                      {/* Team Member Dropdown */}
                      <div className="space-y-2">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Assigned Team Members ({form.visibleToUserIds.length > 0 ? form.visibleToUserIds.length : "All"})
                        </label>

                        <div className="relative" ref={teamPickerRef}>
                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => setTeamPickerOpen((v) => !v)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl text-xs font-semibold text-slate-800 transition-all cursor-pointer shadow-2xs outline-none group text-left"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                                {form.visibleToUserIds.length > 0 ? form.visibleToUserIds.length : "👥"}
                              </div>
                              <span className="truncate text-slate-700">
                                {form.visibleToUserIds.length === 0
                                  ? "Visible to all team members"
                                  : `${form.visibleToUserIds.length} team ${form.visibleToUserIds.length === 1 ? "member" : "members"} selected`}
                              </span>
                            </div>
                            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-150 shrink-0 ml-2 ${teamPickerOpen ? "rotate-180" : ""}`} />
                          </button>

                          {teamPickerOpen && (
                            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 animate-in fade-in-80 zoom-in-95">
                              <div className="p-2.5 bg-slate-50 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700">Select Team Members</span>
                                {form.visibleToUserIds.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setForm((p) => ({ ...p, visibleToUserIds: [] }))}
                                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                                  >
                                    Reset to All
                                  </button>
                                )}
                              </div>
                              <div className="max-h-52 overflow-y-auto p-1.5 space-y-0.5">
                                {teamMembers.map((member) => {
                                  const idStr = String(member.id);
                                  const isAssigned = form.visibleToUserIds.includes(idStr);
                                  return (
                                    <button
                                      key={member.id}
                                      type="button"
                                      onClick={() => {
                                        if (isAssigned) {
                                          setForm((p) => ({
                                            ...p,
                                            visibleToUserIds: p.visibleToUserIds.filter((id) => id !== idStr),
                                          }));
                                        } else {
                                          setForm((p) => ({
                                            ...p,
                                            visibleToUserIds: [...p.visibleToUserIds, idStr],
                                          }));
                                        }
                                      }}
                                      className={`w-full px-2.5 py-2 rounded-lg text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                        isAssigned ? "bg-blue-50 text-blue-800 font-semibold" : "hover:bg-slate-50 text-slate-700"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                                          {member.name.charAt(0)}
                                        </div>
                                        <div className="truncate">
                                          <span className="block truncate font-medium">{member.name}</span>
                                          {member.role && (
                                            <span className="text-[10px] text-slate-400 block truncate">
                                              {member.role}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                        isAssigned ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 bg-white"
                                      }`}>
                                        {isAssigned && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Selected Member Badges */}
                        {form.visibleToUserIds.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {form.visibleToUserIds.map((userId) => {
                              const member = teamMembers.find((m) => String(m.id) === String(userId));
                              const memberName = member?.name || `User #${userId}`;
                              return (
                                <div
                                  key={userId}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 text-slate-800 text-xs font-medium rounded-lg shadow-2xs"
                                >
                                  <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[9px]">
                                    {memberName.charAt(0)}
                                  </div>
                                  <span className="truncate max-w-[140px]">{memberName}</span>
                                  {!isReadOnly && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setForm((p) => ({
                                          ...p,
                                          visibleToUserIds: p.visibleToUserIds.filter((id) => id !== userId),
                                        }))
                                      }
                                      className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer ml-0.5"
                                      title="Remove team member"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!isAdmin && form.userVisibility === false && (
                    <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 text-xs text-slate-500 flex items-center justify-between">
                      <span className="font-medium">User Visibility</span>
                      <span className="text-[11px] text-slate-400 italic">Disabled by Administrator</span>
                    </div>
                  )}

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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              {isReadOnly ? "Close" : "Cancel"}
            </button>

            {/* Client / Admin Hide Button */}
            {canClientHide && onHide && isEdit && !isScribeSeed && (
              <button
                type="button"
                onClick={() => {
                  if (field) {
                    onHide(field);
                  }
                }}
                className="px-3 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Hide this field from view"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Hide</span>
              </button>
            )}

            {/* Client / Admin Delete Button */}
            {canClientDelete && isEdit && !isScribeSeed && (
              <button
                type="button"
                onClick={() => {
                  if (field && window.confirm(`Are you sure you want to delete "${field.label}"?`)) {
                    deleteCustomField(form.module, field.id);
                    toast.success(`Field "${field.label}" deleted`);
                    onClose();
                  }
                }}
                className="px-3 py-2 text-sm font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Delete this field"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>

          {!isReadOnly && (
            <button
              type="button"
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
          lockCategory={nestedDrawerCategory === "composite" || form.primaryCategory !== "composite"}
          lockModule={true}
          sections={sections}
          zIndex={zIndex + 20}
          onClose={() => setNestedDrawerOpen(false)}
          onSaved={(createdField) => {
            setNestedDrawerOpen(false);
            if (form.primaryCategory === "composite") {
              importExistingFieldToColumn(createdField);
            } else if (form.primaryCategory === "new_list") {
              handleSelectCompositeForNewList(createdField.key);
            } else {
              setForm((p) => ({
                ...p,
                inheritedFieldKey: createdField.key,
              }));
            }
          }}
        />
      )}
    </div>
  );
}

export default AdminFieldDrawer;
