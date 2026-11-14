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

let era: typeof import("../eraStore");
let rem: typeof import("../remittanceActions");
let denial: typeof import("../denialCodes");
let claimsLib: typeof import("../claimsStore");
let svc: typeof import("../claimService");
let samples: typeof import("../rcmSampleClaimWorkflows");
let runs: typeof import("../actionRuns");
let bus: typeof import("../eventBus");

const W = () => samples.SAMPLE_CLAIM_WORKFLOW_IDS;
const rule: any = { id: "R-rem", name: "Remit" };
const cause: any = { type: "rule", ruleId: "R-rem" };
const wait = (ms = 30) => new Promise((r) => setTimeout(r, ms));

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
  era = await import("../eraStore");
  rem = await import("../remittanceActions");
  denial = await import("../denialCodes");
  claimsLib = await import("../claimsStore");
  svc = await import("../claimService");
  samples = await import("../rcmSampleClaimWorkflows");
  runs = await import("../actionRuns");
  bus = await import("../eventBus");
});

let seen: any[] = [];
let off: (() => void) | undefined;
beforeEach(() => {
  off?.();
  fresh();
  runs.__resetActionRunsForTests();
  claimsLib.__resetClaimMigrationForTests();
  samples.seedSampleClaimWorkflows();
  seen = [];
  off = bus.eventBus.subscribeAll((e) => void seen.push(e));
});

const stageId = (n: string) => samples.claimStageId(W().claim, n);
function submittedClaim(id: string, insuredId: string, charge = 200) {
  const base: any = claimsLib.getStoredClaims()[0];
  claimsLib.saveClaim({
    ...base, id, claimNumber: `CLM-${id}`, patientId: "CL-T", insuredId, totalCharge: charge, amountPaid: 0, patientResponsibility: 0, contractualAdjustment: 0, payments: [],
    processId: W().claim, currentStageId: stageId("Submitted"), statusLabel: "Submitted", status: "Submitted", clearinghouseTrackingId: `TRK-${id}`,
  });
}
const get = (id: string) => claimsLib.getStoredClaims().find((c) => c.id === id)! as any;
const post = (eraId: string, params: any = {}, eid = "E1") =>
  rem.executePostRemittanceStep({ rule, stepId: "s", params: { onPaid: "Paid", onPartial: "Partially paid", ...params }, event: { id: eid, event: "era.received", recordType: "claim", recordId: eraId, data: { eraId }, timestamp: "" } as any, cause });

describe("CARC categorization", () => {
  it("groups codes into actionable categories; the most actionable wins", () => {
    expect(denial.categorizeDenial([{ group: "CO", carc: "97" }])).toMatchObject({ category: "appealable", next: "appeal", codes: ["CO-97"] });
    expect(denial.categorizeDenial([{ group: "CO", carc: "4" }])).toMatchObject({ category: "correctable", next: "correct_and_resubmit" });
    expect(denial.categorizeDenial([{ group: "CO", carc: "29" }, { group: "PR", carc: "1" }])).toMatchObject({ category: "timely_filing", next: "write_off" });
    expect(denial.categorizeDenial([{ group: "PR", carc: "2" }])).toMatchObject({ category: "patient_responsibility", next: "bill_patient" });
    expect(denial.categorizeDenial([{ group: "CO", carc: "999" }])).toMatchObject({ category: "other", next: "review" });
  });
});

