import type { WorkflowStep, AutomationBranch } from "../app/types/workflow.ts";

/**
 * Check if a step is a Parallel Branches node.
 */
export function isParallelStep(step: WorkflowStep): boolean {
  if (!step) return false;
  return (
    step.kind === "parallel" ||
    step.stepKey === "parallel" ||
    (Array.isArray(step.branches) && step.branches.length > 0)
  );
}

/**
 * Ensures a parallel step has at least 2 branches with proper names and structure.
 */
export function ensureValidBranches(step: WorkflowStep): WorkflowStep {
  if (!isParallelStep(step)) return step;

  const existingBranches = Array.isArray(step.branches) ? [...step.branches] : [];
  const baseId = step.id || `parallel-${Date.now()}`;

  while (existingBranches.length < 2) {
    const idx = existingBranches.length + 1;
    existingBranches.push({
      id: `${baseId}-b${idx}`,
      name: `Branch ${idx}`,
      steps: [],
    });
  }

  const normalizedBranches: AutomationBranch[] = existingBranches.map((b, idx) => ({
    id: b.id || `${baseId}-b${idx + 1}`,
    name: b.name || `Branch ${idx + 1}`,
    steps: Array.isArray(b.steps) ? b.steps.map(ensureValidBranches) : [],
  }));

  return {
    ...step,
    kind: "parallel",
    stepKey: "parallel",
    iconKey: step.iconKey || "layers",
    name: step.name || "Parallel Branches",
    description: step.description || "Run multiple branches concurrently",
    branches: normalizedBranches,
  };
}

/**
 * Create a brand new Parallel Branches step with at least 2 branches.
 */
export function createParallelStep(
  customId?: string,
  branchCount = 2,
  name = "Parallel Branches"
): WorkflowStep {
  const count = Math.max(2, branchCount);
  const id = customId || `parallel-${Date.now()}`;
  const branches: AutomationBranch[] = [];

  for (let i = 1; i <= count; i++) {
    branches.push({
      id: `${id}-b${i}`,
      name: `Branch ${i}`,
      steps: [],
    });
  }

  return {
    id,
    name,
    description: "Run multiple branches concurrently at the same time",
    iconKey: "layers",
    kind: "parallel",
    stepKey: "parallel",
    branches,
  };
}

/**
 * Deep clone workflow steps tree.
 */
export function cloneWorkflowTree(steps: WorkflowStep[]): WorkflowStep[] {
  return JSON.parse(JSON.stringify(steps));
}

/**
 * Recursively find a step by ID and return its parent context.
 */
export function findStepInTree(
  steps: WorkflowStep[],
  stepId: string
): {
  step: WorkflowStep;
  parentBranch: AutomationBranch | null;
  parentSequence: WorkflowStep[];
  index: number;
} | null {
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (s.id === stepId) {
      return { step: s, parentBranch: null, parentSequence: steps, index: i };
    }
    if (isParallelStep(s) && s.branches) {
      for (const branch of s.branches) {
        if (branch.steps) {
          for (let j = 0; j < branch.steps.length; j++) {
            const child = branch.steps[j];
            if (child.id === stepId) {
              return {
                step: child,
                parentBranch: branch,
                parentSequence: branch.steps,
                index: j,
              };
            }
            const nested = findStepInTree(branch.steps, stepId);
            if (nested) return nested;
          }
        }
      }
    }
  }
  return null;
}

/**
 * Recursively find a branch by its ID.
 */
export function findBranchInTree(
  steps: WorkflowStep[],
  branchId: string
): {
  branch: AutomationBranch;
  parallelStep: WorkflowStep;
  branchIndex: number;
} | null {
  for (const s of steps) {
    if (isParallelStep(s) && s.branches) {
      for (let i = 0; i < s.branches.length; i++) {
        const b = s.branches[i];
        if (b.id === branchId) {
          return { branch: b, parallelStep: s, branchIndex: i };
        }
        if (b.steps) {
          const nested = findBranchInTree(b.steps, branchId);
          if (nested) return nested;
        }
      }
    }
  }
  return null;
}

/**
 * Appends or inserts a step into the tree.
 * - If targetBranchId is provided, appends/inserts into that specific branch.
 * - If afterStepId is provided, finds where that step lives (inside a branch or in main sequence)
 *   and inserts immediately after it.
 * - Otherwise, appends to the end of the root sequence.
 */
export function appendStepToTree(
  steps: WorkflowStep[],
  newStep: WorkflowStep,
  targetBranchId?: string | null,
  afterStepId?: string | null
): WorkflowStep[] {
  const preparedStep = isParallelStep(newStep) ? ensureValidBranches(newStep) : { ...newStep };
  const tree = cloneWorkflowTree(steps);

  // 1. If explicit branch target provided
  if (targetBranchId) {
    function insertIntoBranch(list: WorkflowStep[]): boolean {
      for (const s of list) {
        if (isParallelStep(s) && s.branches) {
          for (const b of s.branches) {
            if (b.id === targetBranchId) {
              b.steps = b.steps || [];
              if (afterStepId) {
                const idx = b.steps.findIndex((st) => st.id === afterStepId);
                if (idx !== -1) {
                  b.steps.splice(idx + 1, 0, preparedStep);
                  return true;
                }
              }
              b.steps.push(preparedStep);
              return true;
            }
            if (b.steps && insertIntoBranch(b.steps)) {
              return true;
            }
          }
        }
      }
      return false;
    }
    const inserted = insertIntoBranch(tree);
    if (inserted) return tree;
  }

  // 2. If afterStepId is provided and exists in the tree
  if (afterStepId && afterStepId !== "start") {
    const stepCtx = findStepInTree(tree, afterStepId);
    if (stepCtx) {
      if (stepCtx.parentBranch) {
        // The step lives inside a branch: insert immediately after it in that branch
        stepCtx.parentSequence.splice(stepCtx.index + 1, 0, preparedStep);
        return tree;
      } else {
        // The step lives in the main sequence
        if (
          isParallelStep(stepCtx.step) &&
          stepCtx.step.branches &&
          stepCtx.step.branches.length > 0
        ) {
          // If the selected node itself was a parallel node with no branch specified,
          // insert into its first branch
          stepCtx.step.branches[0].steps = stepCtx.step.branches[0].steps || [];
          stepCtx.step.branches[0].steps.push(preparedStep);
          return tree;
        }
        stepCtx.parentSequence.splice(stepCtx.index + 1, 0, preparedStep);
        return tree;
      }
    }
  }

  // 3. Fallback: append to end of root sequence
  tree.push(preparedStep);
  return tree;
}

