import { useState, useEffect, useRef, useMemo } from "react";
import { Drawer } from "./ui/drawer";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Modal } from "./ui/Modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { Switch } from "./ui/switch";
import { toast } from "sonner";
import MemberLocationScheduleTab from "./settings/MemberLocationScheduleTab";
import { getStoredTeamMembers, saveStoredTeamMembers, TeamMember } from "../../lib/teamStore";
import {
  useFieldRegistry,
  FieldDefinition,
  SectionDefinition,
} from "../context/FieldRegistryContext";
import { SelectFieldsModal, CreateFieldModal } from "./help/FieldManager";
import { AdminSectionDrawer } from "../pages/admin/components/AdminSectionDrawer";
import { AdminFieldDrawer } from "../pages/admin/components/AdminFieldDrawer";
import { FieldInputRenderer } from "./fields/FieldInputRenderer";
import {
  User,
  CheckCircle2,
  CalendarClock,
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  Trash2,
  Package,
  CheckCircle,
  Shield,
  X,
  Check,
  Search,
  Info,
  Mail,
  Phone,
  Globe,
  Tag,
  Sparkles,
  Layers,
  GripVertical,
  Edit2,
  Edit3,
} from "lucide-react";

export interface MemberCustomFieldItem {
  id: string;
  key: string;
  label: string;
  type: string;
  value: string;
}

export interface MemberCustomSectionItem {
  id: string;
  title: string;
  description?: string;
  fields: MemberCustomFieldItem[];
}

export interface TeamMemberDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  member: (Partial<TeamMember> & {
    id?: string | number;
    name: string;
    email: string;
    phone?: string;
    role?: string;
    department?: string;
    canBookAppointments?: boolean;
    locations?: string[];
    [key: string]: any;
  }) | null;
  zIndex?: number;
  initialTab?: "personal-info" | "calendar" | "availability" | "days-off" | "services";
  onSave?: (updated?: any) => void;
}

// ---- Date helpers (used by the Calendar tab) ----
const getDaysInMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

const getFirstDayOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1).getDay();

const toISODate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const buildMonthCells = (viewDate: Date) => {
  const firstDay = getFirstDayOfMonth(viewDate);
  const daysInMonth = getDaysInMonth(viewDate);
  const daysInPrevMonth = getDaysInMonth(
    new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)
  );
  const cells: { date: Date; isCurrentMonth: boolean }[] = [];

  for (let i = 0; i < firstDay; i++) {
    const d = daysInPrevMonth - firstDay + 1 + i;
    cells.push({
      date: new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, d),
      isCurrentMonth: false,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      date: new Date(viewDate.getFullYear(), viewDate.getMonth(), d),
      isCurrentMonth: true,
    });
  }
  let nextDay = 1;
  while (cells.length < 35 || cells.length % 7 !== 0) {
    cells.push({
      date: new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, nextDay),
      isCurrentMonth: false,
    });
    nextDay++;
  }
  return cells;
};

