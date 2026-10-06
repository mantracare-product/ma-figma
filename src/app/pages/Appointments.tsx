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
  History,
  Undo2,
} from "lucide-react";
import { appointmentService } from "../../lib/appointmentService";
import { DEFAULT_ENTITY_PROCESSES, getStoredProcesses } from "../../lib/useProcessStore";
import { getStoredStageMoves, undoStageMove, StageMove } from "../../lib/useAutomationStore";
import PageHeader from "../components/layout/PageHeader";
import PageTopBar from "../components/layout/PageTopBar";
import StageMovementTimelineModal from "../components/automation/StageMovementTimelineModal";
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

  const appointmentProcess = useMemo(() => {
    const processes = getStoredProcesses();
    return processes.find((p) => p.entityType === "appointment") || DEFAULT_ENTITY_PROCESSES.appointment;
  }, []);

  const [appointments, setAppointments] = useState<Appointment[]>(() => appointmentService.getAppointments() as any);
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [stageMoves, setStageMoves] = useState<StageMove[]>(() => getStoredStageMoves());

  useEffect(() => {
    const handleMovesUpdate = () => setStageMoves(getStoredStageMoves());
    window.addEventListener("mantra_stage_moves_store_updated", handleMovesUpdate);
    return () => window.removeEventListener("mantra_stage_moves_store_updated", handleMovesUpdate);
  }, []);

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
  const [listViewTab, setListViewTab] = useState<"upcoming" | "done" | "pending" | "all">("all");
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [editingRows, setEditingRows] = useState<{ [key: number]: Appointment }>({});
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
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
    const matchesSearch =
      !query ||
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
    const matchesStage = stageFilter === "all" || apt.currentStageId === stageFilter || apt.status === stageFilter;

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
            <button
              type="button"
              onClick={() => setShowTimelineModal(true)}
              className="h-8 px-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Audit trail of stage movements and 1-click Undo"
            >
              <History className="w-3.5 h-3.5 text-blue-600" />
              <span>Stage History</span>
            </button>
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
        {/* List View */}
        {view === "list" && (
          <div className="space-y-4">
            {/* Subheader */}
            <div className="flex items-center justify-between" style={{ marginTop: '4px', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#9CA3AF', fontFamily: 'Outfit, sans-serif' }}>
                All sessions
              </span>
              <span style={{ fontSize: '12px', color: '#9CA3AF', fontFamily: 'Outfit, sans-serif' }}>
                Total {filteredAppointments.length}
              </span>
            </div>

            {/* Card Container */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: "12px",
                padding: "20px",
                width: "100%",
              }}
            >
              {filteredAppointments.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CalendarIcon className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: "#020817" }}>
                    No {listViewTab === "all" ? "" : listViewTab + " "}appointments found
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {searchQuery ? "Try adjusting your search" : listViewTab === "done" ? "No completed appointments yet" : "Get started by booking your first appointment"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredAppointments.map((apt) => {
                    const employee = employees.find((e) => String(e.id) === String(apt.employeeId));
                    const service = services.find((s) => s.id === apt.serviceId);

                    return (
                      <AppointmentCard
                        key={apt.id}
                        appointment={apt}
                        employee={employee}
                        service={service}
                        onCancel={(id) => {
                          setAppointments(appointments.map(a =>
                            a.id === id ? { ...a, status: "cancelled" } : a
                          ));
                          toast.success("Appointment cancelled");
                        }}
                        onReschedule={(id) => {
                          const apt = appointments.find(a => a.id === id);
                          if (apt) {
                            openBookingDrawerForReschedule(apt);
                          }
                        }}
                        onMarkComplete={(id) => {
                          setAppointments(appointments.map(a =>
                            a.id === id ? { ...a, status: "completed", rating: 4 } : a
                          ));
                          toast.success("Appointment marked as completed");
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Old Table Code - Keep for reference but hidden */}
            <div className="hidden bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: '#1C2B4A', height: '48px' }}>
                    <th style={{ width: '40px', padding: '0 12px' }}>
                      <input
                        type="checkbox"
                        checked={selectedRows.length === filteredAppointments.length && filteredAppointments.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRows(filteredAppointments.map(a => a.id));
                            const editing: { [key: number]: Appointment } = {};
                            filteredAppointments.forEach(apt => {
                              editing[apt.id] = { ...apt };
                            });
                            setEditingRows(editing);
                          } else {
                            setSelectedRows([]);
                            setEditingRows({});
                          }
                        }}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ width: '160px', padding: '0 12px', textAlign: 'left', color: '#FFFFFF', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'Outfit, sans-serif' }}>Client</th>
                    <th style={{ width: '180px', padding: '0 12px', textAlign: 'left', color: '#FFFFFF', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'Outfit, sans-serif' }}>Email</th>
                    <th style={{ width: '130px', padding: '0 12px', textAlign: 'left', color: '#FFFFFF', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'Outfit, sans-serif' }}>Phone</th>
                    <th style={{ width: '150px', padding: '0 12px', textAlign: 'left', color: '#FFFFFF', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'Outfit, sans-serif' }}>Date & Time</th>
                    <th style={{ width: '130px', padding: '0 12px', textAlign: 'left', color: '#FFFFFF', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'Outfit, sans-serif' }}>Provider</th>
                    <th style={{ width: '180px', padding: '0 12px', textAlign: 'left', color: '#FFFFFF', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'Outfit, sans-serif' }}>Service</th>
                    <th style={{ width: '80px', padding: '0 12px', textAlign: 'left', color: '#FFFFFF', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'Outfit, sans-serif' }}>Duration</th>
                    <th style={{ width: '110px', padding: '0 12px', textAlign: 'left', color: '#FFFFFF', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'Outfit, sans-serif' }}>Status</th>
                    <th style={{ width: '120px', padding: '0 12px', textAlign: 'left', color: '#FFFFFF', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'Outfit, sans-serif' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-16">
                        <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <CalendarIcon className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2" style={{ color: "#020817" }}>
                          No appointments found
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {searchQuery ? "Try adjusting your search" : "Get started by booking your first appointment"}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredAppointments.map((apt) => {
                      const employee = employees.find((e) => String(e.id) === String(apt.employeeId));
                      const service = services.find((s) => s.id === apt.serviceId);
                      const isSelected = selectedRows.includes(apt.id);
                      const isEditing = isSelected && editingRows[apt.id];
                      const editData = isEditing ? editingRows[apt.id] : apt;
                      const isDeleting = confirmDelete === apt.id;

                      const getStatusBadgeStyle = (status: Appointment["status"]) => {
                        switch (status) {
                          case "scheduled":
                            return { bg: '#DBEAFE', color: '#1D4ED8' };
                          case "completed":
                            return { bg: '#DCFCE7', color: '#15803D' };
                          case "pending-accept":
                            return { bg: '#FEF3C7', color: '#B45309' };
                          case "cancelled":
                            return { bg: '#FEE2E2', color: '#B91C1C' };
                          case "no-show":
                            return { bg: '#F3F4F6', color: '#6B7280' };
                          default:
                            return { bg: '#F3F4F6', color: '#6B7280' };
                        }
                      };

                      const statusStyle = getStatusBadgeStyle(apt.status);

                      return (
                        <tr
                          key={apt.id}
                          style={{
                            height: '52px',
                            borderBottom: '1px solid #F3F4F6',
                            backgroundColor: isDeleting ? '#FEF2F2' : '#FFFFFF',
                          }}
                        >
                          <td style={{ padding: '0 12px' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRows([...selectedRows, apt.id]);
                                  setEditingRows({ ...editingRows, [apt.id]: { ...apt } });
                                } else {
                                  setSelectedRows(selectedRows.filter(id => id !== apt.id));
                                  const newEditing = { ...editingRows };
                                  delete newEditing[apt.id];
                                  setEditingRows(newEditing);
                                }
                              }}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ padding: '0 12px' }}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editData.clientName}
                                onChange={(e) => {
                                  setEditingRows({
                                    ...editingRows,
                                    [apt.id]: { ...editData, clientName: e.target.value }
                                  });
                                }}
                                className="w-full px-2 py-1 border rounded"
                                style={{ fontSize: '13px', borderColor: '#1A73E8' }}
                              />
                            ) : (
                              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>
                                {apt.clientName}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0 12px' }}>
                            {isEditing ? (
                              <input
                                type="email"
                                value={editData.clientEmail}
                                onChange={(e) => {
                                  setEditingRows({
                                    ...editingRows,
                                    [apt.id]: { ...editData, clientEmail: e.target.value }
                                  });
                                }}
                                className="w-full px-2 py-1 border rounded"
                                style={{ fontSize: '13px', borderColor: '#1A73E8' }}
                              />
                            ) : (
                              <span style={{ fontSize: '13px', color: '#6B7280', fontFamily: 'Outfit, sans-serif' }}>
                                {apt.clientEmail}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0 12px' }}>
                            {isEditing ? (
                              <input
                                type="tel"
                                value={editData.clientPhone}
                                onChange={(e) => {
                                  setEditingRows({
                                    ...editingRows,
                                    [apt.id]: { ...editData, clientPhone: e.target.value }
                                  });
                                }}
                                className="w-full px-2 py-1 border rounded"
                                style={{ fontSize: '13px', borderColor: '#1A73E8' }}
                              />
                            ) : (
                              <span style={{ fontSize: '13px', color: '#6B7280', fontFamily: 'Outfit, sans-serif' }}>
                                {apt.clientPhone}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0 12px' }}>
                            {isEditing ? (
                              <div className="flex gap-1">
                                <input
                                  type="date"
                                  value={editData.date}
                                  onChange={(e) => {
                                    setEditingRows({
                                      ...editingRows,
                                      [apt.id]: { ...editData, date: e.target.value }
                                    });
                                  }}
                                  className="px-2 py-1 border rounded text-xs"
                                  style={{ borderColor: '#1A73E8', width: '90px' }}
                                />
                                <input
                                  type="time"
                                  value={editData.time}
                                  onChange={(e) => {
                                    setEditingRows({
                                      ...editingRows,
                                      [apt.id]: { ...editData, time: e.target.value }
                                    });
                                  }}
                                  className="px-2 py-1 border rounded text-xs"
                                  style={{ borderColor: '#1A73E8', width: '60px' }}
                                />
                              </div>
                            ) : (
                              <span style={{ fontSize: '13px', color: '#374151', fontFamily: 'Outfit, sans-serif' }}>
                                {new Date(apt.date + "T00:00:00").toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric"
                                })} · {apt.time}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0 12px' }}>
                            {isEditing ? (
                              <select
                                value={editData.employeeId}
                                onChange={(e) => {
                                  setEditingRows({
                                    ...editingRows,
                                    [apt.id]: { ...editData, employeeId: Number(e.target.value) }
                                  });
                                }}
                                className="w-full px-2 py-1 border rounded text-xs"
                                style={{ borderColor: '#1A73E8' }}
                              >
                                {employees.map((emp) => (
                                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                                ))}
                              </select>
                            ) : (
                              <span style={{ fontSize: '13px', color: '#374151', fontFamily: 'Outfit, sans-serif' }}>
                                {employee?.name}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0 12px' }}>
                            {isEditing ? (
                              <select
                                value={editData.serviceId}
                                onChange={(e) => {
                                  const selectedService = services.find(s => s.id === Number(e.target.value));
                                  setEditingRows({
                                    ...editingRows,
                                    [apt.id]: {
                                      ...editData,
                                      serviceId: Number(e.target.value),
                                      duration: selectedService?.duration || editData.duration
                                    }
                                  });
                                }}
                                className="w-full px-2 py-1 border rounded text-xs"
                                style={{ borderColor: '#1A73E8' }}
                              >
                                {services.map((svc) => (
                                  <option key={svc.id} value={svc.id}>
                                    {svc.name} - {svc.duration} min (${svc.price})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span style={{ fontSize: '13px', color: '#374151', fontFamily: 'Outfit, sans-serif' }}>
                                {service?.name}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0 12px' }}>
                            <span style={{ fontSize: '13px', color: '#6B7280', fontFamily: 'Outfit, sans-serif' }}>
                              {isEditing ? editData.duration : apt.duration} min
                            </span>
                          </td>
                          <td style={{ padding: '0 12px' }}>
                            {isEditing ? (
                              <select
                                value={editData.status}
                                onChange={(e) => {
                                  setEditingRows({
                                    ...editingRows,
                                    [apt.id]: { ...editData, status: e.target.value as Appointment["status"] }
                                  });
                                }}
                                className="w-full px-2 py-1 border rounded text-xs capitalize"
                                style={{ borderColor: '#1A73E8' }}
                              >
                                <option value="scheduled">Scheduled</option>
                                <option value="completed">Completed</option>
                                <option value="pending-accept">Pending Accept</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="no-show">No Show</option>
                              </select>
                            ) : (
                              <span
                                className="px-2 py-1 rounded-full text-xs font-semibold capitalize"
                                style={{
                                  backgroundColor: statusStyle.bg,
                                  color: statusStyle.color,
                                  fontFamily: 'Outfit, sans-serif',
                                }}
                              >
                                {apt.status}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0 12px' }}>
                            {isDeleting ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    handleDeleteAppointment(apt.id);
                                    setConfirmDelete(null);
                                  }}
                                  className="px-2 py-1 rounded text-xs font-semibold"
                                  style={{ backgroundColor: '#EF4444', color: '#FFFFFF' }}
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setConfirmDelete(null)}
                                  className="px-2 py-1 rounded text-xs font-semibold"
                                  style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}
                                >
                                  Undo
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleStatusChange(apt.id, "completed")}
                                  className="hover:opacity-80"
                                  title="Mark Complete"
                                  style={{ color: '#6B7280' }}
                                  onMouseEnter={(e) => (e.currentTarget.style.color = '#22C55E')}
                                  onMouseLeave={(e) => (e.currentTarget.style.color = '#6B7280')}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleStatusChange(apt.id, "no-show")}
                                  className="hover:opacity-80"
                                  title="Mark No Show"
                                  style={{ color: '#6B7280' }}
                                  onMouseEnter={(e) => (e.currentTarget.style.color = '#F97316')}
                                  onMouseLeave={(e) => (e.currentTarget.style.color = '#6B7280')}
                                >
                                  <AlertCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => openBookingDrawerForReschedule(apt)}
                                  className="hover:opacity-80"
                                  title="Edit"
                                  style={{ color: '#6B7280' }}
                                  onMouseEnter={(e) => (e.currentTarget.style.color = '#1A73E8')}
                                  onMouseLeave={(e) => (e.currentTarget.style.color = '#6B7280')}
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setConfirmDelete(apt.id)}
                                  className="hover:opacity-80"
                                  title="Cancel"
                                  style={{ color: '#6B7280' }}
                                  onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                                  onMouseLeave={(e) => (e.currentTarget.style.color = '#6B7280')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {/* End of old table code */}
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

      <StageMovementTimelineModal
        isOpen={showTimelineModal}
        onClose={() => setShowTimelineModal(false)}
        entityType="appointment"
        moves={stageMoves}
        title="Appointment Stage Movement History"
      />
    </div>
  );
}
