import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  GitBranch,
  Zap,
  Sparkles,
  Search,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Clock,
  Edit,
  UserCheck,
  PhoneCall,
  MessageCircle,
  MessageSquare,
  Mail,
  FileText,
  ClipboardList,
  Globe,
  Calendar,
  RefreshCw,
  LayoutGrid,
  Webhook,
  PhoneOff,
  CreditCard,
  Phone,
  Database,
  Lock,
  Plus,
  Trash2,
  Settings2,
  SlidersHorizontal,
  Info,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowRight,
  User,
  ShieldCheck,
  Receipt,
  FileCode,
  Split,
  Volume2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import FlowBuilderTab from "./FlowBuilderTab";
import StepDetailDrawer from "./StepDetailDrawer";
import { Tooltip } from "../ui/Tooltip";
import type { WorkflowStep } from "../../types/workflow";
import {
  isParallelStep,
  createParallelStep,
  appendStepToTree,
  deleteStepFromTree,
  updateStepInTree,
  addBranchToStep,
  removeBranchFromStep,
  reorderStepInTree,
  findStepInTree,
} from "../../../lib/automationTree";
import type {
  Automation,
  AutomationStep,
  AutomationScope,
  EventTriggerType,
} from "../../types/automation";
import { GLOBAL_TRIGGER_CATALOG } from "../../types/automation";
import { toast } from "sonner";
import { getStoredProcesses, isProcessMatchingScopingRules } from "../../../lib/useProcessStore";
import type { ScopingRule } from "../../context/FieldRegistryContext";
import { AdminScopingRulesEditor } from "../../pages/admin/components/AdminScopingRulesEditor";

export const STEP_ALLOWED_TRIGGERS: Record<string, Array<string>> = {
  parallel: ["stage", "incall", "inchat", "postcall"],
  whatsapp: ["stage", "incall", "inchat", "postcall"],
  sms: ["stage", "incall", "inchat", "postcall"],
  email: ["stage", "incall", "inchat", "postcall"],
  "send-invoice": ["stage", "incall", "inchat", "postcall"],
  generate_invoice: ["stage", "postcall"],
  generate_document: ["stage", "postcall"],
  send_payment: ["stage", "incall", "inchat", "postcall"],
  processmovement: ["stage", "inchat", "postcall"],
  update_to_stage: ["stage", "inchat", "postcall"],
  movetonewprocess: ["stage", "inchat", "postcall"],
  endworkflow: ["stage", "inchat", "postcall"],
  fieldupdate: ["stage", "inchat", "postcall"],
  assignhuman: ["stage", "inchat", "postcall"],
  crmupdate: ["stage", "inchat", "postcall"],
  ehrupdate: ["stage", "inchat", "postcall"],
  wh_trigger: ["stage", "inchat", "postcall"],
  webhook_trigger: ["stage", "inchat", "postcall"],
  collectinformation: ["stage", "postcall"],
  scheduleappointment: ["postcall"],
  smartcallanalysis: ["stage", "postcall"],
  greetingphrase: ["incall"],
  bypasstohuman: ["incall"],
  liveintaketicket: ["incall"],
  callaction: ["incall"],
  autohangupsilence: ["incall"],
  idlemessages: ["incall"],
  callhangup: ["incall"],
  fetchavailability: ["incall"],
  fetchfieldvalue: ["incall"],
};

export interface CatalogStepItem {
  key: string;
  name: string;
  desc: string;
  iconKey: string;
  cats: string[];
  popular?: boolean;
  isMoveToStage?: boolean;
  isWait?: boolean;
  isCondition?: boolean;
  outputAlias?: string;
}

