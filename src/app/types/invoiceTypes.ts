export type InvoiceStatus = "draft" | "sent" | "viewed" | "partial" | "paid" | "overdue" | "void";


export interface InvoiceLineItem {
  id: string;
  source: "service" | "manual";
  serviceId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  taxPercent?: number;
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
  discountType?: "amount" | "percent";
  discountValue?: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  amountPaid: number;         // sum of all Payment records against this invoice
  paymentType?: "self_pay" | "insurance" | "write_off";
  createdAt: string;
  createdBy: "system" | string;   // "system" = call-flow/automated, else a user id/name
  dueDate: string;
  sentAt?: string;
  sentVia?: "whatsapp" | "sms" | "email";
  paidAt?: string;
  paymentLinkUrl?: string;    // e.g. "https://pay.mantraassist.mock/inv-1042"
  paymentMode?: string;       // e.g. "Bank Transfer", "Cash", "Card", "Insurance-EMI"
}

export interface Payment {
  id: string;
  invoiceId: string; // "UNLINKED" or invoice id
  clientId: string;
  amount: number;
  method: "card_on_file" | "cash" | "check" | "external_terminal" | "payment_link" | "bank_transfer" | "credit_balance";
  paymentType: "self_pay" | "insurance" | "write_off";
  paymentDate: string;   // ISO date
  note?: string;
  receiptNumber?: string;
  receiptFileName?: string;
  receiptUrl?: string;
  appliedCreditAmount?: number;
  isUnlinked?: boolean;
  insurancePayer?: string;
  claimRefNumber?: string;
  writeOffReason?: string;
  createdAt: string;
}

export type RequiredStage = "draft" | "sent" | "viewed" | "paid" | "never";

export interface InvoiceFieldRule {
  fieldKey: string;
  fieldName: string;
  requiredAtStage: RequiredStage;
  showAlways: boolean;
  enableTooltip: boolean;
  visibleToUserIds: string[];
}

export type InvoiceFieldRulesMap = Record<string, InvoiceFieldRule>;

export interface MockService {
  id: string;
  name: string;
  description: string;
  duration: number; // minutes
  price: number;
  category: string;
  isActive: boolean;
  tax?: number;
}

export type ReportDataSource = "calls" | "appointments" | "revenue" | "clients" | "team" | "messaging" | "processes";

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
    matchType?: "AND" | "OR";
    conditions: Array<{
      id: string;
      field: string;
      operator: "equals" | "contains" | "gt" | "lt";
      value: string;
      logic?: "AND" | "OR";
    }>;
  };
  showChart?: boolean;
  sharedWith?: string[];
  filters?: Record<string, any>;
  viewType?: "table" | "table_chart";
  chartType?: "bar" | "line" | "pie";
}
