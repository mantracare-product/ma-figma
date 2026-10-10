import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router";
import {
  Search, Plus, X, FileText, Calendar, ChevronLeft, Mail, MapPin, Clock,
  MessageSquare, MessageCircle, LogIn, ArrowRightCircle, PhoneOutgoing, PhoneIncoming, PhoneOff, Settings, CalendarClock,
  Play, ChevronDown, Download, ArrowLeft, Check, Globe, FileSpreadsheet, FileImage, UploadCloud, CheckCircle2, XCircle, Trash2, Eye, CheckCircle,
  Briefcase, ToggleLeft, ToggleRight, DollarSign, User, Workflow, Layers, Mic,
  GripVertical, MoreVertical, Settings as SettingsIcon, Share2, Send, Stethoscope, Video,
  Tag, ShieldCheck,
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
import { getStoredCallLogs, CallLog, updateProcessCallLogFields, updateProcessCallLogStage } from "../../lib/processLogsStore";
import { getMissingRequiredProcessFields, MissingRequiredField } from "../../lib/processFieldValidation";
import RequiredFieldsModal from "../components/deals/RequiredFieldsModal";
import CallDetailDrawer from "../components/telephony/CallDetailDrawer";
import ActivityTab from "../components/activity/ActivityTab";
import ProcessDetailDrawer, { ProcessDetailHistoryFilterState } from "../components/deals/ProcessDetailDrawer";
import ScheduleAppointmentDrawer, { BookingFormValues } from "../components/appointments/ScheduleAppointmentDrawer";
import { appendActivity } from "../../lib/activityEngine";
import { getActivityForProcess, getActivityForClient } from "../../lib/activityLog";
import { CLIENTS_STORE_EVENT, ClientProcessStage } from "../../lib/clientProcessState";
import { useInvoices } from "../context/InvoiceContext";
import InvoiceDetailDrawer from "../components/invoices/InvoiceDetailDrawer";
import CreateInvoiceDrawer from "../components/invoices/CreateInvoiceDrawer";
import RecordPaymentModal from "../components/invoices/RecordPaymentModal";
import { ClientInvoice } from "../types/invoiceTypes";
import { hasInvoiceAutomation, hasAppointmentInvoiceAutomation } from "../../lib/invoiceService";
import { appointmentService, hasAppointmentAutomation } from "../../lib/appointmentService";
import { AUTOMATION_STORE_EVENT } from "../../lib/useAutomationStore";
import { PROCESS_STORE_EVENT } from "../../lib/useProcessStore";
import DocumentsTab from "../components/profile/DocumentsTab";
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
    try {
      window.dispatchEvent(new CustomEvent(CLIENTS_STORE_EVENT));
      window.dispatchEvent(new CustomEvent("ma_record_data_changed"));
    } catch {}
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
    {
      id: "sec-process-pipeline",
      title: "Processes & Pipeline",
      fieldKeys: ["status", "processes"],
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

    // Start with default template if no existing sections
    const baseSections: OverviewSection[] =
      existingSections && existingSections.length > 0
        ? existingSections.map((s) => ({ ...s, fieldKeys: [...s.fieldKeys] }))
        : JSON.parse(JSON.stringify(DEFAULT_CLIENT_SECTIONS));

    // System section IDs that should never be deleted
    const SYSTEM_SEC_IDS = new Set([
      "sec-client-details",
      "sec-general-info",
      "sec-company-details",
      "sec-company-role",
      "sec-process-pipeline",
    ]);

    // Filter out hardcoded sec-custom-fields, and any custom section that does NOT match current org scope
    let updatedSections = baseSections.filter((s) => {
      if (s.id === "sec-custom-fields") return false;
      if (SYSTEM_SEC_IDS.has(s.id) || !s.isCustom) return true;
      return matchingCustomSecIds.has(s.id);
    });

    // Update existing custom sections with latest title/description/icon and merge/filter fields
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

      // CRITICAL: Filter fields in this section to only system fields or fields matching current org!
      const scopedFieldKeys = mergedKeys.filter((k) => SYSTEM_FIELD_KEYS.has(k) || allowedFieldKeys.has(k));

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

  const [clientName, setClientName] = useState(client?.name || "");
  const [clientEmail, setClientEmail] = useState(client?.email || "");
  const [clientPhone, setClientPhone] = useState(client?.phone || "");
  const [clientCompany, setClientCompany] = useState(client?.companyName || "");
  const [clientRole, setClientRole] = useState(client?.jobPosition || "");
  const [clientStatus, setClientStatus] = useState(client?.status || "Active");
  const [clientLocation, setClientLocation] = useState(client?.location || "");
  const [clientCountry, setClientCountry] = useState(client?.country || "");
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>(client?.processes ?? []);
  const [dynamicFieldValues, setDynamicFieldValues] = useState<Record<string, any>>({});

  const [clientSections, setClientSections] = useState<OverviewSection[]>(() => {
    const savedSections = (client as any)?.customSections;
    return computeMergedClientSections(
      savedSections,
      getCustomSections("client"),
      getAllFields("client"),
      activeOrganization,
      client?.visibleFieldKeys
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

      const savedSections = (client as any).customSections;
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
    else {
      setDynamicFieldValues((prev) => ({ ...prev, [key]: val }));
    }

    if (client) {
      setClients((prev) =>
        prev.map((c) => {
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
          else {
            updated[key] = val;
          }
          return updated;
        })
      );

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
    if (client) {
      const allAssignedKeys = newSections.flatMap((s) => s.fieldKeys);
      setClients((prev) =>
        prev.map((c) => {
          if (c.id !== client.id) return c;
          return {
            ...c,
            customSections: newSections,
            visibleFieldKeys: allAssignedKeys,
          } as any;
        })
      );
    }
  };

  const { getInvoicesByClient, simulatePayment } = useInvoices();
  const [selectedInvoiceForDrawer, setSelectedInvoiceForDrawer] = useState<ClientInvoice | null>(null);
  const [isInvoiceDrawerOpen, setIsInvoiceDrawerOpen] = useState(false);
  const [isCreateInvoiceDrawerOpen, setIsCreateInvoiceDrawerOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>("all");
  const [showScribeModal, setShowScribeModal] = useState(false);


  // All state variables verbatim from Clients.tsx drawer
  const [activeProfileTab, setActiveProfileTab] = useState<"overview" | "processes" | "activity" | "forms" | "appointments" | "invoices" | "documents" | "products" | "transcripts">("overview");

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
    const stored = sessionStorage.getItem("appointments_v1");
    const all: any[] = stored ? JSON.parse(stored) : [];
    const updated = all.map((a: any) => (String(a.id) === String(apptId) ? { ...a, status: newStatus } : a));
    sessionStorage.setItem("appointments_v1", JSON.stringify(updated));
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

  const drawerClientProcesses = useMemo(() => {
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
  }, [client, drawerProcessStages]);

  const drawerActivityItems = useMemo(() => {
    const findProcessId = (heading: string) => {
      const process = drawerClientProcesses.find((p) => p.name === heading);
      return process?.id || "process-1";
    };
    const mockItems = [
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
  }, [client?.id, drawerClientProcesses]);

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

  const clientSubmissions = allSubmissions.filter(s => s.clientId === client.id);
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
            <div className="flex items-center gap-2 flex-shrink-0">
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
                { id: "transcripts" as const, label: "Transcripts" },
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
                      setClients((prev) =>
                        prev.map((c) => (c.id === client.id ? { ...c, processes: procs } : c))
                      );
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
                    {(() => {
                      const processColumns: TableColumn<any>[] = [
                        {
                          header: "Process / Deal",
                          accessorKey: "name",
                          align: "left",
                          render: (process, idx) => {
                            const processCode = `PRC-${client.id}-${idx + 1}`;
                            return (
                              <div className="flex flex-col" style={{ maxWidth: "200px" }}>
                                <span
                                  title={process.name}
                                  className="hover:underline overflow-hidden text-ellipsis whitespace-nowrap"
                                  style={{ color: "#4F8EF7", fontWeight: "600", fontFamily: "DM Sans, sans-serif", fontSize: "13px" }}
                                >
                                  {process.name}
                                </span>
                                <span className="whitespace-nowrap" style={{ fontSize: "11px", color: "#9CA3AF" }}>{processCode}</span>
                              </div>
                            );
                          },
                        },
                        {
                          header: "Stage",
                          align: "center",
                          render: (process) => {
                            const currentStage = drawerProcessStages[process.id] || process.currentStage;
                            const stages = getStagesForProcess(process.name);
                            const currentIndex = stages.findIndex((s) => s.label === currentStage);
                            return (
                              <div className="flex flex-col items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center" style={{ gap: "3px" }}>
                                  {stages.map((stage, sIdx) => {
                                    const isFilled = sIdx <= currentIndex;
                                    const stageKey = `${process.id}-${sIdx}`;
                                    return (
                                      <div key={stage.id} style={{ position: "relative" }}>
                                        <button
                                          type="button"
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
                            );
                          },
                        },
                        {
                          header: "Deal Type",
                          accessorKey: "dealType",
                          align: "center",
                          render: (process) => (
                            <span className="whitespace-nowrap" style={{ fontSize: "13px", color: "#1F2937", fontFamily: "Outfit, sans-serif" }}>
                              {process.dealType}
                            </span>
                          ),
                        },
                        {
                          header: "Source",
                          accessorKey: "source",
                          align: "center",
                          render: (process) => (
                            <span className="whitespace-nowrap" style={{ fontSize: "13px", color: "#6B7280", fontFamily: "Outfit, sans-serif" }}>
                              {process.source}
                            </span>
                          ),
                        },
                        {
                          header: "Status",
                          accessorKey: "status",
                          align: "center",
                          render: (process) => (
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
                          ),
                        },
                        {
                          header: "Created",
                          accessorKey: "created",
                          align: "center",
                          render: (process) => (
                            <span className="whitespace-nowrap" style={{ fontSize: "12px", color: "#6B7280" }}>{process.created}</span>
                          ),
                        },
                        {
                          header: "Responsible",
                          accessorKey: "responsible",
                          align: "left",
                          render: (process) => {
                            const initials = process.responsible
                              ? process.responsible.split(" ").map((n) => n[0]).join("")
                              : "JS";
                            return (
                              <div className="flex items-center gap-2">
                                <div
                                  className="flex items-center justify-center rounded-full text-xs font-semibold"
                                  style={{ width: "26px", height: "26px", backgroundColor: "#EBF4FF", color: "#4F8EF7", fontFamily: "DM Sans, sans-serif", flexShrink: 0 }}
                                >
                                  {initials}
                                </div>
                                <span className="whitespace-nowrap" style={{ fontSize: "13px", color: "#1F2937", fontWeight: "500" }}>{process.responsible}</span>
                              </div>
                            );
                          },
                        },
                      ];

                      return (
                        <TableComponent
                          columns={processColumns}
                          data={filteredProcesses}
                          getRowId={(p) => p.id}
                          enableSelection={true}
                          selectedIds={new Set(selectedProcessIds)}
                          onSelectionChange={(newSet) => setSelectedProcessIds(Array.from(newSet))}
                          onRowClick={(process) => {
                            const allLogs = getStoredCallLogs();
                            const matchingLog = allLogs.find(
                              (l) => (l.clientId === client.id || l.client.toLowerCase() === client.name.toLowerCase()) &&
                                     (l.process.toLowerCase() === process.name.toLowerCase())
                            ) || {
                              id: process.id.startsWith("CALL-") ? process.id : `CALL-${process.name.toUpperCase().replace(/\s+/g, "-")}`,
                              client: client.name,
                              clientId: client.id,
                              type: "Outbound",
                              status: process.status,
                              process: process.name,
                              currentStage: process.currentStage,
                              duration: "4:32",
                              date: process.created !== "—" ? process.created : "2024-04-10 14:30",
                              hasRecording: true,
                              hasTranscript: true,
                              hasScheduledCall: true,
                            };

                            setSelectedProcessLog(matchingLog);
                            setProcessDetailTab("general");
                            setShowProcessDetailDrawer(true);
                          }}
                          emptyMessage="No processes found"
                        />
                      );
                    })()}
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
              (client?.name && a.clientName && a.clientName.toLowerCase() === client.name.toLowerCase())
            );

            const getResolvedServiceName = (appt: any) => {
              if (appt.service && appt.service !== "—") return appt.service;
              if (appt.serviceName) return appt.serviceName;
              if (appt.serviceId !== undefined && appt.serviceId !== null) {
                const fromStore = getStoredServices().find((s) => String(s.id) === String(appt.serviceId));
                if (fromStore) return fromStore.name;
                const fromMock = MOCK_SERVICES.find((s) => s.id === String(appt.serviceId) || s.id === `srv-${appt.serviceId}`);
                if (fromMock) return fromMock.name;
              }
              if (appt.title) {
                for (const s of getStoredServices()) {
                  if (appt.title.toLowerCase().includes(s.name.toLowerCase())) return s.name;
                }
                for (const m of MOCK_SERVICES) {
                  if (appt.title.toLowerCase().includes(m.name.toLowerCase())) return m.name;
                }
                if (appt.title.toLowerCase().includes("initial consultation")) return "Initial Consultation";
                if (appt.title.toLowerCase().includes("consultation")) return "Consultation";
                if (appt.title.toLowerCase().includes("follow-up") || appt.title.toLowerCase().includes("follow up")) return "Follow-up Visit";
                if (appt.title.toLowerCase().includes("dental")) return "Dental Cleaning";
                if (appt.title.toLowerCase().includes("x-ray") || appt.title.toLowerCase().includes("xray")) return "X-Ray Imaging";
              }
              return "—";
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
              const matchesStatus =
                appointmentStatusFilter === "all" ||
                appt.status === appointmentStatusFilter ||
                (appointmentStatusFilter === "pending" && (appt.status === "pending-accept" || appt.status === "pending"));
              return matchesSearch && matchesStatus;
            });

            const handleOpenApptTranscript = (appt: any, pName: string) => {
              const currentSessions = getScribeSessions();
              const matched = currentSessions.find((s) =>
                (s.appointmentId && (s.appointmentId === String(appt.id) || s.appointmentId === `apt-${appt.id}`)) ||
                (s.clientId === String(client.id) && (s.sessionName?.includes(String(appt.id)) || s.transcript?.fullText?.includes(appt.title)))
              );

              if (matched) {
                setSelectedTranscriptSession(matched);
                setIsTranscriptDrawerOpen(true);
                return;
              }

              // Create & link a structured transcript for this appointment
              const srvName = getResolvedServiceName(appt);
              const scenario = PRESET_SCENARIOS[0];
              const newSession: ScribeSession = {
                id: `scribe-apt-${appt.id}-${Date.now()}`,
                clientId: String(client.id),
                clientName: client.name,
                patientAge: client.age || (/sarah|emily|jessica|lisa|amanda|priya|ananya|sneha|kavya|deepika|fatima|layla|charlotte|jennifer/i.test(client.name) ? 34 : 45),
                patientGender: client.gender || (/sarah|emily|jessica|lisa|amanda|priya|ananya|sneha|kavya|deepika|fatima|layla|charlotte|jennifer/i.test(client.name) ? "Female" : "Male"),
                appointmentId: String(appt.id),
                sessionName: `${appt.title || "Consultation"} (${appt.date || "Scheduled"})`,
                doctorId: String(appt.employeeId || "doc-1"),
                doctorName: pName || "Dr. Priya Sharma",
                sessionDate: appt.date || new Date().toISOString(),
                durationSeconds: 76,
                status: "completed",
                createdAt: Date.now(),
                transcript: {
                  fullText: scenario.transcriptText,
                  utterances: scenario.utterances,
                },
                extractedData: {
                  ...scenario.extractedData,
                  chiefComplaint: appt.notes || `${appt.title || "Patient"} consultation encounter`,
                  diagnosis: srvName !== "—" ? `${srvName} Assessment` : "Clinical Consultation Assessment",
                },
              };

              saveScribeSession(newSession);
              setScribeSessions(getScribeSessions());
              setSelectedTranscriptSession(newSession);
              setIsTranscriptDrawerOpen(true);
            };

            const ALL_EMPLOYEES_MAP: Record<string, string> = {
              "1": "John Smith",
              "2": "Sarah Johnson",
              "4": "Emily Davis",
              "5": "Dr. Robert Martinez",
              "6": "Lisa Anderson",
            };

            const formatDateTime = (dateStr: string, timeStr: string) => {
              let datePart = dateStr || "—";
              try {
                const parts = dateStr?.split("-");
                if (parts?.length === 3) {
                  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                  datePart = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                }
              } catch { /* noop */ }
              if (!timeStr) return datePart;
              try {
                const [h, m] = timeStr.split(":");
                const hour = parseInt(h, 10);
                const ampm = hour >= 12 ? "PM" : "AM";
                const h12 = hour % 12 || 12;
                return `${datePart}, ${h12}:${m} ${ampm}`;
              } catch { return datePart; }
            };

            const getStatusPill = (status: string) => {
              const s = (status || "").toLowerCase();
              let cls = "bg-amber-100 text-amber-800";
              let label = status;
              if (s === "completed") { cls = "bg-emerald-100 text-emerald-800"; label = "Completed"; }
              else if (s === "scheduled" || s === "confirmed") { cls = "bg-blue-100 text-blue-800"; label = "Scheduled"; }
              else if (s === "cancelled") { cls = "bg-rose-100 text-rose-800"; label = "Cancelled"; }
              else if (s === "no-show") { cls = "bg-slate-100 text-slate-700"; label = "No Show"; }
              else if (s === "pending-accept" || s === "pending") { cls = "bg-amber-100 text-amber-800"; label = "Pending"; }
              return (
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${cls}`}>
                  {label}
                </span>
              );
            };

            return (
              <div className="space-y-4" key={appointmentRefreshKey}>
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap flex-1 w-full sm:w-auto">
                    <div className="relative flex-1 min-w-[200px] max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search appointment or service..."
                        value={appointmentSearchQuery}
                        onChange={(e) => setAppointmentSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      />
                    </div>
                    <select
                      value={appointmentStatusFilter}
                      onChange={(e) => setAppointmentStatusFilter(e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <option value="all">All Statuses</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  {(() => {
                    const clientProcId = client.processes?.[0];
                    const apptAutoConfigured = hasAppointmentAutomation(clientProcId);
                    return (
                      <>
                        <button
                          onClick={() => {
                            if (!apptAutoConfigured) {
                              toast.error("Please build an automation first before booking appointments. Navigate to Automation to configure workflow rules.");
                              return;
                            }
                            setActivityBookingValues({
                              title: "Consultation Appointment",
                              description: "",
                              note: "",
                              tags: "",
                              processId: clientProcId || "",
                              stageId: "",
                              date: new Date().toISOString().split("T")[0],
                              startHour: 10,
                              startMinute: 0,
                              sessionType: "video",
                              client: { id: client.id, name: client.name, email: client.email || "", phone: client.phone || "" },
                              provider: { id: 1, name: "John Smith", email: "john.smith@healthcare.com" },
                              generateInvoice: hasAppointmentInvoiceAutomation(clientProcId),
                            });
                            setShowScheduleApptFromActivity(true);
                          }}
                          className="px-4 py-2 bg-[#1F2937] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          <Plus className="w-4 h-4" /> Book Appointment
                        </button>
                      </>
                    );
                  })()}
                </div>

                {!hasAppointmentAutomation(client.processes?.[0]) && (
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

                {/* Table */}
                {filteredAppts.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 p-6">
                    <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                      {clientAppts.length === 0 ? "No appointments yet" : "No appointments match your filter"}
                    </p>
                  </div>
                ) : (
                  (() => {
                    const apptColumns: TableColumn<any>[] = [
                      {
                        key: "title",
                        header: "Title",
                        align: "left",
                        render: (appt) => (
                          <span className="font-bold text-slate-900 max-w-[180px] truncate block">
                            {appt.title || "Appointment"}
                          </span>
                        ),
                      },
                      {
                        key: "dateTime",
                        header: "Date & Time",
                        align: "center",
                        render: (appt) => (
                          <span className="whitespace-nowrap text-slate-700">
                            {formatDateTime(appt.date, appt.time)}
                          </span>
                        ),
                      },
                      {
                        key: "provider",
                        header: "Provider",
                        align: "center",
                        render: (appt) => {
                          const providerName =
                            ALL_EMPLOYEES_MAP[String(appt.employeeId)] ||
                            appt.provider?.name ||
                            "John Smith";
                          return <span className="whitespace-nowrap text-slate-700">{providerName}</span>;
                        },
                      },
                      {
                        key: "service",
                        header: "Product / Service",
                        align: "left",
                        render: (appt) => (
                          <span className="text-slate-600 max-w-[180px] truncate block">
                            {getResolvedServiceName(appt)}
                          </span>
                        ),
                      },
                      {
                        key: "transcript",
                        header: "View Transcript",
                        align: "center",
                        render: (appt) => {
                          const providerName =
                            ALL_EMPLOYEES_MAP[String(appt.employeeId)] ||
                            appt.provider?.name ||
                            "John Smith";
                          return (
                            <button
                              type="button"
                              onClick={() => handleOpenApptTranscript(appt, providerName)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-[#1A73E8] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              <FileText className="w-3.5 h-3.5 text-[#1A73E8]" />
                              View Transcript
                            </button>
                          );
                        },
                      },
                      {
                        key: "status",
                        header: "Status",
                        align: "center",
                        render: (appt) => getStatusPill(appt.status),
                      },
                      {
                        key: "actions",
                        header: "Actions",
                        align: "right",
                        render: (appt) => {
                          const providerName =
                            ALL_EMPLOYEES_MAP[String(appt.employeeId)] ||
                            appt.provider?.name ||
                            "John Smith";
                          const isCompleted = appt.status === "completed";
                          const isCancelled = appt.status === "cancelled";

                          return (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                                  title="Actions"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40 bg-white border border-slate-200 rounded-xl shadow-lg p-1 z-50">
                                <DropdownMenuItem
                                  onClick={() => handleOpenApptTranscript(appt, providerName)}
                                  className="px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer flex items-center gap-2"
                                  style={{ fontFamily: "Outfit, sans-serif" }}
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  View Transcript
                                </DropdownMenuItem>
                                {!isCompleted && (
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateApptStatus(appt.id, "completed")}
                                    className="px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer flex items-center gap-2"
                                    style={{ fontFamily: "Outfit, sans-serif" }}
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Complete
                                  </DropdownMenuItem>
                                )}
                                {!isCancelled && !isCompleted && (
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateApptStatus(appt.id, "cancelled")}
                                    className="px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer flex items-center gap-2"
                                    style={{ fontFamily: "Outfit, sans-serif" }}
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    Cancel
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => handleDeleteAppt(appt.id)}
                                  className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer flex items-center gap-2"
                                  style={{ fontFamily: "Outfit, sans-serif" }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          );
                        },
                      },
                    ];

                    return (
                      <TableComponent
                        columns={apptColumns}
                        data={filteredAppts}
                        getRowId={(appt, idx) => appt.id || idx}
                        emptyMessage={clientAppts.length === 0 ? "No appointments yet" : "No appointments match your filter"}
                      />
                    );
                  })()
                )}
              </div>
            );
          })()}

          {/* ── Invoices Tab ── */}
          {activeProfileTab === "invoices" && (() => {
            const allClientInvoices = getInvoicesByClient(client.id);

            // Filter logic
            const filteredInvoices = allClientInvoices.filter((inv) => {
              // Search query filter
              const searchLower = invoiceSearchQuery.toLowerCase().trim();
              const matchesSearch =
                !searchLower ||
                inv.id.toLowerCase().includes(searchLower) ||
                (inv.appointmentTitle && inv.appointmentTitle.toLowerCase().includes(searchLower)) ||
                inv.lineItems.some((li) => li.description.toLowerCase().includes(searchLower));

              // Status filter
              let matchesStatus = true;
              if (invoiceStatusFilter === "in_progress") {
                matchesStatus = inv.status === "draft" || inv.status === "sent" || inv.status === "viewed";
              } else if (invoiceStatusFilter !== "all") {
                matchesStatus = inv.status === invoiceStatusFilter;
              }

              return matchesSearch && matchesStatus;
            });

            const totalInvoiced = allClientInvoices.filter(i => i.status !== "void").reduce((sum, i) => sum + i.total, 0);
            const totalPaid = allClientInvoices.filter(i => i.status === "paid").reduce((sum, i) => sum + i.total, 0);
            const totalOutstanding = allClientInvoices.filter(i => i.status === "sent" || i.status === "viewed" || i.status === "overdue").reduce((sum, i) => sum + i.total, 0);

            return (
              <div className="space-y-4">
                {/* Header Toolbar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap flex-1 w-full sm:w-auto">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[200px] max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search invoice # or product..."
                        value={invoiceSearchQuery}
                        onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      />
                    </div>

                    {/* Quick Filter Chip: Invoices in progress */}
                    <button
                      onClick={() =>
                        setInvoiceStatusFilter(
                          invoiceStatusFilter === "in_progress" ? "all" : "in_progress"
                        )
                      }
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                        invoiceStatusFilter === "in_progress"
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      Invoices in progress
                    </button>

                    {/* Status Dropdown Filter */}
                    <select
                      value={invoiceStatusFilter}
                      onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="all">All Statuses</option>
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="viewed">Viewed</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                      <option value="void">Void</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsRecordPaymentOpen(true)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <DollarSign className="w-4 h-4" /> Collect Payment
                    </button>
                    {/* + Create Invoice Button */}
                    <button
                      onClick={() => {
                        if (!hasInvoiceAutomation(client.processes?.[0])) {
                          toast.error("Please build an automation first before creating invoices. Navigate to Automation to configure workflow rules.");
                          return;
                        }
                        setIsCreateInvoiceDrawerOpen(true);
                      }}
                      className="px-4 py-2 bg-[#1F2937] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <Plus className="w-4 h-4" /> + Create Invoice
                    </button>
                  </div>

                </div>

                {/* Summary stat strip */}
                <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block">Total Invoiced</span>
                    <span className="text-sm font-bold text-slate-900">${totalInvoiced.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Paid</span>
                    <span className="text-sm font-bold text-emerald-600">${totalPaid.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Outstanding</span>
                    <span className="text-sm font-bold text-amber-600">${totalOutstanding.toFixed(2)}</span>
                  </div>
                </div>

                {/* Invoices Table */}
                {(() => {
                  const invoiceColumns: TableColumn<any>[] = [
                    {
                      header: "ID",
                      accessorKey: "id",
                      align: "left",
                      render: (inv) => (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInvoiceForDrawer(inv);
                            setIsInvoiceDrawerOpen(true);
                          }}
                          className="font-bold text-blue-600 hover:underline"
                        >
                          {inv.id}
                        </button>
                      ),
                    },
                    {
                      header: "Name / Title",
                      accessorKey: "appointmentTitle",
                      align: "left",
                      render: (inv) => (
                        <span className="font-bold text-slate-900 max-w-[180px] truncate block">
                          {inv.appointmentTitle || "Standalone Invoice"}
                        </span>
                      ),
                    },
                    {
                      header: "Amount",
                      accessorKey: "total",
                      align: "right",
                      render: (inv) => (
                        <span className="font-bold text-slate-900">
                          ${inv.total.toFixed(2)}
                        </span>
                      ),
                    },
                    {
                      header: "Products",
                      align: "left",
                      render: (inv) => {
                        const productNames = (inv.lineItems || []).map((li: any) => li.description);
                        const productSummary =
                          productNames.length <= 2
                            ? productNames.join(", ")
                            : `${productNames.slice(0, 2).join(", ")} +${productNames.length - 2} more`;
                        return (
                          <span className="text-slate-600 max-w-[220px] truncate block" title={productNames.join(", ")}>
                            {productSummary || "N/A"}
                          </span>
                        );
                      },
                    },
                    {
                      header: "Status",
                      accessorKey: "status",
                      align: "center",
                      render: (inv) => (
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            inv.status === "paid"
                              ? "bg-emerald-100 text-emerald-800"
                              : inv.status === "sent"
                              ? "bg-blue-100 text-blue-800"
                              : inv.status === "overdue"
                              ? "bg-rose-100 text-rose-800"
                              : inv.status === "viewed"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {inv.status}
                        </span>
                      ),
                    },
                  ];

                  return (
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
                          label: "View Invoice",
                          icon: <Eye className="w-3.5 h-3.5" />,
                          onClick: (inv) => {
                            setSelectedInvoiceForDrawer(inv);
                            setIsInvoiceDrawerOpen(true);
                          },
                        },
                      ]}
                      emptyMessage="No invoices match your filter"
                    />
                  );
                })()}
              </div>
            );
          })()}

          {/* ── Documents Tab ── */}
          {activeProfileTab === "documents" && (
            <DocumentsTab client={client} entityType="client" />
          )}

          {/* ── Transcripts Tab (Matches AI Scribe Page Table Layout) ── */}
          {activeProfileTab === "transcripts" && (() => {
            const clientTranscripts = scribeSessions.filter((s) => {
              if (!client) return false;
              const cId = String(client.id || "").toLowerCase().trim();
              const sCId = String(s.clientId || "").toLowerCase().trim();
              const idMatch =
                (sCId && sCId === cId) ||
                (sCId && sCId === cId.replace("cl-", "")) ||
                (parseInt(cId.replace("cl-", ""), 10) > 0 && sCId === String(parseInt(cId.replace("cl-", ""), 10)));
              const nameMatch =
                Boolean(s.clientName && client.name && s.clientName.toLowerCase().trim() === client.name.toLowerCase().trim());
              return idMatch || nameMatch;
            });

            const filteredTranscripts = clientTranscripts.filter((s) => {
              if (!transcriptSearchQuery.trim()) return true;
              const q = transcriptSearchQuery.toLowerCase();
              return (
                (client?.name && client.name.toLowerCase().includes(q)) ||
                s.clientName.toLowerCase().includes(q) ||
                s.sessionName?.toLowerCase().includes(q) ||
                s.doctorName?.toLowerCase().includes(q) ||
                s.extractedData?.diagnosis?.toLowerCase().includes(q) ||
                s.extractedData?.chiefComplaint?.toLowerCase().includes(q) ||
                s.transcript?.fullText?.toLowerCase().includes(q)
              );
            });

            const allSelected =
              filteredTranscripts.length > 0 &&
              filteredTranscripts.every((s) => transcriptSelectedRows.has(s.id));
            const someSelected =
              filteredTranscripts.some((s) => transcriptSelectedRows.has(s.id)) && !allSelected;

            const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
              if (e.target.checked) {
                setTranscriptSelectedRows(new Set(filteredTranscripts.map((s) => s.id)));
              } else {
                setTranscriptSelectedRows(new Set());
              }
            };

            const handleSelectRow = (id: string) => {
              const next = new Set(transcriptSelectedRows);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              setTranscriptSelectedRows(next);
            };

            const formatTranscriptTime = (seconds: number) => {
              const mins = Math.floor(seconds / 60);
              const secs = seconds % 60;
              return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
            };

            const getTranscriptStatusBadge = (status?: string) => {
              if (status === "recording" || status === "transcribed") {
                return (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    In Progress
                  </span>
                );
              }
              if (status === "upcoming" || status === "scheduled") {
                return (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Upcoming
                  </span>
                );
              }
              return (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Completed
                </span>
              );
            };

            const handleDeleteTranscript = (sessionId: string, e: React.MouseEvent) => {
              e.stopPropagation();
              deleteScribeSession(sessionId);
              setTranscriptOpenMenuId(null);
              setScribeSessions(getScribeSessions());
              toast.success("Transcript deleted");
            };

            return (
              <div className="space-y-4">
                {/* ─── Search & Action Bar ───────────────────────────────────────────── */}
                <div className="bg-card rounded-t-xl p-4 border border-border shadow-sm">
                  <div className="flex items-center gap-3">
                    {/* Search Bar */}
                    <div className="flex-1">
                      <div className="relative search-bar-container">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none z-10" />
                        <div className="w-full h-[44px] bg-input-background border border-input rounded-xl flex items-center pl-10 pr-3">
                          <input
                            type="text"
                            placeholder="Search transcripts by diagnosis, doctor, keyword..."
                            value={transcriptSearchQuery}
                            onChange={(e) => setTranscriptSearchQuery(e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground h-full"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          />
                          {transcriptSearchQuery && (
                            <button
                              onClick={() => setTranscriptSearchQuery("")}
                              className="text-xs text-muted-foreground hover:text-foreground px-2"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              ✕ Clear
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Capsule Button to Add Scribe */}
                    <Button
                      variant="primary"
                      onClick={() => setShowScribeModal(true)}
                      className="h-[44px] px-5 rounded-full whitespace-nowrap flex items-center gap-2 text-xs font-semibold shadow-xs"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Scribe</span>
                    </Button>
                  </div>
                </div>

                {/* ─── Transcripts Table ─── */}
                {(() => {
                  const transcriptColumns: TableColumn<any>[] = [
                    {
                      header: "Name",
                      accessorKey: "clientName",
                      align: "left",
                      render: (s) => (
                        <span
                          className="font-medium text-sm text-[#1A73E8] hover:underline cursor-pointer"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          {client?.name || s.clientName}
                        </span>
                      ),
                    },
                    {
                      header: "Session",
                      align: "center",
                      render: (s) => (
                        <span className="text-xs text-foreground font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
                          {s.appointmentId && s.appointmentId !== "none"
                            ? new Date(s.sessionDate || s.createdAt).toLocaleDateString("en-IN", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : (s.sessionDate
                                ? new Date(s.sessionDate).toLocaleDateString("en-IN", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : "—")}
                        </span>
                      ),
                    },
                    {
                      header: "Duration",
                      accessorKey: "durationSeconds",
                      align: "center",
                      render: (s) => (
                        <span className="font-mono text-xs text-foreground">
                          {formatTranscriptTime(s.durationSeconds)}
                        </span>
                      ),
                    },
                    {
                      header: "Responsible",
                      accessorKey: "doctorName",
                      align: "left",
                      render: (s) => (
                        <span className="text-xs text-foreground font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
                          {s.doctorName || "Dr. Priya Sharma"}
                        </span>
                      ),
                    },
                    {
                      header: "Created At",
                      accessorKey: "createdAt",
                      align: "center",
                      render: (s) => (
                        <span className="text-xs text-muted-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
                          {new Date(s.createdAt).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      ),
                    },
                    {
                      header: "Status",
                      accessorKey: "status",
                      align: "center",
                      render: (s) => getTranscriptStatusBadge(s.status),
                    },
                  ];

                  return (
                    <TableComponent
                      columns={transcriptColumns}
                      data={filteredTranscripts}
                      getRowId={(s) => s.id}
                      enableSelection={true}
                      selectedIds={transcriptSelectedRows}
                      onSelectionChange={(newSet) => setTranscriptSelectedRows(newSet)}
                      onRowClick={(s) => {
                        setSelectedTranscriptSession(s);
                        setIsTranscriptDrawerOpen(true);
                      }}
                      rowActions={[
                        {
                          label: "View Transcript",
                          icon: <Eye className="w-3.5 h-3.5 text-[#1A73E8]" />,
                          onClick: (s) => {
                            setSelectedTranscriptSession(s);
                            setIsTranscriptDrawerOpen(true);
                          },
                        },
                        {
                          label: "Download PDF",
                          icon: <Download className="w-3.5 h-3.5 text-[#1A73E8]" />,
                          onClick: (s) => {
                            issuePrescriptionDocument(s);
                            toast.success(`Prescription downloaded for ${client?.name || s.clientName}!`);
                          },
                        },
                        {
                          label: "Share via WhatsApp",
                          icon: <Share2 className="w-3.5 h-3.5 text-emerald-600" />,
                          onClick: (s) => {
                            setTranscriptWhatsAppTarget(s);
                            setShowTranscriptWhatsAppModal(true);
                          },
                        },
                        {
                          label: "Delete Record",
                          icon: <Trash2 className="w-3.5 h-3.5 text-red-500" />,
                          isDanger: true,
                          onClick: (s) => handleDeleteTranscript(s.id, { stopPropagation: () => {} } as any),
                        },
                      ]}
                      emptyMessage={transcriptSearchQuery ? "No matching transcripts" : `No transcripts for ${client?.name || "this client"}`}
                    />
                  );
                })()}
              </div>
            );
          })()}

          {/* ── Products & Services Tab ── */}
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
