import React, { useState, useRef, useEffect } from "react";
import { Drawer } from "../ui/Drawer";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
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
  Shield,
  CheckCircle,
  X,
  Search,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "../ui/accordion";

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileDrawer({ isOpen, onClose }: ProfileDrawerProps) {
  const [activeTab, setActiveTab] = useState<"personal-info" | "calendar" | "security">("personal-info");
  const [profilePicture, setProfilePicture] = useState<string>("");
  const profilePictureInputRef = useRef<HTMLInputElement>(null);

  // Personal Info State
  const [personalInfo, setPersonalInfo] = useState({
    fullName: "Admin User",
    email: "admin@healthcare.com",
    phone: "+1 (555) 123-4567",
    gender: "Male",
    dateOfBirth: "1990-01-15",
    role: "Admin",
    language: "English",
    country: "USA",
    timezone: "America/New_York",
    status: true,
  });

  // Calendar State
  const [calendarView, setCalendarView] = useState<"day" | "week" | "month" | "schedule">("month");
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    name: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    allDay: false,
    calendar: "Primary",
    repeat: "Don't repeat",
    location: "",
    attendees: [] as string[],
  });
  const [calendarEvents, setCalendarEvents] = useState([
    {
      id: 1,
      name: "Team Meeting",
      start: "2026-05-20T10:00:00",
      end: "2026-05-20T11:00:00",
      color: "#3b82f6",
    },
    {
      id: 2,
      name: "Client Call",
      start: "2026-05-22T14:00:00",
      end: "2026-05-22T15:00:00",
      color: "#8b5cf6",
    },
  ]);

  // Custom Fields State
  const [customPersonalFields, setCustomPersonalFields] = useState<Array<{
    id: string;
    label: string;
    type: string;
    value: string;
  }>>([]);
  const [showSelectFieldModal, setShowSelectFieldModal] = useState(false);
  const [showCreateFieldModal, setShowCreateFieldModal] = useState(false);
  const [selectFieldSearch, setSelectFieldSearch] = useState("");
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [newCustomField, setNewCustomField] = useState({
    label: "",
    type: "String",
    multiple: false,
    showAlways: true,
    enableTooltip: false,
    visibleToSelected: false,
  });

  const availableFields = [
    "Name",
    "Status",
    "Email",
    "Phone",
    "Location",
    "Company",
    "Role",
    "Company Size",
    "Process",
  ];

  const handleSaveChanges = () => {
    toast.success("Profile updated successfully");
  };

  const handleCreateEvent = () => {
    if (!newEvent.name || !newEvent.startDate || !newEvent.startTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    const eventStart = new Date(`${newEvent.startDate}T${newEvent.startTime}`);
    const eventEnd = newEvent.endDate && newEvent.endTime
      ? new Date(`${newEvent.endDate}T${newEvent.endTime}`)
      : new Date(eventStart.getTime() + 60 * 60 * 1000); // Default 1 hour

    const event = {
      id: Date.now(),
      name: newEvent.name,
      start: eventStart.toISOString(),
      end: eventEnd.toISOString(),
      color: "#3b82f6",
    };

    setCalendarEvents([...calendarEvents, event]);
    setShowCreateEventModal(false);
    setNewEvent({
      name: "",
      startDate: "",
      startTime: "",
      endDate: "",
      endTime: "",
      allDay: false,
      calendar: "Primary",
      repeat: "Don't repeat",
      location: "",
      attendees: [],
    });
    toast.success("Event created successfully");
  };

  const drawerTitle = (
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
                  toast.success("Profile picture updated");
                };
                reader.readAsDataURL(file);
              }
            }}
          />
          <div
            onClick={() => profilePictureInputRef.current?.click()}
            className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center relative overflow-hidden transition-all group-hover:opacity-80"
          >
            {profilePicture ? (
              <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-primary" />
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
          <h3 className="text-xl font-bold text-[#020817]">{personalInfo.fullName}</h3>
          <p className="text-sm text-[#6B7280]">{personalInfo.email}</p>
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
  );

  const drawerFooter = (
    <Button variant="primary" onClick={handleSaveChanges} className="w-full">
      Save Changes
    </Button>
  );

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={drawerTitle} footer={drawerFooter}>
      <div className="relative">
        <div className="space-y-6 pb-20">
          {/* Tabs */}
          <div className="border-b border-gray-200 relative">
            <div className="overflow-x-auto relative" style={{ scrollbarWidth: 'thin' }}>
              <div className="flex items-center gap-1 whitespace-nowrap">
                <button
                  onClick={() => setActiveTab("personal-info")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === "personal-info"
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Personal Info
                </button>
                <button
                  onClick={() => setActiveTab("calendar")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === "calendar"
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Calendar
                </button>
                <button
                  onClick={() => setActiveTab("security")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === "security"
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Security
                </button>
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none" />
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
                    onChange={(e) => setPersonalInfo({ ...personalInfo, fullName: e.target.value })}
                    className="w-full text-sm"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
                  <Input
                    type="email"
                    value={personalInfo.email}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                    className="w-full text-sm"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone</label>
                  <Input
                    type="tel"
                    value={personalInfo.phone}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                    className="w-full text-sm"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Gender</label>
                  <Select value={personalInfo.gender} onValueChange={(value) => setPersonalInfo({ ...personalInfo, gender: value })}>
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
                    onChange={(e) => setPersonalInfo({ ...personalInfo, dateOfBirth: e.target.value })}
                    className="w-full text-sm"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Role</label>
                  <Select value={personalInfo.role} onValueChange={(value) => setPersonalInfo({ ...personalInfo, role: value })}>
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
                  <Select value={personalInfo.language} onValueChange={(value) => setPersonalInfo({ ...personalInfo, language: value })}>
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
                  <Select value={personalInfo.country} onValueChange={(value) => setPersonalInfo({ ...personalInfo, country: value })}>
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
                  <Select value={personalInfo.timezone} onValueChange={(value) => setPersonalInfo({ ...personalInfo, timezone: value })}>
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
                      onCheckedChange={(checked) => setPersonalInfo({ ...personalInfo, status: checked })}
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
                      }}
                      className="w-full text-sm"
                    />
                  </div>
                </div>
              ))}

              {/* Add Field Actions */}
              <div className="border-t border-gray-200 pt-4 flex items-center gap-3">
                <button
                  onClick={() => setShowSelectFieldModal(true)}
                  className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Select Field
                </button>
                <button
                  onClick={() => setShowCreateFieldModal(true)}
                  className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Create Field
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
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        calendarView === "day"
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Day
                    </button>
                    <button
                      onClick={() => setCalendarView("week")}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        calendarView === "week"
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Week
                    </button>
                    <button
                      onClick={() => setCalendarView("month")}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        calendarView === "month"
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Month
                    </button>
                    <button
                      onClick={() => setCalendarView("schedule")}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        calendarView === "schedule"
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Schedule
                    </button>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => setShowCreateEventModal(true)}
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
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <ChevronLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="text-center text-sm font-semibold text-gray-900">
                          May 2026
                        </div>
                        <button className="p-1 hover:bg-gray-100 rounded">
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
                        {Array.from({ length: 35 }, (_, i) => {
                          const dayNum = i - 2;
                          const isCurrentMonth = dayNum >= 1 && dayNum <= 31;
                          const dayDate = isCurrentMonth ? dayNum : dayNum + 31;

                          // Filter events for this day (May 2026)
                          const dayEvents = calendarEvents.filter(event => {
                            const eventDate = new Date(event.start);
                            return eventDate.getMonth() === 4 && // May (0-indexed)
                                   eventDate.getFullYear() === 2026 &&
                                   eventDate.getDate() === dayDate;
                          });

                          return (
                            <div
                              key={i}
                              className={`min-h-[80px] p-1 flex flex-col items-start text-sm rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100 ${
                                isCurrentMonth ? "bg-white" : "bg-gray-50"
                              } ${dayNum === 27 ? "border-primary border-2" : ""}`}
                            >
                              <div className={`text-xs font-semibold mb-1 ${isCurrentMonth ? "text-gray-900" : "text-gray-400"} ${dayNum === 27 ? "text-primary" : ""}`}>
                                {dayDate}
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
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <ChevronLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="text-center text-sm font-semibold text-gray-900">
                          May 19 - May 25, 2026
                        </div>
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <ChevronRight className="w-5 h-5 text-gray-600" />
                        </button>
                      </div>
                      {/* Week View with Day Rows */}
                      <div className="space-y-2">
                        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day, idx) => {
                          const dateNum = 19 + idx;
                          return (
                          <div key={day} className="flex items-start gap-3">
                            <div className="w-24 flex-shrink-0 text-sm font-semibold text-gray-900 pt-2">
                              {day}
                              <div className="text-xs text-gray-500 font-normal">May {dateNum}</div>
                            </div>
                            <div className="flex-1 min-h-[80px] bg-gray-50 rounded-lg border border-gray-200 p-3 relative">
                              {calendarEvents
                                .filter((event) => {
                                  const eventDate = new Date(event.start);
                                  return eventDate.getMonth() === 4 && // May
                                         eventDate.getFullYear() === 2026 &&
                                         eventDate.getDate() === dateNum;
                                })
                                .map((event) => (
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
                          );
                        })}
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
                          {calendarEvents.map((event) => (
                            <div key={event.id} className="border-l-4 pl-4 py-2" style={{ borderColor: event.color }}>
                              <div className="text-xs font-semibold text-gray-500 mb-1">
                                {new Date(event.start).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                              </div>
                              <div className="text-sm font-semibold text-gray-900">{event.name}</div>
                              <div className="text-xs text-gray-600 mt-1">
                                {new Date(event.start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} –{" "}
                                {new Date(event.end).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-4">
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <ChevronLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="text-center text-sm font-semibold text-gray-900">
                          May 27, 2026
                        </div>
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <ChevronRight className="w-5 h-5 text-gray-600" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {Array.from({ length: 12 }, (_, i) => i + 8).map((hour) => (
                          <div key={hour} className="flex items-start gap-2 border-t border-gray-100 pt-2">
                            <div className="w-16 text-xs text-gray-500">{hour}:00 {hour < 12 ? 'AM' : 'PM'}</div>
                            <div className="flex-1 h-12 bg-gray-50 rounded relative">
                              {calendarEvents
                                .filter((event) => {
                                  const eventDate = new Date(event.start);
                                  return eventDate.getMonth() === 4 && // May
                                         eventDate.getFullYear() === 2026 &&
                                         eventDate.getDate() === 27 &&
                                         eventDate.getHours() === hour;
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
                        <div className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg bg-white">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-sm font-bold">G</span>
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-gray-900">Google</div>
                            <div className="text-xs text-gray-500">admin@healthcare.com</div>
                          </div>
                          <button className="text-sm font-medium text-red-600 hover:text-red-700">
                            Disconnect
                          </button>
                        </div>

                        <div className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg bg-white">
                          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-sm font-bold">O</span>
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-gray-900">Outlook</div>
                            <div className="text-xs text-gray-500">admin@outlook.com</div>
                          </div>
                          <button className="text-sm font-medium text-red-600 hover:text-red-700">
                            Disconnect
                          </button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="connect-new" className="border border-gray-200 rounded-lg px-4">
                    <AccordionTrigger className="text-sm font-medium text-gray-900">
                      Connect New Account
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <button className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                          <div className="w-6 h-6 bg-blue-700 rounded"></div>
                          <span className="text-sm font-medium text-gray-900">Microsoft</span>
                        </button>

                        <button className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                          <div className="w-6 h-6 bg-black rounded-full"></div>
                          <span className="text-sm font-medium text-gray-900">Apple iCloud</span>
                        </button>

                        <button className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                          <div className="w-6 h-6 bg-blue-600 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-900">Google</span>
                        </button>

                        <button className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                          <div className="w-6 h-6 bg-blue-500 rounded"></div>
                          <span className="text-sm font-medium text-gray-900">Outlook</span>
                        </button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="space-y-4">
              {/* Password Section */}
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900">Password</h4>
                    <p className="text-xs text-gray-500 mt-1">Last changed 30 days ago</p>
                  </div>
                  <Button variant="outline" className="text-sm">
                    Change Password
                  </Button>
                </div>
              </div>

              {/* Two-Factor Authentication Section */}
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900">Two-Factor Authentication</h4>
                    <p className="text-xs text-gray-500 mt-1">Add an extra layer of security</p>
                  </div>
                  <Button variant="outline" className="text-sm">
                    Enable 2FA
                  </Button>
                </div>
              </div>

              {/* Active Sessions Section */}
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900">Active Sessions</h4>
                    <p className="text-xs text-gray-500 mt-1">Manage your active sessions</p>
                  </div>
                  <Button variant="outline" className="text-sm">
                    View Sessions
                  </Button>
                </div>
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
                  <div className="grid grid-cols-2 gap-3">
                    {availableFields
                      .filter(field => field.toLowerCase().includes(selectFieldSearch.toLowerCase()))
                      .map((field) => (
                        <label key={field} className="flex items-center gap-2 cursor-pointer">
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
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFields.length === availableFields.length}
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
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => {
                        selectedFields.forEach(field => {
                          setCustomPersonalFields(prev => [...prev, {
                            id: Date.now().toString() + field,
                            label: field,
                            type: "Text",
                            value: ""
                          }]);
                        });
                        setShowSelectFieldModal(false);
                        setSelectFieldSearch("");
                        setSelectedFields([]);
                        toast.success(`${selectedFields.length} field(s) added`);
                      }}
                      className="text-sm"
                    >
                      Select
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
                    <span className="text-sm text-gray-700">Show always</span>
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
                    <span className="text-sm text-gray-700">Make visible to selected users only</span>
                  </label>
                </div>
                <div className="flex gap-2 pt-4">
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
                    className="flex-1 text-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      if (!newCustomField.label) {
                        toast.error("Please enter a field name");
                        return;
                      }
                      setCustomPersonalFields(prev => [...prev, {
                        id: Date.now().toString(),
                        label: newCustomField.label,
                        type: newCustomField.type,
                        value: ""
                      }]);
                      setShowCreateFieldModal(false);
                      setNewCustomField({
                        label: "",
                        type: "String",
                        multiple: false,
                        showAlways: true,
                        enableTooltip: false,
                        visibleToSelected: false
                      });
                      toast.success("Custom field created");
                    }}
                    className="flex-1 text-sm"
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
                      calendar: "Primary",
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Event Name</label>
                  <Input
                    value={newEvent.name}
                    onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                    placeholder="Team meeting"
                    className="w-full"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
                    <Input
                      type="date"
                      value={newEvent.startDate}
                      onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Time</label>
                    <Input
                      type="time"
                      value={newEvent.startTime}
                      onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date</label>
                    <Input
                      type="date"
                      value={newEvent.endDate}
                      onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">End Time</label>
                    <Input
                      type="time"
                      value={newEvent.endTime}
                      onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                      className="w-full"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newEvent.allDay}
                    onChange={(e) => setNewEvent({ ...newEvent, allDay: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">All day</span>
                </label>
                <div className="flex gap-2 pt-4">
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
                        calendar: "Primary",
                        repeat: "Don't repeat",
                        location: "",
                        attendees: [],
                      });
                    }}
                    className="flex-1 text-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleCreateEvent}
                    className="flex-1 text-sm"
                  >
                    Create Event
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
