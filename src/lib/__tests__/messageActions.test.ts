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

let msg: typeof import("../messageActions");
let tpl: typeof import("../messageTemplatesStore");
let convs: typeof import("../useConversations");
let runs: typeof import("../actionRuns");
let cov: typeof import("../coveragesStore");
let billing: typeof import("../billingSetupStore");

const rule: any = { id: "R-msg", name: "Message" };
const ev = (id = "E1"): any => ({ id, event: "stage.entered", recordType: "client", recordId: "CL-T", data: { clientId: "CL-T" }, timestamp: "" });

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
  msg = await import("../messageActions");
  tpl = await import("../messageTemplatesStore");
  convs = await import("../useConversations");
  runs = await import("../actionRuns");
  cov = await import("../coveragesStore");
  billing = await import("../billingSetupStore");
});

beforeEach(() => {
  fresh();
  runs.__resetActionRunsForTests();
  billing.seedBillingSetupSamples();
  tpl.seedMessageTemplateSamples();
  localStorage.setItem("clients", JSON.stringify([{ id: "CL-T", name: "Test Patient", phone: "5550001", stage: "x", processes: [], consents: { sms: true } }]));
  cov.saveCoverage({ clientId: "CL-T", payerId: "payer-bcbs", memberId: "M1", priority: "primary", effectiveDate: "2025-01-01" });
});

const convFor = () => convs.getStoredConversations().find((c) => c.clientId === "CL-T" && c.channel === "sms");

describe("send_message (mock dispatch)", () => {
  it("seeds 4 sample templates idempotently", () => {
    expect(tpl.messageTemplatesStore.get()).toHaveLength(4);
    expect(tpl.seedMessageTemplateSamples()).toBe(0);
  });

  it("renders variables, appends to the client's conversation in Chats and is idempotent per event", () => {
    const r = msg.executeSendMessageStep({ rule, stepId: "s", params: { channel: "sms", template: "update_insurance" }, event: ev() });
    expect(r.status).toBe("success");
    expect(r.result.sent).toBe(true);
    const c = convFor()!;
    expect(c.messages[c.messages.length - 1].text).toContain("Hi Test Patient");
    expect(c.messages[c.messages.length - 1].origin).toBe("system");
    const again = msg.executeSendMessageStep({ rule, stepId: "s", params: { channel: "sms", template: "update_insurance" }, event: ev() });
    expect(again.alreadyRan).toBe(true);
    expect(convFor()!.messages.length).toBe(c.messages.length);
    const next = msg.executeSendMessageStep({ rule, stepId: "s", params: { channel: "sms", template: "update_insurance" }, event: ev("E2") });
    expect(next.status).toBe("success");
    expect(convFor()!.messages.length).toBe(c.messages.length + 1);
  });

  it("insurance variables read the primary coverage payer", () => {
    msg.executeSendMessageStep({ rule, stepId: "s", params: { channel: "sms", body: "Payer: {{insurance.payer}}" }, event: ev() });
    expect(convFor()!.messages.slice(-1)[0].text).toBe("Payer: Blue Cross Blue Shield (Sample)");
  });

  it("no SMS consent: nothing is sent and the result says so (not a failure)", () => {
    localStorage.setItem("clients", JSON.stringify([{ id: "CL-T", name: "Test Patient", phone: "5550001", stage: "x", processes: [] }]));
    const before = convs.getStoredConversations().length;
    const r = msg.executeSendMessageStep({ rule, stepId: "s", params: { channel: "sms", template: "estimate" }, event: ev() });
    expect(r.status).toBe("success");
    expect(r.result).toMatchObject({ sent: false, skipped: "no_consent" });
    expect(convs.getStoredConversations().length).toBe(before);
    expect(runs.getActionHealth().failed).toBe(0);
  });

  it("unknown template or empty message is a recorded failure", () => {
    expect(msg.executeSendMessageStep({ rule, stepId: "s", params: { template: "nope" }, event: ev() }).status).toBe("failed");
    expect(msg.executeSendMessageStep({ rule, stepId: "s2", params: { body: "" }, event: ev("E9") }).status).toBe("failed");
    expect(runs.getActionHealth().failed).toBe(2);
  });
});

describe("notify", () => {
  it("raises an in-app notification once per event and never fails the chain", () => {
    const r1 = msg.executeNotifyStep({ rule, stepId: "n", params: { title: "Heads up", message: "Check {{client.name}}" }, event: ev() });
    const r2 = msg.executeNotifyStep({ rule, stepId: "n", params: { title: "Heads up", message: "Check {{client.name}}" }, event: ev() });
    expect(r1.status).toBe("success");
    expect(r2.alreadyRan).toBe(true);
  });
});
