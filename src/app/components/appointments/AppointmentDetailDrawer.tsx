import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  FileText,
  FileCheck,
  DollarSign,
  Plus,
  Search,
  Check,
  CheckCircle,
  AlertCircle,
  CheckCircle2,
  Trash2,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  Eye,
  Layers,
  Sparkles,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  MapPin,
  Video,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { TableComponent, TableColumn } from "../ui/TableComponent";
import DraggableOverviewSections, { OverviewSection } from "../profile/DraggableOverviewSections";
import { ChevronStageRibbon } from "../common/ChevronStageRibbon";
import ActivityTab, { ActivityLogEntry } from "../activity/ActivityTab";
import DocumentsTab from "../profile/DocumentsTab";
import { useInvoices } from "../../context/InvoiceContext";
import InvoiceDetailDrawer from "../invoices/InvoiceDetailDrawer";
import CreateInvoiceDrawer from "../invoices/CreateInvoiceDrawer";
import RecordPaymentModal from "../invoices/RecordPaymentModal";
import CallDetailDrawer from "../telephony/CallDetailDrawer";
import { SelectFieldsModal, CreateFieldModal } from "../help/FieldManager";
import { AdminSectionDrawer } from "../../pages/admin/components/AdminSectionDrawer";
import {
  useFieldRegistry,
  FieldDefinition,
  SectionDefinition,
  SECTION_REGISTRY_EVENT,
  FIELD_REGISTRY_EVENT,
} from "../../context/FieldRegistryContext";
import { useOrganization } from "../../context/OrganizationContext";
import { getStoredProcesses, DEFAULT_ENTITY_PROCESSES, Process, Stage } from "../../../lib/useProcessStore";
import { appointmentService } from "../../../lib/appointmentService";
import { getStoredCallLogs, CallLog } from "../../../lib/processLogsStore";
import { appendActivity, getActivity, subscribeToActivity } from "../../../lib/activityEngine";
import { logStageMove } from "../../../lib/useAutomationStore";
import type { Appointment as ServiceAppointment } from "../../../lib/appointmentService";

export interface AppointmentDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
  onUpdateAppointment?: (updated: any) => void;
  onReschedule?: (appointment: any) => void;
  onMarkComplete?: (id: number | string) => void;
  onDelete?: (id: number | string) => void;
  employees: Array<{ id: number | string; name: string; email?: string; role?: string }>;
  services: Array<{ id: number | string; name: string; duration?: number; price?: number }>;
}

const DEFAULT_APPOINTMENT_SECTIONS: OverviewSection[] = [
  {
    id: "sec-appt-details",
    title: "Appointment Details",
    description: "Date, time, duration, service, and provider assignment",
    iconName: "calendar",
    source: "system",
    module: "appointment",
    fieldKeys: [
      "appointment_date",
      "appointment_time",
      "duration",
      "service",
      "provider",
      "session_type",
      "location",
      "rating",
      "notes",
    ],
  },
  {
    id: "sec-appt-client",
    title: "Client Information",
    description: "Client contact coordinates and identity",
    iconName: "user",
    source: "system",
    module: "appointment",
    fieldKeys: ["client_name", "email", "phone"],
  },
];

