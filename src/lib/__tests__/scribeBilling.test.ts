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

let sb: typeof import("../scribeBilling");
let scribe: typeof import("../scribeSessionStore");
let claimsLib: typeof import("../claimsStore");
let billing: typeof import("../billingSetupStore");
let cpt: typeof import("../cptCodes");
let bus: typeof import("../eventBus");

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
  sb = await import("../scribeBilling");
  scribe = await import("../scribeSessionStore");
  claimsLib = await import("../claimsStore");
  billing = await import("../billingSetupStore");
  cpt = await import("../cptCodes");
  bus = await import("../eventBus");
});

let seen: any[] = [];
let session: any;
let off: (() => void) | undefined;
beforeEach(() => {
  off?.();
  fresh();
  billing.seedBillingSetupSamples();
  seen = [];
  off = bus.eventBus.subscribeAll((e) => void seen.push(e));
  const base = scribe.INITIAL_SCRIBE_SESSIONS[0] as any;
  session = { ...base, id: "scr-T", clientId: "CL-T", appointmentId: "apt-T", extractedData: { ...base.extractedData, icd10Code: "H25.11", diagnosis: "Age-related nuclear cataract, right eye" } };
  scribe.saveScribeSession(session);
});

const wait = (ms = 20) => new Promise((r) => setTimeout(r, ms));

describe("ophthalmology CPTs", () => {
  it("are available and searchable", () => {
    expect(cpt.getCPTCodeOption("66984")?.category).toBe("Ophthalmology");
    expect(cpt.searchCPTCodes("OCT").some((c) => c.code === "92134")).toBe(true);
  });
});

describe("Scribe codes -> billing", () => {
  it("starts from the extracted ICD (no hard-coded J06.9)", () => {
    const c = sb.getSessionCodes(session);
    expect(c.icd).toEqual([{ code: "H25.11", description: "Age-related nuclear cataract, right eye" }]);
    const none = sb.getSessionCodes({ ...session, extractedData: { ...session.extractedData, icd10Code: undefined } });
    expect(none.icd).toEqual([]);
  });

  it("signing requires accepted codes", async () => {
    await expect(sb.signAndSendToBilling("scr-T")).rejects.toThrow(/Accept the codes/);
  });

  it("with an existing claim: codes (RT/LT) and priced lines go into the claim and claim.note_signed fires", async () => {
    const base: any = claimsLib.getStoredClaims()[0];
    claimsLib.saveClaim({ ...base, id: "clm-S", patientId: "CL-T", appointmentId: "apt-T", payer: { id: "payer-bcbs", name: "BCBS", payerId: "1", type: "Commercial" } });
    sb.acceptCodes("scr-T", {
      icd: [{ code: "H25.11", description: "Cataract" }],
      cpt: [{ code: "66984", description: "Cataract surgery", modifier: "RT", units: 1 }, { code: "92014", description: "Exam", modifier: "", units: 2 }],
    });
    const r = await sb.signAndSendToBilling("scr-T");
    await wait();
    expect(r).toMatchObject({ claimId: "clm-S", event: "claim.note_signed" });
    const c: any = claimsLib.getStoredClaims().find((x) => x.id === "clm-S")!;
    expect(c.scribeSessionId).toBe("scr-T");
    expect(c.diagnosisCodes).toEqual([{ pointer: "A", code: "H25.11", description: "Cataract" }]);
    expect(c.lines.map((l: any) => [l.cptCode, l.modifier, l.units, l.chargeAmount])).toEqual([["66984", "RT", 1, 1900], ["92014", undefined, 2, 280]]); // BCBS contracted fees
    expect(c.totalCharge).toBe(2180);
    expect(seen.filter((e) => e.event === "claim.note_signed")).toHaveLength(1);
    expect((scribe.getScribeSessionById("scr-T") as any).codes.signedAt).toBeTruthy();
  });

  it("without a claim: emits scribe.note_signed for the client (a rule variant can create the claim)", async () => {
    sb.acceptCodes("scr-T", { icd: [], cpt: [{ code: "92014", description: "Exam", units: 1 }] });
    const r = await sb.signAndSendToBilling("scr-T");
    await wait();
    expect(r).toMatchObject({ event: "scribe.note_signed" });
    expect(r.claimId).toBeUndefined();
    const ev = seen.find((e) => e.event === "scribe.note_signed");
    expect(ev).toMatchObject({ recordType: "client", recordId: "CL-T" });
    expect(ev.data.appointmentId).toBe("apt-T");
  });
});
