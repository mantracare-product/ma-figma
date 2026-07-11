import { useState, useRef, useCallback, useEffect } from "react";
import {
  GitBranch, Clock, Split, XCircle, Phone, User, PhoneForwarded, PhoneOff,
  Eye, Hash, Calendar, Mail, MessageSquare, Settings2, ArrowRight, Workflow,
  Zap, Webhook, Search, ChevronDown, ChevronRight, Plus, Trash2, X,
  ZoomIn, ZoomOut, Maximize2, Undo2, Redo2, CheckCircle2, AlertCircle,
  Code2, Activity, Layers, PhoneCall, Save, AlignCenter, Hand,
} from "lucide-react";
import { Button } from "../ui/Button";
import VariableSelectorModal from "./VariableSelectorModal";
import type { WorkflowStep } from "../../types/workflow";
import StepParametersFields from "./StepParametersFields";
import StepDetailDrawer from "./StepDetailDrawer";
import { FETCH_FIELD_SOURCES } from "./VariablePickerButton";
import { toast } from "sonner";
import { HowItWorksModal, HowItWorksButton } from "../help/HowItWorksModal";
import { InfoTooltip } from "../help/InfoTooltip";

interface ParallelGroup {
  id: string;
  firstStepId: string;
  steps: WorkflowStep[];
}

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
  if ((step.delayValue ?? 0) > 0) {
    return `wait-${step.id}`;
  }
  if (step.params?.conditionsEnabled) {
    return `cond-${step.id}`;
  }
  return step.id;
};

// ─── Types ────────────────────────────────────────────────────────────────────

type NodeType =
  | "start" | "end"
  | "condition" | "wait" | "parallel"
  | "call-transfer" | "call-transfer-human" | "call-transfer-ai" | "call-hangup"
  | "fetch-availability" | "fetch-field-value"
  | "send-email" | "send-sms" | "send-whatsapp"
  | "field-update" | "assign-responsible" | "move-stage" | "move-process"
  | "book-appointment" | "reschedule-appointment" | "cancel-appointment"
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
  stepAllowedTriggers?: Record<string, Array<"stage" | "incall" | "postcall">>;
}

// ─── Node Library Definition ──────────────────────────────────────────────────

// ─── Reverse mapping: NodeType → stepKey ─────────────────────────────────────
const NODE_TYPE_TO_STEP_KEY: Partial<Record<NodeType, string>> = {
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
  "move-process": "processmovement",
  "book-appointment": "scheduleappointment",
  "reschedule-appointment": "scheduleappointment",
  "cancel-appointment": "scheduleappointment",
  "webhook": "webhook_trigger",
  "api": "wh_trigger",
  "end": "endworkflow",
  "idle-messages": "idlemessages",
};

const NODE_TYPE_TO_ICON_KEY: Record<string, string> = {
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
  "book-appointment": "calendar",
  "reschedule-appointment": "calendar",
  "cancel-appointment": "x",
  "webhook": "webhook",
  "api": "globe",
  "end": "x",
  "idle-messages": "messagesquare",
};

const NODE_CATEGORIES = [
  {
    id: "logic",
    label: "Logic",
    icon: <GitBranch className="w-3.5 h-3.5" />,
    nodes: [
      { type: "condition" as NodeType, label: "Condition", icon: <Split className="w-4 h-4" />, desc: "Gate this step behind field or intent conditions" },
      { type: "wait" as NodeType, label: "Wait / Delay", icon: <Clock className="w-4 h-4" />, desc: "Delay this step before it runs" },
      { type: "parallel" as NodeType, label: "Parallel Branches", icon: <Layers className="w-4 h-4" />, desc: "Run this step alongside adjacent steps" },
      { type: "move-process" as NodeType, label: "Process/Stage Movement", icon: <Workflow className="w-4 h-4" />, desc: "Move the contact to a different process and select the target stage" },
      { type: "end" as NodeType, label: "End Workflow", icon: <XCircle className="w-4 h-4" />, desc: "Terminate the workflow" },
    ],
  },
  {
    id: "call",
    label: "Caller Engagement",
    icon: <Phone className="w-3.5 h-3.5" />,
    nodes: [
      { type: "call-transfer" as NodeType, label: "Transfer Call", icon: <PhoneCall className="w-4 h-4" />, desc: "Transfer the active call to a human agent or another AI agent" },
      { type: "call-hangup" as NodeType, label: "Call Hangup", icon: <PhoneOff className="w-4 h-4" />, desc: "End the active call" },
      { type: "idle-messages" as NodeType, label: "Idle Messages", icon: <MessageSquare className="w-4 h-4" />, desc: "Speak a message if the caller goes idle" },
    ],
  },
  {
    id: "communication",
    label: "Communication",
    icon: <MessageSquare className="w-3.5 h-3.5" />,
    nodes: [
      { type: "send-email" as NodeType, label: "Send Email", icon: <Mail className="w-4 h-4" />, desc: "Send an email" },
      { type: "send-sms" as NodeType, label: "Send SMS", icon: <MessageSquare className="w-4 h-4" />, desc: "Send an SMS" },
      { type: "send-whatsapp" as NodeType, label: "Send WhatsApp", icon: <MessageSquare className="w-4 h-4" />, desc: "Send a WhatsApp message" },
    ],
  },
  {
    id: "data",
    label: "Data & Assignment",
    icon: <Settings2 className="w-3.5 h-3.5" />,
    nodes: [
      { type: "field-update" as NodeType, label: "Field Update", icon: <Settings2 className="w-4 h-4" />, desc: "Update a field value" },
      { type: "assign-responsible" as NodeType, label: "Assign Responsible", icon: <User className="w-4 h-4" />, desc: "Assign a team member" },
    ],
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: <Webhook className="w-3.5 h-3.5" />,
    nodes: [
      { type: "webhook" as NodeType, label: "Webhook", icon: <Webhook className="w-4 h-4" />, desc: "Send data via webhook" },
      { type: "api" as NodeType, label: "API", icon: <Zap className="w-4 h-4" />, desc: "Make an HTTP API call" },
    ],
  },
];

