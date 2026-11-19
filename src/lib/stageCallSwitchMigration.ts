/**
 * R5-fix.6 Migration: Copy existing global voice switch to Inconclusive stage call setting.
 * Whether a payer call happens is decided ONLY by whether the Inconclusive stage call is ON and has callPurpose "payer_benefits".
 * Old switch value is migrated to stage setting; old key remains untouched in storage.
 * Logged to mantra_migration_log_v1.
 */
import { getStoredProcesses, saveStoredProcesses } from "./useProcessStore";
import { VOICE_ENABLED_KEY } from "./ruleContextFields";
import { logMigration } from "./stageCallMigration";
import { defaultCallSettings } from "./stageCallDefaults";

export const STAGE_CALL_SWITCH_MIGRATION_FLAG = "mantra_stage_call_switch_migrated_v1";

export function migrateStageCallSwitch(): { migrated: boolean; enabled?: boolean } {
  const result: { migrated: boolean; enabled?: boolean } = { migrated: false };
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem(STAGE_CALL_SWITCH_MIGRATION_FLAG) === "1") {
      return result;
    }

    const rawSwitch = typeof localStorage !== "undefined" ? localStorage.getItem(VOICE_ENABLED_KEY) : null;
    if (rawSwitch !== null) {
      const isVoiceOn = rawSwitch === "1";
      result.enabled = isVoiceOn;
      const processes = getStoredProcesses();
      let changed = false;

      const updated = processes.map((proc) => {
        let procChanged = false;
        const stages = (proc.stages || []).map((s) => {
          if (s.name?.toLowerCase() === "inconclusive") {
            procChanged = true;
            changed = true;
            const resStage = (s.callTriggerSettings as any)?.resultStage || "Pending review";
            return {
              ...s,
              enableCalling: isVoiceOn,
              callTriggerSettings: {
                ...defaultCallSettings("payer_benefits", resStage),
                ...(s.callTriggerSettings || {}),
                callPurpose: "payer_benefits" as const,
                resultStage: resStage,
              },
            };
          }
          return s;
        });
        return procChanged ? { ...proc, stages } : proc;
      });

      if (changed) {
        saveStoredProcesses(updated);
        result.migrated = true;
      }

      logMigration(
        "R5-fix.6",
        `Migrated global voice switch (${isVoiceOn ? "ON" : "OFF"}) to Inconclusive stage call setting. Global switch retired.`
      );
    }

    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STAGE_CALL_SWITCH_MIGRATION_FLAG, "1");
    }
  } catch (e) {
    console.error("[migrateStageCallSwitch] Failed:", e);
  }
  return result;
}
