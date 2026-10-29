import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  GitBranch,
  Zap,
  Sparkles,
  Workflow,
  Search,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Clock,
  Edit,
  Pencil,
  Check,
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
import { HowItWorksModal, HowItWorksButton } from "../help/HowItWorksModal";
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
import { AdminControlAccordion } from "../../pages/admin/components/AdminControlAccordion";

export const STEP_ALLOWED_TRIGGERS: Record<string, Array<string>> = {
  condition: ["stage", "incall", "inchat", "postcall"],
  wait: ["stage", "incall", "inchat", "postcall"],
  parallel: ["stage", "incall", "inchat", "postcall"],
  whatsapp: ["stage", "incall", "inchat", "postcall"],
  sms: ["stage", "incall", "inchat", "postcall"],
  email: ["stage", "incall", "inchat", "postcall"],
  "send-invoice": ["stage", "incall", "inchat", "postcall"],
  generate_invoice: ["stage", "postcall"],
  generate_document: ["stage", "postcall"],
  send_payment: ["stage", "incall", "inchat", "postcall"],
  processmovement: ["stage", "inchat", "postcall"],
  assign_process: ["stage", "inchat", "postcall"],
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
  // Create CRM Entities
  {
    key: "create_appointment",
    name: "Create Appointment",
    desc: "Create and schedule a new appointment record in CRM.",
    iconKey: "calendar",
    cats: ["all", "crm", "workflow"],
  },
  {
    key: "create_client",
    name: "Create Client",
    desc: "Create a new contact or client record in CRM.",
    iconKey: "usercheck",
    cats: ["all", "crm", "data"],
  },
  {
    key: "create_process",
    name: "Create Process",
    desc: "Create and enroll a record into a process workflow.",
    iconKey: "gitbranch",
    cats: ["all", "crm", "workflow"],
  },
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

  // Data & Assignment
  {
    key: "assignhuman",
    name: "Assign to a Human",
    desc: "Assign a team member to handle this record.",
    iconKey: "usercheck",
    cats: ["all", "data"],
  },

  // Webhook
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
  const [drawerScopingRules, setDrawerScopingRules] = useState<ScopingRule[]>(() => {
    if (initialScopingRules && initialScopingRules.length > 0) return initialScopingRules;
    if ((initialAutomation as any)?.scopingRules?.length > 0) return (initialAutomation as any).scopingRules;
    if (stageRef?.processId) {
      const allProcs = (processes && processes.length > 0) ? processes : getStoredProcesses();
      const p = allProcs.find((proc: any) => proc.id === stageRef.processId);
      const st = p?.stages?.find((s: any) => s.id === stageRef.stageId);
      if (st?.scopingRules && st.scopingRules.length > 0) return st.scopingRules;
      if (p?.scopingRules && p.scopingRules.length > 0) return p.scopingRules;
      if (p?.industryCategory && p.industryCategory !== "All") {
        return [{
          industryCategory: p.industryCategory,
          industries: p.industry && p.industry !== "All" ? [p.industry] : [],
          locations: p.locations && !p.locations.includes("All") ? p.locations : [],
        }];
      }
    }
    return [];
  });


  // Determine effective scope and scoped processes
  const allAvailableProcesses = (processes && processes.length > 0) ? processes : getStoredProcesses();
  const effectiveProcesses = useMemo(() => {
    if (!isAdmin || !drawerScopingRules || drawerScopingRules.length === 0) {
      return allAvailableProcesses;
    }
    const hasActiveRules = drawerScopingRules.some(
      (r) =>
        Boolean(r.industryCategory && r.industryCategory !== "All" && r.industryCategory !== "*") ||
        Boolean(r.industries && r.industries.length > 0 && !r.industries.includes("All")) ||
        Boolean(r.locations && r.locations.length > 0 && !r.locations.includes("All"))
    );
    if (!hasActiveRules) return allAvailableProcesses;

    return allAvailableProcesses.filter((p) =>
      isProcessMatchingScopingRules(p, drawerScopingRules)
    );
  }, [allAvailableProcesses, isAdmin, drawerScopingRules]);

  const effectiveScope: AutomationScope =
    propScope || (stageRef ? "stage" : "global");

  // Automation Form State
  const [automationName, setAutomationName] = useState("");
  const [automationDescription, setAutomationDescription] = useState("");
  const [automationStatus, setAutomationStatus] = useState<"draft" | "active">("active");
  // Top bar unified inline rename & description editing state
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [tempName, setTempName] = useState("");
  const [tempDescription, setTempDescription] = useState("");
  const [showFlowBuilderHelp, setShowFlowBuilderHelp] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleStartEditing = () => {
    setTempName(automationName || (initialAutomation?.name || "New Global Automation"));
    setTempDescription(automationDescription || "");
    setIsEditingInfo(true);
  };

  const handleSaveInfo = () => {
    if (tempName.trim()) {
      setAutomationName(tempName.trim());
    }
    setAutomationDescription(tempDescription.trim());
    setIsEditingInfo(false);
  };

  const handleCancelInfo = () => {
    setTempName(automationName);
    setTempDescription(automationDescription);
    setIsEditingInfo(false);
  };

    // Stage Trigger State (Stage Scope)
  const [stageTriggerCategory, setStageTriggerCategory] = useState<"stage" | "client" | "appointment">("stage");
  const [stageTriggerWhen, setStageTriggerWhen] = useState<"entry" | "exit">("entry");
  const [stageTriggerEvent, setStageTriggerEvent] = useState<string>("client.created");

  // Global Trigger State (Global Scope)
  const [globalTriggerType, setGlobalTriggerType] = useState<EventTriggerType>("process");
  const [globalTriggerEvent, setGlobalTriggerEvent] = useState<string>("process.created");
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
  const lastAutomationIdRef = useRef<string | null>(null);

  // Initialize or reset ONLY on drawer open or target change
  useEffect(() => {
    if (isOpen) {
      const isNewTarget = !wasOpenRef.current || lastAutomationIdRef.current !== (initialAutomation?.id || null);
      if (isNewTarget) {
        lastAutomationIdRef.current = initialAutomation?.id || null;
        setIsAddStepOpen(false);
        setIsChoosingGlobalTrigger(false);
        setIsEditingInfo(false);
        setShowFlowBuilderHelp(false);
        let initRules: ScopingRule[] =
          initialScopingRules && initialScopingRules.length > 0
            ? initialScopingRules
            : (initialAutomation as any)?.scopingRules || [];

        if (initRules.length === 0 && stageRef?.processId) {
          const allProcs = (processes && processes.length > 0) ? processes : getStoredProcesses();
          const p = allProcs.find((proc: any) => proc.id === stageRef.processId);
          const st = p?.stages?.find((s: any) => s.id === stageRef.stageId);
          if (st?.scopingRules && st.scopingRules.length > 0) {
            initRules = st.scopingRules;
          } else if (p?.scopingRules && p.scopingRules.length > 0) {
            initRules = p.scopingRules;
          } else if (p?.industryCategory && p.industryCategory !== "All") {
            initRules = [{
              industryCategory: p.industryCategory,
              industries: p.industry && p.industry !== "All" ? [p.industry] : [],
              locations: p.locations && !p.locations.includes("All") ? p.locations : [],
            }];
          }
        }
        setDrawerScopingRules(initRules);

        if (initialAutomation) {
          setAutomationName(initialAutomation.name || "");
          setAutomationDescription(initialAutomation.description || "");
          setAutomationStatus(initialAutomation.status || "active");
          if (initialAutomation.trigger.type === "stage") {
            setStageTriggerCategory("stage");
            setStageTriggerWhen((initialAutomation.trigger as any).when || "entry");
          } else {
            const trigType = (initialAutomation.trigger as any).type || "client";
            const trigEvt = (initialAutomation.trigger as any).event || "client.checked_in";
            setStageTriggerCategory(trigType === "appointment" ? "appointment" : trigType === "stage" ? "stage" : "client");
            setStageTriggerEvent(trigEvt);
            setGlobalTriggerType(trigType);
            setGlobalTriggerEvent(trigEvt);
            setGlobalTriggerParams((initialAutomation.trigger as any).params || {});
          }

          const rawSteps =
            initialAutomation.steps && initialAutomation.steps.length > 0
              ? initialAutomation.steps
              : (workflowSteps && workflowSteps.length > 0 ? workflowSteps : []);

          setSteps(
            rawSteps.map((s: any) => ({
              ...s,
              id: s.id,
              name: s.name,
              description: s.description || "",
              iconKey: s.iconKey || "zap",
              stepKey: s.stepKey,
              params: s.params || {},
              delayValue: s.delay?.value ?? s.delayValue ?? 0,
              delayUnit: (s.delay?.unit as any) ?? s.delayUnit ?? "minutes",
              executionType: s.executionType || (s.branches?.length > 0 ? "parallel" : "wait"),
              branches: s.branches,
              outputAlias: s.outputAlias,
              connectAfterId: s.connectAfterId,
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
          setStageTriggerCategory("stage");
          setStageTriggerWhen("entry");
          setStageTriggerEvent("client.created");
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
              setStageTriggerCategory("stage");
              setStageTriggerWhen("exit");
            } else if (targetStep.trigger === "client.created" || targetStep.trigger === "client.updated" || targetStep.trigger?.startsWith("client")) {
              setStageTriggerCategory("client");
              setStageTriggerEvent(targetStep.trigger || "client.created");
            } else if (targetStep.trigger === "appointment.booked" || targetStep.trigger?.startsWith("appointment")) {
              setStageTriggerCategory("appointment");
              setStageTriggerEvent("appointment.booked");
            } else {
              setStageTriggerCategory("stage");
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
        if (showFlowBuilderHelp) {
          setShowFlowBuilderHelp(false);
        } else if (isEditingInfo) {
          handleCancelInfo();
        } else if (isStepDetailOpen) {
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
      action:
        effectiveScope === "stage"
          ? {
              type: "moveToStage",
              processId: stageRef?.processId || currentProcessId || "",
              processName: stageRef?.processName || processName,
              stageId: stageRef?.stageId || "",
              stageName: stageRef?.stageName || stageName,
            }
          : undefined,
      name:
        automationName.trim() ||
        (effectiveScope === "stage"
          ? stageTriggerCategory === "stage"
            ? `On ${stageTriggerWhen}: ${stageName}`
            : `${GLOBAL_TRIGGER_CATALOG.flatMap((c) => c.events).find((e) => e.event === stageTriggerEvent)?.label || stageTriggerEvent}: ${stageName}`
          : "Global Automation"),
      description: automationDescription,
      status: finalStatus,
      trigger:
        effectiveScope === "stage"
          ? stageTriggerCategory === "stage"
            ? {
                type: "stage",
                when: stageTriggerWhen,
                event: stageTriggerWhen === "exit" ? "stage.exit" : "stage.entry",
                stageId: stageRef?.stageId || "",
                processId: stageRef?.processId || currentProcessId || "",
              }
            : {
                type: stageTriggerCategory,
                event: stageTriggerEvent,
                label:
                  GLOBAL_TRIGGER_CATALOG.flatMap((c) => c.events).find(
                    (e) => e.event === stageTriggerEvent
                  )?.label || stageTriggerEvent,
                stageId: stageRef?.stageId || "",
                processId: stageRef?.processId || currentProcessId || "",
              }
          : {
              type: globalTriggerType,
              event: globalTriggerEvent,
              params: {
                ...globalTriggerParams,
                stageId: globalTriggerParams.stageId || globalTriggerParams.triggerStageId || selectedTriggerStageId,
                stageName: globalTriggerParams.stageName || globalTriggerParams.triggerStageName,
                processId: globalTriggerParams.processId || globalTriggerParams.triggerProcessId || selectedTriggerProcessId,
                processName: globalTriggerParams.processName || globalTriggerParams.triggerProcessName,
                triggerStageId: globalTriggerParams.triggerStageId || globalTriggerParams.stageId || selectedTriggerStageId,
                triggerStageName: globalTriggerParams.triggerStageName || globalTriggerParams.stageName,
                triggerProcessId: globalTriggerParams.triggerProcessId || globalTriggerParams.processId || selectedTriggerProcessId,
                triggerProcessName: globalTriggerParams.triggerProcessName || globalTriggerParams.processName,
              },
              stage:
                globalTriggerType === "stage" || globalTriggerEvent.startsWith("stage.")
                  ? {
                      entity: (selectedTriggerEntity as any) || "client",
                      processId: selectedTriggerProcessId || globalTriggerParams.triggerProcessId || globalTriggerParams.processId,
                      stageId: selectedTriggerStageId || globalTriggerParams.triggerStageId || globalTriggerParams.stageId,
                      when: selectedTriggerStageWhen,
                    }
                  : undefined,
            },
      steps: finalSteps.map((s) => ({
        ...s,
        id: s.id,
        kind: s.kind || (s.stepKey === "parallel" || (s as any).branches?.length > 0 ? "parallel" : s.stepKey === "wait" ? "wait" : s.stepKey === "condition" ? "condition" : "action"),
        stepKey: s.stepKey || (s.kind === "parallel" || (s as any).branches?.length > 0 ? "parallel" : "action"),
        name: s.name,
        description: s.description,
        iconKey: s.iconKey,
        params: s.params || {},
        outputAlias: (s as any).outputAlias,
        branches: (s as any).branches,
        executionType: s.executionType || ((s as any).branches?.length > 0 ? "parallel" : "wait"),
        delay:
          s.delayValue && s.delayValue > 0
            ? { value: s.delayValue, unit: (s.delayUnit as any) || "minutes" }
            : undefined,
      })),
      scopingRules: drawerScopingRules,
      isAdmin,
      updatedAt: new Date().toISOString(),
    } as any as Automation;

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

        {/* Sliding Drawer Container (Visual Flow Builder Canvas Only) */}
        <motion.div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative h-screen bg-white shadow-2xl flex flex-col z-50 border-l border-gray-200 outline-none w-[88vw] min-w-[85vw] max-w-[1550px]"
          style={{ fontFamily: "DM Sans, sans-serif" }}
        >
          {/* Header */}
          <div className="flex-shrink-0 px-6 py-3.5 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  {effectiveScope === "stage" ? (
                    <GitBranch className="w-4.5 h-4.5" />
                  ) : (
                    <Zap className="w-4.5 h-4.5" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  {/* Title Row + Single Pencil Icon */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {isEditingInfo ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <input
                          ref={nameInputRef}
                          type="text"
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveInfo();
                            if (e.key === "Escape") handleCancelInfo();
                          }}
                          className="px-2 py-0.5 text-base font-bold text-gray-950 bg-white border border-blue-500 rounded-md shadow-xs outline-none focus:ring-2 focus:ring-blue-500/20 min-w-[260px]"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                          placeholder="Automation name"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleSaveInfo}
                          className="w-7 h-7 rounded-md bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                          title="Save changes"
                          aria-label="Save changes"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelInfo}
                          className="w-7 h-7 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
                          title="Cancel"
                          aria-label="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 group min-w-0">
                        <h2
                          className="text-base font-bold text-gray-950 truncate cursor-pointer hover:text-blue-700 transition-colors"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                          onClick={handleStartEditing}
                          title="Click to edit name and description"
                        >
                          {automationName || (initialAutomation?.name || "New Global Automation")}
                        </h2>
                        <button
                          type="button"
                          onClick={handleStartEditing}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          title="Edit name and description"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Description in Top Bar */}
                  <div className="mt-1">
                    {isEditingInfo ? (
                      <input
                        type="text"
                        value={tempDescription}
                        onChange={(e) => setTempDescription(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveInfo();
                          if (e.key === "Escape") handleCancelInfo();
                        }}
                        placeholder="Explain what this automation accomplishes..."
                        className="w-full max-w-xl px-2.5 py-1 text-xs text-gray-800 bg-white border border-blue-500 rounded-md shadow-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    ) : (
                      <p
                        className="text-xs text-gray-500 truncate max-w-xl cursor-pointer hover:text-gray-800 transition-colors"
                        onClick={handleStartEditing}
                        title="Click to edit name and description"
                      >
                        {automationDescription || (
                          <span className="text-gray-400 italic">No description added</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Top Right: How Flow Builder Works & Close Button */}
              <div className="flex items-center gap-2.5 shrink-0">
                <HowItWorksButton
                  label="How Flow Builder Works"
                  onClick={() => setShowFlowBuilderHelp(true)}
                />
                <div className="w-px h-5 bg-gray-200" />
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

          {/* Body Content — Visual Flow Builder Canvas */}
          <div className="flex-1 overflow-hidden relative bg-[#FAFBFD]">
            <FlowBuilderTab
                processName={processName}
                stageName={stageName}
                processes={effectiveProcesses}
                currentProcessId={currentProcessId}
                workflowSteps={steps}
                onWorkflowStepsChange={(newSteps) => updateSteps(newSteps)}
                stepAllowedTriggers={stepAllowedTriggers}
                scopingRules={drawerScopingRules}
                scope={effectiveScope}
                triggerType={
                  effectiveScope === "global"
                    ? globalTriggerType
                    : stageTriggerCategory
                }
                triggerEvent={
                  effectiveScope === "global"
                    ? globalTriggerEvent
                    : stageTriggerCategory === "stage"
                    ? stageTriggerWhen
                    : stageTriggerEvent
                }
                triggerLabel={
                  effectiveScope === "global"
                    ? GLOBAL_TRIGGER_CATALOG.flatMap((c) => c.events).find((e) => e.event === globalTriggerEvent)?.label || globalTriggerEvent
                    : stageTriggerCategory === "stage"
                    ? (stageTriggerWhen === "exit" ? `On Exit: ${stageName}` : `On Entry: ${stageName}`)
                    : GLOBAL_TRIGGER_CATALOG.flatMap((c) => c.events).find((e) => e.event === stageTriggerEvent)?.label || stageTriggerEvent
                }
                triggerDescription={
                  effectiveScope === "global"
                    ? GLOBAL_TRIGGER_CATALOG.flatMap((c) => c.events).find((e) => e.event === globalTriggerEvent)?.description
                    : stageTriggerCategory === "stage"
                    ? (stageTriggerWhen === "exit" ? `Fires when record moves out of "${stageName}"` : `Fires when record moves into "${stageName}"`)
                    : GLOBAL_TRIGGER_CATALOG.flatMap((c) => c.events).find((e) => e.event === stageTriggerEvent)?.description
                }
                triggerIconKey={
                  effectiveScope === "global"
                    ? GLOBAL_TRIGGER_CATALOG.find((c) => c.type === globalTriggerType)?.iconKey || "zap"
                    : stageTriggerCategory === "stage"
                    ? "gitbranch"
                    : stageTriggerCategory === "appointment"
                    ? "calendar"
                    : "user"
                }
                onTriggerChange={(trig) => {
                  if (effectiveScope === "global") {
                    setGlobalTriggerType(trig.type as EventTriggerType);
                    setGlobalTriggerEvent(trig.event);
                    if (trig.params) {
                      setGlobalTriggerParams(trig.params);
                      const pId = trig.params.processId || trig.params.triggerProcessId;
                      const sId = trig.params.stageId || trig.params.triggerStageId;
                      if (pId && pId !== "all") setSelectedTriggerProcessId(pId);
                      if (sId && sId !== "all") setSelectedTriggerStageId(sId);
                    }
                  } else {
                    if (trig.type === "stage" || trig.event === "stage.exit" || trig.event === "stage.entry" || trig.event === "stage.entered" || trig.event === "stage.exited") {
                      setStageTriggerCategory("stage");
                      setStageTriggerWhen(trig.event.includes("exit") ? "exit" : "entry");
                    } else if (trig.type === "appointment" || trig.event.startsWith("appointment.")) {
                      setStageTriggerCategory("appointment");
                      setStageTriggerEvent(trig.event);
                    } else {
                      setStageTriggerCategory("client");
                      setStageTriggerEvent(trig.event);
                    }
                  }
                }}
                automationName={automationName}
                onAutomationNameChange={setAutomationName}
                automationDescription={automationDescription}
                onAutomationDescriptionChange={setAutomationDescription}
                automationStatus={automationStatus}
                onAutomationStatusChange={setAutomationStatus}
                isAdmin={isAdmin}
                initialStepIdToConfigure={initialStepIdToConfigure}
                onSave={() => handleSaveAutomation("active")}
                hideHowItWorks={true}
                initialHasChosenTrigger={Boolean(initialAutomation || (workflowSteps && workflowSteps.length > 0) || initialStepIdToConfigure)}
              />
            </div>
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
            {/* How It Works Modal */}
        <HowItWorksModal
          isOpen={showFlowBuilderHelp}
          onClose={() => setShowFlowBuilderHelp(false)}
          title="How Flow Builder Works"
          summary="Flow Builder is a visual map of every automation step — laid out as connected nodes so you can see and edit the order at a glance."
          bullets={[
            "Each lane shows steps in the order they run",
            "Drag a node's bottom port to another node's top port to change what runs next",
            "Select a step, then add a Condition, Wait, or Parallel Branch from the left panel to modify it",
            "Double-click any node to open its full configuration",
            "Nodes sync with your automation steps automatically — edit here or in the step drawer",
          ]}
          guideUrl="/guide/process-settings#flow-builder-canvas"
        />
      
</AnimatePresence>,
    document.body
  );
}
