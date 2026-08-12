export type InvoiceStatus = "draft" | "sent" | "viewed" | "paid" | "overdue" | "void";

export interface InvoiceLineItem {
  id: string;
  source: "service" | "manual";
  serviceId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
}

export interface ClientInvoice {
  id: string;                 // e.g. "INV-CL-1042"
  clientId: string;
  clientName: string;         // denormalized for easy display
  clientEmail?: string;
  clientPhone?: string;
  appointmentId?: string;     // null if standalone/manual invoice
  appointmentTitle?: string;
  status: InvoiceStatus;
  currency: string;           // default "$"
  lineItems: InvoiceLineItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  createdAt: string;
  createdBy: "system" | string;   // "system" = call-flow/automated, else a user id/name
  dueDate: string;
  sentAt?: string;
  sentVia?: "whatsapp" | "sms" | "email";
  paidAt?: string;
  paymentLinkUrl?: string;    // e.g. "https://pay.mantraassist.mock/inv-1042"
}

export interface MockService {
  id: string;
  name: string;
  description: string;
  duration: number; // minutes
  price: number;
  category: string;
  isActive: boolean;
}

export type ReportDataSource = "calls" | "appointments" | "revenue" | "clients" | "team" | "messaging";

export interface ReportDefinition {
  id: string;
  name: string;
  type: "template" | "custom";
  dataSource: ReportDataSource;
  lastRun: string;
  description?: string;
  templateKey?: string; // e.g. "call_performance", "appointments_bookings", "revenue_invoicing", "client_funnel", "team_performance", "messaging_chat"
  selectedFields?: string[];
  fieldCalculations?: Record<string, "sum" | "avg" | "count" | "min" | "max">;
  reportingPeriod?: {
    type: "this_month" | "last_month" | "this_week" | "custom";
    customDays?: number;
  };
  calculatedColumns?: Array<{
    id: string;
    field: string;
    func: "sum" | "avg" | "count" | "min" | "max";
    label?: string;
  }>;
  sortBy?: {
    field: string;
    direction: "asc" | "desc";
  };
  filterConditions?: {
    matchType: "AND" | "OR";
    conditions: Array<{
      id: string;
      field: string;
      operator: "equals" | "contains" | "gt" | "lt";
      value: string;
    }>;
  };
  showChart?: boolean;
  sharedWith?: string[];
  filters?: Record<string, any>;
  viewType?: "table" | "table_chart";
  chartType?: "bar" | "line" | "pie";
}
