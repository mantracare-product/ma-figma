/**
 * invoiceService.ts
 * Path: src/lib/invoiceService.ts
 *
 * Single "one-door" service for invoice lifecycle management:
 * - createInvoice
 * - createInvoiceFromAppointment (strictly idempotent per appointment)
 * - sendInvoice
 * - recordPayment
 * - checkOverdueInvoices
 * - voidInvoice
 *
 * Emits invoice.* events via eventBus and synchronizes currentStageId
 * with the canonical invoice process stages.
 */

import { eventBus } from "./eventBus";
import { logStageMove } from "./useAutomationStore";
import { DEFAULT_ENTITY_PROCESSES, getStoredProcesses, Process, Stage } from "./useProcessStore";
import { ClientInvoice, InvoiceLineItem, InvoiceStatus, Payment } from "../app/types/invoiceTypes";
import { addActivityEntry } from "./activityLog";

export interface CreateInvoiceOptions {
  appointmentId?: string;
  appointmentTitle?: string;
  createdBy?: "system" | string;
  discountType?: "amount" | "percent";
  discountValue?: number;
  discountAmount?: number;
  dueDate?: string;
  paymentMode?: string;
}

const INVOICES_STORAGE_KEY = "mantra_invoices_v1";
const PAYMENTS_STORAGE_KEY = "mantra_payments_v1";
const INVOICES_CHANGE_EVENT = "mantra_invoices_changed";

const INITIAL_INVOICES: ClientInvoice[] = [
  {
    id: "INV-CL-1040",
    clientId: "c-1",
    clientName: "James Wilson",
    clientEmail: "james.w@example.com",
    clientPhone: "+1 (555) 123-4567",
    appointmentId: "1",
    appointmentTitle: "Initial Consultation",
    currentStageId: "inv-5",
    statusLabel: "Paid",
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
    currentStageId: "inv-2",
    statusLabel: "Sent",
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
    createdBy: "Admin User",
    dueDate: "2026-05-26",
    sentAt: "2026-05-12T10:35:00Z",
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
    currentStageId: "inv-1",
    statusLabel: "Draft",
    status: "draft",
    currency: "$",
    lineItems: [
      { id: "li-3", source: "service", serviceId: "srv-4", description: "X-Ray Imaging", quantity: 1, unitPrice: 80 },
    ],
    subtotal: 80,
    discountAmount: 0,
    taxAmount: 6.4,
    total: 86.4,
    amountPaid: 0,
    createdAt: "2026-05-13T14:00:00Z",
    createdBy: "Admin User",
    dueDate: "2026-05-27",
    paymentLinkUrl: "https://pay.mantraassist.mock/inv-1042",
  },
];

class InvoiceService {
  private getInvoiceProcess(): Process {
    const processes = getStoredProcesses();
    const invProc = processes.find((p) => p.entityType === "invoice");
    return invProc || DEFAULT_ENTITY_PROCESSES.invoice;
  }

  private findStageByCategory(category: string): Stage | undefined {
    const proc = this.getInvoiceProcess();
    return proc.stages.find((s) => s.systemCategory === category) || proc.stages[0];
  }

  private findStageById(stageId: string): Stage | undefined {
    const proc = this.getInvoiceProcess();
    return proc.stages.find((s) => s.id === stageId);
  }

  public getInvoices(): ClientInvoice[] {
    if (typeof window === "undefined") return INITIAL_INVOICES;
    try {
      const raw = localStorage.getItem(INVOICES_STORAGE_KEY);
      if (!raw) {
        this.saveInvoices(INITIAL_INVOICES);
        return INITIAL_INVOICES;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      return INITIAL_INVOICES;
    } catch {
      return INITIAL_INVOICES;
    }
  }

  public getInvoiceById(id: string): ClientInvoice | undefined {
    const all = this.getInvoices();
    return all.find((i) => i.id === id);
  }

  public saveInvoices(invoices: ClientInvoice[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(invoices));
      window.dispatchEvent(new CustomEvent(INVOICES_CHANGE_EVENT, { detail: invoices }));
    } catch (e) {
      console.error("[InvoiceService] Failed to save invoices:", e);
    }
  }

