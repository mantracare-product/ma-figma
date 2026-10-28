import React, { useState, useEffect, useMemo } from "react";
import DrawerShell from "../ui/DrawerShell";
import {
  Tag,
  Pencil,
  UserPlus,
  CornerUpRight,
  Check,
  RotateCcw,
  Trash2,
  Info,
  PenLine,
  Mail,
  GitFork,
  Sparkles,
  ChevronDown,
  Filter,
  Paperclip,
} from "lucide-react";
import { Tooltip } from "../ui/Tooltip";
import { toast } from "sonner";
import {
  EmailLabel,
  DEFAULT_SIGNATURES,
  AVAILABLE_CONNECTED_ACCOUNTS,
} from "../../../lib/emailAgentStore";
import { getStoredProcesses } from "../../../lib/useProcessStore";

export interface LabelRuleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  label: EmailLabel | null;
  onSave: (label: EmailLabel) => void;
  onDelete?: (labelId: string) => void;
}

const COLOR_OPTIONS: EmailLabel["color"][] = [
  "blue",
  "emerald",
  "amber",
  "purple",
  "rose",
  "cyan",
  "orange",
  "slate",
];

const ENTITY_OPTIONS = ["Contact", "Lead", "Patient", "Deal"] as const;

export default function LabelRuleDrawer({
  isOpen,
  onClose,
  label,
  onSave,
  onDelete,
}: LabelRuleDrawerProps) {
  const isEditing = Boolean(label);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<EmailLabel["color"]>("blue");
  const [enabled, setEnabled] = useState(true);
  const [connectedEmailAccount, setConnectedEmailAccount] = useState<string>("all");

  // Criteria mode: "prompt" vs "filters"
  const [criteriaType, setCriteriaType] = useState<"prompt" | "filters">("prompt");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [hasWordsFilter, setHasWordsFilter] = useState("");
  const [doesntHaveFilter, setDoesntHaveFilter] = useState("");
  const [sizeComparison, setSizeComparison] = useState<"greater_than" | "less_than">("greater_than");
  const [sizeValue, setSizeValue] = useState("");
  const [sizeUnit, setSizeUnit] = useState<"MB" | "KB" | "Bytes">("MB");
  const [dateWithin, setDateWithin] = useState("1 day");
  const [dateSpecific, setDateSpecific] = useState("");
  const [searchFolder, setSearchFolder] = useState("All Mail");
  const [hasAttachment, setHasAttachment] = useState(false);

  // Drafting rules state
  const [autoDraftEnabled, setAutoDraftEnabled] = useState(true);
  const [draftingRule, setDraftingRule] = useState("");
  const [assignedSignatureId, setAssignedSignatureId] = useState<string>("none");

  // Auto Contact Creation & Process Workflow state
  const [autoCreateContact, setAutoCreateContact] = useState(false);
  const [entityType, setEntityType] = useState<"Contact" | "Lead" | "Patient" | "Deal">("Contact");
  const [autoAssignWorkflowByDescription, setAutoAssignWorkflowByDescription] = useState(false);
  
  const allProcesses = useMemo(() => getStoredProcesses(), [isOpen]);

  // Only show Client/Contact entity workflows (not Invoice, Insurance, Claim, etc.)
  const entityWorkflows = useMemo(() => {
    const filtered = allProcesses.filter((p) => !p.entityType || p.entityType === "client");
    return filtered.length > 0 ? filtered : allProcesses;
  }, [allProcesses]);

  const [selectedProcessId, setSelectedProcessId] = useState<string>("none");
  const [selectedStageId, setSelectedStageId] = useState<string>("none"); // "none" = optional
  const [autoMapStageByDescription, setAutoMapStageByDescription] = useState(false);

  const currentProcess = useMemo(() => {
    if (!selectedProcessId || selectedProcessId === "none") return null;
    return entityWorkflows.find((p) => p.id === selectedProcessId) || null;
  }, [entityWorkflows, selectedProcessId]);

  const availableStages = useMemo(() => {
    return currentProcess ? currentProcess.stages : [];
  }, [currentProcess]);

  // Handoff rules state
  const [handoffEnabled, setHandoffEnabled] = useState(false);
  const [forwardTo, setForwardTo] = useState("");
  const [handoffReason, setHandoffReason] = useState("");
  const [notifyTeam, setNotifyTeam] = useState(true);

  // Dropdown accordions state (CallTriggerDrawer UI style)
  const [labelDropdownOpen, setLabelDropdownOpen] = useState(true);
  const [draftingDropdownOpen, setDraftingDropdownOpen] = useState(false);
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false);
  const [handoffDropdownOpen, setHandoffDropdownOpen] = useState(false);

  // Available signatures filtered by chosen connected email account
  const filteredSignatures = useMemo(() => {
    if (!connectedEmailAccount || connectedEmailAccount === "all") {
      return DEFAULT_SIGNATURES;
    }
    const filtered = DEFAULT_SIGNATURES.filter(
      (s) => !s.user || s.user === "All senders" || s.user.toLowerCase() === connectedEmailAccount.toLowerCase()
    );
    return filtered.length > 0 ? filtered : DEFAULT_SIGNATURES;
  }, [connectedEmailAccount]);

  // Populate state on open / label change
  useEffect(() => {
    if (label) {
      setName(label.name || "");
      setDescription(label.description || "");
      setColor(label.color || "blue");
      setEnabled(label.enabled !== undefined ? label.enabled : true);
      setConnectedEmailAccount(label.connectedEmailAccount || "all");
      setCriteriaType(label.criteriaType || (label.filterRules ? "filters" : "prompt"));
      setFromFilter(label.filterRules?.from || "");
      setToFilter(label.filterRules?.to || "");
      setSubjectFilter(label.filterRules?.subject || "");
      setHasWordsFilter(label.filterRules?.hasWords || "");
      setDoesntHaveFilter(label.filterRules?.doesntHave || "");
      setSizeComparison(label.filterRules?.sizeComparison || "greater_than");
      setSizeValue(label.filterRules?.sizeValue || "");
      setSizeUnit(label.filterRules?.sizeUnit || "MB");
      setDateWithin(label.filterRules?.dateWithin || "1 day");
      setDateSpecific(label.filterRules?.dateSpecific || "");
      setSearchFolder(label.filterRules?.searchFolder || "All Mail");
      setHasAttachment(Boolean(label.filterRules?.hasAttachment));
      setAutoDraftEnabled(label.autoDraftEnabled !== undefined ? label.autoDraftEnabled : true);
      setDraftingRule(label.draftingRule || "");
      setAssignedSignatureId(label.assignedSignatureId || "none");
      setAutoCreateContact(Boolean(label.autoCreateContact));
      setEntityType(label.entityType || "Contact");
      setAutoAssignWorkflowByDescription(Boolean(label.autoAssignWorkflowByDescription));
      setSelectedProcessId(label.processId || "none");
      setSelectedStageId(label.stageId || "none");
      setAutoMapStageByDescription(Boolean(label.autoMapStageByDescription));
      setHandoffEnabled(Boolean(label.handoffEnabled));
      setForwardTo(label.forwardTo || "");
      setHandoffReason(label.handoffReason || "");
      setNotifyTeam(label.notifyTeam !== undefined ? label.notifyTeam : true);
    } else {
      setName("");
      setDescription("");
      setColor("blue");
      setEnabled(true);
      setConnectedEmailAccount("all");
      setCriteriaType("prompt");
      setFromFilter("");
      setToFilter("");
      setSubjectFilter("");
      setHasWordsFilter("");
      setDoesntHaveFilter("");
      setSizeComparison("greater_than");
      setSizeValue("");
      setSizeUnit("MB");
      setDateWithin("1 day");
      setDateSpecific("");
      setSearchFolder("All Mail");
      setHasAttachment(false);
      setAutoDraftEnabled(true);
      setDraftingRule("");
      setAssignedSignatureId("none");
      setAutoCreateContact(false);
      setEntityType("Contact");
      setAutoAssignWorkflowByDescription(false);
      setSelectedProcessId("none");
      setSelectedStageId("none");
      setAutoMapStageByDescription(false);
      setHandoffEnabled(false);
      setForwardTo("");
      setHandoffReason("");
      setNotifyTeam(true);
    }
  }, [label, isOpen, entityWorkflows]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a label name");
      return;
    }

    let finalDescription = description.trim();

    if (criteriaType === "prompt") {
      if (!finalDescription) {
        toast.error("Please enter classification criteria or switch to filter rules");
        return;
      }
    } else {
      const hasAnyFilter = Boolean(
        fromFilter.trim() ||
        toFilter.trim() ||
        subjectFilter.trim() ||
        hasWordsFilter.trim() ||
        doesntHaveFilter.trim() ||
        sizeValue.trim() ||
        dateSpecific ||
        hasAttachment
      );
      if (!hasAnyFilter && !finalDescription) {
        toast.error("Please specify at least one filter criterion (e.g. From, Subject, or Has words)");
        return;
      }

      // Auto-summarize filters for description column if not custom written
      if (!finalDescription || finalDescription.startsWith("Filter: ") || finalDescription.startsWith("Filters: ")) {
        const parts: string[] = [];
        if (fromFilter.trim()) parts.push(`From: ${fromFilter.trim()}`);
        if (toFilter.trim()) parts.push(`To: ${toFilter.trim()}`);
        if (subjectFilter.trim()) parts.push(`Subject: "${subjectFilter.trim()}"`);
        if (hasWordsFilter.trim()) parts.push(`Has: "${hasWordsFilter.trim()}"`);
        if (doesntHaveFilter.trim()) parts.push(`Exclude: "${doesntHaveFilter.trim()}"`);
        if (sizeValue.trim()) parts.push(`Size ${sizeComparison === "greater_than" ? ">" : "<"} ${sizeValue.trim()} ${sizeUnit}`);
        if (hasAttachment) parts.push("Has attachment");
        finalDescription = parts.length > 0 ? `Filters: ${parts.join(" • ")}` : `Filter: ${searchFolder}`;
      }
    }

    if (handoffEnabled && (!forwardTo.trim() || !forwardTo.includes("@"))) {
      toast.error("Please enter a valid forwarding email address for handoff");
      return;
    }

    const isProcessAssigned = autoCreateContact && (selectedProcessId !== "none" || autoAssignWorkflowByDescription);

    const updatedLabel: EmailLabel = {
      id: label ? label.id : `lbl-${Date.now()}`,
      name: name.trim(),
      description: finalDescription,
      color,
      enabled,
      isPredefined: label ? label.isPredefined : false,
      connectedEmailAccount,
      assignedSignatureId: assignedSignatureId === "none" ? undefined : assignedSignatureId,
      criteriaType,
      filterRules: criteriaType === "filters" ? {
        from: fromFilter.trim() || undefined,
        to: toFilter.trim() || undefined,
        subject: subjectFilter.trim() || undefined,
        hasWords: hasWordsFilter.trim() || undefined,
        doesntHave: doesntHaveFilter.trim() || undefined,
        sizeComparison,
        sizeValue: sizeValue.trim() || undefined,
        sizeUnit,
        dateWithin,
        dateSpecific: dateSpecific || undefined,
        searchFolder,
        hasAttachment,
      } : undefined,
      draftingRule: draftingRule.trim() || undefined,
      autoDraftEnabled,
      autoCreateContact,
      entityType: autoCreateContact ? entityType : undefined,
      assignProcessEnabled: isProcessAssigned,
      autoAssignWorkflowByDescription: isProcessAssigned ? autoAssignWorkflowByDescription : undefined,
      processId: isProcessAssigned && !autoAssignWorkflowByDescription && selectedProcessId !== "none" ? selectedProcessId : undefined,
      processName: isProcessAssigned && !autoAssignWorkflowByDescription && selectedProcessId !== "none" ? currentProcess?.name : undefined,
      stageId: isProcessAssigned && !autoAssignWorkflowByDescription && selectedStageId !== "none" ? selectedStageId : undefined,
      stageName: isProcessAssigned && !autoAssignWorkflowByDescription && selectedStageId !== "none" ? availableStages.find((s) => s.id === selectedStageId)?.name : undefined,
      autoMapStageByDescription: isProcessAssigned ? autoMapStageByDescription : undefined,
      handoffEnabled,
      forwardTo: forwardTo.trim() || undefined,
      handoffReason: handoffReason.trim() || undefined,
      notifyTeam,
    };

    onSave(updatedLabel);
    toast.success(`Rule "${updatedLabel.name}" saved successfully`);
    onClose();
  };

  const getLabelColorClasses = (c: EmailLabel["color"]) => {
    switch (c) {
      case "blue":
        return "bg-blue-600 text-white";
      case "amber":
        return "bg-amber-400 text-amber-950";
      case "purple":
        return "bg-purple-600 text-white";
      case "cyan":
        return "bg-sky-500 text-white";
      case "rose":
        return "bg-rose-500 text-white";
      case "orange":
        return "bg-orange-500 text-white";
      case "emerald":
        return "bg-emerald-600 text-white";
      default:
        return "bg-slate-700 text-white";
    }
  };

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title={label ? label.name : "New Label Rule"}
      subtitle="Configure classification criteria, AI drafting instructions, CRM actions, and handoff rules"
      icon={<Tag className="w-5 h-5 text-primary" />}
      width="max-w-[540px]"
      bodyClassName="p-4 sm:p-5 overflow-y-auto bg-slate-50/50"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {isEditing && !label?.isPredefined && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete "${label?.name}"?`)) {
                    onDelete(label.id);
                    toast.success("Label rule deleted");
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Rule
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setName(label?.name || "");
                  setDescription(label?.description || "");
                  setDraftingRule(label?.draftingRule || "");
                  toast.info("Reset to initial values");
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-xs transition-colors cursor-pointer"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              <Check className="w-4 h-4" />
              Save Rule
            </button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* DROPDOWN 1: Label & Classification */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs transition-all">
          <button
            type="button"
            onClick={() => setLabelDropdownOpen(!labelDropdownOpen)}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-primary shrink-0">
                <Tag className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-sm font-bold text-[#222222]"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  Label &amp; Classification
                </span>
                <Tooltip text="Configure label identity, color badge, connected email account, and classification criteria.">
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                labelDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {labelDropdownOpen && (
            <div className="p-4 border-t border-slate-100 bg-[#fbfcfd] space-y-3">
              {/* Label Name input */}
              <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <label
                    className="text-xs font-semibold text-slate-700"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    Label Name
                  </label>
                  <Tooltip text="Display name used for classification badges and email tags.">
                    <Info className="w-3 h-3 text-slate-400 cursor-help" />
                  </Tooltip>
                </div>
                <input
                  type="text"
                  placeholder="e.g. VIP Client, Urgent Lab, Billing"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary font-medium text-slate-900 shadow-2xs"
                />
              </div>

              {/* Badge Color */}
              <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                <div className="flex items-center gap-1.5">
                  <label
                    className="text-xs font-semibold text-slate-700"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    Badge Color
                  </label>
                  <Tooltip text="Visual color theme assigned to email tags and filters across the workspace.">
                    <Info className="w-3 h-3 text-slate-400 cursor-help" />
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full ${getLabelColorClasses(
                        c
                      )} flex items-center justify-center transition-transform cursor-pointer ${
                        color === c ? "ring-2 ring-offset-2 ring-slate-400 scale-110" : "opacity-80 hover:opacity-100"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Connected Email Account */}
              <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <label
                    className="text-xs font-semibold text-slate-700"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    Connected Email Account
                  </label>
                  <Tooltip text="Associate this label with a specific mailbox. Available signatures reflect this account.">
                    <Info className="w-3 h-3 text-slate-400 cursor-help" />
                  </Tooltip>
                </div>
                <div className="relative">
                  <select
                    value={connectedEmailAccount}
                    onChange={(e) => {
                      setConnectedEmailAccount(e.target.value);
                      setAssignedSignatureId("none");
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary font-medium text-slate-800 shadow-2xs cursor-pointer appearance-none pr-8"
                  >
                    {AVAILABLE_CONNECTED_ACCOUNTS.map((acc) => (
                      <option key={acc.email} value={acc.email}>
                        {acc.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* Classification Description (Criteria - Prompt vs Filters) */}
              <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <label
                      className="text-xs font-semibold text-slate-700 truncate"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      Classification Criteria
                    </label>
                    <Tooltip text="Choose whether to classify emails using an AI natural-language prompt or structured email filter rules.">
                      <Info className="w-3 h-3 text-slate-400 cursor-help shrink-0" />
                    </Tooltip>
                  </div>

                  {/* Mode Selector Toggle */}
                  <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200/60 shrink-0">
                    <button
                      type="button"
                      onClick={() => setCriteriaType("prompt")}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                        criteriaType === "prompt"
                          ? "bg-white text-primary shadow-2xs font-bold"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>AI Prompt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCriteriaType("filters")}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                        criteriaType === "filters"
                          ? "bg-white text-primary shadow-2xs font-bold"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Filter className="w-3 h-3" />
                      <span>Email Filters</span>
                    </button>
                  </div>
                </div>

                {/* CRITERIA OPTION 1: AI PROMPT */}
                {criteriaType === "prompt" && (
                  <div className="space-y-1.5 pt-0.5">
                    <textarea
                      rows={2}
                      placeholder="Describe criteria when this label should be applied to incoming emails..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 resize-none shadow-2xs font-sans"
                    />
                    <p className="text-[11px] text-slate-400">
                      Ava AI will automatically evaluate incoming emails against this prompt to classify and tag them.
                    </p>
                  </div>
                )}

                {/* CRITERIA OPTION 2: EMAIL FILTERS (Exact match to screenshot 2) */}
                {criteriaType === "filters" && (
                  <div className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2.5 text-xs animate-in fade-in duration-150">
                    {/* From */}
                    <div className="grid grid-cols-1 sm:grid-cols-[90px_1fr] items-center gap-1 sm:gap-2">
                      <span className="text-[11px] font-semibold text-slate-600">From</span>
                      <input
                        type="text"
                        value={fromFilter}
                        onChange={(e) => setFromFilter(e.target.value)}
                        placeholder="e.g. billing@vendor.com or @company.com"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 font-medium shadow-2xs"
                      />
                    </div>

                    {/* To */}
                    <div className="grid grid-cols-1 sm:grid-cols-[90px_1fr] items-center gap-1 sm:gap-2">
                      <span className="text-[11px] font-semibold text-slate-600">To</span>
                      <input
                        type="text"
                        value={toFilter}
                        onChange={(e) => setToFilter(e.target.value)}
                        placeholder="e.g. care@mantracare.com"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 font-medium shadow-2xs"
                      />
                    </div>

                    {/* Subject */}
                    <div className="grid grid-cols-1 sm:grid-cols-[90px_1fr] items-center gap-1 sm:gap-2">
                      <span className="text-[11px] font-semibold text-slate-600">Subject</span>
                      <input
                        type="text"
                        value={subjectFilter}
                        onChange={(e) => setSubjectFilter(e.target.value)}
                        placeholder="e.g. Urgent, Invoice, Lab Results, Appointment"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 font-medium shadow-2xs"
                      />
                    </div>

                    {/* Has the words */}
                    <div className="grid grid-cols-1 sm:grid-cols-[90px_1fr] items-center gap-1 sm:gap-2">
                      <span className="text-[11px] font-semibold text-slate-600">Has the words</span>
                      <input
                        type="text"
                        value={hasWordsFilter}
                        onChange={(e) => setHasWordsFilter(e.target.value)}
                        placeholder="e.g. emergency, payment, prescription"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 font-medium shadow-2xs"
                      />
                    </div>

                    {/* Doesn't have */}
                    <div className="grid grid-cols-1 sm:grid-cols-[90px_1fr] items-center gap-1 sm:gap-2">
                      <span className="text-[11px] font-semibold text-slate-600">Doesn't have</span>
                      <input
                        type="text"
                        value={doesntHaveFilter}
                        onChange={(e) => setDoesntHaveFilter(e.target.value)}
                        placeholder="e.g. unsubscribe, newsletter, digest"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 font-medium shadow-2xs"
                      />
                    </div>

                    {/* Size */}
                    <div className="grid grid-cols-1 sm:grid-cols-[90px_1fr] items-center gap-1 sm:gap-2">
                      <span className="text-[11px] font-semibold text-slate-600">Size</span>
                      <div className="flex items-center gap-2">
                        <select
                          value={sizeComparison}
                          onChange={(e) => setSizeComparison(e.target.value as any)}
                          className="px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-primary cursor-pointer shadow-2xs"
                        >
                          <option value="greater_than">greater than</option>
                          <option value="less_than">less than</option>
                        </select>
                        <input
                          type="number"
                          min="0"
                          value={sizeValue}
                          onChange={(e) => setSizeValue(e.target.value)}
                          placeholder="e.g. 10"
                          className="w-20 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 font-medium shadow-2xs"
                        />
                        <select
                          value={sizeUnit}
                          onChange={(e) => setSizeUnit(e.target.value as any)}
                          className="px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-primary cursor-pointer shadow-2xs"
                        >
                          <option value="MB">MB</option>
                          <option value="KB">KB</option>
                          <option value="Bytes">Bytes</option>
                        </select>
                      </div>
                    </div>

                    {/* Date within */}
                    <div className="grid grid-cols-1 sm:grid-cols-[90px_1fr] items-center gap-1 sm:gap-2">
                      <span className="text-[11px] font-semibold text-slate-600">Date within</span>
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                        <select
                          value={dateWithin}
                          onChange={(e) => setDateWithin(e.target.value)}
                          className="px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-primary cursor-pointer shadow-2xs"
                        >
                          <option value="1 day">1 day</option>
                          <option value="3 days">3 days</option>
                          <option value="1 week">1 week</option>
                          <option value="2 weeks">2 weeks</option>
                          <option value="1 month">1 month</option>
                          <option value="2 months">2 months</option>
                          <option value="6 months">6 months</option>
                          <option value="1 year">1 year</option>
                        </select>
                        <input
                          type="date"
                          value={dateSpecific}
                          onChange={(e) => setDateSpecific(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 font-medium shadow-2xs cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Search in */}
                    <div className="grid grid-cols-1 sm:grid-cols-[90px_1fr] items-center gap-1 sm:gap-2">
                      <span className="text-[11px] font-semibold text-slate-600">Search</span>
                      <select
                        value={searchFolder}
                        onChange={(e) => setSearchFolder(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-primary cursor-pointer shadow-2xs"
                      >
                        <option value="All Mail">All Mail</option>
                        <option value="Inbox">Inbox</option>
                        <option value="Starred">Starred</option>
                        <option value="Sent Mail">Sent Mail</option>
                        <option value="Drafts">Drafts</option>
                        <option value="Spam">Spam</option>
                        <option value="Trash">Trash</option>
                      </select>
                    </div>

                    {/* Has attachment & Reset */}
                    <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={hasAttachment}
                          onChange={(e) => setHasAttachment(e.target.checked)}
                          className="w-3.5 h-3.5 text-primary rounded border-slate-300 focus:ring-primary/20 cursor-pointer"
                        />
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                          <Paperclip className="w-3 h-3 text-slate-400" />
                          <span>Has attachment</span>
                        </div>
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          setFromFilter("");
                          setToFilter("");
                          setSubjectFilter("");
                          setHasWordsFilter("");
                          setDoesntHaveFilter("");
                          setSizeValue("");
                          setDateSpecific("");
                          setHasAttachment(false);
                          toast.info("Filter fields cleared");
                        }}
                        className="text-[11px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
                      >
                        Clear filters
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* DROPDOWN 2: AI Reply Drafting */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs transition-all">
          <button
            type="button"
            onClick={() => setDraftingDropdownOpen(!draftingDropdownOpen)}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-primary shrink-0">
                <Pencil className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-sm font-bold text-[#222222]"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  Reply Rules
                </span>
                <Tooltip text="Configure AI reply composition guidelines and email signature assignment.">
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  autoDraftEnabled
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {autoDraftEnabled ? "On" : "Off"}
              </span>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                  draftingDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {draftingDropdownOpen && (
            <div className="p-4 border-t border-slate-100 bg-[#fbfcfd] space-y-3">
              {/* Enable Auto-Reply Drafting Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold text-slate-900"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      Enable Auto-Reply Drafting
                    </span>
                    <Tooltip text="When enabled, Ava automatically drafts AI responses for incoming emails matching this label.">
                      <Info className="w-3 h-3 text-slate-400 cursor-help" />
                    </Tooltip>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Automatically draft AI responses based on instructions below
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={autoDraftEnabled}
                    onChange={(e) => setAutoDraftEnabled(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary cursor-pointer" />
                </label>
              </div>

              {autoDraftEnabled && (
                <>
                  {/* Drafting Instructions */}
                  <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <label
                          className="text-xs font-semibold text-slate-700"
                          style={{ fontFamily: "DM Sans, sans-serif" }}
                        >
                          Drafting Instructions
                        </label>
                        <Tooltip text="Direct prompt guidelines for how the AI should compose suggested replies.">
                          <Info className="w-3 h-3 text-slate-400 cursor-help" />
                        </Tooltip>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {draftingRule.length}/1000
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      maxLength={1000}
                      placeholder="How should the AI compose the reply? e.g. Maintain polite clinical empathy, answer query directly, include booking link..."
                      value={draftingRule}
                      onChange={(e) => setDraftingRule(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 shadow-2xs resize-none font-sans leading-relaxed"
                    />
                  </div>

                  {/* Assign Signature */}
                  <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <label
                          className="text-xs font-semibold text-slate-700"
                          style={{ fontFamily: "DM Sans, sans-serif" }}
                        >
                          Assign Signature
                        </label>
                        <Tooltip text="Select the email signature automatically attached to AI replies for this mailbox.">
                          <Info className="w-3 h-3 text-slate-400 cursor-help" />
                        </Tooltip>
                      </div>
                      <span className="text-[10px] font-medium text-slate-400">
                        {connectedEmailAccount === "all" ? "All Accounts" : connectedEmailAccount}
                      </span>
                    </div>

                    <div className="relative">
                      <select
                        value={assignedSignatureId}
                        onChange={(e) => setAssignedSignatureId(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary font-medium text-slate-800 shadow-2xs cursor-pointer appearance-none pr-8"
                      >
                        <option value="none">None (No signature)</option>
                        {filteredSignatures.map((sig) => (
                          <option key={sig.id} value={sig.id}>
                            {sig.title} ({sig.user})
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                        <PenLine className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {assignedSignatureId !== "none" && (
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-600 font-mono whitespace-pre-line leading-relaxed">
                        {filteredSignatures.find((s) => s.id === assignedSignatureId)?.body || ""}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* DROPDOWN 3: Auto Contact Creation */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs transition-all">
          <button
            type="button"
            onClick={() => setContactDropdownOpen(!contactDropdownOpen)}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-primary shrink-0">
                <UserPlus className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-sm font-bold text-[#222222]"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  Auto Contact Creation
                </span>
                <Tooltip text="Automatically generate CRM records and assign pipeline workflows upon matching this label.">
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  autoCreateContact
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {autoCreateContact ? "On" : "Off"}
              </span>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                  contactDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {contactDropdownOpen && (
            <div className="p-4 border-t border-slate-100 bg-[#fbfcfd] space-y-3">
              {/* Enable Auto Contact Creation toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-bold text-slate-900"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    Enable Auto Contact Creation
                  </span>
                  <Tooltip text="Create a new CRM record when an incoming email matches this label.">
                    <Info className="w-3 h-3 text-slate-400 cursor-help" />
                  </Tooltip>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={autoCreateContact}
                    onChange={(e) => setAutoCreateContact(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary cursor-pointer" />
                </label>
              </div>

              {autoCreateContact && (
                <>
                  {/* Entity Selection */}
                  <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                    <div className="flex items-center gap-1.5">
                      <label
                        className="text-xs font-semibold text-slate-700"
                        style={{ fontFamily: "DM Sans, sans-serif" }}
                      >
                        Entity Selection
                      </label>
                      <Tooltip text="Select which CRM record type to create in the system.">
                        <Info className="w-3 h-3 text-slate-400 cursor-help" />
                      </Tooltip>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {ENTITY_OPTIONS.map((ent) => (
                        <button
                          type="button"
                          key={ent}
                          onClick={() => setEntityType(ent)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                            entityType === ent
                              ? "bg-[#1E293B] text-white shadow-2xs"
                              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          {ent}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Process & Stage Selection in ONE card container */}
                  <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Process Selection */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <label
                            className="text-xs font-semibold text-slate-700"
                            style={{ fontFamily: "DM Sans, sans-serif" }}
                          >
                            Workflow (Process Entity)
                          </label>
                          <Tooltip text="Select a pipeline workflow to route this contact into.">
                            <Info className="w-3 h-3 text-slate-400 cursor-help" />
                          </Tooltip>
                        </div>
                        <select
                          value={autoAssignWorkflowByDescription ? "none" : selectedProcessId}
                          onChange={(e) => {
                            const newProcId = e.target.value;
                            setSelectedProcessId(newProcId);
                            setSelectedStageId("none");
                          }}
                          disabled={autoAssignWorkflowByDescription}
                          className={`w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary font-medium text-slate-800 shadow-2xs cursor-pointer truncate ${
                            autoAssignWorkflowByDescription ? "opacity-50 cursor-not-allowed bg-slate-100" : ""
                          }`}
                        >
                          <option value="none">
                            {autoAssignWorkflowByDescription ? "Auto-assigned via description" : "None (No workflow)"}
                          </option>
                          {entityWorkflows.map((proc) => (
                            <option key={proc.id} value={proc.id}>
                              {proc.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Stage Selection */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <label
                            className="text-xs font-semibold text-slate-700"
                            style={{ fontFamily: "DM Sans, sans-serif" }}
                          >
                            Stage Selection
                          </label>
                          <Tooltip text="Initial stage in the pipeline workflow. Optional.">
                            <Info className="w-3 h-3 text-slate-400 cursor-help" />
                          </Tooltip>
                        </div>
                        <select
                          value={selectedStageId}
                          onChange={(e) => setSelectedStageId(e.target.value)}
                          disabled={selectedProcessId === "none" || autoMapStageByDescription}
                          className={`w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary font-medium text-slate-800 shadow-2xs cursor-pointer truncate ${
                            selectedProcessId === "none" || autoMapStageByDescription
                              ? "opacity-50 cursor-not-allowed bg-slate-100"
                              : ""
                          }`}
                        >
                          <option value="none">None (Optional / Default stage)</option>
                          {availableStages.map((stage) => (
                            <option key={stage.id} value={stage.id}>
                              {stage.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Auto-Assign Stage Based on Description */}
                  {(selectedProcessId !== "none" || autoAssignWorkflowByDescription) && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-bold text-slate-900"
                          style={{ fontFamily: "DM Sans, sans-serif" }}
                        >
                          Auto-Assign Stage Based on Description
                        </span>
                        <Tooltip text="Automatically route to stage by matching email intent with stage descriptions.">
                          <Info className="w-3 h-3 text-slate-400 cursor-help" />
                        </Tooltip>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={autoMapStageByDescription}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setAutoMapStageByDescription(checked);
                            if (checked) setSelectedStageId("none");
                          }}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary cursor-pointer" />
                      </label>
                    </div>
                  )}

                  {/* Assign Workflow Based on Description */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-bold text-slate-900"
                        style={{ fontFamily: "DM Sans, sans-serif" }}
                      >
                        Assign Workflow Based on Description
                      </span>
                      <Tooltip text="Automatically select the best matching pipeline workflow based on process descriptions.">
                        <Info className="w-3 h-3 text-slate-400 cursor-help" />
                      </Tooltip>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={autoAssignWorkflowByDescription}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setAutoAssignWorkflowByDescription(checked);
                          if (checked) setSelectedProcessId("none");
                        }}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary cursor-pointer" />
                    </label>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* DROPDOWN 4: Handoff & Forwarding */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs transition-all">
          <button
            type="button"
            onClick={() => setHandoffDropdownOpen(!handoffDropdownOpen)}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-primary shrink-0">
                <CornerUpRight className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-sm font-bold text-[#222222]"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  Handoff &amp; Forwarding
                </span>
                <Tooltip text="Automatically forward emails or escalate cases to team members.">
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  handoffEnabled
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {handoffEnabled ? "On" : "Off"}
              </span>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                  handoffDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {handoffDropdownOpen && (
            <div className="p-4 border-t border-slate-100 bg-[#fbfcfd] space-y-3">
              {/* Enable Handoff toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-bold text-slate-900"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    Enable Handoff &amp; Forwarding
                  </span>
                  <Tooltip text="Forward incoming emails matching this label to a designated email address.">
                    <Info className="w-3 h-3 text-slate-400 cursor-help" />
                  </Tooltip>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={handoffEnabled}
                    onChange={(e) => setHandoffEnabled(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary cursor-pointer" />
                </label>
              </div>

              {handoffEnabled && (
                <>
                  {/* Forward To Email */}
                  <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <label
                        className="text-xs font-semibold text-slate-700"
                        style={{ fontFamily: "DM Sans, sans-serif" }}
                      >
                        Forward To Email Address
                      </label>
                      <Tooltip text="Designated email address to forward matching emails to.">
                        <Info className="w-3 h-3 text-slate-400 cursor-help" />
                      </Tooltip>
                    </div>
                    <input
                      type="email"
                      placeholder="e.g. specialist@mantra.care, triage@mantra.care"
                      value={forwardTo}
                      onChange={(e) => setForwardTo(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary font-mono text-slate-800 shadow-2xs"
                    />
                  </div>

                  {/* Handoff Reason */}
                  <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <label
                        className="text-xs font-semibold text-slate-700"
                        style={{ fontFamily: "DM Sans, sans-serif" }}
                      >
                        Handoff Reason
                      </label>
                      <Tooltip text="Escalation note or handoff explanation attached to the forwarded email.">
                        <Info className="w-3 h-3 text-slate-400 cursor-help" />
                      </Tooltip>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Urgent clinical question requiring specialist doctor review"
                      value={handoffReason}
                      onChange={(e) => setHandoffReason(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 shadow-2xs"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </form>
    </DrawerShell>
  );
}
