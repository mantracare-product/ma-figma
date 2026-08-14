import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { Button } from "../components/ui/Button";
import { toast } from "sonner";
import {
  Save,
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  ExternalLink,
  Plus,
  Trash2,
  User,
  Mail,
  Shield,
  CalendarClock,
  CalendarOff,
  Package,
  CheckCircle,
} from "lucide-react";

interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
}

interface WeeklyAvailability {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export type PermissionLevel = "none" | "view" | "write" | "all";

interface ItemPermissions {
  dashboard: PermissionLevel;
  clients: PermissionLevel;
  calls: PermissionLevel;
  processes: PermissionLevel;
  numbers: PermissionLevel;
  billing: PermissionLevel;
  webhooks: PermissionLevel;
  settings: PermissionLevel;
}

interface Service {
  id: number;
  name: string;
  category: string;
  duration: number;
  price: number;
}

interface User {
  id: number;
  name: string;
  email: string;
  status: boolean;
  organizationId: string;
  permissions: ItemPermissions;
  calendarConnected?: boolean;
  connectedCalendar?: "google" | "outlook" | null;
  availability?: WeeklyAvailability;
  daysOff?: string[];
  assignedServices?: number[]; // service IDs
}

export default function ManageTeamMember() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = location.state?.user as User;

  // Tab state
  const [activeTab, setActiveTab] = useState<"calendar" | "availability" | "days-off" | "services">("calendar");

