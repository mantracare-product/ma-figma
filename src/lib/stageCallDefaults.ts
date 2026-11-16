import type { CallTriggerSettings } from "./useProcessStore";

/** Stage call settings for an RCM call purpose: immediate, all day, no retries. Everything stays editable in the stage's call drawer. */
export function defaultCallSettings(purpose: "payer_benefits" | "balance_reminder" | "general", resultStage?: string): CallTriggerSettings {
  return {
    callPurpose: purpose,
    resultStage,
    timingType: "immediate",
    waitDuration: 0,
    waitUnit: "minutes",
    callingHoursType: "all_day",
    callingHoursStart: "09:00",
    callingHoursEnd: "17:00",
    timezoneMode: "lead",
    customTimezone: "",
    skipDays: [],
    blackoutDates: [],
    retryRulesEnabled: false,
    retryAttempts: 3,
    retryDelay: 5,
  } as CallTriggerSettings;
}
