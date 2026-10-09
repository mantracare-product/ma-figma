import test from "node:test";
import assert from "node:assert/strict";

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

import { appointmentService, isSampleAppointment } from "../lib/appointmentService";
import { SAMPLE_CLIENT_NAMES } from "../lib/invoiceService";

test("Appointment booking retention - newly booked appointments are not purged even if client name matches seed list", () => {
  // Clear any existing
  appointmentService.saveAppointments([]);
  assert.equal(appointmentService.getAppointments().length, 0);

  // Pick client names from the standard SAMPLE_CLIENT_NAMES set
  const sampleNames = Array.from(SAMPLE_CLIENT_NAMES);
  const client1 = sampleNames[0] || "Sarah Johnson";
  const client2 = sampleNames[1] || "Amanda Clark";
  const client3 = "Brand New Custom Client";

  // 1. Book first appointment
  const apt1Res = appointmentService.createAppointment({
    clientName: client1,
    clientEmail: "sarah@example.com",
    clientPhone: "123-456-7890",
    employeeId: 1,
    serviceId: 1,
    date: "2026-10-15",
    time: "10:00",
    duration: 60,
    title: "Consultation with Sarah",
    source: "screen",
  });
  assert.ok(apt1Res.appointment, "Appointment 1 should be created");
  assert.equal(apt1Res.appointment.clientName, client1);
  assert.ok(apt1Res.appointment.processId, "Appointment should have valid processId");
  assert.ok(apt1Res.appointment.currentStageId, "Appointment should have valid currentStageId");
  assert.ok(apt1Res.appointment.statusLabel, "Appointment should have valid statusLabel");

  // Verify not identified as sample
  assert.equal(isSampleAppointment(apt1Res.appointment), false, "Newly booked appointment must NOT be flagged as sample");

  // 2. Book second appointment
  const apt2Res = appointmentService.createAppointment({
    clientName: client2,
    clientEmail: "amanda@example.com",
    clientPhone: "987-654-3210",
    employeeId: 2,
    serviceId: 2,
    date: "2026-10-16",
    time: "11:00",
    duration: 30,
    title: "Follow-up with Amanda",
    source: "screen",
  });
  assert.ok(apt2Res.appointment, "Appointment 2 should be created");

  // 3. Book third appointment
  const apt3Res = appointmentService.createAppointment({
    clientName: client3,
    clientEmail: "new@example.com",
    clientPhone: "555-555-5555",
    employeeId: 1,
    serviceId: 1,
    date: "2026-10-17",
    time: "14:00",
    duration: 60,
    title: "New consultation",
    source: "screen",
  });
  assert.ok(apt3Res.appointment, "Appointment 3 should be created");

  // Retrieve appointments and verify all 3 persist
  const allAppointments = appointmentService.getAppointments();
  assert.equal(allAppointments.length, 3, "All 3 booked appointments must be present in storage and not deleted");

  const names = allAppointments.map((a) => a.clientName);
  assert.ok(names.includes(client1), `Expected ${client1} to be in appointments`);
  assert.ok(names.includes(client2), `Expected ${client2} to be in appointments`);
  assert.ok(names.includes(client3), `Expected ${client3} to be in appointments`);

  // Verify process matching logic
  const procId = apt1Res.appointment.processId;
  const filtered = allAppointments.filter((a) => a.processId === procId || (!a.processId && false));
  assert.equal(filtered.length, 3, "All appointments should match the process ID");

  console.log("✓ Multiple appointments booked and verified persistent with correct process, stage, and metadata!");
});
