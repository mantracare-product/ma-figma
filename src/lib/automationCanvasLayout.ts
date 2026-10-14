import type { WorkflowStep, AutomationBranch } from "../app/types/workflow.ts";
import { isParallelStep } from "./automationTree.ts";

export interface LayoutNode {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  stepKey?: string;
  config: Record<string, any>;
}

export interface LayoutConnection {
  id: string;
  fromId: string;
  fromPort: string;
  toId: string;
}

export interface LayoutResult {
  nodes: LayoutNode[];
  connections: LayoutConnection[];
  width: number;
  height: number;
}

export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 70;
export const H_GAP = 60;
export const V_GAP = 70;
export const MIN_BRANCH_COL_WIDTH = NODE_WIDTH + H_GAP;

/**
 * Calculates the total width required for a branch.
 */
export function getBranchSubtreeWidth(branch: AutomationBranch): number {
  if (!branch.steps || branch.steps.length === 0) {
    return MIN_BRANCH_COL_WIDTH;
  }
  let maxStepWidth = MIN_BRANCH_COL_WIDTH;
  for (const step of branch.steps) {
    const sw = getStepSubtreeWidth(step);
    if (sw > maxStepWidth) {
      maxStepWidth = sw;
    }
  }
  return maxStepWidth;
}

/**
 * Calculates the total width required for a step (including any nested parallel branches).
 */
export function getStepSubtreeWidth(step: WorkflowStep): number {
  if (!isParallelStep(step)) {
    return MIN_BRANCH_COL_WIDTH;
  }
  const branches = step.branches || [];
  if (branches.length === 0) {
    return MIN_BRANCH_COL_WIDTH * 2;
  }
  let totalWidth = 0;
  for (const branch of branches) {
    totalWidth += getBranchSubtreeWidth(branch);
  }
  return Math.max(MIN_BRANCH_COL_WIDTH * branches.length, totalWidth);
}

/**
 * Computes deterministic canvas layout from a tree of WorkflowSteps.
 */
