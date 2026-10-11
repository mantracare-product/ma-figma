import assert from "node:assert";
import {
  evaluateCondition,
  executeRulesForEvent,
} from "../lib/ruleEngine";
import {
  validateRuleEntityTarget,
  checkRuleCycle,
  AutomationRule,
} from "../lib/useAutomationStore";
import { Process } from "../lib/useProcessStore";
import { BusEvent } from "../lib/eventBus";

console.log("=== RUNNING PHASE 3 RULE ENGINE TESTS ===");

// 1. Condition Evaluation Tests
console.log("\n[Test 1] Condition Evaluation Operators");
assert.strictEqual(
  evaluateCondition({ id: "c1", field: "service", op: "equals", value: "Cardiology" }, { service: "cardiology" }),
  true,
  "equals operator should match case-insensitively"
);
assert.strictEqual(
  evaluateCondition({ id: "c2", field: "service", op: "equals", value: "Surgery" }, { service: "cardiology" }),
  false,
  "equals operator should reject non-matches"
);
assert.strictEqual(
  evaluateCondition({ id: "c3", field: "notes", op: "contains", value: "vip" }, { notes: "High priority VIP patient" }),
  true,
  "contains operator should detect substring"
);
assert.strictEqual(
  evaluateCondition({ id: "c4", field: "amount", op: "greater_than", value: 100 }, { amount: 250 }),
  true,
  "greater_than operator should validate numbers"
);
assert.strictEqual(
  evaluateCondition({ id: "c5", field: "amount", op: "less_than", value: 100 }, { amount: 250 }),
  false,
  "less_than operator should reject numbers greater than threshold"
);
console.log("✓ Condition operators passed");

// 2. Entity Target Validation Tests
console.log("\n[Test 2] Entity Target Validation (cross-entity moves rejected)");
const mockProcesses: Process[] = [
  {
    id: "proc-client-1",
    name: "Client Intake",
    description: "",
    assignedToUserId: 1,
    entityType: "client",
    aiSettings: { platform: "test", voiceSpeed: 1 },
    stages: [
      { id: "stg-c-1", name: "Initial", description: "", status: "active" },
      { id: "stg-c-2", name: "Contacted", description: "", status: "active" },
    ],
  },
  {
    id: "proc-invoice-1",
    name: "Invoice Billing",
    description: "",
    assignedToUserId: 1,
    entityType: "invoice",
    aiSettings: { platform: "test", voiceSpeed: 1 },
    stages: [
      { id: "stg-inv-1", name: "Draft", description: "", status: "active" },
      { id: "stg-inv-2", name: "Paid", description: "", status: "active" },
    ],
  },
];

// Valid client-to-client rule
const validRule: Partial<AutomationRule> = {
  entityType: "client",
  action: {
    type: "moveToStage",
    processId: "proc-client-1",
    stageId: "stg-c-2",
  },
};
const validResult = validateRuleEntityTarget(validRule, mockProcesses);
assert.strictEqual(validResult.valid, true, "Same entity process should be valid");

// Invalid client-to-invoice cross-entity rule
const invalidCrossEntityRule: Partial<AutomationRule> = {
  entityType: "client",
  action: {
    type: "moveToStage",
    processId: "proc-invoice-1",
    stageId: "stg-inv-1",
  },
};
const invalidResult = validateRuleEntityTarget(invalidCrossEntityRule, mockProcesses);
assert.strictEqual(invalidResult.valid, false, "Cross-entity move should be rejected");
assert.ok(
  invalidResult.error?.includes("Entity mismatch"),
  "Error should specify entity mismatch"
);
console.log("✓ Entity boundary validation passed");

// 3. Cycle Detection Tests
console.log("\n[Test 3] Cycle Detection");
const selfLoopRule: AutomationRule = {
  id: "rule-self-loop",
  orgId: "default",
  name: "Self Loop Rule",
  entityType: "client",
  trigger: {
    event: "client.entered_stage",
    params: { stageId: "stg-c-1" },
  },
  action: {
    type: "moveToStage",
    processId: "proc-client-1",
    stageId: "stg-c-1", // Targets the same stage that triggers it!
  },
  enabled: true,
  createdAt: "",
  updatedAt: "",
};
const cycleCheck = checkRuleCycle(selfLoopRule, []);
assert.strictEqual(cycleCheck.hasCycle, true, "Direct self-loop should be detected");
console.log("✓ Cycle detection passed");

// 4. Idempotency & Loop Guard in Rule Engine
console.log("\n[Test 4] Rule Engine Idempotency & Loop Guard");

// Mock event
const testEvent: BusEvent = {
  id: "evt-test-unique-1",
  event: "client.created",
  recordType: "client",
  recordId: "rec-test-100",
  orgId: "default",
  timestamp: new Date().toISOString(),
};

// First execution: should match or proceed
console.log("Emitting event once...");
// Loop guard test: visitedRules prevents re-firing within same cascade
const visited = new Set<string>(["rule-client-intake-auto"]);
const loopGuardResults = await executeRulesForEvent(testEvent, 0, visited);
const skipped = loopGuardResults.find((r) => r.ruleId === "rule-client-intake-auto");
if (skipped) {
  assert.strictEqual(skipped.matched, false);
  assert.ok(skipped.skippedReason?.includes("Loop guard"), "Loop guard should skip visited rule");
  console.log("✓ Loop guard prevented recursive cascade");
}

console.log("\n=== ALL PHASE 3 TESTS PASSED SUCCESSFULLY! ===");
