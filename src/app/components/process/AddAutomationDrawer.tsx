import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  GitBranch,
  Zap,
  Sparkles,
  Search,
  ChevronRight,
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
  Lightbulb,
  LayoutGrid,
  Volume2,
  Webhook,
  PhoneOff,
  CreditCard,
  Phone,
  Database,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import FlowBuilderTab from "./FlowBuilderTab";
import StepDetailDrawer from "./StepDetailDrawer";
import { Tooltip } from "../ui/Tooltip";
import type { WorkflowStep } from "../../types/workflow";
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

export interface StepCatalogItem {
  key: string;
  name: string;
  desc: string;
  iconKey: string;
  cats: string[];
  popular?: boolean;
}

export const WORKFLOW_CATALOG_STEPS: StepCatalogItem[] = [
  { key: "processmovement", name: "Assign Process / Stage", desc: "Move the contact to a specific process and stage.", iconKey: "zap", cats: ["all", "workflow"], popular: false },
  { key: "movetonewprocess", name: "Move to New Process", desc: "Move user to a new process and stage to continue the pipeline.", iconKey: "gitbranch", cats: ["all", "workflow"], popular: true },
  { key: "endworkflow", name: "End Workflow", desc: "Terminate the workflow after this step runs and mark the contact as done.", iconKey: "x", cats: ["all", "workflow"], popular: false },
  { key: "callhangup", name: "Auto Hangup", desc: "Automatically end the call after the AI completes its interaction, with an optional closing message.", iconKey: "phoneoff", cats: ["all", "callerengagement"], popular: false },
  { key: "callaction", name: "Transfer Call", desc: "Transfer the active AI call to a human agent or another AI agent.", iconKey: "phonecall", cats: ["all", "callerengagement"], popular: false },
  { key: "idlemessages", name: "Idle Messages", desc: "Configure messages the AI speaks when the caller has not responded.", iconKey: "messagesquare", cats: ["all", "callerengagement"], popular: false },
  { key: "whatsapp", name: "WhatsApp", desc: "Send WhatsApp messages to contacts using pre-configured templates.", iconKey: "messagecircle", cats: ["all", "communication"], popular: true },
  { key: "sms", name: "SMS", desc: "Send SMS text messages to contacts using pre-configured templates.", iconKey: "messagesquare", cats: ["all", "communication"], popular: false },
  { key: "email", name: "Email", desc: "Send email notifications to contacts using pre-configured templates.", iconKey: "mail", cats: ["all", "communication"], popular: false },
  { key: "send-invoice", name: "Send Invoice", desc: "Send the generated invoice to the client via WhatsApp, SMS, or Email.", iconKey: "filetext", cats: ["all", "communication"], popular: false },
  { key: "fieldupdate", name: "Field Update", desc: "Update a specific field value for the contact or record.", iconKey: "edit", cats: ["all", "data"], popular: false },
  { key: "assignhuman", name: "Assign to a Human", desc: "Assign a human team member to review or handle this contact.", iconKey: "usercheck", cats: ["all", "data"], popular: false },
  { key: "wh_trigger", name: "API Automation", desc: "Trigger actions in external systems using your connected API integrations.", iconKey: "globe", cats: ["all", "webhook"], popular: false },
  { key: "webhook_trigger", name: "Webhook Automation", desc: "Send an event payload to a connected webhook when this step runs.", iconKey: "webhook", cats: ["all", "webhook"], popular: false },
  { key: "generate_invoice", name: "Generate Invoice", desc: "Generate invoice for appointment (idempotent per appointment).", iconKey: "filetext", cats: ["all", "records"], popular: true },
  { key: "send_payment", name: "Send Payment", desc: "Send payment link to client via preferred channel.", iconKey: "creditcard", cats: ["all", "records", "communication"], popular: false },
];

