import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router";
import { ChevronRight, ChevronDown, Plus, GripVertical, Edit, Trash2, Sparkles, Info, Play, AlertCircle, X, Bot, Phone, MessageSquare, PhoneCall, Mic, RefreshCw, Volume2, Sliders, Star, Ticket, MessageCircle, Clock, Timer, Volume, Users, Ban, Shield, Lock, FileText, UserCheck, Mail, PhoneOff, MessagesSquare, AlertTriangle, ExternalLink, Download, Upload, Lightbulb, Globe, Settings, Search, Calendar, ClipboardList, Inbox, Paperclip, Zap, Copy, Database, Webhook, LayoutGrid, Filter, Pencil, PhoneForwarded, Voicemail, GitBranch, Layers, CheckCircle2, Check, Eye, CreditCard } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { Tooltip } from "../../components/ui/Tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { toast } from "sonner";
import { useAIProviders } from "../../context/AIProviderContext";
import { useSidebar } from "../../context/SidebarContext";
import PageHeader from "../../components/layout/PageHeader";
import PageTopBar from "../../components/layout/PageTopBar";
import { HowItWorksModal, HowItWorksButton } from "../../components/help/HowItWorksModal";
import { InfoTooltip } from "../../components/help/InfoTooltip";
import { useDrag, useDrop } from "react-dnd";
import FlowBuilderTab from "../../components/process/FlowBuilderTab";
import { WorkflowStep } from "../../types/workflow";
import VariablePickerButton, { FETCH_FIELD_SOURCES, FIELDS_BY_SOURCE_MAP } from "../../components/process/VariablePickerButton";
import StepParametersFields from "../../components/process/StepParametersFields";
import StepDetailDrawer from "../../components/process/StepDetailDrawer";
import AddAutomationDrawer from "../../components/process/AddAutomationDrawer";
import { getStoredVoices, VoiceConfigItem, VOICE_STORE_EVENT } from "../../../lib/useVoiceStore";
import { getActiveAIModels, AI_MODELS_STORE_EVENT, AIModelConfig } from "../../../lib/aiModelsStore";
import { SelectFieldsModal } from "../../components/help/FieldManager";
import { assignNumberToStage } from "../../../lib/useStageNumberRouting";
import TestProcessChatDrawer from "../../components/process/TestProcessChatDrawer";
import CallTriggerDrawer from "../../components/process/CallTriggerDrawer";
import ProcessDetailDrawer, { ProcessDetailHistoryFilterState, ActivityLogEntry } from "../../components/deals/ProcessDetailDrawer";
import { useFieldRegistry } from "../../context/FieldRegistryContext";
import { useProcessTemplates } from "../../context/ProcessTemplateContext";
import { useOrganization } from "../../context/OrganizationContext";
import { AdminScopingRulesEditor } from "./components/AdminScopingRulesEditor";
import { AdminControlAccordion } from "./components/AdminControlAccordion";
import {
  INITIAL_CATEGORIES,
  INITIAL_INDUSTRIES,
  STANDARD_LOCATIONS,
  getIndustriesForCategory,
} from "../../../data/industryReferenceData";
import {
  getStoredProcesses,
  saveStoredProcesses,
  getWorkflowStepsForStage as getStoreWorkflowSteps,
  CallTriggerSettings,
  getDefaultCallTriggerSettings,
  saveDefaultCallTriggerSettings,
  ScopingRule,
  ProcessPermissions,
  isProcessMatchingScope,
  ProcessTransitionTarget,
  EntityType,
  DEFAULT_ENTITY_PROCESSES,
} from "../../../lib/useProcessStore";

interface AISettings {
  platform: string;
  voiceSpeed: number;
  voice?: string;
  tone?: string;
  style?: string;
}

export interface StageChannelSource {
  id: string;
  channel: "calls" | "sms" | "whatsapp" | "website";
  source: string;
}

export interface Stage {
  id: string;
  name: string;
  description: string;
  status: string;
  color?: string;
  systemCategory?: string;
  isSystemCategoryRequired?: boolean;
  isInitial?: boolean;
  isFinal?: boolean;
  isFinalStage?: boolean;
  nextProcessTransitions?: ProcessTransitionTarget[];
  stagePosition?: "initial" | "intermediate" | "final" | null;
  aiSettings?: AISettings;
  // Persisted stage configuration
  stageType?: string;
  selectedInboundNumbers?: string[];
  selectedStageChannels?: string[];
  channelSources?: StageChannelSource[];
  responsiblePerson?: string;
  whenToMove?: string;
  callerPitchMode?: "single" | "comprehensive";
  callerPitch?: string;
  greetingIntroMessage?: string;
  objectiveText?: string;
  businessInfoItems?: Array<{ id: number; title: string; information: string; active: boolean }>;
  primaryLanguage?: string;
  secondaryLanguages?: string[];
  workflowSteps?: WorkflowStep[];
  enableCalling?: boolean;
  callTriggerSettings?: CallTriggerSettings;
  scopingRules?: ScopingRule[];
}

export interface Process {
  id: string;
  name: string;
  description: string;
  assignedToUserId: number;
  stages: Stage[];
  aiSettings: AISettings;
  entityType?: EntityType;
  // Scoping & Tenant Permissions
  industryCategory?: string;
  industry?: string;
  locations?: string[];
  scopingRules?: ScopingRule[];
  permissions?: ProcessPermissions;
  source?: "system" | "template" | "custom";
}


const STAGE_PRESET_COLORS = [
  "#3B82F6", // blue
  "#EF4444", // red
  "#F97316", // orange
  "#EAB308", // yellow
  "#22C55E", // green
  "#14B8A6", // teal
  "#06B6D4", // cyan
  "#6366F1", // indigo
  "#8B5CF6", // purple
  "#A855F7", // violet
  "#EC4899", // pink
  "#F43F5E", // rose
];

const STAGE_COLORS = STAGE_PRESET_COLORS;

// Comprehensive color palette for stage color picker (10x10 grid)
const COLOR_PALETTE = [
  // Row 1: Lightest tints
  "#B5EAF5", "#80D8F0", "#00BCD4", "#FFD54F", "#A5D6A7", "#EF9A9A", "#CE93D8", "#B0BEC5", "#CFD8DC", "#FFFFFF",
  // Row 2
  "#4DD0E1", "#00ACC1", "#FFB300", "#FFA000", "#8D6E63", "#EF5350", "#EC407A", "#9E9E9E", "#78909C", "#546E7A",
  // Row 3
  "#00E5FF", "#FFCA28", "#FFB74D", "#FF8A65", "#A1887F", "#E53935", "#D81B60", "#757575", "#607D8B", "#455A64",
  // Row 4
  "#FF6F00", "#F9A825", "#F57F17", "#BF360C", "#6D4C41", "#C62828", "#AD1457", "#616161", "#546E7A", "#37474F",
  // Row 5
  "#FF5722", "#FF7043", "#FFA726", "#FFCC02", "#66BB6A", "#43A047", "#2E7D32", "#1B5E20", "#004D40", "#212121",
  // Row 6
  "#EF6C00", "#E64A19", "#D84315", "#BF360C", "#558B2F", "#33691E", "#827717", "#F57F17", "#E65100", "#3E2723",
  // Row 7
  "#CDDC39", "#C6FF00", "#76FF03", "#69F0AE", "#1DE9B6", "#00E5FF", "#2979FF", "#651FFF", "#D500F9", "#FF1744",
  // Row 8
  "#9CCC65", "#8BC34A", "#7CB342", "#689F38", "#0288D1", "#0277BD", "#01579B", "#283593", "#1A237E", "#311B92",
  // Row 9
  "#26C6DA", "#00BFA5", "#1565C0", "#0D47A1", "#4527A0", "#6A1B9A", "#880E4F", "#B71C1C", "#E65100", "#33691E",
  // Row 10: Darkest
  "#006064", "#004D40", "#1B5E20", "#33691E", "#1A237E", "#0D47A1", "#311B92", "#4A148C", "#880E4F", "#000000",
];

const FORM_TEMPLATES = [
  {
    id: "contact-form",
    name: "Contact Form",
    description: "Captures name, email, phone and a message from the caller",
    usage: "Used by 12.5K businesses",
    iconBg: "#DBEAFE",
    iconColor: "#2563EB",
    icon: "message",
    fieldCount: "4 fields",
    fields: [
      { label: "Name", type: "Text" },
      { label: "Email", type: "Email" },
      { label: "Phone", type: "Phone" },
      { label: "Message", type: "Text" }
    ],
    buttonText: "Send Message"
  },
  {
    id: "appointment-booking",
    name: "Appointment Booking",
    description: "Collects scheduling details — preferred date, time slot and contact info",
    usage: "Used by 8.2K businesses",
    iconBg: "#D1FAE5",
    iconColor: "#059669",
    icon: "calendar",
    fieldCount: "5 fields",
    fields: [
      { label: "Name", type: "Text" },
      { label: "Email", type: "Email" },
      { label: "Phone", type: "Phone" },
      { label: "Preferred Date", type: "Date" },
      { label: "Time Slot", type: "Time" }
    ],
    buttonText: "Book Appointment"
  },
  {
    id: "lead-generation",
    name: "Lead Generation",
    description: "Gathers company name, role and pain points for B2B qualification",
    usage: "Used by 15.8K businesses",
    iconBg: "#EDE9FE",
    iconColor: "#7C3AED",
    icon: "briefcase",
    fieldCount: "5 fields",
    fields: [
      { label: "Name", type: "Text" },
      { label: "Email", type: "Email" },
      { label: "Phone", type: "Phone" },
      { label: "Company", type: "Text" },
      { label: "How can we help?", type: "Text" }
    ],
    buttonText: "Get Started"
  },
  {
    id: "quote-request",
    name: "Quote Request",
    description: "Collects project details and budget range for service inquiries",
    usage: "Used by 6.4K businesses",
    iconBg: "#FEF3C7",
    iconColor: "#D97706",
    icon: "document",
    fieldCount: "5 fields",
    fields: [
      { label: "Name", type: "Text" },
      { label: "Email", type: "Email" },
      { label: "Phone", type: "Phone" },
      { label: "Project Details", type: "Text" },
      { label: "Budget Range", type: "Text" }
    ],
    buttonText: "Request Quote"
  },
  {
    id: "event-registration",
    name: "Event Registration",
    description: "Captures attendee count and dietary needs for event sign-ups",
    usage: "Used by 4.9K businesses",
    iconBg: "#FCE7F3",
    iconColor: "#DB2777",
    icon: "ticket",
    fieldCount: "5 fields",
    fields: [
      { label: "Name", type: "Text" },
      { label: "Email", type: "Email" },
      { label: "Phone", type: "Phone" },
      { label: "Number of Attendees", type: "Number" },
      { label: "Dietary Requirements", type: "Text" }
    ],
    buttonText: "Register Now"
  }
];

interface DraggableStageProps {
  stage: Stage;
  index: number;
  totalStages?: number;
  moveStage: (dragIndex: number, hoverIndex: number) => void;
  onRemove: (stageId: string) => void;
  onEdit: (stage: Stage) => void;
}

export const CHEVRON_PALETTE = [
  "#3B82F6", // Royal Blue
  "#06B6D4", // Cyan
  "#10B981", // Emerald Green
  "#EF4444", // Coral Red
  "#F59E0B", // Amber
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#2563EB", // Cobalt Blue
];

interface ChevronStageItemProps {
  stage: Stage;
  index: number;
  totalStages: number;
  moveStage: (dragIndex: number, hoverIndex: number) => void;
  onRemove: (stageId: string) => void;
  onEdit: (stage: Stage) => void;
  onSelect: (stage: Stage) => void;
  isSelected?: boolean;
  isFirst: boolean;
  isLast: boolean;
  color?: string;
  isLastStage?: boolean;
}

