import { useState, useRef, useCallback, useEffect } from "react";
import {
  GitBranch, Clock, Split, XCircle, Phone, User, PhoneForwarded, PhoneOff,
  Eye, Hash, Calendar, Mail, MessageSquare, Settings2, ArrowRight, Workflow,
  Zap, Webhook, Search, ChevronDown, ChevronRight, Plus, Trash2, X,
  ZoomIn, ZoomOut, Maximize2, Undo2, Redo2, CheckCircle2, AlertCircle,
  Code2, Activity, Layers, PhoneCall, Save, AlignCenter,
} from "lucide-react";
import { Button } from "../ui/Button";
import VariableSelectorModal from "./VariableSelectorModal";
import type { WorkflowStep } from "../../types/workflow";
import StepParametersFields from "./StepParametersFields";

// ─── Types ────────────────────────────────────────────────────────────────────

type NodeType =
  | "start" | "end"
  | "condition" | "wait" | "parallel"
  | "call-transfer" | "call-transfer-human" | "call-transfer-ai" | "call-hangup"
  | "fetch-availability" | "fetch-field-value"
  | "send-email" | "send-sms" | "send-whatsapp"
  | "field-update" | "assign-responsible" | "move-stage" | "move-process"
  | "book-appointment" | "reschedule-appointment" | "cancel-appointment"
  | "webhook" | "api";

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
}

// ─── Node Library Definition ──────────────────────────────────────────────────

