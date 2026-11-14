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

let el: typeof import("../eligibility");
let run: typeof import("../runEligibility");
let seeds: typeof import("../rcmFieldSeeds");
let core: typeof import("../fieldRegistryCore");
let cov: typeof import("../coveragesStore");
let store: typeof import("../processLogsStore");
let billing: typeof import("../billingSetupStore");
let appts: typeof import("../appointmentService");
let runs: typeof import("../actionRuns");

const rule: any = { id: "R-elig", name: "Verify" };
const cause: any = { type: "rule", ruleId: "R-elig" };

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
  el = await import("../eligibility");
  run = await import("../runEligibility");
  seeds = await import("../rcmFieldSeeds");
  core = await import("../fieldRegistryCore");
  cov = await import("../coveragesStore");
  store = await import("../processLogsStore");
  billing = await import("../billingSetupStore");
  appts = await import("../appointmentService");
  runs = await import("../actionRuns");
});

beforeEach(() => {
  fresh();
  store.__resetInstanceMigrationForTests();
  runs.__resetActionRunsForTests();
  localStorage.setItem("clients", JSON.stringify([{ id: "CL-T", name: "Test Patient", stage: "x", processes: [], dob: "1980-01-01" }]));
  localStorage.setItem(
    "process_store_processes",
    JSON.stringify([
      { id: "p-cov", name: "Cov", entityType: "client", stages: ["Not checked", "Verified", "Needs fix", "Inactive", "Provider setup issue", "Inconclusive", "Self-pay"].map((n) => ({ id: "s-" + n, name: n })) },
    ])
  );
  billing.seedBillingSetupSamples();
});

const stageMap = { active: "Verified", not_found: "Needs fix", inactive: "Inactive", provider_setup: "Provider setup issue", inconclusive: "Inconclusive", no_coverage: "Self-pay" };

function apptWithInstance(date = "2030-03-01", dedupeAppt?: string) {
  const a = appts.appointmentService.createAppointment(
    { clientName: "Test Patient", clientEmail: "t@x.com", clientPhone: "1", employeeId: 1, serviceId: 1, date, time: "10:00", duration: 30, clientId: "CL-T" } as any,
    { force: true, createdBy: "user" } as any
  );
  const id = String((a as any).id ?? (a as any).appointment?.id);
  const instance = store.startProcessInstance({
    clientId: "CL-T", clientName: "Test Patient", processName: "Cov", processId: "p-cov", stageName: "Not checked",
    source: { type: "appointment", id: dedupeAppt || id, title: `Visit ${id}` },
  }).instance;
  return { id, instance };
}

const input = (id: string, instanceId: string, params: any = {}, date = "2030-03-01"): any => ({
  clientId: "CL-T", appointmentId: id, instanceId, serviceDate: date, trigger: "appointment.booked", cause, params: { stageMap, ...params },
});

describe("adapter, resolver, normalizer (pure)", () => {
  it("maps AAA codes to categories and statuses", () => {
    expect(el.resolveEligibilityResponse({ kind: "response", aaaCode: "75", source: "mock" })).toMatchObject({ status: "not_found", category: "name_dob_id", retry: true });
    expect(el.resolveEligibilityResponse({ kind: "response", aaaCode: "43", source: "mock" })).toMatchObject({ status: "provider_setup" });
    expect(el.resolveEligibilityResponse({ kind: "response", aaaCode: "95", source: "mock" })).toMatchObject({ status: "inconclusive", category: "payer_unavailable" });
    expect(el.resolveEligibilityResponse({ kind: "response", active: false, source: "mock" })).toMatchObject({ status: "inactive" });
    expect(el.resolveEligibilityResponse({ kind: "transport_error", source: "mock" })).toMatchObject({ status: "inconclusive", category: "transport" });
    expect(el.resolveEligibilityResponse({ kind: "response", aaaCode: "ZZ", source: "mock" }).status).toBe("inconclusive");
  });

  it("normalizes benefits into lines and a summary", () => {
    const res = el.mockEligibilityCheck({ payerId: "p", memberId: "M1", serviceDate: "2030-01-01", serviceTypes: ["98"] });
    const n = el.normalizeBenefits(res.benefits, ["98"]);
    expect(n.summary).toMatchObject({ copay: 30, deductibleRemaining: 600, coinsurancePercent: 20, oopRemaining: 3200 });
    expect(n.lines.length).toBe(res.benefits!.length);
  });

  it("auto scenario: member id markers and unenrolled payers drive the answer", () => {
    const base = { payerId: "p", serviceDate: "2030-01-01", serviceTypes: ["30"] };
    expect(el.mockEligibilityCheck({ ...base, memberId: "XNOTFOUND1" }).aaaCode).toBe("75");
    expect(el.mockEligibilityCheck({ ...base, memberId: "M1", payerEnrolled: false }).aaaCode).toBe("43");
    expect(el.mockEligibilityCheck({ ...base, memberId: "M1", scenario: "inactive" }).active).toBe(false);
  });
});

