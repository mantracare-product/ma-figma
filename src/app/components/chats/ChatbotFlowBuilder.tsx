import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle,
  HelpCircle,
  FileText,
  GitBranch,
  UserCheck,
  Users,
  RefreshCw,
  Tag,
  Clock,
  Bot as BotIcon,
  ArrowLeft,
  Pencil,
  Save,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Hand,
  Activity,
  XCircle,
  X,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Undo2,
  Redo2,
  Check,
  AlertCircle,
  FlaskConical,
  Settings
} from "lucide-react";
import { Button } from "../ui/Button";
import { Tooltip } from "../ui/Tooltip";
import { InfoTooltip } from "../help/InfoTooltip";
import { Bot, ChannelType } from "./ChatbotTab";
import { WhatsappTemplate } from "../../pages/Chats";
import { availableProcesses } from "../ui/ProcessStageSelect";
import TestChatDrawer from "./TestChatDrawer";
import ChatbotAdvanceSettingsDrawer from "./ChatbotAdvanceSettingsDrawer";
import WhatsAppMessagePreview from "./WhatsAppMessagePreview";
import VariablePickerButton from "../process/VariablePickerButton";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ChatbotFlowNode {
  id: string;
  type:
    | "entryRouter"
    | "message"
    | "question"
    | "template"
    | "condition"
    | "assignHuman"
    | "assignTeam"
    | "updateChatStatus"
    | "setTags"
    | "timeDelay";
  position: { x: number; y: number };
  data: Record<string, any>;
  connections: Array<{ toNodeId: string; fromPort?: string }>;
}

interface CanvasNode {
  id: string;
  type: ChatbotFlowNode["type"];
  label: string;
  x: number;
  y: number;
  config: Record<string, any>;
}

interface CanvasConnection {
  id: string;
  fromId: string;
  fromPort: string;
  toId: string;
}

interface ChatbotFlowBuilderProps {
  bot: Bot;
  employees: { id: string; name: string }[];
  templates: WhatsappTemplate[];
  onClose: () => void;
  onSave: (updatedBot: Bot) => void;
}

// ── Node Visual Config ──────────────────────────────────────────────────────

const NODE_STYLE: Record<
  ChatbotFlowNode["type"],
  { bg: string; border: string; text: string; iconBg: string; activeBorder: string }
> = {
  entryRouter: {
    bg: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-400",
    activeBorder: "border-amber-600",
    text: "text-amber-700 dark:text-amber-400",
    iconBg: "bg-amber-100"
  },
  message: {
    bg: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-300",
    activeBorder: "border-blue-500",
    text: "text-blue-700 dark:text-blue-400",
    iconBg: "bg-blue-100"
  },
  question: {
    bg: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-300",
    activeBorder: "border-blue-500",
    text: "text-blue-700 dark:text-blue-400",
    iconBg: "bg-blue-100"
  },
  template: {
    bg: "bg-indigo-50 dark:bg-indigo-950/20",
    border: "border-indigo-300",
    activeBorder: "border-indigo-500",
    text: "text-indigo-700 dark:text-indigo-400",
    iconBg: "bg-indigo-100"
  },
  condition: {
    bg: "bg-violet-50 dark:bg-violet-950/20",
    border: "border-violet-300",
    activeBorder: "border-violet-500",
    text: "text-violet-700 dark:text-violet-400",
    iconBg: "bg-violet-100"
  },
  assignHuman: {
    bg: "bg-indigo-50 dark:bg-indigo-950/20",
    border: "border-indigo-300",
    activeBorder: "border-indigo-500",
    text: "text-indigo-700 dark:text-indigo-400",
    iconBg: "bg-indigo-100"
  },
  assignTeam: {
    bg: "bg-indigo-50 dark:bg-indigo-950/20",
    border: "border-indigo-300",
    activeBorder: "border-indigo-500",
    text: "text-indigo-700 dark:text-indigo-400",
    iconBg: "bg-indigo-100"
  },
  updateChatStatus: {
    bg: "bg-purple-50 dark:bg-purple-950/20",
    border: "border-purple-300",
    activeBorder: "border-purple-500",
    text: "text-purple-700 dark:text-purple-400",
    iconBg: "bg-purple-100"
  },
  setTags: {
    bg: "bg-purple-50 dark:bg-purple-950/20",
    border: "border-purple-300",
    activeBorder: "border-purple-500",
    text: "text-purple-700 dark:text-purple-400",
    iconBg: "bg-purple-100"
  },
  timeDelay: {
    bg: "bg-slate-50 dark:bg-slate-900/20",
    border: "border-slate-300",
    activeBorder: "border-slate-500",
    text: "text-slate-700 dark:text-slate-400",
    iconBg: "bg-slate-200"
  }
};

const PORT_COLOR: Record<string, string> = {
  default: "#6366f1",
  true: "#10b981",
  false: "#ef4444",
  "choice-0": "#a855f7",
  "choice-1": "#a855f7",
  "choice-2": "#a855f7",
  "choice-3": "#a855f7",
  "choice-4": "#a855f7",
  "choice-5": "#a855f7",
  "choice-6": "#a855f7",
  "choice-7": "#a855f7",
  "choice-8": "#a855f7",
  "choice-9": "#a855f7"
};

const NODE_ICONS: Record<ChatbotFlowNode["type"], React.ReactNode> = {
  entryRouter: <Activity className="w-4 h-4 text-amber-600" />,
  message: <MessageCircle className="w-4 h-4 text-blue-600" />,
  question: <HelpCircle className="w-4 h-4 text-blue-600" />,
  template: <FileText className="w-4 h-4 text-indigo-600" />,
  condition: <GitBranch className="w-4 h-4 text-violet-600" />,
  assignHuman: <UserCheck className="w-4 h-4 text-indigo-600" />,
  assignTeam: <Users className="w-4 h-4 text-indigo-600" />,
  updateChatStatus: <RefreshCw className="w-4 h-4 text-purple-600" />,
  setTags: <Tag className="w-4 h-4 text-purple-600" />,
  timeDelay: <Clock className="w-4 h-4 text-slate-650" />
};

