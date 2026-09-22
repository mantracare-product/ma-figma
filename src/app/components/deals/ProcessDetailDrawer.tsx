import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  X,
  ChevronDown,
  Settings as SettingsIcon,
  Search,
  Filter,
  Plus,
  Phone,
  MessageCircle,
  MessageSquare,
  Mail,
  GitBranch,
  Zap,
  Calendar,
  Pencil,
  ChevronRight,
  LogIn,
  ArrowRightCircle,
  CheckCircle2,
  Globe,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Download,
  Eye,
  Trash2,
  UploadCloud,
  Clock,
  XCircle,
  Check,
  ExternalLink,
  ShieldCheck,
  FileCheck,
  User,
  Building,
  Send,
  Copy,
  PhoneCall,
  Sparkles,
  Workflow,
  Layers,
  PhoneIncoming,
  PhoneOutgoing,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { SelectFieldsModal, CreateFieldModal } from "../help/FieldManager";
import ActivityTab, { ActivityLogEntry, ActivityType } from "../activity/ActivityTab";
import DraggableOverviewSections, { OverviewSection } from "../profile/DraggableOverviewSections";
import {
  useFieldRegistry,
  FieldDefinition,
  SectionDefinition,
  SECTION_REGISTRY_EVENT,
  LEGACY_SECTION_REGISTRY_EVENT,
} from "../../context/FieldRegistryContext";
import { useOrganization } from "../../context/OrganizationContext";
import { getStoredProcesses, Process, PROCESS_STORE_EVENT } from "../../../lib/useProcessStore";
import { getStagesForProcess } from "../ui/ProcessStageSelect";
import DocumentsTab from "../profile/DocumentsTab";
import { getStoredClientDocuments } from "../../../lib/clientDocumentsStore";
import {
  appendActivity,
  getActivity,
  subscribeToActivity,
  formatTimestamp,
} from "../../../lib/activityEngine";
import { getMissingRequiredProcessFields, MissingRequiredField } from "../../../lib/processFieldValidation";
import RequiredFieldsModal from "./RequiredFieldsModal";

export interface ProcessDocument {
  id: string;
  name: string;
  category: "Identification" | "Financial" | "Contract" | "Medical / Intake" | "General";
  fileType: "pdf" | "image" | "doc" | "sheet";
  fileSize: string;
  uploadedDate: string;
  uploadedBy: string;
  status: "Verified" | "Pending Review" | "Rejected";
  url?: string;
  notes?: string;
}

export const dealStageLabels = ["New", "Can't Contact", "Follow-up Later", "Interested", "Close Deal"];

export const getDealStageIndex = (stageName: string): number => {
  const index = dealStageLabels.findIndex((label) => label === stageName);
  if (index !== -1) {
    return index + 1;
  }
  const stageToPosition: Record<string, number> = {
    "Initial Contact": 1,
    "Insurance Verify": 2,
    "Schedule Appointment": 3,
    "Post-Visit Check": 4,
    "Medication Reminder": 5,
    "Billing Inquiry": 6,
    "Issue Resolution": 7,
    "Payment Notice": 8,
    "Payment Collected": 9,
    "Slot Selection": 11,
    "Confirmation": 12,
    "Document Check": 14,
    "Verification": 15,
  };
  const pos = stageToPosition[stageName] || 1;
  if (pos <= 3) return 1;
  if (pos <= 6) return 2;
  if (pos <= 9) return 3;
  if (pos <= 12) return 4;
  return 5;
};

export const getDealStageFromIndex = (idx: number): string => {
  return dealStageLabels[idx - 1] || dealStageLabels[0];
};

export interface CallLog {
  id: string;
  client: string;
  clientId: string;
  type: string;
  status: string;
  process: string;
  lastStage?: string;
  currentStage: string;
  duration: string;
  date: string;
  hasRecording: boolean;
  hasTranscript: boolean;
  hasScheduledCall: boolean;
  parentCallId?: string;
  childCallIds?: string[];
  relationshipReason?: "Call Trigger" | "Stage Change" | "Retry" | "Manual Trigger";
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  countryCode: string;
  countryFlag: string;
  processes: string[];
  stage: string;
  responsible?: string;
  lastContact: string;
  status: string;
  companyName?: string;
  jobPosition?: string;
  numberOfEmployees?: string;
  location?: string;
}

