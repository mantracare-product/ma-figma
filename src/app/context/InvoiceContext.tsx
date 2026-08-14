import React, { createContext, useContext, useState, useEffect } from "react";
import { ClientInvoice, InvoiceLineItem, InvoiceStatus, ReportDefinition, ReportDataSource, InvoiceFieldRule, InvoiceFieldRulesMap, Payment } from "../types/invoiceTypes";
import { addActivityEntry } from "../../lib/activityLog";
import { useFieldRegistry } from "./FieldRegistryContext";

interface CreateInvoiceOptions {
  appointmentId?: string;
  appointmentTitle?: string;
  createdBy?: "system" | string;
  discountType?: "amount" | "percent";
  discountValue?: number;
  discountAmount?: number;
  dueDate?: string;
  paymentMode?: string;
}

interface InvoiceContextType {
  invoices: ClientInvoice[];
  payments: Payment[];
  fieldRules: InvoiceFieldRulesMap;
  updateFieldRule: (rule: InvoiceFieldRule) => void;
  createInvoiceFromAppointment: (
    appointment: {
      id?: string | number;
      clientId: string;
      clientName: string;
      clientEmail?: string;
      clientPhone?: string;
      title?: string;
    },
    lineItems: InvoiceLineItem[],
    options?: CreateInvoiceOptions
  ) => ClientInvoice;
  updateInvoice: (invoiceId: string, patch: Partial<ClientInvoice>) => void;
  deleteInvoice: (invoiceId: string) => void;
  updateInvoiceStatus: (invoiceId: string, status: InvoiceStatus) => void;
  sendInvoice: (invoiceId: string, channel?: "whatsapp" | "sms" | "email") => void;
  simulatePayment: (invoiceId: string) => void;
  recordPayment: (paymentParamsList: Omit<Payment, "id" | "createdAt">[]) => void;
  getPaymentsByInvoice: (invoiceId: string) => Payment[];
  getPaymentsByClient: (clientId: string) => Payment[];
  voidInvoice: (invoiceId: string) => void;
  getInvoiceById: (invoiceId: string) => ClientInvoice | undefined;
  getInvoicesByClient: (clientId: string) => ClientInvoice[];
  getReportData: (dataSource: ReportDataSource, filters?: Record<string, any>, groupBy?: string) => any;
  getReportRows: (dataSource: ReportDataSource) => Record<string, any>[];
  reports: ReportDefinition[];
  saveReport: (report: Omit<ReportDefinition, "id" | "lastRun"> & { id?: string }) => ReportDefinition;
  deleteReport: (reportId: string) => void;
}

const DEFAULT_FIELD_RULES: InvoiceFieldRulesMap = {
  paymentMode: {
    fieldKey: "paymentMode",
    fieldName: "Payment mode",
    requiredAtStage: "sent",
    showAlways: false,
    enableTooltip: false,
    visibleToUserIds: [],
  },
};

