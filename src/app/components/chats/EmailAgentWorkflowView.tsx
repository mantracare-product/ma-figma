/**
 * EmailAgentWorkflowView.tsx
 * Path: src/app/components/chats/EmailAgentWorkflowView.tsx
 *
 * Implements the complete 4-step Email Agent workflow configuration & pipeline:
 * - Top Navigation: [Email agent] | [Campaign templates] + Header
 * - Top-Right Connected Mailbox Status Card (Gmail, monitoring, AI labels/drafts, KPIs)
 * - STEP 1: An email arrives (Labels & categories, label creator, AI auto-gen, predefined labels)
 * - STEP 2: The agent drafts a reply (Drafting instructions prompt 0/2000 + Email signature)
 * - STEP 3: It takes action (Create tickets, Forwarding rules with rule builder, Create CRM leads)
 * - STEP 4: You stay in the loop (Notifications toggles, Team inboxes sync status)
 */

import React, { useState } from "react";
import {
  Tag,
  Pencil,
  Ticket,
  CornerUpRight,
  UserPlus,
  Bell,
  Users,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Sparkles,
  Save,
  Link2,
  Check,
  Lock,
  Inbox,
  AlertCircle,
  Mail,
  Send,
  Calendar,
  Layers,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  useEmailAgentStore,
  EmailLabel,
  ForwardingRule,
} from "../../../lib/emailAgentStore";
import AddForwardingRuleModal from "./AddForwardingRuleModal";

interface EmailAgentWorkflowViewProps {
  onOpenCampaignTemplates?: () => void;
  onOpenWebmailCompose?: () => void;
  inDrawer?: boolean;
}

