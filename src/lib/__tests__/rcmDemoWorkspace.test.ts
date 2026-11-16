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
let d: typeof import("../rcmDemoWorkspace");
const arr = (k: string) => JSON.parse(localStorage.getItem(k) || "[]");

beforeAll(async () => {
  (globalThis as any).localStorage = new MemStorage();
  (globalThis as any).sessionStorage = new MemStorage();
  (globalThis as any).window = Object.assign(globalThis, { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } });
  d = await import("../rcmDemoWorkspace");
});
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

describe("demo workspace seed", () => {
  it("seeds consistent, complete data once and is add-only", async () => {
    const first = d.seedDemoWorkspace({ force: true, now: Date.parse("2026-11-16T12:00:00Z") });
    expect(first.added.claims).toBeGreaterThan(60);
    const claims = arr("mantra_claims_v1").filter((c: any) => String(c.id).startsWith("dm-"));
    const { buildSampleClaimWorkflows } = await import("../rcmSampleClaimWorkflows");
    const wfs = buildSampleClaimWorkflows();
    // every stage of every claim workflow has at least one claim
    for (const w of wfs) for (const s of w.stages) expect(claims.some((c: any) => c.processId === w.id && c.statusLabel === s.name), `${w.name} / ${s.name}`).toBe(true);
    expect(new Set(claims.map((c: any) => c.payer.id)).size).toBeGreaterThanOrEqual(6);
    expect(new Set(claims.map((c: any) => c.id)).size).toBe(claims.length);
    // claims link to appointments, coverages and clients that exist
    const appts = arr("appointments_v1"); const covs = arr("mantra_coverages_v1");
    for (const c of claims) { expect(appts.some((a: any) => String(a.id) === c.appointmentId)).toBe(true); expect(covs.some((v: any) => v.clientId === c.patientId)).toBe(true); }
    // ERA lines point at real claims; paid claims have payments
    const eras = arr("mantra_eras_v1");
    expect(eras.some((e: any) => e.status === "unmatched")).toBe(true);
    for (const e of eras) for (const l of e.lines) if (l.matchedClaimId) expect(claims.some((c: any) => c.id === l.matchedClaimId)).toBe(true);
    expect(claims.filter((c: any) => c.status === "Paid").every((c: any) => c.payments?.length === 1)).toBe(true);
    // invoice states, tasks in every queue, overdue and completed
    expect(new Set(arr("mantra_invoices_v1").map((i: any) => i.statusLabel))).toEqual(new Set(["Draft", "Sent", "Reminder 1", "Reminder 2", "Overdue", "Paid"]));
    const tasks = arr("mantra_tasks_store").filter((t: any) => String(t.id).startsWith("dm-"));
    expect(new Set(tasks.map((t: any) => t.queueId)).size).toBe(8);
    expect(tasks.some((t: any) => t.status === "completed") && tasks.some((t: any) => t.status !== "completed" && Date.parse(t.dueAt) < Date.parse("2026-11-16"))).toBe(true);
    // every Coverage & authorization stage has an instance
    const { SAMPLE_COVERAGE_PROCESS_ID } = await import("../rcmSampleIds");
    const stages = new Set(arr("callLogs").filter((l: any) => l.processId === SAMPLE_COVERAGE_PROCESS_ID).map((l: any) => l.currentStage));
    for (const s of ["Not checked", "Checking", "Needs fix", "Provider setup issue", "Inconclusive", "Pending review", "Auth required", "Auth submitted", "Verified", "Auth expired", "Inactive", "Auth denied", "Self-pay"]) expect(stages.has(s), s).toBe(true);
    // no wording that marks it as sample data, and none of the test prefix
    const blob = (JSON.stringify(claims) + JSON.stringify(tasks)).replace(/proc-sample-[a-z-]+/g, "");
    expect((blob.match(/.{0,30}(sample|mock|dummy|RCMTEST|demo).{0,30}/i) || [""])[0]).toBe("");
    // second run (flag set by a normal run): add-only and idempotent by id
    const second = d.seedDemoWorkspace({ force: true, now: Date.parse("2026-11-16T12:00:00Z") });
    expect(second.added.claims || 0).toBe(0);
    expect(arr("mantra_claims_v1").filter((c: any) => String(c.id).startsWith("dm-")).length).toBe(claims.length);
  });
});
