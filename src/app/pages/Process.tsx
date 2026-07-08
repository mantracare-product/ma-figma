import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { ChevronRight, ChevronDown, Plus, GripVertical, Edit, Trash2, Sparkles, Info, Play, AlertCircle, X, Bot, Phone, MessageSquare, PhoneCall, Mic, RefreshCw, Volume2, Sliders, Star, Ticket, MessageCircle, Clock, Timer, Volume, Users, Ban, Shield, FileText, UserCheck, Mail, PhoneOff, MessagesSquare, AlertTriangle, ExternalLink, Download, Upload, Lightbulb, Globe, Settings, Search, Calendar, ClipboardList, Inbox, Paperclip, Zap, Copy, Database, Webhook, LayoutGrid, Filter, Pencil, PhoneForwarded, Voicemail, GitBranch } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Tooltip } from "../components/ui/Tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { toast } from "sonner";
import { useAIProviders } from "../context/AIProviderContext";
import { useSidebar } from "../context/SidebarContext";
import PageHeader from "../components/layout/PageHeader";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import FlowBuilderTab from "../components/process/FlowBuilderTab";
import { WorkflowStep } from "../types/workflow";
import VariablePickerButton, { FETCH_FIELD_SOURCES, FIELDS_BY_SOURCE_MAP } from "../components/process/VariablePickerButton";
import StepParametersFields from "../components/process/StepParametersFields";
import StepDetailDrawer from "../components/process/StepDetailDrawer";
import KnowledgeBaseTab, { KnowledgeBase } from "../components/process/KnowledgeBaseTab";

interface AISettings {
  platform: string;
  voiceSpeed: number;
  voice?: string;
  tone?: string;
  style?: string;
}

interface Stage {
  id: string;
  name: string;
  description: string;
  status: string;
  color?: string;
  aiSettings?: AISettings;
}

interface Process {
  id: string;
  name: string;
  description: string;
  stages: Stage[];
  aiSettings: AISettings;
}


const STAGE_COLORS = [
  "#22D3EE", // cyan
  "#EC4899", // pink
  "#10B981", // green
  "#F59E0B", // amber
  "#8B5CF6", // purple
  "#EF4444", // red
];

// Comprehensive color palette for stage color picker (10x10 grid)
const COLOR_PALETTE = [
  // Row 1: Lightest tints
  "#B5EAF5", "#80D8F0", "#00BCD4", "#FFD54F", "#A5D6A7", "#EF9A9A", "#CE93D8", "#B0BEC5", "#CFD8DC", "#FFFFFF",
  // Row 2
  "#4DD0E1", "#00ACC1", "#FFB300", "#FFA000", "#8D6E63", "#EF5350", "#EC407A", "#9E9E9E", "#78909C", "#546E7A",
  // Row 3
  "#00E5FF", "#FFCA28", "#FFB74D", "#FF8A65", "#A1887F", "#E53935", "#D81B60", "#757575", "#607D8B", "#455A64",
  // Row 4
  "#FF6F00", "#F9A825", "#F57F17", "#BF360C", "#6D4C41", "#C62828", "#AD1457", "#616161", "#546E7A", "#37474F",
  // Row 5
  "#FF5722", "#FF7043", "#FFA726", "#FFCC02", "#66BB6A", "#43A047", "#2E7D32", "#1B5E20", "#004D40", "#212121",
  // Row 6
  "#EF6C00", "#E64A19", "#D84315", "#BF360C", "#558B2F", "#33691E", "#827717", "#F57F17", "#E65100", "#3E2723",
  // Row 7
  "#CDDC39", "#C6FF00", "#76FF03", "#69F0AE", "#1DE9B6", "#00E5FF", "#2979FF", "#651FFF", "#D500F9", "#FF1744",
  // Row 8
  "#9CCC65", "#8BC34A", "#7CB342", "#689F38", "#0288D1", "#0277BD", "#01579B", "#283593", "#1A237E", "#311B92",
  // Row 9
  "#26C6DA", "#00BFA5", "#1565C0", "#0D47A1", "#4527A0", "#6A1B9A", "#880E4F", "#B71C1C", "#E65100", "#33691E",
  // Row 10: Darkest
  "#006064", "#004D40", "#1B5E20", "#33691E", "#1A237E", "#0D47A1", "#311B92", "#4A148C", "#880E4F", "#000000",
];

const FORM_TEMPLATES = [
  {
    id: "contact-form",
    name: "Contact Form",
    description: "Captures name, email, phone and a message from the caller",
    usage: "Used by 12.5K businesses",
    iconBg: "#DBEAFE",
    iconColor: "#2563EB",
    icon: "message",
    fieldCount: "4 fields",
    fields: [
      { label: "Name", type: "Text" },
      { label: "Email", type: "Email" },
      { label: "Phone", type: "Phone" },
      { label: "Message", type: "Text" }
    ],
    buttonText: "Send Message"
  },
  {
    id: "appointment-booking",
    name: "Appointment Booking",
    description: "Collects scheduling details — preferred date, time slot and contact info",
    usage: "Used by 8.2K businesses",
    iconBg: "#D1FAE5",
    iconColor: "#059669",
    icon: "calendar",
    fieldCount: "5 fields",
    fields: [
      { label: "Name", type: "Text" },
      { label: "Email", type: "Email" },
      { label: "Phone", type: "Phone" },
      { label: "Preferred Date", type: "Date" },
      { label: "Time Slot", type: "Time" }
    ],
    buttonText: "Book Appointment"
  },
  {
    id: "lead-generation",
    name: "Lead Generation",
    description: "Gathers company name, role and pain points for B2B qualification",
    usage: "Used by 15.8K businesses",
    iconBg: "#EDE9FE",
    iconColor: "#7C3AED",
    icon: "briefcase",
    fieldCount: "5 fields",
    fields: [
      { label: "Name", type: "Text" },
      { label: "Email", type: "Email" },
      { label: "Phone", type: "Phone" },
      { label: "Company", type: "Text" },
      { label: "How can we help?", type: "Text" }
    ],
    buttonText: "Get Started"
  },
  {
    id: "quote-request",
    name: "Quote Request",
    description: "Collects project details and budget range for service inquiries",
    usage: "Used by 6.4K businesses",
    iconBg: "#FEF3C7",
    iconColor: "#D97706",
    icon: "document",
    fieldCount: "5 fields",
    fields: [
      { label: "Name", type: "Text" },
      { label: "Email", type: "Email" },
      { label: "Phone", type: "Phone" },
      { label: "Project Details", type: "Text" },
      { label: "Budget Range", type: "Text" }
    ],
    buttonText: "Request Quote"
  },
  {
    id: "event-registration",
    name: "Event Registration",
    description: "Captures attendee count and dietary needs for event sign-ups",
    usage: "Used by 4.9K businesses",
    iconBg: "#FCE7F3",
    iconColor: "#DB2777",
    icon: "ticket",
    fieldCount: "5 fields",
    fields: [
      { label: "Name", type: "Text" },
      { label: "Email", type: "Email" },
      { label: "Phone", type: "Phone" },
      { label: "Number of Attendees", type: "Number" },
      { label: "Dietary Requirements", type: "Text" }
    ],
    buttonText: "Register Now"
  }
];

interface DraggableStageProps {
  stage: Stage;
  index: number;
  moveStage: (dragIndex: number, hoverIndex: number) => void;
  onRemove: (stageId: string) => void;
  onEdit: (stage: Stage) => void;
}

const DraggableStage = ({ stage, index, moveStage, onRemove, onEdit }: DraggableStageProps) => {
  const [{ isDragging }, drag] = useDrag({
    type: "STAGE",
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: "STAGE",
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveStage(item.index, index);
        item.index = index;
      }
    },
  });

  return (
    <div className="relative flex-shrink-0">
      <div
        ref={(node) => { drag(drop(node)); }}
        className="relative flex items-center gap-2 px-5 py-3 cursor-pointer transition-all shadow-md hover:shadow-lg"
        style={{
          backgroundColor: stage.color || "#22D3EE",
          opacity: isDragging ? 0.5 : 1,
          minWidth: "160px",
          clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)",
        }}
        onDoubleClick={() => onEdit(stage)}
      >
        <span className="text-sm font-semibold text-white pr-3 flex-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          {stage.name}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(stage);
          }}
          className="text-white/90 hover:text-white transition-colors hover:scale-110"
        >
          <Edit className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Draggable Workflow Step Component
interface DraggableWorkflowStepProps {
  step: WorkflowStep;
  index: number;
  moveStep: (dragIndex: number, hoverIndex: number) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  StepIcon: React.ComponentType<{ iconKey: string }>;
  connectAfterLabel?: string;
}

const DraggableWorkflowStep: React.FC<DraggableWorkflowStepProps> = ({
  step,
  index,
  moveStep,
  onEdit,
  onDuplicate,
  onDelete,
  StepIcon,
  connectAfterLabel,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: 'WORKFLOW_STEP',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'WORKFLOW_STEP',
    hover: (item: { index: number }, monitor) => {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = (clientOffset?.y || 0) - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      moveStep(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-white cursor-pointer hover:bg-muted/10 transition-colors"
      style={{ opacity: isDragging ? 0.5 : 1 }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) {
          return;
        }
        onEdit();
      }}
    >
      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab flex-shrink-0" />
      <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#2563EB' }}>
        <StepIcon iconKey={step.iconKey} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>{step.name}</p>
        <p className="text-xs" style={{ color: '#94A3B8', fontFamily: 'Outfit, sans-serif' }}>
          {step.trigger === "incall"
            ? "→ Event Driven"
            : step.trigger === "postcall"
              ? `→ Event Driven · ${step.executionType === "parallel" ? "Parallel" : "Sequential"}${step.executionType !== "parallel" && step.delayValue
                ? ` (+${step.delayValue} ${step.delayUnit ?? "Minute"})`
                : ""
              }`
              : step.executionType === "parallel"
                ? "→ Parallel"
                : connectAfterLabel
                  ? `→ Sequential (${connectAfterLabel})`
                  : "→ Sequential"}
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          className="p-1.5 rounded hover:bg-muted/40 transition-colors"
          title="Duplicate"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
        >
          <Copy className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          className="p-1.5 rounded hover:bg-muted/40 transition-colors"
          title="Edit"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Pencil className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          className="p-1.5 rounded hover:bg-red-50 transition-colors"
          title="Delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </button>
      </div>
    </div>
  );
};
const INTENT_CONDITION_OPTIONS: Record<string, string[]> = {
  callhangup: [
    "Caller wants to end the call / says goodbye",
    "Caller asks to be removed from the calling list / stop being contacted",
    "Caller indicates this is a wrong number",
    "Caller is abusive, hostile, or uses inappropriate language",
    "Caller explicitly asks to hang up / end the call now",
    "Voicemail or answering machine detected (non-human)",
  ],
  callaction: [
    "Caller asks to speak with a human / representative / agent",
    "Caller asks for a manager or supervisor",
    "Caller wants the billing/accounts department",
    "Caller wants the sales department",
    "Caller wants technical support / service department",
    "Caller is frustrated, escalating, or expresses dissatisfaction with the AI",
    "Caller's issue is too complex/urgent for the AI to resolve",
  ],
  idlemessages: [
    "Caller has gone silent / unresponsive",
    "Caller sounds confused or hesitant",
    "Caller asks the AI to repeat or wait a moment",
    "Background noise/distraction detected, no clear response from caller",
  ],
  whatsapp: [
    "Caller asks for information to be sent via WhatsApp/text (menu, pricing, brochure, link)",
    "Caller requests a booking/scheduling link",
    "Caller wants order/appointment confirmation sent to their phone",
    "Caller confirms/shares their phone number for follow-up",
  ],
  sms: [
    "Caller asks for details to be texted (address, link, pricing, instructions)",
    "Caller requests appointment/booking confirmation via text",
    "Caller wants a reminder text sent",
    "Caller confirms/shares their phone number for follow-up",
  ],
  email: [
    "Caller asks for information to be emailed (quote, invoice, brochure, details)",
    "Caller wants a confirmation or receipt emailed",
    "Caller provides/confirms their email address for follow-up",
    "Caller requests documentation or forms via email",
  ],
};

const STEP_ALLOWED_TRIGGERS: Record<string, Array<"stage" | "incall" | "postcall">> = {
  "whatsapp": ["stage", "incall", "postcall"],
  "sms": ["stage", "incall", "postcall"],
  "email": ["stage", "incall", "postcall"],
  "processmovement": ["postcall"],
  "endworkflow": ["stage", "postcall"],
  "fieldupdate": ["stage", "postcall"],
  "assignhuman": ["stage", "postcall"],
  "crmupdate": ["stage", "postcall"],
  "ehrupdate": ["stage", "postcall"],
  "wh_trigger": ["stage", "postcall"],
  "webhook_trigger": ["stage", "postcall"],
  "collectinformation": ["stage", "postcall"],
  "scheduleappointment": ["postcall"],
  "smartcallanalysis": ["stage", "postcall"],
  "greetingphrase": ["incall"],
  "bypasstohuman": ["incall"],
  "liveintaketicket": ["incall"],
  "callaction": ["incall"],
  "autohangupsilence": ["incall"],
  "idlemessages": ["incall"],
  "callhangup": ["incall"],
  "fetchavailability": ["incall"],
  "fetchfieldvalue": ["incall"],
  "managecalendar": ["incall", "postcall"],
};

