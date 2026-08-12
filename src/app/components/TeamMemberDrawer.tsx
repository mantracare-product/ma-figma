import { useState, useRef } from "react";
import { Drawer } from "./ui/drawer";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
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
import {
  User,
  CheckCircle2,
  CalendarClock,
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Trash2,
  Package,
  CheckCircle,
  Shield,
  X,
  Check,
  Search,
  Info,
} from "lucide-react";

interface TeamMemberDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  member: {
    name: string;
    email: string;
    phone?: string;
    role?: string;
  } | null;
  zIndex?: number;
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

export function TeamMemberDrawer({ isOpen, onClose, member, zIndex = 9999 }: TeamMemberDrawerProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<"personal-info" | "calendar" | "availability" | "days-off" | "services" | "permissions">("personal-info");

  // Personal Information Form State
  const [personalInfo, setPersonalInfo] = useState({
    fullName: member?.name || "",
    email: member?.email || "",
    phone: member?.phone || "",
    gender: "Male",
    dateOfBirth: "1990-01-15",
    role: member?.role || "Admin",
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

  const [customPersonalFields, setCustomPersonalFields] = useState<Array<{ id: string; label: string; type: string; value: string }>>([]);
  const [showSelectFieldModal, setShowSelectFieldModal] = useState(false);
  const [showCreateFieldModal, setShowCreateFieldModal] = useState(false);
  const [newCustomField, setNewCustomField] = useState({
    label: "",
    type: "String",
    multiple: false,
    showAlways: true,
    enableTooltip: false,
    visibleToSelected: false
  });
  const [selectFieldSearch, setSelectFieldSearch] = useState("");
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [availableFields, setAvailableFields] = useState<string[]>([
    "Name", "Status", "Email", "Phone", "Location", "Company", "Role", "Company Size", "Process",
    "Gender", "Date of Birth", "Language", "Country", "Timezone", "Assigned Service"
  ]);

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

  // Update personal info when member changes
  useState(() => {
    if (member) {
      setPersonalInfo(prev => ({
        ...prev,
        fullName: member.name || prev.fullName,
        email: member.email || prev.email,
        phone: member.phone || prev.phone,
        role: member.role || prev.role,
      }));
    }
  });

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
        title={
          <div className="w-full">
            <div className="flex items-center gap-4 mb-4">
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
                  className="w-16 h-16 rounded-xl flex items-center justify-center relative overflow-hidden transition-all group-hover:opacity-90 cursor-pointer shadow-md"
                  style={{ backgroundColor: "#1F2937" }}
                >
                  {profilePicture ? (
                    <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-xl font-bold select-none">
                      {(member?.name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </span>
                  )}
                  <div className="absolute bottom-0 right-0 w-5 h-5 bg-white rounded-full flex items-center justify-center border-2 border-gray-200 shadow-sm">
                    <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-[#020817]">{member?.name}</h3>
                <p className="text-sm text-[#6B7280]">{member?.email}</p>
              </div>
            </div>

            {/* Status Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                <span className="text-xs font-medium text-green-700">Email verified</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-medium text-blue-700">Active member</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-full">
                <CalendarClock className="w-3.5 h-3.5 text-purple-600" />
                <span className="text-xs font-medium text-purple-700">Calendar connected</span>
              </div>
            </div>
          </div>
        }
        zIndex={zIndex}
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
                    <button
                      onClick={() => setActiveTab("availability")}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer ${activeTab === "availability"
                          ? "border-[#1F2937] text-[#1F2937] font-semibold"
                          : "border-transparent text-gray-600 hover:text-gray-900"
                        }`}
                    >
                      Availability
                    </button>
                    <button
                      onClick={() => setActiveTab("days-off")}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer ${activeTab === "days-off"
                          ? "border-[#1F2937] text-[#1F2937] font-semibold"
                          : "border-transparent text-gray-600 hover:text-gray-900"
                        }`}
                    >
                      Days Off
                    </button>
                    <button
                      onClick={() => setActiveTab("services")}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer ${activeTab === "services"
                          ? "border-[#1F2937] text-[#1F2937] font-semibold"
                          : "border-transparent text-gray-600 hover:text-gray-900"
                        }`}
                    >
                      Services
                    </button>
                    <button
                      onClick={() => setActiveTab("permissions")}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer ${activeTab === "permissions"
                          ? "border-[#1F2937] text-[#1F2937] font-semibold"
                          : "border-transparent text-gray-600 hover:text-gray-900"
                        }`}
                    >
                      Permissions
                    </button>
                  </div>
                </div>
              </div>

              {/* Personal Info Tab */}
              {activeTab === "personal-info" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Full Name</label>
                      <Input
                        value={personalInfo.fullName}
                        onChange={(e) => updatePersonalInfo({ fullName: e.target.value })}
                        className="w-full text-sm"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
                      <Input
                        type="email"
                        value={personalInfo.email}
                        onChange={(e) => updatePersonalInfo({ email: e.target.value })}
                        className="w-full text-sm"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone</label>
                      <Input
                        type="tel"
                        value={personalInfo.phone}
                        onChange={(e) => updatePersonalInfo({ phone: e.target.value })}
                        className="w-full text-sm"
                      />
                    </div>

                    {/* Gender */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Gender</label>
                      <Select value={personalInfo.gender} onValueChange={(value) => updatePersonalInfo({ gender: value })}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                          <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Date of Birth</label>
                      <Input
                        type="date"
                        value={personalInfo.dateOfBirth}
                        onChange={(e) => updatePersonalInfo({ dateOfBirth: e.target.value })}
                        className="w-full text-sm"
                      />
                    </div>

                    {/* Role */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Role</label>
                      <Select value={personalInfo.role} onValueChange={(value) => updatePersonalInfo({ role: value })}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Manager">Manager</SelectItem>
                          <SelectItem value="Agent">Agent</SelectItem>
                          <SelectItem value="Supervisor">Supervisor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Language */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Language</label>
                      <Select value={personalInfo.language} onValueChange={(value) => updatePersonalInfo({ language: value })}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="English">English</SelectItem>
                          <SelectItem value="Hindi">Hindi</SelectItem>
                          <SelectItem value="Spanish">Spanish</SelectItem>
                          <SelectItem value="French">French</SelectItem>
                          <SelectItem value="German">German</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Country */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Country</label>
                      <Select value={personalInfo.country} onValueChange={(value) => updatePersonalInfo({ country: value })}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="India">India</SelectItem>
                          <SelectItem value="USA">USA</SelectItem>
                          <SelectItem value="UK">UK</SelectItem>
                          <SelectItem value="Canada">Canada</SelectItem>
                          <SelectItem value="Australia">Australia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Timezone */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Timezone</label>
                      <Select value={personalInfo.timezone} onValueChange={(value) => updatePersonalInfo({ timezone: value })}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                          <SelectItem value="UTC">UTC</SelectItem>
                          <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                          <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                          <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
                      <div className="flex items-center gap-2 h-9">
                        <Switch
                          checked={personalInfo.status}
                          onCheckedChange={(checked) => updatePersonalInfo({ status: checked })}
                        />
                        <span className="text-sm text-gray-700">{personalInfo.status ? "Active" : "Inactive"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Custom Personal Fields */}
                  {customPersonalFields.map((field) => (
                    <div key={field.id} className="grid grid-cols-2 gap-4">
                      <div className="col-span-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">{field.label}</label>
                        <Input
                          value={field.value}
                          onChange={(e) => {
                            setCustomPersonalFields(customPersonalFields.map(f =>
                              f.id === field.id ? { ...f, value: e.target.value } : f
                            ));
                            setHasUnsavedChanges(true);
                          }}
                          className="w-full text-sm"
                        />
                      </div>
                    </div>
                  ))}

                  {/* Field action links */}
                  <div className="pt-6 mt-6 border-t border-gray-200">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setShowSelectFieldModal(true)}
                        className="text-sm font-medium transition-colors cursor-pointer"
                        style={{ color: "#4F8EF7", fontFamily: "Outfit, sans-serif", fontSize: "14px", borderBottom: "1px dashed #4F8EF7", paddingBottom: "2px" }}
                      >
                        Select field
                      </button>
                    </div>
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

              {/* Availability Tab */}
              {activeTab === "availability" && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    {WEEKDAY_NAMES.map((day) => {
                      const info = availability[day];
                      return (
                        <div key={day} className="border-b border-gray-200 pb-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">{day}</h4>
                          {info.available ? (
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 bg-blue-50 rounded-full px-4 py-2">
                                <Clock className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-700">{info.start} - {info.end}</span>
                              </div>
                              <button onClick={() => handleRemoveAvailability(day)} className="text-red-500 hover:opacity-75">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-400 italic">Unavailable</span>
                              <button
                                onClick={() => {
                                  setNewSlot({ day, start: "9:00 AM", end: "5:00 PM" });
                                  setShowAddSlotModal(true);
                                }}
                                className="text-xs font-medium text-primary hover:text-primary/80"
                              >
                                + Add hours
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <Button variant="primary" className="w-full bg-[#1F2937] hover:bg-gray-800 text-white" onClick={() => setShowAddSlotModal(true)}>
                    Add Time Slots
                  </Button>
                </div>
              )}

              {/* Days Off Tab */}
              {activeTab === "days-off" && (
                <div className="space-y-6">
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="flex items-center bg-gray-50 border-b border-gray-200 px-4 py-3">
                      <div className="w-2/5 text-xs font-semibold text-gray-700">Date</div>
                      <div className="w-2/5 text-xs font-semibold text-gray-700">Duration</div>
                      <div className="w-1/5 text-xs font-semibold text-gray-700">Repeat</div>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {daysOff.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-gray-400">No days off scheduled</div>
                      ) : (
                        daysOff.map((item) => (
                          <div key={item.id} className="flex items-center px-4 py-3">
                            <div className="w-2/5 text-sm font-medium text-blue-600">{item.date}</div>
                            <div className="w-2/5">
                              <span className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-full text-xs text-gray-700">
                                {item.duration}
                              </span>
                            </div>
                            <div className="w-1/5 flex items-center justify-between">
                              <span className="text-xs text-gray-500">{item.repeat}</span>
                              <button onClick={() => handleRemoveDayOff(item.id)} className="text-red-500 hover:opacity-75">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <Button variant="primary" className="w-full bg-[#1F2937] hover:bg-gray-800 text-white" onClick={() => setShowAddDayOffModal(true)}>
                    Add Day Off
                  </Button>
                </div>
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

              {/* Permissions Tab */}
              {activeTab === "permissions" && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500 mb-2">
                    Configure what this team member can access and edit. Select Read, Write, or All (unselected = No Access).
                  </p>

                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-white divide-y divide-gray-100">
                    {[
                      "Dashboard",
                      "Clients",
                      "Calls",
                      "Processes",
                      "Numbers",
                      "Billing",
                      "Webhooks",
                      "Settings",
                    ].map((item) => {
                      const val = itemPermissions[item] || "none";
                      return (
                        <div
                          key={item}
                          className="p-3.5 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors"
                        >
                          <span className="text-xs font-bold text-gray-900">
                            {item}
                          </span>
                          <div className="flex items-center gap-4 text-xs flex-shrink-0">
                            <label className="flex items-center gap-1.5 cursor-pointer text-gray-700 select-none">
                              <input
                                type="radio"
                                name={`drawer-perm-${item}`}
                                checked={val === "view"}
                                onChange={() => setItemPermissionLevel(item, "view")}
                                className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 border-gray-300"
                              />
                              <span className="font-medium">Read</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer text-gray-700 select-none">
                              <input
                                type="radio"
                                name={`drawer-perm-${item}`}
                                checked={val === "write"}
                                onChange={() => setItemPermissionLevel(item, "write")}
                                className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 border-gray-300"
                              />
                              <span className="font-medium">Write</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer text-gray-700 select-none">
                              <input
                                type="radio"
                                name={`drawer-perm-${item}`}
                                checked={val === "all"}
                                onChange={() => setItemPermissionLevel(item, "all")}
                                className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 border-gray-300"
                              />
                              <span className="font-medium">All</span>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer-scoped modals */}
            {/* Select Field Modal */}
            {showSelectFieldModal && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30">
                <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
                  <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Select fields</h3>
                    <button
                      onClick={() => {
                        setShowSelectFieldModal(false);
                        setSelectFieldSearch("");
                        setSelectedFields([]);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        value={selectFieldSearch}
                        onChange={(e) => setSelectFieldSearch(e.target.value)}
                        placeholder="Find field..."
                        className="pl-9"
                      />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-3">About Team Member</h4>
                      <div className="grid grid-cols-2 gap-3 max-h-[240px] overflow-y-auto pr-1">
                        {availableFields
                          .filter(field => field.toLowerCase().includes(selectFieldSearch.toLowerCase()))
                          .map((field) => (
                            <label key={field} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded-md transition-colors">
                              <input
                                type="checkbox"
                                checked={selectedFields.includes(field)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedFields([...selectedFields, field]);
                                  } else {
                                    setSelectedFields(selectedFields.filter(f => f !== field));
                                  }
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              <span className="text-sm text-gray-700">{field}</span>
                            </label>
                          ))}
                      </div>
                      <div className="pt-3 mt-3 border-t border-gray-100 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setShowSelectFieldModal(false);
                            setShowCreateFieldModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50/80 rounded-md border border-dashed border-blue-200 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Create Field
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedFields.length === availableFields.length && availableFields.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFields([...availableFields]);
                            } else {
                              setSelectedFields([]);
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">Select all</span>
                      </label>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowSelectFieldModal(false);
                            setSelectFieldSearch("");
                            setSelectedFields([]);
                          }}
                          className="text-sm"
                        >
                          CANCEL
                        </Button>
                        <Button
                          variant="primary"
                          onClick={() => {
                            selectedFields.forEach(field => {
                              if (!customPersonalFields.some(f => f.label === field)) {
                                setCustomPersonalFields(prev => [...prev, {
                                  id: Date.now().toString() + field,
                                  label: field,
                                  type: "Text",
                                  value: ""
                                }]);
                              }
                            });
                            setShowSelectFieldModal(false);
                            setSelectFieldSearch("");
                            setSelectedFields([]);
                            setHasUnsavedChanges(true);
                            toast.success(`${selectedFields.length} field(s) selected`);
                          }}
                          className="text-sm"
                        >
                          SELECT
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Create Field Modal */}
            {showCreateFieldModal && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30">
                <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
                  <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Create Custom Field</h3>
                    <button
                      onClick={() => {
                        setShowCreateFieldModal(false);
                        setNewCustomField({
                          label: "",
                          type: "String",
                          multiple: false,
                          showAlways: true,
                          enableTooltip: false,
                          visibleToSelected: false
                        });
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Field Name</label>
                      <Input
                        value={newCustomField.label}
                        onChange={(e) => setNewCustomField({ ...newCustomField, label: e.target.value })}
                        placeholder="e.g. Insurance ID"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Field Type</label>
                      <Select value={newCustomField.type} onValueChange={(value) => setNewCustomField({ ...newCustomField, type: value })}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="String">String</SelectItem>
                          <SelectItem value="List">List</SelectItem>
                          <SelectItem value="Date/Time">Date/Time</SelectItem>
                          <SelectItem value="Date">Date</SelectItem>
                          <SelectItem value="Book a Resource">Book a Resource</SelectItem>
                          <SelectItem value="Address">Address</SelectItem>
                          <SelectItem value="Link">Link</SelectItem>
                          <SelectItem value="File">File</SelectItem>
                          <SelectItem value="Money">Money</SelectItem>
                          <SelectItem value="Yes/No">Yes/No</SelectItem>
                          <SelectItem value="Number">Number</SelectItem>
                          <SelectItem value="WhatsApp Link">WhatsApp Link</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newCustomField.multiple}
                          onChange={(e) => setNewCustomField({ ...newCustomField, multiple: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">Multiple</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newCustomField.showAlways}
                          onChange={(e) => setNewCustomField({ ...newCustomField, showAlways: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700 flex items-center gap-1">
                          Show always
                          <Info className="w-3 h-3 text-gray-400" />
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newCustomField.enableTooltip}
                          onChange={(e) => setNewCustomField({ ...newCustomField, enableTooltip: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">Enable field tooltip</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newCustomField.visibleToSelected}
                          onChange={(e) => setNewCustomField({ ...newCustomField, visibleToSelected: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">Make this field visible to selected users only</span>
                      </label>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowCreateFieldModal(false);
                          setNewCustomField({
                            label: "",
                            type: "String",
                            multiple: false,
                            showAlways: true,
                            enableTooltip: false,
                            visibleToSelected: false
                          });
                        }}
                        className="text-sm"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => {
                          if (!newCustomField.label.trim()) {
                            toast.error("Please enter a field name");
                            return;
                          }
                          const fieldLabel = newCustomField.label.trim();
                          setCustomPersonalFields(prev => [...prev, {
                            id: Date.now().toString(),
                            label: fieldLabel,
                            type: newCustomField.type,
                            value: ""
                          }]);
                          if (!availableFields.includes(fieldLabel)) {
                            setAvailableFields(prev => [...prev, fieldLabel]);
                          }
                          setShowCreateFieldModal(false);
                          setNewCustomField({
                            label: "",
                            type: "String",
                            multiple: false,
                            showAlways: true,
                            enableTooltip: false,
                            visibleToSelected: false
                          });
                          setHasUnsavedChanges(true);
                          toast.success("Custom field created");
                        }}
                        className="text-sm bg-blue-600 hover:bg-blue-700"
                      >
                        Create Field
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

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

        {/* Fixed Save Button at Bottom */}
        {member && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg">
            <Button
              variant="primary"
              onClick={() => {
                setSaveStatus("saved");
                setHasUnsavedChanges(false);
                toast.success("Profile updated successfully");
                setTimeout(() => setSaveStatus("idle"), 2500);
              }}
              className={`w-full text-sm transition-all ${hasUnsavedChanges ? "bg-[#1F2937] hover:bg-gray-800" : "bg-[#1F2937]/80 hover:bg-[#1F2937]"
                }`}
            >
              {saveStatus === "saved" ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Saved
                </>
              ) : hasUnsavedChanges ? (
                "Save Changes"
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        )}
      </Drawer>
    </>
  );
}