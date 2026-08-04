import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { SelectFieldsModal, CreateFieldModal } from "../help/FieldManager";
import ActivityTab, { ActivityLogEntry, ActivityType } from "../activity/ActivityTab";
import { FieldDefinition } from "../../context/FieldRegistryContext";
import { getStoredProcesses } from "../../../lib/useProcessStore";

export const dealStageLabels = ["New", "Can't Contact", "Follow-up Later", "Interested", "Close Deal"];

export const getDealStageIndex = (stageName: string): number => {
  const index = dealStageLabels.findIndex(label => label === stageName);
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
  client: Client | undefined;        // mockClients[log.clientId], resolved by parent

  activeTab: "general" | "activity" | "history";
  onTabChange: (tab: "general" | "activity" | "history") => void;

  activity?: ActivityLogEntry[];
  onOpenActivity?: (entry: ActivityLogEntry) => void;

  // Stage pipeline
  stageIdx: number;                  // drawerStageIdx
  onStageChange: (idx: number) => void;   // must update BOTH callLogs and deals in the parent, same as today

  // General tab — field rows
  visibleFieldKeys: string[];        // drawerVisibleFields
  onVisibleFieldKeysChange: (keys: string[]) => void;
  editedValues: Record<string, string>;
  editingField: string | null;
  onStartEditingField: (key: string | null) => void;
  onFieldSave: (key: string, value: string) => void;

  showResponsibleDropdown: boolean;
  onToggleResponsibleDropdown: (open: boolean) => void;
  onOpenTeamMember: (personName: string) => void;   // triggers parent's TeamMemberDrawer
  isTeamMemberDrawerOpen: boolean;   // for the pointer-events:none behavior on this drawer

  fieldManagerOpen: boolean;
  fieldManagerMode: "select" | "create";
  onOpenFieldManager: (mode: "select" | "create") => void;
  onCloseFieldManager: () => void;

  teamMembersData: TeamMember[];
  dealFields: FieldDefinition[];     // getAllFields("deal")

  // History tab
  historyFilters: ProcessDetailHistoryFilterState;
  onHistoryFiltersChange: (patch: Partial<ProcessDetailHistoryFilterState>) => void;

  /** Bubbled from parent — opens ScheduleAppointmentDrawer for the Appointment action panel */
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

  const mockHistory = [
    {
      date: "26.05.2024 14:32",
      createdBy: client?.responsible || "System",
      eventType: "Stage changed" as const,
      description: `New → ${dealStageLabels[stageIdx - 1]}`,
    },
    {
      date: "25.05.2024 10:15",
      createdBy: client?.responsible || "System",
      eventType: "Activity created" as const,
      description: "Contact customer: Call for update",
    },
    { date: "24.05.2024 09:00", createdBy: "System", eventType: "View" as const, description: "" },
    {
      date: "23.05.2024 16:45",
      createdBy: client?.responsible || "System",
      eventType: "Stage changed" as const,
      description: `New → Can't Contact`,
    },
    { date: "22.05.2024 11:20", createdBy: "System", eventType: "View" as const, description: "" },
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

  const fields = dealFields
    .filter((f) => visibleFieldKeys.includes(f.key))
    .map((f) => {
      let val = "";
      if (editedValues[f.key] !== undefined) {
        val = editedValues[f.key];
      } else if (log && (log as any)[f.key] !== undefined && (log as any)[f.key] !== null && (log as any)[f.key] !== "") {
        val = (log as any)[f.key];
      } else {
        if (f.key === "client_name") val = log?.client || "—";
        else if (f.key === "responsible") val = client?.responsible || "Unassigned";
        else if (f.key === "deal_type") val = "Organic";
        else if (f.key === "source") val = (client as any)?.source || (client?.email ? client.email.split("@")[1] || "—" : "whatsapp");
        else if (f.key === "start_date")
          val = log?.date
            ? new Date(log.date).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })
            : "—";
        else if (f.key === "end_date") val = "—";
        else if (f.key === "email_id") val = client?.email || "—";
        else if (f.key === "country_code") val = client?.countryCode || "—";
        else if (f.key === "country") val = client?.country || "—";
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

  useEffect(() => {
    if (editingField) {
      const f = fields.find((fl) => fl.key === editingField);
      setDraftText(f ? String(f.value) : "");
    }
  }, [editingField, fields]);

  if (!isOpen || !log) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        style={{ backgroundColor: "rgba(0,0,0,0.45)", zIndex: 500 }}
        onClick={onClose}
      />
      {/* Right Side Drawer */}
      <div
        className="fixed top-0 right-0 bottom-0"
        style={{ zIndex: 501, pointerEvents: isTeamMemberDrawerOpen ? "none" : "auto" }}
      >
        <div
          className="flex flex-col bg-white"
          style={{
            width: "600px",
            height: "100vh",
            borderRadius: "16px 0 0 16px",
            boxShadow: "-8px 0 40px rgba(0,0,0,0.18)",
            animation: "slideInDrawer 300ms ease-out",
            overflow: "hidden",
            pointerEvents: "auto",
          }}
        >
          <style>{`
            @keyframes slideInDrawer {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          `}</style>

          {/* Header */}
          <div className="flex-shrink-0 px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2
                  className="text-lg font-bold"
                  style={{ color: "#212121", fontFamily: "DM Sans, sans-serif" }}
                >
                  {log.client}
                </h2>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                  <span>Process: <strong className="text-gray-700">{log.process}</strong></span>
                  <span>•</span>
                  <span>Stage: <strong className="text-gray-700">{log.currentStage}</strong></span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Stage Pipeline - Rectangular Chips */}
          <div className="flex-shrink-0 px-6 py-4" style={{ backgroundColor: "#F5F7FA" }}>
            <div className="flex items-center gap-0 overflow-x-auto">
              {(() => {
                const storedProcesses = getStoredProcesses();
                const matchedProc = storedProcesses.find(
                  (p) => p.name === log.process || p.name.toLowerCase() === log.process.toLowerCase()
                );
                const activeStageList = matchedProc ? matchedProc.stages.map((s) => s.name) : dealStageLabels;
                const matchedIdx = activeStageList.findIndex(
                  (s) => s.toLowerCase() === log.currentStage.toLowerCase()
                );
                const effectiveStageIdx = matchedIdx >= 0 ? matchedIdx + 1 : stageIdx;

                return activeStageList.map((label, i) => {
                  const idx = i + 1;
                  const isCompleted = idx < effectiveStageIdx;
                  const isActive = idx === effectiveStageIdx;
                  const isFirst = i === 0;
                  const isLast = i === activeStageList.length - 1;

                  return (
                    <button
                      key={label}
                      onClick={() => onStageChange(idx)}
                      className="flex-1 min-w-[100px] flex items-center justify-center px-2 text-center transition-all hover:opacity-90"
                      style={{
                        height: "40px",
                        backgroundColor: isCompleted || isActive ? "#1E88E5" : "transparent",
                        color: isCompleted || isActive ? "#FFFFFF" : "#9E9E9E",
                        fontSize: "12px",
                        fontWeight: isActive ? 600 : 500,
                        fontFamily: "Outfit, sans-serif",
                        borderRadius: isFirst ? "8px 0 0 8px" : isLast ? "0 8px 8px 0" : "0",
                        border: isCompleted || isActive ? "none" : "1px solid #E8ECF0",
                        cursor: "pointer",
                      }}
                    >
                      {isCompleted && "✓ "}
                      {label}
                    </button>
                  );
                });
              })()}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex-shrink-0 flex border-b border-gray-200 px-6">
            {(["general", "activity", "history"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className="py-3 mr-6 text-sm font-medium transition-colors"
                style={{
                  color: activeTab === tab ? "#1E88E5" : "#9E9E9E",
                  borderBottom: activeTab === tab ? "2px solid #1E88E5" : "2px solid transparent",
                  fontFamily: "Outfit, sans-serif",
                }}
              >
                {tab === "general"
                  ? "General Information"
                  : tab === "activity"
                    ? "Activity"
                    : "History"}
              </button>
            ))}
          </div>

          {/* Tab content — scrollable */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "general" && (
              <div>
                {fields.map((f, i) => {
                  const currentValue = f.value;
                  const isEditing = editingField === f.key;

                  return (
                    <div
                      key={f.key}
                      className="flex items-center px-6"
                      style={{
                        height: "44px",
                        backgroundColor: i % 2 === 0 ? "#fff" : "#FAFAFA",
                        borderBottom: "1px solid #F0F0F0",
                      }}
                    >
                      <div
                        style={{
                          width: "35%",
                          fontSize: "13px",
                          color: "#757575",
                          fontFamily: "Outfit, sans-serif",
                        }}
                      >
                        {f.label}
                      </div>
                      <div
                        style={{
                          width: "65%",
                          fontSize: "14px",
                          color: "#212121",
                          fontFamily: "DM Sans, sans-serif",
                        }}
                      >
                        {/* Client Name */}
                        {f.key === "client_name" ? (
                          <span
                            className="text-blue-600 text-left font-medium"
                            style={{ fontFamily: "DM Sans, sans-serif" }}
                          >
                            {currentValue}
                          </span>
                        ) : /* Responsible */
                          f.key === "responsible" ? (
                            <div className="flex items-center gap-2 relative">
                              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700">
                                {(currentValue as string).charAt(0)}
                              </div>
                              <button
                                onClick={() => onOpenTeamMember(currentValue as string)}
                                className="hover:text-blue-600 hover:underline transition-colors"
                                style={{ fontFamily: "DM Sans, sans-serif" }}
                              >
                                <span>{currentValue}</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleResponsibleDropdown(!showResponsibleDropdown);
                                }}
                                className="hover:bg-gray-100 rounded p-0.5 transition-colors"
                              >
                                <ChevronDown className="w-3 h-3 text-gray-400" />
                              </button>
                              {showResponsibleDropdown && (
                                <>
                                  <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => onToggleResponsibleDropdown(false)}
                                  />
                                  <div className="absolute left-0 top-full mt-1 z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-2 w-56">
                                    {[
                                      "John Smith",
                                      "Emily Davis",
                                      "Michael Chen",
                                      "Sarah Johnson",
                                      "Robert Wilson",
                                    ].map((person) => (
                                      <button
                                        key={person}
                                        onClick={() => {
                                          onFieldSave(f.key, person);
                                          onToggleResponsibleDropdown(false);
                                        }}
                                        className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center gap-2"
                                      >
                                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700">
                                          {person.charAt(0)}
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="text-sm font-medium">{person}</span>
                                          <span className="text-xs text-gray-500">Team Member</span>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          ) : /* Select Fields */
                            f.type === "dropdown" ? (
                              <select
                                value={currentValue}
                                onChange={(e) => onFieldSave(f.key, e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded-lg hover:border-blue-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                style={{ fontFamily: "DM Sans, sans-serif", backgroundColor: "white" }}
                              >
                                {f.key === "deal_type" && (
                                  <>
                                    <option>Organic</option>
                                    <option>Paid</option>
                                    <option>Referral</option>
                                    <option>Web</option>
                                  </>
                                )}
                                {f.key === "country_code" && (
                                  <>
                                    <option>+1</option>
                                    <option>+44</option>
                                    <option>+91</option>
                                    <option>+971</option>
                                  </>
                                )}
                                {f.key === "country" && (
                                  <>
                                    <option>US</option>
                                    <option>GB</option>
                                    <option>IN</option>
                                    <option>AE</option>
                                  </>
                                )}
                                {f.key === "time_slot" && (
                                  <>
                                    <option>8AM – 8PM</option>
                                    <option>9AM – 5PM</option>
                                    <option>10AM – 6PM</option>
                                    <option>24/7</option>
                                  </>
                                )}
                                {f.key !== "deal_type" &&
                                  f.key !== "country_code" &&
                                  f.key !== "country" &&
                                  f.key !== "time_slot" && (
                                    <>
                                      <option value="">Select option</option>
                                      <option value="Option 1">Option 1</option>
                                      <option value="Option 2">Option 2</option>
                                    </>
                                  )}
                              </select>
                            ) : /* Date fields */
                              f.type === "date" ? (
                                <input
                                  type="date"
                                  value={
                                    currentValue
                                      ? (() => {
                                        const d = new Date(currentValue);
                                        return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
                                      })()
                                      : ""
                                  }
                                  onChange={(e) => {
                                    const d = new Date(e.target.value);
                                    const formatted =
                                      e.target.value && !isNaN(d.getTime())
                                        ? d.toLocaleDateString("en-US", {
                                          month: "long",
                                          day: "numeric",
                                          year: "numeric",
                                        })
                                        : "";
                                    onFieldSave(f.key, formatted);
                                  }}
                                  className="px-2 py-1 border border-gray-300 rounded-lg hover:border-blue-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                  style={{ fontFamily: "DM Sans, sans-serif" }}
                                />
                              ) : /* Text Fields (inline editable) */
                                isEditing ? (
                                  <input
                                    type="text"
                                    value={draftText}
                                    onChange={(e) => setDraftText(e.target.value)}
                                    onBlur={() => onFieldSave(f.key, draftText)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        onFieldSave(f.key, draftText);
                                      }
                                      if (e.key === "Escape") {
                                        onStartEditingField(null);
                                      }
                                    }}
                                    autoFocus
                                    className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    style={{ fontFamily: "DM Sans, sans-serif" }}
                                  />
                                ) : (
                                  <div
                                    onClick={() => onStartEditingField(f.key)}
                                    className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                  >
                                    {currentValue || "—"}
                                  </div>
                                )}
                      </div>
                    </div>
                  );
                })}

                {/* Select Fields + Create Field grouped together */}
                <div style={{ borderTop: "1px solid #F0F0F0" }}>
                  <div className="flex items-center px-6" style={{ height: "44px", gap: "8px" }}>
                    <button
                      onClick={() => onOpenFieldManager("select")}
                      className="flex items-center gap-2 transition-colors cursor-pointer group"
                      style={{ color: "#9E9E9E", fontSize: "13px", fontFamily: "Outfit, sans-serif" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#1E88E5")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#9E9E9E")}
                    >
                      <SettingsIcon className="w-3.5 h-3.5" /> Select fields
                    </button>
                    <button
                      onClick={() => onOpenFieldManager("create")}
                      className="flex items-center gap-2 transition-colors cursor-pointer"
                      style={{ color: "#9E9E9E", fontSize: "13px", fontFamily: "Outfit, sans-serif" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#1E88E5")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#9E9E9E")}
                    >
                      + Create field
                    </button>
                  </div>
                </div>

                {fieldManagerOpen && fieldManagerMode === "select" && (
                  <SelectFieldsModal
                    onlyModules={["process", "client"]}
                    initiallySelected={visibleFieldKeys}
                    onClose={onCloseFieldManager}
                    onApply={(keys) => {
                      onVisibleFieldKeysChange(keys);
                    }}
                  />
                )}

                {fieldManagerOpen && fieldManagerMode === "create" && (
                  <CreateFieldModal
                    lockModule="process"
                    onClose={onCloseFieldManager}
                    onCreated={(newField) => {
                      onVisibleFieldKeysChange([...visibleFieldKeys, newField.key]);
                    }}
                  />
                )}
              </div>
            )}

            {activeTab === "activity" && (
              <div className="relative p-4">
                <ActivityTab
                  activity={activity}
                  onOpenActivity={onOpenActivity}
                  onOpenCallDetail={(callId, entry) => {
                    if (onOpenActivity && entry) {
                      onOpenActivity(entry);
                    }
                  }}
                  clientId={log?.clientId ? String(log.clientId) : client?.id ? String(client.id) : "CL-001"}
                  clientName={client?.name}
                  clientEmail={client?.email}
                  clientPhone={client?.phone}
                  onCloseParentDrawer={onClose}
                  emptyMessage="No activity yet for this process"
                  onOpenScheduleAppointment={onOpenScheduleAppointment}
                />
              </div>
            )}

            {activeTab === "history" && (
              <div>
                {/* Search bar + Filter icon */}
                <div className="flex items-center gap-2 px-4 py-3 relative">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search history..."
                      className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      style={{
                        fontFamily: "Outfit, sans-serif",
                        borderColor: "#E0E0E0",
                        borderRadius: "8px",
                        height: "36px",
                      }}
                    />
                  </div>
                  <div className="relative">
                    <button
                      onClick={() =>
                        onHistoryFiltersChange({ showPopup: !historyFilters.showPopup })
                      }
                      className="w-9 h-9 flex items-center justify-center border rounded-lg transition-colors hover:bg-[#F0F4FF]"
                      style={{ borderColor: "#E0E0E0", borderRadius: "8px" }}
                    >
                      <Filter
                        className="w-[18px] h-[18px]"
                        style={{ color: historyFilters.showPopup ? "#1E88E5" : "#757575" }}
                      />
                    </button>
                    {historyFilters.filtersActive && (
                      <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                  {historyFilters.showPopup && (
                    <>
                      <div
                        className="fixed inset-0"
                        style={{ zIndex: 590 }}
                        onClick={() => onHistoryFiltersChange({ showPopup: false })}
                      />
                      <div
                        className="absolute right-0 bg-white border border-gray-200"
                        style={{
                          zIndex: 600,
                          width: "600px",
                          top: "calc(100% + 4px)",
                          borderRadius: "8px",
                        }}
                      >
                        {/* Two Column Layout */}
                        <div className="flex">
                          {/* Left Column - Quick Filters */}
                          <div
                            className="flex flex-col border-r border-gray-200"
                            style={{ width: "180px" }}
                          >
                            <div className="p-4 border-b border-gray-200">
                              <p
                                className="font-bold text-sm"
                                style={{ color: "#212121", fontFamily: "DM Sans, sans-serif" }}
                              >
                                Filter
                              </p>
                            </div>
                            <div className="flex-1 p-2">
                              <div className="space-y-0.5">
                                {["Created by me", "Created Today", "Created Yesterday"].map((q) => (
                                  <button
                                    key={q}
                                    onClick={() =>
                                      onHistoryFiltersChange({
                                        quickFilter: historyFilters.quickFilter === q ? null : q,
                                      })
                                    }
                                    className="block w-full text-left px-3 py-2 rounded text-sm transition-colors"
                                    style={{
                                      fontFamily: "Outfit, sans-serif",
                                      backgroundColor:
                                        historyFilters.quickFilter === q ? "#EBF4FF" : "transparent",
                                      color: historyFilters.quickFilter === q ? "#1E88E5" : "#424242",
                                    }}
                                  >
                                    {q}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="p-3 border-t border-gray-200">
                              <button
                                className="flex items-center gap-2 text-xs text-blue-500 hover:text-blue-600"
                                style={{ fontFamily: "Outfit, sans-serif" }}
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Save filter
                                <SettingsIcon className="w-3.5 h-3.5 ml-auto" />
                              </button>
                            </div>
                          </div>

                          {/* Right Column - Filter Fields */}
                          <div className="flex-1 flex flex-col">
                            <div className="flex-1 p-4 space-y-3 max-h-[400px] overflow-y-auto">
                              {/* Event Type */}
                              {historyFilters.activeFilterFields.includes("Event Type") && (
                                <div>
                                  <p
                                    className="text-xs font-semibold mb-1.5"
                                    style={{ color: "#9E9E9E", fontFamily: "Outfit, sans-serif" }}
                                  >
                                    Event Type
                                  </p>
                                  <select
                                    value={historyFilters.eventTypeFilter}
                                    onChange={(e) =>
                                      onHistoryFiltersChange({ eventTypeFilter: e.target.value })
                                    }
                                    className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                                    style={{ fontFamily: "Outfit, sans-serif" }}
                                  >
                                    {[
                                      "Not specified",
                                      "View",
                                      "Stage changed",
                                      "Activity created",
                                    ].map((o) => (
                                      <option key={o}>{o}</option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {/* Created By */}
                              {historyFilters.activeFilterFields.includes("Created By") && (
                                <div>
                                  <p
                                    className="text-xs font-semibold mb-1.5"
                                    style={{ color: "#9E9E9E", fontFamily: "Outfit, sans-serif" }}
                                  >
                                    Created By
                                  </p>
                                  <input
                                    type="text"
                                    value={historyFilters.createdByFilter}
                                    onChange={(e) =>
                                      onHistoryFiltersChange({ createdByFilter: e.target.value })
                                    }
                                    className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                                    style={{ fontFamily: "Outfit, sans-serif" }}
                                    placeholder="Enter name..."
                                  />
                                </div>
                              )}

                              {/* Date */}
                              {historyFilters.activeFilterFields.includes("Date") && (
                                <div>
                                  <p
                                    className="text-xs font-semibold mb-1.5"
                                    style={{ color: "#9E9E9E", fontFamily: "Outfit, sans-serif" }}
                                  >
                                    Date
                                  </p>
                                  <select
                                    value={historyFilters.dateFilter}
                                    onChange={(e) =>
                                      onHistoryFiltersChange({ dateFilter: e.target.value })
                                    }
                                    className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                                    style={{ fontFamily: "Outfit, sans-serif" }}
                                  >
                                    {[
                                      "Any date",
                                      "Today",
                                      "Yesterday",
                                      "Last 7 days",
                                      "Last 30 days",
                                      "Custom range",
                                    ].map((o) => (
                                      <option key={o}>{o}</option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {/* Stage */}
                              {historyFilters.activeFilterFields.includes("Stage") && (
                                <div>
                                  <p
                                    className="text-xs font-semibold mb-1.5"
                                    style={{ color: "#9E9E9E", fontFamily: "Outfit, sans-serif" }}
                                  >
                                    Stage
                                  </p>
                                  <select
                                    className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                                    style={{ fontFamily: "Outfit, sans-serif" }}
                                  >
                                    <option>Not specified</option>
                                    <option>Initial Contact</option>
                                    <option>Qualification</option>
                                    <option>Proposal</option>
                                  </select>
                                </div>
                              )}

                              {/* Responsible */}
                              {historyFilters.activeFilterFields.includes("Responsible") && (
                                <div>
                                  <p
                                    className="text-xs font-semibold mb-1.5"
                                    style={{ color: "#9E9E9E", fontFamily: "Outfit, sans-serif" }}
                                  >
                                    Responsible
                                  </p>
                                  <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                                    style={{ fontFamily: "Outfit, sans-serif" }}
                                    placeholder="Enter name..."
                                  />
                                </div>
                              )}
                            </div>

                            {/* Add field / Restore default */}
                            <div className="px-4 py-2 border-t border-gray-200 flex items-center gap-3">
                              <button
                                onClick={() => onHistoryFiltersChange({ showAddFieldPopup: true })}
                                className="text-xs text-blue-500 hover:text-blue-600"
                                style={{ fontFamily: "Outfit, sans-serif" }}
                              >
                                Add field
                              </button>
                              <button
                                onClick={() =>
                                  onHistoryFiltersChange({
                                    activeFilterFields: ["Event Type", "Created By", "Date"],
                                    eventTypeFilter: "Not specified",
                                    createdByFilter: "",
                                    dateFilter: "Any date",
                                  })
                                }
                                className="text-xs text-gray-400 hover:text-gray-600"
                                style={{ fontFamily: "Outfit, sans-serif" }}
                              >
                                Restore default fields
                              </button>
                            </div>

                            {/* Footer - Search and Reset */}
                            <div className="p-4 border-t border-gray-200 flex gap-2">
                              <button
                                onClick={() =>
                                  onHistoryFiltersChange({
                                    filtersActive:
                                      historyFilters.quickFilter !== null ||
                                      historyFilters.eventTypeFilter !== "Not specified" ||
                                      !!historyFilters.createdByFilter ||
                                      historyFilters.dateFilter !== "Any date",
                                    showPopup: false,
                                  })
                                }
                                className="px-4 py-2 rounded text-sm font-medium text-white flex items-center justify-center gap-1.5"
                                style={{ backgroundColor: "#1E88E5", fontFamily: "Outfit, sans-serif" }}
                              >
                                <Search className="w-3.5 h-3.5" /> Search
                              </button>
                              <button
                                onClick={() =>
                                  onHistoryFiltersChange({
                                    eventTypeFilter: "Not specified",
                                    createdByFilter: "",
                                    dateFilter: "Any date",
                                    quickFilter: null,
                                    filtersActive: false,
                                    showPopup: false,
                                    activeFilterFields: ["Event Type", "Created By", "Date"],
                                  })
                                }
                                className="px-4 py-2 rounded text-sm font-medium border border-gray-300 hover:bg-gray-50"
                                style={{ color: "#757575", fontFamily: "Outfit, sans-serif" }}
                              >
                                Reset
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Add Field Sub-Popup */}
                        {historyFilters.showAddFieldPopup && (
                          <>
                            <div
                              className="absolute inset-0 bg-black/20"
                              style={{ zIndex: 610, borderRadius: "8px" }}
                              onClick={() => onHistoryFiltersChange({ showAddFieldPopup: false })}
                            />
                            <div
                              className="absolute bg-white border border-gray-300 shadow-lg"
                              style={{
                                zIndex: 620,
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -50%)",
                                width: "320px",
                                borderRadius: "8px",
                              }}
                            >
                              <div className="p-4 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                  <p
                                    className="font-bold text-sm"
                                    style={{ color: "#212121", fontFamily: "DM Sans, sans-serif" }}
                                  >
                                    Filter field settings
                                  </p>
                                  <button
                                    onClick={() =>
                                      onHistoryFiltersChange({ showAddFieldPopup: false })
                                    }
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
                                {["Event Type", "Created By", "Date", "Stage", "Responsible"].map(
                                  (field) => (
                                    <label
                                      key={field}
                                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={historyFilters.selectedAddFields.includes(field)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            onHistoryFiltersChange({
                                              selectedAddFields: [
                                                ...historyFilters.selectedAddFields,
                                                field,
                                              ],
                                            });
                                          } else {
                                            onHistoryFiltersChange({
                                              selectedAddFields:
                                                historyFilters.selectedAddFields.filter(
                                                  (f) => f !== field
                                                ),
                                            });
                                          }
                                        }}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                                      />
                                      <span
                                        className="text-sm"
                                        style={{ fontFamily: "Outfit, sans-serif", color: "#424242" }}
                                      >
                                        {field}
                                      </span>
                                    </label>
                                  )
                                )}
                              </div>
                              <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                                <button
                                  onClick={() =>
                                    onHistoryFiltersChange({
                                      selectedAddFields: [
                                        "Event Type",
                                        "Created By",
                                        "Date",
                                        "Stage",
                                        "Responsible",
                                      ],
                                    })
                                  }
                                  className="text-sm text-blue-500 hover:text-blue-600"
                                  style={{ fontFamily: "Outfit, sans-serif" }}
                                >
                                  Select all
                                </button>
                                <button
                                  onClick={() => {
                                    onHistoryFiltersChange({
                                      selectedAddFields: ["Event Type", "Created By", "Date"],
                                      activeFilterFields: ["Event Type", "Created By", "Date"],
                                      showAddFieldPopup: false,
                                    });
                                  }}
                                  className="text-sm text-gray-500 hover:text-gray-700"
                                  style={{ fontFamily: "Outfit, sans-serif" }}
                                >
                                  Default
                                </button>
                              </div>
                              <div className="p-3 border-t border-gray-200">
                                <button
                                  onClick={() => {
                                    onHistoryFiltersChange({
                                      activeFilterFields: [...historyFilters.selectedAddFields],
                                      showAddFieldPopup: false,
                                    });
                                  }}
                                  className="w-full py-2 rounded text-sm font-medium text-white"
                                  style={{
                                    backgroundColor: "#1E88E5",
                                    fontFamily: "Outfit, sans-serif",
                                  }}
                                >
                                  Apply
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: "#1A2B4A", height: "44px" }}>
                      <th style={{ width: "40px" }} className="px-4">
                        <input type="checkbox" className="w-4 h-4" />
                      </th>
                      <th
                        className="px-4 text-left text-xs font-semibold uppercase tracking-wider text-white"
                        style={{ width: "110px" }}
                      >
                        Date
                      </th>
                      <th
                        className="px-4 text-left text-xs font-semibold uppercase tracking-wider text-white"
                        style={{ width: "70px" }}
                      >
                        Time
                      </th>
                      <th
                        className="px-4 text-left text-xs font-semibold uppercase tracking-wider text-white"
                        style={{ width: "150px" }}
                      >
                        Created By
                      </th>
                      <th
                        className="px-4 text-left text-xs font-semibold uppercase tracking-wider text-white"
                        style={{ width: "150px" }}
                      >
                        Event Type
                      </th>
                      <th className="px-4 text-left text-xs font-semibold uppercase tracking-wider text-white">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-gray-400 italic text-sm">
                          {historyFilters.filtersActive
                            ? "No results found"
                            : "No history available yet"}
                        </td>
                      </tr>
                    ) : (
                      filteredHistory.map((h, i) => (
                        <tr
                          key={i}
                          style={{
                            height: "40px",
                            backgroundColor: i % 2 === 0 ? "#fff" : "#FAFAFA",
                            borderBottom: "1px solid #EEEEEE",
                          }}
                          className="hover:bg-[#F5F8FF] transition-colors"
                        >
                          <td className="px-4">
                            <input type="checkbox" className="w-4 h-4" />
                          </td>
                          <td
                            className="px-4 text-xs"
                            style={{ color: "#757575", fontFamily: "Outfit, sans-serif" }}
                          >
                            {h.date.split(" ")[0]}
                          </td>
                          <td
                            className="px-4 text-xs"
                            style={{ color: "#757575", fontFamily: "Outfit, sans-serif" }}
                          >
                            {h.date.split(" ")[1]}
                          </td>
                          <td className="px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                                {h.createdBy.charAt(0)}
                              </div>
                              <span
                                className="text-sm"
                                style={{ fontFamily: "DM Sans, sans-serif", color: "#212121" }}
                              >
                                {h.createdBy}
                              </span>
                            </div>
                          </td>
                          <td
                            className="px-4 text-sm"
                            style={{
                              fontFamily: "Outfit, sans-serif",
                              color:
                                h.eventType === "View"
                                  ? "#9E9E9E"
                                  : h.eventType === "Stage changed"
                                    ? "#1E88E5"
                                    : "#2E7D32",
                            }}
                          >
                            {h.eventType}
                          </td>
                          <td
                            className="px-4 text-sm"
                            style={{ fontFamily: "DM Sans, sans-serif", color: "#424242" }}
                          >
                            {h.description}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
