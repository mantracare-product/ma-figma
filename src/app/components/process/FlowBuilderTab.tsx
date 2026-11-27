import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  GitBranch, Clock, Split, XCircle, Phone, User, PhoneForwarded, PhoneOff,
  Eye, Hash, Calendar, Mail, MessageSquare, Settings2, ArrowRight, Workflow,
  Zap, Webhook, Search, ChevronDown, ChevronUp, ChevronRight, Plus, Trash2, X,
  ZoomIn, ZoomOut, Maximize2, Undo2, Redo2, CheckCircle2, AlertCircle,
  Code2, Activity, Layers, PhoneCall, Save, AlignCenter, Hand, Sparkles,
  CreditCard, FileText, Receipt, ShieldCheck, Briefcase, Sliders, QrCode, Copy, CheckSquare,
} from "lucide-react";
import { Button } from "../ui/Button";
import VariableSelectorModal from "./VariableSelectorModal";
import type { WorkflowStep } from "../../types/workflow";
import {
  isParallelStep,
  ensureValidBranches,
  createParallelStep,
  appendStepToTree,
  deleteStepFromTree,
  updateStepInTree,
  addBranchToStep,
  removeBranchFromStep,
  findStepInTree,
  findBranchInTree,
  connectStepsInTree,
  isStepAncestor,
} from "../../../lib/automationTree";
import {
  computeTreeCanvasLayout,
} from "../../../lib/automationCanvasLayout";
import {
  normalizeWorkflowTree,
} from "../../../lib/automationNormalizer";
import StepParametersFields from "./StepParametersFields";
import StepDetailDrawer from "./StepDetailDrawer";
import { getStoredProcesses } from "../../../lib/useProcessStore";
import { FETCH_FIELD_SOURCES } from "./VariablePickerButton";
import { toast } from "sonner";
import { HowItWorksModal, HowItWorksButton } from "../help/HowItWorksModal";
import { InfoTooltip } from "../help/InfoTooltip";
import { ScopingRule } from "../../context/FieldRegistryContext";
import { AdminControlAccordion } from "../../pages/admin/components/AdminControlAccordion";

const buildConditionSummary = (step: WorkflowStep, laneKey: string): string => {
  if (laneKey === "incall") {
    const fieldCount = (step.params?.fieldConditions || []).length;
    const intentCount = (step.params?.intentConditions || []).length;
    if (fieldCount === 0 && intentCount === 0) return "No conditions";
    const parts: string[] = [];
    if (fieldCount > 0) parts.push(`${fieldCount} field`);
    if (intentCount > 0) parts.push(`${intentCount} intent`);
    return parts.join(" + ") + " condition" + (fieldCount + intentCount > 1 ? "s" : "");
  } else {
    const conds = step.params?.conditions || [];
    if (conds.length === 0) return "No conditions";
    if (conds.length === 1) {
      const cond = conds[0];
      const sourceLabel = FETCH_FIELD_SOURCES.find(s => s.value === cond.fieldSource)?.label || cond.fieldSource;
      const fieldLabel = FETCH_FIELD_SOURCES.find(s => s.value === cond.fieldSource)?.fields.find(f => f.value === cond.field)?.label || cond.field;
      return `${fieldLabel || "Field"} ${cond.operator || "Equal To"} "${cond.value || ""}"`;
    }
    return `${conds.length} conditions`;
  }
};

const getStepFirstNodeId = (step: WorkflowStep): string => {
  const isWaitStep = step.stepKey === "wait" || step.stepKey === "delay";
  if (!isWaitStep && (step.delayValue ?? 0) > 0) {
    return `wait-${step.id}`;
  }
  const isCondStep = step.stepKey === "condition";
  if (!isCondStep && step.params?.conditionsEnabled) {
    return `cond-${step.id}`;
  }
  return step.id;
};

// ─── Types ────────────────────────────────────────────────────────────────────

type NodeType =
  | "start" | "end" | "overview"
  | "condition" | "wait" | "parallel" | "empty-branch"
  | "create-appointment" | "create-contact" | "create-process" | "duplicate-process" | "create-task"
  | "call-transfer" | "call-transfer-human" | "call-transfer-ai" | "call-hangup"
  | "fetch-availability" | "fetch-field-value"
  | "send-email" | "send-sms" | "send-whatsapp"
  | "assign-process" | "field-update" | "assign-responsible" | "move-stage" | "move-process" | "move-new-process" | "update-stage"
  | "book-appointment" | "reschedule-appointment" | "cancel-appointment"
  | "generate-invoice" | "generate-document" | "send-payment" | "send-invoice"
  | "webhook" | "api"
  | "idle-messages";

interface FlowNode {
  id: string;
  type: NodeType;
  label: string;
  x: number;
  y: number;
  config: Record<string, any>;
  stepKey?: string;
}

interface FlowConnection {
  id: string;
  fromId: string;
  fromPort: string; // "default" | "true" | "false" | "branch-0" | ...
  toId: string;
}

interface FlowBuilderTabProps {
  processName?: string;
  stageName?: string;
  processes?: any[];
  currentProcessId?: string;
  workflowSteps?: WorkflowStep[];
  onWorkflowStepsChange?: (steps: WorkflowStep[]) => void;
  stepAllowedTriggers?: Record<string, Array<string>>;
  scope?: "stage" | "global";
  triggerType?: string;
  triggerEvent?: string;
  triggerLabel?: string;
  triggerDescription?: string;
  triggerIconKey?: string;
  onTriggerChange?: (trigger: {
    type: string;
    event: string;
    label: string;
    description: string;
    iconKey: string;
    params?: Record<string, any>;
  }) => void;
  onTriggerClick?: () => void;
  onSave?: () => void;
  scopingRules?: ScopingRule[];
  automationName?: string;
  onAutomationNameChange?: (name: string) => void;
  automationDescription?: string;
  onAutomationDescriptionChange?: (desc: string) => void;
  automationStatus?: "active" | "draft";
  onAutomationStatusChange?: (status: "active" | "draft") => void;
  isAdmin?: boolean;
  onScopingRulesChange?: (rules: ScopingRule[]) => void;
  initialStepIdToConfigure?: string;
  hideHowItWorks?: boolean;
  hideCanvasSave?: boolean;
  initialHasChosenTrigger?: boolean;
}

export interface TriggerCatalogItem {
  id: string;
  triggerType: string;
  triggerEvent: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
  iconKey: string;
}

// ─── Node Library Definition ──────────────────────────────────────────────────

// ─── Reverse mapping: NodeType → stepKey ─────────────────────────────────────
const NODE_TYPE_TO_STEP_KEY: Partial<Record<NodeType, string>> = {
  "create-appointment": "create_appointment",
  "create-contact": "create_contact",
  "create-process": "create_process",
  "duplicate-process": "duplicate_process",
  "create-task": "create_task",
  "condition": "condition",
  "wait": "wait",
  "call-transfer": "callaction",
  "call-transfer-human": "callaction",
  "call-transfer-ai": "callaction",
  "call-hangup": "callhangup",
  "fetch-availability": "fetchavailability",
  "fetch-field-value": "fetchfieldvalue",
  "send-email": "email",
  "send-sms": "sms",
  "send-whatsapp": "whatsapp",
  "assign-process": "assign_process",
  "field-update": "fieldupdate",
  "assign-responsible": "assignhuman",
  "move-stage": "stagemovement",
  "move-process": "update_to_stage",
  "move-new-process": "update_to_stage",
  "update-stage": "update_to_stage",
  "book-appointment": "scheduleappointment",
  "reschedule-appointment": "scheduleappointment",
  "cancel-appointment": "scheduleappointment",
  "generate-invoice": "generate_invoice",
  "generate-document": "generate_document",
  "send-payment": "send_payment",
  "send-invoice": "send-invoice",
  "webhook": "webhook_trigger",
  "api": "wh_trigger",
  "end": "endworkflow",
  "idle-messages": "idlemessages",
};

const NODE_TYPE_TO_ICON_KEY: Record<string, string> = {
  "create-appointment": "calendar",
  "create-contact": "user",
  "create-process": "workflow",
  "duplicate-process": "copy",
  "create-task": "checksquare",
  "condition": "split",
  "wait": "clock",
  "call-transfer": "phonecall",
  "call-transfer-human": "usercheck",
  "call-transfer-ai": "phonecall",
  "call-hangup": "phoneoff",
  "fetch-availability": "calendar",
  "fetch-field-value": "clipboardlist",
  "send-email": "mail",
  "send-sms": "messagesquare",
  "send-whatsapp": "messagecircle",
  "assign-process": "workflow",
  "field-update": "edit",
  "assign-responsible": "usercheck",
  "move-stage": "gitbranch",
  "move-process": "zap",
  "move-new-process": "gitbranch",
  "update-stage": "gitbranch",
  "book-appointment": "calendar",
  "reschedule-appointment": "calendar",
  "cancel-appointment": "x",
  "generate-invoice": "filetext",
  "generate-document": "filetext",
  "send-payment": "creditcard",
  "send-invoice": "filetext",
  "webhook": "webhook",
  "api": "globe",
  "end": "x",
  "idle-messages": "messagesquare",
};

const NODE_CATEGORIES = [
  {
    id: "logic",
    label: "Logic & Routing",
    icon: <GitBranch className="w-3.5 h-3.5" />,
    nodes: [
      { type: "condition" as NodeType, label: "Condition", icon: <Split className="w-4 h-4" />, desc: "Gate this step behind field or intent conditions" },
      { type: "wait" as NodeType, label: "Wait / Delay", icon: <Clock className="w-4 h-4" />, desc: "Delay this step before it runs" },
      { type: "update-stage" as NodeType, label: "Update to stage", icon: <Workflow className="w-4 h-4" />, desc: "Update stage for process, appointment, or invoice" },
    ],
  },
  {
    id: "crm-entities",
    label: "Create CRM Entities",
    icon: <Plus className="w-3.5 h-3.5" />,
    nodes: [
      {
        type: "create-appointment" as NodeType,
        label: "Create Appointment",
        icon: <Calendar className="w-4 h-4" />,
        desc: "Create and schedule a new appointment record in CRM",
      },
      {
        type: "create-contact" as NodeType,
        label: "Create Contact",
        icon: <User className="w-4 h-4" />,
        desc: "Create a new contact from trigger data with chosen contact type",
      },
      {
        type: "create-process" as NodeType,
        label: "Create Process",
        icon: <Workflow className="w-4 h-4" />,
        desc: "Create and enroll a record into a process workflow",
      },
      {
        type: "duplicate-process" as NodeType,
        label: "Duplicate Process",
        icon: <Copy className="w-4 h-4" />,
        desc: "Duplicate process into target process & stage, copying shared fields",
      },
      {
        type: "create-task" as NodeType,
        label: "Create Task",
        icon: <CheckSquare className="w-4 h-4" />,
        desc: "Create and assign a new task in CRM Tasks",
      },
    ],
  },
  {
    id: "records",
    label: "Records & Billing",
    icon: <CreditCard className="w-3.5 h-3.5" />,
    nodes: [
      { type: "generate-invoice" as NodeType, label: "Generate Invoice", icon: <FileText className="w-4 h-4" />, desc: "Generate draft invoice for appointment (strictly idempotent)" },
      { type: "generate-document" as NodeType, label: "Generate Document", icon: <FileText className="w-4 h-4" />, desc: "Generate document from template for client, process, appointment, or invoice" },
    ],
  },
  {
    id: "communication",
    label: "Communication",
    icon: <MessageSquare className="w-3.5 h-3.5" />,
    nodes: [
      { type: "send-email" as NodeType, label: "Send Email", icon: <Mail className="w-4 h-4" />, desc: "Send an email" },
      { type: "send-sms" as NodeType, label: "Send SMS", icon: <MessageSquare className="w-4 h-4" />, desc: "Send an SMS notification" },
      { type: "send-whatsapp" as NodeType, label: "Send WhatsApp", icon: <MessageSquare className="w-4 h-4" />, desc: "Send a pre-configured WhatsApp message" },
    ],
  },
  {
    id: "data",
    label: "Data & Assignment",
    icon: <Settings2 className="w-3.5 h-3.5" />,
    nodes: [
      { type: "field-update" as NodeType, label: "Field Update", icon: <Sliders className="w-4 h-4" />, desc: "Update a record or workflow field value" },
      { type: "assign-responsible" as NodeType, label: "Assign Responsible", icon: <User className="w-4 h-4" />, desc: "Assign a team member to handle this record" },
      { type: "webhook" as NodeType, label: "Webhook", icon: <Webhook className="w-4 h-4" />, desc: "Send data payload via webhook" },
    ],
  },
];

export const getTriggerCatalogItems = (scope: "stage" | "global", stageName: string): TriggerCatalogItem[] => {
  return [
    // Process Triggers
    {
      id: "trig-process-created",
      triggerType: "process",
      triggerEvent: "process.created",
      label: "Process Created",
      desc: "Fires when a new process workflow is enrolled or created",
      icon: <Workflow className="w-4 h-4" />,
      iconKey: "workflow",
    },
    {
      id: "trig-process-updated",
      triggerType: "process",
      triggerEvent: "process.updated",
      label: "Process Updated",
      desc: "Fires when a process workflow record or stage is updated",
      icon: <Workflow className="w-4 h-4" />,
      iconKey: "workflow",
    },

    // Client Triggers
    {
      id: "trig-client-created",
      triggerType: "client",
      triggerEvent: "client.created",
      label: "Client Created",
      desc: "Fires when a new client record is added to CRM",
      icon: <User className="w-4 h-4" />,
      iconKey: "user",
    },
    {
      id: "trig-client-updated",
      triggerType: "client",
      triggerEvent: "client.updated",
      label: "Client Updated",
      desc: "Fires when existing client profile details or fields are modified",
      icon: <User className="w-4 h-4" />,
      iconKey: "user",
    },

    // Appointment Triggers
    {
      id: "trig-appointment-created",
      triggerType: "appointment",
      triggerEvent: "appointment.created",
      label: "Appointment Created",
      desc: "Fires when a new appointment booking is scheduled",
      icon: <Calendar className="w-4 h-4" />,
      iconKey: "calendar",
    },
    {
      id: "trig-appointment-updated",
      triggerType: "appointment",
      triggerEvent: "appointment.updated",
      label: "Appointment Updated",
      desc: "Fires when appointment details or schedule are updated",
      icon: <Calendar className="w-4 h-4" />,
      iconKey: "calendar",
    },

    // Invoice Triggers
    {
      id: "trig-invoice-created",
      triggerType: "invoice",
      triggerEvent: "invoice.created",
      label: "Invoice Created",
      desc: "Fires when a new billing invoice is created or drafted",
      icon: <Receipt className="w-4 h-4" />,
      iconKey: "receipt",
    },
    {
      id: "trig-invoice-updated",
      triggerType: "invoice",
      triggerEvent: "invoice.updated",
      label: "Invoice Updated",
      desc: "Fires when an invoice record or status is modified",
      icon: <Receipt className="w-4 h-4" />,
      iconKey: "receipt",
    },

    // Call Triggers
    {
      id: "trig-call-created",
      triggerType: "call",
      triggerEvent: "call.created",
      label: "Call Created",
      desc: "Fires when a new call session is initiated or logged",
      icon: <Phone className="w-4 h-4" />,
      iconKey: "phone",
    },
    {
      id: "trig-call-updated",
      triggerType: "call",
      triggerEvent: "call.updated",
      label: "Call Updated",
      desc: "Fires when call metadata, transcript, or status updates",
      icon: <Phone className="w-4 h-4" />,
      iconKey: "phone",
    },

    // Task Triggers
    {
      id: "trig-task-created",
      triggerType: "task",
      triggerEvent: "task.created",
      label: "Task Created",
      desc: "Fires when a new task is created or assigned",
      icon: <CheckSquare className="w-4 h-4" />,
      iconKey: "checksquare",
    },
    {
      id: "trig-task-updated",
      triggerType: "task",
      triggerEvent: "task.updated",
      label: "Task Updated",
      desc: "Fires when task details, status, stage, or assignee are modified",
      icon: <CheckSquare className="w-4 h-4" />,
      iconKey: "checksquare",
    },

  ];
};

// ─── Node visual config ───────────────────────────────────────────────────────

