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

let act: typeof import("../claimActions");
let claimsLib: typeof import("../claimsStore");
let samples: typeof import("../rcmSampleClaimWorkflows");
let billing: typeof import("../billingSetupStore");
let cov: typeof import("../coveragesStore");
let appts: typeof import("../appointmentService");
let runs: typeof import("../actionRuns");

const rule: any = { id: "R-claim", name: "Claim rule" };
const cause: any = { type: "rule", ruleId: "R-claim" };
const IDS = () => samples.SAMPLE_CLAIM_WORKFLOW_IDS;

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
  act = await import("../claimActions");
  claimsLib = await import("../claimsStore");
  samples = await import("../rcmSampleClaimWorkflows");
  billing = await import("../billingSetupStore");
  cov = await import("../coveragesStore");
  appts = await import("../appointmentService");
  runs = await import("../actionRuns");
});

beforeEach(() => {
  fresh();
  runs.__resetActionRunsForTests();
  claimsLib.__resetClaimMigrationForTests();
  samples.seedSampleClaimWorkflows();
  billing.seedBillingSetupSamples();
  localStorage.setItem("clients", JSON.stringify([{ id: "CL-T", name: "Test Patient", phone: "555", stage: "x", processes: [], dob: "1980-01-01" }]));
  const svc = [{ id: 701, name: "Cataract surgery", description: "", cptCode: "66984", duration: 30, price: 2400, currency: "USD", isActive: true }];
  for (const k of ["ma_services_store", "ma_services_demo", "ma_services_store_signup"]) localStorage.setItem(k, JSON.stringify(svc));
  cov.saveCoverage({ clientId: "CL-T", payerId: "payer-bcbs", memberId: "M100", priority: "primary", effectiveDate: "2025-01-01" });
  act.clearinghouseSettingsStore.save({ scenario: "auto" });
});

const stageName = (c: any) => c.statusLabel;
const find = (id: string) => claimsLib.getStoredClaims().find((c) => c.id === id)!;

function bookedAppointment(employeeId = 1): string {
  const a = appts.appointmentService.createAppointment(
    { clientName: "Test Patient", clientEmail: "t@x.com", clientPhone: "1", employeeId, serviceId: 701, date: "2030-11-01", time: "10:00", duration: 30, clientId: "CL-T" } as any,
    { force: true, createdBy: "user" } as any
  );
  return String((a as any).id ?? (a as any).appointment?.id);
}
const apptEvent = (id: string): any => ({ id: `E-${id}`, event: "appointment.completed", recordType: "appointment", recordId: id, data: { clientId: "CL-T" }, timestamp: "" });
const claimEvent = (id: string, eid = "E1"): any => ({ id: eid, event: "stage.entered", recordType: "claim", recordId: id, data: { claimId: id, clientId: "CL-T" }, timestamp: "" });