const INITIAL_INVOICES: ClientInvoice[] = [
  {
    id: "INV-CL-1040",
    clientId: "c-1",
    clientName: "James Wilson",
    clientEmail: "james.w@example.com",
    clientPhone: "+1 (555) 123-4567",
    appointmentId: "1",
    appointmentTitle: "Initial Consultation",
    status: "paid",
    currency: "$",
    paymentMode: "Card",
    lineItems: [
      { id: "li-1", source: "service", serviceId: "srv-1", description: "Initial Consultation", quantity: 1, unitPrice: 150 },
    ],
    subtotal: 150,
    discountAmount: 0,
    taxAmount: 12,
    total: 162,
    amountPaid: 162,
    paymentType: "self_pay",
    createdAt: "2026-05-12T09:00:00Z",
    createdBy: "Admin User",
    dueDate: "2026-05-26",
    sentAt: "2026-05-12T09:05:00Z",
    sentVia: "whatsapp",
    paidAt: "2026-05-14T14:30:00Z",
    paymentLinkUrl: "https://pay.mantraassist.mock/inv-1040",
  },
  {
    id: "INV-CL-1041",
    clientId: "c-2",
    clientName: "Emma Brown",
    clientEmail: "emma.b@example.com",
    clientPhone: "+1 (555) 234-5678",
    appointmentId: "2",
    appointmentTitle: "Follow-up Visit",
    status: "sent",
    currency: "$",
    paymentMode: "Bank Transfer",
    lineItems: [
      { id: "li-2", source: "service", serviceId: "srv-2", description: "Follow-up Visit", quantity: 1, unitPrice: 75 },
    ],
    subtotal: 75,
    discountAmount: 0,
    taxAmount: 6,
    total: 81,
    amountPaid: 0,
    createdAt: "2026-05-12T10:30:00Z",
    createdBy: "system",
    dueDate: "2026-05-26",
    sentAt: "2026-05-12T10:31:00Z",
    sentVia: "whatsapp",
    paymentLinkUrl: "https://pay.mantraassist.mock/inv-1041",
  },
  {
    id: "INV-CL-1042",
    clientId: "c-3",
    clientName: "Oliver Davis",
    clientEmail: "oliver.d@example.com",
    clientPhone: "+1 (555) 345-6789",
    appointmentId: "3",
    appointmentTitle: "X-Ray Imaging",
    status: "overdue",
    currency: "$",
    lineItems: [
      { id: "li-3", source: "service", serviceId: "srv-4", description: "X-Ray Imaging", quantity: 1, unitPrice: 80 },
      { id: "li-4", source: "manual", description: "Radiology Processing Fee", quantity: 1, unitPrice: 25 },
    ],
    subtotal: 105,
    discountAmount: 5,
    taxAmount: 8,
    total: 108,
    amountPaid: 0,
    createdAt: "2026-05-13T14:00:00Z",
    createdBy: "Admin User",
    dueDate: "2026-05-27",
    sentAt: "2026-05-13T14:05:00Z",
    sentVia: "sms",
    paymentLinkUrl: "https://pay.mantraassist.mock/inv-1042",
  },
  {
    id: "INV-CL-1043",
    clientId: "c-4",
    clientName: "Priya Nair",
    clientEmail: "priya.n@example.com",
    clientPhone: "+1 (555) 987-6543",
    status: "draft",
    currency: "$",
    lineItems: [
      { id: "li-5", source: "service", serviceId: "srv-3", description: "Dental Cleaning", quantity: 1, unitPrice: 120 },
    ],
    subtotal: 120,
    discountAmount: 10,
    taxAmount: 8.8,
    total: 118.8,
    amountPaid: 0,
    createdAt: "2026-08-10T15:00:00Z",
    createdBy: "Admin User",
    dueDate: "2026-08-25",
    paymentLinkUrl: "https://pay.mantraassist.mock/inv-1043",
  },
  {
    id: "INV-CL-1044",
    clientId: "c-5",
    clientName: "David Miller",
    clientEmail: "dmiller@example.com",
    clientPhone: "+1 (555) 432-1098",
    status: "viewed",
    currency: "$",
    lineItems: [
      { id: "li-6", source: "service", serviceId: "srv-5", description: "Physiotherapy Session", quantity: 2, unitPrice: 110 },
    ],
    subtotal: 220,
    discountAmount: 20,
    taxAmount: 16,
    total: 216,
    amountPaid: 0,
    createdAt: "2026-08-05T08:45:00Z",
    createdBy: "system",
    dueDate: "2026-08-19",
    sentAt: "2026-08-05T08:46:00Z",
    sentVia: "email",
    paymentLinkUrl: "https://pay.mantraassist.mock/inv-1044",
  },
  {
    id: "INV-CL-1045",
    clientId: "c-1",
    clientName: "Sarah Jenkins",
    clientEmail: "sarah.j@example.com",
    clientPhone: "+1 (555) 234-5678",
    status: "paid",
    currency: "$",
    lineItems: [
      { id: "li-7", source: "service", serviceId: "srv-6", description: "Blood Test & Lab Panel", quantity: 1, unitPrice: 95 },
    ],
    subtotal: 95,
    discountAmount: 0,
    taxAmount: 7.6,
    total: 102.6,
    amountPaid: 102.6,
    paymentType: "self_pay",
    createdAt: "2026-07-20T14:20:00Z",
    createdBy: "system",
    dueDate: "2026-08-04",
    sentAt: "2026-07-20T14:21:00Z",
    sentVia: "whatsapp",
    paidAt: "2026-07-22T09:15:00Z",
    paymentLinkUrl: "https://pay.mantraassist.mock/inv-1045",
  },
  {
    id: "INV-CL-1046",
    clientId: "c-2",
    clientName: "Michael Chang",
    clientEmail: "m.chang@example.com",
    clientPhone: "+1 (555) 876-5432",
    status: "paid",
    currency: "$",
    lineItems: [
      { id: "li-8", source: "service", serviceId: "srv-1", description: "Initial Consultation", quantity: 1, unitPrice: 150 },
    ],
    subtotal: 150,
    discountAmount: 15,
    taxAmount: 10.8,
    total: 145.8,
    amountPaid: 145.8,
    paymentType: "self_pay",
    createdAt: "2026-06-15T11:00:00Z",
    createdBy: "Admin User",
    dueDate: "2026-06-30",
    sentAt: "2026-06-15T11:05:00Z",
    sentVia: "whatsapp",
    paidAt: "2026-06-16T16:00:00Z",
    paymentLinkUrl: "https://pay.mantraassist.mock/inv-1046",
  },
  {
    id: "INV-CL-1047",
    clientId: "c-3",
    clientName: "Elena Rostova",
    clientEmail: "elena.r@example.com",
    clientPhone: "+1 (555) 345-6789",
    status: "void",
    currency: "$",
    lineItems: [
      { id: "li-9", source: "service", serviceId: "srv-2", description: "Follow-up Visit", quantity: 1, unitPrice: 75 },
    ],
    subtotal: 75,
    discountAmount: 0,
    taxAmount: 6,
    total: 81,
    amountPaid: 0,
    createdAt: "2026-06-10T09:00:00Z",
    createdBy: "Admin User",
    dueDate: "2026-06-24",
    paymentLinkUrl: "https://pay.mantraassist.mock/inv-1047",
  },
  {
    id: "INV-CL-1048",
    clientId: "c-4",
    clientName: "Priya Nair",
    clientEmail: "priya.n@example.com",
    clientPhone: "+1 (555) 987-6543",
    status: "paid",
    currency: "$",
    lineItems: [
      { id: "li-10", source: "service", serviceId: "srv-3", description: "Dental Cleaning", quantity: 1, unitPrice: 120 },
      { id: "li-11", source: "service", serviceId: "srv-4", description: "X-Ray Imaging", quantity: 1, unitPrice: 80 },
    ],
    subtotal: 200,
    discountAmount: 20,
    taxAmount: 14.4,
    total: 194.4,
    amountPaid: 194.4,
    paymentType: "self_pay",
    createdAt: "2026-07-28T16:30:00Z",
    createdBy: "system",
    dueDate: "2026-08-11",
    sentAt: "2026-07-28T16:31:00Z",
    sentVia: "whatsapp",
    paidAt: "2026-07-29T10:00:00Z",
    paymentLinkUrl: "https://pay.mantraassist.mock/inv-1048",
  },
  {
    id: "INV-CL-1049",
    clientId: "c-5",
    clientName: "David Miller",
    clientEmail: "dmiller@example.com",
    clientPhone: "+1 (555) 432-1098",
    status: "sent",
    currency: "$",
    lineItems: [
      { id: "li-12", source: "service", serviceId: "srv-1", description: "Initial Consultation", quantity: 1, unitPrice: 150 },
    ],
    subtotal: 150,
    discountAmount: 0,
    taxAmount: 12,
    total: 162,
    amountPaid: 0,
    createdAt: "2026-08-08T13:10:00Z",
    createdBy: "Admin User",
    dueDate: "2026-08-22",
    sentAt: "2026-08-08T13:12:00Z",
    sentVia: "sms",
    paymentLinkUrl: "https://pay.mantraassist.mock/inv-1049",
  },
];


