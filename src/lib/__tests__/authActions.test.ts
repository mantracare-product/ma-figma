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

let pa: typeof import("../priorAuthRulesStore");
let auth: typeof import("../authActions");
let store: typeof import("../processLogsStore");
let cov: typeof import("../coveragesStore");
let billing: typeof import("../billingSetupStore");
let appts: typeof import("../appointmentService");
let services: typeof import("../servicesStore");
let runs: typeof import("../actionRuns");
let tasksLib: typeof import("../tasksStore");
let ctask: typeof import("../createTaskAction");

const rule: any = { id: "R-auth", name: "Auth" };
const cause: any = { type: "rule", ruleId: "R-auth" };

function fresh() {
  (globalThis as any).localStorage = new MemStorage();
  (globalThis as any).sessionStorage = new MemStorage();
  (globalThis as any).window.localStorage = (globalThis as any).localStorage;
  (globalThis as any).window.sessionStorage = (globalThis as any).sessionStorage;
}

beforeAll(async () => {
  (globalThis as any).window = { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} };
  (globalThis as any).CustomEvent = class { constructor(public type: string) {} };
  fresh();
  pa = await import("../priorAuthRulesStore");
  auth = await import("../authActions");
  store = await import("../processLogsStore");
  cov = await import("../coveragesStore");
  billing = await import("../billingSetupStore");
  appts = await import("../appointmentService");
  services = await import("../servicesStore");
  runs = await import("../actionRuns");
  tasksLib = await import("../tasksStore");
  ctask = await import("../createTaskAction");
});

beforeEach(() => {
  fresh();
  store.__resetInstanceMigrationForTests();
  runs.__resetActionRunsForTests();
  localStorage.setItem("clients", JSON.stringify([{ id: "CL-T", name: "Test Patient", stage: "x", processes: [] }]));
  localStorage.setItem(
    "process_store_processes",
    JSON.stringify([{ id: "p-cov", name: "Cov", entityType: "client", stages: ["Not checked", "Auth required", "Auth submitted", "Verified"].map((n) => ({ id: "s-" + n, name: n })) }])
  );
  billing.seedBillingSetupSamples();
  pa.seedPriorAuthRuleSamples();
  // a service the sample rule table marks as needing auth with BCBS: CPT 70553
  const svcRows = ([
    { id: 701, name: "MRI brain", description: "", cptCode: "70553", duration: 30, price: 1, currency: "USD", isActive: true },
    { id: 702, name: "Office visit", description: "", cptCode: "99214", duration: 30, price: 1, currency: "USD", isActive: true },
  ]);
  // loadServices reads a different key depending on the demo/fresh workspace mode: set all of them
  for (const k of ["ma_services_store", "ma_services_demo", "ma_services_store_signup"]) localStorage.setItem(k, JSON.stringify(svcRows));
  void services;
  cov.saveCoverage({ clientId: "CL-T", payerId: "payer-bcbs", memberId: "M1", priority: "primary", effectiveDate: "2025-01-01" });
});

function book(serviceId: number, withInstance: boolean, date = "2030-05-01") {
  const a = appts.appointmentService.createAppointment(
    { clientName: "Test Patient", clientEmail: "t@x.com", clientPhone: "1", employeeId: 1, serviceId, date, time: "10:00", duration: 30, clientId: "CL-T" } as any,
    { force: true, createdBy: "user" } as any
  );
  const id = String((a as any).id ?? (a as any).appointment?.id);
  const instance = withInstance
    ? store.startProcessInstance({ clientId: "CL-T", clientName: "Test Patient", processName: "Cov", processId: "p-cov", stageName: "Not checked", source: { type: "appointment", id, title: `Visit ${id}` } }).instance
    : undefined;
  const event: any = { id: `E-${id}`, event: "appointment.booked", recordType: "appointment", recordId: id, data: { clientId: "CL-T" }, timestamp: "" };
  return { id, instance, event };
}

describe("priorAuthRulesStore", () => {
  it("seeds the 8 sample rows idempotently and resolves rule > service default > unknown", () => {
    expect(pa.getRules()).toHaveLength(8);
    expect(pa.seedPriorAuthRuleSamples()).toBe(0);
    expect(pa.isAuthRequired("payer-bcbs", { cptCode: "70553" })).toMatchObject({ required: true, source: "rule" });
    expect(pa.isAuthRequired("payer-bcbs", { cptCode: "70553" }).rule).toMatchObject({ units: 1, validityDays: 60 });
    expect(pa.isAuthRequired("payer-bcbs", { cptCode: "99214" })).toMatchObject({ required: false, source: "rule" });
    expect(pa.isAuthRequired("payer-bcbs", { cptCode: "00000", requiresAuthDefault: true })).toMatchObject({ required: true, source: "service_default" });
    expect(pa.isAuthRequired("payer-bcbs", { cptCode: "00000" })).toMatchObject({ required: "unknown", source: "none" });
    expect(pa.isAuthRequired(undefined, { cptCode: "70553" }).required).toBe("unknown");
  });
});

