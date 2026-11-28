/**
 * WebsiteAgentDrawer.tsx
 * Path: src/app/components/chats/WebsiteAgentDrawer.tsx
 *
 * Website Agent Rule Configuration Drawer mirroring WhatsAppAgentDrawer
 * ("1. Name", "2. When it runs", "3. Agent replies", "4. Hand off", "5. After replying")
 * with Connected Website Channel selection populated dynamically from websiteWidgetStore.
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import DrawerShell from "../ui/DrawerShell";
import {
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  Globe,
  Info,
  Plus,
  Search,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import { Tooltip } from "../ui/Tooltip";
import { toast } from "sonner";
import {
  WebsiteAgentRule,
  WebsiteTriggerType,
  useWebsiteAgentStore,
} from "../../../lib/websiteAgentStore";
import {
  HandoffAssignee,
  HandoffCondition,
} from "../../../lib/whatsappAgentStore";
import { useWebsiteChannels } from "../../../lib/websiteWidgetStore";
import { getStoredProcesses } from "../../../lib/useProcessStore";
import { getStoredTeamMembers } from "../../../lib/teamStore";
import { getStoredDepartments } from "../../../lib/departmentStore";
import { getContactCategories } from "../../../lib/contactCategoriesStore";
import DocumentSelectFieldsModal from "../ui/DocumentSelectFieldsModal";

export interface WebsiteAgentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  rule: WebsiteAgentRule | null;
  onSave: (rule: WebsiteAgentRule) => void;
  onDelete?: (ruleId: string) => void;
}

interface DropdownPos {
  top: number;
  left: number;
  width: number;
  maxHeight?: number;
}

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

export default function WebsiteAgentDrawer({
  isOpen,
  onClose,
  rule,
  onSave,
  onDelete,
}: WebsiteAgentDrawerProps) {
  const isEditing = Boolean(rule);
  const { rules } = useWebsiteAgentStore();
  const { channels: websiteChannels } = useWebsiteChannels();

  const workflows = useMemo(() => getStoredProcesses(), [isOpen]);
  const teamMembers = useMemo(() => getStoredTeamMembers(), [isOpen]);
  const departments = useMemo(() => getStoredDepartments(), [isOpen]);
  const contactCategories = useMemo(() => getContactCategories(), [isOpen]);

  const [openSection, setOpenSection] = useState<number | null>(1);

  // ── Section 1: Name, Description & Connected Website Channel ──
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [connectedChannel, setConnectedChannel] = useState<string>("all");

  // ── Section 2: When it runs ──
  const [triggerType, setTriggerType] = useState<WebsiteTriggerType>("new_message");
  const [triggerPrompt, setTriggerPrompt] = useState("");
  const [selectedReqIds, setSelectedReqIds] = useState<string[]>([]);
  const [pageUrlPattern, setPageUrlPattern] = useState("");
  const [conditionType, setConditionType] = useState<"any" | "intent" | "keywords">("any");
  const [intentText, setIntentText] = useState("");
  const [keywords, setKeywords] = useState("");
  const [keywordMatch, setKeywordMatch] = useState<"any" | "all">("any");

  // ── Section 3: Agent replies ──
  const [replyMode, setReplyMode] = useState<"ai_prompt" | "canned_message">("ai_prompt");
  const [cannedReplyText, setCannedReplyText] = useState("");
  const [agentPrompt, setAgentPrompt] = useState("");
  const [useKb, setUseKb] = useState(true);
  const [sendMode, setSendMode] = useState<"auto" | "draft">("auto");
  const agentPromptTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [variableModalOpen, setVariableModalOpen] = useState(false);
  const [activeVariableTarget, setActiveVariableTarget] = useState<
    | { type: "agentPrompt" }
    | { type: "handoffCondition"; conditionId: string }
    | null
  >(null);

  // ── Section 4: Hand off ──
  const [handoffEnabled, setHandoffEnabled] = useState(true);
  const [handoffConditionsOpen, setHandoffConditionsOpen] = useState(true);
  const [handoffConditions, setHandoffConditions] = useState<HandoffCondition[]>([]);
  const handoffMessageRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const [openAssigneeDropdownId, setOpenAssigneeDropdownId] = useState<string | null>(null);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState("");
  const [assigneeDropdownPos, setAssigneeDropdownPos] = useState<DropdownPos | null>(null);
  const assigneeButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // ── Section 5: After replying ──
  const [createContactEnabled, setCreateContactEnabled] = useState(false);
  const [contactCategoryId, setContactCategoryId] = useState("");
  const [workflowId, setWorkflowId] = useState("");
  const [resolveMode, setResolveMode] = useState<"condition" | "inactivity" | "transferred_to_team">("condition");
  const [resolveConditionPrompt, setResolveConditionPrompt] = useState("");
  const [resolveAfterHours, setResolveAfterHours] = useState<number>(24);
  const [isCustomHours, setIsCustomHours] = useState<boolean>(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const getChannelAllowedMembers = (channelId: string) => {
    const sourceChannels =
      channelId === "all"
        ? websiteChannels
        : websiteChannels.filter((c) => c.id === channelId);
    const allowedIds = new Set<string>();
    sourceChannels.forEach((ch) => {
      (ch.agentQueue || []).forEach((id) => allowedIds.add(String(id)));
    });
    return teamMembers.filter((m) => allowedIds.has(String(m.id)));
  };

  const channelTeamMembers = useMemo(
    () => getChannelAllowedMembers(connectedChannel),
    [websiteChannels, connectedChannel, teamMembers]
  );

  const pruneConditionsToChannel = (
    conditions: HandoffCondition[],
    channelId: string
  ): HandoffCondition[] => {
    const allowedIds = new Set(getChannelAllowedMembers(channelId).map((m) => String(m.id)));
    return conditions.map((c) => {
      const filteredAssignees = (c.assignees || []).filter(
        (a) => a.type !== "user" || allowedIds.has(String(a.id))
      );
      const validAssigneeId =
        c.assigneeId && allowedIds.has(String(c.assigneeId))
          ? c.assigneeId
          : filteredAssignees[0]?.id || "";
      const validAssigneeName =
        validAssigneeId === c.assigneeId
          ? c.assigneeName
          : filteredAssignees[0]?.name || "";
      return {
        ...c,
        assignees: filteredAssignees,
        assigneeId: validAssigneeId,
        assigneeName: validAssigneeName,
      };
    });
  };

  const handleConnectedChannelChange = (nextChannelId: string) => {
    setConnectedChannel(nextChannelId);
    setHandoffConditions((prev) => pruneConditionsToChannel(prev, nextChannelId));
  };

  // Requirements available for the chosen Website Channel (or combined across all)
  const availableRequirements = useMemo(() => {
    const sourceChannels =
      connectedChannel === "all"
        ? websiteChannels
        : websiteChannels.filter((c) => c.id === connectedChannel);
    const seen = new Map<string, string>();
    sourceChannels.forEach((ch) => {
      (ch.requirements || []).forEach((r) => {
        if (r.id && r.label && !seen.has(r.id)) {
          seen.set(r.id, r.label);
        }
      });
    });
    return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
  }, [websiteChannels, connectedChannel]);

  const calculateDropdownPos = (
    el: HTMLElement | null,
    options?: { minWidth?: number; estimatedHeight?: number }
  ): DropdownPos | null => {
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const estimatedHeight = options?.estimatedHeight || 280;
    const width = Math.max(rect.width, options?.minWidth || rect.width);
    const availableBelow = window.innerHeight - rect.bottom - 16;
    const placeAbove = availableBelow < 180 && rect.top > estimatedHeight + 20;
    let left = rect.left;
    if (left + width > window.innerWidth - 10) {
      left = Math.max(10, window.innerWidth - width - 10);
    }
    const top = placeAbove
      ? Math.max(10, rect.top - Math.min(estimatedHeight, rect.top - 20) - 4)
      : rect.bottom + 4;
    const maxHeight = placeAbove
      ? Math.min(estimatedHeight, rect.top - 20)
      : Math.min(estimatedHeight, Math.max(150, availableBelow));
    return { top, left, width, maxHeight };
  };

  useEffect(() => {
    const close = () => setOpenAssigneeDropdownId(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    setOpenAssigneeDropdownId(null);
  }, [openSection, isOpen]);

  const initSessionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      initSessionRef.current = null;
      return;
    }
    const sessionKey = rule?.id ? `edit:${rule.id}` : "create";
    if (initSessionRef.current === sessionKey) {
      return;
    }
    initSessionRef.current = sessionKey;
    setErrors({});
    const targetChannelId = rule ? rule.connected_channel || "all" : websiteChannels[0]?.id || "all";
    const allowedMembers = getChannelAllowedMembers(targetChannelId);
    const defaultMember = allowedMembers[0];

    if (rule) {
      setName(rule.name || "");
      setDescription(rule.description || "");
      setConnectedChannel(targetChannelId);
      setTriggerType(rule.trigger_type || "new_message");
      setTriggerPrompt(rule.trigger_prompt || "");
      setSelectedReqIds(rule.requirement_ids || []);
      setPageUrlPattern(rule.page_url_pattern || "");
      setConditionType(rule.condition_type || "any");
      setIntentText(rule.intent_text || "");
      setKeywords(rule.keywords || "");
      setKeywordMatch(rule.keyword_match || "any");

      setReplyMode(rule.reply_mode || "ai_prompt");
      setCannedReplyText(rule.canned_reply_text || "");
      setAgentPrompt(rule.agent_prompt || "");
      setUseKb(rule.use_kb !== false);
      setSendMode(rule.send_mode || "auto");

      setHandoffEnabled(rule.handoff_enabled !== false);
      if (Array.isArray(rule.handoff_conditions) && rule.handoff_conditions.length > 0) {
        setHandoffConditions(pruneConditionsToChannel(rule.handoff_conditions, targetChannelId));
      } else {
        const legacyAllowed = rule.handoff_assignee_id
          ? allowedMembers.find((m) => String(m.id) === String(rule.handoff_assignee_id))
          : undefined;
        const resolvedMember = legacyAllowed || defaultMember;
        setHandoffConditions([
          {
            id: "web-cond-1",
            title: "Condition 1",
            prompt:
              rule.handoff_condition_prompt ||
              "Visitor is upset, asks for urgent care, or requests a human specialist",
            assigneeLevel: "user",
            assigneeId: resolvedMember?.id || "",
            assigneeName: resolvedMember?.name,
            assignees: resolvedMember
              ? [
                  {
                    id: resolvedMember.id,
                    type: "user",
                    name: resolvedMember.name,
                    roleOrDept: resolvedMember.role || resolvedMember.department || "Team Member",
                  },
                ]
              : [],
            handoffMessage:
              rule.handoff_message ||
              "Thanks {{contact_name}}, I'm connecting you with our team who will reply shortly.",
          },
        ]);
      }
      setHandoffConditionsOpen(true);

      setCreateContactEnabled(Boolean(rule.create_contact_enabled));
      setContactCategoryId(rule.contact_category_id || contactCategories[0] || "Lead");
      setWorkflowId(rule.workflow_id || "");
      setResolveMode(rule.resolve_mode || "condition");
      setResolveConditionPrompt(rule.resolve_condition_prompt || "");
      const hrs = Math.min(24, Math.max(1, rule.resolve_after_hours || 24));
      setResolveAfterHours(hrs);
      setIsCustomHours(![1, 2, 4, 6, 12, 24].includes(hrs));
      setOpenSection(1);
    } else {
      setName("");
      setDescription("");
      setConnectedChannel(targetChannelId);
      setTriggerType("new_message");
      setTriggerPrompt("");
      setSelectedReqIds([]);
      setPageUrlPattern("/pricing, /appointments*");
      setConditionType("any");
      setIntentText("");
      setKeywords("");
      setKeywordMatch("any");

      setReplyMode("ai_prompt");
      setCannedReplyText("");
      setAgentPrompt("");
      setUseKb(true);
      setSendMode("auto");

      setHandoffEnabled(true);
      setHandoffConditionsOpen(true);
      setHandoffConditions([
        {
          id: `web-cond-${Date.now()}`,
          title: "Condition 1",
          prompt: "Visitor is upset, asks for a refund, or raises a medical emergency",
          assigneeLevel: "user",
          assigneeId: defaultMember?.id || "",
          assigneeName: defaultMember?.name,
          assignees: defaultMember
            ? [
                {
                  id: defaultMember.id,
                  type: "user",
                  name: defaultMember.name,
                  roleOrDept: defaultMember.role || defaultMember.department || "Team Member",
                },
              ]
            : [],
          handoffMessage:
            "Thanks {{contact_name}}, I'm connecting you with our team who will reply shortly.",
        },
      ]);

      setCreateContactEnabled(false);
      setContactCategoryId(contactCategories[0] || "Lead");
      setWorkflowId("");
      setResolveMode("condition");
      setResolveConditionPrompt("");
      setResolveAfterHours(24);
      setIsCustomHours(false);
      setOpenSection(1);
    }
  }, [rule, isOpen]);

  const handleSetAssigneeLevel = (condId: string, level: "user" | "department") => {
    setHandoffConditions((prev) =>
      prev.map((c) => {
        if (c.id !== condId) return c;
        const currentLevel = c.assigneeLevel || (c.assignees?.[0]?.type === "department" ? "department" : "user");
        if (currentLevel === level) return c;
        let nextAssignees = (c.assignees || []).filter((a) => a.type === level);
        if (nextAssignees.length === 0) {
          if (level === "user" && channelTeamMembers[0]) {
            nextAssignees = [
              {
                id: channelTeamMembers[0].id,
                type: "user",
                name: channelTeamMembers[0].name,
                roleOrDept: channelTeamMembers[0].role || channelTeamMembers[0].department || "Team Member",
              },
            ];
          } else if (level === "department" && departments[0]) {
            nextAssignees = [
              {
                id: departments[0].id,
                type: "department",
                name: departments[0].name,
                roleOrDept: "Department",
              },
            ];
          }
        }
        return {
          ...c,
          assigneeLevel: level,
          assignees: nextAssignees,
          assigneeId: nextAssignees[0]?.id || "",
          assigneeName: nextAssignees[0]?.name || "",
        };
      })
    );
    setErrors((prev) => ({ ...prev, [`handoff_assignee_${condId}`]: "" }));
  };

  const handleToggleAssigneeItem = (condId: string, item: HandoffAssignee) => {
    setHandoffConditions((prev) =>
      prev.map((c) => {
        if (c.id !== condId) return c;
        const current = c.assignees || [];
        const existsIdx = current.findIndex(
          (a) => String(a.id) === String(item.id) && a.type === item.type
        );
        const nextAssignees =
          existsIdx >= 0 ? current.filter((_, idx) => idx !== existsIdx) : [...current, item];
        return {
          ...c,
          assignees: nextAssignees,
          assigneeId: nextAssignees[0]?.id || "",
          assigneeName: nextAssignees[0]?.name || "",
        };
      })
    );
    setErrors((prev) => ({ ...prev, [`handoff_assignee_${condId}`]: "" }));
  };

  const toggleAssigneeDropdown = (condId: string) => {
    if (openAssigneeDropdownId === condId) {
      setOpenAssigneeDropdownId(null);
    } else {
      const pos = calculateDropdownPos(assigneeButtonRefs.current[condId], {
        minWidth: 320,
        estimatedHeight: 300,
      });
      setAssigneeDropdownPos(pos);
      setOpenAssigneeDropdownId(condId);
      setAssigneeSearchQuery("");
    }
  };

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
      setAgentPrompt(agentPrompt.substring(0, start) + token + agentPrompt.substring(end));
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + token.length, start + token.length);
      }, 10);
    } else {
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

  const isSection1Valid = Boolean(name.trim());
  const isSection2Valid =
    triggerType === "new_message"
      ? Boolean(triggerPrompt.trim())
      : triggerType === "requirement_selected"
      ? selectedReqIds.length > 0 &&
        (conditionType === "any" ||
          (conditionType === "intent" && Boolean(intentText.trim())) ||
          (conditionType === "keywords" && Boolean(keywords.trim())))
      : Boolean(pageUrlPattern.trim());
  const isSection3Valid =
    replyMode === "ai_prompt" ? Boolean(agentPrompt.trim()) : Boolean(cannedReplyText.trim());
  const isSection4Valid =
    !handoffEnabled ||
    (handoffConditions.length > 0 &&
      handoffConditions.every(
        (c) =>
          Boolean(c.prompt.trim()) &&
          Boolean((c.assignees && c.assignees.length > 0) || c.assigneeId) &&
          Boolean(c.handoffMessage.trim())
      ));

  const handleSave = () => {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) {
      nextErrors.name = "Agent name is required.";
      setOpenSection(1);
    }

    if (triggerType === "new_message" && !triggerPrompt.trim()) {
      nextErrors.triggerPrompt = "When should this run is required.";
      if (!nextErrors.name) setOpenSection(2);
    } else if (triggerType === "requirement_selected" && selectedReqIds.length === 0) {
      nextErrors.requirements = "Select at least one pre-chat requirement.";
      if (!nextErrors.name) setOpenSection(2);
    } else if (triggerType === "page_url" && !pageUrlPattern.trim()) {
      nextErrors.pageUrlPattern = "Enter at least one page URL pattern.";
      if (!nextErrors.name) setOpenSection(2);
    }

    if (replyMode === "ai_prompt" && !agentPrompt.trim()) {
      nextErrors.agentPrompt = "Agent prompt is required.";
      if (Object.keys(nextErrors).length === 1) setOpenSection(3);
    } else if (replyMode === "canned_message" && !cannedReplyText.trim()) {
      nextErrors.cannedReplyText = "Reply message is required.";
      if (Object.keys(nextErrors).length === 1) setOpenSection(3);
    }

    if (handoffEnabled) {
      handoffConditions.forEach((c, idx) => {
        if (!c.prompt.trim()) {
          nextErrors[`handoff_prompt_${c.id}`] = `Condition ${idx + 1}: Prompt is required.`;
        }
        const hasAssignee = (c.assignees && c.assignees.length > 0) || Boolean(c.assigneeId);
        if (!hasAssignee) {
          nextErrors[`handoff_assignee_${c.id}`] = `Condition ${idx + 1}: Assign at least one member or department.`;
        }
        if (!c.handoffMessage.trim()) {
          nextErrors[`handoff_message_${c.id}`] = `Condition ${idx + 1}: Hand off message is required.`;
        }
      });
      if (Object.keys(nextErrors).some((k) => k.startsWith("handoff_"))) {
        setHandoffConditionsOpen(true);
        if (Object.keys(nextErrors).every((k) => k.startsWith("handoff_"))) {
          setOpenSection(4);
        }
      }
    }

    if (createContactEnabled && !contactCategoryId) {
      nextErrors.contactCategory = "Contact category is required.";
      if (Object.keys(nextErrors).length === 1) setOpenSection(5);
    }
    if (resolveMode === "condition" && !resolveConditionPrompt.trim()) {
      nextErrors.resolveCondition = "Resolve when condition is required.";
      if (Object.keys(nextErrors).length === 1) setOpenSection(5);
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast.error("Please fill in the required fields.");
      return;
    }

    const chosenChannelObj = websiteChannels.find((c) => c.id === connectedChannel);
    const reqNames = selectedReqIds.map(
      (id) => availableRequirements.find((r) => r.id === id)?.label || id
    );
    const primaryCond = handoffConditions[0];
    const primaryAssignee = primaryCond?.assignees?.[0];
    const selectedWorkflow = workflows.find((w) => w.id === workflowId);
    const isActive = rule ? (rule.is_active !== undefined ? rule.is_active : rule.enabled) : true;

    const savedRule: WebsiteAgentRule = {
      id: rule?.id || `web-rule-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || undefined,
      connected_channel: connectedChannel || "all",
      connected_channel_name:
        connectedChannel === "all"
          ? "All Channels"
          : chosenChannelObj?.name || rule?.connected_channel_name,
      is_active: isActive,
      enabled: isActive,
      priority: rule?.priority || rules.length + 1,
      trigger_type: triggerType,
      trigger_prompt: triggerType === "new_message" ? triggerPrompt.trim() : undefined,
      requirement_ids: triggerType === "requirement_selected" ? selectedReqIds : undefined,
      requirement_names: triggerType === "requirement_selected" ? reqNames : undefined,
      page_url_pattern: triggerType === "page_url" ? pageUrlPattern.trim() : undefined,
      condition_type: conditionType,
      intent_text: conditionType === "intent" ? intentText.trim() : undefined,
      keywords: conditionType === "keywords" ? keywords.trim() : undefined,
      keyword_match: conditionType === "keywords" ? keywordMatch : undefined,
      reply_mode: replyMode,
      canned_reply_text: replyMode === "canned_message" ? cannedReplyText.trim() : undefined,
      agent_prompt:
        replyMode === "ai_prompt" ? agentPrompt.trim() : cannedReplyText.trim(),
      use_kb: replyMode === "ai_prompt" ? useKb : false,
      send_mode: sendMode,
      handoff_enabled: handoffEnabled,
      handoff_conditions: handoffEnabled ? handoffConditions : undefined,
      handoff_condition_prompt: handoffEnabled ? primaryCond?.prompt.trim() : undefined,
      handoff_assignee_id: handoffEnabled ? primaryAssignee?.id || primaryCond?.assigneeId : undefined,
      handoff_assignee_name: handoffEnabled ? primaryAssignee?.name || primaryCond?.assigneeName : undefined,
      handoff_message: handoffEnabled ? primaryCond?.handoffMessage.trim() : undefined,
      create_contact_enabled: createContactEnabled,
      contact_category_id: createContactEnabled ? contactCategoryId : undefined,
      contact_category_name: createContactEnabled ? contactCategoryId : undefined,
      workflow_id: workflowId || undefined,
      workflow_name: selectedWorkflow ? (selectedWorkflow as any).title || selectedWorkflow.name : undefined,
      resolve_mode: resolveMode,
      resolve_condition_prompt: resolveMode === "condition" ? resolveConditionPrompt.trim() : undefined,
      resolve_after_hours:
        resolveMode === "inactivity" ? Math.min(24, Math.max(1, resolveAfterHours)) : undefined,
      direction: "inbound",
      createdAt: rule?.createdAt || new Date().toISOString().substring(0, 10),
      updatedAt: new Date().toISOString().substring(0, 10),
    };

    onSave(savedRule);
    toast.success(`Website agent rule "${savedRule.name}" saved`);
    onClose();
  };

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Website Agent Rule" : "New Website Agent Rule"}
      icon={<Globe className="w-4 h-4 text-[#6366F1]" />}
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
                  toast.success(`Website agent rule "${rule.name}" deleted`);
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
        {/* ── SECTION 1: NAME & CONNECTED WEBSITE CHANNEL ── */}
        <div className="border border-slate-200 rounded-lg bg-white">
          <button
            type="button"
            onClick={() => setOpenSection((p) => (p === 1 ? null : 1))}
            className={`w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer ${
              openSection === 1 ? "rounded-t-lg" : "rounded-lg"
            }`}
          >
            <span className="text-sm font-bold text-slate-900">1. Name</span>
            <div className="flex items-center gap-2">
              {isSection1Valid && <Check className="w-4 h-4 text-emerald-600" />}
              {openSection === 1 ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>
          </button>

          {openSection === 1 && (
            <div className="px-4 py-4 border-t border-slate-100 space-y-4">
              <div>
                <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                  <span>Agent name</span>
                  <span className="text-red-500 ml-0.5">*</span>
                  <InfoTip text="Shown in the Website agent list and conversation history." />
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  placeholder="e.g. Appointment Booking Concierge"
                  className={`w-full h-10 px-3 py-2 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                    errors.name ? "border-red-400 bg-red-50/20" : "border-slate-200 text-slate-900"
                  }`}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                  <span>Description</span>
                  <InfoTip text="Optional summary describing the purpose of this website agent." />
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Answers clinic questions and qualifies booking requests on our main website"
                  className="w-full p-2.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                  <span>Connected Website Channel</span>
                  <InfoTip text="Choose which website widget channel this agent handles." />
                </label>
                <select
                  value={connectedChannel}
                  onChange={(e) => handleConnectedChannelChange(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">All Website Channels</option>
                  {websiteChannels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ── SECTION 2: WHEN IT RUNS ── */}
        <div className="border border-slate-200 rounded-lg bg-white">
          <button
            type="button"
            onClick={() => setOpenSection((p) => (p === 2 ? null : 2))}
            className={`w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer ${
              openSection === 2 ? "rounded-t-lg" : "rounded-lg"
            }`}
          >
            <span className="text-sm font-bold text-slate-900">2. When it runs</span>
            <div className="flex items-center gap-2">
              {isSection2Valid && <Check className="w-4 h-4 text-emerald-600" />}
              {openSection === 2 ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>
          </button>

          {openSection === 2 && (
            <div className="px-4 py-4 border-t border-slate-100 space-y-4">
              <div>
                <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                  <span>Trigger</span>
                  <span className="text-red-500 ml-0.5">*</span>
                  <InfoTip text="Choose what starts this website agent." />
                </label>
                <select
                  value={triggerType}
                  onChange={(e) => {
                    setTriggerType(e.target.value as WebsiteTriggerType);
                    setErrors((prev) => ({
                      ...prev,
                      triggerPrompt: "",
                      requirements: "",
                      pageUrlPattern: "",
                    }));
                  }}
                  className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 cursor-pointer"
                >
                  <option value="new_message">Visitor sends a new message</option>
                  <option value="requirement_selected">Visitor selects pre-chat requirement</option>
                  <option value="page_url">Visitor chats from matching page URL</option>
                </select>
              </div>

              {triggerType === "new_message" && (
                <div>
                  <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                    <span>When should this run</span>
                    <span className="text-red-500 ml-0.5">*</span>
                    <InfoTip text="Describe in plain language what the visitor's inquiry should be about." />
                  </label>
                  <textarea
                    rows={3}
                    value={triggerPrompt}
                    onChange={(e) => {
                      setTriggerPrompt(e.target.value);
                      if (errors.triggerPrompt) setErrors((prev) => ({ ...prev, triggerPrompt: "" }));
                    }}
                    placeholder="e.g. Visitor asks about pricing, insurance, or wants to book an appointment"
                    className={`w-full p-3 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none ${
                      errors.triggerPrompt ? "border-red-400 bg-red-50/20" : "border-slate-200 text-slate-900"
                    }`}
                  />
                  {errors.triggerPrompt && <p className="text-xs text-red-500 mt-1">{errors.triggerPrompt}</p>}
                </div>
              )}

              {triggerType === "requirement_selected" && (
                <div>
                  <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                    <span>Pre-chat requirements</span>
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {availableRequirements.map((req) => {
                      const checked = selectedReqIds.includes(req.id);
                      return (
                        <label
                          key={req.id}
                          className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50/40 text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSelectedReqIds((prev) =>
                                checked ? prev.filter((id) => id !== req.id) : [...prev, req.id]
                              );
                              if (errors.requirements) setErrors((prev) => ({ ...prev, requirements: "" }));
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600"
                          />
                          <span className="truncate">{req.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  {errors.requirements && <p className="text-xs text-red-500 mt-1">{errors.requirements}</p>}
                </div>
              )}

              {triggerType === "page_url" && (
                <div>
                  <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                    <span>Page URL patterns</span>
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    value={pageUrlPattern}
                    onChange={(e) => {
                      setPageUrlPattern(e.target.value);
                      if (errors.pageUrlPattern) setErrors((prev) => ({ ...prev, pageUrlPattern: "" }));
                    }}
                    placeholder="/pricing, /services/*, /book"
                    className={`w-full h-10 px-3 py-2 text-sm rounded-lg border bg-white font-mono ${
                      errors.pageUrlPattern ? "border-red-400 bg-red-50/20" : "border-slate-200 text-slate-900"
                    }`}
                  />
                  {errors.pageUrlPattern && <p className="text-xs text-red-500 mt-1">{errors.pageUrlPattern}</p>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── SECTION 3: AGENT REPLIES ── */}
        <div className="border border-slate-200 rounded-lg bg-white">
          <button
            type="button"
            onClick={() => setOpenSection((p) => (p === 3 ? null : 3))}
            className={`w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer ${
              openSection === 3 ? "rounded-t-lg" : "rounded-lg"
            }`}
          >
            <span className="text-sm font-bold text-slate-900">3. Agent replies</span>
            <div className="flex items-center gap-2">
              {isSection3Valid && <Check className="w-4 h-4 text-emerald-600" />}
              {openSection === 3 ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>
          </button>

          {openSection === 3 && (
            <div className="px-4 py-4 border-t border-slate-100 space-y-4">
              <div>
                <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                  <span>Reply type</span>
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <select
                  value={replyMode}
                  onChange={(e) => setReplyMode(e.target.value as "ai_prompt" | "canned_message")}
                  className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 cursor-pointer"
                >
                  <option value="ai_prompt">AI Prompt</option>
                  <option value="canned_message">Fixed welcome / reply message</option>
                </select>
              </div>

              {replyMode === "ai_prompt" ? (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="flex items-center text-[13px] font-medium text-slate-700">
                        <span>Agent prompt</span>
                        <span className="text-red-500 ml-0.5">*</span>
                        <InfoTip text="Instructions guiding the AI conversation with website visitors." />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveVariableTarget({ type: "agentPrompt" });
                          setVariableModalOpen(true);
                        }}
                        className="h-7 px-2.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Sparkles className="w-3 h-3 text-blue-600" />
                        <span>Insert variable</span>
                      </button>
                    </div>
                    <textarea
                      ref={agentPromptTextareaRef}
                      rows={6}
                      value={agentPrompt}
                      onChange={(e) => {
                        setAgentPrompt(e.target.value);
                        if (errors.agentPrompt) setErrors((prev) => ({ ...prev, agentPrompt: "" }));
                      }}
                      placeholder="Explain how the website agent should respond, what details to gather, and when to offer booking..."
                      className={`w-full p-3 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-y ${
                        errors.agentPrompt ? "border-red-400 bg-red-50/20" : "border-slate-200 text-slate-900"
                      }`}
                    />
                    {errors.agentPrompt && <p className="text-xs text-red-500 mt-1">{errors.agentPrompt}</p>}
                  </div>

                  <div className="flex items-center justify-between h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50">
                    <label className="flex items-center text-[13px] font-medium text-slate-700 cursor-pointer">
                      <span>Use knowledge base</span>
                      <InfoTip text="Allow answering visitor questions from your connected knowledge base." />
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useKb}
                        onChange={(e) => setUseKb(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </>
              ) : (
                <div>
                  <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                    <span>Reply message</span>
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={cannedReplyText}
                    onChange={(e) => {
                      setCannedReplyText(e.target.value);
                      if (errors.cannedReplyText) setErrors((prev) => ({ ...prev, cannedReplyText: "" }));
                    }}
                    placeholder="Thanks for reaching out! A coordinator will be with you shortly."
                    className={`w-full p-3 text-sm rounded-lg border bg-white resize-none ${
                      errors.cannedReplyText ? "border-red-400 bg-red-50/20" : "border-slate-200 text-slate-900"
                    }`}
                  />
                  {errors.cannedReplyText && <p className="text-xs text-red-500 mt-1">{errors.cannedReplyText}</p>}
                </div>
              )}

              <div className="flex items-center justify-between h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <label className="flex items-center text-[13px] font-medium text-slate-700 cursor-pointer">
                  <span>Send automatically</span>
                  <InfoTip text="Send replies instantly to website visitors, or save as drafts for agent review." />
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendMode === "auto"}
                    onChange={(e) => setSendMode(e.target.checked ? "auto" : "draft")}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* ── SECTION 4: HAND OFF ── */}
        <div className="border border-slate-200 rounded-lg bg-white">
          <button
            type="button"
            onClick={() => setOpenSection((p) => (p === 4 ? null : 4))}
            className={`w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer ${
              openSection === 4 ? "rounded-t-lg" : "rounded-lg"
            }`}
          >
            <span className="text-sm font-bold text-slate-900">4. Hand off</span>
            <div className="flex items-center gap-2">
              {isSection4Valid && <Check className="w-4 h-4 text-emerald-600" />}
              {openSection === 4 ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>
          </button>

          {openSection === 4 && (
            <div className="px-4 py-4 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <label className="flex items-center text-[13px] font-medium text-slate-700 cursor-pointer">
                  <span>Hand off to a team member</span>
                  <InfoTip text="Escalate the live website conversation when a condition matches." />
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={handoffEnabled}
                    onChange={(e) => setHandoffEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {handoffEnabled && (
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/40">
                  <div className="flex items-center justify-between p-3 bg-slate-50/90 border-b border-slate-200">
                    <button
                      type="button"
                      onClick={() => setHandoffConditionsOpen((v) => !v)}
                      className="flex items-center gap-2 text-xs font-bold text-slate-800 hover:text-blue-600 cursor-pointer"
                    >
                      <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${handoffConditionsOpen ? "rotate-180" : ""}`} />
                      <span>Handoff Conditions ({handoffConditions.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const defaultMember = channelTeamMembers[0];
                        setHandoffConditions((prev) => [
                          ...prev,
                          {
                            id: `web-cond-${Date.now()}`,
                            title: `Condition ${prev.length + 1}`,
                            prompt: "",
                            assigneeLevel: "user",
                            assigneeId: defaultMember?.id || "",
                            assigneeName: defaultMember?.name,
                            assignees: defaultMember
                              ? [
                                  {
                                    id: defaultMember.id,
                                    type: "user",
                                    name: defaultMember.name,
                                    roleOrDept: defaultMember.role || defaultMember.department || "Team Member",
                                  },
                                ]
                              : [],
                            handoffMessage: "Thanks {{contact_name}}, I'm connecting you with our team who will reply shortly.",
                          },
                        ]);
                        setHandoffConditionsOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 bg-white border border-blue-200 rounded-md cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add condition</span>
                    </button>
                  </div>

                  {handoffConditionsOpen && (
                    <div className="p-3 space-y-3 bg-white">
                      {handoffConditions.map((cond, index) => {
                        const currentLevel = cond.assigneeLevel || "user";
                        const selectedAssignees = (cond.assignees || []).filter(
                          (a) => a.type === currentLevel
                        );
                        return (
                          <div key={cond.id} className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/30 space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                              <span className="text-xs font-bold text-slate-800">Condition {index + 1}</span>
                              {handoffConditions.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setHandoffConditions((prev) => prev.filter((c) => c.id !== cond.id))
                                  }
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            <div>
                              <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                                <span>Hand off when</span>
                                <span className="text-red-500 ml-0.5">*</span>
                              </label>
                              <textarea
                                rows={2}
                                value={cond.prompt}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setHandoffConditions((prev) =>
                                    prev.map((c) => (c.id === cond.id ? { ...c, prompt: val } : c))
                                  );
                                }}
                                placeholder="e.g. Visitor asks to speak with billing or clinical staff"
                                className="w-full p-2.5 text-sm rounded-lg border border-slate-200 bg-white resize-none"
                              />
                              {errors[`handoff_prompt_${cond.id}`] && (
                                <p className="text-xs text-red-500 mt-1">{errors[`handoff_prompt_${cond.id}`]}</p>
                              )}
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="flex items-center text-[13px] font-medium text-slate-700">
                                  <span>Assign responsible</span>
                                  <span className="text-red-500 ml-0.5">*</span>
                                </label>
                                <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                                  <button
                                    type="button"
                                    onClick={() => handleSetAssigneeLevel(cond.id, "user")}
                                    className={`px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer flex items-center gap-1 ${
                                      currentLevel === "user" ? "bg-white text-blue-700 shadow-2xs" : "text-slate-600"
                                    }`}
                                  >
                                    <User className="w-3 h-3" />
                                    <span>User level</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSetAssigneeLevel(cond.id, "department")}
                                    className={`px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer flex items-center gap-1 ${
                                      currentLevel === "department" ? "bg-white text-purple-700 shadow-2xs" : "text-slate-600"
                                    }`}
                                  >
                                    <Building2 className="w-3 h-3" />
                                    <span>Department level</span>
                                  </button>
                                </div>
                              </div>

                              <button
                                ref={(el) => {
                                  assigneeButtonRefs.current[cond.id] = el;
                                }}
                                type="button"
                                onClick={() => toggleAssigneeDropdown(cond.id)}
                                className="w-full min-h-[42px] px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-left flex items-center justify-between bg-white cursor-pointer"
                              >
                                <div className="flex items-center gap-1.5 flex-wrap flex-1 mr-2">
                                  {selectedAssignees.length === 0 ? (
                                    <span className="text-slate-400">
                                      {currentLevel === "user" ? "Select team members..." : "Select departments..."}
                                    </span>
                                  ) : (
                                    selectedAssignees.map((assignee) => (
                                      <span
                                        key={`${assignee.type}-${assignee.id}`}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200"
                                      >
                                        <span>{assignee.name}</span>
                                        <span
                                          role="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleAssigneeItem(cond.id, assignee);
                                          }}
                                          className="cursor-pointer"
                                        >
                                          <X className="w-3 h-3 opacity-60 hover:opacity-100" />
                                        </span>
                                      </span>
                                    ))
                                  )}
                                </div>
                                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                              </button>
                              {errors[`handoff_assignee_${cond.id}`] && (
                                <p className="text-xs text-red-500 mt-1">{errors[`handoff_assignee_${cond.id}`]}</p>
                              )}
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="flex items-center text-[13px] font-medium text-slate-700">
                                  <span>Hand off message</span>
                                  <span className="text-red-500 ml-0.5">*</span>
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
                                  className="h-7 px-2.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
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
                                    prev.map((c) => (c.id === cond.id ? { ...c, handoffMessage: val } : c))
                                  );
                                }}
                                className="w-full p-2.5 text-sm rounded-lg border border-slate-200 bg-white resize-none"
                              />
                              {errors[`handoff_message_${cond.id}`] && (
                                <p className="text-xs text-red-500 mt-1">{errors[`handoff_message_${cond.id}`]}</p>
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
          )}
        </div>

        {/* ── SECTION 5: AFTER REPLYING ── */}
        <div className="border border-slate-200 rounded-lg bg-white">
          <button
            type="button"
            onClick={() => setOpenSection((p) => (p === 5 ? null : 5))}
            className={`w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer ${
              openSection === 5 ? "rounded-t-lg" : "rounded-lg"
            }`}
          >
            <span className="text-sm font-bold text-slate-900">5. After replying (Advanced)</span>
            {openSection === 5 ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {openSection === 5 && (
            <div className="px-4 py-4 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <label className="text-[13px] font-medium text-slate-700 cursor-pointer">
                  Create a new contact
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createContactEnabled}
                    onChange={(e) => setCreateContactEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {createContactEnabled && (
                <div>
                  <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                    <span>Contact category</span>
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <select
                    value={contactCategoryId}
                    onChange={(e) => setContactCategoryId(e.target.value)}
                    className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 cursor-pointer"
                  >
                    {contactCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                  <span>Assign to process workflow</span>
                </label>
                <select
                  value={workflowId}
                  onChange={(e) => setWorkflowId(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 cursor-pointer"
                >
                  <option value="">None / Do not assign</option>
                  {workflows.map((proc) => (
                    <option key={proc.id} value={proc.id}>
                      {proc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                  <span>Resolve conversation</span>
                </label>
                <select
                  value={resolveMode}
                  onChange={(e) => setResolveMode(e.target.value as any)}
                  className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 cursor-pointer"
                >
                  <option value="condition">When my condition is met</option>
                  <option value="transferred_to_team">If transferred to team</option>
                  <option value="inactivity">After inactivity</option>
                </select>
              </div>

              {resolveMode === "condition" && (
                <div>
                  <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                    <span>Resolve when</span>
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={resolveConditionPrompt}
                    onChange={(e) => {
                      setResolveConditionPrompt(e.target.value);
                      if (errors.resolveCondition) setErrors((prev) => ({ ...prev, resolveCondition: "" }));
                    }}
                    placeholder="e.g. Visitor received an answer and confirmed they do not need further assistance"
                    className={`w-full p-3 text-sm rounded-lg border bg-white resize-none ${
                      errors.resolveCondition ? "border-red-400 bg-red-50/20" : "border-slate-200 text-slate-900"
                    }`}
                  />
                  {errors.resolveCondition && <p className="text-xs text-red-500 mt-1">{errors.resolveCondition}</p>}
                </div>
              )}

              {resolveMode === "inactivity" && (
                <div>
                  <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                    <span>Hours of no reply</span>
                  </label>
                  <select
                    value={isCustomHours ? "custom" : resolveAfterHours}
                    onChange={(e) => {
                      if (e.target.value === "custom") setIsCustomHours(true);
                      else {
                        setIsCustomHours(false);
                        setResolveAfterHours(Number(e.target.value));
                      }
                    }}
                    className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 cursor-pointer"
                  >
                    <option value={1}>1 hour</option>
                    <option value={2}>2 hours</option>
                    <option value={4}>4 hours</option>
                    <option value={6}>6 hours</option>
                    <option value={12}>12 hours</option>
                    <option value={24}>24 hours</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Multi-Select Assignee Portal */}
      {openAssigneeDropdownId && assigneeDropdownPos && createPortal(
        (() => {
          const activeCond = handoffConditions.find((c) => c.id === openAssigneeDropdownId);
          if (!activeCond) return null;
          const currentLevel = activeCond.assigneeLevel || "user";
          const selectedAssignees = (activeCond.assignees || []).filter(
            (a) => a.type === currentLevel
          );
          const candidates = currentLevel === "user" ? channelTeamMembers : departments;
          const filteredCandidates = candidates.filter((item) => {
            const q = assigneeSearchQuery.trim().toLowerCase();
            if (!q) return true;
            return item.name.toLowerCase().includes(q);
          });

          return (
            <>
              <div
                className="fixed inset-0 cursor-default"
                style={{ zIndex: 9998 }}
                onClick={() => setOpenAssigneeDropdownId(null)}
              />
              <div
                className="fixed bg-white border border-slate-200 rounded-lg shadow-2xl overflow-hidden flex flex-col"
                style={{
                  top: assigneeDropdownPos.top,
                  left: assigneeDropdownPos.left,
                  width: assigneeDropdownPos.width,
                  maxHeight: assigneeDropdownPos.maxHeight || 300,
                  zIndex: 9999,
                  fontFamily: "Outfit, sans-serif",
                }}
              >
                <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50/70">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={assigneeSearchQuery}
                    onChange={(e) => setAssigneeSearchQuery(e.target.value)}
                    placeholder={currentLevel === "user" ? "Search channel team members..." : "Search departments..."}
                    className="w-full text-xs bg-transparent border-none outline-none"
                    autoFocus
                  />
                </div>
                <div className="overflow-y-auto p-1 divide-y divide-slate-50 flex-1">
                  {filteredCandidates.length === 0 ? (
                    <div className="px-3 py-3 text-xs text-slate-500 text-center">
                      {currentLevel === "user" && channelTeamMembers.length === 0
                        ? "No team members added to this Website channel yet. Add members in Channel settings first."
                        : "No matching results found."}
                    </div>
                  ) : (
                    filteredCandidates.map((item) => {
                    const isSelected = selectedAssignees.some(
                      (a) => String(a.id) === String(item.id) && a.type === currentLevel
                    );
                    return (
                      <button
                        key={`${currentLevel}-${item.id}`}
                        type="button"
                        onClick={() =>
                          handleToggleAssigneeItem(activeCond.id, {
                            id: item.id,
                            type: currentLevel,
                            name: item.name,
                            roleOrDept:
                              currentLevel === "user"
                                ? (item as any).role || "Team Member"
                                : "Department",
                          })
                        }
                        className={`w-full px-2.5 py-2 text-left text-xs flex items-center gap-2 rounded hover:bg-slate-50 cursor-pointer ${
                          isSelected ? "bg-blue-50/40 text-blue-900 font-medium" : "text-slate-700"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="truncate">{item.name}</span>
                      </button>
                    );
                  })
                  )}
                </div>
              </div>
            </>
          );
        })(),
        document.body
      )}

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
