import { describe, it, expect, beforeAll, beforeEach } from "vitest";

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
let auto: typeof import("../useAutomationStore");
let engine: typeof import("../ruleEngine");
let clients: typeof import("../clientsStore");
let bus: typeof import("../eventBus").eventBus;

const flush = () => new Promise((r) => setTimeout(r, 25));
const CLIENT = { id: "CL-TEST", name: "Test Patient", stage: "Initial Contact", processes: [] as string[] };

let entered: any[] = [];
let exited: any[] = [];

function fieldUpdateRule(id: string, extra: Record<string, any> = {}) {
  const now = new Date().toISOString();
  return {
    id,
    orgId: "default",
    name: `Rule ${id}`,
    entityType: "client",
    trigger: { event: "stage.entered", params: {} },
    action: { type: "moveToStage", processId: "", stageId: "" },
    actions: [
      { id: `a-${id}`, stepKey: "fieldupdate", params: { fieldUpdateBlocks: [{ fieldToEdit: "marker", updateValue: id }] } },
    ],
    enabled: true,
    createdAt: now,
    updatedAt: now,
    ...extra,
  };
}

const activityFor = (marker: string) =>
  (JSON.parse(localStorage.getItem("activityEngine_v1") || "[]") as any[]).filter(
    (e) => e.type === "field_update" && e.newValue === marker
  );