describe("EG1-EG5 field seeds", () => {
  it("registers process / appointment / claim groups into the module-keyed registry, idempotently", () => {
    const n1 = seeds.ensureRcmFieldSeeds();
    expect(n1).toBeGreaterThan(30);
    expect(seeds.ensureRcmFieldSeeds()).toBe(0);
    const reg = JSON.parse(localStorage.getItem(core.FIELD_REGISTRY_KEY)!);
    expect(Array.isArray(reg.process)).toBe(true);
    expect(core.getFieldByKeyPure("elig_history", "process")!.inputType).toBe("table");
    expect(core.getFieldsForModulePure("process", "proc-sample-coverage-auth").some((f) => f.key === "auth_number")).toBe(true);
    expect(core.getFieldsForModulePure("process", "some-other-process")).toHaveLength(0);
    expect(core.getFieldsForModulePure("appointment").map((f) => f.key)).toContain("elig_copay");
    expect(core.getFieldsForModulePure("claim").map((f) => f.key)).toContain("auth_status");
  });

  it("never overwrites an edited field", () => {
    seeds.ensureRcmFieldSeeds();
    const reg = JSON.parse(localStorage.getItem(core.FIELD_REGISTRY_KEY)!);
    reg.process.find((f: any) => f.key === "elig_status").label = "My label";
    localStorage.setItem(core.FIELD_REGISTRY_KEY, JSON.stringify(reg));
    seeds.ensureRcmFieldSeeds();
    expect(core.getFieldByKeyPure("elig_status", "process")!.label).toBe("My label");
  });
});

