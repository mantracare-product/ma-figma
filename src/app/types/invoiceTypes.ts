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
  processId?: string;         // Links to invoice process definition
  currentStageId?: string;    // Links to invoice process stage
  statusLabel?: string;       // Computed/read-only status label for display and reports
  status?: InvoiceStatus;     // Deprecated in favor of currentStageId and stage.systemCategory
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
  issueDate?: string;
  date?: string;
  paymentMethod?: string;
  billingAddress?: string;
  tax?: number;
  discount?: number;
}

export type InvoicePaymentRecord = Payment & {
  date?: string;
  method?: string;
  reference?: string;
  status?: string;
};

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
  cptCode?: string;
  isActive: boolean;
  tax?: number;
}

export type ReportDataSource = "calls" | "appointments" | "revenue" | "clients" | "team" | "messaging" | "processes";

export interface ReportBucketCase {
  id: string;
  operator: "between" | "equals" | "gt" | "lt" | "contains";
  val1: string | number;
  val2?: string | number;
  label: string;
}

export interface ReportBucketRule {
  id: string;
  name: string; // Dimension name, e.g. "Call Timing"
  targetField: string; // Field to evaluate, e.g. "time", "duration"
  cases: ReportBucketCase[];
  elseLabel: string; // Default label if no case matches, e.g. "After Hours"
}

export interface ReportMetric {
  field?: string;
  aggregation: "count" | "sum" | "avg" | "min" | "max" | "distinct";
  label?: string;
}

export interface ReportFilterCondition {
  id: string;
  field: string;
  operator: "equals" | "contains" | "gt" | "lt" | "between";
  value: string;
  logic?: "AND" | "OR";
}

export interface ReportDefinition {
  id: string;
  name: string;
  type: "template" | "custom";
  dataSource: ReportDataSource;
  lastRun: string;
  description?: string;
  templateKey?: string; // e.g. "calls_working_hours", "weekly_1_2_min_calls", "appts_service_vs_day", "process_clients_distribution", "client_appts_count"
  selectedFields?: string[];
  fieldCalculations?: Record<string, "sum" | "avg" | "count" | "min" | "max">;
  reportingPeriod?: {
    type: "all" | "today" | "yesterday" | "this_week" | "last_7_days" | "this_month" | "last_month" | "last_30" | "last_90" | "custom";
    customDays?: number;
    startDate?: string;
    endDate?: string;
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
    conditions: ReportFilterCondition[];
  };
  showChart?: boolean;
  sharedWith?: string[];
  filters?: Record<string, any>;
  viewType?: "table" | "table_chart";
  chartType?: "bar" | "stacked_bar" | "horizontal_bar" | "line" | "area" | "pie" | "donut" | "table_only";
  groupBy?: string; // Primary dimension (X-Axis or Pie segments)
  timeGrouping?: "none" | "day" | "dayOfWeek" | "week" | "month" | "hour";
  breakdownBy?: string; // Secondary dimension for grouped / stacked series
  metric?: ReportMetric;
  bucketRules?: ReportBucketRule[];
  activeBucketRuleId?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  yAxisMode?: "count" | "field";
}

