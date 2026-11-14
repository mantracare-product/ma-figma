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

let sb: typeof import("../sampleBundles");
let claimsLib: typeof import("../claimsStore");
let samples: typeof import("../rcmSampleClaimWorkflows");
let era: typeof import("../eraStore");
let tasks: typeof import("../tasksStore");
let auto: typeof import("../useAutomationStore");
let jobs: typeof import("../rcmJobs");
let invSvc: typeof import("../invoiceService");
let ifc: typeof import("../invoiceFromClaim");
let csc: typeof import("../claimStatusAndCalls");
let convs: typeof import("../useConversations");
let runs: typeof import("../actionRuns");
let ar: typeof import("../claimActions");

const W = () => samples.SAMPLE_CLAIM_WORKFLOW_IDS;
const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));
const rule: any = { id: "R-m", name: "M" };
const cause: any = { type: "rule", ruleId: "R-m" };

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
  await import("../ruleEngine");
  await import("../sampleBundlesRegistry");
  await import("../sampleRuleSets");
  sb = await import("../sampleBundles");
  claimsLib = await import("../claimsStore");
  samples = await import("../rcmSampleClaimWorkflows");
  era = await import("../eraStore");
  tasks = await import("../tasksStore");
  auto = await import("../useAutomationStore");
  jobs = await import("../rcmJobs");
  invSvc = await import("../invoiceService");
  ifc = await import("../invoiceFromClaim");
  csc = await import("../claimStatusAndCalls");
  convs = await import("../useConversations");
  runs = await import("../actionRuns");
  ar = await import("../claimActions");
});

beforeEach(() => {
  fresh();
  runs.__resetActionRunsForTests();
  claimsLib.__resetClaimMigrationForTests();
  ar.clearinghouseSettingsStore.save({ scenario: "auto" });
  localStorage.setItem("clients", JSON.stringify([{ id: "CL-T", name: "Test Patient", phone: "555", contactType: "Client", stage: "x", processes: [], consents: { sms: true, voice: true } }]));
  localStorage.setItem("mantra_tasks_store", JSON.stringify([]));
  sb.loadSampleTemplates();
});

const stageId = (proc: string, name: string) => samples.claimStageId(proc, name);
function submitted(id: string, insuredId: string, charge = 200, appointmentId = `apt-${id}`) {
  const base: any = claimsLib.getStoredClaims()[0];
  claimsLib.saveClaim({
    ...base, id, claimNumber: `CLM-${id}`, patientId: "CL-T", insuredId, totalCharge: charge, amountPaid: 0, patientResponsibility: 0, contractualAdjustment: 0, payments: [], appointmentId,
    processId: W().claim, currentStageId: stageId(W().claim, "Submitted"), statusLabel: "Submitted", status: "Submitted", clearinghouseTrackingId: `TRK-${id}`, submittedAt: new Date().toISOString(),
  });
}
function invoiceFor(appointmentId: string, total = 200) {
  const inv: any = { id: `INV-${appointmentId}`, clientId: "CL-T", clientName: "Test Patient", appointmentId, currency: "$", lineItems: [], subtotal: total, discountAmount: 0, taxAmount: 0, total, amountPaid: 0, createdAt: new Date().toISOString(), createdBy: "system", dueDate: "2031-01-01", status: "draft" };
  invSvc.invoiceService.saveInvoices([...invSvc.invoiceService.getInvoices(), inv]);
  return inv.id as string;
}
const claim = (id: string) => claimsLib.getStoredClaims().find((c) => c.id === id)! as any;
const myTasks = () => tasks.getStoredTasks().filter((t) => !!t.entityRef);
const smsMessages = () => (convs.getStoredConversations().find((c) => c.clientId === "CL-T" && c.channel === "sms")?.messages || []).map((m) => m.text);

