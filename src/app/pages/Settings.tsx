import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Drawer } from "../components/ui/drawer";
import { Tooltip } from "../components/ui/Tooltip";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router";
import { useSidebar } from "../context/SidebarContext";
import { useFieldRegistry, FieldDefinition, FieldModule } from "../context/FieldRegistryContext";
import { TelephonyIntegrationPanel } from "../components/telephony/TelephonyIntegrationPanel";
import { getStoredWhatsAppNumbers, saveStoredWhatsAppNumbers, WHATSAPP_NUMBERS_EVENT, WhatsAppNumberEntry } from "../../lib/useWhatsAppNumbers";
import {
  Save,
  Plus,
  Edit,
  Trash2,
  Info,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Phone,
  Mail,
  Globe,
  Clock,
  MapPin,
  CreditCard,
  Calendar,
  FileText,
  Mic,
  Settings as SettingsIcon,
  Link as LinkIcon,
  Play,
  Eye,
  EyeOff,
  HelpCircle,
  AlertCircle,
  CheckCircle,
  XCircle,
  CheckCircle2,
  ExternalLink,
  Bell,
  Search,
  Coins,
  Volume2,
  Check,
  Copy,
  UploadCloud,
  AlertTriangle,
  X,
  Shield,
  ShieldCheck,
  Minus,
  MoreVertical,
  User,
  Users,
  CalendarClock,
  CalendarOff,
  Package,
  GripVertical,
  MessageSquare,
  ClipboardList,
  MessageCircle,
  Zap,
  PhoneOff,
  Ban,
  Building2,
  Sliders,
} from "lucide-react";
import { useOrganization } from "../context/OrganizationContext";
import {
  TEXT_STYLES,
  createDefaultAvailability,
  createDefaultPermissions,
  COUNTRY_PRICING,
  VOICE_MODELS,
  COUNTRIES,
  TIMEZONES,
  INDUSTRIES,
} from "./settings-constants";
import PageHeader from "../components/layout/PageHeader";
import { HowItWorksButton } from "../components/help/HowItWorksModal";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer } from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "../components/ui/accordion";
import { Calendar as CalendarComponent } from "../components/ui/calendar";
import VoiceSearchFilter, { VoiceFilters } from "../components/settings/VoiceSearchFilter";
import VoiceCard from "../components/settings/VoiceCard";
import BusinessProfileModal from "../components/settings/BusinessProfileModal";
import VerifyNumberModal from "../components/settings/VerifyNumberModal";
import { SettingsMemberProfileDrawer } from "../components/settings/SettingsMemberProfileDrawer";
import { RolesPermissionsDrawer, DEFAULT_ROLES } from "../components/settings/RolesPermissionsDrawer";
import type { ActionScope, Action, ModulePermissions, ItemPermissions, Role } from "../../types/permissions";

import { DndProvider, useDrag, useDrop } from "react-dnd";

import { HTML5Backend } from "react-dnd-html5-backend";

export type { ActionScope, Action, ModulePermissions, ItemPermissions, Role };

export interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
}

export interface WeeklyAvailability {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface User {
  id: number;
  name: string;
  email: string;
  status: boolean;
  organizationId: string;
  permissions: ItemPermissions;
  role?: string;
  calendarConnected?: boolean;
  connectedCalendar?: "google" | "outlook" | null;
  availability?: WeeklyAvailability;
  daysOff?: string[]; // Array of ISO date strings (YYYY-MM-DD)
  assignedServices?: number[]; // service IDs
}

interface CustomField {
  id: number;
  label: string;
  key: string;
  type: string;
  required: boolean;
  showAlways?: boolean;
}

interface PhoneNumber {
  id: number;
  number: string;
  country: string;
  provider: string;
  status: "active" | "inactive" | "pending";
}

interface DraggableVoiceColumnHeaderProps {
  columnKey: string;
  index: number;
  label: string;
  moveColumn: (dragIndex: number, hoverIndex: number) => void;
}

const DraggableVoiceColumnHeader: React.FC<DraggableVoiceColumnHeaderProps> = ({ columnKey, index, label, moveColumn }) => {
  const ref = useRef<HTMLTableCellElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: 'VOICE_COLUMN',
    item: { index, columnKey },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'VOICE_COLUMN',
    hover: (item: { index: number; columnKey: string }, monitor) => {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;

      moveColumn(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  drag(drop(ref));

  return (
    <th
      ref={ref}
      className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap cursor-move"
      style={{
        color: '#FFFFFF',
        fontFamily: 'Outfit, sans-serif',
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <div className="flex items-center gap-2">
        <GripVertical className="w-4 h-4 opacity-50" />
        {label}
      </div>
    </th>
  );
};

interface DraggableNumbersColumnHeaderProps {
  columnKey: string;
  index: number;
  label: string;
  width: string;
  moveColumn: (dragIndex: number, hoverIndex: number) => void;
}

const DraggableNumbersColumnHeader: React.FC<DraggableNumbersColumnHeaderProps> = ({ columnKey, index, label, width, moveColumn }) => {
  const ref = useRef<HTMLTableCellElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: 'NUMBERS_COLUMN',
    item: { index, columnKey },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'NUMBERS_COLUMN',
    hover: (item: { index: number; columnKey: string }, monitor) => {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;

      moveColumn(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  drag(drop(ref));

  return (
    <th
      ref={ref}
      style={{
        width,
        opacity: isDragging ? 0.4 : 1,
        backgroundColor: isDragging ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
        transition: 'opacity 0.2s ease-in-out, background-color 0.2s ease-in-out',
      }}
      className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap cursor-grab active:cursor-grabbing select-none"
    >
      <div className="flex items-center gap-1.5">
        <GripVertical className="w-3 h-3 opacity-40" />
        <span>{label}</span>
      </div>
    </th>
  );
};

interface CountryRouting {
  id: number;
  phoneNumber: string;
  country: string;
  priority: number;
  countriesServed: string[];
  processes: string[];
  provider: string;
  costIncoming: number;
  costOutgoing: number;
  inboundOutbound: "Inbound" | "Outbound" | "Both";
  status: boolean;
  verified: boolean;
}

interface CountryPricing {
  name: string;
  code: string;
  flag: string;
  currency: string;
  symbol: string;
  setupCost: number;
  monthlyCost: number;
  commitmentMonths: number;
}

interface TelephonyNumber {
  id: string;
  number: string;
  country: string;
  provider: string;
  status: "active" | "inactive";
  processes: string[];
  callType: "inbound" | "outbound" | "both";
  isDefault: boolean;
  incomingCost?: number;
  outgoingCost?: number;
}

interface Integration {
  id: string;
  name: string;
  description: string;
  category: "ehr" | "crm" | "telephony" | "mailbox" | "sms" | "marketing";
  connected: boolean;
  credentials?: Record<string, string>;
  processes?: string[];
}

interface AIModel {
  id: string;
  provider: string;
  modelName: string;
  status: boolean;
}

const countries = [
  { code: "+1", flag: "🇺🇸", name: "United States" },
  { code: "+44", flag: "🇬🇧", name: "United Kingdom" },
  { code: "+91", flag: "🇮🇳", name: "India" },
  { code: "+61", flag: "🇦🇺", name: "Australia" },
  { code: "+81", flag: "🇯🇵", name: "Japan" },
];

const allCountriesList = [
  "All",
  "United States",
  "United Kingdom",
  "India",
  "Australia",
  "Japan",
  "Canada",
  "Germany",
  "France",
  "Spain",
  "Italy",
  "Brazil",
  "Mexico",
  "UAE",
  "Saudi Arabia",
  "China",
  "South Korea",
  "Singapore",
  "Malaysia",
  "Thailand",
  "Indonesia",
  "Pakistan",
  "Bahrain",
  "Qatar",
  "Kuwait",
  "Netherlands",
  "Belgium",
  "Switzerland",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Poland",
  "Russia",
  "Turkey",
  "Egypt",
  "South Africa",
  "Nigeria",
  "Kenya",
  "Argentina",
  "Chile",
  "Colombia",
  "Peru",
  "Venezuela",
  "New Zealand",
  "Philippines",
  "Vietnam",
  "Ireland",
  "Portugal",
  "Greece",
  "Austria",
  "Czech Republic",
  "Hungary",
  "Romania",
  "Ukraine",
  "Israel",
  "Morocco",
  "Algeria",
  "Tunisia",
];

const timezones = [
  "UTC-08:00 (Pacific Time)",
  "UTC-05:00 (Eastern Time)",
  "UTC+00:00 (GMT)",
  "UTC+05:30 (India Standard Time)",
  "UTC+09:00 (Japan Standard Time)",
];

const industries = [
  "Healthcare",
  "Technology",
  "Finance",
  "Education",
  "Retail",
  "Manufacturing",
  "Professional Services",
  "Other",
];

const processOptions = [
  "Insurance Verification",
  "Appointment Scheduling",
  "Follow-up",
  "Payment Reminder",
];

// Helper function to check if all module actions match
const getSectionPermission = (user: User, section: "core" | "operations" | "system"): ActionScope | "mixed" => {
  const permissions = [
    user.permissions.clients.read,
    user.permissions.processes.read,
    user.permissions.calls.read,
  ];
  const first = permissions[0];
  const allSame = permissions.every((p) => p === first);

  if (allSame && first) return first;
  return "mixed";
};

// Process Checkbox Dropdown Component
interface ProcessCheckboxDropdownProps {
  selectedProcesses: string[];
  onChange: (processes: string[]) => void;
  availableProcesses: { id: string; label: string }[];
  error?: string;
  disabled?: boolean;
}

function ProcessCheckboxDropdown({
  selectedProcesses,
  onChange,
  availableProcesses,
  error,
  disabled = false,
}: ProcessCheckboxDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredProcesses = availableProcesses.filter((p) =>
    p.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleProcess = (processId: string) => {
    if (selectedProcesses.includes(processId)) {
      onChange(selectedProcesses.filter((p) => p !== processId));
    } else {
      onChange([...selectedProcesses, processId]);
    }
  };

  const selectedCount = selectedProcesses.length;
  const displayText =
    selectedCount === 0
      ? "Select process"
      : selectedCount === 1
        ? availableProcesses.find((p) => p.id === selectedProcesses[0])?.label
        : `${selectedCount} processes selected`;

  // Calculate dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4, // 4px gap below button
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [isOpen]);

  // Update position on scroll or resize
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    };

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isClickInsideButton = buttonRef.current?.contains(target);
      const isClickInsideDropdown = dropdownRef.current?.contains(target);

      if (!isClickInsideButton && !isClickInsideDropdown) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div className="relative w-full" style={{ minWidth: "260px" }}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 bg-input-background border border-input rounded-lg text-sm text-left flex items-center justify-between ${error ? "border-destructive" : ""
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-muted/30"}`}
        style={{ minWidth: "260px" }}
      >
        <span className={selectedCount === 0 ? "text-muted-foreground" : ""}>{displayText}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen &&
        !disabled &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed bg-card border border-border rounded-lg shadow-lg overflow-hidden"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              zIndex: 9999,
            }}
          >
            {/* Search */}
            <div className="p-2.5 border-b border-border bg-card sticky top-0 z-10">
              <input
                type="text"
                placeholder="Search processes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 bg-input-background border border-input rounded text-sm"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Options */}
            <div className="overflow-y-auto p-1" style={{ maxHeight: "280px" }}>
              {filteredProcesses.length > 0 ? (
                filteredProcesses.map((process) => {
                  const isSelected = selectedProcesses.includes(process.id);
                  return (
                    <label
                      key={process.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors ${isSelected ? "bg-primary/10" : "hover:bg-muted/50"
                        }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleProcess(process.id)}
                        className="w-4 h-4 flex-shrink-0 rounded border-input text-primary focus:ring-primary"
                      />
                      <span
                        className="text-sm flex-1"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          lineHeight: "1.4",
                        }}
                      >
                        {process.label}
                      </span>
                    </label>
                  );
                })
              ) : (
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">No processes found</div>
              )}
            </div>

            {/* Done Button Footer */}
            <div className="p-2.5 border-t border-border bg-card">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
              >
                Done
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default function Settings() {
  const { activeOrganization, updateOrganization } = useOrganization();
  const navigate = useNavigate();
  const location = useLocation();
  const { setCollapsed } = useSidebar();
  const [activeTab, setActiveTab] = useState("organization");
  const [billingExpanded, setBillingExpanded] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState("English");

  // Usage Alerts State
  const [usageAlert70, setUsageAlert70] = useState(true);
  const [usageAlert90, setUsageAlert90] = useState(true);
  const [balanceExhaustedAlert, setBalanceExhaustedAlert] = useState(true);
  const [usageAlertsExpanded, setUsageAlertsExpanded] = useState(false);
  const [availablePlansExpanded, setAvailablePlansExpanded] = useState(false);

  // Credit Usage State
  const [creditUsageSubTab, setCreditUsageSubTab] = useState<"overview" | "team-usage" | "credit-transactions" | "how-it-works">("overview");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [creditUsageTimeFilter, setCreditUsageTimeFilter] = useState("this-month");
  const [creditUsageTypeFilter, setCreditUsageTypeFilter] = useState("all-types");
  const [creditUsageUserFilter, setCreditUsageUserFilter] = useState("all-users");
  const [creditUsageSearchQuery, setCreditUsageSearchQuery] = useState("");
  const [creditBreakdownExpanded, setCreditBreakdownExpanded] = useState(true);
  const [buyCreditsExpanded, setBuyCreditsExpanded] = useState(false);
  const [additionalCreditsSlider, setAdditionalCreditsSlider] = useState(0);
  const buyCreditsRef = useRef<HTMLDivElement>(null);
  const [teamMembersFilter, setTeamMembersFilter] = useState<"active" | "pending">("active");
  const [teamMembersSearch, setTeamMembersSearch] = useState("");

  // Drawer State
  const [isManagePlanDrawerOpen, setIsManagePlanDrawerOpen] = useState(false);
  const [memberUsageTab, setMemberUsageTab] = useState<"breakdown" | "history">("breakdown");
  const [showMemberUsageDrawer, setShowMemberUsageDrawer] = useState(false);
  const [selectedMemberForUsage, setSelectedMemberForUsage] = useState<{ name: string; email: string; used: number; total: number; pct: number } | null>(null);
  const [openMemberRowMenu, setOpenMemberRowMenu] = useState<string | null>(null);

  // Payment Method Modal State
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [newPaymentData, setNewPaymentData] = useState({
    provider: "Visa",
    cardholderName: "",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    setAsDefault: false,
  });

  // Billing Address State
  const [isEditingBillingAddress, setIsEditingBillingAddress] = useState(false);
  const [billingAddress, setBillingAddress] = useState({
    street: "123 Healthcare Ave, Suite 100",
    city: "San Francisco",
    state: "CA",
    postalCode: "94102",
    country: "United States",
  });
  const [editBillingAddress, setEditBillingAddress] = useState(billingAddress);

  useEffect(() => {
    setCollapsed(true);
  }, [setCollapsed]);

  useEffect(() => {
    try {
      const storedNumbers = getStoredWhatsAppNumbers();
      if (storedNumbers.length > 0) {
        setIntegrations((prev) =>
          prev.map((i) =>
            i.id === "whatsapp-business"
              ? {
                ...i,
                connected: true,
                credentials: {
                  displayPhoneNumber: storedNumbers[0].displayPhoneNumber,
                  isDemo: "true",
                },
              }
              : i
          )
        );
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Privacy State
  // Verify Caller ID State
  const [businessProfile, setBusinessProfile] = useState({
    businessName: "HealthCare Solutions Inc.",
    businessType: "Corporation",
    businessIndustry: "Healthcare",
    businessRegion: "National",
    registrationIdType: "EIN (Employer Identification Number)",
    registrationNumber: "12-3456789",
    websiteUrl: "healthcaresolutions.com",
    socialMediaUrl: "linkedin.com/company/healthcaresolutions",
  });
  const [showEditBusinessModal, setShowEditBusinessModal] = useState(false);
  const [editBusinessData, setEditBusinessData] = useState({
    businessName: "",
    businessType: "",
    businessIndustry: "",
    businessRegion: "",
    registrationIdType: "",
    registrationNumber: "",
    websiteUrl: "",
    socialMediaUrl: "",
  });

  // Manage Credits State
  const [creditsData, setCreditsData] = useState({
    freeCredits: 830.0,
    freeCreditsResetDate: "Jun 4, 2026",
    purchasedCredits: 0.0,
    voiceCallsUsed: 0,
    voiceCallsTotal: 500,
    textMessagesUsed: 0,
    textMessagesTotal: 160,
    webformSubmissionsUsed: 0,
    webformSubmissionsTotal: 120,
    chatbotConversationsUsed: 0,
    chatbotConversationsTotal: 50,
    extraCreditsRemaining: 0.0,
  });

  // Team Level Credits State
  const [teamMemberFilter, setTeamMemberFilter] = useState<"active" | "pending">("active");
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [teamMembers, setTeamMembers] = useState([
    {
      id: 1,
      name: "Eye Mantra test dev",
      email: "dev@mantracare.com",
      creditsUsed: 0,
      creditsTotal: 1000,
      usagePercent: 0,
      status: "active" as const,
    },
    {
      id: 2,
      name: "Karan Hinduja",
      email: "karan@mantra.care",
      creditsUsed: 0,
      creditsTotal: 6000,
      usagePercent: 0,
      status: "active" as const,
    },
    {
      id: 3,
      name: "Varsha",
      email: "varsha@mantra.care",
      creditsUsed: 7921,
      creditsTotal: 11000,
      usagePercent: 72,
      status: "active" as const,
    },
  ]);

  // Invite Member State
  const [showInviteMemberModal, setShowInviteMemberModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [inviteErrors, setInviteErrors] = useState({ email: "", role: "" });
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<Array<{ id: number; email: string; role: string; sentAt: string }>>([]);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([
    {
      id: 1,
      time: "May 4, 2026 12:59:33",
      event: "Updated agent testing number",
      method: "PUT",
      user: "user48eyemantra",
      agent: "My First AI Agent",
      requestBody: {
        requestBody: {
          testing_number: "+918700086169"
        },
        requestParams: {
          agentId: "bd9ff90a-553a-4bc6-9f2f-367d65876478"
        },
        IPAddress: "122.176.106.103",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
        responseStatus: 200
      }
    },
    {
      id: 2,
      time: "May 4, 2026 12:59:09",
      event: "Updated agent testing number",
      method: "PUT",
      user: "user48eyemantra",
      agent: "My First AI Agent",
      requestBody: {
        requestBody: {
          testing_number: "+918700086169"
        },
        requestParams: {
          agentId: "bd9ff90a-553a-4bc6-9f2f-367d65876478"
        },
        IPAddress: "122.176.106.103",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
        responseStatus: 200
      }
    },
    {
      id: 3,
      time: "May 4, 2026 12:55:17",
      event: "Updated knowledge base and workflows",
      method: "PUT",
      user: "user48eyemantra",
      agent: "My First AI Agent",
      requestBody: {
        requestBody: {
          knowledge_base: "updated content"
        },
        requestParams: {
          agentId: "bd9ff90a-553a-4bc6-9f2f-367d65876478"
        },
        IPAddress: "122.176.106.103",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
        responseStatus: 200
      }
    },
  ]);
  const [auditLogPage, setAuditLogPage] = useState(1);
  const [showRequestBodyModal, setShowRequestBodyModal] = useState(false);
  const [selectedAuditLog, setSelectedAuditLog] = useState<any>(null);

  // Security State

  const [roboCallDetectionEnabled, setRoboCallDetectionEnabled] = useState(true);
  const [roboCallDetectionExpanded, setRoboCallDetectionExpanded] = useState(false);

  const [securityBlockedNumbers, setSecurityBlockedNumbers] = useState<Array<{ id: number; countryCode: string; phoneNumber: string }>>([
    { id: 1, countryCode: "+1", phoneNumber: "" }
  ]);
  const blockedNumbersCount = securityBlockedNumbers.filter(n => n.phoneNumber.trim() !== "").length;
  const [blockedNumbersExpanded, setBlockedNumbersExpanded] = useState(false);

  const [botBlockPhrases, setBotBlockPhrases] = useState<Array<{ id: number; phrase: string; enabled: boolean }>>([
    { id: 1, phrase: "", enabled: true }
  ]);
  const [botBlockPhrasesEnabled, setBotBlockPhrasesEnabled] = useState(true);
  const [botBlockPhrasesExpanded, setBotBlockPhrasesExpanded] = useState(false);

  // Edit Organization Modal State
  const [showEditOrgModal, setShowEditOrgModal] = useState(false);
  const [showMoreSettings, setShowMoreSettings] = useState(false);
  const [isEditingOrganization, setIsEditingOrganization] = useState(false);
  const [editOrgData, setEditOrgData] = useState({
    name: activeOrganization.name,
    industry: activeOrganization.industry || "Healthcare",
    email: activeOrganization.email,
    phone: activeOrganization.phone || "",
    countryCode: "+1",
    countryFlag: "🇺🇸",
    countryName: "United States",
    website: "https://example.com",
    preferredCallingTime: "14:00",
    timezone: "UTC-08:00 (Pacific Time)",
    defaultCallingCountry: "United States",
    address: "123 Healthcare Ave, Suite 100, San Francisco, CA 94102",
    billingContactName: "John Smith",
    billingContactEmail: "billing@healthcare.com",
    language: "English",
  });

  // Users State
  const [allUsers, setAllUsers] = useState<User[]>([
    // Healthcare Org (ID: "1")
    {
      id: 1,
      name: "John Smith",
      email: "john.smith@healthcare.com",
      status: true,
      organizationId: "1",
      role: "Admin",
      permissions: DEFAULT_ROLES[0].permissions,
      calendarConnected: true,
      connectedCalendar: "google",
      availability: createDefaultAvailability(),
      daysOff: ["2026-05-15", "2026-05-16", "2026-06-01"],
      assignedServices: [1, 2, 4],
    },
    {
      id: 2,
      name: "Sarah Johnson",
      email: "sarah.j@healthcare.com",
      status: true,
      organizationId: "1",
      role: "Manager",
      permissions: DEFAULT_ROLES[1].permissions,
      calendarConnected: true,
      connectedCalendar: "outlook",
      availability: {
        monday: { enabled: true, start: "08:00", end: "16:00" },
        tuesday: { enabled: true, start: "08:00", end: "16:00" },
        wednesday: { enabled: true, start: "08:00", end: "16:00" },
        thursday: { enabled: true, start: "08:00", end: "16:00" },
        friday: { enabled: true, start: "08:00", end: "16:00" },
        saturday: { enabled: false, start: "09:00", end: "17:00" },
        sunday: { enabled: false, start: "09:00", end: "17:00" },
      },
      assignedServices: [1, 2],
    },
    {
      id: 3,
      name: "Michael Chen",
      email: "michael.c@healthcare.com",
      status: false,
      organizationId: "1",
      role: "Sales",
      permissions: DEFAULT_ROLES[3].permissions,
    },
    {
      id: 4,
      name: "Emily Davis",
      email: "emily.d@healthcare.com",
      status: true,
      organizationId: "1",
      role: "Reception",
      permissions: DEFAULT_ROLES[2].permissions,
    },
    // Dental Care Org (ID: "2")
    {
      id: 5,
      name: "Dr. Robert Martinez",
      email: "robert.m@dentalcare.com",
      status: true,
      organizationId: "2",
      role: "Admin",
      permissions: DEFAULT_ROLES[0].permissions,
    },
    {
      id: 6,
      name: "Lisa Anderson",
      email: "lisa.a@dentalcare.com",
      status: true,
      organizationId: "2",
      role: "Manager",
      permissions: DEFAULT_ROLES[1].permissions,
    },
    {
      id: 7,
      name: "James Wilson",
      email: "james.w@dentalcare.com",
      status: true,
      organizationId: "2",
      role: "Reception",
      permissions: createDefaultPermissions(),
    },
  ]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [addUserDepartment, setAddUserDepartment] = useState("");
  const [userFormData, setUserFormData] = useState<{
    name: string;
    email: string;
    role: string;
    permissions: ItemPermissions;
  }>({
    name: "",
    email: "",
    role: "Agent",
    permissions: createDefaultPermissions(),
  });

  // Section-level permission state for Add User modal
  const [corePermission, setCorePermission] = useState<"" | ActionScope>("");
  const [operationsPermission, setOperationsPermission] = useState<"" | ActionScope>("");
  const [systemPermission, setSystemPermission] = useState<"" | ActionScope>("");

  // Roles & Permissions state
  const [roles, setRoles] = useState<Role[]>(() => {
    try {
      const raw = sessionStorage.getItem("settings_roles");
      return raw ? JSON.parse(raw) : DEFAULT_ROLES;
    } catch {
      return DEFAULT_ROLES;
    }
  });
  const [showRolesDrawer, setShowRolesDrawer] = useState(false);

  const handleSaveRoles = (updatedRoles: Role[]) => {
    setRoles(updatedRoles);
    try {
      sessionStorage.setItem("settings_roles", JSON.stringify(updatedRoles));
    } catch { }
  };

  const assignedUserCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allUsers.forEach((u) => {
      if (u.role) {
        counts[u.role] = (counts[u.role] || 0) + 1;
      }
    });
    return counts;
  }, [allUsers]);

  // Available roles dynamically sourced from roles state
  const availableRoles = useMemo(() => roles.map((r) => r.name), [roles]);

  // Manage Team Member tab state
  const [manageTeamTab, setManageTeamTab] = useState<"personal-info" | "calendar" | "availability" | "days-off" | "services" | "permissions">("personal-info");

  // Team Member Drawer State
  const [isTeamDrawerOpen, setIsTeamDrawerOpen] = useState(false);
  const [selectedTeamMember, setSelectedTeamMember] = useState<(typeof teamMembers[0] | User) | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [openOrgDropdownId, setOpenOrgDropdownId] = useState<number | null>(null);

  // Personal Information Form State
  const [personalInfo, setPersonalInfo] = useState({
    fullName: "John Smith",
    email: "john.smith@healthcare.com",
    phone: "+1 (555) 123-4567",
    gender: "Male",
    dateOfBirth: "1990-01-15",
    role: "Admin",
    language: "English",
    country: "USA",
    timezone: "UTC",
    status: true,
  });

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
  const availableFields = ["Name", "Status", "Email", "Phone", "Location", "Company", "Role", "Company Size", "Process"];

  // Calendar View State
  const [calendarView, setCalendarView] = useState<"day" | "week" | "month" | "schedule">("month");
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    name: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    allDay: false,
    calendar: "John Smith's Calendar",
    repeat: "Don't repeat",
    location: "",
    attendees: [] as string[],
  });
  const [calendarEvents, setCalendarEvents] = useState<Array<{ id: string; name: string; start: Date; end: Date; color: string }>>([]);

  // Profile Picture Upload
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const profilePictureInputRef = useRef<HTMLInputElement>(null);

  // Calendar and Availability State
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [connectedCalendar, setConnectedCalendar] = useState<"google" | "outlook" | null>(null);
  const [availability, setAvailability] = useState(createDefaultAvailability());
  const [daysOff, setDaysOff] = useState<string[]>([]);
  const [newDayOff, setNewDayOff] = useState("");

  // Save state tracking for team member drawer
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");

  // Filter users for active organization
  const users = useMemo(
    () => allUsers.filter((user) => user.organizationId === activeOrganization.id),
    [allUsers, activeOrganization.id]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-menu-container')) {
        setOpenDropdownId(null);
      }
    };

    if (openDropdownId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

  // Close organization dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.org-dropdown-menu-container')) {
        setOpenOrgDropdownId(null);
      }
    };

    if (openOrgDropdownId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openOrgDropdownId]);

  // Handle updated user data from ManageTeamMember page
  useEffect(() => {
    if (location.state?.updatedUser) {
      const updatedUser = location.state.updatedUser;
      setAllUsers((prevUsers) => prevUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
      // Clear the state
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  // Restore users from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem("settings_allUsers");
    if (saved) {
      try {
        setAllUsers(JSON.parse(saved));
      } catch (e) { }
    }
  }, []);

  // Save users to sessionStorage on change
  useEffect(() => {
    sessionStorage.setItem("settings_allUsers", JSON.stringify(allUsers));
  }, [allUsers]);

  // Custom Fields Context
  const { getCustomFields, addCustomField, updateCustomField, deleteCustomField } = useFieldRegistry();

  const tabToModule: Record<"clients" | "call-logs" | "processes" | "appointments" | "forms" | "team", FieldModule> = {
    "clients": "client",
    "call-logs": "call",
    "processes": "process",
    "appointments": "appointment",
    "forms": "appointment",
    "team": "organization",
  };

  const FIELD_TYPE_MAP: Record<string, any> = {
    "String": "text",
    "List": "select",
    "Date/Time": "date_time",
    "Date": "date",
    "Book a Resource": "text",
    "Address": "textarea",
    "Link": "link",
    "File": "text",
    "Money": "money",
    "Yes/No": "yes_no",
    "Number": "number",
    "WhatsApp Link": "whatsapp_link",
  };

  const FIELD_TYPE_REVERSE_MAP: Record<string, string> = {
    "text": "String",
    "select": "List",
    "date_time": "Date/Time",
    "date": "Date",
    "textarea": "Address",
    "link": "Link",
    "money": "Money",
    "yes_no": "Yes/No",
    "number": "Number",
    "whatsapp_link": "WhatsApp Link",
  };

  // Custom Fields Tab State
  const [customFieldsTab, setCustomFieldsTab] = useState<"clients" | "call-logs" | "processes" | "appointments" | "forms" | "team">("clients");

  const currentModule = tabToModule[customFieldsTab || "clients"];
  const [editingFieldId, setEditingFieldId] = useState<number | null>(null);
  const [editingFieldData, setEditingFieldData] = useState({ label: "", type: "String" });

  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [newFieldData, setNewFieldData] = useState({
    label: "",
    key: "",
    type: "String",
    required: false,
    multiple: false,
    showAlways: true,
    enableTooltip: false,
    visibleToSelected: false
  });

  // Phone Numbers State
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([
    { id: 1, number: "+1 (555) 123-4567", country: "United States", provider: "VAPI", status: "active" },
    { id: 2, number: "+1 (555) 987-6543", country: "United States", provider: "Twilio", status: "active" },
    { id: 3, number: "+44 20 7123 4567", country: "United Kingdom", provider: "VAPI", status: "inactive" },
  ]);
  const [showBuyNumberModal, setShowBuyNumberModal] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [showBusinessProfileModal, setShowBusinessProfileModal] = useState(false);
  const [selectedBusinessProfile, setSelectedBusinessProfile] = useState<CountryRouting | null>(null);
  const [showVerifyNumberModal, setShowVerifyNumberModal] = useState(false);
  const [selectedVerifyNumber, setSelectedVerifyNumber] = useState<CountryRouting | null>(null);

  // Buy Number Modal states
  const [buyNumberOption, setBuyNumberOption] = useState<string>("free-vapi-number");
  const [buyNumberFormData, setBuyNumberFormData] = useState({
    // Free Vapi Number
    areaCode: "",
    // Free Vapi SIP
    sipIdentifier: "",
    sipLabel: "",
    sipUsername: "",
    sipPassword: "",
    // Import Twilio
    twilioPhoneNumber: "",
    twilioAccountSid: "",
    twilioAuthToken: "",
    twilioLabel: "",
    twilioSmsEnabled: true,
    twilioCountryCode: "US",
    // Import Vonage
    vonagePhoneNumber: "",
    vonageApiKey: "",
    vonageApiSecret: "",
    vonageLabel: "",
    vonageCountryCode: "US",
    // Import Telnyx
    telnyxPhoneNumber: "",
    telnyxApiKey: "",
    telnyxLabel: "",
    telnyxCountryCode: "US",
    // BYO SIP Trunk
    byoPhoneNumber: "",
    byoAllowNonE164: false,
    byoSipTrunkCredential: "",
    byoLabel: "",
  });

  // Country Pricing Configuration
  const countryPricing: CountryPricing[] = [
    {
      name: "India",
      code: "IN",
      flag: "🇮🇳",
      currency: "INR",
      symbol: "₹",
      setupCost: 4800,
      monthlyCost: 800,
      commitmentMonths: 6,
    },
    {
      name: "United States",
      code: "US",
      flag: "🇺🇸",
      currency: "USD",
      symbol: "$",
      setupCost: 60,
      monthlyCost: 10,
      commitmentMonths: 6,
    },
    {
      name: "Canada",
      code: "CA",
      flag: "🇨🇦",
      currency: "CAD",
      symbol: "$",
      setupCost: 60,
      monthlyCost: 10,
      commitmentMonths: 6,
    },
    {
      name: "United Kingdom",
      code: "GB",
      flag: "🇬🇧",
      currency: "GBP",
      symbol: "£",
      setupCost: 48,
      monthlyCost: 8,
      commitmentMonths: 6,
    },
    {
      name: "Australia",
      code: "AU",
      flag: "🇦🇺",
      currency: "AUD",
      symbol: "$",
      setupCost: 72,
      monthlyCost: 12,
      commitmentMonths: 6,
    },
  ];

  const getSelectedPricing = () => {
    return countryPricing.find((c) => c.name === selectedCountry);
  };

  const formatCurrency = (amount: number, symbol: string, currency: string) => {
    if (currency === "INR") {
      return `${symbol}${amount.toLocaleString("en-IN")}`;
    }
    return `${symbol}${amount.toLocaleString("en-US")}`;
  };

  const handleBuyNumber = () => {
    const pricing = getSelectedPricing();
    if (!pricing) return;

    const newNumber: PhoneNumber = {
      id: phoneNumbers.length + 1,
      number: "Pending allocation",
      country: selectedCountry,
      provider: "VAPI",
      status: "pending",
    };

    setPhoneNumbers([...phoneNumbers, newNumber]);
    setShowBuyNumberModal(false);
    setSelectedCountry("");
    toast.success("Number purchase initiated. Allocation may take up to 7 days.");
  };

  // Country Routing State
  const [countryRoutings, setCountryRoutings] = useState<CountryRouting[]>([
    {
      id: 1,
      phoneNumber: "+1 (555) 123-4567",
      country: "United States",
      priority: 20,
      countriesServed: ["All"],
      processes: ["Insurance Verification", "Appointment Scheduling"],
      provider: "VAPI",
      costIncoming: 0.012,
      costOutgoing: 0.015,
      inboundOutbound: "Both",
      status: true,
      verified: true,
    },
    {
      id: 2,
      phoneNumber: "+91 200 2020",
      country: "India",
      priority: 30,
      countriesServed: ["India", "Bahrain", "Spain", "Pakistan"],
      processes: ["Insurance Verification"],
      provider: "Twilio",
      costIncoming: 0.018,
      costOutgoing: 0.022,
      inboundOutbound: "Both",
      status: true,
      verified: false,
    },
    {
      id: 3,
      phoneNumber: "+32 200 2020",
      country: "UK",
      priority: 5,
      countriesServed: ["UK"],
      processes: ["Follow-up Calls"],
      provider: "Zardarma",
      costIncoming: 0.018,
      costOutgoing: 0.022,
      inboundOutbound: "Both",
      status: true,
      verified: false,
    },
    {
      id: 4,
      phoneNumber: "+1 200 2020",
      country: "UAE",
      priority: 2,
      countriesServed: ["UK"],
      processes: ["Follow-up Calls"],
      provider: "Zardarma",
      costIncoming: 0.018,
      costOutgoing: 0.022,
      inboundOutbound: "Both",
      status: true,
      verified: false,
    },
  ]);
  const [showEditRoutingModal, setShowEditRoutingModal] = useState(false);
  const [selectedRouting, setSelectedRouting] = useState<CountryRouting | null>(null);
  const [editRoutingData, setEditRoutingData] = useState({
    phoneNumber: "",
    processes: [] as string[],
  });
  const [showAddCountryModal, setShowAddCountryModal] = useState(false);
  const [addCountryData, setAddCountryData] = useState({
    phoneNumber: "",
    country: "",
    priority: 0,
    countriesServed: [] as string[],
    allCountries: false,
    processes: [] as string[],
    provider: "",
    costIncoming: 0,
    costOutgoing: 0,
    inboundOutbound: "Both" as "Inbound" | "Outbound" | "Both",
    status: true,
  });

  const [countriesServedInput, setCountriesServedInput] = useState("");

  // Numbers table state
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editingRowData, setEditingRowData] = useState<CountryRouting | null>(null);
  const [tableScrollLeft, setTableScrollLeft] = useState(0);
  const numbersTableRef = useRef<HTMLDivElement>(null);
  const [dontCallUnlistedCountries, setDontCallUnlistedCountries] = useState(false);
  const [defaultOutboundNumber, setDefaultOutboundNumber] = useState("+1 (555) 123-4567");
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [openActionsMenuId, setOpenActionsMenuId] = useState<number | null>(null);

  // Numbers table scroll indicators
  const [showNumbersScrollIndicator, setShowNumbersScrollIndicator] = useState(true);
  const [showNumbersScrollLeftIndicator, setShowNumbersScrollLeftIndicator] = useState(false);
  const scrollIntervalRefNumbers = useRef<number | null>(null);

  // Numbers table edit process dropdown
  const [showEditProcessDropdown, setShowEditProcessDropdown] = useState(false);
  const [showEditCountriesDropdown, setShowEditCountriesDropdown] = useState(false);

  // Numbers table column order
  const defaultNumbersColumnOrder = ['phoneNumber', 'country', 'priority', 'countriesServed', 'process', 'provider', 'inboundOutbound', 'status', 'verified'];
  const [numbersColumnOrder, setNumbersColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('numbersColumnOrder');
    return saved ? JSON.parse(saved) : defaultNumbersColumnOrder;
  });

  const numbersColumnConfig: Record<string, { label: string; width: string }> = {
    phoneNumber: { label: 'Phone Number', width: '160px' },
    country: { label: 'Country', width: '130px' },
    priority: { label: 'Priority', width: '100px' },
    countriesServed: { label: 'Countries Served', width: '150px' },
    process: { label: 'Process', width: '180px' },
    provider: { label: 'Provider', width: '100px' },
    inboundOutbound: { label: 'Inbound/Outbound', width: '130px' },
    status: { label: 'Status', width: '80px' },
    verified: { label: 'Verified', width: '90px' },
  };

  const moveNumbersColumn = (dragIndex: number, hoverIndex: number) => {
    const newOrder = [...numbersColumnOrder];
    const [removed] = newOrder.splice(dragIndex, 1);
    newOrder.splice(hoverIndex, 0, removed);
    setNumbersColumnOrder(newOrder);
    localStorage.setItem('numbersColumnOrder', JSON.stringify(newOrder));
  };

  const resetNumbersColumnOrder = () => {
    setNumbersColumnOrder(defaultNumbersColumnOrder);
    localStorage.setItem('numbersColumnOrder', JSON.stringify(defaultNumbersColumnOrder));
    toast.success('Column order reset to default');
  };

  // Check if numbers table needs horizontal scroll
  useEffect(() => {
    const checkScroll = () => {
      if (numbersTableRef.current) {
        const { scrollWidth, clientWidth, scrollLeft } = numbersTableRef.current;
        const canScrollRight = scrollWidth > clientWidth && scrollLeft < (scrollWidth - clientWidth - 10);
        const canScrollLeft = scrollLeft > 10;
        setShowNumbersScrollIndicator(canScrollRight);
        setShowNumbersScrollLeftIndicator(canScrollLeft);
      }
    };

    // Use setTimeout to ensure DOM is fully rendered
    const timer = setTimeout(checkScroll, 100);
    window.addEventListener('resize', checkScroll);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkScroll);
      if (scrollIntervalRefNumbers.current) {
        cancelAnimationFrame(scrollIntervalRefNumbers.current);
      }
    };
  }, [countryRoutings]);

  // Numbers table scroll handlers
  const handleNumbersScrollRightMouseEnter = () => {
    if (scrollIntervalRefNumbers.current) {
      cancelAnimationFrame(scrollIntervalRefNumbers.current);
    }

    const scrollRight = () => {
      if (numbersTableRef.current) {
        const velocity = 5;
        numbersTableRef.current.scrollLeft += velocity;

        const { scrollWidth, clientWidth, scrollLeft } = numbersTableRef.current;
        const canScrollRight = scrollLeft < (scrollWidth - clientWidth - 10);

        setShowNumbersScrollIndicator(canScrollRight);
        setShowNumbersScrollLeftIndicator(scrollLeft > 10);

        if (canScrollRight) {
          scrollIntervalRefNumbers.current = requestAnimationFrame(scrollRight);
        }
      }
    };
    scrollIntervalRefNumbers.current = requestAnimationFrame(scrollRight);
  };

  const handleNumbersScrollLeftMouseEnter = () => {
    if (scrollIntervalRefNumbers.current) {
      cancelAnimationFrame(scrollIntervalRefNumbers.current);
    }

    const scrollLeft = () => {
      if (numbersTableRef.current) {
        const velocity = 5;
        numbersTableRef.current.scrollLeft -= velocity;

        const { scrollWidth, clientWidth, scrollLeft: currentScrollLeft } = numbersTableRef.current;

        if (currentScrollLeft <= 0) {
          cancelAnimationFrame(scrollIntervalRefNumbers.current!);
          setShowNumbersScrollLeftIndicator(false);
          setShowNumbersScrollIndicator(scrollWidth > clientWidth);
          return;
        }

        const canScrollRight = currentScrollLeft < (scrollWidth - clientWidth - 10);

        setShowNumbersScrollIndicator(canScrollRight);
        setShowNumbersScrollLeftIndicator(currentScrollLeft > 10);

        scrollIntervalRefNumbers.current = requestAnimationFrame(scrollLeft);
      }
    };
    scrollIntervalRefNumbers.current = requestAnimationFrame(scrollLeft);
  };

  const handleNumbersScrollMouseLeave = () => {
    if (scrollIntervalRefNumbers.current) {
      cancelAnimationFrame(scrollIntervalRefNumbers.current);
      scrollIntervalRefNumbers.current = null;
    }

    // Recalculate scroll indicators after mouse leaves
    if (numbersTableRef.current) {
      const { scrollWidth, clientWidth, scrollLeft } = numbersTableRef.current;
      const canScrollRight = scrollWidth > clientWidth && scrollLeft < (scrollWidth - clientWidth - 10);
      const canScrollLeft = scrollLeft > 10;
      setShowNumbersScrollIndicator(canScrollRight);
      setShowNumbersScrollLeftIndicator(canScrollLeft);
    }
  };

  const getAvailableNumbersForCountry = (country: string) => {
    const activeNumbers = phoneNumbers.filter(
      (num) => num.country === country && num.status === "active"
    );
    return activeNumbers;
  };

  const getDefaultNumberForCountry = (country: string) => {
    const numbers = getAvailableNumbersForCountry(country);
    if (numbers.length > 0) return numbers[0].number;

    // Default numbers by country
    const defaultNumbers: { [key: string]: string } = {
      "United States": "+1 (555) 000-0000",
      "United Kingdom": "+44 20 0000 0000",
      "India": "+91 22 0000 0000",
      "Canada": "+1 (555) 000-0001",
      "Australia": "+61 2 0000 0000",
    };
    return defaultNumbers[country] || "+1 (555) 000-0000";
  };

  const getDefaultProviderForCountry = (country: string) => {
    return "VAPI"; // Default provider for all countries
  };

  const getDefaultCostsForCountry = (country: string) => {
    // Default costs by country
    const defaultCosts: { [key: string]: { incoming: number; outgoing: number } } = {
      "United States": { incoming: 0.012, outgoing: 0.015 },
      "United Kingdom": { incoming: 0.018, outgoing: 0.022 },
      "India": { incoming: 0.008, outgoing: 0.010 },
      "Canada": { incoming: 0.012, outgoing: 0.015 },
      "Australia": { incoming: 0.020, outgoing: 0.025 },
    };
    return defaultCosts[country] || { incoming: 0.012, outgoing: 0.015 };
  };

  const handleEditRouting = (routing: CountryRouting) => {
    setSelectedRouting(routing);
    setEditRoutingData({
      phoneNumber: routing.phoneNumber,
      processes: routing.processes,
    });
    setShowEditRoutingModal(true);
  };

  const handleSaveRouting = () => {
    if (!selectedRouting) return;

    setCountryRoutings((prev) =>
      prev.map((r) =>
        r.id === selectedRouting.id
          ? { ...r, phoneNumber: editRoutingData.phoneNumber, processes: editRoutingData.processes }
          : r
      )
    );
    setShowEditRoutingModal(false);
    setSelectedRouting(null);
    toast.success("Routing configuration updated successfully");
  };

  const handleAddCountry = () => {
    setShowAddCountryModal(true);
  };

  const handleSubmitAddCountry = () => {
    // Validate required fields
    if (!addCountryData.phoneNumber.trim()) {
      toast.error("Phone number is required");
      return;
    }
    if (!addCountryData.phoneNumber.startsWith("+")) {
      toast.error("Phone number must start with +");
      return;
    }
    if (!addCountryData.country) {
      toast.error("Country is required");
      return;
    }
    if (!addCountryData.provider) {
      toast.error("Provider is required");
      return;
    }

    const newRouting: CountryRouting = {
      id: countryRoutings.length + 1,
      phoneNumber: addCountryData.phoneNumber,
      country: addCountryData.country,
      priority: addCountryData.priority,
      countriesServed: addCountryData.allCountries ? ["All"] : addCountryData.countriesServed,
      processes: addCountryData.processes,
      provider: addCountryData.provider,
      costIncoming: addCountryData.costIncoming,
      costOutgoing: addCountryData.costOutgoing,
      inboundOutbound: addCountryData.inboundOutbound,
      status: addCountryData.status,
      verified: addCountryData.country === "United States",
    };

    setCountryRoutings([...countryRoutings, newRouting]);
    setShowAddCountryModal(false);
    setAddCountryData({
      phoneNumber: "",
      country: "",
      priority: 0,
      countriesServed: [],
      allCountries: false,
      processes: [],
      provider: "",
      costIncoming: 0,
      costOutgoing: 0,
      inboundOutbound: "Both",
      status: true,
    });
    setCountriesServedInput("");
    toast.success("Number added successfully");
  };

  const handleDeleteRouting = (id: number) => {
    setCountryRoutings((prev) => prev.filter((r) => r.id !== id));
    toast.success("Routing configuration deleted");
  };

  const handleSaveEditedRow = () => {
    if (!editingRowData) return;

    setCountryRoutings((prev) =>
      prev.map((r) => (r.id === editingRowData.id ? editingRowData : r))
    );
    setEditingRowId(null);
    setEditingRowData(null);
    setShowEditProcessDropdown(false);
    setShowEditCountriesDropdown(false);
    toast.success("Routing configuration updated");
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditingRowData(null);
    setShowEditProcessDropdown(false);
    setShowEditCountriesDropdown(false);
  };

  const toggleProcessSelection = (process: string) => {
    setEditRoutingData((prev) => ({
      ...prev,
      processes: prev.processes.includes(process)
        ? prev.processes.filter((p) => p !== process)
        : [...prev.processes, process],
    }));
  };

  const toggleAddCountryProcessSelection = (process: string) => {
    setAddCountryData((prev) => ({
      ...prev,
      processes: prev.processes.includes(process)
        ? prev.processes.filter((p) => p !== process)
        : [...prev.processes, process],
    }));
  };

  // Integration handlers
  const [connectedWhatsAppNumbers, setConnectedWhatsAppNumbers] = useState<WhatsAppNumberEntry[]>(() => getStoredWhatsAppNumbers());
  const [showAddWhatsAppNumberForm, setShowAddWhatsAppNumberForm] = useState(false);
  const [newWhatsAppNumberInput, setNewWhatsAppNumberInput] = useState("");

  useEffect(() => {
    const syncNumbers = () => setConnectedWhatsAppNumbers(getStoredWhatsAppNumbers());
    window.addEventListener(WHATSAPP_NUMBERS_EVENT, syncNumbers);
    return () => window.removeEventListener(WHATSAPP_NUMBERS_EVENT, syncNumbers);
  }, []);

  const handleAddWhatsAppNumberSave = () => {
    if (!newWhatsAppNumberInput.trim()) {
      toast.error("Please enter a valid phone number");
      return;
    }
    const newEntry: WhatsAppNumberEntry = {
      id: `wa-${Date.now()}`,
      displayPhoneNumber: newWhatsAppNumberInput.trim(),
      name: `WhatsApp (${newWhatsAppNumberInput.trim()})`,
      wabaId: `WABA-MOCK-${Date.now()}`,
    };
    const updated = [...connectedWhatsAppNumbers, newEntry];
    saveStoredWhatsAppNumbers(updated);
    setConnectedWhatsAppNumbers(updated);
    setShowAddWhatsAppNumberForm(false);
    setNewWhatsAppNumberInput("");
    toast.success(`WhatsApp number ${newEntry.displayPhoneNumber} connected`);
  };

  const handleDisconnectWhatsAppNumber = (id: string) => {
    const updated = connectedWhatsAppNumbers.filter((n) => n.id !== id);
    saveStoredWhatsAppNumbers(updated);
    setConnectedWhatsAppNumbers(updated);

    if (updated.length === 0) {
      setIntegrations((prev) =>
        prev.map((int) =>
          int.id === "whatsapp-business" ? { ...int, connected: false, credentials: undefined } : int
        )
      );
    }
    toast.success("WhatsApp number disconnected");
  };

  const handleConnectIntegration = (integration: Integration) => {
    if (integration.id === "whatsapp-business") {
      setConnectedWhatsAppNumbers(getStoredWhatsAppNumbers());
    }
    setSelectedIntegration(integration);
    setIntegrationCredentials(integration.credentials || {});
    setVisibleFields({});
    setTestConnectionStatus("idle");
    setValidationErrors({});
    setIntegrationConfigTab("api"); // Start with API tab

    // Initialize default values for toggles
    const fields = getIntegrationFields(integration.id);
    const defaultValues: Record<string, string> = {};
    fields.forEach(field => {
      if (field.type === "toggle" && field.defaultValue) {
        defaultValues[field.name] = field.defaultValue;
      } else if (field.readonly && field.placeholder) {
        defaultValues[field.name] = field.placeholder;
      }
    });
    setIntegrationCredentials({ ...defaultValues, ...(integration.credentials || {}) });
    setShowIntegrationModal(true);
  };

  const handleManageIntegration = (integration: Integration) => {
    setSelectedIntegration(integration);
    setIntegrationCredentials(integration.credentials || {});
    setVisibleFields({});
    setTestConnectionStatus("idle");
    setValidationErrors({});
    setIntegrationConfigTab("api"); // Start with API tab when managing

    // If Bitrix is already connected, mark as tested and expand mapping section
    if (integration.id === "bitrix24" && integration.connected) {
      setBitrixConnectionTested(true);
      setIsMappingSectionExpanded(true);
    } else {
      setBitrixConnectionTested(false);
      setIsMappingSectionExpanded(false);
    }
    // If Salesforce is already connected, mark as tested and load saved processes
    if (integration.id === "salesforce" && integration.connected) {
      setSalesforceConnectionTested(true);
      setSalesforceSelectedProcesses(integration.processes || []);
    } else if (integration.id === "salesforce") {
      setSalesforceConnectionTested(false);
      setSalesforceSelectedProcesses([]);
    }
    // If Meta Lead Ads is already connected, mark as tested and load saved forms
    if (integration.id === "meta-leads" && integration.connected) {
      setMetaLeadFormsConnectionTested(true);
      setMetaSelectedForms(integration.processes || []);
    } else if (integration.id === "meta-leads") {
      setMetaLeadFormsConnectionTested(false);
      setMetaSelectedForms([]);
    }
    setShowIntegrationModal(true);
  };

  const handleMetaEmbeddedSignup = () => {
    // Meta's Embedded Signup is launched via the Facebook JS SDK's FB.login,
    // using a config_id created in Meta App Dashboard > WhatsApp > Embedded Signup.
    // This must load the FB SDK (already common practice for meta-leads-style integrations)
    // and call it with the WhatsApp-specific config_id + response_type: "code".
    if (typeof (window as any).FB === "undefined") {
      toast.error("Facebook SDK not loaded — please refresh and try again.");
      return;
    }

    (window as any).FB.login(
      (response: any) => {
        if (response.authResponse && response.authResponse.code) {
          // Exchange the auth code server-side for a system user access token,
          // WABA ID, and phone number ID. This exchange must happen on the backend —
          // never expose the app secret client-side.
          handleMetaSignupCallback(response.authResponse.code);
        } else {
          toast.error("WhatsApp signup was cancelled or did not complete.");
        }
      },
      {
        config_id: "YOUR_META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID", // from Meta App Dashboard
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {
            // Pre-fill the phone number hint if provided
            phone: integrationCredentials.phoneNumberHint || undefined,
          },
          featureType: "whatsapp_business_app_onboarding",
          sessionInfoVersion: "3",
        },
      }
    );
  };

  const handleMetaSignupCallback = async (authCode: string) => {
    try {
      const result = await fetch("/api/integrations/whatsapp/meta-signup-callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: authCode }),
      }).then((r) => r.json());

      const connectionId = `wa-${Date.now()}`;
      const newEntry: WhatsAppNumberEntry = {
        id: connectionId,
        displayPhoneNumber: result.displayPhoneNumber || "WhatsApp Number",
        name: `WhatsApp (${result.displayPhoneNumber || "WhatsApp Business"})`,
        wabaId: result.wabaId,
        phoneNumberId: result.phoneNumberId,
        businessAccountId: result.businessAccountId,
      };

      const updated = [...connectedWhatsAppNumbers, newEntry];
      saveStoredWhatsAppNumbers(updated);
      setConnectedWhatsAppNumbers(updated);

      setIntegrations((prev) =>
        prev.map((i) =>
          i.id === "whatsapp-business"
            ? { ...i, connected: true, credentials: { ...integrationCredentials, ...result, connectedViaMeta: "true" } }
            : i
        )
      );

      toast.success(`WhatsApp Business connected: ${result.displayPhoneNumber || "New Number"}`);
    } catch (err) {
      toast.error("Couldn't complete WhatsApp signup — please try again.");
    }
  };

  const handleSaveIntegration = () => {
    if (!selectedIntegration) return;

    // Salesforce-specific validation
    if (selectedIntegration.id === "salesforce") {
      // Check required fields
      if (!integrationCredentials.apiUrl || !integrationCredentials.authorizationToken) {
        if (!integrationCredentials.apiUrl) {
          setValidationErrors({ ...validationErrors, apiUrl: "API URL is required" });
        }
        if (!integrationCredentials.authorizationToken) {
          setValidationErrors({ ...validationErrors, authorizationToken: "Authorization Token is required" });
        }
        toast.error("Please fill in all required fields");
        return;
      }

      // Check if connection was tested
      if (!salesforceConnectionTested) {
        toast.error("Test connection before saving");
        return;
      }

      // Check if at least one process is selected
      if (salesforceSelectedProcesses.length === 0) {
        setSalesforceProcessValidationError("Select at least one process");
        toast.error("Select at least one process");
        return;
      }
    }

    // Meta Lead Ads-specific validation
    if (selectedIntegration.id === "meta-leads") {
      // Check required fields
      if (!integrationCredentials.appId || !integrationCredentials.appSecret || !integrationCredentials.pageAccessToken || !integrationCredentials.adAccountId || !integrationCredentials.pageId) {
        toast.error("Please fill in all required fields");
        return;
      }

      // Check if connection was tested
      if (!metaLeadFormsConnectionTested) {
        toast.error("Test connection before saving");
        return;
      }

      // Check if at least one form is selected
      if (metaSelectedForms.length === 0) {
        toast.error("Select at least one form");
        return;
      }
    }

    if (selectedIntegration.id === "whatsapp-business") {
      try {
        const existing = JSON.parse(localStorage.getItem('whatsappTemplateIntegrations') || '[]');
        const connectionId = integrationCredentials.id || `wa-${Date.now()}`;

        const credentialsData = {
          ...integrationCredentials,
          id: connectionId,
        };

        const newEntry = {
          id: connectionId,
          name: integrationCredentials.displayPhoneNumber ? `WhatsApp (${integrationCredentials.displayPhoneNumber})` : "WhatsApp Business",
          provider: "meta",
          providerLabel: "Meta Cloud API",
          credentials: credentialsData,
        };

        const isEditing = existing.some((item: any) => item.id === connectionId);
        const updated = isEditing
          ? existing.map((item: any) => item.id === connectionId ? newEntry : item)
          : [...existing, newEntry];

        localStorage.setItem('whatsappTemplateIntegrations', JSON.stringify(updated));

        integrationCredentials.id = connectionId;
        integrationCredentials.provider = "meta";
      } catch (e) {
        console.error(e);
      }
    }

    // Custom API / Webhook-specific validation
    // Custom API validation & save
    if (selectedIntegration.id === "custom-api") {
      if (!integrationCredentials.integrationName || !integrationCredentials.baseUrl) {
        toast.error("Please fill in all required fields");
        return;
      }
      try {
        const existing = JSON.parse(localStorage.getItem('customApiIntegrations') || '[]');
        const newEntry = {
          id: `custom-${Date.now()}`,
          name: integrationCredentials.integrationName,
          baseUrl: integrationCredentials.baseUrl,
          allowedMethods: integrationCredentials.allowedMethods
            ? integrationCredentials.allowedMethods.split(",")
            : [],
          fieldMappings: JSON.parse(integrationCredentials.fieldMappings || '[]'),
        };
        localStorage.setItem('customApiIntegrations', JSON.stringify([...existing, newEntry]));
      } catch (e) {
        console.error(e);
      }
    }

    // Custom Webhook validation & save
    if (selectedIntegration.id === "custom-webhook") {
      if (!integrationCredentials.integrationName || !integrationCredentials.webhookUrl) {
        toast.error("Please fill in all required fields");
        return;
      }
      try {
        const existing = JSON.parse(localStorage.getItem('customWebhookIntegrations') || '[]');
        const newEntry = {
          id: `custom-wh-${Date.now()}`,
          name: integrationCredentials.integrationName,
          webhookUrl: integrationCredentials.webhookUrl,
          authType: integrationCredentials.authType || "None",
          authValue: integrationCredentials.authValue || "",
          fieldMappings: JSON.parse(integrationCredentials.fieldMappings || '[]'),
        };
        localStorage.setItem('customWebhookIntegrations', JSON.stringify([...existing, newEntry]));
      } catch (e) {
        console.error(e);
      }
    }

    setIntegrations((prev) =>
      prev.map((int) =>
        int.id === selectedIntegration.id
          ? {
            ...int,
            connected: true,
            credentials: integrationCredentials,
            processes: selectedIntegration.id === "salesforce"
              ? salesforceSelectedProcesses
              : selectedIntegration.id === "meta-leads"
                ? metaSelectedForms
                : undefined,
          }
          : int
      )
    );

    toast.success(`${selectedIntegration.name} configuration saved successfully`);

    // For telephony integrations, switch to Numbers tab
    if (selectedIntegration.category === "telephony") {
      setIntegrationConfigTab("numbers");
    } else {
      // For all other integrations (including Bitrix and Salesforce), close the drawer
      setShowIntegrationModal(false);
      setSelectedIntegration(null);
      setIntegrationCredentials({});
      // Reset Bitrix-specific states
      if (selectedIntegration.id === "bitrix24") {
        setBitrixConnectionTested(false);
        setIsMappingSectionExpanded(false);
      }
      // Reset Salesforce-specific states
      if (selectedIntegration.id === "salesforce") {
        setSalesforceConnectionTested(false);
        setSalesforceSelectedProcesses([]);
        setSalesforceProcessValidationError("");
      }
      // Reset Meta Lead Ads-specific states
      if (selectedIntegration.id === "meta-leads") {
        setMetaLeadFormsConnectionTested(false);
        setMetaSelectedForms([]);
      }
    }
  };

  const handleDisconnectIntegration = () => {
    if (!selectedIntegration) return;

    setIntegrations((prev) =>
      prev.map((int) =>
        int.id === selectedIntegration.id
          ? { ...int, connected: false, credentials: undefined }
          : int
      )
    );

    if (selectedIntegration.id === "whatsapp-business") {
      try {
        localStorage.removeItem('whatsappTemplateIntegrations');
      } catch (e) {
        console.error(e);
      }
    }

    setShowIntegrationModal(false);
    setSelectedIntegration(null);
    setIntegrationCredentials({});
    toast.success(`${selectedIntegration.name} disconnected`);
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setTestConnectionStatus("idle");

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simulate success for demo
    setTestConnectionStatus("success");
    setIsTestingConnection(false);
    toast.success("Connection test successful");

    // For Bitrix, mark connection as tested and auto-expand mapping section
    if (selectedIntegration?.id === "bitrix24") {
      setBitrixConnectionTested(true);
      setIsMappingSectionExpanded(true);

      // Auto-scroll to mapping section after a short delay
      setTimeout(() => {
        const mappingSection = document.getElementById("bitrix-mapping-section");
        if (mappingSection) {
          mappingSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }, 300);
    }

    // For Salesforce, mark connection as tested to show process selection
    if (selectedIntegration?.id === "salesforce") {
      setSalesforceConnectionTested(true);

      // Auto-scroll to process selection after a short delay
      setTimeout(() => {
        const processSection = document.getElementById("salesforce-process-section");
        if (processSection) {
          processSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }, 300);
    }

    // For Meta Lead Ads, mark connection as tested to show form selection
    if (selectedIntegration?.id === "meta-leads") {
      setMetaLeadFormsConnectionTested(true);

      // Auto-scroll to form selection after a short delay
      setTimeout(() => {
        const formSection = document.getElementById("meta-leads-form-section");
        if (formSection) {
          formSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }, 300);
    }
  };

  const handleAddNumber = () => {
    setEditingNumber(null);
    setNumberFormData({
      number: "",
      country: "",
      processes: [],
      callType: "both",
      isDefault: false,
      incomingCost: "",
      outgoingCost: "",
    });
    setShowAdvancedSettings(false);
    setShowAddNumberModal(true);
  };

  const handleEditNumber = (number: TelephonyNumber) => {
    setEditingNumber(number);
    setNumberFormData({
      number: number.number,
      country: number.country,
      processes: number.processes,
      callType: number.callType,
      isDefault: number.isDefault,
      incomingCost: number.incomingCost?.toString() || "",
      outgoingCost: number.outgoingCost?.toString() || "",
    });
    setShowAdvancedSettings(true);
    setShowAddNumberModal(true);
  };

  const handleSaveNumber = () => {
    // Validation
    if (!numberFormData.number || !numberFormData.country) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Check for duplicate
    const isDuplicate = telephonyNumbers.some(
      (n) => n.number === numberFormData.number && n.id !== editingNumber?.id
    );
    if (isDuplicate) {
      toast.error("Duplicate number exists");
      return;
    }

    // Validate number format (must start with +)
    if (!numberFormData.number.startsWith("+")) {
      toast.error("Invalid number format. Include country code with +");
      return;
    }

    const newNumber: TelephonyNumber = {
      id: editingNumber?.id || Date.now().toString(),
      number: numberFormData.number,
      country: numberFormData.country,
      provider: selectedIntegration?.id || "",
      status: "active",
      processes: numberFormData.processes,
      callType: numberFormData.callType,
      isDefault: numberFormData.isDefault,
      incomingCost: numberFormData.incomingCost ? parseFloat(numberFormData.incomingCost) : undefined,
      outgoingCost: numberFormData.outgoingCost ? parseFloat(numberFormData.outgoingCost) : undefined,
    };

    if (editingNumber) {
      setTelephonyNumbers((prev) => prev.map((n) => (n.id === editingNumber.id ? newNumber : n)));
      toast.success("Number updated successfully");
    } else {
      setTelephonyNumbers((prev) => [...prev, newNumber]);
      toast.success("Number added successfully");
    }

    // Update default if needed
    if (numberFormData.isDefault) {
      setDefaultNumber(newNumber.number);
      // Unset other defaults
      setTelephonyNumbers((prev) =>
        prev.map((n) => (n.id === newNumber.id ? n : { ...n, isDefault: false }))
      );
    }

    setShowAddNumberModal(false);
    setEditingNumber(null);
  };

  const handleDeleteNumber = (numberId: string) => {
    setTelephonyNumbers((prev) => prev.filter((n) => n.id !== numberId));
    toast.success("Number deleted successfully");
  };

  const handleToggleNumberStatus = (numberId: string) => {
    setTelephonyNumbers((prev) =>
      prev.map((n) => (n.id === numberId ? { ...n, status: n.status === "active" ? "inactive" : "active" } : n))
    );
  };

  // Category Mapping Handlers
  const handleAddMapping = () => {
    setIsAddingMapping(true);
    setMappingFormData({ categoryId: "", processes: [] });
    setMappingValidationErrors({});
  };

  const handleSaveMapping = () => {
    const errors: Record<string, string> = {};

    if (!mappingFormData.categoryId.trim()) {
      errors.categoryId = "Category ID is required.";
    } else if (!/^\d+$/.test(mappingFormData.categoryId.trim())) {
      errors.categoryId = "Enter a valid numeric Category ID";
    }

    if (mappingFormData.processes.length === 0) {
      errors.processes = "Select at least one process.";
    }

    // Check for duplicate category ID
    const isDuplicate = categoryMappings.some(
      (m) => m.categoryId === mappingFormData.categoryId && m.id !== editingMapping?.id
    );
    if (isDuplicate) {
      errors.categoryId = "This Category ID already exists.";
    }

    if (Object.keys(errors).length > 0) {
      setMappingValidationErrors(errors);
      return;
    }

    if (editingMapping) {
      setCategoryMappings((prev) =>
        prev.map((m) =>
          m.id === editingMapping.id
            ? { ...m, categoryId: mappingFormData.categoryId, processes: mappingFormData.processes }
            : m
        )
      );
      toast.success("Mapping updated successfully");
      setEditingMapping(null);
    } else {
      const newMapping: CategoryMapping = {
        id: Date.now().toString(),
        categoryId: mappingFormData.categoryId,
        processes: mappingFormData.processes,
      };
      setCategoryMappings((prev) => [...prev, newMapping]);
      toast.success("Mapping created successfully");
      setIsAddingMapping(false);
    }

    setMappingFormData({ categoryId: "", processes: [] });
    setMappingValidationErrors({});
  };

  const handleEditMapping = (mapping: CategoryMapping) => {
    setEditingMapping(mapping);
    setMappingFormData({
      categoryId: mapping.categoryId,
      processes: mapping.processes,
    });
    setMappingValidationErrors({});
  };

  const handleCancelMapping = () => {
    setEditingMapping(null);
    setIsAddingMapping(false);
    setMappingFormData({ categoryId: "", processes: [] });
    setMappingValidationErrors({});
  };

  const handleDeleteMappingClick = (mapping: CategoryMapping) => {
    setMappingToDelete(mapping);
    setShowDeleteMappingModal(true);
  };

  const confirmDeleteMapping = () => {
    if (mappingToDelete) {
      setCategoryMappings((prev) => prev.filter((m) => m.id !== mappingToDelete.id));
      toast.success("Mapping deleted successfully");
    }
    setShowDeleteMappingModal(false);
    setMappingToDelete(null);
  };

  const getIntegrationFields = (integrationId: string) => {
    const fields: { [key: string]: Array<{ name: string; label: string; type?: string; placeholder?: string; tooltip?: string; readonly?: boolean; defaultValue?: string }> } = {
      mantracare: [
        { name: "apiKey", label: "API Key", placeholder: "Enter API key" },
        { name: "apiSecret", label: "API Secret", type: "password", placeholder: "Enter API secret" },
        { name: "endpointUrl", label: "Endpoint URL", placeholder: "https://api.mantracare.com" },
      ],
      epic: [
        { name: "clientId", label: "Client ID", placeholder: "Enter client ID" },
        { name: "clientSecret", label: "Client Secret", type: "password", placeholder: "Enter client secret" },
        { name: "fhirBaseUrl", label: "FHIR Base URL", placeholder: "https://fhir.epic.com" },
      ],
      athena: [
        { name: "clientId", label: "Client ID", placeholder: "Enter client ID" },
        { name: "clientSecret", label: "Client Secret", type: "password", placeholder: "Enter client secret" },
        { name: "practiceId", label: "Practice ID", placeholder: "Enter practice ID" },
      ],
      bitrix24: [
        {
          name: "apiUrl",
          label: "API URL",
          placeholder: "Enter Bitrix API URL",
          tooltip: "API URL is the combination of Domain, User ID, and Webhook key provided by Bitrix.",
        },
      ],
      hubspot: [
        { name: "apiKey", label: "Private App Token / API Key", placeholder: "Enter API key" },
      ],
      salesforce: [
        {
          name: "apiUrl",
          label: "API URL",
          placeholder: "Enter Salesforce API URL",
          tooltip: "Enter the Salesforce API endpoint URL.",
        },
        {
          name: "authorizationToken",
          label: "Authorization Token",
          type: "password",
          placeholder: "Enter authorization token",
          tooltip: "Token used to authenticate API requests with Salesforce.",
        },
      ],
      twilio: [
        { name: "name", label: "Name *", placeholder: "Enter connection name", tooltip: "Internal label to identify this connection" },
        { name: "accountSid", label: "Account SID *", placeholder: "Enter account SID", tooltip: "Found in Twilio Console → Account Info", type: "password" },
        { name: "authToken", label: "Auth Token *", type: "password", placeholder: "Enter auth token", tooltip: "Secret key used to authenticate API requests" },
      ],
      "tata-tele": [
        { name: "name", label: "Name *", placeholder: "Enter connection name", tooltip: "Internal reference name" },
        { name: "apiKey", label: "API Key *", placeholder: "Enter API key", tooltip: "Provided by Tata Tele for API access", type: "password" },
        { name: "authToken", label: "Auth Token *", type: "password", placeholder: "Enter auth token", tooltip: "Secret key used for authentication" },
      ],
      exotel: [
        { name: "name", label: "Name *", placeholder: "Enter connection name", tooltip: "Internal reference name" },
        { name: "sid", label: "SID *", placeholder: "Enter Exotel SID", tooltip: "Your Exotel Account SID", type: "password" },
        { name: "apiKey", label: "API Key *", placeholder: "Enter API key", tooltip: "Public API identifier", type: "password" },
        { name: "apiToken", label: "API Token *", type: "password", placeholder: "Enter API token", tooltip: "Secret token for authentication" },
        { name: "appId", label: "App ID *", placeholder: "Enter App ID", tooltip: "Exotel application identifier for routing calls" },
        { name: "subdomain", label: "Subdomain *", placeholder: "company.exotel.in", tooltip: "Your Exotel subdomain" },
      ],
      zadarma: [
        { name: "provider", label: "Provider", placeholder: "byo-sip-trunk", tooltip: "Defines SIP trunk type", readonly: true },
        { name: "name", label: "Name *", placeholder: "1011-Zadarma-SIP", tooltip: "Internal name for this SIP connection" },
        { name: "gatewayIp", label: "Gateway IP *", placeholder: "sip.zadarma.com", tooltip: "SIP server address provided by Zadarma" },
        { name: "gatewayPort", label: "Gateway Port *", placeholder: "5060", tooltip: "Standard SIP port" },
        { name: "inboundEnabled", label: "Inbound Enabled", type: "toggle", tooltip: "Enable if receiving incoming SIP calls" },
        { name: "outboundLeadingPlus", label: "Outbound Leading Plus Enabled", type: "toggle", defaultValue: "true", tooltip: "Adds '+' to outgoing numbers for international dialing" },
        { name: "authUsername", label: "Auth Username *", type: "password", placeholder: "{{ZAD-SIP-ID}}", tooltip: "Your Zadarma SIP login ID" },
        { name: "authPassword", label: "Auth Password *", type: "password", placeholder: "{{ZAD-SIP-PASS}}", tooltip: "Your Zadarma SIP password" },
      ],
      "other-telephony": [
        { name: "name", label: "Name *", placeholder: "Enter provider name", tooltip: "Internal name" },
        { name: "apiEndpoint", label: "API Endpoint", placeholder: "https://api.provider.com", tooltip: "Base URL for API" },
        { name: "apiKey", label: "API Key", type: "password", placeholder: "Enter API key", tooltip: "Authentication key (if applicable)" },
        { name: "authToken", label: "Auth Token", type: "password", placeholder: "Enter auth token", tooltip: "Secret token (if required)" },
      ],
      "meta-leads": [
        {
          name: "appId",
          label: "App ID *",
          placeholder: "Enter your Meta App ID",
          tooltip: "Found in Meta Developer Portal → Your App → Settings → Basic"
        },
        {
          name: "appSecret",
          label: "App Secret *",
          type: "password",
          placeholder: "Enter your Meta App Secret",
          tooltip: "Found in Meta Developer Portal → Your App → Settings → Basic"
        },
        {
          name: "pageAccessToken",
          label: "Page Access Token *",
          type: "password",
          placeholder: "Enter your Page Access Token",
          tooltip: "Generated from Meta Business Suite → System Users → Generate Token. Requires ads_read, leads_retrieval, pages_read_engagement permissions"
        },
        {
          name: "adAccountId",
          label: "Ad Account ID *",
          placeholder: "act_XXXXXXXXXXXXXXXXX",
          tooltip: "Found in Meta Ads Manager → Account Overview. Always starts with 'act_'"
        },
        {
          name: "pageId",
          label: "Facebook Page ID *",
          placeholder: "Enter your Facebook Page ID",
          tooltip: "Found in Facebook Page Settings → About → Page ID. Used to route incoming leads to your organization."
        },
        {
          name: "webhookVerifyToken",
          label: "Webhook Verify Token",
          placeholder: "Create a secret string e.g. mantraassist_meta_verify",
          tooltip: "A secret string you define. MantraAssist will use this to verify webhook requests from Meta are genuine."
        },
      ],
      "whatsapp-business": [],
    };

    return fields[integrationId] || [];
  };

  // Integrations State
  const [integrations, setIntegrations] = useState<Integration[]>([
    // EHR
    { id: "mantracare", name: "MantraCare", description: "Electronic health records system", category: "ehr", connected: false },
    { id: "epic", name: "Epic", description: "Enterprise healthcare software", category: "ehr", connected: false },
    { id: "athena", name: "Athena Health", description: "Cloud-based EHR and practice management", category: "ehr", connected: false },

    // CRM / Data Source
    { id: "bitrix24", name: "Bitrix 24", description: "Collaboration and CRM platform", category: "crm", connected: false },
    { id: "hubspot", name: "HubSpot", description: "Marketing and sales CRM", category: "crm", connected: false },
    { id: "salesforce", name: "Salesforce", description: "Cloud-based CRM solution", category: "crm", connected: true },
    { id: "custom-api", name: "Custom API", description: "Connect any REST API endpoint", category: "crm", connected: false },
    { id: "custom-webhook", name: "Custom Webhook", description: "Send event payloads to any webhook endpoint", category: "crm", connected: false },

    // Telephony
    { id: "twilio", name: "Twilio", description: "Cloud communications platform", category: "telephony", connected: true },
    { id: "tata-tele", name: "Tata Tele", description: "Enterprise telephony services", category: "telephony", connected: false },
    { id: "exotel", name: "Exotel", description: "Cloud telephony and communication API", category: "telephony", connected: false },
    { id: "zadarma", name: "Zadarma", description: "SIP trunk and VoIP provider", category: "telephony", connected: false },
    { id: "other-telephony", name: "Other Provider", description: "Custom telephony provider", category: "telephony", connected: false },

    // Mailbox
    { id: "gmail", name: "Gmail", description: "Google email service for business communication", category: "mailbox", connected: false },
    { id: "outlook", name: "Outlook", description: "Microsoft email and calendar integration", category: "mailbox", connected: false },

    // SMS
    { id: "twilio-sms", name: "Twilio", description: "Cloud communications platform for SMS", category: "sms", connected: false },

    // Marketing
    { id: "meta-leads", name: "Meta Lead Ads", description: "Pull leads from your Meta Ad campaigns automatically", category: "marketing", connected: false },
    { id: "whatsapp-business", name: "WhatsApp Business", description: "Send and receive WhatsApp messages, manage templates, and automate conversations", category: "marketing", connected: false },
  ]);
  const [integrationTab, setIntegrationTab] = useState<"ehr" | "crm" | "telephony" | "mailbox" | "sms" | "marketing">("ehr");
  const [metaLeadFormsConnectionTested, setMetaLeadFormsConnectionTested] = useState(false);
  const [metaSelectedForms, setMetaSelectedForms] = useState<string[]>([]);
  const [metaMockForms] = useState([
    { id: "form_001", label: "Patient Intake Form — Campaign A" },
    { id: "form_002", label: "Free Consultation — Campaign B" },
    { id: "form_003", label: "Summer Offer Form — Campaign C" },
  ]);
  // Mailbox Modal State
  const [showMailboxModal, setShowMailboxModal] = useState(false);
  const [selectedMailboxProvider, setSelectedMailboxProvider] = useState<"gmail" | "outlook" | null>(null);
  const [mailboxImportRange, setMailboxImportRange] = useState("1 week");
  const [mailboxImportEmails, setMailboxImportEmails] = useState(false);
  const [mailboxOutgoingSenderName, setMailboxOutgoingSenderName] = useState(false);
  const [mailboxDailyEmailLimit, setMailboxDailyEmailLimit] = useState(false);
  const [mailboxCRMIntegration, setMailboxCRMIntegration] = useState(false);
  const [mailboxAddToCalendar, setMailboxAddToCalendar] = useState(true);
  const [mailboxUsers, setMailboxUsers] = useState<string[]>([]);
  const [mailboxUserInput, setMailboxUserInput] = useState("");
  // SMS Modal State
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [smsTwilioSID, setSmsTwilioSID] = useState("");
  const [smsTwilioToken, setSmsTwilioToken] = useState("");
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [integrationCredentials, setIntegrationCredentials] = useState<Record<string, string>>({});
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testConnectionStatus, setTestConnectionStatus] = useState<"idle" | "success" | "error">("idle");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [integrationConfigTab, setIntegrationConfigTab] = useState<"api" | "numbers" | "category-mapping">("api");
  const [bitrixConnectionTested, setBitrixConnectionTested] = useState(false);
  const [salesforceConnectionTested, setSalesforceConnectionTested] = useState(false);
  const [salesforceSelectedProcesses, setSalesforceSelectedProcesses] = useState<string[]>([]);
  const [salesforceProcessValidationError, setSalesforceProcessValidationError] = useState<string>("");
  const [isMappingSectionExpanded, setIsMappingSectionExpanded] = useState(false);
  const [sampleJson, setSampleJson] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) setActiveTab(tab);

    const integrationId = params.get('integration');
    const category = params.get('category');
    const action = params.get('action');
    if (integrationId && action === 'connect') {
      const targetIntegration = integrations.find((i) => i.id === integrationId);
      if (targetIntegration) {
        if (category) setIntegrationTab(category as typeof integrationTab);
        handleConnectIntegration(targetIntegration);
      }
    }
  }, [integrations]);

  // Bitrix Category Mapping State
  interface CategoryMapping {
    id: string;
    categoryId: string;
    processes: string[];
  }
  interface WhatsappTemplate {
    id: string;
    label: string;
    identifier: string;
    variables: Array<{ slot: string; mappedField: string }>;
  }
  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsappTemplate[]>([]);
  const [whatsappTemplateValidationError, setWhatsappTemplateValidationError] = useState("");
  const [isAddingWaTemplate, setIsAddingWaTemplate] = useState(false);
  const [waTemplateForm, setWaTemplateForm] = useState({ label: "", identifier: "", varCount: "0" });
  const [waTemplateFormErrors, setWaTemplateFormErrors] = useState<Record<string, string>>({});

  const [categoryMappings, setCategoryMappings] = useState<CategoryMapping[]>([]);
  const [editingMapping, setEditingMapping] = useState<CategoryMapping | null>(null);
  const [isAddingMapping, setIsAddingMapping] = useState(false);
  const [mappingFormData, setMappingFormData] = useState({
    categoryId: "",
    processes: [] as string[],
  });
  const [showDeleteMappingModal, setShowDeleteMappingModal] = useState(false);
  const [mappingToDelete, setMappingToDelete] = useState<CategoryMapping | null>(null);
  const [mappingValidationErrors, setMappingValidationErrors] = useState<Record<string, string>>({});
  const [showProcessDropdown, setShowProcessDropdown] = useState(false);
  const [processSearchTerm, setProcessSearchTerm] = useState("");

  // Available processes for mapping
  const availableProcesses = [
    { id: "insurance-verification", label: "Insurance Verification" },
    { id: "appointment-scheduling", label: "Appointment Scheduling" },
    { id: "follow-up", label: "Follow-up" },
    { id: "payment-reminder", label: "Payment Reminder" },
  ];

  // Telephony Numbers State
  const [telephonyNumbers, setTelephonyNumbers] = useState<TelephonyNumber[]>([]);
  const [showAddNumberModal, setShowAddNumberModal] = useState(false);
  const [editingNumber, setEditingNumber] = useState<TelephonyNumber | null>(null);
  const [numberFormData, setNumberFormData] = useState({
    number: "",
    country: "",
    processes: [] as string[],
    callType: "both" as "inbound" | "outbound" | "both",
    isDefault: false,
    incomingCost: "",
    outgoingCost: "",
  });
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [defaultNumber, setDefaultNumber] = useState<string>("");
  const [fallbackNumber, setFallbackNumber] = useState<string>("");

  // How it works modal
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
  const [howItWorksTab, setHowItWorksTab] = useState<string>("");

  const getHowItWorksContent = (tabName: string) => {
    const content: { [key: string]: { title: string; description: string } } = {
      users: {
        title: "How Users works",
        description:
          "Add team members and control their access with granular permissions. Assign View or Write access for different sections like Dashboard, Clients, Calls, and more. Manage user status and permissions to ensure the right people have the right access to your system.",
      },
      "voice-config": {
        title: "How AI Voices / Models works",
        description:
          "Configure AI models and select the perfect voice for your automated calls. Choose from multiple AI providers (OpenAI, Gemini, Claude) and customize voice characteristics including gender, age group, and voice type. Preview voices before applying them to your call flows.",
      },
      numbers: {
        title: "How Numbers works",
        description:
          "Purchase phone numbers from different countries and configure routing for your processes. Assign numbers to specific workflows like Insurance Verification, Appointment Scheduling, or Follow-up. Track incoming and outgoing costs per number and manage country-level routing configurations.",
      },
      "custom-fields": {
        title: "How Custom Fields works",
        description:
          "Create and manage custom fields to capture the exact information you need from your clients. Define field labels, types (Text, Dropdown, Date, etc.), and mark fields as required. Custom fields help you tailor the system to your specific business needs and workflows.",
      },
      integrations: {
        title: "How Integrations works",
        description:
          "Connect your existing tools and systems to sync data automatically. Choose from EHR systems (MantraCare, Epic, Athena Health), CRM platforms (Bitrix 24, HubSpot, Salesforce), and telephony providers (Twilio, Zadarma). Set up API credentials to enable seamless data flow between systems.",
      },
    };

    return content[tabName] || { title: "How it works", description: "" };
  };

  const openHowItWorks = (tabName: string) => {
    setHowItWorksTab(tabName);
    setShowHowItWorksModal(true);
  };

  // AI Models State
  const [aiModels, setAIModels] = useState<AIModel[]>([
    { id: "1", provider: "OpenAI", modelName: "GPT-4", status: true },
    { id: "2", provider: "Gemini", modelName: "Gemini Pro", status: true },
    { id: "3", provider: "Claude", modelName: "Claude 3", status: false },
  ]);

  // Voice Library State
  const [showVoiceLibraryModal, setShowVoiceLibraryModal] = useState(false);
  const [voiceLibraryTab, setVoiceLibraryTab] = useState<"library" | "clone">("library");
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [selectedFeaturedVoice, setSelectedFeaturedVoice] = useState("dakota-flash-v2");
  const [cloneVoiceProvider, setCloneVoiceProvider] = useState<"elevenlabs" | "cartesia">("elevenlabs");
  const [cloneVoiceFormData, setCloneVoiceFormData] = useState({
    name: "",
    description: "",
  });

  // Voice Search & Filter State
  const [voiceSearchQuery, setVoiceSearchQuery] = useState("");
  const [voiceFilters, setVoiceFilters] = useState<VoiceFilters>({
    language: "All Languages",
    tone: "All Tones",
    gender: "All Genders",
    age: "All Ages",
    country: "All Countries",
  });
  const [selectedVoice, setSelectedVoice] = useState("Nova");

  // Current Voices Carousel State
  type CurrentVoiceObj = { id: string; name: string; gender: string; country: string; tags: string[]; tone: string; age: string; };
  const [currentVoices, setCurrentVoices] = useState<CurrentVoiceObj[]>([
    { id: "nova", name: "Nova", gender: "Female", country: "USA", tags: ["Young", "Professional"], tone: "Professional", age: "Young" },
  ]);
  const [hoveredCarouselVoice, setHoveredCarouselVoice] = useState<CurrentVoiceObj | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Voice Table State
  const [showVoiceColumnToggle, setShowVoiceColumnToggle] = useState(false);
  const [voiceVisibleColumns, setVoiceVisibleColumns] = useState({
    voiceName: true,
    gender: true,
    country: true,
    tone: true,
    age: true,
    process: true,
    preview: true,
    status: true,
  });
  const [voiceColumnOrder, setVoiceColumnOrder] = useState<string[]>([
    'voiceName',
    'gender',
    'country',
    'tone',
    'age',
    'process',
    'preview',
    'status',
  ]);
  const [showVoicePreviewModal, setShowVoicePreviewModal] = useState(false);
  const [selectedVoiceForPreview, setSelectedVoiceForPreview] = useState<{
    name: string;
    gender: string;
    country: string;
    tone: string;
    age: string;
    processes: string[];
    status: boolean;
  } | null>(null);

  // Voice Table Data - processes is an array to support multiple process assignments
  const [voiceTableData, setVoiceTableData] = useState([
    { id: 1, name: "Nova", gender: "Female", country: "USA", tone: "Professional", age: "Young", processes: ["Insurance Verification"], status: true },
    { id: 2, name: "Atlas", gender: "Male", country: "UK", tone: "Formal", age: "Adult", processes: ["Follow-up"], status: true },
    { id: 3, name: "Luna", gender: "Female", country: "Australia", tone: "Friendly", age: "Young", processes: ["Appointment Scheduling"], status: false },
  ]);

  const AVAILABLE_PROCESSES = ["Insurance Verification", "Appointment Scheduling", "Follow-up", "Payment Reminder"];

  // Featured Voices Data
  const featuredVoicesData = [
    { name: "Alloy", gender: "Male", country: "USA", tags: ["Mid", "Friendly"], tone: "Friendly", age: "Mid" },
    { name: "Echo", gender: "Male", country: "UK", tags: ["Mid", "Professional"], tone: "Professional", age: "Mid" },
    { name: "Shimmer", gender: "Female", country: "UK", tags: ["Young", "Friendly"], tone: "Friendly", age: "Young" },
    { name: "Onyx", gender: "Male", country: "USA", tags: ["Mature", "Formal"], tone: "Formal", age: "Mature" },
    { name: "Fable", gender: "Female", country: "Australia", tags: ["Young", "Casual"], tone: "Casual", age: "Young" },
    { name: "Dakota", gender: "Female", country: "USA", tags: ["Young", "Professional"], tone: "Professional", age: "Young" },
    { name: "Sage", gender: "Male", country: "Canada", tags: ["Mid", "Empathetic"], tone: "Empathetic", age: "Mid" },
    { name: "River", gender: "Female", country: "UK", tags: ["Young", "Energetic"], tone: "Energetic", age: "Young" },
  ];

  // Filter and search featured voices
  const filteredFeaturedVoices = featuredVoicesData.filter(voice => {
    // Search filter
    const matchesSearch = voice.name.toLowerCase().includes(voiceSearchQuery.toLowerCase()) ||
      voice.gender.toLowerCase().includes(voiceSearchQuery.toLowerCase()) ||
      voice.country.toLowerCase().includes(voiceSearchQuery.toLowerCase()) ||
      voice.tags.some(tag => tag.toLowerCase().includes(voiceSearchQuery.toLowerCase()));

    // Category filters
    const matchesGender = voiceFilters.gender === "All Genders" || voice.gender === voiceFilters.gender;
    const matchesCountry = voiceFilters.country === "All Countries" || voice.country === voiceFilters.country;
    const matchesTone = voiceFilters.tone === "All Tones" || voice.tone === voiceFilters.tone;
    const matchesAge = voiceFilters.age === "All Ages" || voice.age === voiceFilters.age;

    return matchesSearch && matchesGender && matchesCountry && matchesTone && matchesAge;
  });

  // Check if a voice is selected
  const isVoiceSelected = (voiceName: string) => {
    return currentVoices.some(v => v.name === voiceName);
  };

  // Handle selecting a voice
  const handleSelectVoice = (voice: typeof featuredVoicesData[0]) => {
    if (isVoiceSelected(voice.name)) {
      // Only remove if more than 1 voice remains
      if (currentVoices.length > 1) {
        setCurrentVoices(prev => prev.filter(v => v.name !== voice.name));
        setVoiceTableData(prev => prev.filter(v => v.name !== voice.name));
      }
    } else {
      const newVoiceObj: CurrentVoiceObj = {
        id: voice.name.toLowerCase(),
        name: voice.name,
        gender: voice.gender,
        country: voice.country,
        tags: voice.tags,
        tone: voice.tone,
        age: voice.age,
      };
      setCurrentVoices(prev => [...prev, newVoiceObj]);
      // Also add to voice table
      const newId = voiceTableData.length > 0 ? Math.max(...voiceTableData.map(v => v.id)) + 1 : 1;
      setVoiceTableData(prev => [...prev, {
        id: newId,
        name: voice.name,
        gender: voice.gender,
        country: voice.country,
        tone: voice.tone,
        age: voice.age,
        processes: [],
        status: false
      }]);
      // Auto-scroll carousel to end after state update
      setTimeout(() => {
        if (carouselRef.current) {
          carouselRef.current.scrollTo({ left: carouselRef.current.scrollWidth, behavior: "smooth" });
        }
      }, 50);
    }
  };

  const handleRemoveFromCarousel = (voiceName: string) => {
    if (currentVoices.length <= 1) return;
    setCurrentVoices(prev => prev.filter(v => v.name !== voiceName));
    setVoiceTableData(prev => prev.filter(v => v.name !== voiceName));
  };

  const scrollCarousel = (dir: "left" | "right") => {
    if (!carouselRef.current) return;
    const amount = 296; // card width + gap
    carouselRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  // Handle previewing a voice from the library
  const handlePreviewVoiceFromLibrary = (voice: typeof featuredVoicesData[0]) => {
    // Check if voice is in the table to get its processes and status
    const voiceInTable = voiceTableData.find(v => v.name === voice.name);

    setSelectedVoiceForPreview({
      name: voice.name,
      gender: voice.gender,
      country: voice.country,
      tone: voice.tone,
      age: voice.age,
      processes: voiceInTable?.processes || [],
      status: voiceInTable?.status || false
    });
    setShowVoicePreviewModal(true);
  };

  // Add Process State
  const [addProcessVoiceId, setAddProcessVoiceId] = useState<number | null>(null);

  // Column reorder handler for voice table
  const moveVoiceColumn = (dragIndex: number, hoverIndex: number) => {
    const newOrder = [...voiceColumnOrder];
    const [draggedColumn] = newOrder.splice(dragIndex, 1);
    newOrder.splice(hoverIndex, 0, draggedColumn);
    setVoiceColumnOrder(newOrder);
  };


  const tabs = [
    { id: "organization", label: "Organization", icon: Building2 },
    { id: "users", label: "Team", icon: Users },
    {
      id: "billing-parent",
      label: "Billing",
      icon: CreditCard,
      isParent: true,
      children: [
        { id: "plans", label: "Plans" },
        { id: "payments", label: "Payments" },
        { id: "credit-usage", label: "Credit Usage" },
      ],
    },
    { id: "voice-config", label: "AI Voices / Models", icon: Volume2 },
    { id: "numbers", label: "Numbers", icon: Phone },
    { id: "custom-fields", label: "Custom Fields", icon: ClipboardList },
    { id: "integrations", label: "Integrations", icon: LinkIcon },
    { id: "audit-logs", label: "Audit Logs", icon: FileText },
    { id: "security", label: "Security", icon: ShieldCheck },
  ];


  const handleSaveOrganization = () => {
    if (!editOrgData.name || !editOrgData.email) {
      toast.error("Please fill in all required fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editOrgData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    updateOrganization(activeOrganization.id, {
      name: editOrgData.name,
      industry: editOrgData.industry,
      email: editOrgData.email,
      phone: `${editOrgData.countryCode} ${editOrgData.phone}`,
    });

    setSelectedLanguage(editOrgData.language);
    setIsEditingOrganization(false);
    toast.success("Organization updated successfully");
  };

  const handleToggleUserStatus = (userId: number) => {
    setAllUsers(allUsers.map((u) => (u.id === userId ? { ...u, status: !u.status } : u)));
    const user = allUsers.find((u) => u.id === userId);
    toast.success(`User ${user?.status ? "deactivated" : "activated"} successfully`);
  };

  const handleEditUser = (user: User) => {
    setSelectedTeamMember(user);
    setIsTeamDrawerOpen(true);
    setIsEditingProfile(false);
    setManageTeamTab("calendar");
    setOpenOrgDropdownId(null);
  };

  const handleOpenTeamDrawer = (member: typeof teamMembers[0]) => {
    setSelectedTeamMember(member);
    setIsTeamDrawerOpen(true);
    setIsEditingProfile(false);
    setManageTeamTab("calendar");
    setOpenDropdownId(null);
  };

  const handleCloseTeamDrawer = () => {
    setIsTeamDrawerOpen(false);
    setSelectedTeamMember(null);
    setIsEditingProfile(false);
  };

  const handleDeleteTeamMember = (member: typeof teamMembers[0]) => {
    if (confirm(`Are you sure you want to delete ${member.name}?`)) {
      setTeamMembers(teamMembers.filter(m => m.id !== member.id));
      toast.success("Team member deleted successfully");
      setOpenDropdownId(null);
    }
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setShowDeleteUserModal(true);
    setOpenOrgDropdownId(null);
  };

  const confirmDeleteUser = () => {
    setAllUsers(allUsers.filter((u) => u.id !== selectedUser?.id));
    setShowDeleteUserModal(false);
    toast.success("User deleted successfully");
  };

  const handleSaveUser = () => {
    if (!userFormData.name || !userFormData.email) {
      toast.error("Please fill in all required fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userFormData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (showEditUserModal && selectedUser) {
      setAllUsers(
        allUsers.map((u) =>
          u.id === selectedUser.id
            ? {
              ...u,
              permissions: userFormData.permissions,
              calendarConnected,
              connectedCalendar,
              availability,
              daysOff,
            }
            : u
        )
      );
      toast.success("User settings updated successfully");
    } else {
      const newUser: User = {
        id: Math.max(...allUsers.map((u) => u.id)) + 1,
        name: userFormData.name,
        email: userFormData.email,
        status: true,
        organizationId: activeOrganization.id,
        role: userFormData.role,
        permissions: userFormData.permissions,
        calendarConnected,
        connectedCalendar,
        availability,
        daysOff,
      };
      setAllUsers([...allUsers, newUser]);
      toast.success("User added successfully");
    }

    setShowAddUserModal(false);
    setShowEditUserModal(false);
    setUserFormData({
      name: "",
      email: "",
      role: "Agent",
      permissions: createDefaultPermissions(),
    });

    // Reset calendar and availability state
    setCalendarConnected(false);
    setConnectedCalendar(null);
    setAvailability({
      monday: { enabled: true, start: "09:00", end: "17:00" },
      tuesday: { enabled: true, start: "09:00", end: "17:00" },
      wednesday: { enabled: true, start: "09:00", end: "17:00" },
      thursday: { enabled: true, start: "09:00", end: "17:00" },
      friday: { enabled: true, start: "09:00", end: "17:00" },
      saturday: { enabled: false, start: "09:00", end: "17:00" },
      sunday: { enabled: false, start: "09:00", end: "17:00" },
    });
    setDaysOff([]);
    setNewDayOff("");
  };

  // Helper to set read permission across all modules
  const setSectionPermission = (section: "core" | "operations" | "system", scope: ActionScope) => {
    // Legacy helper kept for compatibility
  };

  // Helper to get current section permission
  const getCurrentSectionPermission = (section: "core" | "operations" | "system"): ActionScope | "mixed" => {
    return "mixed";
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Settings"
          subtitle="Configure system integrations, billing plans, notification channels, and team preferences"
          badge={
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-[#1456f0] border border-blue-200/60">
              System Admin
            </span>
          }
        >
          <HowItWorksButton label="How it works" onClick={() => openHowItWorks(activeTab)} />
        </PageHeader>

        <div className="flex gap-6 items-start">
          {/* Left Navigation */}
          <div className="w-[230px] flex-shrink-0 bg-white/80 backdrop-blur-xl border border-white/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] rounded-[28px] p-3.5 space-y-1 self-start">
            {/* Header Label */}
            <div className="px-3.5 pt-1.5 pb-2 text-[10px] font-bold uppercase tracking-widest text-[#8e8e93] font-display">
              SETTINGS
            </div>

            <nav className="space-y-1">
              {tabs.map((tab: any) => {
                const isBillingChild = ["plans", "payments", "credit-usage"].includes(activeTab);
                const isBillingActive = tab.id === "billing-parent" && isBillingChild;
                const isActive = activeTab === tab.id || isBillingActive;
                const Icon = tab.icon;

                return (
                  <div key={tab.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (tab.isParent) {
                          setBillingExpanded(!billingExpanded);
                          if (!billingExpanded) {
                            setActiveTab("plans");
                          }
                        } else {
                          setActiveTab(tab.id);
                        }
                      }}
                      className={`relative w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer ${
                        isActive && !tab.isParent
                          ? "text-white shadow-sm"
                          : isActive && tab.isParent
                          ? "text-[#181e25] bg-slate-100/70"
                          : "text-[#45515e] hover:text-[#222222] hover:bg-slate-100/60"
                      }`}
                    >
                      {isActive && !tab.isParent && (
                        <motion.div
                          layoutId="settingsTabActivePill"
                          className="absolute inset-0 bg-gradient-to-r from-[#181e25] to-[#2c3e50] rounded-full -z-10 shadow-sm"
                          transition={{ type: "spring", stiffness: 450, damping: 35 }}
                        />
                      )}

                      <div className="flex items-center gap-3 min-w-0">
                        {Icon && (
                          <Icon
                            className={`w-4 h-4 flex-shrink-0 transition-colors ${
                              isActive && !tab.isParent ? "text-white" : "text-slate-500"
                            }`}
                          />
                        )}
                        <span className="truncate">{tab.label}</span>
                      </div>

                      {tab.isParent && (
                        <span className="text-slate-400">
                          {billingExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </span>
                      )}
                    </button>

                    {tab.isParent && billingExpanded && tab.children && (
                      <div className="ml-7 my-1 pl-2 border-l border-slate-200/60 space-y-1">
                        {tab.children.map((child: any) => {
                          const isChildActive = activeTab === child.id;
                          return (
                            <button
                              key={child.id}
                              type="button"
                              onClick={() => setActiveTab(child.id)}
                              className={`w-full text-left px-3 py-1.5 rounded-full text-xs transition-colors cursor-pointer flex items-center justify-between ${
                                isChildActive
                                  ? "text-[#1456f0] bg-blue-50/80 font-bold"
                                  : "text-[#64748b] hover:text-[#222222] hover:bg-slate-100/50 font-medium"
                              }`}
                            >
                              <span>{child.label}</span>
                              {isChildActive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#1456f0]" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0 bg-white/80 backdrop-blur-xl rounded-[28px] border border-white/80 shadow-2xs p-6 lg:p-8" style={{ overflowX: "hidden" }}>
            {/* Organization Tab */}
            {activeTab === "organization" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold" style={TEXT_STYLES.heading}>Organization</h2>
                    <p className="text-sm mt-1" style={TEXT_STYLES.subtext}>View organization details and settings</p>
                  </div>
                  {isEditingOrganization ? (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => {
                        setIsEditingOrganization(false);
                        setEditOrgData({
                          name: activeOrganization.name,
                          industry: activeOrganization.industry || "Healthcare",
                          email: activeOrganization.email,
                          phone: activeOrganization.phone || "",
                          countryCode: "+1",
                          countryFlag: "🇺🇸",
                          countryName: "United States",
                          website: "https://example.com",
                          preferredCallingTime: "14:00",
                          timezone: "UTC-08:00 (Pacific Time)",
                          defaultCallingCountry: "United States",
                          address: "123 Healthcare Ave, Suite 100, San Francisco, CA 94102",
                          billingContactName: "John Smith",
                          billingContactEmail: "billing@healthcare.com",
                          language: selectedLanguage,
                        });
                      }}>
                        Cancel
                      </Button>
                      <Button variant="primary" onClick={handleSaveOrganization}>
                        Save Changes
                      </Button>
                    </div>
                  ) : (
                    <Button variant="primary" onClick={() => {
                      setEditOrgData({ ...editOrgData, language: selectedLanguage });
                      setIsEditingOrganization(true);
                    }}>
                      <Edit className="w-4 h-4" />
                      Edit
                    </Button>
                  )}
                </div>

                {/* Basic Info */}
                <div className="bg-white/90 rounded-[20px] p-6 border border-slate-200/70 shadow-2xs space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-wider pb-3 border-b border-slate-100 font-display text-slate-500">BASIC INFO</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium flex items-center gap-1" style={TEXT_STYLES.subtext}>
                        Organization Name
                        {isEditingOrganization && <Edit className="w-3 h-3 text-blue-600" />}
                      </label>
                      {isEditingOrganization ? (
                        <Input
                          value={editOrgData.name}
                          onChange={(e) => setEditOrgData({ ...editOrgData, name: e.target.value })}
                          className="mt-1"
                        />
                      ) : (
                        <p className="mt-1 text-foreground">{activeOrganization.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium flex items-center gap-1" style={TEXT_STYLES.subtext}>
                        Industry
                        {isEditingOrganization && <Edit className="w-3 h-3 text-blue-600" />}
                      </label>
                      {isEditingOrganization ? (
                        <select
                          value={editOrgData.industry}
                          onChange={(e) => setEditOrgData({ ...editOrgData, industry: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="Healthcare">Healthcare</option>
                          <option value="Technology">Technology</option>
                          <option value="Finance">Finance</option>
                          <option value="Education">Education</option>
                          <option value="Retail">Retail</option>
                          <option value="Other">Other</option>
                        </select>
                      ) : (
                        <p className="mt-1 text-foreground">{activeOrganization.industry || "Healthcare"}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="bg-white/90 rounded-[20px] p-6 border border-slate-200/70 shadow-2xs space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-wider pb-3 border-b border-slate-100 font-display text-slate-500">CONTACT INFO</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium flex items-center gap-1" style={TEXT_STYLES.subtext}>
                        Email
                        {isEditingOrganization && <Edit className="w-3 h-3 text-blue-600" />}
                      </label>
                      {isEditingOrganization ? (
                        <Input
                          type="email"
                          value={editOrgData.email}
                          onChange={(e) => setEditOrgData({ ...editOrgData, email: e.target.value })}
                          className="mt-1"
                        />
                      ) : (
                        <p className="mt-1 text-foreground">{activeOrganization.email}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium flex items-center gap-1" style={TEXT_STYLES.subtext}>
                        Phone
                        {isEditingOrganization && <Edit className="w-3 h-3 text-blue-600" />}
                      </label>
                      {isEditingOrganization ? (
                        <Input
                          type="tel"
                          value={editOrgData.phone}
                          onChange={(e) => setEditOrgData({ ...editOrgData, phone: e.target.value })}
                          className="mt-1"
                        />
                      ) : (
                        <p className="mt-1 text-foreground">{activeOrganization.phone || "+1 (555) 123-4567"}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium flex items-center gap-1" style={TEXT_STYLES.subtext}>
                        Website
                        {isEditingOrganization && <Edit className="w-3 h-3 text-blue-600" />}
                      </label>
                      {isEditingOrganization ? (
                        <Input
                          type="url"
                          value={editOrgData.website}
                          onChange={(e) => setEditOrgData({ ...editOrgData, website: e.target.value })}
                          className="mt-1"
                        />
                      ) : (
                        <p className="mt-1 text-foreground">https://example.com</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Call Preferences */}
                <div className="bg-white/90 rounded-[20px] p-6 border border-slate-200/70 shadow-2xs space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-wider pb-3 border-b border-slate-100 font-display text-slate-500">
                    CALL PREFERENCES
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium flex items-center gap-1" style={TEXT_STYLES.subtext}>
                        Preferred Calling Time
                        {isEditingOrganization && <Edit className="w-3 h-3 text-blue-600" />}
                      </label>
                      {isEditingOrganization ? (
                        <Input
                          type="time"
                          value={editOrgData.preferredCallingTime}
                          onChange={(e) => setEditOrgData({ ...editOrgData, preferredCallingTime: e.target.value })}
                          className="mt-1"
                        />
                      ) : (
                        <p className="mt-1 text-foreground">2:00 PM</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium flex items-center gap-1" style={TEXT_STYLES.subtext}>
                        Timezone
                        {isEditingOrganization && <Edit className="w-3 h-3 text-blue-600" />}
                      </label>
                      {isEditingOrganization ? (
                        <Input
                          value={editOrgData.timezone}
                          onChange={(e) => setEditOrgData({ ...editOrgData, timezone: e.target.value })}
                          className="mt-1"
                        />
                      ) : (
                        <p className="mt-1 text-foreground">UTC-08:00 (Pacific Time)</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium flex items-center gap-1" style={TEXT_STYLES.subtext}>
                        Default Calling Country
                        {isEditingOrganization && <Edit className="w-3 h-3 text-blue-600" />}
                      </label>
                      {isEditingOrganization ? (
                        <Input
                          value={editOrgData.defaultCallingCountry}
                          onChange={(e) => setEditOrgData({ ...editOrgData, defaultCallingCountry: e.target.value })}
                          className="mt-1"
                        />
                      ) : (
                        <p className="mt-1 text-foreground">United States</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Billing Info */}
                <div className="bg-white/90 rounded-[20px] p-6 border border-slate-200/70 shadow-2xs space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-wider pb-3 border-b border-slate-100 font-display text-slate-500">BILLING INFO</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium flex items-center gap-1" style={TEXT_STYLES.subtext}>
                        Address
                        {isEditingOrganization && <Edit className="w-3 h-3 text-blue-600" />}
                      </label>
                      {isEditingOrganization ? (
                        <Input
                          value={editOrgData.address}
                          onChange={(e) => setEditOrgData({ ...editOrgData, address: e.target.value })}
                          className="mt-1"
                        />
                      ) : (
                        <p className="mt-1 text-foreground">123 Healthcare Ave, Suite 100, San Francisco, CA 94102</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium flex items-center gap-1" style={TEXT_STYLES.subtext}>
                        Billing Contact Name
                        {isEditingOrganization && <Edit className="w-3 h-3 text-blue-600" />}
                      </label>
                      {isEditingOrganization ? (
                        <Input
                          value={editOrgData.billingContactName}
                          onChange={(e) => setEditOrgData({ ...editOrgData, billingContactName: e.target.value })}
                          className="mt-1"
                        />
                      ) : (
                        <p className="mt-1 text-foreground">John Smith</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium flex items-center gap-1" style={TEXT_STYLES.subtext}>
                        Billing Contact Email
                        {isEditingOrganization && <Edit className="w-3 h-3 text-blue-600" />}
                      </label>
                      {isEditingOrganization ? (
                        <Input
                          type="email"
                          value={editOrgData.billingContactEmail}
                          onChange={(e) => setEditOrgData({ ...editOrgData, billingContactEmail: e.target.value })}
                          className="mt-1"
                        />
                      ) : (
                        <p className="mt-1 text-foreground">billing@healthcare.com</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dashboard Translation */}
                <div className="bg-muted/30 rounded-xl p-6 border border-border space-y-4">
                  <h3 className="font-semibold text-sm pb-3 border-b border-border" style={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>DASHBOARD TRANSLATION</h3>
                  <div>
                    <label className="text-sm font-medium flex items-center gap-1" style={TEXT_STYLES.subtext}>
                      Language
                      {isEditingOrganization && <Edit className="w-3 h-3 text-blue-600" />}
                    </label>
                    {isEditingOrganization ? (
                      <select
                        value={editOrgData.language}
                        onChange={(e) => setEditOrgData({ ...editOrgData, language: e.target.value })}
                        className="mt-1 w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="English">English</option>
                        <option value="Spanish">Spanish</option>
                        <option value="French">French</option>
                        <option value="German">German</option>
                      </select>
                    ) : (
                      <p className="mt-1 text-foreground">{selectedLanguage}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === "users" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold" style={TEXT_STYLES.heading}>Team</h2>
                    <p className="text-sm mt-1" style={TEXT_STYLES.subtext}>Manage team members for {activeOrganization.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => setShowRolesDrawer(true)} className="flex items-center gap-1.5 font-semibold">
                      <Shield className="w-4 h-4 text-blue-600" />
                      Roles & Permissions
                    </Button>
                    <Button variant="primary" onClick={() => setShowAddUserModal(true)}>
                      <Plus className="w-4 h-4" />
                      Add User
                    </Button>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
                  <table className="w-full">
                    <thead style={{ backgroundColor: '#1F2937' }} className="border-b border-border">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#FFFFFF', width: '40px' }}></th>
                        <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#FFFFFF', fontFamily: 'Outfit, sans-serif' }}>Name</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#FFFFFF', fontFamily: 'Outfit, sans-serif' }}>Email</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#FFFFFF', fontFamily: 'Outfit, sans-serif' }}>Role</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#FFFFFF', fontFamily: 'Outfit, sans-serif' }}>Department</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#FFFFFF', fontFamily: 'Outfit, sans-serif' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-border hover:bg-[#F1F5F9] transition-colors group">
                          <td className="px-4 py-4">
                            <div className="relative org-dropdown-menu-container">
                              <button
                                onClick={() => setOpenOrgDropdownId(openOrgDropdownId === user.id ? null : user.id)}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                                style={{ color: "#6B7280" }}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {/* Dropdown Menu */}
                              {openOrgDropdownId === user.id && (
                                <div
                                  className="absolute left-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[140px]"
                                  style={{ marginTop: "4px" }}
                                >
                                  <button
                                    onClick={() => handleEditUser(user)}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors rounded-t-lg"
                                    style={{ color: "#111827" }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(user)}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors rounded-b-lg"
                                    style={{ color: "#EF4444" }}
                                  >
                                    Delete User
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleEditUser(user)}
                              className="text-sm font-semibold text-[#2563EB] hover:underline cursor-pointer bg-transparent border-none p-0"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            >
                              {user.name}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-[#6B7280]" style={{ fontFamily: 'Outfit, sans-serif' }}>{user.email}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${user.role === "Admin"
                              ? "bg-[#EFF6FF] text-[#2563EB]"
                              : user.role === "Manager"
                                ? "bg-[#F0FDF4] text-[#10B981]"
                                : user.role === "Supervisor"
                                  ? "bg-[#FEF3C7] text-[#F59E0B]"
                                  : "bg-[#F3F4F6] text-[#6B7280]"
                              }`}>
                              {user.role || "Agent"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {(() => {
                              const dept = roles.find(r => r.name === user.role)?.department;
                              return dept ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
                                  {dept}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 italic" style={{ fontFamily: 'Outfit, sans-serif' }}>—</span>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={user.status}
                                onChange={() => handleToggleUserStatus(user.id)}
                              />
                              <div className="w-11 h-6 bg-switch-background peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-switch-background after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Billing Plans */}
            {activeTab === "plans" && (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-[22px] font-bold text-[#111827]" style={{ fontFamily: 'DM Sans, sans-serif' }}>Plans</h2>
                    <p className="text-sm mt-1 text-[#6B7280]" style={{ fontFamily: 'Outfit, sans-serif' }}>Manage plans, subscriptions, and payments</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Section A - Current Subscription */}
                  <div className="space-y-3">
                    <h3 className="text-base font-bold">Current Subscription</h3>
                    <div className="border border-[#E5E7EB] rounded-xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-semibold">Professional</h4>
                          <span className="px-2.5 py-0.5 bg-[#10B981] text-white text-xs rounded-full">Active</span>
                        </div>
                        <button
                          onClick={() => setAvailablePlansExpanded(!availablePlansExpanded)}
                          className="px-4 py-2 bg-[#2563EB] text-white rounded-lg text-sm hover:bg-blue-700"
                        >
                          Manage Plan
                        </button>
                      </div>
                      <p className="text-sm text-[#6B7280] mb-1">Annual · $1,896/yr</p>
                      <p className="text-sm text-[#6B7280]">Renews on June 1, 2026</p>
                    </div>
                  </div>

                  {/* Section B - Usage Alerts (Collapsible) */}
                  <div className="border border-[#E5E7EB] rounded-[10px] bg-white overflow-hidden">
                    {/* Collapsible Header */}
                    <button
                      onClick={() => setUsageAlertsExpanded(!usageAlertsExpanded)}
                      className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <Bell className="w-5 h-5 text-[#F97316] flex-shrink-0 mt-0.5" />
                        <div className="text-left">
                          <h3 className="text-base font-bold text-[#111827]">Usage Alerts</h3>
                          <p className="text-[13px] text-[#6B7280] mt-0.5">Get notified when your credit usage reaches certain thresholds</p>
                        </div>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-[#6B7280] transition-transform ${usageAlertsExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Collapsible Content */}
                    {usageAlertsExpanded && (
                      <div className="px-5 pb-5">
                        {/* Separator */}
                        <div className="border-t border-[#F3F4F6] mb-3"></div>

                        {/* Toggle Rows */}
                        <div className="space-y-0">
                          {/* Row 1 - 70% Usage Alert */}
                          <div className="flex items-center justify-between h-12 border-b border-dashed border-[#F3F4F6]">
                            <span className="text-sm font-medium text-[#374151]">70% Usage Alert</span>
                            <button
                              onClick={() => setUsageAlert70(!usageAlert70)}
                              className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors ${usageAlert70 ? "bg-[#111827]" : "bg-[#D1D5DB]"
                                }`}
                            >
                              <span
                                className={`inline-block w-[18px] h-[18px] bg-white rounded-full transition-transform ${usageAlert70 ? "translate-x-6" : "translate-x-1"
                                  }`}
                              />
                            </button>
                          </div>

                          {/* Row 2 - 90% Usage Alert */}
                          <div className="flex items-center justify-between h-12 border-b border-dashed border-[#F3F4F6]">
                            <span className="text-sm font-medium text-[#374151]">90% Usage Alert</span>
                            <button
                              onClick={() => setUsageAlert90(!usageAlert90)}
                              className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors ${usageAlert90 ? "bg-[#111827]" : "bg-[#D1D5DB]"
                                }`}
                            >
                              <span
                                className={`inline-block w-[18px] h-[18px] bg-white rounded-full transition-transform ${usageAlert90 ? "translate-x-6" : "translate-x-1"
                                  }`}
                              />
                            </button>
                          </div>

                          {/* Row 3 - Balance Exhausted Alert */}
                          <div className="flex items-center justify-between h-12">
                            <span className="text-sm font-medium text-[#374151]">Balance Exhausted Alert</span>
                            <button
                              onClick={() => setBalanceExhaustedAlert(!balanceExhaustedAlert)}
                              className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors ${balanceExhaustedAlert ? "bg-[#111827]" : "bg-[#D1D5DB]"
                                }`}
                            >
                              <span
                                className={`inline-block w-[18px] h-[18px] bg-white rounded-full transition-transform ${balanceExhaustedAlert ? "translate-x-6" : "translate-x-1"
                                  }`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section C - Available Plans (Collapsible) */}
                  <div className="border border-[#E5E7EB] rounded-[10px] bg-white overflow-hidden">
                    {/* Collapsible Header */}
                    <button
                      onClick={() => setAvailablePlansExpanded(!availablePlansExpanded)}
                      className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-left">
                        <h3 className="text-base font-bold text-[#111827]">Available Plans</h3>
                        <p className="text-[13px] text-[#6B7280] mt-0.5">Choose a plan that fits your needs</p>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-[#6B7280] transition-transform ${availablePlansExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Collapsible Content */}
                    {availablePlansExpanded && (
                      <div className="p-5 border-t border-[#E5E7EB] space-y-6">
                        {/* User Count Card */}
                        <div className="border border-[#E5E7EB] rounded-xl p-5 flex items-center justify-between">
                          <div>
                            <h3 className="text-[15px] font-semibold text-[#111827]">How many users do you have?</h3>
                            <p className="text-[13px] text-[#6B7280] mt-1">Adjust your team size to see updated pricing</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button className="w-8 h-8 border border-[#E5E7EB] rounded-md flex items-center justify-center hover:bg-gray-50">
                              <span className="text-lg">−</span>
                            </button>
                            <div className="text-center">
                              <p className="text-lg font-bold text-[#111827]">2</p>
                              <p className="text-xs text-gray-500">users</p>
                            </div>
                            <button className="w-8 h-8 border border-[#E5E7EB] rounded-md flex items-center justify-center hover:bg-gray-50">
                              <span className="text-lg">+</span>
                            </button>
                          </div>
                        </div>

                        {/* Billing Toggle */}
                        <div className="flex justify-end">
                          <div className="relative">
                            <span className="absolute -top-6 right-0 px-2.5 py-0.5 bg-[#2563EB] text-white text-[11px] font-medium rounded-full">
                              Most Popular
                            </span>
                            <div className="flex border border-[#E5E7EB] rounded-lg overflow-hidden">
                              <button className="px-3.5 py-1.5 text-[13px] text-[#374151] bg-white border-r border-[#E5E7EB]">
                                Monthly
                              </button>
                              <button className="px-3.5 py-1.5 text-[13px] bg-[#111827] text-white flex items-center gap-1.5">
                                Annual
                                <span className="text-[11px] text-[#10B981]">Save 20%</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Plan Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Starter Plan */}
                          <div className="border border-[#E5E7EB] rounded-xl p-5 bg-white">
                            <h3 className="text-base font-bold mb-1">Starter</h3>
                            <p className="text-xs text-[#6B7280] mb-4">For small teams getting started</p>
                            <div className="mb-2">
                              <span className="text-[32px] font-extrabold">$20</span>
                              <span className="text-sm text-[#6B7280]">/mo</span>
                            </div>
                            <p className="text-xs text-[#9CA3AF] mb-1">$10/user/mo × 2 users</p>
                            <p className="text-[11px] text-[#9CA3AF] mb-4">Billed annually: $240/yr</p>
                            <button className="w-full py-2 border border-[#D1D5DB] bg-white text-[#374151] rounded-lg text-sm hover:bg-gray-50">
                              Choose Starter
                            </button>
                          </div>

                          {/* Basic Plan */}
                          <div className="border border-[#E5E7EB] rounded-xl p-5 bg-white">
                            <h3 className="text-base font-bold mb-1">Basic</h3>
                            <p className="text-xs text-[#6B7280] mb-4">For growing teams with regular usage</p>
                            <div className="mb-2">
                              <span className="text-[32px] font-extrabold">$98</span>
                              <span className="text-sm text-[#6B7280]">/mo</span>
                            </div>
                            <p className="text-xs text-[#9CA3AF] mb-1">$49/user/mo × 2 users</p>
                            <p className="text-[11px] text-[#9CA3AF] mb-4">Billed annually: $1,176/yr</p>
                            <button className="w-full py-2 border border-[#D1D5DB] bg-white text-[#374151] rounded-lg text-sm hover:bg-gray-50">
                              Choose Basic
                            </button>
                          </div>

                          {/* Professional Plan (Current) */}
                          <div className="border-2 border-[#2563EB] rounded-xl p-5 bg-white shadow-[0px_4px_16px_rgba(37,99,235,0.12)] relative">
                            <span className="absolute top-3 left-3 px-2.5 py-0.5 bg-[#EFF6FF] text-[#2563EB] text-[11px] font-medium rounded-full">
                              Current Plan
                            </span>
                            <h3 className="text-base font-bold mb-1 mt-6">Professional</h3>
                            <p className="text-xs text-[#6B7280] mb-4">For teams scaling their operations</p>
                            <div className="mb-2">
                              <span className="text-[32px] font-extrabold">$158</span>
                              <span className="text-sm text-[#6B7280]">/mo</span>
                            </div>
                            <p className="text-xs text-[#9CA3AF] mb-1">$79/user/mo × 2 users</p>
                            <p className="text-[11px] text-[#9CA3AF] mb-4">Billed annually: $1,896/yr</p>
                            <button className="w-full py-2 bg-[#2563EB] text-white rounded-lg text-sm opacity-80 cursor-not-allowed">
                              Current Plan
                            </button>
                          </div>

                          {/* Enterprise Plan */}
                          <div className="border border-[#E5E7EB] rounded-xl p-5 bg-white">
                            <h3 className="text-base font-bold mb-1">Enterprise</h3>
                            <p className="text-xs text-[#6B7280] mb-4">For large organizations with custom needs</p>
                            <div className="mb-2">
                              <span className="text-[22px] font-bold text-[#2563EB]">Custom pricing</span>
                            </div>
                            <p className="text-[13px] text-[#6B7280] mb-12">Contact sales for a quote</p>
                            <button className="w-full py-2 bg-[#111827] text-white rounded-lg text-sm hover:bg-gray-800">
                              Contact Sales
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Manage Plan Drawer */}
            <Drawer
              isOpen={isManagePlanDrawerOpen}
              onClose={() => setIsManagePlanDrawerOpen(false)}
              title="Available Plans"
              zIndex={99999}
            >
              <div className="space-y-6">
                {/* User Count Card */}
                <div className="border border-[#E5E7EB] rounded-xl p-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-[15px] font-semibold text-[#111827]">How many users do you have?</h3>
                    <p className="text-[13px] text-[#6B7280] mt-1">Adjust your team size to see updated pricing</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="w-8 h-8 border border-[#E5E7EB] rounded-md flex items-center justify-center hover:bg-gray-50">
                      <span className="text-lg">−</span>
                    </button>
                    <div className="text-center">
                      <p className="text-lg font-bold text-[#111827]">2</p>
                      <p className="text-xs text-gray-500">users</p>
                    </div>
                    <button className="w-8 h-8 border border-[#E5E7EB] rounded-md flex items-center justify-center hover:bg-gray-50">
                      <span className="text-lg">+</span>
                    </button>
                  </div>
                </div>

                {/* Billing Toggle */}
                <div className="flex justify-end">
                  <div className="relative">
                    <span className="absolute -top-6 right-0 px-2.5 py-0.5 bg-[#2563EB] text-white text-[11px] font-medium rounded-full">
                      Most Popular
                    </span>
                    <div className="flex border border-[#E5E7EB] rounded-lg overflow-hidden">
                      <button className="px-3.5 py-1.5 text-[13px] text-[#374151] bg-white border-r border-[#E5E7EB]">
                        Monthly
                      </button>
                      <button className="px-3.5 py-1.5 text-[13px] bg-[#111827] text-white flex items-center gap-1.5">
                        Annual
                        <span className="text-[11px] text-[#10B981]">Save 20%</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Plan Cards Grid - stacked vertically in drawer */}
                <div className="space-y-4">
                  {/* Starter Plan */}
                  <div className="border border-[#E5E7EB] rounded-xl p-5 bg-white">
                    <h3 className="text-base font-bold mb-1">Starter</h3>
                    <p className="text-xs text-[#6B7280] mb-4">For small teams getting started</p>
                    <div className="mb-2">
                      <span className="text-[32px] font-extrabold">$20</span>
                      <span className="text-sm text-[#6B7280]">/mo</span>
                    </div>
                    <p className="text-xs text-[#9CA3AF] mb-1">$10/user/mo × 2 users</p>
                    <p className="text-[11px] text-[#9CA3AF] mb-4">Billed annually: $240/yr</p>
                    <button className="w-full py-2 border border-[#D1D5DB] bg-white text-[#374151] rounded-lg text-sm hover:bg-gray-50">
                      Choose Starter
                    </button>
                  </div>

                  {/* Basic Plan */}
                  <div className="border border-[#E5E7EB] rounded-xl p-5 bg-white">
                    <h3 className="text-base font-bold mb-1">Basic</h3>
                    <p className="text-xs text-[#6B7280] mb-4">For growing teams with regular usage</p>
                    <div className="mb-2">
                      <span className="text-[32px] font-extrabold">$98</span>
                      <span className="text-sm text-[#6B7280]">/mo</span>
                    </div>
                    <p className="text-xs text-[#9CA3AF] mb-1">$49/user/mo × 2 users</p>
                    <p className="text-[11px] text-[#9CA3AF] mb-4">Billed annually: $1,176/yr</p>
                    <button className="w-full py-2 border border-[#D1D5DB] bg-white text-[#374151] rounded-lg text-sm hover:bg-gray-50">
                      Choose Basic
                    </button>
                  </div>

                  {/* Professional Plan (Current) */}
                  <div className="border-2 border-[#2563EB] rounded-xl p-5 bg-white shadow-[0px_4px_16px_rgba(37,99,235,0.12)] relative">
                    <span className="absolute top-3 left-3 px-2.5 py-0.5 bg-[#EFF6FF] text-[#2563EB] text-[11px] font-medium rounded-full">
                      Current Plan
                    </span>
                    <h3 className="text-base font-bold mb-1 mt-6">Professional</h3>
                    <p className="text-xs text-[#6B7280] mb-4">For teams scaling their operations</p>
                    <div className="mb-2">
                      <span className="text-[32px] font-extrabold">$158</span>
                      <span className="text-sm text-[#6B7280]">/mo</span>
                    </div>
                    <p className="text-xs text-[#9CA3AF] mb-1">$79/user/mo × 2 users</p>
                    <p className="text-[11px] text-[#9CA3AF] mb-4">Billed annually: $1,896/yr</p>
                    <button className="w-full py-2 bg-[#2563EB] text-white rounded-lg text-sm opacity-80 cursor-not-allowed">
                      Current Plan
                    </button>
                  </div>

                  {/* Enterprise Plan */}
                  <div className="border border-[#E5E7EB] rounded-xl p-5 bg-white">
                    <h3 className="text-base font-bold mb-1">Enterprise</h3>
                    <p className="text-xs text-[#6B7280] mb-4">For large organizations with custom needs</p>
                    <div className="mb-2">
                      <span className="text-[22px] font-bold text-[#2563EB]">Custom pricing</span>
                    </div>
                    <p className="text-[13px] text-[#6B7280] mb-12">Contact sales for a quote</p>
                    <button className="w-full py-2 bg-[#111827] text-white rounded-lg text-sm hover:bg-gray-800">
                      Contact Sales
                    </button>
                  </div>
                </div>
              </div>
            </Drawer>

            {/* Billing Payments */}
            {activeTab === "payments" && (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-[22px] font-bold text-[#111827]" style={{ fontFamily: 'DM Sans, sans-serif' }}>Payments</h2>
                    <p className="text-sm mt-1 text-[#6B7280]" style={{ fontFamily: 'Outfit, sans-serif' }}>Manage plans, subscriptions, and payments</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-6">
                    {/* Payment Methods Header with Button */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold">Payment Methods</h3>
                      <button
                        onClick={() => setShowAddPaymentModal(true)}
                        className="px-4 py-2 border border-[#2563EB] text-[#2563EB] rounded-lg text-sm hover:bg-blue-50"
                      >
                        + Add Payment Method
                      </button>
                    </div>

                    <div className="border border-[#E5E7EB] rounded-xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-8 bg-[#1A1F71] rounded flex items-center justify-center text-white text-xs font-bold">
                            VISA
                          </div>
                          <div>
                            <p className="text-sm font-medium">Visa ending in 4567</p>
                            <p className="text-xs text-[#6B7280]">Expires 12/27</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 bg-[#EFF6FF] text-[#2563EB] text-xs rounded-full">Default</span>
                      </div>
                    </div>

                    {/* Billing Address Section with Edit */}
                    <div className="flex items-center justify-between mt-8">
                      <h3 className="text-base font-bold">Billing Address</h3>
                      {!isEditingBillingAddress && (
                        <button
                          onClick={() => {
                            setEditBillingAddress(billingAddress);
                            setIsEditingBillingAddress(true);
                          }}
                          className="px-3 py-1.5 border border-[#E5E7EB] text-[#374151] rounded-lg text-sm hover:bg-gray-50"
                        >
                          Edit
                        </button>
                      )}
                      {isEditingBillingAddress && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setBillingAddress(editBillingAddress);
                              setIsEditingBillingAddress(false);
                              toast.success("Billing address updated successfully");
                            }}
                            className="px-3 py-1.5 bg-[#2563EB] text-white rounded-lg text-sm hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditBillingAddress(billingAddress);
                              setIsEditingBillingAddress(false);
                            }}
                            className="px-3 py-1.5 border border-[#E5E7EB] text-[#374151] rounded-lg text-sm hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="border border-[#E5E7EB] rounded-xl p-5">
                      {!isEditingBillingAddress ? (
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-medium text-[#6B7280] mb-1">Street Address</p>
                            <p className="text-sm text-foreground">{billingAddress.street}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-[#6B7280] mb-1">City</p>
                            <p className="text-sm text-foreground">{billingAddress.city}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-[#6B7280] mb-1">State / Province</p>
                            <p className="text-sm text-foreground">{billingAddress.state}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-[#6B7280] mb-1">Postal Code</p>
                            <p className="text-sm text-foreground">{billingAddress.postalCode}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-[#6B7280] mb-1">Country</p>
                            <p className="text-sm text-foreground">{billingAddress.country}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-[#6B7280] mb-1">Street Address</label>
                            <Input
                              value={editBillingAddress.street}
                              onChange={(e) => setEditBillingAddress({ ...editBillingAddress, street: e.target.value })}
                              placeholder="123 Healthcare Ave, Suite 100"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[#6B7280] mb-1">City</label>
                            <Input
                              value={editBillingAddress.city}
                              onChange={(e) => setEditBillingAddress({ ...editBillingAddress, city: e.target.value })}
                              placeholder="San Francisco"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[#6B7280] mb-1">State / Province</label>
                            <Input
                              value={editBillingAddress.state}
                              onChange={(e) => setEditBillingAddress({ ...editBillingAddress, state: e.target.value })}
                              placeholder="CA"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[#6B7280] mb-1">Postal Code</label>
                            <Input
                              value={editBillingAddress.postalCode}
                              onChange={(e) => setEditBillingAddress({ ...editBillingAddress, postalCode: e.target.value })}
                              placeholder="94102"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[#6B7280] mb-1">Country</label>
                            <Select value={editBillingAddress.country} onValueChange={(value) => setEditBillingAddress({ ...editBillingAddress, country: value })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {COUNTRIES.map((country) => (
                                  <SelectItem key={country} value={country}>
                                    {country}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Transaction History */}
                    <h3 className="text-base font-bold mt-8">Transaction History</h3>
                    <div className="bg-white rounded-xl border border-border overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted/30 border-b border-border">
                          <tr>
                            <th className="text-left px-6 py-3 text-sm font-medium text-[#64748B]">Date</th>
                            <th className="text-left px-6 py-3 text-sm font-medium text-[#64748B]">Description</th>
                            <th className="text-left px-6 py-3 text-sm font-medium text-[#64748B]">Amount</th>
                            <th className="text-left px-6 py-3 text-sm font-medium text-[#64748B]">Status</th>
                            <th className="text-right px-6 py-3 text-sm font-medium text-[#64748B]">Invoice</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-border">
                            <td className="px-6 py-4 text-sm">May 1, 2026</td>
                            <td className="px-6 py-4 text-sm">Professional Plan (Annual)</td>
                            <td className="px-6 py-4 text-sm font-medium">$1,896</td>
                            <td className="px-6 py-4">
                              <span className="flex items-center gap-1 text-sm text-green-600">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Paid
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button className="text-[13px] text-[#2563EB] underline hover:text-blue-700">Download</button>
                            </td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="px-6 py-4 text-sm">Apr 1, 2026</td>
                            <td className="px-6 py-4 text-sm">Professional Plan (Monthly)</td>
                            <td className="px-6 py-4 text-sm font-medium">$158</td>
                            <td className="px-6 py-4">
                              <span className="flex items-center gap-1 text-sm text-green-600">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Paid
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button className="text-[13px] text-[#2563EB] underline hover:text-blue-700">Download</button>
                            </td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="px-6 py-4 text-sm">Mar 1, 2026</td>
                            <td className="px-6 py-4 text-sm">Professional Plan (Monthly)</td>
                            <td className="px-6 py-4 text-sm font-medium">$158</td>
                            <td className="px-6 py-4">
                              <span className="flex items-center gap-1 text-sm text-green-600">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Paid
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button className="text-[13px] text-[#2563EB] underline hover:text-blue-700">Download</button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Credit Usage Tab */}
            {activeTab === "credit-usage" && (
              <div className="space-y-0">
                {/* Page Header */}
                <div className="mb-4">
                  <h2 className="text-[22px] font-bold text-[#111827]" style={{ fontFamily: 'DM Sans, sans-serif' }}>Credit Usage</h2>
                  <p className="text-sm mt-1 text-[#6B7280]" style={{ fontFamily: 'Outfit, sans-serif' }}>Manage and monitor your credit balance and usage.</p>
                </div>

                {/* Sub-Tab Bar */}
                <div className="border-b border-[#E5E7EB] mb-6">
                  <div className="flex gap-0 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                    {(["overview", "team-usage", "credit-transactions", "how-it-works"] as const).map((tab) => {
                      const labels: Record<string, string> = { "overview": "Overview", "team-usage": "Team Usage", "credit-transactions": "Credit Transactions", "how-it-works": "How it works" };
                      const isActive = creditUsageSubTab === tab;
                      return (
                        <button
                          key={tab}
                          onClick={() => setCreditUsageSubTab(tab)}
                          className="relative px-4 py-3 text-[14px] font-medium transition-colors whitespace-nowrap flex-shrink-0"
                          style={{
                            color: isActive ? "#2563EB" : "#6B7280",
                            fontFamily: "Outfit, sans-serif",
                            borderBottom: isActive ? "2px solid #2563EB" : "2px solid transparent",
                            marginBottom: "-1px",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          {labels[tab]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* TAB 1: Overview */}
                {creditUsageSubTab === "overview" && (
                  <div className="space-y-6">
                    {/* Three Credit Cards in Single Row */}
                    <div className="grid grid-cols-3 gap-4">
                      {/* Free Credits Card */}
                      <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: "12px", padding: "20px" }}>
                        <label style={{ display: "block", fontSize: "13px", color: "#6B7280", fontFamily: "Outfit, sans-serif", marginBottom: "8px" }}>
                          Free Credits
                        </label>
                        <p style={{ fontSize: "32px", fontWeight: "bold", color: "#111827", fontFamily: "DM Sans, sans-serif", marginBottom: "8px" }}>
                          {creditsData.freeCredits}
                        </p>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5" style={{ color: "#9CA3AF" }} />
                          <span style={{ fontSize: "12px", color: "#9CA3AF", fontFamily: "Outfit, sans-serif" }}>
                            Resets on {creditsData.freeCreditsResetDate}
                          </span>
                        </div>
                      </div>

                      {/* Purchased Credits Card */}
                      <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: "12px", padding: "20px" }}>
                        <label style={{ display: "block", fontSize: "13px", color: "#6B7280", fontFamily: "Outfit, sans-serif", marginBottom: "8px" }}>
                          Purchased Credits
                        </label>
                        <p style={{ fontSize: "32px", fontWeight: "bold", color: "#111827", fontFamily: "DM Sans, sans-serif", marginBottom: "8px" }}>
                          {creditsData.purchasedCredits}
                        </p>
                        <div className="flex items-center gap-2">
                          <Info className="w-3.5 h-3.5" style={{ color: "#9CA3AF" }} />
                          <span style={{ fontSize: "12px", color: "#9CA3AF", fontFamily: "Outfit, sans-serif" }}>Never expires</span>
                        </div>
                      </div>

                      {/* Total Credits Available Card */}
                      <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: "12px", padding: "20px", display: "flex", flexDirection: "column" }}>
                        <label style={{ display: "block", fontSize: "13px", color: "#6B7280", fontFamily: "Outfit, sans-serif", marginBottom: "8px" }}>
                          Total Credits Available
                        </label>
                        <p style={{ fontSize: "32px", fontWeight: "bold", color: "#111827", fontFamily: "DM Sans, sans-serif", marginBottom: "auto" }}>
                          {creditsData.freeCredits + creditsData.purchasedCredits}
                        </p>
                        <div className="flex justify-end mt-4">
                          <button
                            style={{ width: "120px", height: "36px", backgroundColor: "#1A73E8", color: "#FFFFFF", fontSize: "13px", fontWeight: "bold", fontFamily: "Outfit, sans-serif", borderRadius: "6px", border: "none", cursor: "pointer" }}
                            className="hover:opacity-90 transition-opacity"
                            onClick={() => {
                              setBuyCreditsExpanded(true);
                              setTimeout(() => {
                                buyCreditsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                              }, 100);
                            }}
                          >
                            Buy Credits
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Credit Usage Breakdown Accordion */}
                    <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/10 transition-colors"
                        onClick={() => setCreditBreakdownExpanded(!creditBreakdownExpanded)}
                      >
                        <h3 className="text-base font-bold text-[#111827]" style={{ fontFamily: 'DM Sans, sans-serif' }}>Credit usage breakdown</h3>
                        <ChevronDown
                          className={`w-5 h-5 text-muted-foreground transition-transform ${creditBreakdownExpanded ? "rotate-180" : ""
                            }`}
                        />
                      </div>
                      {creditBreakdownExpanded && (
                        <div className="border-t border-[#E5E7EB] p-4">
                          {(() => {
                            const services = [
                              { label: "Voice Calls", used: 134200, total: 200000, Icon: Phone },
                              { label: "Text Messages", used: 28400, total: 60000, Icon: MessageSquare },
                              { label: "Webform Submissions", used: 3120, total: 10000, Icon: ClipboardList },
                              { label: "Chatbot Conversations", used: 19774, total: 50000, Icon: MessageCircle },
                              { label: "Extra Credits", used: 12800, total: 40574, Icon: Zap, fullWidth: true },
                            ];
                            return (
                              <div className="grid grid-cols-2 gap-4">
                                {services.map((item) => {
                                  const pct = Math.min((item.used / item.total) * 100, 100);
                                  const barColor = item.fullWidth && pct >= 100 ? "#DC2626" : "#2563EB";
                                  return (
                                    <div
                                      key={item.label}
                                      className={`border border-[#E5E7EB] rounded-xl p-5 bg-white flex flex-col gap-3${item.fullWidth ? " col-span-2" : ""}`}
                                    >
                                      <item.Icon className="w-5 h-5 text-[#2563EB]" strokeWidth={1.5} />
                                      <div>
                                        <p className="text-[11px] font-medium text-[#6B7280] mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>{item.label}</p>
                                        <p className="text-[24px] font-bold text-[#111827] leading-tight" style={{ fontFamily: 'DM Sans, sans-serif' }}>{item.used.toLocaleString()}</p>
                                        <p className="text-[12px] text-[#9CA3AF] mt-0.5" style={{ fontFamily: 'Outfit, sans-serif' }}>of {item.total.toLocaleString()} total</p>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <div className="flex-1 h-1 bg-[#F3F4F6] rounded-full overflow-hidden">
                                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                                        </div>
                                        <span className="text-[11px] text-[#9CA3AF] flex-shrink-0 w-8 text-right" style={{ fontFamily: 'Outfit, sans-serif' }}>{pct.toFixed(0)}%</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Buy Credits Accordion */}
                    <div ref={buyCreditsRef} className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/10 transition-colors"
                        onClick={() => setBuyCreditsExpanded(!buyCreditsExpanded)}
                      >
                        <h3 className="text-base font-bold text-[#111827]" style={{ fontFamily: 'DM Sans, sans-serif' }}>Extra Credits</h3>
                        <ChevronDown
                          className={`w-5 h-5 text-muted-foreground transition-transform ${buyCreditsExpanded ? "rotate-180" : ""
                            }`}
                        />
                      </div>
                      {buyCreditsExpanded && (
                        <div className="border-t border-[#E5E7EB] p-6 space-y-6">
                          <div>
                            <p className="text-base font-bold text-[#111827] mb-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>Extra Credits</p>
                            <p className="text-sm text-[#6B7280]" style={{ fontFamily: 'Outfit, sans-serif' }}>Extra credits are shared across users. Select how many extra credits you would like for your team below.</p>
                          </div>

                          {(() => {
                            const creditTiers = [
                              { value: 0, credits: 0, price: 0, label: "0/yr" },
                              { value: 1, credits: 10000, price: 500, label: "10K/yr" },
                              { value: 2, credits: 25000, price: 1250, label: "25K/yr" },
                              { value: 3, credits: 50000, price: 2500, label: "50K/yr" },
                              { value: 4, credits: 100000, price: 5000, label: "100K/yr" },
                              { value: 5, credits: 250000, price: 10000, label: "250K/yr" },
                              { value: 6, credits: 500000, price: 15000, label: "500K/yr" },
                              { value: 7, credits: 1000000, price: 12000, label: "1M/yr" },
                              { value: 8, credits: 2500000, price: 17500, label: "2.5M/yr" },
                              { value: 9, credits: 5000000, price: 25000, label: "5M/yr" },
                              { value: 10, credits: 7500000, price: 35000, label: "7.5M/yr" },
                              { value: 11, credits: 10000000, price: 45000, label: "10M/yr" },
                              { value: 12, credits: 20000000, price: 80000, label: "20M/yr" },
                              { value: 13, credits: 0, price: 0, label: "Custom" },
                            ];

                            const currentTier = creditTiers[additionalCreditsSlider];
                            const formattedCredits = currentTier.credits >= 1000000
                              ? `${(currentTier.credits / 1000000).toFixed(1)}M`
                              : currentTier.credits >= 1000
                                ? `${(currentTier.credits / 1000).toFixed(0)}K`
                                : currentTier.credits.toString();

                            const priceText = currentTier.label === "Custom"
                              ? "Contact sales"
                              : `$${currentTier.price.toLocaleString()}/yr`;

                            return (
                              <>
                                <div className="flex items-center justify-between">
                                  <p className="text-lg font-bold text-[#111827]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                    240K (Current plan) + {currentTier.label === "Custom" ? "Custom" : formattedCredits} credits/yr
                                  </p>
                                  <p className="text-lg font-bold text-[#111827]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                    {priceText}
                                  </p>
                                </div>

                                <div className="space-y-3">
                                  <input
                                    type="range"
                                    min="0"
                                    max="13"
                                    step="1"
                                    value={additionalCreditsSlider}
                                    onChange={(e) => setAdditionalCreditsSlider(parseInt(e.target.value))}
                                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                                    style={{
                                      background: `linear-gradient(to right, #2563EB 0%, #2563EB ${(additionalCreditsSlider / 13) * 100}%, #E5E7EB ${(additionalCreditsSlider / 13) * 100}%, #E5E7EB 100%)`,
                                    }}
                                  />
                                  <div className="flex justify-between text-xs text-[#6B7280]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                    {creditTiers.map((tier, idx) => (
                                      <span key={idx} className="flex-shrink-0" style={{ fontSize: '10px' }}>
                                        {tier.label}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* TAB 2: Team Usage */}
                {creditUsageSubTab === "team-usage" && (
                  <div className="space-y-6">

                    {/* Team Credit Usage Section */}
                    <div className="border border-[#E5E7EB] rounded-xl p-6 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base font-bold text-[#111827]" style={{ fontFamily: 'DM Sans, sans-serif' }}>Team credit usage</h3>
                        <span className="text-[13px] text-[#6B7280]" style={{ fontFamily: 'Outfit, sans-serif' }}>Jan 17, 2026 – Jan 17, 2027</span>
                      </div>
                      {/* Total usage row */}
                      <div className="flex items-center gap-4 mt-4">
                        <div className="w-8 h-8 rounded-full bg-[#1C2B4A] flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-[11px] font-bold">T</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[13px] font-medium text-[#111827]" style={{ fontFamily: 'Outfit, sans-serif' }}>Total credit usage</span>
                            <span className="text-[13px] text-[#6B7280]" style={{ fontFamily: 'Outfit, sans-serif' }}>198,294 credits of 260,574 credits/yr</span>
                          </div>
                          <div className="w-full h-3 bg-[#E5E7EB] rounded-full overflow-hidden">
                            <div className="h-full bg-[#2563EB] rounded-full" style={{ width: `${(198294 / 260574) * 100}%` }} />
                          </div>
                        </div>
                        <span className="text-[12px] text-[#6B7280] flex-shrink-0 ml-4" style={{ fontFamily: 'Outfit, sans-serif' }}>Estimated Credit Renewal on: Jan 17, 2027</span>
                      </div>
                    </div>

                    {/* Team Level Credits Table */}
                    <div className="border border-[#E5E7EB] rounded-xl bg-white overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
                        <div className="flex items-center gap-3">
                          <h3 className="text-base font-bold text-[#111827]" style={{ fontFamily: 'DM Sans, sans-serif' }}>Team Level Credits</h3>
                          <span className="px-2 py-0.5 bg-[#F3F4F6] text-[#374151] text-[11px] font-semibold rounded-full tracking-wide">
                            TOTAL {teamMembers.length + pendingInvites.length}
                          </span>
                          {/* Active / Pending toggle */}
                          <div className="flex items-center border border-[#E5E7EB] rounded-lg overflow-hidden ml-2">
                            <button
                              onClick={() => setTeamMembersFilter("active")}
                              className="px-3 py-1.5 text-[13px] font-medium transition-colors"
                              style={{
                                backgroundColor: teamMembersFilter === "active" ? "#111827" : "#FFFFFF",
                                color: teamMembersFilter === "active" ? "#FFFFFF" : "#6B7280",
                                fontFamily: "Outfit, sans-serif",
                                border: "none",
                                cursor: "pointer",
                              }}
                            >
                              Active
                            </button>
                            <button
                              onClick={() => setTeamMembersFilter("pending")}
                              className="px-3 py-1.5 text-[13px] font-medium transition-colors"
                              style={{
                                backgroundColor: teamMembersFilter === "pending" ? "#111827" : "#FFFFFF",
                                color: teamMembersFilter === "pending" ? "#FFFFFF" : "#6B7280",
                                fontFamily: "Outfit, sans-serif",
                                border: "none",
                                cursor: "pointer",
                              }}
                            >
                              Pending
                            </button>
                          </div>
                          <button className="p-1.5 text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F3F4F6] rounded-lg transition-colors border border-[#E5E7EB]">
                            <SettingsIcon className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => setShowInviteMemberModal(true)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] text-white text-[13px] font-semibold rounded-lg hover:bg-[#1D4ED8] transition-colors"
                          style={{ fontFamily: "Outfit, sans-serif", border: "none", cursor: "pointer" }}
                        >
                          <span className="text-[16px] leading-none">+</span> Invite Member
                        </button>
                      </div>

                      {/* Search */}
                      <div className="px-6 py-3 border-b border-[#E5E7EB]">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                          <input
                            type="text"
                            placeholder="Search team members..."
                            value={teamMembersSearch}
                            onChange={(e) => setTeamMembersSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-[#E5E7EB] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          />
                        </div>
                      </div>

                      {/* Table */}
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[#E5E7EB]">
                            <th className="w-8 px-4 py-3" />
                            <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide">Name</th>
                            <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide">Email</th>
                            <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide">Credits</th>
                            <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide">Usage Balance</th>
                            <th className="w-8 px-4 py-3" />
                          </tr>
                        </thead>
                        <tbody>
                          {teamMembersFilter === "active" ? (
                            [
                              { name: "Eye Mantra test dev", role: "TEAM MEMBER", email: "dev@mantracare.com", used: 0, total: 1000, pct: 0 },
                              { name: "Karan Hinduja", role: "TEAM MEMBER", email: "karan@mantra.care", used: 0, total: 6000, pct: 0 },
                              { name: "Varsha", role: "TEAM MEMBER", email: "varsha@mantra.care", used: 7921, total: 11000, pct: 72 },
                            ]
                              .filter((m) => {
                                if (!teamMembersSearch) return true;
                                const q = teamMembersSearch.toLowerCase();
                                return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
                              })
                              .map((member, idx, arr) => {
                                return (
                                  <tr key={member.email} className={`${idx !== arr.length - 1 ? "border-b border-[#F3F4F6]" : ""} hover:bg-[#F9FAFB] transition-colors`}>
                                    <td className="px-4 py-4 text-center" style={{ position: 'relative' }}>
                                      <button
                                        className="text-[#9CA3AF] hover:text-[#374151] transition-colors"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenMemberRowMenu(openMemberRowMenu === member.email ? null : member.email);
                                        }}
                                      >
                                        <MoreVertical className="w-4 h-4" />
                                      </button>
                                      {openMemberRowMenu === member.email && (
                                        <>
                                          <div
                                            className="fixed inset-0"
                                            style={{ zIndex: 9998 }}
                                            onClick={() => setOpenMemberRowMenu(null)}
                                          />
                                          <div
                                            style={{
                                              position: 'absolute',
                                              top: '100%',
                                              left: '50%',
                                              transform: 'translateX(-50%)',
                                              zIndex: 9999,
                                              backgroundColor: '#FFFFFF',
                                              border: '0.5px solid #E5E7EB',
                                              borderRadius: '8px',
                                              boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                                              minWidth: '110px',
                                              padding: '4px',
                                            }}
                                          >
                                            <button
                                              className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-[13px] text-[#374151] hover:bg-[#F3F4F6] transition-colors"
                                              style={{ fontFamily: 'Outfit, sans-serif' }}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenMemberRowMenu(null);
                                                setSelectedMemberForUsage(member);
                                                setShowMemberUsageDrawer(true);
                                                setMemberUsageTab("breakdown");
                                              }}
                                            >
                                              <Eye className="w-3.5 h-3.5 text-[#6B7280]" />
                                              View
                                            </button>
                                          </div>
                                        </>
                                      )}
                                    </td>
                                    <td className="px-4 py-4">
                                      <p className="text-[13px] font-semibold text-[#2563EB] cursor-pointer hover:underline" style={{ fontFamily: "Outfit, sans-serif" }}>{member.name}</p>
                                      <span className="text-[10px] text-[#9CA3AF] font-medium tracking-wide">+ {member.role}</span>
                                    </td>
                                    <td className="px-4 py-4 text-[13px] text-[#374151]" style={{ fontFamily: "Outfit, sans-serif" }}>{member.email}</td>
                                    <td className="px-4 py-4">
                                      <div className="flex items-center gap-1.5">
                                        <Coins className="w-3.5 h-3.5 text-[#F59E0B] flex-shrink-0" />
                                        <span className="text-[13px] text-[#374151]" style={{ fontFamily: "Outfit, sans-serif" }}>
                                          {member.used.toLocaleString()} / {member.total.toLocaleString()}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-4">
                                      <div className="flex items-center gap-3">
                                        <div className="flex-1 h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                                          <div
                                            className="h-full rounded-full"
                                            style={{ width: `${member.pct}%`, backgroundColor: "#2563EB" }}
                                          />
                                        </div>
                                        <span className="text-[12px] text-[#6B7280] w-8 text-right flex-shrink-0" style={{ fontFamily: "Outfit, sans-serif" }}>{member.pct}%</span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                          ) : (
                            pendingInvites.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-4 py-12 text-center">
                                  <div className="flex flex-col items-center justify-center gap-2">
                                    <User className="w-10 h-10 text-[#D1D5DB]" />
                                    <p className="text-[14px] text-[#9CA3AF]" style={{ fontFamily: "Outfit, sans-serif" }}>
                                      No pending invitations yet
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              pendingInvites
                                .filter((invite) => {
                                  if (!teamMembersSearch) return true;
                                  const q = teamMembersSearch.toLowerCase();
                                  return invite.email.toLowerCase().includes(q) || invite.role.toLowerCase().includes(q);
                                })
                                .map((invite, idx, arr) => (
                                  <tr key={invite.id} className={`${idx !== arr.length - 1 ? "border-b border-[#F3F4F6]" : ""} hover:bg-[#F9FAFB] transition-colors`}>
                                    <td className="px-4 py-4" />
                                    <td className="px-4 py-4">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center flex-shrink-0">
                                          <Mail className="w-4 h-4 text-[#9CA3AF]" />
                                        </div>
                                        <span className="text-[13px] font-medium text-[#374151]" style={{ fontFamily: "Outfit, sans-serif" }}>
                                          {invite.email}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-4">
                                      <span className="text-[13px] text-[#6B7280]" style={{ fontFamily: "Outfit, sans-serif" }}>
                                        {invite.role}
                                      </span>
                                    </td>
                                    <td className="px-4 py-4">
                                      <span className="inline-flex items-center px-2.5 py-1 bg-[#FEF3C7] text-[#92400E] text-[11px] font-semibold rounded-full">
                                        Pending
                                      </span>
                                    </td>
                                    <td className="px-4 py-4">
                                      <span className="text-[12px] text-[#9CA3AF]" style={{ fontFamily: "Outfit, sans-serif" }}>
                                        Sent {invite.sentAt}
                                      </span>
                                    </td>
                                    <td className="px-4 py-4">
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => {
                                            toast.success("Invitation resent successfully");
                                          }}
                                          className="text-[13px] text-[#2563EB] hover:text-[#1D4ED8] font-medium"
                                          style={{ fontFamily: "Outfit, sans-serif" }}
                                        >
                                          Resend
                                        </button>
                                        <span className="text-[#D1D5DB]">|</span>
                                        <button
                                          onClick={() => {
                                            setPendingInvites((prev) => prev.filter((i) => i.id !== invite.id));
                                            toast.success("Invitation cancelled");
                                          }}
                                          className="text-[13px] text-[#DC2626] hover:text-[#B91C1C] font-medium"
                                          style={{ fontFamily: "Outfit, sans-serif" }}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                            )
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Invite Member Modal */}
                    {showInviteMemberModal && (
                      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50" onClick={() => {
                        setShowInviteMemberModal(false);
                        setInviteEmail("");
                        setInviteRole("");
                        setInviteErrors({ email: "", role: "" });
                      }}>
                        <div
                          className="bg-white rounded-xl shadow-2xl w-full max-w-md"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Modal Header */}
                          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
                            <h2 className="text-lg font-bold text-[#111827]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                              Invite Team Member
                            </h2>
                            <button
                              onClick={() => {
                                setShowInviteMemberModal(false);
                                setInviteEmail("");
                                setInviteRole("");
                                setInviteErrors({ email: "", role: "" });
                              }}
                              className="text-[#9CA3AF] hover:text-[#374151] transition-colors"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>

                          {/* Modal Body */}
                          <div className="px-6 py-5 space-y-4">
                            {/* Email Field */}
                            <div>
                              <label className="block text-[13px] font-medium text-[#374151] mb-1.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                Email Address <span className="text-[#DC2626]">*</span>
                              </label>
                              <input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => {
                                  setInviteEmail(e.target.value);
                                  if (inviteErrors.email) setInviteErrors({ ...inviteErrors, email: "" });
                                }}
                                placeholder="Enter team member's email address"
                                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                                style={{ fontFamily: 'Outfit, sans-serif' }}
                              />
                              {inviteErrors.email && (
                                <p className="mt-1 text-[12px] text-[#DC2626]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                  {inviteErrors.email}
                                </p>
                              )}
                            </div>

                            {/* Role Dropdown */}
                            <div>
                              <label className="block text-[13px] font-medium text-[#374151] mb-1.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                Role <span className="text-[#DC2626]">*</span>
                              </label>
                              <div className="relative">
                                <select
                                  value={inviteRole}
                                  onChange={(e) => {
                                    setInviteRole(e.target.value);
                                    if (inviteErrors.role) setInviteErrors({ ...inviteErrors, role: "" });
                                  }}
                                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent appearance-none bg-white"
                                  style={{ fontFamily: 'Outfit, sans-serif', color: inviteRole ? '#374151' : '#9CA3AF' }}
                                >
                                  <option value="" disabled>Select a role</option>
                                  <option value="Admin">Admin</option>
                                  <option value="Member">Member</option>
                                  <option value="Viewer">Viewer</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                              </div>
                              {inviteErrors.role && (
                                <p className="mt-1 text-[12px] text-[#DC2626]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                  {inviteErrors.role}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Modal Footer */}
                          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E5E7EB]">
                            <button
                              onClick={() => {
                                setShowInviteMemberModal(false);
                                setInviteEmail("");
                                setInviteRole("");
                                setInviteErrors({ email: "", role: "" });
                              }}
                              className="px-4 py-2 text-[13px] font-medium text-[#374151] hover:bg-[#F3F4F6] rounded-lg transition-colors"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                // Validate fields
                                const errors = { email: "", role: "" };
                                let hasError = false;

                                if (!inviteEmail.trim()) {
                                  errors.email = "Email address is required";
                                  hasError = true;
                                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
                                  errors.email = "Please enter a valid email address";
                                  hasError = true;
                                }

                                if (!inviteRole) {
                                  errors.role = "Role is required";
                                  hasError = true;
                                }

                                if (hasError) {
                                  setInviteErrors(errors);
                                  return;
                                }

                                // Submit invitation
                                setIsSubmittingInvite(true);
                                setTimeout(() => {
                                  const newInvite = {
                                    id: Date.now(),
                                    email: inviteEmail,
                                    role: inviteRole,
                                    sentAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                                  };
                                  setPendingInvites((prev) => [...prev, newInvite]);
                                  setIsSubmittingInvite(false);
                                  setShowInviteMemberModal(false);
                                  setInviteEmail("");
                                  setInviteRole("");
                                  setInviteErrors({ email: "", role: "" });
                                  toast.success("Invitation sent successfully");
                                }, 500);
                              }}
                              disabled={isSubmittingInvite}
                              className="px-4 py-2 text-[13px] font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            >
                              {isSubmittingInvite ? "Sending..." : "Send Invitation"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {/* TAB 3: Credit Transactions */}
                {creditUsageSubTab === "credit-transactions" && (
                  <div className="space-y-6">
                    {/* Filter Dropdowns */}
                    <div className="flex items-center gap-3">
                      <Select value={creditUsageTimeFilter} onValueChange={setCreditUsageTimeFilter}>
                        <SelectTrigger className="w-[140px] h-9 text-[13px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="this-month">This Month</SelectItem>
                          <SelectItem value="last-month">Last Month</SelectItem>
                          <SelectItem value="last-3-months">Last 3 Months</SelectItem>
                          <SelectItem value="this-year">This Year</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={creditUsageTypeFilter} onValueChange={setCreditUsageTypeFilter}>
                        <SelectTrigger className="w-[130px] h-9 text-[13px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all-types">All Types</SelectItem>
                          <SelectItem value="domestic-outbound">Domestic Outbound</SelectItem>
                          <SelectItem value="domestic-inbound">Domestic Inbound</SelectItem>
                          <SelectItem value="international-outbound">International Outbound</SelectItem>
                          <SelectItem value="international-inbound">International Inbound</SelectItem>
                          <SelectItem value="webhook">Webhook</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={creditUsageUserFilter} onValueChange={setCreditUsageUserFilter}>
                        <SelectTrigger className="w-[130px] h-9 text-[13px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all-users">All Users</SelectItem>
                          <SelectItem value="anurag">Anurag Kashuap</SelectItem>
                          <SelectItem value="sarah">Sarah Johnson</SelectItem>
                          <SelectItem value="michael">Michael Chen</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Two Charts Row */}
                    <div className="grid grid-cols-[1.5fr,1fr] gap-6">
                      <div className="border border-[#E5E7EB] rounded-xl p-6 bg-white">
                        <h3 className="text-base font-bold mb-4 text-[#111827]">Credit Usage Over Time</h3>
                        <ResponsiveContainer width="100%" height={280}>
                          <LineChart
                            data={[
                              { date: "May 1", usage: 285 },
                              { date: "May 2", usage: 320 },
                              { date: "May 3", usage: 250 },
                              { date: "May 4", usage: 380 },
                              { date: "May 5", usage: 350 },
                              { date: "May 6", usage: 290 },
                              { date: "May 7", usage: 310 },
                              { date: "May 8", usage: 220 },
                              { date: "May 9", usage: 50 },
                              { date: "May 10", usage: 30 },
                            ]}
                            margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                            <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={{ stroke: "#E5E7EB" }} />
                            <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={{ stroke: "#E5E7EB" }} />
                            <ChartTooltip contentStyle={{ backgroundColor: "white", border: "1px solid #E5E7EB", borderRadius: "8px", fontSize: "13px" }} />
                            <Line type="monotone" dataKey="usage" stroke="#2563EB" strokeWidth={2} dot={{ fill: "#2563EB", r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="border border-[#E5E7EB] rounded-xl p-6 bg-white">
                        <h3 className="text-base font-bold mb-4 text-[#111827]">Usage by Type</h3>
                        <div className="grid grid-cols-2 gap-6 items-center">
                          <div className="relative flex items-center justify-center">
                            <ResponsiveContainer width="100%" height={200}>
                              <PieChart>
                                <Pie
                                  data={[
                                    { name: "Domestic Call Outbound", value: 892 },
                                    { name: "Domestic Call Inbound", value: 658 },
                                    { name: "International Call Outbound", value: 425 },
                                    { name: "International Call Inbound", value: 223 },
                                    { name: "Webhook Usage", value: 85 },
                                  ]}
                                  cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value"
                                >
                                  <Cell fill="#111827" />
                                  <Cell fill="#2563EB" />
                                  <Cell fill="#3B82F6" />
                                  <Cell fill="#60A5FA" />
                                  <Cell fill="#93C5FD" />
                                </Pie>
                                <ChartTooltip contentStyle={{ backgroundColor: "white", border: "1px solid #E5E7EB", borderRadius: "8px", fontSize: "13px" }} />
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                              <p className="text-[28px] font-bold text-[#111827]">2,283</p>
                              <p className="text-[13px] text-[#6B7280]">Total Usage</p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            {[
                              { label: "Domestic Call Outbound", color: "#111827" },
                              { label: "Domestic Call Inbound", color: "#2563EB" },
                              { label: "International Call Outbound", color: "#3B82F6" },
                              { label: "International Call Inbound", color: "#60A5FA" },
                              { label: "Webhook Usage", color: "#93C5FD" },
                            ].map((item) => (
                              <div key={item.label} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                                <span className="text-[13px] text-[#6B7280]">{item.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Transaction History */}
                    <div className="border border-[#E5E7EB] rounded-xl p-6 bg-white">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-[#111827]">Transaction History</h3>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                          <input
                            type="text"
                            placeholder="Filter transactions..."
                            value={creditUsageSearchQuery}
                            onChange={(e) => setCreditUsageSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-[#E5E7EB] rounded-lg text-[13px] w-[240px] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                          />
                        </div>
                      </div>
                      <div className="overflow-hidden rounded-lg border border-[#E5E7EB]">
                        <table className="w-full">
                          <thead className="bg-[#111827] text-white">
                            <tr>
                              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide">Transaction ID</th>
                              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide">User</th>
                              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide">Role</th>
                              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide">Type</th>
                              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide">Description</th>
                              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide">Credits</th>
                              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { id: "Txn-1778389229", user: "Anurag Kashuap", role: "System User", type: "Domestic call outbound usage", description: "Outbound call usage by Anurag Kashuap", credits: "-1.00", date: "May 10, 2026, 10:30 AM" },
                              { id: "Txn-1778389228", user: "Sarah Johnson", role: "Admin", type: "International call inbound usage", description: "Inbound international call usage", credits: "-2.50", date: "May 10, 2026, 9:15 AM" },
                              { id: "Txn-1778389227", user: "Michael Chen", role: "Agent", type: "Domestic call inbound usage", description: "Inbound call usage by Michael Chen", credits: "-0.75", date: "May 9, 2026, 4:45 PM" },
                              { id: "Txn-1778389226", user: "Anurag Kashuap", role: "System User", type: "Webhook usage", description: "API webhook processing", credits: "-0.10", date: "May 9, 2026, 2:20 PM" },
                              { id: "Txn-1778389225", user: "Sarah Johnson", role: "Admin", type: "International call outbound usage", description: "Outbound international call", credits: "-3.25", date: "May 9, 2026, 11:00 AM" },
                            ]
                              .filter((t) => {
                                if (!creditUsageSearchQuery) return true;
                                const q = creditUsageSearchQuery.toLowerCase();
                                return t.id.toLowerCase().includes(q) || t.user.toLowerCase().includes(q) || t.type.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
                              })
                              .map((transaction, index, arr) => (
                                <tr key={transaction.id} className={`${index !== arr.length - 1 ? "border-b border-[#F3F4F6]" : ""} hover:bg-[#F9FAFB] transition-colors`}>
                                  <td className="px-4 py-3 text-[13px] text-[#374151]">{transaction.id}</td>
                                  <td className="px-4 py-3 text-[13px] text-[#374151] font-medium">{transaction.user}</td>
                                  <td className="px-4 py-3">
                                    <span className="px-2 py-0.5 bg-[#EFF6FF] text-[#2563EB] text-[11px] rounded-full font-medium">{transaction.role}</span>
                                  </td>
                                  <td className="px-4 py-3 text-[13px] text-[#374151]">{transaction.type}</td>
                                  <td className="px-4 py-3 text-[13px] text-[#6B7280]">{transaction.description}</td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-1">
                                      <Coins className="w-3.5 h-3.5 text-[#F59E0B]" />
                                      <span className="text-[13px] font-semibold text-[#DC2626]">{transaction.credits}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-[13px] text-[#6B7280]">{transaction.date}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: How it works */}
                {creditUsageSubTab === "how-it-works" && (
                  <div className="py-6">
                    <div className="bg-muted/30 rounded-xl border-2 border-dashed border-border overflow-hidden" style={{ height: '400px' }}>
                      <div className="h-full flex flex-col items-center justify-center p-8">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                          <Play className="w-10 h-10 text-primary" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2" style={TEXT_STYLES.heading}>
                          Video tutorial for Credit Usage
                        </h3>
                        <p className="text-sm text-muted-foreground">Placeholder for embedded video player</p>
                      </div>
                    </div>

                    {/* FAQ Section */}
                    <div className="mt-5 bg-background rounded-xl border border-border p-4">
                      <div className="mb-4">
                        <h3 className="text-sm font-semibold" style={TEXT_STYLES.heading}>Frequently Asked Questions</h3>
                        <p className="text-xs text-muted-foreground mt-1">Everything you need to know about credits and billing.</p>
                      </div>
                      {[
                        {
                          q: "What happens when my credits run out?",
                          a: "When a specific feature's credits are fully used, Extra Credits automatically step in to cover the overflow. If Extra Credits are also exhausted, your paid balance is charged to ensure uninterrupted service. You will never lose access to a feature mid-usage."
                        },
                        {
                          q: "Do unused credits roll over to the next month?",
                          a: "Free credits reset on your monthly billing cycle date and do not carry over. However, purchased credits never expire and remain in your account until fully used."
                        },
                        {
                          q: "How are credits counted for each feature?",
                          a: "Each feature deducts credits based on usage — for example, one outbound voice call may consume 3 credits, one text message consumes 1 credit, and one webform submission consumes 2 credits. You can view the full breakdown by visiting the Credit Transactions tab."
                        },
                        {
                          q: "Can I allocate specific credits to individual team members?",
                          a: "Yes. From the Team Usage tab, you can view how credits are distributed across your team. Admins can set per-member credit limits to control usage and prevent any single user from consuming the shared pool."
                        },
                        {
                          q: "How do I purchase additional credits?",
                          a: "You can purchase additional credits at any time from the Plans section under Billing. Click 'Buy Credits' on the Overview tab to add to your paid balance immediately. Purchased credits are available instantly after payment."
                        }
                      ].map((faq, idx, arr) => {
                        const isOpen = openFaqIndex === idx;
                        return (
                          <div key={idx}>
                            <button
                              className="w-full flex items-center justify-between py-3 text-left"
                              style={{ minHeight: '48px' }}
                              onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                            >
                              <span className="text-sm font-medium pr-4" style={{ ...TEXT_STYLES.heading, fontWeight: 500 }}>{faq.q}</span>
                              <ChevronDown
                                className="shrink-0 transition-transform duration-200"
                                style={{
                                  width: 16,
                                  height: 16,
                                  color: isOpen ? 'var(--primary)' : 'var(--muted-foreground)',
                                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                                }}
                              />
                            </button>
                            {isOpen && (
                              <div className="pb-3 pr-8">
                                <p className="text-xs text-muted-foreground leading-relaxed">{faq.a}</p>
                              </div>
                            )}
                            {idx < arr.length - 1 && (
                              <div className="border-t border-border" style={{ borderTopWidth: '0.5px' }} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* AI Voices / Models Tab */}
            {activeTab === "voice-config" && (
              <DndProvider backend={HTML5Backend}>
                <div className="space-y-8">
                  {/* AI Models Section */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h2 className="text-xl font-bold" style={TEXT_STYLES.heading}>AI Models</h2>
                      <Button variant="outline" onClick={() => openHowItWorks("voice-config")}>
                        <Play className="w-4 h-4" />
                        How it works
                      </Button>
                    </div>
                    <p className="text-sm mb-4" style={TEXT_STYLES.subtext}>Manage AI service providers</p>

                    <div className="bg-white rounded-xl border border-border overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted/30 border-b border-border">
                          <tr>
                            <th className="text-left px-6 py-3 text-sm font-medium" style={TEXT_STYLES.subtext}>Service Provider</th>
                            <th className="text-left px-6 py-3 text-sm font-medium" style={TEXT_STYLES.subtext}>Model Name</th>
                            <th className="text-left px-6 py-3 text-sm font-medium" style={TEXT_STYLES.subtext}>Status</th>
                            <th className="text-right px-6 py-3 text-sm font-medium" style={TEXT_STYLES.subtext}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {aiModels.map((model) => (
                            <tr key={model.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                              <td className="px-6 py-4">
                                <p className="text-sm font-medium">{model.provider}</p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm" style={TEXT_STYLES.subtext}>{model.modelName}</p>
                              </td>
                              <td className="px-6 py-4">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={model.status}
                                    onChange={() => {
                                      setAIModels((prev) =>
                                        prev.map((m) =>
                                          m.id === model.id ? { ...m, status: !m.status } : m
                                        )
                                      );
                                    }}
                                  />
                                  <div className="w-11 h-6 bg-switch-background peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-switch-background after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                    title="Edit model"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                                    title="Delete model"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Choose Voice Section */}
                  <div>
                    {/* Header Row with Gear Icon */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold" style={TEXT_STYLES.heading}>Choose Voice</h2>
                        <button
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                          title="Voice Settings"
                        >
                          <SettingsIcon className="w-5 h-5" />
                        </button>
                        <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                      </div>
                    </div>

                    {/* Subtitle Info Banner */}
                    <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                      <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-blue-900">
                        Choose the voice your AI Receptionist will use when answering the phone.
                      </p>
                    </div>

                    {/* Explore All Voices Button */}
                    <div className="flex justify-end mb-4">
                      <Button
                        variant="outline"
                        onClick={() => setShowVoiceLibraryModal(true)}
                      >
                        Explore All Voices
                      </Button>
                    </div>

                    {/* Backdrop to close open menus */}
                    {addProcessVoiceId !== null && (
                      <div
                        className="fixed inset-0 z-[5]"
                        onClick={() => setAddProcessVoiceId(null)}
                      />
                    )}

                    {/* Voice Table */}
                    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                      <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
                        <table className="w-full min-w-[1200px]">
                          <thead className="border-b border-border" style={{ backgroundColor: '#1F2937' }}>
                            <tr>
                              {/* Settings icon for column visibility */}
                              <th className="px-2 py-2.5 text-center relative" style={{ width: '32px' }}>
                                <div className="relative inline-block">
                                  <button
                                    onClick={() => {
                                      setShowVoiceColumnToggle(!showVoiceColumnToggle);
                                    }}
                                    className="inline-flex items-center justify-center w-8 h-8 rounded transition-colors hover:bg-white/10"
                                    aria-label="Customize Columns"
                                  >
                                    <SettingsIcon className="w-4 h-4 text-[#E5E7EB] hover:text-white transition-colors" />
                                  </button>
                                  {showVoiceColumnToggle && (
                                    <div className="absolute left-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-lg p-4 z-50">
                                      <h3 className="font-semibold mb-3" style={{ color: '#1F2937', fontFamily: 'DM Sans, sans-serif' }}>Visible Columns</h3>
                                      <div className="space-y-2">
                                        {Object.keys(voiceVisibleColumns).map((col) => (
                                          <label key={col} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={voiceVisibleColumns[col as keyof typeof voiceVisibleColumns]}
                                              onChange={(e) =>
                                                setVoiceVisibleColumns({
                                                  ...voiceVisibleColumns,
                                                  [col]: e.target.checked,
                                                })
                                              }
                                              className="w-4 h-4"
                                            />
                                            <span className="text-sm capitalize" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                              {col === 'voiceName' ? 'Voice Name' : col}
                                            </span>
                                          </label>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </th>
                              {voiceColumnOrder.map((columnKey, index) => {
                                const columnLabels: { [key: string]: string } = {
                                  voiceName: 'Voice Name',
                                  gender: 'Gender',
                                  country: 'Country',
                                  tone: 'Tone',
                                  age: 'Age',
                                  process: 'Process',
                                  preview: 'Preview',
                                  status: 'Status',
                                };

                                return voiceVisibleColumns[columnKey as keyof typeof voiceVisibleColumns] ? (
                                  <DraggableVoiceColumnHeader
                                    key={columnKey}
                                    columnKey={columnKey}
                                    index={index}
                                    label={columnLabels[columnKey]}
                                    moveColumn={moveVoiceColumn}
                                  />
                                ) : null;
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {voiceTableData.map((voice) => (
                              <tr key={voice.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                                {/* Settings icon column (column visibility toggle) */}
                                <td className="px-2 py-3" />

                                {voiceColumnOrder.map((columnKey) => {
                                  if (!voiceVisibleColumns[columnKey as keyof typeof voiceVisibleColumns]) return null;

                                  if (columnKey === 'voiceName') {
                                    return (
                                      <td key={columnKey} className="px-4 py-3">
                                        <span className="text-sm font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                          {voice.name}
                                        </span>
                                      </td>
                                    );
                                  }

                                  if (columnKey === 'gender') {
                                    return (
                                      <td key={columnKey} className="px-4 py-3">
                                        <span className="text-sm text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                          {voice.gender}
                                        </span>
                                      </td>
                                    );
                                  }

                                  if (columnKey === 'country') {
                                    return (
                                      <td key={columnKey} className="px-4 py-3">
                                        <span className="text-sm text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                          {voice.country}
                                        </span>
                                      </td>
                                    );
                                  }

                                  if (columnKey === 'tone') {
                                    return (
                                      <td key={columnKey} className="px-4 py-3">
                                        <span className="text-sm text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                          {voice.tone}
                                        </span>
                                      </td>
                                    );
                                  }

                                  if (columnKey === 'age') {
                                    return (
                                      <td key={columnKey} className="px-4 py-3">
                                        <span className="text-sm text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                          {voice.age}
                                        </span>
                                      </td>
                                    );
                                  }

                                  if (columnKey === 'process') {
                                    return (
                                      <td key={columnKey} className="px-4 py-3">
                                        <div className="flex flex-wrap items-center gap-1">
                                          {voice.processes.map((proc) => (
                                            <span
                                              key={proc}
                                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                                              style={{ fontFamily: 'Outfit, sans-serif' }}
                                            >
                                              {proc}
                                              <button
                                                onClick={() => {
                                                  setVoiceTableData((prev) =>
                                                    prev.map((v) =>
                                                      v.id === voice.id
                                                        ? { ...v, processes: v.processes.filter((p) => p !== proc) }
                                                        : v
                                                    )
                                                  );
                                                }}
                                                className="ml-0.5 hover:text-primary/70"
                                                title={`Remove ${proc}`}
                                              >
                                                <X className="w-2.5 h-2.5" />
                                              </button>
                                            </span>
                                          ))}
                                          {/* + button to add a process */}
                                          <div className="relative">
                                            <button
                                              onClick={() => setAddProcessVoiceId(addProcessVoiceId === voice.id ? null : voice.id)}
                                              className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-dashed border-primary/50 text-primary hover:bg-primary/10 transition-colors"
                                              title="Add Process"
                                            >
                                              <Plus className="w-3 h-3" />
                                            </button>
                                            {addProcessVoiceId === voice.id && (
                                              <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-3 min-w-[220px]">
                                                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Assign Process</p>
                                                <div className="space-y-1">
                                                  {AVAILABLE_PROCESSES.map((proc) => {
                                                    const assigned = voice.processes.includes(proc);
                                                    return (
                                                      <label key={proc} className="flex items-center gap-2 cursor-pointer px-1 py-1 rounded hover:bg-gray-50">
                                                        <input
                                                          type="checkbox"
                                                          checked={assigned}
                                                          onChange={() => {
                                                            setVoiceTableData((prev) =>
                                                              prev.map((v) =>
                                                                v.id === voice.id
                                                                  ? {
                                                                    ...v,
                                                                    processes: assigned
                                                                      ? v.processes.filter((p) => p !== proc)
                                                                      : [...v.processes, proc],
                                                                  }
                                                                  : v
                                                              )
                                                            );
                                                          }}
                                                          className="w-4 h-4 accent-primary"
                                                        />
                                                        <span className="text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>{proc}</span>
                                                      </label>
                                                    );
                                                  })}
                                                </div>
                                                <button
                                                  onClick={() => setAddProcessVoiceId(null)}
                                                  className="mt-3 w-full px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                                                >
                                                  Done
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                    );
                                  }

                                  if (columnKey === 'preview') {
                                    return (
                                      <td key={columnKey} className="px-4 py-3">
                                        <button
                                          onClick={() => {
                                            setSelectedVoiceForPreview(voice);
                                            setShowVoicePreviewModal(true);
                                          }}
                                          className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-all"
                                          title="Preview Voice"
                                        >
                                          <Play className="w-4 h-4" />
                                        </button>
                                      </td>
                                    );
                                  }

                                  if (columnKey === 'status') {
                                    return (
                                      <td key={columnKey} className="px-4 py-3">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                          <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={voice.status}
                                            onChange={() => {
                                              setVoiceTableData((prev) =>
                                                prev.map((v) =>
                                                  v.id === voice.id ? { ...v, status: !v.status } : v
                                                )
                                              );
                                            }}
                                          />
                                          <div className="w-11 h-6 bg-switch-background peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-switch-background after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                      </td>
                                    );
                                  }

                                  return null;
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                </div>
              </DndProvider>
            )}

            {/* Numbers Tab */}
            {activeTab === "numbers" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold" style={TEXT_STYLES.heading}>Phone Numbers</h2>
                    <p className="text-sm mt-1" style={TEXT_STYLES.subtext}>Manage country routing and phone numbers</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={resetNumbersColumnOrder}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                      title="Reset column order to default"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Reset columns
                    </button>
                    <Button variant="primary" onClick={() => setShowBuyNumberModal(true)}>
                      <Plus className="w-4 h-4" />
                      Add Number
                    </Button>
                  </div>
                </div>

                {/* Horizontally Scrollable Table with Arrow Buttons */}
                <div className="relative">
                  {/* Scroll Right Button - Semicircle (2 rows height, centered) */}
                  {showNumbersScrollIndicator && (
                    <button
                      className="absolute right-0 flex items-center justify-center z-10 transition-all"
                      style={{
                        top: '50%',
                        transform: 'translateY(-50%)',
                        height: '112px',
                        width: '40px',
                        backgroundColor: 'rgba(255, 255, 255, 0.5)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        borderTopLeftRadius: '9999px',
                        borderBottomLeftRadius: '9999px',
                        borderTopRightRadius: '0',
                        borderBottomRightRadius: '0',
                        opacity: 1
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                        const icon = e.currentTarget.querySelector('svg');
                        if (icon) {
                          (icon as SVGElement).style.transform = 'scale(1.1)';
                        }
                        handleNumbersScrollRightMouseEnter();
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                        e.currentTarget.style.boxShadow = '';
                        const icon = e.currentTarget.querySelector('svg');
                        if (icon) {
                          (icon as SVGElement).style.transform = 'scale(1)';
                        }
                        handleNumbersScrollMouseLeave();
                      }}
                    >
                      <ChevronRight className="w-5 h-5 transition-transform" style={{ color: '#1e293b', opacity: 1 }} />
                    </button>
                  )}

                  {/* Scroll Left Button - Semicircle (2 rows height, centered) */}
                  {showNumbersScrollLeftIndicator && (
                    <button
                      className="absolute left-0 flex items-center justify-center z-10 transition-all"
                      style={{
                        top: '50%',
                        transform: 'translateY(-50%)',
                        height: '112px',
                        width: '40px',
                        backgroundColor: 'rgba(255, 255, 255, 0.5)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        borderTopLeftRadius: '0',
                        borderBottomLeftRadius: '0',
                        borderTopRightRadius: '9999px',
                        borderBottomRightRadius: '9999px',
                        opacity: 1
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                        const icon = e.currentTarget.querySelector('svg');
                        if (icon) {
                          (icon as SVGElement).style.transform = 'scale(1.1)';
                        }
                        handleNumbersScrollLeftMouseEnter();
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                        e.currentTarget.style.boxShadow = '';
                        const icon = e.currentTarget.querySelector('svg');
                        if (icon) {
                          (icon as SVGElement).style.transform = 'scale(1)';
                        }
                        handleNumbersScrollMouseLeave();
                      }}
                    >
                      <ChevronLeft className="w-5 h-5 transition-transform" style={{ color: '#1e293b', opacity: 1 }} />
                    </button>
                  )}

                  <div
                    ref={numbersTableRef}
                    className="bg-white rounded-xl border border-border scrollbar-hide"
                    style={{
                      overflowX: "auto",
                      overflowY: "visible",
                      scrollBehavior: "smooth"
                    }}
                    onScroll={(e) => {
                      const { scrollWidth, clientWidth, scrollLeft } = e.currentTarget;
                      const canScrollRight = scrollLeft < (scrollWidth - clientWidth - 10);
                      const canScrollLeft = scrollLeft > 10;
                      setShowNumbersScrollIndicator(canScrollRight);
                      setShowNumbersScrollLeftIndicator(canScrollLeft);
                    }}
                  >
                    <DndProvider backend={HTML5Backend}>
                      <div style={{ minWidth: "1320px" }}>
                        <table className="w-full">
                          <thead className="bg-muted/30 border-b border-border">
                            <tr>
                              <th style={{ width: "50px" }} className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
                                <SettingsIcon className="w-4 h-4 text-muted-foreground" />
                              </th>
                              {numbersColumnOrder.map((columnKey, index) => (
                                <DraggableNumbersColumnHeader
                                  key={columnKey}
                                  columnKey={columnKey}
                                  index={index}
                                  label={numbersColumnConfig[columnKey].label}
                                  width={numbersColumnConfig[columnKey].width}
                                  moveColumn={moveNumbersColumn}
                                />
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {countryRoutings.map((routing) => {
                              const isEditing = editingRowId === routing.id;
                              const displayData = isEditing ? editingRowData! : routing;

                              const renderCell = (columnKey: string) => {
                                switch (columnKey) {
                                  case 'phoneNumber':
                                    return (
                                      <td key={columnKey} className="px-3 py-3 text-xs font-medium whitespace-nowrap">
                                        <span className={isEditing ? "text-muted-foreground" : ""}>
                                          {routing.phoneNumber}
                                        </span>
                                      </td>
                                    );

                                  case 'country':
                                    return (
                                      <td key={columnKey} className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                        {routing.country}
                                      </td>
                                    );

                                  case 'priority':
                                    return (
                                      <td key={columnKey} className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                        {isEditing ? (
                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={() =>
                                                setEditingRowData({
                                                  ...editingRowData!,
                                                  priority: Math.max(0, editingRowData!.priority - 1),
                                                })
                                              }
                                              className="p-0.5 hover:bg-muted rounded transition-colors"
                                              title="Decrease priority"
                                            >
                                              <Minus className="w-3 h-3" />
                                            </button>
                                            <input
                                              type="number"
                                              value={displayData.priority}
                                              onChange={(e) =>
                                                setEditingRowData({
                                                  ...editingRowData!,
                                                  priority: Math.max(0, parseInt(e.target.value) || 0),
                                                })
                                              }
                                              className="w-16 px-2 py-1 text-xs text-center border border-input rounded bg-input-background"
                                              min="0"
                                            />
                                            <button
                                              onClick={() =>
                                                setEditingRowData({
                                                  ...editingRowData!,
                                                  priority: editingRowData!.priority + 1,
                                                })
                                              }
                                              className="p-0.5 hover:bg-muted rounded transition-colors"
                                              title="Increase priority"
                                            >
                                              <Plus className="w-3 h-3" />
                                            </button>
                                          </div>
                                        ) : (
                                          routing.priority
                                        )}
                                      </td>
                                    );

                                  case 'countriesServed':
                                    return (
                                      <td key={columnKey} className="px-3 py-3 text-xs text-muted-foreground">
                                        {isEditing ? (
                                          <div className="relative">
                                            <button
                                              type="button"
                                              onClick={() => setShowEditCountriesDropdown(!showEditCountriesDropdown)}
                                              className="w-full px-2 py-1 text-xs border border-input rounded bg-input-background text-left flex items-center justify-between"
                                            >
                                              <span className="truncate">
                                                {displayData.countriesServed.length > 0
                                                  ? displayData.countriesServed.join(', ')
                                                  : "Select countries"}
                                              </span>
                                              <ChevronDown className="w-3 h-3 flex-shrink-0" />
                                            </button>
                                            {showEditCountriesDropdown && (
                                              <>
                                                <div
                                                  className="fixed inset-0 z-10"
                                                  onClick={() => setShowEditCountriesDropdown(false)}
                                                />
                                                <div className="absolute top-full left-0 mt-1 w-full min-w-[200px] bg-white border border-border rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                                                  {allCountriesList.map((country) => (
                                                    <label
                                                      key={country}
                                                      className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer text-xs"
                                                    >
                                                      <input
                                                        type="checkbox"
                                                        checked={displayData.countriesServed.includes(country)}
                                                        onChange={(e) => {
                                                          let newCountries;
                                                          if (country === "All") {
                                                            newCountries = e.target.checked ? ["All"] : [];
                                                          } else {
                                                            newCountries = e.target.checked
                                                              ? [...displayData.countriesServed.filter(c => c !== "All"), country]
                                                              : displayData.countriesServed.filter((c) => c !== country);
                                                          }
                                                          setEditingRowData({
                                                            ...editingRowData!,
                                                            countriesServed: newCountries,
                                                          });
                                                        }}
                                                        className="w-3.5 h-3.5"
                                                      />
                                                      <span>{country}</span>
                                                    </label>
                                                  ))}
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="truncate">{routing.countriesServed.join(', ')}</span>
                                        )}
                                      </td>
                                    );

                                  case 'process':
                                    return (
                                      <td key={columnKey} className="px-3 py-3">
                                        {isEditing ? (
                                          <div className="relative">
                                            <button
                                              type="button"
                                              onClick={() => setShowEditProcessDropdown(!showEditProcessDropdown)}
                                              className="w-full px-2 py-1 text-xs border border-input rounded bg-input-background text-left flex items-center justify-between"
                                            >
                                              <span className="truncate">
                                                {displayData.processes.length > 0
                                                  ? `${displayData.processes.length} selected`
                                                  : "Select processes"}
                                              </span>
                                              <ChevronDown className="w-3 h-3 flex-shrink-0" />
                                            </button>
                                            {showEditProcessDropdown && (
                                              <>
                                                <div
                                                  className="fixed inset-0 z-10"
                                                  onClick={() => setShowEditProcessDropdown(false)}
                                                />
                                                <div className="absolute top-full left-0 mt-1 w-full min-w-[200px] bg-white border border-border rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                                                  {availableProcesses.map((process) => (
                                                    <label
                                                      key={process.id}
                                                      className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer text-xs"
                                                    >
                                                      <input
                                                        type="checkbox"
                                                        checked={displayData.processes.includes(process.label)}
                                                        onChange={(e) => {
                                                          const newProcesses = e.target.checked
                                                            ? [...displayData.processes, process.label]
                                                            : displayData.processes.filter((p) => p !== process.label);
                                                          setEditingRowData({
                                                            ...editingRowData!,
                                                            processes: newProcesses,
                                                          });
                                                        }}
                                                        className="w-3.5 h-3.5"
                                                      />
                                                      <span>{process.label}</span>
                                                    </label>
                                                  ))}
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="flex flex-wrap gap-1">
                                            {routing.processes.length > 0 ? (
                                              routing.processes.map((process) => (
                                                <span
                                                  key={process}
                                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary whitespace-nowrap"
                                                >
                                                  {process}
                                                </span>
                                              ))
                                            ) : (
                                              <span className="text-[10px] text-muted-foreground">No processes</span>
                                            )}
                                          </div>
                                        )}
                                      </td>
                                    );

                                  case 'provider':
                                    return (
                                      <td key={columnKey} className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                        {routing.provider}
                                      </td>
                                    );

                                  case 'inboundOutbound':
                                    return (
                                      <td key={columnKey} className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                        {isEditing ? (
                                          <select
                                            value={displayData.inboundOutbound}
                                            onChange={(e) =>
                                              setEditingRowData({
                                                ...editingRowData!,
                                                inboundOutbound: e.target.value as "Inbound" | "Outbound" | "Both",
                                              })
                                            }
                                            className="w-full px-2 py-1 text-xs border border-input rounded bg-input-background"
                                          >
                                            <option value="Inbound">Inbound</option>
                                            <option value="Outbound">Outbound</option>
                                            <option value="Both">Both</option>
                                          </select>
                                        ) : (
                                          routing.inboundOutbound
                                        )}
                                      </td>
                                    );

                                  case 'status':
                                    return (
                                      <td key={columnKey} className="px-3 py-3">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                          <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={displayData.status}
                                            onChange={() => {
                                              if (isEditing) {
                                                setEditingRowData({ ...editingRowData!, status: !editingRowData!.status });
                                              } else {
                                                setCountryRoutings((prev) =>
                                                  prev.map((r) => (r.id === routing.id ? { ...r, status: !r.status } : r))
                                                );
                                              }
                                            }}
                                          />
                                          <div className="w-9 h-5 bg-switch-background peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-switch-background after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                      </td>
                                    );

                                  case 'verified':
                                    return (
                                      <td key={columnKey} className="px-3 py-3">
                                        {routing.country === "United States" ? (
                                          <div className="flex items-center justify-start">
                                            <div
                                              className="inline-flex items-center justify-center"
                                              style={{
                                                backgroundColor: "#22C55E",
                                                color: "#FFFFFF",
                                                width: "24px",
                                                height: "24px",
                                                borderRadius: "50%",
                                              }}
                                            >
                                              <Check className="w-3.5 h-3.5" />
                                            </div>
                                          </div>
                                        ) : (
                                          <span className="text-xs text-muted-foreground">—</span>
                                        )}
                                      </td>
                                    );

                                  default:
                                    return null;
                                }
                              };

                              return (
                                <tr key={routing.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                                  {/* 3-Dot Menu */}
                                  <td className="px-3 py-3">
                                    <div className="relative">
                                      <button
                                        onClick={() => setOpenActionsMenuId(openActionsMenuId === routing.id ? null : routing.id)}
                                        className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-all"
                                        title="Actions"
                                      >
                                        <MoreVertical className="w-4 h-4" />
                                      </button>
                                      {openActionsMenuId === routing.id && (
                                        <>
                                          <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setOpenActionsMenuId(null)}
                                          />
                                          <div className="absolute left-0 top-full mt-1 w-40 bg-white border border-border rounded-lg shadow-lg z-20 py-1">
                                            {routing.country === "United States" ? (
                                              <button
                                                onClick={() => {
                                                  setSelectedVerifyNumber(routing);
                                                  setShowVerifyNumberModal(true);
                                                  setOpenActionsMenuId(null);
                                                }}
                                                className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50 transition-colors flex items-center gap-2"
                                              >
                                                <ShieldCheck className="w-3.5 h-3.5" />
                                                Verify
                                              </button>
                                            ) : (
                                              <Tooltip text="Verification only available for US numbers">
                                                <button
                                                  disabled
                                                  className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 opacity-50 cursor-not-allowed"
                                                >
                                                  <ShieldCheck className="w-3.5 h-3.5" />
                                                  Verify
                                                </button>
                                              </Tooltip>
                                            )}
                                            <button
                                              onClick={() => {
                                                setEditingRowId(routing.id);
                                                setEditingRowData({ ...routing });
                                                setShowEditProcessDropdown(false);
                                                setOpenActionsMenuId(null);
                                              }}
                                              className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50 transition-colors flex items-center gap-2"
                                            >
                                              <Edit className="w-3.5 h-3.5" />
                                              Edit
                                            </button>
                                            <button
                                              onClick={() => {
                                                handleDeleteRouting(routing.id);
                                                setOpenActionsMenuId(null);
                                              }}
                                              className="w-full text-left px-3 py-2 text-xs hover:bg-destructive/10 text-destructive transition-colors flex items-center gap-2"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                              Delete
                                            </button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </td>

                                  {/* Dynamic Columns based on numbersColumnOrder */}
                                  {numbersColumnOrder.map((columnKey) => renderCell(columnKey))}

                                  {/* Save/Cancel buttons for edit mode */}
                                  {isEditing && (
                                    <td className="px-3 py-3">
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={handleSaveEditedRow}
                                          className="p-1.5 text-white bg-primary hover:bg-primary/90 rounded-lg transition-all"
                                          title="Save changes"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={handleCancelEdit}
                                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                                          title="Cancel"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  )}

                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </DndProvider>
                  </div>
                </div>

              </div>
            )}

            {/* Custom Fields Tab */}
            {activeTab === "custom-fields" && (
              <div className="space-y-6">
                {/* Page Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-[32px] font-bold text-[#111827] leading-tight">Custom Fields</h1>
                    <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                      Manage custom data structures for clients and call interactions.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddFieldModal(true)}
                    className="px-5 py-2.5 bg-[#111827] text-white rounded-full text-sm font-medium hover:bg-[#1f2937] transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Field
                  </button>
                </div>

                {/* Tab Switcher */}
                <div className="inline-flex items-center gap-1 p-1 bg-[#F3F4F6] rounded-full">
                  <button
                    onClick={() => setCustomFieldsTab("clients")}
                    className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${customFieldsTab === "clients"
                      ? "bg-white shadow-sm text-[#111827]"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    Clients
                  </button>
                  <button
                    onClick={() => setCustomFieldsTab("call-logs")}
                    className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${customFieldsTab === "call-logs"
                      ? "bg-white shadow-sm text-[#111827]"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    Call Logs
                  </button>
                  <button
                    onClick={() => setCustomFieldsTab("processes")}
                    className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${customFieldsTab === "processes"
                      ? "bg-white shadow-sm text-[#111827]"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    Processes
                  </button>
                  <button
                    onClick={() => setCustomFieldsTab("appointments")}
                    className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${customFieldsTab === "appointments"
                      ? "bg-white shadow-sm text-[#111827]"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    Appointments
                  </button>
                  <button
                    onClick={() => setCustomFieldsTab("forms")}
                    className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${customFieldsTab === "forms"
                      ? "bg-white shadow-sm text-[#111827]"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    Forms
                  </button>
                  <button
                    onClick={() => setCustomFieldsTab("team")}
                    className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${customFieldsTab === "team"
                      ? "bg-white shadow-sm text-[#111827]"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    Team
                  </button>
                </div>

                {/* Table Card */}
                <div className="bg-white rounded-xl border border-border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-[#F8F9FA]">
                      <tr>
                        <th className="text-left px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Label</th>
                        <th className="text-left px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                        <th className="text-right px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const currentFields = getCustomFields(currentModule);

                        return currentFields.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-6 py-12 text-center">
                              <p className="text-sm text-muted-foreground">No custom fields yet</p>
                              <p className="text-xs text-muted-foreground mt-1">Add custom fields to capture additional information</p>
                              <button
                                onClick={() => setShowAddFieldModal(true)}
                                className="mt-4 px-5 py-2.5 bg-[#111827] text-white rounded-full text-sm font-medium hover:bg-[#1f2937] transition-colors inline-flex items-center gap-2"
                              >
                                <Plus className="w-4 h-4" />
                                Add Field
                              </button>
                            </td>
                          </tr>
                        ) : (
                          currentFields.map((field) => (
                            <tr key={field.id} className="border-b border-[#F0F0F0] last:border-0">
                              <td className="px-6 py-4 text-sm font-semibold text-[#111827]">{field.label}</td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                  {FIELD_TYPE_REVERSE_MAP[field.inputType] || field.inputType.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-3">
                                  <button
                                    onClick={() => {
                                      setEditingFieldId(field.id);
                                      setEditingFieldData({
                                        label: field.label,
                                        type: FIELD_TYPE_REVERSE_MAP[field.inputType] || "String"
                                      });
                                    }}
                                    className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                    title="Edit field"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to delete custom field "${field.label}"?`)) {
                                        deleteCustomField(currentModule, field.id);
                                        toast.success("Field deleted successfully");
                                      }
                                    }}
                                    className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                                    title="Delete field"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}




            {/* Audit Logs Tab */}

            {activeTab === "audit-logs" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold" style={TEXT_STYLES.heading}>
                      Audit Logs <span className="text-sm font-normal" style={TEXT_STYLES.subtext}>({auditLogs.length} on this page)</span>
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => { }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                      Filters
                    </Button>
                    <Button variant="outline" onClick={() => toast.success("Audit logs refreshed")}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </Button>
                    <Button variant="outline" onClick={() => toast.success("Exporting audit logs...")}>
                      Export
                    </Button>
                  </div>
                </div>

                {/* Audit Logs Table */}
                <div className="bg-white rounded-xl border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/30 border-b border-border">
                        <tr>
                          <th className="text-left px-6 py-3 text-sm font-medium" style={TEXT_STYLES.subtext}>Time</th>
                          <th className="text-left px-6 py-3 text-sm font-medium" style={TEXT_STYLES.subtext}>Event</th>
                          <th className="text-left px-6 py-3 text-sm font-medium" style={TEXT_STYLES.subtext}>Method</th>
                          <th className="text-left px-6 py-3 text-sm font-medium" style={TEXT_STYLES.subtext}>User</th>
                          <th className="text-left px-6 py-3 text-sm font-medium" style={TEXT_STYLES.subtext}>Agent</th>
                          <th className="text-left px-6 py-3 text-sm font-medium" style={TEXT_STYLES.subtext}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                            <td className="px-6 py-4">
                              <p className="text-sm" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>{log.time}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm font-medium" style={TEXT_STYLES.heading}>{log.event}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm" style={TEXT_STYLES.subtext}>{log.method}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>{log.user}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>{log.agent}</p>
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => {
                                  setSelectedAuditLog(log);
                                  setShowRequestBodyModal(true);
                                }}
                                className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
                                style={{ fontFamily: 'Outfit, sans-serif' }}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between">
                  <Button variant="outline" disabled onClick={() => setAuditLogPage(auditLogPage - 1)}>
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    Previous
                  </Button>
                  <p className="text-sm" style={TEXT_STYLES.subtext}>Page {auditLogPage}</p>
                  <Button variant="outline" onClick={() => setAuditLogPage(auditLogPage + 1)}>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <PageHeader
                  title="Security"
                  subtitle="Configure security and spam protection settings."
                />

                {/* Robo Call Detection Section */}
                <div className="bg-white rounded-xl border border-border overflow-hidden">
                  <div
                    className="flex items-center justify-between p-4 hover:bg-muted/10 cursor-pointer transition-colors"
                    onClick={() => {
                      if (roboCallDetectionExpanded) {
                        setRoboCallDetectionExpanded(false);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <PhoneOff className="w-5 h-5 text-primary" />
                      <span className="text-sm font-bold" style={{ fontFamily: 'DM Sans, sans-serif' }}>Robo Call Detection</span>
                      <Tooltip text="Automatically detect and filter robocalls before they reach your system.">
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </Tooltip>
                    </div>
                    <div className="flex items-center gap-3">
                      {roboCallDetectionEnabled ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">On</span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-500">Off</span>
                      )}
                      <div onClick={(e) => e.stopPropagation()}>
                        <Switch checked={roboCallDetectionEnabled} onCheckedChange={setRoboCallDetectionEnabled} />
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-muted-foreground transition-transform cursor-pointer ${roboCallDetectionExpanded ? "rotate-180" : ""
                          }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRoboCallDetectionExpanded(!roboCallDetectionExpanded);
                        }}
                      />
                    </div>
                  </div>

                  {roboCallDetectionExpanded && (
                    <div className="border-t border-border p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold" style={{ fontFamily: 'DM Sans, sans-serif' }}>Enable Robo Call Detection</div>
                          <div className="text-sm text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>Automatically detect and filter robocalls</div>
                        </div>
                        <Switch checked={roboCallDetectionEnabled} onCheckedChange={setRoboCallDetectionEnabled} />
                      </div>

                      <div className="flex justify-end">
                        <Button
                          className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-4 py-2 text-sm"
                          onClick={() => toast.success("Robo Call Detection settings saved")}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Blocked Numbers Section */}
                <div className="bg-white rounded-xl border border-border overflow-hidden">
                  <div
                    className="flex items-center justify-between p-4 hover:bg-muted/10 cursor-pointer transition-colors"
                    onClick={() => {
                      if (blockedNumbersExpanded) {
                        setBlockedNumbersExpanded(false);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Ban className="w-5 h-5 text-primary" />
                      <span className="text-sm font-bold" style={{ fontFamily: 'DM Sans, sans-serif' }}>Blocked Numbers</span>
                      <Tooltip text="Block specific phone numbers from contacting your system.">
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </Tooltip>
                    </div>
                    <div className="flex items-center gap-3">
                      {blockedNumbersCount > 0 && (
                        <span className="flex items-center justify-center w-6 h-6 text-xs rounded-full bg-orange-500 text-white">
                          {blockedNumbersCount}
                        </span>
                      )}
                      <ChevronDown
                        className={`w-5 h-5 text-muted-foreground transition-transform cursor-pointer ${blockedNumbersExpanded ? "rotate-180" : ""
                          }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setBlockedNumbersExpanded(!blockedNumbersExpanded);
                        }}
                      />
                    </div>
                  </div>

                  {blockedNumbersExpanded && (
                    <div className="border-t border-border p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold" style={{ fontFamily: 'DM Sans, sans-serif' }}>Blocked Phone Numbers</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSecurityBlockedNumbers([
                              ...securityBlockedNumbers,
                              { id: Date.now(), countryCode: "+1", phoneNumber: "" }
                            ]);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Number
                        </Button>
                      </div>

                      {securityBlockedNumbers.map((item) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <select
                            value={item.countryCode}
                            onChange={(e) => {
                              setSecurityBlockedNumbers(securityBlockedNumbers.map(n =>
                                n.id === item.id ? { ...n, countryCode: e.target.value } : n
                              ));
                            }}
                            className="px-3 py-2 bg-input-background border border-input rounded-lg text-sm"
                          >
                            <option value="+1">+1</option>
                            <option value="+44">+44</option>
                            <option value="+91">+91</option>
                            <option value="+61">+61</option>
                            <option value="+81">+81</option>
                          </select>
                          <Input
                            type="tel"
                            value={item.phoneNumber}
                            onChange={(e) => {
                              setSecurityBlockedNumbers(securityBlockedNumbers.map(n =>
                                n.id === item.id ? { ...n, phoneNumber: e.target.value } : n
                              ));
                            }}
                            placeholder="Phone number"
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSecurityBlockedNumbers(securityBlockedNumbers.filter(n => n.id !== item.id));
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}

                      <div className="flex justify-end">
                        <Button
                          className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-4 py-2 text-sm"
                          onClick={() => toast.success("Blocked numbers saved")}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bot Block Phrases Section */}
                <div className="bg-white rounded-xl border border-border overflow-hidden">
                  <div
                    className="flex items-center justify-between p-4 hover:bg-muted/10 cursor-pointer transition-colors"
                    onClick={() => {
                      if (botBlockPhrasesExpanded) {
                        setBotBlockPhrasesExpanded(false);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-primary" />
                      <span className="text-sm font-bold" style={{ fontFamily: 'DM Sans, sans-serif' }}>Bot Block Phrases</span>
                      <Tooltip text="Define phrases that identify and block bot callers automatically.">
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </Tooltip>
                    </div>
                    <div className="flex items-center gap-3">
                      <div onClick={(e) => e.stopPropagation()}>
                        <Switch checked={botBlockPhrasesEnabled} onCheckedChange={setBotBlockPhrasesEnabled} />
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-muted-foreground transition-transform cursor-pointer ${botBlockPhrasesExpanded ? "rotate-180" : ""
                          }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setBotBlockPhrasesExpanded(!botBlockPhrasesExpanded);
                        }}
                      />
                    </div>
                  </div>

                  {botBlockPhrasesExpanded && (
                    <div className="border-t border-border p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold" style={{ fontFamily: 'DM Sans, sans-serif' }}>Block Phrases</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setBotBlockPhrases([
                              ...botBlockPhrases,
                              { id: Date.now(), phrase: "", enabled: true }
                            ]);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Phrase
                        </Button>
                      </div>

                      {botBlockPhrases.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                          <Input
                            value={item.phrase}
                            onChange={(e) => {
                              setBotBlockPhrases(botBlockPhrases.map(p =>
                                p.id === item.id ? { ...p, phrase: e.target.value } : p
                              ));
                            }}
                            placeholder="Enter phrase to block"
                            className="flex-1"
                          />
                          <Switch
                            checked={item.enabled}
                            onCheckedChange={(checked) => {
                              setBotBlockPhrases(botBlockPhrases.map(p =>
                                p.id === item.id ? { ...p, enabled: checked } : p
                              ));
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setBotBlockPhrases(botBlockPhrases.filter(p => p.id !== item.id));
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}

                      <div className="flex justify-end">
                        <Button
                          className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-4 py-2 text-sm"
                          onClick={() => toast.success("Bot Block Phrases saved")}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Integrations Tab */}
            {activeTab === "integrations" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">Integrations</h2>
                    <p className="text-sm text-muted-foreground mt-1">Connect your tools to sync data and automate workflows</p>
                  </div>
                </div>

                {/* Integration Category Tabs */}
                <div className="border-b border-border">
                  <div className="flex gap-6">
                    <button
                      onClick={() => setIntegrationTab("ehr")}
                      className={`pb-3 px-1 border-b-2 transition-colors ${integrationTab === "ehr"
                        ? "border-primary text-primary font-medium"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      EHR
                    </button>
                    <button
                      onClick={() => setIntegrationTab("crm")}
                      className={`pb-3 px-1 border-b-2 transition-colors ${integrationTab === "crm"
                        ? "border-primary text-primary font-medium"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      CRM / Data Source
                    </button>
                    <button
                      onClick={() => setIntegrationTab("telephony")}
                      className={`pb-3 px-1 border-b-2 transition-colors ${integrationTab === "telephony"
                        ? "border-primary text-primary font-medium"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      Telephony
                    </button>
                    <button
                      onClick={() => setIntegrationTab("mailbox")}
                      className={`pb-3 px-1 border-b-2 transition-colors ${integrationTab === "mailbox"
                        ? "border-primary text-primary font-medium"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      Mailbox
                    </button>
                    <button
                      onClick={() => setIntegrationTab("sms")}
                      className={`pb-3 px-1 border-b-2 transition-colors ${integrationTab === "sms"
                        ? "border-primary text-primary font-medium"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      SMS
                    </button>
                    <button
                      onClick={() => setIntegrationTab("marketing")}
                      className={`pb-3 px-1 border-b-2 transition-colors ${integrationTab === "marketing"
                        ? "border-primary text-primary font-medium"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      Marketing
                    </button>
                  </div>
                </div>

                {/* Integration Cards */}
                {integrationTab === "telephony" ? (
                  <TelephonyIntegrationPanel />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {integrations
                      .filter((integration) => integration.category === integrationTab)
                      .map((integration) => (
                        <div
                          key={integration.id}
                          className="flex items-center justify-between p-5 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            {/* Provider Logo */}
                            {integration.id === "gmail" && (
                              <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-white border border-border flex items-center justify-center shadow-sm">
                                <svg viewBox="0 0 48 48" className="w-6 h-6">
                                  <path fill="#EA4335" d="M24 20.3L6 8H42L24 20.3Z" />
                                  <path fill="#34A853" d="M42 8V40H30V27.7L24 31.7L18 27.7V40H6V8L24 20.3L42 8Z" opacity="0" />
                                  <path fill="#4285F4" d="M6 8L24 20.3L42 8H6Z" />
                                  <path fill="#FBBC05" d="M6 8V40H18V27.7L24 31.7L30 27.7V40H42V8L24 20.3L6 8Z" />
                                  <path fill="#EA4335" d="M6 40V8L18 16V27.7L6 40Z" />
                                  <path fill="#34A853" d="M42 40V8L30 16V27.7L42 40Z" />
                                  <path fill="#4285F4" d="M18 16L6 8H18V16Z" opacity="0" />
                                  <path fill="#FBBC05" d="M30 16L42 8H30V16Z" opacity="0" />
                                  <g>
                                    <path fill="#EA4335" d="M6 8v32h12V27.7L6 8z" />
                                    <path fill="#34A853" d="M42 8v32H30V27.7L42 8z" />
                                    <path fill="#4285F4" d="M6 8l18 12.3L42 8H6z" />
                                    <path fill="#FBBC05" d="M18 27.7V40h12V27.7L24 31.7l-6-4z" />
                                  </g>
                                </svg>
                              </div>
                            )}
                            {integration.id === "outlook" && (
                              <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-white border border-border flex items-center justify-center shadow-sm">
                                <svg viewBox="0 0 48 48" className="w-6 h-6">
                                  <path fill="#0078D4" d="M28 6h14v8H28z" />
                                  <path fill="#0078D4" d="M28 16h14v8H28z" />
                                  <path fill="#0078D4" d="M28 26h14v8H28z" />
                                  <path fill="#0078D4" d="M28 36h14v8H28z" />
                                  <path fill="#0078D4" d="M6 12h20v26a2 2 0 01-2 2H8a2 2 0 01-2-2V12z" />
                                  <circle cx="16" cy="25" r="7" fill="#fff" />
                                  <ellipse cx="16" cy="25" rx="5" ry="6" fill="#fff" />
                                  <path fill="#0078D4" d="M6 12h20v5H6z" />
                                  <rect x="6" y="12" width="20" height="5" fill="#106EBE" />
                                  <ellipse cx="16" cy="26" rx="5" ry="6" fill="white" />
                                </svg>
                              </div>
                            )}
                            {integration.id === "twilio-sms" && (
                              <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-[#F22F46] flex items-center justify-center shadow-sm">
                                <svg viewBox="0 0 48 48" className="w-6 h-6" fill="white">
                                  <circle cx="24" cy="24" r="18" fill="none" stroke="white" strokeWidth="4" />
                                  <circle cx="17" cy="17" r="3" fill="white" />
                                  <circle cx="31" cy="17" r="3" fill="white" />
                                  <circle cx="17" cy="31" r="3" fill="white" />
                                  <circle cx="31" cy="31" r="3" fill="white" />
                                </svg>
                              </div>
                            )}
                            {integration.id === "meta-leads" && (
                              <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-[#1877F2] flex items-center justify-center shadow-sm">
                                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white">
                                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                </svg>
                              </div>
                            )}
                            {integration.id === "whatsapp-business" && (
                              <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-[#25D366] flex items-center justify-center shadow-sm">
                                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 00-5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                              </div>
                            )}
                            <div>
                              <h3 className="font-semibold text-base">{integration.name}</h3>
                              <p className="text-sm text-muted-foreground mt-1">{integration.description}</p>
                              <div className="mt-2">
                                {integration.connected ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary">
                                    Connected
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                    Not Connected
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            {integration.category === "mailbox" ? (
                              integration.connected ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedMailboxProvider(integration.id as "gmail" | "outlook");
                                    setShowMailboxModal(true);
                                  }}
                                >
                                  Manage
                                </Button>
                              ) : (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedMailboxProvider(integration.id as "gmail" | "outlook");
                                    setShowMailboxModal(true);
                                  }}
                                >
                                  Authentication
                                </Button>
                              )
                            ) : integration.category === "sms" ? (
                              integration.connected ? (
                                <Button variant="outline" size="sm">Manage</Button>
                              ) : (
                                <Button variant="primary" size="sm" onClick={() => setShowSMSModal(true)}>
                                  Connect
                                </Button>
                              )
                            ) : integration.category === "marketing" ? (
                              integration.connected ? (
                                <Button variant="outline" size="sm" onClick={() => handleManageIntegration(integration)}>
                                  Manage
                                </Button>
                              ) : (
                                <Button variant="primary" size="sm" onClick={() => handleConnectIntegration(integration)}>
                                  <LinkIcon className="w-4 h-4" />
                                  Connect
                                </Button>
                              )
                            ) : integration.connected ? (
                              <Button variant="outline" size="sm" onClick={() => handleManageIntegration(integration)}>
                                Manage
                              </Button>
                            ) : (
                              <Button variant="primary" size="sm" onClick={() => handleConnectIntegration(integration)}>
                                <LinkIcon className="w-4 h-4" />
                                Connect
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Edit Organization Modal */}
        <Modal
          isOpen={showEditOrgModal}
          onClose={() => {
            setShowEditOrgModal(false);
            setShowMoreSettings(false);
          }}
          title="Edit Organization"
          maxWidth="lg"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditOrgModal(false);
                  setShowMoreSettings(false);
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveOrganization}>
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </>
          }
        >
          <div className="space-y-6">
            {/* Basic Fields */}
            <div className="space-y-4">
              <Input
                label="Organization Name"
                value={editOrgData.name}
                onChange={(e) => setEditOrgData({ ...editOrgData, name: e.target.value })}
                placeholder="Enter organization name"
                required
              />

              <div>
                <label className="block text-sm font-medium mb-2">
                  Industry <span className="text-destructive">*</span>
                </label>
                <select
                  value={editOrgData.industry}
                  onChange={(e) => setEditOrgData({ ...editOrgData, industry: e.target.value })}
                  className="w-full px-4 py-2 bg-input-background border border-input rounded-xl"
                >
                  {industries.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Email"
                type="email"
                value={editOrgData.email}
                onChange={(e) => setEditOrgData({ ...editOrgData, email: e.target.value })}
                placeholder="email@example.com"
                required
              />

              <div>
                <label className="block text-sm font-medium mb-2">
                  Phone <span className="text-destructive">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={`${editOrgData.countryFlag} ${editOrgData.countryName} (${editOrgData.countryCode})`}
                    onChange={(e) => {
                      const selectedCountry = countries.find(
                        (c) => `${c.flag} ${c.name} (${c.code})` === e.target.value
                      );
                      if (selectedCountry) {
                        setEditOrgData({
                          ...editOrgData,
                          countryCode: selectedCountry.code,
                          countryFlag: selectedCountry.flag,
                          countryName: selectedCountry.name,
                        });
                      }
                    }}
                    className="w-52 px-3 py-2 bg-input-background border border-input rounded-xl text-sm"
                  >
                    {countries.map((country) => (
                      <option key={country.code + country.name} value={`${country.flag} ${country.name} (${country.code})`}>
                        {country.flag} {country.name} ({country.code})
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={editOrgData.phone}
                    onChange={(e) => setEditOrgData({ ...editOrgData, phone: e.target.value.replace(/\D/g, "") })}
                    placeholder="Phone number"
                    className="flex-1 px-4 py-2 bg-input-background border border-input rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* More Settings Toggle */}
            <div className="pt-4 border-t border-border">
              <button
                onClick={() => setShowMoreSettings(!showMoreSettings)}
                className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {showMoreSettings ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                {showMoreSettings ? "Hide" : "Show"} More Settings
              </button>
            </div>

            {/* Advanced Fields */}
            {showMoreSettings && (
              <div className="space-y-6 pt-4">
                {/* Other Info */}
                <div className="bg-muted/30 rounded-xl p-6 border border-border space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground pb-3 border-b border-border">OTHER INFO</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <span className="flex items-center gap-1.5">
                          Preferred Calling Time
                          <Tooltip text="This is the default time when AI calls will be scheduled if no specific time is provided.">
                            <Info className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                          </Tooltip>
                        </span>
                      </label>
                      <input
                        type="time"
                        value={editOrgData.preferredCallingTime}
                        readOnly
                        className="w-full px-4 py-2 bg-muted border border-input rounded-xl cursor-not-allowed opacity-60"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Timezone</label>
                      <select
                        value={editOrgData.timezone}
                        onChange={(e) => setEditOrgData({ ...editOrgData, timezone: e.target.value })}
                        className="w-full px-4 py-2 bg-input-background border border-input rounded-xl"
                      >
                        {timezones.map((tz) => (
                          <option key={tz} value={tz}>
                            {tz}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Website</label>
                      <input
                        type="url"
                        value={editOrgData.website}
                        onChange={(e) => setEditOrgData({ ...editOrgData, website: e.target.value })}
                        placeholder="https://example.com"
                        className="w-full px-4 py-2 bg-input-background border border-input rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Default Calling Country</label>
                      <select
                        value={editOrgData.defaultCallingCountry}
                        onChange={(e) => setEditOrgData({ ...editOrgData, defaultCallingCountry: e.target.value })}
                        className="w-full px-4 py-2 bg-input-background border border-input rounded-xl"
                      >
                        {countries.map((country) => (
                          <option key={country.name} value={country.name}>
                            {country.flag} {country.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Billing Info */}
                <div className="bg-muted/30 rounded-xl p-6 border border-border space-y-4">
                  <h3 className="font-semibold text-sm pb-3 border-b border-border" style={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>BILLING INFO</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2">Address</label>
                      <textarea
                        value={editOrgData.address}
                        onChange={(e) => setEditOrgData({ ...editOrgData, address: e.target.value })}
                        placeholder="Enter organization address"
                        className="w-full px-4 py-3 bg-input-background border border-input rounded-xl resize-none h-24"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Billing Contact Name</label>
                      <input
                        type="text"
                        value={editOrgData.billingContactName}
                        onChange={(e) => setEditOrgData({ ...editOrgData, billingContactName: e.target.value })}
                        placeholder="Enter billing contact name"
                        className="w-full px-4 py-2 bg-input-background border border-input rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Billing Contact Email</label>
                      <input
                        type="email"
                        value={editOrgData.billingContactEmail}
                        onChange={(e) => setEditOrgData({ ...editOrgData, billingContactEmail: e.target.value })}
                        placeholder="billing@example.com"
                        className="w-full px-4 py-2 bg-input-background border border-input rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Dashboard Translation */}
                <div className="bg-muted/30 rounded-xl p-6 border border-border space-y-4">
                  <h3 className="font-semibold text-sm pb-3 border-b border-border" style={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>DASHBOARD TRANSLATION</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Language</label>
                      <select
                        value={editOrgData.language}
                        onChange={(e) => setEditOrgData({ ...editOrgData, language: e.target.value })}
                        className="w-full px-4 py-2 bg-input-background border border-input rounded-xl"
                      >
                        <option value="English">English</option>
                        <option value="Spanish">Spanish</option>
                        <option value="French">French</option>
                        <option value="German">German</option>
                        <option value="Italian">Italian</option>
                        <option value="Portuguese">Portuguese</option>
                        <option value="Russian">Russian</option>
                        <option value="Chinese (Simplified)">Chinese (Simplified)</option>
                        <option value="Japanese">Japanese</option>
                        <option value="Korean">Korean</option>
                        <option value="Arabic">Arabic</option>
                        <option value="Hindi">Hindi</option>
                      </select>
                    </div>
                    <Button variant="outline" onClick={() => setEditOrgData({ ...editOrgData, language: "English" })}>
                      Reset to English
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>

        {/* Edit Business Profile Modal */}
        <Modal
          isOpen={showEditBusinessModal}
          onClose={() => setShowEditBusinessModal(false)}
          title="Edit Business Profile"
          maxWidth="lg"
          footer={
            <>
              <Button variant="outline" onClick={() => setShowEditBusinessModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => {
                if (!editBusinessData.businessName || !editBusinessData.businessType || !editBusinessData.businessIndustry ||
                  !editBusinessData.businessRegion || !editBusinessData.registrationIdType || !editBusinessData.registrationNumber ||
                  !editBusinessData.websiteUrl) {
                  toast.error("Please fill in all required fields");
                  return;
                }
                setBusinessProfile({ ...editBusinessData });
                setShowEditBusinessModal(false);
                toast.success("Business profile updated successfully");
              }}>
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </>
          }
        >
          <div className="space-y-6">
            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm mb-1" style={TEXT_STYLES.heading}>US numbers only</h4>
                  <p className="text-sm" style={TEXT_STYLES.subtext}>
                    Business Verification, Spam Tag Prevention (Shaken/STIR), and Named Number (CNAM) are only applicable for US phone numbers.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Business Name */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Business Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={editBusinessData.businessName}
                  onChange={(e) => setEditBusinessData({ ...editBusinessData, businessName: e.target.value })}
                  placeholder="Enter business name"
                  className="w-full px-4 py-2 bg-input-background border border-input rounded-xl"
                />
              </div>

              {/* Business Type */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Business Type <span className="text-destructive">*</span>
                </label>
                <select
                  value={editBusinessData.businessType}
                  onChange={(e) => setEditBusinessData({ ...editBusinessData, businessType: e.target.value })}
                  className="w-full px-4 py-2 bg-input-background border border-input rounded-xl"
                >
                  <option value="">Select business type</option>
                  <option value="Corporation">Corporation</option>
                  <option value="LLC">LLC</option>
                  <option value="Partnership">Partnership</option>
                  <option value="Sole Proprietorship">Sole Proprietorship</option>
                  <option value="Non-Profit">Non-Profit</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Business Industry */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Business Industry <span className="text-destructive">*</span>
                </label>
                <select
                  value={editBusinessData.businessIndustry}
                  onChange={(e) => setEditBusinessData({ ...editBusinessData, businessIndustry: e.target.value })}
                  className="w-full px-4 py-2 bg-input-background border border-input rounded-xl"
                >
                  <option value="">Select business industry</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Technology">Technology</option>
                  <option value="Finance">Finance</option>
                  <option value="Retail">Retail</option>
                  <option value="Education">Education</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="Hospitality">Hospitality</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Business Regions of Operations */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Business Regions of Operations <span className="text-destructive">*</span>
                </label>
                <select
                  value={editBusinessData.businessRegion}
                  onChange={(e) => setEditBusinessData({ ...editBusinessData, businessRegion: e.target.value })}
                  className="w-full px-4 py-2 bg-input-background border border-input rounded-xl"
                >
                  <option value="">Select region</option>
                  <option value="National">National</option>
                  <option value="Northeast">Northeast</option>
                  <option value="Southeast">Southeast</option>
                  <option value="Midwest">Midwest</option>
                  <option value="Southwest">Southwest</option>
                  <option value="West">West</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Business Registration ID Type */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Business Registration ID Type <span className="text-destructive">*</span>
                </label>
                <select
                  value={editBusinessData.registrationIdType}
                  onChange={(e) => setEditBusinessData({ ...editBusinessData, registrationIdType: e.target.value })}
                  className="w-full px-4 py-2 bg-input-background border border-input rounded-xl"
                >
                  <option value="">Select registration ID type</option>
                  <option value="EIN (Employer Identification Number)">EIN (Employer Identification Number)</option>
                  <option value="DUNS Number">DUNS Number</option>
                  <option value="State Registration Number">State Registration Number</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Business Registration Number */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Business Registration Number <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={editBusinessData.registrationNumber}
                  onChange={(e) => setEditBusinessData({ ...editBusinessData, registrationNumber: e.target.value })}
                  placeholder="Enter registration number"
                  className="w-full px-4 py-2 bg-input-background border border-input rounded-xl"
                />
              </div>
            </div>

            {/* Website URL */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Website URL <span className="text-destructive">*</span>
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-4 py-2 bg-muted border border-r-0 border-input rounded-l-xl text-sm">
                  https://
                </span>
                <input
                  type="text"
                  value={editBusinessData.websiteUrl}
                  onChange={(e) => setEditBusinessData({ ...editBusinessData, websiteUrl: e.target.value })}
                  placeholder="example.com"
                  className="flex-1 px-4 py-2 bg-input-background border border-input rounded-r-xl"
                />
              </div>
            </div>

            {/* Social Media Profile URL */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Social Media Profile URL (optional)
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-4 py-2 bg-muted border border-r-0 border-input rounded-l-xl text-sm">
                  https://
                </span>
                <input
                  type="text"
                  value={editBusinessData.socialMediaUrl}
                  onChange={(e) => setEditBusinessData({ ...editBusinessData, socialMediaUrl: e.target.value })}
                  placeholder="linkedin.com/company/yourcompany"
                  className="flex-1 px-4 py-2 bg-input-background border border-input rounded-r-xl"
                />
              </div>
            </div>
          </div>
        </Modal>

        {/* Request Body & Metadata Modal */}
        <Modal
          isOpen={showRequestBodyModal}
          onClose={() => {
            setShowRequestBodyModal(false);
            setSelectedAuditLog(null);
          }}
          title="Request body & metadata"
          maxWidth="lg"
          footer={
            <Button variant="primary" onClick={() => {
              setShowRequestBodyModal(false);
              setSelectedAuditLog(null);
            }}>
              Close
            </Button>
          }
        >
          <div className="bg-muted/30 rounded-xl p-4 border border-border">
            <pre className="text-sm overflow-auto" style={{ fontFamily: 'monospace', color: '#020817' }}>
              {selectedAuditLog && JSON.stringify(selectedAuditLog.requestBody, null, 2)}
            </pre>
          </div>
        </Modal>

        {/* Add User Drawer */}
        <Drawer
          isOpen={showAddUserModal}
          onClose={() => {
            setShowAddUserModal(false);
            setAddUserDepartment("");
            setUserFormData({
              name: "",
              email: "",
              role: "Agent",
              permissions: createDefaultPermissions(),
            });
            setCorePermission("");
            setOperationsPermission("");
            setSystemPermission("");
          }}
          title={
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-800"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              </div>
              <div>
                <div className="text-base font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>Add Team Member</div>
                <div className="text-[11px] text-slate-400" style={{ fontFamily: "Outfit, sans-serif" }}>Fill in the details below to add a new user</div>
              </div>
            </div>
          }
          maxWidth="max-w-[40vw] w-[40vw]"
        >
          <div className="space-y-5" style={{ fontFamily: "Outfit, sans-serif" }}>
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Name <span className="text-red-500">*</span></label>
              <input
                value={userFormData.name}
                onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                placeholder="Enter team member name"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-slate-400 transition-colors"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={userFormData.email}
                onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                placeholder="Enter email address"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-slate-400 transition-colors"
              />
            </div>

            {/* Department (before Role) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
                  Department <span className="text-slate-400 font-normal">(optional)</span>
                </span>
              </label>
              <div className="relative">
                <select
                  value={addUserDepartment}
                  onChange={(e) => {
                    setAddUserDepartment(e.target.value);
                    // Reset role when dept changes
                    setUserFormData({ ...userFormData, role: "Agent", permissions: createDefaultPermissions() });
                  }}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-slate-400 transition-colors appearance-none"
                >
                  <option value="">All departments</option>
                  {Array.from(new Set(roles.filter(r => r.department).map(r => r.department!))).map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Role (filtered by department) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Role <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={userFormData.role}
                  onChange={(e) => {
                    const selectedRoleName = e.target.value;
                    const matchedRole = roles.find((r) => r.name === selectedRoleName);
                    if (matchedRole) {
                      setUserFormData({ ...userFormData, role: selectedRoleName, permissions: { ...matchedRole.permissions } });
                    } else {
                      setUserFormData({ ...userFormData, role: selectedRoleName });
                    }
                  }}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-slate-400 transition-colors appearance-none"
                >
                  {roles
                    .filter(r => !addUserDepartment || r.department === addUserDepartment)
                    .map((role) => (
                      <option key={role.id} value={role.name}>{role.name}</option>
                    ))
                  }
                  {roles.filter(r => !addUserDepartment || r.department === addUserDepartment).length === 0 && (
                    <option value="Agent" disabled>No roles in this department</option>
                  )}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4 text-slate-400" />
              </div>
              {addUserDepartment && (
                <p className="text-[11px] text-slate-400 mt-1">
                  Showing roles in <span className="font-semibold text-slate-600">{addUserDepartment}</span>
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowAddUserModal(false);
                  setAddUserDepartment("");
                  setUserFormData({ name: "", email: "", role: "Agent", permissions: createDefaultPermissions() });
                  setCorePermission("");
                  setOperationsPermission("");
                  setSystemPermission("");
                }}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveUser}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                Add Team Member
              </button>
            </div>
          </div>
        </Drawer>

        {/* Edit User Modal - Manage Permissions */}
        <Modal
          isOpen={showEditUserModal}
          onClose={() => {
            setShowEditUserModal(false);
            setManageTeamTab("calendar");
            setUserFormData({
              name: "",
              email: "",
              role: "Agent",
              permissions: createDefaultPermissions(),
            });
            setCalendarConnected(false);
            setConnectedCalendar(null);
            setAvailability({
              monday: { enabled: true, start: "09:00", end: "17:00" },
              tuesday: { enabled: true, start: "09:00", end: "17:00" },
              wednesday: { enabled: true, start: "09:00", end: "17:00" },
              thursday: { enabled: true, start: "09:00", end: "17:00" },
              friday: { enabled: true, start: "09:00", end: "17:00" },
              saturday: { enabled: false, start: "09:00", end: "17:00" },
              sunday: { enabled: false, start: "09:00", end: "17:00" },
            });
            setDaysOff([]);
            setNewDayOff("");
          }}
          title="Manage Team Member"
          maxWidth="2xl"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditUserModal(false);
                  setManageTeamTab("calendar");
                  setUserFormData({
                    name: "",
                    email: "",
                    role: "Agent",
                    permissions: createDefaultPermissions(),
                  });
                  setCalendarConnected(false);
                  setConnectedCalendar(null);
                  setAvailability({
                    monday: { enabled: true, start: "09:00", end: "17:00" },
                    tuesday: { enabled: true, start: "09:00", end: "17:00" },
                    wednesday: { enabled: true, start: "09:00", end: "17:00" },
                    thursday: { enabled: true, start: "09:00", end: "17:00" },
                    friday: { enabled: true, start: "09:00", end: "17:00" },
                    saturday: { enabled: false, start: "09:00", end: "17:00" },
                    sunday: { enabled: false, start: "09:00", end: "17:00" },
                  });
                  setDaysOff([]);
                  setNewDayOff("");
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveUser}>
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </>
          }
        >
          {/* Horizontal Tab Bar */}
          <div className="w-full h-11 bg-white border-b-2 border-[#E5E7EB] flex items-center mb-6">
            <button
              onClick={() => setManageTeamTab("calendar")}
              className={`h-11 px-[18px] text-sm font-medium transition-colors relative ${manageTeamTab === "calendar"
                ? "text-[#2563EB] font-semibold"
                : "text-[#6B7280] hover:text-[#111827] hover:bg-[rgba(0,0,0,0.03)]"
                }`}
            >
              Calendar
              {manageTeamTab === "calendar" && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2563EB]"></div>
              )}
            </button>
            <button
              onClick={() => setManageTeamTab("availability")}
              className={`h-11 px-[18px] text-sm font-medium transition-colors relative ${manageTeamTab === "availability"
                ? "text-[#2563EB] font-semibold"
                : "text-[#6B7280] hover:text-[#111827] hover:bg-[rgba(0,0,0,0.03)]"
                }`}
            >
              Availability
              {manageTeamTab === "availability" && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2563EB]"></div>
              )}
            </button>
            <button
              onClick={() => setManageTeamTab("days-off")}
              className={`h-11 px-[18px] text-sm font-medium transition-colors relative ${manageTeamTab === "days-off"
                ? "text-[#2563EB] font-semibold"
                : "text-[#6B7280] hover:text-[#111827] hover:bg-[rgba(0,0,0,0.03)]"
                }`}
            >
              Days Off
              {manageTeamTab === "days-off" && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2563EB]"></div>
              )}
            </button>
            <button
              onClick={() => setManageTeamTab("services")}
              className={`h-11 px-[18px] text-sm font-medium transition-colors relative ${manageTeamTab === "services"
                ? "text-[#2563EB] font-semibold"
                : "text-[#6B7280] hover:text-[#111827] hover:bg-[rgba(0,0,0,0.03)]"
                }`}
            >
              Services
              {manageTeamTab === "services" && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2563EB]"></div>
              )}
            </button>
            <button
              onClick={() => setManageTeamTab("permissions")}
              className={`h-11 px-[18px] text-sm font-medium transition-colors relative ${manageTeamTab === "permissions"
                ? "text-[#2563EB] font-semibold"
                : "text-[#6B7280] hover:text-[#111827] hover:bg-[rgba(0,0,0,0.03)]"
                }`}
            >
              Permissions
              {manageTeamTab === "permissions" && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2563EB]"></div>
              )}
            </button>
          </div>

          <div className="space-y-8">
            {/* TAB 1 - Calendar Connection Section */}
            {manageTeamTab === "calendar" && (
              <div className="space-y-6">
                <div className="pb-4 border-b border-border">
                  <h3 className="text-base font-semibold" style={TEXT_STYLES.heading}>Calendar Integration</h3>
                  <p className="text-sm text-muted-foreground mt-1">Connect calendar to sync availability</p>
                </div>

                <div className="space-y-4">
                  {calendarConnected ? (
                    <div className="bg-muted/30 rounded-xl p-6 border border-border">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">
                                {connectedCalendar === "google" ? "Google Calendar" : "Outlook Calendar"}
                              </span>
                              <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                                <CheckCircle2 className="w-3 h-3" />
                                <span className="text-xs font-medium">Connected</span>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{selectedUser?.email}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCalendarConnected(false);
                            setConnectedCalendar(null);
                            toast.success("Calendar disconnected");
                          }}
                        >
                          Disconnect
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Events from this calendar will be used to determine availability automatically.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => {
                          setCalendarConnected(true);
                          setConnectedCalendar("google");
                          toast.success("Google Calendar connected successfully");
                        }}
                        className="flex items-center gap-3 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all"
                      >
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                          <Calendar className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-semibold">Google Calendar</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            Connect <ExternalLink className="w-3 h-3" />
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setCalendarConnected(true);
                          setConnectedCalendar("outlook");
                          toast.success("Outlook Calendar connected successfully");
                        }}
                        className="flex items-center gap-3 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all"
                      >
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                          <Calendar className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-semibold">Outlook Calendar</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            Connect <ExternalLink className="w-3 h-3" />
                          </div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2 - Availability Section */}
            {manageTeamTab === "availability" && (
              <div className="space-y-6">
                <div className="pb-4 border-b border-border">
                  <h3 className="text-base font-semibold" style={TEXT_STYLES.heading}>Weekly Availability</h3>
                  <p className="text-sm text-muted-foreground mt-1">Set working hours for each day</p>
                </div>

                <div className="space-y-3">
                  {Object.entries(availability).map(([day, schedule]) => (
                    <div key={day} className="flex items-center gap-4 p-4 rounded-xl border border-border">
                      <label className="flex items-center gap-3 min-w-[120px]">
                        <input
                          type="checkbox"
                          checked={schedule.enabled}
                          onChange={(e) =>
                            setAvailability({
                              ...availability,
                              [day]: { ...schedule, enabled: e.target.checked },
                            })
                          }
                          className="w-4 h-4 text-primary rounded"
                        />
                        <span className="text-sm font-medium capitalize">{day}</span>
                      </label>
                      {schedule.enabled ? (
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <input
                              type="time"
                              value={schedule.start}
                              onChange={(e) =>
                                setAvailability({
                                  ...availability,
                                  [day]: { ...schedule, start: e.target.value },
                                })
                              }
                              className="px-3 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <span className="text-muted-foreground">to</span>
                          <input
                            type="time"
                            value={schedule.end}
                            onChange={(e) =>
                              setAvailability({
                                ...availability,
                                [day]: { ...schedule, end: e.target.value },
                              })
                            }
                            className="px-3 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">Unavailable</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3 - Days Off Section */}
            {manageTeamTab === "days-off" && (
              <div className="space-y-6">
                <div className="pb-4 border-b border-border">
                  <h3 className="text-base font-semibold" style={TEXT_STYLES.heading}>Days Off</h3>
                  <p className="text-sm text-muted-foreground mt-1">Manage specific dates when unavailable</p>
                </div>

                <div className="space-y-4">
                  {/* Add Day Off */}
                  <div className="flex gap-3">
                    <input
                      type="date"
                      value={newDayOff}
                      onChange={(e) => setNewDayOff(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (newDayOff) {
                          if (daysOff.includes(newDayOff)) {
                            toast.error("This date is already added");
                          } else {
                            setDaysOff([...daysOff, newDayOff].sort());
                            setNewDayOff("");
                            toast.success("Day off added");
                          }
                        } else {
                          toast.error("Please select a date");
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      Add Day Off
                    </Button>
                  </div>

                  {/* List of Days Off */}
                  {daysOff.length > 0 ? (
                    <div className="space-y-2">
                      {daysOff.map((date) => (
                        <div key={date} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setDaysOff(daysOff.filter((d) => d !== date));
                              toast.success("Day off removed");
                            }}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-border rounded-xl">
                      <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No days off added</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4 - Services Section */}
            {manageTeamTab === "services" && (
              <div className="space-y-6">
                <div className="pb-4 border-b border-border">
                  <h3 className="text-base font-semibold" style={TEXT_STYLES.heading}>Assigned Services</h3>
                  <p className="text-sm text-muted-foreground mt-1">Select services this team member can provide</p>
                </div>
                <div className="text-center py-8 border-2 border-dashed border-border rounded-xl">
                  <p className="text-sm text-muted-foreground">Services assignment feature coming soon</p>
                </div>
              </div>
            )}

            {/* TAB 5 - Permissions */}
            {manageTeamTab === "permissions" && (
              <div className="space-y-4">
                <div className="pb-2 border-b border-border flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold" style={TEXT_STYLES.heading}>Module Access Control</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Select Read / Write / All for each module (unselected = No Access)</p>
                  </div>
                </div>

                <div className="border border-border rounded-xl overflow-hidden bg-white divide-y divide-border">
                  {[
                    { key: "clients", label: "Clients" },
                    { key: "processes", label: "Processes" },
                    { key: "calls", label: "Calls" },
                    { key: "chats", label: "Chats" },
                    { key: "knowledgeBase", label: "Knowledge Base" },
                    { key: "settings", label: "Settings" },
                    { key: "processSettings", label: "Process Settings" },
                    { key: "webForms", label: "Web Forms" },
                    { key: "appointments", label: "Appointments" },
                    { key: "services", label: "Services" },
                  ].map((mod) => {
                    const key = mod.key as keyof Omit<ItemPermissions, "processInstances">;
                    const readScope = userFormData.permissions[key]?.read ?? "deny";

                    return (
                      <div key={mod.key} className="p-3 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                        <div>
                          <h5 className="text-xs font-bold text-gray-900">{mod.label}</h5>
                          <p className="text-[10px] text-gray-400">Read access level</p>
                        </div>

                        <div className="inline-flex rounded-md border border-gray-200 overflow-hidden text-[10px] shadow-xs flex-shrink-0">
                          {(["deny", "own", "role", "all"] as ActionScope[]).map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setUserFormData({
                                ...userFormData,
                                permissions: {
                                  ...userFormData.permissions,
                                  [key]: {
                                    ...userFormData.permissions[key],
                                    read: opt,
                                  },
                                },
                              })}
                              className={`px-2.5 py-1 font-semibold transition-colors capitalize ${
                                readScope === opt
                                  ? opt === "deny"
                                    ? "bg-red-500 text-white"
                                    : opt === "own"
                                    ? "bg-amber-500 text-white"
                                    : "bg-blue-600 text-white"
                                  : "bg-white text-gray-500 hover:bg-gray-50"
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Modal>

        {/* Delete User Confirmation Modal */}
        <Modal
          isOpen={showDeleteUserModal}
          onClose={() => {
            setShowDeleteUserModal(false);
            setSelectedUser(null);
          }}
          title="Delete User"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteUserModal(false);
                  setSelectedUser(null);
                }}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteUser}>
                Delete
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-foreground">
              Are you sure you want to delete <strong>{selectedUser?.name}</strong>?
            </p>
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. The user will lose access to the system immediately.
            </p>
          </div>
        </Modal>

        {/* Buy Number Modal */}
        {showBuyNumberModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Dark backdrop */}
            <div
              className="absolute inset-0 bg-black/70"
              onClick={() => {
                setShowBuyNumberModal(false);
                setBuyNumberOption("free-vapi-number");
              }}
            />

            {/* Modal content */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex">
              {/* Close button */}
              <button
                onClick={() => {
                  setShowBuyNumberModal(false);
                  setBuyNumberOption("free-vapi-number");
                }}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors z-10"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Left sidebar */}
              <div className="w-64 bg-gray-50 border-r border-gray-200 p-6">
                <h3 className="text-gray-900 font-semibold text-lg mb-4">Phone Number Options</h3>
                <div className="space-y-1">
                  {[
                    { id: "free-vapi-number", label: "Free Vapi Number" },
                    { id: "free-vapi-sip", label: "Free Vapi SIP" },
                    { id: "import-twilio", label: "Import Twilio" },
                    { id: "import-vonage", label: "Import Vonage" },
                    { id: "import-telnyx", label: "Import Telnyx" },
                    { id: "byo-sip-trunk", label: "BYO SIP Trunk Number" },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setBuyNumberOption(option.id)}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors ${buyNumberOption === option.id
                        ? "bg-blue-600 text-white font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                        }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right content area */}
              <div className="flex-1 p-8 overflow-y-auto">
                {/* Free Vapi Number */}
                {buyNumberOption === "free-vapi-number" && (
                  <div className="space-y-6">
                    <h2 className="text-gray-900 text-2xl font-semibold">Free Vapi Number</h2>

                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">Area Code</label>
                      <input
                        type="text"
                        placeholder="725"
                        value={buyNumberFormData.areaCode}
                        onChange={(e) => setBuyNumberFormData({ ...buyNumberFormData, areaCode: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-gray-700">
                        Free US phone numbers • Up to 10 per account — Only US area codes are supported. For international numbers, use the import options above.
                      </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowBuyNumberModal(false);
                          setBuyNumberOption("free-vapi-number");
                        }}
                        className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => {
                          toast.success("Free Vapi Number created successfully");
                          setShowBuyNumberModal(false);
                          setBuyNumberFormData({ ...buyNumberFormData, areaCode: "" });
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Create
                      </Button>
                    </div>
                  </div>
                )}

                {/* Free Vapi SIP */}
                {buyNumberOption === "free-vapi-sip" && (
                  <div className="space-y-6">
                    <h2 className="text-gray-900 text-2xl font-semibold">Free Vapi SIP</h2>

                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">SIP Identifier</label>
                      <input
                        type="text"
                        placeholder="my-example-identifier"
                        value={buyNumberFormData.sipIdentifier}
                        onChange={(e) => setBuyNumberFormData({ ...buyNumberFormData, sipIdentifier: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">Will be used as: sip:identifier@sip.vapi.ai</p>
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">Label</label>
                      <input
                        type="text"
                        placeholder="Label for SIP URI"
                        value={buyNumberFormData.sipLabel}
                        onChange={(e) => setBuyNumberFormData({ ...buyNumberFormData, sipLabel: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <h3 className="text-gray-700 text-sm font-semibold mb-3">SIP Authentication (Optional)</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-gray-700 text-sm font-medium mb-2">Username</label>
                          <input
                            type="text"
                            placeholder="SIP Authentication Username"
                            value={buyNumberFormData.sipUsername}
                            onChange={(e) => setBuyNumberFormData({ ...buyNumberFormData, sipUsername: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 text-sm font-medium mb-2">Password</label>
                          <input
                            type="password"
                            placeholder="SIP Authentication Password"
                            value={buyNumberFormData.sipPassword}
                            onChange={(e) => setBuyNumberFormData({ ...buyNumberFormData, sipPassword: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <a href="#" className="text-blue-600 text-sm hover:underline inline-block">
                      Read more about using SIP with Vapi in the documentation
                    </a>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowBuyNumberModal(false);
                          setBuyNumberOption("free-vapi-number");
                        }}
                        className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => {
                          toast.success("SIP URI imported successfully");
                          setShowBuyNumberModal(false);
                          setBuyNumberFormData({ ...buyNumberFormData, sipIdentifier: "", sipLabel: "", sipUsername: "", sipPassword: "" });
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Import SIP URI
                      </Button>
                    </div>
                  </div>
                )}

                {/* Import Twilio */}
                {buyNumberOption === "import-twilio" && (
                  <div className="space-y-6">
                    <h2 className="text-gray-900 text-2xl font-semibold">Import Twilio</h2>

                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">Twilio Phone Number</label>
                      <div className="flex gap-2">
                        <select
                          value={buyNumberFormData.twilioCountryCode}
                          onChange={(e) => setBuyNumberFormData({ ...buyNumberFormData, twilioCountryCode: e.target.value })}
                          className="px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="US">🇺🇸</option>
                          <option value="UK">🇬🇧</option>
                          <option value="CA">🇨🇦</option>
                        </select>
                        <input
                          type="text"
                          placeholder="+14156021922"
                          value={buyNumberFormData.twilioPhoneNumber}
                          onChange={(e) => setBuyNumberFormData({ ...buyNumberFormData, twilioPhoneNumber: e.target.value })}
                          className="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">Twilio Account SID</label>
                      <input
                        type="text"
                        placeholder="Twilio Account SID"
                        value={buyNumberFormData.twilioAccountSid}
                        onChange={(e) => setBuyNumberFormData({ ...buyNumberFormData, twilioAccountSid: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">Twilio Auth Token</label>
                      <input
                        type="password"
                        placeholder="Twilio Auth Token"
                        value={buyNumberFormData.twilioAuthToken}
                        onChange={(e) => setBuyNumberFormData({ ...buyNumberFormData, twilioAuthToken: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">Label</label>
                      <input
                        type="text"
                        placeholder="Label for Phone Number"
                        value={buyNumberFormData.twilioLabel}
                        onChange={(e) => setBuyNumberFormData({ ...buyNumberFormData, twilioLabel: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-gray-700 text-sm font-medium">SMS Enabled</p>
                        <p className="text-gray-500 text-xs">Enable SMS messaging for this phone number</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={buyNumberFormData.twilioSmsEnabled}
                          onChange={(e) => setBuyNumberFormData({ ...buyNumberFormData, twilioSmsEnabled: e.target.checked })}
                        />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowBuyNumberModal(false);
                          setBuyNumberOption("free-vapi-number");
                        }}
                        className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => {
                          toast.success("Twilio number imported successfully");
                          setShowBuyNumberModal(false);
                          setBuyNumberFormData({
                            ...buyNumberFormData,
                            twilioPhoneNumber: "",
                            twilioAccountSid: "",
                            twilioAuthToken: "",
                            twilioLabel: "",
                          });
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Import from Twilio
                      </Button>
                    </div>
                  </div>
                )}

                {/* Import Vonage */}
                {buyNumberOption === "import-vonage" && (
                  <div className="space-y-6">
                    <h2 className="text-gray-900 text-2xl font-semibold">Import Vonage</h2>

                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">Vonage Phone Number</label>
                      <div className="flex gap-2">
                        <select
                          value={buyNumberFormData.vonageCountryCode}
                          onChange={(e) => setBuyNumberFormData({ ...buyNumberFormData, vonageCountryCode: e.target.value })}
                          className="px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="US">🇺🇸</option>
                          <option value="UK">🇬🇧</option>
                          <option value="CA">🇨🇦</option>
                        </select>
                        <input
                          type="text"
                          placeholder="+14156021922"
                          value={buyNumberFormData.vonagePhoneNumber}
                          onChange={(e) => setBuyNumberFormData({ ...buyNumberFormData, vonagePhoneNumber: e.target.value })}
                          className="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">API Key</label>
                      <input
                        type="text"
                        placeholder="Enter API Key"
                        value={buyNumberFormData.vonageApiKey}
                        onChange={(e) => setBuyNumberFormData({ ...buyNumberFormData, vonageApiKey: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">API Secret</label>
                      <input
                        type="password"
                        placeholder="Enter API Secret"
                        value={buyNumberFormData.vonageApiSecret}
                        onChange={(e) => setBuyNumberFormData({ ...buyNumberFormData, vonageApiSecret: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">Label</label>
                      <input
                        type="text"
                        placeholder="Label for Phone Number"
                        value={buyNumberFormData.vonageLabel}
                        onChange={(e) => setBuyNumberFormData({ ...buyNumberFormData, vonageLabel: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowBuyNumberModal(false);
                          setBuyNumberOption("free-vapi-number");
                        }}
                        className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => {
                          toast.success("Vonage number imported successfully");
                          setShowBuyNumberModal(false);
                          setBuyNumberFormData({
                            ...buyNumberFormData,
                            vonagePhoneNumber: "",
                            vonageApiKey: "",
                            vonageApiSecret: "",
                            vonageLabel: "",
                          });
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Import from Vonage
                      </Button>
                    </div>
                  </div>
                )}

                {/* Import Telnyx */}
                {buyNumberOption === "import-telnyx" && (
                  <div className="space-y-6">
                    <h2 className="text-gray-900 text-2xl font-semibold">Import Telnyx</h2>

                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">Telnyx Phone Number</label>
                      <div className="flex gap-2">
                        <select
                          value={buyNumberFormData.telnyxCountryCode}
                          onChange={(e) => setBuyNumberFormData({ ...buyNumberFormData, telnyxCountryCode: e.target.value })}
                          className="px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="US">🇺🇸</option>
                          <option value="UK">🇬🇧</option>
                          <option value="CA">🇨🇦</option>
                        </select>
                        <input
                          type="text"
                          placeholder="+14156021922"
                          value={buyNumberFormData.telnyxPhoneNumber}
                          onChange={(e) => setBuyNumberFormData({ ...buyNumberFormData, telnyxPhoneNumber: e.target.value })}
                          className="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">API Key</label>
                      <input
                        type="text"
                        placeholder="Enter API Key"
                        value={buyNumberFormData.telnyxApiKey}
                        onChange={(e) => setBuyNumberFormData({ ...buyNumberFormData, telnyxApiKey: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">Label</label>
                      <input
                        type="text"
                        placeholder="Label for Phone Number"
                        value={buyNumberFormData.telnyxLabel}
                        onChange={(e) => setBuyNumberFormData({ ...buyNumberFormData, telnyxLabel: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowBuyNumberModal(false);
                          setBuyNumberOption("free-vapi-number");
                        }}
                        className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => {
                          toast.success("Telnyx number imported successfully");
                          setShowBuyNumberModal(false);
                          setBuyNumberFormData({
                            ...buyNumberFormData,
                            telnyxPhoneNumber: "",
                            telnyxApiKey: "",
                            telnyxLabel: "",
                          });
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Import from Telnyx
                      </Button>
                    </div>
                  </div>
                )}

                {/* BYO SIP Trunk Number */}
                {buyNumberOption === "byo-sip-trunk" && (
                  <div className="space-y-6">
                    <h2 className="text-gray-900 text-2xl font-semibold">BYO SIP Trunk Number</h2>

                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">Phone Number</label>
                      <input
                        type="text"
                        placeholder="+14155551234"
                        value={buyNumberFormData.byoPhoneNumber}
                        onChange={(e) => setBuyNumberFormData({ ...buyNumberFormData, byoPhoneNumber: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={buyNumberFormData.byoAllowNonE164}
                        onChange={(e) => setBuyNumberFormData({ ...buyNumberFormData, byoAllowNonE164: e.target.checked })}
                        className="mt-1 w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <p className="text-gray-700 text-sm font-medium">Allow non-E164 phone numbers</p>
                        <p className="text-gray-500 text-xs">Check this box to disable E164 format validation and use custom phone number formats</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">SIP Trunk Credential</label>
                      <select
                        value={buyNumberFormData.byoSipTrunkCredential}
                        onChange={(e) => setBuyNumberFormData({ ...buyNumberFormData, byoSipTrunkCredential: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="">Select a SIP trunk credential</option>
                        <option value="credential-1">Credential 1</option>
                        <option value="credential-2">Credential 2</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">Label</label>
                      <input
                        type="text"
                        placeholder="Label for Phone Number"
                        value={buyNumberFormData.byoLabel}
                        onChange={(e) => setBuyNumberFormData({ ...buyNumberFormData, byoLabel: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <a href="#" className="text-blue-600 text-sm hover:underline inline-block">
                      Read more about SIP trunking in the documentation
                    </a>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowBuyNumberModal(false);
                          setBuyNumberOption("free-vapi-number");
                        }}
                        className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => {
                          toast.success("SIP phone number imported successfully");
                          setShowBuyNumberModal(false);
                          setBuyNumberFormData({
                            ...buyNumberFormData,
                            byoPhoneNumber: "",
                            byoSipTrunkCredential: "",
                            byoLabel: "",
                          });
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Import SIP Phone Number
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edit Routing Modal */}
        <Modal
          isOpen={showEditRoutingModal}
          onClose={() => {
            setShowEditRoutingModal(false);
            setSelectedRouting(null);
          }}
          title="Edit Routing Configuration"
          maxWidth="lg"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditRoutingModal(false);
                  setSelectedRouting(null);
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveRouting}>
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </>
          }
        >
          <div className="space-y-6">
            {/* Phone Number Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Phone Number <span className="text-destructive">*</span>
              </label>
              <select
                value={editRoutingData.phoneNumber}
                onChange={(e) => setEditRoutingData({ ...editRoutingData, phoneNumber: e.target.value })}
                className="w-full px-4 py-2 bg-input-background border border-input rounded-xl"
              >
                {selectedRouting && getAvailableNumbersForCountry(selectedRouting.country).map((num, index) => (
                  <option key={num.id} value={num.number}>
                    {num.number} {index === 0 ? "(Default)" : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Country: {selectedRouting?.country}
              </p>
            </div>

            {/* Process Selection */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Process <span className="text-muted-foreground font-normal">(Multi-select)</span>
              </label>
              <div className="space-y-2">
                {processOptions.map((process) => (
                  <label
                    key={process}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${editRoutingData.processes.includes(process)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={editRoutingData.processes.includes(process)}
                      onChange={() => toggleProcessSelection(process)}
                      className="w-4 h-4 text-primary rounded"
                    />
                    <span className="text-sm font-medium">{process}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Read-only Info */}
            <div className="bg-muted/30 rounded-xl border border-border p-4">
              <h4 className="text-sm font-semibold mb-3">Configuration Details</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Provider</p>
                  <p className="font-medium">{selectedRouting?.provider}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">{selectedRouting?.status ? "Active" : "Inactive"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cost Incoming</p>
                  <p className="font-medium">${selectedRouting?.costIncoming.toFixed(3)}/min</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cost Outgoing</p>
                  <p className="font-medium">${selectedRouting?.costOutgoing.toFixed(3)}/min</p>
                </div>
              </div>
            </div>
          </div>
        </Modal>

        {/* Add Number Modal */}
        <Modal
          isOpen={showAddCountryModal}
          onClose={() => {
            setShowAddCountryModal(false);
            setAddCountryData({
              phoneNumber: "",
              country: "",
              priority: 0,
              countriesServed: [],
              allCountries: false,
              processes: [],
              provider: "",
              costIncoming: 0,
              costOutgoing: 0,
              inboundOutbound: "Both",
              status: true,
            });
            setCountriesServedInput("");
          }}
          title="Add Number"
          maxWidth="lg"
          footer={
            <>
              <button
                onClick={() => {
                  setShowAddCountryModal(false);
                  setAddCountryData({
                    phoneNumber: "",
                    country: "",
                    priority: 0,
                    countriesServed: [],
                    allCountries: false,
                    processes: [],
                    provider: "",
                    costIncoming: 0,
                    costOutgoing: 0,
                    inboundOutbound: "Both",
                    status: true,
                  });
                  setCountriesServedInput("");
                }}
                className="px-4 text-sm font-medium border border-border rounded hover:bg-muted transition-colors"
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  height: '36px',
                  fontFamily: 'Outfit, sans-serif'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAddCountry}
                disabled={!addCountryData.phoneNumber || !addCountryData.country || !addCountryData.provider}
                className="px-4 text-sm font-medium rounded transition-opacity"
                style={{
                  backgroundColor: (!addCountryData.phoneNumber || !addCountryData.country || !addCountryData.provider) ? '#9CA3AF' : '#1A73E8',
                  color: '#FFFFFF',
                  height: '36px',
                  width: '120px',
                  fontFamily: 'Outfit, sans-serif',
                  cursor: (!addCountryData.phoneNumber || !addCountryData.country || !addCountryData.provider) ? 'not-allowed' : 'pointer',
                  opacity: (!addCountryData.phoneNumber || !addCountryData.country || !addCountryData.provider) ? 0.6 : 1
                }}
              >
                Add
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {/* Phone Number */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: '#374151', fontFamily: 'Outfit, sans-serif' }}>
                Phone Number <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={addCountryData.phoneNumber}
                onChange={(e) => setAddCountryData({ ...addCountryData, phoneNumber: e.target.value })}
                placeholder="+1 (555) 123-4567"
                className="w-full px-3 bg-white border text-sm"
                style={{
                  borderColor: '#E5E7EB',
                  borderRadius: '8px',
                  height: '40px',
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: '13px'
                }}
              />
              <p className="text-xs mt-1" style={{ color: '#9CA3AF', fontFamily: 'Outfit, sans-serif', fontSize: '11px' }}>
                Must start with + and include country code
              </p>
            </div>

            {/* Country */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: '#374151', fontFamily: 'Outfit, sans-serif' }}>
                Country <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                value={addCountryData.country}
                onChange={(e) => setAddCountryData({ ...addCountryData, country: e.target.value })}
                className="w-full px-3 bg-white border text-sm"
                style={{
                  borderColor: '#E5E7EB',
                  borderRadius: '8px',
                  height: '40px',
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: '13px'
                }}
              >
                <option value="">Choose a country</option>
                {countries.map((country) => (
                  <option key={country.name} value={country.name}>
                    {country.flag} {country.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: '#374151', fontFamily: 'Outfit, sans-serif' }}>
                Priority
              </label>
              <input
                type="number"
                value={addCountryData.priority || ''}
                onChange={(e) => setAddCountryData({ ...addCountryData, priority: parseInt(e.target.value) || 0 })}
                placeholder="e.g. 20"
                min="1"
                className="w-full px-3 bg-white border text-sm"
                style={{
                  borderColor: '#E5E7EB',
                  borderRadius: '8px',
                  height: '40px',
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: '13px'
                }}
              />
            </div>

            {/* Countries Served */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: '#374151', fontFamily: 'Outfit, sans-serif' }}>
                Countries Served
              </label>
              <div className="space-y-2">
                <div className="relative">
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value && !addCountryData.countriesServed.includes(e.target.value)) {
                        setAddCountryData({
                          ...addCountryData,
                          countriesServed: [...addCountryData.countriesServed, e.target.value]
                        });
                      }
                    }}
                    disabled={addCountryData.allCountries}
                    className="w-full px-3 bg-white border text-sm"
                    style={{
                      borderColor: '#E5E7EB',
                      borderRadius: '8px',
                      height: '40px',
                      fontFamily: 'Outfit, sans-serif',
                      fontSize: '13px',
                      opacity: addCountryData.allCountries ? 0.5 : 1
                    }}
                  >
                    <option value="">Select country...</option>
                    {countries.map((country) => (
                      <option key={country.code} value={country.name}>
                        {country.flag} {country.name}
                      </option>
                    ))}
                  </select>
                </div>
                {addCountryData.countriesServed.length > 0 && !addCountryData.allCountries && (
                  <div className="flex flex-wrap gap-2">
                    {addCountryData.countriesServed.map((country, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded"
                        style={{ backgroundColor: '#F3F4F6', color: '#374151', fontFamily: 'Outfit, sans-serif' }}
                      >
                        {country}
                        <button
                          onClick={() => {
                            setAddCountryData({
                              ...addCountryData,
                              countriesServed: addCountryData.countriesServed.filter((_, i) => i !== index)
                            });
                          }}
                          className="hover:text-destructive"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addCountryData.allCountries}
                    onChange={(e) => setAddCountryData({ ...addCountryData, allCountries: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '13px', color: '#374151' }}>
                    Applies to all countries
                  </span>
                </label>
                {addCountryData.allCountries && (
                  <span
                    className="inline-flex items-center px-2 py-1 text-xs rounded"
                    style={{ backgroundColor: '#F3F4F6', color: '#374151', fontFamily: 'Outfit, sans-serif' }}
                  >
                    All
                  </span>
                )}
              </div>
            </div>

            {/* Process */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: '#374151', fontFamily: 'Outfit, sans-serif' }}>
                Process
              </label>
              <select
                value={addCountryData.processes[0] || ""}
                onChange={(e) => setAddCountryData({ ...addCountryData, processes: e.target.value ? [e.target.value] : [] })}
                className="w-full px-3 bg-white border text-sm"
                style={{
                  borderColor: '#E5E7EB',
                  borderRadius: '8px',
                  height: '40px',
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: '13px'
                }}
              >
                <option value="">Select process</option>
                <option value="Insurance Verification">Insurance Verification</option>
                <option value="Appointment Scheduling">Appointment Scheduling</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Payment Reminder">Payment Reminder</option>
              </select>
            </div>

            {/* Provider */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: '#374151', fontFamily: 'Outfit, sans-serif' }}>
                Provider <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                value={addCountryData.provider}
                onChange={(e) => setAddCountryData({ ...addCountryData, provider: e.target.value })}
                className="w-full px-3 bg-white border text-sm"
                style={{
                  borderColor: '#E5E7EB',
                  borderRadius: '8px',
                  height: '40px',
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: '13px'
                }}
              >
                <option value="">Select provider</option>
                <option value="VAPI">VAPI</option>
                <option value="Twilio">Twilio</option>
                <option value="Zardarma">Zardarma</option>
                <option value="Vonage">Vonage</option>
                <option value="Telnyx">Telnyx</option>
              </select>
            </div>

            {/* Call Direction */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: '#374151', fontFamily: 'Outfit, sans-serif' }}>
                Call Direction
              </label>
              <div className="flex gap-2">
                {["Inbound", "Outbound", "Both"].map((option) => (
                  <button
                    key={option}
                    onClick={() => setAddCountryData({ ...addCountryData, inboundOutbound: option as "Inbound" | "Outbound" | "Both" })}
                    className="flex-1 px-4 py-2 text-sm font-medium rounded transition-all"
                    style={{
                      backgroundColor: addCountryData.inboundOutbound === option ? '#1A73E8' : '#FFFFFF',
                      color: addCountryData.inboundOutbound === option ? '#FFFFFF' : '#374151',
                      border: `1px solid ${addCountryData.inboundOutbound === option ? '#1A73E8' : '#E5E7EB'}`,
                      fontFamily: 'Outfit, sans-serif',
                      fontSize: '13px'
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: '#374151', fontFamily: 'Outfit, sans-serif' }}>
                Status
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={addCountryData.status}
                    onChange={(e) => setAddCountryData({ ...addCountryData, status: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </div>
                <span className="text-sm" style={{ fontFamily: 'Outfit, sans-serif', color: '#374151' }}>
                  {addCountryData.status ? 'Active' : 'Inactive'}
                </span>
              </label>
            </div>
          </div>
        </Modal>

        {/* Add/Edit Number Modal */}
        <Modal
          isOpen={showAddNumberModal}
          onClose={() => {
            setShowAddNumberModal(false);
            setEditingNumber(null);
            setNumberFormData({
              number: "",
              country: "",
              processes: [],
              callType: "both",
              isDefault: false,
              incomingCost: "",
              outgoingCost: "",
            });
            setShowAdvancedSettings(false);
          }}
          title={editingNumber ? "Edit Phone Number" : "Add Phone Number"}
          maxWidth="lg"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddNumberModal(false);
                  setEditingNumber(null);
                  setNumberFormData({
                    number: "",
                    country: "",
                    processes: [],
                    callType: "both",
                    isDefault: false,
                    incomingCost: "",
                    outgoingCost: "",
                  });
                  setShowAdvancedSettings(false);
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveNumber}>
                <Save className="w-4 h-4" />
                {editingNumber ? "Update Number" : "Add Number"}
              </Button>
            </>
          }
        >
          <div className="space-y-6">
            {/* Basic Fields */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Phone Number <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={numberFormData.number}
                onChange={(e) =>
                  setNumberFormData({ ...numberFormData, number: e.target.value })
                }
                placeholder="+1 234 567 8900"
                className="w-full px-4 py-2 bg-input-background border border-input rounded-xl"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Must start with + and include country code
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Country <span className="text-destructive">*</span>
              </label>
              <select
                value={numberFormData.country}
                onChange={(e) =>
                  setNumberFormData({ ...numberFormData, country: e.target.value })
                }
                className="w-full px-4 py-2 bg-input-background border border-input rounded-xl"
              >
                <option value="">Select country</option>
                {countryPricing.map((country) => (
                  <option key={country.code} value={country.name}>
                    {country.flag} {country.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Provider</label>
              <input
                type="text"
                value={selectedIntegration?.name || ""}
                readOnly
                className="w-full px-4 py-2 bg-muted/30 border border-input rounded-xl text-muted-foreground cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Auto-mapped to current integration
              </p>
            </div>

            {/* Advanced Settings Toggle */}
            <button
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              {showAdvancedSettings ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              Advanced Settings
            </button>

            {/* Advanced Settings */}
            {showAdvancedSettings && (
              <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                {/* Assign Process */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Assign Process <span className="text-muted-foreground font-normal">(Multi-select)</span>
                  </label>
                  <div className="space-y-2">
                    {processOptions.map((process) => (
                      <label
                        key={process}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${numberFormData.processes.includes(process)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={numberFormData.processes.includes(process)}
                          onChange={() => {
                            const updated = numberFormData.processes.includes(process)
                              ? numberFormData.processes.filter((p) => p !== process)
                              : [...numberFormData.processes, process];
                            setNumberFormData({ ...numberFormData, processes: updated });
                          }}
                          className="w-4 h-4 text-primary rounded"
                        />
                        <span className="text-sm font-medium">{process}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Call Type */}
                <div>
                  <label className="block text-sm font-medium mb-2">Call Type</label>
                  <div className="space-y-2">
                    {[
                      { value: "inbound", label: "Inbound Only" },
                      { value: "outbound", label: "Outbound Only" },
                      { value: "both", label: "Both Inbound & Outbound" },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${numberFormData.callType === option.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                          }`}
                      >
                        <input
                          type="radio"
                          name="callType"
                          value={option.value}
                          checked={numberFormData.callType === option.value}
                          onChange={(e) =>
                            setNumberFormData({
                              ...numberFormData,
                              callType: e.target.value as "inbound" | "outbound" | "both",
                            })
                          }
                          className="w-4 h-4 text-primary"
                        />
                        <span className="text-sm font-medium">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Set as Default */}
                <div>
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 transition-all cursor-pointer">
                    <input
                      type="checkbox"
                      checked={numberFormData.isDefault}
                      onChange={(e) =>
                        setNumberFormData({ ...numberFormData, isDefault: e.target.checked })
                      }
                      className="w-4 h-4 text-primary rounded"
                    />
                    <div>
                      <span className="text-sm font-medium block">Set as Default Number</span>
                      <span className="text-xs text-muted-foreground">
                        Use this number as the primary for outbound calls
                      </span>
                    </div>
                  </label>
                </div>

                {/* Costs */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Incoming Cost (per min)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={numberFormData.incomingCost}
                      onChange={(e) =>
                        setNumberFormData({
                          ...numberFormData,
                          incomingCost: e.target.value,
                        })
                      }
                      placeholder="0.012"
                      className="w-full px-4 py-2 bg-input-background border border-input rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Outgoing Cost (per min)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={numberFormData.outgoingCost}
                      onChange={(e) =>
                        setNumberFormData({
                          ...numberFormData,
                          outgoingCost: e.target.value,
                        })
                      }
                      placeholder="0.015"
                      className="w-full px-4 py-2 bg-input-background border border-input rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>

        {/* Integration Configuration Drawer */}
        <Drawer
          isOpen={showIntegrationModal}
          onClose={() => {
            setShowIntegrationModal(false);
            setSelectedIntegration(null);
            setIntegrationCredentials({});
            setVisibleFields({});
            setTestConnectionStatus("idle");
            setValidationErrors({});
            setIntegrationConfigTab("api");
            // Reset bitrix connection test state when closing
            if (selectedIntegration?.id === "bitrix24" && !selectedIntegration?.connected) {
              setBitrixConnectionTested(false);
              setIsMappingSectionExpanded(false);
            }
            // Reset salesforce states when closing
            if (selectedIntegration?.id === "salesforce" && !selectedIntegration?.connected) {
              setSalesforceConnectionTested(false);
              setSalesforceSelectedProcesses([]);
              setSalesforceProcessValidationError("");
            }
            // Reset meta-leads states when closing
            if (selectedIntegration?.id === "meta-leads" && !selectedIntegration?.connected) {
              setMetaLeadFormsConnectionTested(false);
              setMetaSelectedForms([]);
            }
          }}
          title={selectedIntegration?.id === "whatsapp-business"
            ? "WhatsApp Hub"
            : `Configure ${selectedIntegration?.name || "Provider"}`}
        >
          {selectedIntegration && (
            <div className="space-y-6">
              {/* Tabs for Telephony Integrations */}
              {selectedIntegration.category === "telephony" && selectedIntegration.connected && (
                <div className="border-b border-border">
                  <div className="flex gap-6">
                    <button
                      onClick={() => setIntegrationConfigTab("api")}
                      className={`pb-3 px-1 border-b-2 transition-colors text-sm ${integrationConfigTab === "api"
                        ? "border-primary text-primary font-medium"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      API Details
                    </button>
                    <button
                      onClick={() => setIntegrationConfigTab("numbers")}
                      className={`pb-3 px-1 border-b-2 transition-colors text-sm ${integrationConfigTab === "numbers"
                        ? "border-primary text-primary font-medium"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      Numbers & Routing
                    </button>
                  </div>
                </div>
              )}


              {/* API Details Tab */}
              {integrationConfigTab === "api" && (
                <div className="space-y-6">
                  {(selectedIntegration.id === "custom-api" || selectedIntegration.id === "custom-webhook") ? (
                    <div>
                      <h3 className="text-base font-semibold mb-4" style={TEXT_STYLES.heading}>
                        {selectedIntegration.id === "custom-api" ? "Custom API Details" : "Custom Webhook Details"}
                      </h3>
                      <div className="space-y-4">
                        {/* Integration Name */}
                        <div>
                          <label className="block text-sm font-medium mb-2">Integration Name</label>
                          <input
                            type="text"
                            value={integrationCredentials.integrationName || ""}
                            onChange={(e) =>
                              setIntegrationCredentials({
                                ...integrationCredentials,
                                integrationName: e.target.value,
                              })
                            }
                            placeholder="Enter Integration Name"
                            className="w-full px-4 py-2 bg-input-background border border-input rounded-xl text-sm"
                          />
                        </div>

                        {/* Base URL / Webhook URL — key and label depend on integration type */}
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            {selectedIntegration.id === "custom-webhook" ? "Webhook URL" : "Base URL"}
                          </label>
                          <input
                            type="text"
                            value={
                              selectedIntegration.id === "custom-webhook"
                                ? integrationCredentials.webhookUrl || ""
                                : integrationCredentials.baseUrl || ""
                            }
                            onChange={(e) =>
                              setIntegrationCredentials({
                                ...integrationCredentials,
                                [selectedIntegration.id === "custom-webhook" ? "webhookUrl" : "baseUrl"]: e.target.value,
                              })
                            }
                            placeholder={
                              selectedIntegration.id === "custom-webhook"
                                ? "https://hooks.example.com/endpoint"
                                : "https://api.example.com"
                            }
                            className="w-full px-4 py-2 bg-input-background border border-input rounded-xl text-sm"
                          />
                        </div>

                        {/* Allowed Methods — Custom API only */}
                        {selectedIntegration.id !== "custom-webhook" && (
                          <div>
                            <label className="block text-sm font-medium mb-2">Allowed Methods</label>
                            <div className="flex flex-wrap gap-4 mt-2">
                              {["GET", "POST", "PUT", "PATCH", "DELETE"].map((method) => {
                                const methodsArray = (integrationCredentials.allowedMethods || "")
                                  .split(",")
                                  .map((m) => m.trim())
                                  .filter(Boolean);
                                const isChecked = methodsArray.includes(method);
                                return (
                                  <label key={method} className="flex items-center gap-2 cursor-pointer text-sm">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        let newMethods;
                                        if (e.target.checked) {
                                          newMethods = [...methodsArray, method];
                                        } else {
                                          newMethods = methodsArray.filter((m) => m !== method);
                                        }
                                        setIntegrationCredentials({
                                          ...integrationCredentials,
                                          allowedMethods: newMethods.join(","),
                                        });
                                      }}
                                      className="rounded border-input text-primary focus:ring-primary h-4 w-4 bg-input-background"
                                    />
                                    {method}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Authentication Type */}
                        <div>
                          <label className="block text-sm font-medium mb-2">Authentication Type</label>
                          <select
                            value={integrationCredentials.authType || "None"}
                            onChange={(e) =>
                              setIntegrationCredentials({
                                ...integrationCredentials,
                                authType: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 bg-input-background border border-input rounded-xl text-sm"
                          >
                            <option value="None">None</option>
                            {selectedIntegration.id === "custom-api" ? (
                              <>
                                <option value="API Key">API Key</option>
                                <option value="Bearer Token">Bearer Token</option>
                                <option value="Basic Auth">Basic Auth</option>
                              </>
                            ) : (
                              <>
                                <option value="Signing Secret">Signing Secret</option>
                                <option value="Bearer Token">Bearer Token</option>
                              </>
                            )}
                          </select>
                        </div>

                        {/* Auth Value */}
                        {(integrationCredentials.authType && integrationCredentials.authType !== "None") && (
                          <div>
                            <label className="block text-sm font-medium mb-2">Auth Value</label>
                            <div className="relative">
                              <input
                                type={visibleFields["authValue"] ? "text" : "password"}
                                value={integrationCredentials.authValue || ""}
                                onChange={(e) =>
                                  setIntegrationCredentials({
                                    ...integrationCredentials,
                                    authValue: e.target.value,
                                  })
                                }
                                placeholder="Enter auth value"
                                className="w-full px-4 py-2 pr-10 bg-input-background border border-input rounded-xl text-sm"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setVisibleFields({
                                    ...visibleFields,
                                    authValue: !visibleFields["authValue"],
                                  })
                                }
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {visibleFields["authValue"] ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Schema / Field Mapping section */}
                        <div className="space-y-3">
                          {/* Header */}
                          <div className="flex items-center gap-2">
                            <label className="block text-sm font-medium">Schema / Field Mapping</label>
                            <Tooltip text="Paste a sample API response to auto-detect field keys, then add human-readable action labels for each.">
                              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                            </Tooltip>
                          </div>

                          {/* Step 1 — JSON paste area */}
                          <div className="space-y-2">
                            <textarea
                              value={sampleJson}
                              onChange={(e) => setSampleJson(e.target.value)}
                              placeholder={`Paste a sample API response JSON here to auto-generate fields...\n\nExample:\n{\n  "patient_id": "123",\n  "appointment_date": "2024-01-15"\n}`}
                              rows={5}
                              className="w-full px-4 py-3 bg-input-background border border-input rounded-xl text-sm font-mono resize-y placeholder:text-muted-foreground/60"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                try {
                                  const parsed = JSON.parse(sampleJson);
                                  const keys = Object.keys(parsed);
                                  const newMappings = keys.map((key: string) => ({ key, label: key }));
                                  setIntegrationCredentials({
                                    ...integrationCredentials,
                                    fieldMappings: JSON.stringify(newMappings),
                                  });
                                  toast.success(`${keys.length} field${keys.length !== 1 ? 's' : ''} detected`);
                                } catch {
                                  toast.error("Invalid JSON — please check and try again");
                                }
                              }}
                              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl transition-colors"
                            >
                              Parse JSON
                            </button>
                          </div>

                          {/* Step 2 — Auto-generated rows */}
                          {(() => {
                            const fieldMappings: Array<{ key: string; label: string }> = (() => {
                              try {
                                return JSON.parse(integrationCredentials.fieldMappings || "[]");
                              } catch (e) {
                                return [];
                              }
                            })();

                            if (fieldMappings.length === 0) return null;

                            return (
                              <div className="space-y-2">
                                {/* Column headers */}
                                <div className="flex items-center gap-3 px-1">
                                  <span className="flex-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Key</span>
                                  <span className="flex-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Label</span>
                                  <span className="w-8" />
                                </div>
                                <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
                                  {fieldMappings.map((mapping: any, index: number) => (
                                    <div key={index} className="flex items-center gap-3 px-3 py-2.5 bg-card">
                                      {/* Key — read-only */}
                                      <div className="flex-1 px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm font-mono text-muted-foreground select-all">
                                        {mapping.key || <span className="italic opacity-50">key</span>}
                                      </div>
                                      {/* Label — editable */}
                                      <input
                                        type="text"
                                        placeholder="e.g. Patient Record"
                                        value={mapping.label || ""}
                                        onChange={(e) => {
                                          const newMappings = [...fieldMappings];
                                          newMappings[index] = { ...newMappings[index], label: e.target.value };
                                          setIntegrationCredentials({
                                            ...integrationCredentials,
                                            fieldMappings: JSON.stringify(newMappings),
                                          });
                                        }}
                                        className="flex-1 px-3 py-2 bg-input-background border border-input rounded-lg text-sm"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newMappings = fieldMappings.filter((_: any, i: number) => i !== index);
                                          setIntegrationCredentials({
                                            ...integrationCredentials,
                                            fieldMappings: JSON.stringify(newMappings),
                                          });
                                        }}
                                        className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex-shrink-0"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Fallback: Add Field manually */}
                          {(() => {
                            const fieldMappings: Array<{ key: string; label: string }> = (() => {
                              try {
                                return JSON.parse(integrationCredentials.fieldMappings || "[]");
                              } catch (e) {
                                return [];
                              }
                            })();
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  const newMappings = [...fieldMappings, { key: "", label: "" }];
                                  setIntegrationCredentials({
                                    ...integrationCredentials,
                                    fieldMappings: JSON.stringify(newMappings),
                                  });
                                }}
                                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-xl transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                                Add Field manually
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* Section: API Details */}
                      {selectedIntegration.id !== "whatsapp-business" && (
                        <h3 className="text-base font-semibold mb-4" style={TEXT_STYLES.heading}>
                          {selectedIntegration.id === "zadarma" ? "SIP Configuration" : "API Details"}
                        </h3>
                      )}
                      <div className="space-y-4">
                        {getIntegrationFields(selectedIntegration.id).map((field) => (
                          <div key={field.name}>
                            <div className="flex items-center gap-2 mb-2">
                              <label className="block text-sm font-medium">{field.label}</label>
                              {field.tooltip && (
                                <Tooltip text={field.tooltip}>
                                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                                </Tooltip>
                              )}
                            </div>

                            {field.type === "toggle" ? (
                              <label className="flex items-center gap-3 cursor-pointer">
                                <div className="relative">
                                  <input
                                    type="checkbox"
                                    checked={integrationCredentials[field.name] === "true"}
                                    onChange={(e) =>
                                      setIntegrationCredentials({
                                        ...integrationCredentials,
                                        [field.name]: e.target.checked ? "true" : "false",
                                      })
                                    }
                                    className="sr-only peer"
                                  />
                                  <div className="w-11 h-6 bg-muted rounded-full peer-checked:bg-primary transition-colors"></div>
                                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {integrationCredentials[field.name] === "true" ? "ON" : "OFF"}
                                </span>
                              </label>
                            ) : (
                              <div className="relative">
                                <input
                                  type={field.type === "password" && !visibleFields[field.name] ? "password" : "text"}
                                  value={integrationCredentials[field.name] || field.defaultValue || ""}
                                  onChange={(e) =>
                                    setIntegrationCredentials({
                                      ...integrationCredentials,
                                      [field.name]: e.target.value,
                                    })
                                  }
                                  placeholder={field.placeholder}
                                  disabled={field.readonly}
                                  className={`w-full px-4 py-2 pr-10 bg-input-background border border-input rounded-xl ${field.readonly ? "bg-muted cursor-not-allowed" : ""
                                    } ${validationErrors[field.name] ? "border-destructive" : ""}`}
                                />
                                {field.type === "password" && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setVisibleFields({
                                        ...visibleFields,
                                        [field.name]: !visibleFields[field.name],
                                      })
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                  >
                                    {visibleFields[field.name] ? (
                                      <EyeOff className="w-4 h-4" />
                                    ) : (
                                      <Eye className="w-4 h-4" />
                                    )}
                                  </button>
                                )}
                              </div>
                            )}

                            {validationErrors[field.name] && (
                              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {validationErrors[field.name]}
                              </p>
                            )}

                            {/* Helper text for API URL in Bitrix */}
                            {selectedIntegration.id === "bitrix24" && field.name === "apiUrl" && !validationErrors[field.name] && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Example: https://yourcompany.bitrix24.com/rest/1/xxxxxxxx/
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedIntegration?.id === "meta-leads" && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <p className="text-sm font-semibold text-blue-900">Webhook Endpoint (Auto-generated)</p>
                      </div>
                      <p className="text-xs text-blue-700">
                        After saving, register this URL in Meta Developer Portal → Webhooks:
                      </p>
                      <div className="flex items-center gap-2 bg-white border border-blue-200 rounded-lg px-3 py-2">
                        <code className="text-xs text-blue-800 flex-1 break-all">
                          https://app.mantraassist.com/api/webhooks/meta-leads
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText("https://app.mantraassist.com/api/webhooks/meta-leads");
                            toast.success("Webhook URL copied");
                          }}
                          className="flex-shrink-0 text-blue-600 hover:text-blue-800"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-blue-600">
                        Subscribe to: <strong>leadgen</strong> field under <strong>Page</strong> object.
                      </p>
                    </div>
                  )}

                  {selectedIntegration?.id === "whatsapp-business" && (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Connected WhatsApp Numbers ({connectedWhatsAppNumbers.length})
                          </label>
                          {connectedWhatsAppNumbers.map((num) => (
                            <div
                              key={num.id}
                              className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl"
                            >
                              <div className="flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-semibold text-green-900">
                                    {num.displayPhoneNumber}
                                  </p>
                                  <p className="text-xs text-green-700 mt-0.5">
                                    WABA ID: {num.wabaId || "WABA-META-CLOUD"} · Managed via Meta
                                  </p>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleDisconnectWhatsAppNumber(num.id)}
                                className="text-xs border-destructive text-destructive hover:bg-destructive/10 cursor-pointer"
                              >
                                Disconnect
                              </Button>
                            </div>
                          ))}
                        </div>

                        {!showAddWhatsAppNumberForm ? (
                          <button
                            type="button"
                            onClick={() => setShowAddWhatsAppNumberForm(true)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            + Add WhatsApp Number
                          </button>
                        ) : (
                          <div className="p-4 bg-gray-50 border border-border rounded-xl space-y-3">
                            <label className="block text-sm font-semibold text-gray-900">Add WhatsApp Phone Number</label>
                            <input
                              type="text"
                              value={newWhatsAppNumberInput}
                              onChange={(e) => setNewWhatsAppNumberInput(e.target.value)}
                              placeholder="+1 555 123 4567"
                              className="w-full px-3 py-2 bg-white border border-input rounded-xl text-sm"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={handleAddWhatsAppNumberSave}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer"
                              >
                                Save Number
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowAddWhatsAppNumberForm(false);
                                  setNewWhatsAppNumberInput("");
                                }}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="pt-2 text-center">
                          <button
                            type="button"
                            onClick={handleMetaEmbeddedSignup}
                            className="text-xs text-gray-500 hover:text-blue-600 underline cursor-pointer"
                          >
                            Or connect via Meta Embedded Signup (requires setup)
                          </button>
                        </div>
                      </div>
                    </div>
                  )}



                  {/* Test Connection Status */}
                  {testConnectionStatus === "success" && (
                    <div className="p-3 bg-success/10 border border-success/20 rounded-xl">
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle className="w-4 h-4" />
                        <p className="text-sm font-medium">Connection test successful</p>
                      </div>
                    </div>
                  )}

                  {testConnectionStatus === "error" && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="w-4 h-4" />
                        <p className="text-sm font-medium">Connection failed. Check credentials</p>
                      </div>
                    </div>
                  )}

                  {/* Salesforce Process Selection Section */}
                  {selectedIntegration.id === "salesforce" && (
                    <div id="salesforce-process-section" className={`border-t border-border pt-6 ${!salesforceConnectionTested ? "opacity-50 pointer-events-none" : ""}`}>
                      {/* Warning if not tested */}
                      {!salesforceConnectionTested && integrationCredentials.apiUrl && testConnectionStatus !== "success" && (
                        <div className="p-3 bg-warning/10 border border-warning/20 rounded-xl mb-4">
                          <div className="flex items-center gap-2 text-warning">
                            <AlertCircle className="w-4 h-4" />
                            <p className="text-sm font-medium">Test connection to enable process selection</p>
                          </div>
                        </div>
                      )}

                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold" style={TEXT_STYLES.heading}>Process Selection</h3>
                          <Tooltip text="Select the internal processes that should use this Salesforce integration.">
                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                          </Tooltip>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <label className="block text-sm font-medium">Select Process</label>
                            <Tooltip text="Select one or more processes linked to Salesforce.">
                              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                            </Tooltip>
                          </div>
                          <ProcessCheckboxDropdown
                            selectedProcesses={salesforceSelectedProcesses}
                            onChange={(processes) => {
                              setSalesforceSelectedProcesses(processes);
                              setSalesforceProcessValidationError("");
                            }}
                            availableProcesses={availableProcesses}
                            error={salesforceProcessValidationError}
                            disabled={!salesforceConnectionTested}
                          />
                          {salesforceProcessValidationError && (
                            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {salesforceProcessValidationError}
                            </p>
                          )}
                        </div>

                        {/* Selected Processes Display */}
                        {salesforceSelectedProcesses.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {salesforceSelectedProcesses.map((processId) => {
                              const process = availableProcesses.find((p) => p.id === processId);
                              return (
                                <span
                                  key={processId}
                                  className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md font-medium"
                                >
                                  {process?.label}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Meta Lead Ads Form Selection Section */}
                  {selectedIntegration.id === "meta-leads" && (
                    <div id="meta-leads-form-section" className={`border-t border-border pt-6 ${!metaLeadFormsConnectionTested ? "opacity-50 pointer-events-none" : ""}`}>
                      {/* Warning if not tested */}
                      {!metaLeadFormsConnectionTested && testConnectionStatus !== "success" && (
                        <div className="p-3 bg-warning/10 border border-warning/20 rounded-xl mb-4">
                          <div className="flex items-center gap-2 text-warning">
                            <AlertCircle className="w-4 h-4" />
                            <p className="text-sm font-medium">Test connection to enable form selection</p>
                          </div>
                        </div>
                      )}

                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold" style={TEXT_STYLES.heading}>Form Selection</h3>
                          <Tooltip text="Select the lead forms that should pull leads from Meta into MantraAssist.">
                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                          </Tooltip>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <label className="block text-sm font-medium">Select Forms</label>
                            <Tooltip text="Select one or more lead forms.">
                              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                            </Tooltip>
                          </div>
                          <ProcessCheckboxDropdown
                            selectedProcesses={metaSelectedForms}
                            onChange={(forms) => {
                              setMetaSelectedForms(forms);
                            }}
                            availableProcesses={metaMockForms}
                            disabled={!metaLeadFormsConnectionTested}
                          />
                        </div>

                        {/* Selected Forms Display */}
                        {metaSelectedForms.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {metaSelectedForms.map((formId) => {
                              const form = metaMockForms.find((f) => f.id === formId);
                              return (
                                <span
                                  key={formId}
                                  className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md font-medium"
                                >
                                  {form?.label}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bitrix Category Mapping Section (Collapsible) */}
                  {selectedIntegration.id === "bitrix24" && (
                    <div id="bitrix-mapping-section" className="border-t border-border pt-6">
                      <button
                        onClick={() => setIsMappingSectionExpanded(!isMappingSectionExpanded)}
                        disabled={!bitrixConnectionTested}
                        className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${!bitrixConnectionTested
                          ? "bg-muted/30 cursor-not-allowed opacity-50"
                          : "bg-muted/50 hover:bg-muted cursor-pointer"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`transform transition-transform ${isMappingSectionExpanded ? "rotate-90" : ""}`}>
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="text-left">
                            <h3 className="text-base font-semibold" style={TEXT_STYLES.heading}>Category to Process Mapping</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {bitrixConnectionTested
                                ? "Map Bitrix categories to processes for automation"
                                : "Test connection first to enable mapping"}
                            </p>
                          </div>
                        </div>
                        <Tooltip text="Map Bitrix deal categories to your internal processes for automated workflows.">
                          <HelpCircle className="w-4 h-4 text-muted-foreground" />
                        </Tooltip>
                      </button>

                      {/* Collapsible Content */}
                      <div
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${isMappingSectionExpanded ? "max-h-[2000px] opacity-100 mt-4" : "max-h-0 opacity-0"
                          }`}
                      >
                        <div className="space-y-4">
                          {/* Add Mapping Button */}
                          {!isAddingMapping && bitrixConnectionTested && isMappingSectionExpanded && (
                            <div className="flex justify-end">
                              <Tooltip text="Add a new Category ID and link it to one or more processes.">
                                <Button
                                  variant="primary"
                                  onClick={handleAddMapping}
                                  size="sm"
                                >
                                  <Plus className="w-4 h-4" />
                                  Add Mapping
                                </Button>
                              </Tooltip>
                            </div>
                          )}

                          {/* Mappings Table or Empty State */}
                          {categoryMappings.length > 0 || isAddingMapping ? (
                            <div className="border border-border rounded-xl overflow-hidden">
                              {/* Desktop Table */}
                              <div className="hidden md:block">
                                <table className="w-full table-fixed">
                                  <thead className="bg-muted/50">
                                    <tr>
                                      <th className="text-left px-4 py-3 text-xs font-semibold w-[25%]" style={TEXT_STYLES.subtext}>
                                        <div className="flex items-center gap-2">
                                          Category ID
                                          <Tooltip text="Numeric Bitrix category ID">
                                            <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                                          </Tooltip>
                                        </div>
                                      </th>
                                      <th className="text-left px-4 py-3 text-xs font-semibold w-[50%]" style={TEXT_STYLES.subtext}>
                                        <div className="flex items-center gap-2">
                                          Process Mapping
                                          <Tooltip text="Select one or more processes that should trigger when this category is used.">
                                            <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                                          </Tooltip>
                                        </div>
                                      </th>
                                      <th className="text-center px-4 py-3 text-xs font-semibold w-[25%]" style={TEXT_STYLES.subtext}>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border">
                                    {/* Existing Mappings */}
                                    {categoryMappings.map((mapping) => (
                                      <tr key={mapping.id} className="hover:bg-muted/30 transition-colors">
                                        {editingMapping?.id === mapping.id ? (
                                          <>
                                            <td className="px-4 py-3">
                                              <div>
                                                <input
                                                  type="number"
                                                  value={mappingFormData.categoryId}
                                                  onChange={(e) =>
                                                    setMappingFormData({ ...mappingFormData, categoryId: e.target.value })
                                                  }
                                                  placeholder="Enter ID"
                                                  className={`w-full px-3 py-2 bg-input-background border border-input rounded-lg text-sm ${mappingValidationErrors.categoryId ? "border-destructive" : ""
                                                    }`}
                                                  min="0"
                                                  step="1"
                                                />
                                                {mappingValidationErrors.categoryId && (
                                                  <p className="text-xs text-destructive mt-1">{mappingValidationErrors.categoryId}</p>
                                                )}
                                              </div>
                                            </td>
                                            <td className="px-4 py-3">
                                              <div>
                                                <ProcessCheckboxDropdown
                                                  selectedProcesses={mappingFormData.processes}
                                                  onChange={(processes) =>
                                                    setMappingFormData({ ...mappingFormData, processes })
                                                  }
                                                  availableProcesses={availableProcesses}
                                                  error={mappingValidationErrors.processes}
                                                />
                                                {mappingValidationErrors.processes && (
                                                  <p className="text-xs text-destructive mt-1">{mappingValidationErrors.processes}</p>
                                                )}
                                              </div>
                                            </td>
                                            <td className="px-4 py-3">
                                              <div className="flex items-center justify-center gap-2">
                                                <Tooltip text="Save changes to this mapping.">
                                                  <button
                                                    onClick={handleSaveMapping}
                                                    className="p-2 hover:bg-success/10 rounded-lg transition-colors"
                                                  >
                                                    <CheckCircle className="w-4 h-4 text-success" />
                                                  </button>
                                                </Tooltip>
                                                <Tooltip text="Discard changes.">
                                                  <button
                                                    onClick={handleCancelMapping}
                                                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                                                  >
                                                    <XCircle className="w-4 h-4 text-muted-foreground" />
                                                  </button>
                                                </Tooltip>
                                              </div>
                                            </td>
                                          </>
                                        ) : (
                                          <>
                                            <td className="px-4 py-3">
                                              <span className="font-medium text-sm">{mapping.categoryId}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                {mapping.processes.map((process) => (
                                                  <span
                                                    key={process}
                                                    className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md font-medium"
                                                  >
                                                    {process.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                                  </span>
                                                ))}
                                              </div>
                                            </td>
                                            <td className="px-4 py-3">
                                              <div className="flex items-center justify-center gap-2">
                                                <Tooltip text="Modify this mapping.">
                                                  <button
                                                    onClick={() => handleEditMapping(mapping)}
                                                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                                                  >
                                                    <Edit className="w-4 h-4 text-muted-foreground" />
                                                  </button>
                                                </Tooltip>
                                                <Tooltip text="Remove this mapping.">
                                                  <button
                                                    onClick={() => handleDeleteMappingClick(mapping)}
                                                    className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                                                  >
                                                    <Trash2 className="w-4 h-4 text-destructive" />
                                                  </button>
                                                </Tooltip>
                                              </div>
                                            </td>
                                          </>
                                        )}
                                      </tr>
                                    ))}

                                    {/* Add New Row */}
                                    {isAddingMapping && (
                                      <tr className="bg-primary/5">
                                        <td className="px-4 py-3">
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <input
                                                type="number"
                                                value={mappingFormData.categoryId}
                                                onChange={(e) =>
                                                  setMappingFormData({ ...mappingFormData, categoryId: e.target.value })
                                                }
                                                placeholder="Enter ID"
                                                className={`w-full max-w-[140px] px-3 py-2 bg-input-background border border-input rounded-lg text-sm ${mappingValidationErrors.categoryId ? "border-destructive" : ""
                                                  }`}
                                                min="0"
                                                step="1"
                                              />
                                            </div>
                                            {mappingValidationErrors.categoryId && (
                                              <p className="text-xs text-destructive mt-1">{mappingValidationErrors.categoryId}</p>
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-4 py-3">
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <ProcessCheckboxDropdown
                                                selectedProcesses={mappingFormData.processes}
                                                onChange={(processes) =>
                                                  setMappingFormData({ ...mappingFormData, processes })
                                                }
                                                availableProcesses={availableProcesses}
                                                error={mappingValidationErrors.processes}
                                              />
                                            </div>
                                            {mappingValidationErrors.processes && (
                                              <p className="text-xs text-destructive mt-1">{mappingValidationErrors.processes}</p>
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-4 py-3">
                                          <div className="flex items-center justify-end gap-2">
                                            <Tooltip text="Create this mapping.">
                                              <button
                                                onClick={handleSaveMapping}
                                                className="p-2 hover:bg-success/10 rounded-lg transition-colors"
                                              >
                                                <CheckCircle className="w-4 h-4 text-success" />
                                              </button>
                                            </Tooltip>
                                            <Tooltip text="Discard this new entry.">
                                              <button
                                                onClick={handleCancelMapping}
                                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                                              >
                                                <XCircle className="w-4 h-4 text-muted-foreground" />
                                              </button>
                                            </Tooltip>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>

                              {/* Mobile Cards - simplified for space */}
                              <div className="md:hidden divide-y divide-border">
                                {categoryMappings.map((mapping) => (
                                  <div key={mapping.id} className="p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium">Category ID: {mapping.categoryId}</span>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleEditMapping(mapping)}
                                          className="p-2 hover:bg-muted rounded-lg"
                                        >
                                          <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteMappingClick(mapping)}
                                          className="p-2 hover:bg-destructive/10 rounded-lg"
                                        >
                                          <Trash2 className="w-4 h-4 text-destructive" />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {mapping.processes.map((process) => (
                                        <span
                                          key={process}
                                          className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md"
                                        >
                                          {process.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                                <SettingsIcon className="w-6 h-6 text-muted-foreground" />
                              </div>
                              <h4 className="font-semibold mb-1" style={TEXT_STYLES.heading}>No mappings added yet</h4>
                              <p className="text-sm text-muted-foreground mb-4">
                                Start by adding your first category mapping
                              </p>
                              <Tooltip text="Start by adding your first category mapping.">
                                <Button variant="outline" onClick={handleAddMapping} size="sm">
                                  <Plus className="w-4 h-4" />
                                  Add Mapping
                                </Button>
                              </Tooltip>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t border-border">
                    <Tooltip text="Discard changes and close setup.">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowIntegrationModal(false);
                          setSelectedIntegration(null);
                          setIntegrationCredentials({});
                          setVisibleFields({});
                          setTestConnectionStatus("idle");
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </Tooltip>
                    {selectedIntegration.id !== "whatsapp-business" && (
                      <Tooltip
                        text={
                          selectedIntegration.id === "bitrix24"
                            ? "Verify if the API URL is working correctly."
                            : selectedIntegration.id === "salesforce"
                              ? "Verify if the API URL and authorization token are working."
                              : "Verify credentials before saving"
                        }
                      >
                        <Button
                          variant="outline"
                          onClick={handleTestConnection}
                          loading={isTestingConnection}
                          className="flex-1"
                        >
                          Test Connection
                        </Button>
                      </Tooltip>
                    )}
                    <Tooltip
                      text={
                        selectedIntegration.id === "bitrix24"
                          ? (!bitrixConnectionTested
                            ? "Test connection first to enable saving"
                            : "Save API and category mappings together.")
                          : selectedIntegration.id === "salesforce"
                            ? (!salesforceConnectionTested
                              ? "Test connection first to enable saving"
                              : "Save Salesforce API details and process selection.")
                            : "Save and activate this provider"
                      }
                    >
                      <Button
                        variant="primary"
                        onClick={handleSaveIntegration}
                        className="flex-1"
                        disabled={
                          (selectedIntegration.id === "bitrix24" && !bitrixConnectionTested) ||
                          (selectedIntegration.id === "salesforce" && !salesforceConnectionTested)
                        }
                      >
                        <Save className="w-4 h-4" />
                        {selectedIntegration.id === "bitrix24" || selectedIntegration.id === "salesforce"
                          ? "Save Configuration"
                          : "Save Integration"}
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              )}

              {/* Numbers & Routing Tab */}
              {integrationConfigTab === "numbers" && (
                <div className="space-y-6">
                  {/* Numbers Table Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold" style={TEXT_STYLES.heading}>Manage Numbers</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Configure phone numbers for this provider
                      </p>
                    </div>
                    <Button variant="primary" onClick={handleAddNumber} size="sm">
                      <Plus className="w-4 h-4" />
                      Add Number
                    </Button>
                  </div>

                  {/* Numbers Table */}
                  {telephonyNumbers.filter((n) => n.provider === selectedIntegration.id).length > 0 ? (
                    <div className="border border-border rounded-xl overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left px-4 py-3 text-xs font-semibold" style={TEXT_STYLES.subtext}>Number</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold" style={TEXT_STYLES.subtext}>Country</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold" style={TEXT_STYLES.subtext}>Provider</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold" style={TEXT_STYLES.subtext}>Status</th>
                            <th className="text-right px-4 py-3 text-xs font-semibold" style={TEXT_STYLES.subtext}>Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {telephonyNumbers
                            .filter((n) => n.provider === selectedIntegration.id)
                            .map((number) => (
                              <tr
                                key={number.id}
                                className={`hover:bg-muted/30 transition-colors ${number.isDefault ? "bg-primary/5" : ""
                                  }`}
                              >
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">{number.number}</span>
                                    {number.isDefault && (
                                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">
                                        Default
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm">{number.country}</td>
                                <td className="px-4 py-3 text-sm text-muted-foreground capitalize">
                                  {selectedIntegration.name}
                                </td>
                                <td className="px-4 py-3">
                                  <label className="flex items-center gap-2 cursor-pointer w-fit">
                                    <div className="relative">
                                      <input
                                        type="checkbox"
                                        checked={number.status === "active"}
                                        onChange={() => handleToggleNumberStatus(number.id)}
                                        className="sr-only peer"
                                      />
                                      <div className="w-11 h-6 bg-muted rounded-full peer-checked:bg-primary transition-colors"></div>
                                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                                    </div>
                                    <span className="text-xs" style={TEXT_STYLES.subtext}>
                                      {number.status === "active" ? "Active" : "Inactive"}
                                    </span>
                                  </label>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => handleEditNumber(number)}
                                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                                      title="Edit number"
                                    >
                                      <Edit className="w-4 h-4 text-muted-foreground" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteNumber(number.id)}
                                      className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                                      title="Delete number"
                                    >
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                      <Phone className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <h4 className="font-semibold mb-1" style={TEXT_STYLES.heading}>No numbers configured</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Add a phone number to start routing calls through this provider
                      </p>
                      <Button variant="outline" onClick={handleAddNumber} size="sm">
                        <Plus className="w-4 h-4" />
                        Add Your First Number
                      </Button>
                    </div>
                  )}

                  {/* Routing Settings */}
                  {telephonyNumbers.filter((n) => n.provider === selectedIntegration.id).length > 0 && (
                    <div className="border border-border rounded-xl p-4">
                      <h4 className="font-semibold mb-4 flex items-center gap-2" style={TEXT_STYLES.heading}>
                        <SettingsIcon className="w-4 h-4" />
                        Routing Configuration
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Default Number</label>
                          <select
                            value={defaultNumber}
                            onChange={(e) => setDefaultNumber(e.target.value)}
                            className="w-full px-4 py-2 bg-input-background border border-input rounded-xl"
                          >
                            <option value="">Select default number</option>
                            {telephonyNumbers
                              .filter(
                                (n) => n.provider === selectedIntegration.id && n.status === "active"
                              )
                              .map((number) => (
                                <option key={number.id} value={number.id}>
                                  {number.number} ({number.country})
                                </option>
                              ))}
                          </select>
                          <p className="text-xs text-muted-foreground mt-1">
                            Primary number for outbound calls
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Fallback Number</label>
                          <select
                            value={fallbackNumber}
                            onChange={(e) => setFallbackNumber(e.target.value)}
                            className="w-full px-4 py-2 bg-input-background border border-input rounded-xl"
                          >
                            <option value="">Select fallback number</option>
                            {telephonyNumbers
                              .filter(
                                (n) =>
                                  n.provider === selectedIntegration.id &&
                                  n.status === "active" &&
                                  n.id !== defaultNumber
                              )
                              .map((number) => (
                                <option key={number.id} value={number.id}>
                                  {number.number} ({number.country})
                                </option>
                              ))}
                          </select>
                          <p className="text-xs text-muted-foreground mt-1">
                            Backup when default is unavailable
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </Drawer>

        {/* Delete Mapping Confirmation Modal */}
        <Modal
          isOpen={showDeleteMappingModal}
          onClose={() => {
            setShowDeleteMappingModal(false);
            setMappingToDelete(null);
          }}
          title="Delete Mapping"
          footer={
            <div className="flex gap-3">
              <Tooltip text="Go back without deleting.">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteMappingModal(false);
                    setMappingToDelete(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </Tooltip>
              <Tooltip text="Permanently remove this mapping.">
                <Button variant="primary" onClick={confirmDeleteMapping} className="flex-1">
                  Confirm
                </Button>
              </Tooltip>
            </div>
          }
        >
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this mapping?
          </p>
        </Modal>

        {/* Mailbox Integration Drawer */}
        <Drawer
          isOpen={showMailboxModal}
          onClose={() => setShowMailboxModal(false)}
          title={
            <div className="flex items-center gap-3">
              {selectedMailboxProvider === "gmail" ? (
                <div className="w-8 h-8 rounded-lg bg-white border border-border flex items-center justify-center shadow-sm">
                  <svg viewBox="0 0 48 48" className="w-5 h-5">
                    <g>
                      <path fill="#EA4335" d="M6 8v32h12V27.7L6 8z" />
                      <path fill="#34A853" d="M42 8v32H30V27.7L42 8z" />
                      <path fill="#4285F4" d="M6 8l18 12.3L42 8H6z" />
                      <path fill="#FBBC05" d="M18 27.7V40h12V27.7L24 31.7l-6-4z" />
                    </g>
                  </svg>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-[#0078D4] flex items-center justify-center shadow-sm">
                  <svg viewBox="0 0 32 32" className="w-5 h-5" fill="white">
                    <rect x="2" y="8" width="14" height="18" rx="1" fill="white" opacity="0.9" />
                    <ellipse cx="9" cy="17" rx="4" ry="5" fill="#0078D4" />
                    <rect x="16" y="4" width="14" height="6" rx="0.5" fill="white" opacity="0.8" />
                    <rect x="16" y="11" width="14" height="6" rx="0.5" fill="white" opacity="0.6" />
                    <rect x="16" y="18" width="14" height="6" rx="0.5" fill="white" opacity="0.4" />
                  </svg>
                </div>
              )}
              <span>Mailbox Integration</span>
            </div>
          }
          footer={
            <>
              <button
                onClick={() => setShowMailboxModal(false)}
                className="flex-1 px-4 py-2 border border-border text-sm font-semibold rounded-lg hover:bg-muted transition-colors uppercase tracking-wide"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIntegrations(integrations.map((i) => i.id === selectedMailboxProvider ? { ...i, connected: true } : i));
                  setShowMailboxModal(false);
                }}
                className="flex-1 px-4 py-2 bg-[#10B981] text-white text-sm font-semibold rounded-lg hover:bg-[#059669] transition-colors uppercase tracking-wide"
              >
                Connect
              </button>
            </>
          }
        >
          <div className="space-y-5">
            {/* Outgoing email parameters */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Outgoing email parameters</h3>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mailboxOutgoingSenderName}
                  onChange={(e) => setMailboxOutgoingSenderName(e.target.checked)}
                  className="w-4 h-4 rounded text-primary mt-0.5"
                />
                <span className="text-sm">Use the same sender name for every message instead of the actual sender</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mailboxDailyEmailLimit}
                  onChange={(e) => setMailboxDailyEmailLimit(e.target.checked)}
                  className="w-4 h-4 rounded text-primary mt-0.5"
                />
                <span className="text-sm">Set daily email limit</span>
              </label>
            </div>

            {/* CRM Integration */}
            <div className="flex items-center justify-between py-3 border-t border-border">
              <h3 className="text-sm font-semibold">CRM integration</h3>
              <button
                onClick={() => setMailboxCRMIntegration(!mailboxCRMIntegration)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${mailboxCRMIntegration ? "bg-primary" : "bg-switch-background"}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${mailboxCRMIntegration ? "translate-x-4.5" : "translate-x-0.5"}`} />
              </button>
            </div>

            {/* Calendar Integration */}
            <div className="border-t border-border pt-4 space-y-2">
              <h3 className="text-sm font-semibold">Calendar integration</h3>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mailboxAddToCalendar}
                  onChange={(e) => setMailboxAddToCalendar(e.target.checked)}
                  className="w-4 h-4 rounded text-primary"
                />
                <span className="text-sm">Automatically add events to calendar</span>
              </label>
            </div>

            {/* Mailbox Access */}
            <div className="border-t border-border pt-4 space-y-3">
              <h3 className="text-sm font-semibold">Mailbox access</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Give the employees access permission to this mailbox so they could receive and reply to email messages. {"It's"} a simple, effortless way to set up a collaboration environment for your sales department or helpdesk service.
              </p>
              {/* User pills */}
              <div className="flex flex-wrap gap-2 min-h-[32px] p-2 rounded-lg border border-input bg-input-background">
                {mailboxUsers.map((user) => (
                  <span key={user} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                    {user}
                    <button onClick={() => setMailboxUsers(mailboxUsers.filter((u) => u !== user))} className="hover:text-destructive">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={mailboxUserInput}
                  onChange={(e) => setMailboxUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === ",") && mailboxUserInput.trim()) {
                      e.preventDefault();
                      setMailboxUsers([...mailboxUsers, mailboxUserInput.trim()]);
                      setMailboxUserInput("");
                    }
                  }}
                  placeholder="Type name and press Enter..."
                  className="flex-1 min-w-24 text-xs bg-transparent outline-none placeholder:text-muted-foreground"
                />
              </div>
              <button
                onClick={() => {
                  if (mailboxUserInput.trim()) {
                    setMailboxUsers([...mailboxUsers, mailboxUserInput.trim()]);
                    setMailboxUserInput("");
                  }
                }}
                className="text-primary text-sm hover:underline"
              >
                + Add
              </button>
            </div>
          </div>
        </Drawer>

        {/* Twilio SMS Connection Drawer */}
        <Drawer
          isOpen={showSMSModal}
          onClose={() => setShowSMSModal(false)}
          title={
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#F22F46] flex items-center justify-center shadow-sm">
                <svg viewBox="0 0 48 48" className="w-5 h-5" fill="white">
                  <circle cx="24" cy="24" r="18" fill="none" stroke="white" strokeWidth="4" />
                  <circle cx="17" cy="17" r="3" fill="white" />
                  <circle cx="31" cy="17" r="3" fill="white" />
                  <circle cx="17" cy="31" r="3" fill="white" />
                  <circle cx="31" cy="31" r="3" fill="white" />
                </svg>
              </div>
              <span>Twilio SMS Integration</span>
            </div>
          }
          footer={
            <>
              <button
                onClick={() => setShowSMSModal(false)}
                className="flex-1 px-4 py-2 border border-border text-sm font-semibold rounded-lg hover:bg-muted transition-colors uppercase tracking-wide"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!smsTwilioSID.trim() || !smsTwilioToken.trim()) {
                    return;
                  }
                  setIntegrations(integrations.map((i) => i.id === "twilio-sms" ? { ...i, connected: true } : i));
                  setShowSMSModal(false);
                  setSmsTwilioSID("");
                  setSmsTwilioToken("");
                }}
                disabled={!smsTwilioSID.trim() || !smsTwilioToken.trim()}
                className="flex-1 px-4 py-2 bg-[#10B981] text-white text-sm font-semibold rounded-lg hover:bg-[#059669] transition-colors uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Connect
              </button>
            </>
          }
        >
          <div className="space-y-6">
            {/* Input Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  SID <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={smsTwilioSID}
                  onChange={(e) => setSmsTwilioSID(e.target.value)}
                  placeholder="Enter your Twilio Account SID"
                  className="w-full px-3 py-2 text-sm bg-input-background border border-input rounded-lg outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Token <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={smsTwilioToken}
                  onChange={(e) => setSmsTwilioToken(e.target.value)}
                  placeholder="Enter your Twilio Auth Token"
                  className="w-full px-3 py-2 text-sm bg-input-background border border-input rounded-lg outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Intro */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Provides easy and hassle-free SMS messaging.</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground pl-1">
                <li>Send messages directly from lead, deal, client or quote.</li>
                <li>Configure rules to send SMS messages to a client or employee at a specified time or when a specified task is completed.</li>
                <li>Bulk send SMS messages from a list of clients, deals, leads or other CRM entities.</li>
              </ul>
            </div>

            {/* Step 1 */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-[#0D9488] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">1</span>
                </div>
                <p className="text-sm font-semibold">Configure twilio.com parameters and start using SMS notification</p>
              </div>
              <ul className="space-y-2 pl-10">
                <li className="text-sm text-muted-foreground">
                  Log in or create a new account with{" "}
                  <a href="https://www.twilio.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">twilio.com</a>
                </li>
                <li className="text-sm text-muted-foreground">Register and configure an SMS sender phone number</li>
                <li className="text-sm text-muted-foreground">
                  Copy the Token and SID on your{" "}
                  <a href="https://www.twilio.com/console" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">twilio.com</a>
                  {" "}profile page
                </li>
                <li className="text-sm text-muted-foreground">Paste the Token and SID in the field below</li>
              </ul>
            </div>
          </div>
        </Drawer>

        {/* How it Works Modal */}
        <Modal
          isOpen={showHowItWorksModal}
          onClose={() => {
            setShowHowItWorksModal(false);
            setHowItWorksTab("");
          }}
          title={getHowItWorksContent(howItWorksTab).title}
          maxWidth="2xl"
          footer={
            <Button
              variant="primary"
              onClick={() => {
                setShowHowItWorksModal(false);
                setHowItWorksTab("");
              }}
            >
              Got it
            </Button>
          }
        >
          <div className="space-y-6">
            {/* Video Section */}
            <div className="bg-muted/30 rounded-xl border-2 border-dashed border-border overflow-hidden">
              <div className="aspect-video flex flex-col items-center justify-center p-8">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Play className="w-10 h-10 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2" style={TEXT_STYLES.heading}>
                  Video tutorial for {howItWorksTab === "voice-config" ? "AI Voices / Models" : howItWorksTab.charAt(0).toUpperCase() + howItWorksTab.slice(1).replace("-", " ")}
                </h3>
                <p className="text-sm text-muted-foreground">Placeholder for embedded video player</p>
              </div>
            </div>

            {/* Description Section */}
            <div className="prose prose-sm max-w-none">
              <p className="text-foreground leading-relaxed">
                {getHowItWorksContent(howItWorksTab).description}
              </p>
            </div>
          </div>
        </Modal>

        {/* Voice Preview Compact Popup */}
        {showVoicePreviewModal && selectedVoiceForPreview && createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
            onClick={() => {
              setShowVoicePreviewModal(false);
              setSelectedVoiceForPreview(null);
            }}
          >
            <div
              className="bg-white rounded-lg shadow-lg border border-gray-200"
              style={{ width: '320px', height: '140px' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  {selectedVoiceForPreview.name}
                </h3>
                <button
                  onClick={() => {
                    setShowVoicePreviewModal(false);
                    setSelectedVoiceForPreview(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Meta Info Row */}
              <div className="px-4 pb-2">
                <p className="text-xs text-gray-500" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  {selectedVoiceForPreview.gender} · {selectedVoiceForPreview.country} · {selectedVoiceForPreview.tone} · {selectedVoiceForPreview.age}
                </p>
              </div>

              {/* Audio Player Row */}
              <div className="px-4 pb-3">
                <div className="flex items-center gap-2">
                  {/* Play/Pause Button */}
                  <button
                    className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors"
                    title="Play"
                  >
                    <Play className="w-3.5 h-3.5 ml-0.5" />
                  </button>

                  {/* Progress Bar */}
                  <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '0%' }}></div>
                  </div>

                  {/* Timestamp */}
                  <span className="text-xs text-gray-500 flex-shrink-0" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    0:00 / 0:15
                  </span>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Voice Library Modal */}
        <Modal
          isOpen={showVoiceLibraryModal}
          onClose={() => {
            setShowVoiceLibraryModal(false);
            setVoiceLibraryTab("library");
          }}
          title="Voice Library"
          maxWidth="voice-lib"
        >
          {/* Tab Bar - Sticky at top, flush with header, 40px height */}
          <div className="sticky top-0 bg-white z-10 px-6 py-2.5 border-b border-border overflow-hidden">
            <div className="flex items-center justify-between h-10">
              <div className="flex gap-2">
                <button
                  onClick={() => setVoiceLibraryTab("library")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[13px] font-medium transition-all ${voiceLibraryTab === "library"
                    ? "bg-primary text-white"
                    : "border border-border text-muted-foreground hover:bg-muted/50"
                    }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  Voice Library
                </button>
                <button
                  onClick={() => setVoiceLibraryTab("clone")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[13px] font-medium transition-all ${voiceLibraryTab === "clone"
                    ? "bg-primary text-white"
                    : "border border-border text-muted-foreground hover:bg-muted/50"
                    }`}
                >
                  <Copy className="w-3.5 h-3.5" />
                  Clone Voice
                </button>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <button
                  onClick={() => setShowCreditsModal(true)}
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <Info className="w-3.5 h-3.5" />
                  How Credits Work
                </button>
                <a href="#" className="flex items-center gap-1 text-primary hover:underline">
                  Learn More
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Tab Content - Scrollable */}
          <div className="px-6 pt-6 pb-6">
            {/* Voice Library Tab */}
            {voiceLibraryTab === "library" && (
              <div className="space-y-6">
                {/* Search + Filter Row */}
                <VoiceSearchFilter
                  searchQuery={voiceSearchQuery}
                  onSearchChange={setVoiceSearchQuery}
                  onFilterApply={setVoiceFilters}
                />

                {/* Current Voice Carousel Section */}
                <div>
                  <h3 className="text-[13px] font-semibold mb-3 uppercase tracking-wide text-muted-foreground">Current Voice</h3>
                  <div className="flex gap-3 items-stretch">
                    {/* Carousel Column */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {/* Left Arrow */}
                        {currentVoices.length > 1 && (
                          <button
                            onClick={() => scrollCarousel("left")}
                            className="flex-shrink-0 w-7 h-7 rounded-full border border-[#E5E7EB] bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
                          >
                            <ChevronLeft className="w-4 h-4 text-gray-600" />
                          </button>
                        )}
                        {/* Scrollable Row */}
                        <div
                          ref={carouselRef}
                          className="flex gap-3 overflow-x-auto flex-1 scrollbar-hide"
                        >
                          {currentVoices.map((voice) => (
                            <div
                              key={voice.id}
                              className="flex-shrink-0 relative group"
                              style={{ width: "280px" }}
                              onMouseEnter={() => setHoveredCarouselVoice(voice)}
                              onMouseLeave={() => setHoveredCarouselVoice(null)}
                            >
                              {/* Remove button */}
                              {currentVoices.length > 1 && (
                                <button
                                  onClick={() => handleRemoveFromCarousel(voice.name)}
                                  className="absolute top-2 left-2 z-10 w-5 h-5 rounded-full bg-white border border-gray-200 shadow-sm items-center justify-center hidden group-hover:flex hover:bg-red-50 hover:border-red-300 transition-colors"
                                  title="Remove voice"
                                >
                                  <X className="w-3 h-3 text-gray-500 hover:text-red-500" />
                                </button>
                              )}
                              <VoiceCard
                                name={voice.name}
                                gender={voice.gender}
                                country={voice.country}
                                tags={voice.tags}
                                isSelected={true}
                                showSelectButton={false}
                                onPreview={() => handlePreviewVoiceFromLibrary(voice)}
                              />
                            </div>
                          ))}
                        </div>
                        {/* Right Arrow */}
                        {currentVoices.length > 1 && (
                          <button
                            onClick={() => scrollCarousel("right")}
                            className="flex-shrink-0 w-7 h-7 rounded-full border border-[#E5E7EB] bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
                          >
                            <ChevronRight className="w-4 h-4 text-gray-600" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Demo Panel */}
                    <div className="flex-shrink-0 w-48 bg-white border border-[#E5E7EB] rounded-xl p-3 overflow-hidden flex flex-col">
                      <div className="flex items-center gap-1.5 mb-2 flex-shrink-0">
                        <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">
                          {hoveredCarouselVoice ? hoveredCarouselVoice.name : "Demo Video"}
                        </span>
                      </div>
                      <div className="bg-[#F3F4F6] rounded-lg flex items-center justify-center flex-1 min-h-0">
                        <div className="text-center px-2">
                          <div className="w-8 h-8 bg-gray-300 rounded-full mx-auto mb-1.5 flex items-center justify-center">
                            <Play className="w-4 h-4 text-gray-500" />
                          </div>
                          {hoveredCarouselVoice ? (
                            <p className="text-xs text-gray-500">{hoveredCarouselVoice.gender} · {hoveredCarouselVoice.country}</p>
                          ) : (
                            <p className="text-xs text-gray-500">Hover a card to preview</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Featured Voices */}
                <div>
                  <h3 className="text-[13px] font-semibold mb-3 uppercase tracking-wide text-muted-foreground">Featured Voices</h3>
                  {filteredFeaturedVoices.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {filteredFeaturedVoices.map((voice) => (
                        <VoiceCard
                          key={voice.name}
                          name={voice.name}
                          gender={voice.gender}
                          country={voice.country}
                          tags={voice.tags}
                          isSelected={isVoiceSelected(voice.name)}
                          showSelectButton={true}
                          onSelect={() => handleSelectVoice(voice)}
                          onPreview={() => handlePreviewVoiceFromLibrary(voice)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No voices found matching your search and filters.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Clone Voice Tab */}
            {voiceLibraryTab === "clone" && (
              <div className="space-y-4">
                {/* Warning Banner */}
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-xs text-amber-900 mb-0.5">Cloned voices are inbound only</p>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Due to legal restrictions on AI voice replication, cloned voices cannot be selected for agents used in outbound call sequences. Use a licensed or synthetic voice for outbound.
                    </p>
                  </div>
                </div>

                {/* Create Custom Voice Form */}
                <div className="bg-white border border-border rounded-xl p-4">
                  <h3 className="text-sm font-semibold mb-1">Create Custom Voice</h3>
                  <p className="text-xs text-muted-foreground mb-4">Upload an audio file or record directly to create your own voice clone</p>

                  <div className="space-y-3">
                    {/* Voice Name */}
                    <div>
                      <label className="block text-xs font-medium mb-1.5">Voice Name *</label>
                      <Input
                        value={cloneVoiceFormData.name}
                        onChange={(e) => setCloneVoiceFormData({ ...cloneVoiceFormData, name: e.target.value })}
                        placeholder="Enter a name for your custom voice"
                        className="text-sm"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-medium mb-1.5">Description *</label>
                      <textarea
                        value={cloneVoiceFormData.description}
                        onChange={(e) => setCloneVoiceFormData({ ...cloneVoiceFormData, description: e.target.value })}
                        placeholder="Describe your custom voice"
                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-xs"
                        rows={3}
                      />
                    </div>

                    {/* Voice Provider */}
                    <div>
                      <label className="block text-xs font-medium mb-2">Voice Provider *</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCloneVoiceProvider("elevenlabs")}
                          className={`flex-1 px-4 py-2 rounded-lg font-medium text-[13px] transition-all ${cloneVoiceProvider === "elevenlabs"
                            ? "bg-primary text-white shadow-md"
                            : "bg-muted/30 text-muted-foreground hover:bg-muted/50 border border-border"
                            }`}
                        >
                          Elevenlabs
                        </button>
                        <button
                          onClick={() => setCloneVoiceProvider("cartesia")}
                          className={`flex-1 px-4 py-2 rounded-lg font-medium text-[13px] transition-all ${cloneVoiceProvider === "cartesia"
                            ? "bg-primary text-white shadow-md"
                            : "bg-muted/30 text-muted-foreground hover:bg-muted/50 border border-border"
                            }`}
                        >
                          Cartesia
                        </button>
                      </div>
                    </div>

                    {/* Audio Source */}
                    <div>
                      <label className="block text-xs font-medium mb-2">Audio Source</label>
                      <div className="flex gap-2">
                        <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 border border-border bg-white rounded-lg hover:bg-gray-50 transition-colors text-[13px] font-medium">
                          <UploadCloud className="w-4 h-4" />
                          Select File
                        </button>
                        <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 border border-border bg-white rounded-lg hover:bg-gray-50 transition-colors text-[13px] font-medium">
                          <Mic className="w-4 h-4" />
                          Start Recording
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1.5">Maximum file size: 10 MB • Supported formats: WAV, MP3</p>
                    </div>

                    {/* Create Button */}
                    <button
                      onClick={() => {
                        if (!cloneVoiceFormData.name || !cloneVoiceFormData.description) {
                          toast.error("Please fill in all required fields");
                          return;
                        }
                        toast.success("Voice clone created successfully!");
                        setShowVoiceLibraryModal(false);
                        setCloneVoiceFormData({ name: "", description: "" });
                      }}
                      className="w-full py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-[13px] font-medium"
                    >
                      Create Voice Clone
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>

        {/* How Credits Work Modal */}
        <Modal
          isOpen={showCreditsModal}
          onClose={() => setShowCreditsModal(false)}
          title="Voice Credits Explained"
          maxWidth="md"
        >
          <div className="space-y-4">
            {/* What are Voice Credits */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">What are Voice Credits?</h4>
                <p className="text-sm text-muted-foreground">
                  Voice credits are the currency that powers your AI receptionist's voice capabilities. They're simple to understand and easy to manage.
                </p>
              </div>
            </div>

            {/* Prorated by the Second */}
            <div className="flex items-start gap-3 p-4 bg-white border border-border rounded-lg">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Prorated by the Second</h4>
                <p className="text-sm text-muted-foreground">
                  Credits are charged by the second, not by the minute. You'll only pay for the exact duration used, so short or partial minutes won't cost you a full credit.
                </p>
              </div>
            </div>

            {/* 1 credit = 12¢ */}
            <div className="flex items-start gap-3 p-4 bg-white border border-border rounded-lg">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">1 credit = 12¢</h4>
                <p className="text-sm text-muted-foreground">
                  Each credit costs 12 cents, making it easy to understand your costs.
                </p>
              </div>
            </div>

            {/* Monthly Free Credits */}
            <div className="flex items-start gap-3 p-4 bg-white border border-border rounded-lg">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Monthly Free Credits</h4>
                <p className="text-sm text-muted-foreground">
                  Your plan includes free credits that automatically renew each month.
                </p>
              </div>
            </div>

            {/* Auto-Reload Available */}
            <div className="flex items-start gap-3 p-4 bg-white border border-border rounded-lg">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm">Auto-Reload Available</h4>
                  <button className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <SettingsIcon className="w-3 h-3" />
                    Configure
                  </button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enable auto-reload to ensure your receptionist is always available to take calls.
                </p>
              </div>
            </div>

            {/* Transferred Call Usage */}
            <div className="flex items-start gap-3 p-4 bg-white border border-border rounded-lg">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Transferred Call Usage</h4>
                <p className="text-sm text-muted-foreground">
                  Each transferred call uses 0.25 credits per minute = $0.03 per minute.
                </p>
              </div>
            </div>

            {/* Footer Link */}
            <div className="text-center pt-4 border-t border-border">
              <a href="#" className="text-sm text-primary hover:underline flex items-center justify-center gap-1">
                Read our complete pricing guide
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </Modal>

        {/* Add Custom Field Modal */}
        {showAddFieldModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Create Custom Field</h3>
                <button
                  onClick={() => {
                    setShowAddFieldModal(false);
                    setNewFieldData({ label: "", key: "", type: "String", required: false, multiple: false, showAlways: true, enableTooltip: false, visibleToSelected: false });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Field Name</label>
                  <input
                    type="text"
                    value={newFieldData.label}
                    onChange={(e) => setNewFieldData({ ...newFieldData, label: e.target.value })}
                    placeholder="e.g. Insurance ID"
                    className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Field Type</label>
                  <select
                    value={newFieldData.type}
                    onChange={(e) => setNewFieldData({ ...newFieldData, type: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white appearance-none bg-no-repeat bg-right pr-10"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundSize: '1.5em 1.5em',
                    }}
                  >
                    <option value="String">String</option>
                    <option value="List">List</option>
                    <option value="Date/Time">Date/Time</option>
                    <option value="Date">Date</option>
                    <option value="Book a Resource">Book a Resource</option>
                    <option value="Address">Address</option>
                    <option value="Link">Link</option>
                    <option value="File">File</option>
                    <option value="Money">Money</option>
                    <option value="Yes/No">Yes/No</option>
                    <option value="Number">Number</option>
                    <option value="WhatsApp Link">WhatsApp Link</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newFieldData.multiple || false}
                      onChange={(e) => setNewFieldData({ ...newFieldData, multiple: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">Multiple</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newFieldData.showAlways !== undefined ? newFieldData.showAlways : true}
                      onChange={(e) => setNewFieldData({ ...newFieldData, showAlways: e.target.checked })}
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
                      checked={newFieldData.enableTooltip || false}
                      onChange={(e) => setNewFieldData({ ...newFieldData, enableTooltip: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">Enable field tooltip</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newFieldData.visibleToSelected || false}
                      onChange={(e) => setNewFieldData({ ...newFieldData, visibleToSelected: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">Make this field visible to selected users only</span>
                  </label>
                </div>
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddFieldModal(false);
                      setNewFieldData({ label: "", key: "", type: "String", required: false, multiple: false, showAlways: true, enableTooltip: false, visibleToSelected: false });
                    }}
                    className="text-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    disabled={!newFieldData.label}
                    onClick={() => {
                      if (!newFieldData.label) {
                        toast.error("Please enter a field name");
                        return;
                      }
                      const key = newFieldData.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                      const inputType = FIELD_TYPE_MAP[newFieldData.type] || "text";

                      addCustomField(currentModule, {
                        label: newFieldData.label,
                        key: key,
                        module: currentModule,
                        inputType: inputType,
                        required: newFieldData.required,
                        placeholder: `Enter ${newFieldData.label.toLowerCase()}`
                      });

                      setShowAddFieldModal(false);
                      setNewFieldData({ label: "", key: "", type: "String", required: false, multiple: false, showAlways: true, enableTooltip: false, visibleToSelected: false });
                      toast.success("Custom field created successfully");
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

        {/* Edit Custom Field Modal */}
        {editingFieldId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Edit Custom Field</h3>
                <button
                  onClick={() => setEditingFieldId(null)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Field Name</label>
                  <input
                    type="text"
                    value={editingFieldData.label}
                    onChange={(e) => setEditingFieldData({ ...editingFieldData, label: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Field Type</label>
                  <select
                    value={editingFieldData.type}
                    onChange={(e) => setEditingFieldData({ ...editingFieldData, type: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white appearance-none bg-no-repeat bg-right pr-10"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundSize: '1.5em 1.5em',
                    }}
                  >
                    <option value="String">String</option>
                    <option value="List">List</option>
                    <option value="Date/Time">Date/Time</option>
                    <option value="Date">Date</option>
                    <option value="Book a Resource">Book a Resource</option>
                    <option value="Address">Address</option>
                    <option value="Link">Link</option>
                    <option value="File">File</option>
                    <option value="Money">Money</option>
                    <option value="Yes/No">Yes/No</option>
                    <option value="Number">Number</option>
                    <option value="WhatsApp Link">WhatsApp Link</option>
                  </select>
                </div>
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
                  <Button variant="outline" onClick={() => setEditingFieldId(null)}>Cancel</Button>
                  <Button
                    variant="primary"
                    disabled={!editingFieldData.label}
                    onClick={() => {
                      const inputType = FIELD_TYPE_MAP[editingFieldData.type] || "text";
                      updateCustomField(currentModule, editingFieldId, {
                        label: editingFieldData.label,
                        inputType: inputType
                      });
                      setEditingFieldId(null);
                      toast.success("Field updated successfully");
                    }}
                    className="text-sm bg-blue-600 hover:bg-blue-700"
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Business Profile Modal */}
        <BusinessProfileModal
          isOpen={showBusinessProfileModal}
          onClose={() => {
            setShowBusinessProfileModal(false);
            setSelectedBusinessProfile(null);
          }}
          phoneNumber={selectedBusinessProfile?.phoneNumber || ""}
        />

        {/* Verify Number Modal */}
        <VerifyNumberModal
          isOpen={showVerifyNumberModal}
          onClose={() => {
            setShowVerifyNumberModal(false);
            setSelectedVerifyNumber(null);
          }}
          phoneNumber={selectedVerifyNumber?.phoneNumber || ""}
        />

        {/* Team Member Profile Drawer */}
        <SettingsMemberProfileDrawer
          isOpen={isTeamDrawerOpen}
          onClose={handleCloseTeamDrawer}
          member={selectedTeamMember ? { name: (selectedTeamMember as any).name, email: (selectedTeamMember as any).email, role: (selectedTeamMember as any).role, phone: (selectedTeamMember as any).phone } : null}
        />

        {/* OLD EXTERNAL MODALS REMOVED - NOW INSIDE DRAWER */}

        {/* Add Payment Method Modal */}
        {showAddPaymentModal && (
          <Modal
            isOpen={showAddPaymentModal}
            onClose={() => {
              setShowAddPaymentModal(false);
              setNewPaymentData({
                provider: "Visa",
                cardholderName: "",
                cardNumber: "",
                expiryDate: "",
                cvv: "",
                setAsDefault: false,
              });
            }}
            title="Add Payment Method"
          >
            <div className="space-y-4">
              {/* Card Provider */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Card Provider</label>
                <Select value={newPaymentData.provider} onValueChange={(value) => setNewPaymentData({ ...newPaymentData, provider: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Visa">Visa</SelectItem>
                    <SelectItem value="Mastercard">Mastercard</SelectItem>
                    <SelectItem value="American Express">American Express</SelectItem>
                    <SelectItem value="Discover">Discover</SelectItem>
                    <SelectItem value="RuPay">RuPay</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Cardholder Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Cardholder Name</label>
                <Input
                  value={newPaymentData.cardholderName}
                  onChange={(e) => setNewPaymentData({ ...newPaymentData, cardholderName: e.target.value })}
                  placeholder="Full name on card"
                />
              </div>

              {/* Card Number */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Card Number</label>
                <Input
                  value={newPaymentData.cardNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\s/g, '');
                    const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
                    setNewPaymentData({ ...newPaymentData, cardNumber: formatted });
                  }}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                />
              </div>

              {/* Expiry Date and CVV */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Expiry Date</label>
                  <Input
                    value={newPaymentData.expiryDate}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, '');
                      if (value.length >= 2) {
                        value = value.slice(0, 2) + '/' + value.slice(2, 4);
                      }
                      setNewPaymentData({ ...newPaymentData, expiryDate: value });
                    }}
                    placeholder="MM/YY"
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">CVV</label>
                  <Input
                    type="password"
                    value={newPaymentData.cvv}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setNewPaymentData({ ...newPaymentData, cvv: value });
                    }}
                    placeholder="•••"
                    maxLength={4}
                  />
                </div>
              </div>

              {/* Set as Default */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="setAsDefault"
                  checked={newPaymentData.setAsDefault}
                  onChange={(e) => setNewPaymentData({ ...newPaymentData, setAsDefault: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="setAsDefault" className="text-sm text-foreground cursor-pointer">
                  Set as default payment method
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddPaymentModal(false);
                    setNewPaymentData({
                      provider: "Visa",
                      cardholderName: "",
                      cardNumber: "",
                      expiryDate: "",
                      cvv: "",
                      setAsDefault: false,
                    });
                  }}
                  className="px-4 py-2 border border-[#E5E7EB] text-[#374151] rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!newPaymentData.cardholderName || !newPaymentData.cardNumber || !newPaymentData.expiryDate || !newPaymentData.cvv) {
                      toast.error("Please fill in all required fields");
                      return;
                    }
                    toast.success("Payment method added successfully");
                    setShowAddPaymentModal(false);
                    setNewPaymentData({
                      provider: "Visa",
                      cardholderName: "",
                      cardNumber: "",
                      expiryDate: "",
                      cvv: "",
                      setAsDefault: false,
                    });
                  }}
                  className="px-4 py-2 bg-[#2563EB] text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  Add Card
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Team Member Credit Usage Bottom Drawer */}
        {showMemberUsageDrawer && selectedMemberForUsage && (() => {
          const member = selectedMemberForUsage;
          const memberServices = [
            { label: "Voice Calls", used: Math.round(member.used * 0.67), total: Math.round(member.total * 0.5), Icon: Phone },
            { label: "Text Messages", used: Math.round(member.used * 0.14), total: Math.round(member.total * 0.15), Icon: MessageSquare },
            { label: "Webform Submissions", used: Math.round(member.used * 0.02), total: Math.round(member.total * 0.05), Icon: ClipboardList },
            { label: "Chatbot Conversations", used: Math.round(member.used * 0.10), total: Math.round(member.total * 0.2), Icon: MessageCircle },
            { label: "Extra Credits", used: Math.round(member.used * 0.07), total: Math.round(member.total * 0.1), Icon: Zap },
          ];

          return (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0"
                style={{ backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 99999 }}
                onClick={() => setShowMemberUsageDrawer(false)}
              />
              {/* Right Side Drawer */}
              <div
                className="fixed inset-0 flex items-start justify-end"
                style={{ zIndex: 99999, pointerEvents: 'none' }}
              >
                <div
                  className="flex flex-col bg-white"
                  style={{
                    width: '600px',
                    height: '100vh',
                    borderRadius: '16px 0 0 16px',
                    boxShadow: '-8px 0 40px rgba(0,0,0,0.18)',
                    animation: 'slideInRightDrawer 300ms ease-out',
                    overflow: 'hidden',
                    pointerEvents: 'auto',
                  }}
                >
                  <style>{`
                  @keyframes slideInRightDrawer {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                  }
                `}</style>

                  {/* Header */}
                  <div className="flex-shrink-0 px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold" style={{ color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>{member.name}</h2>
                        <p className="text-sm text-[#6B7280] mt-0.5" style={{ fontFamily: 'Outfit, sans-serif' }}>{member.email}</p>
                      </div>
                      <button
                        onClick={() => setShowMemberUsageDrawer(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <X className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex-shrink-0 flex border-b border-gray-200 px-6">
                    {(["breakdown", "history"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setMemberUsageTab(tab)}
                        className="py-3 mr-6 text-sm font-medium transition-colors"
                        style={{
                          color: memberUsageTab === tab ? '#2563EB' : '#6B7280',
                          borderBottom: memberUsageTab === tab ? '2px solid #2563EB' : '2px solid transparent',
                          fontFamily: 'Outfit, sans-serif',
                        }}
                      >
                        {tab === "breakdown" ? "Breakdown" : "History"}
                      </button>
                    ))}
                  </div>

                  {/* Tab content — scrollable */}
                  <div className="flex-1 overflow-y-auto">
                    {memberUsageTab === "breakdown" && (
                      <div className="p-6">
                        {/* SINGLE COLUMN LAYOUT - All 5 cards stacked vertically */}
                        <div className="space-y-3">
                          {memberServices.map((svc) => {
                            const p = svc.total > 0 ? Math.min((svc.used / svc.total) * 100, 100) : 0;
                            const barColor = svc.label === "Extra Credits" && p >= 100 ? "#DC2626" : "#2563EB";
                            return (
                              <div
                                key={svc.label}
                                className="border border-[#E5E7EB] rounded-lg p-4 bg-white flex flex-col gap-3"
                              >
                                <div className="flex items-start justify-between">
                                  <svc.Icon className="w-5 h-5 text-[#2563EB]" strokeWidth={1.5} />
                                  <span className="text-[12px] text-[#9CA3AF]" style={{ fontFamily: "Outfit, sans-serif" }}>{p.toFixed(0)}%</span>
                                </div>
                                <div>
                                  <p className="text-[14px] font-medium text-[#111827] mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>{svc.label}</p>
                                  <p className="text-[24px] font-bold text-[#111827]" style={{ fontFamily: "DM Sans, sans-serif" }}>{svc.used.toLocaleString()}</p>
                                  <p className="text-[12px] text-[#9CA3AF] mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>of {svc.total.toLocaleString()} total</p>
                                </div>
                                <div className="h-1 bg-[#F3F4F6] rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${p}%`, backgroundColor: barColor }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {memberUsageTab === "history" && (
                      <div className="flex flex-col h-full">
                        {/* Column Headers */}
                        <div className="grid grid-cols-[1fr_2fr_auto] gap-4 px-6 py-3 border-b border-[#F3F4F6] bg-white sticky top-0">
                          <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide" style={{ fontFamily: "Outfit, sans-serif" }}>Date & Time</span>
                          <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide" style={{ fontFamily: "Outfit, sans-serif" }}>Description</span>
                          <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide text-right" style={{ fontFamily: "Outfit, sans-serif" }}>Credits Used</span>
                        </div>
                        {/* Scrollable rows with mock data */}
                        <div className="flex-1 overflow-y-auto divide-y divide-[#F3F4F6]">
                          {[
                            { date: "26 May 2026, 2:23 PM", description: "Voice Call — Outbound to +91-9876543210", credits: 3 },
                            { date: "25 May 2026, 11:05 AM", description: "Text Message — Campaign: May Followup", credits: 1 },
                            { date: "24 May 2026, 9:40 AM", description: "Webform Submission — Contact Us Form", credits: 2 },
                            { date: "23 May 2026, 4:15 PM", description: "Chatbot Conversation — Lead Qualifier Bot", credits: 1 },
                            { date: "22 May 2026, 3:00 PM", description: "Voice Call — Outbound to +91-9123456789", credits: 3 },
                            { date: "21 May 2026, 10:30 AM", description: "Text Message — Appointment Reminder", credits: 1 },
                          ].map((evt, i) => (
                            <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-4 items-start px-6 py-3">
                              <p className="text-[12px] text-[#6B7280]" style={{ fontFamily: "Outfit, sans-serif" }}>{evt.date}</p>
                              <p className="text-[12px] text-[#374151]" style={{ fontFamily: "Outfit, sans-serif" }}>{evt.description}</p>
                              <p className="text-[12px] text-[#9CA3AF] text-right whitespace-nowrap" style={{ fontFamily: "Outfit, sans-serif" }}>−{evt.credits} {evt.credits === 1 ? 'credit' : 'credits'}</p>
                            </div>
                          ))}
                        </div>
                        {/* Summary */}
                        <div className="px-6 py-3 border-t border-[#F3F4F6] flex justify-end bg-white sticky bottom-0">
                          <span className="text-[13px] font-bold text-[#374151]" style={{ fontFamily: "DM Sans, sans-serif" }}>Total used: 11 credits</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          );
        })()}

        <RolesPermissionsDrawer
          isOpen={showRolesDrawer}
          onClose={() => setShowRolesDrawer(false)}
          roles={roles}
          onSaveRoles={handleSaveRoles}
          assignedUserCounts={assignedUserCounts}
        />
      </div>
    </div>
  );
}