export function computeTreeCanvasLayout(
  steps: WorkflowStep[],
  startNodeConfig?: Record<string, any>,
  originX = 400,
  originY = 80
): LayoutResult {
  const nodes: LayoutNode[] = [];
  const connections: LayoutConnection[] = [];

  // 1. Start Node
  const startNode: LayoutNode = {
    id: "start",
    type: "start",
    label: startNodeConfig?.triggerLabel || "Event Trigger",
    x: originX,
    y: originY,
    config: {
      ...(startNodeConfig || {}),
    },
  };
  nodes.push(startNode);

  let currentY = originY + NODE_HEIGHT + V_GAP;
  let prevNodeId = "start";
  let prevPort = "default";

  /**
   * Layout a sequence of steps vertically along a central X coordinate.
   */
  function layoutSequence(
    seqSteps: WorkflowStep[],
    centerX: number,
    startY: number,
    incomingNodeId: string,
    incomingPort: string,
    branchContext?: { parallelId: string; branchId: string; branchIndex: number }
  ): { maxY: number; lastNodeId: string | null } {
    let yCursor = startY;
    let lastId: string | null = incomingNodeId;
    let currPort = incomingPort;

    for (let i = 0; i < seqSteps.length; i++) {
      const step = seqSteps[i];

      if (isParallelStep(step)) {
        // Parallel Branches node
        const branches = step.branches || [];
        const branchWidths = branches.map((b) => getBranchSubtreeWidth(b));
        const totalParallelWidth = branchWidths.reduce((a, b) => a + b, 0);

        // Place parallel node centered
        const parallelNode: LayoutNode = {
          id: step.id,
          type: "parallel",
          label: step.name || "Parallel Branches",
          stepKey: "parallel",
          x: centerX,
          y: yCursor,
          config: {
            ...(step.params || {}),
            branchCount: branches.length,
            branches: branches.map((b, idx) => ({ id: b.id, name: b.name || `Branch ${idx + 1}` })),
            branchContext,
          },
        };
        nodes.push(parallelNode);

        // Connect from predecessor
        if (lastId) {
          connections.push({
            id: `conn-${lastId}-${parallelNode.id}`,
            fromId: lastId,
            fromPort: currPort,
            toId: parallelNode.id,
          });
        }

        // Layout branches side by side under the parallel node
        const branchTopY = yCursor + NODE_HEIGHT + V_GAP;
        let branchLeft = centerX - totalParallelWidth / 2;
        let maxBranchY = branchTopY;

        for (let bIdx = 0; bIdx < branches.length; bIdx++) {
          const branch = branches[bIdx];
          const bWidth = branchWidths[bIdx];
          const branchCenterX = branchLeft + bWidth / 2;
          const branchPort = `branch-${bIdx}`;

          if (!branch.steps || branch.steps.length === 0) {
            // Empty branch placeholder
            const placeholderId = `empty-${branch.id}`;
            const placeholderNode: LayoutNode = {
              id: placeholderId,
              type: "empty-branch",
              label: branch.name || `Branch ${bIdx + 1}`,
              x: branchCenterX,
              y: branchTopY,
              config: {
                branchId: branch.id,
                parallelId: step.id,
                branchIndex: bIdx,
                branchName: branch.name || `Branch ${bIdx + 1}`,
              },
            };
            nodes.push(placeholderNode);

            // Connect parallel node port -> placeholder
            connections.push({
              id: `conn-${step.id}-${placeholderId}`,
              fromId: step.id,
              fromPort: branchPort,
              toId: placeholderId,
            });

            if (branchTopY + NODE_HEIGHT > maxBranchY) {
              maxBranchY = branchTopY + NODE_HEIGHT;
            }
          } else {
            // First step in branch connects directly from parallel branch port
            const firstChild = branch.steps[0];
            connections.push({
              id: `conn-${step.id}-${firstChild.id}`,
              fromId: step.id,
              fromPort: branchPort,
              toId: firstChild.id,
            });

            // Layout branch sequence
            const res = layoutSequence(
              branch.steps,
              branchCenterX,
              branchTopY,
              "", // already connected first child
              "default",
              { parallelId: step.id, branchId: branch.id, branchIndex: bIdx }
            );

            if (res.maxY > maxBranchY) {
              maxBranchY = res.maxY;
            }
          }

          branchLeft += bWidth;
        }

        yCursor = maxBranchY + V_GAP;
        lastId = null; // No auto-join after parallel group
        currPort = "default";
      } else {
        // Regular step node
        const nodeType = step.stepKey || "step";
        const regularNode: LayoutNode = {
          id: step.id,
          type: nodeType,
          label: step.name,
          stepKey: step.stepKey,
          x: centerX,
          y: yCursor,
          config: {
            ...(step.params || {}),
            autoGenerated: true,
            sourceStepId: step.id,
            executionType: step.executionType || "wait",
            delayValue: step.delayValue,
            delayUnit: step.delayUnit,
            branchContext,
          },
        };
        nodes.push(regularNode);

        // Connect from predecessor in this sequence
        if (lastId) {
          connections.push({
            id: `conn-${lastId}-${step.id}`,
            fromId: lastId,
            fromPort: currPort,
            toId: step.id,
          });
        }

        lastId = step.id;
        currPort = "default";
        yCursor += NODE_HEIGHT + V_GAP;
      }
    }

    return { maxY: yCursor, lastNodeId: lastId };
  }

  // Layout the main sequence
  const mainResult = layoutSequence(steps, originX, currentY, prevNodeId, prevPort);

  // Compute bounding box
  let minX = originX;
  let maxX = originX;
  let maxY = mainResult.maxY;

  for (const n of nodes) {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y > maxY) maxY = n.y;
  }

  return {
    nodes,
    connections,
    width: maxX - minX + NODE_WIDTH + 200,
    height: maxY + NODE_HEIGHT + 200,
  };
}
