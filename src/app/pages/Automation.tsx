import React, { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "react-router";
import {
  Zap,
  GitBranch,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
  Plus,
  Trash2,
  Search,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  Info,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Sparkles,
  User,
  Calendar,
  Receipt,
  ShieldCheck,
  Check,
  ArrowRight,
  Layers,
  HelpCircle,
  Eye,
  Sliders,
  Pencil,
} from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Tooltip } from "../components/ui/Tooltip";
import StepCatalogDrawer, { StepItem, STEP_ICON_MAP } from "../components/process/StepCatalogDrawer";
import StepDetailDrawer from "../components/process/StepDetailDrawer";
import type { WorkflowStep } from "../types/workflow";
import {
  useAutomationRules,
  AutomationRule,
  AutomationGraphNode,
  EVENT_CATALOG,
  getStoredStageMoves,
  StageMove,
  undoStageMove,
} from "../../lib/useAutomationStore";
import {
  getStoredProcesses,
  Process,
  EntityType,
  Stage,
} from "../../lib/useProcessStore";
import { eventBus } from "../../lib/eventBus";
import { toast } from "sonner";

const ENTITY_CONFIG: Record<
  EntityType,
  { label: string; icon: React.ReactNode; color: string; bg: string }
> = {
  client: {
    label: "Clients",
    icon: <User className="w-4 h-4" />,
    color: "#2563EB",
    bg: "#EFF6FF",
  },
  appointment: {
    label: "Appointments",
    icon: <Calendar className="w-4 h-4" />,
    color: "#059669",
    bg: "#ECFDF5",
  },
  invoice: {
    label: "Invoices",
    icon: <Receipt className="w-4 h-4" />,
    color: "#7C3AED",
    bg: "#F5F3FF",
  },
  insurance: {
    label: "Insurance",
    icon: <ShieldCheck className="w-4 h-4" />,
    color: "#D97706",
    bg: "#FFFBEB",
  },
  claim: {
    label: "Claims",
    icon: <ShieldCheck className="w-4 h-4" />,
    color: "#DC2626",
    bg: "#FEF2F2",
  },
};