describe("Set M demo (Slice 5)", () => {
  it("ships disabled; Enable demo set M turns on all of A21-A30", () => {
    const ids = auto.getStoredRules().filter((r) => /^sample-rule-A(2[1-9]|30)/.test(r.id));
    expect(ids.length).toBeGreaterThanOrEqual(13);
    expect(ids.every((r) => r.enabled === false)).toBe(true);
    expect(sb.enableDemoSet("M")).toBe(ids.length);
  });

  it("Receive ERA: the paid claim posts and its invoice moves to Sent with a statement + message; the denied claim moves to Denial & appeal with a task and an appeal draft", async () => {
    sb.enableDemoSet("M");
    submitted("pay", "M1", 200);
    submitted("deny", "XDENYX", 300);
    const invId = invoiceFor("apt-pay");

    era.receiveMockEra();
    await wait(700);

    // paid
    expect(claim("pay")).toMatchObject({ statusLabel: "Paid", status: "Paid", amountPaid: 200 });
    const st = ifc.getInvoiceStatement(invId)!;
    expect(st).toMatchObject({ insurancePaid: 200, claimNumber: "CLM-pay" });
    expect(invSvc.invoiceService.getInvoiceById(invId)!.statusLabel).toBe("Sent");
    expect(smsMessages().some((t) => t.includes("statement is ready"))).toBe(true);

    // denied
    const d = claim("deny");
    expect(d).toMatchObject({ processId: W().denial, statusLabel: "New denial", denialCategory: "appealable", denialNext: "appeal" });
    expect(d.appealDraft).toMatchObject({ status: "proposed", revision: 1 });
    const open = myTasks().filter((t) => t.queueId === "denials-and-a-r" && t.status !== "completed");
    expect(open).toHaveLength(1);
    expect(open[0].entityRef).toMatchObject({ type: "claim", id: "deny", stageId: stageId(W().denial, "New denial") });

    // leaving New denial (appeal submitted) auto-closes the task
    (await import("../claimService")).claimService.moveToStage("deny", "Appeal submitted", { type: "manual" });
    await wait(100);
    expect(myTasks().filter((t) => t.queueId === "denials-and-a-r" && t.status !== "completed")).toHaveLength(0);
  });

  it("unmatched ERA lines raise era.unmatched -> a task in Posting linked to the ERA", async () => {
    sb.enableDemoSet("M");
    submitted("a", "M1", 100);
    era.receiveMockEra({ includeUnmatched: true });
    await wait(700);
    const posting = myTasks().filter((t) => t.queueId === "posting");
    expect(posting).toHaveLength(1);
    expect(posting[0].entityRef!.type).toBe("era");
  });

  it("advancing the clock: Sent -> Reminder 1 -> Reminder 2 (+ messages), 45 days -> balance call, 60 days -> Overdue + Patient balances task", async () => {
    sb.enableDemoSet("M");
    submitted("pay", "M1", 200);
    const invId = invoiceFor("apt-pay");
    era.receiveMockEra();
    await wait(700);
    expect(invSvc.invoiceService.getInvoiceById(invId)!.statusLabel).toBe("Sent");

    const setSent = (days: number) =>
      invSvc.invoiceService.saveInvoices(invSvc.invoiceService.getInvoices().map((i) => (i.id === invId ? { ...i, sentAt: new Date(Date.now() - days * 86400000).toISOString() } : i)));

    setSent(16);
    await jobs.runDaily(new Date(), ["invoices"]);
    await wait(400);
    expect(invSvc.invoiceService.getInvoiceById(invId)!.statusLabel).toBe("Reminder 1");
    expect(smsMessages().some((t) => t.includes("Reminder for"))).toBe(true);

    setSent(31);
    await jobs.runDaily(new Date(), ["invoices"]);
    await wait(400);
    expect(invSvc.invoiceService.getInvoiceById(invId)!.statusLabel).toBe("Reminder 2");

    setSent(46);
    await jobs.runDaily(new Date(), ["invoices"]);
    await wait(400);
    expect(csc.rcmCallsStore.get().some((c) => c.purpose === "balance_reminder" && c.status === "completed")).toBe(true);

    setSent(61);
    await jobs.runDaily(new Date(), ["invoices"]);
    await wait(500);
    expect(invSvc.invoiceService.getInvoiceById(invId)!.statusLabel).toBe("Overdue");
    const bal = myTasks().filter((t) => t.queueId === "patient-balances" && t.status !== "completed");
    expect(bal).toHaveLength(1);
    expect(bal[0].entityRef).toMatchObject({ type: "invoice", id: invId });
  });

  it("A21: an accepted claim with no payment after 30 days is checked and moved to Pending (payer) with a follow-up task", async () => {
    sb.enableDemoSet("M");
    const base: any = claimsLib.getStoredClaims()[0];
    const old = new Date(Date.now() - 35 * 86400000).toISOString();
    claimsLib.saveClaim({ ...base, id: "acc", claimNumber: "CLM-acc", patientId: "CL-T", processId: W().claim, currentStageId: stageId(W().claim, "Accepted by payer"), statusLabel: "Accepted by payer", status: "Accepted", clearinghouseTrackingId: "TRK-acc", submittedAt: old });
    // updatedAt is stamped by saveClaim; age the claim record for the job
    localStorage.setItem("mantra_claims_v1", JSON.stringify(claimsLib.getStoredClaims().map((c) => (c.id === "acc" ? { ...c, updatedAt: old } : c))));
    await jobs.runDaily(new Date(), ["claims"]);
    await wait(500);
    expect(claim("acc")).toMatchObject({ statusLabel: "Pending (payer)", statusCheck: { status: "pending" } });
    expect(myTasks().filter((t) => t.queueId === "denials-and-a-r" && t.entityRef!.id === "acc" && t.status !== "completed")).toHaveLength(1);
  });
});