// ─── Record-level mock rows used by the custom report engine ─────────────────
const MOCK_REPORT_ROWS: Record<string, Record<string, any>[]> = {
  calls: [
    { id: "call-101", client: "Sarah Jenkins", service: "Patient Intake", duration: 252, status: "Completed", sentiment: "Positive", cost: 0.45, created: "2026-08-12", responsible: "John Smith" },
    { id: "call-102", client: "Michael Chang", service: "Appointment Scheduling", duration: 150, status: "Completed", sentiment: "Neutral", cost: 0.28, created: "2026-08-11", responsible: "Sarah Johnson" },
    { id: "call-103", client: "Elena Rostova", service: "Insurance Verification", duration: 318, status: "Completed", sentiment: "Positive", cost: 0.58, created: "2026-08-11", responsible: "John Smith" },
    { id: "call-104", client: "David Miller", service: "Follow-up Calls", duration: 105, status: "Handoff", sentiment: "Negative", cost: 0.20, created: "2026-08-10", responsible: "Lisa Anderson" },
    { id: "call-105", client: "Priya Nair", service: "Billing Support", duration: 224, status: "Completed", sentiment: "Positive", cost: 0.41, created: "2026-08-09", responsible: "Sarah Johnson" },
    { id: "call-106", client: "Emma Brown", service: "Patient Intake", duration: 96, status: "Failed", sentiment: "Neutral", cost: 0.14, created: "2026-08-08", responsible: "Michael Chen" },
    { id: "call-107", client: "Oliver Davis", service: "Appointment Scheduling", duration: 281, status: "Completed", sentiment: "Positive", cost: 0.52, created: "2026-08-07", responsible: "Emily Davis" },
    { id: "call-108", client: "James Wilson", service: "Follow-up Calls", duration: 133, status: "Completed", sentiment: "Neutral", cost: 0.24, created: "2026-08-06", responsible: "Lisa Anderson" },
  ],
  appointments: [
    { id: "appt-1", service: "Initial Consultation", client: "James Wilson", provider: "John Smith", date: "2026-08-12", status: "Scheduled", created: "2026-08-05" },
    { id: "appt-2", service: "Follow-up Visit", client: "Emma Brown", provider: "Sarah Johnson", date: "2026-08-11", status: "Scheduled", created: "2026-08-04" },
    { id: "appt-3", service: "Dental Cleaning", client: "Oliver Davis", provider: "Dr. Robert Martinez", date: "2026-08-10", status: "Completed", created: "2026-08-01" },
    { id: "appt-4", service: "X-Ray Imaging", client: "Priya Nair", provider: "Dr. Robert Martinez", date: "2026-08-09", status: "Cancelled", created: "2026-07-30" },
    { id: "appt-5", service: "Physiotherapy Session", client: "David Miller", provider: "Sarah Johnson", date: "2026-08-08", status: "No-show", created: "2026-07-28" },
    { id: "appt-6", service: "Initial Consultation", client: "Michael Chang", provider: "John Smith", date: "2026-08-07", status: "Completed", created: "2026-07-27" },
    { id: "appt-7", service: "Blood Test & Lab Panel", client: "Sarah Jenkins", provider: "Dr. Robert Martinez", date: "2026-08-06", status: "Completed", created: "2026-07-25" },
    { id: "appt-8", service: "Follow-up Visit", client: "Elena Rostova", provider: "Sarah Johnson", date: "2026-08-05", status: "Scheduled", created: "2026-07-24" },
  ],
  clients: [
    { client: "Sarah Jenkins", stage: "Schedule Appointment", process: "Patient Intake", value: 162, status: "Active", responsible: "John Smith", created: "2026-06-01", lastContact: "2026-08-12" },
    { client: "Michael Chang", stage: "Insurance Verification", process: "Patient Intake", value: 81, status: "Active", responsible: "Sarah Johnson", created: "2026-06-10", lastContact: "2026-08-11" },
    { client: "Elena Rostova", stage: "Initial Contact", process: "Follow-up Calls", value: 108, status: "Active", responsible: "John Smith", created: "2026-07-02", lastContact: "2026-08-10" },
    { client: "David Miller", stage: "Confirmed", process: "Appointment Scheduling", value: 216, status: "Active", responsible: "Lisa Anderson", created: "2026-06-20", lastContact: "2026-08-09" },
    { client: "Priya Nair", stage: "Insurance Verification", process: "Billing Support", value: 194.4, status: "Active", responsible: "Emily Davis", created: "2026-05-15", lastContact: "2026-08-08" },
    { client: "Emma Brown", stage: "Initial Contact", process: "Patient Intake", value: 0, status: "Inactive", responsible: "Michael Chen", created: "2026-07-18", lastContact: "2026-07-28" },
    { client: "Oliver Davis", stage: "Document Check", process: "Insurance Verification", value: 0, status: "Pending", responsible: "Sarah Johnson", created: "2026-06-25", lastContact: "2026-08-07" },
    { client: "James Wilson", stage: "Scheduled", process: "Appointment Scheduling", value: 162, status: "Active", responsible: "John Smith", created: "2026-05-01", lastContact: "2026-08-12" },
  ],
  team: [
    { member: "John Smith", role: "Senior Agent", calls: 48, appts: 12, rating: 4.9, status: "Active", created: "2025-01-15", responsible: "Admin" },
    { member: "Sarah Johnson", role: "Agent", calls: 42, appts: 9, rating: 4.8, status: "Active", created: "2025-03-02", responsible: "Admin" },
    { member: "Dr. Robert Martinez", role: "Practitioner", calls: 18, appts: 6, rating: 5.0, status: "Active", created: "2024-11-10", responsible: "Admin" },
    { member: "Lisa Anderson", role: "Agent", calls: 36, appts: 5, rating: 4.7, status: "Active", created: "2025-06-20", responsible: "Admin" },
    { member: "Michael Chen", role: "Agent", calls: 30, appts: 4, rating: 4.6, status: "On Leave", created: "2025-09-01", responsible: "Admin" },
    { member: "Emily Davis", role: "Coordinator", calls: 22, appts: 7, rating: 4.8, status: "Active", created: "2025-02-14", responsible: "Admin" },
  ],
  messaging: [
    { id: "msg-1", client: "Sarah Jenkins", channel: "WhatsApp", status: "Delivered", messages: 6, botContained: "Yes", created: "2026-08-12", responsible: "AI Bot" },
    { id: "msg-2", client: "Michael Chang", channel: "WhatsApp", status: "Read", messages: 4, botContained: "Yes", created: "2026-08-11", responsible: "AI Bot" },
    { id: "msg-3", client: "Elena Rostova", channel: "SMS", status: "Delivered", messages: 2, botContained: "No", created: "2026-08-10", responsible: "Agent Desk" },
    { id: "msg-4", client: "David Miller", channel: "Email", status: "Failed", messages: 1, botContained: "No", created: "2026-08-09", responsible: "Agent Desk" },
    { id: "msg-5", client: "Priya Nair", channel: "WhatsApp", status: "Read", messages: 8, botContained: "Yes", created: "2026-08-08", responsible: "AI Bot" },
    { id: "msg-6", client: "James Wilson", channel: "WhatsApp", status: "Delivered", messages: 3, botContained: "Yes", created: "2026-08-07", responsible: "AI Bot" },
    { id: "msg-7", client: "Oliver Davis", channel: "SMS", status: "Delivered", messages: 2, botContained: "No", created: "2026-08-06", responsible: "Agent Desk" },
    { id: "msg-8", client: "Emma Brown", channel: "WhatsApp", status: "Read", messages: 5, botContained: "Yes", created: "2026-08-05", responsible: "AI Bot" },
  ],
  processes: [
    { id: "PR-001", client: "James Wilson", process: "Patient Intake", stage: "Schedule Appointment", status: "Pending", created: "2026-07-20", lastActivity: "2026-08-10", responsible: "John Smith", timeInStage: 2.4 },
    { id: "PR-002", client: "Emma Brown", process: "Patient Intake", stage: "Initial Contact", status: "Failed", created: "2026-07-18", lastActivity: "2026-07-30", responsible: "Sarah Johnson", timeInStage: 4.1 },
    { id: "PR-003", client: "Oliver Davis", process: "Insurance Verification", stage: "Document Check", status: "Pending", created: "2026-07-25", lastActivity: "2026-08-07", responsible: "Michael Chen", timeInStage: 6.3 },
    { id: "PR-004", client: "Priya Nair", process: "Billing Support", stage: "Issue Resolution", status: "Completed", created: "2026-06-15", lastActivity: "2026-08-08", responsible: "Emily Davis", timeInStage: 0 },
    { id: "PR-005", client: "Sarah Jenkins", process: "Appointment Scheduling", stage: "Slot Selection", status: "Completed", created: "2026-06-01", lastActivity: "2026-08-05", responsible: "John Smith", timeInStage: 0 },
    { id: "PR-006", client: "Michael Chang", process: "Patient Intake", stage: "Insurance Verify", status: "Pending", created: "2026-07-10", lastActivity: "2026-08-11", responsible: "Sarah Johnson", timeInStage: 1.8 },
    { id: "PR-007", client: "Elena Rostova", process: "Follow-up Calls", stage: "Post-Visit Check", status: "Completed", created: "2026-05-20", lastActivity: "2026-08-02", responsible: "Lisa Anderson", timeInStage: 0 },
    { id: "PR-008", client: "David Miller", process: "Patient Intake", stage: "Schedule Appointment", status: "Pending", created: "2026-06-20", lastActivity: "2026-08-09", responsible: "Michael Chen", timeInStage: 3.6 },
    { id: "PR-009", client: "James Wilson", process: "Follow-up Calls", stage: "Medication Reminder", status: "Completed", created: "2026-06-28", lastActivity: "2026-07-25", responsible: "Emily Davis", timeInStage: 0 },
    { id: "PR-010", client: "Emma Brown", process: "Appointment Scheduling", stage: "Confirmation", status: "Failed", created: "2026-07-22", lastActivity: "2026-08-01", responsible: "Sarah Johnson", timeInStage: 5.2 },
  ],
};

