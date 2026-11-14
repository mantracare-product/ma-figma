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

let audit: typeof import("../auditLogsStore");
let svc: typeof import("../claimService");
let claimsLib: typeof import("../claimsStore");
let samples: typeof import("../rcmSampleClaimWorkflows");
let cov: typeof import("../coveragesStore");
let auth: typeof import("../authActions");
let store: typeof import("../processLogsStore");
let era: typeof import("../eraStore");
let ifc: typeof import("../invoiceFromClaim");
let invSvc: typeof import("../invoiceService");
let perms: typeof import("../permissions");
let sampleRoles: typeof import("../rcmSampleRoles");

function fresh() {
  (globalThis as any).localStorage = new MemStorage();
  (globalThis as any).sessionStorage = new MemStorage();
  (globalThis as any).window.localStorage = (globalThis as any).localStorage;
  (globalThis as any).window.sessionStorage = (globalThis as any).sessionStorage;
}

beforeAll(async () => {
  (globalThis as any).window = { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {}, navigator: { userAgent: "test" } };
  (globalThis as any).CustomEvent = class { constructor(public type: string) {} };
  fresh();
  audit = await import("../auditLogsStore");
  svc = await import("../claimService");
  claimsLib = await import("../claimsStore");
  samples = await import("../rcmSampleClaimWorkflows");
  cov = await import("../coveragesStore");
  auth = await import("../authActions");
  store = await import("../processLogsStore");
  era = await import("../eraStore");
  ifc = await import("../invoiceFromClaim");
  invSvc = await import("../invoiceService");
  perms = await import("../permissions");
  sampleRoles = await import("../rcmSampleRoles");
});

beforeEach(() => {
  fresh();
  localStorage.setItem("user_data", JSON.stringify({ name: "Bea Biller", email: "bea@clinic.test", role: "Member" }));
  localStorage.setItem("clients", JSON.stringify([{ id: "CL-T", name: "Test Patient", stage: "x", processes: [] }]));
  claimsLib.__resetClaimMigrationForTests();
  store.__resetInstanceMigrationForTests();
  samples.seedSampleClaimWorkflows();
});

const rcm = () => audit.getStoredAuditLogs().filter((l) => l.module === "RCM");
const W = () => samples.SAMPLE_CLAIM_WORKFLOW_IDS;

describe("RCM audit entries", () => {
  it("a manual claim move is audited with the user; a rule-driven move is not", () => {
    const base: any = claimsLib.getStoredClaims()[0];
    claimsLib.saveClaim({ ...base, id: "c1", claimNumber: "CLM-c1", patientId: "CL-T", processId: W().claim, currentStageId: samples.claimStageId(W().claim, "Draft"), statusLabel: "Draft" });
    svc.claimService.moveToStage("c1", "Ready to submit", { type: "manual" });
    svc.claimService.moveToStage("c1", "Submitted", { type: "rule", ruleId: "r" } as any);
    const entries = rcm().filter((l) => l.entityId === "c1");
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ action: "updated", actorName: "Bea Biller", actorEmail: "bea@clinic.test", entityType: "claim", targetName: "CLM-c1" });
    expect(entries[0].before).toEqual({ stage: "Draft" });
    expect(entries[0].after).toEqual({ stage: "Ready to submit" });
  });

  it("coverage changes, authorization decisions, ERA receipt and payment plans are audited", () => {
    cov.saveCoverage({ clientId: "CL-T", payerId: "p", memberId: "M1", priority: "primary" });
    const { instance } = store.startProcessInstance({ clientId: "CL-T", clientName: "T", processName: "Cov", stageName: "x", source: { type: "appointment", id: "9" } });
    auth.recordAuthDecision({ instanceId: instance.instanceId, decision: "approved", authNumber: "A-1" });
    era.receiveMockEra();
    const inv: any = { id: "INV-1", clientId: "CL-T", clientName: "T", currency: "$", lineItems: [], subtotal: 90, discountAmount: 0, taxAmount: 0, total: 90, amountPaid: 0, createdAt: new Date().toISOString(), createdBy: "system", dueDate: "2031-01-01", status: "draft" };
    invSvc.invoiceService.saveInvoices([...invSvc.invoiceService.getInvoices(), inv]);
    ifc.createPaymentPlan("INV-1", { installments: 3, firstDueDate: "2031-02-01" });
    const types = rcm().map((l) => `${l.entityType}:${l.action}`);
    expect(types).toEqual(expect.arrayContaining(["coverage:created", "authorization:updated", "era:created", "invoice:created"]));
    expect(rcm().every((l) => l.actorName === "Bea Biller")).toBe(true);
  });

  it("an audit failure never blocks the action", () => {
    (globalThis as any).localStorage.setItem = () => { throw new Error("quota"); };
    expect(() => cov.saveCoverage({ clientId: "CL-T", payerId: "p", memberId: "M2", priority: "primary" })).not.toThrow();
  });
});

describe("permission wiring (hasPermission, no hard-coded roles)", () => {
  const role = (id: string) => sampleRoles.buildSampleRcmRoles().find((r) => r.id === id)!;

  it("each sample role opens exactly the RCM areas it was given", () => {
    const biller = role("sample-rcm-biller");
    const front = role("sample-rcm-front-desk");
    const setup = role("sample-rcm-billing-setup");
    expect(perms.hasPermission(biller, "claims", "edit")).toBe(true);
    expect(perms.hasPermission(biller, "denials", "edit")).toBe(true);
    expect(perms.hasPermission(biller, "rcmPayments", "add")).toBe(true);
    expect(perms.hasPermission(biller, "rcmReports", "read")).toBe(true);
    expect(perms.hasPermission(biller, "billingSetup", "read")).toBe(false);
    expect(perms.hasPermission(front, "eligibility", "add")).toBe(true);
    expect(perms.hasPermission(front, "priorAuth", "edit")).toBe(false);
    expect(perms.hasPermission(front, "claims", "add")).toBe(false);
    expect(perms.hasPermission(setup, "billingSetup", "edit")).toBe(true);
    expect(perms.hasPermission(setup, "claims", "read")).toBe(false);
  });
});
