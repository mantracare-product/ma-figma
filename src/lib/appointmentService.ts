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

export function hasAppointmentAutomation(): boolean {
  try {
    const rules = getStoredRules();
    return rules.some((r) => {
      if (!r.enabled) return false;
      if (r.entityType === "appointment") return true;
      if (r.trigger?.event && r.trigger.event.startsWith("appointment.")) return true;
      if (
        r.actions &&
        r.actions.some((a) => {
          const key = (a.stepKey || (a as any).type || "").toLowerCase();
          if (["book_appointment", "schedule_appointment", "book-appointment"].includes(key)) return true;
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
      return false;
    });
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
  stageId?: string;
  generateInvoice?: boolean;
  lineItems?: any[];
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
  const name = (a.clientName || "").trim().toLowerCase();
  if (SAMPLE_CLIENT_NAMES.has(name)) return true;
  if (typeof a.id === "number" && a.id <= 20) return true;
  if (typeof a.id === "string" && /^appt-\d+$/i.test(a.id)) return true;
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

  public findStageById(stageId: string): Stage | undefined {
    const proc = this.getAppointmentProcess();
    const query = String(stageId).trim().toLowerCase();
    return proc.stages.find((s) => s.id.toLowerCase() === query || s.name.toLowerCase() === query);
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
        // Filter out legacy hardcoded sample appointments
        const filtered = parsed.filter((a) => !isSampleAppointment(a));
        if (filtered.length !== parsed.length) {
          this.saveAppointments(filtered);
        }
        return filtered;
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
    // 0. Automation Check: Only allow appointment creation if automation rule exists or created by rule / test
    if (
      !hasAppointmentAutomation() &&
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
    const initialStage = payload.stageId ? this.findStageById(payload.stageId) : undefined;
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
      status: "scheduled",
      notes: payload.notes || `Session Type: ${payload.sessionType === "video" ? "Video Call" : "In-Person"}`,
      title: payload.title || "Scheduled Appointment",
      description: payload.description,
      tags: payload.tags,
      currentStageId: initialStageId,
      statusLabel: initialStageName,
      clientId: payload.clientId,
      location: payload.location,
      sessionType: payload.sessionType || "video",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Save appointment
    this.saveAppointments([newAppointment, ...all]);

    // 2. Emit appointment.booked event via eventBus (triggers automations for stage move / invoicing)
    eventBus.emit("appointment.booked", "appointment", String(newAppointment.id), {
      ...newAppointment,
      source: payload.source || "screen",
    });

    // 3. Invoice Generation (only if explicitly enabled AND an active invoice automation exists!)
    let createdInvoiceId: string | undefined = undefined;
    if (payload.generateInvoice === true) {
      if (!hasInvoiceAutomation()) {
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
          { createdBy: payload.source === "call" ? "system" : "Admin User" }
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
  public moveToStage(id: number | string, stageId: string, cause?: { type: any; ruleName?: string }): Appointment {
    const all = this.getAppointments();
    const existing = all.find((a) => String(a.id) === String(id));
    if (!existing) throw new Error(`[AppointmentService] Appointment ${id} not found.`);

    const targetStage = this.findStageById(stageId);
    if (!targetStage) throw new Error(`[AppointmentService] Stage ${stageId} not found.`);

    const previousStageId = existing.currentStageId;
    const proc = this.getAppointmentProcess();

    const updatedAppointment: Appointment = {
      ...existing,
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

    logStageMove({
      orgId: "default",
      recordType: "appointment",
      recordId: String(id),
      fromStageId: previousStageId,
      toStageId: targetStage.id,
      toStageName: targetStage.name,
      processId: proc.id,
      processName: proc.name,
      cause: cause || { type: "manual", ruleName: `Stage changed to ${targetStage.name}` },
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