const INITIAL_REPORTS: ReportDefinition[] = [
  {
    id: "rep-1",
    name: "Revenue & Invoicing Overview",
    type: "template",
    dataSource: "revenue",
    lastRun: "2026-08-12 10:15 AM",
    description: "Total invoiced, collected revenue, outstanding balances & breakdown by service",
    templateKey: "revenue_invoicing",
    viewType: "table_chart",
    chartType: "bar",
  },
  {
    id: "rep-2",
    name: "Call Performance Metrics",
    type: "template",
    dataSource: "calls",
    lastRun: "2026-08-11 04:30 PM",
    description: "Volume, average duration, call costs & sentiment distribution",
    templateKey: "call_performance",
    viewType: "table_chart",
    chartType: "bar",
  },
  {
    id: "rep-3",
    name: "Appointments & Bookings",
    type: "template",
    dataSource: "appointments",
    lastRun: "2026-08-10 09:00 AM",
    description: "Booked, completed, cancelled, and no-shows by service and staff",
    templateKey: "appointments_bookings",
    viewType: "table_chart",
    chartType: "pie",
  },
  {
    id: "rep-4",
    name: "Client Conversion Funnel",
    type: "template",
    dataSource: "clients",
    lastRun: "2026-08-09 02:00 PM",
    description: "Stage-by-stage client progress and conversion rates across active processes",
    templateKey: "client_funnel",
    viewType: "table_chart",
    chartType: "bar",
  },
  {
    id: "rep-5",
    name: "Team Performance Report",
    type: "template",
    dataSource: "team",
    lastRun: "2026-08-08 05:45 PM",
    description: "Calls handled, appointments booked, and conversion rates per team member",
    templateKey: "team_performance",
    viewType: "table",
  },
  {
    id: "rep-6",
    name: "Messaging & Chat Volume",
    type: "template",
    dataSource: "messaging",
    lastRun: "2026-08-07 11:20 AM",
    description: "Message volume, bot containment rate, and human takeover frequency",
    templateKey: "messaging_chat",
    viewType: "table_chart",
    chartType: "line",
  },
  {
    id: "rep-7",
    name: "Processes & Deal Stage Tracking",
    type: "template",
    dataSource: "processes",
    lastRun: "2026-08-14 09:30 AM",
    description: "Deal and process records, stage transitions, time in stage and assignments",
    templateKey: "process_tracking",
    viewType: "table_chart",
    chartType: "bar",
  },
];

