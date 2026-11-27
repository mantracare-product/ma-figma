import React, { useState, useEffect } from "react";
import DrawerShell from "../ui/DrawerShell";
import {
  ChevronDown,
  ChevronUp,
  Info,
  RotateCcw,
  Check,
  Plus,
  Trash2,
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
      width="max-w-3xl"
      bodyClassName="pt-3.5 px-6 pb-6 overflow-y-auto overflow-x-hidden"
      footer={
        <div className="flex items-center justify-between w-full" style={{ fontFamily: "Outfit, sans-serif" }}>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-[#1456f0] text-white hover:bg-blue-700 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-3.5" style={{ fontFamily: "Outfit, sans-serif" }}>
        {/* ── 1. Email Monitoring & Automation ── */}
        <div className="border border-slate-200 rounded-lg bg-white">
          <button
            type="button"
            onClick={() => setMonitoringDropdownOpen(!monitoringDropdownOpen)}
            className={`w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer ${
              monitoringDropdownOpen ? "rounded-t-lg" : "rounded-lg"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-900">1. Email Monitoring & Automation</span>
              <Tooltip content="Control background email ingestion, automatic categorization, and AI draft generation." position="top">
                <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">
                {monitoringEnabled ? "On" : "Off"}
              </span>
              {monitoringDropdownOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {monitoringDropdownOpen && (
            <div className="px-4 py-4 border-t border-slate-100 space-y-3">
              {/* Email Monitoring */}
              <div className="flex items-center justify-between h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700 cursor-pointer">
                  <span>Email monitoring</span>
                  <Tooltip content="Master toggle. Turning this off stops both AI labelling and AI drafts below." position="top">
                    <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                  </Tooltip>
                </label>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={monitoringEnabled}
                    onChange={(e) => setMonitoringEnabled(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 cursor-pointer" />
                </label>
              </div>

              {/* AI Labelling */}
              <div className="flex items-center justify-between h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700 cursor-pointer">
                  <span>AI labelling</span>
                  <Tooltip content="Automatically classify and assign tags to incoming messages." position="top">
                    <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                  </Tooltip>
                </label>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    disabled={!monitoringEnabled}
                    className="sr-only peer"
                    checked={monitoringEnabled && aiLabellingEnabled}
                    onChange={(e) => setAiLabellingEnabled(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 cursor-pointer peer-disabled:opacity-50" />
                </label>
              </div>

              {/* AI Drafts */}
              <div className="flex items-center justify-between h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700 cursor-pointer">
                  <span>AI drafts</span>
                  <Tooltip content="Switch drafts off to keep automatic labelling without generating AI drafts." position="top">
                    <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                  </Tooltip>
                </label>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    disabled={!monitoringEnabled}
                    className="sr-only peer"
                    checked={monitoringEnabled && aiDraftsEnabled}
                    onChange={(e) => setAiDraftsEnabled(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 cursor-pointer peer-disabled:opacity-50" />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* ── 2. Labels & Categorization ── */}
        <div className="border border-slate-200 rounded-lg bg-white">
          <button
            type="button"
            onClick={() => setLabelsDropdownOpen(!labelsDropdownOpen)}
            className={`w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer ${
              labelsDropdownOpen ? "rounded-t-lg" : "rounded-lg"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-900">2. Labels & Categorization</span>
              <Tooltip content="Custom and predefined tags applied automatically to organize incoming emails and trigger tailored drafting rules." position="top">
                <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">
                {totalActiveLabels} Active
              </span>
              {labelsDropdownOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {labelsDropdownOpen && (
            <div className="px-4 py-4 border-t border-slate-100 space-y-4">
              {/* Segmented Tab Toggle */}
              <div className="inline-flex w-full items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setLabelViewTab("custom")}
                  className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all text-center cursor-pointer ${
                    labelViewTab === "custom"
                      ? "bg-white text-blue-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Custom Labels ({customLabels.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLabelViewTab("templates")}
                  className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all text-center cursor-pointer ${
                    labelViewTab === "templates"
                      ? "bg-white text-blue-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Templates ({predefinedLabels.length})
                </button>
              </div>

              {/* ── TAB 1: CUSTOM LABELS ── */}
              {labelViewTab === "custom" && (
                <div className="space-y-3">
                  {customLabels.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                      No custom labels created yet. Click "Add label" below to create one.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {customLabels.map((lbl) => {
                        const isExpanded = expandedDraftingRuleId === lbl.id;
                        return (
                          <div
                            key={lbl.id}
                            className="p-3.5 rounded-lg bg-slate-50/30 border border-slate-200 space-y-2.5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <span
                                  className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${getLabelColorClasses(
                                    lbl.color
                                  )}`}
                                >
                                  {lbl.name}
                                </span>
                                <p className="text-xs text-slate-500 mt-1.5 leading-snug">
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
                                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 cursor-pointer" />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLabel(lbl.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                  title="Delete label"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedDraftingRuleId(isExpanded ? null : lbl.id)
                                }
                                className="text-xs font-medium text-slate-600 hover:text-blue-600 flex items-center gap-1.5 cursor-pointer"
                              >
                                <span>Drafting rule</span>
                                <span className="text-slate-400 font-normal">
                                  {lbl.draftingRule ? "— configured" : "— click to define"}
                                </span>
                              </button>

                              {isExpanded && (
                                <div className="mt-2">
                                  <textarea
                                    rows={2}
                                    value={lbl.draftingRule || ""}
                                    onChange={(e) =>
                                      handleUpdateLabelDraftingRule(lbl.id, e.target.value, false)
                                    }
                                    placeholder="Enter AI drafting instructions specifically for this label (e.g. Tone, greeting, action to offer)..."
                                    className="w-full p-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 resize-none"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddLabelForm(!showAddLabelForm)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 bg-white border border-blue-200 rounded-md transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{showAddLabelForm ? "Cancel" : "Add label"}</span>
                    </button>
                  </div>

                  {showAddLabelForm && (
                    <div className="p-3.5 bg-slate-50/40 border border-slate-200 rounded-lg space-y-3">
                      <div>
                        <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                          Label name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. VIP Client, Urgent Lab, Billing"
                          value={newLabelName}
                          onChange={(e) => setNewLabelName(e.target.value)}
                          className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                          Description
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Describe when this label should be applied to an email..."
                          value={newLabelDesc}
                          onChange={(e) => setNewLabelDesc(e.target.value)}
                          className="w-full p-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                          Drafting rule
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Provide specific reply drafting instructions for emails with this label..."
                          value={newLabelDraftingRule}
                          onChange={(e) => setNewLabelDraftingRule(e.target.value)}
                          className="w-full p-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 resize-none"
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
                          className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#1456f0] hover:bg-blue-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Create</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 2: TEMPLATES (PREDEFINED LABELS) ── */}
              {labelViewTab === "templates" && (
                <div className="space-y-2.5">
                  {predefinedLabels.map((lbl) => {
                    const isExpanded = expandedDraftingRuleId === lbl.id;
                    return (
                      <div
                        key={lbl.id}
                        className="p-3.5 rounded-lg bg-slate-50/30 border border-slate-200 space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <span
                              className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${getLabelColorClasses(
                                lbl.color
                              )}`}
                            >
                              {lbl.name}
                            </span>
                            <p className="text-xs text-slate-500 mt-1.5 leading-snug">
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
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 cursor-pointer" />
                          </label>
                        </div>

                        <div className="pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedDraftingRuleId(isExpanded ? null : lbl.id)
                            }
                            className="text-xs font-medium text-slate-600 hover:text-blue-600 flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>Drafting rule</span>
                            <span className="text-slate-400 font-normal">
                              {lbl.draftingRule ? "— configured" : "— click to define"}
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="mt-2">
                              <textarea
                                rows={2}
                                value={lbl.draftingRule || ""}
                                onChange={(e) =>
                                  handleUpdateLabelDraftingRule(lbl.id, e.target.value, true)
                                }
                                placeholder="Enter AI drafting instructions specifically for this template label..."
                                className="w-full p-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 resize-none"
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

        {/* ── 3. Email Signature ── */}
        <div className="border border-slate-200 rounded-lg bg-white">
          <button
            type="button"
            onClick={() => setSignatureDropdownOpen(!signatureDropdownOpen)}
            className={`w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer ${
              signatureDropdownOpen ? "rounded-t-lg" : "rounded-lg"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-900">3. Email Signature</span>
              <Tooltip content="Signature automatically attached to AI drafted responses." position="top">
                <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">
                {signatureEnabled ? "Configured" : "None"}
              </span>
              {signatureDropdownOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {signatureDropdownOpen && (
            <div className="px-4 py-4 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700 cursor-pointer">
                  <span>Include signature in AI drafts</span>
                  <Tooltip content="Automatically appends your designated sign-off to every drafted email." position="top">
                    <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                  </Tooltip>
                </label>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={signatureEnabled}
                    onChange={(e) => setSignatureEnabled(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 cursor-pointer" />
                </label>
              </div>

              {signatureEnabled && (
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                    Signature body text
                  </label>
                  <textarea
                    rows={4}
                    value={signatureBody}
                    onChange={(e) => setSignatureBody(e.target.value)}
                    placeholder="Best regards,&#10;Dr. Ananya Sharma&#10;MantraCare Medical Team&#10;support@mantra.care"
                    className="w-full p-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 resize-none"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── 4. Automations & Forwarding ── */}
        <div className="border border-slate-200 rounded-lg bg-white">
          <button
            type="button"
            onClick={() => setAutomationsDropdownOpen(!automationsDropdownOpen)}
            className={`w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer ${
              automationsDropdownOpen ? "rounded-t-lg" : "rounded-lg"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-900">4. Automations & Forwarding</span>
              <Tooltip content="Automatic actions executed upon email arrival (CRM contact generation, forwarding rules)." position="top">
                <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">
                {forwardingRules.length > 0 ? `${forwardingRules.length} Rules` : "Active"}
              </span>
              {automationsDropdownOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {automationsDropdownOpen && (
            <div className="px-4 py-4 border-t border-slate-100 space-y-4">
              {/* Auto-Create Contact */}
              <div className="space-y-3">
                <div className="flex items-center justify-between h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700 cursor-pointer">
                    <span>Auto-create contact</span>
                    <Tooltip content="Identify prospective inquiries and automatically generate a CRM record." position="top">
                      <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                    </Tooltip>
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={autoCreateContactEnabled}
                      onChange={(e) => setAutoCreateContactEnabled(e.target.checked)}
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 cursor-pointer" />
                  </label>
                </div>

                {autoCreateContactEnabled && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                        Entity type
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {(["Contact", "Lead", "Patient", "Deal"] as const).map((ent) => (
                          <button
                            type="button"
                            key={ent}
                            onClick={() => setContactEntityType(ent)}
                            className={`h-9 px-2 rounded-lg text-xs font-semibold transition-colors text-center cursor-pointer border ${
                              contactEntityType === ent
                                ? "bg-slate-900 text-white border-slate-900"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {ent}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                        Qualification criteria prompt
                      </label>
                      <textarea
                        rows={2}
                        value={contactQualificationPrompt}
                        onChange={(e) => setContactQualificationPrompt(e.target.value)}
                        placeholder="Criteria for creating this record (e.g. sender inquiring about consultation packages, pricing, or therapy booking)..."
                        className="w-full p-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Forwarding Rules */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-slate-700">
                    Forwarding rules ({forwardingRules.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddForwardRuleModal(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 bg-white border border-blue-200 rounded-md transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add rule</span>
                  </button>
                </div>

                {forwardingRules.length === 0 ? (
                  <p className="text-xs text-slate-400">No forwarding rules active.</p>
                ) : (
                  <div className="space-y-2">
                    {forwardingRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="p-3 rounded-lg bg-slate-50/30 border border-slate-200 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-semibold text-slate-900 block truncate">
                            {rule.name}
                          </span>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
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
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 cursor-pointer" />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleDeleteForwardingRule(rule.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── 5. Email Notifications ── */}
        <div className="border border-slate-200 rounded-lg bg-white">
          <button
            type="button"
            onClick={() => setNotificationsDropdownOpen(!notificationsDropdownOpen)}
            className={`w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer ${
              notificationsDropdownOpen ? "rounded-t-lg" : "rounded-lg"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-900">5. Email Notifications</span>
              <Tooltip content="Choose which email agent events trigger immediate notifications to the team." position="top">
                <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">
                {crmLeadEmail || meetingRequest || calendarReminder ? "Active" : "Muted"}
              </span>
              {notificationsDropdownOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {notificationsDropdownOpen && (
            <div className="px-4 py-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700 cursor-pointer">
                  <span>New contact identified alerts</span>
                  <Tooltip content="Notify responsible staff when an incoming email creates a new contact or lead." position="top">
                    <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                  </Tooltip>
                </label>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={crmLeadEmail}
                    onChange={(e) => setCrmLeadEmail(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 cursor-pointer" />
                </label>
              </div>

              <div className="flex items-center justify-between h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700 cursor-pointer">
                  <span>Meeting & reschedule requests</span>
                  <Tooltip content="Send high-priority alerts when a client requests appointment rescheduling or confirmation." position="top">
                    <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                  </Tooltip>
                </label>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={meetingRequest}
                    onChange={(e) => setMeetingRequest(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 cursor-pointer" />
                </label>
              </div>

              <div className="flex items-center justify-between h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700 cursor-pointer">
                  <span>Calendar reminder sync</span>
                  <Tooltip content="Sync reminder notifications with staff calendar schedules." position="top">
                    <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                  </Tooltip>
                </label>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={calendarReminder}
                    onChange={(e) => setCalendarReminder(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 cursor-pointer" />
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
