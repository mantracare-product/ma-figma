import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  GitBranch, Clock, Split, XCircle, Phone, User, PhoneForwarded, PhoneOff,
  Eye, Hash, Calendar, Mail, MessageSquare, Settings2, ArrowRight, Workflow,
  Zap, Webhook, Search, ChevronDown, ChevronRight, Plus, Trash2, X,
  ZoomIn, ZoomOut, Maximize2, Undo2, Redo2, CheckCircle2, AlertCircle,
  Code2, Activity, Layers, PhoneCall, Save, AlignCenter, Hand, Sparkles,
  CreditCard, FileText, Receipt, ShieldCheck, Briefcase, Sliders,
} from "lucide-react";
import { Button } from "../ui/Button";
import VariableSelectorModal from "./VariableSelectorModal";
import type { WorkflowStep } from "../../types/workflow";
import {
  isParallelStep,
  createParallelStep,
  appendStepToTree,
  deleteStepFromTree,
  updateStepInTree,
  addBranchToStep,
  removeBranchFromStep,
  findStepInTree,
  findBranchInTree,
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
  | "start" | "end"
  | "condition" | "wait" | "parallel" | "empty-branch"
  | "call-transfer" | "call-transfer-human" | "call-transfer-ai" | "call-hangup"
  | "fetch-availability" | "fetch-field-value"
  | "send-email" | "send-sms" | "send-whatsapp"
  | "field-update" | "assign-responsible" | "move-stage" | "move-process" | "move-new-process" | "update-stage"
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
      { type: "parallel" as NodeType, label: "Parallel Branches", icon: <Layers className="w-4 h-4" />, desc: "Run two automations simultaneously in parallel" },
      { type: "update-stage" as NodeType, label: "Update to stage", icon: <Workflow className="w-4 h-4" />, desc: "Update stage for process, appointment, or invoice" },
      { type: "end" as NodeType, label: "End Workflow", icon: <XCircle className="w-4 h-4" />, desc: "Terminate workflow execution" },
    ],
  },
  {
    id: "records",
    label: "Records & Billing",
    icon: <CreditCard className="w-3.5 h-3.5" />,
    nodes: [
      { type: "generate-invoice" as NodeType, label: "Generate Invoice", icon: <FileText className="w-4 h-4" />, desc: "Generate draft invoice for appointment (strictly idempotent)" },
      { type: "generate-document" as NodeType, label: "Generate Document", icon: <FileText className="w-4 h-4" />, desc: "Generate document from template for client, process, appointment, or invoice" },
      { type: "send-payment" as NodeType, label: "Send Payment", icon: <CreditCard className="w-4 h-4" />, desc: "Send payment link or invoice checkout request" },
      { type: "send-invoice" as NodeType, label: "Send Invoice", icon: <FileText className="w-4 h-4" />, desc: "Send invoice link to client via preferred channel" },
    ],
  },
  {
    id: "call",
    label: "Caller Engagement",
    icon: <Phone className="w-3.5 h-3.5" />,
    nodes: [
      { type: "call-transfer" as NodeType, label: "Transfer Call", icon: <PhoneCall className="w-4 h-4" />, desc: "Transfer active call to a human agent or queue" },
      { type: "call-hangup" as NodeType, label: "Call Hangup", icon: <PhoneOff className="w-4 h-4" />, desc: "End the active call" },
      { type: "idle-messages" as NodeType, label: "Idle Messages", icon: <MessageSquare className="w-4 h-4" />, desc: "Speak a message if caller remains idle" },
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
      { type: "field-update" as NodeType, label: "Field Update", icon: <Settings2 className="w-4 h-4" />, desc: "Update record attributes or custom field values" },
      { type: "assign-responsible" as NodeType, label: "Assign Responsible", icon: <User className="w-4 h-4" />, desc: "Assign a team member to handle this record" },
    ],
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: <Webhook className="w-3.5 h-3.5" />,
    nodes: [
      { type: "webhook" as NodeType, label: "Webhook", icon: <Webhook className="w-4 h-4" />, desc: "Send data payload via webhook" },
      { type: "api" as NodeType, label: "API", icon: <Zap className="w-4 h-4" />, desc: "Execute external HTTP REST API request" },
    ],
  },
];

