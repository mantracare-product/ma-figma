import { useState, useEffect, useMemo } from "react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { CustomSideDrawer } from "../components/ui/drawer";
import { toast } from "sonner";
import { HowItWorksModal, HowItWorksButton } from "../components/help/HowItWorksModal";
import { InfoTooltip } from "../components/help/InfoTooltip";
import {
  Calendar as CalendarIcon,
  Plus,
  Edit,
  Trash2,
  Search,
  Clock,
  User,
  Phone,
  Mail,
  Package,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  LayoutGrid,
  List,
  CalendarClock,
  Check,
  Settings,
  Mic,
} from "lucide-react";
import NewConsultationDrawer from "../components/scribe/NewConsultationDrawer";
import { appointmentService, hasAppointmentAutomation, Appointment } from "../../lib/appointmentService";
import { hasInvoiceAutomation, hasAppointmentInvoiceAutomation } from "../../lib/invoiceService";
import { DEFAULT_ENTITY_PROCESSES, getStoredProcesses, Process, Stage, isProcessMatchingOrg, PROCESS_STORE_EVENT } from "../../lib/useProcessStore";
import { AUTOMATION_STORE_EVENT } from "../../lib/useAutomationStore";
import { useOrganization } from "../context/OrganizationContext";
import { appendActivity } from "../../lib/activityEngine";
import { logStageMove } from "../../lib/useAutomationStore";
import PageHeader from "../components/layout/PageHeader";
import PageTopBar from "../components/layout/PageTopBar";
import { DataExportModal } from "../components/common/DataExportModal";

import TableComponent, { TableColumn, TableRowAction } from "../components/ui/TableComponent";
import AppointmentDetailDrawer from "../components/appointments/AppointmentDetailDrawer";
import AppointmentCard from "../components/appointments/AppointmentCard";
import { useFieldRegistry, resolveVisibility } from "../context/FieldRegistryContext";
import { SelectFieldsModal, CreateFieldModal } from "../components/help/FieldManager";
import ScheduleAppointmentDrawer from "../components/appointments/ScheduleAppointmentDrawer";
import TeamAvailabilityTab from "../components/appointments/TeamAvailabilityTab";
import TargetUserLocationBar from "../components/appointments/TargetUserLocationBar";
import AppointmentCalendarView from "../components/appointments/AppointmentCalendarView";
import { useSearchParams, useNavigate, Link } from "react-router";
import { useClients } from "../../lib/clientsStore";
import { useInvoices } from "../context/InvoiceContext";
import { initialClients } from "./ClientProfile";
import { useTeamMembers } from "../../lib/teamStore";


interface Employee {
  id: number | string;
  name: string;
  email: string;
  role?: string;
  locations?: string[];
}

interface Service {
  id: number;
  name: string;
  duration: number;
  price: number;
}

// Process → Stage mapping
const processStages: Record<string, string[]> = {
  "Patient Intake": ["Initial Contact", "Insurance Verification", "Intake Form", "Scheduled"],
  "Appointment Scheduling": ["Requested", "Provider Assigned", "Confirmed", "Reminder Sent"],
  "Follow-up Calls": ["Pending Call", "Called – No Answer", "Called – Reached", "Follow-up Complete"],
  "Billing Support": ["Invoice Sent", "Payment Pending", "Disputed", "Resolved"],
  "Insurance Verification": ["Submitted", "Under Review", "Approved", "Denied"],
};

