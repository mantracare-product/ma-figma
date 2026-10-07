import type { WorkflowStep, AutomationBranch } from "../app/types/workflow.ts";
import { isParallelStep, createParallelStep, ensureValidBranches } from "./automationTree.ts";

export interface LegacyConnection {
  id?: string;
  fromId: string;
  fromPort: string;
  toId: string;
}

export interface LegacyNode {
  id: string;
  type: string;
  label?: string;
  config?: Record<string, any>;
}

export interface NormalizerResult {
  steps: WorkflowStep[];
  logs: string[];
}

/**
 * Normalizes any workflow data (legacy flat steps, canvas nodes + edges, or modern tree)
 * into a strict, validated WorkflowStep tree.
 */
export function normalizeWorkflowTree(
  rawSteps: WorkflowStep[] = [],
  legacyConnections: LegacyConnection[] = [],
  legacyNodes: LegacyNode[] = []
): NormalizerResult {
  const logs: string[] = [];

  // 1. If steps already contain valid branches and no legacy connections are forcing migration
  const hasTreeBranches = rawSteps.some(
    (s) => isParallelStep(s) && Array.isArray(s.branches) && s.branches.length >= 2
  );

  if (hasTreeBranches && legacyConnections.length === 0) {
    const validatedSteps = rawSteps.map((s) => {
      if (isParallelStep(s)) {
        const validated = ensureValidBranches(s);
        logs.push(`Validated parallel step "${s.name}" (${s.id}) with ${validated.branches?.length} branches`);
        return validated;
      }
      return s;
    });
    return { steps: validatedSteps, logs };
  }

  // 2. Build index of all available steps
  const stepsById = new Map<string, WorkflowStep>();
  rawSteps.forEach((s) => {
    stepsById.set(s.id, { ...s });
  });

  // Check if legacyNodes contains parallel nodes that are not in steps
  const parallelNodesFromCanvas = legacyNodes.filter(
    (n) => n.type === "parallel" || n.id.startsWith("parallel-")
  );

  // Group parallel nodes found in steps or nodes
  const parallelMap = new Map<string, { id: string; name: string; branches: Map<number, string[]> }>();

  // Detect parallel nodes from canvas
  parallelNodesFromCanvas.forEach((pn) => {
    parallelMap.set(pn.id, {
      id: pn.id,
      name: pn.label || "Parallel Branches",
      branches: new Map<number, string[]>(),
    });
    logs.push(`Found parallel node from canvas: ${pn.id}`);
  });

  // Detect parallel steps in rawSteps
  rawSteps.forEach((s) => {
    if (s.stepKey === "parallel" || s.kind === "parallel") {
      if (!parallelMap.has(s.id)) {
        parallelMap.set(s.id, {
          id: s.id,
          name: s.name || "Parallel Branches",
          branches: new Map<number, string[]>(),
        });
        logs.push(`Found parallel step in steps array: ${s.id}`);
      }
    }
  });

  // Track branch assignments: stepId -> { parallelId, branchIndex }
  const stepToBranch = new Map<string, { parallelId: string; branchIndex: number }>();
  const visitedForBranch = new Set<string>();

  // 3. Process legacy connections starting from branch handles
  // Phase 3A: Register all immediate branch heads directly connected to branch ports
  legacyConnections.forEach((conn) => {
    if (parallelMap.has(conn.fromId) && conn.fromPort.startsWith("branch-")) {
      const branchIdx = parseInt(conn.fromPort.replace("branch-", ""), 10) || 0;
      const pData = parallelMap.get(conn.fromId)!;
      if (!pData.branches.has(branchIdx)) {
        pData.branches.set(branchIdx, []);
      }
      if (!stepToBranch.has(conn.toId)) {
        stepToBranch.set(conn.toId, { parallelId: conn.fromId, branchIndex: branchIdx });
        pData.branches.get(branchIdx)!.push(conn.toId);
        visitedForBranch.add(conn.toId);
        logs.push(
          `Attached step "${stepsById.get(conn.toId)?.name || conn.toId}" to branch ${branchIdx + 1} of parallel "${conn.fromId}"`
        );
      }
    }
  });

  // Phase 3B: Trace descendants within each branch and detect/remove cross-branch edges
  parallelMap.forEach((pData, pId) => {
    pData.branches.forEach((stepList, branchIdx) => {
      const queue = [...stepList];
      while (queue.length > 0) {
        const currId = queue.shift()!;
        const nextConns = legacyConnections.filter(
          (c) => c.fromId === currId && !c.fromPort.startsWith("branch-")
        );
        for (const nc of nextConns) {
          if (parallelMap.has(nc.toId)) continue;
          if (stepToBranch.has(nc.toId)) {
            const assigned = stepToBranch.get(nc.toId)!;
            if (assigned.parallelId !== pId || assigned.branchIndex !== branchIdx) {
              logs.push(
                `Removed invalid cross-branch connection between "${currId}" and "${nc.toId}"`
              );
            }
          } else {
            stepToBranch.set(nc.toId, { parallelId: pId, branchIndex: branchIdx });
            stepList.push(nc.toId);
            visitedForBranch.add(nc.toId);
            logs.push(
              `Attached step "${stepsById.get(nc.toId)?.name || nc.toId}" to branch ${branchIdx + 1} of parallel "${pId}"`
            );
            queue.push(nc.toId);
          }
        }
      }
    });
  });

  // 4. Handle legacy flat "executionType: parallel" if no connection-based parallel groups were resolved
  if (parallelMap.size === 0) {
    const parallelRuns: WorkflowStep[][] = [];
    let currentRun: WorkflowStep[] = [];

    rawSteps.forEach((s) => {
      if (s.executionType === "parallel") {
        currentRun.push(s);
      } else {
        if (currentRun.length >= 2) {
          parallelRuns.push([...currentRun]);
        }
        currentRun = [];
      }
    });
    if (currentRun.length >= 2) {
      parallelRuns.push([...currentRun]);
    }

    if (parallelRuns.length > 0) {
      logs.push(`Detected ${parallelRuns.length} legacy consecutive parallel step run(s)`);
      const migratedSteps: WorkflowStep[] = [];
      const handledStepIds = new Set<string>();

      let stepIdx = 0;
      while (stepIdx < rawSteps.length) {
        const step = rawSteps[stepIdx];
        if (step.executionType === "parallel" && !handledStepIds.has(step.id)) {
          // Find matching run
          const matchingRun = parallelRuns.find((r) => r.some((m) => m.id === step.id));
          if (matchingRun) {
            const pStep = createParallelStep(`parallel-${step.id}`, Math.max(2, matchingRun.length));
            pStep.branches = matchingRun.map((m, mIdx) => ({
              id: `${pStep.id}-b${mIdx + 1}`,
              name: `Branch ${mIdx + 1}`,
              steps: [{ ...m, executionType: "wait" }],
            }));
            matchingRun.forEach((m) => handledStepIds.add(m.id));
            migratedSteps.push(pStep);
            logs.push(
              `Migrated ${matchingRun.length} parallel steps [${matchingRun.map((m) => m.name).join(", ")}] into parallel node ${pStep.id}`
            );
            stepIdx += matchingRun.length;
            continue;
          }
        }
        migratedSteps.push(step);
        stepIdx++;
      }
      return { steps: migratedSteps, logs };
    }
  }

  // 5. Reconstruct tree using parallelMap and stepToBranch
  const mainSequence: WorkflowStep[] = [];
  const assignedStepIds = new Set<string>();

  // Process parallel nodes and build their branch trees
  const parallelStepObjects = new Map<string, WorkflowStep>();
  parallelMap.forEach((pData, pId) => {
    const existingStep = stepsById.get(pId);
    const branchCount = Math.max(2, pData.branches.size);
    const branches: AutomationBranch[] = [];

    for (let bIdx = 0; bIdx < branchCount; bIdx++) {
      const stepIdsInBranch = pData.branches.get(bIdx) || [];
      const branchSteps: WorkflowStep[] = [];
      stepIdsInBranch.forEach((sid) => {
        const s = stepsById.get(sid);
        if (s) {
          branchSteps.push({ ...s });
          assignedStepIds.add(sid);
        }
      });
      branches.push({
        id: `${pId}-b${bIdx + 1}`,
        name: `Branch ${bIdx + 1}`,
        steps: branchSteps,
      });
    }

    const pStep: WorkflowStep = {
      ...(existingStep || {}),
      id: pId,
      name: existingStep?.name || pData.name || "Parallel Branches",
      description: existingStep?.description || "Run multiple branches concurrently",
      iconKey: "layers",
      kind: "parallel",
      stepKey: "parallel",
      branches,
    };
    parallelStepObjects.set(pId, pStep);
  });

  // Assemble the main sequence in order:
  // Any step or parallel node not assigned to a branch goes into the main sequence.
  rawSteps.forEach((s) => {
    if (parallelMap.has(s.id)) {
      mainSequence.push(parallelStepObjects.get(s.id)!);
      assignedStepIds.add(s.id);
    } else if (!assignedStepIds.has(s.id)) {
      mainSequence.push(s);
      assignedStepIds.add(s.id);
      logs.push(`Appended step "${s.name}" (${s.id}) to main sequence`);
    }
  });

  // If there are canvas parallel nodes that were not in rawSteps:
  parallelStepObjects.forEach((pStep, pId) => {
    if (!assignedStepIds.has(pId)) {
      mainSequence.push(pStep);
      assignedStepIds.add(pId);
      logs.push(`Added parallel node "${pId}" to main sequence`);
    }
  });

  // Any orphan steps that were in stepsById but never assigned:
  stepsById.forEach((step, sId) => {
    if (!assignedStepIds.has(sId)) {
      mainSequence.push(step);
      assignedStepIds.add(sId);
      logs.push(`Appended orphaned step "${step.name}" (${sId}) to main sequence`);
    }
  });

  return { steps: mainSequence, logs };
}
