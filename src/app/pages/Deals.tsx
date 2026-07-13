import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Search, Filter, Download, Upload, Phone, FileText, Play, Calendar, StopCircle, Settings as SettingsIcon, Eye, ChevronLeft, ChevronRight, ChevronDown, ChevronsLeft, ChevronsRight, AlertCircle, X, Pause, TrendingUp, Clock, GitBranch, RefreshCw, Zap, Star, Headphones, User, CheckCircle2, Volume2, Users, Target, Award, Brain, Shield, MessageSquare, Sparkles, ThumbsUp, ThumbsDown, Info, List, LayoutGrid, MoreVertical, Trash2, Pencil, Building2, CalendarClock, Package, CheckCircle, Plus, Globe, Copy } from "lucide-react";
import { PiArrowSquareOutBold, PiArrowSquareInBold, PiPhoneIncoming, PiPhoneOutgoing } from "react-icons/pi";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Tooltip } from "../components/ui/Tooltip";
import { Modal } from "../components/ui/Modal";
import { Drawer } from "../components/ui/drawer";
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
import { TeamMemberDrawer } from "../components/TeamMemberDrawer";
import { useFieldRegistry } from "../context/FieldRegistryContext";
import { SelectFieldsModal, CreateFieldModal } from "../components/help/FieldManager";

interface CallLog {
  id: string;
  client: string;
  clientId: string;
  type: string;
  status: string;
  process: string;
  lastStage?: string;
  currentStage: string;
  duration: string;
  date: string;
  hasRecording: boolean;
  hasTranscript: boolean;
  hasScheduledCall: boolean;
  parentCallId?: string;
  childCallIds?: string[];
  relationshipReason?: "Call Trigger" | "Stage Change" | "Retry" | "Manual Trigger";
}

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

interface Deal {
  id: string;
  dealName: string;
  clientName: string;
  amount: number;
  currency: string;
  createdDate: string;
  status: "In Progress" | "Won" | "Lost";
  responsible: string;
  stage: string;
}

const initialDeals: Deal[] = [
  { id: "DEAL-001", dealName: "Patient Intake Package", clientName: "Sarah Johnson", amount: 25000, currency: "₹", createdDate: "2024-05-18", status: "In Progress", responsible: "John Smith", stage: "Patient Intake: Initial Contact" },
  { id: "DEAL-002", dealName: "Insurance Verification Bundle", clientName: "Michael Chen", amount: 0, currency: "₹", createdDate: "2024-05-17", status: "In Progress", responsible: "Emily Davis", stage: "Patient Intake: Initial Contact" },
  { id: "DEAL-003", dealName: "Wellness Program", clientName: "Priya Sharma", amount: 15000, currency: "₹", createdDate: "2024-05-16", status: "In Progress", responsible: "Sarah Johnson", stage: "Patient Intake: Initial Contact" },
  { id: "DEAL-004", dealName: "Billing Support Plan", clientName: "Emily Davis", amount: 8500, currency: "₹", createdDate: "2024-05-15", status: "In Progress", responsible: "Robert Wilson", stage: "Patient Intake: Schedule Appointment" },
  { id: "DEAL-005", dealName: "Follow-up Package", clientName: "Robert Wilson", amount: 12000, currency: "₹", createdDate: "2024-05-14", status: "In Progress", responsible: "Michael Chen", stage: "Patient Intake: Schedule Appointment" },
  { id: "DEAL-006", dealName: "Annual Health Check", clientName: "James Taylor", amount: 32000, currency: "₹", createdDate: "2024-05-13", status: "In Progress", responsible: "Amanda Taylor", stage: "Payment Reminder: Billing Inquiry" },
  { id: "DEAL-007", dealName: "Medication Management", clientName: "Rahul Patel", amount: 7500, currency: "₹", createdDate: "2024-05-12", status: "In Progress", responsible: "David Martinez", stage: "Payment Reminder: Issue Resolution" },
  { id: "DEAL-008", dealName: "Post-Op Care Plan", clientName: "Amanda Clark", amount: 18000, currency: "₹", createdDate: "2024-05-11", status: "In Progress", responsible: "Jessica Brown", stage: "Payment Reminder: Payment Notice" },
  { id: "DEAL-009", dealName: "Corporate Wellness", clientName: "Lisa Anderson", amount: 85000, currency: "₹", createdDate: "2024-05-10", status: "In Progress", responsible: "John Smith", stage: "Appointment Scheduling: Slot Selection" },
  { id: "DEAL-010", dealName: "Dental Care Package", clientName: "David Martinez", amount: 22000, currency: "₹", createdDate: "2024-05-09", status: "In Progress", responsible: "Emily Davis", stage: "Appointment Scheduling: Slot Selection" },
  { id: "DEAL-011", dealName: "Physiotherapy Bundle", clientName: "Arjun Desai", amount: 35000, currency: "₹", createdDate: "2024-05-08", status: "In Progress", responsible: "Michael Chen", stage: "Appointment Scheduling: Confirmation" },
  { id: "DEAL-012", dealName: "Enterprise Health Plan", clientName: "Vikram Singh", amount: 150000, currency: "₹", createdDate: "2024-05-07", status: "In Progress", responsible: "Robert Wilson", stage: "Insurance Verification: Document Check" },
  { id: "DEAL-013", dealName: "Mental Health Support", clientName: "Deepika Nair", amount: 45000, currency: "₹", createdDate: "2024-05-06", status: "In Progress", responsible: "Sarah Johnson", stage: "Insurance Verification: Document Check" },
  { id: "DEAL-014", dealName: "Premium Care Plan", clientName: "Charlotte Evans", amount: 95000, currency: "₹", createdDate: "2024-05-05", status: "Won", responsible: "Amanda Taylor", stage: "Appointment Scheduling: Confirmation" },
  { id: "DEAL-015", dealName: "Specialist Consultation", clientName: "Oliver Thompson", amount: 28000, currency: "₹", createdDate: "2024-05-04", status: "Won", responsible: "David Martinez", stage: "Payment Reminder: Issue Resolution" },
  { id: "DEAL-016", dealName: "Lab Test Bundle", clientName: "Kavya Iyer", amount: 12500, currency: "₹", createdDate: "2024-05-03", status: "Won", responsible: "John Smith", stage: "Follow-up Calls: Post-Visit Check" },
  { id: "DEAL-017", dealName: "Ortho Care Package", clientName: "Fatima Hassan", amount: 55000, currency: "₹", createdDate: "2024-05-02", status: "Lost", responsible: "Emily Davis", stage: "Insurance Verification: Verification" },
  { id: "DEAL-018", dealName: "Nutrition Counseling", clientName: "Youssef Said", amount: 9000, currency: "₹", createdDate: "2024-05-01", status: "Lost", responsible: "Michael Chen", stage: "Follow-up Calls: Medication Reminder" },
];

// Mock client data for profile drawer
const mockClients: { [key: string]: Client } = {
  "CL-001": { id: "CL-001", name: "Sarah Johnson", email: "sarah.j@email.com", phone: "5551234567", country: "US", countryCode: "+1", countryFlag: "🇺🇸", processes: ["Patient Intake", "Follow-up Calls"], stage: "Insurance Verification", responsible: "John Smith", lastContact: "2024-04-10", status: "Active", companyName: "TechCorp Inc.", jobPosition: "Senior Manager", numberOfEmployees: "101-250" },
  "CL-002": { id: "CL-002", name: "Michael Chen", email: "mchen@email.com", phone: "5552345678", country: "US", countryCode: "+1", countryFlag: "🇺🇸", processes: ["Patient Intake"], stage: "Initial Contact", responsible: "Sarah Johnson", lastContact: "2024-04-09", status: "Active", companyName: "Innovate Solutions", jobPosition: "Product Manager", numberOfEmployees: "51-100" },
  "CL-003": { id: "CL-003", name: "Emily Davis", email: "emily.d@email.com", phone: "5553456789", country: "US", countryCode: "+1", countryFlag: "🇺🇸", processes: ["Follow-up Calls", "Billing Support"], stage: "Billing Inquiry", responsible: "Michael Chen", lastContact: "2024-04-11", status: "Active", companyName: "Healthcare Plus", jobPosition: "Director of Operations", numberOfEmployees: "251-500" },
  "CL-004": { id: "CL-004", name: "Robert Wilson", email: "rwilson@email.com", phone: "5554567890", country: "US", countryCode: "+1", countryFlag: "🇺🇸", processes: ["Appointment Scheduling"], stage: "Slot Selection", responsible: "Emily Davis", lastContact: "2024-04-08", status: "Active" },
  "CL-006": { id: "CL-006", name: "David Martinez", email: "d.martinez@email.com", phone: "5556789012", country: "US", countryCode: "+1", countryFlag: "🇺🇸", processes: ["Follow-up Calls"], stage: "Follow-up", responsible: "Jessica Brown", lastContact: "2024-04-12", status: "Active" },
  "CL-007": { id: "CL-007", name: "Lisa Anderson", email: "l.anderson@email.com", phone: "5557890123", country: "US", countryCode: "+1", countryFlag: "🇺🇸", processes: ["Billing Support", "Follow-up Calls"], stage: "Payment Reminder", responsible: "David Martinez", lastContact: "2024-04-10", status: "Active", companyName: "MediCare Group", jobPosition: "CFO", numberOfEmployees: "501-1000" },
  "CL-008": { id: "CL-008", name: "James Taylor", email: "jtaylor@email.com", phone: "5558901234", country: "US", countryCode: "+1", countryFlag: "🇺🇸", processes: ["Patient Intake"], stage: "Schedule Appointment", responsible: "Amanda Taylor", lastContact: "2024-04-11", status: "Active" },
  "CL-009": { id: "CL-009", name: "Amanda Clark", email: "a.clark@email.com", phone: "5559012345", country: "US", countryCode: "+1", countryFlag: "🇺🇸", processes: ["Appointment Scheduling", "Follow-up Calls"], stage: "Confirmation", responsible: "John Smith", lastContact: "2024-04-09", status: "Active" },
  "CL-011": { id: "CL-011", name: "Jennifer White", email: "j.white@email.com", phone: "5551234568", country: "US", countryCode: "+1", countryFlag: "🇺🇸", processes: ["Follow-up Calls", "Billing Support", "Patient Intake"], stage: "Initial Contact", responsible: "Michael Chen", lastContact: "2024-04-13", status: "Active" },
  "CL-012": { id: "CL-012", name: "Matthew Lewis", email: "m.lewis@email.com", phone: "5552345679", country: "US", countryCode: "+1", countryFlag: "🇺🇸", processes: ["Insurance Verification"], stage: "Approval", responsible: "Emily Davis", lastContact: "2024-04-06", status: "Active" },
  "CL-013": { id: "CL-013", name: "Priya Sharma", email: "priya.sharma@email.com", phone: "9820172818", country: "IN", countryCode: "+91", countryFlag: "🇮🇳", processes: ["Patient Intake", "Follow-up Calls"], stage: "Insurance Verification", responsible: "Robert Wilson", lastContact: "2024-04-12", status: "Active" },
  "CL-014": { id: "CL-014", name: "Rahul Patel", email: "rahul.p@email.com", phone: "9876543210", country: "IN", countryCode: "+91", countryFlag: "🇮🇳", processes: ["Follow-up Calls"], stage: "Follow-up", responsible: "Jessica Brown", lastContact: "2024-04-11", status: "Active" },
  "CL-015": { id: "CL-015", name: "Ananya Reddy", email: "ananya.r@email.com", phone: "9123456789", country: "IN", countryCode: "+91", countryFlag: "🇮🇳", processes: ["Billing Support", "Patient Intake"], stage: "Issue Resolution", responsible: "David Martinez", lastContact: "2024-04-10", status: "Active" },
  "CL-016": { id: "CL-016", name: "Vikram Singh", email: "vikram.s@email.com", phone: "9234567890", country: "IN", countryCode: "+91", countryFlag: "🇮🇳", processes: ["Appointment Scheduling"], stage: "Slot Selection", responsible: "Amanda Taylor", lastContact: "2024-04-09", status: "Active" },
  "CL-018": { id: "CL-018", name: "Arjun Desai", email: "arjun.d@email.com", phone: "9456789012", country: "IN", countryCode: "+91", countryFlag: "🇮🇳", processes: ["Follow-up Calls", "Billing Support"], stage: "Billing Inquiry", responsible: "Sarah Johnson", lastContact: "2024-04-13", status: "Active" },
  "CL-019": { id: "CL-019", name: "Kavya Iyer", email: "kavya.i@email.com", phone: "9567890123", country: "IN", countryCode: "+91", countryFlag: "🇮🇳", processes: ["Insurance Verification", "Patient Intake"], stage: "Document Check", responsible: "Michael Chen", lastContact: "2024-04-11", status: "Active" },
  "CL-020": { id: "CL-020", name: "Rohan Kumar", email: "rohan.k@email.com", phone: "9678901234", country: "IN", countryCode: "+91", countryFlag: "🇮🇳", processes: ["Patient Intake"], stage: "Schedule Appointment", responsible: "Emily Davis", lastContact: "2024-04-08", status: "Active" },
  "CL-021": { id: "CL-021", name: "Deepika Nair", email: "deepika.n@email.com", phone: "9789012345", country: "IN", countryCode: "+91", countryFlag: "🇮🇳", processes: ["Appointment Scheduling", "Follow-up Calls"], stage: "Confirmation", responsible: "Robert Wilson", lastContact: "2024-04-12", status: "Active" },
  "CL-023": { id: "CL-023", name: "Ahmed Al-Mansoori", email: "ahmed.am@email.com", phone: "501234567", country: "AE", countryCode: "+971", countryFlag: "🇦🇪", processes: ["Patient Intake", "Insurance Verification"], stage: "Insurance Verification", responsible: "David Martinez", lastContact: "2024-04-13", status: "Active" },
  "CL-024": { id: "CL-024", name: "Fatima Hassan", email: "fatima.h@email.com", phone: "502345678", country: "AE", countryCode: "+971", countryFlag: "🇦🇪", processes: ["Follow-up Calls", "Billing Support"], stage: "Billing Inquiry", responsible: "Amanda Taylor", lastContact: "2024-04-10", status: "Active" },
  "CL-025": { id: "CL-025", name: "Omar Al-Rashid", email: "omar.ar@email.com", phone: "503456789", country: "AE", countryCode: "+971", countryFlag: "🇦🇪", processes: ["Appointment Scheduling"], stage: "Slot Selection", responsible: "John Smith", lastContact: "2024-04-11", status: "Active" },
  "CL-027": { id: "CL-027", name: "Youssef Said", email: "youssef.s@email.com", phone: "505678901", country: "AE", countryCode: "+971", countryFlag: "🇦🇪", processes: ["Follow-up Calls", "Patient Intake", "Billing Support"], stage: "Follow-up", responsible: "Michael Chen", lastContact: "2024-04-12", status: "Active" },
  "CL-028": { id: "CL-028", name: "Oliver Thompson", email: "oliver.t@email.com", phone: "7412345678", country: "GB", countryCode: "+44", countryFlag: "🇬🇧", processes: ["Patient Intake", "Follow-up Calls"], stage: "Schedule Appointment", responsible: "Emily Davis", lastContact: "2024-04-09", status: "Active" },
  "CL-029": { id: "CL-029", name: "Charlotte Evans", email: "charlotte.e@email.com", phone: "7423456789", country: "GB", countryCode: "+44", countryFlag: "🇬🇧", processes: ["Insurance Verification"], stage: "Approval", responsible: "Robert Wilson", lastContact: "2024-04-13", status: "Active" },
};

