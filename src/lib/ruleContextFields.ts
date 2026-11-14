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
