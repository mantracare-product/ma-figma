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
import type {
  Automation,
  AutomationStep,
  AutomationScope,
  EventTriggerType,
} from "../../types/automation";
import { GLOBAL_TRIGGER_CATALOG } from "../../types/automation";
import { toast } from "sonner";

export const STEP_ALLOWED_TRIGGERS: Record<string, Array<string>> = {
  whatsapp: ["stage", "incall", "inchat", "postcall"],
  sms: ["stage", "incall", "inchat", "postcall"],
  email: ["stage", "incall", "inchat", "postcall"],
  "send-invoice": ["stage", "incall", "inchat", "postcall"],
  generate_invoice: ["stage", "postcall"],
  send_payment: ["stage", "incall", "inchat", "postcall"],
  processmovement: ["inchat", "postcall"],
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
    key: "processmovement",
    name: "Assign Process / Stage",
    desc: "Move the record to a specific process and stage.",
    iconKey: "zap",
    cats: ["all", "workflow"],
    isMoveToStage: true,
  },
  {
    key: "movetonewprocess",
    name: "Move to New Process",
    desc: "Move contact to another process to continue the pipeline.",
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
};

function getTriggerIcon(type: EventTriggerType | "stage") {
  switch (type) {
    case "appointment":
      return <Calendar className="w-4 h-4 text-emerald-600" />;
    case "call":
      return <Phone className="w-4 h-4 text-sky-600" />;
    case "client":
      return <User className="w-4 h-4 text-blue-600" />;
    case "document":
      return <FileText className="w-4 h-4 text-amber-600" />;
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
}

export default function AddAutomationDrawer({
  isOpen,
  onClose,
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
}: AddAutomationDrawerProps) {
  // Determine effective scope
  const effectiveScope: AutomationScope =
    propScope || (stageRef ? "stage" : "global");

  // View state: Drawer tabs ("builder" | "details") and Canvas View toggle
  const [activeTab, setActiveTab] = useState<"builder" | "details">("builder");
  const [isCanvasView, setIsCanvasView] = useState(false);

  // Automation Form State
  const [automationName, setAutomationName] = useState("");
  const [automationDescription, setAutomationDescription] = useState("");
  const [automationStatus, setAutomationStatus] = useState<"draft" | "active">("active");

  // Stage Trigger State (Stage Scope)
  const [stageTriggerWhen, setStageTriggerWhen] = useState<"entry" | "exit">("entry");

  // Global Trigger State (Global Scope)
  const [globalTriggerType, setGlobalTriggerType] = useState<EventTriggerType>("appointment");
  const [globalTriggerEvent, setGlobalTriggerEvent] = useState<string>("appointment.booked");
  const [isChoosingGlobalTrigger, setIsChoosingGlobalTrigger] = useState(false);
  const [triggerSearch, setTriggerSearch] = useState("");

  // Global Stage trigger details
  const [selectedTriggerEntity, setSelectedTriggerEntity] = useState<string>("client");
  const [selectedTriggerProcessId, setSelectedTriggerProcessId] = useState<string>("");
  const [selectedTriggerStageId, setSelectedTriggerStageId] = useState<string>("");
  const [selectedTriggerStageWhen, setSelectedTriggerStageWhen] = useState<"entry" | "exit">("entry");

  // Steps List State
  const [steps, setSteps] = useState<WorkflowStep[]>([]);

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

  // Initialize or reset on drawer open
  useEffect(() => {
    if (isOpen) {
      setActiveTab("builder");
      setIsCanvasView(defaultView === "flowbuilder");
      setIsAddStepOpen(false);
      setIsChoosingGlobalTrigger(false);

      if (initialAutomation) {
        setAutomationName(initialAutomation.name || "");
        setAutomationDescription(initialAutomation.description || "");
        setAutomationStatus(initialAutomation.status || "active");
        if (initialAutomation.trigger.type === "stage") {
          setStageTriggerWhen((initialAutomation.trigger as any).when || "entry");
        } else {
          setGlobalTriggerType((initialAutomation.trigger as any).type || "appointment");
          setGlobalTriggerEvent((initialAutomation.trigger as any).event || "appointment.booked");
        }
        setSteps(
          (initialAutomation.steps || []).map((s) => ({
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
        setGlobalTriggerType("appointment");
        setGlobalTriggerEvent("appointment.booked");
        setSteps(workflowSteps || []);
      }
    }
  }, [isOpen, initialAutomation, effectiveScope, stageName, workflowSteps]);

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

    const updated = [...steps, newStep];
    updateSteps(updated);

    // Immediately open configuration for the added step
    handleConfigureStep(newStep, updated.length - 1);
  };

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

    const updated = [...steps];
    updated[editingStepIndex] = updatedStep;
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
    const finalAutomation: Automation = {
      id: initialAutomation?.id || `auto-${Date.now()}`,
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
      steps: steps.map((s) => ({
        id: s.id,
        kind: s.stepKey === "wait" ? "wait" : s.stepKey === "condition" ? "condition" : "action",
        stepKey: s.stepKey || "action",
        name: s.name,
        description: s.description,
        iconKey: s.iconKey,
        params: s.params || {},
        outputAlias: (s as any).outputAlias,
        delay:
          s.delayValue && s.delayValue > 0
            ? { value: s.delayValue, unit: (s.delayUnit as any) || "minutes" }
            : undefined,
      })),
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
                    title="Return to trigger builder view"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to builder</span>
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
                      {isCanvasView
                        ? "Automation Canvas"
                        : automationName || "New automation"}
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

              {/* Top Right: View Mode Toggle & Close */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center p-0.5 bg-gray-100 rounded-lg border border-gray-200/80">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCanvasView(false);
                      setActiveTab("builder");
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      !isCanvasView && activeTab === "builder"
                        ? "bg-white text-gray-900 shadow-2xs font-bold"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    Step Library
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCanvasView(true)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      isCanvasView
                        ? "bg-white text-gray-900 shadow-2xs font-bold"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    Flow Builder
                  </button>
                  {!isCanvasView && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("details")}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        activeTab === "details"
                          ? "bg-white text-gray-900 shadow-2xs font-bold"
                          : "text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      Details
                    </button>
                  )}
                </div>

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
                processes={processes}
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
                    : `When entering "${stageName}"`
                }
                triggerDescription={
                  effectiveScope === "global"
                    ? GLOBAL_TRIGGER_CATALOG.flatMap((c) => c.events).find((e) => e.event === globalTriggerEvent)?.description
                    : `Process: ${processName}`
                }
                triggerIconKey={
                  effectiveScope === "global"
                    ? GLOBAL_TRIGGER_CATALOG.find((c) => c.type === globalTriggerType)?.iconKey || "zap"
                    : "gitbranch"
                }
              />
            </div>
          ) : activeTab === "details" ? (
            /* ── Details Tab ── */
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  value={automationDescription}
                  onChange={(e) => setAutomationDescription(e.target.value)}
                  placeholder="Explain why this automation exists and what it accomplishes..."
                  rows={4}
                  className="w-full text-xs p-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Automation Status
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAutomationStatus("active")}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      automationStatus === "active"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Active (Runs on trigger)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutomationStatus("draft")}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      automationStatus === "draft"
                        ? "bg-amber-50 text-amber-700 border-amber-300 shadow-2xs"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Draft (Paused)</span>
                  </button>
                </div>
              </div>

              {/* Read-Only Info */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200/80 space-y-2.5 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span className="font-medium">Execution Scope</span>
                  <span className="font-semibold text-gray-900 capitalize">
                    {effectiveScope}
                  </span>
                </div>
                {effectiveScope === "stage" && (
                  <div className="flex justify-between text-gray-600">
                    <span className="font-medium">Bound Stage</span>
                    <span className="font-semibold text-gray-900">
                      {stageName} ({processName})
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span className="font-medium">Configured Actions</span>
                  <span className="font-semibold text-gray-900">
                    {steps.length} {steps.length === 1 ? "step" : "steps"}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span className="font-medium">Health Status</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Healthy
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* ── Builder Tab (Default) ── */
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* 1. Name Field */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Automation Name
                </label>
                <input
                  type="text"
                  value={automationName}
                  onChange={(e) => setAutomationName(e.target.value)}
                  placeholder={
                    effectiveScope === "stage"
                      ? `On ${stageTriggerWhen}: ${stageName}`
                      : "e.g. Appointment Confirmation Flow"
                  }
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-gray-900"
                />
              </div>

              {/* 2. When this happens (Trigger Card) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-blue-600" />
                    <span>When this happens</span>
                  </span>
                  {effectiveScope === "global" && (
                    <button
                      type="button"
                      onClick={() => setIsChoosingGlobalTrigger((v) => !v)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      {isChoosingGlobalTrigger ? "Cancel" : "Change trigger"}
                    </button>
                  )}
                </div>

                {effectiveScope === "stage" ? (
                  /* Stage Scope Trigger Card: Locked */
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
                          <GitBranch className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-gray-900">
                            Stage movement
                          </h4>
                          <p className="text-[11px] text-gray-500">
                            Runs when a record transitions into or out of this stage.
                          </p>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-200/80 text-gray-600 border border-gray-300/60">
                        <Lock className="w-3 h-3" />
                        Locked to stage
                      </span>
                    </div>

                    {/* Segmented Control [ Entry | Exit ] */}
                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700">
                        Trigger timing:
                      </span>
                      <div className="flex items-center p-0.5 bg-white rounded-lg border border-gray-200 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setStageTriggerWhen("entry")}
                          className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                            stageTriggerWhen === "entry"
                              ? "bg-[#1E293B] text-white shadow-2xs"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          On Entry
                        </button>
                        <button
                          type="button"
                          onClick={() => setStageTriggerWhen("exit")}
                          className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                            stageTriggerWhen === "exit"
                              ? "bg-[#1E293B] text-white shadow-2xs"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          On Exit
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Global Scope Trigger Card */
                  <div className="space-y-3">
                    {isChoosingGlobalTrigger ? (
                      /* Searchable Trigger Catalog Picker */
                      <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm space-y-3">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                          <input
                            type="text"
                            value={triggerSearch}
                            onChange={(e) => setTriggerSearch(e.target.value)}
                            placeholder="Search triggers (e.g. Appointment, Invoice, Call)..."
                            className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto">
                          {GLOBAL_TRIGGER_CATALOG.filter(
                            (t) =>
                              t.label.toLowerCase().includes(triggerSearch.toLowerCase()) ||
                              t.description.toLowerCase().includes(triggerSearch.toLowerCase())
                          ).map((t) => (
                            <button
                              key={t.type}
                              type="button"
                              onClick={() => {
                                setGlobalTriggerType(t.type);
                                setGlobalTriggerEvent(t.events[0]?.event || "");
                                setIsChoosingGlobalTrigger(false);
                              }}
                              className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                                globalTriggerType === t.type
                                  ? "bg-blue-50/70 border-blue-300"
                                  : "border-gray-100 hover:bg-gray-50"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-1.5 rounded-md bg-white border border-gray-200 shadow-2xs">
                                  {getTriggerIcon(t.type)}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-gray-900">
                                    {t.label}
                                  </div>
                                  <p className="text-[11px] text-gray-500 truncate">
                                    {t.description}
                                  </p>
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* Active Trigger Card & Event Dropdown */
                      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-blue-50 border border-blue-200">
                            {getTriggerIcon(globalTriggerType)}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-gray-900">
                              {currentGlobalTriggerDef?.label || "Trigger"}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              {currentGlobalTriggerDef?.description}
                            </div>
                          </div>
                        </div>

                        {/* Event Selector */}
                        <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between gap-3">
                          <label className="text-xs font-semibold text-gray-700 shrink-0">
                            Which event?
                          </label>
                          <select
                            value={globalTriggerEvent}
                            onChange={(e) => setGlobalTriggerEvent(e.target.value)}
                            className="text-xs font-medium px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 cursor-pointer max-w-[260px] truncate"
                          >
                            {currentGlobalTriggerDef?.events.map((evt) => (
                              <option key={evt.event} value={evt.event}>
                                {evt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Then do these actions (Numbered Step Cards) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                    <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                    <span>Then do these actions ({steps.length})</span>
                  </span>
                </div>

                {steps.length === 0 ? (
                  <div className="border border-dashed border-gray-200 rounded-xl p-5 text-center text-xs text-gray-500 space-y-1">
                    <p className="font-semibold text-gray-700">No actions added yet</p>
                    <p className="text-[11px]">Click "Add next step" below to start chaining actions.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {steps.map((step, idx) => (
                      <div
                        key={step.id}
                        className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl shadow-2xs hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Step Index Bubble */}
                          <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
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
                            </div>
                            <p className="text-[11px] text-gray-500 truncate">
                              {step.description || "Action configured"}
                            </p>
                          </div>
                        </div>

                        {/* Actions: Settings & Delete */}
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={() => handleConfigureStep(step, idx)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                            title="Configure parameters"
                          >
                            <Settings2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStep(idx)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove action"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. "Add next step..." Trigger & Popover */}
              <div className="relative" ref={popoverRef}>
                <button
                  type="button"
                  onClick={() => setIsAddStepOpen((v) => !v)}
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

          {/* Footer (Builder & Details Mode) */}
          {!isCanvasView && (
            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-white flex items-center justify-between">
              {/* Left: Open in canvas */}
              <button
                type="button"
                onClick={() => setIsCanvasView(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                title="Expand to visual 75vw flow builder canvas"
              >
                <GitBranch className="w-4 h-4 text-blue-600" />
                <span>Open in canvas</span>
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
                  Activate
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Step Detail Drawer: Configures parameters for selected step */}
        {isStepDetailOpen && editingStep && (
          <StepDetailDrawer
            isOpen={isStepDetailOpen}
            step={editingStep}
            isCreatingNewStep={false}
            stepAllowedTriggers={stepAllowedTriggers}
            processes={processes}
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
          />
        )}
      </div>
    </AnimatePresence>,
    document.body
  );
}
