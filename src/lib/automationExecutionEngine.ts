import type { WorkflowStep } from "../app/types/workflow.ts";
import { isParallelStep } from "./automationTree.ts";

export interface StepExecutionLog {
  stepId: string;
  stepName: string;
  stepKey?: string;
  branchPath: string; // e.g., "Main > Step 1" or "Main > Parallel 1 > Branch 2 > Step 1"
  startedAt: number;  // timestamp in ms
  endedAt: number;    // timestamp in ms
  durationMs: number;
  status: "completed" | "skipped" | "failed";
  error?: string;
}

export interface ExecutionEngineOptions {
  stepExecutor?: (step: WorkflowStep, path: string) => Promise<void> | void;
  sleepFn?: (ms: number, step: WorkflowStep) => Promise<void>;
  logger?: (log: StepExecutionLog) => void;
  shouldStop?: () => boolean;
  context?: Record<string, any>;
}

/**
 * Calculates milliseconds for a delay/wait step.
 */
export function getStepDelayMs(step: WorkflowStep): number {
  if (step.stepKey === "wait" || step.stepKey === "delay" || (step.delayValue && step.delayValue > 0)) {
    const val = step.delayValue ?? step.params?.delayValue ?? 0;
    const unit = (step.delayUnit ?? step.params?.delayUnit ?? "second").toLowerCase();
    if (unit.startsWith("milli") || unit === "ms") {
      return val;
    }
    if (unit.startsWith("second") || unit.startsWith("sec") || unit === "s") {
      return val * 1000;
    }
    if (unit.startsWith("minute") || unit.startsWith("min") || unit === "m") {
      return val * 60 * 1000;
    }
    if (unit.startsWith("hour") || unit.startsWith("hr") || unit === "h") {
      return val * 60 * 60 * 1000;
    }
    if (unit.startsWith("day") || unit === "d") {
      return val * 24 * 60 * 60 * 1000;
    }
    if (unit.startsWith("week") || unit === "w") {
      return val * 7 * 24 * 60 * 60 * 1000;
    }
    if (unit.startsWith("month") || unit === "mo") {
      return val * 30 * 24 * 60 * 60 * 1000;
    }
    return val * 1000;
  }
  return 0;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Executes a sequence of workflow steps in strict sequential order.
 * On reaching a ParallelNode, starts ALL its branches concurrently (at the same time).
 * Each branch runs its own steps in order independently.
 * Nested parallel nodes fan out concurrently when reached.
 */
export async function executeWorkflowSequence(
  steps: WorkflowStep[],
  options: ExecutionEngineOptions = {},
  currentPath = "Main",
  logs: StepExecutionLog[] = []
): Promise<StepExecutionLog[]> {
  const {
    stepExecutor,
    sleepFn = defaultSleep,
    logger,
    shouldStop,
  } = options;

  for (let i = 0; i < steps.length; i++) {
    if (shouldStop && shouldStop()) {
      break;
    }

    const step = steps[i];
    if (step.enabled === false) {
      const skipLog: StepExecutionLog = {
        stepId: step.id,
        stepName: step.name,
        stepKey: step.stepKey,
        branchPath: `${currentPath} > ${step.name}`,
        startedAt: Date.now(),
        endedAt: Date.now(),
        durationMs: 0,
        status: "skipped",
      };
      logs.push(skipLog);
      if (logger) logger(skipLog);
      continue;
    }

    if (step.stepKey === "condition") {
      // Condition Node reached:
      // Evaluate condition cases in order. If any case matches, execute its branch.
      // If no cases match, fallback to the Else branch.
      const cases = Array.isArray(step.params?.cases) ? step.params.cases : [];
      const branches = step.branches || [];
      let matchedBranchId = null;
      let matchedCaseName = null;

      for (let cIdx = 0; cIdx < cases.length; cIdx++) {
        const c = cases[cIdx];
        const conds = c.conditions || [];
        if (conds.length === 0) continue;

        const matchLogic = c.matchLogic || "AND";
        let isMatch = false;

        const evaluateRule = (rule) => {
          if (!rule || !rule.field) return true;
          if (!options.context) return true;
          const val = options.context[rule.field] ?? options.context[rule.field.toLowerCase()];
          const target = rule.value;
          switch (rule.operator) {
            case "Equal To":
            case "Equals":
            case "is":
              return String(val ?? "").toLowerCase() === String(target ?? "").toLowerCase();
            case "Not Equal To":
            case "is not":
              return String(val ?? "").toLowerCase() !== String(target ?? "").toLowerCase();
            case "Contains":
              return String(val ?? "").toLowerCase().includes(String(target ?? "").toLowerCase());
            case "Does Not Contain":
              return !String(val ?? "").toLowerCase().includes(String(target ?? "").toLowerCase());
            case "Is Empty":
              return val === undefined || val === null || val === "";
            case "Is Not Empty":
              return val !== undefined && val !== null && val !== "";
            case "Greater Than":
              return Number(val) > Number(target);
            case "Less Than":
              return Number(val) < Number(target);
            default:
              return true;
          }
        };

        if (matchLogic === "AND") {
          isMatch = conds.every(evaluateRule);
        } else {
          isMatch = conds.some(evaluateRule);
        }

        if (isMatch) {
          matchedBranchId = c.id;
          matchedCaseName = c.name || `Case ${cIdx + 1}`;
          break;
        }
      }

      let targetBranch = matchedBranchId ? branches.find((b) => b.id === matchedBranchId) : null;
      if (!targetBranch) {
        targetBranch = branches.find(
          (b) => b.id === "else" || b.id.endsWith("-else") || b.name === "Else"
        ) || branches[branches.length - 1];
        matchedCaseName = "Else";
      }

      if (targetBranch) {
        const branchLabel = targetBranch.name || matchedCaseName || "Branch";
        const nestedPath = `${currentPath} > ${step.name || "Condition"} > ${branchLabel}`;
        await executeWorkflowSequence(targetBranch.steps || [], options, nestedPath, logs);
      }
    } else if (isParallelStep(step)) {
      // Parallel Branches Node reached:
      // Start ALL branches concurrently at the same time without awaiting one before the other!
      const branches = step.branches || [];
      const parallelName = step.name || "Parallel Branches";

      // Concurrently dispatch execution for all branches
      const branchPromises = branches.map((branch, bIdx) => {
        const branchLabel = branch.name || `Branch ${bIdx + 1}`;
        const nestedPath = `${currentPath} > ${parallelName} > ${branchLabel}`;
        return executeWorkflowSequence(branch.steps || [], options, nestedPath, logs);
      });

      // Wait for all concurrent branches to complete
      await Promise.all(branchPromises);
    } else {
      // Regular step: execute in order
      const stepPath = `${currentPath} > ${step.name}`;
      const startedAt = Date.now();

      // Respect wait/delay if specified
      const delayMs = getStepDelayMs(step);
      if (delayMs > 0) {
        await sleepFn(delayMs, step);
      }

      try {
        if (stepExecutor) {
          await stepExecutor(step, stepPath);
        }
        const endedAt = Date.now();
        const execLog: StepExecutionLog = {
          stepId: step.id,
          stepName: step.name,
          stepKey: step.stepKey,
          branchPath: stepPath,
          startedAt,
          endedAt,
          durationMs: endedAt - startedAt,
          status: "completed",
        };
        logs.push(execLog);
        if (logger) logger(execLog);
      } catch (err: any) {
        const endedAt = Date.now();
        const failLog: StepExecutionLog = {
          stepId: step.id,
          stepName: step.name,
          stepKey: step.stepKey,
          branchPath: stepPath,
          startedAt,
          endedAt,
          durationMs: endedAt - startedAt,
          status: "failed",
          error: err?.message || String(err),
        };
        logs.push(failLog);
        if (logger) logger(failLog);
        throw err;
      }
    }
  }

  return logs;
}
