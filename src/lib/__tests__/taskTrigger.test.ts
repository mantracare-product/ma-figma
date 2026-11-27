import { describe, it, expect, beforeEach } from "vitest";
import { GLOBAL_TRIGGER_CATALOG } from "../../app/types/automation";
import { EVENT_CATALOG, saveStoredRules, AutomationRule } from "../useAutomationStore";
import { executeRulesForEvent } from "../ruleEngine";

const mockStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = String(val);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

if (typeof globalThis.localStorage === "undefined") {
  (globalThis as any).localStorage = mockStorage;
}

describe("Task Trigger Node & Events", () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  it("exposes Task trigger category with task.created and task.updated options in GLOBAL_TRIGGER_CATALOG", () => {
    const taskCat = GLOBAL_TRIGGER_CATALOG.find((c) => c.type === "task");
    expect(taskCat).toBeDefined();
    expect(taskCat?.label).toBe("Task");
    expect(taskCat?.events.map((e) => e.event)).toEqual(["task.created", "task.updated"]);
  });

  it("includes task.created and task.updated in EVENT_CATALOG.task", () => {
    const events = EVENT_CATALOG.task.map((e) => e.event);
    expect(events).toContain("task.created");
    expect(events).toContain("task.updated");
  });

  it("matches enabled task.created and task.updated automation rules in ruleEngine", async () => {
    const rules: AutomationRule[] = [
      {
        id: "rule-task-created",
        orgId: "default",
        name: "On Task Created",
        entityType: "task",
        trigger: { event: "task.created", label: "Task created" },
        action: { type: "moveToStage", processId: "", stageId: "" },
        actions: [],
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "rule-task-updated",
        orgId: "default",
        name: "On Task Updated",
        entityType: "task",
        trigger: { event: "task.updated", label: "Task updated" },
        action: { type: "moveToStage", processId: "", stageId: "" },
        actions: [],
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    saveStoredRules(rules);

    const createdRes = await executeRulesForEvent({
      id: "evt-1",
      event: "task.created",
      recordType: "task",
      recordId: "tsk-101",
      orgId: "default",
      data: { id: "tsk-101", title: "Verify Labs" },
      timestamp: new Date().toISOString(),
    });
    expect(createdRes.map((r) => r.ruleId)).toEqual(["rule-task-created"]);
    expect(createdRes[0].matched).toBe(true);

    const updatedRes = await executeRulesForEvent({
      id: "evt-2",
      event: "task.updated",
      recordType: "task",
      recordId: "tsk-101",
      orgId: "default",
      data: { id: "tsk-101", title: "Verify Labs", status: "completed" },
      timestamp: new Date().toISOString(),
    });
    expect(updatedRes.map((r) => r.ruleId)).toEqual(["rule-task-updated"]);
    expect(updatedRes[0].matched).toBe(true);
  });
});
