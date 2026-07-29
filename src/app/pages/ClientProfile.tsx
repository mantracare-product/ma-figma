import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import {
  Search, Plus, X, FileText, Calendar, ChevronLeft, Mail, MapPin, Clock,
  MessageSquare, MessageCircle, LogIn, ArrowRightCircle, PhoneOutgoing, PhoneIncoming, PhoneOff, Settings, CalendarClock,
  Play, ChevronDown, Download, ArrowLeft, Check, Globe
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Tooltip } from "../components/ui/Tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { toast } from "sonner";
import { Form, INITIAL_FORMS } from "../../data/forms";
import { loadClientSubmissions } from "../../data/submissionsStore";
import { INITIAL_FLOWS, IntakeFlow, FlowStep } from "../../data/intakeFlows";
import { useFieldRegistry, FieldDefinition, resolveVisibility } from "../context/FieldRegistryContext";
import { SelectFieldsModal, CreateFieldModal } from "../components/help/FieldManager";
import { CLIENTS_STORE_EVENT, ClientProcessStage } from "../../lib/clientProcessState";
import { getActivityForClient } from "../../lib/activityLog";
import { getStoredCallLogs } from "../../lib/processLogsStore";

const HARDCODED_KEYS = new Set(["name", "email", "phone", "status", "processes", "company", "role", "location", "country"]);

const CHRONO_RANK: Record<string, number> = {
  process_entry: 0,
  whatsapp: 1,
  sms: 1,
  email: 1,
  webhook_trigger: 1,
  field_update: 1,
  appointment_booked: 1,
  call: 2,
  outbound_call: 2,
  inbound_call: 2,
  failed_call: 2,
  stage_update: 3,
  stage_change: 3,
  process_completed: 4,
};

const ACTIVITY_ICON_BG: Record<string, string> = {
  process_entry: "#EFF6FF",
  call: "#DBEAFE",
  whatsapp: "#DCFCE7",
  sms: "#E0E7FF",
  email: "#FEF3C7",
  stage_update: "#F3E8FF",
  stage_change: "#F3E8FF",
  webhook_trigger: "#FFE4E6",
  appointment_booked: "#CFFAFE",
  field_update: "#F1F5F9",
  process_completed: "#DCFCE7",
  website_message: "#F3E8FF",
  website: "#F3E8FF",
  outbound_call: "#DBEAFE",
  inbound_call: "#DBEAFE",
  failed_call: "#FEE2E2",
};