// ─── Node visual config ───────────────────────────────────────────────────────

const NODE_STYLE: Record<string, { bg: string; border: string; text: string; icon?: string }> = {
  start:                 { bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-400", text: "text-emerald-700 dark:text-emerald-400" },
  end:                   { bg: "bg-red-50 dark:bg-red-900/20",     border: "border-red-400",     text: "text-red-700 dark:text-red-400" },
  condition:             { bg: "bg-violet-50 dark:bg-violet-900/20", border: "border-violet-400", text: "text-violet-700 dark:text-violet-400" },
  wait:                  { bg: "bg-slate-50 dark:bg-slate-900/20",   border: "border-slate-400",   text: "text-slate-700 dark:text-slate-400" },
  parallel:              { bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-400", text: "text-purple-700 dark:text-purple-400" },
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
  "book-appointment":    { bg: "bg-teal-50 dark:bg-teal-900/20",     border: "border-teal-400",   text: "text-teal-700 dark:text-teal-400" },
  "reschedule-appointment": { bg: "bg-teal-50 dark:bg-teal-900/20", border: "border-teal-400",   text: "text-teal-700 dark:text-teal-400" },
  "cancel-appointment":  { bg: "bg-rose-50 dark:bg-rose-900/20",     border: "border-rose-400",   text: "text-rose-700 dark:text-rose-400" },
  webhook:               { bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-400", text: "text-orange-700 dark:text-orange-400" },
  api:                   { bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-400", text: "text-orange-700 dark:text-orange-400" },
  "idle-messages":       { bg: "bg-sky-50 dark:bg-sky-900/20", border: "border-sky-400", text: "text-sky-700 dark:text-sky-400" },
};

function getNodeIcon(type: NodeType) {
  const all = NODE_CATEGORIES.flatMap((c) => c.nodes);
  return all.find((n) => n.type === type)?.icon ?? <GitBranch className="w-4 h-4" />;
}

function getNodeLabel(type: NodeType) {
  const all = NODE_CATEGORIES.flatMap((c) => c.nodes);
  return all.find((n) => n.type === type)?.label ?? type;
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
  whatsapp: "send-whatsapp",
  sms: "send-sms",
  email: "send-email",
  fieldupdate: "field-update",
  assignhuman: "assign-responsible",
  processmovement: "move-process",
  stagemovement: "move-stage",
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

const buildAvailablePredecessors = (steps: WorkflowStep[], lane: "stage"|"incall"|"postcall", excludeId?: string) => {
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FlowBuilderTab({
  processName = "Current Process",
  stageName = "Current Stage",
  processes = [],
  currentProcessId,
  workflowSteps = [],
  onWorkflowStepsChange,
  stepAllowedTriggers = {},
}: FlowBuilderTabProps) {
  // Drawer execution/timing controls (seeded on openConfig)
  const [drawerTrigger, setDrawerTrigger] = useState<"stage" | "incall" | "postcall">("stage");
  const [drawerExecType, setDrawerExecType] = useState<"wait" | "parallel">("wait");
  const [drawerDelayValue, setDrawerDelayValue] = useState<number>(0);
  const [drawerDelayUnit, setDrawerDelayUnit] = useState<string>("Minute");
  const [drawerConnectAfterId, setDrawerConnectAfterId] = useState<string | undefined>(undefined);
  // Canvas state
  const [nodes, setNodes] = useState<FlowNode[]>([
    { id: "start", type: "start", label: "Start", x: 400, y: 80, config: {} },
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

  // Connection drawing
  const [drawingConn, setDrawingConn] = useState<{ fromId: string; fromPort: string; x: number; y: number } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

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

  const canvasRef = useRef<HTMLDivElement>(null);
  const NODE_W = 200;
  const NODE_H = 70; // approximate, condition nodes are taller

  const BASE_X = 300;
  const BASE_Y = 220;
  const LANE_X_SPACING = 280;
  const NODE_Y_SPACING = 140;

  useEffect(() => {
    setNodes(prevNodes => {
      const prevById = new Map(prevNodes.map(n => [n.id, n]));
      const manualNodes = prevNodes.filter(
        n => n.id === "start" ||
             (!n.config?.autoGenerated && !n.config?.syntheticFor &&
              !n.id.startsWith("cond-") && !n.id.startsWith("parallel-") && !n.id.startsWith("wait-"))
      );

      const lanes: Record<"stage" | "incall" | "postcall", WorkflowStep[]> = {
        stage: [],
        incall: [],
        postcall: [],
      };
      workflowSteps.forEach(step => {
        lanes[step.trigger ?? "stage"].push(step);
      });

      const generatedNodes: FlowNode[] = [];
      const laneOrder: Array<"stage" | "incall" | "postcall"> = ["stage", "incall", "postcall"];

      laneOrder.forEach((laneKey, laneIndex) => {
        const stepsInLane = lanes[laneKey];
        
        // Find bottom-most node in this lane to start new steps below it
        const laneNodes = prevNodes.filter(n => {
          return n.config?.lane === laneKey || (n.id !== "start" && workflowSteps.find(s => s.id === n.id)?.trigger === laneKey);
        });
        let laneBottomY = BASE_Y - 120;
        laneNodes.forEach(n => {
          if (n.y > laneBottomY) {
            laneBottomY = n.y;
          }
        });
        let yCursor = laneBottomY + 120;

        // 1. Identify parallel groups in this lane
        const parallelGroups: ParallelGroup[] = [];
        let currentGroup: WorkflowStep[] = [];
        stepsInLane.forEach(step => {
          if (step.executionType === "parallel") {
            currentGroup.push(step);
          } else {
            if (currentGroup.length >= 2) {
              parallelGroups.push({
                id: `parallel-${currentGroup[0].id}`,
                firstStepId: currentGroup[0].id,
                steps: [...currentGroup]
              });
            }
            currentGroup = [step];
          }
        });
        if (currentGroup.length >= 2) {
          parallelGroups.push({
            id: `parallel-${currentGroup[0].id}`,
            firstStepId: currentGroup[0].id,
            steps: [...currentGroup]
          });
        }

        const processedStepIds = new Set<string>();

        stepsInLane.forEach((step) => {
          if (processedStepIds.has(step.id)) return;

          const group = parallelGroups.find(g => g.firstStepId === step.id);
          if (group) {
            // Generate parallel node
            const parallelNodeId = `parallel-${step.id}`;
            const pX = BASE_X + laneIndex * LANE_X_SPACING;
            const existingParallel = prevById.get(parallelNodeId);
            const resolvedParallelY = existingParallel?.y ?? yCursor;

            generatedNodes.push({
              id: parallelNodeId,
              type: "parallel",
              label: "Parallel Branches",
              x: existingParallel?.x ?? pX,
              y: resolvedParallelY,
              config: {
                autoGenerated: true,
                syntheticFor: step.id,
                branchCount: group.steps.length,
                lane: laneKey,
              }
            });

            const totalMembers = group.steps.length;
            let anyMemberHasConditions = false;
            group.steps.forEach(member => {
              if (member.params?.conditionsEnabled) {
                anyMemberHasConditions = true;
              }
            });

            let maxMemberY = resolvedParallelY + 85;

            group.steps.forEach((member, memberIdx) => {
              processedStepIds.add(member.id);
              const mX = BASE_X + laneIndex * LANE_X_SPACING + (memberIdx - (totalMembers - 1) / 2) * (NODE_W + 30);
              const existingMember = prevById.get(member.id);
              const nodeType = STEP_KEY_TO_NODE_TYPE[member.stepKey ?? ""] ?? FALLBACK_NODE_TYPE;

              const memberHasDelay = (member.delayValue ?? 0) > 0;
              const memberHasCond = member.params?.conditionsEnabled;

              let resolvedMemberY;
              if (existingMember) {
                resolvedMemberY = existingMember.y;
              } else {
                let currentMemberY = resolvedParallelY + 85;
                if (memberHasDelay) {
                  currentMemberY += 85;
                }
                if (memberHasCond) {
                  currentMemberY += 85;
                }
                resolvedMemberY = currentMemberY;
              }

              if (resolvedMemberY > maxMemberY) {
                maxMemberY = resolvedMemberY;
              }

              if (memberHasDelay) {
                const waitNodeId = `wait-${member.id}`;
                const existingWait = prevById.get(waitNodeId);
                generatedNodes.push({
                  id: waitNodeId,
                  type: "wait",
                  label: `Wait ${member.delayValue} ${member.delayUnit ?? "Minute"}`,
                  x: existingWait?.x ?? mX,
                  y: existingWait?.y ?? (resolvedMemberY - (memberHasCond ? 170 : 85)),
                  config: {
                    autoGenerated: true,
                    syntheticFor: member.id,
                    sourceStepId: member.id,
                    duration: member.delayValue,
                    unit: member.delayUnit,
                    lane: laneKey,
                  }
                });
              }

              if (memberHasCond) {
                const condNodeId = `cond-${member.id}`;
                const existingCond = prevById.get(condNodeId);
                generatedNodes.push({
                  id: condNodeId,
                  type: "condition",
                  label: "Condition Gate",
                  x: existingCond?.x ?? mX,
                  y: existingCond?.y ?? (resolvedMemberY - 85),
                  config: {
                    autoGenerated: true,
                    syntheticFor: member.id,
                    conditionsEnabled: true,
                    conditionSummary: buildConditionSummary(member, laneKey),
                    lane: laneKey,
                  }
                });
              }

              generatedNodes.push({
                id: member.id,
                type: nodeType,
                label: member.name,
                stepKey: member.stepKey,
                x: existingMember?.x ?? mX,
                y: resolvedMemberY,
                config: {
                  ...(member.params ?? {}),
                  ...(existingMember?.config ?? {}),
                  autoGenerated: true,
                  sourceStepId: member.id,
                  lane: laneKey,
                }
              });
            });

            yCursor = maxMemberY + 120;
          } else {
            // Normal sequential step
            processedStepIds.add(step.id);
            const existing = prevById.get(step.id);
            const nodeType = STEP_KEY_TO_NODE_TYPE[step.stepKey ?? ""] ?? FALLBACK_NODE_TYPE;
            const mX = BASE_X + laneIndex * LANE_X_SPACING;

            const hasDelay = (step.delayValue ?? 0) > 0;
            const hasCond = step.params?.conditionsEnabled;

            let resolvedStepY;
            if (existing) {
              resolvedStepY = existing.y;
            } else {
              let currentY = yCursor;
              if (hasDelay) {
                currentY += 85;
              }
              if (hasCond) {
                currentY += 85;
              }
              resolvedStepY = currentY;
            }

            if (hasDelay) {
              const waitNodeId = `wait-${step.id}`;
              const existingWait = prevById.get(waitNodeId);
              generatedNodes.push({
                id: waitNodeId,
                type: "wait",
                label: `Wait ${step.delayValue} ${step.delayUnit ?? "Minute"}`,
                x: existingWait?.x ?? mX,
                y: existingWait?.y ?? (resolvedStepY - (hasCond ? 170 : 85)),
                config: {
                  autoGenerated: true,
                  syntheticFor: step.id,
                  sourceStepId: step.id,
                  duration: step.delayValue,
                  unit: step.delayUnit,
                  lane: laneKey,
                }
              });
            }

            if (hasCond) {
              const condNodeId = `cond-${step.id}`;
              const existingCond = prevById.get(condNodeId);
              generatedNodes.push({
                id: condNodeId,
                type: "condition",
                label: "Condition Gate",
                x: existingCond?.x ?? mX,
                y: existingCond?.y ?? (resolvedStepY - 85),
                config: {
                  autoGenerated: true,
                  syntheticFor: step.id,
                  conditionsEnabled: true,
                  conditionSummary: buildConditionSummary(step, laneKey),
                  lane: laneKey,
                }
              });
            }

            generatedNodes.push({
              id: step.id,
              type: nodeType,
              label: step.name,
              stepKey: step.stepKey,
              x: existing?.x ?? mX,
              y: resolvedStepY,
              config: {
                ...(step.params ?? {}),
                ...(existing?.config ?? {}),
                autoGenerated: true,
                sourceStepId: step.id,
                lane: laneKey,
              }
            });

            yCursor = resolvedStepY + 120;
          }
        });
      });

      return [...manualNodes, ...generatedNodes];
    });

    setConnections(prevConnections => {
      // 1. Keep manual (user-drawn) connections starting with "conn-"
      const manualConnections = prevConnections.filter(c => c.id.startsWith("conn-"));

      const lanes: Record<"stage" | "incall" | "postcall", WorkflowStep[]> = {
        stage: [],
        incall: [],
        postcall: [],
      };
      workflowSteps.forEach(step => {
        lanes[step.trigger ?? "stage"].push(step);
      });

      const parallelGroups: ParallelGroup[] = [];
      (["stage", "incall", "postcall"] as const).forEach(laneKey => {
        const stepsInLane = lanes[laneKey];
        let currentGroup: WorkflowStep[] = [];
        stepsInLane.forEach(step => {
          if (step.executionType === "parallel") {
            currentGroup.push(step);
          } else {
            if (currentGroup.length >= 2) {
              parallelGroups.push({
                id: `parallel-${currentGroup[0].id}`,
                firstStepId: currentGroup[0].id,
                steps: [...currentGroup]
              });
            }
            currentGroup = [step];
          }
        });
        if (currentGroup.length >= 2) {
          parallelGroups.push({
            id: `parallel-${currentGroup[0].id}`,
            firstStepId: currentGroup[0].id,
            steps: [...currentGroup]
          });
        }
      });

      // 2. Normalize manual connections: route incoming connections to the correct first node
      const normalizedManualConnections = manualConnections.map(c => {
        let targetStep = workflowSteps.find(
          s => s.id === c.toId || `wait-${s.id}` === c.toId || `cond-${s.id}` === c.toId
        );

        if (targetStep) {
          const inGroup = parallelGroups.find(g => g.steps.some(s => s.id === targetStep!.id));
          if (inGroup) {
            return {
              ...c,
              toId: `parallel-${inGroup.firstStepId}`
            };
          } else {
            return {
              ...c,
              toId: getStepFirstNodeId(targetStep)
            };
          }
        }

        if (c.toId.startsWith("parallel-")) {
          const firstStepId = c.toId.replace("parallel-", "");
          const groupStillExists = parallelGroups.some(g => g.firstStepId === firstStepId);
          if (!groupStillExists) {
            const step = workflowSteps.find(s => s.id === firstStepId);
            if (step) {
              return {
                ...c,
                toId: getStepFirstNodeId(step)
              };
            }
          }
        }

        return c;
      });

      // 3. Initialize start connections on the very first render if manualConnections is empty
      const initialConnections: FlowConnection[] = [];
      if (manualConnections.length === 0 && isFirstRender.current) {
        (["stage", "incall", "postcall"] as const).forEach(laneKey => {
          const stepsInLane = lanes[laneKey];
          if (stepsInLane.length > 0) {
            const firstStep = stepsInLane[0];
            const inGroup = parallelGroups.find(g => g.firstStepId === firstStep.id);
            const toId = inGroup ? `parallel-${inGroup.firstStepId}` : getStepFirstNodeId(firstStep);
            initialConnections.push({
              id: `conn-start-${laneKey}`,
              fromId: "start",
              fromPort: "default",
              toId
            });
          }
        });
        isFirstRender.current = false;
      }

      // 4. Generate structural connections (Wait, Cond, Parallel) inside each step
      const autoConnections: FlowConnection[] = [];
      (["stage", "incall", "postcall"] as const).forEach(laneKey => {
        const stepsInLane = lanes[laneKey];
        const processedStepIds = new Set<string>();

        stepsInLane.forEach((step) => {
          if (processedStepIds.has(step.id)) return;

          const group = parallelGroups.find(g => g.firstStepId === step.id);
          if (group) {
            const parallelNodeId = `parallel-${step.id}`;

            group.steps.forEach((member, memberIdx) => {
              processedStepIds.add(member.id);
              const branchPort = `branch-${memberIdx}`;
              const memberHasDelay = (member.delayValue ?? 0) > 0;
              const memberWaitId = `wait-${member.id}`;
              const memberCondId = `cond-${member.id}`;

              let memberFromId = parallelNodeId;
              let memberFromPort = branchPort;

              if (memberHasDelay) {
                autoConnections.push({
                  id: `struct-wait-${memberWaitId}`,
                  fromId: memberFromId,
                  fromPort: memberFromPort,
                  toId: memberWaitId
                });
                memberFromId = memberWaitId;
                memberFromPort = "default";
              }

              if (member.params?.conditionsEnabled) {
                autoConnections.push({
                  id: `struct-cond-${memberCondId}`,
                  fromId: memberFromId,
                  fromPort: memberFromPort,
                  toId: memberCondId
                });
                autoConnections.push({
                  id: `struct-auto-${laneKey}-${member.id}`,
                  fromId: memberCondId,
                  fromPort: "default",
                  toId: member.id
                });
              } else {
                autoConnections.push({
                  id: `struct-auto-${laneKey}-${member.id}`,
                  fromId: memberFromId,
                  fromPort: memberFromPort,
                  toId: member.id
                });
              }
            });
          } else {
            processedStepIds.add(step.id);
            const stepHasDelay = (step.delayValue ?? 0) > 0;
            const stepWaitId = `wait-${step.id}`;
            const stepCondId = `cond-${step.id}`;

            if (stepHasDelay && step.params?.conditionsEnabled) {
              autoConnections.push({
                id: `struct-wait-cond-${step.id}`,
                fromId: stepWaitId,
                fromPort: "default",
                toId: stepCondId
              });
              autoConnections.push({
                id: `struct-cond-step-${step.id}`,
                fromId: stepCondId,
                fromPort: "default",
                toId: step.id
              });
            } else if (stepHasDelay) {
              autoConnections.push({
                id: `struct-wait-step-${step.id}`,
                fromId: stepWaitId,
                fromPort: "default",
                toId: step.id
              });
            } else if (step.params?.conditionsEnabled) {
              autoConnections.push({
                id: `struct-cond-step-${step.id}`,
                fromId: stepCondId,
                fromPort: "default",
                toId: step.id
              });
            }
          }
        });

        // 5. Generate inter-step connections based on connectAfterId
        stepsInLane.forEach((step) => {
          if (step.executionType === "parallel") return; // parallel steps don't connect individually
          if (step.trigger === "incall") return; // incall steps don't connect sequentially

          const isFirstStepInLane = stepsInLane[0]?.id === step.id;
          const targetId = getStepFirstNodeId(step);
          const predId = step.connectAfterId;

          if (predId === "start" || (!predId && isFirstStepInLane)) {
            // Connect from start to this step's first node
            autoConnections.push({
              id: `struct-connect-${step.id}`,
              fromId: "start",
              fromPort: "default",
              toId: targetId
            });
          } else if (predId) {
            // Legacy fan-in path — only fires for old saved data that stored the group-prefixed id.
            // Nothing produces this prefix going forward, so this branch is effectively dead code.
            if (predId.startsWith("group-")) {
              const legacyFirstStepId = predId.replace("group-", "");
              const matchedGroup = parallelGroups.find(g => g.firstStepId === legacyFirstStepId);
              if (matchedGroup) {
                matchedGroup.steps.forEach(member => {
                  autoConnections.push({
                    id: `struct-connect-${step.id}-${member.id}`,
                    fromId: member.id,
                    fromPort: "default",
                    toId: targetId
                  });
                });
              }
            } else {
              // Always treat predId as an individual step id — single edge
              const predStep = workflowSteps.find(s => s.id === predId);
              if (predStep) {
                autoConnections.push({
                  id: `struct-connect-${step.id}`,
                  fromId: predStep.id,
                  fromPort: "default",
                  toId: targetId
                });
              } else {
                console.warn(`[FlowBuilder] connectAfterId "${predId}" on step "${step.name}" doesn't resolve to any known step.`);
              }
            }
          }
        });
      });

      return [...normalizedManualConnections, ...initialConnections, ...autoConnections];
    });
  }, [workflowSteps]);

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

  const addNode = (type: NodeType) => {
    // Logic modifiers attach to the selected step — not standalone nodes
    if (type === "condition" || type === "wait" || type === "parallel") {
      addLogicToSelectedNode(type);
      return;
    }

    const stepKey = NODE_TYPE_TO_STEP_KEY[type];
    if (stepKey && onWorkflowStepsChange) {
      const allowed: Array<"stage" | "incall" | "postcall"> = stepAllowedTriggers[stepKey] ?? ["stage", "incall", "postcall"];
      const catalogEntry = NODE_CATEGORIES
        .flatMap(c => c.nodes)
        .find(n => n.type === type);

      const newStep: WorkflowStep = {
        id: `${stepKey}-${Date.now()}`,
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
      onWorkflowStepsChange([...workflowSteps, newStep]);
      // The useEffect will generate the canvas node; open its drawer after the render tick
      setTimeout(() => {
        // Find the generated node for this step and open config
        setNodes(prev => {
          const generated = prev.find(n => n.id === newStep.id);
          if (generated) {
            setDrawerTrigger(newStep.trigger as "stage" | "incall" | "postcall");
            setDrawerExecType(newStep.executionType as "wait" | "parallel" ?? "wait");
            setDrawerDelayValue(newStep.delayValue ?? 0);
            setDrawerDelayUnit(newStep.delayUnit ?? "Minute");
            setConfigNode({ ...generated });
          }
          return prev;
        });
      }, 50);
      return;
    }

    // start/end or unmapped types — create a local-only canvas node (e.g. end)
    snapshot();
    const id = `node-${Date.now()}`;
    const newNode: FlowNode = {
      id,
      type,
      label: getNodeLabel(type),
      x: 400 - pan.x / zoom + Math.random() * 40 - 20,
      y: 200 - pan.y / zoom + Math.random() * 40 - 20,
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
    if (node?.config?.autoGenerated) {
      if (onWorkflowStepsChange) {
        snapshot();
        const updatedSteps = workflowSteps.filter(s => s.id !== id);
        onWorkflowStepsChange(updatedSteps);
        setNodes((prev) => prev.filter((n) => n.id !== id));
        setConnections((prev) => prev.filter((c) => c.fromId !== id && c.toId !== id));
        if (selectedId === id) setSelectedId(null);
        if (configNode?.id === id) setConfigNode(null);
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

  const getOutputPorts = (node: FlowNode): Array<{ port: string; label: string }> => {
    if (node.type === "condition") return [{ port: "default", label: "" }];
    if (node.type === "parallel") {
      const count = node.config.branchCount || 2;
      return Array.from({ length: count }, (_, i) => ({ port: `branch-${i}`, label: `Branch ${i + 1}` }));
    }
    if (node.type === "end" || node.type === "start") return [{ port: "default", label: "" }];
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
    // Avoid duplicate
    const exists = connections.some((c) => c.fromId === fromId && c.fromPort === fromPort && c.toId === toId);
    if (exists) return;
    snapshot();
    setConnections((prev) => [...prev, { id: `conn-${Date.now()}`, fromId, fromPort, toId }]);

    // Sync connectAfterId for manual connection
    let targetStepId = toId;
    if (toId.startsWith("wait-")) targetStepId = toId.replace("wait-", "");
    else if (toId.startsWith("cond-")) targetStepId = toId.replace("cond-", "");
    else if (toId.startsWith("parallel-")) targetStepId = toId.replace("parallel-", "");

    let sourceStepId = fromId;
    if (fromId.startsWith("wait-")) sourceStepId = fromId.replace("wait-", "");
    else if (fromId.startsWith("cond-")) sourceStepId = fromId.replace("cond-", "");
    else if (fromId.startsWith("parallel-")) sourceStepId = fromId.replace("parallel-", "");

    if (onWorkflowStepsChange) {
      // Store the actual sourceStepId directly (individual parallel members store their own id)
      const targetStep = workflowSteps.find(s => s.id === targetStepId);
      if (targetStep) {
        const updatedSteps = workflowSteps.map(step =>
          step.id === targetStep.id
            ? { ...step, connectAfterId: sourceStepId }
            : step
        );
        onWorkflowStepsChange(updatedSteps);
      }
    }
  };

  const deleteConnection = (id: string) => {
    snapshot();
    setConnections((prev) => prev.filter((c) => c.id !== id));
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
    const activeHandTool = isHandToolActive || isSpacePressed;
    if (e.button === 1 || (e.button === 0 && e.altKey) || (e.button === 0 && activeHandTool)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y });
      e.preventDefault();
    } else {
      setSelectedId(null);
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
      const world = canvasToWorld(e.clientX, e.clientY);
      updateNode(draggingId, {
        x: world.x - draggingOffset.x,
        y: world.y - draggingOffset.y,
      });
    }
    if (drawingConn) {
      setMousePos(canvasToWorld(e.clientX, e.clientY));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    if (draggingId) {
      const draggedNode = nodes.find(n => n.id === draggingId);
      if (draggedNode && draggedNode.config?.autoGenerated && onWorkflowStepsChange) {
        const getLaneKeyFromX = (x: number): "stage" | "incall" | "postcall" => {
          const distStage = Math.abs(x - BASE_X);
          const distInCall = Math.abs(x - (BASE_X + LANE_X_SPACING));
          const distPostCall = Math.abs(x - (BASE_X + 2 * LANE_X_SPACING));
          if (distStage <= distInCall && distStage <= distPostCall) return "stage";
          if (distInCall <= distStage && distInCall <= distPostCall) return "incall";
          return "postcall";
        };

        const autoNodes = nodes.filter(n => n.config?.autoGenerated && !n.config?.syntheticFor);
        const nodesWithLanes = autoNodes.map(n => {
          const lane: "stage" | "incall" | "postcall" =
            n.id === draggingId
              ? getLaneKeyFromX(n.x)
              : ((n.config?.lane as "stage" | "incall" | "postcall" | undefined) ?? "stage");
          return { ...n, lane };
        });

        // Group by lane
        const lanes: Record<"stage" | "incall" | "postcall", typeof nodesWithLanes> = {
          stage: [],
          incall: [],
          postcall: [],
        };
        nodesWithLanes.forEach(n => {
          lanes[n.lane].push(n);
        });

        // Rebuild workflowSteps list
        const newWorkflowSteps: WorkflowStep[] = [];
        
        (["stage", "incall", "postcall"] as const).forEach(laneKey => {
          // Sort nodes in this lane by y coordinate
          const sorted = [...lanes[laneKey]].sort((a, b) => a.y - b.y);
          
          sorted.forEach((n, idx) => {
            const originalStep = workflowSteps.find(s => s.id === n.id);
            if (originalStep) {
              let executionType = originalStep.executionType || "wait";
              if (laneKey === "incall") {
                executionType = "wait";
              } else if (idx === 0) {
                executionType = "wait";
              } else {
                const prev = sorted[idx - 1];
                if (Math.abs(n.y - prev.y) < 80) {
                  executionType = "parallel";
                } else {
                  executionType = "wait";
                }
              }

              newWorkflowSteps.push({
                ...originalStep,
                trigger: laneKey,
                executionType,
              });
            }
          });
        });

        onWorkflowStepsChange(newWorkflowSteps);
      }
      setDraggingId(null);
    }
    if (drawingConn) setDrawingConn(null);
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

  const autoArrange = () => {
    snapshot();
    const arranged = [...nodes];
    const startIdx = arranged.findIndex((n) => n.id === "start");
    if (startIdx !== -1) {
      arranged[startIdx] = { ...arranged[startIdx], x: 300, y: 80 };
    }
    let y = 200;
    arranged.forEach((n, i) => {
      if (n.id === "start") return;
      arranged[i] = { ...n, x: 300, y };
      y += 140;
    });
    setNodes(arranged);
  };

  // ── Bezier path helper ────────────────────────────────────────────────────────

  const bezierPath = (x1: number, y1: number, x2: number, y2: number) => {
    const cy = (y1 + y2) / 2;
    return `M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`;
  };

  // ── Draggable node ────────────────────────────────────────────────────────────

  const onNodeMouseDown = (e: React.MouseEvent, node: FlowNode) => {
    if ((e.target as HTMLElement).closest("[data-port]")) return;
    e.stopPropagation();
    setSelectedId(node.id);
    const world = canvasToWorld(e.clientX, e.clientY);
    setDraggingId(node.id);
    setDraggingOffset({ x: world.x - node.x, y: world.y - node.y });
  };

  // ── Filtered node library ─────────────────────────────────────────────────────

  const q = search.toLowerCase();
  const filteredCats = NODE_CATEGORIES.map((cat) => ({
    ...cat,
    nodes: cat.nodes.filter((n) => !q || n.label.toLowerCase().includes(q) || n.desc.toLowerCase().includes(q)),
  })).filter((cat) => cat.nodes.length > 0);

  // ── Config drawer ─────────────────────────────────────────────────────────────

  const openConfig = (node: FlowNode) => {
    if (node.type === "start") return;
    // Synthetic nodes (cond-, wait-, parallel-) proxy to the underlying step node
    if (node.config?.syntheticFor) {
      const realNode = nodes.find(n => n.id === node.config.syntheticFor);
      if (realNode) {
        const realStep = workflowSteps.find(s => s.id === node.config.syntheticFor);
        setDrawerTrigger((realStep?.trigger ?? "stage") as "stage" | "incall" | "postcall");
        setDrawerExecType((realStep?.executionType ?? "wait") as "wait" | "parallel");
        setDrawerDelayValue(realStep?.delayValue ?? 0);
        setDrawerDelayUnit(realStep?.delayUnit ?? "Minute");
        setDrawerConnectAfterId(realStep?.connectAfterId);
        setConfigNode({ ...realNode });
      }
      return;
    }
    const realStep = workflowSteps.find(s => s.id === node.id);
    setDrawerTrigger((realStep?.trigger ?? (node.config?.lane ?? "stage")) as "stage" | "incall" | "postcall");
    setDrawerExecType((realStep?.executionType ?? "wait") as "wait" | "parallel");
    setDrawerDelayValue(realStep?.delayValue ?? 0);
    setDrawerDelayUnit(realStep?.delayUnit ?? "Minute");
    setDrawerConnectAfterId(realStep?.connectAfterId);
    setConfigNode({ ...node });
  };

  const saveConfig = () => {
    if (!configNode) return;
    updateNode(configNode.id, { label: configNode.label, config: configNode.config });
    // Sync back to WorkflowStep (trigger + executionType + delay + connectAfterId + params)
    if (configNode.config?.autoGenerated && configNode.config?.sourceStepId && onWorkflowStepsChange) {
      const stepId = configNode.config.sourceStepId as string;
      const { autoGenerated: _a, sourceStepId: _s, lane: _l, ...params } = configNode.config;
      const finalConnectAfterId = drawerTrigger !== "incall" && drawerExecType === "wait" ? drawerConnectAfterId : undefined;
      const updatedSteps = workflowSteps.map(step =>
        step.id === stepId
          ? {
              ...step,
              name: configNode.label,
              trigger: drawerTrigger,
              executionType: drawerExecType,
              delayValue: drawerDelayValue,
              delayUnit: drawerDelayUnit,
              connectAfterId: finalConnectAfterId,
              params
            }
          : step
      );
      onWorkflowStepsChange(updatedSteps);
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
            <InfoTooltip text="Click any node below to add it to the canvas. Logic nodes (Condition, Wait, Parallel) attach to whichever step you have selected on the canvas — select a step first." />
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search nodes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-input-background border border-input rounded-lg text-xs"
            />
          </div>
        </div>

        {/* Category list */}
        <div className="flex-1 overflow-y-auto">
          {filteredCats.map((cat) => {
            const collapsed = collapsedCats.has(cat.id);
            return (
              <div key={cat.id} className="border-b border-border/60">
                <button
                  onClick={() => setCollapsedCats((s) => {
                    const n = new Set(s);
                    n.has(cat.id) ? n.delete(cat.id) : n.add(cat.id);
                    return n;
                  })}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
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
                        onClick={() => addNode(node.type)}
                        className="w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-primary/5 hover:text-primary transition-colors group"
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
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-lg font-medium">
              🏷 {processName}
            </span>
            <span className="text-xs px-2 py-1 bg-secondary/10 text-secondary rounded-lg font-medium">
              📍 {stageName}
            </span>
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
            <button onClick={autoArrange} title="Auto Arrange" className="p-1.5 rounded hover:bg-muted transition-colors">
              <AlignCenter className="w-4 h-4" />
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
            <Button variant="primary" size="sm" onClick={() => {}} className="h-7 text-xs">
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
          <div
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0", position: "absolute", top: 0, left: 0 }}
          >
            {/* SVG Connections */}
            <svg style={{ position: "absolute", top: 0, left: 0, width: 4000, height: 3000, pointerEvents: "none", overflow: "visible" }}>
              {connections.map((conn) => {
                const from = getPortXY(conn.fromId, conn.fromPort, false);
                const to = getPortXY(conn.toId, "default", true);
                const color = PORT_COLOR[conn.fromPort] || "#6366f1";
                const label = PORT_LABEL[conn.fromPort] || "";
                const midX = (from.x + to.x) / 2;
                const midY = (from.y + to.y) / 2;
                return (
                  <g key={conn.id}>
                    <path
                      d={bezierPath(from.x, from.y, to.x, to.y)}
                      fill="none"
                      stroke={color}
                      strokeWidth={2}
                      strokeOpacity={0.7}
                      markerEnd="url(#arrow)"
                    />
                    {label && (
                      <text x={midX} y={midY - 6} textAnchor="middle" fontSize={9} fontWeight="600" fill={color}>
                        {label}
                      </text>
                    )}
                    {/* Invisible click target */}
                    <path
                      d={bezierPath(from.x, from.y, to.x, to.y)}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={14}
                      style={{ cursor: "pointer", pointerEvents: "stroke" }}
                      onClick={() => deleteConnection(conn.id)}
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

            {/* Lane Legends */}
            {(["stage", "incall", "postcall"] as const).map((laneKey, laneIndex) => (
              <div
                key={laneKey}
                style={{
                  position: "absolute",
                  left: BASE_X + laneIndex * LANE_X_SPACING + NODE_W / 2,
                  top: BASE_Y - 50,
                  transform: "translateX(-50%)",
                  width: "120px",
                  textAlign: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: "#94A3B8",
                }}
              >
                {laneKey === "stage" ? "On Stage Entry" : laneKey === "incall" ? "In Call" : "Post Call"}
              </div>
            ))}

            {/* Nodes */}
            {nodes.map((node) => {
              const style = NODE_STYLE[node.type] || NODE_STYLE.start;
              const ports = getOutputPorts(node);
              const isSelected = selectedId === node.id;
              const isStart = node.type === "start";
              const isEnd = node.type === "end";

              return (
                <div
                  key={node.id}
                  style={{ position: "absolute", left: node.x, top: node.y, width: NODE_W, zIndex: isSelected ? 10 : 1 }}
                  onMouseDown={(e) => onNodeMouseDown(e, node)}
                  onDoubleClick={() => openConfig(node)}
                >
                  {/* Input port (top) */}
                  {!isStart && (
                    <div
                      data-port="input"
                      style={{
                        position: "absolute",
                        top: -8,
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: "white",
                        border: "2px solid #6366f1",
                        cursor: "crosshair",
                        zIndex: 2,
                      }}
                      onMouseUp={() => {
                        if (drawingConn) {
                          addConnection(drawingConn.fromId, drawingConn.fromPort, node.id);
                          setDrawingConn(null);
                        }
                      }}
                    />
                  )}

                  {/* Card */}
                  <div
                    className={`rounded-xl border-2 ${style.bg} ${style.border} shadow-sm transition-all select-none cursor-move ${
                      isSelected ? "ring-2 ring-primary ring-offset-2 shadow-md" : "hover:shadow-md"
                    }`}
                    style={{ minHeight: NODE_H }}
                  >
                    <div className="px-3 py-2.5 flex items-center gap-2.5">
                      <div className={`flex-shrink-0 ${style.text}`}>
                        {isStart ? <Activity className="w-4 h-4" /> : isEnd ? <XCircle className="w-4 h-4" /> : getNodeIcon(node.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-xs font-semibold truncate ${style.text}`}>
                            {isStart ? "START" : isEnd ? "END" : node.label}
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

                      {/* Delete btn */}
                      {!isStart && isSelected && !node.config?.syntheticFor && (!node.config?.autoGenerated || onWorkflowStepsChange) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                          className="flex-shrink-0 p-0.5 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Config hint */}
                    {!isStart && !isEnd && isSelected && (
                      <div
                        className="px-3 pb-2 text-[10px] text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                        onClick={() => openConfig(node)}
                      >
                        Double-click to configure →
                      </div>
                    )}
                  </div>

                  {/* Output ports (bottom) */}
                  {!isEnd && (
                    <div style={{ position: "absolute", bottom: -10, left: 0, width: "100%", display: "flex", justifyContent: "space-around" }}>
                      {ports.map((p, i) => {
                        const spacing = NODE_W / (ports.length + 1);
                        const portX = spacing * (i + 1);
                        return (
                          <div
                            key={p.port}
                            data-port={p.port}
                            title={p.label || "Connect"}
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: "50%",
                              background: "white",
                              border: `2px solid ${PORT_COLOR[p.port] || "#6366f1"}`,
                              cursor: "crosshair",
                              position: "relative",
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const portPos = getPortXY(node.id, p.port, false);
                              setDrawingConn({ fromId: node.id, fromPort: p.port, x: portPos.x, y: portPos.y });
                              setMousePos(portPos);
                            }}
                          >
                            {p.label && (
                              <span style={{
                                position: "absolute",
                                top: 16,
                                left: "50%",
                                transform: "translateX(-50%)",
                                fontSize: 8,
                                fontWeight: 700,
                                color: PORT_COLOR[p.port] || "#6366f1",
                                whiteSpace: "nowrap",
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

      {/* ── RIGHT: Config Drawer (Fallback for non-step nodes) ───────────────── */}
      {configNode && (!configNode.config?.autoGenerated || !configNode.stepKey) && (
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
        isOpen={!!configNode?.config?.autoGenerated && !!configNode.stepKey}
        step={configNode ? workflowSteps.find(s => s.id === (configNode.config?.sourceStepId ?? configNode.id)) ?? null : null}
        isCreatingNewStep={false}
        stepAllowedTriggers={stepAllowedTriggers}
        processes={processes}
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
        availablePredecessors={buildAvailablePredecessors(workflowSteps, drawerTrigger, configNode ? (configNode.config?.sourceStepId ?? configNode.id) : undefined)}
        params={configNode?.config ?? {}}
        onParamsChange={patchConfig}
        onBack={() => setConfigNode(null)}
        onClose={() => setConfigNode(null)}
        onSave={saveConfig}
      />

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
