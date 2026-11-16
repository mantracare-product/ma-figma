/**
 * R4.1 migration: the `start_call` automation action is gone; a call is a stage setting. For every stored rule that still
 * has a start_call step: set the equivalent call setting on the stage the rule was about (payer benefits: ON; balance
 * reminder: OFF by default), remove the step, and delete the rule when nothing is left in it. Idempotent (flag), never
 * deletes a rule that still does something else, and logs every change to mantra_migration_log_v1.
 */
import { getStoredRules, saveStoredRules } from "./useAutomationStore";
import { getStoredProcesses, saveStoredProcesses } from "./useProcessStore";
import { defaultCallSettings } from "./stageCallDefaults";

const FLAG = "mantra_stage_calls_migrated_v1";
export const MIGRATION_LOG_KEY = "mantra_migration_log_v1";

export function logMigration(phase: string, change: string): void {
  try {
    const cur = JSON.parse(localStorage.getItem(MIGRATION_LOG_KEY) || "[]");
    cur.push({ at: new Date().toISOString(), phase, change });
    localStorage.setItem(MIGRATION_LOG_KEY, JSON.stringify(cur));
  } catch { /* ignore */ }
  try { console.info(`[migration ${phase}] ${change}`); } catch { /* ignore */ }
}

const isStartCall = (k?: string) => /^start[_-]call$/i.test(k || "");

export function migrateStartCallToStageCalls(): { rulesChanged: number; rulesDeleted: number; stagesSet: number } {
  const out = { rulesChanged: 0, rulesDeleted: 0, stagesSet: 0 };
  try {
    if (localStorage.getItem(FLAG) === "1") return out;
    const rules = getStoredRules();
    const procs = getStoredProcesses();
    let procsChanged = false;
    const keep: typeof rules = [];
    let rulesTouched = false;
    for (const rule of rules) {
      const steps = rule.actions || [];
      const calls = steps.filter((s) => isStartCall(s.stepKey));
      if (calls.length === 0) { keep.push(rule); continue; }
      rulesTouched = true;
      for (const call of calls) {
        const purpose = ((call.params as any)?.purpose as "payer_benefits" | "balance_reminder") || "payer_benefits";
        // the stage the rule was about: its trigger's process/stage; a balance call on the daily invoice job goes to the invoice reminder stage
        const tp: any = rule.trigger?.params || {};
        let proc = procs.find((p) => p.id === (tp.processId || tp.triggerProcessId));
        let stage: any = proc?.stages.find((s) => s.id === (tp.stageId || tp.triggerStageId) || s.name === tp.stageName);
        if (!stage && purpose === "balance_reminder") {
          proc = procs.find((p) => p.entityType === "invoice");
          stage = proc?.stages.find((s) => /remind/i.test(s.name) && /2|two|second/i.test(s.name)) || proc?.stages.find((s) => /remind/i.test(s.name));
        }
        if (stage) {
          const resultStage = (call.params as any)?.resultStage;
          if (!stage.callTriggerSettings) {
            stage.callTriggerSettings = defaultCallSettings(purpose, resultStage);
            stage.enableCalling = purpose === "payer_benefits";
          } else {
            const cur = stage.callTriggerSettings.callPurpose;
            if (!cur || cur === "general") stage.callTriggerSettings.callPurpose = purpose;
            if (resultStage && !stage.callTriggerSettings.resultStage) stage.callTriggerSettings.resultStage = resultStage;
            if (purpose === "payer_benefits") stage.enableCalling = true;
          }
          procsChanged = true;
          out.stagesSet += 1;
          logMigration("R4.1", `Stage "${stage.name}" of "${proc?.name}": call setting ${purpose} ${stage.enableCalling ? "ON" : "OFF"} (from rule "${rule.name}")`);
        } else {
          logMigration("R4.1", `Rule "${rule.name}": no stage could be resolved for its ${purpose} call; set the call on the stage manually`);
        }
      }
      const rest = steps.filter((s) => !isStartCall(s.stepKey));
      const legacy: any = (rule as any).action;
      const legacyEmpty = !legacy || !legacy.type || legacy.type === "noop" || legacy.type === "none";
      if (rest.length === 0 && legacyEmpty) {
        out.rulesDeleted += 1;
        logMigration("R4.1", `Rule "${rule.name}" only placed a call: removed (the stage setting replaces it)`);
      } else {
        out.rulesChanged += 1;
        keep.push({ ...rule, actions: rest });
        logMigration("R4.1", `Rule "${rule.name}": removed its Start Call step`);
      }
    }
    if (procsChanged) saveStoredProcesses(procs);
    if (rulesTouched) saveStoredRules(keep);
    localStorage.setItem(FLAG, "1");
  } catch (e) {
    console.warn("[migrateStartCall] failed:", e);
  }
  return out;
}