const ChevronStageItem: React.FC<ChevronStageItemProps> = ({
  stage,
  index,
  totalStages,
  moveStage,
  onRemove,
  onEdit,
  onSelect,
  isSelected,
  isFirst,
  isLast,
  color,
  isLastStage,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: "STAGE",
    item: () => ({ index }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: "STAGE",
    hover(item: { index: number }, monitor) {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleX = (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      const hoverClientX = clientOffset.x - hoverBoundingRect.left;

      if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX) return;
      if (dragIndex > hoverIndex && hoverClientX > hoverMiddleX) return;

      moveStage(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  drag(drop(ref));

  const chevronClip = isFirst
    ? "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)"
    : "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)";

  return (
    <div
      ref={ref}
      onClick={() => onSelect(stage)}
      onDoubleClick={() => onEdit(stage)}
      className={`relative group flex items-center h-10 select-none cursor-pointer transition-all flex-shrink-0 ${
        isFirst ? "rounded-l-md" : "-ml-3.5"
      } ${isDragging ? "opacity-35 scale-95" : "opacity-100"} ${
        isOver ? "ring-2 ring-white scale-105 z-20" : ""
      } ${isSelected ? "brightness-110 shadow-md ring-2 ring-white/80 z-20 scale-[1.02]" : "hover:brightness-105 hover:z-10"}`}
      style={{
        backgroundColor: color || stage.color || CHEVRON_PALETTE[index % CHEVRON_PALETTE.length],
        clipPath: chevronClip,
        minWidth: "140px",
        paddingLeft: isFirst ? "14px" : "24px",
        paddingRight: "24px",
      }}
      title={`Stage: ${stage.name} (Drag to reorder, click to view, double click to edit)`}
    >
      {!isLast && (
        <svg
          className="absolute right-0 top-0 h-full w-[15px] pointer-events-none z-10"
          viewBox="0 0 15 40"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M 1 0 L 14 20 L 1 40"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      <div
        className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 mr-1 shrink-0 transition-colors text-white/70 group-hover:text-white"
        title="Drag to reorder"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      <span
        className="text-xs font-semibold tracking-wide truncate flex-1 text-center pr-1 flex items-center justify-center gap-1 text-white"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        {isLastStage && <span className="text-[10px] opacity-90">🏁</span>}
        <span className="truncate">{stage.name}</span>
      </span>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 -mr-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(stage);
          }}
          className="p-1 rounded transition-all text-white/80 hover:text-white hover:bg-black/20"
          title="Edit stage"
        >
          <Edit className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(stage.id);
          }}
          className="p-1 rounded transition-all text-white/80 hover:text-rose-200 hover:bg-rose-500/30"
          title="Delete stage"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

// Draggable Stage Component for Sidebar Cards
interface SidebarDraggableStageProps {
  processId: string;
  stage: Stage;
  index: number;
  totalStages?: number;
  isSelected: boolean;
  onSelect: () => void;
  onMoveStage: (processId: string, dragIndex: number, hoverIndex: number) => void;
}

const SidebarDraggableStage: React.FC<SidebarDraggableStageProps> = ({
  processId,
  stage,
  index,
  totalStages = 1,
  isSelected,
  onSelect,
  onMoveStage,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isFinal = totalStages > 0 && index === totalStages - 1;

  const [{ isDragging }, drag] = useDrag({
    type: "SIDEBAR_STAGE",
    item: (): { index: number; processId: string } => ({
      index,
      processId,
    }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: "SIDEBAR_STAGE",
    hover(item: { index: number; processId: string }, monitor) {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex || item.processId !== processId) {
        return;
      }

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      onMoveStage(processId, dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`group/stage w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all cursor-grab active:cursor-grabbing select-none ${
        isOver
          ? "bg-blue-100 ring-2 ring-blue-400 scale-[1.02]"
          : isSelected
          ? "bg-blue-50 text-blue-700 font-semibold border border-blue-200 shadow-xs"
          : "text-gray-700 hover:bg-gray-50 border border-transparent"
      } ${isDragging ? "opacity-30 scale-95" : ""}`}
      title="Drag to reorder stage or click to view details"
    >
      <GripVertical className="w-3.5 h-3.5 text-gray-400 group-hover/stage:text-gray-600 transition-colors shrink-0 cursor-grab" />
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: stage.color || (isFinal ? "#EC4899" : "#22D3EE") }}
      />
      <span className="flex-1 truncate font-medium">
        {stage.name}
      </span>
    </div>
  );
};

// Draggable Workflow Step Component
interface DraggableWorkflowStepProps {
  step: WorkflowStep;
  index: number;
  moveStep: (dragIndex: number, hoverIndex: number) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  StepIcon: React.ComponentType<{ iconKey: string }>;
  connectAfterLabel?: string;
}

const DraggableWorkflowStep: React.FC<DraggableWorkflowStepProps> = ({
  step,
  index,
  moveStep,
  onEdit,
  onDuplicate,
  onDelete,
  StepIcon,
  connectAfterLabel,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: 'WORKFLOW_STEP',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'WORKFLOW_STEP',
    hover: (item: { index: number }, monitor) => {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = (clientOffset?.y || 0) - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      moveStep(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-white cursor-pointer hover:bg-muted/10 transition-colors"
      style={{ opacity: isDragging ? 0.5 : 1 }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) {
          return;
        }
        onEdit();
      }}
    >
      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab flex-shrink-0" />
      <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#2563EB' }}>
        <StepIcon iconKey={step.iconKey} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>{step.name}</p>
        <p className="text-xs" style={{ color: '#94A3B8', fontFamily: 'Outfit, sans-serif' }}>
          {step.trigger === "incall"
            ? "→ Event Driven"
            : step.trigger === "postcall"
              ? `→ Event Driven · ${step.executionType === "parallel" ? "Parallel" : "Sequential"}${step.executionType !== "parallel" && step.delayValue
                ? ` (+${step.delayValue} ${step.delayUnit ?? "Minute"})`
                : ""
              }`
              : step.executionType === "parallel"
                ? "→ Parallel"
                : connectAfterLabel
                  ? `→ Sequential (${connectAfterLabel})`
                  : "→ Sequential"}
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          className="p-1.5 rounded hover:bg-muted/40 transition-colors"
          title="Duplicate"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
        >
          <Copy className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          className="p-1.5 rounded hover:bg-muted/40 transition-colors"
          title="Edit"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Pencil className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          className="p-1.5 rounded hover:bg-red-50 transition-colors"
          title="Delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </button>
      </div>
    </div>
  );
};
const INTENT_CONDITION_OPTIONS: Record<string, string[]> = {
  callhangup: [
    "Caller wants to end the call / says goodbye",
    "Caller asks to be removed from the calling list / stop being contacted",
    "Caller indicates this is a wrong number",
    "Caller is abusive, hostile, or uses inappropriate language",
    "Caller explicitly asks to hang up / end the call now",
    "Voicemail or answering machine detected (non-human)",
  ],
  callaction: [
    "Caller asks to speak with a human / representative / agent",
    "Caller asks for a manager or supervisor",
    "Caller wants the billing/accounts department",
    "Caller wants the sales department",
    "Caller wants technical support / service department",
    "Caller is frustrated, escalating, or expresses dissatisfaction with the AI",
    "Caller's issue is too complex/urgent for the AI to resolve",
  ],
  idlemessages: [
    "Caller has gone silent / unresponsive",
    "Caller sounds confused or hesitant",
    "Caller asks the AI to repeat or wait a moment",
    "Background noise/distraction detected, no clear response from caller",
  ],
  whatsapp: [
    "Caller asks for information to be sent via WhatsApp/text (menu, pricing, brochure, link)",
    "Caller requests a booking/scheduling link",
    "Caller wants order/appointment confirmation sent to their phone",
    "Caller confirms/shares their phone number for follow-up",
  ],
  sms: [
    "Caller asks for details to be texted (address, link, pricing, instructions)",
    "Caller requests appointment/booking confirmation via text",
    "Caller wants a reminder text sent",
    "Caller confirms/shares their phone number for follow-up",
  ],
  email: [
    "Caller asks for information to be emailed (quote, invoice, brochure, details)",
    "Caller wants a confirmation or receipt emailed",
    "Caller provides/confirms their email address for follow-up",
    "Caller requests documentation or forms via email",
  ],
  assignhuman: [
    "Client asks to speak with a human / representative / agent",
    "Client message indicates frustration or dissatisfaction",
    "Client's request is too complex for the AI to resolve via chat",
  ],
};

const STEP_ALLOWED_TRIGGERS: Record<string, Array<string>> = {
  "whatsapp": ["stage", "incall", "inchat", "postcall"],
  "sms": ["stage", "incall", "inchat", "postcall"],
  "email": ["stage", "incall", "inchat", "postcall"],
  "generate_invoice": ["stage", "postcall"],
  "send_payment": ["stage", "postcall"],
  "send-invoice": ["stage", "incall", "inchat", "postcall"],
  "processmovement": ["inchat", "postcall"],
  "movetonewprocess": ["stage", "inchat", "postcall"],
  "endworkflow": ["stage", "inchat", "postcall"],
  "fieldupdate": ["stage", "inchat", "postcall"],
  "assignhuman": ["stage", "inchat", "postcall"],
  "crmupdate": ["stage", "inchat", "postcall"],
  "ehrupdate": ["stage", "inchat", "postcall"],
  "wh_trigger": ["stage", "inchat", "postcall"],
  "webhook_trigger": ["stage", "inchat", "postcall"],
  "collectinformation": ["stage", "postcall"],
  "scheduleappointment": ["postcall"],
  "smartcallanalysis": ["stage", "postcall"],
  "greetingphrase": ["incall"],
  "bypasstohuman": ["incall"],
  "liveintaketicket": ["incall"],
  "callaction": ["incall"],
  "autohangupsilence": ["incall"],
  "idlemessages": ["incall"],
  "callhangup": ["incall"],
  "fetchavailability": ["incall"],
  "fetchfieldvalue": ["incall"],
  "managecalendar": ["incall", "postcall"],
};

const buildAvailablePredecessors = (steps: WorkflowStep[], lane: string, excludeId?: string) => {
  const laneSteps = steps.filter(s => (s.trigger ?? "stage") === lane && s.id !== excludeId);
  // Identify which step ids belong to a parallel group (>=2 consecutive parallel steps)
  const parallelMemberIds = new Set<string>();
  let i = 0;
  while (i < laneSteps.length) {
    if (laneSteps[i].executionType === "parallel") {
      let j = i;
      const run: string[] = [];
      while (j < laneSteps.length && laneSteps[j].executionType === "parallel") {
        run.push(laneSteps[j].id);
        j++;
      }
      if (run.length >= 2) run.forEach(id => parallelMemberIds.add(id));
      i = j;
    } else {
      i++;
    }
  }
  // Emit one entry per step; parallel members get a light "(Parallel)" suffix
  return laneSteps.map(s => ({
    id: s.id,
    label: parallelMemberIds.has(s.id) ? `${s.name} (Parallel)` : s.name,
    isParallelGroup: parallelMemberIds.has(s.id),
  }));
};

export default function AdminProcessTemplates() {
  const { getActiveProviders } = useAIProviders();
  const activeProviders = getActiveProviders();
  const { setCollapsed } = useSidebar();
  const navigate = useNavigate();
  const { activeOrganization: organization } = useOrganization();
  const { templates: adminProcessTemplates, instantiateProcessFromTemplate } = useProcessTemplates();


  const [processes, setProcesses] = useState<Process[]>(getStoredProcesses);

  useEffect(() => {
    saveStoredProcesses(processes);
  }, [processes]);

  // Entity dropdown filter state matching Client Workflow entities (no client entity; process, appointment, invoice, insurance, claim)
  const [selectedEntityFilter, setSelectedEntityFilter] = useState<string>("process");

  // Ensure default entity processes exist for all non-client entities
  useEffect(() => {
    setProcesses((prev) => {
      let changed = false;
      const copy = [...prev];
      const nonClientEntities: Array<Exclude<EntityType, "client">> = ["appointment", "invoice", "insurance", "claim"];
      for (const et of nonClientEntities) {
        if (!copy.some((p) => p.entityType === et)) {
          copy.push(DEFAULT_ENTITY_PROCESSES[et]);
          changed = true;
        }
      }
      return changed ? copy : prev;
    });
  }, []);

  // Entity counts for the dropdown matching Client Workflow modules
  const entityCounts = useMemo(() => {
    const counts = {
      all: processes.length,
      process: 0,
      appointment: 0,
      invoice: 0,
      insurance: 0,
      claim: 0,
    };
    processes.forEach((p) => {
      const ent = (p.entityType || "client").toLowerCase();
      if (ent === "appointment") counts.appointment++;
      else if (ent === "invoice") counts.invoice++;
      else if (ent === "insurance") counts.insurance++;
      else if (ent === "claim") counts.claim++;
      else counts.process++; // "client" and "process" map to Processes
    });
    return counts;
  }, [processes]);

  // Scope Filter states for Admin left panel
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("All");
  const [selectedIndustryFilter, setSelectedIndustryFilter] = useState<string>("All");
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>("All");

  const availableIndustriesForFilter = useMemo(() => {
    if (selectedCategoryFilter === "All") {
      return Array.from(new Set(INITIAL_INDUSTRIES.map((i) => i.name)));
    }
    return getIndustriesForCategory(selectedCategoryFilter);
  }, [selectedCategoryFilter]);

  const [searchQuery, setSearchQuery] = useState("");

  // Scope modal for editing existing process
  const [showProcessScopeModal, setShowProcessScopeModal] = useState(false);
  const [targetProcessForScope, setTargetProcessForScope] = useState<Process | null>(null);
  const [editProcessScopingRules, setEditProcessScopingRules] = useState<ScopingRule[]>([]);

  // Filtered processes based on entity dropdown, admin category, industry, and location filters + search query
  const filteredProcesses = useMemo(() => {
    return processes.filter((p) => {
      // 1. Entity Filter matching client workflow (Processes, Appointments, Invoices, Insurance, Claims)
      const ent = (p.entityType || "client").toLowerCase();
      const ruleEntities = (p.scopingRules || []).flatMap((r: any) => r.entities || []).map((e: string) => e.toLowerCase());
      const isProcessCategory = selectedEntityFilter === "process" || selectedEntityFilter === "client";
      const matchesEntity = isProcessCategory
        ? (ent === "process" || ent === "client" || ruleEntities.includes("process") || ruleEntities.includes("client"))
        : (ent === selectedEntityFilter.toLowerCase() || ruleEntities.includes(selectedEntityFilter.toLowerCase()));
      if (!matchesEntity) return false;

      // 2. Scope match
      const matchesScope = isProcessMatchingScope(p, {
        category: selectedCategoryFilter,
        industry: selectedIndustryFilter,
        location: selectedLocationFilter,
      });
      if (!matchesScope) return false;

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          p.stages.some((s) => s.name.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [processes, selectedEntityFilter, selectedCategoryFilter, selectedIndustryFilter, selectedLocationFilter, searchQuery]);

  // Modal scoping rules & permissions state
  const [modalScopingRules, setModalScopingRules] = useState<ScopingRule[]>([]);
  const [modalPermissions, setModalPermissions] = useState<ProcessPermissions>({
    canHide: true,
    canEdit: true,
    canAdd: true,
    canDelete: true,
  });
  const [modalAdminControlOpen, setModalAdminControlOpen] = useState(true);
  const [modalScopeDropdownOpen, setModalScopeDropdownOpen] = useState(true);
  const [modalPermissionsDropdownOpen, setModalPermissionsDropdownOpen] = useState(true);


  const { getAllFields } = useFieldRegistry();

  const [selectedProcess, setSelectedProcess] = useState<string | null>(null);

  // Sync selected process when filtered list changes
  useEffect(() => {
    if (filteredProcesses.length > 0) {
      if (!selectedProcess || !filteredProcesses.some((p) => p.id === selectedProcess)) {
        setSelectedProcess(filteredProcesses[0].id);
      }
    } else {
      setSelectedProcess(null);
    }
  }, [filteredProcesses, selectedProcess]);
  const [showProcessPreviewDrawer, setShowProcessPreviewDrawer] = useState(false);
  const [previewProcess, setPreviewProcess] = useState<Process | null>(null);
  const [previewDrawerTab, setPreviewDrawerTab] = useState<"general" | "activity" | "history" | "documents">("general");
  const [previewStageIdx, setPreviewStageIdx] = useState<number>(1);
  const [previewVisibleFieldKeys, setPreviewVisibleFieldKeys] = useState<string[]>([]);
  const [previewEditedValues, setPreviewEditedValues] = useState<Record<string, string>>({});
  const [previewEditingField, setPreviewEditingField] = useState<string | null>(null);
  const [previewShowResponsibleDropdown, setPreviewShowResponsibleDropdown] = useState(false);
  const [previewFieldManagerOpen, setPreviewFieldManagerOpen] = useState(false);
  const [previewFieldManagerMode, setPreviewFieldManagerMode] = useState<"select" | "create">("select");
  const [previewShowTeamMemberDrawer, setPreviewShowTeamMemberDrawer] = useState(false);
  const [previewSelectedTeamMember, setPreviewSelectedTeamMember] = useState<any>(null);

  const [previewHistoryFilters, setPreviewHistoryFilters] = useState<ProcessDetailHistoryFilterState>({
    showPopup: false,
    quickFilter: "all",
    eventTypeFilter: "all",
    createdByFilter: "all",
    dateFilter: "all",
    filtersActive: false,
    showAddFieldPopup: false,
    activeFilterFields: ["client", "channel", "action", "responsible"],
    selectedAddFields: [],
  });

  const previewTeamMembers = useMemo(() => [
    { id: "1", name: "John Smith", role: "Care Coordinator", email: "john.s@mantracare.com", phone: "+1 (555) 019-2834" },
    { id: "2", name: "Emily Watson", role: "Intake Specialist", email: "emily.w@mantracare.com", phone: "+1 (555) 019-5829" },
    { id: "3", name: "Dr. Sarah Chen", role: "Physician", email: "sarah.c@mantracare.com", phone: "+1 (555) 019-9182" },
  ], []);

  const previewClient = useMemo(() => {
    if (!previewProcess) return undefined;
    return {
      id: "preview-client-placeholder",
      name: "Client Data",
      email: "Client Data",
      phone: "Client Data",
      country: "Client Data",
      countryCode: "US",
      countryFlag: "🌐",
      processes: [previewProcess.name],
      responsible: "Responsible Person",
      source: "Client Data",
    } as any;
  }, [previewProcess]);

  const previewLog = useMemo(() => {
    if (!previewProcess) return null;
    const stages = previewProcess.stages || [];
    const currentStageName = stages[previewStageIdx - 1]?.name || stages[0]?.name || "Initial Contact";
    return {
      id: `preview-log-${previewProcess.id}`,
      client: "Client Data",
      clientId: "preview-client-placeholder",
      type: "Process Stage",
      status: "Active",
      process: previewProcess.name,
      processId: previewProcess.id,
      processName: previewProcess.name,
      currentStage: currentStageName,
      duration: "—",
      date: "—",
      hasRecording: false,
      hasTranscript: false,
      hasScheduledCall: false,
      relationshipReason: "Stage Change" as const,
      phone: "Client Data",
    };
  }, [previewProcess, previewStageIdx]);

  const previewActivity: ActivityLogEntry[] = useMemo(() => {
    // Admin workflow detail preview - no fake/sample activities
    return [];
  }, []);

  const [isEditingProcessInfo, setIsEditingProcessInfo] = useState(false);
  const [draftProcessName, setDraftProcessName] = useState("");
  const [draftProcessDescription, setDraftProcessDescription] = useState("");

  useEffect(() => {
    setIsEditingProcessInfo(false);
  }, [selectedProcess]);

  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [customApiIntegrations, setCustomApiIntegrations] = useState<any[]>([]);


  const [viewMode, setViewMode] = useState<"process" | "stage" | null>(null); // Track what we're viewing

  // Auto-select first process if none selected or if switching entity tabs
  useEffect(() => {
    if (filteredProcesses.length > 0) {
      const currentExists = filteredProcesses.some((p) => p.id === selectedProcess);
      if (!currentExists) {
        setSelectedProcess(filteredProcesses[0].id);
        setViewMode("process");
        setExpandedStage(null);
      }
    } else {
      setSelectedProcess(null);
    }
  }, [filteredProcesses, selectedProcess]);
  const [activeTab, setActiveTab] = useState<string>("general");
  const [expandedProcesses, setExpandedProcesses] = useState<string[]>(["1"]); // Expand Patient Intake by default
  const [selectedAIModel, setSelectedAIModel] = useState("Gemini 2.5 Flash");
  const [activeAIModels, setActiveAIModels] = useState<AIModelConfig[]>(getActiveAIModels);
  const [configuredVoices, setConfiguredVoices] = useState<VoiceConfigItem[]>(getStoredVoices);

  useEffect(() => {
    const handleVoiceUpdate = () => setConfiguredVoices(getStoredVoices());
    window.addEventListener(VOICE_STORE_EVENT, handleVoiceUpdate);
    window.addEventListener("storage", handleVoiceUpdate);
    return () => {
      window.removeEventListener(VOICE_STORE_EVENT, handleVoiceUpdate);
      window.removeEventListener("storage", handleVoiceUpdate);
    };
  }, []);

  useEffect(() => {
    const handleModelUpdate = () => {
      const active = getActiveAIModels();
      setActiveAIModels(active);
      if (!active.some((m) => m.name === selectedAIModel) && active.length > 0) {
        setSelectedAIModel(active[0].name);
      }
    };
    window.addEventListener(AI_MODELS_STORE_EVENT, handleModelUpdate);
    window.addEventListener("storage", handleModelUpdate);
    return () => {
      window.removeEventListener(AI_MODELS_STORE_EVENT, handleModelUpdate);
      window.removeEventListener("storage", handleModelUpdate);
    };
  }, [selectedAIModel]);

  const [aiModelExpanded, setAiModelExpanded] = useState(false);
  const [stageVoiceSpeed, setStageVoiceSpeed] = useState<number>(1.0);
  const [stageVoice, setStageVoice] = useState<string>("Ava");

  const activeConfiguredVoices = useMemo(() => {
    const active = configuredVoices.filter((v) => v.status === true);
    return active.length > 0 ? active : configuredVoices;
  }, [configuredVoices]);

  useEffect(() => {
    if (activeConfiguredVoices.length > 0 && !activeConfiguredVoices.some((v) => v.name === stageVoice)) {
      setStageVoice(activeConfiguredVoices[0].name);
    }
  }, [activeConfiguredVoices, stageVoice]);

  // Advanced tab section states
  // Retry Rules state
  const [retryRulesExpanded, setRetryRulesExpanded] = useState(false);
  const [retryRulesEnabled, setRetryRulesEnabled] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState<number>(3);
  const [retryDelay, setRetryDelay] = useState<number>(30);
  const [retryFallbackStage, setRetryFallbackStage] = useState<string>("Do Nothing");

  // Skip Day Rules state
  const [skipDayRulesExpanded, setSkipDayRulesExpanded] = useState(false);
  const [skipDayRulesEnabled, setSkipDayRulesEnabled] = useState(false);
  const [weeklyOffDays, setWeeklyOffDays] = useState<string[]>(["Sun", "Sat"]);
  const [customOffDate, setCustomOffDate] = useState<string>("");
  const [customOffDatesList, setCustomOffDatesList] = useState<string[]>([]);

  // Detect Voicemail state
  const [detectVoicemailExpanded, setDetectVoicemailExpanded] = useState(false);
  const [detectVoicemailEnabled, setDetectVoicemailEnabled] = useState(false);
  const [webhooksEnabled, setWebhooksEnabled] = useState(false);
  const [aiSettingsEnabled, setAISettingsEnabled] = useState(false);

  // Auto Hangup after interaction / Silence / Idle Messages state variables
  const [autoHangupInteractionExpanded, setAutoHangupInteractionExpanded] = useState(false);
  const [autoHangupInteractionEnabled, setAutoHangupInteractionEnabled] = useState(false);
  const [autoHangupInteractionMessage, setAutoHangupInteractionMessage] = useState("");
  const [callHangupMessage, setCallHangupMessage] = useState("");

  const [autoHangupSilenceStageExpanded, setAutoHangupSilenceStageExpanded] = useState(false);
  const [autoHangupSilenceStageEnabled, setAutoHangupSilenceStageEnabled] = useState(false);
  const [autoHangupSilenceStageDuration, setAutoHangupSilenceStageDuration] = useState(5);

  const [idleMessagesStageExpanded, setIdleMessagesStageExpanded] = useState(false);
  const [idleMessagesStageEnabled, setIdleMessagesStageEnabled] = useState(false);
  const [idleMessageStageText, setIdleMessageStageText] = useState("");
  const [idleMessageStageDelay, setIdleMessageStageDelay] = useState(10);
  const [idleHangupMessageStage, setIdleHangupMessageStage] = useState("");
  const [idleHangupDelayStage, setIdleHangupDelayStage] = useState(20);

  // Call Duration state variables
  const [callDurationExpanded, setCallDurationExpanded] = useState(false);
  const [callDurationMinutes, setCallDurationMinutes] = useState(5);
  const [hangupWindowMinutes, setHangupWindowMinutes] = useState(1);

  // Skip day rules state
  const [selectedOffDays, setSelectedOffDays] = useState<string[]>(["Sat", "Sun"]);
  const [customOffDates, setCustomOffDates] = useState<string[]>([]);

  // Business Hours state
  const [businessHoursExpanded, setBusinessHoursExpanded] = useState(false);
  const [businessHoursEnabled, setBusinessHoursEnabled] = useState(false);
  const [businessHoursTimezone, setBusinessHoursTimezone] = useState("America/New_York");
  const [businessHoursByDay, setBusinessHoursByDay] = useState<Record<string, { enabled: boolean; start: string; end: string }>>({
    Mon: { enabled: true, start: "09:00", end: "17:00" },
    Tue: { enabled: true, start: "09:00", end: "17:00" },
    Wed: { enabled: true, start: "09:00", end: "17:00" },
    Thu: { enabled: true, start: "09:00", end: "17:00" },
    Fri: { enabled: true, start: "09:00", end: "17:00" },
    Sat: { enabled: false, start: "09:00", end: "17:00" },
    Sun: { enabled: false, start: "09:00", end: "17:00" },
  });
  const [outsideHoursAction, setOutsideHoursAction] = useState<"queue" | "voicemail" | "message">("message");
  const [outsideHoursMessage, setOutsideHoursMessage] = useState("We're currently closed. Our business hours are Monday to Friday, 9 AM to 5 PM.");

  // Inbound source state
  const [inboundNumbers, setInboundNumbers] = useState<string[]>(["+1 (555) 123-4567", "+1 (555) 987-6543", "+1 (555) 555-1234"]);
  const [selectedInboundNumbers, setSelectedInboundNumbers] = useState<string[]>(["+1 (555) 123-4567"]);
  const [stageType, setStageType] = useState<string>("AI Receives Calls");
  const [selectedStageChannels, setSelectedStageChannels] = useState<string[]>(["calls"]);
  const [channelSources, setChannelSources] = useState<StageChannelSource[]>([
    { id: "cs-1", channel: "calls", source: "+1 (555) 123-4567" },
  ]);
  const [showAddNumberModal, setShowAddNumberModal] = useState(false);
  const [newNumber, setNewNumber] = useState("");
  const [selectedCountryCode, setSelectedCountryCode] = useState("+1");
  const [showNumberDropdown, setShowNumberDropdown] = useState(false);
  const [showChannelDropdown, setShowChannelDropdown] = useState(false);
  const channelDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showChannelDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (
        channelDropdownRef.current &&
        !channelDropdownRef.current.contains(target) &&
        !target.closest('[role="listbox"]') &&
        !target.closest('[role="option"]') &&
        !target.closest('[data-radix-popper-content-wrapper]') &&
        !target.closest('[data-radix-portal]')
      ) {
        setShowChannelDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showChannelDropdown]);

  // AI Default Settings state
  const [aiDefaultSettingsExpanded, setAiDefaultSettingsExpanded] = useState(false);

  // Advanced Settings state
  const [advancedSettingsExpanded, setAdvancedSettingsExpanded] = useState(false);
  const [autoHangupExpanded, setAutoHangupExpanded] = useState(false);
  const [autoHangupSilenceExpanded, setAutoHangupSilenceExpanded] = useState(false);
  const [idleMessagesExpanded, setIdleMessagesExpanded] = useState(false);
  const [timeControlExpanded, setTimeControlExpanded] = useState(false);
  const [maxUsageLimitExpanded, setMaxUsageLimitExpanded] = useState(false);
  const [maxCallDurationExpanded, setMaxCallDurationExpanded] = useState(false);
  const [bypassToHumanExpanded, setBypassToHumanExpanded] = useState(false);
  const [blockedNumbersExpanded, setBlockedNumbersExpanded] = useState(false);
  const [smsBotSpammersExpanded, setSmsBotSpammersExpanded] = useState(false);

  // Transfer & Routing state
  const [extensionDigitsExpanded, setExtensionDigitsExpanded] = useState(false);
  const [allowVoicemailsExpanded, setAllowVoicemailsExpanded] = useState(false);
  const [bulkTransfersExpanded, setBulkTransfersExpanded] = useState(false);
  const [extensionEntries, setExtensionEntries] = useState<Array<{ id: number; extension: string; countryCode: string; phoneNumber: string }>>([]);
  const [savedExtensionEntries, setSavedExtensionEntries] = useState<Array<{ id: number; extension: string; countryCode: string; phoneNumber: string }>>([]);

  // Stage detail view state
  const [autoHangupMessage, setAutoHangupMessage] = useState("");
  const [autoHangupSilenceDuration, setAutoHangupSilenceDuration] = useState(1);
  const [idleMessage, setIdleMessage] = useState("");
  const [idleHangupMessage, setIdleHangupMessage] = useState("");
  const [savedTimeControlIntervals, setSavedTimeControlIntervals] = useState<Array<{ id: number; startTime: string; endTime: string; phoneNumber: string; countryCode: string }>>([]);
  const [timeControlIntervals, setTimeControlIntervals] = useState<Array<{ id: number; startTime: string; endTime: string; phoneNumber: string; countryCode: string }>>([]);
  const [maxUsageLimitEnabled, setMaxUsageLimitEnabled] = useState(false);
  const [maxUsageLimitEmails, setMaxUsageLimitEmails] = useState(["", "", ""]);
  const [maxUsageLimitValue, setMaxUsageLimitValue] = useState("");
  const [maxCallDuration, setMaxCallDuration] = useState(1);
  const [customEndingMessage, setCustomEndingMessage] = useState("");
  const [bypassToHumanEditMode, setBypassToHumanEditMode] = useState(false);
  const [bypassToHumanNumbers, setBypassToHumanNumbers] = useState<Array<{ id: number; phoneNumber: string; countryCode: string }>>([]);
  const [bypassStepNumbers, setBypassStepNumbers] = useState<Array<{ id: number; phoneNumber: string; countryCode: string }>>([{ id: 1, phoneNumber: "", countryCode: "+1" }]);
  const [blockedNumbers, setBlockedNumbers] = useState<Array<{ id: number; phoneNumber: string; countryCode: string }>>([]);
  const [landlineSmsPromptMessage, setLandlineSmsPromptMessage] = useState("");
  const [roboCallDetectionEnabled, setRoboCallDetectionEnabled] = useState(true);
  const [showTemporaryDisableModal, setShowTemporaryDisableModal] = useState(false);
  const [temporaryDisableEnabled, setTemporaryDisableEnabled] = useState(false);
  const [forwardCallsEnabled, setForwardCallsEnabled] = useState(false);
  const [forwardPhoneNumber, setForwardPhoneNumber] = useState("");
  const [forwardCountryCode, setForwardCountryCode] = useState("+1");

  // Basic Settings state variables
  const [expandedBasicSetting, setExpandedBasicSetting] = useState<string | null>(null);
  const [isEditingGreeting, setIsEditingGreeting] = useState(false);
  const [greetingPhrase, setGreetingPhrase] = useState("Hi, this is Alex from Mantra Care Health, who do I have the pleasure of speaking with today?");

  // Stage configuration state
  const [whenToMove, setWhenToMove] = useState<string>("");
  const [callerPitch, setCallerPitch] = useState<string>("Hi, I'm calling from [Your Business Name] to follow up on your recent inquiry. We'd love to help you get started with our services. Is now a good time to talk?");
  const [outboundCallingEnabled, setOutboundCallingEnabled] = useState<boolean>(true);
  const [responsiblePerson, setResponsiblePerson] = useState<string>("");

  // CHANGE 1: Collapsible sections state
  const [workflowStepsExpanded, setWorkflowStepsExpanded] = useState(true);
  const [workflowStepsDrawerOpen, setWorkflowStepsDrawerOpen] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [workflowStepCategory, setWorkflowStepCategory] = useState("all");
  const [workflowStepSearch, setWorkflowStepSearch] = useState("");
  const [selectedWorkflowStepCard, setSelectedWorkflowStepCard] = useState<string | null>(null);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  const [stepDetailDrawerOpen, setStepDetailDrawerOpen] = useState(false);
  const [currentEditingStep, setCurrentEditingStep] = useState<WorkflowStep | null>(null);

  // Load persisted stage config whenever the selected stage changes
  useEffect(() => {
    if (!selectedProcess || !expandedStage || viewMode !== "stage") return;
    const proc = processes.find((p) => p.id === selectedProcess);
    const stg = proc?.stages.find((s) => s.id === expandedStage);
    if (!stg) return;
    setStageType(stg.stageType ?? "AI Receives Calls");
    setSelectedInboundNumbers(stg.selectedInboundNumbers ?? ["+1 (555) 123-4567"]);
    setSelectedStageChannels(stg.selectedStageChannels ?? ["calls"]);

    if (stg.channelSources && stg.channelSources.length > 0) {
      setChannelSources(stg.channelSources);
    } else {
      const defaultNum = (stg.selectedInboundNumbers && stg.selectedInboundNumbers[0]) || inboundNumbers[0] || "+1 (555) 123-4567";
      const legacyChannels = stg.selectedStageChannels || ["calls"];
      const initialSources: StageChannelSource[] = legacyChannels.map((ch, idx) => ({
        id: `cs-init-${idx}`,
        channel: (ch === "whatsapp" || ch === "sms" || ch === "website" || ch === "calls") ? (ch as any) : "calls",
        source: ch === "website" ? "" : defaultNum,
      }));
      setChannelSources(initialSources.length > 0 ? initialSources : [{ id: "cs-1", channel: "calls", source: defaultNum }]);
    }

    setResponsiblePerson(stg.responsiblePerson ?? "");
    setWhenToMove(stg.whenToMove ?? "");
    setCallerPitchMode(stg.callerPitchMode ?? "single");
    setCallerPitch(stg.callerPitch ?? "Hi, I'm calling from [Your Business Name] to follow up on your recent inquiry. We'd love to help you get started with our services. Is now a good time to talk?");
    setGreetingIntroMessage(stg.greetingIntroMessage ?? "");
    setObjectiveText(stg.objectiveText ?? "");
    setBusinessInfoItems(stg.businessInfoItems ?? []);
    setPrimaryLanguage(stg.primaryLanguage ?? "");
    setSecondaryLanguages(stg.secondaryLanguages ?? []);
    setWorkflowSteps(stg.workflowSteps ?? []);
    setEnableCalling(stg.enableCalling ?? true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProcess, expandedStage, viewMode]);

  // Auto-persist workflowSteps immediately (only discrete drawer-save changes, safe to auto-save)
  useEffect(() => {
    if (!selectedProcess || !expandedStage || viewMode !== "stage") return;
    setProcesses((prev) =>
      prev.map((p) =>
        p.id !== selectedProcess
          ? p
          : {
            ...p,
            stages: p.stages.map((s) =>
              s.id !== expandedStage ? s : { ...s, workflowSteps }
            ),
          }
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowSteps]);

  useEffect(() => {
    if (stepDetailDrawerOpen && currentEditingStep?.stepKey === "wh_trigger") {
      try {
        setCustomApiIntegrations(JSON.parse(localStorage.getItem('customApiIntegrations') || '[]'));
      } catch (e) {
        console.error(e);
      }
    }
  }, [stepDetailDrawerOpen, currentEditingStep]);

  // Webhook integrations (session-only, synced from localStorage when drawer opens)
  const [customWebhookIntegrations, setCustomWebhookIntegrations] = useState<any[]>([]);

  useEffect(() => {
    if (stepDetailDrawerOpen && currentEditingStep?.stepKey === "webhook_trigger") {
      try {
        setCustomWebhookIntegrations(JSON.parse(localStorage.getItem('customWebhookIntegrations') || '[]'));
      } catch (e) {
        console.error(e);
      }
    }
  }, [stepDetailDrawerOpen, currentEditingStep]);
  const [isCreatingNewStep, setIsCreatingNewStep] = useState(false);
  const [executionTimingModalOpen, setExecutionTimingModalOpen] = useState(false);
  const [executionType, setExecutionType] = useState<"wait" | "parallel">("wait");
  const [delayValue, setDelayValue] = useState(5);
  const [delayUnit, setDelayUnit] = useState("Minute");
  const [conditions, setConditions] = useState<Array<{ id: string; fieldSource: string; field: string; operator: string; value: string }>>([
    { id: "cond-1", fieldSource: "", field: "", operator: "", value: "" }
  ]);
  const [conditionOperators, setConditionOperators] = useState<Array<"AND" | "OR">>([]);

  // In-Call split condition groups
  const [fieldConditions, setFieldConditions] = useState<Array<{ id: string; fieldSource: string; field: string; operator: string; value: string }>>([]);
  const [fieldConditionOperators, setFieldConditionOperators] = useState<Array<"AND" | "OR">>([]);
  const [fieldConditionsGroupExpanded, setFieldConditionsGroupExpanded] = useState(true);
  const [fieldExpandedCardIndex, setFieldExpandedCardIndex] = useState<number | null>(null);
  const [intentConditions, setIntentConditions] = useState<Array<{ id: string; value: string }>>([]);
  const [intentConditionOperators, setIntentConditionOperators] = useState<Array<"AND" | "OR">>([]);
  const [intentConditionsGroupExpanded, setIntentConditionsGroupExpanded] = useState(true);
  const [intentExpandedCardIndex, setIntentExpandedCardIndex] = useState<number | null>(null);
  const [intentInput, setIntentInput] = useState("");
  const [stepDetailProcess, setStepDetailProcess] = useState<string>("Select process...");
  const [stepDetailStage, setStepDetailStage] = useState<string>("Select stage...");
  const [stepEndCurrentProcess, setStepEndCurrentProcess] = useState<boolean>(false);
  const [movementTargetExpanded, setMovementTargetExpanded] = useState(true);
  const [actionConfigExpanded, setActionConfigExpanded] = useState(true);
  const [parametersExpanded, setParametersExpanded] = useState(true);
  const [assignHumanSearch, setAssignHumanSearch] = useState<string>("");
  const [callActionTransferType, setCallActionTransferType] = useState<"human" | "agent">("human");
  const [callActionCountryCode, setCallActionCountryCode] = useState<string>("+1");
  const [callActionPhoneNumber, setCallActionPhoneNumber] = useState<string>("");
  const [callActionAgentId, setCallActionAgentId] = useState<string>("");
  const [callActionReason, setCallActionReason] = useState<string>("");
  const [callActionVoiceResponse, setCallActionVoiceResponse] = useState<string>("Please hold while I transfer your call");
  const [callActionExtension, setCallActionExtension] = useState<string>("");

  // Fetch Availability states
  const [fetchAvailCalendarUser, setFetchAvailCalendarUser] = useState<string>("");
  const [fetchAvailDateSource, setFetchAvailDateSource] = useState<string>("");
  const [fetchAvailTimeSource, setFetchAvailTimeSource] = useState<string>("");
  const [fetchAvailSummary, setFetchAvailSummary] = useState<string>("");

  // Fetch Field Value states
  const [fetchFieldSource, setFetchFieldSource] = useState<string>("");
  const [fetchFieldSelected, setFetchFieldSelected] = useState<string>("");
  const [fetchFieldReason, setFetchFieldReason] = useState<string>("");

  // Manage Calendar states
  const [calendarMode, setCalendarMode] = useState<"book" | "reschedule" | "cancel">("book");
  const [calendarMeetingId, setCalendarMeetingId] = useState<string>("");
  const [calendarConnected, setCalendarConnected] = useState<string>("");
  const [calendarDate, setCalendarDate] = useState<string>("");
  const [calendarTime, setCalendarTime] = useState<string>("");
  const [calendarAppointmentField, setCalendarAppointmentField] = useState<string>("");


  // Field Update states
  const [fieldUpdateBlocks, setFieldUpdateBlocks] = useState<Array<{ fieldType: string; fieldToEdit: string; valueSource: "static" | "variable"; updateValue: string }>>([
    { fieldType: "System Fields", fieldToEdit: "Select field...", valueSource: "static", updateValue: "" }
  ]);
  const [expandedBlockIndex, setExpandedBlockIndex] = useState<number | null>(0);

  // Assign to Human / Call Action states
  const [assignedUser, setAssignedUser] = useState<string>("Select user...");

  // WhatsApp / SMS / Email states
  const [templateId, setTemplateId] = useState<string>("");
  const [smsMessage, setSmsMessage] = useState("");
  const [websiteNotificationMessage, setWebsiteNotificationMessage] = useState("");
  const [whatsappTemplate, setWhatsappTemplate] = useState("");
  const [whatsappTemplateIdentifier, setWhatsappTemplateIdentifier] = useState("");
  const [whatsappSource, setWhatsappSource] = useState<"template" | "campaign" | "chatbot">("template");
  const [whatsappCampaignId, setWhatsappCampaignId] = useState<string>("");
  const [whatsappChatbotId, setWhatsappChatbotId] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState("");
  const [webhookHeaderTypes, setWebhookHeaderTypes] = useState<string[]>(["Static"]);

  // CRM Update states
  const [crmName, setCrmName] = useState<string>("Select CRM...");
  const [crmField, setCrmField] = useState<string>("Select field...");

  // EHR Update states
  const [ehrName, setEhrName] = useState<string>("Select EHR...");
  const [ehrField, setEhrField] = useState<string>("Select field...");

  // Webhook states
  const [webhookUrl, setWebhookUrl] = useState<string>("");
  const [webhookHeaders, setWebhookHeaders] = useState<Array<{ id: string; key: string; value: string }>>([{ id: "header-1", key: "", value: "" }]);
  const [webhookBody, setWebhookBody] = useState<string>("");

  // API states
  const [apiEndpoint, setApiEndpoint] = useState<string>("");
  const [apiMethod, setApiMethod] = useState<string>("GET");
  const [apiAuth, setApiAuth] = useState<string>("");
  const [apiHeaders, setApiHeaders] = useState<Array<{ id: string; key: string; value: string }>>([{ id: "header-1", key: "", value: "" }]);

  // New Webhook states
  const [webhookIntegration, setWebhookIntegration] = useState<string>("");
  const [webhookAction, setWebhookAction] = useState<string>("");
  const [webhookSelectedFields, setWebhookSelectedFields] = useState<string[]>([]);
  const [webhookUpdateRows, setWebhookUpdateRows] = useState<Array<{ fieldKey: string; value: string }>>([{ fieldKey: "", value: "" }]);
  const [webhookCreateRows, setWebhookCreateRows] = useState<Array<{ fieldName: string; value: string }>>([{ fieldName: "", value: "" }]);
  const [webhookPayloadMode, setWebhookPayloadMode] = useState<"fields" | "json">("fields");
  const [webhookJsonBody, setWebhookJsonBody] = useState<string>("");
  const [webhookJsonError, setWebhookJsonError] = useState<string>("");
  const [webhookReplaceRows, setWebhookReplaceRows] = useState<Array<{ existingFieldKey: string; newFieldName: string; newValue: string }>>([{ existingFieldKey: "", newFieldName: "", newValue: "" }]);


  // New API states
  const [apiIntegration, setApiIntegration] = useState<string>("");
  const [apiAction, setApiAction] = useState<string>("");
  const [apiResponseVariable, setApiResponseVariable] = useState<string>("");
  const [apiUpdatePolicy, setApiUpdatePolicy] = useState<string>("Ask me first");
  const [apiTimeout, setApiTimeout] = useState<number>(3);
  const [apiOnFailure, setApiOnFailure] = useState<string>("Continue call");

  // StepParametersFields — API integration fields
  const [apiSelectedIntegrationId, setApiSelectedIntegrationId] = useState<string>("");
  const [apiCreateFields, setApiCreateFields] = useState<Array<{ fieldKey: string; fieldLabel: string; value: string }>>([]);
  const [apiUpdateFields, setApiUpdateFields] = useState<Array<{ fieldKey: string; fieldLabel: string; value: string }>>([]);
  const [apiReplaceFields, setApiReplaceFields] = useState<Array<{ existingFieldKey: string; newFieldName: string; newValue: string }>>([]);
  const [apiDeleteField, setApiDeleteField] = useState<string>("");

  // StepParametersFields — Webhook integration fields
  const [webhookSelectedIntegrationId, setWebhookSelectedIntegrationId] = useState<string>("");
  const [webhookParsedFields, setWebhookParsedFields] = useState<Array<{ key: string; value: string }>>([]);

  // Dropdown open states
  const [webhookIntOpen, setWebhookIntOpen] = useState(false);
  const [webhookActionOpen, setWebhookActionOpen] = useState(false);
  const [webhookIntPos, setWebhookIntPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [webhookActionPos, setWebhookActionPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Close webhookInt dropdown on scroll or resize
  useEffect(() => {
    if (!webhookIntOpen) return;
    const handleScroll = (e: Event) => {
      if (webhookIntDropdownRef.current?.contains(e.target as Node)) return;
      setWebhookIntOpen(false);
      setWebhookIntPos(null);
    };
    const handleResize = () => { setWebhookIntOpen(false); setWebhookIntPos(null); };
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [webhookIntOpen]);

  // Close webhookAction dropdown on scroll or resize
  useEffect(() => {
    if (!webhookActionOpen) return;
    const handleScroll = (e: Event) => {
      if (webhookActionDropdownRef.current?.contains(e.target as Node)) return;
      setWebhookActionOpen(false);
      setWebhookActionPos(null);
    };
    const handleResize = () => { setWebhookActionOpen(false); setWebhookActionPos(null); };
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [webhookActionOpen]);
  const [apiIntOpen, setApiIntOpen] = useState(false);
  const [apiActionOpen, setApiActionOpen] = useState(false);

  // Appointment states
  const [appointmentUser, setAppointmentUser] = useState<string>("Select from Team Calendar...");
  const [appointmentDetails, setAppointmentDetails] = useState<string>("Appointment Time");
  const [appointmentBookingMethod, setAppointmentBookingMethod] = useState<string>("");

  const [conditionsEnabled, setConditionsEnabled] = useState(false);
  const [conditionsSectionExpanded, setConditionsSectionExpanded] = useState(true);
  const [expandedConditionIndex, setExpandedConditionIndex] = useState<number | null>(0);
  const [conditionPreview, setConditionPreview] = useState("");

  const [stepTrigger, setStepTrigger] = useState<string>("stage");
  const [connectAfterId, setConnectAfterId] = useState<string | undefined>(undefined);
  const [stepActionName, setStepActionName] = useState("");
  const [stepActionReason, setStepActionReason] = useState("");

  // If Condition branch state
  const [ifCondField, setIfCondField] = useState("Stage Name");
  const [ifCondOperator, setIfCondOperator] = useState("Equal To");
  const [ifCondValue, setIfCondValue] = useState("");
  const [trueBranchSteps, setTrueBranchSteps] = useState<WorkflowStep[]>([]);
  const [falseBranchSteps, setFalseBranchSteps] = useState<WorkflowStep[]>([]);
  const [trueBranchExpanded, setTrueBranchExpanded] = useState(true);
  const [falseBranchExpanded, setFalseBranchExpanded] = useState(true);
  const [branchAddTarget, setBranchAddTarget] = useState<"true" | "false" | null>(null);

  useEffect(() => {
    if (!currentEditingStep?.stepKey) return;
    const allowed = STEP_ALLOWED_TRIGGERS[currentEditingStep.stepKey] ?? ["stage", "incall", "postcall"];
    if (!allowed.includes(stepTrigger)) {
      setStepTrigger(allowed[0]);
    }
  }, [currentEditingStep?.stepKey, stepTrigger]);

  // Email / CRM / EHR state — declared here so stateGetters/stateSetters can reference them
  const [showCustomEmail, setShowCustomEmail] = useState(false);
  const [emailConnectedAccount, setEmailConnectedAccount] = useState("");
  const [emailHtmlBody, setEmailHtmlBody] = useState("");
  const [htmlBodyViewMode, setHtmlBodyViewMode] = useState<"code" | "preview">("code");
  const [emailRichBody, setEmailRichBody] = useState("");
  const [crmUpdateValue, setCrmUpdateValue] = useState("");
  const [ehrUpdateValue, setEhrUpdateValue] = useState("");

  // Ticket / Collect Info / Call Analysis states — declared here so stateGetters/stateSetters can reference them
  const [ticketChecklist, setTicketChecklist] = useState<{ id: string; text: string }[]>([{ id: "check-1", text: "" }]);
  const [ticketEntries, setTicketEntries] = useState<Array<{
    taskName: string; taskDesc: string; assignee: string; deadline: string; priority: string;
    clientEmail: string; clientNumber: string; pauseProcess: string;
    checklist: { id: string; text: string }[];
  }>>([{
    taskName: "", taskDesc: "", assignee: "", deadline: "", priority: "Normal",
    clientEmail: "", clientNumber: "", pauseProcess: "No", checklist: [{ id: "check-1", text: "" }]
  }]);

  const [collectInfoSelectedForm, setCollectInfoSelectedForm] = useState<string>("");
  const [showCollectInfoDropdown, setShowCollectInfoDropdown] = useState(false);

  const [callAnalysisEnabled, setCallAnalysisEnabled] = useState(true);
  const [callAnalysisScenarios, setCallAnalysisScenarios] = useState<Array<{
    id: number;
    name: string;
    description: string;
    dataFormat: string;
  }>>([]);

  // Maps each stepKey to the list of state-variable names whose values should be
  // captured into WorkflowStep.params on save, and restored from WorkflowStep.params
  // on edit. Keep this in sync whenever a new parameter field is added to any step type.
  // Condition fields persisted for every step type
  const CONDITION_FIELDS = [
    "conditionsEnabled", "conditions", "conditionOperators",
    "fieldConditions", "fieldConditionOperators",
    "intentConditions", "intentConditionOperators",
  ];

  const STEP_PARAM_FIELDS: Record<string, string[]> = {
    fieldupdate: ["fieldUpdateBlocks", ...CONDITION_FIELDS],
    assignhuman: ["assignedUser", ...CONDITION_FIELDS],
    callaction: [
      "callActionTransferType", "callActionCountryCode", "callActionPhoneNumber",
      "callActionAgentId", "callActionReason", "callActionVoiceResponse", "callActionExtension",
      ...CONDITION_FIELDS,
    ],
    whatsapp: ["whatsappSource", "whatsappTemplate", "whatsappTemplateIdentifier", "whatsappCampaignId", "whatsappChatbotId", "websiteNotificationMessage", ...CONDITION_FIELDS],
    sms: ["smsMessage", "websiteNotificationMessage", ...CONDITION_FIELDS],
    email: [
      "emailConnectedAccount", "showCustomEmail", "emailSubject",
      "emailRichBody", "emailHtmlBody", "htmlBodyViewMode",
      ...CONDITION_FIELDS,
    ],
    crmupdate: ["crmName", "crmField", "crmUpdateValue", ...CONDITION_FIELDS],
    ehrupdate: ["ehrName", "ehrField", "ehrUpdateValue", ...CONDITION_FIELDS],
    wh_trigger: [
      "apiSelectedIntegrationId", "apiAction", "apiCreateFields",
      "apiUpdateFields", "apiReplaceFields",
      "apiDeleteField",
      ...CONDITION_FIELDS,
    ],
    webhook_trigger: ["webhookSelectedIntegrationId", "webhookParsedFields", ...CONDITION_FIELDS],
    fetchavailability: ["fetchAvailCalendarUser", "fetchAvailDateSource", "fetchAvailTimeSource", "fetchAvailSummary", ...CONDITION_FIELDS],
    fetchfieldvalue: ["fetchFieldSource", "fetchFieldSelected", "fetchFieldReason", ...CONDITION_FIELDS],
    managecalendar: ["calendarMode", "calendarMeetingId", "calendarConnected", "calendarDate", "calendarTime", ...CONDITION_FIELDS],
    processmovement: ["stepDetailProcess", "stepDetailStage", ...CONDITION_FIELDS],
    movetonewprocess: ["stepDetailProcess", "stepDetailStage", ...CONDITION_FIELDS],
    stagemovement: ["stepDetailProcess", "stepDetailStage", ...CONDITION_FIELDS],
    greetingphrase: ["greetingPhrase", ...CONDITION_FIELDS],
    bypasstohuman: ["bypassStepNumbers", ...CONDITION_FIELDS],
    liveintaketicket: ["ticketEntries", ...CONDITION_FIELDS],
    collectinformation: ["collectInfoSelectedForm", ...CONDITION_FIELDS],
    scheduleappointment: ["appointmentBookingMethod", ...CONDITION_FIELDS],
    smartcallanalysis: ["callAnalysisScenarios", ...CONDITION_FIELDS],
    autohangupsilence: ["autoHangupSilenceStageDuration", ...CONDITION_FIELDS],
    callhangup: ["callHangupMessage", ...CONDITION_FIELDS],
    idlemessages: ["idleMessageStageText", "idleMessageStageDelay", "idleHangupMessageStage", "idleHangupDelayStage", ...CONDITION_FIELDS],
  };

  const stateGetters: Record<string, () => any> = {
    fieldUpdateBlocks: () => fieldUpdateBlocks,
    assignedUser: () => assignedUser,
    callActionTransferType: () => callActionTransferType,
    callActionCountryCode: () => callActionCountryCode,
    callActionPhoneNumber: () => callActionPhoneNumber,
    callActionAgentId: () => callActionAgentId,
    callActionReason: () => callActionReason,
    callActionVoiceResponse: () => callActionVoiceResponse,
    callActionExtension: () => callActionExtension,
    whatsappSource: () => whatsappSource,
    whatsappTemplate: () => whatsappTemplate,
    whatsappTemplateIdentifier: () => whatsappTemplateIdentifier,
    whatsappCampaignId: () => whatsappCampaignId,
    whatsappChatbotId: () => whatsappChatbotId,
    smsMessage: () => smsMessage,
    websiteNotificationMessage: () => websiteNotificationMessage,
    emailConnectedAccount: () => emailConnectedAccount,
    showCustomEmail: () => showCustomEmail,
    emailSubject: () => emailSubject,
    emailRichBody: () => emailRichBody,
    emailHtmlBody: () => emailHtmlBody,
    htmlBodyViewMode: () => htmlBodyViewMode,
    crmName: () => crmName,
    crmField: () => crmField,
    crmUpdateValue: () => crmUpdateValue,
    ehrName: () => ehrName,
    ehrField: () => ehrField,
    ehrUpdateValue: () => ehrUpdateValue,
    webhookIntegration: () => webhookIntegration,
    webhookAction: () => webhookAction,
    webhookSelectedFields: () => webhookSelectedFields,
    webhookUpdateRows: () => webhookUpdateRows,
    webhookCreateRows: () => webhookCreateRows,
    webhookReplaceRows: () => webhookReplaceRows,
    webhookPayloadMode: () => webhookPayloadMode,
    webhookJsonBody: () => webhookJsonBody,
    apiSelectedIntegrationId: () => apiSelectedIntegrationId,
    apiAction: () => apiAction,
    apiCreateFields: () => apiCreateFields,
    apiUpdateFields: () => apiUpdateFields,
    apiReplaceFields: () => apiReplaceFields,
    apiDeleteField: () => apiDeleteField,
    webhookSelectedIntegrationId: () => webhookSelectedIntegrationId,
    webhookParsedFields: () => webhookParsedFields,
    fetchAvailCalendarUser: () => fetchAvailCalendarUser,
    fetchAvailDateSource: () => fetchAvailDateSource,
    fetchAvailTimeSource: () => fetchAvailTimeSource,
    fetchAvailSummary: () => fetchAvailSummary,
    fetchFieldSource: () => fetchFieldSource,
    fetchFieldSelected: () => fetchFieldSelected,
    fetchFieldReason: () => fetchFieldReason,
    calendarMode: () => calendarMode,
    calendarMeetingId: () => calendarMeetingId,
    calendarConnected: () => calendarConnected,
    calendarDate: () => calendarDate,
    calendarTime: () => calendarTime,
    stepDetailProcess: () => stepDetailProcess,
    stepDetailStage: () => stepDetailStage,
    stepEndCurrentProcess: () => stepEndCurrentProcess,
    greetingPhrase: () => greetingPhrase,
    bypassStepNumbers: () => bypassStepNumbers,
    ticketEntries: () => ticketEntries,
    collectInfoSelectedForm: () => collectInfoSelectedForm,
    appointmentBookingMethod: () => appointmentBookingMethod,
    callAnalysisScenarios: () => callAnalysisScenarios,
    autoHangupSilenceStageDuration: () => autoHangupSilenceStageDuration,
    callHangupMessage: () => callHangupMessage,
    idleMessageStageText: () => idleMessageStageText,
    idleMessageStageDelay: () => idleMessageStageDelay,
    idleHangupMessageStage: () => idleHangupMessageStage,
    idleHangupDelayStage: () => idleHangupDelayStage,
    // Condition fields
    conditionsEnabled: () => conditionsEnabled,
    conditions: () => conditions,
    conditionOperators: () => conditionOperators,
    fieldConditions: () => fieldConditions,
    fieldConditionOperators: () => fieldConditionOperators,
    intentConditions: () => intentConditions,
    intentConditionOperators: () => intentConditionOperators,
  };

  const stateSetters: Record<string, (v: any) => void> = {
    fieldUpdateBlocks: setFieldUpdateBlocks,
    assignedUser: setAssignedUser,
    callActionTransferType: setCallActionTransferType,
    callActionCountryCode: setCallActionCountryCode,
    callActionPhoneNumber: setCallActionPhoneNumber,
    callActionAgentId: setCallActionAgentId,
    callActionReason: setCallActionReason,
    callActionVoiceResponse: setCallActionVoiceResponse,
    callActionExtension: setCallActionExtension,
    whatsappSource: setWhatsappSource,
    whatsappTemplate: setWhatsappTemplate,
    whatsappTemplateIdentifier: setWhatsappTemplateIdentifier,
    whatsappCampaignId: setWhatsappCampaignId,
    whatsappChatbotId: setWhatsappChatbotId,
    smsMessage: setSmsMessage,
    websiteNotificationMessage: setWebsiteNotificationMessage,
    emailConnectedAccount: setEmailConnectedAccount,
    showCustomEmail: setShowCustomEmail,
    emailSubject: setEmailSubject,
    emailRichBody: setEmailRichBody,
    emailHtmlBody: setEmailHtmlBody,
    htmlBodyViewMode: setHtmlBodyViewMode,
    crmName: setCrmName,
    crmField: setCrmField,
    crmUpdateValue: setCrmUpdateValue,
    ehrName: setEhrName,
    ehrField: setEhrField,
    ehrUpdateValue: setEhrUpdateValue,
    webhookIntegration: setWebhookIntegration,
    webhookAction: setWebhookAction,
    webhookSelectedFields: setWebhookSelectedFields,
    webhookUpdateRows: setWebhookUpdateRows,
    webhookCreateRows: setWebhookCreateRows,
    webhookReplaceRows: setWebhookReplaceRows,
    webhookPayloadMode: setWebhookPayloadMode,
    webhookJsonBody: setWebhookJsonBody,
    apiSelectedIntegrationId: setApiSelectedIntegrationId,
    apiAction: setApiAction,
    apiCreateFields: setApiCreateFields,
    apiUpdateFields: setApiUpdateFields,
    apiReplaceFields: setApiReplaceFields,
    apiDeleteField: setApiDeleteField,
    webhookSelectedIntegrationId: setWebhookSelectedIntegrationId,
    webhookParsedFields: setWebhookParsedFields,
    fetchAvailCalendarUser: setFetchAvailCalendarUser,
    fetchAvailDateSource: setFetchAvailDateSource,
    fetchAvailTimeSource: setFetchAvailTimeSource,
    fetchAvailSummary: setFetchAvailSummary,
    fetchFieldSource: setFetchFieldSource,
    fetchFieldSelected: setFetchFieldSelected,
    fetchFieldReason: setFetchFieldReason,
    calendarMode: setCalendarMode,
    calendarMeetingId: setCalendarMeetingId,
    calendarConnected: setCalendarConnected,
    calendarDate: setCalendarDate,
    calendarTime: setCalendarTime,
    stepDetailProcess: setStepDetailProcess,
    stepDetailStage: setStepDetailStage,
    stepEndCurrentProcess: setStepEndCurrentProcess,
    greetingPhrase: setGreetingPhrase,
    bypassStepNumbers: setBypassStepNumbers,
    ticketEntries: setTicketEntries,
    collectInfoSelectedForm: setCollectInfoSelectedForm,
    appointmentBookingMethod: setAppointmentBookingMethod,
    callAnalysisScenarios: setCallAnalysisScenarios,
    autoHangupSilenceStageDuration: setAutoHangupSilenceStageDuration,
    callHangupMessage: setCallHangupMessage,
    idleMessageStageText: setIdleMessageStageText,
    idleMessageStageDelay: setIdleMessageStageDelay,
    idleHangupMessageStage: setIdleHangupMessageStage,
    idleHangupDelayStage: setIdleHangupDelayStage,
    // Condition fields
    conditionsEnabled: setConditionsEnabled,
    conditions: setConditions,
    conditionOperators: setConditionOperators,
    fieldConditions: setFieldConditions,
    fieldConditionOperators: setFieldConditionOperators,
    intentConditions: setIntentConditions,
    intentConditionOperators: setIntentConditionOperators,
  };

  // Builds a params object from current state for the given stepKey.
  const captureStepParams = (stepKey?: string): Record<string, any> => {
    const fields = STEP_PARAM_FIELDS[stepKey ?? ""] ?? [];
    const out: Record<string, any> = {};
    fields.forEach(field => {
      const getter = stateGetters[field];
      if (getter) out[field] = getter();
    });
    return out;
  };

  // Restores state from a step's saved params object for the given stepKey.
  // Fields not present in params are left at whatever resetStepDetailState() set them to.
  const restoreStepParams = (stepKey?: string, params?: Record<string, any>) => {
    if (!params) return;
    const fields = STEP_PARAM_FIELDS[stepKey ?? ""] ?? [];
    fields.forEach(field => {
      const setter = stateSetters[field];
      if (setter && field in params) setter(params[field]);
    });
  };

  // Reset function to clear all step detail state
  const resetStepDetailState = () => {
    setConnectAfterId(undefined);
    setExecutionType("wait");
    setDelayValue(5);
    setDelayUnit("Minute");
    setConditions([{ id: "cond-1", fieldSource: "", field: "", operator: "", value: "" }]);
    setConditionOperators([]);
    setFieldConditions([]);
    setFieldConditionOperators([]);
    setFieldConditionsGroupExpanded(true);
    setFieldExpandedCardIndex(null);
    setIntentConditions([]);
    setIntentConditionOperators([]);
    setIntentConditionsGroupExpanded(true);
    setIntentExpandedCardIndex(null);
    setIntentInput("");
    setStepDetailProcess("Select process...");
    setStepDetailStage("Select stage...");
    setFieldUpdateBlocks([
      { fieldType: "System Fields", fieldToEdit: "Select field...", valueSource: "static", updateValue: "" }
    ]);
    setExpandedBlockIndex(0);
    setExpandedConditionIndex(0);
    setAssignedUser("Select user...");
    setTemplateId("");
    setSmsMessage("");
    setWebsiteNotificationMessage("");
    setWhatsappTemplate("");
    setWhatsappTemplateIdentifier("");
    setWhatsappSource("template");
    setWhatsappCampaignId("");
    setWhatsappChatbotId("");
    setCrmName("Select CRM...");
    setCrmField("Select field...");
    setEhrName("Select EHR...");
    setEhrField("Select field...");
    setWebhookUrl("");
    setWebhookHeaders([{ id: "header-1", key: "", value: "" }]);
    setWebhookHeaderTypes(["Static"]);
    setWebhookBody("");
    setApiEndpoint("");
    setApiMethod("GET");
    setApiAuth("");
    setApiHeaders([{ id: "header-1", key: "", value: "" }]);
    setWebhookIntegration("");
    setWebhookAction("");
    setWebhookSelectedFields([]);
    setWebhookUpdateRows([{ fieldKey: "", value: "" }]);
    setWebhookCreateRows([{ fieldName: "", value: "" }]);
    setWebhookReplaceRows([{ existingFieldKey: "", newFieldName: "", newValue: "" }]);
    setWebhookPayloadMode("fields");
    setWebhookJsonBody("");
    setWebhookJsonError("");
    setWebhookIntegration(""); // also reset webhook_trigger selection
    setApiSelectedIntegrationId("");
    setApiAction("");
    setApiCreateFields([]);
    setApiUpdateFields([]);
    setApiReplaceFields([]);
    setApiDeleteField("");
    setWebhookSelectedIntegrationId("");
    setWebhookParsedFields([]);

    setWebhookIntOpen(false);
    setWebhookActionOpen(false);
    setApiIntOpen(false);
    setApiActionOpen(false);
    setApiIntegration("");
    setApiAction("");
    setApiResponseVariable("");
    setApiUpdatePolicy("Ask me first");
    setApiTimeout(3);
    setApiOnFailure("Continue call");
    setAppointmentUser("Select from Team Calendar...");
    setAppointmentDetails("Appointment Time");
    setCollectInfoSelectedForm("");
    setSmartAnalysisTrackWhat("");
    setSmartAnalysisFieldName("");
    setSmartAnalysisCaptureDesc("");
    setSmartAnalysisDataFormat("Text - Simple text responses like summaries or comments");
    setSmartAnalysisOutputExample("");
    setSmartAnalysisExpectedFormat("");
    setSmartAnalysisSelectedTemplate("");
    setShowCustomEmail(false);
    setTicketChecklist([{ id: "check-1", text: "" }]);
    setTicketEntries([{
      taskName: "", taskDesc: "", assignee: "", deadline: "", priority: "Normal",
      clientEmail: "", clientNumber: "", pauseProcess: "No", checklist: [{ id: "check-1", text: "" }]
    }]);
    setTcTimeIntervalsEnabled(false);
    setTcCallDurationMinutes(5);
    setTcHangupWindowMinutes(1);
    setBypassStepNumbers([{ id: 1, phoneNumber: "", countryCode: "+1" }]);
    setConditionsEnabled(false);
    setConditionsSectionExpanded(true);
    setConditionPreview("");
    setStepTrigger("stage");
    setStepActionName("");
    setStepActionReason("");
    setIfCondField("Stage Name");
    setIfCondOperator("Equal To");
    setIfCondValue("");
    setTrueBranchSteps([]);
    setFalseBranchSteps([]);
    setTrueBranchExpanded(true);
    setFalseBranchExpanded(true);
    setBranchAddTarget(null);
    setMovementTargetExpanded(true);
    setActionConfigExpanded(true);
    setParametersExpanded(true);
    setAssignHumanSearch("");
    setCallActionTransferType("human");
    setCallActionCountryCode("+1");
    setCallActionPhoneNumber("");
    setCallActionAgentId("");
    setCallActionReason("");
    setCallActionVoiceResponse("Please hold while I transfer your call");
    setCallActionExtension("");
    setFetchAvailCalendarUser("");
    setFetchAvailDateSource("");
    setFetchAvailTimeSource("");
    setFetchAvailSummary("");
    setFetchFieldSource("");
    setFetchFieldSelected("");
    setFetchFieldReason("");
    setCalendarMode("book");
    setCalendarMeetingId("");
    setCalendarConnected("");
    setCalendarDate("");
    setCalendarTime("");
    setCalendarAppointmentField("");
    setAutoHangupInteractionMessage("");
    setAutoHangupSilenceStageDuration(5);
    setIdleMessageStageText("");
    setIdleMessageStageDelay(10);
    setIdleHangupMessageStage("");
    setIdleHangupDelayStage(20);
    setEmailHtmlBody("");
    setHtmlBodyViewMode("code");
    setEmailConnectedAccount("");
    setEmailRichBody("");
    setCrmUpdateValue("");
    setEhrUpdateValue("");
    setEmailSubject("");
    setCallHangupMessage("");
  };

  const buildTriggerUrl = (trigger: "incall" | "postcall", actionName: string, actionReason: string) => {
    const executionContext = trigger === "incall" ? "in_call_action" : "post_call_action";
    const action = actionName.trim() ? actionName.trim() : "{action}";
    let url = `https://api.mantraassist.com/trigger?execution_context=${executionContext}&action=${action}&call_id={{call_id}}`;
    if (actionReason.trim()) url += `&reason=${actionReason.trim()}`;
    return url;
  };

  const smsMessageRef = useRef<HTMLTextAreaElement>(null);
  const emailRichBodyRef = useRef<HTMLTextAreaElement>(null);
  const emailHtmlBodyRef = useRef<HTMLTextAreaElement>(null);
  const crmUpdateValueRef = useRef<HTMLInputElement>(null);
  const ehrUpdateValueRef = useRef<HTMLInputElement>(null);
  const webhookUrlRef = useRef<HTMLInputElement>(null);
  const apiEndpointRef = useRef<HTMLInputElement>(null);
  const apiAuthRef = useRef<HTMLInputElement>(null);
  const fetchAvailSummaryRef = useRef<HTMLTextAreaElement>(null);
  const webhookJsonBodyRef = useRef<HTMLTextAreaElement>(null);

  const webhookIntDropdownRef = useRef<HTMLDivElement>(null);
  const webhookActionDropdownRef = useRef<HTMLDivElement>(null);

  const fieldUpdateValueRefs = useRef<(HTMLInputElement | null)[]>([]);
  const webhookFieldValueRefs = useRef<{ update: (HTMLInputElement | null)[]; create: (HTMLInputElement | null)[]; replace: (HTMLInputElement | null)[] }>({ update: [], create: [], replace: [] });
  const webhookTriggerDropdownRef = useRef<HTMLDivElement>(null);
  const ticketClientEmailRefs = useRef<(HTMLInputElement | null)[]>([]);
  const ticketClientNumberRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [tcTimeIntervalsEnabled, setTcTimeIntervalsEnabled] = useState(false);
  const [tcCallDurationMinutes, setTcCallDurationMinutes] = useState<number>(5);
  const [tcHangupWindowMinutes, setTcHangupWindowMinutes] = useState<number>(1);

  // CHANGE 2: Caller Pitch accordion and mode state
  const [callerPitchExpanded, setCallerPitchExpanded] = useState(true);
  const [callerPitchMode, setCallerPitchMode] = useState<"single" | "comprehensive">("single");
  const [enableCalling, setEnableCalling] = useState<boolean>(true);
  const [showCallTriggerDrawer, setShowCallTriggerDrawer] = useState(false);
  const [editingAutomationStepId, setEditingAutomationStepId] = useState<string | undefined>(undefined);
  const callerPitchRef = useRef<HTMLTextAreaElement>(null);
  const greetingIntroRef = useRef<HTMLTextAreaElement>(null);
  const objectiveTextRef = useRef<HTMLTextAreaElement>(null);
  const [pitchFieldPickerTarget, setPitchFieldPickerTarget] = useState<"callerPitch" | "greetingIntro" | "objective" | null>(null);

  const handleInsertPitchFields = (keys: string[]) => {
    if (!pitchFieldPickerTarget || keys.length === 0) {
      setPitchFieldPickerTarget(null);
      return;
    }
    const tokenStr = keys.map((k) => `{{${k}}}`).join(" ");

    if (pitchFieldPickerTarget === "callerPitch") {
      const el = callerPitchRef.current;
      if (el) {
        const start = el.selectionStart ?? callerPitch.length;
        const end = el.selectionEnd ?? callerPitch.length;
        const next = callerPitch.slice(0, start) + tokenStr + callerPitch.slice(end);
        setCallerPitch(next);
        setTimeout(() => {
          el.focus();
          el.setSelectionRange(start + tokenStr.length, start + tokenStr.length);
        }, 0);
      } else {
        setCallerPitch((prev) => (prev ? `${prev} ${tokenStr}` : tokenStr));
      }
    } else if (pitchFieldPickerTarget === "greetingIntro") {
      const el = greetingIntroRef.current;
      if (el) {
        const start = el.selectionStart ?? greetingIntroMessage.length;
        const end = el.selectionEnd ?? greetingIntroMessage.length;
        const next = greetingIntroMessage.slice(0, start) + tokenStr + greetingIntroMessage.slice(end);
        setGreetingIntroMessage(next);
        setTimeout(() => {
          el.focus();
          el.setSelectionRange(start + tokenStr.length, start + tokenStr.length);
        }, 0);
      } else {
        setGreetingIntroMessage((prev) => (prev ? `${prev} ${tokenStr}` : tokenStr));
      }
    } else if (pitchFieldPickerTarget === "objective") {
      const el = objectiveTextRef.current;
      if (el) {
        const start = el.selectionStart ?? objectiveText.length;
        const end = el.selectionEnd ?? objectiveText.length;
        const next = objectiveText.slice(0, start) + tokenStr + objectiveText.slice(end);
        setObjectiveText(next);
        setTimeout(() => {
          el.focus();
          el.setSelectionRange(start + tokenStr.length, start + tokenStr.length);
        }, 0);
      } else {
        setObjectiveText((prev) => (prev ? `${prev} ${tokenStr}` : tokenStr));
      }
    }

    setPitchFieldPickerTarget(null);
    toast.success(`Inserted ${keys.length} field${keys.length > 1 ? "s" : ""}`);
  };

  // When to move accordion state
  const [whenToMoveExpanded, setWhenToMoveExpanded] = useState(false);

  // Comprehensive mode sub-section states
  const [greetingIntroExpanded, setGreetingIntroExpanded] = useState(false);
  const [objectiveExpanded, setObjectiveExpanded] = useState(false);
  const [businessInfoExpanded, setBusinessInfoExpanded] = useState(false);
  const [languagesExpanded, setLanguagesExpanded] = useState(false);

  // Comprehensive mode data
  const [greetingIntroMessage, setGreetingIntroMessage] = useState("");
  const [objectiveText, setObjectiveText] = useState("");
  const [businessInfoItems, setBusinessInfoItems] = useState<Array<{
    id: number;
    title: string;
    information: string;
    active: boolean;
  }>>([]);
  const [primaryLanguage, setPrimaryLanguage] = useState("");
  const [secondaryLanguages, setSecondaryLanguages] = useState<string[]>([]);
  const [secondaryLanguageDraft, setSecondaryLanguageDraft] = useState("");

  // Business Info inline form state
  const [showBusinessInfoForm, setShowBusinessInfoForm] = useState(false);
  const [businessInfoFormData, setBusinessInfoFormData] = useState({
    title: "",
    information: "",
    active: true
  });
  const [editingBusinessInfoId, setEditingBusinessInfoId] = useState<number | null>(null);

  // Available employees list for Responsible Person dropdown
  const availableEmployees = [
    { id: "1", name: "Sarah Johnson" },
    { id: "2", name: "Michael Chen" },
    { id: "3", name: "Emily Rodriguez" },
    { id: "4", name: "James Wilson" },
    { id: "5", name: "Lisa Thompson" },
  ];

  // In-Call Actions state variables
  const [showTestProcessDrawer, setShowTestProcessDrawer] = useState(false);
  const [savedTransferScenarios, setSavedTransferScenarios] = useState<Array<{
    id: number;
    description: string;
    phoneNumber: string;
    voiceResponse: string;
    transferType: string;
    enabled: boolean;
  }>>([]);
  const [showAddTransferModal, setShowAddTransferModal] = useState(false);
  const [showDeleteTransferConfirm, setShowDeleteTransferConfirm] = useState(false);
  const [transferToDelete, setTransferToDelete] = useState<number | null>(null);
  const [transferScenarios, setTransferScenarios] = useState([{
    id: 1,
    description: "",
    countryCode: "+1",
    phoneNumber: "",
    extensionDigits: "",
    voiceResponse: "Please hold while I transfer your call",
    transferType: "cold",
    advancedExpanded: false
  }]);
  const [transferWorkflowLimit] = useState(1); // Plan limit
  const [savedTextMessageScenarios, setSavedTextMessageScenarios] = useState<Array<{
    id: number;
    enableShortUrls: boolean;
    description: string;
    textMessage: string;
    nextAction: string;
    askBeforeSending: boolean;
    attachedImage: File | null;
    attachedImageUrl: string | null;
    enabled: boolean;
  }>>([]);
  const [showAddTextMessageModal, setShowAddTextMessageModal] = useState(false);
  const [showDeleteTextMessageConfirm, setShowDeleteTextMessageConfirm] = useState(false);
  const [textMessageToDelete, setTextMessageToDelete] = useState<number | null>(null);
  const [textMessageScenarios, setTextMessageScenarios] = useState([{
    id: 1,
    enableShortUrls: true,
    description: "",
    textMessage: "",
    nextAction: "",
    askBeforeSending: false,
    attachedImage: null as File | null,
    attachedImageUrl: null as string | null
  }]);
  const [textMessageWorkflowLimit] = useState(1);
  const [expandedTransferScenario, setExpandedTransferScenario] = useState<number | null>(null);
  const [expandedTextMessageScenario, setExpandedTextMessageScenario] = useState<number | null>(null);
  const [showAddFormDropdown, setShowAddFormDropdown] = useState(false);

  // Additive: keep the stage-number routing registry in sync whenever this
  // stage's inbound numbers change, without altering any existing UI/logic.
  useEffect(() => {
    if (!selectedProcess || !expandedStage || viewMode !== "stage") return;
    if (stageType !== "AI Receives Calls") return;
    const proc = processes.find((p) => p.id === selectedProcess);
    const stg = proc?.stages.find((s) => s.id === expandedStage);
    if (!proc || !stg) return;

    channelSources.forEach((cs) => {
      if ((cs.channel === "whatsapp" || cs.channel === "sms" || cs.channel === "calls") && cs.source) {
        assignNumberToStage({
          number: cs.source,
          channel: cs.channel,
          processId: proc.id,
          processName: proc.name,
          stageId: stg.id,
          stageName: stg.name,
        });
      }
    });
  }, [channelSources, selectedProcess, expandedStage, viewMode, stageType, processes]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [smartAnalysisTrackWhat, setSmartAnalysisTrackWhat] = useState("");
  const [smartAnalysisFieldName, setSmartAnalysisFieldName] = useState("");
  const [smartAnalysisCaptureDesc, setSmartAnalysisCaptureDesc] = useState("");
  const [smartAnalysisDataFormat, setSmartAnalysisDataFormat] = useState("Text - Simple text responses like summaries or comments");
  const [smartAnalysisOutputExample, setSmartAnalysisOutputExample] = useState("");
  const [smartAnalysisExpectedFormat, setSmartAnalysisExpectedFormat] = useState("");
  const [smartAnalysisSelectedTemplate, setSmartAnalysisSelectedTemplate] = useState("");
  const [editingFormId, setEditingFormId] = useState<number | null>(null);
  const [editingFormData, setEditingFormData] = useState<{
    templateName: string;
    fields: Array<{ label: string; type: string }>;
  } | null>(null);
  const [savedCollectInfoForms, setSavedCollectInfoForms] = useState<Array<{
    id: number;
    templateName: string;
    fields: Array<{ label: string; type: string }>;
  }>>([]);
  const [savedBookingWorkflows, setSavedBookingWorkflows] = useState<Array<{
    id: number;
    enableShortUrls: boolean;
    scenarioDescription: string;
    textMessage: string;
    nextAction: string;
    askBeforeSending: boolean;
  }>>([]);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [showAnalysisScenarioModal, setShowAnalysisScenarioModal] = useState(false);
  const [analysisScenarioData, setAnalysisScenarioData] = useState({
    trackWhat: "",
    fieldName: "",
    captureDescription: "",
    dataFormat: "Text - Simple text responses like summaries or comments",
    outputExample: "",
    expectedFormat: ""
  });
  const [customMessageEnabled, setCustomMessageEnabled] = useState(false);
  const [customMessageText, setCustomMessageText] = useState("");
  const [advancedSettings, setAdvancedSettings] = useState({
    aiModel: "Default",
    allowVoicemails: true,
    bulkTransfers: "None Set",
    recordCalls: true,
    recordTransferredCalls: true,
    callMemory: false,
    ambientBackgroundNoise: true,
    toggleRateCallSurvey: true,
    smsFallbackVoiceRecognition: true,
    autoHangupAfterInteraction: true,
    autoHangupAfterSilence: "1 Minutes",
    idleMessages: "",
    timeControl: [],
    pronunciationGuides: [],
    maxUsageLimit: false,
    maximumCallDuration: "Minutes",
    blockedNumbers: 0,
    botBlockPhrases: [],
    bypassToHumanNumbers: [],
    landlineNumberSmsPrompt: [],
    roboCallDetection: true,
    smsBotSpammers: [],
    temporaryDisable: false,
  });

  // Modal states
  const [showAddProcessModal, setShowAddProcessModal] = useState(false);
  const [showAddStageModal, setShowAddStageModal] = useState(false);
  const [showProcessHowItWorksModal, setShowProcessHowItWorksModal] = useState(false);
  const [showStageHowItWorksModal, setShowStageHowItWorksModal] = useState(false);
  const [showAutomationHowItWorksModal, setShowAutomationHowItWorksModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showDeleteStageModal, setShowDeleteStageModal] = useState(false);
  const [stageToDelete, setStageToDelete] = useState<Stage | null>(null);
  const [showEditStageModal, setShowEditStageModal] = useState(false);
  const [editingStage, setEditingStage] = useState<{
    id: string;
    name: string;
    color: string;
    isFinalStage?: boolean;
    nextProcessTransitions?: ProcessTransitionTarget[];
  } | null>(null);
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [transitionSourceStageId, setTransitionSourceStageId] = useState<string | null>(null);
  const [handoffTargetProcessId, setHandoffTargetProcessId] = useState<string>("");
  const [handoffTargetStageName, setHandoffTargetStageName] = useState<string>("");
  const [handoffAutoMove, setHandoffAutoMove] = useState<boolean>(true);
  const [isColorGridExpanded, setIsColorGridExpanded] = useState(false);
  const [isEditColorGridExpanded, setIsEditColorGridExpanded] = useState(false);
  const [hasInteractedWithColor, setHasInteractedWithColor] = useState(false);

  // Template states
  const [processModalTab, setProcessModalTab] = useState<"create" | "template">("create");
  const [stageModalTab, setStageModalTab] = useState<"create" | "template">("create");
  const [selectedProcessTemplate, setSelectedProcessTemplate] = useState<string | null>(null);
  const [selectedStageTemplate, setSelectedStageTemplate] = useState<string | null>(null);

  // Form states
  const [newProcess, setNewProcess] = useState({ name: "", description: "" });
  const [newProcessEntityType, setNewProcessEntityType] = useState<EntityType>("client");
  const [newStage, setNewStage] = useState({ name: "", description: "", color: STAGE_PRESET_COLORS[0], type: "AI Receives Calls" });
  const [newStagePosition, setNewStagePosition] = useState<"initial" | "final" | null>(null);
  const [newStageSelectedNumbers, setNewStageSelectedNumbers] = useState<string[]>([]);
  const [showHowToReceiveCallModal, setShowHowToReceiveCallModal] = useState(false);
  const [applyAdvancedSettingsToAllStages, setApplyAdvancedSettingsToAllStages] = useState(false);
  const [stageTone, setStageTone] = useState<string>("Professional");
  const [stageStyle, setStageStyle] = useState<string>("Balanced");
  const [showNewStageNumberDropdown, setShowNewStageNumberDropdown] = useState(false);

  // Mock industry - in real app, this would come from organization settings
  const organizationIndustry = "Healthcare";

  // Process Templates
  const processTemplates = {
    Healthcare: [
      {
        id: "pt-1",
        name: "Patient Intake",
        description: "Initial onboarding and verification flow",
        stages: 3,
        stageData: [
          { name: "Initial Contact", description: "First call to patient for basic information gathering" },
          { name: "Insurance Verify", description: "Verify patient insurance details and coverage" },
          { name: "Schedule Appointment", description: "Schedule the patient's first appointment" },
        ],
      },
      {
        id: "pt-2",
        name: "Appointment Follow-up",
        description: "Reminders and confirmations",
        stages: 2,
        stageData: [
          { name: "Appointment Reminder", description: "Remind patient about upcoming appointment" },
          { name: "Post-Visit Check", description: "Follow up after the appointment" },
        ],
      },
      {
        id: "pt-3",
        name: "Medication Reminders",
        description: "Prescription refill and adherence tracking",
        stages: 2,
        stageData: [
          { name: "Refill Reminder", description: "Remind patient to refill prescription" },
          { name: "Adherence Check", description: "Check if patient is taking medication as prescribed" },
        ],
      },
    ],
    "Real Estate": [
      {
        id: "pt-4",
        name: "Lead Qualification",
        description: "Initial lead screening and qualification",
        stages: 3,
        stageData: [
          { name: "Initial Contact", description: "First contact with potential buyer" },
          { name: "Qualify Budget", description: "Understand budget and financing" },
          { name: "Schedule Viewing", description: "Schedule property viewing" },
        ],
      },
      {
        id: "pt-5",
        name: "Property Visit Follow-up",
        description: "Post-viewing engagement and conversion",
        stages: 2,
        stageData: [
          { name: "Viewing Feedback", description: "Collect feedback after property viewing" },
          { name: "Offer Discussion", description: "Discuss potential offer and next steps" },
        ],
      },
    ],
    Finance: [
      {
        id: "pt-6",
        name: "KYC Verification",
        description: "Customer verification and onboarding",
        stages: 3,
        stageData: [
          { name: "Document Collection", description: "Collect required KYC documents" },
          { name: "Verification", description: "Verify customer identity and documents" },
          { name: "Account Activation", description: "Complete account setup" },
        ],
      },
      {
        id: "pt-7",
        name: "Loan Follow-up",
        description: "Loan application tracking and updates",
        stages: 2,
        stageData: [
          { name: "Application Status", description: "Update customer on application status" },
          { name: "Document Reminder", description: "Remind about pending documents" },
        ],
      },
    ],
  };

  // Stage Templates
  const stageTemplates = {
    Healthcare: [
      {
        id: "st-1",
        name: "Insurance Verification",
        description: "Verify patient insurance details and coverage",
      },
      {
        id: "st-2",
        name: "Appointment Scheduling",
        description: "Schedule patient appointments and send confirmations",
      },
      {
        id: "st-3",
        name: "Prescription Refill",
        description: "Remind patients to refill prescriptions",
      },
      {
        id: "st-4",
        name: "Lab Results Follow-up",
        description: "Contact patients about lab results and next steps",
      },
    ],
    "Real Estate": [
      {
        id: "st-5",
        name: "Property Viewing Invite",
        description: "Invite potential buyers for property viewings",
      },
      {
        id: "st-6",
        name: "Offer Negotiation",
        description: "Discuss and negotiate property offers",
      },
      {
        id: "st-7",
        name: "Document Collection",
        description: "Collect required documents for property transaction",
      },
    ],
    Finance: [
      {
        id: "st-8",
        name: "Payment Reminder",
        description: "Remind customers about upcoming payments",
      },
      {
        id: "st-9",
        name: "Account Verification",
        description: "Verify customer account details",
      },
      {
        id: "st-10",
        name: "Fraud Alert",
        description: "Contact customers about suspicious activity",
      },
    ],
  };

  const selectedProcessData = processes.find((p) => p.id === selectedProcess);

  // Pre-applied scoping rules for stage-level automations based on Process > Stage scope rules
  const stageScopeRules: ScopingRule[] = useMemo(() => {
    const currentStage = selectedProcessData?.stages.find((s) => s.id === expandedStage);
    if (currentStage?.scopingRules && currentStage.scopingRules.length > 0) {
      return currentStage.scopingRules;
    }
    if (selectedProcessData?.scopingRules && selectedProcessData.scopingRules.length > 0) {
      return selectedProcessData.scopingRules;
    }
    if (selectedProcessData?.industryCategory && selectedProcessData.industryCategory !== "All") {
      return [{
        industryCategory: selectedProcessData.industryCategory,
        industries: selectedProcessData.industry && selectedProcessData.industry !== "All" ? [selectedProcessData.industry] : [],
        locations: selectedProcessData.locations && !selectedProcessData.locations.includes("All") ? selectedProcessData.locations : [],
      }];
    }
    if (selectedCategoryFilter && selectedCategoryFilter !== "All") {
      return [{
        industryCategory: selectedCategoryFilter,
        industries: selectedIndustryFilter !== "All" ? [selectedIndustryFilter] : [],
        locations: selectedLocationFilter !== "All" ? [selectedLocationFilter] : [],
      }];
    }
    return [];
  }, [selectedProcessData, expandedStage, selectedCategoryFilter, selectedIndustryFilter, selectedLocationFilter]);

  const handleAddProcess = () => {
    const firstRule = modalScopingRules[0];

    // Manual creation
    if (!newProcess.name || !newProcess.description) {
      toast.error("Please fill all fields");
      return;
    }

    const entityDefault = newProcessEntityType !== "client" ? DEFAULT_ENTITY_PROCESSES[newProcessEntityType as Exclude<EntityType, "client">] : null;
    const process: Process = {
      id: String(Date.now()),
      ...newProcess,
      assignedToUserId: 1,
      stages: entityDefault
        ? entityDefault.stages.map((st, sIdx) => ({
            ...st,
            id: `${Date.now()}-${sIdx + 1}`,
          }))
        : [],
      entityType: newProcessEntityType,
      aiSettings: {
        platform: "OpenAI - GPT-4o",
        voiceSpeed: 1.0,
        voice: "Ava",
        tone: "Professional",
        style: "Balanced",
      },
      scopingRules: modalScopingRules.length > 0 ? modalScopingRules : undefined,
      industryCategory: firstRule?.industryCategory || (selectedCategoryFilter !== "All" ? selectedCategoryFilter : "All"),
      industry: firstRule?.industries && firstRule.industries.length > 0 ? firstRule.industries[0] : (selectedIndustryFilter !== "All" ? selectedIndustryFilter : "All"),
      locations: firstRule?.locations && firstRule.locations.length > 0 ? firstRule.locations : (selectedLocationFilter !== "All" ? [selectedLocationFilter] : ["All"]),
      permissions: modalPermissions,
      source: "custom",
    };

    setProcesses([...processes, process]);
    setSelectedProcess(process.id);
    setExpandedProcesses([...expandedProcesses, process.id]);
    setExpandedStage(null);
    setViewMode("process");
    setNewProcess({ name: "", description: "" });
    setNewProcessEntityType("client");
    setModalScopingRules([]);
    setModalPermissions({ canHide: true, canEdit: true, canAdd: true, canDelete: true });
    setShowAddProcessModal(false);
    toast.success("Process added successfully");
  };

  const handleUpdateProcess = (field: string, value: any) => {
    if (!selectedProcess) return;

    setProcesses(
      processes.map((p) =>
        p.id === selectedProcess ? { ...p, [field]: value } : p
      )
    );
  };

  const handleDeleteProcess = (processId: string) => {
    setProcesses(processes.filter((p) => p.id !== processId));
    if (selectedProcess === processId) {
      setSelectedProcess(null);
      setExpandedStage(null);
      setViewMode(null);
    }
    toast.success("Process deleted successfully");
  };

  const handleUpdateProcessAI = (field: keyof AISettings, value: any) => {
    if (!selectedProcess) return;

    setProcesses(
      processes.map((p) =>
        p.id === selectedProcess
          ? { ...p, aiSettings: { ...p.aiSettings, [field]: value } }
          : p
      )
    );
  };

  const moveStageForProcess = (processId: string, dragIndex: number, hoverIndex: number) => {
    setProcesses((prevProcesses) =>
      prevProcesses.map((p) => {
        if (p.id === processId) {
          const newStages = [...p.stages];
          const [draggedStage] = newStages.splice(dragIndex, 1);
          newStages.splice(hoverIndex, 0, draggedStage);
          return { ...p, stages: newStages };
        }
        return p;
      })
    );
  };

  const moveStage = (dragIndex: number, hoverIndex: number) => {
    if (!selectedProcess) return;
    moveStageForProcess(selectedProcess, dragIndex, hoverIndex);
  };

  const handleRemoveStage = (stageId: string) => {
    if (!selectedProcess) return;

    setProcesses(
      processes.map((p) =>
        p.id === selectedProcess
          ? { ...p, stages: p.stages.filter((s) => s.id !== stageId) }
          : p
      )
    );
    toast.success("Stage removed successfully");
  };

  const handleEditStage = (stage: Stage) => {
    setEditingStage({
      id: stage.id,
      name: stage.name,
      color: stage.color || "#22D3EE",
      isFinalStage: stage.isFinalStage || stage.isFinal || false,
      nextProcessTransitions: stage.nextProcessTransitions ? [...stage.nextProcessTransitions] : [],
    });
    setShowEditStageModal(true);
  };

  const handleSaveEditStage = () => {
    if (!selectedProcess || !editingStage) return;

    setProcesses(
      processes.map((p) =>
        p.id === selectedProcess
          ? {
            ...p,
            stages: p.stages.map((s) =>
              s.id === editingStage.id
                ? {
                    ...s,
                    name: editingStage.name,
                    color: editingStage.color,
                    isFinalStage: editingStage.isFinalStage,
                    isFinal: editingStage.isFinalStage,
                    nextProcessTransitions: editingStage.nextProcessTransitions || [],
                  }
                : s
            ),
          }
          : p
      )
    );
    setShowEditStageModal(false);
    setEditingStage(null);
    toast.success("Stage updated successfully");
  };

  const handleOpenTransitionModal = (stageId?: string) => {
    const finalStage = selectedProcessData?.stages && selectedProcessData.stages.length > 0
      ? selectedProcessData.stages[selectedProcessData.stages.length - 1]
      : undefined;
    const sourceId = stageId || finalStage?.id || null;
    setTransitionSourceStageId(sourceId);
    const otherProc = processes.find((p) => p.id !== selectedProcess);
    if (otherProc) {
      setHandoffTargetProcessId(otherProc.id);
      setHandoffTargetStageName(otherProc.stages[0]?.name || "Initial Contact");
    } else {
      setHandoffTargetProcessId("");
      setHandoffTargetStageName("");
    }
    setHandoffAutoMove(true);
    setShowTransitionModal(true);
  };

  const handleSaveQuickTransition = () => {
    const finalStage = selectedProcessData?.stages && selectedProcessData.stages.length > 0
      ? selectedProcessData.stages[selectedProcessData.stages.length - 1]
      : undefined;
    const sourceStageId = transitionSourceStageId || finalStage?.id;

    if (!selectedProcess || !sourceStageId) {
      toast.error("Please select a valid stage");
      return;
    }

    const targetProcId = handoffTargetProcessId || processes.find((p) => p.id !== selectedProcess)?.id;
    if (!targetProcId) {
      toast.error("Please select a target process template");
      return;
    }

    const targetProc = processes.find((p) => p.id === targetProcId);
    if (!targetProc) return;

    const targetStage = targetProc.stages.find((s) => s.name === handoffTargetStageName) || targetProc.stages[0];
    const targetStageName = targetStage?.name || handoffTargetStageName || "Initial Contact";

    const newTransition: ProcessTransitionTarget = {
      id: `trans-${Date.now()}`,
      targetProcessId: targetProc.id,
      targetProcessName: targetProc.name,
      targetStageId: targetStage?.id,
      targetStageName,
      autoMove: handoffAutoMove,
    };

    setProcesses((prev) =>
      prev.map((p) =>
        p.id === selectedProcess
          ? {
              ...p,
              stages: p.stages.map((s) =>
                s.id === transitionSourceStageId
                  ? {
                      ...s,
                      isFinalStage: true,
                      isFinal: true,
                      nextProcessTransitions: [...(s.nextProcessTransitions || []), newTransition],
                    }
                  : s
              ),
            }
          : p
      )
    );

    setShowTransitionModal(false);
    toast.success(`Handoff to "${targetProc.name}: ${targetStageName}" connected ✓`);
  };

  const handleRemoveTransitionFromStage = (sourceStageId: string, transitionIndex: number) => {
    if (!selectedProcess) return;
    setProcesses((prev) =>
      prev.map((p) =>
        p.id === selectedProcess
          ? {
              ...p,
              stages: p.stages.map((s) =>
                s.id === sourceStageId
                  ? {
                      ...s,
                      nextProcessTransitions: (s.nextProcessTransitions || []).filter((_, idx) => idx !== transitionIndex),
                    }
                  : s
              ),
            }
          : p
      )
    );
    toast.success("Transition removed");
  };

  const handleQuickAddStage = () => {
    setShowAddStageModal(true);
  };

  const handleAddStage = () => {
    if (!selectedProcess) return;

    const selectedProc = processes.find((p) => p.id === selectedProcess);
    if (!selectedProc) return;

    // Manual creation
    if (!newStage.name || !newStage.name.trim()) {
      toast.error("Please enter a stage name");
      return;
    }

    const stage: Stage = {
      id: `${selectedProcess}-${Date.now()}`,
      name: newStage.name.trim(),
      description: newStage.description.trim(),
      color: newStage.color || STAGE_PRESET_COLORS[0],
      stageType: newStage.type || "Receive Inbound Calls",
      status: "active",
      callTriggerSettings: getDefaultCallTriggerSettings(),
    };

    const updatedStages = [...selectedProc.stages, stage];

    setProcesses(
      processes.map((p) =>
        p.id === selectedProcess
          ? { ...p, stages: updatedStages }
          : p
      )
    );

    // Auto-expand process and select new stage
    if (!expandedProcesses.includes(selectedProcess)) {
      setExpandedProcesses([...expandedProcesses, selectedProcess]);
    }
    setExpandedStage(stage.id);
    setViewMode("stage");
    setNewStage({ name: "", description: "", color: STAGE_PRESET_COLORS[0], type: "AI Receives Calls" });
    setNewStagePosition(null);
    setNewStageSelectedNumbers([]);
    setShowNewStageNumberDropdown(false);
    setHasInteractedWithColor(false);
    setIsColorGridExpanded(false);
    setShowAddStageModal(false);
    setSelectedStageTemplate(null);
    toast.success("Stage added successfully");
  };

  const handleDeleteStage = () => {
    if (!stageToDelete || !selectedProcess) return;

    setProcesses(
      processes.map((p) =>
        p.id === selectedProcess
          ? { ...p, stages: p.stages.filter((s) => s.id !== stageToDelete.id) }
          : p
      )
    );

    setShowDeleteStageModal(false);
    setStageToDelete(null);
    setExpandedStage(null);
    setViewMode("process"); // Go back to process view after deleting stage
    toast.success("Stage deleted successfully");
  };

  const handleUpdateStageAI = (stageId: string, field: keyof AISettings, value: any) => {
    if (!selectedProcess) return;

    setProcesses(
      processes.map((p) =>
        p.id === selectedProcess
          ? {
            ...p,
            stages: p.stages.map((s) =>
              s.id === stageId
                ? {
                  ...s,
                  aiSettings: {
                    ...(s.aiSettings || p.aiSettings),
                    [field]: value,
                  },
                }
                : s
            ),
          }
          : p
      )
    );
  };

  const handleOverrideStageAI = (stageId: string) => {
    if (!selectedProcess || !selectedProcessData) return;

    setProcesses(
      processes.map((p) =>
        p.id === selectedProcess
          ? {
            ...p,
            stages: p.stages.map((s) =>
              s.id === stageId
                ? { ...s, aiSettings: { ...selectedProcessData.aiSettings } }
                : s
            ),
          }
          : p
      )
    );
    toast.info("AI settings enabled for this stage");
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="px-10 sm:px-12 py-7.5 sm:py-8 w-full space-y-7">
        <PageHeader
          title="Workflows"
          subtitle="Design and manage entity processes, pipelines, and stages across tenant organizations"
          badge={
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-[#1456f0] border border-blue-200/60">
              Admin Workflow Architect
            </span>
          }
          actions={
            <>
              <Button variant="outline" onClick={() => setShowTestProcessDrawer(true)}>Test Process</Button>
              <HowItWorksButton label="How Workflow Works" onClick={() => setShowHelp(true)} />
            </>
          }
        />

        {/* Top Control Bar using standard PageTopBar with Entity dropdown matching AdminDocumentTemplates.tsx */}
        <PageTopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search processes..."
          leftElement={
            <div className="flex items-center gap-2 flex-wrap">
              {/* Entity Filter Dropdown in Top Bar matching Client Workflow entities (no Client, specific entities only) */}
              <select
                value={selectedEntityFilter}
                onChange={(e) => setSelectedEntityFilter(e.target.value)}
                className="h-[36px] px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none cursor-pointer shadow-2xs hover:border-gray-300"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <option value="process">Processes ({entityCounts.process})</option>
                <option value="appointment">Appointments ({entityCounts.appointment})</option>
                <option value="invoice">Invoices ({entityCounts.invoice})</option>
                <option value="insurance">Insurance ({entityCounts.insurance})</option>
                <option value="claim">Claims ({entityCounts.claim})</option>
              </select>

              {/* 1. Industry Category */}
              <select
                value={selectedCategoryFilter}
                onChange={(e) => {
                  setSelectedCategoryFilter(e.target.value);
                  setSelectedIndustryFilter("All");
                }}
                className="h-[36px] px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none cursor-pointer shadow-2xs hover:border-gray-300"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                <option value="All">All Categories</option>
                {INITIAL_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>

              {/* 2. Industry */}
              <select
                value={selectedIndustryFilter}
                onChange={(e) => setSelectedIndustryFilter(e.target.value)}
                className="h-[36px] px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none cursor-pointer shadow-2xs hover:border-gray-300"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                <option value="All">All Industries</option>
                {availableIndustriesForFilter.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>

              {/* 3. Location */}
              <select
                value={selectedLocationFilter}
                onChange={(e) => setSelectedLocationFilter(e.target.value)}
                className="h-[36px] px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none cursor-pointer shadow-2xs hover:border-gray-300"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                <option value="All">All Locations</option>
                {STANDARD_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          }
          primaryAction={{
            label: "Add Process Template",
            icon: <Plus className="w-3.5 h-3.5" />,
            onClick: () => {
              setModalScopingRules([]);
              setModalPermissions({ canHide: true, canEdit: true, canAdd: true, canDelete: true });
              setNewProcessEntityType((selectedEntityFilter === "process" ? "client" : selectedEntityFilter) as EntityType);
              setShowAddProcessModal(true);
            },
          }}
        />

        <div className="flex gap-6 min-h-[calc(100vh-270px)]">
          {/* Left Panel - Process List */}
          <div className="w-80 bg-[#F4F6F8] rounded-2xl border border-gray-200/80 p-3 h-[calc(100vh-270px)] overflow-y-auto flex-shrink-0 space-y-3">
            {filteredProcesses.length === 0 ? (
              <div className="p-4 text-center rounded-xl bg-white border border-dashed border-gray-200">
                <p className="text-xs text-gray-500 font-medium">No processes match active filters or search</p>
                <button
                  onClick={() => {
                    setSelectedEntityFilter("process");
                    setSelectedCategoryFilter("All");
                    setSelectedIndustryFilter("All");
                    setSelectedLocationFilter("All");
                    setSearchQuery("");
                  }}
                  className="mt-2 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              filteredProcesses.map((process) => {
                const isExpanded = expandedProcesses.includes(process.id);
                const isProcessSelected = selectedProcess === process.id;

                return (
                  <div
                    key={process.id}
                    onClick={() => {
                      setSelectedProcess(process.id);
                      setExpandedStage(null);
                      setViewMode("process");
                      if (!isExpanded) {
                        setExpandedProcesses((prev) => [...prev, process.id]);
                      }
                    }}
                    className={`bg-white rounded-2xl p-4 border transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md cursor-pointer ${
                      isProcessSelected && viewMode === "process"
                        ? "border-blue-400 ring-2 ring-blue-500/20 shadow-md"
                        : isProcessSelected
                        ? "border-blue-200 bg-blue-50/20 shadow-sm"
                        : "border-gray-200/80 hover:border-gray-300"
                    }`}
                  >
                    {/* Process Header Row */}
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedProcesses((prev) =>
                              prev.includes(process.id)
                                ? prev.filter((id) => id !== process.id)
                                : [...prev, process.id]
                            );
                          }}
                          className="p-1 -ml-1 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors shrink-0 cursor-pointer"
                          aria-label="Toggle stages"
                        >
                          <ChevronRight
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isExpanded ? "rotate-90" : ""
                            }`}
                          />
                        </button>
                        <span
                          className="font-bold text-sm text-gray-900 truncate"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          {process.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Blue Circular Badge with Drop Shadow */}
                        <div className="w-6 h-6 rounded-full bg-[#3B82F6] text-white text-[11px] font-bold flex items-center justify-center shadow-[0_3px_8px_rgba(59,130,246,0.45)]">
                          {process.stages.length}
                        </div>

                        {/* Preview Eye Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewProcess(process);
                            setShowProcessPreviewDrawer(true);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Preview Process View"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Process Description */}
                    {process.description && (
                      <p
                        className="text-xs text-gray-500 font-normal leading-relaxed line-clamp-2 mt-2 pl-6"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {process.description}
                      </p>
                    )}

                    {/* Stages (when expanded) */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-gray-100 pl-6 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                        {process.stages.length === 0 ? (
                          <div
                            className="px-3 py-2 text-xs italic text-gray-400 bg-gray-50 rounded-lg"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          >
                            No stages yet
                          </div>
                        ) : (
                          process.stages.map((stage, sIdx) => {
                            const isStageSelected =
                              selectedProcess === process.id &&
                              expandedStage === stage.id &&
                              viewMode === "stage";

                            return (
                              <SidebarDraggableStage
                                key={stage.id}
                                processId={process.id}
                                stage={stage}
                                index={sIdx}
                                totalStages={process.stages.length}
                                isSelected={isStageSelected}
                                onSelect={() => {
                                  setSelectedProcess(process.id);
                                  setExpandedStage(stage.id);
                                  setViewMode("stage");
                                }}
                                onMoveStage={moveStageForProcess}
                              />
                            );
                          })
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProcess(process.id);
                            setShowAddStageModal(true);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-blue-600 hover:bg-blue-50/80 transition-colors border border-dashed border-blue-200 hover:border-blue-300 mt-2 cursor-pointer"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add New Stage</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Right Panel - Process or Stage Settings */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {selectedProcessData && viewMode === "process" ? (
              /* Process Settings View */
              <div className="h-full flex flex-col">
                {/* Process Header */}
                <div className="p-8 border-b border-gray-200 bg-gradient-to-r from-blue-50/30 to-white">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 min-w-0">
                      {!isEditingProcessInfo ? (
                        /* VIEW MODE */
                        <>
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h1 className="text-3xl font-bold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                              {selectedProcessData.name}
                            </h1>
                            <button
                              onClick={() => {
                                setDraftProcessName(selectedProcessData.name);
                                setDraftProcessDescription(selectedProcessData.description);
                                setIsEditingProcessInfo(true);
                              }}
                              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                              title="Edit Process Details"
                            >
                              <Edit className="w-4.5 h-4.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTargetProcessForScope(selectedProcessData);
                                setEditProcessScopingRules(selectedProcessData.scopingRules ? [...selectedProcessData.scopingRules] : []);
                                setShowProcessScopeModal(true);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                              title="Configure Scope Rules"
                            >
                              <Globe className="w-3.5 h-3.5 text-blue-600" />
                              <span>{selectedProcessData.industryCategory || "All Industries"}</span>
                            </button>
                          </div>
                          <p
                            className="text-base whitespace-pre-wrap mt-1"
                            style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}
                          >
                            {selectedProcessData.description || "Add a description for this process..."}
                          </p>
                        </>
                      ) : (
                        /* EDIT MODE */
                        <div className="space-y-4 max-w-2xl">
                          <div>
                            <input
                              type="text"
                              value={draftProcessName}
                              onChange={(e) => setDraftProcessName(e.target.value)}
                              className="w-full text-3xl font-bold border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-1 outline-none transition-all"
                              style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}
                              placeholder="Process Name"
                            />
                          </div>
                          <div>
                            <textarea
                              value={draftProcessDescription}
                              onChange={(e) => setDraftProcessDescription(e.target.value)}
                              className="w-full text-base border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 outline-none transition-all resize-y min-h-[100px]"
                              style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}
                              rows={4}
                              placeholder="Add a description for this process..."
                            />
                          </div>
                          <div className="flex items-center gap-3 pt-1">
                            <button
                              onClick={() => {
                                handleUpdateProcess("name", draftProcessName);
                                handleUpdateProcess("description", draftProcessDescription);
                                setIsEditingProcessInfo(false);
                                toast.success("Process details updated");
                              }}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setIsEditingProcessInfo(false)}
                              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Tooltip text="Temporary Disable">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={temporaryDisableEnabled}
                            onChange={(e) => {
                              setTemporaryDisableEnabled(e.target.checked);
                              toast.success(e.target.checked ? "Temporary disable enabled" : "Temporary disable disabled");
                            }}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </Tooltip>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <div className="p-8 space-y-6">
                    {/* Clean Pipeline Stages Ribbon matching client workflow */}
                    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/90 shadow-2xs space-y-4">

                      {(() => {
                        const allStages = selectedProcessData.stages;
                        const hasExplicitFinal = allStages.some((s) => s.isFinalStage || s.isFinal);
                        const sequentialStages = hasExplicitFinal
                          ? allStages.filter((s) => !s.isFinalStage && !s.isFinal)
                          : (allStages.length > 1 ? allStages.slice(0, -1) : allStages);
                        const finalStageOptions = hasExplicitFinal
                          ? allStages.filter((s) => s.isFinalStage || s.isFinal)
                          : (allStages.length > 1 ? allStages.slice(-1) : []);

                        return (
                          <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 scrollbar-thin scrollbar-thumb-gray-200">
                            {/* Sequential Stages */}
                            <div className="flex items-center flex-shrink-0">
                              {sequentialStages.map((stage, sIdx) => {
                                const originalIndex = allStages.findIndex((s) => s.id === stage.id);
                                return (
                                  <ChevronStageItem
                                    key={stage.id}
                                    stage={stage}
                                    index={originalIndex >= 0 ? originalIndex : sIdx}
                                    totalStages={allStages.length}
                                    moveStage={moveStage}
                                    onRemove={handleRemoveStage}
                                    onEdit={handleEditStage}
                                    onSelect={(s) => {
                                      setExpandedStage(s.id);
                                      setViewMode("stage");
                                    }}
                                    isSelected={expandedStage === stage.id}
                                    isFirst={sIdx === 0}
                                    isLast={sIdx === sequentialStages.length - 1}
                                    color={stage.color || CHEVRON_PALETTE[sIdx % CHEVRON_PALETTE.length]}
                                  />
                                );
                              })}
                            </div>

                            {/* + Icon to Add Sequential Stage */}
                            <button
                              type="button"
                              onClick={() => {
                                setNewStagePosition("final");
                                setShowAddStageModal(true);
                              }}
                              className="flex items-center justify-center w-8 h-10 rounded-md bg-gray-50 hover:bg-blue-50 text-gray-500 hover:text-blue-600 border border-gray-200 hover:border-blue-300 transition-all shadow-2xs hover:shadow-xs flex-shrink-0 cursor-pointer"
                              title="Add sequential stage"
                            >
                              <Plus className="w-4 h-4" />
                            </button>

                            {/* Last Stages in the exact same chevron style */}
                            {finalStageOptions.length > 0 ? (
                              <>
                                <div className="flex items-center flex-shrink-0 ml-1">
                                  {finalStageOptions.map((fStage, fIdx) => {
                                    const originalIndex = allStages.findIndex((s) => s.id === fStage.id);
                                    return (
                                      <ChevronStageItem
                                        key={fStage.id}
                                        stage={fStage}
                                        index={originalIndex >= 0 ? originalIndex : sequentialStages.length + fIdx}
                                        totalStages={allStages.length}
                                        moveStage={moveStage}
                                        onRemove={handleRemoveStage}
                                        onEdit={handleEditStage}
                                        onSelect={(s) => {
                                          setExpandedStage(s.id);
                                          setViewMode("stage");
                                        }}
                                        isSelected={expandedStage === fStage.id}
                                        isFirst={fIdx === 0}
                                        isLast={fIdx === finalStageOptions.length - 1}
                                        color={fStage.color || CHEVRON_PALETTE[(sequentialStages.length + fIdx) % CHEVRON_PALETTE.length] || "#EC4899"}
                                        isLastStage={true}
                                      />
                                    );
                                  })}
                                </div>

                                {/* + Icon to Add another Last Stage Option */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewStagePosition("final");
                                    setShowAddStageModal(true);
                                  }}
                                  className="flex items-center justify-center w-8 h-10 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-600 hover:text-purple-700 border border-purple-200 hover:border-purple-300 transition-all shadow-2xs hover:shadow-xs flex-shrink-0 cursor-pointer"
                                  title="Add last stage option"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              /* When NO last stage is added: + Add Last Stage button */
                              <button
                                type="button"
                                onClick={() => {
                                  setNewStagePosition("final");
                                  setShowAddStageModal(true);
                                }}
                                className="flex items-center gap-1.5 px-3 h-10 rounded-md border border-dashed border-purple-300 hover:border-purple-400 bg-purple-50/50 hover:bg-purple-100/50 text-purple-700 text-xs font-semibold transition-all shadow-2xs flex-shrink-0 cursor-pointer ml-1"
                                title="Add last stage option"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Last Stage</span>
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Knowledge Base */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Database className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                            Knowledge Base
                          </h3>
                          <p className="text-sm mt-1" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                            Give the AI reference material scoped to this process. Reference documents are managed across tenant scopes.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Advanced Settings */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      <button
                        onClick={() => setAdvancedSettingsExpanded(!advancedSettingsExpanded)}
                        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <Sliders className="w-5 h-5 text-blue-600" />
                          </div>
                          <h3 className="text-xl font-bold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                            Advanced Settings
                          </h3>
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 text-gray-500 transition-transform ${advancedSettingsExpanded ? 'rotate-180' : ''
                            }`}
                        />
                      </button>

                      {advancedSettingsExpanded && (
                        <div className="px-6 pb-6 space-y-4 border-t border-gray-200 pt-6 bg-gray-50/50">
                          {/* AI Voice & Model */}
                          <div className="w-full rounded-xl border border-gray-200 overflow-hidden bg-white">
                            <button
                              type="button"
                              onClick={() => setAiDefaultSettingsExpanded(!aiDefaultSettingsExpanded)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                  <Bot className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                    AI Voice &amp; Model
                                  </span>
                                  <Tooltip text="Settings defined here are automatically applied to all stages by default." placement="top">
                                    <Info className="w-3.5 h-3.5 text-gray-400 cursor-help hover:text-gray-600 transition-colors" />
                                  </Tooltip>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.location.href = '/settings?tab=voice-config';
                                  }}
                                  className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                  <Settings className="w-4 h-4 text-gray-500" />
                                </button>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${aiDefaultSettingsExpanded ? 'rotate-180' : ''}`} />
                              </div>
                            </button>

                            {aiDefaultSettingsExpanded && (
                              <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50/40">
                                <div>
                                  <label className="block text-sm font-semibold mb-2 text-gray-700">AI Model</label>
                                  <select
                                    value={selectedProcessData.aiSettings.platform}
                                    onChange={(e) => handleUpdateProcessAI("platform", e.target.value)}
                                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                                  >
                                    <option value="Gemini 2.5 Flash">Gemini 2.5 Flash</option>
                                    <option value="GPT-4o Mini">GPT-4o Mini</option>
                                    <option value="Deepseek V4 Flash">Deepseek V4 Flash</option>
                                  </select>
                                </div>

                                <div>
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-1.5">
                                      <label className="text-sm font-semibold text-gray-700">
                                        Voice Speed
                                      </label>
                                      <Tooltip text="Controls how fast the AI speaks during calls.">
                                        <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                      </Tooltip>
                                    </div>
                                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-bold rounded-lg">
                                      {selectedProcessData.aiSettings.voiceSpeed}x
                                    </span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0.5"
                                    max="2"
                                    step="0.1"
                                    value={selectedProcessData.aiSettings.voiceSpeed}
                                    onChange={(e) => handleUpdateProcessAI("voiceSpeed", parseFloat(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                  />
                                  <div className="flex justify-between text-xs mt-2 text-gray-500 font-medium">
                                    <span>0.5x</span>
                                    <span>2.0x</span>
                                  </div>
                                </div>

                                {/* Voice / Tone / Style — 3-column grid */}
                                <div className="grid grid-cols-3 gap-3">
                                  <div>
                                    <div className="flex items-center gap-1.5 mb-2">
                                      <label className="text-sm font-semibold text-gray-700">Voice</label>
                                      <Tooltip text="Choose the voice your AI receptionist uses on calls.">
                                        <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                      </Tooltip>
                                    </div>
                                    <select
                                      value={selectedProcessData.aiSettings.voice || "Ava"}
                                      onChange={(e) => handleUpdateProcessAI("voice", e.target.value)}
                                      className="w-full px-3 py-2.5 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-sm"
                                      style={{ fontFamily: 'Outfit, sans-serif' }}
                                    >
                                      <option>Ava</option>
                                      <option>Eva</option>
                                      <option>Aria</option>
                                      <option>Sam</option>
                                      <option>Jack</option>
                                      <option>Mango</option>
                                    </select>
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5 mb-2">
                                      <label className="text-sm font-semibold text-gray-700">Tone</label>
                                      <Tooltip text="Select the default tone of voice the AI will use during calls (e.g. Professional, Friendly).">
                                        <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                      </Tooltip>
                                    </div>
                                    <select
                                      value={selectedProcessData.aiSettings.tone || "Professional"}
                                      onChange={(e) => handleUpdateProcessAI("tone", e.target.value)}
                                      className="w-full px-3 py-2.5 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-sm"
                                      style={{ fontFamily: 'Outfit, sans-serif' }}
                                    >
                                      <option value="Professional">Professional</option>
                                      <option value="Friendly">Friendly</option>
                                      <option value="Empathetic">Empathetic</option>
                                      <option value="Casual">Casual</option>
                                      <option value="Persuasive">Persuasive</option>
                                    </select>
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5 mb-2">
                                      <label className="text-sm font-semibold text-gray-700">Style</label>
                                      <Tooltip text="Select the default conversational style (e.g. Concise, Detailed).">
                                        <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                      </Tooltip>
                                    </div>
                                    <select
                                      value={selectedProcessData.aiSettings.style || "Balanced"}
                                      onChange={(e) => handleUpdateProcessAI("style", e.target.value)}
                                      className="w-full px-3 py-2.5 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-sm"
                                      style={{ fontFamily: 'Outfit, sans-serif' }}
                                    >
                                      <option value="Balanced">Balanced</option>
                                      <option value="Concise">Concise</option>
                                      <option value="Detailed">Detailed</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>






                          {/* Extension Digits */}
                          <div className="w-full rounded-xl border border-gray-200 overflow-hidden bg-white mt-4">
                            <button
                              type="button"
                              onClick={() => setExtensionDigitsExpanded(!extensionDigitsExpanded)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <PhoneForwarded className="w-5 h-5 text-primary" />
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                    Extension Digits
                                  </span>
                                  <Tooltip text="Configure extension digits for call routing" placement="top">
                                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                                  </Tooltip>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                  {savedExtensionEntries.length > 0 ? `${savedExtensionEntries.length} set` : 'Not set'}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${extensionDigitsExpanded ? 'rotate-180' : ''}`} />
                              </div>
                            </button>

                            {extensionDigitsExpanded && (
                              <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50/40">
                                <p className="text-sm text-gray-600 leading-relaxed">
                                  You can set up extension codes that your AI Receptionist can handle to reroute the caller. i.e. 'press 3 for billing department'.
                                </p>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                  The caller can dial an extension to transfer the call. They can either dial the extension after the original greeting phrase, or they can ask the AI to dial an extension anytime. Make sure to use the format +1XXXXXXXXXX for the phone number.
                                </p>
                                <div className="flex gap-2">
                                  <button className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5">
                                    <ExternalLink className="w-3.5 h-3.5" /> Learn More
                                  </button>
                                  <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5">
                                    <Download className="w-3.5 h-3.5" /> Download Sample
                                  </button>
                                  <button className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5">
                                    <Upload className="w-3.5 h-3.5" /> Upload File
                                  </button>
                                </div>
                                <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4">
                                  <p className="text-sm text-blue-800">
                                    <span className="font-semibold">Tip:</span> If you are using this feature, we recommend you tell callers about it in the greeting phrase. For example, 'If you already know your party's extension, you can dial it after I finish talking. You can also dial it anytime by saying dial an extension'.
                                  </p>
                                </div>

                                {/* Extension entries */}
                                <div className="space-y-3">
                                  {extensionEntries.map((entry) => (
                                    <div key={entry.id} className="flex items-center gap-2">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-1 mb-1">
                                          <label className="text-xs font-semibold text-gray-500">AI's Extension:</label>
                                          <Tooltip text="The extension digits a caller can dial (or ask the AI to dial) to reach this stage.">
                                            <Info className="w-3 h-3 text-gray-400 cursor-help" />
                                          </Tooltip>
                                        </div>
                                        <input
                                          type="text"
                                          placeholder="234"
                                          value={entry.extension}
                                          onChange={(e) => setExtensionEntries(extensionEntries.map(x => x.id === entry.id ? { ...x, extension: e.target.value } : x))}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                        />
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-1 mb-1">
                                          <label className="text-xs font-semibold text-gray-500">Route to:</label>
                                          <Tooltip text="The phone number this extension transfers the caller to.">
                                            <Info className="w-3 h-3 text-gray-400 cursor-help" />
                                          </Tooltip>
                                        </div>
                                        <div className="flex gap-1">
                                          <select
                                            value={entry.countryCode}
                                            onChange={(e) => setExtensionEntries(extensionEntries.map(x => x.id === entry.id ? { ...x, countryCode: e.target.value } : x))}
                                            className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white"
                                          >
                                            <option value="us">🇺🇸 +1</option>
                                            <option value="gb">🇬🇧 +44</option>
                                            <option value="ca">🇨🇦 +1</option>
                                          </select>
                                          <input
                                            type="text"
                                            placeholder="+1"
                                            value={entry.phoneNumber}
                                            onChange={(e) => setExtensionEntries(extensionEntries.map(x => x.id === entry.id ? { ...x, phoneNumber: e.target.value } : x))}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                          />
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => setExtensionEntries(extensionEntries.filter(x => x.id !== entry.id))}
                                        className="mt-5 p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>

                                <button
                                  onClick={() => setExtensionEntries([...extensionEntries, { id: Date.now(), extension: '', countryCode: 'us', phoneNumber: '' }])}
                                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
                                >
                                  + Add Extension
                                </button>
                                <button
                                  onClick={() => {
                                    setSavedExtensionEntries([...extensionEntries]);
                                    toast.success("Extension entry added");
                                  }}
                                  className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                                >
                                  Save
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Record Calls */}
                          <div className="w-full rounded-xl border border-gray-200 overflow-hidden bg-white mt-4">
                            <div className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                              <div className="flex items-center gap-3">
                                <Mic className="w-5 h-5 text-primary" />
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                    Record Calls
                                  </span>
                                  <Tooltip text="Enable call recording" placement="top">
                                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                                  </Tooltip>
                                </div>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={advancedSettings.recordCalls}
                                  onChange={(e) => {
                                    setAdvancedSettings({ ...advancedSettings, recordCalls: e.target.checked });
                                    toast.success(e.target.checked ? "Call recording enabled" : "Call recording disabled");
                                  }}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                              </label>
                            </div>
                          </div>

                          {/* Call Duration */}
                          <div className="w-full rounded-xl border border-gray-200 overflow-hidden bg-white mt-4">
                            <button
                              type="button"
                              onClick={() => setCallDurationExpanded(!callDurationExpanded)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-primary" />
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                    Call Duration
                                  </span>
                                  <Tooltip text="Set the maximum call length and when the AI should start wrapping up the conversation.">
                                    <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                  </Tooltip>
                                </div>
                              </div>
                              <ChevronDown
                                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${callDurationExpanded ? 'rotate-180' : ''}`}
                              />
                            </button>

                            {callDurationExpanded && (
                              <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50/40">
                                <div className="flex items-end gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <label className="text-sm font-medium" style={{ color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>
                                        Call Duration (min)
                                      </label>
                                      <Tooltip text="Maximum call duration allowed for a call.">
                                        <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                      </Tooltip>
                                    </div>
                                    <input
                                      type="number"
                                      min={1}
                                      value={callDurationMinutes}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value) || 1;
                                        setCallDurationMinutes(val);
                                        if (hangupWindowMinutes >= val) {
                                          setHangupWindowMinutes(val - 1 > 0 ? val - 1 : 1);
                                        }
                                      }}
                                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                      style={{ fontFamily: 'Outfit, sans-serif', color: '#020817' }}
                                    />
                                  </div>

                                  <div className="flex-1">
                                    <div className="flex items-center gap-1.5 mb-2">
                                      <label className="text-sm font-medium" style={{ color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>
                                        Hangup Window
                                      </label>
                                      <Tooltip text="During the last X minutes of the total call duration, the AI will proactively try to wrap up the conversation and end the call gracefully.">
                                        <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                      </Tooltip>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-gray-500 whitespace-nowrap" style={{ fontFamily: 'Outfit, sans-serif' }}>Last</span>
                                      <input
                                        type="number"
                                        min={1}
                                        max={callDurationMinutes - 1}
                                        value={hangupWindowMinutes}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value) || 1;
                                          if (val >= callDurationMinutes) {
                                            toast.error(`Hangup window must be less than the call duration (${callDurationMinutes} min)`);
                                            return;
                                          }
                                          setHangupWindowMinutes(val);
                                        }}
                                        className="flex-1 min-w-0 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                        style={{ fontFamily: 'Outfit, sans-serif', color: '#020817' }}
                                      />
                                      <span className="text-sm text-gray-500 whitespace-nowrap" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                        {hangupWindowMinutes === 1 ? 'minute' : 'minutes'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Retry Rules */}
                          <div className="w-full rounded-xl border border-gray-200 overflow-hidden bg-white mt-4">
                            <button
                              type="button"
                              onClick={() => setRetryRulesExpanded(!retryRulesExpanded)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <RefreshCw className="w-5 h-5 text-primary" />
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                    Retry Rules
                                  </span>
                                  <Tooltip text="Automatically retry the call if it fails, based on the rules below.">
                                    <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                  </Tooltip>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                  {retryRulesEnabled ? 'On' : 'Off'}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${retryRulesExpanded ? 'rotate-180' : ''}`} />
                              </div>
                            </button>

                            {retryRulesExpanded && (
                              <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50/40">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                                      Enable Retry Rules
                                    </span>
                                    <Tooltip text="If call fails, automatically retry calling based on rules configured below.">
                                      <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                    </Tooltip>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={retryRulesEnabled}
                                      onChange={(e) => setRetryRulesEnabled(e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                                  </label>
                                </div>

                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <label className="text-sm font-medium" style={{ color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>
                                      Retry Attempts
                                    </label>
                                    <Tooltip text="Number of call retry attempts to make before failing permanently.">
                                      <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                    </Tooltip>
                                  </div>
                                  <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={retryAttempts}
                                    onChange={(e) => setRetryAttempts(parseInt(e.target.value) || 1)}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                    style={{ fontFamily: 'Outfit, sans-serif', color: '#020817' }}
                                  />
                                </div>

                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <label className="text-sm font-medium" style={{ color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>
                                      Delay Between Retries (minutes)
                                    </label>
                                    <Tooltip text="Time to wait between each retry attempt.">
                                      <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                    </Tooltip>
                                  </div>
                                  <input
                                    type="number"
                                    min={1}
                                    value={retryDelay}
                                    onChange={(e) => setRetryDelay(parseInt(e.target.value) || 1)}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                    style={{ fontFamily: 'Outfit, sans-serif', color: '#020817' }}
                                  />
                                </div>

                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <label className="text-sm font-medium" style={{ color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>
                                      Fallback Stage
                                    </label>
                                    <Tooltip text="Workflow stage to transition call task to if all retry attempts fail.">
                                      <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                    </Tooltip>
                                  </div>
                                  <select
                                    value={retryFallbackStage}
                                    onChange={(e) => setRetryFallbackStage(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                                    style={{ fontFamily: 'Outfit, sans-serif', color: '#020817' }}
                                  >
                                    <option value="Do Nothing">Do Nothing</option>
                                    {selectedProcessData?.stages.map((s) => (
                                      <option key={s.id} value={s.name}>
                                        {s.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Skip Day Rules */}
                          <div className="w-full rounded-xl border border-gray-200 overflow-hidden bg-white mt-4">
                            <button
                              type="button"
                              onClick={() => setSkipDayRulesExpanded(!skipDayRulesExpanded)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-primary" />
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                    Skip Day Rules
                                  </span>
                                  <Tooltip text="Avoid placing outbound calls on selected days or dates.">
                                    <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                  </Tooltip>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                  {skipDayRulesEnabled ? 'On' : 'Off'}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${skipDayRulesExpanded ? 'rotate-180' : ''}`} />
                              </div>
                            </button>

                            {skipDayRulesExpanded && (
                              <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50/40">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                                      Enable Skip Day Rules
                                    </span>
                                    <Tooltip text="Avoid making automated outbound calls on selected days/dates.">
                                      <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                    </Tooltip>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={skipDayRulesEnabled}
                                      onChange={(e) => setSkipDayRulesEnabled(e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                                  </label>
                                </div>

                                <div>
                                  <div className="flex items-center gap-2 mb-3">
                                    <label className="text-sm font-medium" style={{ color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>
                                      Weekly Off Days
                                    </label>
                                    <Tooltip text="Days of the week to skip automated calling.">
                                      <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                    </Tooltip>
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => {
                                      const isActive = weeklyOffDays.includes(day);
                                      return (
                                        <button
                                          key={day}
                                          type="button"
                                          onClick={() =>
                                            setWeeklyOffDays((prev) =>
                                              isActive ? prev.filter((d) => d !== day) : [...prev, day]
                                            )
                                          }
                                          className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold border transition-all ${isActive
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600'
                                            }`}
                                          style={{ fontFamily: 'DM Sans, sans-serif' }}
                                        >
                                          {day}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <label className="text-sm font-medium" style={{ color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>
                                      Custom Off Dates
                                    </label>
                                    <Tooltip text="Specific calendar dates on which no calls will be placed.">
                                      <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                    </Tooltip>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="date"
                                      value={customOffDate}
                                      onChange={(e) => setCustomOffDate(e.target.value)}
                                      className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                      style={{ fontFamily: 'Outfit, sans-serif', color: '#020817' }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (customOffDate && !customOffDatesList.includes(customOffDate)) {
                                          setCustomOffDatesList((prev) => [...prev, customOffDate]);
                                          setCustomOffDate('');
                                        }
                                      }}
                                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors flex-shrink-0"
                                    >
                                      <Plus className="w-4 h-4 text-white" />
                                    </button>
                                  </div>

                                  {customOffDatesList.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {customOffDatesList.map((date) => (
                                        <span
                                          key={date}
                                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium"
                                          style={{ fontFamily: 'Outfit, sans-serif' }}
                                        >
                                          {date}
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setCustomOffDatesList((prev) => prev.filter((d) => d !== date))
                                            }
                                            className="hover:text-blue-900 transition-colors"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  <p className="mt-2 text-xs" style={{ color: '#94A3B8', fontFamily: 'Outfit, sans-serif' }}>
                                    Calls will not be scheduled on selected days and dates.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Business Hours */}
                          <div className="w-full rounded-xl border border-gray-200 overflow-hidden bg-white mt-4">
                            <button
                              type="button"
                              onClick={() => setBusinessHoursExpanded(!businessHoursExpanded)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-primary" />
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                    Business Hours
                                  </span>
                                  <Tooltip text="Restrict when the AI actively receives calls/messages or makes outbound calls to specific hours per day.">
                                    <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                  </Tooltip>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${businessHoursEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                  {businessHoursEnabled ? 'On' : 'Off'}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${businessHoursExpanded ? 'rotate-180' : ''}`} />
                              </div>
                            </button>

                            {businessHoursExpanded && (
                              <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50/40">
                                {/* Enable toggle */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                                      Enable Business Hours
                                    </span>
                                    <Tooltip text="When enabled, this process/stage will only actively operate within the hours defined below.">
                                      <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                    </Tooltip>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={businessHoursEnabled}
                                      onChange={(e) => setBusinessHoursEnabled(e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                                  </label>
                                </div>

                                {/* Timezone */}
                                <div>
                                  <label className="text-sm font-medium block mb-2" style={{ color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>Timezone</label>
                                  <select
                                    value={businessHoursTimezone}
                                    onChange={(e) => setBusinessHoursTimezone(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                  >
                                    <option value="America/New_York">Eastern Time (ET)</option>
                                    <option value="America/Chicago">Central Time (CT)</option>
                                    <option value="America/Denver">Mountain Time (MT)</option>
                                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                                    <option value="Asia/Kolkata">India Standard Time (IST)</option>
                                    <option value="Europe/London">GMT / London</option>
                                  </select>
                                </div>

                                {/* Per-day hours */}
                                <div className="space-y-2">
                                  <label className="text-sm font-medium block" style={{ color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>Hours by Day</label>
                                  {(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const).map((day) => {
                                    const dayData = businessHoursByDay[day];
                                    return (
                                      <div key={day} className="flex items-center gap-3 p-2.5 bg-white border border-gray-200 rounded-lg">
                                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                          <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={dayData.enabled}
                                            onChange={(e) =>
                                              setBusinessHoursByDay((prev) => ({ ...prev, [day]: { ...prev[day], enabled: e.target.checked } }))
                                            }
                                          />
                                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                                        </label>
                                        <span className="text-sm font-semibold w-10 shrink-0" style={{ fontFamily: 'DM Sans, sans-serif', color: dayData.enabled ? '#020817' : '#9CA3AF' }}>
                                          {day}
                                        </span>
                                        <input
                                          type="time"
                                          value={dayData.start}
                                          disabled={!dayData.enabled}
                                          onChange={(e) =>
                                            setBusinessHoursByDay((prev) => ({ ...prev, [day]: { ...prev[day], start: e.target.value } }))
                                          }
                                          className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 disabled:bg-gray-50"
                                        />
                                        <span className="text-xs text-gray-400">to</span>
                                        <input
                                          type="time"
                                          value={dayData.end}
                                          disabled={!dayData.enabled}
                                          onChange={(e) =>
                                            setBusinessHoursByDay((prev) => ({ ...prev, [day]: { ...prev[day], end: e.target.value } }))
                                          }
                                          className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 disabled:bg-gray-50"
                                        />
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Outside-hours behavior */}
                                <div>
                                  <label className="text-sm font-medium block mb-2" style={{ color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>
                                    When contacted outside business hours
                                  </label>
                                  <select
                                    value={outsideHoursAction}
                                    onChange={(e) => setOutsideHoursAction(e.target.value as typeof outsideHoursAction)}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors mb-3"
                                  >
                                    <option value="message">Play/Send a custom message</option>
                                    <option value="voicemail">Route to voicemail</option>
                                    <option value="queue">Queue until next business hours</option>
                                  </select>
                                  {outsideHoursAction === "message" && (
                                    <textarea
                                      value={outsideHoursMessage}
                                      onChange={(e) => setOutsideHoursMessage(e.target.value)}
                                      rows={3}
                                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:border-blue-500 transition-colors"
                                      placeholder="We're currently closed. Our business hours are..."
                                    />
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Detect Voicemail */}
                          <div className="w-full rounded-xl border border-gray-200 overflow-hidden bg-white mt-4">
                            <button
                              type="button"
                              onClick={() => setDetectVoicemailExpanded(!detectVoicemailExpanded)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Voicemail className="w-5 h-5 text-primary" />
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                    Detect Voicemail
                                  </span>
                                  <Tooltip text="This allows AI to detect if the caller is on leave voice mail and disconnect the call.">
                                    <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                  </Tooltip>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                  {detectVoicemailEnabled ? 'On' : 'Off'}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${detectVoicemailExpanded ? 'rotate-180' : ''}`} />
                              </div>
                            </button>

                            {detectVoicemailExpanded && (
                              <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/40">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                                      Enable Voicemail Detection
                                    </span>
                                    <Tooltip text="This allows AI to detect if the caller is on leave voice mail and disconnect the call">
                                      <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                    </Tooltip>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={detectVoicemailEnabled}
                                      onChange={(e) => setDetectVoicemailEnabled(e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Save & Apply Options */}
                          <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col gap-4">
                            <div className="flex justify-end gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  if (applyAdvancedSettingsToAllStages) {
                                    toast.success("Advanced settings saved and applied to all stages successfully!");
                                  } else {
                                    toast.success("Advanced settings saved successfully!");
                                  }
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition-colors"
                                style={{ fontFamily: 'DM Sans, sans-serif' }}
                              >
                                Apply to All Stages
                              </button>
                            </div>
                          </div>

                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            ) : selectedProcessData && viewMode === "stage" && expandedStage ? (
              (() => {
                const stage = selectedProcessData.stages.find((s) => s.id === expandedStage);
                if (!stage) return null;

                return (
                  <div className="h-full flex flex-col">
                    {/* Stage Header: Tabs + Corner Automations Button matching Client Workflow */}
                    <div className="px-6 py-3.5 border-b border-border bg-white flex items-center justify-between">
                      {/* Left: General & AI Agent Tabs */}
                      <div className="flex items-center gap-2">
                        {[
                          { id: "general", label: "General" },
                          { id: "ai-agent", label: "AI Agent" },
                        ].map((tab) => {
                          const isActive =
                            activeTab === tab.id ||
                            (tab.id === "general" && (activeTab === "basic" || activeTab === "automation")) ||
                            (tab.id === "ai-agent" && activeTab === "advanced");
                          return (
                            <button
                              key={tab.id}
                              onClick={() => setActiveTab(tab.id)}
                              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all cursor-pointer ${
                                isActive
                                  ? "bg-primary text-primary-foreground shadow-xs"
                                  : "text-muted-foreground hover:bg-muted hover:text-gray-900"
                              }`}
                              style={{ fontFamily: 'DM Sans, sans-serif' }}
                            >
                              {tab.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Right Corner: Automation Icon Label Button + Stage Delete */}
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedWorkflowStepCard(null);
                            setWorkflowStepsDrawerOpen(true);
                          }}
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-800 bg-white hover:bg-gray-50 border border-gray-200 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                          style={{ fontFamily: 'DM Sans, sans-serif' }}
                          title="View and configure automations for this stage"
                        >
                          <div className="w-5 h-5 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Zap className="w-3.5 h-3.5" />
                          </div>
                          <span>Automations</span>
                          {workflowSteps.length > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                              {workflowSteps.length}
                            </span>
                          )}
                        </button>

                        <Tooltip text="Delete Stage">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 p-0 hover:bg-red-50 hover:border-red-200"
                            onClick={() => {
                              setStageToDelete(stage);
                              setShowDeleteStageModal(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </Tooltip>
                      </div>
                    </div>

                    {/* Stage Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                      {/* General Tab */}
                      {(activeTab === "general" || activeTab === "basic") && (
                        <div className="space-y-6">
                          {/* Stage Configuration Section */}
                          <div className="space-y-4">
                            {/* Type and Right Column Field Row */}
                            <div className={(stageType === "Transfer to Human" || stageType === "AI Makes Calls") ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "w-full"}>
                              {/* Type Dropdown */}
                              <div className="flex flex-col w-full">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <label className="block text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                    Action
                                  </label>
                                  <InfoTooltip text="Controls how this stage handles communication — whether the AI answers inbound calls, makes outbound calls, or hands off to a person." />
                                </div>
                                <Select value={stageType} onValueChange={setStageType}>
                                  <SelectTrigger className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="AI Receives Calls">Client Reach Out To Us</SelectItem>
                                    <SelectItem value="AI Makes Calls">Reach Out To The Client</SelectItem>
                                    <SelectItem value="No Call Activity">No Action</SelectItem>
                                    <SelectItem value="Transfer to Human">Handle By Human</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Responsible Person - Only show when Type is "Transfer to Human" */}
                              {stageType === "Transfer to Human" && (
                                <div className="flex flex-col">
                                  <label className="block text-sm font-medium mb-2" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                    Responsible Person
                                  </label>
                                  <Select value={responsiblePerson} onValueChange={setResponsiblePerson}>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select an employee" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableEmployees.map((employee) => (
                                        <SelectItem key={employee.id} value={employee.id}>
                                          {employee.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              {/* Outbound Source - Only show when Type is "AI Makes Calls" (Reach Out To The Client) */}
                              {stageType === "AI Makes Calls" && (
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <label className="block text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                      Outbound Source
                                    </label>
                                    <InfoTooltip text="Select the integrated phone number/source used by AI when making outbound calls or sending messages to the client." />
                                  </div>
                                  <Select
                                    value={selectedInboundNumbers[0] || inboundNumbers[0] || ""}
                                    onValueChange={(val) => {
                                      setSelectedInboundNumbers([val]);
                                      const updated: StageChannelSource[] = [{ id: "cs-outbound-1", channel: "calls", source: val }];
                                      setChannelSources(updated);
                                    }}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select outbound source" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {inboundNumbers.map((num) => (
                                        <SelectItem key={num} value={num}>
                                          {num}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>

                            {/* Unified Channel & Source Dropdown Selector - Only when stageType is "AI Receives Calls" */}
                            {stageType === "AI Receives Calls" && (
                              <div ref={channelDropdownRef} className="relative flex flex-col space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <label className="block text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                      Through which channel client has reach out to us
                                    </label>
                                    <InfoTooltip text="Configure each channel (Calls, SMS, WhatsApp, Website) and its corresponding integrated source number or website link for this stage." />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setShowHowToReceiveCallModal(true)}
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors"
                                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                                  >
                                    How to Receive Call
                                  </button>
                                </div>

                                {/* Dropdown Trigger Box */}
                                <div
                                  onClick={() => setShowChannelDropdown(!showChannelDropdown)}
                                  className="flex items-center justify-between min-h-[44px] p-2.5 bg-input-background border border-input rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                                >
                                  <div className="flex flex-wrap gap-2 items-center flex-1">
                                    {channelSources.length === 0 ? (
                                      <span className="text-sm text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                        Select channel and source...
                                      </span>
                                    ) : (
                                      channelSources.map((cs) => {
                                        const channelLabel = cs.channel === "calls" ? "Calls" : cs.channel === "whatsapp" ? "WhatsApp" : cs.channel === "sms" ? "SMS" : "Website";
                                        return (
                                          <span
                                            key={cs.id}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium"
                                            style={{ fontFamily: 'Outfit, sans-serif' }}
                                          >
                                            <span className="font-semibold">{channelLabel}:</span>
                                            <span className="opacity-90">{cs.source || "(Not set)"}</span>
                                          </span>
                                        );
                                      })
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 pl-2 text-muted-foreground">
                                    <ChevronDown className={`w-4 h-4 transition-transform ${showChannelDropdown ? "rotate-180" : ""}`} />
                                  </div>
                                </div>

                                {/* Dropdown Panel Popover */}
                                {showChannelDropdown && (
                                  <div className="absolute top-full mt-2 left-0 right-0 p-4 bg-card border border-border rounded-xl shadow-xl z-30 space-y-4 max-h-[380px] overflow-y-auto">
                                    <div className="flex items-center justify-between pb-2 border-b border-border">
                                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                        Configure Channels & Sources
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setShowChannelDropdown(false)}
                                        className="text-xs text-primary font-medium hover:underline"
                                      >
                                        Done
                                      </button>
                                    </div>

                                    {/* Configured Channel-Source Rows */}
                                    <div className="space-y-3">
                                      {channelSources.map((cs, idx) => {
                                        const isPhoneChannel = cs.channel === "calls" || cs.channel === "whatsapp" || cs.channel === "sms";
                                        return (
                                          <div key={cs.id || idx} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-muted/30 p-3 rounded-lg border border-border">
                                            {/* Field 1: Channel */}
                                            <div className="sm:col-span-5 flex flex-col">
                                              <label className="text-xs font-medium text-muted-foreground mb-1">Channel</label>
                                              <Select
                                                value={cs.channel}
                                                onValueChange={(val: "calls" | "sms" | "whatsapp" | "website") => {
                                                  const updated = [...channelSources];
                                                  const newSource = val === "website" ? "" : (inboundNumbers[0] || "+1 (555) 123-4567");
                                                  updated[idx] = { ...cs, channel: val, source: newSource };
                                                  setChannelSources(updated);
                                                  setSelectedStageChannels(updated.map((c) => c.channel));
                                                  setSelectedInboundNumbers(updated.filter((c) => c.source).map((c) => c.source));
                                                }}
                                              >
                                                <SelectTrigger className="w-full h-9 bg-white">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="calls">Calls</SelectItem>
                                                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                                  <SelectItem value="sms">SMS</SelectItem>
                                                  <SelectItem value="website">Website</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>

                                            {/* Field 2: Source (Integrated Phone Number or Website Link) */}
                                            <div className="sm:col-span-6 flex flex-col">
                                              <label className="text-xs font-medium text-muted-foreground mb-1">
                                                {isPhoneChannel ? "Integrated Number (Source)" : "Website Link (Optional Source)"}
                                              </label>
                                              {isPhoneChannel ? (
                                                <Select
                                                  value={cs.source || inboundNumbers[0] || ""}
                                                  onValueChange={(val) => {
                                                    const updated = [...channelSources];
                                                    updated[idx] = { ...cs, source: val };
                                                    setChannelSources(updated);
                                                    setSelectedInboundNumbers(updated.filter((c) => c.source).map((c) => c.source));
                                                  }}
                                                >
                                                  <SelectTrigger className="w-full h-9 bg-white">
                                                    <SelectValue placeholder="Select integrated number" />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {inboundNumbers.map((num) => (
                                                      <SelectItem key={num} value={num}>
                                                        {num}
                                                      </SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                              ) : (
                                                <Input
                                                  type="text"
                                                  placeholder="https://example.com/contact (optional)"
                                                  value={cs.source}
                                                  onChange={(e) => {
                                                    const updated = [...channelSources];
                                                    updated[idx] = { ...cs, source: e.target.value };
                                                    setChannelSources(updated);
                                                  }}
                                                  className="h-9 text-sm bg-white"
                                                />
                                              )}
                                            </div>

                                            {/* Delete button */}
                                            <div className="sm:col-span-1 flex items-center justify-end pt-5 sm:pt-0">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  if (channelSources.length <= 1) {
                                                    toast.error("At least one channel configuration is required.");
                                                    return;
                                                  }
                                                  const updated = channelSources.filter((_, i) => i !== idx);
                                                  setChannelSources(updated);
                                                  setSelectedStageChannels(updated.map((c) => c.channel));
                                                  setSelectedInboundNumbers(updated.filter((c) => c.source).map((c) => c.source));
                                                }}
                                                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-muted rounded-md transition-colors"
                                                title="Remove channel"
                                              >
                                                <X className="w-4 h-4" />
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {/* Add Channel Button */}
                                    <div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const defaultNum = inboundNumbers[0] || "+1 (555) 123-4567";
                                          const updated = [
                                            ...channelSources,
                                            { id: `cs-${Date.now()}`, channel: "calls" as const, source: defaultNum }
                                          ];
                                          setChannelSources(updated);
                                          setSelectedStageChannels(updated.map((c) => c.channel));
                                          setSelectedInboundNumbers(updated.filter((c) => c.source).map((c) => c.source));
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add Channel
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* When to move to this stage */}
                            <div className="rounded-lg border border-border overflow-hidden">
                              <button
                                onClick={() => setWhenToMoveExpanded(!whenToMoveExpanded)}
                                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                              >
                                <div className="flex flex-col items-start gap-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                      When to move to this stage
                                    </span>
                                    <InfoTooltip text="Describe the trigger condition in plain English — the AI uses this to decide when to move a contact here." />
                                  </div>
                                  <span className="text-xs" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                                    Define the conditions or criteria for moving to this stage.
                                  </span>
                                </div>
                                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${whenToMoveExpanded ? "rotate-180" : ""}`} />
                              </button>

                              {whenToMoveExpanded && (
                                <div className="p-6 border-t border-border">
                                  <textarea
                                    value={whenToMove}
                                    onChange={(e) => setWhenToMove(e.target.value)}
                                    placeholder="Define the conditions or criteria for moving to this stage..."
                                    className="w-full p-3 bg-input-background border border-input rounded-lg resize-none text-sm"
                                    style={{ fontFamily: 'Outfit, sans-serif', minHeight: '100px' }}
                                  />
                                </div>
                              )}
                            </div>

                            {/* Call Action - Hidden when Action is Handle By Human (Transfer to Human) or No Action (No Call Activity) */}
                            {stageType !== "Transfer to Human" && stageType !== "No Call Activity" && (
                              <div className="space-y-3 pt-2">
                                <div>
                                  <h4 className="text-sm font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                    Call Action
                                  </h4>
                                  <p className="text-xs mt-0.5" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                                    What action triggers when a lead enters this stage?
                                  </p>
                                </div>

                                <div className="p-4 sm:p-5 bg-white dark:bg-card border border-border/80 rounded-2xl flex items-center justify-between shadow-xs">
                                  <div className="flex items-center gap-3.5">
                                    <PhoneCall className="w-5 h-5 text-emerald-600 shrink-0" />
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-sm font-bold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                        Enable Calling
                                      </span>
                                      <span className="text-xs" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                                        Allow the AI agent to initiate or receive calls for leads in this stage.
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setShowCallTriggerDrawer(true)}
                                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg transition-colors cursor-pointer"
                                      title="Call Trigger Settings"
                                    >
                                      <Settings className="w-4 h-4" />
                                    </button>

                                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                      <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={enableCalling}
                                        onChange={(e) => {
                                          const newVal = e.target.checked;
                                          setEnableCalling(newVal);
                                          if (selectedProcess && expandedStage) {
                                            setProcesses((prev) =>
                                              prev.map((p) =>
                                                p.id !== selectedProcess
                                                  ? p
                                                  : {
                                                    ...p,
                                                    stages: p.stages.map((s) =>
                                                      s.id !== expandedStage
                                                        ? s
                                                        : { ...s, enableCalling: newVal }
                                                    ),
                                                  }
                                              )
                                            );
                                          }
                                        }}
                                      />
                                      <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                  </div>
                                </div>
                              </div>
                            )}

                          </div>
                        </div>
                      )}

                      {/* AI Agent Tab */}
                      {activeTab === "ai-agent" && (
                        <div className="space-y-6">
                          {/* 1. AI Model Settings Section */}
                          <div className="space-y-3">
                            <div>
                              <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                AI Model Settings
                              </h3>
                              <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                Fine-tune the technical execution of the AI agent's voice and intelligence.
                              </p>
                            </div>

                            <div className="rounded-2xl border border-gray-200/80 bg-white p-6 md:p-7 shadow-xs space-y-6">
                              {/* Row 1: AI Model & Speech Speed */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                                {/* AI Model */}
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-blue-500 font-mono font-bold text-sm leading-none">&gt;_</span>
                                    <span className="text-sm font-bold text-gray-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                      AI Model
                                    </span>
                                    <Tooltip text="Select the underlying LLM that powers the conversational logic.">
                                      <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help transition-colors" />
                                    </Tooltip>
                                  </div>
                                  <div className="relative">
                                    <select
                                      value={selectedAIModel}
                                      onChange={(e) => {
                                        if (e.target.value === "__view_more_models__") {
                                          navigate('/settings?tab=voice-config&sub=models');
                                          return;
                                        }
                                        setSelectedAIModel(e.target.value);
                                        toast.success(`AI Model updated to ${e.target.value}`);
                                      }}
                                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl appearance-none text-sm font-medium text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors pr-10 cursor-pointer shadow-2xs"
                                      style={{ fontFamily: 'Outfit, sans-serif' }}
                                    >
                                      {activeAIModels.map((m) => (
                                        <option key={m.id} value={m.name}>
                                          {m.name} ({m.provider})
                                        </option>
                                      ))}
                                      <option disabled value="">──────────</option>
                                      <option value="__view_more_models__" className="text-blue-600 font-semibold">
                                        Choose from library →
                                      </option>
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                  </div>
                                </div>

                                {/* Speech Speed */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <Volume2 className="w-4 h-4 text-amber-500" />
                                      <span className="text-sm font-bold text-gray-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                        Speech Speed
                                      </span>
                                      <Tooltip text="Adjust how fast the AI speaks to ensure a natural conversational rhythm. Speech speed significantly affects naturalness — 1.0x (Natural) is highly recommended.">
                                        <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help transition-colors" />
                                      </Tooltip>
                                    </div>
                                    <span className="text-xs font-semibold text-gray-800" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                      {stageVoiceSpeed.toFixed(1)}x
                                    </span>
                                  </div>
                                  <div className="space-y-2 pt-1">
                                    <input
                                      type="range"
                                      min="0.5"
                                      max="1.5"
                                      step="0.1"
                                      value={stageVoiceSpeed}
                                      onChange={(e) => setStageVoiceSpeed(parseFloat(e.target.value))}
                                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                    <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 tracking-wider">
                                      <span>SLOW</span>
                                      <span>NATURAL</span>
                                      <span>FAST</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Row 2: Voice Engine, Tone, Style in same row */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-100 items-start">
                                {/* Voice Engine */}
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1.5">
                                    <Mic className="w-4 h-4 text-emerald-500" />
                                    <span className="text-sm font-bold text-gray-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                      Voice Engine
                                    </span>
                                    <Tooltip text="Choose the vocal personality that best represents your brand's tone.">
                                      <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help transition-colors" />
                                    </Tooltip>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                      <select
                                        value={stageVoice}
                                        onChange={(e) => {
                                          if (e.target.value === "__view_more_voices__") {
                                            navigate('/settings?tab=voice-config&sub=voices');
                                            return;
                                          }
                                          setStageVoice(e.target.value);
                                          toast.success(`Voice updated to ${e.target.value}`);
                                        }}
                                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl appearance-none text-sm font-medium text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors pr-7 cursor-pointer shadow-2xs"
                                        style={{ fontFamily: 'Outfit, sans-serif' }}
                                      >
                                        {activeConfiguredVoices.map((v) => (
                                          <option key={v.id || v.name} value={v.name}>
                                            {v.name} ({v.country}, {v.gender})
                                          </option>
                                        ))}
                                        <option disabled value="">──────────</option>
                                        <option value="__view_more_voices__" className="text-blue-600 font-semibold">
                                          Choose from library →
                                        </option>
                                      </select>
                                      <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        toast.success(`Playing preview for ${stageVoice || activeConfiguredVoices[0]?.name || "Nova"}...`);
                                        if ("speechSynthesis" in window) {
                                          window.speechSynthesis.cancel();
                                          const utterance = new SpeechSynthesisUtterance("Hello! This is how your AI voice sounds.");
                                          utterance.rate = stageVoiceSpeed;
                                          window.speechSynthesis.speak(utterance);
                                        }
                                      }}
                                      className="flex items-center gap-1.5 px-3.5 py-2.5 border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/40 rounded-xl text-sm font-semibold text-gray-800 transition-all cursor-pointer shadow-2xs group flex-shrink-0"
                                      style={{ fontFamily: 'Outfit, sans-serif' }}
                                    >
                                      <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                                      <span className="group-hover:text-emerald-700 text-xs">Test</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Tone */}
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-bold text-gray-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                      Tone
                                    </span>
                                    <Tooltip text="Set the emotional tone used by the AI assistant.">
                                      <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help transition-colors" />
                                    </Tooltip>
                                  </div>
                                  <div className="relative">
                                    <select
                                      value={stageTone}
                                      onChange={(e) => {
                                        setStageTone(e.target.value);
                                        toast.success(`Tone updated to ${e.target.value}`);
                                      }}
                                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl appearance-none text-sm font-medium text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors pr-8 cursor-pointer shadow-2xs"
                                      style={{ fontFamily: 'Outfit, sans-serif' }}
                                    >
                                      <option value="Professional">Professional</option>
                                      <option value="Friendly">Friendly</option>
                                      <option value="Empathetic">Empathetic</option>
                                      <option value="Casual">Casual</option>
                                      <option value="Persuasive">Persuasive</option>
                                      <option value="Authoritative">Authoritative</option>
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                  </div>
                                </div>

                                {/* Style */}
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-bold text-gray-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                      Style
                                    </span>
                                    <Tooltip text="Select conversational phrasing style (concise vs detailed).">
                                      <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help transition-colors" />
                                    </Tooltip>
                                  </div>
                                  <div className="relative">
                                    <select
                                      value={stageStyle}
                                      onChange={(e) => {
                                        setStageStyle(e.target.value);
                                        toast.success(`Style updated to ${e.target.value}`);
                                      }}
                                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl appearance-none text-sm font-medium text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors pr-8 cursor-pointer shadow-2xs"
                                      style={{ fontFamily: 'Outfit, sans-serif' }}
                                    >
                                      <option value="Balanced">Balanced</option>
                                      <option value="Concise">Concise</option>
                                      <option value="Detailed">Detailed</option>
                                      <option value="Warm">Warm</option>
                                      <option value="Expressive">Expressive</option>
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 2. Caller Pitch Card */}
                          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-xs">
                            {/* Collapsible Header */}
                            <button
                              type="button"
                              onClick={() => setCallerPitchExpanded(!callerPitchExpanded)}
                              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/70 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600">
                                  <Sparkles className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col items-start text-left">
                                  <span className="text-base font-semibold text-gray-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                    Caller Pitch
                                  </span>
                                  <span className="text-xs text-gray-500" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                    Script or instructions used by the AI agent when conversing on calls in this stage.
                                  </span>
                                </div>
                              </div>
                              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${callerPitchExpanded ? "rotate-180" : ""}`} />
                            </button>

                            {/* Expanded Content */}
                            {callerPitchExpanded && (
                              <div className="p-6 border-t border-gray-100 space-y-6">
                                {/* Mode Toggle */}
                                <div className="flex items-center gap-3">
                                  <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl w-fit">
                                    <button
                                      type="button"
                                      onClick={() => setCallerPitchMode("single")}
                                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${callerPitchMode === "single"
                                        ? "bg-primary text-white shadow-xs"
                                        : "text-gray-600 hover:text-gray-900"
                                        }`}
                                      style={{ fontFamily: 'Outfit, sans-serif' }}
                                    >
                                      Single Prompt
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setCallerPitchMode("comprehensive")}
                                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${callerPitchMode === "comprehensive"
                                        ? "bg-primary text-white shadow-xs"
                                        : "text-gray-600 hover:text-gray-900"
                                        }`}
                                      style={{ fontFamily: 'Outfit, sans-serif' }}
                                    >
                                      Comprehensive
                                    </button>
                                  </div>
                                  {callerPitchMode === "single" ? (
                                    <InfoTooltip text="Single Prompt lets you write the entire outbound script as one open text box, with a Generate with AI shortcut — the fastest option for a simple stage." />
                                  ) : (
                                    <InfoTooltip text="Comprehensive mode lets you set a separate greeting, objective, business info, and languages instead of one combined script." />
                                  )}
                                </div>

                                {/* Single Prompt Mode */}
                                {callerPitchMode === "single" && (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <label className="text-xs font-bold text-slate-800" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                        Pitch Script / Prompt
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() => setPitchFieldPickerTarget("callerPitch")}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors cursor-pointer"
                                        style={{ fontFamily: 'Outfit, sans-serif' }}
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        Select Field
                                      </button>
                                    </div>

                                    <textarea
                                      ref={callerPitchRef}
                                      value={callerPitch}
                                      onChange={(e) => setCallerPitch(e.target.value)}
                                      className="w-full p-4 bg-gray-50/50 border border-input rounded-xl resize-none text-sm text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors leading-relaxed"
                                      style={{ fontFamily: 'Outfit, sans-serif', minHeight: '140px' }}
                                      placeholder="Write your caller script or instructions here... Use Select Field in the top right to insert dynamic variables."
                                    />
                                    <div className="flex items-center justify-end">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          toast.success("AI is generating optimized caller pitch...");
                                          setCallerPitch("Hi {{name}}, this is your dedicated assistant from {{organization.name}}. I'm reaching out to follow up on your recent inquiry and help answer any questions you might have about our services. Do you have a quick moment to speak?");
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                                        style={{ fontFamily: 'Outfit, sans-serif' }}
                                      >
                                        <Zap className="w-4 h-4 text-amber-500" />
                                        Generate with AI
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Comprehensive Mode */}
                                {callerPitchMode === "comprehensive" && (
                                  <div className="space-y-4">
                                    {/* A. Greeting / Intro Message */}
                                    <div className="rounded-xl border border-border overflow-hidden">
                                      <button
                                        type="button"
                                        onClick={() => setGreetingIntroExpanded(!greetingIntroExpanded)}
                                        className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
                                      >
                                        <div className="flex flex-col items-start gap-0.5">
                                          <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                            Greeting / Intro Message
                                          </span>
                                          {!greetingIntroExpanded && greetingIntroMessage && (
                                            <span className="text-xs truncate max-w-md" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                                              {greetingIntroMessage.slice(0, 80)}...
                                            </span>
                                          )}
                                          {!greetingIntroExpanded && !greetingIntroMessage && (
                                            <span className="text-xs" style={{ color: '#9CA3AF', fontFamily: 'Outfit, sans-serif' }}>
                                              Not configured
                                            </span>
                                          )}
                                        </div>
                                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${greetingIntroExpanded ? "rotate-180" : ""}`} />
                                      </button>

                                      {greetingIntroExpanded && (
                                        <div className="p-4 border-t border-border space-y-2">
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-slate-700" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                              Greeting Text
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => setPitchFieldPickerTarget("greetingIntro")}
                                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors cursor-pointer"
                                              style={{ fontFamily: 'Outfit, sans-serif' }}
                                            >
                                              <Plus className="w-3.5 h-3.5" />
                                              Select Field
                                            </button>
                                          </div>
                                          <textarea
                                            ref={greetingIntroRef}
                                            value={greetingIntroMessage}
                                            onChange={(e) => setGreetingIntroMessage(e.target.value)}
                                            placeholder="Hi, this is Alex from {{organization.name}}. Who do I have the pleasure of speaking with today?"
                                            className="w-full p-3 bg-input-background border border-input rounded-lg resize-none text-sm"
                                            style={{ fontFamily: 'Outfit, sans-serif', minHeight: '100px' }}
                                          />
                                        </div>
                                      )}
                                    </div>

                                    {/* B. Objective */}
                                    <div className="rounded-xl border border-border overflow-hidden">
                                      <button
                                        type="button"
                                        onClick={() => setObjectiveExpanded(!objectiveExpanded)}
                                        className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
                                      >
                                        <div className="flex flex-col items-start gap-0.5">
                                          <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                            Objective
                                          </span>
                                          {!objectiveExpanded && objectiveText && (
                                            <span className="text-xs truncate max-w-md" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                                              {objectiveText.slice(0, 80)}...
                                            </span>
                                          )}
                                          {!objectiveExpanded && !objectiveText && (
                                            <span className="text-xs" style={{ color: '#9CA3AF', fontFamily: 'Outfit, sans-serif' }}>
                                              Not configured
                                            </span>
                                          )}
                                        </div>
                                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${objectiveExpanded ? "rotate-180" : ""}`} />
                                      </button>

                                      {objectiveExpanded && (
                                        <div className="p-4 border-t border-border space-y-2">
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-slate-700" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                              Objective Instructions
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => setPitchFieldPickerTarget("objective")}
                                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors cursor-pointer"
                                              style={{ fontFamily: 'Outfit, sans-serif' }}
                                            >
                                              <Plus className="w-3.5 h-3.5" />
                                              Select Field
                                            </button>
                                          </div>
                                          <textarea
                                            ref={objectiveTextRef}
                                            value={objectiveText}
                                            onChange={(e) => setObjectiveText(e.target.value)}
                                            placeholder="You are an AI assistant for {{organization.name}}. Your role is to answer general inquiries, schedule appointments, and provide information about our services."
                                            className="w-full p-3 bg-input-background border border-input rounded-lg resize-none text-sm"
                                            style={{ fontFamily: 'Outfit, sans-serif', minHeight: '100px' }}
                                          />
                                        </div>
                                      )}
                                    </div>

                                    {/* C. Business Information */}
                                    <div className="rounded-xl border border-border overflow-hidden">
                                      <button
                                        type="button"
                                        onClick={() => setBusinessInfoExpanded(!businessInfoExpanded)}
                                        className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                            Business Information
                                          </span>
                                          {!businessInfoExpanded && businessInfoItems.length > 0 && (
                                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-600" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                              {businessInfoItems.length} {businessInfoItems.length === 1 ? 'item' : 'items'}
                                            </span>
                                          )}
                                          {!businessInfoExpanded && businessInfoItems.length === 0 && (
                                            <span className="text-xs" style={{ color: '#9CA3AF', fontFamily: 'Outfit, sans-serif' }}>
                                              No data added
                                            </span>
                                          )}
                                        </div>
                                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${businessInfoExpanded ? "rotate-180" : ""}`} />
                                      </button>

                                      {businessInfoExpanded && (
                                        <div className="p-4 border-t border-border space-y-3">
                                          <p className="text-sm mb-3" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                                            Add business information that the AI should know while speaking with callers.
                                          </p>

                                          {/* Existing Business Info Items */}
                                          {businessInfoItems.map((item) => (
                                            <div key={item.id} className="p-3 border border-border rounded-lg bg-muted/20">
                                              <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                  <span className="text-sm font-bold" style={{ color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>
                                                    {item.title}
                                                  </span>
                                                  {item.active && (
                                                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                                      Active
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setEditingBusinessInfoId(item.id);
                                                      setBusinessInfoFormData({
                                                        title: item.title,
                                                        information: item.information,
                                                        active: item.active
                                                      });
                                                      setShowBusinessInfoForm(true);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-700"
                                                  >
                                                    <Edit className="w-4 h-4" />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setBusinessInfoItems(businessInfoItems.filter(i => i.id !== item.id));
                                                      toast.success("Information deleted");
                                                    }}
                                                    className="text-red-600 hover:text-red-700"
                                                  >
                                                    <Trash2 className="w-4 h-4" />
                                                  </button>
                                                </div>
                                              </div>
                                              <p className="text-xs" style={{ color: '#6B7280', fontFamily: 'Outfit, sans-serif' }}>
                                                {item.information}
                                              </p>
                                            </div>
                                          ))}

                                          {/* Inline Add/Edit Form */}
                                          {showBusinessInfoForm && (
                                            <div className="p-4 border border-primary/30 rounded-lg bg-blue-50/30 space-y-3">
                                              <div>
                                                <label className="block text-xs font-medium mb-1" style={{ color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>
                                                  Title
                                                </label>
                                                <input
                                                  type="text"
                                                  value={businessInfoFormData.title}
                                                  onChange={(e) => setBusinessInfoFormData({ ...businessInfoFormData, title: e.target.value })}
                                                  placeholder="Example: Clinic Timings"
                                                  className="w-full p-2 bg-white border border-input rounded-lg text-sm"
                                                  style={{ fontFamily: 'Outfit, sans-serif' }}
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs font-medium mb-1" style={{ color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>
                                                  Information
                                                </label>
                                                <textarea
                                                  value={businessInfoFormData.information}
                                                  onChange={(e) => setBusinessInfoFormData({ ...businessInfoFormData, information: e.target.value })}
                                                  placeholder="Example: Our clinic is open Monday to Saturday from 9 AM to 7 PM."
                                                  className="w-full p-2 bg-white border border-input rounded-lg resize-none text-sm"
                                                  style={{ fontFamily: 'Outfit, sans-serif', minHeight: '80px' }}
                                                />
                                              </div>
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                  <label className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                                    Active
                                                  </label>
                                                  <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                      type="checkbox"
                                                      className="sr-only peer"
                                                      checked={businessInfoFormData.active}
                                                      onChange={(e) => setBusinessInfoFormData({ ...businessInfoFormData, active: e.target.checked })}
                                                    />
                                                    <div className="w-11 h-6 bg-switch-background peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-switch-background after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                                  </label>
                                                </div>
                                                <div className="flex gap-2">
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setShowBusinessInfoForm(false);
                                                      setEditingBusinessInfoId(null);
                                                      setBusinessInfoFormData({ title: "", information: "", active: true });
                                                    }}
                                                    className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                                    style={{ fontFamily: 'Outfit, sans-serif' }}
                                                  >
                                                    Cancel
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      if (businessInfoFormData.title && businessInfoFormData.information) {
                                                        if (editingBusinessInfoId !== null) {
                                                          setBusinessInfoItems(businessInfoItems.map(item =>
                                                            item.id === editingBusinessInfoId
                                                              ? { ...item, ...businessInfoFormData }
                                                              : item
                                                          ));
                                                          toast.success("Information updated");
                                                        } else {
                                                          setBusinessInfoItems([...businessInfoItems, {
                                                            id: Date.now(),
                                                            ...businessInfoFormData
                                                          }]);
                                                          toast.success("Information added");
                                                        }
                                                        setShowBusinessInfoForm(false);
                                                        setEditingBusinessInfoId(null);
                                                        setBusinessInfoFormData({ title: "", information: "", active: true });
                                                      }
                                                    }}
                                                    className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover"
                                                    style={{ fontFamily: 'Outfit, sans-serif' }}
                                                  >
                                                    Done
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          )}

                                          {/* Add Information Button */}
                                          {!showBusinessInfoForm && (
                                            <button
                                              type="button"
                                              onClick={() => setShowBusinessInfoForm(true)}
                                              className="w-full px-4 py-2 border border-dashed border-gray-400 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 text-sm font-medium"
                                              style={{ fontFamily: 'Outfit, sans-serif' }}
                                            >
                                              <Plus className="w-4 h-4" />
                                              Add Information
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* D. Languages */}
                                    <div className="rounded-xl border border-border overflow-hidden">
                                      <button
                                        type="button"
                                        onClick={() => setLanguagesExpanded(!languagesExpanded)}
                                        className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
                                      >
                                        <div className="flex flex-col items-start gap-0.5">
                                          <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                            Languages
                                          </span>
                                          {!languagesExpanded && (primaryLanguage || secondaryLanguages.length > 0) && (
                                            <span className="text-xs" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                                              {primaryLanguage && `Primary: ${primaryLanguage}`}
                                              {primaryLanguage && secondaryLanguages.length > 0 && ' · '}
                                              {secondaryLanguages.length > 0 && `Secondary: ${secondaryLanguages.join(', ')}`}
                                            </span>
                                          )}
                                          {!languagesExpanded && !primaryLanguage && secondaryLanguages.length === 0 && (
                                            <span className="text-xs" style={{ color: '#9CA3AF', fontFamily: 'Outfit, sans-serif' }}>
                                              Not configured
                                            </span>
                                          )}
                                        </div>
                                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${languagesExpanded ? "rotate-180" : ""}`} />
                                      </button>

                                      {languagesExpanded && (
                                        <div className="p-4 border-t border-border space-y-4">
                                          {/* Primary Language */}
                                          <div>
                                            <div className="flex items-center gap-2 mb-2">
                                              <label className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                                Primary Language *
                                              </label>
                                              <Tooltip text="The default language your AI Receptionist will speak on all calls for this stage.">
                                                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                                              </Tooltip>
                                            </div>
                                            <Select value={primaryLanguage} onValueChange={setPrimaryLanguage}>
                                              <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select primary language" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="English">English</SelectItem>
                                                <SelectItem value="Spanish">Spanish</SelectItem>
                                                <SelectItem value="French">French</SelectItem>
                                                <SelectItem value="German">German</SelectItem>
                                                <SelectItem value="Italian">Italian</SelectItem>
                                                <SelectItem value="Portuguese">Portuguese</SelectItem>
                                                <SelectItem value="Chinese">Chinese</SelectItem>
                                                <SelectItem value="Japanese">Japanese</SelectItem>
                                                <SelectItem value="Korean">Korean</SelectItem>
                                                <SelectItem value="Arabic">Arabic</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>

                                          {/* Secondary Languages */}
                                          <div>
                                            <div className="flex items-center gap-2 mb-2">
                                              <label className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                                Secondary Languages
                                              </label>
                                              <Tooltip text="Fallback language(s) the AI can switch to if the caller requests it or if their language differs from the primary. You can add multiple.">
                                                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                                              </Tooltip>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Select value={secondaryLanguageDraft} onValueChange={setSecondaryLanguageDraft}>
                                                <SelectTrigger className="flex-1">
                                                  <SelectValue placeholder="Select a fallback language (optional)" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {["English", "Spanish", "French", "German", "Italian", "Portuguese", "Chinese", "Japanese", "Korean", "Arabic"]
                                                    .filter(lang => lang !== primaryLanguage && !secondaryLanguages.includes(lang))
                                                    .map(lang => (
                                                      <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                              </Select>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  if (secondaryLanguageDraft) {
                                                    setSecondaryLanguages([...secondaryLanguages, secondaryLanguageDraft]);
                                                    setSecondaryLanguageDraft("");
                                                  }
                                                }}
                                                disabled={!secondaryLanguageDraft}
                                                className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                                              >
                                                <Plus className="w-4 h-4 text-white" />
                                              </button>
                                            </div>
                                            {secondaryLanguages.length > 0 && (
                                              <div className="flex flex-wrap gap-2 mt-2">
                                                {secondaryLanguages.map((lang) => (
                                                  <span key={lang} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                                                    {lang}
                                                    <button
                                                      type="button"
                                                      onClick={() => setSecondaryLanguages(secondaryLanguages.filter(l => l !== lang))}
                                                      className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                                                    >
                                                      <X className="w-3 h-3" />
                                                    </button>
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Flow Builder Tab */}
                      {activeTab === "flowbuilder" && (
                        <div className="-m-6 h-[calc(100%+3rem)]">
                          <FlowBuilderTab
                            processName={selectedProcessData?.name ?? "Current Process"}
                            stageName={stage.name}
                            processes={processes}
                            currentProcessId={selectedProcess ?? undefined}
                            workflowSteps={workflowSteps}
                            onWorkflowStepsChange={setWorkflowSteps}
                            stepAllowedTriggers={STEP_ALLOWED_TRIGGERS}
                            scopingRules={
                              (selectedProcessData?.scopingRules && selectedProcessData.scopingRules.length > 0)
                                ? selectedProcessData.scopingRules
                                : (selectedCategoryFilter && selectedCategoryFilter !== "All")
                                  ? [{ industryCategory: selectedCategoryFilter, industries: selectedIndustryFilter !== "All" ? [selectedIndustryFilter] : [], locations: selectedLocationFilter !== "All" ? [selectedLocationFilter] : [] }]
                                  : []
                            }
                          />
                        </div>
                      )}

                      {/* Automation Side Drawer */}
                      {/* Refactored Scope-Aware Automation Drawer (Stage Scope) */}
                      <AddAutomationDrawer
                        isOpen={workflowStepsDrawerOpen}
                        onClose={() => {
                          setWorkflowStepsDrawerOpen(false);
                          setEditingAutomationStepId(undefined);
                        }}
                        scope="stage"
                        isAdmin={true}
                        initialScopingRules={stageScopeRules}
                        onScopingRulesChange={(newRules) => {
                          if (selectedProcess && expandedStage) {
                            setProcesses((prev) =>
                              prev.map((p) =>
                                p.id !== selectedProcess
                                  ? p
                                  : {
                                      ...p,
                                      stages: p.stages.map((s) =>
                                        s.id !== expandedStage ? s : { ...s, scopingRules: newRules }
                                      ),
                                    }
                              )
                            );
                          }
                        }}
                        stageRef={{
                          processId: selectedProcess || "",
                          stageId: expandedStage || "",
                          stageName: selectedProcessData?.stages.find((s) => s.id === expandedStage)?.name,
                          processName: selectedProcessData?.name,
                        }}
                        processName={selectedProcessData?.name}
                        stageName={selectedProcessData?.stages.find((s) => s.id === expandedStage)?.name}
                        stageColor={selectedProcessData?.stages.find((s) => s.id === expandedStage)?.color}
                        stageType={selectedProcessData?.stages.find((s) => s.id === expandedStage)?.stageType}
                        processes={processes}
                        currentProcessId={selectedProcess || undefined}
                        workflowSteps={workflowSteps}
                        onWorkflowStepsChange={(newSteps) => {
                          setWorkflowSteps(newSteps);
                          if (selectedProcess && expandedStage) {
                            setProcesses((prev) =>
                              prev.map((p) =>
                                p.id !== selectedProcess
                                  ? p
                                  : {
                                      ...p,
                                      stages: p.stages.map((s) =>
                                        s.id !== expandedStage ? s : { ...s, workflowSteps: newSteps }
                                      ),
                                    }
                              )
                            );
                          }
                        }}
                        stepAllowedTriggers={STEP_ALLOWED_TRIGGERS}
                        initialStepIdToConfigure={editingAutomationStepId}
                        onSaveAutomation={(savedAuto) => {
                          const updated = savedAuto.steps.map((s) => ({
                            id: s.id,
                            name: s.name,
                            description: s.description || "",
                            iconKey: s.iconKey || "zap",
                            stepKey: s.stepKey,
                            params: s.params || {},
                            delayValue: s.delay?.value || 0,
                            delayUnit: (s.delay?.unit as any) || "minutes",
                            executionType: "wait" as const,
                            trigger: savedAuto.trigger.type === "stage" && (savedAuto.trigger as any).when === "exit" ? "exit_stage" : "stage",
                          }));
                          setWorkflowSteps(updated);
                          if (selectedProcess && expandedStage) {
                            setProcesses((prev) =>
                              prev.map((p) =>
                                p.id !== selectedProcess
                                  ? p
                                  : {
                                      ...p,
                                      stages: p.stages.map((s) =>
                                        s.id !== expandedStage
                                          ? s
                                          : {
                                              ...s,
                                              workflowSteps: updated,
                                              scopingRules: (savedAuto as any).scopingRules || s.scopingRules || stageScopeRules,
                                            }
                                      ),
                                    }
                              )
                            );
                          }
                        }}
                      />

                      {/* Step Detail Drawer */}
                      <StepDetailDrawer
                        isOpen={stepDetailDrawerOpen && !!currentEditingStep}
                        step={currentEditingStep}
                        isCreatingNewStep={isCreatingNewStep}
                        stepAllowedTriggers={STEP_ALLOWED_TRIGGERS}
                        processes={processes}
                        scopingRules={
                          (selectedProcessData?.scopingRules && selectedProcessData.scopingRules.length > 0)
                            ? selectedProcessData.scopingRules
                            : (selectedCategoryFilter && selectedCategoryFilter !== "All")
                              ? [{ industryCategory: selectedCategoryFilter, industries: selectedIndustryFilter !== "All" ? [selectedIndustryFilter] : [], locations: selectedLocationFilter !== "All" ? [selectedLocationFilter] : [] }]
                              : []
                        }
                        stepTrigger={stepTrigger}
                        onStepTriggerChange={setStepTrigger}
                        executionType={executionType}
                        onExecutionTypeChange={setExecutionType}
                        delayValue={delayValue}
                        onDelayValueChange={setDelayValue}
                        delayUnit={delayUnit}
                        onDelayUnitChange={setDelayUnit}
                        connectAfterId={connectAfterId}
                        onConnectAfterIdChange={setConnectAfterId}
                        availablePredecessors={buildAvailablePredecessors(workflowSteps, stepTrigger, currentEditingStep?.id)}
                        params={captureStepParams(currentEditingStep?.stepKey)}
                        onParamsChange={(patch) => {
                          Object.entries(patch).forEach(([key, value]) => {
                            const setter = stateSetters[key];
                            if (setter) setter(value);
                          });
                        }}
                        onBack={() => {
                          setStepDetailDrawerOpen(false);
                          setIsCreatingNewStep(false);
                          setSelectedWorkflowStepCard(null);
                          setWorkflowStepsDrawerOpen(true);
                        }}
                        onClose={() => {
                          setStepDetailDrawerOpen(false);
                          setIsCreatingNewStep(false);
                        }}
                        onlyParameters={true}
                        onSave={() => {
                          const pendingIntent = intentInput.trim();
                          const finalIntentConditions = pendingIntent
                            ? [...intentConditions, { id: `intent-${Date.now()}`, value: pendingIntent }]
                            : intentConditions;

                          if (pendingIntent) {
                            setIntentConditions(finalIntentConditions);
                            setIntentInput("");
                          }

                          if (currentEditingStep) {
                            const capturedParams = captureStepParams(currentEditingStep.stepKey);
                            capturedParams.intentConditions = finalIntentConditions;

                            console.log("[DEBUG] Saving step with conditionsEnabled:", capturedParams.conditionsEnabled, "intentConditions:", finalIntentConditions);

                            const stepToSave: WorkflowStep = {
                              ...currentEditingStep,
                              trigger: stepTrigger,
                              executionType: stepTrigger !== "incall" ? executionType : undefined,
                              delayValue: stepTrigger !== "incall" ? delayValue : undefined,
                              delayUnit: stepTrigger !== "incall" ? delayUnit : undefined,
                              connectAfterId: stepTrigger !== "incall" && executionType === "wait" ? connectAfterId : undefined,
                              params: capturedParams,
                            };
                            if (isCreatingNewStep) {
                              if (branchAddTarget === "true") {
                                setTrueBranchSteps(prev => [...prev, stepToSave]);
                                setBranchAddTarget(null);
                              } else if (branchAddTarget === "false") {
                                setFalseBranchSteps(prev => [...prev, stepToSave]);
                                setBranchAddTarget(null);
                              } else {
                                setWorkflowSteps(prev => [...prev, stepToSave]);
                              }
                              setIsCreatingNewStep(false);
                              toast.success("Step added successfully");
                            } else {
                              setWorkflowSteps(prev => prev.map(s => s.id === currentEditingStep.id ? stepToSave : s));
                              setTrueBranchSteps(prev => prev.map(s => s.id === currentEditingStep.id ? stepToSave : s));
                              setFalseBranchSteps(prev => prev.map(s => s.id === currentEditingStep.id ? stepToSave : s));
                              toast.success("Step settings saved successfully");
                            }
                          }
                          setStepDetailDrawerOpen(false);
                        }}
                      />


                      <div className="mt-6 pt-6 border-t border-border flex justify-end gap-3">
                        <Button variant="outline" onClick={() => {
                          setExpandedStage(null);
                          setViewMode("process");
                        }}>Cancel</Button>
                        <Button
                          variant="primary"
                          onClick={() => {
                            if (!selectedProcess || !expandedStage) return;
                            setProcesses((prev) =>
                              prev.map((p) =>
                                p.id !== selectedProcess
                                  ? p
                                  : {
                                    ...p,
                                    stages: p.stages.map((s) =>
                                      s.id !== expandedStage
                                        ? s
                                        : {
                                          ...s,
                                          stageType,
                                          selectedInboundNumbers,
                                          selectedStageChannels,
                                          channelSources,
                                          responsiblePerson,
                                          whenToMove,
                                          callerPitchMode,
                                          callerPitch,
                                          greetingIntroMessage,
                                          objectiveText,
                                          businessInfoItems,
                                          primaryLanguage,
                                          secondaryLanguages,
                                          enableCalling,
                                        }
                                    ),
                                  }
                              )
                            );
                            toast.success("Stage configuration saved");
                          }}
                        >
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-24 h-24 bg-muted/30 rounded-full flex items-center justify-center mb-6">
                  <ChevronRight className="w-12 h-12" style={{ color: '#64748B' }} />
                </div>
                <h3 className="text-xl font-semibold mb-2" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Select a process or stage to begin</h3>
                <p className="max-w-md" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                  Choose a process to configure its settings, or select a stage to edit its configuration
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Add Process Modal */}
        <Modal
          isOpen={showAddProcessModal}
          onClose={() => {
            setShowAddProcessModal(false);
            setNewProcess({ name: "", description: "" });
            setNewProcessEntityType("client");
            setModalScopingRules([]);
            setModalPermissions({ canHide: true, canEdit: true, canAdd: true, canDelete: true });
          }}
          title="Add New Process"
          footer={
            <>
              <Button variant="outline" onClick={() => {
                setShowAddProcessModal(false);
                setNewProcess({ name: "", description: "" });
                setNewProcessEntityType("client");
                setModalScopingRules([]);
                setModalPermissions({ canHide: true, canEdit: true, canAdd: true, canDelete: true });
              }}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAddProcess}
              >
                Add Process
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Process Name"
              value={newProcess.name}
              onChange={(e) => setNewProcess({ ...newProcess, name: e.target.value })}
              placeholder="Enter process name"
            />
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                Process Description
              </label>
              <textarea
                value={newProcess.description}
                onChange={(e) => setNewProcess({ ...newProcess, description: e.target.value })}
                placeholder="Enter process description"
                className="w-full px-4 py-3 bg-input-background border border-input rounded-xl resize-none h-24"
              />
            </div>

            {/* Entity Type Selector */}
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                Entity Type
              </label>
              <select
                value={newProcessEntityType}
                onChange={(e) => setNewProcessEntityType(e.target.value as EntityType)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-gray-800 font-medium"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <option value="client">Processes</option>
                <option value="appointment">Appointments</option>
                <option value="invoice">Invoices</option>
                <option value="insurance">Insurance</option>
                <option value="claim">Claims</option>
              </select>
              <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                Specify which entity this workflow process belongs to.
              </p>
            </div>

            {/* Admin Control (Scope Rules & Permissions) */}
            <div className="mt-4">
              <AdminControlAccordion
                scopingRules={modalScopingRules}
                onScopingRulesChange={(rules) => setModalScopingRules(rules)}
                allowEntities={false}
                permissions={modalPermissions}
                onPermissionsChange={(newPerms) => setModalPermissions((p) => ({ ...p, ...newPerms }))}
                defaultAdminControlOpen={modalAdminControlOpen}
                defaultScopeOpen={modalScopeDropdownOpen}
                defaultPermissionsOpen={modalPermissionsDropdownOpen}
                scopeTooltip="Define entity availability and restrict visibility by tenant industry category, industries, and locations."
                permissionsTooltip="Configure what tenant users are permitted to do with this process."
              />
            </div>
          </div>
        </Modal>

        {/* Add Stage Modal */}
        <Modal
          isOpen={showAddStageModal}
          onClose={() => {
            setShowAddStageModal(false);
            setNewStage({ name: "", description: "", color: STAGE_PRESET_COLORS[0], type: "Receive Inbound Calls" });
            setNewStagePosition(null);
            setNewStageSelectedNumbers([]);
            setShowNewStageNumberDropdown(false);
            setHasInteractedWithColor(false);
            setIsColorGridExpanded(false);
          }}
          title="Create Stage"
          maxWidth="md"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddStageModal(false);
                  setNewStage({ name: "", description: "", color: STAGE_PRESET_COLORS[0], type: "Receive Inbound Calls" });
                  setNewStagePosition(null);
                  setNewStageSelectedNumbers([]);
                  setShowNewStageNumberDropdown(false);
                  setHasInteractedWithColor(false);
                  setIsColorGridExpanded(false);
                }}
              >
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleAddStage}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                Create Stage
              </button>
            </div>
          }
        >
          <div className="space-y-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <p className="text-xs text-slate-500 -mt-2">Add a new stage to this template.</p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Stage Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newStage.name}
                onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
                placeholder="e.g. Initial Outreach"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all placeholder:text-slate-400 text-slate-900 font-medium"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Description
              </label>
              <textarea
                value={newStage.description}
                onChange={(e) => setNewStage({ ...newStage, description: e.target.value })}
                placeholder="Describe what happens in this stage..."
                rows={3}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all placeholder:text-slate-400 text-slate-900 resize-none"
              />
            </div>

            {/* Stage Color Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Stage Color
              </label>
              <div className="flex flex-wrap gap-2.5 items-center">
                {STAGE_PRESET_COLORS.map((color) => {
                  const isSelected = (newStage.color || STAGE_PRESET_COLORS[0]).toLowerCase() === color.toLowerCase();
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewStage({ ...newStage, color })}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-110 ${
                        isSelected ? "ring-2 ring-offset-2 ring-slate-400 scale-105" : ""
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Modal>

        {/* Delete Stage Confirmation Modal */}
        <Modal
          isOpen={showDeleteStageModal}
          onClose={() => {
            setShowDeleteStageModal(false);
            setStageToDelete(null);
          }}
          title="Delete Stage"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteStageModal(false);
                  setStageToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteStage}>
                Delete Stage
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {/* Warning Icon */}
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
            </div>

            {/* Main Message */}
            <div className="text-center space-y-2">
              <p className="text-base" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                Are you sure you want to delete this stage?
              </p>
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
                <p className="font-semibold text-destructive" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  {stageToDelete?.name}
                </p>
              </div>
            </div>

            {/* Warning Details */}
            <div className="bg-warning/5 border border-warning/20 rounded-xl p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                    This action cannot be undone
                  </p>
                  <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                    Deleting this stage will permanently remove it from the process. All associated configurations, webhooks, and settings will be lost.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Modal>

        {/* How Process Works Modal — shared component */}
        <HowItWorksModal
          isOpen={showProcessHowItWorksModal}
          onClose={() => setShowProcessHowItWorksModal(false)}
          title="How Process Works"
          summary="A Process is a full workflow made of stages — like Initial Contact → Insurance Verify → Schedule Appointment. Configure AI behavior once at the process level, or override it per stage."
          bullets={[
            "Create stages for each step in your workflow",
            "Set AI voice, model, tone, and style at the process level",
            "Override any setting for individual stages",
            "Add automations to run on entry, during calls, or after calls",
          ]}
          guideUrl="/guide/process-settings#process-level-advanced-settings"
        />

        {/* How Stage Works Modal — shared component */}
        <HowItWorksModal
          isOpen={showStageHowItWorksModal}
          onClose={() => setShowStageHowItWorksModal(false)}
          title="How Stage Works"
          summary="A Stage is one step in a process. It defines what the AI says, when a call moves here, and what automations fire when it does."
          bullets={[
            "Set the call type: AI Receives, AI Makes, Transfer to Human, or No Call Activity",
            "Write the Caller Pitch — what the AI says when initiating an outbound call",
            "Define when a client should move to this stage",
            "Add automations on stage entry, in-call, or post-call",
          ]}
          guideUrl="/guide/process-settings#stage-level-configuration"
        />

        {/* How Automations Works Modal */}
        <HowItWorksModal
          isOpen={showAutomationHowItWorksModal}
          onClose={() => setShowAutomationHowItWorksModal(false)}
          title="How Automations Works"
          summary="Automations are the actions this stage takes automatically — on entry, live during the call, or after it ends — with control over timing, order, and the conditions that gate them."
          bullets={[
            "Every step belongs to one of three lanes: On Stage Entry, In Call, or Post Call",
            "Steps run Wait (in sequence) or In Parallel (at the same time), with an optional Delay",
            "Add Field Conditions (any stage) or Intent Conditions (In Call only) to gate when a step fires",
            "Choose from Workflow Logic, Caller Engagement, Communication, Data & Assignment, or Webhook/API automations",
            "Every step you add here also appears as a node in the Flow Builder tab",
          ]}
          guideUrl="/guide/process-settings#automation-triggers-on-stage-entry-in-call-post-call"
        />

        {/* Page-level How It Works Modal */}
        <HowItWorksModal
          isOpen={showHelp}
          onClose={() => setShowHelp(false)}
          title="How Workflow Works"
          summary="Workflow is where you design the full behaviour of your AI receptionist — from how it greets callers to which actions fire after a call ends."
          bullets={[
            "Create processes (workflows) and add stages to each one",
            "Set AI voice, model, and tone globally or per stage",
            "Configure call type, pitch, and inbound phone numbers per stage",
            "Automate follow-ups, field updates, and handoffs in the Automation tab",
            "Use the Flow Builder to visualise and edit your automation steps visually",
          ]}
          guideUrl="/guide/process-settings"
        />

        {/* How to Receive Call — inline guide link in stage modal */}
        <Modal
          isOpen={showEditStageModal}
          onClose={() => {
            setShowEditStageModal(false);
            setEditingStage(null);
          }}
          title="Edit Stage"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Stage Name
              </label>
              <input
                type="text"
                value={editingStage?.name || ""}
                onChange={(e) => setEditingStage(editingStage ? { ...editingStage, name: e.target.value } : null)}
                className="w-full px-4 py-2 bg-white border border-border rounded-lg"
                style={{ fontFamily: 'Outfit, sans-serif' }}
                placeholder="Enter stage name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Stage Color
              </label>
              <div className="space-y-3">
                {/* Color Grid - First row or full grid */}
                <div className="flex items-start gap-2">
                  <div className={`flex-1 border border-gray-200 rounded-lg overflow-hidden ${isEditColorGridExpanded ? 'grid grid-cols-10 gap-0' : 'flex gap-0'}`}>
                    {(isEditColorGridExpanded ? COLOR_PALETTE : COLOR_PALETTE.slice(0, 10)).map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setEditingStage(editingStage ? { ...editingStage, color: color } : null)}
                        className={`w-full aspect-square transition-all hover:scale-110 hover:z-10 ${editingStage?.color === color
                          ? "ring-2 ring-white ring-inset z-20"
                          : ""
                          }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditColorGridExpanded(!isEditColorGridExpanded)}
                    className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 transition-colors mt-0"
                  >
                    <Plus className={`w-4 h-4 text-gray-600 transition-transform ${isEditColorGridExpanded ? 'rotate-45' : ''}`} />
                  </button>
                </div>

                {/* Selected Color Bar */}
                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 h-10 rounded-lg border-2 border-gray-300"
                    style={{ backgroundColor: editingStage?.color || "#22D3EE" }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const hexInput = prompt("Enter custom hex color:", editingStage?.color || "#22D3EE");
                      if (hexInput && /^#[0-9A-F]{6}$/i.test(hexInput)) {
                        setEditingStage(editingStage ? { ...editingStage, color: hexInput } : null);
                      }
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  >
                    Custom color
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  if (editingStage) {
                    handleRemoveStage(editingStage.id);
                    setShowEditStageModal(false);
                    setEditingStage(null);
                  }
                }}
                className="border-red-500 text-red-500 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditStageModal(false);
                    setEditingStage(null);
                  }}
                >
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSaveEditStage}>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </Modal>

        {/* Connect Next Process Stage Modal */}
        <Modal
          isOpen={showTransitionModal}
          onClose={() => {
            setShowTransitionModal(false);
            setTransitionSourceStageId(null);
          }}
          title="Connect Next Process Stage"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Define where leads should move when they complete this stage. This connects this process template to other workflows.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-700">Destination Process</label>
                <select
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                  value={handoffTargetProcessId || (processes.find((p) => p.id !== selectedProcess)?.id || "")}
                  onChange={(e) => {
                    setHandoffTargetProcessId(e.target.value);
                    const targetP = processes.find((p) => p.id === e.target.value);
                    if (targetP && targetP.stages.length > 0) {
                      setHandoffTargetStageName(targetP.stages[0].name);
                    }
                  }}
                >
                  {processes
                    .filter((p) => p.id !== selectedProcess)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-700">Destination Stage</label>
                <select
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                  value={handoffTargetStageName}
                  onChange={(e) => setHandoffTargetStageName(e.target.value)}
                >
                  {(
                    processes.find(
                      (p) => p.id === (handoffTargetProcessId || processes.find((pr) => pr.id !== selectedProcess)?.id)
                    )?.stages || []
                  ).map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={handoffAutoMove}
                  onChange={(e) => setHandoffAutoMove(e.target.checked)}
                  className="rounded text-purple-600"
                />
                <span className="font-medium">Automatically advance client to this stage upon reaching final stage</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTransitionModal(false);
                  setTransitionSourceStageId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                onClick={handleSaveQuickTransition}
              >
                Save & Connect Stage
              </Button>
            </div>
          </div>
        </Modal>

        {/* Add Number Modal */}
        <Modal
          isOpen={showAddNumberModal}
          onClose={() => {
            setShowAddNumberModal(false);
            setNewNumber("");
            setSelectedCountryCode("+1");
          }}
          title="Add New Number"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Country Code
              </label>
              <select
                value={selectedCountryCode}
                onChange={(e) => setSelectedCountryCode(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-border rounded-lg"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                <option value="+1">+1 (United States/Canada)</option>
                <option value="+44">+44 (United Kingdom)</option>
                <option value="+91">+91 (India)</option>
                <option value="+61">+61 (Australia)</option>
                <option value="+81">+81 (Japan)</option>
                <option value="+86">+86 (China)</option>
                <option value="+49">+49 (Germany)</option>
                <option value="+33">+33 (France)</option>
                <option value="+39">+39 (Italy)</option>
                <option value="+34">+34 (Spain)</option>
                <option value="+7">+7 (Russia)</option>
                <option value="+52">+52 (Mexico)</option>
                <option value="+55">+55 (Brazil)</option>
                <option value="+27">+27 (South Africa)</option>
                <option value="+971">+971 (UAE)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Phone Number
              </label>
              <input
                type="text"
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-border rounded-lg"
                style={{ fontFamily: 'Outfit, sans-serif' }}
                placeholder="Enter phone number (e.g., (555) 123-4567)"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddNumberModal(false);
                  setNewNumber("");
                  setSelectedCountryCode("+1");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (newNumber.trim()) {
                    const fullNumber = `${selectedCountryCode} ${newNumber.trim()}`;
                    setInboundNumbers([...inboundNumbers, fullNumber]);
                    setSelectedInboundNumbers([...selectedInboundNumbers, fullNumber]);
                    setShowAddNumberModal(false);
                    setNewNumber("");
                    setSelectedCountryCode("+1");
                    toast.success("Number added successfully");
                  } else {
                    toast.error("Please enter a valid number");
                  }
                }}
              >
                Add Number
              </Button>
            </div>
          </div>
        </Modal>

        {/* Temporary Disable Modal */}
        <Modal
          isOpen={showTemporaryDisableModal}
          onClose={() => setShowTemporaryDisableModal(false)}
          title="Tweak Advanced Settings"
        >
          <div className="space-y-6">
            {/* Temporary Disable Header with Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-base text-primary" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  Temporary Disable
                </h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={temporaryDisableEnabled}
                  onChange={(e) => setTemporaryDisableEnabled(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <p className="text-sm leading-relaxed -mt-2" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
              Temporarily disable your Receptionist by either setting a default hangup message or specifying a number to automatically forward calls to.
            </p>

            {/* Warning Box - Only show when enabled */}
            {temporaryDisableEnabled && (
              <div className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: '#FEF9C3' }}>
                <Info className="w-5 h-5 flex-shrink-0" style={{ color: '#854D0E' }} />
                <p className="text-sm" style={{ color: '#854D0E', fontFamily: 'Outfit, sans-serif' }}>
                  Your receptionist will be disabled. Please select from below, what will happen if your customer calls this receptionist number
                </p>
              </div>
            )}

            {/* Forward Calls Option - Only show when enabled */}
            {temporaryDisableEnabled && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                    Forward all incoming calls to another number
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={forwardCallsEnabled}
                      onChange={(e) => setForwardCallsEnabled(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* Phone Number Input - Only show when forward is enabled */}
                {forwardCallsEnabled && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-lg">
                      <span className="text-xl">🇺🇸</span>
                      <select
                        value={forwardCountryCode}
                        onChange={(e) => setForwardCountryCode(e.target.value)}
                        className="border-none bg-transparent text-sm outline-none"
                        style={{ fontFamily: 'Outfit, sans-serif' }}
                      >
                        <option value="+1">+1</option>
                        <option value="+44">+44</option>
                        <option value="+91">+91</option>
                      </select>
                    </div>
                    <input
                      type="tel"
                      value={forwardPhoneNumber}
                      onChange={(e) => setForwardPhoneNumber(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-border rounded-lg text-sm"
                      style={{ fontFamily: 'Outfit, sans-serif' }}
                    />
                  </div>
                )}

                {/* Custom Message Option */}
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                    Say a custom message and automatically hang up
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={customMessageEnabled}
                      onChange={(e) => setCustomMessageEnabled(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* Custom Message Input - Only show when custom message is enabled */}
                {customMessageEnabled && (
                  <input
                    type="text"
                    value={customMessageText}
                    onChange={(e) => setCustomMessageText(e.target.value)}
                    placeholder="Enter custom message"
                    className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                )}
              </>
            )}

            {/* Submit Button */}
            <div className="flex items-center justify-end">
              <Button
                variant="primary"
                onClick={() => {
                  setShowTemporaryDisableModal(false);
                  toast.success("Temporary disable settings saved");
                }}
              >
                Submit
              </Button>
            </div>
          </div>
        </Modal>

        {/* Add Smart Analysis Scenario Modal */}
        <Modal
          isOpen={showAnalysisScenarioModal}
          onClose={() => setShowAnalysisScenarioModal(false)}
          title="Add Smart Analysis Scenario"
          maxWidth="xl"
        >
          <div className="space-y-4">
            {/* What do you want to track? */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                <span className="text-red-500">*</span> What do you want to track?
                <Info className="w-4 h-4 inline-block ml-1 text-muted-foreground" />
              </label>
              <input
                type="text"
                value={analysisScenarioData.trackWhat}
                onChange={(e) => setAnalysisScenarioData({ ...analysisScenarioData, trackWhat: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-border rounded-lg"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              />
            </div>

            {/* Field Name */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                <span className="text-red-500">*</span> Field Name
                <Info className="w-4 h-4 inline-block ml-1 text-muted-foreground" />
              </label>
              <input
                type="text"
                value={analysisScenarioData.fieldName}
                onChange={(e) => setAnalysisScenarioData({ ...analysisScenarioData, fieldName: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-border rounded-lg"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              />
            </div>

            {/* What the AI will capture during calls */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                <span className="text-red-500">*</span> What the AI will capture during calls
                <Info className="w-4 h-4 inline-block ml-1 text-muted-foreground" />
              </label>
              <textarea
                value={analysisScenarioData.captureDescription}
                onChange={(e) => setAnalysisScenarioData({ ...analysisScenarioData, captureDescription: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-border rounded-lg resize-none h-20"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              />
            </div>

            {/* Format of data */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                <span className="text-red-500">*</span> Format of data
                <Info className="w-4 h-4 inline-block ml-1 text-muted-foreground" />
              </label>
              <select
                value={analysisScenarioData.dataFormat}
                onChange={(e) => setAnalysisScenarioData({ ...analysisScenarioData, dataFormat: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-border rounded-lg"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                <option>Text - Simple text responses like summaries or comments</option>
                <option>JSON - Structured data format</option>
                <option>Number - Numeric values</option>
                <option>Boolean - Yes/No values</option>
              </select>
            </div>

            {/* Output Format Example */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>
                Output Format Example
                <Info className="w-4 h-4 inline-block ml-1 text-muted-foreground" />
              </label>
              <textarea
                value={analysisScenarioData.outputExample}
                onChange={(e) => setAnalysisScenarioData({ ...analysisScenarioData, outputExample: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-border rounded-lg resize-none h-20"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              />
            </div>

            {/* Expected Output Format */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                <span className="text-red-500">*</span> Expected Output Format
                <Info className="w-4 h-4 inline-block ml-1 text-muted-foreground" />
              </label>
              <textarea
                value={analysisScenarioData.expectedFormat}
                onChange={(e) => setAnalysisScenarioData({ ...analysisScenarioData, expectedFormat: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-border rounded-lg resize-none h-20"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAnalysisScenarioModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const newScenario = {
                    id: Date.now(),
                    name: analysisScenarioData.trackWhat,
                    description: analysisScenarioData.captureDescription,
                    dataFormat: analysisScenarioData.dataFormat
                  };
                  setCallAnalysisScenarios([...callAnalysisScenarios, newScenario]);
                  setShowAnalysisScenarioModal(false);
                  toast.success("Analysis scenario added successfully");
                }}
              >
                Add Scenario
              </Button>
            </div>
          </div>
        </Modal>

        {/* Add Call Transferring Workflow Modal */}
        <Modal
          isOpen={showAddTransferModal}
          onClose={() => {
            setShowAddTransferModal(false);
            setTransferScenarios([{
              id: 1,
              description: "",
              countryCode: "+1",
              phoneNumber: "",
              extensionDigits: "",
              voiceResponse: "Please hold while I transfer your call",
              transferType: "cold",
              advancedExpanded: false
            }]);
          }}
          title="Add Call Transferring Workflow"
        >
          <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
            {transferScenarios.map((scenario, index) => (
              <div key={scenario.id} className="p-5 border border-gray-200 rounded-lg">
                {/* Scenario Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900">Scenario {index + 1}</h3>
                  {index > 0 && (
                    <button
                      onClick={() => setTransferScenarios(transferScenarios.filter(s => s.id !== scenario.id))}
                      className="px-3.5 py-1.5 bg-blue-600 text-white rounded-md flex items-center gap-1.5 text-[13px] hover:bg-blue-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  )}
                </div>

                {/* Scenario Description */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-semibold text-blue-600">Scenario Description</label>
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <input
                    type="text"
                    value={scenario.description}
                    onChange={(e) => {
                      const updated = transferScenarios.map(s =>
                        s.id === scenario.id ? { ...s, description: e.target.value } : s
                      );
                      setTransferScenarios(updated);
                    }}
                    placeholder="e.g. Transfer the caller to the billing department. Execute whenever caller asks fo..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] text-gray-400 placeholder:text-gray-400"
                  />
                </div>

                {/* Phone Number - Stacked Layout */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-semibold text-blue-600">Phone Number</label>
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                  </div>

                  {/* Number Field */}
                  <div className="mb-3">
                    <label className="block text-xs text-gray-500 mb-1">Number:</label>
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden h-10">
                      <select
                        value={scenario.countryCode}
                        onChange={(e) => {
                          const updated = transferScenarios.map(s =>
                            s.id === scenario.id ? { ...s, countryCode: e.target.value } : s
                          );
                          setTransferScenarios(updated);
                        }}
                        className="px-2 py-2 border-r border-gray-300 text-sm bg-white"
                      >
                        <option value="+1">🇺🇸 US +1</option>
                        <option value="+44">🇬🇧 UK +44</option>
                        <option value="+91">🇮🇳 IN +91</option>
                      </select>
                      <input
                        type="tel"
                        value={scenario.phoneNumber}
                        onChange={(e) => {
                          const updated = transferScenarios.map(s =>
                            s.id === scenario.id ? { ...s, phoneNumber: e.target.value } : s
                          );
                          setTransferScenarios(updated);
                        }}
                        className="flex-1 px-3 text-sm"
                      />
                    </div>
                  </div>

                  {/* Extension Digits */}
                  <div>
                    <label className="block text-xs font-semibold text-blue-600 mb-1">Extension (optional):</label>
                    <input
                      type="text"
                      value={scenario.extensionDigits || ""}
                      onChange={(e) => {
                        const updated = transferScenarios.map(s =>
                          s.id === scenario.id ? { ...s, extensionDigits: e.target.value } : s
                        );
                        setTransferScenarios(updated);
                      }}
                      placeholder="e.g. 1234"
                      className="w-full px-3 py-2 border-2 border-blue-500 rounded-lg text-sm focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Voice Response */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-semibold text-blue-600">Voice Response</label>
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <input
                    type="text"
                    value={scenario.voiceResponse}
                    onChange={(e) => {
                      const updated = transferScenarios.map(s =>
                        s.id === scenario.id ? { ...s, voiceResponse: e.target.value } : s
                      );
                      setTransferScenarios(updated);
                    }}
                    className="w-full px-3 py-2.5 border-2 border-blue-600 rounded-lg text-sm"
                  />
                </div>

                {/* Advanced Settings - Expandable */}
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      const updated = transferScenarios.map(s =>
                        s.id === scenario.id ? { ...s, advancedExpanded: !s.advancedExpanded } : s
                      );
                      setTransferScenarios(updated);
                    }}
                    className="flex items-center justify-between w-full text-[13px] font-semibold text-blue-600"
                  >
                    <span>Advanced Settings</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${scenario.advancedExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Expanded Content */}
                  {scenario.advancedExpanded && (
                    <div className="mt-4 pl-4">
                      <label className="block text-xs text-gray-400 uppercase mb-3">Call Transfer Type</label>
                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`transfer-type-${scenario.id}`}
                            checked={scenario.transferType === "cold"}
                            onChange={() => {
                              const updated = transferScenarios.map(s =>
                                s.id === scenario.id ? { ...s, transferType: "cold" } : s
                              );
                              setTransferScenarios(updated);
                            }}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-[13px] text-gray-700">Cold Transfer</span>
                          <Info className="w-3.5 h-3.5 text-gray-400" />
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`transfer-type-${scenario.id}`}
                            checked={scenario.transferType === "hot"}
                            onChange={() => {
                              const updated = transferScenarios.map(s =>
                                s.id === scenario.id ? { ...s, transferType: "hot" } : s
                              );
                              setTransferScenarios(updated);
                            }}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-[13px] text-gray-700">Hot Transfer</span>
                          <Info className="w-3.5 h-3.5 text-gray-400" />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Add Another Scenario Button */}
            <button
              onClick={() => {
                const newId = Math.max(...transferScenarios.map(s => s.id)) + 1;
                setTransferScenarios([...transferScenarios, {
                  id: newId,
                  description: "",
                  countryCode: "+1",
                  phoneNumber: "",
                  extensionDigits: "",
                  voiceResponse: "Please hold while I transfer your call",
                  transferType: "cold",
                  advancedExpanded: false
                }]);
              }}
              className="w-full py-3 text-[13px] text-blue-600 font-medium border-2 border-dashed border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-300"
            >
              + Add Call Transferring Workflow
            </button>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200 mt-4">
            <Button
              variant="primary"
              onClick={() => {
                const validScenarios = transferScenarios.filter(s => s.description && s.phoneNumber);
                if (validScenarios.length === 0) {
                  toast.error("Please fill in at least one complete scenario");
                  return;
                }
                const newScenarios = validScenarios.map((s, i) => ({
                  id: savedTransferScenarios.length + i + 1,
                  description: s.description,
                  phoneNumber: `${s.countryCode} ${s.phoneNumber}`,
                  voiceResponse: s.voiceResponse,
                  transferType: s.transferType || "cold",
                  enabled: true
                }));
                setSavedTransferScenarios([...savedTransferScenarios, ...newScenarios]);
                setShowAddTransferModal(false);
                setTransferScenarios([{
                  id: 1,
                  description: "",
                  countryCode: "+1",
                  phoneNumber: "",
                  extensionDigits: "",
                  voiceResponse: "Please hold while I transfer your call",
                  transferType: "cold",
                  advancedExpanded: false
                }]);
                toast.success("Call Transferring workflow has been created successfully!");
              }}
              className="px-7 py-2.5"
            >
              Submit
            </Button>
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteTransferConfirm}
          onClose={() => {
            setShowDeleteTransferConfirm(false);
            setTransferToDelete(null);
          }}
          title=""
        >
          <div className="text-center py-2">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-2">
              Are you sure you want to delete this scenario?
            </h3>
            <p className="text-[13px] text-gray-500 mb-6">
              Scenario {savedTransferScenarios.findIndex(s => s.id === transferToDelete) + 1} will be permanently deleted.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteTransferConfirm(false);
                  setTransferToDelete(null);
                }}
                className="px-5 py-2"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setSavedTransferScenarios(savedTransferScenarios.filter(s => s.id !== transferToDelete));
                  setShowDeleteTransferConfirm(false);
                  setTransferToDelete(null);
                  toast.success("Scenario deleted successfully");
                }}
                className="px-5 py-2 bg-red-500 hover:bg-red-600"
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>

        {/* Add Texting Workflow Modal */}
        <Modal
          isOpen={showAddTextMessageModal}
          onClose={() => {
            setShowAddTextMessageModal(false);
            setTextMessageScenarios([{
              id: 1,
              enableShortUrls: true,
              description: "",
              textMessage: "",
              nextAction: "",
              askBeforeSending: false,
              attachedImage: null,
              attachedImageUrl: null
            }]);
          }}
          title="Add Texting Workflow"
          maxWidth="lg"
        >
          <div className="max-h-[80vh] overflow-y-auto">
            {textMessageScenarios.map((scenario, index) => (
              <div key={scenario.id} className="border border-gray-200 rounded-lg p-5 mb-4">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900">Scenario {index + 1}</h3>
                </div>

                {/* Enable Short URLs */}
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-semibold text-blue-600">Enable Short URLs</label>
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={scenario.enableShortUrls}
                      onChange={(e) => {
                        const updated = textMessageScenarios.map(s =>
                          s.id === scenario.id ? { ...s, enableShortUrls: e.target.checked } : s
                        );
                        setTextMessageScenarios(updated);
                      }}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Scenario Description */}
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-semibold text-blue-600">Scenario Description</label>
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <textarea
                    value={scenario.description}
                    onChange={(e) => {
                      const updated = textMessageScenarios.map(s =>
                        s.id === scenario.id ? { ...s, description: e.target.value } : s
                      );
                      setTextMessageScenarios(updated);
                    }}
                    placeholder="e.g. Send the caller a copy of the menu. Execute whenever caller asks for menu or prices."
                    className="w-full min-h-[72px] px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 resize-none"
                  />
                </div>

                {/* Text Message */}
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-semibold text-blue-600">Text Message</label>
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <textarea
                    value={scenario.textMessage}
                    onChange={(e) => {
                      if (e.target.value.length <= 1000) {
                        const updated = textMessageScenarios.map(s =>
                          s.id === scenario.id ? { ...s, textMessage: e.target.value } : s
                        );
                        setTextMessageScenarios(updated);
                      }
                    }}
                    placeholder="e.g. Here is our menu: www.restaurant.com/menu"
                    className="w-full min-h-[72px] px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 resize-none"
                  />
                  <p className="text-xs text-blue-600 mt-1">* Max 1000 characters allowed</p>
                </div>

                {/* What should the AI do next? */}
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-semibold text-blue-600">What should the AI do next?</label>
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <textarea
                    value={scenario.nextAction}
                    onChange={(e) => {
                      const updated = textMessageScenarios.map(s =>
                        s.id === scenario.id ? { ...s, nextAction: e.target.value } : s
                      );
                      setTextMessageScenarios(updated);
                    }}
                    placeholder="e.g., Tell the caller you've sent them a text message, and then trigger the intake form defined earlier to collect their information."
                    className="w-full min-h-[72px] px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 resize-none"
                  />
                </div>

                {/* Ask before sending Text SMS */}
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-semibold text-blue-600">Ask before sending Text SMS</label>
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={scenario.askBeforeSending}
                      onChange={(e) => {
                        const updated = textMessageScenarios.map(s =>
                          s.id === scenario.id ? { ...s, askBeforeSending: e.target.checked } : s
                        );
                        setTextMessageScenarios(updated);
                      }}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Attach Image */}
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Image Upload</p>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-semibold text-blue-600">Attach Image (Optional)</label>
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                  </div>

                  {!scenario.attachedImageUrl ? (
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 1024 * 1024) {
                              toast.error("File size must be less than 1 MB");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const updated = textMessageScenarios.map(s =>
                                s.id === scenario.id ? {
                                  ...s,
                                  attachedImage: file,
                                  attachedImageUrl: event.target?.result as string
                                } : s
                              );
                              setTextMessageScenarios(updated);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="border-2 border-dashed border-blue-300 rounded-lg bg-blue-50 p-8 text-center">
                        <div className="flex flex-col items-center">
                          <Inbox className="w-9 h-9 text-blue-600 mb-3" />
                          <p className="text-sm text-gray-700 mb-1">Click or drag file to this area to upload</p>
                          <p className="text-xs text-gray-400">Must be JPEG/JPG/PNG image (Max. 1 MB)</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg mb-2">
                        <Paperclip className="w-4 h-4 text-gray-700" />
                        <span className="text-[13px] text-gray-700 flex-1">{scenario.attachedImage?.name}</span>
                        <button
                          onClick={() => {
                            const updated = textMessageScenarios.map(s =>
                              s.id === scenario.id ? {
                                ...s,
                                attachedImage: null,
                                attachedImageUrl: null
                              } : s
                            );
                            setTextMessageScenarios(updated);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <img
                        src={scenario.attachedImageUrl}
                        alt="Attached preview"
                        className="w-full max-h-40 rounded-lg border border-gray-200 object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Add Another Scenario Button */}
            <button
              onClick={() => {
                const newId = Math.max(...textMessageScenarios.map(s => s.id)) + 1;
                setTextMessageScenarios([...textMessageScenarios, {
                  id: newId,
                  enableShortUrls: true,
                  description: "",
                  textMessage: "",
                  nextAction: "",
                  askBeforeSending: false,
                  attachedImage: null,
                  attachedImageUrl: null
                }]);
              }}
              className="w-full py-3 text-[13px] text-blue-600 font-medium border-2 border-dashed border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-300"
            >
              + Add Texting Workflow
            </button>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200 mt-4">
            <Button
              variant="primary"
              onClick={() => {
                const validScenarios = textMessageScenarios.filter(s => s.description && s.textMessage);
                if (validScenarios.length === 0) {
                  toast.error("Please fill in at least one complete scenario");
                  return;
                }
                const newScenarios = validScenarios.map((s, i) => ({
                  id: savedTextMessageScenarios.length + i + 1,
                  enableShortUrls: s.enableShortUrls,
                  description: s.description,
                  textMessage: s.textMessage,
                  nextAction: s.nextAction,
                  askBeforeSending: s.askBeforeSending,
                  attachedImage: null,
                  attachedImageUrl: s.attachedImageUrl,
                  enabled: true
                }));
                setSavedTextMessageScenarios([...savedTextMessageScenarios, ...newScenarios]);
                setShowAddTextMessageModal(false);
                setTextMessageScenarios([{
                  id: 1,
                  enableShortUrls: true,
                  description: "",
                  textMessage: "",
                  nextAction: "",
                  askBeforeSending: false,
                  attachedImage: null,
                  attachedImageUrl: null
                }]);
                toast.success("Texting workflow has been created successfully!");
              }}
              className="px-7 py-2.5"
            >
              Submit
            </Button>
          </div>
        </Modal>

        {/* Delete Text Message Confirmation Modal */}
        <Modal
          isOpen={showDeleteTextMessageConfirm}
          onClose={() => {
            setShowDeleteTextMessageConfirm(false);
            setTextMessageToDelete(null);
          }}
          title=""
        >
          <div className="text-center py-2">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-2">
              Are you sure you want to delete this scenario?
            </h3>
            <p className="text-[13px] text-gray-500 mb-6">
              Scenario {savedTextMessageScenarios.findIndex(s => s.id === textMessageToDelete) + 1} will be permanently deleted.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteTextMessageConfirm(false);
                  setTextMessageToDelete(null);
                }}
                className="px-5 py-2"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setSavedTextMessageScenarios(savedTextMessageScenarios.filter(s => s.id !== textMessageToDelete));
                  setShowDeleteTextMessageConfirm(false);
                  setTextMessageToDelete(null);
                  toast.success("Scenario deleted successfully");
                }}
                className="px-5 py-2 bg-red-500 hover:bg-red-600"
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>

        {/* Template Selection Modal */}
        {showTemplateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.35)] p-4">
            <div className="bg-white rounded-xl shadow-[0px_8px_32px_rgba(0,0,0,0.14)] w-full max-w-[400px]">
              {/* Modal Header */}
              <div className="px-6 py-5">
                <button
                  onClick={() => {
                    setShowTemplateModal(false);
                    setSelectedTemplate(null);
                  }}
                  className="float-right text-[#9CA3AF] hover:text-gray-900"
                >
                  <X className="w-4 h-4" />
                </button>
                <h2 className="text-base font-bold text-[#111827]">Choose a form</h2>
              </div>

              {/* Separator */}
              <div className="h-px bg-[#F3F4F6]"></div>

              {/* Form List */}
              <div className="px-6 py-3">
                {/* Template List Items */}
                {FORM_TEMPLATES.map((template, index) => (
                  <div key={template.id}>
                    <button
                      onClick={() => {
                        const newForm = {
                          id: savedCollectInfoForms.length + 1,
                          templateName: template.name,
                          fields: template.fields
                        };
                        setSavedCollectInfoForms([...savedCollectInfoForms, newForm]);
                        setShowTemplateModal(false);
                        setSelectedTemplate(null);
                        toast.success(`${template.name} template added successfully!`);
                      }}
                      className={`group w-full h-[44px] flex items-center justify-between px-1 transition-all ${selectedTemplate === template.id
                        ? 'bg-[#EFF6FF] border-l-[3px] border-[#2563EB]'
                        : 'hover:bg-[#F9FAFB]'
                        }`}
                    >
                      <span className={`text-sm font-medium pl-1 ${selectedTemplate === template.id ? 'text-[#2563EB]' : 'text-[#111827]'
                        }`}>
                        {template.name}
                      </span>
                      <div className="flex items-center">
                        {selectedTemplate === template.id ? (
                          <svg className="w-4 h-4 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-[#9CA3AF] opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                    {index < FORM_TEMPLATES.length - 1 && <div className="h-px bg-[#F3F4F6]"></div>}
                  </div>
                ))}
              </div>

              {/* Separator */}
              <div className="h-px bg-[#F3F4F6]"></div>

              {/* Create New Form Button */}
              <div className="px-6 pb-3">
                <button
                  onClick={() => {
                    setShowTemplateModal(false);
                    toast.info("Redirecting to Web Forms page...");
                  }}
                  className="w-full h-[44px] flex items-center px-1 hover:bg-[#F0F7FF] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-[#2563EB] ml-1 mr-2" />
                  <span className="text-sm font-medium text-[#2563EB]">Create New Form</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <TestProcessChatDrawer
          isOpen={showTestProcessDrawer}
          onClose={() => setShowTestProcessDrawer(false)}
          processes={processes}
          getWorkflowStepsForStage={(processId, stageId) => getStoreWorkflowSteps(processId, stageId)}
        />

        <ProcessDetailDrawer
          isOpen={showProcessPreviewDrawer && previewLog !== null}
          onClose={() => setShowProcessPreviewDrawer(false)}
          log={previewLog}
          client={previewClient}
          activeTab={previewDrawerTab}
          isAdminPreview={true}
          onTabChange={(tab) => setPreviewDrawerTab(tab)}
          activity={previewActivity}
          onOpenActivity={(entry) => {
            if (entry.type === "whatsapp" || entry.type === "sms" || entry.type === "email") {
              navigate("/chats");
            } else if (entry.type === "appointment_booked") {
              navigate("/appointments");
            } else {
              setPreviewDrawerTab("history");
            }
          }}
          stageIdx={previewStageIdx}
          onStageChange={(idx) => {
            setPreviewStageIdx(idx);
            const stages = previewProcess?.stages || [];
            const newStage = stages[idx - 1]?.name || stages[0]?.name || "Stage Updated";
            toast.success(`Stage updated to ${newStage} ✓`);
          }}
          visibleFieldKeys={previewVisibleFieldKeys}
          onVisibleFieldKeysChange={(keys) => setPreviewVisibleFieldKeys(keys)}
          editedValues={previewEditedValues}
          editingField={previewEditingField}
          onStartEditingField={(key) => setPreviewEditingField(key)}
          onFieldSave={(key, val) => {
            setPreviewEditingField(null);
            setPreviewEditedValues((prev) => ({ ...prev, [key]: val }));
            toast.success("Saved ✓", { duration: 2000 });
          }}
          showResponsibleDropdown={previewShowResponsibleDropdown}
          onToggleResponsibleDropdown={(open) => setPreviewShowResponsibleDropdown(open)}
          onOpenTeamMember={(personName) => {
            const member = previewTeamMembers.find((m) => m.name === personName);
            setPreviewSelectedTeamMember(
              member || { id: "0", name: personName, role: "Team Member", email: "", phone: "" }
            );
            setPreviewShowTeamMemberDrawer(true);
          }}
          isTeamMemberDrawerOpen={previewShowTeamMemberDrawer}
          fieldManagerOpen={previewFieldManagerOpen}
          fieldManagerMode={previewFieldManagerMode}
          onOpenFieldManager={(mode) => {
            setPreviewFieldManagerMode(mode);
            setPreviewFieldManagerOpen(true);
          }}
          onCloseFieldManager={() => setPreviewFieldManagerOpen(false)}
          teamMembersData={previewTeamMembers}
          dealFields={getAllFields("deal")}
          historyFilters={previewHistoryFilters}
          onHistoryFiltersChange={(patch) => {
            setPreviewHistoryFilters((prev) => ({ ...prev, ...patch }));
          }}
        />

        <CallTriggerDrawer
          isOpen={showCallTriggerDrawer}
          onClose={() => setShowCallTriggerDrawer(false)}
          stageName={processes.find((p) => p.id === selectedProcess)?.stages.find((s) => s.id === expandedStage)?.name}
          processName={processes.find((p) => p.id === selectedProcess)?.name}
          settings={processes.find((p) => p.id === selectedProcess)?.stages.find((s) => s.id === expandedStage)?.callTriggerSettings}
          onSave={(updatedSettings, options) => {
            if (options?.setAsDefault) {
              // 1. Save global default for all future configured stages
              saveDefaultCallTriggerSettings(updatedSettings);
              // 2. Update all stages across all processes
              setProcesses((prev) =>
                prev.map((p) => ({
                  ...p,
                  stages: p.stages.map((s) => ({
                    ...s,
                    callTriggerSettings: { ...updatedSettings },
                  })),
                }))
              );
              toast.success("Saved as default settings for all stages across all processes");
            } else if (options?.applyToCurrentProcess && selectedProcess) {
              // Apply to all stages of this process only
              const procName = processes.find((p) => p.id === selectedProcess)?.name || "this process";
              setProcesses((prev) =>
                prev.map((p) =>
                  p.id !== selectedProcess
                    ? p
                    : {
                      ...p,
                      stages: p.stages.map((s) => ({
                        ...s,
                        callTriggerSettings: { ...updatedSettings },
                      })),
                    }
                )
              );
              toast.success(`Applied trigger settings to all stages in "${procName}"`);
            } else if (selectedProcess && expandedStage) {
              // Apply to this stage only
              setProcesses((prev) =>
                prev.map((p) =>
                  p.id !== selectedProcess
                    ? p
                    : {
                      ...p,
                      stages: p.stages.map((s) =>
                        s.id !== expandedStage
                          ? s
                          : { ...s, callTriggerSettings: updatedSettings }
                      ),
                    }
                )
              );
              toast.success("Call trigger settings saved for this stage");
            }
          }}
        />

        {/* Scope Rules Configuration Modal for Existing Process */}
        {showProcessScopeModal && targetProcessForScope && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-white">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      Configure Scope Rules
                    </h3>
                    <p className="text-xs text-gray-500 font-medium">
                      Process: {targetProcessForScope.name} ({targetProcessForScope.entityType || "client"})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProcessScopeModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                <AdminControlAccordion
                  scopingRules={editProcessScopingRules}
                  onScopingRulesChange={(rules) => setEditProcessScopingRules(rules)}
                  allowEntities={false}
                  defaultAdminControlOpen={true}
                  defaultScopeOpen={true}
                  defaultPermissionsOpen={false}
                  scopeTooltip="Define entity availability and restrict visibility by tenant industry categories, industries, and locations."
                  permissionsTooltip="Configure what tenant users are permitted to do with this process."
                />
              </div>

              <div className="p-4 bg-gray-50/70 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowProcessScopeModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200/60 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const firstRule = editProcessScopingRules[0];
                    setProcesses((prev) =>
                      prev.map((p) =>
                        p.id === targetProcessForScope.id
                          ? {
                              ...p,
                              scopingRules: editProcessScopingRules,
                              industryCategory: firstRule?.industryCategory || "All",
                              industry: firstRule?.industries && firstRule.industries.length > 0 ? firstRule.industries[0] : "All",
                              locations: firstRule?.locations && firstRule.locations.length > 0 ? firstRule.locations : ["All"],
                            }
                          : p
                      )
                    );
                    setShowProcessScopeModal(false);
                    toast.success("Process scope rules saved");
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Save Scope Rules
                </button>
              </div>
            </div>
          </div>
        )}

      {pitchFieldPickerTarget && (
        <SelectFieldsModal
          initiallySelected={[]}
          activeProcessId={selectedProcess || undefined}
          activeProcessName={selectedProcessData?.name}
          processStages={selectedProcessData?.stages?.map((s) => ({ id: s.id, name: s.name, color: s.color }))}
          onClose={() => setPitchFieldPickerTarget(null)}
          onApply={handleInsertPitchFields}
          isAdmin={true}
        />
      )}

      </div>
    </div>
  );
}