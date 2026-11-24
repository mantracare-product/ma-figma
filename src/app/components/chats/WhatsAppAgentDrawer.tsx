/**
 * WhatsAppAgentDrawer.tsx
 * Path: src/app/components/chats/WhatsAppAgentDrawer.tsx
 *
 * Redesigned "New / Edit WhatsApp Agent Rule" drawer:
 * Mental model: "When a contact replies to X, if they say Y, reply like Z, then do these things."
 *
 * 5 Distinct Sections:
 * 1. Name (Agent name only; active switch, colour & description removed)
 * 2. When it runs (Trigger + Templates & Condition or New Message Prompt)
 * 3. Agent replies (Agent Prompt, KB, Send Mode)
 * 4. Hand off (Team Hand off settings)
 * 5. After replying (Advanced) (Contact creation, workflow routing, resolution: condition or inactivity only)
 *
 * Design Rules:
 * - Collapsible-section style with numbered title, chevron, checkmark when valid.
 * - One section open at a time; Section 1 open by default on create.
 * - NO subtext (no grey helper text under titles, toggles, options).
 * - NO capsules, pills, badges, or chips. Multi-select values shown as plain text.
 * - Explanations live strictly in info (i) icon tooltips.
 * - 8px spacing grid, 40px control height, 8px radius, 1px neutral borders.
 * - 16px padding between section header divider and first label, 16px bottom padding, 16px between fields, 6px between label and control.
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import DrawerShell from "../ui/DrawerShell";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  Trash2,
  Search,
  Sparkles,
  Plus,
} from "lucide-react";
import { Tooltip } from "../ui/Tooltip";
import { toast } from "sonner";
import {
  WhatsAppAgentRule,
  HandoffCondition,
  useWhatsappAgentStore,
} from "../../../lib/whatsappAgentStore";
import { getStoredTemplates } from "../../../lib/useWhatsappTemplates";
import { getStoredProcesses } from "../../../lib/useProcessStore";
import { getStoredTeamMembers } from "../../../lib/teamStore";
import { getContactCategories } from "../../../lib/contactCategoriesStore";
import DocumentSelectFieldsModal from "../ui/DocumentSelectFieldsModal";

export interface WhatsAppAgentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  rule: WhatsAppAgentRule | null;
  onSave: (rule: WhatsAppAgentRule) => void;
  onDelete?: (ruleId: string) => void;
}

/**
 * Clean Info Icon Tooltip with hover & keyboard focus
 */
function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip content={text} position="top">
      <span
        tabIndex={0}
        role="button"
        aria-label={text}
        className="inline-flex items-center text-slate-400 hover:text-slate-600 focus:outline-none focus:text-slate-600 cursor-help transition-colors ml-1.5"
      >
        <Info className="w-3.5 h-3.5" />
      </span>
    </Tooltip>
  );
}

interface DropdownPos {
  top: number;
  left: number;
  width: number;
  maxHeight?: number;
}

