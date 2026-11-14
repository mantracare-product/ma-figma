import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

// Browser-like globals must exist before the store module is imported.
class MemStorage {
  private m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  key(i: number) {
    return Array.from(this.m.keys())[i] ?? null;
  }
  getItem(k: string) {
    return this.m.has(k) ? (this.m.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  clear() {
    this.m.clear();
  }
}

let store: typeof import("../processLogsStore");

const CLIENT = { id: "CL-TEST", name: "Test Patient", stage: "Initial Contact", processes: [] as string[] };

function seedClient() {
  localStorage.setItem("clients", JSON.stringify([{ ...CLIENT }]));
}

beforeAll(async () => {
  (globalThis as any).window = {
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  (globalThis as any).localStorage = new MemStorage();
  (globalThis as any).sessionStorage = new MemStorage();
  store = await import("../processLogsStore");
});

beforeEach(() => {
  (globalThis as any).localStorage = new MemStorage();
  (globalThis as any).sessionStorage = new MemStorage();
  store.__resetInstanceMigrationForTests();
  seedClient();
});

const start = (apptId: string, stage = "Not checked") =>
  store.startProcessInstance({
    clientId: CLIENT.id,
    clientName: CLIENT.name,
    processName: "Sample Process",
    processId: "proc-sample",
    stageName: stage,
    source: { type: "appointment", id: apptId, title: `Visit (Appt #${apptId})` },
  });

describe("process instances: create / dedupe", () => {
  it("creates two instances for two different appointments", () => {
    const a = start("101");
    const b = start("102");
    expect(a.alreadyExisted).toBe(false);
    expect(b.alreadyExisted).toBe(false);
    expect(a.instance.instanceId).not.toBe(b.instance.instanceId);
    expect(a.instance.id).toBe(a.instance.instanceId);
    expect(store.getInstancesForClient(CLIENT.id, "Sample Process")).toHaveLength(2);
    expect(a.instance.kind).toBe("process_instance");
    expect(a.instance.title).toBe("Visit (Appt #101)");
  });

  it("returns the existing instance for the same source and does not change its stage", () => {
    const a = start("101");
    store.updateProcessInstanceStage(a.instance.instanceId!, "Verified");
    const again = start("101", "Not checked");
    expect(again.alreadyExisted).toBe(true);
    expect(again.instance.instanceId).toBe(a.instance.instanceId);
    expect(store.getInstancesForClient(CLIENT.id, "Sample Process")).toHaveLength(1);
    expect(store.getProcessInstanceById(a.instance.instanceId!)!.currentStage).toBe("Verified");
  });

  it("generates collision-safe ids", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 500; i++) ids.add(store.makeInstanceId());
    expect(ids.size).toBe(500);
  });
});

describe("process instances: independent moves", () => {
  it("moves only the targeted instance and never writes client.stage", () => {
    const a = start("101");
    const b = start("102");
    store.updateProcessInstanceStage(a.instance.instanceId!, "Needs fix");
    expect(store.getProcessInstanceById(a.instance.instanceId!)!.currentStage).toBe("Needs fix");
    expect(store.getProcessInstanceById(b.instance.instanceId!)!.currentStage).toBe("Not checked");
    const client = JSON.parse(localStorage.getItem("clients")!)[0];
    expect(client.stage).toBe("Initial Contact"); // unchanged
    expect(client.processInstanceStages[a.instance.instanceId!].stageName).toBe("Needs fix");
    expect(client.processInstanceStages[b.instance.instanceId!].stageName).toBe("Not checked");
  });

  it("only moves the matching deal card", () => {
    const a = start("101");
    const b = start("102");
    localStorage.setItem(
      "deals",
      JSON.stringify([
        { id: "D1", clientName: CLIENT.name, clientId: CLIENT.id, stage: "Sample Process: Not checked", instanceId: a.instance.instanceId },
        { id: "D2", clientName: CLIENT.name, clientId: CLIENT.id, stage: "Sample Process: Not checked", instanceId: b.instance.instanceId },
      ])
    );
    store.updateProcessInstanceStage(a.instance.instanceId!, "Verified");
    const deals = JSON.parse(localStorage.getItem("deals")!);
    expect(deals.find((d: any) => d.id === "D1").stage).toBe("Sample Process: Verified");
    expect(deals.find((d: any) => d.id === "D2").stage).toBe("Sample Process: Not checked");
  });

  it("protects identity keys when merging fields", () => {
    const a = start("101");
    store.updateProcessInstanceFields(a.instance.instanceId!, { elig_status: "active", id: "HACK", kind: "call" });
    const row = store.getProcessInstanceById(a.instance.instanceId!)!;
    expect(row.id).toBe(a.instance.id);
    expect(row.kind).toBe("process_instance");
    expect((row as any).elig_status).toBe("active");
  });
});

describe("legacy name-based shims", () => {
  it("resolve to the most recent active instance and warn when ambiguous", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const a = start("101");
    const b = start("102");
    store.updateProcessInstanceStage(a.instance.instanceId!, "Older");
    // make b the most recent
    store.updateProcessInstanceFields(b.instance.instanceId!, { date: "2999-01-01 00:00" });
    store.updateProcessCallLogStage(CLIENT.id, "Sample Process", "Via shim");
    expect(store.getProcessInstanceById(b.instance.instanceId!)!.currentStage).toBe("Via shim");
    expect(store.getProcessInstanceById(a.instance.instanceId!)!.currentStage).toBe("Older");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("addProcessCallLog keeps one-per-process semantics for legacy callers", () => {
    const r1 = store.addProcessCallLog({ clientId: CLIENT.id, clientName: CLIENT.name, processName: "Legacy Flow", stageName: "S1" });
    const r2 = store.addProcessCallLog({ clientId: CLIENT.id, clientName: CLIENT.name, processName: "Legacy Flow", stageName: "S2" });
    expect(r2.instanceId).toBe(r1.instanceId);
    expect(store.getInstancesForClient(CLIENT.id, "Legacy Flow")).toHaveLength(1);
    expect(store.getProcessInstanceById(r1.instanceId!)!.currentStage).toBe("S2");
  });
});

describe("migration (callLogs_schema_v2)", () => {
  const legacy = [
    { id: "PRC-CL-TEST-1111", client: "Test Patient", clientId: "CL-TEST", type: "WhatsApp", status: "In Progress", process: "Old Flow", currentStage: "Older", duration: "0:00", date: "2026-01-01 09:00", hasRecording: false, hasTranscript: true, hasScheduledCall: false },
    { id: "PRC-CL-TEST-2222", client: "Test Patient", clientId: "CL-TEST", type: "WhatsApp", status: "In Progress", process: "Old Flow", currentStage: "Newer", duration: "0:00", date: "2026-02-01 09:00", hasRecording: false, hasTranscript: true, hasScheduledCall: false },
    { id: "CALL-001", client: "Test Patient", clientId: "CL-TEST", type: "Outbound", status: "Completed", process: "Old Flow", currentStage: "Contacted", duration: "4:32", date: "2026-01-02 09:00", hasRecording: true, hasTranscript: true, hasScheduledCall: false },
  ];

  it("classifies, collapses duplicates to the newest, backfills deals, and is idempotent", () => {
    localStorage.setItem("callLogs", JSON.stringify(legacy));
    localStorage.setItem("callLogs_demo", JSON.stringify(legacy));
    localStorage.setItem(
      "deals",
      JSON.stringify([{ id: "D1", clientName: "Test Patient", stage: "Old Flow: Newer" }])
    );
    const r1 = store.migrateProcessInstances();
    expect(r1.collapsed).toBeGreaterThanOrEqual(1);

    const rows = JSON.parse(localStorage.getItem("callLogs")!);
    const procRows = rows.filter((r: any) => r.kind === "process_instance");
    expect(procRows).toHaveLength(1); // duplicates collapsed
    expect(procRows[0].currentStage).toBe("Newer"); // newest kept
    expect(procRows[0].instanceId).toBe(procRows[0].id);
    expect(procRows[0].source).toEqual({ type: "legacy", id: "primary" });
    expect(rows.find((r: any) => r.id === "CALL-001").kind).toBe("call"); // real call kept & stamped
    expect(JSON.parse(localStorage.getItem("callLogs_demo")!).filter((r: any) => r.kind === "process_instance")).toHaveLength(1);

    const deals = JSON.parse(localStorage.getItem("deals")!);
    expect(deals[0].instanceId).toBe(procRows[0].instanceId);
    expect(deals[0].clientId).toBe("CL-TEST");

    // second run: no further changes
    const before = localStorage.getItem("callLogs");
    const r2 = store.migrateProcessInstances();
    expect(r2.collapsed).toBe(0);
    expect(localStorage.getItem("callLogs")).toBe(before);
  });

  it("ensureInstanceMigration sets the schema flag once", () => {
    localStorage.setItem("callLogs", JSON.stringify(legacy));
    store.ensureInstanceMigration();
    expect(localStorage.getItem(store.CALL_LOGS_SCHEMA_FLAG)).toBe("1");
  });

  it("getCallsOnly never returns process rows after migration", () => {
    localStorage.setItem("callLogs", JSON.stringify(legacy));
    const calls = store.getCallsOnly();
    expect(calls.some((c) => store.isProcessInstanceRow(c))).toBe(false);
    expect(calls.some((c) => c.id === "CALL-001")).toBe(true);
  });
});
