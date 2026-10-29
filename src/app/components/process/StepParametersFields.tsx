import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router";
import {
  ChevronDown, Plus, Trash2, Info, Sliders, Star, Volume2, Play, ArrowRight,
  User, PhoneForwarded, Phone, PhoneOff, Mail, MessageSquare, Paperclip, ExternalLink,
  ChevronRight, X, Copy, Pencil, Sparkles, Calendar, Workflow, Receipt, Briefcase, FileCheck, Check, GitBranch, Split, Clock, Link2, Zap, CornerDownRight
} from "lucide-react";
import { toast } from "sonner";
import type { ConditionCase, ConditionCaseRule } from "../../types/workflow";
import VariablePickerButton, { FETCH_FIELD_SOURCES } from "./VariablePickerButton";
import VariableSelectorModal from "./VariableSelectorModal";
import SelectFieldsMultiModal from "./SelectFieldsMultiModal";
import { InfoTooltip } from "../help/InfoTooltip";
import { useFieldRegistry, isFieldMatchingOrg, ScopingRule, ALL_MODULES, CURRENCY_SYMBOLS } from "../../context/FieldRegistryContext";

import { getStoredTemplates } from "../../../lib/useWhatsappTemplates";
import { getStoredProcesses, DEFAULT_ENTITY_PROCESSES, isProcessMatchingScopingRules } from "../../../lib/useProcessStore";
import { MOCK_SERVICES } from "../../../lib/mockServicesData";
import { getStoredServices } from "../../../lib/servicesStore";
import {
  getStoredDocumentTemplates,
  isDocumentTemplateMatchingScopeRules,
  DocumentTemplate,
  TemplateEntity,
} from "../../../lib/documentTemplatesStore";
import { AdminControlAccordion } from "../../pages/admin/components/AdminControlAccordion";
import { SelectFieldsModal } from "../help/FieldManager";

const availableEmployees = [
  { id: "1", name: "Sarah Johnson" },
  { id: "2", name: "Michael Chen" },
  { id: "3", name: "Emily Rodriguez" },
  { id: "4", name: "James Wilson" },
  { id: "5", name: "Lisa Thompson" },
];

const FORM_TEMPLATES = [
  { id: "contact-form", name: "Contact Form" },
  { id: "appointment-booking", name: "Appointment Booking" },
  { id: "lead-generation", name: "Lead Generation" },
  { id: "quote-request", name: "Quote Request" },
];


interface ProcessOption {
  id: string;
  name: string;
  stages?: { id: string; name: string }[];
  entityType?: string;
  scopingRules?: ScopingRule[];
  industryCategory?: string;
  industry?: string;
  locations?: string[];
}

interface StepParametersFieldsProps {
  stepKey: string;
  params: Record<string, any>;
  onChange: (patch: Record<string, any>) => void;
  processes?: ProcessOption[];
  stepTrigger?: string;
  scopingRules?: ScopingRule[];
  isAdmin?: boolean;
}

