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
} from "lucide-react";
import { appointmentService } from "../../lib/appointmentService";
import { DEFAULT_ENTITY_PROCESSES, getStoredProcesses, Process, Stage } from "../../lib/useProcessStore";
import { appendActivity } from "../../lib/activityEngine";
import { logStageMove } from "../../lib/useAutomationStore";
import PageHeader from "../components/layout/PageHeader";
import PageTopBar from "../components/layout/PageTopBar";

import TableComponent, { TableColumn, TableRowAction } from "../components/ui/TableComponent";
import AppointmentDetailDrawer from "../components/appointments/AppointmentDetailDrawer";
import AppointmentCard from "../components/appointments/AppointmentCard";
import { useFieldRegistry, resolveVisibility } from "../context/FieldRegistryContext";
import { SelectFieldsModal, CreateFieldModal } from "../components/help/FieldManager";
import ScheduleAppointmentDrawer from "../components/appointments/ScheduleAppointmentDrawer";
import TeamAvailabilityTab from "../components/appointments/TeamAvailabilityTab";
import TargetUserLocationBar from "../components/appointments/TargetUserLocationBar";
import AppointmentCalendarView from "../components/appointments/AppointmentCalendarView";
import { useSearchParams } from "react-router";
import { useInvoices } from "../context/InvoiceContext";
import { initialClients } from "./ClientProfile";
import { useTeamMembers } from "../../lib/teamStore";