const NODE_LABELS: Record<ChatbotFlowNode["type"], string> = {
  entryRouter: "Inbound Message Router",
  message: "Send a Message",
  question: "Ask a Question",
  template: "Send a Template",
  condition: "Set a Condition",
  assignHuman: "Assign to Human",
  assignTeam: "Assign Team",
  updateChatStatus: "Update Chat Status",
  setTags: "Set Tags",
  timeDelay: "Time Delay"
};

const CHANNEL_CLASSES: Record<ChannelType, string> = {
  whatsapp: "bg-green-50 border border-green-200 text-green-700 hover:bg-green-100",
  sms: "bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100",
  website: "bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100"
};

const CHANNEL_LABELS: Record<ChannelType, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  website: "Website"
};

export default function ChatbotFlowBuilder({
  bot,
  employees,
  templates,
  onClose,
  onSave
}: ChatbotFlowBuilderProps) {
  // ── States ────────────────────────────────────────────────────────────────

  const [botName, setBotName] = useState(bot.name || "Untitled Bot");
  const [isEditingName, setIsEditingName] = useState(false);
  const [activeChannels, setActiveChannels] = useState<ChannelType[]>(bot.channels || []);
  const [botActive, setBotActive] = useState(bot.active);

  // Drawer visibility
  const [testDrawerOpen, setTestDrawerOpen] = useState(false);
  const [advanceDrawerOpen, setAdvanceDrawerOpen] = useState(false);

  // Advanced settings (mirrors Bot fields managed outside the canvas)
  const [advanceSettings, setAdvanceSettings] = useState<Partial<import('./ChatbotTab').Bot>>({
    fallbackMessage: bot.fallbackMessage || "",
    businessHoursEnabled: bot.businessHoursEnabled ?? false,
    businessHoursMode: bot.businessHoursMode || "inherit",
    afterHoursPersonId: bot.afterHoursPersonId || "",
    offlineMessage: bot.offlineMessage || "",
    handoffEnabled: bot.handoffEnabled ?? false,
    handoffKeyword: bot.handoffKeyword || "",
    handoffPersonId: bot.handoffPersonId || "",
    appointmentBookingEnabled: bot.appointmentBookingEnabled ?? false,
    appointmentCampaignId: bot.appointmentCampaignId || "",
    appointmentPersonId: bot.appointmentPersonId || "",
    escalationRules: bot.escalationRules || [],
    templateRules: bot.templateRules || [],
    knowledgeBases: bot.knowledgeBases || [],
    aiModelTier: bot.aiModelTier || "standard",
    aiVoiceStyle: bot.aiVoiceStyle || "neutral"
  });

  // Textarea refs for VariablePickerButton cursor insertion
  const messageTextRef = useRef<HTMLTextAreaElement | null>(null);
  const questionTextRef = useRef<HTMLTextAreaElement | null>(null);

  // Canvas
  const [nodes, setNodes] = useState<CanvasNode[]>(() => {
    if (bot.flow && bot.flow.nodes && bot.flow.nodes.length > 0) {
      return bot.flow.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        label: NODE_LABELS[n.type],
        x: n.position.x,
        y: n.position.y,
        config: n.data || {}
      }));
    }
    // Default entryRouter node
    return [
      {
        id: "entry-router",
        type: "entryRouter",
        label: NODE_LABELS["entryRouter"],
        x: 350,
        y: 120,
        config: {
          showReturningStage: true,
          processesOrder: [...availableProcesses],
          excludedProcesses: [],
          newContactPrompt: "Hi! How can I help you today?",
          returningContactPrompt: 'Welcome back! You\'re currently in "{{processName}}" — {{stageName}}.',
          processButtonLabels: {}
        }
      }
    ];
  });

  const [connections, setConnections] = useState<CanvasConnection[]>(() => {
    if (bot.flow && bot.flow.nodes) {
      const conns: CanvasConnection[] = [];
      bot.flow.nodes.forEach((node) => {
        if (node.connections) {
          node.connections.forEach((c, idx) => {
            conns.push({
              id: `conn-${node.id}-${c.toNodeId}-${idx}`,
              fromId: node.id,
              fromPort: c.fromPort || "default",
              toId: c.toNodeId
            });
          });
        }
      });
      return conns;
    }
    return [];
  });

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 });

  const [isHandToolActive, setIsHandToolActive] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingOffset, setDraggingOffset] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Connection Drawing
  const [drawingConn, setDrawingConn] = useState<{
    fromId: string;
    fromPort: string;
    x: number;
    y: number;
  } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Sidebar controls
  const [search, setSearch] = useState("");
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());

  // Config right panel
  const [configNode, setConfigNode] = useState<CanvasNode | null>(null);

  // History for Undo/Redo
  const [history, setHistory] = useState<{ nodes: CanvasNode[]; connections: CanvasConnection[] }[]>([]);
  const [future, setFuture] = useState<{ nodes: CanvasNode[]; connections: CanvasConnection[] }[]>([]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const NODE_W = 220;
  const NODE_H = 72;

  // Space key detection for hand tool
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
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

  // ── History Helpers ────────────────────────────────────────────────────────

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

  // ── Core CRUD ──────────────────────────────────────────────────────────────

  const addNode = (type: ChatbotFlowNode["type"]) => {
    snapshot();
    const id = `node-${type}-${Date.now()}`;

    // Default configuration based on type
    let config: Record<string, any> = {};
    if (type === "message") {
      config = { messageType: "text", text: "Hello! This is a message." };
    } else if (type === "question") {
      config = { questionType: "open", text: "Please enter your response:", buttons: ["Yes", "No"], listItems: [] };
    } else if (type === "template") {
      config = { templateId: templates[0]?.id || "" };
    } else if (type === "condition") {
      config = { conditions: [{ variable: "name", operator: "equals", value: "" }] };
    } else if (type === "assignHuman") {
      config = { employeeId: "" };
    } else if (type === "assignTeam") {
      config = { teamName: "" };
    } else if (type === "updateChatStatus") {
      config = { status: "Open" };
    } else if (type === "setTags") {
      config = { tags: [] };
    } else if (type === "timeDelay") {
      config = { duration: 1, unit: "Minute" };
    }

    const newNode: CanvasNode = {
      id,
      type,
      label: NODE_LABELS[type],
      x: 400 - pan.x / zoom + Math.random() * 40 - 20,
      y: 200 - pan.y / zoom + Math.random() * 40 - 20,
      config
    };

    setNodes((prev) => [...prev, newNode]);
    setSelectedId(id);
  };

  const deleteNode = (id: string) => {
    if (id === "entry-router") return; // Non-deletable
    snapshot();
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setConnections((prev) => prev.filter((c) => c.fromId !== id && c.toId !== id));
    if (selectedId === id) setSelectedId(null);
    if (configNode?.id === id) setConfigNode(null);
  };

  const updateNodeConfig = (id: string, patch: Record<string, any>) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, config: { ...n.config, ...patch } } : n))
    );
    if (configNode && configNode.id === id) {
      setConfigNode((prev) => (prev ? { ...prev, config: { ...prev.config, ...patch } } : null));
    }
  };

  // ── Ports & Routing ────────────────────────────────────────────────────────

  const getOutputPorts = (node: CanvasNode): Array<{ port: string; label: string }> => {
    if (node.type === "question") {
      const qType = node.config.questionType || "open";
      if (qType === "buttons") {
        const buttons = node.config.buttons || [];
        return buttons.map((b: string, i: number) => ({
          port: `choice-${i}`,
          label: b || `Button ${i + 1}`
        }));
      }
      if (qType === "list") {
        const items = node.config.listItems || [];
        return items.map((item: string, i: number) => ({
          port: `choice-${i}`,
          label: item || `Item ${i + 1}`
        }));
      }
      return [{ port: "default", label: "" }];
    }
    if (node.type === "condition") {
      return [
        { port: "true", label: "True / Yes" },
        { port: "false", label: "False / No" }
      ];
    }
    return [{ port: "default", label: "" }];
  };

  const getPortXY = (nodeId: string, port: string, isInput: boolean) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    if (isInput) {
      return { x: node.x + NODE_W / 2, y: node.y };
    }
    const ports = getOutputPorts(node);
    if (ports.length === 1) {
      return { x: node.x + NODE_W / 2, y: node.y + NODE_H };
    }
    const idx = ports.findIndex((p) => p.port === port);
    if (idx === -1) {
      return { x: node.x + NODE_W / 2, y: node.y + NODE_H };
    }
    const spacing = NODE_W / (ports.length + 1);
    return { x: node.x + spacing * (idx + 1), y: node.y + NODE_H };
  };

  // ── Connection Logic ───────────────────────────────────────────────────────

  const addConnection = (fromId: string, fromPort: string, toId: string) => {
    if (fromId === toId) return;
    const exists = connections.some(
      (c) => c.fromId === fromId && c.fromPort === fromPort && c.toId === toId
    );
    if (exists) return;

    snapshot();
    const newConn: CanvasConnection = {
      id: `conn-${fromId}-${toId}-${fromPort}`,
      fromId,
      fromPort,
      toId
    };
    setConnections((prev) => [...prev, newConn]);
  };

  const deleteConnection = (id: string) => {
    snapshot();
    setConnections((prev) => prev.filter((c) => c.id !== id));
  };

  // ── Canvas Interaction ─────────────────────────────────────────────────────

  const canvasToWorld = (screenX: number, screenY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (screenX - rect.left - pan.x) / zoom,
      y: (screenY - rect.top - pan.y) / zoom
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const activeHand = isHandToolActive || isSpacePressed;
    if (e.button === 1 || (e.button === 0 && e.altKey) || (e.button === 0 && activeHand)) {
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
        y: panStart.panY + (e.clientY - panStart.y)
      });
    }
    if (draggingId) {
      const world = canvasToWorld(e.clientX, e.clientY);
      setNodes((prev) =>
        prev.map((n) =>
          n.id === draggingId
            ? { ...n, x: Math.round(world.x - draggingOffset.x), y: Math.round(world.y - draggingOffset.y) }
            : n
        )
      );
    }
    if (drawingConn) {
      setMousePos(canvasToWorld(e.clientX, e.clientY));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingId(null);
    setDrawingConn(null);
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
      y: (rect.height - (maxY - minY) * newZoom) / 2 - minY * newZoom
    });
  };

  const autoArrange = () => {
    snapshot();
    const arranged = [...nodes];
    const startIdx = arranged.findIndex((n) => n.id === "entry-router");
    if (startIdx !== -1) {
      arranged[startIdx] = { ...arranged[startIdx], x: 350, y: 50 };
    }
    let y = 180;
    arranged.forEach((n, i) => {
      if (n.id === "entry-router") return;
      arranged[i] = { ...n, x: 350, y };
      y += 140;
    });
    setNodes(arranged);
  };

  const bezierPath = (x1: number, y1: number, x2: number, y2: number) => {
    const cy = (y1 + y2) / 2;
    return `M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`;
  };

  const onNodeMouseDown = (e: React.MouseEvent, node: CanvasNode) => {
    if ((e.target as HTMLElement).closest("[data-port]")) return;
    e.stopPropagation();
    setSelectedId(node.id);
    if (node.id === "entry-router") return; // Non-draggable
    const world = canvasToWorld(e.clientX, e.clientY);
    setDraggingId(node.id);
    setDraggingOffset({ x: world.x - node.x, y: world.y - node.y });
  };

  // ── Palette Data ───────────────────────────────────────────────────────────

  const PALETTE_SECTIONS = [
    {
      id: "messages",
      label: "Message Nodes",
      collapsible: false,
      nodes: [
        { type: "message" as const, label: "Send a Message", icon: <MessageCircle className="w-4 h-4" />, desc: "Compose Text, Image, Video replies" },
        { type: "question" as const, label: "Ask a Question", icon: <HelpCircle className="w-4 h-4" />, desc: "Collect free text responses or choices" },
        { type: "template" as const, label: "Send a Template", icon: <FileText className="w-4 h-4" />, desc: "Reference pre-approved global templates" },
        { type: "condition" as const, label: "Set a Condition", icon: <GitBranch className="w-4 h-4" />, desc: "Split flow on criteria rules" }
      ]
    },
    {
      id: "operations",
      label: "Operations",
      collapsible: true,
      nodes: [
        { type: "assignHuman" as const, label: "Assign to Human", icon: <UserCheck className="w-4 h-4" />, desc: "Escalate chat thread to human staff" },
        { type: "assignTeam" as const, label: "Assign Team", icon: <Users className="w-4 h-4" />, desc: "Forward thread context to a specific team" },
        { type: "updateChatStatus" as const, label: "Update Chat Status", icon: <RefreshCw className="w-4 h-4" />, desc: "Change context ticket category" },
        { type: "setTags" as const, label: "Set Tags", icon: <Tag className="w-4 h-4" />, desc: "Affix tags filters to caller metadata" },
        { type: "timeDelay" as const, label: "Time Delay", icon: <Clock className="w-4 h-4" />, desc: "Pause flow progression for interval duration" }
      ]
    }
  ];

  const handleSave = () => {
    // 1. Compile nodes into Bot Flow builder formats
    const chatbotNodes: ChatbotFlowNode[] = nodes.map((node) => {
      // Find outbound connections from this node
      const matchingConns = connections.filter((c) => c.fromId === node.id);
      const formattedConns = matchingConns.map((c) => ({
        toNodeId: c.toId,
        fromPort: c.fromPort === "default" ? undefined : c.fromPort
      }));

      return {
        id: node.id,
        type: node.type,
        position: { x: node.x, y: node.y },
        data: node.config,
        connections: formattedConns
      };
    });

    const updatedBot: Bot = {
      ...bot,
      ...advanceSettings,
      name: botName,
      channels: activeChannels,
      active: botActive,
      flow: {
        nodes: chatbotNodes
      }
    };

    onSave(updatedBot);
  };

  const getCleanedTitle = (text: string) => {
    if (!text) return "Unconfigured";
    return text.length > 30 ? text.substring(0, 30) + "..." : text;
  };

  // Compile live in-editor draft of the bot to pass to the test panel in real time
  const draftBot: Bot = {
    ...bot,
    ...advanceSettings,
    name: botName,
    channels: activeChannels,
    active: botActive,
    flow: {
      nodes: nodes.map((node) => {
        const matchingConns = connections.filter((c) => c.fromId === node.id);
        return {
          id: node.id,
          type: node.type,
          position: { x: node.x, y: node.y },
          data: node.config,
          connections: matchingConns.map((c) => ({
            toNodeId: c.toId,
            fromPort: c.fromPort === "default" ? undefined : c.fromPort
          }))
        };
      })
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col bg-slate-50 overflow-hidden select-none">
      {/* ── TOP HEADER ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white z-15 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-lg font-bold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setIsEditingName(false);
                }}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setIsEditingName(false)}
                className="p-1 text-green-600 hover:bg-green-50 rounded"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                {botName}
              </h1>
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-150 transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Channels selection row */}
          <div className="flex items-center gap-2 border-l pl-4 border-gray-200">
            {(["whatsapp", "sms", "website"] as const).map((ch) => {
              const isActive = activeChannels.includes(ch);
              return (
                <button
                  key={ch}
                  type="button"
                  onClick={() => {
                    setActiveChannels((prev) =>
                      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
                    );
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all cursor-pointer ${
                    isActive
                      ? CHANNEL_CLASSES[ch] + " border-transparent scale-[1.02] shadow-sm font-bold"
                      : "bg-white border-gray-200 text-gray-400 hover:bg-gray-50"
                  }`}
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {isActive ? "✓ " : ""}
                  {CHANNEL_LABELS[ch]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span
              className="text-xs text-gray-500 font-semibold uppercase tracking-wider"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Active Status
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={botActive}
                onChange={(e) => setBotActive(e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500" />
            </label>
          </div>

          <button
            type="button"
            onClick={() => setTestDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <FlaskConical className="w-4 h-4" />
            Test Bot
          </button>
          <button
            type="button"
            onClick={() => setAdvanceDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
          <Button variant="primary" size="sm" onClick={handleSave} className="flex items-center gap-1.5 cursor-pointer">
            <Save className="w-4 h-4" />
            Save Flow
          </Button>
        </div>
      </div>

      {/* ── MAIN WORKSPACE ── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* ── LEFT SIDEBAR: Node palette ── */}
        <div className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Add Steps
            </label>
            <input
              type="text"
              placeholder="Search steps..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-gray-50 focus:outline-none focus:bg-white"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {PALETTE_SECTIONS.map((section) => {
              const collapsed = collapsedCats.has(section.id);
              const nodesFiltered = section.nodes.filter(
                (n) =>
                  !search ||
                  n.label.toLowerCase().includes(search.toLowerCase()) ||
                  n.desc.toLowerCase().includes(search.toLowerCase())
              );

              if (nodesFiltered.length === 0) return null;

              return (
                <div key={section.id} className="border-b border-gray-100">
                  {section.collapsible ? (
                    <button
                      onClick={() =>
                        setCollapsedCats((s) => {
                          const n = new Set(s);
                          n.has(section.id) ? n.delete(section.id) : n.add(section.id);
                          return n;
                        })
                      }
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-left cursor-pointer"
                    >
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider font-semibold">
                        {section.label}
                      </span>
                      {collapsed ? (
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                      )}
                    </button>
                  ) : (
                    <div className="px-4 py-2.5">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider font-semibold">
                        {section.label}
                      </span>
                    </div>
                  )}

                  {!collapsed && (
                    <div className="px-2 pb-3 space-y-1">
                      {nodesFiltered.map((n) => (
                        <button
                          key={n.type}
                          onClick={() => addNode(n.type)}
                          className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-50/50 hover:text-blue-600 transition-colors group cursor-pointer"
                        >
                          <span className="flex-shrink-0 p-1.5 rounded-md bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                            {n.icon}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-700 group-hover:text-blue-700 transition-colors">
                              {n.label}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate leading-snug">
                              {n.desc}
                            </p>
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

        {/* ── CENTER CANVAS ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {/* Zoom/Arrange toolbar */}
          <div className="absolute bottom-4 left-4 flex items-center gap-1.5 bg-white rounded-xl border border-gray-200 shadow-lg p-1.5 z-20">
            <button
              onClick={undo}
              disabled={!history.length}
              title="Undo"
              className="p-1.5 rounded hover:bg-gray-150 disabled:opacity-30 transition-colors cursor-pointer"
            >
              <Undo2 className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={redo}
              disabled={!future.length}
              title="Redo"
              className="p-1.5 rounded hover:bg-gray-150 disabled:opacity-30 transition-colors cursor-pointer"
            >
              <Redo2 className="w-4 h-4 text-gray-600" />
            </button>
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <button
              onClick={() => setZoom((z) => Math.min(2, z * 1.2))}
              title="Zoom In"
              className="p-1.5 rounded hover:bg-gray-150 transition-colors cursor-pointer"
            >
              <ZoomIn className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-xs text-gray-500 w-10 text-center font-medium">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.max(0.25, z * 0.8))}
              title="Zoom Out"
              className="p-1.5 rounded hover:bg-gray-150 transition-colors cursor-pointer"
            >
              <ZoomOut className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={fitToScreen}
              title="Fit to Screen"
              className="p-1.5 rounded hover:bg-gray-150 transition-colors cursor-pointer"
            >
              <Maximize2 className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={autoArrange}
              title="Auto Arrange Nodes"
              className="p-1.5 rounded hover:bg-gray-150 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => setIsHandToolActive(!isHandToolActive)}
              title="Hand Tool (Hold Space)"
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                isHandToolActive ? "bg-blue-50 text-blue-600" : "hover:bg-gray-150"
              }`}
            >
              <Hand className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Actual Canvas */}
          <div
            ref={canvasRef}
            className={`flex-1 relative overflow-hidden bg-[#F8FAFC] select-none ${
              isHandToolActive || isSpacePressed ? (isPanning ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
            }`}
            style={{
              background: "radial-gradient(circle, #e2e8f0 1px, transparent 1px) 0 0 / 20px 20px"
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "0 0",
                position: "absolute",
                top: 0,
                left: 0,
                width: 4000,
                height: 3000
              }}
            >
              {/* SVG Connections Overlay */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                {connections.map((conn) => {
                  const from = getPortXY(conn.fromId, conn.fromPort, false);
                  const to = getPortXY(conn.toId, "default", true);
                  const color = PORT_COLOR[conn.fromPort] || "#6366f1";
                  const midX = (from.x + to.x) / 2;
                  const midY = (from.y + to.y) / 2;

                  return (
                    <g key={conn.id}>
                      <path
                        d={bezierPath(from.x, from.y, to.x, to.y)}
                        fill="none"
                        stroke={color}
                        strokeWidth={2.5}
                        strokeOpacity={0.7}
                        markerEnd="url(#arrow-head)"
                      />
                      {/* Clickable zone for deletion */}
                      <path
                        d={bezierPath(from.x, from.y, to.x, to.y)}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={14}
                        className="cursor-pointer pointer-events-stroke"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConnection(conn.id);
                        }}
                      />
                    </g>
                  );
                })}

                <defs>
                  <marker
                    id="arrow-head"
                    markerWidth="8"
                    markerHeight="8"
                    refX="6"
                    refY="3"
                    orient="auto"
                  >
                    <path d="M0,0 L0,6 L8,3 z" fill="#6366f1" />
                  </marker>
                </defs>

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

              {/* Canvas Nodes */}
              {nodes.map((node) => {
                const style = NODE_STYLE[node.type] || NODE_STYLE.message;
                const ports = getOutputPorts(node);
                const isSelected = selectedId === node.id;
                const isEntry = node.type === "entryRouter";

                return (
                  <div
                    key={node.id}
                    style={{
                      position: "absolute",
                      left: node.x,
                      top: node.y,
                      width: NODE_W,
                      zIndex: isSelected ? 10 : 1
                    }}
                    onMouseDown={(e) => onNodeMouseDown(e, node)}
                    onDoubleClick={() => {
                      if (node.type !== "entryRouter" || node.id === "entry-router") {
                        setConfigNode(node);
                      }
                    }}
                  >
                    {/* Input port */}
                    {!isEntry && (
                      <div
                        data-port="input"
                        className="w-3.5 h-3.5 bg-white border-2 border-indigo-500 rounded-full cursor-crosshair absolute left-1/2 -translate-x-1/2 -translate-y-1.5 z-2 transition-all hover:scale-125"
                        onMouseUp={() => {
                          if (drawingConn) {
                            addConnection(drawingConn.fromId, drawingConn.fromPort, node.id);
                          }
                        }}
                      />
                    )}

                    {/* Node floating starting tag for entry point */}
                    {isEntry && (
                      <div className="absolute top-[-26px] left-1/2 -translate-x-1/2 bg-gray-900 text-white font-bold text-[9px] px-2 py-0.5 rounded uppercase tracking-wider shadow-sm flex items-center gap-1 select-none pointer-events-none">
                        <span>Entry Point</span>
                        <div className="absolute bottom-[-3px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-gray-900 rotate-45" />
                      </div>
                    )}

                    {/* Node Card */}
                    <div
                      className={`rounded-xl border-[2px] bg-white shadow-sm transition-all select-none cursor-move ${
                        isEntry ? "border-[3px] " + style.border : style.border
                      } ${
                        isSelected
                          ? `ring-2 ring-blue-500 ring-offset-2 ${style.activeBorder}`
                          : "hover:shadow-md"
                      }`}
                      style={{ minHeight: NODE_H }}
                    >
                      <div className="px-3 py-2.5 flex items-center gap-2.5">
                        <span
                          className={`flex-shrink-0 p-1.5 rounded-lg text-gray-700 ${style.iconBg}`}
                        >
                          {NODE_ICONS[node.type]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-xs font-bold text-gray-800 truncate"
                            style={{ fontFamily: "DM Sans, sans-serif" }}
                          >
                            {node.label}
                          </p>
                          <p
                            className="text-[10px] text-gray-400 truncate mt-0.5"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          >
                            {node.type === "message"
                              ? getCleanedTitle(node.config.text)
                              : node.type === "question"
                              ? getCleanedTitle(node.config.text)
                              : node.type === "template"
                              ? templates.find((t) => t.id === node.config.templateId)?.name ||
                                "Template message"
                              : node.type === "condition"
                              ? `${node.config.conditions?.length || 0} Criteria`
                              : node.type === "assignHuman"
                              ? employees.find((e) => e.id === node.config.employeeId)?.name ||
                                "Unassigned"
                              : node.type === "assignTeam"
                              ? node.config.teamName || "Unassigned"
                              : node.type === "timeDelay"
                              ? `${node.config.duration} ${node.config.unit}`
                              : "Double-click to set params"}
                          </p>
                        </div>

                        {/* Node Actions */}
                        {!isEntry && isSelected && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNode(node.id);
                            }}
                            className="flex-shrink-0 p-0.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {isSelected && (
                        <div
                          className="px-3 pb-2 text-[10px] text-blue-500 font-semibold cursor-pointer hover:text-blue-700"
                          onClick={() => setConfigNode(node)}
                        >
                          Double-click to configure →
                        </div>
                      )}
                    </div>

                    {/* Output ports */}
                    <div className="absolute bottom-[-7px] left-0 right-0 flex justify-around pointer-events-none">
                      {ports.map((p, idx) => {
                        const color = PORT_COLOR[p.port] || "#6366f1";
                        return (
                          <div
                            key={p.port}
                            data-port={p.port}
                            className="w-3.5 h-3.5 bg-white border-2 rounded-full cursor-crosshair relative transition-all hover:scale-125 pointer-events-auto"
                            style={{ borderColor: color }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const pos = getPortXY(node.id, p.port, false);
                              setDrawingConn({
                                fromId: node.id,
                                fromPort: p.port,
                                x: pos.x,
                                y: pos.y
                              });
                              setMousePos(pos);
                            }}
                          >
                            {p.label && (
                              <span
                                className="absolute top-[16px] left-1/2 -translate-x-1/2 text-[8px] font-bold tracking-tight bg-white/80 px-1 py-0.5 rounded border border-gray-100"
                                style={{ color }}
                              >
                                {p.label}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── RIGHT CONFIG PANEL ── */}
        {configNode && (
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0 overflow-hidden shadow-lg z-15">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-150 flex-shrink-0 bg-slate-50">
              <div>
                <p className="text-sm font-bold text-gray-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  Configure Step
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{configNode.label}</p>
              </div>
              <button
                type="button"
                onClick={() => setConfigNode(null)}
                className="p-1 rounded hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Config Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* ENTRY ROUTER CONFIG */}
              {configNode.type === "entryRouter" && (
                <div className="space-y-6">
                  {/* Greeting Prompts */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Greeting Prompts
                    </h3>
                    
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                        New Contact greeting
                      </label>
                      <textarea
                        rows={2}
                        value={configNode.config.newContactPrompt ?? "Hi! How can I help you today?"}
                        onChange={(e) =>
                          updateNodeConfig(configNode.id, {
                            newContactPrompt: e.target.value
                          })
                        }
                        placeholder="Type new contact greeting..."
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500 resize-none text-gray-700 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                        Returning Contact Prompt Template
                      </label>
                      <textarea
                        rows={3}
                        value={configNode.config.returningContactPrompt ?? 'Welcome back! You\'re currently in "{{processName}}" — {{stageName}}.'}
                        onChange={(e) =>
                          updateNodeConfig(configNode.id, {
                            returningContactPrompt: e.target.value
                          })
                        }
                        placeholder="Use {{processName}} and {{stageName}} for dynamic inserts."
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500 resize-none text-gray-700 bg-white"
                      />
                    </div>
                  </div>

                  {/* Section A: Returning Clients */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Returning Clients
                    </h3>
                    <p className="text-[11px] text-gray-400 leading-normal" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Configure how bot responds to returning contacts with active stages.
                    </p>
                    <label className="flex items-center justify-between bg-slate-50 border p-3 rounded-xl cursor-pointer">
                      <span className="text-xs font-semibold text-gray-700">
                        Suggest current stage
                      </span>
                      <input
                        type="checkbox"
                        checked={configNode.config.showReturningStage !== false}
                        onChange={(e) =>
                          updateNodeConfig(configNode.id, {
                            showReturningStage: e.target.checked
                          })
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  </div>

                  {/* Section B: Process Picker Order */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Process Options List
                    </h3>
                    <p className="text-[11px] text-gray-400 leading-normal" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Choose which processes are offered as buttons to new contacts. Drag handles to reorder.
                    </p>

                    <div className="space-y-2">
                      {(configNode.config.processesOrder || availableProcesses).map(
                        (procName: string, procIdx: number) => {
                          const isExcluded = (configNode.config.excludedProcesses || []).includes(
                            procName
                          );
                          return (
                            <div
                              key={procName}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData("text/plain", procIdx.toString());
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                const dragIdxStr = e.dataTransfer.getData("text/plain");
                                if (dragIdxStr === "") return;
                                const dragIdx = parseInt(dragIdxStr, 10);
                                if (dragIdx === procIdx) return;
                                const list = [...(configNode.config.processesOrder || availableProcesses)];
                                const [draggedItem] = list.splice(dragIdx, 1);
                                list.splice(procIdx, 0, draggedItem);
                                updateNodeConfig(configNode.id, { processesOrder: list });
                              }}
                              className="p-3 border rounded-xl bg-white text-xs hover:bg-slate-50/50 transition-colors cursor-grab active:cursor-grabbing space-y-2 shadow-sm"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <GripVertical className="w-3.5 h-3.5 text-gray-400 cursor-row-resize flex-shrink-0" />
                                  <span className={isExcluded ? "text-gray-400 line-through font-medium" : "text-gray-750 font-semibold"}>
                                    {procName}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const excluded = configNode.config.excludedProcesses || [];
                                    const updated = excluded.includes(procName)
                                      ? excluded.filter((p: string) => p !== procName)
                                      : [...excluded, procName];
                                    updateNodeConfig(configNode.id, { excludedProcesses: updated });
                                  }}
                                  className={`text-[10px] px-2 py-0.5 rounded font-bold transition-all ${
                                    isExcluded
                                      ? "bg-slate-100 text-gray-400 hover:bg-slate-200"
                                      : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                  }`}
                                >
                                  {isExcluded ? "Show" : "Exclude"}
                                </button>
                              </div>

                              {!isExcluded && (
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                    Display Label for Option Button
                                  </label>
                                  <input
                                    type="text"
                                    value={configNode.config.processButtonLabels?.[procName] ?? ""}
                                    onChange={(e) => {
                                      const currentLabels = configNode.config.processButtonLabels || {};
                                      updateNodeConfig(configNode.id, {
                                        processButtonLabels: {
                                          ...currentLabels,
                                          [procName]: e.target.value
                                        }
                                      });
                                    }}
                                    placeholder={`Default: ${procName}`}
                                    className="w-full px-2.5 py-1 border border-gray-200 rounded-lg text-xs bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SEND MESSAGE CONFIG */}
              {configNode.type === "message" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                      Message Type
                    </label>
                    <select
                      value={configNode.config.messageType || "text"}
                      onChange={(e) => updateNodeConfig(configNode.id, { messageType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                    >
                      <option value="text">Text Message</option>
                      <option value="image">Image Attachment</option>
                      <option value="video">Video Attachment</option>
                      <option value="audio">Audio Attachment</option>
                      <option value="document">Document Attachment</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                        {configNode.config.messageType === "text" ? "Message Body Text" : "Caption / Body Text"}
                      </label>
                      <VariablePickerButton
                        targetRef={messageTextRef}
                        value={configNode.config.text || ""}
                        onChange={(v) => updateNodeConfig(configNode.id, { text: v })}
                        label="{x}"
                        moduleFilter={["client", "process"]}
                        mode="insert"
                      />
                    </div>
                    <textarea
                      ref={messageTextRef}
                      rows={4}
                      value={configNode.config.text || ""}
                      onChange={(e) => updateNodeConfig(configNode.id, { text: e.target.value })}
                      placeholder="Type chatbot reply..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500 resize-none text-gray-700 bg-white"
                    />
                  </div>

                  {configNode.config.messageType !== "text" && (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Media Asset URL
                      </label>
                      <input
                        type="url"
                        value={configNode.config.mediaUrl || ""}
                        onChange={(e) => updateNodeConfig(configNode.id, { mediaUrl: e.target.value })}
                        placeholder="https://example.com/file.jpg"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-700 bg-white"
                      />
                      {configNode.config.messageType === "document" && (
                        <input
                          type="text"
                          value={configNode.config.fileName || ""}
                          onChange={(e) => updateNodeConfig(configNode.id, { fileName: e.target.value })}
                          placeholder="File display name (e.g. Invoice.pdf)"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-700 bg-white"
                        />
                      )}
                    </div>
                  )}

                  {/* Live WhatsApp-style preview */}
                  <WhatsAppMessagePreview
                    botName={botName}
                    messageType={configNode.config.messageType || "text"}
                    text={configNode.config.text || ""}
                    mediaUrl={configNode.config.mediaUrl}
                    fileName={configNode.config.fileName}
                  />
                </div>
              )}

              {/* ASK QUESTION CONFIG */}
              {configNode.type === "question" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                      Question Type
                    </label>
                    <select
                      value={configNode.config.questionType || "open"}
                      onChange={(e) => updateNodeConfig(configNode.id, { questionType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                    >
                      <option value="open">Open Question (free text)</option>
                      <option value="buttons">Buttons (max 3 choices)</option>
                      <option value="list">List (max 10 choices)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Question Prompt Text
                      </label>
                      <VariablePickerButton
                        targetRef={questionTextRef}
                        value={configNode.config.text || ""}
                        onChange={(v) => updateNodeConfig(configNode.id, { text: v })}
                        label="{x}"
                        moduleFilter={["client", "process"]}
                        mode="insert"
                      />
                    </div>
                    <textarea
                      ref={questionTextRef}
                      rows={3}
                      value={configNode.config.text || ""}
                      onChange={(e) => updateNodeConfig(configNode.id, { text: e.target.value })}
                      placeholder="Type question prompt..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500 resize-none text-gray-700 bg-white"
                    />
                  </div>

                  {configNode.config.questionType === "buttons" && (
                    <div className="space-y-3 pt-2">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Button Choices
                      </label>
                      {(configNode.config.buttons || []).map((btn: string, idx: number) => (
                        <div key={idx} className="flex gap-2">
                          <input
                            type="text"
                            value={btn}
                            onChange={(e) => {
                              const list = [...configNode.config.buttons];
                              list[idx] = e.target.value;
                              updateNodeConfig(configNode.id, { buttons: list });
                            }}
                            placeholder={`Choice ${idx + 1}`}
                            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const list = (configNode.config.buttons || []).filter(
                                (_: any, i: number) => i !== idx
                              );
                              updateNodeConfig(configNode.id, { buttons: list });
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {(configNode.config.buttons || []).length < 3 && (
                        <button
                          type="button"
                          onClick={() => {
                            const list = [...(configNode.config.buttons || []), ""];
                            updateNodeConfig(configNode.id, { buttons: list });
                          }}
                          className="w-full py-1.5 border border-dashed text-[11px] font-bold text-blue-600 rounded-lg hover:bg-blue-50/50"
                        >
                          + Add Button Choice
                        </button>
                      )}
                    </div>
                  )}

                  {configNode.config.questionType === "list" && (
                    <div className="space-y-3 pt-2">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                        List Options
                      </label>
                      {(configNode.config.listItems || []).map((item: string, idx: number) => (
                        <div key={idx} className="flex gap-2">
                          <input
                            type="text"
                            value={item}
                            onChange={(e) => {
                              const list = [...configNode.config.listItems];
                              list[idx] = e.target.value;
                              updateNodeConfig(configNode.id, { listItems: list });
                            }}
                            placeholder={`Item ${idx + 1}`}
                            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const list = (configNode.config.listItems || []).filter(
                                (_: any, i: number) => i !== idx
                              );
                              updateNodeConfig(configNode.id, { listItems: list });
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded animate-none cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {(configNode.config.listItems || []).length < 10 && (
                        <button
                          type="button"
                          onClick={() => {
                            const list = [...(configNode.config.listItems || []), ""];
                            updateNodeConfig(configNode.id, { listItems: list });
                          }}
                          className="w-full py-1.5 border border-dashed text-[11px] font-bold text-blue-600 rounded-lg hover:bg-blue-50/50"
                        >
                          + Add List Option
                        </button>
                      )}
                    </div>
                  )}
                  {/* Live WhatsApp-style preview for question node */}
                  <WhatsAppMessagePreview
                    botName={botName}
                    text={configNode.config.text || ""}
                    buttons={configNode.config.questionType === "buttons" ? (configNode.config.buttons || []) : undefined}
                    listItems={configNode.config.questionType === "list" ? (configNode.config.listItems || []) : undefined}
                  />
                </div>
              )}

              {/* WHATSAPP TEMPLATE CONFIG */}
              {configNode.type === "template" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                      Choose Global Template
                    </label>
                    <select
                      value={configNode.config.templateId || ""}
                      onChange={(e) => updateNodeConfig(configNode.id, { templateId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                    >
                      <option value="">Select template...</option>
                      {templates.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* SET CONDITION CONFIG */}
              {configNode.type === "condition" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-gray-650 uppercase tracking-wider">
                      IF Condition Block
                    </label>
                  </div>

                  {(configNode.config.conditions || []).map((cond: any, idx: number) => (
                    <div key={idx} className="p-3 border rounded-xl bg-slate-50 space-y-2 relative">
                      <button
                        type="button"
                        onClick={() => {
                          const list = (configNode.config.conditions || []).filter(
                            (_: any, i: number) => i !== idx
                          );
                          updateNodeConfig(configNode.id, { conditions: list });
                        }}
                        className="absolute top-2 right-2 text-gray-400 hover:text-red-500 rounded p-1 hover:bg-red-50"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">
                          Variable
                        </label>
                        <select
                          value={cond.variable || "name"}
                          onChange={(e) => {
                            const list = [...configNode.config.conditions];
                            list[idx] = { ...list[idx], variable: e.target.value };
                            updateNodeConfig(configNode.id, { conditions: list });
                          }}
                          className="w-full px-2 py-1 bg-white border border-gray-200 rounded text-xs"
                        >
                          <option value="name">Client Name</option>
                          <option value="email">Client Email</option>
                          <option value="phone">Client Phone</option>
                          <option value="status">Client Status</option>
                          <option value="country">Country</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">
                          Operator
                        </label>
                        <select
                          value={cond.operator || "equals"}
                          onChange={(e) => {
                            const list = [...configNode.config.conditions];
                            list[idx] = { ...list[idx], operator: e.target.value };
                            updateNodeConfig(configNode.id, { conditions: list });
                          }}
                          className="w-full px-2 py-1 bg-white border border-gray-200 rounded text-xs"
                        >
                          <option value="equals">Equals</option>
                          <option value="contains">Contains</option>
                          <option value="starts_with">Starts With</option>
                          <option value="ends_with">Ends With</option>
                          <option value="is_empty">Is Empty</option>
                        </select>
                      </div>

                      {cond.operator !== "is_empty" && (
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1">
                            Value
                          </label>
                          <input
                            type="text"
                            value={cond.value || ""}
                            onChange={(e) => {
                              const list = [...configNode.config.conditions];
                              list[idx] = { ...list[idx], value: e.target.value };
                              updateNodeConfig(configNode.id, { conditions: list });
                            }}
                            placeholder="criteria filter..."
                            className="w-full px-2 py-1 bg-white border border-gray-200 rounded text-xs"
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      const list = [
                        ...(configNode.config.conditions || []),
                        { variable: "name", operator: "equals", value: "" }
                      ];
                      updateNodeConfig(configNode.id, { conditions: list });
                    }}
                    className="w-full py-1.5 border border-dashed text-[11px] font-bold text-blue-600 rounded-lg hover:bg-blue-50/50"
                  >
                    + Add criteria rule
                  </button>
                </div>
              )}

              {/* ASSIGN HUMAN CONFIG */}
              {configNode.type === "assignHuman" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                      Assign routed contacts to
                    </label>
                    <select
                      value={configNode.config.employeeId || ""}
                      onChange={(e) => updateNodeConfig(configNode.id, { employeeId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                    >
                      <option value="">Select team member...</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* ASSIGN TEAM CONFIG */}
              {configNode.type === "assignTeam" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                      Team Name identifier
                    </label>
                    <input
                      type="text"
                      value={configNode.config.teamName || ""}
                      onChange={(e) => updateNodeConfig(configNode.id, { teamName: e.target.value })}
                      placeholder="e.g. Billing department"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white"
                    />
                  </div>
                </div>
              )}

              {/* UPDATE CHAT STATUS CONFIG */}
              {configNode.type === "updateChatStatus" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                      New status category
                    </label>
                    <select
                      value={configNode.config.status || "Open"}
                      onChange={(e) => updateNodeConfig(configNode.id, { status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                    >
                      <option>Open</option>
                      <option>Resolved</option>
                      <option>Pending</option>
                    </select>
                  </div>
                </div>
              )}

              {/* SET TAGS CONFIG */}
              {configNode.type === "setTags" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                      Tag Chips list
                    </label>
                    <p className="text-[10px] text-gray-400 mb-2 leading-relaxed">
                      Comma separated tags to affix onto target contact records.
                    </p>
                    <input
                      type="text"
                      value={(configNode.config.tags || []).join(", ")}
                      onChange={(e) => {
                        const splitted = e.target.value.split(",").map((s) => s.trim());
                        updateNodeConfig(configNode.id, { tags: splitted });
                      }}
                      placeholder="Support, VIP, High Priority"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-800"
                    />
                  </div>
                </div>
              )}

              {/* TIME DELAY CONFIG */}
              {configNode.type === "timeDelay" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                        Duration
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={configNode.config.duration || 1}
                        onChange={(e) =>
                          updateNodeConfig(configNode.id, {
                            duration: parseInt(e.target.value) || 1
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                        Unit
                      </label>
                      <select
                        value={configNode.config.unit || "Minute"}
                        onChange={(e) => updateNodeConfig(configNode.id, { unit: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                      >
                        <option>Minute</option>
                        <option>Hour</option>
                        <option>Day</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Config Footer */}
            <div className="p-4 border-t border-gray-250 bg-slate-50 flex gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfigNode(null)}
                className="flex-1 text-xs"
              >
                Done
              </Button>
            </div>
          </div>
        )}

      </div>

      {/* ── TEST CHAT DRAWER ── */}
      <TestChatDrawer
        isOpen={testDrawerOpen}
        onClose={() => setTestDrawerOpen(false)}
        bot={draftBot}
        employees={employees}
        templates={templates}
      />

      {/* ── ADVANCED SETTINGS DRAWER ── */}
      <ChatbotAdvanceSettingsDrawer
        isOpen={advanceDrawerOpen}
        onClose={() => setAdvanceDrawerOpen(false)}
        bot={{ ...bot, ...advanceSettings } as import('./ChatbotTab').Bot}
        onChange={(patch) => setAdvanceSettings((prev) => ({ ...prev, ...patch }))}
        employees={employees}
        campaigns={[]}
        templates={templates}
      />
    </div>
  );
}
