/**
 * Payment mode (R4.2): how an appointment will be paid. "insurance" (a claim) or "self_pay"; the option list is the
 * registry field `paymentMode` (editable), these two are the defaults. The default comes from the service flag
 * "Billable to insurance"; a service that is not billable is always self-pay.
 */
import { getStoredServices } from "./servicesStore";
import { getCoveragesForClient } from "./coveragesStore";
import { getStoredClients } from "./clientsStore";
import { isDemoMantraActive, isFreshWorkspace } from "./onboardingWorkspace";

export const PAYMENT_MODE_KEY = "paymentMode";
export const PAYMENT_MODE_INSURANCE = "insurance";
export const PAYMENT_MODE_SELF_PAY = "self_pay";
export const DEFAULT_PAYMENT_MODES = [
  { id: "insurance", label: "Insurance (claim)", value: "insurance" },
  { id: "self_pay", label: "Self-pay", value: "self_pay" },
];

/** The storage key the services store reads for the active workspace (demo org, fresh workspace or the shared one). */
export function activeServicesKey(): string {
  try {
    if (isDemoMantraActive()) return "ma_services_demo";
    if (isFreshWorkspace()) { const org = localStorage.getItem("mantra_active_org_id_v1"); if (org && localStorage.getItem(`ma_services_${org}`)) return `ma_services_${org}`; }
  } catch { /* ignore */ }
  return "ma_services_store";
}

const MIGRATION_FLAG = "mantra_payment_modes_migrated_v1";

export function isServiceBillable(serviceId?: number | string): boolean {
  if (serviceId === undefined || serviceId === null || serviceId === "") return false;
  const s: any = getStoredServices().find((x) => String(x.id) === String(serviceId));
  return !!s?.billableToInsurance;
}

/** Default for a service: insurance when it is billable to insurance, else self-pay. */
export const defaultPaymentModeFor = (serviceId?: number | string): string => (isServiceBillable(serviceId) ? PAYMENT_MODE_INSURANCE : PAYMENT_MODE_SELF_PAY);

export interface ResolvedPaymentMode { mode: string; unconfirmed: boolean }

const CALL_SOURCES = new Set(["inbound call", "call", "ai", "walked in", "webhook"]);

/**
 * The mode to store on a new appointment. An explicit request wins, except that a service that is not billable is
 * always self-pay. Without a request the service default applies; when the booking came through a call / receptionist
 * and nobody was asked, the mode is marked unconfirmed.
 */
export function resolvePaymentMode(input: { serviceId?: number | string; requested?: string; source?: string }): ResolvedPaymentMode {
  const billable = isServiceBillable(input.serviceId);
  if (input.requested) {
    // only a KNOWN service that is not billable forces self-pay
    const known = input.serviceId !== undefined && input.serviceId !== null && getStoredServices().some((x) => String(x.id) === String(input.serviceId));
    return { mode: billable || !known || input.requested !== PAYMENT_MODE_INSURANCE ? input.requested : PAYMENT_MODE_SELF_PAY, unconfirmed: false };
  }
  const mode = billable ? PAYMENT_MODE_INSURANCE : PAYMENT_MODE_SELF_PAY;
  return { mode, unconfirmed: CALL_SOURCES.has(String(input.source || "").toLowerCase()) };
}

/**
 * One-time migration (flag): services that already carry a CPT code or a prior-auth default are billable to insurance;
 * existing appointments get a payment mode: insurance when the client has a coverage and the service is billable, else
 * self-pay. Never touches an appointment that already has a mode. Returns what changed (also logged by the caller).
 */
export function migratePaymentModes(): { services: number; appointments: number } {
  const out = { services: 0, appointments: 0 };
  try {
    if (localStorage.getItem(MIGRATION_FLAG) === "1") return out;
    {
      const list: any[] = getStoredServices() as any[];
      let changed = false;
      for (const sv of list) {
        if (sv && sv.billableToInsurance === undefined && (sv.cptCode || sv.requiresAuthDefault !== undefined)) { sv.billableToInsurance = true; changed = true; out.services += 1; }
      }
      if (changed) localStorage.setItem(activeServicesKey(), JSON.stringify(list));
    }
    for (const store of [localStorage, sessionStorage]) {
      const araw = store.getItem("appointments_v1");
      if (!araw) continue;
      const appts = JSON.parse(araw);
      if (!Array.isArray(appts)) continue;
      let changed = false;
      const clients = getStoredClients() as any[];
      for (const a of appts) {
        if (!a || a.paymentMode) continue;
        const cid = a.clientId || clients.find((c) => c.name === a.clientName)?.id;
        const insured = !!cid && getCoveragesForClient(String(cid)).length > 0;
        a.paymentMode = insured && isServiceBillable(a.serviceId) ? PAYMENT_MODE_INSURANCE : PAYMENT_MODE_SELF_PAY;
        changed = true;
        out.appointments += 1;
      }
      if (changed) store.setItem("appointments_v1", JSON.stringify(appts));
      if (store === localStorage) continue;
    }
    localStorage.setItem(MIGRATION_FLAG, "1");
  } catch (e) {
    console.warn("[migratePaymentModes] failed:", e);
  }
  return out;
}

/** The options of the editable registry field `paymentMode` (falls back to the two defaults). */
export function getPaymentModeOptions(): Array<{ value: string; label: string }> {
  try {
    const raw = localStorage.getItem("mantra_field_registry_v1");
    const reg = raw ? JSON.parse(raw) : {};
    const list: any[] = Array.isArray(reg) ? reg : Array.isArray(reg?.appointment) ? reg.appointment : [];
    const f = list.find((x) => x && x.key === PAYMENT_MODE_KEY && (Array.isArray(reg) ? x.module === "appointment" : true));
    const opts = (f?.options || []).map((o: any) => ({ value: String(o.value ?? o.id ?? o.label), label: String(o.label ?? o.value) })).filter((o: any) => o.value);
    if (opts.length) return opts;
  } catch { /* ignore */ }
  return DEFAULT_PAYMENT_MODES.map((o) => ({ value: o.value, label: o.label }));
}
