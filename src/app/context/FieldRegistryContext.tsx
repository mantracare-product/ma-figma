import React, { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import { getStoredProcesses } from "../../lib/useProcessStore";

export type FieldModule = "client" | "process" | "appointment" | "call" | "service" | "organization" | "deal" | "teamMember" | "scribe";

export const ALL_MODULES: Exclude<FieldModule, "deal">[] = [
  "client",
  "process",
  "appointment",
  "call",
  "service",
  "organization",
  "teamMember",
  "scribe"
];

export const MODULE_NOUN: Record<Exclude<FieldModule, "deal">, { singular: string; plural: string }> = {
  client: { singular: "client", plural: "clients" },
  process: { singular: "process", plural: "processes" },
  appointment: { singular: "appointment", plural: "appointments" },
  call: { singular: "call", plural: "calls" },
  service: { singular: "service", plural: "services" },
  organization: { singular: "organization", plural: "organizations" },
  teamMember: { singular: "team member", plural: "team members" },
  scribe: { singular: "AI Scribe field", plural: "AI Scribe fields" },
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "\u20b9", USD: "$", EUR: "\u20ac", GBP: "\u00a3",
  JPY: "\u00a5", AED: "\u062f.\u0625", SGD: "S$", CAD: "CA$",
  AUD: "A$", CHF: "Fr", CNY: "\u00a5", BRL: "R$",
};

export type FieldInputType =
  // Primitives
  | "text"
  | "email"
  | "tel"
  | "textarea"
  | "richtext"
  | "date"
  | "date_time"
  | "time"
  | "number"
  | "money"
  | "link"
  | "whatsapp_link"
  | "yes_no"
  | "rating"
  // Consolidated & Composable
  | "list_select"
  | "list_open"
  | "group"
  | "group_repeatable"
  | "table"
  | "crm_bind"
  // Media / Non-defaultable
  | "signature"
  | "drawing"
  | "drawer"
  | "file"
  // Legacy Aliases
  | "select"
  | "multiselect"
  | "list"
  | "user"
  | "formula"
  | "resource";

export type SubFieldInputType =
  | "text"
  | "textarea"
  | "number"
  | "money"
  | "date"
  | "date_time"
  | "time"
  | "list_select"
  | "yes_no"
  | "link"
  | "email"
  | "tel"
  | "rating"
  | "crm_bind";

export type CrmBindModule = "teamMember" | "client" | "organization" | "service" | "process";

export interface CrmBindConfig {
  sourceModule: CrmBindModule;
  displayField: string;             // e.g. "name", "title", "email"
  secondaryDisplayField?: string;   // e.g. "role", "phoneNumber"
  selectionMode: "single" | "multiple";
}

export interface ListBindConfig {
  sourceType: "open_list" | "table" | "crm" | "field" | "group"; // "group" retained as legacy alias for "open_list"
  targetFieldKey?: string;             // Key of target Open List or Table field
  targetColumnOrSubFieldId?: string;   // ID of column or sub-field to extract options from
  crmModule?: CrmBindModule;           // Module if binding to CRM records
  displayField?: string;               // Display property e.g. "name", "title"
}

export interface SubFieldConfig {
  id: string;
  name: string;
  inputType: SubFieldInputType;
  placeholder?: string;
  required?: boolean;
  options?: FieldOption[];
  crmBindConfig?: CrmBindConfig;
  defaultValue?: any;
  currency?: string;  // for money sub-fields
  selectionMode?: "single" | "multiple"; // for list_select and crm_bind sub-fields
  maxRating?: number; // for rating sub-fields
  listBindConfig?: ListBindConfig; // for list_select sub-fields
  phoneConfig?: {
    countryCodeDisplay?: "name" | "code";
    showFlags?: boolean;
    numberFormat?: string;
  };
  dateConfig?: {
    capture?: "date" | "time" | "both";
    isRange?: boolean;
    dateFormat?: string;
    timeFormat?: "12h" | "24h";
    timezone?: string;
    minDate?: string;
    maxDate?: string;
  };
  numberConfig?: {
    numberMode?: "single" | "range" | "integer";
    min?: number;
    max?: number;
  };
}

export interface TableColumnConfig {
  id: string;
  name: string;
  type: string;
  inputType?: SubFieldInputType;
  placeholder?: string;
  options?: FieldOption[];
  crmBindConfig?: CrmBindConfig;
  defaultValue?: any;
  currency?: string;  // for money columns
  selectionMode?: "single" | "multiple"; // for list_select columns
  maxRating?: number; // for rating columns
  listBindConfig?: ListBindConfig; // for list_select columns
  phoneConfig?: {
    countryCodeDisplay?: "name" | "code";
    showFlags?: boolean;
    numberFormat?: string;
  };
  dateConfig?: {
    capture?: "date" | "time" | "both";
    isRange?: boolean;
    dateFormat?: string;
    timeFormat?: "12h" | "24h";
    timezone?: string;
    minDate?: string;
    maxDate?: string;
  };
  numberConfig?: {
    numberMode?: "single" | "range" | "integer";
    min?: number;
    max?: number;
  };
}

export interface DynamicDateDefault {
  mode: "today" | "fixed";
  fixedDate?: string;
  offsetDays?: number;
}

export type FieldDefaultValue =
  | string
  | number
  | boolean
  | string[]
  | DynamicDateDefault
  | Record<string, any>
  | Record<string, any>[];

export function normalizeLegacyColumn(col: any): SubFieldConfig | null {
  if (!col || typeof col !== "object") return null;
  // Ignore objects that have no identifier or descriptive properties at all
  const hasContent = Boolean(
    col.id || col.key || col.colId || col.name || col.label || col.title || col.type || col.inputType
  );
  if (!hasContent) return null;

  const rawType = String(col.inputType || col.type || "text").toLowerCase();
  let inputType: SubFieldInputType = "text";
  if (rawType.includes("num")) inputType = "number";
  else if (rawType.includes("money") || rawType.includes("curr") || rawType.includes("price")) inputType = "money";
  else if (rawType.includes("date_time")) inputType = "date_time";
  else if (rawType.includes("time")) inputType = "time";
  else if (rawType.includes("date")) inputType = "date";
  else if (rawType.includes("select") || rawType.includes("list") || rawType.includes("dropdown")) inputType = "list_select";
  else if (rawType.includes("textarea") || rawType.includes("area") || rawType.includes("long")) inputType = "textarea";
  else if (rawType.includes("rating") || rawType.includes("score")) inputType = "rating";
  else if (rawType.includes("yes") || rawType.includes("bool")) inputType = "yes_no";
  else if (rawType.includes("crm")) inputType = "crm_bind";
  else if (rawType.includes("email")) inputType = "email";
  else if (rawType.includes("tel") || rawType.includes("phone")) inputType = "tel";
  else if (rawType.includes("link") || rawType.includes("url")) inputType = "link";

  return {
    id: col.id || col.key || col.colId || col.name || `col_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: col.name || col.label || col.title || "Column",
    inputType,
    placeholder: col.placeholder || "",
    required: Boolean(col.required),
    options: (col.options && col.options.length > 0)
      ? col.options
      : inputType === "list_select"
      ? [
          { id: 1, label: "Option A", value: "option_a" },
          { id: 2, label: "Option B", value: "option_b" },
          { id: 3, label: "Option C", value: "option_c" },
        ]
      : [],
    crmBindConfig: col.crmBindConfig || (inputType === "crm_bind" ? { sourceModule: "teamMember", displayField: "name", selectionMode: col.selectionMode || "single" } : undefined),
    defaultValue: col.defaultValue,
    currency: col.currency,
    selectionMode: col.selectionMode || "single",
    maxRating: col.maxRating || (inputType === "rating" ? 5 : undefined),
    listBindConfig: col.listBindConfig,
  };
}

export function resolveColumnsOrSubFields(field?: { subFields?: SubFieldConfig[]; tableColumns?: TableColumnConfig[] }): SubFieldConfig[] {
  if (field?.subFields && Array.isArray(field.subFields) && field.subFields.length > 0) {
    return field.subFields.filter((s): s is SubFieldConfig => Boolean(s && typeof s === "object" && (s.id || s.name)));
  }
  if (field?.tableColumns && Array.isArray(field.tableColumns) && field.tableColumns.length > 0) {
    return field.tableColumns
      .map(normalizeLegacyColumn)
      .filter((c): c is SubFieldConfig => c !== null);
  }
  return [];
}

export function getSuggestedPlaceholderForType(type?: string, label?: string): string {
  const t = (type || "").toLowerCase();
  const name = label ? label.toLowerCase() : "";

  if (t === "money" || t.includes("curr") || t.includes("price")) return "e.g. 0.00";
  if (t === "number" || t.includes("num")) return "e.g. 0";
  if (t === "email") return "e.g. name@company.com";
  if (t === "tel" || t === "phone") return "e.g. +1 (555) 000-0000";
  if (t === "link" || t.includes("url")) return "e.g. https://example.com";
  if (t === "date") return "Select date...";
  if (t === "time") return "Select time...";
  if (t === "date_time") return "Select date & time...";
  if (t === "textarea" || t.includes("long") || t === "richtext") return name ? `e.g. Enter ${name} details...` : "e.g. Enter details...";
  if (t === "crm_bind") return "Search and select record...";
  if (t === "select" || t === "list_select" || t === "multiselect" || t === "list") return "Select an option...";
  if (t === "yes_no") return "Select Yes / No";
  if (t === "rating") return "Select rating (1-5)";
  if (t === "signature") return "Sign here...";
  if (t === "file") return "Upload document...";
  return name ? `e.g. Enter ${name}...` : "e.g. Enter value...";
}

export type OptionValueType = "text" | "number" | "date" | "boolean" | "money" | "tel" | "email";
export type ListValueType =
  | "text"
  | "tel"
  | "email"
  | "link"
  | "whatsapp_link"
  | "number"
  | "money"
  | "date_time"
  | "rating"
  | "yes_no"
  | "composite"
  | "crm_bind"
  | "media"
  | "signature"
  | "user";

export interface FieldOption {
  id: number | string;
  label: string;
  value: any;
  valueType?: OptionValueType;
  index?: number;
}

export interface ListFieldConfig {
  valueType?: ListValueType; // Single value type applied to all options in this list
  inheritedFieldKey?: string; // Key of field in this module to inherit formatting/validation from
  allowSearch?: boolean;
  sortOrder?: "alphabetical_asc" | "alphabetical_desc" | "manual" | "recent";
  liveLinkedFieldKey?: string; // Live 2-way sync with another List field in the module
}

export interface ScopingRule {
  id?: string;
  industryCategory?: string;  // Scoped to category e.g. "Healthcare", empty or "All" = global
  industries?: string[];      // Multiple industries e.g. ["Cardiologist", "Dentist"], empty = all in category
  locations?: string[];       // Multiple locations e.g. ["California", "New York"], empty = all
}

export interface FieldPermissions {
  canHide?: boolean;       // Allow users to hide this field
  canEdit?: boolean;       // Allow users to edit this field
  canAdd?: boolean;        // Allow users to add options on top of admin options
  canAddOptions?: boolean; // Alias / backwards compat
  canDelete?: boolean;     // Allow users to delete this field (deleted from user only, not admin)
}

export interface SectionPermissions {
  canHide?: boolean;       // Allow users to hide this section
  canEdit?: boolean;       // Allow users to edit this section
  canAdd?: boolean;        // Allow users to add more fields to this section
  canAddFields?: boolean;  // Alias / backwards compat
  canDelete?: boolean;     // Allow users to delete this section (deleted from user only, not admin)
}

export interface FieldDefinition {
  id: number;               // stable numeric/uuid id
  key: string;               // stable machine key, used in {{key}} variables
  label: string;              // display name
  module: FieldModule;        // which entity this field belongs to
  source: "system" | "custom" | "template";
  createdIn?: "admin" | "client";
  inputType: FieldInputType;
  placeholder?: string;
  validation?: string;
  options?: FieldOption[];    // for select/dropdown/list types
  listConfig?: ListFieldConfig; // Search, sort order, and live 2-way linking
  tableColumns?: TableColumnConfig[]; // for table type (legacy)
  subFields?: SubFieldConfig[];       // canonical sub-fields for table, group, group_repeatable, structured list_open
  crmBindConfig?: CrmBindConfig;      // for crm_bind
  selectionMode?: "single" | "multiple"; // for list_select and crm_bind
  listEntryType?: "plain_text" | "structured"; // for list_open
  listBindConfig?: ListBindConfig;    // for list_select dynamic data source binding
  maxRating?: number;                 // for rating type (default: 5)
  currency?: string;  // for money fields (ISO code e.g. "INR", "USD")
  defaultValue?: FieldDefaultValue;   // type-specific default value
  sectionId?: string;        // assigned section id
  required?: boolean;
  userVisibility?: boolean;   // Setting for user visibility
  showAlways?: boolean;       // legacy — kept for backward compat, do not write for new fields
  /** Record IDs this field is auto-shown on. If empty or undefined, it defaults to showing for all records. */
  visibleToRecordIds?: string[];
  sourceFormId?: number;      // if created via a WebForm field, provenance
  industryCategory?: string;  // Scoped to category e.g. "Healthcare", empty/All = global
  industry?: string;          // Scoped to industry e.g. "Cardiologist", empty/All = global
  locations?: string[];       // Scoped to locations e.g. ["California"], empty/All = global
  tooltip?: string;           // Client-facing help text shown in tooltip on hover next to field name
  textConfig?: {
    textMode?: "short" | "paragraph";
    maxChars?: number;
    richText?: boolean;
  };
  dateConfig?: {
    capture?: "date" | "time" | "both";
    isRange?: boolean;
    dateFormat?: string;
    timeFormat?: "12h" | "24h";
    timezone?: string;
    minDate?: string;
    maxDate?: string;
  };
  compositeDisplayMode?: "table" | "group";
  mediaConfig?: {
    mediaType?: "image" | "document" | "audio";
    acceptedFormats?: string[];
    maxFileSizeMB?: number;
    allowMultiple?: boolean;
    maxFiles?: number;
  };
  numberConfig?: {
    numberMode?: "single" | "range" | "integer";
    min?: number;
    max?: number;
  };
  phoneConfig?: {
    countryCodeDisplay?: "name" | "code";
    showFlags?: boolean;
    numberFormat?: string;
  };
  scopingRules?: ScopingRule[]; // Multi-rule scoping: industry categories, industries, and locations
  processIds?: string[];      // Assigned process template IDs (for module="process")
  requiredStages?: string[];  // Specific stage names/IDs this field is required for (for module="process" when required=true)
  isReusable?: boolean;        // Reusable across other modules (global field)
  reusableModules?: FieldModule[]; // Modules this field is shared with (empty/undefined = all modules)
  permissions?: FieldPermissions;  // Tenant admin control & permissions
  createdAt: number;
}

export interface SectionDefinition {
  id: string;
  title: string;
  description?: string;
  module: FieldModule;
  source: "system" | "custom" | "template";
  createdIn?: "admin" | "client";
  iconName?: "user" | "briefcase" | "workflow" | "layers" | "file-text" | "settings" | "sparkles" | "shield" | "tag" | "table" | "list" | "calendar" | "phone";
  fieldKeys: string[];
  required?: boolean;         // Required section
  requiredStages?: string[];  // Specific stage names/IDs this section is required for (for module="process" when required=true)
  userVisibility?: boolean;   // Setting for user visibility
  industryCategory?: string;  // Scoped to category e.g. "Healthcare", empty/All = global
  industry?: string;          // Scoped to industry e.g. "Cardiologist", empty/All = global
  locations?: string[];       // Scoped to locations e.g. ["California"], empty/All = global
  scopingRules?: ScopingRule[]; // Multi-rule scoping: industry categories, industries, and locations
  processIds?: string[];      // Assigned process template IDs (for module="process")
  isReusable?: boolean;        // Reusable across other modules (global section)
  reusableModules?: FieldModule[]; // Modules this section is shared with (empty/undefined = all modules)
  permissions?: SectionPermissions; // Tenant admin control & permissions
  createdAt: number;
}

export interface OrgScopeFilter {
  industryCategory?: string;
  industry?: string;
  locations?: string[];
  location?: string;
}

export const FIELD_REGISTRY_STORAGE_KEY = "mantra_field_registry_v1";
export const SECTION_REGISTRY_STORAGE_KEY = "mantra_section_registry_v1";

export const FIELD_REGISTRY_EVENT = "mantra_field_registry_updated";
export const SECTION_REGISTRY_EVENT = "mantra_section_registry_updated";
export const LEGACY_SECTION_REGISTRY_EVENT = "SECTION_REGISTRY_CHANGED";

/**
 * Check whether a field definition matches an organization's scoping attributes.
 * System fields are always global and match all organizations.
 */
const SYSTEM_FIELD_KEYS = new Set([
  "name", "email", "phone", "location", "country",
  "company", "role", "status", "processes", "stage",
  "responsible", "lastContact", "companyName", "jobPosition"
]);

const SYSTEM_SECTION_IDS = new Set([
  "sec-client-details",
  "sec-general-info",
  "sec-company-details",
  "sec-company-role",
  "sec-process-pipeline",
]);

/**
 * Robustly matches an array of assigned process IDs/names against a target process ID or name.
 * Handles bidirectional resolution using stored processes (e.g. template ID 'proc-123' <-> name 'Cardiology').
 */
export function isProcessMatchingAssignment(
  assignedProcessIds?: string[],
  targetProcessIdentifier?: string
): boolean {
  if (!assignedProcessIds || assignedProcessIds.length === 0 || assignedProcessIds.includes("all")) {
    return true;
  }
  if (!targetProcessIdentifier) return true;

  const targetClean = targetProcessIdentifier.trim().toLowerCase();
  if (targetClean === "all" || targetClean === "*") return true;

  // 1. Direct match with ID or Name
  if (
    assignedProcessIds.some(
      (id) => id.trim().toLowerCase() === targetClean || id.trim().toLowerCase() === "all"
    )
  ) {
    return true;
  }

  // 2. Lookup in stored processes to resolve ID <-> Name bidirectionally
  let stored: { id: string; name: string }[] = [];
  try {
    stored = getStoredProcesses();
  } catch {}

  const targetProc = stored.find(
    (p) => p.id.trim().toLowerCase() === targetClean || p.name.trim().toLowerCase() === targetClean
  );

  for (const assignedId of assignedProcessIds) {
    const cleanAssigned = assignedId.trim().toLowerCase();
    if (cleanAssigned === "all") return true;
    if (cleanAssigned === targetClean) return true;

    if (targetProc) {
      if (
        targetProc.id.trim().toLowerCase() === cleanAssigned ||
        targetProc.name.trim().toLowerCase() === cleanAssigned
      ) {
        return true;
      }
    }

    const assignedProc = stored.find(
      (p) => p.id.trim().toLowerCase() === cleanAssigned || p.name.trim().toLowerCase() === cleanAssigned
    );
    if (assignedProc) {
      if (
        assignedProc.id.trim().toLowerCase() === targetClean ||
        assignedProc.name.trim().toLowerCase() === targetClean
      ) {
        return true;
      }
    }
  }

  return false;
}

export function isFieldMatchingOrg(
  field: FieldDefinition | { id?: number; key?: string; source?: string; scopingRules?: any[]; industryCategory?: string; industry?: string; locations?: string[]; processIds?: string[]; module?: string },
  org?: OrgScopeFilter | null,
  processId?: string
): boolean {
  if (!field) return true;
  if (field.source === "system" || (field.id !== undefined && field.id < 0) || (field.key && SYSTEM_FIELD_KEYS.has(field.key))) return true;

  // If specific processId is evaluated and field is assigned to specific processes
  if (processId && field.processIds && field.processIds.length > 0) {
    if (!isProcessMatchingAssignment(field.processIds, processId)) return false;
  }

  // If multi-rule scoping is present, check against rules
  if (field.scopingRules && field.scopingRules.length > 0) {
    return field.scopingRules.some((rule) => {
      const rCat = rule.industryCategory?.trim();
      const rInds = (rule.industries || []).map((i) => i.trim()).filter((i) => i && i !== "All" && i !== "*");
      const rLocs = (rule.locations || []).map((l) => l.trim()).filter((l) => l && l !== "All" && l !== "*");

      const hasCat = Boolean(rCat && rCat !== "All" && rCat !== "*");
      const hasInd = rInds.length > 0;
      const hasLoc = rLocs.length > 0;

      // If this rule is completely unconstrained, it matches everything
      if (!hasCat && !hasInd && !hasLoc) return true;
      if (!org) return false;

      if (hasCat) {
        if (!org.industryCategory) return false;
        if (org.industryCategory.trim().toLowerCase() !== rCat!.toLowerCase()) {
          return false;
        }
      }

      if (hasInd) {
        if (!org.industry) return false;
        const match = rInds.some((i) => i.toLowerCase() === org.industry!.trim().toLowerCase());
        if (!match) return false;
      }

      if (hasLoc) {
        const orgLocs = [
          ...(org.locations || []),
          ...(org.location ? [org.location] : []),
        ].map((l) => l.trim().toLowerCase());

        if (orgLocs.length === 0) return false;
        const match = rLocs.some((fl) => orgLocs.includes(fl.toLowerCase()));
        if (!match) return false;
      }

      return true;
    });
  }

  const fCat = field.industryCategory?.trim();
  const fInd = field.industry?.trim();
  const fLocs = (field.locations || []).map((l) => l.trim()).filter((l) => l && l !== "All" && l !== "*");

  const hasCat = Boolean(fCat && fCat !== "All" && fCat !== "*");
  const hasInd = Boolean(fInd && fInd !== "All" && fInd !== "*");
  const hasLoc = fLocs.length > 0;

  // If no scoping rules set on field, it is universally visible
  if (!hasCat && !hasInd && !hasLoc) return true;

  // If scoped but no org context provided, do not show
  if (!org) return false;

  // Check Category
  if (hasCat) {
    if (!org.industryCategory) return false;
    if (org.industryCategory.trim().toLowerCase() !== fCat!.toLowerCase()) {
      return false;
    }
  }

  // Check Industry
  if (hasInd) {
    if (!org.industry) return false;
    if (org.industry.trim().toLowerCase() !== fInd!.toLowerCase()) {
      return false;
    }
  }

  // Check Locations
  if (hasLoc) {
    const orgLocs = [
      ...(org.locations || []),
      ...(org.location ? [org.location] : []),
    ].map((l) => l.trim().toLowerCase());

    if (orgLocs.length === 0) return false;
    const match = fLocs.some((fl) => orgLocs.includes(fl.toLowerCase()));
    if (!match) return false;
  }

  return true;
}

/**
 * Check whether a section definition matches an organization's scoping attributes.
 * System sections are always global and match all organizations.
 */
export function isSectionMatchingOrg(
  section: SectionDefinition | { id: string; isCustom?: boolean; source?: string; scopingRules?: any[]; industryCategory?: string; industry?: string; locations?: string[]; processIds?: string[]; module?: string },
  org?: OrgScopeFilter | null,
  processId?: string
): boolean {
  if (!section) return true;
  if (section.source === "system" || (section as any).isCustom === false || SYSTEM_SECTION_IDS.has(section.id)) return true;

  // If specific processId is evaluated and section is assigned to specific processes
  if (processId && section.processIds && section.processIds.length > 0) {
    if (!isProcessMatchingAssignment(section.processIds, processId)) return false;
  }

  // If multi-rule scoping is present, check against rules
  if (section.scopingRules && section.scopingRules.length > 0) {
    return section.scopingRules.some((rule) => {
      const rCat = rule.industryCategory?.trim();
      const rInds = (rule.industries || []).map((i) => i.trim()).filter((i) => i && i !== "All" && i !== "*");
      const rLocs = (rule.locations || []).map((l) => l.trim()).filter((l) => l && l !== "All" && l !== "*");

      const hasCat = Boolean(rCat && rCat !== "All" && rCat !== "*");
      const hasInd = rInds.length > 0;
      const hasLoc = rLocs.length > 0;

      if (!hasCat && !hasInd && !hasLoc) return true;
      if (!org) return false;

      if (hasCat) {
        if (!org.industryCategory) return false;
        if (org.industryCategory.trim().toLowerCase() !== rCat!.toLowerCase()) {
          return false;
        }
      }

      if (hasInd) {
        if (!org.industry) return false;
        const match = rInds.some((i) => i.toLowerCase() === org.industry!.trim().toLowerCase());
        if (!match) return false;
      }

      if (hasLoc) {
        const orgLocs = [
          ...(org.locations || []),
          ...(org.location ? [org.location] : []),
        ].map((l) => l.trim().toLowerCase());

        if (orgLocs.length === 0) return false;
        const match = rLocs.some((sl) => orgLocs.includes(sl.toLowerCase()));
        if (!match) return false;
      }

      return true;
    });
  }

  const sCat = section.industryCategory?.trim();
  const sInd = section.industry?.trim();
  const sLocs = (section.locations || []).map((l) => l.trim()).filter((l) => l && l !== "All" && l !== "*");

  const hasCat = Boolean(sCat && sCat !== "All" && sCat !== "*");
  const hasInd = Boolean(sInd && sInd !== "All" && sInd !== "*");
  const hasLoc = sLocs.length > 0;

  if (!hasCat && !hasInd && !hasLoc) return true;
  if (!org) return false;

  if (hasCat) {
    if (!org.industryCategory) return false;
    if (org.industryCategory.trim().toLowerCase() !== sCat!.toLowerCase()) {
      return false;
    }
  }

  if (hasInd) {
    if (!org.industry) return false;
    if (org.industry.trim().toLowerCase() !== sInd!.toLowerCase()) {
      return false;
    }
  }

  if (hasLoc) {
    const orgLocs = [
      ...(org.locations || []),
      ...(org.location ? [org.location] : []),
    ].map((l) => l.trim().toLowerCase());

    if (orgLocs.length === 0) return false;
    const match = sLocs.some((sl) => orgLocs.includes(sl.toLowerCase()));
    if (!match) return false;
  }

  return true;
}

/**
 * Resolve the effective auto-display visibility of a field.
 * - If visibleToRecordIds has one or more IDs, visibility is "specific".
 * - Otherwise, it is "all" (auto-shows on every record).
 */
export function resolveVisibility(f: FieldDefinition): "none" | "all" | "specific" {
  if (f.visibleToRecordIds && f.visibleToRecordIds.length > 0) {
    return "specific";
  }
  return "all";
}


export const INITIAL_SCRIBE_CUSTOM_FIELDS: FieldDefinition[] = [
  // ── 1. Patient Information ────────────────────────────────
  {
    id: 901,
    key: "patient_name",
    label: "Patient Name",
    module: "scribe",
    source: "custom",
    inputType: "text",
    placeholder: "e.g. Rahul Sharma",
    required: true,
    showAlways: true,
    createdAt: 1700000000001,
  },
  {
    id: 902,
    key: "patient_age_sex",
    label: "Age / Sex",
    module: "scribe",
    source: "custom",
    inputType: "text",
    placeholder: "e.g. 32 years / Male",
    required: true,
    showAlways: true,
    createdAt: 1700000000002,
  },
  {
    id: 903,
    key: "consultation_date",
    label: "Consultation Date",
    module: "scribe",
    source: "custom",
    inputType: "text",
    placeholder: "e.g. 24 August 2026",
    required: true,
    showAlways: true,
    createdAt: 1700000000003,
  },
  {
    id: 904,
    key: "patient_id",
    label: "Patient ID",
    module: "scribe",
    source: "custom",
    inputType: "text",
    placeholder: "e.g. PT-10245",
    required: false,
    showAlways: true,
    createdAt: 1700000000004,
  },

  // ── 2. Chief Complaint ────────────────────────────────────
  {
    id: 905,
    key: "symptoms",
    label: "Symptoms / Complaints",
    module: "scribe",
    source: "custom",
    inputType: "multiselect",
    placeholder: "Add symptoms (e.g. Fever, Sore throat, Dry cough)",
    required: true,
    showAlways: true,
    createdAt: 1700000000005,
  },
  {
    id: 906,
    key: "complaint_duration",
    label: "Duration of Symptoms",
    module: "scribe",
    source: "custom",
    inputType: "select",
    placeholder: "Select duration",
    options: [
      { id: 1, label: "Symptoms for 1–2 days", value: "Symptoms for 1–2 days" },
      { id: 2, label: "Symptoms for 3 days", value: "Symptoms for 3 days" },
      { id: 3, label: "Symptoms for 5–7 days", value: "Symptoms for 5–7 days" },
      { id: 4, label: "Symptoms for 2 weeks", value: "Symptoms for 2 weeks" },
      { id: 5, label: "Symptoms for 1 month", value: "Symptoms for 1 month" },
      { id: 6, label: "Chronic (> 3 months)", value: "Chronic (> 3 months)" },
    ],
    required: false,
    showAlways: true,
    createdAt: 1700000000006,
  },

  // ── 3. Diagnosis ──────────────────────────────────────────
  {
    id: 907,
    key: "primary_diagnosis",
    label: "Primary Diagnosis",
    module: "scribe",
    source: "custom",
    inputType: "select",
    placeholder: "Select or enter primary diagnosis",
    options: [
      { id: 1, label: "Acute upper respiratory tract infection", value: "Acute upper respiratory tract infection" },
      { id: 2, label: "Acute gastritis", value: "Acute gastritis" },
      { id: 3, label: "Viral fever / Influenza", value: "Viral fever / Influenza" },
      { id: 4, label: "Type 2 diabetes mellitus", value: "Type 2 diabetes mellitus" },
      { id: 5, label: "Essential hypertension", value: "Essential hypertension" },
      { id: 6, label: "Age-related nuclear cataract", value: "Age-related nuclear cataract" },
    ],
    required: true,
    showAlways: true,
    createdAt: 1700000000007,
  },
  {
    id: 908,
    key: "icd_code",
    label: "ICD-10 Code",
    module: "scribe",
    source: "custom",
    inputType: "select",
    placeholder: "Select ICD-10 code",
    options: [
      { id: 1, label: "J06.9 - Acute upper respiratory infection, unspecified", value: "J06.9" },
      { id: 2, label: "K29.0 - Acute gastritis without bleeding", value: "K29.0" },
      { id: 3, label: "B34.9 - Viral infection, unspecified", value: "B34.9" },
      { id: 4, label: "E11.9 - Type 2 diabetes mellitus without complications", value: "E11.9" },
      { id: 5, label: "I10 - Essential (primary) hypertension", value: "I10" },
      { id: 6, label: "H25.10 - Age-related nuclear cataract", value: "H25.10" },
    ],
    required: false,
    showAlways: true,
    createdAt: 1700000000008,
  },
  {
    id: 909,
    key: "diagnosis_type",
    label: "Diagnosis Type / Status",
    module: "scribe",
    source: "custom",
    inputType: "select",
    placeholder: "Select type",
    options: [
      { id: 1, label: "Acute", value: "Acute" },
      { id: 2, label: "Chronic", value: "Chronic" },
      { id: 3, label: "Provisional diagnosis", value: "Provisional diagnosis" },
      { id: 4, label: "Differential diagnosis", value: "Differential diagnosis" },
    ],
    required: true,
    showAlways: true,
    createdAt: 1700000000009,
  },
  {
    id: 910,
    key: "clinical_findings",
    label: "Clinical Findings / Examination",
    module: "scribe",
    source: "custom",
    inputType: "textarea",
    placeholder: "e.g. Mild fever, congested throat, no breathing difficulty, chest clear",
    required: false,
    showAlways: true,
    createdAt: 1700000000010,
  },

  // ── 4. Medication Common Fields ──────────────────────────
  {
    id: 911,
    key: "med_name",
    label: "Medicine Name",
    module: "scribe",
    source: "custom",
    inputType: "text",
    placeholder: "e.g. Paracetamol, Cetirizine",
    required: true,
    showAlways: true,
    createdAt: 1700000000011,
  },
  {
    id: 912,
    key: "med_strength",
    label: "Strength",
    module: "scribe",
    source: "custom",
    inputType: "text",
    placeholder: "e.g. 500 mg, 10 mg",
    required: false,
    showAlways: true,
    createdAt: 1700000000012,
  },
  {
    id: 913,
    key: "med_form",
    label: "Form",
    module: "scribe",
    source: "custom",
    inputType: "select",
    placeholder: "Select form",
    options: [
      { id: 1, label: "Tablet", value: "Tablet" },
      { id: 2, label: "Syrup", value: "Syrup" },
      { id: 3, label: "Capsule", value: "Capsule" },
      { id: 4, label: "Eye Drops", value: "Eye Drops" },
      { id: 5, label: "Ointment / Gel", value: "Ointment" },
      { id: 6, label: "Injection", value: "Injection" },
      { id: 7, label: "Inhalation", value: "Inhalation" },
    ],
    required: false,
    showAlways: true,
    createdAt: 1700000000013,
  },
  {
    id: 914,
    key: "med_dosage",
    label: "Dosage",
    module: "scribe",
    source: "custom",
    inputType: "text",
    placeholder: "e.g. 1 tablet, 5 mL",
    required: false,
    showAlways: true,
    createdAt: 1700000000014,
  },
  {
    id: 915,
    key: "med_frequency",
    label: "Frequency",
    module: "scribe",
    source: "custom",
    inputType: "select",
    placeholder: "Select frequency",
    options: [
      { id: 1, label: "Once daily (OD)", value: "Once daily" },
      { id: 2, label: "Twice daily (BD)", value: "Twice daily" },
      { id: 3, label: "3 times/day (TDS)", value: "3 times/day" },
      { id: 4, label: "4 times/day (QID)", value: "4 times/day" },
      { id: 5, label: "Up to 3 times/day as needed (SOS)", value: "Up to 3 times/day as needed" },
      { id: 6, label: "At bedtime (HS)", value: "At bedtime (HS)" },
    ],
    required: false,
    showAlways: true,
    createdAt: 1700000000015,
  },
  {
    id: 916,
    key: "med_duration",
    label: "Course / Duration",
    module: "scribe",
    source: "custom",
    inputType: "text",
    placeholder: "e.g. 3 days, 5 days",
    required: false,
    showAlways: true,
    createdAt: 1700000000016,
  },
  {
    id: 917,
    key: "med_route",
    label: "Route",
    module: "scribe",
    source: "custom",
    inputType: "select",
    placeholder: "Select route",
    options: [
      { id: 1, label: "Oral (PO)", value: "Oral" },
      { id: 2, label: "Topical", value: "Topical" },
      { id: 3, label: "Eye Drop", value: "Eye Drop" },
      { id: 4, label: "Inhalation", value: "Inhalation" },
      { id: 5, label: "Intravenous (IV)", value: "Intravenous" },
      { id: 6, label: "Intramuscular (IM)", value: "Intramuscular" },
    ],
    required: false,
    showAlways: true,
    createdAt: 1700000000017,
  },

  // ── 5. Instructions ───────────────────────────────────────
  {
    id: 918,
    key: "patient_instructions",
    label: "Patient Instructions",
    module: "scribe",
    source: "custom",
    inputType: "multiselect",
    placeholder: "+ Type instruction and press Enter...",
    required: false,
    showAlways: true,
    createdAt: 1700000000018,
  },

  // ── 6. Precautions ────────────────────────────────────────
  {
    id: 919,
    key: "patient_precautions",
    label: "Precautions & Warnings",
    module: "scribe",
    source: "custom",
    inputType: "multiselect",
    placeholder: "+ Type precaution and press Enter...",
    required: false,
    showAlways: true,
    createdAt: 1700000000019,
  },

  // ── 7. Prognosis ──────────────────────────────────────────
  {
    id: 920,
    key: "prognosis_status",
    label: "Prognosis",
    module: "scribe",
    source: "custom",
    inputType: "select",
    placeholder: "Select prognosis",
    options: [
      { id: 1, label: "Good", value: "Good" },
      { id: 2, label: "Fair", value: "Fair" },
      { id: 3, label: "Guarded", value: "Guarded" },
      { id: 4, label: "Poor", value: "Poor" },
    ],
    required: true,
    showAlways: true,
    createdAt: 1700000000020,
  },
  {
    id: 921,
    key: "expected_course",
    label: "Expected Course / Recovery",
    module: "scribe",
    source: "custom",
    inputType: "select",
    placeholder: "Select recovery course",
    options: [
      { id: 1, label: "Symptoms expected to improve within 5–7 days.", value: "Symptoms expected to improve within 5–7 days." },
      { id: 2, label: "Expected resolution within 2–3 days with rest.", value: "Expected resolution within 2–3 days with rest." },
      { id: 3, label: "Gradual improvement over 2–4 weeks.", value: "Gradual improvement over 2–4 weeks." },
      { id: 4, label: "Chronic management required.", value: "Chronic management required." },
    ],
    required: false,
    showAlways: true,
    createdAt: 1700000000021,
  },
  {
    id: 922,
    key: "complication_risk",
    label: "Complication Risk",
    module: "scribe",
    source: "custom",
    inputType: "select",
    placeholder: "Select risk level",
    options: [
      { id: 1, label: "Low", value: "Low" },
      { id: 2, label: "Moderate", value: "Moderate" },
      { id: 3, label: "High", value: "High" },
    ],
    required: false,
    showAlways: true,
    createdAt: 1700000000022,
  },

  // ── 8. Follow-up ──────────────────────────────────────────
  {
    id: 923,
    key: "follow_up_review",
    label: "Review Timeline",
    module: "scribe",
    source: "custom",
    inputType: "select",
    placeholder: "Select follow-up schedule",
    options: [
      { id: 1, label: "Review after: 5–7 days or earlier if symptoms worsen.", value: "Review after: 5–7 days or earlier if symptoms worsen." },
      { id: 2, label: "Review after: 3 days if fever persists.", value: "Review after: 3 days if fever persists." },
      { id: 3, label: "Review after: 14 days (2 weeks).", value: "Review after: 14 days (2 weeks)." },
      { id: 4, label: "Review after: 1 month.", value: "Review after: 1 month." },
      { id: 5, label: "SOS / Only if symptoms recur.", value: "SOS / Only if symptoms recur." },
    ],
    required: true,
    showAlways: true,
    createdAt: 1700000000023,
  },
  {
    id: 924,
    key: "follow_up_criteria",
    label: "Follow-up Conditions",
    module: "scribe",
    source: "custom",
    inputType: "text",
    placeholder: "e.g. If symptoms worsen or do not improve within 5 days",
    required: false,
    showAlways: true,
    createdAt: 1700000000024,
  },

  // ── 9. Doctor Information ─────────────────────────────────
  {
    id: 925,
    key: "doctor_name",
    label: "Doctor Name",
    module: "scribe",
    source: "custom",
    inputType: "text",
    placeholder: "e.g. Dr. Ankit Mehra",
    required: true,
    showAlways: true,
    createdAt: 1700000000025,
  },
  {
    id: 926,
    key: "doctor_qualification",
    label: "Qualification",
    module: "scribe",
    source: "custom",
    inputType: "text",
    placeholder: "e.g. MBBS, MD",
    required: false,
    showAlways: true,
    createdAt: 1700000000026,
  },
  {
    id: 927,
    key: "registration_no",
    label: "Registration No.",
    module: "scribe",
    source: "custom",
    inputType: "text",
    placeholder: "e.g. MCI-482910",
    required: false,
    showAlways: true,
    createdAt: 1700000000027,
  },
  {
    id: 928,
    key: "doctor_signature_date",
    label: "Signature Date",
    module: "scribe",
    source: "custom",
    inputType: "text",
    placeholder: "e.g. 24 August 2026",
    required: false,
    showAlways: true,
    createdAt: 1700000000028,
  },
];

export const SYSTEM_SEEDS: Record<Exclude<FieldModule, "deal">, Omit<FieldDefinition, "id" | "source" | "createdAt">[]> = {
  client: [
    { key: "name", label: "Name", module: "client", inputType: "text", placeholder: "Full name", showAlways: true },
    {
      key: "status", label: "Status", module: "client", inputType: "select", placeholder: "Select status", showAlways: true,
      options: [
        { id: 1, label: "Active", value: "active" },
        { id: 2, label: "Inactive", value: "inactive" },
        { id: 3, label: "Pending", value: "pending" },
      ]
    },
    {
      key: "processes", label: "Processes", module: "client", inputType: "select", placeholder: "Assign process", showAlways: true,
      options: [
        { id: 1, label: "Patient Intake", value: "Patient Intake" },
        { id: 2, label: "Follow-up Calls", value: "Follow-up Calls" },
        { id: 3, label: "Billing Support", value: "Billing Support" },
        { id: 4, label: "Appointment Scheduling", value: "Appointment Scheduling" },
        { id: 5, label: "Insurance Verification", value: "Insurance Verification" },
      ]
    },
    { key: "email", label: "Email", module: "client", inputType: "email", placeholder: "email@example.com", validation: "email", showAlways: true },
    { key: "phone", label: "Phone", module: "client", inputType: "tel", placeholder: "+1 (555) 000-0000", validation: "phone", showAlways: true },
    { key: "location", label: "Location", module: "client", inputType: "text", placeholder: "City, State or Address", showAlways: true },
    { key: "company", label: "Company", module: "client", inputType: "text", placeholder: "Company name", showAlways: true },
    { key: "role", label: "Role", module: "client", inputType: "text", placeholder: "Job title or role", showAlways: true },
    { key: "language", label: "Language", module: "client", inputType: "text", placeholder: "e.g. English", showAlways: true },
    { key: "country", label: "Country", module: "client", inputType: "text", placeholder: "e.g. United States", showAlways: true },
    { key: "responsible", label: "Responsible Person", module: "client", inputType: "select", placeholder: "Unassigned", showAlways: true },
  ],
  process: [
    { key: "process_name", label: "Process Name", module: "process", inputType: "text", placeholder: "Process name", showAlways: true },
    { key: "stage", label: "Stage", module: "process", inputType: "text", placeholder: "Stage", showAlways: true },
    { key: "responsible", label: "Responsible Person", module: "process", inputType: "select", placeholder: "Unassigned", showAlways: true },
  ],
  appointment: [
    { key: "appointment_date", label: "Appointment Date", module: "appointment", inputType: "date", showAlways: true },
    { key: "appointment_time", label: "Appointment Time", module: "appointment", inputType: "text", placeholder: "HH:MM", showAlways: true },
    {
      key: "appointment_type", label: "Appointment Type", module: "appointment", inputType: "select", placeholder: "Select type", showAlways: true,
      options: [
        { id: 1, label: "Video Call", value: "video" },
        { id: 2, label: "In-Person", value: "in-person" },
      ]
    },
    {
      key: "status", label: "Status", module: "appointment", inputType: "select", placeholder: "Select status", showAlways: true,
      options: [
        { id: 1, label: "Scheduled", value: "scheduled" },
        { id: 2, label: "Completed", value: "completed" },
        { id: 3, label: "Cancelled", value: "cancelled" },
        { id: 4, label: "No-Show", value: "no-show" },
        { id: 5, label: "Pending Accept", value: "pending-accept" },
      ]
    },
    { key: "provider", label: "Provider", module: "appointment", inputType: "select", placeholder: "Unassigned", showAlways: true },
  ],
  call: [
    { key: "status", label: "Call Status", module: "call", inputType: "text", placeholder: "Completed/Missed", showAlways: true },
    { key: "duration", label: "Duration", module: "call", inputType: "text", placeholder: "Duration", showAlways: true },
    { key: "call_sentiment", label: "Sentiment", module: "call", inputType: "text", placeholder: "Sentiment", showAlways: true },
    { key: "responsible", label: "Responsible Person", module: "call", inputType: "select", placeholder: "Unassigned", showAlways: true },
  ],
  service: [
    { key: "service_name", label: "Service Name", module: "service", inputType: "text", placeholder: "Service name", showAlways: true },
    { key: "price", label: "Price", module: "service", inputType: "number", placeholder: "Price", showAlways: true },
  ],
  organization: [
    { key: "org_name", label: "Organization Name", module: "organization", inputType: "text", placeholder: "Org Name", showAlways: true },
    { key: "industry", label: "Industry", module: "organization", inputType: "text", placeholder: "Industry", showAlways: true },
  ],
  teamMember: [
    { key: "name", label: "Name", module: "teamMember", inputType: "text", placeholder: "Full name", showAlways: true },
    { key: "status", label: "Status", module: "teamMember", inputType: "text", placeholder: "Active / Inactive", showAlways: true },
    { key: "email", label: "Email", module: "teamMember", inputType: "email", placeholder: "email@example.com", validation: "email", showAlways: true },
    { key: "phone", label: "Phone", module: "teamMember", inputType: "tel", placeholder: "+1 (555) 000-0000", validation: "phone", showAlways: true },
    { key: "location", label: "Location", module: "teamMember", inputType: "text", placeholder: "Location", showAlways: true },
    { key: "company", label: "Company", module: "teamMember", inputType: "text", placeholder: "Company name", showAlways: true },
    { key: "role", label: "Role", module: "teamMember", inputType: "text", placeholder: "Job title or role", showAlways: true },
    { key: "company_size", label: "Company Size", module: "teamMember", inputType: "text", placeholder: "10-50", showAlways: true },
    { key: "process", label: "Process", module: "teamMember", inputType: "text", placeholder: "Process", showAlways: true },
    { key: "gender", label: "Gender", module: "teamMember", inputType: "text", placeholder: "Gender", showAlways: true },
    { key: "date_of_birth", label: "Date of Birth", module: "teamMember", inputType: "date", placeholder: "DOB", showAlways: true },
    { key: "language", label: "Language", module: "teamMember", inputType: "text", placeholder: "Language", showAlways: true },
    { key: "country", label: "Country", module: "teamMember", inputType: "text", placeholder: "Country", showAlways: true },
    { key: "timezone", label: "Timezone", module: "teamMember", inputType: "text", placeholder: "Timezone", showAlways: true },
    { key: "assigned_service", label: "Assigned Service", module: "teamMember", inputType: "text", placeholder: "Assigned service", showAlways: true },
    { key: "next_available_slot", label: "Next Available Slot", module: "teamMember", inputType: "text", placeholder: "Next slot", showAlways: true },
  ],
  scribe: [
    { key: "session_notes", label: "Session Clinical Notes", module: "scribe", inputType: "textarea", placeholder: "Clinical dialogue notes", showAlways: true },
  ],
};

export function getLiveTeamMembers() {
  const list = new Set<string>();
  
  // Try loading from settings_allUsers
  try {
    const raw = sessionStorage.getItem("settings_allUsers");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((u: any) => {
          if (u.name) list.add(u.name);
        });
      }
    }
  } catch {}

  // Try loading from userManagement_users
  try {
    const raw = sessionStorage.getItem("userManagement_users");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((u: any) => {
          if (u.name) list.add(u.name);
        });
      }
    }
  } catch {}

  // Fallbacks
  const fallbacks = [
    "John Smith",
    "Sarah Johnson",
    "Emily Davis",
    "Dr. Robert Martinez",
    "Lisa Anderson",
    "Admin User",
    "Sarah Manager",
    "John Agent"
  ];
  fallbacks.forEach(name => list.add(name));

  return Array.from(list).map((name, idx) => ({
    id: idx + 1,
    label: name,
    value: name
  }));
}

export const SYSTEM_SECTIONS: Record<Exclude<FieldModule, "deal">, SectionDefinition[]> = {
  client: [
    {
      id: "sec-general-info",
      title: "General Information",
      description: "Basic client identity and contact information",
      module: "client",
      source: "system",
      iconName: "user",
      fieldKeys: ["name", "email", "phone", "location", "country"],
      createdAt: 0,
    },
    {
      id: "sec-company-role",
      title: "Company & Role",
      description: "Organization details and job position",
      module: "client",
      source: "system",
      iconName: "briefcase",
      fieldKeys: ["company", "role"],
      createdAt: 0,
    },
    {
      id: "sec-process-pipeline",
      title: "Processes & Pipeline",
      description: "Assigned processes and workflow state",
      module: "client",
      source: "system",
      iconName: "workflow",
      fieldKeys: ["status", "processes"],
      createdAt: 0,
    },
    {
      id: "sec-custom-fields",
      title: "Custom Fields",
      description: "User-defined custom client properties",
      module: "client",
      source: "system",
      iconName: "file-text",
      fieldKeys: [],
      createdAt: 0,
    },
  ],
  process: [
    {
      id: "sec-process-info",
      title: "Process Information",
      description: "Core workflow metadata and priority",
      module: "process",
      source: "system",
      iconName: "workflow",
      fieldKeys: ["title", "type", "priority", "responsible"],
      createdAt: 0,
    },
    {
      id: "sec-timeline",
      title: "Timeline & Deadlines",
      description: "Creation dates and deadline tracking",
      module: "process",
      source: "system",
      iconName: "calendar",
      fieldKeys: ["createdDate", "deadline"],
      createdAt: 0,
    },
    {
      id: "sec-process-custom",
      title: "Custom Parameters",
      description: "Custom parameters and step attributes",
      module: "process",
      source: "system",
      iconName: "layers",
      fieldKeys: [],
      createdAt: 0,
    },
  ],
  appointment: [
    {
      id: "sec-appt-details",
      title: "Appointment Details",
      description: "Date, time, duration, and assigned provider",
      module: "appointment",
      source: "system",
      iconName: "calendar",
      fieldKeys: ["appointmentDate", "appointmentTime", "service", "provider"],
      createdAt: 0,
    },
    {
      id: "sec-appt-client",
      title: "Client Information",
      description: "Client contact details and notes",
      module: "appointment",
      source: "system",
      iconName: "user",
      fieldKeys: ["clientName", "email", "phone"],
      createdAt: 0,
    },
    {
      id: "sec-appt-custom",
      title: "Custom Fields",
      description: "Additional appointment custom attributes",
      module: "appointment",
      source: "system",
      iconName: "file-text",
      fieldKeys: [],
      createdAt: 0,
    },
  ],
  call: [
    {
      id: "sec-call-meta",
      title: "Call Metadata",
      description: "Caller number, duration, direction, and agent",
      module: "call",
      source: "system",
      iconName: "phone",
      fieldKeys: ["callerName", "phoneNumber", "duration", "status"],
      createdAt: 0,
    },
    {
      id: "sec-call-outcome",
      title: "Outcome & Analysis",
      description: "Call sentiment, recording, and summary",
      module: "call",
      source: "system",
      iconName: "sparkles",
      fieldKeys: ["sentiment", "recording", "notes"],
      createdAt: 0,
    },
    {
      id: "sec-call-custom",
      title: "Custom Fields",
      description: "Additional call custom properties",
      module: "call",
      source: "system",
      iconName: "layers",
      fieldKeys: [],
      createdAt: 0,
    },
  ],
  service: [
    {
      id: "sec-service-info",
      title: "Service Details",
      description: "Service name, category, and description",
      module: "service",
      source: "system",
      iconName: "tag",
      fieldKeys: ["name", "category", "price", "duration"],
      createdAt: 0,
    },
    {
      id: "sec-service-custom",
      title: "Custom Fields",
      description: "Additional service attributes",
      module: "service",
      source: "system",
      iconName: "layers",
      fieldKeys: [],
      createdAt: 0,
    },
  ],
  organization: [
    {
      id: "sec-org-info",
      title: "Organization Info",
      description: "Company name, industry, and address",
      module: "organization",
      source: "system",
      iconName: "briefcase",
      fieldKeys: ["name", "industry", "email", "phone"],
      createdAt: 0,
    },
    {
      id: "sec-org-custom",
      title: "Custom Fields",
      description: "Custom organization properties",
      module: "organization",
      source: "system",
      iconName: "layers",
      fieldKeys: [],
      createdAt: 0,
    },
  ],
  teamMember: [
    {
      id: "sec-team-info",
      title: "Member Profile",
      description: "Full name, email, role, and department",
      module: "teamMember",
      source: "system",
      iconName: "user",
      fieldKeys: ["fullName", "email", "phone", "role"],
      createdAt: 0,
    },
    {
      id: "sec-team-avail",
      title: "Availability & Settings",
      description: "Work hours, timezone, and calendar",
      module: "teamMember",
      source: "system",
      iconName: "settings",
      fieldKeys: ["timezone", "status"],
      createdAt: 0,
    },
    {
      id: "sec-team-custom",
      title: "Custom Fields",
      description: "Additional team custom attributes",
      module: "teamMember",
      source: "system",
      iconName: "layers",
      fieldKeys: [],
      createdAt: 0,
    },
  ],
  scribe: [
    {
      id: "sec-patient-info",
      title: "Patient Information",
      description: "Demographics, age, sex, and visit date",
      module: "scribe",
      source: "system",
      iconName: "user",
      fieldKeys: ["patient_name", "patient_age_sex", "consultation_date", "patient_id"],
      createdAt: 0,
    },
    {
      id: "sec-complaint",
      title: "Chief Complaint",
      description: "Presenting symptoms and symptom duration",
      module: "scribe",
      source: "system",
      iconName: "file-text",
      fieldKeys: ["symptoms", "complaint_duration"],
      createdAt: 0,
    },
    {
      id: "sec-diagnosis",
      title: "Diagnosis & Clinical Findings",
      description: "Primary diagnosis, ICD-10 code, and examination notes",
      module: "scribe",
      source: "system",
      iconName: "shield",
      fieldKeys: ["primary_diagnosis", "icd_code", "diagnosis_type", "clinical_findings"],
      createdAt: 0,
    },
    {
      id: "sec-medications",
      title: "Medications",
      description: "Prescribed drugs, dosage, frequency, and duration table",
      module: "scribe",
      source: "system",
      iconName: "table",
      fieldKeys: ["med_name", "med_strength", "med_form", "med_dosage", "med_frequency", "med_duration", "med_route"],
      createdAt: 0,
    },
    {
      id: "sec-follow-up",
      title: "Instructions & Follow-up",
      description: "Care advice, warnings, prognosis, and return review",
      module: "scribe",
      source: "system",
      iconName: "workflow",
      fieldKeys: ["patient_instructions", "patient_precautions", "prognosis_status", "expected_course", "complication_risk", "follow_up_review", "follow_up_criteria"],
      createdAt: 0,
    },
  ],
};

interface FieldRegistryContextValue {
  getSystemFields: (module: FieldModule) => FieldDefinition[];
  getCustomFields: (module: FieldModule) => FieldDefinition[];
  getAllFields: (module: FieldModule) => FieldDefinition[];
  getFieldsForOrg: (module: FieldModule, org?: OrgScopeFilter | null, processId?: string) => FieldDefinition[];
  addCustomField: (module: FieldModule, field: Omit<FieldDefinition, "id" | "source" | "createdAt"> & { source?: "system" | "custom" | "template"; createdIn?: "admin" | "client" }) => FieldDefinition;
  updateCustomField: (module: FieldModule, id: number, patch: Partial<FieldDefinition>) => void;
  deleteCustomField: (module: FieldModule, id: number) => void;

  // Sections
  getSystemSections: (module: FieldModule) => SectionDefinition[];
  getCustomSections: (module: FieldModule) => SectionDefinition[];
  getAllSections: (module: FieldModule) => SectionDefinition[];
  getSectionsForOrg: (module: FieldModule, org?: OrgScopeFilter | null, processId?: string) => SectionDefinition[];
  addCustomSection: (module: FieldModule, section: Omit<SectionDefinition, "id" | "source" | "createdAt"> & { source?: "system" | "custom" | "template"; createdIn?: "admin" | "client" }) => SectionDefinition;
  updateCustomSection: (module: FieldModule, id: string, patch: Partial<SectionDefinition>) => void;
  deleteCustomSection: (module: FieldModule, id: string) => void;
  assignFieldToSection: (module: FieldModule, sectionId: string, fieldKey: string) => void;
  removeFieldFromSection: (module: FieldModule, sectionId: string, fieldKey: string) => void;
}

const FieldRegistryContext = createContext<FieldRegistryContextValue | null>(null);

function normalizeModuleKey(raw: any): Exclude<FieldModule, "deal"> {
  if (!raw || typeof raw !== "string") return "client";
  const lower = raw.toLowerCase().trim();
  if (lower === "client" || lower === "clients") return "client";
  if (lower === "process" || lower === "processes" || lower === "deal" || lower === "deals") return "process";
  if (lower === "appointment" || lower === "appointments") return "appointment";
  if (lower === "call" || lower === "calls" || lower === "call logs" || lower === "call_logs") return "call";
  if (lower === "service" || lower === "services" || lower === "products / services" || lower === "product") return "service";
  if (lower === "organization" || lower === "organizations" || lower === "organisation") return "organization";
  if (lower === "teammember" || lower === "team_member" || lower === "team member" || lower === "team members") return "teamMember";
  if (lower === "scribe" || lower === "ai scribe" || lower === "ai_scribe") return "scribe";
  return "client";
}

function sanitizeFieldDefinition(f: any, fallbackModule: Exclude<FieldModule, "deal">): FieldDefinition {
  const targetModule = f.module ? normalizeModuleKey(f.module) : fallbackModule;
  const rawType = f.inputType;
  let normalizedType: FieldInputType = rawType || "text";
  let normalizedSelectionMode = f.selectionMode;

  if (rawType === "select") {
    normalizedType = "list_select";
    if (!normalizedSelectionMode) normalizedSelectionMode = "single";
  } else if (rawType === "multiselect") {
    normalizedType = "list_select";
    if (!normalizedSelectionMode) normalizedSelectionMode = "multiple";
  } else if (rawType === "list") {
    normalizedType = "list_select";
    if (!normalizedSelectionMode) normalizedSelectionMode = "single";
  } else if (rawType === "group_repeatable") {
    normalizedType = "list_open";
  }

  const isStructured =
    rawType === "group_repeatable" ||
    f.listEntryType === "structured" ||
    f.entryType === "structured";

  return {
    id:
      typeof f.id === "number"
        ? f.id
        : typeof f.id === "string" && !isNaN(Number(f.id))
        ? Number(f.id)
        : Date.now() + Math.floor(Math.random() * 1000),
    key: f.key || (f.label || f.name || "field").toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
    label: f.label || f.name || "Untitled Field",
    module: targetModule,
    source: f.source === "system" || (typeof f.id === "number" && f.id < 0) || (f.key && SYSTEM_FIELD_KEYS.has(f.key))
      ? "system"
      : f.source === "template"
      ? "template"
      : f.source === "custom" && f.createdIn === "client"
      ? "custom"
      : f.createdIn === "client"
      ? "custom"
      : "template",
    createdIn: f.createdIn || (f.source === "custom" && f.createdIn === "client" ? "client" : "admin"),
    inputType: normalizedType,
    placeholder: f.placeholder || "",
    tooltip: f.tooltip || f.helpText || undefined,
    validation: f.validation || "",
    options: Array.isArray(f.options)
      ? f.options.map((opt: any, idx: number) =>
          typeof opt === "string" ? { id: idx + 1, label: opt, value: opt } : opt
        )
      : undefined,
    tableColumns: f.tableColumns,
    sectionId: f.sectionId,
    required: f.required ?? f.isRequired ?? false,
    requiredStages: Array.isArray(f.requiredStages) && f.requiredStages.length > 0 ? f.requiredStages : undefined,
    userVisibility: f.userVisibility !== false,
    showAlways: f.showAlways !== false,
    visibleToRecordIds: f.visibleToRecordIds,
    sourceFormId: f.sourceFormId,
    industryCategory: f.industryCategory,
    industry: f.industry,
    locations: Array.isArray(f.locations) ? f.locations : undefined,
    scopingRules: Array.isArray(f.scopingRules) ? f.scopingRules : undefined,
    processIds: Array.isArray(f.processIds) ? f.processIds : undefined,
    isReusable: Boolean(f.isReusable),
    reusableModules: Array.isArray(f.reusableModules) ? f.reusableModules : undefined,
    permissions: f.permissions ? {
      canHide: f.permissions.canHide !== false,
      canEdit: f.permissions.canEdit !== false,
      canAdd: f.permissions.canAdd !== false && f.permissions.canAddOptions !== false,
      canAddOptions: f.permissions.canAdd !== false && f.permissions.canAddOptions !== false,
      canDelete: f.permissions.canDelete !== false,
    } : {
      canHide: true,
      canEdit: true,
      canAdd: true,
      canAddOptions: true,
      canDelete: true,
    },
    createdAt: typeof f.createdAt === "number" ? f.createdAt : Date.now(),
    // Preserve Phase-3 fields through storage normalization
    defaultValue: f.defaultValue !== undefined ? f.defaultValue : undefined,
    subFields: Array.isArray(f.subFields)
      ? f.subFields
      : Array.isArray(f.tableColumns) && f.tableColumns.length > 0
      ? f.tableColumns.map(normalizeLegacyColumn).filter((c): c is SubFieldConfig => c !== null)
      : undefined,
    crmBindConfig: f.crmBindConfig ?? undefined,
    selectionMode: normalizedSelectionMode,
    listEntryType: isStructured ? "structured" : (f.listEntryType || (normalizedType === "list_open" ? "plain_text" : undefined)),
    listBindConfig: f.listBindConfig ? {
      ...f.listBindConfig,
      sourceType: f.listBindConfig.sourceType === "group" ? "open_list" : f.listBindConfig.sourceType,
    } : undefined,
    listConfig: f.listConfig ?? undefined,
    textConfig: f.textConfig ?? undefined,
    dateConfig: f.dateConfig ?? undefined,
    phoneConfig: f.phoneConfig ?? undefined,
    mediaConfig: f.mediaConfig ?? undefined,
    numberConfig: f.numberConfig ?? undefined,
    compositeDisplayMode: f.compositeDisplayMode ?? undefined,
    maxRating: f.maxRating ?? undefined,
    currency: f.currency ?? undefined,
  };
}

function ensureScribeSeeds(registry: Record<Exclude<FieldModule, "deal">, FieldDefinition[]>) {
  if (!Array.isArray(registry.scribe)) {
    registry.scribe = [...INITIAL_SCRIBE_CUSTOM_FIELDS];
    return;
  }
  const keyToCorrectSeed = new Map(INITIAL_SCRIBE_CUSTOM_FIELDS.map((f) => [f.key, f]));
  const scribeSeedKeys = new Set(INITIAL_SCRIBE_CUSTOM_FIELDS.map((f) => f.key));

  // 1. Repair duplicate/stale IDs on scribe fields
  registry.scribe = registry.scribe.map((f) => {
    const correctSeed = keyToCorrectSeed.get(f.key);
    if (correctSeed && f.id !== correctSeed.id) {
      return { ...f, id: correctSeed.id };
    }
    return f;
  });

  // 2. Ensure all seed fields exist
  const existingScribeKeys = new Set(registry.scribe.map((f) => f.key));
  INITIAL_SCRIBE_CUSTOM_FIELDS.forEach((seed) => {
    if (!existingScribeKeys.has(seed.key)) {
      registry.scribe.push(seed);
      existingScribeKeys.add(seed.key);
    }
  });

  // 3. Purge any scribe seed fields that accidentally got into other modules (e.g. client, call, etc.)
  (Object.keys(registry) as (keyof typeof registry)[]).forEach((mod) => {
    if (mod !== "scribe" && Array.isArray(registry[mod])) {
      registry[mod] = registry[mod].filter((f) => !scribeSeedKeys.has(f.key) && f.module !== "scribe");
    }
  });
}

function loadCustomFieldsFromStorage(): Record<Exclude<FieldModule, "deal">, FieldDefinition[]> {
  const defaultRegistry: Record<Exclude<FieldModule, "deal">, FieldDefinition[]> = {
    client: [],
    process: [],
    appointment: [],
    call: [],
    service: [],
    organization: [],
    teamMember: [],
    scribe: [...INITIAL_SCRIBE_CUSTOM_FIELDS],
  };

  if (typeof window === "undefined") {
    return defaultRegistry;
  }

  // 1. PRIMARY SOURCE OF TRUTH: If localStorage exists, it is authoritative.
  const localRaw = localStorage.getItem(FIELD_REGISTRY_STORAGE_KEY);
  if (localRaw) {
    try {
      const parsed = JSON.parse(localRaw);
      const registry: Record<Exclude<FieldModule, "deal">, FieldDefinition[]> = {
        client: [],
        process: [],
        appointment: [],
        call: [],
        service: [],
        organization: [],
        teamMember: [],
        scribe: [...INITIAL_SCRIBE_CUSTOM_FIELDS],
      };

      if (Array.isArray(parsed)) {
        // Self-heal: If corrupted into a flat array, distribute each field to its proper module
        parsed.forEach((f: any) => {
          const mod = normalizeModuleKey(f.module);
          registry[mod].push(sanitizeFieldDefinition(f, mod));
        });
      } else if (parsed && typeof parsed === "object") {
        // Canonical module-keyed object
        (Object.keys(defaultRegistry) as (keyof typeof defaultRegistry)[]).forEach((mod) => {
          if (Array.isArray(parsed[mod])) {
            registry[mod] = parsed[mod].map((f: any) => sanitizeFieldDefinition(f, mod));
          }
        });
        if (Array.isArray((parsed as any).deal)) {
          registry.process = [
            ...registry.process,
            ...(parsed as any).deal.map((f: any) => sanitizeFieldDefinition(f, "process")),
          ];
        }
      }

      ensureScribeSeeds(registry);

      // Save the sanitized canonical object to localStorage
      try {
        localStorage.setItem(FIELD_REGISTRY_STORAGE_KEY, JSON.stringify(registry));
      } catch {}
      return registry;
    } catch (e) {
      console.error("Error reading fieldRegistry from localStorage, falling back", e);
    }
  }

  // 2. MIGRATION PATH: Runs ONLY when localStorage has NO data at all
  const registry: Record<Exclude<FieldModule, "deal">, FieldDefinition[]> = {
    client: [],
    process: [],
    appointment: [],
    call: [],
    service: [],
    organization: [],
    teamMember: [],
    scribe: [...INITIAL_SCRIBE_CUSTOM_FIELDS],
  };

  // Check legacy sessionStorage keys
  const legacyRaw =
    sessionStorage.getItem("fieldRegistry_v3") ||
    sessionStorage.getItem("fieldRegistry_v2") ||
    sessionStorage.getItem("fieldRegistry_v1");

  if (legacyRaw) {
    try {
      const parsed = JSON.parse(legacyRaw);
      if (Array.isArray(parsed)) {
        // Legacy data was a flat array — distribute each item by its module property
        parsed.forEach((f: any) => {
          const mod = normalizeModuleKey(f.module);
          registry[mod].push(sanitizeFieldDefinition(f, mod));
        });
      } else if (parsed && typeof parsed === "object") {
        // Legacy data was an object
        (Object.keys(defaultRegistry) as (keyof typeof defaultRegistry)[]).forEach((mod) => {
          if (Array.isArray(parsed[mod])) {
            registry[mod] = parsed[mod].map((f: any) => sanitizeFieldDefinition(f, mod));
          }
        });
        if (Array.isArray((parsed as any).deal)) {
          registry.process = [
            ...registry.process,
            ...(parsed as any).deal.map((f: any) => sanitizeFieldDefinition(f, "process")),
          ];
        }
      }
    } catch (e) {
      console.error("Error parsing legacy field registry", e);
    }
  }

  // Check legacy clientCustomFields
  const oldClientRaw =
    sessionStorage.getItem("clientCustomFields") || localStorage.getItem("clientCustomFields");
  if (oldClientRaw) {
    try {
      const parsed = JSON.parse(oldClientRaw);
      if (Array.isArray(parsed)) {
        parsed.forEach((f: any) => {
          const fieldDef = sanitizeFieldDefinition(f, "client");
          if (!registry.client.some((existing) => existing.key === fieldDef.key)) {
            registry.client.push(fieldDef);
          }
        });
      }
    } catch {}
  }

  ensureScribeSeeds(registry);

  // Write the canonical module-keyed object to localStorage
  try {
    localStorage.setItem(FIELD_REGISTRY_STORAGE_KEY, JSON.stringify(registry));
  } catch {}

  return registry;
}

function sanitizeSectionDefinition(s: any, fallbackModule: Exclude<FieldModule, "deal">): SectionDefinition {
  const targetModule = s.module ? normalizeModuleKey(s.module) : fallbackModule;
  return {
    id: s.id || `sec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title: s.title || s.name || "Untitled Section",
    description: s.description || "",
    module: targetModule,
    source: s.source === "system" || SYSTEM_SECTION_IDS.has(s.id)
      ? "system"
      : s.source === "template"
      ? "template"
      : s.source === "custom" && s.createdIn === "client"
      ? "custom"
      : s.createdIn === "client"
      ? "custom"
      : "template",
    createdIn: s.createdIn || (s.source === "custom" && s.createdIn === "client" ? "client" : "admin"),
    iconName: s.iconName || "layers",
    fieldKeys: Array.isArray(s.fieldKeys)
      ? s.fieldKeys
      : Array.isArray(s.fieldIds)
      ? s.fieldIds
      : [],
    required: Boolean(s.required),
    requiredStages: Array.isArray(s.requiredStages) && s.requiredStages.length > 0 ? s.requiredStages : undefined,
    userVisibility: s.userVisibility !== false,
    industryCategory: s.industryCategory,
    industry: s.industry,
    locations: Array.isArray(s.locations) ? s.locations : undefined,
    scopingRules: Array.isArray(s.scopingRules) ? s.scopingRules : undefined,
    processIds: Array.isArray(s.processIds) ? s.processIds : undefined,
    isReusable: Boolean(s.isReusable),
    reusableModules: Array.isArray(s.reusableModules) ? s.reusableModules : undefined,
    permissions: s.permissions ? {
      canHide: s.permissions.canHide !== false,
      canEdit: s.permissions.canEdit !== false,
      canAdd: s.permissions.canAdd !== false && s.permissions.canAddFields !== false,
      canAddFields: s.permissions.canAdd !== false && s.permissions.canAddFields !== false,
      canDelete: s.permissions.canDelete !== false,
    } : {
      canHide: true,
      canEdit: true,
      canAdd: true,
      canAddFields: true,
      canDelete: true,
    },
    createdAt: typeof s.createdAt === "number" ? s.createdAt : Date.now(),
  };
}

function loadCustomSectionsFromStorage(): Record<Exclude<FieldModule, "deal">, SectionDefinition[]> {
  const defaultSections: Record<Exclude<FieldModule, "deal">, SectionDefinition[]> = {
    client: [],
    process: [],
    appointment: [],
    call: [],
    service: [],
    organization: [],
    teamMember: [],
    scribe: [],
  };

  if (typeof window === "undefined") {
    return defaultSections;
  }

  // 1. PRIMARY SOURCE OF TRUTH: If localStorage exists, it is authoritative
  const localRaw = localStorage.getItem(SECTION_REGISTRY_STORAGE_KEY);
  if (localRaw) {
    try {
      const parsed = JSON.parse(localRaw);
      const sections: Record<Exclude<FieldModule, "deal">, SectionDefinition[]> = {
        client: [],
        process: [],
        appointment: [],
        call: [],
        service: [],
        organization: [],
        teamMember: [],
        scribe: [],
      };

      if (Array.isArray(parsed)) {
        // Self-heal: If corrupted into a flat array, distribute each section to its proper module
        parsed.forEach((s: any) => {
          const mod = normalizeModuleKey(s.module);
          sections[mod].push(sanitizeSectionDefinition(s, mod));
        });
      } else if (parsed && typeof parsed === "object") {
        (Object.keys(defaultSections) as (keyof typeof defaultSections)[]).forEach((mod) => {
          if (Array.isArray(parsed[mod])) {
            sections[mod] = parsed[mod].map((s: any) => sanitizeSectionDefinition(s, mod));
          }
        });
      }

      try {
        localStorage.setItem(SECTION_REGISTRY_STORAGE_KEY, JSON.stringify(sections));
      } catch {}
      return sections;
    } catch (e) {
      console.error("Error reading sectionRegistry from localStorage", e);
    }
  }

  // 2. MIGRATION PATH: Runs ONLY when localStorage has NO data at all
  const sections: Record<Exclude<FieldModule, "deal">, SectionDefinition[]> = {
    client: [],
    process: [],
    appointment: [],
    call: [],
    service: [],
    organization: [],
    teamMember: [],
    scribe: [],
  };

  const legacyRaw = sessionStorage.getItem("sectionRegistry_v1");
  if (legacyRaw) {
    try {
      const parsed = JSON.parse(legacyRaw);
      if (Array.isArray(parsed)) {
        parsed.forEach((s: any) => {
          const mod = normalizeModuleKey(s.module);
          sections[mod].push(sanitizeSectionDefinition(s, mod));
        });
      } else if (parsed && typeof parsed === "object") {
        (Object.keys(defaultSections) as (keyof typeof defaultSections)[]).forEach((mod) => {
          if (Array.isArray(parsed[mod])) {
            sections[mod] = parsed[mod].map((s: any) => sanitizeSectionDefinition(s, mod));
          }
        });
      }
    } catch (e) {
      console.error("Error parsing legacy section registry", e);
    }
  }

  try {
    localStorage.setItem(SECTION_REGISTRY_STORAGE_KEY, JSON.stringify(sections));
  } catch {}

  return sections;
}

export function FieldRegistryProvider({ children }: { children: ReactNode }) {
  const instanceId = useRef(`fr_${Date.now()}_${Math.random()}`);
  const [customFields, setCustomFields] = useState<Record<Exclude<FieldModule, "deal">, FieldDefinition[]>>(
    loadCustomFieldsFromStorage
  );
  const [customSections, setCustomSections] = useState<Record<Exclude<FieldModule, "deal">, SectionDefinition[]>>(
    loadCustomSectionsFromStorage
  );

  // Sync customFields to localStorage & mirror to legacy sessionStorage keys
  useEffect(() => {
    try {
      localStorage.setItem(FIELD_REGISTRY_STORAGE_KEY, JSON.stringify(customFields));
      sessionStorage.setItem("fieldRegistry_v3", JSON.stringify(customFields));
      sessionStorage.setItem("fieldRegistry_v2", JSON.stringify(customFields));
      sessionStorage.setItem("fieldRegistry_v1", JSON.stringify(customFields));
      window.dispatchEvent(
        new CustomEvent(FIELD_REGISTRY_EVENT, { detail: { sender: instanceId.current } })
      );
    } catch (e) {
      console.error("Failed to save customFields to localStorage", e);
    }
  }, [customFields]);

  // Sync customSections to localStorage & mirror to legacy sessionStorage
  useEffect(() => {
    try {
      localStorage.setItem(SECTION_REGISTRY_STORAGE_KEY, JSON.stringify(customSections));
      sessionStorage.setItem("sectionRegistry_v1", JSON.stringify(customSections));
      window.dispatchEvent(
        new CustomEvent(SECTION_REGISTRY_EVENT, { detail: { sender: instanceId.current } })
      );
      window.dispatchEvent(new CustomEvent(LEGACY_SECTION_REGISTRY_EVENT));
    } catch (e) {
      console.error("Failed to save customSections to localStorage", e);
    }
  }, [customSections]);

  // Cross-tab and cross-component live sync
  useEffect(() => {
    const handleFieldsSync = (e: any) => {
      if (e?.detail?.sender === instanceId.current) return;
      setCustomFields(loadCustomFieldsFromStorage());
    };

    const handleSectionsSync = (e: any) => {
      if (e?.detail?.sender === instanceId.current) return;
      setCustomSections(loadCustomSectionsFromStorage());
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === FIELD_REGISTRY_STORAGE_KEY) {
        setCustomFields(loadCustomFieldsFromStorage());
      } else if (e.key === SECTION_REGISTRY_STORAGE_KEY) {
        setCustomSections(loadCustomSectionsFromStorage());
      }
    };

    window.addEventListener(FIELD_REGISTRY_EVENT, handleFieldsSync);
    window.addEventListener(SECTION_REGISTRY_EVENT, handleSectionsSync);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(FIELD_REGISTRY_EVENT, handleFieldsSync);
      window.removeEventListener(SECTION_REGISTRY_EVENT, handleSectionsSync);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const normalizeModule = (module: FieldModule): Exclude<FieldModule, "deal"> => {
    return module === "deal" ? "process" : module;
  };

  const getSystemFields = (module: FieldModule): FieldDefinition[] => {
    const norm = normalizeModule(module);
    const seeds = SYSTEM_SEEDS[norm] || [];
    const teamOptions = getLiveTeamMembers();

    return seeds.map((f, index) => {
      // Sourced live team options for "responsible" or "provider" select inputs
      const isTeamSelect = f.key === "responsible" || f.key === "provider";
      return {
        ...f,
        id: -(index + 1), // system fields have negative ids
        source: "system",
        createdAt: 0,
        options: isTeamSelect ? teamOptions : f.options,
      };
    }) as FieldDefinition[];
  };

  const getCustomFields = (module: FieldModule): FieldDefinition[] => {
    const norm = normalizeModule(module);
    const directFields = customFields[norm] || [];
    // Also include fields marked as reusable across modules
    const reusableFields: FieldDefinition[] = [];
    (Object.keys(customFields) as (keyof typeof customFields)[]).forEach((mod) => {
      if (mod !== norm) {
        (customFields[mod] || []).forEach((f) => {
          if (f.isReusable) {
            const matchesModule = !f.reusableModules || f.reusableModules.length === 0 || f.reusableModules.includes(norm);
            if (matchesModule && !directFields.some((df) => df.key === f.key) && !reusableFields.some((rf) => rf.key === f.key)) {
              reusableFields.push({ ...f, module: norm });
            }
          }
        });
      }
    });
    return [...directFields, ...reusableFields];
  };

  const getAllFields = (module: FieldModule): FieldDefinition[] => {
    return [...getSystemFields(module), ...getCustomFields(module)];
  };

  const addCustomField = (
    module: FieldModule,
    fieldData: Omit<FieldDefinition, "id" | "source" | "createdAt"> & { source?: "system" | "custom" | "template"; createdIn?: "admin" | "client" }
  ): FieldDefinition => {
    const norm = normalizeModule(module);
    const normalizedData = { ...fieldData };
    if (normalizedData.inputType === ("group_repeatable" as any)) {
      normalizedData.inputType = "list_open";
      normalizedData.listEntryType = "structured";
    }
    const targetSource: "system" | "custom" | "template" =
      fieldData.source || (fieldData.createdIn === "admin" ? "template" : "custom");
    const targetCreatedIn: "admin" | "client" =
      fieldData.createdIn || (targetSource === "template" ? "admin" : "client");

    const newField: FieldDefinition = {
      ...normalizedData,
      module: norm,
      id: Date.now() + Math.floor(Math.random() * 1000),
      source: targetSource,
      createdIn: targetCreatedIn,
      createdAt: Date.now(),
    };
    setCustomFields((prev) => ({
      ...prev,
      [norm]: [...(prev[norm] || []), newField],
    }));

    // If sectionId provided, also assign key to that section
    if (newField.sectionId) {
      assignFieldToSection(norm, newField.sectionId, newField.key);
    }

    return newField;
  };

  const updateCustomField = (module: FieldModule, id: number, patch: Partial<FieldDefinition>) => {
    const norm = normalizeModule(module);
    const normalizedPatch = { ...patch };
    if (normalizedPatch.inputType === ("group_repeatable" as any)) {
      normalizedPatch.inputType = "list_open";
      normalizedPatch.listEntryType = "structured";
    }
    setCustomFields((prev) => {
      const updated = (prev[norm] || []).map((f) =>
        f.id === id ? { ...f, ...normalizedPatch } : f
      );
      return {
        ...prev,
        [norm]: updated,
      };
    });
  };

  const deleteCustomField = (module: FieldModule, id: number) => {
    const norm = normalizeModule(module);
    const targetField = (customFields[norm] || []).find((f) => f.id === id);
    setCustomFields((prev) => ({
      ...prev,
      [norm]: (prev[norm] || []).filter((f) => f.id !== id),
    }));

    if (targetField) {
      // Remove from all sections in module
      setCustomSections((prev) => ({
        ...prev,
        [norm]: (prev[norm] || []).map((sec) => ({
          ...sec,
          fieldKeys: sec.fieldKeys.filter((k) => k !== targetField.key),
        })),
      }));
    }
  };

  // Section Methods
  const getSystemSections = (module: FieldModule): SectionDefinition[] => {
    const norm = normalizeModule(module);
    return SYSTEM_SECTIONS[norm] || [];
  };

  const getCustomSections = (module: FieldModule): SectionDefinition[] => {
    const norm = normalizeModule(module);
    const directSections = customSections[norm] || [];
    // Also include sections marked as reusable across modules
    const reusableSections: SectionDefinition[] = [];
    (Object.keys(customSections) as (keyof typeof customSections)[]).forEach((mod) => {
      if (mod !== norm) {
        (customSections[mod] || []).forEach((s) => {
          if (s.isReusable) {
            const matchesModule = !s.reusableModules || s.reusableModules.length === 0 || s.reusableModules.includes(norm);
            if (matchesModule && !directSections.some((ds) => ds.id === s.id) && !reusableSections.some((rs) => rs.id === s.id)) {
              reusableSections.push({ ...s, module: norm });
            }
          }
        });
      }
    });
    return [...directSections, ...reusableSections];
  };

  const getAllSections = (module: FieldModule): SectionDefinition[] => {
    return [...getSystemSections(module), ...getCustomSections(module)];
  };

  const getFieldsForOrg = (module: FieldModule, org?: OrgScopeFilter | null, processId?: string): FieldDefinition[] => {
    return getAllFields(module).filter((f) => isFieldMatchingOrg(f, org, processId));
  };

  const getSectionsForOrg = (module: FieldModule, org?: OrgScopeFilter | null, processId?: string): SectionDefinition[] => {
    const all = getAllSections(module);
    const matchedSections = all.filter((s) => isSectionMatchingOrg(s, org, processId));
    const allowedFieldKeys = new Set(getFieldsForOrg(module, org, processId).map((f) => f.key));

    return matchedSections.map((s) => ({
      ...s,
      fieldKeys: (s.fieldKeys || []).filter((k) => allowedFieldKeys.has(k)),
    }));
  };

  const addCustomSection = (
    module: FieldModule,
    sectionData: Omit<SectionDefinition, "id" | "source" | "createdAt"> & { source?: "system" | "custom" | "template"; createdIn?: "admin" | "client" }
  ): SectionDefinition => {
    const norm = normalizeModule(module);
    const targetSource: "system" | "custom" | "template" =
      sectionData.source || (sectionData.createdIn === "admin" ? "template" : "custom");
    const targetCreatedIn: "admin" | "client" =
      sectionData.createdIn || (targetSource === "template" ? "admin" : "client");

    const newSection: SectionDefinition = {
      ...sectionData,
      id: `sec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      module: norm,
      source: targetSource,
      createdIn: targetCreatedIn,
      createdAt: Date.now(),
      fieldKeys: sectionData.fieldKeys || [],
    };
    setCustomSections((prev) => ({
      ...prev,
      [norm]: [...(prev[norm] || []), newSection],
    }));
    return newSection;
  };

  const updateCustomSection = (module: FieldModule, id: string, patch: Partial<SectionDefinition>) => {
    const norm = normalizeModule(module);
    setCustomSections((prev) => ({
      ...prev,
      [norm]: (prev[norm] || []).map((s) =>
        s.id === id ? { ...s, ...patch } : s
      ),
    }));
  };

  const deleteCustomSection = (module: FieldModule, id: string) => {
    const norm = normalizeModule(module);
    setCustomSections((prev) => ({
      ...prev,
      [norm]: (prev[norm] || []).filter((s) => s.id !== id),
    }));
  };

  const assignFieldToSection = (module: FieldModule, sectionId: string, fieldKey: string) => {
    const norm = normalizeModule(module);
    setCustomSections((prev) => ({
      ...prev,
      [norm]: (prev[norm] || []).map((s) =>
        s.id === sectionId && !s.fieldKeys.includes(fieldKey)
          ? { ...s, fieldKeys: [...s.fieldKeys, fieldKey] }
          : s
      ),
    }));
  };

  const removeFieldFromSection = (module: FieldModule, sectionId: string, fieldKey: string) => {
    const norm = normalizeModule(module);
    setCustomSections((prev) => ({
      ...prev,
      [norm]: (prev[norm] || []).map((s) =>
        s.id === sectionId
          ? { ...s, fieldKeys: s.fieldKeys.filter((k) => k !== fieldKey) }
          : s
      ),
    }));
  };

  return (
    <FieldRegistryContext.Provider
      value={{
        getSystemFields,
        getCustomFields,
        getAllFields,
        getFieldsForOrg,
        addCustomField,
        updateCustomField,
        deleteCustomField,
        getSystemSections,
        getCustomSections,
        getAllSections,
        getSectionsForOrg,
        addCustomSection,
        updateCustomSection,
        deleteCustomSection,
        assignFieldToSection,
        removeFieldFromSection,
      }}
    >
      {children}
    </FieldRegistryContext.Provider>
  );
}

export function useFieldRegistry(): FieldRegistryContextValue {
  const ctx = useContext(FieldRegistryContext);
  if (!ctx) {
    throw new Error("useFieldRegistry must be used within a FieldRegistryProvider");
  }
  return ctx;
}
