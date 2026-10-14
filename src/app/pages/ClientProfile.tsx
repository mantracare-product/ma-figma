import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router";
import {
  Search, Plus, X, FileText, Calendar, ChevronLeft, Mail, MapPin, Clock,
  MessageSquare, MessageCircle, LogIn, ArrowRightCircle, PhoneOutgoing, PhoneIncoming, PhoneOff, Settings, CalendarClock,
  Play, ChevronDown, Download, ArrowLeft, Check, Globe, FileSpreadsheet, FileImage, UploadCloud, CheckCircle2, XCircle, Trash2, Eye, CheckCircle,
  Briefcase, ToggleLeft, ToggleRight, DollarSign, User, Wallet, CreditCard, AlertTriangle, Pencil, LayoutGrid, List, Workflow, Layers, Mic,
  GripVertical, MoreVertical, Settings as SettingsIcon, Share2, Send, Stethoscope, Video,
  Tag, ShieldCheck, UserPlus, Info,
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
import {
  useFieldRegistry,
  FieldDefinition,
  resolveVisibility,
  SectionDefinition,
  SECTION_REGISTRY_EVENT,
  LEGACY_SECTION_REGISTRY_EVENT,
  FIELD_REGISTRY_EVENT,
  isFieldMatchingOrg,
  isSectionMatchingOrg,
} from "../context/FieldRegistryContext";
import { useOrganization } from "../context/OrganizationContext";
import { getStoredCallLogs, CallLog, updateProcessCallLogFields, updateProcessCallLogStage, addProcessCallLog, PROCESS_LOGS_STORE_EVENT } from "../../lib/processLogsStore";
import { getMissingRequiredProcessFields, MissingRequiredField } from "../../lib/processFieldValidation";
import RequiredFieldsModal from "../components/deals/RequiredFieldsModal";
import CallDetailDrawer from "../components/telephony/CallDetailDrawer";
import ActivityTab from "../components/activity/ActivityTab";
import ProcessDetailDrawer, { ProcessDetailHistoryFilterState } from "../components/deals/ProcessDetailDrawer";
import ScheduleAppointmentDrawer, { BookingFormValues } from "../components/appointments/ScheduleAppointmentDrawer";
import { appendActivity } from "../../lib/activityEngine";
import { getActivityForProcess, getActivityForClient } from "../../lib/activityLog";
import { CLIENTS_STORE_EVENT, ClientProcessStage } from "../../lib/clientProcessState";
import { useClients, getStoredClients, saveStoredClients } from "../../lib/clientsStore";
import { useInvoices } from "../context/InvoiceContext";
import InvoiceDetailDrawer from "../components/invoices/InvoiceDetailDrawer";
import CreateInvoiceDrawer from "../components/invoices/CreateInvoiceDrawer";
import RecordPaymentModal from "../components/invoices/RecordPaymentModal";
import { ClientInvoice } from "../types/invoiceTypes";
import { invoiceService, hasInvoiceAutomation, hasAppointmentInvoiceAutomation } from "../../lib/invoiceService";
import { appointmentService, hasAppointmentAutomation } from "../../lib/appointmentService";
import { AUTOMATION_STORE_EVENT } from "../../lib/useAutomationStore";
import { PROCESS_STORE_EVENT, getStoredProcesses, Process } from "../../lib/useProcessStore";
import DocumentsTab from "../components/profile/DocumentsTab";
import InvoiceProgressBar from "../components/invoices/InvoiceProgressBar";
import { CHEVRON_PALETTE } from "../components/common/ChevronStageRibbon";
import { DEFAULT_ENTITY_PROCESSES } from "../../lib/useProcessStore";
import TableComponent, { TableColumn, TableRowAction } from "../components/ui/TableComponent";
import PageTopBar from "../components/layout/PageTopBar";
import { Modal } from "../components/ui/Modal";
import AIScribeModal from "../components/scribe/AIScribeModal";
import TranscriptDetailDrawer from "../components/scribe/TranscriptDetailDrawer";
import {
  ScribeSession,
  getScribeSessions,
  saveScribeSession,
  deleteScribeSession,
  issuePrescriptionDocument,
  SCRIBE_EVENT,
  PRESET_SCENARIOS,
} from "../../lib/scribeSessionStore";

import DrawerShell from "../components/ui/DrawerShell";
import CPTCodeInput from "../components/ui/CPTCodeInput";
import DraggableOverviewSections, { OverviewSection } from "../components/profile/DraggableOverviewSections";
import {
  Service, EMPLOYEES as SVC_EMPLOYEES, CURRENCIES as SVC_CURRENCIES, INIT_FORM as SVC_INIT_FORM,
  getCurrencySymbol, getStoredServices, addService, onServicesChanged,
  getClientProducts, assignProductToClient, unassignProductFromClient,
} from "../../lib/servicesStore";
import { eventBus } from "../../lib/eventBus";
import { MOCK_SERVICES } from "../../lib/mockServicesData";

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
  process_entry: "#1F2937",
  call: "#1F2937",
  whatsapp: "#1F2937",
  sms: "#1F2937",
  email: "#1F2937",
  stage_update: "#1F2937",
  stage_change: "#1F2937",
  webhook_trigger: "#1F2937",
  appointment_booked: "#1F2937",
  field_update: "#1F2937",
  process_completed: "#1F2937",
  website_message: "#1F2937",
  website: "#1F2937",
  outbound_call: "#1F2937",
  inbound_call: "#1F2937",
  failed_call: "#1F2937",
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
  receptionist_checkin: "AI Receptionist Check-in",
  receptionist_onboarding_completed: "AI Receptionist Walk-in Onboarding Completed",
  process_assigned: "Process Assigned via Receptionist Rule",
  receptionist_face_enrolled: "Biometric Face Check-in Enrolled",
  receptionist_face_deleted: "Biometric Face Data Deleted",
  kiosk_checkin: "AI Receptionist Check-in",
  kiosk_onboarding_completed: "AI Receptionist Walk-in Onboarding Completed",
  kiosk_face_enrolled: "Biometric Face Check-in Enrolled",
  kiosk_face_deleted: "Biometric Face Data Deleted",
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
  visibleFieldKeys?: string[];
  customSections?: OverviewSection[];
  [key: string]: any;
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

const getAvailableProcessesList = () => {
  const stored = getStoredProcesses();
  const names = stored.map((p) => p.name).filter(Boolean);
  const defaults = [
    "Patient Intake",
    "Client Intake",
    "Client Reactivation",
    "Patient Care Journey",
    "Follow-up Calls",
    "Billing Support",
    "Appointment Scheduling",
    "Insurance Verification",
  ];
  return Array.from(new Set([...names, ...defaults]));
};

const getStagesForProcess = (processName: string) => {
  if (!processName) return [];
  const storedProcesses = getStoredProcesses();
  const matched = storedProcesses.find(
    (p) => p.name?.toLowerCase() === processName.toLowerCase() || p.id === processName
  );
  if (matched && matched.stages && matched.stages.length > 0) {
    return matched.stages.map((s, idx) => ({
      id: s.id || String(idx + 1),
      label: s.name,
      fullLabel: `${matched.name}: ${s.name}`,
      category: matched.name,
    }));
  }

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

  // Reactive client store hook (synced with localStorage, sessionStorage, and BroadcastChannel)
  const { clients, setClients } = useClients();
  const isNewClient = id === "new";
  const initialTarget = isNewClient
    ? null
    : (clients.find((c) => {
        const cleanId = String(id || "").trim().toLowerCase().replace(/^#/, "");
        const cId = String(c.id || "").trim().toLowerCase().replace(/^#/, "");
        return cId === cleanId;
      }) ??
      getStoredClients().find((c) => {
        const cleanId = String(id || "").trim().toLowerCase().replace(/^#/, "");
        const cId = String(c.id || "").trim().toLowerCase().replace(/^#/, "");
        return cId === cleanId;
      }) ??
      null);

  // Custom field and section definitions from shared context (same ones Settings.tsx & Admin manage)
  const { getAllFields, addCustomField, getCustomSections, getAllSections } = useFieldRegistry();
  const { activeOrganization } = useOrganization();

  const handleClose = () => {
    if (onCloseOverride) onCloseOverride();
    else navigate("/clients");
  };

  const DEFAULT_CLIENT_SECTIONS: OverviewSection[] = [
    {
      id: "sec-client-details",
      title: "Client Details",
      fieldKeys: ["name", "email", "phone", "location", "country"],
    },
    {
      id: "sec-company-details",
      title: "Company & Professional",
      fieldKeys: ["company", "role"],
    },
  ];

  const SYSTEM_FIELD_KEYS = new Set([
    "name", "email", "phone", "location", "country",
    "company", "role", "status", "processes", "stage",
    "responsible", "lastContact", "companyName", "jobPosition"
  ]);

  const computeMergedClientSections = (
    existingSections: OverviewSection[] | undefined,
    registryCustomSections: SectionDefinition[],
    registryAllFields: FieldDefinition[],
    org?: any,
    clientVisibleKeys?: string[]
  ): OverviewSection[] => {
    // 1. Only include registry sections that match the organization's scope
    const matchingCustomSecs = (registryCustomSections || []).filter((s) => isSectionMatchingOrg(s, org));
    const matchingCustomSecIds = new Set(matchingCustomSecs.map((s) => s.id));

    // 2. Only include registry fields that match the organization's scope
    const matchingFields = (registryAllFields || []).filter((f) => isFieldMatchingOrg(f, org));
    const allowedFieldKeys = new Set(matchingFields.map((f) => f.key));

    // Start with default template or localStorage overrides if no existing sections
    let fallbackSections = DEFAULT_CLIENT_SECTIONS;
    try {
      const globalSaved = localStorage.getItem("ma_client_overview_sections");
      if (globalSaved) {
        const parsed = JSON.parse(globalSaved);
        if (Array.isArray(parsed) && parsed.length > 0) fallbackSections = parsed;
      }
    } catch {}

    const baseSections: OverviewSection[] =
      existingSections && existingSections.length > 0
        ? existingSections.map((s) => ({ ...s, fieldKeys: [...s.fieldKeys] }))
        : JSON.parse(JSON.stringify(fallbackSections));

    // System section IDs that should never be deleted
    const SYSTEM_SEC_IDS = new Set([
      "sec-client-details",
      "sec-general-info",
      "sec-company-details",
      "sec-company-role",
    ]);

    // Filter out hardcoded sec-custom-fields and sec-process-pipeline, and any custom section that does NOT match current org scope
    let updatedSections = baseSections.filter((s) => {
      if (s.id === "sec-custom-fields" || s.id === "sec-process-pipeline") return false;
      if (SYSTEM_SEC_IDS.has(s.id) || !s.isCustom) return true;
      return matchingCustomSecIds.has(s.id);
    });

    // Update existing custom sections with latest title/description/icon and merge/filter fields
    const registryKeySet = new Set((registryAllFields || []).map((f) => f.key));
    updatedSections = updatedSections.map((s) => {
      const regSec = matchingCustomSecs.find((cs) => cs.id === s.id);

      let mergedKeys = [...s.fieldKeys];
      if (regSec) {
        const assignedFromFields = matchingFields
          .filter((f) => f.sectionId === regSec.id)
          .map((f) => f.key);
        const regKeys = Array.from(new Set([...(regSec.fieldKeys || []), ...assignedFromFields]));

        const existingKeySet = new Set(s.fieldKeys);
        regKeys.forEach((k) => {
          if (!existingKeySet.has(k)) {
            mergedKeys.push(k);
            existingKeySet.add(k);
          }
        });
      }

      // Preserve all fields that are system fields, org fields, already assigned to this section, or in the registry
      const scopedFieldKeys = mergedKeys.filter(
        (k) => SYSTEM_FIELD_KEYS.has(k) || allowedFieldKeys.has(k) || s.fieldKeys.includes(k) || registryKeySet.has(k)
      );

      return {
        ...s,
        title: regSec?.title || s.title,
        description: regSec ? (regSec.description ?? s.description) : s.description,
        iconName: (regSec?.iconName as any) || s.iconName || "layers",
        isCustom: Boolean(s.isCustom || regSec),
        fieldKeys: scopedFieldKeys,
      };
    });

    // Insert any matching registry custom sections that are not yet in updatedSections
    const existingSecIds = new Set(updatedSections.map((s) => s.id));

    matchingCustomSecs.forEach((regSec) => {
      if (!existingSecIds.has(regSec.id)) {
        const assignedFromFields = matchingFields
          .filter((f) => f.sectionId === regSec.id)
          .map((f) => f.key);
        const regKeys = Array.from(new Set([...(regSec.fieldKeys || []), ...assignedFromFields]))
          .filter((k) => SYSTEM_FIELD_KEYS.has(k) || allowedFieldKeys.has(k));

        const newSection: OverviewSection = {
          id: regSec.id,
          title: regSec.title,
          description: regSec.description,
          iconName: (regSec.iconName as any) || "layers",
          isCustom: true,
          fieldKeys: regKeys,
        };

        updatedSections.push(newSection);
        existingSecIds.add(regSec.id);
      }
    });

    return updatedSections;
  };

  const [clientName, setClientName] = useState(initialTarget?.name || "");
  const [clientEmail, setClientEmail] = useState(initialTarget?.email || "");
  const [clientPhone, setClientPhone] = useState(initialTarget?.phone || "");
  const [clientCompany, setClientCompany] = useState(initialTarget?.companyName || "");
  const [clientRole, setClientRole] = useState(initialTarget?.jobPosition || "");
  const [clientStatus, setClientStatus] = useState(initialTarget?.status || "Active");
  const [clientLocation, setClientLocation] = useState(initialTarget?.location || "");
  const [clientCountry, setClientCountry] = useState(initialTarget?.country || "");
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>(initialTarget?.processes ?? []);
  const [dynamicFieldValues, setDynamicFieldValues] = useState<Record<string, any>>({});

  // Keep form fields synced whenever id route changes or client is selected
  useEffect(() => {
    if (id && id !== "new") {
      const cleanId = String(id).trim().toLowerCase().replace(/^#/, "");
      const all = [...clients, ...getStoredClients()];
      const target = all.find((c) => {
        const cId = String(c.id || "").trim().toLowerCase().replace(/^#/, "");
        return cId === cleanId;
      });
      if (target) {
        setClientName(target.name || "");
        setClientEmail(target.email || "");
        setClientPhone(target.phone || "");
        setClientCompany(target.companyName || "");
        setClientRole(target.jobPosition || "");
        setClientStatus(target.status || "Active");
        setClientLocation(target.location || "");
        setClientCountry(target.country || "");
        setSelectedProcesses(target.processes ?? []);
        if ((target as any).customSections) {
          setClientSections((target as any).customSections);
        }
        const dyn: Record<string, any> = {};
        Object.keys(target).forEach((k) => {
          if (!HARDCODED_KEYS.has(k)) {
            dyn[k] = (target as any)[k];
          }
        });
        setDynamicFieldValues(dyn);
      }
    }
  }, [id, clients]);

  const client: Client | null = useMemo(() => {
    if (isNewClient) {
      return {
        id: "new",
        name: clientName || "New Client",
        email: clientEmail || "",
        phone: clientPhone || "",
        country: clientCountry || "US",
        countryCode: "+1",
        countryFlag: "🇺🇸",
        processes: selectedProcesses || [],
        stage: selectedProcesses.length > 0 ? "Initial Contact" : "Unassigned",
        responsible: "Unassigned",
        lastContact: new Date().toISOString().split("T")[0],
        status: clientStatus || "Active",
        location: clientLocation || "",
        companyName: clientCompany || "",
        jobPosition: clientRole || "",
      };
    }

    if (!id) return null;
    const cleanId = String(id).trim().toLowerCase().replace(/^#/, "");
    const all = [...clients, ...getStoredClients()];
    const matched = all.find((c) => {
      const cId = String(c.id || "").trim().toLowerCase().replace(/^#/, "");
      return cId === cleanId;
    });

    return matched || initialTarget || null;
  }, [id, isNewClient, clients, initialTarget, clientName, clientEmail, clientPhone, clientCountry, selectedProcesses, clientStatus, clientLocation, clientCompany, clientRole]);

  const [clientSections, setClientSections] = useState<OverviewSection[]>(() => {
    let savedSections = (initialTarget as any)?.customSections;
    if (!savedSections) {
      try {
        const globalSaved = localStorage.getItem("ma_client_overview_sections");
        if (globalSaved) savedSections = JSON.parse(globalSaved);
      } catch {}
    }
    return computeMergedClientSections(
      savedSections,
      getCustomSections("client"),
      getAllFields("client"),
      activeOrganization,
      initialTarget?.visibleFieldKeys
    );
  });

  // Live-sync custom sections & fields from FieldRegistry (e.g. created/updated in Admin or Settings)
  useEffect(() => {
    const handleSectionsUpdate = () => {
      setClientSections((prev) =>
        computeMergedClientSections(
          prev,
          getCustomSections("client"),
          getAllFields("client"),
          activeOrganization,
          client?.visibleFieldKeys
        )
      );
    };

    window.addEventListener(SECTION_REGISTRY_EVENT, handleSectionsUpdate);
    window.addEventListener(LEGACY_SECTION_REGISTRY_EVENT, handleSectionsUpdate);
    window.addEventListener(FIELD_REGISTRY_EVENT, handleSectionsUpdate);
    window.addEventListener("storage", handleSectionsUpdate);
    return () => {
      window.removeEventListener(SECTION_REGISTRY_EVENT, handleSectionsUpdate);
      window.removeEventListener(LEGACY_SECTION_REGISTRY_EVENT, handleSectionsUpdate);
      window.removeEventListener(FIELD_REGISTRY_EVENT, handleSectionsUpdate);
      window.removeEventListener("storage", handleSectionsUpdate);
    };
  }, [getCustomSections, getAllFields, activeOrganization, client?.visibleFieldKeys]);

  useEffect(() => {
    if (client) {
      setClientName(client.name || "");
      setClientEmail(client.email || "");
      setClientPhone(client.phone || "");
      setClientCompany(client.companyName || "");
      setClientRole(client.jobPosition || "");
      setClientStatus(client.status || "Active");
      setClientLocation(client.location || "");
      setClientCountry(client.country || "");
      setSelectedProcesses(client.processes || []);

      let savedSections = (client as any).customSections;
      if (!savedSections) {
        try {
          const globalSaved = localStorage.getItem("ma_client_overview_sections");
          if (globalSaved) savedSections = JSON.parse(globalSaved);
        } catch {}
      }
      const merged = computeMergedClientSections(
        savedSections,
        getCustomSections("client"),
        getAllFields("client"),
        activeOrganization,
        client.visibleFieldKeys
      );
      setClientSections(merged);

      if ((client as any).customSections && (client as any).customSections.some((s: any) => s.id === "sec-custom-fields")) {
        setClients((prev) =>
          prev.map((c) =>
            c.id === client.id ? { ...c, customSections: merged } : c
          )
        );
      }

      const dyn: Record<string, any> = {};
      Object.keys(client).forEach((k) => {
        if (!HARDCODED_KEYS.has(k)) {
          dyn[k] = (client as any)[k];
        }
      });
      setDynamicFieldValues(dyn);
    }
  }, [client?.id, getCustomSections, getAllFields]);

  // Keep patient portal synced to the client currently viewed on dashboard
  useEffect(() => {
    if (client?.id && client.id !== "new") {
      const cid = String(client.id);
      localStorage.setItem("patient_portal_active_client_id", cid);
      sessionStorage.setItem("patient_portal_active_client_id", cid);
      window.dispatchEvent(new CustomEvent("patient_portal_client_changed", { detail: cid }));
    }
  }, [client?.id]);

  const fieldValues = useMemo(() => {
    return {
      name: clientName,
      email: clientEmail,
      phone: clientPhone,
      company: clientCompany,
      role: clientRole,
      status: clientStatus,
      location: clientLocation,
      country: clientCountry,
      processes: selectedProcesses,
      ...dynamicFieldValues,
    };
  }, [
    clientName,
    clientEmail,
    clientPhone,
    clientCompany,
    clientRole,
    clientStatus,
    clientLocation,
    clientCountry,
    selectedProcesses,
    dynamicFieldValues,
  ]);

  const handleFieldValueChange = (key: string, val: any) => {
    if (key === "name") setClientName(val);
    else if (key === "email") setClientEmail(val);
    else if (key === "phone") setClientPhone(val);
    else if (key === "company") setClientCompany(val);
    else if (key === "role") setClientRole(val);
    else if (key === "status") setClientStatus(val);
    else if (key === "location") setClientLocation(val);
    else if (key === "country") setClientCountry(val);
    else if (key === "processes") setSelectedProcesses(Array.isArray(val) ? val : [val]);
    else {
      setDynamicFieldValues((prev) => ({ ...prev, [key]: val }));
    }

    if (client) {
      setClients((prev) => {
        const nextClients = prev.map((c) => {
          if (c.id !== client.id) return c;
          const updated: any = { ...c };
          if (key === "name") updated.name = val;
          else if (key === "email") updated.email = val;
          else if (key === "phone") updated.phone = val;
          else if (key === "company") updated.companyName = val;
          else if (key === "role") updated.jobPosition = val;
          else if (key === "status") updated.status = val;
          else if (key === "location") updated.location = val;
          else if (key === "country") updated.country = val;
          else if (key === "processes") updated.processes = Array.isArray(val) ? val : [val];
          else {
            updated[key] = val;
          }
          return updated;
        });
        saveStoredClients(nextClients);
        return nextClients;
      });

      // Emit hot update event for Rule Engine & automations
      const clientId = String(client.id);
      const updatedClientData: Record<string, any> = {
        ...client,
        clientId,
        clientName: key === "name" ? val : (clientName || client.name),
        name: key === "name" ? val : (clientName || client.name),
        email: key === "email" ? val : (clientEmail || client.email),
        phone: key === "phone" ? val : (clientPhone || client.phone),
        company: key === "company" ? val : (clientCompany || client.companyName),
        companyName: key === "company" ? val : (clientCompany || client.companyName),
        role: key === "role" ? val : (clientRole || client.jobPosition),
        jobPosition: key === "role" ? val : (clientRole || client.jobPosition),
        status: key === "status" ? val : (clientStatus || client.status),
        location: key === "location" ? val : (clientLocation || client.location),
        country: key === "country" ? val : (clientCountry || client.country),
        ...dynamicFieldValues,
        [key]: val,
        fieldKey: key,
        updatedField: key,
        updatedFields: [key],
        updatedValue: val,
      };

      try {
        eventBus.emit("field.updated", "client", clientId, updatedClientData);
        eventBus.emit("client.field_updated", "client", clientId, updatedClientData);
        eventBus.emit("client.updated", "client", clientId, updatedClientData);
      } catch (e) {
        console.warn("[ClientProfile] Failed to emit field.updated:", e);
      }
    }

    try {
      window.dispatchEvent(new CustomEvent("ma_record_data_changed"));
    } catch {}
  };

  const handleSectionsChange = (newSections: OverviewSection[]) => {
    setClientSections(newSections);
    try {
      localStorage.setItem("ma_client_overview_sections", JSON.stringify(newSections));
    } catch {}
    if (client) {
      const allAssignedKeys = newSections.flatMap((s) => s.fieldKeys);
      setClients((prev) => {
        const updated = prev.map((c) => {
          if (c.id !== client.id) return c;
          return {
            ...c,
            customSections: newSections,
            visibleFieldKeys: allAssignedKeys,
          } as any;
        });
        try {
          sessionStorage.setItem("clients", JSON.stringify(updated));
        } catch {}
        return updated;
      });
      try {
        window.dispatchEvent(new CustomEvent(CLIENTS_STORE_EVENT));
        window.dispatchEvent(new CustomEvent("ma_record_data_changed"));
      } catch {}
    }
  };

  const { getInvoicesByClient, updateInvoiceStatus, deleteInvoice, voidInvoice, simulatePayment } = useInvoices();
  const [selectedDealProcessFilter, setSelectedDealProcessFilter] = useState<string>("All Processes");
  const [showDealProcessesDropdown, setShowDealProcessesDropdown] = useState<boolean>(false);
  const [hoveredDealStageSegment, setHoveredDealStageSegment] = useState<{ logId: string; segIdx: number } | null>(null);

  const [selectedApptProcessFilter, setSelectedApptProcessFilter] = useState<string>("");
  const [showApptProcessesDropdown, setShowApptProcessesDropdown] = useState<boolean>(false);
  const [hoveredApptStageBox, setHoveredApptStageBox] = useState<{ aptId: any; stageIdx: number } | null>(null);
  const [selectedInvoiceForDrawer, setSelectedInvoiceForDrawer] = useState<ClientInvoice | null>(null);
  const [isInvoiceDrawerOpen, setIsInvoiceDrawerOpen] = useState(false);
  const [isCreateInvoiceDrawerOpen, setIsCreateInvoiceDrawerOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const [invoiceWorkflowFilter, setInvoiceWorkflowFilter] = useState("all");
  const [appointmentWorkflowFilter, setAppointmentWorkflowFilter] = useState("all");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>("all");
  const [showScribeModal, setShowScribeModal] = useState(false);


  // All state variables verbatim from Clients.tsx drawer
  const [activeProfileTab, setActiveProfileTab] = useState<"overview" | "processes" | "activity" | "forms" | "appointments" | "invoices" | "documents" | "products">("overview");

  // Assign Process Multi-select & Stage state
  const [isAssignProcessOpen, setIsAssignProcessOpen] = useState(false);
  const [selectedAssignProcess, setSelectedAssignProcess] = useState("");
  const [selectedAssignStage, setSelectedAssignStage] = useState("");
  const [selectedMultiProcesses, setSelectedMultiProcesses] = useState<Record<string, string>>({});
  const [processSearchFilter, setProcessSearchFilter] = useState("");
  const [processLogsVersion, setProcessLogsVersion] = useState(0);

  const isProcessConnectedToPortal = (processName: string): boolean => {
    const allProcs = getStoredProcesses();
    const matched = allProcs.find(
      (p) => p.name?.toLowerCase() === processName.toLowerCase() || p.id === processName
    );
    if (!matched) return false;
    return Boolean(
      matched.connectedToPatientPortal ||
      matched.connectedToAiReceptionist ||
      matched.stages?.some(
        (s) =>
          s.connectedToPatientPortal ||
          s.portalReceptionSettings?.enabledPortal ||
          s.portalReceptionSettings?.enabled
      )
    );
  };

  useEffect(() => {
    const handleLogsUpdate = () => {
      setProcessLogsVersion((v) => v + 1);
    };
    window.addEventListener(PROCESS_LOGS_STORE_EVENT, handleLogsUpdate);
    window.addEventListener("deals_updated", handleLogsUpdate);
    window.addEventListener("storage", handleLogsUpdate);
    return () => {
      window.removeEventListener(PROCESS_LOGS_STORE_EVENT, handleLogsUpdate);
      window.removeEventListener("deals_updated", handleLogsUpdate);
      window.removeEventListener("storage", handleLogsUpdate);
    };
  }, []);

  const handleSaveNewClient = () => {
    if (!clientName.trim()) {
      toast.error("Please enter a client name");
      return;
    }
    const newId = `CL-${String(Math.floor(100 + Math.random() * 900))}`;
    const now = new Date();
    const allAssignedKeys = clientSections.flatMap((s) => s.fieldKeys);
    const createdClient: Client = {
      id: newId,
      name: clientName.trim(),
      email: clientEmail.trim(),
      phone: clientPhone.trim(),
      country: clientCountry || "US",
      countryCode: "+1",
      countryFlag: "🇺🇸",
      processes: selectedProcesses,
      stage: selectedProcesses.length > 0 ? "Initial Contact" : "Unassigned",
      responsible: "Unassigned",
      lastContact: now.toISOString().split("T")[0],
      status: clientStatus || "Active",
      location: clientLocation || "",
      companyName: clientCompany || "",
      jobPosition: clientRole || "",
      customSections: clientSections,
      visibleFieldKeys: allAssignedKeys,
      ...dynamicFieldValues,
    };

    appendActivity({
      clientId: newId,
      processId: "system",
      processName: "Client Onboarding",
      type: "status_change",
      status: "completed",
      sourceStepName: "Client Onboarding",
      details: {
        primary: "Client got created",
        secondary: "Client profile created via drawer",
      },
    } as any);

    try {
      localStorage.setItem("ma_client_overview_sections", JSON.stringify(clientSections));
    } catch {}

    const updated = [createdClient, ...clients];
    setClients(updated);
    sessionStorage.setItem("clients", JSON.stringify(updated));
    try {
      window.dispatchEvent(new CustomEvent(CLIENTS_STORE_EVENT));
      window.dispatchEvent(new CustomEvent("ma_record_data_changed"));
    } catch {}
    toast.success("Client created successfully!");
    handleClose();
  };

  const handleConfirmAssignProcess = () => {
    if (!selectedAssignProcess || !client) return;
    const procName = selectedAssignProcess;
    const stageName = selectedAssignStage || getStagesForProcess(procName)[0]?.label || "Initial Contact";

    // 1. Update client processes list (ensuring no duplicates)
    const currentProcs = Array.isArray(client.processes) ? [...client.processes] : [];
    const updatedProcs = Array.from(new Set([...currentProcs, procName]));

    // 2. Update local state
    setSelectedProcesses(updatedProcs);
    setDrawerProcessStages((prev) => ({
      ...prev,
      [procName]: stageName,
    }));
    setSelectedDealProcessFilter(procName);

    const clientIdStr = String(client.id);

    // 3. Create/update call log in processLogsStore
    addProcessCallLog({
      clientId: clientIdStr,
      clientName: client.name,
      processName: procName,
      stageName: stageName,
    });
    updateProcessCallLogStage(clientIdStr, procName, stageName);

    // 4. Update Client in global Clients store and persistent storage
    const stored = getStoredClients();
    const nextClients = stored.map((c) => {
      if (String(c.id).toLowerCase() !== clientIdStr.toLowerCase()) return c;
      const existingStages = (c as any).processStagesMap || {};
      return {
        ...c,
        processes: updatedProcs,
        stage: stageName,
        processStagesMap: { ...existingStages, [procName]: stageName },
      };
    });
    saveStoredClients(nextClients);
    setClients(nextClients);

    // 5. Save to Deals store for Kanban view
    try {
      const rawDeals = localStorage.getItem("deals") || sessionStorage.getItem("deals");
      const existingDeals: any[] = rawDeals ? JSON.parse(rawDeals) : [];
      const dealStageStr = `${procName}: ${stageName}`;
      const existingDealIndex = existingDeals.findIndex(
        (d) =>
          (d.clientName?.toLowerCase() === client.name.toLowerCase() || d.clientId === clientIdStr) &&
          (d.stage?.toLowerCase().startsWith(`${procName.toLowerCase()}:`) || d.dealName?.toLowerCase().includes(procName.toLowerCase()))
      );

      if (existingDealIndex >= 0) {
        existingDeals[existingDealIndex] = {
          ...existingDeals[existingDealIndex],
          stage: dealStageStr,
        };
      } else {
        const newDeal = {
          id: `DEAL-${clientIdStr}-${Date.now().toString().slice(-4)}`,
          dealName: `${client.name} - ${procName}`,
          clientName: client.name,
          clientId: clientIdStr,
          amount: 0,
          currency: "₹",
          createdDate: new Date().toISOString().split("T")[0],
          status: "In Progress" as const,
          responsible: (client as any).responsible || "Unassigned",
          stage: dealStageStr,
        };
        existingDeals.unshift(newDeal);
      }

      localStorage.setItem("deals", JSON.stringify(existingDeals));
      sessionStorage.setItem("deals", JSON.stringify(existingDeals));
      window.dispatchEvent(new Event("deals_updated"));
    } catch (e) {
      console.warn("Could not save to deals store:", e);
    }

    try {
      localStorage.setItem("patient_portal_active_client_id", clientIdStr);
      sessionStorage.setItem("patient_portal_active_client_id", clientIdStr);
      window.dispatchEvent(new CustomEvent("patient_portal_client_changed", { detail: clientIdStr }));
      window.dispatchEvent(new CustomEvent(CLIENTS_STORE_EVENT, { detail: nextClients }));
      window.dispatchEvent(new CustomEvent("ma_record_data_changed"));
    } catch {}

    setProcessLogsVersion((v) => v + 1);
    setIsAssignProcessOpen(false);
    setSelectedAssignProcess("");
    setSelectedAssignStage("");
    toast.success(`Process ${procName} assigned successfully!`);
  };

  // ── Transcripts Tab State ──
  const [scribeSessions, setScribeSessions] = useState<ScribeSession[]>(getScribeSessions());
  const [selectedTranscriptSession, setSelectedTranscriptSession] = useState<ScribeSession | null>(null);
  const [isTranscriptDrawerOpen, setIsTranscriptDrawerOpen] = useState(false);
  const [transcriptSearchQuery, setTranscriptSearchQuery] = useState("");
  const [showTranscriptWhatsAppModal, setShowTranscriptWhatsAppModal] = useState(false);
  const [transcriptWhatsAppTarget, setTranscriptWhatsAppTarget] = useState<ScribeSession | null>(null);
  const [transcriptSelectedRows, setTranscriptSelectedRows] = useState<Set<string>>(new Set());
  const [transcriptOpenMenuId, setTranscriptOpenMenuId] = useState<string | null>(null);

  // Close transcript kebab menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".transcript-kebab-container")) {
        setTranscriptOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync Scribe Sessions from store
  useEffect(() => {
    const handleUpdate = () => {
      setScribeSessions(getScribeSessions());
    };
    window.addEventListener(SCRIBE_EVENT, handleUpdate);
    return () => window.removeEventListener(SCRIBE_EVENT, handleUpdate);
  }, []);

  // ── Products tab state ──
  const [clientProductList, setClientProductList] = useState<Service[]>([]);
  const [globalServiceList, setGlobalServiceList] = useState<Service[]>(getStoredServices());
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [assignSearch, setAssignSearch] = useState("");
  const [showNewProductDrawer, setShowNewProductDrawer] = useState(false);
  const [newProductForm, setNewProductForm] = useState({ ...SVC_INIT_FORM });
  const [showEmpDropProduct, setShowEmpDropProduct] = useState(false);
  const [empSearchProduct, setEmpSearchProduct] = useState("");
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
  const [selectedSubmissionForView, setSelectedSubmissionForView] = useState<any | null>(null);
  const [formsTabMode, setFormsTabMode] = useState<"forms" | "flows">("forms");
  const [formSearchQuery, setFormSearchQuery] = useState("");
  const [expandedFlowStepId, setExpandedFlowStepId] = useState<string | null>(null);
  const [expandedFlowId, setExpandedFlowId] = useState<number | null>(null);
  const [expandedFormGroupId, setExpandedFormGroupId] = useState<number | null>(null);
  const [activeProcessTabDrawer, setActiveProcessTabDrawer] = useState<string>("all");
  const [editingProcesses, setEditingProcesses] = useState(false);
  const [processDropdownOpen, setProcessDropdownOpen] = useState(false);
  const [drawerProcessStages, setDrawerProcessStages] = useState<Record<string, string>>({});
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);
  const [showFieldPicker, setShowFieldPicker] = useState(false);

  // ── Sync product assignments when clientId changes ──
  useEffect(() => {
    if (!client) return;
    setClientProductList(getClientProducts(client.id));
    const unsub = onServicesChanged(() => {
      setGlobalServiceList(getStoredServices());
      setClientProductList(getClientProducts(client.id));
    });
    return unsub;
  }, [client?.id]);



  // Documents initialization & action handlers with clientDocumentsStore sync


  // appointments tab
  const [appointments, setAppointments] = useState<any[]>([]);
  const [showCallDetailsFromProfile, setShowCallDetailsFromProfile] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  // ── Appointments Tab State ──
  const [appointmentSearchQuery, setAppointmentSearchQuery] = useState("");
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState<string>("all");
  const [appointmentRefreshKey, setAppointmentRefreshKey] = useState(0);
    const [automationVersion, setAutomationVersion] = useState(0);
  const availableProcesses = useMemo(() => {
    return getAvailableProcessesList();
  }, [automationVersion]);

  useEffect(() => {
    const handleUpdate = () => setAutomationVersion((v) => v + 1);
    window.addEventListener(AUTOMATION_STORE_EVENT, handleUpdate);
    window.addEventListener(PROCESS_STORE_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(AUTOMATION_STORE_EVENT, handleUpdate);
      window.removeEventListener(PROCESS_STORE_EVENT, handleUpdate);
    };
  }, []);

  const handleUpdateApptStatus = (apptId: any, newStatus: string) => {
    try {
      if (newStatus === "completed") {
        appointmentService.completeAppointment(apptId);
      } else if (newStatus === "cancelled") {
        appointmentService.cancelAppointment(apptId);
      } else {
        appointmentService.updateAppointment(apptId, { status: newStatus as any });
      }
    } catch {}
    setAppointmentRefreshKey((k) => k + 1);
    toast.success(`Appointment marked as ${newStatus}`);
  };

  const handleDeleteAppt = (apptId: any) => {
    const stored = sessionStorage.getItem("appointments_v1");
    const all: any[] = stored ? JSON.parse(stored) : [];
    const updated = all.filter((a: any) => String(a.id) !== String(apptId));
    sessionStorage.setItem("appointments_v1", JSON.stringify(updated));
    setAppointmentRefreshKey((k) => k + 1);
    toast.success("Appointment deleted");
  };

  // Schedule appointment from Activity tab
  const [showScheduleApptFromActivity, setShowScheduleApptFromActivity] = useState(false);
  const [activityBookingValues, setActivityBookingValues] = useState<BookingFormValues>({
    title: "",
    description: "",
    note: "",
    tags: "",
    processId: "",
    stageId: "",
    date: new Date().toISOString().split("T")[0],
    startHour: 9,
    startMinute: 0,
    sessionType: "video",
    client: client ? {
      id: 0,
      name: client.name,
      email: client.email,
      phone: client.phone,
    } : null,
    provider: null,
  });

  const handleActivityBookingComplete = () => {
    if (!activityBookingValues.client || !activityBookingValues.provider || !activityBookingValues.date || !activityBookingValues.title.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    const hh = String(activityBookingValues.startHour).padStart(2, "0");
    const mm = String(activityBookingValues.startMinute).padStart(2, "0");
    const timeStr = `${hh}:${mm}`;
    const dateFormatted = new Date(activityBookingValues.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    // Save via canonical appointmentService
    appointmentService.createAppointment({
      clientName: activityBookingValues.client.name,
      clientEmail: activityBookingValues.client.email,
      clientPhone: activityBookingValues.client.phone,
      employeeId: activityBookingValues.provider.id,
      serviceId: activityBookingValues.serviceId ? Number(activityBookingValues.serviceId) : 1,
      date: activityBookingValues.date,
      time: timeStr,
      duration: 60,
      notes: activityBookingValues.note || activityBookingValues.description || undefined,
      title: activityBookingValues.title.trim(),
      clientId: String(client.id),
      location: activityBookingValues.sessionType === "inPerson" ? "In-Person" : "Video Call",
      sessionType: activityBookingValues.sessionType,
      processId: activityBookingValues.processId,
      stageId: activityBookingValues.stageId,
      generateInvoice: activityBookingValues.generateInvoice ?? hasAppointmentInvoiceAutomation(activityBookingValues.processId || client.processes?.[0]),
      lineItems: activityBookingValues.lineItems,
      discountAmount: activityBookingValues.discountAmount,
      source: "screen",
    });
    setAppointmentRefreshKey((k) => k + 1);
    // Append activity entry
    if (client) {
      const pId = activityBookingValues.processId;
      appendActivity({
        type: "appointment_booked",
        clientId: String(client.id),
        processId: pId,
        processName: pId,
        timestamp: new Date().toISOString(),
        status: "scheduled",
        date: dateFormatted,
        time: timeStr,
        appointmentTitle: activityBookingValues.title.trim(),
        location: activityBookingValues.sessionType === "inPerson" ? "In-Person" : "Video Call",
        notes: activityBookingValues.note || undefined,
        details: {
          primary: activityBookingValues.title.trim(),
          secondary: `${dateFormatted} at ${timeStr} · ${activityBookingValues.provider.name}`,
        },
      });
    }
    toast.success("Appointment scheduled successfully!");
    setShowScheduleApptFromActivity(false);
  };
  const getDealStageObjectsForProcess = (processName: string, currentStageName?: string): Array<{
    id: string;
    name: string;
    color: string;
    isFinalStage?: boolean;
    isInitial?: boolean;
    stageCategory?: "in_progress" | "success" | "lost";
    stagePosition?: "initial" | "intermediate" | "final" | null;
    intentTrigger?: string;
  }> => {
    if (!processName) {
      return currentStageName
        ? [{ id: "1", name: currentStageName, color: CHEVRON_PALETTE[0] }]
        : [];
    }
    const cleanName = processName.trim().toLowerCase();
    const storedProcs = getStoredProcesses();
    const foundProc = storedProcs.find(
      (p) => p.name.trim().toLowerCase() === cleanName || p.id === processName
    );
    if (foundProc && foundProc.stages && foundProc.stages.length > 0) {
      return foundProc.stages.map((s, idx) => ({
        id: s.id || `stg-${idx}`,
        name: s.name,
        color: s.color || CHEVRON_PALETTE[idx % CHEVRON_PALETTE.length],
        isFinalStage: Boolean(s.isFinalStage || s.isFinal),
        isInitial: s.isInitial,
        stageCategory: (s as any).stageCategory || s.systemCategory,
        stagePosition: s.stagePosition,
        intentTrigger: (s as any).intentTrigger,
      }));
    }
    const options = getStagesForProcess(processName);
    if (options && options.length > 0) {
      return options.map((o, idx) => ({
        id: `stg-${idx}`,
        name: o.label,
        color: CHEVRON_PALETTE[idx % CHEVRON_PALETTE.length],
        isFinalStage: idx === options.length - 1,
      }));
    }
    if (currentStageName) {
      const clean = currentStageName.includes(":") ? currentStageName.split(":")[1].trim() : currentStageName.trim();
      return [{ id: "1", name: clean, color: CHEVRON_PALETTE[0] }];
    }
    return [];
  };

  const getDealStageIndexForProcess = (processName: string, currentStageName: string): number => {
    const objs = getDealStageObjectsForProcess(processName, currentStageName);
    const cleanCurrent = (currentStageName || "").includes(":")
      ? currentStageName.split(":")[1].trim().toLowerCase()
      : (currentStageName || "").trim().toLowerCase();
    const idx = objs.findIndex((o) => o.name.trim().toLowerCase() === cleanCurrent);
    return idx >= 0 ? idx + 1 : 1;
  };

  const lightenHex = (hex: string, percent: number = 75): string => {
    if (!hex || typeof hex !== "string") return "#F1F5F9";
    let col = hex.replace("#", "").trim();
    if (col.length === 3) col = col.split("").map((ch) => ch + ch).join("");
    const num = parseInt(col, 16);
    if (isNaN(num)) return hex;
    const factor = percent / 100;
    const r = Math.max(0, Math.min(255, Math.round(((num >> 16) & 255) + (255 - ((num >> 16) & 255)) * factor)));
    const g = Math.max(0, Math.min(255, Math.round(((num >> 8) & 255) + (255 - ((num >> 8) & 255)) * factor)));
    const b = Math.max(0, Math.min(255, Math.round((num & 255) + (255 - (num & 255)) * factor)));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  const handleUpdateLogStage = (log: any, stageName: string) => {
    if (!client) return;
    const cid = String(client.id);
    const procName = log.process;

    setDrawerProcessStages((prev) => ({ ...prev, [procName]: stageName }));

    // 1. Update Client in global Clients store and persistent storage
    const stored = getStoredClients();
    const nextClients = stored.map((c) => {
      if (String(c.id).toLowerCase() !== cid.toLowerCase() && c.name?.toLowerCase() !== client.name.toLowerCase()) return c;
      const existingStages = (c as any).processStagesMap || {};
      return {
        ...c,
        stage: stageName,
        lastUpdatedProcess: procName,
        processStagesMap: { ...existingStages, [procName]: stageName },
      };
    });
    saveStoredClients(nextClients);
    setClients(nextClients);

    // 2. Update call logs in processLogsStore & deals
    updateProcessCallLogStage(cid, procName, stageName);

    // 3. Ensure patient portal active client is set
    try {
      localStorage.setItem("patient_portal_active_client_id", cid);
      sessionStorage.setItem("patient_portal_active_client_id", cid);
      window.dispatchEvent(new CustomEvent("patient_portal_client_changed", { detail: cid }));
      window.dispatchEvent(new CustomEvent(CLIENTS_STORE_EVENT, { detail: nextClients }));
      window.dispatchEvent(new CustomEvent("ma_record_data_changed"));
    } catch {}

    setProcessLogsVersion((v) => v + 1);
    toast.success(`Stage updated to ${stageName}`);
  };

  const appointmentProcesses: Process[] = useMemo(() => {
    const procs = getStoredProcesses();
    const apptProcs = procs.filter((p) => p.entityType === "appointment");
    return apptProcs.length > 0 ? apptProcs : [DEFAULT_ENTITY_PROCESSES.appointment];
  }, [automationVersion]);

  useEffect(() => {
    if (appointmentProcesses.length > 0) {
      if (!selectedApptProcessFilter || !appointmentProcesses.some((p) => p.id === selectedApptProcessFilter)) {
        setSelectedApptProcessFilter(appointmentProcesses[0].id);
      }
    }
  }, [appointmentProcesses, selectedApptProcessFilter]);

  const selectedApptProc: Process = useMemo(() => {
    return appointmentProcesses.find((p) => p.id === selectedApptProcessFilter) || appointmentProcesses[0];
  }, [appointmentProcesses, selectedApptProcessFilter]);

  const handleQuickApptStageChange = (apt: any, stage: any) => {
    const stored = sessionStorage.getItem("appointments_v1");
    const all: any[] = stored ? JSON.parse(stored) : [];
    const updated = all.map((a: any) =>
      String(a.id) === String(apt.id)
        ? {
            ...a,
            currentStageId: stage.id,
            stageId: stage.id,
            statusLabel: stage.name,
            status: stage.systemCategory === "completed" || stage.name.toLowerCase().includes("completed") ? "completed" : a.status
          }
        : a
    );
    sessionStorage.setItem("appointments_v1", JSON.stringify(updated));
    setAppointmentRefreshKey((k) => k + 1);
    toast.success(`Appointment moved to ${stage.name} ✓`);
  };

  const invoiceProcess: Process = useMemo(() => {
    const procs = getStoredProcesses();
    return procs.find((p) => p.entityType === "invoice") || DEFAULT_ENTITY_PROCESSES.invoice;
  }, [automationVersion]);

  const getInvoiceActivityText = (inv: ClientInvoice) => {
    switch (inv.status) {
      case "paid":
        return `Payment received (${inv.total.toFixed(2)}) - ${inv.paidAt?.split("T")[0] || "Completed"}`;
      case "viewed":
        return "Viewed by client online";
      case "sent":
        return "Sent via WhatsApp & Email";
      case "overdue":
        return "Payment past due - Overdue notice sent";
      case "void":
        return "Invoice voided";
      default:
        return "Draft created";
    }
  };

  const handleUpdateInvoiceStatus = (invoiceId: string, newStatusOrStageId: any) => {
    const stage = invoiceProcess.stages.find((s) => s.id === newStatusOrStageId || s.systemCategory === newStatusOrStageId);
    if (stage) {
      invoiceService.moveToStage(invoiceId, stage.id, { type: "manual", ruleName: `Stage changed to ${stage.name}` });
      toast.success(`Invoice moved to ${stage.name} ✓`);
    } else {
      updateInvoiceStatus(invoiceId, newStatusOrStageId);
    }
  };

  const [selectedProcessIds, setSelectedProcessIds] = useState<string[]>([]);
  const [processSearchQuery, setProcessSearchQuery] = useState("");

  const [showProcessDetailDrawer, setShowProcessDetailDrawer] = useState(false);
  const [selectedProcessLog, setSelectedProcessLog] = useState<CallLog | null>(null);
  const [processDetailTab, setProcessDetailTab] = useState<"general" | "activity" | "history" | "documents">("general");
  const [drawerVisibleFields, setDrawerVisibleFields] = useState<string[]>([
    "currentStage",
    "status",
    "responsible",
    "dealType",
    "source",
    "created",
  ]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showResponsibleDropdown, setShowResponsibleDropdown] = useState(false);
  const [processFieldManagerOpen, setProcessFieldManagerOpen] = useState(false);
  const [processFieldManagerMode, setProcessFieldManagerMode] = useState<"select" | "create">("select");
  const [historyFilters, setHistoryFilters] = useState<ProcessDetailHistoryFilterState>({
    showPopup: false,
    quickFilter: null,
    eventTypeFilter: "all",
    createdByFilter: "all",
    dateFilter: "all",
    filtersActive: false,
    showAddFieldPopup: false,
    activeFilterFields: [],
    selectedAddFields: [],
  });

  const [clientProfileRequiredModal, setClientProfileRequiredModal] = useState<{
    isOpen: boolean;
    processId: string;
    processName: string;
    targetStageName: string;
    missingFields: MissingRequiredField[];
    initialValues: Record<string, any>;
  }>({
    isOpen: false,
    processId: "",
    processName: "",
    targetStageName: "",
    missingFields: [],
    initialValues: {},
  });

  const handleProcessTableStageClick = (proc: { id: string; name: string }, targetStageLabel: string) => {
    if (!client) return;
    const allLogs = getStoredCallLogs();
    const matchingLog = allLogs.find(
      (l) => (l.clientId === client.id || (l.client && l.client.toLowerCase() === client.name.toLowerCase())) &&
             (l.process.toLowerCase() === proc.name.toLowerCase())
    );
    const procFieldValues: Record<string, any> = {
      ...(matchingLog || {}),
      ...editedValues,
      client_name: client.name,
      email: client.email,
      phone: client.phone,
    };
    const allProcFields = getAllFields("process");
    const missing = getMissingRequiredProcessFields({
      processId: proc.id,
      processName: proc.name,
      currentStageName: targetStageLabel,
      allFields: allProcFields,
      fieldValues: procFieldValues,
    });

    if (missing.length > 0) {
      setClientProfileRequiredModal({
        isOpen: true,
        processId: proc.id,
        processName: proc.name,
        targetStageName: targetStageLabel,
        missingFields: missing,
        initialValues: procFieldValues,
      });
      return;
    }

    setDrawerProcessStages((prev) => ({ ...prev, [proc.id]: targetStageLabel }));
    updateProcessCallLogStage(String(client.id), proc.name, targetStageLabel);
    toast.success(`Stage updated to ${targetStageLabel}`);
  };

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

  // ─── Derived data (verbatim from Clients.tsx) ─────────────────────────────

  const drawerClientProcesses = useMemo(() => {
    if (!client) return [];
    const storedCallLogs = getStoredCallLogs().filter(
      (l) => l.clientId === client.id || l.client.toLowerCase() === client.name.toLowerCase()
    );
    const realStages: ClientProcessStage[] = (client as any).processStages ?? [];
    const headings = new Set<string>();

    storedCallLogs.forEach((l) => headings.add(l.process));
    (client.processes || []).forEach((processName) => {
      const parts = processName.split(":");
      if (parts.length >= 1) headings.add(parts[0].trim());
    });
    (selectedProcesses || []).forEach((processName) => {
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
  }, [client, selectedProcesses, drawerProcessStages, processLogsVersion]);

  const drawerActivityItems = useMemo(() => {
    if (!client || client.id === "new") return [];
    const findProcessId = (heading: string) => {
      const process = drawerClientProcesses.find((p) => p.name === heading);
      return process?.id || "process-1";
    };
    const mockItems = [
      {
        id: "act-created-initial",
        processId: "system",
        processName: "Client Creation",
        clientId: client.id,
        type: "status_change" as const,
        timestamp: "2024-04-01T09:00:00",
        date: "Apr 1, 2024",
        time: "9:00 AM",
        status: "completed",
        sourceStepName: "Client Onboarding",
        details: {
          primary: "Client got created",
          secondary: "Client record registered",
        },
      },
      {
        id: "act-1",
        processId: findProcessId("Patient Intake"),
        processName: "Patient Intake",
        clientId: client.id,
        type: "process_completed" as const,
        timestamp: "2024-04-13T14:30:00",
        date: "Apr 13, 2024",
        time: "2:30 PM",
        title: "Process Completed",
        status: "completed",
        sourceStepName: "Deal Closed",
        details: {
          primary: "Final Stage: Insurance Verification",
          secondary: "Process: Patient Intake",
        },
      },
      {
        id: "act-2",
        processId: findProcessId("Patient Intake"),
        processName: "Patient Intake",
        clientId: client.id,
        type: "appointment_booked" as const,
        timestamp: "2024-04-12T15:00:00",
        date: "Apr 12, 2024",
        time: "10:00 AM",
        status: "confirmed",
        sourceStepName: "Schedule Appointment Step",
        appointmentTitle: "Initial Consultation",
        location: "Main Clinic, Room 3",
        notes: "First appointment – bring insurance card",
        details: {
          primary: "Apr 12, 2024 · 10:00 AM",
          secondary: "Location: Main Clinic",
        },
      },
      {
        id: "act-3",
        processId: findProcessId("Patient Intake"),
        processName: "Patient Intake",
        clientId: client.id,
        type: "email" as const,
        timestamp: "2024-04-12T09:30:00",
        date: "Apr 12, 2024",
        time: "9:30 AM",
        status: "delivered",
        direction: "sent" as const,
        subject: "Welcome to Patient Intake — Next Steps",
        bodyPreview: "Hi there! We're excited to have you in the Patient Intake program. Please review the attached documents and complete your intake form before your first appointment.",
        toOrFrom: client.email || "client@email.com",
        sourceStepName: "Welcome Email Campaign",
        details: {
          primary: "Welcome to Patient Intake — Next Steps",
          secondary: `To: ${client.email || "client"}`,
        },
      },
      {
        id: "act-4",
        processId: findProcessId("Patient Intake"),
        processName: "Patient Intake",
        clientId: client.id,
        type: "stage_update" as const,
        timestamp: "2024-04-11T14:00:00",
        date: "Apr 11, 2024",
        time: "2:00 PM",
        status: "completed",
        sourceStepName: "Pipeline Automation",
        fromStage: "Initial Contact",
        toStage: "Insurance Verification",
        details: {
          primary: "Moved to Insurance Verification",
          secondary: "Process: Patient Intake",
        },
      },
      {
        id: "act-5",
        processId: findProcessId("Patient Intake"),
        processName: "Patient Intake",
        clientId: client.id,
        type: "outbound_call" as const,
        timestamp: "2024-04-10T11:30:00",
        date: "Apr 10, 2024",
        time: "11:30 AM",
        status: "completed",
        direction: "outbound" as const,
        callId: "CALL-001",
        durationSeconds: 272,
        outcomeSummary: "Client confirmed insurance details and appointment time.",
        sourceStepName: "Outbound Call Step",
        details: {
          primary: "Duration 4:32",
          secondary: "Status: Completed",
        },
      },
      {
        id: "act-6",
        processId: findProcessId("Patient Intake"),
        processName: "Patient Intake",
        clientId: client.id,
        type: "whatsapp" as const,
        refId: "conv-1",
        timestamp: "2024-04-09T10:15:00",
        date: "Apr 9, 2024",
        time: "10:15 AM",
        status: "delivered",
        direction: "sent" as const,
        messageText: "Hi! Your appointment for Apr 12 at 10:00 AM has been confirmed at Main Clinic. Please bring your insurance card. See you then! 😊",
        phoneNumber: client.phone || "+1 (555) 123-4567",
        sourceStepName: "Onboarding Flow",
        details: {
          primary: "Appointment reminder sent",
          secondary: `To: ${client.phone || "phone"}`,
        },
      },
      {
        id: "act-sms-1",
        processId: findProcessId("Follow-up Calls"),
        processName: "Follow-up Calls",
        clientId: client.id,
        type: "sms" as const,
        refId: "conv-sms-1",
        timestamp: "2024-04-09T08:30:00",
        date: "Apr 9, 2024",
        time: "8:30 AM",
        status: "delivered",
        direction: "sent" as const,
        messageText: "Hi! This is an SMS reminder regarding your upcoming appointment. Reply YES to confirm or call us if you need to reschedule.",
        phoneNumber: client.phone || "+1 (555) 123-4567",
        sourceStepName: "SMS Automation",
        details: {
          primary: "Hi! This is an SMS reminder regarding your upcoming appointment. Reply YES to confirm or call us if you need to reschedule.",
          secondary: `To: ${client.phone || "phone"}`,
        },
      },
      {
        id: "act-7",
        processId: findProcessId("Follow-up Calls"),
        processName: "Follow-up Calls",
        clientId: client.id,
        type: "failed_call" as const,
        timestamp: "2024-04-08T16:45:00",
        date: "Apr 8, 2024",
        time: "4:45 PM",
        status: "no_answer",
        direction: "outbound" as const,
        callId: "CALL-010",
        durationSeconds: 0,
        sourceStepName: "Follow-up Dialer",
        details: {
          primary: "Duration 0:00",
          secondary: "No answer from recipient",
        },
      },
      {
        id: "act-8",
        processId: findProcessId("Follow-up Calls"),
        processName: "Follow-up Calls",
        clientId: client.id,
        type: "inbound_call" as const,
        timestamp: "2024-04-08T11:20:00",
        date: "Apr 8, 2024",
        time: "11:20 AM",
        status: "completed",
        direction: "inbound" as const,
        callId: "CALL-007",
        durationSeconds: 235,
        outcomeSummary: "Client called to ask about insurance documentation requirements.",
        sourceStepName: "Inbound Hotline",
        details: {
          primary: "Duration 3:55",
          secondary: "Status: Completed",
        },
      },
    ];

    // Use real activity log when available; fall back to mock for demo clients
    const realActivity = getActivityForClient(String(client.id)).map((r: any) => ({
      ...r,
      id: r.id,
      processId: r.processId || drawerClientProcesses.find((p) => p.name === r.processName)?.id || "process-1",
      processName: r.processName,
      type: r.type,
      rawType: r.type,
      refId: r.refId,
      timestamp: r.timestamp,
      rawTimestamp: r.timestamp,
      fullTimestamp: new Date(r.timestamp).toLocaleString(),
      date: new Date(r.timestamp).toLocaleDateString(),
      time: new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      title: r.details?.primary || r.messageText || r.appointmentTitle || "Activity",
      description: r.details?.secondary,
      details: r.details || { primary: r.messageText || "Activity" },
      sourceStepName: r.sourceStepName || r.details?.secondary,
      status: r.status === "success" ? "Completed" : r.status,
    }));

    const isSeedClient = ["CL-001", "CL-002", "CL-003", "CL-004", "CL-005", "CL-006", "CL-007", "CL-008", "CL-009", "CL-010", "CL-011", "CL-012"].includes(String(client.id));
    const rawList = realActivity.length > 0 ? realActivity : (isSeedClient ? mockItems : []);

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
  }, [client?.id, drawerClientProcesses, isNewClient]);

  const getDrawerActivityCount = (processId: string) => {
    if (processId === "all") return drawerActivityItems.length;
    return drawerActivityItems.filter((item) => item.processId === processId).length;
  };

  const selectedDrawerProcess = useMemo(() => {
    return drawerClientProcesses.find((p) => p.id === activeProcessTabDrawer);
  }, [drawerClientProcesses, activeProcessTabDrawer]);

  const filteredDrawerActivities = useMemo(() => {
    if (activeProcessTabDrawer === "all") return drawerActivityItems;
    return drawerActivityItems.filter(
      (item: any) => item.processId === activeProcessTabDrawer || item.processName === selectedDrawerProcess?.name
    );
  }, [drawerActivityItems, activeProcessTabDrawer, selectedDrawerProcess]);

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

  const clientSubmissions = client ? allSubmissions.filter(s => s.clientId === client.id) : [];
  const groupedSubmissions = allForms.map(form => {
    const subs = clientSubmissions.filter(s => s.formId === form.id);
    return { form, subs };
  }).filter(group => group.subs.length > 0);

  type FormSubmissionRow = {
    id: string;
    templateId: string;
    formName: string;
    formId: number;
    status: string;
    sentAt: string;
    submittedAt: string;
    submission: (typeof clientSubmissions)[number];
  };

  const formSubmissionRows: FormSubmissionRow[] = useMemo(() => {
    return clientSubmissions.map((sub) => {
      const form = allForms.find((f) => f.id === sub.formId);
      return {
        id: sub.id,
        templateId: `TPL-${String(sub.formId).padStart(3, "0")}`,
        formName: form?.name || `Form #${sub.formId}`,
        formId: sub.formId,
        status: sub.status,
        sentAt: sub.sentAt || "—",
        submittedAt: sub.submittedAt || "—",
        submission: sub,
      };
    });
  }, [clientSubmissions, allForms]);

  const filteredFormSubmissionRows = useMemo(() => {
    if (!formSearchQuery.trim()) return formSubmissionRows;
    const q = formSearchQuery.toLowerCase();
    return formSubmissionRows.filter(r =>
      r.templateId.toLowerCase().includes(q) ||
      r.formName.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q)
    );
  }, [formSubmissionRows, formSearchQuery]);

  const formColumns: TableColumn<FormSubmissionRow>[] = [
    {
      id: "templateId",
      header: "Template ID",
      render: (row) => (
        <span
          className="font-mono text-xs font-semibold text-[#1456f0] hover:underline cursor-pointer tracking-tight"
          onClick={() => setSelectedSubmissionForView(row.submission)}
        >
          {row.templateId}
        </span>
      ),
    },
    {
      id: "formName",
      header: "Form Name",
      render: (row) => (
        <span
          className="font-medium text-slate-800 text-xs hover:underline cursor-pointer"
          style={{ fontFamily: "DM Sans, sans-serif" }}
          onClick={() => setSelectedSubmissionForView(row.submission)}
        >
          {row.formName}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      render: (row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold w-fit ${
            row.status === "completed"
              ? "bg-green-100 text-green-700"
              : row.status === "pending"
              ? "bg-amber-100 text-amber-700"
              : "bg-red-100 text-red-700"
          }`}
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </span>
      ),
    },
    {
      id: "sentAt",
      header: "Sent",
      render: (row) => (
        <span className="text-xs text-[#6B7280]" style={{ fontFamily: "Outfit, sans-serif" }}>
          {row.sentAt}
        </span>
      ),
    },
    {
      id: "submittedAt",
      header: "Submitted",
      render: (row) => (
        <span className="text-xs text-[#1F2937] font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
          {row.submittedAt}
        </span>
      ),
    },
  ];

  const formRowActions: TableRowAction<FormSubmissionRow>[] = [
    {
      label: "View Submission",
      icon: <Eye className="w-3.5 h-3.5 text-blue-600" />,
      onClick: (row) => {
        setSelectedSubmissionForView(row.submission);
      },
    },
  ];

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

  const filteredClientFlowProgress = useMemo(() => {
    if (!formSearchQuery.trim()) return clientFlowProgress;
    const q = formSearchQuery.toLowerCase();
    return clientFlowProgress.filter(p =>
      p.flow.name.toLowerCase().includes(q) ||
      p.status.toLowerCase().includes(q)
    );
  }, [clientFlowProgress, formSearchQuery]);

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

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={handleClose}
      />

      {/* Drawer panel */}
      <div className="fixed right-0 top-0 h-full w-[92vw] lg:w-[84vw] xl:w-[76vw] max-w-[1340px] min-w-[780px] bg-[#F8FAFC] z-50 shadow-2xl flex flex-col overflow-hidden">
        {/* Hero: client identity */}
        <div className="p-6 border-b border-border flex-shrink-0 bg-white">
          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 bg-gradient-to-br from-primary to-primary-hover text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0 shadow-lg"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              {client.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-1" style={{ color: "#1F2937", fontFamily: "DM Sans, sans-serif" }}>
                {isNewClient ? (clientName || "Add New Client") : client.name}
              </h2>
              <span
                className="inline-block px-2.5 py-1.5 text-[11px] font-bold"
                style={{
                  fontFamily: "Outfit, sans-serif",
                  backgroundColor:
                    isNewClient ? "#EFF6FF" : client.status === "Active" ? "#DCFCE7" : client.status === "Pending" ? "#FEF3C7" : "#F3F4F6",
                  color:
                    isNewClient ? "#2563EB" : client.status === "Active" ? "#10B981" : client.status === "Pending" ? "#F59E0B" : "#6B7280",
                  borderRadius: "6px",
                  padding: "6px 10px",
                }}
              >
                {isNewClient ? "New Client" : client.status}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isNewClient && (
                <button
                  type="button"
                  onClick={handleSaveNewClient}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  <Check className="w-4 h-4" />
                  Save Client
                </button>
              )}
              {!isNewClient && (
                <button
                  type="button"
                  onClick={() => {
                    const origin = typeof window !== "undefined" ? window.location.origin : "";
                    const portalUrl = `${origin}/patient/login?clientId=${encodeURIComponent(client.id)}`;
                    window.open(portalUrl, "_blank");
                    toast.success(`Opening patient portal login for ${client.name}...`);
                  }}
                  className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-xs rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <Send className="w-3.5 h-3.5 text-blue-600" />
                  <span>Send Invite</span>
                </button>
              )}
              <button
                onClick={handleClose}
                className="hover:bg-gray-100 p-1.5 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" style={{ color: "#6B7280" }} />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-border overflow-x-auto flex-shrink-0 bg-white">
          <div className="flex">
            {(
              [
                { id: "overview" as const, label: "Overview" },
                { id: "processes" as const, label: "Processes" },
                { id: "forms" as const, label: "Forms" },
                { id: "appointments" as const, label: "Appointments" },
                { id: "invoices" as const, label: "Invoices" },
                { id: "documents" as const, label: "Documents" },
                { id: "products" as const, label: "Product/Services" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveProfileTab(tab.id)}
                className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-all cursor-pointer ${activeProfileTab === tab.id
                  ? "border-b-2 border-[#1F2937] text-[#1F2937] font-semibold"
                  : "hover:text-foreground text-slate-500"
                  }`}
                style={{
                  fontFamily: "Outfit, sans-serif",
                  color: activeProfileTab === tab.id ? "#1F2937" : "#6B7280",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 relative flex-1 overflow-y-auto bg-[#F8FAFC]">

          {/* ── Overview Tab (2-Column Split View) ── */}
          {activeProfileTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT COLUMN: Draggable Structured Information Sections */}
                <div className="lg:col-span-5 space-y-5">
                  <DraggableOverviewSections
                    mode="client"
                    client={client}
                    sections={clientSections}
                    onSectionsChange={handleSectionsChange}
                    fieldValues={fieldValues}
                    onFieldValueChange={handleFieldValueChange}
                    selectedProcesses={selectedProcesses}
                    onSelectedProcessesChange={(procs) => {
                      setSelectedProcesses(procs);
                      const clientIdStr = String(client.id);
                      const stored = getStoredClients();
                      const nextClients = stored.map((c) => {
                        if (String(c.id).toLowerCase() !== clientIdStr.toLowerCase()) return c;
                        return { ...c, processes: procs };
                      });
                      saveStoredClients(nextClients);
                      setClients(nextClients);
                      try {
                        window.dispatchEvent(new CustomEvent(CLIENTS_STORE_EVENT, { detail: nextClients }));
                        window.dispatchEvent(new CustomEvent("ma_record_data_changed"));
                        window.dispatchEvent(new CustomEvent("patient_portal_client_changed", { detail: clientIdStr }));
                      } catch {}
                    }}
                    availableProcesses={availableProcesses}
                    customFieldsModule="client"
                  />
                </div>

                {/* RIGHT COLUMN: Full-Featured Activity Tab */}
                <div className="lg:col-span-7">
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                    <ActivityTab
                      activity={filteredDrawerActivities as any}
                      processTabs={[
                        { id: "all", name: "All" },
                        ...drawerClientProcesses.map((p) => ({ id: p.id, name: p.name })),
                      ]}
                      activeProcessTab={activeProcessTabDrawer}
                      onProcessTabChange={(tabId) => {
                        setActiveProcessTabDrawer(tabId);
                        setShowCallDetailsFromProfile(false);
                      }}
                      onOpenCallDetail={(callId) => {
                        setSelectedCallId(callId);
                        setShowCallDetailsFromProfile(true);
                      }}
                      clientId={client?.id ? String(client.id) : "CL-001"}
                      clientName={client.name}
                      clientEmail={client.email}
                      clientPhone={client.phone}
                      emptyMessage="No activity for this client yet"
                      onOpenScheduleAppointment={() => {
                        setActivityBookingValues((prev) => ({
                          ...prev,
                          client: {
                            id: 0,
                            name: client.name,
                            email: client.email,
                            phone: client.phone,
                          },
                        }));
                        setShowScheduleApptFromActivity(true);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Processes Tab ── */}
          {activeProfileTab === "processes" && (
            <div className="space-y-4">
              {(() => {
                const storedLogs = getStoredCallLogs().filter(
                  (l) => l.clientId === client.id || (l.client && l.client.toLowerCase() === client.name.toLowerCase())
                );

                const clientProcesses = Array.from(
                  new Set([
                    ...(Array.isArray(client.processes) ? client.processes : []),
                    ...(Array.isArray(selectedProcesses) ? selectedProcesses : []),
                  ])
                );

                // Map of process name -> existing CallLog
                const processLogsMap = new Map<string, any>();
                storedLogs.forEach((l) => {
                  if (l.process) {
                    processLogsMap.set(l.process.trim().toLowerCase(), l);
                  }
                });

                // Generate full list of effective logs for each assigned process
                const allClientLogs: any[] = [];
                const seenProcesses = new Set<string>();

                clientProcesses.forEach((pName) => {
                  if (!pName) return;
                  const key = pName.trim().toLowerCase();
                  seenProcesses.add(key);
                  const existing = processLogsMap.get(key);
                  if (existing) {
                    allClientLogs.push(existing);
                  } else {
                    const fallbackStage =
                      drawerProcessStages[pName] ||
                      (client as any)?.processStagesMap?.[pName] ||
                      (client.stage && getStagesForProcess(pName).some((s) => s.label.toLowerCase() === client.stage.toLowerCase()) ? client.stage : null) ||
                      getStagesForProcess(pName)[0]?.label ||
                      "Initial Contact";

                    allClientLogs.push({
                      id: `PRC-${client.id}-${pName.replace(/\s+/g, "-").slice(0, 8).toUpperCase()}`,
                      processId: `PRC-${client.id}-${pName.replace(/\s+/g, "-").slice(0, 8).toUpperCase()}`,
                      client: client.name,
                      clientId: client.id,
                      type: "Inbound",
                      status: "In Progress",
                      process: pName,
                      currentStage: fallbackStage,
                      duration: "0:00",
                      date: new Date().toISOString().replace("T", " ").substring(0, 16),
                      hasRecording: false,
                      hasTranscript: true,
                      hasScheduledCall: false,
                      responsible: (client as any).responsible || "Unassigned",
                    });
                  }
                });

                // Include any other stored logs for this client not already processed
                storedLogs.forEach((l) => {
                  if (l.process && !seenProcesses.has(l.process.trim().toLowerCase())) {
                    seenProcesses.add(l.process.trim().toLowerCase());
                    allClientLogs.push(l);
                  }
                });

                const matchingLogs =
                  selectedDealProcessFilter && selectedDealProcessFilter !== "All Processes"
                    ? allClientLogs.filter(
                        (l) => l.process && l.process.trim().toLowerCase() === selectedDealProcessFilter.trim().toLowerCase()
                      )
                    : allClientLogs;

                const effectiveLogs = matchingLogs;

                const searchLower = processSearchQuery.toLowerCase().trim();
                const filteredClientDealLogs = effectiveLogs.filter((log) => {
                  if (!searchLower) return true;
                  return (
                    log.id.toLowerCase().includes(searchLower) ||
                    log.process.toLowerCase().includes(searchLower) ||
                    log.currentStage.toLowerCase().includes(searchLower)
                  );
                });

                const dealColumns: TableColumn<CallLog>[] = [
                  {
                    key: "id",
                    header: "Process ID",
                    render: (log) => {
                      const formattedId = (log as any).processId
                        ? (log as any).processId
                        : log.id.startsWith("CALL-")
                          ? `PRC-${log.id.replace("CALL-", "")}`
                          : (log.id.startsWith("PRC-") ? log.id : `PRC-${log.id}`);
                      return (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProcessLog(log);
                            setProcessDetailTab("general");
                            setShowProcessDetailDrawer(true);
                          }}
                          className="font-mono text-xs font-semibold text-[#1456f0] hover:text-[#1d4ed8] hover:underline cursor-pointer tracking-tight"
                          style={{ fontFamily: "JetBrains Mono, monospace" }}
                          title="Open process details"
                        >
                          {formattedId}
                        </button>
                      );
                    },
                  },
                  {
                    key: "currentStage",
                    header: "Stage",
                    render: (log) => {
                      const stageObjs = getDealStageObjectsForProcess(log.process, log.currentStage);
                      const activeIdx = getDealStageIndexForProcess(log.process, log.currentStage);
                      const cleanCurrentStage = (log.currentStage || "").includes(":")
                        ? log.currentStage.split(":")[1].trim().toLowerCase()
                        : (log.currentStage || "").trim().toLowerCase();

                      const currentStageObj = stageObjs.find((s) => s.name.trim().toLowerCase() === cleanCurrentStage);
                      const isLostStageObj = (s?: any) => {
                        if (!s) return false;
                        if (s.stageCategory === "lost" || s.intentTrigger === "not_interested") return true;
                        const n = s.name.toLowerCase();
                        return n.includes("not interested") || n.includes("lost") || n.includes("cancelled") || n.includes("declined") || n.includes("failed") || n.includes("no-show");
                      };

                      const isWonStageObj = (s?: any) => {
                        if (!s) return false;
                        if (s.stageCategory === "success" || s.intentTrigger === "interested") return true;
                        const n = s.name.toLowerCase();
                        return n.includes("interested") || n.includes("won") || n.includes("reactivated") || n.includes("completed") || n.includes("closed");
                      };

                      const isLastOrFinalStageObj = (s?: any) => {
                        if (!s) return false;
                        return Boolean(s.isFinalStage || s.stagePosition === "final" || isLostStageObj(s) || isWonStageObj(s));
                      };

                      const isCurrentFinal = isLastOrFinalStageObj(currentStageObj);

                      return (
                        <div className="flex items-center justify-center -space-x-px" onClick={(e) => e.stopPropagation()}>
                          {stageObjs.map((stg, i) => {
                            const stageName = stg.name;
                            const stageColor = stg.color || CHEVRON_PALETTE[i % CHEVRON_PALETTE.length];
                            const segIdx = i + 1;
                            const isActive = segIdx === activeIdx;

                            const isThisFinal = isLastOrFinalStageObj(stg);
                            const isThisInProgress = !isThisFinal;

                            let isCompleted = false;
                            let isDeactivated = false;

                            if (isActive) {
                              // Active stage
                            } else if (isCurrentFinal) {
                              if (isThisInProgress && activeIdx >= 0 && segIdx < activeIdx) isCompleted = true;
                              else isDeactivated = true;
                            } else {
                              if (isThisInProgress && segIdx < activeIdx) isCompleted = true;
                            }

                            const isLocked = Boolean(isCurrentFinal);
                            const lightBg = lightenHex(stageColor, 78);
                            const lightBorder = lightenHex(stageColor, 40);

                            let bg = "transparent";
                            let border = "1px solid #CBD5E1";
                            let opacity = 1;

                            if (isActive) {
                              bg = stageColor;
                              border = "1.5px solid #0F172A";
                            } else if (isCompleted) {
                              bg = stageColor;
                              border = `1px solid ${stageColor}`;
                              opacity = 0.9;
                            } else {
                              // Inactive / unreached / deactivated stages: light grey to show inactive
                              bg = "#E2E8F0";
                              border = "1px solid #CBD5E1";
                              opacity = 0.9;
                            }

                            const isHovered = hoveredDealStageSegment?.logId === log.id && hoveredDealStageSegment?.segIdx === segIdx;
                            return (
                              <div
                                key={stg.id || stageName}
                                className="relative"
                                style={{ zIndex: isActive ? 10 : isHovered ? 20 : 1 }}
                              >
                                {isHovered && (
                                  <div
                                    className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 pointer-events-none rounded shadow-md z-[200] flex items-center gap-1.5"
                                    style={{ backgroundColor: "#1A2B4A", color: "#fff", fontSize: "12px" }}
                                  >
                                    <span
                                      className="w-2 h-2 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: isDeactivated ? lightBg : stageColor }}
                                    />
                                    <span>{stageName}</span>
                                    {isDeactivated ? (
                                      <span className="text-[10px] text-gray-300 font-semibold">(Inactive)</span>
                                    ) : isActive ? (
                                      <span className="text-[10px] text-blue-300 font-semibold">(Current)</span>
                                    ) : isCompleted ? (
                                      <span className="text-[10px] text-emerald-300 font-semibold">(Completed)</span>
                                    ) : null}
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isDeactivated) handleUpdateLogStage(log, stageName);
                                  }}
                                  onMouseEnter={() => setHoveredDealStageSegment({ logId: log.id, segIdx })}
                                  onMouseLeave={() => setHoveredDealStageSegment(null)}
                                  style={{
                                    width: "18px",
                                    height: "8px",
                                    borderRadius: "0px",
                                    backgroundColor: bg,
                                    border: border,
                                    opacity: opacity,
                                    cursor: isDeactivated ? "not-allowed" : "pointer",
                                    display: "block",
                                    padding: 0,
                                    flexShrink: 0,
                                    transition: "all 0.2s ease",
                                  }}
                                  title={stageName}
                                />
                              </div>
                            );
                          })}
                        </div>
                      );
                    },
                  },
                  {
                    key: "client",
                    header: "Client",
                    render: (log) => (
                      <span
                        className="cursor-pointer hover:underline font-semibold text-xs"
                        style={{ color: "#1A73E8", fontFamily: "DM Sans, sans-serif" }}
                      >
                        {log.client || client.name}
                      </span>
                    ),
                  },
                  {
                    key: "date",
                    header: "Created",
                    render: (log) => (
                      <span className="text-xs text-slate-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {log.date || "2024-04-13 14:30"}
                      </span>
                    ),
                  },
                  {
                    key: "activity",
                    header: "Activity",
                    render: (log) => (
                      <div className="flex items-center justify-start gap-1.5 text-xs whitespace-nowrap">
                        <span style={{ color: log.status === "Pending" ? "#DC2626" : "#64748B", fontFamily: "Outfit, sans-serif" }}>
                          {log.status === "Pending" ? "Scheduled call" : "Last contact"} - {log.date ? new Date(log.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Apr 13"}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="truncate max-w-[140px]" style={{ color: "#9CA3AF", fontFamily: "Outfit, sans-serif" }}>
                          {log.status === "Pending" ? "Follow up needed" : log.currentStage}
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: "responsible",
                    header: "Responsible",
                    render: (log) => (
                      <span className="text-xs text-gray-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {(client as any).responsible || (log as any).responsible || "Unassigned"}
                      </span>
                    ),
                  },
                  {
                    key: "alert",
                    header: "Alert",
                    render: () => <span className="text-xs font-medium text-slate-400">—</span>,
                  },
                ];

                return (
                  <div className="space-y-3">
                    {/* Topbar powered by PageTopBar component matching /deal */}
                    <div className="relative">
                      <PageTopBar
                        leftElement={
                          <div className="flex items-center gap-1.5">
                            {/* Process Filter Dropdown matching Deals.tsx */}
                            <div className="relative shrink-0">
                              <button
                                type="button"
                                onClick={() => setShowDealProcessesDropdown(!showDealProcessesDropdown)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors cursor-pointer"
                                style={{ fontFamily: "Outfit, sans-serif" }}
                              >
                                <span className="truncate max-w-[160px] font-semibold text-gray-800">
                                  {selectedDealProcessFilter}
                                </span>
                                <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              </button>

                              {showDealProcessesDropdown && (
                                <>
                                  <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowDealProcessesDropdown(false)}
                                  />
                                  <div className="absolute top-full left-0 mt-1.5 w-64 bg-white border border-border rounded-xl shadow-xl z-50 py-1.5 overflow-hidden">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedDealProcessFilter("All Processes");
                                        setShowDealProcessesDropdown(false);
                                      }}
                                      className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                                        selectedDealProcessFilter === "All Processes"
                                          ? "bg-primary/10 text-primary font-semibold"
                                          : "text-gray-700 hover:bg-muted"
                                      }`}
                                      style={{ fontFamily: "Outfit, sans-serif" }}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold">All Processes</span>
                                        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-bold">
                                          {allClientLogs.length}
                                        </span>
                                      </div>
                                      {selectedDealProcessFilter === "All Processes" && (
                                        <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-2" />
                                      )}
                                    </button>
                                    <div className="h-px bg-gray-100 my-1" />
                                    {availableProcesses.map((process) => {
                                      const isEnrolled = clientProcesses.some((cp) => cp.toLowerCase() === process.toLowerCase());
                                      return (
                                        <button
                                          key={process}
                                          type="button"
                                          onClick={() => {
                                            setSelectedDealProcessFilter(process);
                                            setShowDealProcessesDropdown(false);
                                          }}
                                          className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                                            selectedDealProcessFilter === process
                                              ? "bg-primary/10 text-primary font-semibold"
                                              : "text-gray-700 hover:bg-muted"
                                          }`}
                                          style={{ fontFamily: "Outfit, sans-serif" }}
                                        >
                                          <div className="flex items-center gap-1.5 truncate">
                                            <span className="truncate">{process}</span>
                                            {isEnrolled && (
                                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" title="Enrolled" />
                                            )}
                                          </div>
                                          {selectedDealProcessFilter === process && (
                                            <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-2" />
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        }
                        searchQuery={processSearchQuery}
                        onSearchChange={setProcessSearchQuery}
                        searchPlaceholder="Search processes..."
                        resultsCount={filteredClientDealLogs.length}
                        primaryAction={{
                          label: "Assign Process",
                          onClick: () => setIsAssignProcessOpen((prev) => !prev),
                          icon: <Plus className="w-4 h-4" />,
                          className: "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs",
                        }}
                      />

                      {/* Assign Process Popover */}
                      {isAssignProcessOpen && (
                        <div
                          className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 p-4 z-30 animate-in fade-in zoom-in-95 duration-150"
                          style={{ fontFamily: "DM Sans, sans-serif" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 mb-3">
                            <h4 className="text-sm font-bold text-gray-900">Assign Process</h4>
                            <button
                              type="button"
                              onClick={() => setIsAssignProcessOpen(false)}
                              className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">Process</label>
                              <select
                                value={selectedAssignProcess}
                                onChange={(e) => {
                                  const proc = e.target.value;
                                  setSelectedAssignProcess(proc);
                                  const stgs = getStagesForProcess(proc);
                                  setSelectedAssignStage(stgs[0]?.label || "");
                                }}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                              >
                                <option value="">Select a process...</option>
                                {availableProcesses.map((p) => (
                                  <option key={p} value={p}>{p}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">Stage</label>
                              <select
                                value={selectedAssignStage}
                                onChange={(e) => setSelectedAssignStage(e.target.value)}
                                disabled={!selectedAssignProcess}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-blue-500 disabled:opacity-50 cursor-pointer"
                              >
                                <option value="">Select a stage...</option>
                                {getStagesForProcess(selectedAssignProcess).map((s) => (
                                  <option key={s.id || s.label} value={s.label}>{s.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
                              <button
                                type="button"
                                onClick={() => setIsAssignProcessOpen(false)}
                                className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={handleConfirmAssignProcess}
                                disabled={!selectedAssignProcess}
                                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                              >
                                Assign
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Table View matching Deals.tsx exactly */}
                    <TableComponent
                      columns={dealColumns}
                      data={filteredClientDealLogs}
                      getRowId={(log) => log.id}
                      emptyMessage="No deals or processes found for this client in the selected workflow."
                      onRowClick={(log) => {
                        setSelectedProcessLog(log);
                        setProcessDetailTab("general");
                        setShowProcessDetailDrawer(true);
                      }}
                      rowActions={[
                        {
                          label: "View",
                          icon: <Eye className="w-3.5 h-3.5" />,
                          onClick: (log) => {
                            setSelectedProcessLog(log);
                            setProcessDetailTab("general");
                            setShowProcessDetailDrawer(true);
                          },
                        },
                        {
                          label: "Edit",
                          icon: <Pencil className="w-3.5 h-3.5" />,
                          onClick: () => {
                            toast.info("Edit coming soon");
                          },
                        },
                        {
                          label: "Delete",
                          icon: <Trash2 className="w-3.5 h-3.5 text-rose-500" />,
                          isDanger: true,
                          onClick: () => {
                            toast.info("Process entry removed");
                          },
                        },
                      ]}
                    />
                  </div>
                );
              })()}
            </div>
          )}

{/* ── Forms Tab ── */}
          {activeProfileTab === "forms" && (
            <div className="space-y-4">
              <PageTopBar
                modes={[
                  { id: "forms", label: "Forms", badge: formSubmissionRows.length },
                  { id: "flows", label: "Intake Flows", badge: clientFlowProgress.length },
                ]}
                activeMode={formsTabMode}
                onModeChange={(mode) => setFormsTabMode(mode as "forms" | "flows")}
                searchQuery={formSearchQuery}
                onSearchChange={setFormSearchQuery}
                searchPlaceholder={formsTabMode === "forms" ? "Search forms..." : "Search intake flows..."}
              />

              {/* ── Forms mode ── */}
              {formsTabMode === "forms" && (
                <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
                  <TableComponent
                    data={filteredFormSubmissionRows}
                    columns={formColumns}
                    getRowId={(row) => row.id}
                    rowActions={formRowActions}
                    onRowClick={(row) => setSelectedSubmissionForView(row.submission)}
                    enableSelection={false}
                    enableColumnCustomization={true}
                    pagination={filteredFormSubmissionRows.length > 20}
                    defaultRowsPerPage={20}
                    emptyMessage={formSearchQuery ? "No matching forms found." : "No forms submitted by this client yet."}
                  />
                </div>
              )}

              {/* ── Intake Flows mode ── */}
              {formsTabMode === "flows" && (
                filteredClientFlowProgress.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm" style={{ color: "#6B7280", fontFamily: "Outfit, sans-serif" }}>
                      {formSearchQuery ? "No matching intake flows found." : "This client hasn't started any intake flow yet."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {filteredClientFlowProgress.map(({ flow, steps, status, requiredDone, requiredTotal }) => {
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
                                                {typeof value === "string" && value.startsWith("data:image") ? (
                                                  <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 flex items-center justify-center max-w-xs">
                                                    <img src={value} alt={label} className="max-h-20 object-contain" />
                                                  </div>
                                                ) : (
                                                  <p className="text-sm" style={{ fontFamily: "Outfit, sans-serif", color: "#1F2937" }}>
                                                    {value}
                                                  </p>
                                                )}
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

          {/* ── Appointments Tab ── */}
          {activeProfileTab === "appointments" && (() => {
            const stored = sessionStorage.getItem("appointments_v1");
            const all: any[] = stored ? JSON.parse(stored) : [];
            const clientAppts = all.filter((a: any) =>
              (client?.email && a.clientEmail && a.clientEmail.toLowerCase() === client.email.toLowerCase()) ||
              (client?.phone && a.clientPhone && a.clientPhone.replace(/\D/g, "") === client.phone.replace(/\D/g, "")) ||
              (client?.name && a.clientName && a.clientName.toLowerCase() === client.name.toLowerCase()) ||
              String(a.clientId) === String(client?.id)
            );

            const getResolvedServiceName = (appt: any) => {
              if (appt.service && appt.service !== "—") return appt.service;
              if (appt.serviceName) return appt.serviceName;
              if (appt.serviceId !== undefined && appt.serviceId !== null) {
                const fromStore = getStoredServices().find((s) => String(s.id) === String(appt.serviceId));
                if (fromStore) return fromStore.name;
              }
              if (appt.title) return appt.title;
              return "Consultation";
            };

            const searchLower = appointmentSearchQuery.toLowerCase().trim();
            const filteredAppts = clientAppts.filter((appt: any) => {
              const srvName = getResolvedServiceName(appt).toLowerCase();
              const matchesSearch =
                !searchLower ||
                (appt.title && appt.title.toLowerCase().includes(searchLower)) ||
                (appt.service && appt.service.toLowerCase().includes(searchLower)) ||
                srvName.includes(searchLower) ||
                (appt.date && appt.date.toLowerCase().includes(searchLower));
              const matchesProc =
                !selectedApptProcessFilter ||
                appt.processId === selectedApptProcessFilter ||
                appt.processName === selectedApptProc?.name ||
                !appt.processId;
              return matchesSearch && matchesProc;
            });

            const formatApptDateTime = (dateStr: string) => {
              if (!dateStr) return "—";
              try {
                const d = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`);
                if (!isNaN(d.getTime())) {
                  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                }
              } catch {}
              return dateStr;
            };

            const ALL_EMPLOYEES_MAP: Record<string, string> = {
              "1": "John Smith",
              "2": "Sarah Johnson",
              "4": "Emily Davis",
              "5": "Dr. Robert Martinez",
              "6": "Lisa Anderson",
            };

            const apptColumns: TableColumn<any>[] = [
              {
                header: "Appointment ID",
                accessorKey: "id",
                align: "left",
                render: (apt) => {
                  const formattedId = `APT-${String(apt.id).padStart(4, "0")}`;
                  return (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivityBookingValues({
                          title: apt.title || "Consultation",
                          description: apt.notes || "",
                          note: apt.notes || "",
                          tags: "",
                          processId: apt.processId || selectedApptProc.id || "",
                          stageId: apt.currentStageId || "",
                          date: apt.date || new Date().toISOString().split("T")[0],
                          startHour: 10,
                          startMinute: 0,
                          sessionType: apt.location?.toLowerCase().includes("person") ? "inPerson" : "video",
                          client: { id: client.id, name: client.name, email: client.email || "", phone: client.phone || "" },
                          provider: { id: apt.employeeId || 1, name: ALL_EMPLOYEES_MAP[String(apt.employeeId)] || "John Smith", email: "provider@healthcare.com" },
                          generateInvoice: false,
                        });
                        setShowScheduleApptFromActivity(true);
                      }}
                      className="font-mono text-xs font-semibold text-[#1456f0] hover:text-[#1d4ed8] hover:underline cursor-pointer tracking-tight"
                      style={{ fontFamily: "JetBrains Mono, monospace" }}
                      title="Open appointment details"
                    >
                      {formattedId}
                    </button>
                  );
                },
              },
              {
                header: "Stages",
                accessorKey: "currentStageId",
                align: "left",
                minWidth: 160,
                render: (apt) => {
                  const aptProc = appointmentProcesses.find((p) => p.id === apt.processId || p.name === apt.processId) || selectedApptProc;
                  const stages = aptProc.stages && aptProc.stages.length > 0 ? aptProc.stages : [
                    { id: "stg-1", name: "Scheduled", color: "#3B82F6" },
                    { id: "stg-2", name: "In Progress", color: "#F59E0B" },
                    { id: "stg-3", name: "Completed", color: "#10B981" },
                  ];
                  const stageKey = (apt.currentStageId || apt.stageId || "").trim();
                  const matchedStage = stageKey
                    ? stages.find(
                        (s) =>
                          s.id.toLowerCase() === stageKey.toLowerCase() ||
                          s.name.toLowerCase() === stageKey.toLowerCase() ||
                          (apt.statusLabel && s.name.toLowerCase() === apt.statusLabel.toLowerCase())
                      )
                    : (stages.find((s) => apt.statusLabel && s.name.toLowerCase() === apt.statusLabel.toLowerCase()) || stages[0]);
                  const activeIdx = matchedStage ? stages.findIndex((s) => s.id === matchedStage.id) : 0;

                  return (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center -space-x-px">
                        {stages.map((stg, i) => {
                          const isStgSuccess = stg.systemCategory === "completed" || stg.name.toLowerCase().includes("completed") || stg.name.toLowerCase().includes("won");
                          const isStgLost = stg.systemCategory === "cancelled" || stg.name.toLowerCase().includes("cancel") || stg.name.toLowerCase().includes("no-show");
                          const isStgFinal = Boolean(stg.isFinalStage || stg.isFinal || isStgSuccess || isStgLost);
                          const isStgInProgress = !isStgFinal;
                          const isActive = activeIdx >= 0 && i === activeIdx;

                          let isCompleted = false;
                          let isDeactivated = false;

                          if (isActive) {
                            // active
                          } else if (isStgFinal) {
                            if (isStgInProgress && activeIdx >= 0 && i < activeIdx) isCompleted = true;
                            else isDeactivated = true;
                          } else {
                            if (isStgInProgress && activeIdx >= 0 && i < activeIdx) isCompleted = true;
                          }

                          const isLocked = Boolean(isStgFinal);
                          const stgColor = stg.color || "#1E88E5";
                          const lightBg = lightenHex(stgColor, 78);
                          const lightBorder = lightenHex(stgColor, 40);

                          let bg = "transparent";
                          let border = "1px solid #CBD5E1";
                          let opacity = 1;

                          if (isActive) {
                            bg = stgColor;
                            border = "1.5px solid #0F172A";
                          } else if (isCompleted) {
                            bg = stgColor;
                            border = `1px solid ${stgColor}`;
                            opacity = 0.9;
                          } else {
                            // Inactive / unreached / deactivated stages: light grey to show inactive
                            bg = "#E2E8F0";
                            border = "1px solid #CBD5E1";
                            opacity = 0.9;
                          }

                          const isHovered = hoveredApptStageBox?.aptId === apt.id && hoveredApptStageBox?.stageIdx === i;

                          return (
                            <div key={stg.id} className="relative" style={{ zIndex: isActive ? 10 : isHovered ? 20 : 1 }}>
                              {isHovered && (
                                <div
                                  className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded text-[11px] font-medium shadow-md pointer-events-none"
                                  style={{ backgroundColor: "#1A2B4A", color: "#fff", zIndex: 200 }}
                                >
                                  {stg.name}{isDeactivated ? " (Inactive)" : isActive ? " (Current)" : isCompleted ? " (Completed)" : ""}
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => handleQuickApptStageChange(apt, stg)}
                                onMouseEnter={() => setHoveredApptStageBox({ aptId: apt.id, stageIdx: i })}
                                onMouseLeave={() => setHoveredApptStageBox(null)}
                                style={{
                                  width: "18px",
                                  height: "8px",
                                  borderRadius: "0px",
                                  backgroundColor: bg,
                                  border: border,
                                  opacity: opacity,
                                  cursor: "pointer",
                                  display: "block",
                                  padding: 0,
                                  flexShrink: 0,
                                  transition: "all 0.15s ease",
                                }}
                                title={stg.name}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                },
              },
              {
                header: "Client",
                accessorKey: "clientName",
                align: "left",
                minWidth: 160,
                render: (apt) => (
                  <span
                    className="font-medium text-xs text-slate-900 cursor-pointer hover:text-blue-600 hover:underline"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    {apt.clientName || client.name}
                  </span>
                ),
              },
              {
                header: "Date",
                accessorKey: "date",
                align: "left",
                render: (apt) => (
                  <span className="text-xs text-slate-800 font-medium" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    {formatApptDateTime(apt.date)}
                  </span>
                ),
              },
              {
                header: "Time",
                accessorKey: "time",
                align: "left",
                render: (apt) => (
                  <span className="text-xs text-slate-600 tabular-nums" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    {apt.time ? `${apt.time} (${apt.duration || 60}m)` : "10:00 AM (60m)"}
                  </span>
                ),
              },
              {
                header: "Provider",
                accessorKey: "employeeId",
                align: "left",
                render: (apt) => (
                  <span className="text-xs text-slate-700 font-medium truncate">
                    {ALL_EMPLOYEES_MAP[String(apt.employeeId)] || apt.provider?.name || "John Smith"}
                  </span>
                ),
              },
              {
                header: "Service",
                accessorKey: "serviceId",
                align: "left",
                render: (apt) => (
                  <span className="text-xs font-semibold text-slate-800 truncate">
                    {getResolvedServiceName(apt)}
                  </span>
                ),
              },
            ];

            return (
              <div className="space-y-4" key={appointmentRefreshKey}>
                {/* TopBar matching Appointments.tsx exactly */}
                <PageTopBar
                  leftElement={
                    <div className="flex items-center gap-1.5">
                      {/* Workflow selection - ONLY appointment workflows, NO 'all' */}
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowApptProcessesDropdown(!showApptProcessesDropdown)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors cursor-pointer"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                          title="Select Workflow"
                        >
                          <span className="truncate max-w-[160px] font-semibold text-gray-800">
                            {selectedApptProc?.name || "Appointment Scheduling"}
                          </span>
                          <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        </button>

                        {showApptProcessesDropdown && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setShowApptProcessesDropdown(false)}
                            />
                            <div className="absolute top-full left-0 mt-1.5 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1.5 overflow-hidden">
                              {appointmentProcesses.map((proc) => (
                                <button
                                  key={proc.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedApptProcessFilter(proc.id);
                                    setShowApptProcessesDropdown(false);
                                  }}
                                  className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                                    selectedApptProcessFilter === proc.id
                                      ? "bg-blue-50/80 text-blue-600 font-semibold"
                                      : "text-gray-700 hover:bg-gray-50"
                                  }`}
                                  style={{ fontFamily: "Outfit, sans-serif" }}
                                >
                                  <span className="truncate">{proc.name}</span>
                                  {selectedApptProcessFilter === proc.id && (
                                    <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-2" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  }
                  searchQuery={appointmentSearchQuery}
                  onSearchChange={setAppointmentSearchQuery}
                  searchPlaceholder="Search appointments (client, email, notes)..."
                  resultsCount={filteredAppts.length}
                  primaryAction={{
                    label: "Book Appointment",
                    onClick: () => {
                      if (!hasAppointmentAutomation(selectedApptProc.id)) {
                        toast.error("Please build an automation first before booking appointments. Navigate to Automation to configure workflow rules.");
                        return;
                      }
                      setActivityBookingValues({
                        title: "Consultation Appointment",
                        description: "",
                        note: "",
                        tags: "",
                        processId: selectedApptProc.id || "",
                        stageId: "",
                        date: new Date().toISOString().split("T")[0],
                        startHour: 10,
                        startMinute: 0,
                        sessionType: "video",
                        client: { id: client.id, name: client.name, email: client.email || "", phone: client.phone || "" },
                        provider: { id: 1, name: "John Smith", email: "john.smith@healthcare.com" },
                        generateInvoice: hasAppointmentInvoiceAutomation(selectedApptProc.id),
                      });
                      setShowScheduleApptFromActivity(true);
                    },
                    icon: <Plus className="w-4 h-4" />,
                    className: "bg-[#1F2937] hover:bg-slate-800 text-white",
                  }}
                />

                {!hasAppointmentAutomation(selectedApptProc.id) && (
                  <div className="mb-4 px-4 py-2.5 bg-amber-50/90 border border-amber-200/90 rounded-xl text-xs font-medium text-amber-800 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      Appointment booking is locked — please build the automation first in the Automation page.
                    </span>
                    <Link to="/automation" className="text-blue-600 hover:underline font-semibold text-xs ml-2">
                      Build automation &rarr;
                    </Link>
                  </div>
                )}

                {/* TableComponent matching Appointments.tsx */}
                <TableComponent
                  columns={apptColumns}
                  data={filteredAppts}
                  getRowId={(apt) => apt.id}
                  emptyMessage={clientAppts.length === 0 ? "No appointments yet for this client." : "No appointments match your search."}
                  rowActions={[
                    {
                      label: "View Details",
                      icon: <Calendar className="w-3.5 h-3.5 text-blue-600" />,
                      onClick: (apt) => {
                        setActivityBookingValues({
                          title: apt.title || "Consultation",
                          description: apt.notes || "",
                          note: apt.notes || "",
                          tags: "",
                          processId: apt.processId || selectedApptProc.id || "",
                          stageId: apt.currentStageId || "",
                          date: apt.date || new Date().toISOString().split("T")[0],
                          startHour: 10,
                          startMinute: 0,
                          sessionType: "video",
                          client: { id: client.id, name: client.name, email: client.email || "", phone: client.phone || "" },
                          provider: { id: apt.employeeId || 1, name: ALL_EMPLOYEES_MAP[String(apt.employeeId)] || "John Smith", email: "provider@healthcare.com" },
                          generateInvoice: false,
                        });
                        setShowScheduleApptFromActivity(true);
                      },
                    },
                    {
                      label: "Mark as Complete",
                      icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />,
                      hidden: (apt: any) => apt.status === "completed",
                      onClick: (apt) => {
                        handleUpdateApptStatus(apt.id, "completed");
                      },
                    },
                    {
                      label: "Cancel / Delete",
                      icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />,
                      isDanger: true,
                      onClick: (apt) => handleDeleteAppt(apt.id),
                    },
                  ]}
                />
              </div>
            );
          })()}

{/* ── Invoices Tab ── */}
          {activeProfileTab === "invoices" && (() => {
            const allClientInvoices = getInvoicesByClient(client.id);

            const filteredInvoices = allClientInvoices.filter((inv) => {
              const searchLower = invoiceSearchQuery.toLowerCase().trim();
              const matchesSearch =
                !searchLower ||
                inv.id.toLowerCase().includes(searchLower) ||
                (inv.appointmentTitle && inv.appointmentTitle.toLowerCase().includes(searchLower)) ||
                (inv.lineItems && inv.lineItems.some((li: any) => li.description?.toLowerCase().includes(searchLower)));

              let matchesStatus = true;
              if (invoiceStatusFilter !== "all") {
                matchesStatus = inv.status === invoiceStatusFilter;
              }

              return matchesSearch && matchesStatus;
            });

            const invoiceColumns: TableColumn<ClientInvoice>[] = [
              {
                id: "invoiceId",
                header: "Invoice ID",
                align: "left",
                render: (inv) => (
                  <button
                    onClick={() => {
                      setSelectedInvoiceForDrawer(inv);
                      setIsInvoiceDrawerOpen(true);
                    }}
                    className="hover:underline hover:text-blue-600 transition-colors text-left font-mono font-bold text-xs text-slate-700 cursor-pointer"
                  >
                    {inv.id}
                  </button>
                ),
              },
              {
                id: "processId",
                header: "Process ID",
                align: "left",
                render: (inv) => {
                  const procId = inv.processId || invoiceProcess.id || "PROC-INV-01";
                  return (
                    <span
                      className="font-mono text-xs font-semibold text-slate-600 bg-slate-100/80 px-2 py-0.5 rounded border border-slate-200/60"
                      style={{ fontFamily: "JetBrains Mono, monospace" }}
                    >
                      {procId}
                    </span>
                  );
                },
              },
              {
                id: "client",
                header: "Client",
                align: "left",
                render: (inv) => (
                  <span
                    className="text-left font-bold text-xs text-[#1A73E8]"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    {inv.clientName || client.name}
                  </span>
                ),
              },
              {
                id: "amount",
                header: "Amount",
                align: "center",
                render: (inv) => (
                  <span className="font-bold text-xs text-slate-900 font-mono">
                    ${inv.total.toFixed(2)}
                  </span>
                ),
              },
              {
                id: "balance",
                header: "Balance",
                align: "center",
                render: (inv) => (
                  <span className="font-bold text-xs text-slate-700 font-mono">
                    ${(inv.status === "paid" || inv.status === "void" ? 0 : Math.max(0, inv.total - (inv.amountPaid || 0))).toFixed(2)}
                  </span>
                ),
              },
              {
                id: "stage",
                header: "Stage",
                align: "center",
                render: (inv) => {
                  return (
                    <div className="flex items-center justify-center">
                      <InvoiceProgressBar
                        status={inv.status}
                        currentStageId={inv.currentStageId}
                        stages={invoiceProcess.stages}
                        onStatusChange={(newSt) => handleUpdateInvoiceStatus(inv.id, newSt)}
                        interactive={true}
                        logId={inv.id}
                      />
                    </div>
                  );
                },
              },
              {
                id: "dueDate",
                header: "Due Date",
                align: "left",
                render: (inv) => (
                  <span
                    className="text-xs font-semibold"
                    style={{ color: inv.status === "overdue" ? "#DC2626" : "#475569", fontFamily: "Outfit, sans-serif" }}
                  >
                    {inv.dueDate || "—"}
                  </span>
                ),
              },
              {
                id: "created",
                header: "Created",
                align: "left",
                render: (inv) => (
                  <span className="text-[11px] text-slate-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {(inv.createdAt || new Date().toISOString()).replace("T", " ").substring(0, 16)}
                  </span>
                ),
              },
              {
                id: "lastActivity",
                header: "Last Activity",
                align: "left",
                render: (inv) => (
                  <span
                    className="text-xs font-medium"
                    style={{ color: inv.status === "overdue" ? "#DC2626" : "#475569", fontFamily: "Outfit, sans-serif" }}
                  >
                    {getInvoiceActivityText(inv)}
                  </span>
                ),
              },
              {
                id: "responsible",
                header: "Responsible",
                align: "left",
                render: (inv) => (
                  <span className="text-xs font-medium text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {inv.createdBy === "system" ? "Automated Flow" : (inv.createdBy || "John Smith")}
                  </span>
                ),
              },
            ];

            return (
              <div className="space-y-4">
                {/* PageTopBar matching Invoices.tsx exactly */}
                <PageTopBar
                  searchQuery={invoiceSearchQuery}
                  onSearchChange={setInvoiceSearchQuery}
                  searchPlaceholder="Search invoices..."
                  filterPresets={[
                    {
                      id: "all",
                      label: "All Invoices",
                      count: allClientInvoices.length,
                      isActive: invoiceStatusFilter === "all" && !invoiceSearchQuery,
                      onClick: () => {
                        setInvoiceStatusFilter("all");
                        setInvoiceSearchQuery("");
                      },
                    },
                    {
                      id: "paid",
                      label: "Paid Invoices",
                      count: allClientInvoices.filter((i) => i.status === "paid").length,
                      isActive: invoiceStatusFilter === "paid",
                      onClick: () => setInvoiceStatusFilter("paid"),
                    },
                    {
                      id: "overdue",
                      label: "Overdue Invoices",
                      count: allClientInvoices.filter((i) => i.status === "overdue").length,
                      isActive: invoiceStatusFilter === "overdue",
                      onClick: () => setInvoiceStatusFilter("overdue"),
                    },
                    {
                      id: "draft",
                      label: "Draft Invoices",
                      count: allClientInvoices.filter((i) => i.status === "draft").length,
                      isActive: invoiceStatusFilter === "draft",
                      onClick: () => setInvoiceStatusFilter("draft"),
                    },
                  ]}
                  secondaryActions={
                    <button
                      type="button"
                      onClick={() => setIsRecordPaymentOpen(true)}
                      className="px-3.5 h-[36px] bg-white hover:bg-gray-50 text-slate-700 border border-border rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                      title="Record Payment"
                    >
                      <Wallet className="w-3.5 h-3.5 text-slate-600" />
                      <span>Record Payment</span>
                    </button>
                  }
                  primaryAction={{
                    label: "Create Invoice",
                    icon: <Plus className="w-3.5 h-3.5" />,
                    onClick: () => {
                      if (!hasInvoiceAutomation(selectedDealProcessFilter)) {
                        toast.error("Please build an automation first before creating invoices. Navigate to Automation to configure workflow rules.");
                        return;
                      }
                      setIsCreateInvoiceDrawerOpen(true);
                    },
                    className: "bg-[#1F2937] hover:bg-slate-800 text-white",
                  }}
                />

                {/* TableComponent matching Invoices.tsx exactly */}
                <TableComponent
                  columns={invoiceColumns}
                  data={filteredInvoices}
                  getRowId={(inv) => inv.id}
                  onRowClick={(inv) => {
                    setSelectedInvoiceForDrawer(inv);
                    setIsInvoiceDrawerOpen(true);
                  }}
                  rowActions={[
                    {
                      label: "Add Payment",
                      icon: <CreditCard className="w-3.5 h-3.5 text-emerald-600" />,
                      onClick: (inv) => {
                        if (inv.status !== "paid" && inv.status !== "void") {
                          setSelectedInvoiceForDrawer(inv);
                          setIsRecordPaymentOpen(true);
                        } else {
                          toast.error("Invoice is already paid or void");
                        }
                      },
                    },
                    {
                      label: "View Invoice",
                      icon: <Eye className="w-3.5 h-3.5 text-blue-600" />,
                      onClick: (inv) => {
                        setSelectedInvoiceForDrawer(inv);
                        setIsInvoiceDrawerOpen(true);
                      },
                    },
                    {
                      label: "Delete / Void",
                      icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />,
                      isDanger: true,
                      onClick: (inv) => {
                        if (inv.status === "draft") {
                          deleteInvoice(inv.id);
                          toast.success(`Draft invoice ${inv.id} deleted`);
                        } else {
                          voidInvoice(inv.id);
                          toast.success(`Invoice ${inv.id} voided`);
                        }
                      },
                    },
                  ]}
                  emptyMessage={allClientInvoices.length === 0 ? "No invoices found for this client." : "No invoices match your filter."}
                />
              </div>
            );
          })()}

{/* ── Documents Tab ── */}
          {activeProfileTab === "documents" && (
            <DocumentsTab client={client} entityType="client" />
          )}

          {/* ── Transcripts Tab (Matches AI Scribe Page Table Layout) ── */}
          {activeProfileTab === "products" && (() => {
            const assignedIds = new Set(clientProductList.map((p) => p.id));
            const unassignedServices = globalServiceList.filter(
              (s) => !assignedIds.has(s.id) &&
                (s.name.toLowerCase().includes(assignSearch.toLowerCase()) ||
                  s.description.toLowerCase().includes(assignSearch.toLowerCase()) ||
                  (s.cptCode && s.cptCode.toLowerCase().includes(assignSearch.toLowerCase())))
            );
            const filteredClientProducts = clientProductList.filter(
              (p) =>
                p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
                p.description.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
                (p.cptCode && p.cptCode.toLowerCase().includes(productSearchQuery.toLowerCase()))
            );
            const filteredEmpsProduct = SVC_EMPLOYEES.filter((e) =>
              e.name.toLowerCase().includes(empSearchProduct.toLowerCase())
            );
            const toggleEmpProduct = (id: number | string) =>
              setNewProductForm((f) => ({
                ...f,
                assignedEmployeeIds: f.assignedEmployeeIds.includes(id as any)
                  ? f.assignedEmployeeIds.filter((e) => e !== id)
                  : [...f.assignedEmployeeIds, id as any],
              }));

            return (
              <div className="space-y-4">
                {/* Toolbar */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search assigned products..."
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    />
                  </div>
                  {/* Assign Product Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => { setShowAssignDropdown(!showAssignDropdown); setAssignSearch(""); }}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-xs cursor-pointer"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <Plus className="w-4 h-4" /> Assign Product
                    </button>
                    {showAssignDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => { setShowAssignDropdown(false); setAssignSearch(""); }} />
                        <div
                          className="absolute right-0 mt-2 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden"
                          style={{ width: "320px" }}
                        >
                          {/* Dropdown header */}
                          <div className="px-4 pt-3 pb-2 border-b border-gray-100">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>Assign Existing Product</p>
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                              <input
                                type="text"
                                placeholder="Search products..."
                                value={assignSearch}
                                onChange={(e) => setAssignSearch(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-gray-50 focus:outline-none focus:border-blue-400 transition-all"
                                style={{ fontFamily: "DM Sans, sans-serif" }}
                                autoFocus
                              />
                            </div>
                          </div>
                          {/* Service list */}
                          <div className="max-h-52 overflow-y-auto py-1">
                            {unassignedServices.length === 0 ? (
                              <p className="text-center text-xs text-gray-400 py-6" style={{ fontFamily: "Outfit, sans-serif" }}>
                                {globalServiceList.length === assignedIds.size ? "All products already assigned" : "No results"}
                              </p>
                            ) : (
                              unassignedServices.map((svc) => (
                                <button
                                  key={svc.id}
                                  onClick={() => {
                                    if (!client) return;
                                    assignProductToClient(client.id, svc.id);
                                    setClientProductList(getClientProducts(client.id));
                                    setShowAssignDropdown(false);
                                    setAssignSearch("");
                                    // Trigger event for automations (e.g. invoice generation)
                                    eventBus.emit("client.product_assigned", "client", String(client.id), {
                                      clientId: String(client.id),
                                      clientName: client.name,
                                      clientEmail: client.email,
                                      clientPhone: client.phone,
                                      productId: svc.id,
                                      productName: svc.name,
                                      productPrice: svc.price,
                                      currency: svc.currency,
                                      product: svc,
                                    });
                                    appendActivity({
                                      type: "field_update",
                                      clientId: String(client.id),
                                      processId: "services",
                                      processName: "Client Services",
                                      timestamp: new Date().toISOString(),
                                      fieldLabel: "Product / Service",
                                      newValue: svc.name,
                                      details: {
                                        primary: `Product assigned: ${svc.name}`,
                                        secondary: `${getCurrencySymbol(svc.currency)}${svc.price} · ${svc.duration}m`,
                                      },
                                    });
                                    toast.success(`"${svc.name}" assigned to ${client.name}`);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors text-left cursor-pointer"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                                    <Briefcase className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-sm font-semibold text-gray-800 truncate" style={{ fontFamily: "DM Sans, sans-serif" }}>{svc.name}</p>
                                      {svc.cptCode && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-50 text-cyan-800 border border-cyan-200/80 shrink-0">
                                          CPT {svc.cptCode}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-500 truncate" style={{ fontFamily: "Outfit, sans-serif" }}>
                                      {getCurrencySymbol(svc.currency)}{svc.price} · {svc.duration} min
                                    </p>
                                  </div>
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${svc.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                                    {svc.isActive ? "Active" : "Inactive"}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                          {/* Create new */}
                          <div className="border-t border-gray-100 p-2">
                            <button
                              onClick={() => {
                                setShowAssignDropdown(false);
                                setNewProductForm({ ...SVC_INIT_FORM });
                                setShowNewProductDrawer(true);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              <Plus className="w-4 h-4" /> Create New Product
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Assigned Products Table */}
                {(() => {
                  const productColumns: TableColumn<any>[] = [
                    {
                      header: "Product / Service",
                      accessorKey: "name",
                      align: "left",
                      render: (product) => (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                            <Briefcase className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-gray-900 truncate" style={{ fontFamily: "DM Sans, sans-serif" }}>{product.name}</p>
                              {product.cptCode && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200/80 shrink-0" title="CPT / Claim Service Code">
                                  CPT: {product.cptCode}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>{product.description || "No description"}</p>
                          </div>
                        </div>
                      ),
                    },
                    {
                      header: "Duration",
                      accessorKey: "duration",
                      align: "center",
                      render: (product) => (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs font-semibold text-gray-700" style={{ fontFamily: "DM Sans, sans-serif" }}>{product.duration} min</span>
                        </div>
                      ),
                    },
                    {
                      header: "Price",
                      accessorKey: "price",
                      align: "center",
                      render: (product) => (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg">
                          <span className="text-xs font-bold text-gray-600">{getCurrencySymbol(product.currency)}</span>
                          <span className="text-xs font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>{product.price}</span>
                        </div>
                      ),
                    },
                    {
                      header: "Status",
                      accessorKey: "isActive",
                      align: "center",
                      render: (product) => (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${product.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-600 border border-gray-200"}`} style={{ fontFamily: "Outfit, sans-serif" }}>
                          <span className={`w-1.5 h-1.5 rounded-full ${product.isActive ? "bg-emerald-500" : "bg-gray-400"}`} />
                          {product.isActive ? "Active" : "Inactive"}
                        </span>
                      ),
                    },
                  ];

                  if (filteredClientProducts.length === 0 && !productSearchQuery) {
                    return (
                      <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <Briefcase className="w-7 h-7 text-gray-400" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-700 mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>
                          No products assigned
                        </h3>
                        <p className="text-xs text-gray-500 mb-4" style={{ fontFamily: "Outfit, sans-serif" }}>
                          Assign a product or create a new one for this client
                        </p>
                        <button
                          onClick={() => { setNewProductForm({ ...SVC_INIT_FORM }); setShowNewProductDrawer(true); }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1F2937] hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          <Plus className="w-4 h-4" /> Create New Product
                        </button>
                      </div>
                    );
                  }

                  return (
                    <TableComponent
                      columns={productColumns}
                      data={filteredClientProducts}
                      getRowId={(product) => product.id}
                      rowActions={[
                        {
                          label: "Remove Assignment",
                          icon: <X className="w-3.5 h-3.5 text-rose-500" />,
                          isDanger: true,
                          onClick: (product) => {
                            if (!client) return;
                            unassignProductFromClient(client.id, product.id);
                            setClientProductList(getClientProducts(client.id));
                            toast.success(`"${product.name}" removed from ${client.name}`);
                          },
                        },
                      ]}
                      emptyMessage="No matching products"
                    />
                  );
                })()}

                {/* Create New Product Drawer — same form as Products & Services page */}
                <DrawerShell
                  isOpen={showNewProductDrawer}
                  onClose={() => { setShowNewProductDrawer(false); setNewProductForm({ ...SVC_INIT_FORM }); setEmpSearchProduct(""); setShowEmpDropProduct(false); }}
                  title="Create New Product"
                  subtitle="New product will be added globally and assigned to this client"
                  icon={<Plus className="w-4 h-4 text-blue-600" />}
                  width="max-w-lg"
                  zIndex={700}
                  footer={
                    <div className="flex items-center gap-2 w-full justify-end">
                      <button
                        onClick={() => { setShowNewProductDrawer(false); setNewProductForm({ ...SVC_INIT_FORM }); }}
                        className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (!newProductForm.name.trim()) { toast.error("Product name is required"); return; }
                          if (!newProductForm.currency) { toast.error("Please select a currency"); return; }
                          if (!client) return;
                          const created = addService({
                            name: newProductForm.name.trim(),
                            description: newProductForm.description,
                            cptCode: newProductForm.cptCode?.trim() || undefined,
                            duration: newProductForm.duration,
                            price: newProductForm.price,
                            currency: newProductForm.currency,
                            isActive: newProductForm.isActive,
                            assignedEmployees: newProductForm.assignedEmployeeIds,
                          });
                          assignProductToClient(client.id, created.id);
                          setGlobalServiceList(getStoredServices());
                          setClientProductList(getClientProducts(client.id));
                          // Trigger event for automations (e.g. invoice generation)
                          eventBus.emit("client.product_assigned", "client", String(client.id), {
                            clientId: String(client.id),
                            clientName: client.name,
                            clientEmail: client.email,
                            clientPhone: client.phone,
                            productId: created.id,
                            productName: created.name,
                            productPrice: created.price,
                            currency: created.currency,
                            product: created,
                          });
                          appendActivity({
                            type: "field_update",
                            clientId: String(client.id),
                            processId: "services",
                            processName: "Client Services",
                            timestamp: new Date().toISOString(),
                            fieldLabel: "Product / Service",
                            newValue: created.name,
                            details: {
                              primary: `Created & Assigned Product: ${created.name}`,
                              secondary: `${getCurrencySymbol(created.currency)}${created.price} · Duration: ${created.duration}m`,
                            },
                          });
                          toast.success(`"${created.name}" created and assigned to ${client.name}`);
                          setShowNewProductDrawer(false);
                          setNewProductForm({ ...SVC_INIT_FORM });
                          setEmpSearchProduct("");
                          setShowEmpDropProduct(false);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#1F2937] hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        <Plus className="w-4 h-4" /> Create & Assign
                      </button>
                    </div>
                  }
                >
                  {/* Service Form — identical to Services.tsx */}
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>Product Name *</label>
                      <input type="text" placeholder="e.g. Initial Consultation" value={newProductForm.name} onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" style={{ fontFamily: "DM Sans, sans-serif" }} />
                    </div>

                    {/* CPT / Service Code (Optional for claim submission) */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-gray-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                          CPT / Service Code <span className="text-gray-400 font-normal">(Optional)</span>
                        </label>
                        <span className="text-[11px] text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>For insurance & claims</span>
                      </div>
                      <CPTCodeInput
                        value={newProductForm.cptCode || ""}
                        onChange={(code, suggestion) => {
                          setNewProductForm((prev) => ({
                            ...prev,
                            cptCode: code,
                            duration: (!prev.duration || prev.duration === 30) && suggestion?.typicalDuration ? suggestion.typicalDuration : prev.duration,
                          }));
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>Description</label>
                      <textarea rows={3} placeholder="Brief description..." value={newProductForm.description} onChange={(e) => setNewProductForm({ ...newProductForm, description: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none" style={{ fontFamily: "DM Sans, sans-serif" }} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>Duration (min) *</label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                          <input type="number" min={5} value={newProductForm.duration} onChange={(e) => setNewProductForm({ ...newProductForm, duration: parseInt(e.target.value) || 0 })} className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" style={{ fontFamily: "DM Sans, sans-serif" }} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>Pricing & Currency *</label>
                        <div className="flex gap-2">
                          <select value={newProductForm.currency} onChange={(e) => setNewProductForm({ ...newProductForm, currency: e.target.value })} className="w-28 px-2.5 py-2.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 bg-gray-50 focus:outline-none focus:border-blue-500 transition-all cursor-pointer" style={{ fontFamily: "Outfit, sans-serif" }}>
                            <option value="">Currency</option>
                            {SVC_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
                          </select>
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">{newProductForm.currency ? getCurrencySymbol(newProductForm.currency) : "#"}</span>
                            <input type="number" min={0} placeholder="0" value={newProductForm.price} onChange={(e) => setNewProductForm({ ...newProductForm, price: parseFloat(e.target.value) || 0 })} className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" style={{ fontFamily: "DM Sans, sans-serif" }} />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>Assigned Employees</label>
                      {newProductForm.assignedEmployeeIds.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {newProductForm.assignedEmployeeIds.map((eid) => { const emp = SVC_EMPLOYEES.find((e) => e.id === eid); if (!emp) return null; return (
                            <span key={eid} onClick={() => toggleEmpProduct(eid)} title="Click to remove" className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white cursor-pointer hover:opacity-80 transition-opacity" style={{ backgroundColor: "#1F2937", fontFamily: "Outfit, sans-serif" }}>{emp.initials} <span className="opacity-70">x</span></span>
                          ); })}
                        </div>
                      )}
                      <div className="relative">
                        <button type="button" onClick={() => setShowEmpDropProduct(!showEmpDropProduct)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm flex items-center justify-between focus:outline-none focus:border-blue-500 transition-all bg-white cursor-pointer" style={{ fontFamily: "DM Sans, sans-serif" }}>
                          <span className="text-gray-400">{newProductForm.assignedEmployeeIds.length === 0 ? "Select employees..." : `${newProductForm.assignedEmployeeIds.length} selected`}</span>
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showEmpDropProduct ? "rotate-180" : ""}`} />
                        </button>
                        {showEmpDropProduct && (
                          <>
                            <div className="fixed inset-0 z-[5]" onClick={() => { setShowEmpDropProduct(false); setEmpSearchProduct(""); }} />
                            <div className="absolute left-0 right-0 mt-1 z-10 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                              <div className="border-b border-gray-100 bg-gray-50"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" /><input type="text" placeholder="Search..." value={empSearchProduct} onChange={(e) => setEmpSearchProduct(e.target.value)} onClick={(e) => e.stopPropagation()} className="w-full h-9 pl-9 pr-3 bg-transparent text-xs placeholder:text-gray-400 focus:outline-none" /></div></div>
                              <div className="max-h-48 overflow-y-auto">
                                {filteredEmpsProduct.map((emp) => (
                                  <button key={emp.id} type="button" onClick={(e) => { e.stopPropagation(); toggleEmpProduct(emp.id); }} className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors cursor-pointer ${newProductForm.assignedEmployeeIds.includes(emp.id) ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0" style={{ backgroundColor: "#1F2937" }}>{emp.initials}</div>
                                    <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-gray-800 truncate" style={{ fontFamily: "DM Sans, sans-serif" }}>{emp.name}</p><p className="text-[11px] text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>{emp.role}</p></div>
                                    {newProductForm.assignedEmployeeIds.includes(emp.id) && <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                                  </button>
                                ))}
                                {filteredEmpsProduct.length === 0 && <p className="text-center text-xs text-gray-400 py-5">No employees found</p>}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-200 rounded-xl">
                      <div><p className="text-sm font-semibold text-gray-800" style={{ fontFamily: "DM Sans, sans-serif" }}>Active Product</p><p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>Available for scheduling and booking</p></div>
                      <button type="button" onClick={() => setNewProductForm({ ...newProductForm, isActive: !newProductForm.isActive })} className="cursor-pointer hover:opacity-80 transition-opacity">{newProductForm.isActive ? <ToggleRight className="w-9 h-9 text-blue-600" /> : <ToggleLeft className="w-9 h-9 text-gray-400" />}</button>
                    </div>
                  </div>
                </DrawerShell>
              </div>
            );
          })()}

          {/* Invoice Detail Drawer */}
          <InvoiceDetailDrawer
            isOpen={isInvoiceDrawerOpen}
            onClose={() => setIsInvoiceDrawerOpen(false)}
            invoice={selectedInvoiceForDrawer}
          />
          {/* Create Invoice Drawer */}
          <CreateInvoiceDrawer
            isOpen={isCreateInvoiceDrawerOpen}
            onClose={() => setIsCreateInvoiceDrawerOpen(false)}
          />
          {/* Record Payment Modal */}
          {isRecordPaymentOpen && (
            <RecordPaymentModal
              isOpen={isRecordPaymentOpen}
              onClose={() => setIsRecordPaymentOpen(false)}
              clientId={client.id}
              clientName={client.name}
            />
          )}


          {/* Schedule Appointment from Activity tab */}
          {showScheduleApptFromActivity && (
            <ScheduleAppointmentDrawer
              isOpen={showScheduleApptFromActivity}
              onClose={() => setShowScheduleApptFromActivity(false)}
              mode="create"
              values={activityBookingValues}
              onChange={(patch) => setActivityBookingValues((prev) => ({ ...prev, ...patch }))}
              onSave={handleActivityBookingComplete}
              employees={[
                { id: 1, name: "John Smith", email: "john.smith@healthcare.com" },
                { id: 2, name: "Sarah Johnson", email: "sarah.j@healthcare.com" },
                { id: 4, name: "Emily Davis", email: "emily.d@healthcare.com" },
              ]}
              clients={[
                { id: 0, name: client.name, email: client.email, phone: client.phone },
              ]}
              processStages={{
                "Patient Intake": ["Initial Contact", "Insurance Verification", "Scheduled"],
                "Follow-up Calls": ["Post-Visit Check", "Medication Reminder", "Completed"],
                "Appointment Scheduling": ["Slot Selection", "Confirmation", "Completed"],
              }}
              customFields={[]}
              visibleCustomFieldKeys={[]}
              customFieldValues={{}}
              onCustomFieldChange={() => {}}
              onOpenSelectFields={() => {}}
              onOpenCreateField={() => {}}
            />
          )}

          {/* Process Detail Drawer Component */}
          <ProcessDetailDrawer
            isOpen={showProcessDetailDrawer && selectedProcessLog !== null}
            onClose={() => setShowProcessDetailDrawer(false)}
            log={selectedProcessLog}
            client={client}
            activeTab={processDetailTab}
            onTabChange={(tab) => setProcessDetailTab(tab)}
            activity={(() => {
              if (!selectedProcessLog || !client) return [];
              const realEntries = getActivityForProcess(client.id, selectedProcessLog.process).map((r) => ({
                id: r.id,
                type: r.type,
                timestamp: new Date(r.timestamp).toLocaleString(),
                status: r.status,
                refId: r.refId,
                direction: r.direction,
                sourceStepName: r.details.secondary,
                details: r.details,
              }));
              if (realEntries.length > 0) return realEntries;
              return [
                {
                  id: `act-entry-${selectedProcessLog.id}`,
                  type: "process_entry",
                  timestamp: "2024-04-08 09:00",
                  status: "success",
                  sourceStepName: "Process Intake",
                  refId: selectedProcessLog.id,
                  details: {
                    primary: `Enrolled in "${selectedProcessLog.process}"`,
                    secondary: `Initial Stage: ${selectedProcessLog.currentStage || "New"}`,
                  },
                },
                {
                  id: `act-stage-${selectedProcessLog.id}`,
                  type: "stage_update",
                  timestamp: "2024-04-10 14:00",
                  status: "success",
                  sourceStepName: "Pipeline Automation",
                  refId: selectedProcessLog.id,
                  details: {
                    primary: `Moved to ${selectedProcessLog.currentStage || "Insurance Verification"}`,
                    secondary: `Process: ${selectedProcessLog.process}`,
                  },
                },
              ];
            })()}
            onOpenActivity={(entry) => {
              if (entry.callId || entry.refId) {
                setSelectedCallId(entry.callId || entry.refId);
                setShowCallDetailsFromProfile(true);
              }
            }}
            stageIdx={(() => {
              if (!selectedProcessLog) return 0;
              const stages = getStagesForProcess(selectedProcessLog.process);
              const idx = stages.findIndex((s) => s.label === selectedProcessLog.currentStage);
              return idx !== -1 ? idx + 1 : 1;
            })()}
            onStageChange={(idx) => {
              if (selectedProcessLog) {
                const stages = getStagesForProcess(selectedProcessLog.process);
                const newStageLabel = stages[idx - 1]?.label || selectedProcessLog.currentStage;
                setSelectedProcessLog({ ...selectedProcessLog, currentStage: newStageLabel });
                setDrawerProcessStages((prev) => ({ ...prev, [selectedProcessLog.id]: newStageLabel }));
                toast.success(`Stage updated to ${newStageLabel}`);
              }
            }}
            visibleFieldKeys={drawerVisibleFields}
            onVisibleFieldKeysChange={setDrawerVisibleFields}
            editedValues={editedValues}
            editingField={editingField}
            onStartEditingField={setEditingField}
            onFieldSave={(key, value) => {
              setEditedValues((prev) => ({ ...prev, [key]: value }));
              toast.success("Field saved");
            }}
            showResponsibleDropdown={showResponsibleDropdown}
            onToggleResponsibleDropdown={setShowResponsibleDropdown}
            onOpenTeamMember={() => {}}
            isTeamMemberDrawerOpen={false}
            fieldManagerOpen={processFieldManagerOpen}
            fieldManagerMode={processFieldManagerMode}
            onOpenFieldManager={(mode) => {
              setProcessFieldManagerMode(mode);
              setProcessFieldManagerOpen(true);
            }}
            onCloseFieldManager={() => setProcessFieldManagerOpen(false)}
            teamMembersData={[]}
            dealFields={getAllFields("deal")}
            historyFilters={historyFilters}
            onHistoryFiltersChange={(patch) => setHistoryFilters((prev) => ({ ...prev, ...patch }))}
            onOpenScheduleAppointment={() => {
              setActivityBookingValues((prev) => ({
                ...prev,
                client: {
                  id: 0,
                  name: client.name,
                  email: client.email,
                  phone: client.phone,
                },
              }));
              setShowScheduleApptFromActivity(true);
            }}
          />

          {/* Call Details Drawer Component */}
          <CallDetailDrawer
            isOpen={showCallDetailsFromProfile}
            onClose={() => {
              setShowCallDetailsFromProfile(false);
              setSelectedCallId(null);
            }}
            callId={selectedCallId}
            callLogs={getStoredCallLogs()}
            onSelectCallId={(targetId) => {
              setSelectedCallId(targetId);
            }}
          />

          {/* AI Scribe Modal */}
          <AIScribeModal
            isOpen={showScribeModal}
            onClose={() => setShowScribeModal(false)}
            clientId={String(client.id)}
            clientName={client.name}
            patientAge={client.age || (/sarah|emily|jessica|lisa|amanda|priya|ananya|sneha|kavya|deepika|fatima|layla|charlotte|jennifer/i.test(client.name) ? 34 : 45)}
            patientGender={client.gender || (/sarah|emily|jessica|lisa|amanda|priya|ananya|sneha|kavya|deepika|fatima|layla|charlotte|jennifer/i.test(client.name) ? "Female" : "Male")}
            onViewTranscript={(newSession) => {
              setShowScribeModal(false);
              setScribeSessions(getScribeSessions());
              setSelectedTranscriptSession(newSession);
              setIsTranscriptDrawerOpen(true);
            }}
          />

          {/* Transcript Detail Inspection Drawer */}
          <TranscriptDetailDrawer
            isOpen={isTranscriptDrawerOpen}
            onClose={() => {
              setIsTranscriptDrawerOpen(false);
              setSelectedTranscriptSession(null);
            }}
            session={selectedTranscriptSession}
            client={client}
            onOpenWhatsApp={(session) => {
              setTranscriptWhatsAppTarget(session);
              setShowTranscriptWhatsAppModal(true);
            }}
          />

          {/* WhatsApp Direct Share Modal for Transcripts */}
          {showTranscriptWhatsAppModal && transcriptWhatsAppTarget && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl border border-border">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2" style={{ fontFamily: "Outfit, sans-serif" }}>
                    <Share2 className="h-4 w-4 text-emerald-600" />
                    Send Prescription via WhatsApp
                  </h3>
                  <button onClick={() => setShowTranscriptWhatsAppModal(false)} className="text-slate-400 hover:text-slate-600">
                    ✕
                  </button>
                </div>

                <div className="my-4 text-xs text-muted-foreground">
                  <p className="mb-2">Dispatch digital prescription link to:</p>
                  <div className="rounded-lg bg-slate-50 p-2.5 border border-border font-mono text-xs font-bold text-foreground">
                    {transcriptWhatsAppTarget.clientName}
                  </div>
                  <div className="mt-3 rounded-lg bg-emerald-50 p-2.5 text-[11px] text-emerald-800 border border-emerald-200">
                    "Hello {transcriptWhatsAppTarget.clientName}, your prescription from {transcriptWhatsAppTarget.doctorName} for{" "}
                    {transcriptWhatsAppTarget.extractedData?.diagnosis || "consultation"} is ready to download: https://crm.mantracare.com/rx/doc89421"
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowTranscriptWhatsAppModal(false)}
                    className="rounded-lg px-3.5 py-1.5 text-xs text-muted-foreground hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowTranscriptWhatsAppModal(false);
                      toast.success(`WhatsApp message sent to ${transcriptWhatsAppTarget.clientName}!`);
                    }}
                    className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white shadow-xs flex items-center gap-1.5"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <Send className="h-3.5 w-3.5" /> Send Message Now
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Form Submission Details Modal */}
          {selectedSubmissionForView && (
            <Modal
              isOpen={Boolean(selectedSubmissionForView)}
              onClose={() => setSelectedSubmissionForView(null)}
              title={
                <div>
                  <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    {allForms.find((f) => f.id === selectedSubmissionForView.formId)?.name || "Form Submission Details"}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Template ID: TPL-{String(selectedSubmissionForView.formId).padStart(3, "0")} • Submitted: {selectedSubmissionForView.submittedAt || "Recent"}
                  </p>
                </div>
              }
              maxWidth="lg"
            >
              <div className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
                {Object.entries(selectedSubmissionForView.fields || {}).map(([label, value]) => (
                  <div key={label} className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400" style={{ fontFamily: "Outfit, sans-serif" }}>
                      {label}
                    </p>
                    {typeof value === "string" && value.startsWith("data:image") ? (
                      <div className="border border-slate-200 rounded-lg p-2 bg-white flex items-center justify-center max-w-xs mt-1">
                        <img src={value} alt={label} className="max-h-24 object-contain" />
                      </div>
                    ) : (
                      <p className="text-sm text-slate-800 font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {value ? String(value) : "—"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Modal>
          )}
        </div>
      </div>
    </>
  );
}
