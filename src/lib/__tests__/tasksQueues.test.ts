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

let tasks: typeof import("../tasksStore");
let views: typeof import("../taskViewsStore");
let act: typeof import("../createTaskAction");
let store: typeof import("../processLogsStore");
let runs: typeof import("../actionRuns");
let autoClose: typeof import("../taskAutoClose");
let bus: typeof import("../eventBus");

const rule: any = { id: "R-task", name: "Queue rule" };
const CLIENT = { id: "CL-T", name: "Test Patient", stage: "x", processes: [] as string[] };

function fresh() {
  (globalThis as any).localStorage = new MemStorage();
  (globalThis as any).sessionStorage = new MemStorage();
  (globalThis as any).window.localStorage = (globalThis as any).localStorage;
  (globalThis as any).window.sessionStorage = (globalThis as any).sessionStorage;
}

beforeAll(async () => {
  (globalThis as any).window = { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} };
  (globalThis as any).CustomEvent = class { constructor(public type: string, public init?: any) {} };
  fresh();
  tasks = await import("../tasksStore");
  views = await import("../taskViewsStore");
  act = await import("../createTaskAction");
  store = await import("../processLogsStore");
  runs = await import("../actionRuns");
  autoClose = await import("../taskAutoClose");
  bus = await import("../eventBus");
});

beforeEach(() => {
  fresh();
  store.__resetInstanceMigrationForTests();
  runs.__resetActionRunsForTests();
  localStorage.setItem("mantra_tasks_store", JSON.stringify([]));
  localStorage.setItem("clients", JSON.stringify([{ ...CLIENT }]));
});

const startInstance = (apptId: string) =>
  store.startProcessInstance({
    clientId: CLIENT.id, clientName: CLIENT.name, processName: "Cov", processId: "p-cov", stageName: "Needs fix",
    source: { type: "appointment", id: apptId, title: `Eye exam (Appt #${apptId})` },
  }).instance;

const enterEvent = (inst: any, stageId = "stg-needs-fix"): any => ({
  id: `E-${Math.random()}`, event: "stage.entered", recordType: "client", recordId: inst.instanceId,
  data: { clientId: CLIENT.id, instanceId: inst.instanceId, processId: "p-cov", stageId, stageName: "Needs fix" }, timestamp: "",
});
const exitEvent = (inst: any, stageId = "stg-needs-fix"): any => ({
  id: `X-${Math.random()}`, event: "stage.exited", recordType: "client", recordId: inst.instanceId,
  data: { clientId: CLIENT.id, instanceId: inst.instanceId, processId: "p-cov", stageId, stageName: "Needs fix", toStageName: "Verified" }, timestamp: "",
});

const params = { title: "Fix coverage for {{client.name}}", queue: "Insurance fixes", priority: "high", dueInDays: 1 };

const mine = () => tasks.getStoredTasks().filter((t) => !!t.entityRef);

describe("tasks core", () => {
  it("creates collision-safe ids and codes", () => {
    const base: any = { title: "t", description: "", status: "pending", isImportant: false, scopeLevel: "client", assignee: { scopeLevel: "client", assigneeName: "x" }, creator: { id: "u", name: "u" }, checklists: [], observers: [], subtasks: [], attachments: [] };
    const a = tasks.createTaskRecord(base);
    const b = tasks.createTaskRecord(base);
    expect(a.id).not.toBe(b.id);
    expect(a.code).not.toBe(b.code);
  });

  it("emits task.created and task.completed", async () => {
    const seen: string[] = [];
    const off = bus.eventBus.subscribeAll((e) => { if (e.event.startsWith("task.")) seen.push(e.event); });
    const base: any = { title: "t", description: "", status: "pending", isImportant: false, scopeLevel: "client", assignee: { scopeLevel: "client", assigneeName: "x" }, creator: { id: "u", name: "u" }, checklists: [], observers: [], subtasks: [], attachments: [] };
    const t = tasks.createTaskRecord(base);
    tasks.completeTaskRecord(t.id, "user");
    await new Promise((r) => setTimeout(r, 5));
    off();
    expect(seen).toEqual(expect.arrayContaining(["task.created", "task.completed"]));
    expect(tasks.getStoredTasks().find((x) => x.id === t.id)!.closedBy).toBe("user");
  });
});

