/**
 * recordWriter (Slice 2, item 2.2): one cross-record field writer for actions.
 *
 * Drawers replace their whole stored object on save, so a stale drawer can clobber a rule-written key.
 * Therefore every write here is read-modify-WRITE-MERGE, followed by the entity's change event and
 * ma_record_data_changed so open drawers refresh.
 *
 * Typed columns go through the entity's own service/store; every other key is merged into the drawer-local
 * values key (mantra_appt_fields_<id>, mantra_claim_fieldvalues_<id>, mantra_inv_fields_<id>).
 */
import { appointmentService, type Appointment } from "./appointmentService";
import { getStoredClaims, saveClaim } from "./claimsStore";
import { getStoredClients, saveStoredClients } from "./clientsStore";
import { updateProcessInstanceFields } from "./processLogsStore";

export type WritableRecordType = "appointment" | "process_instance" | "claim" | "invoice" | "client";

export interface RecordRef {
  type: WritableRecordType;
  id: string | number;
}

export interface WriteOptions {
  source?: string;
  ruleId?: string;
}

export interface WriteResult {
  ok: boolean;
  written: string[];
  error?: string;
}

const APPOINTMENT_TYPED = new Set([
  "clientName", "clientEmail", "clientPhone", "employeeId", "serviceId", "date", "time", "duration", "notes", "title",
  "serviceName", "employeeName", "description", "tags", "location", "invoiceId", "clientId",
  // RCM typed columns (added with S3.4); harmless before they exist
  "coverage", "coverageId", "financialClass", "claimId",
]);

function mergeLocal(key: string, values: Record<string, any>): string[] {
  let current: Record<string, any> = {};
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) current = parsed;
  } catch {
    current = {};
  }
  localStorage.setItem(key, JSON.stringify({ ...current, ...values }));
  return Object.keys(values);
}

function touch(eventName?: string): void {
  try {
    if (typeof window === "undefined" || typeof window.dispatchEvent !== "function" || typeof CustomEvent === "undefined") return;
    if (eventName) window.dispatchEvent(new CustomEvent(eventName));
    window.dispatchEvent(new CustomEvent("ma_record_data_changed"));
  } catch {
    /* ignore */
  }
}

const split = (values: Record<string, any>, typed: Set<string>) => {
  const t: Record<string, any> = {};
  const l: Record<string, any> = {};
  for (const [k, v] of Object.entries(values)) (typed.has(k) ? t : l)[k] = v;
  return { t, l };
};

export function writeRecordFields(ref: RecordRef, values: Record<string, any>, _opts: WriteOptions = {}): WriteResult {
  const keys = Object.keys(values || {});
  if (keys.length === 0) return { ok: true, written: [] };
  try {
    switch (ref.type) {
      case "appointment": {
        const appt = appointmentService.getAppointmentById(ref.id);
        if (!appt) return { ok: false, written: [], error: `Appointment ${ref.id} not found` };
        const { t, l } = split(values, APPOINTMENT_TYPED);
        if (Object.keys(t).length) appointmentService.updateAppointment(ref.id, t as Partial<Appointment>);
        if (Object.keys(l).length) mergeLocal(`mantra_appt_fields_${ref.id}`, l);
        touch("mantra_appointments_updated");
        return { ok: true, written: keys };
      }
      case "process_instance": {
        const row = updateProcessInstanceFields(String(ref.id), values);
        if (!row) return { ok: false, written: [], error: `Instance ${ref.id} not found` };
        touch();
        return { ok: true, written: keys };
      }
      case "claim": {
        const claim = getStoredClaims().find((c) => c.id === String(ref.id));
        if (!claim) return { ok: false, written: [], error: `Claim ${ref.id} not found` };
        const claimKeys = new Set(Object.keys(claim));
        const { t, l } = split(values, claimKeys);
        if (Object.keys(t).length) saveClaim({ ...claim, ...t } as any);
        if (Object.keys(l).length) mergeLocal(`mantra_claim_fieldvalues_${ref.id}`, l);
        touch("mantra_claims_changed");
        return { ok: true, written: keys };
      }
      case "invoice": {
        mergeLocal(`mantra_inv_fields_${ref.id}`, values);
        touch("mantra_invoices_changed");
        return { ok: true, written: keys };
      }
      case "client": {
        const clients = getStoredClients() as any[];
        if (!clients.some((c) => c.id === ref.id)) return { ok: false, written: [], error: `Client ${ref.id} not found` };
        saveStoredClients(clients.map((c) => (c.id === ref.id ? { ...c, ...values } : c)) as any);
        touch();
        return { ok: true, written: keys };
      }
    }
  } catch (e: any) {
    return { ok: false, written: [], error: String(e?.message || e) };
  }
  return { ok: false, written: [], error: `Unsupported record type ${(ref as any).type}` };
}

/** Read the drawer-local values of a record (for actions that need current values). */
export function readLocalRecordFields(type: "appointment" | "claim" | "invoice", id: string | number): Record<string, any> {
  const key = type === "appointment" ? `mantra_appt_fields_${id}` : type === "claim" ? `mantra_claim_fieldvalues_${id}` : `mantra_inv_fields_${id}`;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