const buildAvailablePredecessors = (steps: WorkflowStep[], lane: "stage" | "incall" | "postcall", excludeId?: string) => {
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

export default function Process() {
  const { getActiveProviders } = useAIProviders();
  const activeProviders = getActiveProviders();
  const { setCollapsed } = useSidebar();

  useEffect(() => {
    setCollapsed(true);
  }, [setCollapsed]);

  const [processes, setProcesses] = useState<Process[]>([
    {
      id: "1",
      name: "Patient Intake",
      description: "Initial patient onboarding and verification process",
      aiSettings: {
        platform: "OpenAI - GPT-4o",
        voiceSpeed: 1.0,
        voice: "Ava",
        tone: "Professional",
        style: "Balanced",
      },
      stages: [
        { id: "1-1", name: "Initial Contact", description: "First call to patient for basic information gathering", status: "active", color: "#22D3EE" },
        { id: "1-2", name: "Insurance Verify", description: "Verify patient insurance details and coverage", status: "active", color: "#22D3EE" },
        { id: "1-3", name: "Schedule Appointment", description: "Schedule the patient's first appointment", status: "active", color: "#EC4899" },
      ],
    },
    {
      id: "2",
      name: "Follow-up Calls",
      description: "Post-visit follow-up and medication reminders",
      aiSettings: {
        platform: "Anthropic Claude",
        voiceSpeed: 1.2,
        voice: "Eva",
        tone: "Friendly",
        style: "Balanced",
      },
      stages: [
        { id: "2-1", name: "Post-Visit Check", description: "Check on patient after their visit", status: "active" },
        { id: "2-2", name: "Medication Reminder", description: "Remind patient to take their medication", status: "active" },
      ],
    },
  ]);

  const [selectedProcess, setSelectedProcess] = useState<string | null>(null);
  const [isEditingProcessInfo, setIsEditingProcessInfo] = useState(false);
  const [draftProcessName, setDraftProcessName] = useState("");
  const [draftProcessDescription, setDraftProcessDescription] = useState("");

  useEffect(() => {
    setIsEditingProcessInfo(false);
  }, [selectedProcess]);

  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [customApiIntegrations, setCustomApiIntegrations] = useState<any[]>([]);


  const [viewMode, setViewMode] = useState<"process" | "stage" | null>(null); // Track what we're viewing
  const [activeTab, setActiveTab] = useState<string>("basic");
  const [expandedProcesses, setExpandedProcesses] = useState<string[]>(["1"]); // Expand Patient Intake by default
  const [selectedAIModel, setSelectedAIModel] = useState("Smartest");
  const [aiModelExpanded, setAiModelExpanded] = useState(false);
  const [stageVoiceSpeed, setStageVoiceSpeed] = useState<number>(1.0);
  const [stageVoice, setStageVoice] = useState<string>("Ava");

  // Advanced tab section states
  // Retry Rules state
  const [retryRulesExpanded, setRetryRulesExpanded] = useState(false);
  const [retryRulesEnabled, setRetryRulesEnabled] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState<number>(3);
  const [retryDelay, setRetryDelay] = useState<number>(30);
  const [retryFallbackStage, setRetryFallbackStage] = useState<string>("Do Nothing");

  // Skip Day Rules state
  const [skipDayRulesExpanded, setSkipDayRulesExpanded] = useState(false);
  const [skipDayRulesEnabled, setSkipDayRulesEnabled] = useState(false);
  const [weeklyOffDays, setWeeklyOffDays] = useState<string[]>(["Sun", "Sat"]);
  const [customOffDate, setCustomOffDate] = useState<string>("");
  const [customOffDatesList, setCustomOffDatesList] = useState<string[]>([]);

  // Detect Voicemail state
  const [detectVoicemailExpanded, setDetectVoicemailExpanded] = useState(false);
  const [detectVoicemailEnabled, setDetectVoicemailEnabled] = useState(false);
  const [webhooksEnabled, setWebhooksEnabled] = useState(false);
  const [aiSettingsEnabled, setAISettingsEnabled] = useState(false);

  // Auto Hangup after interaction / Silence / Idle Messages state variables
  const [autoHangupInteractionExpanded, setAutoHangupInteractionExpanded] = useState(false);
  const [autoHangupInteractionEnabled, setAutoHangupInteractionEnabled] = useState(false);
  const [autoHangupInteractionMessage, setAutoHangupInteractionMessage] = useState("");
  const [callHangupMessage, setCallHangupMessage] = useState("");

  const [autoHangupSilenceStageExpanded, setAutoHangupSilenceStageExpanded] = useState(false);
  const [autoHangupSilenceStageEnabled, setAutoHangupSilenceStageEnabled] = useState(false);
  const [autoHangupSilenceStageDuration, setAutoHangupSilenceStageDuration] = useState(5);

  const [idleMessagesStageExpanded, setIdleMessagesStageExpanded] = useState(false);
  const [idleMessagesStageEnabled, setIdleMessagesStageEnabled] = useState(false);
  const [idleMessageStageText, setIdleMessageStageText] = useState("");
  const [idleMessageStageDelay, setIdleMessageStageDelay] = useState(10);
  const [idleHangupMessageStage, setIdleHangupMessageStage] = useState("");
  const [idleHangupDelayStage, setIdleHangupDelayStage] = useState(20);

  // Call Duration state variables
  const [callDurationExpanded, setCallDurationExpanded] = useState(false);
  const [callDurationMinutes, setCallDurationMinutes] = useState(5);
  const [hangupWindowMinutes, setHangupWindowMinutes] = useState(1);

  // Skip day rules state
  const [selectedOffDays, setSelectedOffDays] = useState<string[]>(["Sat", "Sun"]);
  const [customOffDates, setCustomOffDates] = useState<string[]>([]);

  // Inbound source state
  const [inboundNumbers, setInboundNumbers] = useState<string[]>(["+1 (555) 123-4567", "+1 (555) 987-6543", "+1 (555) 555-1234"]);
  const [selectedInboundNumbers, setSelectedInboundNumbers] = useState<string[]>(["+1 (555) 123-4567"]);
  const [stageType, setStageType] = useState<string>("AI Receives Calls");
  const [showAddNumberModal, setShowAddNumberModal] = useState(false);
  const [newNumber, setNewNumber] = useState("");
  const [selectedCountryCode, setSelectedCountryCode] = useState("+1");
  const [showNumberDropdown, setShowNumberDropdown] = useState(false);

  // AI Default Settings state
  const [aiDefaultSettingsExpanded, setAiDefaultSettingsExpanded] = useState(false);

  // Advanced Settings state
  const [advancedSettingsExpanded, setAdvancedSettingsExpanded] = useState(false);
  const [autoHangupExpanded, setAutoHangupExpanded] = useState(false);
  const [autoHangupSilenceExpanded, setAutoHangupSilenceExpanded] = useState(false);
  const [idleMessagesExpanded, setIdleMessagesExpanded] = useState(false);
  const [timeControlExpanded, setTimeControlExpanded] = useState(false);
  const [maxUsageLimitExpanded, setMaxUsageLimitExpanded] = useState(false);
  const [maxCallDurationExpanded, setMaxCallDurationExpanded] = useState(false);
  const [bypassToHumanExpanded, setBypassToHumanExpanded] = useState(false);
  const [blockedNumbersExpanded, setBlockedNumbersExpanded] = useState(false);
  const [smsBotSpammersExpanded, setSmsBotSpammersExpanded] = useState(false);

  // Transfer & Routing state
  const [extensionDigitsExpanded, setExtensionDigitsExpanded] = useState(false);
  const [allowVoicemailsExpanded, setAllowVoicemailsExpanded] = useState(false);
  const [bulkTransfersExpanded, setBulkTransfersExpanded] = useState(false);
  const [extensionEntries, setExtensionEntries] = useState<Array<{ id: number; extension: string; countryCode: string; phoneNumber: string }>>([]);
  const [savedExtensionEntries, setSavedExtensionEntries] = useState<Array<{ id: number; extension: string; countryCode: string; phoneNumber: string }>>([]);

  // Stage detail view state
  const [autoHangupMessage, setAutoHangupMessage] = useState("");
  const [autoHangupSilenceDuration, setAutoHangupSilenceDuration] = useState(1);
  const [idleMessage, setIdleMessage] = useState("");
  const [idleHangupMessage, setIdleHangupMessage] = useState("");
  const [savedTimeControlIntervals, setSavedTimeControlIntervals] = useState<Array<{ id: number; startTime: string; endTime: string; phoneNumber: string; countryCode: string }>>([]);
  const [timeControlIntervals, setTimeControlIntervals] = useState<Array<{ id: number; startTime: string; endTime: string; phoneNumber: string; countryCode: string }>>([]);
  const [maxUsageLimitEnabled, setMaxUsageLimitEnabled] = useState(false);
  const [maxUsageLimitEmails, setMaxUsageLimitEmails] = useState(["", "", ""]);
  const [maxUsageLimitValue, setMaxUsageLimitValue] = useState("");
  const [maxCallDuration, setMaxCallDuration] = useState(1);
  const [customEndingMessage, setCustomEndingMessage] = useState("");
  const [bypassToHumanEditMode, setBypassToHumanEditMode] = useState(false);
  const [bypassToHumanNumbers, setBypassToHumanNumbers] = useState<Array<{ id: number; phoneNumber: string; countryCode: string }>>([]);
  const [bypassStepNumbers, setBypassStepNumbers] = useState<Array<{ id: number; phoneNumber: string; countryCode: string }>>([{ id: 1, phoneNumber: "", countryCode: "+1" }]);
  const [blockedNumbers, setBlockedNumbers] = useState<Array<{ id: number; phoneNumber: string; countryCode: string }>>([]);
  const [landlineSmsPromptMessage, setLandlineSmsPromptMessage] = useState("");
  const [roboCallDetectionEnabled, setRoboCallDetectionEnabled] = useState(true);
  const [showTemporaryDisableModal, setShowTemporaryDisableModal] = useState(false);
  const [temporaryDisableEnabled, setTemporaryDisableEnabled] = useState(false);
  const [forwardCallsEnabled, setForwardCallsEnabled] = useState(false);
  const [forwardPhoneNumber, setForwardPhoneNumber] = useState("");
  const [forwardCountryCode, setForwardCountryCode] = useState("+1");

  // Basic Settings state variables
  const [expandedBasicSetting, setExpandedBasicSetting] = useState<string | null>(null);
  const [isEditingGreeting, setIsEditingGreeting] = useState(false);
  const [greetingPhrase, setGreetingPhrase] = useState("Hi, this is Alex from Mantra Care Health, who do I have the pleasure of speaking with today?");

  // Stage configuration state
  const [whenToMove, setWhenToMove] = useState<string>("");
  const [callerPitch, setCallerPitch] = useState<string>("Hi, I'm calling from [Your Business Name] to follow up on your recent inquiry. We'd love to help you get started with our services. Is now a good time to talk?");
  const [outboundCallingEnabled, setOutboundCallingEnabled] = useState<boolean>(true);
  const [responsiblePerson, setResponsiblePerson] = useState<string>("");

  // CHANGE 1: Collapsible sections state
  const [workflowStepsExpanded, setWorkflowStepsExpanded] = useState(true);
  const [workflowStepsDrawerOpen, setWorkflowStepsDrawerOpen] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [stageKnowledgeBases, setStageKnowledgeBases] = useState<Record<string, KnowledgeBase[]>>({});
  const [workflowStepCategory, setWorkflowStepCategory] = useState("all");
  const [workflowStepSearch, setWorkflowStepSearch] = useState("");
  const [selectedWorkflowStepCard, setSelectedWorkflowStepCard] = useState<string | null>(null);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [stepDetailDrawerOpen, setStepDetailDrawerOpen] = useState(false);
  const [currentEditingStep, setCurrentEditingStep] = useState<WorkflowStep | null>(null);

  useEffect(() => {
    if (stepDetailDrawerOpen && currentEditingStep?.stepKey === "wh_trigger") {
      try {
        setCustomApiIntegrations(JSON.parse(localStorage.getItem('customApiIntegrations') || '[]'));
      } catch (e) {
        console.error(e);
      }
    }
  }, [stepDetailDrawerOpen, currentEditingStep]);

  // Webhook integrations (session-only, synced from localStorage when drawer opens)
  const [customWebhookIntegrations, setCustomWebhookIntegrations] = useState<any[]>([]);

  useEffect(() => {
    if (stepDetailDrawerOpen && currentEditingStep?.stepKey === "webhook_trigger") {
      try {
        setCustomWebhookIntegrations(JSON.parse(localStorage.getItem('customWebhookIntegrations') || '[]'));
      } catch (e) {
        console.error(e);
      }
    }
  }, [stepDetailDrawerOpen, currentEditingStep]);
  const [isCreatingNewStep, setIsCreatingNewStep] = useState(false);
  const [executionTimingModalOpen, setExecutionTimingModalOpen] = useState(false);
  const [executionType, setExecutionType] = useState<"wait" | "parallel">("wait");
  const [delayValue, setDelayValue] = useState(5);
  const [delayUnit, setDelayUnit] = useState("Minute");
  const [conditions, setConditions] = useState<Array<{ id: string; fieldSource: string; field: string; operator: string; value: string }>>([
    { id: "cond-1", fieldSource: "", field: "", operator: "", value: "" }
  ]);
  const [conditionOperators, setConditionOperators] = useState<Array<"AND" | "OR">>([]);

  // In-Call split condition groups
  const [fieldConditions, setFieldConditions] = useState<Array<{ id: string; fieldSource: string; field: string; operator: string; value: string }>>([]);
  const [fieldConditionOperators, setFieldConditionOperators] = useState<Array<"AND" | "OR">>([]);
  const [fieldConditionsGroupExpanded, setFieldConditionsGroupExpanded] = useState(true);
  const [fieldExpandedCardIndex, setFieldExpandedCardIndex] = useState<number | null>(null);
  const [intentConditions, setIntentConditions] = useState<Array<{ id: string; value: string }>>([]);
  const [intentConditionOperators, setIntentConditionOperators] = useState<Array<"AND" | "OR">>([]);
  const [intentConditionsGroupExpanded, setIntentConditionsGroupExpanded] = useState(true);
  const [intentExpandedCardIndex, setIntentExpandedCardIndex] = useState<number | null>(null);
  const [intentInput, setIntentInput] = useState("");
  const [stepDetailProcess, setStepDetailProcess] = useState<string>("Select process...");
  const [stepDetailStage, setStepDetailStage] = useState<string>("Select stage...");
  const [movementTargetExpanded, setMovementTargetExpanded] = useState(true);
  const [actionConfigExpanded, setActionConfigExpanded] = useState(true);
  const [parametersExpanded, setParametersExpanded] = useState(true);
  const [assignHumanSearch, setAssignHumanSearch] = useState<string>("");
  const [callActionTransferType, setCallActionTransferType] = useState<"human" | "agent">("human");
  const [callActionCountryCode, setCallActionCountryCode] = useState<string>("+1");
  const [callActionPhoneNumber, setCallActionPhoneNumber] = useState<string>("");
  const [callActionAgentId, setCallActionAgentId] = useState<string>("");
  const [callActionReason, setCallActionReason] = useState<string>("");
  const [callActionVoiceResponse, setCallActionVoiceResponse] = useState<string>("Please hold while I transfer your call");
  const [callActionExtension, setCallActionExtension] = useState<string>("");

  // Fetch Availability states
  const [fetchAvailCalendarUser, setFetchAvailCalendarUser] = useState<string>("");
  const [fetchAvailDateSource, setFetchAvailDateSource] = useState<string>("");
  const [fetchAvailTimeSource, setFetchAvailTimeSource] = useState<string>("");
  const [fetchAvailSummary, setFetchAvailSummary] = useState<string>("");

  // Fetch Field Value states
  const [fetchFieldSource, setFetchFieldSource] = useState<string>("");
  const [fetchFieldSelected, setFetchFieldSelected] = useState<string>("");
  const [fetchFieldReason, setFetchFieldReason] = useState<string>("");

  // Manage Calendar states
  const [calendarMode, setCalendarMode] = useState<"book" | "reschedule" | "cancel">("book");
  const [calendarMeetingId, setCalendarMeetingId] = useState<string>("");
  const [calendarConnected, setCalendarConnected] = useState<string>("");
  const [calendarDate, setCalendarDate] = useState<string>("");
  const [calendarTime, setCalendarTime] = useState<string>("");
  const [calendarAppointmentField, setCalendarAppointmentField] = useState<string>("");


  // Field Update states
  const [fieldUpdateBlocks, setFieldUpdateBlocks] = useState<Array<{ fieldType: string; fieldToEdit: string; valueSource: "static" | "variable"; updateValue: string }>>([
    { fieldType: "System Fields", fieldToEdit: "Select field...", valueSource: "static", updateValue: "" }
  ]);
  const [expandedBlockIndex, setExpandedBlockIndex] = useState<number | null>(0);

  // Assign to Human / Call Action states
  const [assignedUser, setAssignedUser] = useState<string>("Select user...");

  // WhatsApp / SMS / Email states
  const [templateId, setTemplateId] = useState<string>("");
  const [smsMessage, setSmsMessage] = useState("");
  const [smsConnectedAccount, setSmsConnectedAccount] = useState("");
  const [whatsappTemplate, setWhatsappTemplate] = useState("");
  const [whatsappTemplateIdentifier, setWhatsappTemplateIdentifier] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [webhookHeaderTypes, setWebhookHeaderTypes] = useState<string[]>(["Static"]);

  // CRM Update states
  const [crmName, setCrmName] = useState<string>("Select CRM...");
  const [crmField, setCrmField] = useState<string>("Select field...");

  // EHR Update states
  const [ehrName, setEhrName] = useState<string>("Select EHR...");
  const [ehrField, setEhrField] = useState<string>("Select field...");

  // Webhook states
  const [webhookUrl, setWebhookUrl] = useState<string>("");
  const [webhookHeaders, setWebhookHeaders] = useState<Array<{ id: string; key: string; value: string }>>([{ id: "header-1", key: "", value: "" }]);
  const [webhookBody, setWebhookBody] = useState<string>("");

  // API states
  const [apiEndpoint, setApiEndpoint] = useState<string>("");
  const [apiMethod, setApiMethod] = useState<string>("GET");
  const [apiAuth, setApiAuth] = useState<string>("");
  const [apiHeaders, setApiHeaders] = useState<Array<{ id: string; key: string; value: string }>>([{ id: "header-1", key: "", value: "" }]);

  // New Webhook states
  const [webhookIntegration, setWebhookIntegration] = useState<string>("");
  const [webhookAction, setWebhookAction] = useState<string>("");
  const [webhookSelectedFields, setWebhookSelectedFields] = useState<string[]>([]);
  const [webhookUpdateRows, setWebhookUpdateRows] = useState<Array<{ fieldKey: string; value: string }>>([{ fieldKey: "", value: "" }]);
  const [webhookCreateRows, setWebhookCreateRows] = useState<Array<{ fieldName: string; value: string }>>([{ fieldName: "", value: "" }]);
  const [webhookPayloadMode, setWebhookPayloadMode] = useState<"fields" | "json">("fields");
  const [webhookJsonBody, setWebhookJsonBody] = useState<string>("");
  const [webhookJsonError, setWebhookJsonError] = useState<string>("");
  const [webhookReplaceRows, setWebhookReplaceRows] = useState<Array<{ existingFieldKey: string; newFieldName: string; newValue: string }>>([{ existingFieldKey: "", newFieldName: "", newValue: "" }]);


  // New API states
  const [apiIntegration, setApiIntegration] = useState<string>("");
  const [apiAction, setApiAction] = useState<string>("");
  const [apiResponseVariable, setApiResponseVariable] = useState<string>("");
  const [apiUpdatePolicy, setApiUpdatePolicy] = useState<string>("Ask me first");
  const [apiTimeout, setApiTimeout] = useState<number>(3);
  const [apiOnFailure, setApiOnFailure] = useState<string>("Continue call");

  // StepParametersFields — API integration fields
  const [apiSelectedIntegrationId, setApiSelectedIntegrationId] = useState<string>("");
  const [apiCreateFields, setApiCreateFields] = useState<Array<{ fieldKey: string; fieldLabel: string; value: string }>>([]);
  const [apiUpdateFields, setApiUpdateFields] = useState<Array<{ fieldKey: string; fieldLabel: string; value: string }>>([]);
  const [apiReplaceFields, setApiReplaceFields] = useState<Array<{ existingFieldKey: string; newFieldName: string; newValue: string }>>([]);
  const [apiDeleteField, setApiDeleteField] = useState<string>("");

  // StepParametersFields — Webhook integration fields
  const [webhookSelectedIntegrationId, setWebhookSelectedIntegrationId] = useState<string>("");
  const [webhookParsedFields, setWebhookParsedFields] = useState<Array<{ key: string; value: string }>>([]);

  // Dropdown open states
  const [webhookIntOpen, setWebhookIntOpen] = useState(false);
  const [webhookActionOpen, setWebhookActionOpen] = useState(false);
  const [webhookIntPos, setWebhookIntPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [webhookActionPos, setWebhookActionPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Close webhookInt dropdown on scroll or resize
  useEffect(() => {
    if (!webhookIntOpen) return;
    const handleScroll = (e: Event) => {
      if (webhookIntDropdownRef.current?.contains(e.target as Node)) return;
      setWebhookIntOpen(false);
      setWebhookIntPos(null);
    };
    const handleResize = () => { setWebhookIntOpen(false); setWebhookIntPos(null); };
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [webhookIntOpen]);

  // Close webhookAction dropdown on scroll or resize
  useEffect(() => {
    if (!webhookActionOpen) return;
    const handleScroll = (e: Event) => {
      if (webhookActionDropdownRef.current?.contains(e.target as Node)) return;
      setWebhookActionOpen(false);
      setWebhookActionPos(null);
    };
    const handleResize = () => { setWebhookActionOpen(false); setWebhookActionPos(null); };
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [webhookActionOpen]);
  const [apiIntOpen, setApiIntOpen] = useState(false);
  const [apiActionOpen, setApiActionOpen] = useState(false);

  // Appointment states
  const [appointmentUser, setAppointmentUser] = useState<string>("Select from Team Calendar...");
  const [appointmentDetails, setAppointmentDetails] = useState<string>("Appointment Time");
  const [appointmentBookingMethod, setAppointmentBookingMethod] = useState<string>("");

  const [conditionsEnabled, setConditionsEnabled] = useState(false);
  const [conditionsSectionExpanded, setConditionsSectionExpanded] = useState(true);
  const [expandedConditionIndex, setExpandedConditionIndex] = useState<number | null>(0);
  const [conditionPreview, setConditionPreview] = useState("");

  const [stepTrigger, setStepTrigger] = useState<"stage" | "incall" | "postcall">("stage");
  const [connectAfterId, setConnectAfterId] = useState<string | undefined>(undefined);
  const [stepActionName, setStepActionName] = useState("");
  const [stepActionReason, setStepActionReason] = useState("");

  // If Condition branch state
  const [ifCondField, setIfCondField] = useState("Stage Name");
  const [ifCondOperator, setIfCondOperator] = useState("Equal To");
  const [ifCondValue, setIfCondValue] = useState("");
  const [trueBranchSteps, setTrueBranchSteps] = useState<WorkflowStep[]>([]);
  const [falseBranchSteps, setFalseBranchSteps] = useState<WorkflowStep[]>([]);
  const [trueBranchExpanded, setTrueBranchExpanded] = useState(true);
  const [falseBranchExpanded, setFalseBranchExpanded] = useState(true);
  const [branchAddTarget, setBranchAddTarget] = useState<"true" | "false" | null>(null);

  useEffect(() => {
    if (!currentEditingStep?.stepKey) return;
    const allowed = STEP_ALLOWED_TRIGGERS[currentEditingStep.stepKey] ?? ["stage", "incall", "postcall"];
    if (!allowed.includes(stepTrigger)) {
      setStepTrigger(allowed[0]);
    }
  }, [currentEditingStep?.stepKey, stepTrigger]);

  // Email / CRM / EHR state — declared here so stateGetters/stateSetters can reference them
  const [showCustomEmail, setShowCustomEmail] = useState(false);
  const [emailConnectedAccount, setEmailConnectedAccount] = useState("");
  const [emailHtmlBody, setEmailHtmlBody] = useState("");
  const [htmlBodyViewMode, setHtmlBodyViewMode] = useState<"code" | "preview">("code");
  const [emailRichBody, setEmailRichBody] = useState("");
  const [crmUpdateValue, setCrmUpdateValue] = useState("");
  const [ehrUpdateValue, setEhrUpdateValue] = useState("");

  // Ticket / Collect Info / Call Analysis states — declared here so stateGetters/stateSetters can reference them
  const [ticketChecklist, setTicketChecklist] = useState<{ id: string; text: string }[]>([{ id: "check-1", text: "" }]);
  const [ticketEntries, setTicketEntries] = useState<Array<{
    taskName: string; taskDesc: string; assignee: string; deadline: string; priority: string;
    clientEmail: string; clientNumber: string; pauseProcess: string;
    checklist: { id: string; text: string }[];
  }>>([{
    taskName: "", taskDesc: "", assignee: "", deadline: "", priority: "Normal",
    clientEmail: "", clientNumber: "", pauseProcess: "No", checklist: [{ id: "check-1", text: "" }]
  }]);

  const [collectInfoSelectedForm, setCollectInfoSelectedForm] = useState<string>("");
  const [showCollectInfoDropdown, setShowCollectInfoDropdown] = useState(false);

  const [callAnalysisEnabled, setCallAnalysisEnabled] = useState(true);
  const [callAnalysisScenarios, setCallAnalysisScenarios] = useState<Array<{
    id: number;
    name: string;
    description: string;
    dataFormat: string;
  }>>([]);

  // Maps each stepKey to the list of state-variable names whose values should be
  // captured into WorkflowStep.params on save, and restored from WorkflowStep.params
  // on edit. Keep this in sync whenever a new parameter field is added to any step type.
  // Condition fields persisted for every step type
  const CONDITION_FIELDS = [
    "conditionsEnabled", "conditions", "conditionOperators",
    "fieldConditions", "fieldConditionOperators",
    "intentConditions", "intentConditionOperators",
  ];

  const STEP_PARAM_FIELDS: Record<string, string[]> = {
    fieldupdate: ["fieldUpdateBlocks", ...CONDITION_FIELDS],
    assignhuman: ["assignedUser", ...CONDITION_FIELDS],
    callaction: [
      "callActionTransferType", "callActionCountryCode", "callActionPhoneNumber",
      "callActionAgentId", "callActionReason", "callActionVoiceResponse", "callActionExtension",
      ...CONDITION_FIELDS,
    ],
    whatsapp: ["whatsappTemplate", "whatsappTemplateIdentifier", ...CONDITION_FIELDS],
    sms: ["smsMessage", "smsConnectedAccount", ...CONDITION_FIELDS],
    email: [
      "emailConnectedAccount", "showCustomEmail", "emailSubject",
      "emailRichBody", "emailHtmlBody", "htmlBodyViewMode",
      ...CONDITION_FIELDS,
    ],
    crmupdate: ["crmName", "crmField", "crmUpdateValue", ...CONDITION_FIELDS],
    ehrupdate: ["ehrName", "ehrField", "ehrUpdateValue", ...CONDITION_FIELDS],
    wh_trigger: [
      "apiSelectedIntegrationId", "apiAction", "apiCreateFields",
      "apiUpdateFields", "apiReplaceFields",
      "apiDeleteField",
      ...CONDITION_FIELDS,
    ],
    webhook_trigger: ["webhookSelectedIntegrationId", "webhookParsedFields", ...CONDITION_FIELDS],
    fetchavailability: ["fetchAvailCalendarUser", "fetchAvailDateSource", "fetchAvailTimeSource", "fetchAvailSummary", ...CONDITION_FIELDS],
    fetchfieldvalue: ["fetchFieldSource", "fetchFieldSelected", "fetchFieldReason", ...CONDITION_FIELDS],
    managecalendar: ["calendarMode", "calendarMeetingId", "calendarConnected", "calendarDate", "calendarTime", ...CONDITION_FIELDS],
    processmovement: ["stepDetailProcess", "stepDetailStage", ...CONDITION_FIELDS],
    stagemovement: ["stepDetailProcess", "stepDetailStage", ...CONDITION_FIELDS],
    greetingphrase: ["greetingPhrase", ...CONDITION_FIELDS],
    bypasstohuman: ["bypassStepNumbers", ...CONDITION_FIELDS],
    liveintaketicket: ["ticketEntries", ...CONDITION_FIELDS],
    collectinformation: ["collectInfoSelectedForm", ...CONDITION_FIELDS],
    scheduleappointment: ["appointmentBookingMethod", ...CONDITION_FIELDS],
    smartcallanalysis: ["callAnalysisScenarios", ...CONDITION_FIELDS],
    autohangupsilence: ["autoHangupSilenceStageDuration", ...CONDITION_FIELDS],
    callhangup: ["callHangupMessage", ...CONDITION_FIELDS],
    idlemessages: ["idleMessageStageText", "idleMessageStageDelay", "idleHangupMessageStage", "idleHangupDelayStage", ...CONDITION_FIELDS],
  };

  const stateGetters: Record<string, () => any> = {
    fieldUpdateBlocks: () => fieldUpdateBlocks,
    assignedUser: () => assignedUser,
    callActionTransferType: () => callActionTransferType,
    callActionCountryCode: () => callActionCountryCode,
    callActionPhoneNumber: () => callActionPhoneNumber,
    callActionAgentId: () => callActionAgentId,
    callActionReason: () => callActionReason,
    callActionVoiceResponse: () => callActionVoiceResponse,
    callActionExtension: () => callActionExtension,
    whatsappTemplate: () => whatsappTemplate,
    whatsappTemplateIdentifier: () => whatsappTemplateIdentifier,
    smsMessage: () => smsMessage,
    smsConnectedAccount: () => smsConnectedAccount,
    emailConnectedAccount: () => emailConnectedAccount,
    showCustomEmail: () => showCustomEmail,
    emailSubject: () => emailSubject,
    emailRichBody: () => emailRichBody,
    emailHtmlBody: () => emailHtmlBody,
    htmlBodyViewMode: () => htmlBodyViewMode,
    crmName: () => crmName,
    crmField: () => crmField,
    crmUpdateValue: () => crmUpdateValue,
    ehrName: () => ehrName,
    ehrField: () => ehrField,
    ehrUpdateValue: () => ehrUpdateValue,
    webhookIntegration: () => webhookIntegration,
    webhookAction: () => webhookAction,
    webhookSelectedFields: () => webhookSelectedFields,
    webhookUpdateRows: () => webhookUpdateRows,
    webhookCreateRows: () => webhookCreateRows,
    webhookReplaceRows: () => webhookReplaceRows,
    webhookPayloadMode: () => webhookPayloadMode,
    webhookJsonBody: () => webhookJsonBody,
    apiSelectedIntegrationId: () => apiSelectedIntegrationId,
    apiAction: () => apiAction,
    apiCreateFields: () => apiCreateFields,
    apiUpdateFields: () => apiUpdateFields,
    apiReplaceFields: () => apiReplaceFields,
    apiDeleteField: () => apiDeleteField,
    webhookSelectedIntegrationId: () => webhookSelectedIntegrationId,
    webhookParsedFields: () => webhookParsedFields,
    fetchAvailCalendarUser: () => fetchAvailCalendarUser,
    fetchAvailDateSource: () => fetchAvailDateSource,
    fetchAvailTimeSource: () => fetchAvailTimeSource,
    fetchAvailSummary: () => fetchAvailSummary,
    fetchFieldSource: () => fetchFieldSource,
    fetchFieldSelected: () => fetchFieldSelected,
    fetchFieldReason: () => fetchFieldReason,
    calendarMode: () => calendarMode,
    calendarMeetingId: () => calendarMeetingId,
    calendarConnected: () => calendarConnected,
    calendarDate: () => calendarDate,
    calendarTime: () => calendarTime,
    stepDetailProcess: () => stepDetailProcess,
    stepDetailStage: () => stepDetailStage,
    greetingPhrase: () => greetingPhrase,
    bypassStepNumbers: () => bypassStepNumbers,
    ticketEntries: () => ticketEntries,
    collectInfoSelectedForm: () => collectInfoSelectedForm,
    appointmentBookingMethod: () => appointmentBookingMethod,
    callAnalysisScenarios: () => callAnalysisScenarios,
    autoHangupSilenceStageDuration: () => autoHangupSilenceStageDuration,
    callHangupMessage: () => callHangupMessage,
    idleMessageStageText: () => idleMessageStageText,
    idleMessageStageDelay: () => idleMessageStageDelay,
    idleHangupMessageStage: () => idleHangupMessageStage,
    idleHangupDelayStage: () => idleHangupDelayStage,
    // Condition fields
    conditionsEnabled: () => conditionsEnabled,
    conditions: () => conditions,
    conditionOperators: () => conditionOperators,
    fieldConditions: () => fieldConditions,
    fieldConditionOperators: () => fieldConditionOperators,
    intentConditions: () => intentConditions,
    intentConditionOperators: () => intentConditionOperators,
  };

  const stateSetters: Record<string, (v: any) => void> = {
    fieldUpdateBlocks: setFieldUpdateBlocks,
    assignedUser: setAssignedUser,
    callActionTransferType: setCallActionTransferType,
    callActionCountryCode: setCallActionCountryCode,
    callActionPhoneNumber: setCallActionPhoneNumber,
    callActionAgentId: setCallActionAgentId,
    callActionReason: setCallActionReason,
    callActionVoiceResponse: setCallActionVoiceResponse,
    callActionExtension: setCallActionExtension,
    whatsappTemplate: setWhatsappTemplate,
    whatsappTemplateIdentifier: setWhatsappTemplateIdentifier,
    smsMessage: setSmsMessage,
    smsConnectedAccount: setSmsConnectedAccount,
    emailConnectedAccount: setEmailConnectedAccount,
    showCustomEmail: setShowCustomEmail,
    emailSubject: setEmailSubject,
    emailRichBody: setEmailRichBody,
    emailHtmlBody: setEmailHtmlBody,
    htmlBodyViewMode: setHtmlBodyViewMode,
    crmName: setCrmName,
    crmField: setCrmField,
    crmUpdateValue: setCrmUpdateValue,
    ehrName: setEhrName,
    ehrField: setEhrField,
    ehrUpdateValue: setEhrUpdateValue,
    webhookIntegration: setWebhookIntegration,
    webhookAction: setWebhookAction,
    webhookSelectedFields: setWebhookSelectedFields,
    webhookUpdateRows: setWebhookUpdateRows,
    webhookCreateRows: setWebhookCreateRows,
    webhookReplaceRows: setWebhookReplaceRows,
    webhookPayloadMode: setWebhookPayloadMode,
    webhookJsonBody: setWebhookJsonBody,
    apiSelectedIntegrationId: setApiSelectedIntegrationId,
    apiAction: setApiAction,
    apiCreateFields: setApiCreateFields,
    apiUpdateFields: setApiUpdateFields,
    apiReplaceFields: setApiReplaceFields,
    apiDeleteField: setApiDeleteField,
    webhookSelectedIntegrationId: setWebhookSelectedIntegrationId,
    webhookParsedFields: setWebhookParsedFields,
    fetchAvailCalendarUser: setFetchAvailCalendarUser,
    fetchAvailDateSource: setFetchAvailDateSource,
    fetchAvailTimeSource: setFetchAvailTimeSource,
    fetchAvailSummary: setFetchAvailSummary,
    fetchFieldSource: setFetchFieldSource,
    fetchFieldSelected: setFetchFieldSelected,
    fetchFieldReason: setFetchFieldReason,
    calendarMode: setCalendarMode,
    calendarMeetingId: setCalendarMeetingId,
    calendarConnected: setCalendarConnected,
    calendarDate: setCalendarDate,
    calendarTime: setCalendarTime,
    stepDetailProcess: setStepDetailProcess,
    stepDetailStage: setStepDetailStage,
    greetingPhrase: setGreetingPhrase,
    bypassStepNumbers: setBypassStepNumbers,
    ticketEntries: setTicketEntries,
    collectInfoSelectedForm: setCollectInfoSelectedForm,
    appointmentBookingMethod: setAppointmentBookingMethod,
    callAnalysisScenarios: setCallAnalysisScenarios,
    autoHangupSilenceStageDuration: setAutoHangupSilenceStageDuration,
    callHangupMessage: setCallHangupMessage,
    idleMessageStageText: setIdleMessageStageText,
    idleMessageStageDelay: setIdleMessageStageDelay,
    idleHangupMessageStage: setIdleHangupMessageStage,
    idleHangupDelayStage: setIdleHangupDelayStage,
    // Condition fields
    conditionsEnabled: setConditionsEnabled,
    conditions: setConditions,
    conditionOperators: setConditionOperators,
    fieldConditions: setFieldConditions,
    fieldConditionOperators: setFieldConditionOperators,
    intentConditions: setIntentConditions,
    intentConditionOperators: setIntentConditionOperators,
  };

  // Builds a params object from current state for the given stepKey.
  const captureStepParams = (stepKey?: string): Record<string, any> => {
    const fields = STEP_PARAM_FIELDS[stepKey ?? ""] ?? [];
    const out: Record<string, any> = {};
    fields.forEach(field => {
      const getter = stateGetters[field];
      if (getter) out[field] = getter();
    });
    return out;
  };

  // Restores state from a step's saved params object for the given stepKey.
  // Fields not present in params are left at whatever resetStepDetailState() set them to.
  const restoreStepParams = (stepKey?: string, params?: Record<string, any>) => {
    if (!params) return;
    const fields = STEP_PARAM_FIELDS[stepKey ?? ""] ?? [];
    fields.forEach(field => {
      const setter = stateSetters[field];
      if (setter && field in params) setter(params[field]);
    });
  };

  // Reset function to clear all step detail state
  const resetStepDetailState = () => {
    setConnectAfterId(undefined);
    setExecutionType("wait");
    setDelayValue(5);
    setDelayUnit("Minute");
    setConditions([{ id: "cond-1", fieldSource: "", field: "", operator: "", value: "" }]);
    setConditionOperators([]);
    setFieldConditions([]);
    setFieldConditionOperators([]);
    setFieldConditionsGroupExpanded(true);
    setFieldExpandedCardIndex(null);
    setIntentConditions([]);
    setIntentConditionOperators([]);
    setIntentConditionsGroupExpanded(true);
    setIntentExpandedCardIndex(null);
    setIntentInput("");
    setStepDetailProcess("Select process...");
    setStepDetailStage("Select stage...");
    setFieldUpdateBlocks([
      { fieldType: "System Fields", fieldToEdit: "Select field...", valueSource: "static", updateValue: "" }
    ]);
    setExpandedBlockIndex(0);
    setExpandedConditionIndex(0);
    setAssignedUser("Select user...");
    setTemplateId("");
    setSmsMessage("");
    setSmsConnectedAccount("");
    setWhatsappTemplate("");
    setWhatsappTemplateIdentifier("");
    setCrmName("Select CRM...");
    setCrmField("Select field...");
    setEhrName("Select EHR...");
    setEhrField("Select field...");
    setWebhookUrl("");
    setWebhookHeaders([{ id: "header-1", key: "", value: "" }]);
    setWebhookHeaderTypes(["Static"]);
    setWebhookBody("");
    setApiEndpoint("");
    setApiMethod("GET");
    setApiAuth("");
    setApiHeaders([{ id: "header-1", key: "", value: "" }]);
    setWebhookIntegration("");
    setWebhookAction("");
    setWebhookSelectedFields([]);
    setWebhookUpdateRows([{ fieldKey: "", value: "" }]);
    setWebhookCreateRows([{ fieldName: "", value: "" }]);
    setWebhookReplaceRows([{ existingFieldKey: "", newFieldName: "", newValue: "" }]);
    setWebhookPayloadMode("fields");
    setWebhookJsonBody("");
    setWebhookJsonError("");
    setWebhookIntegration(""); // also reset webhook_trigger selection
    setApiSelectedIntegrationId("");
    setApiAction("");
    setApiCreateFields([]);
    setApiUpdateFields([]);
    setApiReplaceFields([]);
    setApiDeleteField("");
    setWebhookSelectedIntegrationId("");
    setWebhookParsedFields([]);

    setWebhookIntOpen(false);
    setWebhookActionOpen(false);
    setApiIntOpen(false);
    setApiActionOpen(false);
    setApiIntegration("");
    setApiAction("");
    setApiResponseVariable("");
    setApiUpdatePolicy("Ask me first");
    setApiTimeout(3);
    setApiOnFailure("Continue call");
    setAppointmentUser("Select from Team Calendar...");
    setAppointmentDetails("Appointment Time");
    setCollectInfoSelectedForm("");
    setSmartAnalysisTrackWhat("");
    setSmartAnalysisFieldName("");
    setSmartAnalysisCaptureDesc("");
    setSmartAnalysisDataFormat("Text - Simple text responses like summaries or comments");
    setSmartAnalysisOutputExample("");
    setSmartAnalysisExpectedFormat("");
    setSmartAnalysisSelectedTemplate("");
    setShowCustomEmail(false);
    setTicketChecklist([{ id: "check-1", text: "" }]);
    setTicketEntries([{
      taskName: "", taskDesc: "", assignee: "", deadline: "", priority: "Normal",
      clientEmail: "", clientNumber: "", pauseProcess: "No", checklist: [{ id: "check-1", text: "" }]
    }]);
    setTcTimeIntervalsEnabled(false);
    setTcCallDurationMinutes(5);
    setTcHangupWindowMinutes(1);
    setBypassStepNumbers([{ id: 1, phoneNumber: "", countryCode: "+1" }]);
    setConditionsEnabled(false);
    setConditionsSectionExpanded(true);
    setConditionPreview("");
    setStepTrigger("stage");
    setStepActionName("");
    setStepActionReason("");
    setIfCondField("Stage Name");
    setIfCondOperator("Equal To");
    setIfCondValue("");
    setTrueBranchSteps([]);
    setFalseBranchSteps([]);
    setTrueBranchExpanded(true);
    setFalseBranchExpanded(true);
    setBranchAddTarget(null);
    setMovementTargetExpanded(true);
    setActionConfigExpanded(true);
    setParametersExpanded(true);
    setAssignHumanSearch("");
    setCallActionTransferType("human");
    setCallActionCountryCode("+1");
    setCallActionPhoneNumber("");
    setCallActionAgentId("");
    setCallActionReason("");
    setCallActionVoiceResponse("Please hold while I transfer your call");
    setCallActionExtension("");
    setFetchAvailCalendarUser("");
    setFetchAvailDateSource("");
    setFetchAvailTimeSource("");
    setFetchAvailSummary("");
    setFetchFieldSource("");
    setFetchFieldSelected("");
    setFetchFieldReason("");
    setCalendarMode("book");
    setCalendarMeetingId("");
    setCalendarConnected("");
    setCalendarDate("");
    setCalendarTime("");
    setCalendarAppointmentField("");
    setAutoHangupInteractionMessage("");
    setAutoHangupSilenceStageDuration(5);
    setIdleMessageStageText("");
    setIdleMessageStageDelay(10);
    setIdleHangupMessageStage("");
    setIdleHangupDelayStage(20);
    setEmailHtmlBody("");
    setHtmlBodyViewMode("code");
    setEmailConnectedAccount("");
    setEmailRichBody("");
    setCrmUpdateValue("");
    setEhrUpdateValue("");
    setEmailSubject("");
    setCallHangupMessage("");
  };

  const buildTriggerUrl = (trigger: "incall" | "postcall", actionName: string, actionReason: string) => {
    const executionContext = trigger === "incall" ? "in_call_action" : "post_call_action";
    const action = actionName.trim() ? actionName.trim() : "{action}";
    let url = `https://api.mantraassist.com/trigger?execution_context=${executionContext}&action=${action}&call_id={{call_id}}`;
    if (actionReason.trim()) url += `&reason=${actionReason.trim()}`;
    return url;
  };

  const smsMessageRef = useRef<HTMLTextAreaElement>(null);
  const emailRichBodyRef = useRef<HTMLTextAreaElement>(null);
  const emailHtmlBodyRef = useRef<HTMLTextAreaElement>(null);
  const crmUpdateValueRef = useRef<HTMLInputElement>(null);
  const ehrUpdateValueRef = useRef<HTMLInputElement>(null);
  const webhookUrlRef = useRef<HTMLInputElement>(null);
  const apiEndpointRef = useRef<HTMLInputElement>(null);
  const apiAuthRef = useRef<HTMLInputElement>(null);
  const fetchAvailSummaryRef = useRef<HTMLTextAreaElement>(null);
  const webhookJsonBodyRef = useRef<HTMLTextAreaElement>(null);

  const webhookIntDropdownRef = useRef<HTMLDivElement>(null);
  const webhookActionDropdownRef = useRef<HTMLDivElement>(null);

  const fieldUpdateValueRefs = useRef<(HTMLInputElement | null)[]>([]);
  const webhookFieldValueRefs = useRef<{ update: (HTMLInputElement | null)[]; create: (HTMLInputElement | null)[]; replace: (HTMLInputElement | null)[] }>({ update: [], create: [], replace: [] });
  const webhookTriggerDropdownRef = useRef<HTMLDivElement>(null);
  const ticketClientEmailRefs = useRef<(HTMLInputElement | null)[]>([]);
  const ticketClientNumberRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [tcTimeIntervalsEnabled, setTcTimeIntervalsEnabled] = useState(false);
  const [tcCallDurationMinutes, setTcCallDurationMinutes] = useState<number>(5);
  const [tcHangupWindowMinutes, setTcHangupWindowMinutes] = useState<number>(1);

  // CHANGE 2: Caller Pitch accordion and mode state
  const [callerPitchExpanded, setCallerPitchExpanded] = useState(true);
  const [callerPitchMode, setCallerPitchMode] = useState<"single" | "comprehensive">("single");

  // When to move accordion state
  const [whenToMoveExpanded, setWhenToMoveExpanded] = useState(false);

  // Comprehensive mode sub-section states
  const [greetingIntroExpanded, setGreetingIntroExpanded] = useState(false);
  const [objectiveExpanded, setObjectiveExpanded] = useState(false);
  const [businessInfoExpanded, setBusinessInfoExpanded] = useState(false);
  const [languagesExpanded, setLanguagesExpanded] = useState(false);

  // Comprehensive mode data
  const [greetingIntroMessage, setGreetingIntroMessage] = useState("");
  const [objectiveText, setObjectiveText] = useState("");
  const [businessInfoItems, setBusinessInfoItems] = useState<Array<{
    id: number;
    title: string;
    information: string;
    active: boolean;
  }>>([]);
  const [primaryLanguage, setPrimaryLanguage] = useState("");
  const [secondaryLanguages, setSecondaryLanguages] = useState<string[]>([]);
  const [secondaryLanguageDraft, setSecondaryLanguageDraft] = useState("");

  // Business Info inline form state
  const [showBusinessInfoForm, setShowBusinessInfoForm] = useState(false);
  const [businessInfoFormData, setBusinessInfoFormData] = useState({
    title: "",
    information: "",
    active: true
  });
  const [editingBusinessInfoId, setEditingBusinessInfoId] = useState<number | null>(null);

  // Available employees list for Responsible Person dropdown
  const availableEmployees = [
    { id: "1", name: "Sarah Johnson" },
    { id: "2", name: "Michael Chen" },
    { id: "3", name: "Emily Rodriguez" },
    { id: "4", name: "James Wilson" },
    { id: "5", name: "Lisa Thompson" },
  ];

  // In-Call Actions state variables
  const [savedTransferScenarios, setSavedTransferScenarios] = useState<Array<{
    id: number;
    description: string;
    phoneNumber: string;
    voiceResponse: string;
    transferType: string;
    enabled: boolean;
  }>>([]);
  const [showAddTransferModal, setShowAddTransferModal] = useState(false);
  const [showDeleteTransferConfirm, setShowDeleteTransferConfirm] = useState(false);
  const [transferToDelete, setTransferToDelete] = useState<number | null>(null);
  const [transferScenarios, setTransferScenarios] = useState([{
    id: 1,
    description: "",
    countryCode: "+1",
    phoneNumber: "",
    extensionDigits: "",
    voiceResponse: "Please hold while I transfer your call",
    transferType: "cold",
    advancedExpanded: false
  }]);
  const [transferWorkflowLimit] = useState(1); // Plan limit
  const [savedTextMessageScenarios, setSavedTextMessageScenarios] = useState<Array<{
    id: number;
    enableShortUrls: boolean;
    description: string;
    textMessage: string;
    nextAction: string;
    askBeforeSending: boolean;
    attachedImage: File | null;
    attachedImageUrl: string | null;
    enabled: boolean;
  }>>([]);
  const [showAddTextMessageModal, setShowAddTextMessageModal] = useState(false);
  const [showDeleteTextMessageConfirm, setShowDeleteTextMessageConfirm] = useState(false);
  const [textMessageToDelete, setTextMessageToDelete] = useState<number | null>(null);
  const [textMessageScenarios, setTextMessageScenarios] = useState([{
    id: 1,
    enableShortUrls: true,
    description: "",
    textMessage: "",
    nextAction: "",
    askBeforeSending: false,
    attachedImage: null as File | null,
    attachedImageUrl: null as string | null
  }]);
  const [textMessageWorkflowLimit] = useState(1);
  const [expandedTransferScenario, setExpandedTransferScenario] = useState<number | null>(null);
  const [expandedTextMessageScenario, setExpandedTextMessageScenario] = useState<number | null>(null);
  const [showAddFormDropdown, setShowAddFormDropdown] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [smartAnalysisTrackWhat, setSmartAnalysisTrackWhat] = useState("");
  const [smartAnalysisFieldName, setSmartAnalysisFieldName] = useState("");
  const [smartAnalysisCaptureDesc, setSmartAnalysisCaptureDesc] = useState("");
  const [smartAnalysisDataFormat, setSmartAnalysisDataFormat] = useState("Text - Simple text responses like summaries or comments");
  const [smartAnalysisOutputExample, setSmartAnalysisOutputExample] = useState("");
  const [smartAnalysisExpectedFormat, setSmartAnalysisExpectedFormat] = useState("");
  const [smartAnalysisSelectedTemplate, setSmartAnalysisSelectedTemplate] = useState("");
  const [editingFormId, setEditingFormId] = useState<number | null>(null);
  const [editingFormData, setEditingFormData] = useState<{
    templateName: string;
    fields: Array<{ label: string; type: string }>;
  } | null>(null);
  const [savedCollectInfoForms, setSavedCollectInfoForms] = useState<Array<{
    id: number;
    templateName: string;
    fields: Array<{ label: string; type: string }>;
  }>>([]);
  const [savedBookingWorkflows, setSavedBookingWorkflows] = useState<Array<{
    id: number;
    enableShortUrls: boolean;
    scenarioDescription: string;
    textMessage: string;
    nextAction: string;
    askBeforeSending: boolean;
  }>>([]);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [showAnalysisScenarioModal, setShowAnalysisScenarioModal] = useState(false);
  const [analysisScenarioData, setAnalysisScenarioData] = useState({
    trackWhat: "",
    fieldName: "",
    captureDescription: "",
    dataFormat: "Text - Simple text responses like summaries or comments",
    outputExample: "",
    expectedFormat: ""
  });
  const [customMessageEnabled, setCustomMessageEnabled] = useState(false);
  const [customMessageText, setCustomMessageText] = useState("");
  const [advancedSettings, setAdvancedSettings] = useState({
    aiModel: "Default",
    allowVoicemails: true,
    bulkTransfers: "None Set",
    recordCalls: true,
    recordTransferredCalls: true,
    callMemory: false,
    ambientBackgroundNoise: true,
    toggleRateCallSurvey: true,
    smsFallbackVoiceRecognition: true,
    autoHangupAfterInteraction: true,
    autoHangupAfterSilence: "1 Minutes",
    idleMessages: "",
    timeControl: [],
    pronunciationGuides: [],
    maxUsageLimit: false,
    maximumCallDuration: "Minutes",
    blockedNumbers: 0,
    botBlockPhrases: [],
    bypassToHumanNumbers: [],
    landlineNumberSmsPrompt: [],
    roboCallDetection: true,
    smsBotSpammers: [],
    temporaryDisable: false,
  });

  // Modal states
  const [showAddProcessModal, setShowAddProcessModal] = useState(false);
  const [showAddStageModal, setShowAddStageModal] = useState(false);
  const [showProcessHowItWorksModal, setShowProcessHowItWorksModal] = useState(false);
  const [showStageHowItWorksModal, setShowStageHowItWorksModal] = useState(false);
  const [showDeleteStageModal, setShowDeleteStageModal] = useState(false);
  const [stageToDelete, setStageToDelete] = useState<Stage | null>(null);
  const [showEditStageModal, setShowEditStageModal] = useState(false);
  const [editingStage, setEditingStage] = useState<{ id: string; name: string; color: string } | null>(null);
  const [isColorGridExpanded, setIsColorGridExpanded] = useState(false);
  const [isEditColorGridExpanded, setIsEditColorGridExpanded] = useState(false);
  const [hasInteractedWithColor, setHasInteractedWithColor] = useState(false);

  // Template states
  const [processModalTab, setProcessModalTab] = useState<"create" | "template">("create");
  const [stageModalTab, setStageModalTab] = useState<"create" | "template">("create");
  const [selectedProcessTemplate, setSelectedProcessTemplate] = useState<string | null>(null);
  const [selectedStageTemplate, setSelectedStageTemplate] = useState<string | null>(null);

  // Form states
  const [newProcess, setNewProcess] = useState({ name: "", description: "" });
  const [newStage, setNewStage] = useState({ name: "", description: "", color: STAGE_COLORS[0], type: "AI Receives Calls" });
  const [newStageSelectedNumbers, setNewStageSelectedNumbers] = useState<string[]>([]);
  const [showHowToReceiveCallModal, setShowHowToReceiveCallModal] = useState(false);
  const [applyAdvancedSettingsToAllStages, setApplyAdvancedSettingsToAllStages] = useState(false);
  const [stageTone, setStageTone] = useState<string>("Professional");
  const [stageStyle, setStageStyle] = useState<string>("Balanced");
  const [showNewStageNumberDropdown, setShowNewStageNumberDropdown] = useState(false);

  // Mock industry - in real app, this would come from organization settings
  const organizationIndustry = "Healthcare";

  // Process Templates
  const processTemplates = {
    Healthcare: [
      {
        id: "pt-1",
        name: "Patient Intake",
        description: "Initial onboarding and verification flow",
        stages: 3,
        stageData: [
          { name: "Initial Contact", description: "First call to patient for basic information gathering" },
          { name: "Insurance Verify", description: "Verify patient insurance details and coverage" },
          { name: "Schedule Appointment", description: "Schedule the patient's first appointment" },
        ],
      },
      {
        id: "pt-2",
        name: "Appointment Follow-up",
        description: "Reminders and confirmations",
        stages: 2,
        stageData: [
          { name: "Appointment Reminder", description: "Remind patient about upcoming appointment" },
          { name: "Post-Visit Check", description: "Follow up after the appointment" },
        ],
      },
      {
        id: "pt-3",
        name: "Medication Reminders",
        description: "Prescription refill and adherence tracking",
        stages: 2,
        stageData: [
          { name: "Refill Reminder", description: "Remind patient to refill prescription" },
          { name: "Adherence Check", description: "Check if patient is taking medication as prescribed" },
        ],
      },
    ],
    "Real Estate": [
      {
        id: "pt-4",
        name: "Lead Qualification",
        description: "Initial lead screening and qualification",
        stages: 3,
        stageData: [
          { name: "Initial Contact", description: "First contact with potential buyer" },
          { name: "Qualify Budget", description: "Understand budget and financing" },
          { name: "Schedule Viewing", description: "Schedule property viewing" },
        ],
      },
      {
        id: "pt-5",
        name: "Property Visit Follow-up",
        description: "Post-viewing engagement and conversion",
        stages: 2,
        stageData: [
          { name: "Viewing Feedback", description: "Collect feedback after property viewing" },
          { name: "Offer Discussion", description: "Discuss potential offer and next steps" },
        ],
      },
    ],
    Finance: [
      {
        id: "pt-6",
        name: "KYC Verification",
        description: "Customer verification and onboarding",
        stages: 3,
        stageData: [
          { name: "Document Collection", description: "Collect required KYC documents" },
          { name: "Verification", description: "Verify customer identity and documents" },
          { name: "Account Activation", description: "Complete account setup" },
        ],
      },
      {
        id: "pt-7",
        name: "Loan Follow-up",
        description: "Loan application tracking and updates",
        stages: 2,
        stageData: [
          { name: "Application Status", description: "Update customer on application status" },
          { name: "Document Reminder", description: "Remind about pending documents" },
        ],
      },
    ],
  };

  // Stage Templates
  const stageTemplates = {
    Healthcare: [
      {
        id: "st-1",
        name: "Insurance Verification",
        description: "Verify patient insurance details and coverage",
      },
      {
        id: "st-2",
        name: "Appointment Scheduling",
        description: "Schedule patient appointments and send confirmations",
      },
      {
        id: "st-3",
        name: "Prescription Refill",
        description: "Remind patients to refill prescriptions",
      },
      {
        id: "st-4",
        name: "Lab Results Follow-up",
        description: "Contact patients about lab results and next steps",
      },
    ],
    "Real Estate": [
      {
        id: "st-5",
        name: "Property Viewing Invite",
        description: "Invite potential buyers for property viewings",
      },
      {
        id: "st-6",
        name: "Offer Negotiation",
        description: "Discuss and negotiate property offers",
      },
      {
        id: "st-7",
        name: "Document Collection",
        description: "Collect required documents for property transaction",
      },
    ],
    Finance: [
      {
        id: "st-8",
        name: "Payment Reminder",
        description: "Remind customers about upcoming payments",
      },
      {
        id: "st-9",
        name: "Account Verification",
        description: "Verify customer account details",
      },
      {
        id: "st-10",
        name: "Fraud Alert",
        description: "Contact customers about suspicious activity",
      },
    ],
  };

  const selectedProcessData = processes.find((p) => p.id === selectedProcess);

  const handleAddProcess = () => {
    if (processModalTab === "create") {
      // Manual creation
      if (!newProcess.name || !newProcess.description) {
        toast.error("Please fill all fields");
        return;
      }

      const process: Process = {
        id: String(processes.length + 1),
        ...newProcess,
        stages: [],
        aiSettings: {
          platform: "OpenAI - GPT-4o",
          voiceSpeed: 1.0,
          voice: "Ava",
          tone: "Professional",
          style: "Balanced",
        },
      };

      setProcesses([...processes, process]);
      setSelectedProcess(process.id);
      setExpandedProcesses([...expandedProcesses, process.id]);
      setExpandedStage(null);
      setViewMode("process");
      setNewProcess({ name: "", description: "" });
      setShowAddProcessModal(false);
      setProcessModalTab("create");
      setSelectedProcessTemplate(null);
      toast.success("Process added successfully");
    } else {
      // Template selection
      if (!selectedProcessTemplate) {
        toast.error("Please select a template");
        return;
      }

      const allTemplates = Object.values(processTemplates).flat();
      const template = allTemplates.find((t) => t.id === selectedProcessTemplate);
      if (!template) return;

      const processId = String(processes.length + 1);
      const stages: Stage[] = template.stageData.map((stageData, index) => ({
        id: `${processId}-${index + 1}`,
        name: stageData.name,
        description: stageData.description,
        status: "active",
      }));

      const process: Process = {
        id: processId,
        name: template.name,
        description: template.description,
        stages,
        aiSettings: {
          platform: "OpenAI - GPT-4o",
          voiceSpeed: 1.0,
          voice: "Ava",
          tone: "Professional",
          style: "Balanced",
        },
      };

      setProcesses([...processes, process]);
      setSelectedProcess(process.id);
      setExpandedProcesses([...expandedProcesses, process.id]);
      setExpandedStage(null);
      setViewMode("process");
      setShowAddProcessModal(false);
      setProcessModalTab("create");
      setSelectedProcessTemplate(null);
      toast.success(`Process created from template with ${stages.length} stages`);
    }
  };

  const handleUpdateProcess = (field: string, value: any) => {
    if (!selectedProcess) return;

    setProcesses(
      processes.map((p) =>
        p.id === selectedProcess ? { ...p, [field]: value } : p
      )
    );
  };

  const handleUpdateProcessAI = (field: keyof AISettings, value: any) => {
    if (!selectedProcess) return;

    setProcesses(
      processes.map((p) =>
        p.id === selectedProcess
          ? { ...p, aiSettings: { ...p.aiSettings, [field]: value } }
          : p
      )
    );
  };

  const moveStage = (dragIndex: number, hoverIndex: number) => {
    if (!selectedProcess) return;

    setProcesses(
      processes.map((p) => {
        if (p.id === selectedProcess) {
          const newStages = [...p.stages];
          const [draggedStage] = newStages.splice(dragIndex, 1);
          newStages.splice(hoverIndex, 0, draggedStage);
          return { ...p, stages: newStages };
        }
        return p;
      })
    );
  };

  const handleRemoveStage = (stageId: string) => {
    if (!selectedProcess) return;

    setProcesses(
      processes.map((p) =>
        p.id === selectedProcess
          ? { ...p, stages: p.stages.filter((s) => s.id !== stageId) }
          : p
      )
    );
    toast.success("Stage removed successfully");
  };

  const handleEditStage = (stage: Stage) => {
    setEditingStage({
      id: stage.id,
      name: stage.name,
      color: stage.color || "#22D3EE"
    });
    setShowEditStageModal(true);
  };

  const handleSaveEditStage = () => {
    if (!selectedProcess || !editingStage) return;

    setProcesses(
      processes.map((p) =>
        p.id === selectedProcess
          ? {
            ...p,
            stages: p.stages.map((s) =>
              s.id === editingStage.id
                ? { ...s, name: editingStage.name, color: editingStage.color }
                : s
            ),
          }
          : p
      )
    );
    setShowEditStageModal(false);
    setEditingStage(null);
    toast.success("Stage updated successfully");
  };

  const handleQuickAddStage = () => {
    setShowAddStageModal(true);
  };

  const handleAddStage = () => {
    if (!selectedProcess) return;

    const selectedProc = processes.find((p) => p.id === selectedProcess);
    if (!selectedProc) return;

    if (stageModalTab === "create") {
      // Manual creation
      if (!newStage.name || !newStage.description) {
        toast.error("Please fill all fields");
        return;
      }

      const stage: Stage = {
        id: `${selectedProcess}-${selectedProc.stages.length + 1}`,
        ...newStage,
        status: "active",
      };

      setProcesses(
        processes.map((p) =>
          p.id === selectedProcess
            ? { ...p, stages: [...p.stages, stage] }
            : p
        )
      );

      // Auto-expand process and select new stage
      if (!expandedProcesses.includes(selectedProcess)) {
        setExpandedProcesses([...expandedProcesses, selectedProcess]);
      }
      setExpandedStage(stage.id);
      setViewMode("stage");
      setNewStage({ name: "", description: "", color: STAGE_COLORS[0], type: "AI Receives Calls" });
      setNewStageSelectedNumbers([]);
      setShowNewStageNumberDropdown(false);
      setHasInteractedWithColor(false);
      setIsColorGridExpanded(false);
      setShowAddStageModal(false);
      setStageModalTab("create");
      setSelectedStageTemplate(null);
      toast.success("Stage added successfully");
    } else {
      // Template selection
      if (!selectedStageTemplate) {
        toast.error("Please select a template");
        return;
      }

      const allTemplates = Object.values(stageTemplates).flat();
      const template = allTemplates.find((t) => t.id === selectedStageTemplate);
      if (!template) return;

      const randomColor = STAGE_COLORS[selectedProc.stages.length % STAGE_COLORS.length];
      const stage: Stage = {
        id: `${selectedProcess}-${selectedProc.stages.length + 1}`,
        name: template.name,
        description: template.description,
        status: "active",
        color: randomColor,
      };

      setProcesses(
        processes.map((p) =>
          p.id === selectedProcess
            ? { ...p, stages: [...p.stages, stage] }
            : p
        )
      );

      // Auto-expand process and select new stage
      if (!expandedProcesses.includes(selectedProcess)) {
        setExpandedProcesses([...expandedProcesses, selectedProcess]);
      }
      setExpandedStage(stage.id);
      setViewMode("stage");
      setShowAddStageModal(false);
      setStageModalTab("create");
      setSelectedStageTemplate(null);
      setNewStage({ name: "", description: "", color: STAGE_COLORS[0], type: "AI Receives Calls" });
      setNewStageSelectedNumbers([]);
      setShowNewStageNumberDropdown(false);
      setHasInteractedWithColor(false);
      setIsColorGridExpanded(false);
      toast.success("Stage added from template");
    }
  };

  const handleDeleteStage = () => {
    if (!stageToDelete || !selectedProcess) return;

    setProcesses(
      processes.map((p) =>
        p.id === selectedProcess
          ? { ...p, stages: p.stages.filter((s) => s.id !== stageToDelete.id) }
          : p
      )
    );

    setShowDeleteStageModal(false);
    setStageToDelete(null);
    setExpandedStage(null);
    setViewMode("process"); // Go back to process view after deleting stage
    toast.success("Stage deleted successfully");
  };

  const handleUpdateStageAI = (stageId: string, field: keyof AISettings, value: any) => {
    if (!selectedProcess) return;

    setProcesses(
      processes.map((p) =>
        p.id === selectedProcess
          ? {
            ...p,
            stages: p.stages.map((s) =>
              s.id === stageId
                ? {
                  ...s,
                  aiSettings: {
                    ...(s.aiSettings || p.aiSettings),
                    [field]: value,
                  },
                }
                : s
            ),
          }
          : p
      )
    );
  };

  const handleOverrideStageAI = (stageId: string) => {
    if (!selectedProcess || !selectedProcessData) return;

    setProcesses(
      processes.map((p) =>
        p.id === selectedProcess
          ? {
            ...p,
            stages: p.stages.map((s) =>
              s.id === stageId
                ? { ...s, aiSettings: { ...selectedProcessData.aiSettings } }
                : s
            ),
          }
          : p
      )
    );
    toast.info("AI settings enabled for this stage");
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      <div className="py-8 px-[150px] space-y-6">
        <PageHeader
          title="Process Settings"
          subtitle="Configure your call processes and stages"
        />

        <div className="flex gap-6 min-h-[calc(100vh-200px)]">
          {/* Left Panel - Process List */}
          <div className="w-80 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 h-[calc(100vh-200px)] overflow-y-auto flex-shrink-0">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Processes</h2>
              <Tooltip text="Add Process">
                <button
                  onClick={() => setShowAddProcessModal(true)}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
                >
                  <Plus className="w-5 h-5 text-white" />
                </button>
              </Tooltip>
            </div>

            <div className="space-y-1.5">
              {processes.map((process, index) => {
                const isExpanded = expandedProcesses.includes(process.id);
                const isProcessSelected = selectedProcess === process.id && viewMode === "process";
                const isProcessActive = selectedProcess === process.id; // Highlight if process or any of its stages is active

                return (
                  <div key={process.id} className={index > 0 ? "pt-1.5" : ""}>
                    {/* Process Row */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedProcesses((prev) =>
                            prev.includes(process.id)
                              ? prev.filter((id) => id !== process.id)
                              : [...prev, process.id]
                          );
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <ChevronRight className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""
                          }`} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProcess(process.id);
                          setExpandedStage(null);
                          setViewMode("process");
                          if (!isExpanded) {
                            setExpandedProcesses((prev) => [...prev, process.id]);
                          }
                        }}
                        className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isProcessSelected
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                          : isProcessActive
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "hover:bg-gray-50 border border-transparent"
                          }`}
                      >
                        <span className="flex-1 text-left font-semibold text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>{process.name}</span>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${isProcessSelected
                          ? "bg-white/20 text-white"
                          : isProcessActive
                            ? "bg-blue-200 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                          }`}>
                          {process.stages.length}
                        </span>
                      </button>
                    </div>

                    {/* Stages (when expanded) */}
                    {isExpanded && (
                      <div className="ml-10 mt-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                        {process.stages.length === 0 ? (
                          <div className="px-4 py-3 text-sm italic text-gray-400 bg-gray-50 rounded-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            No stages yet
                          </div>
                        ) : (
                          process.stages.map((stage, index) => {
                            const isStageSelected = selectedProcess === process.id && expandedStage === stage.id && viewMode === "stage";

                            return (
                              <button
                                key={stage.id}
                                onClick={() => {
                                  setSelectedProcess(process.id);
                                  setExpandedStage(stage.id);
                                  setViewMode("stage");
                                }}
                                className={`w-full flex items-center gap-2.5 text-left px-4 py-2.5 rounded-lg text-sm transition-all ${isStageSelected
                                  ? "bg-purple-50 text-purple-700 font-medium border border-purple-200"
                                  : "text-gray-700 hover:bg-gray-100 border border-transparent"
                                  }`}
                              >
                                <span
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: stage.color || '#22D3EE' }}
                                />
                                <span className="flex-1 font-medium">{stage.name}</span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel - Process or Stage Settings */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {selectedProcessData && viewMode === "process" ? (
              /* Process Settings View */
              <div className="h-full flex flex-col">
                {/* Process Header */}
                <div className="p-8 border-b border-gray-200 bg-gradient-to-r from-blue-50/30 to-white">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 min-w-0">
                      {!isEditingProcessInfo ? (
                        /* VIEW MODE */
                        <>
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h1 className="text-3xl font-bold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                              {selectedProcessData.name}
                            </h1>
                            <button
                              onClick={() => {
                                setDraftProcessName(selectedProcessData.name);
                                setDraftProcessDescription(selectedProcessData.description);
                                setIsEditingProcessInfo(true);
                              }}
                              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                              title="Edit Process Details"
                            >
                              <Edit className="w-4.5 h-4.5" />
                            </button>
                            <span className="text-sm px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full font-semibold whitespace-nowrap">
                              Process
                            </span>
                          </div>
                          <p
                            className="text-base whitespace-pre-wrap mt-1"
                            style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}
                          >
                            {selectedProcessData.description || "Add a description for this process..."}
                          </p>
                        </>
                      ) : (
                        /* EDIT MODE */
                        <div className="space-y-4 max-w-2xl">
                          <div>
                            <input
                              type="text"
                              value={draftProcessName}
                              onChange={(e) => setDraftProcessName(e.target.value)}
                              className="w-full text-3xl font-bold border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-1 outline-none transition-all"
                              style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}
                              placeholder="Process Name"
                            />
                          </div>
                          <div>
                            <textarea
                              value={draftProcessDescription}
                              onChange={(e) => setDraftProcessDescription(e.target.value)}
                              className="w-full text-base border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 outline-none transition-all resize-y min-h-[100px]"
                              style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}
                              rows={4}
                              placeholder="Add a description for this process..."
                            />
                          </div>
                          <div className="flex items-center gap-3 pt-1">
                            <button
                              onClick={() => {
                                handleUpdateProcess("name", draftProcessName);
                                handleUpdateProcess("description", draftProcessDescription);
                                setIsEditingProcessInfo(false);
                                toast.success("Process details updated");
                              }}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setIsEditingProcessInfo(false)}
                              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Tooltip text="How Process Works">
                        <button
                          onClick={() => setShowProcessHowItWorksModal(true)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
                        >
                          <Info className="w-5 h-5 text-gray-600" />
                        </button>
                      </Tooltip>
                      <Tooltip text="Temporary Disable">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={temporaryDisableEnabled}
                            onChange={(e) => {
                              setTemporaryDisableEnabled(e.target.checked);
                              toast.success(e.target.checked ? "Temporary disable enabled" : "Temporary disable disabled");
                            }}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </Tooltip>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <div className="p-8 space-y-6">
                    {/* Stage Management */}
                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                      <h3 className="text-xl font-bold mb-5" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Stages</h3>

                      <DndProvider backend={HTML5Backend}>
                        <div className="flex items-center gap-3 overflow-x-auto overflow-y-hidden pb-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                          {selectedProcessData.stages.map((stage, index) => (
                            <DraggableStage
                              key={stage.id}
                              stage={stage}
                              index={index}
                              moveStage={moveStage}
                              onRemove={handleRemoveStage}
                              onEdit={handleEditStage}
                            />
                          ))}
                          <button
                            onClick={handleQuickAddStage}
                            className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 transition-all flex-shrink-0 shadow-lg hover:shadow-xl"
                          >
                            <Plus className="w-6 h-6 text-white" />
                          </button>
                        </div>
                      </DndProvider>
                    </div>

                    {/* Advanced Settings */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      <button
                        onClick={() => setAdvancedSettingsExpanded(!advancedSettingsExpanded)}
                        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <Sliders className="w-5 h-5 text-blue-600" />
                          </div>
                          <h3 className="text-xl font-bold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                            Advanced Settings
                          </h3>
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 text-gray-500 transition-transform ${advancedSettingsExpanded ? 'rotate-180' : ''
                            }`}
                        />
                      </button>

                      {advancedSettingsExpanded && (
                        <div className="px-6 pb-6 space-y-4 border-t border-gray-200 pt-6 bg-gray-50/50">
                          {/* AI Voice & Model */}
                          <div className="w-full rounded-xl border border-gray-200 overflow-hidden bg-white">
                            <button
                              type="button"
                              onClick={() => setAiDefaultSettingsExpanded(!aiDefaultSettingsExpanded)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                  <Bot className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                    AI Voice &amp; Model
                                  </span>
                                  <Tooltip text="Settings defined here are automatically applied to all stages by default." placement="top">
                                    <Info className="w-3.5 h-3.5 text-gray-400 cursor-help hover:text-gray-600 transition-colors" />
                                  </Tooltip>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.location.href = '/settings?tab=voice-config';
                                  }}
                                  className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                  <Settings className="w-4 h-4 text-gray-500" />
                                </button>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${aiDefaultSettingsExpanded ? 'rotate-180' : ''}`} />
                              </div>
                            </button>

                            {aiDefaultSettingsExpanded && (
                              <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50/40">
                                <div>
                                  <label className="block text-sm font-semibold mb-2 text-gray-700">AI Model</label>
                                  <select
                                    value={selectedProcessData.aiSettings.platform}
                                    onChange={(e) => handleUpdateProcessAI("platform", e.target.value)}
                                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                                  >
                                    {activeProviders.length > 0 ? (
                                      activeProviders.map((provider) => (
                                        <option key={provider.id} value={`${provider.name} - ${provider.selectedModel}`}>
                                          {provider.name} - {provider.selectedModel}
                                        </option>
                                      ))
                                    ) : (
                                      <>
                                        <option>OpenAI</option>
                                        <option>Google Gemini</option>
                                        <option>Claude</option>
                                      </>
                                    )}
                                  </select>
                                </div>

                                <div>
                                  <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm font-semibold text-gray-700">
                                      Voice Speed
                                    </label>
                                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-bold rounded-lg">
                                      {selectedProcessData.aiSettings.voiceSpeed}x
                                    </span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0.5"
                                    max="2"
                                    step="0.1"
                                    value={selectedProcessData.aiSettings.voiceSpeed}
                                    onChange={(e) => handleUpdateProcessAI("voiceSpeed", parseFloat(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                  />
                                  <div className="flex justify-between text-xs mt-2 text-gray-500 font-medium">
                                    <span>0.5x</span>
                                    <span>2.0x</span>
                                  </div>
                                </div>

                                {/* Voice / Tone / Style — 3-column grid */}
                                <div className="grid grid-cols-3 gap-3">
                                  <div>
                                    <label className="block text-sm font-semibold mb-2 text-gray-700">Voice</label>
                                    <select
                                      value={selectedProcessData.aiSettings.voice || "Ava"}
                                      onChange={(e) => handleUpdateProcessAI("voice", e.target.value)}
                                      className="w-full px-3 py-2.5 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-sm"
                                      style={{ fontFamily: 'Outfit, sans-serif' }}
                                    >
                                      <option>Ava</option>
                                      <option>Eva</option>
                                      <option>Aria</option>
                                      <option>Sam</option>
                                      <option>Jack</option>
                                      <option>Mango</option>
                                    </select>
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5 mb-2">
                                      <label className="text-sm font-semibold text-gray-700">Tone</label>
                                      <Tooltip text="Select the default tone of voice the AI will use during calls (e.g. Professional, Friendly).">
                                        <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                      </Tooltip>
                                    </div>
                                    <select
                                      value={selectedProcessData.aiSettings.tone || "Professional"}
                                      onChange={(e) => handleUpdateProcessAI("tone", e.target.value)}
                                      className="w-full px-3 py-2.5 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-sm"
                                      style={{ fontFamily: 'Outfit, sans-serif' }}
                                    >
                                      <option value="Professional">Professional</option>
                                      <option value="Friendly">Friendly</option>
                                      <option value="Empathetic">Empathetic</option>
                                      <option value="Casual">Casual</option>
                                      <option value="Persuasive">Persuasive</option>
                                    </select>
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5 mb-2">
                                      <label className="text-sm font-semibold text-gray-700">Style</label>
                                      <Tooltip text="Select the default conversational style (e.g. Concise, Detailed).">
                                        <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                      </Tooltip>
                                    </div>
                                    <select
                                      value={selectedProcessData.aiSettings.style || "Balanced"}
                                      onChange={(e) => handleUpdateProcessAI("style", e.target.value)}
                                      className="w-full px-3 py-2.5 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-sm"
                                      style={{ fontFamily: 'Outfit, sans-serif' }}
                                    >
                                      <option value="Balanced">Balanced</option>
                                      <option value="Concise">Concise</option>
                                      <option value="Detailed">Detailed</option>
                                      <option value="Humorous">Humorous</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>






                          {/* Extension Digits */}
                          <div className="w-full rounded-xl border border-gray-200 overflow-hidden bg-white mt-4">
                            <button
                              type="button"
                              onClick={() => setExtensionDigitsExpanded(!extensionDigitsExpanded)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <PhoneForwarded className="w-5 h-5 text-primary" />
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                    Extension Digits
                                  </span>
                                  <Tooltip text="Configure extension digits for call routing" placement="top">
                                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                                  </Tooltip>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                  {savedExtensionEntries.length > 0 ? `${savedExtensionEntries.length} set` : 'Not set'}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${extensionDigitsExpanded ? 'rotate-180' : ''}`} />
                              </div>
                            </button>

                            {extensionDigitsExpanded && (
                              <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50/40">
                                <p className="text-sm text-gray-600 leading-relaxed">
                                  You can set up extension codes that your AI Receptionist can handle to reroute the caller. i.e. 'press 3 for billing department'.
                                </p>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                  The caller can dial an extension to transfer the call. They can either dial the extension after the original greeting phrase, or they can ask the AI to dial an extension anytime. Make sure to use the format +1XXXXXXXXXX for the phone number.
                                </p>
                                <div className="flex gap-2">
                                  <button className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5">
                                    <ExternalLink className="w-3.5 h-3.5" /> Learn More
                                  </button>
                                  <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5">
                                    <Download className="w-3.5 h-3.5" /> Download Sample
                                  </button>
                                  <button className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5">
                                    <Upload className="w-3.5 h-3.5" /> Upload File
                                  </button>
                                </div>
                                <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4">
                                  <p className="text-sm text-blue-800">
                                    <span className="font-semibold">Tip:</span> If you are using this feature, we recommend you tell callers about it in the greeting phrase. For example, 'If you already know your party's extension, you can dial it after I finish talking. You can also dial it anytime by saying dial an extension'.
                                  </p>
                                </div>

                                {/* Extension entries */}
                                <div className="space-y-3">
                                  {extensionEntries.map((entry) => (
                                    <div key={entry.id} className="flex items-center gap-2">
                                      <div className="flex-1">
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">AI's Extension:</label>
                                        <input
                                          type="text"
                                          placeholder="234"
                                          value={entry.extension}
                                          onChange={(e) => setExtensionEntries(extensionEntries.map(x => x.id === entry.id ? { ...x, extension: e.target.value } : x))}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                        />
                                      </div>
                                      <div className="flex-1">
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Route to:</label>
                                        <div className="flex gap-1">
                                          <select
                                            value={entry.countryCode}
                                            onChange={(e) => setExtensionEntries(extensionEntries.map(x => x.id === entry.id ? { ...x, countryCode: e.target.value } : x))}
                                            className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white"
                                          >
                                            <option value="us">🇺🇸 +1</option>
                                            <option value="gb">🇬🇧 +44</option>
                                            <option value="ca">🇨🇦 +1</option>
                                          </select>
                                          <input
                                            type="text"
                                            placeholder="+1"
                                            value={entry.phoneNumber}
                                            onChange={(e) => setExtensionEntries(extensionEntries.map(x => x.id === entry.id ? { ...x, phoneNumber: e.target.value } : x))}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                          />
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => setExtensionEntries(extensionEntries.filter(x => x.id !== entry.id))}
                                        className="mt-5 p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>

                                <button
                                  onClick={() => setExtensionEntries([...extensionEntries, { id: Date.now(), extension: '', countryCode: 'us', phoneNumber: '' }])}
                                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
                                >
                                  + Add Extension
                                </button>
                                <button
                                  onClick={() => {
                                    setSavedExtensionEntries([...extensionEntries]);
                                    toast.success("Extension entry added");
                                  }}
                                  className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                                >
                                  Save
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Record Calls */}
                          <div className="w-full rounded-xl border border-gray-200 overflow-hidden bg-white mt-4">
                            <div className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                              <div className="flex items-center gap-3">
                                <Mic className="w-5 h-5 text-primary" />
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                    Record Calls
                                  </span>
                                  <Tooltip text="Enable call recording" placement="top">
                                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                                  </Tooltip>
                                </div>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={advancedSettings.recordCalls}
                                  onChange={(e) => {
                                    setAdvancedSettings({ ...advancedSettings, recordCalls: e.target.checked });
                                    toast.success(e.target.checked ? "Call recording enabled" : "Call recording disabled");
                                  }}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                              </label>
                            </div>
                          </div>

                          {/* Call Duration */}
                          <div className="w-full rounded-xl border border-gray-200 overflow-hidden bg-white mt-4">
                            <button
                              type="button"
                              onClick={() => setCallDurationExpanded(!callDurationExpanded)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-primary" />
                                <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                  Call Duration
                                </span>
                              </div>
                              <ChevronDown
                                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${callDurationExpanded ? 'rotate-180' : ''}`}
                              />
                            </button>

                            {callDurationExpanded && (
                              <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50/40">
                                <div className="flex items-end gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <label className="text-sm font-medium" style={{ color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>
                                        Call Duration (min)
                                      </label>
                                      <Tooltip text="Maximum call duration allowed for a call.">
                                        <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                      </Tooltip>
                                    </div>
                                    <input
                                      type="number"
                                      min={1}
                                      value={callDurationMinutes}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value) || 1;
                                        setCallDurationMinutes(val);
                                        if (hangupWindowMinutes >= val) {
                                          setHangupWindowMinutes(val - 1 > 0 ? val - 1 : 1);
                                        }
                                      }}
                                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                      style={{ fontFamily: 'Outfit, sans-serif', color: '#020817' }}
                                    />
                                  </div>

                                  <div className="flex-1">
                                    <div className="flex items-center gap-1.5 mb-2">
                                      <label className="text-sm font-medium" style={{ color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>
                                        Hangup Window
                                      </label>
                                      <Tooltip text="During the last X minutes of the total call duration, the AI will proactively try to wrap up the conversation and end the call gracefully.">
                                        <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                      </Tooltip>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-gray-500 whitespace-nowrap" style={{ fontFamily: 'Outfit, sans-serif' }}>Last</span>
                                      <input
                                        type="number"
                                        min={1}
                                        max={callDurationMinutes - 1}
                                        value={hangupWindowMinutes}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value) || 1;
                                          if (val >= callDurationMinutes) {
                                            toast.error(`Hangup window must be less than the call duration (${callDurationMinutes} min)`);
                                            return;
                                          }
                                          setHangupWindowMinutes(val);
                                        }}
                                        className="flex-1 min-w-0 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                        style={{ fontFamily: 'Outfit, sans-serif', color: '#020817' }}
                                      />
                                      <span className="text-sm text-gray-500 whitespace-nowrap" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                        {hangupWindowMinutes === 1 ? 'minute' : 'minutes'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Retry Rules */}
                          <div className="w-full rounded-xl border border-gray-200 overflow-hidden bg-white mt-4">
                            <button
                              type="button"
                              onClick={() => setRetryRulesExpanded(!retryRulesExpanded)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <RefreshCw className="w-5 h-5 text-primary" />
                                <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                  Retry Rules
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                  {retryRulesEnabled ? 'On' : 'Off'}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${retryRulesExpanded ? 'rotate-180' : ''}`} />
                              </div>
                            </button>

                            {retryRulesExpanded && (
                              <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50/40">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                                      Enable Retry Rules
                                    </span>
                                    <Tooltip text="If call fails, automatically retry calling based on rules configured below.">
                                      <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                    </Tooltip>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={retryRulesEnabled}
                                      onChange={(e) => setRetryRulesEnabled(e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                                  </label>
                                </div>

                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <label className="text-sm font-medium" style={{ color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>
                                      Retry Attempts
                                    </label>
                                    <Tooltip text="Number of call retry attempts to make before failing permanently.">
                                      <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                    </Tooltip>
                                  </div>
                                  <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={retryAttempts}
                                    onChange={(e) => setRetryAttempts(parseInt(e.target.value) || 1)}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                    style={{ fontFamily: 'Outfit, sans-serif', color: '#020817' }}
                                  />
                                </div>

                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <label className="text-sm font-medium" style={{ color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>
                                      Delay Between Retries (minutes)
                                    </label>
                                    <Tooltip text="Time to wait between each retry attempt.">
                                      <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                    </Tooltip>
                                  </div>
                                  <input
                                    type="number"
                                    min={1}
                                    value={retryDelay}
                                    onChange={(e) => setRetryDelay(parseInt(e.target.value) || 1)}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                    style={{ fontFamily: 'Outfit, sans-serif', color: '#020817' }}
                                  />
                                </div>

                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <label className="text-sm font-medium" style={{ color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>
                                      Fallback Stage
                                    </label>
                                    <Tooltip text="Workflow stage to transition call task to if all retry attempts fail.">
                                      <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                    </Tooltip>
                                  </div>
                                  <select
                                    value={retryFallbackStage}
                                    onChange={(e) => setRetryFallbackStage(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                                    style={{ fontFamily: 'Outfit, sans-serif', color: '#020817' }}
                                  >
                                    <option value="Do Nothing">Do Nothing</option>
                                    {selectedProcessData?.stages.map((s) => (
                                      <option key={s.id} value={s.name}>
                                        {s.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Skip Day Rules */}
                          <div className="w-full rounded-xl border border-gray-200 overflow-hidden bg-white mt-4">
                            <button
                              type="button"
                              onClick={() => setSkipDayRulesExpanded(!skipDayRulesExpanded)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-primary" />
                                <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                  Skip Day Rules
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                  {skipDayRulesEnabled ? 'On' : 'Off'}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${skipDayRulesExpanded ? 'rotate-180' : ''}`} />
                              </div>
                            </button>

                            {skipDayRulesExpanded && (
                              <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50/40">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                                      Enable Skip Day Rules
                                    </span>
                                    <Tooltip text="Avoid making automated outbound calls on selected days/dates.">
                                      <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                    </Tooltip>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={skipDayRulesEnabled}
                                      onChange={(e) => setSkipDayRulesEnabled(e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                                  </label>
                                </div>

                                <div>
                                  <div className="flex items-center gap-2 mb-3">
                                    <label className="text-sm font-medium" style={{ color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>
                                      Weekly Off Days
                                    </label>
                                    <Tooltip text="Days of the week to skip automated calling.">
                                      <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                    </Tooltip>
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => {
                                      const isActive = weeklyOffDays.includes(day);
                                      return (
                                        <button
                                          key={day}
                                          type="button"
                                          onClick={() =>
                                            setWeeklyOffDays((prev) =>
                                              isActive ? prev.filter((d) => d !== day) : [...prev, day]
                                            )
                                          }
                                          className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold border transition-all ${isActive
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600'
                                            }`}
                                          style={{ fontFamily: 'DM Sans, sans-serif' }}
                                        >
                                          {day}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <label className="text-sm font-medium" style={{ color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>
                                      Custom Off Dates
                                    </label>
                                    <Tooltip text="Specific calendar dates on which no calls will be placed.">
                                      <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                    </Tooltip>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="date"
                                      value={customOffDate}
                                      onChange={(e) => setCustomOffDate(e.target.value)}
                                      className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                      style={{ fontFamily: 'Outfit, sans-serif', color: '#020817' }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (customOffDate && !customOffDatesList.includes(customOffDate)) {
                                          setCustomOffDatesList((prev) => [...prev, customOffDate]);
                                          setCustomOffDate('');
                                        }
                                      }}
                                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors flex-shrink-0"
                                    >
                                      <Plus className="w-4 h-4 text-white" />
                                    </button>
                                  </div>

                                  {customOffDatesList.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {customOffDatesList.map((date) => (
                                        <span
                                          key={date}
                                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium"
                                          style={{ fontFamily: 'Outfit, sans-serif' }}
                                        >
                                          {date}
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setCustomOffDatesList((prev) => prev.filter((d) => d !== date))
                                            }
                                            className="hover:text-blue-900 transition-colors"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  <p className="mt-2 text-xs" style={{ color: '#94A3B8', fontFamily: 'Outfit, sans-serif' }}>
                                    Calls will not be scheduled on selected days and dates.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Detect Voicemail */}
                          <div className="w-full rounded-xl border border-gray-200 overflow-hidden bg-white mt-4">
                            <button
                              type="button"
                              onClick={() => setDetectVoicemailExpanded(!detectVoicemailExpanded)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Voicemail className="w-5 h-5 text-primary" />
                                <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                  Detect Voicemail
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                  {detectVoicemailEnabled ? 'On' : 'Off'}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${detectVoicemailExpanded ? 'rotate-180' : ''}`} />
                              </div>
                            </button>

                            {detectVoicemailExpanded && (
                              <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/40">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                                      Enable Voicemail Detection
                                    </span>
                                    <Tooltip text="This allows AI to detect if the caller is on leave voice mail and disconnect the call">
                                      <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                    </Tooltip>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={detectVoicemailEnabled}
                                      onChange={(e) => setDetectVoicemailEnabled(e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Save & Apply Options */}
                          <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col gap-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={applyAdvancedSettingsToAllStages}
                                onChange={(e) => setApplyAdvancedSettingsToAllStages(e.target.checked)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm font-medium text-gray-700" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                Apply changes to all stages
                              </span>
                            </label>
                            <div className="flex justify-end gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  if (applyAdvancedSettingsToAllStages) {
                                    toast.success("Advanced settings saved and applied to all stages successfully!");
                                  } else {
                                    toast.success("Advanced settings saved successfully!");
                                  }
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition-colors"
                                style={{ fontFamily: 'DM Sans, sans-serif' }}
                              >
                                Save Advanced Settings
                              </button>
                            </div>
                          </div>

                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            ) : selectedProcessData && viewMode === "stage" && expandedStage ? (
              (() => {
                const stage = selectedProcessData.stages.find((s) => s.id === expandedStage);
                if (!stage) return null;

                return (
                  <div className="h-full flex flex-col">
                    {/* Stage Header */}
                    <div className="px-6 py-4 border-b border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold" style={{ fontFamily: 'DM Sans, sans-serif' }}>{stage.name}</h2>
                            <span className="text-sm px-3 py-1 bg-secondary/10 text-secondary rounded-full" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              Stage
                            </span>
                          </div>
                          <p className="text-sm mt-2" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>{stage.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Tooltip text="Temporarily disable this stage">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={temporaryDisableEnabled}
                                onChange={(e) => {
                                  setTemporaryDisableEnabled(e.target.checked);
                                  toast.success(e.target.checked ? "Stage temporarily disabled" : "Stage re-enabled");
                                }}
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                          </Tooltip>
                          <Tooltip text="How Stage Works">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowStageHowItWorksModal(true)}
                            >
                              <Info className="w-4 h-4" />
                            </Button>
                          </Tooltip>
                          <Tooltip text="Delete Stage">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setStageToDelete(stage);
                                setShowDeleteStageModal(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </Tooltip>
                        </div>
                      </div>

                      {/* Stage Tabs */}
                      <div className="flex gap-2 mt-4">
                        {[
                          { id: "basic", label: "Basic" },
                          { id: "advanced", label: "Advance" },
                          { id: "knowledgebase", label: "Knowledge Base" },
                          { id: "automation", label: "Automation" },
                          { id: "flowbuilder", label: "Flow Builder" },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === tab.id
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted"
                              }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Stage Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                      {/* Basic Tab */}
                      {activeTab === "basic" && (
                        <div className="space-y-6">
                          {/* Stage Configuration Section */}
                          <div className="space-y-4">
                            {/* Type and Right Column Field Row - Conditional Layout */}
                            <div className={stageType === "AI Receives Calls" || stageType === "AI Makes Calls" || stageType === "Transfer to Human" ? "grid grid-cols-2 gap-4" : ""}>
                              {/* Type Dropdown */}
                              <div className="flex flex-col">
                                <label className="block text-sm font-medium mb-2" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                  Call Actions
                                </label>
                                <Select value={stageType} onValueChange={setStageType}>
                                  <SelectTrigger className="h-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="AI Receives Calls">AI Receives Calls</SelectItem>
                                    <SelectItem value="AI Makes Calls">AI Makes Calls</SelectItem>
                                    <SelectItem value="No Call Activity">No Call Activity</SelectItem>
                                    <SelectItem value="Transfer to Human">Transfer to Human</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Inbound Source Multi-Select - Only show when Type is "AI Receives Calls" or "AI Makes Calls" */}
                              {(stageType === "AI Receives Calls" || stageType === "AI Makes Calls") && (
                                <div className="relative flex flex-col">
                                  <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                    {stageType === "AI Makes Calls" ? "Choose the outbound source" : "Choose the inbound source"}
                                    <Tooltip text={stageType === "AI Makes Calls" ? "Select which phone numbers this stage will use to make outbound calls" : "Select which phone numbers will trigger this stage when they receive calls"}>
                                      <Info className="w-4 h-4 text-muted-foreground" />
                                    </Tooltip>
                                    {stageType === "AI Receives Calls" && (
                                      <button
                                        type="button"
                                        onClick={() => setShowHowToReceiveCallModal(true)}
                                        className="ml-1 text-sm font-semibold text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors"
                                        style={{ fontFamily: 'DM Sans, sans-serif', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                                      >
                                        How to Receive Call
                                      </button>
                                    )}
                                  </label>
                                  <div className="flex flex-wrap gap-2 p-3 bg-input-background border border-input rounded-lg min-h-[42px] flex-1">
                                    {selectedInboundNumbers.map((number) => (
                                      <span
                                        key={number}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-sm h-fit"
                                      >
                                        {number}
                                        <button
                                          type="button"
                                          onClick={() => setSelectedInboundNumbers(selectedInboundNumbers.filter(n => n !== number))}
                                          className="hover:bg-primary/20 rounded"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </span>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => setShowNumberDropdown(!showNumberDropdown)}
                                      className="text-sm text-muted-foreground hover:text-foreground"
                                    >
                                      + Add
                                    </button>
                                  </div>
                                  {showNumberDropdown && (
                                    <div className="absolute mt-1 top-full p-2 bg-card border border-border rounded-lg shadow-lg z-10 w-full max-w-[300px]">
                                      {inboundNumbers.filter(n => !selectedInboundNumbers.includes(n)).map((number) => (
                                        <button
                                          key={number}
                                          type="button"
                                          onClick={() => {
                                            setSelectedInboundNumbers([...selectedInboundNumbers, number]);
                                            setShowNumberDropdown(false);
                                          }}
                                          className="block w-full text-left px-3 py-2 text-sm hover:bg-muted rounded"
                                        >
                                          {number}
                                        </button>
                                      ))}
                                    </div>
                                  )}

                                </div>
                              )}

                              {/* Responsible Person - Only show when Type is "Transfer to Human" */}
                              {stageType === "Transfer to Human" && (
                                <div className="flex flex-col">
                                  <label className="block text-sm font-medium mb-2" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                    Responsible Person
                                  </label>
                                  <Select value={responsiblePerson} onValueChange={setResponsiblePerson}>
                                    <SelectTrigger className="h-full">
                                      <SelectValue placeholder="Select an employee" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableEmployees.map((employee) => (
                                        <SelectItem key={employee.id} value={employee.id}>
                                          {employee.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>

                            {/* When to move to this stage */}
                            <div className="rounded-lg border border-border overflow-hidden">
                              <button
                                onClick={() => setWhenToMoveExpanded(!whenToMoveExpanded)}
                                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                              >
                                <div className="flex flex-col items-start gap-1">
                                  <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                    When to move to this stage
                                  </span>
                                  <span className="text-xs" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                                    Define the conditions or criteria for moving to this stage.
                                  </span>
                                </div>
                                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${whenToMoveExpanded ? "rotate-180" : ""}`} />
                              </button>

                              {whenToMoveExpanded && (
                                <div className="p-6 border-t border-border">
                                  <textarea
                                    value={whenToMove}
                                    onChange={(e) => setWhenToMove(e.target.value)}
                                    placeholder="Define the conditions or criteria for moving to this stage..."
                                    className="w-full p-3 bg-input-background border border-input rounded-lg resize-none text-sm"
                                    style={{ fontFamily: 'Outfit, sans-serif', minHeight: '100px' }}
                                  />
                                </div>
                              )}
                            </div>

                            {/* Caller Pitch - Hide completely when Type is "Transfer to Human" or "No Call Activity" */}
                            {stageType !== "Transfer to Human" && stageType !== "No Call Activity" && (
                              <div className="rounded-lg border border-border overflow-hidden">
                                {/* Collapsible Header */}
                                <button
                                  onClick={() => setCallerPitchExpanded(!callerPitchExpanded)}
                                  className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                                >
                                  <div className="flex flex-col items-start gap-1">
                                    <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                      Caller Pitch
                                    </span>
                                    <span className="text-xs" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                                      Script or instruction used when initiating outbound calls.
                                    </span>
                                  </div>
                                  <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${callerPitchExpanded ? "rotate-180" : ""}`} />
                                </button>

                                {/* Expanded Content */}
                                {callerPitchExpanded && (
                                  <div className="p-6 border-t border-border">
                                    {/* Mode Toggle */}
                                    <div className="flex gap-2 mb-6 bg-muted/30 p-1 rounded-lg w-fit">
                                      <button
                                        onClick={() => setCallerPitchMode("single")}
                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${callerPitchMode === "single"
                                          ? "bg-primary text-white"
                                          : "text-gray-600 hover:text-gray-900"
                                          }`}
                                        style={{ fontFamily: 'Outfit, sans-serif' }}
                                      >
                                        Single Prompt
                                      </button>
                                      <button
                                        onClick={() => setCallerPitchMode("comprehensive")}
                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${callerPitchMode === "comprehensive"
                                          ? "bg-primary text-white"
                                          : "text-gray-600 hover:text-gray-900"
                                          }`}
                                        style={{ fontFamily: 'Outfit, sans-serif' }}
                                      >
                                        Comprehensive
                                      </button>
                                    </div>

                                    {/* Single Prompt Mode */}
                                    {callerPitchMode === "single" && (
                                      <div>
                                        <textarea
                                          value={callerPitch}
                                          onChange={(e) => setCallerPitch(e.target.value)}
                                          className="w-full p-3 bg-input-background border border-input rounded-lg resize-none text-sm"
                                          style={{ fontFamily: 'Outfit, sans-serif', minHeight: '120px' }}
                                        />
                                        <div className="flex items-center justify-end mt-2">
                                          <button
                                            onClick={() => {
                                              toast.success("AI generation coming soon!");
                                            }}
                                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                                            style={{ fontFamily: 'Outfit, sans-serif' }}
                                          >
                                            <Zap className="w-4 h-4" />
                                            Generate with AI
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    {/* Comprehensive Mode */}
                                    {callerPitchMode === "comprehensive" && (
                                      <div className="space-y-3">
                                        {/* A. Greeting / Intro Message */}
                                        <div className="rounded-lg border border-border overflow-hidden">
                                          <button
                                            onClick={() => setGreetingIntroExpanded(!greetingIntroExpanded)}
                                            className="w-full flex items-center justify-between p-3 hover:bg-muted/20 transition-colors"
                                          >
                                            <div className="flex flex-col items-start gap-0.5">
                                              <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                                Greeting / Intro Message
                                              </span>
                                              {!greetingIntroExpanded && greetingIntroMessage && (
                                                <span className="text-xs truncate max-w-md" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                                                  {greetingIntroMessage.slice(0, 80)}...
                                                </span>
                                              )}
                                              {!greetingIntroExpanded && !greetingIntroMessage && (
                                                <span className="text-xs" style={{ color: '#9CA3AF', fontFamily: 'Outfit, sans-serif' }}>
                                                  Not configured
                                                </span>
                                              )}
                                            </div>
                                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${greetingIntroExpanded ? "rotate-180" : ""}`} />
                                          </button>

                                          {greetingIntroExpanded && (
                                            <div className="p-4 border-t border-border">
                                              <textarea
                                                value={greetingIntroMessage}
                                                onChange={(e) => setGreetingIntroMessage(e.target.value)}
                                                placeholder="Hi, this is Alex. Who do I have the pleasure of speaking with today?"
                                                className="w-full p-3 bg-input-background border border-input rounded-lg resize-none text-sm"
                                                style={{ fontFamily: 'Outfit, sans-serif', minHeight: '100px' }}
                                              />
                                            </div>
                                          )}
                                        </div>

                                        {/* B. Objective */}
                                        <div className="rounded-lg border border-border overflow-hidden">
                                          <button
                                            onClick={() => setObjectiveExpanded(!objectiveExpanded)}
                                            className="w-full flex items-center justify-between p-3 hover:bg-muted/20 transition-colors"
                                          >
                                            <div className="flex flex-col items-start gap-0.5">
                                              <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                                Objective
                                              </span>
                                              {!objectiveExpanded && objectiveText && (
                                                <span className="text-xs truncate max-w-md" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                                                  {objectiveText.slice(0, 80)}...
                                                </span>
                                              )}
                                              {!objectiveExpanded && !objectiveText && (
                                                <span className="text-xs" style={{ color: '#9CA3AF', fontFamily: 'Outfit, sans-serif' }}>
                                                  Not configured
                                                </span>
                                              )}
                                            </div>
                                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${objectiveExpanded ? "rotate-180" : ""}`} />
                                          </button>

                                          {objectiveExpanded && (
                                            <div className="p-4 border-t border-border">
                                              <textarea
                                                value={objectiveText}
                                                onChange={(e) => setObjectiveText(e.target.value)}
                                                placeholder="You are an AI assistant. Your role is to answer general inquiries, schedule appointments, and provide information about our services."
                                                className="w-full p-3 bg-input-background border border-input rounded-lg resize-none text-sm"
                                                style={{ fontFamily: 'Outfit, sans-serif', minHeight: '100px' }}
                                              />
                                            </div>
                                          )}
                                        </div>

                                        {/* C. Business Information */}
                                        <div className="rounded-lg border border-border overflow-hidden">
                                          <button
                                            onClick={() => setBusinessInfoExpanded(!businessInfoExpanded)}
                                            className="w-full flex items-center justify-between p-3 hover:bg-muted/20 transition-colors"
                                          >
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                                Business Information
                                              </span>
                                              {!businessInfoExpanded && businessInfoItems.length > 0 && (
                                                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-600" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                                  {businessInfoItems.length} {businessInfoItems.length === 1 ? 'item' : 'items'}
                                                </span>
                                              )}
                                              {!businessInfoExpanded && businessInfoItems.length === 0 && (
                                                <span className="text-xs" style={{ color: '#9CA3AF', fontFamily: 'Outfit, sans-serif' }}>
                                                  No data added
                                                </span>
                                              )}
                                            </div>
                                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${businessInfoExpanded ? "rotate-180" : ""}`} />
                                          </button>

                                          {businessInfoExpanded && (
                                            <div className="p-4 border-t border-border space-y-3">
                                              <p className="text-sm mb-3" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                                                Add business information that the AI should know while speaking with callers.
                                              </p>

                                              {/* Existing Business Info Items */}
                                              {businessInfoItems.map((item) => (
                                                <div key={item.id} className="p-3 border border-border rounded-lg bg-muted/20">
                                                  <div className="flex items-start justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                      <span className="text-sm font-bold" style={{ color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>
                                                        {item.title}
                                                      </span>
                                                      {item.active && (
                                                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                                          Active
                                                        </span>
                                                      )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                      <button
                                                        onClick={() => {
                                                          setEditingBusinessInfoId(item.id);
                                                          setBusinessInfoFormData({
                                                            title: item.title,
                                                            information: item.information,
                                                            active: item.active
                                                          });
                                                          setShowBusinessInfoForm(true);
                                                        }}
                                                        className="text-blue-600 hover:text-blue-700"
                                                      >
                                                        <Edit className="w-4 h-4" />
                                                      </button>
                                                      <button
                                                        onClick={() => {
                                                          setBusinessInfoItems(businessInfoItems.filter(i => i.id !== item.id));
                                                          toast.success("Information deleted");
                                                        }}
                                                        className="text-red-600 hover:text-red-700"
                                                      >
                                                        <Trash2 className="w-4 h-4" />
                                                      </button>
                                                    </div>
                                                  </div>
                                                  <p className="text-xs" style={{ color: '#6B7280', fontFamily: 'Outfit, sans-serif' }}>
                                                    {item.information}
                                                  </p>
                                                </div>
                                              ))}

                                              {/* Inline Add/Edit Form */}
                                              {showBusinessInfoForm && (
                                                <div className="p-4 border border-primary/30 rounded-lg bg-blue-50/30 space-y-3">
                                                  <div>
                                                    <label className="block text-xs font-medium mb-1" style={{ color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>
                                                      Title
                                                    </label>
                                                    <input
                                                      type="text"
                                                      value={businessInfoFormData.title}
                                                      onChange={(e) => setBusinessInfoFormData({ ...businessInfoFormData, title: e.target.value })}
                                                      placeholder="Example: Clinic Timings"
                                                      className="w-full p-2 bg-white border border-input rounded-lg text-sm"
                                                      style={{ fontFamily: 'Outfit, sans-serif' }}
                                                    />
                                                  </div>
                                                  <div>
                                                    <label className="block text-xs font-medium mb-1" style={{ color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>
                                                      Information
                                                    </label>
                                                    <textarea
                                                      value={businessInfoFormData.information}
                                                      onChange={(e) => setBusinessInfoFormData({ ...businessInfoFormData, information: e.target.value })}
                                                      placeholder="Example: Our clinic is open Monday to Saturday from 9 AM to 7 PM."
                                                      className="w-full p-2 bg-white border border-input rounded-lg resize-none text-sm"
                                                      style={{ fontFamily: 'Outfit, sans-serif', minHeight: '80px' }}
                                                    />
                                                  </div>
                                                  <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                      <label className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                                        Active
                                                      </label>
                                                      <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                          type="checkbox"
                                                          className="sr-only peer"
                                                          checked={businessInfoFormData.active}
                                                          onChange={(e) => setBusinessInfoFormData({ ...businessInfoFormData, active: e.target.checked })}
                                                        />
                                                        <div className="w-11 h-6 bg-switch-background peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-switch-background after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                                      </label>
                                                    </div>
                                                    <div className="flex gap-2">
                                                      <button
                                                        onClick={() => {
                                                          setShowBusinessInfoForm(false);
                                                          setEditingBusinessInfoId(null);
                                                          setBusinessInfoFormData({ title: "", information: "", active: true });
                                                        }}
                                                        className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                                        style={{ fontFamily: 'Outfit, sans-serif' }}
                                                      >
                                                        Cancel
                                                      </button>
                                                      <button
                                                        onClick={() => {
                                                          if (businessInfoFormData.title && businessInfoFormData.information) {
                                                            if (editingBusinessInfoId !== null) {
                                                              // Edit existing
                                                              setBusinessInfoItems(businessInfoItems.map(item =>
                                                                item.id === editingBusinessInfoId
                                                                  ? { ...item, ...businessInfoFormData }
                                                                  : item
                                                              ));
                                                              toast.success("Information updated");
                                                            } else {
                                                              // Add new
                                                              setBusinessInfoItems([...businessInfoItems, {
                                                                id: Date.now(),
                                                                ...businessInfoFormData
                                                              }]);
                                                              toast.success("Information added");
                                                            }
                                                            setShowBusinessInfoForm(false);
                                                            setEditingBusinessInfoId(null);
                                                            setBusinessInfoFormData({ title: "", information: "", active: true });
                                                          }
                                                        }}
                                                        className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover"
                                                        style={{ fontFamily: 'Outfit, sans-serif' }}
                                                      >
                                                        Done
                                                      </button>
                                                    </div>
                                                  </div>
                                                </div>
                                              )}

                                              {/* Add Information Button */}
                                              {!showBusinessInfoForm && (
                                                <button
                                                  onClick={() => setShowBusinessInfoForm(true)}
                                                  className="w-full px-4 py-2 border border-dashed border-gray-400 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 text-sm font-medium"
                                                  style={{ fontFamily: 'Outfit, sans-serif' }}
                                                >
                                                  <Plus className="w-4 h-4" />
                                                  Add Information
                                                </button>
                                              )}
                                            </div>
                                          )}
                                        </div>

                                        {/* D. Languages */}
                                        <div className="rounded-lg border border-border overflow-hidden">
                                          <button
                                            type="button"
                                            onClick={() => setLanguagesExpanded(!languagesExpanded)}
                                            className="w-full flex items-center justify-between p-3 hover:bg-muted/20 transition-colors"
                                          >
                                            <div className="flex flex-col items-start gap-0.5">
                                              <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                                Languages
                                              </span>
                                              {!languagesExpanded && (primaryLanguage || secondaryLanguages.length > 0) && (
                                                <span className="text-xs" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                                                  {primaryLanguage && `Primary: ${primaryLanguage}`}
                                                  {primaryLanguage && secondaryLanguages.length > 0 && ' · '}
                                                  {secondaryLanguages.length > 0 && `Secondary: ${secondaryLanguages.join(', ')}`}
                                                </span>
                                              )}
                                              {!languagesExpanded && !primaryLanguage && secondaryLanguages.length === 0 && (
                                                <span className="text-xs" style={{ color: '#9CA3AF', fontFamily: 'Outfit, sans-serif' }}>
                                                  Not configured
                                                </span>
                                              )}
                                            </div>
                                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${languagesExpanded ? "rotate-180" : ""}`} />
                                          </button>

                                          {languagesExpanded && (
                                            <div className="p-4 border-t border-border space-y-4">
                                              {/* Primary Language */}
                                              <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                  <label className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                                    Primary Language *
                                                  </label>
                                                  <Tooltip text="The default language your AI Receptionist will speak on all calls for this stage.">
                                                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                                                  </Tooltip>
                                                </div>
                                                <Select value={primaryLanguage} onValueChange={setPrimaryLanguage}>
                                                  <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select primary language" />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="English">English</SelectItem>
                                                    <SelectItem value="Spanish">Spanish</SelectItem>
                                                    <SelectItem value="French">French</SelectItem>
                                                    <SelectItem value="German">German</SelectItem>
                                                    <SelectItem value="Italian">Italian</SelectItem>
                                                    <SelectItem value="Portuguese">Portuguese</SelectItem>
                                                    <SelectItem value="Chinese">Chinese</SelectItem>
                                                    <SelectItem value="Japanese">Japanese</SelectItem>
                                                    <SelectItem value="Korean">Korean</SelectItem>
                                                    <SelectItem value="Arabic">Arabic</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                              </div>

                                              {/* Secondary Languages (multi-add) */}
                                              <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                  <label className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                                    Secondary Languages
                                                  </label>
                                                  <Tooltip text="Fallback language(s) the AI can switch to if the caller requests it or if their language differs from the primary. You can add multiple.">
                                                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                                                  </Tooltip>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <Select value={secondaryLanguageDraft} onValueChange={setSecondaryLanguageDraft}>
                                                    <SelectTrigger className="flex-1">
                                                      <SelectValue placeholder="Select a fallback language (optional)" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      {["English", "Spanish", "French", "German", "Italian", "Portuguese", "Chinese", "Japanese", "Korean", "Arabic"]
                                                        .filter(lang => lang !== primaryLanguage && !secondaryLanguages.includes(lang))
                                                        .map(lang => (
                                                          <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                  </Select>
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      if (secondaryLanguageDraft) {
                                                        setSecondaryLanguages([...secondaryLanguages, secondaryLanguageDraft]);
                                                        setSecondaryLanguageDraft("");
                                                      }
                                                    }}
                                                    disabled={!secondaryLanguageDraft}
                                                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                                                  >
                                                    <Plus className="w-4 h-4 text-white" />
                                                  </button>
                                                </div>
                                                {secondaryLanguages.length > 0 && (
                                                  <div className="flex flex-wrap gap-2 mt-2">
                                                    {secondaryLanguages.map((lang) => (
                                                      <span key={lang} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                                                        {lang}
                                                        <button
                                                          type="button"
                                                          onClick={() => setSecondaryLanguages(secondaryLanguages.filter(l => l !== lang))}
                                                          className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                                                        >
                                                          <X className="w-3 h-3" />
                                                        </button>
                                                      </span>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                          </div>




                        </div>
                      )}

                      {/* Automation Tab */}
                      {activeTab === "automation" && (
                        <div className="space-y-6">
                          {/* Automation - Collapsible */}
                          <div className="mt-8 rounded-lg border border-border overflow-hidden">
                            <button
                              onClick={() => setWorkflowStepsExpanded(!workflowStepsExpanded)}
                              className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex flex-col items-start gap-1">
                                <div className="flex items-center gap-2">
                                  <Zap className="w-4 h-4" style={{ color: '#020817' }} />
                                  <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                    Automation
                                  </span>
                                </div>
                                <span className="text-xs" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                                  Configure the automated steps that run for this stage.
                                </span>
                              </div>
                              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${workflowStepsExpanded ? "rotate-180" : ""}`} />
                            </button>

                            {workflowStepsExpanded && (
                              <div className="border-t border-border p-4 space-y-3">
                                {workflowSteps.length === 0 ? (
                                  <div className="text-center py-6">
                                    <p className="text-sm" style={{ color: '#94A3B8', fontFamily: 'Outfit, sans-serif' }}>No workflow steps added yet.</p>
                                  </div>
                                ) : (() => {
                                  const stageSteps = workflowSteps.filter(s => !s.trigger || s.trigger === "stage");
                                  const inCallSteps = workflowSteps.filter(s => s.trigger === "incall");
                                  const postCallSteps = workflowSteps.filter(s => s.trigger === "postcall");
                                  const isBlockedCallType = stageType === "No Call Activity" || stageType === "Transfer to Human";

                                  const StepIcon = ({ iconKey }: { iconKey: string }) => {
                                    const map: Record<string, React.ReactNode> = {
                                      clock: <Clock className="w-4 h-4 text-white" />, x: <X className="w-4 h-4 text-white" />,
                                      chevronright: <ChevronRight className="w-4 h-4 text-white" />, zap: <Zap className="w-4 h-4 text-white" />,
                                      edit: <Edit className="w-4 h-4 text-white" />, usercheck: <UserCheck className="w-4 h-4 text-white" />,
                                      phonecall: <PhoneCall className="w-4 h-4 text-white" />, messagecircle: <MessageCircle className="w-4 h-4 text-white" />,
                                      messagesquare: <MessageSquare className="w-4 h-4 text-white" />, mail: <Mail className="w-4 h-4 text-white" />,
                                      filetext: <FileText className="w-4 h-4 text-white" />, clipboardlist: <ClipboardList className="w-4 h-4 text-white" />,
                                      globe: <Globe className="w-4 h-4 text-white" />, calendar: <Calendar className="w-4 h-4 text-white" />,
                                      refreshcw: <RefreshCw className="w-4 h-4 text-white" />,
                                      lightbulb: <Lightbulb className="w-4 h-4 text-white" />,
                                      layoutgrid: <LayoutGrid className="w-4 h-4 text-white" />,
                                      gitbranch: <GitBranch className="w-4 h-4 text-white" />,
                                      volume2: <Volume2 className="w-4 h-4 text-white" />,
                                    };
                                    return <>{map[iconKey]}</>;
                                  };

                                  const moveStageStep = (dragIndex: number, hoverIndex: number) => {
                                    const updatedStageSteps = [...stageSteps];
                                    const [removed] = updatedStageSteps.splice(dragIndex, 1);
                                    updatedStageSteps.splice(hoverIndex, 0, removed);

                                    let stageIdx = 0;
                                    const newWorkflowSteps = workflowSteps.map(s => {
                                      if (!s.trigger || s.trigger === "stage") {
                                        return updatedStageSteps[stageIdx++];
                                      }
                                      return s;
                                    });
                                    setWorkflowSteps(newWorkflowSteps);
                                  };

                                  return (
                                    <div className="space-y-4">
                                      {/* On Stage Entry List */}
                                      {stageSteps.length > 0 && (
                                        <div className="space-y-2">
                                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                            On Stage Entry
                                          </p>
                                          <DndProvider backend={HTML5Backend}>
                                            <div className="space-y-2">
                                              {stageSteps.map((step, idx) => (
                                                <DraggableWorkflowStep
                                                  key={step.id}
                                                  step={step}
                                                  index={idx}
                                                  moveStep={moveStageStep}
                                                  onEdit={() => {
                                                    resetStepDetailState();
                                                    setCurrentEditingStep(step);
                                                    setIsCreatingNewStep(false);
                                                    setStepTrigger(step.trigger ?? "stage");
                                                    setExecutionType(step.executionType ?? "wait");
                                                    setDelayValue(step.delayValue ?? 5);
                                                    setDelayUnit(step.delayUnit ?? "Minute");
                                                    restoreStepParams(step.stepKey, step.params);
                                                    setStepDetailDrawerOpen(true);
                                                  }}
                                                  onDuplicate={() => {
                                                    const newStep = { ...step, id: `${step.stepKey || step.name}-${Date.now()}` };
                                                    const fullIdx = workflowSteps.findIndex(s => s.id === step.id);
                                                    if (fullIdx !== -1) {
                                                      setWorkflowSteps([...workflowSteps.slice(0, fullIdx + 1), newStep, ...workflowSteps.slice(fullIdx + 1)]);
                                                    }
                                                    toast.success("Step duplicated successfully");
                                                  }}
                                                  onDelete={() => {
                                                    setWorkflowSteps(workflowSteps.filter(s => s.id !== step.id));
                                                    toast.success("Step removed successfully");
                                                  }}
                                                  StepIcon={StepIcon}
                                                  connectAfterLabel={(() => {
                                                    if (!step.connectAfterId || step.connectAfterId === 'start') return 'from Start';
                                                    const pred = workflowSteps.find(s => s.id === step.connectAfterId);
                                                    return pred ? `after ${pred.name}` : undefined;
                                                  })()}
                                                />
                                              ))}
                                            </div>
                                          </DndProvider>
                                        </div>
                                      )}

                                      {/* In Call List */}
                                      {inCallSteps.length > 0 && (
                                        <div className="relative">
                                          <div className={`space-y-2 ${isBlockedCallType ? "opacity-40 pointer-events-none select-none" : ""}`}>
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                              In Call
                                            </p>
                                            <div className="space-y-2">
                                              {inCallSteps.map((step) => (
                                                <div
                                                  key={step.id}
                                                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-white cursor-pointer hover:bg-muted/10 transition-colors"
                                                  onClick={(e) => {
                                                    if ((e.target as HTMLElement).closest('button')) {
                                                      return;
                                                    }
                                                    resetStepDetailState();
                                                    setCurrentEditingStep(step);
                                                    setIsCreatingNewStep(false);
                                                    setStepTrigger(step.trigger ?? "stage");
                                                    setExecutionType(step.executionType ?? "wait");
                                                    setDelayValue(step.delayValue ?? 5);
                                                    setDelayUnit(step.delayUnit ?? "Minute");
                                                    restoreStepParams(step.stepKey, step.params);
                                                    setStepDetailDrawerOpen(true);
                                                  }}
                                                >
                                                  <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#2563EB' }}>
                                                    <StepIcon iconKey={step.iconKey} />
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>{step.name}</p>
                                                    <p className="text-xs" style={{ color: '#94A3B8', fontFamily: 'Outfit, sans-serif' }}>→ Event Driven</p>
                                                  </div>
                                                  <div className="flex items-center gap-1 flex-shrink-0">
                                                    <button
                                                      className="p-1.5 rounded hover:bg-muted/40 transition-colors"
                                                      title="Duplicate"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        const newStep = { ...step, id: `${step.stepKey || step.name}-${Date.now()}` };
                                                        const fullIdx = workflowSteps.findIndex(s => s.id === step.id);
                                                        if (fullIdx !== -1) {
                                                          setWorkflowSteps([...workflowSteps.slice(0, fullIdx + 1), newStep, ...workflowSteps.slice(fullIdx + 1)]);
                                                        }
                                                        toast.success("Step duplicated successfully");
                                                      }}
                                                    >
                                                      <Copy className="w-4 h-4 text-muted-foreground" />
                                                    </button>
                                                    <button
                                                      className="p-1.5 rounded hover:bg-muted/40 transition-colors"
                                                      title="Edit"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        resetStepDetailState();
                                                        setCurrentEditingStep(step);
                                                        setIsCreatingNewStep(false);
                                                        setConnectAfterId(step.connectAfterId);
                                                        setStepTrigger(step.trigger ?? "stage");
                                                        setExecutionType(step.executionType ?? "wait");
                                                        setDelayValue(step.delayValue ?? 5);
                                                        setDelayUnit(step.delayUnit ?? "Minute");
                                                        restoreStepParams(step.stepKey, step.params);
                                                        setStepDetailDrawerOpen(true);
                                                      }}
                                                    >
                                                      <Pencil className="w-4 h-4 text-muted-foreground" />
                                                    </button>
                                                    <button
                                                      className="p-1.5 rounded hover:bg-red-50 transition-colors"
                                                      title="Delete"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setWorkflowSteps(workflowSteps.filter(s => s.id !== step.id));
                                                        toast.success("Step removed successfully");
                                                      }}
                                                    >
                                                      <Trash2 className="w-4 h-4 text-red-500" />
                                                    </button>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                          {isBlockedCallType && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                              <span className="px-3 py-1.5 rounded-full text-xs font-medium border border-border shadow-sm flex items-center gap-1.5" style={{ backgroundColor: '#F1F5F9', color: '#64748B', borderColor: '#E2E8F0', fontFamily: 'DM Sans, sans-serif' }}>
                                                <Ban className="w-3.5 h-3.5" />
                                                Not available for this call type
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* Post Call List */}
                                      {postCallSteps.length > 0 && (() => {
                                        const movePostCallStep = (dragIndex: number, hoverIndex: number) => {
                                          const updatedPostCallSteps = [...postCallSteps];
                                          const [removed] = updatedPostCallSteps.splice(dragIndex, 1);
                                          updatedPostCallSteps.splice(hoverIndex, 0, removed);

                                          let pcIdx = 0;
                                          const newWorkflowSteps = workflowSteps.map(s => {
                                            if (s.trigger === "postcall") {
                                              return updatedPostCallSteps[pcIdx++];
                                            }
                                            return s;
                                          });
                                          setWorkflowSteps(newWorkflowSteps);
                                        };

                                        return (
                                          <div className="relative">
                                            <div className={`space-y-2 ${isBlockedCallType ? "opacity-40 pointer-events-none select-none" : ""}`}>
                                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                                Post Call
                                              </p>
                                              <DndProvider backend={HTML5Backend}>
                                                <div className="space-y-2">
                                                  {postCallSteps.map((step, idx) => (
                                                    <DraggableWorkflowStep
                                                      key={step.id}
                                                      step={step}
                                                      index={idx}
                                                      moveStep={movePostCallStep}
                                                      onEdit={() => {
                                                        resetStepDetailState();
                                                        setCurrentEditingStep(step);
                                                        setIsCreatingNewStep(false);
                                                        setStepTrigger(step.trigger ?? "stage");
                                                        setExecutionType(step.executionType ?? "wait");
                                                        setDelayValue(step.delayValue ?? 5);
                                                        setDelayUnit(step.delayUnit ?? "Minute");
                                                        restoreStepParams(step.stepKey, step.params);
                                                        setStepDetailDrawerOpen(true);
                                                      }}
                                                      onDuplicate={() => {
                                                        const newStep = { ...step, id: `${step.stepKey || step.name}-${Date.now()}` };
                                                        const fullIdx = workflowSteps.findIndex(s => s.id === step.id);
                                                        if (fullIdx !== -1) {
                                                          setWorkflowSteps([...workflowSteps.slice(0, fullIdx + 1), newStep, ...workflowSteps.slice(fullIdx + 1)]);
                                                        }
                                                        toast.success("Step duplicated successfully");
                                                      }}
                                                      onDelete={() => {
                                                        setWorkflowSteps(workflowSteps.filter(s => s.id !== step.id));
                                                        toast.success("Step removed successfully");
                                                      }}
                                                      StepIcon={StepIcon}
                                                      connectAfterLabel={(() => {
                                                        if (!step.connectAfterId || step.connectAfterId === "start") return "from Start";
                                                        const pred = workflowSteps.find(s => s.id === step.connectAfterId);
                                                        return pred ? `after ${pred.name}` : undefined;
                                                      })()}
                                                    />
                                                  ))}
                                                </div>
                                              </DndProvider>
                                            </div>
                                            {isBlockedCallType && (
                                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <span className="px-3 py-1.5 rounded-full text-xs font-medium border border-border shadow-sm flex items-center gap-1.5" style={{ backgroundColor: '#F1F5F9', color: '#64748B', borderColor: '#E2E8F0', fontFamily: 'DM Sans, sans-serif' }}>
                                                  <Ban className="w-3.5 h-3.5" />
                                                  Not available for this call type
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  );
                                })()}
                                <Button
                                  variant="primary"
                                  onClick={() => {
                                    setSelectedWorkflowStepCard(null);
                                    setWorkflowStepsDrawerOpen(true);
                                  }}
                                  className="w-full mt-3"
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Add Step
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Advanced Tab */}
                      {activeTab === "advanced" && (
                        <div className="space-y-4">
                          {/* AI Model */}
                          <div className="w-full rounded-xl border border-gray-200 overflow-hidden bg-white">
                            <button
                              onClick={() => setAiModelExpanded(!aiModelExpanded)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                  <Bot className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                    AI Voice & Model
                                  </span>
                                  <Tooltip
                                    text="Choose the AI model that powers your receptionist. Different models offer varying levels of capabilities and performance."
                                    placement="top"
                                  >
                                    <Info className="w-3.5 h-3.5 text-gray-400 cursor-help hover:text-gray-600 transition-colors" />
                                  </Tooltip>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.location.href = '/settings?tab=voice-config';
                                  }}
                                  className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                  <Settings className="w-4 h-4 text-gray-500" />
                                </button>
                                <ChevronDown
                                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${aiModelExpanded ? 'rotate-180' : ''}`}
                                />
                              </div>
                            </button>

                            {aiModelExpanded && (
                              <div className="border-t border-gray-100 px-5 py-4 space-y-5 bg-gray-50/40">
                                {/* AI Model Select */}
                                <div>
                                  <label className="block text-sm font-semibold mb-2 text-gray-700">AI Model</label>
                                  <select
                                    value={selectedAIModel}
                                    onChange={(e) => {
                                      setSelectedAIModel(e.target.value);
                                      toast.success("AI Model updated successfully");
                                    }}
                                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                                    style={{ fontFamily: 'Outfit, sans-serif' }}
                                  >
                                    <option value="Smartest">Smartest: Deep reasoning for complex conversations</option>
                                    <option value="Balanced">Balanced: Swift and Intelligent</option>
                                    <option value="Express">Express: Lightweight and Fast</option>
                                  </select>
                                </div>

                                {/* Voice Speed Slider */}
                                <div>
                                  <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm font-semibold text-gray-700">Voice Speed</label>
                                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-bold rounded-lg">
                                      {stageVoiceSpeed}x
                                    </span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0.5"
                                    max="2"
                                    step="0.1"
                                    value={stageVoiceSpeed}
                                    onChange={(e) => setStageVoiceSpeed(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                  />
                                  <div className="flex justify-between text-xs mt-2 text-gray-500 font-medium">
                                    <span>0.5x</span>
                                    <span>2.0x</span>
                                  </div>
                                </div>

                                {/* Voice / Tone / Style — 3-column grid */}
                                <div className="grid grid-cols-3 gap-3">
                                  <div>
                                    <label className="block text-sm font-semibold mb-2 text-gray-700">Voice</label>
                                    <select
                                      value={stageVoice}
                                      onChange={(e) => setStageVoice(e.target.value)}
                                      className="w-full px-3 py-2.5 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-sm"
                                      style={{ fontFamily: 'Outfit, sans-serif' }}
                                    >
                                      <option value="Ava">Ava</option>
                                      <option value="Eva">Eva</option>
                                      <option value="Aria">Aria</option>
                                      <option value="Sam">Sam</option>
                                      <option value="Jack">Jack</option>
                                      <option value="Mango">Mango</option>
                                    </select>
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5 mb-2">
                                      <label className="text-sm font-semibold text-gray-700">Tone</label>
                                      <Tooltip text="Select the default tone of voice the AI will use during calls (e.g. Professional, Friendly).">
                                        <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                      </Tooltip>
                                    </div>
                                    <select
                                      value={stageTone}
                                      onChange={(e) => setStageTone(e.target.value)}
                                      className="w-full px-3 py-2.5 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-sm"
                                      style={{ fontFamily: 'Outfit, sans-serif' }}
                                    >
                                      <option value="Professional">Professional</option>
                                      <option value="Friendly">Friendly</option>
                                      <option value="Empathetic">Empathetic</option>
                                      <option value="Casual">Casual</option>
                                      <option value="Persuasive">Persuasive</option>
                                    </select>
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5 mb-2">
                                      <label className="text-sm font-semibold text-gray-700">Style</label>
                                      <Tooltip text="Select the conversational style (e.g. Concise, Detailed).">
                                        <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                      </Tooltip>
                                    </div>
                                    <select
                                      value={stageStyle}
                                      onChange={(e) => setStageStyle(e.target.value)}
                                      className="w-full px-3 py-2.5 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-sm"
                                      style={{ fontFamily: 'Outfit, sans-serif' }}
                                    >
                                      <option value="Balanced">Balanced</option>
                                      <option value="Concise">Concise</option>
                                      <option value="Detailed">Detailed</option>
                                      <option value="Humorous">Humorous</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* ──────────────────────────── RECORD CALLS ───────────────────────── */}
                          <div className="w-full rounded-xl border border-gray-200 overflow-hidden bg-white">
                            <div className="w-full flex items-center justify-between px-4 py-3">
                              <div className="flex items-center gap-3">
                                <Mic className="w-5 h-5 text-primary" />
                                <div className="flex items-center gap-2">
                                  <span
                                    className="text-sm font-medium"
                                    style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}
                                  >
                                    Record Calls
                                  </span>
                                  <Tooltip text="Enable call recording for this stage." placement="top">
                                    <Info className="w-3.5 h-3.5 text-gray-400 cursor-help hover:text-gray-600 transition-colors" />
                                  </Tooltip>
                                </div>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="sr-only peer"
                                  checked={advancedSettings.recordCalls}
                                  onChange={(e) => {
                                    setAdvancedSettings({ ...advancedSettings, recordCalls: e.target.checked });
                                    toast.success(e.target.checked ? 'Call recording enabled' : 'Call recording disabled');
                                  }}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                              </label>
                            </div>
                          </div>

                          {/* Note: Advanced settings items in Stage section reference the same state as Process section */}

                          {/* ──────────────────────────── CALL DURATION ───────────────────────── */}
                          <div className="w-full rounded-xl border border-gray-200 overflow-hidden bg-white">
                            {/* Header Row */}
                            <button
                              onClick={() => setCallDurationExpanded(!callDurationExpanded)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-primary" />
                                <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                  Call Duration
                                </span>
                              </div>
                              <ChevronDown
                                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${callDurationExpanded ? 'rotate-180' : ''
                                  }`}
                              />
                            </button>

                            {/* Expanded Content */}
                            {callDurationExpanded && (
                              <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50/40">

                                {/* Call Duration + Hangup Window in one row */}
                                <div className="flex items-end gap-4">
                                  {/* Call Duration */}
                                  <div className="flex-1">
                                    <label className="block text-sm font-medium mb-2" style={{ color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>
                                      Call Duration (min)
                                    </label>
                                    <input
                                      type="number"
                                      min={1}
                                      value={callDurationMinutes}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value) || 1;
                                        setCallDurationMinutes(val);
                                        if (hangupWindowMinutes >= val) {
                                          setHangupWindowMinutes(val - 1 > 0 ? val - 1 : 1);
                                        }
                                      }}
                                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                      style={{ fontFamily: 'Outfit, sans-serif', color: '#020817' }}
                                    />
                                  </div>

                                  {/* Hangup Window */}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-1.5 mb-2">
                                      <label className="text-sm font-medium" style={{ color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>
                                        Hangup Window
                                      </label>
                                      <Tooltip
                                        text="During the last X minutes of the total call duration, the AI will proactively try to wrap up the conversation and end the call gracefully. The hangup window must be less than the total call duration."
                                        placement="top"
                                      >
                                        <Info className="w-3.5 h-3.5 text-gray-400 cursor-help hover:text-gray-600 transition-colors" />
                                      </Tooltip>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-gray-500 whitespace-nowrap" style={{ fontFamily: 'Outfit, sans-serif' }}>Last</span>
                                      <input
                                        type="number"
                                        min={1}
                                        max={callDurationMinutes - 1}
                                        value={hangupWindowMinutes}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value) || 1;
                                          if (val >= callDurationMinutes) {
                                            toast.error(`Hangup window must be less than the call duration (${callDurationMinutes} min)`);
                                            return;
                                          }
                                          setHangupWindowMinutes(val);
                                        }}
                                        className="flex-1 min-w-0 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                        style={{ fontFamily: 'Outfit, sans-serif', color: '#020817' }}
                                      />
                                      <span className="text-sm text-gray-500 whitespace-nowrap" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                        {hangupWindowMinutes === 1 ? 'minute' : 'minutes'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {hangupWindowMinutes >= callDurationMinutes && (
                                  <p className="text-xs text-red-500" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                    Hangup window must be less than call duration ({callDurationMinutes} min).
                                  </p>
                                )}

                                <div className="flex justify-end">
                                  <button
                                    onClick={() => toast.success("Call duration settings saved")}
                                    className="text-xs font-semibold px-3 py-1.5 rounded-md text-white"
                                    style={{ backgroundColor: '#2563EB', fontFamily: 'DM Sans, sans-serif' }}
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* ───────────────────────────── RETRY RULES ───────────────────────────── */}
                          <div className="w-full rounded-xl border border-gray-200 overflow-hidden bg-white">
                            {/* Header Row */}
                            <button
                              onClick={() => setRetryRulesExpanded(!retryRulesExpanded)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <RefreshCw className="w-5 h-5 text-primary" />
                                <span
                                  className="text-sm font-medium"
                                  style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}
                                >
                                  Retry Rules
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${retryRulesEnabled
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-500'
                                    }`}
                                  style={{ fontFamily: 'Outfit, sans-serif' }}
                                >
                                  {retryRulesEnabled ? 'On' : 'Off'}
                                </span>
                                <ChevronDown
                                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${retryRulesExpanded ? 'rotate-180' : ''
                                    }`}
                                />
                              </div>
                            </button>

                            {/* Expanded Content */}
                            {retryRulesExpanded && (
                              <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50/40">
                                {/* Enable Toggle Row */}
                                <div className="flex items-center justify-between">
                                  <span
                                    className="text-sm font-medium"
                                    style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}
                                  >
                                    Enable Retry Rules
                                  </span>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={retryRulesEnabled}
                                      onChange={(e) => {
                                        setRetryRulesEnabled(e.target.checked);
                                        toast.success(e.target.checked ? 'Retry rules enabled' : 'Retry rules disabled');
                                      }}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                                  </label>
                                </div>

                                {/* Retry Attempts */}
                                <div>
                                  <label
                                    className="block text-sm font-medium mb-2"
                                    style={{ color: '#374151', fontFamily: 'DM Sans, sans-serif' }}
                                  >
                                    Retry Attempts
                                  </label>
                                  <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={retryAttempts}
                                    onChange={(e) => setRetryAttempts(parseInt(e.target.value) || 1)}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                    style={{ fontFamily: 'Outfit, sans-serif', color: '#020817' }}
                                  />
                                </div>

                                {/* Delay Between Retries */}
                                <div>
                                  <label
                                    className="block text-sm font-medium mb-2"
                                    style={{ color: '#374151', fontFamily: 'DM Sans, sans-serif' }}
                                  >
                                    Delay Between Retries (minutes)
                                  </label>
                                  <input
                                    type="number"
                                    min={1}
                                    value={retryDelay}
                                    onChange={(e) => setRetryDelay(parseInt(e.target.value) || 1)}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                    style={{ fontFamily: 'Outfit, sans-serif', color: '#020817' }}
                                  />
                                </div>

                                {/* Fallback Stage */}
                                <div>
                                  <label
                                    className="block text-sm font-medium mb-2"
                                    style={{ color: '#374151', fontFamily: 'DM Sans, sans-serif' }}
                                  >
                                    Fallback Stage
                                  </label>
                                  <select
                                    value={retryFallbackStage}
                                    onChange={(e) => setRetryFallbackStage(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                                    style={{ fontFamily: 'Outfit, sans-serif', color: '#020817' }}
                                  >
                                    <option value="Do Nothing">Do Nothing</option>
                                    {selectedProcessData?.stages.map((s) => (
                                      <option key={s.id} value={s.name}>
                                        {s.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* ─────────────────────────── SKIP DAY RULES ──────────────────────────── */}
                          <div className="w-full rounded-xl border border-gray-200 overflow-hidden bg-white">
                            {/* Header Row */}
                            <button
                              onClick={() => setSkipDayRulesExpanded(!skipDayRulesExpanded)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-primary" />
                                <span
                                  className="text-sm font-medium"
                                  style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}
                                >
                                  Skip Day Rules
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${skipDayRulesEnabled
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-500'
                                    }`}
                                  style={{ fontFamily: 'Outfit, sans-serif' }}
                                >
                                  {skipDayRulesEnabled ? 'On' : 'Off'}
                                </span>
                                <ChevronDown
                                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${skipDayRulesExpanded ? 'rotate-180' : ''
                                    }`}
                                />
                              </div>
                            </button>

                            {/* Expanded Content */}
                            {skipDayRulesExpanded && (
                              <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50/40">
                                {/* Enable Toggle Row */}
                                <div className="flex items-center justify-between">
                                  <span
                                    className="text-sm font-medium"
                                    style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}
                                  >
                                    Enable Skip Day Rules
                                  </span>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={skipDayRulesEnabled}
                                      onChange={(e) => {
                                        setSkipDayRulesEnabled(e.target.checked);
                                        toast.success(
                                          e.target.checked ? 'Skip day rules enabled' : 'Skip day rules disabled'
                                        );
                                      }}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                                  </label>
                                </div>

                                {/* Weekly Off Days */}
                                <div>
                                  <label
                                    className="block text-sm font-medium mb-3"
                                    style={{ color: '#374151', fontFamily: 'DM Sans, sans-serif' }}
                                  >
                                    Weekly Off Days
                                  </label>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => {
                                      const isActive = weeklyOffDays.includes(day);
                                      return (
                                        <button
                                          key={day}
                                          type="button"
                                          onClick={() =>
                                            setWeeklyOffDays((prev) =>
                                              isActive ? prev.filter((d) => d !== day) : [...prev, day]
                                            )
                                          }
                                          className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold border transition-all ${isActive
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600'
                                            }`}
                                          style={{ fontFamily: 'DM Sans, sans-serif' }}
                                        >
                                          {day}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Custom Off Dates */}
                                <div>
                                  <label
                                    className="block text-sm font-medium mb-2"
                                    style={{ color: '#374151', fontFamily: 'DM Sans, sans-serif' }}
                                  >
                                    Custom Off Dates
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="date"
                                      value={customOffDate}
                                      onChange={(e) => setCustomOffDate(e.target.value)}
                                      className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                      style={{ fontFamily: 'Outfit, sans-serif', color: '#020817' }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (customOffDate && !customOffDatesList.includes(customOffDate)) {
                                          setCustomOffDatesList((prev) => [...prev, customOffDate]);
                                          setCustomOffDate('');
                                        }
                                      }}
                                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors flex-shrink-0"
                                    >
                                      <Plus className="w-4 h-4 text-white" />
                                    </button>
                                  </div>

                                  {/* List of added custom dates */}
                                  {customOffDatesList.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {customOffDatesList.map((date) => (
                                        <span
                                          key={date}
                                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium"
                                          style={{ fontFamily: 'Outfit, sans-serif' }}
                                        >
                                          {date}
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setCustomOffDatesList((prev) => prev.filter((d) => d !== date))
                                            }
                                            className="hover:text-blue-900 transition-colors"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  <p
                                    className="mt-2 text-xs"
                                    style={{ color: '#94A3B8', fontFamily: 'Outfit, sans-serif' }}
                                  >
                                    Calls will not be scheduled on selected days and dates.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* ──────────────────────────── DETECT VOICEMAIL ───────────────────────── */}
                          <div className="w-full rounded-xl border border-gray-200 overflow-hidden bg-white">
                            {/* Header Row */}
                            <button
                              onClick={() => setDetectVoicemailExpanded(!detectVoicemailExpanded)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Voicemail className="w-5 h-5 text-primary" />
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="text-sm font-medium"
                                    style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}
                                  >
                                    Detect Voicemail
                                  </span>
                                  <Tooltip
                                    text="This allows AI to detect if the caller is on leave voice mail and disconnect the call"
                                    placement="top"
                                  >
                                    <Info className="w-3.5 h-3.5 text-gray-400 cursor-help hover:text-gray-600 transition-colors" />
                                  </Tooltip>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${detectVoicemailEnabled
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-500'
                                    }`}
                                  style={{ fontFamily: 'Outfit, sans-serif' }}
                                >
                                  {detectVoicemailEnabled ? 'On' : 'Off'}
                                </span>
                                <ChevronDown
                                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${detectVoicemailExpanded ? 'rotate-180' : ''
                                    }`}
                                />
                              </div>
                            </button>

                            {/* Expanded Content */}
                            {detectVoicemailExpanded && (
                              <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/40">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="text-sm font-medium"
                                      style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}
                                    >
                                      Enable Voicemail Detection
                                    </span>
                                    <Tooltip
                                      text="This allows AI to detect if the caller is on leave voice mail and disconnect the call"
                                      placement="top"
                                    >
                                      <Info className="w-3.5 h-3.5 text-gray-400 cursor-help hover:text-gray-600 transition-colors" />
                                    </Tooltip>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={detectVoicemailEnabled}
                                      onChange={(e) => {
                                        setDetectVoicemailEnabled(e.target.checked);
                                        toast.success(
                                          e.target.checked
                                            ? 'Voicemail detection enabled'
                                            : 'Voicemail detection disabled'
                                        );
                                      }}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {activeTab === "knowledgebase" && (
                        <KnowledgeBaseTab
                          processName={selectedProcessData?.name ?? "Current Process"}
                          stageName={stage.name}
                          knowledgeBases={stageKnowledgeBases[stage.id] ?? []}
                          onKnowledgeBasesChange={(kbs) =>
                            setStageKnowledgeBases((prev) => ({ ...prev, [stage.id]: kbs }))
                          }
                        />
                      )}

                      {/* Flow Builder Tab */}
                      {activeTab === "flowbuilder" && (
                        <div className="-m-6 h-[calc(100%+3rem)]">
                          <FlowBuilderTab
                            processName={selectedProcessData?.name ?? "Current Process"}
                            stageName={stage.name}
                            processes={processes}
                            currentProcessId={selectedProcess ?? undefined}
                            workflowSteps={workflowSteps}
                            onWorkflowStepsChange={setWorkflowSteps}
                            stepAllowedTriggers={STEP_ALLOWED_TRIGGERS}
                          />
                        </div>
                      )}

                      {/* Automation Side Drawer */}
                      {workflowStepsDrawerOpen && (
                        <>
                          {/* Backdrop */}
                          <div
                            className="fixed inset-0 z-40"
                            style={{ backgroundColor: 'rgba(0,0,0,0.30)' }}
                            onClick={() => setWorkflowStepsDrawerOpen(false)}
                          />
                          {/* Drawer panel — 50vw, full height, anchored right */}
                          <div
                            className="fixed top-0 right-0 h-screen z-50 flex flex-col bg-white border-l border-border"
                            style={{ width: '50vw', minWidth: '50vw', maxWidth: '50vw', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)' }}
                          >
                            {/* Header */}
                            <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border">
                              <div className="flex items-start justify-between mb-1">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Zap className="w-5 h-5" style={{ color: '#020817' }} />
                                    <h2 className="text-xl font-bold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Add Automation</h2>
                                  </div>
                                  <p className="text-sm mt-1" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Choose and configure the step before adding it to this stage.</p>
                                </div>
                                <button onClick={() => setWorkflowStepsDrawerOpen(false)} className="p-2 rounded hover:bg-muted/40 transition-colors ml-4 flex-shrink-0">
                                  <X className="w-5 h-5 text-muted-foreground" />
                                </button>
                              </div>
                              {/* Search */}
                              <div className="relative mt-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                  type="text"
                                  value={workflowStepSearch}
                                  onChange={e => setWorkflowStepSearch(e.target.value)}
                                  placeholder="Search workflow steps..."
                                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-md border border-border bg-white outline-none focus:border-blue-500 transition-colors"
                                  style={{ fontFamily: 'Outfit, sans-serif', color: '#020817' }}
                                />
                              </div>
                            </div>

                            {/* Body — two column layout */}
                            <div className="flex flex-1 overflow-hidden">
                              {/* Left Sidebar */}
                              <div className="w-[220px] flex-shrink-0 border-r border-border overflow-y-auto py-2 flex flex-col gap-1">
                                {[
                                  { key: "all", icon: <Sparkles className="w-4 h-4" />, name: "All" },
                                  { key: "workflow", icon: <GitBranch className="w-4 h-4" />, name: "Workflow Logic" },
                                  { key: "callerengagement", icon: <Phone className="w-4 h-4" />, name: "Caller Engagement" },
                                  { key: "communication", icon: <MessageSquare className="w-4 h-4" />, name: "Communication" },
                                  { key: "data", icon: <Database className="w-4 h-4" />, name: "Data & Assignment" },
                                  { key: "webhook", icon: <Webhook className="w-4 h-4" />, name: "Webhook / API" },
                                ].map((cat) => {
                                  const active = workflowStepCategory === cat.key;
                                  return (
                                    <button
                                      key={cat.key}
                                      onClick={() => setWorkflowStepCategory(cat.key)}
                                      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-l-2 hover:bg-muted/40"
                                      style={{
                                        borderLeftColor: active ? '#2563EB' : 'transparent',
                                        backgroundColor: active ? '#EFF6FF' : 'transparent',
                                      }}
                                    >
                                      <span className="flex-shrink-0" style={{ color: active ? '#2563EB' : '#64748B' }}>
                                        {cat.icon}
                                      </span>
                                      <span
                                        className="text-sm font-semibold"
                                        style={{
                                          color: active ? '#2563EB' : '#020817',
                                          fontFamily: 'DM Sans, sans-serif'
                                        }}
                                      >
                                        {cat.name}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Right Steps List */}
                              <div className="flex-1 overflow-y-auto">
                                {(() => {
                                  const allSteps = [
                                    { key: "processmovement", name: "Process/Stage Movement", desc: "Move the contact to a different process and select the target stage.", iconKey: "zap", cats: ["all", "workflow"], popular: false },
                                    { key: "endworkflow", name: "End Workflow", desc: "Terminate the workflow after this step runs and mark the contact as done.", iconKey: "x", cats: ["all", "workflow"], popular: false },
                                    { key: "callhangup", name: "Auto Hangup", desc: "Automatically end the call after the AI completes its interaction, with an optional closing message.", iconKey: "phoneoff", cats: ["all", "callerengagement"], popular: false },
                                    { key: "callaction", name: "Transfer Call", desc: "Transfer the active AI call to a human agent or another AI agent.", iconKey: "phonecall", cats: ["all", "callerengagement"], popular: false },
                                    { key: "idlemessages", name: "Idle Messages", desc: "Configure messages the AI speaks when the caller has not responded.", iconKey: "messagesquare", cats: ["all", "callerengagement"], popular: false },
                                    { key: "whatsapp", name: "WhatsApp", desc: "Send WhatsApp messages to contacts using pre-configured templates.", iconKey: "messagecircle", cats: ["all", "communication"], popular: true },
                                    { key: "sms", name: "SMS", desc: "Send SMS text messages to contacts using pre-configured templates.", iconKey: "messagesquare", cats: ["all", "communication"], popular: false },
                                    { key: "email", name: "Email", desc: "Send email notifications to contacts using pre-configured templates.", iconKey: "mail", cats: ["all", "communication"], popular: false },
                                    { key: "fieldupdate", name: "Field Update", desc: "Update a specific field value for the contact or record.", iconKey: "edit", cats: ["all", "data"], popular: false },
                                    { key: "assignhuman", name: "Assign to a Human", desc: "Assign a human team member to review or handle this contact.", iconKey: "usercheck", cats: ["all", "data"], popular: false },
                                    { key: "wh_trigger", name: "API Automation", desc: "Trigger actions in external systems using your connected API integrations.", iconKey: "globe", cats: ["all", "webhook"], popular: false },
                                    { key: "webhook_trigger", name: "Webhook Automation", desc: "Send an event payload to a connected webhook when this step runs.", iconKey: "webhook", cats: ["all", "webhook"], popular: false },
                                  ];
                                  const iconMap: Record<string, React.ReactNode> = {
                                    clock: <Clock className="w-4 h-4 text-white" />, x: <X className="w-4 h-4 text-white" />,
                                    chevronright: <ChevronRight className="w-4 h-4 text-white" />, zap: <Zap className="w-4 h-4 text-white" />,
                                    edit: <Edit className="w-4 h-4 text-white" />, usercheck: <UserCheck className="w-4 h-4 text-white" />,
                                    phonecall: <PhoneCall className="w-4 h-4 text-white" />, messagecircle: <MessageCircle className="w-4 h-4 text-white" />,
                                    messagesquare: <MessageSquare className="w-4 h-4 text-white" />, mail: <Mail className="w-4 h-4 text-white" />,
                                    filetext: <FileText className="w-4 h-4 text-white" />, clipboardlist: <ClipboardList className="w-4 h-4 text-white" />,
                                    globe: <Globe className="w-4 h-4 text-white" />, calendar: <Calendar className="w-4 h-4 text-white" />,
                                    refreshcw: <RefreshCw className="w-4 h-4 text-white" />,
                                    lightbulb: <Lightbulb className="w-4 h-4 text-white" />,
                                    layoutgrid: <LayoutGrid className="w-4 h-4 text-white" />,
                                    gitbranch: <GitBranch className="w-4 h-4 text-white" />,
                                    volume2: <Volume2 className="w-4 h-4 text-white" />,
                                    webhook: <Webhook className="w-4 h-4 text-white" />,
                                    phoneoff: <PhoneOff className="w-4 h-4 text-white" />,
                                  };
                                  const filtered = allSteps.filter(s =>
                                    s.cats.includes(workflowStepCategory) &&
                                    (workflowStepSearch === "" || s.name.toLowerCase().includes(workflowStepSearch.toLowerCase()) || s.desc.toLowerCase().includes(workflowStepSearch.toLowerCase()))
                                  );

                                  return filtered.map((step, i) => {
                                    const isSelected = selectedWorkflowStepCard === step.key;
                                    const allowedTriggers = STEP_ALLOWED_TRIGGERS[step.key] || [];
                                    const isOnlyInCall = allowedTriggers.length === 1 && allowedTriggers[0] === "incall";
                                    const isUnavailable = isOnlyInCall && (stageType === "No Call Activity" || stageType === "Transfer to Human");

                                    const buttonElement = (
                                      <button
                                        key={step.key}
                                        onClick={isUnavailable ? undefined : () => {
                                          resetStepDetailState();
                                          setCurrentEditingStep({ id: `${step.key}-${Date.now()}`, name: step.name, description: step.desc, iconKey: step.iconKey, stepKey: step.key });
                                          setIsCreatingNewStep(true);
                                          setWorkflowStepsDrawerOpen(false);
                                          setStepDetailDrawerOpen(true);
                                        }}
                                        className={`w-full flex items-start gap-4 px-5 py-4 text-left transition-colors ${isUnavailable ? "opacity-40 pointer-events-none cursor-not-allowed select-none" : ""}`}
                                        style={{
                                          borderBottom: i < filtered.length - 1 ? '1px solid #F1F5F9' : 'none',
                                          outline: isSelected ? '2px solid #2563EB' : 'none',
                                          outlineOffset: '-2px',
                                          backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                                        }}
                                        onMouseEnter={e => { if (!isUnavailable && !isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = '#F8FAFF'; }}
                                        onMouseLeave={e => { if (!isUnavailable) (e.currentTarget as HTMLElement).style.backgroundColor = isSelected ? '#EFF6FF' : 'transparent'; }}
                                      >
                                        <div className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: '#2563EB' }}>
                                          {iconMap[step.iconKey]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>{step.name}</span>
                                            {step.popular && (
                                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: '#2563EB', fontFamily: 'DM Sans, sans-serif' }}>Popular</span>
                                            )}
                                            {isUnavailable && (
                                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600 border border-red-100" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                                In-Call only — unavailable
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-sm mt-0.5 leading-snug" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>{step.desc}</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                                      </button>
                                    );

                                    return isUnavailable ? (
                                      <Tooltip key={step.key} text="In-Call only — unavailable" placement="top">
                                        <div className="w-full pointer-events-auto">
                                          {buttonElement}
                                        </div>
                                      </Tooltip>
                                    ) : buttonElement;
                                  });
                                })()}
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Step Detail Drawer */}
                      <StepDetailDrawer
                        isOpen={stepDetailDrawerOpen && !!currentEditingStep}
                        step={currentEditingStep}
                        isCreatingNewStep={isCreatingNewStep}
                        stepAllowedTriggers={STEP_ALLOWED_TRIGGERS}
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
                        availablePredecessors={buildAvailablePredecessors(workflowSteps, stepTrigger, currentEditingStep?.id)}
                        params={captureStepParams(currentEditingStep?.stepKey)}
                        onParamsChange={(patch) => {
                          Object.entries(patch).forEach(([key, value]) => {
                            const setter = stateSetters[key];
                            if (setter) setter(value);
                          });
                        }}
                        onBack={() => {
                          setStepDetailDrawerOpen(false);
                          setIsCreatingNewStep(false);
                          setSelectedWorkflowStepCard(null);
                          setWorkflowStepsDrawerOpen(true);
                        }}
                        onClose={() => {
                          setStepDetailDrawerOpen(false);
                          setIsCreatingNewStep(false);
                        }}
                        onSave={() => {
                          if (currentEditingStep) {
                            const stepToSave: WorkflowStep = {
                              ...currentEditingStep,
                              trigger: stepTrigger,
                              executionType: stepTrigger !== "incall" ? executionType : undefined,
                              delayValue: stepTrigger !== "incall" ? delayValue : undefined,
                              delayUnit: stepTrigger !== "incall" ? delayUnit : undefined,
                              connectAfterId: stepTrigger !== "incall" && executionType === "wait" ? connectAfterId : undefined,
                              params: captureStepParams(currentEditingStep.stepKey),
                            };
                            if (isCreatingNewStep) {
                              if (branchAddTarget === "true") {
                                setTrueBranchSteps(prev => [...prev, stepToSave]);
                                setBranchAddTarget(null);
                              } else if (branchAddTarget === "false") {
                                setFalseBranchSteps(prev => [...prev, stepToSave]);
                                setBranchAddTarget(null);
                              } else {
                                setWorkflowSteps(prev => [...prev, stepToSave]);
                              }
                              setIsCreatingNewStep(false);
                              toast.success("Step added successfully");
                            } else {
                              setWorkflowSteps(prev => prev.map(s => s.id === currentEditingStep.id ? stepToSave : s));
                              setTrueBranchSteps(prev => prev.map(s => s.id === currentEditingStep.id ? stepToSave : s));
                              setFalseBranchSteps(prev => prev.map(s => s.id === currentEditingStep.id ? stepToSave : s));
                              toast.success("Step settings saved successfully");
                            }
                          }
                          setStepDetailDrawerOpen(false);
                        }}
                      />


                      {activeTab !== "knowledgebase" && (
                        <div className="mt-6 pt-6 border-t border-border flex justify-end gap-3">
                          <Button variant="outline" onClick={() => {
                            setExpandedStage(null);
                            setViewMode("process");
                          }}>Cancel</Button>
                          <Button variant="primary" onClick={() => toast.success("Stage configuration saved")}>
                            Save Changes
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-24 h-24 bg-muted/30 rounded-full flex items-center justify-center mb-6">
                  <ChevronRight className="w-12 h-12" style={{ color: '#64748B' }} />
                </div>
                <h3 className="text-xl font-semibold mb-2" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Select a process or stage to begin</h3>
                <p className="max-w-md" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                  Choose a process to configure its settings, or select a stage to edit its configuration
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Add Process Modal */}
        <Modal
          isOpen={showAddProcessModal}
          onClose={() => {
            setShowAddProcessModal(false);
            setProcessModalTab("create");
            setSelectedProcessTemplate(null);
          }}
          title="Add New Process"
          footer={
            <>
              <Button variant="outline" onClick={() => {
                setShowAddProcessModal(false);
                setProcessModalTab("create");
                setSelectedProcessTemplate(null);
              }}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAddProcess}
                disabled={processModalTab === "template" && !selectedProcessTemplate}
              >
                {processModalTab === "create" ? "Add Process" : "Use Template"}
              </Button>
            </>
          }
        >
          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-border pb-0">
            <button
              onClick={() => setProcessModalTab("create")}
              className={`px-4 py-2 font-medium text-sm transition-all relative ${processModalTab === "create"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Create Yourself
              {processModalTab === "create" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setProcessModalTab("template")}
              className={`px-4 py-2 font-medium text-sm transition-all relative ${processModalTab === "template"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Select from Template
              {processModalTab === "template" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>

          {/* Tab Content */}
          {processModalTab === "create" ? (
            <div className="space-y-4">
              <Input
                label="Process Name"
                value={newProcess.name}
                onChange={(e) => setNewProcess({ ...newProcess, name: e.target.value })}
                placeholder="Enter process name"
              />
              <div>
                <label className="block text-sm font-medium mb-2">Process Description</label>
                <textarea
                  value={newProcess.description}
                  onChange={(e) => setNewProcess({ ...newProcess, description: e.target.value })}
                  placeholder="Enter process description"
                  className="w-full px-4 py-3 bg-input-background border border-input rounded-xl resize-none h-24"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Recommended Templates</h3>
                <Tooltip text="These templates are recommended based on your organization's industry.">
                  <Info className="w-4 h-4 cursor-help" style={{ color: '#64748B' }} />
                </Tooltip>
              </div>

              {processTemplates[organizationIndustry as keyof typeof processTemplates]?.length > 0 ? (
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {processTemplates[organizationIndustry as keyof typeof processTemplates].map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedProcessTemplate(template.id)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selectedProcessTemplate === template.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/50"
                        }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold" style={{ fontFamily: 'DM Sans, sans-serif' }}>{template.name}</h4>
                        <span className="text-xs px-2 py-1 bg-muted rounded-full" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                          {template.stages} Stages
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>{template.description}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 px-4 bg-muted/50 rounded-xl">
                  <p className="mb-3" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>No templates available for your industry</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProcessModalTab("create")}
                  >
                    Create Manually
                  </Button>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Add Stage Modal */}
        <Modal
          isOpen={showAddStageModal}
          onClose={() => {
            setShowAddStageModal(false);
            setStageModalTab("create");
            setSelectedStageTemplate(null);
            setNewStage({ name: "", description: "", color: STAGE_COLORS[0], type: "Receive Inbound Calls" });
            setNewStageSelectedNumbers([]);
            setShowNewStageNumberDropdown(false);
            setHasInteractedWithColor(false);
            setIsColorGridExpanded(false);
          }}
          title="Add New Stage"
          footer={
            <>
              <Button variant="outline" onClick={() => {
                setShowAddStageModal(false);
                setStageModalTab("create");
                setSelectedStageTemplate(null);
                setNewStage({ name: "", description: "", color: STAGE_COLORS[0], type: "Receive Inbound Calls" });
                setNewStageSelectedNumbers([]);
                setShowNewStageNumberDropdown(false);
                setHasInteractedWithColor(false);
                setIsColorGridExpanded(false);
              }}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAddStage}
                disabled={stageModalTab === "template" && !selectedStageTemplate}
              >
                {stageModalTab === "create" ? "Add Stage" : "Use Template"}
              </Button>
            </>
          }
        >
          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-border pb-0">
            <button
              onClick={() => setStageModalTab("create")}
              className={`px-4 py-2 font-medium text-sm transition-all relative ${stageModalTab === "create"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Create Yourself
              {stageModalTab === "create" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setStageModalTab("template")}
              className={`px-4 py-2 font-medium text-sm transition-all relative ${stageModalTab === "template"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Select from Template
              {stageModalTab === "template" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>

          {/* Tab Content */}
          {stageModalTab === "create" ? (
            <div className="space-y-4">
              <Input
                label="Stage Name"
                value={newStage.name}
                onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
                placeholder="Enter stage name"
              />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium">Stage Description</label>
                  <Tooltip text="The client's call summary will be analyzed and mapped to this stage based on the description">
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                  </Tooltip>
                </div>
                <textarea
                  value={newStage.description}
                  onChange={(e) => setNewStage({ ...newStage, description: e.target.value })}
                  placeholder="Enter stage description"
                  className="w-full px-4 py-3 bg-input-background border border-input rounded-xl resize-none h-24"
                />
              </div>

              {/* Outbound Calling - Only show when Type is "Makes AI Outbound Calls" */}
              {newStage.type === "Makes AI Outbound Calls" && (
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
                  <div>
                    <p className="font-medium" style={{ fontFamily: 'DM Sans, sans-serif' }}>Outbound Calling</p>
                    <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Enable automated outbound calls</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-switch-background peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-switch-background after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Stage Color
                </label>
                <div className="space-y-3">
                  {/* Color Grid - First row or full grid */}
                  <div className="flex items-start gap-2">
                    <div className={`flex-1 border border-gray-200 rounded-lg overflow-hidden ${isColorGridExpanded ? 'grid grid-cols-10 gap-0' : 'flex gap-0'}`}>
                      {(isColorGridExpanded ? COLOR_PALETTE : COLOR_PALETTE.slice(0, 10)).map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => {
                            setNewStage({ ...newStage, color });
                            setHasInteractedWithColor(true);
                          }}
                          className={`w-full aspect-square transition-all hover:scale-110 hover:z-10 ${newStage.color === color
                            ? "ring-2 ring-white ring-inset z-20"
                            : ""
                            }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsColorGridExpanded(!isColorGridExpanded);
                        setHasInteractedWithColor(true);
                      }}
                      className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 transition-colors mt-0"
                    >
                      <Plus className={`w-4 h-4 text-gray-600 transition-transform ${isColorGridExpanded ? 'rotate-45' : ''}`} />
                    </button>
                  </div>

                  {/* Selected Color Bar - Only show when user has interacted with color picker */}
                  {hasInteractedWithColor && (
                    <div className="flex items-center gap-2">
                      <div
                        className="flex-1 h-10 rounded-lg border-2 border-gray-300"
                        style={{ backgroundColor: newStage.color }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const hexInput = prompt("Enter custom hex color:", newStage.color);
                          if (hexInput && /^#[0-9A-F]{6}$/i.test(hexInput)) {
                            setNewStage({ ...newStage, color: hexInput });
                          }
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                        style={{ fontFamily: 'Outfit, sans-serif' }}
                      >
                        Custom color
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Recommended Templates</h3>
                <Tooltip text="These templates are recommended based on your organization's industry.">
                  <Info className="w-4 h-4 cursor-help" style={{ color: '#64748B' }} />
                </Tooltip>
              </div>

              {stageTemplates[organizationIndustry as keyof typeof stageTemplates]?.length > 0 ? (
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {stageTemplates[organizationIndustry as keyof typeof stageTemplates].map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedStageTemplate(template.id)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selectedStageTemplate === template.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/50"
                        }`}
                    >
                      <h4 className="font-semibold mb-2">{template.name}</h4>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 px-4 bg-muted/50 rounded-xl">
                  <p className="mb-3" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>No templates available for your industry</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStageModalTab("create")}
                  >
                    Create Manually
                  </Button>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Delete Stage Confirmation Modal */}
        <Modal
          isOpen={showDeleteStageModal}
          onClose={() => {
            setShowDeleteStageModal(false);
            setStageToDelete(null);
          }}
          title="Delete Stage"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteStageModal(false);
                  setStageToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteStage}>
                Delete Stage
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {/* Warning Icon */}
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
            </div>

            {/* Main Message */}
            <div className="text-center space-y-2">
              <p className="text-base" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                Are you sure you want to delete this stage?
              </p>
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
                <p className="font-semibold text-destructive" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  {stageToDelete?.name}
                </p>
              </div>
            </div>

            {/* Warning Details */}
            <div className="bg-warning/5 border border-warning/20 rounded-xl p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                    This action cannot be undone
                  </p>
                  <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                    Deleting this stage will permanently remove it from the process. All associated configurations, webhooks, and settings will be lost.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Modal>

        {/* How Process Works Modal */}
        <Modal
          isOpen={showProcessHowItWorksModal}
          onClose={() => setShowProcessHowItWorksModal(false)}
          title="How Process Works"
        >
          <div className="space-y-4">
            <div className="aspect-video bg-muted rounded-xl flex items-center justify-center">
              <div className="text-center">
                <Play className="w-16 h-16 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">Video tutorial placeholder</p>
                <p className="text-sm text-muted-foreground mt-1">Embedded video would appear here</p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Process Overview</h4>
              <p className="text-sm text-muted-foreground">
                A process represents a complete workflow that consists of multiple stages.
                Configure AI settings at the process level to apply them across all stages,
                or customize settings for individual stages as needed.
              </p>
            </div>
          </div>
        </Modal>

        {/* How Stage Works Modal */}
        <Modal
          isOpen={showStageHowItWorksModal}
          onClose={() => setShowStageHowItWorksModal(false)}
          title="How Stage Works"
        >
          <div className="space-y-4">
            <div className="aspect-video bg-muted rounded-xl flex items-center justify-center">
              <div className="text-center">
                <Play className="w-16 h-16 mx-auto mb-3" style={{ color: '#64748B' }} />
                <p style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Video tutorial placeholder</p>
                <p className="text-sm mt-1" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Embedded video would appear here</p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Stage Overview</h4>
              <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                Stages represent individual steps in your workflow. Each stage can have its own
                configuration, webhooks, and retry rules. AI settings can inherit from the process
                or be customized per stage.
              </p>
            </div>
          </div>
        </Modal>

        {/* How to Receive Call Modal */}
        <Modal
          isOpen={showHowToReceiveCallModal}
          onClose={() => setShowHowToReceiveCallModal(false)}
          title="How to Receive Call"
        >
          <div className="space-y-4">
            <div className="aspect-video bg-muted rounded-xl flex items-center justify-center">
              <div className="text-center">
                <Play className="w-16 h-16 mx-auto mb-3" style={{ color: '#64748B' }} />
                <p style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Video tutorial placeholder</p>
                <p className="text-sm mt-1" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Embedded video would appear here</p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Receiving Inbound Calls</h4>
              <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                Learn how to connect phone numbers to this stage so that inbound callers are automatically
                routed to your AI Receptionist. This tutorial covers number assignment, routing rules,
                and what the caller experience looks like end-to-end.
              </p>
            </div>
          </div>
        </Modal>
        <Modal
          isOpen={showEditStageModal}
          onClose={() => {
            setShowEditStageModal(false);
            setEditingStage(null);
          }}
          title="Edit Stage"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Stage Name
              </label>
              <input
                type="text"
                value={editingStage?.name || ""}
                onChange={(e) => setEditingStage(editingStage ? { ...editingStage, name: e.target.value } : null)}
                className="w-full px-4 py-2 bg-white border border-border rounded-lg"
                style={{ fontFamily: 'Outfit, sans-serif' }}
                placeholder="Enter stage name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Stage Color
              </label>
              <div className="space-y-3">
                {/* Color Grid - First row or full grid */}
                <div className="flex items-start gap-2">
                  <div className={`flex-1 border border-gray-200 rounded-lg overflow-hidden ${isEditColorGridExpanded ? 'grid grid-cols-10 gap-0' : 'flex gap-0'}`}>
                    {(isEditColorGridExpanded ? COLOR_PALETTE : COLOR_PALETTE.slice(0, 10)).map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setEditingStage(editingStage ? { ...editingStage, color: color } : null)}
                        className={`w-full aspect-square transition-all hover:scale-110 hover:z-10 ${editingStage?.color === color
                          ? "ring-2 ring-white ring-inset z-20"
                          : ""
                          }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditColorGridExpanded(!isEditColorGridExpanded)}
                    className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 transition-colors mt-0"
                  >
                    <Plus className={`w-4 h-4 text-gray-600 transition-transform ${isEditColorGridExpanded ? 'rotate-45' : ''}`} />
                  </button>
                </div>

                {/* Selected Color Bar */}
                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 h-10 rounded-lg border-2 border-gray-300"
                    style={{ backgroundColor: editingStage?.color || "#22D3EE" }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const hexInput = prompt("Enter custom hex color:", editingStage?.color || "#22D3EE");
                      if (hexInput && /^#[0-9A-F]{6}$/i.test(hexInput)) {
                        setEditingStage(editingStage ? { ...editingStage, color: hexInput } : null);
                      }
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  >
                    Custom color
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  if (editingStage) {
                    handleRemoveStage(editingStage.id);
                    setShowEditStageModal(false);
                    setEditingStage(null);
                  }
                }}
                className="border-red-500 text-red-500 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditStageModal(false);
                    setEditingStage(null);
                  }}
                >
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSaveEditStage}>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </Modal>

        {/* Add Number Modal */}
        <Modal
          isOpen={showAddNumberModal}
          onClose={() => {
            setShowAddNumberModal(false);
            setNewNumber("");
            setSelectedCountryCode("+1");
          }}
          title="Add New Number"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Country Code
              </label>
              <select
                value={selectedCountryCode}
                onChange={(e) => setSelectedCountryCode(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-border rounded-lg"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                <option value="+1">+1 (United States/Canada)</option>
                <option value="+44">+44 (United Kingdom)</option>
                <option value="+91">+91 (India)</option>
                <option value="+61">+61 (Australia)</option>
                <option value="+81">+81 (Japan)</option>
                <option value="+86">+86 (China)</option>
                <option value="+49">+49 (Germany)</option>
                <option value="+33">+33 (France)</option>
                <option value="+39">+39 (Italy)</option>
                <option value="+34">+34 (Spain)</option>
                <option value="+7">+7 (Russia)</option>
                <option value="+52">+52 (Mexico)</option>
                <option value="+55">+55 (Brazil)</option>
                <option value="+27">+27 (South Africa)</option>
                <option value="+971">+971 (UAE)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Phone Number
              </label>
              <input
                type="text"
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-border rounded-lg"
                style={{ fontFamily: 'Outfit, sans-serif' }}
                placeholder="Enter phone number (e.g., (555) 123-4567)"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddNumberModal(false);
                  setNewNumber("");
                  setSelectedCountryCode("+1");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (newNumber.trim()) {
                    const fullNumber = `${selectedCountryCode} ${newNumber.trim()}`;
                    setInboundNumbers([...inboundNumbers, fullNumber]);
                    setSelectedInboundNumbers([...selectedInboundNumbers, fullNumber]);
                    setShowAddNumberModal(false);
                    setNewNumber("");
                    setSelectedCountryCode("+1");
                    toast.success("Number added successfully");
                  } else {
                    toast.error("Please enter a valid number");
                  }
                }}
              >
                Add Number
              </Button>
            </div>
          </div>
        </Modal>

        {/* Temporary Disable Modal */}
        <Modal
          isOpen={showTemporaryDisableModal}
          onClose={() => setShowTemporaryDisableModal(false)}
          title="Tweak Advanced Settings"
        >
          <div className="space-y-6">
            {/* Temporary Disable Header with Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-base text-primary" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  Temporary Disable
                </h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={temporaryDisableEnabled}
                  onChange={(e) => setTemporaryDisableEnabled(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <p className="text-sm leading-relaxed -mt-2" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
              Temporarily disable your Receptionist by either setting a default hangup message or specifying a number to automatically forward calls to.
            </p>

            {/* Warning Box - Only show when enabled */}
            {temporaryDisableEnabled && (
              <div className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: '#FEF9C3' }}>
                <Info className="w-5 h-5 flex-shrink-0" style={{ color: '#854D0E' }} />
                <p className="text-sm" style={{ color: '#854D0E', fontFamily: 'Outfit, sans-serif' }}>
                  Your receptionist will be disabled. Please select from below, what will happen if your customer calls this receptionist number
                </p>
              </div>
            )}

            {/* Forward Calls Option - Only show when enabled */}
            {temporaryDisableEnabled && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                    Forward all incoming calls to another number
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={forwardCallsEnabled}
                      onChange={(e) => setForwardCallsEnabled(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* Phone Number Input - Only show when forward is enabled */}
                {forwardCallsEnabled && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-lg">
                      <span className="text-xl">🇺🇸</span>
                      <select
                        value={forwardCountryCode}
                        onChange={(e) => setForwardCountryCode(e.target.value)}
                        className="border-none bg-transparent text-sm outline-none"
                        style={{ fontFamily: 'Outfit, sans-serif' }}
                      >
                        <option value="+1">+1</option>
                        <option value="+44">+44</option>
                        <option value="+91">+91</option>
                      </select>
                    </div>
                    <input
                      type="tel"
                      value={forwardPhoneNumber}
                      onChange={(e) => setForwardPhoneNumber(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-border rounded-lg text-sm"
                      style={{ fontFamily: 'Outfit, sans-serif' }}
                    />
                  </div>
                )}

                {/* Custom Message Option */}
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                    Say a custom message and automatically hang up
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={customMessageEnabled}
                      onChange={(e) => setCustomMessageEnabled(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* Custom Message Input - Only show when custom message is enabled */}
                {customMessageEnabled && (
                  <input
                    type="text"
                    value={customMessageText}
                    onChange={(e) => setCustomMessageText(e.target.value)}
                    placeholder="Enter custom message"
                    className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                )}
              </>
            )}

            {/* Submit Button */}
            <div className="flex items-center justify-end">
              <Button
                variant="primary"
                onClick={() => {
                  setShowTemporaryDisableModal(false);
                  toast.success("Temporary disable settings saved");
                }}
              >
                Submit
              </Button>
            </div>
          </div>
        </Modal>

        {/* Add Smart Analysis Scenario Modal */}
        <Modal
          isOpen={showAnalysisScenarioModal}
          onClose={() => setShowAnalysisScenarioModal(false)}
          title="Add Smart Analysis Scenario"
          maxWidth="xl"
        >
          <div className="space-y-4">
            {/* What do you want to track? */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                <span className="text-red-500">*</span> What do you want to track?
                <Info className="w-4 h-4 inline-block ml-1 text-muted-foreground" />
              </label>
              <input
                type="text"
                value={analysisScenarioData.trackWhat}
                onChange={(e) => setAnalysisScenarioData({ ...analysisScenarioData, trackWhat: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-border rounded-lg"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              />
            </div>

            {/* Field Name */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                <span className="text-red-500">*</span> Field Name
                <Info className="w-4 h-4 inline-block ml-1 text-muted-foreground" />
              </label>
              <input
                type="text"
                value={analysisScenarioData.fieldName}
                onChange={(e) => setAnalysisScenarioData({ ...analysisScenarioData, fieldName: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-border rounded-lg"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              />
            </div>

            {/* What the AI will capture during calls */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                <span className="text-red-500">*</span> What the AI will capture during calls
                <Info className="w-4 h-4 inline-block ml-1 text-muted-foreground" />
              </label>
              <textarea
                value={analysisScenarioData.captureDescription}
                onChange={(e) => setAnalysisScenarioData({ ...analysisScenarioData, captureDescription: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-border rounded-lg resize-none h-20"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              />
            </div>

            {/* Format of data */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                <span className="text-red-500">*</span> Format of data
                <Info className="w-4 h-4 inline-block ml-1 text-muted-foreground" />
              </label>
              <select
                value={analysisScenarioData.dataFormat}
                onChange={(e) => setAnalysisScenarioData({ ...analysisScenarioData, dataFormat: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-border rounded-lg"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                <option>Text - Simple text responses like summaries or comments</option>
                <option>JSON - Structured data format</option>
                <option>Number - Numeric values</option>
                <option>Boolean - Yes/No values</option>
              </select>
            </div>

            {/* Output Format Example */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>
                Output Format Example
                <Info className="w-4 h-4 inline-block ml-1 text-muted-foreground" />
              </label>
              <textarea
                value={analysisScenarioData.outputExample}
                onChange={(e) => setAnalysisScenarioData({ ...analysisScenarioData, outputExample: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-border rounded-lg resize-none h-20"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              />
            </div>

            {/* Expected Output Format */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                <span className="text-red-500">*</span> Expected Output Format
                <Info className="w-4 h-4 inline-block ml-1 text-muted-foreground" />
              </label>
              <textarea
                value={analysisScenarioData.expectedFormat}
                onChange={(e) => setAnalysisScenarioData({ ...analysisScenarioData, expectedFormat: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-border rounded-lg resize-none h-20"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAnalysisScenarioModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const newScenario = {
                    id: Date.now(),
                    name: analysisScenarioData.trackWhat,
                    description: analysisScenarioData.captureDescription,
                    dataFormat: analysisScenarioData.dataFormat
                  };
                  setCallAnalysisScenarios([...callAnalysisScenarios, newScenario]);
                  setShowAnalysisScenarioModal(false);
                  toast.success("Analysis scenario added successfully");
                }}
              >
                Add Scenario
              </Button>
            </div>
          </div>
        </Modal>

        {/* Add Call Transferring Workflow Modal */}
        <Modal
          isOpen={showAddTransferModal}
          onClose={() => {
            setShowAddTransferModal(false);
            setTransferScenarios([{
              id: 1,
              description: "",
              countryCode: "+1",
              phoneNumber: "",
              extensionDigits: "",
              voiceResponse: "Please hold while I transfer your call",
              transferType: "cold",
              advancedExpanded: false
            }]);
          }}
          title="Add Call Transferring Workflow"
        >
          <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
            {transferScenarios.map((scenario, index) => (
              <div key={scenario.id} className="p-5 border border-gray-200 rounded-lg">
                {/* Scenario Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900">Scenario {index + 1}</h3>
                  {index > 0 && (
                    <button
                      onClick={() => setTransferScenarios(transferScenarios.filter(s => s.id !== scenario.id))}
                      className="px-3.5 py-1.5 bg-blue-600 text-white rounded-md flex items-center gap-1.5 text-[13px] hover:bg-blue-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  )}
                </div>

                {/* Scenario Description */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-semibold text-blue-600">Scenario Description</label>
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <input
                    type="text"
                    value={scenario.description}
                    onChange={(e) => {
                      const updated = transferScenarios.map(s =>
                        s.id === scenario.id ? { ...s, description: e.target.value } : s
                      );
                      setTransferScenarios(updated);
                    }}
                    placeholder="e.g. Transfer the caller to the billing department. Execute whenever caller asks fo..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] text-gray-400 placeholder:text-gray-400"
                  />
                </div>

                {/* Phone Number - Stacked Layout */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-semibold text-blue-600">Phone Number</label>
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                  </div>

                  {/* Number Field */}
                  <div className="mb-3">
                    <label className="block text-xs text-gray-500 mb-1">Number:</label>
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden h-10">
                      <select
                        value={scenario.countryCode}
                        onChange={(e) => {
                          const updated = transferScenarios.map(s =>
                            s.id === scenario.id ? { ...s, countryCode: e.target.value } : s
                          );
                          setTransferScenarios(updated);
                        }}
                        className="px-2 py-2 border-r border-gray-300 text-sm bg-white"
                      >
                        <option value="+1">🇺🇸 US +1</option>
                        <option value="+44">🇬🇧 UK +44</option>
                        <option value="+91">🇮🇳 IN +91</option>
                      </select>
                      <input
                        type="tel"
                        value={scenario.phoneNumber}
                        onChange={(e) => {
                          const updated = transferScenarios.map(s =>
                            s.id === scenario.id ? { ...s, phoneNumber: e.target.value } : s
                          );
                          setTransferScenarios(updated);
                        }}
                        className="flex-1 px-3 text-sm"
                      />
                    </div>
                  </div>

                  {/* Extension Digits */}
                  <div>
                    <label className="block text-xs font-semibold text-blue-600 mb-1">Extension (optional):</label>
                    <input
                      type="text"
                      value={scenario.extensionDigits || ""}
                      onChange={(e) => {
                        const updated = transferScenarios.map(s =>
                          s.id === scenario.id ? { ...s, extensionDigits: e.target.value } : s
                        );
                        setTransferScenarios(updated);
                      }}
                      placeholder="e.g. 1234"
                      className="w-full px-3 py-2 border-2 border-blue-500 rounded-lg text-sm focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Voice Response */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-semibold text-blue-600">Voice Response</label>
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <input
                    type="text"
                    value={scenario.voiceResponse}
                    onChange={(e) => {
                      const updated = transferScenarios.map(s =>
                        s.id === scenario.id ? { ...s, voiceResponse: e.target.value } : s
                      );
                      setTransferScenarios(updated);
                    }}
                    className="w-full px-3 py-2.5 border-2 border-blue-600 rounded-lg text-sm"
                  />
                </div>

                {/* Advanced Settings - Expandable */}
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      const updated = transferScenarios.map(s =>
                        s.id === scenario.id ? { ...s, advancedExpanded: !s.advancedExpanded } : s
                      );
                      setTransferScenarios(updated);
                    }}
                    className="flex items-center justify-between w-full text-[13px] font-semibold text-blue-600"
                  >
                    <span>Advanced Settings</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${scenario.advancedExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Expanded Content */}
                  {scenario.advancedExpanded && (
                    <div className="mt-4 pl-4">
                      <label className="block text-xs text-gray-400 uppercase mb-3">Call Transfer Type</label>
                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`transfer-type-${scenario.id}`}
                            checked={scenario.transferType === "cold"}
                            onChange={() => {
                              const updated = transferScenarios.map(s =>
                                s.id === scenario.id ? { ...s, transferType: "cold" } : s
                              );
                              setTransferScenarios(updated);
                            }}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-[13px] text-gray-700">Cold Transfer</span>
                          <Info className="w-3.5 h-3.5 text-gray-400" />
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`transfer-type-${scenario.id}`}
                            checked={scenario.transferType === "hot"}
                            onChange={() => {
                              const updated = transferScenarios.map(s =>
                                s.id === scenario.id ? { ...s, transferType: "hot" } : s
                              );
                              setTransferScenarios(updated);
                            }}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-[13px] text-gray-700">Hot Transfer</span>
                          <Info className="w-3.5 h-3.5 text-gray-400" />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Add Another Scenario Button */}
            <button
              onClick={() => {
                const newId = Math.max(...transferScenarios.map(s => s.id)) + 1;
                setTransferScenarios([...transferScenarios, {
                  id: newId,
                  description: "",
                  countryCode: "+1",
                  phoneNumber: "",
                  extensionDigits: "",
                  voiceResponse: "Please hold while I transfer your call",
                  transferType: "cold",
                  advancedExpanded: false
                }]);
              }}
              className="w-full py-3 text-[13px] text-blue-600 font-medium border-2 border-dashed border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-300"
            >
              + Add Call Transferring Workflow
            </button>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200 mt-4">
            <Button
              variant="primary"
              onClick={() => {
                const validScenarios = transferScenarios.filter(s => s.description && s.phoneNumber);
                if (validScenarios.length === 0) {
                  toast.error("Please fill in at least one complete scenario");
                  return;
                }
                const newScenarios = validScenarios.map((s, i) => ({
                  id: savedTransferScenarios.length + i + 1,
                  description: s.description,
                  phoneNumber: `${s.countryCode} ${s.phoneNumber}`,
                  voiceResponse: s.voiceResponse,
                  transferType: s.transferType || "cold",
                  enabled: true
                }));
                setSavedTransferScenarios([...savedTransferScenarios, ...newScenarios]);
                setShowAddTransferModal(false);
                setTransferScenarios([{
                  id: 1,
                  description: "",
                  countryCode: "+1",
                  phoneNumber: "",
                  extensionDigits: "",
                  voiceResponse: "Please hold while I transfer your call",
                  transferType: "cold",
                  advancedExpanded: false
                }]);
                toast.success("Call Transferring workflow has been created successfully!");
              }}
              className="px-7 py-2.5"
            >
              Submit
            </Button>
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteTransferConfirm}
          onClose={() => {
            setShowDeleteTransferConfirm(false);
            setTransferToDelete(null);
          }}
          title=""
        >
          <div className="text-center py-2">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-2">
              Are you sure you want to delete this scenario?
            </h3>
            <p className="text-[13px] text-gray-500 mb-6">
              Scenario {savedTransferScenarios.findIndex(s => s.id === transferToDelete) + 1} will be permanently deleted.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteTransferConfirm(false);
                  setTransferToDelete(null);
                }}
                className="px-5 py-2"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setSavedTransferScenarios(savedTransferScenarios.filter(s => s.id !== transferToDelete));
                  setShowDeleteTransferConfirm(false);
                  setTransferToDelete(null);
                  toast.success("Scenario deleted successfully");
                }}
                className="px-5 py-2 bg-red-500 hover:bg-red-600"
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>

        {/* Add Texting Workflow Modal */}
        <Modal
          isOpen={showAddTextMessageModal}
          onClose={() => {
            setShowAddTextMessageModal(false);
            setTextMessageScenarios([{
              id: 1,
              enableShortUrls: true,
              description: "",
              textMessage: "",
              nextAction: "",
              askBeforeSending: false,
              attachedImage: null,
              attachedImageUrl: null
            }]);
          }}
          title="Add Texting Workflow"
          maxWidth="lg"
        >
          <div className="max-h-[80vh] overflow-y-auto">
            {textMessageScenarios.map((scenario, index) => (
              <div key={scenario.id} className="border border-gray-200 rounded-lg p-5 mb-4">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900">Scenario {index + 1}</h3>
                </div>

                {/* Enable Short URLs */}
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-semibold text-blue-600">Enable Short URLs</label>
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={scenario.enableShortUrls}
                      onChange={(e) => {
                        const updated = textMessageScenarios.map(s =>
                          s.id === scenario.id ? { ...s, enableShortUrls: e.target.checked } : s
                        );
                        setTextMessageScenarios(updated);
                      }}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Scenario Description */}
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-semibold text-blue-600">Scenario Description</label>
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <textarea
                    value={scenario.description}
                    onChange={(e) => {
                      const updated = textMessageScenarios.map(s =>
                        s.id === scenario.id ? { ...s, description: e.target.value } : s
                      );
                      setTextMessageScenarios(updated);
                    }}
                    placeholder="e.g. Send the caller a copy of the menu. Execute whenever caller asks for menu or prices."
                    className="w-full min-h-[72px] px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 resize-none"
                  />
                </div>

                {/* Text Message */}
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-semibold text-blue-600">Text Message</label>
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <textarea
                    value={scenario.textMessage}
                    onChange={(e) => {
                      if (e.target.value.length <= 1000) {
                        const updated = textMessageScenarios.map(s =>
                          s.id === scenario.id ? { ...s, textMessage: e.target.value } : s
                        );
                        setTextMessageScenarios(updated);
                      }
                    }}
                    placeholder="e.g. Here is our menu: www.restaurant.com/menu"
                    className="w-full min-h-[72px] px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 resize-none"
                  />
                  <p className="text-xs text-blue-600 mt-1">* Max 1000 characters allowed</p>
                </div>

                {/* What should the AI do next? */}
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-semibold text-blue-600">What should the AI do next?</label>
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <textarea
                    value={scenario.nextAction}
                    onChange={(e) => {
                      const updated = textMessageScenarios.map(s =>
                        s.id === scenario.id ? { ...s, nextAction: e.target.value } : s
                      );
                      setTextMessageScenarios(updated);
                    }}
                    placeholder="e.g., Tell the caller you've sent them a text message, and then trigger the intake form defined earlier to collect their information."
                    className="w-full min-h-[72px] px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 resize-none"
                  />
                </div>

                {/* Ask before sending Text SMS */}
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-semibold text-blue-600">Ask before sending Text SMS</label>
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={scenario.askBeforeSending}
                      onChange={(e) => {
                        const updated = textMessageScenarios.map(s =>
                          s.id === scenario.id ? { ...s, askBeforeSending: e.target.checked } : s
                        );
                        setTextMessageScenarios(updated);
                      }}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Attach Image */}
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Image Upload</p>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-semibold text-blue-600">Attach Image (Optional)</label>
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                  </div>

                  {!scenario.attachedImageUrl ? (
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 1024 * 1024) {
                              toast.error("File size must be less than 1 MB");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const updated = textMessageScenarios.map(s =>
                                s.id === scenario.id ? {
                                  ...s,
                                  attachedImage: file,
                                  attachedImageUrl: event.target?.result as string
                                } : s
                              );
                              setTextMessageScenarios(updated);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="border-2 border-dashed border-blue-300 rounded-lg bg-blue-50 p-8 text-center">
                        <div className="flex flex-col items-center">
                          <Inbox className="w-9 h-9 text-blue-600 mb-3" />
                          <p className="text-sm text-gray-700 mb-1">Click or drag file to this area to upload</p>
                          <p className="text-xs text-gray-400">Must be JPEG/JPG/PNG image (Max. 1 MB)</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg mb-2">
                        <Paperclip className="w-4 h-4 text-gray-700" />
                        <span className="text-[13px] text-gray-700 flex-1">{scenario.attachedImage?.name}</span>
                        <button
                          onClick={() => {
                            const updated = textMessageScenarios.map(s =>
                              s.id === scenario.id ? {
                                ...s,
                                attachedImage: null,
                                attachedImageUrl: null
                              } : s
                            );
                            setTextMessageScenarios(updated);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <img
                        src={scenario.attachedImageUrl}
                        alt="Attached preview"
                        className="w-full max-h-40 rounded-lg border border-gray-200 object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Add Another Scenario Button */}
            <button
              onClick={() => {
                const newId = Math.max(...textMessageScenarios.map(s => s.id)) + 1;
                setTextMessageScenarios([...textMessageScenarios, {
                  id: newId,
                  enableShortUrls: true,
                  description: "",
                  textMessage: "",
                  nextAction: "",
                  askBeforeSending: false,
                  attachedImage: null,
                  attachedImageUrl: null
                }]);
              }}
              className="w-full py-3 text-[13px] text-blue-600 font-medium border-2 border-dashed border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-300"
            >
              + Add Texting Workflow
            </button>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200 mt-4">
            <Button
              variant="primary"
              onClick={() => {
                const validScenarios = textMessageScenarios.filter(s => s.description && s.textMessage);
                if (validScenarios.length === 0) {
                  toast.error("Please fill in at least one complete scenario");
                  return;
                }
                const newScenarios = validScenarios.map((s, i) => ({
                  id: savedTextMessageScenarios.length + i + 1,
                  enableShortUrls: s.enableShortUrls,
                  description: s.description,
                  textMessage: s.textMessage,
                  nextAction: s.nextAction,
                  askBeforeSending: s.askBeforeSending,
                  attachedImage: null,
                  attachedImageUrl: s.attachedImageUrl,
                  enabled: true
                }));
                setSavedTextMessageScenarios([...savedTextMessageScenarios, ...newScenarios]);
                setShowAddTextMessageModal(false);
                setTextMessageScenarios([{
                  id: 1,
                  enableShortUrls: true,
                  description: "",
                  textMessage: "",
                  nextAction: "",
                  askBeforeSending: false,
                  attachedImage: null,
                  attachedImageUrl: null
                }]);
                toast.success("Texting workflow has been created successfully!");
              }}
              className="px-7 py-2.5"
            >
              Submit
            </Button>
          </div>
        </Modal>

        {/* Delete Text Message Confirmation Modal */}
        <Modal
          isOpen={showDeleteTextMessageConfirm}
          onClose={() => {
            setShowDeleteTextMessageConfirm(false);
            setTextMessageToDelete(null);
          }}
          title=""
        >
          <div className="text-center py-2">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-2">
              Are you sure you want to delete this scenario?
            </h3>
            <p className="text-[13px] text-gray-500 mb-6">
              Scenario {savedTextMessageScenarios.findIndex(s => s.id === textMessageToDelete) + 1} will be permanently deleted.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteTextMessageConfirm(false);
                  setTextMessageToDelete(null);
                }}
                className="px-5 py-2"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setSavedTextMessageScenarios(savedTextMessageScenarios.filter(s => s.id !== textMessageToDelete));
                  setShowDeleteTextMessageConfirm(false);
                  setTextMessageToDelete(null);
                  toast.success("Scenario deleted successfully");
                }}
                className="px-5 py-2 bg-red-500 hover:bg-red-600"
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>

        {/* Template Selection Modal */}
        {showTemplateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.35)] p-4">
            <div className="bg-white rounded-xl shadow-[0px_8px_32px_rgba(0,0,0,0.14)] w-full max-w-[400px]">
              {/* Modal Header */}
              <div className="px-6 py-5">
                <button
                  onClick={() => {
                    setShowTemplateModal(false);
                    setSelectedTemplate(null);
                  }}
                  className="float-right text-[#9CA3AF] hover:text-gray-900"
                >
                  <X className="w-4 h-4" />
                </button>
                <h2 className="text-base font-bold text-[#111827]">Choose a form</h2>
              </div>

              {/* Separator */}
              <div className="h-px bg-[#F3F4F6]"></div>

              {/* Form List */}
              <div className="px-6 py-3">
                {/* Template List Items */}
                {FORM_TEMPLATES.map((template, index) => (
                  <div key={template.id}>
                    <button
                      onClick={() => {
                        const newForm = {
                          id: savedCollectInfoForms.length + 1,
                          templateName: template.name,
                          fields: template.fields
                        };
                        setSavedCollectInfoForms([...savedCollectInfoForms, newForm]);
                        setShowTemplateModal(false);
                        setSelectedTemplate(null);
                        toast.success(`${template.name} template added successfully!`);
                      }}
                      className={`group w-full h-[44px] flex items-center justify-between px-1 transition-all ${selectedTemplate === template.id
                        ? 'bg-[#EFF6FF] border-l-[3px] border-[#2563EB]'
                        : 'hover:bg-[#F9FAFB]'
                        }`}
                    >
                      <span className={`text-sm font-medium pl-1 ${selectedTemplate === template.id ? 'text-[#2563EB]' : 'text-[#111827]'
                        }`}>
                        {template.name}
                      </span>
                      <div className="flex items-center">
                        {selectedTemplate === template.id ? (
                          <svg className="w-4 h-4 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-[#9CA3AF] opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                    {index < FORM_TEMPLATES.length - 1 && <div className="h-px bg-[#F3F4F6]"></div>}
                  </div>
                ))}
              </div>

              {/* Separator */}
              <div className="h-px bg-[#F3F4F6]"></div>

              {/* Create New Form Button */}
              <div className="px-6 pb-3">
                <button
                  onClick={() => {
                    setShowTemplateModal(false);
                    toast.info("Redirecting to Web Forms page...");
                  }}
                  className="w-full h-[44px] flex items-center px-1 hover:bg-[#F0F7FF] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-[#2563EB] ml-1 mr-2" />
                  <span className="text-sm font-medium text-[#2563EB]">Create New Form</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
