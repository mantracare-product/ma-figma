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
import { logStageMove, getStoredRules } from "./useAutomationStore";
import { DEFAULT_ENTITY_PROCESSES, getStoredProcesses, Process, Stage, getActiveOrganizationSync, isProcessMatchingOrg } from "./useProcessStore";
import { ClientInvoice, InvoiceLineItem, InvoiceStatus, Payment } from "../app/types/invoiceTypes";
import { addActivityEntry } from "./activityLog";

export interface CreateInvoiceOptions {
  appointmentId?: string;
  appointmentTitle?: string;
  createdBy?: "system" | "rule" | string;
  discountType?: "amount" | "percent";
  discountValue?: number;
  discountAmount?: number;
  dueDate?: string;
  paymentMode?: string;
}

const INVOICES_STORAGE_KEY = "mantra_invoices_v1";
const PAYMENTS_STORAGE_KEY = "mantra_payments_v1";
const INVOICES_CHANGE_EVENT = "mantra_invoices_changed";

export const SAMPLE_CLIENT_NAMES = new Set([
  "james wilson",
  "emma brown",
  "oliver davis",
  "sophia martinez",
  "amanda clark",
  "sarah jenkins",
  "deepika nair",
  "oliver thompson",
  "ananya reddy",
  "david miller",
  "michael chang",
  "elena rostova",
  "priya nair",
  "priya sharma",
  "charlotte evans",
  "vikram singh",
  "john smith",
  "sarah johnson",
]);

export function isSampleInvoice(inv: ClientInvoice): boolean {
  if (!inv) return false;
  if ((inv as any).isSample === true || (inv as any).source === "sample_seed") return true;
  return false;
}

export function hasInvoiceAutomation(processId?: string): boolean {
  try {
    const rules = getStoredRules();
    const hasGlobalRule = rules.some((r) => {
      if (!r.enabled) return false;
      if (r.entityType === "invoice") return true;
      if (r.trigger?.event && (r.trigger.event.startsWith("invoice.") || r.trigger.event.includes("invoice"))) return true;
      if (
        r.actions &&
        r.actions.some((a) => {
          const key = (a.stepKey || (a as any).type || (a as any).name || "").toLowerCase();
          return (
            ["generate_invoice", "generate-invoice", "create_invoice", "send_invoice", "send-invoice", "sendinvoice"].includes(key) ||
            key.includes("invoice") ||
            (a.params?.autoGenerateInvoice === true) ||
            (key.includes("appointment") && a.params?.autoGenerateInvoice !== false)
          );
        })
      ) {
        return true;
      }
      if (
        r.action?.processId &&
        (r.action.processId.includes("invoice") || r.action.processName?.toLowerCase().includes("invoice"))
      ) {
        return true;
      }
      if (r.name && r.name.toLowerCase().includes("invoice")) {
        return true;
      }
      return false;
    });

    if (hasGlobalRule) return true;

    // Check process stage workflowSteps & automations
    const processes = getStoredProcesses();
    const targetProcesses = processId
      ? processes.filter((p) => p.id === processId || p.name === processId)
      : processes;

    for (const proc of targetProcesses) {
      const hasStageInv = proc.stages?.some((s) => {
        const steps = (s as any).workflowSteps || (s as any).automations || [];
        return steps.some((step: any) => {
          const key = (step.stepKey || step.type || step.name || "").toLowerCase();
          return (
            ["generate_invoice", "generate-invoice", "create_invoice", "send_invoice", "send-invoice", "sendinvoice"].includes(key) ||
            key.includes("invoice") ||
            (step.params?.autoGenerateInvoice === true) ||
            (key.includes("appointment") && step.params?.autoGenerateInvoice !== false)
          );
        });
      });
      if (hasStageInv) return true;

      const hasRuleForProc = rules.some(
        (r) =>
          r.enabled &&
          (r.action?.processId === proc.id ||
            r.action?.processName === proc.name ||
            r.actions?.some(
              (a) =>
                a.params?.processId === proc.id ||
                a.params?.processName === proc.name ||
                a.params?.stepDetailProcess === proc.id ||
                a.params?.targetProcessId === proc.id
            ))
      );
      if (hasRuleForProc) return true;
    }

    return false;
  } catch {
    return false;
  }
}

const INITIAL_INVOICES: ClientInvoice[] = [];

if (typeof window !== "undefined") {
  try {
    const raw = localStorage.getItem(INVOICES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter((i) => !isSampleInvoice(i));
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(cleaned));
        }
      }
    }
  } catch {}
}

