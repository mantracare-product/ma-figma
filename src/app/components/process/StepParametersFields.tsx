import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router";
import {
  ChevronDown, Plus, Trash2, Info, Sliders, Star, Volume2, Play, ArrowRight,
  User, PhoneForwarded, PhoneOff, Mail, MessageSquare, Paperclip, ExternalLink,
  ChevronRight, X, Copy, Pencil, Sparkles, Calendar, Receipt, Briefcase, FileCheck, Check, GitBranch
} from "lucide-react";
import VariablePickerButton, { FETCH_FIELD_SOURCES } from "./VariablePickerButton";
import VariableSelectorModal from "./VariableSelectorModal";
import SelectFieldsMultiModal from "./SelectFieldsMultiModal";
import { InfoTooltip } from "../help/InfoTooltip";
import { useFieldRegistry, isFieldMatchingOrg, ScopingRule } from "../../context/FieldRegistryContext";

import { getStoredTemplates } from "../../../lib/useWhatsappTemplates";
import { getStoredProcesses, DEFAULT_ENTITY_PROCESSES } from "../../../lib/useProcessStore";
import { MOCK_SERVICES } from "../../../lib/mockServicesData";
import { getStoredServices } from "../../../lib/servicesStore";
import {
  getStoredDocumentTemplates,
  isDocumentTemplateMatchingScopeRules,
  DocumentTemplate,
  TemplateEntity,
} from "../../../lib/documentTemplatesStore";

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
}

interface StepParametersFieldsProps {
  stepKey: string;
  params: Record<string, any>;
  onChange: (patch: Record<string, any>) => void;
  processes?: ProcessOption[];
  stepTrigger?: string;
  scopingRules?: ScopingRule[];
}

