/**
 * appointmentService.ts
 * Path: src/lib/appointmentService.ts
 *
 * Single "one-door" service for appointment lifecycle management:
 * - createAppointment
 * - rescheduleAppointment
 * - cancelAppointment
 * - completeAppointment
 * - checkInAppointment
 *
 * Emits appointment.* events via eventBus and synchronizes currentStageId
 * with the canonical appointment process stages.
 */

import { eventBus } from "./eventBus";
import { logStageMove, getStoredRules } from "./useAutomationStore";
import { DEFAULT_ENTITY_PROCESSES, getStoredProcesses, Process, Stage, getActiveOrganizationSync, isProcessMatchingOrg } from "./useProcessStore";
import { invoiceService, hasInvoiceAutomation, SAMPLE_CLIENT_NAMES } from "./invoiceService";
import { appendActivity } from "./activityEngine";

export function hasAppointmentAutomation(processId?: string): boolean {
  try {
    const rules = getStoredRules();
    const hasGlobalRule = rules.some((r) => {
      if (!r.enabled) return false;
      if (r.entityType === "appointment") return true;
      if (r.trigger?.event && (r.trigger.event.startsWith("appointment.") || r.trigger.event.includes("appointment") || r.trigger.event.includes("booking"))) return true;
      if (
        r.actions &&
        r.actions.some((a) => {
          const key = (a.stepKey || (a as any).type || (a as any).name || "").toLowerCase();
          if (
            [
              "book_appointment",
              "schedule_appointment",
              "book-appointment",
              "scheduleappointment",
              "reschedule-appointment",
              "generate_invoice",
              "generate-invoice",
            ].includes(key) ||
            key.includes("appointment") ||
            key.includes("booking")
          ) {
            return true;
          }
          if (a.params?.stageEntity === "appointment") return true;
          return false;
        })
      ) {
        return true;
      }
      if (
        r.action?.processId &&
        (r.action.processId.includes("appointment") || r.action.processName?.toLowerCase().includes("appointment"))
      ) {
        return true;
      }
      if (r.name && (r.name.toLowerCase().includes("appointment") || r.name.toLowerCase().includes("booking"))) {
        return true;
      }
      return false;
    });

    if (hasGlobalRule) return true;

    // Check process stages workflowSteps & automations
    const processes = getStoredProcesses();
    const targetProcesses = processId
      ? processes.filter((p) => p.id === processId || p.name === processId)
      : processes.filter((p) => p.entityType === "appointment");

    for (const proc of targetProcesses) {
      const hasStageAutomations = proc.stages?.some((s) => {
        const steps = (s as any).workflowSteps || (s as any).automations || [];
        return steps.length > 0;
      });
      if (hasStageAutomations) return true;

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

    if (!processId) {
      const anyApptProcHasAuto = processes
        .filter((p) => p.entityType === "appointment")
        .some((p) =>
          p.stages?.some((s) => ((s as any).workflowSteps || (s as any).automations || []).length > 0)
        );
      if (anyApptProcHasAuto) return true;
    }

    return false;
  } catch {
    return false;
  }
}

export interface Appointment {
  id: number | string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  employeeId: number | string;
  serviceId: number | string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: number; // in minutes
  status: "scheduled" | "completed" | "cancelled" | "no-show" | "pending-accept" | "rescheduled";
  notes?: string;
  rating?: number;
  title?: string;
  description?: string;
  tags?: string[];
  processId?: string;
  stageId?: string;
  currentStageId?: string;
  statusLabel?: string;
  createdAt?: string;
  updatedAt?: string;
  clientId?: string;
  invoiceId?: string;
  location?: string;
  sessionType?: "video" | "inPerson";
}

export interface CreateAppointmentPayload {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  employeeId: number | string;
  serviceId?: number | string;
  date: string;
  time: string;
  duration?: number;
  notes?: string;
  title?: string;
  description?: string;
  tags?: string[];
  clientId?: string;
  location?: string;
  sessionType?: "video" | "inPerson";
  processId?: string;
  stageId?: string;
  generateInvoice?: boolean;
  lineItems?: any[];
  discountAmount?: number;
  source?: "screen" | "call" | "webhook" | "import" | "ai";
}

export interface CreateAppointmentOptions {
  createdBy?: "rule" | "user" | "test";
  force?: boolean;
}

const APPOINTMENTS_STORAGE_KEY = "appointments_v1";
const APPOINTMENTS_CHANGE_EVENT = "mantra_appointments_changed";

export function isSampleAppointment(a: Appointment): boolean {
  if (!a) return false;
  if ((a as any).isSample === true || (a as any).source === "sample_seed") return true;
  return false;
}

const INITIAL_APPOINTMENTS: Appointment[] = [];

if (typeof window !== "undefined") {
  try {
    const cleanStorage = (storage: Storage) => {
      const raw = storage.getItem(APPOINTMENTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((a) => !isSampleAppointment(a));
          if (cleaned.length !== parsed.length) {
            storage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(cleaned));
          }
        }
      }
    };
    cleanStorage(sessionStorage);
    cleanStorage(localStorage);
  } catch {}
}

