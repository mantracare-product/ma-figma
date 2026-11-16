import { describe, it, expect, beforeAll, beforeEach } from "vitest";

class MemStorage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  key(i: number) { return Array.from(this.m.keys())[i] ?? null; }
  getItem(k: string) { return this.m.has(k) ? (this.m.get(k) as string) : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}
let appts: typeof import("../appointmentService");
let auto: typeof import("../useAutomationStore");
let r4: typeof import("../rcmDefaultsR4");
let mw: typeof import("../moveToWorkflowAction");
let rcf: typeof import("../ruleContextFields");
let claimsLib: typeof import("../claimsStore");

beforeAll(async () => {
  (globalThis as any).localStorage = new MemStorage();
  (globalThis as any).sessionStorage = new MemStorage();
  (globalThis as any).window = { localStorage: (globalThis as any).localStorage, dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} };
  (globalThis as any).CustomEvent = class { constructor(public type: string) {} };
  await import("../ruleEngine");
  appts = await import("../appointmentService");
  auto = await import("../useAutomationStore");
  r4 = await import("../rcmDefaultsR4");
  mw = await import("../moveToWorkflowAction");
  rcf = await import("../ruleContextFields");
  claimsLib = await import("../claimsStore");
});
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem("ma_services_demo", JSON.stringify([
    { id: 1, name: "Visit", billableToInsurance: true, duration: 30, price: 10, currency: "USD", isActive: true, description: "" },
    { id: 2, name: "Cosmetic", billableToInsurance: false, duration: 30, price: 10, currency: "USD", isActive: true, description: "" },
  ]));
});

const step = (stepKey: string, params: any) => ({ id: "s1", name: stepKey, stepKey, description: "", iconKey: "zap", trigger: "stage", executionType: "wait", delayValue: 0, delayUnit: "minutes", params }) as any;
const book = (serviceId: number, extra: any = {}) =>
  appts.appointmentService.createAppointment(
    { clientName: "Pat", clientEmail: "p@x.com", clientPhone: "1", employeeId: 1, serviceId, date: "2031-02-03", time: "10:00", source: "screen", ...extra },
    { force: true, createdBy: "test" }
  ).appointment as any;

describe("appointment workflows chosen by rule", () => {
  it("seeds the Appointment via Insurance workflow once with its five stages", () => {
    expect(r4.seedAppointmentInsuranceWorkflow()).toBe(1);
    expect(r4.seedAppointmentInsuranceWorkflow()).toBe(0);
    const wf = JSON.parse(localStorage.getItem("process_store_processes")!).find((p: any) => p.id === r4.APPT_INSURANCE_WORKFLOW_ID);
    expect(wf.entityType).toBe("appointment");
    expect(wf.stages.map((s: any) => s.name)).toEqual(["Booked", "Insurance cleared", "Reminded", "Checked in", "Completed"]);
  });

  it("a rule on appointment.booked with a payment mode condition puts the appointment into the workflow; others stay in the default", () => {
    r4.seedAppointmentInsuranceWorkflow();
    auto.saveStoredRules([
      {
        id: "r-insurance", name: "Insurance visits", orgId: "default", enabled: true, entityType: "appointment", createdAt: "", updatedAt: "", action: { type: "noop" } as any,
        trigger: { event: "appointment.booked", params: {} } as any,
        conditions: [{ id: "c1", field: "paymentMode", operator: "equals", value: "insurance" } as any],
        actions: [step("move_to_workflow", { workflowId: r4.APPT_INSURANCE_WORKFLOW_NAME })],
      } as any,
    ]);
    const a = book(1);
    expect(a.paymentMode).toBe("insurance");
    expect(a.processId).toBe(r4.APPT_INSURANCE_WORKFLOW_ID);
    expect(a.statusLabel).toBe("Booked");
    const b = book(2);
    expect(b.paymentMode).toBe("self_pay");
    expect(b.processId).not.toBe(r4.APPT_INSURANCE_WORKFLOW_ID);
    const c = book(1, { paymentMode: "self_pay" });
    expect(c.processId).not.toBe(r4.APPT_INSURANCE_WORKFLOW_ID);
  });

  it("move_to_workflow moves an existing appointment to another appointment workflow, once", () => {
    r4.seedAppointmentInsuranceWorkflow();
    const a = book(1);
    const cause: any = { type: "rule", ruleId: "r" };
    const ev: any = { id: "E1", event: "appointment.booked", recordType: "appointment", recordId: String(a.id), data: {}, timestamp: "" };
    const first = mw.executeMoveToWorkflowStep({ rule: { id: "r", name: "R" } as any, params: { workflowId: r4.APPT_INSURANCE_WORKFLOW_ID, stageName: "Insurance cleared" }, event: ev, cause });
    expect(first.status).toBe("success");
    const moved: any = appts.appointmentService.getAppointmentById(a.id);
    expect(moved).toMatchObject({ processId: r4.APPT_INSURANCE_WORKFLOW_ID, statusLabel: "Insurance cleared" });
    const again = mw.performMoveAppointmentToWorkflow(String(a.id), r4.APPT_INSURANCE_WORKFLOW_ID, "Insurance cleared", cause);
    expect(again.moved).toBe(false);
  });

  it("condition fields of the linked appointment (payment mode, service, results) are available to rules on an insurance record", () => {
    const a = book(1, { paymentMode: "insurance" });
    appts.appointmentService.updateAppointment(a.id, { serviceName: "Visit" } as any);
    localStorage.setItem(`mantra_appt_fields_${a.id}`, JSON.stringify({ elig_copay: 30, auth_status: "approved" }));
    claimsLib.saveClaim({ id: "clm-x", claimNumber: "C1", patientId: "P", patientName: "Pat", appointmentId: String(a.id), payer: { id: "x", name: "X", payerId: "1", type: "Commercial" }, diagnosisCodes: [], lines: [], totalCharge: 0, amountPaid: 0, status: "Draft", createdAt: "", updatedAt: "" } as any);
    const rule: any = { enabled: true, conditions: [{ field: "paymentMode" }, { field: "elig_copay" }, { field: "auth_status" }, { field: "service" }], trigger: { event: "stage.entered" } };
    const out = rcf.linkedAppointmentFields({ id: "E", event: "stage.entered", recordType: "claim", recordId: "clm-x", data: {}, timestamp: "" } as any, [rule]);
    expect(out).toMatchObject({ paymentMode: "insurance", elig_copay: 30, auth_status: "approved", service: "Visit" });
  });
});
