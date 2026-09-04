import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import {
  Search, Plus, X, FileText, Calendar, ChevronLeft, Mail, MapPin, Clock,
  MessageSquare, MessageCircle, LogIn, ArrowRightCircle, PhoneOutgoing, PhoneIncoming, PhoneOff, Settings, CalendarClock,
  Play, ChevronDown, Download, ArrowLeft, Check, Globe, FileSpreadsheet, FileImage, UploadCloud, CheckCircle2, XCircle, Trash2, Eye, CheckCircle,
  Briefcase, ToggleLeft, ToggleRight, DollarSign, User, Workflow, Layers, Mic,
  GripVertical, MoreVertical, Settings as SettingsIcon, Share2, Send, Stethoscope, Video,
  ExternalLink, RefreshCw, ShieldCheck, Building2, Copy,
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
import { CLIENTS_STORE_EVENT, ClientProcessStage } from "../../lib/clientProcessState";
import { getActivityForClient, getActivityForProcess } from "../../lib/activityLog";
import { getStoredCallLogs, CallLog } from "../../lib/processLogsStore";
import CallDetailDrawer from "../components/telephony/CallDetailDrawer";
import ActivityTab from "../components/activity/ActivityTab";
import ProcessDetailDrawer, { ProcessDetailHistoryFilterState } from "../components/deals/ProcessDetailDrawer";
import ScheduleAppointmentDrawer, { BookingFormValues } from "../components/appointments/ScheduleAppointmentDrawer";
import AppointmentDetailDrawer, { AppointmentDetailData } from "../components/appointments/AppointmentDetailDrawer";
import { appendActivity } from "../../lib/activityEngine";
import { recordAppointmentEligibility } from "../../lib/rcmStore";
import { getEligibilityBadge } from "../components/rcm/EligibilityBadge";
import { useInvoices } from "../context/InvoiceContext";
import { useRcm } from "../context/RcmContext";
import ClaimDetailDrawer from "../components/rcm/ClaimDetailDrawer";
import { Claim } from "../types/rcmTypes";
import InvoiceDetailDrawer from "../components/invoices/InvoiceDetailDrawer";
import CreateInvoiceDrawer from "../components/invoices/CreateInvoiceDrawer";
import { ClientInvoice } from "../types/invoiceTypes";
import DocumentsTab from "../components/profile/DocumentsTab";
import InsuranceProvidersTab from "../components/profile/InsuranceProvidersTab";
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
import DraggableOverviewSections, { OverviewSection } from "../components/profile/DraggableOverviewSections";
import {
  Service, EMPLOYEES as SVC_EMPLOYEES, CURRENCIES as SVC_CURRENCIES, INIT_FORM as SVC_INIT_FORM,
  getCurrencySymbol, getStoredServices, addService, onServicesChanged,
  getClientProducts, assignProductToClient, unassignProductFromClient,
} from "../../lib/servicesStore";
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

  const DEFAULT_CLIENT_SECTIONS: OverviewSection[] = [
    {
      id: "sec-client-details",
      title: "Client Details",
      iconName: "user",
      fieldKeys: ["name", "email", "phone", "location", "country"],
    },
    {
      id: "sec-company-details",
      title: "Company & Professional",
      iconName: "briefcase",
      fieldKeys: ["company", "role"],
    },
    {
      id: "sec-process-pipeline",
      title: "Processes & Pipeline",
      iconName: "workflow",
      fieldKeys: ["status", "processes"],
    },
    {
      id: "sec-custom-fields",
      title: "Custom Fields",
      iconName: "file-text",
      fieldKeys: [],
    },
  ];

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
    if ((client as any)?.customSections && Array.isArray((client as any).customSections)) {
      return (client as any).customSections;
    }
    const defaultSecs: OverviewSection[] = JSON.parse(JSON.stringify(DEFAULT_CLIENT_SECTIONS));
    if (client?.visibleFieldKeys && Array.isArray(client.visibleFieldKeys)) {
      const customKeys = client.visibleFieldKeys.filter((k: string) => !HARDCODED_KEYS.has(k));
      if (customKeys.length > 0) {
        defaultSecs[3].fieldKeys = customKeys;
      }
    }
    return defaultSecs;
  });

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

      if ((client as any).customSections && Array.isArray((client as any).customSections)) {
        setClientSections((client as any).customSections);
      } else {
        const defaultSecs: OverviewSection[] = JSON.parse(JSON.stringify(DEFAULT_CLIENT_SECTIONS));
        if (client.visibleFieldKeys && Array.isArray(client.visibleFieldKeys)) {
          const customKeys = client.visibleFieldKeys.filter((k: string) => !HARDCODED_KEYS.has(k));
          if (customKeys.length > 0) {
            defaultSecs[3].fieldKeys = customKeys;
          }
        }
        setClientSections(defaultSecs);
      }

      const dyn: Record<string, any> = {};
      Object.keys(client).forEach((k) => {
        if (!HARDCODED_KEYS.has(k)) {
          dyn[k] = (client as any)[k];
        }
      });
      setDynamicFieldValues(dyn);
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
    }
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

  const { getInvoicesByClient } = useInvoices();
  const [selectedInvoiceForDrawer, setSelectedInvoiceForDrawer] = useState<ClientInvoice | null>(null);
  const [isInvoiceDrawerOpen, setIsInvoiceDrawerOpen] = useState(false);
  const [isCreateInvoiceDrawerOpen, setIsCreateInvoiceDrawerOpen] = useState(false);
  const [showScribeModal, setShowScribeModal] = useState(false);


  // All state variables verbatim from Clients.tsx drawer
  const [activeProfileTab, setActiveProfileTab] = useState<"overview" | "processes" | "activity" | "forms" | "notes" | "appointments" | "invoices" | "billing" | "documents" | "products" | "transcripts">("overview");
  const [billingSubTab, setBillingSubTab] = useState<"provider" | "claims">("provider");
  const { claims: allRcmClaims, patientBalances: allRcmBalances, eligibilityChecks: allRcmEligibility, recheckEligibility } = useRcm();
  const [selectedRcmClaim, setSelectedRcmClaim] = useState<Claim | null>(null);
  const [openMenuClaimId, setOpenMenuClaimId] = useState<string | null>(null);

  useEffect(() => {
    if (activeProfileTab === "invoices") {
      setActiveProfileTab("appointments");
    }
  }, [activeProfileTab]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    const subTabParam = params.get("subtab");
    if (tabParam === "invoices") {
      setActiveProfileTab("appointments");
    } else if (tabParam === "billing") {
      setActiveProfileTab("billing");
      if (subTabParam === "claims" || subTabParam === "provider") {
        setBillingSubTab(subTabParam);
      }
    }
  }, [location.search]);

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
  const [formsTabMode, setFormsTabMode] = useState<"forms" | "flows">("forms");
  const [expandedFlowStepId, setExpandedFlowStepId] = useState<string | null>(null);
  const [expandedFlowId, setExpandedFlowId] = useState<number | null>(null);
  const [expandedFormGroupId, setExpandedFormGroupId] = useState<number | null>(null);
  const [activeProcessTabDrawer, setActiveProcessTabDrawer] = useState<string>("all");
  const [editingProcesses, setEditingProcesses] = useState(false);
  const [processDropdownOpen, setProcessDropdownOpen] = useState(false);
  const [drawerProcessStages, setDrawerProcessStages] = useState<Record<string, string>>({});
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);
  const [showFieldPicker, setShowFieldPicker] = useState(false);

  // ── Appointments Tab State ──
  const [appointments, setAppointments] = useState<any[]>([]);
  const [showCallDetailsFromProfile, setShowCallDetailsFromProfile] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [appointmentSearchQuery, setAppointmentSearchQuery] = useState("");
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState<string>("all");
  const [appointmentRefreshKey, setAppointmentRefreshKey] = useState(0);
  const [selectedAppointmentForDetail, setSelectedAppointmentForDetail] = useState<AppointmentDetailData | null>(null);
  const [isAppointmentDetailDrawerOpen, setIsAppointmentDetailDrawerOpen] = useState(false);
  const [selectedProfileApptIds, setSelectedProfileApptIds] = useState<string[]>([]);
  const [isCheckingProfileEligibility, setIsCheckingProfileEligibility] = useState(false);

  // ── Sync product assignments when clientId changes or appointments update ──
  useEffect(() => {
    if (!client) return;

    // Auto-assign any services from existing client appointments to ensure products are assigned
    try {
      const stored = sessionStorage.getItem("appointments_v1");
      if (stored) {
        const all: any[] = JSON.parse(stored);
        const storedSvcs = getStoredServices();
        all.forEach((appt: any) => {
          const isClientMatch =
            (client.email && appt.clientEmail && appt.clientEmail.toLowerCase() === client.email.toLowerCase()) ||
            (client.phone && appt.clientPhone && appt.clientPhone.replace(/\D/g, "") === client.phone.replace(/\D/g, "")) ||
            (client.name && appt.clientName && appt.clientName.toLowerCase() === client.name.toLowerCase()) ||
            (appt.clientId && String(appt.clientId).toLowerCase() === String(client.id).toLowerCase());
          if (isClientMatch) {
            let sId: number | undefined = appt.serviceId ? Number(appt.serviceId) : undefined;
            if (!sId || isNaN(sId)) {
              const matchedSvc = storedSvcs.find((s) => s.name.toLowerCase() === (appt.service || appt.serviceName || "").toLowerCase());
              if (matchedSvc) sId = matchedSvc.id;
            }
            if (sId && !isNaN(sId)) {
              assignProductToClient(String(client.id), sId);
            }
          }
        });
      }
    } catch {}

    setClientProductList(getClientProducts(client.id));
    const unsub = onServicesChanged(() => {
      setGlobalServiceList(getStoredServices());
      setClientProductList(getClientProducts(client.id));
    });
    return unsub;
  }, [client?.id, appointmentRefreshKey]);

  // Documents initialization & action handlers with clientDocumentsStore sync

  // ── Appointments Handlers ──

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
    setAppointmentRefreshKey((k) => k + 1);
    toast.success("Appointment deleted");
  };

  const handleToggleSelectAllProfileAppts = (filteredAppts: any[]) => {
    if (selectedProfileApptIds.length === filteredAppts.length && filteredAppts.length > 0) {
      setSelectedProfileApptIds([]);
    } else {
      setSelectedProfileApptIds(filteredAppts.map((a: any) => String(a.id)));
    }
  };

  const handleToggleSelectProfileAppt = (id: string) => {
    setSelectedProfileApptIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBatchDeleteProfileAppts = () => {
    if (selectedProfileApptIds.length === 0) return;
    if (confirm(`Are you sure you want to cancel ${selectedProfileApptIds.length} appointment(s)?`)) {
      const stored = sessionStorage.getItem("appointments_v1");
      const all: any[] = stored ? JSON.parse(stored) : [];
      const updated = all.map((a: any) =>
        selectedProfileApptIds.includes(String(a.id)) ? { ...a, status: "cancelled" } : a
      );
      sessionStorage.setItem("appointments_v1", JSON.stringify(updated));
      setSelectedProfileApptIds([]);
      setAppointmentRefreshKey((k) => k + 1);
      toast.success(`${selectedProfileApptIds.length} appointment(s) cancelled`);
    }
  };

  const handleRunBatchEligibilityForProfileAppts = (targetAppts: any[]) => {
    if (targetAppts.length === 0) {
      toast.error("No appointments to verify");
      return;
    }

    setIsCheckingProfileEligibility(true);
    toast.info(`Querying 270/271 clearinghouse for ${targetAppts.length} appointment(s)...`);

    setTimeout(() => {
      const stored = sessionStorage.getItem("appointments_v1");
      const all: any[] = stored ? JSON.parse(stored) : [];

      targetAppts.forEach((appt: any) => {
        recordAppointmentEligibility({
          appointmentId: appt.id,
          clientId: client.id,
          clientName: appt.clientName || client.name,
          appointmentDate: appt.date,
          status: "active",
          payerName: appt.insuranceProvider || client.insuranceProvider || "Blue Cross Blue Shield",
          copayAmount: appt.copayAmount || 25,
          deductibleRemaining: 150,
          coinsurance: 20,
        });
      });

      const updated = all.map((appt: any) => {
        if (targetAppts.some((t: any) => String(t.id) === String(appt.id))) {
          return {
            ...appt,
            eligibility: "active",
            eligibilityStatus: "active",
            copayAmount: appt.copayAmount || 25,
          };
        }
        return appt;
      });

      sessionStorage.setItem("appointments_v1", JSON.stringify(updated));
      setIsCheckingProfileEligibility(false);
      setAppointmentRefreshKey((k) => k + 1);
      toast.success(`Coverage verified active for ${targetAppts.length} appointment(s) (Copay: $25, Deductible: $150)`);
    }, 700);
  };

  const ALL_EMPLOYEES_MAP: Record<string, string> = {
    "1": "John Smith",
    "2": "Sarah Johnson",
    "4": "Emily Davis",
    "5": "Dr. Robert Martinez",
    "6": "Lisa Anderson",
  };

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

  const handleOpenApptTranscript = (appt: any, pName: string) => {
    if (!client) return;
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

    // Create & link a structured transcript/chart note for this appointment
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
      return null;
    }
    const hh = String(activityBookingValues.startHour).padStart(2, "0");
    const mm = String(activityBookingValues.startMinute).padStart(2, "0");
    const timeStr = `${hh}:${mm}`;
    const dateFormatted = new Date(activityBookingValues.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    // Save to appointments_v1
    const stored = sessionStorage.getItem("appointments_v1");
    const existing: any[] = stored ? JSON.parse(stored) : [];

    const storedServices = getStoredServices();
    const chosenService =
      (activityBookingValues.serviceId
        ? storedServices.find((s) => String(s.id) === String(activityBookingValues.serviceId))
        : null) ||
      (activityBookingValues.serviceName
        ? storedServices.find((s) => s.name.toLowerCase() === activityBookingValues.serviceName!.toLowerCase())
        : null) ||
      storedServices.find((s) => s.isActive);

    const chosenServiceName =
      activityBookingValues.serviceName ||
      chosenService?.name ||
      "Initial Consultation";

    const chosenServiceId = chosenService?.id || (activityBookingValues.serviceId ? Number(activityBookingValues.serviceId) : 1);

    const resolvedElgStatus = "pending";

    const newAppt = {
      id: existing.length > 0 ? Math.max(...existing.map((a: any) => a.id ?? 0)) + 1 : Date.now(),
      clientId: String(client?.id || ""),
      clientName: activityBookingValues.client.name,
      clientEmail: activityBookingValues.client.email,
      clientPhone: activityBookingValues.client.phone,
      clientStatus: activityBookingValues.client.status,
      employeeId: activityBookingValues.provider.id,
      providerName: activityBookingValues.provider.name,
      serviceId: chosenServiceId,
      service: chosenServiceName,
      serviceName: chosenServiceName,
      date: activityBookingValues.date,
      time: timeStr,
      duration: chosenService?.duration || 60,
      status: "scheduled",
      eligibility: resolvedElgStatus,
      eligibilityStatus: resolvedElgStatus,
      primaryInsurance: activityBookingValues.primaryInsurance,
      secondaryInsurance: activityBookingValues.hasSecondaryInsurance ? activityBookingValues.secondaryInsurance : undefined,
      preCertification: activityBookingValues.preCertification,
      syncToCase: activityBookingValues.syncToCase,
      notes: activityBookingValues.note || activityBookingValues.description || undefined,
      title: activityBookingValues.title.trim(),
    };
    sessionStorage.setItem("appointments_v1", JSON.stringify([...existing, newAppt]));

    // Persist initial eligibility check into RCM store as pending
    if (client) {
      recordAppointmentEligibility({
        appointmentId: newAppt.id,
        clientId: String(client.id),
        clientName: activityBookingValues.client.name,
        appointmentDate: activityBookingValues.date,
        status: "pending",
      });
    }

    // Auto-assign the booked service / product to this client
    if (client) {
      assignProductToClient(String(client.id), chosenServiceId);
      setClientProductList(getClientProducts(client.id));
    }

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

    toast.success("Appointment created successfully!");
    setActiveProfileTab("appointments");
    return {
      ...newAppt,
      providerName: activityBookingValues.provider.name,
      serviceName: chosenServiceName,
    };
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
                { id: "notes" as const, label: "Notes" },
                { id: "appointments" as const, label: "Appointments" },
                { id: "billing" as const, label: "Billing & Insurance" },
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
                                    onClick={() => {
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
                                    className="transition-colors border-b cursor-pointer hover:bg-blue-50/50"
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
                  </div>
                );
              })()}
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
                                            {typeof value === "string" && value.startsWith("data:image") ? (
                                              <div className="border border-slate-200 rounded-lg p-2 bg-white flex items-center justify-center max-w-xs">
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
            let all: any[] = stored ? JSON.parse(stored) : [];

            // Seed initial realistic appointments if empty
            if (all.length === 0) {
              all = [
                {
                  id: 101,
                  clientId: "CL-001",
                  clientName: "Sarah Johnson",
                  clientEmail: "sarah.j@email.com",
                  clientPhone: "5551234567",
                  employeeId: 1,
                  serviceId: 1,
                  service: "Initial Consultation",
                  serviceName: "Initial Consultation",
                  title: "Consultation Appointment",
                  date: "2026-09-04",
                  time: "10:00",
                  duration: 60,
                  status: "completed",
                  eligibility: "active",
                  notes: "Annual physical exam and clinical assessment completed.",
                },
                {
                  id: 102,
                  clientId: "CL-001",
                  clientName: "Sarah Johnson",
                  clientEmail: "sarah.j@email.com",
                  clientPhone: "5551234567",
                  employeeId: 2,
                  serviceId: 2,
                  service: "Follow-up Visit",
                  serviceName: "Follow-up Visit",
                  title: "Cardiology Follow-up Visit",
                  date: "2026-09-18",
                  time: "14:30",
                  duration: 30,
                  status: "scheduled",
                  eligibility: "active",
                  notes: "Review lab results and cardiology monitoring log.",
                },
                {
                  id: 103,
                  clientId: "CL-002",
                  clientName: "Michael Chen",
                  clientEmail: "mchen@email.com",
                  clientPhone: "5552345678",
                  employeeId: 1,
                  serviceId: 1,
                  service: "Initial Consultation",
                  serviceName: "Initial Consultation",
                  title: "Initial Dermatology Consultation",
                  date: "2026-09-04",
                  time: "11:15",
                  duration: 45,
                  status: "completed",
                  eligibility: "inconclusive",
                  notes: "Dermatological assessment and patch testing.",
                },
                {
                  id: 104,
                  clientId: "CL-003",
                  clientName: "Emily Davis",
                  clientEmail: "emily.d@email.com",
                  clientPhone: "5553456789",
                  employeeId: 4,
                  serviceId: 3,
                  service: "Dental Cleaning",
                  serviceName: "Dental Cleaning",
                  title: "Dental Cleaning Intake",
                  date: "2026-09-04",
                  time: "09:30",
                  duration: 45,
                  status: "scheduled",
                  eligibility: "active",
                  notes: "Initial oral hygiene evaluation.",
                },
                {
                  id: 105,
                  clientId: "CL-006",
                  clientName: "David Martinez",
                  clientEmail: "d.martinez@email.com",
                  clientPhone: "5556789012",
                  employeeId: 5,
                  serviceId: 2,
                  service: "Follow-up Visit",
                  serviceName: "Follow-up Visit",
                  title: "Routine Check-up",
                  date: "2026-09-05",
                  time: "13:00",
                  duration: 30,
                  status: "scheduled",
                  eligibility: "inactive",
                  notes: "Annual wellness check.",
                },
                {
                  id: 106,
                  clientId: "CL-013",
                  clientName: "Priya Sharma",
                  clientEmail: "priya.sharma@email.com",
                  clientPhone: "9820172818",
                  employeeId: 5,
                  serviceId: 2,
                  service: "Follow-up Visit",
                  serviceName: "Follow-up Visit",
                  title: "Endocrinology Review",
                  date: "2026-09-05",
                  time: "15:00",
                  duration: 45,
                  status: "completed",
                  eligibility: "active",
                  notes: "Thyroid panel follow-up and clinical prescription renewal.",
                },
              ];
              sessionStorage.setItem("appointments_v1", JSON.stringify(all));
              assignProductToClient("CL-001", 1);
              assignProductToClient("CL-002", 1);
              assignProductToClient("CL-003", 3);
              assignProductToClient("CL-006", 2);
              assignProductToClient("CL-013", 2);
            }

            let clientAppts = all.filter((a: any) =>
              (client?.email && a.clientEmail && a.clientEmail.toLowerCase() === client.email.toLowerCase()) ||
              (client?.phone && a.clientPhone && a.clientPhone.replace(/\D/g, "") === client.phone.replace(/\D/g, "")) ||
              (client?.name && a.clientName && a.clientName.toLowerCase() === client.name.toLowerCase())
            );

            if (clientAppts.length === 0 && client) {
              const defaultApptsForClient = [
                {
                  id: Date.now(),
                  clientName: client.name,
                  clientEmail: client.email || "",
                  clientPhone: client.phone || "",
                  employeeId: 1,
                  serviceId: 1,
                  service: "Consultation",
                  serviceName: "Consultation",
                  title: "Initial Patient Consultation",
                  date: new Date().toISOString().split("T")[0],
                  time: "10:00",
                  duration: 45,
                  status: "completed",
                  eligibility: "active",
                  notes: "Initial consultation and clinical assessment.",
                },
                {
                  id: Date.now() + 1,
                  clientName: client.name,
                  clientEmail: client.email || "",
                  clientPhone: client.phone || "",
                  employeeId: 2,
                  serviceId: 2,
                  service: "Follow-up Visit",
                  serviceName: "Follow-up Visit",
                  title: "Follow-up Appointment",
                  date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
                  time: "14:00",
                  duration: 30,
                  status: "scheduled",
                  eligibility: "active",
                  notes: "Follow-up care review.",
                },
              ];
              all = [...all, ...defaultApptsForClient];
              sessionStorage.setItem("appointments_v1", JSON.stringify(all));
              clientAppts = defaultApptsForClient;
            }

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

            const allApptsSelected = filteredAppts.length > 0 && filteredAppts.every((a: any) => selectedProfileApptIds.includes(String(a.id)));
            const someApptsSelected = filteredAppts.some((a: any) => selectedProfileApptIds.includes(String(a.id))) && !allApptsSelected;

            return (
              <div className="space-y-4 w-full" key={appointmentRefreshKey} style={{ fontFamily: "DM Sans, sans-serif" }}>
                {/* Toolbar Card */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
                  {selectedProfileApptIds.length > 0 ? (
                    <>
                      {/* Selection Info */}
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-[#181e25]" style={{ fontFamily: "Outfit, sans-serif" }}>
                          {selectedProfileApptIds.length} selected
                        </span>
                        <button
                          onClick={() => setSelectedProfileApptIds([])}
                          className="text-xs text-slate-500 hover:text-slate-900 underline transition-colors cursor-pointer"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          Clear selection
                        </button>
                      </div>

                      {/* Relevant Action Buttons */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={isCheckingProfileEligibility}
                          onClick={() => {
                            const targets = filteredAppts.filter((a: any) => selectedProfileApptIds.includes(String(a.id)));
                            handleRunBatchEligibilityForProfileAppts(targets);
                          }}
                          className="gap-1.5 h-9"
                        >
                          {isCheckingProfileEligibility ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ShieldCheck className="w-3.5 h-3.5" />
                          )}
                          Re-run Eligibility Check ({selectedProfileApptIds.length})
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleBatchDeleteProfileAppts}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 h-9 gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Cancel Schedule
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Search & Filters */}
                      <div className="flex items-center gap-2.5 flex-wrap flex-1 w-full sm:w-auto">
                        <div className="relative flex-1 min-w-[220px] max-w-sm">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search appointment, service, or date..."
                            value={appointmentSearchQuery}
                            onChange={(e) => setAppointmentSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1456f0] font-medium placeholder:text-slate-400"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          />
                        </div>

                        {/* Styled Dropdown Options UI (DESIGN.md) */}
                        <div className="relative">
                          <select
                            value={appointmentStatusFilter}
                            onChange={(e) => setAppointmentStatusFilter(e.target.value)}
                            className="appearance-none pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1456f0] hover:bg-slate-50/80 cursor-pointer shadow-2xs transition-colors"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          >
                            <option value="all">All Statuses</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="completed">Completed</option>
                            <option value="pending">Pending</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      {/* Default Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isCheckingProfileEligibility || filteredAppts.length === 0}
                          onClick={() => handleRunBatchEligibilityForProfileAppts(filteredAppts)}
                          className="gap-1.5 h-9"
                          title={`Verify clearinghouse coverage for all (${filteredAppts.length})`}
                        >
                          {isCheckingProfileEligibility ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ShieldCheck className="w-3.5 h-3.5" />
                          )}
                          Run Eligibility Check (All)
                        </Button>

                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            const activeSvcs = getStoredServices().filter((s) => s.isActive);
                            const defaultSvc = activeSvcs[0] || { id: 1, name: "Initial Consultation" };
                            setActivityBookingValues({
                              title: `${defaultSvc.name} Appointment`,
                              description: "",
                              note: "",
                              tags: "",
                              processId: client.processes?.[0] || "",
                              stageId: "",
                              date: new Date().toISOString().split("T")[0],
                              startHour: 10,
                              startMinute: 0,
                              sessionType: "video",
                              serviceId: String(defaultSvc.id),
                              serviceName: defaultSvc.name,
                              client: { id: client.id, name: client.name, email: client.email || "", phone: client.phone || "", status: client.status },
                              provider: { id: 1, name: "John Smith", email: "john.smith@healthcare.com" },
                            });
                            setShowScheduleApptFromActivity(true);
                          }}
                          className="gap-1.5 h-9"
                        >
                          <Plus className="w-3.5 h-3.5" /> Book Appointment
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                {/* Full-Width Table Card */}
                {filteredAppts.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 p-6 shadow-2xs w-full">
                    <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                      {clientAppts.length === 0 ? "No appointments yet" : "No appointments match your filter"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Click "Book Appointment" to schedule an encounter for {client.name}.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden text-xs w-full">
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left border-collapse table-auto">
                        <thead className="bg-gradient-to-r from-[#181e25] via-[#243342] to-[#2c3e50] text-white">
                          <tr>
                            <th className="py-3.5 px-4 w-10 text-left" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={allApptsSelected}
                                ref={(el) => {
                                  if (el) el.indeterminate = someApptsSelected;
                                }}
                                onChange={() => handleToggleSelectAllProfileAppts(filteredAppts)}
                                className="w-3.5 h-3.5 cursor-pointer rounded border-[1.5px] border-[#E5E7EB] checked:bg-[#4F8EF7] checked:border-[#4F8EF7]"
                              />
                            </th>
                            <th className="py-3.5 px-4 text-[11px] font-bold text-white uppercase tracking-wider">Title</th>
                            <th className="py-3.5 px-4 text-[11px] font-bold text-white uppercase tracking-wider">Service</th>
                            <th className="py-3.5 px-4 text-[11px] font-bold text-white uppercase tracking-wider">Date &amp; Time</th>
                            <th className="py-3.5 px-4 text-[11px] font-bold text-white uppercase tracking-wider">Provider</th>
                            <th className="py-3.5 px-4 text-[11px] font-bold text-white uppercase tracking-wider">Eligibility</th>
                            <th className="py-3.5 px-4 text-[11px] font-bold text-white uppercase tracking-wider">Status</th>
                            <th className="py-3.5 px-4 text-[11px] font-bold text-white uppercase tracking-wider text-right w-16">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {filteredAppts.map((appt: any, idx: number) => {
                            const isSelected = selectedProfileApptIds.includes(String(appt.id));
                            const providerName =
                              ALL_EMPLOYEES_MAP[String(appt.employeeId)] ||
                              appt.provider?.name ||
                              "John Smith";
                            const isCompleted = appt.status === "completed";
                            const isCancelled = appt.status === "cancelled";

                            const clientCheck = allRcmEligibility.find(
                              (c) =>
                                String(c.appointmentId) === String(appt.id) ||
                                c.appointmentId === `APT-${appt.id}` ||
                                (c.clientId === client.id && (!c.appointmentId || c.appointmentDate === appt.date)) ||
                                (c.clientName && c.clientName.toLowerCase() === (appt.clientName || client.name || "").toLowerCase())
                            );

                            const elgStatus = (appt.eligibility || appt.eligibilityStatus || clientCheck?.status || (client?.status === "Inactive" ? "inactive" : "active")).toLowerCase();

                            const clientInvoices = getInvoicesByClient(client.id);
                            const apptInvoice =
                              (appt.invoiceId ? clientInvoices.find((i) => i.id === appt.invoiceId) : null) ||
                              clientInvoices.find(
                                (i) =>
                                  (i.appointmentId && String(i.appointmentId) === String(appt.id)) ||
                                  (i.appointmentTitle && appt.title && i.appointmentTitle.toLowerCase() === appt.title.toLowerCase())
                              );
                            const invoiceId = appt.invoiceId || apptInvoice?.id || (appt.id ? `INV-${appt.id}` : "-");

                            const openDetail = () => {
                              setSelectedAppointmentForDetail({
                                ...appt,
                                clientId: client.id,
                                clientName: appt.clientName || client.name,
                                clientEmail: appt.clientEmail || client.email,
                                clientPhone: appt.clientPhone || client.phone,
                                clientStatus: client.status,
                                providerName: providerName,
                                serviceName: getResolvedServiceName(appt),
                                invoiceId: invoiceId !== "-" ? invoiceId : undefined,
                                eligibility: elgStatus,
                                eligibilityStatus: elgStatus,
                                eligibilityCheck: clientCheck,
                                primaryInsurance: appt.primaryInsurance,
                                secondaryInsurance: appt.secondaryInsurance,
                                preCertification: appt.preCertification,
                                syncToCase: appt.syncToCase,
                              });
                              setIsAppointmentDetailDrawerOpen(true);
                            };

                            return (
                              <tr
                                key={appt.id || idx}
                                onClick={openDetail}
                                className={`transition-colors cursor-pointer group ${isSelected ? "bg-[#E8F0FE]" : "hover:bg-blue-50/40"}`}
                              >
                                <td className="py-3.5 px-4 w-10" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleSelectProfileAppt(String(appt.id))}
                                    className="w-3.5 h-3.5 cursor-pointer rounded border-[1.5px] border-[#E5E7EB] checked:bg-[#4F8EF7] checked:border-[#4F8EF7]"
                                  />
                                </td>
                                <td className="py-3.5 px-4">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDetail();
                                    }}
                                    className="font-bold text-slate-900 hover:text-blue-600 transition-colors text-left cursor-pointer group/title"
                                    style={{ fontFamily: "Outfit, sans-serif" }}
                                  >
                                    <span className="group-hover/title:underline">{appt.title || "Appointment"}</span>
                                  </button>
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 font-medium">
                                  {getResolvedServiceName(appt)}
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 font-medium">
                                  {formatDateTime(appt.date, appt.time)}
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 font-medium">
                                  {providerName}
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                  {(() => {
                                    const s = (elgStatus || "active").toLowerCase().trim();
                                    let bg = "bg-emerald-50 text-emerald-700 border-emerald-200";
                                    let label = "Active";
                                    if (s === "inactive") { bg = "bg-rose-50 text-rose-700 border-rose-200"; label = "Inactive"; }
                                    else if (s === "not_covered" || s === "not covered") { bg = "bg-rose-50 text-rose-700 border-rose-200"; label = "Not Covered"; }
                                    else if (s === "inconclusive") { bg = "bg-amber-50 text-amber-800 border-amber-200"; label = "Inconclusive"; }
                                    else if (s === "self_pay" || s === "self-pay") { bg = "bg-indigo-50 text-indigo-700 border-indigo-200"; label = "Self-Pay"; }
                                    else if (s === "pending") { bg = "bg-slate-100 text-slate-700 border-slate-200"; label = "Pending"; }
                                    return (
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${bg}`}>
                                        {label}
                                      </span>
                                    );
                                  })()}
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                  {getStatusPill(appt.status)}
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button
                                          type="button"
                                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                          title="More Options"
                                        >
                                          <MoreVertical className="w-4 h-4" />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-44 bg-white border border-slate-200 rounded-xl shadow-lg p-1 z-50">
                                        <DropdownMenuItem
                                          onClick={openDetail}
                                          className="px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer flex items-center gap-2"
                                          style={{ fontFamily: "Outfit, sans-serif" }}
                                        >
                                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                          View Details
                                        </DropdownMenuItem>
                                        {isCompleted ? (
                                          <DropdownMenuItem
                                            onClick={() => handleOpenApptTranscript(appt, providerName)}
                                            className="px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer flex items-center gap-2"
                                            style={{ fontFamily: "Outfit, sans-serif" }}
                                          >
                                            <FileText className="w-3.5 h-3.5" />
                                            View Chart Note
                                          </DropdownMenuItem>
                                        ) : (
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
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Billing & Insurance Tab (Provider | Claims) ── */}
          {activeProfileTab === "billing" && (() => {
            const clientEligibility = allRcmEligibility.find(
              (e) => e.clientId === client.id || e.clientName.toLowerCase() === client.name.toLowerCase()
            );
            const clientBalance = allRcmBalances.find(
              (b) => b.clientId === client.id || b.clientName.toLowerCase() === client.name.toLowerCase()
            );
            const clientClaims = allRcmClaims.filter(
              (c) => c.clientId === client.id || c.clientName.toLowerCase() === client.name.toLowerCase()
            );
            const activeDenials = clientClaims.filter((c) => c.status === "denied");

            // Healthcare rendering provider for this client
            const renderingProviderName =
              clientClaims.find((c) => c.providerName)?.providerName ||
              "Dr. Amanda Clark, MD";

            return (
              <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
                {/* ── Sub-Tab Navigation: Provider | Claims ── */}
                <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg border border-slate-200/60">
                    {(
                      [
                        { id: "provider" as const, label: "Provider" },
                        { id: "claims" as const, label: "Claims" },
                      ] as const
                    ).map((sub) => {
                      const isActive = billingSubTab === sub.id;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setBillingSubTab(sub.id)}
                          className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                            isActive
                              ? "bg-[#181e25] text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                          }`}
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          {sub.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Sub-Tab 1: PROVIDER ── */}
                {billingSubTab === "provider" && (
                  <InsuranceProvidersTab />
                )}

                {/* ── Sub-Tab 2: CLAIMS ── */}
                {billingSubTab === "claims" && (
                  <div className="space-y-6">
                    {/* Active Denial Alert Banner */}
                    {activeDenials.length > 0 && (
                      <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3 text-rose-950">
                          <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold">
                            !
                          </div>
                          <div>
                            <h4 className="font-bold">Active Payer Denials Pending Resolution ({activeDenials.length})</h4>
                            <p className="text-rose-800/80">
                              {activeDenials.map((d) => `${d.id} (${d.denialCarc || "Denied"})`).join(", ")}. Patient statements are gated until settled.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate(`/revenue-cycle/worklist/denials`)}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold shadow-2xs cursor-pointer"
                        >
                          Open Denial Board
                        </button>
                      </div>
                    )}

                    {/* Claims Table */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white">
                            <tr>
                              <th className="px-5 py-3 text-xs font-semibold text-white uppercase tracking-wider">Claim ID</th>
                              <th className="px-5 py-3 text-xs font-semibold text-white uppercase tracking-wider">Service Date</th>
                              <th className="px-5 py-3 text-xs font-semibold text-white uppercase tracking-wider">Payer</th>
                              <th className="px-5 py-3 text-xs font-semibold text-white uppercase tracking-wider text-right">Billed</th>
                              <th className="px-5 py-3 text-xs font-semibold text-white uppercase tracking-wider text-right">Insurance Paid</th>
                              <th className="px-5 py-3 text-xs font-semibold text-white uppercase tracking-wider text-right">Patient Due</th>
                              <th className="px-5 py-3 text-xs font-semibold text-white uppercase tracking-wider text-center">Status</th>
                              <th className="px-5 py-3 text-xs font-semibold text-white uppercase tracking-wider text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-sans">
                            {clientClaims.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="text-center py-8 text-slate-400">
                                  No claims filed for this patient record yet.
                                </td>
                              </tr>
                            ) : (
                              clientClaims.map((cl) => (
                                <tr
                                  key={cl.id}
                                  onClick={() => setSelectedRcmClaim(cl)}
                                  className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                                >
                                  <td className="px-5 py-3 font-mono font-bold text-blue-600">{cl.id}</td>
                                  <td className="px-5 py-3 font-mono text-slate-600">{cl.serviceDate}</td>
                                  <td className="px-5 py-3 text-slate-900 font-medium">{cl.payerName}</td>
                                  <td className="px-5 py-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                                    ${cl.billedAmount.toFixed(2)}
                                  </td>
                                  <td className="px-5 py-3 text-right font-mono font-bold text-emerald-700 tabular-nums">
                                    {cl.paidAmount !== undefined ? `$${cl.paidAmount.toFixed(2)}` : "$0.00"}
                                  </td>
                                  <td className="px-5 py-3 text-right font-mono font-bold text-blue-700 tabular-nums">
                                    {cl.patientResponsibility !== undefined
                                      ? `$${cl.patientResponsibility.toFixed(2)}`
                                      : "-"}
                                  </td>
                                  <td className="px-5 py-3 text-center">
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-mono ${
                                        cl.status === "paid"
                                          ? "bg-emerald-100 text-emerald-800"
                                          : cl.status === "denied"
                                          ? "bg-rose-100 text-rose-800"
                                          : cl.status === "rejected"
                                          ? "bg-red-100 text-red-900"
                                          : "bg-slate-100 text-slate-700"
                                      }`}
                                    >
                                      {cl.status.replace("_", " ")}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3 text-right relative" onClick={(e) => e.stopPropagation()}>
                                    <div className="relative inline-block text-left">
                                      <button
                                        type="button"
                                        onClick={() => setOpenMenuClaimId(openMenuClaimId === cl.id ? null : cl.id)}
                                        className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-500 hover:text-slate-800 cursor-pointer"
                                        title="Actions"
                                      >
                                        <MoreVertical className="w-4 h-4" />
                                      </button>
                                      {openMenuClaimId === cl.id && (
                                        <>
                                          <div
                                            className="fixed inset-0 z-20"
                                            onClick={() => setOpenMenuClaimId(null)}
                                          />
                                          <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-30 text-left">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setOpenMenuClaimId(null);
                                                setSelectedRcmClaim(cl);
                                              }}
                                              className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                                            >
                                              <Eye className="w-3.5 h-3.5 text-slate-400" />
                                              View Detail
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setOpenMenuClaimId(null);
                                                navigator.clipboard?.writeText(cl.id);
                                                toast.success(`Copied Claim ID ${cl.id}`);
                                              }}
                                              className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                                            >
                                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                                              Copy Claim ID
                                            </button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            );
          })()}

          {/* ── Documents Tab ── */}
          {activeProfileTab === "documents" && (
            <DocumentsTab client={client} />
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

                {/* ─── Transcripts Table with Dark Gradient Thead ─────────────────────── */}
                <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden relative">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px]">
                      <thead className="bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white">
                        <tr>
                          {/* Checkbox Column */}
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

                          {/* Hamburger Menu Column Header */}
                          <th className="px-2 py-2.5 text-center w-8">
                            <SettingsIcon className="w-4 h-4 text-[#E5E7EB] mx-auto opacity-70" />
                          </th>

                          {/* NAME */}
                          <th
                            className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                            style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}
                          >
                            <div className="flex items-center gap-2">
                              <GripVertical className="w-4 h-4 opacity-50" />
                              NAME
                            </div>
                          </th>

                          {/* SESSION */}
                          <th
                            className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                            style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}
                          >
                            <div className="flex items-center gap-2">
                              <GripVertical className="w-4 h-4 opacity-50" />
                              SESSION
                            </div>
                          </th>

                          {/* DURATION */}
                          <th
                            className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                            style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}
                          >
                            <div className="flex items-center gap-2">
                              <GripVertical className="w-4 h-4 opacity-50" />
                              DURATION
                            </div>
                          </th>

                          {/* RESPONSIBLE */}
                          <th
                            className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                            style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}
                          >
                            <div className="flex items-center gap-2">
                              <GripVertical className="w-4 h-4 opacity-50" />
                              RESPONSIBLE
                            </div>
                          </th>

                          {/* CREATED AT */}
                          <th
                            className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                            style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}
                          >
                            <div className="flex items-center gap-2">
                              <GripVertical className="w-4 h-4 opacity-50" />
                              CREATED AT
                            </div>
                          </th>

                          {/* STATUS */}
                          <th
                            className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                            style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}
                          >
                            <div className="flex items-center gap-2">
                              <GripVertical className="w-4 h-4 opacity-50" />
                              STATUS
                            </div>
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-border">
                        {filteredTranscripts.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-12 text-center text-muted-foreground">
                              <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                              <div className="font-bold text-sm text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
                                {transcriptSearchQuery ? "No Matching Transcripts" : `No Transcripts for ${client?.name || "this client"}`}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                                Click the <strong className="text-[#1A73E8]">Add Scribe</strong> button above to record your first consultation.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          filteredTranscripts.map((s) => (
                            <tr
                              key={s.id}
                              className={`transition-colors cursor-pointer ${
                                transcriptSelectedRows.has(s.id) ? "bg-[#E8F0FE]" : "hover:bg-[#F1F5F9]"
                              }`}
                              onClick={() => {
                                setSelectedTranscriptSession(s);
                                setIsTranscriptDrawerOpen(true);
                              }}
                            >
                              {/* Checkbox */}
                              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={transcriptSelectedRows.has(s.id)}
                                  onChange={() => handleSelectRow(s.id)}
                                  className="w-3.5 h-3.5 cursor-pointer rounded border-[1.5px] border-[#E5E7EB] checked:bg-[#4F8EF7] checked:border-[#4F8EF7]"
                                />
                              </td>

                              {/* Hamburger / Kebab Menu with Dropdown in front of name */}
                              <td className="px-2 py-3 relative transcript-kebab-container" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => setTranscriptOpenMenuId(transcriptOpenMenuId === s.id ? null : s.id)}
                                  className="p-1 hover:bg-muted rounded transition-colors flex items-center justify-center"
                                  style={{ width: "24px", height: "24px" }}
                                >
                                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                                </button>

                                {transcriptOpenMenuId === s.id && (
                                  <div
                                    className="absolute left-8 top-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-50 border border-border py-1"
                                    style={{
                                      boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                                      minWidth: "180px",
                                    }}
                                  >
                                    <button
                                      onClick={() => {
                                        setTranscriptOpenMenuId(null);
                                        setSelectedTranscriptSession(s);
                                        setIsTranscriptDrawerOpen(true);
                                      }}
                                      className="w-full px-3 py-2 text-left text-xs hover:bg-blue-50 flex items-center gap-2.5 text-foreground transition-colors"
                                      style={{ fontFamily: "Outfit, sans-serif" }}
                                    >
                                      <Eye className="w-3.5 h-3.5 text-[#1A73E8]" /> View Transcript
                                    </button>

                                    <button
                                      onClick={() => {
                                        setTranscriptOpenMenuId(null);
                                        issuePrescriptionDocument(s);
                                        toast.success(`Prescription downloaded for ${client?.name || s.clientName}!`);
                                      }}
                                      className="w-full px-3 py-2 text-left text-xs hover:bg-blue-50 flex items-center gap-2.5 text-foreground transition-colors"
                                      style={{ fontFamily: "Outfit, sans-serif" }}
                                    >
                                      <Download className="w-3.5 h-3.5 text-[#1A73E8]" /> Download PDF
                                    </button>

                                    <button
                                      onClick={() => {
                                        setTranscriptOpenMenuId(null);
                                        setTranscriptWhatsAppTarget(s);
                                        setShowTranscriptWhatsAppModal(true);
                                      }}
                                      className="w-full px-3 py-2 text-left text-xs hover:bg-emerald-50 flex items-center gap-2.5 text-emerald-700 transition-colors"
                                      style={{ fontFamily: "Outfit, sans-serif" }}
                                    >
                                      <Share2 className="w-3.5 h-3.5 text-emerald-600" /> Share via WhatsApp
                                    </button>

                                    <div className="border-t border-border my-1" />

                                    <button
                                      onClick={(e) => handleDeleteTranscript(s.id, e)}
                                      className="w-full px-3 py-2 text-left text-xs hover:bg-red-50 flex items-center gap-2.5 text-red-600 transition-colors"
                                      style={{ fontFamily: "Outfit, sans-serif" }}
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-red-500" /> Delete Record
                                    </button>
                                  </div>
                                )}
                              </td>

                              {/* NAME (Clean - shows current client's name) */}
                              <td className="px-4 py-3">
                                <span
                                  className="font-medium text-sm text-[#1A73E8] hover:underline cursor-pointer"
                                  style={{ fontFamily: "Outfit, sans-serif" }}
                                >
                                  {client?.name || s.clientName}
                                </span>
                              </td>

                              {/* SESSION (Only date of the selected session) */}
                              <td className="px-4 py-3 text-xs text-foreground font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
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
                              </td>

                              {/* DURATION (Clean without subtext) */}
                              <td className="px-4 py-3 font-mono text-xs text-foreground">
                                {formatTranscriptTime(s.durationSeconds)}
                              </td>

                              {/* RESPONSIBLE (Doctor / Staff) */}
                              <td className="px-4 py-3 text-xs text-foreground font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
                                {s.doctorName || "Dr. Priya Sharma"}
                              </td>

                              {/* CREATED AT (Clean without subtext) */}
                              <td className="px-4 py-3 text-xs text-muted-foreground">
                                <span style={{ fontFamily: "Outfit, sans-serif" }}>
                                  {new Date(s.createdAt).toLocaleDateString("en-IN", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </span>
                              </td>

                              {/* STATUS (Completed / Upcoming / In Progress) */}
                              <td className="px-4 py-3">
                                {getTranscriptStatusBadge(s.status)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Footer */}
                  <div className="px-4 py-3 border-t border-border bg-slate-50/60 flex items-center justify-between text-xs text-muted-foreground">
                    <span style={{ fontFamily: "Outfit, sans-serif" }}>
                      Showing <strong>{filteredTranscripts.length}</strong> transcripts • Click any row or the menu icon to inspect
                    </span>
                    <span className="font-mono text-[11px]">Deepgram Nova-2 Medical STT</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── Products & Services Tab ── */}
          {activeProfileTab === "products" && (() => {
            const assignedIds = new Set(clientProductList.map((p) => p.id));
            const unassignedServices = globalServiceList.filter(
              (s) => !assignedIds.has(s.id) &&
                (s.name.toLowerCase().includes(assignSearch.toLowerCase()) ||
                  s.description.toLowerCase().includes(assignSearch.toLowerCase()))
            );
            const filteredClientProducts = clientProductList.filter(
              (p) =>
                p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
                p.description.toLowerCase().includes(productSearchQuery.toLowerCase())
            );
            const filteredEmpsProduct = SVC_EMPLOYEES.filter((e) =>
              e.name.toLowerCase().includes(empSearchProduct.toLowerCase())
            );
            const toggleEmpProduct = (id: number) =>
              setNewProductForm((f) => ({
                ...f,
                assignedEmployeeIds: f.assignedEmployeeIds.includes(id)
                  ? f.assignedEmployeeIds.filter((e) => e !== id)
                  : [...f.assignedEmployeeIds, id],
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
                                    toast.success(`"${svc.name}" assigned to ${client.name}`);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors text-left cursor-pointer"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                                    <Briefcase className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 truncate" style={{ fontFamily: "DM Sans, sans-serif" }}>{svc.name}</p>
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
                {filteredClientProducts.length > 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead style={{ backgroundColor: "#1F2937" }}>
                          <tr>
                            <th className="py-3 px-5 text-xs font-semibold text-white uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>Product / Service</th>
                            <th className="py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>Duration</th>
                            <th className="py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>Price</th>
                            <th className="py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>Status</th>
                            <th className="py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider text-right" style={{ fontFamily: "Outfit, sans-serif" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredClientProducts.map((product) => (
                            <tr key={product.id} className="hover:bg-gray-50/80 transition-colors">
                              <td className="py-3.5 px-5 min-w-[220px]">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                                    <Briefcase className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-gray-900 truncate" style={{ fontFamily: "DM Sans, sans-serif" }}>{product.name}</p>
                                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>{product.description || "No description"}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg">
                                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                                  <span className="text-xs font-semibold text-gray-700" style={{ fontFamily: "DM Sans, sans-serif" }}>{product.duration} min</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg">
                                  <span className="text-xs font-bold text-gray-600">{getCurrencySymbol(product.currency)}</span>
                                  <span className="text-xs font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>{product.price}</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${product.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-600 border border-gray-200"}`} style={{ fontFamily: "Outfit, sans-serif" }}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${product.isActive ? "bg-emerald-500" : "bg-gray-400"}`} />
                                  {product.isActive ? "Active" : "Inactive"}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap text-right">
                                <button
                                  onClick={() => {
                                    if (!client) return;
                                    unassignProductFromClient(client.id, product.id);
                                    setClientProductList(getClientProducts(client.id));
                                    toast.success(`"${product.name}" removed from ${client.name}`);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer font-medium"
                                  style={{ fontFamily: "Outfit, sans-serif" }}
                                  title="Remove assignment"
                                >
                                  <X className="w-3.5 h-3.5" /> Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Briefcase className="w-7 h-7 text-gray-400" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-700 mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      {productSearchQuery ? "No matching products" : "No products assigned"}
                    </h3>
                    <p className="text-xs text-gray-500 mb-4" style={{ fontFamily: "Outfit, sans-serif" }}>
                      {productSearchQuery ? "Try a different keyword" : "Assign a product or create a new one for this client"}
                    </p>
                    {!productSearchQuery && (
                      <button
                        onClick={() => { setNewProductForm({ ...SVC_INIT_FORM }); setShowNewProductDrawer(true); }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#1F2937] hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        <Plus className="w-4 h-4" /> Create New Product
                      </button>
                    )}
                  </div>
                )}

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
                            duration: newProductForm.duration,
                            price: newProductForm.price,
                            currency: newProductForm.currency,
                            isActive: newProductForm.isActive,
                            assignedEmployees: newProductForm.assignedEmployeeIds,
                          });
                          assignProductToClient(client.id, created.id);
                          setGlobalServiceList(getStoredServices());
                          setClientProductList(getClientProducts(client.id));
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



          {/* Schedule Appointment from Activity tab */}
          {showScheduleApptFromActivity && (
            <ScheduleAppointmentDrawer
              isOpen={showScheduleApptFromActivity}
              onClose={() => setShowScheduleApptFromActivity(false)}
              mode="create"
              values={activityBookingValues}
              onChange={(patch) => setActivityBookingValues((prev) => ({ ...prev, ...patch }))}
              onSave={handleActivityBookingComplete}
              onBookingSuccess={(booked) => {
                setShowScheduleApptFromActivity(false);
                setSelectedAppointmentForDetail(booked);
                setIsAppointmentDetailDrawerOpen(true);
              }}
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

          {/* Appointment Detail Drawer */}
          {selectedAppointmentForDetail && (
            <AppointmentDetailDrawer
              isOpen={isAppointmentDetailDrawerOpen}
              onClose={() => setIsAppointmentDetailDrawerOpen(false)}
              appointment={selectedAppointmentForDetail}
              onReschedule={(appt) => {
                setIsAppointmentDetailDrawerOpen(false);
                setActivityBookingValues((prev) => ({
                  ...prev,
                  title: appt.title || prev.title,
                  date: appt.date || prev.date,
                }));
                setShowScheduleApptFromActivity(true);
              }}
              onMarkComplete={(apptId) => {
                handleUpdateApptStatus(apptId, "completed");
                setSelectedAppointmentForDetail((prev) => (prev ? { ...prev, status: "completed" } : null));
              }}
              onOpenInvoice={(invId) => {
                const inv = getInvoicesByClient(client.id).find((i) => i.id === invId);
                if (inv) {
                  setSelectedInvoiceForDrawer(inv);
                  setIsInvoiceDrawerOpen(true);
                }
              }}
              onOpenChartNote={(appt) => {
                const pName = ALL_EMPLOYEES_MAP[String(appt.employeeId)] || appt.providerName || "Dr. Priya Sharma";
                handleOpenApptTranscript(appt, pName);
              }}
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
        </div>
      </div>

      <ClaimDetailDrawer
        claim={selectedRcmClaim}
        isOpen={!!selectedRcmClaim}
        onClose={() => setSelectedRcmClaim(null)}
      />
    </>
  );
}