describe("create_task + queue view + auto-close (Slice 2 demo)", () => {
  it("a task appears in the queue view with a linked-record, then auto-closes when the instance leaves the stage", () => {
    views.seedTaskViewSamples();
    const view = views.taskViewsStore.get().find((v) => v.name.startsWith("Insurance fixes"))!;
    const inst = startInstance("101");

    const r = act.executeCreateTaskStep({ rule, stepId: "s1", params, event: enterEvent(inst) });
    expect(r.status).toBe("success");

    const open = views.applyTaskView(tasks.getStoredTasks(), view);
    expect(open).toHaveLength(1);
    expect(open[0].entityRef).toMatchObject({ type: "process_instance", id: inst.instanceId, instanceId: inst.instanceId, stageId: "stg-needs-fix" });
    expect(open[0].title).toBe("Fix coverage for Test Patient");
    expect(open[0].queueId).toBe("insurance-fixes");

    // leaving a DIFFERENT stage does not close it
    autoClose.closeTasksForStageExit(exitEvent(inst, "stg-other"));
    expect(views.applyTaskView(tasks.getStoredTasks(), view)).toHaveLength(1);

    // leaving the stage closes it
    const closed = autoClose.closeTasksForStageExit(exitEvent(inst));
    expect(closed).toHaveLength(1);
    expect(views.applyTaskView(tasks.getStoredTasks(), view)).toHaveLength(0);
    expect(mine()[0].closedBy).toBe("auto:stage_exit");
  });

  it("only the exiting instance's task closes (two instances, same client and stage)", () => {
    const a = startInstance("101");
    const b = startInstance("102");
    act.executeCreateTaskStep({ rule, stepId: "s1", params, event: enterEvent(a) });
    act.executeCreateTaskStep({ rule, stepId: "s1", params, event: enterEvent(b) });
    autoClose.closeTasksForStageExit(exitEvent(a));
    const open = mine().filter((t) => t.status !== "completed");
    expect(open).toHaveLength(1);
    expect(open[0].entityRef!.instanceId).toBe(b.instanceId);
  });

  it("does not duplicate while a task is open; re-entering after it closed creates a new one", () => {
    const inst = startInstance("101");
    act.executeCreateTaskStep({ rule, stepId: "s1", params, event: enterEvent(inst) });
    act.executeCreateTaskStep({ rule, stepId: "s1", params, event: enterEvent(inst) }); // new event id, task still open
    expect(mine()).toHaveLength(1);
    autoClose.closeTasksForStageExit(exitEvent(inst));
    act.executeCreateTaskStep({ rule, stepId: "s1", params, event: enterEvent(inst) });
    expect(mine()).toHaveLength(2);
    expect(mine().filter((t) => t.status !== "completed")).toHaveLength(1);
  });

  it("autoCloseOnStageExit=false leaves the task open", () => {
    const inst = startInstance("101");
    act.executeCreateTaskStep({ rule, stepId: "s1", params: { ...params, autoCloseOnStageExit: false }, event: enterEvent(inst) });
    autoClose.closeTasksForStageExit(exitEvent(inst));
    expect(mine()[0].status).not.toBe("completed");
  });
});

describe("queue views", () => {
  it("seeds 8 sample views idempotently; filters by queue; sorts by due then amount; overdue", () => {
    expect(views.seedTaskViewSamples()).toBe(8);
    expect(views.seedTaskViewSamples()).toBe(0);
    const mk = (id: string, extra: any): any => ({ id, code: id, title: id, status: "pending", queueId: "claim-fixes", ...extra });
    const list = [
      mk("late-small", { dueAt: "2020-01-01T00:00:00Z", amountAtStake: 10 }),
      mk("late-big", { dueAt: "2020-01-01T00:00:00Z", amountAtStake: 500 }),
      mk("undated", {}),
      mk("other-queue", { queueId: "posting" }),
      mk("done", { status: "completed" }),
    ];
    const v: any = { id: "v", name: "v", queueIds: ["claim-fixes"] };
    expect(views.applyTaskView(list, v).map((t) => t.id)).toEqual(["late-big", "late-small", "undated"]);
    expect(views.applyTaskView(list, { ...v, overdueOnly: true }).map((t) => t.id)).toEqual(["late-big", "late-small"]);
    expect(views.countTasksInView(list, v)).toBe(3);
  });
});