describe("check_claim_status and start_call (mock)", () => {
  const ev = (id: string): any => ({ id: "E1", event: "job.daily", recordType: "claim", recordId: id, data: { claimId: id, clientId: "CL-T" }, timestamp: "" });

  it("check_claim_status: pending / missing tracking id / lost; skips claims that are too recent", () => {
    submitted("c1", "M1");
    expect(csc.executeCheckClaimStatusStep({ rule, stepId: "s", params: { onPending: "Pending (payer)" }, event: ev("c1"), cause }).result).toMatchObject({ status: "pending", moved: "Pending (payer)" });
    submitted("c2", "XLOSTX");
    expect(csc.executeCheckClaimStatusStep({ rule, stepId: "s", params: {}, event: ev("c2"), cause }).result.status).toBe("not_found");
    submitted("c3", "M1");
    claimsLib.saveClaim({ ...claim("c3"), clearinghouseTrackingId: undefined });
    expect(csc.executeCheckClaimStatusStep({ rule, stepId: "s", params: {}, event: ev("c3"), cause }).result.status).toBe("missing");
    submitted("c4", "M1");
    expect(csc.executeCheckClaimStatusStep({ rule, stepId: "s", params: { minAgeDays: 30 }, event: ev("c4"), cause }).result.status).toBe("too_recent");
  });

  it("start_call: balance reminders need voice consent; payer calls do not", () => {
    const invEv: any = { id: "E2", event: "job.daily", recordType: "invoice", recordId: "INV-1", data: { clientId: "CL-T" }, timestamp: "" };
    expect(csc.executeStartCallStep({ rule, stepId: "s", params: { purpose: "balance_reminder" }, event: invEv }).result.status).toBe("completed");
    localStorage.setItem("clients", JSON.stringify([{ id: "CL-T", name: "Test Patient", phone: "555", stage: "x", processes: [] }]));
    const r = csc.executeStartCallStep({ rule, stepId: "s2", params: { purpose: "balance_reminder" }, event: { ...invEv, recordId: "INV-2" } });
    expect(r.result).toMatchObject({ status: "skipped", skipped: "no_consent" });
    expect(csc.executeStartCallStep({ rule, stepId: "s3", params: { purpose: "payer_benefits" }, event: { ...invEv, recordId: "INV-3" } }).result.status).toBe("completed");
  });
});
