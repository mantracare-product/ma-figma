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

import { appointmentService, hasAppointmentAutomation } from "../lib/appointmentService";
import { invoiceService, hasInvoiceAutomation, hasAppointmentInvoiceAutomation } from "../lib/invoiceService";
import { isClientAutomationRule, isAdminAutomationRule } from "../lib/useAutomationStore";

test("Consecutive appointments generate invoices when appointment+invoice automation is added", () => {
  // Clear any existing storage
  appointmentService.saveAppointments([]);
  invoiceService.saveInvoices([]);

  // Mock an automation rule in storage: "Book Appointment and Generate Invoice"
  const mockRule = {
    id: "rule-appt-inv-1",
    orgId: "default",
    name: "Book Appointment and Generate Invoice",
    entityType: "appointment",
    enabled: true,
    trigger: {
      event: "appointment.booked",
      label: "Appointment Booked",
      source: "any",
    },
    action: {
      type: "moveToStage",
      processId: "",
      stageId: "",
    },
    actions: [
      {
        id: "step-1",
        name: "Schedule Appointment",
        stepKey: "scheduleappointment",
        params: { autoGenerateInvoice: true },
      },
      {
        id: "step-2",
        name: "Generate Invoice",
        stepKey: "generate_invoice",
        params: {},
      },
    ],
  };

  localStorage.setItem("mantra_global_automation_rules_v1", JSON.stringify([mockRule]));

  // 1. Verify hasAppointmentAutomation and hasInvoiceAutomation return true (no locked banner)
  assert.equal(hasAppointmentAutomation(), true, "hasAppointmentAutomation should return true when rule exists");
  assert.equal(hasInvoiceAutomation(), true, "hasInvoiceAutomation should return true when rule exists");

  // 2. Book First Appointment
  const apt1 = appointmentService.createAppointment({
    clientName: "Jane Doe",
    clientEmail: "jane@example.com",
    clientPhone: "555-1111",
    employeeId: 1,
    serviceId: 1,
    date: "2026-10-20",
    time: "10:00",
    duration: 60,
    title: "Initial Consultation",
    source: "screen",
  });

  assert.ok(apt1.appointment, "First appointment must be created");
  assert.ok(apt1.invoiceId, "First appointment must generate an invoice");

  const inv1 = invoiceService.getInvoiceById(apt1.invoiceId!);
  assert.ok(inv1, "Invoice 1 must exist in invoice storage");
  assert.equal(inv1?.clientName, "Jane Doe");

  // 3. Book Second Appointment (simulating after resetBookingWorkflow / drawer reopened)
  const apt2 = appointmentService.createAppointment({
    clientName: "John Smith",
    clientEmail: "john@example.com",
    clientPhone: "555-2222",
    employeeId: 2,
    serviceId: 1,
    date: "2026-10-21",
    time: "11:00",
    duration: 60,
    title: "Follow-up Consultation",
    source: "screen",
  });

  assert.ok(apt2.appointment, "Second appointment must be created");
  assert.ok(apt2.invoiceId, "Second appointment must ALSO generate an invoice (not just first)");
  assert.notEqual(apt1.invoiceId, apt2.invoiceId, "Second appointment must have its own distinct invoice");

  const inv2 = invoiceService.getInvoiceById(apt2.invoiceId!);
  assert.ok(inv2, "Invoice 2 must exist in invoice storage");
  assert.equal(inv2?.clientName, "John Smith");

  // 4. Book Third Appointment
  const apt3 = appointmentService.createAppointment({
    clientName: "Alice Walker",
    clientEmail: "alice@example.com",
    clientPhone: "555-3333",
    employeeId: 1,
    serviceId: 2,
    date: "2026-10-22",
    time: "14:00",
    duration: 30,
    title: "Checkup Consultation",
    source: "screen",
  });

  assert.ok(apt3.appointment, "Third appointment must be created");
  assert.ok(apt3.invoiceId, "Third appointment must also generate an invoice");

  const inv3 = invoiceService.getInvoiceById(apt3.invoiceId!);
  assert.ok(inv3, "Invoice 3 must exist in invoice storage");
  assert.equal(inv3?.clientName, "Alice Walker");

  // Verify total invoices in storage
  const allInvoices = invoiceService.getInvoices();
  assert.equal(allInvoices.length, 3, "All 3 appointments should have generated invoices in storage");
});