  const [userFormData, setUserFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    permissions: user?.permissions || {
      dashboard: "view" as "view" | "write",
      clients: "view" as "view" | "write",
      calls: "view" as "view" | "write",
      processes: "view" as "view" | "write",
      numbers: "view" as "view" | "write",
      billing: "view" as "view" | "write",
      webhooks: "view" as "view" | "write",
      settings: "view" as "view" | "write",
    },
  });

  const [calendarConnected, setCalendarConnected] = useState(user?.calendarConnected || false);
  const [connectedCalendar, setConnectedCalendar] = useState<"google" | "outlook" | null>(
    user?.connectedCalendar || null
  );
  const [availability, setAvailability] = useState<WeeklyAvailability>(
    user?.availability || {
      monday: { enabled: true, start: "09:00", end: "17:00" },
      tuesday: { enabled: true, start: "09:00", end: "17:00" },
      wednesday: { enabled: true, start: "09:00", end: "17:00" },
      thursday: { enabled: true, start: "09:00", end: "17:00" },
      friday: { enabled: true, start: "09:00", end: "17:00" },
      saturday: { enabled: false, start: "09:00", end: "17:00" },
      sunday: { enabled: false, start: "09:00", end: "17:00" },
    }
  );
  const [daysOff, setDaysOff] = useState<string[]>(user?.daysOff || []);
  const [newDayOff, setNewDayOff] = useState("");

  // Services state
  const [assignedServices, setAssignedServices] = useState<number[]>(user?.assignedServices || []);

  // Mock services data (in a real app, this would come from a context or API)
  const availableServices: Service[] = [
    { id: 1, name: "Initial Consultation", category: "Consultation", duration: 60, price: 150 },
    { id: 2, name: "Follow-up Visit", category: "Consultation", duration: 30, price: 75 },
    { id: 3, name: "Dental Cleaning", category: "Dental", duration: 45, price: 120 },
    { id: 4, name: "X-Ray Imaging", category: "Diagnostic", duration: 20, price: 80 },
  ];

  useEffect(() => {
    if (!user) {
      navigate("/settings");
    }
  }, [user, navigate]);

  const handleSaveUser = () => {
    const updatedUser = {
      ...user,
      permissions: userFormData.permissions,
      calendarConnected,
      connectedCalendar,
      availability,
      daysOff,
      assignedServices,
    };

    navigate("/settings", { state: { updatedUser } });
    toast.success("User settings updated successfully");
  };

  const toggleServiceAssignment = (serviceId: number) => {
    if (assignedServices.includes(serviceId)) {
      setAssignedServices(assignedServices.filter((id) => id !== serviceId));
      toast.success("Service removed");
    } else {
      setAssignedServices([...assignedServices, serviceId]);
      toast.success("Service assigned");
    }
  };

  const setSectionPermission = (section: "core" | "operations" | "system", permission: "view" | "write") => {
    const newPermissions = { ...userFormData.permissions };

    if (section === "core") {
      newPermissions.dashboard = permission;
      newPermissions.clients = permission;
      newPermissions.calls = permission;
    } else if (section === "operations") {
      newPermissions.processes = permission;
      newPermissions.numbers = permission;
    } else if (section === "system") {
      newPermissions.billing = permission;
      newPermissions.webhooks = permission;
      newPermissions.settings = permission;
    }

    setUserFormData({ ...userFormData, permissions: newPermissions });
  };

  const getCurrentSectionPermission = (section: "core" | "operations" | "system"): "view" | "write" | "mixed" => {
    let items: (keyof ItemPermissions)[] = [];

    if (section === "core") {
      items = ["dashboard", "clients", "calls"];
    } else if (section === "operations") {
      items = ["processes", "numbers"];
    } else if (section === "system") {
      items = ["billing", "webhooks", "settings"];
    }

    const permissions = items.map((item) => userFormData.permissions[item]);
    const allWrite = permissions.every((p) => p === "write");
    const allView = permissions.every((p) => p === "view");

    if (allWrite) return "write";
    if (allView) return "view";
    return "mixed";
  };

  if (!user) return null;

  const workingDaysCount = Object.values(availability).filter((d) => d.enabled).length;

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/settings")}
              className="p-2.5 hover:bg-white rounded-full transition-all shadow-xs border border-slate-200 hover:shadow-sm cursor-pointer"
              style={{ color: "#64748B" }}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#222222]" style={{ fontFamily: "Outfit, sans-serif" }}>
                Manage Team Member
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Configure settings for {user.name}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate("/settings")}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveUser}>
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left Sidebar - User Info */}
          <div className="space-y-6">
            {/* User Card */}
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 pb-8">
                <div className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-4 border-4 border-white">
                  <User className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-center" style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}>
                  {user.name}
                </h3>
                <p className="text-sm text-center text-muted-foreground mt-1">{user.email}</p>
              </div>
              <div className="px-6 py-5 space-y-3 bg-muted/20">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-muted-foreground">Email verified</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <Shield className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-muted-foreground">Active member</span>
                </div>
                {calendarConnected && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center shadow-sm">
                      <CalendarClock className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-green-700 font-medium">Calendar connected</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="col-span-2 space-y-6">
            {/* Horizontal Tab Bar */}
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="flex items-center h-11 border-b-2 border-[#E5E7EB]">
            <button
              onClick={() => setActiveTab("calendar")}
              className={`h-11 px-[18px] text-sm font-medium transition-colors relative ${
                activeTab === "calendar"
                  ? "text-[#2563EB] font-semibold"
                  : "text-[#6B7280] hover:text-[#111827] hover:bg-[rgba(0,0,0,0.03)]"
              }`}
            >
              Calendar
              {activeTab === "calendar" && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2563EB]"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab("availability")}
              className={`h-11 px-[18px] text-sm font-medium transition-colors relative ${
                activeTab === "availability"
                  ? "text-[#2563EB] font-semibold"
                  : "text-[#6B7280] hover:text-[#111827] hover:bg-[rgba(0,0,0,0.03)]"
              }`}
            >
              Availability
              {activeTab === "availability" && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2563EB]"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab("days-off")}
              className={`h-11 px-[18px] text-sm font-medium transition-colors relative ${
                activeTab === "days-off"
                  ? "text-[#2563EB] font-semibold"
                  : "text-[#6B7280] hover:text-[#111827] hover:bg-[rgba(0,0,0,0.03)]"
              }`}
            >
              Days Off
              {activeTab === "days-off" && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2563EB]"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab("services")}
              className={`h-11 px-[18px] text-sm font-medium transition-colors relative ${
                activeTab === "services"
                  ? "text-[#2563EB] font-semibold"
                  : "text-[#6B7280] hover:text-[#111827] hover:bg-[rgba(0,0,0,0.03)]"
              }`}
            >
              Services
              {activeTab === "services" && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2563EB]"></div>
              )}
            </button>
          </div>
        </div>

            {/* Tab Content Areas */}
            {/* TAB 1 - Calendar Connection Section */}
            {activeTab === "calendar" && (
            <div className="bg-white rounded-2xl border border-border shadow-sm p-8">
              {/* Hero Row */}
              <div className="flex items-start gap-6 mb-8">
                <div className="w-[100px] h-[100px] bg-gradient-to-br from-[#1D4ED8] to-[#3B82F6] rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-12 h-12 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[20px] font-bold text-[#111827] mb-2">Sync with your Calendar</h3>
                  <p className="text-[13px] text-[#6B7280] max-w-[380px]">
                    Connect your calendar accounts to automatically sync appointments and prevent double bookings across all your platforms.
                  </p>
                </div>
              </div>

              {/* Connected Accounts */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-[#111827] mb-3">Connected Accounts</h4>
                <div className="space-y-3">
                  {/* Google Account */}
                  <div className="flex items-center gap-4 p-[14px] border border-[#E5E7EB] rounded-[10px]">
                    <div className="w-9 h-9 bg-[#2563EB] rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-base font-bold">G</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-[#111827]">Google</div>
                      <div className="text-xs text-[#6B7280]">john.smith@healthcare.com</div>
                    </div>
                    <button className="text-[13px] font-medium text-[#EF4444] hover:underline">
                      Disconnect
                    </button>
                  </div>

                  {/* Outlook Account */}
                  <div className="flex items-center gap-4 p-[14px] border border-[#E5E7EB] rounded-[10px]">
                    <div className="w-9 h-9 bg-[#0078D4] rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-base font-bold">O</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-[#111827]">Outlook</div>
                      <div className="text-xs text-[#6B7280]">john.smith@outlook.com</div>
                    </div>
                    <button className="text-[13px] font-medium text-[#EF4444] hover:underline">
                      Disconnect
                    </button>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-[#F3F4F6] my-4"></div>

              {/* Connect New Account */}
              <div className="mb-6">
                <div className="text-[13px] text-[#9CA3AF] text-center mb-3">Connect New Account</div>
                <div className="grid grid-cols-2 gap-3">
                  {/* Microsoft Button */}
                  <button className="flex items-center gap-3 p-3 border border-[#E5E7EB] rounded-[10px] bg-white hover:bg-[#F9FAFB] transition-colors">
                    <div className="w-5 h-5 bg-[#0078D4] rounded"></div>
                    <span className="text-sm font-medium text-[#111827]">Microsoft</span>
                  </button>

                  {/* Apple iCloud Button */}
                  <button className="flex items-center gap-3 p-3 border border-[#E5E7EB] rounded-[10px] bg-white hover:bg-[#F9FAFB] transition-colors">
                    <div className="w-5 h-5 bg-black rounded-full"></div>
                    <span className="text-sm font-medium text-[#111827]">Apple iCloud</span>
                  </button>
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="flex items-start gap-4 p-[14px] bg-[#EFF6FF] border border-[#BFDBFE] rounded-[10px]">
                <div className="w-8 h-8 bg-[#EFF6FF] rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-[#2563EB]" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-[#1D4ED8] mb-1">Your Privacy is Protected</div>
                  <div className="text-xs text-[#374151]">
                    We only sync appointment availability. Your personal calendar events and data remain completely private and secure.
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* TAB 2 - Availability Section */}
            {activeTab === "availability" && (
            <div className="bg-white rounded-2xl border border-border shadow-sm p-8">
              {/* Day Sections */}
              <div className="space-y-6">
                {/* Monday */}
                <div className="border-b border-[#E5E7EB] pb-4">
                  <h4 className="text-[15px] font-semibold text-[#111827] mb-3">Monday</h4>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-[#EFF6FF] rounded-[20px] px-[14px] py-[6px]">
                      <Clock className="w-[14px] h-[14px] text-[#2563EB]" />
                      <span className="text-[13px] font-medium text-[#2563EB]">9:00 AM - 5:00 PM</span>
                    </div>
                    <button className="text-[#EF4444] hover:opacity-75">
                      <Trash2 className="w-[14px] h-[14px]" />
                    </button>
                  </div>
                </div>

                {/* Tuesday */}
                <div className="border-b border-[#E5E7EB] pb-4">
                  <h4 className="text-[15px] font-semibold text-[#111827] mb-3">Tuesday</h4>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-[#EFF6FF] rounded-[20px] px-[14px] py-[6px]">
                      <Clock className="w-[14px] h-[14px] text-[#2563EB]" />
                      <span className="text-[13px] font-medium text-[#2563EB]">9:00 AM - 5:00 PM</span>
                    </div>
                    <button className="text-[#EF4444] hover:opacity-75">
                      <Trash2 className="w-[14px] h-[14px]" />
                    </button>
                  </div>
                </div>

                {/* Wednesday - Multiple slots */}
                <div className="border-b border-[#E5E7EB] pb-4">
                  <h4 className="text-[15px] font-semibold text-[#111827] mb-3">Wednesday</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-[#EFF6FF] rounded-[20px] px-[14px] py-[6px]">
                        <Clock className="w-[14px] h-[14px] text-[#2563EB]" />
                        <span className="text-[13px] font-medium text-[#2563EB]">3:00 PM - 4:00 PM</span>
                      </div>
                      <button className="text-[#EF4444] hover:opacity-75">
                        <Trash2 className="w-[14px] h-[14px]" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-[#EFF6FF] rounded-[20px] px-[14px] py-[6px]">
                        <Clock className="w-[14px] h-[14px] text-[#2563EB]" />
                        <span className="text-[13px] font-medium text-[#2563EB]">9:00 AM - 10:00 AM</span>
                      </div>
                      <button className="text-[#EF4444] hover:opacity-75">
                        <Trash2 className="w-[14px] h-[14px]" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Thursday */}
                <div className="border-b border-[#E5E7EB] pb-4">
                  <h4 className="text-[15px] font-semibold text-[#111827] mb-3">Thursday</h4>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-[#EFF6FF] rounded-[20px] px-[14px] py-[6px]">
                      <Clock className="w-[14px] h-[14px] text-[#2563EB]" />
                      <span className="text-[13px] font-medium text-[#2563EB]">9:00 AM - 8:00 PM</span>
                    </div>
                    <button className="text-[#EF4444] hover:opacity-75">
                      <Trash2 className="w-[14px] h-[14px]" />
                    </button>
                  </div>
                </div>

                {/* Friday - Multiple slots */}
                <div className="border-b border-[#E5E7EB] pb-4">
                  <h4 className="text-[15px] font-semibold text-[#111827] mb-3">Friday</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-[#EFF6FF] rounded-[20px] px-[14px] py-[6px]">
                        <Clock className="w-[14px] h-[14px] text-[#2563EB]" />
                        <span className="text-[13px] font-medium text-[#2563EB]">10:15 AM - 11:15 AM</span>
                      </div>
                      <button className="text-[#EF4444] hover:opacity-75">
                        <Trash2 className="w-[14px] h-[14px]" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-[#EFF6FF] rounded-[20px] px-[14px] py-[6px]">
                        <Clock className="w-[14px] h-[14px] text-[#2563EB]" />
                        <span className="text-[13px] font-medium text-[#2563EB]">12:00 PM - 1:00 PM</span>
                      </div>
                      <button className="text-[#EF4444] hover:opacity-75">
                        <Trash2 className="w-[14px] h-[14px]" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-[#EFF6FF] rounded-[20px] px-[14px] py-[6px]">
                        <Clock className="w-[14px] h-[14px] text-[#2563EB]" />
                        <span className="text-[13px] font-medium text-[#2563EB]">9:00 AM - 10:00 AM</span>
                      </div>
                      <button className="text-[#EF4444] hover:opacity-75">
                        <Trash2 className="w-[14px] h-[14px]" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-[#EFF6FF] rounded-[20px] px-[14px] py-[6px]">
                        <Clock className="w-[14px] h-[14px] text-[#2563EB]" />
                        <span className="text-[13px] font-medium text-[#2563EB]">8:15 AM - 9:15 AM</span>
                      </div>
                      <button className="text-[#EF4444] hover:opacity-75">
                        <Trash2 className="w-[14px] h-[14px]" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Saturday */}
                <div className="border-b border-[#E5E7EB] pb-4">
                  <h4 className="text-[15px] font-semibold text-[#111827] mb-3">Saturday</h4>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-[#EFF6FF] rounded-[20px] px-[14px] py-[6px]">
                      <Clock className="w-[14px] h-[14px] text-[#2563EB]" />
                      <span className="text-[13px] font-medium text-[#2563EB]">9:00 AM - 5:00 PM</span>
                    </div>
                    <button className="text-[#EF4444] hover:opacity-75">
                      <Trash2 className="w-[14px] h-[14px]" />
                    </button>
                  </div>
                </div>

                {/* Sunday */}
                <div className="pb-4">
                  <h4 className="text-[15px] font-semibold text-[#111827] mb-3">Sunday</h4>
                  <span className="text-sm text-[#9CA3AF] italic">Unavailable</span>
                </div>
              </div>

              {/* Add Time Slots Button */}
              <button className="w-full h-12 bg-[#2563EB] text-white text-sm font-semibold rounded-[10px] mt-5 hover:bg-[#1D4ED8] transition-colors">
                Add Time Slots
              </button>
            </div>
            )}

            {/* TAB 3 - Days Off Section */}
            {activeTab === "days-off" && (
            <div className="bg-white rounded-2xl border border-border shadow-sm p-8">
              {/* Table */}
              <div className="border-b border-[#E5E7EB]">
                {/* Table Header */}
                <div className="flex items-center h-12 border-b border-[#E5E7EB]">
                  <div className="w-[40%] text-[13px] font-semibold text-[#2563EB]">Date</div>
                  <div className="w-[40%] text-[13px] font-semibold text-[#2563EB]">Duration</div>
                  <div className="w-[20%] text-[13px] font-semibold text-[#2563EB]">Repeat</div>
                </div>

                {/* Row 1 */}
                <div className="flex items-center py-4 border-b border-[#E5E7EB]">
                  <div className="w-[40%] text-[13px] font-medium text-[#2563EB]">Oct 25, 2023</div>
                  <div className="w-[40%]">
                    <span className="inline-flex items-center px-3 py-1 border border-[#D1D5DB] rounded-[20px] text-xs text-[#374151]">
                      Full Day
                    </span>
                  </div>
                  <div className="w-[20%] flex items-center justify-between">
                    <span></span>
                    <button className="text-[#EF4444] hover:opacity-75">
                      <Trash2 className="w-[14px] h-[14px]" />
                    </button>
                  </div>
                </div>

                {/* Row 2 */}
                <div className="flex items-center py-4 border-b border-[#E5E7EB]">
                  <div className="w-[40%] text-[13px] font-medium text-[#2563EB]">Sep 25, 2023</div>
                  <div className="w-[40%]">
                    <div className="text-xs text-[#374151]">02:00 - 04:00</div>
                    <div className="text-xs text-[#374151]">15:00 - 04:00</div>
                  </div>
                  <div className="w-[20%] flex items-center justify-between">
                    <div className="w-5 h-5 bg-[#10B981] rounded-full flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                    <button className="text-[#EF4444] hover:opacity-75">
                      <Trash2 className="w-[14px] h-[14px]" />
                    </button>
                  </div>
                </div>

                {/* Row 3 */}
                <div className="flex items-center py-4">
                  <div className="w-[40%] text-[13px] font-medium text-[#2563EB]">Feb 25, 2023</div>
                  <div className="w-[40%] text-xs text-[#374151]">06:00 - 07:30</div>
                  <div className="w-[20%] flex items-center justify-between">
                    <span></span>
                    <button className="text-[#EF4444] hover:opacity-75">
                      <Trash2 className="w-[14px] h-[14px]" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Add Day Off Button */}
              <button className="w-full h-12 bg-[#2563EB] text-white text-sm font-semibold rounded-[10px] mt-5 hover:bg-[#1D4ED8] transition-colors">
                Add Day Off
              </button>
            </div>
            )}

            {/* TAB 4 - Assigned Services */}
            {activeTab === "services" && (
            <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold" style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}>
                    Assigned Services
                  </h3>
                  <p className="text-xs text-muted-foreground">Select services this team member can provide</p>
                </div>
                <div className="text-sm font-semibold text-blue-600">
                  {assignedServices.length} / {availableServices.length} selected
                </div>
              </div>

              <div className="space-y-3">
                {availableServices.map((service) => {
                  const isAssigned = assignedServices.includes(service.id);
                  return (
                    <div
                      key={service.id}
                      onClick={() => toggleServiceAssignment(service.id)}
                      className={`group cursor-pointer p-4 rounded-xl border-2 transition-all ${
                        isAssigned
                          ? "border-blue-400 bg-blue-50/50"
                          : "border-border bg-white hover:border-blue-200 hover:bg-blue-50/30"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            isAssigned
                              ? "bg-blue-600 border-blue-600"
                              : "border-border group-hover:border-blue-300"
                          }`}
                        >
                          {isAssigned && <CheckCircle className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="text-sm font-semibold" style={{ color: "#020817" }}>
                                {service.name}
                              </h4>
                              <span className="inline-block mt-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                                {service.category}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-blue-600">${service.price}</div>
                              <div className="text-xs text-muted-foreground">{service.duration} min</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {assignedServices.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-border rounded-xl bg-muted/20 mt-4">
                  <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Package className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No services assigned yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Click on services above to assign them</p>
                </div>
              )}
            </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
