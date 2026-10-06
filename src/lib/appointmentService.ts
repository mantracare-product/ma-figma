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
import { logStageMove } from "./useAutomationStore";
import { DEFAULT_ENTITY_PROCESSES, getStoredProcesses, Process, Stage } from "./useProcessStore";
import { invoiceService } from "./invoiceService";

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
  generateInvoice?: boolean;
  lineItems?: any[];
  source?: "screen" | "call" | "webhook" | "import" | "ai";
}

const APPOINTMENTS_STORAGE_KEY = "appointments_v1";
const APPOINTMENTS_CHANGE_EVENT = "mantra_appointments_changed";

const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 1,
    clientName: "James Wilson",
    clientEmail: "james.w@example.com",
    clientPhone: "+1 (555) 123-4567",
    employeeId: 1,
    serviceId: 1,
    date: "2026-05-12",
    time: "09:00",
    duration: 60,
    status: "scheduled",
    currentStageId: "appt-1",
    statusLabel: "Booked",
    title: "Initial Consultation",
    notes: "First-time patient",
  },
  {
    id: 2,
    clientName: "Emma Brown",
    clientEmail: "emma.b@example.com",
    clientPhone: "+1 (555) 234-5678",
    employeeId: 2,
    serviceId: 2,
    date: "2026-05-12",
    time: "10:30",
    duration: 30,
    status: "scheduled",
    currentStageId: "appt-1",
    statusLabel: "Booked",
    title: "Follow-up Visit",
  },
  {
    id: 3,
    clientName: "Oliver Davis",
    clientEmail: "oliver.d@example.com",
    clientPhone: "+1 (555) 345-6789",
    employeeId: 1,
    serviceId: 4,
    date: "2026-05-13",
    time: "14:00",
    duration: 20,
    status: "scheduled",
    currentStageId: "appt-1",
    statusLabel: "Booked",
    title: "X-Ray Imaging",
  },
  {
    id: 4,
    clientName: "Sophia Martinez",
    clientEmail: "sophia.m@example.com",
    clientPhone: "+1 (555) 456-7890",
    employeeId: 5,
    serviceId: 3,
    date: "2026-05-14",
    time: "11:00",
    duration: 45,
    status: "scheduled",
    currentStageId: "appt-1",
    statusLabel: "Booked",
    title: "Dental Cleaning",
  },
];

class AppointmentService {
  private getAppointmentProcess(): Process {
    const processes = getStoredProcesses();
    const apptProc = processes.find((p) => p.entityType === "appointment");
    return apptProc || DEFAULT_ENTITY_PROCESSES.appointment;
  }

  private findStageByCategory(category: string): Stage | undefined {
    const proc = this.getAppointmentProcess();
    return proc.stages.find((s) => s.systemCategory === category) || proc.stages[0];
  }

  private findStageById(stageId: string): Stage | undefined {
    const proc = this.getAppointmentProcess();
    return proc.stages.find((s) => s.id === stageId);
  }