beforeAll(async () => {
  (globalThis as any).window = {
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  (globalThis as any).localStorage = new MemStorage();
  (globalThis as any).sessionStorage = new MemStorage();
  store = await import("../processLogsStore");
  auto = await import("../useAutomationStore");
  engine = await import("../ruleEngine"); // registers the bus subscriber on import
  clients = await import("../clientsStore");
  bus = (await import("../eventBus")).eventBus;
  bus.subscribe("stage.entered", (e: any) => void entered.push(e));
  bus.subscribe("stage.exited", (e: any) => void exited.push(e));
});

beforeEach(() => {
  (globalThis as any).localStorage = new MemStorage();
  (globalThis as any).sessionStorage = new MemStorage();
  store.__resetInstanceMigrationForTests();
  entered = [];
  exited = [];
  localStorage.setItem("clients", JSON.stringify([{ ...CLIENT }]));
});

const startInstance = (apptId: string) =>
  store.startProcessInstance({
    clientId: CLIENT.id,
    clientName: CLIENT.name,
    processName: "Sample Process",
    processId: "proc-sample",
    stageName: "Not checked",
    source: { type: "appointment", id: apptId, title: `Visit #${apptId}` },
  }).instance;

describe("single emission per stage move", () => {
  it("emits exactly one stage.entered and one stage.exited for an instance move", async () => {
    const inst = startInstance("101");
    const moved = store.updateProcessInstanceStage(inst.instanceId!, "Needs fix")!;
    store.logInstanceStageMove(moved, "Not checked", { type: "manual" });
    await flush();
    const mine = entered.filter((e) => e.recordId === inst.instanceId);
    expect(mine).toHaveLength(1);
    expect(exited.filter((e) => e.recordId === inst.instanceId)).toHaveLength(1);
  });

  it("carries the instance on the event: recordId = instanceId plus instanceId/clientId/processId/stageId/source", async () => {
    const inst = startInstance("101");
    const moved = store.updateProcessInstanceStage(inst.instanceId!, "Needs fix")!;
    store.logInstanceStageMove(moved, "Not checked", { type: "manual" });
    await flush();
    const ev = entered.find((e) => e.recordId === inst.instanceId);
    expect(ev).toBeTruthy();
    expect(ev.recordType).toBe("client");
    expect(ev.data.instanceId).toBe(inst.instanceId);
    expect(ev.data.clientId).toBe(CLIENT.id);
    expect(ev.data.processId).toBe("proc-sample");
    expect(ev.data.stageName).toBe("Needs fix");
    expect(ev.data.source).toEqual({ type: "appointment", id: "101", title: "Visit #101" });
  });

  it("does not emit the legacy <type>.entered_stage duplicate", async () => {
    const seen: string[] = [];
    const off = bus.subscribeAll((e) => void seen.push(e.event));
    const inst = startInstance("101");
    const moved = store.updateProcessInstanceStage(inst.instanceId!, "Needs fix")!;
    store.logInstanceStageMove(moved, "Not checked");
    await flush();
    off();
    expect(seen.filter((e) => e.endsWith(".entered_stage"))).toHaveLength(0);
    expect(seen.filter((e) => e === "stage.entered")).toHaveLength(1);
  });

  it("emits the exit event with the FROM process on a workflow change", async () => {
    auto.logStageMove({
      orgId: "default",
      recordType: "claim",
      recordId: "CLM-1",
      fromStageId: "s-from",
      fromStageName: "From",
      fromProcessId: "proc-a",
      fromProcessName: "Process A",
      toStageId: "s-to",
      toStageName: "To",
      processId: "proc-b",
      processName: "Process B",
      cause: { type: "manual" },
    });
    await flush();
    const ex = exited.find((e) => e.recordId === "CLM-1")!;
    const en = entered.find((e) => e.recordId === "CLM-1")!;
    expect(ex.data.processId).toBe("proc-a");
    expect(ex.data.stageId).toBe("s-from");
    expect(ex.data.toProcessId).toBe("proc-b");
    expect(en.data.processId).toBe("proc-b");
  });

  it("propagates the rule chain context onto the event", async () => {
    auto.logStageMove({
      orgId: "default",
      recordType: "claim",
      recordId: "CLM-2",
      toStageId: "s-to",
      toStageName: "To",
      processId: "proc-b",
      cause: { type: "rule", ruleId: "r1", chain: { depth: 3, visited: ["r0", "r1"] } },
    });
    await flush();
    const en = entered.find((e) => e.recordId === "CLM-2")!;
    expect(en.data.chain).toEqual({ depth: 3, visited: ["r0", "r1"] });
  });

  it("moveClientToStage emits exactly one stage.entered", async () => {
    clients.moveClientToStage("CL-001", "Client Checked In", "Patient Care Journey");
    await flush();
    expect(entered.filter((e) => e.data?.clientId === "CL-001" || e.recordId === "CL-001")).toHaveLength(1);
  });
});

describe("rules fire once per move and per instance", () => {
  it("a stage-entry rule runs once for one instance move (not 2-3 times)", async () => {
    auto.saveStoredRules([fieldUpdateRule("r-once")] as any);
    const inst = startInstance("101");
    const moved = store.updateProcessInstanceStage(inst.instanceId!, "Needs fix")!;
    store.logInstanceStageMove(moved, "Not checked", { type: "manual" });
    await flush();
    expect(activityFor("r-once")).toHaveLength(1);
  });

  it("fires separately for each instance of the same client, and acts on the client id", async () => {
    auto.saveStoredRules([fieldUpdateRule("r-per")] as any);
    const a = startInstance("101");
    const b = startInstance("102");
    for (const inst of [a, b]) {
      const moved = store.updateProcessInstanceStage(inst.instanceId!, "Needs fix")!;
      store.logInstanceStageMove(moved, "Not checked", { type: "manual" });
    }
    await flush();
    const runs = activityFor("r-per");
    expect(runs).toHaveLength(2);
    // client-semantic actions still see the client id even though recordId is the instanceId
    expect(runs.every((r) => r.clientId === CLIENT.id)).toBe(true);
  });

  it("the rule's stage filter matches the instance's process", async () => {
    auto.saveStoredRules([
      fieldUpdateRule("r-match", { trigger: { event: "stage.entered", params: { processId: "proc-sample" } } }),
      fieldUpdateRule("r-other", { trigger: { event: "stage.entered", params: { processId: "proc-other" } } }),
    ] as any);
    const inst = startInstance("101");
    const moved = store.updateProcessInstanceStage(inst.instanceId!, "Needs fix")!;
    store.logInstanceStageMove(moved, "Not checked", { type: "manual" });
    await flush();
    expect(activityFor("r-match")).toHaveLength(1);
    expect(activityFor("r-other")).toHaveLength(0);
  });
});

describe("check-in events are emitted once", () => {
  it("engine module is loaded (subscriber registered)", () => {
    expect(typeof engine.executeRulesForEvent).toBe("function");
  });
});
