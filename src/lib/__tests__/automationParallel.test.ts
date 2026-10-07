import { describe, it } from "node:test";
import assert from "node:assert";
import type { WorkflowStep } from "../../app/types/workflow.ts";
import {
  isParallelStep,
  createParallelStep,
  appendStepToTree,
  deleteStepFromTree,
  addBranchToStep,
  removeBranchFromStep,
  reorderStepInTree,
  findBranchInTree,
  findStepInTree,
  cloneWorkflowTree,
} from "../automationTree.ts";
import {
  executeWorkflowSequence,
  type StepExecutionLog,
} from "../automationExecutionEngine.ts";
import {
  computeTreeCanvasLayout,
  getStepSubtreeWidth,
  MIN_BRANCH_COL_WIDTH,
} from "../automationCanvasLayout.ts";
import {
  normalizeWorkflowTree,
  type LegacyConnection,
  type LegacyNode,
} from "../automationNormalizer.ts";

describe("Parallel Branches Suite", () => {
  // ─── Test 1: Execution Engine Case 1 ───
  it("Case 1: Parallel branches run concurrently (total time ~5s not 10s, simultaneous start)", async () => {
    // Parallel(B1: Wait 50ms then Send WhatsApp; B2: Wait 50ms then Send Payment)
    // Scale 5s to 50ms for swift test run while preserving exact proportional concurrency timing
    const pNode = createParallelStep("p1", 2);
    pNode.branches![0].steps = [
      {
        id: "step-b1-wait",
        name: "Wait 50ms",
        description: "",
        iconKey: "clock",
        stepKey: "wait",
        delayValue: 50,
        delayUnit: "ms",
      },
      {
        id: "step-b1-wa",
        name: "Send WhatsApp",
        description: "",
        iconKey: "whatsapp",
        stepKey: "whatsapp",
      },
    ];
    pNode.branches![1].steps = [
      {
        id: "step-b2-wait",
        name: "Wait 50ms",
        description: "",
        iconKey: "clock",
        stepKey: "wait",
        delayValue: 50,
        delayUnit: "ms",
      },
      {
        id: "step-b2-pay",
        name: "Send Payment",
        description: "",
        iconKey: "creditcard",
        stepKey: "send_payment",
      },
    ];

    const steps: WorkflowStep[] = [pNode];
    const logs: StepExecutionLog[] = [];
    const executionStart = Date.now();

    // Mock sleepFn so 50ms actually waits 50ms
    const sleepMock = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    await executeWorkflowSequence(steps, { sleepFn: sleepMock }, "Main", logs);
    const totalDuration = Date.now() - executionStart;

    // Verify logs
    const b1WaitLog = logs.find((l) => l.stepId === "step-b1-wait")!;
    const b2WaitLog = logs.find((l) => l.stepId === "step-b2-wait")!;
    const b1WaLog = logs.find((l) => l.stepId === "step-b1-wa")!;
    const b2PayLog = logs.find((l) => l.stepId === "step-b2-pay")!;

    assert.ok(b1WaitLog, "B1 Wait executed");
    assert.ok(b2WaitLog, "B2 Wait executed");
    assert.ok(b1WaLog, "B1 WhatsApp executed");
    assert.ok(b2PayLog, "B2 Payment executed");

    // Both branches started concurrently: start times within a small tolerance (< 15ms)
    const startTimeDiff = Math.abs(b1WaitLog.startedAt - b2WaitLog.startedAt);
    assert.ok(
      startTimeDiff < 15,
      `Branches started at different times: diff=${startTimeDiff}ms`
    );

    // Total duration should be close to 50ms, NOT 100ms (50ms + 50ms)
    assert.ok(
      totalDuration < 90,
      `Expected concurrent runtime (~50ms), got ${totalDuration}ms`
    );

    // Verify branch paths logged
    assert.ok(b1WaLog.branchPath.includes("Branch 1"));
    assert.ok(b2PayLog.branchPath.includes("Branch 2"));
  });

  // ─── Test 2: Execution Engine Case 2 (Nested Parallel) ───
  it("Case 2: Nested concurrency: B1: [A, Parallel(X, Y)], B2: [Z]. Z starts with A. X and Y start together after A.", async () => {
    const executedTimes: Record<string, { start: number; end: number }> = {};
    const sleepMock = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    const stepExecutor = async (step: WorkflowStep) => {
      const s = Date.now();
      await sleepMock(20);
      executedTimes[step.id] = { start: s, end: Date.now() };
    };

    const nestedP = createParallelStep("nested-p", 2);
    nestedP.branches![0].steps = [
      { id: "step-X", name: "Step X", description: "", iconKey: "zap", stepKey: "sms" },
    ];
    nestedP.branches![1].steps = [
      { id: "step-Y", name: "Step Y", description: "", iconKey: "zap", stepKey: "email" },
    ];

    const outerP = createParallelStep("outer-p", 2);
    outerP.branches![0].steps = [
      { id: "step-A", name: "Step A", description: "", iconKey: "zap", stepKey: "wh" },
      nestedP,
    ];
    outerP.branches![1].steps = [
      { id: "step-Z", name: "Step Z", description: "", iconKey: "zap", stepKey: "tag" },
    ];

    const steps: WorkflowStep[] = [outerP];
    const logs: StepExecutionLog[] = [];

    await executeWorkflowSequence(steps, { stepExecutor, sleepFn: sleepMock }, "Main", logs);

    // Assert Z starts concurrently with A
    const diffZandA = Math.abs(executedTimes["step-Z"].start - executedTimes["step-A"].start);
    assert.ok(diffZandA < 15, `Z and A did not start concurrently: diff=${diffZandA}ms`);

    // Step A finishes before X and Y start
    assert.ok(
      executedTimes["step-X"].start >= executedTimes["step-A"].end - 5,
      "X started before A completed"
    );
    assert.ok(
      executedTimes["step-Y"].start >= executedTimes["step-A"].end - 5,
      "Y started before A completed"
    );

    // X and Y start together
    const diffXY = Math.abs(executedTimes["step-X"].start - executedTimes["step-Y"].start);
    assert.ok(diffXY < 15, `X and Y did not start together: diff=${diffXY}ms`);
  });

  // ─── Test 3: Add-Step Placement ───
  it("Add-step placement: branch selected appends to that branch; none selected appends to main sequence; nested add works", () => {
    let tree: WorkflowStep[] = [];
    const rootStep1: WorkflowStep = {
      id: "s1",
      name: "Step 1",
      description: "",
      iconKey: "zap",
      stepKey: "sms",
    };

    // None selected -> appends to main sequence
    tree = appendStepToTree(tree, rootStep1, null);
    assert.strictEqual(tree.length, 1);
    assert.strictEqual(tree[0].id, "s1");

    // Add Parallel node with no branch selected -> appends to main sequence
    const parallelNode = createParallelStep("p1", 2);
    tree = appendStepToTree(tree, parallelNode, null);
    assert.strictEqual(tree.length, 2);
    assert.strictEqual(tree[1].id, "p1");

    // Select Branch 1 of parallelNode
    const b1Id = tree[1].branches![0].id;
    const branchStep: WorkflowStep = {
      id: "s-b1",
      name: "Branch 1 Action",
      description: "",
      iconKey: "mail",
      stepKey: "email",
    };
    tree = appendStepToTree(tree, branchStep, b1Id);

    assert.strictEqual(tree[1].branches![0].steps.length, 1);
    assert.strictEqual(tree[1].branches![0].steps[0].id, "s-b1");
    assert.strictEqual(tree[1].branches![1].steps.length, 0);

    // Nested add: add a parallel node inside Branch 1
    const nestedP = createParallelStep("nested-p", 2);
    tree = appendStepToTree(tree, nestedP, b1Id);
    assert.strictEqual(tree[1].branches![0].steps.length, 2);
    assert.strictEqual(tree[1].branches![0].steps[1].id, "nested-p");

    // Select Branch 2 of nested parallel node and add a step
    const nestedB2Id = tree[1].branches![0].steps[1].branches![1].id;
    const nestedStep: WorkflowStep = {
      id: "s-nested-b2",
      name: "Nested Action",
      description: "",
      iconKey: "phone",
      stepKey: "callaction",
    };
    tree = appendStepToTree(tree, nestedStep, nestedB2Id);

    const targetBranch = findBranchInTree(tree, nestedB2Id);
    assert.ok(targetBranch);
    assert.strictEqual(targetBranch.branch.steps.length, 1);
    assert.strictEqual(targetBranch.branch.steps[0].id, "s-nested-b2");

    // Adding on a selected step inside a branch (e.g. Send Payment selected)
    // without targetBranchId automatically inserts inside that branch right after it
    const stepAfterB1: WorkflowStep = {
      id: "s-after-b1",
      name: "Follow-up in Branch 1",
      description: "",
      iconKey: "creditcard",
      stepKey: "send_payment",
    };
    tree = appendStepToTree(tree, stepAfterB1, null, "s-b1");
    assert.strictEqual(tree[1].branches![0].steps[1].id, "s-after-b1");

    // Verify canvas layout connects s-b1 -> s-after-b1
    const layout = computeTreeCanvasLayout(tree);
    const conn = layout.connections.find(
      (c) => c.fromId === "s-b1" && c.toId === "s-after-b1"
    );
    assert.ok(conn, "Canvas layout connects step directly to the newly inserted step inside branch");
  });

  // ─── Test 4: Edge Isolation (No cross-branch edges) ───
  it("Canvas layout derives strictly isolated edges (no cross-branch edges)", () => {
    const p = createParallelStep("p1", 2);
    p.branches![0].steps = [
      { id: "b1-s1", name: "B1 Step 1", description: "", iconKey: "zap", stepKey: "sms" },
      { id: "b1-s2", name: "B1 Step 2", description: "", iconKey: "zap", stepKey: "email" },
    ];
    p.branches![1].steps = [
      { id: "b2-s1", name: "B2 Step 1", description: "", iconKey: "zap", stepKey: "wh" },
      { id: "b2-s2", name: "B2 Step 2", description: "", iconKey: "zap", stepKey: "tag" },
    ];

    const tree: WorkflowStep[] = [p];
    const layout = computeTreeCanvasLayout(tree);

    // Verify connections:
    // start -> p1
    // p1 (branch-0) -> b1-s1
    // b1-s1 -> b1-s2
    // p1 (branch-1) -> b2-s1
    // b2-s1 -> b2-s2
    const b1NodeIds = new Set(["b1-s1", "b1-s2"]);
    const b2NodeIds = new Set(["b2-s1", "b2-s2"]);

    for (const conn of layout.connections) {
      if (b1NodeIds.has(conn.fromId)) {
        assert.ok(
          !b2NodeIds.has(conn.toId),
          `Found cross-branch connection from ${conn.fromId} to ${conn.toId}`
        );
      }
      if (b2NodeIds.has(conn.fromId)) {
        assert.ok(
          !b1NodeIds.has(conn.toId),
          `Found cross-branch connection from ${conn.fromId} to ${conn.toId}`
        );
      }
    }
  });

  // ─── Test 5: Round-trip Save and Reload ───
  it("Save and reload round-trip preserves identical tree and deterministic layout", () => {
    const originalTree: WorkflowStep[] = [
      {
        id: "step-init",
        name: "Init",
        description: "",
        iconKey: "zap",
        stepKey: "sms",
      },
      createParallelStep("p1", 2),
    ];
    originalTree[1].branches![0].steps = [
      { id: "b1-step", name: "B1 Step", description: "", iconKey: "mail", stepKey: "email" },
    ];

    // JSON serialize and deserialize (round-trip save/load)
    const serialized = JSON.stringify(originalTree);
    const reloaded: WorkflowStep[] = JSON.parse(serialized);

    assert.deepStrictEqual(reloaded, originalTree);

    const layout1 = computeTreeCanvasLayout(originalTree);
    const layout2 = computeTreeCanvasLayout(reloaded);

    assert.deepStrictEqual(layout1.nodes, layout2.nodes);
    assert.deepStrictEqual(layout1.connections, layout2.connections);
  });

  // ─── Test 6: Migration from Messy Legacy Flow ───
  it("Migration test: converts legacy flow with crossing edges into clean tree and logs changes", () => {
    // Legacy flow: parallel node with crossing connection from B1 step to B2 step, plus an orphan step
    const legacySteps: WorkflowStep[] = [
      { id: "legacy-p1", name: "Parallel Branches", description: "", iconKey: "layers", stepKey: "parallel" },
      { id: "s-wa", name: "Send WhatsApp", description: "", iconKey: "whatsapp", stepKey: "whatsapp" },
      { id: "s-sms", name: "Send SMS", description: "", iconKey: "sms", stepKey: "sms" },
      { id: "s-orphan", name: "Orphan Step", description: "", iconKey: "zap", stepKey: "webhook" },
    ];

    const legacyConnections: LegacyConnection[] = [
      { fromId: "start", fromPort: "default", toId: "legacy-p1" },
      { fromId: "legacy-p1", fromPort: "branch-0", toId: "s-wa" },
      { fromId: "legacy-p1", fromPort: "branch-1", toId: "s-sms" },
      // Invalid cross-branch connection:
      { fromId: "s-wa", fromPort: "default", toId: "s-sms" },
    ];

    const legacyNodes: LegacyNode[] = [
      { id: "start", type: "start" },
      { id: "legacy-p1", type: "parallel" },
      { id: "s-wa", type: "whatsapp" },
      { id: "s-sms", type: "sms" },
      { id: "s-orphan", type: "webhook" },
    ];

    const { steps: migratedTree, logs } = normalizeWorkflowTree(legacySteps, legacyConnections, legacyNodes);

    assert.ok(logs.length > 0, "Migration logged actions");
    // Verify cross branch edge was broken and logged
    const crossBranchLog = logs.some((l) => l.includes("cross-branch") || l.includes("invalid"));
    assert.ok(crossBranchLog, "Logged removal of cross branch edge");

    // Verify orphan was appended to main sequence
    const orphanLog = logs.some((l) => (l.includes("s-orphan") || l.includes("Orphan Step")) && l.includes("main sequence"));
    assert.ok(orphanLog, "Logged appending orphan to main sequence");

    // Migrated structure:
    // Main sequence has: [parallelNode, s-orphan]
    // Parallel node has 2 branches: Branch 1 with s-wa, Branch 2 with s-sms
    const pNode = migratedTree.find((s) => s.id === "legacy-p1");
    assert.ok(pNode);
    assert.strictEqual(pNode.branches?.length, 2);
    assert.strictEqual(pNode.branches![0].steps[0].id, "s-wa");
    assert.strictEqual(pNode.branches![1].steps[0].id, "s-sms");

    const orphanInMain = migratedTree.find((s) => s.id === "s-orphan");
    assert.ok(orphanInMain, "Orphan appended to main sequence");
  });

  // ─── Test 7: Branch Constraints (Minimum 2 branches) ───
  it("Branch count never drops below 2", () => {
    let tree: WorkflowStep[] = [createParallelStep("p1", 2)];
    const pId = tree[0].id;
    const b1Id = tree[0].branches![0].id;

    // Attempting to remove branch when count is 2 should fail
    const removeRes = removeBranchFromStep(tree, pId, b1Id);
    assert.strictEqual(removeRes.success, false);
    assert.strictEqual(removeRes.updatedSteps[0].branches?.length, 2);

    // Add branch -> 3 branches
    tree = addBranchToStep(tree, pId);
    assert.strictEqual(tree[0].branches?.length, 3);

    // Now remove is allowed down to 2
    const b3Id = tree[0].branches![2].id;
    const removeRes2 = removeBranchFromStep(tree, pId, b3Id);
    assert.strictEqual(removeRes2.success, true);
    assert.strictEqual(removeRes2.updatedSteps[0].branches?.length, 2);
  });

  // ─── Test 8: Two-Way Sync between Builder List and Canvas ───
  it("Builder list view and canvas stay in sync for nested parallel nodes across structural edits", () => {
    let tree: WorkflowStep[] = [
      { id: "step-1", name: "First Step", description: "", iconKey: "zap", stepKey: "sms" },
      createParallelStep("outer-p", 2),
    ];
    const b1Id = tree[1].branches![0].id;

    // List view edit: add nested parallel node to Branch 1
    const nestedP = createParallelStep("nested-p", 2);
    tree = appendStepToTree(tree, nestedP, b1Id);

    // List view edit: add step into nested parallel node's Branch 2
    const nestedB2Id = tree[1].branches![0].steps[0].branches![1].id;
    tree = appendStepToTree(
      tree,
      { id: "nested-action", name: "Nested Email", description: "", iconKey: "mail", stepKey: "email" },
      nestedB2Id
    );

    // Generate canvas layout from the updated tree
    const canvasLayout = computeTreeCanvasLayout(tree);

    // Assert canvas contains nodes for both parallel nodes, their branches, and the nested action
    const canvasNodeIds = new Set(canvasLayout.nodes.map((n) => n.id));
    assert.ok(canvasNodeIds.has("step-1"));
    assert.ok(canvasNodeIds.has("outer-p"));
    assert.ok(canvasNodeIds.has("nested-p"));
    assert.ok(canvasNodeIds.has("nested-action"));

    // Canvas layout contains the derived edge: nested-p (branch-1) -> nested-action
    const nestedEdge = canvasLayout.connections.find(
      (c) => c.fromId === "nested-p" && c.fromPort === "branch-1" && c.toId === "nested-action"
    );
    assert.ok(nestedEdge, "Canvas derived edge to nested action in Branch 2");

    // Deleting the nested parallel node from the tree updates both
    tree = deleteStepFromTree(tree, "nested-p");
    const updatedCanvasLayout = computeTreeCanvasLayout(tree);
    const updatedCanvasIds = new Set(updatedCanvasLayout.nodes.map((n) => n.id));
    assert.ok(!updatedCanvasIds.has("nested-p"));
    assert.ok(!updatedCanvasIds.has("nested-action"));
  });
});
