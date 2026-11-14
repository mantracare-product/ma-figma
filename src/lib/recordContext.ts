/**
 * resolveRecordContext (Slice 2, item 2.2): what the engine never provided - the client, the process instance
 * and the linked appointment for an event, so actions can write to the right records.
 */
import type { BusEvent } from "./eventBus";
import { appointmentService, type Appointment } from "./appointmentService";
import { getStoredClients } from "./clientsStore";
import { getProcessInstanceById, getProcessInstances, type CallLog } from "./processLogsStore";

export interface RecordContext {
  clientId?: string;
  client?: any;
  /** The instance the event is about (event.data.instanceId / recordId), else the one created for the appointment. */
  instance?: CallLog;
  appointment?: Appointment;
  appointmentId?: string;
}

export function findClientByRef(ref?: string | null): any | undefined {
  const q = String(ref || "").trim().toLowerCase();
  if (!q) return undefined;
  const clients = getStoredClients() as any[];
  return clients.find((c) => c.id === ref) || clients.find((c) => String(c.name || "").trim().toLowerCase() === q);
}

/** Instances whose source is the given appointment, newest first. */
export function instancesForAppointment(appointmentId: string | number, processId?: string): CallLog[] {
  return getProcessInstances()
    .filter(
      (i) =>
        i.source?.type === "appointment" &&
        String(i.source.id) === String(appointmentId) &&
        (!processId || i.processId === processId || i.process === processId)
    )
    .sort((a, b) => String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date)));
}

export function resolveRecordContext(event: BusEvent, opts?: { processId?: string }): RecordContext {
  const ctx: RecordContext = {};
  const data = event.data || {};

  const instanceRef = data.instanceId
    ? String(data.instanceId)
    : event.recordType === "client" && getProcessInstanceById(String(event.recordId))
    ? String(event.recordId)
    : undefined;
  if (instanceRef) ctx.instance = getProcessInstanceById(instanceRef);

  if (event.recordType === "appointment") {
    ctx.appointmentId = String(event.recordId);
    ctx.appointment = appointmentService.getAppointmentById(event.recordId);
  } else if (data.appointmentId) {
    ctx.appointmentId = String(data.appointmentId);
    ctx.appointment = appointmentService.getAppointmentById(data.appointmentId);
  } else if (ctx.instance?.source?.type === "appointment") {
    ctx.appointmentId = String(ctx.instance.source.id);
    ctx.appointment = appointmentService.getAppointmentById(ctx.appointmentId);
  }

  const clientRef =
    data.clientId ||
    ctx.instance?.clientId ||
    ctx.appointment?.clientId ||
    (event.recordType === "client" && !ctx.instance ? String(event.recordId) : undefined) ||
    ctx.appointment?.clientName;
  const client = findClientByRef(clientRef);
  ctx.client = client;
  ctx.clientId = client?.id || (clientRef ? String(clientRef) : undefined);

  if (!ctx.instance && ctx.appointmentId) {
    ctx.instance = instancesForAppointment(ctx.appointmentId, opts?.processId)[0];
  }
  return ctx;
}
