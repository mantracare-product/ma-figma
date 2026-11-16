/**
 * Derived condition fields for the rule engine (fields starting with "_"). They are computed from the record context
 * when an enabled rule's conditions mention them, and merged into event.data so ordinary conditions can use them:
 *   _hasCoverage          "true" | "false"  - the client has a coverage in force on the service date
 *   _voiceEnabled         "true" | "false"  - the clinic turned on voice calls for RCM (localStorage flag)
 *   _daysSinceLastCheck   number            - days since the last eligibility check (999 = never checked)
 */
import type { BusEvent } from "./eventBus";
import type { AutomationRule } from "./useAutomationStore";
import { resolveRecordContext } from "./recordContext";
import { getCoverageOn } from "./coveragesStore";
import { readLocalRecordFields } from "./recordWriter";

export const VOICE_ENABLED_KEY = "mantra_rcm_voice_enabled";

export function derivedFieldsNeeded(rules: AutomationRule[]): Set<string> {
  const needed = new Set<string>();
  for (const r of rules) {
    if (!r.enabled) continue;
    const txt = JSON.stringify(r.conditions || []);
    for (const f of ["_hasCoverage", "_voiceEnabled", "_daysSinceLastCheck"]) if (txt.includes(`"${f}"`)) needed.add(f);
  }
  return needed;
}

export function computeDerivedFields(event: BusEvent, needed: Set<string>): Record<string, any> {
  const out: Record<string, any> = {};
  if (needed.size === 0) return out;
  if (needed.has("_voiceEnabled")) {
    let on = false;
    try {
      on = localStorage.getItem(VOICE_ENABLED_KEY) === "1";
    } catch {
      /* ignore */
    }
    out._voiceEnabled = String(on);
  }
  if (needed.has("_hasCoverage") || needed.has("_daysSinceLastCheck")) {
    const ctx = resolveRecordContext(event);
    if (needed.has("_hasCoverage")) {
      const date = ctx.appointment?.date || new Date().toISOString().slice(0, 10);
      out._hasCoverage = String(!!(ctx.clientId && getCoverageOn(ctx.clientId, date, "primary")));
    }
    if (needed.has("_daysSinceLastCheck")) {
      const instanceChecked = (ctx.instance as any)?.elig_checked_at as string | undefined;
      const apptChecked = ctx.appointmentId ? (readLocalRecordFields("appointment", ctx.appointmentId).elig_checked_at as string | undefined) : undefined;
      const last = instanceChecked || apptChecked;
      out._daysSinceLastCheck = last && Number.isFinite(Date.parse(last)) ? (Date.now() - Date.parse(last)) / 86400000 : 999;
    }
  }
  return out;
}

/**
 * Condition fields of the LINKED APPOINTMENT (R4.3): a rule on a claim / insurance record can test the appointment's
 * payment mode, service, provider, channel and its registry values (copay, deductible remaining, plan end date, auth
 * status, units ...). Only keys the rule actually uses are merged and the event's own data always wins.
 */
export function linkedAppointmentFields(event: BusEvent, rules: AutomationRule[]): Record<string, any> {
  const keys = new Set<string>();
  for (const r of rules) {
    for (const c of [...(r.conditions || []), ...(((r.trigger?.params as any)?.triggerConditions as any[]) || [])]) {
      const k = (c as any)?.field || (c as any)?.fieldKey;
      if (k && typeof k === "string" && !k.startsWith("_")) keys.add(k);
    }
  }
  if (keys.size === 0) return {};
  const ctx = resolveRecordContext(event);
  const appt: any = ctx.appointment;
  if (!appt) return {};
  const local = readLocalRecordFields("appointment", appt.id) || {};
  const typed: Record<string, any> = {
    ...appt,
    payment_mode: appt.paymentMode,
    service: appt.serviceName,
    provider: appt.employeeName,
    channel: appt.source,
    appointment_date: appt.date,
    appointment_time: appt.time,
  };
  const out: Record<string, any> = {};
  for (const k of keys) {
    if ((event.data as any)?.[k] !== undefined) continue;
    const v = typed[k] ?? (local as any)[k];
    if (v !== undefined) out[k] = v;
  }
  return out;
}