const NODE_CATEGORIES = [
  {
    id: "logic",
    label: "Logic",
    icon: <GitBranch className="w-3.5 h-3.5" />,
    nodes: [
      { type: "condition" as NodeType, label: "Condition", icon: <GitBranch className="w-4 h-4" />, desc: "Branch based on field values" },
      { type: "wait" as NodeType, label: "Wait / Delay", icon: <Clock className="w-4 h-4" />, desc: "Pause before next step" },
      { type: "parallel" as NodeType, label: "Parallel Branch", icon: <Split className="w-4 h-4" />, desc: "Run multiple paths simultaneously" },
      { type: "end" as NodeType, label: "End Workflow", icon: <XCircle className="w-4 h-4" />, desc: "Terminate the workflow" },
    ],
  },
  {
    id: "call",
    label: "Call Actions",
    icon: <Phone className="w-3.5 h-3.5" />,
    nodes: [
      { type: "call-transfer" as NodeType, label: "Call Transfer", icon: <ArrowRight className="w-4 h-4" />, desc: "Transfer active call" },
      { type: "call-transfer-human" as NodeType, label: "Transfer to Human", icon: <User className="w-4 h-4" />, desc: "Transfer to a phone number" },
      { type: "call-transfer-ai" as NodeType, label: "Transfer to AI", icon: <PhoneForwarded className="w-4 h-4" />, desc: "Transfer to AI agent" },
      { type: "call-hangup" as NodeType, label: "Call Hangup", icon: <PhoneOff className="w-4 h-4" />, desc: "End the active call" },
      { type: "fetch-availability" as NodeType, label: "Fetch Availability", icon: <Eye className="w-4 h-4" />, desc: "Check calendar availability" },
      { type: "fetch-field-value" as NodeType, label: "Fetch Field Value", icon: <Hash className="w-4 h-4" />, desc: "Read a field value" },
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
    id: "crm",
    label: "CRM / EHR",
    icon: <Settings2 className="w-3.5 h-3.5" />,
    nodes: [
      { type: "field-update" as NodeType, label: "Field Update", icon: <Settings2 className="w-4 h-4" />, desc: "Update a field value" },
      { type: "assign-responsible" as NodeType, label: "Assign Responsible", icon: <User className="w-4 h-4" />, desc: "Assign a team member" },
      { type: "move-stage" as NodeType, label: "Move Stage", icon: <ArrowRight className="w-4 h-4" />, desc: "Move contact to another stage" },
      { type: "move-process" as NodeType, label: "Move Process", icon: <Workflow className="w-4 h-4" />, desc: "Move contact to another process" },
    ],
  },
  {
    id: "calendar",
    label: "Calendar",
    icon: <Calendar className="w-3.5 h-3.5" />,
    nodes: [
      { type: "book-appointment" as NodeType, label: "Book Appointment", icon: <Calendar className="w-4 h-4" />, desc: "Book a new appointment" },
      { type: "reschedule-appointment" as NodeType, label: "Reschedule", icon: <Calendar className="w-4 h-4" />, desc: "Reschedule an appointment" },
      { type: "cancel-appointment" as NodeType, label: "Cancel Appointment", icon: <XCircle className="w-4 h-4" />, desc: "Cancel an appointment" },
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
  default:   "#6366f1",
  true:      "#22c55e",
  false:     "#ef4444",
  "branch-0": "#a855f7",
  "branch-1": "#a855f7",
  "branch-2": "#a855f7",
};

const PORT_LABEL: Record<string, string> = {
  default: "",
  true:    "TRUE",
  false:   "FALSE",
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
};

const FALLBACK_NODE_TYPE: NodeType = "wait";

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FlowBuilderTab({
  processName = "Current Process",
  stageName = "Current Stage",
  processes = [],
  currentProcessId,
  workflowSteps = [],
  onWorkflowStepsChange,
}: FlowBuilderTabProps) {
  // Canvas state
  const [nodes, setNodes] = useState<FlowNode[]>([
    { id: "start", type: "start", label: "Start", x: 400, y: 80, config: {} },
  ]);
  const [connections, setConnections] = useState<FlowConnection[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 });

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
        n => n.id === "start" || !n.config?.autoGenerated
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
        stepsInLane.forEach((step, stepIndex) => {
          const existing = prevById.get(step.id);
          const nodeType = STEP_KEY_TO_NODE_TYPE[step.stepKey ?? ""] ?? FALLBACK_NODE_TYPE;

          generatedNodes.push({
            id: step.id,
            type: nodeType,
            label: step.name,
            stepKey: step.stepKey,
            x: existing?.x ?? BASE_X + laneIndex * LANE_X_SPACING,
            y: existing?.y ?? BASE_Y + stepIndex * NODE_Y_SPACING,
            config: {
              ...(step.params ?? {}),
              ...(existing?.config ?? {}),
              autoGenerated: true,
              sourceStepId: step.id,
              lane: laneKey,
            },
          });
        });
      });

      return [...manualNodes, ...generatedNodes];
    });

    setConnections(prevConnections => {
      const manualConnections = prevConnections.filter(c => !c.id.startsWith("auto-"));

      const lanes: Record<"stage" | "incall" | "postcall", WorkflowStep[]> = {
        stage: [],
        incall: [],
        postcall: [],
      };
      workflowSteps.forEach(step => {
        lanes[step.trigger ?? "stage"].push(step);
      });

      const autoConnections: FlowConnection[] = [];
      (["stage", "incall", "postcall"] as const).forEach(laneKey => {
        const stepsInLane = lanes[laneKey];
        stepsInLane.forEach((step, index) => {
          let fromId: string;
          if (index === 0) {
            fromId = "start";
          } else {
            const prevStep = stepsInLane[index - 1];
            // If this step runs in parallel, it shares the same predecessor as prevStep
            // instead of chaining after it.
            fromId = step.executionType === "parallel"
              ? (autoConnections.find(c => c.toId === prevStep.id)?.fromId ?? prevStep.id)
              : prevStep.id;
          }
          autoConnections.push({
            id: `auto-${laneKey}-${step.id}`,
            fromId,
            fromPort: "default",
            toId: step.id,
          });
        });
      });

      return [...manualConnections, ...autoConnections];
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

  const addNode = (type: NodeType) => {
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
    if (node.type === "condition") return [{ port: "true", label: "TRUE" }, { port: "false", label: "FALSE" }];
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
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
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

        const autoNodes = nodes.filter(n => n.config?.autoGenerated);
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
    setConfigNode({ ...node });
  };

  const saveConfig = () => {
    if (!configNode) return;
    updateNode(configNode.id, { label: configNode.label, config: configNode.config });
    // If this is an auto-generated node (backed by a WorkflowStep), sync the params back
    if (configNode.config?.autoGenerated && configNode.config?.sourceStepId && onWorkflowStepsChange) {
      const stepId = configNode.config.sourceStepId as string;
      const { autoGenerated: _a, sourceStepId: _s, lane: _l, ...params } = configNode.config;
      const updatedSteps = workflowSteps.map(step =>
        step.id === stepId ? { ...step, name: configNode.label, params } : step
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

  // ── Config drawer content by type ─────────────────────────────────────────────

  // ── Shared config fields renderer ──────────────────────────────────────────────

  const renderConfigFields = () => {
    if (!configNode) return null;

    // For auto-generated nodes (backed by WorkflowStep), use the shared StepParametersFields component
    if (configNode.config?.autoGenerated && configNode.stepKey) {
      const laneKey = configNode.config?.lane as string | undefined;
      const stepTrigger = laneKey === "incall" ? "incall" : laneKey === "postcall" ? "postcall" : "stage";
      // Build a clean params object by stripping internal canvas fields
      const { autoGenerated: _a, sourceStepId: _s, lane: _l, ...params } = configNode.config;
      return (
        <StepParametersFields
          stepKey={configNode.stepKey}
          params={params}
          onChange={patchConfig}
          processes={processes}
          stepTrigger={stepTrigger}
        />
      );
    }

    // For manually-placed canvas nodes, use inline field helpers
    const cfg = configNode.config;
    const set = (k: string, v: any) => patchConfig({ [k]: v });

    const textField = (label: string, key: string, placeholder = "", multi = false) => (
      <div key={key}>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium">{label}</label>
          <button
            type="button"
            onClick={() => handleVarBtn((v) => set(key, (cfg[key] || "") + v))}
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-primary/8 text-primary hover:bg-primary/15 font-medium transition-colors"
          >
            <Code2 className="w-3 h-3" />+ Variable
          </button>
        </div>
        {multi ? (
          <textarea
            value={cfg[key] || ""}
            onChange={(e) => set(key, e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 bg-input-background border border-input rounded-xl text-sm resize-none h-24"
          />
        ) : (
          <input
            value={cfg[key] || ""}
            onChange={(e) => set(key, e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 bg-input-background border border-input rounded-xl text-sm"
          />
        )}
      </div>
    );

    const select = (label: string, key: string, options: { value: string; label: string }[]) => (
      <div key={key}>
        <label className="block text-sm font-medium mb-1.5">{label}</label>
        <select
          value={cfg[key] || ""}
          onChange={(e) => set(key, e.target.value)}
          className="w-full px-3 py-2 bg-input-background border border-input rounded-xl text-sm"
        >
          <option value="">Select…</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    );

    switch (configNode.type) {
      case "condition":
        return (
          <div className="space-y-4">
            {select("Field Source", "fieldSource", [
              { value: "system", label: "System Fields" },
              { value: "call-log", label: "Call Logs" },
              { value: "appointment", label: "Appointment" },
              { value: "custom", label: "Custom Fields" },
            ])}
            {select("Operator", "operator", [
              { value: "equal_to", label: "Equal To" },
              { value: "not_equal_to", label: "Not Equal To" },
              { value: "includes", label: "Includes" },
              { value: "greater_than", label: "Greater Than" },
              { value: "less_than", label: "Less Than" },
              { value: "is_empty", label: "Is Empty" },
              { value: "is_not_empty", label: "Is Not Empty" },
            ])}
            {textField("Value", "value", "Enter value...")}
          </div>
        );

      case "wait":
        return (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1.5">Duration</label>
                <input
                  type="number"
                  value={cfg.duration || 5}
                  onChange={(e) => set("duration", parseInt(e.target.value) || 1)}
                  min={1}
                  className="w-full px-3 py-2 bg-input-background border border-input rounded-xl text-sm"
                />
              </div>
              {select("Unit", "unit", [
                { value: "seconds", label: "Seconds" },
                { value: "minutes", label: "Minutes" },
                { value: "hours", label: "Hours" },
                { value: "days", label: "Days" },
                { value: "weeks", label: "Weeks" },
                { value: "months", label: "Months" },
              ])}
            </div>
            <p className="text-xs text-muted-foreground">Maximum: 600 seconds</p>
          </div>
        );

      case "parallel":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Number of Branches</label>
              <input
                type="number"
                value={cfg.branchCount || 2}
                min={2}
                max={6}
                onChange={(e) => set("branchCount", Math.min(6, Math.max(2, parseInt(e.target.value) || 2)))}
                className="w-full px-3 py-2 bg-input-background border border-input rounded-xl text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">Each branch runs simultaneously.</p>
          </div>
        );

      case "send-email":
        return (
          <div className="space-y-4">
            {select("Connected Account", "account", [{ value: "default", label: "Default Email Account" }])}
            {textField("Subject", "subject", "Email subject...")}
            {textField("Body", "body", "Email body...", true)}
          </div>
        );

      case "send-sms":
      case "send-whatsapp":
        return (
          <div className="space-y-4">
            {select("Template", "template", [{ value: "default", label: "Default Template" }])}
            {textField("Message", "message", "Message content...", true)}
          </div>
        );

      case "call-transfer-human":
        return (
          <div className="space-y-4">
            {textField("Country Code", "countryCode", "+1")}
            {textField("Phone Number", "phoneNumber", "5551234567")}
            {textField("Transfer Reason", "reason", "e.g. therapy_pricing_requested")}
          </div>
        );

      case "call-transfer":
      case "call-transfer-ai":
        return (
          <div className="space-y-4">
            {select("Transfer Type", "transferType", [{ value: "human", label: "Human" }, { value: "agent", label: "AI Agent" }])}
            {textField("Reason", "reason", "e.g. needs_specialist")}
          </div>
        );

      case "call-hangup":
        return (
          <div className="space-y-4">
            {textField("Hangup Message", "message", "Thank you for calling. Goodbye!", true)}
          </div>
        );

      case "fetch-availability":
        return (
          <div className="space-y-4">
            {select("Calendar User", "user", [{ value: "any", label: "Any Available User" }])}
            {textField("Summary", "summary", "Checking availability for {{ContactName}}...", true)}
          </div>
        );

      case "fetch-field-value":
        return (
          <div className="space-y-4">
            {select("Field", "field", [
              { value: "contact_name", label: "Contact Name" },
              { value: "contact_email", label: "Contact Email" },
              { value: "call_summary", label: "Call Summary" },
              { value: "custom_field_1", label: "Custom Field 1" },
            ])}
            {textField("Reason", "reason", "Why do you need this field?")}
          </div>
        );

      case "field-update":
        return (
          <div className="space-y-4">
            {select("Field Type", "fieldType", [{ value: "system", label: "System Field" }, { value: "custom", label: "Custom Field" }])}
            {textField("Value", "value", "New value...", false)}
          </div>
        );

      case "assign-responsible":
        return (
          <div className="space-y-4">
            {select("Assign To", "user", [
              { value: "user1", label: "John Smith" },
              { value: "user2", label: "Sarah Johnson" },
              { value: "user3", label: "Michael Chen" },
            ])}
          </div>
        );

      case "move-stage":
        return (
          <div className="space-y-4">
            {select("Target Process", "process", processes.map((p: any) => ({ value: p.id, label: p.name })))}
            {select("Target Stage", "stage", (processes.find((p: any) => p.id === cfg.process)?.stages || []).map((s: any) => ({ value: s.id, label: s.name })))}
          </div>
        );

      case "move-process":
        return (
          <div className="space-y-4">
            {select("Target Process", "process", processes.map((p: any) => ({ value: p.id, label: p.name })))}
            {select("Target Stage", "stage", (processes.find((p: any) => p.id === cfg.process)?.stages || []).map((s: any) => ({ value: s.id, label: s.name })))}
          </div>
        );

      case "book-appointment":
      case "reschedule-appointment":
        return (
          <div className="space-y-4">
            {select("Calendar User", "user", [{ value: "any", label: "Any Available User" }])}
            {textField("Notes", "notes", "Additional appointment notes...", true)}
          </div>
        );

      case "cancel-appointment":
        return (
          <div className="space-y-4">
            {textField("Cancellation Reason", "reason", "Reason for cancellation...")}
          </div>
        );

      case "webhook":
        return (
          <div className="space-y-4">
            {textField("Webhook URL", "url", "https://hooks.example.com/endpoint")}
            {textField("Body (JSON)", "body", '{"key": "value"}', true)}
          </div>
        );

      case "api":
        return (
          <div className="space-y-4">
            {textField("API Endpoint", "endpoint", "https://api.example.com/endpoint")}
            {select("Method", "method", [
              { value: "GET", label: "GET" },
              { value: "POST", label: "POST" },
              { value: "PUT", label: "PUT" },
              { value: "PATCH", label: "PATCH" },
            ])}
            {textField("Auth Token", "auth", "Bearer ...")}
            {textField("Body (JSON)", "body", '{"key": "value"}', true)}
          </div>
        );

      default:
        return <p className="text-sm text-muted-foreground">No configuration needed.</p>;
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden bg-muted/20">

      {/* ── LEFT: Node Library ─────────────────────────────────────────────── */}
      <div className="w-60 bg-card border-r border-border flex flex-col flex-shrink-0 overflow-hidden">
        {/* Search */}
        <div className="p-3 border-b border-border">
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
            <div className="w-px h-4 bg-border mx-1" />
            <Button variant="primary" size="sm" onClick={() => {}} className="h-7 text-xs">
              <Save className="w-3 h-3 mr-1" />
              Save
            </Button>
          </div>
        </div>

        {/* Canvas area */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-hidden cursor-default"
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
                        {node.type === "condition" && node.config.value && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {node.config.fieldSource} · {node.config.operator} · {node.config.value}
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
                      {!isStart && isSelected && (!node.config?.autoGenerated || onWorkflowStepsChange) && (
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

      {/* ── RIGHT: Config Drawer ─────────────────────────────────────────────── */}
      {configNode && (
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

            {/* Type-specific fields */}
            {renderConfigFields()}
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

      {/* Variable Selector Modal */}
      <VariableSelectorModal
        isOpen={showVariableModal}
        onClose={() => { setShowVariableModal(false); setActiveVarSetter(null); }}
        onInsert={handleInsertVar}
      />
    </div>
  );
}
