import { describe, it, expect } from "vitest";
import { isProcessInstanceRow, initialPatientCareJourneyLogs } from "../processLogsStore";

describe("isProcessInstanceRow (call-list separation)", () => {
  it("uses the explicit kind when present", () => {
    expect(isProcessInstanceRow({ id: "CALL-001", kind: "process_instance" })).toBe(true);
    expect(isProcessInstanceRow({ id: "PRC-X-1", kind: "call" })).toBe(false);
  });

  it("classifies legacy process rows by their old id shapes", () => {
    expect(isProcessInstanceRow({ id: "PRC-CL-001" })).toBe(true);
    expect(isProcessInstanceRow({ id: "CALL-PATIENT-INTAKE" })).toBe(true); // old fallback creator
  });

  it("keeps real calls (numeric ids), even when they carry a process name", () => {
    expect(isProcessInstanceRow({ id: "CALL-001" })).toBe(false);
    expect(isProcessInstanceRow({ id: "CALL-0211" })).toBe(false);
  });

  it("stamps the seeded Patient Care Journey rows as process instances", () => {
    expect(initialPatientCareJourneyLogs.length).toBeGreaterThan(0);
    expect(initialPatientCareJourneyLogs.every((l) => l.kind === "process_instance")).toBe(true);
  });
});