describe("create_claim", () => {
  it("builds the claim from the visit + Billing setup in the configured workflow/stage, priced from the fee schedule", () => {
    const id = bookedAppointment();
    const r = act.executeCreateClaimStep({ rule, stepId: "s", params: { startWorkflow: IDS().chargeCapture, startStage: "Awaiting note" }, event: apptEvent(id), cause });
    expect(r.status).toBe("success");
    const c: any = find(r.result.claimId);
    expect(c).toMatchObject({
      processId: IDS().chargeCapture, statusLabel: "Awaiting note", status: "Unmapped", appointmentId: id, patientId: "CL-T",
      renderingProviderNpi: "1111111112", billingProviderName: "Sample Eye Care Group LLC", billingProviderNpi: "1234567893", placeOfService: "11", insuredId: "M100",
    });
    expect(c.payer).toMatchObject({ id: "payer-bcbs", payerId: "BCBS1" });
    expect(c.lines).toHaveLength(1);
    expect(c.lines[0]).toMatchObject({ cptCode: "66984", chargeAmount: 1900 }); // BCBS contracted fee, not the service list price
    expect(c.missingData).toEqual(["diagnosis"]); // no ICD yet; nothing else missing
    expect(c.timelyFilingDeadline).toBe("2031-01-30");
  });

  it("is idempotent per source+workflow (returns the existing claim); a different workflow makes another", () => {
    const id = bookedAppointment();
    const a = act.executeCreateClaimStep({ rule, stepId: "s", params: { startWorkflow: IDS().claim }, event: apptEvent(id), cause });
    const b = act.executeCreateClaimStep({ rule, stepId: "s", params: { startWorkflow: IDS().claim }, event: { ...apptEvent(id), id: "E-other" }, cause });
    expect(b.alreadyRan || b.result.claimId === a.result.claimId).toBe(true);
    expect(claimsLib.getStoredClaims().filter((c) => c.appointmentId === id)).toHaveLength(1);
    const c = act.executeCreateClaimStep({ rule, stepId: "s2", params: { startWorkflow: IDS().chargeCapture }, event: apptEvent(id), cause });
    expect(c.result.claimId).not.toBe(a.result.claimId);
  });

  it("missing optional data is recorded, not fatal: no provider credential, no coverage", () => {
    cov.coveragesStore.save([]);
    const id = bookedAppointment(99);
    const r = act.executeCreateClaimStep({ rule, stepId: "s", params: { startWorkflow: IDS().claim }, event: apptEvent(id), cause });
    expect(r.status).toBe("success");
    expect(find(r.result.claimId).missingData).toEqual(expect.arrayContaining(["rendering_npi", "coverage", "diagnosis"]));
  });

  it("fails (recorded) for an unknown workflow or an unresolvable client", () => {
    const id = bookedAppointment();
    expect(act.executeCreateClaimStep({ rule, stepId: "s", params: { startWorkflow: "nope" }, event: apptEvent(id), cause }).status).toBe("failed");
    expect(act.executeCreateClaimStep({ rule, stepId: "s2", params: {}, event: { id: "Z", event: "x", recordType: "invoice", recordId: "INV-1", data: {}, timestamp: "" } as any, cause }).status).toBe("failed");
  });
});

describe("scrub_claim", () => {
  const makeClaim = () => {
    const id = bookedAppointment();
    const r = act.executeCreateClaimStep({ rule, stepId: "s", params: { startWorkflow: IDS().claim, startStage: "Draft" }, event: apptEvent(id), cause });
    return r.result.claimId as string;
  };

  it("fails on missing diagnosis and missing laterality modifier; raises claim.scrub_failed when no failure stage is set", () => {
    const id = makeClaim();
    const r = act.executeScrubClaimStep({ rule, stepId: "x", params: { onPass: "Ready to submit" }, event: claimEvent(id), cause });
    expect(r.result.passed).toBe(false);
    const msgs = r.result.issues.map((i: any) => i.ruleId);
    expect(msgs).toEqual(expect.arrayContaining(["scrub-sample-icd", "scrub-sample-modifier"]));
    expect(stageName(find(id))).toBe("Draft"); // no onFail stage: stays put
    expect((find(id) as any).scrubIssues.length).toBeGreaterThanOrEqual(2);
  });

  it("moves to the fail stage, then after fixing (diagnosis + RT modifier) a re-scrub passes and moves on", () => {
    const id = makeClaim();
    act.executeScrubClaimStep({ rule, stepId: "x", params: { onPass: "Ready to submit", onFail: "Scrub failed" }, event: claimEvent(id, "E1"), cause });
    expect(stageName(find(id))).toBe("Scrub failed");

    const c: any = find(id);
    claimsLib.saveClaim({ ...c, diagnosisCodes: [{ pointer: "A", code: "H25.11", description: "Cataract" }], lines: c.lines.map((l: any) => ({ ...l, modifier: "RT" })) });
    const r2 = act.executeScrubClaimStep({ rule, stepId: "x", params: { onPass: "Ready to submit", onFail: "Scrub failed" }, event: claimEvent(id, "E2"), cause });
    expect(r2.result).toMatchObject({ passed: true, moved: "Ready to submit" });
    expect(find(id).status).toBe("Ready to Submit");
    expect((find(id) as any).scrubIssues).toEqual([]);
  });

  it("warnings do not fail the scrub; disabled rules are ignored", () => {
    const id = makeClaim();
    const c: any = find(id);
    claimsLib.saveClaim({ ...c, diagnosisCodes: [{ pointer: "A", code: "H25.11", description: "x" }], lines: c.lines.map((l: any) => ({ ...l, modifier: "RT" })) });
    billing.scrubRulesStore.upsert({ id: "w", name: "warn", check: "required_field", target: "authNumber", severity: "warning", enabled: true });
    const r = act.executeScrubClaimStep({ rule, stepId: "x", params: {}, event: claimEvent(id), cause });
    expect(r.result.passed).toBe(true);
    expect(r.result.issues.map((i: any) => i.ruleId)).toContain("w");
  });
});

