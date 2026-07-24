import { useState, useEffect } from "react";
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
} from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import AppointmentCard from "../components/appointments/AppointmentCard";
import { useFieldRegistry, resolveVisibility } from "../context/FieldRegistryContext";
import { SelectFieldsModal, CreateFieldModal } from "../components/help/FieldManager";

interface Appointment {
  id: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  employeeId: number;
  serviceId: number;
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
}

interface Employee {
  id: number;
  name: string;
  email: string;
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
  // Mock data
  const employees: Employee[] = [
    { id: 1, name: "John Smith", email: "john.smith@healthcare.com" },
    { id: 2, name: "Sarah Johnson", email: "sarah.j@healthcare.com" },
    { id: 4, name: "Emily Davis", email: "emily.d@healthcare.com" },
    { id: 5, name: "Dr. Robert Martinez", email: "robert.m@dentalcare.com" },
    { id: 6, name: "Lisa Anderson", email: "lisa.a@dentalcare.com" },
  ];

  const services: Service[] = [
    { id: 1, name: "Initial Consultation", duration: 60, price: 150 },
    { id: 2, name: "Follow-up Visit", duration: 30, price: 75 },
    { id: 3, name: "Dental Cleaning", duration: 45, price: 120 },
    { id: 4, name: "X-Ray Imaging", duration: 20, price: 80 },
  ];

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = sessionStorage.getItem("appointments_v1");
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [
      {
        id: 1,
        clientName: "James Wilson",
        clientEmail: "james.w@example.com",
        clientPhone: "+1 (555) 123-4567",
        employeeId: 1,
        serviceId: 1,
        date: "2026-05-12",
        time: "09:00",
        duration: 60,
        status: "pending-accept",
        notes: "First-time patient",
      },
      {
        id: 2,
        clientName: "Emma Brown",
        clientEmail: "emma.b@example.com",
        clientPhone: "+1 (555) 234-5678",
        employeeId: 2,
        serviceId: 2,
        date: "2026-05-12",
        time: "10:30",
        duration: 30,
        status: "scheduled",
      },
      {
        id: 3,
        clientName: "Oliver Davis",
        clientEmail: "oliver.d@example.com",
        clientPhone: "+1 (555) 345-6789",
        employeeId: 1,
        serviceId: 4,
        date: "2026-05-13",
        time: "14:00",
        duration: 20,
        status: "scheduled",
      },
      {
        id: 4,
        clientName: "Sophia Martinez",
        clientEmail: "sophia.m@example.com",
        clientPhone: "+1 (555) 456-7890",
        employeeId: 5,
        serviceId: 3,
        date: "2026-05-14",
        time: "11:00",
        duration: 45,
        status: "scheduled",
      },
    ];
  });

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"calendar" | "list">("list");
  const [calendarViewMode, setCalendarViewMode] = useState<"day" | "week" | "month" | "schedule">("month");
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
  const [appointmentFormData, setAppointmentFormData] = useState({
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

  useEffect(() => {
    sessionStorage.setItem("appointments_visibleFields", JSON.stringify(apptVisibleFieldKeys));
  }, [apptVisibleFieldKeys]);


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

  // Mock clients data
  const clients = [
    {
      id: 1,
      name: "James Wilson",
      email: "james.w@example.com",
      phone: "+1 (555) 123-4567",
      specialty: "Annual Checkup",
      avatar: "JW",
      availability: "Available Now",
      status: "Active",
      process: "Patient Intake",
      responsiblePerson: "John Smith"
    },
    {
      id: 2,
      name: "Emma Brown",
      email: "emma.b@example.com",
      phone: "+1 (555) 234-5678",
      specialty: "Follow-up Visit",
      avatar: "EB",
      availability: "Available Today",
      status: "Active",
      process: "Appointment Scheduling",
      responsiblePerson: "Sarah Johnson"
    },
    {
      id: 3,
      name: "Oliver Davis",
      email: "oliver.d@example.com",
      phone: "+1 (555) 345-6789",
      specialty: "Dental Cleaning",
      avatar: "OD",
      availability: "Available Tomorrow",
      status: "Inactive",
      process: "Follow-up Calls",
      responsiblePerson: "Emily Davis"
    },
    {
      id: 4,
      name: "Sophia Martinez",
      email: "sophia.m@example.com",
      phone: "+1 (555) 456-7890",
      specialty: "X-Ray Imaging",
      avatar: "SM",
      availability: "Available This Week",
      status: "Active",
      process: "Patient Intake",
      responsiblePerson: "John Smith"
    },
  ];

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
      const matchesEmployee = effectiveEmployeeFilter === "all" || apt.employeeId === effectiveEmployeeFilter;
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

  const handleBookingComplete = () => {
    if (!selectedClient || !selectedProvider || !selectedDate || !bookingTitle.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const startHH = String(bookingStartHour).padStart(2, "0");
    const startMM = String(bookingStartMinute).padStart(2, "0");
    const timeStr = `${startHH}:${startMM}`;

    const newAppointment: Appointment = {
      id: Math.max(...appointments.map((a) => a.id)) + 1,
      clientName: selectedClient.name,
      clientEmail: selectedClient.email,
      clientPhone: selectedClient.phone,
      employeeId: selectedProvider.id,
      serviceId: 1,
      date: selectedDate,
      time: timeStr,
      duration: 60,
      status: "scheduled",
      notes: bookingNote || `Session Type: ${sessionType === "video" ? "Video Call" : "In-Person"}`,
      title: bookingTitle.trim(),
      description: bookingDescription.trim() || undefined,
      tags: bookingTags ? bookingTags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
      processId: bookingProcessId || undefined,
      stageId: bookingStageId || undefined,
    };

    setAppointments([...appointments, newAppointment]);
    setShowAddModal(false);
    resetBookingWorkflow();
    toast.success("Appointment scheduled successfully!");
  };

  const resetBookingWorkflow = () => {
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
    setAppointments(appointments.filter((a) => a.id !== appointmentId));
    toast.success("Appointment cancelled");
  };

  const handleStatusChange = (appointmentId: number, status: Appointment["status"]) => {
    setAppointments(appointments.map((a) => (a.id === appointmentId ? { ...a, status } : a)));
    toast.success(`Appointment marked as ${status}`);
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
    const matchesSearch =
      apt.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.clientEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEmployee = effectiveEmployeeFilter === "all" || apt.employeeId === effectiveEmployeeFilter;

    // Filter by list view tab (only applies when in list view)
    let matchesTab = true;
    if (view === "list") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const aptDate = new Date(apt.date + "T00:00:00");

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
    }

    return matchesSearch && matchesEmployee && matchesTab;
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
    <div className="min-h-screen" style={{ backgroundColor: "#F9FAFB" }}>
      <div className="py-6 px-[150px] space-y-8">
        <PageHeader title="Appointments" subtitle="See who's booked, confirm pending requests, and schedule new visits">
          {/* DEV ONLY: Role toggle for testing admin vs provider booking flow */}
          <div className="flex items-center gap-3">
            <HowItWorksButton label="How Appointments Works" onClick={() => setShowHelp(true)} />
            <span style={{ fontSize: '11px', color: '#9CA3AF', fontStyle: 'italic', fontFamily: 'Outfit, sans-serif' }}>
              Dev only — view as:
            </span>
            <div className="flex items-center bg-white border" style={{ borderColor: '#E5E7EB', borderRadius: '6px', overflow: 'hidden' }}>
              <button
                onClick={() => setDevUserRole("admin")}
                style={{
                  height: '28px',
                  padding: '0 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: devUserRole === "admin" ? "#FFFFFF" : "#6B7280",
                  backgroundColor: devUserRole === "admin" ? "#1A73E8" : "#FFFFFF",
                  border: 'none',
                  fontFamily: 'Outfit, sans-serif',
                }}
              >
                Admin
              </button>
              <button
                onClick={() => setDevUserRole("provider")}
                style={{
                  height: '28px',
                  padding: '0 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: devUserRole === "provider" ? "#FFFFFF" : "#6B7280",
                  backgroundColor: devUserRole === "provider" ? "#1A73E8" : "#FFFFFF",
                  border: 'none',
                  fontFamily: 'Outfit, sans-serif',
                }}
              >
                Individual Provider
              </button>
            </div>
          </div>
        </PageHeader>

        {/* Stats Capsules */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 px-4 py-2.5 border"
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderColor: 'rgba(59, 130, 246, 0.2)',
              borderRadius: '999px',
              height: '40px'
            }}
          >
            <CalendarIcon className="w-4 h-4" style={{ color: '#3B82F6' }} />
            <span className="font-semibold" style={{ fontSize: '14px', color: '#020817' }}>{stats.total}</span>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Total Appointments</span>
          </div>

          <div
            className="flex items-center gap-2 px-4 py-2.5 border"
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderColor: 'rgba(59, 130, 246, 0.2)',
              borderRadius: '999px',
              height: '40px'
            }}
          >
            <Clock className="w-4 h-4" style={{ color: '#3B82F6' }} />
            <span className="font-semibold" style={{ fontSize: '14px', color: '#020817' }}>{stats.scheduled}</span>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Scheduled</span>
          </div>

          <div
            className="flex items-center gap-2 px-4 py-2.5 border"
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              borderColor: 'rgba(16, 185, 129, 0.2)',
              borderRadius: '999px',
              height: '40px'
            }}
          >
            <CheckCircle className="w-4 h-4" style={{ color: '#10B981' }} />
            <span className="font-semibold" style={{ fontSize: '14px', color: '#020817' }}>{stats.completed}</span>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Completed</span>
          </div>

          <div
            className="flex items-center gap-2 px-4 py-2.5 border"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderColor: 'rgba(239, 68, 68, 0.2)',
              borderRadius: '999px',
              height: '40px'
            }}
          >
            <XCircle className="w-4 h-4" style={{ color: '#EF4444' }} />
            <span className="font-semibold" style={{ fontSize: '14px', color: '#020817' }}>{stats.cancelled}</span>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Cancelled</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search appointments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {devUserRole === "admin" && (
            <div className="relative">
              <button
                onClick={() => setShowProviderDropdown(!showProviderDropdown)}
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm bg-white hover:bg-gray-50 transition-colors"
                style={{ height: '36px' }}
              >
                <User className="w-4 h-4 text-muted-foreground" />
                <span>{selectedEmployee === "all" ? "All Providers" : employees.find(e => e.id === selectedEmployee)?.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              {showProviderDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProviderDropdown(false)} />
                  <div
                    className="absolute left-0 mt-2 z-50 bg-white border border-slate-200 rounded-xl shadow-lg py-1"
                    style={{ width: '220px', top: '100%' }}
                  >
                    <button
                      onClick={() => { setSelectedEmployee("all"); setShowProviderDropdown(false); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${selectedEmployee === "all" ? "text-blue-600 font-semibold" : "text-slate-700"}`}
                    >
                      All Providers
                    </button>
                    {employees.map((emp) => (
                      <button
                        key={emp.id}
                        onClick={() => { setSelectedEmployee(emp.id); setShowProviderDropdown(false); }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${selectedEmployee === emp.id ? "text-blue-600 font-semibold" : "text-slate-700"}`}
                      >
                        {emp.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="relative">
            <button
              onClick={() => setShowFilterModal(!showFilterModal)}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm bg-white hover:bg-gray-50 transition-colors"
              style={{ height: '36px' }}
            >
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span>Filters</span>
            </button>
            {showFilterModal && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowFilterModal(false)} />
                <div
                  className="absolute right-0 mt-2 z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-4 space-y-4"
                  style={{ width: '320px', top: '100%' }}
                >
                  <div>
                    <div className="flex items-center gap-1 mb-2">
                      <label className="block text-xs font-semibold text-slate-700">Date Range</label>
                      <InfoTooltip text="Only show appointments that fall in this date range." />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {["Today", "This Week", "This Month", "Custom"].map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setFilterDate(opt)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium border ${filterDate === opt ? "border-cyan-500 bg-cyan-50 text-cyan-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {filterDate === "Custom" && (
                      <div className="flex gap-2 mt-2">
                        <input type="date" className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                        <input type="date" className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">Status</label>
                    <div className="flex flex-wrap gap-2">
                      {["All", "Scheduled", "Completed", "Cancelled", "No-show", "Pending"].map((status) => (
                        <button
                          key={status}
                          onClick={() => setFilterStatus(status)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border ${filterStatus === status ? "border-cyan-500 bg-cyan-50 text-cyan-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowFilterModal(false);
                      toast.success("Filters applied");
                    }}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold text-white"
                    style={{ background: 'linear-gradient(to right, #06B6D4, #1A73E8)' }}
                  >
                    Apply Filters
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("list")}
              className="transition-all"
              style={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: view === "list" ? "#1A73E8" : "#FFFFFF",
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
              }}
              title="List View"
            >
              <List className="w-4 h-4" style={{ color: view === "list" ? "#FFFFFF" : "#6B7280" }} />
            </button>
            <button
              onClick={() => setView("calendar")}
              className="transition-all"
              style={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: view === "calendar" ? "#1A73E8" : "#FFFFFF",
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
              }}
              title="Calendar View"
            >
              <CalendarIcon className="w-4 h-4" style={{ color: view === "calendar" ? "#FFFFFF" : "#6B7280" }} />
            </button>
          </div>

          <Button
            variant="primary"
            onClick={() => {
              resetBookingWorkflow();
              setShowAddModal(true);
            }}
            style={{ width: '160px', height: '36px' }}
          >
            <Plus className="w-4 h-4" />
            Book Appointment
          </Button>
        </div>

        {/* Calendar View */}
        {view === "calendar" && (
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
            {/* DAY VIEW */}
            {currentCalendarViewMode === "day" && (
              <>
                {/* Day View Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold" style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}>
                      {currentDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </h2>
                    <p className="text-sm" style={{ color: "#6B7280", fontFamily: "Outfit, sans-serif" }}>
                      {currentDate.toLocaleDateString("en-US", { weekday: "long" })}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* View Mode Tabs */}
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center bg-white border" style={{ borderColor: '#E5E7EB', borderRadius: '6px', overflow: 'hidden' }}>
                        <button
                          onClick={() => setCalendarViewMode("day")}
                          style={{
                            width: '64px',
                            height: '32px',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: calendarViewMode === "day" ? "#FFFFFF" : "#6B7280",
                            backgroundColor: calendarViewMode === "day" ? "#1A73E8" : "#FFFFFF",
                            border: 'none',
                            fontFamily: 'Outfit, sans-serif',
                          }}
                        >
                          Day
                        </button>
                        <button
                          onClick={() => setCalendarViewMode("week")}
                          style={{
                            width: '64px',
                            height: '32px',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: calendarViewMode === "week" ? "#FFFFFF" : "#6B7280",
                            backgroundColor: calendarViewMode === "week" ? "#1A73E8" : "#FFFFFF",
                            border: 'none',
                            fontFamily: 'Outfit, sans-serif',
                          }}
                        >
                          Week
                        </button>
                        <button
                          onClick={() => setCalendarViewMode("month")}
                          style={{
                            width: '64px',
                            height: '32px',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: calendarViewMode === "month" ? "#FFFFFF" : "#6B7280",
                            backgroundColor: calendarViewMode === "month" ? "#1A73E8" : "#FFFFFF",
                            border: 'none',
                            fontFamily: 'Outfit, sans-serif',
                          }}
                        >
                          Month
                        </button>
                        <button
                          onClick={() => setCalendarViewMode("schedule")}
                          style={{
                            width: '64px',
                            height: '32px',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: calendarViewMode === "schedule" ? "#FFFFFF" : "#6B7280",
                            backgroundColor: calendarViewMode === "schedule" ? "#1A73E8" : "#FFFFFF",
                            border: 'none',
                            fontFamily: 'Outfit, sans-serif',
                          }}
                        >
                          Schedule
                        </button>
                      </div>
                      <InfoTooltip text="Choose how far ahead you want to see your schedule." />
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigateDay("prev")}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                        Today
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigateDay("next")}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Time Grid */}
                <div className="flex">
                  {/* Time labels column */}
                  <div style={{ width: '60px', paddingTop: '0px' }}>
                    {Array.from({ length: 10 }, (_, i) => i + 9).map((hour) => (
                      <div
                        key={hour}
                        style={{
                          height: '60px',
                          fontSize: '11px',
                          color: '#9CA3AF',
                          textAlign: 'right',
                          paddingRight: '12px',
                          paddingTop: '4px',
                          fontFamily: 'Outfit, sans-serif',
                        }}
                      >
                        {String(hour).padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>

                  {/* Day column */}
                  <div style={{ flex: 1, position: 'relative', backgroundColor: formatDate(currentDate) === formatDate(new Date()) ? '#EFF6FF' : '#FFFFFF' }}>
                    {/* Hour grid lines */}
                    {Array.from({ length: 10 }, (_, i) => i).map((i) => (
                      <div
                        key={i}
                        style={{
                          position: 'absolute',
                          top: `${i * 60}px`,
                          left: 0,
                          right: 0,
                          height: '60px',
                          borderTop: '1px solid #F3F4F6',
                        }}
                      />
                    ))}

                    {/* Appointment blocks */}
                    {getAppointmentsForDate(formatDate(currentDate)).map((apt) => {
                      const [hours, minutes] = apt.time.split(':').map(Number);
                      const topPosition = ((hours - 9) * 60) + minutes;
                      const height = Math.max(apt.duration, 40);

                      const employee = employees.find((e) => e.id === apt.employeeId);
                      const service = services.find((s) => s.id === apt.serviceId);
                      const endHour = hours + Math.floor((minutes + apt.duration) / 60);
                      const endMinute = (minutes + apt.duration) % 60;

                      return (
                        <div
                          key={apt.id}
                          onClick={() => openEditModal(apt)}
                          className="cursor-pointer hover:opacity-90"
                          style={{
                            position: 'absolute',
                            top: `${topPosition}px`,
                            left: '8px',
                            right: '8px',
                            height: `${height}px`,
                            minHeight: '40px',
                            backgroundColor: '#DBEAFE',
                            borderLeft: '3px solid #1A73E8',
                            borderRadius: '4px',
                            padding: '8px',
                            zIndex: 5,
                            overflow: 'hidden',
                          }}
                        >
                          <div style={{ fontSize: '11px', color: '#1A73E8', fontFamily: 'Outfit, sans-serif', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {apt.time} – {String(endHour).padStart(2, '0')}:{String(endMinute).padStart(2, '0')}
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#111827', fontFamily: 'DM Sans, sans-serif', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {apt.clientName}
                          </div>
                          <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'Outfit, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {service?.name} · {employee?.name}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* WEEK VIEW */}
            {currentCalendarViewMode === "week" && (() => {
              const weekDates = getWeekDates(currentDate);
              const todayStr = formatDate(new Date());

              return (
                <>
                  {/* Week View Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold" style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}>
                      {monthNames[currentDate.getMonth()]}
                    </h2>

                    <div className="flex items-center gap-3">
                      {/* View Mode Tabs */}
                      <div className="flex items-center bg-white border" style={{ borderColor: '#E5E7EB', borderRadius: '6px', overflow: 'hidden' }}>
                        <button
                          onClick={() => setCalendarViewMode("day")}
                          style={{
                            width: '64px',
                            height: '32px',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: calendarViewMode === "day" ? "#FFFFFF" : "#6B7280",
                            backgroundColor: calendarViewMode === "day" ? "#1A73E8" : "#FFFFFF",
                            border: 'none',
                            fontFamily: 'Outfit, sans-serif',
                          }}
                        >
                          Day
                        </button>
                        <button
                          onClick={() => setCalendarViewMode("week")}
                          style={{
                            width: '64px',
                            height: '32px',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: calendarViewMode === "week" ? "#FFFFFF" : "#6B7280",
                            backgroundColor: calendarViewMode === "week" ? "#1A73E8" : "#FFFFFF",
                            border: 'none',
                            fontFamily: 'Outfit, sans-serif',
                          }}
                        >
                          Week
                        </button>
                        <button
                          onClick={() => setCalendarViewMode("month")}
                          style={{
                            width: '64px',
                            height: '32px',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: calendarViewMode === "month" ? "#FFFFFF" : "#6B7280",
                            backgroundColor: calendarViewMode === "month" ? "#1A73E8" : "#FFFFFF",
                            border: 'none',
                            fontFamily: 'Outfit, sans-serif',
                          }}
                        >
                          Month
                        </button>
                        <button
                          onClick={() => setCalendarViewMode("schedule")}
                          style={{
                            width: '64px',
                            height: '32px',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: calendarViewMode === "schedule" ? "#FFFFFF" : "#6B7280",
                            backgroundColor: calendarViewMode === "schedule" ? "#1A73E8" : "#FFFFFF",
                            border: 'none',
                            fontFamily: 'Outfit, sans-serif',
                          }}
                        >
                          Schedule
                        </button>
                      </div>

                      {/* Navigation */}
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigateWeek("prev")}>
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                          Today
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => navigateWeek("next")}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Day headers */}
                  <div className="flex mb-4">
                    <div style={{ width: '60px' }} />
                    {weekDates.map((date, i) => {
                      const dateStr = formatDate(date);
                      const isToday = dateStr === todayStr;
                      const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
                      const dayNum = date.getDate();

                      return (
                        <div key={i} style={{ flex: 1, textAlign: 'center', fontFamily: 'Outfit, sans-serif' }}>
                          <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>{dayName}</div>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              fontSize: '14px',
                              fontWeight: 600,
                              color: isToday ? '#FFFFFF' : '#111827',
                              backgroundColor: isToday ? '#06B6D4' : 'transparent',
                              borderRadius: '50%',
                            }}
                          >
                            {dayNum}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Time Grid */}
                  <div className="flex">
                    {/* Time labels column */}
                    <div style={{ width: '60px', paddingTop: '0px' }}>
                      {Array.from({ length: 10 }, (_, i) => i + 9).map((hour) => (
                        <div
                          key={hour}
                          style={{
                            height: '60px',
                            fontSize: '11px',
                            color: '#9CA3AF',
                            textAlign: 'right',
                            paddingRight: '12px',
                            paddingTop: '4px',
                            fontFamily: 'Outfit, sans-serif',
                          }}
                        >
                          {String(hour).padStart(2, '0')}:00
                        </div>
                      ))}
                    </div>

                    {/* Week columns */}
                    <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
                      {weekDates.map((date, dayIndex) => {
                        const dateStr = formatDate(date);
                        const isToday = dateStr === todayStr;

                        return (
                          <div
                            key={dayIndex}
                            style={{
                              flex: 1,
                              position: 'relative',
                              backgroundColor: isToday ? '#EFF6FF' : '#FFFFFF',
                              borderRight: dayIndex < 6 ? '1px solid #F3F4F6' : 'none',
                            }}
                          >
                            {/* Hour grid lines */}
                            {Array.from({ length: 10 }, (_, i) => i).map((i) => (
                              <div
                                key={i}
                                style={{
                                  position: 'absolute',
                                  top: `${i * 60}px`,
                                  left: 0,
                                  right: 0,
                                  height: '60px',
                                  borderTop: '1px solid #F3F4F6',
                                }}
                              />
                            ))}

                            {/* Appointment blocks */}
                            {getAppointmentsForDate(dateStr).map((apt) => {
                              const [hours, minutes] = apt.time.split(':').map(Number);
                              const topPosition = ((hours - 9) * 60) + minutes;
                              const height = Math.max(apt.duration, 40);

                              const employee = employees.find((e) => e.id === apt.employeeId);
                              const service = services.find((s) => s.id === apt.serviceId);
                              const endHour = hours + Math.floor((minutes + apt.duration) / 60);
                              const endMinute = (minutes + apt.duration) % 60;

                              return (
                                <div
                                  key={apt.id}
                                  onClick={() => openEditModal(apt)}
                                  className="cursor-pointer hover:opacity-90"
                                  style={{
                                    position: 'absolute',
                                    top: `${topPosition}px`,
                                    left: '4px',
                                    right: '4px',
                                    height: `${height}px`,
                                    minHeight: '40px',
                                    backgroundColor: '#DBEAFE',
                                    borderLeft: '3px solid #1A73E8',
                                    borderRadius: '4px',
                                    padding: '6px',
                                    zIndex: 5,
                                    overflow: 'hidden',
                                  }}
                                >
                                  <div style={{ fontSize: '11px', color: '#1A73E8', fontFamily: 'Outfit, sans-serif', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {apt.time} – {String(endHour).padStart(2, '0')}:{String(endMinute).padStart(2, '0')}
                                  </div>
                                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#111827', fontFamily: 'DM Sans, sans-serif', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {apt.clientName}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'Outfit, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {service?.name} · {employee?.name}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })()}

            {/* SCHEDULE VIEW */}
            {currentCalendarViewMode === "schedule" && (() => {
              // Get all appointments for the current month, grouped by date
              const monthAppointments = appointments.filter((apt) => {
                const aptDate = new Date(apt.date + "T00:00:00");
                const matchesEmployee = effectiveEmployeeFilter === "all" || apt.employeeId === effectiveEmployeeFilter;
                return aptDate.getMonth() === month && aptDate.getFullYear() === year && matchesEmployee;
              });

              // Group by date
              const groupedByDate: { [key: string]: Appointment[] } = {};
              monthAppointments.forEach((apt) => {
                if (!groupedByDate[apt.date]) {
                  groupedByDate[apt.date] = [];
                }
                groupedByDate[apt.date].push(apt);
              });

              // Sort dates
              const sortedDates = Object.keys(groupedByDate).sort();

              return (
                <>
                  {/* Schedule View Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold" style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}>
                      {monthNames[month]}, {year}
                    </h2>

                    <div className="flex items-center gap-3">
                      {/* View Mode Tabs */}
                      <div className="flex items-center bg-white border" style={{ borderColor: '#E5E7EB', borderRadius: '6px', overflow: 'hidden' }}>
                        <button
                          onClick={() => setCalendarViewMode("day")}
                          style={{
                            width: '64px',
                            height: '32px',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: calendarViewMode === "day" ? "#FFFFFF" : "#6B7280",
                            backgroundColor: calendarViewMode === "day" ? "#1A73E8" : "#FFFFFF",
                            border: 'none',
                            fontFamily: 'Outfit, sans-serif',
                          }}
                        >
                          Day
                        </button>
                        <button
                          onClick={() => setCalendarViewMode("week")}
                          style={{
                            width: '64px',
                            height: '32px',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: calendarViewMode === "week" ? "#FFFFFF" : "#6B7280",
                            backgroundColor: calendarViewMode === "week" ? "#1A73E8" : "#FFFFFF",
                            border: 'none',
                            fontFamily: 'Outfit, sans-serif',
                          }}
                        >
                          Week
                        </button>
                        <button
                          onClick={() => setCalendarViewMode("month")}
                          style={{
                            width: '64px',
                            height: '32px',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: calendarViewMode === "month" ? "#FFFFFF" : "#6B7280",
                            backgroundColor: calendarViewMode === "month" ? "#1A73E8" : "#FFFFFF",
                            border: 'none',
                            fontFamily: 'Outfit, sans-serif',
                          }}
                        >
                          Month
                        </button>
                        <button
                          onClick={() => setCalendarViewMode("schedule")}
                          style={{
                            width: '64px',
                            height: '32px',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: calendarViewMode === "schedule" ? "#FFFFFF" : "#6B7280",
                            backgroundColor: calendarViewMode === "schedule" ? "#1A73E8" : "#FFFFFF",
                            border: 'none',
                            fontFamily: 'Outfit, sans-serif',
                          }}
                        >
                          Schedule
                        </button>
                      </div>

                      {/* Navigation */}
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                          Today
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-6">
                    {/* Schedule list */}
                    <div style={{ flex: 1 }}>
                      {sortedDates.length === 0 ? (
                        <div className="text-center py-16">
                          <CalendarIcon className="w-16 h-16 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
                          <h3 className="text-lg font-bold mb-2" style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}>
                            There are no appointments
                          </h3>
                          <Button variant="primary" className="mt-4" onClick={() => {
                            resetBookingWorkflow();
                            setShowAddModal(true);
                          }}>
                            Book Appointment
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {sortedDates.map((dateStr) => {
                            const date = new Date(dateStr + "T00:00:00");
                            const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
                            const monthDay = date.toLocaleDateString("en-US", { month: "long", day: "numeric" });

                            return (
                              <div key={dateStr}>
                                {/* Date section header */}
                                <div className="flex items-center gap-3 mb-3">
                                  <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }} />
                                  <div style={{ fontSize: '12px', color: '#6B7280', fontFamily: 'Outfit, sans-serif', whiteSpace: 'nowrap' }}>
                                    {monthDay}, {dayName}
                                  </div>
                                  <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }} />
                                </div>

                                {/* Appointments for this date */}
                                <div className="space-y-0">
                                  {groupedByDate[dateStr].map((apt) => {
                                    const employee = employees.find((e) => e.id === apt.employeeId);
                                    const service = services.find((s) => s.id === apt.serviceId);
                                    const [hours, minutes] = apt.time.split(':').map(Number);
                                    const endHour = hours + Math.floor((minutes + apt.duration) / 60);
                                    const endMinute = (minutes + apt.duration) % 60;

                                    return (
                                      <div
                                        key={apt.id}
                                        onClick={() => openEditModal(apt)}
                                        className="cursor-pointer hover:bg-muted/30 transition-colors"
                                        style={{
                                          height: '56px',
                                          borderBottom: '1px solid #F3F4F6',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '12px',
                                          padding: '0 12px',
                                        }}
                                      >
                                        {/* Time column */}
                                        <div style={{ width: '120px', fontSize: '12px', color: '#6B7280', fontFamily: 'Outfit, sans-serif' }}>
                                          {apt.time} – {String(endHour).padStart(2, '0')}:{String(endMinute).padStart(2, '0')}
                                        </div>

                                        {/* Color dot */}
                                        <div
                                          style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            backgroundColor: '#1A73E8',
                                            flexShrink: 0,
                                          }}
                                        />

                                        {/* Patient info */}
                                        <div style={{ flex: 1 }}>
                                          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#111827', fontFamily: 'DM Sans, sans-serif', marginBottom: '2px' }}>
                                            {apt.clientName}
                                          </div>
                                          <div style={{ fontSize: '12px', color: '#9CA3AF', fontFamily: 'Outfit, sans-serif' }}>
                                            {service?.name} · {employee?.name}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Mini month calendar */}
                    <div style={{ width: '220px', flexShrink: 0 }}>
                      <div className="bg-white border rounded-lg p-4" style={{ borderColor: '#E5E7EB' }}>
                        <div className="text-center mb-3" style={{ fontSize: '13px', fontWeight: 600, color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>
                          {monthNames[month]} {year}
                        </div>

                        {/* Mini calendar grid */}
                        <div className="grid grid-cols-7 gap-1">
                          {/* Day headers */}
                          {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                            <div
                              key={i}
                              className="text-center"
                              style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                color: '#9CA3AF',
                                padding: '4px 0',
                                fontFamily: 'Outfit, sans-serif',
                              }}
                            >
                              {day}
                            </div>
                          ))}

                          {/* Empty cells */}
                          {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                            <div key={`empty-${i}`} />
                          ))}

                          {/* Calendar days */}
                          {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const dateStr = formatDate(new Date(year, month, day));
                            const isToday = dateStr === formatDate(new Date());

                            return (
                              <div
                                key={day}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '24px',
                                  height: '24px',
                                  fontSize: '11px',
                                  fontWeight: isToday ? 600 : 400,
                                  color: isToday ? '#FFFFFF' : '#374151',
                                  backgroundColor: isToday ? '#06B6D4' : 'transparent',
                                  borderRadius: '50%',
                                  fontFamily: 'Outfit, sans-serif',
                                }}
                              >
                                {day}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}

            {/* MONTH VIEW */}
            {currentCalendarViewMode === "month" && (
              <>
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold" style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}>
                    {monthNames[month]} {year}
                  </h2>

                  <div className="flex items-center gap-3">
                    {/* View Mode Tabs */}
                    <div className="flex items-center bg-white border" style={{ borderColor: '#E5E7EB', borderRadius: '6px', overflow: 'hidden' }}>
                      <button
                        onClick={() => setCalendarViewMode("day")}
                        style={{
                          width: '64px',
                          height: '32px',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: calendarViewMode === "day" ? "#FFFFFF" : "#6B7280",
                          backgroundColor: calendarViewMode === "day" ? "#1A73E8" : "#FFFFFF",
                          border: 'none',
                          fontFamily: 'Outfit, sans-serif',
                        }}
                      >
                        Day
                      </button>
                      <button
                        onClick={() => setCalendarViewMode("week")}
                        style={{
                          width: '64px',
                          height: '32px',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: calendarViewMode === "week" ? "#FFFFFF" : "#6B7280",
                          backgroundColor: calendarViewMode === "week" ? "#1A73E8" : "#FFFFFF",
                          border: 'none',
                          fontFamily: 'Outfit, sans-serif',
                        }}
                      >
                        Week
                      </button>
                      <button
                        onClick={() => setCalendarViewMode("month")}
                        style={{
                          width: '64px',
                          height: '32px',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: calendarViewMode === "month" ? "#FFFFFF" : "#6B7280",
                          backgroundColor: calendarViewMode === "month" ? "#1A73E8" : "#FFFFFF",
                          border: 'none',
                          fontFamily: 'Outfit, sans-serif',
                        }}
                      >
                        Month
                      </button>
                      <button
                        onClick={() => setCalendarViewMode("schedule")}
                        style={{
                          width: '64px',
                          height: '32px',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: calendarViewMode === "schedule" ? "#FFFFFF" : "#6B7280",
                          backgroundColor: calendarViewMode === "schedule" ? "#1A73E8" : "#FFFFFF",
                          border: 'none',
                          fontFamily: 'Outfit, sans-serif',
                        }}
                      >
                        Schedule
                      </button>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                        Today
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-0">
                  {/* Day headers */}
                  {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
                    <div
                      key={day}
                      className="text-center py-2"
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#9CA3AF',
                        textTransform: 'uppercase',
                        fontFamily: 'Outfit, sans-serif',
                      }}
                    >
                      {day}
                    </div>
                  ))}

                  {/* Empty cells for days before month starts */}
                  {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="border bg-muted/30"
                      style={{
                        minHeight: '120px',
                        borderColor: '#E5E7EB',
                        borderWidth: '1px',
                      }}
                    />
                  ))}

                  {/* Calendar days */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = formatDate(new Date(year, month, day));
                    const dayAppointments = getAppointmentsForDate(dateStr);
                    const isToday = dateStr === formatDate(new Date());

                    return (
                      <div
                        key={day}
                        className="border bg-white"
                        style={{
                          minHeight: '120px',
                          borderColor: '#E5E7EB',
                          borderWidth: '1px',
                          padding: '8px',
                          position: 'relative',
                        }}
                      >
                        {/* Date number */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: isToday ? '#FFFFFF' : '#374151',
                            backgroundColor: isToday ? '#1A73E8' : 'transparent',
                            width: isToday ? '24px' : 'auto',
                            height: isToday ? '24px' : 'auto',
                            borderRadius: isToday ? '50%' : '0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: 'DM Sans, sans-serif',
                          }}
                        >
                          {day}
                        </div>

                        {/* Events */}
                        <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {dayAppointments.slice(0, 2).map((apt) => {
                            const statusColor =
                              apt.status === "completed" ? "#22C55E" :
                                apt.status === "scheduled" ? "#3B82F6" :
                                  "#F97316";

                            return (
                              <div
                                key={apt.id}
                                onClick={() => openEditModal(apt)}
                                className="cursor-pointer hover:opacity-80"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '4px 6px',
                                  backgroundColor: '#F9FAFB',
                                  borderRadius: '4px',
                                  height: '22px',
                                }}
                              >
                                {/* Color dot */}
                                <div
                                  style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: statusColor,
                                    flexShrink: 0,
                                  }}
                                />
                                {/* Time */}
                                <span
                                  style={{
                                    fontSize: '11px',
                                    color: '#6B7280',
                                    fontFamily: 'Outfit, sans-serif',
                                    flexShrink: 0,
                                  }}
                                >
                                  {apt.time}
                                </span>
                                {/* Client name */}
                                <span
                                  style={{
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    color: '#111827',
                                    fontFamily: 'DM Sans, sans-serif',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {apt.clientName.length > 10 ? apt.clientName.substring(0, 10) + '...' : apt.clientName}
                                </span>
                              </div>
                            );
                          })}
                          {dayAppointments.length > 2 && (
                            <div
                              style={{
                                fontSize: '11px',
                                color: '#1A73E8',
                                fontFamily: 'Outfit, sans-serif',
                                cursor: 'pointer',
                                marginTop: '2px',
                              }}
                            >
                              +{dayAppointments.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* List View */}
        {view === "list" && (
          <div className="space-y-4">
            {/* Filter Tabs - Flat Underline Style */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderBottom: '1px solid #E5E7EB',
                display: 'flex',
                width: '100%',
              }}
            >
              {[
                { key: "upcoming", label: "Upcoming", count: statsSource.filter(a => a.status === "scheduled").length },
                { key: "done", label: "Done", count: statsSource.filter(a => a.status === "completed").length },
                { key: "pending", label: "Pending", count: statsSource.filter(a => a.status === "pending-accept").length },
                { key: "all", label: "All", count: statsSource.length },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setListViewTab(tab.key as typeof listViewTab)}
                  style={{
                    flex: '1',
                    height: '48px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: listViewTab === tab.key ? "#1A73E8" : "#6B7280",
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: listViewTab === tab.key ? '2px solid #1A73E8' : '2px solid transparent',
                    fontFamily: 'Outfit, sans-serif',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {tab.label} {tab.count}
                </button>
              ))}
            </div>

            {/* Subheader */}
            <div className="flex items-center justify-between" style={{ marginTop: '8px', marginBottom: '12px' }}>
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
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: "16px",
                  }}
                >
                  {filteredAppointments.map((apt) => {
                    const employee = employees.find((e) => e.id === apt.employeeId);
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
                            setSelectedAppointment(apt);
                            setAppointmentFormData({
                              clientName: apt.clientName,
                              clientEmail: apt.clientEmail,
                              clientPhone: apt.clientPhone,
                              employeeId: apt.employeeId,
                              serviceId: apt.serviceId,
                              date: apt.date,
                              time: apt.time,
                              notes: apt.notes || "",
                            });
                            setShowEditModal(true);
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
                      const employee = employees.find((e) => e.id === apt.employeeId);
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
                                  onClick={() => openEditModal(apt)}
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
      </div>


      {/* Schedule Appointment Drawer — single-page form */}
      <CustomSideDrawer
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetBookingWorkflow();
        }}
        maxWidth="sm:max-w-[480px]"
        title={
          <div>
            <p className="text-xl font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
              Schedule Appointment
            </p>
            <p className="text-sm text-slate-500 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
              Create a new appointment with a client
            </p>
          </div>
        }
        footer={
          (() => {
            const isValid = !!(bookingTitle.trim() && selectedProvider && selectedClient && selectedDate);
            return (
              <button
                onClick={handleBookingComplete}
                disabled={!isValid}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
                style={{
                  fontFamily: "Outfit, sans-serif",
                  backgroundColor: isValid ? "#1e293b" : "#E5E7EB",
                  color: isValid ? "#ffffff" : "#9CA3AF",
                  cursor: isValid ? "pointer" : "not-allowed",
                  border: "none",
                }}
              >
                Schedule Appointment
              </button>
            );
          })()
        }
      >
        {/* Single-page booking form */}
        {(() => {
          const endHour = (bookingStartHour + 1) % 24;
          const endMin = bookingStartMinute;
          const startHHMM = `${String(bookingStartHour).padStart(2, "0")}:${String(bookingStartMinute).padStart(2, "0")}`;
          const endHHMM = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;
          const fmtDate = (hhmm: string) => {
            if (!selectedDate) return "";
            const d = new Date(`${selectedDate}T${hhmm}`);
            return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) +
              " at " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
          };

          const inputCls = "w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white";
          const labelCls = "block text-xs font-semibold text-slate-700 mb-1.5";

          return (
            <div className="space-y-5">

              {/* ① Title */}
              <div>
                <label className={labelCls} style={{ fontFamily: "Outfit, sans-serif" }}>
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Follow-up consultation"
                  value={bookingTitle}
                  onChange={(e) => setBookingTitle(e.target.value)}
                  className={inputCls}
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
              </div>

              {/* ② Description */}
              <div>
                <label className={labelCls} style={{ fontFamily: "Outfit, sans-serif" }}>
                  Description
                </label>
                <textarea
                  placeholder="Add appointment details..."
                  value={bookingDescription}
                  onChange={(e) => setBookingDescription(e.target.value)}
                  rows={3}
                  className={inputCls + " resize-none"}
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
              </div>

              {/* ③ Schedule For / Schedule With */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} style={{ fontFamily: "Outfit, sans-serif" }}>
                    Schedule For <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedProvider?.id ?? ""}
                    onChange={(e) => {
                      const emp = employees.find((x) => x.id === Number(e.target.value));
                      setSelectedProvider(emp || null);
                    }}
                    className={inputCls}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <option value="">Select a user</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls} style={{ fontFamily: "Outfit, sans-serif" }}>
                    Schedule With <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedClient?.id ?? ""}
                    onChange={(e) => {
                      const cl = clients.find((x) => x.id === Number(e.target.value));
                      setSelectedClient(cl || null);
                    }}
                    className={inputCls}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <option value="">Select a client</option>
                    {clients.map((cl) => (
                      <option key={cl.id} value={cl.id}>{cl.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ④ Process / Stage */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} style={{ fontFamily: "Outfit, sans-serif" }}>
                    Select Process
                  </label>
                  <select
                    value={bookingProcessId}
                    onChange={(e) => {
                      setBookingProcessId(e.target.value);
                      setBookingStageId("");
                    }}
                    className={inputCls}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <option value="">Select a process</option>
                    {Object.keys(processStages).map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls} style={{ fontFamily: "Outfit, sans-serif" }}>
                    Select Stage
                  </label>
                  <select
                    value={bookingStageId}
                    onChange={(e) => setBookingStageId(e.target.value)}
                    disabled={!bookingProcessId}
                    className={inputCls + (!bookingProcessId ? " opacity-50 cursor-not-allowed" : "")}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <option value="">Select a stage</option>
                    {(processStages[bookingProcessId] || []).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ⑤ Date / Note */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} style={{ fontFamily: "Outfit, sans-serif" }}>
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className={inputCls}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  />
                </div>
                <div>
                  <label className={labelCls} style={{ fontFamily: "Outfit, sans-serif" }}>
                    Note
                  </label>
                  <input
                    type="text"
                    placeholder="Quick note..."
                    value={bookingNote}
                    onChange={(e) => setBookingNote(e.target.value)}
                    className={inputCls}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  />
                </div>
              </div>

              {/* ⑥ Times in client timezone */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p
                  className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-3"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Times in client timezone
                </p>
                {!selectedClient ? (
                  <p
                    className="text-center text-sm py-2"
                    style={{ color: "#1A73E8", fontFamily: "Outfit, sans-serif" }}
                  >
                    Select a client to enable time selection
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Start */}
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>Start</p>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={23}
                          value={bookingStartHour}
                          onChange={(e) => setBookingStartHour(Math.min(23, Math.max(0, Number(e.target.value))))}
                          className="w-12 text-center border border-slate-200 rounded-lg py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
                          style={{ fontFamily: "DM Sans, sans-serif" }}
                        />
                        <span className="text-slate-400 font-bold text-sm">:</span>
                        <input
                          type="number"
                          min={0}
                          max={59}
                          value={bookingStartMinute}
                          onChange={(e) => setBookingStartMinute(Math.min(59, Math.max(0, Number(e.target.value))))}
                          className="w-12 text-center border border-slate-200 rounded-lg py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
                          style={{ fontFamily: "DM Sans, sans-serif" }}
                        />
                      </div>
                      {selectedDate && (
                        <p className="text-[11px] text-slate-400 mt-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                          {fmtDate(startHHMM)}
                        </p>
                      )}
                    </div>
                    {/* End (auto = start + 60 min) */}
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>End</p>
                      <div className="flex items-center gap-1">
                        <div
                          className="w-12 text-center border border-slate-100 rounded-lg py-1.5 text-sm font-semibold text-slate-400 bg-slate-100"
                          style={{ fontFamily: "DM Sans, sans-serif" }}
                        >
                          {String(endHour).padStart(2, "0")}
                        </div>
                        <span className="text-slate-400 font-bold text-sm">:</span>
                        <div
                          className="w-12 text-center border border-slate-100 rounded-lg py-1.5 text-sm font-semibold text-slate-400 bg-slate-100"
                          style={{ fontFamily: "DM Sans, sans-serif" }}
                        >
                          {String(endMin).padStart(2, "0")}
                        </div>
                      </div>
                      {selectedDate && (
                        <p className="text-[11px] text-slate-400 mt-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                          {fmtDate(endHHMM)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ⑦ Session Type */}
              <div>
                <label className={labelCls} style={{ fontFamily: "Outfit, sans-serif" }}>
                  Session Type
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSessionType("video")}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      sessionType === "video"
                        ? "bg-cyan-500 text-white"
                        : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                    }`}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Video
                  </button>
                  <button
                    onClick={() => setSessionType("inPerson")}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      sessionType === "inPerson"
                        ? "bg-cyan-500 text-white"
                        : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                    }`}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    In-Person
                  </button>
                </div>
              </div>

              {/* ⑧ Tags */}
              <div>
                <label className={labelCls} style={{ fontFamily: "Outfit, sans-serif" }}>
                  Tags
                </label>
                <input
                  type="text"
                  placeholder="Comma-separated tags, e.g., follow-up, urgent"
                  value={bookingTags}
                  onChange={(e) => setBookingTags(e.target.value)}
                  className={inputCls}
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
              </div>

            </div>
          );
        })()}
      </CustomSideDrawer>

      {/* Edit Appointment Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          resetForm();
        }}
        title="Edit Appointment"
        maxWidth="2xl"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleEditAppointment}>
              <Edit className="w-4 h-4" />
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Client Name *</label>
              <Input
                type="text"
                placeholder="John Doe"
                value={appointmentFormData.clientName}
                onChange={(e) =>
                  setAppointmentFormData({ ...appointmentFormData, clientName: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Client Email</label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={appointmentFormData.clientEmail}
                onChange={(e) =>
                  setAppointmentFormData({ ...appointmentFormData, clientEmail: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Client Phone</label>
            <Input
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={appointmentFormData.clientPhone}
              onChange={(e) =>
                setAppointmentFormData({ ...appointmentFormData, clientPhone: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Provider *</label>
              <select
                value={appointmentFormData.employeeId}
                onChange={(e) =>
                  setAppointmentFormData({
                    ...appointmentFormData,
                    employeeId: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                <option value={0}>Select a provider</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Service *</label>
              <select
                value={appointmentFormData.serviceId}
                onChange={(e) =>
                  setAppointmentFormData({
                    ...appointmentFormData,
                    serviceId: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                <option value={0}>Select a service</option>
                {services.map((svc) => (
                  <option key={svc.id} value={svc.id}>
                    {svc.name} - {svc.duration} min (${svc.price})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Date *</label>
              <Input
                type="date"
                value={appointmentFormData.date}
                onChange={(e) =>
                  setAppointmentFormData({ ...appointmentFormData, date: e.target.value })
                }
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Time *</label>
              <Input
                type="time"
                value={appointmentFormData.time}
                onChange={(e) =>
                  setAppointmentFormData({ ...appointmentFormData, time: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Notes</label>
            <textarea
              placeholder="Additional notes or special requirements..."
              value={appointmentFormData.notes}
              onChange={(e) =>
                setAppointmentFormData({ ...appointmentFormData, notes: e.target.value })
              }
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              rows={3}
            />
          </div>

          {selectedAppointment && (
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <div className="flex gap-2">
                {(["scheduled", "completed", "cancelled", "no-show"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(selectedAppointment.id, status)}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${selectedAppointment.status === status
                        ? "bg-primary text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Custom Appointment Fields Section */}
          {(apptVisibleFieldKeys.length > 0 || appointmentCustomFields.length > 0) && (
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700">Custom Fields</h4>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setApptSelectFieldsOpen(true)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Select Fields
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => setApptCreateFieldOpen(true)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Create Field
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {getAllFields("appointment")
                  .filter(f => f.source === "custom" && apptVisibleFieldKeys.includes(f.key))
                  .map(f => (
                    <div key={f.key}>
                      <label className="block text-sm font-medium mb-1.5">{f.label}{f.required && " *"}</label>
                      <input
                        type="text"
                        value={customFieldValues[f.key] || ""}
                        onChange={e => setCustomFieldValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                        placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}`}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* Inline field add trigger if no custom fields yet */}
          {appointmentCustomFields.length === 0 && (
            <div className="border-t border-gray-100 pt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setApptSelectFieldsOpen(true)}
                className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
              >
                Select Fields
              </button>
              <span className="text-gray-300">·</span>
              <button
                type="button"
                onClick={() => setApptCreateFieldOpen(true)}
                className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
              >
                + Create Custom Field
              </button>
            </div>
          )}
        </div>
      </Modal>

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
    </div>
  );
}