export default function StepParametersFields({
  stepKey,
  params,
  onChange,
  processes = [],
  stepTrigger,
  scopingRules = [],
}: StepParametersFieldsProps) {
  const effectiveProcesses = (processes && processes.length > 0) ? processes : getStoredProcesses();

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
  const [whatsappTemplates, setWhatsappTemplates] = useState<any[]>([]);
  const [whatsappCampaigns, setWhatsappCampaigns] = useState<any[]>([]);

  const [customApiIntegrations, setCustomApiIntegrations] = useState<any[]>([]);
  const [customWebhookIntegrations, setCustomWebhookIntegrations] = useState<any[]>([]);
  const [jsonPaste, setJsonPaste] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [isFieldRegistryModalOpen, setIsFieldRegistryModalOpen] = useState(false);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  const fieldUpdateBlocks = params.fieldUpdateBlocks ?? [
    { fieldType: "System Fields", fieldToEdit: "Select field...", valueSource: "static", updateValue: "" }
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

  return (
    <div className="space-y-6 text-left">
      {/* ───────────── CONDITIONS EDITOR ───────────── */}
      {(stepTrigger || stepKey === "trigger_config") && (
        <div className="w-full rounded-xl border border-gray-200 overflow-hidden bg-white">
          <div
            onClick={() => conditionsEnabled && setConditionsSectionExpanded(!conditionsSectionExpanded)}
            className={`flex items-center justify-between px-4 py-3 ${conditionsEnabled ? "cursor-pointer select-none" : ""}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#020817]" style={{ fontFamily: "DM Sans, sans-serif" }}>
                Conditions
              </span>
              <span className="text-xs text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>— optional</span>
              <InfoTooltip text="Add rules here to make this step run only in specific situations, like a certain field value or something the caller said." />
            </div>
            <div className="flex items-center gap-3">
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground transition-transform ${!conditionsEnabled ? "text-gray-300 cursor-not-allowed opacity-50" : conditionsSectionExpanded ? "rotate-180" : ""}`}
              />
              <label
                onClick={(e) => e.stopPropagation()}
                className="relative inline-flex items-center cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={conditionsEnabled}
                  onChange={(e) => {
                    const val = e.target.checked;
                    onChange({ conditionsEnabled: val });
                    if (val) setConditionsSectionExpanded(true);
                  }}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
              </label>
            </div>
          </div>

          {conditionsEnabled && conditionsSectionExpanded && (
            <div className="border-t border-gray-100 px-5 py-4 space-y-3 bg-gray-50/40">
              <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                This step will only execute when all specified conditions are met.
              </p>

              {stepTrigger === "incall" || stepTrigger === "inchat" ? (
                <div className="space-y-4">
                  {/* Field Conditions */}
                  <div className="rounded-lg border border-border overflow-hidden bg-white">
                    <button
                      onClick={() => setFieldConditionsGroupExpanded(!fieldConditionsGroupExpanded)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50/70 hover:bg-gray-100/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#020817]" style={{ fontFamily: "DM Sans, sans-serif" }}>
                          Field Conditions
                        </span>
                        <InfoTooltip text="Check the value of a specific field, like status or stage, before running this step." />
                        {fieldConditions.length > 0 && (
                          <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-semibold">
                            {fieldConditions.length}
                          </span>
                        )}
                      </div>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${fieldConditionsGroupExpanded ? "rotate-180" : ""}`} />
                    </button>

                    {fieldConditionsGroupExpanded && (
                      <div className="border-t border-border px-4 py-3 space-y-3 bg-white">
                        {fieldConditions.map((cond: any, index: number) => (
                          <div key={cond.id} className="border border-border rounded-lg overflow-hidden bg-white p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-gray-500">Condition #{index + 1}</span>
                              <button
                                onClick={() => onChange({ fieldConditions: fieldConditions.filter((c: any) => c.id !== cond.id) })}
                                className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Remove
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <select
                                value={cond.fieldSource}
                                onChange={e => {
                                  const updated = fieldConditions.map((c: any) => c.id === cond.id ? { ...c, fieldSource: e.target.value, field: "" } : c);
                                  onChange({ fieldConditions: updated });
                                }}
                                className="px-3 py-2 text-xs border rounded-md bg-white"
                              >
                                <option value="">Select source...</option>
                                {FETCH_FIELD_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                              </select>
                              <select
                                value={cond.field}
                                disabled={!cond.fieldSource}
                                onChange={e => {
                                  const updated = fieldConditions.map((c: any) => c.id === cond.id ? { ...c, field: e.target.value } : c);
                                  onChange({ fieldConditions: updated });
                                }}
                                className="px-3 py-2 text-xs border rounded-md bg-white"
                              >
                                <option value="">Select field...</option>
                                {(FETCH_FIELD_SOURCES.find(s => s.value === cond.fieldSource)?.fields || []).map(f => (
                                  <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <select
                                value={cond.operator}
                                onChange={e => {
                                  const updated = fieldConditions.map((c: any) => c.id === cond.id ? { ...c, operator: e.target.value } : c);
                                  onChange({ fieldConditions: updated });
                                }}
                                className="px-3 py-2 text-xs border rounded-md bg-white"
                              >
                                <option value="">Operator...</option>
                                <option value="Equal To">Equal To</option>
                                <option value="Not Equal To">Not Equal To</option>
                                <option value="Includes">Includes</option>
                                <option value="Is Empty">Is Empty</option>
                                <option value="Is Not Empty">Is Not Empty</option>
                              </select>
                              {cond.operator !== "Is Empty" && cond.operator !== "Is Not Empty" && (
                                <input
                                  type="text"
                                  value={cond.value}
                                  placeholder="Value..."
                                  onChange={e => {
                                    const updated = fieldConditions.map((c: any) => c.id === cond.id ? { ...c, value: e.target.value } : c);
                                    onChange({ fieldConditions: updated });
                                  }}
                                  className="px-3 py-2 text-xs border rounded-md"
                                />
                              )}
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={() => onChange({
                            fieldConditions: [...fieldConditions, { id: `field-cond-${Date.now()}`, fieldSource: "", field: "", operator: "", value: "" }]
                          })}
                          className="w-full py-2 text-xs border border-dashed border-gray-300 text-blue-600 rounded-md hover:bg-blue-50/20 flex items-center justify-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Field Condition
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Intent Conditions */}
                  <div className="rounded-lg border border-border overflow-hidden bg-white">
                    <button
                      onClick={() => setIntentConditionsGroupExpanded(!intentConditionsGroupExpanded)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50/70 hover:bg-gray-100/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#020817]" style={{ fontFamily: "DM Sans, sans-serif" }}>
                          Intent Conditions
                        </span>
                        <InfoTooltip text="Run this step only when the caller says something matching one of these intents, like asking for billing." />
                        {intentConditions.length > 0 && (
                          <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-semibold">
                            {intentConditions.length}
                          </span>
                        )}
                      </div>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${intentConditionsGroupExpanded ? "rotate-180" : ""}`} />
                    </button>

                    {intentConditionsGroupExpanded && (
                      <div className="border-t border-border px-4 py-3 space-y-3 bg-white">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={intentInput}
                            placeholder="Type caller intent (e.g., billing_query)..."
                            onChange={e => setIntentInput(e.target.value)}
                            className="flex-1 px-3 py-2 text-xs border rounded-md"
                          />
                          <button
                            onClick={() => {
                              if (!intentInput.trim()) return;
                              onChange({ intentConditions: [...intentConditions, { id: `intent-cond-${Date.now()}`, value: intentInput.trim() }] });
                              setIntentInput("");
                            }}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold"
                          >
                            Add
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {intentConditions.map((c: any) => (
                            <span key={c.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium">
                              {c.value}
                              <button onClick={() => onChange({ intentConditions: intentConditions.filter((x: any) => x.id !== c.id) })} className="hover:text-red-500">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Stage / Post-Call Conditions */
                <div className="space-y-3">
                  {conditions.map((cond: any, index: number) => (
                    <div key={cond.id} className="p-3 border rounded-lg space-y-3 bg-white">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500">Condition #{index + 1}</span>
                        <button
                          onClick={() => onChange({ conditions: conditions.filter((c: any) => c.id !== cond.id) })}
                          className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={cond.fieldSource}
                          onChange={e => {
                            const updated = conditions.map((c: any) => c.id === cond.id ? { ...c, fieldSource: e.target.value, field: "" } : c);
                            onChange({ conditions: updated });
                          }}
                          className="px-3 py-2 text-xs border rounded-md bg-white"
                        >
                          <option value="">Select source...</option>
                          {FETCH_FIELD_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                        <select
                          value={cond.field}
                          disabled={!cond.fieldSource}
                          onChange={e => {
                            const updated = conditions.map((c: any) => c.id === cond.id ? { ...c, field: e.target.value } : c);
                            onChange({ conditions: updated });
                          }}
                          className="px-3 py-2 text-xs border rounded-md bg-white"
                        >
                          <option value="">Select field...</option>
                          {(FETCH_FIELD_SOURCES.find(s => s.value === cond.fieldSource)?.fields || []).map(f => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={cond.operator}
                          onChange={e => {
                            const updated = conditions.map((c: any) => c.id === cond.id ? { ...c, operator: e.target.value } : c);
                            onChange({ conditions: updated });
                          }}
                          className="px-3 py-2 text-xs border rounded-md bg-white"
                        >
                          <option value="">Operator...</option>
                          <option value="Equal To">Equal To</option>
                          <option value="Not Equal To">Not Equal To</option>
                          <option value="Includes">Includes</option>
                          <option value="Is Empty">Is Empty</option>
                          <option value="Is Not Empty">Is Not Empty</option>
                        </select>
                        {cond.operator !== "Is Empty" && cond.operator !== "Is Not Empty" && (
                          <input
                            type="text"
                            value={cond.value}
                            placeholder="Value..."
                            onChange={e => {
                              const updated = conditions.map((c: any) => c.id === cond.id ? { ...c, value: e.target.value } : c);
                              onChange({ conditions: updated });
                            }}
                            className="px-3 py-2 text-xs border rounded-md"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => onChange({
                      conditions: [...conditions, { id: `cond-${Date.now()}`, fieldSource: "", field: "", operator: "", value: "" }]
                    })}
                    className="w-full py-2 text-xs border border-dashed border-gray-300 text-blue-600 rounded-md hover:bg-blue-50/20 flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Condition
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ───────────── PARAMETERS FIELDS ACCORDION ───────────── */}
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
            {(stepKey === "fieldupdate" || stepKey === "field-update") && (
              <div className="space-y-4">
                {fieldUpdateBlocks.map((block: any, index: number) => (
                  <div key={index} className="border border-border rounded-lg overflow-hidden bg-white p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">Block #{index + 1}</span>
                      {fieldUpdateBlocks.length > 1 && (
                        <button
                          onClick={() => onChange({ fieldUpdateBlocks: fieldUpdateBlocks.filter((_: any, i: number) => i !== index) })}
                          className="text-xs text-red-500 flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={block.fieldType}
                        onChange={e => {
                          const updated = fieldUpdateBlocks.map((b: any, i: number) => i === index ? { ...b, fieldType: e.target.value, fieldToEdit: "" } : b);
                          onChange({ fieldUpdateBlocks: updated });
                        }}
                        className="w-full px-3 py-2 text-xs border rounded-md bg-white"
                      >
                        <option>System Fields</option>
                        <option>Custom Fields</option>
                      </select>
                      <select
                        value={block.fieldToEdit}
                        onChange={e => {
                          const updated = fieldUpdateBlocks.map((b: any, i: number) => i === index ? { ...b, fieldToEdit: e.target.value } : b);
                          onChange({ fieldUpdateBlocks: updated });
                        }}
                        className="w-full px-3 py-2 text-xs border rounded-md bg-white"
                      >
                        <option>Select field...</option>
                        {block.fieldType === "System Fields" ? (
                          <>
                            <option value="contact_name">Contact Name</option>
                            <option value="contact_email">Contact Email</option>
                            <option value="contact_phone">Contact Phone</option>
                          </>
                        ) : (
                          <>
                            {customClientFields.length > 0 ? (
                              customClientFields.map((cf) => (
                                <option key={cf.key} value={cf.key}>
                                  {cf.label || cf.key}
                                </option>
                              ))
                            ) : (
                              <>
                                <option value="custom_field_1">Custom Field 1</option>
                                <option value="custom_field_2">Custom Field 2</option>
                              </>
                            )}
                          </>
                        )}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={block.valueSource}
                        onChange={e => {
                          const updated = fieldUpdateBlocks.map((b: any, i: number) => i === index ? { ...b, valueSource: e.target.value, updateValue: "" } : b);
                          onChange({ fieldUpdateBlocks: updated });
                        }}
                        className="w-full px-3 py-2 text-xs border rounded-md bg-white"
                      >
                        <option value="static">Static Value</option>
                        <option value="variable">Variable / Formula</option>
                      </select>
                      <input
                        type="text"
                        value={block.updateValue}
                        placeholder="New value..."
                        onChange={e => {
                          const updated = fieldUpdateBlocks.map((b: any, i: number) => i === index ? { ...b, updateValue: e.target.value } : b);
                          onChange({ fieldUpdateBlocks: updated });
                        }}
                        className="w-full px-3 py-2 text-xs border rounded-md"
                      />
                      <p className="col-span-2 -mt-1 text-[11px] text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Static Value: type the exact text to set. Variable / Formula: reference data from earlier in the call.
                      </p>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => onChange({
                    fieldUpdateBlocks: [...fieldUpdateBlocks, { fieldType: "System Fields", fieldToEdit: "Select field...", valueSource: "static", updateValue: "" }]
                  })}
                  className="w-full py-2.5 text-xs border border-dashed border-gray-300 text-blue-600 rounded-md hover:bg-blue-50/20 flex items-center justify-center gap-1 font-semibold"
                >
                  <Plus className="w-4 h-4" /> Add Field Update
                </button>
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
              <div className="space-y-4 border p-4 rounded-xl bg-white shadow-sm">
                {customWebhookIntegrations.length === 0 ? (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-[#020817]">Select Integration</label>
                    <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-lg border border-dashed flex flex-col gap-1.5 bg-white">
                      <span>No Webhook integrations yet — create one in Settings → Integrations</span>
                      <Link to="/settings?tab=integrations" className="text-xs text-blue-600 hover:underline font-semibold w-fit">
                        CRM/Data Source → Custom Webhook
                      </Link>
                    </div>
                  </div>
                ) : (
                  renderField("Select Integration",
                    <select
                      value={webhookSelectedIntegrationId}
                      onChange={e => {
                        const id = e.target.value;
                        const integration = customWebhookIntegrations.find(i => i.id === id);
                        const schemaFields = integration ? (integration.fieldMappings || []).map((fm: any) => ({
                          key: fm.key,
                          value: ""
                        })) : [];
                        onChange({
                          webhookSelectedIntegrationId: id,
                          webhookParsedFields: schemaFields
                        });
                      }}
                      className="w-full px-3 py-2.5 border rounded-md bg-white text-sm"
                    >
                      <option value="">Select integration...</option>
                      {customWebhookIntegrations.map(i => (
                        <option key={i.id} value={i.id}>{i.name} ({i.webhookUrl})</option>
                      ))}
                    </select>
                  )
                )}

                {(() => {
                  const selectedWhInt = customWebhookIntegrations.find(i => i.id === webhookSelectedIntegrationId);
                  if (!selectedWhInt) return null;

                  const handleParseJson = () => {
                    try {
                      const parsed = JSON.parse(jsonPaste);
                      if (typeof parsed !== "object" || parsed === null) {
                        setJsonError("Must be a valid JSON object");
                        return;
                      }
                      const newFields = Object.keys(parsed).map(k => ({
                        key: k,
                        value: typeof parsed[k] === "string" ? parsed[k] : JSON.stringify(parsed[k])
                      }));
                      onChange({ webhookParsedFields: newFields });
                      setJsonError("");
                      setJsonPaste("");
                    } catch (err: any) {
                      setJsonError(err.message || "Invalid JSON syntax");
                    }
                  };

                  return (
                    <div className="space-y-4">
                      {webhookParsedFields && webhookParsedFields.length > 0 && (
                        <div className="space-y-3">
                          <span className="text-xs font-bold text-gray-700 uppercase tracking-wide block">Payload Parameters</span>
                          {webhookParsedFields.map((field: any) => (
                            <div key={field.key} className="flex flex-col gap-1.5 p-2 bg-gray-50/50 rounded-lg border">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-700 font-mono">{field.key}</span>
                                <VariablePickerButton
                                  targetRef={getRefForField(`webhook-${field.key}`)}
                                  value={field.value}
                                  onChange={newValue => {
                                    const updated = webhookParsedFields.map((f: any) => f.key === field.key ? { ...f, value: newValue } : f);
                                    onChange({ webhookParsedFields: updated });
                                  }}
                                />
                              </div>
                              <input
                                ref={el => { inputRefs.current[`webhook-${field.key}`] = el; }}
                                type="text"
                                value={field.value}
                                onChange={e => {
                                  const updated = webhookParsedFields.map((f: any) => f.key === field.key ? { ...f, value: e.target.value } : f);
                                  onChange({ webhookParsedFields: updated });
                                }}
                                placeholder="Enter value..."
                                className="w-full px-3 py-1.5 border rounded-md text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="p-3 bg-gray-50 rounded-lg border space-y-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Parse Sample JSON Payload</span>
                          <InfoTooltip text="Paste an example JSON response from this webhook and Claude will turn each key into an editable field below — saves you from typing field names by hand." />
                        </div>
                        <textarea
                          value={jsonPaste}
                          onChange={e => setJsonPaste(e.target.value)}
                          placeholder='{"name": "John Doe", "email": "john@example.com"}'
                          rows={3}
                          className="w-full px-3 py-2.5 border rounded-md bg-white font-mono text-xs"
                        />
                        {jsonError && <p className="text-xs text-red-500">{jsonError}</p>}
                        <button
                          type="button"
                          onClick={handleParseJson}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold"
                        >
                          Parse JSON & Populate Fields
                        </button>
                      </div>
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

            {(stepKey === "update_to_stage" || stepKey === "update-stage" || stepKey === "processmovement" || stepKey === "stagemovement" || stepKey === "move-process" || stepKey === "move-stage" || stepKey === "movetonewprocess" || stepKey === "move-new-process") && (() => {
              const stageEntity = (params.stageEntity || params.entityType || "processes") as "processes" | "appointment" | "invoice";

              return (
                <div className="space-y-4">
                  {/* Choose entity dropdown */}
                  {renderField("Choose Entity",
                    <select
                      value={stageEntity}
                      onChange={(e) => {
                        const entId = e.target.value as "processes" | "appointment" | "invoice";
                        let nextStageId = "";
                        let nextStageName = "";
                        let nextProcId = params.stepDetailProcess || "";
                        let nextProcName = params.processName || "";

                        if (entId === "processes") {
                          const proc = effectiveProcesses.find(p => p.id === nextProcId) || effectiveProcesses[0];
                          nextProcId = proc?.id || "";
                          nextProcName = proc?.name || "";
                          const stg = proc?.stages?.[0];
                          nextStageId = stg?.id || stg?.name || "";
                          nextStageName = stg?.name || "";
                        } else if (entId === "appointment") {
                          const apptProc = effectiveProcesses.find((p: any) => p.entityType === "appointment") || DEFAULT_ENTITY_PROCESSES.appointment;
                          const defaultApptStage = apptProc?.stages?.[0];
                          nextStageId = defaultApptStage?.id || "";
                          nextStageName = defaultApptStage?.name || "";
                        } else if (entId === "invoice") {
                          const invProc = effectiveProcesses.find((p: any) => p.entityType === "invoice") || DEFAULT_ENTITY_PROCESSES.invoice;
                          const defaultInvStage = invProc?.stages?.[0];
                          nextStageId = defaultInvStage?.id || "";
                          nextStageName = defaultInvStage?.name || "";
                        }

                        onChange({
                          stageEntity: entId,
                          entityType: entId,
                          stepDetailProcess: entId === "processes" ? nextProcId : undefined,
                          processId: entId === "processes" ? nextProcId : undefined,
                          processName: entId === "processes" ? nextProcName : undefined,
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
                          value={stepDetailProcess}
                          onChange={e => {
                            const selectedProcId = e.target.value;
                            const targetProc = effectiveProcesses.find(p => p.id === selectedProcId);
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
                          {effectiveProcesses.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      )}

                      {stepDetailProcess && (
                        <>
                          {renderField("Choose Stage",
                            <select
                              value={stepDetailStage}
                              onChange={e => {
                                const val = e.target.value;
                                const targetStage = (effectiveProcesses.find(p => p.id === stepDetailProcess)?.stages || []).find(s => s.id === val || s.name === val);
                                onChange({
                                  stepDetailStage: val,
                                  stageId: val,
                                  stageName: targetStage?.name || val,
                                });
                              }}
                              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-800"
                            >
                              <option value="">Select stage...</option>
                              {(effectiveProcesses.find(p => p.id === stepDetailProcess)?.stages || []).map(s => (
                                <option key={s.id} value={s.id || s.name}>{s.name}</option>
                              ))}
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
                                onChange={e => onChange({ stepEndCurrentProcess: e.target.checked })}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {stageEntity === "appointment" && (() => {
                    const apptProc = effectiveProcesses.find((p: any) => p.entityType === "appointment") || DEFAULT_ENTITY_PROCESSES.appointment;
                    const stagesList = apptProc?.stages || [];
                    const currentVal = stepDetailStage || params.stageId || stagesList[0]?.id || "";
                    return renderField("Choose Stage",
                      <select
                        value={currentVal}
                        onChange={e => {
                          const val = e.target.value;
                          const targetStage = stagesList.find((s: any) => s.id === val || s.name === val);
                          onChange({
                            stageEntity: "appointment",
                            entityType: "appointment",
                            stepDetailStage: val,
                            stageId: val,
                            stageName: targetStage?.name || val,
                          });
                        }}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-800"
                      >
                        {stagesList.map((s: any) => (
                          <option key={s.id} value={s.id}>{s.name} {s.description ? `(${s.description})` : ""}</option>
                        ))}
                      </select>
                    );
                  })()}

                  {stageEntity === "invoice" && (() => {
                    const invProc = effectiveProcesses.find((p: any) => p.entityType === "invoice") || DEFAULT_ENTITY_PROCESSES.invoice;
                    const stagesList = invProc?.stages || [];
                    const currentVal = stepDetailStage || params.stageId || stagesList[0]?.id || "";
                    return renderField("Choose Stage",
                      <select
                        value={currentVal}
                        onChange={e => {
                          const val = e.target.value;
                          const targetStage = stagesList.find((s: any) => s.id === val || s.name === val);
                          onChange({
                            stageEntity: "invoice",
                            entityType: "invoice",
                            stepDetailStage: val,
                            stageId: val,
                            stageName: targetStage?.name || val,
                          });
                        }}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-800"
                      >
                        {stagesList.map((s: any) => (
                          <option key={s.id} value={s.id}>{s.name} {s.description ? `(${s.description})` : ""}</option>
                        ))}
                      </select>
                    );
                  })()}
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

            {/* ───────────── GENERIC NodeType FALLBACKS ───────────── */}
            {stepKey === "condition" && (
              <div className="space-y-4">
                {renderField("Field Source",
                  <select
                    value={params.fieldSource || ""}
                    onChange={(e) => onChange({ fieldSource: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-border rounded-xl text-sm"
                  >
                    <option value="">Select source...</option>
                    <option value="system">System Fields</option>
                    <option value="call-log">Call Logs</option>
                    <option value="appointment">Appointment</option>
                    <option value="custom">Custom Fields</option>
                  </select>
                )}
                {renderField("Operator",
                  <select
                    value={params.operator || ""}
                    onChange={(e) => onChange({ operator: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-border rounded-xl text-sm"
                  >
                    <option value="">Select operator...</option>
                    <option value="equal_to">Equal To</option>
                    <option value="not_equal_to">Not Equal To</option>
                    <option value="includes">Includes</option>
                    <option value="greater_than">Greater Than</option>
                    <option value="less_than">Less Than</option>
                    <option value="is_empty">Is Empty</option>
                    <option value="is_not_empty">Is Not Empty</option>
                  </select>
                )}
                {renderField("Value",
                  <input
                    type="text"
                    value={params.value || ""}
                    onChange={(e) => onChange({ value: e.target.value })}
                    placeholder="Enter value..."
                    className="w-full px-3 py-2 bg-white border border-border rounded-xl text-sm"
                  />
                )}
              </div>
            )}

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

            {/* ───────────── TRIGGER CONFIGURATION ───────────── */}
            {stepKey === "trigger_config" && (() => {
              const currentScope = params.scope || "global";
              const isStageScope = currentScope === "stage" || params.category === "stage";
              const activeCategory = params.category || (isStageScope ? "stage" : (params.selectedEvent === "field.updated" ? "field_update" : params.selectedEvent?.startsWith("stage") ? "stage" : "client"));
              const currentEvent = params.selectedEvent || (
                activeCategory === "stage" ? (isStageScope ? "stage.entry" : "stage.entered") :
                activeCategory === "field_update" ? "field.updated" :
                activeCategory === "client" ? "client.created" :
                activeCategory === "appointment" ? "appointment.booked" :
                activeCategory === "invoice" ? "invoice.created" :
                "client.created"
              );

              const storedServices = getStoredServices();
              const monitoredFields: string[] = Array.isArray(params.monitoredFields) ? params.monitoredFields : [];

              const triggerOptionsByCategory: Record<string, Array<{ event: string; label: string; desc: string; iconKey: string }>> = {
                stage: [
                  {
                    event: isStageScope ? "stage.entry" : "stage.entered",
                    label: isStageScope ? "On Stage Entry" : "Stage Entered",
                    desc: isStageScope ? "Runs when record moves into this stage" : "Fires when a record moves into a selected stage",
                    iconKey: "gitbranch",
                  },
                  {
                    event: isStageScope ? "stage.exit" : "stage.exited",
                    label: isStageScope ? "On Stage Exit" : "Stage Exited",
                    desc: isStageScope ? "Runs when record moves out of this stage" : "Fires when a record moves out of a selected stage",
                    iconKey: "gitbranch",
                  },
                ],
                field_update: [
                  {
                    event: "field.updated",
                    label: "Field Updated",
                    desc: "Fires when monitored fields on a record are updated",
                    iconKey: "sliders",
                  },
                ],
                client: [
                  { event: "client.created", label: "Client Created", desc: "Fires when a new client record is added to the system", iconKey: "user" },
                  { event: "client.updated", label: "Client Updated", desc: "Fires when existing client details or fields are modified", iconKey: "user" },
                  { event: "client.product_assigned", label: "Assign Product", desc: "Fires when a product or service is assigned to this client in their profile", iconKey: "briefcase" },
                ],
                appointment: [
                  { event: "appointment.booked", label: "Appointment Booked", desc: "Fires when a time slot is confirmed for a client", iconKey: "calendar" },
                  { event: "appointment.rescheduled", label: "Appointment Rescheduled", desc: "Fires when an appointment date or time is modified", iconKey: "calendar" },
                  { event: "appointment.cancelled", label: "Appointment Cancelled", desc: "Fires when an appointment is cancelled or marked void", iconKey: "calendar" },
                ],
                invoice: [
                  { event: "invoice.created", label: "Invoice Created", desc: "Fires when a billing invoice is drafted or issued", iconKey: "receipt" },
                  { event: "invoice.paid", label: "Invoice Paid", desc: "Fires when payment is recorded and settled for an invoice", iconKey: "receipt" },
                ],
              };

              const currentOptions = triggerOptionsByCategory[activeCategory] || triggerOptionsByCategory.client;

              const handleCategoryChange = (newCat: string) => {
                const defaults = triggerOptionsByCategory[newCat] || triggerOptionsByCategory.client;
                const firstOption = defaults[0];
                onChange({
                  category: newCat,
                  selectedEvent: firstOption.event,
                  triggerLabel: firstOption.label,
                  triggerDescription: firstOption.desc,
                  triggerIconKey: firstOption.iconKey,
                });
              };

              const handleEventSelect = (opt: { event: string; label: string; desc: string; iconKey: string }) => {
                onChange({
                  selectedEvent: opt.event,
                  triggerLabel: opt.label,
                  triggerDescription: opt.desc,
                  triggerIconKey: opt.iconKey,
                });
              };

              const handleAddMonitoredField = (token: string) => {
                const cleanKey = token.replace(/[{}]/g, "").trim();
                if (!monitoredFields.includes(cleanKey)) {
                  onChange({ monitoredFields: [...monitoredFields, cleanKey] });
                }
              };

              const handleRemoveMonitoredField = (fieldKey: string) => {
                onChange({ monitoredFields: monitoredFields.filter((f) => f !== fieldKey) });
              };

              return (
                <div className="space-y-5">
                  {/* Respective Trigger Options (Categories already selected in sidebar) */}
                  {currentOptions.length > 1 && (
                    <div className="space-y-2">
                      <label
                        className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        Select Trigger ({activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1).replace("_", " ")})
                      </label>
                      <div className="space-y-2">
                        {currentOptions.map((opt) => {
                          const isSelected =
                            currentEvent === opt.event ||
                            (opt.event === "stage.entered" && (currentEvent === "stage.entry" || currentEvent === "entry")) ||
                            (opt.event === "stage.exited" && (currentEvent === "stage.exit" || currentEvent === "exit")) ||
                            (opt.event === "stage.entry" && (currentEvent === "stage.entered" || currentEvent === "entry")) ||
                            (opt.event === "stage.exit" && (currentEvent === "stage.exited" || currentEvent === "exit"));
                          return (
                            <div
                              key={opt.event}
                              onClick={() => handleEventSelect(opt)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                                isSelected
                                  ? "bg-blue-50/70 border-blue-500 ring-1 ring-blue-500 shadow-2xs"
                                  : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                              }`}
                            >
                              <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white"
                              }`}>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-xs font-semibold ${isSelected ? "text-blue-900" : "text-slate-900"}`}
                                  style={{ fontFamily: "DM Sans, sans-serif" }}
                                >
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
                  )}

                  {/* Specific Trigger Sub-Parameters */}
                  {activeCategory === "stage" && (
                    <div className="p-3.5 bg-blue-50/40 rounded-xl border border-blue-100 space-y-3">
                      <div className="flex items-center gap-1.5">
                        <GitBranch className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-semibold text-blue-900">Stage Filter Options</span>
                      </div>
                      {renderField("Process Filter",
                        <select
                          value={params.triggerProcessId || "all"}
                          onChange={(e) => {
                            const pId = e.target.value;
                            const proc = effectiveProcesses.find((p: any) => p.id === pId);
                            onChange({
                              triggerProcessId: pId,
                              triggerProcessName: proc?.name || "Any Process",
                              triggerStageId: "all",
                              triggerStageName: "Any Stage",
                            });
                          }}
                          className="w-full px-3 py-2 bg-white border border-border rounded-xl text-xs"
                        >
                          <option value="all">Any Process</option>
                          {effectiveProcesses.map((proc: any) => (
                            <option key={proc.id} value={proc.id}>
                              {proc.name} {proc.entityType ? `(${proc.entityType})` : ""}
                            </option>
                          ))}
                        </select>
                      )}
                      {(() => {
                        const selectedProc = effectiveProcesses.find((p: any) => p.id === params.triggerProcessId);
                        const stages = selectedProc?.stages || [];
                        return renderField("Stage Filter",
                          <select
                            value={params.triggerStageId || "all"}
                            disabled={!params.triggerProcessId || params.triggerProcessId === "all"}
                            onChange={(e) => {
                              const sId = e.target.value;
                              const stg = stages.find((s: any) => s.id === sId);
                              onChange({
                                triggerStageId: sId,
                                triggerStageName: stg?.name || "Any Stage",
                              });
                            }}
                            className="w-full px-3 py-2 bg-white border border-border rounded-xl text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            <option value="all">
                              {params.triggerProcessId && params.triggerProcessId !== "all"
                                ? "Any Stage in this Process"
                                : "Select a process to specify a stage"}
                            </option>
                            {stages.map((stg: any) => (
                              <option key={stg.id} value={stg.id}>
                                {stg.name}
                              </option>
                            ))}
                          </select>
                        );
                      })()}
                      <p className="text-[11px] text-blue-700">
                        {currentEvent === "stage.exited" || currentEvent === "stage.exit"
                          ? "This automation fires whenever a record transitions out of the selected stage."
                          : "This automation fires whenever a record transitions into the selected stage."}
                      </p>
                    </div>
                  )}

                  {/* Field Update Sub-Parameters */}
                  {activeCategory === "field_update" && (
                    <div className="p-4 bg-[#fafafa] rounded-2xl border border-slate-200 space-y-4">
                      {/* Monitored Fields Header */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-900"
                            style={{ fontFamily: "DM Sans, sans-serif" }}
                          >
                            <Sliders className="w-4 h-4 text-blue-600" />
                            <span>Monitored Fields</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Select client & record fields that will trigger this automation
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsFieldRegistryModalOpen(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                          style={{ fontFamily: "DM Sans, sans-serif" }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Select Fields</span>
                        </button>
                      </div>

                      {/* Monitored Fields Tags */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-slate-700">Fields to Watch</label>
                        {monitoredFields.length === 0 ? (
                          <div className="p-3 bg-white border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                            No specific fields selected. <strong>Triggers on ANY field update.</strong>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 p-2 bg-white border border-slate-200 rounded-xl">
                            {monitoredFields.map((fld) => (
                              <span
                                key={fld}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 text-xs font-medium border border-blue-200"
                              >
                                <code className="font-mono text-[11px]">{fld}</code>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMonitoredField(fld)}
                                  className="text-blue-500 hover:text-blue-800 cursor-pointer ml-0.5"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Trigger Parameter (Evaluation Logic) Dropdown */}
                      <div className="space-y-1.5">
                        <label
                          className="block text-xs font-semibold text-slate-800"
                          style={{ fontFamily: "DM Sans, sans-serif" }}
                        >
                          Trigger Parameter (Evaluation Logic)
                        </label>
                        <select
                          value={params.matchLogic || "any"}
                          onChange={(e) => onChange({ matchLogic: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
                          style={{ fontFamily: "DM Sans, sans-serif" }}
                        >
                          <option value="any">
                            Any Field Updated — Triggers when ANY of the watched fields is changed
                          </option>
                          <option value="all">
                            All Fields Updated — Triggers only when ALL watched fields are changed
                          </option>
                        </select>
                        <p className="text-[11px] text-slate-500" style={{ fontFamily: "DM Sans, sans-serif" }}>
                          {(params.matchLogic || "any") === "any"
                            ? "Triggers when ANY of the watched fields is changed"
                            : "Triggers only when ALL watched fields are changed"}
                        </p>
                      </div>

                      {/* Select Fields Multi Modal (same multi-select modal as document template builder) */}
                      {isFieldRegistryModalOpen && (
                        <SelectFieldsMultiModal
                          isOpen={isFieldRegistryModalOpen}
                          onClose={() => setIsFieldRegistryModalOpen(false)}
                          initialSelectedKeys={monitoredFields}
                          onApply={(keys) => onChange({ monitoredFields: keys })}
                          title="Select Fields to Watch"
                          subtitle="Choose fields that will trigger this automation when updated"
                          scopingRules={scopingRules}
                        />
                      )}
                    </div>
                  )}

                  {/* Specific Trigger Sub-Parameters */}
                  {currentEvent === "client.product_assigned" && (
                    <div className="p-3.5 bg-blue-50/40 rounded-xl border border-blue-100 space-y-3">
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-semibold text-blue-900">Assign Product Filter</span>
                      </div>
                      {renderField("Target Product / Service",
                        <select
                          value={params.selectedProductId || "all"}
                          onChange={(e) => onChange({ selectedProductId: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-border rounded-xl text-xs"
                        >
                          <option value="all">Any Product or Service assigned</option>
                          {storedServices.map((svc) => (
                            <option key={svc.id} value={String(svc.id)}>
                              {svc.name} (${svc.price})
                            </option>
                          ))}
                        </select>
                      )}
                      <p className="text-[11px] text-blue-700">
                        When this product is assigned in the Client Profile, this trigger activates and can feed invoice generation.
                      </p>
                    </div>
                  )}

                  {activeCategory === "appointment" && (
                    <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-gray-700" />
                        <span className="text-xs font-semibold text-gray-900">Appointment Filter</span>
                      </div>
                      {renderField("Filter by Service",
                        <select
                          value={params.appointmentServiceFilter || "all"}
                          onChange={(e) => onChange({ appointmentServiceFilter: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-border rounded-xl text-xs"
                        >
                          <option value="all">Any Appointment Service</option>
                          {storedServices.map((svc) => (
                            <option key={svc.id} value={String(svc.id)}>
                              {svc.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {activeCategory === "invoice" && (
                    <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                      <div className="flex items-center gap-1.5">
                        <Receipt className="w-4 h-4 text-gray-700" />
                        <span className="text-xs font-semibold text-gray-900">Invoice Filter</span>
                      </div>
                      {renderField("Payment Mode Filter",
                        <select
                          value={params.invoicePaymentMode || "all"}
                          onChange={(e) => onChange({ invoicePaymentMode: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-border rounded-xl text-xs"
                        >
                          <option value="all">Any Payment Mode</option>
                          <option value="Online / Link">Online / Payment Link</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="Card on File">Card on File</option>
                          <option value="Cash / POS">Cash / POS Terminal</option>
                        </select>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

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
    </div>
  );
}