const STEP_ICON_MAP: Record<string, React.ReactNode> = {
  clock: <Clock className="w-4 h-4 text-white" />,
  x: <X className="w-4 h-4 text-white" />,
  chevronright: <ChevronRight className="w-4 h-4 text-white" />,
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
  lightbulb: <Lightbulb className="w-4 h-4 text-white" />,
  layoutgrid: <LayoutGrid className="w-4 h-4 text-white" />,
  gitbranch: <GitBranch className="w-4 h-4 text-white" />,
  volume2: <Volume2 className="w-4 h-4 text-white" />,
  webhook: <Webhook className="w-4 h-4 text-white" />,
  phoneoff: <PhoneOff className="w-4 h-4 text-white" />,
  creditcard: <CreditCard className="w-4 h-4 text-white" />,
};

export interface AddAutomationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultView?: "library" | "flowbuilder";
  processName?: string;
  stageName?: string;
  stageColor?: string;
  stageType?: string;
  processes?: any[];
  currentProcessId?: string;
  workflowSteps: WorkflowStep[];
  onWorkflowStepsChange: (steps: WorkflowStep[]) => void;
  stepAllowedTriggers?: Record<string, Array<string>>;
}

export default function AddAutomationDrawer({
  isOpen,
  onClose,
  defaultView = "flowbuilder",
  processName = "Process",
  stageName = "Stage",
  stageColor = "#2563EB",
  stageType,
  processes = [],
  currentProcessId,
  workflowSteps,
  onWorkflowStepsChange,
  stepAllowedTriggers = STEP_ALLOWED_TRIGGERS,
}: AddAutomationDrawerProps) {
  const [viewMode, setViewMode] = useState<"library" | "flowbuilder">(defaultView);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const drawerRef = useRef<HTMLDivElement>(null);

  // Step Detail Drawer state when adding from Step Library
  const [stepDetailDrawerOpen, setStepDetailDrawerOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [stepTrigger, setStepTrigger] = useState<string>("stage");
  const [executionType, setExecutionType] = useState<"wait" | "parallel">("wait");
  const [delayValue, setDelayValue] = useState<number>(0);
  const [delayUnit, setDelayUnit] = useState<string>("minutes");
  const [connectAfterId, setConnectAfterId] = useState<string | undefined>(undefined);
  const [stepParams, setStepParams] = useState<Record<string, any>>({});

  // Reset view to defaultView on open
  useEffect(() => {
    if (isOpen) {
      setViewMode(defaultView);
      setSearchQuery("");
      setSelectedCategory("all");
      setStepDetailDrawerOpen(false);
    }
  }, [isOpen, defaultView]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (stepDetailDrawerOpen) {
          setStepDetailDrawerOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, stepDetailDrawerOpen, onClose]);

  if (typeof document === "undefined" || !isOpen) return null;

  const categories = [
    { key: "all", icon: <Sparkles className="w-4 h-4" />, name: "All" },
    { key: "workflow", icon: <GitBranch className="w-4 h-4" />, name: "Workflow Logic" },
    { key: "callerengagement", icon: <Phone className="w-4 h-4" />, name: "Caller Engagement" },
    { key: "communication", icon: <MessageSquare className="w-4 h-4" />, name: "Communication" },
    { key: "data", icon: <Database className="w-4 h-4" />, name: "Data & Assignment" },
    { key: "webhook", icon: <Webhook className="w-4 h-4" />, name: "Webhook / API" },
    { key: "records", icon: <FileText className="w-4 h-4" />, name: "Records" },
  ];

  const filteredSteps = WORKFLOW_CATALOG_STEPS.filter((s) => {
    const matchesCat = selectedCategory === "all" || s.cats.includes(selectedCategory);
    const matchesQuery =
      searchQuery.trim() === "" ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const handleSelectCatalogStep = (stepItem: StepCatalogItem) => {
    const allowed = stepAllowedTriggers[stepItem.key] || ["stage", "incall", "postcall"];
    const initialTrigger = allowed.includes("stage") ? "stage" : allowed[0] || "stage";

    const newStep: WorkflowStep = {
      id: `${stepItem.key}-${Date.now()}`,
      name: stepItem.name,
      description: stepItem.desc,
      iconKey: stepItem.iconKey,
      stepKey: stepItem.key,
      trigger: initialTrigger,
      executionType: "wait",
      delayValue: 0,
      delayUnit: "minutes",
      params:
        stepItem.key === "generate_invoice"
          ? { dueDays: 14, autoSend: false, fee: 150 }
          : {},
    };

    setEditingStep(newStep);
    setStepTrigger(initialTrigger);
    setExecutionType("wait");
    setDelayValue(0);
    setDelayUnit("minutes");
    setConnectAfterId(undefined);
    setStepParams(newStep.params || {});
    setStepDetailDrawerOpen(true);
  };

  const handleSaveStepDetail = () => {
    if (!editingStep) return;
    const stepToSave: WorkflowStep = {
      ...editingStep,
      trigger: stepTrigger,
      executionType,
      delayValue,
      delayUnit,
      connectAfterId: executionType === "wait" ? connectAfterId : undefined,
      params: stepParams,
    };

    onWorkflowStepsChange([...workflowSteps, stepToSave]);
    setStepDetailDrawerOpen(false);
    setEditingStep(null);
    setViewMode("flowbuilder");
    toast.success(`Step "${stepToSave.name}" added to flow`);
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Drawer Panel: 75vw anchored to right */}
        <motion.div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative h-screen bg-white shadow-2xl flex flex-col z-50 border-l border-gray-200 outline-none"
          style={{
            width: "75vw",
            minWidth: "75vw",
            maxWidth: "75vw",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          {/* Header */}
          <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                  {viewMode === "flowbuilder" ? (
                    <GitBranch className="w-5 h-5" />
                  ) : (
                    <Zap className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2
                      className="text-lg font-bold text-gray-900 truncate"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      {viewMode === "flowbuilder"
                        ? "Automation Flow Builder"
                        : "Add Automation"}
                    </h2>
                    {stageName && (
                      <span
                        className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full text-white truncate shadow-2xs"
                        style={{ backgroundColor: stageColor || "#2563EB" }}
                      >
                        {stageName}
                      </span>
                    )}
                    {processName && (
                      <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200 truncate">
                        {processName}
                      </span>
                    )}
                  </div>
                  <p
                    className="text-xs text-gray-500 mt-0.5 truncate"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {viewMode === "flowbuilder"
                      ? "Visual canvas for stage triggers, conditions, delays, and action nodes."
                      : "Choose and configure the workflow step before adding it to this stage."}
                  </p>
                </div>
              </div>

              {/* View Mode Toggle [ Step Library | Flow Builder ] */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center p-1 bg-gray-100 rounded-xl border border-gray-200/80">
                  <button
                    type="button"
                    onClick={() => setViewMode("library")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      viewMode === "library"
                        ? "bg-white text-blue-700 shadow-xs border border-gray-200/60 font-bold"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Step Library</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("flowbuilder")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      viewMode === "flowbuilder"
                        ? "bg-white text-blue-700 shadow-xs border border-gray-200/60 font-bold"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <GitBranch className="w-3.5 h-3.5 text-blue-600" />
                    <span>Flow Builder</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 cursor-pointer ml-1"
                  title="Close Drawer (Esc)"
                  aria-label="Close Drawer"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Search — only in library view */}
            {viewMode === "library" && (
              <div className="relative mt-3.5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search workflow steps..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white outline-none focus:border-blue-500 transition-colors"
                  style={{ fontFamily: "Outfit, sans-serif", color: "#020817" }}
                />
              </div>
            )}
          </div>

          {/* Body */}
          {viewMode === "flowbuilder" ? (
            <div className="flex-1 overflow-hidden relative bg-[#FAFBFD]">
              <FlowBuilderTab
                processName={processName}
                stageName={stageName}
                processes={processes}
                currentProcessId={currentProcessId}
                workflowSteps={workflowSteps}
                onWorkflowStepsChange={onWorkflowStepsChange}
                stepAllowedTriggers={stepAllowedTriggers}
              />
            </div>
          ) : (
            /* Step Library View: Two-column layout */
            <div className="flex flex-1 overflow-hidden">
              {/* Left Category Sidebar */}
              <div className="w-[220px] flex-shrink-0 border-r border-gray-200 overflow-y-auto py-2 flex flex-col gap-1 bg-gray-50/50">
                {categories.map((cat) => {
                  const active = selectedCategory === cat.key;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setSelectedCategory(cat.key)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-l-2 hover:bg-gray-100/70 cursor-pointer"
                      style={{
                        borderLeftColor: active ? "#2563EB" : "transparent",
                        backgroundColor: active ? "#EFF6FF" : "transparent",
                      }}
                    >
                      <span
                        className="flex-shrink-0"
                        style={{ color: active ? "#2563EB" : "#64748B" }}
                      >
                        {cat.icon}
                      </span>
                      <span
                        className="text-sm font-semibold truncate"
                        style={{
                          color: active ? "#2563EB" : "#020817",
                          fontFamily: "DM Sans, sans-serif",
                        }}
                      >
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Right Steps List */}
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100 bg-white">
                {filteredSteps.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500">
                    No steps match your search.
                  </div>
                ) : (
                  filteredSteps.map((step) => {
                    const allowedTriggers = stepAllowedTriggers[step.key] || [];
                    const isOnlyInCall =
                      allowedTriggers.length === 1 && allowedTriggers[0] === "incall";
                    const isUnavailable =
                      isOnlyInCall &&
                      (stageType === "No Call Activity" || stageType === "Transfer to Human");

                    const buttonElement = (
                      <button
                        key={step.key}
                        type="button"
                        onClick={isUnavailable ? undefined : () => handleSelectCatalogStep(step)}
                        className={`w-full flex items-start gap-4 px-5 py-4 text-left transition-colors cursor-pointer hover:bg-blue-50/40 ${
                          isUnavailable ? "opacity-40 pointer-events-none cursor-not-allowed select-none" : ""
                        }`}
                      >
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs"
                          style={{ backgroundColor: "#2563EB" }}
                        >
                          {STEP_ICON_MAP[step.iconKey] || <Zap className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="text-sm font-semibold text-gray-900"
                              style={{ fontFamily: "DM Sans, sans-serif" }}
                            >
                              {step.name}
                            </span>
                            {step.popular && (
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white bg-blue-600 shadow-2xs"
                                style={{ fontFamily: "DM Sans, sans-serif" }}
                              >
                                Popular
                              </span>
                            )}
                            {isUnavailable && (
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-600 border border-red-100"
                                style={{ fontFamily: "DM Sans, sans-serif" }}
                              >
                                In-Call only — unavailable
                              </span>
                            )}
                          </div>
                          <p
                            className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          >
                            {step.desc}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                      </button>
                    );

                    return isUnavailable ? (
                      <Tooltip key={step.key} text="In-Call only — unavailable" placement="top">
                        <div className="w-full pointer-events-auto">
                          {buttonElement}
                        </div>
                      </Tooltip>
                    ) : (
                      buttonElement
                    );
                  })
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* Step Detail Drawer for configuring step when added from library */}
        {stepDetailDrawerOpen && editingStep && (
          <StepDetailDrawer
            isOpen={stepDetailDrawerOpen}
            step={editingStep}
            isCreatingNewStep={true}
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
            availablePredecessors={workflowSteps.map((s) => ({
              id: s.id,
              label: s.name,
              isParallelGroup: s.executionType === "parallel",
            }))}
            params={stepParams}
            onParamsChange={(patch) => setStepParams((prev) => ({ ...prev, ...patch }))}
            onBack={() => setStepDetailDrawerOpen(false)}
            onClose={() => setStepDetailDrawerOpen(false)}
            onSave={handleSaveStepDetail}
          />
        )}
      </div>
    </AnimatePresence>,
    document.body
  );
}