export default function StepParametersFields({
  stepKey,
  params,
  onChange,
  processes = [],
  stepTrigger,
  scopingRules = [],
  isAdmin = false,
}: StepParametersFieldsProps) {
  const allAvailableProcesses = (processes && processes.length > 0) ? processes : getStoredProcesses();
  const effectiveProcesses = useMemo(() => {
    if (!scopingRules || scopingRules.length === 0) {
      return allAvailableProcesses;
    }
    const hasActiveRules = scopingRules.some(
      (r) =>
        Boolean(r.industryCategory && r.industryCategory !== "All" && r.industryCategory !== "*") ||
        Boolean(r.industries && r.industries.length > 0 && !r.industries.includes("All")) ||
        Boolean(r.locations && r.locations.length > 0 && !r.locations.includes("All"))
    );
    if (!hasActiveRules) return allAvailableProcesses;

    const filtered = allAvailableProcesses.filter((p: any) =>
      isProcessMatchingScopingRules(p, scopingRules)
    );
    return filtered.length > 0 ? filtered : allAvailableProcesses;
  }, [allAvailableProcesses, scopingRules]);

  const { getAllFields } = useFieldRegistry();
  const allClientFields = getAllFields("client");
  const scopedClientFields = useMemo(() => {
    if (!scopingRules || scopingRules.length === 0) return allClientFields;
    const firstRule = scopingRules[0];
    const scopeOrg = {
      industryCategory: firstRule.industryCategory,
      industry: firstRule.industries?.[0],
      location: firstRule.locations?.[0],
    };
    return allClientFields.filter((f) => isFieldMatchingOrg(f, scopeOrg));
  }, [allClientFields, scopingRules]);
  const customClientFields = scopedClientFields.filter((f) => f.source === "custom");

  // Local UI-only states
  const [conditionsSectionExpanded, setConditionsSectionExpanded] = useState(true);
  const [fieldConditionsGroupExpanded, setFieldConditionsGroupExpanded] = useState(true);
  const [fieldExpandedCardIndex, setFieldExpandedCardIndex] = useState<number | null>(null);
  const [intentConditionsGroupExpanded, setIntentConditionsGroupExpanded] = useState(true);
  const [intentExpandedCardIndex, setIntentExpandedCardIndex] = useState<number | null>(null);
  const [intentInput, setIntentInput] = useState("");
  const [showCollectInfoDropdown, setShowCollectInfoDropdown] = useState(false);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);

  const [parametersSectionExpanded, setParametersSectionExpanded] = useState(true);
  const [collapsedCases, setCollapsedCases] = useState<Record<string, boolean>>({});

  const toggleCaseCollapse = (caseKey: string) => {
    setCollapsedCases((prev) => ({
      ...prev,
      [caseKey]: !prev[caseKey],
    }));
  };
  const [whatsappTemplates, setWhatsappTemplates] = useState<any[]>([]);
  const [whatsappCampaigns, setWhatsappCampaigns] = useState<any[]>([]);

  const [customApiIntegrations, setCustomApiIntegrations] = useState<any[]>([]);
  const [customWebhookIntegrations, setCustomWebhookIntegrations] = useState<any[]>([]);
  const [webhookFieldModalIndex, setWebhookFieldModalIndex] = useState<number | null>(null);
  const [jsonPaste, setJsonPaste] = useState("");
  const [jsonError, setJsonError] = useState("");
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const storedServices = useMemo(() => getStoredServices(), []);
  const [isFieldRegistryModalOpen, setIsFieldRegistryModalOpen] = useState(false);
  const [fieldModalMode, setFieldModalMode] = useState<
    | "monitoredFields"
    | "fieldConditionSingle"
    | "fieldConditionMulti"
    | "fieldUpdateSingle"
    | "fieldUpdateMulti"
    | "genericCondition"
    | "conditionNodeSingle"
    | "conditionNodeMulti"
    | "conditionNodeDynamic"
    | "caseConditionSingle"
    | "caseConditionMulti"
    | "caseConditionDynamic"
    | "triggerConditionSingle"
    | "triggerConditionMulti"
    | "triggerConditionDynamic"
    | "assignProcessFieldToken"
    | "aiTriggerPromptToken"
  >("monitoredFields");
  const [targetConditionIndex, setTargetConditionIndex] = useState<number | null>(null);
  const [targetCaseIndex, setTargetCaseIndex] = useState<number | null>(null);
  const [targetCaseConditionIndex, setTargetCaseConditionIndex] = useState<number | null>(null);
  const [targetTriggerConditionIndex, setTargetTriggerConditionIndex] = useState<number | null>(null);
  const [targetFieldUpdateIndex, setTargetFieldUpdateIndex] = useState<number | null>(null);
  const [targetProcessFieldKey, setTargetProcessFieldKey] = useState<string | null>(null);
  const [optionalFieldsExpanded, setOptionalFieldsExpanded] = useState(false);

  const getFieldDefByKey = (key: string) => {
    if (!key) return null;
    for (const mod of ALL_MODULES) {
      const list = getAllFields(mod);
      const found = list.find((f) => f.key === key);
      if (found) return found;
    }
    return null;
  };

  const getFieldOptions = (fieldDef: any, fieldKey: string, fieldSource?: string): Array<{ label: string; value: string }> => {
    if (fieldDef?.options && Array.isArray(fieldDef.options) && fieldDef.options.length > 0) {
      return fieldDef.options.map((opt: any) => ({
        label: String(opt.label || opt.name || opt.value),
        value: String(opt.value ?? opt.id ?? opt.label),
      }));
    }

    if (fieldDef?.inputType === "yes_no") {
      return [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
      ];
    }

    const keyLower = (fieldKey || "").toLowerCase();
    if (keyLower === "status" || keyLower.includes("status")) {
      if (fieldSource === "appointment" || keyLower.includes("appointment")) {
        return [
          { label: "Booked", value: "booked" },
          { label: "Confirmed", value: "confirmed" },
          { label: "Checked In", value: "checked_in" },
          { label: "Completed", value: "completed" },
          { label: "Cancelled", value: "cancelled" },
          { label: "No Show", value: "no_show" },
          { label: "Rescheduled", value: "rescheduled" },
        ];
      }
      if (fieldSource === "invoice" || keyLower.includes("invoice")) {
        return [
          { label: "Draft", value: "draft" },
          { label: "Sent / Issued", value: "sent" },
          { label: "Paid", value: "paid" },
          { label: "Partially Paid", value: "partially_paid" },
          { label: "Overdue", value: "overdue" },
          { label: "Cancelled", value: "cancelled" },
        ];
      }
      return [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
        { label: "Pending", value: "pending" },
        { label: "Archived", value: "archived" },
      ];
    }

    if (keyLower === "gender") {
      return [
        { label: "Male", value: "male" },
        { label: "Female", value: "female" },
        { label: "Other", value: "other" },
        { label: "Prefer not to say", value: "prefer_not_to_say" },
      ];
    }

    if (keyLower === "priority") {
      return [
        { label: "High", value: "high" },
        { label: "Medium", value: "medium" },
        { label: "Low", value: "low" },
      ];
    }

    if (keyLower === "service" || keyLower === "service_id" || keyLower === "appointment_service") {
      return storedServices.map((s) => ({
        label: s.name,
        value: String(s.name),
      }));
    }

    return [];
  };

  const getOperatorsForField = (fieldDef: any) => {
    const type = fieldDef?.inputType || "text";
    if (type === "number" || type === "money" || type === "rating") {
      return [
        { label: "Equal To", value: "Equal To" },
        { label: "Not Equal To", value: "Not Equal To" },
        { label: "Greater Than", value: "Greater Than" },
        { label: "Less Than", value: "Less Than" },
        { label: "Greater Than or Equal", value: "Greater Than or Equal" },
        { label: "Less Than or Equal", value: "Less Than or Equal" },
        { label: "Is Empty", value: "Is Empty" },
        { label: "Is Not Empty", value: "Is Not Empty" },
      ];
    }
    if (type === "date" || type === "date_time" || type === "time") {
      return [
        { label: "Equal To", value: "Equal To" },
        { label: "Before", value: "Before" },
        { label: "After", value: "After" },
        { label: "Is Empty", value: "Is Empty" },
        { label: "Is Not Empty", value: "Is Not Empty" },
      ];
    }
    if (type === "yes_no" || type === "list_select" || type === "select") {
      return [
        { label: "Equal To", value: "Equal To" },
        { label: "Not Equal To", value: "Not Equal To" },
        { label: "Is Empty", value: "Is Empty" },
        { label: "Is Not Empty", value: "Is Not Empty" },
      ];
    }
    return [
      { label: "Equal To", value: "Equal To" },
      { label: "Not Equal To", value: "Not Equal To" },
      { label: "Includes / Contains", value: "Includes" },
      { label: "Starts With", value: "Starts With" },
      { label: "Is Empty", value: "Is Empty" },
      { label: "Is Not Empty", value: "Is Not Empty" },
    ];
  };

  const renderFieldValueInput = (
    fieldKey: string,
    fieldSource: string | undefined,
    value: any,
    onValChange: (newVal: any) => void,
    placeholder = "Enter value...",
    extraTrailingAction?: React.ReactNode
  ) => {
    const fieldDef = getFieldDefByKey(fieldKey);
    const options = getFieldOptions(fieldDef, fieldKey, fieldSource);

    const renderInputNode = () => {
      if (options.length > 0) {
        return (
          <select
            value={value ?? ""}
            onChange={(e) => onValChange(e.target.value)}
            className={`w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-blue-500 outline-none cursor-pointer ${
              extraTrailingAction ? "pr-9" : ""
            }`}
          >
            <option value="">Select option...</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      }

      const inputType = fieldDef?.inputType || "text";

      if (inputType === "date") {
        return (
          <input
            type="date"
            value={value ?? ""}
            onChange={(e) => onValChange(e.target.value)}
            className={`w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-blue-500 outline-none ${
              extraTrailingAction ? "pr-9" : ""
            }`}
          />
        );
      }

      if (inputType === "date_time") {
        return (
          <input
            type="datetime-local"
            value={value ?? ""}
            onChange={(e) => onValChange(e.target.value)}
            className={`w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-blue-500 outline-none ${
              extraTrailingAction ? "pr-9" : ""
            }`}
          />
        );
      }

      if (inputType === "time") {
        return (
          <input
            type="time"
            value={value ?? ""}
            onChange={(e) => onValChange(e.target.value)}
            className={`w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-blue-500 outline-none ${
              extraTrailingAction ? "pr-9" : ""
            }`}
          />
        );
      }

      if (inputType === "number" || inputType === "rating") {
        return (
          <input
            type="number"
            value={value ?? ""}
            onChange={(e) => onValChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-blue-500 outline-none ${
              extraTrailingAction ? "pr-9" : ""
            }`}
          />
        );
      }

      if (inputType === "money") {
        const symbol = CURRENCY_SYMBOLS[fieldDef?.currency || "USD"] || "$";
        return (
          <div className="relative flex items-center w-full">
            <span className="absolute left-3 text-xs font-semibold text-gray-500">{symbol}</span>
            <input
              type="number"
              step="0.01"
              value={value ?? ""}
              onChange={(e) => onValChange(e.target.value)}
              placeholder="0.00"
              className={`w-full pl-7 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-blue-500 outline-none ${
                extraTrailingAction ? "pr-9" : "pr-3"
              }`}
            />
          </div>
        );
      }

      if (inputType === "email") {
        return (
          <input
            type="email"
            value={value ?? ""}
            onChange={(e) => onValChange(e.target.value)}
            placeholder="name@example.com"
            className={`w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-blue-500 outline-none ${
              extraTrailingAction ? "pr-9" : ""
            }`}
          />
        );
      }

      if (inputType === "tel") {
        return (
          <input
            type="tel"
            value={value ?? ""}
            onChange={(e) => onValChange(e.target.value)}
            placeholder="+1 (555) 000-0000"
            className={`w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-blue-500 outline-none ${
              extraTrailingAction ? "pr-9" : ""
            }`}
          />
        );
      }

      return (
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onValChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-blue-500 outline-none ${
            extraTrailingAction ? "pr-9" : ""
          }`}
        />
      );
    };

    if (extraTrailingAction) {
      return (
        <div className="relative flex items-center w-full">
          {renderInputNode()}
          <div className="absolute right-2 flex items-center">{extraTrailingAction}</div>
        </div>
      );
    }

    return renderInputNode();
  };

  const handleFieldRegistryApply = (selectedKeys: string[]) => {
    if (fieldModalMode === "monitoredFields") {
      onChange({ monitoredFields: selectedKeys });
    } else if (fieldModalMode === "conditionNodeSingle") {
      if (targetConditionIndex !== null && selectedKeys.length > 0) {
        const key = selectedKeys[0];
        const fieldDef = getFieldDefByKey(key);
        const currentRules = Array.isArray(params.conditions) && params.conditions.length > 0
          ? params.conditions
          : [{ id: `cond-1`, field: "", operator: "Equal To", value: "" }];
        const updated = currentRules.map((c: any, i: number) =>
          i === targetConditionIndex
            ? {
                ...c,
                field: key,
                fieldLabel: fieldDef?.label || key,
                fieldSource: fieldDef?.module || c.fieldSource || "client",
                value: "",
              }
            : c
        );
        onChange({
          conditions: updated,
          field: key,
          fieldLabel: fieldDef?.label || key,
          fieldSource: fieldDef?.module || "client"
        });
      }
    } else if (fieldModalMode === "conditionNodeMulti") {
      if (selectedKeys.length > 0) {
        const currentRules = Array.isArray(params.conditions) ? params.conditions : [];
        const newConds = selectedKeys.map((key) => {
          const fieldDef = getFieldDefByKey(key);
          return {
            id: `cond-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            field: key,
            fieldLabel: fieldDef?.label || key,
            fieldSource: fieldDef?.module || "client",
            operator: "Equal To",
            valueType: "static" as const,
            value: "",
          };
        });
        onChange({ conditions: [...currentRules, ...newConds], triggerConditions: [...currentRules, ...newConds] });
      }
    } else if (fieldModalMode === "conditionNodeDynamic") {
      if (targetConditionIndex !== null && selectedKeys.length > 0) {
        const key = selectedKeys[0];
        const fieldDef = getFieldDefByKey(key);
        const currentRules = Array.isArray(params.conditions) && params.conditions.length > 0
          ? params.conditions
          : [{ id: `cond-1`, field: "", operator: "Equal To", valueType: "static", value: "" }];
        const updated = currentRules.map((c: any, i: number) =>
          i === targetConditionIndex
            ? {
                ...c,
                valueType: "dynamic",
                dynamicField: key,
                dynamicFieldLabel: fieldDef?.label || key,
                dynamicFieldSource: fieldDef?.module || "client",
              }
            : c
        );
        onChange({ conditions: updated, triggerConditions: updated });
      }
    } else if (fieldModalMode === "caseConditionSingle") {
      if (targetCaseIndex !== null && targetCaseConditionIndex !== null && selectedKeys.length > 0) {
        const key = selectedKeys[0];
        const fieldDef = getFieldDefByKey(key);
        const nextCases = conditionCases.map((c, cIdx) => {
          if (cIdx !== targetCaseIndex) return c;
          const nextConds = c.conditions.map((cond, condIdx) => {
            if (condIdx !== targetCaseConditionIndex) return cond;
            return {
              ...cond,
              field: key,
              fieldLabel: fieldDef?.label || key,
              fieldSource: fieldDef?.module || cond.fieldSource || "client",
              value: "",
            };
          });
          return { ...c, conditions: nextConds };
        });
        updateCases(nextCases);
      }
    } else if (fieldModalMode === "caseConditionMulti") {
      if (targetCaseIndex !== null && selectedKeys.length > 0) {
        const newConds = selectedKeys.map((key) => {
          const fieldDef = getFieldDefByKey(key);
          return {
            id: `cond-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            field: key,
            fieldLabel: fieldDef?.label || key,
            fieldSource: fieldDef?.module || "client",
            operator: "Equal To",
            valueType: "static" as const,
            value: "",
            logicOp: "AND" as const,
          };
        });
        const nextCases = conditionCases.map((c, cIdx) => {
          if (cIdx !== targetCaseIndex) return c;
          return { ...c, conditions: [...c.conditions, ...newConds] };
        });
        updateCases(nextCases);
      }
    } else if (fieldModalMode === "caseConditionDynamic") {
      if (targetCaseIndex !== null && targetCaseConditionIndex !== null && selectedKeys.length > 0) {
        const key = selectedKeys[0];
        const fieldDef = getFieldDefByKey(key);
        const nextCases = conditionCases.map((c, cIdx) => {
          if (cIdx !== targetCaseIndex) return c;
          const nextConds = c.conditions.map((cond, condIdx) => {
            if (condIdx !== targetCaseConditionIndex) return cond;
            return {
              ...cond,
              valueType: "dynamic" as const,
              dynamicField: key,
              dynamicFieldLabel: fieldDef?.label || key,
              dynamicFieldSource: fieldDef?.module || "client",
            };
          });
          return { ...c, conditions: nextConds };
        });
        updateCases(nextCases);
      }
    } else if (fieldModalMode === "triggerConditionDynamic") {
      if (targetTriggerConditionIndex !== null && selectedKeys.length > 0) {
        const key = selectedKeys[0];
        const fieldDef = getFieldDefByKey(key);
        const currentTrigConds = Array.isArray(params.triggerConditions) && params.triggerConditions.length > 0
          ? params.triggerConditions
          : (Array.isArray(params.conditions) ? params.conditions : [{ id: `trig-cond-1`, field: "", operator: "Equal To", valueType: "static", value: "" }]);
        const updated = currentTrigConds.map((c: any, i: number) =>
          i === targetTriggerConditionIndex
            ? {
                ...c,
                valueType: "dynamic",
                dynamicField: key,
                dynamicFieldLabel: fieldDef?.label || key,
                dynamicFieldSource: fieldDef?.module || "appointment",
              }
            : c
        );
        onChange({ triggerConditions: updated, conditions: updated });
      }
    } else if (fieldModalMode === "triggerConditionSingle") {
      if (targetTriggerConditionIndex !== null && selectedKeys.length > 0) {
        const key = selectedKeys[0];
        const fieldDef = getFieldDefByKey(key);
        const currentTrigConds = Array.isArray(params.triggerConditions) && params.triggerConditions.length > 0
          ? params.triggerConditions
          : [{ id: `trig-cond-1`, field: "", operator: "Equal To", value: "" }];
        const updated = currentTrigConds.map((c: any, i: number) =>
          i === targetTriggerConditionIndex
            ? {
                ...c,
                field: key,
                fieldLabel: fieldDef?.label || key,
                fieldSource: fieldDef?.module || c.fieldSource || "appointment",
                value: "",
              }
            : c
        );
        onChange({ triggerConditions: updated });
      }
    } else if (fieldModalMode === "triggerConditionMulti") {
      if (selectedKeys.length > 0) {
        const currentTrigConds = Array.isArray(params.triggerConditions) ? params.triggerConditions : [];
        const newConds = selectedKeys.map((key) => {
          const fieldDef = getFieldDefByKey(key);
          return {
            id: `trig-cond-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            field: key,
            fieldLabel: fieldDef?.label || key,
            fieldSource: fieldDef?.module || "appointment",
            operator: "Equal To",
            value: "",
          };
        });
        onChange({ triggerConditions: [...currentTrigConds, ...newConds] });
      }
    } else if (fieldModalMode === "fieldConditionSingle") {
      if (targetConditionIndex !== null && selectedKeys.length > 0) {
        const key = selectedKeys[0];
        const fieldDef = getFieldDefByKey(key);
        const updated = fieldConditions.map((c: any, i: number) =>
          i === targetConditionIndex
            ? {
                ...c,
                field: key,
                fieldLabel: fieldDef?.label || key,
                fieldSource: fieldDef?.module || c.fieldSource || "client",
              }
            : c
        );
        onChange({ fieldConditions: updated });
      }
    } else if (fieldModalMode === "fieldConditionMulti") {
      if (selectedKeys.length > 0) {
        const newConds = selectedKeys.map((key) => {
          const fieldDef = getFieldDefByKey(key);
          return {
            id: `field-cond-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            fieldSource: fieldDef?.module || "client",
            field: key,
            fieldLabel: fieldDef?.label || key,
            operator: "Equal To",
            value: "",
          };
        });
        onChange({ fieldConditions: [...fieldConditions, ...newConds] });
      }
    } else if (fieldModalMode === "fieldUpdateSingle") {
      if (targetFieldUpdateIndex !== null && selectedKeys.length > 0) {
        const key = selectedKeys[0];
        const fieldDef = getFieldDefByKey(key);
        const updated = fieldUpdateBlocks.map((b: any, i: number) =>
          i === targetFieldUpdateIndex
            ? {
                ...b,
                fieldToEdit: key,
                fieldLabel: fieldDef?.label || key,
                fieldType: fieldDef?.module || b.fieldType,
                updateValue: "",
              }
            : b
        );
        onChange({ fieldUpdateBlocks: updated });
      }
    } else if (fieldModalMode === "fieldUpdateMulti") {
      if (selectedKeys.length > 0) {
        const newBlocks = selectedKeys.map((key) => {
          const fieldDef = getFieldDefByKey(key);
          return {
            fieldType: fieldDef?.module || "client",
            fieldToEdit: key,
            fieldLabel: fieldDef?.label || key,
            valueSource: "static" as const,
            updateValue: "",
          };
        });
        onChange({ fieldUpdateBlocks: [...fieldUpdateBlocks, ...newBlocks] });
      }
    } else if (fieldModalMode === "genericCondition") {
      if (selectedKeys.length > 0) {
        const key = selectedKeys[0];
        const fieldDef = getFieldDefByKey(key);
        onChange({
          field: key,
          fieldLabel: fieldDef?.label || key,
          fieldSource: fieldDef?.module || params.fieldSource || "system",
        });
      }
    } else if (fieldModalMode === "aiTriggerPromptToken") {
      if (selectedKeys.length > 0) {
        const chosenKey = selectedKeys[0];
        const token = `{{${chosenKey}}}`;
        const currentPrompt = params.prompt || params.aiTriggerPrompt || "";
        const nextPrompt = currentPrompt ? `${currentPrompt} ${token}` : token;
        onChange({
          prompt: nextPrompt,
          aiTriggerPrompt: nextPrompt,
        });
      }
    } else if (fieldModalMode === "assignProcessFieldToken" || fieldModalMode === "aiTriggerPromptToken") {
      if (targetProcessFieldKey && selectedKeys.length > 0) {
        const chosenKey = selectedKeys[0];
        const token = `{{${chosenKey}}}`;
        const currentVal = (params.processFields || {})[targetProcessFieldKey] || "";
        const nextVal = currentVal ? `${currentVal} ${token}` : token;
        onChange({
          processFields: {
            ...(params.processFields || {}),
            [targetProcessFieldKey]: nextVal,
          },
        });
        setTargetProcessFieldKey(null);
      }
    }
    setIsFieldRegistryModalOpen(false);
  };

  const getRefForField = (key: string) => {
    return {
      current: inputRefs.current[key] || null
    };
  };

  useEffect(() => {
    if (stepKey === "whatsapp" || stepKey === "send-whatsapp") {
      try {
        setWhatsappTemplates(getStoredTemplates());
        setWhatsappCampaigns(JSON.parse(localStorage.getItem("whatsappCampaigns") || "[]"));
      } catch (e) {
        console.error(e);
      }
    } else if (stepKey === "wh_trigger" || stepKey === "api") {
      try {
        const stored = JSON.parse(localStorage.getItem("customApiIntegrations") || "[]");
        setCustomApiIntegrations(stored);
      } catch (e) {
        console.error(e);
      }
    } else if (stepKey === "webhook_trigger" || stepKey === "webhook") {
      try {
        const stored = JSON.parse(localStorage.getItem("customWebhookIntegrations") || "[]");
        setCustomWebhookIntegrations(stored);
      } catch (e) {
        console.error(e);
      }
    }
  }, [stepKey]);

  // Local temp states for adding Smart Analysis scenarios
  const [smartAnalysisSelectedTemplate, setSmartAnalysisSelectedTemplate] = useState("");
  const [smartAnalysisTrackWhat, setSmartAnalysisTrackWhat] = useState("");
  const [smartAnalysisFieldName, setSmartAnalysisFieldName] = useState("");
  const [smartAnalysisCaptureDesc, setSmartAnalysisCaptureDesc] = useState("");
  const [smartAnalysisDataFormat, setSmartAnalysisDataFormat] = useState("Text - Simple text responses like summaries or comments");
  const [smartAnalysisOutputExample, setSmartAnalysisOutputExample] = useState("");
  const [smartAnalysisExpectedFormat, setSmartAnalysisExpectedFormat] = useState("");

  // Refs for variable insertions
  const smsMessageRef = useRef<HTMLTextAreaElement>(null);
  const emailRichBodyRef = useRef<HTMLTextAreaElement>(null);
  const emailHtmlBodyRef = useRef<HTMLTextAreaElement>(null);
  const crmUpdateValueRef = useRef<HTMLInputElement>(null);
  const ehrUpdateValueRef = useRef<HTMLInputElement>(null);
  const fetchAvailSummaryRef = useRef<HTMLTextAreaElement>(null);

  // Extract parameter values with clean fallbacks
  const conditionsEnabled = params.conditionsEnabled ?? false;
  const conditions = params.conditions ?? [{ id: "cond-1", fieldSource: "", field: "", operator: "", value: "" }];
  const conditionOperators = params.conditionOperators ?? [];
  const fieldConditions = params.fieldConditions ?? [];
  const fieldConditionOperators = params.fieldConditionOperators ?? [];
  const intentConditions = params.intentConditions ?? [];
  const intentConditionOperators = params.intentConditionOperators ?? [];

  const conditionRules: Array<{
    id: string;
    field: string;
    fieldLabel?: string;
    fieldSource?: string;
    operator: string;
    valueType?: "static" | "dynamic";
    value: any;
    dynamicField?: string;
    dynamicFieldLabel?: string;
    dynamicFieldSource?: string;
  }> = Array.isArray(params.conditions) && params.conditions.length > 0
    ? params.conditions
    : (Array.isArray(params.triggerConditions) && params.triggerConditions.length > 0
      ? params.triggerConditions
      : [
          {
            id: `cond-init-1`,
            field: params.field || "",
            fieldLabel: params.fieldLabel || "",
            fieldSource: params.fieldSource || "client",
            operator: params.operator || "Equal To",
            valueType: "static",
            value: params.value ?? "",
          }
        ]);

  const triggerConditions = conditionRules;

  const fieldUpdateBlocks = params.fieldUpdateBlocks ?? [
    { fieldType: "client", fieldToEdit: "", fieldLabel: "", valueSource: "static", updateValue: "" }
  ];
  const assignedUser = params.assignedUser ?? "";
  const callActionTransferType = params.callActionTransferType ?? "human";
  const callActionCountryCode = params.callActionCountryCode ?? "+1";
  const callActionPhoneNumber = params.callActionPhoneNumber ?? "";
  const callActionAgentId = params.callActionAgentId ?? "";
  const callActionReason = params.callActionReason ?? "";
  const callActionVoiceResponse = params.callActionVoiceResponse ?? "";

  const whatsappTemplate = params.whatsappTemplate ?? "";
  // Coerce legacy chatbot source to template
  const whatsappSource = (params.whatsappSource === "chatbot" ? "template" : params.whatsappSource) ?? "template";
  const whatsappCampaignId = params.whatsappCampaignId ?? "";
  const websiteNotificationMessage = params.websiteNotificationMessage ?? "";
  const smsMessage = params.smsMessage ?? "";
  const smsConnectedAccount = params.smsConnectedAccount ?? "";
  const emailConnectedAccount = params.emailConnectedAccount ?? "";
  const showCustomEmail = params.showCustomEmail ?? false;
  const emailSubject = params.emailSubject ?? "";
  const emailRichBody = params.emailRichBody ?? "";
  const emailHtmlBody = params.emailHtmlBody ?? "";
  const htmlBodyViewMode = params.htmlBodyViewMode ?? "code";

  const crmName = params.crmName ?? "";
  const crmField = params.crmField ?? "";
  const crmUpdateValue = params.crmUpdateValue ?? "";
  const ehrName = params.ehrName ?? "";
  const ehrField = params.ehrField ?? "";
  const ehrUpdateValue = params.ehrUpdateValue ?? "";

  const whatsappTemplateIdentifier = params.whatsappTemplateIdentifier ?? "";
  const apiSelectedIntegrationId = params.apiSelectedIntegrationId ?? "";
  const apiAction = params.apiAction ?? "";
  const apiCreateFields = params.apiCreateFields ?? [];
  const apiUpdateFields = params.apiUpdateFields ?? [];
  const apiReplaceFields = params.apiReplaceFields ?? [];
  const apiDeleteField = params.apiDeleteField ?? "";
  const webhookSelectedIntegrationId = params.webhookSelectedIntegrationId ?? "";
  const webhookParsedFields = params.webhookParsedFields ?? [];


  const fetchAvailCalendarUser = params.fetchAvailCalendarUser ?? "";
  const fetchAvailDateSource = params.fetchAvailDateSource ?? "";
  const fetchAvailTimeSource = params.fetchAvailTimeSource ?? "";
  const fetchAvailSummary = params.fetchAvailSummary ?? "";

  const fetchFieldSource = params.fetchFieldSource ?? "";
  const fetchFieldSelected = params.fetchFieldSelected ?? "";
  const fetchFieldReason = params.fetchFieldReason ?? "";

  const calendarMode = params.calendarMode ?? "book";
  const calendarMeetingId = params.calendarMeetingId ?? "";
  const calendarConnected = params.calendarConnected ?? "";
  const calendarDate = params.calendarDate ?? "";
  const calendarTime = params.calendarTime ?? "";

  const stepDetailProcess = params.stepDetailProcess ?? "";
  const stepDetailStage = params.stepDetailStage ?? "";

  const greetingPhrase = params.greetingPhrase ?? "";
  const bypassStepNumbers = params.bypassStepNumbers ?? [{ id: Date.now(), phoneNumber: "", countryCode: "+1" }];
  const ticketEntries = params.ticketEntries ?? [{
    taskName: "", taskDesc: "", assignee: "", deadline: "", priority: "Normal",
    clientEmail: "", clientNumber: "", pauseProcess: "No",
    checklist: [{ id: `check-${Date.now()}`, text: "" }]
  }];
  const collectInfoSelectedForm = params.collectInfoSelectedForm ?? "";
  const appointmentBookingMethod = params.appointmentBookingMethod ?? "";
  const callAnalysisScenarios = params.callAnalysisScenarios ?? [];
  const autoHangupSilenceStageDuration = params.autoHangupSilenceStageDuration ?? 5;
  const callHangupMessage = params.callHangupMessage ?? "";
  const idleMessageStageText = params.idleMessageStageText ?? "";
  const idleMessageStageDelay = params.idleMessageStageDelay ?? 30;
  const idleHangupMessageStage = params.idleHangupMessageStage ?? "";
  const idleHangupDelayStage = params.idleHangupDelayStage ?? 60;

  // Render method helper
  const renderField = (label: React.ReactNode, element: React.ReactNode) => (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-[#020817]" style={{ fontFamily: "DM Sans, sans-serif" }}>
        {label}
      </label>
      {element}
    </div>
  );

  const renderConditionRulesBuilder = (title = "Condition Rules") => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <Split className="w-4 h-4 text-blue-600" />
            <span>{title}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setFieldModalMode("conditionNodeMulti");
              setIsFieldRegistryModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Select Fields from Registry</span>
          </button>
        </div>

        {conditionRules.map((cond, index) => {
          const fieldDef = getFieldDefByKey(cond.field);
          const operators = getOperatorsForField(fieldDef);
          const isNullaryOp = cond.operator === "Is Empty" || cond.operator === "Is Not Empty";
          const isDynamic = cond.valueType === "dynamic";
          const dynamicFieldDef = cond.dynamicField ? getFieldDefByKey(cond.dynamicField) : null;

          return (
            <div key={cond.id || index} className="border border-border rounded-xl overflow-hidden bg-white p-3.5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Condition #{index + 1}</span>
                {conditionRules.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const updated = conditionRules.filter((_, i) => i !== index);
                      onChange({ conditions: updated, triggerConditions: updated });
                    }}
                    className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
              </div>

              {/* Field Selection (Primary Field) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-700">Primary Field</label>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetConditionIndex(index);
                      setFieldModalMode("conditionNodeSingle");
                      setIsFieldRegistryModalOpen(true);
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                  >
                    {cond.field ? "Change Field" : "Select from Registry"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTargetConditionIndex(index);
                    setFieldModalMode("conditionNodeSingle");
                    setIsFieldRegistryModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50/70 hover:bg-white hover:border-blue-400 transition-all text-left cursor-pointer"
                >
                  {cond.field ? (
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
                        {cond.fieldSource || fieldDef?.module || "field"}
                      </span>
                      <span className="font-semibold text-slate-900 truncate">
                        {cond.fieldLabel || fieldDef?.label || cond.field}
                      </span>
                      <code className="text-[10px] text-slate-400 font-mono">({cond.field})</code>
                    </div>
                  ) : (
                    <span className="text-slate-400">Click to select primary field from registry...</span>
                  )}
                  <Sliders className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-2" />
                </button>
              </div>

              {/* Operator */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Operator</label>
                <select
                  value={cond.operator || "Equal To"}
                  onChange={(e) => {
                    const newOp = e.target.value;
                    const updated = conditionRules.map((c, i) =>
                      i === index ? { ...c, operator: newOp } : c
                    );
                    onChange({ conditions: updated, triggerConditions: updated });
                  }}
                  className="w-full px-3 py-2 bg-white border border-border rounded-xl text-xs font-medium focus:border-blue-500 outline-none cursor-pointer"
                >
                  {operators.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Comparison Value (Static vs Dynamic) */}
              {!isNullaryOp && (
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-700">Comparison Value</label>
                    {/* Segmented Toggle for Static vs Dynamic */}
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = conditionRules.map((c, i) =>
                            i === index ? { ...c, valueType: "static" as const } : c
                          );
                          onChange({ conditions: updated, triggerConditions: updated });
                        }}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                          !isDynamic
                            ? "bg-white text-blue-700 shadow-2xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Static Value
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = conditionRules.map((c, i) =>
                            i === index ? { ...c, valueType: "dynamic" as const } : c
                          );
                          onChange({ conditions: updated, triggerConditions: updated });
                        }}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                          isDynamic
                            ? "bg-white text-blue-700 shadow-2xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Dynamic Field
                      </button>
                    </div>
                  </div>

                  {isDynamic ? (
                    /* Dynamic Field Picker */
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setTargetConditionIndex(index);
                          setFieldModalMode("conditionNodeDynamic");
                          setIsFieldRegistryModalOpen(true);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs border border-blue-200 rounded-lg bg-blue-50/30 hover:bg-blue-50 hover:border-blue-400 transition-all text-left cursor-pointer"
                      >
                        {cond.dynamicField ? (
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
                              {cond.dynamicFieldSource || dynamicFieldDef?.module || "field"}
                            </span>
                            <span className="font-semibold text-slate-900 truncate">
                              {cond.dynamicFieldLabel || dynamicFieldDef?.label || cond.dynamicField}
                            </span>
                            <code className="text-[10px] text-slate-400 font-mono">({cond.dynamicField})</code>
                          </div>
                        ) : (
                          <span className="text-blue-500">Select dynamic field to compare against...</span>
                        )}
                        <Sliders className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-2" />
                      </button>
                      <p className="text-[10px] text-slate-400">
                        Compares {cond.fieldLabel || cond.field || "primary field"} dynamically against {cond.dynamicFieldLabel || cond.dynamicField || "selected secondary field"}.
                      </p>
                    </div>
                  ) : (
                    /* Static Value Input */
                    renderFieldValueInput(
                      cond.field,
                      cond.fieldSource || fieldDef?.module,
                      cond.value,
                      (newVal) => {
                        const updated = conditionRules.map((c, i) =>
                          i === index ? { ...c, value: newVal } : c
                        );
                        onChange({ conditions: updated, triggerConditions: updated });
                      },
                      "Enter static value..."
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              setFieldModalMode("conditionNodeMulti");
              setIsFieldRegistryModalOpen(true);
            }}
            className="flex-1 py-2 text-xs border border-dashed border-blue-300 text-blue-600 bg-blue-50/20 hover:bg-blue-50/50 rounded-lg flex items-center justify-center gap-1.5 font-semibold cursor-pointer transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" /> Select Fields from Registry
          </button>
          <button
            type="button"
            onClick={() => {
              const newRule = {
                id: `cond-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                field: "",
                fieldLabel: "",
                fieldSource: "client",
                operator: "Equal To",
                valueType: "static" as const,
                value: "",
              };
              onChange({
                conditions: [...conditionRules, newRule],
                triggerConditions: [...conditionRules, newRule],
              });
            }}
            className="py-2 px-3 text-xs border border-dashed border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg flex items-center justify-center gap-1 font-medium cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Blank
          </button>
        </div>
      </div>
    );
  };

  const stepId = params.sourceStepId || params.id || "condition";

  // Derive condition cases from params
  const conditionCases: ConditionCase[] = useMemo(() => {
    if (Array.isArray(params.cases) && params.cases.length > 0) {
      return params.cases;
    }
    // Backward compatibility from flat conditions
    if (Array.isArray(params.conditions) && params.conditions.length > 0) {
      return [
        {
          id: `${stepId}-case-1`,
          name: "Case 1",
          matchLogic: (params.matchLogic === "any" || params.matchLogic === "OR") ? "OR" : "AND",
          conditions: params.conditions.map((c: any) => ({
            id: c.id || `cond-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            field: c.field || "",
            fieldLabel: c.fieldLabel || "",
            fieldSource: c.fieldSource || "client",
            operator: c.operator || "Equal To",
            valueType: c.valueType || "static",
            value: c.value ?? "",
            dynamicField: c.dynamicField || "",
            dynamicFieldLabel: c.dynamicFieldLabel || "",
            dynamicFieldSource: c.dynamicFieldSource || "",
            logicOp: (c.logicOp === "OR" ? "OR" : "AND") as "AND" | "OR",
          })),
        }
      ];
    }
    return [
      {
        id: `${stepId}-case-1`,
        name: "Case 1",
        matchLogic: "AND",
        conditions: [
          {
            id: `cond-1`,
            field: "",
            fieldLabel: "",
            fieldSource: "client",
            operator: "Equal To",
            valueType: "static",
            value: "",
            logicOp: "AND",
          }
        ]
      }
    ];
  }, [params.cases, params.conditions, params.matchLogic, stepId]);

  const updateCases = (nextCases: ConditionCase[]) => {
    const currentBranches: any[] = Array.isArray(params.branches) ? params.branches : [];
    const elseBranchId = params.elseBranchId || `${stepId}-else`;

    // Find existing else branch to preserve its steps
    const existingElse = currentBranches.find(
      (b: any) => b.id === elseBranchId || b.id === "else" || b.id.endsWith("-else") || b.name === "Else"
    ) || {
      id: elseBranchId,
      name: "Else",
      steps: [],
    };

    // For each case, map to branch preserving existing steps
    const caseBranches = nextCases.map((c, idx) => {
      const existing = currentBranches.find((b: any) => b.id === c.id);
      return {
        id: c.id,
        name: c.name || `Case ${idx + 1}`,
        steps: existing?.steps || [],
      };
    });

    const newBranches = [...caseBranches, existingElse];

    onChange({
      cases: nextCases,
      branches: newBranches,
      branchCount: newBranches.length,
      elseBranchId: existingElse.id,
      conditionsEnabled: true,
      conditions: nextCases[0]?.conditions || [],
    });
  };

  const handleAddCase = () => {
    const nextIdx = conditionCases.length + 1;
    const newCaseId = `${stepId}-case-${nextIdx}-${Date.now().toString(36).substring(4)}`;
    const newCase: ConditionCase = {
      id: newCaseId,
      name: `Case ${nextIdx}`,
      matchLogic: "AND",
      conditions: [
        {
          id: `cond-${Date.now()}-1`,
          field: "",
          fieldLabel: "",
          fieldSource: "client",
          operator: "Equal To",
          valueType: "static",
          value: "",
          logicOp: "AND",
        }
      ]
    };
    updateCases([...conditionCases, newCase]);
  };

  const handleRemoveCase = (caseIndex: number) => {
    if (conditionCases.length <= 1) {
      toast.error("Condition must have at least 1 Case plus the Else branch.");
      return;
    }
    const nextCases = conditionCases.filter((_, idx) => idx !== caseIndex);
    updateCases(nextCases);
  };

  const handleRenameCase = (caseIndex: number, newName: string) => {
    const nextCases = conditionCases.map((c, idx) =>
      idx === caseIndex ? { ...c, name: newName } : c
    );
    updateCases(nextCases);
  };

  const handleToggleCaseLogic = (caseIndex: number, logic: "AND" | "OR") => {
    const nextCases = conditionCases.map((c, idx) =>
      idx === caseIndex ? { ...c, matchLogic: logic } : c
    );
    updateCases(nextCases);
  };

  const handleToggleConditionLogicOp = (caseIndex: number, condIndex: number, forcedOp?: "AND" | "OR") => {
    const nextCases = conditionCases.map((c, cIdx) => {
      if (cIdx !== caseIndex) return c;
      const nextConds: ConditionCaseRule[] = c.conditions.map((cond, condIdx) => {
        if (condIdx !== condIndex) return cond;
        const nextOp: "AND" | "OR" = forcedOp || (cond.logicOp === "OR" ? "AND" : "OR");
        return { ...cond, logicOp: nextOp };
      });
      return { ...c, conditions: nextConds };
    });
    updateCases(nextCases);
  };

  const handleAddConditionToCase = (caseIndex: number) => {
    const newCond: ConditionCaseRule = {
      id: `cond-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      field: "",
      fieldLabel: "",
      fieldSource: "client",
      operator: "Equal To",
      valueType: "static",
      value: "",
      logicOp: "AND",
    };
    const nextCases = conditionCases.map((c, idx) =>
      idx === caseIndex ? { ...c, conditions: [...c.conditions, newCond] } : c
    );
    updateCases(nextCases);
  };

  const handleRemoveConditionFromCase = (caseIndex: number, condIndex: number) => {
    const targetCase = conditionCases[caseIndex];
    if (targetCase.conditions.length <= 1) {
      toast.error("Each case must have at least 1 condition rule.");
      return;
    }
    const nextCases = conditionCases.map((c, idx) => {
      if (idx !== caseIndex) return c;
      return {
        ...c,
        conditions: c.conditions.filter((_, i) => i !== condIndex),
      };
    });
    updateCases(nextCases);
  };

  const handleUpdateConditionInCase = (
    caseIndex: number,
    condIndex: number,
    patch: Partial<ConditionCaseRule>
  ) => {
    const nextCases = conditionCases.map((c, cIdx) => {
      if (cIdx !== caseIndex) return c;
      const nextConds = c.conditions.map((cond, condIdx) => {
        if (condIdx !== condIndex) return cond;
        return { ...cond, ...patch };
      });
      return { ...c, conditions: nextConds };
    });
    updateCases(nextCases);
  };

  const renderConditionCasesBuilder = () => {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Split className="w-4 h-4 text-blue-600" />
              <span>Condition Cases</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Each case branches execution independently. Unmatched runs flow to Else.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddCase}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Case</span>
          </button>
        </div>

        {/* Case Cards List */}
        <div className="space-y-4">
          {conditionCases.map((caseItem, caseIndex) => {
            const caseNumber = caseIndex + 1;
            const caseKey = caseItem.id || `case-${caseIndex}`;
            const isCollapsed = Boolean(collapsedCases[caseKey]);

            return (
              <div
                key={caseKey}
                className="border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden"
              >
                {/* Collapsible Case Header */}
                <div
                  onClick={() => toggleCaseCollapse(caseKey)}
                  className="flex items-center justify-between gap-2 p-3 bg-slate-50/80 border-b border-slate-200/70 cursor-pointer select-none hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <button
                      type="button"
                      className="p-0.5 text-slate-400 hover:text-slate-600 rounded transition-transform"
                      aria-label={isCollapsed ? "Expand case" : "Collapse case"}
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isCollapsed ? "-rotate-90" : "rotate-0"
                        }`}
                      />
                    </button>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-white text-slate-700 border border-slate-200 shrink-0 shadow-2xs">
                      CASE {caseNumber}
                    </span>
                    <input
                      type="text"
                      value={caseItem.name || `Case ${caseNumber}`}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleRenameCase(caseIndex, e.target.value)}
                      placeholder={`Case ${caseNumber} Name...`}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg focus:border-blue-500 focus:bg-white outline-none w-44 truncate"
                    />
                    <span className="text-[11px] text-slate-500 font-medium ml-1">
                      • {caseItem.conditions.length} condition{caseItem.conditions.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Delete Case button */}
                    {conditionCases.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCase(caseIndex)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title={`Delete Case ${caseNumber}`}
                        aria-label={`Delete Case ${caseNumber}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Collapsible Content */}
                {!isCollapsed && (
                  <div className="p-4 space-y-3.5 bg-white">
                    {/* Conditions in this Case */}
                    <div className="space-y-3">
                  {caseItem.conditions.map((cond, condIdx) => {
                    const fieldDef = getFieldDefByKey(cond.field);
                    const operators = getOperatorsForField(fieldDef);
                    const isNullaryOp = cond.operator === "Is Empty" || cond.operator === "Is Not Empty";
                    const isDynamic = cond.valueType === "dynamic" && Boolean(cond.dynamicField);
                    const dynamicFieldDef = cond.dynamicField ? getFieldDefByKey(cond.dynamicField) : null;
                    const isNotLast = condIdx < caseItem.conditions.length - 1;

                    return (
                      <React.Fragment key={cond.id || `cond-${condIdx}`}>
                        <div className="border border-slate-200 rounded-xl bg-slate-50/40 p-3.5 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-500">
                              Condition #{condIdx + 1}
                            </span>
                            {caseItem.conditions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveConditionFromCase(caseIndex, condIdx)}
                                className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer font-medium"
                              >
                                <Trash2 className="w-3 h-3" /> Remove
                              </button>
                            )}
                          </div>

                          {/* Primary Field Selection */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                Primary Field
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  setTargetCaseIndex(caseIndex);
                                  setTargetCaseConditionIndex(condIdx);
                                  setFieldModalMode("caseConditionSingle");
                                  setIsFieldRegistryModalOpen(true);
                                }}
                                className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                              >
                                {cond.field ? "Change Field" : "Select Field"}
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setTargetCaseIndex(caseIndex);
                                setTargetCaseConditionIndex(condIdx);
                                setFieldModalMode("caseConditionSingle");
                                setIsFieldRegistryModalOpen(true);
                              }}
                              className="w-full flex items-center justify-between px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-white hover:border-blue-400 transition-all text-left cursor-pointer"
                            >
                              {cond.field ? (
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
                                    {cond.fieldSource || fieldDef?.module || "field"}
                                  </span>
                                  <span className="font-semibold text-slate-900 truncate">
                                    {cond.fieldLabel || fieldDef?.label || cond.field}
                                  </span>
                                  <code className="text-[10px] text-slate-400 font-mono">({cond.field})</code>
                                </div>
                              ) : (
                                <span className="text-slate-400">Select field...</span>
                              )}
                              <Sliders className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
                            </button>
                          </div>

                          {/* Operator */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                              Operator
                            </label>
                            <select
                              value={cond.operator || "Equal To"}
                              onChange={(e) => handleUpdateConditionInCase(caseIndex, condIdx, { operator: e.target.value })}
                              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-blue-500 outline-none cursor-pointer"
                            >
                              {operators.map((op) => (
                                <option key={op.value} value={op.value}>
                                  {op.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Comparison Value (Matching Field Type by Default) */}
                          {!isNullaryOp && (
                            <div className="space-y-1.5 pt-1 border-t border-slate-100">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                  Comparison Value
                                </label>
                                {isDynamic && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateConditionInCase(caseIndex, condIdx, {
                                        valueType: "static",
                                        dynamicField: "",
                                        dynamicFieldLabel: "",
                                        dynamicFieldSource: "",
                                      })
                                    }
                                    className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                                  >
                                    Clear field
                                  </button>
                                )}
                              </div>

                              {isDynamic && cond.dynamicField ? (
                                <div className="w-full flex items-center justify-between px-3.5 py-2 text-xs border border-blue-200 rounded-xl bg-blue-50/40 text-left">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
                                      {cond.dynamicFieldSource || dynamicFieldDef?.module || "field"}
                                    </span>
                                    <span className="font-semibold text-slate-900 truncate">
                                      {cond.dynamicFieldLabel || dynamicFieldDef?.label || cond.dynamicField}
                                    </span>
                                    <code className="text-[10px] text-slate-400 font-mono">({cond.dynamicField})</code>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0 ml-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setTargetCaseIndex(caseIndex);
                                        setTargetCaseConditionIndex(condIdx);
                                        setFieldModalMode("caseConditionDynamic");
                                        setIsFieldRegistryModalOpen(true);
                                      }}
                                      className="p-1 rounded text-blue-600 hover:text-blue-700 hover:bg-blue-100/60 cursor-pointer transition-colors"
                                      title="Select field"
                                      aria-label="Select field"
                                    >
                                      <Sliders className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateConditionInCase(caseIndex, condIdx, {
                                          valueType: "static",
                                          dynamicField: "",
                                          dynamicFieldLabel: "",
                                          dynamicFieldSource: "",
                                        })
                                      }
                                      className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
                                      title="Clear and switch to static value"
                                      aria-label="Clear"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                renderFieldValueInput(
                                  cond.field,
                                  cond.fieldSource || fieldDef?.module,
                                  cond.value,
                                  (newVal) => handleUpdateConditionInCase(caseIndex, condIdx, { value: newVal, valueType: "static" }),
                                  "Enter value...",
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTargetCaseIndex(caseIndex);
                                      setTargetCaseConditionIndex(condIdx);
                                      setFieldModalMode("caseConditionDynamic");
                                      setIsFieldRegistryModalOpen(true);
                                    }}
                                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                    title="Select field from modal"
                                    aria-label="Select field"
                                  >
                                    <Sliders className="w-3.5 h-3.5" />
                                  </button>
                                )
                              )}
                            </div>
                          )}
                        </div>

                        {/* Match Dropdown between conditions */}
                        {isNotLast && (
                          <div className="flex items-center gap-2 my-2.5 justify-center">
                            <div className="h-px bg-slate-200 flex-1" />
                            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 shadow-2xs">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                Match
                              </span>
                              <select
                                value={cond.logicOp || caseItem.matchLogic || "AND"}
                                onChange={(e) => {
                                  const op = e.target.value as "AND" | "OR";
                                  handleToggleConditionLogicOp(caseIndex, condIdx, op);
                                }}
                                className="text-xs font-bold text-slate-800 bg-transparent border-none outline-none cursor-pointer"
                              >
                                <option value="AND">ALL (AND)</option>
                                <option value="OR">ANY (OR)</option>
                              </select>
                            </div>
                            <div className="h-px bg-slate-200 flex-1" />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Case Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetCaseIndex(caseIndex);
                      setFieldModalMode("caseConditionMulti");
                      setIsFieldRegistryModalOpen(true);
                    }}
                    className="flex-1 py-2 text-xs border border-dashed border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-xl flex items-center justify-center gap-1.5 font-semibold cursor-pointer transition-colors shadow-2xs"
                  >
                    <Sliders className="w-3.5 h-3.5 text-slate-500" />
                    <span>Select Fields</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddConditionToCase(caseIndex)}
                    className="flex-1 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-1.5 font-semibold cursor-pointer transition-colors shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Condition</span>
                  </button>
                </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Add Case */}
        <button
          type="button"
          onClick={handleAddCase}
          className="w-full py-2.5 text-xs font-semibold border-2 border-dashed border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5 text-slate-500" />
          <span>Add Another Case</span>
        </button>
      </div>
    );
  };


  const renderTriggerConfigEditor = () => {
    const activeCategory = (params.category || (
      params.selectedEvent?.startsWith("process") ? "process" :
      params.selectedEvent?.startsWith("client") ? "client" :
      params.selectedEvent?.startsWith("appointment") ? "appointment" :
      params.selectedEvent?.startsWith("invoice") ? "invoice" :
      params.selectedEvent?.startsWith("call") ? "call" :
      params.selectedEvent?.startsWith("ai") ? "ai" :
      "process"
    )).toLowerCase();

    const currentEvent = params.selectedEvent || (activeCategory === "ai" ? "ai.prompt" : `${activeCategory}.created`);

    const triggerOptionsByCategory: Record<string, Array<{ event: string; label: string; desc: string; iconKey: string }>> = {
      process: [
        { event: "process.created", label: "Created", desc: "Fires when a new process workflow is enrolled or created", iconKey: "workflow" },
        { event: "process.updated", label: "Updated", desc: "Fires when an existing process workflow record or stage is updated", iconKey: "workflow" },
      ],
      client: [
        { event: "client.created", label: "Created", desc: "Fires when a new client record is added to CRM", iconKey: "user" },
        { event: "client.updated", label: "Updated", desc: "Fires when client profile details or fields are modified", iconKey: "user" },
      ],
      appointment: [
        { event: "appointment.created", label: "Created", desc: "Fires when a new appointment booking is created", iconKey: "calendar" },
        { event: "appointment.updated", label: "Updated", desc: "Fires when appointment details or schedule are updated", iconKey: "calendar" },
      ],
      invoice: [
        { event: "invoice.created", label: "Created", desc: "Fires when a billing invoice is created or drafted", iconKey: "receipt" },
        { event: "invoice.updated", label: "Updated", desc: "Fires when an invoice record or status is modified", iconKey: "receipt" },
      ],
      call: [
        { event: "call.created", label: "Created", desc: "Fires when a new call session is initiated or logged", iconKey: "phone" },
        { event: "call.updated", label: "Updated", desc: "Fires when call metadata, transcript, or status updates", iconKey: "phone" },
      ],
      ai: [
        { event: "ai.prompt", label: "AI Prompt Trigger", desc: "Fires when prompt evaluation matches", iconKey: "sparkles" },
      ],
    };

    const currentOptions = triggerOptionsByCategory[activeCategory] || triggerOptionsByCategory.process;

    const handleEventSelect = (opt: { event: string; label: string; desc: string; iconKey: string }) => {
      onChange({
        selectedEvent: opt.event,
        triggerEvent: opt.event,
        triggerLabel: opt.label === "Created" ? `${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Created` : opt.label === "Updated" ? `${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Updated` : opt.label,
        triggerDescription: opt.desc,
        triggerIconKey: opt.iconKey,
      });
    };

    const selectedProcId = (params.triggerProcessId && params.triggerProcessId !== "all")
      ? params.triggerProcessId
      : (effectiveProcesses[0]?.id || "");

    return (
      <div className="w-full rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-5">
        {/* Process Filter MUST be above Created or Updated */}
        {activeCategory === "process" && (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Choose Process <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedProcId}
              onChange={(e) => {
                const pId = e.target.value;
                const proc = effectiveProcesses.find((p: any) => p.id === pId);
                onChange({
                  triggerProcessId: pId,
                  triggerProcessName: proc?.name || "",
                });
              }}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
            >
              {effectiveProcesses.map((proc: any) => (
                <option key={proc.id} value={proc.id}>
                  {proc.name} {proc.entityType ? `(${proc.entityType})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Events: For Non-AI Categories: ONLY Created or Updated */}
        {activeCategory !== "ai" ? (
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
              Event: Created or Updated
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {currentOptions.map((opt) => {
                const isSelected = currentEvent === opt.event;
                return (
                  <div
                    key={opt.event}
                    onClick={() => handleEventSelect(opt)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? "bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 shadow-2xs"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                    }`}
                  >
                    <div
                      className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold ${isSelected ? "text-blue-900" : "text-slate-900"}`}>
                        {opt.label}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {opt.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Clean Prompt Adding Area */
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold text-slate-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  Trigger Prompt <span className="text-rose-500">*</span>
                </label>
                <InfoTooltip text="Specify natural language conditions for the AI to evaluate. When met, this automation triggers." />
              </div>
              <button
                type="button"
                onClick={() => {
                  setFieldModalMode("aiTriggerPromptToken");
                  setIsFieldRegistryModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Select Field</span>
              </button>
            </div>
            <textarea
              rows={4}
              value={params.prompt || params.aiTriggerPrompt || ""}
              onChange={(e) => onChange({ prompt: e.target.value, aiTriggerPrompt: e.target.value })}
              placeholder="e.g. Trigger when client requests urgent prescription refill, or expresses intent to cancel contract..."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-y"
            />
          </div>
        )}
      </div>
    );
  };


  const renderProcessFieldsCardList = (
    proc: any,
    targetModule: "process" | "appointment" | "invoice",
    currentStageVal?: string
  ) => {
    if (!proc) return null;

    const allModFields = getAllFields(targetModule);
    const matchingProcFields = allModFields.filter((f) => {
      if (!f.processIds || f.processIds.length === 0 || f.processIds.includes("all") || f.processIds.includes("*")) {
        return true;
      }
      return proc && (f.processIds.includes(proc.id) || f.processIds.includes(proc.name));
    });

    const requiredFields = matchingProcFields.filter((f) => {
      if (f.required) return true;
      if (f.requiredStages && currentStageVal) {
        if (f.requiredStages.includes(currentStageVal) || f.requiredStages.includes("*")) return true;
      }
      if (targetModule === "process" && ["deal_name", "title", "client_name"].includes(f.key)) {
        return true;
      }
      return false;
    });

    const otherFields = matchingProcFields.filter(
      (f) => !requiredFields.some((rf) => rf.key === f.key)
    );

    const processFieldValues: Record<string, any> = params.processFields || {};

    const handleFieldValueChange = (fieldKey: string, val: any) => {
      onChange({
        processFields: {
          ...processFieldValues,
          [fieldKey]: val,
        },
      });
    };

    const handleOpenFieldModal = (fieldKey: string) => {
      setTargetProcessFieldKey(fieldKey);
      setFieldModalMode("assignProcessFieldToken");
      setIsFieldRegistryModalOpen(true);
    };

    const renderFieldCard = (f: any, isRequired: boolean) => {
      const val = processFieldValues[f.key] ?? "";

      return (
        <div
          key={f.key}
          className={`p-3.5 bg-white border rounded-xl space-y-2.5 transition-all shadow-2xs hover:shadow-xs ${
            isRequired
              ? "border-slate-200/90 hover:border-blue-300"
              : "border-slate-200/80 hover:border-slate-300"
          }`}
        >
          {/* Card Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="text-xs font-bold text-slate-800 truncate"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {f.label}
              </span>
              {isRequired && (
                <span className="text-red-500 font-bold text-xs" title="Mandatory field">*</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200/80 font-mono">
                {f.inputType || "text"}
              </span>
              <button
                type="button"
                onClick={() => handleOpenFieldModal(f.key)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100 border border-blue-200/80 rounded-lg transition-colors cursor-pointer shadow-2xs"
                title="Select field from registry modal"
              >
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                <span>Select Field</span>
              </button>
            </div>
          </div>

          {/* Card Input */}
          <div className="relative flex items-center">
            <input
              type="text"
              value={val}
              onChange={(e) => handleFieldValueChange(f.key, e.target.value)}
              placeholder={
                isRequired
                  ? `Enter value or click "Select Field" for ${f.label.toLowerCase()}...`
                  : `Optional value for ${f.label.toLowerCase()}...`
              }
              className={`w-full pl-3 pr-8 py-2 text-xs border rounded-lg bg-slate-50/40 hover:bg-white focus:bg-white focus:outline-none transition-all ${
                isRequired && !val
                  ? "border-amber-300/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              }`}
            />
            {val ? (
              <button
                type="button"
                onClick={() => handleFieldValueChange(f.key, "")}
                className="absolute right-2 text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                title="Clear field value"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-4 pt-1">
        {/* REQUIRED FIELDS SECTION */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between pb-0.5">
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-bold text-slate-800 uppercase tracking-wider"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Required Fields
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200/70 leading-none">
                Must be filled
              </span>
              <InfoTooltip text="Mandatory fields that must be populated when enrolling into or moving to this stage." />
            </div>
            <span className="text-[11px] text-slate-400 font-semibold">
              {requiredFields.length} field{requiredFields.length === 1 ? "" : "s"}
            </span>
          </div>

          {requiredFields.length === 0 ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 italic">
              No mandatory required fields configured for this workflow.
            </div>
          ) : (
            <div className="space-y-2.5">
              {requiredFields.map((f) => renderFieldCard(f, true))}
            </div>
          )}
        </div>

        {/* OPTIONAL FIELDS DROPDOWN */}
        {otherFields.length > 0 && (
          <div className="pt-3 border-t border-slate-200/80 space-y-2.5">
            <button
              type="button"
              onClick={() => setOptionalFieldsExpanded(!optionalFieldsExpanded)}
              className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50 transition-colors text-left cursor-pointer group select-none"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="text-xs font-bold text-slate-800 uppercase tracking-wider group-hover:text-blue-600 transition-colors"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Optional Fields
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 leading-none">
                  {otherFields.length} optional
                </span>
                <div onClick={(e) => e.stopPropagation()}>
                  <InfoTooltip text="Optionally populate or update additional workflow fields when this action executes." />
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 shrink-0 ${
                  optionalFieldsExpanded ? "rotate-180" : ""
                }`}
              />
            </button>

            {optionalFieldsExpanded && (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1 pt-1">
                {otherFields.map((f) => renderFieldCard(f, false))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (stepKey === "automation_overview") {
    return (
      <div className="space-y-5 text-left">
        {/* Automation Name */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Automation Name
          </label>
          <input
            type="text"
            value={params.name || params.automationName || ""}
            onChange={(e) => onChange({ name: e.target.value, automationName: e.target.value })}
            placeholder="e.g. Appointment Booking and Invoice Generation"
            className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-gray-900"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Description
          </label>
          <textarea
            value={params.description || params.automationDescription || ""}
            onChange={(e) => onChange({ description: e.target.value, automationDescription: e.target.value })}
            placeholder="Explain why this automation exists and what it accomplishes..."
            rows={3}
            className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-gray-900 resize-none"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Status
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChange({ status: "active", automationStatus: "active" })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                (params.status ?? params.automationStatus ?? "active") === "active"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Active
            </button>
            <button
              type="button"
              onClick={() => onChange({ status: "draft", automationStatus: "draft" })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                (params.status ?? params.automationStatus) === "draft"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Draft
            </button>
          </div>
        </div>

        {/* Admin Scope Components */}
        {(isAdmin || params.isAdmin) && (
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <AdminControlAccordion
              scopingRules={params.scopingRules || scopingRules || []}
              onScopingRulesChange={(newRules) => {
                onChange({ scopingRules: newRules });
              }}
              defaultAdminControlOpen={true}
              defaultScopeOpen={true}
              defaultPermissionsOpen={false}
              scopeTooltip="Define tenant scope rules. Visibility by tenant industry category, industries, and locations."
              permissionsTooltip="Configure what tenant users are permitted to do with this automation rule."
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* ───────────── TRIGGER CONFIGURATION EDITOR ───────────── */}
      {stepKey === "trigger_config" && renderTriggerConfigEditor()}

            {/* ───────────── CONDITION STEP (Cases rendered directly without outer Parameters accordion) ───────────── */}
      {stepKey === "condition" && (
        <div className="w-full">
          {renderConditionCasesBuilder()}
        </div>
      )}

      {/* ───────────── PARAMETERS FIELDS ACCORDION (For other steps) ───────────── */}
      {stepKey !== "condition" && stepKey !== "trigger_config" && (
        <div className="w-full rounded-xl border border-gray-200 overflow-hidden bg-white">
          <div
            onClick={() => setParametersSectionExpanded(!parametersSectionExpanded)}
            className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
          >
            <span className="text-sm font-semibold text-[#020817]" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Parameters
            </span>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform ${parametersSectionExpanded ? "rotate-180" : ""}`}
            />
          </div>

        {parametersSectionExpanded && (
          <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50/40">
            {(stepKey === "wait" || stepKey === "delay") && (() => {
              const delayVal = params.delayValue ?? params.duration ?? 5;
              const delayUnit = (params.delayUnit ?? params.unit ?? "minutes").toLowerCase();

              const unitOptions = [
                { value: "seconds", label: "Seconds (sec)" },
                { value: "minutes", label: "Minutes (min)" },
                { value: "hours", label: "Hours (hour)" },
                { value: "days", label: "Days (day)" },
                { value: "weeks", label: "Weeks (week)" },
                { value: "months", label: "Months (month)" },
              ];

              const normalizedUnit = unitOptions.some((u) => u.value === delayUnit)
                ? delayUnit
                : delayUnit.startsWith("sec")
                ? "seconds"
                : delayUnit.startsWith("hour")
                ? "hours"
                : delayUnit.startsWith("day")
                ? "days"
                : delayUnit.startsWith("week")
                ? "weeks"
                : delayUnit.startsWith("month")
                ? "months"
                : "minutes";

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {renderField(
                      "Wait Quantity / Value",
                      <input
                        type="number"
                        min="1"
                        value={delayVal}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          onChange({ delayValue: val, duration: val });
                        }}
                        className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white outline-none focus:border-blue-500 transition-colors"
                        placeholder="e.g. 5"
                      />
                    )}

                    {renderField(
                      "Wait Unit",
                      <select
                        value={normalizedUnit}
                        onChange={(e) => {
                          onChange({ delayUnit: e.target.value, unit: e.target.value });
                        }}
                        className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white outline-none focus:border-blue-500 transition-colors cursor-pointer"
                      >
                        {unitOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="p-3 bg-blue-50/60 border border-blue-200/70 rounded-xl flex items-start gap-2.5 text-blue-900 text-xs">
                    <Clock className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-blue-950">
                        Workflow Execution Pause
                      </p>
                      <p className="mt-0.5 text-blue-800/80 leading-relaxed">
                        Execution will pause for{" "}
                        <span className="font-bold underline">
                          {delayVal} {normalizedUnit}
                        </span>{" "}
                        before continuing to the next action step.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {(stepKey === "fieldupdate" || stepKey === "field-update") && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Sliders className="w-4 h-4 text-blue-600" />
                    <span>Field Update Blocks</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFieldModalMode("fieldUpdateMulti");
                      setIsFieldRegistryModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Select Fields from Registry</span>
                  </button>
                </div>

                {fieldUpdateBlocks.map((block: any, index: number) => (
                  <div key={index} className="border border-border rounded-lg overflow-hidden bg-white p-3 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">Block #{index + 1}</span>
                      {fieldUpdateBlocks.length > 1 && (
                        <button
                          onClick={() => onChange({ fieldUpdateBlocks: fieldUpdateBlocks.filter((_: any, i: number) => i !== index) })}
                          className="text-xs text-red-500 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      )}
                    </div>

                    {/* Field Registry Selector */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-slate-700">Target Field to Update</label>
                        <button
                          type="button"
                          onClick={() => {
                            setTargetFieldUpdateIndex(index);
                            setFieldModalMode("fieldUpdateSingle");
                            setIsFieldRegistryModalOpen(true);
                          }}
                          className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                        >
                          {block.fieldToEdit && block.fieldToEdit !== "Select field..." ? "Change Field" : "Select from Registry"}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTargetFieldUpdateIndex(index);
                          setFieldModalMode("fieldUpdateSingle");
                          setIsFieldRegistryModalOpen(true);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50/70 hover:bg-white hover:border-blue-400 transition-all text-left cursor-pointer"
                      >
                        {block.fieldToEdit && block.fieldToEdit !== "Select field..." ? (
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
                              {block.fieldType || "field"}
                            </span>
                            <span className="font-semibold text-slate-900 truncate">
                              {block.fieldLabel || block.fieldToEdit}
                            </span>
                            <code className="text-[10px] text-slate-400 font-mono">({block.fieldToEdit})</code>
                          </div>
                        ) : (
                          <span className="text-slate-400">Click to select field from registry...</span>
                        )}
                        <Sliders className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-2" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={block.valueSource}
                        onChange={e => {
                          const updated = fieldUpdateBlocks.map((b: any, i: number) => i === index ? { ...b, valueSource: e.target.value, updateValue: "" } : b);
                          onChange({ fieldUpdateBlocks: updated });
                        }}
                        className="w-full px-3 py-2 text-xs border rounded-md bg-white cursor-pointer font-medium"
                      >
                        <option value="static">Static Value</option>
                        <option value="variable">Variable / Formula</option>
                      </select>
                      {block.valueSource === "variable" ? (
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            value={block.updateValue}
                            placeholder="e.g. {{client_name}} or formula..."
                            onChange={e => {
                              const updated = fieldUpdateBlocks.map((b: any, i: number) => i === index ? { ...b, updateValue: e.target.value } : b);
                              onChange({ fieldUpdateBlocks: updated });
                            }}
                            className="w-full px-3 py-2 text-xs border rounded-md"
                          />
                        </div>
                      ) : (
                        renderFieldValueInput(
                          block.fieldToEdit,
                          block.fieldType,
                          block.updateValue,
                          (newVal) => {
                            const updated = fieldUpdateBlocks.map((b: any, i: number) => i === index ? { ...b, updateValue: newVal } : b);
                            onChange({ fieldUpdateBlocks: updated });
                          },
                          "New value..."
                        )
                      )}
                      <p className="col-span-2 -mt-1 text-[11px] text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Static Value: selected value conforms to field type and choices. Variable / Formula: reference event data or earlier step outputs.
                      </p>
                    </div>
                  </div>
                ))}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFieldModalMode("fieldUpdateMulti");
                      setIsFieldRegistryModalOpen(true);
                    }}
                    className="flex-1 py-2 text-xs border border-dashed border-blue-300 text-blue-600 bg-blue-50/20 hover:bg-blue-50/50 rounded-lg flex items-center justify-center gap-1.5 font-semibold cursor-pointer transition-colors"
                  >
                    <Sliders className="w-3.5 h-3.5" /> Select Fields from Registry
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange({
                      fieldUpdateBlocks: [...fieldUpdateBlocks, { fieldType: "client", fieldToEdit: "", fieldLabel: "", valueSource: "static", updateValue: "" }]
                    })}
                    className="py-2 px-3 text-xs border border-dashed border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg flex items-center justify-center gap-1 font-medium cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Blank
                  </button>
                </div>
              </div>
            )}

            {(stepKey === "assignhuman" || stepKey === "assign-responsible") && renderField(
              "Assign To",
              <select
                value={assignedUser}
                onChange={e => onChange({ assignedUser: e.target.value })}
                className="w-full px-3 py-2.5 text-sm rounded-md border border-border bg-white outline-none focus:border-blue-500 transition-colors"
              >
                <option value="">Select user...</option>
                {availableEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            )}

            {(stepKey === "callaction" || stepKey === "call-transfer" || stepKey === "call-transfer-human" || stepKey === "call-transfer-ai") && (
              <div className="space-y-4">
                {renderField(
                  <span className="inline-flex items-center gap-1.5">
                    Transfer Type
                    <InfoTooltip text="Human sends the call to a real phone number. AI Agent hands it to another automated agent in your account." />
                  </span>,
                  <div className="flex gap-3">
                    {[{ v: "human", l: "Human" }, { v: "agent", l: "AI Agent" }].map((opt) => (
                      <label key={opt.v} className={`flex-1 flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${callActionTransferType === opt.v ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"}`}>
                        <input
                          type="radio"
                          name="callActionTransferType"
                          value={opt.v}
                          checked={callActionTransferType === opt.v}
                          onChange={() => onChange({ callActionTransferType: opt.v })}
                          className="accent-primary"
                        />
                        <span className="text-sm font-medium" style={{ color: "#020817", fontFamily: "Outfit, sans-serif" }}>{opt.l}</span>
                      </label>
                    ))}
                  </div>
                )}

                {callActionTransferType === "human" && (
                  <div className="grid grid-cols-2 gap-3">
                    {renderField(
                      "Country Code",
                      <select
                        value={callActionCountryCode}
                        onChange={e => onChange({ callActionCountryCode: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-border rounded-xl text-sm"
                      >
                        <option value="+1">+1 (US/CA)</option>
                        <option value="+44">+44 (UK)</option>
                        <option value="+91">+91 (IN)</option>
                        <option value="+61">+61 (AU)</option>
                        <option value="+49">+49 (DE)</option>
                      </select>
                    )}
                    {renderField(
                      "Phone Number",
                      <input
                        type="tel"
                        value={callActionPhoneNumber}
                        onChange={e => onChange({ callActionPhoneNumber: e.target.value })}
                        placeholder="5551234567"
                        className="w-full px-3 py-2 bg-white border border-border rounded-xl text-sm"
                      />
                    )}
                  </div>
                )}

                {callActionTransferType === "agent" && renderField(
                  "Select AI Agent",
                  <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                    {[
                      { id: "a1", number: "+1 (800) 555-0101", process: "Patient Intake", stage: "Initial Contact" },
                      { id: "a2", number: "+1 (800) 555-0202", process: "Follow-up Calls", stage: "Follow-up Pending" },
                      { id: "a3", number: "+1 (800) 555-0303", process: "Insurance Verify", stage: "Pending Verification" },
                    ].map(agent => (
                      <label
                        key={agent.id}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors ${callActionAgentId === agent.id ? "bg-primary/5" : ""}`}
                      >
                        <input
                          type="radio"
                          name="callActionAgent"
                          value={agent.id}
                          checked={callActionAgentId === agent.id}
                          onChange={() => onChange({ callActionAgentId: agent.id })}
                          className="accent-primary"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium" style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}>{agent.number}</p>
                          <p className="text-xs" style={{ color: "#64748B", fontFamily: "Outfit, sans-serif" }}>{agent.process} · {agent.stage}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {renderField(
                  "Voice Response",
                  <input
                    type="text"
                    value={callActionVoiceResponse}
                    onChange={e => onChange({ callActionVoiceResponse: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-border rounded-xl text-sm"
                  />
                )}

                {renderField(
                  "Transfer Reason",
                  <input
                    type="text"
                    value={callActionReason}
                    onChange={e => onChange({ callActionReason: e.target.value })}
                    placeholder="Why this call is being transferred..."
                    className="w-full px-3 py-2 bg-white border border-border rounded-xl text-sm"
                  />
                )}
              </div>
            )}

            {(stepKey === "whatsapp" || stepKey === "send-whatsapp") && (
              <div className="space-y-4">
                {renderField(
                  "Select Source",
                  <div className="inline-flex rounded-md border border-border overflow-hidden bg-white">
                    {[
                      { v: "template", l: "Template" },
                      { v: "campaign", l: "Campaign" }
                    ].map(opt => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => {
                          if (opt.v === "template") {
                            onChange({ whatsappSource: "template", whatsappCampaignId: "" });
                          } else if (opt.v === "campaign") {
                            onChange({ whatsappSource: "campaign", whatsappTemplate: "", whatsappTemplateIdentifier: "" });
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold ${whatsappSource === opt.v ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                      >
                        {opt.l}
                      </button>
                    ))}
                  </div>
                )}

                {whatsappSource === "template" && (
                  <>
                    {whatsappTemplates.length === 0 ? (
                      <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-[#020817]">Template</label>
                        <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-lg border border-dashed flex flex-col gap-1.5 bg-white">
                          <span>No templates yet — create one in Chats → Template Builder</span>
                          <Link to="/chats?tab=templates" className="text-xs text-blue-600 hover:underline font-semibold w-fit">
                            Manage Templates →
                          </Link>
                        </div>
                      </div>
                    ) : (
                      renderField(
                        "Template",
                        <select
                          value={whatsappTemplate}
                          onChange={e => {
                            const id = e.target.value;
                            const selectedTpl = whatsappTemplates.find(t => t.id === id);
                            onChange({
                              whatsappTemplate: id,
                              whatsappTemplateIdentifier: selectedTpl ? selectedTpl.identifier : ""
                            });
                          }}
                          className="w-full px-3 py-2.5 text-sm rounded-md border border-border bg-white outline-none focus:border-blue-500 transition-colors"
                        >
                          <option value="">Select Template...</option>
                          {whatsappTemplates.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name} — {t.category}
                            </option>
                          ))}
                        </select>
                      )
                    )}
                  </>
                )}

                {whatsappSource === "campaign" && (
                  whatsappCampaigns.length === 0 ? (
                    <div className="space-y-1.5">
                      <label className="block text-sm font-semibold text-[#020817]">Campaign</label>
                      <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-lg border border-dashed flex flex-col gap-1.5 bg-white">
                        <span>No campaigns yet — create one in Chats → Campaigns</span>
                        <Link to="/chats?tab=campaigns" className="text-xs text-blue-600 hover:underline font-semibold w-fit">
                          Manage Campaigns →
                        </Link>
                      </div>
                    </div>
                  ) : (
                    renderField(
                      "Campaign",
                      <select
                        value={whatsappCampaignId}
                        onChange={e => onChange({ whatsappCampaignId: e.target.value })}
                        className="w-full px-3 py-2.5 text-sm rounded-md border border-border bg-white outline-none focus:border-blue-500 transition-colors"
                      >
                        <option value="">Select Campaign...</option>
                        {whatsappCampaigns.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    )
                  )
                )}

                {renderField(
                  <div className="flex items-center gap-1.5">
                    <span>Website Chat Notification Message</span>
                    <InfoTooltip text="Message shown in Website Chat Widget when a visitor triggers this automation (e.g. notifying them that the template details were dispatched to their WhatsApp)." />
                  </div>,
                  <textarea
                    rows={2}
                    value={websiteNotificationMessage}
                    onChange={e => onChange({ websiteNotificationMessage: e.target.value })}
                    placeholder="e.g. We have sent the requested details to your WhatsApp number. Please check your WhatsApp messages!"
                    className="w-full px-3 py-2 text-xs rounded-md border border-border bg-white resize-none outline-none focus:border-blue-500"
                  />
                )}
              </div>
            )}

            {(stepKey === "sms" || stepKey === "send-sms") && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-[#020817]" style={{ fontFamily: "DM Sans, sans-serif" }}>Message</label>
                    <VariablePickerButton
                      targetRef={smsMessageRef}
                      value={smsMessage}
                      onChange={v => onChange({ smsMessage: v })}
                      label="{ } Insert Variable"
                    />
                  </div>
                  <textarea
                    ref={smsMessageRef}
                    rows={5}
                    value={smsMessage}
                    onChange={e => onChange({ smsMessage: e.target.value })}
                    placeholder="Type your SMS message..."
                    className="w-full px-3 py-2.5 text-sm rounded-md border border-border bg-white resize-none"
                  />
                </div>

                {renderField(
                  <div className="flex items-center gap-1.5">
                    <span>Website Chat Notification Message</span>
                    <InfoTooltip text="Message shown in Website Chat Widget when a visitor triggers this SMS automation (e.g. notifying them that the SMS details were sent to their number)." />
                  </div>,
                  <textarea
                    rows={2}
                    value={websiteNotificationMessage}
                    onChange={e => onChange({ websiteNotificationMessage: e.target.value })}
                    placeholder="e.g. We have sent the requested details to your mobile number via SMS. Please check your messages!"
                    className="w-full px-3 py-2 text-xs rounded-md border border-border bg-white resize-none outline-none focus:border-blue-500"
                  />
                )}
              </div>
            )}

            {(stepKey === "email" || stepKey === "send-email") && (
              <div className="space-y-4">
                {renderField(
                  "Connected Account",
                  <select
                    value={emailConnectedAccount}
                    onChange={e => onChange({ emailConnectedAccount: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm rounded-md border border-border bg-white"
                  >
                    <option value="">Select email account...</option>
                    <option>support@company.com</option>
                  </select>
                )}

                <div>
                  <label className="block text-sm font-semibold mb-2 text-[#020817]" style={{ fontFamily: "DM Sans, sans-serif" }}>Template Mode</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="emailTemplateMode"
                        checked={!showCustomEmail}
                        onChange={() => onChange({ showCustomEmail: false })}
                      />
                      <span className="text-sm">Rich Editor</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="emailTemplateMode"
                        checked={showCustomEmail}
                        onChange={() => onChange({ showCustomEmail: true })}
                      />
                      <span className="text-sm">HTML Source</span>
                    </label>
                  </div>
                </div>

                {renderField(
                  "Subject",
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={e => onChange({ emailSubject: e.target.value })}
                    placeholder="Subject..."
                    className="w-full px-3 py-2.5 text-sm border rounded-md bg-white"
                  />
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-[#020817]" style={{ fontFamily: "DM Sans, sans-serif" }}>Email Body</label>
                    <VariablePickerButton
                      targetRef={!showCustomEmail ? emailRichBodyRef : emailHtmlBodyRef}
                      value={!showCustomEmail ? emailRichBody : emailHtmlBody}
                      onChange={v => onChange(!showCustomEmail ? { emailRichBody: v } : { emailHtmlBody: v })}
                      label="</> + Variable"
                    />
                  </div>

                  {!showCustomEmail ? (
                    <textarea
                      ref={emailRichBodyRef}
                      value={emailRichBody}
                      onChange={e => onChange({ emailRichBody: e.target.value })}
                      placeholder="Hello {{ContactName}}, ..."
                      className="w-full px-3 py-2.5 text-sm border rounded-md bg-white resize-none"
                      rows={5}
                    />
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1">
                        {["code", "preview"].map(tab => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => onChange({ htmlBodyViewMode: tab })}
                            className={`px-3 py-1 text-xs font-semibold rounded-md border ${htmlBodyViewMode === tab ? "bg-blue-600 text-white" : "bg-white text-gray-500"}`}
                          >
                            {tab === "code" ? "Code" : "Preview"}
                          </button>
                        ))}
                      </div>
                      {htmlBodyViewMode === "code" ? (
                        <textarea
                          ref={emailHtmlBodyRef}
                          value={emailHtmlBody}
                          onChange={e => onChange({ emailHtmlBody: e.target.value })}
                          placeholder="<p>Hello {{ContactName}}</p>"
                          className="w-full px-3 py-2.5 text-sm border rounded-md font-mono bg-white"
                          rows={5}
                        />
                      ) : (
                        <div className="p-3 border rounded-md bg-gray-50 min-h-[100px]" dangerouslySetInnerHTML={{ __html: emailHtmlBody }} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {stepKey === "crmupdate" && (
              <div className="space-y-4">
                {renderField("CRM Platform",
                  <select value={crmName} onChange={e => onChange({ crmName: e.target.value })} className="w-full px-3 py-2.5 border rounded-md bg-white">
                    <option value="">Select CRM...</option>
                    <option>Salesforce</option>
                    <option>HubSpot</option>
                  </select>
                )}
                {renderField("Field to Update",
                  <select value={crmField} onChange={e => onChange({ crmField: e.target.value })} className="w-full px-3 py-2.5 border rounded-md bg-white">
                    <option value="">Select field...</option>
                    <option>Status</option>
                    <option>Stage</option>
                  </select>
                )}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold">Value</label>
                    <VariablePickerButton targetRef={crmUpdateValueRef} value={crmUpdateValue} onChange={v => onChange({ crmUpdateValue: v })} />
                  </div>
                  <input ref={crmUpdateValueRef} type="text" value={crmUpdateValue} onChange={e => onChange({ crmUpdateValue: e.target.value })} className="w-full px-3 py-2.5 border rounded-md" />
                </div>
              </div>
            )}

            {stepKey === "ehrupdate" && (
              <div className="space-y-4">
                {renderField("EHR Platform",
                  <select value={ehrName} onChange={e => onChange({ ehrName: e.target.value })} className="w-full px-3 py-2.5 border rounded-md bg-white">
                    <option value="">Select EHR...</option>
                    <option>Epic</option>
                    <option>Cerner</option>
                  </select>
                )}
                {renderField("Field to Update",
                  <select value={ehrField} onChange={e => onChange({ ehrField: e.target.value })} className="w-full px-3 py-2.5 border rounded-md bg-white">
                    <option value="">Select field...</option>
                    <option>Patient Status</option>
                    <option>Visit Type</option>
                  </select>
                )}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold">Value</label>
                    <VariablePickerButton targetRef={ehrUpdateValueRef} value={ehrUpdateValue} onChange={v => onChange({ ehrUpdateValue: v })} />
                  </div>
                  <input ref={ehrUpdateValueRef} type="text" value={ehrUpdateValue} onChange={e => onChange({ ehrUpdateValue: e.target.value })} className="w-full px-3 py-2.5 border rounded-md" />
                </div>
              </div>
            )}

            {(stepKey === "wh_trigger" || stepKey === "api") && (
              <div className="space-y-4 border p-4 rounded-xl bg-white shadow-sm">
                {customApiIntegrations.length === 0 ? (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-[#020817]">Select Integration</label>
                    <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-lg border border-dashed flex flex-col gap-1.5 bg-white">
                      <span>No API integrations yet — create one in Settings → Integrations</span>
                      <Link to="/settings?tab=integrations" className="text-xs text-blue-600 hover:underline font-semibold w-fit">
                        CRM/Data Source → Custom API
                      </Link>
                    </div>
                  </div>
                ) : (
                  renderField("Select Integration",
                    <select
                      value={apiSelectedIntegrationId}
                      onChange={e => {
                        const id = e.target.value;
                        onChange({
                          apiSelectedIntegrationId: id,
                          apiAction: "",
                          apiCreateFields: [],
                          apiUpdateFields: [],
                          apiReplaceFields: [],
                          apiDeleteField: ""
                        });
                      }}
                      className="w-full px-3 py-2.5 border rounded-md bg-white text-sm"
                    >
                      <option value="">Select integration...</option>
                      {customApiIntegrations.map(i => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                      ))}
                    </select>
                  )
                )}

                {(() => {
                  const selectedApiInt = customApiIntegrations.find(i => i.id === apiSelectedIntegrationId);
                  if (!selectedApiInt) return null;

                  // Existing fields on the integration's schema — shared source for Update / Replace / Delete
                  const integrationFields: Array<{ key: string; label: string }> =
                    (selectedApiInt.fieldMappings || [])
                      .filter((fm: any) => fm.key)  // drop junk rows with no key
                      .map((fm: any) => ({
                        key: fm.key,
                        label: fm.label && fm.label.trim() ? fm.label : fm.key, // fallback to key when label is blank
                      }));

                  const allowedMethodsList = (selectedApiInt.allowedMethods || [])
                    .map((m: string) => m.toUpperCase().trim())
                    .filter((m: string) => m !== "GET"); // Fetch removed — this step only mutates records

                  const methodMap: Record<string, { value: string; label: string }> = {
                    POST: { value: "create", label: "Create" },
                    PATCH: { value: "update", label: "Update" },
                    PUT: { value: "replace", label: "Replace" },
                    DELETE: { value: "delete", label: "Delete" }
                  };

                  return (
                    <div className="space-y-4">
                      {renderField("Action",
                        <select
                          value={apiAction}
                          onChange={e => {
                            const act = e.target.value;
                            onChange({
                              apiAction: act,
                              apiCreateFields: act === "create" ? [{ fieldKey: "", fieldLabel: "", value: "" }] : [],
                              apiUpdateFields: act === "update" ? [{ fieldKey: "", fieldLabel: "", value: "" }] : [],
                              apiReplaceFields: act === "replace" ? [{ existingFieldKey: "", replaceMode: "existing", newFieldName: "", newValue: "" }] : [],
                              apiDeleteField: ""
                            });
                          }}
                          className="w-full px-3 py-2.5 border rounded-md bg-white text-sm"
                        >
                          <option value="">Select action...</option>
                          {allowedMethodsList.map((m: string) => {
                            const mapped = methodMap[m];
                            return mapped ? <option key={mapped.value} value={mapped.value}>{mapped.label}</option> : null;
                          })}
                        </select>
                      )}


                      {/* ───────────── CREATE — freeform key/value, unrelated to existing schema ───────────── */}
                      {apiAction === "create" && (
                        <div className="space-y-3">
                          <div className="text-xs text-gray-500 italic">
                            Define new field(s) to add to the created record. These are custom key/value pairs — they don't need to match existing integration fields.
                          </div>
                          {apiCreateFields.map((field: any, index: number) => (
                            <div key={index} className="p-3 border rounded-lg space-y-3 bg-white">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-500">Field #{index + 1}</span>
                                <button
                                  type="button"
                                  onClick={() => onChange({ apiCreateFields: apiCreateFields.filter((_: any, i: number) => i !== index) })}
                                  className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Remove
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {renderField("Key",
                                  <input
                                    type="text"
                                    value={field.fieldKey}
                                    onChange={e => {
                                      const updated = apiCreateFields.map((f: any, i: number) =>
                                        i === index ? { ...f, fieldKey: e.target.value, fieldLabel: e.target.value } : f
                                      );
                                      onChange({ apiCreateFields: updated });
                                    }}
                                    placeholder="e.g. preferred_contact_method"
                                    className="w-full px-3 py-2 text-xs border rounded-md"
                                  />
                                )}
                                <div>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-semibold text-[#020817]">Value</label>
                                    <VariablePickerButton
                                      targetRef={getRefForField(`create-${index}`)}
                                      value={field.value}
                                      onChange={newValue => {
                                        const updated = apiCreateFields.map((f: any, i: number) => i === index ? { ...f, value: newValue } : f);
                                        onChange({ apiCreateFields: updated });
                                      }}
                                      label="+ Insert Variable"
                                    />
                                  </div>
                                  <input
                                    ref={el => { inputRefs.current[`create-${index}`] = el; }}
                                    type="text"
                                    value={field.value}
                                    onChange={e => {
                                      const updated = apiCreateFields.map((f: any, i: number) => i === index ? { ...f, value: e.target.value } : f);
                                      onChange({ apiCreateFields: updated });
                                    }}
                                    placeholder="Enter value..."
                                    className="w-full px-3 py-2 text-xs border rounded-md"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => onChange({ apiCreateFields: [...apiCreateFields, { fieldKey: "", fieldLabel: "", value: "" }] })}
                            className="w-full py-2 text-xs border border-dashed border-gray-300 text-blue-600 rounded-md hover:bg-blue-50/20 flex items-center justify-center gap-1 font-semibold"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Field
                          </button>
                        </div>
                      )}

                      {/* ───────────── UPDATE — pick from existing integration fields, set new value ───────────── */}
                      {apiAction === "update" && (
                        <div className="space-y-3">
                          <div className="text-xs text-gray-500 italic">Choose an existing field on this integration and set its new value.</div>
                          {integrationFields.length === 0 ? (
                            <div className="text-xs text-amber-700 italic p-3 bg-amber-50 border border-amber-200 rounded-lg">
                              No fields defined for this integration — add them in Settings → Integrations → Custom API
                            </div>
                          ) : (
                            <>
                              {apiUpdateFields.map((field: any, index: number) => (
                                <div key={index} className="p-3 border rounded-lg space-y-3 bg-white">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-gray-500">Field #{index + 1}</span>
                                    <button
                                      type="button"
                                      onClick={() => onChange({ apiUpdateFields: apiUpdateFields.filter((_: any, i: number) => i !== index) })}
                                      className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" /> Remove
                                    </button>
                                  </div>
                                  {renderField("Select Field",
                                    <select
                                      value={field.fieldKey}
                                      onChange={e => {
                                        const chosen = integrationFields.find(fm => fm.key === e.target.value);
                                        const updated = apiUpdateFields.map((f: any, i: number) =>
                                          i === index ? { ...f, fieldKey: e.target.value, fieldLabel: chosen?.label ?? "" } : f
                                        );
                                        onChange({ apiUpdateFields: updated });
                                      }}
                                      className="w-full px-3 py-2 text-xs border rounded-md bg-white"
                                    >
                                      <option value="">Select field...</option>
                                      {integrationFields.map(fm => (
                                        <option key={fm.key} value={fm.key}>{fm.label}</option>
                                      ))}
                                    </select>
                                  )}
                                  <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                      <label className="text-xs font-semibold text-[#020817]">Value</label>
                                      <VariablePickerButton
                                        targetRef={getRefForField(`update-${index}`)}
                                        value={field.value}
                                        onChange={newValue => {
                                          const updated = apiUpdateFields.map((f: any, i: number) => i === index ? { ...f, value: newValue } : f);
                                          onChange({ apiUpdateFields: updated });
                                        }}
                                        label="+ Insert Variable"
                                      />
                                    </div>
                                    <input
                                      ref={el => { inputRefs.current[`update-${index}`] = el; }}
                                      type="text"
                                      value={field.value}
                                      onChange={e => {
                                        const updated = apiUpdateFields.map((f: any, i: number) => i === index ? { ...f, value: e.target.value } : f);
                                        onChange({ apiUpdateFields: updated });
                                      }}
                                      placeholder="Enter new value..."
                                      className="w-full px-3 py-2 text-xs border rounded-md"
                                    />
                                  </div>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => onChange({ apiUpdateFields: [...apiUpdateFields, { fieldKey: "", fieldLabel: "", value: "" }] })}
                                className="w-full py-2 text-xs border border-dashed border-gray-300 text-blue-600 rounded-md hover:bg-blue-50/20 flex items-center justify-center gap-1 font-semibold"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add Field to Update
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {/* ───────────── REPLACE — pick existing field, replace with existing field OR new field ───────────── */}
                      {apiAction === "replace" && (
                        <div className="space-y-3">
                          <div className="text-xs text-gray-500 italic">Select an existing field, then choose what to replace it with.</div>
                          {apiReplaceFields.map((row: any, index: number) => {
                            const replaceMode = row.replaceMode ?? "existing"; // "existing" | "new"
                            return (
                              <div key={index} className="p-3 border rounded-lg space-y-3 bg-white">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-gray-500">Replacement #{index + 1}</span>
                                  <button
                                    type="button"
                                    onClick={() => onChange({ apiReplaceFields: apiReplaceFields.filter((_: any, i: number) => i !== index) })}
                                    className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Remove
                                  </button>
                                </div>

                                {renderField("Existing Field",
                                  <select
                                    value={row.existingFieldKey}
                                    onChange={e => {
                                      const updated = apiReplaceFields.map((r: any, i: number) => i === index ? { ...r, existingFieldKey: e.target.value } : r);
                                      onChange({ apiReplaceFields: updated });
                                    }}
                                    className="w-full px-3 py-2 text-xs border rounded-md bg-white"
                                  >
                                    <option value="">Select field...</option>
                                    {integrationFields.map(fm => (
                                      <option key={fm.key} value={fm.key}>{fm.label}</option>
                                    ))}
                                  </select>
                                )}

                                <div className="flex items-center gap-2 pt-1">
                                  <span className="text-xs font-semibold text-gray-500">Replace with:</span>
                                  <InfoTooltip text="Existing Field copies data into another field already on this integration. New Field creates a brand-new key/value pair." />
                                  <div className="inline-flex rounded-md border border-border overflow-hidden">
                                    {[{ v: "existing", l: "Existing Field" }, { v: "new", l: "New Field" }].map(opt => (
                                      <button
                                        key={opt.v}
                                        type="button"
                                        onClick={() => {
                                          const updated = apiReplaceFields.map((r: any, i: number) =>
                                            i === index ? { ...r, replaceMode: opt.v, newFieldName: "", newValue: "" } : r
                                          );
                                          onChange({ apiReplaceFields: updated });
                                        }}
                                        className={`px-3 py-1.5 text-xs font-semibold ${replaceMode === opt.v ? "bg-blue-600 text-white" : "bg-white text-gray-600"}`}
                                      >
                                        {opt.l}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {replaceMode === "existing" ? (
                                  renderField("Target Field",
                                    <select
                                      value={row.newFieldName}
                                      onChange={e => {
                                        const updated = apiReplaceFields.map((r: any, i: number) => i === index ? { ...r, newFieldName: e.target.value } : r);
                                        onChange({ apiReplaceFields: updated });
                                      }}
                                      className="w-full px-3 py-2 text-xs border rounded-md bg-white"
                                    >
                                      <option value="">Select field...</option>
                                      {integrationFields
                                        .filter(fm => fm.key !== row.existingFieldKey)
                                        .map(fm => (
                                          <option key={fm.key} value={fm.key}>{fm.label}</option>
                                        ))}
                                    </select>
                                  )
                                ) : (
                                  <div className="grid grid-cols-2 gap-2">
                                    {renderField("Key",
                                      <input
                                        type="text"
                                        value={row.newFieldName}
                                        onChange={e => {
                                          const updated = apiReplaceFields.map((r: any, i: number) => i === index ? { ...r, newFieldName: e.target.value } : r);
                                          onChange({ apiReplaceFields: updated });
                                        }}
                                        placeholder="e.g. new_field_key"
                                        className="w-full px-3 py-2 text-xs border rounded-md"
                                      />
                                    )}
                                    <div>
                                      <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-semibold text-[#020817]">Value</label>
                                        <VariablePickerButton
                                          targetRef={getRefForField(`replace-${index}`)}
                                          value={row.newValue}
                                          onChange={newValue => {
                                            const updated = apiReplaceFields.map((r: any, i: number) => i === index ? { ...r, newValue: newValue } : r);
                                            onChange({ apiReplaceFields: updated });
                                          }}
                                          label="+ Insert Variable"
                                        />
                                      </div>
                                      <input
                                        ref={el => { inputRefs.current[`replace-${index}`] = el; }}
                                        type="text"
                                        value={row.newValue}
                                        onChange={e => {
                                          const updated = apiReplaceFields.map((r: any, i: number) => i === index ? { ...r, newValue: e.target.value } : r);
                                          onChange({ apiReplaceFields: updated });
                                        }}
                                        placeholder="New value..."
                                        className="w-full px-3 py-2 text-xs border rounded-md"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => onChange({ apiReplaceFields: [...apiReplaceFields, { existingFieldKey: "", replaceMode: "existing", newFieldName: "", newValue: "" }] })}
                            className="w-full py-2 text-xs border border-dashed border-gray-300 text-blue-600 rounded-md hover:bg-blue-50/20 flex items-center justify-center gap-1 font-semibold"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Replacement Row
                          </button>
                        </div>
                      )}

                      {/* ───────────── DELETE — pick existing field to remove ───────────── */}
                      {apiAction === "delete" && (
                        <div className="space-y-3">
                          <div className="text-xs text-gray-500 italic">Select the existing field to delete from the matched record.</div>
                          {renderField("Select Field to Delete",
                            <select
                              value={params.apiDeleteField ?? ""}
                              onChange={e => onChange({ apiDeleteField: e.target.value })}
                              className="w-full px-3 py-2.5 border rounded-md bg-white text-sm"
                            >
                              <option value="">Select field...</option>
                              {integrationFields.map(fm => (
                                <option key={fm.key} value={fm.key}>{fm.label}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {(stepKey === "webhook_trigger" || stepKey === "webhook") && (
              <div className="space-y-5 bg-white">
                {/* Row 1: Name & Target URL */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Pencil className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <label className="text-xs font-bold text-gray-700 tracking-wide">Name</label>
                      <InfoTooltip text="A recognizable name for this webhook." />
                    </div>
                    <input
                      type="text"
                      value={params.name || params.webhookName || ""}
                      onChange={(e) => onChange({ name: e.target.value, webhookName: e.target.value })}
                      placeholder="e.g. Sync to CRM"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>

                  {/* Target URL */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <label className="text-xs font-bold text-gray-700 tracking-wide">Target URL</label>
                      <InfoTooltip text="The endpoint URL that will receive the payload." />
                    </div>
                    <input
                      type="text"
                      value={params.targetUrl || params.url || params.webhookUrl || ""}
                      onChange={(e) => onChange({ targetUrl: e.target.value, url: e.target.value, webhookUrl: e.target.value })}
                      placeholder="https://api.example.com/webhook"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                    />
                  </div>
                </div>


                {/* Parameters */}
                {(() => {
                  const webhookParamsList: Array<{ key: string; value: string }> = Array.isArray(params.webhookParameters)
                    ? params.webhookParameters
                    : Array.isArray(params.parameters)
                    ? params.parameters
                    : [
                        { key: "", value: "" },
                        { key: "", value: "" },
                      ];

                  const handleAddWebhookParam = () => {
                    const updated = [...webhookParamsList, { key: "", value: "" }];
                    onChange({ webhookParameters: updated, parameters: updated });
                  };

                  const handleWebhookParamKeyChange = (index: number, newKey: string) => {
                    const updated = webhookParamsList.map((p, i) => (i === index ? { ...p, key: newKey } : p));
                    onChange({ webhookParameters: updated, parameters: updated });
                  };

                  const handleWebhookParamValueChange = (index: number, newValue: string) => {
                    const updated = webhookParamsList.map((p, i) => (i === index ? { ...p, value: newValue } : p));
                    onChange({ webhookParameters: updated, parameters: updated });
                  };

                  const handleRemoveWebhookParam = (index: number) => {
                    const updated = webhookParamsList.filter((_, i) => i !== index);
                    onChange({ webhookParameters: updated, parameters: updated });
                  };

                  const targetUrl = (params.targetUrl || params.url || params.webhookUrl || "").trim();
                  let urlPreview = "";
                  if (targetUrl) {
                    const validParams = webhookParamsList.filter((p) => p.key.trim().length > 0);
                    if (validParams.length === 0) {
                      urlPreview = targetUrl;
                    } else {
                      const query = validParams
                        .map((p) => `${encodeURIComponent(p.key.trim())}=${encodeURIComponent(p.value.trim() || "")}`)
                        .join("&");
                      const separator = targetUrl.includes("?")
                        ? targetUrl.endsWith("?") || targetUrl.endsWith("&")
                          ? ""
                          : "&"
                        : "?";
                      urlPreview = `${targetUrl}${separator}${query}`;
                    }
                  }

                  return (
                    <div className="space-y-4">
                      {/* Parameters Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Split className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <label className="text-xs font-bold text-gray-700 tracking-wide">Parameters</label>
                          <InfoTooltip text="Key-value pairs to append to the target URL." />
                        </div>
                        <button
                          type="button"
                          onClick={handleAddWebhookParam}
                          className="px-3 py-1 rounded-full border border-gray-900 hover:bg-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-900 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Parameter</span>
                        </button>
                      </div>

                      {/* Parameter Rows */}
                      <div className="space-y-2">
                        {webhookParamsList.map((param, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Key"
                              value={param.key}
                              onChange={(e) => handleWebhookParamKeyChange(index, e.target.value)}
                              className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => setWebhookFieldModalIndex(index)}
                              className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-medium flex items-center justify-between cursor-pointer hover:border-blue-400 hover:bg-blue-50/20 transition-all text-left"
                            >
                              <span className={param.value ? "text-blue-600 font-mono font-medium truncate" : "text-gray-400"}>
                                {param.value || "Variable"}
                              </span>
                              <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveWebhookParam(index)}
                              className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors shrink-0"
                              title="Delete parameter"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* URL Preview */}
                      <div className="space-y-1.5 pt-2">
                        <div className="flex items-center gap-1.5">
                          <Link2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <label className="text-xs font-bold text-gray-700 tracking-wide">URL Preview</label>
                          <InfoTooltip text="The final endpoint with all parameters attached." />
                        </div>
                        <div className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50/70 text-xs font-mono text-gray-700 min-h-[42px] flex items-center break-all select-all">
                          {urlPreview ? (
                            <span className="text-gray-900">{urlPreview}</span>
                          ) : (
                            <span className="text-gray-400 font-sans">URL Preview</span>
                          )}
                        </div>
                      </div>

                      {/* SelectFieldsModal for Variable Picking */}
                      {webhookFieldModalIndex !== null && (
                        <SelectFieldsModal
                          initiallySelected={
                            webhookParamsList[webhookFieldModalIndex]?.value
                              ? [webhookParamsList[webhookFieldModalIndex].value.replace(/[{}]/g, "")]
                              : []
                          }
                          onClose={() => setWebhookFieldModalIndex(null)}
                          onApply={(keys) => {
                            if (keys.length > 0 && webhookFieldModalIndex !== null) {
                              handleWebhookParamValueChange(webhookFieldModalIndex, `{{${keys[0]}}}`);
                            }
                            setWebhookFieldModalIndex(null);
                          }}
                        />
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {(stepKey === "fetchavailability" || stepKey === "fetch-availability") && (
              <div className="space-y-4">
                {renderField("Calendar User",
                  <select value={fetchAvailCalendarUser} onChange={e => onChange({ fetchAvailCalendarUser: e.target.value })} className="w-full px-3 py-2.5 border rounded-md bg-white">
                    <option value="">Select user...</option>
                    <option value="u1">John Smith — Google Calendar</option>
                    <option value="u2">Sarah Johnson — Outlook</option>
                  </select>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {renderField("Date Source", <input type="text" value={fetchAvailDateSource} onChange={e => onChange({ fetchAvailDateSource: e.target.value })} className="w-full px-3 py-2.5 border rounded-md" />)}
                  {renderField("Time Source", <input type="text" value={fetchAvailTimeSource} onChange={e => onChange({ fetchAvailTimeSource: e.target.value })} className="w-full px-3 py-2.5 border rounded-md" />)}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold">Voice Response</label>
                    <VariablePickerButton targetRef={fetchAvailSummaryRef} value={fetchAvailSummary} onChange={v => onChange({ fetchAvailSummary: v })} />
                  </div>
                  <textarea ref={fetchAvailSummaryRef} rows={3} value={fetchAvailSummary} onChange={e => onChange({ fetchAvailSummary: e.target.value })} className="w-full px-3 py-2.5 border rounded-md" />
                </div>
              </div>
            )}

            {(stepKey === "fetchfieldvalue" || stepKey === "fetch-field-value") && (
              <div className="space-y-4">
                {renderField("Field Source",
                  <select value={fetchFieldSource} onChange={e => onChange({ fetchFieldSource: e.target.value, fetchFieldSelected: "" })} className="w-full px-3 py-2.5 border rounded-md bg-white">
                    <option value="">Select source...</option>
                    <option value="system">System Fields</option>
                    <option value="call-log">Call Log Fields</option>
                  </select>
                )}
                {fetchFieldSource && renderField("Field Selector",
                  <select value={fetchFieldSelected} onChange={e => onChange({ fetchFieldSelected: e.target.value })} className="w-full px-3 py-2.5 border rounded-md bg-white">
                    <option value="">Select field...</option>
                    {fetchFieldSource === "system" ? (
                      <>
                        <option value="contact_name">Contact Name</option>
                        <option value="contact_email">Contact Email</option>
                      </>
                    ) : (
                      <>
                        <option value="call_status">Call Status</option>
                        <option value="call_duration">Call Duration</option>
                      </>
                    )}
                  </select>
                )}
                {renderField("Reason", <textarea value={fetchFieldReason} onChange={e => onChange({ fetchFieldReason: e.target.value })} rows={3} className="w-full px-3 py-2.5 border rounded-md" />)}
              </div>
            )}

            {stepKey === "managecalendar" && (
              <div className="space-y-4">
                {renderField("Mode",
                  <div className="flex gap-2">
                    {["book", "reschedule", "cancel"].map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => onChange({ calendarMode: mode })}
                        className={`flex-1 py-2 rounded-lg border text-sm font-semibold ${calendarMode === mode ? "bg-blue-600 text-white" : "bg-white text-gray-500"}`}
                      >
                        {mode.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
                {(calendarMode === "reschedule" || calendarMode === "cancel") && renderField("Meeting ID",
                  <input type="text" value={calendarMeetingId} onChange={e => onChange({ calendarMeetingId: e.target.value })} className="w-full px-3 py-2.5 border rounded-md" />
                )}
                {renderField("Connected Calendar",
                  <select value={calendarConnected} onChange={e => onChange({ calendarConnected: e.target.value })} className="w-full px-3 py-2.5 border rounded-md bg-white">
                    <option value="">Select calendar...</option>
                    <option value="c1">John Smith — Google Calendar</option>
                  </select>
                )}
                {calendarMode !== "cancel" && (
                  <div className="grid grid-cols-2 gap-2">
                    {renderField("Date", <input type="text" value={calendarDate} onChange={e => onChange({ calendarDate: e.target.value })} className="w-full px-3 py-2.5 border rounded-md" />)}
                    {renderField("Time", <input type="text" value={calendarTime} onChange={e => onChange({ calendarTime: e.target.value })} className="w-full px-3 py-2.5 border rounded-md" />)}
                  </div>
                )}
              </div>
            )}

            {/* ASSIGN PROCESS ACTION STEP */}
            {(stepKey === "assign_process" || stepKey === "assign-process" || stepKey === "create_process" || stepKey === "create-process") && (() => {
              const clientProcesses = effectiveProcesses.filter(
                (p: any) => !p.entityType || p.entityType === "client" || p.entityType === "processes"
              );
              const effectiveClientProcesses = clientProcesses.length > 0
                ? clientProcesses
                : getStoredProcesses().filter((p: any) => !p.entityType || p.entityType === "client" || p.entityType === "processes");

              const selectedProcId = params.processId || effectiveClientProcesses[0]?.id || "";
              const selectedProc = effectiveClientProcesses.find((p: any) => p.id === selectedProcId) || effectiveClientProcesses[0];
              const stages = selectedProc?.stages || [];
              const currentStageVal = params.stageId || stages[0]?.id || stages[0]?.name || "";

              return (
                <div className="space-y-4">
                  {/* 1. Choose Process */}
                  {renderField(
                    "Choose Process",
                    <select
                      value={selectedProcId}
                      onChange={(e) => {
                        const nextId = e.target.value;
                        const targetProc = effectiveClientProcesses.find((p: any) => p.id === nextId);
                        const firstStage = targetProc?.stages?.[0];
                        onChange({
                          processId: nextId,
                          processName: targetProc?.name || "",
                          stageId: firstStage?.id || firstStage?.name || "",
                          stageName: firstStage?.name || "",
                          stepDetailProcess: nextId,
                          stepDetailStage: firstStage?.id || firstStage?.name || "",
                        });
                      }}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-800"
                    >
                      <option value="">Select process...</option>
                      {effectiveClientProcesses.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* 2. Choose Stage */}
                  {selectedProc && renderField(
                    "Choose Stage",
                    <select
                      value={currentStageVal}
                      onChange={(e) => {
                        const val = e.target.value;
                        const targetStage = stages.find((s: any) => s.id === val || s.name === val);
                        onChange({
                          stageId: val,
                          stageName: targetStage?.name || val,
                          stepDetailStage: val,
                        });
                      }}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-800"
                    >
                      {stages.length === 0 ? (
                        <option value="">No stages defined for this process</option>
                      ) : (
                        stages.map((s: any) => (
                          <option key={s.id || s.name} value={s.id || s.name}>
                            {s.name}
                          </option>
                        ))
                      )}
                    </select>
                  )}

                  {/* 3. Process Fields Mapping Hierarchy */}
                  {selectedProc && renderProcessFieldsCardList(selectedProc, "process", currentStageVal)}
                </div>
              );
            })()}

            {(stepKey === "update_to_stage" || stepKey === "update-stage" || stepKey === "processmovement" || stepKey === "stagemovement" || stepKey === "move-process" || stepKey === "move-stage" || stepKey === "movetonewprocess" || stepKey === "move-new-process") && (() => {
              const stageEntity = (params.stageEntity || params.entityType || "processes") as "processes" | "appointment" | "invoice";

              // Respective scoped entity processes
              const appointmentProcesses = effectiveProcesses.filter((p: any) => p.entityType === "appointment");
              const effectiveApptProcesses = appointmentProcesses.length > 0
                ? appointmentProcesses
                : (() => {
                    const allAppts = getStoredProcesses().filter((p: any) => p.entityType === "appointment");
                    return allAppts.length > 0 ? allAppts : [DEFAULT_ENTITY_PROCESSES.appointment];
                  })();

              const invoiceProcesses = effectiveProcesses.filter((p: any) => p.entityType === "invoice");
              const effectiveInvProcesses = invoiceProcesses.length > 0
                ? invoiceProcesses
                : (() => {
                    const allInvs = getStoredProcesses().filter((p: any) => p.entityType === "invoice");
                    return allInvs.length > 0 ? allInvs : [DEFAULT_ENTITY_PROCESSES.invoice];
                  })();

              const clientProcesses = effectiveProcesses.filter((p: any) => !p.entityType || p.entityType === "client" || p.entityType === "processes");
              const effectiveClientProcesses = clientProcesses.length > 0
                ? clientProcesses
                : getStoredProcesses().filter((p: any) => !p.entityType || p.entityType === "client" || p.entityType === "processes");

              // Selection for appointment
              const selectedApptProcId = stepDetailProcess || params.processId || effectiveApptProcesses[0]?.id || "";
              const selectedApptProc = effectiveApptProcesses.find((p: any) => p.id === selectedApptProcId) || effectiveApptProcesses[0];
              const apptStages = selectedApptProc?.stages || [];
              const currentApptStageVal = stepDetailStage || params.stageId || apptStages[0]?.id || "";

              // Selection for invoice
              const selectedInvProcId = stepDetailProcess || params.processId || effectiveInvProcesses[0]?.id || "";
              const selectedInvProc = effectiveInvProcesses.find((p: any) => p.id === selectedInvProcId) || effectiveInvProcesses[0];
              const invStages = selectedInvProc?.stages || [];
              const currentInvStageVal = stepDetailStage || params.stageId || invStages[0]?.id || "";

              // Selection for client processes
              const selectedClientProcId = stepDetailProcess || params.processId || effectiveClientProcesses[0]?.id || "";
              const selectedClientProc = effectiveClientProcesses.find((p: any) => p.id === selectedClientProcId) || effectiveClientProcesses[0];
              const clientStages = selectedClientProc?.stages || [];
              const currentClientStageVal = stepDetailStage || params.stageId || clientStages[0]?.id || "";

              return (
                <div className="space-y-4">
                  {/* Choose entity dropdown */}
                  {renderField("Choose Entity",
                    <select
                      value={stageEntity}
                      onChange={(e) => {
                        const entId = e.target.value as "processes" | "appointment" | "invoice";
                        let nextProcId = "";
                        let nextProcName = "";
                        let nextStageId = "";
                        let nextStageName = "";

                        if (entId === "processes") {
                          const proc = effectiveClientProcesses[0];
                          nextProcId = proc?.id || "";
                          nextProcName = proc?.name || "";
                          const stg = proc?.stages?.[0];
                          nextStageId = stg?.id || stg?.name || "";
                          nextStageName = stg?.name || "";
                        } else if (entId === "appointment") {
                          const proc = effectiveApptProcesses[0];
                          nextProcId = proc?.id || "";
                          nextProcName = proc?.name || "";
                          const defaultApptStage = proc?.stages?.[0];
                          nextStageId = defaultApptStage?.id || "";
                          nextStageName = defaultApptStage?.name || "";
                        } else if (entId === "invoice") {
                          const proc = effectiveInvProcesses[0];
                          nextProcId = proc?.id || "";
                          nextProcName = proc?.name || "";
                          const defaultInvStage = proc?.stages?.[0];
                          nextStageId = defaultInvStage?.id || "";
                          nextStageName = defaultInvStage?.name || "";
                        }

                        onChange({
                          stageEntity: entId,
                          entityType: entId,
                          stepDetailProcess: nextProcId,
                          processId: nextProcId,
                          processName: nextProcName,
                          stepDetailStage: nextStageId,
                          stageId: nextStageId,
                          stageName: nextStageName,
                        });
                      }}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-800"
                    >
                      <option value="processes">Processes</option>
                      <option value="appointment">Appointment</option>
                      <option value="invoice">Invoice</option>
                    </select>
                  )}

                  {/* Render based on entity */}
                  {stageEntity === "processes" && (
                    <>
                      {renderField("Choose Process",
                        <select
                          value={selectedClientProc?.id || ""}
                          onChange={(e) => {
                            const selectedProcId = e.target.value;
                            const targetProc = effectiveClientProcesses.find(p => p.id === selectedProcId) || effectiveClientProcesses[0];
                            const defaultStage = targetProc?.stages?.[0];
                            onChange({
                              stageEntity: "processes",
                              entityType: "processes",
                              stepDetailProcess: selectedProcId,
                              processId: selectedProcId,
                              processName: targetProc?.name || "",
                              stepDetailStage: defaultStage?.id || defaultStage?.name || "",
                              stageId: defaultStage?.id || defaultStage?.name || "",
                              stageName: defaultStage?.name || "",
                            });
                          }}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-800"
                        >
                          <option value="">Select process...</option>
                          {effectiveClientProcesses.map((p: any) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      )}

                      {selectedClientProc && (
                        <>
                          {renderField("Choose Stage",
                            <select
                              value={currentClientStageVal}
                              onChange={(e) => {
                                const val = e.target.value;
                                const targetStage = clientStages.find((s: any) => s.id === val || s.name === val);
                                onChange({
                                  stepDetailStage: val,
                                  stageId: val,
                                  stageName: targetStage?.name || val,
                                });
                              }}
                              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-800"
                            >
                              {clientStages.length === 0 ? (
                                <option value="">No stages defined for this process</option>
                              ) : (
                                clientStages.map((s: any) => (
                                  <option key={s.id} value={s.id || s.name}>
                                    {s.name}
                                  </option>
                                ))
                              )}
                            </select>
                          )}

                          {/* Optional Toggle to End Current Process */}
                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                            <div>
                              <span className="text-xs font-bold text-slate-800">
                                End current process before moving
                              </span>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Terminate the active process when transitioning the record to the new process / stage.
                              </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                              <input
                                type="checkbox"
                                checked={Boolean(params.stepEndCurrentProcess)}
                                onChange={(e) => onChange({ stepEndCurrentProcess: e.target.checked })}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>

                          {/* Fields to be Updated on Stage Transition */}
                          {selectedClientProc && renderProcessFieldsCardList(selectedClientProc, "process", currentClientStageVal)}
                        </>
                      )}
                    </>
                  )}

                  {stageEntity === "appointment" && (
                    <>
                      {renderField("Choose Process",
                        <select
                          value={selectedApptProc?.id || ""}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            const targetProc = effectiveApptProcesses.find((p: any) => p.id === selectedId) || effectiveApptProcesses[0];
                            const defaultStage = targetProc?.stages?.[0];
                            onChange({
                              stageEntity: "appointment",
                              entityType: "appointment",
                              stepDetailProcess: targetProc?.id || "",
                              processId: targetProc?.id || "",
                              processName: targetProc?.name || "",
                              stepDetailStage: defaultStage?.id || defaultStage?.name || "",
                              stageId: defaultStage?.id || defaultStage?.name || "",
                              stageName: defaultStage?.name || "",
                            });
                          }}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-800"
                        >
                          {effectiveApptProcesses.map((p: any) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      )}

                      {renderField("Choose Stage",
                        <select
                          value={currentApptStageVal}
                          onChange={(e) => {
                            const val = e.target.value;
                            const targetStage = apptStages.find((s: any) => s.id === val || s.name === val);
                            onChange({
                              stageEntity: "appointment",
                              entityType: "appointment",
                              stepDetailProcess: selectedApptProc?.id || "",
                              processId: selectedApptProc?.id || "",
                              processName: selectedApptProc?.name || "",
                              stepDetailStage: val,
                              stageId: val,
                              stageName: targetStage?.name || val,
                            });
                          }}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-800"
                        >
                          {apptStages.length === 0 ? (
                            <option value="">No stages defined for this process</option>
                          ) : (
                            apptStages.map((s: any) => (
                              <option key={s.id} value={s.id}>
                                {s.name} {s.description ? `(${s.description})` : ""}
                              </option>
                            ))
                          )}
                        </select>
                      )}

                      {/* Fields to be Updated for Appointment */}
                      {selectedApptProc && renderProcessFieldsCardList(selectedApptProc, "appointment", currentApptStageVal)}
                    </>
                  )}

                  {stageEntity === "invoice" && (
                    <>
                      {renderField("Choose Process",
                        <select
                          value={selectedInvProc?.id || ""}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            const targetProc = effectiveInvProcesses.find((p: any) => p.id === selectedId) || effectiveInvProcesses[0];
                            const defaultStage = targetProc?.stages?.[0];
                            onChange({
                              stageEntity: "invoice",
                              entityType: "invoice",
                              stepDetailProcess: targetProc?.id || "",
                              processId: targetProc?.id || "",
                              processName: targetProc?.name || "",
                              stepDetailStage: defaultStage?.id || defaultStage?.name || "",
                              stageId: defaultStage?.id || defaultStage?.name || "",
                              stageName: defaultStage?.name || "",
                            });
                          }}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-800"
                        >
                          {effectiveInvProcesses.map((p: any) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      )}

                      {renderField("Choose Stage",
                        <select
                          value={currentInvStageVal}
                          onChange={(e) => {
                            const val = e.target.value;
                            const targetStage = invStages.find((s: any) => s.id === val || s.name === val);
                            onChange({
                              stageEntity: "invoice",
                              entityType: "invoice",
                              stepDetailProcess: selectedInvProc?.id || "",
                              processId: selectedInvProc?.id || "",
                              processName: selectedInvProc?.name || "",
                              stepDetailStage: val,
                              stageId: val,
                              stageName: targetStage?.name || val,
                            });
                          }}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-800"
                        >
                          {invStages.length === 0 ? (
                            <option value="">No stages defined for this process</option>
                          ) : (
                            invStages.map((s: any) => (
                              <option key={s.id} value={s.id}>
                                {s.name} {s.description ? `(${s.description})` : ""}
                              </option>
                            ))
                          )}
                        </select>
                      )}

                      {/* Fields to be Updated for Invoice */}
                      {selectedInvProc && renderProcessFieldsCardList(selectedInvProc, "invoice", currentInvStageVal)}
                    </>
                  )}
                </div>
              );
            })()}

            {stepKey === "greetingphrase" && renderField("Greeting Phrase",
              <textarea
                value={greetingPhrase}
                onChange={e => onChange({ greetingPhrase: e.target.value })}
                rows={3}
                placeholder="Hi, this is Alex..."
                className="w-full p-3 border rounded-md bg-white"
              />
            )}

            {stepKey === "bypasstohuman" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">Forward to Phone Number(s)</label>
                  <button
                    type="button"
                    onClick={() => onChange({ bypassStepNumbers: [...bypassStepNumbers, { id: Date.now(), phoneNumber: "", countryCode: "+1" }] })}
                    className="text-xs text-blue-600 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Number
                  </button>
                </div>
                {bypassStepNumbers.map((entry: any) => (
                  <div key={entry.id} className="flex gap-2">
                    <select
                      value={entry.countryCode}
                      onChange={e => onChange({ bypassStepNumbers: bypassStepNumbers.map((n: any) => n.id === entry.id ? { ...n, countryCode: e.target.value } : n) })}
                      className="px-2 border rounded-md bg-white"
                    >
                      <option value="+1">+1</option>
                      <option value="+91">+91</option>
                    </select>
                    <input
                      type="text"
                      value={entry.phoneNumber}
                      onChange={e => onChange({ bypassStepNumbers: bypassStepNumbers.map((n: any) => n.id === entry.id ? { ...n, phoneNumber: e.target.value } : n) })}
                      className="flex-1 px-3 py-2 border rounded-md"
                      placeholder="Number..."
                    />
                    <button
                      type="button"
                      onClick={() => onChange({ bypassStepNumbers: bypassStepNumbers.filter((n: any) => n.id !== entry.id) })}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {stepKey === "liveintaketicket" && (
              <div className="space-y-4">
                {ticketEntries.map((entry: any, index: number) => (
                  <div key={index} className="border p-3 rounded-lg space-y-3 bg-white">
                    <div className="flex justify-between">
                      <span className="text-xs font-semibold text-gray-500">Ticket #{index + 1}</span>
                      {ticketEntries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onChange({ ticketEntries: ticketEntries.filter((_: any, i: number) => i !== index) })}
                          className="text-xs text-red-500"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    {renderField("Task Name", <input type="text" value={entry.taskName} onChange={e => onChange({ ticketEntries: ticketEntries.map((t: any, i: number) => i === index ? { ...t, taskName: e.target.value } : t) })} className="w-full px-3 py-2 border rounded-md" />)}
                    {renderField("Task Description", <textarea value={entry.taskDesc} onChange={e => onChange({ ticketEntries: ticketEntries.map((t: any, i: number) => i === index ? { ...t, taskDesc: e.target.value } : t) })} className="w-full px-3 py-2 border rounded-md" />)}
                    {renderField("Assignee",
                      <select value={entry.assignee} onChange={e => onChange({ ticketEntries: ticketEntries.map((t: any, i: number) => i === index ? { ...t, assignee: e.target.value } : t) })} className="w-full px-3 py-2 border rounded-md bg-white">
                        <option value="">Select team member...</option>
                        {availableEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                      </select>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => onChange({
                    ticketEntries: [...ticketEntries, {
                      taskName: "", taskDesc: "", assignee: "", deadline: "", priority: "Normal",
                      clientEmail: "", clientNumber: "", pauseProcess: "No",
                      checklist: [{ id: `check-${Date.now()}`, text: "" }]
                    }]
                  })}
                  className="w-full py-2 border border-dashed border-gray-300 text-blue-600 rounded-md hover:bg-blue-50/20"
                >
                  + Add Ticket
                </button>
              </div>
            )}

            {stepKey === "collectinformation" && (
              <div className="relative space-y-2">
                <label className="text-sm font-semibold">Form Template</label>
                <button
                  type="button"
                  onClick={() => setShowCollectInfoDropdown(!showCollectInfoDropdown)}
                  className="w-full px-3 py-2 border rounded-md bg-white text-left flex justify-between"
                >
                  <span>{collectInfoSelectedForm || "Select a form template..."}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showCollectInfoDropdown && (
                  <div className="absolute top-full left-0 right-0 border rounded-md bg-white shadow-lg z-50">
                    {FORM_TEMPLATES.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => { onChange({ collectInfoSelectedForm: t.name }); setShowCollectInfoDropdown(false); }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 text-xs bg-white"
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ───────────── CREATE APPOINTMENT (CRM Entity) ───────────── */}
            {(stepKey === "create_appointment" || stepKey === "create-appointment") && (() => {
              const services = MOCK_SERVICES || [];
              const selectedServiceId = params.serviceId || services[0]?.id || "";
              const selectedService = services.find((s) => s.id === selectedServiceId) || services[0];
              const appointmentTitle = params.title ?? (selectedService ? `${selectedService.name} Appointment` : "New Appointment");

              return (
                <div className="space-y-4">
                  {/* Service Selection */}
                  {renderField(
                    "Service / Appointment Type",
                    <select
                      value={selectedServiceId}
                      onChange={(e) => {
                        const sId = e.target.value;
                        const s = services.find((srv) => srv.id === sId);
                        onChange({
                          serviceId: sId,
                          serviceName: s?.name || "",
                          servicePrice: s?.price || 0,
                          title: appointmentTitle || `${s?.name || "New"} Appointment`,
                        });
                      }}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:border-blue-500 transition-colors font-medium text-slate-800"
                    >
                      <option value="">Select service...</option>
                      {services.map((srv) => (
                        <option key={srv.id} value={srv.id}>
                          {srv.name} (${srv.price})
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Appointment Title */}
                  {renderField(
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">Appointment Title</span>
                      <button
                        type="button"
                        onClick={() => {
                          setTargetProcessFieldKey("title");
                          setFieldModalMode("assignProcessFieldToken");
                          setIsFieldRegistryModalOpen(true);
                        }}
                        className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                      >
                        Select Field
                      </button>
                    </div>,
                    <input
                      type="text"
                      value={params.title ?? ""}
                      onChange={(e) => onChange({ title: e.target.value })}
                      placeholder="e.g. Initial Consultation - {{client_name}}"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-xs focus:outline-none focus:border-blue-500"
                    />
                  )}

                  {/* Logical Date & Time Scheduling */}
                  <div className="space-y-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-xs font-semibold text-slate-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
                          Appointment Schedule (Date & Time) <span className="text-rose-500">*</span>
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                        Logical Timing
                      </span>
                    </div>

                    {/* Offset Value + Unit + Direction */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Time Amount</label>
                        <input
                          type="number"
                          min={0}
                          value={params.scheduleOffsetValue ?? 1}
                          onChange={(e) => onChange({ scheduleOffsetValue: Math.max(0, parseInt(e.target.value) || 0) })}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Time Unit</label>
                        <select
                          value={params.scheduleOffsetUnit || "days"}
                          onChange={(e) => onChange({ scheduleOffsetUnit: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                        >
                          <option value="hours">Hours</option>
                          <option value="days">Days</option>
                          <option value="business_days">Business Days</option>
                          <option value="weeks">Weeks</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Timing</label>
                        <select
                          value={params.scheduleDirection || "after"}
                          onChange={(e) => onChange({ scheduleDirection: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                        >
                          <option value="after">After</option>
                          <option value="before">Before</option>
                        </select>
                      </div>
                    </div>

                    {/* Relative Baseline / Anchor */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-semibold text-slate-600">
                          Relative To (Reference Event)
                        </label>
                        {params.scheduleAnchor === "field_token" && (
                          <button
                            type="button"
                            onClick={() => {
                              setTargetProcessFieldKey("scheduleAnchorField");
                              setFieldModalMode("assignProcessFieldToken");
                              setIsFieldRegistryModalOpen(true);
                            }}
                            className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                          >
                            Select Date Field
                          </button>
                        )}
                      </div>
                      <select
                        value={params.scheduleAnchor || "client_created"}
                        onChange={(e) => onChange({ scheduleAnchor: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="client_created">Client Created (Intake Date)</option>
                        <option value="process_enrolled">Process Enrolled Date</option>
                        <option value="stage_entered">Stage Entered Date</option>
                        <option value="execution_time">Automation Execution Time (Now)</option>
                        <option value="field_token">Custom Record Date Field...</option>
                      </select>
                      {params.scheduleAnchor === "field_token" && (
                        <input
                          type="text"
                          value={params.scheduleAnchorField || ""}
                          onChange={(e) => onChange({ scheduleAnchorField: e.target.value })}
                          placeholder="e.g. {{client.date_of_birth}} or {{process.due_date}}"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      )}
                    </div>


                  </div>

                  {/* Appointment Method / Location */}
                  {renderField(
                    "Location / Method",
                    <select
                      value={params.locationType || "in-person"}
                      onChange={(e) => onChange({ locationType: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-xs focus:outline-none focus:border-blue-500"
                    >
                      <option value="in-person">In-Person Clinic</option>
                      <option value="video">Telehealth / Video Call</option>
                      <option value="phone">Phone Call</option>
                    </select>
                  )}

                  {/* Assigned Provider */}
                  {renderField(
                    "Assigned Provider / Staff",
                    <select
                      value={params.assignedTo || ""}
                      onChange={(e) => onChange({ assignedTo: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-xs focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Any Available Staff</option>
                      {availableEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })()}

            {/* ───────────── CREATE CLIENT (CRM Entity) ───────────── */}
            {(stepKey === "create_client" || stepKey === "create-client") && (() => {
              return (
                <div className="space-y-4">
                  {/* Client Full Name */}
                  {renderField(
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">Client / Contact Name *</span>
                      <button
                        type="button"
                        onClick={() => {
                          setTargetProcessFieldKey("name");
                          setFieldModalMode("assignProcessFieldToken");
                          setIsFieldRegistryModalOpen(true);
                        }}
                        className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                      >
                        Select Field
                      </button>
                    </div>,
                    <input
                      type="text"
                      value={params.name ?? params.clientName ?? ""}
                      onChange={(e) => onChange({ name: e.target.value, clientName: e.target.value })}
                      placeholder="e.g. John Doe or {{lead_name}}"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-xs focus:outline-none focus:border-blue-500"
                    />
                  )}

                  {/* Phone & Email */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      {renderField(
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">Phone Number</span>
                          <button
                            type="button"
                            onClick={() => {
                              setTargetProcessFieldKey("phone");
                              setFieldModalMode("assignProcessFieldToken");
                              setIsFieldRegistryModalOpen(true);
                            }}
                            className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                          >
                            Select Field
                          </button>
                        </div>,
                        <input
                          type="tel"
                          value={params.phone ?? ""}
                          onChange={(e) => onChange({ phone: e.target.value })}
                          placeholder="+1 (555) 000-0000"
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs focus:outline-none focus:border-blue-500"
                        />
                      )}
                    </div>
                    <div>
                      {renderField(
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">Email Address</span>
                          <button
                            type="button"
                            onClick={() => {
                              setTargetProcessFieldKey("email");
                              setFieldModalMode("assignProcessFieldToken");
                              setIsFieldRegistryModalOpen(true);
                            }}
                            className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                          >
                            Select Field
                          </button>
                        </div>,
                        <input
                          type="email"
                          value={params.email ?? ""}
                          onChange={(e) => onChange({ email: e.target.value })}
                          placeholder="client@example.com"
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs focus:outline-none focus:border-blue-500"
                        />
                      )}
                    </div>
                  </div>

                  {/* Contact Type & Lead Source */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      {renderField(
                        "Contact Type",
                        <select
                          value={params.contactType || "Lead"}
                          onChange={(e) => onChange({ contactType: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs focus:outline-none focus:border-blue-500"
                        >
                          <option value="Lead">Lead</option>
                          <option value="Prospect">Prospect</option>
                          <option value="Client">Client</option>
                          <option value="Patient">Patient</option>
                          <option value="Customer">Customer</option>
                          <option value="VIP">VIP</option>
                        </select>
                      )}
                    </div>
                    <div>
                      {renderField(
                        "Lead Source",
                        <select
                          value={params.leadSource || "Website"}
                          onChange={(e) => onChange({ leadSource: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs focus:outline-none focus:border-blue-500"
                        >
                          <option value="Website">Website Form</option>
                          <option value="Inbound Call">Inbound Call</option>
                          <option value="Referral">Referral</option>
                          <option value="Ad Campaign">Ad Campaign</option>
                          <option value="Social Media">Social Media</option>
                          <option value="Other">Other</option>
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Company / Organization */}
                  {renderField(
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">Company / Organization</span>
                      <button
                        type="button"
                        onClick={() => {
                          setTargetProcessFieldKey("company");
                          setFieldModalMode("assignProcessFieldToken");
                          setIsFieldRegistryModalOpen(true);
                        }}
                        className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                      >
                        Select Field
                      </button>
                    </div>,
                    <input
                      type="text"
                      value={params.company ?? ""}
                      onChange={(e) => onChange({ company: e.target.value })}
                      placeholder="e.g. Acme Corp or {{company_name}}"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-xs focus:outline-none focus:border-blue-500"
                    />
                  )}

                  {/* Responsible Person / Assigned To */}
                  {renderField(
                    "Responsible Person",
                    <select
                      value={params.assignedTo || ""}
                      onChange={(e) => onChange({ assignedTo: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-xs focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Select team member...</option>
                      {availableEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })()}

            {(stepKey === "scheduleappointment" || stepKey === "book-appointment" || stepKey === "reschedule-appointment" || stepKey === "cancel-appointment") && (
              <div className="space-y-4">
                {renderField("Appointment Booking Method",
                  <select
                    value={params.appointmentBookingMethod || ""}
                    onChange={e => onChange({ appointmentBookingMethod: e.target.value })}
                    className="w-full px-3 py-2.5 border rounded-md bg-white text-sm"
                  >
                    <option value="">Select a booking method...</option>
                    <option value="text-link">Text Booking Link</option>
                    <option value="collect-request">Collect Booking Request</option>
                    <option value="schedule-phone">Schedule Over Phone</option>
                  </select>
                )}

                {/* PRD 4.2: Auto-generate invoice on booking toggle */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Auto-generate invoice on booking</p>
                      <p className="text-[11px] text-slate-500">Automatically creates an invoice when the AI books this appointment</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={params.autoGenerateInvoice ?? true}
                      onChange={e => onChange({ autoGenerateInvoice: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    />
                  </div>

                  {(params.autoGenerateInvoice ?? true) && (
                    <div className="space-y-3 pt-1 border-t border-slate-200">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Service to bill *</label>
                        <select
                          value={params.serviceToBillId || "srv-1"}
                          onChange={e => onChange({ serviceToBillId: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-xs"
                        >
                          {MOCK_SERVICES.map(srv => (
                            <option key={srv.id} value={srv.id}>
                              {srv.name} (${srv.price})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Flat Fee Override ($)</label>
                        <input
                          type="number"
                          placeholder="Default service price"
                          value={params.serviceFeeOverride || ""}
                          onChange={e => onChange({ serviceFeeOverride: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-white text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PRD 4.3: Send Invoice Workflow Step */}
            {(stepKey === "send-invoice" || stepKey === "sendinvoice") && (
              <div className="space-y-4">
                {renderField("Delivery Channel",
                  <select
                    value={params.invoiceChannel || "whatsapp"}
                    onChange={e => onChange({ invoiceChannel: e.target.value })}
                    className="w-full px-3 py-2.5 border rounded-md bg-white text-sm"
                  >
                    <option value="whatsapp">WhatsApp (Recommended)</option>
                    <option value="sms">SMS Text</option>
                    <option value="email">Email</option>
                    <option value="auto">Auto (WhatsApp with SMS fallback)</option>
                  </select>
                )}

                {renderField("Payment Link Template",
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-xs">
                    <div className="font-semibold text-slate-800">lib-tpl-invoice-payment</div>
                    <div className="text-slate-600 italic">
                      "Hi &#123;&#123;contact_name&#125;&#125;, your invoice &#123;&#123;invoice_number&#125;&#125; for &#123;&#123;invoice_amount&#125;&#125; is ready. Due &#123;&#123;due_date&#125;&#125;."
                    </div>
                    <div className="text-blue-600 font-medium text-[11px] pt-1">
                      Button: [Pay Invoice Now] (URL: &#123;&#123;payment_link&#125;&#125;)
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Stage Action: Generate Invoice */}
            {(stepKey === "generate_invoice" || stepKey === "generate-invoice") && (() => {
              const triggerLower = (stepTrigger || params.stepTrigger || "").toLowerCase();
              const isApptTrigger = Boolean(
                triggerLower.includes("appt") ||
                triggerLower.includes("appointment") ||
                triggerLower.includes("booking")
              );
              const isApptProcess = Boolean(
                params.processName?.toLowerCase().includes("appointment") ||
                effectiveProcesses.some(p => (p.id === params.processId || p.entityType === "appointment") && 
                  (p.entityType === "appointment" || p.name.toLowerCase().includes("appointment")))
              );
              const canSupplyAppointment = Boolean(
                isApptTrigger ||
                isApptProcess ||
                params.hasAppointmentContext === true ||
                params.appointmentInRun === true
              );
              const canSupplyClient = true;

              // Default is the first available one:
              const firstAvailable = canSupplyAppointment ? "appointment" : (canSupplyClient ? "client" : "choose");
              const rawBillFor = params.billFor || firstAvailable;
              const currentBillFor = (rawBillFor === "appointment" && !canSupplyAppointment) ? firstAvailable : rawBillFor;

              // Services for "Choose services"
              const selectedServices = Array.isArray(params.selectedServices) && params.selectedServices.length > 0
                ? params.selectedServices
                : [
                    {
                      serviceId: MOCK_SERVICES[0].id,
                      name: MOCK_SERVICES[0].name,
                      quantity: 1,
                      unitPrice: MOCK_SERVICES[0].price,
                      taxPercent: MOCK_SERVICES[0].tax ?? 5,
                    }
                  ];

              const dueDays = typeof params.dueDays === "number" ? params.dueDays : 14;
              const paymentMode = params.paymentMode || "Bank Transfer";

              const handleBillForChange = (newBillFor: string) => {
                const patch: Record<string, any> = { billFor: newBillFor };
                if (newBillFor === "choose" && (!params.selectedServices || params.selectedServices.length === 0)) {
                  patch.selectedServices = selectedServices;
                }
                onChange(patch);
              };

              const handleUpdateServiceDiscount = (index: number, newDiscount: number) => {
                const next = selectedServices.map((item: any, i: number) => i === index ? { ...item, discount: newDiscount } : item);
                onChange({ selectedServices: next });
              };

              const handleUpdateServiceDiscountType = (index: number, newType: string) => {
                const next = selectedServices.map((item: any, i: number) => i === index ? { ...item, discountType: newType } : item);
                onChange({ selectedServices: next });
              };

              const handleSelectServiceChange = (index: number, serviceId: string) => {
                const found = MOCK_SERVICES.find((s) => s.id === serviceId) || MOCK_SERVICES[0];
                const next = selectedServices.map((item: any, i: number) =>
                  i === index
                    ? {
                        ...item,
                        serviceId: found.id,
                        name: found.name,
                        unitPrice: found.price,
                        taxPercent: found.tax ?? 5,
                      }
                    : item
                );
                onChange({ selectedServices: next });
              };

              const handleRemoveService = (index: number) => {
                const next = selectedServices.filter((_: any, i: number) => i !== index);
                onChange({ selectedServices: next });
              };

              const handleUpdateServiceQty = (index: number, newQty: number) => {
                const next = selectedServices.map((item: any, i: number) =>
                  i === index ? { ...item, quantity: newQty } : item
                );
                onChange({ selectedServices: next });
              };

              const handleAddService = () => {
                const defaultService = MOCK_SERVICES[0];
                const next = [
                  ...selectedServices,
                  {
                    serviceId: defaultService.id,
                    name: defaultService.name,
                    quantity: 1,
                    unitPrice: defaultService.price,
                    taxPercent: defaultService.tax ?? 5,
                    discount: 0,
                    discountType: "%",
                  },
                ];
                onChange({ selectedServices: next });
              };

              return (
                <div className="space-y-4">
                  {/* Bill for dropdown */}
                  {renderField("Bill for",
                    <select
                      value={currentBillFor}
                      onChange={(e) => handleBillForChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-800"
                    >
                      <option value="appointment" disabled={!canSupplyAppointment}>
                        Appointment's service {!canSupplyAppointment ? "(Unavailable - no appointment in trigger)" : ""}
                      </option>
                      <option value="client" disabled={!canSupplyClient}>
                        Client's services {!canSupplyClient ? "(Unavailable)" : ""}
                      </option>
                      <option value="choose">Choose services</option>
                    </select>
                  )}

                  {/* Quantity and Discount per type */}
                  {currentBillFor === "appointment" && (
                    <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl space-y-3">
                      <p className="text-xs text-slate-500">Service automatically pulled from the appointment.</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity</label>
                          <input
                            type="number"
                            value={1}
                            disabled
                            readOnly
                            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-slate-100 text-slate-500 font-semibold cursor-not-allowed text-sm"
                          />
                          <span className="text-[10px] text-slate-400 mt-0.5 block">Fixed to 1 for appointment</span>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Discount</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              value={params.discount ?? 0}
                              onChange={(e) => onChange({ discount: Math.max(0, parseFloat(e.target.value) || 0) })}
                              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="0"
                            />
                            <select
                              value={params.discountType || "%"}
                              onChange={(e) => onChange({ discountType: e.target.value })}
                              className="px-2.5 py-2 border border-slate-200 rounded-xl bg-white text-sm font-semibold text-slate-700 focus:outline-none"
                            >
                              <option value="%">%</option>
                              <option value="$">$</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentBillFor === "client" && (
                    <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl space-y-3">
                      <p className="text-xs text-slate-500">Service automatically pulled from the client profile.</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity</label>
                          <input
                            type="number"
                            min={1}
                            value={params.quantity || 1}
                            onChange={(e) => onChange({ quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Discount</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              value={params.discount ?? 0}
                              onChange={(e) => onChange({ discount: Math.max(0, parseFloat(e.target.value) || 0) })}
                              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="0"
                            />
                            <select
                              value={params.discountType || "%"}
                              onChange={(e) => onChange({ discountType: e.target.value })}
                              className="px-2.5 py-2 border border-slate-200 rounded-xl bg-white text-sm font-semibold text-slate-700 focus:outline-none"
                            >
                              <option value="%">%</option>
                              <option value="$">$</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentBillFor === "choose" && (
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-[#020817]" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        Services
                      </label>
                      {selectedServices.map((item: any, idx: number) => (
                        <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <label className="block text-xs font-semibold text-slate-700 mb-1">Service</label>
                              <select
                                value={item.serviceId}
                                onChange={(e) => handleSelectServiceChange(idx, e.target.value)}
                                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                {MOCK_SERVICES.map(s => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            {selectedServices.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveService(idx)}
                                className="mt-5 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Remove service"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity</label>
                              <input
                                type="number"
                                min={1}
                                value={item.quantity || 1}
                                onChange={(e) => handleUpdateServiceQty(idx, Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">Discount</label>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  value={item.discount ?? 0}
                                  onChange={(e) => handleUpdateServiceDiscount(idx, Math.max(0, parseFloat(e.target.value) || 0))}
                                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="0"
                                />
                                <select
                                  value={item.discountType || "%"}
                                  onChange={(e) => handleUpdateServiceDiscountType(idx, e.target.value)}
                                  className="px-2.5 py-2 border border-slate-200 rounded-xl bg-white text-sm font-semibold text-slate-700 focus:outline-none"
                                >
                                  <option value="%">%</option>
                                  <option value="$">$</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={handleAddService}
                        className="w-full py-2 px-3 border border-dashed border-slate-300 hover:border-blue-400 rounded-xl text-xs font-semibold text-blue-600 hover:bg-blue-50/50 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add another service
                      </button>
                    </div>
                  )}

                  {/* Due in and Payment mode */}
                  <div className="grid grid-cols-2 gap-3">
                    {renderField("Due in",
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={365}
                          value={dueDays}
                          onChange={(e) => onChange({ dueDays: Math.max(0, parseInt(e.target.value) || 0) })}
                          className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-slate-600 shrink-0">days</span>
                      </div>
                    )}

                    {renderField("Payment mode",
                      <select
                        value={paymentMode}
                        onChange={(e) => onChange({ paymentMode: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Bank Transfer">Bank Transfer (Clinic default)</option>
                        <option value="Card">Card</option>
                        <option value="Cash">Cash</option>
                        <option value="Insurance-EMI">Insurance-EMI</option>
                      </select>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Stage Entry Action: Send Payment (Records category) */}
            {stepKey === "send_payment" && (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-blue-900">
                    <span>Send Payment Link</span>
                    <InfoTooltip text="Sends a secure payment collection link directly to the contact." />
                  </div>
                  <p className="text-blue-700/80 text-[11px]">
                    Dispatches the client's current outstanding balance or invoice link.
                  </p>
                </div>

                {renderField("Delivery Channel",
                  <select
                    value={params.channel || "whatsapp"}
                    onChange={e => onChange({ channel: e.target.value })}
                    className="w-full px-3 py-2.5 border rounded-md bg-white text-sm"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS Text</option>
                    <option value="email">Email</option>
                  </select>
                )}
              </div>
            )}

            {stepKey === "smartcallanalysis" && (
              <div className="space-y-4">
                {renderField(
                  <span className="inline-flex items-center gap-1.5">
                    Configure Scenario
                    <InfoTooltip text="Define one thing you want the AI to listen for and record during the call, e.g. 'Did the caller mention a competitor?'" />
                  </span>,
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Scenario name / what to track..."
                      value={smartAnalysisTrackWhat}
                      onChange={e => setSmartAnalysisTrackWhat(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                    <textarea
                      placeholder="AI description of what to capture..."
                      value={smartAnalysisCaptureDesc}
                      onChange={e => setSmartAnalysisCaptureDesc(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!smartAnalysisTrackWhat) return;
                        onChange({
                          callAnalysisScenarios: [...callAnalysisScenarios, {
                            id: Date.now(),
                            name: smartAnalysisTrackWhat,
                            description: smartAnalysisCaptureDesc,
                            dataFormat: smartAnalysisDataFormat
                          }]
                        });
                        setSmartAnalysisTrackWhat("");
                        setSmartAnalysisCaptureDesc("");
                      }}
                      className="w-full py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700"
                    >
                      Add Scenario
                    </button>
                  </div>
                )}
                <div className="space-y-2">
                  {callAnalysisScenarios.map((scenario: any, i: number) => (
                    <div key={scenario.id} className="p-3 border rounded bg-gray-50 flex justify-between items-center text-xs text-left">
                      <div>
                        <p className="font-semibold">{scenario.name}</p>
                        <p className="text-gray-500">{scenario.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onChange({ callAnalysisScenarios: callAnalysisScenarios.filter((x: any) => x.id !== scenario.id) })}
                        className="text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stepKey === "autohangupsilence" && renderField("Silence Duration (seconds)",
              <input
                type="number"
                min={1}
                value={autoHangupSilenceStageDuration}
                onChange={e => onChange({ autoHangupSilenceStageDuration: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border rounded-md"
              />
            )}

            {stepKey === "callhangup" && renderField("Hangup Message",
              <textarea
                value={callHangupMessage}
                onChange={e => onChange({ callHangupMessage: e.target.value })}
                placeholder="Goodbye..."
                className="w-full p-3 border rounded-md bg-white"
              />
            )}

            {stepKey === "idlemessages" && (
              <div className="space-y-4">
                {renderField("Idle Message", <textarea value={idleMessageStageText} onChange={e => onChange({ idleMessageStageText: e.target.value })} rows={2} className="w-full px-3 py-2.5 border rounded-md" />)}
                {renderField("Idle Delay (sec)", <input type="number" min={1} value={idleMessageStageDelay} onChange={e => onChange({ idleMessageStageDelay: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2 border rounded-md" />)}
                {renderField("Idle Hangup Message", <textarea value={idleHangupMessageStage} onChange={e => onChange({ idleHangupMessageStage: e.target.value })} rows={2} className="w-full px-3 py-2.5 border rounded-md" />)}
                {renderField("Idle Hangup Delay (sec)", <input type="number" min={1} value={idleHangupDelayStage} onChange={e => onChange({ idleHangupDelayStage: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2 border rounded-md" />)}
              </div>
            )}

            {stepKey === "endworkflow" && (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Terminates the workflow immediately.</p>
              </div>
            )}



            {(stepKey === "send_payment" || stepKey === "send-payment") && (
              <div className="space-y-4">
                {renderField("Payment Provider / Link Type",
                  <select
                    value={params.paymentProvider || "stripe"}
                    onChange={(e) => onChange({ paymentProvider: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-border rounded-xl text-sm"
                  >
                    <option value="stripe">Online Payment Link (Stripe Hosted)</option>
                    <option value="clinic_portal">Patient Portal Direct Pay</option>
                  </select>
                )}
                {renderField("Dispatch Notification Channel",
                  <select
                    value={params.deliveryChannel || "whatsapp_sms"}
                    onChange={(e) => onChange({ deliveryChannel: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-border rounded-xl text-sm"
                  >
                    <option value="whatsapp_sms">WhatsApp & SMS Notification</option>
                    <option value="whatsapp">WhatsApp Only</option>
                    <option value="sms">SMS Text Message Only</option>
                    <option value="email">Email Notification Only</option>
                  </select>
                )}
                {renderField("Custom Payment Message (Optional)",
                  <textarea
                    value={params.customMessage || ""}
                    onChange={(e) => onChange({ customMessage: e.target.value })}
                    placeholder="Hi {client_name}, here is your secure checkout link for your session..."
                    rows={2}
                    className="w-full px-3 py-2 bg-white border border-border rounded-xl text-sm"
                  />
                )}
              </div>
            )}

            {(stepKey === "send-invoice" || stepKey === "send_invoice") && (
              <div className="space-y-4">
                {renderField("Delivery Channel",
                  <select
                    value={params.channel || "whatsapp"}
                    onChange={(e) => onChange({ channel: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-border rounded-xl text-sm"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </select>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="includePdfAttachment"
                    checked={params.includePdf !== false}
                    onChange={(e) => onChange({ includePdf: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="includePdfAttachment" className="text-xs text-gray-700 font-medium">
                    Attach downloadable PDF invoice statement
                  </label>
                </div>
              </div>
            )}

            {/* ───────────── CONDITION NODE RULES ───────────── */}
            {stepKey === "condition" && renderConditionCasesBuilder()}

            {stepKey === "wait" && (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    {renderField("Duration",
                      <input
                        type="number"
                        value={params.duration || 5}
                        onChange={(e) => onChange({ duration: parseInt(e.target.value) || 1 })}
                        min={1}
                        className="w-full px-3 py-2 bg-white border border-border rounded-xl text-sm"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    {renderField("Unit",
                      <select
                        value={params.unit || "minutes"}
                        onChange={(e) => onChange({ unit: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-border rounded-xl text-sm"
                      >
                        <option value="seconds">Seconds</option>
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>
            )}

            {stepKey === "parallel" && (
              <div className="space-y-4">
                {renderField("Number of Branches",
                  <input
                    type="number"
                    value={params.branchCount || 2}
                    min={2}
                    max={6}
                    onChange={(e) => onChange({ branchCount: Math.min(6, Math.max(2, parseInt(e.target.value) || 2)) })}
                    className="w-full px-3 py-2 bg-white border border-border rounded-xl text-sm"
                  />
                )}
              </div>
            )}

            {/* ───────────── GENERATE DOCUMENT AUTOMATION STEP ───────────── */}
            {(stepKey === "generate_document" || stepKey === "generate-document") && (() => {
              const selectedEntity = ((params.entity as TemplateEntity) || "client");
              const storedTemplates = getStoredDocumentTemplates();

              // Filter stored templates by entity AND active scopingRules
              const availableTemplates = storedTemplates.filter((t) =>
                isDocumentTemplateMatchingScopeRules(t, scopingRules, selectedEntity)
              );

              // Active scope summary for display
              const activeRule = scopingRules?.find(
                (r) =>
                  (r.industryCategory && r.industryCategory !== "All" && r.industryCategory !== "All Categories") ||
                  (r.industries && r.industries.length > 0 && !r.industries.includes("All") && !r.industries.includes("All Industries")) ||
                  (r.locations && r.locations.length > 0 && !r.locations.includes("All") && !r.locations.includes("All Locations"))
              );

              const currentTemplateId = params.templateId || availableTemplates[0]?.id || "";
              const activeTemplate = availableTemplates.find((t) => t.id === currentTemplateId) || availableTemplates[0];

              const handleEntityChange = (newEntity: TemplateEntity) => {
                const nextTemplates = storedTemplates.filter((t) =>
                  isDocumentTemplateMatchingScopeRules(t, scopingRules, newEntity)
                );
                const firstTpl = nextTemplates[0];
                onChange({
                  entity: newEntity,
                  templateId: firstTpl?.id || "",
                  templateName: firstTpl?.name || "",
                  documentName: firstTpl ? `{client_name} - ${firstTpl.name}` : `{client_name} - Document`,
                });
              };

              const handleTemplateSelect = (tplId: string) => {
                const found = availableTemplates.find((t) => t.id === tplId);
                onChange({
                  templateId: tplId,
                  templateName: found?.name || "",
                  documentName: `{client_name} - ${found?.name || "Document"}`,
                });
              };

              const docName = params.documentName || (activeTemplate ? `{client_name} - ${activeTemplate.name}` : "Generated Document");

              const ENTITY_CONFIG = [
                { key: "client" as TemplateEntity, label: "Client", icon: User },
                { key: "process" as TemplateEntity, label: "Process", icon: Briefcase },
                { key: "appointment" as TemplateEntity, label: "Appointment", icon: Calendar },
                { key: "invoice" as TemplateEntity, label: "Invoice", icon: Receipt },
              ];

              return (
                <div className="space-y-4">
                  {/* Select Entity Dice */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-gray-700">Select Entity *</label>
                      <span className="text-[11px] text-gray-400">Target entity for template</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {ENTITY_CONFIG.map(({ key, label, icon: Icon }) => {
                        const isSelected = selectedEntity === key;
                        const entityCount = storedTemplates.filter((t) =>
                          isDocumentTemplateMatchingScopeRules(t, scopingRules, key)
                        ).length;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleEntityChange(key)}
                            className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                              isSelected
                                ? "bg-blue-50/80 border-blue-500 text-blue-700 shadow-sm ring-1 ring-blue-500/30 font-semibold"
                                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${isSelected ? "text-blue-600" : "text-slate-400"}`} />
                            <span className="text-xs leading-none">{label}</span>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${
                                isSelected ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {entityCount}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Scope Feedback Badge */}
                  {activeRule ? (
                    <div className="flex items-center justify-between px-3 py-2 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="font-medium text-[11px]">
                          Filtered by Scope: <strong className="font-bold text-amber-950">{activeRule.industryCategory}</strong>
                          {activeRule.industries && activeRule.industries.length > 0 && ` • ${activeRule.industries.join(", ")}`}
                          {activeRule.locations && activeRule.locations.length > 0 && ` • ${activeRule.locations.join(", ")}`}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold bg-amber-100/90 text-amber-800 px-2 py-0.5 rounded-md">
                        {availableTemplates.length} matching
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                      <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        Global Scope (All industries & locations)
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        {availableTemplates.length} templates
                      </span>
                    </div>
                  )}

                  {/* Respective Template */}
                  {availableTemplates.length > 0 ? (
                    <>
                      {renderField(
                        <div className="flex items-center justify-between">
                          <span>Select Template ({selectedEntity.toUpperCase()})</span>
                          <span className="text-[11px] text-gray-500 font-normal">
                            {availableTemplates.length} available
                          </span>
                        </div>,
                        <select
                          value={currentTemplateId}
                          onChange={(e) => handleTemplateSelect(e.target.value)}
                          className="w-full px-3 py-2.5 bg-white border border-border rounded-xl text-xs font-medium focus:border-blue-500 outline-none"
                        >
                          {availableTemplates.map((tpl) => (
                            <option key={tpl.id} value={tpl.id}>
                              {tpl.name} ({tpl.category}) {tpl.scopingRules && tpl.scopingRules.length > 0 ? "• Scoped" : ""}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Selected Template Description Card */}
                      {activeTemplate && (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5">
                          <FileCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800">{activeTemplate.name}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {activeTemplate.extractedFields?.length || 0} fillable fields mapped • Category: {activeTemplate.category}
                              {activeTemplate.scopingRules && activeTemplate.scopingRules.length > 0
                                ? ` • Scoped to ${activeTemplate.scopingRules.map((r) => r.industryCategory).filter(Boolean).join(", ")}`
                                : " • Global Scope"}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center space-y-2">
                      <FileCheck className="w-6 h-6 text-slate-400 mx-auto" />
                      <p className="text-xs font-semibold text-slate-700">No {selectedEntity} templates match this scope</p>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                        No templates for entity "{selectedEntity}" match the active scope rule ({activeRule?.industryCategory || "specified scope"}).
                      </p>
                      <Link
                        to="/admin/document-templates"
                        target="_blank"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 underline pt-1"
                      >
                        Manage Document Templates <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  )}

                  {/* Document Name / Title */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-gray-700">Document Title / File Name</label>
                      <VariablePickerButton
                        targetRef={getRefForField("docNameInput")}
                        value={docName}
                        onChange={(newVal) => onChange({ documentName: newVal })}
                        label="+ Insert Variable"
                      />
                    </div>
                    <input
                      ref={(el) => { inputRefs.current["docNameInput"] = el; }}
                      type="text"
                      value={docName}
                      onChange={(e) => onChange({ documentName: e.target.value })}
                      placeholder="e.g. {client_name} - Consultation Intake Document"
                      className="w-full px-3 py-2 bg-white border border-border rounded-xl text-xs"
                    />
                  </div>

                  {/* Output Format (Cleaned, Execution Mode removed) */}
                  <div>
                    {renderField("Output Format",
                      <select
                        value={params.fileType || "pdf"}
                        onChange={(e) => onChange({ fileType: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-border rounded-xl text-xs"
                      >
                        <option value="pdf">PDF Document (.pdf)</option>
                        <option value="doc">Word Document (.docx)</option>
                      </select>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
      )}

      {/* Root Field Registry Modal (Shared across Trigger, Conditions, and Field Updates) */}
      {isFieldRegistryModalOpen && (
        <SelectFieldsMultiModal
          isOpen={isFieldRegistryModalOpen}
          onClose={() => setIsFieldRegistryModalOpen(false)}
          singleSelect={
            fieldModalMode === "fieldConditionSingle" ||
            fieldModalMode === "fieldUpdateSingle" ||
            fieldModalMode === "genericCondition" ||
            fieldModalMode === "conditionNodeSingle" ||
            fieldModalMode === "caseConditionSingle" ||
            fieldModalMode === "caseConditionDynamic" ||
            fieldModalMode === "triggerConditionSingle" ||
            fieldModalMode === "assignProcessFieldToken"
          }
          initialSelectedKeys={
            fieldModalMode === "monitoredFields"
              ? (Array.isArray(params.monitoredFields) ? params.monitoredFields : [])
              : fieldModalMode === "caseConditionSingle" && targetCaseIndex !== null && targetCaseConditionIndex !== null && conditionCases[targetCaseIndex]?.conditions[targetCaseConditionIndex]?.field
              ? [conditionCases[targetCaseIndex].conditions[targetCaseConditionIndex].field]
              : fieldModalMode === "caseConditionDynamic" && targetCaseIndex !== null && targetCaseConditionIndex !== null && conditionCases[targetCaseIndex]?.conditions[targetCaseConditionIndex]?.dynamicField
              ? [conditionCases[targetCaseIndex].conditions[targetCaseConditionIndex].dynamicField]
              : fieldModalMode === "conditionNodeSingle" && targetConditionIndex !== null && conditionRules[targetConditionIndex]?.field
              ? [conditionRules[targetConditionIndex].field]
              : fieldModalMode === "triggerConditionSingle" && targetTriggerConditionIndex !== null && triggerConditions[targetTriggerConditionIndex]?.field
              ? [triggerConditions[targetTriggerConditionIndex].field]
              : fieldModalMode === "fieldConditionSingle" && targetConditionIndex !== null && fieldConditions[targetConditionIndex]?.field
              ? [fieldConditions[targetConditionIndex].field]
              : fieldModalMode === "fieldUpdateSingle" && targetFieldUpdateIndex !== null && fieldUpdateBlocks[targetFieldUpdateIndex]?.fieldToEdit && fieldUpdateBlocks[targetFieldUpdateIndex].fieldToEdit !== "Select field..."
              ? [fieldUpdateBlocks[targetFieldUpdateIndex].fieldToEdit]
              : fieldModalMode === "genericCondition" && params.field
              ? [params.field]
              : []
          }
          onApply={handleFieldRegistryApply}
          title={
            fieldModalMode === "assignProcessFieldToken"
              ? "Select Field"
              : fieldModalMode === "monitoredFields"
              ? "Select Fields to Watch"
              : fieldModalMode === "caseConditionSingle"
              ? "Select Field"
              : fieldModalMode === "caseConditionMulti"
              ? "Select Fields"
              : fieldModalMode === "caseConditionDynamic"
              ? "Select Field"
              : fieldModalMode === "fieldConditionSingle" || fieldModalMode === "conditionNodeSingle"
              ? "Select Field"
              : fieldModalMode === "triggerConditionSingle"
              ? "Select Field"
              : fieldModalMode === "triggerConditionMulti"
              ? "Select Fields"
              : fieldModalMode === "fieldConditionMulti" || fieldModalMode === "conditionNodeMulti"
              ? "Select Fields"
              : fieldModalMode === "fieldUpdateSingle"
              ? "Select Field to Update"
              : fieldModalMode === "fieldUpdateMulti"
              ? "Select Fields to Update"
              : "Select Field"
          }
          subtitle={
            fieldModalMode === "monitoredFields"
              ? "Choose fields that will trigger this automation when updated"
              : fieldModalMode.includes("caseCondition")
              ? "Choose fields to evaluate in this condition case"
              : fieldModalMode.includes("triggerCondition")
              ? "Choose fields to filter when this trigger activates"
              : fieldModalMode.includes("Condition")
              ? "Choose fields to evaluate in conditions"
              : fieldModalMode.includes("Update")
              ? "Choose fields to update when this step runs"
              : "Select field"
          }
          scopingRules={scopingRules}
        />
      )}
    </div>
  );
}
