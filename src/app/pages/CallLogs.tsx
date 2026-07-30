import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router";
import { Search, Filter, Download, Phone, FileText, Play, Calendar, StopCircle, Settings as SettingsIcon, Eye, ChevronLeft, ChevronRight, ChevronDown, ChevronsLeft, ChevronsRight, AlertCircle, X, Pause, TrendingUp, Clock, GitBranch, RefreshCw, Zap, Star, Headphones, User, CheckCircle2, Volume2, Users, Target, Award, Brain, Shield, MessageSquare, Sparkles, ThumbsUp, ThumbsDown, Info, MoreVertical, Trash2, CalendarClock } from "lucide-react";
import { PiArrowSquareOutBold, PiArrowSquareInBold, PiPhoneIncoming, PiPhoneOutgoing } from "react-icons/pi";
import { Button } from "../components/ui/Button";
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

interface CallLog {
  id: string;
  client: string;
  clientId: string;
  type: string;
  status: string;
  process: string;
  lastStage: string;
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
const initialCallLogs: (Omit<CallLog, "process"> & { process?: string })[] = [
  // Latest calls first (Apr 13-14)
  { id: "CALL-001", client: "Sarah Johnson", clientId: "CL-001", type: "Outbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Insurance Verification", duration: "4:32", date: "2024-04-13 14:30", hasRecording: true, hasTranscript: true, hasScheduledCall: true },
  { id: "CALL-002", client: "Priya Sharma", clientId: "CL-013", type: "Outbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Follow-up", duration: "3:45", date: "2024-04-13 13:15", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-003", client: "Ahmed Al-Mansoori", clientId: "CL-023", type: "Inbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Document Check", duration: "5:20", date: "2024-04-13 11:40", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-004", client: "Jennifer White", clientId: "CL-011", type: "Outbound", status: "Completed", lastStage: "N/A", currentStage: "Initial Contact", duration: "2:15", date: "2024-04-13 10:00", hasRecording: true, hasTranscript: true, hasScheduledCall: true },
  { id: "CALL-005", client: "Arjun Desai", clientId: "CL-018", type: "Outbound", status: "Pending", lastStage: "Follow-up", currentStage: "Billing Inquiry", duration: "", date: "2024-04-13 09:30", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-006", client: "Charlotte Evans", clientId: "CL-029", type: "Outbound", status: "Completed", lastStage: "Document Check", currentStage: "Approval", duration: "6:10", date: "2024-04-13 08:15", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-007", client: "David Martinez", clientId: "CL-006", type: "Inbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Follow-up", duration: "3:55", date: "2024-04-12 16:45", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-008", client: "Deepika Nair", clientId: "CL-021", type: "Outbound", status: "Completed", lastStage: "Slot Selection", currentStage: "Confirmation", duration: "2:30", date: "2024-04-12 15:20", hasRecording: true, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-009", client: "Youssef Said", clientId: "CL-027", type: "Outbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Follow-up", duration: "4:48", date: "2024-04-12 14:10", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-010", client: "Michael Chen", clientId: "CL-002", type: "Outbound", status: "Failed", lastStage: "N/A", currentStage: "Initial Contact", duration: "0:00", date: "2024-04-12 13:00", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-011", client: "Priya Sharma", clientId: "CL-013", type: "Outbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Insurance Verification", duration: "5:15", date: "2024-04-12 11:30", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-012", client: "Lisa Anderson", clientId: "CL-007", type: "Inbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Payment Reminder", duration: "3:20", date: "2024-04-12 10:15", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-013", client: "Emily Davis", clientId: "CL-003", type: "Outbound", status: "Completed", lastStage: "Follow-up", currentStage: "Billing Inquiry", duration: "4:05", date: "2024-04-11 16:00", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-014", client: "Rahul Patel", clientId: "CL-014", type: "Inbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Follow-up", duration: "2:45", date: "2024-04-11 15:30", hasRecording: true, hasTranscript: false, hasScheduledCall: false },
  { id: "CALL-015", client: "James Taylor", clientId: "CL-008", type: "Outbound", status: "Completed", lastStage: "Insurance Verification", currentStage: "Schedule Appointment", duration: "3:35", date: "2024-04-11 14:20", hasRecording: true, hasTranscript: true, hasScheduledCall: true },
  { id: "CALL-016", client: "Kavya Iyer", clientId: "CL-019", type: "Outbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Document Check", duration: "5:50", date: "2024-04-11 13:00", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-017", client: "Omar Al-Rashid", clientId: "CL-025", type: "Outbound", status: "Pending", lastStage: "Initial Contact", currentStage: "Slot Selection", duration: "", date: "2024-04-11 11:45", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-018", client: "Ananya Reddy", clientId: "CL-015", type: "Outbound", status: "Completed", lastStage: "Payment Reminder", currentStage: "Issue Resolution", duration: "6:25", date: "2024-04-11 10:30", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-019", client: "Fatima Hassan", clientId: "CL-024", type: "Inbound", status: "Completed", lastStage: "Follow-up", currentStage: "Billing Inquiry", duration: "4:18", date: "2024-04-10 16:40", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-020", client: "Amanda Clark", clientId: "CL-009", type: "Outbound", status: "Failed", lastStage: "Slot Selection", currentStage: "Confirmation", duration: "0:00", date: "2024-04-10 15:15", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-021", client: "Sarah Johnson", clientId: "CL-001", type: "Inbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Follow-up", duration: "5:05", date: "2024-04-10 14:00", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-022", client: "Vikram Singh", clientId: "CL-016", type: "Outbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Slot Selection", duration: "2:55", date: "2024-04-10 13:30", hasRecording: true, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-023", client: "Jennifer White", clientId: "CL-011", type: "Outbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Follow-up", duration: "3:40", date: "2024-04-10 12:10", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-024", client: "Robert Wilson", clientId: "CL-004", type: "Outbound", status: "Pending", lastStage: "Initial Contact", currentStage: "Slot Selection", duration: "", date: "2024-04-10 11:00", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-025", client: "Michael Chen", clientId: "CL-002", type: "Outbound", status: "Completed", lastStage: "N/A", currentStage: "Initial Contact", duration: "4:20", date: "2024-04-09 16:30", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-026", client: "Amanda Clark", clientId: "CL-009", type: "Outbound", status: "Completed", lastStage: "Slot Selection", currentStage: "Confirmation", duration: "3:15", date: "2024-04-09 15:00", hasRecording: true, hasTranscript: true, hasScheduledCall: true },
  { id: "CALL-027", client: "Oliver Thompson", clientId: "CL-028", type: "Inbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Follow-up", duration: "5:45", date: "2024-04-09 14:20", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-028", client: "Rohan Kumar", clientId: "CL-020", type: "Outbound", status: "Failed", lastStage: "Insurance Verification", currentStage: "Schedule Appointment", duration: "0:00", date: "2024-04-09 13:10", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-029", client: "Vikram Singh", clientId: "CL-016", type: "Outbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Slot Selection", duration: "2:38", date: "2024-04-09 11:45", hasRecording: true, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-030", client: "Emily Davis", clientId: "CL-003", type: "Outbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Payment Reminder", duration: "4:52", date: "2024-04-09 10:30", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-031", client: "Robert Wilson", clientId: "CL-004", type: "Outbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Slot Selection", duration: "3:25", date: "2024-04-08 16:15", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-032", client: "Rohan Kumar", clientId: "CL-020", type: "Inbound", status: "Completed", lastStage: "Insurance Verification", currentStage: "Schedule Appointment", duration: "5:30", date: "2024-04-08 15:00", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-033", client: "David Martinez", clientId: "CL-006", type: "Outbound", status: "Pending", lastStage: "Initial Contact", currentStage: "Follow-up", duration: "", date: "2024-04-08 14:00", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-034", client: "Priya Sharma", clientId: "CL-013", type: "Outbound", status: "Failed", lastStage: "Initial Contact", currentStage: "Insurance Verification", duration: "0:00", date: "2024-04-08 12:30", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-035", client: "Matthew Lewis", clientId: "CL-012", type: "Outbound", status: "Completed", lastStage: "Document Check", currentStage: "Approval", duration: "4:45", date: "2024-04-08 11:00", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-036", client: "Ahmed Al-Mansoori", clientId: "CL-023", type: "Outbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Insurance Verification", duration: "6:15", date: "2024-04-07 16:45", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-037", client: "Ananya Reddy", clientId: "CL-015", type: "Inbound", status: "Completed", lastStage: "N/A", currentStage: "Initial Contact", duration: "3:50", date: "2024-04-07 15:20", hasRecording: true, hasTranscript: false, hasScheduledCall: false },
  { id: "CALL-038", client: "Arjun Desai", clientId: "CL-018", type: "Outbound", status: "Completed", lastStage: "Payment Reminder", currentStage: "Issue Resolution", duration: "5:25", date: "2024-04-07 14:00", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-039", client: "Jennifer White", clientId: "CL-011", type: "Outbound", status: "Failed", lastStage: "Initial Contact", currentStage: "Payment Reminder", duration: "0:00", date: "2024-04-07 12:45", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-040", client: "Oliver Thompson", clientId: "CL-028", type: "Outbound", status: "Completed", lastStage: "Insurance Verification", currentStage: "Schedule Appointment", duration: "4:10", date: "2024-04-07 11:15", hasRecording: true, hasTranscript: true, hasScheduledCall: true },
  { id: "CALL-041", client: "Matthew Lewis", clientId: "CL-012", type: "Outbound", status: "Completed", lastStage: "Document Check", currentStage: "Approval", duration: "3:35", date: "2024-04-06 16:30", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-042", client: "Fatima Hassan", clientId: "CL-024", type: "Outbound", status: "Pending", lastStage: "Initial Contact", currentStage: "Payment Reminder", duration: "", date: "2024-04-06 15:00", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-043", client: "Youssef Said", clientId: "CL-027", type: "Inbound", status: "Completed", lastStage: "Payment Reminder", currentStage: "Issue Resolution", duration: "5:50", date: "2024-04-06 14:20", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-044", client: "Lisa Anderson", clientId: "CL-007", type: "Outbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Follow-up", duration: "2:40", date: "2024-04-06 13:00", hasRecording: true, hasTranscript: false, hasScheduledCall: false },
  { id: "CALL-045", client: "Deepika Nair", clientId: "CL-021", type: "Outbound", status: "Failed", lastStage: "Initial Contact", currentStage: "Follow-up", duration: "0:00", date: "2024-04-06 11:30", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-046", client: "Kavya Iyer", clientId: "CL-019", type: "Outbound", status: "Completed", lastStage: "N/A", currentStage: "Initial Contact", duration: "4:25", date: "2024-04-05 16:00", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-047", client: "Sarah Johnson", clientId: "CL-001", type: "Outbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Insurance Verification", duration: "5:10", date: "2024-04-05 14:45", hasRecording: true, hasTranscript: true, hasScheduledCall: true },
  { id: "CALL-048", client: "Rahul Patel", clientId: "CL-014", type: "Inbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Follow-up", duration: "3:15", date: "2024-04-05 13:20", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-049", client: "Emily Davis", clientId: "CL-003", type: "Outbound", status: "Completed", lastStage: "Follow-up", currentStage: "Billing Inquiry", duration: "6:05", date: "2024-04-05 12:00", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-050", client: "Michael Chen", clientId: "CL-002", type: "Outbound", status: "Pending", lastStage: "N/A", currentStage: "Initial Contact", duration: "", date: "2024-04-05 10:30", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-051", client: "Priya Sharma", clientId: "CL-013", type: "Outbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Follow-up", duration: "4:35", date: "2024-04-04 16:15", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-052", client: "Amanda Clark", clientId: "CL-009", type: "Outbound", status: "Failed", lastStage: "Initial Contact", currentStage: "Follow-up", duration: "0:00", date: "2024-04-04 15:00", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-053", client: "Vikram Singh", clientId: "CL-016", type: "Inbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Slot Selection", duration: "3:50", date: "2024-04-04 14:00", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-054", client: "James Taylor", clientId: "CL-008", type: "Outbound", status: "Completed", lastStage: "Insurance Verification", currentStage: "Schedule Appointment", duration: "2:45", date: "2024-04-04 12:30", hasRecording: true, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-055", client: "Omar Al-Rashid", clientId: "CL-025", type: "Outbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Slot Selection", duration: "5:20", date: "2024-04-04 11:00", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-056", client: "Charlotte Evans", clientId: "CL-029", type: "Outbound", status: "Completed", lastStage: "Document Check", currentStage: "Approval", duration: "4:50", date: "2024-04-03 16:45", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-057", client: "Arjun Desai", clientId: "CL-018", type: "Outbound", status: "Pending", lastStage: "Follow-up", currentStage: "Billing Inquiry", duration: "", date: "2024-04-03 15:20", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-058", client: "David Martinez", clientId: "CL-006", type: "Inbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Follow-up", duration: "3:25", date: "2024-04-03 14:00", hasRecording: true, hasTranscript: false, hasScheduledCall: false },
  { id: "CALL-059", client: "Ananya Reddy", clientId: "CL-015", type: "Outbound", status: "Completed", lastStage: "Payment Reminder", currentStage: "Issue Resolution", duration: "6:30", date: "2024-04-03 12:40", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-060", client: "Youssef Said", clientId: "CL-027", type: "Outbound", status: "Failed", lastStage: "N/A", currentStage: "Initial Contact", duration: "0:00", date: "2024-04-03 11:15", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-061", client: "Robert Wilson", clientId: "CL-004", type: "Outbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Slot Selection", duration: "5:05", date: "2024-04-02 16:00", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-062", client: "Deepika Nair", clientId: "CL-021", type: "Inbound", status: "Completed", lastStage: "Slot Selection", currentStage: "Confirmation", duration: "2:55", date: "2024-04-02 14:30", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-063", client: "Lisa Anderson", clientId: "CL-007", type: "Outbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Payment Reminder", duration: "4:20", date: "2024-04-02 13:00", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-064", client: "Rohan Kumar", clientId: "CL-020", type: "Outbound", status: "Pending", lastStage: "Insurance Verification", currentStage: "Schedule Appointment", duration: "", date: "2024-04-02 11:30", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-065", client: "Ahmed Al-Mansoori", clientId: "CL-023", type: "Outbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Document Check", duration: "5:45", date: "2024-04-02 10:00", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-066", client: "Fatima Hassan", clientId: "CL-024", type: "Outbound", status: "Failed", lastStage: "Follow-up", currentStage: "Billing Inquiry", duration: "0:00", date: "2024-04-01 16:20", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-067", client: "Jennifer White", clientId: "CL-011", type: "Inbound", status: "Completed", lastStage: "N/A", currentStage: "Initial Contact", duration: "4:15", date: "2024-04-01 15:00", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-068", client: "Kavya Iyer", clientId: "CL-019", type: "Outbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Document Check", duration: "3:40", date: "2024-04-01 13:45", hasRecording: true, hasTranscript: false, hasScheduledCall: false },
  { id: "CALL-069", client: "Michael Chen", clientId: "CL-002", type: "Outbound", status: "Completed", lastStage: "N/A", currentStage: "Initial Contact", duration: "5:25", date: "2024-04-01 12:20", hasRecording: true, hasTranscript: true, hasScheduledCall: true },
  { id: "CALL-070", client: "Oliver Thompson", clientId: "CL-028", type: "Outbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Follow-up", duration: "2:30", date: "2024-04-01 10:50", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-071", client: "Rahul Patel", clientId: "CL-014", type: "Outbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Follow-up", duration: "4:05", date: "2024-03-31 16:30", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-072", client: "Emily Davis", clientId: "CL-003", type: "Inbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Payment Reminder", duration: "6:20", date: "2024-03-31 15:10", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-073", client: "Sarah Johnson", clientId: "CL-001", type: "Outbound", status: "Failed", lastStage: "Initial Contact", currentStage: "Insurance Verification", duration: "0:00", date: "2024-03-31 14:00", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-074", client: "Vikram Singh", clientId: "CL-016", type: "Outbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Slot Selection", duration: "3:15", date: "2024-03-31 12:40", hasRecording: true, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-075", client: "Amanda Clark", clientId: "CL-009", type: "Outbound", status: "Pending", lastStage: "Slot Selection", currentStage: "Confirmation", duration: "", date: "2024-03-31 11:15", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-076", client: "James Taylor", clientId: "CL-008", type: "Outbound", status: "Completed", lastStage: "Insurance Verification", currentStage: "Schedule Appointment", duration: "5:35", date: "2024-03-30 16:00", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-077", client: "Priya Sharma", clientId: "CL-013", type: "Inbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Insurance Verification", duration: "4:50", date: "2024-03-30 14:45", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-078", client: "Arjun Desai", clientId: "CL-018", type: "Outbound", status: "Failed", lastStage: "Payment Reminder", currentStage: "Issue Resolution", duration: "0:00", date: "2024-03-30 13:30", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-079", client: "David Martinez", clientId: "CL-006", type: "Outbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Follow-up", duration: "3:45", date: "2024-03-30 12:00", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-080", client: "Ananya Reddy", clientId: "CL-015", type: "Outbound", status: "Completed", lastStage: "N/A", currentStage: "Initial Contact", duration: "2:20", date: "2024-03-30 10:30", hasRecording: true, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-081", client: "Youssef Said", clientId: "CL-027", type: "Outbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Follow-up", duration: "5:15", date: "2024-03-29 16:20", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-082", client: "Matthew Lewis", clientId: "CL-012", type: "Outbound", status: "Pending", lastStage: "Document Check", currentStage: "Approval", duration: "", date: "2024-03-29 15:00", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-083", client: "Deepika Nair", clientId: "CL-021", type: "Inbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Follow-up", duration: "4:30", date: "2024-03-29 13:45", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-084", client: "Charlotte Evans", clientId: "CL-029", type: "Outbound", status: "Completed", lastStage: "Document Check", currentStage: "Approval", duration: "6:05", date: "2024-03-29 12:20", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-085", client: "Lisa Anderson", clientId: "CL-007", type: "Outbound", status: "Failed", lastStage: "Initial Contact", currentStage: "Follow-up", duration: "0:00", date: "2024-03-29 10:50", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-086", client: "Ahmed Al-Mansoori", clientId: "CL-023", type: "Outbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Insurance Verification", duration: "3:55", date: "2024-03-28 16:10", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-087", client: "Rohan Kumar", clientId: "CL-020", type: "Inbound", status: "Completed", lastStage: "Insurance Verification", currentStage: "Schedule Appointment", duration: "5:40", date: "2024-03-28 14:50", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-088", client: "Kavya Iyer", clientId: "CL-019", type: "Outbound", status: "Completed", lastStage: "N/A", currentStage: "Initial Contact", duration: "2:50", date: "2024-03-28 13:25", hasRecording: true, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-089", client: "Fatima Hassan", clientId: "CL-024", type: "Outbound", status: "Pending", lastStage: "Initial Contact", currentStage: "Payment Reminder", duration: "", date: "2024-03-28 12:00", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-090", client: "Robert Wilson", clientId: "CL-004", type: "Outbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Slot Selection", duration: "4:25", date: "2024-03-28 10:35", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-091", client: "Oliver Thompson", clientId: "CL-028", type: "Outbound", status: "Failed", lastStage: "Insurance Verification", currentStage: "Schedule Appointment", duration: "0:00", date: "2024-03-27 16:00", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-092", client: "Jennifer White", clientId: "CL-011", type: "Inbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Payment Reminder", duration: "5:20", date: "2024-03-27 14:30", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-093", client: "Sarah Johnson", clientId: "CL-001", type: "Outbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Follow-up", duration: "3:35", date: "2024-03-27 13:10", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-094", client: "Omar Al-Rashid", clientId: "CL-025", type: "Outbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Slot Selection", duration: "2:45", date: "2024-03-27 11:40", hasRecording: true, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-095", client: "Michael Chen", clientId: "CL-002", type: "Outbound", status: "Pending", lastStage: "N/A", currentStage: "Initial Contact", duration: "", date: "2024-03-27 10:15", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-096", client: "Rahul Patel", clientId: "CL-014", type: "Outbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Follow-up", duration: "6:10", date: "2024-03-26 16:30", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-097", client: "Arjun Desai", clientId: "CL-018", type: "Inbound", status: "Completed", lastStage: "Follow-up", currentStage: "Billing Inquiry", duration: "4:45", date: "2024-03-26 15:05", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-098", client: "Vikram Singh", clientId: "CL-016", type: "Outbound", status: "Failed", lastStage: "Initial Contact", currentStage: "Slot Selection", duration: "0:00", date: "2024-03-26 13:40", hasRecording: false, hasTranscript: false, hasScheduledCall: true },
  { id: "CALL-099", client: "Emily Davis", clientId: "CL-003", type: "Outbound", status: "Completed", lastStage: "Follow-up", currentStage: "Billing Inquiry", duration: "5:30", date: "2024-03-26 12:15", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  { id: "CALL-100", client: "Priya Sharma", clientId: "CL-013", type: "Outbound", status: "Completed", lastStage: "Initial Contact", currentStage: "Insurance Verification", duration: "3:20", date: "2024-03-26 10:45", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
];

type MetricTone = "success" | "warning" | "neutral";

const metricToneStyles: Record<MetricTone, { bg: string; text: string }> = {
  success: { bg: "bg-emerald-50", text: "text-emerald-800" },
  warning: { bg: "bg-amber-50", text: "text-amber-800" },
  neutral: { bg: "bg-slate-50", text: "text-slate-900" },
};

function MetricTile({
  label,
  value,
  tone = "neutral",
  tooltip,
}: {
  label: string;
  value: string;
  phrase?: string;
  tone?: MetricTone;
  tooltip?: string;
}) {
  const { bg, text } = metricToneStyles[tone];
  const mutedLabel = tone === "neutral" ? "text-slate-500" : text;

  return (
    <div className={`min-w-0 rounded-xl p-3.5 ${bg} h-full flex flex-col justify-between`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <p
          className={`text-[11px] leading-snug ${mutedLabel}`}
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {label}
        </p>
        <Tooltip text={tooltip || label}>
          <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 flex-shrink-0 cursor-help mt-0.5" />
        </Tooltip>
      </div>
      <p
        className="text-xl font-bold break-words leading-snug"
        style={{ fontFamily: "DM Sans, sans-serif" }}
      >
        <span className={text}>{value}</span>
      </p>
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
          className={`grid gap-2.5 items-stretch ${
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

// ── Static section wrapper (no collapse) ─────────────────────────────────────
function MetricSection({
  label,
  columns = 2,
  children,
}: {
  label: string;
  columns?: 2 | 3;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p
        className="text-[12px] text-slate-400 mb-2"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        {label}
      </p>
      <div
        className="grid gap-2.5 items-stretch"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Deterministic per-call metrics ───────────────────────────────────────────
interface CallReviewMetrics {
  // Outcome
  callOutcome: { value: string; tone: MetricTone; phrase: string };
  clientHappiness: { value: string; tone: MetricTone; phrase: string };
  howLong: { value: string; phrase: string };
  whatNext: { value: string; phrase: string };
  // Outcome & Disconnection
  disconnectReason: { value: string; phrase: string };
  bargeInCount: { value: string; phrase: string };
  toolFailure: { value: string; tone: MetricTone; phrase: string };
  loopDetected: { value: string; tone: MetricTone; phrase: string };
  // Sentiment arc
  sentimentStart: { value: string; tone: MetricTone; phrase: string };
  sentimentMid: { value: string; tone: MetricTone; phrase: string };
  sentimentEnd: { value: string; tone: MetricTone; phrase: string };
  // Talk-time
  aiSpokePercent: { value: string; phrase: string };
  longestStretch: { value: string; phrase: string };
  silencePercent: { value: string; phrase: string };
  warmthPercent: { value: string; phrase: string };
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (Math.imul(h, 16777619) >>> 0);
  }
  return h;
}

function makePrng(seed: number) {
  // mulberry32
  let s = seed >>> 0;
  return function (): number {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

const SENTIMENT_OPTIONS: Array<{
  value: string;
  tone: MetricTone;
  phrases: string[];
}> = [
  { value: "Positive", tone: "success", phrases: ["Warm greeting", "Engaged and responsive", "Upbeat throughout", "Resolution confirmed"] },
  { value: "Neutral",  tone: "neutral", phrases: ["Steady tone", "Clarifying details", "Matter-of-fact", "Calm and focused"] },
  { value: "Negative", tone: "warning", phrases: ["Sounded hesitant", "Signs of frustration", "Uncertain responses", "Needed reassurance"] },
];

function pickSentiment(rng: () => number) {
  const weights = [0.5, 0.35, 0.15]; // positive, neutral, negative
  const roll = rng();
  let cum = 0;
  for (let i = 0; i < weights.length; i++) {
    cum += weights[i];
    if (roll < cum) {
      const opt = SENTIMENT_OPTIONS[i];
      const phrase = opt.phrases[Math.floor(rng() * opt.phrases.length)];
      return { value: opt.value, tone: opt.tone as MetricTone, phrase };
    }
  }
  const opt = SENTIMENT_OPTIONS[1];
  return { value: opt.value, tone: opt.tone as MetricTone, phrase: opt.phrases[0] };
}

function getCallReviewMetrics(call: CallLog): CallReviewMetrics {
  const rng = makePrng(hashStr(call.id));
  const isCompleted = call.status === "Completed";

  // ── Outcome (real fields) ────────────────────────────────────────────────
  const callOutcome: CallReviewMetrics["callOutcome"] =
    call.status !== "Completed"
      ? { value: "No Outcome", tone: "neutral", phrase: call.status === "Failed" ? "Call did not connect" : "Call hasn't happened yet" }
      : call.lastStage && call.lastStage !== "N/A" && call.lastStage !== call.currentStage
      ? { value: "Stage Advanced", tone: "success", phrase: `${call.lastStage} → ${call.currentStage}` }
      : { value: "No Change", tone: "neutral", phrase: `Remained at ${call.currentStage}` };

  const rawDuration = call.duration;
  const noDuration = !rawDuration || rawDuration === "0:00";
  const howLong: CallReviewMetrics["howLong"] = noDuration
    ? { value: "—", phrase: "No duration recorded" }
    : { value: rawDuration, phrase: "Total call length" };

  // Generate a near-future follow-up date (seeded)
  const futureDays = Math.floor(randRange(rng, 3, 14));
  const baseDate = new Date("2024-04-15");
  baseDate.setDate(baseDate.getDate() + futureDays);
  const followUpLabel = baseDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const whatNext: CallReviewMetrics["whatNext"] = call.hasScheduledCall
    ? { value: "Scheduled", phrase: `Follow-up on ${followUpLabel}` }
    : { value: "None", phrase: "No follow-up logged" };

  // ── Call Outcome & Disconnection ──────────────────────────────────────────
  const disconnectOptions = ["Caller Disconnected", "Completed Naturally", "No Answer", "Voicemail Detected"];
  const disconnectReason = isCompleted
    ? { value: disconnectOptions[Math.floor(rng() * disconnectOptions.length)], phrase: "How the call ended" }
    : { value: "—", phrase: "No data for this call" };

  const bargeIns = isCompleted ? Math.floor(randRange(rng, 0, 8)) : 0;
  const bargeInCount = isCompleted
    ? { value: `${bargeIns}`, phrase: bargeIns > 4 ? "Higher than usual — client interrupted often" : "Normal range" }
    : { value: "—", phrase: "No data for this call" };

  const hadToolFailure = isCompleted ? rng() < 0.15 : false;
  const toolFailure = isCompleted
    ? { value: hadToolFailure ? "Yes" : "No", tone: (hadToolFailure ? "warning" : "success") as MetricTone, phrase: hadToolFailure ? "An automated action failed mid-call" : "All automated actions succeeded" }
    : { value: "—", tone: "neutral" as MetricTone, phrase: "No data for this call" };

  const hadLoop = isCompleted ? rng() < 0.1 : false;
  const loopDetected = isCompleted
    ? { value: hadLoop ? "Yes" : "No", tone: (hadLoop ? "warning" : "success") as MetricTone, phrase: hadLoop ? "AI repeated itself during the call" : "No repetition detected" }
    : { value: "—", tone: "neutral" as MetricTone, phrase: "No data for this call" };

  // ── Happiness (randomised only for completed) ────────────────────────────
  const noData = { value: "—", tone: "neutral" as MetricTone, phrase: "No data for this call" };

  let clientHappiness: CallReviewMetrics["clientHappiness"];
  if (isCompleted) {
    const score = Math.round(randRange(rng, 3.0, 5.0) * 10) / 10;
    const tone: MetricTone = score >= 4.0 ? "success" : score >= 3.0 ? "neutral" : "warning";
    clientHappiness = { value: `${score.toFixed(1)} / 5`, tone, phrase: "Estimated from tone and words" };
  } else {
    clientHappiness = { ...noData };
  }

  // ── Sentiment arc ────────────────────────────────────────────────────────
  const sentimentStart    = isCompleted ? pickSentiment(rng) : { ...noData };
  const sentimentMid      = isCompleted ? pickSentiment(rng) : { ...noData };
  const sentimentEnd      = isCompleted ? pickSentiment(rng) : { ...noData };

  // ── Talk-time ────────────────────────────────────────────────────────────
  let aiSpokePercent: CallReviewMetrics["aiSpokePercent"];
  let longestStretch: CallReviewMetrics["longestStretch"];
  let silencePercent: CallReviewMetrics["silencePercent"];
  let warmthPercent: CallReviewMetrics["warmthPercent"];

  if (isCompleted) {
    const ai = Math.round(randRange(rng, 40, 70));
    const stretch = Math.round(randRange(rng, 20, 60));
    const silence = Math.round(randRange(rng, 5, 25));
    const warmth = Math.round(randRange(rng, 40, 80));
    aiSpokePercent  = { value: `${ai}%`,       phrase: `${Math.round(ai / 100 * parseFloat(rawDuration || "4") * 60)}s of the call` };
    longestStretch  = { value: `${stretch}s`,  phrase: stretch < 40 ? "Short enough to stay natural" : "Slightly long for a single stretch" };
    silencePercent  = { value: `${silence}%`,  phrase: silence < 15 ? "Less than average" : "A normal amount of pause" };
    warmthPercent   = { value: `${warmth}%`,   phrase: warmth >= 60 ? "Friendly and empathetic" : "Fairly professional tone" };
  } else {
    aiSpokePercent  = { value: "—", phrase: "No data for this call" };
    longestStretch  = { value: "—", phrase: "No data for this call" };
    silencePercent  = { value: "—", phrase: "No data for this call" };
    warmthPercent   = { value: "—", phrase: "No data for this call" };
  }

  return {
    callOutcome, clientHappiness, howLong, whatNext,
    disconnectReason, bargeInCount, toolFailure, loopDetected,
    sentimentStart, sentimentMid, sentimentEnd,
    aiSpokePercent, longestStretch, silencePercent, warmthPercent,
  };
}

export function getSentimentSummary(m: CallReviewMetrics): string {
  if (m.sentimentStart.value === "—") return "No sentiment data available for this call.";
  const start = m.sentimentStart.value.toLowerCase();
  const mid = m.sentimentMid.value.toLowerCase();
  const end = m.sentimentEnd.value.toLowerCase();
  if (start === end && mid === start) {
    return `Maintained a steady ${start} tone throughout the call.`;
  }
  if (start === end) {
    return `Started ${start}, shifted to ${mid} mid-call, and returned to ${end}.`;
  }
  return `Started ${start}, shifted to ${mid}, and ended ${end}.`;
}

export interface UpdatedField {
  field: string;
  value: string;
}

export function getUpdatedFields(call: CallLog): UpdatedField[] {
  if (call.status !== "Completed") return [];
  const fields: UpdatedField[] = [];
  if (call.lastStage && call.lastStage !== "N/A" && call.lastStage !== call.currentStage) {
    fields.push({ field: "Stage", value: call.currentStage });
  }
  if (call.hasScheduledCall) {
    fields.push({ field: "Next Follow-up", value: "Scheduled" });
  }
  fields.push({ field: "Last Contact", value: call.date.split(" ")[0] });
  return fields;
}

export default function CallLogs() {
  const location = useLocation();

  // Helper function to derive process from stage (defined before useState)
  const deriveProcessFromStage = (stage: string): string => {
    const stageToProcessMap: Record<string, string> = {
      'Insurance Verification': 'Patient Intake',
      'Insurance Verify': 'Patient Intake',
      'Schedule Appointment': 'Patient Intake',
      'Initial Contact': 'Patient Intake',
      'Follow-up': 'Follow-up Calls',
      'Post-Visit Check': 'Follow-up Calls',
      'Medication Reminder': 'Follow-up Calls',
      'Billing Inquiry': 'Payment Reminder',
      'Issue Resolution': 'Payment Reminder',
      'Payment Reminder': 'Payment Reminder',
      'Payment Notice': 'Payment Reminder',
      'Payment Collected': 'Payment Reminder',
      'Slot Selection': 'Appointment Scheduling',
      'Confirmation': 'Appointment Scheduling',
      'Document Check': 'Insurance Verification',
      'Verification': 'Insurance Verification',
      'Approval': 'Insurance Verification',
    };
    return stageToProcessMap[stage] || 'Patient Intake';
  };

  // Ensure all call logs have process field
  const [callLogs, setCallLogs] = useState<CallLog[]>(
    initialCallLogs.map(log => ({
      ...log,
      process: log.process || deriveProcessFromStage(log.currentStage)
    }))
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [selectedProcessFilter, setSelectedProcessFilter] = useState<string | null>(null);
  const [showProcessesDropdown, setShowProcessesDropdown] = useState(false);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<number | null>(null);
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


  // Hamburger menu state
  const [openMenuCallId, setOpenMenuCallId] = useState<string | null>(null);

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
    "Billing Support",
    "Appointment Scheduling",
    "Insurance Verification"
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
    callId: true,
    client: true,
    status: true,
    stage: true,
    duration: true,
    date: true,
  });

  // Client filter state
  const [activeClientFilter, setActiveClientFilter] = useState<string>("");
  const [activeClientId, setActiveClientId] = useState<string>("");
  const [showHelp, setShowHelp] = useState(false);

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

  // Comprehensive stage pipeline (for progress visualization) - matching /deals exactly
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
    { id: 10, label: "Slot Selection", fullLabel: "Appointment Scheduling: Slot Selection", category: "Appointment Scheduling" },
    { id: 11, label: "Confirmation", fullLabel: "Appointment Scheduling: Confirmation", category: "Appointment Scheduling" },
    { id: 12, label: "Document Check", fullLabel: "Insurance Verification: Document Check", category: "Insurance Verification" },
    { id: 13, label: "Verification", fullLabel: "Insurance Verification: Verification", category: "Insurance Verification" },
    { id: 14, label: "Approval", fullLabel: "Insurance Verification: Approval", category: "Insurance Verification" },
  ];

  // Helper to get stage position (1-14) from current stage name
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
      "Billing Inquiry": "Billing Support",
      "Issue Resolution": "Billing Support",
      "Payment Reminder": "Billing Support",
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

  // Selection state
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

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

  const handleClearClientFilter = () => {
    setActiveClientFilter("");
    setActiveClientId("");
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

    return matchesSearch && matchesClientFilter;
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
    };

    checkScroll();
    window.addEventListener('resize', checkScroll);

    return () => {
      window.removeEventListener('resize', checkScroll);
      if (scrollIntervalRef.current) {
        cancelAnimationFrame(scrollIntervalRef.current);
      }
    };
  }, [filteredLogs]);

  // Close hamburger menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (openMenuCallId && !target.closest('.hamburger-menu-container')) {
        setOpenMenuCallId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuCallId]);

  const handleExport = () => {
    setIsExporting(true);
    toast.loading("Exporting data...");

    // Simulate export process
    setTimeout(() => {
      setIsExporting(false);
      toast.dismiss();
      toast.success("Call logs exported successfully");
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
          title="Calls"
          subtitle="Review recordings, read transcripts, and spot trends across every call your team makes."
        >
          <HowItWorksButton onClick={() => setShowHelp(true)} label="How Calls Works" />
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
                  Showing call logs for <span className="font-semibold">{activeClientFilter}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Click the button to view all call logs
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
                  placeholder="Search call logs..."
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
                            Deals in progress
                          </button>
                          <button className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors text-foreground">
                            Test deals
                          </button>
                          <button className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors text-foreground">
                            Closed deals
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
                              <div className="flex items-center gap-1 mb-2">
                                <label className="block text-xs font-medium text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                  Stage group
                                </label>
                                <InfoTooltip text="Filter to calls currently sitting in this pipeline stage." />
                              </div>
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

            {/* Processes Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProcessesDropdown(!showProcessesDropdown)}
                className="flex items-center gap-2 px-3 py-2 bg-white border transition-colors rounded-lg"
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
              <InfoTooltip text="Only show calls that belong to this workflow." />

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

        {/* Bulk Action Bar */}
        {selectedRows.size > 0 && (
          <div className="bg-card rounded-xl border border-border shadow-sm">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">
                  {selectedRows.size} selected
                </span>
                <button
                  onClick={handleClearSelection}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear selection
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowTriggerCallsModal(true)}
                >
                  <Phone className="w-3.5 h-3.5" />
                  Trigger Calls
                </Button>
                <Tooltip text={hasScheduledCalls ? "Cancel scheduled calls" : "No scheduled calls selected"}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCancelCallsModal(true)}
                    disabled={!hasScheduledCalls}
                    className="text-destructive hover:bg-destructive/10 disabled:text-muted-foreground disabled:hover:bg-transparent"
                  >
                    <StopCircle className="w-3.5 h-3.5" />
                    Cancel Scheduled
                  </Button>
                </Tooltip>
              </div>
            </div>
          </div>
        )}

        {/* List View */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden relative">
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
            <table className="w-full">
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
                  <th className="px-2 py-2.5 w-8"></th>
                  {visibleColumns.callId && <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#FFFFFF', fontFamily: 'Outfit, sans-serif' }}>Call ID</th>}
                  {visibleColumns.client && <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#FFFFFF', fontFamily: 'Outfit, sans-serif' }}>Client</th>}
                  {visibleColumns.stage && <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#FFFFFF', fontFamily: 'Outfit, sans-serif' }}>Stage</th>}
                  {visibleColumns.status && <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: '#FFFFFF', fontFamily: 'Outfit, sans-serif' }}>Status</th>}
                  {visibleColumns.date && <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#FFFFFF', fontFamily: 'Outfit, sans-serif' }}>Date & Time</th>}
                  {visibleColumns.duration && <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: '#FFFFFF', fontFamily: 'Outfit, sans-serif' }}>Duration</th>}
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
                    {/* Hamburger menu column */}
                    <td className="px-2 py-2.5 relative">
                      <div className="hamburger-menu-container">
                        <button
                          onClick={() => setOpenMenuCallId(openMenuCallId === log.id ? null : log.id)}
                          className="p-1 hover:bg-muted rounded transition-colors flex items-center justify-center"
                          style={{ width: '24px', height: '24px' }}
                        >
                          <MoreVertical className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                        </button>

                        {/* Hamburger menu popup */}
                        {openMenuCallId === log.id && (
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
                                setSelectedCallForDetails(log);
                                setShowCallDetailsDrawer(true);
                                setOpenMenuCallId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-[#E8F0FE] transition-colors"
                              style={{ fontFamily: 'Outfit, sans-serif', color: '#1F2937' }}
                            >
                              <Eye className="w-4 h-4" />
                              <span>View</span>
                            </button>
                            <button
                              onClick={() => {
                                toast.info('Call feature coming soon');
                                setOpenMenuCallId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-[#E8F0FE] transition-colors"
                              style={{ fontFamily: 'Outfit, sans-serif', color: '#1F2937' }}
                            >
                              <Phone className="w-4 h-4" />
                              <span>Call</span>
                            </button>
                            <button
                              onClick={() => {
                                toast.success(`Call log ${log.id} deleted`);
                                setOpenMenuCallId(null);
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
                    {visibleColumns.callId && (
                      <td className="px-4 py-2.5 font-medium text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        <button
                          onClick={() => {
                            setSelectedCallForDetails(log);
                            setShowCallDetailsDrawer(true);
                          }}
                          className="hover:underline text-left"
                          style={{ color: '#1A73E8', cursor: 'pointer' }}
                        >
                          #{log.id}
                        </button>
                      </td>
                    )}
                    {visibleColumns.client && (
                      <td className="px-4 py-2.5 font-medium text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        <div className="flex items-center" style={{ gap: '6px' }}>
                          {log.type === "Outbound" ? (
                            <PiPhoneOutgoing style={{ width: '14px', height: '14px', color: '#1A73E8', flexShrink: 0 }} />
                          ) : (
                            <PiPhoneIncoming style={{ width: '14px', height: '14px', color: '#22C55E', flexShrink: 0 }} />
                          )}
                          <span
                            className="text-left"
                            style={{ color: '#1A73E8' }}
                          >
                            {log.client}
                          </span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.stage && (
                      <td className="px-4 py-2.5 text-xs" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        {log.lastStage && log.lastStage !== "N/A" ? (
                          <span className="flex items-center gap-1 flex-wrap">
                            <span style={{ color: '#94A3B8' }}>{log.lastStage}</span>
                            <span style={{ color: '#94A3B8', margin: '0 2px' }}>→</span>
                            <span style={{ color: '#111827' }}>{log.currentStage}</span>
                          </span>
                        ) : (
                          <span style={{ color: '#111827' }}>{log.currentStage}</span>
                        )}
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
                    {visibleColumns.duration && <td className="px-4 py-2.5 text-xs text-center tabular-nums" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>{log.duration}</td>}
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
              Select a custom date range to filter call logs
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
                  Call Analysis
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
                  Feedback
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

              {activeDrawerTab === "call-review" && selectedCallForDetails && (() => {
                const m = getCallReviewMetrics(selectedCallForDetails);
                const updatedFields = getUpdatedFields(selectedCallForDetails);

                return (
                  <div className="space-y-5 p-6">
                    {/* 1. Hero Row (2 cards) */}
                    <div className="grid grid-cols-2 gap-3 items-stretch">
                      {/* Hero 1: Call Outcome */}
                      <div
                        className={`p-4 rounded-xl border transition-all h-full flex flex-col justify-between ${
                          m.callOutcome.tone === "success"
                            ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                            : m.callOutcome.tone === "warning"
                            ? "bg-amber-50/70 border-amber-200 text-amber-950"
                            : "bg-slate-50 border-slate-200 text-slate-900"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-[12px] text-slate-500 font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
                            Call Outcome
                          </p>
                          <Tooltip text="Whether this call moved the client forward in their pipeline stage.">
                            <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 flex-shrink-0 cursor-help mt-0.5" />
                          </Tooltip>
                        </div>
                        <p className="text-[26px] font-bold break-words leading-tight" style={{ fontFamily: "DM Sans, sans-serif" }}>
                          {m.callOutcome.value}
                        </p>
                      </div>

                      {/* Hero 2: Client happiness */}
                      <div className="p-4 rounded-xl border border-slate-200 bg-white h-full flex flex-col justify-between">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-[12px] text-slate-500 font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
                            Client happiness
                          </p>
                          <Tooltip text="Estimated satisfaction based on tone and word choice during the call.">
                            <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 flex-shrink-0 cursor-help mt-0.5" />
                          </Tooltip>
                        </div>
                        <p className="text-[26px] font-bold break-words leading-tight" style={{ fontFamily: "DM Sans, sans-serif" }}>
                          {m.clientHappiness.value}
                        </p>
                      </div>
                    </div>

                    {/* 2. Call Outcome & Disconnection */}
                    <MetricSection label="Call Outcome & Disconnection" columns={2}>
                      <MetricTile
                        label="Disconnect / End Reason"
                        value={m.disconnectReason.value}
                        phrase={m.disconnectReason.phrase}
                        tooltip="How and why the call ended."
                      />
                      <MetricTile
                        label="Barge-in Count"
                        value={m.bargeInCount.value}
                        phrase={m.bargeInCount.phrase}
                        tooltip="Number of times the client spoke over or interrupted the AI."
                      />
                      <MetricTile
                        label="Tool / Action Failure"
                        value={m.toolFailure.value}
                        tone={m.toolFailure.tone}
                        phrase={m.toolFailure.phrase}
                        tooltip="Whether any automated action (booking, lookup, etc.) failed during the call."
                      />
                      <MetricTile
                        label="Loop Detected"
                        value={m.loopDetected.value}
                        tone={m.loopDetected.tone}
                        phrase={m.loopDetected.phrase}
                        tooltip="Whether the AI repeated the same response pattern during the call."
                      />
                    </MetricSection>

                    {/* 3. Fields Updated From This Call */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] text-slate-400 font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
                          Fields updated from this call
                        </p>
                        <Tooltip text="CRM fields that were created or changed as a direct result of this call.">
                          <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 flex-shrink-0 cursor-help" />
                        </Tooltip>
                      </div>
                      {updatedFields.length === 0 ? (
                        <p className="text-xs text-slate-500 italic" style={{ fontFamily: "Outfit, sans-serif" }}>No fields were updated from this call.</p>
                      ) : (
                        <table className="w-full text-xs" style={{ fontFamily: "Outfit, sans-serif" }}>
                          <thead>
                            <tr className="text-left text-slate-400 uppercase text-[10px] tracking-wide">
                              <th className="pb-2 font-medium">Field</th>
                              <th className="pb-2 font-medium">Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {updatedFields.map((f, i) => (
                              <tr key={i}>
                                <td className="py-2 text-primary font-medium">{f.field}</td>
                                <td className="py-2 text-slate-700">{f.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* 4. Collapsible Metric Groups */}
                    <MetricGroup label="Talk and pacing" defaultOpen={true} columns={2}>
                      <MetricTile
                        label="Time the AI spoke"
                        value={m.aiSpokePercent.value}
                        phrase={m.aiSpokePercent.phrase}
                        tooltip="Share of call duration during which the AI agent was speaking."
                      />
                      <MetricTile
                        label="How warm the AI sounded"
                        value={m.warmthPercent.value}
                        phrase={m.warmthPercent.phrase}
                        tooltip="Share of agent responses classified as empathetic or rapport-building."
                      />
                      <MetricTile
                        label="Longest stretch without a break"
                        value={m.longestStretch.value}
                        phrase={m.longestStretch.phrase}
                        tooltip="The longest single block of uninterrupted talking during the call."
                      />
                      <MetricTile
                        label="Silence during the call"
                        value={m.silencePercent.value}
                        phrase={m.silencePercent.phrase}
                        tooltip="Total duration of pauses and silence during the conversation."
                      />
                    </MetricGroup>

                    {/* 5. Footer Row */}
                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                      <div className="flex items-center gap-2">
                        <CalendarClock className="w-4 h-4 text-slate-400" />
                        <span>{m.whatNext.phrase}</span>
                      </div>
                      <span className="font-semibold text-slate-700">{m.whatNext.value}</span>
                    </div>
                  </div>
                );
              })()}

              {activeDrawerTab === "review" && (
                <div className="space-y-6 p-6">
                  {/* Rating & Feedback Card */}
                  <div className="bg-card rounded-2xl p-8 border border-border shadow-lg">
                    <h2 className="text-lg font-semibold mb-4" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Rating & Feedback</h2>
                    
                    <div
                      className="flex items-start gap-3 p-4 rounded-xl mb-4"
                      style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}
                    >
                      <Star className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#1A73E8' }} />
                      <div>
                        <p className="text-sm font-medium" style={{ color: '#1E3A8A', fontFamily: 'Outfit, sans-serif' }}>
                          Rate this call
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: '#1E40AF', fontFamily: 'Outfit, sans-serif' }}>
                          Your feedback helps improve future AI-driven conversations and call quality.
                        </p>
                      </div>
                    </div>

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

      <HowItWorksModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="How Calls Works"
        summary="The Calls page logs every inbound and outbound call. Listen to recordings, read AI-generated transcripts, and track performance at a glance."
        bullets={[
          "Filter by date range, status, or client name",
          "Play recordings and read full transcripts inline",
          "Download transcripts for your records",
          "See call scores and AI sentiment analysis",
        ]}
        guideUrl="/guide/call-logs"
      />
    </div>
  );
}