export interface TeamMember {
  name: string;
  role: string;
  email: string;
  phone: string;
}

export interface ProcessDetailHistoryFilterState {
  showPopup: boolean;
  quickFilter: string | null;
  eventTypeFilter: string;
  createdByFilter: string;
  dateFilter: string;
  filtersActive: boolean;
  showAddFieldPopup: boolean;
  activeFilterFields: string[];
  selectedAddFields: string[];
}

export type { ActivityLogEntry, ActivityType };

export interface ProcessDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;

  log: CallLog | null;
  client: Client | undefined; // mockClients[log.clientId], resolved by parent

  activeTab: "general" | "activity" | "history" | "documents";
  onTabChange: (tab: "general" | "activity" | "history" | "documents") => void;

  activity?: ActivityLogEntry[];
  onOpenActivity?: (entry: ActivityLogEntry) => void;

  // Stage pipeline
  stageIdx: number; // drawerStageIdx
  onStageChange: (idx: number) => void;

  // General tab — field rows
  visibleFieldKeys: string[];
  onVisibleFieldKeysChange: (keys: string[]) => void;
  editedValues: Record<string, string>;
  editingField: string | null;
  onStartEditingField: (key: string | null) => void;
  onFieldSave: (key: string, value: string) => void;

  showResponsibleDropdown: boolean;
  onToggleResponsibleDropdown: (open: boolean) => void;
  onOpenTeamMember: (personName: string) => void;
  isTeamMemberDrawerOpen: boolean;

  fieldManagerOpen: boolean;
  fieldManagerMode: "select" | "create";
  onOpenFieldManager: (mode: "select" | "create") => void;
  onCloseFieldManager: () => void;

  teamMembersData: TeamMember[];
  dealFields: FieldDefinition[];

  // History tab
  historyFilters: ProcessDetailHistoryFilterState;
  onHistoryFiltersChange: (patch: Partial<ProcessDetailHistoryFilterState>) => void;

  /** Bubbled from parent — opens ScheduleAppointmentDrawer */
  onOpenScheduleAppointment?: () => void;
}