// Comprehensive call logs dataset (100 calls total)
// Distribution: 70 Outbound, 30 Inbound | 65 Completed, 20 Failed, 15 Pending
// All calls mapped to valid clients with correct process assignments
const initialCallLogs: CallLog[] = [
  // Latest calls first (Apr 13-14)
  { id: "CALL-001", client: "Sarah Johnson", clientId: "CL-001", type: "Outbound", status: "Completed", process: "Patient Intake", currentStage: "Insurance Verification", duration: "4:32", date: "2024-04-13 14:30", hasRecording: true, hasTranscript: true, hasScheduledCall: true },
  { id: "CALL-002", client: "Priya Sharma", clientId: "CL-013", type: "Outbound", status: "Completed", process: "Follow-up Calls", currentStage: "Follow-up", duration: "3:45", date: "2024-04-13 13:15", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-003", client: "Ahmed Al-Mansoori", clientId: "CL-023", type: "Inbound", status: "Completed", process: "Insurance Verification", currentStage: "Document Check", duration: "5:20", date: "2024-04-13 11:40", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-004", client: "Jennifer White", clientId: "CL-011", type: "Outbound", status: "Completed", process: "Patient Intake", currentStage: "Initial Contact", duration: "2:15", date: "2024-04-13 10:00", hasRecording: true, hasTranscript: true, hasScheduledCall: true },
  { id: "CALL-005", client: "Arjun Desai", clientId: "CL-018", type: "Outbound", status: "Pending", process: "Billing Support", currentStage: "Billing Inquiry", duration: "", date: "2024-04-13 09:30", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-006", client: "Charlotte Evans", clientId: "CL-029", type: "Outbound", status: "Completed", process: "Insurance Verification", currentStage: "Approval", duration: "6:10", date: "2024-04-13 08:15", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-007", client: "David Martinez", clientId: "CL-006", type: "Inbound", status: "Completed", process: "Follow-up Calls", currentStage: "Follow-up", duration: "3:55", date: "2024-04-12 16:45", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-008", client: "Deepika Nair", clientId: "CL-021", type: "Outbound", status: "Completed", process: "Appointment Scheduling", currentStage: "Confirmation", duration: "2:30", date: "2024-04-12 15:20", hasRecording: true, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-009", client: "Youssef Said", clientId: "CL-027", type: "Outbound", status: "Completed", process: "Follow-up Calls", currentStage: "Follow-up", duration: "4:48", date: "2024-04-12 14:10", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-010", client: "Michael Chen", clientId: "CL-002", type: "Outbound", status: "Failed", process: "Appointment Scheduling", currentStage: "Initial Contact", duration: "0:00", date: "2024-04-12 13:00", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-011", client: "Priya Sharma", clientId: "CL-013", type: "Outbound", status: "Completed", process: "Patient Intake", currentStage: "Insurance Verification", duration: "5:15", date: "2024-04-12 11:30", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-012", client: "Lisa Anderson", clientId: "CL-007", type: "Inbound", status: "Completed", process: "Billing Support", currentStage: "Payment Reminder", duration: "3:20", date: "2024-04-12 10:15", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-013", client: "Emily Davis", clientId: "CL-003", type: "Outbound", status: "Completed", process: "Billing Support", currentStage: "Billing Inquiry", duration: "4:05", date: "2024-04-11 16:00", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-014", client: "Rahul Patel", clientId: "CL-014", type: "Inbound", status: "Completed", process: "Follow-up Calls", currentStage: "Follow-up", duration: "2:45", date: "2024-04-11 15:30", hasRecording: true, hasTranscript: false, hasScheduledCall: false },
  { id: "CALL-015", client: "James Taylor", clientId: "CL-008", type: "Outbound", status: "Completed", process: "Patient Intake", currentStage: "Schedule Appointment", duration: "3:35", date: "2024-04-11 14:20", hasRecording: true, hasTranscript: true, hasScheduledCall: true },
  { id: "CALL-016", client: "Kavya Iyer", clientId: "CL-019", type: "Outbound", status: "Completed", process: "Insurance Verification", currentStage: "Document Check", duration: "5:50", date: "2024-04-11 13:00", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-017", client: "Omar Al-Rashid", clientId: "CL-025", type: "Outbound", status: "Pending", process: "Appointment Scheduling", currentStage: "Slot Selection", duration: "", date: "2024-04-11 11:45", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-018", client: "Ananya Reddy", clientId: "CL-015", type: "Outbound", status: "Completed", process: "Billing Support", currentStage: "Issue Resolution", duration: "6:25", date: "2024-04-11 10:30", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-019", client: "Fatima Hassan", clientId: "CL-024", type: "Inbound", status: "Completed", process: "Billing Support", currentStage: "Billing Inquiry", duration: "4:18", date: "2024-04-10 16:40", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-020", client: "Amanda Clark", clientId: "CL-009", type: "Outbound", status: "Failed", process: "Appointment Scheduling", currentStage: "Confirmation", duration: "0:00", date: "2024-04-10 15:15", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-021", client: "Sarah Johnson", clientId: "CL-001", type: "Inbound", status: "Completed", process: "Follow-up Calls", currentStage: "Follow-up", duration: "5:05", date: "2024-04-10 14:00", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
];

// Helper function to derive process from stage
const getProcessFromStage = (stage: string): string => {
  const stageToProcessMap: Record<string, string> = {
    'Insurance Verification': 'Patient Intake',
    'Insurance Verify': 'Patient Intake',
    'Schedule Appointment': 'Patient Intake',
    'Follow-up': 'Follow-up Calls',
    'Post-Visit Check': 'Follow-up Calls',
    'Medication Reminder': 'Follow-up Calls',
    'Billing Inquiry': 'Billing Support',
    'Issue Resolution': 'Billing Support',
    'Payment Reminder': 'Billing Support',
    'Slot Selection': 'Appointment Scheduling',
    'Confirmation': 'Appointment Scheduling',
    'Document Check': 'Insurance Verification',
    'Verification': 'Insurance Verification',
    'Approval': 'Insurance Verification',
  };
  return stageToProcessMap[stage] || 'Patient Intake'; // default to Patient Intake
};

export default function Deals() {
  const location = useLocation();
  const navigate = useNavigate();
  const entityType = "deals";
  const entityLabel = "deals";
  // Ensure all call logs have process field
  const [callLogs, setCallLogs] = useState<CallLog[]>(
    initialCallLogs.map(log => ({
      ...log,
      process: log.process || getProcessFromStage(log.currentStage)
    }))
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [importMethod, setImportMethod] = useState<"csv" | "api" | "webhook">("csv");
  const [customApiIntegrations, setCustomApiIntegrations] = useState<Array<{
    id: string; name: string; baseUrl: string;
    allowedMethods: string[]; fieldMappings: Array<{ key: string; label: string }>;
  }>>([]);
  const [selectedImportApiId, setSelectedImportApiId] = useState<string>("");
  const [webhookLinkMode, setWebhookLinkMode] = useState<"system" | "manual">("system");
  const [showWebhookInfo, setShowWebhookInfo] = useState(false);

  useEffect(() => {
    if (showImportModal && importMethod === "api") {
      try {
        setCustomApiIntegrations(JSON.parse(localStorage.getItem('customApiIntegrations') || '[]'));
      } catch { setCustomApiIntegrations([]); }
    }
  }, [showImportModal, importMethod]);

  const examplePayloadJson = JSON.stringify({
    "dealName": "Patient Intake Package",
    "clientName": "Sarah Johnson",
    "amount": 25000,
    "currency": "₹",
    "status": "In Progress",
    "responsible": "John Smith",
    "stage": "Patient Intake: Initial Contact"
  }, null, 2);
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [showProcessesDropdown, setShowProcessesDropdown] = useState(false);
  const [selectedProcessFilter, setSelectedProcessFilter] = useState<string | null>(null);
  const [stageDropdownCallId, setStageDropdownCallId] = useState<string | null>(null);
  const [draggedCallId, setDraggedCallId] = useState<string | null>(null);
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [quickDealColumn, setQuickDealColumn] = useState<string | null>(null);
  const [quickDealName, setQuickDealName] = useState("");
  const [quickDealAmount, setQuickDealAmount] = useState("");
  const [quickDealCurrency, setQuickDealCurrency] = useState("₹");
  const [quickDealContact, setQuickDealContact] = useState("");
  const [quickDealCompany, setQuickDealCompany] = useState("");
  const [quickDealAssign, setQuickDealAssign] = useState("");
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [openDealMenuId, setOpenDealMenuId] = useState<string | null>(null);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [showViewDrawer, setShowViewDrawer] = useState(false);
  const [selectedLogForView, setSelectedLogForView] = useState<CallLog | null>(null);
  const [viewDrawerTab, setViewDrawerTab] = useState<"general" | "history">("general");
  const [historyFilter, setHistoryFilter] = useState("");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<{ [key: string]: string }>({});
  const [showResponsibleDropdownInDrawer, setShowResponsibleDropdownInDrawer] = useState(false);
  const [stageDropdownOpen, setStageDropdownOpen] = useState<string | null>(null);

  // Team Member Profile Drawer (FIX 2)
  const [showTeamMemberDrawer, setShowTeamMemberDrawer] = useState(false);
  const [selectedTeamMember, setSelectedTeamMember] = useState<typeof teamMembersData[0] | null>(null);

  // Drawer stage index state (FIX 3) — separate from log.currentStage to enable optimistic update
  const [drawerStageIdx, setDrawerStageIdx] = useState(1);

  // Process Viewer Select/Create field (FIX 4)
  const { getAllFields } = useFieldRegistry();
  const [fieldManagerMode, setFieldManagerMode] = useState<"select" | "create">("select");
  const [fieldManagerOpen, setFieldManagerOpen] = useState(false);
  const [drawerVisibleFields, setDrawerVisibleFields] = useState<string[]>([
    "client_name", "responsible", "deal_type", "source", "start_date", "end_date",
    "email_id", "country_code", "country", "time_slot", "comment"
  ]);

  useEffect(() => {
    if (selectedLogForView) {
      setEditedValues({});
      const allProcessFields = getAllFields("process");
      const defaultKeys = [
        "client_name", "responsible", "deal_type", "source", "start_date", "end_date",
        "email_id", "country_code", "country", "time_slot", "comment"
      ];
      const savedKeys: string[] = (selectedLogForView as any).visibleFieldKeys || defaultKeys;
      const savedKeySet = new Set(savedKeys);
      const autoKeys: string[] = [];
      allProcessFields.forEach(f => {
        if (!savedKeySet.has(f.key) && !defaultKeys.includes(f.key)) {
          const val = (selectedLogForView as any)[f.key];
          if (val !== undefined && val !== null && val !== "") {
            autoKeys.push(f.key);
          }
        }
      });
      setDrawerVisibleFields([...savedKeys, ...autoKeys]);
    }
  }, [selectedLogForView]);

  // History advanced filter (FIX 6)
  const [showHistoryFilterPopup, setShowHistoryFilterPopup] = useState(false);
  const [historyQuickFilter, setHistoryQuickFilter] = useState<string | null>(null);
  const [historyTypeFilter, setHistoryTypeFilter] = useState("Not specified");
  const [historyEventTypeFilter, setHistoryEventTypeFilter] = useState("Not specified");
  const [historyCreatedByFilter, setHistoryCreatedByFilter] = useState("");
  const [historyDateFilter, setHistoryDateFilter] = useState("Any date");
  const [historyFiltersActive, setHistoryFiltersActive] = useState(false);
  const [showAddFieldPopup, setShowAddFieldPopup] = useState(false);
  const [activeFilterFields, setActiveFilterFields] = useState<string[]>(["Event Type", "Created By", "Date"]);
  const [selectedAddFields, setSelectedAddFields] = useState<string[]>(["Event Type", "Created By", "Date"]);

  // List view stage hover (FIX 5)
  const [hoveredStageSegment, setHoveredStageSegment] = useState<{ logId: string; segIdx: number } | null>(null);
  const kanbanScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<number | null>(null);
  const kanbanScrollIntervalRef = useRef<number | null>(null);
  const [showKanbanLeftArrow, setShowKanbanLeftArrow] = useState(false);
  const [showKanbanRightArrow, setShowKanbanRightArrow] = useState(true);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const [showScrollLeftIndicator, setShowScrollLeftIndicator] = useState(false);

  // Advanced search filter states
  const [selectedStages, setSelectedStages] = useState<string[]>(["Deal in progress"]);
  const [selectedResponsible, setSelectedResponsible] = useState<string[]>([]);
  const [showStageDropdown, setShowStageDropdown] = useState(false);
  const [showResponsibleDropdown, setShowResponsibleDropdown] = useState(false);
  const [createdOnFilter, setCreatedOnFilter] = useState("Any date");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");


  // Add field modal states
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [searchFieldQuery, setSearchFieldQuery] = useState("");
  const [visibleFields, setVisibleFields] = useState({
    name: true,
    responsiblePerson: true,
    stageGroup: true,
    comment: true,
    createdOn: true,
    callType: false,
    status: false,
    duration: false,
    client: false,
    phone: false,
    email: false,
    notes: false,
  });

  // Available processes
  const availableProcesses = [
    "Patient Intake",
    "Follow-up Calls",
    "Insurance Verification",
    "Appointment Scheduling",
    "Payment Reminder"
  ];

  const allAvailableFields = [
    { id: "name", label: "Name", category: "Call" },
    { id: "responsiblePerson", label: "Responsible person", category: "Call" },
    { id: "stageGroup", label: "Stage group", category: "Call" },
    { id: "comment", label: "Comment", category: "Call" },
    { id: "createdOn", label: "Created on", category: "Call" },
    { id: "callType", label: "Call type", category: "Call" },
    { id: "status", label: "Status", category: "Call" },
    { id: "duration", label: "Duration", category: "Call" },
    { id: "client", label: "Client name", category: "Client" },
    { id: "phone", label: "Phone", category: "Client" },
    { id: "email", label: "Email", category: "Client" },
    { id: "notes", label: "Notes", category: "Details" },
  ];

  const handleRestoreDefaultFields = () => {
    setSelectedStages(["Deal in progress"]);
    setSelectedResponsible([]);
    setCreatedOnFilter("Any date");
    setFilterStartDate("");
    setFilterEndDate("");
    setShowStageDropdown(false);
    setShowResponsibleDropdown(false);
    setVisibleFields({
      name: true,
      responsiblePerson: true,
      stageGroup: true,
      comment: true,
      createdOn: true,
      callType: false,
      status: false,
      duration: false,
      client: false,
      phone: false,
      email: false,
      notes: false,
    });
  };

  const handleApplyFields = () => {
    setShowAddFieldModal(false);
  };

  const toggleAllFields = (checked: boolean) => {
    const newVisibleFields = { ...visibleFields };
    Object.keys(newVisibleFields).forEach(key => {
      newVisibleFields[key as keyof typeof visibleFields] = checked;
    });
    setVisibleFields(newVisibleFields);
  };

  // Date range state
  const [activeDateRange, setActiveDateRange] = useState<"1M" | "2M" | "3M" | "Custom">("1M");
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Additional filter state
  const [callTypeFilter, setCallTypeFilter] = useState("All Types");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [visibleColumns, setVisibleColumns] = useState({
    client: true,
    process: true,
    status: true,
    currentStage: true,
    date: true,
    activity: true,
    responsible: true,
  });

  // Client filter state
  const [activeClientFilter, setActiveClientFilter] = useState<string>("");
  const [activeClientId, setActiveClientId] = useState<string>("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const totalRecords = 5380; // Mock total for demonstration

  // Team members and stages for filters
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

  const teamMembersData = [
    { name: "John Smith", role: "Senior Therapist", email: "john.smith@mantraassist.com", phone: "+1 555-0101" },
    { name: "Sarah Johnson", role: "Patient Coordinator", email: "sarah.j@mantraassist.com", phone: "+1 555-0102" },
    { name: "Michael Chen", role: "Insurance Specialist", email: "m.chen@mantraassist.com", phone: "+1 555-0103" },
    { name: "Emily Davis", role: "Billing Manager", email: "emily.d@mantraassist.com", phone: "+1 555-0104" },
    { name: "Robert Wilson", role: "Care Coordinator", email: "rwilson@mantraassist.com", phone: "+1 555-0105" },
    { name: "Jessica Brown", role: "Front Desk", email: "j.brown@mantraassist.com", phone: "+1 555-0106" },
    { name: "David Martinez", role: "Follow-up Specialist", email: "d.martinez@mantraassist.com", phone: "+1 555-0107" },
    { name: "Amanda Taylor", role: "Office Manager", email: "a.taylor@mantraassist.com", phone: "+1 555-0108" },
  ];

  const stages = [
    "Initial Contact",
    "Insurance Verification",
    "Schedule Appointment",
    "Post-Visit Check",
    "Medication Reminder",
    "Billing Inquiry",
    "Follow-up",
    "Deal in progress",
    "Closed deal",
    "Test deal",
  ];

  // Comprehensive stage pipeline (for progress visualization)
  const stagePipeline = [
    { id: 1, label: "Initial Contact", fullLabel: "Patient Intake: Initial Contact", category: "Patient Intake" },
    { id: 2, label: "Insurance Verify", fullLabel: "Patient Intake: Insurance Verify", category: "Patient Intake" },
    { id: 3, label: "Schedule Appointment", fullLabel: "Patient Intake: Schedule Appointment", category: "Patient Intake" },
    { id: 4, label: "Post-Visit Check", fullLabel: "Follow-up Calls: Post-Visit Check", category: "Follow-up Calls" },
    { id: 5, label: "Medication Reminder", fullLabel: "Follow-up Calls: Medication Reminder", category: "Follow-up Calls" },
    { id: 6, label: "Billing Inquiry", fullLabel: "Payment Reminder: Billing Inquiry", category: "Payment Reminder" },
    { id: 7, label: "Issue Resolution", fullLabel: "Payment Reminder: Issue Resolution", category: "Payment Reminder" },
    { id: 8, label: "Payment Notice", fullLabel: "Payment Reminder: Payment Notice", category: "Payment Reminder" },
    { id: 9, label: "Payment Collected", fullLabel: "Payment Reminder: Payment Collected", category: "Payment Reminder" },
    { id: 10, label: "Initial Contact", fullLabel: "Appointment Scheduling: Initial Contact", category: "Appointment Scheduling" },
    { id: 11, label: "Slot Selection", fullLabel: "Appointment Scheduling: Slot Selection", category: "Appointment Scheduling" },
    { id: 12, label: "Confirmation", fullLabel: "Appointment Scheduling: Confirmation", category: "Appointment Scheduling" },
    { id: 13, label: "Initial Contact", fullLabel: "Insurance Verification: Initial Contact", category: "Insurance Verification" },
    { id: 14, label: "Document Check", fullLabel: "Insurance Verification: Document Check", category: "Insurance Verification" },
    { id: 15, label: "Verification", fullLabel: "Insurance Verification: Verification", category: "Insurance Verification" },
  ];

  const dealKanbanStages = [
    { id: 1, label: "New" },
    { id: 2, label: "Can't Contact" },
    { id: 3, label: "Follow-up Later" },
    { id: 4, label: "Interested" },
    { id: 5, label: "Negotiation" },
    { id: 6, label: "Won" },
    { id: 7, label: "Lost" },
  ];

  // Helper to get stage position (1-15) from current stage name
  const getStagePosition = (stageName: string): number => {
    // Try to find exact match in pipeline
    const exactMatch = stagePipeline.find(s => s.label === stageName);
    if (exactMatch) return exactMatch.id;

    // Try to find partial match for legacy stage names
    const partialMatch = stagePipeline.find(s =>
      s.label.toLowerCase().includes(stageName.toLowerCase())
    );
    if (partialMatch) return partialMatch.id;

    // Default to position 1 if no match
    return 1;
  };

  // Helper to get category from stage name
  const getCategoryFromStage = (stageName: string): string => {
    // Direct category mapping for common stage names
    const stageToCategory: { [key: string]: string } = {
      "Initial Contact": "Patient Intake",
      "Insurance Verification": "Insurance Verification",
      "Insurance Verify": "Patient Intake",
      "Schedule Appointment": "Patient Intake",
      "Post-Visit Check": "Follow-up Calls",
      "Medication Reminder": "Follow-up Calls",
      "Follow-up": "Follow-up Calls",
      "Billing Inquiry": "Payment Reminder",
      "Issue Resolution": "Payment Reminder",
      "Payment Notice": "Payment Reminder",
      "Payment Collected": "Payment Reminder",
      "Slot Selection": "Appointment Scheduling",
      "Confirmation": "Appointment Scheduling",
      "Document Check": "Insurance Verification",
      "Verification": "Insurance Verification",
      "Approval": "Insurance Verification",
    };

    // Try direct mapping first
    if (stageToCategory[stageName]) {
      return stageToCategory[stageName];
    }

    // Try to find in pipeline
    const pipelineMatch = stagePipeline.find(s =>
      s.label === stageName || s.label.includes(stageName)
    );
    if (pipelineMatch) {
      return pipelineMatch.category;
    }

    // Default to first category
    return "Patient Intake";
  };

  const dealStageLabels = ["New", "Can't Contact", "Follow-up Later", "Interested", "Close Deal"];

  const getDealStageIndex = (stageName: string): number => {
    // Find the index directly in dealStageLabels
    const index = dealStageLabels.findIndex(label => label === stageName);
    if (index !== -1) {
      return index + 1; // Convert to 1-based index
    }
    // Fallback to old logic for legacy stage names
    const pos = getStagePosition(stageName);
    if (pos <= 3) return 1;
    if (pos <= 6) return 2;
    if (pos <= 9) return 3;
    if (pos <= 12) return 4;
    return 5;
  };

  const getDealStageFromIndex = (idx: number): string => {
    // Map index directly to dealStageLabels
    return dealStageLabels[idx - 1] || dealStageLabels[0];
  };

  // Selection state
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showHelp, setShowHelp] = useState(false);

  // Bulk action modals
  const [showTriggerCallsModal, setShowTriggerCallsModal] = useState(false);
  const [showCancelCallsModal, setShowCancelCallsModal] = useState(false);
  const [scheduleOption, setScheduleOption] = useState<"immediate" | "scheduled">("immediate");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  // Call Details Drawer
  const [showCallDetailsDrawer, setShowCallDetailsDrawer] = useState(false);
  const [selectedCallForDetails, setSelectedCallForDetails] = useState<CallLog | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<"summary" | "call-review" | "review">("summary");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [callFeedback, setCallFeedback] = useState("");
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);

  // Apply client filter from navigation state
  useEffect(() => {
    const state = location.state as { clientId?: string; clientName?: string; clientFilter?: string } | null;
    if (state?.clientId) {
      setActiveClientId(state.clientId);
      setActiveClientFilter(state.clientName || "");
    } else if (state?.clientFilter) {
      // Legacy support
      setActiveClientFilter(state.clientFilter);
    }
  }, [location.state]);

  // Handle Escape key — close topmost open layer only
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTeamMemberDrawer) { setShowTeamMemberDrawer(false); return; }
        if (showViewDrawer) { setShowViewDrawer(false); }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showViewDrawer, showTeamMemberDrawer]);

  // Sync drawerStageIdx when a deal is opened (FIX 3)
  useEffect(() => {
    if (selectedLogForView) {
      setDrawerStageIdx(getDealStageIndex(selectedLogForView.currentStage));
    }
  }, [selectedLogForView?.id]);

  const handleClearClientFilter = () => {
    setActiveClientFilter("");
    setActiveClientId("");
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
    toast.success(`Importing deals from ${selectedFile.name}...`);
    setShowImportModal(false);
    setSelectedFile(null);
  };

  const handleDownloadTemplate = () => {
    // In a real app, this would download an actual CSV file
    toast.success("Sample CSV template downloaded");
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

  // Table scroll handlers (List View)
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

  // Kanban scroll handlers
  const handleKanbanScrollRightMouseEnter = () => {
    let velocity = 0;
    const maxVelocity = 3;
    const acceleration = 0.15;

    const scroll = () => {
      if (kanbanScrollRef.current) {
        velocity = Math.min(velocity + acceleration, maxVelocity);
        kanbanScrollRef.current.scrollLeft += velocity;

        const { scrollWidth, clientWidth, scrollLeft } = kanbanScrollRef.current;
        if (scrollLeft >= scrollWidth - clientWidth) {
          if (kanbanScrollIntervalRef.current) {
            cancelAnimationFrame(kanbanScrollIntervalRef.current);
            kanbanScrollIntervalRef.current = null;
          }
          return;
        }

        kanbanScrollIntervalRef.current = requestAnimationFrame(scroll);
      }
    };

    kanbanScrollIntervalRef.current = requestAnimationFrame(scroll);
  };

  const handleKanbanScrollLeftMouseEnter = () => {
    let velocity = 0;
    const maxVelocity = 3;
    const acceleration = 0.15;

    const scroll = () => {
      if (kanbanScrollRef.current) {
        velocity = Math.min(velocity + acceleration, maxVelocity);
        kanbanScrollRef.current.scrollLeft -= velocity;

        if (kanbanScrollRef.current.scrollLeft <= 0) {
          if (kanbanScrollIntervalRef.current) {
            cancelAnimationFrame(kanbanScrollIntervalRef.current);
            kanbanScrollIntervalRef.current = null;
          }
          return;
        }

        kanbanScrollIntervalRef.current = requestAnimationFrame(scroll);
      }
    };

    kanbanScrollIntervalRef.current = requestAnimationFrame(scroll);
  };

  const handleKanbanScrollMouseLeave = () => {
    if (kanbanScrollIntervalRef.current) {
      cancelAnimationFrame(kanbanScrollIntervalRef.current);
      kanbanScrollIntervalRef.current = null;
    }
  };

  const handleDateRangeClick = (range: "1M" | "2M" | "3M" | "Custom") => {
    if (range === "Custom") {
      setShowCustomDateModal(true);
    } else {
      setActiveDateRange(range);
      toast.success(`Showing calls from last ${range.replace("M", " month")}${range !== "1M" ? "s" : ""}`);
    }
  };

  const handleApplyCustomDates = () => {
    if (!customStartDate || !customEndDate) {
      toast.error("Please select both start and end dates");
      return;
    }
    setActiveDateRange("Custom");
    setShowCustomDateModal(false);
    toast.success(`Custom date range applied: ${customStartDate} to ${customEndDate}`);
  };

  // Selection handlers
  const handleSelectAll = () => {
    const currentPageLogs = paginatedLogs.map((l) => l.id);
    if (currentPageLogs.every((id) => selectedRows.has(id))) {
      // Deselect all on current page
      setSelectedRows(new Set([...selectedRows].filter((id) => !currentPageLogs.includes(id))));
    } else {
      // Select all on current page
      setSelectedRows(new Set([...selectedRows, ...currentPageLogs]));
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
  const handleBulkTriggerCalls = () => {
    const count = selectedRows.size;
    if (scheduleOption === "immediate") {
      toast.success(`${count} call${count > 1 ? 's' : ''} triggered successfully`);
    } else {
      toast.success(`${count} call${count > 1 ? 's' : ''} scheduled for ${scheduledDate} at ${scheduledTime}`);
    }
    setSelectedRows(new Set());
    setShowTriggerCallsModal(false);
    setScheduleOption("immediate");
    setScheduledDate("");
    setScheduledTime("");
  };

  const handleBulkCancelCalls = () => {
    const count = selectedRows.size;
    // Update call logs to remove scheduled calls
    setCallLogs(
      callLogs.map((log) =>
        selectedRows.has(log.id) ? { ...log, hasScheduledCall: false } : log
      )
    );
    toast.success(`${count} scheduled call${count > 1 ? 's' : ''} cancelled successfully`);
    setSelectedRows(new Set());
    setShowCancelCallsModal(false);
  };

  const handleClearSelection = () => {
    setSelectedRows(new Set());
  };

  // Check if any selected rows have scheduled calls
  const hasScheduledCalls = [...selectedRows].some((id) => {
    const log = callLogs.find((l) => l.id === id);
    return log?.hasScheduledCall;
  });

  // Pagination logic
  const filteredLogs = callLogs.filter((log) => {
    // Apply search filter
    const matchesSearch = log.client.toLowerCase().includes(searchQuery.toLowerCase());

    // Apply client filter if active (prefer clientId, fallback to name)
    const matchesClientFilter = activeClientId
      ? log.clientId === activeClientId
      : activeClientFilter
        ? log.client === activeClientFilter
        : true;

    // Apply process filter
    const matchesProcessFilter = selectedProcessFilter
      ? log.process === selectedProcessFilter
      : true;

    return matchesSearch && matchesClientFilter && matchesProcessFilter;
  });


  const totalPages = Math.ceil(totalRecords / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalRecords);
  const paginatedLogs = filteredLogs.slice(0, rowsPerPage); // Show only first page of filtered results

  // Check if all rows on current page are selected
  const currentPageLogIds = paginatedLogs.map((l) => l.id);
  const allSelected = currentPageLogIds.length > 0 && currentPageLogIds.every((id) => selectedRows.has(id));
  const someSelected = currentPageLogIds.some((id) => selectedRows.has(id)) && !allSelected;

  // Check scroll on mount and resize
  useEffect(() => {
    const checkScroll = () => {
      if (tableScrollRef.current) {
        const { scrollWidth, clientWidth, scrollLeft } = tableScrollRef.current;
        setShowScrollIndicator(scrollWidth > clientWidth && scrollLeft < scrollWidth - clientWidth);
        setShowScrollLeftIndicator(scrollLeft > 0);
      }
      if (kanbanScrollRef.current) {
        const { scrollWidth, clientWidth, scrollLeft } = kanbanScrollRef.current;
        setShowKanbanRightArrow(scrollWidth > clientWidth && scrollLeft < scrollWidth - clientWidth - 10);
        setShowKanbanLeftArrow(scrollLeft > 0);
      }
    };

    checkScroll();
    window.addEventListener('resize', checkScroll);

    return () => {
      window.removeEventListener('resize', checkScroll);
      if (scrollIntervalRef.current) {
        cancelAnimationFrame(scrollIntervalRef.current);
      }
      if (kanbanScrollIntervalRef.current) {
        cancelAnimationFrame(kanbanScrollIntervalRef.current);
      }
    };
  }, [filteredLogs, viewMode]);


  const handleExport = () => {
    setIsExporting(true);
    toast.loading("Exporting data...");

    // Simulate export process
    setTimeout(() => {
      setIsExporting(false);
      toast.dismiss();
      toast.success("Process data exported successfully");
    }, 2000);
  };

  const handleTriggerCall = (log: CallLog) => {
    // Generate new call ID
    const newCallId = String(Date.now());
    const currentDate = new Date().toISOString().slice(0, 16).replace("T", " ");

    // Create new call log
    const newCall: CallLog = {
      id: newCallId,
      client: log.client,
      clientId: log.clientId,
      process: log.process || "",
      lastStage: "",
      type: "Outbound",
      status: "Pending",
      currentStage: "Initial Contact",
      duration: "0:00",
      date: currentDate,
      hasRecording: false,
      hasTranscript: false,
      hasScheduledCall: false,
      parentCallId: log.id,
      relationshipReason: "Call Trigger",
    };

    // Update parent call to track child
    const updatedLogs = callLogs.map((l) =>
      l.id === log.id
        ? { ...l, childCallIds: [...(l.childCallIds || []), newCallId] }
        : l
    );

    // Add new call to the list
    setCallLogs([newCall, ...updatedLogs]);
    toast.success(`New call triggered for ${log.client} (Call ID: ${newCallId})`);
  };

  const handleStopScheduledCall = (logId: string, clientName: string) => {
    setCallLogs(
      callLogs.map((log) =>
        log.id === logId ? { ...log, hasScheduledCall: false } : log
      )
    );
    toast.success(`Scheduled call stopped for ${clientName}`);
  };

  // Call Details Drawer Handlers
  const handleSaveFeedback = () => {
    setIsSavingFeedback(true);
    setTimeout(() => {
      setIsSavingFeedback(false);
      toast.success("Rating and feedback saved");
    }, 800);
  };


  const handleStarClick = (value: number) => {
    setRating(value);
  };

  const handleStarHover = (value: number) => {
    setHoverRating(value);
  };

  const renderStars = () => {
    const stars = [];
    const displayRating = hoverRating || rating;

    for (let i = 1; i <= 5; i++) {
      const isFull = displayRating >= i;
      const isHalf = displayRating >= i - 0.5 && displayRating < i;

      stars.push(
        <div
          key={i}
          className="relative cursor-pointer"
          onMouseEnter={() => handleStarHover(i)}
          onMouseLeave={() => setHoverRating(0)}
        >
          <button
            onClick={() => handleStarClick(i)}
            className="absolute inset-0 w-full h-full z-10"
            style={{ clipPath: 'polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)' }}
          />
          <button
            onClick={() => handleStarClick(i - 0.5)}
            className="absolute inset-0 w-full h-full z-10"
            style={{ clipPath: 'polygon(0% 0%, 50% 0%, 50% 100%, 0% 100%)' }}
          />

          <Star
            className={`w-6 h-6 transition-all ${isFull
              ? "fill-warning text-warning"
              : isHalf
                ? "fill-warning text-warning"
                : "fill-none text-muted-foreground"
              }`}
            style={
              isHalf
                ? { clipPath: 'polygon(0% 0%, 50% 0%, 50% 100%, 0% 100%)' }
                : undefined
            }
          />
          {isHalf && (
            <Star className="w-6 h-6 absolute top-0 left-0 fill-none text-muted-foreground" />
          )}
        </div>
      );
    }

    return stars;
  };

  const getReasonIcon = (reason?: string) => {
    switch (reason) {
      case "Call Trigger":
        return <Zap className="w-4 h-4" />;
      case "Stage Change":
        return <GitBranch className="w-4 h-4" />;
      case "Retry":
        return <RefreshCw className="w-4 h-4" />;
      case "Manual Trigger":
        return <Phone className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F9FAFB' }}>
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <div className="py-6 px-[150px] space-y-8">
        <PageHeader
          title="Process"
          subtitle="See where every client stands, move them through stages, and close deals faster."
        >
          <HowItWorksButton onClick={() => setShowHelp(true)} label="How Process Works" />
        </PageHeader>

        {/* Active Client Filter Banner */}
        {activeClientFilter && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Filter className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Showing deals for <span className="font-semibold">{activeClientFilter}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Click the button to view all deals
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearClientFilter}
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Clear Filter
            </Button>
          </div>
        )}

        {/* Action Bar */}
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <div className="flex items-center gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search deals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSearchModal(true)}
                  className="w-full pl-9 pr-4 py-2 bg-input-background border border-input rounded-lg text-sm"
                />
              </div>

              {/* Advanced Search Dropdown Panel */}
              {showSearchModal && (
                <>
                  {/* Backdrop to close panel */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowSearchModal(false)}
                  />

                  {/* Dropdown Panel */}
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-border z-50 overflow-hidden">
                    <div className="flex" style={{ maxHeight: '700px' }}>
                      {/* Left Sidebar - Saved Searches */}
                      <div className="w-56 border-r border-border p-4 overflow-y-auto bg-muted/30">
                        <div className="space-y-1">
                          <button className="w-full text-left px-3 py-2 text-sm rounded-lg bg-primary/10 text-primary font-medium">
                            Process in progress
                          </button>
                          <button className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors text-foreground">
                            Test process
                          </button>
                          <button className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors text-foreground">
                            Closed process
                          </button>
                          <button className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors text-foreground">
                            MC EAP
                          </button>
                        </div>
                        <div className="mt-4 pt-4 border-t border-border">
                          <button className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-2">
                            <span className="text-base">+</span> Save filter
                          </button>
                        </div>
                      </div>

                      {/* Right Side - Filter Fields */}
                      <div className="flex-1 p-6 overflow-y-auto">
                        <div className="space-y-4">
                          {/* Client Name */}
                          {visibleFields.name && (
                            <div>
                              <label className="block text-xs font-medium mb-2 text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                Name
                              </label>
                              <input
                                type="text"
                                placeholder="Enter client name"
                                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                            </div>
                          )}

                          {/* Responsible Person - Multi-select */}
                          {visibleFields.responsiblePerson && (
                            <div className="relative">
                              <label className="block text-xs font-medium mb-2 text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                Responsible person
                              </label>
                              <div
                                onClick={() => setShowResponsibleDropdown(!showResponsibleDropdown)}
                                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer bg-white min-h-[38px] flex items-center flex-wrap gap-1"
                              >
                                {selectedResponsible.length === 0 ? (
                                  <span className="text-muted-foreground">Select person(s)</span>
                                ) : (
                                  selectedResponsible.map((person) => (
                                    <span
                                      key={person}
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs"
                                    >
                                      {person}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedResponsible(selectedResponsible.filter(p => p !== person));
                                        }}
                                        className="hover:text-primary-foreground"
                                      >
                                        &times;
                                      </button>
                                    </span>
                                  ))
                                )}
                              </div>
                              {showResponsibleDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                                  {teamMembers.map((member) => (
                                    <label
                                      key={member}
                                      className="flex items-center gap-2 px-3 py-2 hover:bg-muted cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selectedResponsible.includes(member)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedResponsible([...selectedResponsible, member]);
                                          } else {
                                            setSelectedResponsible(selectedResponsible.filter(p => p !== member));
                                          }
                                        }}
                                        className="w-4 h-4"
                                      />
                                      <span className="text-sm">{member}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Stage Group - Multi-select */}
                          {visibleFields.stageGroup && (
                            <div className="relative">
                              <label className="block text-xs font-medium mb-2 text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                Stage group
                              </label>
                              <div
                                onClick={() => setShowStageDropdown(!showStageDropdown)}
                                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer bg-white min-h-[38px] flex items-center flex-wrap gap-1"
                              >
                                {selectedStages.length === 0 ? (
                                  <span className="text-muted-foreground">Select stage(s)</span>
                                ) : (
                                  selectedStages.map((stage) => (
                                    <span
                                      key={stage}
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs"
                                    >
                                      {stage}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedStages(selectedStages.filter(s => s !== stage));
                                        }}
                                        className="hover:text-primary-foreground"
                                      >
                                        &times;
                                      </button>
                                    </span>
                                  ))
                                )}
                              </div>
                              {showStageDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                                  {stages.map((stage) => (
                                    <label
                                      key={stage}
                                      className="flex items-center gap-2 px-3 py-2 hover:bg-muted cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selectedStages.includes(stage)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedStages([...selectedStages, stage]);
                                          } else {
                                            setSelectedStages(selectedStages.filter(s => s !== stage));
                                          }
                                        }}
                                        className="w-4 h-4"
                                      />
                                      <span className="text-sm">{stage}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Comment */}
                          {visibleFields.comment && (
                            <div>
                              <label className="block text-xs font-medium mb-2 text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                Comment
                              </label>
                              <input
                                type="text"
                                placeholder="Enter comment"
                                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                            </div>
                          )}

                          {/* Created On */}
                          {visibleFields.createdOn && (
                            <div>
                              <label className="block text-xs font-medium mb-2 text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                Created on
                              </label>
                              <select
                                value={createdOnFilter}
                                onChange={(e) => setCreatedOnFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              >
                                <option>Any date</option>
                                <option>Today</option>
                                <option>Yesterday</option>
                                <option>Last 7 days</option>
                                <option>Last 30 days</option>
                                <option>Custom range</option>
                              </select>

                              {/* Custom Date Range Inputs */}
                              {createdOnFilter === "Custom range" && (
                                <div className="mt-3 grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium mb-1 text-muted-foreground">
                                      From
                                    </label>
                                    <input
                                      type="date"
                                      value={filterStartDate}
                                      onChange={(e) => setFilterStartDate(e.target.value)}
                                      className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium mb-1 text-muted-foreground">
                                      To
                                    </label>
                                    <input
                                      type="date"
                                      value={filterEndDate}
                                      onChange={(e) => setFilterEndDate(e.target.value)}
                                      className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Call Type */}
                          {visibleFields.callType && (
                            <div>
                              <label className="block text-xs font-medium mb-2 text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                Call type
                              </label>
                              <select className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                                <option>All types</option>
                                <option>Outbound</option>
                                <option>Inbound</option>
                              </select>
                            </div>
                          )}

                          {/* Status */}
                          {visibleFields.status && (
                            <div>
                              <label className="block text-xs font-medium mb-2 text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                Status
                              </label>
                              <select className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                                <option>All statuses</option>
                                <option>Completed</option>
                                <option>Failed</option>
                                <option>Pending</option>
                              </select>
                            </div>
                          )}

                          {/* Duration */}
                          {visibleFields.duration && (
                            <div>
                              <label className="block text-xs font-medium mb-2 text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                Duration
                              </label>
                              <div className="grid grid-cols-2 gap-3">
                                <input
                                  type="number"
                                  placeholder="Min (seconds)"
                                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                                <input
                                  type="number"
                                  placeholder="Max (seconds)"
                                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                              </div>
                            </div>
                          )}

                          {/* Client */}
                          {visibleFields.client && (
                            <div>
                              <label className="block text-xs font-medium mb-2 text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                Client name
                              </label>
                              <input
                                type="text"
                                placeholder="Enter client name"
                                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                            </div>
                          )}

                          {/* Phone */}
                          {visibleFields.phone && (
                            <div>
                              <label className="block text-xs font-medium mb-2 text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                Phone
                              </label>
                              <input
                                type="text"
                                placeholder="Enter phone number"
                                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                            </div>
                          )}

                          {/* Email */}
                          {visibleFields.email && (
                            <div>
                              <label className="block text-xs font-medium mb-2 text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                Email
                              </label>
                              <input
                                type="email"
                                placeholder="Enter email"
                                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                            </div>
                          )}

                          {/* Notes */}
                          {visibleFields.notes && (
                            <div>
                              <label className="block text-xs font-medium mb-2 text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                Notes
                              </label>
                              <textarea
                                placeholder="Enter notes"
                                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                rows={3}
                              />
                            </div>
                          )}

                          {/* Add Field Link */}
                          <div className="flex items-center gap-4 pt-2">
                            <button
                              onClick={() => setShowAddFieldModal(true)}
                              className="text-xs text-primary hover:underline"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            >
                              Add field
                            </button>
                            <button
                              onClick={handleRestoreDefaultFields}
                              className="text-xs text-muted-foreground hover:underline"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            >
                              Restore default fields
                            </button>
                          </div>
                        </div>

                        {/* Search and Reset Buttons */}
                        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-border">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRestoreDefaultFields}
                          >
                            Reset
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setShowSearchModal(false);
                              // Apply filters here
                            }}
                          >
                            <Search className="w-4 h-4" />
                            Search
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Import Button */}
            <Tooltip text="Import">
              <Button variant="outline" onClick={() => setShowImportModal(true)}>
                <Upload className="w-4 h-4" />
              </Button>
            </Tooltip>

            {/* Export Button */}
            <Tooltip text="Export">
              <Button variant="outline" onClick={handleExport} loading={isExporting}>
                <Download className="w-4 h-4" />
              </Button>
            </Tooltip>
          </div>
        </div>

        {/* Toolbar Panel with View Tabs and Processes Dropdown */}
        <div className="bg-white border-b" style={{ height: '42px', borderBottomWidth: '0.5px', borderColor: '#E5E7EB' }}>
          <div className="flex items-center h-full px-4 gap-6">
            {/* List Tab */}
            <button
              onClick={() => setViewMode("list")}
              className="h-full px-3 text-sm font-medium transition-colors relative"
              style={{
                color: viewMode === "list" ? '#1a56db' : '#6B7280',
                fontSize: '13px',
                fontWeight: 500
              }}
            >
              List
              {viewMode === "list" && (
                <div
                  className="absolute bottom-0 left-0 right-0"
                  style={{
                    height: '2px',
                    backgroundColor: '#1a56db'
                  }}
                />
              )}
            </button>

            {/* Kanban Tab */}
            <button
              onClick={() => setViewMode("kanban")}
              className="h-full px-3 text-sm font-medium transition-colors relative"
              style={{
                color: viewMode === "kanban" ? '#1a56db' : '#6B7280',
                fontSize: '13px',
                fontWeight: 500
              }}
            >
              Kanban
              {viewMode === "kanban" && (
                <div
                  className="absolute bottom-0 left-0 right-0"
                  style={{
                    height: '2px',
                    backgroundColor: '#1a56db'
                  }}
                />
              )}
            </button>

            {/* Processes Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProcessesDropdown(!showProcessesDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border transition-colors rounded-lg"
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#374151',
                  borderColor: '#D1D5DB'
                }}
              >
                {selectedProcessFilter ? selectedProcessFilter : "Process"}
                <ChevronDown className="w-4 h-4" />
              </button>

              {/* Processes Dropdown Menu */}
              {showProcessesDropdown && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowProcessesDropdown(false)}
                  />

                  {/* Dropdown Panel */}
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-border rounded-lg shadow-xl z-50 py-2">
                    <button
                      onClick={() => {
                        setSelectedProcessFilter(null);
                        setShowProcessesDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm rounded transition-colors ${!selectedProcessFilter ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                        }`}
                    >
                      All
                    </button>
                    {[
                      'Patient Intake',
                      'Follow-up Calls',
                      'Insurance Verification',
                      'Appointment Scheduling',
                      'Payment Reminder'
                    ].map((process) => (
                      <button
                        key={process}
                        onClick={() => {
                          setSelectedProcessFilter(process);
                          setShowProcessesDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm rounded transition-colors ${selectedProcessFilter === process ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                          }`}
                      >
                        {process}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Settings Icon Button */}
            <Link
              to="/process"
              className="ml-auto p-2 transition-colors rounded-lg hover:bg-muted/50"
              style={{ color: '#6B7280' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#1a56db'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#6B7280'}
            >
              <SettingsIcon className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Add Field Modal */}
        {showAddFieldModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-lg font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                  Filter field settings
                </h2>
                <button
                  onClick={() => setShowAddFieldModal(false)}
                  className="p-1 hover:bg-muted rounded-lg transition-colors"
                >
                  <span className="text-2xl text-muted-foreground">&times;</span>
                </button>
              </div>

              {/* Search */}
              <div className="px-6 py-4 border-b border-border">
                <div className="relative max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Find field"
                    value={searchFieldQuery}
                    onChange={(e) => setSearchFieldQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Fields List - All Categories */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Group fields by category */}
                  {["Call", "Client", "Details"].map((category) => {
                    const categoryFields = allAvailableFields
                      .filter(field => field.category === category)
                      .filter(field =>
                        field.label.toLowerCase().includes(searchFieldQuery.toLowerCase())
                      );

                    if (categoryFields.length === 0) return null;

                    return (
                      <div key={category}>
                        <h3 className="text-sm font-medium mb-3 text-muted-foreground">{category}</h3>
                        <div className="grid grid-cols-4 gap-4">
                          {categoryFields.map((field) => (
                            <label
                              key={field.id}
                              className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={visibleFields[field.id as keyof typeof visibleFields]}
                                onChange={(e) => {
                                  setVisibleFields({
                                    ...visibleFields,
                                    [field.id]: e.target.checked,
                                  });
                                }}
                                className="w-4 h-4"
                              />
                              <span className="text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                {field.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Object.values(visibleFields).every(v => v)}
                    onChange={(e) => toggleAllFields(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    select all
                  </span>
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setVisibleFields({
                        name: true,
                        responsiblePerson: true,
                        stageGroup: true,
                        comment: true,
                        createdOn: true,
                        callType: false,
                        status: false,
                        duration: false,
                        client: false,
                        phone: false,
                        email: false,
                        notes: false,
                      });
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  >
                    <span className="text-lg">↻</span> default
                  </button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddFieldModal(false)}
                  >
                    CANCEL
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleApplyFields}
                  >
                    APPLY
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <div className="bg-card border border-border shadow-sm overflow-hidden relative" style={{ borderRadius: '0px' }}>
            <div
              ref={tableScrollRef}
              className="overflow-x-auto scrollbar-hide"
              style={{ scrollBehavior: 'auto' }}
              onScroll={() => {
                if (tableScrollRef.current) {
                  const { scrollWidth, clientWidth, scrollLeft } = tableScrollRef.current;
                  setShowScrollIndicator(scrollWidth > clientWidth && scrollLeft < scrollWidth - clientWidth);
                  setShowScrollLeftIndicator(scrollLeft > 0);
                }
              }}
            >
              <table className="w-full" style={{ minWidth: '1200px' }}>
                <thead className="border-b border-border" style={{ backgroundColor: '#314158' }}>
                  <tr>
                    <th className="px-4 py-2.5 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected;
                        }}
                        onChange={handleSelectAll}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </th>
                    {/* Settings icon column */}
                    <th className="px-2 py-2.5 text-center relative" style={{ width: '32px' }}>
                      <div className="relative inline-block">
                        <button
                          onClick={() => setShowColumnToggle(!showColumnToggle)}
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
                                  <span className="text-sm capitalize" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                    {col === 'client' ? 'Client' : col === 'process' ? 'Process' : col === 'currentStage' ? 'Stage' : col === 'date' ? 'Created' : col}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </th>
                    {visibleColumns.client && <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#FFFFFF', fontFamily: 'Outfit, sans-serif' }}>Client</th>}
                    {visibleColumns.process && <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#FFFFFF', fontFamily: 'Outfit, sans-serif' }}>Process</th>}
                    {visibleColumns.currentStage && (
                      <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: '#FFFFFF', fontFamily: 'Outfit, sans-serif' }}>
                        <div className="flex items-center justify-center gap-1">
                          Stage
                          <InfoTooltip text="Each block is one stage. Click a block to move this client to that stage." />
                        </div>
                      </th>
                    )}
                    {visibleColumns.status && <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: '#FFFFFF', fontFamily: 'Outfit, sans-serif' }}>Status</th>}
                    {visibleColumns.date && <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#FFFFFF', fontFamily: 'Outfit, sans-serif' }}>Created</th>}
                    {visibleColumns.activity && <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#FFFFFF', fontFamily: 'Outfit, sans-serif' }}>Activity</th>}
                    {visibleColumns.responsible && <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#FFFFFF', fontFamily: 'Outfit, sans-serif' }}>Responsible</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedLogs.map((log) => (
                    <tr
                      key={log.id}
                      className={`transition-colors ${selectedRows.has(log.id)
                        ? "bg-[#E8F0FE]"
                        : "hover:bg-[#F1F5F9]"
                        }`}
                    >
                      <td className="px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(log.id)}
                          onChange={() => handleSelectRow(log.id)}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </td>
                      {/* Three-dot menu cell */}
                      <td className="px-2 py-2.5 relative" style={{ width: '32px' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenRowMenuId(openRowMenuId === log.id ? null : log.id); }}
                          className="inline-flex items-center justify-center w-7 h-7 rounded transition-colors hover:bg-gray-100"
                          style={{ color: '#94A3B8' }}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openRowMenuId === log.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setOpenRowMenuId(null)} />
                            <div
                              className="absolute left-8 top-0 z-50 bg-white rounded-lg overflow-hidden"
                              style={{ width: '140px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}
                            >
                              <button
                                onClick={() => { setOpenRowMenuId(null); setSelectedLogForView(log); setViewDrawerTab("general"); setHistoryFilter(""); setShowViewDrawer(true); }}
                                className="w-full flex items-center gap-2.5 px-3 text-sm text-gray-700 transition-colors hover:bg-[#F0F4FF]"
                                style={{ height: '36px', fontSize: '14px' }}
                              >
                                <Eye className="w-4 h-4" /> View
                              </button>
                              <button
                                onClick={() => { setOpenRowMenuId(null); toast.info("Edit coming soon"); }}
                                className="w-full flex items-center gap-2.5 px-3 text-sm text-gray-700 transition-colors hover:bg-[#F0F4FF]"
                                style={{ height: '36px', fontSize: '14px' }}
                              >
                                <Pencil className="w-4 h-4" /> Edit
                              </button>
                              <button
                                onClick={() => { setOpenRowMenuId(null); toast.error("Delete coming soon"); }}
                                className="w-full flex items-center gap-2.5 px-3 transition-colors hover:bg-[#F0F4FF]"
                                style={{ height: '36px', fontSize: '14px', color: '#D32F2F' }}
                              >
                                <Trash2 className="w-4 h-4" /> Delete
                              </button>
                            </div>
                          </>
                        )}
                      </td>
                      {visibleColumns.client && (
                        <td className="px-4 py-2.5 font-medium text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                          <span
                            className="text-left"
                            style={{ color: '#1A73E8' }}
                          >
                            {log.client}
                          </span>
                        </td>
                      )}
                      {visibleColumns.process && (
                        <td className="px-4 py-2.5 text-sm" style={{ fontFamily: 'DM Sans, sans-serif', color: '#64748B' }}>
                          {log.process}
                        </td>
                      )}
                      {visibleColumns.currentStage && (
                        <td className="px-4 py-2.5 relative">
                          {/* FIX 1: Stage segments with completed/active/future colors */}
                          <div className="flex items-center gap-[3px]">
                            {dealStageLabels.map((stageName, i) => {
                              const segIdx = i + 1;
                              const activeIdx = getDealStageIndex(log.currentStage);
                              const isCompleted = segIdx < activeIdx;
                              const isActive = segIdx === activeIdx;
                              const isHovered = hoveredStageSegment?.logId === log.id && hoveredStageSegment?.segIdx === segIdx;
                              return (
                                <div key={stageName} className="relative">
                                  {isHovered && (
                                    <div
                                      className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded pointer-events-none"
                                      style={{ backgroundColor: '#1A2B4A', color: '#fff', fontSize: '12px', zIndex: 200, borderRadius: '4px' }}
                                    >
                                      {stageName}
                                    </div>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newStage = getDealStageFromIndex(segIdx);
                                      setCallLogs(prev => prev.map(l => l.id === log.id
                                        ? { ...l, currentStage: newStage }
                                        : l
                                      ));
                                      toast.success(`Stage updated to ${stageName} ✓`);
                                    }}
                                    onMouseEnter={() => setHoveredStageSegment({ logId: log.id, segIdx })}
                                    onMouseLeave={() => setHoveredStageSegment(null)}
                                    style={{
                                      width: '18px',
                                      height: '8px',
                                      borderRadius: '2px',
                                      backgroundColor: (isCompleted || isActive)
                                        ? '#1E88E5'        // completed and current stages: blue
                                        : 'transparent',   // future stages: transparent
                                      border: (isCompleted || isActive) ? 'none' : '1px solid #E8ECF0',
                                      cursor: 'pointer',
                                      display: 'block',
                                      padding: 0,
                                      flexShrink: 0,
                                      transition: 'background-color 0.2s ease',
                                    }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      )}
                      {visibleColumns.status && (
                        <td className="px-4 py-2.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${log.status === "Completed"
                            ? "bg-success-bg text-success"
                            : log.status === "Pending"
                              ? "bg-warning/10 text-warning"
                              : "bg-error-bg text-error"
                            }`} style={{ fontFamily: 'Outfit, sans-serif' }}>
                            {log.status}
                          </span>
                        </td>
                      )}
                      {visibleColumns.date && <td className="px-4 py-2.5 text-xs" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>{log.date}</td>}
                      {visibleColumns.activity && (
                        <td className="px-4 py-2.5">
                          <div className="flex flex-col gap-0.5">
                            <div className="text-xs" style={{ color: log.status === "Pending" ? '#DC2626' : '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                              {log.status === "Pending" ? "Scheduled call" : "Last contact"} - {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                            <div className="text-xs" style={{ color: '#9CA3AF', fontFamily: 'Outfit, sans-serif' }}>
                              {log.status === "Pending" ? "Follow up needed" : log.currentStage}
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.responsible && (
                        <td className="px-4 py-2.5">
                          <span className="text-xs" style={{ color: '#1F2937', fontFamily: 'Outfit, sans-serif' }}>
                            {mockClients[log.clientId]?.responsible || 'Unassigned'}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="border-t border-border px-4 py-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Rows per page:</span>
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
                  <span className="text-xs" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
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
                  <span className="text-xs px-2 hidden sm:inline" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <span className="text-xs px-2 sm:hidden" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
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

            {/* Scroll Right Button - Semicircle */}
            <button
              className="absolute right-0 flex items-center justify-center pointer-events-auto z-10 transition-all"
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
              <ChevronRight className="w-5 h-5 transition-transform" style={{ color: '#1e293b', opacity: 1 }} />
            </button>

            {/* Scroll Left Button - Semicircle */}
            <button
              className="absolute left-0 flex items-center justify-center pointer-events-auto z-10 transition-all"
              style={{
                top: '50%',
                transform: 'translateY(-50%)',
                height: '112px',
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
              <ChevronLeft className="w-5 h-5 transition-transform" style={{ color: '#1e293b', opacity: 1 }} />
            </button>
          </div>
        )}

        {/* Kanban View */}
        {viewMode === "kanban" && (
          <div
            className="bg-card rounded-xl border border-border shadow-sm p-4 relative"
            onClick={() => { if (openDealMenuId) setOpenDealMenuId(null); }}
          >
            {/* Left scroll arrow - Semicircle */}
            <button
              className="absolute left-0 flex items-center justify-center pointer-events-auto z-10 transition-all"
              style={{
                top: '50%',
                transform: 'translateY(-50%)',
                height: '112px',
                width: '40px',
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                borderTopRightRadius: '9999px',
                borderBottomRightRadius: '9999px',
                borderTopLeftRadius: '0',
                borderBottomLeftRadius: '0',
                opacity: showKanbanLeftArrow ? 1 : 0.2,
                pointerEvents: showKanbanLeftArrow ? 'auto' : 'none'
              }}
              onMouseEnter={(e) => {
                if (showKanbanLeftArrow) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.65)';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                  const icon = e.currentTarget.querySelector('svg');
                  if (icon) (icon as SVGElement).style.transform = 'scale(1.1)';
                  handleKanbanScrollLeftMouseEnter();
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                e.currentTarget.style.boxShadow = '';
                const icon = e.currentTarget.querySelector('svg');
                if (icon) (icon as SVGElement).style.transform = 'scale(1)';
                handleKanbanScrollMouseLeave();
              }}
            >
              <ChevronLeft className="w-5 h-5 transition-transform" style={{ color: '#1e293b', opacity: 1 }} />
            </button>

            {/* Right scroll arrow - Semicircle */}
            <button
              className="absolute right-0 flex items-center justify-center pointer-events-auto z-10 transition-all"
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
                opacity: showKanbanRightArrow ? 1 : 0.2,
                pointerEvents: showKanbanRightArrow ? 'auto' : 'none'
              }}
              onMouseEnter={(e) => {
                if (showKanbanRightArrow) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.65)';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                  const icon = e.currentTarget.querySelector('svg');
                  if (icon) (icon as SVGElement).style.transform = 'scale(1.1)';
                  handleKanbanScrollRightMouseEnter();
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                e.currentTarget.style.boxShadow = '';
                const icon = e.currentTarget.querySelector('svg');
                if (icon) (icon as SVGElement).style.transform = 'scale(1)';
                handleKanbanScrollMouseLeave();
              }}
            >
              <ChevronRight className="w-5 h-5 transition-transform" style={{ color: '#1e293b', opacity: 1 }} />
            </button>

            <div
              ref={kanbanScrollRef}
              className="scrollbar-hide flex gap-3 overflow-x-auto pb-4"
              style={{ scrollBehavior: 'auto' }}
              onScroll={() => {
                if (kanbanScrollRef.current) {
                  const { scrollWidth, clientWidth, scrollLeft } = kanbanScrollRef.current;
                  setShowKanbanRightArrow(scrollWidth > clientWidth && scrollLeft < scrollWidth - clientWidth - 10);
                  setShowKanbanLeftArrow(scrollLeft > 0);
                }
              }}
            >
              {(selectedProcessFilter
                ? stagePipeline.filter((s) => s.category === selectedProcessFilter)
                : stagePipeline
              ).map((stage) => {
                const stageDeals = deals.filter((d) => d.stage === stage.fullLabel);
                const totalValue = stageDeals.reduce((sum, d) => sum + d.amount, 0);
                const isQuickDealOpen = quickDealColumn === stage.fullLabel;

                return (
                  <div
                    key={stage.id}
                    className="flex-shrink-0 flex flex-col rounded-lg overflow-hidden"
                    style={{ width: '245px', border: '1px solid transparent' }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = '#1A73E8';
                      e.currentTarget.style.borderStyle = 'dashed';
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.style.borderColor = 'transparent';
                      e.currentTarget.style.borderStyle = 'solid';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = 'transparent';
                      e.currentTarget.style.borderStyle = 'solid';
                      if (draggedDealId) {
                        setDeals((prev) =>
                          prev.map((d) =>
                            d.id === draggedDealId ? { ...d, stage: stage.fullLabel } : d
                          )
                        );
                        toast.success(`Deal moved to ${stage.fullLabel}`);
                        setDraggedDealId(null);
                      }
                    }}
                  >
                    {/* Column header */}
                    <div className="px-3 py-3" style={{ backgroundColor: '#1C2B4A' }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-bold" style={{ fontSize: '14px', fontFamily: 'Outfit, sans-serif' }}>
                          {stage.label}
                        </span>
                        <div
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: '#06B6D4', color: '#FFFFFF', minWidth: '20px', textAlign: 'center' }}
                        >
                          {stageDeals.length}
                        </div>
                      </div>
                      <div style={{ fontSize: '10px', color: '#94A3B8', fontFamily: 'Outfit, sans-serif' }}>
                        {stage.category}
                      </div>
                    </div>

                    {/* Cards + Quick Deal */}
                    <div
                      className="p-3 flex-1"
                      style={{ maxHeight: '560px', overflowY: 'auto', backgroundColor: '#F8FAFC' }}
                    >
                      <div className="space-y-3">
                        {stageDeals.map((deal) => {
                          const isMenuOpen = openDealMenuId === deal.id;
                          const createdDate = new Date(deal.createdDate);
                          const displayDate = createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                          return (
                            <div
                              key={deal.id}
                              draggable
                              onDragStart={() => setDraggedDealId(deal.id)}
                              onDragEnd={() => setDraggedDealId(null)}
                              className="bg-white rounded-lg cursor-move transition-all group hover:shadow-md"
                              style={{
                                boxShadow: draggedDealId === deal.id
                                  ? '0 8px 24px rgba(0,0,0,0.15)'
                                  : '0 1px 4px rgba(0,0,0,0.07)',
                                transform: draggedDealId === deal.id ? 'rotate(2deg)' : 'none',
                                padding: '12px',
                                border: '1px solid #E2E8F0',
                              }}
                            >
                              {/* Row 1: Client name + ⋯ menu */}
                              <div className="flex items-start justify-between mb-2">
                                <span
                                  className="font-bold leading-tight flex-1 pr-1 text-left"
                                  style={{ fontSize: '13px', color: '#1A73E8', fontFamily: 'Outfit, sans-serif', padding: 0 }}
                                >
                                  {deal.clientName}
                                </span>
                                <div className="relative flex-shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenDealMenuId(isMenuOpen ? null : deal.id);
                                    }}
                                    className="p-0.5 rounded hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
                                    style={{ color: '#94A3B8' }}
                                  >
                                    <MoreVertical className="w-3.5 h-3.5" />
                                  </button>
                                  {isMenuOpen && (
                                    <div
                                      className="absolute right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-1"
                                      style={{ top: '20px', minWidth: '130px' }}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors">
                                        <Pencil className="w-3.5 h-3.5 text-gray-400" />
                                        Edit
                                      </button>
                                      <button
                                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                        onClick={() => setOpenDealMenuId(null)}
                                      >
                                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                                        Call
                                      </button>
                                      <button
                                        className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                        onClick={() => {
                                          setDeals((prev) => prev.filter((d) => d.id !== deal.id));
                                          setOpenDealMenuId(null);
                                          toast.success("Deal deleted");
                                        }}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Row 2: Process */}
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'Outfit, sans-serif' }}>Process</span>
                                <span style={{ fontSize: '11px', color: '#1C2B4A', fontFamily: 'Outfit, sans-serif' }}>
                                  {deal.stage.includes(': ') ? deal.stage.split(': ')[0] : stage.category}
                                </span>
                              </div>

                              {/* Row 3: Status badge */}
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'Outfit, sans-serif' }}>Status</span>
                                <span
                                  className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                                  style={{
                                    fontFamily: 'Outfit, sans-serif',
                                    backgroundColor:
                                      deal.status === "Won" ? '#DCFCE7' :
                                        deal.status === "Lost" ? '#FEE2E2' : '#EFF6FF',
                                    color:
                                      deal.status === "Won" ? '#16A34A' :
                                        deal.status === "Lost" ? '#DC2626' : '#2563EB',
                                  }}
                                >
                                  {deal.status}
                                </span>
                              </div>

                              {/* Row 4: Created date */}
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'Outfit, sans-serif' }}>Created</span>
                                <span style={{ fontSize: '11px', color: '#1C2B4A', fontFamily: 'Outfit, sans-serif' }}>{displayDate}</span>
                              </div>

                              {/* Row 5: Activity */}
                              <div className="flex items-center gap-1.5 mb-2">
                                <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'Outfit, sans-serif' }}>Activity</span>
                                <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'Outfit, sans-serif', fontStyle: 'italic' }}>No activities</span>
                              </div>

                              {/* Footer: Responsible */}
                              <div
                                className="flex items-center justify-between pt-2"
                                style={{ borderTop: '1px solid #F1F5F9' }}
                              >
                                <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'Outfit, sans-serif' }}>Responsible</span>
                                <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'Outfit, sans-serif', fontWeight: 500 }}>
                                  {deal.responsible.split(' ')[0]}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Trigger Calls Modal */}
        <Modal
          isOpen={showTriggerCallsModal}
          onClose={() => {
            setShowTriggerCallsModal(false);
            setScheduleOption("immediate");
            setScheduledDate("");
            setScheduledTime("");
          }}
          title="Trigger Calls"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowTriggerCallsModal(false);
                  setScheduleOption("immediate");
                  setScheduledDate("");
                  setScheduledTime("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleBulkTriggerCalls}
                disabled={scheduleOption === "scheduled" && (!scheduledDate || !scheduledTime)}
              >
                Confirm
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You are about to trigger calls for <span className="font-semibold text-foreground">{selectedRows.size}</span> item{selectedRows.size > 1 ? 's' : ''}
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
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 bg-input-background border border-input rounded-xl text-sm"
                          />
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Time</label>
                        <input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
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

        {/* Cancel Scheduled Calls Modal */}
        <Modal
          isOpen={showCancelCallsModal}
          onClose={() => setShowCancelCallsModal(false)}
          title="Cancel Scheduled Calls"
          footer={
            <>
              <Button variant="outline" onClick={() => setShowCancelCallsModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleBulkCancelCalls}
                className="bg-destructive hover:bg-destructive/90 text-white"
              >
                Confirm
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You are about to cancel <span className="font-semibold text-foreground">{selectedRows.size}</span> scheduled call{selectedRows.size > 1 ? 's' : ''}
            </p>
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Warning</p>
                <p className="text-sm text-destructive/80 mt-1">This action cannot be undone</p>
              </div>
            </div>
          </div>
        </Modal>

        {/* Custom Date Range Modal */}
        <Modal
          isOpen={showCustomDateModal}
          onClose={() => setShowCustomDateModal(false)}
          title="Custom Date Range"
          footer={
            <>
              <Button variant="outline" onClick={() => setShowCustomDateModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleApplyCustomDates}>
                Apply
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select a custom date range to filter deals
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Start Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-input-background border border-input rounded-xl text-sm"
                  />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">End Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-input-background border border-input rounded-xl text-sm"
                  />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </Modal>
      </div>

      {/* Call Details Drawer */}
      <Drawer
        isOpen={showCallDetailsDrawer}
        onClose={() => {
          setShowCallDetailsDrawer(false);
          setSelectedCallForDetails(null);
          setActiveDrawerTab("summary");
          setIsPlaying(false);
          setPlaybackSpeed(1);
          setRating(0);
          setHoverRating(0);
          setCallFeedback("");
        }}
        title={
          <>
            <h2 className="text-2xl font-semibold text-foreground" style={{ fontFamily: 'DM Sans, sans-serif' }}>Call Details</h2>
            {selectedCallForDetails && (
              <span className="px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>
                #{selectedCallForDetails.id}
              </span>
            )}
          </>
        }
      >
        {selectedCallForDetails && (
          <div className="flex flex-col h-full">
            {/* Sticky Tab Bar */}
            <div className="bg-white border-b" style={{ borderColor: '#E5E7EB' }}>
              <div className="flex items-center">
                <button
                  onClick={() => setActiveDrawerTab("summary")}
                  className={`flex-1 flex items-center justify-center text-center transition-all ${activeDrawerTab === "summary" ? "text-primary" : "hover:bg-muted/30"
                    }`}
                  style={{
                    height: '44px',
                    fontSize: '13px',
                    fontWeight: 500,
                    fontFamily: 'Outfit, sans-serif',
                    color: activeDrawerTab === "summary" ? "#1A73E8" : "#6B7280",
                    borderBottom: activeDrawerTab === "summary" ? "2px solid #1A73E8" : "2px solid transparent",
                    backgroundColor: activeDrawerTab === "summary" ? "#FFFFFF" : undefined,
                  }}
                >
                  Summary
                </button>
                <button
                  onClick={() => setActiveDrawerTab("call-review")}
                  className={`flex-1 flex items-center justify-center text-center transition-all ${activeDrawerTab === "call-review" ? "text-primary" : "hover:bg-muted/30"
                    }`}
                  style={{
                    height: '44px',
                    fontSize: '13px',
                    fontWeight: 500,
                    fontFamily: 'Outfit, sans-serif',
                    color: activeDrawerTab === "call-review" ? "#1A73E8" : "#6B7280",
                    borderBottom: activeDrawerTab === "call-review" ? "2px solid #1A73E8" : "2px solid transparent",
                    backgroundColor: activeDrawerTab === "call-review" ? "#FFFFFF" : undefined,
                  }}
                >
                  Call Review
                </button>
                <button
                  onClick={() => setActiveDrawerTab("review")}
                  className={`flex-1 flex items-center justify-center text-center transition-all ${activeDrawerTab === "review" ? "text-primary" : "hover:bg-muted/30"
                    }`}
                  style={{
                    height: '44px',
                    fontSize: '13px',
                    fontWeight: 500,
                    fontFamily: 'Outfit, sans-serif',
                    color: activeDrawerTab === "review" ? "#1A73E8" : "#6B7280",
                    borderBottom: activeDrawerTab === "review" ? "2px solid #1A73E8" : "2px solid transparent",
                    backgroundColor: activeDrawerTab === "review" ? "#FFFFFF" : undefined,
                  }}
                >
                  Review
                </button>
              </div>
            </div>

            {/* Tab Content - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              {activeDrawerTab === "summary" && (
                <div className="space-y-6 p-6">
                  {/* Summary Card */}
                  <div className="bg-white rounded-lg border shadow-sm" style={{ padding: '20px', borderColor: '#E5E7EB', borderRadius: '8px' }}>
                    <h2 className="text-lg font-semibold mb-4" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Summary</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', rowGap: '20px' }}>
                      {/* Row 1 - Column 1: Client */}
                      <div>
                        <p style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', fontFamily: 'Outfit, sans-serif' }}>Client</p>
                        <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>{selectedCallForDetails.client}</p>
                      </div>
                      {/* Row 1 - Column 2: Call Time */}
                      <div>
                        <p style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', fontFamily: 'Outfit, sans-serif' }}>Call Time</p>
                        <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>{selectedCallForDetails.date}</p>
                      </div>
                      {/* Row 1 - Column 3: Type */}
                      <div>
                        <p style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', fontFamily: 'Outfit, sans-serif' }}>Type</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedCallForDetails.type === "Outbound"
                          ? "bg-primary/10 text-primary"
                          : "bg-secondary/10 text-secondary"
                          }`} style={{ fontFamily: 'Outfit, sans-serif' }}>
                          {selectedCallForDetails.type}
                        </span>
                      </div>
                      {/* Row 2 - Column 1: Current Stage */}
                      <div>
                        <p style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', fontFamily: 'Outfit, sans-serif' }}>Current Stage</p>
                        <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>{selectedCallForDetails.currentStage}</p>
                      </div>
                      {/* Row 2 - Column 2: Call Status */}
                      <div>
                        <p style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', fontFamily: 'Outfit, sans-serif' }}>Call Status</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedCallForDetails.status === "Completed"
                          ? "bg-success/10 text-success"
                          : selectedCallForDetails.status === "Failed"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-warning/10 text-warning"
                          }`} style={{ fontFamily: 'Outfit, sans-serif' }}>
                          {selectedCallForDetails.status}
                        </span>
                      </div>
                      {/* Row 2 - Column 3: Duration */}
                      <div>
                        <p style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', fontFamily: 'Outfit, sans-serif' }}>Duration</p>
                        <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>{selectedCallForDetails.duration}</p>
                      </div>
                    </div>
                  </div>

                  {/* Recording Player */}
                  {selectedCallForDetails.hasRecording && (
                    <div className="bg-card rounded-2xl p-8 border border-border shadow-lg">
                      <h2 className="text-lg font-semibold mb-4" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Recording</h2>
                      <div className="space-y-4">
                        <div className="flex items-center gap-1">
                          <span className="text-xs mr-2" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Speed:</span>
                          {[0.5, 0.75, 1, 1.25, 1.5].map((speed) => (
                            <button
                              key={speed}
                              onClick={() => setPlaybackSpeed(speed)}
                              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${playbackSpeed === speed
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                            >
                              {speed}x
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 p-4 bg-muted rounded-xl">
                          <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
                          >
                            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                          </button>
                          <div className="flex-1">
                            <div className="h-2 bg-border rounded-full overflow-hidden">
                              <div className="h-full bg-primary w-1/3" />
                            </div>
                            <div className="flex justify-between mt-2 text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                              <span>1:30</span>
                              <span>{selectedCallForDetails.duration}</span>
                            </div>
                          </div>
                          <Tooltip text="Download Recording">
                            <Button variant="ghost" size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Transcript */}
                  {selectedCallForDetails.hasTranscript && (
                    <div className="bg-card rounded-2xl p-8 border border-border shadow-lg">
                      <h2 className="text-lg font-semibold mb-4" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Call Transcript</h2>

                      {/* Speed Controls */}
                      <div className="flex items-center mb-4">
                        {/* Playback Speed */}
                        <div className="flex items-center gap-2">
                          {[1, 1.25, 1.5, 2].map((speed) => (
                            <button
                              key={speed}
                              onClick={() => setPlaybackSpeed(speed)}
                              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${playbackSpeed === speed
                                ? "bg-muted text-foreground border border-border"
                                : "bg-white text-muted-foreground hover:bg-muted border border-border"
                                }`}
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            >
                              {speed}x
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Messages */}
                      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {/* AI Assistant Message - Right side */}
                        <div className="flex justify-end">
                          <div className="max-w-[80%]">
                            <div className="flex items-center justify-end gap-2 mb-1">
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                AI ASSISTANT
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="bg-[#2F3B4E] text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                                <p className="text-sm leading-relaxed" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                  Hi kritika, this is Ria from MantraCare. Quick check-did I catch you at an okay time for thirty seconds?
                                </p>
                              </div>
                              <div className="flex-shrink-0 w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                                <Headphones className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Client Message - Left side */}
                        <div className="flex justify-start">
                          <div className="max-w-[80%]">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                CLIENT
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-white" />
                              </div>
                              <div className="bg-primary text-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                                <p className="text-sm leading-relaxed" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                  Hello.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* AI Assistant Message - Right side */}
                        <div className="flex justify-end">
                          <div className="max-w-[80%]">
                            <div className="flex items-center justify-end gap-2 mb-1">
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                AI ASSISTANT
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="bg-[#2F3B4E] text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                                <p className="text-sm leading-relaxed" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                  Hi kritika, thanks for picking up. Is now an okay time for a quick thirty seconds?
                                </p>
                              </div>
                              <div className="flex-shrink-0 w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                                <Headphones className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI Summary Card */}
                  <div className="bg-card rounded-2xl p-8 border border-border shadow-lg">
                    <h2 className="text-lg font-semibold mb-4" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>AI Summary</h2>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                          Call Overview
                        </h4>
                        <p className="text-sm leading-relaxed" style={{ color: '#475569', fontFamily: 'Outfit, sans-serif' }}>
                          This was an outbound call from MantraCare's AI assistant Ria to the client Kritika. The purpose was to establish initial contact and confirm availability for a brief conversation. The call lasted 4:32 minutes and was successfully completed.
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                          Key Points
                        </h4>
                        <ul className="space-y-2">
                          <li className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span className="text-sm" style={{ color: '#475569', fontFamily: 'Outfit, sans-serif' }}>
                              Initial contact established successfully
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span className="text-sm" style={{ color: '#475569', fontFamily: 'Outfit, sans-serif' }}>
                              Client confirmed availability for conversation
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span className="text-sm" style={{ color: '#475569', fontFamily: 'Outfit, sans-serif' }}>
                              Polite and professional tone maintained throughout
                            </span>
                          </li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                          Next Steps
                        </h4>
                        <p className="text-sm leading-relaxed" style={{ color: '#475569', fontFamily: 'Outfit, sans-serif' }}>
                          Schedule follow-up call to discuss insurance verification details and proceed with patient intake process.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Call Relationship */}
                  {(selectedCallForDetails.parentCallId || (selectedCallForDetails.childCallIds && selectedCallForDetails.childCallIds.length > 0)) && (
                    <div className="bg-card rounded-2xl p-8 border border-border shadow-lg">
                      <h2 className="text-lg font-semibold mb-4" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Call Relationship</h2>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm mb-1" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Current Call ID</p>
                          <p className="font-mono font-medium text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>#{selectedCallForDetails.id}</p>
                        </div>

                        {selectedCallForDetails.parentCallId && (
                          <div className="border-t border-border pt-4">
                            <p className="text-sm mb-2" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Created From</p>
                            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                {getReasonIcon(selectedCallForDetails.relationshipReason)}
                                <span className="text-xs font-semibold text-primary">
                                  {selectedCallForDetails.relationshipReason}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  const parentCall = callLogs.find(log => log.id === selectedCallForDetails.parentCallId);
                                  if (parentCall) {
                                    setSelectedCallForDetails(parentCall);
                                  }
                                }}
                                className="font-mono text-sm text-primary hover:underline"
                              >
                                Call ID: #{selectedCallForDetails.parentCallId}
                              </button>
                            </div>
                          </div>
                        )}

                        {selectedCallForDetails.childCallIds && selectedCallForDetails.childCallIds.length > 0 && (
                          <div className="border-t border-border pt-4">
                            <p className="text-sm mb-2" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Generated Calls</p>
                            <div className="space-y-2">
                              {selectedCallForDetails.childCallIds.map((childId) => (
                                <div key={childId} className="p-3 bg-success/5 border border-success/20 rounded-lg">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Zap className="w-4 h-4 text-success" />
                                    <span className="text-xs font-semibold text-success">Call Trigger</span>
                                  </div>
                                  <button
                                    onClick={() => {
                                      const childCall = callLogs.find(log => log.id === childId);
                                      if (childCall) {
                                        setSelectedCallForDetails(childCall);
                                      }
                                    }}
                                    className="font-mono text-sm text-success hover:underline"
                                  >
                                    Call ID: #{childId}
                                  </button>
                                  <p className="text-xs mt-1" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                                    New call created from this call log
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeDrawerTab === "call-review" && (
                <div className="space-y-6 p-6">
                  {/* Call Review Card */}
                  <div className="bg-card rounded-2xl p-8 border border-border shadow-lg">
                    <h2 className="text-lg font-semibold mb-4" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Call Review</h2>

                    <div className="space-y-6">
                      {/* Quality Metrics Cards */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 rounded-xl p-5">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center shadow-md">
                              <Volume2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-blue-700" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                Call Quality
                              </p>
                              <p className="text-2xl font-bold text-blue-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                9.5
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-blue-600" />
                            <span className="text-xs text-blue-600" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              +12% vs avg
                            </span>
                          </div>
                        </div>

                        <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200 rounded-xl p-5">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center shadow-md">
                              <GitBranch className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-purple-700" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                Flow Score
                              </p>
                              <p className="text-2xl font-bold text-purple-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                9.2
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-purple-600" />
                            <span className="text-xs text-purple-600" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              +8% vs avg
                            </span>
                          </div>
                        </div>

                        <div className="relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200 rounded-xl p-5">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center shadow-md">
                              <Users className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-green-700" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                Engagement
                              </p>
                              <p className="text-2xl font-bold text-green-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                8.8
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-green-600" />
                            <span className="text-xs text-green-600" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              +5% vs avg
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Performance Metrics */}
                      <div className="bg-muted/30 rounded-xl p-6 border border-border">
                        <h4 className="text-sm font-medium mb-2" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                          Performance Metrics
                        </h4>
                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium" style={{ color: '#475569', fontFamily: 'Outfit, sans-serif' }}>
                                Clarity
                              </span>
                              <span className="text-sm font-semibold text-primary" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                95%
                              </span>
                            </div>
                            <div className="relative w-full bg-muted rounded-full h-2.5 overflow-hidden">
                              <div
                                className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-primary to-blue-400 shadow-sm transition-all duration-500"
                                style={{ width: '95%' }}
                              ></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium" style={{ color: '#475569', fontFamily: 'Outfit, sans-serif' }}>
                                Professionalism
                              </span>
                              <span className="text-sm font-semibold text-primary" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                98%
                              </span>
                            </div>
                            <div className="relative w-full bg-muted rounded-full h-2.5 overflow-hidden">
                              <div
                                className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-primary to-blue-400 shadow-sm transition-all duration-500"
                                style={{ width: '98%' }}
                              ></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium" style={{ color: '#475569', fontFamily: 'Outfit, sans-serif' }}>
                                Client Engagement
                              </span>
                              <span className="text-sm font-semibold text-primary" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                88%
                              </span>
                            </div>
                            <div className="relative w-full bg-muted rounded-full h-2.5 overflow-hidden">
                              <div
                                className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-primary to-blue-400 shadow-sm transition-all duration-500"
                                style={{ width: '88%' }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Areas of Improvement */}
                      <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-5">
                        <h4 className="text-sm font-medium mb-2" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                          Suggested Improvements
                        </h4>
                        <ul className="space-y-3">
                          <li className="flex items-start gap-3 bg-white rounded-lg p-3 border border-amber-100">
                            <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-amber-600 text-xs font-bold">1</span>
                            </div>
                            <span className="text-sm leading-relaxed" style={{ color: '#78350F', fontFamily: 'Outfit, sans-serif' }}>
                              Consider reducing pause time between questions to maintain conversation momentum
                            </span>
                          </li>
                          <li className="flex items-start gap-3 bg-white rounded-lg p-3 border border-amber-100">
                            <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-amber-600 text-xs font-bold">2</span>
                            </div>
                            <span className="text-sm leading-relaxed" style={{ color: '#78350F', fontFamily: 'Outfit, sans-serif' }}>
                              Add more personalized context for better client connection and rapport building
                            </span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Smart Analysis / QA */}
                  <div className="bg-card rounded-2xl p-8 border border-border shadow-lg">
                    <h2 className="text-lg font-semibold mb-4" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Smart Analysis & QA</h2>

                    <div className="space-y-6">
                      {/* Customer Satisfaction */}
                      <div className="bg-slate-50 rounded-lg p-6 border border-border">
                        <h4 className="text-sm font-medium mb-2" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                          Customer Satisfaction
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                          {/* Dead Air */}
                          <div className="bg-white border border-border rounded-lg p-5">
                            <p className="text-xs text-slate-500 mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              Dead Air
                            </p>
                            <p className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                              14.69%
                            </p>
                          </div>

                          {/* Display Patience and Courtesy */}
                          <div className="bg-white border border-border rounded-lg p-5">
                            <p className="text-xs text-slate-500 mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              Display Patience and Courtesy
                            </p>
                            <p className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                              100%
                            </p>
                          </div>

                          {/* Empathy */}
                          <div className="bg-white border border-border rounded-lg p-5">
                            <p className="text-xs text-slate-500 mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              Empathy
                            </p>
                            <p className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                              58.22%
                            </p>
                          </div>

                          {/* Hold Time Violation */}
                          <div className="bg-white border border-border rounded-lg p-5">
                            <p className="text-xs text-slate-500 mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              Hold Time Violation
                            </p>
                            <p className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                              28.33%
                            </p>
                          </div>

                          {/* Negative Customer Sentiment */}
                          <div className="bg-white border border-border rounded-lg p-5">
                            <p className="text-xs text-slate-500 mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              Negative Customer Sentiment
                            </p>
                            <p className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                              19.52%
                            </p>
                          </div>

                          {/* Supervisor Escalation */}
                          <div className="bg-white border border-border rounded-lg p-5">
                            <p className="text-xs text-slate-500 mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              Supervisor Escalation
                            </p>
                            <p className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                              2.87%
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Process Adherence */}
                      <div className="bg-slate-50 rounded-lg p-6 border border-border">
                        <h4 className="text-sm font-medium mb-2" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                          Process Adherence
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                          {/* Proper Call Hold */}
                          <div className="bg-white border border-border rounded-lg p-5">
                            <p className="text-xs text-slate-500 mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              Proper Call Hold
                            </p>
                            <p className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                              67.89%
                            </p>
                          </div>

                          {/* Proper Call Opening */}
                          <div className="bg-white border border-border rounded-lg p-5">
                            <p className="text-xs text-slate-500 mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              Proper Call Opening
                            </p>
                            <p className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                              67.33%
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Compliance */}
                      <div className="bg-slate-50 rounded-lg p-6 border border-border">
                        <h4 className="text-sm font-medium mb-2" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                          Compliance
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                          {/* Customer Verification */}
                          <div className="bg-white border border-border rounded-lg p-5">
                            <p className="text-xs text-slate-500 mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              Customer Verification
                            </p>
                            <p className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                              79.31%
                            </p>
                          </div>

                          {/* Recorded Line Message */}
                          <div className="bg-white border border-border rounded-lg p-5">
                            <p className="text-xs text-slate-500 mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              Recorded Line Message
                            </p>
                            <p className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                              7.38%
                            </p>
                          </div>

                          {/* Redaction */}
                          <div className="bg-white border border-border rounded-lg p-5">
                            <p className="text-xs text-slate-500 mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              Redaction
                            </p>
                            <p className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                              59.99%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeDrawerTab === "review" && (
                <div className="space-y-6 p-6">
                  {/* Rating & Feedback Card */}
                  <div className="bg-card rounded-2xl p-8 border border-border shadow-lg">
                    <h2 className="text-lg font-semibold mb-4" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Rating & Feedback</h2>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm mb-2" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Rating</p>
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1">
                            {renderStars()}
                          </div>
                          {rating > 0 && (
                            <span className="text-sm font-medium" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                              {rating} / 5
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="text-sm mb-2 block" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Feedback</label>
                        <textarea
                          value={callFeedback}
                          onChange={(e) => setCallFeedback(e.target.value)}
                          placeholder="Add feedback on what should improve and highlight important points from this call..."
                          className="w-full px-4 py-3 bg-input-background border border-input rounded-xl resize-none text-sm min-h-[120px]"
                        />
                      </div>

                      <div className="flex justify-end">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleSaveFeedback}
                          loading={isSavingFeedback}
                          disabled={rating === 0 && !callFeedback.trim()}
                        >
                          Save Feedback
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Team Member Profile Drawer — z-index 99999 to ensure it appears above Process Viewer */}
      <TeamMemberDrawer
        isOpen={showTeamMemberDrawer}
        onClose={() => {
          setShowTeamMemberDrawer(false);
          setSelectedTeamMember(null);
        }}
        member={selectedTeamMember}
        zIndex={99999}
      />

      {/* Import Deals Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setSelectedFile(null);
          setImportMethod("csv");
        }}
        title="Import Process"
        footer={
          <>
            {importMethod === "webhook" ? (
              <Button
                variant="outline"
                onClick={() => {
                  setShowImportModal(false);
                  setSelectedFile(null);
                  setImportMethod("csv");
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
                  }}
                >
                  Cancel
                </Button>
                {importMethod === "csv" ? (
                  <Button variant="primary" onClick={handleImport}>
                    Import
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    disabled={!selectedImportApiId}
                    onClick={() => {
                      const api = customApiIntegrations.find(a => a.id === selectedImportApiId);
                      toast.success(`Fetching records from ${api?.name || "API"}...`);
                      setShowImportModal(false);
                      setSelectedFile(null);
                      setImportMethod("csv");
                    }}
                  >
                    Fetch & Import
                  </Button>
                )}
              </>
            )}
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex gap-2 mb-5 bg-muted/30 p-1 rounded-lg w-fit">
            {(["csv", "api", "webhook"] as const).map((method) => (
              <button
                key={method}
                onClick={() => setImportMethod(method)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${importMethod === method ? "bg-primary text-white" : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                {method === "csv" ? "CSV" : method === "api" ? "API" : "Webhook"}
              </button>
            ))}
          </div>

          {importMethod === "csv" && (
            <>
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
                    id="file-upload-deals"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        <label htmlFor="file-upload-deals" className="text-primary cursor-pointer hover:underline">
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
            </>
          )}

          {importMethod === "api" && (
            <>
              <p className="text-sm text-muted-foreground">
                Connect to an external API to pull {entityLabel} directly into your account.
              </p>

              {customApiIntegrations.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                  <Globe className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <h4 className="font-semibold mb-1">No API connections yet</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect a Custom API in Settings to pull {entityLabel} directly from an external source.
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => {
                      setShowImportModal(false);
                      navigate("/settings?tab=integrations&category=crm&integration=custom-api&action=connect");
                    }}
                  >
                    <Plus className="w-4 h-4" /> Add API
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {customApiIntegrations.map((api) => (
                    <label
                      key={api.id}
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${selectedImportApiId === api.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="importApi"
                          checked={selectedImportApiId === api.id}
                          onChange={() => setSelectedImportApiId(api.id)}
                          className="w-4 h-4"
                        />
                        <div>
                          <p className="text-sm font-semibold">{api.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{api.baseUrl}</p>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-semibold">
                        Connected ✅
                      </span>
                    </label>
                  ))}
                  <button
                    onClick={() => {
                      setShowImportModal(false);
                      navigate("/settings?tab=integrations&category=crm&integration=custom-api&action=connect");
                    }}
                    className="w-full py-2.5 border border-dashed border-primary/40 text-primary text-sm font-medium rounded-lg hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add another API
                  </button>
                </div>
              )}

              {selectedImportApiId && (
                <div className="mt-4 p-3 bg-muted/20 border border-border rounded-lg">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Fields that will be imported</p>
                  <div className="flex flex-wrap gap-1.5">
                    {customApiIntegrations.find(a => a.id === selectedImportApiId)?.fieldMappings.map((f) => (
                      <span key={f.key} className="text-[11px] px-2 py-0.5 rounded bg-white border border-border font-mono">
                        {f.label || f.key}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {importMethod === "webhook" && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">
                Use a webhook URL to automatically create single {entityLabel} whenever an external system sends data to it.
              </p>

              {/* Unified URL container */}
              <div>
                {/* Header row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold">Webhook URL</p>
                    {/* (i) info button with popover */}
                    <div className="relative webhook-info-popover">
                      <button
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        onMouseEnter={() => setShowWebhookInfo(true)}
                        onMouseLeave={(e) => {
                          const rel = e.relatedTarget as HTMLElement | null;
                          if (!rel?.closest('.webhook-info-popover')) setShowWebhookInfo(false);
                        }}
                        onClick={() => setShowWebhookInfo(v => !v)}
                        aria-label="Webhook URL info"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                      {showWebhookInfo && (
                        <div
                          className="absolute top-full left-0 mt-2 z-50 w-72 bg-white border border-border rounded-lg shadow-lg p-3 webhook-info-popover"
                          onMouseEnter={() => setShowWebhookInfo(true)}
                          onMouseLeave={() => setShowWebhookInfo(false)}
                        >
                          {webhookLinkMode === "system" ? (
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              Use this URL if you're embedding the webhook into your own system or backend. Send a POST request with a JSON body (see Example Payload) and an Authorization header.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                For manual, one-off entries — replace the placeholders (e.g. {'{DEAL_NAME}'}, {'{YOUR_API_KEY}'}) with real values, then open the link in a browser or paste into a tool that supports simple GET requests. No coding required.
                              </p>
                              <div className="flex items-start gap-1.5 pt-1 border-t border-border">
                                <AlertCircle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-600">API key is exposed in the URL — avoid sharing publicly or using for sensitive/bulk data.</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Copy button */}
                  <button
                    onClick={() => {
                      const url = webhookLinkMode === "system"
                        ? `https://app.mantraassist.com/api/webhooks/import/${entityType}`
                        : `https://app.mantraassist.com/api/webhooks/import/${entityType}?api_key={YOUR_API_KEY}&dealName={DEAL_NAME}&clientName={CLIENT_NAME}&amount={AMOUNT}&currency={CURRENCY}&status={STATUS}&responsible={RESPONSIBLE_PERSON}&stage={STAGE_NAME}`;
                      navigator.clipboard.writeText(url);
                      toast.success(webhookLinkMode === "system" ? "Webhook URL copied" : "Link copied");
                    }}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>

                {/* Code block — same container, only content changes */}
                <div className="bg-white border border-border rounded-lg px-3 py-2">
                  <code className="text-xs text-foreground break-all font-mono">
                    {webhookLinkMode === "system"
                      ? `https://app.mantraassist.com/api/webhooks/import/${entityType}`
                      : `https://app.mantraassist.com/api/webhooks/import/${entityType}?api_key={YOUR_API_KEY}&dealName={DEAL_NAME}&clientName={CLIENT_NAME}&amount={AMOUNT}&currency={CURRENCY}&status={STATUS}&responsible={RESPONSIBLE_PERSON}&stage={STAGE_NAME}`
                    }
                  </code>
                </div>

                {/* Mode toggle link */}
                <div className="flex justify-end mt-1.5">
                  <button
                    onClick={() => setWebhookLinkMode(m => m === "system" ? "manual" : "system")}
                    className="text-xs text-primary hover:underline cursor-pointer"
                  >
                    {webhookLinkMode === "system" ? "Use quick link" : "Use webhook URL instead"}
                  </button>
                </div>
              </div>

              {/* Example Payload — system mode only */}
              {webhookLinkMode === "system" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold">Example Payload</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(examplePayloadJson);
                        toast.success("Payload copied");
                      }}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                  <pre className="bg-muted/30 border border-border rounded-lg p-4 text-xs overflow-x-auto font-mono">
                    {examplePayloadJson}
                  </pre>
                </div>
              )}

              {/* Footer note — POST only */}
              {webhookLinkMode === "system" && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="w-3.5 h-3.5" />
                  <span><span className="font-medium">For POST requests only:</span> Include header <code className="font-mono bg-muted px-1 rounded">Authorization: Bearer &lt;org-api-key&gt;</code></span>
                </div>
              )}

            </div>
          )}
        </div>
      </Modal>

      {/* Bottom View Drawer */}
      {showViewDrawer && selectedLogForView && (() => {
        const log = selectedLogForView;
        const client = mockClients[log.clientId];
        const mockHistory = [
          { date: "26.05.2024 14:32", createdBy: client?.responsible || "System", eventType: "Stage changed" as const, description: `New → ${dealStageLabels[drawerStageIdx - 1]}` },
          { date: "25.05.2024 10:15", createdBy: client?.responsible || "System", eventType: "Activity created" as const, description: "Contact customer: Call for update" },
          { date: "24.05.2024 09:00", createdBy: "System", eventType: "View" as const, description: "" },
          { date: "23.05.2024 16:45", createdBy: client?.responsible || "System", eventType: "Stage changed" as const, description: `New → Can't Contact` },
          { date: "22.05.2024 11:20", createdBy: "System", eventType: "View" as const, description: "" },
        ];
        const filteredHistory = mockHistory.filter(h => {
          if (historyCreatedByFilter && !h.createdBy.toLowerCase().includes(historyCreatedByFilter.toLowerCase())) return false;
          if (historyEventTypeFilter !== "Not specified" && h.eventType !== historyEventTypeFilter) return false;
          if (historyQuickFilter === "Created by me" && h.createdBy === "System") return false;
          return true;
        });
        const allDealFields = getAllFields("deal");
        const fields = allDealFields
          .filter(f => drawerVisibleFields.includes(f.key))
          .map(f => {
            let val = "";
            if (editedValues[f.key] !== undefined) {
              val = editedValues[f.key];
            } else if ((log as any)[f.key] !== undefined) {
              val = (log as any)[f.key];
            } else {
              if (f.key === "client_name") val = log.client;
              else if (f.key === "responsible") val = client?.responsible || "Unassigned";
              else if (f.key === "deal_type") val = "Organic";
              else if (f.key === "source") val = client?.email?.split("@")[1] || "—";
              else if (f.key === "start_date") val = log.date ? new Date(log.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—";
              else if (f.key === "end_date") val = "—";
              else if (f.key === "email_id") val = client?.email || "—";
              else if (f.key === "country_code") val = client?.countryCode || "—";
              else if (f.key === "country") val = client?.country || "—";
              else if (f.key === "time_slot") val = "8AM – 8PM";
              else if (f.key === "comment") val = "";
              else if (f.key === "status") val = log.status || "—";
              else if (f.key === "process") val = log.process || "—";
              else val = "—";
            }
            return {
              key: f.key,
              label: f.label,
              value: val,
              type: f.inputType === "select" ? "dropdown" : f.inputType,
              isClickable: f.key === "client_name",
              isAvatar: f.key === "responsible"
            };
          });
        return (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0"
              style={{ backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 500 }}
              onClick={() => setShowViewDrawer(false)}
            />
            {/* Right Side Drawer - FIX 4: pointer-events: none when Team Member drawer is open */}
            <div
              className="fixed top-0 right-0 bottom-0"
              style={{ zIndex: 501, pointerEvents: showTeamMemberDrawer ? 'none' : 'auto' }}
            >
              <div
                className="flex flex-col bg-white"
                style={{
                  width: '600px',
                  height: '100vh',
                  borderRadius: '16px 0 0 16px',
                  boxShadow: '-8px 0 40px rgba(0,0,0,0.18)',
                  animation: 'slideInDrawer 300ms ease-out',
                  overflow: 'hidden',
                  pointerEvents: 'auto',
                }}
              >
                <style>{`
                  @keyframes slideInDrawer {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                  }
                `}</style>

                {/* Header */}
                <div className="flex-shrink-0 px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold" style={{ color: '#212121', fontFamily: 'DM Sans, sans-serif' }}>{log.client}</h2>
                    <button
                      onClick={() => setShowViewDrawer(false)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* Stage Pipeline - Rectangular Chips (FIX 3: uses drawerStageIdx state) */}
                <div className="flex-shrink-0 px-6 py-4" style={{ backgroundColor: '#F5F7FA' }}>
                  <div className="flex items-center gap-0">
                    {dealStageLabels.map((label, i) => {
                      const idx = i + 1;
                      const isCompleted = idx < drawerStageIdx;
                      const isActive = idx === drawerStageIdx;
                      const isFirst = i === 0;
                      const isLast = i === dealStageLabels.length - 1;

                      return (
                        <button
                          key={label}
                          onClick={() => {
                            setDrawerStageIdx(idx);
                            const newStage = getDealStageFromIndex(idx);
                            toast.success(`Stage updated to ${label} ✓`);
                            // Update the callLogs to reflect the stage change
                            setCallLogs(prev => prev.map(l => l.id === log.id
                              ? { ...l, currentStage: newStage }
                              : l
                            ));
                            // Optimistic: also sync deals list
                            setDeals(allDeals => allDeals.map(d => d.clientName === log.client
                              ? { ...d, stage: newStage }
                              : d
                            ));
                            // Simulate API — revert on failure (mock always succeeds)
                            setTimeout(() => {
                              // noop — would revert here on real API failure
                            }, 500);
                          }}
                          className="flex-1 flex items-center justify-center transition-all hover:opacity-90"
                          style={{
                            height: '40px',
                            backgroundColor: (isCompleted || isActive) ? '#1E88E5' : 'transparent',
                            color: (isCompleted || isActive) ? '#FFFFFF' : '#9E9E9E',
                            fontSize: '13px',
                            fontWeight: isActive ? 600 : 500,
                            fontFamily: 'Outfit, sans-serif',
                            borderRadius: isFirst ? '8px 0 0 8px' : isLast ? '0 8px 8px 0' : '0',
                            border: (isCompleted || isActive) ? 'none' : '1px solid #E8ECF0',
                            cursor: 'pointer',
                          }}
                        >
                          {isCompleted && '✓ '}{label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex-shrink-0 flex border-b border-gray-200 px-6">
                  {(["general", "history"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setViewDrawerTab(tab)}
                      className="py-3 mr-6 text-sm font-medium transition-colors"
                      style={{
                        color: viewDrawerTab === tab ? '#1E88E5' : '#9E9E9E',
                        borderBottom: viewDrawerTab === tab ? '2px solid #1E88E5' : '2px solid transparent',
                        fontFamily: 'Outfit, sans-serif',
                      }}
                    >
                      {tab === "general" ? "General Information" : "History"}
                    </button>
                  ))}
                </div>

                {/* Tab content — scrollable */}
                <div className="flex-1 overflow-y-auto">
                  {viewDrawerTab === "general" && (
                    <div>
                      {fields.map((f, i) => {
                        const currentValue = f.value;
                        const isEditing = editingField === f.key;

                        const handleFieldSave = (val: string) => {
                          setEditingField(null);
                          setEditedValues(prev => ({ ...prev, [f.key]: val }));
                          setCallLogs(prevLogs => prevLogs.map(l => {
                            if (l.id === log.id) {
                              const updated = {
                                ...l,
                                [f.key]: val,
                                visibleFieldKeys: drawerVisibleFields
                              };
                              return updated;
                            }
                            return l;
                          }));
                          toast.success("Saved ✓", { duration: 2000 });
                        };

                        return (
                          <div
                            key={f.key}
                            className="flex items-center px-6"
                            style={{
                              height: '44px',
                              backgroundColor: i % 2 === 0 ? '#fff' : '#FAFAFA',
                              borderBottom: '1px solid #F0F0F0',
                            }}
                          >
                            <div style={{ width: '35%', fontSize: '13px', color: '#757575', fontFamily: 'Outfit, sans-serif' }}>{f.label}</div>
                            <div style={{ width: '65%', fontSize: '14px', color: '#212121', fontFamily: 'DM Sans, sans-serif' }}>
                              {/* Client Name */}
                              {f.key === "client_name" ? (
                                <span
                                  className="text-blue-600 text-left font-medium"
                                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                                >
                                  {currentValue}
                                </span>
                              ) : /* Responsible */
                                f.key === "responsible" ? (
                                  <div className="flex items-center gap-2 relative">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700">
                                      {(currentValue as string).charAt(0)}
                                    </div>
                                    <button
                                      onClick={() => {
                                        const member = teamMembersData.find(m => m.name === currentValue);
                                        setSelectedTeamMember(member || { name: currentValue as string, role: "Team Member", email: "", phone: "" });
                                        setShowTeamMemberDrawer(true);
                                      }}
                                      className="hover:text-blue-600 hover:underline transition-colors"
                                      style={{ fontFamily: 'DM Sans, sans-serif' }}
                                    >
                                      <span>{currentValue}</span>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowResponsibleDropdownInDrawer(!showResponsibleDropdownInDrawer);
                                      }}
                                      className="hover:bg-gray-100 rounded p-0.5 transition-colors"
                                    >
                                      <ChevronDown className="w-3 h-3 text-gray-400" />
                                    </button>
                                    {showResponsibleDropdownInDrawer && (
                                      <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowResponsibleDropdownInDrawer(false)} />
                                        <div className="absolute left-0 top-full mt-1 z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-2 w-56">
                                          {["John Smith", "Emily Davis", "Michael Chen", "Sarah Johnson", "Robert Wilson"].map((person) => (
                                            <button
                                              key={person}
                                              onClick={() => {
                                                handleFieldSave(person);
                                                setShowResponsibleDropdownInDrawer(false);
                                              }}
                                              className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center gap-2"
                                            >
                                              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700">
                                                {person.charAt(0)}
                                              </div>
                                              <div className="flex flex-col">
                                                <span className="text-sm font-medium">{person}</span>
                                                <span className="text-xs text-gray-500">Team Member</span>
                                              </div>
                                            </button>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ) : /* Select Fields */
                                f.type === "dropdown" ? (
                                  <select
                                    value={currentValue}
                                    onChange={(e) => handleFieldSave(e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded-lg hover:border-blue-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                    style={{ fontFamily: 'DM Sans, sans-serif', backgroundColor: 'white' }}
                                  >
                                    {f.key === "deal_type" && (
                                      <>
                                        <option>Organic</option>
                                        <option>Paid</option>
                                        <option>Referral</option>
                                        <option>Web</option>
                                      </>
                                    )}
                                    {f.key === "country_code" && (
                                      <>
                                        <option>+1</option>
                                        <option>+44</option>
                                        <option>+91</option>
                                        <option>+971</option>
                                      </>
                                    )}
                                    {f.key === "country" && (
                                      <>
                                        <option>US</option>
                                        <option>GB</option>
                                        <option>IN</option>
                                        <option>AE</option>
                                      </>
                                    )}
                                    {f.key === "time_slot" && (
                                      <>
                                        <option>8AM – 8PM</option>
                                        <option>9AM – 5PM</option>
                                        <option>10AM – 6PM</option>
                                        <option>24/7</option>
                                      </>
                                    )}
                                    {f.key !== "deal_type" && f.key !== "country_code" && f.key !== "country" && f.key !== "time_slot" && (
                                      <>
                                        <option value="">Select option</option>
                                        <option value="Option 1">Option 1</option>
                                        <option value="Option 2">Option 2</option>
                                      </>
                                    )}
                                  </select>
                                ) : /* Date fields */
                                f.type === "date" ? (
                                  <input
                                    type="date"
                                    value={currentValue ? (() => { const d = new Date(currentValue); return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0]; })() : ''}
                                    onChange={(e) => {
                                      const d = new Date(e.target.value);
                                      const formatted = e.target.value && !isNaN(d.getTime()) ? d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : '';
                                      handleFieldSave(formatted);
                                    }}
                                    className="px-2 py-1 border border-gray-300 rounded-lg hover:border-blue-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                                  />
                                ) : /* Text Fields (inline editable) */
                                isEditing ? (
                                  <input
                                    type="text"
                                    value={currentValue}
                                    onChange={(e) => setEditedValues({ ...editedValues, [f.key]: e.target.value })}
                                    onBlur={(e) => handleFieldSave(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleFieldSave(e.currentTarget.value);
                                      }
                                    }}
                                    autoFocus
                                    className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                                  />
                                ) : (
                                  <div
                                    onClick={() => setEditingField(f.key)}
                                    className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                  >
                                    {currentValue || '—'}
                                  </div>
                                )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Select Fields + Create Field grouped together */}
                      <div style={{ borderTop: '1px solid #F0F0F0' }}>
                        <div className="flex items-center px-6" style={{ height: '44px', gap: '8px' }}>
                          <button
                            onClick={() => {
                              setFieldManagerMode("select");
                              setFieldManagerOpen(true);
                            }}
                            className="flex items-center gap-2 transition-colors cursor-pointer group"
                            style={{ color: '#9E9E9E', fontSize: '13px', fontFamily: 'Outfit, sans-serif' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#1E88E5')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#9E9E9E')}
                          >
                            <SettingsIcon className="w-3.5 h-3.5" /> Select fields
                          </button>
                          <button
                            onClick={() => {
                              setFieldManagerMode("create");
                              setFieldManagerOpen(true);
                            }}
                            className="flex items-center gap-2 transition-colors cursor-pointer"
                            style={{ color: '#9E9E9E', fontSize: '13px', fontFamily: 'Outfit, sans-serif' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#1E88E5')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#9E9E9E')}
                          >
                            + Create field
                          </button>
                        </div>
                      </div>

                      {fieldManagerOpen && fieldManagerMode === "select" && (
                        <SelectFieldsModal
                          onlyModules={["process", "client"]}
                          initiallySelected={drawerVisibleFields}
                          onClose={() => setFieldManagerOpen(false)}
                          onApply={(keys) => {
                            setDrawerVisibleFields(keys);
                            setCallLogs(prevLogs => prevLogs.map(l => {
                              if (l.id === log.id) {
                                return {
                                  ...l,
                                  visibleFieldKeys: keys
                                };
                              }
                              return l;
                            }));
                          }}
                        />
                      )}

                      {fieldManagerOpen && fieldManagerMode === "create" && (
                        <CreateFieldModal
                          lockModule="process"
                          onClose={() => setFieldManagerOpen(false)}
                          onCreated={(newField) => {
                            setDrawerVisibleFields(prev => {
                              const keys = [...prev, newField.key];
                              setCallLogs(prevLogs => prevLogs.map(l => {
                                if (l.id === log.id) {
                                  return {
                                    ...l,
                                    visibleFieldKeys: keys
                                  };
                                }
                                return l;
                              }));
                              return keys;
                            });
                          }}
                        />
                      )}
                    </div>
                  )}

                  {viewDrawerTab === "history" && (() => {
                    return (
                      <div>
                        {/* FIX 3: Search bar + Filter icon */}
                        <div className="flex items-center gap-2 px-4 py-3 relative">
                          <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search history..."
                              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-blue-500"
                              style={{ fontFamily: 'Outfit, sans-serif', borderColor: '#E0E0E0', borderRadius: '8px', height: '36px' }}
                            />
                          </div>
                          <div className="relative">
                            <button
                              onClick={() => setShowHistoryFilterPopup(!showHistoryFilterPopup)}
                              className="w-9 h-9 flex items-center justify-center border rounded-lg transition-colors hover:bg-[#F0F4FF]"
                              style={{ borderColor: '#E0E0E0', borderRadius: '8px' }}
                            >
                              <Filter className="w-[18px] h-[18px] text-[#757575]" style={{ color: showHistoryFilterPopup ? '#1E88E5' : '#757575' }} />
                            </button>
                            {historyFiltersActive && (
                              <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-blue-500" />
                            )}
                          </div>
                          {showHistoryFilterPopup && (
                            <>
                              <div className="fixed inset-0" style={{ zIndex: 590 }} onClick={() => setShowHistoryFilterPopup(false)} />
                              <div className="absolute right-0 bg-white border border-gray-200" style={{ zIndex: 600, width: '600px', top: 'calc(100% + 4px)', borderRadius: '8px' }}>
                                {/* Two Column Layout */}
                                <div className="flex">
                                  {/* Left Column - Quick Filters */}
                                  <div className="flex flex-col border-r border-gray-200" style={{ width: '180px' }}>
                                    <div className="p-4 border-b border-gray-200">
                                      <p className="font-bold text-sm" style={{ color: '#212121', fontFamily: 'DM Sans, sans-serif' }}>Filter</p>
                                    </div>
                                    <div className="flex-1 p-2">
                                      <div className="space-y-0.5">
                                        {["Created by me", "Created Today", "Created Yesterday"].map(q => (
                                          <button
                                            key={q}
                                            onClick={() => setHistoryQuickFilter(historyQuickFilter === q ? null : q)}
                                            className="block w-full text-left px-3 py-2 rounded text-sm transition-colors"
                                            style={{
                                              fontFamily: 'Outfit, sans-serif',
                                              backgroundColor: historyQuickFilter === q ? '#EBF4FF' : 'transparent',
                                              color: historyQuickFilter === q ? '#1E88E5' : '#424242'
                                            }}
                                          >{q}</button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="p-3 border-t border-gray-200">
                                      <button className="flex items-center gap-2 text-xs text-blue-500 hover:text-blue-600" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                        <Plus className="w-3.5 h-3.5" />
                                        Save filter
                                        <SettingsIcon className="w-3.5 h-3.5 ml-auto" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Right Column - Filter Fields */}
                                  <div className="flex-1 flex flex-col">
                                    <div className="flex-1 p-4 space-y-3 max-h-[400px] overflow-y-auto">
                                      {/* Event Type */}
                                      {activeFilterFields.includes("Event Type") && (
                                        <div>
                                          <p className="text-xs font-semibold mb-1.5" style={{ color: '#9E9E9E', fontFamily: 'Outfit, sans-serif' }}>Event Type</p>
                                          <select
                                            value={historyEventTypeFilter}
                                            onChange={e => setHistoryEventTypeFilter(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                                            style={{ fontFamily: 'Outfit, sans-serif' }}
                                          >
                                            {["Not specified", "View", "Stage changed", "Activity created"].map(o => <option key={o}>{o}</option>)}
                                          </select>
                                        </div>
                                      )}

                                      {/* Created By */}
                                      {activeFilterFields.includes("Created By") && (
                                        <div>
                                          <p className="text-xs font-semibold mb-1.5" style={{ color: '#9E9E9E', fontFamily: 'Outfit, sans-serif' }}>Created By</p>
                                          <input
                                            type="text"
                                            value={historyCreatedByFilter}
                                            onChange={e => setHistoryCreatedByFilter(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                                            style={{ fontFamily: 'Outfit, sans-serif' }}
                                            placeholder="Enter name..."
                                          />
                                        </div>
                                      )}

                                      {/* Date */}
                                      {activeFilterFields.includes("Date") && (
                                        <div>
                                          <p className="text-xs font-semibold mb-1.5" style={{ color: '#9E9E9E', fontFamily: 'Outfit, sans-serif' }}>Date</p>
                                          <select
                                            value={historyDateFilter}
                                            onChange={e => setHistoryDateFilter(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                                            style={{ fontFamily: 'Outfit, sans-serif' }}
                                          >
                                            {["Any date", "Today", "Yesterday", "Last 7 days", "Last 30 days", "Custom range"].map(o => <option key={o}>{o}</option>)}
                                          </select>
                                        </div>
                                      )}

                                      {/* Stage */}
                                      {activeFilterFields.includes("Stage") && (
                                        <div>
                                          <p className="text-xs font-semibold mb-1.5" style={{ color: '#9E9E9E', fontFamily: 'Outfit, sans-serif' }}>Stage</p>
                                          <select
                                            className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                                            style={{ fontFamily: 'Outfit, sans-serif' }}
                                          >
                                            <option>Not specified</option>
                                            <option>Initial Contact</option>
                                            <option>Qualification</option>
                                            <option>Proposal</option>
                                          </select>
                                        </div>
                                      )}

                                      {/* Responsible */}
                                      {activeFilterFields.includes("Responsible") && (
                                        <div>
                                          <p className="text-xs font-semibold mb-1.5" style={{ color: '#9E9E9E', fontFamily: 'Outfit, sans-serif' }}>Responsible</p>
                                          <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                                            style={{ fontFamily: 'Outfit, sans-serif' }}
                                            placeholder="Enter name..."
                                          />
                                        </div>
                                      )}
                                    </div>

                                    {/* Add field / Restore default */}
                                    <div className="px-4 py-2 border-t border-gray-200 flex items-center gap-3">
                                      <button
                                        onClick={() => setShowAddFieldPopup(true)}
                                        className="text-xs text-blue-500 hover:text-blue-600"
                                        style={{ fontFamily: 'Outfit, sans-serif' }}
                                      >
                                        Add field
                                      </button>
                                      <button
                                        onClick={() => {
                                          setActiveFilterFields(["Event Type", "Created By", "Date"]);
                                          setHistoryEventTypeFilter("Not specified");
                                          setHistoryCreatedByFilter("");
                                          setHistoryDateFilter("Any date");
                                        }}
                                        className="text-xs text-gray-400 hover:text-gray-600"
                                        style={{ fontFamily: 'Outfit, sans-serif' }}
                                      >
                                        Restore default fields
                                      </button>
                                    </div>

                                    {/* Footer - Search and Reset */}
                                    <div className="p-4 border-t border-gray-200 flex gap-2">
                                      <button
                                        onClick={() => {
                                          setHistoryFiltersActive(historyQuickFilter !== null || historyEventTypeFilter !== "Not specified" || !!historyCreatedByFilter || historyDateFilter !== "Any date");
                                          setShowHistoryFilterPopup(false);
                                        }}
                                        className="px-4 py-2 rounded text-sm font-medium text-white flex items-center justify-center gap-1.5"
                                        style={{ backgroundColor: '#1E88E5', fontFamily: 'Outfit, sans-serif' }}
                                      >
                                        <Search className="w-3.5 h-3.5" /> Search
                                      </button>
                                      <button
                                        onClick={() => {
                                          setHistoryEventTypeFilter("Not specified");
                                          setHistoryCreatedByFilter("");
                                          setHistoryDateFilter("Any date");
                                          setHistoryQuickFilter(null);
                                          setHistoryFiltersActive(false);
                                          setShowHistoryFilterPopup(false);
                                          setActiveFilterFields(["Event Type", "Created By", "Date"]);
                                        }}
                                        className="px-4 py-2 rounded text-sm font-medium border border-gray-300 hover:bg-gray-50"
                                        style={{ color: '#757575', fontFamily: 'Outfit, sans-serif' }}
                                      >
                                        Reset
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Add Field Sub-Popup */}
                                {showAddFieldPopup && (
                                  <>
                                    <div
                                      className="absolute inset-0 bg-black/20"
                                      style={{ zIndex: 610, borderRadius: '8px' }}
                                      onClick={() => setShowAddFieldPopup(false)}
                                    />
                                    <div
                                      className="absolute bg-white border border-gray-300 shadow-lg"
                                      style={{
                                        zIndex: 620,
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        width: '320px',
                                        borderRadius: '8px'
                                      }}
                                    >
                                      <div className="p-4 border-b border-gray-200">
                                        <div className="flex items-center justify-between">
                                          <p className="font-bold text-sm" style={{ color: '#212121', fontFamily: 'DM Sans, sans-serif' }}>Filter field settings</p>
                                          <button onClick={() => setShowAddFieldPopup(false)} className="text-gray-400 hover:text-gray-600">
                                            <X className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                      <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
                                        {["Event Type", "Created By", "Date", "Stage", "Responsible"].map(field => (
                                          <label key={field} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                            <input
                                              type="checkbox"
                                              checked={selectedAddFields.includes(field)}
                                              onChange={(e) => {
                                                if (e.target.checked) {
                                                  setSelectedAddFields([...selectedAddFields, field]);
                                                } else {
                                                  setSelectedAddFields(selectedAddFields.filter(f => f !== field));
                                                }
                                              }}
                                              className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                                            />
                                            <span className="text-sm" style={{ fontFamily: 'Outfit, sans-serif', color: '#424242' }}>{field}</span>
                                          </label>
                                        ))}
                                      </div>
                                      <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                                        <button
                                          onClick={() => setSelectedAddFields(["Event Type", "Created By", "Date", "Stage", "Responsible"])}
                                          className="text-sm text-blue-500 hover:text-blue-600"
                                          style={{ fontFamily: 'Outfit, sans-serif' }}
                                        >
                                          Select all
                                        </button>
                                        <button
                                          onClick={() => {
                                            setSelectedAddFields(["Event Type", "Created By", "Date"]);
                                            setActiveFilterFields(["Event Type", "Created By", "Date"]);
                                            setShowAddFieldPopup(false);
                                          }}
                                          className="text-sm text-gray-500 hover:text-gray-700"
                                          style={{ fontFamily: 'Outfit, sans-serif' }}
                                        >
                                          Default
                                        </button>
                                      </div>
                                      <div className="p-3 border-t border-gray-200">
                                        <button
                                          onClick={() => {
                                            setActiveFilterFields([...selectedAddFields]);
                                            setShowAddFieldPopup(false);
                                          }}
                                          className="w-full py-2 rounded text-sm font-medium text-white"
                                          style={{ backgroundColor: '#1E88E5', fontFamily: 'Outfit, sans-serif' }}
                                        >
                                          Apply
                                        </button>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                        <table className="w-full">
                          <thead>
                            <tr style={{ backgroundColor: '#1A2B4A', height: '44px' }}>
                              <th style={{ width: '40px' }} className="px-4">
                                <input type="checkbox" className="w-4 h-4" />
                              </th>
                              <th className="px-4 text-left text-xs font-semibold uppercase tracking-wider text-white" style={{ width: '110px' }}>Date</th>
                              <th className="px-4 text-left text-xs font-semibold uppercase tracking-wider text-white" style={{ width: '70px' }}>Time</th>
                              <th className="px-4 text-left text-xs font-semibold uppercase tracking-wider text-white" style={{ width: '150px' }}>Created By</th>
                              <th className="px-4 text-left text-xs font-semibold uppercase tracking-wider text-white" style={{ width: '150px' }}>Event Type</th>
                              <th className="px-4 text-left text-xs font-semibold uppercase tracking-wider text-white">Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredHistory.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="text-center py-10 text-gray-400 italic text-sm">
                                  {historyFiltersActive ? "No results found" : "No history available yet"}
                                </td>
                              </tr>
                            ) : filteredHistory.map((h, i) => (
                              <tr
                                key={i}
                                style={{
                                  height: '40px',
                                  backgroundColor: i % 2 === 0 ? '#fff' : '#FAFAFA',
                                  borderBottom: '1px solid #EEEEEE',
                                }}
                                className="hover:bg-[#F5F8FF] transition-colors"
                              >
                                <td className="px-4">
                                  <input type="checkbox" className="w-4 h-4" />
                                </td>
                                <td className="px-4 text-xs" style={{ color: '#757575', fontFamily: 'Outfit, sans-serif' }}>
                                  {h.date.split(' ')[0]}
                                </td>
                                <td className="px-4 text-xs" style={{ color: '#757575', fontFamily: 'Outfit, sans-serif' }}>
                                  {h.date.split(' ')[1]}
                                </td>
                                <td className="px-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                                      {h.createdBy.charAt(0)}
                                    </div>
                                    <span className="text-sm" style={{ fontFamily: 'DM Sans, sans-serif', color: '#212121' }}>
                                      {h.createdBy}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 text-sm" style={{
                                  fontFamily: 'Outfit, sans-serif',
                                  color: h.eventType === 'View' ? '#9E9E9E' : h.eventType === 'Stage changed' ? '#1E88E5' : '#2E7D32',
                                }}>
                                  {h.eventType}
                                </td>
                                <td className="px-4 text-sm" style={{ fontFamily: 'DM Sans, sans-serif', color: '#424242' }}>
                                  {h.description}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </>
        );
      })()}

      <HowItWorksModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="How Process Works"
        summary="Process is your pipeline view. Track every client's journey from first contact to closed deal, across whichever processes your team runs."
        bullets={[
          "Switch between table and Kanban views",
          "Drag clients between stages in Kanban view",
          "Filter by process, stage, status, or responsible person",
          "Bulk-trigger calls or move multiple clients at once",
        ]}
        guideUrl="/guide/deals"
      />
    </div>
  );
}
