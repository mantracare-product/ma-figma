import { useState, useRef, useEffect } from "react";
import { useNavigate, Outlet } from "react-router";
import { Search, Filter, Plus, Upload, Download, MoreVertical, Eye, Phone, Trash2, Settings as SettingsIcon, FileText, Calendar, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Mail, MapPin, Clock, MessageSquare, Edit, PhoneOutgoing, PhoneIncoming, PhoneOff, Settings, User, CalendarClock, ArrowRight, List, Play, ChevronDown, GripVertical, X, Building, Briefcase, Users, GitBranch, Globe, Copy, Shield, Info, AlertCircle, RefreshCw } from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Drawer } from "../components/ui/drawer";
import { Tooltip } from "../components/ui/Tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { toast } from "sonner";
import PageHeader from "../components/layout/PageHeader";
import { HowItWorksModal, HowItWorksButton } from "../components/help/HowItWorksModal";
import { InfoTooltip } from "../components/help/InfoTooltip";
import { StageProgressBar } from "../components/StageProgressBar";
import ProcessStageSelect, { availableProcesses, getStagesForProcess, combinedStages } from "../components/ui/ProcessStageSelect";
import { useFieldRegistry } from "../context/FieldRegistryContext";
import { CLIENTS_STORE_EVENT } from "../../lib/clientProcessState";

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  countryCode: string;
  countryFlag: string;
  processes: string[];
  stage: string;
  responsible?: string;
  lastContact: string;
  status: string;
  companyName?: string;
  jobPosition?: string;
  numberOfEmployees?: string;
  location?: string;
}

const initialClients: Client[] = [
  // US Clients (12 total)
  { id: "CL-001", name: "Sarah Johnson", email: "sarah.j@email.com", phone: "5551234567", country: "US", countryCode: "+1", countryFlag: "🇺🇸", processes: ["Patient Intake", "Follow-up Calls"], stage: "Insurance Verification", responsible: "John Smith", lastContact: "2024-04-10", status: "Active", companyName: "TechCorp Inc.", jobPosition: "Senior Manager", numberOfEmployees: "101-250", location: "New York, NY" },
  { id: "CL-002", name: "Michael Chen", email: "mchen@email.com", phone: "5552345678", country: "US", countryCode: "+1", countryFlag: "🇺🇸", processes: ["Patient Intake"], stage: "Initial Contact", responsible: "Sarah Johnson", lastContact: "2024-04-09", status: "Active", companyName: "Innovate Solutions", jobPosition: "Product Manager", numberOfEmployees: "51-100", location: "San Francisco, CA" },
  { id: "CL-003", name: "Emily Davis", email: "emily.d@email.com", phone: "5553456789", country: "US", countryCode: "+1", countryFlag: "🇺🇸", processes: ["Follow-up Calls", "Billing Support"], stage: "Billing Inquiry", responsible: "Michael Chen", lastContact: "2024-04-11", status: "Active", companyName: "Healthcare Plus", jobPosition: "Director of Operations", numberOfEmployees: "251-500", location: "Chicago, IL" },
  { id: "CL-004", name: "Robert Wilson", email: "rwilson@email.com", phone: "5554567890", country: "US", countryCode: "+1", countryFlag: "🇺🇸", processes: ["Appointment Scheduling"], stage: "Slot Selection", responsible: "Emily Davis", lastContact: "2024-04-08", status: "Active", location: "Houston, TX" },
  { id: "CL-005", name: "Jessica Brown", email: "jbrown@email.com", phone: "5555678901", country: "US", countryCode: "+1", countryFlag: "🇺🇸", processes: ["Patient Intake", "Insurance Verification"], stage: "Document Check", responsible: "Robert Wilson", lastContact: "2024-03-28", status: "Inactive", location: "Phoenix, AZ" },
  { id: "CL-006", name: "David Martinez", email: "d.martinez@email.com", phone: "5556789012", country: "US", countryCode: "+1", countryFlag: "🇺🇸", processes: ["Follow-up Calls"], stage: "Follow-up", responsible: "Jessica Brown", lastContact: "2024-04-12", status: "Active", location: "Los Angeles, CA" },
  { id: "CL-007", name: "Lisa Anderson", email: "l.anderson@email.com", phone: "5557890123", country: "US", countryCode: "+1", countryFlag: "🇺🇸", processes: ["Billing Support", "Follow-up Calls"], stage: "Payment Reminder", responsible: "David Martinez", lastContact: "2024-04-10", status: "Active", companyName: "MediCare Group", jobPosition: "CFO", numberOfEmployees: "501-1000", location: "Seattle, WA" },
  { id: "CL-008", name: "James Taylor", email: "jtaylor@email.com", phone: "5558901234", country: "US", countryCode: "+1", countryFlag: "🇺🇸", processes: ["Patient Intake"], stage: "Schedule Appointment", responsible: "Amanda Taylor", lastContact: "2024-04-11", status: "Active", location: "Boston, MA" },
  { id: "CL-009", name: "Amanda Clark", email: "a.clark@email.com", phone: "5559012345", country: "US", countryCode: "+1", countryFlag: "🇺🇸", processes: ["Appointment Scheduling", "Follow-up Calls"], stage: "Confirmation", responsible: "John Smith", lastContact: "2024-04-09", status: "Active", location: "Miami, FL" },
  { id: "CL-010", name: "Christopher Lee", email: "c.lee@email.com", phone: "5550123456", country: "US", countryCode: "+1", countryFlag: "🇺🇸", processes: ["Patient Intake"], stage: "Insurance Verification", responsible: "Sarah Johnson", lastContact: "2024-04-07", status: "Inactive", location: "Denver, CO" },
  { id: "CL-011", name: "Jennifer White", email: "j.white@email.com", phone: "5551234568", country: "US", countryCode: "+1", countryFlag: "🇺🇸", processes: ["Follow-up Calls", "Billing Support", "Patient Intake"], stage: "Initial Contact", responsible: "Michael Chen", lastContact: "2024-04-13", status: "Active", location: "Atlanta, GA" },
  { id: "CL-012", name: "Matthew Lewis", email: "m.lewis@email.com", phone: "5552345679", country: "US", countryCode: "+1", countryFlag: "🇺🇸", processes: ["Insurance Verification"], stage: "Approval", responsible: "Emily Davis", lastContact: "2024-04-06", status: "Active", location: "Dallas, TX" },

  // India Clients (10 total)
  { id: "CL-013", name: "Priya Sharma", email: "priya.sharma@email.com", phone: "9820172818", country: "IN", countryCode: "+91", countryFlag: "🇮🇳", processes: ["Patient Intake", "Follow-up Calls"], stage: "Insurance Verification", responsible: "Robert Wilson", lastContact: "2024-04-12", status: "Active", location: "Mumbai, India" },
  { id: "CL-014", name: "Rahul Patel", email: "rahul.p@email.com", phone: "9876543210", country: "IN", countryCode: "+91", countryFlag: "🇮🇳", processes: ["Follow-up Calls"], stage: "Follow-up", responsible: "Jessica Brown", lastContact: "2024-04-11", status: "Active", location: "Ahmedabad, India" },
  { id: "CL-015", name: "Ananya Reddy", email: "ananya.r@email.com", phone: "9123456789", country: "IN", countryCode: "+91", countryFlag: "🇮🇳", processes: ["Billing Support", "Patient Intake"], stage: "Issue Resolution", responsible: "David Martinez", lastContact: "2024-04-10", status: "Active", location: "Hyderabad, India" },
  { id: "CL-016", name: "Vikram Singh", email: "vikram.s@email.com", phone: "9234567890", country: "IN", countryCode: "+91", countryFlag: "🇮🇳", processes: ["Appointment Scheduling"], stage: "Slot Selection", responsible: "Amanda Taylor", lastContact: "2024-04-09", status: "Active", location: "Delhi, India" },
  { id: "CL-017", name: "Sneha Gupta", email: "sneha.g@email.com", phone: "9345678901", country: "IN", countryCode: "+91", countryFlag: "🇮🇳", processes: ["Patient Intake"], stage: "Initial Contact", responsible: "John Smith", lastContact: "2024-03-25", status: "Inactive", location: "Pune, India" },
  { id: "CL-018", name: "Arjun Desai", email: "arjun.d@email.com", phone: "9456789012", country: "IN", countryCode: "+91", countryFlag: "🇮🇳", processes: ["Follow-up Calls", "Billing Support"], stage: "Billing Inquiry", responsible: "Sarah Johnson", lastContact: "2024-04-13", status: "Active", location: "Surat, India" },
  { id: "CL-019", name: "Kavya Iyer", email: "kavya.i@email.com", phone: "9567890123", country: "IN", countryCode: "+91", countryFlag: "🇮🇳", processes: ["Insurance Verification", "Patient Intake"], stage: "Document Check", responsible: "Michael Chen", lastContact: "2024-04-11", status: "Active", location: "Chennai, India" },
  { id: "CL-020", name: "Rohan Kumar", email: "rohan.k@email.com", phone: "9678901234", country: "IN", countryCode: "+91", countryFlag: "🇮🇳", processes: ["Patient Intake"], stage: "Schedule Appointment", responsible: "Emily Davis", lastContact: "2024-04-08", status: "Active", location: "Bengaluru, India" },
  { id: "CL-021", name: "Deepika Nair", email: "deepika.n@email.com", phone: "9789012345", country: "IN", countryCode: "+91", countryFlag: "🇮🇳", processes: ["Appointment Scheduling", "Follow-up Calls"], stage: "Confirmation", responsible: "Robert Wilson", lastContact: "2024-04-12", status: "Active", location: "Kochi, India" },
  { id: "CL-022", name: "Aditya Mehta", email: "aditya.m@email.com", phone: "9890123456", country: "IN", countryCode: "+91", countryFlag: "🇮🇳", processes: ["Follow-up Calls"], stage: "Follow-up", responsible: "Jessica Brown", lastContact: "2024-03-30", status: "Inactive", location: "Jaipur, India" },

  // UAE Clients (5 total)
  { id: "CL-023", name: "Ahmed Al-Mansoori", email: "ahmed.am@email.com", phone: "501234567", country: "AE", countryCode: "+971", countryFlag: "🇦🇪", processes: ["Patient Intake", "Insurance Verification"], stage: "Insurance Verification", responsible: "David Martinez", lastContact: "2024-04-13", status: "Active", location: "Dubai, UAE" },
  { id: "CL-024", name: "Fatima Hassan", email: "fatima.h@email.com", phone: "502345678", country: "AE", countryCode: "+971", countryFlag: "🇦🇪", processes: ["Follow-up Calls", "Billing Support"], stage: "Billing Inquiry", responsible: "Amanda Taylor", lastContact: "2024-04-10", status: "Active", location: "Abu Dhabi, UAE" },
  { id: "CL-025", name: "Omar Al-Rashid", email: "omar.ar@email.com", phone: "503456789", country: "AE", countryCode: "+971", countryFlag: "🇦🇪", processes: ["Appointment Scheduling"], stage: "Slot Selection", responsible: "John Smith", lastContact: "2024-04-11", status: "Active", location: "Sharjah, UAE" },
  { id: "CL-026", name: "Layla Khalifa", email: "layla.k@email.com", phone: "504567890", country: "AE", countryCode: "+971", countryFlag: "🇦🇪", processes: ["Patient Intake"], stage: "Initial Contact", responsible: "Sarah Johnson", lastContact: "2024-03-20", status: "Inactive", location: "Ajman, UAE" },
  { id: "CL-027", name: "Youssef Said", email: "youssef.s@email.com", phone: "505678901", country: "AE", countryCode: "+971", countryFlag: "🇦🇪", processes: ["Follow-up Calls", "Patient Intake", "Billing Support"], stage: "Follow-up", responsible: "Michael Chen", lastContact: "2024-04-12", status: "Active", location: "Dubai, UAE" },

  // UK Clients (3 total)
  { id: "CL-028", name: "Oliver Thompson", email: "oliver.t@email.com", phone: "7412345678", country: "GB", countryCode: "+44", countryFlag: "🇬🇧", processes: ["Patient Intake", "Follow-up Calls"], stage: "Schedule Appointment", responsible: "Emily Davis", lastContact: "2024-04-09", status: "Active", location: "London, UK" },
  { id: "CL-029", name: "Charlotte Evans", email: "charlotte.e@email.com", phone: "7423456789", country: "GB", countryCode: "+44", countryFlag: "🇬🇧", processes: ["Insurance Verification"], stage: "Approval", responsible: "Robert Wilson", lastContact: "2024-04-13", status: "Active", location: "Manchester, UK" },
  { id: "CL-030", name: "William Davies", email: "william.d@email.com", phone: "7434567890", country: "GB", countryCode: "+44", countryFlag: "🇬🇧", processes: ["Billing Support", "Follow-up Calls"], stage: "Payment Reminder", responsible: "Jessica Brown", lastContact: "2024-03-18", status: "Inactive", location: "Birmingham, UK" },
];

interface DraggableColumnHeaderProps {
  columnKey: string;
  index: number;
  label: string;
  moveColumn: (dragIndex: number, hoverIndex: number) => void;
}