test("Appointment booking does NOT generate invoice when rules only update stages (no generate_invoice action)", () => {
  // Clear existing records
  appointmentService.saveAppointments([]);
  invoiceService.saveInvoices([]);

  // Mock exact user configuration:
  // Rule 1: Appointment Booked -> Update stage
  // Rule 2: Invoice Created -> Update stage
  const rule1 = {
    id: "rule-appt-1",
    orgId: "default",
    name: "Appointment booking",
    entityType: "appointment",
    enabled: true,
    trigger: {
      event: "appointment.booked",
      label: "Appointment booked",
      source: "any",
    },
    action: {
      type: "moveToStage",
      processId: "proc-1",
      stageId: "stage-booked",
    },
    actions: [
      {
        id: "step-1",
        name: "Update to stage",
        stepKey: "update_stage",
        params: { stageId: "stage-booked" },
      },
    ],
  };

  const rule2 = {
    id: "rule-inv-1",
    orgId: "default",
    name: "Invoice Generation",
    entityType: "invoice",
    enabled: true,
    trigger: {
      event: "invoice.created",
      label: "Invoice created",
      source: "any",
    },
    action: {
      type: "moveToStage",
      processId: "proc-inv-1",
      stageId: "stage-draft",
    },
    actions: [
      {
        id: "step-1",
        name: "Update to stage",
        stepKey: "update_stage",
        params: { stageId: "stage-draft" },
      },
    ],
  };

  localStorage.setItem("mantra_global_automation_rules_v1", JSON.stringify([rule1, rule2]));

  // hasInvoiceAutomation returns true (for general invoice capability/unlock)
  assert.equal(hasInvoiceAutomation(), true, "hasInvoiceAutomation returns true because invoice rules exist");

  // hasAppointmentInvoiceAutomation must return false (no rule saying appointment -> generate invoice)
  assert.equal(hasAppointmentInvoiceAutomation(), false, "hasAppointmentInvoiceAutomation MUST return false");

  // Book an appointment without explicit generateInvoice flag
  const appt = appointmentService.createAppointment({
    clientName: "Aditya Mehta",
    clientEmail: "aditya@example.com",
    clientPhone: "555-4444",
    employeeId: 1,
    serviceId: 1,
    date: "2026-04-05",
    time: "09:00",
    duration: 60,
    title: "X-Ray Imaging",
    source: "screen",
  });

  assert.ok(appt.appointment, "Appointment must be created");
  assert.equal(appt.invoiceId, undefined, "Appointment must NOT generate an invoice!");

  const invoices = invoiceService.getInvoices();
  assert.equal(invoices.length, 0, "No invoice should have been generated in storage");
});

test("Client-built automations are separated from Admin product-level automations", () => {
  const clientRule: any = {
    id: "rule-client-1",
    name: "Client Appointment flow",
    entityType: "appointment",
    enabled: true,
    isAdmin: false,
    createdIn: "client",
    isClientCustomization: true,
    trigger: { event: "appointment.booked" },
  };

  const adminRule: any = {
    id: "rule-admin-1",
    name: "Global Clinic Scribe Workflow",
    entityType: "appointment",
    enabled: true,
    isAdmin: true,
    createdIn: "admin",
    isClientCustomization: false,
    trigger: { event: "appointment.booked" },
  };

  // Client rule must NOT match admin
  assert.equal(isAdminAutomationRule(clientRule), false, "Client rule must not be recognized as admin automation rule");
  assert.equal(isClientAutomationRule(clientRule), true, "Client rule must be recognized as client automation rule");

  // Admin rule must match admin
  assert.equal(isAdminAutomationRule(adminRule), true, "Admin rule must be recognized as admin automation rule");
  assert.equal(isClientAutomationRule(adminRule), false, "Admin rule must not be recognized as client customization");

  // Legacy/unmarked rule defaults to client personal customization
  const legacyRule: any = {
    id: "rule-legacy-1",
    name: "User created canvas rule",
    trigger: { event: "appointment.booked" },
  };
  assert.equal(isAdminAutomationRule(legacyRule), false, "Unmarked rule must not leak into admin console");
  assert.equal(isClientAutomationRule(legacyRule), true, "Unmarked rule is safely scoped as client customization");
});