class InvoiceService {
  private getInvoiceProcess(): Process {
    const processes = getStoredProcesses();
    const activeOrg = getActiveOrganizationSync();
    if (activeOrg) {
      const match = processes.find(
        (p) => p.entityType === "invoice" && isProcessMatchingOrg(p, activeOrg)
      );
      if (match) return match;
    }
    const invProc = processes.find((p) => p.entityType === "invoice");
    return invProc || DEFAULT_ENTITY_PROCESSES.invoice;
  }

  private findStageByCategory(category: string): Stage | undefined {
    const proc = this.getInvoiceProcess();
    return proc.stages.find((s) => s.systemCategory === category) || proc.stages[0];
  }

  public findStageById(stageId: string): Stage | undefined {
    const proc = this.getInvoiceProcess();
    const query = String(stageId).trim().toLowerCase();
    const matchStage = (s: Stage) => {
      const sId = s.id.toLowerCase();
      const sName = s.name.toLowerCase();
      const sCat = (s.systemCategory || "").toLowerCase();
      return (
        sId === query ||
        sName === query ||
        (sCat && sCat === query) ||
        (sCat && (query.includes(sCat) || sCat.includes(query))) ||
        query.includes(sName) ||
        sName.includes(query)
      );
    };
    return proc.stages.find(matchStage);
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
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter((i) => !isSampleInvoice(i));
        if (cleaned.length !== parsed.length) {
          this.saveInvoices(cleaned);
        }
        return cleaned;
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
      window.dispatchEvent(new Event("storage"));
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
   * STRICT AUTOMATION GATE: Block creation unless an invoice automation rule is present!
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
    // 0. Automation Check: Only allow invoice creation if automation rule exists or created by rule / system
    if (!hasInvoiceAutomation() && options?.createdBy !== "rule" && options?.createdBy !== "system") {
      console.warn("[InvoiceService] Invoice creation blocked: No invoice automation configured.");
      return { invoice: null as any, alreadyExisted: false };
    }

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
    const proc = this.getInvoiceProcess();
    const initialStage = proc.stages[0];
    const initialStageId = initialStage?.id || "";
    const initialStageName = initialStage?.name || "";

    const newInvoice: ClientInvoice = {
      id: `INV-CL-${nextNumber}`,
      clientId: String(appointment.clientId || "c-1"),
      clientName: appointment.clientName || "Client",
      clientEmail: appointment.clientEmail || "",
      clientPhone: appointment.clientPhone || "",
      appointmentId: appointment.id ? String(appointment.id) : undefined,
      appointmentTitle: appointment.title || "Scheduled Appointment",
      currentStageId: "",
      statusLabel: "",
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

    // 4. Emit event (automations will drive stage move if defined)
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
   * Send invoice
   * Updates status without hardcoding stage. Stage movement is driven by automations on invoice.sent.
   */
  public sendInvoice(
    invoiceId: string,
    channel: "whatsapp" | "sms" | "email" = "whatsapp"
  ): ClientInvoice | null {
    const all = this.getInvoices();
    const existing = all.find((i) => i.id === invoiceId);
    if (!existing) return null;

    const updated: ClientInvoice = {
      ...existing,
      status: "sent",
      sentAt: new Date().toISOString(),
      sentVia: channel,
    };

    this.saveInvoices(all.map((i) => (i.id === invoiceId ? updated : i)));

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

    const newAmountPaid = parseFloat(((existing.amountPaid || 0) + amount).toFixed(2));
    const isFullyPaid = newAmountPaid >= existing.total;

    const updated: ClientInvoice = {
      ...existing,
      amountPaid: newAmountPaid,
      status: isFullyPaid ? "paid" : "partial",
      paidAt: isFullyPaid ? new Date().toISOString() : existing.paidAt,
    };

    if (isFullyPaid) {
      const paidStage = this.findStageById("paid");
      if (paidStage) {
        updated.currentStageId = paidStage.id;
        updated.statusLabel = paidStage.name;
      }
    }

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

    if (isFullyPaid) {
      eventBus.emit("invoice.paid", "invoice", invoiceId, { ...updated, payment });
    } else {
      eventBus.emit("invoice.partially_paid", "invoice", invoiceId, { ...updated, payment });
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
        secondary: `Total balance: $${(existing.total - newAmountPaid).toFixed(2)} remaining`,
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

    const updated: ClientInvoice = {
      ...existing,
      status: "void",
    };

    this.saveInvoices(all.map((i) => (i.id === invoiceId ? updated : i)));

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

    eventBus.emit("stage.entered", "invoice", invoiceId, {
      ...updated,
      fromStageId: previousStageId,
      toStageId: targetStage.id,
      stageId: targetStage.id,
      stageName: targetStage.name,
      processId: proc.id,
      causeRuleId: cause?.type === "rule" ? cause.ruleName : undefined,
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