const InvoiceContext = createContext<InvoiceContextType | undefined>(undefined);

export const InvoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getAllFields } = useFieldRegistry();

  const [invoices, setInvoices] = useState<ClientInvoice[]>(() => {
    const saved = localStorage.getItem("mantra_invoices_v1");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_INVOICES;
  });

  const [fieldRules, setFieldRules] = useState<InvoiceFieldRulesMap>(() => {
    const saved = localStorage.getItem("mantra_invoice_field_rules_v1");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_FIELD_RULES;
  });

  const [payments, setPayments] = useState<Payment[]>(() => {
    const saved = localStorage.getItem("mantra_payments_v1");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [
      {
        id: "pmt-init-1040",
        invoiceId: "INV-CL-1040",
        clientId: "c-1",
        amount: 162,
        method: "card_on_file",
        paymentType: "self_pay",
        paymentDate: "2026-05-14",
        note: "Initial payment on file",
        createdAt: "2026-05-14T14:30:00Z",
      },
    ];
  });

  const [reports, setReports] = useState<ReportDefinition[]>(() => {
    const saved = localStorage.getItem("mantra_reports_v1");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_REPORTS;
  });

  useEffect(() => {
    localStorage.setItem("mantra_invoices_v1", JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem("mantra_payments_v1", JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    localStorage.setItem("mantra_invoice_field_rules_v1", JSON.stringify(fieldRules));
  }, [fieldRules]);

  useEffect(() => {
    localStorage.setItem("mantra_reports_v1", JSON.stringify(reports));
  }, [reports]);

  const updateFieldRule = (rule: InvoiceFieldRule) => {
    setFieldRules((prev) => ({ ...prev, [rule.fieldKey]: rule }));
  };

  const createInvoiceFromAppointment = (
    appointment: {
      id?: string | number;
      clientId: string;
      clientName: string;
      clientEmail?: string;
      clientPhone?: string;
      title?: string;
    },
    lineItems: InvoiceLineItem[],
    options?: CreateInvoiceOptions
  ): ClientInvoice => {
    const subtotal = lineItems.reduce(
      (acc, item) => acc + (item.unitPrice * item.quantity - (item.discountAmount || 0)),
      0
    );

    let discount = options?.discountAmount || 0;
    if (options?.discountType === "percent" && options.discountValue !== undefined) {
      discount = (subtotal * options.discountValue) / 100;
    } else if (options?.discountValue !== undefined && options?.discountAmount === undefined) {
      discount = options.discountValue;
    }

    discount = Math.round(discount * 100) / 100;
    const taxSum = lineItems.reduce((acc, item) => {
      const itemSub = Math.max(0, item.unitPrice * item.quantity - (item.discountAmount || 0));
      const effectiveDisc = subtotal > 0 ? (discount * (itemSub / subtotal)) : 0;
      const taxableItem = Math.max(0, itemSub - effectiveDisc);
      const taxRate = item.taxPercent !== undefined ? item.taxPercent : 8;
      return acc + (taxableItem * taxRate) / 100;
    }, 0);
    const tax = Math.round(taxSum * 100) / 100;
    const total = Math.round((Math.max(0, subtotal - discount) + tax) * 100) / 100;

    const nextIdNumber = 1050 + invoices.length;
    const newInvoice: ClientInvoice = {
      id: `INV-CL-${nextIdNumber}`,
      clientId: String(appointment.clientId || "c-1"),
      clientName: appointment.clientName || "Client",
      clientEmail: appointment.clientEmail || "",
      clientPhone: appointment.clientPhone || "",
      appointmentId: appointment.id ? String(appointment.id) : undefined,
      appointmentTitle: appointment.title || "Appointment",
      status: "draft",
      currency: "$",
      lineItems,
      subtotal,
      discountType: options?.discountType || "amount",
      discountValue: options?.discountValue || discount,
      discountAmount: discount,
      taxAmount: tax,
      total,
      amountPaid: 0,
      createdAt: new Date().toISOString(),
      createdBy: options?.createdBy || "Admin User",
      dueDate: options?.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      paymentMode: options?.paymentMode,
      paymentLinkUrl: `https://pay.mantraassist.mock/inv-${nextIdNumber}`,
    };

    setInvoices((prev) => [newInvoice, ...prev]);

    // Log to activity engine
    if (newInvoice.clientId) {
      addActivityEntry({
        clientId: newInvoice.clientId,
        processId: "billing",
        processName: "Billing & Invoicing",
        type: "field_update",
        status: "success",
        refId: newInvoice.id,
        details: {
          primary: `Invoice ${newInvoice.id} created`,
          secondary: `Total: $${newInvoice.total.toFixed(2)} (${newInvoice.createdBy === "system" ? "Automated" : "Manual"})`,
        },
      });
    }

    return newInvoice;
  };

  const updateInvoice = (invoiceId: string, patch: Partial<ClientInvoice>) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === invoiceId ? { ...inv, ...patch } : inv))
    );
  };

  const deleteInvoice = (invoiceId: string) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
  };

  const updateInvoiceStatus = (invoiceId: string, status: InvoiceStatus) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === invoiceId ? { ...inv, status } : inv))
    );
  };

  const sendInvoice = (invoiceId: string, channel: "whatsapp" | "sms" | "email" = "whatsapp") => {
    const now = new Date().toISOString();
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoiceId) {
          const updated: ClientInvoice = {
            ...inv,
            status: inv.status === "draft" ? "sent" : inv.status,
            sentAt: now,
            sentVia: channel,
          };

          if (updated.clientId) {
            addActivityEntry({
              clientId: updated.clientId,
              processId: "billing",
              processName: "Billing & Invoicing",
              type: channel,
              status: "success",
              refId: updated.id,
              direction: "outbound",
              details: {
                primary: `Invoice ${updated.id} sent via ${channel.toUpperCase()}`,
                secondary: `Payment link: ${updated.paymentLinkUrl}`,
              },
            });
          }

          return updated;
        }
        return inv;
      })
    );
  };

  const simulatePayment = (invoiceId: string) => {
    const now = new Date().toISOString();
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoiceId) {
          const updated: ClientInvoice = {
            ...inv,
            status: "paid",
            paidAt: now,
          };

          if (updated.clientId) {
            const modeText = updated.paymentMode ? ` via ${updated.paymentMode}` : "";
            addActivityEntry({
              clientId: updated.clientId,
              processId: "billing",
              processName: "Billing & Invoicing",
              type: "field_update",
              status: "success",
              refId: updated.id,
              details: {
                primary: `Invoice ${updated.id} marked Paid${modeText}`,
                secondary: `Amount: $${updated.total.toFixed(2)} received${modeText}`,
              },
            });
          }

          return updated;
        }
        return inv;
      })
    );
  };

  const recordPayment = (paymentDataList: Omit<Payment, "id" | "createdAt">[]) => {
    const now = new Date().toISOString();
    const createdPayments: Payment[] = paymentDataList.map((p, idx) => ({
      ...p,
      id: `pmt-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: now,
    }));

    setPayments((prev) => [...createdPayments, ...prev]);

    setInvoices((prev) =>
      prev.map((inv) => {
        const matchPmt = createdPayments.find((p) => p.invoiceId === inv.id);
        if (!matchPmt) return inv;

        const newAmountPaid = (inv.amountPaid || 0) + matchPmt.amount;
        const isPaidFull = newAmountPaid >= inv.total;
        const newStatus: InvoiceStatus = isPaidFull
          ? "paid"
          : newAmountPaid > 0
          ? "partial"
          : inv.status;

        const updated: ClientInvoice = {
          ...inv,
          amountPaid: newAmountPaid,
          status: newStatus,
          paymentType: matchPmt.paymentType,
          paidAt: isPaidFull ? now : inv.paidAt,
          paymentMode: matchPmt.method === "card_on_file"
            ? "Card on File"
            : matchPmt.method === "cash"
            ? "Cash"
            : matchPmt.method === "check"
            ? "Check"
            : matchPmt.method === "external_terminal"
            ? "External Terminal"
            : matchPmt.method === "payment_link"
            ? "Payment Link"
            : inv.paymentMode,
        };

        if (updated.clientId) {
          const methodFormatted = matchPmt.method.replace("_", " ");
          addActivityEntry({
            clientId: updated.clientId,
            processId: "billing",
            processName: "Billing & Invoicing",
            type: "field_update",
            status: "success",
            refId: updated.id,
            details: {
              primary: `Invoice ${updated.id}: $${matchPmt.amount.toFixed(2)} recorded via ${methodFormatted}`,
              secondary: `Status: ${newStatus.toUpperCase()} · Remaining: $${Math.max(0, updated.total - newAmountPaid).toFixed(2)}`,
            },
          });
        }

        return updated;
      })
    );
  };

  const getPaymentsByInvoice = (invoiceId: string) => {
    return payments.filter((p) => p.invoiceId === invoiceId);
  };

  const getPaymentsByClient = (clientId: string) => {
    return payments.filter((p) => p.clientId === clientId);
  };

  const voidInvoice = (invoiceId: string) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoiceId) {
          const updated = { ...inv, status: "void" as InvoiceStatus };
          if (updated.clientId) {
            addActivityEntry({
              clientId: updated.clientId,
              processId: "billing",
              processName: "Billing & Invoicing",
              type: "field_update",
              status: "success",
              refId: updated.id,
              details: {
                primary: `Invoice ${updated.id} voided`,
                secondary: `Status updated to VOID`,
              },
            });
          }
          return updated;
        }
        return inv;
      })
    );
  };

  const getInvoiceById = (invoiceId: string) => {
    return invoices.find((inv) => inv.id === invoiceId);
  };

  const getInvoicesByClient = (clientId: string) => {
    return invoices.filter((inv) => inv.clientId === clientId);
  };

  const saveReport = (report: Omit<ReportDefinition, "id" | "lastRun"> & { id?: string }): ReportDefinition => {
    const existing = report.id ? reports.find(r => r.id === report.id) : null;
    const newReport: ReportDefinition = {
      ...report,
      id: report.id || `rep-custom-${Date.now()}`,
      lastRun: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };
    setReports((prev) => existing ? prev.map(r => r.id === report.id ? newReport : r) : [newReport, ...prev]);
    return newReport;
  };

  const deleteReport = (reportId: string) => {
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  const getReportData = (dataSource: ReportDataSource, filters?: Record<string, any>) => {
    switch (dataSource) {
      case "revenue": {
        const totalInvoiced = invoices.filter(i => i.status !== "void").reduce((sum, i) => sum + i.total, 0);
        const totalCollected = invoices.filter(i => i.status === "paid").reduce((sum, i) => sum + i.total, 0);
        const totalOutstanding = invoices.filter(i => i.status === "sent" || i.status === "viewed" || i.status === "overdue").reduce((sum, i) => sum + i.total, 0);
        const overdueCount = invoices.filter(i => i.status === "overdue").length;

        // Breakdown by service
        const serviceMap: Record<string, number> = {};
        invoices.filter(i => i.status !== "void").forEach(inv => {
          inv.lineItems.forEach(item => {
            const name = item.description || "General Service";
            serviceMap[name] = (serviceMap[name] || 0) + item.unitPrice * item.quantity;
          });
        });

        const serviceBreakdown = Object.entries(serviceMap).map(([name, val]) => ({
          name,
          value: Math.round(val),
        }));

        // Monthly trend (mock 4 months)
        const trendData = [
          { month: "May 2026", invoiced: 820, collected: 750 },
          { month: "Jun 2026", invoiced: 1150, collected: 1020 },
          { month: "Jul 2026", invoiced: 1480, collected: 1210 },
          { month: "Aug 2026", invoiced: Math.round(totalInvoiced), collected: Math.round(totalCollected) },
        ];

        return {
          kpis: [
            { label: "Total Invoiced", value: `$${totalInvoiced.toFixed(2)}` },
            { label: "Total Collected", value: `$${totalCollected.toFixed(2)}` },
            { label: "Outstanding Balance", value: `$${totalOutstanding.toFixed(2)}` },
            { label: "Overdue Invoices", value: `${overdueCount}` },
          ],
          table: invoices.map(i => ({
            id: i.id,
            client: i.clientName,
            amount: `$${i.total.toFixed(2)}`,
            status: i.status,
            dueDate: i.dueDate,
            created: i.createdAt.split("T")[0],
            source: i.createdBy === "system" ? "Automated Flow" : "Manual Entry",
          })),
          chartData: trendData,
          pieData: serviceBreakdown,
        };
      }
      case "calls": {
        return {
          kpis: [
            { label: "Total Calls", value: "248" },
            { label: "Avg Duration", value: "3m 42s" },
            { label: "Success Rate", value: "91.2%" },
            { label: "Total AI Cost", value: "$42.15" },
          ],
          table: [
            { id: "call-101", client: "Sarah Jenkins", duration: "4m 12s", sentiment: "Positive", status: "Completed", cost: "$0.45" },
            { id: "call-102", client: "Michael Chang", duration: "2m 30s", sentiment: "Neutral", status: "Completed", cost: "$0.28" },
            { id: "call-103", client: "Elena Rostova", duration: "5m 18s", sentiment: "Positive", status: "Completed", cost: "$0.58" },
            { id: "call-104", client: "David Miller", duration: "1m 45s", sentiment: "Negative", status: "Handoff", cost: "$0.20" },
          ],
          chartData: [
            { month: "Mon", calls: 42, success: 38 },
            { month: "Tue", calls: 56, success: 52 },
            { month: "Wed", calls: 63, success: 58 },
            { month: "Thu", calls: 49, success: 44 },
            { month: "Fri", calls: 38, success: 34 },
          ],
        };
      }
      case "appointments": {
        return {
          kpis: [
            { label: "Total Booked", value: "38" },
            { label: "Completed", value: "24" },
            { label: "Cancelled", value: "4" },
            { label: "No-Shows", value: "2" },
          ],
          table: [
            { id: "appt-1", service: "Initial Consultation", client: "James Wilson", provider: "John Smith", date: "2026-05-12", status: "Scheduled" },
            { id: "appt-2", service: "Follow-up Visit", client: "Emma Brown", provider: "Sarah Johnson", date: "2026-05-12", status: "Scheduled" },
            { id: "appt-3", service: "Dental Cleaning", client: "Oliver Davis", provider: "Dr. Robert Martinez", date: "2026-05-13", status: "Completed" },
          ],
          chartData: [
            { month: "Initial Consultation", count: 16 },
            { month: "Follow-up Visit", count: 12 },
            { month: "Dental Cleaning", count: 6 },
            { month: "X-Ray Imaging", count: 4 },
          ],
        };
      }
      case "clients": {
        return {
          kpis: [
            { label: "Total Clients", value: "42" },
            { label: "Active Deals", value: "18" },
            { label: "Conversion Rate", value: "64.5%" },
            { label: "Avg Lifetime Value", value: "$340" },
          ],
          table: [
            { client: "Sarah Jenkins", stage: "Scheduled", process: "Patient Intake", value: "$162.00", lastContact: "Today" },
            { client: "Michael Chang", stage: "Confirmed", process: "Appointment Scheduling", value: "$81.00", lastContact: "Yesterday" },
            { client: "Elena Rostova", stage: "Insurance Verification", process: "Patient Intake", value: "$108.00", lastContact: "3 days ago" },
          ],
          chartData: [
            { month: "Initial Contact", count: 14 },
            { month: "Verification", count: 10 },
            { month: "Intake Form", count: 8 },
            { month: "Scheduled", count: 10 },
          ],
        };
      }
      case "team": {
        return {
          kpis: [
            { label: "Active Members", value: "6" },
            { label: "Calls Handled", value: "184" },
            { label: "Appts Booked", value: "32" },
            { label: "Avg Resolution", value: "4m 10s" },
          ],
          table: [
            { member: "John Smith", role: "Senior Agent", calls: 48, appts: 12, rating: "4.9" },
            { member: "Sarah Johnson", role: "Agent", calls: 42, appts: 9, rating: "4.8" },
            { member: "Dr. Robert Martinez", role: "Practitioner", calls: 18, appts: 6, rating: "5.0" },
            { member: "Lisa Anderson", role: "Agent", calls: 36, appts: 5, rating: "4.7" },
          ],
          chartData: [
            { month: "John Smith", count: 48 },
            { month: "Sarah Johnson", count: 42 },
            { month: "Lisa Anderson", count: 36 },
            { month: "Dr. Martinez", count: 18 },
          ],
        };
      }
      case "messaging": {
        return {
          kpis: [
            { label: "Total Messages", value: "1,420" },
            { label: "WhatsApp Outbound", value: "980" },
            { label: "Bot Containment", value: "88.4%" },
            { label: "Human Takeovers", value: "12" },
          ],
          table: [
            { channel: "WhatsApp", total: "980", botHandled: "870", humanHandled: "110", avgTime: "1.2s" },
            { channel: "SMS", total: "310", botHandled: "290", humanHandled: "20", avgTime: "0.8s" },
            { channel: "Email", total: "130", botHandled: "100", humanHandled: "30", avgTime: "4.5s" },
          ],
          chartData: [
            { month: "Mon", messages: 240 },
            { month: "Tue", messages: 310 },
            { month: "Wed", messages: 380 },
            { month: "Thu", messages: 290 },
            { month: "Fri", messages: 200 },
          ],
        };
      }
      case "processes": {
        const procRows = MOCK_REPORT_ROWS.processes || [];
        const completedCount = procRows.filter((p) => p.status === "Completed").length;
        const pendingCount = procRows.filter((p) => p.status === "Pending").length;
        const failedCount = procRows.filter((p) => p.status === "Failed").length;
        const avgTimeInStage =
          procRows.reduce((sum, p) => sum + (p.timeInStage || 0), 0) / (procRows.length || 1);

        return {
          kpis: [
            { label: "Active Deals/Processes", value: `${procRows.length}` },
            { label: "Completed Rate", value: `${Math.round((completedCount / procRows.length) * 100)}%` },
            { label: "Pending Reviews", value: `${pendingCount}` },
            { label: "Avg Time in Stage", value: `${avgTimeInStage.toFixed(1)} days` },
          ],
          table: procRows.map((p) => ({
            id: p.id,
            client: p.client,
            process: p.process,
            stage: p.stage,
            status: p.status,
            timeInStage: `${p.timeInStage} days`,
            created: p.created,
            responsible: p.responsible,
          })),
          chartData: [
            { name: "Patient Intake", count: 4, total: 11.9 },
            { name: "Insurance Verify", count: 2, total: 8.1 },
            { name: "Appt Scheduling", count: 2, total: 5.2 },
            { name: "Follow-up Calls", count: 2, total: 0 },
          ],
        };
      }
      default:
        return { kpis: [], table: [], chartData: [] };
    }
  };

  const getReportRows = (dataSource: ReportDataSource): Record<string, any>[] => {
    if (dataSource === "revenue") {
      return invoices
        .filter((i) => i.status !== "void")
        .map((i) => ({
          id: i.id,
          client: i.clientName,
          amount: i.total,
          status: i.status,
          dueDate: i.dueDate,
          created: i.createdAt.split("T")[0],
          service: i.lineItems.map((l) => l.description).join(", ") || "General Service",
          paymentMode: i.paymentMode || "",
        }));
    }

    if (dataSource === "clients") {
      const custom = getAllFields("client");
      const base = (MOCK_REPORT_ROWS.clients || []).map((row) => ({ ...row }));
      // Attach mock values for client custom registry fields (count-only dimension)
      custom.forEach((f, idx) => {
        if (f.key === "name" || f.key === "status" || f.key === "processes") return;
        base.forEach((row, i) => {
          row[f.key] = `${f.label} ${((i + idx) % 3) + 1}`;
        });
      });
      return base;
    }

    return (MOCK_REPORT_ROWS[dataSource] || []).map((row) => ({ ...row }));
  };

  return (
    <InvoiceContext.Provider
      value={{
        invoices,
        payments,
        fieldRules,
        updateFieldRule,
        createInvoiceFromAppointment,
        updateInvoice,
        deleteInvoice,
        updateInvoiceStatus,
        sendInvoice,
        simulatePayment,
        recordPayment,
        getPaymentsByInvoice,
        getPaymentsByClient,
        voidInvoice,
        getInvoiceById,
        getInvoicesByClient,
        getReportData,
        getReportRows,
        reports,
        saveReport,
        deleteReport,
      }}
    >
      {children}
    </InvoiceContext.Provider>
  );
};

export const useInvoices = () => {
  const ctx = useContext(InvoiceContext);
  if (!ctx) {
    throw new Error("useInvoices must be used within an InvoiceProvider");
  }
  return ctx;
};