export const getTriggerCatalogItems = (scope: "stage" | "global", stageName: string): TriggerCatalogItem[] => {
  if (scope === "global") {
    return [
      {
        id: "trig-global-stage-entry",
        triggerType: "stage",
        triggerEvent: "stage.entered",
        label: "Stage Entered",
        desc: "Fires when a record moves into a selected stage",
        icon: <GitBranch className="w-4 h-4" />,
        iconKey: "gitbranch",
      },
      {
        id: "trig-global-stage-exit",
        triggerType: "stage",
        triggerEvent: "stage.exited",
        label: "Stage Exited",
        desc: "Fires when a record moves out of a selected stage",
        icon: <GitBranch className="w-4 h-4" />,
        iconKey: "gitbranch",
      },
      {
        id: "trig-global-field-update",
        triggerType: "field_update",
        triggerEvent: "field.updated",
        label: "Field Update",
        desc: "Fires when monitored fields on a record are updated",
        icon: <Sliders className="w-4 h-4" />,
        iconKey: "sliders",
      },
      {
        id: "trig-client-created",
        triggerType: "client",
        triggerEvent: "client.created",
        label: "Client Created",
        desc: "Fires when a new client record is added",
        icon: <User className="w-4 h-4" />,
        iconKey: "user",
      },
      {
        id: "trig-client-updated",
        triggerType: "client",
        triggerEvent: "client.updated",
        label: "Client Updated",
        desc: "Fires when client details are modified",
        icon: <User className="w-4 h-4" />,
        iconKey: "user",
      },
      {
        id: "trig-client-product-assigned",
        triggerType: "client",
        triggerEvent: "client.product_assigned",
        label: "Assign Product",
        desc: "Fires when a product or service is assigned to a client",
        icon: <Briefcase className="w-4 h-4" />,
        iconKey: "briefcase",
      },
      {
        id: "trig-appt-booked",
        triggerType: "appointment",
        triggerEvent: "appointment.booked",
        label: "Appointment Booked",
        desc: "Fires when a time slot is confirmed",
        icon: <Calendar className="w-4 h-4" />,
        iconKey: "calendar",
      },
      {
        id: "trig-appt-rescheduled",
        triggerType: "appointment",
        triggerEvent: "appointment.rescheduled",
        label: "Appointment Rescheduled",
        desc: "Fires when appointment time is changed",
        icon: <Calendar className="w-4 h-4" />,
        iconKey: "calendar",
      },
      {
        id: "trig-appt-cancelled",
        triggerType: "appointment",
        triggerEvent: "appointment.cancelled",
        label: "Appointment Cancelled",
        desc: "Fires when an appointment is cancelled",
        icon: <Calendar className="w-4 h-4" />,
        iconKey: "calendar",
      },
      {
        id: "trig-appt-completed",
        triggerType: "appointment",
        triggerEvent: "appointment.completed",
        label: "Appointment Completed",
        desc: "Fires when an appointment or consultation concludes successfully",
        icon: <Calendar className="w-4 h-4" />,
        iconKey: "calendar",
      },
      {
        id: "trig-inv-created",
        triggerType: "invoice",
        triggerEvent: "invoice.created",
        label: "Invoice Created",
        desc: "Fires when a billing invoice is drafted",
        icon: <Receipt className="w-4 h-4" />,
        iconKey: "receipt",
      },
      {
        id: "trig-inv-paid",
        triggerType: "invoice",
        triggerEvent: "invoice.paid",
        label: "Invoice Paid",
        desc: "Fires when invoice payment is collected",
        icon: <CreditCard className="w-4 h-4" />,
        iconKey: "receipt",
      },
    ];
  } else {
    // Stage Scope — Only two triggers: On Stage Enter & On Stage Exit
    return [
      {
        id: "trig-stage-entry",
        triggerType: "stage",
        triggerEvent: "stage.entry",
        label: `On Entry: ${stageName}`,
        desc: `Fires when record moves into "${stageName}"`,
        icon: <GitBranch className="w-4 h-4" />,
        iconKey: "gitbranch",
      },
      {
        id: "trig-stage-exit",
        triggerType: "stage",
        triggerEvent: "stage.exit",
        label: `On Exit: ${stageName}`,
        desc: `Fires when record moves out of "${stageName}"`,
        icon: <GitBranch className="w-4 h-4" />,
        iconKey: "gitbranch",
      },
    ];
  }
};

// ─── Node visual config ───────────────────────────────────────────────────────