export const WORKFLOW_CATALOG_STEPS: CatalogStepItem[] = [
  // Logic & Wait & Conditions
  {
    key: "wait",
    name: "Wait / Delay",
    desc: "Pause execution before running the subsequent actions.",
    iconKey: "clock",
    cats: ["all", "workflow"],
    isWait: true,
  },
  {
    key: "condition",
    name: "Condition Gate",
    desc: "Filter execution based on field conditions or intent match.",
    iconKey: "split",
    cats: ["all", "workflow"],
    isCondition: true,
  },
  {
    key: "parallel",
    name: "Parallel Branches",
    desc: "Run two or more branches simultaneously in parallel.",
    iconKey: "layers",
    cats: ["all", "workflow"],
  },
  {
    key: "update_to_stage",
    name: "Update to stage",
    desc: "Update the stage for a process, appointment, or invoice.",
    iconKey: "gitbranch",
    cats: ["all", "workflow"],
    isMoveToStage: true,
  },
  {
    key: "endworkflow",
    name: "End Workflow",
    desc: "Conclude this workflow execution.",
    iconKey: "x",
    cats: ["all", "workflow"],
  },

  // Records
  {
    key: "generate_invoice",
    name: "Generate Invoice",
    desc: "Generate draft invoice for appointment (strictly idempotent).",
    iconKey: "filetext",
    cats: ["all", "records"],
    popular: true,
    outputAlias: "invoice",
  },
  {
    key: "generate_document",
    name: "Generate Document",
    desc: "Generate document from template for client, process, appointment, or invoice.",
    iconKey: "filetext",
    cats: ["all", "records"],
    popular: true,
  },
  {
    key: "send_payment",
    name: "Send Payment",
    desc: "Send payment link or invoice checkout request.",
    iconKey: "creditcard",
    cats: ["all", "records", "communication"],
  },

  // Communication
  {
    key: "whatsapp",
    name: "WhatsApp",
    desc: "Send pre-configured WhatsApp template message.",
    iconKey: "messagecircle",
    cats: ["all", "communication"],
    popular: true,
  },
  {
    key: "sms",
    name: "SMS",
    desc: "Send SMS text notification.",
    iconKey: "messagesquare",
    cats: ["all", "communication"],
  },
  {
    key: "email",
    name: "Email",
    desc: "Send email notification to contact.",
    iconKey: "mail",
    cats: ["all", "communication"],
  },
  {
    key: "send-invoice",
    name: "Send Invoice",
    desc: "Send invoice link to client via preferred channel.",
    iconKey: "filetext",
    cats: ["all", "communication"],
  },

  // Caller Engagement
  {
    key: "callaction",
    name: "Transfer Call",
    desc: "Transfer active call to a human agent or queue.",
    iconKey: "phonecall",
    cats: ["all", "callerengagement"],
  },
  {
    key: "idlemessages",
    name: "Idle Messages",
    desc: "Speak prompt if caller remains unresponsive.",
    iconKey: "messagesquare",
    cats: ["all", "callerengagement"],
  },
  {
    key: "callhangup",
    name: "Auto Hangup",
    desc: "Automatically end call after interaction concludes.",
    iconKey: "phoneoff",
    cats: ["all", "callerengagement"],
  },

  // Data & Assignment
  {
    key: "fieldupdate",
    name: "Field Update",
    desc: "Update record attributes or custom field values.",
    iconKey: "edit",
    cats: ["all", "data"],
  },
  {
    key: "assignhuman",
    name: "Assign to a Human",
    desc: "Assign a team member to handle this record.",
    iconKey: "usercheck",
    cats: ["all", "data"],
  },

  // Webhook / API
  {
    key: "wh_trigger",
    name: "API Automation",
    desc: "Execute external HTTP REST API request.",
    iconKey: "globe",
    cats: ["all", "webhook"],
  },
  {
    key: "webhook_trigger",
    name: "Webhook Automation",
    desc: "Dispatch event payload to webhook receiver.",
    iconKey: "webhook",
    cats: ["all", "webhook"],
  },
];

const STEP_ICON_MAP: Record<string, React.ReactNode> = {
  clock: <Clock className="w-4 h-4 text-white" />,
  x: <X className="w-4 h-4 text-white" />,
  split: <Split className="w-4 h-4 text-white" />,
  zap: <Zap className="w-4 h-4 text-white" />,
  edit: <Edit className="w-4 h-4 text-white" />,
  usercheck: <UserCheck className="w-4 h-4 text-white" />,
  phonecall: <PhoneCall className="w-4 h-4 text-white" />,
  messagecircle: <MessageCircle className="w-4 h-4 text-white" />,
  messagesquare: <MessageSquare className="w-4 h-4 text-white" />,
  mail: <Mail className="w-4 h-4 text-white" />,
  filetext: <FileText className="w-4 h-4 text-white" />,
  clipboardlist: <ClipboardList className="w-4 h-4 text-white" />,
  globe: <Globe className="w-4 h-4 text-white" />,
  calendar: <Calendar className="w-4 h-4 text-white" />,
  refreshcw: <RefreshCw className="w-4 h-4 text-white" />,
  gitbranch: <GitBranch className="w-4 h-4 text-white" />,
  volume2: <Volume2 className="w-4 h-4 text-white" />,
  webhook: <Webhook className="w-4 h-4 text-white" />,
  phoneoff: <PhoneOff className="w-4 h-4 text-white" />,
  creditcard: <CreditCard className="w-4 h-4 text-white" />,
  layers: <Layers className="w-4 h-4 text-white" />,
  parallel: <Layers className="w-4 h-4 text-white" />,
};

function getTriggerIcon(type: EventTriggerType | "stage") {
  switch (type) {
    case "appointment":
      return <Calendar className="w-4 h-4 text-emerald-600" />;
    case "client":
      return <User className="w-4 h-4 text-blue-600" />;
    case "invoice":
      return <Receipt className="w-4 h-4 text-purple-600" />;
    case "insurance":
      return <ShieldCheck className="w-4 h-4 text-rose-600" />;
    case "stage":
    default:
      return <GitBranch className="w-4 h-4 text-indigo-600" />;
  }
}

export interface AddAutomationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  initialScopingRules?: ScopingRule[];
  onScopingRulesChange?: (rules: ScopingRule[]) => void;
  scope?: AutomationScope; // "stage" | "global" (default "stage" if stageRef passed, else "global")
  defaultView?: "flowbuilder" | "library";
  stageRef?: {
    processId: string;
    stageId: string;
    stageName?: string;
    processName?: string;
  };
  processName?: string;
  stageName?: string;
  stageColor?: string;
  stageType?: string;
  processes?: any[];
  currentProcessId?: string;
  workflowSteps?: WorkflowStep[];
  onWorkflowStepsChange?: (steps: WorkflowStep[]) => void;
  onSaveAutomation?: (automation: Automation) => void;
  initialAutomation?: Automation | null;
  stepAllowedTriggers?: Record<string, Array<string>>;
  initialStepIdToConfigure?: string;
}