function evaluateAppointmentCondition(condition: any, data: Record<string, any> = {}): boolean {
  if (!condition) return true;
  const fieldKey = condition.field || condition.fieldToFilter || condition.fieldKey || "";
  if (!fieldKey) return true;

  let actualValue = data[fieldKey];
  if (actualValue === undefined && fieldKey.includes(".")) {
    const parts = fieldKey.split(".");
    actualValue = data[parts[parts.length - 1]];
  }
  if (actualValue === undefined) {
    const lowerKey = fieldKey.toLowerCase();
    const shortKey = fieldKey.includes(".") ? fieldKey.split(".").pop()?.toLowerCase() : lowerKey;
    const foundKey = Object.keys(data).find(
      (k) => k.toLowerCase() === lowerKey || (shortKey && k.toLowerCase() === shortKey)
    );
    if (foundKey) actualValue = data[foundKey];
  }

  const op = (condition.op || condition.operator || "equals").toLowerCase();
  const targetValue = condition.value ?? condition.filterValue ?? condition.targetValue ?? "";

  switch (op) {
    case "equals":
    case "equal_to":
    case "is":
      return String(actualValue ?? "").trim().toLowerCase() === String(targetValue ?? "").trim().toLowerCase();
    case "not_equals":
    case "not_equal_to":
    case "is_not":
      return String(actualValue ?? "").trim().toLowerCase() !== String(targetValue ?? "").trim().toLowerCase();
    case "contains":
    case "includes":
      return String(actualValue ?? "").toLowerCase().includes(String(targetValue ?? "").toLowerCase());
    case "not_contains":
      return !String(actualValue ?? "").toLowerCase().includes(String(targetValue ?? "").toLowerCase());
    case "starts_with":
      return String(actualValue ?? "").toLowerCase().startsWith(String(targetValue ?? "").toLowerCase());
    case "ends_with":
      return String(actualValue ?? "").toLowerCase().endsWith(String(targetValue ?? "").toLowerCase());
    case "greater_than":
    case "gt":
      return Number(actualValue) > Number(targetValue);
    case "less_than":
    case "lt":
      return Number(actualValue) < Number(targetValue);
    default:
      return String(actualValue ?? "").trim().toLowerCase() === String(targetValue ?? "").trim().toLowerCase();
  }
}