const NODE_STYLE: Record<string, { bg: string; border: string; text: string; icon?: string }> = {
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

function getNodeIcon(type: NodeType) {
  if (type === "generate-invoice") return <FileText className="w-4 h-4" />;
  if (type === "generate-document") return <FileText className="w-4 h-4" />;
  if (type === "send-payment") return <CreditCard className="w-4 h-4" />;
  if (type === "send-invoice") return <FileText className="w-4 h-4" />;
  const all = NODE_CATEGORIES.flatMap((c) => c.nodes);
  return all.find((n) => n.type === type)?.icon ?? <GitBranch className="w-4 h-4" />;
}

function getNodeLabel(type: NodeType) {
  if (type === "generate-document") return "Generate Document";
  const all = NODE_CATEGORIES.flatMap((c) => c.nodes);
  return all.find((n) => n.type === type)?.label ?? type;
}

function getTriggerIconComponent(triggerIconKey?: string, triggerType?: string) {
  if (triggerIconKey === "calendar" || triggerType === "appointment") return <Calendar className="w-4 h-4" />;
  if (triggerIconKey === "receipt" || triggerType === "invoice") return <Receipt className="w-4 h-4" />;
  if (triggerIconKey === "briefcase" || triggerIconKey === "product") return <Briefcase className="w-4 h-4" />;
  if (triggerIconKey === "creditcard") return <CreditCard className="w-4 h-4" />;
  if (triggerIconKey === "phone" || triggerType === "call") return <Phone className="w-4 h-4" />;
  if (triggerIconKey === "user" || triggerType === "client") return <User className="w-4 h-4" />;
  if (triggerIconKey === "shieldcheck" || triggerType === "insurance") return <ShieldCheck className="w-4 h-4" />;
  if (triggerIconKey === "filetext" || triggerType === "document") return <FileText className="w-4 h-4" />;
  if (triggerIconKey === "webhook" || triggerType === "webhook") return <Webhook className="w-4 h-4" />;
  if (triggerIconKey === "zap" || triggerType === "zap") return <Zap className="w-4 h-4" />;
  return <GitBranch className="w-4 h-4" />;
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
}: FlowBuilderTabProps) {
  const effectiveProcesses = (processes && processes.length > 0) ? processes : getStoredProcesses();
  // Drawer execution/timing controls (seeded on openConfig)
  const [drawerTrigger, setDrawerTrigger] = useState<"stage" | "incall" | "inchat" | "postcall">("stage");
  const [drawerExecType, setDrawerExecType] = useState<"wait" | "parallel">("wait");
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
    return scope === "global" ? "stage.entered" : "stage.entry";
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
        triggerType: activeTriggerItem?.triggerType || triggerType || (scope === "global" ? "stage" : "stage"),
        triggerEvent: activeTriggerItem?.triggerEvent || triggerEvent || (scope === "global" ? "stage.entered" : "stage.entry"),
        triggerLabel: activeTriggerItem?.label || triggerLabel || defaultStartLabel,
        triggerDescription: activeTriggerItem?.desc || triggerDescription,
        triggerIconKey: activeTriggerItem?.iconKey || triggerIconKey,
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
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [configNode, setConfigNode] = useState<FlowNode | null>(null);
  const [showVariableModal, setShowVariableModal] = useState(false);
  const [activeVarSetter, setActiveVarSetter] = useState<((v: string) => void) | null>(null);
  const [showFlowBuilderHelp, setShowFlowBuilderHelp] = useState(false);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const NODE_W = 200;
  const NODE_H = 70; // approximate, condition nodes are taller

  const BASE_X = 300;
  const BASE_Y = 220;
  const LANE_X_SPACING = 280;
  const NODE_Y_SPACING = 140;

  const focusTriggersCategory = () => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      next.delete("triggers");
      return next;
    });
    if (sidebarRef.current) {
      sidebarRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const selectTrigger = (item: TriggerCatalogItem) => {
    setActiveTriggerEvent(item.triggerEvent);
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === "start") {
          return {
            ...n,
            label: item.label,
            config: {
              ...n.config,
              triggerType: item.triggerType,
              triggerEvent: item.triggerEvent,
              triggerLabel: item.label,
              triggerDescription: item.desc,
              triggerIconKey: item.iconKey,
            },
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
          type: n.type as NodeType,
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

  const addNode = (type: NodeType) => {
    if (type === "parallel") {
      addParallelBranchNode();
      return;
    }

    // Condition node creates a dedicated condition step on the canvas with its own rule configuration
    if (type === "condition") {
      const stepKey = "condition";
      const catalogEntry = NODE_CATEGORIES
        .flatMap(c => c.nodes)
        .find(n => n.type === type);

      const newStepId = `${stepKey}-${Date.now()}`;
      const newStep: WorkflowStep = {
        id: newStepId,
        name: getNodeLabel(type),
        description: catalogEntry?.desc ?? "Gate flow execution behind field conditions",
        iconKey: "split",
        stepKey,
        trigger: "stage",
        executionType: "wait",
        delayValue: 0,
        delayUnit: "Minute",
        params: {
          conditionRules: [],
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
            sourceStepId: newStepId,
            autoGenerated: true,
          },
        });
      }, 50);
      return;
    }

    if (type === "wait") {
      addLogicToSelectedNode(type);
      return;
    }

    const stepKey = NODE_TYPE_TO_STEP_KEY[type] || "step";
    if (stepKey && onWorkflowStepsChange) {
      const allowed: Array<string> = stepAllowedTriggers[stepKey] ?? ["stage", "incall", "inchat", "postcall"];
      const catalogEntry = NODE_CATEGORIES
        .flatMap(c => c.nodes)
        .find(n => n.type === type);

      const newStepId = `${stepKey}-${Date.now()}`;
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
      setSelectedBranchId(null);
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
    if (node.type === "condition") return [{ port: "default", label: "" }];
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

    // Check if either node belongs to a branch and prohibit cross-branch connections
    const fromStep = findStepInTree(workflowSteps, fromId);
    const toStep = findStepInTree(workflowSteps, toId);
    if (fromStep && toStep) {
      if (fromStep.parentBranch?.id !== toStep.parentBranch?.id) {
        toast.error("Cannot connect across branches. Branch steps run independently.");
        return;
      }
    }

    if (fromPort.startsWith("branch-")) {
      const branchIdx = parseInt(fromPort.replace("branch-", ""), 10) || 0;
      const pStep = findStepInTree(workflowSteps, fromId)?.step;
      if (pStep && pStep.branches && pStep.branches[branchIdx]) {
        const targetBranch = pStep.branches[branchIdx];
        setSelectedBranchId(targetBranch.id);
        toast.info(`Selected ${targetBranch.name || `Branch ${branchIdx + 1}`}.`);
        return;
      }
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
    setNodes(layout.nodes.map((n) => ({ ...n, type: n.type as NodeType })));
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

  // ── Config drawer ─────────────────────────────────────────────────────────────

  const openConfig = (node: FlowNode) => {
    if (node.type === "start") {
      const activeItem = allTriggers.find(t =>
        t.triggerEvent === (node.config?.selectedEvent || node.config?.triggerEvent || activeTriggerEvent) ||
        (t.triggerEvent === "stage.entered" && (node.config?.selectedEvent || node.config?.triggerEvent || activeTriggerEvent) === "stage.entry") ||
        (t.triggerEvent === "stage.exited" && (node.config?.selectedEvent || node.config?.triggerEvent || activeTriggerEvent) === "stage.exit") ||
        (t.triggerEvent === "stage.entry" && (node.config?.selectedEvent || node.config?.triggerEvent || activeTriggerEvent) === "stage.entered") ||
        (t.triggerEvent === "stage.exit" && (node.config?.selectedEvent || node.config?.triggerEvent || activeTriggerEvent) === "stage.exited")
      ) || allTriggers[0];
      const trigCategory = node.config?.category || node.config?.triggerType || activeItem?.triggerType || (scope === "global" ? (node.config?.triggerEvent?.startsWith("stage") ? "stage" : node.config?.triggerEvent === "field.updated" ? "field_update" : "client") : "stage");
      const trigEvent = node.config?.selectedEvent || node.config?.triggerEvent || activeItem?.triggerEvent || (
        trigCategory === "stage" ? (scope === "stage" ? "stage.entry" : "stage.entered") :
        trigCategory === "field_update" ? "field.updated" :
        trigCategory === "client" ? "client.created" :
        trigCategory === "invoice" ? "invoice.created" :
        "appointment.booked"
      );
      const trigItem = allTriggers.find(t => t.triggerEvent === trigEvent) || activeItem;
      const trigLabel = node.config?.triggerLabel || trigItem?.label || node.label || "Trigger";
      const trigDesc = node.config?.triggerDescription || trigItem?.desc || "";
      const trigIconKey = node.config?.triggerIconKey || trigItem?.iconKey || "zap";

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
          triggerProcessId: "all",
          triggerStageId: "all",
          monitoredFields: [],
          matchLogic: "any",
          conditionsEnabled: false,
          conditions: [],
          fieldConditions: [],
          ...(node.config || {}),
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
      setDrawerTrigger((realStep.trigger ?? (node.config?.lane ?? "stage")) as "stage" | "incall" | "postcall");
      setDrawerExecType((realStep.executionType ?? "wait") as "wait" | "parallel");
      setDrawerDelayValue(realStep.delayValue ?? 0);
      setDrawerDelayUnit(realStep.delayUnit ?? "Minute");
      setDrawerConnectAfterId(realStep.connectAfterId);
      setConfigNode({
        ...realNode,
        stepKey: realStep.stepKey,
        config: {
          ...(realStep.params ?? {}),
          ...(realNode.config ?? {}),
          sourceStepId: realStep.id,
          autoGenerated: true,
        }
      });
    } else {
      setConfigNode({ ...node });
    }
  };

  const saveConfig = () => {
    if (!configNode) return;

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
      updateNode(configNode.id, {
        label: newLabel,
        config: {
          ...configNode.config,
          triggerEvent: selectedEvent,
          triggerType: catalogItem?.triggerType || trigCategory || (selectedEvent?.startsWith("stage") ? "stage" : "client"),
          triggerLabel: newLabel,
          triggerDescription: newDesc,
          triggerIconKey: newIconKey,
        }
      });
      if (onTriggerChange) {
        onTriggerChange({
          type: (catalogItem?.triggerType || trigCategory || (selectedEvent?.startsWith("stage") ? "stage" : "client")) as any,
          event: selectedEvent || "stage.entered",
          label: newLabel,
          description: newDesc,
          iconKey: newIconKey,
          params: configNode.config || {},
        });
      }
      toast.success(`Trigger configured: "${newLabel}"`);
      setConfigNode(null);
      return;
    }

    updateNode(configNode.id, { label: configNode.label, config: configNode.config });
    // Sync back to WorkflowStep (trigger + executionType + delay + connectAfterId + params)
    const targetStepId = (configNode.config?.sourceStepId || configNode.config?.syntheticFor || configNode.id) as string;
    const stepCtx = findStepInTree(workflowSteps, targetStepId);

    if (stepCtx && onWorkflowStepsChange) {
      const { autoGenerated: _a, sourceStepId: _s, lane: _l, syntheticFor: _syn, ...params } = configNode.config || {};
      const finalConnectAfterId = drawerTrigger !== "incall" && drawerExecType === "wait" ? drawerConnectAfterId : undefined;
      const updatedSteps = updateStepInTree(workflowSteps, targetStepId, {
        name: configNode.label || stepCtx.step.name,
        trigger: drawerTrigger,
        executionType: drawerExecType,
        delayValue: drawerDelayValue,
        delayUnit: drawerDelayUnit,
        connectAfterId: finalConnectAfterId,
        params: {
          ...(stepCtx.step.params ?? {}),
          ...params,
        }
      });
      onWorkflowStepsChange(updatedSteps);
      toast.success(`Action "${configNode.label || stepCtx.step.name}" updated`);
    }
    setConfigNode(null);
  };

  const patchConfig = (patch: Record<string, any>) => {
    if (!configNode) return;
    setConfigNode((prev) => prev ? { ...prev, config: { ...prev.config, ...patch } } : prev);
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

      {/* ── LEFT: Node Library ─────────────────────────────────────────────── */}
      <div className="w-60 bg-card border-r border-border flex flex-col flex-shrink-0 overflow-hidden">
        {/* Search */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add a Step</span>
            <InfoTooltip text="Click any trigger below to set the starting point of this workflow. Click any action step to add it to the workflow." />
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search steps & triggers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-input-background border border-input rounded-lg text-xs"
            />
          </div>
        </div>

        {/* Category list */}
        <div ref={sidebarRef} className="flex-1 overflow-y-auto">
          {/* Triggers Category List (Sidebar shows only categories) */}
          {(() => {
            const triggerCategories: Array<{
              id: string;
              type: string;
              label: string;
              desc: string;
              icon: React.ReactNode;
              defaultTrigger: TriggerCatalogItem;
            }> = scope === "stage"
              ? [
                  {
                    id: "stage",
                    type: "stage",
                    label: "Stage Triggers",
                    desc: "On stage entry or exit",
                    icon: <GitBranch className="w-3.5 h-3.5" />,
                    defaultTrigger: allTriggers.find((t) => t.triggerType === "stage") || allTriggers[0],
                  },
                ]
              : [
                  {
                    id: "stage",
                    type: "stage",
                    label: "Stage Triggers",
                    desc: "Stage entered or exited",
                    icon: <GitBranch className="w-3.5 h-3.5" />,
                    defaultTrigger: allTriggers.find((t) => t.triggerType === "stage") || allTriggers[0],
                  },
                  {
                    id: "field_update",
                    type: "field_update",
                    label: "Field Update Triggers",
                    desc: "Monitored field value updates",
                    icon: <Sliders className="w-3.5 h-3.5" />,
                    defaultTrigger: allTriggers.find((t) => t.triggerType === "field_update") || allTriggers[0],
                  },
                  {
                    id: "client",
                    type: "client",
                    label: "Client Triggers",
                    desc: "Created, updated, product assigned",
                    icon: <User className="w-3.5 h-3.5" />,
                    defaultTrigger: allTriggers.find((t) => t.triggerType === "client") || allTriggers[0],
                  },
                  {
                    id: "appointment",
                    type: "appointment",
                    label: "Appointment Triggers",
                    desc: "Booked, rescheduled, cancelled",
                    icon: <Calendar className="w-3.5 h-3.5" />,
                    defaultTrigger: allTriggers.find((t) => t.triggerType === "appointment") || allTriggers[0],
                  },
                  {
                    id: "invoice",
                    type: "invoice",
                    label: "Invoice Triggers",
                    desc: "Invoice created or paid",
                    icon: <Receipt className="w-3.5 h-3.5" />,
                    defaultTrigger: allTriggers.find((t) => t.triggerType === "invoice") || allTriggers[0],
                  },
                ];

            return (
              <div className="border-b border-border/60">
                <button
                  type="button"
                  onClick={() => setCollapsedCats((s) => {
                    const n = new Set(s);
                    n.has("triggers") ? n.delete("triggers") : n.add("triggers");
                    return n;
                  })}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Triggers</span>
                  </div>
                  {collapsedCats.has("triggers")
                    ? <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                </button>

                {!collapsedCats.has("triggers") && (
                  <div className="pb-2 px-2 space-y-1.5">
                    {triggerCategories.map((cat) => {
                      const isActiveCategory = activeTriggerItem?.triggerType === cat.type;
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
                          className={`w-full text-left flex items-start gap-2.5 p-2 rounded-xl border transition-all cursor-pointer ${
                            isActiveCategory
                              ? "bg-primary/10 border-primary/40 text-primary shadow-2xs"
                              : "bg-card border-border/60 hover:bg-muted/40 hover:border-border text-foreground/90"
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${
                            isActiveCategory
                              ? "bg-primary/20 border-primary/30 text-primary"
                              : "bg-muted/50 border-border/40 text-muted-foreground"
                          }`}>
                            {cat.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <p className={`text-xs font-semibold truncate ${isActiveCategory ? "text-primary" : "text-foreground"}`}>
                                {cat.label}
                              </p>
                              {isActiveCategory && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary leading-none">
                                  Selected
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                              {cat.desc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Action Categories */}
          {filteredCats.map((cat) => {
            const collapsed = collapsedCats.has(cat.id);
            return (
              <div key={cat.id} className="border-b border-border/60">
                <button
                  type="button"
                  onClick={() => setCollapsedCats((s) => {
                    const n = new Set(s);
                    n.has(cat.id) ? n.delete(cat.id) : n.add(cat.id);
                    return n;
                  })}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {cat.icon}
                    {cat.label}
                  </div>
                  {collapsed
                    ? <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                </button>

                {!collapsed && (
                  <div className="pb-2 px-2 space-y-1">
                    {cat.nodes.map((node) => (
                      <button
                        key={node.type}
                        type="button"
                        onClick={() => addNode(node.type)}
                        className="w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-primary/5 hover:text-primary transition-colors group cursor-pointer"
                      >
                        <span className="flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors">
                          {node.icon}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{node.label}</p>
                          <p className="text-[10px] text-muted-foreground truncate leading-tight">{node.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CENTER: Canvas ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card flex-shrink-0">
          {/* Context badges */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={focusTriggersCategory}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-primary/10 hover:bg-primary/15 text-primary border border-primary/20 rounded-lg font-medium cursor-pointer transition-colors"
              title="Click to view and choose triggers in left sidebar"
            >
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span>Trigger: {activeTriggerItem?.label || (isGlobalScope ? (triggerLabel || "Select Trigger") : `On Entry: ${stageName}`)}</span>
            </button>
            {!isGlobalScope && (
              <>
                <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-lg font-medium">
                  🏷 {processName}
                </span>
                <span className="text-xs px-2 py-1 bg-secondary/10 text-secondary rounded-lg font-medium">
                  📍 {stageName}
                </span>
              </>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            <button onClick={undo} disabled={!history.length} title="Undo" className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors">
              <Undo2 className="w-4 h-4" />
            </button>
            <button onClick={redo} disabled={!future.length} title="Redo" className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors">
              <Redo2 className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-border mx-1" />
            <button onClick={() => setZoom((z) => Math.min(2, z * 1.2))} title="Zoom In" className="p-1.5 rounded hover:bg-muted transition-colors">
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.max(0.25, z * 0.8))} title="Zoom Out" className="p-1.5 rounded hover:bg-muted transition-colors">
              <ZoomOut className="w-4 h-4" />
            </button>
            <button onClick={fitToScreen} title="Fit to Screen" className="p-1.5 rounded hover:bg-muted transition-colors">
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={tidyUpFlow}
              title="Tidy up the flow layout"
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-secondary/80 hover:bg-secondary text-secondary-foreground transition-all shadow-xs border border-border cursor-pointer hover:border-primary/50"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Tidy Up</span>
            </button>
            <button
              onClick={() => setIsHandToolActive(!isHandToolActive)}
              title="Hand Tool (Space to temporarily activate)"
              className={`p-1.5 rounded transition-colors ${
                isHandToolActive
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted text-muted-foreground"
              }`}
            >
              <Hand className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-border mx-1" />
            <HowItWorksButton label="How Flow Builder Works" onClick={() => setShowFlowBuilderHelp(true)} />
            <Button
              variant="primary"
              size="sm"
              onClick={onSave}
              className="h-7 text-xs cursor-pointer"
            >
              <Save className="w-3 h-3 mr-1" />
              Save
            </Button>
          </div>
        </div>

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
                const color = PORT_COLOR[conn.fromPort] || "#6366f1";
                const label = PORT_LABEL[conn.fromPort] || "";
                const midX = (from.x + to.x) / 2;
                const midY = (from.y + to.y) / 2;
                const isHovered = hoveredConnId === conn.id;
                return (
                  <g key={conn.id}>
                    <path
                      d={bezierPath(from.x, from.y, to.x, to.y)}
                      fill="none"
                      stroke={isHovered ? "#8b5cf6" : color}
                      strokeWidth={isHovered ? 3 : 2}
                      strokeOpacity={isHovered ? 1 : 0.75}
                      markerEnd="url(#arrow)"
                    />
                    {label && (
                      <text x={midX} y={midY - 14} textAnchor="middle" fontSize={9} fontWeight="600" fill={color}>
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
                  <path d="M0,0 L0,6 L8,3 z" fill="#6366f1" />
                </marker>
              </defs>

              {/* Drawing connection preview */}
              {drawingConn && (
                <path
                  d={bezierPath(drawingConn.x, drawingConn.y, mousePos.x, mousePos.y)}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  opacity={0.6}
                />
              )}
            </svg>

            {/* Connection Actions: [+] to insert node between, [Trash] to delete connection only */}
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
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border shadow-sm transition-all backdrop-blur-md ${
                    isHovered
                      ? "bg-card border-primary ring-2 ring-primary/25 shadow-md scale-110"
                      : "bg-card/95 border-border hover:border-primary/50"
                  }`}>
                    {/* Plus button: Insert step between */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInsertBetweenConn({ conn, x: midX, y: midY });
                        setInsertSearch("");
                      }}
                      className="w-5 h-5 flex items-center justify-center rounded-full text-primary hover:bg-primary/15 transition-colors cursor-pointer"
                      title="Add a node between these steps (+)"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    <span className="w-px h-3 bg-border/80" />

                    {/* Delete connection button: deletes connection only, keeping both nodes */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConnection(conn.id);
                      }}
                      className="w-5 h-5 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
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
                    if (node.type !== "empty-branch") {
                      openConfig(node);
                    }
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    openConfig(node);
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
                          width: isTargetNode ? 16 : 13,
                          height: isTargetNode ? 16 : 13,
                          borderRadius: "50%",
                          background: isTargetNode ? "#6366f1" : "white",
                          border: `2px solid #6366f1`,
                          transition: "all 0.15s ease",
                        }}
                        className={isTargetNode ? "ring-4 ring-primary/40 animate-pulse scale-125 shadow-md" : "hover:scale-125"}
                      />
                    </div>
                  )}

                  {/* Card */}
                  {node.type === "empty-branch" ? (
                    <div
                      className={`rounded-xl border-2 border-dashed p-3 transition-all cursor-pointer select-none ${
                        isSelected || selectedBranchId === node.config.branchId
                          ? "border-purple-500 bg-purple-50/70 ring-2 ring-purple-300 shadow-md"
                          : "border-purple-300/80 bg-purple-50/20 hover:border-purple-400 hover:bg-purple-50/40 shadow-xs"
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
                          <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                          <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wide truncate">
                            {node.config.branchName || "Branch"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[9px] text-gray-400 font-medium">(Empty)</span>
                          {node.config?.sourceParallelStepId && node.config?.branchId && (
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
                      <div className="flex items-center gap-1.5 text-xs text-purple-700 font-semibold py-0.5">
                        <Plus className="w-3.5 h-3.5 text-purple-600" />
                        <span className="text-[11px]">Click to add step</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`rounded-xl border-2 ${style.bg} ${style.border} shadow-sm transition-all select-none ${
                        isTargetNode
                          ? "ring-2 ring-primary ring-offset-2 border-primary bg-primary/10 shadow-lg cursor-pointer scale-[1.02]"
                          : isStart
                          ? "cursor-pointer hover:border-emerald-500"
                          : "cursor-move"
                      } ${
                        isSelected ? "ring-2 ring-primary ring-offset-2 shadow-md" : "hover:shadow-md"
                      }`}
                      style={{ minHeight: NODE_H }}
                      onClick={isStart && !isTargetNode ? focusTriggersCategory : undefined}
                    >
                      <div className="px-3 py-2.5 flex items-start gap-2.5">
                        <div className={`flex-shrink-0 mt-0.5 ${style.text}`}>
                          {isStart ? (
                            getTriggerIconComponent(node.config?.triggerIconKey || activeTriggerItem?.iconKey || triggerIconKey, node.config?.triggerType || activeTriggerItem?.triggerType || triggerType)
                          ) : isEnd ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            getNodeIcon(node.type)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className={`text-xs font-semibold truncate ${style.text}`}>
                              {isStart
                                ? (node.label || activeTriggerItem?.label || (node.config?.scope === "global" ? "Event Trigger" : `On Entry: ${stageName}`))
                                : isEnd
                                ? "END"
                                : node.label}
                            </p>
                            {node.config?.conditionsEnabled && (
                              <span
                                title="Conditions are active for this step"
                                className="flex-shrink-0 text-[9px] font-bold px-1 py-0.5 rounded bg-blue-100 text-blue-700 leading-none"
                              >
                                COND
                              </span>
                            )}
                          </div>

                          {/* Subtitle / context description */}
                          {isStart && (
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                              {node.config?.triggerDescription || activeTriggerItem?.desc || (node.config?.scope === "global" ? (node.config?.triggerEvent || "Rule entry point") : `Process: ${processName}`)}
                            </p>
                          )}
                          {node.type === "generate-invoice" && (
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                              {node.config?.billFor === "choose"
                                ? `Custom (${(node.config?.selectedServices || []).length} items)`
                                : node.config?.billFor === "client"
                                ? "Client's services"
                                : "Appointment's service"}
                            </p>
                          )}
                          {node.type === "send-payment" && (
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                              Payment link & checkout
                            </p>
                          )}
                          {node.type === "send-invoice" && (
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                              Send invoice statement
                            </p>
                          )}
                          {(node.type === "update-stage" || node.type === "move-process" || node.type === "move-stage" || node.type === "move-new-process") && (() => {
                            const entity = node.config?.stageEntity || node.config?.entityType || "processes";
                            if (entity === "appointment") {
                              const procDisplay = node.config?.processName || (effectiveProcesses.find(p => p.id === (node.config?.stepDetailProcess || node.config?.processId))?.name);
                              const stageName = node.config?.stageName || node.config?.stepDetailStage || "Select stage";
                              return (
                                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                  {procDisplay ? `${procDisplay} → ${stageName}` : `Appointment → ${stageName}`}
                                </p>
                              );
                            }
                            if (entity === "invoice") {
                              const procDisplay = node.config?.processName || (effectiveProcesses.find(p => p.id === (node.config?.stepDetailProcess || node.config?.processId))?.name);
                              const stageName = node.config?.stageName || node.config?.stepDetailStage || "Select stage";
                              return (
                                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                  {procDisplay ? `${procDisplay} → ${stageName}` : `Invoice → ${stageName}`}
                                </p>
                              );
                            }
                            const targetProc = effectiveProcesses.find(p => p.id === (node.config?.stepDetailProcess || node.config?.processId));
                            const targetStage = targetProc?.stages?.find(s => s.id === (node.config?.stepDetailStage || node.config?.stageId) || s.name === (node.config?.stepDetailStage || node.config?.stageId));
                            const procDisplay = targetProc?.name || node.config?.processName;
                            const stageDisplay = targetStage?.name || node.config?.stageName;
                            return (
                              <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                {stageDisplay && procDisplay ? `${procDisplay} → ${stageDisplay}` :
                                 stageDisplay ? `Stage: ${stageDisplay}` :
                                 procDisplay ? `Process: ${procDisplay}` : "Update to stage"}
                              </p>
                            );
                          })()}
                          {node.type === "parallel" && (
                            <div className="mt-1 flex items-center justify-between gap-1">
                              <p className="text-[10px] text-muted-foreground truncate">
                                Runs {(node.config.branches || []).length} branches concurrently
                              </p>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddBranch(node.id);
                                }}
                                className="w-5 h-5 rounded-md bg-purple-100 hover:bg-purple-200 text-purple-700 flex items-center justify-center cursor-pointer transition-colors shadow-2xs shrink-0"
                                title="Add branch"
                                aria-label="Add branch"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          {node.type === "condition" && (node.config.conditionSummary || node.config.value) && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {node.config.conditionSummary || `${node.config.fieldSource} · ${node.config.operator} · ${node.config.value}`}
                            </p>
                          )}
                          {node.type === "wait" && node.config.duration && (
                            <p className="text-[10px] text-muted-foreground">
                              {node.config.duration} {node.config.unit || "seconds"}
                            </p>
                          )}
                          {node.type === "send-email" && node.config.subject && (
                            <p className="text-[10px] text-muted-foreground truncate">{node.config.subject}</p>
                          )}
                          {node.type === "send-sms" && node.config.smsMessage && (
                            <p className="text-[10px] text-muted-foreground truncate">{node.config.smsMessage}</p>
                          )}
                          {(node.type === "call-transfer" || node.type === "call-transfer-human") && node.config.callActionPhoneNumber && (
                            <p className="text-[10px] text-muted-foreground truncate">{node.config.callActionCountryCode} {node.config.callActionPhoneNumber}</p>
                          )}
                        </div>

                        {/* Delete btn - always accessible to delete mistake nodes */}
                        {!isStart && !node.config?.syntheticFor && (!node.config?.autoGenerated || onWorkflowStepsChange) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNode(node.id);
                            }}
                            className="flex-shrink-0 p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete node"
                            aria-label="Delete node"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Config hint */}
                      {!isStart && !isEnd && isSelected && node.type !== "parallel" && (
                        <div
                          className="px-3 pb-2 text-[10px] text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                          onClick={() => openConfig(node)}
                        >
                          Double-click to configure →
                        </div>
                      )}
                      {node.type === "parallel" && isSelected && (
                        <div className="px-3 pb-2 text-[10px] text-purple-600 font-medium">
                          Select a branch below, then click an action from sidebar to add to it →
                        </div>
                      )}
                    </div>
                  )}

                  {/* Output ports (bottom) */}
                  {!isEnd && (
                    <div style={{ position: "absolute", bottom: -12, left: 0, width: "100%", display: "flex", justifyContent: "space-around", zIndex: 20 }}>
                      {ports.map((p, i) => {
                        const isSourceActive = drawingConn?.fromId === node.id && drawingConn?.fromPort === p.port;
                        return (
                          <div
                            key={p.port}
                            data-port={p.port}
                            title={p.label || "Click or drag to connect"}
                            style={{
                              width: 26,
                              height: 26,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "crosshair",
                              position: "relative",
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
                              if (p.branchId) {
                                setSelectedBranchId(p.branchId);
                                setSelectedId(p.branchId);
                                toast.info(`Selected ${p.label}. Click an action from sidebar to add to this branch.`);
                              } else {
                                setSelectedId(node.id);
                                const stepCtx = findStepInTree(workflowSteps, node.id);
                                if (stepCtx?.parentBranch) {
                                  setSelectedBranchId(stepCtx.parentBranch.id);
                                } else {
                                  setSelectedBranchId(null);
                                }
                                if (drawingConn?.fromId === node.id && drawingConn?.fromPort === p.port) {
                                  setDrawingConn(null);
                                }
                              }
                            }}
                          >
                            <div
                              style={{
                                width: isSourceActive ? 16 : 13,
                                height: isSourceActive ? 16 : 13,
                                borderRadius: "50%",
                                background: isSourceActive ? (PORT_COLOR[p.port] || "#6366f1") : "white",
                                border: `2px solid ${PORT_COLOR[p.port] || "#6366f1"}`,
                                transition: "all 0.15s ease",
                              }}
                              className={isSourceActive ? "ring-4 ring-primary/40 shadow-md scale-110" : "hover:scale-125"}
                            />
                            {p.label && (
                              <span style={{
                                position: "absolute",
                                top: 22,
                                left: "50%",
                                transform: "translateX(-50%)",
                                fontSize: 8,
                                fontWeight: 700,
                                color: PORT_COLOR[p.port] || "#6366f1",
                                whiteSpace: "nowrap",
                                pointerEvents: "none",
                              }}>
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
        const isTriggerNode = configNode?.type === "start";
        const targetStepId = configNode ? (configNode.config?.sourceStepId ?? configNode.config?.syntheticFor ?? configNode.id) : null;
        const targetStep = isTriggerNode
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
              params: configNode.config || {},
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
              params={configNode?.config ?? {}}
              onParamsChange={patchConfig}
              onBack={() => setConfigNode(null)}
              onClose={() => setConfigNode(null)}
              onSave={saveConfig}
              onlyParameters={true}
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
    </div>
  );
}