  public subscribe(listener: (invoices: ClientInvoice[]) => void): () => void {
    if (typeof window === "undefined") return () => {};
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<ClientInvoice[]>;
      listener(customEvent.detail || this.getInvoices());
    };
    window.addEventListener(INVOICES_CHANGE_EVENT, handler);
    return () => window.removeEventListener(INVOICES_CHANGE_EVENT, handler);
  }

  /**
   * Create an invoice from an appointment (One Door)
   * STRICT IDEMPOTENCY: If an invoice for this appointment already exists (and is not void),
   * returns the existing invoice without creating duplicates!
   */
  public createInvoiceFromAppointment(
    appointment: {
      id?: string | number;
      clientId: string;
      clientName: string;
      clientEmail?: string;
      clientPhone?: string;
      title?: string;
    },
    lineItems: InvoiceLineItem[] = [],
    options?: CreateInvoiceOptions
  ): { invoice: ClientInvoice; alreadyExisted: boolean } {
    const all = this.getInvoices();

    // 1. Idempotency Check: search by appointmentId
    if (appointment.id) {
      const apptIdStr = String(appointment.id);
      const existing = all.find(
        (inv) => inv.appointmentId === apptIdStr && inv.status !== "void" && inv.currentStageId !== "inv-7"
      );
      if (existing) {
        return { invoice: existing, alreadyExisted: true };
      }
    }

    // 2. Calculations
    const items = lineItems.length > 0
      ? lineItems
      : [{
          id: `li-auto-${Date.now()}`,
          source: "service" as const,
          description: appointment.title || "Consultation Service",
          quantity: 1,
          unitPrice: 150,
        }];

    const subtotal = items.reduce(
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

    const taxSum = items.reduce((acc, item) => {
      const itemSub = Math.max(0, item.unitPrice * item.quantity - (item.discountAmount || 0));
      const effectiveDisc = subtotal > 0 ? (discount * (itemSub / subtotal)) : 0;
      const taxableItem = Math.max(0, itemSub - effectiveDisc);
      const taxRate = item.taxPercent !== undefined ? item.taxPercent : 8;
      return acc + (taxableItem * taxRate) / 100;
    }, 0);
    const tax = Math.round(taxSum * 100) / 100;
    const total = Math.round((Math.max(0, subtotal - discount) + tax) * 100) / 100;

    const nextNumber = 1050 + all.length;
    const draftStage = this.findStageByCategory("draft") || { id: "inv-1", name: "Draft" };
    const proc = this.getInvoiceProcess();

    const newInvoice: ClientInvoice = {
      id: `INV-CL-${nextNumber}`,
      clientId: String(appointment.clientId || "c-1"),
      clientName: appointment.clientName || "Client",
      clientEmail: appointment.clientEmail || "",
      clientPhone: appointment.clientPhone || "",
      appointmentId: appointment.id ? String(appointment.id) : undefined,
      appointmentTitle: appointment.title || "Scheduled Appointment",
      currentStageId: draftStage.id,
      statusLabel: draftStage.name,
      status: "draft",
      currency: "$",
      lineItems: items,
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
      paymentLinkUrl: `https://pay.mantraassist.mock/inv-${nextNumber}`,
    };

    // 3. Save
    this.saveInvoices([newInvoice, ...all]);

    // 4. Log Stage Move
    logStageMove({
      orgId: "default",
      recordType: "invoice",
      recordId: newInvoice.id,
      fromStageId: undefined,
      toStageId: draftStage.id,
      toStageName: draftStage.name,
      processId: proc.id,
      processName: proc.name,
      cause: {
        type: options?.createdBy === "system" ? "rule" : "manual",
        ruleName: "Invoice Generated (Draft)",
      },
    });

    // 5. Emit event
    eventBus.emit("invoice.created", "invoice", newInvoice.id, newInvoice);

    // Activity log entry
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

    return { invoice: newInvoice, alreadyExisted: false };
  }

  /**
   * Send invoice (moves to Sent stage, emits invoice.sent)
   */
  public sendInvoice(
    invoiceId: string,
    channel: "whatsapp" | "sms" | "email" = "whatsapp"
  ): ClientInvoice | null {
    const all = this.getInvoices();
    const existing = all.find((i) => i.id === invoiceId);
    if (!existing) return null;

    const previousStageId = existing.currentStageId;
    const sentStage = this.findStageByCategory("sent") || { id: "inv-2", name: "Sent" };
    const proc = this.getInvoiceProcess();

    const updated: ClientInvoice = {
      ...existing,
      currentStageId: sentStage.id,
      statusLabel: sentStage.name,
      status: "sent",
      sentAt: new Date().toISOString(),
      sentVia: channel,
    };

    this.saveInvoices(all.map((i) => (i.id === invoiceId ? updated : i)));

    logStageMove({
      orgId: "default",
      recordType: "invoice",
      recordId: invoiceId,
      fromStageId: previousStageId,
      toStageId: sentStage.id,
      toStageName: sentStage.name,
      processId: proc.id,
      processName: proc.name,
      cause: { type: "manual", ruleName: `Invoice Sent via ${channel}` },
    });

    eventBus.emit("invoice.sent", "invoice", invoiceId, updated);

    return updated;
  }

  /**
   * Record payment (moves to Paid or Partially Paid stage, emits invoice.paid)
   */
  public recordPayment(
    invoiceId: string,
    amount: number,
    method: string = "card_on_file",
    note?: string
  ): { invoice: ClientInvoice; payment: Payment } | null {
    const all = this.getInvoices();
    const existing = all.find((i) => i.id === invoiceId);
    if (!existing) return null;

    const previousStageId = existing.currentStageId;
    const newAmountPaid = parseFloat(((existing.amountPaid || 0) + amount).toFixed(2));
    const isFullyPaid = newAmountPaid >= existing.total;

    const paidStage = this.findStageByCategory("paid") || { id: "inv-5", name: "Paid" };
    const partialStage = this.findStageByCategory("partially_paid") || { id: "inv-4", name: "Partially Paid" };
    const targetStage = isFullyPaid ? paidStage : partialStage;
    const proc = this.getInvoiceProcess();

    const updated: ClientInvoice = {
      ...existing,
      amountPaid: newAmountPaid,
      currentStageId: targetStage.id,
      statusLabel: targetStage.name,
      status: isFullyPaid ? "paid" : "partial",
      paidAt: isFullyPaid ? new Date().toISOString() : existing.paidAt,
    };

    this.saveInvoices(all.map((i) => (i.id === invoiceId ? updated : i)));

    const payment: Payment = {
      id: `pmt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      invoiceId,
      clientId: existing.clientId,
      amount,
      method: method as any,
      paymentType: "self_pay",
      paymentDate: new Date().toISOString().split("T")[0],
      note,
      receiptNumber: `REC-${invoiceId.replace("INV-CL-", "")}-${Math.floor(Math.random() * 90 + 10)}`,
      receiptFileName: `Receipt_${invoiceId}.pdf`,
      createdAt: new Date().toISOString(),
    };

    // Save payment record to payments storage
    try {
      const rawPmts = localStorage.getItem(PAYMENTS_STORAGE_KEY);
      const pmts: Payment[] = rawPmts ? JSON.parse(rawPmts) : [];
      localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify([payment, ...pmts]));
    } catch {}

    logStageMove({
      orgId: "default",
      recordType: "invoice",
      recordId: invoiceId,
      fromStageId: previousStageId,
      toStageId: targetStage.id,
      toStageName: targetStage.name,
      processId: proc.id,
      processName: proc.name,
      cause: {
        type: "manual",
        ruleName: isFullyPaid ? `Payment Completed ($${amount.toFixed(2)})` : `Partial Payment Recorded ($${amount.toFixed(2)})`,
      },
    });

    if (isFullyPaid) {
      eventBus.emit("invoice.paid", "invoice", invoiceId, { ...updated, payment });
    }

    addActivityEntry({
      clientId: existing.clientId,
      processId: "billing",
      processName: "Billing & Invoicing",
      type: "payment",
      status: "success",
      refId: invoiceId,
      details: {
        primary: `Payment of $${amount.toFixed(2)} received for ${invoiceId}`,
        secondary: `Status: ${targetStage.name} | Total balance: $${(existing.total - newAmountPaid).toFixed(2)} remaining`,
      },
    });

    return { invoice: updated, payment };
  }

  /**
   * Check and transition overdue invoices
   */
  public checkOverdueInvoices(): ClientInvoice[] {
    const all = this.getInvoices();
    const today = new Date().toISOString().split("T")[0];
    const overdueStage = this.findStageByCategory("overdue") || { id: "inv-6", name: "Overdue" };
    const proc = this.getInvoiceProcess();

    const updatedList: ClientInvoice[] = [];
    const modifiedInvoices = all.map((inv) => {
      if (
        inv.dueDate &&
        inv.dueDate < today &&
        inv.status !== "paid" &&
        inv.status !== "void" &&
        inv.currentStageId !== overdueStage.id
      ) {
        const previousStageId = inv.currentStageId;
        const updated: ClientInvoice = {
          ...inv,
          currentStageId: overdueStage.id,
          statusLabel: overdueStage.name,
          status: "overdue",
        };
        updatedList.push(updated);

        logStageMove({
          orgId: "default",
          recordType: "invoice",
          recordId: inv.id,
          fromStageId: previousStageId,
          toStageId: overdueStage.id,
          toStageName: overdueStage.name,
          processId: proc.id,
          processName: proc.name,
          cause: { type: "rule", ruleName: `Invoice Past Due Date (${inv.dueDate})` },
        });

        eventBus.emit("invoice.overdue", "invoice", inv.id, updated);

        return updated;
      }
      return inv;
    });

    if (updatedList.length > 0) {
      this.saveInvoices(modifiedInvoices);
    }

    return updatedList;
  }

  /**
   * Void an invoice
   */
  public voidInvoice(invoiceId: string): ClientInvoice | null {
    const all = this.getInvoices();
    const existing = all.find((i) => i.id === invoiceId);
    if (!existing) return null;

    const previousStageId = existing.currentStageId;
    const voidStage = this.findStageByCategory("void") || { id: "inv-7", name: "Void" };
    const proc = this.getInvoiceProcess();

    const updated: ClientInvoice = {
      ...existing,
      currentStageId: voidStage.id,
      statusLabel: voidStage.name,
      status: "void",
    };

    this.saveInvoices(all.map((i) => (i.id === invoiceId ? updated : i)));

    logStageMove({
      orgId: "default",
      recordType: "invoice",
      recordId: invoiceId,
      fromStageId: previousStageId,
      toStageId: voidStage.id,
      toStageName: voidStage.name,
      processId: proc.id,
      processName: proc.name,
      cause: { type: "manual", ruleName: "Invoice Voided" },
    });

    eventBus.emit("invoice.voided", "invoice", invoiceId, updated);

    return updated;
  }

  /**
   * Move invoice to a specific stage ID directly
   */
  public moveToStage(invoiceId: string, stageId: string, cause?: { type: any; ruleName?: string }): ClientInvoice {
    const all = this.getInvoices();
    const existing = all.find((i) => i.id === invoiceId);
    if (!existing) throw new Error(`[InvoiceService] Invoice ${invoiceId} not found.`);

    const targetStage = this.findStageById(stageId);
    if (!targetStage) throw new Error(`[InvoiceService] Stage ${stageId} not found.`);

    const previousStageId = existing.currentStageId;
    const proc = this.getInvoiceProcess();

    let computedStatus: InvoiceStatus = "draft";
    if (targetStage.systemCategory === "paid") computedStatus = "paid";
    else if (targetStage.systemCategory === "sent") computedStatus = "sent";
    else if (targetStage.systemCategory === "viewed") computedStatus = "viewed";
    else if (targetStage.systemCategory === "partially_paid") computedStatus = "partial";
    else if (targetStage.systemCategory === "overdue") computedStatus = "overdue";
    else if (targetStage.systemCategory === "void") computedStatus = "void";

    const updated: ClientInvoice = {
      ...existing,
      currentStageId: targetStage.id,
      statusLabel: targetStage.name,
      status: computedStatus,
      paidAt: computedStatus === "paid" && !existing.paidAt ? new Date().toISOString() : existing.paidAt,
    };

    this.saveInvoices(all.map((i) => (i.id === invoiceId ? updated : i)));

    logStageMove({
      orgId: "default",
      recordType: "invoice",
      recordId: invoiceId,
      fromStageId: previousStageId,
      toStageId: targetStage.id,
      toStageName: targetStage.name,
      processId: proc.id,
      processName: proc.name,
      cause: cause || { type: "manual", ruleName: `Stage changed to ${targetStage.name}` },
    });

    return updated;
  }

  public deleteInvoice(invoiceId: string): boolean {
    const all = this.getInvoices();
    const filtered = all.filter((i) => i.id !== invoiceId);
    if (filtered.length === all.length) return false;
    this.saveInvoices(filtered);
    return true;
  }
}

export const invoiceService = new InvoiceService();