export default function EmailAgentWorkflowView({
  onOpenCampaignTemplates,
  onOpenWebmailCompose,
  inDrawer = false,
}: EmailAgentWorkflowViewProps) {
  const { config, updateConfig } = useEmailAgentStore();

  // Step 1: Label creation form state
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelDesc, setNewLabelDesc] = useState("");
  const [newLabelColor, setNewLabelColor] = useState<EmailLabel["color"]>("blue");
  const [isGeneratingAiDesc, setIsGeneratingAiDesc] = useState(false);
  const [expandedLabelIds, setExpandedLabelIds] = useState<Set<string>>(new Set());

  // Step 2: Drafting instructions form
  const [draftingInstructions, setDraftingInstructions] = useState(
    config.step2Drafting.instructions || ""
  );
  const [isDraftingExpanded, setIsDraftingExpanded] = useState(true);
  const [isSignatureExpanded, setIsSignatureExpanded] = useState(false);
  const [signatureText, setSignatureText] = useState(config.step2Drafting.signature.body);

  // Step 3: Automations Accordions
  const [isTicketsExpanded, setIsTicketsExpanded] = useState(false);
  const [isForwardingExpanded, setIsForwardingExpanded] = useState(false);
  const [isCrmLeadsExpanded, setIsCrmLeadsExpanded] = useState(true);
  const [crmLeadPrompt, setCrmLeadPrompt] = useState(
    config.step3Actions.crmLeads.qualificationPrompt || ""
  );
  const [showAddForwardRuleModal, setShowAddForwardRuleModal] = useState(false);

  // Step 4: Loop Notifications Accordions
  const [isNotificationsExpanded, setIsNotificationsExpanded] = useState(true);
  const [isTeamInboxesExpanded, setIsTeamInboxesExpanded] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────

  // AI Auto-generate description for label
  const handleAutoGenerateAiDesc = () => {
    if (!newLabelName.trim()) {
      toast.error("Please enter a label name first");
      return;
    }
    setIsGeneratingAiDesc(true);
    setTimeout(() => {
      const generated = `Automatically classify incoming emails regarding ${newLabelName.trim().toLowerCase()} inquiries, urgent requests, and associated customer communication.`;
      setNewLabelDesc(generated);
      setIsGeneratingAiDesc(false);
      toast.success("AI generated classification description");
    }, 600);
  };

  // Create new label
  const handleCreateLabel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelName.trim()) {
      toast.error("Please enter a label name");
      return;
    }
    const newLabel: EmailLabel = {
      id: `custom-${Date.now()}`,
      name: newLabelName.trim(),
      description: newLabelDesc.trim() || `Classify emails matching ${newLabelName.trim()}`,
      color: newLabelColor,
      enabled: true,
      isPredefined: false,
    };

    updateConfig((prev) => ({
      ...prev,
      step1Labels: {
        ...prev.step1Labels,
        customLabels: [newLabel, ...prev.step1Labels.customLabels],
      },
    }));

    setNewLabelName("");
    setNewLabelDesc("");
    toast.success(`Created label "${newLabel.name}"`);
  };

  // Toggle label status
  const handleToggleLabel = (id: string, isPredefined: boolean) => {
    updateConfig((prev) => {
      if (isPredefined) {
        return {
          ...prev,
          step1Labels: {
            ...prev.step1Labels,
            predefinedLabels: prev.step1Labels.predefinedLabels.map((lbl) =>
              lbl.id === id ? { ...lbl, enabled: !lbl.enabled } : lbl
            ),
          },
        };
      }
      return {
        ...prev,
        step1Labels: {
          ...prev.step1Labels,
          customLabels: prev.step1Labels.customLabels.map((lbl) =>
            lbl.id === id ? { ...lbl, enabled: !lbl.enabled } : lbl
          ),
        },
      };
    });
  };

  // Delete label
  const handleDeleteLabel = (id: string, isPredefined: boolean) => {
    updateConfig((prev) => {
      if (isPredefined) {
        return {
          ...prev,
          step1Labels: {
            ...prev.step1Labels,
            predefinedLabels: prev.step1Labels.predefinedLabels.filter((lbl) => lbl.id !== id),
          },
        };
      }
      return {
        ...prev,
        step1Labels: {
          ...prev.step1Labels,
          customLabels: prev.step1Labels.customLabels.filter((lbl) => lbl.id !== id),
        },
      };
    });
    toast.success("Label removed");
  };

  // Toggle label row expansion
  const toggleLabelExpand = (id: string) => {
    setExpandedLabelIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Save Step 2 Drafting Instructions
  const handleSaveDraftingInstructions = () => {
    updateConfig((prev) => ({
      ...prev,
      step2Drafting: {
        ...prev.step2Drafting,
        instructions: draftingInstructions,
      },
    }));
    toast.success("Drafting instructions saved successfully");
  };

  // Save Step 2 Email Signature
  const handleSaveSignature = () => {
    updateConfig((prev) => ({
      ...prev,
      step2Drafting: {
        ...prev.step2Drafting,
        signature: {
          ...prev.step2Drafting.signature,
          isSetUp: true,
          body: signatureText,
        },
      },
    }));
    toast.success("Email signature updated");
  };

  // Add forwarding rule
  const handleAddForwardingRule = (ruleData: Omit<ForwardingRule, "id">) => {
    const newRule: ForwardingRule = {
      ...ruleData,
      id: `fwd-${Date.now()}`,
    };
    updateConfig((prev) => ({
      ...prev,
      step3Actions: {
        ...prev.step3Actions,
        forwarding: {
          ...prev.step3Actions.forwarding,
          rules: [...prev.step3Actions.forwarding.rules, newRule],
        },
      },
    }));
  };

  // Delete forwarding rule
  const handleDeleteForwardingRule = (id: string) => {
    updateConfig((prev) => ({
      ...prev,
      step3Actions: {
        ...prev.step3Actions,
        forwarding: {
          ...prev.step3Actions.forwarding,
          rules: prev.step3Actions.forwarding.rules.filter((r) => r.id !== id),
        },
      },
    }));
    toast.success("Forwarding rule deleted");
  };

  // Save Step 3 CRM Lead Qualification
  const handleSaveCrmLeadQualification = () => {
    updateConfig((prev) => ({
      ...prev,
      step3Actions: {
        ...prev.step3Actions,
        crmLeads: {
          ...prev.step3Actions.crmLeads,
          qualificationPrompt: crmLeadPrompt,
        },
      },
    }));
    toast.success("CRM lead qualification guidelines saved");
  };

  // Label color badge styling helper
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

  return (
    <div
      className={`w-full mx-auto space-y-6 ${inDrawer ? "pb-8 max-w-full" : "max-w-6xl pb-20"} text-slate-800`}
      style={{ fontFamily: "DM Sans, sans-serif" }}
    >
      {/* ── Main Layout: Left Pipeline Steps (70%) + Right Mailbox Card (30%) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Title & 4 Pipeline Steps */}
        <div className="lg:col-span-8 space-y-7">
          {/* Header Title */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
              How your email agent works
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Everything that happens to an email, in order. Select a card to edit it.
            </p>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              STEP 1: An email arrives (How it gets organized)
             ══════════════════════════════════════════════════════════════ */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <div className="flex items-center gap-2">
                <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">STEP 1</span>
                <span className="font-bold text-[#0F172A] text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
                  An email arrives
                </span>
              </div>
              <span className="text-gray-400 text-xs italic">How it gets organized</span>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden border-t-2 border-t-[#1456f0]">
              {/* Card Header */}
              <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <Tag className="w-4 h-4 text-slate-600" />
                  <span className="font-bold text-sm text-[#0F172A]" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Labels &amp; categories
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 sm:p-6 space-y-6">
                {/* 1. Create Label Form */}
                <div className="p-4 rounded-xl border border-gray-200/90 bg-white space-y-3.5">
                  <div className="flex items-center gap-2 text-slate-800">
                    <Plus className="w-4 h-4 text-slate-600" />
                    <div>
                      <h4 className="font-bold text-xs text-[#0F172A]" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Create Label
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        Add a new label to your connected mailbox
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleCreateLabel} className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newLabelName}
                        onChange={(e) => setNewLabelName(e.target.value)}
                        placeholder="Enter label name"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder:text-gray-400"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create</span>
                      </button>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-700">
                          Description <span className="text-red-500">*</span>
                        </label>
                      </div>
                      <textarea
                        rows={2}
                        value={newLabelDesc}
                        onChange={(e) => setNewLabelDesc(e.target.value)}
                        placeholder="Describe when this label should be applied — required for AI email classification"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder:text-gray-400 resize-none"
                      />
                      <div className="flex justify-end mt-1.5">
                        <button
                          type="button"
                          onClick={handleAutoGenerateAiDesc}
                          disabled={isGeneratingAiDesc}
                          className="text-[11px] font-semibold text-[#1456f0] hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{isGeneratingAiDesc ? "Generating..." : "Auto-generate with AI"}</span>
                        </button>
                      </div>
                    </div>
                  </form>
                </div>

                {/* 2. Custom Labels (if any) */}
                {config.step1Labels.customLabels.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Custom Mailbox Labels ({config.step1Labels.customLabels.length})
                    </h5>
                    <div className="space-y-1.5">
                      {config.step1Labels.customLabels.map((label) => (
                        <div
                          key={label.id}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 bg-white hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${getLabelColorClasses(label.color)}`}>
                              {label.name}
                            </span>
                            <span className="text-xs text-gray-500 truncate max-w-md">
                              {label.description}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={label.enabled}
                                onChange={() => handleToggleLabel(label.id, false)}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1456f0]" />
                            </label>
                            <button
                              type="button"
                              onClick={() => handleDeleteLabel(label.id, false)}
                              className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                              title="Delete label"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Predefined Labels Section */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-[#0F172A]" style={{ fontFamily: "Outfit, sans-serif" }}>
                          Predefined Labels
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          Set up by Frontdesk for AI email classification. Edit a description to fine-tune how each is applied.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      Select
                    </button>
                  </div>

                  {/* Predefined rows matching screenshot 1 */}
                  <div className="space-y-1.5 pt-1">
                    {config.step1Labels.predefinedLabels.map((lbl) => {
                      const isExpanded = expandedLabelIds.has(lbl.id);
                      return (
                        <div
                          key={lbl.id}
                          className="rounded-xl border border-gray-100 bg-white hover:border-gray-200 transition-all overflow-hidden"
                        >
                          <div className="flex items-center justify-between p-2.5 sm:px-3 sm:py-2.5">
                            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                              <button
                                type="button"
                                onClick={() => toggleLabelExpand(lbl.id)}
                                className="text-gray-400 hover:text-slate-700 transition-colors cursor-pointer shrink-0"
                              >
                                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                              </button>
                              <span
                                className={`px-3 py-1 rounded-md text-xs font-bold shrink-0 ${getLabelColorClasses(lbl.color)}`}
                                style={{ fontFamily: "Outfit, sans-serif" }}
                              >
                                {lbl.name}
                              </span>
                              {!isExpanded && (
                                <span className="text-[11px] text-gray-400 truncate hidden sm:inline ml-2">
                                  {lbl.description}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3.5 shrink-0 ml-3">
                              {/* Toggle Switch */}
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={lbl.enabled}
                                  onChange={() => handleToggleLabel(lbl.id, true)}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1456f0]" />
                              </label>

                              {/* Delete button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteLabel(lbl.id, true)}
                                className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                                title="Delete label"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Expanded Description View/Edit */}
                          {isExpanded && (
                            <div className="px-9 py-2.5 pb-3 border-t border-gray-50 bg-slate-50/50 text-[11px] text-slate-600">
                              <p className="font-semibold text-slate-700 mb-0.5">Classification Logic:</p>
                              <p className="leading-relaxed">{lbl.description}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              STEP 2: The agent drafts a reply (What it writes)
             ══════════════════════════════════════════════════════════════ */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <div className="flex items-center gap-2">
                <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">STEP 2</span>
                <span className="font-bold text-[#0F172A] text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
                  The agent drafts a reply
                </span>
              </div>
              <span className="text-gray-400 text-xs italic">What it writes</span>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
              {/* Accordion 1: Drafting instructions (Expanded) */}
              <div className="border-b border-gray-100 border-t-2 border-t-[#1456f0]">
                <button
                  type="button"
                  onClick={() => setIsDraftingExpanded((prev) => !prev)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Pencil className="w-4 h-4 text-slate-600" />
                    <span className="font-bold text-sm text-[#0F172A]" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Drafting instructions
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDraftingExpanded ? "rotate-180" : ""}`} />
                </button>

                {isDraftingExpanded && (
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 space-y-3.5">
                    <p className="text-xs text-gray-500">
                      Guides the agent when it drafts email replies on your behalf.
                    </p>

                    <div className="relative">
                      <textarea
                        rows={5}
                        maxLength={2000}
                        value={draftingInstructions}
                        onChange={(e) => setDraftingInstructions(e.target.value)}
                        placeholder="E.g., Always greet the customer by name. Never offer discounts without manager approval."
                        className="w-full p-3.5 border-2 border-blue-500/80 rounded-xl text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 leading-relaxed placeholder:text-gray-400 resize-y"
                      />
                      <div className="flex items-center justify-between mt-1 text-[11px] text-gray-400">
                        <span>{draftingInstructions.length} / 2000</span>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleSaveDraftingInstructions}
                        className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 2: Email signature (Collapsed) */}
              <div>
                <button
                  type="button"
                  onClick={() => setIsSignatureExpanded((prev) => !prev)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Pencil className="w-4 h-4 text-slate-600" />
                    <span className="font-bold text-sm text-[#0F172A]" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Email signature
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 font-medium">
                      {config.step2Drafting.signature.isSetUp ? "Configured" : "Not set up yet"}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isSignatureExpanded ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {isSignatureExpanded && (
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 space-y-3.5 border-t border-gray-100 pt-4 bg-slate-50/50">
                    <p className="text-xs text-gray-500">
                      Signature automatically appended to drafts created by your AI agent.
                    </p>
                    <textarea
                      rows={3}
                      value={signatureText}
                      onChange={(e) => setSignatureText(e.target.value)}
                      placeholder="Best regards,&#10;Your Name & Title&#10;Company"
                      className="w-full p-3 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveSignature}
                        className="px-4 py-2 bg-[#1456f0] hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Signature</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              STEP 3: It takes action (Automations that fire)
             ══════════════════════════════════════════════════════════════ */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <div className="flex items-center gap-2">
                <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">STEP 3</span>
                <span className="font-bold text-[#0F172A] text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
                  It takes action
                </span>
              </div>
              <span className="text-gray-400 text-xs italic">Automations that fire</span>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden divide-y divide-gray-100">
              {/* Accordion 1: Create tickets */}
              <div>
                <button
                  type="button"
                  onClick={() => setIsTicketsExpanded((prev) => !prev)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Ticket className="w-4 h-4 text-slate-600" />
                    <span className="font-bold text-sm text-[#0F172A]" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Create tickets
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 font-medium">
                      {config.step3Actions.tickets.enabled ? "Active" : "Not set up yet"}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isTicketsExpanded ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {isTicketsExpanded && (
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 space-y-3.5 bg-slate-50/50 pt-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-800">Auto-create support tickets</span>
                        <p className="text-[11px] text-gray-500">Automatically creates tickets in your helpdesk whenever urgent emails arrive.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.step3Actions.tickets.enabled}
                          onChange={(e) =>
                            updateConfig((prev) => ({
                              ...prev,
                              step3Actions: {
                                ...prev.step3Actions,
                                tickets: { ...prev.step3Actions.tickets, enabled: e.target.checked },
                              },
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1456f0]" />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 2: Forward emails (Matches Screenshot 3) */}
              <div className={isForwardingExpanded ? "border-t-2 border-t-[#1456f0]" : ""}>
                <button
                  type="button"
                  onClick={() => setIsForwardingExpanded((prev) => !prev)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <CornerUpRight className="w-4 h-4 text-slate-600" />
                    <span className="font-bold text-sm text-[#0F172A]" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Forward emails
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 font-medium">
                      {config.step3Actions.forwarding.rules.length > 0
                        ? `${config.step3Actions.forwarding.rules.length} rule(s)`
                        : "Not set up yet"}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isForwardingExpanded ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {isForwardingExpanded && (
                  <div className="p-5 sm:p-6 space-y-4">
                    {/* Inner Forwarding rules box */}
                    <div className="p-4 sm:p-5 rounded-2xl border border-gray-200/90 bg-white space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1456f0] flex items-center justify-center shrink-0">
                            <Send className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-[#0F172A]" style={{ fontFamily: "Outfit, sans-serif" }}>
                              Forwarding rules
                            </h4>
                            <p className="text-[11px] text-gray-500">
                              When an incoming email matches a rule's condition, it is automatically forwarded to the specified address.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAddForwardRuleModal(true)}
                          className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add rule</span>
                        </button>
                      </div>

                      {/* Rule List or Empty State */}
                      {config.step3Actions.forwarding.rules.length === 0 ? (
                        <div className="py-10 flex flex-col items-center justify-center text-center">
                          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-gray-100 flex items-center justify-center mb-2">
                            <Inbox className="w-6 h-6 text-gray-300" />
                          </div>
                          <p className="text-xs font-semibold text-gray-400">
                            No forwarding rules yet
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 pt-1">
                          {config.step3Actions.forwarding.rules.map((rule) => (
                            <div
                              key={rule.id}
                              className="p-3 rounded-xl border border-gray-100 bg-slate-50/60 flex items-center justify-between"
                            >
                              <div className="space-y-0.5">
                                <span className="font-bold text-xs text-slate-800">{rule.name}</span>
                                <p className="text-[11px] text-gray-500 font-mono">
                                  When {rule.conditionField} {rule.conditionOperator} "{rule.conditionValue}" &rarr; {rule.forwardTo}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteForwardingRule(rule.id)}
                                className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 3: Create CRM leads (Matches Screenshot 4) */}
              <div className={isCrmLeadsExpanded ? "border-t-2 border-t-[#1456f0]" : ""}>
                <button
                  type="button"
                  onClick={() => setIsCrmLeadsExpanded((prev) => !prev)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <UserPlus className="w-4 h-4 text-slate-600" />
                    <span className="font-bold text-sm text-[#0F172A]" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Create CRM leads
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-emerald-600 font-bold">
                      {config.step3Actions.crmLeads.enabled ? "On" : "Off"}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isCrmLeadsExpanded ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {isCrmLeadsExpanded && (
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 space-y-4">
                    {/* Header with Switch */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <div>
                        <h4 className="font-bold text-xs text-[#0F172A]" style={{ fontFamily: "Outfit, sans-serif" }}>
                          Create leads from emails
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          Automatically add new senders to your CRM when they qualify as leads.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.step3Actions.crmLeads.enabled}
                          onChange={(e) =>
                            updateConfig((prev) => ({
                              ...prev,
                              step3Actions: {
                                ...prev.step3Actions,
                                crmLeads: { ...prev.step3Actions.crmLeads, enabled: e.target.checked },
                              },
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1456f0]" />
                      </label>
                    </div>

                    {/* Guidelines textarea */}
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500">
                        Guides how the agent qualifies senders before creating a CRM lead.
                      </p>
                      <textarea
                        rows={4}
                        maxLength={2000}
                        value={crmLeadPrompt}
                        onChange={(e) => setCrmLeadPrompt(e.target.value)}
                        placeholder="E.g., Always qualify senders from .edu domains as leads. Never create leads for emails from competitors."
                        className="w-full p-3.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed placeholder:text-gray-400 resize-y"
                      />
                      <div className="flex items-center justify-between text-[11px] text-gray-400">
                        <span>{crmLeadPrompt.length} / 2000</span>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleSaveCrmLeadQualification}
                        className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              STEP 4: You stay in the loop (Who hears about it)
             ══════════════════════════════════════════════════════════════ */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <div className="flex items-center gap-2">
                <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">STEP 4</span>
                <span className="font-bold text-[#0F172A] text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
                  You stay in the loop
                </span>
              </div>
              <span className="text-gray-400 text-xs italic">Who hears about it</span>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden divide-y divide-gray-100">
              {/* Accordion 1: Notifications (Matches Screenshot 5) */}
              <div className={isNotificationsExpanded ? "border-t-2 border-t-[#1456f0]" : ""}>
                <button
                  type="button"
                  onClick={() => setIsNotificationsExpanded((prev) => !prev)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4 text-slate-600" />
                    <span className="font-bold text-sm text-[#0F172A]" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Notifications
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isNotificationsExpanded ? "rotate-180" : ""}`} />
                </button>

                {isNotificationsExpanded && (
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 space-y-4 divide-y divide-gray-100">
                    {/* Item 1: CRM lead email notifications */}
                    <div className="pt-2 flex items-center justify-between">
                      <div className="pr-4">
                        <h4 className="font-bold text-xs text-[#0F172A]" style={{ fontFamily: "Outfit, sans-serif" }}>
                          CRM lead email notifications
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          Receive an email notification when a lead sends you an email.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={config.step4Notifications.crmLeadEmail}
                          onChange={(e) =>
                            updateConfig((prev) => ({
                              ...prev,
                              step4Notifications: {
                                ...prev.step4Notifications,
                                crmLeadEmail: e.target.checked,
                              },
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1456f0]" />
                      </label>
                    </div>

                    {/* Item 2: Meeting request notifications */}
                    <div className="pt-4 flex items-center justify-between">
                      <div className="pr-4">
                        <h4 className="font-bold text-xs text-[#0F172A]" style={{ fontFamily: "Outfit, sans-serif" }}>
                          Meeting request notifications
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          Get a notification with an "Add to Google Calendar" link when a lead asks to schedule a meeting.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={config.step4Notifications.meetingRequest}
                          onChange={(e) =>
                            updateConfig((prev) => ({
                              ...prev,
                              step4Notifications: {
                                ...prev.step4Notifications,
                                meetingRequest: e.target.checked,
                              },
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1456f0]" />
                      </label>
                    </div>

                    {/* Item 3: Calendar connection reminders */}
                    <div className="pt-4 flex items-center justify-between">
                      <div className="pr-4">
                        <h4 className="font-bold text-xs text-[#0F172A]" style={{ fontFamily: "Outfit, sans-serif" }}>
                          Calendar connection reminders
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          Get reminded to connect your calendar when a lead asks about scheduling and your agent has to skip suggesting real times.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={config.step4Notifications.calendarReminder}
                          onChange={(e) =>
                            updateConfig((prev) => ({
                              ...prev,
                              step4Notifications: {
                                ...prev.step4Notifications,
                                calendarReminder: e.target.checked,
                              },
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1456f0]" />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 2: Team inboxes (Collapsed) */}
              <div>
                <button
                  type="button"
                  onClick={() => setIsTeamInboxesExpanded((prev) => !prev)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-slate-600" />
                    <span className="font-bold text-sm text-[#0F172A]" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Team inboxes
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 font-medium">
                      Connection status by member
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isTeamInboxesExpanded ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {isTeamInboxesExpanded && (
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 space-y-2 bg-slate-50/50 pt-2">
                    {config.step4Notifications.teamInboxes.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 bg-white"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#1456f0] font-bold text-xs flex items-center justify-center">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-800">{member.name}</span>
                            <span className="text-[11px] text-gray-400 ml-1.5">({member.email})</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              member.connected ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                          />
                          <span className="text-xs font-semibold text-slate-600">
                            {member.connected ? "Connected" : "Disconnected"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            Right Column: Connected Mailbox Card & Stats (Screenshot 1)
           ══════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-4">
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 space-y-4">
              {/* Account Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {/* Google "G" icon */}
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <div>
                    <h4 className="font-bold text-xs text-[#0F172A]" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Gmail
                    </h4>
                    <p className="text-[11px] text-gray-500 font-mono">
                      {config.mailbox.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Connected</span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 space-y-3.5">
                {/* 1. Email monitoring */}
                <div className="flex items-start justify-between">
                  <div className="pr-3">
                    <span className="font-bold text-xs text-[#0F172A]" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Email monitoring
                    </span>
                    <p className="text-[10px] text-gray-400 leading-snug">
                      Turning this off stops both features below
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={config.mailbox.monitoringEnabled}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          mailbox: { ...prev.mailbox, monitoringEnabled: e.target.checked },
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1456f0]" />
                  </label>
                </div>

                {/* 2. AI labelling */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                    AI labelling
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      disabled={!config.mailbox.monitoringEnabled}
                      checked={config.mailbox.monitoringEnabled && config.mailbox.aiLabellingEnabled}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          mailbox: { ...prev.mailbox, aiLabellingEnabled: e.target.checked },
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1456f0] peer-disabled:opacity-50" />
                  </label>
                </div>

                {/* 3. AI drafts */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                        <Pencil className="w-3.5 h-3.5 text-indigo-500" />
                        AI drafts
                      </span>
                      {config.mailbox.aiDraftsEnabled && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          On
                        </span>
                      )}
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        disabled={!config.mailbox.monitoringEnabled}
                        checked={config.mailbox.monitoringEnabled && config.mailbox.aiDraftsEnabled}
                        onChange={(e) =>
                          updateConfig((prev) => ({
                            ...prev,
                            mailbox: { ...prev.mailbox, aiDraftsEnabled: e.target.checked },
                          }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1456f0] peer-disabled:opacity-50" />
                    </label>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-snug">
                    Switch drafts off to keep automatic labelling without any drafts.
                  </p>
                </div>

                {/* Disconnect Link */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Are you sure you want to disconnect this mailbox?")) {
                        toast.success("Mailbox disconnected");
                      }
                    }}
                    className="text-xs text-rose-500 hover:text-rose-700 font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Link2 className="w-3.5 h-3.5 rotate-45" />
                    <span>Disconnect</span>
                  </button>
                </div>
              </div>

              {/* KPI Counters Tiles (Matches Screenshot 1) */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                <div className="p-3 bg-slate-50/80 rounded-xl border border-gray-100">
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                    Emails processed
                  </span>
                  <span className="block text-xl font-bold text-[#0F172A] mt-1 font-mono">
                    {config.mailbox.stats.emailsProcessed}
                  </span>
                </div>
                <div className="p-3 bg-slate-50/80 rounded-xl border border-gray-100">
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                    Drafts created
                  </span>
                  <span className="block text-xl font-bold text-[#0F172A] mt-1 font-mono">
                    {config.mailbox.stats.draftsCreated}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Forwarding Rule Modal */}
      <AddForwardingRuleModal
        isOpen={showAddForwardRuleModal}
        onClose={() => setShowAddForwardRuleModal(false)}
        onAddRule={handleAddForwardingRule}
      />
    </div>
  );
}
