import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import {
  ChevronDown, Plus, Trash2, Info, Sliders, Star, Volume2, Play, ArrowRight,
  User, PhoneForwarded, PhoneOff, Mail, MessageSquare, Paperclip, ExternalLink,
  ChevronRight, X, Copy, Pencil
} from "lucide-react";
import VariablePickerButton, { FETCH_FIELD_SOURCES } from "./VariablePickerButton";
import { InfoTooltip } from "../help/InfoTooltip";
import { getStoredBots } from "../../../lib/useChatbotBots";
import { getStoredTemplates } from "../../../lib/useWhatsappTemplates";

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
}

interface StepParametersFieldsProps {
  stepKey: string;
  params: Record<string, any>;
  onChange: (patch: Record<string, any>) => void;
  processes?: ProcessOption[];
  stepTrigger?: string;
}

export default function StepParametersFields({
  stepKey,
  params,
  onChange,
  processes = [],
  stepTrigger
}: StepParametersFieldsProps) {
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
  const [whatsappChatbots, setWhatsappChatbots] = useState<any[]>([]);
  const [customApiIntegrations, setCustomApiIntegrations] = useState<any[]>([]);
  const [customWebhookIntegrations, setCustomWebhookIntegrations] = useState<any[]>([]);
  const [jsonPaste, setJsonPaste] = useState("");
  const [jsonError, setJsonError] = useState("");

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
        setWhatsappChatbots(getStoredBots());
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
  const whatsappSource = params.whatsappSource ?? "template";
  const whatsappCampaignId = params.whatsappCampaignId ?? "";
  const whatsappChatbotId = params.whatsappChatbotId ?? "";
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
      {stepTrigger && (
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

              {stepTrigger === "incall" ? (
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
                            <option value="custom_field_1">Custom Field 1</option>
                            <option value="custom_field_2">Custom Field 2</option>
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
                      { v: "campaign", l: "Campaign" },
                      { v: "chatbot", l: "Chatbot" }
                    ].map(opt => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => {
                          if (opt.v === "template") {
                            onChange({ whatsappSource: "template", whatsappCampaignId: "", whatsappChatbotId: "" });
                          } else if (opt.v === "campaign") {
                            onChange({ whatsappSource: "campaign", whatsappTemplate: "", whatsappTemplateIdentifier: "", whatsappChatbotId: "" });
                          } else if (opt.v === "chatbot") {
                            onChange({ whatsappSource: "chatbot", whatsappTemplate: "", whatsappTemplateIdentifier: "", whatsappCampaignId: "" });
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
                    {renderField(
                      "Connected Account",
                      <select className="w-full px-3 py-2.5 text-sm rounded-md border border-border bg-white outline-none focus:border-blue-500 transition-colors">
                        <option value="">Select WhatsApp account...</option>
                        <option>+1 (555) 123-4567</option>
                      </select>
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

                {whatsappSource === "chatbot" && (
                  whatsappChatbots.length === 0 ? (
                    <div className="space-y-1.5">
                      <label className="block text-sm font-semibold text-[#020817]">Chatbot</label>
                      <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-lg border border-dashed flex flex-col gap-1.5 bg-white">
                        <span>No chatbots yet — create one in Chats → Chatbot</span>
                        <Link to="/chats?tab=chatbot" className="text-xs text-blue-600 hover:underline font-semibold w-fit">
                          Manage Chatbots →
                        </Link>
                      </div>
                    </div>
                  ) : (
                    renderField(
                      "Chatbot",
                      <select
                        value={whatsappChatbotId}
                        onChange={e => onChange({ whatsappChatbotId: e.target.value })}
                        className="w-full px-3 py-2.5 text-sm rounded-md border border-border bg-white outline-none focus:border-blue-500 transition-colors"
                      >
                        <option value="">Select Chatbot...</option>
                        {whatsappChatbots.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    )
                  )
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
                  "Connected Account",
                  <select
                    value={smsConnectedAccount}
                    onChange={e => onChange({ smsConnectedAccount: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm rounded-md border border-border bg-white"
                  >
                    <option value="">Select SMS account...</option>
                    <option value="+15551234567">+1 (555) 123-4567</option>
                  </select>
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

            {(stepKey === "processmovement" || stepKey === "stagemovement" || stepKey === "move-process" || stepKey === "move-stage") && (
              <div className="space-y-4">
                {renderField("Target Process",
                  <select value={stepDetailProcess} onChange={e => onChange({ stepDetailProcess: e.target.value, stepDetailStage: "" })} className="w-full px-3 py-2.5 border rounded-md bg-white">
                    <option value="">Select process...</option>
                    {processes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
                {renderField("Target Stage",
                  <select value={stepDetailStage} onChange={e => onChange({ stepDetailStage: e.target.value })} className="w-full px-3 py-2.5 border rounded-md bg-white">
                    <option value="">Select stage...</option>
                    {(processes.find(p => p.id === stepDetailProcess)?.stages || []).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

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
                    value={appointmentBookingMethod}
                    onChange={e => onChange({ appointmentBookingMethod: e.target.value })}
                    className="w-full px-3 py-2.5 border rounded-md bg-white"
                  >
                    <option value="">Select a booking method...</option>
                    <option value="text-link">Text Booking Link</option>
                    <option value="collect-request">Collect Booking Request</option>
                    <option value="schedule-phone">Schedule Over Phone</option>
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
          </div>
        )}
      </div>
    </div>
  );
}