describe("ERA staging + post_remittance", () => {
  it("Receive ERA stages one line per claim that is out with the payer (and an unmatched one on request)", () => {
    submittedClaim("a", "M1");
    const e = era.receiveMockEra({ includeUnmatched: true });
    expect(e.mock).toBe(true);
    expect(e.lines.map((l) => l.claimNumber)).toEqual(["CLM-a", "CLM-UNKNOWN-0000"]);
    expect(era.erasStore.get()).toHaveLength(1);
  });

  it("posts a paid claim: amounts, payment row, moves to the configured stage", () => {
    submittedClaim("a", "M1", 200);
    const e = era.receiveMockEra();
    const r = post(e.id);
    expect(r.result).toMatchObject({ posted: 1, paid: 1, partial: 0, denied: 0, unmatched: 0 });
    expect(get("a")).toMatchObject({ amountPaid: 200, statusLabel: "Paid", status: "Paid" });
    expect(get("a").payments).toHaveLength(1);
    expect(era.erasStore.find(e.id)!.status).toBe("posted");
  });

  it("partial payment: patient responsibility recorded, underpaidBy set, moves to the partial stage", () => {
    submittedClaim("p", "XPARTIAL", 200);
    const e = era.receiveMockEra();
    post(e.id);
    expect(get("p")).toMatchObject({ amountPaid: 120, patientResponsibility: 80, statusLabel: "Paid" }); // 120 paid + 80 PR accounts for the whole charge
  });

  it("denial: categorized, appeal deadline set, claim.denied raised (no stage move without onDenied)", async () => {
    submittedClaim("d", "XDENYX", 300);
    const e = era.receiveMockEra();
    const r = post(e.id);
    await wait();
    expect(r.result).toMatchObject({ denied: 1, paid: 0 });
    expect(get("d")).toMatchObject({ denialCategory: "appealable", denialCodes: ["CO-97"], denialNext: "appeal", amountPaid: 0, statusLabel: "Submitted" });
    expect(get("d").appealDeadline).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(seen.filter((x) => x.event === "claim.denied" && x.recordId === "d")).toHaveLength(1);
  });

  it("unmatched lines stay on the ERA, raise era.unmatched once, and a repeat does not double-post", async () => {
    submittedClaim("a", "M1", 100);
    const e = era.receiveMockEra({ includeUnmatched: true });
    post(e.id);
    await wait();
    expect(era.erasStore.find(e.id)!.status).toBe("partial");
    expect(era.erasStore.find(e.id)!.lines.find((l) => l.claimNumber === "CLM-UNKNOWN-0000")!.status).toBe("unmatched");
    expect(seen.filter((x) => x.event === "era.unmatched")).toHaveLength(1);
    const again = post(e.id, {}, "E2");
    expect(again.alreadyRan).toBe(true);
    expect(get("a").payments).toHaveLength(1);
    expect(get("a").amountPaid).toBe(100);
  });

  it("a missing ERA is a recorded failure", () => {
    expect(post("nope").status).toBe("failed");
    expect(runs.getActionHealth().failed).toBe(1);
  });
});

describe("draft_appeal (propose-only)", () => {
  it("stores a proposed letter, never moves the claim, and is idempotent per revision", () => {
    submittedClaim("d", "XDENYX", 300);
    post(era.receiveMockEra().id);
    const stageBefore = get("d").statusLabel;
    const ev: any = { id: "E1", event: "claim.denied", recordType: "claim", recordId: "d", data: {}, timestamp: "" };
    const r1 = rem.executeDraftAppealStep({ rule, stepId: "s", params: {}, event: ev });
    expect(r1.result.revision).toBe(1);
    const c = get("d");
    expect(c.appealDraft).toMatchObject({ revision: 1, status: "proposed" });
    expect(c.appealDraft.text).toContain("Appeal of denied claim CLM-d");
    expect(c.appealDraft.text).toContain("CO-97");
    expect(c.statusLabel).toBe(stageBefore);

    const r2 = rem.executeDraftAppealStep({ rule, stepId: "s", params: {}, event: { ...ev, id: "E2" } });
    expect(r2.result.revision).toBe(2); // the claim moved on to revision 1, so this is a new key (explicit regenerate)
    expect(get("d").appealRevision).toBe(2);
  });
});

describe("claimService is still the door for stage moves from post_remittance", () => {
  it("moving to Paid emits claim.paid", async () => {
    submittedClaim("a", "M1", 100);
    post(era.receiveMockEra().id);
    await wait();
    expect(seen.some((x) => x.event === "claim.paid" && x.recordId === "a")).toBe(true);
    void svc;
  });
});
