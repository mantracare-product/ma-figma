import React, { useState, useEffect } from "react";
import DrawerShell from "../ui/DrawerShell";
import {
  Sparkles,
  Mail,
  Tag,
  Pencil,
  Zap,
  Bell,
  ChevronDown,
  Info,
  RotateCcw,
  Check,
  Plus,
  Trash2,
  CornerUpRight,
  UserPlus,
} from "lucide-react";
import { Tooltip } from "../ui/Tooltip";
import { toast } from "sonner";
import {
  useEmailAgentStore,
  EmailLabel,
  ForwardingRule,
  DEFAULT_EMAIL_AGENT_CONFIG,
} from "../../../lib/emailAgentStore";
import AddForwardingRuleModal from "./AddForwardingRuleModal";

export interface EmailAgentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCampaignTemplates?: () => void;
  onOpenWebmailCompose?: () => void;
}

export default function EmailAgentDrawer({
  isOpen,
  onClose,
  onOpenCampaignTemplates,
  onOpenWebmailCompose,
}: EmailAgentDrawerProps) {
  const { config, updateConfig } = useEmailAgentStore();

  // Local state for drawer form
  const [monitoringEnabled, setMonitoringEnabled] = useState(config.mailbox.monitoringEnabled);
  const [aiLabellingEnabled, setAiLabellingEnabled] = useState(config.mailbox.aiLabellingEnabled);
  const [aiDraftsEnabled, setAiDraftsEnabled] = useState(config.mailbox.aiDraftsEnabled);

  // Labels state
  const [labelViewTab, setLabelViewTab] = useState<"custom" | "templates">("custom");
  const [customLabels, setCustomLabels] = useState<EmailLabel[]>(config.step1Labels.customLabels);
  const [predefinedLabels, setPredefinedLabels] = useState<EmailLabel[]>(config.step1Labels.predefinedLabels);
  const [showAddLabelForm, setShowAddLabelForm] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelDesc, setNewLabelDesc] = useState("");
  const [newLabelDraftingRule, setNewLabelDraftingRule] = useState("");
  const [newLabelColor, setNewLabelColor] = useState<EmailLabel["color"]>("blue");
  const [expandedDraftingRuleId, setExpandedDraftingRuleId] = useState<string | null>(null);

  // Signature state
  const [signatureEnabled, setSignatureEnabled] = useState(config.step2Drafting.signature.isSetUp);
  const [signatureBody, setSignatureBody] = useState(config.step2Drafting.signature.body);

  // Automations state (Auto-Create Contact)
  const [autoCreateContactEnabled, setAutoCreateContactEnabled] = useState(config.step3Actions.crmLeads.enabled);
  const [contactEntityType, setContactEntityType] = useState<"Contact" | "Lead" | "Patient" | "Deal">(
    config.step3Actions.crmLeads.entityType || "Contact"
  );
  const [contactQualificationPrompt, setContactQualificationPrompt] = useState(
    config.step3Actions.crmLeads.qualificationPrompt || ""
  );
  const [forwardingRules, setForwardingRules] = useState<ForwardingRule[]>(config.step3Actions.forwarding.rules);
  const [showAddForwardRuleModal, setShowAddForwardRuleModal] = useState(false);

  // Notifications state
  const [crmLeadEmail, setCrmLeadEmail] = useState(config.step4Notifications.crmLeadEmail);
  const [meetingRequest, setMeetingRequest] = useState(config.step4Notifications.meetingRequest);
  const [calendarReminder, setCalendarReminder] = useState(config.step4Notifications.calendarReminder);

  // Accordion open/close states
  const [monitoringDropdownOpen, setMonitoringDropdownOpen] = useState(true);
  const [labelsDropdownOpen, setLabelsDropdownOpen] = useState(true);
  const [signatureDropdownOpen, setSignatureDropdownOpen] = useState(false);
  const [automationsDropdownOpen, setAutomationsDropdownOpen] = useState(false);
  const [notificationsDropdownOpen, setNotificationsDropdownOpen] = useState(false);

  // Sync with store on open or store updates
  useEffect(() => {
    if (isOpen) {
      setMonitoringEnabled(config.mailbox.monitoringEnabled);
      setAiLabellingEnabled(config.mailbox.aiLabellingEnabled);
      setAiDraftsEnabled(config.mailbox.aiDraftsEnabled);
      setCustomLabels(config.step1Labels.customLabels);
      setPredefinedLabels(config.step1Labels.predefinedLabels);
      setSignatureEnabled(config.step2Drafting.signature.isSetUp);
      setSignatureBody(config.step2Drafting.signature.body);
      setAutoCreateContactEnabled(config.step3Actions.crmLeads.enabled);
      setContactEntityType(config.step3Actions.crmLeads.entityType || "Contact");
      setContactQualificationPrompt(config.step3Actions.crmLeads.qualificationPrompt || "");
      setForwardingRules(config.step3Actions.forwarding.rules);
      setCrmLeadEmail(config.step4Notifications.crmLeadEmail);
      setMeetingRequest(config.step4Notifications.meetingRequest);
      setCalendarReminder(config.step4Notifications.calendarReminder);
    }
  }, [isOpen, config]);

  // Save handler
  const handleSave = () => {
    updateConfig((prev) => ({
      ...prev,
      mailbox: {
        ...prev.mailbox,
        monitoringEnabled,
        aiLabellingEnabled: monitoringEnabled ? aiLabellingEnabled : false,
        aiDraftsEnabled: monitoringEnabled ? aiDraftsEnabled : false,
      },
      step1Labels: {
        customLabels,
        predefinedLabels,
      },
      step2Drafting: {
        ...prev.step2Drafting,
        signature: {
          ...prev.step2Drafting.signature,
          isSetUp: signatureEnabled,
          body: signatureBody,
        },
      },
      step3Actions: {
        ...prev.step3Actions,
        crmLeads: {
          enabled: autoCreateContactEnabled,
          entityType: contactEntityType,
          qualificationPrompt: contactQualificationPrompt,
        },
        forwarding: {
          enabled: forwardingRules.length > 0,
          rules: forwardingRules,
        },
      },
      step4Notifications: {
        ...prev.step4Notifications,
        crmLeadEmail,
        meetingRequest,
        calendarReminder,
      },
    }));

    toast.success("Email agent settings saved successfully");
    onClose();
  };

  // Reset defaults handler
  const handleResetDefaults = () => {
    setMonitoringEnabled(DEFAULT_EMAIL_AGENT_CONFIG.mailbox.monitoringEnabled);
    setAiLabellingEnabled(DEFAULT_EMAIL_AGENT_CONFIG.mailbox.aiLabellingEnabled);
    setAiDraftsEnabled(DEFAULT_EMAIL_AGENT_CONFIG.mailbox.aiDraftsEnabled);
    setCustomLabels(DEFAULT_EMAIL_AGENT_CONFIG.step1Labels.customLabels);
    setPredefinedLabels(DEFAULT_EMAIL_AGENT_CONFIG.step1Labels.predefinedLabels);
    setSignatureEnabled(DEFAULT_EMAIL_AGENT_CONFIG.step2Drafting.signature.isSetUp);
    setSignatureBody(DEFAULT_EMAIL_AGENT_CONFIG.step2Drafting.signature.body);
    setAutoCreateContactEnabled(DEFAULT_EMAIL_AGENT_CONFIG.step3Actions.crmLeads.enabled);
    setContactEntityType(DEFAULT_EMAIL_AGENT_CONFIG.step3Actions.crmLeads.entityType || "Contact");
    setContactQualificationPrompt(DEFAULT_EMAIL_AGENT_CONFIG.step3Actions.crmLeads.qualificationPrompt);
    setForwardingRules(DEFAULT_EMAIL_AGENT_CONFIG.step3Actions.forwarding.rules);
    setCrmLeadEmail(DEFAULT_EMAIL_AGENT_CONFIG.step4Notifications.crmLeadEmail);
    setMeetingRequest(DEFAULT_EMAIL_AGENT_CONFIG.step4Notifications.meetingRequest);
    setCalendarReminder(DEFAULT_EMAIL_AGENT_CONFIG.step4Notifications.calendarReminder);
    toast.info("Reset to default settings");
  };

  // Label handlers
  const handleCreateLabel = () => {
    if (!newLabelName.trim()) {
      toast.error("Please enter a label name");
      return;
    }
    const newLbl: EmailLabel = {
      id: `lbl-${Date.now()}`,
      name: newLabelName.trim(),
      description: newLabelDesc.trim() || `Classify messages matching ${newLabelName.trim()}`,
      draftingRule: newLabelDraftingRule.trim() || undefined,
      color: newLabelColor,
      enabled: true,
      isPredefined: false,
    };
    setCustomLabels((prev) => [...prev, newLbl]);
    setNewLabelName("");
    setNewLabelDesc("");
    setNewLabelDraftingRule("");
    setShowAddLabelForm(false);
    toast.success(`Label "${newLbl.name}" created`);
  };

  const handleDeleteLabel = (id: string) => {
    setCustomLabels((prev) => prev.filter((l) => l.id !== id));
    toast.success("Label deleted");
  };

  const handleToggleCustomLabel = (id: string) => {
    setCustomLabels((prev) =>
      prev.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l))
    );
  };

  const handleTogglePredefinedLabel = (id: string) => {
    setPredefinedLabels((prev) =>
      prev.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l))
    );
  };

  const handleUpdateLabelDraftingRule = (id: string, ruleText: string, isPredefined = false) => {
    if (isPredefined) {
      setPredefinedLabels((prev) =>
        prev.map((l) => (l.id === id ? { ...l, draftingRule: ruleText } : l))
      );
    } else {
      setCustomLabels((prev) =>
        prev.map((l) => (l.id === id ? { ...l, draftingRule: ruleText } : l))
      );
    }
  };

  // Forwarding rules handlers
  const handleAddForwardingRule = (ruleData: Omit<ForwardingRule, "id">) => {
    const newRule: ForwardingRule = {
      ...ruleData,
      id: `fwd-${Date.now()}`,
    };
    setForwardingRules((prev) => [...prev, newRule]);
    toast.success("Forwarding rule added");
  };

  const handleDeleteForwardingRule = (id: string) => {
    setForwardingRules((prev) => prev.filter((r) => r.id !== id));
    toast.success("Forwarding rule deleted");
  };

  const handleToggleForwardingRule = (id: string) => {
    setForwardingRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const getLabelColorClasses = (color: EmailLabel["color"]) => {
    switch (color) {
      case "blue":
        return "bg-blue-600 text-white";
      case "amber":
        return "bg-amber-400 text-amber-950 font-semibold";
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

  const totalActiveLabels =
    customLabels.filter((l) => l.enabled).length +
    predefinedLabels.filter((l) => l.enabled).length;

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title="Email Agent Settings"
      subtitle="Configure email monitoring, categorization, drafting rules, and automations"
      icon={<Sparkles className="w-5 h-5 text-primary" />}
      width="max-w-[540px]"
      bodyClassName="p-4 sm:p-5 overflow-y-auto bg-slate-50/50"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>

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
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-xs transition-colors cursor-pointer"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              <Check className="w-4 h-4" />
              Save Settings
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* ── DROPDOWN 1: Email Monitoring & Automation ── */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs transition-all">
          <button
            type="button"
            onClick={() => setMonitoringDropdownOpen(!monitoringDropdownOpen)}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-primary shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-sm font-bold text-[#222222]"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  Email Monitoring & Automation
                </span>
                <Tooltip text="Control background email ingestion, automatic categorization, and AI draft generation.">
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  monitoringEnabled
                    ? "bg-emerald-100 text-emerald-700 font-bold"
                    : "bg-slate-100 text-slate-500 font-bold"
                }`}
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {monitoringEnabled ? "On" : "Off"}
              </span>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                  monitoringDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {monitoringDropdownOpen && (
            <div className="p-4 border-t border-slate-100 bg-[#fbfcfd] space-y-3">
              {/* Feature 1: Email monitoring */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="pr-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold text-slate-900"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      Email Monitoring
                    </span>
                    <Tooltip text="Master toggle. Turning this off stops both AI labelling and drafts below.">
                      <Info className="w-3 h-3 text-slate-400 cursor-help" />
                    </Tooltip>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Turning this off stops both features below
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={monitoringEnabled}
                    onChange={(e) => setMonitoringEnabled(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary cursor-pointer" />
                </label>
              </div>

              {/* Feature 2: AI labelling */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="pr-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold text-slate-900 flex items-center gap-1.5"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                      AI Labelling
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Automatically classify and assign tags to incoming messages
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    disabled={!monitoringEnabled}
                    className="sr-only peer"
                    checked={monitoringEnabled && aiLabellingEnabled}
                    onChange={(e) => setAiLabellingEnabled(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary cursor-pointer peer-disabled:opacity-50" />
                </label>
              </div>

              {/* Feature 3: AI drafts */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="pr-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold text-slate-900 flex items-center gap-1.5"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      <Pencil className="w-3.5 h-3.5 text-indigo-500" />
                      AI Drafts
                    </span>
                    {monitoringEnabled && aiDraftsEnabled && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        On
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Switch drafts off to keep automatic labelling without any drafts.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    disabled={!monitoringEnabled}
                    className="sr-only peer"
                    checked={monitoringEnabled && aiDraftsEnabled}
                    onChange={(e) => setAiDraftsEnabled(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary cursor-pointer peer-disabled:opacity-50" />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* ── DROPDOWN 2: Labels & Categorization (with Custom vs Templates Toggle & Drafting Rules) ── */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs transition-all">
          <button
            type="button"
            onClick={() => setLabelsDropdownOpen(!labelsDropdownOpen)}
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
                  Labels & Categorization
                </span>
                <Tooltip text="Custom and predefined tags applied automatically to organize incoming emails and trigger tailored drafting rules.">
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {totalActiveLabels} Active
              </span>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                  labelsDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {labelsDropdownOpen && (
            <div className="p-4 border-t border-slate-100 bg-[#fbfcfd] space-y-3">
              {/* Clean Segmented Tab Toggle: [ Custom Labels ] | [ Templates ] */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 gap-1">
                <button
                  type="button"
                  onClick={() => setLabelViewTab("custom")}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                    labelViewTab === "custom"
                      ? "bg-white text-[#1E293B] shadow-2xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Custom Labels ({customLabels.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLabelViewTab("templates")}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                    labelViewTab === "templates"
                      ? "bg-white text-[#1E293B] shadow-2xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Templates ({predefinedLabels.length})
                </button>
              </div>

              {/* ── TAB 1: CUSTOM LABELS ── */}
              {labelViewTab === "custom" && (
                <div className="space-y-2.5">
                  {customLabels.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 italic bg-white rounded-xl border border-dashed border-slate-200">
                      No custom labels created yet. Click "+ Add Label" below to create one.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {customLabels.map((lbl) => {
                        const isExpanded = expandedDraftingRuleId === lbl.id;
                        return (
                          <div
                            key={lbl.id}
                            className="p-3 rounded-xl bg-white border border-slate-200/80 space-y-2 shadow-2xs"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${getLabelColorClasses(
                                      lbl.color
                                    )}`}
                                    style={{ fontFamily: "Outfit, sans-serif" }}
                                  >
                                    {lbl.name}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                                  {lbl.description}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={lbl.enabled}
                                    onChange={() => handleToggleCustomLabel(lbl.id)}
                                  />
                                  <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary cursor-pointer" />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLabel(lbl.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="Delete label"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Drafting rule per label */}
                            <div className="pt-2 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedDraftingRuleId(isExpanded ? null : lbl.id)
                                }
                                className="text-[11px] font-semibold text-slate-600 hover:text-primary flex items-center gap-1.5 cursor-pointer"
                              >
                                <Pencil className="w-3 h-3 text-slate-400" />
                                <span>Drafting Rule</span>
                                <span className="text-[10px] text-slate-400 font-normal">
                                  {lbl.draftingRule ? "— configured" : "— (click to define)"}
                                </span>
                              </button>

                              {isExpanded && (
                                <div className="mt-2 space-y-1 animate-in fade-in duration-100">
                                  <textarea
                                    rows={2}
                                    value={lbl.draftingRule || ""}
                                    onChange={(e) =>
                                      handleUpdateLabelDraftingRule(lbl.id, e.target.value, false)
                                    }
                                    placeholder="Enter AI drafting instructions specifically for this label (e.g. Tone, greeting, action to offer)..."
                                    className="w-full p-2 text-xs bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 resize-none font-sans"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Unified subtle grey Add Label button (DESIGN.md Section 5.1) */}
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddLabelForm(!showAddLabelForm)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {showAddLabelForm ? "Cancel Add Label" : "Add Label"}
                    </button>
                  </div>

                  {/* Inline Add Label Form (NO auto-generate button per user instructions) */}
                  {showAddLabelForm && (
                    <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs mt-2 animate-in fade-in duration-150">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Label Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. VIP Client, Urgent Lab, Billing"
                          value={newLabelName}
                          onChange={(e) => setNewLabelName(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Description (Required for Classification)
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Describe when this label should be applied to an email..."
                          value={newLabelDesc}
                          onChange={(e) => setNewLabelDesc(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Drafting Rule (Instructions for AI reply)
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Provide specific reply drafting instructions for emails with this label..."
                          value={newLabelDraftingRule}
                          onChange={(e) => setNewLabelDraftingRule(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary resize-none"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5">
                          {(["blue", "emerald", "amber", "purple", "rose", "cyan", "orange"] as const).map(
                            (c) => (
                              <button
                                type="button"
                                key={c}
                                onClick={() => setNewLabelColor(c)}
                                className={`w-5 h-5 rounded-full ${getLabelColorClasses(
                                  c
                                )} flex items-center justify-center transition-transform cursor-pointer ${
                                  newLabelColor === c ? "ring-2 ring-offset-1 ring-slate-400 scale-110" : ""
                                }`}
                              />
                            )
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={handleCreateLabel}
                          className="px-3.5 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Create
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 2: TEMPLATES (PREDEFINED LABELS) ── */}
              {labelViewTab === "templates" && (
                <div className="space-y-2">
                  {predefinedLabels.map((lbl) => {
                    const isExpanded = expandedDraftingRuleId === lbl.id;
                    return (
                      <div
                        key={lbl.id}
                        className="p-3 rounded-xl bg-white border border-slate-200/80 space-y-2 shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${getLabelColorClasses(
                                lbl.color
                              )}`}
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              {lbl.name}
                            </span>
                            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                              {lbl.description}
                            </p>
                          </div>

                          <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={lbl.enabled}
                              onChange={() => handleTogglePredefinedLabel(lbl.id)}
                            />
                            <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary cursor-pointer" />
                          </label>
                        </div>

                        {/* Drafting rule per template label */}
                        <div className="pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedDraftingRuleId(isExpanded ? null : lbl.id)
                            }
                            className="text-[11px] font-semibold text-slate-600 hover:text-primary flex items-center gap-1.5 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3 text-slate-400" />
                            <span>Drafting Rule</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              {lbl.draftingRule ? "— configured" : "— (click to define)"}
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="mt-2 space-y-1 animate-in fade-in duration-100">
                              <textarea
                                rows={2}
                                value={lbl.draftingRule || ""}
                                onChange={(e) =>
                                  handleUpdateLabelDraftingRule(lbl.id, e.target.value, true)
                                }
                                placeholder="Enter AI drafting instructions specifically for this template label..."
                                className="w-full p-2 text-xs bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 resize-none font-sans"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── DROPDOWN 3: Email Signature ── */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs transition-all">
          <button
            type="button"
            onClick={() => setSignatureDropdownOpen(!signatureDropdownOpen)}
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
                  Email Signature
                </span>
                <Tooltip text="Signature automatically attached to AI drafted responses.">
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  signatureEnabled
                    ? "bg-emerald-100 text-emerald-700 font-bold"
                    : "bg-slate-100 text-slate-500 font-bold"
                }`}
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {signatureEnabled ? "Configured" : "None"}
              </span>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                  signatureDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {signatureDropdownOpen && (
            <div className="p-4 border-t border-slate-100 bg-[#fbfcfd] space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <div>
                  <span
                    className="text-xs font-bold text-slate-900"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    Include Signature in AI Drafts
                  </span>
                  <p className="text-[11px] text-slate-500 leading-normal mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Automatically appends your designated sign-off to every drafted email
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={signatureEnabled}
                    onChange={(e) => setSignatureEnabled(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary cursor-pointer" />
                </label>
              </div>

              {signatureEnabled && (
                <div>
                  <label
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    Signature Body Text
                  </label>
                  <textarea
                    rows={4}
                    value={signatureBody}
                    onChange={(e) => setSignatureBody(e.target.value)}
                    placeholder="Best regards,&#10;Dr. Ananya Sharma&#10;MantraCare Medical Team&#10;support@mantra.care"
                    className="w-full p-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-slate-800 font-mono shadow-2xs resize-none"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── DROPDOWN 4: Automations & Forwarding (Auto-Create Contact with Entity Selector) ── */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs transition-all">
          <button
            type="button"
            onClick={() => setAutomationsDropdownOpen(!automationsDropdownOpen)}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-primary shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-sm font-bold text-[#222222]"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  Automations & Forwarding
                </span>
                <Tooltip text="Automatic actions executed upon email arrival (CRM contact generation, forwarding rules).">
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {forwardingRules.length > 0 ? `${forwardingRules.length} Rules` : "Active"}
              </span>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                  automationsDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {automationsDropdownOpen && (
            <div className="p-4 border-t border-slate-100 bg-[#fbfcfd] space-y-4">
              {/* Feature 1: Auto-Create Contact with Choose Entity */}
              <div className="space-y-3 p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span
                        className="text-xs font-bold text-slate-900"
                        style={{ fontFamily: "DM Sans, sans-serif" }}
                      >
                        Auto-Create Contact
                      </span>
                      <p className="text-[11px] text-slate-500 leading-normal" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Identify prospective inquiries and automatically generate a CRM record
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={autoCreateContactEnabled}
                      onChange={(e) => setAutoCreateContactEnabled(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary cursor-pointer" />
                  </label>
                </div>

                {autoCreateContactEnabled && (
                  <div className="pt-2.5 border-t border-slate-100 space-y-3 animate-in fade-in duration-100">
                    {/* Entity Selection */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Choose Entity Type
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(["Contact", "Lead", "Patient", "Deal"] as const).map((ent) => (
                          <button
                            type="button"
                            key={ent}
                            onClick={() => setContactEntityType(ent)}
                            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                              contactEntityType === ent
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

                    {/* Criteria prompt */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Qualification Criteria Prompt
                      </label>
                      <textarea
                        rows={2}
                        value={contactQualificationPrompt}
                        onChange={(e) => setContactQualificationPrompt(e.target.value)}
                        placeholder="Criteria for creating this record (e.g. sender inquiring about consultation packages, pricing, or therapy booking)..."
                        className="w-full p-2.5 text-xs bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 resize-none font-sans"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Feature 2: Forwarding Rules */}
              <div className="space-y-2 pt-2 border-t border-slate-200/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CornerUpRight className="w-4 h-4 text-blue-600" />
                    <span
                      className="text-xs font-bold text-slate-900"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      Forwarding Rules ({forwardingRules.length})
                    </span>
                  </div>
                </div>

                {forwardingRules.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-1">No forwarding rules active.</p>
                ) : (
                  <div className="space-y-2">
                    {forwardingRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-slate-800 block truncate">
                            {rule.name}
                          </span>
                          <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                            {rule.conditionField} {rule.conditionOperator} "{rule.conditionValue}" → {rule.forwardTo}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={rule.enabled}
                              onChange={() => handleToggleForwardingRule(rule.id)}
                            />
                            <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary cursor-pointer" />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleDeleteForwardingRule(rule.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Subtle Add Forwarding Rule button (DESIGN.md Section 5.1) */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddForwardRuleModal(true)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Forwarding Rule
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── DROPDOWN 5: Email Notifications ── */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs transition-all">
          <button
            type="button"
            onClick={() => setNotificationsDropdownOpen(!notificationsDropdownOpen)}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-primary shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-sm font-bold text-[#222222]"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  Email Notifications
                </span>
                <Tooltip text="Choose which email agent events trigger immediate notifications to the team.">
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  crmLeadEmail || meetingRequest || calendarReminder
                    ? "bg-emerald-100 text-emerald-700 font-bold"
                    : "bg-slate-100 text-slate-500 font-bold"
                }`}
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {crmLeadEmail || meetingRequest || calendarReminder ? "Active" : "Muted"}
              </span>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                  notificationsDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {notificationsDropdownOpen && (
            <div className="p-4 border-t border-slate-100 bg-[#fbfcfd] space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <div>
                  <span className="text-xs font-bold text-slate-900 block" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    New Contact Identified Alerts
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Notify responsible staff when an incoming email creates a new contact or lead
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={crmLeadEmail}
                    onChange={(e) => setCrmLeadEmail(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary cursor-pointer" />
                </label>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <div>
                  <span className="text-xs font-bold text-slate-900 block" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    Meeting & Reschedule Requests
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Send high-priority alerts when a client requests appointment rescheduling or confirmation
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={meetingRequest}
                    onChange={(e) => setMeetingRequest(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary cursor-pointer" />
                </label>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <div>
                  <span className="text-xs font-bold text-slate-900 block" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    Calendar Reminder Sync
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Sync reminder notifications with staff calendar schedules
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={calendarReminder}
                    onChange={(e) => setCalendarReminder(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary cursor-pointer" />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add Forwarding Rule */}
      <AddForwardingRuleModal
        isOpen={showAddForwardRuleModal}
        onClose={() => setShowAddForwardRuleModal(false)}
        onAddRule={handleAddForwardingRule}
      />
    </DrawerShell>
  );
}