export function findMatchingAppointmentBookingRule(appointmentData: Record<string, any>): {
  rule: any;
  targetProcessId?: string;
  targetStageId?: string;
} | null {
  try {
    const rules = getStoredRules();
    const appointmentProcesses = getStoredProcesses().filter((p) => p.entityType === "appointment");

    for (const rule of rules) {
      if (!rule.enabled) continue;
      const isBookingTrigger =
        rule.trigger?.event === "appointment.booked" ||
        (rule.entityType === "appointment" && (!rule.trigger?.event || rule.trigger.event.startsWith("appointment.")));
      if (!isBookingTrigger) continue;

      let conditionsPass = true;
      if (rule.conditions && rule.conditions.length > 0) {
        for (const cond of rule.conditions) {
          if (!evaluateAppointmentCondition(cond, appointmentData)) {
            conditionsPass = false;
            break;
          }
        }
      }
      const triggerConditions = rule.trigger?.params?.triggerConditions || [];
      if (conditionsPass && Array.isArray(triggerConditions) && triggerConditions.length > 0) {
        for (const cond of triggerConditions) {
          if (!evaluateAppointmentCondition(cond, appointmentData)) {
            conditionsPass = false;
            break;
          }
        }
      }
      if (!conditionsPass) continue;

      // Extract target process and stage
      let targetProcessId = rule.action?.processId;
      let targetStageId = rule.action?.stageId;

      if (!targetProcessId || !targetStageId) {
        const allActions = rule.actions || [];
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

      // If targetStageId is present without targetProcessId, find process from stage
      if (!targetProcessId && targetStageId) {
        const foundProc = appointmentProcesses.find((p) =>
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

class AppointmentService {
  private getAppointmentProcess(): Process {
    const processes = getStoredProcesses();
    const activeOrg = getActiveOrganizationSync();
    if (activeOrg) {
      const match = processes.find(
        (p) => p.entityType === "appointment" && isProcessMatchingOrg(p, activeOrg)
      );
      if (match) return match;
    }
    const apptProc = processes.find((p) => p.entityType === "appointment");
    return apptProc || DEFAULT_ENTITY_PROCESSES.appointment;
  }

  private findStageByCategory(category: string): Stage | undefined {
    const proc = this.getAppointmentProcess();
    return proc.stages.find((s) => s.systemCategory === category) || proc.stages[0];
  }

  public findStageById(stageId: string, processId?: string): Stage | undefined {
    const query = String(stageId).trim().toLowerCase();
    const processes = getStoredProcesses();
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

    if (processId) {
      const proc = processes.find((p) => p.id === processId);
      if (proc) {
        const found = proc.stages.find(matchStage);
        if (found) return found;
      }
    }
    const apptProcs = processes.filter((p) => p.entityType === "appointment");
    for (const p of apptProcs) {
      const found = p.stages.find(matchStage);
      if (found) return found;
    }
    const proc = this.getAppointmentProcess();
    return proc.stages.find(matchStage);
  }

  public getAppointments(): Appointment[] {
    if (typeof window === "undefined") return INITIAL_APPOINTMENTS;
    try {
      const raw = sessionStorage.getItem(APPOINTMENTS_STORAGE_KEY) || localStorage.getItem(APPOINTMENTS_STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        let dirty = false;
        const allProcs = getStoredProcesses().filter((p) => p.entityType === "appointment");
        // Filter out legacy hardcoded sample appointments and reconcile processId if currentStageId belongs to another process
        const cleaned = parsed
          .filter((a) => !isSampleAppointment(a))
          .map((a) => {
            if (a.currentStageId) {
              const sid = String(a.currentStageId).trim().toLowerCase();
              const owningProc = allProcs.find((p) => p.stages?.some((s) => s.id.toLowerCase() === sid));
              if (owningProc && a.processId !== owningProc.id) {
                dirty = true;
                return { ...a, processId: owningProc.id };
              }
            }
            return a;
          });
        if (dirty || cleaned.length !== parsed.length) {
          this.saveAppointments(cleaned);
        }
        return cleaned;
      }
      return [];
    } catch {
      return [];
    }
  }

  public getAppointmentById(id: number | string): Appointment | undefined {
    const all = this.getAppointments();
    return all.find((a) => String(a.id) === String(id));
  }

  public saveAppointments(appointments: Appointment[]): void {
    if (typeof window === "undefined") return;
    try {
      const serialized = JSON.stringify(appointments);
      sessionStorage.setItem(APPOINTMENTS_STORAGE_KEY, serialized);
      localStorage.setItem(APPOINTMENTS_STORAGE_KEY, serialized);
      window.dispatchEvent(new CustomEvent(APPOINTMENTS_CHANGE_EVENT, { detail: appointments }));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      console.error("[AppointmentService] Failed to save appointments:", e);
    }
  }

  public subscribe(listener: (appointments: Appointment[]) => void): () => void {
    if (typeof window === "undefined") return () => {};
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<Appointment[]>;
      listener(customEvent.detail || this.getAppointments());
    };
    window.addEventListener(APPOINTMENTS_CHANGE_EVENT, handler);
    return () => window.removeEventListener(APPOINTMENTS_CHANGE_EVENT, handler);
  }

  /**
   * Create an appointment
   * Stage is NOT assigned automatically unless explicitly passed or updated by an automation rule!
   */
  public createAppointment(
    payload: CreateAppointmentPayload,
    options?: CreateAppointmentOptions
  ): {
    appointment: Appointment;
    invoiceId?: string;
    confirmationSent: boolean;
  } {
    // 0. Automation Check: Only allow appointment creation if automation rule exists or created by rule / test bypass
    if (
      !hasAppointmentAutomation(payload.processId) &&
      options?.createdBy !== "rule" &&
      options?.createdBy !== "test" &&
      !options?.force &&
      (payload as any).source !== "test"
    ) {
      console.warn("[AppointmentService] Appointment booking blocked: No appointment automation configured.");
      return { appointment: null as any, confirmationSent: false };
    }

    const all = this.getAppointments();
    const nextId = all.length > 0 ? Math.max(...all.map((a) => Number(a.id) || 0)) + 1 : 101;

    // Check if an automation rule with condition triggers matches this booking
    const matchingRule = findMatchingAppointmentBookingRule({
      ...payload,
      source: payload.source || "screen",
    });

    let targetProcess: Process | null | undefined = null;
    let targetStage: Stage | undefined = undefined;

    // If an automation rule matched, prioritize its targeted process and stage
    if (matchingRule) {
      if (matchingRule.targetProcessId) {
        targetProcess = getStoredProcesses().find(
          (p) => p.id === matchingRule.targetProcessId || p.name === matchingRule.targetProcessId
        );
      }
      if (matchingRule.targetStageId) {
        targetStage = this.findStageById(matchingRule.targetStageId, targetProcess?.id);
      }
    }

    if (!targetProcess && payload.processId) {
      targetProcess = getStoredProcesses().find(
        (p) => p.id === payload.processId || p.name === payload.processId
      );
    }

    const proc = targetProcess || this.getAppointmentProcess();
    const initialStage = targetStage || (payload.stageId ? this.findStageById(payload.stageId, proc.id) : undefined);
    const initialStageId = initialStage?.id || "";
    const initialStageName = initialStage?.name || "";

    const newAppointment: Appointment = {
      id: nextId,
      clientName: payload.clientName,
      clientEmail: payload.clientEmail,
      clientPhone: payload.clientPhone,
      employeeId: payload.employeeId,
      serviceId: payload.serviceId || 1,
      date: payload.date,
      time: payload.time,
      duration: payload.duration || 60,
      status: initialStage?.systemCategory === "completed" ? "completed" : initialStage?.systemCategory === "cancelled" ? "cancelled" : "scheduled",
      notes: payload.notes || `Session Type: ${payload.sessionType === "video" ? "Video Call" : "In-Person"}`,
      title: payload.title || "Scheduled Appointment",
      description: payload.description,
      tags: payload.tags,
      currentStageId: initialStageId,
      statusLabel: initialStageName,
      processId: proc.id,
      clientId: payload.clientId,
      location: payload.location,
      sessionType: payload.sessionType || "video",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Save appointment
    this.saveAppointments([newAppointment, ...all]);

    const formattedApptId = !isNaN(Number(newAppointment.id))
      ? `APT-${Number(newAppointment.id).toString().padStart(4, "0")}`
      : `APT-${newAppointment.id}`;

    // Append activity for appointment booking
    appendActivity({
      clientId: newAppointment.clientId || formattedApptId,
      appointmentId: String(newAppointment.id),
      processId: proc.id,
      processName: proc.name,
      type: "appointment_booked",
      status: newAppointment.status || "scheduled",
      date: newAppointment.date,
      time: newAppointment.time,
      location: newAppointment.location,
      notes: newAppointment.notes,
      appointmentTitle: newAppointment.title,
      createdBy: options?.createdBy === "rule" ? "system" : "user",
      details: {
        primary: `Appointment #${formattedApptId} booked for ${newAppointment.clientName}`,
        secondary: `${newAppointment.date} at ${newAppointment.time} · ${newAppointment.title || "Consultation"}`,
      },
    });

    if (initialStageName) {
      appendActivity({
        clientId: newAppointment.clientId || formattedApptId,
        appointmentId: String(newAppointment.id),
        processId: proc.id,
        processName: proc.name,
        type: "stage_change",
        fromStage: "Initiated",
        toStage: initialStageName,
        createdBy: options?.createdBy === "rule" ? "system" : "user",
        details: {
          primary: `Stage set to "${initialStageName}"`,
          secondary: `Appointment #${formattedApptId} enrolled in ${proc.name}`,
        },
      });
    }

    // 2. Emit appointment.booked event via eventBus (triggers automations for stage move / invoicing)
    eventBus.emit("appointment.booked", "appointment", String(newAppointment.id), {
      ...newAppointment,
      source: payload.source || "screen",
    });

    // 3. Invoice Generation (if explicitly enabled OR active invoice automation exists for appointment booking)
    const shouldGenerateInvoice =
      payload.generateInvoice === true ||
      hasInvoiceAutomation(proc.id);

    let createdInvoiceId: string | undefined = undefined;
    if (shouldGenerateInvoice) {
      if (!hasInvoiceAutomation(proc.id) && payload.generateInvoice !== true) {
        console.warn("[AppointmentService] Invoice creation skipped: No active invoice automation configured.");
      } else {
        const lineItems = payload.lineItems && payload.lineItems.length > 0
          ? payload.lineItems
          : [{ id: `li-${newAppointment.id}-1`, source: "service", serviceId: String(newAppointment.serviceId), description: newAppointment.title || "Appointment Consultation", quantity: 1, unitPrice: 150 }];

        const { invoice } = invoiceService.createInvoiceFromAppointment(
          {
            id: newAppointment.id,
            clientId: newAppointment.clientId || "c-1",
            clientName: newAppointment.clientName,
            clientEmail: newAppointment.clientEmail,
            clientPhone: newAppointment.clientPhone,
            title: newAppointment.title,
          },
          lineItems,
          { createdBy: "rule", discountAmount: payload.discountAmount }
        );
        if (invoice?.id) {
          createdInvoiceId = invoice.id;
          newAppointment.invoiceId = invoice.id;
          this.updateAppointment(newAppointment.id, { invoiceId: invoice.id });
        }
      }
    }

    // 4. Confirmation notification signal
    const confirmationSent = true;

    return {
      appointment: newAppointment,
      invoiceId: createdInvoiceId,
      confirmationSent,
    };
  }

  /**
   * Reschedule an appointment
   * Updates date/time without hardcoding stage. Stage movement is driven by automations on appointment.rescheduled.
   */
  public rescheduleAppointment(
    id: number | string,
    newDate: string,
    newTime: string,
    notes?: string
  ): Appointment {
    const all = this.getAppointments();
    const existing = all.find((a) => String(a.id) === String(id));
    if (!existing) {
      throw new Error(`[AppointmentService] Appointment with ID ${id} not found.`);
    }

    const updatedAppointment: Appointment = {
      ...existing,
      date: newDate,
      time: newTime,
      notes: notes ? `${existing.notes ? existing.notes + " | " : ""}${notes}` : existing.notes,
      updatedAt: new Date().toISOString(),
    };

    const updatedList = all.map((a) => (String(a.id) === String(id) ? updatedAppointment : a));
    this.saveAppointments(updatedList);

    const formattedApptId = !isNaN(Number(id))
      ? `APT-${Number(id).toString().padStart(4, "0")}`
      : `APT-${id}`;
    const proc = getStoredProcesses().find((p) => p.id === existing.processId) || this.getAppointmentProcess();

    appendActivity({
      clientId: existing.clientId || formattedApptId,
      appointmentId: String(id),
      processId: existing.processId || proc.id,
      processName: proc.name,
      type: "appointment_rescheduled" as any,
      status: "rescheduled",
      date: newDate,
      time: newTime,
      location: existing.location,
      notes: notes || existing.notes,
      appointmentTitle: existing.title,
      createdBy: "user",
      details: {
        primary: `Appointment #${formattedApptId} rescheduled to ${newDate} at ${newTime}`,
        secondary: `Was previously scheduled for ${existing.date} at ${existing.time}`,
      },
    });

    // Emit appointment.rescheduled event (automations will execute update_to_stage if defined)
    eventBus.emit("appointment.rescheduled", "appointment", String(id), {
      ...updatedAppointment,
      previousDate: existing.date,
      previousTime: existing.time,
    });

    return updatedAppointment;
  }

  /**
   * Cancel an appointment
   * Updates status without hardcoding stage. Stage movement is driven by automations on appointment.cancelled.
   */
  public cancelAppointment(id: number | string, reason?: string): Appointment {
    const all = this.getAppointments();
    const existing = all.find((a) => String(a.id) === String(id));
    if (!existing) throw new Error(`[AppointmentService] Appointment ${id} not found.`);

    const updatedAppointment: Appointment = {
      ...existing,
      status: "cancelled",
      notes: reason ? `${existing.notes ? existing.notes + " | " : ""}Cancelled: ${reason}` : existing.notes,
      updatedAt: new Date().toISOString(),
    };

    this.saveAppointments(all.map((a) => (String(a.id) === String(id) ? updatedAppointment : a)));

    const formattedApptId = !isNaN(Number(id))
      ? `APT-${Number(id).toString().padStart(4, "0")}`
      : `APT-${id}`;
    const proc = getStoredProcesses().find((p) => p.id === existing.processId) || this.getAppointmentProcess();

    appendActivity({
      clientId: existing.clientId || formattedApptId,
      appointmentId: String(id),
      processId: existing.processId || proc.id,
      processName: proc.name,
      type: "appointment_cancelled" as any,
      status: "cancelled",
      date: existing.date,
      time: existing.time,
      location: existing.location,
      notes: reason || existing.notes,
      appointmentTitle: existing.title,
      createdBy: "user",
      details: {
        primary: `Appointment #${formattedApptId} cancelled`,
        secondary: reason ? `Reason: ${reason}` : `Appointment on ${existing.date} cancelled`,
      },
    });

    eventBus.emit("appointment.cancelled", "appointment", String(id), updatedAppointment);

    // If there is an unpaid linked invoice, void it
    if (existing.invoiceId) {
      invoiceService.voidInvoice(existing.invoiceId);
    } else {
      const linked = invoiceService.getInvoices().find((i) => String(i.appointmentId) === String(id));
      if (linked && linked.status !== "paid") {
        invoiceService.voidInvoice(linked.id);
      }
    }

    return updatedAppointment;
  }

  /**
   * Complete an appointment
   * Updates status without hardcoding stage. Stage movement is driven by automations on appointment.completed.
   */
  public completeAppointment(id: number | string, rating?: number): Appointment {
    const all = this.getAppointments();
    const existing = all.find((a) => String(a.id) === String(id));
    if (!existing) throw new Error(`[AppointmentService] Appointment ${id} not found.`);

    const updatedAppointment: Appointment = {
      ...existing,
      status: "completed",
      rating: rating ?? existing.rating,
      updatedAt: new Date().toISOString(),
    };

    this.saveAppointments(all.map((a) => (String(a.id) === String(id) ? updatedAppointment : a)));

    const formattedApptId = !isNaN(Number(id))
      ? `APT-${Number(id).toString().padStart(4, "0")}`
      : `APT-${id}`;
    const proc = getStoredProcesses().find((p) => p.id === existing.processId) || this.getAppointmentProcess();

    appendActivity({
      clientId: existing.clientId || formattedApptId,
      appointmentId: String(id),
      processId: existing.processId || proc.id,
      processName: proc.name,
      type: "appointment_completed" as any,
      status: "completed",
      date: existing.date,
      time: existing.time,
      location: existing.location,
      notes: existing.notes,
      appointmentTitle: existing.title,
      createdBy: "user",
      details: {
        primary: `Appointment #${formattedApptId} marked as completed`,
        secondary: rating ? `Rating: ${rating} / 5 ⭐` : `Completed for ${existing.clientName}`,
      },
    });

    eventBus.emit("appointment.completed", "appointment", String(id), updatedAppointment);

    return updatedAppointment;
  }

  /**
   * Check in an appointment
   * Updates status without hardcoding stage. Stage movement is driven by automations on appointment.checked_in.
   */
  public checkInAppointment(id: number | string): Appointment {
    const all = this.getAppointments();
    const existing = all.find((a) => String(a.id) === String(id));
    if (!existing) throw new Error(`[AppointmentService] Appointment ${id} not found.`);

    const updatedAppointment: Appointment = {
      ...existing,
      updatedAt: new Date().toISOString(),
    };

    this.saveAppointments(all.map((a) => (String(a.id) === String(id) ? updatedAppointment : a)));

    eventBus.emit("appointment.checked_in", "appointment", String(id), updatedAppointment);

    return updatedAppointment;
  }

  /**
   * Move appointment to a specific stage ID directly
   */
  public moveToStage(id: number | string, stageId: string, cause?: { type: any; ruleName?: string; processId?: string }): Appointment {
    const all = this.getAppointments();
    const existing = all.find((a) => String(a.id) === String(id));
    if (!existing) throw new Error(`[AppointmentService] Appointment ${id} not found.`);

    const targetStage = this.findStageById(stageId, cause?.processId);
    if (!targetStage) throw new Error(`[AppointmentService] Stage ${stageId} not found.`);

    const previousStageId = existing.currentStageId;
    const allProcs = getStoredProcesses().filter((p) => p.entityType === "appointment");
    let targetProcess = cause?.processId
      ? allProcs.find((p) => p.id === cause.processId || p.name === cause.processId)
      : undefined;
    if (!targetProcess) {
      targetProcess = allProcs.find((p) => p.stages?.some((s) => s.id === targetStage.id || s.name === targetStage.name));
    }
    const finalProcessId = targetProcess?.id || existing.processId || this.getAppointmentProcess().id;

    const updatedAppointment: Appointment = {
      ...existing,
      processId: finalProcessId,
      currentStageId: targetStage.id,
      statusLabel: targetStage.name,
      status: targetStage.systemCategory === "completed"
        ? "completed"
        : targetStage.systemCategory === "cancelled"
        ? "cancelled"
        : "scheduled",
      updatedAt: new Date().toISOString(),
    };

    this.saveAppointments(all.map((a) => (String(a.id) === String(id) ? updatedAppointment : a)));

    const fromStageObj = this.findStageById(previousStageId, existing.processId);
    const fromStageName = fromStageObj?.name || "Previous Stage";
    const formattedApptId = !isNaN(Number(id))
      ? `APT-${Number(id).toString().padStart(4, "0")}`
      : `APT-${id}`;

    // Append activity for stage move
    appendActivity({
      clientId: existing.clientId || formattedApptId,
      appointmentId: String(id),
      processId: finalProcessId,
      processName: targetProcess?.name || "Appointment Process",
      type: "stage_change",
      fromStage: fromStageName,
      toStage: targetStage.name,
      createdBy: cause?.type === "rule" ? "system" : "user",
      details: {
        primary: `Moved to stage "${targetStage.name}"`,
        secondary: cause?.ruleName ? `Via: ${cause.ruleName}` : `Appointment #${formattedApptId} for ${existing.clientName}`,
      },
    });

    logStageMove({
      orgId: "default",
      recordType: "appointment",
      recordId: String(id),
      fromStageId: previousStageId,
      toStageId: targetStage.id,
      toStageName: targetStage.name,
      processId: finalProcessId,
      processName: targetProcess?.name || "Appointment Process",
      cause: cause || { type: "manual", ruleName: `Stage changed to ${targetStage.name}` },
    });

    eventBus.emit("stage.entered", "appointment", String(id), {
      ...updatedAppointment,
      fromStageId: previousStageId,
      toStageId: targetStage.id,
      stageId: targetStage.id,
      stageName: targetStage.name,
      processId: finalProcessId,
      causeRuleId: cause?.type === "rule" ? cause.ruleName : undefined,
    });

    return updatedAppointment;
  }

  public updateAppointment(id: number | string, patch: Partial<Appointment>): Appointment | undefined {
    const all = this.getAppointments();
    const idx = all.findIndex((a) => String(a.id) === String(id));
    if (idx === -1) return undefined;

    const updated = { ...all[idx], ...patch, updatedAt: new Date().toISOString() };
    all[idx] = updated;
    this.saveAppointments(all);
    return updated;
  }

  public deleteAppointment(id: number | string): boolean {
    const all = this.getAppointments();
    const filtered = all.filter((a) => String(a.id) !== String(id));
    if (filtered.length === all.length) return false;
    this.saveAppointments(filtered);
    return true;
  }
}

export const appointmentService = new AppointmentService();
