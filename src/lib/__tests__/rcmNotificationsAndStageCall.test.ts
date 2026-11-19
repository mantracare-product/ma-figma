import { describe, it, expect, beforeEach, beforeAll } from "vitest";

class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
  get length() { return this.m.size; }
  key(i: number) { return Array.from(this.m.keys())[i] ?? null; }
}

const mem = new MemStorage();
beforeAll(() => {
  if (typeof globalThis.localStorage === "undefined") {
    (globalThis as any).localStorage = mem;
  }
  if (typeof globalThis.sessionStorage === "undefined") {
    (globalThis as any).sessionStorage = new MemStorage();
  }
  if (typeof globalThis.window === "undefined") {
    (globalThis as any).window = {
      dispatchEvent: () => true,
      addEventListener: () => {},
      removeEventListener: () => {},
      localStorage: mem,
    };
  }
  if (typeof globalThis.Event === "undefined") {
    (globalThis as any).Event = class Event { constructor(public type: string) {} };
  }
});

import {
  isRcmNotificationEnabled,
  setRcmNotificationEnabled,
  KNOWN_RCM_NOTIFICATIONS,
} from "../rcmNotificationSettings";
import {
  migrateStageCallSwitch,
  STAGE_CALL_SWITCH_MIGRATION_FLAG,
} from "../stageCallSwitchMigration";
import {
  isInconclusiveVoiceCallEnabled,
  computeDerivedFields,
  VOICE_ENABLED_KEY,
} from "../ruleContextFields";
import { getStoredProcesses, saveStoredProcesses } from "../useProcessStore";

describe("R5-fix.6 Revenue cycle alerts and stage call switch", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("manages 5 revenue cycle alert toggles (default enabled)", () => {
    expect(KNOWN_RCM_NOTIFICATIONS).toHaveLength(5);
    for (const item of KNOWN_RCM_NOTIFICATIONS) {
      expect(isRcmNotificationEnabled(item.key)).toBe(true);
    }

    setRcmNotificationEnabled("sample-rule-A12", false);
    expect(isRcmNotificationEnabled("sample-rule-A12")).toBe(false);
    expect(isRcmNotificationEnabled("sample-rule-A14")).toBe(true);

    setRcmNotificationEnabled("sample-rule-A12", true);
    expect(isRcmNotificationEnabled("sample-rule-A12")).toBe(true);
  });

  it("migrates global voice switch to the Inconclusive stage call setting", () => {
    // Set up a process with an Inconclusive stage
    const sampleProc = {
      id: "proc-elig",
      name: "Eligibility",
      entityType: "claim" as const,
      stages: [
        {
          id: "s-inc",
          name: "Inconclusive",
          status: "active" as const,
          color: "#EAB308",
          enableCalling: false,
        },
      ],
    };
    saveStoredProcesses([sampleProc as any]);

    // Set legacy voice switch to ON ("1")
    localStorage.setItem(VOICE_ENABLED_KEY, "1");

    const res = migrateStageCallSwitch();
    expect(res.migrated).toBe(true);
    expect(res.enabled).toBe(true);
    expect(localStorage.getItem(STAGE_CALL_SWITCH_MIGRATION_FLAG)).toBe("1");

    // Inconclusive stage has enableCalling true and purpose payer_benefits
    const procs = getStoredProcesses();
    const stage = procs.flatMap((p) => p.stages || []).find((s) => s.name?.toLowerCase() === "inconclusive");
    expect(stage?.enableCalling).toBe(true);
    expect(stage?.callTriggerSettings?.callPurpose).toBe("payer_benefits");

    // isInconclusiveVoiceCallEnabled() evaluates from the stage setting
    expect(isInconclusiveVoiceCallEnabled()).toBe(true);

    // computeDerivedFields returns _voiceEnabled = "true"
    const derived = computeDerivedFields({} as any, new Set(["_voiceEnabled"]));
    expect(derived._voiceEnabled).toBe("true");

    // Idempotent migration
    const res2 = migrateStageCallSwitch();
    expect(res2.migrated).toBe(false);
  });
});