const NODE_STYLE: Record<string, { bg: string; border: string; text: string; icon?: string }> = {
  "create-appointment": { bg: "bg-teal-50 dark:bg-teal-900/20", border: "border-teal-400", text: "text-teal-700 dark:text-teal-400" },
  "create-contact":     { bg: "bg-sky-50 dark:bg-sky-900/20", border: "border-sky-400", text: "text-sky-700 dark:text-sky-400" },
  "create-process":     { bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-400", text: "text-purple-700 dark:text-purple-400" },
  "duplicate-process":  { bg: "bg-indigo-50 dark:bg-indigo-900/20", border: "border-indigo-400", text: "text-indigo-700 dark:text-indigo-400" },
  "create-task":        { bg: "bg-fuchsia-50 dark:bg-fuchsia-900/20", border: "border-fuchsia-400", text: "text-fuchsia-700 dark:text-fuchsia-400" },
  start:                 { bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-400", text: "text-emerald-700 dark:text-emerald-400" },
  end:                   { bg: "bg-red-50 dark:bg-red-900/20",     border: "border-red-400",     text: "text-red-700 dark:text-red-400" },
  condition:             { bg: "bg-violet-50 dark:bg-violet-900/20", border: "border-violet-400", text: "text-violet-700 dark:text-violet-400" },
  wait:                  { bg: "bg-slate-50 dark:bg-slate-900/20",   border: "border-slate-400",   text: "text-slate-700 dark:text-slate-400" },
  parallel:              { bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-400", text: "text-purple-700 dark:text-purple-400" },
  "empty-branch":        { bg: "bg-purple-50/20 dark:bg-purple-950/20", border: "border-purple-300 border-dashed", text: "text-purple-700 dark:text-purple-400" },
  "call-transfer":       { bg: "bg-blue-50 dark:bg-blue-900/20",     border: "border-blue-400",   text: "text-blue-700 dark:text-blue-400" },
  "call-transfer-human": { bg: "bg-blue-50 dark:bg-blue-900/20",     border: "border-blue-400",   text: "text-blue-700 dark:text-blue-400" },
  "call-transfer-ai":    { bg: "bg-blue-50 dark:bg-blue-900/20",     border: "border-blue-400",   text: "text-blue-700 dark:text-blue-400" },
  "call-hangup":         { bg: "bg-rose-50 dark:bg-rose-900/20",     border: "border-rose-400",   text: "text-rose-700 dark:text-rose-400" },
  "fetch-availability":  { bg: "bg-teal-50 dark:bg-teal-900/20",     border: "border-teal-400",   text: "text-teal-700 dark:text-teal-400" },
  "fetch-field-value":   { bg: "bg-cyan-50 dark:bg-cyan-900/20",     border: "border-cyan-400",   text: "text-cyan-700 dark:text-cyan-400" },
  "send-email":          { bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-400", text: "text-emerald-700 dark:text-emerald-400" },
  "send-sms":            { bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-400", text: "text-emerald-700 dark:text-emerald-400" },
  "send-whatsapp":       { bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-400", text: "text-emerald-700 dark:text-emerald-400" },
  "field-update":        { bg: "bg-amber-50 dark:bg-amber-900/20",   border: "border-amber-400",  text: "text-amber-700 dark:text-amber-400" },
  "assign-responsible":  { bg: "bg-indigo-50 dark:bg-indigo-900/20", border: "border-indigo-400", text: "text-indigo-700 dark:text-indigo-400" },
  "move-stage":          { bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-400", text: "text-purple-700 dark:text-purple-400" },
  "move-process":        { bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-400", text: "text-purple-700 dark:text-purple-400" },
  "move-new-process":    { bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-400", text: "text-purple-700 dark:text-purple-400" },
  "update-stage":        { bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-400", text: "text-purple-700 dark:text-purple-400" },
  "book-appointment":    { bg: "bg-teal-50 dark:bg-teal-900/20",     border: "border-teal-400",   text: "text-teal-700 dark:text-teal-400" },
  "reschedule-appointment": { bg: "bg-teal-50 dark:bg-teal-900/20", border: "border-teal-400",   text: "text-teal-700 dark:text-teal-400" },
  "cancel-appointment":  { bg: "bg-rose-50 dark:bg-rose-900/20",     border: "border-rose-400",   text: "text-rose-700 dark:text-rose-400" },
  "generate-invoice":    { bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-400", text: "text-purple-700 dark:text-purple-400" },
  "generate-document":   { bg: "bg-blue-50 dark:bg-blue-900/20",     border: "border-blue-400",   text: "text-blue-700 dark:text-blue-400" },
  "send-payment":        { bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-400", text: "text-emerald-700 dark:text-emerald-400" },
  "send-invoice":        { bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-400", text: "text-purple-700 dark:text-purple-400" },
  webhook:               { bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-400", text: "text-orange-700 dark:text-orange-400" },
  api:                   { bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-400", text: "text-orange-700 dark:text-orange-400" },
  "idle-messages":       { bg: "bg-sky-50 dark:bg-sky-900/20", border: "border-sky-400", text: "text-sky-700 dark:text-sky-400" },
};

interface CrystalNodeTheme {
  orbGradient: string;
  orbStyle: string;
  cardSurface: string;
  badgeStyle: { backgroundColor: string; color: string };
  dotColor: string;
  portColor: string;
  roleLabel: string;
}

function getCrystalTriggerTheme(triggerType?: string): CrystalNodeTheme {
  const baseCard =
    "bg-white border-slate-200/90 shadow-[0_6px_20px_-6px_rgba(15,23,42,0.10),0_1px_4px_rgba(15,23,42,0.04)]";
  switch (triggerType) {
    case "process":
      return {
        orbGradient: "",
        orbStyle: "linear-gradient(135deg, #818cf8 0%, #4338ca 100%)",
        cardSurface: baseCard,
        badgeStyle: { backgroundColor: "#eef2ff", color: "#4338ca" },
        dotColor: "#4f46e5",
        portColor: "#94a3b8",
        roleLabel: "TRIGGER",
      };
    case "client":
      return {
        orbGradient: "",
        orbStyle: "linear-gradient(135deg, #34d399 0%, #047857 100%)",
        cardSurface: baseCard,
        badgeStyle: { backgroundColor: "#ecfdf5", color: "#047857" },
        dotColor: "#059669",
        portColor: "#94a3b8",
        roleLabel: "TRIGGER",
      };
    case "appointment":
      return {
        orbGradient: "",
        orbStyle: "linear-gradient(135deg, #c084fc 0%, #7e22ce 100%)",
        cardSurface: baseCard,
        badgeStyle: { backgroundColor: "#faf5ff", color: "#7e22ce" },
        dotColor: "#9333ea",
        portColor: "#94a3b8",
        roleLabel: "TRIGGER",
      };
    case "call":
      return {
        orbGradient: "",
        orbStyle: "linear-gradient(135deg, #60a5fa 0%, #1d4ed8 100%)",
        cardSurface: baseCard,
        badgeStyle: { backgroundColor: "#eff6ff", color: "#1d4ed8" },
        dotColor: "#2563eb",
        portColor: "#94a3b8",
        roleLabel: "TRIGGER",
      };
    case "invoice":
      return {
        orbGradient: "",
        orbStyle: "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)",
        cardSurface: baseCard,
        badgeStyle: { backgroundColor: "#fffbeb", color: "#b45309" },
        dotColor: "#d97706",
        portColor: "#94a3b8",
        roleLabel: "TRIGGER",
      };
    case "task":
      return {
        orbGradient: "",
        orbStyle: "linear-gradient(135deg, #e879f9 0%, #a21caf 100%)",
        cardSurface: baseCard,
        badgeStyle: { backgroundColor: "#fdf4ff", color: "#a21caf" },
        dotColor: "#c026d3",
        portColor: "#94a3b8",
        roleLabel: "TRIGGER",
      };
    case "stage":
    default:
      return {
        orbGradient: "",
        orbStyle: "linear-gradient(135deg, #fb923c 0%, #ea580c 100%)",
        cardSurface: baseCard,
        badgeStyle: { backgroundColor: "#fff7ed", color: "#c2410c" },
        dotColor: "#ea580c",
        portColor: "#94a3b8",
        roleLabel: "TRIGGER",
      };
  }
}

function resolveCanonicalType(rawType: string, stepKey?: string): NodeType {
  if (rawType === "start" || rawType === "end" || rawType === "empty-branch" || rawType === "overview") {
    return rawType as NodeType;
  }
  const normalized = (typeof STEP_KEY_TO_NODE_TYPE !== "undefined"
    ? STEP_KEY_TO_NODE_TYPE[rawType] || (stepKey ? STEP_KEY_TO_NODE_TYPE[stepKey] : undefined)
    : undefined);
  return (normalized || rawType) as NodeType;
}

function getCrystalNodeTheme(type: string, triggerType?: string, stepKey?: string): CrystalNodeTheme {
  const cType = resolveCanonicalType(type, stepKey);
  const baseCard =
    "bg-white border-slate-200/90 shadow-[0_6px_20px_-6px_rgba(15,23,42,0.10),0_1px_4px_rgba(15,23,42,0.04)]";

  if (cType === "start") {
    return getCrystalTriggerTheme(triggerType);
  }

  const NODE_PALETTE: Record<string, { orb: string; badgeBg: string; badgeText: string; dot: string; role?: string }> = {
    condition:               { orb: "linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)", badgeBg: "#ecfeff", badgeText: "#0e7490", dot: "#06b6d4", role: "LOGIC" },
    wait:                    { orb: "linear-gradient(135deg, #64748b 0%, #334155 100%)", badgeBg: "#f1f5f9", badgeText: "#334155", dot: "#475569", role: "DELAY" },
    "update-stage":          { orb: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)", badgeBg: "#f5f3ff", badgeText: "#6d28d9", dot: "#7c3aed" },
    "create-appointment":    { orb: "linear-gradient(135deg, #2dd4bf 0%, #0f766e 100%)", badgeBg: "#f0fdfa", badgeText: "#0f766e", dot: "#0d9488" },
    "create-contact":        { orb: "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)", badgeBg: "#f0f9ff", badgeText: "#0369a1", dot: "#0284c7" },
    "create-process":        { orb: "linear-gradient(135deg, #c084fc 0%, #9333ea 100%)", badgeBg: "#faf5ff", badgeText: "#7e22ce", dot: "#9333ea" },
    "duplicate-process":     { orb: "linear-gradient(135deg, #818cf8 0%, #4338ca 100%)", badgeBg: "#eef2ff", badgeText: "#4338ca", dot: "#4f46e5" },
    "create-task":           { orb: "linear-gradient(135deg, #ec4899 0%, #9333ea 100%)", badgeBg: "#fdf4ff", badgeText: "#86198f", dot: "#c026d3" },
    "generate-invoice":      { orb: "linear-gradient(135deg, #e879f9 0%, #a21caf 100%)", badgeBg: "#fdf4ff", badgeText: "#a21caf", dot: "#c026d3" },
    "generate-document":     { orb: "linear-gradient(135deg, #60a5fa 0%, #1e40af 100%)", badgeBg: "#eff6ff", badgeText: "#1e40af", dot: "#2563eb" },
    "send-email":            { orb: "linear-gradient(135deg, #f472b6 0%, #db2777 100%)", badgeBg: "#fdf2f8", badgeText: "#be185d", dot: "#db2777" },
    "send-sms":              { orb: "linear-gradient(135deg, #4ade80 0%, #15803d 100%)", badgeBg: "#f0fdf4", badgeText: "#15803d", dot: "#16a34a" },
    "send-whatsapp":         { orb: "linear-gradient(135deg, #10b981 0%, #047857 100%)", badgeBg: "#ecfdf5", badgeText: "#047857", dot: "#059669" },
    "field-update":          { orb: "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)", badgeBg: "#fffbeb", badgeText: "#b45309", dot: "#d97706" },
    "assign-responsible":    { orb: "linear-gradient(135deg, #fb7185 0%, #e11d48 100%)", badgeBg: "#fff1f2", badgeText: "#be123c", dot: "#e11d48" },
    webhook:                 { orb: "linear-gradient(135deg, #fb923c 0%, #ea580c 100%)", badgeBg: "#fff7ed", badgeText: "#c2410c", dot: "#ea580c" },
    api:                     { orb: "linear-gradient(135deg, #a3e635 0%, #4d7c0f 100%)", badgeBg: "#f7fee7", badgeText: "#4d7c0f", dot: "#65a30d" },
    "send-payment":          { orb: "linear-gradient(135deg, #22c55e 0%, #166534 100%)", badgeBg: "#f0fdf4", badgeText: "#166534", dot: "#15803d" },
    "send-invoice":          { orb: "linear-gradient(135deg, #8b5cf6 0%, #4c1d95 100%)", badgeBg: "#f5f3ff", badgeText: "#5b21b6", dot: "#6d28d9" },
    "move-stage":            { orb: "linear-gradient(135deg, #a855f7 0%, #6b21a8 100%)", badgeBg: "#faf5ff", badgeText: "#6b21a8", dot: "#7e22ce" },
    "move-process":          { orb: "linear-gradient(135deg, #d946ef 0%, #86198f 100%)", badgeBg: "#fdf4ff", badgeText: "#86198f", dot: "#a21caf" },
    "move-new-process":      { orb: "linear-gradient(135deg, #6366f1 0%, #312e81 100%)", badgeBg: "#eef2ff", badgeText: "#312e81", dot: "#4338ca" },
    "book-appointment":      { orb: "linear-gradient(135deg, #14b8a6 0%, #115e59 100%)", badgeBg: "#f0fdfa", badgeText: "#115e59", dot: "#0f766e" },
    "reschedule-appointment":{ orb: "linear-gradient(135deg, #f59e0b 0%, #92400e 100%)", badgeBg: "#fffbeb", badgeText: "#92400e", dot: "#b45309" },
    "cancel-appointment":    { orb: "linear-gradient(135deg, #f87171 0%, #b91c1c 100%)", badgeBg: "#fef2f2", badgeText: "#b91c1c", dot: "#dc2626" },
    "fetch-availability":    { orb: "linear-gradient(135deg, #06b6d4 0%, #155e75 100%)", badgeBg: "#ecfeff", badgeText: "#155e75", dot: "#0891b2" },
    "fetch-field-value":     { orb: "linear-gradient(135deg, #0ea5e9 0%, #075985 100%)", badgeBg: "#f0f9ff", badgeText: "#075985", dot: "#0369a1" },
    "call-transfer":         { orb: "linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)", badgeBg: "#eff6ff", badgeText: "#1e3a8a", dot: "#1d4ed8" },
    "call-transfer-human":   { orb: "linear-gradient(135deg, #ec4899 0%, #9d174d 100%)", badgeBg: "#fdf2f8", badgeText: "#9d174d", dot: "#be185d" },
    "call-transfer-ai":      { orb: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)", badgeBg: "#eef2ff", badgeText: "#4338ca", dot: "#4f46e5" },
    "call-hangup":           { orb: "linear-gradient(135deg, #ef4444 0%, #991b1b 100%)", badgeBg: "#fef2f2", badgeText: "#991b1b", dot: "#b91c1c" },
    "idle-messages":         { orb: "linear-gradient(135deg, #7dd3fc 0%, #0369a1 100%)", badgeBg: "#f0f9ff", badgeText: "#0369a1", dot: "#0284c7" },
    parallel:                { orb: "linear-gradient(135deg, #a855f7 0%, #581c87 100%)", badgeBg: "#faf5ff", badgeText: "#6b21a8", dot: "#7e22ce", role: "LOGIC" },
    end:                     { orb: "linear-gradient(135deg, #f43f5e 0%, #881337 100%)", badgeBg: "#fff1f2", badgeText: "#9f1239", dot: "#be123c", role: "END" },
  };

  const entry = NODE_PALETTE[cType] || {
    orb: "linear-gradient(135deg, #64748b 0%, #1e293b 100%)",
    badgeBg: "#f1f5f9",
    badgeText: "#334155",
    dot: "#475569",
  };

  return {
    orbGradient: "",
    orbStyle: entry.orb,
    cardSurface: baseCard,
    badgeStyle: { backgroundColor: entry.badgeBg, color: entry.badgeText },
    dotColor: entry.dot,
    portColor: "#94a3b8",
    roleLabel: entry.role || "ACTION",
  };
}

function CrystalOrbIcon({
  gradient,
  orbStyle,
  children,
  size = "md",
}: {
  gradient?: string;
  orbStyle?: string;
  children: React.ReactNode;
  size?: "sm" | "md";
}) {
  const sizeCls = size === "sm" ? "w-9 h-9" : "w-10 h-10";
  return (
    <div
      className={`${sizeCls} rounded-full ${gradient ? `bg-gradient-to-br ${gradient}` : ""} flex items-center justify-center shrink-0 text-white shadow-[0_4px_10px_-2px_rgba(15,23,42,0.16),inset_0_0_0_1px_rgba(255,255,255,0.28),inset_0_1px_1.5px_rgba(255,255,255,0.6),inset_0_-2px_4px_rgba(15,23,42,0.18)] relative overflow-hidden`}
      style={orbStyle ? { background: orbStyle } : undefined}
    >
      <span
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(115% 78% at 50% 6%, rgba(255,255,255,0.44) 0%, rgba(255,255,255,0.18) 44%, rgba(255,255,255,0) 48%)",
        }}
      />
      <span className="relative z-10 flex items-center justify-center text-white [&_svg]:text-white">{children}</span>
    </div>
  );
}

function getNodeIcon(type: NodeType, stepKey?: string) {
  const cType = resolveCanonicalType(type, stepKey);
  if (cType === "create-appointment") return <Calendar className="w-4 h-4" />;
  if (cType === "create-contact") return <User className="w-4 h-4" />;
  if (cType === "create-process") return <Workflow className="w-4 h-4" />;
  if (cType === "duplicate-process") return <Copy className="w-4 h-4" />;
  if (cType === "create-task") return <CheckSquare className="w-4 h-4" />;
  if (cType === "assign-process" || (cType as string) === "assign_process") return <Workflow className="w-4 h-4" />;
  if (cType === "generate-invoice") return <FileText className="w-4 h-4" />;
  if (cType === "generate-document") return <FileText className="w-4 h-4" />;
  if (cType === "send-payment") return <CreditCard className="w-4 h-4" />;
  if (cType === "send-invoice") return <FileText className="w-4 h-4" />;
  const all = NODE_CATEGORIES.flatMap((c) => c.nodes);
  return all.find((n) => n.type === cType)?.icon ?? <GitBranch className="w-4 h-4" />;
}

function getNodeLabel(type: NodeType) {
  const cType = resolveCanonicalType(type);
  if (cType === "create-appointment") return "Create Appointment";
  if (cType === "create-contact") return "Create Contact";
  if (cType === "create-process") return "Create Process";
  if (cType === "duplicate-process") return "Duplicate Process";
  if (cType === "create-task") return "Create Task";
  if (cType === "assign-process" || (cType as string) === "assign_process") return "Assign Process";
  if (cType === "generate-document") return "Generate Document";
  const all = NODE_CATEGORIES.flatMap((c) => c.nodes);
  return all.find((n) => n.type === cType)?.label ?? cType;
}

function getNodeDesc(type: NodeType): string {
  const cType = resolveCanonicalType(type);
  const all = NODE_CATEGORIES.flatMap((c) => c.nodes);
  return all.find((n) => n.type === cType)?.desc ?? "";
}

function getNodeSubtitle(
  node: FlowNode,
  effectiveProcesses: { id: string; name: string; stages?: { id: string; name: string }[] }[],
  stageName: string,
  processName: string,
  activeTriggerItem?: TriggerCatalogItem
): string {
  const canonicalType = resolveCanonicalType(node.type, node.stepKey);
  if (canonicalType === "start") {
    return node.config?.triggerDescription || activeTriggerItem?.desc || (node.config?.scope === "global" ? (node.config?.triggerEvent || "Rule entry point") : `Process: ${stageName ? stageName : processName}`);
  }
  if (canonicalType === "end") {
    return "Terminate workflow execution";
  }
  if (canonicalType === "generate-invoice") {
    if (node.config?.billFor === "choose") {
      return `Custom (${(node.config?.selectedServices || []).length} items)`;
    }
    if (node.config?.billFor === "client") return "Client's services";
    if (node.config?.billFor === "appointment") return "Appointment's service";
    return "Generate draft invoice";
  }
  if (node.type === "send-payment") {
    return node.config?.paymentMethod ? `Via ${node.config.paymentMethod}` : "Payment link & checkout";
  }
  if (node.type === "send-invoice") {
    return "Send invoice statement";
  }
  if (node.type === "generate-document") {
    return node.config?.templateName || "Generate document from template";
  }
  if (node.type === "assign-process" || node.stepKey === "assign_process") {
    const pName = node.config?.processName || (effectiveProcesses.find((p: any) => p.id === (node.config?.processId || node.config?.stepDetailProcess))?.name) || "Select Process";
    const sName = node.config?.stageName || node.config?.stepDetailStage || "Select Stage";
    return `${pName} → ${sName}`;
  }
  if (node.type === "update-stage" || node.type === "move-process" || node.type === "move-stage" || node.type === "move-new-process") {
    const entity = node.config?.stageEntity || node.config?.entityType || "processes";
    if (entity === "appointment") {
      const procDisplay = node.config?.processName || (effectiveProcesses.find(p => p.id === (node.config?.stepDetailProcess || node.config?.processId))?.name);
      const sName = node.config?.stageName || node.config?.stepDetailStage || "Select stage";
      return procDisplay ? `${procDisplay} → ${sName}` : `Appointment → ${sName}`;
    }
    if (entity === "invoice") {
      const procDisplay = node.config?.processName || (effectiveProcesses.find(p => p.id === (node.config?.stepDetailProcess || node.config?.processId))?.name);
      const sName = node.config?.stageName || node.config?.stepDetailStage || "Select stage";
      return procDisplay ? `${procDisplay} → ${sName}` : `Invoice → ${sName}`;
    }
    const targetProc = effectiveProcesses.find(p => p.id === (node.config?.stepDetailProcess || node.config?.processId));
    const targetStage = targetProc?.stages?.find(s => s.id === (node.config?.stepDetailStage || node.config?.stageId) || s.name === (node.config?.stepDetailStage || node.config?.stageId));
    const procDisplay = targetProc?.name || node.config?.processName;
    const sDisplay = targetStage?.name || node.config?.stageName;
    if (sDisplay && procDisplay) return `${procDisplay} → ${sDisplay}`;
    if (sDisplay) return `Stage: ${sDisplay}`;
    if (procDisplay) return `Process: ${procDisplay}`;
    return "Update to stage";
  }
  if (node.type === "parallel") {
    return `Runs ${(node.config?.branches || []).length} branches concurrently`;
  }
  if (node.type === "create-appointment") {
    const timing = node.config?.scheduleOffsetValue !== undefined
      ? `${node.config.scheduleOffsetValue} ${(node.config.scheduleOffsetUnit || "days").replace("_", " ")} ${node.config.scheduleDirection || "after"}`
      : "";
    return node.config?.serviceName
      ? `Appt: ${node.config.serviceName}${timing ? ` • ${timing}` : ""}`
      : (timing ? `Appt • ${timing}` : "Create & schedule appointment");
  }
  if (canonicalType === "create-contact") return node.config?.contactType ? `Type: ${node.config.contactType}` : "Select contact type";
  if (canonicalType === "create-process") return node.config?.processName ? `Enroll in ${node.config.processName}` : "Create & enroll in process";
  if (canonicalType === "duplicate-process") return node.config?.processName ? `Duplicate to ${node.config.processName}${node.config?.stageName ? ` • ${node.config.stageName}` : ""}` : "Duplicate into target process";
  if (canonicalType === "create-task") return node.config?.taskTitle ? node.config.taskTitle : "Create follow-up task";
  if (node.type === "condition") {
    const cases = node.config?.cases || [];
    if (cases.length > 0) {
      return `${cases.length} Case${cases.length > 1 ? "s" : ""} + Else`;
    }
    const branches = node.config?.branches || [];
    if (branches.length > 0) {
      const caseCount = Math.max(1, branches.length - 1);
      return `${caseCount} Case${caseCount > 1 ? "s" : ""} + Else`;
    }
    if (node.config?.conditionSummary) return node.config.conditionSummary;
    return "Evaluate condition cases";
  }
  if (node.type === "wait") {
    return `Wait ${node.config?.delayValue ?? node.config?.duration ?? 5} ${node.config?.delayUnit ?? node.config?.unit ?? "minutes"}`;
  }
  if (node.type === "send-email") {
    return node.config?.emailTemplateName
      ? `Template: ${node.config.emailTemplateName}`
      : node.config?.subject
      ? `Subject: ${node.config.subject}`
      : "Select email template";
  }
  if (node.type === "send-sms") {
    return node.config?.smsTemplateName
      ? `Template: ${node.config.smsTemplateName}`
      : node.config?.smsMessage
      ? node.config.smsMessage
      : "Select SMS template";
  }
  if (node.type === "send-whatsapp") {
    return node.config?.whatsappTemplateName
      ? `Template: ${node.config.whatsappTemplateName}`
      : node.config?.whatsappMessage || "Select WhatsApp template";
  }
  if (node.type === "call-transfer" || node.type === "call-transfer-human" || node.type === "call-transfer-ai") {
    return node.config?.callActionPhoneNumber ? `${node.config.callActionCountryCode || ""} ${node.config.callActionPhoneNumber}` : "Transfer active call";
  }
  if (node.type === "field-update") {
    const pFields = node.config?.processFields ? Object.keys(node.config.processFields).filter(k => Boolean(node.config.processFields[k])) : [];
    if (pFields.length > 0) {
      const firstKey = pFields[0];
      const val = node.config.processFields[firstKey];
      return `Set ${firstKey} = ${val}${pFields.length > 1 ? ` (+${pFields.length - 1} more)` : ""}`;
    }
    const pField = node.config?.primaryFieldLabel || node.config?.fieldName || node.config?.primaryField || node.config?.fieldUpdateBlocks?.[0]?.fieldLabel || node.config?.fieldUpdateBlocks?.[0]?.fieldToEdit;
    if (pField) {
      const op = node.config?.operator || node.config?.fieldUpdateBlocks?.[0]?.operator || "=";
      const val = node.config?.value ?? node.config?.fieldValue ?? node.config?.fieldUpdateBlocks?.[0]?.updateValue ?? "";
      return `Set ${pField} ${op === "Equal To" ? "=" : op} ${val || "(blank)"}`;
    }
    if (node.config?.processName) {
      return `Update in ${node.config.processName}`;
    }
    return "Update record attributes";
  }
  if (node.type === "assign-responsible") {
    const scopeMode = node.config?.assignScope || node.config?.assignmentFilter || node.config?.assignmentMode;
    const priority = node.config?.distributionPriority === "random" ? "Random" : "Round Robin";
    if (scopeMode === "user") {
      const count = Array.isArray(node.config?.selectedUsers) ? node.config.selectedUsers.length : 0;
      return count > 0 ? `${count} User${count > 1 ? "s" : ""} • ${priority}` : `All Users • ${priority}`;
    }
    if (scopeMode === "department") {
      const deptCount = Array.isArray(node.config?.selectedDepartments) ? node.config.selectedDepartments.length : 0;
      return deptCount > 0 ? `${deptCount} Dept${deptCount > 1 ? "s" : ""} • ${priority}` : `Department • ${priority}`;
    }
    if (scopeMode === "all_users") {
      return `All Users (${priority})`;
    }
    if (scopeMode === "role") {
      return `Role: ${node.config?.assignedRole || "Target Role"}`;
    }
    if (scopeMode === "entity") {
      return `Entity: ${node.config?.entityAssigneeLabel || node.config?.entityAssignee || "Entity Responsible"}`;
    }
    return node.config?.assigneeName ? `To: ${node.config.assigneeName}` : "Assign team member";
  }
  const typeNorm = canonicalType;
  if (typeNorm === "webhook" || typeNorm === "api") {
    return node.config?.webhookUrl ? `POST ${node.config.webhookUrl}` : "Send data payload via webhook";
  }
  if (typeNorm === "book-appointment") {
    return "Schedule a new appointment";
  }
  if (typeNorm === "reschedule-appointment") {
    return "Reschedule existing appointment";
  }
  if (typeNorm === "cancel-appointment") {
    return "Cancel appointment";
  }
  if (node.config?.description) {
    return node.config.description;
  }
  return getNodeDesc(canonicalType) || "Double-click to configure";
}

function getTriggerIconComponent(triggerIconKey?: string, triggerType?: string) {
  if (triggerIconKey === "workflow" || triggerType === "process") return <Workflow className="w-4 h-4" />;
  if (triggerIconKey === "calendar" || triggerType === "appointment") return <Calendar className="w-4 h-4" />;
  if (triggerIconKey === "receipt" || triggerType === "invoice") return <Receipt className="w-4 h-4" />;
  if (triggerIconKey === "phone" || triggerType === "call") return <Phone className="w-4 h-4" />;
  if (triggerIconKey === "checksquare" || triggerType === "task") return <CheckSquare className="w-4 h-4" />;
  if (triggerIconKey === "sparkles" || triggerType === "ai") return <Sparkles className="w-4 h-4" />;
  if (triggerIconKey === "user" || triggerType === "client") return <User className="w-4 h-4" />;
  if (triggerIconKey === "briefcase" || triggerIconKey === "product") return <Briefcase className="w-4 h-4" />;
  if (triggerIconKey === "creditcard") return <CreditCard className="w-4 h-4" />;
  if (triggerIconKey === "shieldcheck" || triggerType === "insurance") return <ShieldCheck className="w-4 h-4" />;
  if (triggerIconKey === "filetext" || triggerType === "document") return <FileText className="w-4 h-4" />;
  if (triggerIconKey === "webhook" || triggerType === "webhook") return <Webhook className="w-4 h-4" />;
  if (triggerIconKey === "zap" || triggerType === "zap") return <Zap className="w-4 h-4" />;
  return <Workflow className="w-4 h-4" />;
}

// Connection line colors by port
const PORT_COLOR: Record<string, string> = {
  default:    "#6366f1",
  "branch-0": "#a855f7",
  "branch-1": "#a855f7",
  "branch-2": "#a855f7",
  "branch-3": "#a855f7",
  "branch-4": "#a855f7",
};

const PORT_LABEL: Record<string, string> = {
  default: "",
};

const STEP_KEY_TO_NODE_TYPE: Record<string, NodeType> = {
  create_appointment: "create-appointment",
  "create-appointment": "create-appointment",
  create_contact: "create-contact",
  "create-contact": "create-contact",
  create_process: "create-process",
  "create-process": "create-process",
  duplicate_process: "duplicate-process",
  "duplicate-process": "duplicate-process",
  create_task: "create-task",
  "create-task": "create-task",
  wait: "wait",
  delay: "wait",
  condition: "condition",
  whatsapp: "send-whatsapp",
  sms: "send-sms",
  email: "send-email",
  "send-invoice": "send-invoice",
  generate_invoice: "generate-invoice",
  generate_document: "generate-document",
  "generate-document": "generate-document",
  send_payment: "send-payment",
  fieldupdate: "field-update",
  assignhuman: "assign-responsible",
  processmovement: "update-stage",
  movetonewprocess: "update-stage",
  "move-new-process": "update-stage",
  stagemovement: "update-stage",
  update_to_stage: "update-stage",
  "update-stage": "update-stage",
  callaction: "call-transfer",
  callhangup: "call-hangup",
  fetchavailability: "fetch-availability",
  fetchfieldvalue: "fetch-field-value",
  scheduleappointment: "book-appointment",
  managecalendar: "book-appointment",
  wh_trigger: "api",
  webhook_trigger: "webhook",
  endworkflow: "end",
  crmupdate: "field-update",
  ehrupdate: "field-update",
  idlemessages: "idle-messages",
};

const FALLBACK_NODE_TYPE: NodeType = "wait";

const buildAvailablePredecessors = (steps: WorkflowStep[], lane: "stage" | "incall" | "inchat" | "postcall", excludeId?: string) => {
  const allSteps: WorkflowStep[] = [];
  function collectSteps(list: WorkflowStep[]) {
    for (const s of list) {
      allSteps.push(s);
      if (isParallelStep(s) && s.branches) {
        for (const b of s.branches) {
          if (b.steps) collectSteps(b.steps);
        }
      }
    }
  }
  collectSteps(steps);
  const laneSteps = allSteps.filter(s => (s.trigger ?? "stage") === lane && s.id !== excludeId);
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FlowBuilderTab({
  processName = "Current Process",
  stageName = "Current Stage",
  processes = [],
  currentProcessId,
  workflowSteps = [],
  onWorkflowStepsChange,
  stepAllowedTriggers = {},
  scope = "stage",
  triggerType,
  triggerEvent,
  triggerLabel,
  triggerDescription,
  triggerIconKey,
  onTriggerChange,
  onTriggerClick,
  onSave,
  scopingRules = [],
  automationName = "",
  onAutomationNameChange,
  automationDescription = "",
  onAutomationDescriptionChange,
  automationStatus = "active",
  onAutomationStatusChange,
  isAdmin = false,
  onScopingRulesChange,
  initialStepIdToConfigure,
  hideHowItWorks = false,
  hideCanvasSave = false,
  initialHasChosenTrigger,
}: FlowBuilderTabProps) {
  const effectiveProcesses = (processes && processes.length > 0) ? processes : getStoredProcesses();
  // Drawer execution/timing controls (seeded on openConfig)
  const [drawerTrigger, setDrawerTrigger] = useState<"stage" | "incall" | "inchat" | "postcall">("stage");
  const [drawerExecType, setDrawerExecType] = useState<"instant" | "wait" | "parallel">("wait");
  const [drawerDelayValue, setDrawerDelayValue] = useState<number>(0);
  const [drawerDelayUnit, setDrawerDelayUnit] = useState<string>("Minute");
  const [drawerConnectAfterId, setDrawerConnectAfterId] = useState<string | undefined>(undefined);
  // Canvas state
  const isGlobalScope = scope === "global";
  const allTriggers = useMemo(() => getTriggerCatalogItems(scope, stageName), [scope, stageName]);

  const [activeTriggerEvent, setActiveTriggerEvent] = useState<string>(() => {
    if (triggerEvent) {
      if (scope === "stage" && triggerEvent === "entry") return "stage.entry";
      if (scope === "stage" && triggerEvent === "exit") return "stage.exit";
      return triggerEvent;
    }
    return "process.created";
  });

  useEffect(() => {
    if (triggerEvent) {
      const normalized = (scope === "stage" && triggerEvent === "entry") ? "stage.entry" :
                         (scope === "stage" && triggerEvent === "exit") ? "stage.exit" : triggerEvent;
      setActiveTriggerEvent(normalized);
    }
  }, [triggerEvent, scope]);

  const activeTriggerItem = useMemo(() => {
    return allTriggers.find(t =>
      t.triggerEvent === activeTriggerEvent ||
      (t.triggerEvent === "stage.entered" && activeTriggerEvent === "stage.entry") ||
      (t.triggerEvent === "stage.exited" && activeTriggerEvent === "stage.exit") ||
      (t.triggerEvent === "stage.entry" && activeTriggerEvent === "stage.entered") ||
      (t.triggerEvent === "stage.exit" && activeTriggerEvent === "stage.exited")
    ) || allTriggers[0];
  }, [allTriggers, activeTriggerEvent]);

  const defaultStartLabel = activeTriggerItem?.label || (
    isGlobalScope
      ? (triggerLabel || "Event Trigger")
      : `On Entry: ${stageName}`
  );

  const [nodes, setNodes] = useState<FlowNode[]>([
    {
      id: "start",
      type: "start",
      label: defaultStartLabel,
      x: 300,
      y: 80,
      config: {
        scope,
        triggerType: activeTriggerItem?.triggerType || triggerType || "process",
        triggerEvent: activeTriggerItem?.triggerEvent || triggerEvent || "process.created",
        triggerLabel: activeTriggerItem?.label || triggerLabel || defaultStartLabel,
        triggerDescription: activeTriggerItem?.desc || triggerDescription,
        triggerIconKey: activeTriggerItem?.iconKey || triggerIconKey || "workflow",
        processName,
        stageName,
      },
    },
  ]);
  const [connections, setConnections] = useState<FlowConnection[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 });
  
  // Hand tool and first render state
  const [isHandToolActive, setIsHandToolActive] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        setIsSpacePressed(true);
      }
      if (e.key === "Escape") {
        setDrawingConn(null);
        setInsertBetweenConn(null);
        setSelectedId(null);
        setSelectedBranchId(null);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Node interaction
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingOffset, setDraggingOffset] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const hasDraggedRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });

  // Connection drawing
  const [drawingConn, setDrawingConn] = useState<{ fromId: string; fromPort: string; x: number; y: number } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const connDragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isConnDraggingRef = useRef(false);
  const [hoveredConnId, setHoveredConnId] = useState<string | null>(null);
  const [insertBetweenConn, setInsertBetweenConn] = useState<{
    conn: FlowConnection;
    x: number;
    y: number;
  } | null>(null);
  const [insertSearch, setInsertSearch] = useState("");
  const [deletedConnectionKeys, setDeletedConnectionKeys] = useState<Set<string>>(new Set());

  // History
  const [history, setHistory] = useState<{ nodes: FlowNode[]; connections: FlowConnection[] }[]>([]);
  const [future, setFuture] = useState<{ nodes: FlowNode[]; connections: FlowConnection[] }[]>([]);

  // UI state
  const [search, setSearch] = useState("");
  const [hasChosenTrigger, setHasChosenTrigger] = useState<boolean>(() => {
    if (initialHasChosenTrigger !== undefined) return initialHasChosenTrigger;
    return Boolean(workflowSteps && workflowSteps.length > 0);
  });
  const [openTriggerCategoryId, setOpenTriggerCategoryId] = useState<string | null>("stage");
  const [openActionCategoryId, setOpenActionCategoryId] = useState<string | null>("logic");

  useEffect(() => {
    if (initialHasChosenTrigger !== undefined) {
      setHasChosenTrigger(initialHasChosenTrigger);
    }
  }, [initialHasChosenTrigger]);
  const [configNode, setConfigNode] = useState<FlowNode | null>(null);
  const [showVariableModal, setShowVariableModal] = useState(false);
  const [activeVarSetter, setActiveVarSetter] = useState<((v: string) => void) | null>(null);
  const [showFlowBuilderHelp, setShowFlowBuilderHelp] = useState(false);


  const sidebarRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const NODE_W = 248;
  const NODE_H = 92; // crystal card height aligned with port anchor points

  const BASE_X = 300;
  const BASE_Y = 220;
  const LANE_X_SPACING = 300;
  const NODE_Y_SPACING = 172;

  const focusTriggersCategory = () => {
    setHasChosenTrigger(false);
    setOpenTriggerCategoryId(activeTriggerItem?.triggerType || "stage");
    if (sidebarRef.current) {
      sidebarRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const selectTrigger = (item: TriggerCatalogItem) => {
    setActiveTriggerEvent(item.triggerEvent);
    const existingStart = nodes.find((n) => n.id === "start");
    const existingConfig = existingStart?.config || {};
    const defaultProc = effectiveProcesses.find((p) => p.id === currentProcessId || p.name === processName) || effectiveProcesses[0];
    const defaultStage = defaultProc?.stages?.find((s: any) => s.name === stageName || s.id === stageName) || defaultProc?.stages?.[0];

    const isStage = item.triggerType === "stage" || item.triggerEvent.startsWith("stage.");
    const updatedConfig = {
      ...existingConfig,
      triggerType: item.triggerType,
      triggerEvent: item.triggerEvent,
      triggerLabel: item.label,
      triggerDescription: item.desc,
      triggerIconKey: item.iconKey,
      ...(isStage ? {
        triggerProcessId: existingConfig.triggerProcessId || defaultProc?.id || "all",
        triggerProcessName: existingConfig.triggerProcessName || defaultProc?.name || "Any Process",
        triggerStageId: existingConfig.triggerStageId || defaultStage?.id || "all",
        triggerStageName: existingConfig.triggerStageName || defaultStage?.name || "Any Stage",
        stageId: existingConfig.stageId || existingConfig.triggerStageId || defaultStage?.id || "all",
        stageName: existingConfig.stageName || existingConfig.triggerStageName || defaultStage?.name || "Any Stage",
        processId: existingConfig.processId || existingConfig.triggerProcessId || defaultProc?.id || "all",
        processName: existingConfig.processName || existingConfig.triggerProcessName || defaultProc?.name || "Any Process",
      } : {}),
    };

    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === "start") {
          return {
            ...n,
            label: item.label,
            config: updatedConfig,
          };
        }
        return n;
      })
    );
    if (onTriggerChange) {
      onTriggerChange({
        type: item.triggerType,
        event: item.triggerEvent,
        label: item.label,
        description: item.desc,
        iconKey: item.iconKey,
        params: updatedConfig,
      });
    }
    toast.success(`Trigger set to "${item.label}"`);
  };

  useEffect(() => {
    if (!workflowSteps) return;

    // Check if workflowSteps needs normalization (e.g. legacy flat parallel models)
    const normalizedRes = normalizeWorkflowTree(workflowSteps);
    const effectiveSteps = normalizedRes.steps;
    if (
      normalizedRes.logs.length > 0 &&
      JSON.stringify(effectiveSteps) !== JSON.stringify(workflowSteps)
    ) {
      onWorkflowStepsChange?.(effectiveSteps);
      return;
    }

    const startNodeConfig = {
      scope,
      triggerType:
        activeTriggerItem?.triggerType ||
        triggerType ||
        (scope === "global" ? "call" : "stage"),
      triggerEvent:
        activeTriggerItem?.triggerEvent ||
        triggerEvent ||
        (scope === "global" ? "call.inbound" : "stage.entry"),
      triggerLabel:
        activeTriggerItem?.label || triggerLabel || defaultStartLabel,
      triggerDescription: activeTriggerItem?.desc || triggerDescription,
      triggerIconKey: activeTriggerItem?.iconKey || triggerIconKey,
      processName,
      stageName,
    };

    const layout = computeTreeCanvasLayout(effectiveSteps, startNodeConfig, 400, 80);

    setNodes((prevNodes) => {
      const prevMap = new Map(prevNodes.map((n) => [n.id, n]));
      return layout.nodes.map((n) => {
        const existing = prevMap.get(n.id);
        return {
          ...n,
          type: resolveCanonicalType(n.type, n.stepKey),
          x: existing ? existing.x : n.x,
          y: existing ? existing.y : n.y,
        };
      });
    });

    setConnections(layout.connections);
  }, [
    workflowSteps,
    activeTriggerItem,
    scope,
    stageName,
    processName,
    defaultStartLabel,
  ]);

  // ── History helpers ──────────────────────────────────────────────────────────

  const snapshot = useCallback(() => {
    setHistory((h) => [...h.slice(-30), { nodes: [...nodes], connections: [...connections] }]);
    setFuture([]);
  }, [nodes, connections]);

  const undo = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setFuture((f) => [{ nodes, connections }, ...f]);
    setHistory((h) => h.slice(0, -1));
    setNodes(prev.nodes);
    setConnections(prev.connections);
  };

  const redo = () => {
    if (!future.length) return;
    const next = future[0];
    setHistory((h) => [...h, { nodes, connections }]);
    setFuture((f) => f.slice(1));
    setNodes(next.nodes);
    setConnections(next.connections);
  };

  // ── Node CRUD ─────────────────────────────────────────────────────────────────

  /**
   * Attaches a logic modifier (Condition / Wait / Parallel) to whichever real
   * automation-step node is currently selected on the canvas. Opens that step's
   * existing config drawer and pre-sets the relevant field so the user can
   * confirm the change with a single "Apply" click.
   */
  const addLogicToSelectedNode = (logicType: "condition" | "wait" | "parallel") => {
    const targetNode = nodes.find(
      (n) => n.id === selectedId && n.config?.autoGenerated && !n.config?.syntheticFor
    );

    if (!targetNode) {
      toast.error(
        "Select a step on the canvas first, then add a Condition, Wait, or Parallel Branch to it."
      );
      return;
    }

    // openConfig does synchronous setState calls; wrap the follow-up
    // patchConfig / setDrawer* calls in setTimeout(0) so they run as a
    // functional update against the already-committed configNode state.
    openConfig(targetNode);

    setTimeout(() => {
      if (logicType === "condition") {
        patchConfig({ conditionsEnabled: true });
      } else if (logicType === "wait") {
        setDrawerExecType("wait");
        setDrawerDelayValue((prev) => (prev === 0 ? 5 : prev));
      } else {
        // parallel
        setDrawerExecType("parallel");
      }
    }, 0);
  };


  const addParallelBranchNode = () => {
    snapshot();
    const newParallel = createParallelStep();
    const targetBranchId = selectedBranchId;
    const afterStepId = selectedId;
    const updated = appendStepToTree(workflowSteps, newParallel, targetBranchId, afterStepId);
    if (targetBranchId || (afterStepId && findStepInTree(workflowSteps, afterStepId)?.parentBranch)) {
      toast.success("Nested Parallel Branches added to branch.");
    } else {
      toast.success("Parallel Branches added to flow.");
    }
    onWorkflowStepsChange?.(updated);
    setSelectedId(newParallel.id);
    setSelectedBranchId(null);
  };

  const handleAddBranch = (parallelStepId: string) => {
    snapshot();
    const updated = addBranchToStep(workflowSteps, parallelStepId);
    onWorkflowStepsChange?.(updated);
    toast.success("Branch added");
  };

  const handleRemoveBranch = (parallelStepId: string, branchId: string) => {
    snapshot();
    const res = removeBranchFromStep(workflowSteps, parallelStepId, branchId);
    if (!res.success) {
      toast.error(res.reason || "Parallel node must have at least 2 branches");
      return;
    }
    onWorkflowStepsChange?.(res.updatedSteps);
    if (selectedBranchId === branchId) {
      setSelectedBranchId(null);
    }
    toast.success("Branch removed");
  };

  const getParentConnectIdForNewNode = (): string | undefined => {
    if (selectedBranchId && selectedId === selectedBranchId) {
      return findBranchInTree(workflowSteps, selectedBranchId)?.parallelStep.id;
    }
    if (selectedId && !selectedId.startsWith("empty-") && selectedId !== selectedBranchId) {
      return selectedId;
    }
    return undefined;
  };

  const addNode = (type: NodeType) => {
    if (drawingConn) {
      setDrawingConn(null);
      isConnDraggingRef.current = false;
    }

    if (type === "parallel") {
      addParallelBranchNode();
      return;
    }

    // Condition node creates a dedicated condition step with Case branches and Else connector
    if (type === "condition") {
      const stepKey = "condition";
      const catalogEntry = NODE_CATEGORIES
        .flatMap(c => c.nodes)
        .find(n => n.type === type);

      const newStepId = `${stepKey}-${Date.now()}`;
      const case1Id = `${newStepId}-case-1`;
      const elseId = `${newStepId}-else`;
      const initialBranches = [
        { id: case1Id, name: "Case 1", steps: [] },
        { id: elseId, name: "Else", steps: [] }
      ];
      const initialCases = [
        {
          id: case1Id,
          name: "Case 1",
          matchLogic: "AND" as const,
          conditions: [
            {
              id: `cond-${Date.now()}-1`,
              field: "",
              fieldLabel: "",
              fieldSource: "client",
              operator: "Equal To",
              valueType: "static" as const,
              value: "",
              logicOp: "AND" as const,
            }
          ]
        }
      ];

      const parentConnectId = getParentConnectIdForNewNode();

      const newStep: WorkflowStep = {
        id: newStepId,
        name: getNodeLabel(type),
        description: catalogEntry?.desc ?? "Evaluate condition cases and branch execution",
        iconKey: "split",
        kind: "parallel",
        stepKey,
        trigger: "stage",
        executionType: "wait",
        delayValue: 0,
        delayUnit: "Minute",
        ...(parentConnectId ? { connectAfterId: parentConnectId } : {}),
        branches: initialBranches,
        params: {
          cases: initialCases,
          elseBranchId: elseId,
          conditionsEnabled: true,
        },
      };

      snapshot();
      const targetBranchId = selectedBranchId;
      const afterStepId = selectedId;
      const updated = appendStepToTree(workflowSteps, newStep, targetBranchId, afterStepId);
      if (targetBranchId || (afterStepId && findStepInTree(workflowSteps, afterStepId)?.parentBranch)) {
        toast.success(`Added ${newStep.name} to branch.`);
      } else {
        toast.success(`Added ${newStep.name} to flow.`);
      }
      onWorkflowStepsChange?.(updated);
      setSelectedId(newStepId);
      setSelectedBranchId(null);
      setTimeout(() => {
        openConfig({
          id: newStepId,
          type: "condition",
          label: newStep.name,
          stepKey: "condition",
          x: 400,
          y: 200,
          config: {
            ...newStep.params,
            branches: initialBranches,
            sourceStepId: newStepId,
            autoGenerated: true,
          },
        });
      }, 50);
      return;
    }

    if (type === "wait") {
      const stepKey = "wait";
      const catalogEntry = NODE_CATEGORIES
        .flatMap(c => c.nodes)
        .find(n => n.type === type);

      const newStepId = `wait-${Date.now()}`;
      const parentConnectId = getParentConnectIdForNewNode();

      const newStep: WorkflowStep = {
        id: newStepId,
        name: "Wait / Delay",
        description: catalogEntry?.desc ?? "Delay workflow execution before proceeding to next action",
        iconKey: "clock",
        stepKey: "wait",
        trigger: "stage",
        executionType: "wait",
        delayValue: 5,
        delayUnit: "minutes",
        ...(parentConnectId ? { connectAfterId: parentConnectId } : {}),
        params: {
          delayValue: 5,
          delayUnit: "minutes",
        },
      };

      snapshot();
      const targetBranchId = selectedBranchId;
      const afterStepId = selectedId;
      const updated = appendStepToTree(workflowSteps, newStep, targetBranchId, afterStepId);
      if (targetBranchId || (afterStepId && findStepInTree(workflowSteps, afterStepId)?.parentBranch)) {
        toast.success(`Added ${newStep.name} to branch.`);
      } else {
        toast.success(`Added ${newStep.name} to flow.`);
      }
      onWorkflowStepsChange?.(updated);
      setSelectedId(newStepId);
      const newCtx = findStepInTree(updated, newStepId);
      if (newCtx?.parentBranch) {
        setSelectedBranchId(newCtx.parentBranch.id);
      } else {
        setSelectedBranchId(null);
      }
      setTimeout(() => {
        openConfig({
          id: newStepId,
          type: "wait",
          label: newStep.name,
          stepKey: "wait",
          x: 400,
          y: 200,
          config: {
            ...newStep.params,
            delayValue: 5,
            delayUnit: "minutes",
            sourceStepId: newStepId,
            autoGenerated: true,
          },
        });
      }, 50);
      return;
    }

    const stepKey = NODE_TYPE_TO_STEP_KEY[type] || "step";
    if (stepKey && onWorkflowStepsChange) {
      const allowed: Array<string> = stepAllowedTriggers[stepKey] ?? ["stage", "incall", "inchat", "postcall"];
      const catalogEntry = NODE_CATEGORIES
        .flatMap(c => c.nodes)
        .find(n => n.type === type);

      const newStepId = `${stepKey}-${Date.now()}`;
      const parentConnectId = getParentConnectIdForNewNode();

      const newStep: WorkflowStep = {
        id: newStepId,
        name: getNodeLabel(type),
        description: catalogEntry?.desc ?? "",
        iconKey: NODE_TYPE_TO_ICON_KEY[type] ?? "zap",
        stepKey,
        trigger: allowed[0],
        executionType: "wait",
        delayValue: 0,
        delayUnit: "Minute",
        ...(parentConnectId ? { connectAfterId: parentConnectId } : {}),
        params: {},
      };

      snapshot();
      const targetBranchId = selectedBranchId;
      const afterStepId = selectedId;
      const updated = appendStepToTree(workflowSteps, newStep, targetBranchId, afterStepId);
      if (targetBranchId || (afterStepId && findStepInTree(workflowSteps, afterStepId)?.parentBranch)) {
        toast.success(`Added ${newStep.name} to branch.`);
      } else {
        toast.success(`Added ${newStep.name} to flow.`);
      }
      onWorkflowStepsChange(updated);
      setSelectedId(newStepId);
      const newCtx = findStepInTree(updated, newStepId);
      if (newCtx?.parentBranch) {
        setSelectedBranchId(newCtx.parentBranch.id);
      } else {
        setSelectedBranchId(null);
      }
      return;
    }

    // start/end or unmapped types — create a local-only canvas node (e.g. end)
    snapshot();
    const id = `node-${Date.now()}`;
    const newNode: FlowNode = {
      id,
      type,
      label: getNodeLabel(type),
      x: BASE_X,
      y: BASE_Y,
      config: {},
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedId(id);
  };

  const updateNode = (id: string, patch: Partial<FlowNode>) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  };

  const deleteNode = (id: string) => {
    if (id === "start") return;
    const node = nodes.find(n => n.id === id);
    if (node?.config?.syntheticFor) return;
    const realStepId = (node?.config?.sourceStepId || id.replace(/^(wait-|cond-|parallel-)/, "")) as string;
    const targetId = findStepInTree(workflowSteps, id) ? id : (findStepInTree(workflowSteps, realStepId) ? realStepId : null);
    if (node?.config?.autoGenerated || targetId) {
      if (onWorkflowStepsChange) {
        snapshot();
        const updatedSteps = targetId ? deleteStepFromTree(workflowSteps, targetId) : workflowSteps;
        onWorkflowStepsChange(updatedSteps);
        setNodes((prev) => prev.filter((n) => n.id !== id && n.id !== targetId && n.config?.sourceParallelStepId !== targetId && n.config?.sourceParallelStepId !== id));
        setConnections((prev) => prev.filter((c) => c.fromId !== id && c.toId !== id && c.fromId !== targetId && c.toId !== targetId));
        if (selectedId === id || selectedId === targetId) setSelectedId(null);
        if (configNode?.id === id || configNode?.id === targetId) setConfigNode(null);
        toast.success("Step removed");
      }
      return;
    }
    snapshot();
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setConnections((prev) => prev.filter((c) => c.fromId !== id && c.toId !== id));
    if (selectedId === id) setSelectedId(null);
    if (configNode?.id === id) setConfigNode(null);
  };

  // ── Port positions ────────────────────────────────────────────────────────────

  const getOutputPorts = (node: FlowNode): Array<{ port: string; label: string; branchId?: string }> => {
    if (node.type === "condition") {
      const branches = node.config?.branches;
      const cases = node.config?.cases;

      if (Array.isArray(cases) && cases.length > 0) {
        const ports = cases.map((c: any, i: number) => ({
          port: `branch-${i}`,
          label: c.name || `Case ${i + 1}`,
          branchId: c.id,
        }));
        ports.push({
          port: `branch-${cases.length}`,
          label: "Else",
          branchId: node.config?.elseBranchId || `${node.id}-else`,
        });
        return ports;
      }

      if (Array.isArray(branches) && branches.length > 0) {
        return branches.map((b: any, i: number) => {
          const isElse = b.id === "else" || b.id.endsWith("-else") || b.name === "Else";
          return {
            port: `branch-${i}`,
            label: b.name || (isElse ? "Else" : `Case ${i + 1}`),
            branchId: b.id,
          };
        });
      }

      return [
        { port: "branch-0", label: "Case 1", branchId: `${node.id}-case-1` },
        { port: "branch-1", label: "Else", branchId: `${node.id}-else` },
      ];
    }
    if (node.type === "parallel") {
      const branches = node.config.branches || [];
      if (branches.length > 0) {
        return branches.map((b: any, i: number) => ({
          port: `branch-${i}`,
          label: b.name || `Branch ${i + 1}`,
          branchId: b.id,
        }));
      }
      const count = node.config.branchCount || 2;
      return Array.from({ length: count }, (_, i) => ({
        port: `branch-${i}`,
        label: `Branch ${i + 1}`,
      }));
    }
    if (node.type === "end" || node.type === "empty-branch") return [];
    return [{ port: "default", label: "" }];
  };

  // Returns canvas-space coordinates for a node's output port
  const getPortXY = (nodeId: string, port: string, isInput: boolean) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    const ports = getOutputPorts(node);
    if (isInput) {
      return { x: node.x + NODE_W / 2, y: node.y };
    }
    if (ports.length === 1) {
      return { x: node.x + NODE_W / 2, y: node.y + NODE_H };
    }
    const idx = ports.findIndex((p) => p.port === port);
    const spacing = NODE_W / (ports.length + 1);
    return { x: node.x + spacing * (idx + 1), y: node.y + NODE_H };
  };

  // ── Connections ───────────────────────────────────────────────────────────────

  const addConnection = (fromId: string, fromPort: string, toId: string) => {
    if (fromId === toId) return;

    // Prohibit circular connections (cannot connect a node to one of its ancestors)
    const toStepCtx = findStepInTree(workflowSteps, toId);
    if (toStepCtx && isStepAncestor(toStepCtx.step, fromId)) {
      toast.error("Cannot create a circular connection.");
      return;
    }

    if (onWorkflowStepsChange) {
      snapshot();
      const updated = connectStepsInTree(workflowSteps, fromId, toId, fromPort);
      onWorkflowStepsChange(updated);
      setSelectedId(toId);
      const updatedToCtx = findStepInTree(updated, toId);
      if (updatedToCtx?.parentBranch) {
        setSelectedBranchId(updatedToCtx.parentBranch.id);
      }
      toast.success("Connected steps in sequence.");
    }
  };

  const deleteConnection = (id: string) => {
    snapshot();
    const conn = connections.find(c => c.id === id);
    if (!conn) return;

    // Track deleted connection so auto-connections won't restore it
    setDeletedConnectionKeys(prev => {
      const next = new Set(prev);
      next.add(`${conn.fromId}:${conn.fromPort || "default"}->${conn.toId}`);
      next.add(`${conn.fromId}->${conn.toId}`);
      return next;
    });

    // Remove ONLY the connection (nodes remain completely intact)
    setConnections((prev) => prev.filter((c) => c.id !== id));

    // Update target step so its connectAfterId is "none" (unconnected)
    const targetStepId = conn.toId.replace(/^(wait-|cond-|parallel-)/, "");
    if (onWorkflowStepsChange) {
      const stepCtx = findStepInTree(workflowSteps, targetStepId);
      if (stepCtx) {
        const isFromParallel = conn.fromPort.startsWith("branch-") || conn.fromId.startsWith("parallel");
        const updatedSteps = updateStepInTree(workflowSteps, targetStepId, {
          connectAfterId: "none",
          executionType: isFromParallel ? ("wait" as const) : stepCtx.step.executionType,
        });
        onWorkflowStepsChange(updatedSteps);
      }
    }
    toast.success("Connection deleted (nodes preserved)");
  };

  /**
   * Inserts a node of given type between two connected nodes.
   * Wires: FromNode -> NewNode -> ToNode and removes the old direct connection.
   */
  const insertNodeBetween = (conn: FlowConnection, type: NodeType) => {
    snapshot();
    const fromNode = nodes.find(n => n.id === conn.fromId);
    const toNode = nodes.find(n => n.id === conn.toId);
    if (!fromNode || !toNode) {
      setInsertBetweenConn(null);
      return;
    }

    const fromPos = getPortXY(conn.fromId, conn.fromPort, false);
    const toPos = getPortXY(conn.toId, "default", true);
    const midX = (fromPos.x + toPos.x) / 2;
    const midY = (fromPos.y + toPos.y) / 2;

    // Delete the existing direct connection
    deleteConnection(conn.id);

    // If user selected "parallel", insert a Parallel Branches node before toNode
    if (type === "parallel") {
      const targetStepId = conn.toId.replace(/^(wait-|cond-|parallel-)/, "");
      const stepCtx = findStepInTree(workflowSteps, targetStepId);
      if (stepCtx && onWorkflowStepsChange) {
        const parallelNodeId = `parallel-${stepCtx.step.id}`;
        const sourceStepId = conn.fromId.replace(/^(wait-|cond-|parallel-)/, "");
        const updatedSteps = updateStepInTree(workflowSteps, targetStepId, {
          executionType: "parallel" as const,
          connectAfterId: conn.fromId === "start" ? undefined : sourceStepId,
        });
        onWorkflowStepsChange(updatedSteps);

        setConnections(prev => [
          ...prev.filter(c => c.id !== conn.id),
          {
            id: `conn-${Date.now()}-in`,
            fromId: conn.fromId,
            fromPort: conn.fromPort,
            toId: parallelNodeId,
          }
        ]);
        setSelectedId(parallelNodeId);
        toast.success(`Parallel Branch inserted before ${stepCtx.step.name}.`);
      } else {
        const pId = `parallel-${Date.now()}`;
        const newParallelNode: FlowNode = {
          id: pId,
          type: "parallel",
          label: "Parallel Branches",
          x: midX - NODE_W / 2,
          y: midY - NODE_H / 2,
          config: { branchCount: 2, autoGenerated: false }
        };
        setNodes(prev => [...prev, newParallelNode]);
        setConnections(prev => [
          ...prev.filter(c => c.id !== conn.id),
          { id: `conn-${Date.now()}-1`, fromId: conn.fromId, fromPort: conn.fromPort, toId: pId },
          { id: `conn-${Date.now()}-2`, fromId: pId, fromPort: "branch-0", toId: conn.toId }
        ]);
        setSelectedId(pId);
        toast.success("Parallel Branch inserted.");
      }
      setInsertBetweenConn(null);
      return;
    }

    // Action or Logic node insertion
    const stepKey = NODE_TYPE_TO_STEP_KEY[type] || (type === "wait" ? "wait" : type === "condition" ? "condition" : "step");
    const catalogEntry = NODE_CATEGORIES.flatMap(c => c.nodes).find(n => n.type === type);
    const newStepId = `${stepKey}-${Date.now()}`;

    let sourceStepId = conn.fromId;
    if (sourceStepId.startsWith("wait-")) sourceStepId = sourceStepId.replace("wait-", "");
    else if (sourceStepId.startsWith("cond-")) sourceStepId = sourceStepId.replace("cond-", "");
    else if (sourceStepId.startsWith("parallel-")) sourceStepId = sourceStepId.replace("parallel-", "");

    let targetStepId = conn.toId;
    if (targetStepId.startsWith("wait-")) targetStepId = targetStepId.replace("wait-", "");
    else if (targetStepId.startsWith("cond-")) targetStepId = targetStepId.replace("cond-", "");
    else if (targetStepId.startsWith("parallel-")) targetStepId = targetStepId.replace("parallel-", "");

    const newStep: WorkflowStep = {
      id: newStepId,
      name: getNodeLabel(type),
      description: catalogEntry?.desc ?? "",
      iconKey: NODE_TYPE_TO_ICON_KEY[type] ?? "zap",
      stepKey: type === "condition" ? "condition" : type === "wait" ? "wait" : stepKey,
      trigger: (toNode.config?.lane as string) || (fromNode.config?.lane as string) || (scope === "global" ? "stage" : "stage"),
      executionType: conn.fromPort.startsWith("branch-") || conn.fromId.startsWith("parallel") ? "parallel" : "wait",
      delayValue: type === "wait" ? 5 : 0,
      delayUnit: "Minute",
      connectAfterId: sourceStepId === "start" ? "start" : sourceStepId,
      params: type === "condition" ? { conditionsEnabled: true } : {},
    };

    if (onWorkflowStepsChange) {
      // Find insertion index: right before targetStep in workflowSteps
      const targetIdx = workflowSteps.findIndex(s => s.id === targetStepId);
      let updatedSteps: WorkflowStep[];
      if (targetIdx !== -1) {
        const targetStepUpdated = {
          ...workflowSteps[targetIdx],
          connectAfterId: newStepId
        };
        updatedSteps = [
          ...workflowSteps.slice(0, targetIdx),
          newStep,
          targetStepUpdated,
          ...workflowSteps.slice(targetIdx + 1)
        ];
      } else {
        updatedSteps = [...workflowSteps, newStep];
      }
      onWorkflowStepsChange(updatedSteps);
    }

    // Connect fromNode -> newStep, and newStep -> toNode
    setConnections(prev => [
      ...prev.filter(c => c.id !== conn.id),
      {
        id: `conn-${Date.now()}-a`,
        fromId: conn.fromId,
        fromPort: conn.fromPort,
        toId: newStepId,
      },
      {
        id: `conn-${Date.now()}-b`,
        fromId: newStepId,
        fromPort: "default",
        toId: conn.toId,
      }
    ]);

    setSelectedId(newStepId);
    setInsertBetweenConn(null);
    toast.success(`Inserted ${getNodeLabel(type)} between ${fromNode.label} and ${toNode.label}.`);
  };

  // ── Canvas mouse ──────────────────────────────────────────────────────────────

  const canvasToWorld = (screenX: number, screenY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (screenX - rect.left - pan.x) / zoom,
      y: (screenY - rect.top - pan.y) / zoom,
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // If click was on connection actions or inside insert menu, don't handle as background click
    if ((e.target as HTMLElement).closest("[data-conn-actions]") || (e.target as HTMLElement).closest("[data-insert-menu]")) {
      return;
    }
    // Close insert menu if open
    if (insertBetweenConn) {
      setInsertBetweenConn(null);
    }
    if (drawingConn) {
      setDrawingConn(null);
      isConnDraggingRef.current = false;
    }

    const activeHandTool = isHandToolActive || isSpacePressed;
    if (e.button === 1 || (e.button === 0 && e.altKey) || (e.button === 0 && activeHandTool)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y });
      e.preventDefault();
    } else {
      setSelectedId(null);
      setSelectedBranchId(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: panStart.panX + (e.clientX - panStart.x),
        y: panStart.panY + (e.clientY - panStart.y),
      });
    }
    if (draggingId) {
      const dx = Math.abs(e.clientX - dragStartPosRef.current.x);
      const dy = Math.abs(e.clientY - dragStartPosRef.current.y);
      if (dx > 4 || dy > 4) {
        hasDraggedRef.current = true;
      }
      if (hasDraggedRef.current) {
        const world = canvasToWorld(e.clientX, e.clientY);
        updateNode(draggingId, {
          x: world.x - draggingOffset.x,
          y: world.y - draggingOffset.y,
        });
      }
    }
    if (drawingConn) {
      setMousePos(canvasToWorld(e.clientX, e.clientY));
      if (connDragStartPosRef.current) {
        const dist = Math.hypot(e.clientX - connDragStartPosRef.current.x, e.clientY - connDragStartPosRef.current.y);
        if (dist > 6) {
          isConnDraggingRef.current = true;
        }
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    if (draggingId) {
      setDraggingId(null);
      hasDraggedRef.current = false;
    }
    if (drawingConn && isConnDraggingRef.current) {
      setDrawingConn(null);
      isConnDraggingRef.current = false;
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.min(2, Math.max(0.25, z * factor)));
  };

  const fitToScreen = () => {
    if (nodes.length === 0) return;
    const minX = Math.min(...nodes.map((n) => n.x));
    const minY = Math.min(...nodes.map((n) => n.y));
    const maxX = Math.max(...nodes.map((n) => n.x + NODE_W));
    const maxY = Math.max(...nodes.map((n) => n.y + NODE_H));
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const zx = rect.width / (maxX - minX + 100);
    const zy = rect.height / (maxY - minY + 100);
    const newZoom = Math.min(1, Math.min(zx, zy));
    setZoom(newZoom);
    setPan({
      x: (rect.width - (maxX - minX) * newZoom) / 2 - minX * newZoom,
      y: (rect.height - (maxY - minY) * newZoom) / 2 - minY * newZoom,
    });
  };

  const tidyUpFlow = () => {
    snapshot();
    const startNodeConfig = {
      scope,
      triggerType:
        activeTriggerItem?.triggerType ||
        triggerType ||
        (scope === "global" ? "call" : "stage"),
      triggerEvent:
        activeTriggerItem?.triggerEvent ||
        triggerEvent ||
        (scope === "global" ? "call.inbound" : "stage.entry"),
      triggerLabel:
        activeTriggerItem?.label || triggerLabel || defaultStartLabel,
      triggerDescription: activeTriggerItem?.desc || triggerDescription,
      triggerIconKey: activeTriggerItem?.iconKey || triggerIconKey,
      processName,
      stageName,
    };

    const layout = computeTreeCanvasLayout(workflowSteps, startNodeConfig, 400, 80);
    setNodes(layout.nodes.map((n) => ({ ...n, type: resolveCanonicalType(n.type, n.stepKey) })));
    setConnections(layout.connections);
    toast.success("Flow tidied up! Parallel branches connected and running independently.");
  };

  // ── Bezier path helper ────────────────────────────────────────────────────────

  const bezierPath = (x1: number, y1: number, x2: number, y2: number) => {
    const cy = (y1 + y2) / 2;
    return `M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`;
  };

  // ── Draggable node ────────────────────────────────────────────────────────────

  const onNodeMouseDown = (e: React.MouseEvent, node: FlowNode) => {
    if ((e.target as HTMLElement).closest("[data-port]")) return;
    if (drawingConn) return;
    e.stopPropagation();
    setSelectedId(node.id);
    const stepCtx = findStepInTree(workflowSteps, node.id);
    if (stepCtx?.parentBranch) {
      setSelectedBranchId(stepCtx.parentBranch.id);
    } else if (node.type !== "empty-branch") {
      setSelectedBranchId(null);
    }
    const world = canvasToWorld(e.clientX, e.clientY);
    setDraggingId(node.id);
    setDraggingOffset({ x: world.x - node.x, y: world.y - node.y });
    hasDraggedRef.current = false;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
  };

  // ── Filtered node library ─────────────────────────────────────────────────────

  const q = search.toLowerCase();
  const filteredTriggers = useMemo(() => {
    if (!q) return allTriggers;
    return allTriggers.filter(t => t.label.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q));
  }, [allTriggers, q]);

  const filteredCats = NODE_CATEGORIES.map((cat) => ({
    ...cat,
    nodes: cat.nodes.filter((n) => !q || n.label.toLowerCase().includes(q) || n.desc.toLowerCase().includes(q)),
  })).filter((cat) => cat.nodes.length > 0);

    const triggerCategories = useMemo(() => {
    return [
      {
        id: "process",
        type: "process",
        label: "Process Triggers",
        desc: "Created or updated",
        icon: <Workflow className="w-4 h-4 text-indigo-600" />,
        defaultTrigger: allTriggers.find((t) => t.triggerType === "process" && t.triggerEvent === "process.created") || allTriggers[0],
      },
      {
        id: "client",
        type: "client",
        label: "Client Triggers",
        desc: "Created or updated",
        icon: <User className="w-4 h-4 text-emerald-600" />,
        defaultTrigger: allTriggers.find((t) => t.triggerType === "client" && t.triggerEvent === "client.created") || allTriggers[0],
      },
      {
        id: "appointment",
        type: "appointment",
        label: "Appointment Triggers",
        desc: "Created or updated",
        icon: <Calendar className="w-4 h-4 text-purple-600" />,
        defaultTrigger: allTriggers.find((t) => t.triggerType === "appointment" && t.triggerEvent === "appointment.created") || allTriggers[0],
      },
      {
        id: "invoice",
        type: "invoice",
        label: "Invoice Triggers",
        desc: "Created or updated",
        icon: <Receipt className="w-4 h-4 text-amber-600" />,
        defaultTrigger: allTriggers.find((t) => t.triggerType === "invoice" && t.triggerEvent === "invoice.created") || allTriggers[0],
      },
      {
        id: "call",
        type: "call",
        label: "Call Triggers",
        desc: "Created or updated",
        icon: <Phone className="w-4 h-4 text-blue-600" />,
        defaultTrigger: allTriggers.find((t) => t.triggerType === "call" && t.triggerEvent === "call.created") || allTriggers[0],
      },
      {
        id: "task",
        type: "task",
        label: "Task Triggers",
        desc: "Created or updated",
        icon: <CheckSquare className="w-4 h-4 text-fuchsia-600" />,
        defaultTrigger: allTriggers.find((t) => t.triggerType === "task" && t.triggerEvent === "task.created") || allTriggers[0],
      },

    ];
  }, [allTriggers]);

  const filteredTriggerCategories = useMemo(() => {
    if (!q) return triggerCategories;
    return triggerCategories.filter(
      (c) => c.label.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q)
    );
  }, [triggerCategories, q]);

  // ── Config drawer ─────────────────────────────────────────────────────────────

  const openConfig = (node: FlowNode) => {
    if (node.type === "start") {
      const activeItem = allTriggers.find(t =>
        t.triggerEvent === (node.config?.selectedEvent || node.config?.triggerEvent || activeTriggerEvent)
      ) || allTriggers[0];
      const trigCategory = node.config?.category || node.config?.triggerType || activeItem?.triggerType || "process";
      const trigEvent = node.config?.selectedEvent || node.config?.triggerEvent || activeItem?.triggerEvent || (
        `${trigCategory}.created`
      );
      const trigItem = allTriggers.find(t => t.triggerEvent === trigEvent) || activeItem;
      const trigLabel = node.config?.triggerLabel || trigItem?.label || node.label || "Trigger";
      const trigDesc = node.config?.triggerDescription || trigItem?.desc || "";
      const trigIconKey = node.config?.triggerIconKey || trigItem?.iconKey || "workflow";

      const targetProc = effectiveProcesses.find(p => p.id === currentProcessId || p.name === processName);
      const targetStage = targetProc?.stages?.find((s: any) => s.name === stageName || s.id === stageName);
      const defaultProcessId = (scope === "stage" && targetProc) ? targetProc.id : ((node.config?.triggerProcessId && node.config.triggerProcessId !== "all") ? node.config.triggerProcessId : (effectiveProcesses[0]?.id || ""));
      const defaultProcessName = (scope === "stage" && targetProc) ? targetProc.name : ((node.config?.triggerProcessName && node.config.triggerProcessName !== "Any Process") ? node.config.triggerProcessName : (effectiveProcesses[0]?.name || ""));
      const defaultStageId = (scope === "stage" && targetStage) ? targetStage.id : (node.config?.triggerStageId || "all");
      const defaultStageName = (scope === "stage" && targetStage) ? targetStage.name : (node.config?.triggerStageName || "Any Stage");

      setConfigNode({
        ...node,
        label: trigLabel,
        stepKey: "trigger_config",
        config: {
          productFilter: "all",
          selectedProductId: "",
          appointmentServiceFilter: "all",
          appointmentProviderFilter: "all",
          invoicePaymentMode: "all",
          monitoredFields: [],
          matchLogic: "any",
          conditionsEnabled: false,
          conditions: [],
          fieldConditions: [],
          ...(node.config || {}),
          triggerProcessId: defaultProcessId,
          triggerProcessName: defaultProcessName,
          triggerStageId: defaultStageId,
          triggerStageName: defaultStageName,
          scope: scope || "stage",
          category: trigCategory,
          triggerType: trigCategory,
          selectedEvent: trigEvent,
          triggerEvent: trigEvent,
          triggerLabel: trigLabel,
          triggerDescription: trigDesc,
          triggerIconKey: trigIconKey,
        },
      });
      return;
    }
    if (node.type === "end") {
      return;
    }
    // Synthetic nodes (cond-, wait-, parallel-) proxy to the underlying step node
    const targetStepId = (node.config?.syntheticFor || node.config?.sourceStepId || node.id) as string;
    const stepCtx = findStepInTree(workflowSteps, targetStepId);
    let realStep = stepCtx?.step || workflowSteps.find(s => s.id === targetStepId);
    const realNode = nodes.find(n => n.id === targetStepId) || node;

    const resolvedStepKey = realStep?.stepKey || node.stepKey || realNode.stepKey || NODE_TYPE_TO_STEP_KEY[node.type];

    if (!realStep && resolvedStepKey && node.type !== "parallel" && node.type !== "empty-branch") {
      const catalogEntry = NODE_CATEGORIES.flatMap(c => c.nodes).find(n => n.type === node.type);
      const allowed: Array<string> = stepAllowedTriggers[resolvedStepKey] ?? ["stage", "incall", "inchat", "postcall"];
      realStep = {
        id: node.id,
        name: node.label || getNodeLabel(node.type),
        description: catalogEntry?.desc ?? "",
        iconKey: NODE_TYPE_TO_ICON_KEY[node.type] ?? "zap",
        stepKey: resolvedStepKey,
        trigger: allowed[0],
        executionType: "wait",
        delayValue: 0,
        delayUnit: "Minute",
        params: node.config || {},
      };
      if (onWorkflowStepsChange) {
        const updated = appendStepToTree(workflowSteps, realStep);
        onWorkflowStepsChange(updated);
      }
    }

    if (realStep) {
      const isWait = realStep.stepKey === "wait" || realStep.stepKey === "delay" || node.type === "wait";
      const waitVal = realStep.params?.delayValue ?? realStep.params?.duration ?? realStep.delayValue ?? 5;
      const waitUnit = realStep.params?.delayUnit ?? realStep.params?.unit ?? realStep.delayUnit ?? "minutes";

      setDrawerTrigger((realStep.trigger ?? (node.config?.lane ?? "stage")) as "stage" | "incall" | "postcall");
      setDrawerExecType((realStep.executionType ?? "wait") as "instant" | "wait" | "parallel");
      setDrawerDelayValue(isWait ? waitVal : (realStep.delayValue ?? 0));
      setDrawerDelayUnit(isWait ? waitUnit : (realStep.delayUnit ?? "Minute"));
      setDrawerConnectAfterId(realStep.connectAfterId);
      setConfigNode({
        ...realNode,
        label: realStep.name || (isWait ? "Wait / Delay" : getNodeLabel(node.type)),
        stepKey: realStep.stepKey,
        config: {
          ...(isWait ? { delayValue: waitVal, delayUnit: waitUnit } : {}),
          ...(realStep.params ?? {}),
          ...(realNode.config ?? {}),
          branches: realStep.branches ?? realNode.config?.branches,
          sourceStepId: realStep.id,
          autoGenerated: true,
        }
      });
    } else {
      setConfigNode({ ...node });
    }
  };

  const openOverviewConfig = () => {
    const startNode = nodes.find((n) => n.type === "start" || n.id === "start");
    setSelectedId("automation_overview");
    setSelectedBranchId(null);
    setConfigNode({
      id: "automation_overview",
      type: "overview" as NodeType,
      label: automationName || "Automation Overview",
      x: startNode ? startNode.x : 400,
      y: startNode ? startNode.y - 95 : 45,
      stepKey: "automation_overview",
      config: {
        name: automationName,
        automationName: automationName,
        description: automationDescription,
        automationDescription: automationDescription,
        status: automationStatus,
        automationStatus: automationStatus,
        isAdmin: isAdmin,
        scopingRules: scopingRules,
      },
    });
  };

  const saveConfig = () => {
    if (!configNode) return;

    if (configNode.stepKey === "automation_overview" || configNode.type === "overview" || configNode.id === "automation_overview") {
      const newName = configNode.config?.name || configNode.config?.automationName || configNode.label;
      const newDesc = configNode.config?.description || configNode.config?.automationDescription || "";
      const newStatus = configNode.config?.status || configNode.config?.automationStatus || "active";
      const newRules = configNode.config?.scopingRules || scopingRules;

      if (onAutomationNameChange && newName) onAutomationNameChange(newName);
      if (onAutomationDescriptionChange) onAutomationDescriptionChange(newDesc);
      if (onAutomationStatusChange) onAutomationStatusChange(newStatus);
      if (onScopingRulesChange && newRules) onScopingRulesChange(newRules);

      toast.success("Automation overview updated");
      setConfigNode(null);
      return;
    }

    if (configNode.type === "start") {
      const selectedEvent = configNode.config?.selectedEvent;
      const trigCategory = configNode.config?.category;
      const catalogItem = allTriggers.find(t =>
        t.triggerEvent === selectedEvent ||
        (t.triggerEvent === "stage.entered" && selectedEvent === "stage.entry") ||
        (t.triggerEvent === "stage.exited" && selectedEvent === "stage.exit") ||
        (t.triggerEvent === "stage.entry" && selectedEvent === "stage.entered") ||
        (t.triggerEvent === "stage.exit" && selectedEvent === "stage.exited")
      );
      const newLabel = catalogItem?.label || configNode.label || "Trigger";
      const newDesc = catalogItem?.desc || configNode.config?.triggerDescription || "";
      const newIconKey = catalogItem?.iconKey || configNode.config?.triggerIconKey || "gitbranch";

      if (catalogItem) {
        selectTrigger(catalogItem);
      }
      const triggerParams = {
        ...(configNode.config || {}),
        triggerEvent: selectedEvent,
        stageId: configNode.config?.stageId || configNode.config?.triggerStageId,
        stageName: configNode.config?.stageName || configNode.config?.triggerStageName,
        processId: configNode.config?.processId || configNode.config?.triggerProcessId,
        processName: configNode.config?.processName || configNode.config?.triggerProcessName,
        triggerStageId: configNode.config?.triggerStageId || configNode.config?.stageId,
        triggerStageName: configNode.config?.triggerStageName || configNode.config?.stageName,
        triggerProcessId: configNode.config?.triggerProcessId || configNode.config?.processId,
        triggerProcessName: configNode.config?.triggerProcessName || configNode.config?.processName,
      };

      updateNode(configNode.id, {
        label: newLabel,
        config: {
          ...triggerParams,
          triggerType: catalogItem?.triggerType || trigCategory || (selectedEvent?.startsWith("stage") ? "stage" : "client"),
          triggerLabel: newLabel,
          triggerDescription: newDesc,
          triggerIconKey: newIconKey,
        }
      });
      if (onTriggerChange) {
        onTriggerChange({
          type: (catalogItem?.triggerType || trigCategory || (selectedEvent?.startsWith("stage") ? "stage" : "client")) as any,
          event: selectedEvent || "process.created",
          label: newLabel,
          description: newDesc,
          iconKey: newIconKey,
          params: triggerParams,
        });
      }
      toast.success(`Trigger configured: "${newLabel}"`);
      setHasChosenTrigger(true);
      setOpenActionCategoryId("crm-entities");
      setConfigNode(null);
      return;
    }

    updateNode(configNode.id, { label: configNode.label, config: configNode.config });
    // Sync back to WorkflowStep (trigger + executionType + delay + connectAfterId + params)
    const targetStepId = (configNode.config?.sourceStepId || configNode.config?.syntheticFor || configNode.id) as string;
    const stepCtx = findStepInTree(workflowSteps, targetStepId);

    if (stepCtx && onWorkflowStepsChange) {
      const { autoGenerated: _a, sourceStepId: _s, lane: _l, syntheticFor: _syn, ...params } = configNode.config || {};
      const isWait = stepCtx.step.stepKey === "wait" || stepCtx.step.stepKey === "delay" || configNode.stepKey === "wait";
      const finalDelayVal = isWait ? (configNode.config?.delayValue ?? drawerDelayValue) : drawerDelayValue;
      const finalDelayUnit = isWait ? (configNode.config?.delayUnit ?? drawerDelayUnit) : drawerDelayUnit;
      const finalConnectAfterId = drawerTrigger !== "incall" && drawerExecType === "wait" ? drawerConnectAfterId : undefined;
      let updatedBranches = configNode.config?.branches ?? stepCtx.step.branches;
      if (configNode.stepKey === "condition") {
        const condStep: WorkflowStep = {
          ...stepCtx.step,
          stepKey: "condition",
          kind: "parallel",
          branches: updatedBranches,
          params: {
            ...(stepCtx.step.params ?? {}),
            ...params,
          },
        };
        const validated = ensureValidBranches(condStep);
        updatedBranches = validated.branches;
      }
      const isBranching = configNode.stepKey === "condition" || configNode.stepKey === "parallel" || (updatedBranches && updatedBranches.length > 0);
      const updatedSteps = updateStepInTree(workflowSteps, targetStepId, {
        name: configNode.label || stepCtx.step.name,
        trigger: drawerTrigger,
        executionType: drawerExecType,
        delayValue: finalDelayVal,
        delayUnit: finalDelayUnit,
        connectAfterId: finalConnectAfterId,
        ...(isBranching ? { branches: updatedBranches, kind: "parallel" } : {}),
        params: {
          ...(stepCtx.step.params ?? {}),
          ...params,
          ...(isWait ? { delayValue: finalDelayVal, delayUnit: finalDelayUnit } : {}),
        }
      });
      onWorkflowStepsChange(updatedSteps);
      toast.success(`Action "${configNode.label || stepCtx.step.name}" updated`);
    }
    setConfigNode(null);
  };

  const patchConfig = (patch: Record<string, any>) => {
    if (!configNode) return;
    const targetStepId = (configNode.config?.sourceStepId || configNode.config?.syntheticFor || configNode.id) as string;
    const nextLabel = patch.name || patch.automationName || configNode.label;

    setConfigNode((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        label: nextLabel,
        config: { ...prev.config, ...patch },
      };
    });

    if (configNode.stepKey === "condition" && (patch.cases !== undefined || patch.branches !== undefined)) {
      setNodes((prevNodes) =>
        prevNodes.map((n) => {
          if (n.id === targetStepId || n.id === configNode.id) {
            return {
              ...n,
              label: nextLabel,
              config: {
                ...n.config,
                ...patch,
              },
            };
          }
          return n;
        })
      );

      if (onWorkflowStepsChange) {
        const stepCtx = findStepInTree(workflowSteps, targetStepId);
        if (stepCtx) {
          const updatedBranches = patch.branches || stepCtx.step.branches;
          const updatedSteps = updateStepInTree(workflowSteps, targetStepId, {
            branches: updatedBranches,
            kind: "parallel",
            stepKey: "condition",
            params: {
              ...(stepCtx.step.params ?? {}),
              ...patch,
            },
          });
          onWorkflowStepsChange(updatedSteps);
        }
      }
    }
    if (configNode.stepKey === "automation_overview" || configNode.type === "overview" || configNode.id === "automation_overview") {
      if (patch.name !== undefined && onAutomationNameChange) onAutomationNameChange(patch.name);
      if (patch.automationName !== undefined && onAutomationNameChange) onAutomationNameChange(patch.automationName);
      if (patch.description !== undefined && onAutomationDescriptionChange) onAutomationDescriptionChange(patch.description);
      if (patch.automationDescription !== undefined && onAutomationDescriptionChange) onAutomationDescriptionChange(patch.automationDescription);
      if (patch.status !== undefined && onAutomationStatusChange) onAutomationStatusChange(patch.status);
      if (patch.automationStatus !== undefined && onAutomationStatusChange) onAutomationStatusChange(patch.automationStatus);
      if (patch.scopingRules !== undefined && onScopingRulesChange) onScopingRulesChange(patch.scopingRules);
    }
  };

  // ── Variable insertion ────────────────────────────────────────────────────────

  const handleVarBtn = (setter: (v: string) => void) => {
    setActiveVarSetter(() => setter);
    setShowVariableModal(true);
  };

  const handleInsertVar = (variable: string) => {
    if (activeVarSetter) activeVarSetter(variable);
  };


  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden bg-muted/20">

      {/* ── LEFT: Overview & Node Library ──────────────────────────────────── */}
      <div className="w-80 bg-card border-r border-border flex flex-col flex-shrink-0 overflow-hidden">
        {/* Admin Scope (Only when isAdmin === true) */}
        {isAdmin && (
          <div className="p-3 border-b border-border bg-card/60">
            <AdminControlAccordion
              scopingRules={scopingRules || []}
              onScopingRulesChange={(newRules) => onScopingRulesChange?.(newRules)}
              defaultAdminControlOpen={false}
              defaultScopeOpen={false}
              defaultPermissionsOpen={false}
              scopeTooltip="Define tenant scope rules. Visibility by tenant industry category, industries, and locations."
              permissionsTooltip="Configure what tenant users are permitted to do with this automation rule."
              className="w-full text-xs"
            />
          </div>
        )}

        {!hasChosenTrigger ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Select Trigger Header & Search */}
            <div className="p-3 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Select Trigger</span>
                <InfoTooltip text="Choose a trigger event to start your automation flow. Each automation starts with one trigger." />
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search trigger categories..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-input-background border border-input rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Trigger Category Cards List */}
            <div ref={sidebarRef} className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
              {filteredTriggerCategories.map((cat) => {
                const isActiveCategory = activeTriggerItem?.triggerType === cat.type;
                const catTheme = getCrystalTriggerTheme(cat.type);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      selectTrigger(cat.defaultTrigger);
                      const startNode = nodes.find((n) => n.type === "start");
                      const baseNode = startNode || {
                        id: "start",
                        type: "start" as const,
                        label: cat.defaultTrigger.label,
                        x: 300,
                        y: 80,
                        config: {},
                      };
                      openConfig({
                        ...baseNode,
                        label: cat.defaultTrigger.label,
                        config: {
                          ...baseNode.config,
                          category: cat.type,
                          triggerType: cat.type,
                          selectedEvent: cat.defaultTrigger.triggerEvent,
                          triggerEvent: cat.defaultTrigger.triggerEvent,
                          triggerLabel: cat.defaultTrigger.label,
                          triggerDescription: cat.defaultTrigger.desc,
                          triggerIconKey: cat.defaultTrigger.iconKey,
                        },
                      });
                    }}
                    className={`w-full text-left flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer group ${
                      isActiveCategory
                        ? "bg-slate-50 border-slate-400 shadow-[0_4px_14px_rgba(15,23,42,0.08)]"
                        : "bg-white border-slate-200/90 hover:border-slate-300 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:shadow-[0_6px_16px_rgba(15,23,42,0.06)]"
                    }`}
                  >
                    <div className="group-hover:scale-105 transition-transform">
                      <CrystalOrbIcon orbStyle={catTheme.orbStyle} size="md">
                        {cat.icon}
                      </CrystalOrbIcon>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <p className="text-[13px] font-semibold text-slate-900 truncate leading-tight">
                          {cat.label}
                        </p>
                        {isActiveCategory && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded leading-none shrink-0"
                            style={catTheme.badgeStyle}
                          >
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug mt-0.5">
                        {cat.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Proceed to Actions Footer */}
            <div className="p-3 border-t border-border bg-card/60 flex flex-col gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setHasChosenTrigger(true);
                  setOpenActionCategoryId("crm-entities");
                }}
                className="w-full py-2.5 px-4 rounded-full bg-gradient-to-r from-[#181e25] to-[#2c3e50] hover:from-[#222a35] hover:to-[#384c60] active:scale-[0.99] text-white font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_2px_8px_rgba(24,30,37,0.20)] transition-all cursor-pointer"
              >
                <span>Proceed to Add Actions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <p className="text-[10px] text-center text-muted-foreground truncate">
                Selected: <span className="font-semibold text-foreground">{activeTriggerItem?.label || "Trigger"}</span>
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Add Actions Header & Search */}
            <div className="p-3 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Add Actions</span>
                <InfoTooltip text="Click any action below to add it to your workflow canvas." />
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search action steps..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-input-background border border-input rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Action Categories Accordion (Only one open at a time) */}
            <div ref={sidebarRef} className="flex-1 overflow-y-auto">
              {filteredCats.map((cat) => {
                const isCatOpen = q ? true : openActionCategoryId === cat.id;
                return (
                  <div key={cat.id} className="border-b border-border/60">
                    <button
                      type="button"
                      onClick={() => setOpenActionCategoryId((prev) => (prev === cat.id ? null : cat.id))}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {cat.icon}
                        {cat.label}
                      </div>
                      {isCatOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </button>

                    {isCatOpen && (
                      <div className="pb-3 px-2.5 space-y-2.5">
                        {cat.nodes.map((node) => {
                          const nodeTheme = getCrystalNodeTheme(node.type);
                          return (
                            <button
                              key={node.type}
                              type="button"
                              onClick={() => addNode(node.type)}
                              className="w-full text-left flex items-center gap-3 p-3 rounded-lg border border-slate-200/90 bg-white hover:border-slate-300 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:shadow-[0_6px_18px_rgba(15,23,42,0.07)] transition-all cursor-pointer group"
                            >
                              <div className="group-hover:scale-105 transition-transform">
                                <CrystalOrbIcon orbStyle={nodeTheme.orbStyle} size="md">
                                  {node.icon}
                                </CrystalOrbIcon>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-semibold text-slate-900 leading-tight truncate">
                                  {node.label}
                                </p>
                                <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug mt-0.5">
                                  {node.desc}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Change Trigger Footer */}
            <div className="p-3 border-t border-border bg-card/60 flex flex-col gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setHasChosenTrigger(false);
                  if (sidebarRef.current) sidebarRef.current.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-800 font-semibold text-xs flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer"
              >
                <span>← Change Trigger</span>
              </button>
              <p className="text-[10px] text-center text-muted-foreground truncate">
                Trigger: <span className="font-semibold text-foreground">{activeTriggerItem?.label || (isGlobalScope ? (triggerLabel || "Select Trigger") : `On Entry: ${stageName}`)}</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── CENTER: Canvas ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Canvas area */}
        <div
          ref={canvasRef}
          className={`flex-1 relative overflow-hidden ${(isHandToolActive || isSpacePressed) ? (isPanning ? "cursor-grabbing" : "cursor-grab") : "cursor-default"}`}
          style={{ background: "radial-gradient(circle, #e5e7eb 1px, transparent 1px) 0 0 / 24px 24px" }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          {/* Floating Canvas Controls Bar (Undo, Redo, Zoom, Max View, Tidy Up, Hand Tool) */}
          <div
            className="absolute top-3.5 right-4 z-30 flex items-center gap-1 px-2 py-1.5 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-[0_4px_16px_rgba(15,23,42,0.08)] pointer-events-auto"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button onClick={undo} disabled={!history.length} title="Undo" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 disabled:opacity-30 transition-colors cursor-pointer">
              <Undo2 className="w-4 h-4" />
            </button>
            <button onClick={redo} disabled={!future.length} title="Redo" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 disabled:opacity-30 transition-colors cursor-pointer">
              <Redo2 className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-200 mx-0.5" />
            <button onClick={() => setZoom((z) => Math.min(2, z * 1.2))} title="Zoom In" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer">
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-600 font-medium w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.max(0.25, z * 0.8))} title="Zoom Out" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer">
              <ZoomOut className="w-4 h-4" />
            </button>
            <button onClick={fitToScreen} title="Max View / Fit to Screen" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer">
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsHandToolActive(!isHandToolActive)}
              title="Hand Tool (Space to temporarily activate)"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isHandToolActive
                  ? "bg-slate-900 text-white"
                  : "hover:bg-slate-100 text-slate-600"
              }`}
            >
              <Hand className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-200 mx-0.5" />
            <button
              onClick={tidyUpFlow}
              title="Tidy up the flow layout"
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full bg-gradient-to-r from-[#181e25] to-[#2c3e50] hover:from-[#222a35] hover:to-[#384c60] text-white border border-slate-700/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_2px_8px_rgba(24,30,37,0.20)] transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tidy Up</span>
            </button>
            {!hideCanvasSave && onSave && (
              <>
                <div className="w-px h-4 bg-slate-200 mx-0.5" />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onSave}
                  className="h-7 text-xs cursor-pointer"
                >
                  <Save className="w-3 h-3 mr-1" />
                  Save
                </Button>
              </>
            )}
          </div>
          {/* Active connection mode banner */}
          {drawingConn && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-card/95 backdrop-blur-md text-foreground border border-primary/40 px-3.5 py-1.5 rounded-full shadow-lg text-xs font-medium pointer-events-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                Connecting from <span className="font-semibold text-primary">{nodes.find(n => n.id === drawingConn.fromId)?.label || "selected node"}</span> — Click target node or port
              </span>
              <button
                type="button"
                onClick={() => setDrawingConn(null)}
                className="ml-1.5 px-2 py-0.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground text-[11px] transition-colors cursor-pointer border border-border"
              >
                Cancel (Esc)
              </button>
            </div>
          )}

          <div
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0", position: "absolute", top: 0, left: 0 }}
          >
            {/* SVG Connections */}
            <svg style={{ position: "absolute", top: 0, left: 0, width: 4000, height: 3000, pointerEvents: "none", overflow: "visible" }}>
              {connections.map((conn) => {
                const fromNode = nodes.find((n) => n.id === conn.fromId);
                const toNode = nodes.find((n) => n.id === conn.toId);
                if (!fromNode || !toNode) return null;
                const from = getPortXY(conn.fromId, conn.fromPort, false);
                const to = getPortXY(conn.toId, "default", true);
                const label = PORT_LABEL[conn.fromPort] || "";
                const midX = (from.x + to.x) / 2;
                const midY = (from.y + to.y) / 2;
                const isHovered = hoveredConnId === conn.id;
                const threadColor = isHovered ? "#64748b" : "#94a3b8";
                return (
                  <g key={conn.id}>
                    <path
                      d={bezierPath(from.x, from.y, to.x, to.y)}
                      fill="none"
                      stroke={threadColor}
                      strokeWidth={isHovered ? 2.5 : 1.75}
                      strokeOpacity={isHovered ? 1 : 0.85}
                      markerEnd="url(#arrow)"
                    />
                    {label && (
                      <text x={midX} y={midY - 14} textAnchor="middle" fontSize={9} fontWeight="600" fill="#64748b">
                        {label}
                      </text>
                    )}
                    {/* Hover detection path */}
                    <path
                      d={bezierPath(from.x, from.y, to.x, to.y)}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={16}
                      style={{ cursor: "pointer", pointerEvents: "stroke" }}
                      onMouseEnter={() => setHoveredConnId(conn.id)}
                      onMouseLeave={() => setHoveredConnId(null)}
                    />
                  </g>
                );
              })}

              {/* Arrow marker */}
              <defs>
                <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8" />
                </marker>
              </defs>

              {/* Drawing connection preview */}
              {drawingConn && (
                <path
                  d={bezierPath(drawingConn.x, drawingConn.y, mousePos.x, mousePos.y)}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  opacity={0.75}
                />
              )}
            </svg>

            {/* Connection Actions: clean white [+] to insert node between, [Trash] to delete connection only */}
            {connections.map((conn) => {
              const fromNode = nodes.find((n) => n.id === conn.fromId);
              const toNode = nodes.find((n) => n.id === conn.toId);
              if (!fromNode || !toNode) return null;
              const from = getPortXY(conn.fromId, conn.fromPort, false);
              const to = getPortXY(conn.toId, "default", true);
              const midX = (from.x + to.x) / 2;
              const midY = (from.y + to.y) / 2;
              const isHovered = hoveredConnId === conn.id || insertBetweenConn?.conn.id === conn.id;
              if (!isHovered) return null;

              return (
                <div
                  key={`conn-actions-${conn.id}`}
                  data-conn-actions="true"
                  style={{
                    position: "absolute",
                    left: midX,
                    top: midY,
                    transform: "translate(-50%, -50%)",
                    zIndex: isHovered ? 30 : 20,
                  }}
                  onMouseEnter={() => setHoveredConnId(conn.id)}
                  onMouseLeave={() => setHoveredConnId(null)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white border border-slate-200 shadow-sm transition-all">
                    {/* Plus button: clean white, no blue accent */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInsertBetweenConn({ conn, x: midX, y: midY });
                        setInsertSearch("");
                      }}
                      className="w-5 h-5 flex items-center justify-center rounded-full bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                      title="Add a node between these steps (+)"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    <span className="w-px h-3 bg-slate-200" />

                    {/* Delete connection button: clean white */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConnection(conn.id);
                      }}
                      className="w-5 h-5 flex items-center justify-center rounded-full bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                      title="Delete connection (keeps nodes)"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Popover to insert node between two connected nodes */}
            {insertBetweenConn && (() => {
              const fromNode = nodes.find(n => n.id === insertBetweenConn.conn.fromId);
              const toNode = nodes.find(n => n.id === insertBetweenConn.conn.toId);
              const qInsert = insertSearch.toLowerCase();
              const filteredInsertCats = NODE_CATEGORIES.map(cat => ({
                ...cat,
                nodes: cat.nodes.filter(n => !qInsert || n.label.toLowerCase().includes(qInsert) || n.desc.toLowerCase().includes(qInsert))
              })).filter(cat => cat.nodes.length > 0);

              return (
                <div
                  data-insert-menu="true"
                  style={{
                    position: "absolute",
                    left: insertBetweenConn.x,
                    top: insertBetweenConn.y + 16,
                    transform: "translateX(-50%)",
                    width: 320,
                    maxHeight: 440,
                    zIndex: 60,
                  }}
                  className="bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="p-3 border-b border-border bg-muted/40 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold text-foreground">Insert Step Between</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {fromNode?.label || "Step"} → {toNode?.label || "Step"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInsertBetweenConn(null)}
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Search */}
                  <div className="p-2 border-b border-border bg-card">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search steps..."
                        value={insertSearch}
                        onChange={(e) => setInsertSearch(e.target.value)}
                        autoFocus
                        className="w-full pl-8 pr-3 py-1.5 bg-input-background border border-input rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Categories & Steps List */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-3 max-h-[300px]">
                    {filteredInsertCats.map(cat => (
                      <div key={cat.id}>
                        <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          {cat.icon}
                          <span>{cat.label}</span>
                        </div>
                        <div className="space-y-0.5 mt-0.5">
                          {cat.nodes.map(n => (
                            <button
                              key={n.type}
                              type="button"
                              onClick={() => insertNodeBetween(insertBetweenConn.conn, n.type)}
                              className="w-full text-left flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors group cursor-pointer"
                            >
                              <span className="flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors">
                                {n.icon}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium truncate">{n.label}</p>
                                <p className="text-[10px] text-muted-foreground truncate leading-tight">{n.desc}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}



            {/* Nodes */}
            {/* First Action Placeholder if no steps yet */}

            
            {nodes.map((node) => {
              const style = NODE_STYLE[node.type] || NODE_STYLE.start;
              const ports = getOutputPorts(node);
              const isSelected = selectedId === node.id;
              const isStart = node.type === "start";
              const isEnd = node.type === "end";
              const isTargetNode = Boolean(drawingConn && drawingConn.fromId !== node.id);

              return (
                <div
                  key={node.id}
                  style={{ position: "absolute", left: node.x, top: node.y, width: NODE_W, zIndex: isSelected ? 15 : isTargetNode ? 20 : 1 }}
                  onMouseDown={(e) => onNodeMouseDown(e, node)}
                  onMouseUp={(e) => {
                    if (drawingConn && drawingConn.fromId !== node.id) {
                      e.stopPropagation();
                      addConnection(drawingConn.fromId, drawingConn.fromPort, node.id);
                      setDrawingConn(null);
                      isConnDraggingRef.current = false;
                      toast.success(`Connected to ${node.label || "node"}`);
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (drawingConn && drawingConn.fromId !== node.id) {
                      addConnection(drawingConn.fromId, drawingConn.fromPort, node.id);
                      setDrawingConn(null);
                      isConnDraggingRef.current = false;
                      toast.success(`Connected to ${node.label || "node"}`);
                      return;
                    }
                    setSelectedId(node.id);
                    const stepCtx = findStepInTree(workflowSteps, node.id);
                    if (stepCtx?.parentBranch) {
                      setSelectedBranchId(stepCtx.parentBranch.id);
                    } else if (node.type !== "empty-branch") {
                      setSelectedBranchId(null);
                    }
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (node.type !== "empty-branch") {
                      openConfig(node);
                    }
                  }}
                >
                  {/* Input port (top) */}
                  {!isStart && (
                    <div
                      data-port="input"
                      style={{
                        position: "absolute",
                        top: -12,
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: 26,
                        height: 26,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "crosshair",
                        zIndex: 25,
                      }}
                      onMouseUp={(e) => {
                        e.stopPropagation();
                        if (drawingConn && drawingConn.fromId !== node.id) {
                          addConnection(drawingConn.fromId, drawingConn.fromPort, node.id);
                          setDrawingConn(null);
                          isConnDraggingRef.current = false;
                          toast.success(`Connected to ${node.label || "node"}`);
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (drawingConn && drawingConn.fromId !== node.id) {
                          addConnection(drawingConn.fromId, drawingConn.fromPort, node.id);
                          setDrawingConn(null);
                          isConnDraggingRef.current = false;
                          toast.success(`Connected to ${node.label || "node"}`);
                        }
                      }}
                      title={isTargetNode ? "Click or drop to connect" : "Input connection"}
                    >
                      <div
                        style={{
                          width: isTargetNode ? 14 : 11,
                          height: isTargetNode ? 14 : 11,
                          borderRadius: "50%",
                          background: isTargetNode ? "#94a3b8" : "white",
                          border: `1.5px solid ${isTargetNode ? "#64748b" : "#94a3b8"}`,
                          transition: "all 0.15s ease",
                        }}
                        className={isTargetNode ? "ring-2 ring-slate-300 shadow-sm scale-110" : "hover:scale-125"}
                      />
                    </div>
                  )}

                  {/* Card */}
                  {node.type === "empty-branch" ? (
                    (() => {
                      const isElse = Boolean(node.config.isElse || node.config.branchName === "Else");
                      const isCase = Boolean(node.config.isConditionCase);
                      const activeTheme = isElse
                        ? "border-amber-500 bg-amber-50/80 ring-2 ring-amber-300 shadow-md"
                        : isCase
                        ? "border-violet-500 bg-violet-50/80 ring-2 ring-violet-300 shadow-md"
                        : "border-purple-500 bg-purple-50/70 ring-2 ring-purple-300 shadow-md";
                      const defaultTheme = isElse
                        ? "border-amber-300/80 bg-amber-50/20 hover:border-amber-400 hover:bg-amber-50/40 shadow-xs"
                        : isCase
                        ? "border-violet-300/80 bg-violet-50/20 hover:border-violet-400 hover:bg-violet-50/40 shadow-xs"
                        : "border-purple-300/80 bg-purple-50/20 hover:border-purple-400 hover:bg-purple-50/40 shadow-xs";

                      const dotColor = isElse ? "bg-amber-500" : isCase ? "bg-violet-500" : "bg-purple-500";
                      const headerTextColor = isElse ? "text-amber-800" : isCase ? "text-violet-800" : "text-purple-800";
                      const actionTextColor = isElse ? "text-amber-700" : isCase ? "text-violet-700" : "text-purple-700";
                      const iconColor = isElse ? "text-amber-600" : isCase ? "text-violet-600" : "text-purple-600";

                      return (
                        <div
                          className={`rounded-xl border-2 border-dashed p-3 transition-all cursor-pointer select-none ${
                            isSelected || selectedBranchId === node.config.branchId ? activeTheme : defaultTheme
                          }`}
                          style={{ minHeight: NODE_H }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(node.id);
                            setSelectedBranchId(node.config.branchId);
                            toast.info(`Selected ${node.config.branchName || "Branch"}. Click an action from sidebar to add to this branch.`);
                          }}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                              <span className={`text-[11px] font-bold uppercase tracking-wide truncate ${headerTextColor}`}>
                                {isElse ? "Else" : (node.config.branchName || "Branch")}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[9px] text-gray-400 font-medium">(Empty)</span>
                              {!isElse && node.config?.sourceParallelStepId && node.config?.branchId && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveBranch(node.config.sourceParallelStepId, node.config.branchId);
                                  }}
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete branch"
                                  aria-label="Delete branch"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                          {isElse && (
                            <p className="text-[9px] text-amber-600/90 font-medium mb-1 truncate">
                              Runs if no cases match
                            </p>
                          )}
                          <div className={`flex items-center gap-1.5 text-xs font-semibold py-0.5 ${actionTextColor}`}>
                            <Plus className={`w-3.5 h-3.5 ${iconColor}`} />
                            <span className="text-[11px]">Click to add step</span>
                          </div>
                        </div>
                      );
                    })()
                  ) : (() => {
                    const resolvedTriggerType = node.config?.triggerType || activeTriggerItem?.triggerType || triggerType;
                    const crystalTheme = getCrystalNodeTheme(node.type, resolvedTriggerType, node.stepKey);
                    const nodeTitle = isStart
                      ? (node.label || activeTriggerItem?.label || (node.config?.scope === "global" ? "Event Trigger" : `On Entry: ${stageName}`))
                      : isEnd
                      ? "End"
                      : node.label;
                    const subtitleText = getNodeSubtitle(node, effectiveProcesses, stageName, processName, activeTriggerItem);

                    return (
                    <div
                      className={`relative rounded-lg border transition-all select-none overflow-hidden ${crystalTheme.cardSurface} ${
                        isTargetNode
                          ? "ring-1 ring-slate-400 border-slate-400 shadow-md cursor-pointer scale-[1.01]"
                          : isStart
                          ? "cursor-pointer hover:shadow-[0_10px_24px_-6px_rgba(15,23,42,0.14)]"
                          : "cursor-move hover:shadow-[0_10px_24px_-6px_rgba(15,23,42,0.14)]"
                      } ${
                        isSelected ? "ring-1 ring-slate-400 border-slate-400" : ""
                      }`}
                      style={{ minHeight: NODE_H }}
                    >
                      {/* Specular crystal top shine */}
                      <div className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-95" />

                      <div className="px-3.5 py-3 space-y-2.5">
                        {/* Header row: Glossy Orb + Title + Delete */}
                        <div className="flex items-center gap-2.5">
                          <CrystalOrbIcon orbStyle={crystalTheme.orbStyle} size="sm">
                            {isStart ? (
                              getTriggerIconComponent(node.config?.triggerIconKey || activeTriggerItem?.iconKey || triggerIconKey, node.config?.triggerType || activeTriggerItem?.triggerType || triggerType)
                            ) : isEnd ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              getNodeIcon(node.type, node.stepKey)
                            )}
                          </CrystalOrbIcon>

                          <div className="flex-1 min-w-0 flex items-center gap-1.5">
                            <p className="text-[13px] font-bold text-slate-900 truncate leading-tight">
                              {nodeTitle}
                            </p>
                            {node.config?.conditionsEnabled && node.type !== "condition" && (
                              <span
                                title="Conditions are active for this step"
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 leading-none shrink-0"
                              >
                                COND
                              </span>
                            )}
                          </div>

                          {/* Delete btn */}
                          {!isStart && !node.config?.syntheticFor && (!node.config?.autoGenerated || onWorkflowStepsChange) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNode(node.id);
                              }}
                              className="flex-shrink-0 p-1 rounded bg-white text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Delete node"
                              aria-label="Delete node"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Crystal context pill */}
                        <div className="flex items-center justify-between gap-2">
                          {subtitleText && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50/90 border border-slate-200/75 max-w-full min-w-0">
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: crystalTheme.dotColor }}
                              />
                              <span className="text-[11px] font-medium text-slate-700 truncate">
                                {subtitleText}
                              </span>
                            </div>
                          )}
                          {node.type === "parallel" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddBranch(node.id);
                              }}
                              className="w-6 h-6 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200/70 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                              title="Add branch"
                              aria-label="Add branch"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Start node proceed to action hint */}
                      {isStart && !hasChosenTrigger && (
                        <div
                          className="px-3.5 pb-2.5 text-[10px] text-slate-600 hover:text-slate-900 font-semibold cursor-pointer hover:underline flex items-center gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setHasChosenTrigger(true);
                            setOpenActionCategoryId("crm-entities");
                            if (sidebarRef.current) sidebarRef.current.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          <span>+ Proceed to Add Actions →</span>
                        </div>
                      )}
                      {node.type === "parallel" && isSelected && (
                        <div className="px-3.5 pb-2.5 text-[10px] text-violet-600 font-medium">
                          Select a branch below, then click an action from sidebar to add to it →
                        </div>
                      )}
                    </div>
                    );
                  })()}

                  {/* Output ports (bottom) */}
                  {!isEnd && (
                    <div style={{ position: "absolute", bottom: -13, left: 0, width: "100%", height: 26, pointerEvents: "none", zIndex: 20 }}>
                      {ports.map((p, i) => {
                        const isSourceActive = drawingConn?.fromId === node.id && drawingConn?.fromPort === p.port;
                        const isBranchSelected = Boolean(p.branchId && selectedBranchId === p.branchId);
                        const isHighlighted = isSourceActive || isBranchSelected;
                        const leftPct = ports.length === 1 ? "50%" : `${((i + 1) / (ports.length + 1)) * 100}%`;
                        return (
                          <div
                            key={p.port}
                            data-port={p.port}
                            title={p.label ? `${p.label} — Click to select branch or drag to connect an action` : "Click or drag to connect"}
                            style={{
                              position: "absolute",
                              left: leftPct,
                              top: 0,
                              transform: "translateX(-50%)",
                              width: 26,
                              height: 26,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "crosshair",
                              pointerEvents: "auto",
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const portPos = getPortXY(node.id, p.port, false);
                              connDragStartPosRef.current = { x: e.clientX, y: e.clientY };
                              isConnDraggingRef.current = false;
                              setDrawingConn({ fromId: node.id, fromPort: p.port, x: portPos.x, y: portPos.y });
                              setMousePos(portPos);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const wasSamePort = drawingConn?.fromId === node.id && drawingConn?.fromPort === p.port;
                              if (p.branchId) {
                                setSelectedBranchId(p.branchId);
                                setSelectedId(p.branchId);
                                if (wasSamePort && isBranchSelected) {
                                  setDrawingConn(null);
                                }
                                toast.info(`Selected ${p.label}. Click an action from sidebar or drag to connect.`);
                              } else {
                                setSelectedId(node.id);
                                const stepCtx = findStepInTree(workflowSteps, node.id);
                                if (stepCtx?.parentBranch) {
                                  setSelectedBranchId(stepCtx.parentBranch.id);
                                } else {
                                  setSelectedBranchId(null);
                                }
                                if (wasSamePort) {
                                  setDrawingConn(null);
                                }
                              }
                            }}
                          >
                            <div
                              style={{
                                width: isHighlighted ? 13 : 11,
                                height: isHighlighted ? 13 : 11,
                                borderRadius: "50%",
                                background: isHighlighted ? "#1e293b" : "white",
                                border: `1.5px solid ${isHighlighted ? "#0f172a" : "#94a3b8"}`,
                                transition: "all 0.15s ease",
                              }}
                              className={isHighlighted ? "ring-2 ring-slate-300 shadow-sm scale-110" : "hover:scale-125 hover:border-slate-600"}
                            />
                            {p.label && (
                              <span
                                style={{
                                  position: "absolute",
                                  top: 23,
                                  left: "50%",
                                  transform: "translateX(-50%)",
                                  whiteSpace: "nowrap",
                                  pointerEvents: "none",
                                }}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-semibold leading-none border shadow-2xs transition-colors ${
                                  isHighlighted
                                    ? "bg-slate-900 text-white border-slate-900"
                                    : "bg-white/95 text-slate-600 border-slate-200/90"
                                }`}
                              >
                                {p.label}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Empty state hint */}
          {nodes.length === 1 && (
            <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none">
              <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl shadow-sm text-xs text-muted-foreground">
                <Plus className="w-3.5 h-3.5" />
                Click a node from the left panel to add it to the canvas
              </div>
            </div>
          )}

          {/* Help text for connections */}
          {nodes.length > 1 && connections.length === 0 && (
            <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none">
              <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl shadow-sm text-xs text-muted-foreground">
                <ArrowRight className="w-3.5 h-3.5" />
                Drag from a node's bottom port to another node's top port to connect them
              </div>
            </div>
          )}
        </div>
      </div>

      {/* StepDetailDrawer for step configuration & Fallback Config Drawer */}
      {(() => {
        const isOverviewNode = configNode?.stepKey === "automation_overview" || configNode?.type === "overview" || configNode?.id === "automation_overview";
        const isTriggerNode = configNode?.type === "start";
        const targetStepId = configNode ? (configNode.config?.sourceStepId ?? configNode.config?.syntheticFor ?? configNode.id) : null;
        const startNode = nodes.find((n) => n.id === "start" || n.type === "start");
        const resolvedTriggerType = configNode?.config?.triggerType || startNode?.config?.triggerType || activeTriggerItem?.triggerType || triggerType || "process";
        const resolvedTriggerEvent = configNode?.config?.selectedEvent || configNode?.config?.triggerEvent || startNode?.config?.triggerEvent || activeTriggerItem?.triggerEvent || triggerEvent || "process.created";
        const targetStep = isOverviewNode
          ? {
              id: "automation_overview",
              name: "Automation Overview",
              description: "Configure name, description, status, and admin scoping rules.",
              iconKey: "sliders",
              stepKey: "automation_overview",
              trigger: "stage",
              executionType: "wait" as const,
              delayValue: 0,
              delayUnit: "Minute",
              params: {
                name: automationName,
                automationName: automationName,
                description: automationDescription,
                automationDescription: automationDescription,
                status: automationStatus,
                automationStatus: automationStatus,
                isAdmin: isAdmin,
                scopingRules: scopingRules,
                ...(configNode.config || {}),
              },
            }
          : isTriggerNode
          ? {
              id: configNode.id,
              name: configNode.label || "Trigger Configuration",
              description: configNode.config?.triggerDescription || "Configure conditions and parameters for when this trigger fires",
              iconKey: configNode.config?.triggerIconKey || "zap",
              stepKey: "trigger_config",
              trigger: "stage",
              executionType: "wait" as const,
              delayValue: 0,
              delayUnit: "Minute",
              params: {
                scope: scope || "stage",
                ...(configNode.config || {}),
              },
            }
          : (targetStepId ? (findStepInTree(workflowSteps, targetStepId)?.step || workflowSteps.find(s => s.id === targetStepId) || null) : null);
        const isStepDrawerOpen = Boolean(configNode && targetStep);

        return (
          <>
            {/* ── RIGHT: Config Drawer (Fallback for non-step nodes) ───────────────── */}
            {configNode && !targetStep && (
              <div className="w-72 bg-card border-l border-border flex flex-col flex-shrink-0 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
                  <div>
                    <p className="text-sm font-semibold">Configure Node</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{configNode.label}</p>
                  </div>
                  <button onClick={() => setConfigNode(null)} className="p-1 rounded hover:bg-muted transition-colors">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Node label */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Node Label</label>
                    <input
                      value={configNode.label}
                      onChange={(e) => setConfigNode((prev) => prev ? { ...prev, label: e.target.value } : prev)}
                      className="w-full px-3 py-2 bg-input-background border border-input rounded-xl text-sm"
                    />
                  </div>

                  <p className="text-sm text-muted-foreground">No configuration needed.</p>
                </div>

                {/* Footer */}
                <div className="flex gap-2 p-4 border-t border-border flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={() => setConfigNode(null)} className="flex-1">
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={saveConfig} className="flex-1">
                    Apply
                  </Button>
                </div>
              </div>
            )}

            {/* StepDetailDrawer for step configuration */}
            <StepDetailDrawer
              isOpen={isStepDrawerOpen}
              step={targetStep}
              isCreatingNewStep={false}
              stepAllowedTriggers={stepAllowedTriggers}
              processes={effectiveProcesses}
              scopingRules={scopingRules}
              sourceProcessId={startNode?.config?.triggerProcessId || startNode?.config?.processId || (currentProcessId && currentProcessId !== "all" ? currentProcessId : undefined)}
              sourceProcessName={startNode?.config?.triggerProcessName || startNode?.config?.processName || processName}
              stepTrigger={drawerTrigger}
              onStepTriggerChange={setDrawerTrigger}
              executionType={drawerExecType}
              onExecutionTypeChange={setDrawerExecType}
              delayValue={drawerDelayValue}
              onDelayValueChange={setDrawerDelayValue}
              delayUnit={drawerDelayUnit}
              onDelayUnitChange={setDrawerDelayUnit}
              connectAfterId={drawerConnectAfterId}
              onConnectAfterIdChange={setDrawerConnectAfterId}
              availablePredecessors={buildAvailablePredecessors(workflowSteps, drawerTrigger, targetStepId || undefined)}
              params={{
                triggerType: resolvedTriggerType,
                category: resolvedTriggerType,
                triggerEvent: resolvedTriggerEvent,
                selectedEvent: resolvedTriggerEvent,
                ...(configNode?.config ?? {}),
              }}
              onParamsChange={patchConfig}
              onBack={() => setConfigNode(null)}
              onClose={() => setConfigNode(null)}
              onSave={saveConfig}
              onlyParameters={true}
              isAdmin={isAdmin}
            />
          </>
        );
      })()}

      {/* Variable Selector Modal */}
      <VariableSelectorModal
        isOpen={showVariableModal}
        onClose={() => { setShowVariableModal(false); setActiveVarSetter(null); }}
        onInsert={handleInsertVar}
      />

      {/* How It Works — Flow Builder */}
      {!hideHowItWorks && (
        <HowItWorksModal
        isOpen={showFlowBuilderHelp}
        onClose={() => setShowFlowBuilderHelp(false)}
        title="How Flow Builder Works"
        summary="Flow Builder is a visual map of every automation step in this stage — On Stage Entry, In Call, and Post Call — laid out as connected nodes so you can see and edit the order at a glance."
        bullets={[
          "Each lane (On Stage Entry / In Call / Post Call) shows steps in the order they run",
          "Drag a node's bottom port to another node's top port to change what runs next",
          "Select a step, then add a Condition, Wait, or Parallel Branch from the left panel to modify it",
          "Double-click any node to open its full configuration",
          "Nodes generated from your Automation tab steps sync both ways — edit here or there",
        ]}
        guideUrl="/guide/process-settings#flow-builder-canvas"
      />
      )}
    </div>
  );
}
