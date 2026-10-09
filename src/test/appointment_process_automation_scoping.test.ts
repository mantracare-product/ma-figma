// Setup browser mock environment for Node
class MockStorage {
  private store: Record<string, string> = {};
  getItem(key: string) { return this.store[key] ?? null; }
  setItem(key: string, val: string) { this.store[key] = String(val); }
  removeItem(key: string) { delete this.store[key]; }
  clear() { this.store = {}; }
}

(global as any).window = {
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
};
(global as any).sessionStorage = new MockStorage();
(global as any).localStorage = new MockStorage();
(global as any).CustomEvent = class CustomEvent {
  type: string;
  detail: any;
  constructor(type: string, opts?: any) {
    this.type = type;
    this.detail = opts?.detail;
  }
};

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import {
  appointmentService,
  findMatchingAppointmentBookingRule,
} from "../lib/appointmentService";
import { saveStoredRules, AutomationRule } from "../lib/useAutomationStore";
import { saveStoredProcesses, Process } from "../lib/useProcessStore";

describe("Appointment Process Automation Scoping & Condition Triggering", () => {
  const defaultProcess: Process = {
    id: "process-appointment-default",
    name: "Appointment Flow",
    description: "Default appointment lifecycle",
    assignedToUserId: 1,
    entityType: "appointment",
    aiSettings: { platform: "OpenAI", voiceSpeed: 1.0 },
    stages: [
      { id: "appt-1", name: "Booked", description: "", status: "active", systemCategory: "booked" },
      { id: "appt-2", name: "Completed", description: "", status: "active", systemCategory: "completed" },
    ],
  };

  const cataractProcess: Process = {
    id: "proc-cataract-custom",
    name: "New cataract appointment",
    description: "Cataract surgery lifecycle",
    assignedToUserId: 1,
    entityType: "appointment",
    aiSettings: { platform: "OpenAI", voiceSpeed: 1.0 },
    stages: [
      { id: "stg-cat-booked", name: "Appointment Booked", description: "", status: "active", systemCategory: "booked" },
      { id: "stg-cat-preop", name: "Pre-Op Prep", description: "", status: "active" },
      { id: "stg-cat-done", name: "Completed", description: "", status: "active", systemCategory: "completed" },
    ],
  };

  beforeEach(() => {
    saveStoredProcesses([defaultProcess, cataractProcess]);
    // Clear appointments
    appointmentService.saveAppointments([]);
  });

  it("identifies matching automation rule for appointment booking with process and stage", () => {
    const cataractRule: AutomationRule = {
      id: "rule-cataract-1",
      orgId: "default",
      name: "Booked -> Cataract Process Stage",
      entityType: "appointment",
      enabled: true,
      trigger: {
        event: "appointment.booked",
      },
      action: {
        type: "moveToStage",
        processId: "proc-cataract-custom",
        stageId: "stg-cat-booked",
      },
    };

    saveStoredRules([cataractRule]);

    const match = findMatchingAppointmentBookingRule({
      clientName: "Ahmed Al-Mansoori",
      title: "Cataract Consultation",
      serviceId: 1,
    });

    assert.ok(match, "Should find a matching rule");
    assert.strictEqual(match.targetProcessId, "proc-cataract-custom");
    assert.strictEqual(match.targetStageId, "stg-cat-booked");
  });

  it("creates appointment in the targeted process ONLY and not default entity process", () => {
    const cataractRule: AutomationRule = {
      id: "rule-cataract-1",
      orgId: "default",
      name: "Booked -> Cataract Process Stage",
      entityType: "appointment",
      enabled: true,
      trigger: {
        event: "appointment.booked",
      },
      action: {
        type: "moveToStage",
        processId: "proc-cataract-custom",
        stageId: "stg-cat-booked",
      },
    };

    saveStoredRules([cataractRule]);

    const res = appointmentService.createAppointment({
      clientName: "Ahmed Al-Mansoori",
      clientEmail: "ahmed@example.com",
      clientPhone: "1234567890",
      employeeId: 1,
      date: "2026-10-15",
      time: "09:00",
      title: "Initial Consultation",
      source: "screen",
    });

    assert.ok(res.appointment, "Appointment should be created");
    assert.strictEqual(res.appointment.processId, "proc-cataract-custom", "Must be assigned to Cataract process only");
    assert.strictEqual(res.appointment.currentStageId, "stg-cat-booked", "Must have Cataract stage");
    assert.notStrictEqual(res.appointment.processId, "process-appointment-default", "Must NOT be assigned to default flow");
  });

  it("evaluates condition triggers when choosing which process gets the appointment", () => {
    const cataractRule: AutomationRule = {
      id: "rule-cataract-cond",
      orgId: "default",
      name: "Cataract Condition Rule",
      entityType: "appointment",
      enabled: true,
      trigger: {
        event: "appointment.booked",
      },
      conditions: [
        {
          id: "c-1",
          field: "serviceId",
          op: "equals",
          value: 99, // Special cataract service
        },
      ],
      action: {
        type: "moveToStage",
        processId: "proc-cataract-custom",
        stageId: "stg-cat-booked",
      },
    };

    saveStoredRules([cataractRule]);

    // 1. Booking with different service (should NOT match cataract rule, falls back to default)
    const generalRes = appointmentService.createAppointment({
      clientName: "General Patient",
      clientEmail: "gen@example.com",
      clientPhone: "111",
      employeeId: 1,
      serviceId: 1,
      date: "2026-10-15",
      time: "10:00",
      source: "screen",
    });

    assert.strictEqual(generalRes.appointment.processId, "process-appointment-default");

    // 2. Booking with serviceId === 99 (matches condition, gets cataract process)
    const cataractRes = appointmentService.createAppointment({
      clientName: "Cataract Patient",
      clientEmail: "cat@example.com",
      clientPhone: "222",
      employeeId: 1,
      serviceId: 99,
      date: "2026-10-15",
      time: "11:00",
      source: "screen",
    });

    assert.strictEqual(cataractRes.appointment.processId, "proc-cataract-custom");
    assert.strictEqual(cataractRes.appointment.currentStageId, "stg-cat-booked");
  });

  it("updates processId properly when moveToStage is called across processes", () => {
    const res = appointmentService.createAppointment({
      clientName: "Test Patient",
      clientEmail: "test@example.com",
      clientPhone: "333",
      employeeId: 1,
      date: "2026-10-15",
      time: "12:00",
      source: "screen",
    });

    // Move to Cataract process stage
    const updated = appointmentService.moveToStage(res.appointment.id, "stg-cat-preop", {
      type: "rule",
      ruleName: "Manual or Rule move",
      processId: "proc-cataract-custom",
    });

    assert.strictEqual(updated.processId, "proc-cataract-custom", "ProcessId must update to the new process");
    assert.strictEqual(updated.currentStageId, "stg-cat-preop");
  });
});