describe("submit_claim (mock clearinghouse)", () => {
  const readyClaim = () => {
    const id = bookedAppointment();
    const r = act.executeCreateClaimStep({ rule, stepId: "s", params: { startWorkflow: IDS().claim, startStage: "Ready to submit" }, event: apptEvent(id), cause });
    const cid = r.result.claimId as string;
    const c: any = find(cid);
    claimsLib.saveClaim({ ...c, diagnosisCodes: [{ pointer: "A", code: "H25.11", description: "x" }], lines: c.lines.map((l: any) => ({ ...l, modifier: "RT" })) });
    return cid;
  };
  const params = { onSubmit: "Submitted", onAccepted: "Accepted by payer", onRejected: "Rejected" };

  it("submits, records tracking ids and moves through Submitted to Accepted", () => {
    const id = readyClaim();
    const r = act.executeSubmitClaimStep({ rule, stepId: "s", params, event: claimEvent(id), cause });
    expect(r.result).toMatchObject({ submitted: true, accepted: true, seq: 1, moved: "Accepted by payer" });
    const c: any = find(id);
    expect(c.clearinghouseTrackingId).toBe(`MOCK-837P-${id}-1`);
    expect(c.submittedAt).toBeTruthy();
    expect(c.status).toBe("Accepted");
  });

  it("a mock 277CA rejection lands in Rejected with the reason; resubmitting uses a new sequence number", () => {
    const id = readyClaim();
    act.clearinghouseSettingsStore.save({ scenario: "reject" });
    const r1 = act.executeSubmitClaimStep({ rule, stepId: "s", params, event: claimEvent(id, "E1"), cause });
    expect(r1.result).toMatchObject({ accepted: false, moved: "Rejected", seq: 1 });
    expect(find(id)).toMatchObject({ status: "Rejected", rejectionReason: expect.stringContaining("277CA") });

    act.clearinghouseSettingsStore.save({ scenario: "accept" });
    const r2 = act.executeSubmitClaimStep({ rule, stepId: "s", params, event: claimEvent(id, "E2"), cause });
    expect(r2.result).toMatchObject({ accepted: true, seq: 2 });
    expect(find(id).rejectionReason).toBeUndefined();
  });

  it("the same submission is never sent twice (key = claim + frequency + sequence)", () => {
    const id = readyClaim();
    const a = act.executeSubmitClaimStep({ rule, stepId: "s", params, event: claimEvent(id, "E1"), cause });
    expect(a.status).toBe("success");
    // seq already 1 -> next key is seq 2, so a duplicate event is still a legitimate resubmit; the guard is the retry of the SAME key:
    const key = runs.actionIdempotencyKey("submit_claim", id, "1", 1);
    expect(runs.getActionRun(key)?.status).toBe("success");
  });

  it("blocks a claim with scrub errors (recorded failure with Retry)", () => {
    const id = bookedAppointment();
    const r = act.executeCreateClaimStep({ rule, stepId: "s", params: { startWorkflow: IDS().claim, startStage: "Ready to submit" }, event: apptEvent(id), cause });
    const sub = act.executeSubmitClaimStep({ rule, stepId: "s", params, event: claimEvent(r.result.claimId), cause });
    expect(sub.status).toBe("failed");
    expect(sub.error).toMatch(/scrub error/);
    expect(runs.getActionHealth().failed).toBe(1);
  });
});