export default function ProcessDetailDrawer({
  isOpen,
  onClose,
  log,
  client,
  activeTab,
  onTabChange,
  activity = [],
  onOpenActivity = () => { },
  stageIdx,
  onStageChange,
  visibleFieldKeys,
  onVisibleFieldKeysChange,
  editedValues,
  editingField,
  onStartEditingField,
  onFieldSave,
  showResponsibleDropdown,
  onToggleResponsibleDropdown,
  onOpenTeamMember,
  isTeamMemberDrawerOpen,
  fieldManagerOpen,
  fieldManagerMode,
  onOpenFieldManager,
  onCloseFieldManager,
  teamMembersData,
  dealFields,
  historyFilters,
  onHistoryFiltersChange,
  onOpenScheduleAppointment,
}: ProcessDetailDrawerProps) {
  const navigate = useNavigate();
  const [draftText, setDraftText] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const clientId = client?.id || log?.clientId || "";
  const clientName = client?.name || log?.client || "—";

  // Quick activity composer state in General tab
  const [noteContent, setNoteContent] = useState("");
  const [noteTag, setNoteTag] = useState<"activity" | "note" | "call" | "task">("activity");
  const [timelineFilter, setTimelineFilter] = useState<"all" | "stages" | "calls" | "messages">("all");
  const [liveActivities, setLiveActivities] = useState<any[]>([]);

  const DEFAULT_PROCESS_SECTIONS: OverviewSection[] = [
    {
      id: "sec-client-details",
      title: "Client Details",
      iconName: "user",
      fieldKeys: ["client_name", "phone", "email", "source"],
    },
    {
      id: "sec-process-info",
      title: "Process Information",
      iconName: "layers",
      fieldKeys: ["responsible", "created_at"],
    },
  ];

  const { getSectionsForOrg, getFieldsForOrg, getCustomSections, getAllFields } = useFieldRegistry();
  const { activeOrganization } = useOrganization();

  const computeMergedProcessSections = (
    existingSections: OverviewSection[] | undefined,
    registryCustomSections: SectionDefinition[],
    registryAllFields: FieldDefinition[],
    visKeys?: string[]
  ): OverviewSection[] => {
    const baseSections: OverviewSection[] =
      existingSections && existingSections.length > 0
        ? existingSections.map((s) => ({ ...s, fieldKeys: [...s.fieldKeys] }))
        : JSON.parse(JSON.stringify(DEFAULT_PROCESS_SECTIONS));

    if (visKeys && Array.isArray(visKeys)) {
      const customKeys = visKeys.filter(
        (k) => !["client_name", "phone", "email", "source", "responsible", "created_at"].includes(k)
      );
      if (customKeys.length > 0) {
        const processInfoSec = baseSections.find((s) => s.id === "sec-process-info");
        if (processInfoSec) {
          const keySet = new Set(processInfoSec.fieldKeys);
          customKeys.forEach((k) => {
            if (!keySet.has(k)) {
              processInfoSec.fieldKeys.push(k);
              keySet.add(k);
            }
          });
        }
      }
    }

    const customSecs = registryCustomSections || [];
    const customSecIds = new Set(customSecs.map((s) => s.id));
    const SYSTEM_SEC_IDS = new Set(["sec-client-details", "sec-process-info"]);

    let allKnownProcessSecs: SectionDefinition[] = [];
    try {
      allKnownProcessSecs = getCustomSections("process");
    } catch {}
    const allKnownSecIds = new Set(allKnownProcessSecs.map((s) => s.id));

    let updatedSections = baseSections.filter((s) => {
      if (SYSTEM_SEC_IDS.has(s.id)) return true;
      return customSecIds.has(s.id) || allKnownSecIds.has(s.id);
    });

    updatedSections = updatedSections.map((s) => {
      const regSec = customSecs.find((cs) => cs.id === s.id) || allKnownProcessSecs.find((cs) => cs.id === s.id);
      if (!regSec) return s;

      const assignedFromFields = registryAllFields
        .filter((f) => f.sectionId === regSec.id)
        .map((f) => f.key);
      const regKeys = Array.from(new Set([...(regSec.fieldKeys || []), ...assignedFromFields]));

      const existingKeySet = new Set(s.fieldKeys);
      const mergedKeys = [...s.fieldKeys];
      regKeys.forEach((k) => {
        if (!existingKeySet.has(k)) {
          mergedKeys.push(k);
          existingKeySet.add(k);
        }
      });

      return {
        ...s,
        title: regSec.title || s.title,
        description: regSec.description ?? s.description,
        iconName: (regSec.iconName as any) || s.iconName || "layers",
        isCustom: true,
        fieldKeys: mergedKeys,
      };
    });

    const existingSecIds = new Set(updatedSections.map((s) => s.id));
    customSecs.forEach((regSec) => {
      if (!existingSecIds.has(regSec.id)) {
        const assignedFromFields = registryAllFields
          .filter((f) => f.sectionId === regSec.id)
          .map((f) => f.key);
        const regKeys = Array.from(new Set([...(regSec.fieldKeys || []), ...assignedFromFields]));

        updatedSections.push({
          id: regSec.id,
          title: regSec.title,
          description: regSec.description,
          iconName: (regSec.iconName as any) || "layers",
          isCustom: true,
          fieldKeys: regKeys,
        });
        existingSecIds.add(regSec.id);
      }
    });

    return updatedSections;
  };

  const currentProcessId = (log as any)?.processId || (log as any)?.process || (log as any)?.processName;

  const [processSections, setProcessSections] = useState<OverviewSection[]>(() => {
    const customSecs = getSectionsForOrg("process", activeOrganization, currentProcessId).filter((s) => s.source !== "system");
    const fields = getFieldsForOrg("process", activeOrganization, currentProcessId);
    return computeMergedProcessSections(
      undefined,
      customSecs,
      fields,
      visibleFieldKeys
    );
  });

  useEffect(() => {
    const handleSectionsUpdate = () => {
      const customSecs = getSectionsForOrg("process", activeOrganization, currentProcessId).filter((s) => s.source !== "system");
      const fields = getFieldsForOrg("process", activeOrganization, currentProcessId);
      setProcessSections((prev) =>
        computeMergedProcessSections(
          prev,
          customSecs,
          fields,
          visibleFieldKeys
        )
      );
    };

    window.addEventListener(SECTION_REGISTRY_EVENT, handleSectionsUpdate);
    window.addEventListener(LEGACY_SECTION_REGISTRY_EVENT, handleSectionsUpdate);
    window.addEventListener("storage", handleSectionsUpdate);
    return () => {
      window.removeEventListener(SECTION_REGISTRY_EVENT, handleSectionsUpdate);
      window.removeEventListener(LEGACY_SECTION_REGISTRY_EVENT, handleSectionsUpdate);
      window.removeEventListener("storage", handleSectionsUpdate);
    };
  }, [getSectionsForOrg, getFieldsForOrg, activeOrganization, currentProcessId, visibleFieldKeys]);

  const fields = React.useMemo(() => {
    return dealFields
      .filter((f) => visibleFieldKeys.includes(f.key))
      .map((f) => {
        let val = "";
        if (editedValues[f.key] !== undefined) {
          val = editedValues[f.key];
        } else if (
          log &&
          (log as any)[f.key] !== undefined &&
          (log as any)[f.key] !== null &&
          (log as any)[f.key] !== ""
        ) {
          val = (log as any)[f.key];
        } else {
          if (f.key === "client_name") val = log?.client || client?.name || "—";
          else if (f.key === "responsible") val = client?.responsible || "Unassigned";
          else if (f.key === "deal_type") val = "Organic";
          else if (f.key === "source")
            val = (client as any)?.source || (client?.email ? client.email.split("@")[1] || "—" : "WhatsApp");
          else if (f.key === "start_date")
            val = log?.date
              ? new Date(log.date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })
              : "August 21, 2026";
          else if (f.key === "end_date") val = "—";
          else if (f.key === "email_id") val = client?.email || "—";
          else if (f.key === "country_code") val = client?.countryCode || "+1";
          else if (f.key === "country") val = client?.country || "United States";
          else if (f.key === "time_slot") val = "8AM – 8PM";
          else if (f.key === "comment") val = "";
          else if (f.key === "status" || f.key === "stage") val = log?.currentStage || log?.status || "—";
          else if (f.key === "process") val = log?.process || "—";
          else val = "—";
        }
        return {
          key: f.key,
          label: f.label,
          value: val,
          type: f.inputType === "select" ? "dropdown" : f.inputType,
          isClickable: f.key === "client_name",
          isAvatar: f.key === "responsible",
        };
      });
  }, [dealFields, visibleFieldKeys, editedValues, log, client]);

  const processFieldValues = React.useMemo(() => {
    const vals: Record<string, any> = {
      ...(log as any),
      client_name: clientName,
      phone: client?.phone || (log as any)?.phone || "9667283405",
      email: client?.email || "anshul@mantracare.com",
      source: (client as any)?.source || "Inbound Web / WhatsApp",
      responsible: client?.responsible || (log as any)?.responsible || "Unassigned",
      created_at: log?.date
        ? new Date(log.date).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        : "August 21, 2026",
    };
    if (fields && Array.isArray(fields)) {
      fields.forEach((f) => {
        if (f.value !== undefined && f.value !== "") {
          vals[f.key] = f.value;
        }
      });
    }
    // Directly merge all editedValues so ANY field (custom or standard) immediately updates and preserves its typed value
    if (editedValues && typeof editedValues === "object") {
      Object.entries(editedValues).forEach(([k, v]) => {
        if (v !== undefined) {
          vals[k] = v;
        }
      });
    }
    return vals;
  }, [client, log, clientName, fields, editedValues]);

  // Compute active stages
  const [storedProcesses, setStoredProcesses] = useState<Process[]>(getStoredProcesses);

  useEffect(() => {
    const handler = () => {
      try {
        setStoredProcesses(getStoredProcesses());
      } catch {}
    };
    window.addEventListener(PROCESS_STORE_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(PROCESS_STORE_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const matchedProc = useMemo(() => {
    if (!log?.process) return undefined;
    const cleanName = log.process.trim().toLowerCase();
    return storedProcesses.find(
      (p) => p.name.trim().toLowerCase() === cleanName || p.id === log.process
    );
  }, [storedProcesses, log?.process]);

  const activeStageList = useMemo(() => {
    if (matchedProc && matchedProc.stages && matchedProc.stages.length > 0) {
      return matchedProc.stages.map((s) => s.name);
    }
    if (log?.process) {
      const stages = getStagesForProcess(log.process);
      if (stages && stages.length > 0) {
        return stages.map((s) => s.label);
      }
    }
    return log?.currentStage ? [log.currentStage] : dealStageLabels;
  }, [log?.process, log?.currentStage, matchedProc]);

  const matchedIdx = log?.currentStage ? activeStageList.findIndex(
    (s) => s.toLowerCase() === log.currentStage.toLowerCase()
  ) : -1;
  const effectiveStageIdx = matchedIdx >= 0 ? matchedIdx + 1 : stageIdx;
  const currentStageName = log?.currentStage || activeStageList[effectiveStageIdx - 1] || "";

  const allRegistrySections = useMemo(() => {
    return getSectionsForOrg("process", activeOrganization, currentProcessId);
  }, [getSectionsForOrg, activeOrganization, currentProcessId]);

  const allRegistryProcessFields = useMemo(() => {
    return getFieldsForOrg("process", activeOrganization, currentProcessId);
  }, [getFieldsForOrg, activeOrganization, currentProcessId]);

  const missingRequiredFields = useMemo(() => {
    if (!isOpen || !log) return [];
    return getMissingRequiredProcessFields({
      processId: currentProcessId,
      processName: log?.process,
      currentStageName,
      allFields: allRegistryProcessFields,
      allSections: allRegistrySections,
      fieldValues: processFieldValues,
    });
  }, [isOpen, log, currentProcessId, currentStageName, allRegistryProcessFields, allRegistrySections, processFieldValues]);

  const missingFieldKeys = useMemo(() => {
    return missingRequiredFields.map((f) => f.key);
  }, [missingRequiredFields]);

  const [requiredFieldsModalState, setRequiredFieldsModalState] = useState<{
    isOpen: boolean;
    targetStageName: string;
    targetStageIdx: number;
    missingFields: MissingRequiredField[];
  }>({
    isOpen: false,
    targetStageName: "",
    targetStageIdx: 1,
    missingFields: [],
  });

  const handleStageClick = (newStageIdx: number) => {
    const targetStageName = activeStageList[newStageIdx - 1] || "";
    const missingForTarget = getMissingRequiredProcessFields({
      processId: currentProcessId,
      processName: log?.process,
      currentStageName: targetStageName,
      allFields: allRegistryProcessFields,
      fieldValues: processFieldValues,
    });

    if (missingForTarget.length > 0) {
      setRequiredFieldsModalState({
        isOpen: true,
        targetStageName,
        targetStageIdx: newStageIdx,
        missingFields: missingForTarget,
      });
      return;
    }

    onStageChange(newStageIdx);
  };

  // Subscribe to live activity engine
  useEffect(() => {
    if (clientId) {
      const load = () => {
        const entries = getActivity(clientId, log?.process);
        setLiveActivities(entries);
      };
      load();
      const unsub = subscribeToActivity(clientId, () => load());
      return unsub;
    }
  }, [clientId, log?.process]);

  const handleCopy = (text: string, label: string) => {
    if (!text || text === "—") return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePostQuickActivity = () => {
    if (!noteContent.trim()) {
      toast.error("Please enter a note or activity description");
      return;
    }

    appendActivity({
      clientId,
      processId: log?.process || "general",
      processName: log?.process || "General Process",
      type: "process_entry",
      createdBy: "user",
      details: {
        primary: noteContent.trim(),
        secondary: `Posted by User · Tag: ${noteTag.toUpperCase()}`,
      },
    } as any);

    toast.success("Activity recorded successfully");
    setNoteContent("");
  };

  const mockHistory = [
    {
      date: "26.05.2024 14:32",
      createdBy: client?.responsible || "System",
      eventType: "Stage changed" as const,
      description: `New → ${dealStageLabels[stageIdx - 1] || "Current Stage"}`,
    },
    {
      date: "25.05.2024 10:15",
      createdBy: client?.responsible || "System",
      eventType: "Activity created" as const,
      description: "Contact customer: Call for update",
    },
    { date: "24.05.2024 09:00", createdBy: "System", eventType: "View" as const, description: "Process viewed in CRM" },
    {
      date: "23.05.2024 16:45",
      createdBy: client?.responsible || "System",
      eventType: "Stage changed" as const,
      description: `New → Initial Contact`,
    },
    { date: "22.05.2024 11:20", createdBy: "System", eventType: "View" as const, description: "Process Initialized" },
  ];

  const filteredHistory = mockHistory.filter((h) => {
    if (
      historyFilters.createdByFilter &&
      !h.createdBy.toLowerCase().includes(historyFilters.createdByFilter.toLowerCase())
    )
      return false;
    if (
      historyFilters.eventTypeFilter !== "Not specified" &&
      h.eventType !== historyFilters.eventTypeFilter
    )
      return false;
    if (historyFilters.quickFilter === "Created by me" && h.createdBy === "System") return false;
    return true;
  });

  useEffect(() => {
    if (editingField) {
      const f = fields.find((fl) => fl.key === editingField);
      setDraftText(f ? String(f.value) : "");
    }
  }, [editingField, fields]);

  if (!isOpen || !log) return null;

  const docCount = getStoredClientDocuments(clientId).length;
  const totalActivityCount = (activity?.length || 0) + liveActivities.length;

  // Combined timeline items for General tab
  const timelineItems = [
    ...liveActivities.map((a) => ({
      id: a.id,
      title: a.details?.primary || "Activity Event",
      subtitle: a.details?.secondary || a.type,
      type: a.type,
      timestamp: formatTimestamp(a.timestamp),
      badge: a.type === "stage_change" || a.type === "stage_update" ? "STAGE PROGRESS" : "ACTIVITY",
    })),
    ...(activity || []).map((a) => ({
      id: a.id,
      title: a.details?.primary || a.title || "Process Update",
      subtitle: a.details?.secondary || a.sourceStepName || a.description || "",
      type: a.type,
      timestamp: a.timestamp || "Today",
      badge: a.type?.includes("stage") ? "STAGE PROGRESS" : "ACTIVITY",
    })),
  ];

  // Default fallback item if empty
  if (timelineItems.length === 0) {
    timelineItems.push({
      id: "init-stage-1",
      title: `Moved to ${log.currentStage} in ${log.process}`,
      subtitle: "Stage progression recorded automatically",
      type: "stage_change",
      timestamp: "10:05 AM",
      badge: "STAGE PROGRESS",
    });
  }

  const filteredTimelineItems = timelineItems.filter((item) => {
    if (timelineFilter === "stages") return item.badge === "STAGE PROGRESS" || item.type?.includes("stage");
    if (timelineFilter === "calls") return item.type?.includes("call");
    if (timelineFilter === "messages")
      return item.type === "whatsapp" || item.type === "sms" || item.type === "email";
    return true;
  });

  return (
    <>
      {/* Backdrop with smooth blur */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
        style={{ zIndex: 500 }}
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div
        className="fixed top-0 right-0 bottom-0 flex justify-end"
        style={{
          zIndex: 501,
          pointerEvents: isTeamMemberDrawerOpen ? "none" : "auto",
        }}
      >
        <div
          className="flex flex-col bg-[#F8FAFC] text-slate-800 shadow-2xl h-screen transition-all duration-300"
          style={{
            width: "68vw",
            minWidth: "780px",
            maxWidth: "1150px",
            animation: "drawerSlideIn 280ms cubic-bezier(0.16, 1, 0.3, 1)",
            overflow: "hidden",
            pointerEvents: "auto",
          }}
        >
          <style>{`
            @keyframes drawerSlideIn {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
            .stage-chevron-active {
              background: #2563eb;
              color: white;
            }
            .stage-chevron-completed {
              background: #0f172a;
              color: #f8fafc;
            }
            .stage-chevron-pending {
              background: #ffffff;
              color: #64748b;
              border: 1px solid #e2e8f0;
            }
          `}</style>

          {/* 1. Header Bar */}
          <div className="flex-shrink-0 bg-white px-7 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
                <Workflow className="w-4 h-4" />
              </div>
              <div>
                <h1
                  className="text-base font-bold text-slate-900 tracking-tight"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Process View
                </h1>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <span>{log.process}</span>
                  <span>•</span>
                  <span className="text-blue-600 font-semibold">{log.currentStage}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenScheduleAppointment && (
                <button
                  onClick={onOpenScheduleAppointment}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" /> Schedule Call
                </button>
              )}
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all cursor-pointer shadow-2xs"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 2. Client & Process Summary Title Box */}
          <div className="flex-shrink-0 bg-white px-7 py-3 border-b border-slate-100">
            <div className="flex items-center justify-between bg-slate-50/70 border border-slate-200/80 rounded-xl px-4 py-2.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                  {clientName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      onClick={() => {
                        onClose();
                        navigate(`/clients/${clientId}`);
                      }}
                      className="text-base font-bold text-slate-900 hover:text-blue-600 cursor-pointer transition-colors"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {clientName}
                    </span>
                    <span className="text-slate-400 font-normal">—</span>
                    <span className="text-sm font-semibold text-slate-700">{log.currentStage}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onClose();
                    navigate(`/clients/${clientId}`);
                  }}
                  className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1 transition-colors"
                >
                  <User className="w-3 h-3 text-slate-400" /> View Profile
                </button>
              </div>
            </div>
          </div>

          {/* 3. Stage Pipeline - Stepper Ribbon */}
          <div className="flex-shrink-0 px-7 py-2.5 bg-white border-b border-slate-200">
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-thin">
              {activeStageList.map((label, i) => {
                const idx = i + 1;
                const isCompleted = idx < effectiveStageIdx;
                const isActive = idx === effectiveStageIdx;

                return (
                  <button
                    key={label}
                    onClick={() => handleStageClick(idx)}
                    className={`flex-1 min-w-[130px] max-w-[200px] h-9 px-3 flex items-center justify-center text-center gap-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-2xs ${isActive
                        ? "bg-blue-600 text-white shadow-blue-500/20"
                        : isCompleted
                          ? "bg-slate-900 text-slate-100 hover:bg-slate-800"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                    title={`Stage ${idx}: ${label}`}
                  >
                    {isCompleted && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Tabs Bar (Overview, History, Documents) */}
          <div className="flex-shrink-0 bg-white px-7 flex border-b border-slate-200 gap-8">
            {(["general", "history", "documents"] as const).map((tab) => {
              const isSelected = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => onTabChange(tab as any)}
                  className={`py-3 text-xs font-semibold transition-all flex items-center gap-2 relative cursor-pointer ${
                    isSelected ? "text-blue-600" : "text-slate-500 hover:text-slate-800"
                  }`}
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {tab === "general" && <FileText className="w-3.5 h-3.5" />}
                  {tab === "history" && <Clock className="w-3.5 h-3.5" />}
                  {tab === "documents" && <FileCheck className="w-3.5 h-3.5" />}

                  <span>
                    {tab === "general"
                      ? "Overview"
                      : tab === "history"
                      ? "History"
                      : "Documents"}
                  </span>

                  {tab === "documents" && (
                    <span
                      className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                        isSelected ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {docCount}
                    </span>
                  )}

                  {/* Active Indicator Underline */}
                  {isSelected && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* 5. Scrollable Tab Content */}
          <div className="flex-1 overflow-y-auto bg-[#F8FAFC]">
            {/* ─────────────────────────────────────────────────────────────
                TAB 1: GENERAL (2-Column Split View)
               ───────────────────────────────────────────────────────────── */}
            {activeTab === "general" && (
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* LEFT COLUMN: Draggable Client Details & Process Information Sections */}
                  <div className="lg:col-span-5 space-y-5">
                    <DraggableOverviewSections
                      mode="process"
                      client={client}
                      log={log}
                      sections={processSections}
                      onSectionsChange={setProcessSections}
                      fieldValues={processFieldValues}
                      onFieldValueChange={onFieldSave}
                      onNavigateToClient={(cId) => {
                        onClose();
                        navigate(`/clients/${cId}`);
                      }}
                      customFieldsModule="process"
                      highlightRequiredKeys={missingFieldKeys}
                    />
                  </div>

                  {/* RIGHT COLUMN: Full-Featured Activity Tab */}
                  <div className="lg:col-span-7">
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                      <ActivityTab
                        activity={activity}
                        onOpenActivity={onOpenActivity}
                        onOpenCallDetail={(callId, entry) => {
                          if (onOpenActivity && entry) onOpenActivity(entry);
                        }}
                        clientId={clientId}
                        clientName={clientName}
                        clientEmail={client?.email}
                        clientPhone={client?.phone}
                        onCloseParentDrawer={onClose}
                        emptyMessage="No activity yet for this process"
                        onOpenScheduleAppointment={onOpenScheduleAppointment}
                      />
                    </div>
                  </div>
                </div>

                {/* Modals for Field Manager */}
                {fieldManagerOpen && fieldManagerMode === "select" && (
                  <SelectFieldsModal
                    initiallySelected={visibleFieldKeys}
                    activeProcessId={matchedProc?.id}
                    activeProcessName={log?.process || matchedProc?.name}
                    processStages={
                      matchedProc?.stages
                        ? matchedProc.stages.map((s) => ({ id: s.name, name: s.name, color: s.color }))
                        : undefined
                    }
                    onClose={onCloseFieldManager}
                    onApply={(keys) => onVisibleFieldKeysChange(keys)}
                  />
                )}

                {fieldManagerOpen && fieldManagerMode === "create" && (
                  <CreateFieldModal
                    lockModule="process"
                    activeProcessId={matchedProc?.id}
                    activeProcessName={log?.process || matchedProc?.name}
                    processStages={
                      matchedProc?.stages
                        ? matchedProc.stages.map((s) => ({ id: s.name, name: s.name, color: s.color }))
                        : undefined
                    }
                    onClose={onCloseFieldManager}
                    onCreated={(newField) => {
                      onVisibleFieldKeysChange([...visibleFieldKeys, newField.key]);
                    }}
                  />
                )}
              </div>
            )}



            {/* ─────────────────────────────────────────────────────────────
                TAB 3: HISTORY
               ───────────────────────────────────────────────────────────── */}
            {activeTab === "history" && (
              <div className="p-6 space-y-4">
                {/* Search and Filters Toolbar */}
                <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex items-center gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search audit trail & history logs..."
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>

                  <button
                    onClick={() =>
                      onHistoryFiltersChange({ showPopup: !historyFilters.showPopup })
                    }
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${historyFilters.filtersActive
                        ? "bg-blue-50 border-blue-200 text-blue-700"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>Filter</span>
                    {historyFilters.filtersActive && (
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                    )}
                  </button>
                </div>

                {/* History Table */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-900 text-white text-[11px] font-semibold uppercase tracking-wider">
                        <th className="px-4 py-3">Date & Time</th>
                        <th className="px-4 py-3">User / Actor</th>
                        <th className="px-4 py-3">Event Type</th>
                        <th className="px-4 py-3">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {filteredHistory.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-10 text-slate-400 italic">
                            No history records found
                          </td>
                        </tr>
                      ) : (
                        filteredHistory.map((h, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-500 whitespace-nowrap">
                              {h.date}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                                  {h.createdBy.charAt(0)}
                                </div>
                                <span className="font-semibold text-slate-800">{h.createdBy}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${h.eventType === "Stage changed"
                                    ? "bg-blue-100 text-blue-700"
                                    : h.eventType === "Activity created"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                              >
                                {h.eventType}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-800">{h.description}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ───────────────────────────────────────────────────────
                TAB 4: DOCUMENTS
               ───────────────────────────────────────────────────────────── */}
            {activeTab === "documents" && (
              <div className="p-6">
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <DocumentsTab
                    client={{
                      id: clientId,
                      name: clientName,
                      email: client?.email || "client@email.com",
                      phone: client?.phone || "—",
                      companyName: client?.companyName,
                      jobPosition: client?.jobPosition,
                      location: client?.location,
                      responsible: client?.responsible || (log as any)?.responsible,
                      status: client?.status || log?.status,
                    }}
                    processName={log?.process}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <RequiredFieldsModal
        isOpen={requiredFieldsModalState.isOpen}
        onClose={() => setRequiredFieldsModalState((p) => ({ ...p, isOpen: false }))}
        clientName={clientName}
        clientId={clientId}
        processName={log?.process || ""}
        targetStageName={requiredFieldsModalState.targetStageName}
        missingFields={requiredFieldsModalState.missingFields}
        allFields={allRegistryProcessFields}
        initialValues={processFieldValues}
        onConfirm={(filledValues) => {
          Object.entries(filledValues).forEach(([k, v]) => {
            onFieldSave?.(k, v);
          });
          onStageChange(requiredFieldsModalState.targetStageIdx);
          setRequiredFieldsModalState((p) => ({ ...p, isOpen: false }));
          toast.success(`Stage moved to ${requiredFieldsModalState.targetStageName} with required fields saved ✓`);
        }}
        zIndex={1000}
      />
    </>
  );
}