export default function WhatsAppAgentDrawer({
  isOpen,
  onClose,
  rule,
  onSave,
  onDelete,
}: WhatsAppAgentDrawerProps) {
  const isEditing = Boolean(rule);
  const { rules } = useWhatsappAgentStore();

  // Load available templates, workflows, team members, contact categories
  const allTemplates = useMemo(() => getStoredTemplates(), [isOpen]);
  const approvedTemplates = useMemo(
    () => allTemplates.filter((t) => t.approvalStatus === "approved"),
    [allTemplates]
  );
  const workflows = useMemo(() => getStoredProcesses(), [isOpen]);
  const teamMembers = useMemo(() => getStoredTeamMembers(), [isOpen]);
  const contactCategories = useMemo(() => getContactCategories(), [isOpen]);

  // Collapsible section state: 1, 2, 3, 4, or 5 (only one open at a time)
  const [openSection, setOpenSection] = useState<number | null>(1);

  // ── Section 1: Name & Description ──
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // ── Section 2: When it runs ──
  const [triggerType, setTriggerType] = useState<"template_reply" | "new_message">("template_reply");
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");
  const [conditionType, setConditionType] = useState<
    "any" | "button" | "intent" | "keywords" | "fallback"
  >("any");
  const [selectedButtonIds, setSelectedButtonIds] = useState<string[]>([]);
  const [showButtonDropdown, setShowButtonDropdown] = useState(false);
  const [intentText, setIntentText] = useState("");
  const [keywords, setKeywords] = useState("");
  const [keywordMatch, setKeywordMatch] = useState<"any" | "all">("any");
  const [triggerPrompt, setTriggerPrompt] = useState("");

  // ── Section 3: Agent replies ──
  const [agentPrompt, setAgentPrompt] = useState("");
  const [useKb, setUseKb] = useState(false);
  const [sendMode, setSendMode] = useState<"auto" | "draft">("auto");
  const agentPromptTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Variable Picker Modal State (using Document Template Variable Picker)
  const [variableModalOpen, setVariableModalOpen] = useState(false);
  const [activeVariableTarget, setActiveVariableTarget] = useState<
    | { type: "agentPrompt" }
    | { type: "handoffCondition"; conditionId: string }
    | null
  >(null);

  // ── Section 4: Hand off (Multi-condition support) ──
  const [handoffEnabled, setHandoffEnabled] = useState(true);
  const [handoffConditionsOpen, setHandoffConditionsOpen] = useState(true);
  const [handoffConditions, setHandoffConditions] = useState<HandoffCondition[]>([
    {
      id: "cond-1",
      title: "Condition 1",
      prompt: "Contact is upset, asks for a refund, or raises a medical emergency",
      assigneeId: teamMembers[0]?.id || 1,
      assigneeName: teamMembers[0]?.name || "Admin User",
      handoffMessage: "Thanks {{contact_name}}, I'm connecting you with our team who will reply shortly.",
    },
  ]);
  const handoffMessageRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // ── Section 5: After replying (Advanced) ──
  const [createContactEnabled, setCreateContactEnabled] = useState(false);
  const [contactCategoryId, setContactCategoryId] = useState("");
  const [workflowId, setWorkflowId] = useState("");
  const [resolveMode, setResolveMode] = useState<"condition" | "inactivity" | "transferred_to_team">("condition");
  const [resolveConditionPrompt, setResolveConditionPrompt] = useState("");
  const [resolveAfterHours, setResolveAfterHours] = useState<number>(24);
  const [isCustomHours, setIsCustomHours] = useState<boolean>(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Dropdown portal positioning & refs for section 2 templates & buttons
  const templateButtonRef = useRef<HTMLButtonElement>(null);
  const buttonButtonRef = useRef<HTMLButtonElement>(null);

  const [templatePos, setTemplatePos] = useState<DropdownPos | null>(null);
  const [buttonPos, setButtonPos] = useState<DropdownPos | null>(null);

  const calculateDropdownPos = (
    el: HTMLElement | null,
    options?: { minWidth?: number; estimatedHeight?: number; alignRight?: boolean }
  ): DropdownPos | null => {
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const estimatedHeight = options?.estimatedHeight || 240;
    const minWidth = options?.minWidth || rect.width;
    const width = Math.max(rect.width, minWidth);

    const availableBelow = window.innerHeight - rect.bottom - 16;
    const placeAbove = availableBelow < 180 && rect.top > estimatedHeight + 20;

    let left = rect.left;
    if (options?.alignRight) {
      left = rect.right - width;
      if (left < 10) left = 10;
    } else {
      if (left + width > window.innerWidth - 10) {
        left = Math.max(10, window.innerWidth - width - 10);
      }
    }

    const top = placeAbove
      ? Math.max(10, rect.top - Math.min(estimatedHeight, rect.top - 20) - 4)
      : rect.bottom + 4;
    const maxHeight = placeAbove
      ? Math.min(estimatedHeight, rect.top - 20)
      : Math.min(estimatedHeight, Math.max(150, availableBelow));

    return { top, left, width, maxHeight };
  };

  const closeAllDropdowns = () => {
    setShowTemplateDropdown(false);
    setShowButtonDropdown(false);
  };

  const toggleTemplateDropdown = () => {
    if (!showTemplateDropdown) {
      closeAllDropdowns();
      const pos = calculateDropdownPos(templateButtonRef.current, { minWidth: 320, estimatedHeight: 260 });
      setTemplatePos(pos);
      setShowTemplateDropdown(true);
    } else {
      setShowTemplateDropdown(false);
    }
  };

  const toggleButtonDropdown = () => {
    if (!showButtonDropdown) {
      closeAllDropdowns();
      const pos = calculateDropdownPos(buttonButtonRef.current, { minWidth: 320, estimatedHeight: 220 });
      setButtonPos(pos);
      setShowButtonDropdown(true);
    } else {
      setShowButtonDropdown(false);
    }
  };

  // Close all dropdowns on scroll or escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAllDropdowns();
    };

    window.addEventListener("scroll", closeAllDropdowns, true);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("scroll", closeAllDropdowns, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    closeAllDropdowns();
  }, [openSection, isOpen]);

  // Compute buttons available from currently selected templates
  const availableTemplateButtons = useMemo(() => {
    const selected = approvedTemplates.filter((t) => selectedTemplateIds.includes(t.id));
    const buttonLabels: string[] = [];
    selected.forEach((tpl) => {
      if (Array.isArray(tpl.buttons)) {
        tpl.buttons.forEach((btn) => {
          if (btn && btn.label && !buttonLabels.includes(btn.label)) {
            buttonLabels.push(btn.label);
          }
        });
      }
    });
    return buttonLabels;
  }, [approvedTemplates, selectedTemplateIds]);

  // Clean button selections if templates change
  useEffect(() => {
    if (availableTemplateButtons.length === 0 && conditionType === "button") {
      setSelectedButtonIds([]);
    } else {
      setSelectedButtonIds((prev) => prev.filter((b) => availableTemplateButtons.includes(b)));
    }
  }, [availableTemplateButtons, conditionType]);

  // Initialize or reset form when drawer opens or rule prop changes
  useEffect(() => {
    setErrors({});
    if (rule) {
      setName(rule.name || "");
      setDescription(rule.description || "");

      // Section 2: When it runs
      const tType = rule.trigger_type || "template_reply";
      setTriggerType(tType);
      const defaultTpls =
        rule.templates && rule.templates.length > 0
          ? rule.templates
          : rule.templateId && rule.templateId !== "all"
          ? [rule.templateId]
          : approvedTemplates[0]?.id
          ? [approvedTemplates[0].id]
          : [];
      setSelectedTemplateIds(defaultTpls);

      setConditionType(rule.condition_type || "any");
      setSelectedButtonIds(rule.button_ids || (rule.targetButtonLabel ? [rule.targetButtonLabel] : []));
      setIntentText(rule.intent_text || rule.classificationPrompt || "");
      setKeywords(rule.keywords || rule.keywordsFilter?.contains || "");
      setKeywordMatch(rule.keyword_match || "any");
      setTriggerPrompt(rule.trigger_prompt || "");

      // Section 3: Agent replies
      setAgentPrompt(
        rule.agent_prompt ||
          rule.instructions ||
          rule.responsePrompt ||
          rule.fixedResponseText ||
          ""
      );
      setUseKb(Boolean(rule.use_kb));
      setSendMode(rule.send_mode || (rule.responseType === "ai_draft_only" ? "draft" : "auto"));

      // Section 4: Hand off (Multi-condition support)
      setHandoffEnabled(rule.handoff_enabled !== undefined ? rule.handoff_enabled : true);
      if (Array.isArray(rule.handoff_conditions) && rule.handoff_conditions.length > 0) {
        setHandoffConditions(
          rule.handoff_conditions.map((c, i) => ({
            id: c.id || `cond-${i + 1}`,
            title: c.title || `Condition ${i + 1}`,
            prompt: c.prompt || "",
            assigneeId: c.assigneeId || teamMembers[0]?.id || "",
            assigneeName: c.assigneeName,
            handoffMessage:
              c.handoffMessage ||
              "Thanks {{contact_name}}, I'm connecting you with our team who will reply shortly.",
          }))
        );
      } else {
        setHandoffConditions([
          {
            id: "cond-1",
            title: "Condition 1",
            prompt:
              rule.handoff_condition_prompt ||
              "Contact is upset, asks for a refund, or raises a medical emergency",
            assigneeId: rule.handoff_assignee_id || teamMembers[0]?.id || "",
            assigneeName: rule.handoff_assignee_name,
            handoffMessage:
              rule.handoff_message ||
              "Thanks {{contact_name}}, I'm connecting you with our team who will reply shortly.",
          },
        ]);
      }
      setHandoffConditionsOpen(true);

      // Section 5: After replying (Advanced)
      setCreateContactEnabled(Boolean(rule.create_contact_enabled || (rule as any).crm_update));
      setContactCategoryId(
        rule.contact_category_id || contactCategories[0] || "Client"
      );
      setWorkflowId(rule.workflow_id || (rule as any).processId || "");

      // Resolve mode: "condition", "transferred_to_team", or "inactivity" (capped at 24 hrs)
      const rMode: "condition" | "inactivity" | "transferred_to_team" =
        rule.resolve_mode === "transferred_to_team"
          ? "transferred_to_team"
          : rule.resolve_mode === "inactivity"
          ? "inactivity"
          : "condition";
      setResolveMode(rMode);
      setResolveConditionPrompt(
        rule.resolve_condition_prompt ||
          ((rule.resolve_mode as any) === "customer_confirms"
            ? "Contact has confirmed or has no further questions"
            : "")
      );
      const hours = Math.min(24, Math.max(1, rule.resolve_after_hours || (rule as any).resolutionTimeoutHours || 24));
      setResolveAfterHours(hours);
      setIsCustomHours(![1, 2, 4, 6, 12, 24].includes(hours));

      setOpenSection(1);
    } else {
      // Create new agent rule defaults
      setName("");
      setDescription("");

      // Section 2: When it runs
      setTriggerType("template_reply");
      const firstTplId = approvedTemplates[0]?.id ? [approvedTemplates[0].id] : [];
      setSelectedTemplateIds(firstTplId);
      setConditionType("any");
      setSelectedButtonIds([]);
      setIntentText("");
      setKeywords("");
      setKeywordMatch("any");
      setTriggerPrompt("");

      // Section 3: Agent replies
      setAgentPrompt("");
      setUseKb(false);
      setSendMode("auto");

      // Section 4: Hand off
      setHandoffEnabled(true);
      setHandoffConditionsOpen(true);
      setHandoffConditions([
        {
          id: `cond-${Date.now()}`,
          title: "Condition 1",
          prompt: "Contact is upset, asks for a refund, or raises a medical emergency",
          assigneeId: teamMembers[0]?.id || "",
          assigneeName: teamMembers[0]?.name,
          handoffMessage:
            "Thanks {{contact_name}}, I'm connecting you with our team who will reply shortly.",
        },
      ]);

      // Section 5: After replying (Advanced)
      setCreateContactEnabled(false);
      setContactCategoryId(contactCategories[0] || "Client");
      setWorkflowId("");
      setResolveMode("condition");
      setResolveConditionPrompt("");
      setResolveAfterHours(24);
      setIsCustomHours(false);

      setOpenSection(1);
    }
  }, [rule, isOpen, approvedTemplates, teamMembers, contactCategories]);

  // Section validity calculation for checkmarks (Sections 1-4)
  const isSection1Valid = Boolean(name.trim());
  const isSection2Valid =
    triggerType === "new_message"
      ? Boolean(triggerPrompt.trim())
      : selectedTemplateIds.length > 0 &&
        (conditionType === "any" ||
          conditionType === "fallback" ||
          (conditionType === "button" && selectedButtonIds.length > 0) ||
          (conditionType === "intent" && intentText.trim().length > 0) ||
          (conditionType === "keywords" && keywords.trim().length > 0));
  const isSection3Valid = Boolean(agentPrompt.trim());
  const isSection4Valid =
    !handoffEnabled ||
    (handoffConditions.length > 0 &&
      handoffConditions.every(
        (c) => Boolean(c.prompt.trim()) && Boolean(c.assigneeId) && Boolean(c.handoffMessage.trim())
      ));

  // Toggle single section open/closed
  const handleToggleSection = (sec: number) => {
    setOpenSection((prev) => (prev === sec ? null : sec));
  };

  // Variable insertion from Document Template Select Fields Modal
  const handleInsertModalVariable = (token: string) => {
    if (!activeVariableTarget) return;

    if (activeVariableTarget.type === "agentPrompt") {
      const textarea = agentPromptTextareaRef.current;
      if (!textarea) {
        setAgentPrompt((prev) => (prev ? `${prev} ${token}` : token));
        return;
      }
      const start = textarea.selectionStart ?? agentPrompt.length;
      const end = textarea.selectionEnd ?? agentPrompt.length;
      const nextVal = agentPrompt.substring(0, start) + token + agentPrompt.substring(end);
      setAgentPrompt(nextVal);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + token.length, start + token.length);
      }, 10);
    } else if (activeVariableTarget.type === "handoffCondition") {
      const targetId = activeVariableTarget.conditionId;
      setHandoffConditions((prev) =>
        prev.map((c) => {
          if (c.id !== targetId) return c;
          const textarea = handoffMessageRefs.current[targetId];
          if (!textarea) {
            return {
              ...c,
              handoffMessage: c.handoffMessage ? `${c.handoffMessage} ${token}` : token,
            };
          }
          const start = textarea.selectionStart ?? c.handoffMessage.length;
          const end = textarea.selectionEnd ?? c.handoffMessage.length;
          const nextVal =
            c.handoffMessage.substring(0, start) + token + c.handoffMessage.substring(end);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + token.length, start + token.length);
          }, 10);
          return { ...c, handoffMessage: nextVal };
        })
      );
    }
  };

  // Save handler with strict validation
  const handleSave = () => {
    const nextErrors: Record<string, string> = {};

    // 1. Name validation
    if (!name.trim()) {
      nextErrors.name = "Agent name is required.";
      setOpenSection(1);
    }

    // 2. When it runs validation
    if (triggerType === "template_reply") {
      if (selectedTemplateIds.length === 0) {
        nextErrors.templates = "At least one approved template is required.";
        if (!nextErrors.name) setOpenSection(2);
      }
      if (conditionType === "button") {
        if (availableTemplateButtons.length === 0) {
          nextErrors.button = "Selected templates have no buttons. Choose another condition.";
          if (!nextErrors.name && !nextErrors.templates) setOpenSection(2);
        } else if (selectedButtonIds.length === 0) {
          nextErrors.button = "Please select at least one button.";
          if (!nextErrors.name && !nextErrors.templates) setOpenSection(2);
        }
      } else if (conditionType === "intent" && !intentText.trim()) {
        nextErrors.intent = "Intent description is required.";
        if (!nextErrors.name && !nextErrors.templates) setOpenSection(2);
      } else if (conditionType === "keywords" && !keywords.trim()) {
        nextErrors.keywords = "At least one keyword is required.";
        if (!nextErrors.name && !nextErrors.templates) setOpenSection(2);
      } else if (conditionType === "fallback") {
        const existingFallback = rules.find(
          (r) =>
            r.condition_type === "fallback" &&
            r.trigger_type === triggerType &&
            r.id !== rule?.id
        );
        if (existingFallback) {
          nextErrors.fallback = `A fallback agent ("${existingFallback.name}") already exists for this trigger. Only one fallback agent is allowed.`;
          if (!nextErrors.name && !nextErrors.templates) setOpenSection(2);
        }
      }
    } else {
      // New message trigger
      if (!triggerPrompt.trim()) {
        nextErrors.triggerPrompt = "When should this run is required.";
        if (!nextErrors.name) setOpenSection(2);
      }
    }

    // 3. Agent replies validation
    if (!agentPrompt.trim()) {
      nextErrors.agentPrompt = "Agent prompt is required.";
      if (
        !nextErrors.name &&
        !nextErrors.templates &&
        !nextErrors.button &&
        !nextErrors.intent &&
        !nextErrors.keywords &&
        !nextErrors.fallback &&
        !nextErrors.triggerPrompt
      ) {
        setOpenSection(3);
      }
    }

    // 4. Hand off validation
    if (handoffEnabled) {
      if (handoffConditions.length === 0) {
        nextErrors.handoff = "At least one handoff condition is required.";
        if (Object.keys(nextErrors).length === 1) setOpenSection(4);
      } else {
        handoffConditions.forEach((c, idx) => {
          if (!c.prompt.trim()) {
            nextErrors[`handoff_prompt_${c.id}`] = `Condition ${idx + 1}: Prompt is required.`;
          }
          if (!c.assigneeId) {
            nextErrors[`handoff_assignee_${c.id}`] = `Condition ${idx + 1}: Responsible user is required.`;
          }
          if (!c.handoffMessage.trim()) {
            nextErrors[`handoff_message_${c.id}`] = `Condition ${idx + 1}: Hand off message is required.`;
          }
        });
        if (Object.keys(nextErrors).some((k) => k.startsWith("handoff_"))) {
          setHandoffConditionsOpen(true);
          if (
            !nextErrors.name &&
            !nextErrors.templates &&
            !nextErrors.button &&
            !nextErrors.intent &&
            !nextErrors.keywords &&
            !nextErrors.fallback &&
            !nextErrors.triggerPrompt &&
            !nextErrors.agentPrompt
          ) {
            setOpenSection(4);
          }
        }
      }
    }

    // 5. Section 5 (Advanced) validation
    if (createContactEnabled && !contactCategoryId) {
      nextErrors.contactCategory = "Contact category is required.";
      if (Object.keys(nextErrors).length === 1) {
        setOpenSection(5);
      }
    }
    if (resolveMode === "condition" && !resolveConditionPrompt.trim()) {
      nextErrors.resolveCondition = "Resolve when condition is required.";
      if (Object.keys(nextErrors).length === 1) {
        setOpenSection(5);
      }
    }
    if (resolveMode === "inactivity") {
      if (!resolveAfterHours || resolveAfterHours < 1 || resolveAfterHours > 24) {
        nextErrors.resolveInactivity = "Inactivity period must be between 1 and 24 hours.";
        if (Object.keys(nextErrors).length === 1) {
          setOpenSection(5);
        }
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast.error("Please fill in the required fields.");
      return;
    }

    // Build template names
    const templateNames = selectedTemplateIds.map((tid) => {
      const match = approvedTemplates.find((t) => t.id === tid);
      return match ? match.name : tid;
    });

    const primaryCondition = handoffConditions[0];
    const primaryAssignee = teamMembers.find(
      (m) => String(m.id) === String(primaryCondition?.assigneeId)
    );
    const selectedWorkflow = workflows.find((w) => w.id === workflowId);
    const workflow_name = selectedWorkflow ? (selectedWorkflow as any).title || selectedWorkflow.name : undefined;

    const isActive = rule ? (rule.is_active !== undefined ? rule.is_active : rule.enabled) : true;

    const savedRule: WhatsAppAgentRule = {
      id: rule?.id || `wa-rule-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || undefined,
      is_active: isActive,
      enabled: isActive,
      priority: rule?.priority || rules.length + 1,

      trigger_type: triggerType,
      templates: triggerType === "template_reply" ? selectedTemplateIds : [],
      templateNames: triggerType === "template_reply" ? templateNames : [],
      trigger_prompt: triggerType === "new_message" ? triggerPrompt.trim() : undefined,

      condition_type: triggerType === "template_reply" ? conditionType : undefined,
      button_ids: triggerType === "template_reply" && conditionType === "button" ? selectedButtonIds : undefined,
      intent_text: triggerType === "template_reply" && conditionType === "intent" ? intentText.trim() : undefined,
      keywords: triggerType === "template_reply" && conditionType === "keywords" ? keywords.trim() : undefined,
      keyword_match: triggerType === "template_reply" && conditionType === "keywords" ? keywordMatch : undefined,

      agent_prompt: agentPrompt.trim(),
      use_kb: useKb,
      send_mode: sendMode,

      handoff_enabled: handoffEnabled,
      handoff_conditions: handoffEnabled
        ? handoffConditions.map((c, i) => {
            const member = teamMembers.find((m) => String(m.id) === String(c.assigneeId));
            return {
              ...c,
              title: c.title || `Condition ${i + 1}`,
              assigneeName: member?.name || c.assigneeName || "Admin User",
            };
          })
        : undefined,
      handoff_condition_prompt: handoffEnabled ? primaryCondition?.prompt.trim() : undefined,
      handoff_assignee_id: handoffEnabled ? primaryCondition?.assigneeId : undefined,
      handoff_assignee_name: handoffEnabled ? (primaryAssignee?.name || primaryCondition?.assigneeName) : undefined,
      handoff_message: handoffEnabled ? primaryCondition?.handoffMessage.trim() : undefined,

      create_contact_enabled: createContactEnabled,
      contact_category_id: createContactEnabled ? contactCategoryId : undefined,
      contact_category_name: createContactEnabled ? contactCategoryId : undefined,
      workflow_id: workflowId || undefined,
      workflow_name,
      resolve_mode: resolveMode,
      resolve_condition_prompt: resolveMode === "condition" ? resolveConditionPrompt.trim() : undefined,
      resolve_after_hours: resolveMode === "inactivity" ? Math.min(24, Math.max(1, resolveAfterHours)) : undefined,

      direction: triggerType === "template_reply" ? "both" : "inbound",
      createdAt: rule?.createdAt || new Date().toISOString().substring(0, 10),
      updatedAt: new Date().toISOString().substring(0, 10),
    };

    onSave(savedRule);
    toast.success(`Agent rule "${savedRule.name}" saved ✓`);
    onClose();
  };

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit WhatsApp Agent Rule" : "New WhatsApp Agent Rule"}
      width="max-w-3xl"
      bodyClassName="pt-3.5 px-6 pb-6 overflow-y-auto overflow-x-hidden"
      footer={
        <div className="flex items-center justify-between w-full" style={{ fontFamily: "Outfit, sans-serif" }}>
          <div>
            {isEditing && onDelete && rule && (
              <button
                type="button"
                onClick={() => {
                  onDelete(rule.id);
                  toast.success(`Agent rule "${rule.name}" deleted`);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Agent Rule</span>
              </button>
            )}
          </div>
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
              <span>{isEditing ? "Save Changes" : "Create Agent Rule"}</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-3.5" style={{ fontFamily: "Outfit, sans-serif" }}>
        {/* ── SECTION 1: NAME & DESCRIPTION ── */}
        <div className="border border-slate-200 rounded-lg bg-white">
          <button
            type="button"
            onClick={() => handleToggleSection(1)}
            className={`w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer ${
              openSection === 1 ? "rounded-t-lg" : "rounded-lg"
            }`}
          >
            <span className="text-sm font-bold text-slate-900">1. Name</span>
            <div className="flex items-center gap-2">
              {isSection1Valid && <Check className="w-4 h-4 text-emerald-600" />}
              {openSection === 1 ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {openSection === 1 && (
            <div className="px-4 py-4 border-t border-slate-100 space-y-4">
              <div>
                <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                  <span>Agent name</span>
                  <span className="text-red-500 ml-0.5">*</span>
                  <InfoTip text="Shown in the agent list and in conversation history." />
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  placeholder="e.g. Appointment confirmation"
                  className={`w-full h-10 px-3 py-2 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors ${
                    errors.name ? "border-red-400 bg-red-50/20" : "border-slate-200 text-slate-900"
                  }`}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                  <span>Description</span>
                  <InfoTip text="Optional description describing the role and purpose of this agent rule." />
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Automatically handles appointment attendance and confirms clinic visit details"
                  className="w-full p-2.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* ── SECTION 2: WHEN IT RUNS ── */}
        <div className="border border-slate-200 rounded-lg bg-white">
          <button
            type="button"
            onClick={() => handleToggleSection(2)}
            className={`w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer ${
              openSection === 2 ? "rounded-t-lg" : "rounded-lg"
            }`}
          >
            <span className="text-sm font-bold text-slate-900">2. When it runs</span>
            <div className="flex items-center gap-2">
              {isSection2Valid && <Check className="w-4 h-4 text-emerald-600" />}
              {openSection === 2 ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {openSection === 2 && (
            <div className="px-4 py-4 border-t border-slate-100 space-y-4">
              {/* Trigger */}
              <div>
                <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                  <span>Trigger</span>
                  <span className="text-red-500 ml-0.5">*</span>
                  <InfoTip text="Choose what starts this agent." />
                </label>
                <select
                  value={triggerType}
                  onChange={(e) => {
                    const next = e.target.value as "template_reply" | "new_message";
                    setTriggerType(next);
                    if (errors.templates) setErrors((prev) => ({ ...prev, templates: "" }));
                    if (errors.triggerPrompt) setErrors((prev) => ({ ...prev, triggerPrompt: "" }));
                  }}
                  className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition-colors"
                >
                  <option value="template_reply">Contact replies to a template</option>
                  <option value="new_message">Contact sends a new message</option>
                </select>
              </div>

              {/* ── IF TRIGGER = TEMPLATE REPLY ── */}
              {triggerType === "template_reply" && (
                <>
                  {/* Templates (Multi-select dropdown with checkboxes) */}
                  <div>
                    <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                      <span>Templates</span>
                      <span className="text-red-500 ml-0.5">*</span>
                      <InfoTip text="The agent runs when a contact replies to any selected template." />
                    </label>

                    {/* Multi-select closed trigger button */}
                    <button
                      ref={templateButtonRef}
                      type="button"
                      onClick={toggleTemplateDropdown}
                      className={`w-full h-10 px-3 py-2 rounded-lg border text-sm text-left flex items-center justify-between bg-white cursor-pointer transition-colors ${
                        errors.templates
                          ? "border-red-400 bg-red-50/20"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <span className="truncate">
                        {selectedTemplateIds.length === 0 ? (
                          <span className="text-slate-400">Select templates...</span>
                        ) : selectedTemplateIds.length === 1 ? (
                          <span className="text-slate-900 font-medium">
                            {approvedTemplates.find((t) => t.id === selectedTemplateIds[0])?.name ||
                              "1 template selected"}
                          </span>
                        ) : (
                          <span className="text-slate-900 font-medium">
                            {selectedTemplateIds.length} templates selected
                          </span>
                        )}
                      </span>
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                    </button>

                    {errors.templates && (
                      <p className="text-xs text-red-500 mt-1">{errors.templates}</p>
                    )}

                    {/* Searchable multi-select dropdown popover portaled to body */}
                    {showTemplateDropdown && templatePos && createPortal(
                      <>
                        <div
                          className="fixed inset-0 cursor-default"
                          style={{ zIndex: 9998 }}
                          onClick={() => setShowTemplateDropdown(false)}
                        />
                        <div
                          className="fixed bg-white border border-slate-200 rounded-lg shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
                          style={{
                            top: templatePos.top,
                            left: templatePos.left,
                            width: templatePos.width,
                            maxHeight: templatePos.maxHeight || 260,
                            zIndex: 9999,
                            fontFamily: "Outfit, sans-serif",
                          }}
                        >
                          {/* Search box */}
                          <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50/70 shrink-0">
                            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <input
                              type="text"
                              value={templateSearchQuery}
                              onChange={(e) => setTemplateSearchQuery(e.target.value)}
                              placeholder="Search approved templates..."
                              className="w-full text-xs bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400"
                              autoFocus
                            />
                          </div>

                          {/* Options list */}
                          <div className="overflow-y-auto p-1 divide-y divide-slate-50 flex-1">
                            {approvedTemplates
                              .filter((t) =>
                                t.name.toLowerCase().includes(templateSearchQuery.toLowerCase())
                              )
                              .map((tpl) => {
                                const isSelected = selectedTemplateIds.includes(tpl.id);
                                return (
                                  <label
                                    key={tpl.id}
                                    className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-md cursor-pointer transition-colors"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => {
                                          if (isSelected) {
                                            setSelectedTemplateIds((prev) =>
                                              prev.filter((id) => id !== tpl.id)
                                            );
                                          } else {
                                            setSelectedTemplateIds((prev) => [...prev, tpl.id]);
                                            if (errors.templates) {
                                              setErrors((prev) => ({ ...prev, templates: "" }));
                                            }
                                          }
                                        }}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                                      />
                                      <span className="text-xs font-medium text-slate-900 truncate">
                                        {tpl.name}
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-slate-400 shrink-0">
                                      {tpl.category || "Utility"}
                                    </span>
                                  </label>
                                );
                              })}

                            {approvedTemplates.length === 0 && (
                              <div className="p-3 text-center text-xs text-slate-400">
                                No approved templates found.
                              </div>
                            )}
                          </div>
                        </div>
                      </>,
                      document.body
                    )}
                  </div>

                  {/* Condition (dropdown) */}
                  <div>
                    <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                      <span>Condition</span>
                      <InfoTip text="Decide which replies this agent handles. Button clicks are instant and need no AI." />
                    </label>
                    <select
                      value={conditionType}
                      onChange={(e) => {
                        const next = e.target.value as any;
                        setConditionType(next);
                        setErrors((prev) => ({
                          ...prev,
                          button: "",
                          intent: "",
                          keywords: "",
                          fallback: "",
                        }));
                      }}
                      className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition-colors"
                    >
                      <option value="any">Any reply</option>
                      <option
                        value="button"
                        disabled={availableTemplateButtons.length === 0}
                      >
                        Clicks a button
                      </option>
                      <option value="intent">Matches intent (AI)</option>
                      <option value="keywords">Contains keywords</option>
                      <option value="fallback">Nothing else matched (fallback)</option>
                    </select>
                  </div>

                  {/* Conditional sub-fields based on conditionType */}

                  {/* Clicks a button */}
                  {conditionType === "button" && (
                    <div>
                      <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                        <span>Buttons</span>
                        <span className="text-red-500 ml-0.5">*</span>
                        <InfoTip
                          text={
                            availableTemplateButtons.length === 0
                              ? "Selected templates have no buttons."
                              : "Which button click triggers this agent."
                          }
                        />
                      </label>

                      {availableTemplateButtons.length === 0 ? (
                        <input
                          type="text"
                          disabled
                          value="Selected templates have no buttons"
                          className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                        />
                      ) : (
                        <>
                          <button
                            ref={buttonButtonRef}
                            type="button"
                            onClick={toggleButtonDropdown}
                            className={`w-full h-10 px-3 py-2 rounded-lg border text-sm text-left flex items-center justify-between bg-white cursor-pointer transition-colors ${
                              errors.button ? "border-red-400 bg-red-50/20" : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <span className="truncate">
                              {selectedButtonIds.length === 0 ? (
                                <span className="text-slate-400">Select buttons...</span>
                              ) : selectedButtonIds.length === 1 ? (
                                <span className="text-slate-900 font-medium">{selectedButtonIds[0]}</span>
                              ) : (
                                <span className="text-slate-900 font-medium">
                                  {selectedButtonIds.length} buttons selected
                                </span>
                              )}
                            </span>
                            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                          </button>

                          {showButtonDropdown && buttonPos && createPortal(
                            <>
                              <div
                                className="fixed inset-0 cursor-default"
                                style={{ zIndex: 9998 }}
                                onClick={() => setShowButtonDropdown(false)}
                              />
                              <div
                                ref={buttonButtonRef as any}
                                className="fixed bg-white border border-slate-200 rounded-lg shadow-2xl p-1 overflow-y-auto space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
                                style={{
                                  top: buttonPos.top,
                                  left: buttonPos.left,
                                  width: buttonPos.width,
                                  maxHeight: buttonPos.maxHeight || 220,
                                  zIndex: 9999,
                                  fontFamily: "Outfit, sans-serif",
                                }}
                              >
                                {availableTemplateButtons.map((btnLabel) => {
                                  const isChecked = selectedButtonIds.includes(btnLabel);
                                  return (
                                    <label
                                      key={btnLabel}
                                      className="flex items-center gap-2.5 p-2 hover:bg-slate-50 rounded-md cursor-pointer transition-colors"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                          if (isChecked) {
                                            setSelectedButtonIds((prev) =>
                                              prev.filter((b) => b !== btnLabel)
                                            );
                                          } else {
                                            setSelectedButtonIds((prev) => [...prev, btnLabel]);
                                            if (errors.button) {
                                              setErrors((prev) => ({ ...prev, button: "" }));
                                            }
                                          }
                                        }}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                                      />
                                      <span className="text-xs font-medium text-slate-900 truncate">
                                        {btnLabel}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </>,
                            document.body
                          )}
                        </>
                      )}
                      {errors.button && <p className="text-xs text-red-500 mt-1">{errors.button}</p>}
                    </div>
                  )}

                  {/* Matches intent (AI) */}
                  {conditionType === "intent" && (
                    <div>
                      <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                        <span>Intent</span>
                        <span className="text-red-500 ml-0.5">*</span>
                        <InfoTip text="Describe in plain language what the contact wants. Keep it to one intent per agent." />
                      </label>
                      <textarea
                        rows={3}
                        value={intentText}
                        onChange={(e) => {
                          setIntentText(e.target.value);
                          if (errors.intent) setErrors((prev) => ({ ...prev, intent: "" }));
                        }}
                        placeholder="e.g. Contact wants to reschedule"
                        className={`w-full p-3 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none ${
                          errors.intent ? "border-red-400 bg-red-50/20" : "border-slate-200 text-slate-900"
                        }`}
                      />
                      {errors.intent && <p className="text-xs text-red-500 mt-1">{errors.intent}</p>}
                    </div>
                  )}

                  {/* Contains keywords */}
                  {conditionType === "keywords" && (
                    <div className="space-y-4">
                      <div>
                        <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                          <span>Keywords</span>
                          <span className="text-red-500 ml-0.5">*</span>
                          <InfoTip text="Not case sensitive." />
                        </label>
                        <textarea
                          rows={2}
                          value={keywords}
                          onChange={(e) => {
                            setKeywords(e.target.value);
                            if (errors.keywords) setErrors((prev) => ({ ...prev, keywords: "" }));
                          }}
                          placeholder="e.g. reschedule, change date, move appointment"
                          className={`w-full p-3 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none ${
                            errors.keywords ? "border-red-400 bg-red-50/20" : "border-slate-200 text-slate-900"
                          }`}
                        />
                        {errors.keywords && (
                          <p className="text-xs text-red-500 mt-1">{errors.keywords}</p>
                        )}
                      </div>

                      <div>
                        <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                          <span>Match</span>
                          <InfoTip text="Choose whether all keywords must match or any single keyword." />
                        </label>
                        <select
                          value={keywordMatch}
                          onChange={(e) => setKeywordMatch(e.target.value as "any" | "all")}
                          className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition-colors"
                        >
                          <option value="any">Any keyword</option>
                          <option value="all">All keywords</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Fallback */}
                  {conditionType === "fallback" && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-start gap-2">
                      <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>
                        Runs only when no other agent on this trigger matches. Only one fallback agent is allowed per trigger.
                      </span>
                    </div>
                  )}
                  {errors.fallback && <p className="text-xs text-red-500 mt-1">{errors.fallback}</p>}
                </>
              )}

              {/* ── IF TRIGGER = NEW MESSAGE ── */}
              {triggerType === "new_message" && (
                <div>
                  <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                    <span>When should this run</span>
                    <span className="text-red-500 ml-0.5">*</span>
                    <InfoTip text="Describe in plain language what the contact's message should be about for this agent to run. The agent is chosen by AI based on this description." />
                  </label>
                  <textarea
                    rows={4}
                    value={triggerPrompt}
                    onChange={(e) => {
                      setTriggerPrompt(e.target.value);
                      if (errors.triggerPrompt) setErrors((prev) => ({ ...prev, triggerPrompt: "" }));
                    }}
                    placeholder="e.g. Contact asks about pricing, insurance or wants to book an appointment"
                    className={`w-full p-3 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none ${
                      errors.triggerPrompt ? "border-red-400 bg-red-50/20" : "border-slate-200 text-slate-900"
                    }`}
                  />
                  {errors.triggerPrompt && (
                    <p className="text-xs text-red-500 mt-1">{errors.triggerPrompt}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── SECTION 3: AGENT REPLIES ── */}
        <div className="border border-slate-200 rounded-lg bg-white">
          <button
            type="button"
            onClick={() => handleToggleSection(3)}
            className={`w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer ${
              openSection === 3 ? "rounded-t-lg" : "rounded-lg"
            }`}
          >
            <span className="text-sm font-bold text-slate-900">3. Agent replies</span>
            <div className="flex items-center gap-2">
              {isSection3Valid && <Check className="w-4 h-4 text-emerald-600" />}
              {openSection === 3 ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {openSection === 3 && (
            <div className="px-4 py-4 border-t border-slate-100 space-y-4">
              {/* Agent prompt (textarea, at least 8 rows) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="flex items-center text-[13px] font-medium text-slate-700">
                    <span>Agent prompt</span>
                    <span className="text-red-500 ml-0.5">*</span>
                    <InfoTip text="Explain how the conversation should flow: what to say first, what to ask, how to respond to different answers, and when the conversation is done. The agent follows this for the whole conversation." />
                  </label>

                  {/* Insert variable button (opens Document Template Select Fields Modal) */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveVariableTarget({ type: "agentPrompt" });
                      setVariableModalOpen(true);
                    }}
                    className="h-7 px-2.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title="Select and insert field placeholder variables"
                  >
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    <span>Insert variable</span>
                  </button>
                </div>

                <textarea
                  ref={agentPromptTextareaRef}
                  rows={8}
                  value={agentPrompt}
                  onChange={(e) => {
                    setAgentPrompt(e.target.value);
                    if (errors.agentPrompt) setErrors((prev) => ({ ...prev, agentPrompt: "" }));
                  }}
                  placeholder="Explain how the conversation should flow: what to say first, what to ask, how to respond to different answers, and when the conversation is done..."
                  className={`w-full p-3 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-y ${
                    errors.agentPrompt ? "border-red-400 bg-red-50/20" : "border-slate-200 text-slate-900"
                  }`}
                />
                {errors.agentPrompt && (
                  <p className="text-xs text-red-500 mt-1">{errors.agentPrompt}</p>
                )}
              </div>

              {/* Use knowledge base switch */}
              <div className="flex items-center justify-between h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <label className="flex items-center text-[13px] font-medium text-slate-700 cursor-pointer">
                  <span>Use knowledge base</span>
                  <InfoTip text="Lets the agent answer using your knowledge base, for example pricing or insurance questions." />
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useKb}
                    onChange={(e) => setUseKb(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Send automatically toggle switch */}
              <div className="flex items-center justify-between h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <label className="flex items-center text-[13px] font-medium text-slate-700 cursor-pointer">
                  <span>Send automatically</span>
                  <InfoTip text="When enabled, the agent sends responses automatically. When disabled, replies are saved as drafts for staff approval." />
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendMode === "auto"}
                    onChange={(e) => setSendMode(e.target.checked ? "auto" : "draft")}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* ── SECTION 4: HAND OFF (Multi-condition support) ── */}
        <div className="border border-slate-200 rounded-lg bg-white">
          <button
            type="button"
            onClick={() => handleToggleSection(4)}
            className={`w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer ${
              openSection === 4 ? "rounded-t-lg" : "rounded-lg"
            }`}
          >
            <span className="text-sm font-bold text-slate-900">4. Hand off</span>
            <div className="flex items-center gap-2">
              {isSection4Valid && <Check className="w-4 h-4 text-emerald-600" />}
              {openSection === 4 ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {openSection === 4 && (
            <div className="px-4 py-4 border-t border-slate-100 space-y-4">
              {/* Hand off to a team member switch */}
              <div className="flex items-center justify-between h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <label className="flex items-center text-[13px] font-medium text-slate-700 cursor-pointer">
                  <span>Hand off to a team member</span>
                  <InfoTip text="When enabled, conditions below determine when the agent stops replying and assigns the conversation to a team member." />
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={handoffEnabled}
                    onChange={(e) => {
                      setHandoffEnabled(e.target.checked);
                      if (!e.target.checked) {
                        setErrors((prev) => {
                          const cleaned = { ...prev };
                          Object.keys(cleaned).forEach((k) => {
                            if (k.startsWith("handoff_")) delete cleaned[k];
                          });
                          return cleaned;
                        });
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Multi-condition Container when handoff is enabled */}
              {handoffEnabled && (
                <div className="space-y-3.5 pt-1">
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/40">
                    {/* Collapsible header: Condition open / close and + Add condition */}
                    <div className="flex items-center justify-between p-3 bg-slate-50/90 border-b border-slate-200">
                      <button
                        type="button"
                        onClick={() => setHandoffConditionsOpen(!handoffConditionsOpen)}
                        className="flex items-center gap-2 text-xs font-bold text-slate-800 hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        <ChevronDown
                          className={`w-4 h-4 text-slate-500 transition-transform ${
                            handoffConditionsOpen ? "rotate-180" : ""
                          }`}
                        />
                        <span>Handoff Conditions ({handoffConditions.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newId = `cond-${Date.now()}`;
                          setHandoffConditions((prev) => [
                            ...prev,
                            {
                              id: newId,
                              title: `Condition ${prev.length + 1}`,
                              prompt: "",
                              assigneeId: teamMembers[0]?.id || "",
                              assigneeName: teamMembers[0]?.name,
                              handoffMessage:
                                "Thanks {{contact_name}}, I'm connecting you with our team who will reply shortly.",
                            },
                          ]);
                          setHandoffConditionsOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 bg-white border border-blue-200 rounded-md transition-colors cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add condition</span>
                      </button>
                    </div>

                    {/* Conditions list */}
                    {handoffConditionsOpen && (
                      <div className="p-3 space-y-3 bg-white">
                        {handoffConditions.map((cond, index) => {
                          const promptErr = errors[`handoff_prompt_${cond.id}`];
                          const assigneeErr = errors[`handoff_assignee_${cond.id}`];
                          const messageErr = errors[`handoff_message_${cond.id}`];

                          return (
                            <div
                              key={cond.id}
                              className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/30 space-y-3 relative transition-all"
                            >
                              {/* Condition Top Bar */}
                              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <span className="text-xs font-bold text-slate-800">
                                  Condition {index + 1}
                                </span>
                                {handoffConditions.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setHandoffConditions((prev) =>
                                        prev.filter((c) => c.id !== cond.id)
                                      );
                                    }}
                                    className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="Remove this condition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              {/* 1. Condition Prompt: Hand off when */}
                              <div>
                                <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                                  <span>Hand off when</span>
                                  <span className="text-red-500 ml-0.5">*</span>
                                  <InfoTip text="Describe in plain language when the agent should trigger hand off for this condition." />
                                </label>
                                <textarea
                                  rows={2}
                                  value={cond.prompt}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setHandoffConditions((prev) =>
                                      prev.map((c) =>
                                        c.id === cond.id ? { ...c, prompt: val } : c
                                      )
                                    );
                                    if (promptErr) {
                                      setErrors((prev) => ({
                                        ...prev,
                                        [`handoff_prompt_${cond.id}`]: "",
                                      }));
                                    }
                                  }}
                                  placeholder="e.g. Contact is upset, asks for a refund, or raises a medical emergency"
                                  className={`w-full p-2.5 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none ${
                                    promptErr
                                      ? "border-red-400 bg-red-50/20"
                                      : "border-slate-200 text-slate-900"
                                  }`}
                                />
                                {promptErr && (
                                  <p className="text-xs text-red-500 mt-1">{promptErr}</p>
                                )}
                              </div>

                              {/* 2. Assign responsible user */}
                              <div>
                                <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                                  <span>Assign responsible</span>
                                  <span className="text-red-500 ml-0.5">*</span>
                                  <InfoTip text="The specific team member assigned when this condition triggers." />
                                </label>
                                <select
                                  value={cond.assigneeId}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const member = teamMembers.find(
                                      (m) => String(m.id) === String(val)
                                    );
                                    setHandoffConditions((prev) =>
                                      prev.map((c) =>
                                        c.id === cond.id
                                          ? {
                                              ...c,
                                              assigneeId: val,
                                              assigneeName: member?.name,
                                            }
                                          : c
                                      )
                                    );
                                    if (assigneeErr) {
                                      setErrors((prev) => ({
                                        ...prev,
                                        [`handoff_assignee_${cond.id}`]: "",
                                      }));
                                    }
                                  }}
                                  className={`w-full h-10 px-3 py-2 text-sm rounded-lg border bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition-colors ${
                                    assigneeErr
                                      ? "border-red-400 bg-red-50/20"
                                      : "border-slate-200"
                                  }`}
                                >
                                  <option value="">Select team member...</option>
                                  {teamMembers.map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.name} {m.role ? `(${m.role})` : ""}
                                    </option>
                                  ))}
                                </select>
                                {assigneeErr && (
                                  <p className="text-xs text-red-500 mt-1">{assigneeErr}</p>
                                )}
                              </div>

                              {/* 3. Dependent Handoff Message */}
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <label className="flex items-center text-[13px] font-medium text-slate-700">
                                    <span>Hand off message</span>
                                    <span className="text-red-500 ml-0.5">*</span>
                                    <InfoTip text="Sent to the contact when this specific condition triggers handoff." />
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveVariableTarget({
                                        type: "handoffCondition",
                                        conditionId: cond.id,
                                      });
                                      setVariableModalOpen(true);
                                    }}
                                    className="h-7 px-2.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                    title="Adds a placeholder filled in with real data when the message is sent."
                                  >
                                    <Sparkles className="w-3 h-3 text-blue-600" />
                                    <span>Insert variable</span>
                                  </button>
                                </div>
                                <textarea
                                  ref={(el) => {
                                    handoffMessageRefs.current[cond.id] = el;
                                  }}
                                  rows={2}
                                  value={cond.handoffMessage}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setHandoffConditions((prev) =>
                                      prev.map((c) =>
                                        c.id === cond.id ? { ...c, handoffMessage: val } : c
                                      )
                                    );
                                    if (messageErr) {
                                      setErrors((prev) => ({
                                        ...prev,
                                        [`handoff_message_${cond.id}`]: "",
                                      }));
                                    }
                                  }}
                                  placeholder="e.g. Thanks {{contact_name}}, I'm connecting you with our specialist who will reply shortly."
                                  className={`w-full p-2.5 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none ${
                                    messageErr
                                      ? "border-red-400 bg-red-50/20"
                                      : "border-slate-200 text-slate-900"
                                  }`}
                                />
                                {messageErr && (
                                  <p className="text-xs text-red-500 mt-1">{messageErr}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── SECTION 5: AFTER REPLYING (ADVANCED) ── */}
        <div className="border border-slate-200 rounded-lg bg-white">
          <button
            type="button"
            onClick={() => handleToggleSection(5)}
            className={`w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer ${
              openSection === 5 ? "rounded-t-lg" : "rounded-lg"
            }`}
          >
            <span className="text-sm font-bold text-slate-900">5. After replying (Advanced)</span>
            {openSection === 5 ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {openSection === 5 && (
            <div className="px-4 py-4 border-t border-slate-100 space-y-4">
              {/* Create a new contact switch */}
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <label className="flex items-center text-[13px] font-medium text-slate-700 cursor-pointer">
                    <span>Create a new contact</span>
                    <InfoTip text="Creates a contact from this phone number if no existing contact matches. Does nothing if the contact already exists." />
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createContactEnabled}
                      onChange={(e) => {
                        setCreateContactEnabled(e.target.checked);
                        if (!e.target.checked && errors.contactCategory) {
                          setErrors((prev) => ({ ...prev, contactCategory: "" }));
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {createContactEnabled && (
                  <div>
                    <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                      <span>Contact category</span>
                      <span className="text-red-500 ml-0.5">*</span>
                      <InfoTip text="Category assigned to newly created contacts." />
                    </label>
                    <select
                      value={contactCategoryId}
                      onChange={(e) => {
                        setContactCategoryId(e.target.value);
                        if (errors.contactCategory) {
                          setErrors((prev) => ({ ...prev, contactCategory: "" }));
                        }
                      }}
                      className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition-colors"
                    >
                      {contactCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    {errors.contactCategory && (
                      <p className="text-xs text-red-500 mt-1">{errors.contactCategory}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Assign to process workflow */}
              <div>
                <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                  <span>Assign to process workflow</span>
                  <InfoTip text="Optionally route the conversation to an active workflow." />
                </label>
                <select
                  value={workflowId}
                  onChange={(e) => setWorkflowId(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition-colors"
                >
                  <option value="">None / Do not assign</option>
                  {workflows.map((proc) => (
                    <option key={proc.id} value={proc.id}>
                      {proc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Resolve conversation */}
              <div>
                <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                  <span>Resolve conversation</span>
                  <InfoTip text="When the conversation is marked resolved." />
                </label>
                <select
                  value={resolveMode}
                  onChange={(e) => {
                    const next = e.target.value as "condition" | "inactivity" | "transferred_to_team";
                    setResolveMode(next);
                    if (errors.resolveCondition) {
                      setErrors((prev) => ({ ...prev, resolveCondition: "" }));
                    }
                  }}
                  className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition-colors"
                >
                  <option value="condition">When my condition is met</option>
                  <option value="transferred_to_team">If transferred to team</option>
                  <option value="inactivity">After inactivity</option>
                </select>
              </div>

              {/* If transferred to team info box */}
              {resolveMode === "transferred_to_team" && (
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    The conversation will be automatically marked as resolved as soon as it is handed off or transferred to a team member.
                  </span>
                </div>
              )}

              {/* When my condition is met: Resolve when textarea */}
              {resolveMode === "condition" && (
                <div>
                  <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                    <span>Resolve when</span>
                    <span className="text-red-500 ml-0.5">*</span>
                    <InfoTip text="Describe what the contact must say or confirm before the conversation is marked resolved." />
                  </label>
                  <textarea
                    rows={3}
                    value={resolveConditionPrompt}
                    onChange={(e) => {
                      setResolveConditionPrompt(e.target.value);
                      if (errors.resolveCondition) {
                        setErrors((prev) => ({ ...prev, resolveCondition: "" }));
                      }
                    }}
                    placeholder="e.g. Contact has confirmed their appointment or explicitly stated they do not need any further help"
                    className={`w-full p-3 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none ${
                      errors.resolveCondition
                        ? "border-red-400 bg-red-50/20"
                        : "border-slate-200 text-slate-900"
                    }`}
                  />
                  {errors.resolveCondition && (
                    <p className="text-xs text-red-500 mt-1">{errors.resolveCondition}</p>
                  )}
                </div>
              )}

              {/* After inactivity: Hours of no reply (maximum 24 hr with custom range) */}
              {resolveMode === "inactivity" && (
                <div className="space-y-2.5">
                  <div>
                    <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                      <span>Hours of no reply</span>
                      <InfoTip text="Hours of inactivity before marking the conversation resolved (maximum 24 hours)." />
                    </label>
                    <select
                      value={isCustomHours ? "custom" : resolveAfterHours}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "custom") {
                          setIsCustomHours(true);
                        } else {
                          setIsCustomHours(false);
                          setResolveAfterHours(Number(val));
                        }
                      }}
                      className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition-colors"
                    >
                      <option value={1}>1 hour</option>
                      <option value={2}>2 hours</option>
                      <option value={4}>4 hours</option>
                      <option value={6}>6 hours</option>
                      <option value={12}>12 hours</option>
                      <option value={24}>24 hours</option>
                      <option value="custom">Custom range (up to 24 hr)...</option>
                    </select>
                  </div>

                  {isCustomHours && (
                    <div>
                      <label className="flex items-center text-[12px] font-medium text-slate-600 mb-1">
                        <span>Custom duration (1 to 24 hours)</span>
                        <InfoTip text="Set a custom inactivity window up to a maximum of 24 hours." />
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min={1}
                          max={24}
                          value={resolveAfterHours}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const clamped = Math.min(24, Math.max(1, val || 1));
                            setResolveAfterHours(clamped);
                          }}
                          className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                          placeholder="e.g. 8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
                          hours (max 24)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Maximum inactivity period allowed is 24 hours.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Document Template Field Variable Picker Modal */}
      <DocumentSelectFieldsModal
        isOpen={variableModalOpen}
        onClose={() => {
          setVariableModalOpen(false);
          setActiveVariableTarget(null);
        }}
        onInsert={handleInsertModalVariable}
        tokenFormat="double_curly"
        zIndex={10050}
      />
    </DrawerShell>
  );
}