const getWeekDates = (viewDate: Date) => {
  const day = viewDate.getDay();
  const sunday = new Date(viewDate);
  sunday.setDate(viewDate.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
};

const WEEKDAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export function TeamMemberDrawer({
  isOpen,
  onClose,
  member,
  zIndex = 9999,
  initialTab = "personal-info",
  onSave,
}: TeamMemberDrawerProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<"personal-info" | "calendar" | "availability" | "days-off" | "services">(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Only team members who are eligible for appointments have availability & days off
  const isBookable = useMemo(() => {
    if (member?.canBookAppointments !== undefined) return member.canBookAppointments;
    try {
      const allMembers = getStoredTeamMembers();
      const found = allMembers.find(
        (m) =>
          (member?.id && String(m.id) === String(member.id)) ||
          (member?.email && m.email.toLowerCase() === member.email.toLowerCase())
      );
      if (found) return found.canBookAppointments === true;
    } catch {}
    return false;
  }, [member]);

  // Personal Information Form State
  const [personalInfo, setPersonalInfo] = useState({
    fullName: member?.name || "",
    email: member?.email || "",
    phone: member?.phone || "",
    gender: "Male",
    dateOfBirth: "1990-01-15",
    role: member?.role || "Admin",
    department: member?.department || "Engineering",
    language: "English",
    country: "USA",
    timezone: "UTC",
    status: true,
  });

  // Generic helper: update a personal info field and flag unsaved changes
  const updatePersonalInfo = (patch: Partial<typeof personalInfo>) => {
    setPersonalInfo((prev) => ({ ...prev, ...patch }));
    setHasUnsavedChanges(true);
  };

  // Field Registry hooks (linked with Admin Custom Fields)
  const {
    getAllFields,
    getAllSections,
    addCustomSection,
    updateCustomSection,
    deleteCustomSection,
    updateCustomField,
  } = useFieldRegistry();

  const allTeamMemberFields = useMemo(() => getAllFields("teamMember"), [getAllFields]);
  const allTeamMemberSections = useMemo(() => getAllSections("teamMember"), [getAllSections]);

  const BUILTIN_TEAM_SECTION_TITLES = useMemo(
    () => new Set(["basic info", "custom fields"]),
    []
  );

  const customTeamMemberSections = useMemo(() => {
    const BUILTIN_SEC_IDS = new Set(["sec-team-basic", "sec-team-custom"]);
    return allTeamMemberSections.filter((s) => {
      if (s.source === "system") return false;
      if (BUILTIN_SEC_IDS.has(s.id)) return false;
      if (s.id.startsWith("sec-team-")) return false;
      const lower = (s.title || "").toLowerCase().trim();
      if (BUILTIN_TEAM_SECTION_TITLES.has(lower)) return false;
      return true;
    });
  }, [allTeamMemberSections, BUILTIN_TEAM_SECTION_TITLES]);

  // Registry-backed custom field values for this team member
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>(() => {
    return (member as any)?.customFields || {};
  });

  useEffect(() => {
    if ((member as any)?.customFields) {
      setCustomFieldValues((member as any).customFields);
    }
  }, [member]);

  // Basic Info custom field keys
  const [basicMemberCustomFieldKeys, setBasicMemberCustomFieldKeys] = useState<string[]>([]);

  const systemBasicTeamSec = allTeamMemberSections.find((s) => s.id === "sec-team-basic");
  const effectiveTeamMemberBasicCustomKeys = useMemo(() => {
    const CORE_TEAM_KEYS = ["name", "email", "phone", "gender", "date_of_birth", "role", "department", "language", "country", "timezone", "status"];
    const fromRegistry = (systemBasicTeamSec?.fieldKeys || []).filter((k) => !CORE_TEAM_KEYS.includes(k));
    return Array.from(new Set([...fromRegistry, ...basicMemberCustomFieldKeys]));
  }, [systemBasicTeamSec, basicMemberCustomFieldKeys]);

  // Modals for central Field & Section registry
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [createFieldModalOpen, setCreateFieldModalOpen] = useState(false);
  const [addSectionDrawerOpen, setAddSectionDrawerOpen] = useState(false);
  const [editingSectionDef, setEditingSectionDef] = useState<SectionDefinition | null>(null);
  const [editingFieldDef, setEditingFieldDef] = useState<FieldDefinition | null>(null);
  const [targetSectionIdForField, setTargetSectionIdForField] = useState<string | null>(null);

  const handleOpenAddField = (sectionId: string) => {
    setTargetSectionIdForField(sectionId);
    setFieldModalOpen(true);
  };

  const handleApplySelectedFields = (selectedKeys: string[]) => {
    if (!targetSectionIdForField) return;

    if (targetSectionIdForField === "sec_basic") {
      setBasicMemberCustomFieldKeys((prev) => Array.from(new Set([...prev, ...selectedKeys])));
    } else {
      const targetSec = allTeamMemberSections.find((s) => s.id === targetSectionIdForField);
      if (targetSec) {
        updateCustomSection("teamMember", targetSec.id, {
          fieldKeys: Array.from(new Set([...(targetSec.fieldKeys || []), ...selectedKeys])),
        });
      }
    }
    setFieldModalOpen(false);
    setTargetSectionIdForField(null);
    setHasUnsavedChanges(true);
    toast.success("Fields updated");
  };

  const handleRemoveFieldFromSection = (sectionId: string, fieldKey: string) => {
    if (sectionId === "sec_basic") {
      setBasicMemberCustomFieldKeys((prev) => prev.filter((k) => k !== fieldKey));
    } else {
      const targetSec = allTeamMemberSections.find((s) => s.id === sectionId);
      if (targetSec) {
        updateCustomSection("teamMember", targetSec.id, {
          fieldKeys: (targetSec.fieldKeys || []).filter((k) => k !== fieldKey),
        });
      }
    }
    setHasUnsavedChanges(true);
    toast.success("Field removed");
  };

  const handleCustomFieldValueChange = (fieldKey: string, value: any) => {
    setCustomFieldValues((prev) => ({ ...prev, [fieldKey]: value }));
    setHasUnsavedChanges(true);
  };

  // Department Combobox State
  const [deptList, setDeptList] = useState<string[]>(() => {
    const defaultDepts = [
      "Engineering",
      "Sales",
      "Marketing",
      "Support",
      "Operations",
      "Finance",
      "HR",
      "Medical",
      "Reception",
    ];
    try {
      const raw = localStorage.getItem("ma_departments");
      const parsed = raw ? JSON.parse(raw) : [];
      const storedNames = parsed.map((d: any) => d.name || d);
      return Array.from(new Set([...defaultDepts, ...storedNames]));
    } catch {
      return defaultDepts;
    }
  });
  const [deptComboboxOpen, setDeptComboboxOpen] = useState(false);
  const [deptSearch, setDeptSearch] = useState("");

  const handleCreateAndSelectDept = (deptName: string) => {
    const trimmed = deptName.trim();
    if (!trimmed) return;
    if (!deptList.includes(trimmed)) {
      const updated = [...deptList, trimmed];
      setDeptList(updated);
      try {
        const raw = localStorage.getItem("ma_departments");
        const stored = raw ? JSON.parse(raw) : [];
        const exists = stored.some((d: any) => (d.name || d).toLowerCase() === trimmed.toLowerCase());
        if (!exists) {
          stored.push({ id: "dept_" + Date.now(), name: trimmed });
          localStorage.setItem("ma_departments", JSON.stringify(stored));
        }
      } catch {}
    }
    updatePersonalInfo({ department: trimmed });
    setDeptSearch("");
    setDeptComboboxOpen(false);
    toast.success(`Department "${trimmed}" added and selected.`);
  };

  // Calendar View State
  const [calendarView, setCalendarView] = useState<"day" | "week" | "month" | "schedule">("month");
  const [viewDate, setViewDate] = useState<Date>(new Date(2026, 4, 25)); // May 25, 2026
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    name: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    allDay: false,
    calendar: "Calendar",
    repeat: "Don't repeat",
    location: "",
    attendees: [] as string[],
  });
  const [calendarEvents, setCalendarEvents] = useState<Array<{ id: string; name: string; start: Date; end: Date; color: string }>>([]);

  const navigateCalendar = (direction: 1 | -1) => {
    const next = new Date(viewDate);
    if (calendarView === "month") next.setMonth(next.getMonth() + direction);
    else if (calendarView === "week") next.setDate(next.getDate() + direction * 7);
    else next.setDate(next.getDate() + direction);
    setViewDate(next);
  };

  const openCreateEventForDate = (date: Date) => {
    setNewEvent((prev) => ({ ...prev, startDate: toISODate(date) }));
    setShowCreateEventModal(true);
  };

  // Connected Calendar Accounts State
  const [connectedAccounts, setConnectedAccounts] = useState([
    { id: "google", provider: "Google", email: "john.smith@healthcare.com", initial: "G", color: "bg-blue-600" },
    { id: "outlook", provider: "Outlook", email: "john.smith@outlook.com", initial: "O", color: "bg-orange-500" },
  ]);

  const connectableProviders = [
    { id: "microsoft", name: "Microsoft", color: "bg-blue-700", rounded: "rounded" },
    { id: "apple", name: "Apple iCloud", color: "bg-black", rounded: "rounded-full" },
    { id: "google", name: "Google", color: "bg-blue-600", rounded: "rounded-full" },
    { id: "outlook", name: "Outlook", color: "bg-blue-500", rounded: "rounded" },
  ];

  const handleDisconnectAccount = (id: string) => {
    const account = connectedAccounts.find((a) => a.id === id);
    setConnectedAccounts((prev) => prev.filter((a) => a.id !== id));
    setHasUnsavedChanges(true);
    if (account) toast.success(`Disconnected ${account.provider}`);
  };

  const handleConnectAccount = (providerId: string, providerName: string) => {
    if (connectedAccounts.some((a) => a.id === providerId)) {
      toast.info(`${providerName} is already connected`);
      return;
    }
    const provider = connectableProviders.find((p) => p.id === providerId);
    setConnectedAccounts((prev) => [
      ...prev,
      {
        id: providerId,
        provider: providerName,
        email: `${(member?.name || "user").toLowerCase().replace(/\s+/g, ".")}@${providerId}.com`,
        initial: providerName.charAt(0),
        color: provider?.color || "bg-gray-600",
      },
    ]);
    setHasUnsavedChanges(true);
    toast.success(`Connected to ${providerName}`);
  };

  // Profile Picture Upload
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const profilePictureInputRef = useRef<HTMLInputElement>(null);

  // Availability State
  const [availability, setAvailability] = useState<Record<string, { available: boolean; start: string; end: string }>>({
    Monday: { available: true, start: "9:00 AM", end: "5:00 PM" },
    Tuesday: { available: true, start: "9:00 AM", end: "5:00 PM" },
    Wednesday: { available: true, start: "9:00 AM", end: "5:00 PM" },
    Thursday: { available: true, start: "9:00 AM", end: "5:00 PM" },
    Friday: { available: true, start: "9:00 AM", end: "5:00 PM" },
    Saturday: { available: true, start: "9:00 AM", end: "5:00 PM" },
    Sunday: { available: false, start: "9:00 AM", end: "5:00 PM" },
  });
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [newSlot, setNewSlot] = useState({ day: "Monday", start: "9:00 AM", end: "5:00 PM" });

  const handleRemoveAvailability = (day: string) => {
    setAvailability((prev) => ({ ...prev, [day]: { ...prev[day], available: false } }));
    setHasUnsavedChanges(true);
    toast.success(`${day} marked unavailable`);
  };

  const handleAddSlot = () => {
    setAvailability((prev) => ({
      ...prev,
      [newSlot.day]: { available: true, start: newSlot.start, end: newSlot.end },
    }));
    setHasUnsavedChanges(true);
    setShowAddSlotModal(false);
    toast.success(`Time slot added for ${newSlot.day}`);
  };

  // Days Off State
  const [daysOff, setDaysOff] = useState<Array<{ id: string; date: string; duration: string; repeat: string }>>([
    { id: "1", date: "Oct 25, 2023", duration: "Full Day", repeat: "None" },
  ]);
  const [showAddDayOffModal, setShowAddDayOffModal] = useState(false);
  const [newDayOff, setNewDayOff] = useState({ date: "", duration: "Full Day", repeat: "None" });

  const handleRemoveDayOff = (id: string) => {
    setDaysOff((prev) => prev.filter((d) => d.id !== id));
    setHasUnsavedChanges(true);
    toast.success("Day off removed");
  };

  const handleAddDayOff = () => {
    if (!newDayOff.date) {
      toast.error("Please select a date");
      return;
    }
    const formatted = new Date(newDayOff.date + "T00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    setDaysOff((prev) => [
      ...prev,
      { id: Date.now().toString(), date: formatted, duration: newDayOff.duration, repeat: newDayOff.repeat },
    ]);
    setHasUnsavedChanges(true);
    setShowAddDayOffModal(false);
    setNewDayOff({ date: "", duration: "Full Day", repeat: "None" });
    toast.success("Day off added");
  };

  // Services State
  const [services, setServices] = useState([
    { id: "1", name: "Initial Consultation", category: "Consultation", duration: 60, price: 150, selected: true },
    { id: "2", name: "Follow-up Visit", category: "Consultation", duration: 30, price: 75, selected: true },
  ]);

  const toggleService = (id: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s))
    );
    setHasUnsavedChanges(true);
  };

  // Permissions State (per individual item)
  const [itemPermissions, setItemPermissions] = useState<Record<string, "none" | "view" | "write" | "all">>({
    Dashboard: "view",
    Clients: "view",
    Calls: "view",
    Processes: "view",
    Numbers: "view",
    Billing: "view",
    Webhooks: "view",
    Settings: "view",
  });

  const setItemPermissionLevel = (item: string, level: "none" | "view" | "write" | "all") => {
    setItemPermissions((prev) => ({ ...prev, [item]: level }));
    setHasUnsavedChanges(true);
  };

  // Save state tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");

  // Update personal info when member changes or drawer opens
  useEffect(() => {
    if (member) {
      setPersonalInfo((prev) => ({
        ...prev,
        fullName: member.name || "",
        email: member.email || "",
        phone: member.phone || "",
        role: member.role || prev.role || "Admin",
        department: member.department || prev.department || "Engineering",
      }));
      setHasUnsavedChanges(false);
    }
  }, [member, isOpen]);

  const monthCells = buildMonthCells(viewDate);
  const weekDates = getWeekDates(viewDate);

  const isSameDate = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const eventsForDate = (date: Date) =>
    calendarEvents.filter((event) => isSameDate(new Date(event.start), date));

  const monthLabel = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const weekLabel = `${weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  const dayLabel = viewDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="max-w-[60vw]"
        headerClassName="px-6 py-2"
        zIndex={zIndex}
        title={
          <div className="w-full">
            <div className="flex items-center gap-3">
              <div className="relative group cursor-pointer">
                <input
                  ref={profilePictureInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setProfilePicture(reader.result as string);
                        setHasUnsavedChanges(true);
                        toast.success("Profile picture updated");
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <div
                  onClick={() => profilePictureInputRef.current?.click()}
                  className="w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden transition-all group-hover:opacity-90 cursor-pointer shadow-sm"
                  style={{ backgroundColor: "#1F2937" }}
                >
                  {profilePicture ? (
                    <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-sm font-bold select-none">
                      {(member?.name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </span>
                  )}
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center border border-gray-200 shadow-xs">
                    <svg className="w-2 h-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-[#020817] leading-tight truncate">{member?.name}</h3>
                <p className="text-xs text-[#6B7280] leading-tight truncate mt-0.5">{member?.email}</p>
              </div>
            </div>
          </div>
        }
      >
        {member && (
          <div className="relative">
            <div className="space-y-6 pb-20">
              {/* Tabs */}
              <div className="border-b border-gray-200 relative">
                <div className="overflow-x-auto scrollbar-none flex items-center relative py-0.5">
                  <div className="flex items-center gap-1 whitespace-nowrap min-w-max">
                    <button
                      onClick={() => setActiveTab("personal-info")}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer ${activeTab === "personal-info"
                          ? "border-[#1F2937] text-[#1F2937] font-semibold"
                          : "border-transparent text-gray-600 hover:text-gray-900"
                        }`}
                    >
                      Personal Info
                    </button>
                    <button
                      onClick={() => setActiveTab("calendar")}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer ${activeTab === "calendar"
                          ? "border-[#1F2937] text-[#1F2937] font-semibold"
                          : "border-transparent text-gray-600 hover:text-gray-900"
                        }`}
                    >
                      Calendar
                    </button>
                    {isBookable && (
                      <button
                        onClick={() => setActiveTab("availability")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer ${activeTab === "availability" || activeTab === "days-off"
                            ? "border-[#1F2937] text-[#1F2937] font-semibold"
                            : "border-transparent text-gray-600 hover:text-gray-900"
                          }`}
                      >
                        Availability & Days Off
                      </button>
                    )}
                    <button
                      onClick={() => setActiveTab("services")}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer ${activeTab === "services"
                          ? "border-[#1F2937] text-[#1F2937] font-semibold"
                          : "border-transparent text-gray-600 hover:text-gray-900"
                        }`}
                    >
                      Services
                    </button>
                  </div>
                </div>
              </div>

              {/* Personal Info Tab */}
              {activeTab === "personal-info" && (
                <div className="space-y-4">
                  {/* SECTION 1: BASIC INFO */}
                  <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-3.5 h-3.5 text-slate-300" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E293B]">
                          BASIC INFO
                        </h3>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3.5">
                      {/* Full Name */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <GripVertical className="w-3 h-3 text-slate-300" />
                          <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                            FULL NAME
                          </label>
                        </div>
                        <div className="relative flex items-center rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 hover:border-[#CBD5E1] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                          <input
                            type="text"
                            value={personalInfo.fullName}
                            onChange={(e) => updatePersonalInfo({ fullName: e.target.value })}
                            placeholder="Enter full name"
                            className="flex-1 text-xs text-[#1E293B] font-medium bg-transparent border-none outline-none"
                          />
                          <User className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>

                      {/* Email */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <GripVertical className="w-3 h-3 text-slate-300" />
                          <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                            EMAIL
                          </label>
                        </div>
                        <div className="relative flex items-center rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 hover:border-[#CBD5E1] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                          <input
                            type="email"
                            value={personalInfo.email}
                            onChange={(e) => updatePersonalInfo({ email: e.target.value })}
                            placeholder="name@healthcare.com"
                            className="flex-1 text-xs text-[#1E293B] font-medium bg-transparent border-none outline-none"
                          />
                          <Mail className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>

                      {/* Phone */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <GripVertical className="w-3 h-3 text-slate-300" />
                          <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                            PHONE
                          </label>
                        </div>
                        <div className="relative flex items-center rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 hover:border-[#CBD5E1] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                          <input
                            type="tel"
                            value={personalInfo.phone}
                            onChange={(e) => updatePersonalInfo({ phone: e.target.value })}
                            placeholder="+1 (555) 000-0000"
                            className="flex-1 text-xs text-[#1E293B] font-medium bg-transparent border-none outline-none"
                          />
                          <Phone className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>

                      {/* Gender */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <GripVertical className="w-3 h-3 text-slate-300" />
                          <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                            GENDER
                          </label>
                        </div>
                        <div className="relative flex items-center rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 hover:border-[#CBD5E1] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                          <select
                            value={personalInfo.gender}
                            onChange={(e) => updatePersonalInfo({ gender: e.target.value })}
                            className="flex-1 text-xs text-[#1E293B] font-medium bg-transparent border-none outline-none cursor-pointer appearance-none pr-5"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                            <option value="Prefer not to say">Prefer not to say</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
                        </div>
                      </div>

                      {/* Date of Birth */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <GripVertical className="w-3 h-3 text-slate-300" />
                          <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                            DATE OF BIRTH
                          </label>
                        </div>
                        <div className="relative flex items-center rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 hover:border-[#CBD5E1] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                          <input
                            type="date"
                            value={personalInfo.dateOfBirth}
                            onChange={(e) => updatePersonalInfo({ dateOfBirth: e.target.value })}
                            className="flex-1 text-xs text-[#1E293B] font-medium bg-transparent border-none outline-none cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Role */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <GripVertical className="w-3 h-3 text-slate-300" />
                          <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                            ROLE
                          </label>
                        </div>
                        <div className="relative flex items-center rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 hover:border-[#CBD5E1] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                          <select
                            value={personalInfo.role}
                            onChange={(e) => updatePersonalInfo({ role: e.target.value })}
                            className="flex-1 text-xs text-[#1E293B] font-medium bg-transparent border-none outline-none cursor-pointer appearance-none pr-5"
                          >
                            <option value="Admin">Admin</option>
                            <option value="Manager">Manager</option>
                            <option value="Agent">Agent</option>
                            <option value="Supervisor">Supervisor</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
                        </div>
                      </div>

                      {/* Department */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <GripVertical className="w-3 h-3 text-slate-300" />
                          <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                            DEPARTMENT
                          </label>
                        </div>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setDeptComboboxOpen((v) => !v)}
                            className="w-full flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 hover:border-[#CBD5E1] focus:outline-none transition-all cursor-pointer"
                          >
                            <span className={personalInfo.department ? "text-xs font-medium text-[#1E293B]" : "text-xs text-gray-400"}>
                              {personalInfo.department || "Select department..."}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${deptComboboxOpen ? "rotate-180" : ""}`} />
                          </button>

                          {deptComboboxOpen && (
                            <div className="absolute z-50 top-full mt-1.5 left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
                              <div className="p-2 border-b border-slate-100 bg-slate-50/50 relative flex items-center">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-4" />
                                <input
                                  type="text"
                                  value={deptSearch}
                                  onChange={(e) => setDeptSearch(e.target.value)}
                                  placeholder="Type or search department..."
                                  className="w-full pl-7 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                                  autoFocus
                                />
                              </div>
                              <div className="max-h-48 overflow-y-auto divide-y divide-slate-50 p-1">
                                {(() => {
                                  const filtered = deptList.filter((d) =>
                                    d.toLowerCase().includes(deptSearch.trim().toLowerCase())
                                  );
                                  const exactMatch = deptList.some(
                                    (d) => d.toLowerCase() === deptSearch.trim().toLowerCase()
                                  );
                                  return (
                                    <>
                                      {filtered.map((d) => (
                                        <button
                                          key={d}
                                          type="button"
                                          onClick={() => {
                                            updatePersonalInfo({ department: d });
                                            setDeptSearch("");
                                            setDeptComboboxOpen(false);
                                          }}
                                          className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                                            personalInfo.department === d
                                              ? "bg-indigo-50 text-indigo-900 font-bold"
                                              : "hover:bg-slate-100 text-slate-700"
                                          }`}
                                        >
                                          <span>{d}</span>
                                          {personalInfo.department === d && (
                                            <Check className="w-3.5 h-3.5 text-indigo-600" />
                                          )}
                                        </button>
                                      ))}
                                      {deptSearch.trim() !== "" && !exactMatch && (
                                        <button
                                          type="button"
                                          onClick={() => handleCreateAndSelectDept(deptSearch.trim())}
                                          className="w-full text-left px-3 py-2 text-xs font-bold text-indigo-600 bg-indigo-50/70 hover:bg-indigo-100 rounded-lg flex items-center gap-1.5 transition-colors mt-1 cursor-pointer"
                                        >
                                          <Plus className="w-3.5 h-3.5" />
                                          + Add "{deptSearch.trim()}" Department
                                        </button>
                                      )}
                                      {filtered.length === 0 && exactMatch && (
                                        <div className="px-3 py-3 text-xs text-slate-400 italic text-center">
                                          No departments found
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Language */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <GripVertical className="w-3 h-3 text-slate-300" />
                          <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                            LANGUAGE
                          </label>
                        </div>
                        <div className="relative flex items-center rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 hover:border-[#CBD5E1] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                          <select
                            value={personalInfo.language}
                            onChange={(e) => updatePersonalInfo({ language: e.target.value })}
                            className="flex-1 text-xs text-[#1E293B] font-medium bg-transparent border-none outline-none cursor-pointer appearance-none pr-5"
                          >
                            <option value="English">English</option>
                            <option value="Hindi">Hindi</option>
                            <option value="Spanish">Spanish</option>
                            <option value="French">French</option>
                            <option value="German">German</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
                        </div>
                      </div>

                      {/* Country */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <GripVertical className="w-3 h-3 text-slate-300" />
                          <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                            COUNTRY
                          </label>
                        </div>
                        <div className="relative flex items-center rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 hover:border-[#CBD5E1] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                          <select
                            value={personalInfo.country}
                            onChange={(e) => updatePersonalInfo({ country: e.target.value })}
                            className="flex-1 text-xs text-[#1E293B] font-medium bg-transparent border-none outline-none cursor-pointer appearance-none pr-5"
                          >
                            <option value="India">India</option>
                            <option value="USA">USA</option>
                            <option value="UK">UK</option>
                            <option value="Canada">Canada</option>
                            <option value="Australia">Australia</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
                        </div>
                      </div>

                      {/* Timezone */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <GripVertical className="w-3 h-3 text-slate-300" />
                          <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                            TIMEZONE
                          </label>
                        </div>
                        <div className="relative flex items-center rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 hover:border-[#CBD5E1] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                          <select
                            value={personalInfo.timezone}
                            onChange={(e) => updatePersonalInfo({ timezone: e.target.value })}
                            className="flex-1 text-xs text-[#1E293B] font-medium bg-transparent border-none outline-none cursor-pointer appearance-none pr-5"
                          >
                            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                            <option value="UTC">UTC</option>
                            <option value="America/New_York">America/New_York (EST)</option>
                            <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                            <option value="Europe/London">Europe/London (GMT)</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
                        </div>
                      </div>

                      {/* Status */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <GripVertical className="w-3 h-3 text-slate-300" />
                          <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                            STATUS
                          </label>
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2">
                          <span className="text-xs text-gray-700 font-medium">{personalInfo.status ? "Active" : "Inactive"}</span>
                          <Switch
                            checked={personalInfo.status}
                            onCheckedChange={(checked) => updatePersonalInfo({ status: checked })}
                          />
                        </div>
                      </div>

                      {/* Custom Fields added to Basic Info */}
                      {effectiveTeamMemberBasicCustomKeys.map((fieldKey) => {
                        const fieldDef = allTeamMemberFields.find((f) => f.key === fieldKey);
                        const fieldLabel = fieldDef?.label || fieldKey;
                        return (
                          <div key={fieldKey}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <GripVertical className="w-3 h-3 text-slate-300" />
                                <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                                  {fieldLabel}
                                </label>
                              </div>
                              <div className="flex items-center gap-1">
                                {fieldDef && (
                                  <button
                                    type="button"
                                    onClick={() => setEditingFieldDef(fieldDef)}
                                    className="text-[10px] text-slate-400 hover:text-blue-600 p-0.5 rounded cursor-pointer"
                                    title="Edit field settings"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFieldFromSection("sec_basic", fieldKey)}
                                  className="text-[10px] text-slate-300 hover:text-red-500 cursor-pointer"
                                  title="Remove from section"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <div className="relative flex items-center rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 hover:border-[#CBD5E1] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                              <input
                                type="text"
                                value={customFieldValues[fieldKey] ?? ""}
                                onChange={(e) =>
                                  handleCustomFieldValueChange(fieldKey, e.target.value)
                                }
                                className="flex-1 text-xs text-[#1E293B] font-medium bg-transparent border-none outline-none"
                                placeholder={`Enter ${fieldLabel.toLowerCase()}...`}
                              />
                              <Tag className="w-4 h-4 text-slate-400" />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* + Add Field inside Basic Info */}
                    <div className="flex justify-end mt-4 pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenAddField("sec_basic")}
                        className="text-xs font-semibold text-[#2563EB] hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Field
                      </button>
                    </div>
                  </div>

                  {/* DYNAMIC CUSTOM SECTIONS (FROM REGISTRY) */}
                  {customTeamMemberSections.map((section) => {
                    const sectionFields = (section.fieldKeys || [])
                      .map((k) => allTeamMemberFields.find((f) => f.key === k))
                      .filter(Boolean) as FieldDefinition[];

                    return (
                      <div
                        key={section.id}
                        className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <GripVertical className="w-3.5 h-3.5 text-slate-300" />
                            <div>
                              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E293B]">
                                {section.title}
                              </h3>
                              {section.description && (
                                <p className="text-[11px] text-gray-500 font-normal">{section.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSectionDef(section);
                                setAddSectionDrawerOpen(true);
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded-md transition-colors cursor-pointer"
                              title="Edit section"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                deleteCustomSection("teamMember", section.id);
                                setHasUnsavedChanges(true);
                                toast.success("Section removed");
                              }}
                              className="p-1 text-slate-400 hover:text-red-500 rounded-md transition-colors cursor-pointer"
                              title="Delete section"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {sectionFields.length === 0 ? (
                          <div className="py-4 text-center border border-dashed border-slate-200 rounded-xl">
                            <p className="text-xs text-slate-400">No fields in this section yet.</p>
                          </div>
                        ) : (
                          <div className="space-y-3.5">
                            {sectionFields.map((field) => (
                              <div key={field.id || field.key}>
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <GripVertical className="w-3 h-3 text-slate-300" />
                                    <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                                      {field.label}
                                    </label>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => setEditingFieldDef(field)}
                                      className="text-[10px] text-slate-400 hover:text-blue-600 p-0.5 rounded cursor-pointer"
                                      title="Edit field settings"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveFieldFromSection(section.id, field.key)}
                                      className="text-[10px] text-slate-300 hover:text-red-500 cursor-pointer"
                                      title="Remove from section"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                                <div className="relative flex items-center rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 hover:border-[#CBD5E1] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                                  <input
                                    type="text"
                                    value={customFieldValues[field.key] ?? ""}
                                    onChange={(e) =>
                                      handleCustomFieldValueChange(field.key, e.target.value)
                                    }
                                    className="flex-1 text-xs text-[#1E293B] font-medium bg-transparent border-none outline-none"
                                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                                  />
                                  <Tag className="w-4 h-4 text-slate-400" />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* + Add Field inside section */}
                        <div className="flex justify-end mt-4 pt-1">
                          <button
                            type="button"
                            onClick={() => handleOpenAddField(section.id)}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Field
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* + Add Section Button at bottom right */}
                  <div className="flex justify-end pt-2 pb-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSectionDef(null);
                        setAddSectionDrawerOpen(true);
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Section
                    </button>
                  </div>
                </div>
              )}

              {/* Calendar Tab */}
              {activeTab === "calendar" && (
                <div className="space-y-6">
                  {/* Sync with Calendar Hero Section */}
                  <div className="flex items-start gap-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-10 h-10 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Sync with your Calendar</h3>
                      <p className="text-sm text-gray-600">
                        Connect your calendar accounts to automatically sync appointments and prevent double bookings across all your platforms.
                      </p>
                    </div>
                  </div>

                  {/* Full Calendar View */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                    {/* Calendar Header */}
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCalendarView("day")}
                          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${calendarView === "day"
                              ? "bg-primary text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                          Day
                        </button>
                        <button
                          onClick={() => setCalendarView("week")}
                          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${calendarView === "week"
                              ? "bg-primary text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                          Week
                        </button>
                        <button
                          onClick={() => setCalendarView("month")}
                          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${calendarView === "month"
                              ? "bg-primary text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                          Month
                        </button>
                        <button
                          onClick={() => setCalendarView("schedule")}
                          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${calendarView === "schedule"
                              ? "bg-primary text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                          Schedule
                        </button>
                      </div>
                      <Button
                        variant="primary"
                        onClick={() => {
                          setNewEvent((prev) => ({ ...prev, startDate: toISODate(viewDate) }));
                          setShowCreateEventModal(true);
                        }}
                        className="text-sm"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Create
                      </Button>
                    </div>

                    {/* Calendar Body */}
                    <div className="p-4">
                      {calendarView === "month" ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between mb-4">
                            <button onClick={() => navigateCalendar(-1)} className="p-1 hover:bg-gray-100 rounded">
                              <ChevronLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            <div className="text-center text-sm font-semibold text-gray-900">
                              {monthLabel}
                            </div>
                            <button onClick={() => navigateCalendar(1)} className="p-1 hover:bg-gray-100 rounded">
                              <ChevronRight className="w-5 h-5 text-gray-600" />
                            </button>
                          </div>
                          {/* Day headers */}
                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                              <div key={day} className="text-center text-xs font-semibold text-gray-700 py-2">
                                {day}
                              </div>
                            ))}
                          </div>
                          {/* Calendar grid */}
                          <div className="grid grid-cols-7 gap-1">
                            {monthCells.map((cell, i) => {
                              const dayEvents = eventsForDate(cell.date);
                              const isSelected = isSameDate(cell.date, viewDate);

                              return (
                                <div
                                  key={i}
                                  onClick={() => {
                                    setViewDate(cell.date);
                                    openCreateEventForDate(cell.date);
                                  }}
                                  className={`min-h-[80px] p-1 flex flex-col items-start text-sm rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100 ${cell.isCurrentMonth ? "bg-white" : "bg-gray-50"
                                    } ${isSelected ? "border-primary border-2" : ""}`}
                                >
                                  <div className={`text-xs font-semibold mb-1 ${cell.isCurrentMonth ? "text-gray-900" : "text-gray-400"} ${isSelected ? "text-primary" : ""}`}>
                                    {cell.date.getDate()}
                                  </div>
                                  <div className="w-full space-y-0.5">
                                    {dayEvents.slice(0, 2).map(event => (
                                      <div
                                        key={event.id}
                                        className="text-xs px-1 py-0.5 rounded truncate text-white"
                                        style={{ backgroundColor: event.color }}
                                        title={event.name}
                                      >
                                        {event.name}
                                      </div>
                                    ))}
                                    {dayEvents.length > 2 && (
                                      <div className="text-xs text-gray-500 px-1">
                                        +{dayEvents.length - 2} more
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : calendarView === "week" ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between mb-4">
                            <button onClick={() => navigateCalendar(-1)} className="p-1 hover:bg-gray-100 rounded">
                              <ChevronLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            <div className="text-center text-sm font-semibold text-gray-900">
                              {weekLabel}
                            </div>
                            <button onClick={() => navigateCalendar(1)} className="p-1 hover:bg-gray-100 rounded">
                              <ChevronRight className="w-5 h-5 text-gray-600" />
                            </button>
                          </div>
                          {/* Week View with Day Rows */}
                          <div className="space-y-2">
                            {weekDates.map((date, idx) => (
                              <div key={idx} className="flex items-start gap-3">
                                <div className="w-24 flex-shrink-0 text-sm font-semibold text-gray-900 pt-2">
                                  {WEEKDAY_NAMES[(date.getDay() + 6) % 7]}
                                  <div className="text-xs text-gray-500 font-normal">
                                    {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  </div>
                                </div>
                                <div
                                  onClick={() => openCreateEventForDate(date)}
                                  className="flex-1 min-h-[80px] bg-gray-50 rounded-lg border border-gray-200 p-3 relative cursor-pointer hover:bg-gray-100"
                                >
                                  {eventsForDate(date).map((event) => (
                                    <div
                                      key={event.id}
                                      className="p-2 rounded text-xs font-medium text-white mb-1"
                                      style={{ backgroundColor: event.color }}
                                    >
                                      {event.name}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : calendarView === "schedule" ? (
                        <div className="space-y-3">
                          <div className="text-center text-sm font-semibold text-gray-900 mb-4">
                            Upcoming Events
                          </div>
                          {calendarEvents.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                              <p className="text-sm">No scheduled events</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {calendarEvents
                                .slice()
                                .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                                .map((event) => (
                                  <div key={event.id} className="border-l-4 pl-4 py-2 group relative" style={{ borderColor: event.color }}>
                                    <div className="text-xs font-semibold text-gray-500 mb-1">
                                      {new Date(event.start).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                                    </div>
                                    <div className="text-sm font-semibold text-gray-900">{event.name}</div>
                                    <div className="text-xs text-gray-600 mt-1">
                                      {new Date(event.start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} –{" "}
                                      {new Date(event.end).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                    </div>
                                    <button
                                      onClick={() => {
                                        setCalendarEvents((prev) => prev.filter((e) => e.id !== event.id));
                                        toast.success("Event removed");
                                      }}
                                      className="absolute top-2 right-0 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between mb-4">
                            <button onClick={() => navigateCalendar(-1)} className="p-1 hover:bg-gray-100 rounded">
                              <ChevronLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            <div className="text-center text-sm font-semibold text-gray-900">
                              {dayLabel}
                            </div>
                            <button onClick={() => navigateCalendar(1)} className="p-1 hover:bg-gray-100 rounded">
                              <ChevronRight className="w-5 h-5 text-gray-600" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            {Array.from({ length: 12 }, (_, i) => i + 8).map((hour) => (
                              <div key={hour} className="flex items-start gap-2 border-t border-gray-100 pt-2">
                                <div className="w-16 text-xs text-gray-500">{hour}:00 {hour < 12 ? 'AM' : 'PM'}</div>
                                <div
                                  onClick={() => {
                                    setNewEvent((prev) => ({
                                      ...prev,
                                      startDate: toISODate(viewDate),
                                      startTime: `${String(hour).padStart(2, "0")}:00`,
                                    }));
                                    setShowCreateEventModal(true);
                                  }}
                                  className="flex-1 h-12 bg-gray-50 rounded relative cursor-pointer hover:bg-gray-100"
                                >
                                  {calendarEvents
                                    .filter((event) => {
                                      const eventDate = new Date(event.start);
                                      return isSameDate(eventDate, viewDate) && eventDate.getHours() === hour;
                                    })
                                    .map((event) => (
                                      <div
                                        key={event.id}
                                        className="absolute inset-x-0 top-0 p-2 rounded text-xs font-medium text-white"
                                        style={{ backgroundColor: event.color }}
                                      >
                                        {event.name}
                                        <div className="text-xs opacity-90 mt-0.5">
                                          {new Date(event.start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Account Settings Section */}
                  <div className="border-t border-gray-300 pt-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Account Settings</h3>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="connected-accounts" className="border border-gray-200 rounded-lg mb-3 px-4">
                        <AccordionTrigger className="text-sm font-medium text-gray-900">
                          Connected Accounts
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pt-2">
                            {connectedAccounts.length === 0 && (
                              <p className="text-sm text-gray-500 py-2">No accounts connected yet.</p>
                            )}
                            {connectedAccounts.map((account) => (
                              <div key={account.id} className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg bg-white">
                                <div className={`w-8 h-8 ${account.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                                  <span className="text-white text-sm font-bold">{account.initial}</span>
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm font-semibold text-gray-900">{account.provider}</div>
                                  <div className="text-xs text-gray-500">{account.email}</div>
                                </div>
                                <button
                                  onClick={() => handleDisconnectAccount(account.id)}
                                  className="text-sm font-medium text-red-600 hover:text-red-700"
                                >
                                  Disconnect
                                </button>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="connect-new" className="border border-gray-200 rounded-lg px-4">
                        <AccordionTrigger className="text-sm font-medium text-gray-900">
                          Connect New Account
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="grid grid-cols-2 gap-3 pt-2">
                            {connectableProviders.map((provider) => {
                              const isConnected = connectedAccounts.some((a) => a.id === provider.id);
                              return (
                                <button
                                  key={provider.id}
                                  onClick={() => handleConnectAccount(provider.id, provider.name)}
                                  disabled={isConnected}
                                  className={`flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-white transition-colors ${isConnected ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
                                    }`}
                                >
                                  <div className={`w-6 h-6 ${provider.color} ${provider.rounded}`}></div>
                                  <span className="text-sm font-medium text-gray-900">
                                    {provider.name}{isConnected ? " (connected)" : ""}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </div>
              )}

              {/* Availability & Days Off Tab (Merged & Location-Specific) */}
              {isBookable && (activeTab === "availability" || activeTab === "days-off") && (
                <MemberLocationScheduleTab
                  memberId={member?.id || member?.email || "default"}
                  memberName={member?.name || "Team Member"}
                  canBookAppointments={isBookable}
                />
              )}

              {/* Services Tab */}
              {activeTab === "services" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Package className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900">Assigned Services</h3>
                      <p className="text-xs text-gray-600">Select services this team member can provide</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {services.map((service) => (
                      <div
                        key={service.id}
                        onClick={() => toggleService(service.id)}
                        className={`p-4 border-2 rounded-xl cursor-pointer transition-colors ${service.selected ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white hover:bg-gray-50"
                          }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 ${service.selected ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"
                            }`}>
                            {service.selected && <CheckCircle className="w-4 h-4 text-white" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900">{service.name}</h4>
                                <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                  {service.category}
                                </span>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-blue-600">${service.price}</div>
                                <div className="text-xs text-gray-500">{service.duration} min</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>



            {/* Create Event Modal */}
            {showCreateEventModal && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30">
                <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
                  <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">New Event</h3>
                    <button
                      onClick={() => {
                        setShowCreateEventModal(false);
                        setNewEvent({
                          name: "",
                          startDate: "",
                          startTime: "",
                          endDate: "",
                          endTime: "",
                          allDay: false,
                          calendar: "Calendar",
                          repeat: "Don't repeat",
                          location: "",
                          attendees: [],
                        });
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Event name</label>
                      <Input
                        value={newEvent.name}
                        onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                        placeholder="Enter event name"
                        className="w-full"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Start date</label>
                        <Input
                          type="date"
                          value={newEvent.startDate}
                          onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Start time</label>
                        <Input
                          type="time"
                          value={newEvent.startTime}
                          onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                          disabled={newEvent.allDay}
                          className="w-full"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">End date</label>
                        <Input
                          type="date"
                          value={newEvent.endDate}
                          onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">End time</label>
                        <Input
                          type="time"
                          value={newEvent.endTime}
                          onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                          disabled={newEvent.allDay}
                          className="w-full"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Switch
                        checked={newEvent.allDay}
                        onCheckedChange={(checked) => setNewEvent({ ...newEvent, allDay: checked })}
                      />
                      <span className="text-sm text-gray-700">All day</span>
                    </label>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
                      <Input
                        value={newEvent.location}
                        onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                        placeholder="Add a location"
                        className="w-full"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Calendar</label>
                        <Select value={newEvent.calendar} onValueChange={(value) => setNewEvent({ ...newEvent, calendar: value })}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Calendar">Calendar</SelectItem>
                            <SelectItem value="Work">Work</SelectItem>
                            <SelectItem value="Personal">Personal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Repeat</label>
                        <Select value={newEvent.repeat} onValueChange={(value) => setNewEvent({ ...newEvent, repeat: value })}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Don't repeat">Don't repeat</SelectItem>
                            <SelectItem value="Daily">Daily</SelectItem>
                            <SelectItem value="Weekly">Weekly</SelectItem>
                            <SelectItem value="Monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowCreateEventModal(false);
                          setNewEvent({
                            name: "",
                            startDate: "",
                            startTime: "",
                            endDate: "",
                            endTime: "",
                            allDay: false,
                            calendar: "Calendar",
                            repeat: "Don't repeat",
                            location: "",
                            attendees: [],
                          });
                        }}
                        className="text-sm"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => {
                          if (!newEvent.name || !newEvent.startDate) {
                            toast.error("Please fill in required fields");
                            return;
                          }

                          // Create the event with proper date/time handling
                          const startDateTime = newEvent.allDay
                            ? new Date(`${newEvent.startDate}T00:00`)
                            : newEvent.startTime
                              ? new Date(`${newEvent.startDate}T${newEvent.startTime}`)
                              : new Date(`${newEvent.startDate}T09:00`);

                          const endDateTime = newEvent.allDay
                            ? new Date(`${newEvent.endDate || newEvent.startDate}T23:59`)
                            : newEvent.endDate && newEvent.endTime
                              ? new Date(`${newEvent.endDate}T${newEvent.endTime}`)
                              : new Date(startDateTime.getTime() + 60 * 60 * 1000); // Default 1 hour duration

                          // Add event to calendar
                          const newCalendarEvent = {
                            id: Date.now().toString(),
                            name: newEvent.name,
                            start: startDateTime,
                            end: endDateTime,
                            color: "#3B82F6" // Blue color for events
                          };

                          setCalendarEvents([...calendarEvents, newCalendarEvent]);
                          setShowCreateEventModal(false);
                          setNewEvent({
                            name: "",
                            startDate: "",
                            startTime: "",
                            endDate: "",
                            endTime: "",
                            allDay: false,
                            calendar: "Calendar",
                            repeat: "Don't repeat",
                            location: "",
                            attendees: [],
                          });
                          setHasUnsavedChanges(true);
                          toast.success("Event created successfully");
                        }}
                        className="text-sm"
                      >
                        Create Event
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Add Time Slot Modal */}
            {showAddSlotModal && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                  <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Add Time Slot</h3>
                    <button onClick={() => setShowAddSlotModal(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Day</label>
                      <Select value={newSlot.day} onValueChange={(value) => setNewSlot({ ...newSlot, day: value })}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WEEKDAY_NAMES.map((d) => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Start time</label>
                        <Input
                          type="time"
                          value={newSlot.start}
                          onChange={(e) => setNewSlot({ ...newSlot, start: e.target.value })}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">End time</label>
                        <Input
                          type="time"
                          value={newSlot.end}
                          onChange={(e) => setNewSlot({ ...newSlot, end: e.target.value })}
                          className="w-full"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
                      <Button variant="outline" onClick={() => setShowAddSlotModal(false)} className="text-sm">
                        Cancel
                      </Button>
                      <Button variant="primary" onClick={handleAddSlot} className="text-sm">
                        Add Slot
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Add Day Off Modal */}
            {showAddDayOffModal && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                  <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Add Day Off</h3>
                    <button onClick={() => setShowAddDayOffModal(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
                      <Input
                        type="date"
                        value={newDayOff.date}
                        onChange={(e) => setNewDayOff({ ...newDayOff, date: e.target.value })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Duration</label>
                      <Select value={newDayOff.duration} onValueChange={(value) => setNewDayOff({ ...newDayOff, duration: value })}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Full Day">Full Day</SelectItem>
                          <SelectItem value="Morning">Morning</SelectItem>
                          <SelectItem value="Afternoon">Afternoon</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Repeat</label>
                      <Select value={newDayOff.repeat} onValueChange={(value) => setNewDayOff({ ...newDayOff, repeat: value })}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="Weekly">Weekly</SelectItem>
                          <SelectItem value="Yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
                      <Button variant="outline" onClick={() => setShowAddDayOffModal(false)} className="text-sm">
                        Cancel
                      </Button>
                      <Button variant="primary" onClick={handleAddDayOff} className="text-sm">
                        Add Day Off
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fixed Save / Action Footer at Bottom */}
        {member && (
          <div className="absolute bottom-0 left-0 right-0 px-6 py-3 bg-white border-t border-gray-200 flex items-center justify-end gap-3 z-20 shadow-md">
            <Button
              variant="outline"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border-gray-300 rounded-lg cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setSaveStatus("saved");
                setHasUnsavedChanges(false);
                if (member?.id) {
                  const updatedMemberData = {
                    ...member,
                    name: personalInfo.fullName,
                    email: personalInfo.email,
                    phone: personalInfo.phone,
                    role: personalInfo.role,
                    department: personalInfo.department,
                    status: personalInfo.status,
                    customFields: customFieldValues,
                  };
                  try {
                    const all = getStoredTeamMembers();
                    const next = all.map((m) =>
                      String(m.id) === String(member.id) ? { ...m, ...updatedMemberData } : m
                    );
                    saveStoredTeamMembers(next);
                  } catch (e) {
                    console.error("Failed to update team member store:", e);
                  }
                  if (onSave) {
                    onSave(updatedMemberData);
                  }
                } else if (onSave) {
                  onSave({
                    name: personalInfo.fullName,
                    email: personalInfo.email,
                    phone: personalInfo.phone,
                    role: personalInfo.role,
                    department: personalInfo.department,
                    status: personalInfo.status,
                    customFields: customFieldValues,
                  });
                }
                toast.success("Profile updated successfully");
                setTimeout(() => setSaveStatus("idle"), 2500);
              }}
              className={`px-5 py-2 text-sm font-medium rounded-lg shadow-sm cursor-pointer transition-all flex items-center gap-1.5 ${
                hasUnsavedChanges ? "bg-[#1F2937] hover:bg-gray-800 text-white" : "bg-[#1F2937]/80 hover:bg-[#1F2937] text-white"
              }`}
            >
              {saveStatus === "saved" ? (
                <>
                  <Check className="w-4 h-4" />
                  Saved
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        )}
        {/* ── Select Fields Modal ────────────────────────────────────────────── */}
        {fieldModalOpen && (
          <SelectFieldsModal
            onlyModules={["teamMember"]}
            initiallySelected={
              targetSectionIdForField === "sec_basic"
                ? basicMemberCustomFieldKeys
                : (allTeamMemberSections.find((s) => s.id === targetSectionIdForField)?.fieldKeys || [])
            }
            onOpenCreateModal={() => {
              setFieldModalOpen(false);
              setCreateFieldModalOpen(true);
            }}
            isAdmin={false}
            onClose={() => {
              setFieldModalOpen(false);
              setTargetSectionIdForField(null);
            }}
            onApply={handleApplySelectedFields}
          />
        )}

        {/* ── Create Custom Field Modal (Admin linked) ───────────────────────── */}
        {createFieldModalOpen && (
          <CreateFieldModal
            lockModule="teamMember"
            isAdmin={false}
            onClose={() => setCreateFieldModalOpen(false)}
            onCreated={(newField) => {
              if (targetSectionIdForField) {
                handleApplySelectedFields([newField.key]);
              }
            }}
          />
        )}

        {/* ── Add/Edit Section Drawer (Admin linked) ─────────────────────────── */}
        {addSectionDrawerOpen && (
          <AdminSectionDrawer
            section={editingSectionDef}
            initialModule="teamMember"
            isAdmin={false}
            zIndex={10001}
            onClose={() => {
              setAddSectionDrawerOpen(false);
              setEditingSectionDef(null);
            }}
            onSaved={(savedSection) => {
              setAddSectionDrawerOpen(false);
              setEditingSectionDef(null);
              setHasUnsavedChanges(true);
              toast.success(`Section "${savedSection.title}" saved`);
            }}
          />
        )}

        {/* ── Edit Custom Field Drawer (Admin linked) ────────────────────────── */}
        {editingFieldDef && (
          <AdminFieldDrawer
            field={editingFieldDef}
            initialModule="teamMember"
            lockModule={true}
            isAdmin={false}
            onClose={() => setEditingFieldDef(null)}
            onSaved={(savedField) => {
              setEditingFieldDef(null);
              toast.success(`Field "${savedField.label}" updated`);
            }}
          />
        )}
      </Drawer>
    </>
  );
}

export default TeamMemberDrawer;