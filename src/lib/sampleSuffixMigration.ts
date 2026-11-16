/**
 * One-time clean-up of names saved by earlier builds with a trailing " (Sample)" (processes, stages, queue views,
 * automation rules, payers, templates, fields, sections, roles ...). Walks every `mantra_*` JSON value in
 * localStorage and strips the suffix from string values. Idempotent, flagged, never touches anything else.
 */
const FLAG = "mantra_strip_sample_suffix_v1";
const SUFFIX = /\s*\((?:sample|demo|mock)\)\s*$/i;

/** Display-time safety net. */
export const stripSampleSuffix = (s: string): string => (typeof s === "string" ? s.replace(SUFFIX, "") : s);

function walk(v: any): { value: any; changed: boolean } {
  if (typeof v === "string") {
    const n = v.replace(SUFFIX, "");
    return { value: n, changed: n !== v };
  }
  if (Array.isArray(v)) {
    let changed = false;
    const out = v.map((x) => { const r = walk(x); changed = changed || r.changed; return r.value; });
    return { value: changed ? out : v, changed };
  }
  if (v && typeof v === "object") {
    let changed = false;
    const out: Record<string, any> = {};
    for (const k of Object.keys(v)) { const r = walk(v[k]); changed = changed || r.changed; out[k] = r.value; }
    return { value: changed ? out : v, changed };
  }
  return { value: v, changed: false };
}

export function migrateStripSampleSuffix(force = false): { keys: number } {
  let keys = 0;
  try {
    if (!force && localStorage.getItem(FLAG) === "1") return { keys };
    const names: string[] = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith("mantra_")) names.push(k); }
    for (const k of names) {
      const raw = localStorage.getItem(k);
      if (!raw || (raw.charAt(0) !== "[" && raw.charAt(0) !== "{")) continue;
      if (!/\((?:sample|demo|mock)\)/i.test(raw)) continue;
      try {
        const r = walk(JSON.parse(raw));
        if (r.changed) { localStorage.setItem(k, JSON.stringify(r.value)); keys++; }
      } catch { /* not JSON */ }
    }
    localStorage.setItem(FLAG, "1");
  } catch { /* ignore */ }
  return { keys };
}