export default function AppointmentDetailDrawer({
  isOpen,
  onClose,
  appointment,
  onUpdateAppointment,
  onReschedule,
  onMarkComplete,
  onDelete,
  employees = [],
  services = [],
}: AppointmentDetailDrawerProps) {
  const { activeOrganization } = useOrganization();
  const { getSectionsForOrg, getFieldsForOrg, addCustomSection, updateCustomSection } = useFieldRegistry();
  const { invoices } = useInvoices();

  // Active Tab
  const [activeTab, setActiveTab] = useState<"overview" | "documents" | "invoices" | "calls">("overview");

  // Invoices Sub-drawers & State
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all");
  const [selectedInvoiceForDrawer, setSelectedInvoiceForDrawer] = useState<any>(null);
  const [isInvoiceDrawerOpen, setIsInvoiceDrawerOpen] = useState(false);
  const [isCreateInvoiceDrawerOpen, setIsCreateInvoiceDrawerOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<any>(null);

  // Calls Sub-drawer
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  // Field Management Modals
  const [fieldManagerOpen, setFieldManagerOpen] = useState(false);
  const [fieldManagerMode, setFieldManagerMode] = useState<"select" | "create">("select");
  const [sectionDrawerOpen, setSectionDrawerOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionDefinition | null>(null);

  // Field values
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});

  // Dynamic appointment process and workflow stages
  const appointmentProcess: Process = useMemo(() => {
    const procs = getStoredProcesses();
    const found = procs.find((p) => p.entityType === "appointment");
    return found || DEFAULT_ENTITY_PROCESSES.appointment;
  }, []);

  const stages: Stage[] = useMemo(() => {
    return appointmentProcess.stages || DEFAULT_ENTITY_PROCESSES.appointment.stages;
  }, [appointmentProcess]);

  // Current appointment stage
  const currentStage: Stage = useMemo(() => {
    if (!appointment) return stages[0];
    const match = stages.find(
      (s) =>
        s.id === appointment.currentStageId ||
        s.name.toLowerCase() === (appointment.statusLabel || "").toLowerCase() ||
        s.systemCategory === appointment.status
    );
    return match || stages[0];
  }, [appointment, stages]);

  // Appointment Formatted ID
  const formattedApptId = useMemo(() => {
    if (!appointment) return "APT-0000";
    if (appointment.appointmentId) return appointment.appointmentId;
    const num = Number(appointment.id);
    return !isNaN(num) ? `APT-${num.toString().padStart(4, "0")}` : `APT-${appointment.id}`;
  }, [appointment]);

  // Client identifier for documents/activity
  const effectiveClientId = useMemo(() => {
    if (!appointment) return "APT-0";
    return appointment.clientId || `APT-${appointment.id}`;
  }, [appointment]);

  // Initialize and sync field values when appointment changes
  useEffect(() => {
    if (!appointment) return;
    const providerObj = employees.find((e) => String(e.id) === String(appointment.employeeId));
    const serviceObj = services.find((s) => String(s.id) === String(appointment.serviceId));

    // Load any persisted custom fields for this appointment
    let storedCustom: Record<string, any> = {};
    try {
      const raw = localStorage.getItem(`mantra_appt_fields_${appointment.id}`);
      if (raw) storedCustom = JSON.parse(raw);
    } catch {}

    setFieldValues({
      appointment_date: appointment.date || "",
      appointment_time: appointment.time || "",
      duration: appointment.duration ? `${appointment.duration} mins` : "60 mins",
      service: serviceObj?.name || (appointment.serviceId ? `Service #${appointment.serviceId}` : "General Consultation"),
      provider: providerObj?.name || (appointment.employeeId ? `Staff #${appointment.employeeId}` : "Unassigned"),
      session_type: appointment.sessionType === "inPerson" ? "In-Person" : "Video Consultation",
      location: appointment.location || "Main Clinic",
      rating: appointment.rating ? `${appointment.rating} / 5 ⭐` : "Not Rated",
      notes: appointment.notes || "",
      client_name: appointment.clientName || "",
      email: appointment.clientEmail || "",
      phone: appointment.clientPhone || "",
      status: appointment.status || "scheduled",
      stage: currentStage.name,
      ...storedCustom,
    });
  }, [appointment, employees, services, currentStage]);

  // Sections State
  const storageSectionKey = `mantra_appt_sections_layout`;
  const [appointmentSections, setAppointmentSections] = useState<OverviewSection[]>(() => {
    try {
      const raw = localStorage.getItem(storageSectionKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_APPOINTMENT_SECTIONS;
  });

  // Re-sync sections when custom sections are registered in FieldRegistry
  useEffect(() => {
    const handleSync = () => {
      try {
        const customSecs = getSectionsForOrg("appointment", activeOrganization);
        const storedLayout = localStorage.getItem(storageSectionKey);
        const base = storedLayout ? JSON.parse(storedLayout) : DEFAULT_APPOINTMENT_SECTIONS;

        const merged: OverviewSection[] = [...base];
        customSecs.forEach((cs) => {
          if (!merged.some((m) => m.id === cs.id)) {
            merged.push({
              id: cs.id,
              title: cs.title,
              description: cs.description,
              iconName: cs.iconName as any,
              fieldKeys: cs.fieldKeys || [],
              module: "appointment",
              isCustom: true,
            });
          }
        });
        setAppointmentSections(merged);
      } catch {}
    };

    window.addEventListener(SECTION_REGISTRY_EVENT, handleSync);
    window.addEventListener(FIELD_REGISTRY_EVENT, handleSync);
    return () => {
      window.removeEventListener(SECTION_REGISTRY_EVENT, handleSync);
      window.removeEventListener(FIELD_REGISTRY_EVENT, handleSync);
    };
  }, [getSectionsForOrg, activeOrganization]);

  const handleSectionsChange = (newSections: OverviewSection[]) => {
    setAppointmentSections(newSections);
    try {
      localStorage.setItem(storageSectionKey, JSON.stringify(newSections));
    } catch {}
  };

  const handleFieldValueChange = (key: string, value: any) => {
    setFieldValues((prev) => {
      const updated = { ...prev, [key]: value };
      if (appointment) {
        try {
          localStorage.setItem(`mantra_appt_fields_${appointment.id}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    // If core fields change, bubble update to appointment
    if (appointment && onUpdateAppointment) {
      let patch: any = {};
      if (key === "appointment_date") patch.date = value;
      if (key === "appointment_time") patch.time = value;
      if (key === "notes") patch.notes = value;
      if (key === "client_name") patch.clientName = value;
      if (key === "email") patch.clientEmail = value;
      if (key === "phone") patch.clientPhone = value;

      if (Object.keys(patch).length > 0) {
        const updated = { ...appointment, ...patch };
        onUpdateAppointment(updated);
        appointmentService.saveAppointments(
          appointmentService.getAppointments().map((a) => (a.id === updated.id ? updated : a))
        );
      }
    }
  };

  // Stage Progression Handler
  const handleStageSelect = (targetStage: Stage) => {
    if (!appointment || targetStage.id === currentStage.id) return;

    let newStatus = appointment.status;
    if (targetStage.systemCategory === "completed") newStatus = "completed";
    else if (targetStage.systemCategory === "cancelled") newStatus = "cancelled";
    else if (targetStage.systemCategory === "rescheduled") newStatus = "rescheduled";
    else if (targetStage.systemCategory === "booked") newStatus = "scheduled";

    const updated = {
      ...appointment,
      currentStageId: targetStage.id,
      statusLabel: targetStage.name,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    if (onUpdateAppointment) {
      onUpdateAppointment(updated);
    }
    appointmentService.saveAppointments(
      appointmentService.getAppointments().map((a) => (a.id === updated.id ? updated : a))
    );

    // Log Stage Move
    logStageMove({
      orgId: "default",
      recordType: "appointment",
      recordId: String(appointment.id),
      fromStageId: currentStage.id,
      fromStageName: currentStage.name,
      toStageId: targetStage.id,
      toStageName: targetStage.name,
      processId: appointmentProcess.id,
      processName: appointmentProcess.name,
      cause: {
        type: "manual",
        ruleName: `Stage changed to ${targetStage.name} by user`,
      },
    });

    // Record activity timeline entry
    appendActivity({
      clientId: effectiveClientId,
      processId: appointmentProcess.id,
      processName: appointmentProcess.name,
      type: "stage_change",
      createdBy: "user",
      fromStage: currentStage?.name || "Initial Stage",
      toStage: targetStage.name,
      details: {
        primary: `Moved to stage "${targetStage.name}"`,
        secondary: `Appointment #${formattedApptId} for ${appointment.clientName}`,
      },
    });

    toast.success(`Appointment moved to "${targetStage.name}"`);
  };

  // Activity logs subscription
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  useEffect(() => {
    if (!effectiveClientId) return;
    const load = () => {
      const list = getActivity(effectiveClientId, appointmentProcess.name);
      setActivities(list as any);
    };
    load();
    const unsub = subscribeToActivity(effectiveClientId, load);
    return unsub;
  }, [effectiveClientId, appointmentProcess.name]);

  // Filtered Client Invoices
  const appointmentInvoices = useMemo(() => {
    if (!appointment) return [];
    return invoices.filter((inv) => {
      const matchClient =
        inv.clientId === appointment.clientId ||
        (inv.clientName && inv.clientName.toLowerCase() === appointment.clientName.toLowerCase());
      const matchAppt = inv.appointmentId && String(inv.appointmentId) === String(appointment.id);
      return matchClient || matchAppt;
    });
  }, [invoices, appointment]);

  const filteredInvoices = useMemo(() => {
    return appointmentInvoices.filter((inv) => {
      const search = invoiceSearchQuery.toLowerCase().trim();
      const matchSearch =
        !search ||
        inv.id.toLowerCase().includes(search) ||
        (inv.appointmentTitle && inv.appointmentTitle.toLowerCase().includes(search)) ||
        (inv.lineItems && inv.lineItems.some((li: any) => li.description?.toLowerCase().includes(search)));
      const matchStatus = invoiceStatusFilter === "all" || inv.status === invoiceStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [appointmentInvoices, invoiceSearchQuery, invoiceStatusFilter]);

  const invoiceStats = useMemo(() => {
    const total = appointmentInvoices.filter((i) => i.status !== "void").reduce((sum, i) => sum + i.total, 0);
    const paid = appointmentInvoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.total, 0);
    const outstanding = appointmentInvoices
      .filter((i) => ["sent", "viewed", "overdue"].includes(i.status))
      .reduce((sum, i) => sum + i.total, 0);
    return { total, paid, outstanding };
  }, [appointmentInvoices]);

  // Calls for this client
  const clientCalls: CallLog[] = useMemo(() => {
    if (!appointment) return [];
    const all = getStoredCallLogs();
    const filtered = all.filter((l) => {
      return (
        (appointment.clientId && l.clientId === appointment.clientId) ||
        (l.client && appointment.clientName && l.client.toLowerCase() === appointment.clientName.toLowerCase())
      );
    });
    if (filtered.length > 0) return filtered;

    // Default matching calls for this client so the table has realistic data
    return [
      {
        id: `CALL-${String(appointment.id).padStart(3, "0")}1`,
        client: appointment.clientName,
        clientId: effectiveClientId,
        process: appointmentProcess.name,
        lastStage: "Requested",
        currentStage: currentStage.name,
        type: "Outbound",
        status: "Completed",
        duration: "2:45",
        date: `${appointment.date} 10:15 AM`,
        hasRecording: true,
        hasTranscript: true,
      } as any,
      {
        id: `CALL-${String(appointment.id).padStart(3, "0")}2`,
        client: appointment.clientName,
        clientId: effectiveClientId,
        process: appointmentProcess.name,
        lastStage: "Initial Contact",
        currentStage: currentStage.name,
        type: "Inbound",
        status: "Completed",
        duration: "1:30",
        date: `${appointment.date} 09:30 AM`,
        hasRecording: true,
        hasTranscript: true,
      } as any,
    ];
  }, [appointment, effectiveClientId, appointmentProcess.name, currentStage.name]);

  if (!isOpen || !appointment) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden animate-in slide-in-from-right duration-300">
        {/* ── Top Header (DESIGN.md Light Architectural Standard) ── */}
        <div className="flex-shrink-0 bg-white px-7 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h1
                className="text-base font-bold text-slate-900 tracking-tight"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Appointment View
              </h1>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <span className="font-mono font-semibold text-slate-700">#{formattedApptId}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {onReschedule && (
              <button
                type="button"
                onClick={() => onReschedule(appointment)}
                className="px-3.5 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Reschedule
              </button>
            )}

            {appointment.status !== "completed" && onMarkComplete && (
              <button
                type="button"
                onClick={() => {
                  onMarkComplete(appointment.id);
                  toast.success("Appointment marked as completed");
                }}
                className="px-4 py-1.5 rounded-xl bg-[#1E293B] hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                Mark Done
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Stage Pipeline Bar (Chevron Stage Ribbon identical to Process Tab) ── */}
        <div className="flex-shrink-0 px-7 py-2.5 bg-white border-b border-slate-200">
          <ChevronStageRibbon
            stages={stages.map((s) => ({
              id: s.id,
              name: s.name,
              color: s.color,
              isFinalStage: s.isFinalStage || s.isFinal || s.systemCategory === "completed" || s.systemCategory === "cancelled",
              isFinal: s.isFinal || s.isFinalStage,
              systemCategory: s.systemCategory,
            }))}
            activeStageId={currentStage.id}
            onStageClick={(stg) => {
              const matched = stages.find((s) => String(s.id) === String(stg.id));
              if (matched) handleStageSelect(matched);
            }}
            showAddButton={true}
          />
        </div>

        {/* ── Tabs Bar ── */}
        <div className="flex-shrink-0 bg-white px-6 flex border-b border-slate-200 gap-8">
          {(
            [
              { id: "overview", label: "Overview", icon: <FileText className="w-3.5 h-3.5" /> },
              { id: "documents", label: "Documents", icon: <FileCheck className="w-3.5 h-3.5" />, count: 0 },
              { id: "invoices", label: "Invoices", icon: <DollarSign className="w-3.5 h-3.5" />, count: appointmentInvoices.length },
              { id: "calls", label: "Calls", icon: <Phone className="w-3.5 h-3.5" />, count: clientCalls.length },
            ] as const
          ).map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3.5 text-xs font-semibold transition-all flex items-center gap-2 relative cursor-pointer ${
                  isSelected ? "text-blue-600" : "text-slate-500 hover:text-slate-800"
                }`}
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {typeof (tab as any).count === "number" && (tab as any).count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                      isSelected ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {(tab as any).count}
                  </span>
                )}
                {isSelected && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
              </button>
            );
          })}
        </div>

        {/* ── Scrollable Tab Body ── */}
        <div className="flex-1 overflow-y-auto bg-[#F8FAFC]">
          {/* ─────────────────────────────────────────────────────────────
              TAB 1: OVERVIEW (2-Column Split: Sections on Left, Activity on Right)
             ───────────────────────────────────────────────────────────── */}
          {activeTab === "overview" && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT COLUMN: Draggable Sections & Custom Fields */}
                <div className="lg:col-span-6 space-y-4">

                  <DraggableOverviewSections
                    mode="appointment"
                    customFieldsModule="appointment"
                    sections={appointmentSections}
                    onSectionsChange={handleSectionsChange}
                    fieldValues={fieldValues}
                    onFieldValueChange={handleFieldValueChange}
                    client={{ id: effectiveClientId, name: appointment.clientName, phone: appointment.clientPhone, email: appointment.clientEmail }}
                  />
                </div>

                {/* RIGHT COLUMN: Real-Time Activity Feed */}
                <div className="lg:col-span-6">
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                    <ActivityTab
                      activity={activities}
                      clientId={effectiveClientId}
                      clientName={appointment.clientName}
                      clientEmail={appointment.clientEmail}
                      clientPhone={appointment.clientPhone}
                      onCloseParentDrawer={onClose}
                      emptyMessage="No activity logs yet for this appointment"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 2: DOCUMENTS
             ───────────────────────────────────────────────────────────── */}
          {activeTab === "documents" && (
            <div className="p-6">
              <DocumentsTab
                client={{
                  id: effectiveClientId,
                  name: appointment.clientName || "Client",
                  email: appointment.clientEmail || "",
                  phone: appointment.clientPhone || "",
                }}
                processName={appointmentProcess.name}
              />
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 3: INVOICES
             ───────────────────────────────────────────────────────────── */}
          {activeTab === "invoices" && (
            <div className="p-6 space-y-5">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap flex-1">
                  <div className="relative min-w-[200px] max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search invoice # or description..."
                      value={invoiceSearchQuery}
                      onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>

                  <select
                    value={invoiceStatusFilter}
                    onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="viewed">Viewed</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="void">Void</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsCreateInvoiceDrawerOpen(true)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Create Invoice
                  </button>
                </div>
              </div>

              {/* Stats Strip */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-white border border-slate-200 rounded-xl text-xs shadow-2xs">
                <div>
                  <span className="text-slate-400 font-medium block">Total Invoiced</span>
                  <span className="text-sm font-bold text-slate-900">${invoiceStats.total.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Paid</span>
                  <span className="text-sm font-bold text-emerald-600">${invoiceStats.paid.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Outstanding</span>
                  <span className="text-sm font-bold text-amber-600">${invoiceStats.outstanding.toFixed(2)}</span>
                </div>
              </div>

              {/* Invoices Table Component */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <TableComponent
                  data={filteredInvoices}
                  columns={[
                    {
                      header: "Invoice ID",
                      accessorKey: "id",
                      align: "left",
                      render: (inv: any) => (
                        <button
                          onClick={() => {
                            setSelectedInvoiceForDrawer(inv);
                            setIsInvoiceDrawerOpen(true);
                          }}
                          className="font-bold text-blue-600 hover:underline"
                        >
                          {inv.id}
                        </button>
                      ),
                    },
                    {
                      header: "Title / Service",
                      accessorKey: "appointmentTitle",
                      align: "left",
                      render: (inv: any) => (
                        <span className="font-semibold text-slate-800">
                          {inv.appointmentTitle || inv.lineItems?.[0]?.description || "Consultation Invoice"}
                        </span>
                      ),
                    },
                    {
                      header: "Amount",
                      accessorKey: "total",
                      align: "left",
                      render: (inv: any) => <span className="font-bold text-slate-900">${inv.total.toFixed(2)}</span>,
                    },
                    {
                      header: "Status",
                      accessorKey: "status",
                      align: "left",
                      render: (inv: any) => {
                        const statusColors: Record<string, string> = {
                          paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
                          sent: "bg-blue-50 text-blue-700 border-blue-200",
                          draft: "bg-slate-50 text-slate-700 border-slate-200",
                          overdue: "bg-rose-50 text-rose-700 border-rose-200",
                          viewed: "bg-cyan-50 text-cyan-700 border-cyan-200",
                          void: "bg-slate-100 text-slate-500 border-slate-200",
                        };
                        return (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider ${
                              statusColors[inv.status] || "bg-slate-50 text-slate-700 border-slate-200"
                            }`}
                          >
                            {inv.status}
                          </span>
                        );
                      },
                    },
                    {
                      header: "Due Date",
                      accessorKey: "dueDate",
                      align: "left",
                      render: (inv: any) => <span className="text-slate-600 text-xs">{inv.dueDate || "—"}</span>,
                    },
                  ]}
                  getRowId={(inv: any) => inv.id}
                  emptyMessage="No invoices found for this appointment or client."
                  tableId="appt-invoices-table"
                  rowActions={[
                    {
                      label: "View Details",
                      icon: <ExternalLink className="w-3.5 h-3.5" />,
                      onClick: (inv: any) => {
                        setSelectedInvoiceForDrawer(inv);
                        setIsInvoiceDrawerOpen(true);
                      },
                    },
                    {
                      label: "Collect Payment",
                      icon: <DollarSign className="w-3.5 h-3.5 text-emerald-600" />,
                      onClick: (inv: any) => {
                        setSelectedInvoiceForPayment(inv);
                        setIsRecordPaymentOpen(true);
                      },
                    },
                  ]}
                />
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 4: CALLS
             ───────────────────────────────────────────────────────────── */}
          {activeTab === "calls" && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                  Call History & Recordings ({clientCalls.length})
                </span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <TableComponent
                  data={clientCalls}
                  columns={[
                    {
                      header: "Call ID",
                      accessorKey: "id",
                      align: "left",
                      render: (call: CallLog) => (
                        <button
                          type="button"
                          onClick={() => setSelectedCallId(call.id)}
                          className="hover:underline font-medium cursor-pointer text-[#1A73E8]"
                          style={{ fontFamily: "DM Sans, sans-serif" }}
                        >
                          #{call.id}
                        </button>
                      ),
                    },
                    {
                      header: "Client",
                      accessorKey: "client",
                      align: "left",
                      render: (call: CallLog) => (
                        <div className="flex items-center gap-1.5 font-medium" style={{ fontFamily: "DM Sans, sans-serif" }}>
                          {call.type === "Outbound" ? (
                            <PhoneOutgoing className="w-3.5 h-3.5 text-[#1A73E8] shrink-0" />
                          ) : (
                            <PhoneIncoming className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
                          )}
                          <span className="text-[#1A73E8]">{call.client || appointment.clientName}</span>
                        </div>
                      ),
                    },
                    {
                      header: "Stage",
                      accessorKey: "currentStage",
                      align: "left",
                      render: (call: CallLog) => (
                        <span className="text-xs" style={{ fontFamily: "Outfit, sans-serif" }}>
                          {call.lastStage && call.lastStage !== "N/A" ? (
                            <span className="flex items-center gap-1">
                              <span className="text-[#94A3B8]">{call.lastStage}</span>
                              <span className="text-[#94A3B8]">→</span>
                              <span className="text-[#111827]">{call.currentStage}</span>
                            </span>
                          ) : (
                            <span className="text-[#111827]">{call.currentStage}</span>
                          )}
                        </span>
                      ),
                    },
                    {
                      header: "Status",
                      accessorKey: "status",
                      align: "left",
                      render: (call: CallLog) => (
                        <span
                          className={`inline-block px-2 py-0.5 rounded-none text-[10px] font-semibold whitespace-nowrap ${
                            call.status === "Completed"
                              ? "bg-emerald-50 text-emerald-700"
                              : call.status === "Pending"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          {call.status}
                        </span>
                      ),
                    },
                    {
                      header: "Date & Time",
                      accessorKey: "date",
                      align: "left",
                      render: (call: CallLog) => <span className="text-[#64748B] text-xs">{call.date}</span>,
                    },
                    {
                      header: "Duration",
                      accessorKey: "duration",
                      align: "left",
                      render: (call: CallLog) => (
                        <span className="text-[#64748B] text-xs tabular-nums">{call.duration || "0:00"}</span>
                      ),
                    },
                  ]}
                  getRowId={(call: CallLog) => call.id}
                  emptyMessage="No calls recorded for this client yet."
                  tableId="appt-calls-table"
                  rowActions={[
                    {
                      label: "View",
                      icon: <Eye className="w-3.5 h-3.5" />,
                      onClick: (call: CallLog) => setSelectedCallId(call.id),
                    },
                    {
                      label: "Call",
                      icon: <Phone className="w-3.5 h-3.5" />,
                      onClick: () => toast.info("Call feature initiated"),
                    },
                  ]}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Sub-Modals & Drawers ── */}

      {/* Field Picker Modal */}
      {fieldManagerOpen && fieldManagerMode === "select" && (
        <SelectFieldsModal
          initiallySelected={appointmentSections.flatMap((s) => s.fieldKeys)}
          onClose={() => setFieldManagerOpen(false)}
          onApply={(keys) => {
            const firstSec = appointmentSections[0];
            if (firstSec) {
              const updated = appointmentSections.map((s, idx) =>
                idx === 0 ? { ...s, fieldKeys: Array.from(new Set([...s.fieldKeys, ...keys])) } : s
              );
              handleSectionsChange(updated);
            }
            setFieldManagerOpen(false);
            toast.success("Fields updated in appointment overview");
          }}
        />
      )}

      {/* Create Field Modal */}
      {fieldManagerOpen && fieldManagerMode === "create" && (
        <CreateFieldModal
          lockModule="appointment"
          onClose={() => setFieldManagerOpen(false)}
          onCreated={(newField) => {
            const firstSec = appointmentSections[0];
            if (firstSec) {
              const updated = appointmentSections.map((s, idx) =>
                idx === 0 ? { ...s, fieldKeys: [...s.fieldKeys, newField.key] } : s
              );
              handleSectionsChange(updated);
            }
            setFieldManagerOpen(false);
            toast.success(`Field "${newField.label}" created and added to section`);
          }}
        />
      )}

      {/* Admin Section Drawer */}
      {sectionDrawerOpen && (
        <AdminSectionDrawer
          section={editingSection}
          initialModule="appointment"
          onClose={() => setSectionDrawerOpen(false)}
          onSaved={(newSec) => {
            const customItem: OverviewSection = {
              id: newSec.id,
              title: newSec.title,
              description: newSec.description,
              iconName: newSec.iconName as any,
              fieldKeys: newSec.fieldKeys || [],
              module: "appointment",
              isCustom: true,
            };
            handleSectionsChange([...appointmentSections, customItem]);
            setSectionDrawerOpen(false);
            toast.success(`Section "${newSec.title}" created successfully`);
          }}
        />
      )}

      {/* Invoice Detail Drawer */}
      {isInvoiceDrawerOpen && selectedInvoiceForDrawer && (
        <InvoiceDetailDrawer
          isOpen={isInvoiceDrawerOpen}
          invoice={selectedInvoiceForDrawer}
          onClose={() => {
            setIsInvoiceDrawerOpen(false);
            setSelectedInvoiceForDrawer(null);
          }}
        />
      )}

      {/* Create Invoice Drawer */}
      {isCreateInvoiceDrawerOpen && (
        <CreateInvoiceDrawer
          isOpen={isCreateInvoiceDrawerOpen}
          onClose={() => setIsCreateInvoiceDrawerOpen(false)}
          prefillClientId={appointment.clientId}
          prefillClientName={appointment.clientName}
          prefillAppointmentId={appointment.id}
          prefillAppointmentTitle={`Consultation - ${appointment.clientName}`}
        />
      )}

      {/* Record Payment Modal */}
      {isRecordPaymentOpen && selectedInvoiceForPayment && (
        <RecordPaymentModal
          isOpen={isRecordPaymentOpen}
          clientId={selectedInvoiceForPayment.clientId}
          clientName={selectedInvoiceForPayment.clientName}
          preSelectedInvoiceId={selectedInvoiceForPayment.id}
          onClose={() => {
            setIsRecordPaymentOpen(false);
            setSelectedInvoiceForPayment(null);
          }}
        />
      )}

      {/* Call Detail Drawer */}
      {selectedCallId && (
        <CallDetailDrawer
          isOpen={Boolean(selectedCallId)}
          onClose={() => setSelectedCallId(null)}
          callId={selectedCallId}
          callLogs={clientCalls}
          onSelectCallId={(targetId) => setSelectedCallId(targetId)}
        />
      )}
    </div>
  );
}
