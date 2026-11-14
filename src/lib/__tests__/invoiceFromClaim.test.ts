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

let ifc: typeof import("../invoiceFromClaim");
let invSvc: typeof import("../invoiceService");
let claimsLib: typeof import("../claimsStore");
let samples: typeof import("../rcmSampleClaimWorkflows");
let pstore: typeof import("../useProcessStore");
let runs: typeof import("../actionRuns");

const rule: any = { id: "R-inv", name: "Inv" };
const cause: any = { type: "rule", ruleId: "R-inv" };

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
  ifc = await import("../invoiceFromClaim");
  invSvc = await import("../invoiceService");
  claimsLib = await import("../claimsStore");
  samples = await import("../rcmSampleClaimWorkflows");
  pstore = await import("../useProcessStore");
  runs = await import("../actionRuns");
});

beforeEach(() => {
  fresh();
  runs.__resetActionRunsForTests();
  claimsLib.__resetClaimMigrationForTests();
  samples.seedSampleClaimWorkflows();
});

function seedInvoice(id = "INV-T", total = 300, appointmentId = "apt-T") {
  const inv: any = {
    id, clientId: "CL-T", clientName: "Test Patient", appointmentId, currency: "$", lineItems: [], subtotal: total, discountAmount: 0, taxAmount: 0, total, amountPaid: 0,
    createdAt: new Date().toISOString(), createdBy: "system", dueDate: "2031-01-01", status: "draft",
  };
  invSvc.invoiceService.saveInvoices([...invSvc.invoiceService.getInvoices(), inv]);
  return inv;
}
function paidClaim(id = "clm-I", extra: any = {}) {
  const base: any = claimsLib.getStoredClaims()[0];
  claimsLib.saveClaim({ ...base, id, claimNumber: `CLM-${id}`, patientId: "CL-T", appointmentId: "apt-T", amountPaid: 200, patientResponsibility: 100, contractualAdjustment: 0, payments: [{ id: "p1", eraId: "e", traceNumber: "t", amount: 200, date: "2030-01-01" }], ...extra });
  return id;
}
const ev = (claimId: string): any => ({ id: "E1", event: "claim.paid", recordType: "claim", recordId: claimId, data: { claimId }, timestamp: "" });

describe("invoice sample stages", () => {
  it("adds Reminder 1/2, Payment plan, Written off before the first final stage, once, without removing anything", () => {
    const before = pstore.getStoredProcesses().find((p) => p.entityType === "invoice")!.stages.map((s) => s.name);
    expect(ifc.seedInvoiceSampleStages()).toBe(4);
    const after = pstore.getStoredProcesses().find((p) => p.entityType === "invoice")!.stages.map((s) => s.name);
    expect(after).toEqual(expect.arrayContaining([...before, "Reminder 1", "Reminder 2", "Payment plan", "Written off"]));
    expect(ifc.seedInvoiceSampleStages()).toBe(0);
  });
});

describe("update_invoice_from_claim", () => {
  it("copies insurance paid / adjustments / patient responsibility, marks a statement, and moves the invoice by the configured stage", () => {
    ifc.seedInvoiceSampleStages();
    const inv = seedInvoice();
    const id = paidClaim();
    const r = ifc.executeUpdateInvoiceFromClaimStep({ rule, stepId: "s", params: { invoiceStage: "Reminder 1" }, event: ev(id), cause });
    expect(r.status).toBe("success");
    expect(r.result).toMatchObject({ invoiceId: inv.id, moved: "Reminder 1", patientResponsibility: 100 });
    const st = ifc.getInvoiceStatement(inv.id)!;
    expect(st).toMatchObject({ insurancePaid: 200, adjustments: 0, patientResponsibility: 100, claimNumber: "CLM-clm-I", balance: 300 });
    expect(st.paymentLink).toContain("pay.mantraassist.mock");
    expect(invSvc.invoiceService.getInvoiceById(inv.id)!.statusLabel).toBe("Reminder 1");
  });

  it("finds the invoice by Claim.invoiceId first; is idempotent per posted payment", () => {
    seedInvoice("INV-A", 100, "other");
    const id = paidClaim("clm-J", { invoiceId: "INV-A", appointmentId: "none" });
    const a = ifc.executeUpdateInvoiceFromClaimStep({ rule, stepId: "s", params: {}, event: ev(id), cause });
    expect(a.result.invoiceId).toBe("INV-A");
    const again = ifc.executeUpdateInvoiceFromClaimStep({ rule, stepId: "s", params: {}, event: ev(id), cause });
    expect(again.alreadyRan).toBe(true);
  });

  it("records failures: no invoice linked, unknown invoice stage, unknown claim", () => {
    const id = paidClaim("clm-K", { appointmentId: "no-invoice" });
    expect(ifc.executeUpdateInvoiceFromClaimStep({ rule, stepId: "a", params: {}, event: ev(id), cause }).error).toMatch(/no invoice/);
    seedInvoice("INV-B", 50, "apt-B");
    const id2 = paidClaim("clm-L", { appointmentId: "apt-B" });
    expect(ifc.executeUpdateInvoiceFromClaimStep({ rule, stepId: "b", params: { invoiceStage: "Nope" }, event: ev(id2), cause }).error).toMatch(/stage "Nope"/);
    expect(ifc.executeUpdateInvoiceFromClaimStep({ rule, stepId: "c", params: {}, event: ev("missing"), cause }).status).toBe("failed");
  });
});

describe("payment plans and statement", () => {
  it("splits the balance into installments (last one absorbs rounding) and stores them on the invoice", () => {
    expect(ifc.buildPaymentPlan(100, { installments: 3, firstDueDate: "2031-01-01" }).map((p) => p.amount)).toEqual([33.33, 33.33, 33.34]);
    expect(ifc.buildPaymentPlan(90, { installments: 3, firstDueDate: "2031-01-01", intervalDays: 7 }).map((p) => p.dueDate)).toEqual(["2031-01-01", "2031-01-08", "2031-01-15"]);
    const inv = seedInvoice("INV-P", 120);
    const plan = ifc.createPaymentPlan(inv.id, { installments: 4, firstDueDate: "2031-02-01" });
    expect(plan.reduce((a, p) => a + p.amount, 0)).toBeCloseTo(120, 2);
    expect(ifc.getInvoiceStatement(inv.id)!.plan).toHaveLength(4);
  });

  it("refuses a plan for a settled invoice and for an unknown invoice", () => {
    const inv = seedInvoice("INV-Z", 50);
    invSvc.invoiceService.saveInvoices(invSvc.invoiceService.getInvoices().map((i) => (i.id === inv.id ? { ...i, amountPaid: 50 } : i)));
    expect(() => ifc.createPaymentPlan(inv.id, { installments: 2, firstDueDate: "2031-01-01" })).toThrow(/no balance/);
    expect(() => ifc.createPaymentPlan("nope", { installments: 2, firstDueDate: "2031-01-01" })).toThrow(/not found/);
    expect(ifc.getInvoiceStatement("nope")).toBeUndefined();
  });
});