describe("run_eligibility", () => {
  it("verified: writes EG1 + history to the instance and a summary to the appointment, and moves the instance by the stage map", () => {
    cov.saveCoverage({ clientId: "CL-T", payerId: "payer-bcbs", memberId: "M100", priority: "primary", effectiveDate: "2025-01-01" });
    const { id, instance } = apptWithInstance();
    const r = run.performRunEligibility(input(id, instance.instanceId!));
    expect(r).toMatchObject({ status: "active", copied: false, payerCalls: 1, stageMoved: "Verified" });
    const row: any = store.getProcessInstanceById(instance.instanceId!);
    expect(row.currentStage).toBe("Verified");
    expect(row.elig_status).toBe("active");
    expect(row.elig_copay).toBe(30);
    expect(row.elig_history).toHaveLength(1);
    expect(row.elig_history[0]).toMatchObject({ source: "mock", status: "active" });
    const a: any = appts.appointmentService.getAppointmentById(id);
    expect(a.coverage).toMatchObject({ status: "active", instanceId: instance.instanceId });
  });

  it("not found: retries with variants (3 payer calls), lands in the mapped stage with the reason on the instance", () => {
    cov.saveCoverage({ clientId: "CL-T", payerId: "payer-bcbs", memberId: "NOTFOUNDNOTFOUND-7", priority: "primary", effectiveDate: "2025-01-01" });
    const { id, instance } = apptWithInstance();
    const r = run.performRunEligibility(input(id, instance.instanceId!));
    expect(r).toMatchObject({ status: "not_found", payerCalls: 3, stageMoved: "Needs fix", reasonCode: "75" });
    const row: any = store.getProcessInstanceById(instance.instanceId!);
    expect(row.elig_reason_category).toBe("name_dob_id");
    expect(row.elig_message).toContain("not found");
  });

  it("window: a second booking within 30 days copies the fresh result with NO new payer call; window 0 always calls", () => {
    cov.saveCoverage({ clientId: "CL-T", payerId: "payer-bcbs", memberId: "M100", priority: "primary", effectiveDate: "2025-01-01" });
    const first = apptWithInstance("2030-03-01");
    run.performRunEligibility(input(first.id, first.instance.instanceId!));

    const second = apptWithInstance("2030-03-10");
    const copied = run.performRunEligibility(input(second.id, second.instance.instanceId!, {}, "2030-03-10"));
    expect(copied).toMatchObject({ status: "active", copied: true, payerCalls: 0 });
    const row2: any = store.getProcessInstanceById(second.instance.instanceId!);
    expect(row2.elig_history[0].source).toBe("copied");
    expect(row2.currentStage).toBe("Verified");

    const third = apptWithInstance("2030-03-12");
    const forced = run.performRunEligibility(input(third.id, third.instance.instanceId!, { windowDays: 0 }, "2030-03-12"));
    expect(forced).toMatchObject({ copied: false, payerCalls: 1 });
  });

  it("only verified results are copied: a not-found result is re-checked next time", () => {
    cov.saveCoverage({ clientId: "CL-T", payerId: "payer-bcbs", memberId: "NOTFOUNDNOTFOUND-7", priority: "primary", effectiveDate: "2025-01-01" });
    const a = apptWithInstance("2030-03-01");
    run.performRunEligibility(input(a.id, a.instance.instanceId!));
    const b = apptWithInstance("2030-03-02");
    expect(run.performRunEligibility(input(b.id, b.instance.instanceId!, {}, "2030-03-02")).payerCalls).toBe(3);
  });

  it("no coverage -> no_coverage stage; scenario override -> inactive; no target -> throws", () => {
    const a = apptWithInstance();
    expect(run.performRunEligibility(input(a.id, a.instance.instanceId!))).toMatchObject({ status: "no_coverage", stageMoved: "Self-pay", payerCalls: 0 });

    cov.saveCoverage({ clientId: "CL-T", payerId: "payer-bcbs", memberId: "M100", priority: "primary", effectiveDate: "2025-01-01" });
    const b = apptWithInstance("2030-04-01");
    expect(run.performRunEligibility(input(b.id, b.instance.instanceId!, { scenario: "inactive" }, "2030-04-01"))).toMatchObject({ status: "inactive", stageMoved: "Inactive" });

    expect(() => run.performRunEligibility({ ...input("x", "y"), appointmentId: undefined, instanceId: undefined })).toThrow(/no write target/);
  });

  it("an unknown stage in the map is a recorded failure, not a silent skip; step is idempotent per event", () => {
    cov.saveCoverage({ clientId: "CL-T", payerId: "payer-bcbs", memberId: "M100", priority: "primary", effectiveDate: "2025-01-01" });
    const { id, instance } = apptWithInstance();
    const ev: any = { id: "E1", event: "appointment.booked", recordType: "appointment", recordId: id, data: { clientId: "CL-T" }, timestamp: "" };
    const bad = run.executeRunEligibilityStep({ rule, stepId: "s", params: { stageMap: { active: "No such stage" } }, event: ev, cause });
    expect(bad.status).toBe("failed");
    expect(runs.getActionHealth().failed).toBe(1);
    void instance;
    const ok = run.executeRunEligibilityStep({ rule, stepId: "s2", params: { stageMap }, event: { ...ev, id: "E2" }, cause });
    expect(ok.status).toBe("success");
    const again = run.executeRunEligibilityStep({ rule, stepId: "s2", params: { stageMap }, event: { ...ev, id: "E2" }, cause });
    expect(again.alreadyRan).toBe(true);
  });
});

describe("Verify now (S3.4)", () => {
  it("verifyAppointmentNow always calls the payer (window 0) and writes the appointment summary; preview writes nothing", async () => {
    const vn = await import("../verifyNow");
    cov.saveCoverage({ clientId: "CL-T", payerId: "payer-bcbs", memberId: "M100", priority: "primary", effectiveDate: "2025-01-01" });
    const { id, instance } = apptWithInstance("2030-07-01");
    const r1 = vn.verifyAppointmentNow(id);
    const r2 = vn.verifyAppointmentNow(id);
    expect(r1).toMatchObject({ status: "active", payerCalls: 1, copied: false });
    expect(r2).toMatchObject({ payerCalls: 1, copied: false }); // window 0 even though a fresh result exists
    expect((appts.appointmentService.getAppointmentById(id) as any).coverage.status).toBe("active");
    expect((store.getProcessInstanceById(instance.instanceId!) as any).elig_history).toHaveLength(2);

    const before = JSON.stringify(appts.appointmentService.getAppointmentById(id));
    const p = vn.previewEligibility("CL-T", "2030-07-01");
    expect(p).toMatchObject({ status: "active", mock: true });
    expect(JSON.stringify(appts.appointmentService.getAppointmentById(id))).toBe(before);
    expect(vn.previewEligibility("CL-NOPE", "2030-07-01").status).toBe("no_coverage");
  });
});