  public getAppointments(): Appointment[] {
    if (typeof window === "undefined") return INITIAL_APPOINTMENTS;
    try {
      const raw = sessionStorage.getItem(APPOINTMENTS_STORAGE_KEY) || localStorage.getItem(APPOINTMENTS_STORAGE_KEY);
      if (!raw) {
        this.saveAppointments(INITIAL_APPOINTMENTS);
        return INITIAL_APPOINTMENTS;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      return INITIAL_APPOINTMENTS;
    } catch {
      return INITIAL_APPOINTMENTS;
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
   * Create an appointment (One Door)
   * Moves directly into Booked stage, emits appointment.booked,
   * runs stage entry actions (e.g. idempotent invoice generation).
   */
  public createAppointment(payload: CreateAppointmentPayload): {
    appointment: Appointment;
    invoiceId?: string;
    confirmationSent: boolean;
  } {
    const all = this.getAppointments();
    const nextId = all.length > 0 ? Math.max(...all.map((a) => Number(a.id) || 0)) + 1 : 101;
    const bookedStage = this.findStageByCategory("booked") || { id: "appt-1", name: "Booked" };
    const proc = this.getAppointmentProcess();

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
      currentStageId: bookedStage.id,
      statusLabel: bookedStage.name,
      clientId: payload.clientId,
      location: payload.location,
      sessionType: payload.sessionType || "video",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Save appointment
    this.saveAppointments([newAppointment, ...all]);

    // 2. Log Stage Movement
    logStageMove({
      orgId: "default",
      recordType: "appointment",
      recordId: String(newAppointment.id),
      fromStageId: undefined,
      toStageId: bookedStage.id,
      toStageName: bookedStage.name,
      processId: proc.id,
      processName: proc.name,
      cause: {
        type: payload.source === "call" ? "intent" : payload.source ? "webhook" : "manual",
        ruleName: `Appointment Booked (${payload.source || "screen"})`,
      },
    });

    // 3. Emit appointment.booked event via eventBus
    eventBus.emit("appointment.booked", "appointment", String(newAppointment.id), {
      ...newAppointment,
      source: payload.source || "screen",
    });

    // 4. Stage Entry Action: Idempotent Invoice Generation
    let createdInvoiceId: string | undefined = undefined;
    if (payload.generateInvoice !== false) {
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
      createdInvoiceId = invoice.id;
      newAppointment.invoiceId = invoice.id;
      this.updateAppointment(newAppointment.id, { invoiceId: invoice.id });
    }

    // 5. Confirmation notification signal
    const confirmationSent = true;

    return {
      appointment: newAppointment,
      invoiceId: createdInvoiceId,
      confirmationSent,
    };
  }

  /**
   * Reschedule an appointment (One Door)
   * Updates the existing appointment record in-place without creating a duplicate record or duplicate invoice!
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

    const previousStageId = existing.currentStageId;
    const rescheduledStage = this.findStageByCategory("rescheduled") || { id: "appt-2", name: "Rescheduled" };
    const proc = this.getAppointmentProcess();

    const updatedAppointment: Appointment = {
      ...existing,
      date: newDate,
      time: newTime,
      notes: notes ? `${existing.notes ? existing.notes + " | " : ""}${notes}` : existing.notes,
      currentStageId: rescheduledStage.id,
      statusLabel: rescheduledStage.name,
      status: "scheduled",
      updatedAt: new Date().toISOString(),
    };

    const updatedList = all.map((a) => (String(a.id) === String(id) ? updatedAppointment : a));
    this.saveAppointments(updatedList);

    // Log Stage Move
    logStageMove({
      orgId: "default",
      recordType: "appointment",
      recordId: String(id),
      fromStageId: previousStageId,
      toStageId: rescheduledStage.id,
      toStageName: rescheduledStage.name,
      processId: proc.id,
      processName: proc.name,
      cause: {
        type: "manual",
        ruleName: "Appointment Rescheduled",
      },
    });

    // Emit appointment.rescheduled event
    eventBus.emit("appointment.rescheduled", "appointment", String(id), {
      ...updatedAppointment,
      previousDate: existing.date,
      previousTime: existing.time,
    });

    return updatedAppointment;
  }

  /**
   * Cancel an appointment
   */
  public cancelAppointment(id: number | string, reason?: string): Appointment {
    const all = this.getAppointments();
    const existing = all.find((a) => String(a.id) === String(id));
    if (!existing) throw new Error(`[AppointmentService] Appointment ${id} not found.`);

    const previousStageId = existing.currentStageId;
    const cancelledStage = this.findStageByCategory("cancelled") || { id: "appt-6", name: "Cancelled" };
    const proc = this.getAppointmentProcess();

    const updatedAppointment: Appointment = {
      ...existing,
      currentStageId: cancelledStage.id,
      statusLabel: cancelledStage.name,
      status: "cancelled",
      notes: reason ? `${existing.notes ? existing.notes + " | " : ""}Cancelled: ${reason}` : existing.notes,
      updatedAt: new Date().toISOString(),
    };

    this.saveAppointments(all.map((a) => (String(a.id) === String(id) ? updatedAppointment : a)));

    logStageMove({
      orgId: "default",
      recordType: "appointment",
      recordId: String(id),
      fromStageId: previousStageId,
      toStageId: cancelledStage.id,
      toStageName: cancelledStage.name,
      processId: proc.id,
      processName: proc.name,
      cause: { type: "manual", ruleName: "Appointment Cancelled" },
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
   */
  public completeAppointment(id: number | string, rating?: number): Appointment {
    const all = this.getAppointments();
    const existing = all.find((a) => String(a.id) === String(id));
    if (!existing) throw new Error(`[AppointmentService] Appointment ${id} not found.`);

    const previousStageId = existing.currentStageId;
    const completedStage = this.findStageByCategory("completed") || { id: "appt-5", name: "Completed" };
    const proc = this.getAppointmentProcess();

    const updatedAppointment: Appointment = {
      ...existing,
      currentStageId: completedStage.id,
      statusLabel: completedStage.name,
      status: "completed",
      rating: rating ?? existing.rating,
      updatedAt: new Date().toISOString(),
    };

    this.saveAppointments(all.map((a) => (String(a.id) === String(id) ? updatedAppointment : a)));

    logStageMove({
      orgId: "default",
      recordType: "appointment",
      recordId: String(id),
      fromStageId: previousStageId,
      toStageId: completedStage.id,
      toStageName: completedStage.name,
      processId: proc.id,
      processName: proc.name,
      cause: { type: "manual", ruleName: "Appointment Completed" },
    });

    eventBus.emit("appointment.completed", "appointment", String(id), updatedAppointment);

    return updatedAppointment;
  }

  /**
   * Check in an appointment
   */
  public checkInAppointment(id: number | string): Appointment {
    const all = this.getAppointments();
    const existing = all.find((a) => String(a.id) === String(id));
    if (!existing) throw new Error(`[AppointmentService] Appointment ${id} not found.`);

    const previousStageId = existing.currentStageId;
    const checkedInStage = this.findStageByCategory("checked_in") || { id: "appt-4", name: "Checked In" };
    const proc = this.getAppointmentProcess();

    const updatedAppointment: Appointment = {
      ...existing,
      currentStageId: checkedInStage.id,
      statusLabel: checkedInStage.name,
      status: "scheduled",
      updatedAt: new Date().toISOString(),
    };

    this.saveAppointments(all.map((a) => (String(a.id) === String(id) ? updatedAppointment : a)));

    logStageMove({
      orgId: "default",
      recordType: "appointment",
      recordId: String(id),
      fromStageId: previousStageId,
      toStageId: checkedInStage.id,
      toStageName: checkedInStage.name,
      processId: proc.id,
      processName: proc.name,
      cause: { type: "manual", ruleName: "Appointment Checked In" },
    });

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
