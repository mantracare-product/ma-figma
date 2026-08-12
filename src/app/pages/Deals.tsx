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
import { useFieldRegistry, resolveVisibility } from "../context/FieldRegistryContext";
import { SelectFieldsModal, CreateFieldModal } from "../components/help/FieldManager";
import ProcessDetailDrawer, { ActivityLogEntry } from "../components/deals/ProcessDetailDrawer";
import CallDetailDrawer from "../components/telephony/CallDetailDrawer";
import { getActivityForProcess } from "../../lib/activityLog";
import { getStoredCallLogs, PROCESS_LOGS_STORE_EVENT } from "../../lib/processLogsStore";

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
};

const getClientIdByName = (name: string): string => {
  const found = Object.values(mockClients).find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  );
  return found ? found.id : "CL-001";
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

type MetricTone = "success" | "warning" | "neutral";

const metricToneStyles: Record<MetricTone, { bg: string; text: string }> = {
  success: { bg: "bg-emerald-50", text: "text-emerald-800" },
  warning: { bg: "bg-amber-50", text: "text-amber-800" },
  neutral: { bg: "bg-slate-50", text: "text-slate-900" },
};

function MetricTile({
  label,
  value,
  phrase,
  tone = "neutral",
  tooltip,
  leverPosition,
}: {
  label: string;
  value: string;
  phrase: string;
  tone?: MetricTone;
  tooltip: string;
  leverPosition?: number;
}) {
  const { bg, text } = metricToneStyles[tone];
  const mutedLabel = tone === "neutral" ? "text-slate-500" : text;
  const mutedPhrase = tone === "neutral" ? "text-slate-600" : `${text} opacity-85`;

  return (
    <div className={`min-w-0 rounded-xl p-3.5 ${bg}`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <p
          className={`text-[11px] leading-snug ${mutedLabel}`}
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {label}
        </p>
        <Tooltip text={tooltip}>
          <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 flex-shrink-0 cursor-help mt-0.5" />
        </Tooltip>
      </div>
      <p
        className="text-xl font-bold truncate"
        style={{ fontFamily: "DM Sans, sans-serif" }}
        title={value}
      >
        <span className={text}>{value}</span>
      </p>
      <p
        className={`text-[11px] leading-snug mt-1 break-words ${
          leverPosition !== undefined ? "mb-1.5" : ""
        } ${mutedPhrase}`}
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        {phrase}
      </p>
      {leverPosition !== undefined && (
        <div className="h-1 bg-black/10 rounded-full relative">
          <div
            className={`absolute top-1/2 w-2 h-2 rounded-full ${
              tone === "success"
                ? "bg-emerald-600"
                : tone === "warning"
                ? "bg-amber-600"
                : "bg-primary"
            }`}
            style={{ left: `${leverPosition}%`, transform: "translate(-50%, -50%)" }}
          />
        </div>
      )}
    </div>
  );
}

function MetricGroup({
  label,
  columns = 2,
  defaultOpen = true,
  children,
}: {
  label: string;
  columns?: 2 | 3;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between mb-2 group"
        aria-expanded={open}
      >
        <p
          className="text-[12px] text-slate-400 group-hover:text-slate-600 transition-colors"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {label}
        </p>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div
          className={`grid gap-2.5 ${
            columns === 3 ? "grid-cols-3" : "grid-cols-2"
          }`}
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export default function Deals() {
  const location = useLocation();
  const navigate = useNavigate();
  const entityType = "deals";
  const entityLabel = "deals";
  // Ensure all call logs have process field
  const [callLogs, setCallLogs] = useState<CallLog[]>(() => {
    return getStoredCallLogs().map(log => ({
      ...log,
      process: log.process || getProcessFromStage(log.currentStage)
    }));
  });

  useEffect(() => {
    const handler = () => {
      try {
        const stored = getStoredCallLogs();
        setCallLogs(stored.map(log => ({
          ...log,
          process: log.process || getProcessFromStage(log.currentStage)
        })));
      } catch {}
    };
    window.addEventListener(PROCESS_LOGS_STORE_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(PROCESS_LOGS_STORE_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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


  const getMergedDealFields = () => {
    const defaultDealWebhookFields = [
      { key: "dealName", label: "Deal Name", source: "system", inputType: "text" },
      { key: "clientName", label: "Client Name", source: "system", inputType: "text" },
      { key: "amount", label: "Amount", source: "system", inputType: "number" },
      { key: "currency", label: "Currency", source: "system", inputType: "text" },
      { key: "status", label: "Status", source: "system", inputType: "select" },
      { key: "responsible", label: "Responsible Person", source: "system", inputType: "select" },
      { key: "stage", label: "Stage", source: "system", inputType: "text" },
    ];
    const registryFields = getAllFields("deal");
    const mergedDealFields = [...defaultDealWebhookFields];
    registryFields.forEach(regField => {
      if (!mergedDealFields.some(f => f.key === regField.key)) {
        mergedDealFields.push({
          key: regField.key,
          label: regField.label,
          source: regField.source || "custom",
          inputType: regField.inputType || "text",
        });
      }
    });
    return mergedDealFields;
  };

  const fieldSampleValues: Record<string, any> = {
    dealName: "Patient Intake Package",
    clientName: "Sarah Johnson",
    amount: 25000,
    currency: "₹",
    status: "In Progress",
    responsible: "John Smith",
    stage: "Patient Intake: Initial Contact"
  };

  const getWebhookManualUrl = (apiKeyVal: string, selectedKeys: string[]) => {
    const apiKeyPart = apiKeyVal || "{YOUR_API_KEY}";
    const baseUrl = `https://app.mantraassist.com/api/webhooks/import/${entityType}?api_key=${apiKeyPart}`;
    const params = selectedKeys.map(key => {
      let val = `{${key.toUpperCase()}}`;
      if (key === "dealName") val = "{DEAL_NAME}";
      if (key === "clientName") val = "{CLIENT_NAME}";
      if (key === "amount") val = "{AMOUNT}";
      if (key === "currency") val = "{CURRENCY}";
      if (key === "status") val = "{STATUS}";
      if (key === "responsible") val = "{RESPONSIBLE_PERSON}";
      if (key === "stage") val = "{STAGE_NAME}";
      return `&${key}=${val}`;
    }).join("");
    return baseUrl + params;
  };




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
  const [viewDrawerTab, setViewDrawerTab] = useState<"general" | "activity" | "history" | "documents">("general");
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
        if (savedKeySet.has(f.key) || defaultKeys.includes(f.key)) return;
        const vis = resolveVisibility(f);
        if (vis === "all") { autoKeys.push(f.key); return; }
        if (vis === "specific" && f.visibleToRecordIds?.includes((selectedLogForView as any).id)) {
          autoKeys.push(f.key); return;
        }
        const val = (selectedLogForView as any)[f.key];
        if (val !== undefined && val !== null && val !== "") autoKeys.push(f.key);
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
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/clients/${log.clientId || getClientIdByName(log.client)}`);
                            }}
                            className="text-left cursor-pointer hover:underline hover:text-blue-700 transition-colors font-semibold"
                            style={{ color: '#1A73E8' }}
                            title="Click to view Client Profile"
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/clients/${getClientIdByName(deal.clientName)}`);
                                  }}
                                  className="font-bold leading-tight flex-1 pr-1 text-left cursor-pointer hover:underline hover:text-blue-700 transition-colors"
                                  style={{ fontSize: '13px', color: '#1A73E8', fontFamily: 'Outfit, sans-serif', padding: 0 }}
                                  title="Click to view Client Profile"
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
      <CallDetailDrawer
        isOpen={showCallDetailsDrawer}
        onClose={() => {
          setShowCallDetailsDrawer(false);
          setSelectedCallForDetails(null);
        }}
        call={selectedCallForDetails}
        callLogs={callLogs}
        onSelectCallId={(targetId) => {
          const foundCall = callLogs.find((l) => l.id === targetId);
          if (foundCall) {
            setSelectedCallForDetails(foundCall);
          }
        }}
      />

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

      {/* Import Deals Drawer */}
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
                <h2 className="text-base font-bold text-gray-900">Import Process</h2>
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
              <div className="flex gap-2 mb-5 bg-muted/30 p-1 rounded-lg w-fit">
                {(["csv", "webhook"] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setImportMethod(method)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${importMethod === method ? "bg-primary text-white" : "text-gray-600 hover:text-gray-900"
                      }`}
                  >
                    {method === "csv" ? "CSV" : "Webhook"}
                  </button>
                ))}
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
                      const mergedDealFields = getMergedDealFields();
                      const filtered = mergedDealFields.filter(f =>
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

                      const renderFieldRow = (f: typeof mergedDealFields[0]) => {
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

            {/* Fixed Footer */}
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

      {/* Process Detail Drawer */}
      <ProcessDetailDrawer
        isOpen={showViewDrawer && selectedLogForView !== null}
        onClose={() => setShowViewDrawer(false)}
        log={selectedLogForView}
        client={selectedLogForView ? (mockClients[selectedLogForView.clientId] || (() => {
          try {
            const raw = sessionStorage.getItem("clients");
            const clients = raw ? JSON.parse(raw) : [];
            return clients.find((c: any) => c.id === selectedLogForView.clientId || c.name === selectedLogForView.client);
          } catch { return undefined; }
        })()) : undefined}
        activeTab={viewDrawerTab}
        onTabChange={(tab) => setViewDrawerTab(tab)}
        activity={(() => {
          if (!selectedLogForView) return [];
          const clientObj = mockClients[selectedLogForView.clientId] || (() => {
            try {
              const raw = sessionStorage.getItem("clients");
              const clients = raw ? JSON.parse(raw) : [];
              return clients.find((c: any) => c.id === selectedLogForView.clientId || c.name === selectedLogForView.client);
            } catch { return undefined; }
          })();
          const realEntries = getActivityForProcess(selectedLogForView.clientId, selectedLogForView.process)
            .map((r) => ({
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
          // Fallback mock entries for demo clients that have no real activity yet
          return [
            {
              id: `act-entry-${selectedLogForView.id}`,
              type: "process_entry",
              timestamp: "2024-04-08 09:00",
              status: "success",
              sourceStepName: "Process Intake",
              refId: selectedLogForView.id,
              details: {
                primary: `Enrolled in "${selectedLogForView.process}"`,
                secondary: "Initial Stage: New",
              },
            },
            {
              id: `act-wa-${selectedLogForView.id}`,
              type: "whatsapp",
              timestamp: "2024-04-09 10:00",
              status: "success",
              sourceStepName: "Onboarding Flow",
              refId: `chat-${selectedLogForView.clientId}`,
              details: {
                primary: "Template: appointment_reminder",
                secondary: clientObj?.phone ? `Sent to ${clientObj.phone}` : undefined,
              },
            },
            {
              id: `act-call-${selectedLogForView.id}`,
              type: "call",
              direction: selectedLogForView.type?.toLowerCase().includes("inbound") ? "inbound" : "outbound",
              timestamp: "2024-04-10 11:30",
              status: selectedLogForView.status === "Completed" ? "success" : selectedLogForView.status === "Failed" ? "failed" : "pending",
              sourceStepName: selectedLogForView.relationshipReason || "Outbound Call Step",
              refId: selectedLogForView.id,
              details: {
                primary: selectedLogForView.duration ? `Duration ${selectedLogForView.duration}` : "Call scheduled",
                secondary: `Status: ${selectedLogForView.status}`,
              },
            },
            {
              id: `act-stage-1-${selectedLogForView.id}`,
              type: "stage_update",
              timestamp: "2024-04-11 14:00",
              status: "success",
              sourceStepName: "Pipeline Automation",
              refId: selectedLogForView.id,
              details: {
                primary: `Moved to ${selectedLogForView.currentStage}`,
                secondary: `Process: ${selectedLogForView.process}`,
              },
            },
            {
              id: `act-email-${selectedLogForView.id}`,
              type: "email",
              timestamp: "2024-04-12 09:30",
              status: "success",
              sourceStepName: "Welcome Email Campaign",
              refId: `msg-${selectedLogForView.id}`,
              details: {
                primary: "Template: welcome_onboarding",
                secondary: clientObj?.email ? `Sent to ${clientObj.email}` : "Sent to client email",
              },
            },
            {
              id: `act-apt-${selectedLogForView.id}`,
              type: "appointment_booked",
              timestamp: "2024-04-12 15:00",
              status: "success",
              sourceStepName: "Schedule Appointment Step",
              refId: `apt-${selectedLogForView.id}`,
              details: {
                primary: "Slot: 10:00 AM – 10:30 AM",
                secondary: "Location: Main Clinic",
              },
            },
            {
              id: `act-completed-${selectedLogForView.id}`,
              type: "process_completed",
              timestamp: selectedLogForView.date,
              status: "success",
              sourceStepName: "Deal Closed",
              refId: selectedLogForView.id,
              details: {
                primary: `Final Stage: ${selectedLogForView.currentStage}`,
                secondary: `Process: ${selectedLogForView.process}`,
              },
            },
          ];
        })()}
        onOpenActivity={(entry) => {
          switch (entry.type) {
            case "call": {
              const call = callLogs.find((l) => l.id === entry.refId) || selectedLogForView;
              if (call) {
                setSelectedCallForDetails(call);
                setActiveDrawerTab("summary");
                setShowCallDetailsDrawer(true);
              }
              break;
            }
            case "whatsapp":
              navigate("/chats", {
                state: {
                  clientId: selectedLogForView?.clientId,
                  channel: "whatsapp",
                  threadId: entry.refId,
                },
              });
              break;
            case "sms":
              navigate("/chats", {
                state: {
                  clientId: selectedLogForView?.clientId,
                  channel: "sms",
                  threadId: entry.refId,
                },
              });
              break;
            case "email":
              navigate("/chats", {
                state: {
                  clientId: selectedLogForView?.clientId,
                  channel: "email",
                  emailId: entry.refId,
                },
              });
              break;
            case "process_entry":
            case "stage_update":
            case "process_completed":
            case "field_update":
              setViewDrawerTab("history");
              break;
            case "webhook_trigger":
              toast.info(`Webhook fired: ${entry.sourceStepName ?? "automation"}`);
              break;
            case "appointment_booked":
              navigate("/appointments", {
                state: {
                  clientId: selectedLogForView?.clientId,
                  appointmentId: entry.refId,
                },
              });
              break;
          }
        }}
        stageIdx={drawerStageIdx}
        onStageChange={(idx) => {
          if (!selectedLogForView) return;
          setDrawerStageIdx(idx);
          const newStage = getDealStageFromIndex(idx);
          const label = dealStageLabels[idx - 1] || dealStageLabels[0];
          toast.success(`Stage updated to ${label} ✓`);
          setCallLogs((prev) =>
            prev.map((l) => (l.id === selectedLogForView.id ? { ...l, currentStage: newStage } : l))
          );
          setDeals((allDeals) =>
            allDeals.map((d) => (d.clientName === selectedLogForView.client ? { ...d, stage: newStage } : d))
          );
        }}
        visibleFieldKeys={drawerVisibleFields}
        onVisibleFieldKeysChange={(keys) => {
          setDrawerVisibleFields(keys);
          if (selectedLogForView) {
            setCallLogs((prevLogs) =>
              prevLogs.map((l) => {
                if (l.id === selectedLogForView.id) {
                  return {
                    ...l,
                    visibleFieldKeys: keys,
                  };
                }
                return l;
              })
            );
          }
        }}
        editedValues={editedValues}
        editingField={editingField}
        onStartEditingField={(key) => setEditingField(key)}
        onFieldSave={(key, val) => {
          setEditingField(null);
          setEditedValues((prev) => ({ ...prev, [key]: val }));
          if (selectedLogForView) {
            setCallLogs((prevLogs) =>
              prevLogs.map((l) => {
                if (l.id === selectedLogForView.id) {
                  return {
                    ...l,
                    [key]: val,
                    visibleFieldKeys: drawerVisibleFields,
                  };
                }
                return l;
              })
            );
          }
          toast.success("Saved ✓", { duration: 2000 });
        }}
        showResponsibleDropdown={showResponsibleDropdownInDrawer}
        onToggleResponsibleDropdown={(open) => setShowResponsibleDropdownInDrawer(open)}
        onOpenTeamMember={(personName) => {
          const member = teamMembersData.find((m) => m.name === personName);
          setSelectedTeamMember(
            member || { name: personName, role: "Team Member", email: "", phone: "" }
          );
          setShowTeamMemberDrawer(true);
        }}
        isTeamMemberDrawerOpen={showTeamMemberDrawer}
        fieldManagerOpen={fieldManagerOpen}
        fieldManagerMode={fieldManagerMode}
        onOpenFieldManager={(mode) => {
          setFieldManagerMode(mode);
          setFieldManagerOpen(true);
        }}
        onCloseFieldManager={() => setFieldManagerOpen(false)}
        teamMembersData={teamMembersData}
        dealFields={getAllFields("deal")}
        historyFilters={{
          showPopup: showHistoryFilterPopup,
          quickFilter: historyQuickFilter,
          eventTypeFilter: historyEventTypeFilter,
          createdByFilter: historyCreatedByFilter,
          dateFilter: historyDateFilter,
          filtersActive: historyFiltersActive,
          showAddFieldPopup,
          activeFilterFields,
          selectedAddFields,
        }}
        onHistoryFiltersChange={(patch) => {
          if (patch.showPopup !== undefined) setShowHistoryFilterPopup(patch.showPopup);
          if (patch.quickFilter !== undefined) setHistoryQuickFilter(patch.quickFilter);
          if (patch.eventTypeFilter !== undefined) setHistoryEventTypeFilter(patch.eventTypeFilter);
          if (patch.createdByFilter !== undefined) setHistoryCreatedByFilter(patch.createdByFilter);
          if (patch.dateFilter !== undefined) setHistoryDateFilter(patch.dateFilter);
          if (patch.filtersActive !== undefined) setHistoryFiltersActive(patch.filtersActive);
          if (patch.showAddFieldPopup !== undefined) setShowAddFieldPopup(patch.showAddFieldPopup);
          if (patch.activeFilterFields !== undefined) setActiveFilterFields(patch.activeFilterFields);
          if (patch.selectedAddFields !== undefined) setSelectedAddFields(patch.selectedAddFields);
        }}
      />

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