const HEADING_BY_TYPE: Record<string, string> = {
  process_entry: "Process Entered",
  stage_update: "Stage Updated",
  stage_change: "Stage Changed",
  call: "Outbound Call Triggered",
  outbound_call: "Outbound Call Completed",
  inbound_call: "Inbound Call Received",
  failed_call: "Outbound Call Failed",
  whatsapp: "WhatsApp Message Triggered",
  sms: "SMS Triggered",
  email: "Email Triggered",
  webhook_trigger: "Webhook Triggered",
  field_update: "Field Updated",
  appointment_booked: "Appointment Booked",
  process_completed: "Process Completed",
  website_message: "Website Message Received",
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Client {
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

// ─── Data ─────────────────────────────────────────────────────────────────────

export const initialClients: Client[] = [
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
  { id: "CL-023", name: "Ahmed Al-Mansoori", email: "ahmed.am@email.com", phone: "501234567", country: "AE", countryCode: "+971", countryFlag: "🇦🇪", processes: ["Patient Intake", "Insurance Verification"], stage: "Insurance Verification", responsible: "David Martinez", lastContact: "2024-04-13", status: "Active", location: "Dubai, UAE" },
  { id: "CL-024", name: "Fatima Hassan", email: "fatima.h@email.com", phone: "502345678", country: "AE", countryCode: "+971", countryFlag: "🇦🇪", processes: ["Follow-up Calls", "Billing Support"], stage: "Billing Inquiry", responsible: "Amanda Taylor", lastContact: "2024-04-10", status: "Active", location: "Abu Dhabi, UAE" },
  { id: "CL-025", name: "Omar Al-Rashid", email: "omar.ar@email.com", phone: "503456789", country: "AE", countryCode: "+971", countryFlag: "🇦🇪", processes: ["Appointment Scheduling"], stage: "Slot Selection", responsible: "John Smith", lastContact: "2024-04-11", status: "Active", location: "Sharjah, UAE" },
  { id: "CL-026", name: "Layla Khalifa", email: "layla.k@email.com", phone: "504567890", country: "AE", countryCode: "+971", countryFlag: "🇦🇪", processes: ["Patient Intake"], stage: "Initial Contact", responsible: "Sarah Johnson", lastContact: "2024-03-20", status: "Inactive", location: "Ajman, UAE" },
  { id: "CL-027", name: "Youssef Said", email: "youssef.s@email.com", phone: "505678901", country: "AE", countryCode: "+971", countryFlag: "🇦🇪", processes: ["Follow-up Calls", "Patient Intake", "Billing Support"], stage: "Follow-up", responsible: "Michael Chen", lastContact: "2024-04-12", status: "Active", location: "Dubai, UAE" },
  { id: "CL-028", name: "Oliver Thompson", email: "oliver.t@email.com", phone: "7412345678", country: "GB", countryCode: "+44", countryFlag: "🇬🇧", processes: ["Patient Intake", "Follow-up Calls"], stage: "Schedule Appointment", responsible: "Emily Davis", lastContact: "2024-04-09", status: "Active", location: "London, UK" },
  { id: "CL-029", name: "Charlotte Evans", email: "charlotte.e@email.com", phone: "7423456789", country: "GB", countryCode: "+44", countryFlag: "🇬🇧", processes: ["Insurance Verification"], stage: "Approval", responsible: "Robert Wilson", lastContact: "2024-04-13", status: "Active", location: "Manchester, UK" },
  { id: "CL-030", name: "William Davies", email: "william.d@email.com", phone: "7434567890", country: "GB", countryCode: "+44", countryFlag: "🇬🇧", processes: ["Billing Support", "Follow-up Calls"], stage: "Payment Reminder", responsible: "Jessica Brown", lastContact: "2024-03-18", status: "Inactive", location: "Birmingham, UK" },
];

const processStages: { [key: string]: string[] } = {
  "Patient Intake": ["Initial Contact", "Insurance Verify", "Schedule Appt", "Appointment"],
  "Follow-up Calls": ["Initial Contact", "Appointment", "Completed"],
  "Billing Support": ["Initial Contact", "Billing Inquiry", "Issue Resolution", "Payment Reminder"],
  "Appointment Scheduling": ["Initial Contact", "Slot Selection", "Confirmation", "Completed"],
  "Insurance Verification": ["Initial Contact", "Document Check", "Verification", "Approval"],
};

const availableProcesses = [
  "Patient Intake",
  "Follow-up Calls",
  "Billing Support",
  "Appointment Scheduling",
  "Insurance Verification",
];

const getStagesForProcess = (processName: string) => {
  const stageMapping: { [key: string]: Array<{ id: string; label: string; fullLabel?: string; category: string }> } = {
    "Patient Intake": [
      { id: "1", label: "Initial Contact", fullLabel: "Patient Intake: Initial Contact", category: "Patient Intake" },
      { id: "2", label: "Insurance Verification", fullLabel: "Patient Intake: Insurance Verification", category: "Patient Intake" },
      { id: "3", label: "Appointment Scheduled", fullLabel: "Patient Intake: Appointment Scheduled", category: "Patient Intake" },
      { id: "4", label: "Completed", fullLabel: "Patient Intake: Completed", category: "Patient Intake" },
    ],
    "Follow-up Calls": [
      { id: "1", label: "Initial Contact", fullLabel: "Follow-up Calls: Initial Contact", category: "Follow-up Calls" },
      { id: "2", label: "Post-Visit Check", fullLabel: "Follow-up Calls: Post-Visit Check", category: "Follow-up Calls" },
      { id: "3", label: "Medication Reminder", fullLabel: "Follow-up Calls: Medication Reminder", category: "Follow-up Calls" },
      { id: "4", label: "Completed", fullLabel: "Follow-up Calls: Completed", category: "Follow-up Calls" },
    ],
    "Billing Support": [
      { id: "1", label: "Initial Contact", fullLabel: "Billing Support: Initial Contact", category: "Billing Support" },
      { id: "2", label: "Billing Inquiry", fullLabel: "Billing Support: Billing Inquiry", category: "Billing Support" },
      { id: "3", label: "Issue Resolution", fullLabel: "Billing Support: Issue Resolution", category: "Billing Support" },
      { id: "4", label: "Payment Reminder", fullLabel: "Billing Support: Payment Reminder", category: "Billing Support" },
    ],
    "Appointment Scheduling": [
      { id: "1", label: "Initial Contact", fullLabel: "Appointment Scheduling: Initial Contact", category: "Appointment Scheduling" },
      { id: "2", label: "Slot Selection", fullLabel: "Appointment Scheduling: Slot Selection", category: "Appointment Scheduling" },
      { id: "3", label: "Confirmation", fullLabel: "Appointment Scheduling: Confirmation", category: "Appointment Scheduling" },
      { id: "4", label: "Completed", fullLabel: "Appointment Scheduling: Completed", category: "Appointment Scheduling" },
    ],
    "Insurance Verification": [
      { id: "1", label: "Initial Contact", fullLabel: "Insurance Verification: Initial Contact", category: "Insurance Verification" },
      { id: "2", label: "Document Check", fullLabel: "Insurance Verification: Document Check", category: "Insurance Verification" },
      { id: "3", label: "Verification", fullLabel: "Insurance Verification: Verification", category: "Insurance Verification" },
      { id: "4", label: "Approval", fullLabel: "Insurance Verification: Approval", category: "Insurance Verification" },
    ],
  };
  return stageMapping[processName] || stageMapping["Patient Intake"];
};

const combinedStages = [
  "Patient Intake: Initial Contact",
  "Patient Intake: Insurance Verify",
  "Patient Intake: Schedule Appointment",
  "Follow-up Calls: Post-Visit Check",
  "Follow-up Calls: Medication Reminder",
  "Billing Support: Initial Contact",
  "Billing Support: Billing Inquiry",
  "Billing Support: Issue Resolution",
  "Billing Support: Payment Reminder",
  "Appointment Scheduling: Initial Contact",
  "Appointment Scheduling: Slot Selection",
  "Appointment Scheduling: Confirmation",
  "Insurance Verification: Initial Contact",
  "Insurance Verification: Document Check",
  "Insurance Verification: Verification",
];

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

const getProcessFromDealStage = (stage: string): string => {
  const parts = stage.split(":");
  const mainStage = parts[0].trim();
  const subStage = parts.length > 1 ? parts[1].trim() : "";

  const standardProcesses = ["Patient Intake", "Follow-up Calls", "Billing Support", "Appointment Scheduling", "Insurance Verification"];
  if (standardProcesses.includes(mainStage)) {
    return mainStage;
  }
  if (mainStage === "Payment Reminder") {
    return "Billing Support";
  }

  const subStageMap: Record<string, string> = {
    'Initial Contact': 'Patient Intake',
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
  if (subStage && subStageMap[subStage]) {
    return subStageMap[subStage];
  }
  if (subStageMap[mainStage]) {
    return subStageMap[mainStage];
  }
  return mainStage;
};

// ─── Main Component ───────────────────────────────────────────────────────────


interface ClientProfileProps {
  clientIdProp?: string;
  onCloseOverride?: () => void;
  initialOpenState?: { openFormsTab: boolean; formId: number; submissionDate?: string };
}

export default function ClientProfile({ clientIdProp, onCloseOverride, initialOpenState }: ClientProfileProps = {}) {
  const { id: routeId } = useParams<{ id: string }>();
  const id = clientIdProp ?? routeId;
  const navigate = useNavigate();
  const location = useLocation();

  // Clients list — backed by sessionStorage so WebForms can read updated client data
  const [clients, setClients] = useState<Client[]>(() => {
    try {
      const saved = sessionStorage.getItem("clients");
      return saved ? JSON.parse(saved) : initialClients;
    } catch {
      return initialClients;
    }
  });
  const client = clients.find((c) => c.id === id) ?? null;

  // Persist any client mutations back to sessionStorage
  useEffect(() => {
    sessionStorage.setItem("clients", JSON.stringify(clients));
  }, [clients]);

  // Live-sync: pick up clients written by TestProcessChatDrawer or other tabs
  useEffect(() => {
    const handler = () => {
      try {
        const saved = sessionStorage.getItem("clients");
        if (saved) setClients(JSON.parse(saved));
      } catch { }
    };
    window.addEventListener(CLIENTS_STORE_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(CLIENTS_STORE_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  // Custom field definitions from shared context (same ones Settings.tsx manages)
  const { getAllFields, addCustomField } = useFieldRegistry();

  const handleClose = () => {
    if (onCloseOverride) onCloseOverride();
    else navigate("/clients");
  };

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientRole, setClientRole] = useState("");
  const [clientStatus, setClientStatus] = useState("");
  const [clientLocation, setClientLocation] = useState("");
  const [clientCountry, setClientCountry] = useState("");
  const [visibleFieldKeys, setVisibleFieldKeys] = useState<string[]>([]);
  const [dynamicFieldValues, setDynamicFieldValues] = useState<Record<string, string>>({});
  const [fieldManagerMode, setFieldManagerMode] = useState<"select" | "create">("select");
  const [fieldManagerOpen, setFieldManagerOpen] = useState(false);

  const handleSaveChanges = () => {
    if (!client) return;
    const updatedClient: Client = {
      ...client,
      name: clientName,
      email: clientEmail,
      phone: clientPhone,
      companyName: clientCompany,
      jobPosition: clientRole,
      status: clientStatus,
      processes: selectedProcesses,
      location: clientLocation,
      country: clientCountry,
    };

    (updatedClient as any).visibleFieldKeys = visibleFieldKeys;

    // Save all dynamic fields
    Object.keys(dynamicFieldValues).forEach((key) => {
      (updatedClient as any)[key] = dynamicFieldValues[key];
    });

    setClients((prev) => prev.map((c) => (c.id === client.id ? updatedClient : c)));
    toast.success("Changes saved successfully");
  };

  // All state variables verbatim from Clients.tsx drawer
  const [activeProfileTab, setActiveProfileTab] = useState<"overview" | "processes" | "activity" | "forms" | "notes" | "appointments">("overview");
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
  const [formsTabMode, setFormsTabMode] = useState<"forms" | "flows">("forms");
  const [expandedFlowStepId, setExpandedFlowStepId] = useState<string | null>(null);
  const [expandedFlowId, setExpandedFlowId] = useState<number | null>(null);
  const [expandedFormGroupId, setExpandedFormGroupId] = useState<number | null>(null);
  const [activeProcessTabDrawer, setActiveProcessTabDrawer] = useState<string>("all");
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>(client?.processes ?? []);
  const [editingProcesses, setEditingProcesses] = useState(false);
  const [processDropdownOpen, setProcessDropdownOpen] = useState(false);
  const [drawerProcessStages, setDrawerProcessStages] = useState<Record<string, string>>({});
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);
  const [showFieldPicker, setShowFieldPicker] = useState(false);

  // Sync client profile values and custom field values
  useEffect(() => {
    if (client) {
      setClientName(client.name || "");
      setClientEmail(client.email || "");
      setClientPhone(client.phone || "");
      setClientCompany(client.companyName || "");
      setClientRole(client.jobPosition || "");
      setClientStatus(client.status || "");
      setClientLocation(client.location || "");
      setClientCountry((client as any).country || "");

      const allClientFields = getAllFields("client");

      // Merge: explicitly selected keys  +  any custom field key that should be
      // auto-included based on visibility setting or a stored non-empty value.
      const savedKeys: string[] = (client as any).visibleFieldKeys || [];
      const savedKeySet = new Set(savedKeys);
      const autoKeys: string[] = [];
      allClientFields.forEach(f => {
        if (HARDCODED_KEYS.has(f.key) || savedKeySet.has(f.key)) return;

        const vis = resolveVisibility(f);
        // "all" → always auto-include for every client record
        if (vis === "all") { autoKeys.push(f.key); return; }
        // "specific" → auto-include only if this client's id is in the list
        if (vis === "specific" && f.visibleToRecordIds?.includes(client.id)) {
          autoKeys.push(f.key); return;
        }
        // "none" but field has a stored value (e.g. from a form submission) → still surface it
        const val = (client as any)[f.key];
        if (val !== undefined && val !== null && val !== "") {
          autoKeys.push(f.key);
        }
      });
      const mergedKeys = [...savedKeys, ...autoKeys];
      setVisibleFieldKeys(mergedKeys);

      const values: Record<string, string> = {};
      allClientFields.forEach(f => {
        if (!HARDCODED_KEYS.has(f.key)) {
          values[f.key] = (client as any)[f.key] || "";
        }
      });
      setDynamicFieldValues(values);
    }
  }, [id, client]);

  // appointments tab
  const [appointments, setAppointments] = useState<any[]>([]);
  const [showCallDetailsFromProfile, setShowCallDetailsFromProfile] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [selectedProcessIds, setSelectedProcessIds] = useState<string[]>([]);
  const [processSearchQuery, setProcessSearchQuery] = useState("");

  // Initialize selectedProcesses and drawerProcessStages from client
  useEffect(() => {
    if (client) {
      setSelectedProcesses(client.processes);
      const initialStages: Record<string, string> = {};
      const headings = new Set<string>();
      client.processes.forEach((processName) => {
        const parts = processName.split(":");
        if (parts.length >= 1) headings.add(parts[0].trim());
      });
      const clientDeals = initialDeals.filter((d) => d.clientName === client.name);
      Array.from(headings).forEach((heading, idx) => {
        const matchingDeal = clientDeals.find((d) => getProcessFromDealStage(d.stage) === heading);
        const processId = matchingDeal ? matchingDeal.id : `process-${idx + 1}`;
        if (matchingDeal) {
          const parts = matchingDeal.stage.split(":");
          const stageLabel = parts.length > 1 ? parts[1].trim() : parts[0].trim();
          initialStages[processId] = stageLabel;
        } else {
          initialStages[processId] = idx === 0 ? "Insurance Verification" : "Billing Inquiry";
        }
      });
      setDrawerProcessStages(initialStages);
    }
  }, [id]);

  // Close field picker on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (processDropdownOpen && !target.closest(".process-dropdown-container")) {
        setProcessDropdownOpen(false);
      }
      if (showFieldPicker && !target.closest(".field-picker-container")) {
        setShowFieldPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [processDropdownOpen, showFieldPicker]);

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold" style={{ color: "#1F2937", fontFamily: "DM Sans, sans-serif" }}>
            Client not found
          </p>
          <button
            onClick={handleClose}
            className="mt-4 text-sm"
            style={{ color: "#4F8EF7", fontFamily: "Outfit, sans-serif" }}
          >
            ← Back to Clients
          </button>
        </div>
      </div>
    );
  }

  // ─── Derived data (verbatim from Clients.tsx) ─────────────────────────────

  const drawerClientProcesses = (() => {
    const storedCallLogs = getStoredCallLogs().filter(
      (l) => l.clientId === client.id || l.client.toLowerCase() === client.name.toLowerCase()
    );
    const realStages: ClientProcessStage[] = (client as any).processStages ?? [];
    const headings = new Set<string>();

    storedCallLogs.forEach((l) => headings.add(l.process));
    client.processes.forEach((processName) => {
      const parts = processName.split(":");
      if (parts.length >= 1) headings.add(parts[0].trim());
    });

    const clientDeals = initialDeals.filter((d) => d.clientName === client.name);
    const emailDomain = client.email ? client.email.split("@")[1] || "—" : "—";

    return Array.from(headings).map((heading, idx): {
      id: string;
      name: string;
      currentStage: string;
      lastActivity: string;
      status: "Completed" | "In Progress" | "Pending" | "On Hold";
      created: string;
      responsible: string;
      dealType: string;
      source: string;
    } => {
      const matchingStoredLog = storedCallLogs.find(
        (l) => l.process === heading || l.process.toLowerCase() === heading.toLowerCase()
      );
      const matchingRealStage = realStages.find(
        (s) => s.processName === heading || s.processName.toLowerCase() === heading.toLowerCase()
      );
      const matchingDeal = clientDeals.find((d) => getProcessFromDealStage(d.stage) === heading);

      if (matchingStoredLog) {
        let statusVal: "Completed" | "In Progress" | "Pending" | "On Hold" = "In Progress";
        if (matchingStoredLog.status === "Completed") statusVal = "Completed";
        else if (matchingStoredLog.status === "Failed") statusVal = "On Hold";
        else if (matchingStoredLog.status === "Pending") statusVal = "Pending";

        return {
          id: matchingStoredLog.id,
          name: heading,
          currentStage: matchingStoredLog.currentStage,
          lastActivity: matchingStoredLog.date ? `Last contact - ${matchingStoredLog.date.split(" ")[0]}` : "—",
          status: statusVal,
          created: matchingStoredLog.date || "—",
          responsible: (client as any).responsible || "Unassigned",
          dealType: "Organic",
          source: (client as any).source ?? emailDomain,
        };
      }

      if (matchingRealStage) {
        return {
          id: matchingDeal?.id ?? `process-${idx + 1}`,
          name: heading,
          currentStage: matchingRealStage.stageName,
          lastActivity: "—",
          status: "In Progress" as const,
          created: matchingDeal?.createdDate ? matchingDeal.createdDate + " 00:00" : "—",
          responsible: matchingDeal?.responsible ?? (client as any).responsible ?? "Unassigned",
          dealType: "Organic",
          source: (client as any).source ?? emailDomain,
        };
      }

      if (matchingDeal) {
        const parts = matchingDeal.stage.split(":");
        const stageLabel = parts.length > 1 ? parts[1].trim() : parts[0].trim();
        let statusVal: "Completed" | "In Progress" | "Pending" | "On Hold" = "In Progress";
        if (matchingDeal.status === "Won") statusVal = "Completed";
        else if (matchingDeal.status === "Lost") statusVal = "On Hold";
        return {
          id: matchingDeal.id, name: heading, currentStage: stageLabel, lastActivity: "Apr 10, 2024",
          status: statusVal, created: matchingDeal.createdDate + " 00:00", responsible: matchingDeal.responsible,
          dealType: "Organic", source: emailDomain,
        };
      }

      return {
        id: `process-${idx + 1}`,
        name: heading,
        currentStage: (client as any).stage || "Initial Contact",
        lastActivity: "—",
        status: "Pending" as const,
        created: "—",
        responsible: (client as any).responsible ?? "Unassigned",
        dealType: "Organic",
        source: (client as any).source ?? emailDomain,
      };
    });
  })();

  const drawerActivityItems = (() => {
    const findProcessId = (heading: string) => {
      const process = drawerClientProcesses.find((p) => p.name === heading);
      return process?.id || "process-1";
    };
    const mockItems = [
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

    // Use real activity log when available; fall back to mock for demo clients
    const realActivity = getActivityForClient(client.id).map((r) => ({
      id: r.id,
      processId: drawerClientProcesses.find((p) => p.name === r.processName)?.id ?? "process-1",
      processName: r.processName,
      type: r.type,
      rawType: r.type,
      refId: r.refId,
      rawTimestamp: r.timestamp,
      fullTimestamp: new Date(r.timestamp).toLocaleString(),
      date: new Date(r.timestamp).toLocaleDateString(),
      time: new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      title: r.details.primary,
      description: r.details.secondary,
      sourceStepName: r.details.secondary,
      status: r.status === "success" ? "Completed" : r.status,
    }));

    const rawList = realActivity.length > 0 ? realActivity : mockItems;

    const toChronologicalOrder = (entries: typeof rawList) =>
      [...entries].sort((a, b) => {
        const timeA = (a as any).rawTimestamp ? new Date((a as any).rawTimestamp).getTime() : new Date(a.date).getTime();
        const timeB = (b as any).rawTimestamp ? new Date((b as any).rawTimestamp).getTime() : new Date(b.date).getTime();
        const diff = timeA - timeB;
        if (diff !== 0) return diff;
        const rankA = CHRONO_RANK[(a as any).rawType] ?? CHRONO_RANK[a.type] ?? 1;
        const rankB = CHRONO_RANK[(b as any).rawType] ?? CHRONO_RANK[b.type] ?? 1;
        return rankA - rankB;
      });

    return [...toChronologicalOrder(rawList)].reverse();
  })();

  const getDrawerActivityCount = (processId: string) => {
    if (processId === "all") return drawerActivityItems.length;
    return drawerActivityItems.filter((item) => item.processId === processId).length;
  };

  const filteredDrawerActivities =
    activeProcessTabDrawer === "all"
      ? drawerActivityItems
      : drawerActivityItems.filter((item) => item.processId === activeProcessTabDrawer);

  const selectedDrawerProcess = drawerClientProcesses.find((p) => p.id === activeProcessTabDrawer);

  const allSubmissions = loadClientSubmissions();

  // Load forms dynamically from sessionStorage (falls back to static seed) so
  // forms created/edited in the Form Builder are visible here too.
  const allForms: Form[] = (() => {
    try {
      const saved = sessionStorage.getItem("webForms");
      return saved ? JSON.parse(saved) : INITIAL_FORMS;
    } catch {
      return INITIAL_FORMS;
    }
  })();

  const clientSubmissions = allSubmissions.filter(s => s.clientId === client.id);
  const groupedSubmissions = allForms.map(form => {
    const subs = clientSubmissions.filter(s => s.formId === form.id);
    return { form, subs };
  }).filter(group => group.subs.length > 0);

  type FlowStepProgress = {
    step: FlowStep;
    form: Form | undefined;
    done: boolean;
    completedOn?: string;
    submission?: ReturnType<typeof loadClientSubmissions>[number];
  };

  type ClientFlowProgress = {
    flow: IntakeFlow;
    steps: FlowStepProgress[];
    status: "completed" | "in_progress";
    requiredDone: number;
    requiredTotal: number;
  };

  const clientFlowProgress: ClientFlowProgress[] = INITIAL_FLOWS.map(flow => {
    const steps: FlowStepProgress[] = flow.steps.map(step => {
      const form = allForms.find(f => f.id === step.formId);
      const subsForStep = clientSubmissions.filter(s => s.formId === step.formId);
      const sorted = subsForStep
        .slice()
        .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
      const submission = sorted[0];
      const done = !!submission;
      return { step, form, done, completedOn: submission?.submittedAt, submission };
    });

    const requiredSteps = steps.filter(s => s.step.required);
    const requiredDone = requiredSteps.filter(s => s.done).length;
    const status: "completed" | "in_progress" =
      requiredSteps.length > 0 && requiredDone === requiredSteps.length ? "completed" : "in_progress";

    return { flow, steps, status, requiredDone, requiredTotal: requiredSteps.length };
  }).filter(progress => progress.steps.some(s => s.done));

  useEffect(() => {
    const routeState = location.state as { openFormsTab?: boolean; formId?: number; submissionDate?: string } | null;
    const state = initialOpenState ?? routeState;
    if (state?.openFormsTab && state.formId) {
      setActiveProfileTab("forms");
      setFormsTabMode("forms");
      setExpandedFormGroupId(state.formId);

      const matchingSub = allSubmissions.find(
        s => s.clientId === id && s.formId === state.formId && (!state.submissionDate || s.submittedAt === state.submissionDate)
      );
      if (matchingSub) {
        setExpandedSubmissionId(matchingSub.id);
      }
      if (routeState) window.history.replaceState({}, "");
    }
  }, [location.state, initialOpenState, id]);

  const getDrawerActivityIcon = (type: string) => {
    switch (type) {
      case "whatsapp": return <MessageCircle className="w-5 h-5 text-emerald-600" />;
      case "sms": return <MessageSquare className="w-5 h-5 text-indigo-600" />;
      case "email": return <Mail className="w-5 h-5 text-amber-600" />;
      case "website_message":
      case "website": return <Globe className="w-5 h-5 text-purple-600" />;
      case "process_entry": return <LogIn className="w-5 h-5 text-blue-600" />;
      case "stage_update":
      case "stage_change": return <ArrowRightCircle className="w-5 h-5 text-purple-600" />;
      case "outbound_call":
      case "call": return <PhoneOutgoing className="w-5 h-5 text-blue-600" />;
      case "inbound_call": return <PhoneIncoming className="w-5 h-5 text-blue-600" />;
      case "failed_call": return <PhoneOff className="w-5 h-5 text-red-600" />;
      case "call_scheduled": return <CalendarClock className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  const getDrawerActivityColor = (type: string) => {
    switch (type) {
      case "whatsapp":
        return "text-emerald-700 bg-emerald-50 border border-emerald-200";
      case "sms":
        return "text-indigo-700 bg-indigo-50 border border-indigo-200";
      case "email":
        return "text-amber-700 bg-amber-50 border border-amber-200";
      case "website_message":
      case "website":
        return "text-purple-700 bg-purple-50 border border-purple-200";
      case "process_entry":
        return "text-blue-700 bg-blue-50 border border-blue-200";
      case "stage_update":
      case "stage_change":
        return "text-purple-700 bg-purple-50 border border-purple-200";
      case "outbound_call":
      case "inbound_call":
      case "call":
        return "text-blue-700 bg-blue-50 border border-blue-200";
      case "failed_call":
        return "text-destructive bg-destructive/10 border border-red-200";
      case "call_scheduled":
        return "text-warning bg-warning/10";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={handleClose}
      />

      {/* Drawer panel */}
      <div className="fixed right-0 top-0 h-full w-[40%] bg-white z-50 shadow-xl flex flex-col overflow-hidden">

        {/* Hero: client identity */}
        <div className="p-6 border-b border-border flex-shrink-0">
          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 bg-gradient-to-br from-primary to-primary-hover text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0 shadow-lg"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              {client.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-1" style={{ color: "#1F2937", fontFamily: "DM Sans, sans-serif" }}>
                {client.name}
              </h2>
              <span
                className="inline-block px-2.5 py-1.5 text-[11px] font-bold"
                style={{
                  fontFamily: "Outfit, sans-serif",
                  backgroundColor:
                    client.status === "Active" ? "#DCFCE7" : client.status === "Pending" ? "#FEF3C7" : "#F3F4F6",
                  color:
                    client.status === "Active" ? "#10B981" : client.status === "Pending" ? "#F59E0B" : "#6B7280",
                  borderRadius: "6px",
                  padding: "6px 10px",
                }}
              >
                {client.status}
              </span>
            </div>
            <button
              onClick={handleClose}
              className="hover:bg-gray-100 p-1.5 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" style={{ color: "#6B7280" }} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-border overflow-x-auto flex-shrink-0">
          <div className="flex">
            {(
              [
                { id: "overview" as const, label: "Overview" },
                { id: "processes" as const, label: "Processes" },
                { id: "activity" as const, label: "Activity" },
                { id: "forms" as const, label: "Forms" },
                { id: "appointments" as const, label: "Appointments" },
                { id: "notes" as const, label: "Notes" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveProfileTab(tab.id)}
                className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-all ${activeProfileTab === tab.id
                    ? "border-b-2 border-primary text-primary"
                    : "hover:text-foreground"
                  }`}
                style={{
                  fontFamily: "Outfit, sans-serif",
                  color: activeProfileTab === tab.id ? undefined : "#6B7280",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 relative flex-1 overflow-y-auto">

          {/* ── Overview Tab ── */}
          {activeProfileTab === "overview" && (
            <div className="space-y-6">
              <div className="space-y-0">
                <div className="space-y-3">
                  {/* NAME */}
                  <div className="flex flex-col gap-1.5">
                    <label className="uppercase font-bold" style={{ color: "#9CA3AF", fontFamily: "Outfit, sans-serif", letterSpacing: "0.05em", fontSize: "10px" }}>
                      NAME
                    </label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="px-2.5 py-1.5 text-sm rounded focus:outline-none focus:ring-2 transition-all"
                      style={{ backgroundColor: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: "6px", color: "#1F2937", fontFamily: "Outfit, sans-serif" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#4F8EF7")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
                    />
                  </div>

                  {/* STATUS */}
                  <div className="flex flex-col gap-1.5">
                    <label className="uppercase font-bold" style={{ color: "#9CA3AF", fontFamily: "Outfit, sans-serif", letterSpacing: "0.05em", fontSize: "10px" }}>
                      STATUS
                    </label>
                    <select
                      value={clientStatus}
                      onChange={(e) => setClientStatus(e.target.value)}
                      className="px-2.5 py-1.5 text-sm rounded focus:outline-none focus:ring-2 transition-all"
                      style={{ backgroundColor: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: "6px", color: "#1F2937", fontFamily: "Outfit, sans-serif" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#4F8EF7")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
                    >
                      <option>Active</option>
                      <option>Inactive</option>
                      <option>Pending</option>
                    </select>
                  </div>

                  {/* PROCESSES */}
                  <div className="flex flex-col gap-1.5">
                    <label className="uppercase font-bold" style={{ color: "#9CA3AF", fontFamily: "Outfit, sans-serif", letterSpacing: "0.05em", fontSize: "10px" }}>
                      PROCESSES
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedProcesses && selectedProcesses.length > 0 ? (
                        selectedProcesses.map((process, idx) => (
                          <div
                            key={idx}
                            className="group relative px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap select-none transition-all"
                            style={{ backgroundColor: "#4F8EF7", color: "#ffffff", fontFamily: "Outfit, sans-serif", borderRadius: "20px" }}
                          >
                            <span className="pr-5">{process}</span>
                            <button
                              onClick={() => {
                                const updated = selectedProcesses.filter((_, i) => i !== idx);
                                setSelectedProcesses(updated);
                                setClients((prev) =>
                                  prev.map((c) => (c.id === client.id ? { ...c, processes: updated } : c))
                                );
                                toast.success("Process removed");
                              }}
                              className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/20"
                            >
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                              </svg>
                            </button>
                          </div>
                        ))
                      ) : (
                        <span className="text-sm" style={{ color: "#9CA3AF", fontFamily: "Outfit, sans-serif" }}>
                          No processes assigned
                        </span>
                      )}
                      <DropdownMenu open={processDropdownOpen} onOpenChange={setProcessDropdownOpen}>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap select-none transition-all hover:bg-gray-100"
                            style={{ backgroundColor: "#F3F4F6", color: "#6B7280", fontFamily: "Outfit, sans-serif", borderRadius: "20px", border: "1px solid #E5E7EB" }}
                          >
                            + Add Process
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56">
                          {availableProcesses
                            .filter((p) => !selectedProcesses.includes(p))
                            .map((process) => (
                              <DropdownMenuItem
                                key={process}
                                onClick={() => {
                                  const updated = [...selectedProcesses, process];
                                  setSelectedProcesses(updated);
                                  setClients((prev) =>
                                    prev.map((c) => (c.id === client.id ? { ...c, processes: updated } : c))
                                  );
                                  toast.success(`${process} added`);
                                  setProcessDropdownOpen(false);
                                }}
                              >
                                {process}
                              </DropdownMenuItem>
                            ))}
                          {availableProcesses.filter((p) => !selectedProcesses.includes(p)).length === 0 && (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">All processes assigned</div>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* EMAIL */}
                  <div className="flex flex-col gap-1.5">
                    <label className="uppercase font-bold" style={{ color: "#9CA3AF", fontFamily: "Outfit, sans-serif", letterSpacing: "0.05em", fontSize: "10px" }}>
                      EMAIL
                    </label>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="px-2.5 py-1.5 text-sm rounded focus:outline-none focus:ring-2 transition-all"
                      style={{ backgroundColor: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: "6px", color: "#1F2937", fontFamily: "Outfit, sans-serif" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#4F8EF7")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
                    />
                  </div>

                  {/* PHONE */}
                  <div className="flex flex-col gap-1.5">
                    <label className="uppercase font-bold" style={{ color: "#9CA3AF", fontFamily: "Outfit, sans-serif", letterSpacing: "0.05em", fontSize: "10px" }}>
                      PHONE
                    </label>
                    <input
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="px-2.5 py-1.5 text-sm rounded focus:outline-none focus:ring-2 transition-all"
                      style={{ backgroundColor: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: "6px", color: "#1F2937", fontFamily: "Outfit, sans-serif" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#4F8EF7")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
                    />
                  </div>

                  {/* LOCATION */}
                  <div className="flex flex-col gap-1.5">
                    <label className="uppercase font-bold" style={{ color: "#9CA3AF", fontFamily: "Outfit, sans-serif", letterSpacing: "0.05em", fontSize: "10px" }}>
                      LOCATION
                    </label>
                    <input
                      type="text"
                      value={clientLocation}
                      onChange={(e) => setClientLocation(e.target.value)}
                      placeholder="City, State or Address"
                      className="px-2.5 py-1.5 text-sm rounded focus:outline-none focus:ring-2 transition-all"
                      style={{ backgroundColor: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: "6px", color: "#1F2937", fontFamily: "Outfit, sans-serif" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#4F8EF7")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
                    />
                  </div>

                  {/* COMPANY */}
                  <div className="flex flex-col gap-1.5">
                    <label className="uppercase font-bold" style={{ color: "#9CA3AF", fontFamily: "Outfit, sans-serif", letterSpacing: "0.05em", fontSize: "10px" }}>
                      COMPANY
                    </label>
                    <input
                      type="text"
                      value={clientCompany}
                      onChange={(e) => setClientCompany(e.target.value)}
                      className="px-2.5 py-1.5 text-sm rounded focus:outline-none focus:ring-2 transition-all"
                      style={{ backgroundColor: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: "6px", color: "#1F2937", fontFamily: "Outfit, sans-serif" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#4F8EF7")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
                    />
                  </div>

                  {/* ROLE */}
                  <div className="flex flex-col gap-1.5">
                    <label className="uppercase font-bold" style={{ color: "#9CA3AF", fontFamily: "Outfit, sans-serif", letterSpacing: "0.05em", fontSize: "10px" }}>
                      ROLE
                    </label>
                    <input
                      type="text"
                      value={clientRole}
                      onChange={(e) => setClientRole(e.target.value)}
                      className="px-2.5 py-1.5 text-sm rounded focus:outline-none focus:ring-2 transition-all"
                      style={{ backgroundColor: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: "6px", color: "#1F2937", fontFamily: "Outfit, sans-serif" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#4F8EF7")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
                    />
                  </div>

                  {/* COUNTRY */}
                  <div className="flex flex-col gap-1.5">
                    <label className="uppercase font-bold" style={{ color: "#9CA3AF", fontFamily: "Outfit, sans-serif", letterSpacing: "0.05em", fontSize: "10px" }}>
                      COUNTRY
                    </label>
                    <input
                      type="text"
                      value={clientCountry}
                      onChange={(e) => setClientCountry(e.target.value)}
                      className="px-2.5 py-1.5 text-sm rounded focus:outline-none focus:ring-2 transition-all"
                      style={{ backgroundColor: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: "6px", color: "#1F2937", fontFamily: "Outfit, sans-serif" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#4F8EF7")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
                    />
                  </div>

                  {/* Dynamic Fields */}
                  {visibleFieldKeys
                    .filter(k => !HARDCODED_KEYS.has(k))
                    .map((k) => {
                      const f = getAllFields("client").find(field => field.key === k);
                      if (!f) return null;
                      return (
                        <div key={k} className="flex flex-col gap-1.5">
                          <label className="uppercase font-bold" style={{ color: "#9CA3AF", fontFamily: "Outfit, sans-serif", letterSpacing: "0.05em", fontSize: "10px" }}>
                            {f.label.toUpperCase()}
                          </label>
                          <input
                            type={f.inputType === "email" ? "email" : f.inputType === "tel" ? "tel" : "text"}
                            value={dynamicFieldValues[k] || ""}
                            onChange={(e) => {
                              setDynamicFieldValues(prev => ({
                                ...prev,
                                [k]: e.target.value
                              }));
                            }}
                            placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}`}
                            className="px-2.5 py-1.5 text-sm rounded focus:outline-none focus:ring-2 transition-all"
                            style={{ backgroundColor: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: "6px", color: "#1F2937", fontFamily: "Outfit, sans-serif" }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = "#4F8EF7")}
                            onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
                          />
                        </div>
                      );
                    })}
                </div>

                {/* Field action links */}
                <div className="pt-6 mt-6 border-t border-border">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => {
                        setFieldManagerMode("select");
                        setFieldManagerOpen(true);
                      }}
                      className="text-sm font-medium transition-colors cursor-pointer"
                      style={{ color: "#4F8EF7", fontFamily: "Outfit, sans-serif", fontSize: "14px", borderBottom: "1px dashed #4F8EF7", paddingBottom: "2px" }}
                    >
                      Select field
                    </button>
                    <button
                      onClick={() => {
                        setFieldManagerMode("create");
                        setFieldManagerOpen(true);
                      }}
                      className="text-sm font-medium transition-colors cursor-pointer"
                      style={{ color: "#4F8EF7", fontFamily: "Outfit, sans-serif", fontSize: "14px", borderBottom: "1px dashed #4F8EF7", paddingBottom: "2px" }}
                    >
                      Create field
                    </button>
                  </div>
                </div>

                {/* Save / Discard Buttons */}
                <div className="flex gap-3 pt-6 mt-6">
                  <button
                    onClick={handleSaveChanges}
                    className="flex-1 py-3 text-white font-bold rounded transition-colors hover:opacity-90"
                    style={{ backgroundColor: "#4F8EF7", fontSize: "16px", fontFamily: "Outfit, sans-serif", height: "44px" }}
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={handleClose}
                    className="px-6 py-3 border font-medium rounded transition-colors hover:bg-gray-50"
                    style={{ borderColor: "#E5E7EB", color: "#6B7280", fontSize: "16px", fontFamily: "Outfit, sans-serif", height: "44px" }}
                  >
                    Discard
                  </button>
                </div>


              </div>
            </div>
          )}

          {/* ── Processes Tab ── */}
          {activeProfileTab === "processes" && (
            <div className="space-y-4">
              {(() => {
                // Filter processes client-side by search query
                const filteredProcesses = drawerClientProcesses.filter((p) =>
                  p.name.toLowerCase().includes(processSearchQuery.toLowerCase())
                );

                const isAllSelected = filteredProcesses.length > 0 && filteredProcesses.every((p) => selectedProcessIds.includes(p.id));
                const handleToggleSelectAll = () => {
                  if (isAllSelected) {
                    setSelectedProcessIds((prev) => prev.filter((id) => !filteredProcesses.some((fp) => fp.id === id)));
                  } else {
                    const newSelected = [...selectedProcessIds];
                    filteredProcesses.forEach((p) => {
                      if (!newSelected.includes(p.id)) {
                        newSelected.push(p.id);
                      }
                    });
                    setSelectedProcessIds(newSelected);
                  }
                };

                return (
                  <div className="space-y-3">
                    {/* Search bar — right-aligned, no redundant label */}
                    <div className="flex items-center justify-end px-1">
                      <div className="relative w-52">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5" style={{ color: "#9CA3AF" }} />
                        <input
                          type="text"
                          placeholder="Search process..."
                          value={processSearchQuery}
                          onChange={(e) => setProcessSearchQuery(e.target.value)}
                          className="pl-8 pr-3 py-1.5 w-full text-xs bg-white border rounded-lg focus:outline-none transition-colors"
                          style={{ fontFamily: "Outfit, sans-serif", color: "#1F2937", borderColor: "#E5E7EB" }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = "#4F8EF7")}
                          onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
                        />
                      </div>
                    </div>

                    {/* Table View */}
                    <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: "12px", boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)", overflow: "hidden" }}>
                      <div className="overflow-x-auto">
                        <table className="text-left border-collapse" style={{ fontFamily: "Outfit, sans-serif", minWidth: "960px", width: "100%" }}>
                          <thead>
                            <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #E5E7EB" }}>
                              {/* Checkbox */}
                              <th className="px-3 py-2.5 w-10 text-center">
                                <input
                                  type="checkbox"
                                  checked={isAllSelected}
                                  onChange={handleToggleSelectAll}
                                  className="rounded border-gray-300"
                                  style={{ accentColor: "#4F8EF7" }}
                                />
                              </th>
                              {/* Process / Deal */}
                              <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ fontFamily: "DM Sans, sans-serif", color: "#9CA3AF", minWidth: "180px" }}>Process / Deal</th>
                              {/* Stage */}
                              <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ fontFamily: "DM Sans, sans-serif", color: "#9CA3AF", minWidth: "220px" }}>Stage</th>
                              {/* Deal Type */}
                              <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ fontFamily: "DM Sans, sans-serif", color: "#9CA3AF", minWidth: "110px" }}>Deal Type</th>
                              {/* Source */}
                              <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ fontFamily: "DM Sans, sans-serif", color: "#9CA3AF", minWidth: "130px" }}>Source</th>
                              {/* Status */}
                              <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ fontFamily: "DM Sans, sans-serif", color: "#9CA3AF", minWidth: "120px" }}>Status</th>
                              {/* Created */}
                              <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ fontFamily: "DM Sans, sans-serif", color: "#9CA3AF", minWidth: "140px" }}>Created</th>
                              {/* Responsible */}
                              <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ fontFamily: "DM Sans, sans-serif", color: "#9CA3AF", minWidth: "140px" }}>Responsible</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredProcesses.length === 0 ? (
                              <tr>
                                <td colSpan={8} style={{ padding: "24px", textAlign: "center", fontSize: "13px", color: "#6B7280", fontFamily: "Outfit, sans-serif" }}>
                                  No processes found
                                </td>
                              </tr>
                            ) : (
                              filteredProcesses.map((process, pIdx) => {
                                const isSelected = selectedProcessIds.includes(process.id);
                                const isCurrentRowActive = activeProcessTabDrawer === process.id;

                                // Derive stages
                                const currentStage = drawerProcessStages[process.id] || process.currentStage;
                                const stages = getStagesForProcess(process.name);
                                const currentIndex = stages.findIndex((s) => s.label === currentStage);

                                // Format Code
                                const processCode = `PRC-${client.id}-${pIdx + 1}`;

                                // Avatar initials
                                const initials = process.responsible
                                  ? process.responsible.split(" ").map((n) => n[0]).join("")
                                  : "JS";

                                const rowBg = isCurrentRowActive ? "#F1F5F9" : isSelected ? "#F8FAFC" : "#FFFFFF";

                                return (
                                  <tr
                                    key={process.id}
                                    onClick={() => setActiveProcessTabDrawer(isCurrentRowActive ? "all" : process.id)}
                                    className="transition-colors border-b cursor-pointer"
                                    style={{
                                      backgroundColor: rowBg,
                                      borderColor: "#F3F4F6",
                                      fontFamily: "Outfit, sans-serif",
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!isCurrentRowActive) e.currentTarget.style.backgroundColor = "#F1F5F9";
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!isCurrentRowActive) e.currentTarget.style.backgroundColor = rowBg;
                                    }}
                                  >
                                    {/* Checkbox */}
                                    <td
                                      className="px-3 text-center"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => {
                                          setSelectedProcessIds((prev) =>
                                            prev.includes(process.id) ? prev.filter((id) => id !== process.id) : [...prev, process.id]
                                          );
                                        }}
                                        className="rounded border-gray-300"
                                        style={{ accentColor: "#4F8EF7" }}
                                      />
                                    </td>
                                    {/* Process / Deal */}
                                    <td className="px-3">
                                      <div className="flex flex-col" style={{ maxWidth: "172px" }}>
                                        <span
                                          title={process.name}
                                          className="hover:underline overflow-hidden text-ellipsis whitespace-nowrap"
                                          style={{ color: "#4F8EF7", fontWeight: "600", fontFamily: "DM Sans, sans-serif", fontSize: "13px" }}
                                        >
                                          {process.name}
                                        </span>
                                        <span className="whitespace-nowrap" style={{ fontSize: "11px", color: "#9CA3AF" }}>{processCode}</span>
                                      </div>
                                    </td>
                                    {/* Stage */}
                                    <td className="px-3" onClick={(e) => e.stopPropagation()}>
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center" style={{ gap: "3px" }}>
                                          {stages.map((stage, sIdx) => {
                                            const isFilled = sIdx <= currentIndex;
                                            const stageKey = `${process.id}-${sIdx}`;
                                            return (
                                              <div key={stage.id} style={{ position: "relative" }}>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setDrawerProcessStages((prev) => ({ ...prev, [process.id]: stage.label }));
                                                    toast.success(`Stage updated to ${stage.label}`);
                                                  }}
                                                  onMouseEnter={() => setHoveredStage(stageKey)}
                                                  onMouseLeave={() => setHoveredStage(null)}
                                                  style={{
                                                    width: "22px",
                                                    height: "6px",
                                                    borderRadius: "1.5px",
                                                    backgroundColor: isFilled ? "#0EA5E9" : "#E5E7EB",
                                                    border: isFilled ? "none" : "1px solid #D1D5DB",
                                                    cursor: "pointer",
                                                    transition: "all 0.2s",
                                                    padding: 0,
                                                  }}
                                                  className="hover:opacity-80"
                                                />
                                                {hoveredStage === stageKey && (
                                                  <div style={{ position: "absolute", bottom: "12px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#1A2B4A", color: "#FFFFFF", fontSize: "10px", borderRadius: "4px", padding: "2px 6px", whiteSpace: "nowrap", zIndex: 10, pointerEvents: "none" }}>
                                                    {stage.label}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                        <span style={{ fontSize: "11px", color: "#9CA3AF", fontFamily: "Outfit, sans-serif", fontWeight: 400 }}>{currentStage}</span>
                                      </div>
                                    </td>
                                    {/* Deal Type */}
                                    <td className="px-3">
                                      <span className="whitespace-nowrap" style={{ fontSize: "13px", color: "#1F2937", fontFamily: "Outfit, sans-serif" }}>
                                        {process.dealType}
                                      </span>
                                    </td>
                                    {/* Source */}
                                    <td className="px-3">
                                      <span className="whitespace-nowrap" style={{ fontSize: "13px", color: "#6B7280", fontFamily: "Outfit, sans-serif" }}>
                                        {process.source}
                                      </span>
                                    </td>
                                    {/* Status */}
                                    <td className="px-3">
                                      <span
                                        className="px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap"
                                        style={{
                                          backgroundColor: process.status === "Completed" ? "#D1FAE5" : process.status === "In Progress" ? "#FED7AA" : process.status === "Pending" ? "#FEF3C7" : "#F3F4F6",
                                          color: process.status === "Completed" ? "#065F46" : process.status === "In Progress" ? "#C2410C" : process.status === "Pending" ? "#92400E" : "#6B7280",
                                          borderColor: process.status === "Completed" ? "#A7F3D0" : process.status === "In Progress" ? "#FED7AA" : process.status === "Pending" ? "#FDE68A" : "#E5E7EB",
                                        }}
                                      >
                                        {process.status}
                                      </span>
                                    </td>
                                    {/* Created */}
                                    <td className="px-3">
                                      <span className="whitespace-nowrap" style={{ fontSize: "12px", color: "#6B7280" }}>{process.created}</span>
                                    </td>
                                    {/* Responsible */}
                                    <td className="px-3">
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="flex items-center justify-center rounded-full text-xs font-semibold"
                                          style={{ width: "26px", height: "26px", backgroundColor: "#EBF4FF", color: "#4F8EF7", fontFamily: "DM Sans, sans-serif", flexShrink: 0 }}
                                        >
                                          {initials}
                                        </div>
                                        <span className="whitespace-nowrap" style={{ fontSize: "13px", color: "#1F2937", fontWeight: "500" }}>{process.responsible}</span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Footer */}
                      <div style={{ padding: "10px 16px", backgroundColor: "#F8FAFC", borderTop: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", color: "#6B7280", fontFamily: "Outfit, sans-serif" }}>
                        <div>
                          Selected: <span style={{ fontWeight: "600", color: "#1F2937" }}>{selectedProcessIds.length}</span> / <span style={{ fontWeight: "600", color: "#1F2937" }}>{filteredProcesses.length}</span>
                        </div>
                        <div>
                          Total {filteredProcesses.length} {filteredProcesses.length === 1 ? "entry" : "entries"}
                        </div>
                      </div>
                    </div>

                    {/* Single Process Detail View (Expanded below) */}
                    {activeProcessTabDrawer !== "all" && (() => {
                      const selectedProcess = drawerClientProcesses.find((p) => p.id === activeProcessTabDrawer);
                      if (!selectedProcess) return null;

                      const processActivities = drawerActivityItems.filter((item) => item.processId === selectedProcess.id);
                      const lastActivity = processActivities.length > 0 ? processActivities[0] : null;
                      const currentStage = drawerProcessStages[selectedProcess.id] || selectedProcess.currentStage;
                      const stages = getStagesForProcess(selectedProcess.name);
                      const currentIndex = stages.findIndex((s) => s.label === currentStage);

                      return (
                        <div
                          key={selectedProcess.id}
                          style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: "12px", boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)", overflow: "hidden" }}
                          className="mt-4"
                        >
                          <div className="p-5 space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <h3 style={{ fontFamily: "DM Sans, sans-serif", fontSize: "16px", fontWeight: "bold", color: "#1F2937", marginBottom: "8px" }}>
                                  {selectedProcess.name} Details
                                </h3>
                              </div>
                            </div>

                            {/* STAGE */}
                            <div className="flex flex-col gap-1.5">
                              <label className="uppercase font-bold" style={{ color: "#9CA3AF", fontFamily: "Outfit, sans-serif", letterSpacing: "0.05em", fontSize: "10px" }}>
                                STAGE
                              </label>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center" style={{ gap: "4px" }}>
                                  {stages.map((stage, index) => {
                                    const isFilled = index <= currentIndex;
                                    const stageKey = `${selectedProcess.id}-${index}`;
                                    return (
                                      <div key={stage.id} style={{ position: "relative" }}>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setDrawerProcessStages((prev) => ({ ...prev, [selectedProcess.id]: stage.label }));
                                            toast.success(`Stage updated to ${stage.label}`);
                                          }}
                                          onMouseEnter={() => setHoveredStage(stageKey)}
                                          onMouseLeave={() => setHoveredStage(null)}
                                          style={{ width: "28px", height: "8px", borderRadius: "2px", backgroundColor: isFilled ? "#0EA5E9" : "#E5E7EB", border: isFilled ? "none" : "1px solid #D1D5DB", cursor: "pointer", transition: "all 0.2s", padding: 0 }}
                                          className="hover:opacity-80"
                                        />
                                        {hoveredStage === stageKey && (
                                          <div style={{ position: "absolute", bottom: "14px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#1A2B4A", color: "#FFFFFF", fontSize: "11px", borderRadius: "4px", padding: "3px 8px", whiteSpace: "nowrap", zIndex: 10, pointerEvents: "none", fontFamily: "Outfit, sans-serif" }}>
                                            {stage.label}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                                <span style={{ fontSize: "14px", fontWeight: "600", color: "#1F2937", fontFamily: "Outfit, sans-serif" }}>
                                  {currentStage}
                                </span>
                              </div>
                            </div>

                            {/* STATUS */}
                            <div className="flex flex-col gap-1.5 border-t border-border pt-4">
                              <label className="uppercase font-bold" style={{ color: "#9CA3AF", fontFamily: "Outfit, sans-serif", letterSpacing: "0.05em", fontSize: "10px" }}>
                                STATUS
                              </label>
                              <div className="relative inline-block" style={{ width: "fit-content" }}>
                                <button
                                  className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5"
                                  style={{
                                    backgroundColor: selectedProcess.status === "Completed" ? "#D1FAE5" : selectedProcess.status === "In Progress" ? "#FED7AA" : selectedProcess.status === "Pending" ? "#FEF3C7" : "#F3F4F6",
                                    color: selectedProcess.status === "Completed" ? "#065F46" : selectedProcess.status === "In Progress" ? "#C2410C" : selectedProcess.status === "Pending" ? "#92400E" : "#6B7280",
                                    border: `1px solid ${selectedProcess.status === "Completed" ? "#A7F3D0" : selectedProcess.status === "In Progress" ? "#FED7AA" : selectedProcess.status === "Pending" ? "#FDE68A" : "#E5E7EB"}`,
                                    fontFamily: "Outfit, sans-serif",
                                  }}
                                >
                                  {selectedProcess.status} <ChevronDown className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* DATE and TIME */}
                            <div className="border-t border-border pt-4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                              <div className="flex flex-col gap-1.5">
                                <label className="uppercase font-bold" style={{ color: "#9CA3AF", fontFamily: "Outfit, sans-serif", letterSpacing: "0.05em", fontSize: "10px" }}>DATE</label>
                                <input
                                  type="date"
                                  defaultValue={selectedProcess.created.split(" ")[0]}
                                  className="px-2.5 py-1.5 text-sm rounded focus:outline-none focus:ring-2 transition-all"
                                  style={{ backgroundColor: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: "6px", color: "#1F2937", fontFamily: "Outfit, sans-serif" }}
                                  onFocus={(e) => (e.currentTarget.style.borderColor = "#4F8EF7")}
                                  onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="uppercase font-bold" style={{ color: "#9CA3AF", fontFamily: "Outfit, sans-serif", letterSpacing: "0.05em", fontSize: "10px" }}>TIME</label>
                                <input
                                  type="time"
                                  defaultValue={selectedProcess.created.split(" ")[1] || "09:30"}
                                  className="px-2.5 py-1.5 text-sm rounded focus:outline-none focus:ring-2 transition-all"
                                  style={{ backgroundColor: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: "6px", color: "#1F2937", fontFamily: "Outfit, sans-serif" }}
                                  onFocus={(e) => (e.currentTarget.style.borderColor = "#4F8EF7")}
                                  onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
                                />
                              </div>
                            </div>

                            {/* RESPONSIBLE */}
                            <div className="flex flex-col gap-1.5 border-t border-border pt-4">
                              <label className="uppercase font-bold" style={{ color: "#9CA3AF", fontFamily: "Outfit, sans-serif", letterSpacing: "0.05em", fontSize: "10px" }}>RESPONSIBLE</label>
                              <div className="relative inline-block" style={{ width: "fit-content" }}>
                                <button className="text-sm text-foreground hover:text-primary flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif", color: "#1F2937" }}>
                                  {selectedProcess.responsible || "John Smith"} <ChevronDown className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* LAST ACTIVITY */}
                            {lastActivity && (
                              <div className="flex flex-col gap-1.5 border-t border-border pt-4">
                                <label className="uppercase font-bold" style={{ color: "#9CA3AF", fontFamily: "Outfit, sans-serif", letterSpacing: "0.05em", fontSize: "10px" }}>LAST ACTIVITY</label>
                                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: "16px", rowGap: "8px", fontSize: "12px" }}>
                                    <div style={{ color: "#9CA3AF", fontWeight: "600", fontFamily: "Outfit, sans-serif" }}>Date & Time:</div>
                                    <div style={{ fontWeight: "600", color: "#1F2937", fontFamily: "Outfit, sans-serif" }}>{lastActivity.date} at {lastActivity.time}</div>

                                    <div style={{ color: "#9CA3AF", fontWeight: "600", fontFamily: "Outfit, sans-serif" }}>Created By:</div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                      <div style={{ width: "20px", height: "20px", backgroundColor: "#4F8EF7", color: "#FFFFFF", borderRadius: "9999px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: "bold", fontFamily: "DM Sans, sans-serif" }}>
                                        {lastActivity.type === "outbound_call" || lastActivity.type === "inbound_call" ? "AI" : "JS"}
                                      </div>
                                      <span style={{ fontWeight: "600", color: "#1F2937", fontFamily: "Outfit, sans-serif" }}>
                                        {lastActivity.type === "outbound_call" || lastActivity.type === "inbound_call" ? "AI Agent" : "John Smith"}
                                      </span>
                                    </div>

                                    <div style={{ color: "#9CA3AF", fontWeight: "600", fontFamily: "Outfit, sans-serif" }}>Event Type:</div>
                                    <div>
                                      <span style={{
                                        padding: "2px 8px",
                                        borderRadius: "4px",
                                        fontSize: "10px",
                                        fontWeight: "700",
                                        backgroundColor: lastActivity.type === "stage_change" ? "#4F8EF7" : lastActivity.type === "outbound_call" || lastActivity.type === "inbound_call" ? "#10B981" : "#F59E0B",
                                        color: "#FFFFFF",
                                        fontFamily: "Outfit, sans-serif",
                                      }}>
                                        {lastActivity.type === "stage_change" ? "Stage changed" : lastActivity.type === "outbound_call" || lastActivity.type === "inbound_call" ? "Activity created" : "Call scheduled"}
                                      </span>
                                    </div>

                                    <div style={{ color: "#9CA3AF", fontWeight: "600", fontFamily: "Outfit, sans-serif" }}>Description:</div>
                                    <div style={{ fontWeight: "600", color: "#1F2937", fontFamily: "Outfit, sans-serif" }}>
                                      {(lastActivity as any).description || (lastActivity.type === "outbound_call" || lastActivity.type === "inbound_call" ? "Contact customer: Call for update" : "New → Can't Contact")}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── Activity Tab ── */}
          {activeProfileTab === "activity" && (
            <div className="space-y-6">
              {/* Process Filter Chips */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setActiveProcessTabDrawer("all"); setShowCallDetailsFromProfile(false); }}
                  className={`px-4 py-2 rounded-full font-medium text-sm transition-all ${activeProcessTabDrawer === "all" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted hover:bg-muted/80"}`}
                  style={{ fontFamily: "Outfit, sans-serif", color: activeProcessTabDrawer === "all" ? undefined : "#6B7280" }}
                >
                  All
                </button>
                {drawerClientProcesses.map((process) => (
                  <button
                    key={process.id}
                    onClick={() => { setActiveProcessTabDrawer(process.id); setShowCallDetailsFromProfile(false); }}
                    className={`px-4 py-2 rounded-full font-medium text-sm transition-all ${activeProcessTabDrawer === process.id ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted hover:bg-muted/80"}`}
                    style={{ fontFamily: "Outfit, sans-serif", color: activeProcessTabDrawer === process.id ? undefined : "#6B7280" }}
                  >
                    {process.name}
                  </button>
                ))}
              </div>

              {/* Activity List — Vertical Timeline matching ProcessDetailDrawer */}
              <div className="relative p-2">
                {filteredDrawerActivities.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm" style={{ color: "#6B7280", fontFamily: "Outfit, sans-serif" }}>No activity for this process yet</p>
                  </div>
                ) : (
                  filteredDrawerActivities.map((item, i) => {
                    const isLast = i === filteredDrawerActivities.length - 1;
                    const rawType = ((item as any).rawType || item.type) as string;
                    const heading = HEADING_BY_TYPE[rawType] || HEADING_BY_TYPE[item.type] || (item as any).title;
                    const timestampStr = (item as any).fullTimestamp || `${(item as any).date}, ${(item as any).time}`;

                    return (
                      <div key={item.id} className="relative flex gap-3 pb-4 last:pb-0">
                        {/* Amazon-tracker connecting line — runs behind the node */}
                        {!isLast && (
                          <div
                            className="absolute left-[17px] top-9 bottom-0 w-[2px] z-0"
                            style={{
                              backgroundColor: item.status === "Pending" ? "transparent" : "#1E88E5",
                              backgroundImage: item.status === "Pending"
                                ? "repeating-linear-gradient(to bottom, #CBD5E1 0 4px, transparent 4px 8px)"
                                : undefined,
                            }}
                          />
                        )}

                        {/* Node icon — sits on the line */}
                        <div
                          className="relative z-10 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border-2"
                          style={{
                            backgroundColor: item.status === "Failed" ? "#FEE2E2" : ACTIVITY_ICON_BG[rawType] || ACTIVITY_ICON_BG[item.type] || "#F1F5F9",
                            borderColor: item.status === "Failed" ? "#DC2626" : item.status === "Pending" ? "#CBD5E1" : "transparent",
                          }}
                        >
                          {getDrawerActivityIcon(rawType || item.type)}
                        </div>

                        {/* Standalone card — heading + details */}
                        <button
                          onClick={() => {
                            if (rawType === "whatsapp" || item.type === "whatsapp") {
                              navigate("/chats", {
                                state: {
                                  clientId: client.id,
                                  channel: "whatsapp",
                                  threadId: (item as any).refId,
                                },
                              });
                            } else if (rawType === "sms" || item.type === "sms") {
                              navigate("/chats", {
                                state: {
                                  clientId: client.id,
                                  channel: "sms",
                                  threadId: (item as any).refId,
                                },
                              });
                            } else if (rawType === "email" || item.type === "email") {
                              navigate("/chats", {
                                state: {
                                  clientId: client.id,
                                  channel: "email",
                                  emailId: (item as any).refId,
                                },
                              });
                            } else if (rawType === "website_message" || rawType === "website") {
                              navigate("/chats", {
                                state: {
                                  clientId: client.id,
                                  channel: "website",
                                  threadId: (item as any).refId,
                                },
                              });
                            } else if ((item as any).callId) {
                              setSelectedCallId((item as any).callId);
                              setShowCallDetailsFromProfile(true);
                            }
                          }}
                          className="flex-1 text-left p-3 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="text-sm font-bold text-gray-900"
                              style={{ fontFamily: "DM Sans, sans-serif" }}
                            >
                              {heading}
                            </span>
                            <span
                              className="text-xs text-gray-400 whitespace-nowrap"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              {timestampStr}
                            </span>
                          </div>

                          <div className="mt-1.5 space-y-0.5">
                            <p
                              className="text-xs text-gray-700 font-medium"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              {item.title}
                            </p>
                            {(item as any).description && (
                              <p
                                className="text-xs text-gray-500"
                                style={{ fontFamily: "Outfit, sans-serif" }}
                              >
                                {(item as any).description}
                              </p>
                            )}
                            {(item as any).sourceStepName && (
                              <p className="text-[11px] text-gray-400">via {(item as any).sourceStepName}</p>
                            )}
                          </div>

                          {(rawType === "website_message" ||
                            item.type === "website_message" ||
                            (item.title || "").toLowerCase().includes("website") ||
                            ((item as any).description || "").toLowerCase().includes("website")) && (
                              <div className="mt-2 text-left">
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate("/chats", {
                                      state: {
                                        clientId: client.id,
                                        channel: "website",
                                      },
                                    });
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                                >
                                  <Globe className="w-3.5 h-3.5 text-purple-600" />
                                  View Website Chat
                                </span>
                              </div>
                            )}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {activeProcessTabDrawer === "all" && item.processName && (
                              <span className="text-[11px] text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                                Process: <span className="font-medium text-primary">{item.processName}</span>
                              </span>
                            )}
                            {item.status && item.status !== "Completed" && item.status !== "success" && (
                              <span
                                className="inline-block text-[11px] px-2 py-0.5 rounded-full font-medium"
                                style={{
                                  backgroundColor: item.status === "Failed" ? "#FEE2E2" : "#FEF3C7",
                                  color: item.status === "Failed" ? "#DC2626" : "#CA8A04",
                                }}
                              >
                                {item.status}
                              </span>
                            )}
                            {item.status === "Completed" && (
                              <span className="inline-block text-[11px] px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Completed
                              </span>
                            )}
                          </div>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Call Details — inline collapsible panel */}
              {showCallDetailsFromProfile && selectedCallId && (
                <div className="mt-4 space-y-6 border-t border-border pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-semibold" style={{ fontFamily: "DM Sans, sans-serif", color: "#1F2937" }}>Call Details</h2>
                      <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
                        #{selectedCallId}
                      </span>
                    </div>
                    <button
                      onClick={() => { setShowCallDetailsFromProfile(false); setSelectedCallId(null); setIsPlayingRecording(false); setPlaybackSpeed(1); }}
                      className="hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" style={{ color: "#6B7280" }} />
                    </button>
                  </div>

                  {/* Summary */}
                  <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                    <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "DM Sans, sans-serif" }}>Summary</h2>
                    <div className="space-y-4">
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Client</p>
                          <p className="font-semibold text-sm">{client.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Call Time</p>
                          <p className="font-semibold text-sm">Apr 10, 2:30 PM</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Type</p>
                          <span className="inline-flex items-center px-2.5 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">Outbound</span>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Current Stage</p>
                          <p className="font-semibold text-sm">{client.stage || "Insurance Verification"}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Call Status</p>
                          <span className="inline-flex items-center px-2.5 py-0.5 bg-success/10 text-success rounded-full text-xs font-medium">Completed</span>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Duration</p>
                          <p className="font-semibold text-sm">4m 32s</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recording Player */}
                  <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold" style={{ fontFamily: "DM Sans, sans-serif" }}>Recording</h2>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground mr-2">Speed:</span>
                        {[0.5, 0.75, 1, 1.25, 1.5].map((speed) => (
                          <button
                            key={speed}
                            onClick={() => setPlaybackSpeed(speed)}
                            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${playbackSpeed === speed ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 bg-muted rounded-xl">
                        <button
                          onClick={() => setIsPlayingRecording(!isPlayingRecording)}
                          className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
                        >
                          {isPlayingRecording ? (
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                            </svg>
                          ) : (
                            <Play className="w-6 h-6 ml-1" />
                          )}
                        </button>
                        <div className="flex-1">
                          <div className="h-2 bg-border rounded-full overflow-hidden">
                            <div className="h-full bg-primary w-1/3" />
                          </div>
                          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                            <span>1:30</span>
                            <span>4:32</span>
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

                  {/* Transcript */}
                  <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold" style={{ fontFamily: "DM Sans, sans-serif" }}>Transcript</h2>
                      <Tooltip text="Download Transcript">
                        <Button variant="outline" size="sm">
                          <FileText className="w-4 h-4" />
                        </Button>
                      </Tooltip>
                    </div>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      <div className="space-y-4">
                        {[
                          { role: "AI", initials: "AI", name: "AI Agent", ts: "00:05", text: `Hello, this is MantraAssist calling for ${client.name}. Am I speaking with them?` },
                          { role: "client", initials: client.name.split(" ").map((n) => n[0]).join("") || "CL", name: client.name, ts: "00:12", text: `Yes, this is ${client.name.split(" ")[0]} speaking.` },
                          { role: "AI", initials: "AI", name: "AI Agent", ts: "00:16", text: "Great! I'm calling to help with your insurance verification. Do you have a few minutes to discuss?" },
                          { role: "client", initials: client.name.split(" ").map((n) => n[0]).join("") || "CL", name: client.name, ts: "00:20", text: "Sure, I have some time now." },
                          { role: "AI", initials: "AI", name: "AI Agent", ts: "00:24", text: "Perfect! I'll need to verify a few details about your insurance coverage..." },
                        ].map((msg, i) => (
                          <div key={i} className="flex gap-3">
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${msg.role === "AI" ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"}`}>
                              {msg.initials}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm">{msg.name}</span>
                                <span className="text-xs text-muted-foreground">{msg.ts}</span>
                              </div>
                              <p className="text-sm">{msg.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Forms Tab ── */}
          {activeProfileTab === "forms" && (
            <div className="space-y-4">
              {/* Switch bar */}
              <div className="inline-flex border border-border rounded-lg overflow-hidden">
                {(["forms", "flows"] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setFormsTabMode(mode)}
                    className={`px-4 py-2 text-xs font-semibold transition-colors ${formsTabMode === mode ? "text-white" : "bg-white text-[#6B7280] hover:bg-gray-50"
                      }`}
                    style={{
                      fontFamily: "Outfit, sans-serif",
                      backgroundColor: formsTabMode === mode ? "#4F8EF7" : undefined,
                    }}
                  >
                    {mode === "forms" ? "Forms" : "Intake Flows"}
                  </button>
                ))}
              </div>

              {/* ── Forms mode ── */}
              {formsTabMode === "forms" && (
                clientSubmissions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm" style={{ color: '#6B7280', fontFamily: 'Outfit, sans-serif' }}>
                      No forms submitted by this client yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {groupedSubmissions.map(({ form, subs }) => {
                      const templateId = `TPL-${String(form.id).padStart(3, "0")}`;
                      const isGroupExpanded = expandedFormGroupId === form.id;
                      return (
                        <div key={form.id} className="p-5 border border-border rounded-xl bg-white space-y-3 shadow-sm">
                          {/* Header Row */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <h3 className="font-bold text-[16px] text-[#1F2937] truncate" style={{ fontFamily: "DM Sans, sans-serif" }}>
                                {form.name}
                              </h3>
                              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[11px] font-medium text-[#6B7280] shrink-0" style={{ fontFamily: "Outfit, sans-serif" }}>
                                {subs.length}
                              </span>
                            </div>

                            <button
                              onClick={() => setExpandedFormGroupId(isGroupExpanded ? null : form.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-gray-50 transition-colors shrink-0"
                              style={{ fontFamily: "DM Sans, sans-serif", color: "#1F2937" }}
                            >
                              View
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isGroupExpanded ? "rotate-180" : ""}`} />
                            </button>
                          </div>

                          {/* Stack of Submissions */}
                          {isGroupExpanded && (
                            <div className="space-y-3 pt-1">
                              {subs.map((submission) => {
                                const isExpanded = expandedSubmissionId === submission.id;
                                return (
                                  <div key={submission.id} className="p-4 border border-border rounded-xl bg-white space-y-3">
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 flex-1">
                                        <div className="flex flex-col gap-0.5">
                                          <span className="text-[10px] font-bold uppercase" style={{ color: "#9CA3AF", fontFamily: "Outfit, sans-serif", letterSpacing: "0.05em" }}>
                                            Template ID
                                          </span>
                                          <span className="text-sm" style={{ color: "#1F2937", fontFamily: "Outfit, sans-serif" }}>
                                            {templateId}
                                          </span>
                                        </div>

                                        <div className="flex flex-col gap-0.5">
                                          <span className="text-[10px] font-bold uppercase" style={{ color: "#9CA3AF", fontFamily: "Outfit, sans-serif", letterSpacing: "0.05em" }}>
                                            Status
                                          </span>
                                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium w-fit ${submission.status === "completed" ? "bg-green-100 text-green-700"
                                              : submission.status === "pending" ? "bg-amber-100 text-amber-700"
                                                : "bg-red-100 text-red-700"
                                            }`} style={{ fontFamily: "Outfit, sans-serif" }}>
                                            {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                                          </span>
                                        </div>

                                        <div className="flex flex-col gap-0.5">
                                          <span className="text-[10px] font-bold uppercase" style={{ color: "#9CA3AF", fontFamily: "Outfit, sans-serif", letterSpacing: "0.05em" }}>
                                            Sent
                                          </span>
                                          <span className="text-sm" style={{ color: "#1F2937", fontFamily: "Outfit, sans-serif" }}>
                                            {submission.sentAt}
                                          </span>
                                        </div>

                                        <div className="flex flex-col gap-0.5">
                                          <span className="text-[10px] font-bold uppercase" style={{ color: "#9CA3AF", fontFamily: "Outfit, sans-serif", letterSpacing: "0.05em" }}>
                                            Submitted
                                          </span>
                                          <span className="text-sm" style={{ color: "#1F2937", fontFamily: "Outfit, sans-serif" }}>
                                            {submission.submittedAt}
                                          </span>
                                        </div>
                                      </div>

                                      <button
                                        onClick={() => setExpandedSubmissionId(isExpanded ? null : submission.id)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-gray-50 transition-colors shrink-0"
                                        style={{ fontFamily: "DM Sans, sans-serif", color: "#1F2937" }}
                                      >
                                        View
                                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                                      </button>
                                    </div>

                                    {/* Expanded Inline Panel */}
                                    {isExpanded && (
                                      <div className="mt-3 space-y-3 pt-3 border-t border-border">
                                        {Object.entries(submission.fields).map(([label, value]: [string, string]) => (
                                          <div key={label} className="bg-gray-50 rounded-xl p-4">
                                            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>
                                              {label}
                                            </p>
                                            <p className="text-sm" style={{ fontFamily: "Outfit, sans-serif", color: "#1F2937" }}>
                                              {value}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {/* ── Intake Flows mode (new) ── */}
              {formsTabMode === "flows" && (
                clientFlowProgress.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm" style={{ color: "#6B7280", fontFamily: "Outfit, sans-serif" }}>
                      This client hasn't started any intake flow yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {clientFlowProgress.map(({ flow, steps, status, requiredDone, requiredTotal }) => {
                      const isFlowExpanded = expandedFlowId === flow.id;
                      return (
                        <div key={flow.id} className="p-5 border border-border rounded-xl bg-white space-y-3 shadow-sm">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <h3 className="font-bold text-[16px] text-[#1F2937] truncate" style={{ fontFamily: "DM Sans, sans-serif" }}>
                                {flow.name}
                              </h3>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${status === "completed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                                  }`}
                                style={{ fontFamily: "Outfit, sans-serif" }}
                              >
                                {status === "completed" ? "Completed" : "In Progress"}
                              </span>
                            </div>

                            <button
                              onClick={() => setExpandedFlowId(isFlowExpanded ? null : flow.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-gray-50 transition-colors shrink-0"
                              style={{ fontFamily: "DM Sans, sans-serif", color: "#1F2937" }}
                            >
                              View
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isFlowExpanded ? "rotate-180" : ""}`} />
                            </button>
                          </div>

                          {isFlowExpanded && (
                            <>
                              <p className="text-xs" style={{ color: "#9CA3AF", fontFamily: "Outfit, sans-serif" }}>
                                {requiredDone} of {requiredTotal} required steps complete
                              </p>

                              <div className="space-y-0">
                                {steps.map(({ step, form, done, completedOn, submission }, idx) => {
                                  const stepKey = `${flow.id}-${step.formId}-${idx}`;
                                  const isStepExpanded = expandedFlowStepId === stepKey;
                                  return (
                                    <div key={stepKey} className="flex gap-3">
                                      <div className="flex flex-col items-center w-6 shrink-0">
                                        <div
                                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${done ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
                                            }`}
                                          style={{ fontFamily: "DM Sans, sans-serif" }}
                                        >
                                          {done ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                                        </div>
                                        {idx < steps.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1 mb-1" />}
                                      </div>

                                      <div className="flex-1 py-2.5 px-4 mb-2 bg-gray-50 rounded-xl border border-border">
                                        <div className="flex items-center justify-between gap-3">
                                          <div>
                                            <p className="text-sm font-semibold" style={{ fontFamily: "DM Sans, sans-serif", color: "#1F2937" }}>
                                              {form?.name ?? `Form #${step.formId}`}
                                            </p>
                                            <p className="text-xs mt-0.5" style={{ fontFamily: "Outfit, sans-serif", color: "#9CA3AF" }}>
                                              {step.required ? "Required" : "Optional"}
                                              {done && <span className="ml-2" style={{ color: "#6B7280" }}>· Completed {completedOn}</span>}
                                            </p>
                                          </div>

                                          {done && (
                                            <button
                                              onClick={() => setExpandedFlowStepId(isStepExpanded ? null : stepKey)}
                                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-white transition-colors shrink-0"
                                              style={{ fontFamily: "DM Sans, sans-serif", color: "#1F2937" }}
                                            >
                                              View
                                              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isStepExpanded ? "rotate-180" : ""}`} />
                                            </button>
                                          )}
                                        </div>

                                        {isStepExpanded && submission && (
                                          <div className="mt-3 space-y-3 pt-3 border-t border-border">
                                            {Object.entries(submission.fields).map(([label, value]: [string, string]) => (
                                              <div key={label} className="bg-white rounded-xl p-4 border border-border/60">
                                                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>
                                                  {label}
                                                </p>
                                                <p className="text-sm" style={{ fontFamily: "Outfit, sans-serif", color: "#1F2937" }}>
                                                  {value}
                                                </p>
                                              </div>
                                            ))}
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
                      );
                    })}
                  </div>
                )
              )}
            </div>
          )}

          {/* ── Notes Tab ── */}
          {activeProfileTab === "notes" && (
            <div className="space-y-4">
              <textarea
                placeholder="Enter note about this client..."
                className="w-full px-4 py-3 bg-input-background border border-input rounded-xl resize-none"
                style={{ fontFamily: "Outfit, sans-serif" }}
                rows={5}
              />
              <Button variant="primary" className="w-full justify-center">
                <MessageSquare className="w-4 h-4" />
                Add Note
              </Button>
            </div>
          )}

          {/* ── Appointments Tab ── */}
          {activeProfileTab === "appointments" && (() => {
            const stored = sessionStorage.getItem("appointments_v1");
            const all: any[] = stored ? JSON.parse(stored) : [];
            const clientAppts = all.filter((a: any) =>
              (client?.email && a.clientEmail === client.email) ||
              (client?.phone && a.clientPhone === client.phone) ||
              (client?.name && a.clientName === client.name)
            );
            return (
              <div className="space-y-4">
                {clientAppts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Calendar className="w-12 h-12 mb-4" style={{ color: "#D1D5DB" }} />
                    <p className="text-sm font-medium" style={{ color: "#6B7280", fontFamily: "Outfit, sans-serif" }}>No appointments yet</p>
                    <p className="text-xs mt-1" style={{ color: "#9CA3AF", fontFamily: "Outfit, sans-serif" }}>Appointments booked through web forms will appear here.</p>
                  </div>
                ) : (
                  clientAppts.map((appt: any, idx: number) => (
                    <div key={appt.id || idx} className="flex items-start gap-4 p-4 rounded-xl border" style={{ borderColor: "#E5E7EB", backgroundColor: "#F9FAFB" }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#EEF2FF" }}>
                        <CalendarClock className="w-5 h-5" style={{ color: "#4F8EF7" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold" style={{ color: "#1F2937", fontFamily: "Outfit, sans-serif" }}>
                            {appt.service || "Appointment"}
                          </p>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: appt.status === "confirmed" ? "#D1FAE5" : appt.status === "cancelled" ? "#FEE2E2" : "#FEF3C7",
                              color: appt.status === "confirmed" ? "#065F46" : appt.status === "cancelled" ? "#991B1B" : "#92400E",
                              fontFamily: "Outfit, sans-serif",
                            }}
                          >
                            {appt.status || "Pending"}
                          </span>
                        </div>
                        <p className="text-xs mt-1" style={{ color: "#6B7280", fontFamily: "Outfit, sans-serif" }}>
                          {[appt.date, appt.time].filter(Boolean).join(" · ")}
                        </p>
                        {appt.notes && (
                          <p className="text-xs mt-1 italic" style={{ color: "#9CA3AF", fontFamily: "Outfit, sans-serif" }}>{appt.notes}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })()}

          {/* ── Select/Create Field Modals ── */}
          {fieldManagerOpen && fieldManagerMode === "select" && (
            <SelectFieldsModal
              initiallySelected={visibleFieldKeys}
              onlyModules={["client"]}
              onClose={() => setFieldManagerOpen(false)}
              onApply={(keys) => {
                setVisibleFieldKeys(keys);
              }}
            />
          )}

          {fieldManagerOpen && fieldManagerMode === "create" && (
            <CreateFieldModal
              lockModule="client"
              onClose={() => setFieldManagerOpen(false)}
              onCreated={(field) => {
                setVisibleFieldKeys(prev => [...prev, field.key]);
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}