export default function Appointments() {
  const navigate = useNavigate();
  const { invoices, createInvoiceFromAppointment, voidInvoice } = useInvoices();
  const { bookableMembers, teamMembers } = useTeamMembers();
  const { activeOrganization } = useOrganization();

  // Dynamic bookable employees list
  const employees: Employee[] = useMemo(() => {
    const list = (teamMembers && teamMembers.length > 0) ? teamMembers : bookableMembers;
    if (list && list.length > 0) {
      return list.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role || m.department || "Staff",
        locations: m.locations || (m as any).availableLocations || [],
      }));
    }
    return [
      { id: 1, name: "John Smith", email: "john.smith@healthcare.com" },
      { id: 2, name: "Sarah Johnson", email: "sarah.j@healthcare.com" },
      { id: 4, name: "Emily Davis", email: "emily.d@healthcare.com" },
      { id: 5, name: "Dr. Robert Martinez", email: "robert.m@dentalcare.com" },
      { id: 6, name: "Lisa Anderson", email: "lisa.a@dentalcare.com" },
    ];
  }, [teamMembers, bookableMembers]);

  const services: Service[] = [
    { id: 1, name: "Initial Consultation", duration: 60, price: 150 },
    { id: 2, name: "Follow-up Visit", duration: 30, price: 75 },
    { id: 3, name: "Dental Cleaning", duration: 45, price: 120 },
    { id: 4, name: "X-Ray Imaging", duration: 20, price: 80 },
  ];

  const [appointments, setAppointments] = useState<Appointment[]>(() => appointmentService.getAppointments() as any);
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [showScribeModal, setShowScribeModal] = useState(false);

  useEffect(() => {
    return appointmentService.subscribe((updated) => {
      setAppointments(updated as any);
    });
  }, []);

  const [storeTick, setStoreTick] = useState(0);
  useEffect(() => {
    const handleStoreChange = () => {
      setStoreTick((t) => t + 1);
      setAppointments(appointmentService.getAppointments() as any);
    };
    window.addEventListener(AUTOMATION_STORE_EVENT, handleStoreChange);
    window.addEventListener(PROCESS_STORE_EVENT, handleStoreChange);
    window.addEventListener("storage", handleStoreChange);
    window.addEventListener("mantra_appointment_changed", handleStoreChange);
    window.addEventListener("mantra_appointments_changed", handleStoreChange);
    return () => {
      window.removeEventListener(AUTOMATION_STORE_EVENT, handleStoreChange);
      window.removeEventListener(PROCESS_STORE_EVENT, handleStoreChange);
      window.removeEventListener("storage", handleStoreChange);
      window.removeEventListener("mantra_appointment_changed", handleStoreChange);
      window.removeEventListener("mantra_appointments_changed", handleStoreChange);
    };
  }, []);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
  const [view, setView] = useState<"calendar" | "list" | "availability">("list");
  const [calendarViewMode, setCalendarViewMode] = useState<"day" | "week" | "month">("month");
  const [selectedUserId, setSelectedUserId] = useState<string | number>(() => employees[0]?.id || 1);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("loc-1");
  const [availabilitySubTab, setAvailabilitySubTab] = useState<"slots" | "days-off">("slots");
  const [selectedEmployee, setSelectedEmployee] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedAppointmentForDrawer, setSelectedAppointmentForDrawer] = useState<Appointment | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  // Process filter state: selected specific appointment process (strictly specific processes, no "all processes")
  const [selectedProcessFilter, setSelectedProcessFilter] = useState<string>("");
  const [showProcessesDropdown, setShowProcessesDropdown] = useState<boolean>(false);

  // Dynamic scoped appointment processes based on client organization (category, industry, location)
  const appointmentProcesses: Process[] = useMemo(() => {
    const procs = getStoredProcesses();
    const apptProcs = procs.filter((p) => p.entityType === "appointment");
    if (activeOrganization) {
      const scoped = apptProcs.filter((p) => isProcessMatchingOrg(p, activeOrganization));
      if (scoped.length > 0) return scoped;
    }
    return apptProcs.length > 0 ? apptProcs : [DEFAULT_ENTITY_PROCESSES.appointment];
  }, [activeOrganization, storeTick]);

  // Keep selectedProcessFilter pointing to a specific appointment process
  useEffect(() => {
    if (appointmentProcesses.length > 0) {
      if (!selectedProcessFilter || !appointmentProcesses.some((p) => p.id === selectedProcessFilter)) {
        setSelectedProcessFilter(appointmentProcesses[0].id);
      }
    }
  }, [appointmentProcesses, selectedProcessFilter]);

  // Active appointment process for stages and execution
  const appointmentProcess: Process = useMemo(() => {
    if (selectedProcessFilter) {
      const found = appointmentProcesses.find((p) => p.id === selectedProcessFilter);
      if (found) return found;
    }
    return appointmentProcesses[0] || DEFAULT_ENTITY_PROCESSES.appointment;
  }, [appointmentProcesses, selectedProcessFilter, storeTick]);

  const appointmentWorkflowStages: Stage[] = useMemo(() => {
    return appointmentProcess.stages || DEFAULT_ENTITY_PROCESSES.appointment.stages;
  }, [appointmentProcess]);

  // Dynamic process stages map for ScheduleAppointmentDrawer
  const dynamicProcessStages = useMemo(() => {
    const map: Record<string, string[]> = {};
    appointmentProcesses.forEach((p) => {
      map[p.name] = (p.stages || []).map((s) => s.name);
    });
    return Object.keys(map).length > 0 ? map : processStages;
  }, [appointmentProcesses]);

  const handleQuickStageChange = (apt: Appointment, targetStage: Stage) => {
    let newStatus: Appointment["status"] = apt.status;
    if (targetStage.systemCategory === "completed") newStatus = "completed";
    else if (targetStage.systemCategory === "cancelled") newStatus = "cancelled";
    else if (targetStage.systemCategory === "rescheduled") newStatus = "rescheduled" as any;
    else if (targetStage.systemCategory === "booked") newStatus = "scheduled";

    const updated = {
      ...apt,
      processId: appointmentProcess.id,
      currentStageId: targetStage.id,
      statusLabel: targetStage.name,
      status: newStatus,
    };

    setAppointments((prev) => prev.map((a) => (a.id === apt.id ? updated : a)));
    appointmentService.saveAppointments(
      appointmentService.getAppointments().map((a) => (a.id === apt.id ? updated : a))
    );

    logStageMove({
      orgId: "default",
      recordType: "appointment",
      recordId: String(apt.id),
      fromStageId: apt.currentStageId,
      fromStageName: apt.statusLabel,
      toStageId: targetStage.id,
      toStageName: targetStage.name,
      processId: appointmentProcess.id,
      processName: appointmentProcess.name,
      cause: {
        type: "manual",
        ruleName: `Stage changed to ${targetStage.name} from appointments table`,
      },
    });

    const prevStage = appointmentWorkflowStages.find((s) => s.id === apt.stageId || s.id === apt.currentStageId);
    appendActivity({
      clientId: (apt as any).clientId || `APT-${apt.id}`,
      processId: appointmentProcess.id,
      processName: appointmentProcess.name,
      type: "stage_change",
      createdBy: "user",
      fromStage: prevStage?.name || "Initial Stage",
      toStage: targetStage.name,
      details: {
        primary: `Moved to stage "${targetStage.name}"`,
        secondary: `Appointment #${apt.id} for ${apt.clientName}`,
      },
    });

    toast.success(`Appointment moved to "${targetStage.name}"`);
  };

  const [listViewTab, setListViewTab] = useState<"upcoming" | "done" | "pending" | "all">("all");
  const [selectedRows, setSelectedRows] = useState<(string | number)[]>([]);
  const [editingRows, setEditingRows] = useState<{ [key: string | number]: Appointment }>({});
  const [confirmDelete, setConfirmDelete] = useState<string | number | null>(null);
  const [hoveredStageBox, setHoveredStageBox] = useState<{ aptId: string | number; stageIdx: number } | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [filterDate, setFilterDate] = useState<string>("This Week");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [appointmentFormData, setAppointmentFormData] = useState<{
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    employeeId: number | string;
    serviceId: number | string;
    date: string;
    time: string;
    notes: string;
  }>({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    employeeId: 0,
    serviceId: 0,
    date: "",
    time: "",
    notes: "",
  });

  const [devUserRole, setDevUserRole] = useState<"admin" | "provider">("admin");
  const currentProviderUser: Employee = employees[0];
  const effectiveEmployeeFilter = devUserRole === "provider" ? currentProviderUser.id : selectedEmployee;
  const currentCalendarViewMode = calendarViewMode;

  // Field registry for appointment module
  const { getAllFields } = useFieldRegistry();
  const appointmentCustomFields = getAllFields("appointment").filter(f => f.source === "custom");

  // Custom field values for the currently-edited appointment
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  // Modal state for appointment field picker/creator
  const [apptSelectFieldsOpen, setApptSelectFieldsOpen] = useState(false);
  const [apptCreateFieldOpen, setApptCreateFieldOpen] = useState(false);
  const [apptVisibleFieldKeys, setApptVisibleFieldKeys] = useState<string[]>(() => {
    const saved = sessionStorage.getItem("appointments_visibleFields");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    try {
      if (appointments && appointments.length > 0) {
        sessionStorage.setItem("appointments_v1", JSON.stringify(appointments));
        localStorage.setItem("appointments_v1", JSON.stringify(appointments));
      }
    } catch {}
  }, [appointments]);

  const [searchParams] = useSearchParams();
  const linkedApptId = searchParams.get("id");

  useEffect(() => {
    if (linkedApptId) {
      setView("list");
      setListViewTab("all");
      const matched = appointments.find((a) => String(a.id) === String(linkedApptId));
      if (matched) {
        setSearchQuery(matched.clientName);
      } else {
        setSearchQuery(linkedApptId);
      }
    }
  }, [linkedApptId]);


  // Booking workflow state (single-page form)
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Employee | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [sessionType, setSessionType] = useState<"video" | "inPerson">("video");
  // New flat form fields
  const [moduleDefaultProcess, setModuleDefaultProcess] = useState<string>(() => {
    try {
      return localStorage.getItem("ma_appointment_default_process") || "Appointment Scheduling";
    } catch {
      return "Appointment Scheduling";
    }
  });
  const [showProcessSettings, setShowProcessSettings] = useState(false);
  const [bookingTitle, setBookingTitle] = useState("");
  const [bookingDescription, setBookingDescription] = useState("");
  const [bookingNote, setBookingNote] = useState("");
  const [bookingTags, setBookingTags] = useState("");
  const [bookingProcessId, setBookingProcessId] = useState(() => {
    try {
      return localStorage.getItem("ma_appointment_default_process") || "Appointment Scheduling";
    } catch {
      return "Appointment Scheduling";
    }
  });
  const [bookingStageId, setBookingStageId] = useState("Confirmed");
  const [bookingStartHour, setBookingStartHour] = useState(9);
  const [bookingStartMinute, setBookingStartMinute] = useState(0);
  const [drawerMode, setDrawerMode] = useState<"create" | "reschedule">("create");
  const [bookingServiceId, setBookingServiceId] = useState("");
  const [bookingGenerateInvoice, setBookingGenerateInvoice] = useState(() => hasAppointmentInvoiceAutomation());
  const [bookingLineItems, setBookingLineItems] = useState<any[]>([]);
  const [bookingDiscountAmount, setBookingDiscountAmount] = useState(0);
  const [bookingLocation, setBookingLocation] = useState("Main Clinic — Suite 400");
  const [bookingSource, setBookingSource] = useState<string>("Inbound Call");

  // Client search and filter state
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [showClientFilters, setShowClientFilters] = useState(false);
  const [clientStatusFilter, setClientStatusFilter] = useState<string>("all");
  const [clientProcessFilter, setClientProcessFilter] = useState<string[]>([]);
  const [clientResponsibleFilter, setClientResponsibleFilter] = useState<string>("all");

  // Provider search and filter state
  const [providerSearchQuery, setProviderSearchQuery] = useState("");
  const [showProviderFilters, setShowProviderFilters] = useState(false);
  const [providerAvailabilityFilter, setProviderAvailabilityFilter] = useState<string>("all");
  const [providerSpecialtyFilter, setProviderSpecialtyFilter] = useState<string>("all");
  const [providerLocationFilter, setProviderLocationFilter] = useState<string>("all");
  const [showExportModal, setShowExportModal] = useState(false);

  const { clients: liveClients } = useClients();

  useEffect(() => {
    const handleStorageUpdate = (e?: any) => {
      try {
        const rawApts = localStorage.getItem("appointments_v1") || sessionStorage.getItem("appointments_v1");
        if (rawApts) {
          const parsed = JSON.parse(rawApts);
          console.log('[Appointments] Received update event, new appointments count:', parsed.length, 'Latest client:', parsed[0]?.clientName);
          setAppointments(parsed);
        }
      } catch (err) {
        console.warn('Error reading appointments on storage update:', err);
      }
    };

    const handleVisibility = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        handleStorageUpdate();
      }
    };

    window.addEventListener("storage", handleStorageUpdate);
    window.addEventListener("mantra_appointments_updated", handleStorageUpdate);
    window.addEventListener("focus", handleStorageUpdate);
    document.addEventListener("visibilitychange", handleVisibility);

    let channel: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        channel = new BroadcastChannel("mantra_appointments_broadcast_channel");
        channel.onmessage = handleStorageUpdate;
      } catch (e) {
        console.warn("Failed to create BroadcastChannel in Appointments:", e);
      }
    }

    return () => {
      window.removeEventListener("storage", handleStorageUpdate);
      window.removeEventListener("mantra_appointments_updated", handleStorageUpdate);
      window.removeEventListener("focus", handleStorageUpdate);
      document.removeEventListener("visibilitychange", handleVisibility);
      channel?.close();
    };
  }, []);

  const clients = liveClients.map((c: any, idx: number) => ({
    id: c.id ?? idx + 1,
    name: c.name,
    email: c.email || "",
    phone: c.phone || "",
    specialty: Array.isArray(c.processes) ? c.processes[0] : (c.process || "General Consultation"),
    avatar: (c.name || "CL").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
    availability: "Available",
    status: c.status || "Active",
    process: Array.isArray(c.processes) ? c.processes[0] : (c.process || "Patient Intake"),
    responsiblePerson: c.responsible || "John Smith",
  }));

  // Time slots
  const timeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00"
  ];

  // Filter clients based on search and filters
  const filteredClients = clients.filter((client) => {
    // Search filter
    const searchLower = clientSearchQuery.toLowerCase();
    const matchesSearch = !clientSearchQuery ||
      client.name.toLowerCase().includes(searchLower) ||
      client.email.toLowerCase().includes(searchLower) ||
      client.phone.toLowerCase().includes(searchLower);

    // Status filter
    const matchesStatus = clientStatusFilter === "all" || client.status === clientStatusFilter;

    // Process filter
    const matchesProcess = clientProcessFilter.length === 0 || clientProcessFilter.includes(client.process);

    // Responsible person filter
    const matchesResponsible = clientResponsibleFilter === "all" || client.responsiblePerson === clientResponsibleFilter;

    return matchesSearch && matchesStatus && matchesProcess && matchesResponsible;
  });

  // Filter providers based on search and filters
  const filteredProviders = employees.filter((employee) => {
    // Search filter
    const searchLower = providerSearchQuery.toLowerCase();
    const matchesSearch = !providerSearchQuery ||
      employee.name.toLowerCase().includes(searchLower) ||
      employee.email.toLowerCase().includes(searchLower);

    // For now, we'll just use the search. Additional filters like availability, specialty, and location
    // would need corresponding data in the employee object
    return matchesSearch;
  });

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getAppointmentsForDate = (date: string) => {
    return appointments.filter((apt) => {
      const matchesDate = apt.date === date;
      const matchesEmployee = effectiveEmployeeFilter === "all" || String(apt.employeeId) === String(effectiveEmployeeFilter);
      return matchesDate && matchesEmployee;
    });
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const navigateDay = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (direction === "prev") {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (direction === "prev") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  const getWeekDates = (date: Date) => {
    const dayOfWeek = date.getDay();
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - dayOfWeek);

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const weekDate = new Date(startOfWeek);
      weekDate.setDate(startOfWeek.getDate() + i);
      weekDates.push(weekDate);
    }
    return weekDates;
  };

  const openBookingDrawerForReschedule = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setDrawerMode("reschedule");

    setBookingTitle(apt.title || `Appointment with ${apt.clientName}`);
    setBookingDescription(apt.description || "");

    const prov = employees.find((e) => String(e.id) === String(apt.employeeId)) || null;
    setSelectedProvider(prov);

    const cl = clients.find((c) => c.name === apt.clientName || c.email === apt.clientEmail) || {
      id: (Number(apt.id) || 1) * 1000,
      name: apt.clientName,
      email: apt.clientEmail,
      phone: apt.clientPhone,
    };
    setSelectedClient(cl);

    setBookingProcessId(apt.processId || "");
    setBookingStageId(apt.stageId || "");

    setSelectedDate(apt.date || formatDate(new Date()));
    if (apt.time) {
      const parts = apt.time.split(":");
      const hh = parseInt(parts[0], 10);
      const mm = parseInt(parts[1], 10);
      setBookingStartHour(isNaN(hh) ? 9 : hh);
      setBookingStartMinute(isNaN(mm) ? 0 : mm);
    } else {
      setBookingStartHour(9);
      setBookingStartMinute(0);
    }

    setBookingNote(apt.notes || "");
    setBookingTags(apt.tags ? apt.tags.join(", ") : "");
    if (apt.notes?.toLowerCase().includes("in-person")) {
      setSessionType("inPerson");
    } else {
      setSessionType("video");
    }
    setBookingSource(apt.source || "Inbound Call");

    setShowAddModal(true);
  };

  const handleBookingComplete = () => {
    if (drawerMode !== "reschedule" && !hasAppointmentAutomation(bookingProcessId || (selectedProcessFilter !== "all" ? selectedProcessFilter : undefined))) {
      toast.error("Please build an automation first before booking appointments. Navigate to Automation to configure workflow rules.");
      navigate("/automation");
      return;
    }

    const finalTitle = (bookingTitle.trim() || `${selectedClient.name} — Appointment`).trim();

    if (!selectedClient || !selectedProvider || !selectedDate || !finalTitle) {
      toast.error("Please fill in all required fields");
      return;
    }

    const startHH = String(bookingStartHour).padStart(2, "0");
    const startMM = String(bookingStartMinute).padStart(2, "0");
    const timeStr = `${startHH}:${startMM}`;
    const parsedTags = bookingTags ? bookingTags.split(",").map((t) => t.trim()).filter(Boolean) : undefined;

    if (drawerMode === "reschedule" && selectedAppointment) {
      appointmentService.rescheduleAppointment(selectedAppointment.id, selectedDate, timeStr, bookingNote);
      setAppointments(appointmentService.getAppointments() as any);
      if (selectedAppointmentForDrawer && selectedAppointmentForDrawer.id === selectedAppointment.id) {
        const found = appointmentService.getAppointmentById(selectedAppointment.id);
        if (found) setSelectedAppointmentForDrawer(found);
      }
      toast.success("Appointment rescheduled successfully!");
    } else {
      const targetProc = bookingProcessId
        ? appointmentProcesses.find((p) => p.id === bookingProcessId || p.name === bookingProcessId)
        : (appointmentProcess || appointmentProcesses[0]);

      const targetStage = targetProc?.stages?.find(
        (s) => s.id === bookingStageId || s.name === bookingStageId
      );

      const res = appointmentService.createAppointment({
        clientName: selectedClient.name,
        clientEmail: selectedClient.email,
        clientPhone: selectedClient.phone,
        employeeId: selectedProvider.id,
        serviceId: bookingServiceId ? Number(bookingServiceId) : 1,
        date: selectedDate,
        time: timeStr,
        duration: 60,
        notes: bookingNote || `Session Type: ${sessionType === "video" ? "Video Call" : "In-Person"}`,
        title: finalTitle,
        description: bookingDescription.trim() || undefined,
        tags: parsedTags,
        clientId: selectedClient.id ? String(selectedClient.id) : undefined,
        location: bookingLocation,
        sessionType,
        processId: targetProc?.id || bookingProcessId,
        stageId: targetStage?.id || bookingStageId || undefined,
        generateInvoice: bookingGenerateInvoice ?? false,
        lineItems: bookingLineItems && bookingLineItems.length > 0 ? bookingLineItems : undefined,
        source: bookingSource || "Inbound Call",
      });

      if (res.appointment) {
        setAppointments(appointmentService.getAppointments() as any);
      }

      if (res.invoiceId) {
        toast.success(`Appointment scheduled — Invoice ${res.invoiceId} created!`);
      } else {
        toast.success("Appointment scheduled successfully!");
      }
    }

    setShowAddModal(false);
    resetBookingWorkflow();
  };

  const handleSetModuleDefaultProcess = (processName: string) => {
    setModuleDefaultProcess(processName);
    setBookingProcessId(processName);
    try {
      localStorage.setItem("ma_appointment_default_process", processName);
      window.dispatchEvent(new CustomEvent("ma_appointment_default_process_updated", { detail: processName }));
    } catch {}
    toast.success(`Default appointment process set to "${processName}"`);
    setShowProcessSettings(false);
  };

  const resetBookingWorkflow = () => {
    setDrawerMode("create");
    setSelectedAppointment(null);
    setSelectedClient(null);
    setSelectedProvider(devUserRole === "provider" ? currentProviderUser : null);
    setSelectedDate(formatDate(new Date()));
    setSessionType("video");
    setBookingTitle("");
    setBookingDescription("");
    setBookingNote("");
    setBookingTags("");
    setBookingProcessId(moduleDefaultProcess || "Appointment Scheduling");
    setBookingStageId("Confirmed");
    setBookingStartHour(9);
    setBookingStartMinute(0);
    setBookingLocation("Main Clinic — Suite 400");
    setBookingGenerateInvoice(hasAppointmentInvoiceAutomation(selectedProcessFilter && selectedProcessFilter !== "all" ? selectedProcessFilter : undefined));
    setBookingLineItems([]);
    setBookingDiscountAmount(0);

    // Reset client filters and search
    setClientSearchQuery("");
    setShowClientFilters(false);
    setClientStatusFilter("all");
    setClientProcessFilter([]);
    setClientResponsibleFilter("all");

    // Reset provider filters and search
    setProviderSearchQuery("");
    setShowProviderFilters(false);
    setProviderAvailabilityFilter("all");
    setProviderSpecialtyFilter("all");
    setProviderLocationFilter("all");
  };

  const handleAddAppointment = () => {
    if (
      !appointmentFormData.clientName ||
      !appointmentFormData.employeeId ||
      !appointmentFormData.serviceId ||
      !appointmentFormData.date ||
      !appointmentFormData.time
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    const service = services.find((s) => s.id === appointmentFormData.serviceId);
    const maxId = appointments.reduce((max, a) => {
      const num = typeof a.id === "number" ? a.id : parseInt(String(a.id).replace(/\D/g, ""), 10) || 0;
      return Math.max(max, num);
    }, 0);
    const newAppointment: Appointment = {
      id: maxId + 1,
      ...appointmentFormData,
      employeeId: Number(appointmentFormData.employeeId),
      serviceId: Number(appointmentFormData.serviceId),
      duration: service?.duration || 30,
      status: "scheduled",
    };

    setAppointments([...appointments, newAppointment]);
    toast.success("Appointment booked successfully");
    setShowAddModal(false);
    resetForm();
  };

  const handleEditAppointment = () => {
    if (!selectedAppointment) return;

    const service = services.find((s) => s.id === appointmentFormData.serviceId);
    setAppointments(
      appointments.map((a) =>
        a.id === selectedAppointment.id
          ? {
            ...a,
            ...appointmentFormData,
            employeeId: Number(appointmentFormData.employeeId),
            serviceId: Number(appointmentFormData.serviceId),
            duration: service?.duration || a.duration,
            ...customFieldValues,
          }
          : a
      )
    );
    toast.success("Appointment updated successfully");
    setShowEditModal(false);
    resetForm();
  };

  const handleDeleteAppointment = (appointmentId: number) => {
    appointmentService.cancelAppointment(appointmentId);
    toast.success("Appointment cancelled & invoice voided if unpaid");
  };

  const handleStatusChange = (appointmentId: number, status: Appointment["status"]) => {
    if (status === "cancelled") {
      appointmentService.cancelAppointment(appointmentId);
    } else if (status === "completed") {
      appointmentService.completeAppointment(appointmentId);
    } else {
      const targetStage = appointmentProcess.stages.find(s => s.systemCategory === status);
      if (targetStage) {
        appointmentService.moveToStage(appointmentId, targetStage.id);
      } else {
        appointmentService.updateAppointment(appointmentId, { status });
      }
    }
    toast.success("Appointment status updated");
  };

  const openEditModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setAppointmentFormData({
      clientName: appointment.clientName,
      clientEmail: appointment.clientEmail,
      clientPhone: appointment.clientPhone,
      employeeId: appointment.employeeId,
      serviceId: appointment.serviceId,
      date: appointment.date,
      time: appointment.time,
      notes: appointment.notes || "",
    });

    // Populate custom field values from the appointment object and auto-surface visible keys
    const values: Record<string, string> = {};
    const autoKeys: string[] = [];
    appointmentCustomFields.forEach(f => {
      const vis = resolveVisibility(f);
      const val = (appointment as any)[f.key];
      const hasValue = val !== undefined && val !== null && val !== "";

      if (hasValue) {
        values[f.key] = String(val);
      }

      if (vis === "all") {
        autoKeys.push(f.key);
      } else if (vis === "specific" && f.visibleToRecordIds?.includes(String(appointment.id))) {
        autoKeys.push(f.key);
      } else if (hasValue) {
        autoKeys.push(f.key);
      }
    });
    setCustomFieldValues(values);

    if (autoKeys.length > 0) {
      setApptVisibleFieldKeys(prev => {
        const set = new Set([...prev, ...autoKeys]);
        return Array.from(set);
      });
    }

    setShowEditModal(true);
  };

  const resetForm = () => {
    setAppointmentFormData({
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      employeeId: 0,
      serviceId: 0,
      date: "",
      time: "",
      notes: "",
    });
    setCustomFieldValues({});
    setSelectedAppointment(null);
  };

  const filteredAppointments = appointments.filter((apt) => {
    const query = searchQuery.toLowerCase().trim();
    const apptIdStr = `apt-${apt.id}`;
    const matchesSearch =
      !query ||
      apptIdStr.includes(query) ||
      String(apt.id).includes(query) ||
      apt.clientName.toLowerCase().includes(query) ||
      apt.clientEmail.toLowerCase().includes(query) ||
      (apt.clientPhone && apt.clientPhone.toLowerCase().includes(query)) ||
      (apt.notes && apt.notes.toLowerCase().includes(query)) ||
      (apt.title && apt.title.toLowerCase().includes(query));
    const matchesEmployee = effectiveEmployeeFilter === "all" || apt.employeeId === effectiveEmployeeFilter;

    // Filter by status dropdown / list view tab
    let matchesTab = true;
    switch (listViewTab) {
      case "upcoming":
        matchesTab = apt.status === "scheduled";
        break;
      case "done":
        matchesTab = apt.status === "completed";
        break;
      case "pending":
        matchesTab = apt.status === "pending-accept";
        break;
      case "all":
        matchesTab = true;
        break;
    }
    const matchesStage =
      stageFilter === "all" ||
      apt.currentStageId === stageFilter ||
      (apt.statusLabel && apt.statusLabel.toLowerCase() === stageFilter.toLowerCase()) ||
      apt.status === stageFilter;

    const effectiveProcessId = (() => {
      // 1. If appointment's currentStageId belongs to any known appointment process, that process is authoritative
      if (apt.currentStageId || apt.stageId) {
        const sid = (apt.currentStageId || apt.stageId || "").trim().toLowerCase();
        for (const p of appointmentProcesses) {
          if (p.stages?.some((s) => s.id.toLowerCase() === sid)) {
            return p.id;
          }
        }
      }
      // 2. Otherwise match by apt.processId
      if (apt.processId) {
        const found = appointmentProcesses.find(
          (p) => p.id === apt.processId || p.name.toLowerCase() === apt.processId?.toLowerCase()
        );
        return found ? found.id : apt.processId;
      }
      return "";
    })();

    const matchesProcess =
      selectedProcessFilter === "all" ||
      effectiveProcessId === appointmentProcess.id ||
      effectiveProcessId === selectedProcessFilter ||
      (!effectiveProcessId && (!selectedProcessFilter || selectedProcessFilter === appointmentProcesses[0]?.id));

    return matchesSearch && matchesEmployee && matchesTab && matchesStage && matchesProcess;
  });

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const getStatusColor = (status: Appointment["status"]) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "completed":
        return "bg-green-100 text-green-700 border-green-200";
      case "cancelled":
        return "bg-red-100 text-red-700 border-red-200";
      case "no-show":
        return "bg-orange-100 text-orange-700 border-orange-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status: Appointment["status"]) => {
    switch (status) {
      case "scheduled":
        return <Clock className="w-3 h-3" />;
      case "completed":
        return <CheckCircle className="w-3 h-3" />;
      case "cancelled":
        return <XCircle className="w-3 h-3" />;
      case "no-show":
        return <AlertCircle className="w-3 h-3" />;
    }
  };

  const statsSource = devUserRole === "provider"
    ? appointments.filter((a) => a.employeeId === currentProviderUser.id)
    : appointments;

  const stats = {
    total: statsSource.length,
    scheduled: statsSource.filter((a) => a.status === "scheduled").length,
    completed: statsSource.filter((a) => a.status === "completed").length,
    cancelled: statsSource.filter((a) => a.status === "cancelled").length,
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="px-10 sm:px-12 py-7.5 sm:py-8 w-full space-y-7">
        <PageHeader
          title="Appointments"
          subtitle="Schedule and manage appointments with your clients"
          badge={
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#1456f0] border border-blue-200/60">
              Schedule
            </span>
          }
        >
          <div className="flex items-center gap-2">
            <HowItWorksButton label="How Appointments Works" onClick={() => setShowHelp(true)} />
          </div>
        </PageHeader>

        {!hasAppointmentAutomation(selectedProcessFilter) && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50/90 border border-amber-200/90 rounded-xl text-xs font-medium text-amber-800 shadow-2xs">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Automated Appointment Booking is locked — please build the automation first in Automation to enable booking appointments and stage workflows.
            </span>
            <Link to="/automation" className="text-blue-600 hover:underline font-semibold text-xs ml-2">
              Build automation &rarr;
            </Link>
          </div>
        )}

        {/* Unified Search & Controls Toolbar powered by PageTopBar */}
        <PageTopBar
          leftElement={
            <div className="flex items-center gap-1.5">
              {/* Specific Appointment Process Selector (Only specific appointment processes, no "All Processes") */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowProcessesDropdown(!showProcessesDropdown)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors cursor-pointer"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                  title="Select Appointment Process"
                >
                  <span className="truncate max-w-[160px] font-semibold text-gray-800">
                    {appointmentProcesses.find((p) => p.id === selectedProcessFilter)?.name || appointmentProcesses[0]?.name || "Appointment Flow"}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                </button>

                {showProcessesDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowProcessesDropdown(false)}
                    />
                    <div className="absolute top-full left-0 mt-1.5 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1.5 overflow-hidden">
                      {appointmentProcesses.map((proc) => (
                        <button
                          key={proc.id}
                          type="button"
                          onClick={() => {
                            setSelectedProcessFilter(proc.id);
                            setStageFilter("all");
                            setShowProcessesDropdown(false);
                          }}
                          className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                            selectedProcessFilter === proc.id ? "bg-blue-50/80 text-blue-600 font-semibold" : "text-gray-700 hover:bg-gray-50"
                          }`}
                          style={{ fontFamily: 'Outfit, sans-serif' }}
                        >
                          <span className="truncate">{proc.name}</span>
                          {selectedProcessFilter === proc.id && (
                            <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-2" />
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          }
          modes={[
            { id: "list", label: "List", icon: <List className="w-3.5 h-3.5" /> },
            { id: "calendar", label: "Calendar", icon: <CalendarIcon className="w-3.5 h-3.5" /> },
            { id: "availability", label: "Availability", icon: <CalendarClock className="w-3.5 h-3.5" /> },
          ]}
          activeMode={view}
          onModeChange={(m) => setView(m as typeof view)}
          searchQuery={view !== "availability" ? searchQuery : ""}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search appointments (client, email, notes)..."
          filterPresets={[
            {
              id: "all",
              label: "All",
              count: statsSource.length,
              isActive: stageFilter === "all",
              onClick: () => { setStageFilter("all"); setListViewTab("all"); },
            },
            ...appointmentProcess.stages.map((stg) => ({
              id: stg.id,
              label: stg.name,
              count: statsSource.filter((a) => a.currentStageId === stg.id || a.status === stg.systemCategory).length,
              isActive: stageFilter === stg.id,
              onClick: () => { setStageFilter(stg.id); },
            })),
          ]}
          filterFields={[
            ...(devUserRole !== "provider"
              ? [
                  {
                    id: "provider",
                    label: "Provider",
                    type: "select" as const,
                    options: [
                      { label: "All Providers", value: "all" },
                      ...employees.map((emp) => ({ label: emp.name, value: String(emp.id) })),
                    ],
                    value: String(selectedEmployee),
                    onChange: (v: string) => setSelectedEmployee(v === "all" ? "all" : Number(v)),
                  },
                ]
              : []),
          ]}
          onExport={() => setShowExportModal(true)}
          primaryAction={{
            label: "Book Appointment",
            onClick: () => {
              if (!hasAppointmentAutomation(selectedProcessFilter)) {
                toast.error("Please build an automation first before booking appointments. Navigate to Automation to configure workflow rules.");
                navigate("/automation");
                return;
              }
              resetBookingWorkflow();
              setShowAddModal(true);
            },
          }}
          afterPrimaryAction={
            <button
              type="button"
              onClick={() => {
                const targetProcId = selectedProcessFilter || appointmentProcess.id;
                navigate(`/process?entity=appointment&processId=${targetProcId}`, {
                  state: { processId: targetProcId, processName: appointmentProcess.name },
                });
              }}
              className="p-2 h-[36px] w-[36px] flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-border bg-white transition-colors shrink-0 cursor-pointer shadow-2xs"
              title="Configure Appointment Workflow"
            >
              <Settings className="w-4 h-4" />
            </button>
          }
        />

        {/* Unified DataExportModal */}
        <DataExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          title="Export Appointments"
          subtitle="Export scheduled, completed, and pending appointments with custom filters"
          data={appointments}
          filenamePrefix="appointments"
          dateFieldKey="date"
          dateLabel="Appointment Date"
          statusFieldKey="status"
          statusLabel="Appointment Status"
          statusOptions={[
            { label: "Scheduled", value: "scheduled" },
            { label: "Completed", value: "completed" },
            { label: "Cancelled", value: "cancelled" },
            { label: "No-Show", value: "no-show" },
            { label: "Pending Accept", value: "pending-accept" },
          ]}
          allFields={[
            { key: "id", label: "Appointment ID", getValue: (a) => `apt-${a.id}` },
            { key: "clientName", label: "Client Name", getValue: (a) => a.clientName },
            { key: "clientEmail", label: "Client Email", getValue: (a) => a.clientEmail || "" },
            { key: "clientPhone", label: "Client Phone", getValue: (a) => a.clientPhone || "" },
            { key: "date", label: "Date", getValue: (a) => a.date },
            { key: "time", label: "Time", getValue: (a) => a.time },
            { key: "duration", label: "Duration (mins)", getValue: (a) => a.duration || 30 },
            { key: "status", label: "Status", getValue: (a) => a.status },
            { key: "title", label: "Title / Service", getValue: (a) => a.title || a.serviceName || services.find((s) => s.id === a.serviceId)?.name || "" },
            { key: "employeeName", label: "Provider / Specialist", getValue: (a) => a.employeeName || employees.find((e) => String(e.id) === String(a.employeeId))?.name || "" },
            { key: "location", label: "Location", getValue: (a) => a.location || "" },
            { key: "notes", label: "Notes", getValue: (a) => a.notes || "" },
          ]}
        />

        {/* Calendar View */}
        {view === "calendar" && (
          <AppointmentCalendarView
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            selectedCalendarDate={selectedCalendarDate}
            setSelectedCalendarDate={setSelectedCalendarDate}
            appointments={appointments}
            getAppointmentsForDate={getAppointmentsForDate}
            employees={employees}
            services={services}
            openBookingDrawerForReschedule={openBookingDrawerForReschedule}
            onBookForDate={(dateStr) => {
              if (!hasAppointmentAutomation(selectedProcessFilter && selectedProcessFilter !== "all" ? selectedProcessFilter : undefined)) {
                toast.error("Please build an automation first before booking appointments. Navigate to Automation to configure workflow rules.");
                navigate("/automation");
                return;
              }
              resetBookingWorkflow();
              setSelectedDate(dateStr);
              setShowAddModal(true);
            }}
            formatDate={formatDate}
          />
        )}
        {/* List View (TableComponent) */}
        {view === "list" && (
          <div className="space-y-4">
            {/* TableComponent with sharp edges */}
            <TableComponent
              data={filteredAppointments}
              columns={[
                {
                  header: "Appointment ID",
                  accessorKey: "id",
                  align: "left",
                  width: 140,
                  render: (apt) => {
                    const formattedId = `APT-${String(apt.id).padStart(4, "0")}`;
                    return (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAppointmentForDrawer(apt);
                          setIsDetailDrawerOpen(true);
                        }}
                        className="font-mono text-xs font-semibold text-[#1456f0] hover:text-[#1d4ed8] hover:underline cursor-pointer tracking-tight"
                        style={{ fontFamily: "JetBrains Mono, monospace" }}
                        title="Open appointment details"
                      >
                        {formattedId}
                      </button>
                    );
                  },
                },
                {
                  header: "Title",
                  accessorKey: "title",
                  align: "left",
                  minWidth: 180,
                  render: (apt) => {
                    const clientName = apt.clientName || "Client";
                    const dateStr = apt.date || (apt.createdAt ? apt.createdAt.slice(0, 10) : "2026-10-15");
                    const titleStr = `${clientName}_Appointment_${dateStr}`;
                    return (
                      <span
                        className="font-medium text-xs text-slate-800"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                        title={titleStr}
                      >
                        {titleStr}
                      </span>
                    );
                  },
                },
                {
                  header: "Stages",
                  accessorKey: "currentStageId",
                  align: "left",
                  minWidth: 160,
                  render: (apt) => {
                    const aptProc = appointmentProcesses.find((p) => p.id === apt.processId || p.name === apt.processId) || appointmentProcess;
                    const stages = aptProc.stages && aptProc.stages.length > 0 ? aptProc.stages : appointmentWorkflowStages;
                    const stageKey = (apt.currentStageId || apt.stageId || "").trim();
                    const matchedStage = stageKey
                      ? stages.find(
                          (s) =>
                            s.id.toLowerCase() === stageKey.toLowerCase() ||
                            s.name.toLowerCase() === stageKey.toLowerCase() ||
                            (apt.statusLabel && s.name.toLowerCase() === apt.statusLabel.toLowerCase())
                        )
                      : (stages.find((s) => apt.statusLabel && s.name.toLowerCase() === apt.statusLabel.toLowerCase()) || stages[0]);
                    const activeIdx = matchedStage ? stages.findIndex((s) => s.id === matchedStage.id) : -1;

                    if (!matchedStage || activeIdx === -1) {
                      return (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/80 tracking-tight"
                            title="No stage marked — please build the automation first"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Please build the automation first
                          </span>
                        </div>
                      );
                    }

                    const isCurrentSuccess = matchedStage && (matchedStage.systemCategory === "completed" || matchedStage.systemCategory === "won" || matchedStage.name.toLowerCase().includes("completed") || matchedStage.name.toLowerCase().includes("won"));
                    const isCurrentLost = matchedStage && (matchedStage.isFinalStage || matchedStage.isFinal || matchedStage.systemCategory === "cancelled" || matchedStage.systemCategory === "lost" || matchedStage.name.toLowerCase().includes("cancel") || matchedStage.name.toLowerCase().includes("lost") || matchedStage.name.toLowerCase().includes("no-show"));
                    const isCurrentFinal = Boolean(isCurrentSuccess || isCurrentLost || matchedStage?.isFinalStage || matchedStage?.isFinal);

                    const lightenHex = (hex: string, percent: number = 75): string => {
                      if (!hex || typeof hex !== "string") return "#F1F5F9";
                      let c = hex.replace("#", "").trim();
                      if (c.length === 3) c = c.split("").map((ch) => ch + ch).join("");
                      const num = parseInt(c, 16);
                      if (isNaN(num)) return hex;
                      const factor = percent / 100;
                      const r = Math.max(0, Math.min(255, Math.round(((num >> 16) & 255) + (255 - ((num >> 16) & 255)) * factor)));
                      const g = Math.max(0, Math.min(255, Math.round(((num >> 8) & 255) + (255 - ((num >> 8) & 255)) * factor)));
                      const b = Math.max(0, Math.min(255, Math.round((num & 255) + (255 - (num & 255)) * factor)));
                      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
                    };

                    return (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center -space-x-px">
                          {stages.map((stg, i) => {
                            const isStgLost = stg.isFinalStage || stg.isFinal || stg.systemCategory === "cancelled" || stg.systemCategory === "lost" || stg.name.toLowerCase().includes("cancel") || stg.name.toLowerCase().includes("lost") || stg.name.toLowerCase().includes("no-show");
                            const isStgSuccess = stg.systemCategory === "completed" || stg.systemCategory === "won" || stg.name.toLowerCase().includes("completed") || stg.name.toLowerCase().includes("won");
                            const isStgFinal = isStgLost || isStgSuccess || Boolean(stg.isFinalStage || stg.isFinal);
                            const isStgInProgress = !isStgFinal;
                            const isActive = activeIdx >= 0 && i === activeIdx;

                            let isCompleted = false;
                            let isDeactivated = false;

                            if (isActive) {
                              // Active stage
                            } else if (isCurrentFinal) {
                              // When lost/final stage is marked, prior reached stages remain completed with full color
                              if (isStgInProgress && activeIdx >= 0 && i < activeIdx) {
                                isCompleted = true;
                              } else {
                                isDeactivated = true;
                              }
                            } else {
                              if (isStgInProgress && activeIdx >= 0 && i < activeIdx) {
                                isCompleted = true;
                              }
                            }

                            const isLocked = Boolean(isCurrentFinal);
                            const stgColor = stg.color || "#1E88E5";
                            const lightBg = lightenHex(stgColor, 78);
                            const lightBorder = lightenHex(stgColor, 40);

                            const isHovered = hoveredStageBox?.aptId === apt.id && hoveredStageBox?.stageIdx === i;

                            let bg = "transparent";
                            let border = "1px solid #CBD5E1";
                            let opacity = 1;

                            if (isActive) {
                              bg = stgColor;
                              border = "1.5px solid #0F172A";
                              opacity = 1;
                            } else if (isCompleted) {
                              // Preserve full stage color on completed stages even when lost is marked
                              bg = stgColor;
                              border = `1px solid ${stgColor}`;
                              opacity = 0.9;
                            } else {
                              // Inactive / unreached / deactivated stages: light grey to show inactive
                              bg = "#E2E8F0";
                              border = "1px solid #CBD5E1";
                              opacity = 0.9;
                            }

                            return (
                              <div key={stg.id} className="relative" style={{ zIndex: isActive ? 10 : isHovered ? 20 : 1 }}>
                                {isHovered && (
                                  <div
                                    className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded text-[11px] font-medium shadow-md pointer-events-none"
                                    style={{ backgroundColor: "#1A2B4A", color: "#fff", zIndex: 200 }}
                                  >
                                    {stg.name}{isDeactivated ? " (Inactive)" : isActive ? " (Current)" : isCompleted ? " (Completed)" : ""}{isLocked ? " [Locked]" : ""}
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!isDeactivated && !isLocked) handleQuickStageChange(apt, stg);
                                  }}
                                  onMouseEnter={() => setHoveredStageBox({ aptId: apt.id, stageIdx: i })}
                                  onMouseLeave={() => setHoveredStageBox(null)}
                                  style={{
                                    width: "18px",
                                    height: "8px",
                                    borderRadius: "0px",
                                    backgroundColor: bg,
                                    border: border,
                                    opacity: opacity,
                                    cursor: isDeactivated || isLocked ? "not-allowed" : "pointer",
                                    display: "block",
                                    padding: 0,
                                    flexShrink: 0,
                                    transition: "all 0.15s ease",
                                  }}
                                  title={stg.name}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  },
                },
                {
                  header: "Client",
                  accessorKey: "clientName",
                  align: "left",
                  minWidth: 160,
                  render: (apt) => (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAppointmentForDrawer(apt);
                        setIsDetailDrawerOpen(true);
                      }}
                      className="font-medium text-xs text-slate-900 cursor-pointer hover:text-blue-600 hover:underline"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      {apt.clientName}
                    </span>
                  ),
                },
                {
                  header: "Date",
                  accessorKey: "date",
                  align: "left",
                  width: 130,
                  render: (apt) => {
                    let dateText = apt.date || "—";
                    try {
                      if (apt.date) {
                        const d = new Date(apt.date.includes("T") ? apt.date : `${apt.date}T00:00:00`);
                        if (!isNaN(d.getTime())) {
                          dateText = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                        }
                      }
                    } catch {
                      // ignore
                    }
                    return (
                      <span className="text-xs text-slate-800 font-medium" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        {dateText}
                      </span>
                    );
                  },
                },
                {
                  header: "Time",
                  accessorKey: "time",
                  align: "left",
                  width: 125,
                  render: (apt) => (
                    <span className="text-xs text-slate-600 tabular-nums" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      {apt.time ? `${apt.time} (${apt.duration || 60}m)` : "—"}
                    </span>
                  ),
                },
                {
                  header: "Provider",
                  accessorKey: "employeeId",
                  align: "left",
                  width: 150,
                  render: (apt) => {
                    const emp = employees.find((e) => String(e.id) === String(apt.employeeId));
                    return (
                      <span className="text-xs text-slate-700 font-medium truncate">
                        {emp?.name || "Unassigned"}
                      </span>
                    );
                  },
                },
                {
                  header: "Service",
                  accessorKey: "serviceId",
                  align: "left",
                  minWidth: 150,
                  render: (apt) => {
                    const svc = services.find((s) => s.id === apt.serviceId);
                    return (
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {svc?.name || apt.title || "Consultation"}
                      </span>
                    );
                  },
                },
              ]}
                getRowId={(apt) => apt.id}
                onRowClick={(apt) => {
                  setSelectedAppointmentForDrawer(apt);
                  setIsDetailDrawerOpen(true);
                }}
                emptyMessage="No appointments found. Adjust your filters or book a new appointment."
                tableId="appointments-master-table"
                rowActions={[
                  {
                    label: "View Details",
                    icon: <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />,
                    onClick: (apt) => {
                      setSelectedAppointmentForDrawer(apt);
                      setIsDetailDrawerOpen(true);
                    },
                  },
                  {
                    label: "Reschedule",
                    icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
                    onClick: (apt) => openBookingDrawerForReschedule(apt),
                  },
                  {
                    label: "Mark as Complete",
                    icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />,
                    hidden: (apt) => apt.status === "completed",
                    onClick: (apt) => {
                      try {
                        appointmentService.completeAppointment(apt.id);
                        setAppointments(appointmentService.getAppointments() as any);
                        setStoreTick((t) => t + 1);
                        toast.success("Appointment marked as completed");
                      } catch (e) {
                        console.warn(e);
                      }
                    },
                  },
                  {
                    label: "Cancel / Delete",
                    icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />,
                    isDanger: true,
                    onClick: (apt) => {
                      try {
                        appointmentService.cancelAppointment(apt.id, "Cancelled by user");
                        setAppointments(appointmentService.getAppointments() as any);
                        toast.success("Appointment cancelled & invoice voided if unpaid");
                      } catch (e) {
                        console.warn(e);
                      }
                    },
                  },
                ]}
              />
          </div>
        )}

        {/* Availability & Days Off View */}
        {view === "availability" && (
          <TeamAvailabilityTab
            employees={employees}
            selectedUserId={selectedUserId}
            onSelectUser={setSelectedUserId}
            selectedLocationId={selectedLocationId}
            onSelectLocation={setSelectedLocationId}
            activeTab={availabilitySubTab}
            onTabChange={setAvailabilitySubTab}
          />
        )}
      </div>


      {/* Schedule Appointment Drawer */}
      <ScheduleAppointmentDrawer
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetBookingWorkflow();
        }}
        mode={drawerMode}
        values={{
          title: bookingTitle,
          description: bookingDescription,
          note: bookingNote,
          tags: bookingTags,
          processId: bookingProcessId,
          stageId: bookingStageId,
          date: selectedDate,
          startHour: bookingStartHour,
          startMinute: bookingStartMinute,
          sessionType: sessionType,
          client: selectedClient,
          provider: selectedProvider,
          serviceId: bookingServiceId,
          generateInvoice: bookingGenerateInvoice,
          lineItems: bookingLineItems,
          discountAmount: bookingDiscountAmount,
          location: bookingLocation,
          source: bookingSource,
        }}
        onChange={(patch) => {
          if (patch.title !== undefined) setBookingTitle(patch.title);
          if (patch.description !== undefined) setBookingDescription(patch.description);
          if (patch.note !== undefined) setBookingNote(patch.note);
          if (patch.tags !== undefined) setBookingTags(patch.tags);
          if (patch.processId !== undefined) setBookingProcessId(patch.processId);
          if (patch.stageId !== undefined) setBookingStageId(patch.stageId);
          if (patch.date !== undefined) setSelectedDate(patch.date);
          if (patch.startHour !== undefined) setBookingStartHour(patch.startHour);
          if (patch.startMinute !== undefined) setBookingStartMinute(patch.startMinute);
          if (patch.sessionType !== undefined) setSessionType(patch.sessionType);
          if (patch.location !== undefined) setBookingLocation(patch.location);
          if (patch.client !== undefined) setSelectedClient(patch.client);
          if (patch.provider !== undefined) setSelectedProvider(patch.provider as any);
          if (patch.serviceId !== undefined) setBookingServiceId(patch.serviceId);
          if (patch.generateInvoice !== undefined) setBookingGenerateInvoice(patch.generateInvoice);
          if (patch.lineItems !== undefined) setBookingLineItems(patch.lineItems);
          if (patch.discountAmount !== undefined) setBookingDiscountAmount(patch.discountAmount);
          if (patch.source !== undefined) setBookingSource(patch.source);
        }}
        onSave={handleBookingComplete}
        employees={employees}
        clients={clients}
        processStages={dynamicProcessStages}
        customFields={appointmentCustomFields}
        visibleCustomFieldKeys={apptVisibleFieldKeys}
        customFieldValues={customFieldValues}
        onCustomFieldChange={(key, val) => setCustomFieldValues((prev) => ({ ...prev, [key]: val }))}
        onOpenSelectFields={() => setApptSelectFieldsOpen(true)}
        onOpenCreateField={() => setApptCreateFieldOpen(true)}
      />

      {/* Appointment Select Fields Modal */}
      {apptSelectFieldsOpen && (
        <SelectFieldsModal
          initiallySelected={apptVisibleFieldKeys}
          onlyModules={["appointment"]}
          onClose={() => setApptSelectFieldsOpen(false)}
          onApply={keys => setApptVisibleFieldKeys(keys)}
        />
      )}

      {/* Appointment Create Field Modal */}
      {apptCreateFieldOpen && (
        <CreateFieldModal
          lockModule="appointment"
          onClose={() => setApptCreateFieldOpen(false)}
          onCreated={field => {
            setApptVisibleFieldKeys(prev => [...prev, field.key]);
          }}
        />
      )}

      {/* Appointment Detail Drawer */}
      <AppointmentDetailDrawer
        isOpen={isDetailDrawerOpen && Boolean(selectedAppointmentForDrawer)}
        onClose={() => {
          setIsDetailDrawerOpen(false);
          setSelectedAppointmentForDrawer(null);
        }}
        appointment={
          selectedAppointmentForDrawer
            ? appointments.find((a) => String(a.id) === String(selectedAppointmentForDrawer.id)) || selectedAppointmentForDrawer
            : null
        }
        onUpdateAppointment={(updated) => {
          setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
          setSelectedAppointmentForDrawer(updated);
        }}
        onReschedule={(apt) => {
          setIsDetailDrawerOpen(false);
          openBookingDrawerForReschedule(apt);
        }}
        onMarkComplete={(id) => {
          try {
            const completed = appointmentService.completeAppointment(id);
            setAppointments(appointmentService.getAppointments() as any);
            if (selectedAppointmentForDrawer && selectedAppointmentForDrawer.id === id) {
              setSelectedAppointmentForDrawer(completed);
            }
          } catch (e) {
            console.warn(e);
          }
        }}
        onDelete={(id) => {
          try {
            appointmentService.cancelAppointment(id, "Cancelled from drawer");
            setAppointments(appointmentService.getAppointments() as any);
            setIsDetailDrawerOpen(false);
            setSelectedAppointmentForDrawer(null);
            toast.success("Appointment cancelled & invoice voided if unpaid");
          } catch (e) {
            console.warn(e);
          }
        }}
        employees={employees}
        services={services}
      />

      <HowItWorksModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="How Appointments Works"
        summary="Appointments shows every upcoming, completed, and cancelled visit across your team. Switch between list and calendar views, and book new appointments in a few clicks."
        bullets={[
          "View appointments by provider or across the whole org",
          "Filter by status (Upcoming / Done / Pending)",
          "Book a new appointment via a guided 4-step flow",
          "Reschedule or cancel directly from a card",
        ]}
        guideUrl="/guide/appointments"
      />

      {/* Ambient AI Scribe Consultation Drawer */}
      <NewConsultationDrawer
        isOpen={showScribeModal}
        onClose={() => setShowScribeModal(false)}
        initialEntityType="appointment"
        zIndex={600}
        onSessionCreated={(session) => {
          setShowScribeModal(false);
          toast.success(`AI Scribe consultation saved for ${session.clientName || "Appointment"}!`);
        }}
      />

      {/* Floating AI Scribe Capsule Button in Bottom Right Corner of Appointments Page */}
      {!showScribeModal && (
        <div className="fixed bottom-6 right-6 pointer-events-auto z-40">
          <button
            type="button"
            onClick={() => setShowScribeModal(true)}
            className="group flex items-center gap-1.5 h-8 px-3 rounded-full bg-gradient-to-r from-[#181e25] to-[#2c3e50] hover:from-[#11161c] hover:to-[#22303e] text-white shadow-[0_4px_16px_rgba(0,0,0,0.35)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.45)] transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] cursor-pointer border border-white/20 select-none backdrop-blur-md"
            title="Open Ambient AI Scribe"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {/* Live Indicator Dot */}
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>

            <Mic className="h-3.5 w-3.5 text-white group-hover:scale-110 transition-transform flex-shrink-0" />
            <span className="text-xs font-semibold tracking-wide text-white leading-none">
              AI Scribe
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