const DraggableColumnHeader: React.FC<DraggableColumnHeaderProps> = ({ columnKey, index, label, moveColumn }) => {
  const ref = useRef<HTMLTableCellElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: 'COLUMN',
    item: { index, columnKey },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'COLUMN',
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

export default function Clients() {
  const navigate = useNavigate();
  const { getAllFields } = useFieldRegistry();

  const clientInfoFieldsList = Array.from(new Set([
    ...getAllFields("client")
      .filter(f => !["processes", "responsible"].includes(f.key))
      .map(f => f.label),
    "Company Size"
  ]));

  const allFilterFields = [
    ...clientInfoFieldsList,
    'Process', 'Responsible', 'Created On',
    'Last Contact: Today', 'Last Contact: Yesterday', 'Last Contact: Last 7 days', 'Last Contact: Last 30 days',
    'Last Call: Last 24 hours', 'Last Call: Last 7 days',
    'No activity in 7 days', 'No activity in 30 days',
    'Created: Today', 'Created: This week', 'Created: This month',
    'Overdue follow-up'
  ];

  const [clients, setClients] = useState<Client[]>(() => {
    const saved = sessionStorage.getItem("clients");
    return saved ? JSON.parse(saved) : initialClients;
  });

  useEffect(() => {
    sessionStorage.setItem("clients", JSON.stringify(clients));
  }, [clients]);

  // Live-sync: pick up clients written by TestProcessChatDrawer or other tabs
  useEffect(() => {
    const handler = () => {
      try {
        const saved = sessionStorage.getItem("clients");
        if (saved) setClients(JSON.parse(saved));
      } catch {}
    };
    window.addEventListener(CLIENTS_STORE_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(CLIENTS_STORE_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const [modalProcess, setModalProcess] = useState("");
  const [modalStage, setModalStage] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const entityType = "clients";
  const entityLabel = "clients";
  const [importMethod, setImportMethod] = useState<"csv" | "webhook">("csv");
  const [showWebhookInfo, setShowWebhookInfo] = useState(false);

  interface WebhookConfig {
    id: string;
    title: string;
    webhookLabel: string;
    selectedFields: string[];
    fieldSearchQuery: string;
    fieldDropdownOpen: boolean;
    apiKey: { id: string; label: string; value: string } | null;
    apiKeyLabelInput: string;
    generated: boolean;
    isExpanded: boolean;
  }

  const [webhookConfigs, setWebhookConfigs] = useState<WebhookConfig[]>([
    {
      id: crypto.randomUUID(),
      title: "Webhook 1",
      webhookLabel: "",
      selectedFields: [],
      fieldSearchQuery: "",
      fieldDropdownOpen: false,
      apiKey: null,
      apiKeyLabelInput: "",
      generated: false,
      isExpanded: true,
    },
  ]);

  const updateConfig = (id: string, patch: Partial<WebhookConfig>) => {
    setWebhookConfigs(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  };

  // Close webhook field picker dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      webhookConfigs.forEach(config => {
        if (config.fieldDropdownOpen && !target.closest(`.field-dropdown-${config.id}`)) {
          updateConfig(config.id, { fieldDropdownOpen: false });
        }
      });
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        webhookConfigs.forEach(config => {
          if (config.fieldDropdownOpen) {
            updateConfig(config.id, { fieldDropdownOpen: false });
          }
        });
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [webhookConfigs]);


  const getMergedClientFields = () => {
    const defaultClientWebhookFields = [
      { key: "name", label: "Name", source: "system", inputType: "text" },
      { key: "email", label: "Email", source: "system", inputType: "email" },
      { key: "phone", label: "Phone", source: "system", inputType: "tel" },
      { key: "country", label: "Country", source: "system", inputType: "text" },
      { key: "processes", label: "Processes", source: "system", inputType: "select" },
      { key: "stage", label: "Stage", source: "system", inputType: "text" },
      { key: "responsible", label: "Responsible Person", source: "system", inputType: "select" },
      { key: "status", label: "Status", source: "system", inputType: "select" },
    ];
    const registryFields = getAllFields("client");
    const mergedClientFields = [...defaultClientWebhookFields];
    registryFields.forEach(regField => {
      if (!mergedClientFields.some(f => f.key === regField.key)) {
        mergedClientFields.push({
          key: regField.key,
          label: regField.label,
          source: regField.source || "custom",
          inputType: regField.inputType || "text",
        });
      }
    });
    return mergedClientFields;
  };

  const fieldSampleValues: Record<string, any> = {
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    phone: "+1 5551234567",
    country: "US",
    processes: ["Patient Intake"],
    stage: "Initial Contact",
    responsible: "John Smith",
    status: "Active"
  };

  const getWebhookManualUrl = (apiKeyVal: string, selectedKeys: string[]) => {
    const apiKeyPart = apiKeyVal || "{YOUR_API_KEY}";
    const baseUrl = `https://app.mantraassist.com/api/webhooks/import/${entityType}?api_key=${apiKeyPart}`;
    const params = selectedKeys.map(key => {
      let val = `{${key.toUpperCase()}}`;
      if (key === "name") val = "{CLIENT_NAME}";
      if (key === "email") val = "{CLIENT_EMAIL}";
      if (key === "phone") val = "{CLIENT_PHONE}";
      if (key === "country") val = "{COUNTRY_CODE}";
      if (key === "processes") val = "{PROCESS_NAME}";
      if (key === "stage") val = "{STAGE_NAME}";
      if (key === "responsible") val = "{RESPONSIBLE_PERSON}";
      if (key === "status") val = "{STATUS}";
      return `&${key}=${val}`;
    }).join("");
    return baseUrl + params;
  };

  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
    phone: "",
    countryCode: "+1",
    countryFlag: "🇺🇸",
    stage: [] as string[],
    responsible: "",
    preferredCallingTime: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    inquiryType: "",
    source: "",
    referring: "",
    companyName: "",
    jobPosition: "",
    numberOfEmployees: "",
  });
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const [dateRange, setDateRange] = useState("Last 7 days");
  const [showBulkActionsDropdown, setShowBulkActionsDropdown] = useState(false);
  const [showBulkStageDropdown, setShowBulkStageDropdown] = useState(false);
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);
  const [editedClients, setEditedClients] = useState<{ [key: string]: { name?: string, email?: string, phone?: string } }>({});

  // Schedule Call Modal
  const [showScheduleCallModal, setShowScheduleCallModal] = useState(false);
  const [selectedClientForScheduling, setSelectedClientForScheduling] = useState<Client | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Client Profile Drawer
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [selectedClientForProfile, setSelectedClientForProfile] = useState<Client | null>(null);
  const [editingProcesses, setEditingProcesses] = useState(false);
  const [processDropdownOpen, setProcessDropdownOpen] = useState(false);
  const [processSearchQuery, setProcessSearchQuery] = useState("");
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>([]);
  const [drawerProcessStages, setDrawerProcessStages] = useState<Record<string, string>>({});
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);

  // Hamburger menu state
  const [openMenuClientId, setOpenMenuClientId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Client Profile Action Modals
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [showSendMessageModal, setShowSendMessageModal] = useState(false);
  const [showScheduleCallFromProfile, setShowScheduleCallFromProfile] = useState(false);
  const [showUpdateStageModal, setShowUpdateStageModal] = useState(false);

  // Edit Client Form State
  const [editClientForm, setEditClientForm] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    status: "Active"
  });

  // Message Form State
  const [messageForm, setMessageForm] = useState({
    message: ""
  });

  // Update Stage Form State
  const [selectedStage, setSelectedStage] = useState("");

  // Process Tab state for drawer activity
  const [activeProcessTabDrawer, setActiveProcessTabDrawer] = useState<string>("all");

  // Client Profile Drawer Tab state
  const [activeProfileTab, setActiveProfileTab] = useState<"overview" | "processes" | "activity" | "notes">("overview");

  // Inline editing state for Overview tab
  const [isEditingOverview, setIsEditingOverview] = useState(false);

  // Field Picker and Create Field states
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("");
  const [selectedFieldType, setSelectedFieldType] = useState<string | null>(null);
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldMultiple, setFieldMultiple] = useState(false);
  const [fieldShowAlways, setFieldShowAlways] = useState(true);
  const [fieldTooltip, setFieldTooltip] = useState(false);
  const [fieldVisibleToSelected, setFieldVisibleToSelected] = useState(false);
  const [fieldNameError, setFieldNameError] = useState(false);
  const [fieldTypeError, setFieldTypeError] = useState(false);

  // Select field modal states
  const [selectedFieldsForModal, setSelectedFieldsForModal] = useState<string[]>([]);
  const [fieldSearchQuery, setFieldSearchQuery] = useState("");

  // Process editing in Overview
  const [showProcessDropdownInOverview, setShowProcessDropdownInOverview] = useState(false);

  // Inline field editing
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingFieldValue, setEditingFieldValue] = useState("");

  // Table scroll state
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const [showScrollLeftIndicator, setShowScrollLeftIndicator] = useState(false);
  const scrollIntervalRef = useRef<number | null>(null);

  // Call Details Drawer (from Client Profile)
  const [showCallDetailsFromProfile, setShowCallDetailsFromProfile] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    email: true,
    phone: true,
    responsible: true,
    lastContact: true,
    status: true,
  });

  const [columnOrder, setColumnOrder] = useState<string[]>([
    'name',
    'email',
    'phone',
    'responsible',
    'lastContact',
    'status',
  ]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const totalRecords = 5380; // Mock total for demonstration

  // Selection state
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Advanced Filter System State
  interface ActiveFilter {
    field: string;
    label: string;
    values: string[];
  }
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [filterDropdowns, setFilterDropdowns] = useState<{ [key: string]: boolean }>({});
  const [selectedName, setSelectedName] = useState<string[]>([]);
  const [nameSearch, setNameSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<string[]>([]);
  const [selectedResponsible, setSelectedResponsible] = useState<string[]>([]);
  const [selectedLastContact, setSelectedLastContact] = useState("Any date");
  const [selectedCreatedOn, setSelectedCreatedOn] = useState("Any date");
  const [customDateStart, setCustomDateStart] = useState("");
  const [customDateEnd, setCustomDateEnd] = useState("");
  const [showFilterFieldSettings, setShowFilterFieldSettings] = useState(false);
  const [showAddFieldPopup, setShowAddFieldPopup] = useState(false);
  const [filterFieldCategories, setFilterFieldCategories] = useState({
    client: true,
    process: true,
    activity: true,
  });
  const [availableFilterFields, setAvailableFilterFields] = useState<string[]>([
    "Name", "Status", "Processes", "Responsible", "Created on", "Phone", "Email", "Location", "Company", "Role", "Last Contact Date", "Tags"
  ]);
  const [activeFilterFields, setActiveFilterFields] = useState<string[]>([
    "Name", "Status", "Processes", "Responsible", "Created on"
  ]);
  const [responsibleSearch, setResponsibleSearch] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("All");


  // Bulk action modals
  const [showTriggerCallsModal, setShowTriggerCallsModal] = useState(false);
  const [scheduleOption, setScheduleOption] = useState<"immediate" | "scheduled">("immediate");
  const [triggerScheduledDate, setTriggerScheduledDate] = useState("");
  const [triggerScheduledTime, setTriggerScheduledTime] = useState("");

  // Process and Stage mapping
  const processStages: { [key: string]: string[] } = {
    "Patient Intake": ["Initial Contact", "Insurance Verify", "Schedule Appt", "Appointment"],
    "Follow-up Calls": ["Initial Contact", "Appointment", "Completed"],
    "Billing Support": ["Initial Contact", "Billing Inquiry", "Issue Resolution", "Payment Reminder"],
    "Appointment Scheduling": ["Initial Contact", "Slot Selection", "Confirmation", "Completed"],
    "Insurance Verification": ["Initial Contact", "Document Check", "Verification", "Approval"],
  };

  // Shared process/stage helpers imported from ProcessStageSelect

  // Team members / Employees list
  const teamMembers = [
    "John Smith",
    "Sarah Johnson",
    "Michael Chen",
    "Emily Davis",
    "Robert Wilson",
    "Jessica Brown",
    "David Martinez",
    "Amanda Taylor",
  ];

  const countries = [
    { code: "+1", flag: "🇺🇸", name: "United States" },
    { code: "+1", flag: "🇨🇦", name: "Canada" },
    { code: "+91", flag: "🇮🇳", name: "India" },
    { code: "+44", flag: "🇬🇧", name: "United Kingdom" },
    { code: "+61", flag: "🇦🇺", name: "Australia" },
  ];

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (processDropdownOpen && !target.closest('.process-dropdown-container')) {
        setProcessDropdownOpen(false);
      }
      if (showFieldPicker && !target.closest('.field-picker-container')) {
        setShowFieldPicker(false);
      }
      if (openMenuClientId && !target.closest('.hamburger-menu-container')) {
        setOpenMenuClientId(null);
      }
      // Close filter dropdowns when clicking outside
      if (Object.values(filterDropdowns).some(v => v)) {
        if (!target.closest('.filter-dropdown-container') && !target.closest('button')) {
          setFilterDropdowns({});
        }
      }
      // Close filter panel when clicking outside search bar and filter panel
      if (showFilterPanel) {
        if (!target.closest('.search-bar-container') && !target.closest('.filter-panel-container')) {
          setShowFilterPanel(false);
        }
      }
      // Close add field popup when clicking outside
      if (showAddFieldPopup && !target.closest('.add-field-popup-container') && !target.closest('.add-field-button')) {
        setShowAddFieldPopup(false);
      }
      // Close webhook info popover when clicking outside
      if (showWebhookInfo && !target.closest('.webhook-info-popover')) {
        setShowWebhookInfo(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowWebhookInfo(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [processDropdownOpen, showFieldPicker, filterDropdowns, showFilterPanel, showAddFieldPopup, showWebhookInfo]);

  // Check if table needs horizontal scroll
  useEffect(() => {
    const checkScroll = () => {
      if (tableScrollRef.current) {
        const { scrollWidth, clientWidth, scrollLeft } = tableScrollRef.current;
        const canScrollRight = scrollWidth > clientWidth && scrollLeft < (scrollWidth - clientWidth - 10);
        const canScrollLeft = scrollLeft > 10;
        setShowScrollIndicator(canScrollRight);
        setShowScrollLeftIndicator(canScrollLeft);
      }
    };

    checkScroll();
    window.addEventListener('resize', checkScroll);

    return () => {
      window.removeEventListener('resize', checkScroll);
      if (scrollIntervalRef.current) {
        cancelAnimationFrame(scrollIntervalRef.current);
      }
    };
  }, [clients]);

  const handleScrollRightMouseEnter = () => {
    let velocity = 0;
    const maxVelocity = 3;
    const acceleration = 0.15;

    const scroll = () => {
      if (tableScrollRef.current) {
        velocity = Math.min(velocity + acceleration, maxVelocity);
        tableScrollRef.current.scrollLeft += velocity;

        const { scrollWidth, clientWidth, scrollLeft } = tableScrollRef.current;
        if (scrollLeft >= scrollWidth - clientWidth) {
          if (scrollIntervalRef.current) {
            cancelAnimationFrame(scrollIntervalRef.current);
            scrollIntervalRef.current = null;
          }
          return;
        }

        scrollIntervalRef.current = requestAnimationFrame(scroll);
      }
    };

    scrollIntervalRef.current = requestAnimationFrame(scroll);
  };

  const handleScrollLeftMouseEnter = () => {
    let velocity = 0;
    const maxVelocity = 3;
    const acceleration = 0.15;

    const scroll = () => {
      if (tableScrollRef.current) {
        velocity = Math.min(velocity + acceleration, maxVelocity);
        tableScrollRef.current.scrollLeft -= velocity;

        if (tableScrollRef.current.scrollLeft <= 0) {
          if (scrollIntervalRef.current) {
            cancelAnimationFrame(scrollIntervalRef.current);
            scrollIntervalRef.current = null;
          }
          return;
        }

        scrollIntervalRef.current = requestAnimationFrame(scroll);
      }
    };

    scrollIntervalRef.current = requestAnimationFrame(scroll);
  };

  const handleScrollMouseLeave = () => {
    if (scrollIntervalRef.current) {
      cancelAnimationFrame(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  const moveClient = (dragIndex: number, hoverIndex: number) => {
    const draggedClient = paginatedClients[dragIndex];
    const updatedClients = [...paginatedClients];
    updatedClients.splice(dragIndex, 1);
    updatedClients.splice(hoverIndex, 0, draggedClient);

    // Update the main clients array
    const startIndex = (currentPage - 1) * rowsPerPage;
    const newClients = [...clients];
    const paginatedUpdated = updatedClients.map((c, idx) => {
      const globalIndex = startIndex + idx;
      return newClients[globalIndex];
    });

    updatedClients.forEach((client, idx) => {
      newClients[startIndex + idx] = client;
    });

    setClients(newClients);
  };

  const moveColumn = (dragIndex: number, hoverIndex: number) => {
    const newColumnOrder = [...columnOrder];
    const [draggedColumn] = newColumnOrder.splice(dragIndex, 1);
    newColumnOrder.splice(hoverIndex, 0, draggedColumn);
    setColumnOrder(newColumnOrder);
  };

  const renderCell = (columnKey: string, client: Client) => {
    switch (columnKey) {
      case 'name':
        return (
          <td key="name" className="px-4 py-2.5 whitespace-nowrap">
            {isBulkEditMode && selectedRows.has(client.id) ? (
              <input
                type="text"
                value={editedClients[client.id]?.name ?? client.name}
                onChange={(e) => handleEditClient(client.id, 'name', e.target.value)}
                className="w-full px-3 py-1.5 bg-input-background border-2 border-primary/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              />
            ) : (
              <button
                onClick={() => navigate(`/clients/${client.id}`)}
                className="font-medium text-sm hover:underline cursor-pointer text-left"
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  color: '#4F8EF7',
                  fontWeight: 500
                }}
              >
                {client.name}
              </button>
            )}
          </td>
        );
      case 'email':
        return (
          <td key="email" className="px-4 py-2.5 whitespace-nowrap">
            {isBulkEditMode && selectedRows.has(client.id) ? (
              <input
                type="email"
                value={editedClients[client.id]?.email ?? client.email}
                onChange={(e) => handleEditClient(client.id, 'email', e.target.value)}
                className="w-full px-3 py-1.5 bg-input-background border-2 border-primary/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              />
            ) : (
              <span className="text-xs" style={{ color: '#6B7280', fontFamily: 'Outfit, sans-serif' }}>{client.email}</span>
            )}
          </td>
        );
      case 'phone':
        return (
          <td key="phone" className="px-4 py-2.5 whitespace-nowrap">
            {isBulkEditMode && selectedRows.has(client.id) ? (
              <input
                type="tel"
                value={editedClients[client.id]?.phone ?? client.phone}
                onChange={(e) => handleEditClient(client.id, 'phone', e.target.value)}
                className="w-full px-3 py-1.5 bg-input-background border-2 border-primary/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              />
            ) : (
              <span className="text-xs" style={{ color: '#6B7280', fontFamily: 'Outfit, sans-serif' }}>{client.phone}</span>
            )}
          </td>
        );
      case 'responsible':
        return (
          <td key="responsible" className="px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: '#6B7280', fontFamily: 'Outfit, sans-serif' }}>
            {isBulkEditMode && selectedRows.has(client.id) ? (
              <select
                value={client.responsible}
                onChange={(e) => {
                  setClients(prev => prev.map(c =>
                    c.id === client.id ? { ...c, responsible: e.target.value } : c
                  ));
                }}
                className="text-xs px-2 py-1 border border-input rounded-lg bg-input-background"
                style={{ fontFamily: 'Outfit, sans-serif', minWidth: '140px' }}
              >
                <option value="John Smith">John Smith</option>
                <option value="Sarah Johnson">Sarah Johnson</option>
                <option value="Michael Chen">Michael Chen</option>
                <option value="Robert Wilson">Robert Wilson</option>
                <option value="Emily Davis">Emily Davis</option>
                <option value="Jessica Brown">Jessica Brown</option>
                <option value="David Martinez">David Martinez</option>
                <option value="Amanda Taylor">Amanda Taylor</option>
              </select>
            ) : (
              client.responsible || '-'
            )}
          </td>
        );
      case 'lastContact':
        return (
          <td key="lastContact" className="px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: '#6B7280', fontFamily: 'Outfit, sans-serif' }}>
            {isBulkEditMode && selectedRows.has(client.id) ? (
              <input
                type="date"
                value={client.lastContact}
                onChange={(e) => {
                  setClients(prev => prev.map(c =>
                    c.id === client.id ? { ...c, lastContact: e.target.value } : c
                  ));
                }}
                className="text-xs px-2 py-1 border border-input rounded-lg bg-input-background"
                style={{ fontFamily: 'Outfit, sans-serif', minWidth: '130px' }}
              />
            ) : (
              client.lastContact
            )}
          </td>
        );
      case 'status':
        return (
          <td key="status" className="px-4 py-2.5 whitespace-nowrap">
            {isBulkEditMode && selectedRows.has(client.id) ? (
              <select
                value={client.status}
                onChange={(e) => {
                  setClients(prev => prev.map(c =>
                    c.id === client.id ? { ...c, status: e.target.value } : c
                  ));
                }}
                className="text-xs px-2 py-1 border border-input rounded-lg bg-input-background"
                style={{ fontFamily: 'Outfit, sans-serif', minWidth: '100px' }}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            ) : (
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${client.status === "Active"
                  ? "bg-success-bg text-success"
                  : client.status === "Pending"
                    ? "bg-warning-bg text-warning"
                    : "bg-muted text-muted-foreground"
                  }`}
              >
                {client.status}
              </span>
            )}
          </td>
        );
      default:
        return null;
    }
  };

  const handleAddClient = () => {
    // Validate required fields
    if (!newClient.name || !newClient.phone || newClient.stage.length === 0 || !newClient.responsible) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate email format if provided
    if (newClient.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newClient.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Extract process from first selected stage
    const firstStage = newClient.stage[0];
    const extractedProcess = firstStage.split(":")[0].trim();

    const client: Client = {
      id: String(clients.length + 1),
      name: newClient.name,
      email: newClient.email,
      phone: `${newClient.countryCode} ${newClient.phone}`,
      country: "United States",
      countryCode: newClient.countryCode,
      countryFlag: newClient.countryFlag,
      processes: [extractedProcess],
      stage: newClient.stage.join(", "),
      responsible: newClient.responsible,
      lastContact: new Date().toISOString().split("T")[0],
      status: "Active",
    };

    setClients([client, ...clients]);

    // Reset form
    setNewClient({
      name: "",
      email: "",
      phone: "",
      countryCode: "+1",
      countryFlag: "🇺🇸",
      stage: [] as string[],
      responsible: "",
      preferredCallingTime: "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      inquiryType: "",
      source: "",
      referring: "",
      companyName: "",
      jobPosition: "",
      numberOfEmployees: "",
    });
    setShowAdditionalDetails(false);
    setShowAddModal(false);

    toast.success("Client added successfully");
  };

  const handleDeleteClient = (id: string) => {
    setClients(clients.filter((c) => c.id !== id));
    toast.success("Client deleted");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleImport = () => {
    if (!selectedFile) {
      toast.error("Please select a file to import");
      return;
    }

    // Simulate import process
    toast.success(`Importing clients from ${selectedFile.name}...`);
    setShowImportModal(false);
    setSelectedFile(null);
  };

  const handleDownloadTemplate = () => {
    // In a real app, this would download an actual CSV file
    toast.success("Sample CSV template downloaded");
  };

  const handleEnterBulkEdit = () => {
    setIsBulkEditMode(true);
    setShowBulkActionsDropdown(false);
    // Initialize edited clients with current values
    const initialEdits: { [key: string]: { name?: string, email?: string, phone?: string } } = {};
    Array.from(selectedRows).forEach(id => {
      const client = clients.find(c => c.id === id);
      if (client) {
        initialEdits[id] = {
          name: client.name,
          email: client.email,
          phone: client.phone,
        };
      }
    });
    setEditedClients(initialEdits);
  };

  const handleSaveBulkEdit = () => {
    // Apply changes to clients
    const updatedClients = clients.map(client => {
      if (editedClients[client.id]) {
        return {
          ...client,
          name: editedClients[client.id].name || client.name,
          email: editedClients[client.id].email || client.email,
          phone: editedClients[client.id].phone || client.phone,
        };
      }
      return client;
    });
    setClients(updatedClients);
    setIsBulkEditMode(false);
    setEditedClients({});
    toast.success(`${selectedRows.size} client(s) updated successfully`);
  };

  const handleCancelBulkEdit = () => {
    setIsBulkEditMode(false);
    setEditedClients({});
  };

  const handleEditClient = (id: string, field: 'name' | 'email' | 'phone', value: string) => {
    setEditedClients(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      }
    }));
  };

  const handleOpenScheduleModal = (client: Client) => {
    setSelectedClientForScheduling(client);
    // Set default date to today
    const today = new Date();
    setScheduledDate(today.toISOString().split("T")[0]);
    setScheduledTime("09:00");
    setSelectedMonth(today.getMonth());
    setSelectedYear(today.getFullYear());
    setShowScheduleCallModal(true);
  };

  const handleScheduleCall = () => {
    if (!selectedClientForScheduling || !scheduledDate || !scheduledTime) {
      toast.error("Please select date and time");
      return;
    }

    // In a real app, this would save to backend
    toast.success("Call scheduled successfully");
    setShowScheduleCallModal(false);
    setSelectedClientForScheduling(null);
    setScheduledDate("");
    setScheduledTime("");
  };

  const handleToggleProcess = (processName: string) => {
    setSelectedProcesses(prev =>
      prev.includes(processName)
        ? prev.filter(p => p !== processName)
        : [...prev, processName]
    );
  };

  const handleSaveProcesses = () => {
    if (!selectedClientForProfile) return;

    const updatedClients = clients.map(c =>
      c.id === selectedClientForProfile.id
        ? { ...c, processes: selectedProcesses }
        : c
    );

    setClients(updatedClients);
    setSelectedClientForProfile({
      ...selectedClientForProfile,
      processes: selectedProcesses
    });
    setEditingProcesses(false);
    setProcessDropdownOpen(false);
    toast.success("Processes updated successfully");
  };

  const handleStageClick = (stage: string, stageIndex: number) => {
    if (!selectedClientForProfile) return;

    const allStages = ["Patient Intake", "Follow-up Calls", "Billing Support", "Appointment Scheduling", "Insurance Verification"];

    // Set the primary process to the clicked stage
    const updatedProcesses = [stage];

    const updatedClients = clients.map(c =>
      c.id === selectedClientForProfile.id
        ? { ...c, processes: updatedProcesses }
        : c
    );

    setClients(updatedClients);
    setSelectedClientForProfile({
      ...selectedClientForProfile,
      processes: updatedProcesses
    });
    setSelectedProcesses(updatedProcesses);
    toast.success(`Process updated to ${stage}`);
  };

  const handleOpenEditClient = () => {
    if (!selectedClientForProfile) return;
    setEditClientForm({
      name: selectedClientForProfile.name,
      email: selectedClientForProfile.email,
      phone: selectedClientForProfile.phone,
      location: selectedClientForProfile.location || "",
      status: selectedClientForProfile.status
    });
    setShowEditClientModal(true);
  };

  const handleSaveEditClient = () => {
    if (!selectedClientForProfile) return;

    const updatedClients = clients.map(c =>
      c.id === selectedClientForProfile.id
        ? { ...c, name: editClientForm.name, email: editClientForm.email, phone: editClientForm.phone, location: editClientForm.location, status: editClientForm.status }
        : c
    );

    setClients(updatedClients);
    setSelectedClientForProfile({
      ...selectedClientForProfile,
      name: editClientForm.name,
      email: editClientForm.email,
      phone: editClientForm.phone,
      location: editClientForm.location,
      status: editClientForm.status
    });
    setShowEditClientModal(false);
    toast.success("Client information updated successfully");
  };

  const handleCallNow = () => {
    if (!selectedClientForProfile) return;
    toast.success(`Calling ${selectedClientForProfile.name}...`);
  };

  const handleSendMessage = () => {
    if (!selectedClientForProfile) return;
    setMessageForm({ message: "" });
    setShowSendMessageModal(true);
  };

  const handleSendMessageSubmit = () => {
    if (!messageForm.message.trim()) {
      toast.error("Please enter a message");
      return;
    }
    setShowSendMessageModal(false);
    toast.success("Message sent successfully");
    setMessageForm({ message: "" });
  };

  const handleOpenScheduleCallFromProfile = () => {
    if (!selectedClientForProfile) return;
    setSelectedClientForScheduling(selectedClientForProfile);
    setShowScheduleCallFromProfile(true);
    setScheduledDate("");
    setScheduledTime("");
  };

  const handleSaveScheduleCallFromProfile = () => {
    if (!scheduledDate || !scheduledTime) {
      toast.error("Please select both date and time");
      return;
    }
    setShowScheduleCallFromProfile(false);
    toast.success("Call scheduled successfully");
    setScheduledDate("");
    setScheduledTime("");
  };

  const handleOpenUpdateStage = () => {
    if (!selectedClientForProfile) return;
    setSelectedStage(selectedClientForProfile.stage);
    setShowUpdateStageModal(true);
  };

  const handleSaveUpdateStage = () => {
    if (!selectedClientForProfile || !selectedStage) return;

    const updatedClients = clients.map(c =>
      c.id === selectedClientForProfile.id
        ? { ...c, stage: selectedStage }
        : c
    );

    setClients(updatedClients);
    setSelectedClientForProfile({
      ...selectedClientForProfile,
      stage: selectedStage
    });
    setShowUpdateStageModal(false);
    toast.success("Stage updated successfully");
  };

  const handleViewCallDetails = (callId: string) => {
    setSelectedCallId(callId);
    setShowCallDetailsFromProfile(true);
  };

  // Mock data for drawer - Sarah Johnson's processes and activities
  const drawerClientProcesses = selectedClientForProfile ? (() => {
    // Extract unique headings from processes (part before colon)
    const headings = new Set<string>();
    selectedClientForProfile.processes.forEach((processName) => {
      const parts = processName.split(':');
      if (parts.length >= 1) {
        headings.add(parts[0].trim());
      }
    });

    return Array.from(headings).map((heading, idx) => ({
      id: `process-${idx + 1}`,
      name: heading,
      currentStage: idx === 0 ? "Insurance Verification" : "Billing Inquiry",
      lastActivity: "Apr 10, 2024",
      status: "In Progress" as "In Progress" | "Completed" | "Pending" | "On Hold",
      created: idx === 0 ? "2024-03-15 09:30" : "2024-04-01 14:20",
      responsible: idx === 0 ? "John Smith" : "Emily Davis"
    }));
  })() : [];

  const drawerActivityItems = selectedClientForProfile ? (() => {
    // Helper function to find process ID by heading
    const findProcessId = (heading: string) => {
      const process = drawerClientProcesses.find(p => p.name === heading);
      return process?.id || "process-1";
    };

    return [
      {
        id: "act-1",
        processId: findProcessId("Patient Intake"),
        processName: "Patient Intake",
        type: "outbound_call" as const,
        date: "Apr 10, 2024",
        time: "2:30 PM",
        title: "Outbound Call Completed",
        stage: "Insurance Verification",
        duration: "4:32",
        status: "Completed",
        callId: "call-001",
      },
      {
        id: "act-2",
        processId: findProcessId("Patient Intake"),
        processName: "Patient Intake",
        type: "stage_change" as const,
        date: "Apr 8, 2024",
        time: "10:15 AM",
        title: "Stage Changed",
        description: "Moved from Initial Contact → Insurance Verification",
      },
      {
        id: "act-3",
        processId: findProcessId("Patient Intake"),
        processName: "Patient Intake",
        type: "outbound_call" as const,
        date: "Apr 8, 2024",
        time: "9:30 AM",
        title: "Outbound Call Completed",
        stage: "Initial Contact",
        duration: "3:15",
        status: "Completed",
        callId: "call-002",
      },
      {
        id: "act-4",
        processId: findProcessId("Patient Intake"),
        processName: "Patient Intake",
        type: "failed_call" as const,
        date: "Apr 7, 2024",
        time: "5:20 PM",
        title: "Outbound Call Failed",
        stage: "Initial Contact",
        duration: "0:00",
        status: "Failed",
        callId: "call-003",
      },
      {
        id: "act-5",
        processId: findProcessId("Follow-up Calls"),
        processName: "Follow-up Calls",
        type: "inbound_call" as const,
        date: "Apr 10, 2024",
        time: "1:45 PM",
        title: "Inbound Call Received",
        stage: "Follow-up",
        duration: "5:05",
        status: "Completed",
        callId: "call-006",
      },
    ];
  })() : [];

  const getDrawerActivityCount = (processId: string) => {
    if (processId === "all") return drawerActivityItems.length;
    return drawerActivityItems.filter(item => item.processId === processId).length;
  };

  const filteredDrawerActivities = activeProcessTabDrawer === "all"
    ? drawerActivityItems
    : drawerActivityItems.filter(item => item.processId === activeProcessTabDrawer);

  const selectedDrawerProcess = drawerClientProcesses.find(p => p.id === activeProcessTabDrawer);

  const getDrawerActivityIcon = (type: string) => {
    switch (type) {
      case "outbound_call": return <PhoneOutgoing className="w-5 h-5" />;
      case "inbound_call": return <PhoneIncoming className="w-5 h-5" />;
      case "failed_call": return <PhoneOff className="w-5 h-5" />;
      case "stage_change": return <Settings className="w-5 h-5" />;
      case "call_scheduled": return <CalendarClock className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  const getDrawerActivityColor = (type: string) => {
    switch (type) {
      case "outbound_call":
      case "inbound_call":
        return "text-secondary bg-secondary/10";
      case "failed_call":
        return "text-destructive bg-destructive/10";
      case "stage_change":
        return "text-primary bg-primary/10";
      case "call_scheduled":
        return "text-warning bg-warning/10";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "text/csv" || file.name.endsWith('.csv')) {
        setSelectedFile(file);
      } else {
        toast.error("Please upload a CSV file");
      }
    }
  };

  const handleExport = () => {
    setIsExporting(true);
    toast.loading("Exporting data...");

    // Simulate export process
    setTimeout(() => {
      setIsExporting(false);
      toast.dismiss();
      toast.success("Clients data exported successfully");
      // In a real app, this would trigger a file download
    }, 2000);
  };

  // Selection handlers
  const handleSelectAll = () => {
    const currentPageClients = paginatedClients.map((c) => c.id);
    if (currentPageClients.every((id) => selectedRows.has(id))) {
      // Deselect all on current page
      setSelectedRows(new Set([...selectedRows].filter((id) => !currentPageClients.includes(id))));
    } else {
      // Select all on current page
      setSelectedRows(new Set([...selectedRows, ...currentPageClients]));
    }
  };

  const handleSelectRow = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  // Bulk actions
  const handleTriggerCalls = () => {
    const count = selectedRows.size;
    if (scheduleOption === "immediate") {
      toast.success(`${count} call${count > 1 ? 's' : ''} triggered successfully`);
    } else {
      toast.success(`${count} call${count > 1 ? 's' : ''} scheduled for ${triggerScheduledDate} at ${triggerScheduledTime}`);
    }
    setSelectedRows(new Set());
    setShowTriggerCallsModal(false);
    setScheduleOption("immediate");
    setTriggerScheduledDate("");
    setTriggerScheduledTime("");
  };

  const handleClearSelection = () => {
    setSelectedRows(new Set());
  };

  // Advanced Filtering Logic
  const filteredClients = clients.filter((client) => {
    // Text search filter
    const matchesSearch = searchQuery === "" ||
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone.includes(searchQuery);

    // Name filter (from dropdown)
    const matchesName = selectedName.length === 0 || selectedName.includes(client.name);

    // Status filter
    const matchesStatus = selectedStatusFilter === 'All' || client.status === selectedStatusFilter;

    // Process filter (renamed to Processes)
    const matchesProcess = selectedProcess.length === 0 ||
      selectedProcess.some(process => client.processes?.includes(process));

    // Responsible filter
    const matchesResponsible = selectedResponsible.length === 0 ||
      (client.responsible && selectedResponsible.includes(client.responsible));

    // Last Contact date filter
    const matchesLastContact = selectedLastContact === "Any date" || (() => {
      const contactDate = new Date(client.lastContact);
      const today = new Date();

      switch (selectedLastContact) {
        case "Today":
          return contactDate.toDateString() === today.toDateString();
        case "Yesterday":
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          return contactDate.toDateString() === yesterday.toDateString();
        case "Last 7 days":
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(today.getDate() - 7);
          return contactDate >= sevenDaysAgo;
        case "Last 30 days":
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(today.getDate() - 30);
          return contactDate >= thirtyDaysAgo;
        default:
          return true;
      }
    })();

    return matchesSearch && matchesName && matchesStatus && matchesProcess && matchesResponsible && matchesLastContact;
  });

  const totalPages = Math.ceil(totalRecords / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalRecords);
  const paginatedClients = filteredClients.slice(0, rowsPerPage); // Show only first page of filtered results

  // Check if all rows on current page are selected
  const currentPageClientIds = paginatedClients.map((c) => c.id);
  const allSelected = currentPageClientIds.length > 0 && currentPageClientIds.every((id) => selectedRows.has(id));
  const someSelected = currentPageClientIds.some((id) => selectedRows.has(id)) && !allSelected;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen" style={{ backgroundColor: '#F9FAFB' }}>
        <div className="py-6 px-[150px] space-y-8">
          <PageHeader
            title="Clients"
            subtitle="Add, search, and manage every contact — then link them to processes and appointments."
          >
            <HowItWorksButton onClick={() => setShowHelp(true)} label="How Clients Works" />
          </PageHeader>

          {/* Action Bar */}
          <div className="bg-card rounded-t-xl p-4 border border-border shadow-sm" style={{ borderBottomLeftRadius: showFilterPanel ? 0 : '0.75rem', borderBottomRightRadius: showFilterPanel ? 0 : '0.75rem' }}>
            <div className="flex flex-wrap items-center gap-3">
              {/* Smart Search Bar with Filter Tags */}
              <div className="flex-1 min-w-64">
                <div className="relative search-bar-container">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none z-10" />
                  <div
                    className="w-full h-[44px] bg-input-background border border-input rounded-xl flex items-center cursor-text overflow-hidden"
                    onClick={() => {
                      setShowSearchModal(true);
                      setShowColumnToggle(false);
                    }}
                  >
                    {/* Scrollable Tags Area */}
                    <div className="flex items-center gap-2 pl-10 pr-2 flex-1 overflow-x-auto overflow-y-hidden h-full" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                      <style>{`
                    .flex.items-center.gap-2.pl-10.pr-2.flex-1.overflow-x-auto::-webkit-scrollbar {
                      display: none;
                    }
                  `}</style>
                      {/* Filter Tags */}
                      {activeFilters.map((filter, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium whitespace-nowrap flex-shrink-0"
                          style={{
                            backgroundColor: '#E8F0FE',
                            borderColor: '#4F8EF7',
                            color: '#4F8EF7',
                            fontFamily: 'Outfit, sans-serif',
                            fontSize: '13px'
                          }}
                        >
                          {filter.label}: {filter.values.join(', ')}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const newFilters = activeFilters.filter((_, i) => i !== index);
                              setActiveFilters(newFilters);
                              // Reset the specific filter
                              if (filter.field === 'name') setSelectedName([]);
                              if (filter.field === 'status') setSelectedStatus([]);
                              if (filter.field === 'process') setSelectedProcess([]);
                              if (filter.field === 'responsible') setSelectedResponsible([]);
                            }}
                            className="hover:opacity-70"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}

                      {/* Search Input */}
                      <input
                        type="text"
                        placeholder={activeFilters.length > 0 ? "" : "Search clients..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => { setShowSearchModal(true); setShowColumnToggle(false); }}
                        onKeyDown={(e) => { if (e.key === 'Escape') { setShowSearchModal(false); setFilterDropdowns({}); setShowAddFieldPopup(false); } }}
                        className="flex-1 bg-transparent border-none outline-none min-w-[120px] h-full"
                        style={{ fontFamily: 'Outfit, sans-serif' }}
                      />
                    </div>

                    {/* Clear All button - Pinned Right */}
                    {activeFilters.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFilters([]);
                          setSelectedName([]);
                          setNameSearch("");
                          setSelectedStatus([]);
                          setSelectedProcess([]);
                          setSelectedResponsible([]);
                          setSelectedLastContact("Any date");
                          setSelectedCreatedOn("Any date");
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground px-3 flex-shrink-0"
                        style={{ fontFamily: 'Outfit, sans-serif', fontSize: '13px' }}
                      >
                        ✕ Clear all
                      </button>
                    )}
                  </div>

                  {/* Advanced Search Modal */}
                  {showSearchModal && (
                    <>
                      {/* Backdrop to close modal */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => {
                          setShowSearchModal(false);
                          setFilterDropdowns({});
                          setShowAddFieldPopup(false);
                        }}
                      />

                      {/* Modal Panel */}
                      <div
                        className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-2xl border border-border z-50 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setShowSearchModal(false);
                            setFilterDropdowns({});
                            setShowAddFieldPopup(false);
                          }
                        }}
                        style={{ minWidth: '720px', width: '720px' }}
                      >
                        <div className="flex" style={{ maxHeight: '580px' }}>
                          {/* Left Sidebar - Preset Filters */}
                          <div className="w-56 border-r border-border p-5 overflow-y-auto bg-muted/20 flex-shrink-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>Presets</p>
                            <div className="space-y-1.5">
                              <button
                                className={`w-full text-left px-4 py-3 text-sm rounded-lg transition-colors font-medium ${activeFilters.length === 0 && searchQuery === ''
                                  ? 'bg-primary/10 text-primary'
                                  : 'hover:bg-muted text-foreground'
                                  }`}
                                style={{ fontFamily: 'Outfit, sans-serif' }}
                                onClick={() => {
                                  setActiveFilters([]);
                                  setSelectedName([]);
                                  setNameSearch("");
                                  setSelectedStatus([]);
                                  setSelectedProcess([]);
                                  setSelectedResponsible([]);
                                  setSelectedLastContact("Any date");
                                  setSelectedCreatedOn("Any date");
                                  setSearchQuery("");
                                }}
                              >
                                All Clients
                              </button>
                              <button
                                className={`w-full text-left px-4 py-3 text-sm rounded-lg transition-colors font-medium ${activeFilters.length === 1 && activeFilters[0]?.field === 'status' && activeFilters[0]?.values.length === 1 && activeFilters[0]?.values[0] === 'Active'
                                  ? 'bg-primary/10 text-primary'
                                  : 'hover:bg-muted text-foreground'
                                  }`}
                                style={{ fontFamily: 'Outfit, sans-serif' }}
                                onClick={() => {
                                  setSelectedStatus(['Active']);
                                  setSelectedName([]);
                                  setSelectedProcess([]);
                                  setSelectedResponsible([]);
                                  setSelectedLastContact("Any date");
                                  setSelectedCreatedOn("Any date");
                                  setSearchQuery("");
                                  setActiveFilters([{ field: 'status', label: 'Status', values: ['Active'] }]);
                                }}
                              >
                                Active Clients
                              </button>
                              <button
                                className={`w-full text-left px-4 py-3 text-sm rounded-lg transition-colors font-medium ${activeFilters.length === 1 && activeFilters[0]?.field === 'status' && activeFilters[0]?.values.length === 1 && activeFilters[0]?.values[0] === 'Inactive'
                                  ? 'bg-primary/10 text-primary'
                                  : 'hover:bg-muted text-foreground'
                                  }`}
                                style={{ fontFamily: 'Outfit, sans-serif' }}
                                onClick={() => {
                                  setSelectedStatus(['Inactive']);
                                  setSelectedName([]);
                                  setSelectedProcess([]);
                                  setSelectedResponsible([]);
                                  setSelectedLastContact("Any date");
                                  setSelectedCreatedOn("Any date");
                                  setSearchQuery("");
                                  setActiveFilters([{ field: 'status', label: 'Status', values: ['Inactive'] }]);
                                }}
                              >
                                Inactive Clients
                              </button>
                            </div>
                          </div>

                          {/* Right Side - Filter Fields */}
                          <div className="flex-1 p-6 overflow-y-auto">
                            <div className="space-y-5">

                              {/* Row 1: NAME and RESPONSIBLE PERSON */}
                              <div className="grid grid-cols-2 gap-4">
                                {/* Name — plain text input */}
                                <div>
                                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                    Name
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Filter by name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                                    style={{ fontFamily: 'Outfit, sans-serif', height: '42px' }}
                                  />
                                </div>

                                {/* Responsible person — multi-select dropdown with avatars */}
                                <div className="relative">
                                  <div className="flex items-center gap-1 mb-2">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                      Responsible person
                                    </label>
                                    <InfoTooltip text="Show clients assigned to this team member." />
                                  </div>
                                  <div
                                    onClick={() => setFilterDropdowns(prev => ({ ...prev, responsible: !prev.responsible }))}
                                    className="w-full px-4 py-2.5 border border-border rounded-lg text-sm cursor-pointer bg-white min-h-[42px] flex items-center flex-wrap gap-1.5"
                                  >
                                    {selectedResponsible.length === 0 ? (
                                      <span className="text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>Select person(s)...</span>
                                    ) : (
                                      selectedResponsible.map((person) => (
                                        <span key={person} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                          {person}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const next = selectedResponsible.filter(r => r !== person);
                                              setSelectedResponsible(next);
                                              if (next.length > 0) {
                                                setActiveFilters(prev => {
                                                  const exists = prev.find(f => f.field === 'responsible');
                                                  return exists
                                                    ? prev.map(f => f.field === 'responsible' ? { ...f, values: next } : f)
                                                    : [...prev, { field: 'responsible', label: 'Responsible', values: next }];
                                                });
                                              } else {
                                                setActiveFilters(prev => prev.filter(f => f.field !== 'responsible'));
                                              }
                                            }}
                                            className="hover:opacity-70"
                                          >&times;</button>
                                        </span>
                                      ))
                                    )}
                                  </div>
                                  {filterDropdowns.responsible && (
                                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                                      <div className="p-3 border-b border-border sticky top-0 bg-white">
                                        <input
                                          type="text"
                                          placeholder="Search..."
                                          value={responsibleSearch}
                                          onChange={(e) => setResponsibleSearch(e.target.value)}
                                          className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                                          style={{ fontFamily: 'Outfit, sans-serif' }}
                                        />
                                      </div>
                                      {teamMembers
                                        .filter(m => m.toLowerCase().includes(responsibleSearch.toLowerCase()))
                                        .map((member) => {
                                          const initials = member.split(' ').map(n => n[0]).join('');
                                          return (
                                            <label key={member} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={selectedResponsible.includes(member)}
                                                onChange={(e) => {
                                                  const next = e.target.checked
                                                    ? [...selectedResponsible, member]
                                                    : selectedResponsible.filter(r => r !== member);
                                                  setSelectedResponsible(next);
                                                  if (next.length > 0) {
                                                    setActiveFilters(prev => {
                                                      const exists = prev.find(f => f.field === 'responsible');
                                                      return exists
                                                        ? prev.map(f => f.field === 'responsible' ? { ...f, values: next } : f)
                                                        : [...prev, { field: 'responsible', label: 'Responsible', values: next }];
                                                    });
                                                  } else {
                                                    setActiveFilters(prev => prev.filter(f => f.field !== 'responsible'));
                                                  }
                                                }}
                                                className="w-4 h-4"
                                              />
                                              <div
                                                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                                                style={{ backgroundColor: '#4F8EF7' }}
                                              >
                                                {initials}
                                              </div>
                                              <span className="text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>{member}</span>
                                            </label>
                                          );
                                        })}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Row 2: STATUS and CREATED ON */}
                              <div className="grid grid-cols-2 gap-4">
                                {/* Status — dropdown selector */}
                                <div>
                                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                    Status
                                  </label>
                                  <select
                                    value={selectedStatusFilter}
                                    onChange={(e) => {
                                      setSelectedStatusFilter(e.target.value);
                                      if (e.target.value !== 'All') {
                                        setActiveFilters(prev => {
                                          const exists = prev.find(f => f.field === 'status');
                                          return exists
                                            ? prev.map(f => f.field === 'status' ? { ...f, values: [e.target.value] } : f)
                                            : [...prev, { field: 'status', label: 'Status', values: [e.target.value] }];
                                        });
                                      } else {
                                        setActiveFilters(prev => prev.filter(f => f.field !== 'status'));
                                      }
                                    }}
                                    className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                                    style={{ fontFamily: 'Outfit, sans-serif', height: '42px' }}
                                  >
                                    <option>All</option>
                                    <option>Active</option>
                                    <option>Inactive</option>
                                  </select>
                                </div>

                                {/* Created on — date select */}
                                <div>
                                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                    Created on
                                  </label>
                                  <select
                                    value={selectedCreatedOn}
                                    onChange={(e) => setSelectedCreatedOn(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                                    style={{ fontFamily: 'Outfit, sans-serif', height: '42px' }}
                                  >
                                    <option>Any date</option>
                                    <option>Today</option>
                                    <option>Yesterday</option>
                                    <option>Last 7 days</option>
                                    <option>Last 30 days</option>
                                    <option>Custom range</option>
                                  </select>
                                  {selectedCreatedOn === "Custom range" && (
                                    <div className="mt-3 grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="block text-xs font-medium mb-1.5 text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>From</label>
                                        <input
                                          type="date"
                                          value={customDateStart}
                                          onChange={(e) => setCustomDateStart(e.target.value)}
                                          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                          style={{ fontFamily: 'Outfit, sans-serif', height: '42px' }}
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium mb-1.5 text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>To</label>
                                        <input
                                          type="date"
                                          value={customDateEnd}
                                          onChange={(e) => setCustomDateEnd(e.target.value)}
                                          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                          style={{ fontFamily: 'Outfit, sans-serif', height: '42px' }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Row 3: PROCESSES and Add field button */}
                              <div className="grid grid-cols-2 gap-4">
                                {/* Processes — multi-select dropdown */}
                                <div className="relative">
                                  <div className="flex items-center gap-1 mb-2">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                      Processes
                                    </label>
                                    <InfoTooltip text="Show clients enrolled in one or more of these workflows." />
                                  </div>
                                  <div
                                    onClick={() => setFilterDropdowns(prev => ({ ...prev, processes: !prev.processes }))}
                                    className="w-full px-4 py-2.5 border border-border rounded-lg text-sm cursor-pointer bg-white min-h-[42px] flex items-center flex-wrap gap-1.5"
                                  >
                                    {selectedProcess.length === 0 ? (
                                      <span className="text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>Select processes...</span>
                                    ) : (
                                      selectedProcess.map((process) => (
                                        <span key={process} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                          {process}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const next = selectedProcess.filter(p => p !== process);
                                              setSelectedProcess(next);
                                              if (next.length > 0) {
                                                setActiveFilters(prev => {
                                                  const exists = prev.find(f => f.field === 'processes');
                                                  return exists
                                                    ? prev.map(f => f.field === 'processes' ? { ...f, values: next } : f)
                                                    : [...prev, { field: 'processes', label: 'Processes', values: next }];
                                                });
                                              } else {
                                                setActiveFilters(prev => prev.filter(f => f.field !== 'processes'));
                                              }
                                            }}
                                            className="hover:opacity-70"
                                          >&times;</button>
                                        </span>
                                      ))
                                    )}
                                  </div>
                                  {filterDropdowns.processes && (
                                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                                      <div className="p-2">
                                        <label className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={selectedProcess.length === availableProcesses.length}
                                            onChange={(e) => {
                                              const next = e.target.checked ? availableProcesses : [];
                                              setSelectedProcess(next);
                                              if (next.length > 0) {
                                                setActiveFilters(prev => {
                                                  const exists = prev.find(f => f.field === 'processes');
                                                  return exists
                                                    ? prev.map(f => f.field === 'processes' ? { ...f, values: next } : f)
                                                    : [...prev, { field: 'processes', label: 'Processes', values: next }];
                                                });
                                              } else {
                                                setActiveFilters(prev => prev.filter(f => f.field !== 'processes'));
                                              }
                                            }}
                                            className="w-4 h-4"
                                          />
                                          <span className="text-sm font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>Select all</span>
                                        </label>
                                        {availableProcesses.map((process) => (
                                          <label key={process} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={selectedProcess.includes(process)}
                                              onChange={(e) => {
                                                const next = e.target.checked
                                                  ? [...selectedProcess, process]
                                                  : selectedProcess.filter(p => p !== process);
                                                setSelectedProcess(next);
                                                if (next.length > 0) {
                                                  setActiveFilters(prev => {
                                                    const exists = prev.find(f => f.field === 'processes');
                                                    return exists
                                                      ? prev.map(f => f.field === 'processes' ? { ...f, values: next } : f)
                                                      : [...prev, { field: 'processes', label: 'Processes', values: next }];
                                                  });
                                                } else {
                                                  setActiveFilters(prev => prev.filter(f => f.field !== 'processes'));
                                                }
                                              }}
                                              className="w-4 h-4"
                                            />
                                            <span className="text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>{process}</span>
                                          </label>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Add field button */}
                                <div className="relative">
                                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground opacity-0">Spacer</label>
                                  <button
                                    onClick={() => setShowAddFieldPopup(!showAddFieldPopup)}
                                    className="w-full h-[42px] px-4 flex items-center gap-2 border border-dashed rounded-lg hover:bg-gray-50 transition-colors add-field-button"
                                    style={{ borderColor: '#4F8EF7', color: '#4F8EF7', fontFamily: 'Outfit, sans-serif', fontSize: '14px' }}
                                  >
                                    <Plus className="w-4 h-4" />
                                    Add field
                                  </button>

                                  {/* Nested Add Field Popup */}
                                  {showAddFieldPopup && (
                                    <div
                                      className="absolute top-full left-0 mt-1.5 bg-white border border-border rounded-lg shadow-lg z-50 add-field-popup-container"
                                      style={{
                                        width: '320px',
                                        maxHeight: '400px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                      }}
                                    >
                                      <div className="p-4">
                                        <h3 className="font-semibold mb-3" style={{ fontFamily: 'Outfit, sans-serif', fontSize: '14px', color: '#1F2937' }}>
                                          Add filter fields
                                        </h3>
                                        <div className="space-y-2 max-h-80 overflow-y-auto">
                                          {['Phone', 'Email', 'Location', 'Company', 'Role', 'Last Contact Date', 'Tags'].map((field) => (
                                            <label
                                              key={field}
                                              className="flex items-center gap-2 px-2 py-2 hover:bg-blue-50 rounded cursor-pointer"
                                            >
                                              <input
                                                type="checkbox"
                                                checked={activeFilterFields.includes(field)}
                                                onChange={(e) => {
                                                  if (e.target.checked) {
                                                    setActiveFilterFields([...activeFilterFields, field]);
                                                  } else {
                                                    setActiveFilterFields(activeFilterFields.filter(f => f !== field));
                                                  }
                                                }}
                                                className="w-4 h-4"
                                                style={{ accentColor: '#4F8EF7' }}
                                              />
                                              <span className="text-sm" style={{ fontFamily: 'Outfit, sans-serif', color: '#374151' }}>
                                                {field}
                                              </span>
                                            </label>
                                          ))}
                                        </div>
                                        <div className="mt-4 pt-3 border-t border-border">
                                          <button
                                            onClick={() => setShowAddFieldPopup(false)}
                                            className="w-full px-4 py-2 rounded-md text-white text-sm font-medium hover:opacity-90 transition-opacity"
                                            style={{ backgroundColor: '#4F8EF7', fontFamily: 'Outfit, sans-serif' }}
                                          >
                                            Done
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Optional fields that can be added */}
                              {activeFilterFields.includes("Phone") && (
                                <div>
                                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                    Phone
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Enter phone number..."
                                    className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                                    style={{ fontFamily: 'Outfit, sans-serif', height: '42px' }}
                                  />
                                </div>
                              )}

                              {activeFilterFields.includes("Email") && (
                                <div>
                                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                    Email
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Enter email..."
                                    className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                                    style={{ fontFamily: 'Outfit, sans-serif', height: '42px' }}
                                  />
                                </div>
                              )}

                              {activeFilterFields.includes("Location") && (
                                <div>
                                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                    Location
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Enter location..."
                                    className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                                    style={{ fontFamily: 'Outfit, sans-serif', height: '42px' }}
                                  />
                                </div>
                              )}

                              {activeFilterFields.includes("Company") && (
                                <div>
                                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                    Company
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Enter company..."
                                    className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                                    style={{ fontFamily: 'Outfit, sans-serif', height: '42px' }}
                                  />
                                </div>
                              )}

                              {activeFilterFields.includes("Role") && (
                                <div>
                                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                    Role
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Enter role..."
                                    className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                                    style={{ fontFamily: 'Outfit, sans-serif', height: '42px' }}
                                  />
                                </div>
                              )}

                              {activeFilterFields.includes("Last Contact Date") && (
                                <div>
                                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                    Last Contact Date
                                  </label>
                                  <select
                                    value={selectedLastContact}
                                    onChange={(e) => setSelectedLastContact(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                                    style={{ fontFamily: 'Outfit, sans-serif', height: '42px' }}
                                  >
                                    <option>Any date</option>
                                    <option>Today</option>
                                    <option>Yesterday</option>
                                    <option>Last 7 days</option>
                                    <option>Last 30 days</option>
                                    <option>Custom range</option>
                                  </select>
                                </div>
                              )}

                              {activeFilterFields.includes("Tags") && (
                                <div>
                                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                    Tags
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Enter tags..."
                                    className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                                    style={{ fontFamily: 'Outfit, sans-serif', height: '42px' }}
                                  />
                                </div>
                              )}

                            </div>

                            {/* Footer actions */}
                            <div className="flex items-center justify-between mt-6 pt-5 border-t border-border">
                              <div className="flex items-center gap-4">
                                <button
                                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
                                  style={{ fontFamily: 'Outfit, sans-serif' }}
                                  onClick={() => {
                                    setActiveFilterFields(["Name", "Status", "Processes", "Responsible", "Created on"]);
                                  }}
                                >
                                  <span>&#8635;</span> Restore default fields
                                </button>
                              </div>
                              <button
                                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1.5 font-medium transition-colors"
                                style={{ fontFamily: 'Outfit, sans-serif' }}
                              >
                                <span>+</span> Save filter
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Results count when filters active */}
                {activeFilters.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1 ml-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {filteredClients.length} results found
                  </p>
                )}
              </div>

              <Tooltip text="Add Client">
                <Button variant="primary" onClick={() => setShowAddModal(true)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </Tooltip>

              <Tooltip text="Import">
                <Button variant="outline" onClick={() => setShowImportModal(true)}>
                  <Upload className="w-4 h-4" />
                </Button>
              </Tooltip>

              <Tooltip text="Export">
                <Button variant="outline" onClick={handleExport} loading={isExporting}>
                  <Download className="w-4 h-4" />
                </Button>
              </Tooltip>
            </div>
          </div>


          {/* Filter Panel */}
          {showFilterPanel && (
            <div
              className="bg-white border border-t-0 border-border rounded-b-xl shadow-lg p-4 mb-4 filter-panel-container"
              style={{
                borderColor: '#E2E8F0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                animation: 'slideDown 200ms ease'
              }}
            >
              {/* Filter Fields Row 1 - NAME and RESPONSIBLE PERSON */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                {/* Name Filter */}
                {activeFilterFields.includes("Name") && (
                  <div className="relative">
                    <label className="block text-xs uppercase font-semibold mb-1.5" style={{ color: '#6B7280', fontFamily: 'Outfit, sans-serif' }}>
                      NAME
                    </label>
                    <button
                      onClick={() => setFilterDropdowns({ ...filterDropdowns, name: !filterDropdowns.name })}
                      className="w-full h-10 px-3 flex items-center justify-between bg-white border rounded-md hover:bg-gray-50 transition-colors"
                      style={{ borderColor: '#E2E8F0', fontFamily: 'Outfit, sans-serif', fontSize: '13px' }}
                    >
                      <span className="text-muted-foreground">
                        {selectedName.length > 0 ? `${selectedName.length} selected` : 'Search by name...'}
                      </span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </button>

                    {/* Name Dropdown */}
                    {filterDropdowns.name && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-white border rounded-lg shadow-lg z-50 filter-dropdown-container" style={{ borderColor: '#E2E8F0' }}>
                        <div className="p-2 border-b" style={{ borderColor: '#E2E8F0' }}>
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                              type="text"
                              placeholder="Search by name..."
                              value={nameSearch}
                              onChange={(e) => setNameSearch(e.target.value)}
                              className="w-full pl-8 pr-3 py-2 border rounded text-sm"
                              style={{ borderColor: '#E2E8F0', fontFamily: 'Outfit, sans-serif' }}
                            />
                          </div>
                        </div>
                        <div className="p-2 max-h-48 overflow-y-auto">
                          {clients
                            .map(c => c.name)
                            .filter((name, index, self) => self.indexOf(name) === index)
                            .filter(name => name.toLowerCase().includes(nameSearch.toLowerCase()))
                            .map((name) => (
                              <label key={name} className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 rounded cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedName.includes(name)}
                                  onChange={(e) => {
                                    const newName = e.target.checked
                                      ? [...selectedName, name]
                                      : selectedName.filter(n => n !== name);
                                    setSelectedName(newName);
                                    // Update tags immediately
                                    if (newName.length > 0) {
                                      const existingFilter = activeFilters.find(f => f.field === 'name');
                                      if (existingFilter) {
                                        setActiveFilters(activeFilters.map(f =>
                                          f.field === 'name' ? { ...f, values: newName } : f
                                        ));
                                      } else {
                                        setActiveFilters([...activeFilters, { field: 'name', label: 'Name', values: newName }]);
                                      }
                                    } else {
                                      setActiveFilters(activeFilters.filter(f => f.field !== 'name'));
                                    }
                                  }}
                                  className="w-4 h-4"
                                  style={{ accentColor: '#4F8EF7' }}
                                />
                                <span className="text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>{name}</span>
                              </label>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Responsible Person Filter */}
                {activeFilterFields.includes("Responsible") && (
                  <div className="relative">
                    <label className="block text-xs uppercase font-semibold mb-1.5" style={{ color: '#6B7280', fontFamily: 'Outfit, sans-serif' }}>
                      RESPONSIBLE PERSON
                    </label>
                    <button
                      onClick={() => setFilterDropdowns({ ...filterDropdowns, responsible: !filterDropdowns.responsible })}
                      className="w-full h-10 px-3 flex items-center justify-between bg-white border rounded-md hover:bg-gray-50 transition-colors"
                      style={{ borderColor: '#E2E8F0', fontFamily: 'Outfit, sans-serif', fontSize: '13px' }}
                    >
                      <span className="text-muted-foreground">
                        {selectedResponsible.length > 0 ? `${selectedResponsible.length} selected` : 'Select responsible person'}
                      </span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </button>

                    {/* Responsible Dropdown */}
                    {filterDropdowns.responsible && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-white border rounded-lg shadow-lg z-50 filter-dropdown-container" style={{ borderColor: '#E2E8F0' }}>
                        <div className="p-2 border-b" style={{ borderColor: '#E2E8F0' }}>
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                              type="text"
                              placeholder="Search..."
                              value={responsibleSearch}
                              onChange={(e) => setResponsibleSearch(e.target.value)}
                              className="w-full pl-8 pr-3 py-2 border rounded text-sm"
                              style={{ borderColor: '#E2E8F0', fontFamily: 'Outfit, sans-serif' }}
                            />
                          </div>
                        </div>
                        <div className="p-2 max-h-48 overflow-y-auto">
                          <label className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedResponsible.length === teamMembers.length}
                              onChange={(e) => {
                                const newResponsible = e.target.checked ? teamMembers : [];
                                setSelectedResponsible(newResponsible);
                                // Update tags immediately
                                if (newResponsible.length > 0) {
                                  const existingFilter = activeFilters.find(f => f.field === 'responsible');
                                  if (existingFilter) {
                                    setActiveFilters(activeFilters.map(f =>
                                      f.field === 'responsible' ? { ...f, values: newResponsible } : f
                                    ));
                                  } else {
                                    setActiveFilters([...activeFilters, { field: 'responsible', label: 'Responsible', values: newResponsible }]);
                                  }
                                } else {
                                  setActiveFilters(activeFilters.filter(f => f.field !== 'responsible'));
                                }
                              }}
                              className="w-4 h-4"
                              style={{ accentColor: '#4F8EF7' }}
                            />
                            <span className="text-sm font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>Select all</span>
                          </label>
                          {teamMembers
                            .filter(member => member.toLowerCase().includes(responsibleSearch.toLowerCase()))
                            .map((member) => {
                              const initials = member.split(' ').map(n => n[0]).join('');
                              return (
                                <label key={member} className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 rounded cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedResponsible.includes(member)}
                                    onChange={(e) => {
                                      const newResponsible = e.target.checked
                                        ? [...selectedResponsible, member]
                                        : selectedResponsible.filter(m => m !== member);
                                      setSelectedResponsible(newResponsible);
                                      // Update tags immediately
                                      if (newResponsible.length > 0) {
                                        const existingFilter = activeFilters.find(f => f.field === 'responsible');
                                        if (existingFilter) {
                                          setActiveFilters(activeFilters.map(f =>
                                            f.field === 'responsible' ? { ...f, values: newResponsible } : f
                                          ));
                                        } else {
                                          setActiveFilters([...activeFilters, { field: 'responsible', label: 'Responsible', values: newResponsible }]);
                                        }
                                      } else {
                                        setActiveFilters(activeFilters.filter(f => f.field !== 'responsible'));
                                      }
                                    }}
                                    className="w-4 h-4"
                                    style={{ accentColor: '#4F8EF7' }}
                                  />
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                                      style={{ backgroundColor: '#4F8EF7' }}
                                    >
                                      {initials}
                                    </div>
                                    <span className="text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>{member}</span>
                                  </div>
                                </label>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Filter Fields Row 2 - STATUS and CREATED ON */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                {/* Status Filter */}
                {activeFilterFields.includes("Status") && (
                  <div className="relative">
                    <label className="block text-xs uppercase font-semibold mb-1.5" style={{ color: '#6B7280', fontFamily: 'Outfit, sans-serif' }}>
                      STATUS
                    </label>
                    <button
                      onClick={() => setFilterDropdowns({ ...filterDropdowns, status: !filterDropdowns.status })}
                      className="w-full h-10 px-3 flex items-center justify-between bg-white border rounded-md hover:bg-gray-50 transition-colors"
                      style={{ borderColor: '#E2E8F0', fontFamily: 'Outfit, sans-serif', fontSize: '13px' }}
                    >
                      <span className="text-muted-foreground">
                        {selectedStatusFilter}
                      </span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </button>

                    {/* Status Dropdown */}
                    {filterDropdowns.status && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-white border rounded-lg shadow-lg z-50 filter-dropdown-container" style={{ borderColor: '#E2E8F0' }}>
                        <div className="p-2">
                          {['All', 'Active', 'Inactive'].map((status) => (
                            <button
                              key={status}
                              onClick={() => {
                                setSelectedStatusFilter(status);
                                setFilterDropdowns({ ...filterDropdowns, status: false });
                                // Update tags
                                if (status !== 'All') {
                                  const existingFilter = activeFilters.find(f => f.field === 'status');
                                  if (existingFilter) {
                                    setActiveFilters(activeFilters.map(f =>
                                      f.field === 'status' ? { ...f, values: [status] } : f
                                    ));
                                  } else {
                                    setActiveFilters([...activeFilters, { field: 'status', label: 'Status', values: [status] }]);
                                  }
                                } else {
                                  setActiveFilters(activeFilters.filter(f => f.field !== 'status'));
                                }
                              }}
                              className={`w-full px-3 py-2 text-left hover:bg-blue-50 rounded text-sm ${selectedStatusFilter === status ? 'bg-blue-50' : ''}`}
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Created On Filter */}
                {activeFilterFields.includes("Created on") && (
                  <div className="relative">
                    <label className="block text-xs uppercase font-semibold mb-1.5" style={{ color: '#6B7280', fontFamily: 'Outfit, sans-serif' }}>
                      CREATED ON
                    </label>
                    <button
                      onClick={() => setFilterDropdowns({ ...filterDropdowns, createdOn: !filterDropdowns.createdOn })}
                      className="w-full h-10 px-3 flex items-center justify-between bg-white border rounded-md hover:bg-gray-50 transition-colors"
                      style={{ borderColor: '#E2E8F0', fontFamily: 'Outfit, sans-serif', fontSize: '13px' }}
                    >
                      <span className="text-muted-foreground">{selectedCreatedOn}</span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </button>

                    {/* Created On Dropdown */}
                    {filterDropdowns.createdOn && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-white border rounded-lg shadow-lg z-50 filter-dropdown-container" style={{ borderColor: '#E2E8F0' }}>
                        <div className="p-2">
                          {['Any date', 'Today', 'Yesterday', 'This week', 'Last 7 days', 'This month', 'Custom range'].map((option) => (
                            <button
                              key={option}
                              onClick={() => {
                                setSelectedCreatedOn(option);
                                if (option !== 'Custom range') {
                                  setFilterDropdowns({ ...filterDropdowns, createdOn: false });
                                  if (option !== 'Any date') {
                                    const existingFilter = activeFilters.find(f => f.field === 'createdOn');
                                    if (existingFilter) {
                                      setActiveFilters(activeFilters.map(f =>
                                        f.field === 'createdOn' ? { ...f, values: [option] } : f
                                      ));
                                    } else {
                                      setActiveFilters([...activeFilters, { field: 'createdOn', label: 'Created on', values: [option] }]);
                                    }
                                  }
                                }
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-blue-50 rounded text-sm"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Filter Fields Row 3 - PROCESSES and Add field */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Processes Filter */}
                {activeFilterFields.includes("Processes") && (
                  <div className="relative">
                    <label className="block text-xs uppercase font-semibold mb-1.5" style={{ color: '#6B7280', fontFamily: 'Outfit, sans-serif' }}>
                      PROCESSES
                    </label>
                    <button
                      onClick={() => setFilterDropdowns({ ...filterDropdowns, processes: !filterDropdowns.processes })}
                      className="w-full h-10 px-3 flex items-center justify-between bg-white border rounded-md hover:bg-gray-50 transition-colors"
                      style={{ borderColor: '#E2E8F0', fontFamily: 'Outfit, sans-serif', fontSize: '13px' }}
                    >
                      <span className="text-muted-foreground">
                        {selectedProcess.length > 0 ? `${selectedProcess.length} selected` : 'Select processes'}
                      </span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </button>

                    {/* Processes Dropdown */}
                    {filterDropdowns.processes && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-white border rounded-lg shadow-lg z-50 filter-dropdown-container" style={{ borderColor: '#E2E8F0' }}>
                        <div className="p-2 max-h-64 overflow-y-auto">
                          <label className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedProcess.length === availableProcesses.length}
                              onChange={(e) => {
                                const newProcess = e.target.checked ? availableProcesses : [];
                                setSelectedProcess(newProcess);
                                // Update tags immediately
                                if (newProcess.length > 0) {
                                  const existingFilter = activeFilters.find(f => f.field === 'processes');
                                  if (existingFilter) {
                                    setActiveFilters(activeFilters.map(f =>
                                      f.field === 'processes' ? { ...f, values: newProcess } : f
                                    ));
                                  } else {
                                    setActiveFilters([...activeFilters, { field: 'processes', label: 'Processes', values: newProcess }]);
                                  }
                                } else {
                                  setActiveFilters(activeFilters.filter(f => f.field !== 'processes'));
                                }
                              }}
                              className="w-4 h-4"
                              style={{ accentColor: '#4F8EF7' }}
                            />
                            <span className="text-sm font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>Select all</span>
                          </label>
                          {availableProcesses.map((process) => (
                            <label key={process} className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedProcess.includes(process)}
                                onChange={(e) => {
                                  const newProcess = e.target.checked
                                    ? [...selectedProcess, process]
                                    : selectedProcess.filter(p => p !== process);
                                  setSelectedProcess(newProcess);
                                  // Update tags immediately
                                  if (newProcess.length > 0) {
                                    const existingFilter = activeFilters.find(f => f.field === 'processes');
                                    if (existingFilter) {
                                      setActiveFilters(activeFilters.map(f =>
                                        f.field === 'processes' ? { ...f, values: newProcess } : f
                                      ));
                                    } else {
                                      setActiveFilters([...activeFilters, { field: 'processes', label: 'Processes', values: newProcess }]);
                                    }
                                  } else {
                                    setActiveFilters(activeFilters.filter(f => f.field !== 'processes'));
                                  }
                                }}
                                className="w-4 h-4"
                                style={{ accentColor: '#4F8EF7' }}
                              />
                              <span className="text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>{process}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Add Field Button with Nested Popup */}
                <div className="relative">
                  <label className="block text-xs uppercase font-semibold mb-1.5 opacity-0">SPACER</label>
                  <button
                    onClick={() => setShowAddFieldPopup(!showAddFieldPopup)}
                    className="h-10 px-4 flex items-center gap-2 border border-dashed rounded-md hover:bg-gray-50 transition-colors add-field-button"
                    style={{ borderColor: '#4F8EF7', color: '#4F8EF7', fontFamily: 'Outfit, sans-serif', fontSize: '13px' }}
                  >
                    <Plus className="w-4 h-4" />
                    Add field
                  </button>

                  {/* Nested Add Field Popup */}
                  {showAddFieldPopup && (
                    <div
                      className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-50 add-field-popup-container"
                      style={{
                        borderColor: '#E2E8F0',
                        width: '320px',
                        maxHeight: '400px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }}
                    >
                      <div className="p-4">
                        <h3 className="font-semibold mb-3" style={{ fontFamily: 'Outfit, sans-serif', fontSize: '14px', color: '#1F2937' }}>
                          Add filter fields
                        </h3>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {['Phone', 'Email', 'Location', 'Company', 'Role', 'Last Contact Date', 'Tags'].map((field) => (
                            <label
                              key={field}
                              className="flex items-center gap-2 px-2 py-2 hover:bg-blue-50 rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={activeFilterFields.includes(field)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setActiveFilterFields([...activeFilterFields, field]);
                                  } else {
                                    setActiveFilterFields(activeFilterFields.filter(f => f !== field));
                                  }
                                }}
                                className="w-4 h-4"
                                style={{ accentColor: '#4F8EF7' }}
                              />
                              <span className="text-sm" style={{ fontFamily: 'Outfit, sans-serif', color: '#374151' }}>
                                {field}
                              </span>
                            </label>
                          ))}
                        </div>
                        <div className="mt-4 pt-3 border-t" style={{ borderColor: '#E2E8F0' }}>
                          <button
                            onClick={() => setShowAddFieldPopup(false)}
                            className="w-full px-4 py-2 rounded-md text-white text-sm font-medium hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: '#4F8EF7', fontFamily: 'Outfit, sans-serif' }}
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Optional Fields that can be added */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Last Contact Date Filter */}
                {activeFilterFields.includes("Last Contact Date") && (
                  <div className="relative">
                    <label className="block text-xs uppercase font-semibold mb-1.5" style={{ color: '#6B7280', fontFamily: 'Outfit, sans-serif' }}>
                      LAST CONTACT DATE
                    </label>
                    <button
                      onClick={() => setFilterDropdowns({ ...filterDropdowns, lastContact: !filterDropdowns.lastContact })}
                      className="w-full h-10 px-3 flex items-center justify-between bg-white border rounded-md hover:bg-gray-50 transition-colors"
                      style={{ borderColor: '#E2E8F0', fontFamily: 'Outfit, sans-serif', fontSize: '13px' }}
                    >
                      <span className="text-muted-foreground">{selectedLastContact}</span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </button>

                    {/* Last Contact Dropdown */}
                    {filterDropdowns.lastContact && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-white border rounded-lg shadow-lg z-50 filter-dropdown-container" style={{ borderColor: '#E2E8F0' }}>
                        <div className="p-2">
                          {['Any date', 'Today', 'Yesterday', 'Last 7 days', 'Last 30 days', 'Custom range'].map((option) => (
                            <button
                              key={option}
                              onClick={() => {
                                setSelectedLastContact(option);
                                if (option !== 'Custom range') {
                                  setFilterDropdowns({ ...filterDropdowns, lastContact: false });
                                  if (option !== 'Any date') {
                                    const existingFilter = activeFilters.find(f => f.field === 'lastContact');
                                    if (existingFilter) {
                                      setActiveFilters(activeFilters.map(f =>
                                        f.field === 'lastContact' ? { ...f, values: [option] } : f
                                      ));
                                    } else {
                                      setActiveFilters([...activeFilters, { field: 'lastContact', label: 'Last Contact', values: [option] }]);
                                    }
                                  }
                                }
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-blue-50 rounded text-sm"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            >
                              {option}
                            </button>
                          ))}
                          {selectedLastContact === 'Custom range' && (
                            <div className="p-3 border-t" style={{ borderColor: '#E2E8F0' }}>
                              <div className="space-y-2">
                                <input
                                  type="date"
                                  value={customDateStart}
                                  onChange={(e) => setCustomDateStart(e.target.value)}
                                  className="w-full px-3 py-2 border rounded text-sm"
                                  style={{ borderColor: '#E2E8F0' }}
                                />
                                <input
                                  type="date"
                                  value={customDateEnd}
                                  onChange={(e) => setCustomDateEnd(e.target.value)}
                                  className="w-full px-3 py-2 border rounded text-sm"
                                  style={{ borderColor: '#E2E8F0' }}
                                />
                                <Button
                                  variant="primary"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => {
                                    setFilterDropdowns({ ...filterDropdowns, lastContact: false });
                                    const dateRange = `${customDateStart} - ${customDateEnd}`;
                                    const existingFilter = activeFilters.find(f => f.field === 'lastContact');
                                    if (existingFilter) {
                                      setActiveFilters(activeFilters.map(f =>
                                        f.field === 'lastContact' ? { ...f, values: [dateRange] } : f
                                      ));
                                    } else {
                                      setActiveFilters([...activeFilters, { field: 'lastContact', label: 'Last Contact', values: [dateRange] }]);
                                    }
                                  }}
                                  style={{ backgroundColor: '#4F8EF7', fontSize: '13px' }}
                                >
                                  Apply
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Phone Filter */}
                {activeFilterFields.includes("Phone") && (
                  <div>
                    <label className="block text-xs uppercase font-semibold mb-1.5" style={{ color: '#6B7280', fontFamily: 'Outfit, sans-serif' }}>
                      PHONE
                    </label>
                    <input
                      type="text"
                      placeholder="Enter phone number..."
                      className="w-full h-10 px-3 bg-white border rounded-md text-sm"
                      style={{ borderColor: '#E2E8F0', fontFamily: 'Outfit, sans-serif' }}
                    />
                  </div>
                )}

                {/* Email Filter */}
                {activeFilterFields.includes("Email") && (
                  <div>
                    <label className="block text-xs uppercase font-semibold mb-1.5" style={{ color: '#6B7280', fontFamily: 'Outfit, sans-serif' }}>
                      EMAIL
                    </label>
                    <input
                      type="text"
                      placeholder="Enter email..."
                      className="w-full h-10 px-3 bg-white border rounded-md text-sm"
                      style={{ borderColor: '#E2E8F0', fontFamily: 'Outfit, sans-serif' }}
                    />
                  </div>
                )}

                {/* Location Filter */}
                {activeFilterFields.includes("Location") && (
                  <div>
                    <label className="block text-xs uppercase font-semibold mb-1.5" style={{ color: '#6B7280', fontFamily: 'Outfit, sans-serif' }}>
                      LOCATION
                    </label>
                    <input
                      type="text"
                      placeholder="Enter location..."
                      className="w-full h-10 px-3 bg-white border rounded-md text-sm"
                      style={{ borderColor: '#E2E8F0', fontFamily: 'Outfit, sans-serif' }}
                    />
                  </div>
                )}

                {/* Company Filter */}
                {activeFilterFields.includes("Company") && (
                  <div>
                    <label className="block text-xs uppercase font-semibold mb-1.5" style={{ color: '#6B7280', fontFamily: 'Outfit, sans-serif' }}>
                      COMPANY
                    </label>
                    <input
                      type="text"
                      placeholder="Enter company..."
                      className="w-full h-10 px-3 bg-white border rounded-md text-sm"
                      style={{ borderColor: '#E2E8F0', fontFamily: 'Outfit, sans-serif' }}
                    />
                  </div>
                )}

                {/* Role Filter */}
                {activeFilterFields.includes("Role") && (
                  <div>
                    <label className="block text-xs uppercase font-semibold mb-1.5" style={{ color: '#6B7280', fontFamily: 'Outfit, sans-serif' }}>
                      ROLE
                    </label>
                    <input
                      type="text"
                      placeholder="Enter role..."
                      className="w-full h-10 px-3 bg-white border rounded-md text-sm"
                      style={{ borderColor: '#E2E8F0', fontFamily: 'Outfit, sans-serif' }}
                    />
                  </div>
                )}

                {/* Tags Filter */}
                {activeFilterFields.includes("Tags") && (
                  <div>
                    <label className="block text-xs uppercase font-semibold mb-1.5" style={{ color: '#6B7280', fontFamily: 'Outfit, sans-serif' }}>
                      TAGS
                    </label>
                    <input
                      type="text"
                      placeholder="Enter tags..."
                      className="w-full h-10 px-3 bg-white border rounded-md text-sm"
                      style={{ borderColor: '#E2E8F0', fontFamily: 'Outfit, sans-serif' }}
                    />
                  </div>
                )}
              </div>

              {/* Bottom Action Bar */}
              <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: '#E2E8F0' }}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const allIds = new Set(filteredClients.map(c => c.id));
                        setSelectedRows(allIds);
                      } else {
                        setSelectedRows(new Set());
                      }
                    }}
                    className="w-4 h-4"
                    style={{ accentColor: '#4F8EF7' }}
                  />
                  <span className="text-sm text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>select all</span>
                </label>

                <div className="flex items-center gap-3">
                  <Button
                    variant="primary"
                    onClick={() => {
                      setShowFilterPanel(false);
                      toast.success('Filters applied');
                    }}
                    style={{ backgroundColor: '#4F8EF7', height: '36px', borderRadius: '6px', fontFamily: 'Outfit, sans-serif' }}
                  >
                    <Search className="w-4 h-4" />
                    Search
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveFilters([]);
                      setSelectedName([]);
                      setNameSearch("");
                      setSelectedStatus([]);
                      setSelectedProcess([]);
                      setSelectedResponsible([]);
                      setResponsibleSearch("");
                      setSelectedLastContact("Any date");
                      setSelectedCreatedOn("Any date");
                      toast.info('Filters reset');
                    }}
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  >
                    Reset
                  </Button>

                  <button
                    className="text-sm hover:underline"
                    style={{ color: '#4F8EF7', fontFamily: 'Outfit, sans-serif' }}
                    onClick={() => toast.info('Save filter feature coming soon')}
                  >
                    Save filter
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Action Bar */}
          {selectedRows.size > 0 && (
            <div className="bg-card rounded-xl border border-border shadow-sm">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                    {selectedRows.size} selected
                  </span>
                  <button
                    onClick={handleClearSelection}
                    className="text-xs hover:text-foreground transition-colors"
                    style={{ color: '#6B7280', fontFamily: 'Outfit, sans-serif' }}
                  >
                    Clear selection
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {!isBulkEditMode ? (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setShowTriggerCallsModal(true)}
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Trigger Calls
                      </Button>

                      <Tooltip text="Delete selected clients">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete ${selectedRows.size} client(s)?`)) {
                              setClients(prev => prev.filter(client => !selectedRows.has(client.id)));
                              setSelectedRows(new Set());
                              toast.success(`${selectedRows.size} client(s) deleted successfully`);
                            }
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </Tooltip>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleEnterBulkEdit}
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Edit
                        </Button>
                        <InfoTooltip text="Edit name, email, or phone for every selected client at once." />
                      </div>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelBulkEdit}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSaveBulkEdit}
                      >
                        Save
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden relative">
            <div
              ref={tableScrollRef}
              className="overflow-x-auto scrollbar-hide"
              style={{ scrollBehavior: 'auto' }}
              onScroll={() => {
                if (tableScrollRef.current) {
                  const { scrollWidth, clientWidth, scrollLeft } = tableScrollRef.current;
                  const canScrollRight = scrollWidth > clientWidth && scrollLeft < (scrollWidth - clientWidth - 10);
                  const canScrollLeft = scrollLeft > 10;
                  setShowScrollIndicator(canScrollRight);
                  setShowScrollLeftIndicator(canScrollLeft);
                }
              }}
            >
              <table className="w-full min-w-[1200px]">
                <thead className="border-b border-border" style={{ backgroundColor: '#1F2937' }}>
                  <tr>
                    {/* Checkbox column */}
                    <th className="px-4 py-2.5 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected;
                        }}
                        onChange={handleSelectAll}
                        className="w-3.5 h-3.5 cursor-pointer rounded border-[1.5px] border-[#E5E7EB] checked:bg-[#4F8EF7] checked:border-[#4F8EF7]"
                      />
                    </th>
                    {/* Settings icon above hamburger menu column */}
                    <th className="px-2 py-2.5 text-center relative" style={{ width: '32px' }}>
                      <div className="relative inline-block">
                        <button
                          onClick={() => {
                            setShowColumnToggle(!showColumnToggle);
                            setShowFilterPanel(false);
                          }}
                          className="inline-flex items-center justify-center w-8 h-8 rounded transition-colors hover:bg-white/10"
                          aria-label="Customize Columns"
                        >
                          <SettingsIcon className="w-4 h-4 text-[#E5E7EB] hover:text-white transition-colors" />
                        </button>
                        {showColumnToggle && (
                          <div className="absolute left-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-lg p-4 z-50">
                            <h3 className="font-semibold mb-3" style={{ color: '#1F2937', fontFamily: 'DM Sans, sans-serif' }}>Visible Columns</h3>
                            <div className="space-y-2">
                              {Object.keys(visibleColumns).map((col) => (
                                <label key={col} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={visibleColumns[col as keyof typeof visibleColumns]}
                                    onChange={(e) =>
                                      setVisibleColumns({
                                        ...visibleColumns,
                                        [col]: e.target.checked,
                                      })
                                    }
                                    className="w-4 h-4"
                                  />
                                  <span className="text-sm capitalize" style={{ fontFamily: 'Outfit, sans-serif' }}>{col}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </th>
                    {columnOrder.map((columnKey, index) => {
                      const columnLabels: { [key: string]: string } = {
                        name: 'Name',
                        email: 'Email',
                        phone: 'Phone',
                        responsible: 'Responsible',
                        lastContact: 'Last Contact',
                        status: 'Status',
                      };

                      return visibleColumns[columnKey as keyof typeof visibleColumns] ? (
                        <DraggableColumnHeader
                          key={columnKey}
                          columnKey={columnKey}
                          index={index}
                          label={columnLabels[columnKey]}
                          moveColumn={moveColumn}
                        />
                      ) : null;
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedClients.map((client) => (
                    <tr
                      key={client.id}
                      className={`transition-colors ${selectedRows.has(client.id)
                        ? "bg-[#E8F0FE]"
                        : "hover:bg-[#F1F5F9]"
                        }`}
                    >
                      {/* Checkbox column */}
                      <td className="px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(client.id)}
                          onChange={() => handleSelectRow(client.id)}
                          className="w-3.5 h-3.5 cursor-pointer rounded border-[1.5px] border-[#E5E7EB] checked:bg-[#4F8EF7] checked:border-[#4F8EF7]"
                        />
                      </td>
                      {/* Hamburger menu column */}
                      <td className="px-2 py-2.5 relative">
                        <div className="hamburger-menu-container">
                          <button
                            onClick={() => setOpenMenuClientId(openMenuClientId === client.id ? null : client.id)}
                            className="p-1 hover:bg-muted rounded transition-colors flex items-center justify-center"
                            style={{ width: '24px', height: '24px' }}
                          >
                            <MoreVertical className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                          </button>

                          {/* Hamburger menu popup */}
                          {openMenuClientId === client.id && (
                            <div
                              className="absolute left-8 top-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg z-50"
                              style={{
                                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                                minWidth: '160px',
                                padding: '4px'
                              }}
                            >
                              <button
                                onClick={() => {
                                  setOpenMenuClientId(null);
                                  navigate(`/clients/${client.id}`);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-[#E8F0FE] transition-colors"
                                style={{ fontFamily: 'Outfit, sans-serif', color: '#1F2937' }}
                              >
                                <Eye className="w-4 h-4" />
                                <span>View Profile</span>
                              </button>
                              <button
                                onClick={() => {
                                  handleOpenScheduleModal(client);
                                  setOpenMenuClientId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-[#E8F0FE] transition-colors"
                                style={{ fontFamily: 'Outfit, sans-serif', color: '#1F2937' }}
                              >
                                <Phone className="w-4 h-4" />
                                <span>Call</span>
                              </button>
                              <button
                                onClick={() => {
                                  handleDeleteClient(client.id);
                                  setOpenMenuClientId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-[#E8F0FE] transition-colors"
                                style={{ fontFamily: 'Outfit, sans-serif', color: '#1F2937' }}
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      {columnOrder.map((columnKey) =>
                        visibleColumns[columnKey as keyof typeof visibleColumns] ? renderCell(columnKey, client) : null
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Scroll Right Indicator */}
            {/* Scroll Right Button - Semicircle (2 rows height, centered) */}
            <button
              className="absolute right-0 flex items-center justify-center pointer-events-auto z-10 transition-all"
              style={{
                top: '50%',
                transform: 'translateY(-50%)',
                height: '112px', // Approximately 2 table rows (56px each)
                width: '40px',
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                borderTopLeftRadius: '9999px',
                borderBottomLeftRadius: '9999px',
                borderTopRightRadius: '0',
                borderBottomRightRadius: '0',
                opacity: showScrollIndicator ? 1 : 0.2,
                pointerEvents: showScrollIndicator ? 'auto' : 'none'
              }}
              onMouseEnter={(e) => {
                if (showScrollIndicator) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.65)';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                  const icon = e.currentTarget.querySelector('svg');
                  if (icon) {
                    (icon as SVGElement).style.transform = 'scale(1.1)';
                  }
                  handleScrollRightMouseEnter();
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                e.currentTarget.style.boxShadow = '';
                const icon = e.currentTarget.querySelector('svg');
                if (icon) {
                  (icon as SVGElement).style.transform = 'scale(1)';
                }
                handleScrollMouseLeave();
              }}
            >
              <ChevronRight className="w-5 h-5 transition-transform" style={{ color: '#1F2937', opacity: 1 }} />
            </button>

            {/* Scroll Left Button - Semicircle (2 rows height, centered) */}
            <button
              className="absolute left-0 flex items-center justify-center pointer-events-auto z-10 transition-all"
              style={{
                top: '50%',
                transform: 'translateY(-50%)',
                height: '112px', // Approximately 2 table rows (56px each)
                width: '40px',
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                borderTopRightRadius: '9999px',
                borderBottomRightRadius: '9999px',
                borderTopLeftRadius: '0',
                borderBottomLeftRadius: '0',
                opacity: showScrollLeftIndicator ? 1 : 0.2,
                pointerEvents: showScrollLeftIndicator ? 'auto' : 'none'
              }}
              onMouseEnter={(e) => {
                if (showScrollLeftIndicator) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.65)';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                  const icon = e.currentTarget.querySelector('svg');
                  if (icon) {
                    (icon as SVGElement).style.transform = 'scale(1.1)';
                  }
                  handleScrollLeftMouseEnter();
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                e.currentTarget.style.boxShadow = '';
                const icon = e.currentTarget.querySelector('svg');
                if (icon) {
                  (icon as SVGElement).style.transform = 'scale(1)';
                }
                handleScrollMouseLeave();
              }}
            >
              <ChevronLeft className="w-5 h-5 transition-transform" style={{ color: '#1F2937', opacity: 1 }} />
            </button>

            {/* Pagination Controls */}
            <div className="border-t border-border px-4 py-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: '#6B7280', fontFamily: 'Outfit, sans-serif' }}>Rows per page:</span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
                      className="px-2 py-1 bg-input-background border border-input rounded-lg text-xs"
                    >
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                  <span className="text-xs" style={{ color: '#6B7280', fontFamily: 'Outfit, sans-serif' }}>
                    Showing {startIndex + 1}–{endIndex} of {totalRecords.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <Tooltip text="First Page">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="p-1.5 hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronsLeft className="w-3.5 h-3.5" />
                    </button>
                  </Tooltip>
                  <Tooltip text="Previous Page">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-1.5 hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  </Tooltip>
                  <span className="text-xs px-2 hidden sm:inline" style={{ color: '#6B7280', fontFamily: 'Outfit, sans-serif' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <span className="text-xs px-2 sm:hidden" style={{ color: '#6B7280', fontFamily: 'Outfit, sans-serif' }}>
                    {currentPage}/{totalPages}
                  </span>
                  <Tooltip text="Next Page">
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-1.5 hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </Tooltip>
                  <Tooltip text="Last Page">
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-1.5 hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronsRight className="w-3.5 h-3.5" />
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>

          {/* Add Client Modal */}
          <Modal
            isOpen={showAddModal}
            onClose={() => {
              setShowAddModal(false);
              setShowAdditionalDetails(false);
            }}
            title="Add New Client"
            footer={
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowAdditionalDetails(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleAddClient}
                  disabled={!newClient.name || !newClient.phone || newClient.stage.length === 0 || !newClient.responsible}
                >
                  Add Client
                </Button>
              </>
            }
          >
            <div className="space-y-6">
              {/* Section 1: Client Information (Primary) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-foreground" style={{ fontFamily: 'DM Sans, sans-serif' }}>Client Information</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      Client Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={newClient.name}
                      onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                      placeholder="Enter client name"
                      className="w-full px-4 py-3 bg-input-background border-2 border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                      style={{ fontFamily: 'Outfit, sans-serif' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      Phone Number <span className="text-destructive">*</span>
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={`${newClient.countryFlag}|${newClient.countryCode}`}
                        onChange={(e) => {
                          const [flag, code] = e.target.value.split("|");
                          setNewClient({ ...newClient, countryFlag: flag, countryCode: code });
                        }}
                        className="w-32 px-3 py-3 bg-input-background border-2 border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                        style={{ fontFamily: 'Outfit, sans-serif' }}
                      >
                        {countries.map((country) => (
                          <option key={`${country.flag}-${country.code}`} value={`${country.flag}|${country.code}`}>
                            {country.flag} {country.code}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        value={newClient.phone}
                        onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                        placeholder="5551234567"
                        className="flex-1 px-4 py-3 bg-input-background border-2 border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                        style={{ fontFamily: 'Outfit, sans-serif' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>Email Address</label>
                    <input
                      type="email"
                      value={newClient.email}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                      placeholder="client@email.com"
                      className="w-full px-4 py-3 bg-input-background border-2 border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                      style={{ fontFamily: 'Outfit, sans-serif' }}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border/50"></div>

              {/* Section 2: Process Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-foreground" style={{ fontFamily: 'DM Sans, sans-serif' }}>Process Details</h3>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-3 text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Stage <span className="text-destructive">*</span>
                  </label>

                  {/* Selected stages as capsules */}
                  {newClient.stage.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3 p-3 bg-muted/30 rounded-xl border border-border/50">
                      {newClient.stage.map((selectedStage) => (
                        <div
                          key={selectedStage}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-primary/15 to-primary/10 text-primary rounded-lg text-sm font-medium border border-primary/30 shadow-sm hover:shadow-md transition-all"
                          style={{ fontFamily: 'Outfit, sans-serif' }}
                        >
                          <span>{selectedStage}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setNewClient({
                                ...newClient,
                                stage: newClient.stage.filter((s) => s !== selectedStage),
                              });
                            }}
                            className="hover:bg-primary/30 rounded-full p-1 transition-all hover:scale-110"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Dropdown to add stages */}
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <ProcessStageSelect
                      selectedProcess={modalProcess}
                      selectedStage={modalStage}
                      onProcessChange={setModalProcess}
                      onStageChange={(stage) => {
                        setModalStage(stage);
                        if (modalProcess && stage) {
                          const fullLabel = `${modalProcess}: ${stage}`;
                          if (!newClient.stage.includes(fullLabel)) {
                            setNewClient({
                              ...newClient,
                              stage: [...newClient.stage, fullLabel],
                            });
                          }
                          setModalStage("");
                        }
                      }}
                      theme="crm"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border/50"></div>

              {/* Section 3: Responsible Person */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-foreground" style={{ fontFamily: 'DM Sans, sans-serif' }}>Assignment</h3>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-3 text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Responsible <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <select
                      value={newClient.responsible}
                      onChange={(e) => setNewClient({ ...newClient, responsible: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 bg-input-background border-2 border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                      style={{ fontFamily: 'Outfit, sans-serif' }}
                    >
                      <option value="">Select team member...</option>
                      {teamMembers.map((member) => (
                        <option key={member} value={member}>
                          {member}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/50"></div>

              {/* Progressive Disclosure Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdditionalDetails(!showAdditionalDetails)}
                  className="flex items-center justify-between w-full px-5 py-4 bg-gradient-to-r from-muted/40 to-muted/20 hover:from-muted/60 hover:to-muted/30 rounded-xl transition-all border border-border/50 hover:border-border shadow-sm hover:shadow"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${showAdditionalDetails ? "bg-primary/10" : "bg-muted/50"
                      }`}>
                      <svg className={`w-4 h-4 transition-colors ${showAdditionalDetails ? "text-primary" : "text-muted-foreground"
                        }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>Additional Details (Optional)</span>
                  </div>
                  <svg
                    className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${showAdditionalDetails ? "rotate-180" : ""
                      }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {showAdditionalDetails && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-200 p-4 bg-muted/10 rounded-xl border border-border/30">
                  {/* Section 3: Call Preferences */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-bold text-foreground" style={{ fontFamily: 'DM Sans, sans-serif' }}>Call Preferences</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>Preferred Calling Time</label>
                        <input
                          type="time"
                          value={newClient.preferredCallingTime}
                          onChange={(e) => setNewClient({ ...newClient, preferredCallingTime: e.target.value })}
                          className="w-full px-4 py-3 bg-input-background border-2 border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                          style={{ fontFamily: 'Outfit, sans-serif' }}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-2 text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>Timezone</label>
                        <select
                          value={newClient.timezone}
                          onChange={(e) => setNewClient({ ...newClient, timezone: e.target.value })}
                          className="w-full px-4 py-3 bg-input-background border-2 border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                          style={{ fontFamily: 'Outfit, sans-serif' }}
                        >
                          <option value="America/New_York">Eastern Time (ET)</option>
                          <option value="America/Chicago">Central Time (CT)</option>
                          <option value="America/Denver">Mountain Time (MT)</option>
                          <option value="America/Los_Angeles">Pacific Time (PT)</option>
                          <option value="America/Anchorage">Alaska Time (AKT)</option>
                          <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
                          <option value="Asia/Kolkata">India Standard Time (IST)</option>
                          <option value="Europe/London">Greenwich Mean Time (GMT)</option>
                          <option value="Australia/Sydney">Australian Eastern Time (AET)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border/50"></div>

                  {/* Section 4: Business / Context Info */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-bold text-foreground" style={{ fontFamily: 'DM Sans, sans-serif' }}>Business & Context Info</h3>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>Source</label>
                      <input
                        type="text"
                        value={newClient.source}
                        onChange={(e) => setNewClient({ ...newClient, source: e.target.value })}
                        placeholder="e.g., Website, Referral, Social"
                        className="w-full px-4 py-3 bg-input-background border-2 border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                        style={{ fontFamily: 'Outfit, sans-serif' }}
                      />
                    </div>
                  </div>

                  <div className="border-t border-border/50"></div>

                  {/* Section 5: Company Details */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-secondary/10 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-bold text-foreground" style={{ fontFamily: 'DM Sans, sans-serif' }}>Company Details</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>Company Name</label>
                        <input
                          type="text"
                          value={newClient.companyName}
                          onChange={(e) => setNewClient({ ...newClient, companyName: e.target.value })}
                          placeholder="Company name"
                          className="w-full px-4 py-3 bg-input-background border-2 border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                          style={{ fontFamily: 'Outfit, sans-serif' }}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold mb-2 text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>Job Position</label>
                          <input
                            type="text"
                            value={newClient.jobPosition}
                            onChange={(e) => setNewClient({ ...newClient, jobPosition: e.target.value })}
                            placeholder="Job title"
                            className="w-full px-4 py-3 bg-input-background border-2 border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                            style={{ fontFamily: 'Outfit, sans-serif' }}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold mb-2 text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>Number of Employees</label>
                          <input
                            type="number"
                            value={newClient.numberOfEmployees}
                            onChange={(e) => setNewClient({ ...newClient, numberOfEmployees: e.target.value })}
                            placeholder="e.g., 50"
                            className="w-full px-4 py-3 bg-input-background border-2 border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                            style={{ fontFamily: 'Outfit, sans-serif' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </Modal>

          {/* Import Clients Drawer */}
          {showImportModal && (
            <>
              {/* Overlay */}
              <div
                className="fixed inset-0 bg-black/30 z-40 animate-fade-in"
                onClick={() => {
                  setShowImportModal(false);
                  setSelectedFile(null);
                  setImportMethod("csv");
                  setWebhookConfigs([
                    {
                      id: crypto.randomUUID(),
                      title: "Webhook 1",
                      webhookLabel: "",
                      selectedFields: [],
                      fieldSearchQuery: "",
                      fieldDropdownOpen: false,
                      apiKey: null,
                      apiKeyLabelInput: "",
                      generated: false,
                      isExpanded: true,
                    }
                  ]);
                }}
              />

              {/* Drawer Container */}
              <div className="fixed right-0 top-0 h-full w-[500px] bg-white z-50 shadow-xl flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-gray-700" />
                    <h2 className="text-base font-bold text-gray-900">Import Clients</h2>
                  </div>
                  <button
                    onClick={() => {
                      setShowImportModal(false);
                      setSelectedFile(null);
                      setImportMethod("csv");
                      setWebhookConfigs([
                        {
                          id: crypto.randomUUID(),
                          title: "Webhook 1",
                          webhookLabel: "",
                          selectedFields: [],
                          fieldSearchQuery: "",
                          fieldDropdownOpen: false,
                          apiKey: null,
                          apiKeyLabelInput: "",
                          generated: false,
                          isExpanded: true,
                        }
                      ]);
                    }}
                    className="w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                  <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg w-fit">
                    {(["csv", "webhook"] as const).map((method) => {
                      const tooltipText = method === "csv"
                        ? "Import clients by uploading a standard CSV file."
                        : "Get a URL you can call from an external system to create clients automatically.";
                      return (
                        <div key={method} className="flex items-center gap-0.5 px-1">
                          <button
                            onClick={() => setImportMethod(method)}
                            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${importMethod === method ? "bg-primary text-white" : "text-gray-600 hover:text-gray-900"
                              }`}
                          >
                            {method === "csv" ? "CSV" : "Webhook"}
                          </button>
                          <InfoTooltip text={tooltipText} />
                        </div>
                      );
                    })}
                  </div>

                  {importMethod === "csv" && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Upload a CSV file to import {entityLabel}. Make sure your file follows the correct format.
                      </p>

                      {/* Template Download Box */}
                      <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-foreground">Need a template?</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Download our sample CSV file</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* File Upload - Drag and Drop */}
                      <div>
                        <label className="block text-sm font-medium mb-2">Upload CSV File</label>
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${isDragging
                            ? "border-primary bg-primary/5"
                            : "border-border bg-input-background"
                            }`}
                        >
                          <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileSelect}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            id="file-upload"
                          />
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="w-8 h-8 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">
                                <label htmlFor="file-upload" className="text-primary cursor-pointer hover:underline">
                                  Click to upload
                                </label>
                                {" "}or drag and drop
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">CSV files only</p>
                            </div>
                          </div>
                        </div>
                        {selectedFile && (
                          <div className="mt-3 p-3 bg-muted rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-primary" />
                              <span className="text-sm font-medium">{selectedFile.name}</span>
                            </div>
                            <button
                              onClick={() => setSelectedFile(null)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}


              {importMethod === "webhook" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Use a webhook URL to automatically create single {entityLabel} whenever an external system sends data to it.
                  </p>

                  {/* Webhook config cards */}
                  <div className="space-y-3">
                    {webhookConfigs.map((config, idx) => {
                      const mergedClientFields = getMergedClientFields();
                      const filtered = mergedClientFields.filter(f =>
                        f.label.toLowerCase().includes(config.fieldSearchQuery.toLowerCase()) ||
                        f.key.toLowerCase().includes(config.fieldSearchQuery.toLowerCase())
                      );
                      const systemFields = filtered.filter(f => f.source === "system");
                      const customFields = filtered.filter(f => f.source === "custom");

                      const handleSelectAll = () => {
                        const keysToAdd = filtered.map(f => f.key);
                        updateConfig(config.id, { selectedFields: Array.from(new Set([...config.selectedFields, ...keysToAdd])) });
                      };
                      const handleClearAll = () => {
                        const keysToRemove = new Set(filtered.map(f => f.key));
                        updateConfig(config.id, { selectedFields: config.selectedFields.filter(k => !keysToRemove.has(k)) });
                      };

                      const renderFieldRow = (f: typeof mergedClientFields[0]) => {
                        const isChecked = config.selectedFields.includes(f.key);
                        return (
                          <label
                            key={f.key}
                            className="flex items-center justify-between gap-4 px-3 py-2.5 hover:bg-muted/30 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    updateConfig(config.id, { selectedFields: [...config.selectedFields, f.key] });
                                  } else {
                                    updateConfig(config.id, { selectedFields: config.selectedFields.filter(k => k !== f.key) });
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded border-gray-300 text-primary focus:ring-primary flex-shrink-0"
                              />
                              <span className="font-medium text-foreground truncate">{f.label}</span>
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                              {f.key}
                            </span>
                          </label>
                        );
                      };

                      const handleGenerateKey = () => {
                        const newKey = `sk_live_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
                        const finalLabel = config.apiKeyLabelInput.trim() || `Key ${idx + 1}`;
                        updateConfig(config.id, {
                          apiKey: { id: crypto.randomUUID(), label: finalLabel, value: newKey },
                          apiKeyLabelInput: "",
                        });
                      };

                      const handleRegenerateKey = () => {
                        const newKey = `sk_live_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
                        const currentLabel = config.apiKey?.label || `Key ${idx + 1}`;
                        updateConfig(config.id, {
                          apiKey: { id: crypto.randomUUID(), label: currentLabel, value: newKey },
                        });
                      };

                      const webhookUrl = getWebhookManualUrl(config.apiKey?.value ?? "", config.selectedFields);

                      return (
                        <div
                          key={config.id}
                          className="border border-border rounded-xl overflow-hidden shadow-sm bg-white"
                        >
                          {/* Card Header */}
                          <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20 border-b border-border">
                            <span className="font-medium text-sm">
                              {config.webhookLabel.trim() ? config.webhookLabel : config.title}
                            </span>
                            <div className="flex items-center gap-1">
                              {webhookConfigs.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setWebhookConfigs(prev => prev.filter(c => c.id !== config.id))}
                                  title="Remove webhook"
                                  className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => updateConfig(config.id, { isExpanded: !config.isExpanded })}
                                className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
                              >
                                <ChevronDown className={`w-4 h-4 transition-transform ${config.isExpanded ? "rotate-180" : ""}`} />
                              </button>
                            </div>
                          </div>

                          {/* Card Body */}
                          {config.isExpanded && (
                            <div className="p-4 space-y-4">
                              {/* Webhook Label Input */}
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1">
                                  <label className="text-xs font-semibold text-foreground">Webhook Label</label>
                                  <InfoTooltip text="A short internal name to identify this webhook." />
                                </div>
                                <input
                                  type="text"
                                  value={config.webhookLabel}
                                  onChange={(e) => updateConfig(config.id, { webhookLabel: e.target.value })}
                                  placeholder="e.g. CRM Sync, Zapier Import"
                                  className="w-full px-3 py-2 bg-input-background border border-input rounded-lg text-sm"
                                />
                              </div>

                              {/* Select Fields */}
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1">
                                  <label className="text-xs font-semibold text-foreground">Select fields</label>
                                  <InfoTooltip text="Select the fields that will be sent in the webhook payload." />
                                </div>
                                <div className={`relative field-dropdown-${config.id}`}>
                                  <button
                                    type="button"
                                    onClick={() => updateConfig(config.id, { fieldDropdownOpen: !config.fieldDropdownOpen })}
                                    className="w-full h-10 px-3 flex items-center justify-between bg-white border rounded-md hover:bg-gray-50 transition-colors"
                                    style={{ borderColor: '#E2E8F0', fontFamily: 'Outfit, sans-serif', fontSize: '13px' }}
                                  >
                                    {config.selectedFields.length > 0 ? (
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-semibold flex items-center gap-1">
                                          {config.selectedFields.length} selected
                                          <span
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              updateConfig(config.id, { selectedFields: [] });
                                            }}
                                            className="hover:bg-primary/20 rounded-full p-0.5 cursor-pointer flex items-center justify-center"
                                            title="Clear selection"
                                          >
                                            <X className="w-2.5 h-2.5" />
                                          </span>
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground">Select fields...</span>
                                    )}
                                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${config.fieldDropdownOpen ? "rotate-180" : ""}`} />
                                  </button>

                                  {config.fieldDropdownOpen && (
                                    <div className="absolute top-full left-0 mt-1 w-full bg-white border border-border rounded-lg shadow-lg z-50 flex flex-col overflow-hidden max-h-[280px]">
                                      {/* Search box */}
                                      <div className="p-2 border-b border-border bg-muted/10 flex items-center gap-2">
                                        <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                        <input
                                          type="text"
                                          placeholder="Search fields..."
                                          value={config.fieldSearchQuery}
                                          onChange={(e) => updateConfig(config.id, { fieldSearchQuery: e.target.value })}
                                          className="bg-transparent text-xs w-full focus:outline-none border-none p-0"
                                        />
                                        {config.fieldSearchQuery && (
                                          <button
                                            type="button"
                                            onClick={() => updateConfig(config.id, { fieldSearchQuery: "" })}
                                            className="text-muted-foreground hover:text-foreground"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>

                                      {/* Select All / Clear All */}
                                      <div className="px-3 py-1.5 border-b border-border bg-muted/5 flex items-center justify-between text-xs flex-shrink-0">
                                        <span className="text-muted-foreground text-[11px] font-medium">
                                          {filtered.length} field{filtered.length !== 1 ? 's' : ''} found
                                        </span>
                                        <div className="flex items-center gap-2">
                                          <button type="button" onClick={handleSelectAll} className="text-primary hover:underline text-[11px] font-semibold">Select all</button>
                                          <span className="text-muted-foreground/30">|</span>
                                          <button type="button" onClick={handleClearAll} className="text-primary hover:underline text-[11px] font-semibold">Clear all</button>
                                        </div>
                                      </div>

                                      {/* Field list */}
                                      <div className="overflow-y-auto divide-y divide-border text-xs flex-1">
                                        {systemFields.length > 0 && (
                                          <div>
                                            <div className="divide-y divide-border">{systemFields.map(renderFieldRow)}</div>
                                          </div>
                                        )}
                                        {customFields.length > 0 && (
                                          <div>
                                            <div className="divide-y divide-border">{customFields.map(renderFieldRow)}</div>
                                          </div>
                                        )}
                                        {filtered.length === 0 && (
                                          <div className="p-4 text-center text-muted-foreground">No fields match your search</div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* API Key Section */}
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1">
                                  <label className="text-xs font-semibold text-foreground">API Key</label>
                                  <InfoTooltip text="The secret key used to authenticate requests to this webhook URL." />
                                </div>
                                {config.apiKey ? (
                                  <div className="flex flex-col gap-2 p-3 border border-primary/30 bg-primary/5 rounded-lg">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs font-bold text-foreground">{config.apiKey.label}</span>
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            navigator.clipboard.writeText(config.apiKey!.value);
                                            toast.success("API key copied");
                                          }}
                                          title="Copy key"
                                          className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
                                        >
                                          <Copy className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={handleRegenerateKey}
                                          title="Regenerate key"
                                          className="p-1 hover:bg-amber-50 text-muted-foreground hover:text-amber-600 rounded transition-colors"
                                        >
                                          <RefreshCw className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                    <code className="font-mono text-[10px] text-muted-foreground bg-white border border-border px-2 py-1 rounded select-all break-all">
                                      {config.apiKey.value}
                                    </code>
                                  </div>
                                ) : (
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      placeholder="e.g. Production, Zapier, Staging"
                                      value={config.apiKeyLabelInput}
                                      onChange={(e) => updateConfig(config.id, { apiKeyLabelInput: e.target.value })}
                                      className="flex-1 h-9 px-2.5 bg-input-background border border-input rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                      style={{ fontFamily: 'Outfit, sans-serif' }}
                                    />
                                    <button
                                      type="button"
                                      onClick={handleGenerateKey}
                                      className="h-9 px-3 bg-primary text-white text-xs font-semibold rounded-md hover:bg-primary/90 transition-colors flex items-center gap-1 flex-shrink-0"
                                    >
                                      <Plus className="w-3.5 h-3.5" /> Generate
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Generate Webhook Button */}
                              <div>
                                <Button
                                  variant="primary"
                                  className="w-full"
                                  onClick={() => updateConfig(config.id, { generated: true })}
                                >
                                  Generate Webhook
                                </Button>
                              </div>

                              {/* Generated URL */}
                              {config.generated && (
                                <div className="space-y-2 pt-1 border-t border-border animate-fade-in">
                                  <p className="text-sm font-semibold">Webhook URL</p>
                                  <p className="text-[11px] text-muted-foreground">Send a GET request to this URL to create a {entityLabel} record.</p>
                                  <div className="relative bg-white border border-border rounded-lg pl-3 pr-10 py-2">
                                    <code className="text-xs text-foreground break-all font-mono">{webhookUrl}</code>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(webhookUrl);
                                        toast.success("Webhook URL copied");
                                      }}
                                      className="absolute top-1.5 right-1.5 p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
                                      title="Copy"
                                      aria-label="Copy Webhook URL"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  {!config.apiKey && (
                                    <p className="text-[11px] text-amber-600 flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                      Generate an API key above to replace the placeholder in the URL.
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Webhook Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setWebhookConfigs(prev => [
                        ...prev.map(c => ({ ...c, isExpanded: false })),
                        {
                          id: crypto.randomUUID(),
                          title: `Webhook ${prev.length + 1}`,
                          webhookLabel: "",
                          selectedFields: [],
                          fieldSearchQuery: "",
                          fieldDropdownOpen: false,
                          apiKey: null,
                          apiKeyLabelInput: "",
                          generated: false,
                          isExpanded: true,
                        },
                      ]);
                    }}
                    className="w-full py-2 border border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Add another webhook
                  </button>
                </div>
              )}
                </div>

                <div className="border-t border-gray-200 px-5 py-4 bg-gray-50 flex items-center justify-end gap-3">
                  {importMethod === "webhook" ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowImportModal(false);
                        setSelectedFile(null);
                        setImportMethod("csv");
                        setWebhookConfigs([
                          {
                            id: crypto.randomUUID(),
                            title: "Webhook 1",
                            webhookLabel: "",
                            selectedFields: [],
                            fieldSearchQuery: "",
                            fieldDropdownOpen: false,
                            apiKey: null,
                            apiKeyLabelInput: "",
                            generated: false,
                            isExpanded: true,
                          }
                        ]);
                      }}
                    >
                      Close
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowImportModal(false);
                          setSelectedFile(null);
                          setImportMethod("csv");
                          setWebhookConfigs([
                            {
                              id: crypto.randomUUID(),
                              title: "Webhook 1",
                              webhookLabel: "",
                              selectedFields: [],
                              fieldSearchQuery: "",
                              fieldDropdownOpen: false,
                              apiKey: null,
                              apiKeyLabelInput: "",
                              generated: false,
                              isExpanded: true,
                            }
                          ]);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button variant="primary" onClick={handleImport}>
                        Import
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}


          {/* Schedule Call Drawer */}
          {showScheduleCallModal && (
            <>
              {/* Overlay */}
              <div
                className="fixed inset-0 bg-black/30 z-40"
                onClick={() => {
                  setShowScheduleCallModal(false);
                  setSelectedClientForScheduling(null);
                  setScheduledDate("");
                  setScheduledTime("");
                }}
              />

              {/* Drawer */}
              <div className="fixed right-0 top-0 h-full w-[440px] bg-white z-50 shadow-xl flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-700" />
                    <h2 className="text-base font-bold text-gray-900">Schedule Call</h2>
                  </div>
                  <button
                    onClick={() => {
                      setShowScheduleCallModal(false);
                      setSelectedClientForScheduling(null);
                      setScheduledDate("");
                      setScheduledTime("");
                    }}
                    className="w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
                  {selectedClientForScheduling && (
                    <>
                      {/* Section 1: Select Client */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <User className="w-4 h-4 text-gray-500" />
                          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Select Client</h3>
                        </div>
                        <div className="relative p-4 bg-gradient-to-br from-blue-700 to-blue-600 rounded-lg">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                              <User className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-bold text-white text-[15px]">{selectedClientForScheduling.name}</p>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-medium">
                                  LEAD
                                </span>
                              </div>
                              <p className="text-xs text-blue-100">
                                • Since {selectedClientForScheduling.lastContact}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                setShowScheduleCallModal(false);
                                setSelectedClientForScheduling(null);
                              }}
                              className="text-[13px] text-white hover:underline"
                            >
                              Change
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Contact Details */}
                      <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contact Details</h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 px-3 py-2.5 border border-gray-200 rounded-lg">
                            <Phone className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-gray-900">{selectedClientForScheduling.phone || "Not provided"}</span>
                          </div>
                          <div className="flex items-center gap-3 px-3 py-2.5 border border-gray-200 rounded-lg">
                            <Mail className="w-4 h-4 text-red-500" />
                            <span className="text-sm text-gray-900">{selectedClientForScheduling.email || "Not provided"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Pipeline Info */}
                      <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Pipeline Info</h3>
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="p-3">
                            <p className="text-[11px] text-gray-500 mb-1">Current Stage</p>
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                              <p className="text-sm font-bold text-gray-900">{selectedClientForScheduling.stage}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section 4: Select Date & Time */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="w-4 h-4 text-teal-600" />
                          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Select Date & Time</h3>
                        </div>

                        <div className="border border-gray-200 rounded-lg p-4">
                          {/* Month/Year Selector */}
                          <div className="flex items-center justify-between mb-4">
                            <select
                              value={selectedMonth}
                              onChange={(e) => setSelectedMonth(Number(e.target.value))}
                              className="text-sm font-bold text-gray-900 border-none bg-transparent focus:outline-none cursor-pointer"
                            >
                              {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((month, idx) => (
                                <option key={idx} value={idx}>{month.substring(0, 3)}</option>
                              ))}
                            </select>
                            <span className="text-sm font-bold text-gray-900">{selectedYear}</span>
                          </div>

                          {/* Calendar View */}
                          <div className="mb-4">
                            <div className="grid grid-cols-7 gap-1 mb-2">
                              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                                <div key={day} className="text-center text-xs text-gray-500 py-1">
                                  {day}
                                </div>
                              ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                              {(() => {
                                const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
                                const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
                                const today = new Date();
                                const days = [];

                                // Empty cells for days before month starts
                                for (let i = 0; i < firstDay; i++) {
                                  days.push(
                                    <div key={`empty-${i}`} className="aspect-square"></div>
                                  );
                                }

                                // Days of the month
                                for (let day = 1; day <= daysInMonth; day++) {
                                  const date = new Date(selectedYear, selectedMonth, day);
                                  const dateString = date.toISOString().split("T")[0];
                                  const isSelected = scheduledDate === dateString;
                                  const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                  const isToday = date.toDateString() === today.toDateString();

                                  days.push(
                                    <button
                                      key={day}
                                      onClick={() => !isPast && setScheduledDate(dateString)}
                                      disabled={isPast}
                                      className={`aspect-square flex items-center justify-center text-[13px] transition-colors ${isSelected || isToday
                                        ? "bg-blue-600 text-white rounded-full font-semibold"
                                        : isPast
                                          ? "text-gray-300 cursor-not-allowed"
                                          : "text-gray-700 hover:bg-blue-100 rounded-full"
                                        }`}
                                    >
                                      {day}
                                    </button>
                                  );
                                }

                                return days;
                              })()}
                            </div>
                          </div>

                          {/* Time Picker */}
                          <div className="border-t border-gray-200 pt-4">
                            <p className="text-[11px] text-gray-500 text-center font-semibold mb-3 tracking-wide">24H FORMAT</p>
                            <div className="flex items-center justify-center gap-2 mb-3">
                              <input
                                type="number"
                                min="0"
                                max="23"
                                value={scheduledTime ? scheduledTime.split(":")[0] : "14"}
                                onChange={(e) => {
                                  const hours = e.target.value.padStart(2, "0");
                                  const minutes = scheduledTime ? scheduledTime.split(":")[1] : "00";
                                  setScheduledTime(`${hours}:${minutes}`);
                                }}
                                className="w-14 h-11 text-center text-2xl font-bold text-gray-900 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-2xl font-bold text-gray-400">:</span>
                              <input
                                type="number"
                                min="0"
                                max="59"
                                value={scheduledTime ? scheduledTime.split(":")[1] : "00"}
                                onChange={(e) => {
                                  const hours = scheduledTime ? scheduledTime.split(":")[0] : "14";
                                  const minutes = e.target.value.padStart(2, "0");
                                  setScheduledTime(`${hours}:${minutes}`);
                                }}
                                className="w-14 h-11 text-center text-2xl font-bold text-gray-900 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            {/* Selected Summary */}
                            {scheduledDate && scheduledTime && (
                              <p className="text-xs text-blue-600 text-center">
                                {new Date(scheduledDate).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })} at {scheduledTime} IST
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* No Phone Warning */}
                      {!selectedClientForScheduling.phone && (
                        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                          <svg
                            className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-red-900">No Phone Number</p>
                            <p className="text-sm text-gray-600 mt-1">
                              This client doesn't have a phone number. Please add one before scheduling a call.
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Fixed Footer */}
                <div className="border-t border-gray-200 px-4 py-3.5 flex items-center justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowScheduleCallModal(false);
                      setSelectedClientForScheduling(null);
                      setScheduledDate("");
                      setScheduledTime("");
                    }}
                    className="border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg text-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleScheduleCall}
                    disabled={!selectedClientForScheduling?.phone || !scheduledDate || !scheduledTime}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold"
                  >
                    Schedule
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Trigger Calls Modal */}
          <Modal
            isOpen={showTriggerCallsModal}
            onClose={() => {
              setShowTriggerCallsModal(false);
              setScheduleOption("immediate");
              setTriggerScheduledDate("");
              setTriggerScheduledTime("");
            }}
            title="Trigger Calls"
            footer={
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowTriggerCallsModal(false);
                    setScheduleOption("immediate");
                    setTriggerScheduledDate("");
                    setTriggerScheduledTime("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleTriggerCalls}
                  disabled={scheduleOption === "scheduled" && (!triggerScheduledDate || !triggerScheduledTime)}
                >
                  Confirm
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You are about to trigger calls for <span className="font-semibold text-foreground">{selectedRows.size}</span> client{selectedRows.size > 1 ? 's' : ''}
              </p>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 border border-border rounded-xl cursor-pointer hover:bg-muted transition-colors">
                  <input
                    type="radio"
                    name="schedule"
                    checked={scheduleOption === "immediate"}
                    onChange={() => setScheduleOption("immediate")}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="font-medium">Start Immediately</p>
                    <p className="text-xs text-muted-foreground">Calls will be triggered right away</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 border border-border rounded-xl cursor-pointer hover:bg-muted transition-colors">
                  <input
                    type="radio"
                    name="schedule"
                    checked={scheduleOption === "scheduled"}
                    onChange={() => setScheduleOption("scheduled")}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <p className="font-medium">Schedule for Later</p>
                    <p className="text-xs text-muted-foreground mb-3">Choose a specific date and time</p>

                    {scheduleOption === "scheduled" && (
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="block text-sm font-medium mb-2">Date</label>
                          <div className="relative">
                            <input
                              type="date"
                              value={triggerScheduledDate}
                              onChange={(e) => setTriggerScheduledDate(e.target.value)}
                              className="w-full pl-10 pr-3 py-2 bg-input-background border border-input rounded-xl text-sm"
                            />
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Time</label>
                          <input
                            type="time"
                            value={triggerScheduledTime}
                            onChange={(e) => setTriggerScheduledTime(e.target.value)}
                            className="w-full px-3 py-2 bg-input-background border border-input rounded-xl text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>
          </Modal>





          {/* Edit Client Modal */}
          <Modal
            isOpen={showEditClientModal}
            onClose={() => setShowEditClientModal(false)}
            title="Edit Client Information"
            footer={
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowEditClientModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveEditClient}
                >
                  Save Changes
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <Input
                  value={editClientForm.name}
                  onChange={(e) => setEditClientForm({ ...editClientForm, name: e.target.value })}
                  placeholder="Enter client name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input
                  type="email"
                  value={editClientForm.email}
                  onChange={(e) => setEditClientForm({ ...editClientForm, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone</label>
                <Input
                  value={editClientForm.phone}
                  onChange={(e) => setEditClientForm({ ...editClientForm, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <Input
                  value={editClientForm.location}
                  onChange={(e) => setEditClientForm({ ...editClientForm, location: e.target.value })}
                  placeholder="Enter location"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={editClientForm.status}
                  onChange={(e) => setEditClientForm({ ...editClientForm, status: e.target.value })}
                  className="w-full px-4 py-2 bg-input-background border border-input rounded-xl"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>
          </Modal>

          {/* Send Message Modal */}
          <Modal
            isOpen={showSendMessageModal}
            onClose={() => setShowSendMessageModal(false)}
            title={selectedClientForProfile ? `Send Message to ${selectedClientForProfile.name}` : "Send Message"}
            footer={
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowSendMessageModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSendMessageSubmit}
                >
                  Send
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Recipient</label>
                <Input
                  value={selectedClientForProfile?.name || ""}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone Number</label>
                <Input
                  value={selectedClientForProfile?.phone || ""}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Message</label>
                <textarea
                  value={messageForm.message}
                  onChange={(e) => setMessageForm({ message: e.target.value })}
                  placeholder="Type your message here..."
                  rows={5}
                  className="w-full px-4 py-2 bg-input-background border border-input rounded-xl resize-none"
                />
              </div>
            </div>
          </Modal>

          {/* Schedule Call From Profile Modal */}
          <Modal
            isOpen={showScheduleCallFromProfile}
            onClose={() => setShowScheduleCallFromProfile(false)}
            title={selectedClientForProfile ? `Schedule Call with ${selectedClientForProfile.name}` : "Schedule Call"}
            footer={
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowScheduleCallFromProfile(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveScheduleCallFromProfile}
                >
                  Schedule Call
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Client Name</label>
                <Input
                  value={selectedClientForProfile?.name || ""}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Time</label>
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
                <textarea
                  placeholder="Add any notes about this call..."
                  rows={3}
                  className="w-full px-4 py-2 bg-input-background border border-input rounded-xl resize-none"
                />
              </div>
            </div>
          </Modal>

          {/* Update Stage Modal */}
          <Modal
            isOpen={showUpdateStageModal}
            onClose={() => setShowUpdateStageModal(false)}
            title="Update Client Stage"
            footer={
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowUpdateStageModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveUpdateStage}
                >
                  Update Stage
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Client Name</label>
                <Input
                  value={selectedClientForProfile?.name || ""}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Select New Stage</label>
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="w-full px-4 py-2 bg-input-background border border-input rounded-xl"
                >
                  <option value="">Select a stage</option>
                  {selectedClientForProfile && processStages[selectedClientForProfile.processes[0]]?.map((stage) => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </div>
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <p className="text-sm" style={{ color: '#6B7280', fontFamily: 'Outfit, sans-serif' }}>
                  <strong>Current Stage:</strong> {selectedClientForProfile?.stage}
                </p>
              </div>
            </div>
          </Modal>

          {/* Filter Field Settings Modal */}
          {showFilterFieldSettings && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
              <div className="bg-white rounded-xl w-full flex flex-col overflow-hidden" style={{ width: '560px', maxHeight: '70vh', boxShadow: '0 8px 32px rgba(0,0,0,0.16)' }}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: '#E2E8F0' }}>
                  <h2 className="font-bold" style={{ color: '#1F2937', fontFamily: 'DM Sans, sans-serif', fontSize: '18px' }}>
                    Filter field settings
                  </h2>
                  <button
                    onClick={() => setShowFilterFieldSettings(false)}
                    className="hover:bg-gray-100 p-1 rounded transition-colors"
                  >
                    <X className="w-5 h-5" style={{ color: '#6B7280' }} />
                  </button>
                </div>

                {/* Search */}
                <div className="px-6 pt-6 pb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Find field..."
                      value={fieldSearchQuery}
                      onChange={(e) => setFieldSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
                      style={{ borderColor: '#E2E8F0', fontFamily: 'Outfit, sans-serif' }}
                    />
                  </div>
                </div>

                {/* Pill Tabs */}
                <div className="px-6 pb-4 flex gap-2">
                  <button
                    onClick={() => setFilterFieldCategories({ ...filterFieldCategories, client: !filterFieldCategories.client })}
                    className="px-4 py-2 rounded-full border text-sm font-medium transition-all"
                    style={{
                      backgroundColor: filterFieldCategories.client ? '#E8F0FE' : 'white',
                      borderColor: filterFieldCategories.client ? '#4F8EF7' : '#E2E8F0',
                      color: filterFieldCategories.client ? '#4F8EF7' : '#6B7280',
                      fontFamily: 'Outfit, sans-serif',
                      borderRadius: '20px'
                    }}
                  >
                    Client {filterFieldCategories.client && '✓'}
                  </button>
                  <button
                    onClick={() => setFilterFieldCategories({ ...filterFieldCategories, process: !filterFieldCategories.process })}
                    className="px-4 py-2 rounded-full border text-sm font-medium transition-all"
                    style={{
                      backgroundColor: filterFieldCategories.process ? '#E8F0FE' : 'white',
                      borderColor: filterFieldCategories.process ? '#4F8EF7' : '#E2E8F0',
                      color: filterFieldCategories.process ? '#4F8EF7' : '#6B7280',
                      fontFamily: 'Outfit, sans-serif',
                      borderRadius: '20px'
                    }}
                  >
                    Process {filterFieldCategories.process && '✓'}
                  </button>
                  <button
                    onClick={() => setFilterFieldCategories({ ...filterFieldCategories, activity: !filterFieldCategories.activity })}
                    className="px-4 py-2 rounded-full border text-sm font-medium transition-all"
                    style={{
                      backgroundColor: filterFieldCategories.activity ? '#E8F0FE' : 'white',
                      borderColor: filterFieldCategories.activity ? '#4F8EF7' : '#E2E8F0',
                      color: filterFieldCategories.activity ? '#4F8EF7' : '#6B7280',
                      fontFamily: 'Outfit, sans-serif',
                      borderRadius: '20px'
                    }}
                  >
                    Activity {filterFieldCategories.activity && '✓'}
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-6 pb-4">
                  {/* CLIENT INFO Section */}
                  <div style={{ marginTop: '16px' }}>
                    <h3 className="uppercase font-semibold mb-3" style={{ color: '#9CA3AF', fontFamily: 'Outfit, sans-serif', fontSize: '11px', letterSpacing: '0.08em' }}>
                      CLIENT INFO
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {clientInfoFieldsList
                        .filter(field => field.toLowerCase().includes(fieldSearchQuery.toLowerCase()))
                        .map((field) => (
                          <label
                            key={field}
                            className="flex items-center p-2 hover:bg-blue-50 rounded cursor-pointer"
                            style={{ gap: '8px' }}
                          >
                            <input
                              type="checkbox"
                              checked={availableFilterFields.includes(field)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAvailableFilterFields([...availableFilterFields, field]);
                                } else {
                                  setAvailableFilterFields(availableFilterFields.filter(f => f !== field));
                                }
                              }}
                              className="flex-shrink-0"
                              style={{ accentColor: '#4F8EF7', width: '16px', height: '16px', borderRadius: '3px' }}
                            />
                            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '14px', color: '#374151' }}>{field}</span>
                          </label>
                        ))}
                    </div>
                  </div>

                  {/* PROCESS & ACTIVITY Section */}
                  <div style={{ marginTop: '16px' }}>
                    <h3 className="uppercase font-semibold mb-3" style={{ color: '#9CA3AF', fontFamily: 'Outfit, sans-serif', fontSize: '11px', letterSpacing: '0.08em' }}>
                      PROCESS & ACTIVITY
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {['Process', 'Responsible', 'Created On']
                        .filter(field => field.toLowerCase().includes(fieldSearchQuery.toLowerCase()))
                        .map((field) => (
                          <label
                            key={field}
                            className="flex items-center p-2 hover:bg-blue-50 rounded cursor-pointer"
                            style={{ gap: '8px' }}
                          >
                            <input
                              type="checkbox"
                              checked={availableFilterFields.includes(field)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAvailableFilterFields([...availableFilterFields, field]);
                                } else {
                                  setAvailableFilterFields(availableFilterFields.filter(f => f !== field));
                                }
                              }}
                              className="flex-shrink-0"
                              style={{ accentColor: '#4F8EF7', width: '16px', height: '16px', borderRadius: '3px' }}
                            />
                            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '14px', color: '#374151' }}>{field}</span>
                          </label>
                        ))}
                    </div>
                  </div>

                  {/* SMART TIME FILTERS Section */}
                  <div style={{ marginTop: '16px' }}>
                    <h3 className="uppercase font-semibold mb-3" style={{ color: '#9CA3AF', fontFamily: 'Outfit, sans-serif', fontSize: '11px', letterSpacing: '0.08em' }}>
                      SMART TIME FILTERS
                    </h3>
                    <div className="flex flex-col">
                      {[
                        'Last Contact: Today',
                        'Last Contact: Yesterday',
                        'Last Contact: Last 7 days',
                        'Last Contact: Last 30 days',
                        'Last Call: Last 24 hours',
                        'Last Call: Last 7 days',
                        'No activity in 7 days',
                        'No activity in 30 days',
                        'Created: Today',
                        'Created: This week',
                        'Created: This month',
                        'Overdue follow-up'
                      ]
                        .filter(field => field.toLowerCase().includes(fieldSearchQuery.toLowerCase()))
                        .map((field) => (
                          <label
                            key={field}
                            className="flex items-center p-2 hover:bg-blue-50 rounded cursor-pointer"
                            style={{ gap: '8px', height: '36px' }}
                          >
                            <input
                              type="checkbox"
                              checked={availableFilterFields.includes(field)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAvailableFilterFields([...availableFilterFields, field]);
                                } else {
                                  setAvailableFilterFields(availableFilterFields.filter(f => f !== field));
                                }
                              }}
                              className="flex-shrink-0"
                              style={{ accentColor: '#4F8EF7', width: '16px', height: '16px', borderRadius: '3px' }}
                            />
                            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '14px', color: '#374151' }}>{field}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Footer Actions - Fixed */}
                <div className="flex items-center justify-between p-4 border-t" style={{ borderColor: '#E2E8F0' }}>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={availableFilterFields.length > 0 && availableFilterFields.length === allFilterFields.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAvailableFilterFields(allFilterFields);
                        } else {
                          setAvailableFilterFields([]);
                        }
                      }}
                      className="w-4 h-4"
                      style={{ accentColor: '#4F8EF7' }}
                    />
                    <span className="text-sm text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>select all</span>
                  </label>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setAvailableFilterFields(['Name', 'Status', 'Process', 'Responsible', 'Last Contact']);
                        setActiveFilterFields(['Name', 'Status', 'Process', 'Responsible', 'Last Contact']);
                        toast.info('Reset to default fields');
                      }}
                      className="text-sm hover:underline"
                      style={{ color: '#6B7280', fontFamily: 'Outfit, sans-serif' }}
                    >
                      ↺ default
                    </button>

                    <Button
                      variant="outline"
                      onClick={() => setShowFilterFieldSettings(false)}
                      style={{ fontFamily: 'Outfit, sans-serif' }}
                    >
                      CANCEL
                    </Button>

                    <Button
                      variant="primary"
                      onClick={() => {
                        // Add smart time filters as tags immediately
                        const smartTimeFilters = availableFilterFields.filter(f =>
                          f.includes('Last Contact:') || f.includes('Last Call:') ||
                          f.includes('No activity') || f.includes('Created:') || f.includes('Overdue')
                        );

                        if (smartTimeFilters.length > 0) {
                          const newFilters = [...activeFilters];
                          smartTimeFilters.forEach(filter => {
                            if (!newFilters.find(f => f.label === filter)) {
                              newFilters.push({ field: filter.toLowerCase().replace(/[^a-z0-9]/g, '_'), label: filter, values: ['Active'] });
                            }
                          });
                          setActiveFilters(newFilters);
                        }

                        // Add other fields to filter panel dropdowns
                        const regularFields = availableFilterFields.filter(f =>
                          !f.includes('Last Contact:') && !f.includes('Last Call:') &&
                          !f.includes('No activity') && !f.includes('Created:') && !f.includes('Overdue')
                        );
                        setActiveFilterFields(regularFields);
                        setShowFilterFieldSettings(false);
                        toast.success('Filter fields updated');
                      }}
                      style={{ backgroundColor: '#4F8EF7', height: '40px', borderRadius: '6px', fontFamily: 'Outfit, sans-serif' }}
                    >
                      APPLY
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Outlet />

      <HowItWorksModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="How Clients Works"
        summary="Clients is your contact database. Store details, track communication history, and move contacts through processes — all from one place."
        bullets={[
          "Add clients manually or import via CSV",
          "Assign contacts to processes and stages",
          "Filter and search across all fields",
          "Click any client to open their full profile",
        ]}
        guideUrl="/guide/clients"
      />
    </DndProvider>
  );
}
