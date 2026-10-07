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

    if (isParallelStep(step)) {
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