export default function AddAutomationDrawer({
  isOpen,
  onClose,
  isAdmin = false,
  initialScopingRules = [],
  onScopingRulesChange,
  scope: propScope,
  defaultView = "library",
  stageRef,
  processName = "Process",
  stageName = "Stage",
  stageColor = "#2563EB",
  stageType,
  processes = [],
  currentProcessId,
  workflowSteps = [],
  onWorkflowStepsChange,
  onSaveAutomation,
  initialAutomation,
  stepAllowedTriggers = STEP_ALLOWED_TRIGGERS,
  initialStepIdToConfigure,
}: AddAutomationDrawerProps) {
  // Scoping rules state (Admin Scope Rule)
  const [drawerScopingRules, setDrawerScopingRules] = useState<ScopingRule[]>(
    initialScopingRules && initialScopingRules.length > 0
      ? initialScopingRules
      : (initialAutomation as any)?.scopingRules || []
  );

  // Determine effective scope and scoped processes
  const allAvailableProcesses = (processes && processes.length > 0) ? processes : getStoredProcesses();
  const effectiveProcesses = useMemo(() => {
    if (!isAdmin || !drawerScopingRules || drawerScopingRules.length === 0) {
      return allAvailableProcesses;
    }
    return allAvailableProcesses.filter((p) =>
      isProcessMatchingScopingRules(p, drawerScopingRules)
    );
  }, [allAvailableProcesses, isAdmin, drawerScopingRules]);

  const effectiveScope: AutomationScope =
    propScope || (stageRef ? "stage" : "global");

  // View state: Canvas View toggle
  const [isCanvasView, setIsCanvasView] = useState(false);

  // Automation Form State
  const [automationName, setAutomationName] = useState("");
  const [automationDescription, setAutomationDescription] = useState("");
  const [automationStatus, setAutomationStatus] = useState<"draft" | "active">("active");

  // Stage Trigger State (Stage Scope)
  const [stageTriggerWhen, setStageTriggerWhen] = useState<"entry" | "exit">("entry");

  // Global Trigger State (Global Scope)
  const [globalTriggerType, setGlobalTriggerType] = useState<EventTriggerType>("client");
  const [globalTriggerEvent, setGlobalTriggerEvent] = useState<string>("client.created");
  const [globalTriggerParams, setGlobalTriggerParams] = useState<Record<string, any>>({});
  const [isChoosingGlobalTrigger, setIsChoosingGlobalTrigger] = useState(false);
  const [triggerSearch, setTriggerSearch] = useState("");

  // Global Stage trigger details
  const [selectedTriggerEntity, setSelectedTriggerEntity] = useState<string>("client");
  const [selectedTriggerProcessId, setSelectedTriggerProcessId] = useState<string>("");
  const [selectedTriggerStageId, setSelectedTriggerStageId] = useState<string>("");
  const [selectedTriggerStageWhen, setSelectedTriggerStageWhen] = useState<"entry" | "exit">("entry");

  // Steps List State
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [addStepTargetBranchId, setAddStepTargetBranchId] = useState<string | null>(null);

  // "Add next step..." popover state
  const [isAddStepOpen, setIsAddStepOpen] = useState(false);
  const [addStepSearch, setAddStepSearch] = useState("");
  const [addStepCategory, setAddStepCategory] = useState("all");

  // Step Detail Drawer state (for configuring parameters)
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [isStepDetailOpen, setIsStepDetailOpen] = useState(false);
  const [stepTrigger, setStepTrigger] = useState("stage");
  const [executionType, setExecutionType] = useState<"wait" | "parallel">("wait");
  const [delayValue, setDelayValue] = useState<number>(0);
  const [delayUnit, setDelayUnit] = useState<string>("minutes");
  const [connectAfterId, setConnectAfterId] = useState<string | undefined>(undefined);
  const [stepParams, setStepParams] = useState<Record<string, any>>({});

  const drawerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const wasOpenRef = useRef(false);

  // Initialize or reset ONLY on drawer open
  useEffect(() => {
    if (isOpen) {
      if (!wasOpenRef.current) {
        setIsCanvasView(defaultView === "flowbuilder");
        setIsAddStepOpen(false);
        setIsChoosingGlobalTrigger(false);
        const initRules =
          initialScopingRules && initialScopingRules.length > 0
            ? initialScopingRules
            : (initialAutomation as any)?.scopingRules || [];
        setDrawerScopingRules(initRules);

        if (initialAutomation) {
          setAutomationName(initialAutomation.name || "");
          setAutomationDescription(initialAutomation.description || "");
          setAutomationStatus(initialAutomation.status || "active");
          if (initialAutomation.trigger.type === "stage") {
            setStageTriggerWhen((initialAutomation.trigger as any).when || "entry");
          } else {
            const trigType = (initialAutomation.trigger as any).type || "client";
            const trigEvt = (initialAutomation.trigger as any).event || "client.created";
            setGlobalTriggerType(trigType);
            setGlobalTriggerEvent(trigEvt);
            setGlobalTriggerParams((initialAutomation.trigger as any).params || {});
          }
          setSteps(
            workflowSteps && workflowSteps.length > 0
              ? workflowSteps
              : (initialAutomation.steps || []).map((s) => ({
                  id: s.id,
                  name: s.name,
                  description: s.description || "",
                  iconKey: s.iconKey || "zap",
                  stepKey: s.stepKey,
                  params: s.params || {},
                  delayValue: s.delay?.value || 0,
                  delayUnit: s.delay?.unit || "minutes",
                  executionType: s.kind === "wait" ? "wait" : "wait",
                }))
          );
        } else {
          const defaultName =
            effectiveScope === "stage"
              ? `On entry: ${stageName}`
              : "New Global Automation";
          setAutomationName(defaultName);
          setAutomationDescription("");
          setAutomationStatus("active");
          setStageTriggerWhen("entry");
          setGlobalTriggerType("client");
          setGlobalTriggerEvent("client.created");
          setSteps(workflowSteps || []);
        }

        if (initialStepIdToConfigure) {
          const stepList = workflowSteps || [];
          const targetStep = stepList.find((s) => s.id === initialStepIdToConfigure);
          if (targetStep) {
            setAutomationName(targetStep.name);
            setAutomationDescription(targetStep.description || "");
            if (targetStep.trigger === "exit_stage") {
              setStageTriggerWhen("exit");
            } else {
              setStageTriggerWhen("entry");
            }
          }
        }
      }
      wasOpenRef.current = true;
    } else {
      wasOpenRef.current = false;
    }
  }, [isOpen, defaultView, initialAutomation, effectiveScope, stageName, workflowSteps, initialStepIdToConfigure, initialScopingRules]);

  // Synchronize steps back to parent when changed
  const updateSteps = (newSteps: WorkflowStep[]) => {
    setSteps(newSteps);
    if (onWorkflowStepsChange) {
      onWorkflowStepsChange(newSteps);
    }
  };

  // Close with Esc key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isStepDetailOpen) {
          setIsStepDetailOpen(false);
        } else if (isAddStepOpen) {
          setIsAddStepOpen(false);
        } else if (isChoosingGlobalTrigger) {
          setIsChoosingGlobalTrigger(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isStepDetailOpen, isAddStepOpen, isChoosingGlobalTrigger, onClose]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsAddStepOpen(false);
      }
    };
    if (isAddStepOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAddStepOpen]);

  // Filter catalog steps by scope and search
  const availableCatalogSteps = useMemo(() => {
    return WORKFLOW_CATALOG_STEPS.filter((s) => {
      // In stage scope, hide move-to-stage steps per PRD section 7.1
      if (effectiveScope === "stage" && s.isMoveToStage) {
        return false;
      }
      const matchesCategory =
        addStepCategory === "all" || s.cats.includes(addStepCategory);
      const matchesSearch =
        addStepSearch.trim() === "" ||
        s.name.toLowerCase().includes(addStepSearch.toLowerCase()) ||
        s.desc.toLowerCase().includes(addStepSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [effectiveScope, addStepCategory, addStepSearch]);

  // Handle adding step
  const handleAddStepFromCatalog = (item: CatalogStepItem) => {
    setIsAddStepOpen(false);

    if (item.key === "parallel") {
      const newParallel = createParallelStep();
      const updated = appendStepToTree(steps, newParallel, addStepTargetBranchId);
      updateSteps(updated);
      setAddStepTargetBranchId(null);
      return;
    }

    const newStep: WorkflowStep = {
      id: `${item.key}-${Date.now()}`,
      name: item.name,
      description: item.desc,
      iconKey: item.iconKey,
      stepKey: item.key,
      trigger: effectiveScope === "stage" ? "stage" : globalTriggerEvent,
      executionType: item.isWait ? "wait" : "wait",
      delayValue: item.isWait ? 15 : 0,
      delayUnit: "minutes",
      params:
        item.key === "generate_invoice"
          ? { dueDays: 14, autoSend: false, fee: 150 }
          : {},
    };

    const updated = appendStepToTree(steps, newStep, addStepTargetBranchId);
    updateSteps(updated);
    setAddStepTargetBranchId(null);

    // Immediately open configuration for the added step
    handleConfigureStep(newStep, updated.length - 1);
  };

  const handleDeleteStepById = (stepId: string) => {
    const found = findStepInTree(steps, stepId);
    if (found && isParallelStep(found.step)) {
      if (!window.confirm("Delete this Parallel Branches node and all steps inside its branches?")) {
        return;
      }
    }
    const updated = deleteStepFromTree(steps, stepId);
    updateSteps(updated);
  };

  const sequentialSteps = useMemo(
    () => steps.filter((s) => !isParallelStep(s)),
    [steps]
  );
  const hasParallelSteps = useMemo(
    () => steps.some((s) => isParallelStep(s)),
    [steps]
  );

  // Open step config
  const handleConfigureStep = (step: WorkflowStep, index: number) => {
    setEditingStep(step);
    setEditingStepIndex(index);
    setStepTrigger(step.trigger || "stage");
    setExecutionType(step.executionType || "wait");
    setDelayValue(step.delayValue || 0);
    setDelayUnit(step.delayUnit || "minutes");
    setConnectAfterId(step.connectAfterId);
    setStepParams(step.params || {});
    setIsStepDetailOpen(true);
  };

  // Save step config
  const handleSaveStepDetail = () => {
    if (!editingStep || editingStepIndex === null) return;
    const updatedStep: WorkflowStep = {
      ...editingStep,
      trigger: stepTrigger,
      executionType,
      delayValue,
      delayUnit,
      connectAfterId: executionType === "wait" ? connectAfterId : undefined,
      params: stepParams,
    };

    const updated = updateStepInTree(steps, editingStep.id, updatedStep);
    updateSteps(updated);
    setIsStepDetailOpen(false);
    setEditingStep(null);
    setEditingStepIndex(null);
    toast.success(`Action "${updatedStep.name}" configured`);
  };

  // Delete step
  const handleDeleteStep = (index: number) => {
    const updated = steps.filter((_, i) => i !== index);
    updateSteps(updated);
    toast.success("Action removed");
  };

  // Save entire automation
  const handleSaveAutomation = (statusToSave?: "draft" | "active") => {
    const finalStatus = statusToSave || automationStatus;
    let finalSteps = [...steps];
    if (initialStepIdToConfigure) {
      const idx = finalSteps.findIndex((s) => s.id === initialStepIdToConfigure);
      if (idx !== -1) {
        finalSteps[idx] = {
          ...finalSteps[idx],
          name: automationName.trim() || finalSteps[idx].name,
          description: automationDescription || finalSteps[idx].description,
          trigger: stageTriggerWhen === "exit" ? "exit_stage" : "stage",
        };
      }
    }
    updateSteps(finalSteps);

    const finalAutomation: Automation = {
      id: initialAutomation?.id || (initialStepIdToConfigure ? `auto-${initialStepIdToConfigure}` : `auto-${Date.now()}`),
      orgId: "default",
      scope: effectiveScope,
      stageRef:
        effectiveScope === "stage"
          ? {
              processId: stageRef?.processId || currentProcessId || "",
              stageId: stageRef?.stageId || "",
              stageName: stageRef?.stageName || stageName,
              processName: stageRef?.processName || processName,
            }
          : undefined,
      name:
        automationName.trim() ||
        (effectiveScope === "stage"
          ? `On ${stageTriggerWhen}: ${stageName}`
          : "Global Automation"),
      description: automationDescription,
      status: finalStatus,
      trigger:
        effectiveScope === "stage"
          ? { type: "stage", when: stageTriggerWhen }
          : {
              type: globalTriggerType,
              event: globalTriggerEvent,
              params: globalTriggerParams,
              stage:
                globalTriggerType === "stage"
                  ? {
                      entity: (selectedTriggerEntity as any) || "client",
                      processId: selectedTriggerProcessId,
                      stageId: selectedTriggerStageId,
                      when: selectedTriggerStageWhen,
                    }
                  : undefined,
            },
      steps: finalSteps.map((s) => ({
        ...s,
        id: s.id,
        kind: s.stepKey === "wait" ? "wait" : s.stepKey === "condition" ? "condition" : "action",
        stepKey: s.stepKey || "action",
        name: s.name,
        description: s.description,
        iconKey: s.iconKey,
        params: s.params || {},
        outputAlias: (s as any).outputAlias,
        branches: (s as any).branches,
        executionType: s.executionType || "wait",
        delay:
          s.delayValue && s.delayValue > 0
            ? { value: s.delayValue, unit: (s.delayUnit as any) || "minutes" }
            : undefined,
      })),
      scopingRules: drawerScopingRules,
      updatedAt: new Date().toISOString(),
    };

    if (onSaveAutomation) {
      onSaveAutomation(finalAutomation);
    }
    toast.success(`Automation "${finalAutomation.name}" saved as ${finalStatus}`);
    onClose();
  };

  if (typeof document === "undefined" || !isOpen) return null;

  // Active global trigger metadata
  const currentGlobalTriggerDef = GLOBAL_TRIGGER_CATALOG.find(
    (t) => t.type === globalTriggerType
  );
  const currentGlobalEventDef = currentGlobalTriggerDef?.events.find(
    (e) => e.event === globalTriggerEvent
  );

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        {/* Dim Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Sliding Drawer Container */}
        <motion.div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className={`relative h-screen bg-white shadow-2xl flex flex-col z-50 border-l border-gray-200 outline-none transition-all duration-300 ${
            isCanvasView
              ? "w-[75vw] min-w-[75vw] max-w-[75vw]"
              : "w-[500px] min-w-[480px] max-w-[540px]"
          }`}
          style={{ fontFamily: "DM Sans, sans-serif" }}
        >
          {/* Header */}
          <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {isCanvasView ? (
                  <button
                    type="button"
                    onClick={() => setIsCanvasView(false)}
                    className="p-1.5 -ml-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
                    title="Return to Automation Library"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to library</span>
                  </button>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                    {effectiveScope === "stage" ? (
                      <GitBranch className="w-4 h-4" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2
                      className="text-base font-bold text-gray-950 truncate"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {isCanvasView ? "Automation Canvas" : initialStepIdToConfigure || initialAutomation ? "Edit Automation" : "Automation Library"}
                    </h2>

                    {/* Scope Chip */}
                    {effectiveScope === "stage" ? (
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white shadow-2xs truncate"
                        style={{ backgroundColor: stageColor || "#2563EB" }}
                      >
                        {stageName} · {processName}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        Global
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Top Right: Close Button */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
          </div>

          {/* Body Content */}
          {isCanvasView ? (
            /* ── Canvas View (Expanded 75vw) ── */
            <div className="flex-1 overflow-hidden relative bg-[#FAFBFD]">
              <FlowBuilderTab
                processName={processName}
                stageName={stageName}
                processes={effectiveProcesses}
                currentProcessId={currentProcessId}
                workflowSteps={steps}
                onWorkflowStepsChange={(newSteps) => updateSteps(newSteps)}
                stepAllowedTriggers={stepAllowedTriggers}
                scope={effectiveScope}
                triggerType={effectiveScope === "global" ? globalTriggerType : "stage"}
                triggerEvent={effectiveScope === "global" ? globalTriggerEvent : stageTriggerWhen}
                triggerLabel={
                  effectiveScope === "global"
                    ? GLOBAL_TRIGGER_CATALOG.flatMap((c) => c.events).find((e) => e.event === globalTriggerEvent)?.label || globalTriggerEvent
                    : (stageTriggerWhen === "exit" ? `On Exit: ${stageName}` : `On Entry: ${stageName}`)
                }
                triggerDescription={
                  effectiveScope === "global"
                    ? GLOBAL_TRIGGER_CATALOG.flatMap((c) => c.events).find((e) => e.event === globalTriggerEvent)?.description
                    : (stageTriggerWhen === "exit" ? `Fires when record moves out of "${stageName}"` : `Fires when record moves into "${stageName}"`)
                }
                triggerIconKey={
                  effectiveScope === "global"
                    ? GLOBAL_TRIGGER_CATALOG.find((c) => c.type === globalTriggerType)?.iconKey || "zap"
                    : "gitbranch"
                }
                onTriggerChange={(trig) => {
                  if (effectiveScope === "global") {
                    setGlobalTriggerType(trig.type as EventTriggerType);
                    setGlobalTriggerEvent(trig.event);
                    if (trig.params) {
                      setGlobalTriggerParams(trig.params);
                    }
                  } else {
                    if (trig.event === "stage.exit") {
                      setStageTriggerWhen("exit");
                    } else if (trig.event === "stage.entry") {
                      setStageTriggerWhen("entry");
                    }
                  }
                }}
                onSave={() => handleSaveAutomation("active")}
              />
            </div>
          ) : (
            /* ── Automation Library Form View ── */
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* 1. Automation Name */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Automation Name
                </label>
                <input
                  type="text"
                  value={automationName}
                  onChange={(e) => setAutomationName(e.target.value)}
                  placeholder={
                    effectiveScope === "stage"
                      ? `On ${stageTriggerWhen === "exit" ? "exit" : "entry"}: ${stageName}`
                      : "e.g. Appointment Confirmation Flow"
                  }
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-gray-900"
                />
              </div>

              {/* 2. Automation Description */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  value={automationDescription}
                  onChange={(e) => setAutomationDescription(e.target.value)}
                  placeholder="Explain why this automation exists and what it accomplishes..."
                  rows={2}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-gray-900 resize-none"
                />
              </div>

              {/* 2b. Admin Scope Rule (Admin Only) */}
              {isAdmin && (
                <div className="space-y-2 p-4 rounded-xl border border-slate-200 bg-slate-50/70 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-blue-600" />
                      <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                        Admin Scope Rule
                      </label>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                        Admin Only
                      </span>
                    </div>
                    {drawerScopingRules.length > 0 && (
                      <span className="text-[11px] font-medium text-blue-600">
                        {drawerScopingRules.length} scope rule{drawerScopingRules.length > 1 ? "s" : ""} active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Define tenant scope rules. Configurations below (processes, appointments, invoices, and fields) will automatically adapt to this scope.
                  </p>
                  <div className="pt-1">
                    <AdminScopingRulesEditor
                      rules={drawerScopingRules}
                      onChange={(newRules) => {
                        setDrawerScopingRules(newRules);
                        onScopingRulesChange?.(newRules);
                      }}
                      showHeader={false}
                    />
                  </div>
                </div>
              )}

              {/* 3. Trigger Configuration */}
              <div className="space-y-3.5">
                {/* 3a. Trigger Category */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
                    <span>Trigger Category</span>
                  </label>
                  {effectiveScope === "stage" ? (
                    <div>
                      <select
                        disabled
                        value="stage"
                        className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50/80 text-gray-600 cursor-not-allowed shadow-2xs"
                      >
                        <option value="stage">Stage</option>
                      </select>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Stage automations are scoped directly to this stage.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <select
                        value={globalTriggerType}
                        onChange={(e) => {
                          const newType = e.target.value as EventTriggerType;
                          setGlobalTriggerType(newType);
                          const catDef = GLOBAL_TRIGGER_CATALOG.find((t) => t.type === newType);
                          if (catDef && catDef.events.length > 0) {
                            setGlobalTriggerEvent(catDef.events[0].event);
                          }
                        }}
                        className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white outline-none focus:border-blue-500 cursor-pointer text-gray-900 shadow-2xs hover:border-gray-300 transition-colors"
                      >
                        {GLOBAL_TRIGGER_CATALOG.map((cat) => (
                          <option key={cat.type} value={cat.type}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-gray-500 mt-1">
                        {currentGlobalTriggerDef?.description ||
                          "Select a category to filter available trigger events."}
                      </p>
                    </div>
                  )}
                </div>

                {/* 3b. Trigger Event */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-blue-600" />
                    <span>Trigger</span>
                  </label>
                  {effectiveScope === "stage" ? (
                    <div className="space-y-1.5">
                      <div className="relative">
                        <select
                          value={stageTriggerWhen}
                          onChange={(e) => {
                            const val = e.target.value as "entry" | "exit";
                            setStageTriggerWhen(val);
                            if (
                              automationName.startsWith("On entry:") ||
                              automationName.startsWith("On exit:") ||
                              automationName.startsWith("On Entry:") ||
                              automationName.startsWith("On Exit:")
                            ) {
                              setAutomationName(`On ${val === "exit" ? "exit" : "entry"}: ${stageName}`);
                            }
                          }}
                          className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white outline-none focus:border-blue-500 cursor-pointer text-gray-900 shadow-2xs hover:border-gray-300 transition-colors"
                        >
                          <option value="entry">On Stage Enter</option>
                          <option value="exit">On Stage Exit</option>
                        </select>
                      </div>
                      <p className="text-[11px] text-gray-500">
                        {stageTriggerWhen === "entry"
                          ? `Fires automatically when a record transitions into "${stageName}".`
                          : `Fires automatically when a record transitions out of "${stageName}".`}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="relative">
                        <select
                          value={globalTriggerEvent}
                          onChange={(e) => {
                            setGlobalTriggerEvent(e.target.value);
                          }}
                          className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white outline-none focus:border-blue-500 cursor-pointer text-gray-900 shadow-2xs hover:border-gray-300 transition-colors"
                        >
                          {(currentGlobalTriggerDef?.events || []).map((evt) => (
                            <option key={evt.event} value={evt.event}>
                              {evt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <p className="text-[11px] text-gray-500">
                        {currentGlobalEventDef?.description ||
                          "Fires automatically when this event occurs."}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Then do these actions (Numbered Step Cards) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                    <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                    <span>Then do these actions ({sequentialSteps.length})</span>
                  </span>
                </div>

                {hasParallelSteps && (
                  <div className="flex items-center justify-between p-3 bg-purple-50/80 border border-purple-200 rounded-xl text-xs text-purple-900 mb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Layers className="w-4 h-4 text-purple-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-purple-900">Parallel branches active</p>
                        <p className="text-[11px] text-purple-700 truncate">
                          Branched workflows are visual — open Flow Builder canvas to view and edit them.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCanvasView(true)}
                      className="px-2.5 py-1 text-[11px] font-bold bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shrink-0 cursor-pointer"
                    >
                      Open Canvas
                    </button>
                  </div>
                )}

                {sequentialSteps.length === 0 ? (
                  <div className="border border-dashed border-gray-200 rounded-xl p-5 text-center text-xs text-gray-500 space-y-1">
                    <p className="font-semibold text-gray-700">No sequential actions added yet</p>
                    <p className="text-[11px]">Click "Add next step" below to start chaining actions.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sequentialSteps.map((step, idx) => {
                      const isHighlighted = initialStepIdToConfigure === step.id;
                      return (
                        <div
                          key={step.id}
                          className={`flex items-center justify-between p-3 bg-white border rounded-xl shadow-2xs transition-all ${
                            isHighlighted
                              ? "border-blue-400 bg-blue-50/25 ring-1 ring-blue-300"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Step Index Bubble */}
                            <div className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                              isHighlighted ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
                            }`}>
                              {idx + 1}
                            </div>

                            {/* Step Icon */}
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs"
                              style={{ backgroundColor: "#2563EB" }}
                            >
                              {STEP_ICON_MAP[step.iconKey] || <Zap className="w-3.5 h-3.5 text-white" />}
                            </div>

                            {/* Step Title & Summary */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-xs font-bold text-gray-900 truncate"
                                  style={{ fontFamily: "DM Sans, sans-serif" }}
                                >
                                  {step.name}
                                </span>
                                {(step as any).outputAlias && (
                                  <span className="text-[9px] font-semibold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                                    Output: {(step as any).outputAlias}
                                  </span>
                                )}
                                {(step.stepKey === "wait" || step.stepKey === "delay") && (
                                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                                    {step.delayValue || step.params?.delayValue || 15}{" "}
                                    {step.delayUnit || step.params?.delayUnit || "minutes"}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-500 truncate">
                                {step.description || "Action configured"}
                              </p>
                            </div>
                          </div>                          {/* Actions: Settings (Gear Box) & Delete */}
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <button
                              type="button"
                              onClick={() => handleConfigureStep(step, idx)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isHighlighted
                                  ? "text-blue-600 bg-blue-100/80 hover:bg-blue-200"
                                  : "text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                              }`}
                              title="Configure parameters"
                              aria-label="Configure parameters"
                            >
                              <Settings2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStepById(step.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Remove action"
                              aria-label="Remove action"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 4. "Add next step..." Trigger & Popover */}
              <div className="relative" ref={popoverRef}>
                <button
                  type="button"
                  onClick={() => {
                    setAddStepTargetBranchId(null);
                    setIsAddStepOpen((v) => !v);
                  }}
                  className="w-full py-2.5 px-4 border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl text-xs font-bold text-gray-600 hover:text-blue-600 transition-colors flex items-center justify-center gap-2 cursor-pointer bg-gray-50/50 hover:bg-blue-50/20"
                >
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>Add next step...</span>
                </button>

                {/* Popover Menu */}
                {isAddStepOpen && (
                  <div className="absolute left-0 bottom-full mb-2 w-full bg-white border border-gray-200 rounded-2xl shadow-xl z-50 p-3 space-y-3 max-h-[380px] flex flex-col">
                    {/* Popover Header & Search */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-gray-900">
                        <span>Select next step</span>
                        <button
                          type="button"
                          onClick={() => setIsAddStepOpen(false)}
                          className="text-gray-400 hover:text-gray-600 p-0.5"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          type="text"
                          value={addStepSearch}
                          onChange={(e) => setAddStepSearch(e.target.value)}
                          placeholder="Search actions, waits, conditions..."
                          className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Category Pills */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
                        {[
                          { key: "all", label: "All" },
                          { key: "workflow", label: "Logic" },
                          { key: "records", label: "Records" },
                          { key: "communication", label: "Comms" },
                          { key: "callerengagement", label: "Voice" },
                          { key: "data", label: "Data" },
                          { key: "webhook", label: "API" },
                        ].map((cat) => (
                          <button
                            key={cat.key}
                            type="button"
                            onClick={() => setAddStepCategory(cat.key)}
                            className={`px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap cursor-pointer transition-colors ${
                              addStepCategory === cat.key
                                ? "bg-[#1E293B] text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Step Options List */}
                    <div className="flex-1 overflow-y-auto divide-y divide-gray-100 pr-1">
                      {availableCatalogSteps.length === 0 ? (
                        <div className="py-6 text-center text-xs text-gray-500">
                          No matching actions found.
                        </div>
                      ) : (
                        availableCatalogSteps.map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => handleAddStepFromCatalog(item)}
                            className="w-full flex items-start gap-3 py-2.5 px-2 hover:bg-blue-50/50 rounded-lg text-left transition-colors cursor-pointer"
                          >
                            <div
                              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5 shadow-2xs"
                              style={{ backgroundColor: "#2563EB" }}
                            >
                              {STEP_ICON_MAP[item.iconKey] || <Zap className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-gray-900">
                                  {item.name}
                                </span>
                                {item.popular && (
                                  <span className="text-[9px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded">
                                    Popular
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-500 line-clamp-1">
                                {item.desc}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer (Automation Library Mode) */}
          {!isCanvasView && (
            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-white flex items-center justify-between">
              {/* Left: Open in flow builder */}
              <button
                type="button"
                onClick={() => setIsCanvasView(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                title="Expand to visual flow builder canvas"
              >
                <GitBranch className="w-4 h-4 text-blue-600" />
                <span>Open in flow builder</span>
              </button>

              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 border border-gray-200 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveAutomation("draft")}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 border border-gray-200 cursor-pointer transition-colors"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveAutomation("active")}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer transition-colors"
                >
                  {initialStepIdToConfigure || initialAutomation ? "Save Changes" : "Save Automation"}
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Step Detail Drawer: Configures ONLY parameters for selected step */}
        {isStepDetailOpen && editingStep && (
          <StepDetailDrawer
            isOpen={isStepDetailOpen}
            step={editingStep}
            isCreatingNewStep={false}
            stepAllowedTriggers={stepAllowedTriggers}
            processes={effectiveProcesses}
            scopingRules={drawerScopingRules}
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
            availablePredecessors={steps.map((s) => ({
              id: s.id,
              label: s.name,
              isParallelGroup: s.executionType === "parallel",
            }))}
            params={stepParams}
            onParamsChange={(patch) =>
              setStepParams((prev) => ({ ...prev, ...patch }))
            }
            onBack={() => setIsStepDetailOpen(false)}
            onClose={() => setIsStepDetailOpen(false)}
            onSave={handleSaveStepDetail}
            onlyParameters={true}
          />
        )}
      </div>
    </AnimatePresence>,
    document.body
  );
}
