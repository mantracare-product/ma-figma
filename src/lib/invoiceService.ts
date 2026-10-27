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
import { flattenRuleSteps } from "./automationTree";
import { getStoredDocumentTemplates } from "./documentTemplatesStore";
import { saveClientDocument, getStoredClientDocuments, StoredClientDocument } from "./clientDocumentsStore";

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
    const processes = getStoredProcesses();
    const invProcs = processes.filter((p) => p.entityType === "invoice");
    if (invProcs.length > 0) return true;
    if (DEFAULT_ENTITY_PROCESSES.invoice) return true;

    const rules = getStoredRules();
    const hasGlobalRule = rules.some((r) => {
      if (!r.enabled) return false;
      if (r.entityType === "invoice") return true;
      if (r.trigger?.event && (r.trigger.event.startsWith("invoice.") || r.trigger.event.includes("invoice"))) return true;
      const allActions = flattenRuleSteps(r.actions || []);
      if (
        allActions.some((a) => {
          const key = (a.stepKey || (a as any).type || (a as any).name || "").toLowerCase();
          return (
            ["generate_invoice", "generate-invoice", "create_invoice", "send_invoice", "send-invoice", "sendinvoice"].includes(key) ||
            key.includes("invoice") ||
            (a.params?.autoGenerateInvoice === true)
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
    const targetProcesses = processId
      ? processes.filter((p) => p.id === processId || p.name === processId)
      : processes;

    for (const proc of targetProcesses) {
      const hasStageInv = proc.stages?.some((s) => {
        const steps = flattenRuleSteps((s as any).workflowSteps || (s as any).automations || []);
        return steps.some((step: any) => {
          const key = (step.stepKey || step.type || step.name || "").toLowerCase();
          return (
            ["generate_invoice", "generate-invoice", "create_invoice", "send_invoice", "send-invoice", "sendinvoice"].includes(key) ||
            key.includes("invoice") ||
            (step.params?.autoGenerateInvoice === true)
          );
        });
      });
      if (hasStageInv) return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Specifically checks if there is an active automation rule or process workflow step
 * that generates an invoice when an appointment is booked or transitions.
 * General invoice automations (such as invoice.created -> update stage) will NOT match this.
 */
export function hasAppointmentInvoiceAutomation(processId?: string): boolean {
  try {
    const rules = getStoredRules();
    const hasApptInvRule = rules.some((r) => {
      if (!r.enabled) return false;
      const trigEvt = (r.trigger?.event || "").toLowerCase();
      const isApptTrigger =
        trigEvt.startsWith("appointment.") ||
        trigEvt === "appointment.booked" ||
        r.entityType === "appointment";

      if (!isApptTrigger) return false;

      // Must explicitly have a generate invoice action (including inside parallel branches)
      const allActions = flattenRuleSteps(r.actions && r.actions.length > 0 ? r.actions : (r as any).steps || []);
      const hasGenAction = allActions.some((a) => {
        const key = (a.stepKey || (a as any).type || (a as any).name || "").toLowerCase();
        return (
          ["generate_invoice", "generate-invoice", "create_invoice"].includes(key) ||
          a.params?.autoGenerateInvoice === true
        );
      });

      return Boolean(hasGenAction);
    });

    if (hasApptInvRule) return true;

    // Check process stages for appointment processes
    const processes = getStoredProcesses();
    const targetProcesses = processId
      ? processes.filter((p) => p.id === processId || p.name === processId)
      : processes.filter((p) => !p.entityType || p.entityType === "appointment");

    for (const proc of targetProcesses) {
      const hasStageInv = proc.stages?.some((s) => {
        const steps = (s as any).workflowSteps || (s as any).automations || [];
        return steps.some((step: any) => {
          const key = (step.stepKey || step.type || step.name || "").toLowerCase();
          return (
            ["generate_invoice", "generate-invoice", "create_invoice"].includes(key) ||
            step.params?.autoGenerateInvoice === true
          );
        });
      });
      if (hasStageInv) return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Searches stored automation rules to detect if an active automation configures
 * generating an invoice document (from an appointment or invoice trigger, including nested branches).
 */
export function findInvoiceDocumentAutomation(processId?: string): { stepKey: string; params: Record<string, any> } | null {
  try {
    const rules = getStoredRules();
    for (const r of rules) {
      if (r.enabled === false || (r as any).status === "paused") continue;
      const trigEvt = (r.trigger?.event || "").toLowerCase();
      const isApptOrInvTrigger =
        trigEvt.startsWith("appointment.") ||
        trigEvt === "appointment.booked" ||
        trigEvt.startsWith("invoice.") ||
        r.entityType === "appointment" ||
        r.entityType === "invoice";

      const allActions = flattenRuleSteps(r.actions && r.actions.length > 0 ? r.actions : (r as any).steps || []);
      const hasInvoiceAction = allActions.some((a) => {
        const key = (a.stepKey || (a as any).type || (a as any).name || "").toLowerCase();
        return ["generate_invoice", "generate-invoice", "create_invoice"].includes(key);
      });

      if (!isApptOrInvTrigger && !hasInvoiceAction) continue;

      const docAction = allActions.find((a) => {
        const key = (a.stepKey || (a as any).type || (a as any).name || "").toLowerCase();
        if (key !== "generate_document" && key !== "generate-document") return false;
        const targetEntity = (a.params?.entity || "").toLowerCase();
        const cat = (a.params?.templateName || a.params?.template || "").toLowerCase();
        const tplId = (a.params?.templateId || "").toLowerCase();
        return (
          targetEntity === "invoice" ||
          cat.includes("invoice") ||
          cat.includes("billing") ||
          tplId === "tpl-inv-1" ||
          tplId === "tpl-inv-receipt" ||
          r.entityType === "invoice" ||
          hasInvoiceAction
        );
      });

      if (docAction) {
        return {
          stepKey: docAction.stepKey || "generate_document",
          params: docAction.params || {},
        };
      }
    }

    // Also check process stages
    const processes = getStoredProcesses();
    const targetProcesses = processId
      ? processes.filter((p) => p.id === processId || p.name === processId || p.entityType === "invoice" || p.entityType === "appointment")
      : processes;

    for (const proc of targetProcesses) {
      for (const stage of proc.stages || []) {
        const steps = flattenRuleSteps((stage as any).workflowSteps || (stage as any).automations || (stage as any).steps || []);
        const docAction = steps.find((a: any) => {
          const key = (a.stepKey || a.type || a.name || "").toLowerCase();
          if (key !== "generate_document" && key !== "generate-document") return false;
          const targetEntity = (a.params?.entity || "").toLowerCase();
          const cat = (a.params?.templateName || a.params?.template || "").toLowerCase();
          const tplId = (a.params?.templateId || "").toLowerCase();
          return (
            targetEntity === "invoice" ||
            cat.includes("invoice") ||
            cat.includes("billing") ||
            tplId === "tpl-inv-1" ||
            tplId === "tpl-inv-receipt" ||
            proc.entityType === "invoice"
          );
        });
        if (docAction) {
          return {
            stepKey: docAction.stepKey || "generate_document",
            params: docAction.params || {},
          };
        }
      }
    }
  } catch {}
  return null;
}

/**
 * Finds an active automation rule matching invoice creation to determine initial target stage
 */
export function findMatchingInvoiceCreationRule(invoiceData: Record<string, any>): {
  rule: any;
  targetProcessId?: string;
  targetStageId?: string;
} | null {
  try {
    const rules = getStoredRules();
    const invoiceProcesses = getStoredProcesses().filter(
      (p) => p.entityType === "invoice" || p.id === "billing" || p.id === "billing-invoicing" || p.id === "proc-invoices"
    );

    for (const rule of rules) {
      if (!rule.enabled) continue;

      const trigEvt = (rule.trigger?.event || "").toLowerCase();
      const trigLabel = (rule.trigger?.label || "").toLowerCase();

      const isCreationTrigger =
        trigEvt === "invoice.created" ||
        trigEvt === "invoice_created" ||
        trigLabel.includes("invoice created") ||
        (rule.entityType === "invoice" && (!rule.trigger?.event || trigEvt === "invoice.created" || trigEvt === "invoice_created"));

      if (!isCreationTrigger) continue;

      let targetProcessId = rule.action?.processId;
      let targetStageId = rule.action?.stageId;

      if (!targetProcessId || !targetStageId) {
        const allActions = flattenRuleSteps(rule.actions && rule.actions.length > 0 ? rule.actions : (rule as any).steps || []);
        for (const act of allActions) {
          const stepKey = (act.stepKey || (act as any).type || "").toLowerCase();
          if (
            [
              "update_to_stage",
              "update-stage",
              "movetostage",
              "move_to_stage",
              "move-stage",
              "stage_movement",
              "stagemovement",
              "processmovement",
            ].includes(stepKey)
          ) {
            targetProcessId = act.params?.processId || act.params?.stepDetailProcess || targetProcessId;
            targetStageId = act.params?.stageId || act.params?.stepDetailStage || targetStageId;
            break;
          }
        }
      }

      if (!targetProcessId && targetStageId) {
        const foundProc = invoiceProcesses.find((p) =>
          p.stages?.some((s) => s.id === targetStageId || s.name.toLowerCase() === targetStageId?.toLowerCase())
        );
        if (foundProc) targetProcessId = foundProc.id;
      }

      if (targetProcessId || targetStageId) {
        return { rule, targetProcessId, targetStageId };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Generates and stores an official PDF invoice document linked to an invoice record.
 * Idempotent: if a document for this invoice already exists, returns it without creating duplicates.
 */
export function generateInvoiceDocument(
  invoice: ClientInvoice,
  params?: Record<string, any>
): StoredClientDocument {
  const existingDocs = getStoredClientDocuments();
  const cleanInvId = invoice.id.replace(/^#/, "").trim().toLowerCase();
  const alreadyGenerated = existingDocs.find(
    (d) =>
      (d.invoiceId && d.invoiceId.replace(/^#/, "").trim().toLowerCase() === cleanInvId) ||
      (d.entityType === "invoice" && d.entityId && d.entityId.replace(/^#/, "").trim().toLowerCase() === cleanInvId) ||
      (d.notes && d.notes.toLowerCase().includes(cleanInvId)) ||
      (d.name && d.name.toLowerCase().includes(cleanInvId))
  );
  if (alreadyGenerated) {
    return alreadyGenerated;
  }

  const storedTemplates = getStoredDocumentTemplates();
  const matchedTemplate =
    storedTemplates.find(
      (t) =>
        t.id === params?.templateId ||
        t.id === params?.template ||
        t.name.toLowerCase() === (params?.templateName || params?.template || "").toLowerCase()
    ) ||
    storedTemplates.find(
      (t) =>
        t.id === "tpl-inv-1" ||
        (t.category || "").toLowerCase() === "invoices" ||
        t.name.toLowerCase().includes("invoice")
    ) ||
    storedTemplates[0];

  const templateName = matchedTemplate?.name || params?.templateName || "Tax Invoice & Billing Statement";
  const dateStr = new Date().toISOString().replace("T", " ").substring(0, 16);
  let generatedText = matchedTemplate?.templateText || `OFFICIAL TAX INVOICE & BILLING STATEMENT\n\nInvoice Number: {invoice_number}\nDate: {current_date}\nDue Date: {due_date}\nPayment Status: {payment_status}\n\nClient Name: {client_name}\nEmail: {email}\nPhone: {phone}\n\nItemized Charges:\n{line_items_summary}\n\nSubtotal: {subtotal}\nTax: {tax_amount}\nTotal Due: {total_amount}\n\nIssued By: {responsible}`;

  const itemsList = (invoice.lineItems || [])
    .map(
      (li: any, i: number) =>
        `${i + 1}. ${li.description || li.product_name || "Item"} - Qty: ${li.quantity || 1} x $${Number(
          li.unitPrice || li.unit_price || li.rate || 0
        ).toFixed(2)} = $${Number(
          li.total || (li.quantity || 1) * (li.unitPrice || li.unit_price || li.rate || 0)
        ).toFixed(2)}`
    )
    .join("\n") || "1. Consultation / Service - $150.00";

  generatedText = generatedText
    .replace(/\{invoice_number\}/g, invoice.id)
    .replace(/\{due_date\}/g, invoice.dueDate || "")
    .replace(/\{subtotal\}/g, `$${Number(invoice.subtotal ?? (invoice.total ? invoice.total * 0.9 : 0)).toFixed(2)}`)
    .replace(/\{tax_amount\}/g, `$${Number(invoice.taxAmount ?? invoice.tax ?? 0).toFixed(2)}`)
    .replace(/\{total_amount\}/g, `$${Number(invoice.total ?? 0).toFixed(2)}`)
    .replace(/\{payment_status\}/g, String(invoice.status || "DRAFT").toUpperCase())
    .replace(/\{line_items_summary\}/g, itemsList)
    .replace(/\{items\}/g, itemsList)
    .replace(/\{client_name\}/g, invoice.clientName || "Client")
    .replace(/\{email\}/g, invoice.clientEmail || "")
    .replace(/\{phone\}/g, invoice.clientPhone || "")
    .replace(/\{location\}/g, "Online / Clinic")
    .replace(/\{responsible\}/g, "System Admin")
    .replace(/\{current_date\}/g, dateStr);

  const rawDocName = params?.documentName;
  let docName = `${invoice.id}_${templateName.replace(/\s+/g, "_")}.pdf`;
  if (rawDocName && !rawDocName.includes("{client_name}")) {
    docName = rawDocName.endsWith(".pdf") ? rawDocName : `${rawDocName}.pdf`;
  }

  const newDoc: StoredClientDocument = {
    id: `doc-inv-${invoice.id}-${Date.now()}`,
    clientId: invoice.clientId || "c-1",
    invoiceId: invoice.id,
    appointmentId: invoice.appointmentId,
    entityId: invoice.id,
    entityType: "invoice",
    name: docName,
    category: "Invoices",
    valueBy: "Invoice Record Data",
    fileType: "pdf",
    fileSize: "1.4 MB",
    uploadedDate: dateStr,
    uploadedBy: "System Admin",
    status: "Verified",
    notes: `Generated automatically via automation for Invoice #${invoice.id}${invoice.appointmentId ? ` · Appointment #${invoice.appointmentId}` : ""}`,
    templateId: matchedTemplate?.id || "tpl-inv-1",
    generatedContent: generatedText,
  };

  saveClientDocument(newDoc);
  return newDoc;
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

    // 1. Exact match by ID, Name, or systemCategory (strictly highest priority)
    const exact = proc.stages.find(
      (s) =>
        s.id.toLowerCase() === query ||
        s.name.toLowerCase() === query ||
        (s.systemCategory && s.systemCategory.toLowerCase() === query)
    );
    if (exact) return exact;

    // 2. Exact word match (e.g. "paid" must NOT match "partially_paid")
    const wordMatch = proc.stages.find((s) => {
      const words = s.name.toLowerCase().split(/\s+/);
      const catWords = (s.systemCategory || "").toLowerCase().split(/[_-\s]+/);
      return words.includes(query) || catWords.includes(query);
    });
    if (wordMatch) return wordMatch;

    // 3. Fallback contains match only when no exact/word match exists
    return proc.stages.find((s) => {
      const sName = s.name.toLowerCase();
      const sCat = (s.systemCategory || "").toLowerCase();
      return query.includes(sName) || sName.includes(query) || (sCat && query.includes(sCat));
    });
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

    // Check if an automation rule targets a specific stage on invoice creation
    const matchingRule = findMatchingInvoiceCreationRule({
      ...appointment,
      total,
      subtotal,
    });

    let targetStage: Stage | undefined = undefined;
    if (matchingRule?.targetStageId) {
      targetStage = this.findStageById(matchingRule.targetStageId);
    }

    const initialStage =
      targetStage ||
      proc.stages.find((s) => s.isInitial || s.stagePosition === "initial") ||
      proc.stages[0];
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
      processId: proc.id,
      currentStageId: initialStageId,
      statusLabel: initialStageName,
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

    // Auto-generate invoice document if configured in automations (Appointment Booked -> Generate Document, etc.)
    try {
      const docRule = findInvoiceDocumentAutomation(proc.id);
      if (docRule) {
        generateInvoiceDocument(newInvoice, docRule.params);
      }
    } catch (err) {
      console.warn("[InvoiceService] Failed to auto-generate invoice document:", err);
    }

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
    let existing = all.find(
      (i) =>
        i.id === invoiceId ||
        i.id.toLowerCase() === invoiceId.toLowerCase() ||
        i.invoiceNumber === invoiceId ||
        (i.id.replace(/\D/g, "") && invoiceId.replace(/\D/g, "") && i.id.replace(/\D/g, "") === invoiceId.replace(/\D/g, ""))
    );

    if (!existing) {
      // Auto-create minimal persistent invoice so payment is reliably recorded in MantraAssist
      const proc = this.getInvoiceProcess();
      const paidStage = this.findStageById("paid");
      const fallbackInv: ClientInvoice = {
        id: invoiceId,
        invoiceNumber: invoiceId,
        clientId: "CL-001",
        clientName: "Patient",
        total: amount,
        subtotal: amount,
        discountAmount: 0,
        taxAmount: 0,
        amountPaid: amount,
        status: "paid",
        currentStageId: paidStage?.id || "",
        statusLabel: paidStage?.name || "Paid",
        paidAt: new Date().toISOString(),
        currency: "$",
        createdBy: "System",
        lineItems: [
          {
            id: `li-${Date.now()}`,
            description: "Clinical Consultation & Care Services",
            quantity: 1,
            unitPrice: amount,
            source: "service",
          },
        ],
        createdAt: new Date().toISOString(),
        dueDate: new Date().toISOString().split("T")[0],
      };
      existing = fallbackInv;
      this.saveInvoices([fallbackInv, ...all]);
    }

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

    this.saveInvoices(this.getInvoices().map((i) => (i.id === existing!.id ? updated : i)));

    const receiptNum = `REC-${invoiceId.replace("INV-CL-", "").replace(/[^0-9]/g, "").slice(-5) || "1001"}-${Math.floor(Math.random() * 90 + 10)}`;
    const paymentDateStr = new Date().toISOString().split("T")[0];

    const payment: Payment = {
      id: `pmt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      invoiceId: existing.id,
      clientId: existing.clientId,
      amount,
      method: method as any,
      paymentType: "self_pay",
      paymentDate: paymentDateStr,
      date: paymentDateStr,
      note,
      receiptNumber: receiptNum,
      reference: receiptNum,
      receiptFileName: `Receipt_${existing.id}.pdf`,
      createdAt: new Date().toISOString(),
      status: "completed",
    } as any;

    // Save payment record to payments storage
    try {
      const rawPmts = localStorage.getItem(PAYMENTS_STORAGE_KEY);
      const pmts: Payment[] = rawPmts ? JSON.parse(rawPmts) : [];
      localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify([payment, ...pmts]));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("mantra_payments_changed"));
        window.dispatchEvent(new Event("storage"));
      }
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
