/**
 * WhatsAppAgentDrawer.tsx
 * Path: src/app/components/chats/WhatsAppAgentDrawer.tsx
 *
 * Drawer for creating and editing WhatsApp Agent automation rules:
 * - Starting point: Connected WhatsApp Template
 * - Rule Direction: Inbound, Outbound, or Both
 * - Trigger Event & Button Selection
 * - Classification Criteria: AI Semantic Prompt vs Keyword Filters
 * - AI Response instructions & Dynamic Variable Injection
 * - CRM Entity Creation: Contact, Lead, Patient, Deal & Workflow Assignment
 * - Conversation Resolution Criteria: Immediate, Customer Confirmation, Inactivity timeout, Custom Prompt, or Manual
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import DrawerShell from "../ui/DrawerShell";
import {
  Sparkles,
  MessageSquare,
  FileText,
  Tag,
  Pencil,
  Check,
  RotateCcw,
  Trash2,
  Info,
  ChevronDown,
  Filter,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  UserPlus,
  GitBranch,
  Bot,
  Zap,
  HelpCircle,
  AlertCircle,
} from "lucide-react";
import { Tooltip } from "../ui/Tooltip";
import { toast } from "sonner";
import {
  WhatsAppAgentRule,
  RuleDirection,
  ResolutionCriteriaType,
} from "../../../lib/whatsappAgentStore";
import { getStoredTemplates, WhatsappTemplate } from "../../../lib/useWhatsappTemplates";
import { getStoredProcesses } from "../../../lib/useProcessStore";

export interface WhatsAppAgentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  rule: WhatsAppAgentRule | null;
  onSave: (rule: WhatsAppAgentRule) => void;
  onDelete?: (ruleId: string) => void;
}

const COLOR_OPTIONS: WhatsAppAgentRule["color"][] = [
  "emerald",
  "blue",
  "purple",
  "amber",
  "cyan",
  "rose",
  "orange",
  "slate",
];

const COLOR_CLASS_MAP: Record<WhatsAppAgentRule["color"], { dot: string; bg: string; border: string }> = {
  emerald: { dot: "bg-emerald-500", bg: "bg-emerald-50 text-emerald-700", border: "border-emerald-200" },
  blue: { dot: "bg-blue-500", bg: "bg-blue-50 text-blue-700", border: "border-blue-200" },
  purple: { dot: "bg-purple-500", bg: "bg-purple-50 text-purple-700", border: "border-purple-200" },
  amber: { dot: "bg-amber-500", bg: "bg-amber-50 text-amber-700", border: "border-amber-200" },
  cyan: { dot: "bg-cyan-500", bg: "bg-cyan-50 text-cyan-700", border: "border-cyan-200" },
  rose: { dot: "bg-rose-500", bg: "bg-rose-50 text-rose-700", border: "border-rose-200" },
  orange: { dot: "bg-orange-500", bg: "bg-orange-50 text-orange-700", border: "border-orange-200" },
  slate: { dot: "bg-slate-500", bg: "bg-slate-50 text-slate-700", border: "border-slate-200" },
};

export default function WhatsAppAgentDrawer({
  isOpen,
  onClose,
  rule,
  onSave,
  onDelete,
}: WhatsAppAgentDrawerProps) {
  const isEditing = Boolean(rule);

  // Available templates
  const availableTemplates = useMemo(() => getStoredTemplates(), [isOpen]);

  // Available workflows
  const allProcesses = useMemo(() => getStoredProcesses(), [isOpen]);
  const entityWorkflows = useMemo(() => {
    const filtered = allProcesses.filter((p) => !p.entityType || p.entityType === "client");
    return filtered.length > 0 ? filtered : allProcesses;
  }, [allProcesses]);

  // Form State: 1. General & Direction
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<WhatsAppAgentRule["color"]>("emerald");
  const [enabled, setEnabled] = useState(true);
  const [direction, setDirection] = useState<RuleDirection>("both");

  // Form State: 2. Connected Template (Starting Point)
  const [templateId, setTemplateId] = useState<string>("tpl-1");
  const [triggerEvent, setTriggerEvent] = useState<WhatsAppAgentRule["triggerEvent"]>("customer_reply");
  const [targetButtonLabel, setTargetButtonLabel] = useState<string>("");

  // Selected template object
  const selectedTemplate = useMemo<WhatsappTemplate | null>(() => {
    if (!templateId || templateId === "all") return null;
    return availableTemplates.find((t) => t.id === templateId) || null;
  }, [availableTemplates, templateId]);

  // Form State: 3. Classification Criteria
  const [criteriaType, setCriteriaType] = useState<"prompt" | "keywords">("prompt");
  const [classificationPrompt, setClassificationPrompt] = useState("");
  const [keywordsContains, setKeywordsContains] = useState("");
  const [keywordsDoesNotContain, setKeywordsDoesNotContain] = useState("");
  const [intentCategory, setIntentCategory] = useState<
    "inquiry" | "confirmation" | "reschedule" | "cancellation" | "complaint" | "general"
  >("confirmation");

  // Form State: 4. AI Response & Instructions
  const [responseType, setResponseType] = useState<"ai_prompt" | "fixed_text" | "ai_draft_only">("ai_prompt");
  const [responsePrompt, setResponsePrompt] = useState("");
  const [fixedResponseText, setFixedResponseText] = useState("");
  const [aiTone, setAiTone] = useState<"friendly" | "professional" | "empathetic" | "urgent" | "concise">("empathetic");
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Form State: 5. CRM Actions
  const [autoCreateContact, setAutoCreateContact] = useState(true);
  const [entityType, setEntityType] = useState<"Contact" | "Lead" | "Patient" | "Deal">("Patient");
  const [crmQualificationPrompt, setCrmQualificationPrompt] = useState("");
  const [assignProcessEnabled, setAssignProcessEnabled] = useState(false);
  const [processId, setProcessId] = useState<string>("none");
  const [stageId, setStageId] = useState<string>("none");

  const currentProcess = useMemo(() => {
    if (!processId || processId === "none") return null;
    return entityWorkflows.find((p) => p.id === processId) || null;
  }, [entityWorkflows, processId]);

  const availableStages = useMemo(() => {
    return currentProcess ? currentProcess.stages : [];
  }, [currentProcess]);

  // Form State: 6. Resolution Criteria
  const [resolutionCriteria, setResolutionCriteria] = useState<ResolutionCriteriaType>("customer_confirmation");
  const [resolutionTimeoutHours, setResolutionTimeoutHours] = useState<number>(24);
  const [resolutionPromptCondition, setResolutionPromptCondition] = useState("");
  const [resolutionTag, setResolutionTag] = useState("Resolved by WhatsApp Agent");
  const [reopenOnCustomerReply, setReopenOnCustomerReply] = useState(true);

  // Accordion open/close state
  const [generalOpen, setGeneralOpen] = useState(true);
  const [templateOpen, setTemplateOpen] = useState(true);
  const [classificationOpen, setClassificationOpen] = useState(true);
  const [responseOpen, setResponseOpen] = useState(true);
  const [crmOpen, setCrmOpen] = useState(false);
  const [resolutionOpen, setResolutionOpen] = useState(true);

  // Initialize or reset form
  useEffect(() => {
    if (rule) {
      setName(rule.name || "");
      setDescription(rule.description || "");
      setColor(rule.color || "emerald");
      setEnabled(rule.enabled !== undefined ? rule.enabled : true);
      setDirection(rule.direction || "both");
      setTemplateId(rule.templateId || (availableTemplates[0]?.id || "all"));
      setTriggerEvent(rule.triggerEvent || "customer_reply");
      setTargetButtonLabel(rule.targetButtonLabel || "");
      setCriteriaType(rule.criteriaType || "prompt");
      setClassificationPrompt(rule.classificationPrompt || "");
      setKeywordsContains(rule.keywordsFilter?.contains || "");
      setKeywordsDoesNotContain(rule.keywordsFilter?.doesNotContain || "");
      setIntentCategory(rule.keywordsFilter?.intentCategory || "confirmation");
      setResponseType(rule.responseType || "ai_prompt");
      setResponsePrompt(rule.responsePrompt || "");
      setFixedResponseText(rule.fixedResponseText || "");
      setAiTone(rule.aiTone || "empathetic");
      setAutoCreateContact(rule.autoCreateContact !== undefined ? rule.autoCreateContact : true);
      setEntityType(rule.entityType || "Patient");
      setCrmQualificationPrompt(rule.crmQualificationPrompt || "");
      setAssignProcessEnabled(Boolean(rule.assignProcessEnabled));
      setProcessId(rule.processId || "none");
      setStageId(rule.stageId || "none");
      setResolutionCriteria(rule.resolutionCriteria || "customer_confirmation");
      setResolutionTimeoutHours(rule.resolutionTimeoutHours || 24);
      setResolutionPromptCondition(rule.resolutionPromptCondition || "");
      setResolutionTag(rule.resolutionTag || "Resolved by WhatsApp Agent");
      setReopenOnCustomerReply(rule.reopenOnCustomerReply !== undefined ? rule.reopenOnCustomerReply : true);
    } else {
      // Default initial state for new rule
      setName("");
      setDescription("");
      setColor("emerald");
      setEnabled(true);
      setDirection("both");
      const defaultTpl = availableTemplates[0]?.id || "tpl-1";
      setTemplateId(defaultTpl);
      setTriggerEvent("customer_reply");
      setTargetButtonLabel("");
      setCriteriaType("prompt");
      setClassificationPrompt("Patient confirms appointment attendance or asks a clarifying question.");
      setKeywordsContains("");
      setKeywordsDoesNotContain("");
      setIntentCategory("confirmation");
      setResponseType("ai_prompt");
      setResponsePrompt("Warmly thank {{contact_name}} for their reply. Confirm their appointment details and remind them of clinic arrival guidelines.");
      setFixedResponseText("");
      setAiTone("empathetic");
      setAutoCreateContact(true);
      setEntityType("Patient");
      setCrmQualificationPrompt("Extract patient confirmation status and verify insurance details.");
      setAssignProcessEnabled(false);
      setProcessId("none");
      setStageId("none");
      setResolutionCriteria("customer_confirmation");
      setResolutionTimeoutHours(24);
      setResolutionPromptCondition("");
      setResolutionTag("Attendance Confirmed");
      setReopenOnCustomerReply(true);
    }
  }, [rule, isOpen, availableTemplates]);

  // Insert variable into prompt textarea
  const handleInsertVariable = (varName: string) => {
    const textarea = promptTextareaRef.current;
    if (!textarea) {
      setResponsePrompt((prev) => `${prev} {{${varName}}}`);
      return;
    }
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const token = `{{${varName}}}`;
    const nextVal = responsePrompt.substring(0, start) + token + responsePrompt.substring(end);
    setResponsePrompt(nextVal);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    }, 10);
  };

  // Save handler
  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a rule name");
      return;
    }

    const tplName =
      templateId === "all"
        ? "All Templates"
        : selectedTemplate?.name || availableTemplates.find((t) => t.id === templateId)?.name || "Connected Template";

    const savedRule: WhatsAppAgentRule = {
      id: rule?.id || `wa-rule-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      color,
      enabled,
      direction,
      templateId,
      templateName: tplName,
      triggerEvent,
      targetButtonLabel: triggerEvent === "button_click" ? targetButtonLabel : undefined,
      criteriaType,
      classificationPrompt: criteriaType === "prompt" ? classificationPrompt.trim() : undefined,
      keywordsFilter:
        criteriaType === "keywords"
          ? {
              contains: keywordsContains.trim(),
              doesNotContain: keywordsDoesNotContain.trim(),
              intentCategory,
            }
          : undefined,
      responseType,
      responsePrompt: responseType === "ai_prompt" ? responsePrompt.trim() : "",
      fixedResponseText: responseType === "fixed_text" ? fixedResponseText.trim() : undefined,
      aiTone: responseType === "ai_prompt" ? aiTone : undefined,
      autoCreateContact,
      entityType,
      crmQualificationPrompt: autoCreateContact ? crmQualificationPrompt.trim() : undefined,
      assignProcessEnabled,
      processId: assignProcessEnabled && processId !== "none" ? processId : undefined,
      processName:
        assignProcessEnabled && currentProcess ? currentProcess.title || currentProcess.name : undefined,
      stageId: assignProcessEnabled && stageId !== "none" ? stageId : undefined,
      stageName:
        assignProcessEnabled && stageId !== "none"
          ? availableStages.find((s) => s.id === stageId)?.label || stageId
          : undefined,
      resolutionCriteria,
      resolutionTimeoutHours: resolutionCriteria === "inactivity_timeout" ? resolutionTimeoutHours : undefined,
      resolutionPromptCondition:
        resolutionCriteria === "prompt_condition" ? resolutionPromptCondition.trim() : undefined,
      resolutionTag: resolutionTag.trim() || "Resolved by WhatsApp Agent",
      reopenOnCustomerReply,
      createdAt: rule?.createdAt || new Date().toISOString().substring(0, 10),
      updatedAt: new Date().toISOString().substring(0, 10),
    };

    onSave(savedRule);
    toast.success(`WhatsApp agent rule "${savedRule.name}" saved ✓`);
    onClose();
  };

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit WhatsApp Agent Rule" : "New WhatsApp Agent Rule"}
      width="max-w-2xl"
      footer={
        <div className="flex items-center justify-between w-full" style={{ fontFamily: "Outfit, sans-serif" }}>
          <div>
            {isEditing && onDelete && rule && (
              <button
                type="button"
                onClick={() => {
                  onDelete(rule.id);
                  toast.success(`Rule "${rule.name}" deleted`);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Rule</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-[#1456f0] text-white hover:bg-blue-700 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isEditing ? "Save Changes" : "Create Agent Rule"}</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-5" style={{ fontFamily: "Outfit, sans-serif" }}>
        {/* Subtitle / Explanatory header */}
        <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/50 border border-blue-200/70 rounded-2xl p-4 flex items-start gap-3.5 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-gray-900 flex items-center gap-2">
              <span>WhatsApp Autonomous AI Agent Rule</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Template Triggered
              </span>
            </h4>
            <p className="text-[12px] text-gray-600 leading-relaxed">
              When a WhatsApp template is fired, this agent rule automates the response flow, classifies inbound customer intent, creates CRM contacts/leads, and manages conversation resolution criteria.
            </p>
          </div>
        </div>

        {/* ── ACCORDION 1: General & Direction ── */}
        <div className="border border-gray-200 rounded-2xl bg-white shadow-2xs overflow-hidden">
          <button
            type="button"
            onClick={() => setGeneralOpen((prev) => !prev)}
            className="w-full px-5 py-3.5 flex items-center justify-between bg-gray-50/70 hover:bg-gray-50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900">1. Rule Name & Direction Applicability</h3>
                <p className="text-[11px] text-gray-500">Define rule title, tag color, and whether it applies to inbound or outbound.</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${generalOpen ? "rotate-180" : ""}`} />
          </button>

          {generalOpen && (
            <div className="p-5 space-y-4 border-t border-gray-100">
              {/* Name & Enabled Switch */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Rule Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Appointment Attendance Confirmation"
                    className="w-full h-9 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:border-blue-500 shadow-2xs"
                  />
                </div>
                <div className="pt-5">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 relative"></div>
                    <span className="text-xs font-bold text-gray-700">{enabled ? "Active" : "Paused"}</span>
                  </label>
                </div>
              </div>

              {/* Color Tag Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Rule Badge Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_OPTIONS.map((c) => {
                    const isSelected = color === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`h-7 px-3 rounded-lg text-[11px] font-bold capitalize flex items-center gap-1.5 border transition-all cursor-pointer ${
                          COLOR_CLASS_MAP[c].bg
                        } ${isSelected ? `${COLOR_CLASS_MAP[c].border} ring-2 ring-blue-500/30 font-extrabold shadow-xs` : "border-transparent opacity-80 hover:opacity-100"}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${COLOR_CLASS_MAP[c].dot}`} />
                        <span>{c}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Description / Internal Goal</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Acknowledges appointment confirmation and guides clinic arrival instructions."
                  className="w-full h-9 px-3 bg-white border border-gray-200 rounded-xl text-xs text-gray-700 outline-none focus:border-blue-500 shadow-2xs"
                />
              </div>

              {/* Direction Applicability: Inbound vs Outbound vs Both */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5 flex items-center gap-1.5">
                  <span>Rule Direction Applicability</span>
                  <Tooltip content="Choose whether this automation triggers on incoming messages from contacts, outgoing template broadcasts, or both.">
                    <Info className="w-3.5 h-3.5 text-gray-400" />
                  </Tooltip>
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {/* Inbound */}
                  <div
                    onClick={() => setDirection("inbound")}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1 ${
                      direction === "inbound"
                        ? "bg-blue-50/70 border-blue-300 ring-1 ring-blue-400/40"
                        : "bg-white border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-blue-700 font-bold text-xs">
                        <ArrowDownLeft className="w-4 h-4" />
                        <span>Inbound</span>
                      </div>
                      {direction === "inbound" && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                    <p className="text-[10.5px] text-gray-500 leading-tight">
                      Customer sends a message or replies to a template.
                    </p>
                  </div>

                  {/* Outbound */}
                  <div
                    onClick={() => setDirection("outbound")}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1 ${
                      direction === "outbound"
                        ? "bg-purple-50/70 border-purple-300 ring-1 ring-purple-400/40"
                        : "bg-white border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-purple-700 font-bold text-xs">
                        <ArrowUpRight className="w-4 h-4" />
                        <span>Outbound</span>
                      </div>
                      {direction === "outbound" && <Check className="w-3.5 h-3.5 text-purple-600" />}
                    </div>
                    <p className="text-[10.5px] text-gray-500 leading-tight">
                      Template is fired or dispatched to the client.
                    </p>
                  </div>

                  {/* Both */}
                  <div
                    onClick={() => setDirection("both")}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1 ${
                      direction === "both"
                        ? "bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400/40"
                        : "bg-white border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                        <ArrowLeftRight className="w-4 h-4" />
                        <span>Both</span>
                      </div>
                      {direction === "both" && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <p className="text-[10.5px] text-gray-500 leading-tight">
                      Active for outbound dispatch & inbound customer replies.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── ACCORDION 2: Starting Point - Connected Template ── */}
        <div className="border border-gray-200 rounded-2xl bg-white shadow-2xs overflow-hidden">
          <button
            type="button"
            onClick={() => setTemplateOpen((prev) => !prev)}
            className="w-full px-5 py-3.5 flex items-center justify-between bg-gray-50/70 hover:bg-gray-50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <span>2. Trigger: Connected WhatsApp Template</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    Starting Point
                  </span>
                </h3>
                <p className="text-[11px] text-gray-500">Select the WhatsApp template that fires this automation workflow.</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${templateOpen ? "rotate-180" : ""}`} />
          </button>

          {templateOpen && (
            <div className="p-5 space-y-4 border-t border-gray-100">
              {/* Template Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Connected Template <span className="text-rose-500">*</span>
                </label>
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                >
                  <option value="all">⚡ All Templates (Any WhatsApp Template)</option>
                  {availableTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.identifier} • {t.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Template Preview Card */}
              {selectedTemplate && (
                <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900">{selectedTemplate.name}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {selectedTemplate.category}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Approved
                    </span>
                  </div>

                  {selectedTemplate.headerText && (
                    <p className="text-xs font-bold text-gray-800">{selectedTemplate.headerText}</p>
                  )}

                  <p className="text-xs text-gray-600 leading-relaxed font-sans bg-white border border-gray-200/70 p-2.5 rounded-lg">
                    {selectedTemplate.bodyText}
                  </p>

                  {/* Buttons preview */}
                  {selectedTemplate.buttons && selectedTemplate.buttons.length > 0 && (
                    <div className="pt-1">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                        Template Buttons:
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {selectedTemplate.buttons.map((btn, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white border border-gray-200 text-blue-600 shadow-2xs"
                          >
                            <Zap className="w-3 h-3 text-blue-500" />
                            {btn.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Trigger Condition / Button Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Trigger Execution Condition
                </label>
                <select
                  value={triggerEvent}
                  onChange={(e) => setTriggerEvent(e.target.value as any)}
                  className="w-full h-9 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                >
                  <option value="customer_reply">When template is dispatched and customer sends any reply message</option>
                  <option value="button_click">When customer clicks a specific quick reply button</option>
                  <option value="template_fired">Immediate automated response upon outbound delivery</option>
                  <option value="any">Any event (Template fired OR customer reply)</option>
                </select>
              </div>

              {/* Target Button selector if button_click is chosen */}
              {triggerEvent === "button_click" && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Specific Button to Trigger
                  </label>
                  {selectedTemplate && selectedTemplate.buttons && selectedTemplate.buttons.length > 0 ? (
                    <select
                      value={targetButtonLabel}
                      onChange={(e) => setTargetButtonLabel(e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                    >
                      <option value="">Any Button Click</option>
                      {selectedTemplate.buttons.map((b, i) => (
                        <option key={i} value={b.label}>
                          {b.label} ({b.type})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={targetButtonLabel}
                      onChange={(e) => setTargetButtonLabel(e.target.value)}
                      placeholder="e.g., Confirm Attendance, Reschedule Visit"
                      className="w-full h-9 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:border-blue-500 shadow-2xs"
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── ACCORDION 3: Classification Criteria ── */}
        <div className="border border-gray-200 rounded-2xl bg-white shadow-2xs overflow-hidden">
          <button
            type="button"
            onClick={() => setClassificationOpen((prev) => !prev)}
            className="w-full px-5 py-3.5 flex items-center justify-between bg-gray-50/70 hover:bg-gray-50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <Filter className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900">3. Classification Criteria & Filters</h3>
                <p className="text-[11px] text-gray-500">Specify criteria using AI semantic prompt analysis or keyword filters.</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${classificationOpen ? "rotate-180" : ""}`} />
          </button>

          {classificationOpen && (
            <div className="p-5 space-y-4 border-t border-gray-100">
              {/* Method Switch: AI Prompt vs Keywords */}
              <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl max-w-xs">
                <button
                  type="button"
                  onClick={() => setCriteriaType("prompt")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    criteriaType === "prompt"
                      ? "bg-white text-gray-900 shadow-xs"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 inline-block mr-1 text-blue-600" />
                  AI Prompt
                </button>
                <button
                  type="button"
                  onClick={() => setCriteriaType("keywords")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    criteriaType === "keywords"
                      ? "bg-white text-gray-900 shadow-xs"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  <Filter className="w-3.5 h-3.5 inline-block mr-1 text-amber-600" />
                  Filter Rules
                </button>
              </div>

              {criteriaType === "prompt" ? (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-700">
                    AI Semantic Classification Prompt
                  </label>
                  <textarea
                    rows={3}
                    value={classificationPrompt}
                    onChange={(e) => setClassificationPrompt(e.target.value)}
                    placeholder="e.g., Patient is replying to confirm attendance for clinic appointment, or asking to reschedule to a new slot."
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 outline-none focus:border-blue-500 shadow-2xs leading-relaxed"
                  />
                  {/* Preset prompt helper pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-gray-400 font-medium">Quick Presets:</span>
                    <button
                      type="button"
                      onClick={() => setClassificationPrompt("Patient explicitly confirms attendance or acknowledges appointment arrival time.")}
                      className="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 text-[11px] cursor-pointer"
                    >
                      + Confirm Appointment
                    </button>
                    <button
                      type="button"
                      onClick={() => setClassificationPrompt("Patient asks to reschedule, change date or request a different provider slot.")}
                      className="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 text-[11px] cursor-pointer"
                    >
                      + Reschedule Request
                    </button>
                    <button
                      type="button"
                      onClick={() => setClassificationPrompt("Patient asks pricing, insurance in-network eligibility, or intake documentation questions.")}
                      className="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 text-[11px] cursor-pointer"
                    >
                      + Insurance & Pricing
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Contains Keywords / Phrases
                      </label>
                      <input
                        type="text"
                        value={keywordsContains}
                        onChange={(e) => setKeywordsContains(e.target.value)}
                        placeholder="e.g., yes, confirm, attend, reschedule, time"
                        className="w-full h-9 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:border-blue-500 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Does NOT Contain (Exclusions)
                      </label>
                      <input
                        type="text"
                        value={keywordsDoesNotContain}
                        onChange={(e) => setKeywordsDoesNotContain(e.target.value)}
                        placeholder="e.g., stop, cancel, unsubscribe, wrong number"
                        className="w-full h-9 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:border-blue-500 shadow-2xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Intent Classification Category
                    </label>
                    <select
                      value={intentCategory}
                      onChange={(e) => setIntentCategory(e.target.value as any)}
                      className="w-full h-9 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:border-blue-500 shadow-2xs cursor-pointer capitalize"
                    >
                      <option value="confirmation">Confirmation (Positive response)</option>
                      <option value="reschedule">Reschedule (Date / slot adjustment)</option>
                      <option value="inquiry">Inquiry (Questions, directions, pricing)</option>
                      <option value="cancellation">Cancellation (Patient cancels)</option>
                      <option value="complaint">Complaint / Urgent Escalation</option>
                      <option value="general">General Acknowledgment</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── ACCORDION 4: AI Response & Instructions ── */}
        <div className="border border-gray-200 rounded-2xl bg-white shadow-2xs overflow-hidden">
          <button
            type="button"
            onClick={() => setResponseOpen((prev) => !prev)}
            className="w-full px-5 py-3.5 flex items-center justify-between bg-gray-50/70 hover:bg-gray-50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900">4. AI Response Instructions & Prompt</h3>
                <p className="text-[11px] text-gray-500">Configure how the AI generates the WhatsApp reply and what information to provide.</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${responseOpen ? "rotate-180" : ""}`} />
          </button>

          {responseOpen && (
            <div className="p-5 space-y-4 border-t border-gray-100">
              {/* Response Type */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setResponseType("ai_prompt")}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    responseType === "ai_prompt"
                      ? "bg-purple-50/70 border-purple-300 ring-1 ring-purple-400/30"
                      : "bg-white border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-xs font-bold text-gray-900 block">AI Generative</span>
                  <span className="text-[10px] text-gray-500">Prompt-driven contextual response</span>
                </button>
                <button
                  type="button"
                  onClick={() => setResponseType("fixed_text")}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    responseType === "fixed_text"
                      ? "bg-purple-50/70 border-purple-300 ring-1 ring-purple-400/30"
                      : "bg-white border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-xs font-bold text-gray-900 block">Fixed Message</span>
                  <span className="text-[10px] text-gray-500">Exact pre-written message text</span>
                </button>
                <button
                  type="button"
                  onClick={() => setResponseType("ai_draft_only")}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    responseType === "ai_draft_only"
                      ? "bg-purple-50/70 border-purple-300 ring-1 ring-purple-400/30"
                      : "bg-white border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-xs font-bold text-gray-900 block">AI Draft Only</span>
                  <span className="text-[10px] text-gray-500">Drafts message for human review</span>
                </button>
              </div>

              {responseType === "ai_prompt" || responseType === "ai_draft_only" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700">
                      Response Prompt Instructions <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-1 text-[11px] text-gray-500">
                      <span>Tone:</span>
                      <select
                        value={aiTone}
                        onChange={(e) => setAiTone(e.target.value as any)}
                        className="bg-transparent font-bold text-gray-800 outline-none cursor-pointer"
                      >
                        <option value="empathetic">Empathetic</option>
                        <option value="professional">Professional</option>
                        <option value="friendly">Friendly</option>
                        <option value="urgent">Urgent</option>
                        <option value="concise">Concise</option>
                      </select>
                    </div>
                  </div>

                  <textarea
                    ref={promptTextareaRef}
                    rows={4}
                    value={responsePrompt}
                    onChange={(e) => setResponsePrompt(e.target.value)}
                    placeholder="e.g., Thank {{contact_name}} for confirming their appointment. Remind them to arrive 10 minutes early with ID and insurance card. If they asked a question about parking, clarify that valet is complimentary."
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 outline-none focus:border-blue-500 shadow-2xs leading-relaxed"
                  />

                  {/* Variable insertion buttons */}
                  <div>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                      Insert Dynamic Variables:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {["contact_name", "appointment_date", "appointment_time", "service_name", "clinic_name", "template_name"].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => handleInsertVariable(v)}
                          className="px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-mono border border-blue-200 transition-colors cursor-pointer"
                        >
                          +{`{{${v}}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Fixed Message Text <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={fixedResponseText}
                    onChange={(e) => setFixedResponseText(e.target.value)}
                    placeholder="e.g., Thank you for confirming! Your appointment has been secured. We look forward to seeing you."
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 outline-none focus:border-blue-500 shadow-2xs"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── ACCORDION 5: CRM & Contact / Lead Creation ── */}
        <div className="border border-gray-200 rounded-2xl bg-white shadow-2xs overflow-hidden">
          <button
            type="button"
            onClick={() => setCrmOpen((prev) => !prev)}
            className="w-full px-5 py-3.5 flex items-center justify-between bg-gray-50/70 hover:bg-gray-50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900">5. CRM Contact / Lead Creation & Workflow</h3>
                <p className="text-[11px] text-gray-500">Auto-create contacts, leads, or patients and assign to process stages.</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${crmOpen ? "rotate-180" : ""}`} />
          </button>

          {crmOpen && (
            <div className="p-5 space-y-4 border-t border-gray-100">
              {/* Enable Auto-Create */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200/80">
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Auto-Create or Update CRM Entity</h4>
                  <p className="text-[11px] text-gray-500">Automatically creates or updates CRM record upon message qualification.</p>
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCreateContact}
                    onChange={(e) => setAutoCreateContact(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600 relative"></div>
                </label>
              </div>

              {autoCreateContact && (
                <div className="space-y-3.5 pt-1">
                  {/* Entity Type Selection */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Target Entity Type
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {(["Contact", "Lead", "Patient", "Deal"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setEntityType(t)}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            entityType === t
                              ? "bg-cyan-50 border-cyan-300 text-cyan-800 ring-1 ring-cyan-400/30"
                              : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Qualification Prompt */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Lead Qualification & Field Extraction Prompt
                    </label>
                    <textarea
                      rows={2}
                      value={crmQualificationPrompt}
                      onChange={(e) => setCrmQualificationPrompt(e.target.value)}
                      placeholder="e.g., Extract customer name, insurance provider, policy ID, and requested appointment slot."
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>

                  {/* Workflow Assignment */}
                  <div className="pt-2 border-t border-gray-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                        <GitBranch className="w-3.5 h-3.5 text-gray-500" />
                        <span>Assign to Process Workflow</span>
                      </label>
                      <input
                        type="checkbox"
                        checked={assignProcessEnabled}
                        onChange={(e) => setAssignProcessEnabled(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>

                    {assignProcessEnabled && (
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 mb-1">Workflow</label>
                          <select
                            value={processId}
                            onChange={(e) => {
                              setProcessId(e.target.value);
                              setStageId("none");
                            }}
                            className="w-full h-8 px-2.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 outline-none cursor-pointer"
                          >
                            <option value="none">Select Process...</option>
                            {entityWorkflows.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.title || p.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 mb-1">Target Stage</label>
                          <select
                            value={stageId}
                            onChange={(e) => setStageId(e.target.value)}
                            disabled={!currentProcess || availableStages.length === 0}
                            className="w-full h-8 px-2.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 outline-none cursor-pointer disabled:opacity-50"
                          >
                            <option value="none">Default First Stage</option>
                            {availableStages.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── ACCORDION 6: Conversation Resolution Criteria ── */}
        <div className="border border-gray-200 rounded-2xl bg-white shadow-2xs overflow-hidden">
          <button
            type="button"
            onClick={() => setResolutionOpen((prev) => !prev)}
            className="w-full px-5 py-3.5 flex items-center justify-between bg-gray-50/70 hover:bg-gray-50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900">6. Conversation Resolution Criteria</h3>
                <p className="text-[11px] text-gray-500">Define under what conditions the WhatsApp conversation is marked resolved.</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${resolutionOpen ? "rotate-180" : ""}`} />
          </button>

          {resolutionOpen && (
            <div className="p-5 space-y-4 border-t border-gray-100">
              <label className="block text-xs font-bold text-gray-800 mb-1">
                Resolution Criteria Trigger
              </label>

              <div className="space-y-2">
                {[
                  {
                    id: "customer_confirmation" as const,
                    title: "On Customer Positive Confirmation",
                    desc: "Auto-resolve when customer confirms (e.g. 'thank you', 'confirmed', 'great', 'ok').",
                  },
                  {
                    id: "immediate" as const,
                    title: "Immediate Resolution",
                    desc: "Auto-resolve conversation immediately after the AI response is delivered.",
                  },
                  {
                    id: "inactivity_timeout" as const,
                    title: "After Inactivity Timeout",
                    desc: "Mark resolved if the customer does not reply after a specified duration.",
                  },
                  {
                    id: "prompt_condition" as const,
                    title: "Custom AI Prompt Condition",
                    desc: "AI evaluates conversation history to verify that the core task or inquiry was completed.",
                  },
                  {
                    id: "manual" as const,
                    title: "Manual Resolution Only",
                    desc: "Never auto-resolve; keep the conversation open for agent closure.",
                  },
                ].map((opt) => {
                  const isSelected = resolutionCriteria === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setResolutionCriteria(opt.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? "bg-rose-50/50 border-rose-200 ring-1 ring-rose-400/30"
                          : "bg-white border-gray-200/80 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="resolutionCriteria"
                        checked={isSelected}
                        onChange={() => {}}
                        className="mt-0.5 text-rose-600 focus:ring-rose-500 cursor-pointer"
                      />
                      <div className="flex-1">
                        <span className="text-xs font-bold text-gray-900 block">{opt.title}</span>
                        <span className="text-[11px] text-gray-500 leading-tight">{opt.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Inactivity Timeout Hours */}
              {resolutionCriteria === "inactivity_timeout" && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Timeout Duration</label>
                  <select
                    value={resolutionTimeoutHours}
                    onChange={(e) => setResolutionTimeoutHours(Number(e.target.value))}
                    className="w-full h-9 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                  >
                    <option value={2}>2 Hours</option>
                    <option value={6}>6 Hours</option>
                    <option value={12}>12 Hours</option>
                    <option value={24}>24 Hours (1 Day - Recommended)</option>
                    <option value={48}>48 Hours (2 Days)</option>
                  </select>
                </div>
              )}

              {/* Prompt Condition */}
              {resolutionCriteria === "prompt_condition" && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    AI Resolution Prompt Condition
                  </label>
                  <textarea
                    rows={2}
                    value={resolutionPromptCondition}
                    onChange={(e) => setResolutionPromptCondition(e.target.value)}
                    placeholder="e.g., Mark resolved once the patient selects a new slot and calendar booking is verified."
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 outline-none focus:border-blue-500 shadow-2xs"
                  />
                </div>
              )}

              {/* Resolution Tag & Reopen toggle */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Resolution Status Tag</label>
                  <input
                    type="text"
                    value={resolutionTag}
                    onChange={(e) => setResolutionTag(e.target.value)}
                    placeholder="e.g., Attendance Confirmed"
                    className="w-full h-9 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:border-blue-500 shadow-2xs"
                  />
                </div>

                <div className="pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reopenOnCustomerReply}
                      onChange={(e) => setReopenOnCustomerReply(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-gray-700">
                      Reopen conversation if customer replies later
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DrawerShell>
  );
}