describe("check_auth_required / request_prior_auth", () => {
  it("writes to the instance AND the appointment; maps the stage; records a history row", () => {
    const { id, instance, event } = book(701, true);
    const r = auth.executeAuthStep({ kind: "check", rule, stepId: "s1", params: { stageMap: { required: "Auth required" } }, event, cause });
    expect(r.status).toBe("success");
    expect(r.result).toMatchObject({ required: true, ruleId: "pa-sample-bcbs-70553", stageMoved: "Auth required" });
    const row: any = store.getProcessInstanceById(instance!.instanceId!);
    expect(row.auth_required).toBe(true);
    expect(row.auth_status).toBe("required");
    expect(row.currentStage).toBe("Auth required");
    expect(row.elig_history).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(`mantra_appt_fields_${id}`)!)).toMatchObject({ auth_required: true, auth_status: "required" });
  });

  it("A10 fallback: with NO instance it writes the appointment only, reports targetFallback, and does NOT create an instance", () => {
    const { id, event } = book(701, false);
    const r = auth.executeAuthStep({ kind: "check", rule, stepId: "s1", params: {}, event, cause });
    expect(r.status).toBe("success");
    expect(r.result).toMatchObject({ required: true, targetFallback: "appointment", appointmentId: id });
    expect(r.result.instanceId).toBeUndefined();
    expect(store.getProcessInstances().filter((i) => i.source?.type === "appointment" && String(i.source.id) === id)).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem(`mantra_appt_fields_${id}`)!).auth_status).toBe("required");

    const req = auth.executeAuthStep({ kind: "request", rule, stepId: "s2", params: {}, event, cause });
    expect(req.result).toMatchObject({ targetFallback: "appointment" });
    expect(store.getProcessInstances().filter((i) => i.source?.type === "appointment" && String(i.source.id) === id)).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem(`mantra_appt_fields_${id}`)!)).toMatchObject({ auth_status: "requested", auth_valid_from: "2030-05-01" });
  });

  it("request: records Authorization fields with validity from the rule, moves the instance, and is idempotent per patient/payer/service/date", () => {
    const { instance, event } = book(701, true);
    const r1 = auth.executeAuthStep({ kind: "request", rule, stepId: "s2", params: { stageMap: { requested: "Auth submitted" } }, event, cause });
    expect(r1.result).toMatchObject({ required: true, validFrom: "2030-05-01", validTo: "2030-06-30", stageMoved: "Auth submitted" });
    const row: any = store.getProcessInstanceById(instance!.instanceId!);
    expect(row).toMatchObject({ auth_status: "requested", auth_valid_to: "2030-06-30" });
    const again = auth.executeAuthStep({ kind: "request", rule, stepId: "s2", params: {}, event: { ...event, id: "E-other" }, cause });
    expect(again.alreadyRan).toBe(true);
    expect((store.getProcessInstanceById(instance!.instanceId!) as any).elig_history).toHaveLength(1);
  });

  it("request is a no-op for a service that needs no auth; unknown payer rules are recorded as unknown", () => {
    const noAuth = book(702, true);
    const r = auth.executeAuthStep({ kind: "request", rule, stepId: "s2", params: {}, event: noAuth.event, cause });
    expect(r.result).toMatchObject({ required: false, skipped: true });
    expect((store.getProcessInstanceById(noAuth.instance!.instanceId!) as any).auth_status).toBeUndefined();

    pa.priorAuthRulesStore.save([]);
    const c = auth.executeAuthStep({ kind: "check", rule, stepId: "s1", params: {}, event: noAuth.event, cause });
    expect(c.result).toMatchObject({ required: "unknown", source: "none" });
    expect((store.getProcessInstanceById(noAuth.instance!.instanceId!) as any).auth_status).toBe("unknown");
  });

  it("create_task linkTo instance_if_present ties the task to the instance's current stage, else to the appointment", () => {
    localStorage.setItem("mantra_tasks_store", JSON.stringify([]));
    const withInst = book(701, true);
    auth.executeAuthStep({ kind: "check", rule, stepId: "s1", params: { stageMap: { required: "Auth required" } }, event: withInst.event, cause });
    ctask.executeCreateTaskStep({ rule, stepId: "t1", params: { title: "Prior auth", queue: "Prior auth", linkTo: "instance_if_present" }, event: withInst.event });
    const t1 = tasksLib.getStoredTasks().find((t) => t.entityRef)!;
    expect(t1.entityRef).toMatchObject({ type: "process_instance", instanceId: withInst.instance!.instanceId, stageId: "s-Auth required" });

    const without = book(701, false, "2030-06-01");
    ctask.executeCreateTaskStep({ rule, stepId: "t1", params: { title: "Prior auth", queue: "Prior auth", linkTo: "instance_if_present" }, event: without.event });
    const t2 = tasksLib.getStoredTasks().filter((t) => t.entityRef)[0];
    expect(t2.entityRef).toMatchObject({ type: "appointment", id: without.id });
  });
});
