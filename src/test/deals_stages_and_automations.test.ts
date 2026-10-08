import assert from "node:assert";
import { getStoredProcesses, saveStoredProcesses, DEFAULT_INITIAL_PROCESSES } from "../lib/useProcessStore";
import { logStageMove, getStoredStageMoves } from "../lib/useAutomationStore";
import { eventBus } from "../lib/eventBus";
import { CHEVRON_PALETTE } from "../app/components/common/ChevronStageRibbon";

// Mock localStorage and sessionStorage for node test environment
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    length: 0,
  } as any;
}

if (typeof globalThis.sessionStorage === "undefined") {
  const store = new Map<string, string>();
  globalThis.sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    length: 0,
  } as any;
}

if (typeof globalThis.window === "undefined") {
  globalThis.window = {
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  } as any;
}

async function runTests() {
  console.log("=== Testing Deals Stages, Colors, and Automation Integration ===");

  // Test 1: Verify process stages & colors match workflow definitions
  console.log("\n[Test 1] Verifying Workflow stages and colors for Client Intake...");
  saveStoredProcesses(DEFAULT_INITIAL_PROCESSES);
  const procs = getStoredProcesses();
  const clientIntake = procs.find((p) => p.name === "Client Intake");
  assert.ok(clientIntake, "Client Intake process must exist");
  assert.strictEqual(clientIntake.stages.length, 5, "Client Intake must have 5 stages");

  const stage1 = clientIntake.stages[0];
  assert.strictEqual(stage1.name, "Initial Contact");
  assert.strictEqual(stage1.color, "#3B82F6");

  const stage2 = clientIntake.stages[1];
  assert.strictEqual(stage2.name, "Contacted");
  assert.strictEqual(stage2.color, "#06B6D4");

  const stage3 = clientIntake.stages[2];
  assert.strictEqual(stage3.name, "Interested");
  assert.strictEqual(stage3.color, "#22C55E");
  assert.strictEqual(stage3.isFinalStage, true);

  console.log("✓ Process stages & colors match workflow definitions correctly!");

  // Test 2: Trigger stage move automation
  console.log("\n[Test 2] Testing stage move from /deals triggers automations...");
  let stageEnteredFired = false;
  let receivedEventData: any = null;

  eventBus.subscribe("stage.entered", (event) => {
    stageEnteredFired = true;
    receivedEventData = event;
  });

  const move = logStageMove({
    orgId: "default",
    recordType: "client",
    recordId: "CL-001",
    fromStageId: "1-1",
    fromStageName: "Initial Contact",
    toStageId: "1-2",
    toStageName: "Contacted",
    processId: "1",
    processName: "Client Intake",
    cause: {
      type: "manual",
      ruleName: "Stage changed to Contacted from /deals",
    },
  });

  assert.ok(move, "logStageMove should return new move object");
  assert.strictEqual(move.toStageName, "Contacted");
  assert.strictEqual(stageEnteredFired, true, "stage.entered event must fire");
  assert.strictEqual(receivedEventData.recordId, "CL-001");
  assert.strictEqual(receivedEventData.data.toStageName, "Contacted");

  const recordedMoves = getStoredStageMoves();
  assert.ok(recordedMoves.some((m) => m.id === move.id), "Move must be recorded in stage moves log");

  console.log("✓ Stage move properly logged and dispatched to eventBus & automations!");

  console.log("\n🎉 ALL DEALS STAGES & AUTOMATION TESTS PASSED! 🎉\n");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