/**
 * Recursively deletes a step from the tree.
 * If the step is a ParallelNode, deletes all its branches and child steps.
 */
export function deleteStepFromTree(steps: WorkflowStep[], stepId: string): WorkflowStep[] {
  const tree = cloneWorkflowTree(steps);

  function filterList(list: WorkflowStep[]): WorkflowStep[] {
    return list
      .filter((s) => s.id !== stepId)
      .map((s) => {
        if (isParallelStep(s) && s.branches) {
          return {
            ...s,
            branches: s.branches.map((b) => ({
              ...b,
              steps: filterList(b.steps || []),
            })),
          };
        }
        return s;
      });
  }

  return filterList(tree);
}

/**
 * Recursively updates a step in the tree by its ID.
 */
export function updateStepInTree(
  steps: WorkflowStep[],
  stepId: string,
  updatedFields: Partial<WorkflowStep>
): WorkflowStep[] {
  const tree = cloneWorkflowTree(steps);

  function mutate(list: WorkflowStep[]): boolean {
    const idx = list.findIndex((s) => s.id === stepId);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updatedFields };
      return true;
    }
    for (const s of list) {
      if (isParallelStep(s) && s.branches) {
        for (const b of s.branches) {
          if (b.steps && mutate(b.steps)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  mutate(tree);
  return tree;
}

/**
 * Adds a new branch to a ParallelNode.
 */
export function addBranchToStep(steps: WorkflowStep[], parallelStepId: string): WorkflowStep[] {
  const tree = cloneWorkflowTree(steps);

  function mutate(list: WorkflowStep[]): boolean {
    for (const s of list) {
      if (s.id === parallelStepId && isParallelStep(s)) {
        s.branches = s.branches || [];
        const nextIdx = s.branches.length + 1;
        s.branches.push({
          id: `${s.id}-b${Date.now()}-${nextIdx}`,
          name: `Branch ${nextIdx}`,
          steps: [],
        });
        return true;
      }
      if (isParallelStep(s) && s.branches) {
        for (const b of s.branches) {
          if (b.steps && mutate(b.steps)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  mutate(tree);
  return tree;
}

/**
 * Removes a branch from a ParallelNode, never allowing fewer than 2 branches.
 */
export function removeBranchFromStep(
  steps: WorkflowStep[],
  parallelStepId: string,
  branchId: string
): { updatedSteps: WorkflowStep[]; success: boolean; reason?: string } {
  const tree = cloneWorkflowTree(steps);
  let success = false;
  let reason: string | undefined;

  function mutate(list: WorkflowStep[]): boolean {
    for (const s of list) {
      if (s.id === parallelStepId && isParallelStep(s)) {
        s.branches = s.branches || [];
        if (s.branches.length <= 2) {
          reason = "A Parallel node must have at least 2 branches.";
          return true;
        }
        const initialLen = s.branches.length;
        s.branches = s.branches.filter((b) => b.id !== branchId);
        // Rename remaining branches cleanly: Branch 1, Branch 2, ...
        s.branches.forEach((b, idx) => {
          if (!b.name || b.name.startsWith("Branch ")) {
            b.name = `Branch ${idx + 1}`;
          }
        });
        success = s.branches.length < initialLen;
        return true;
      }
      if (isParallelStep(s) && s.branches) {
        for (const b of s.branches) {
          if (b.steps && mutate(b.steps)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  mutate(tree);
  return { updatedSteps: tree, success, reason };
}

/**
 * Reorder a step only inside its own sequence (root or branch).
 */
export function reorderStepInTree(
  steps: WorkflowStep[],
  stepId: string,
  direction: "up" | "down"
): WorkflowStep[] {
  const tree = cloneWorkflowTree(steps);

  function mutate(list: WorkflowStep[]): boolean {
    const idx = list.findIndex((s) => s.id === stepId);
    if (idx !== -1) {
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx >= 0 && targetIdx < list.length) {
        const temp = list[idx];
        list[idx] = list[targetIdx];
        list[targetIdx] = temp;
      }
      return true;
    }
    for (const s of list) {
      if (isParallelStep(s) && s.branches) {
        for (const b of s.branches) {
          if (b.steps && mutate(b.steps)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  mutate(tree);
  return tree;
}

/**
 * Retrieve all step IDs contained anywhere in the tree.
 */
export function getAllStepIdsInTree(steps: WorkflowStep[]): string[] {
  const ids: string[] = [];
  function collect(list: WorkflowStep[]) {
    for (const s of list) {
      ids.push(s.id);
      if (isParallelStep(s) && s.branches) {
        for (const b of s.branches) {
          if (b.steps) collect(b.steps);
        }
      }
    }
  }
  collect(steps);
  return ids;
}
