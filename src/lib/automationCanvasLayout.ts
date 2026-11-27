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

export const NODE_WIDTH = 248;
export const NODE_HEIGHT = 92;
export const H_GAP = 52;
export const V_GAP = 68;
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
   * Layout a set of steps allowing both sequential chains and multi-child parallel fan-out via connectAfterId.
   */
  function layoutSequence(
    seqSteps: WorkflowStep[],
    centerX: number,
    startY: number,
    incomingNodeId: string,
    incomingPort: string,
    branchContext?: { parallelId: string; branchId: string; branchIndex: number }
  ): { maxY: number; lastNodeId: string | null } {
    if (!seqSteps || seqSteps.length === 0) {
      return { maxY: startY, lastNodeId: incomingNodeId };
    }

    const seqIds = new Set(seqSteps.map((s) => s.id));
    const entryParentKey = incomingNodeId || "__branch_root__";
    const childrenByParent = new Map<string, WorkflowStep[]>();
    const disconnectedSteps: WorkflowStep[] = [];

    const addChild = (parentId: string, child: WorkflowStep) => {
      const list = childrenByParent.get(parentId) || [];
      list.push(child);
      childrenByParent.set(parentId, list);
    };

    for (let i = 0; i < seqSteps.length; i++) {
      const s = seqSteps[i];
      if (s.connectAfterId === "none") {
        disconnectedSteps.push(s);
        continue;
      }
      if (s.connectAfterId) {
        if (s.connectAfterId === incomingNodeId || seqIds.has(s.connectAfterId)) {
          addChild(s.connectAfterId, s);
        } else {
          // Unknown external parent inside this scope -> attach to entry parent
          addChild(entryParentKey, s);
        }
      } else {
        const implicitParent = i === 0 ? entryParentKey : seqSteps[i - 1].id;
        addChild(implicitParent, s);
      }
    }

    const widthCache = new Map<string, number>();
    const measureStepWidth = (step: WorkflowStep, seen = new Set<string>()): number => {
      if (widthCache.has(step.id)) return widthCache.get(step.id)!;
      if (seen.has(step.id)) return MIN_BRANCH_COL_WIDTH;
      seen.add(step.id);

      let selfW = MIN_BRANCH_COL_WIDTH;
      if (isParallelStep(step)) {
        selfW = getStepSubtreeWidth(step);
      }
      const kids = childrenByParent.get(step.id) || [];
      let kidsW = 0;
      if (kids.length > 0) {
        kidsW = kids.reduce((acc, k) => acc + measureStepWidth(k, new Set(seen)), 0);
      }
      const total = Math.max(selfW, kidsW, MIN_BRANCH_COL_WIDTH);
      widthCache.set(step.id, total);
      return total;
    };

    const placed = new Set<string>();
    let globalMaxY = startY;
    let lastPlacedId: string | null = incomingNodeId;

    const placeNodeAndChildren = (
      step: WorkflowStep,
      nodeCenterX: number,
      nodeY: number,
      parentConnFromId: string | null,
      parentConnPort: string
    ): number => {
      if (placed.has(step.id)) return nodeY;
      placed.add(step.id);
      lastPlacedId = step.id;

      let subtreeBottomY = nodeY + NODE_HEIGHT;

      if (isParallelStep(step)) {
        const isCondition = step.stepKey === "condition";
        const branches = step.branches || [];
        const branchWidths = branches.map((b) => getBranchSubtreeWidth(b));
        const totalParallelWidth = branchWidths.reduce((a, b) => a + b, 0);

        const parallelNode: LayoutNode = {
          id: step.id,
          type: isCondition ? "condition" : "parallel",
          label: step.name || (isCondition ? "Condition" : "Parallel Branches"),
          stepKey: step.stepKey || (isCondition ? "condition" : "parallel"),
          x: nodeCenterX,
          y: nodeY,
          config: {
            ...(step.params || {}),
            branchCount: branches.length,
            branches: branches.map((b, idx) => {
              const isElse = b.id === "else" || b.id.endsWith("-else") || b.name === "Else";
              return {
                id: b.id,
                name: b.name || (isElse ? "Else" : isCondition ? `Case ${idx + 1}` : `Branch ${idx + 1}`),
              };
            }),
            branchContext,
          },
        };
        nodes.push(parallelNode);

        if (parentConnFromId) {
          connections.push({
            id: `conn-${parentConnFromId}-${parallelNode.id}`,
            fromId: parentConnFromId,
            fromPort: parentConnPort,
            toId: parallelNode.id,
          });
        }

        const branchTopY = nodeY + NODE_HEIGHT + V_GAP;
        let branchLeft = nodeCenterX - totalParallelWidth / 2;
        let maxBranchY = nodeY + NODE_HEIGHT;

        for (let bIdx = 0; bIdx < branches.length; bIdx++) {
          const branch = branches[bIdx];
          const bWidth = branchWidths[bIdx];
          const branchCenterX = branchLeft + bWidth / 2;
          const branchPort = `branch-${bIdx}`;

          if (branch.steps && branch.steps.length > 0) {
            const res = layoutSequence(
              branch.steps,
              branchCenterX,
              branchTopY,
              step.id,
              branchPort,
              { parallelId: step.id, branchId: branch.id, branchIndex: bIdx }
            );
            if (res.maxY > maxBranchY) {
              maxBranchY = res.maxY;
            }
          }

          branchLeft += bWidth;
        }
        subtreeBottomY = maxBranchY;
      } else {
        const regularNode: LayoutNode = {
          id: step.id,
          type: step.stepKey || "step",
          label: step.name,
          stepKey: step.stepKey,
          x: nodeCenterX,
          y: nodeY,
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

        if (parentConnFromId) {
          connections.push({
            id: `conn-${parentConnFromId}-${step.id}`,
            fromId: parentConnFromId,
            fromPort: parentConnPort,
            toId: step.id,
          });
        }
      }

      const kids = childrenByParent.get(step.id) || [];
      if (kids.length > 0 && !isParallelStep(step)) {
        const kidTopY = subtreeBottomY + V_GAP;
        if (kids.length === 1) {
          subtreeBottomY = placeNodeAndChildren(kids[0], nodeCenterX, kidTopY, step.id, "default");
        } else {
          const kidWidths = kids.map((k) => measureStepWidth(k));
          const totalKidWidth = kidWidths.reduce((a, b) => a + b, 0);
          let leftX = nodeCenterX - totalKidWidth / 2;
          let deepestY = subtreeBottomY;
          kids.forEach((kid, idx) => {
            const w = kidWidths[idx];
            const bottom = placeNodeAndChildren(kid, leftX + w / 2, kidTopY, step.id, "default");
            if (bottom > deepestY) deepestY = bottom;
            leftX += w;
          });
          subtreeBottomY = deepestY;
        }
      }

      if (subtreeBottomY > globalMaxY) globalMaxY = subtreeBottomY;
      return subtreeBottomY;
    };

    const rootKids = childrenByParent.get(entryParentKey) || [];
    const rootConnFromId = incomingNodeId || null;
    if (rootKids.length === 1) {
      placeNodeAndChildren(rootKids[0], centerX, startY, rootConnFromId, incomingPort);
    } else if (rootKids.length > 1) {
      const rootWidths = rootKids.map((k) => measureStepWidth(k));
      const totalWidth = rootWidths.reduce((a, b) => a + b, 0);
      let leftX = centerX - totalWidth / 2;
      rootKids.forEach((kid, idx) => {
        const w = rootWidths[idx];
        placeNodeAndChildren(kid, leftX + w / 2, startY, rootConnFromId, incomingPort);
        leftX += w;
      });
    }

    // Place any disconnected or cyclic leftover steps cleanly below without incoming connection
    const remaining = [...disconnectedSteps, ...seqSteps.filter((s) => !placed.has(s.id))];
    remaining.forEach((step, idx) => {
      placeNodeAndChildren(
        step,
        centerX + idx * MIN_BRANCH_COL_WIDTH,
        globalMaxY + V_GAP,
        null,
        "default"
      );
    });

    return { maxY: globalMaxY, lastNodeId: lastPlacedId };
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