interface Appointment {
  id: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  employeeId: number | string;
  serviceId: number | string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: number; // in minutes
  status: "scheduled" | "completed" | "cancelled" | "no-show" | "pending-accept";
  notes?: string;
  rating?: number; // 1-5 stars for completed appointments
  // Extended fields (additive)
  title?: string;
  description?: string;
  tags?: string[];
  processId?: string;
  stageId?: string;
  currentStageId?: string;
  statusLabel?: string;
}

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
  const { invoices, createInvoiceFromAppointment, voidInvoice } = useInvoices();
  const { bookableMembers, teamMembers } = useTeamMembers();

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

  useEffect(() => {
    return appointmentService.subscribe((updated) => {
      setAppointments(updated as any);
    });
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

  // Dynamic appointment process and workflow stages
  const appointmentProcess: Process = useMemo(() => {
    const procs = getStoredProcesses();
    const found = procs.find((p) => p.entityType === "appointment");
    return found || DEFAULT_ENTITY_PROCESSES.appointment;
  }, []);

  const appointmentWorkflowStages: Stage[] = useMemo(() => {
    return appointmentProcess.stages || DEFAULT_ENTITY_PROCESSES.appointment.stages;
  }, [appointmentProcess]);

  const handleQuickStageChange = (apt: Appointment, targetStage: Stage) => {
    let newStatus: Appointment["status"] = apt.status;
    if (targetStage.systemCategory === "completed") newStatus = "completed";
    else if (targetStage.systemCategory === "cancelled") newStatus = "cancelled";
    else if (targetStage.systemCategory === "rescheduled") newStatus = "rescheduled" as any;
    else if (targetStage.systemCategory === "booked") newStatus = "scheduled";

    const updated = {
      ...apt,
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
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [editingRows, setEditingRows] = useState<{ [key: number]: Appointment }>({});
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [hoveredStageBox, setHoveredStageBox] = useState<{ aptId: number; stageIdx: number } | null>(null);
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
    sessionStorage.setItem("appointments_v1", JSON.stringify(appointments));
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
  const [bookingTitle, setBookingTitle] = useState("");
  const [bookingDescription, setBookingDescription] = useState("");
  const [bookingNote, setBookingNote] = useState("");
  const [bookingTags, setBookingTags] = useState("");
  const [bookingProcessId, setBookingProcessId] = useState("");
  const [bookingStageId, setBookingStageId] = useState("");
  const [bookingStartHour, setBookingStartHour] = useState(9);
  const [bookingStartMinute, setBookingStartMinute] = useState(0);
  const [drawerMode, setDrawerMode] = useState<"create" | "reschedule">("create");
  const [bookingServiceId, setBookingServiceId] = useState("");
  const [bookingGenerateInvoice, setBookingGenerateInvoice] = useState(true);
  const [bookingLineItems, setBookingLineItems] = useState<any[]>([]);
  const [bookingDiscountAmount, setBookingDiscountAmount] = useState(0);
  const [bookingLocation, setBookingLocation] = useState("Main Clinic — Suite 400");

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

  // Dynamic clients data loaded from sessionStorage + initialClients
  const [storedClients, setStoredClients] = useState<any[]>(() => {
    try {
      const raw = sessionStorage.getItem("clients");
      return raw ? JSON.parse(raw) : initialClients;
    } catch {
      return initialClients;
    }
  });

  useEffect(() => {
    const handleStorageUpdate = () => {
      try {
        const raw = sessionStorage.getItem("clients");
        if (raw) setStoredClients(JSON.parse(raw));
      } catch {
        // ignore
      }
    };
    window.addEventListener("storage", handleStorageUpdate);
    return () => window.removeEventListener("storage", handleStorageUpdate);
  }, []);

  const clients = (storedClients && storedClients.length > 0 ? storedClients : initialClients).map((c: any, idx: number) => ({
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
      id: apt.id * 1000,
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

    setShowAddModal(true);
  };

  const handleBookingComplete = () => {
    if (!selectedClient || !selectedProvider || !selectedDate || !bookingTitle.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const startHH = String(bookingStartHour).padStart(2, "0");
    const startMM = String(bookingStartMinute).padStart(2, "0");
    const timeStr = `${startHH}:${startMM}`;
    const parsedTags = bookingTags ? bookingTags.split(",").map((t) => t.trim()).filter(Boolean) : undefined;

    if (drawerMode === "reschedule" && selectedAppointment) {
      appointmentService.rescheduleAppointment(selectedAppointment.id, selectedDate, timeStr, bookingNote);
      toast.success("Appointment rescheduled successfully!");
    } else {
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
        title: bookingTitle.trim(),
        description: bookingDescription.trim() || undefined,
        tags: parsedTags,
        clientId: selectedClient.id ? String(selectedClient.id) : undefined,
        location: bookingLocation,
        sessionType,
        generateInvoice: bookingGenerateInvoice,
        lineItems: bookingLineItems && bookingLineItems.length > 0 ? bookingLineItems : undefined,
        source: "screen",
      });

      if (res.invoiceId) {
        toast.success(`Appointment scheduled — Invoice ${res.invoiceId} created!`);
      } else {
        toast.success("Appointment scheduled successfully!");
      }
    }

    setShowAddModal(false);
    resetBookingWorkflow();
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
    setBookingProcessId("");
    setBookingStageId("");
    setBookingStartHour(9);
    setBookingStartMinute(0);
    setBookingLocation("Main Clinic — Suite 400");

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
    const newAppointment: Appointment = {
      id: Math.max(...appointments.map((a) => a.id)) + 1,
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

    return matchesSearch && matchesEmployee && matchesTab && matchesStage;
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

        {/* Unified Search & Controls Toolbar powered by PageTopBar */}
        <PageTopBar
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
            {
              id: "stage",
              label: "Stage",
              type: "select",
              options: [
                { label: `All Stages (${statsSource.length})`, value: "all" },
                ...appointmentProcess.stages.map((stg) => ({
                  label: `${stg.name} (${statsSource.filter((a) => a.currentStageId === stg.id || a.status === stg.systemCategory).length})`,
                  value: stg.id,
                })),
              ],
              value: stageFilter,
              onChange: (v) => setStageFilter(v),
            },
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
          secondaryActions={
            view !== "availability" ? (
              <div className="flex items-center gap-2">
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="h-[36px] px-2.5 bg-input-background border border-input rounded-lg text-xs font-medium text-foreground focus:outline-none cursor-pointer"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                  title="Filter by Stage"
                >
                  <option value="all">All Stages ({statsSource.length})</option>
                  {appointmentProcess.stages.map((stg) => (
                    <option key={stg.id} value={stg.id}>
                      {stg.name} ({statsSource.filter((a) => a.currentStageId === stg.id || a.status === stg.systemCategory).length})
                    </option>
                  ))}
                </select>

                {devUserRole !== "provider" && (
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value === "all" ? "all" : Number(e.target.value))}
                    className="h-[36px] px-2.5 bg-input-background border border-input rounded-lg text-xs font-medium text-foreground focus:outline-none cursor-pointer"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                    title="Filter by Provider"
                  >
                    <option value="all">All Providers</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : null
          }
          primaryAction={{
            label: "Book Appointment",
            onClick: () => {
              resetBookingWorkflow();
              setShowAddModal(true);
            },
          }}
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
                  header: "Stages",
                  accessorKey: "currentStageId",
                  align: "left",
                  minWidth: 190,
                  render: (apt) => {
                    const stages = appointmentWorkflowStages;
                    const matchedStage =
                      stages.find(
                        (s) =>
                          s.id === apt.currentStageId ||
                          s.id === apt.stageId ||
                          s.name.toLowerCase() === (apt.statusLabel || "").toLowerCase() ||
                          s.systemCategory === apt.status
                      ) || stages[0];
                    const activeIdx = stages.findIndex((s) => s.id === matchedStage?.id);

                    return (
                      <div className="flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-[3px]">
                          {stages.map((stg, i) => {
                            const isCompleted = activeIdx >= 0 && i < activeIdx;
                            const isActive = activeIdx >= 0 && i === activeIdx;
                            const isHovered = hoveredStageBox?.aptId === apt.id && hoveredStageBox?.stageIdx === i;

                            return (
                              <div key={stg.id} className="relative">
                                {isHovered && (
                                  <div
                                    className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded text-[11px] font-medium shadow-md pointer-events-none"
                                    style={{ backgroundColor: "#1A2B4A", color: "#fff", zIndex: 200 }}
                                  >
                                    {stg.name}
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleQuickStageChange(apt, stg)}
                                  onMouseEnter={() => setHoveredStageBox({ aptId: apt.id, stageIdx: i })}
                                  onMouseLeave={() => setHoveredStageBox(null)}
                                  style={{
                                    width: "18px",
                                    height: "8px",
                                    borderRadius: "0px",
                                    backgroundColor: (isCompleted || isActive) ? (stg.color || "#1E88E5") : "transparent",
                                    border: (isCompleted || isActive) ? "none" : "1px solid #CBD5E1",
                                    cursor: "pointer",
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
                    label: "Mark Done",
                    icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />,
                    hidden: (apt) => apt.status === "completed",
                    onClick: (apt) => {
                      const updated = appointments.map((a) =>
                        a.id === apt.id ? { ...a, status: "completed" as const, rating: 5, statusLabel: "Completed" } : a
                      );
                      setAppointments(updated);
                      appointmentService.saveAppointments(updated as any);
                      toast.success("Appointment marked as completed");
                    },
                  },
                  {
                    label: "Cancel / Delete",
                    icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />,
                    isDanger: true,
                    onClick: (apt) => setConfirmDelete(apt.id),
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
        }}
        onSave={handleBookingComplete}
        employees={employees}
        clients={clients}
        processStages={processStages}
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
        appointment={selectedAppointmentForDrawer}
        onUpdateAppointment={(updated) => {
          setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
          setSelectedAppointmentForDrawer(updated);
        }}
        onReschedule={(apt) => {
          setIsDetailDrawerOpen(false);
          openBookingDrawerForReschedule(apt);
        }}
        onMarkComplete={(id) => {
          const updated = appointments.map((a) =>
            a.id === id ? { ...a, status: "completed" as const, rating: 5, statusLabel: "Completed" } : a
          );
          setAppointments(updated);
          appointmentService.saveAppointments(updated as any);
          if (selectedAppointmentForDrawer && selectedAppointmentForDrawer.id === id) {
            setSelectedAppointmentForDrawer({ ...selectedAppointmentForDrawer, status: "completed", rating: 5, statusLabel: "Completed" });
          }
        }}
        onDelete={(id) => {
          const updated = appointments.filter((a) => a.id !== id);
          setAppointments(updated);
          appointmentService.saveAppointments(updated as any);
          setIsDetailDrawerOpen(false);
          setSelectedAppointmentForDrawer(null);
          toast.success("Appointment removed");
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

    </div>
  );
}