export default function Automation() {
  const { rules, createRule, updateRule, deleteRule, toggleRule, refresh } = useAutomationRules();
  const [processes, setProcesses] = useState<Process[]>(() => getStoredProcesses());

  // Filter state
  const [selectedEntity, setSelectedEntity] = useState<EntityType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused" | "needs_attention">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null);

  // Selected node within the active rule canvas
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Canvas zoom & pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Stage Move History drawer state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [stageMoves, setStageMoves] = useState<StageMove[]>([]);

  // Simulation test modal
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simEvent, setSimEvent] = useState("client.created");
  const [simRecordId, setSimRecordId] = useState("rec-test-1");

  useEffect(() => {
    setProcesses(getStoredProcesses());
  }, []);

  // Filtered rules list
  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      if (selectedEntity !== "all" && r.entityType !== selectedEntity) return false;
      if (statusFilter === "active" && !r.enabled) return false;
      if (statusFilter === "paused" && r.enabled) return false;
      if (statusFilter === "needs_attention" && r.health !== "needs_attention" && r.health !== "failed") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = r.name.toLowerCase().includes(q);
        const triggerMatch = (r.trigger.label || r.trigger.event).toLowerCase().includes(q);
        const stageMatch = (r.action.stageName || "").toLowerCase().includes(q);
        if (!nameMatch && !triggerMatch && !stageMatch) return false;
      }
      return true;
    });
  }, [rules, selectedEntity, statusFilter, searchQuery]);

  // Set default active rule
  useEffect(() => {
    if (!activeRuleId && filteredRules.length > 0) {
      setActiveRuleId(filteredRules[0].id);
    } else if (activeRuleId && !rules.some((r) => r.id === activeRuleId) && filteredRules.length > 0) {
      setActiveRuleId(filteredRules[0].id);
    }
  }, [filteredRules, activeRuleId, rules]);

  const activeRule = useMemo(() => {
    return rules.find((r) => r.id === activeRuleId) || filteredRules[0] || null;
  }, [rules, activeRuleId, filteredRules]);

  // Action Step Drawers State
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isStepDetailOpen, setIsStepDetailOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [stepParams, setStepParams] = useState<Record<string, any>>({});
  const [stepTrigger, setStepTrigger] = useState<string>("appointment.booked");
  const [executionType, setExecutionType] = useState<"wait" | "parallel">("wait");
  const [delayValue, setDelayValue] = useState<number>(0);
  const [delayUnit, setDelayUnit] = useState<string>("minutes");

  const ruleActions: WorkflowStep[] = useMemo(() => {
    if (!activeRule) return [];
    if (activeRule.actions && activeRule.actions.length > 0) {
      return activeRule.actions;
    }
    return [
      {
        id: "act-move-stage",
        name: "Assign Process / Stage",
        description: `Move record to ${activeRule.action.stageName || "target stage"}`,
        iconKey: "zap",
        stepKey: "processmovement",
        trigger: activeRule.trigger.event,
        executionType: "wait",
        params: {
          processId: activeRule.action.processId,
          stageId: activeRule.action.stageId,
          processName: activeRule.action.processName,
          stageName: activeRule.action.stageName,
        },
      },
    ];
  }, [activeRule]);

  const handleSelectCatalogStep = (stepItem: StepItem) => {
    setIsCatalogOpen(false);
    const newStep: WorkflowStep = {
      id: `${stepItem.key}-${Date.now()}`,
      name: stepItem.name,
      description: stepItem.desc,
      iconKey: stepItem.iconKey,
      stepKey: stepItem.key,
      trigger: activeRule?.trigger.event || "appointment.booked",
      executionType: "wait",
      delayValue: 0,
      delayUnit: "minutes",
      params:
        stepItem.key === "processmovement" && processes.length > 0
          ? {
              processId: processes[0].id,
              stageId: processes[0].stages[0]?.id,
              processName: processes[0].name,
              stageName: processes[0].stages[0]?.name,
            }
          : stepItem.key === "generate_invoice"
          ? { dueDays: 14, autoSend: false, fee: 150 }
          : {},
    };
    setEditingStep(newStep);
    setEditingStepIndex(null);
    setStepParams(newStep.params || {});
    setStepTrigger(activeRule?.trigger.event || "appointment.booked");
    setExecutionType("wait");
    setDelayValue(0);
    setDelayUnit("minutes");
    setIsStepDetailOpen(true);
  };

  const handleEditStep = (step: WorkflowStep, index: number) => {
    setEditingStep(step);
    setEditingStepIndex(index);
    setStepParams(step.params || {});
    setStepTrigger(step.trigger || activeRule?.trigger.event || "appointment.booked");
    setExecutionType(step.executionType || "wait");
    setDelayValue(step.delayValue || 0);
    setDelayUnit(step.delayUnit || "minutes");
    setIsStepDetailOpen(true);
  };

  const handleSaveStep = () => {
    if (!activeRule || !editingStep) return;

    const updatedStep: WorkflowStep = {
      ...editingStep,
      trigger: stepTrigger,
      executionType,
      delayValue,
      delayUnit,
      params: stepParams,
    };

    let updatedActions: WorkflowStep[];
    const currentActions =
      activeRule.actions && activeRule.actions.length > 0 ? [...activeRule.actions] : [...ruleActions];

    if (editingStepIndex !== null && editingStepIndex >= 0) {
      currentActions[editingStepIndex] = updatedStep;
      updatedActions = currentActions;
    } else {
      updatedActions = [...currentActions, updatedStep];
    }

    let updatedAction = activeRule.action;
    if (updatedStep.stepKey === "processmovement" && updatedStep.params?.stageId) {
      const proc = processes.find((p) => p.id === updatedStep.params?.processId);
      const stg = proc?.stages.find((s) => s.id === updatedStep.params?.stageId);
      if (proc && stg) {
        updatedAction = {
          type: "moveToStage",
          processId: proc.id,
          processName: proc.name,
          stageId: stg.id,
          stageName: stg.name,
        };
      }
    }

    updateRule(activeRule.id, {
      actions: updatedActions,
      action: updatedAction,
      updatedAt: new Date().toISOString(),
    });

    setIsStepDetailOpen(false);
    setEditingStep(null);
    toast.success(`Action "${updatedStep.name}" saved to rule`);
  };

  const handleDeleteStep = (index: number) => {
    if (!activeRule) return;
    const currentActions =
      activeRule.actions && activeRule.actions.length > 0 ? [...activeRule.actions] : [...ruleActions];
    if (currentActions.length <= 1) {
      toast.error("An automation rule must have at least one action step.");
      return;
    }
    const updatedActions = currentActions.filter((_, idx) => idx !== index);
    updateRule(activeRule.id, {
      actions: updatedActions,
      updatedAt: new Date().toISOString(),
    });
    toast.success("Action removed from rule");
  };

  // Handle Pan
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".canvas-node") || (e.target as HTMLElement).closest("button")) {
      return;
    }
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Create new rule
  const handleCreateNewRule = () => {
    const entity: EntityType = selectedEntity === "all" ? "client" : selectedEntity;
    const entityProcesses = processes.filter((p) => (p.entityType || "client") === entity);
    const targetProcess = entityProcesses[0] || processes[0];
    const targetStage = targetProcess?.stages[0];

    const defaultEvents = EVENT_CATALOG[entity] || EVENT_CATALOG.client;
    const defaultEvent = defaultEvents[0];

    try {
      const created = createRule({
        orgId: "default",
        name: `New ${ENTITY_CONFIG[entity].label} Rule`,
        description: `Automates stage transition when ${defaultEvent.label.toLowerCase()}`,
        entityType: entity,
        trigger: {
          event: defaultEvent.event,
          label: defaultEvent.label,
          source: "any",
        },
        action: {
          type: "moveToStage",
          processId: targetProcess?.id || "proc-1",
          stageId: targetStage?.id || "stg-1",
          processName: targetProcess?.name || "Default Process",
          stageName: targetStage?.name || "Initial Stage",
        },
        enabled: true,
        health: "ok",
        graph: {
          nodes: [
            {
              id: "node-1",
              type: "trigger",
              label: defaultEvent.label,
              subtitle: `Trigger on ${defaultEvent.event}`,
              data: { event: defaultEvent.event },
              position: { x: 80, y: 140 },
            },
            {
              id: "node-2",
              type: "action",
              label: "Move to stage",
              subtitle: `${targetProcess?.name} → ${targetStage?.name}`,
              data: { processId: targetProcess?.id, stageId: targetStage?.id },
              position: { x: 380, y: 140 },
            },
          ],
          edges: [
            {
              id: "edge-1",
              source: "node-1",
              target: "node-2",
              label: "Immediate",
            },
          ],
        },
      });
      setActiveRuleId(created.id);
      setSelectedNodeId("node-1");
      toast.success("New automation rule created");
    } catch (err: any) {
      toast.error(err.message || "Failed to create rule");
    }
  };

  // Node details for right config panel
  const selectedNode = useMemo(() => {
    if (!activeRule || !selectedNodeId) return null;
    return activeRule.graph?.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [activeRule, selectedNodeId]);

  // Test Simulation
  const handleRunSimulation = async () => {
    if (!simRecordId) {
      toast.error("Please enter a record ID");
      return;
    }
    try {
      const eventRecordType: EntityType = (simEvent.split(".")[0] as EntityType) || "client";
      const busEvent = await eventBus.emit(simEvent, eventRecordType, simRecordId, {
        simulated: true,
        source: "manual",
      });
      toast.success(`Event "${simEvent}" emitted! Rule engine executed.`);
      setShowSimulateModal(false);
      refresh();
    } catch {
      toast.error("Simulation failed");
    }
  };

  const openHistory = () => {
    setStageMoves(getStoredStageMoves());
    setShowHistoryModal(true);
  };

  return (
    <div className="flex flex-col h-full bg-[#FAFBFD] min-h-screen">
      {/* Top Header */}
      <div className="px-8 py-5 bg-white border-b border-gray-200/80 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
              Global Automation
            </h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Phase 3 Live
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: "DM Sans, sans-serif" }}>
            Visual rule engine connecting lifecycle events directly to entity pipeline stages.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Tooltip text="View audit log of stage movements caused by rules and undo moves if needed.">
            <button
              type="button"
              onClick={openHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              <span>Movement History</span>
            </button>
          </Tooltip>

          <Tooltip text="Simulate emitting a lifecycle event to test rule matching and stage transitions.">
            <button
              type="button"
              onClick={() => setShowSimulateModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100/70 text-purple-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              <Play className="w-3.5 h-3.5 text-purple-600" />
              <span>Test Event</span>
            </button>
          </Tooltip>

          <button
            type="button"
            onClick={handleCreateNewRule}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1E293B] hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Rule</span>
          </button>
        </div>
      </div>

      {/* Main Filter Toolbar */}
      <div className="px-8 py-3 bg-white/70 backdrop-blur-xs border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
        {/* Entity Filter Pills */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl border border-gray-200/80">
          <button
            type="button"
            onClick={() => setSelectedEntity("all")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedEntity === "all"
                ? "bg-white text-blue-700 shadow-2xs border border-gray-200/60 font-bold"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <span>All Entities</span>
          </button>
          {(Object.keys(ENTITY_CONFIG) as EntityType[]).map((ent) => (
            <button
              key={ent}
              type="button"
              onClick={() => setSelectedEntity(ent)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedEntity === ent
                  ? "bg-white text-blue-700 shadow-2xs border border-gray-200/60 font-bold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <span style={{ color: ENTITY_CONFIG[ent].color }}>{ENTITY_CONFIG[ent].icon}</span>
              <span>{ENTITY_CONFIG[ent].label}</span>
            </button>
          ))}
        </div>

        {/* Search & Status Filters */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rules, events, stages..."
              className="pl-8 pr-3 py-1 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-52 placeholder:text-gray-400"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs bg-white text-gray-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="paused">Paused Only</option>
            <option value="needs_attention">Needs Attention</option>
          </select>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Rules List Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col shrink-0">
          <div className="p-3.5 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Rules ({filteredRules.length})
            </span>
            <span className="text-[11px] text-gray-400">Select to inspect</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filteredRules.length === 0 ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-500 font-medium">No rules match your filters</p>
                <button
                  type="button"
                  onClick={handleCreateNewRule}
                  className="mt-3 px-3 py-1 text-xs bg-blue-50 text-blue-700 font-semibold rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Create rule
                </button>
              </div>
            ) : (
              filteredRules.map((rule) => {
                const isSelected = rule.id === activeRule?.id;
                const entInfo = ENTITY_CONFIG[rule.entityType];

                return (
                  <div
                    key={rule.id}
                    onClick={() => {
                      setActiveRuleId(rule.id);
                      setSelectedNodeId(rule.graph?.nodes[0]?.id || null);
                    }}
                    className={`p-3.5 transition-colors cursor-pointer ${
                      isSelected ? "bg-blue-50/60 border-l-3 border-blue-600" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              rule.health === "ok" ? "#10B981" : rule.health === "failed" ? "#EF4444" : "#F59E0B",
                          }}
                          title={`Health: ${rule.health || "ok"}`}
                        />
                        <span className="text-xs font-bold text-gray-900 truncate" style={{ fontFamily: "DM Sans, sans-serif" }}>
                          {rule.name}
                        </span>
                      </div>

                      {/* On / Off Toggle */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRule(rule.id);
                        }}
                        className={`w-7 h-4 rounded-full transition-colors relative cursor-pointer focus:outline-none ${
                          rule.enabled ? "bg-blue-600" : "bg-gray-300"
                        }`}
                        title={rule.enabled ? "Active" : "Paused"}
                      >
                        <span
                          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                            rule.enabled ? "right-0.5" : "left-0.5"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-1">
                      <span className="inline-flex items-center gap-1 font-medium text-gray-700">
                        <span style={{ color: entInfo.color }}>{entInfo.icon}</span>
                        <span>{rule.trigger.label || rule.trigger.event}</span>
                      </span>
                      <span>→</span>
                      <span className="text-blue-700 font-medium truncate">
                        {rule.action.stageName || "Target Stage"}
                      </span>
                    </div>

                    {rule.lastRunAt && (
                      <div className="text-[10px] text-gray-400">
                        Last executed: {new Date(rule.lastRunAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Center Canvas */}
        <div
          className="flex-1 relative bg-[#FAFBFD] overflow-hidden select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ cursor: isPanning ? "grabbing" : "grab" }}
        >
          {/* Subtle Canvas Dot Grid */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#CBD5E1 1px, transparent 1px)",
              backgroundSize: "20px 20px",
              opacity: 0.5,
            }}
          />

          {/* Canvas Floating Top Controls */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white/90 backdrop-blur-xs p-1.5 rounded-xl border border-gray-200 shadow-xs">
            <span className="text-xs font-semibold px-2 text-gray-700 truncate max-w-xs">
              {activeRule ? activeRule.name : "No rule selected"}
            </span>
            <div className="h-4 w-px bg-gray-200" />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.6, z + 0.1))}
              className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
              className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"
              title="Reset View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Transformable Canvas Surface */}
          <div
            className="w-full h-full relative"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "center center",
              transition: isPanning ? "none" : "transform 0.05s ease-out",
            }}
          >
            {activeRule && (
              <div className="absolute top-24 left-24 flex items-center gap-12">
                {/* Node 1: Trigger Node */}
                <div
                  onClick={() => setSelectedNodeId("node-trigger")}
                  className={`canvas-node w-64 bg-white rounded-2xl border transition-all shadow-xs p-4 cursor-pointer relative ${
                    selectedNodeId === "node-trigger" || selectedNodeId?.includes("trigger")
                      ? "ring-2 ring-blue-600 border-blue-500 shadow-md"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      Trigger Event
                    </span>
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    {activeRule.trigger.label || activeRule.trigger.event}
                  </h3>
                  <p className="text-[11px] text-gray-500 line-clamp-2">
                    When this event fires across the {ENTITY_CONFIG[activeRule.entityType].label} domain.
                  </p>

                  {/* Connect port */}
                  <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-xs" />
                </div>

                {/* Arrow connector */}
                <div className="flex items-center text-gray-300 font-bold">
                  <ArrowRight className="w-6 h-6 text-gray-400 animate-pulse" />
                </div>

                {/* Node 2: Optional Condition or Delay Node */}
                {activeRule.conditions && activeRule.conditions.length > 0 && (
                  <>
                    <div
                      onClick={() => setSelectedNodeId("node-condition")}
                      className={`canvas-node w-60 bg-white rounded-2xl border transition-all shadow-xs p-4 cursor-pointer relative ${
                        selectedNodeId === "node-condition"
                          ? "ring-2 ring-amber-500 border-amber-400 shadow-md"
                          : "border-gray-200 hover:border-amber-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          Filter Condition
                        </span>
                        <Filter className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 mb-1">
                        {activeRule.conditions[0].field} {activeRule.conditions[0].op}
                      </h3>
                      <p className="text-[11px] text-gray-500">
                        Value: "{String(activeRule.conditions[0].value)}"
                      </p>
                      <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-amber-500 border-2 border-white shadow-xs" />
                    </div>
                    <div className="flex items-center text-gray-300 font-bold">
                      <ArrowRight className="w-6 h-6 text-gray-400 animate-pulse" />
                    </div>
                  </>
                )}

                {/* Action Nodes Chain */}
                {ruleActions.map((step, idx) => {
                  const isSelected = selectedNodeId === `node-action-${step.id}`;
                  return (
                    <React.Fragment key={step.id || idx}>
                      <div className="flex items-center text-gray-300 font-bold shrink-0">
                        <ArrowRight className="w-6 h-6 text-gray-400" />
                      </div>

                      <div
                        onClick={() => {
                          setSelectedNodeId(`node-action-${step.id}`);
                          handleEditStep(step, idx);
                        }}
                        className={`canvas-node w-68 bg-white rounded-2xl border transition-all shadow-xs p-4 cursor-pointer relative shrink-0 group ${
                          isSelected
                            ? "ring-2 ring-emerald-600 border-emerald-500 shadow-md"
                            : "border-gray-200 hover:border-emerald-400 hover:shadow-sm"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            Step {idx + 1} · {step.stepKey === "processmovement" ? "Move Stage" : "Action"}
                          </span>
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditStep(step, idx);
                              }}
                              className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                              title="Configure step"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {ruleActions.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteStep(idx);
                                }}
                                className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                                title="Remove step"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-2xs">
                            {STEP_ICON_MAP[step.iconKey] || <Zap className="w-3.5 h-3.5" />}
                          </div>
                          <h3 className="text-sm font-bold text-gray-900 truncate" style={{ fontFamily: "Outfit, sans-serif" }}>
                            {step.name}
                          </h3>
                        </div>

                        <p className="text-[11px] text-gray-500 line-clamp-2">
                          {step.stepKey === "processmovement"
                            ? `${step.params?.processName || activeRule.action.processName || "Process"} → ${step.params?.stageName || activeRule.action.stageName || "Stage"}`
                            : step.stepKey === "generate_invoice"
                            ? `Invoice (Draft) · Due in ${step.params?.dueDays || 14} days`
                            : step.stepKey === "scheduleappointment"
                            ? `Book Appointment: ${step.params?.title || "Consultation"}`
                            : step.stepKey === "send_payment" || step.stepKey === "send-invoice"
                            ? `Send payment link via ${step.params?.channel || "WhatsApp"}`
                            : step.description}
                        </p>

                        <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
                          <span>{step.executionType === "parallel" ? "In Parallel" : "Wait (Sequential)"}</span>
                          <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                            Configure <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}

                {/* Add Action Step Button Node */}
                <div className="flex items-center text-gray-300 font-bold shrink-0">
                  <ArrowRight className="w-6 h-6 text-gray-400" />
                </div>

                <button
                  type="button"
                  onClick={() => setIsCatalogOpen(true)}
                  className="canvas-node w-56 h-36 border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50/20 rounded-2xl flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all group shrink-0"
                >
                  <div className="w-9 h-9 rounded-full bg-gray-100 group-hover:bg-blue-100 group-hover:text-blue-600 flex items-center justify-center text-gray-500 mb-2 transition-colors">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-gray-700 group-hover:text-blue-700 transition-colors" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    Add Action Step
                  </span>
                  <span className="text-[11px] text-gray-400 mt-1 line-clamp-2">
                    Invoice, WhatsApp, Appointment, Move stage...
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Configuration Panel */}
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col shrink-0 overflow-y-auto">
          {activeRule ? (
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  Rule Configuration
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete rule "${activeRule.name}"?`)) {
                      deleteRule(activeRule.id);
                      toast.success("Rule deleted");
                    }
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                  title="Delete Rule"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Rule Name & Entity */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Rule Name</label>
                  <input
                    type="text"
                    value={activeRule.name}
                    onChange={(e) => updateRule(activeRule.id, { name: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Entity Domain</label>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700">
                    <span style={{ color: ENTITY_CONFIG[activeRule.entityType].color }}>
                      {ENTITY_CONFIG[activeRule.entityType].icon}
                    </span>
                    <span>{ENTITY_CONFIG[activeRule.entityType].label}</span>
                    <span className="text-[10px] text-gray-400 ml-auto font-normal">Scoped</span>
                  </div>
                </div>
              </div>

              {/* Trigger Settings */}
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 space-y-3">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-blue-900">1. Trigger Event</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Event</label>
                  <select
                    value={activeRule.trigger.event}
                    onChange={(e) => {
                      const found = (EVENT_CATALOG[activeRule.entityType] || []).find((ev) => ev.event === e.target.value);
                      updateRule(activeRule.id, {
                        trigger: {
                          ...activeRule.trigger,
                          event: e.target.value,
                          label: found?.label || e.target.value,
                        },
                      });
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    {(EVENT_CATALOG[activeRule.entityType] || []).map((ev) => (
                      <option key={ev.event} value={ev.event}>
                        {ev.label} ({ev.event})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Chain Steps */}
              <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-900">
                      2. Action Steps ({ruleActions.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCatalogOpen(true)}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-emerald-100/60 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Step
                  </button>
                </div>

                <div className="space-y-2">
                  {ruleActions.map((step, idx) => (
                    <div
                      key={step.id || idx}
                      onClick={() => handleEditStep(step, idx)}
                      className="p-2.5 rounded-lg border border-white bg-white shadow-2xs hover:border-emerald-300 transition-all cursor-pointer flex items-center justify-between gap-2 group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p
                            className="text-xs font-bold text-gray-800 truncate group-hover:text-emerald-700 transition-colors"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          >
                            {step.name}
                          </p>
                          <p className="text-[10px] text-gray-400 truncate">
                            {step.stepKey === "processmovement"
                              ? `${step.params?.stageName || activeRule.action.stageName || "Move Stage"}`
                              : step.stepKey === "generate_invoice"
                              ? "Generate Draft Invoice"
                              : step.stepKey === "scheduleappointment"
                              ? "Schedule Appointment"
                              : step.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditStep(step, idx);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                          title="Configure"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {ruleActions.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteStep(idx);
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Move to Stage Destination Settings */}
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-gray-600" />
                  <span className="text-xs font-bold text-gray-900">3. Primary Stage Destination</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Process</label>
                  <select
                    value={activeRule.action.processId}
                    onChange={(e) => {
                      const proc = processes.find((p) => p.id === e.target.value);
                      const stg = proc?.stages[0];
                      updateRule(activeRule.id, {
                        action: {
                          ...activeRule.action,
                          processId: e.target.value,
                          processName: proc?.name,
                          stageId: stg?.id || "",
                          stageName: stg?.name,
                        },
                      });
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    {processes
                      .filter((p) => (p.entityType || "client") === activeRule.entityType)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Stage</label>
                  <select
                    value={activeRule.action.stageId}
                    onChange={(e) => {
                      const currentProc = processes.find((p) => p.id === activeRule.action.processId);
                      const stg = currentProc?.stages.find((s) => s.id === e.target.value);
                      updateRule(activeRule.id, {
                        action: {
                          ...activeRule.action,
                          stageId: e.target.value,
                          stageName: stg?.name,
                        },
                      });
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    {processes
                      .find((p) => p.id === activeRule.action.processId)
                      ?.stages.map((stg) => (
                        <option key={stg.id} value={stg.id}>
                          {stg.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Status & Health Summary */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        activeRule.health === "ok" ? "#10B981" : activeRule.health === "failed" ? "#EF4444" : "#F59E0B",
                    }}
                  />
                  <span className="text-xs font-semibold text-gray-700 capitalize">
                    {activeRule.health || "Healthy"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => toggleRule(activeRule.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    activeRule.enabled
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {activeRule.enabled ? "Active" : "Paused"}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400 text-xs">Select a rule from the left to configure</div>
          )}
        </div>
      </div>

      {/* Movement History Audit Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-2xl w-full flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  Movement History &amp; Cause Audit
                </h3>
                <p className="text-xs text-gray-500">
                  Detailed timeline of records moved between stages via global automation rules.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 divide-y divide-gray-100">
              {stageMoves.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-xs">No stage movements logged yet.</div>
              ) : (
                stageMoves.map((move) => (
                  <div key={move.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-gray-900 truncate">
                          {move.recordType.toUpperCase()} #{move.recordId}
                        </span>
                        <span>→</span>
                        <span className="text-xs font-bold text-blue-700">{move.toStageName}</span>
                        {move.reverted && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-700 font-semibold">
                            Undone
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Cause: {move.cause.ruleName || move.cause.eventName || "Rule Engine"} ·{" "}
                        {new Date(move.at).toLocaleString()}
                      </div>
                    </div>

                    {!move.reverted && (
                      <button
                        type="button"
                        onClick={() => {
                          undoStageMove(move.id);
                          setStageMoves(getStoredStageMoves());
                          toast.success("Stage move reverted");
                        }}
                        className="px-2.5 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 font-semibold text-gray-700 transition-colors"
                      >
                        Undo
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Simulation Modal */}
      {showSimulateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                Simulate Lifecycle Event
              </h3>
              <p className="text-xs text-gray-500">
                Trigger the event bus to test rule condition matching and stage moves.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Event Name</label>
              <select
                value={simEvent}
                onChange={(e) => setSimEvent(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {Object.entries(EVENT_CATALOG).flatMap(([_, evs]) =>
                  evs.map((e) => (
                    <option key={e.event} value={e.event}>
                      {e.label} ({e.event})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Record ID</label>
              <input
                type="text"
                value={simRecordId}
                onChange={(e) => setSimRecordId(e.target.value)}
                placeholder="e.g. client-101"
                className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setShowSimulateModal(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleRunSimulation}>
                Emit Event &amp; Run
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Step Catalog Drawer */}
      <StepCatalogDrawer
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        onSelectStep={handleSelectCatalogStep}
        title="Add Action Step to Rule"
        subtitle={`Select an action to execute when ${activeRule?.trigger.label || "event"} fires.`}
      />

      {/* Reusable Step Detail Drawer */}
      <StepDetailDrawer
        isOpen={isStepDetailOpen && !!editingStep}
        step={editingStep}
        isCreatingNewStep={editingStepIndex === null}
        processes={processes}
        stepTrigger={stepTrigger}
        onStepTriggerChange={setStepTrigger}
        context="automation"
        entityType={activeRule?.entityType}
        executionType={executionType}
        onExecutionTypeChange={setExecutionType}
        delayValue={delayValue}
        onDelayValueChange={setDelayValue}
        delayUnit={delayUnit}
        onDelayUnitChange={setDelayUnit}
        connectAfterId={undefined}
        onConnectAfterIdChange={() => {}}
        availablePredecessors={[]}
        params={stepParams}
        onParamsChange={(patch) => setStepParams((prev) => ({ ...prev, ...patch }))}
        onBack={() => {
          setIsStepDetailOpen(false);
          if (editingStepIndex === null) {
            setIsCatalogOpen(true);
          }
        }}
        onClose={() => setIsStepDetailOpen(false)}
        onSave={handleSaveStep}
      />
    </div>
  );
}
