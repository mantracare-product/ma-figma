import React, { createContext, useContext, useState, useEffect } from "react";
import { ClientInvoice, InvoiceLineItem, InvoiceStatus, ReportDefinition, ReportDataSource } from "../types/invoiceTypes";
import { addActivityEntry } from "../../lib/activityLog";
import { MOCK_SERVICES } from "../../lib/mockServicesData";

interface CreateInvoiceOptions {
  appointmentId?: string;
  appointmentTitle?: string;
  createdBy?: "system" | string;
  discountAmount?: number;
  dueDate?: string;
}

interface InvoiceContextType {
  invoices: ClientInvoice[];
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
  voidInvoice: (invoiceId: string) => void;
  getInvoiceById: (invoiceId: string) => ClientInvoice | undefined;
  getInvoicesByClient: (clientId: string) => ClientInvoice[];
  getReportData: (dataSource: ReportDataSource, filters?: Record<string, any>, groupBy?: string) => any;
  reports: ReportDefinition[];
  saveReport: (report: Omit<ReportDefinition, "id" | "lastRun"> & { id?: string }) => ReportDefinition;
  deleteReport: (reportId: string) => void;
}

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
    lineItems: [
      { id: "li-1", source: "service", serviceId: "srv-1", description: "Initial Consultation", quantity: 1, unitPrice: 150 },
    ],
    subtotal: 150,
    discountAmount: 0,
    taxAmount: 12,
    total: 162,
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
    lineItems: [
      { id: "li-2", source: "service", serviceId: "srv-2", description: "Follow-up Visit", quantity: 1, unitPrice: 75 },
    ],
    subtotal: 75,
    discountAmount: 0,
    taxAmount: 6,
    total: 81,
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
    createdAt: "2026-08-08T13:10:00Z",
    createdBy: "Admin User",
    dueDate: "2026-08-22",
    sentAt: "2026-08-08T13:12:00Z",
    sentVia: "sms",
    paymentLinkUrl: "https://pay.mantraassist.mock/inv-1049",
  },
];

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
];

const InvoiceContext = createContext<InvoiceContextType | undefined>(undefined);

export const InvoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [invoices, setInvoices] = useState<ClientInvoice[]>(() => {
    const saved = localStorage.getItem("mantra_invoices_v1");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_INVOICES;
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
    localStorage.setItem("mantra_reports_v1", JSON.stringify(reports));
  }, [reports]);

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
    const subtotal = lineItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
    const discount = options?.discountAmount || 0;
    const taxableSubtotal = Math.max(0, subtotal - discount);
    const tax = Math.round(taxableSubtotal * 0.08 * 100) / 100;
    const total = Math.round((taxableSubtotal + tax) * 100) / 100;

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
      discountAmount: discount,
      taxAmount: tax,
      total,
      createdAt: new Date().toISOString(),
      createdBy: options?.createdBy || "Admin User",
      dueDate: options?.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
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
            addActivityEntry({
              clientId: updated.clientId,
              processId: "billing",
              processName: "Billing & Invoicing",
              type: "field_update",
              status: "success",
              refId: updated.id,
              details: {
                primary: `Invoice ${updated.id} paid`,
                secondary: `Amount: $${updated.total.toFixed(2)} received`,
              },
            });
          }

          return updated;
        }
        return inv;
      })
    );
  };

  const voidInvoice = (invoiceId: string) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === invoiceId ? { ...inv, status: "void" } : inv))
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
      default:
        return { kpis: [], table: [], chartData: [] };
    }
  };

  return (
    <InvoiceContext.Provider
      value={{
        invoices,
        createInvoiceFromAppointment,
        updateInvoice,
        deleteInvoice,
        updateInvoiceStatus,
        sendInvoice,
        simulatePayment,
        voidInvoice,
        getInvoiceById,
        getInvoicesByClient,
        getReportData,
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
