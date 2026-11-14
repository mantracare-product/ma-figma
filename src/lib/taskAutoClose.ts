/**
 * Auto-close (Slice 2, item 2.5): a task created for a record in a stage closes when that record leaves the stage.
 * Subscribes to `stage.exited`. Matching uses entityRef.id / instanceId and entityRef.stageId (never the event's
 * processId, which older emitters did not set). Tasks with entityRef.autoCloseOnStageExit === false are left open.
 */
import { eventBus, type BusEvent } from "./eventBus";
import { completeTaskRecord, findOpenTasksForRecord } from "./tasksStore";

export function closeTasksForStageExit(event: BusEvent): string[] {
  const data = event.data || {};
  const recordId = String(data.instanceId || event.recordId);
  const stageIds = [data.stageId, data.stageName, data.fromStageId, data.fromStageName].filter(Boolean).map(String);
  if (!recordId || stageIds.length === 0) return [];
  const closed: string[] = [];
  const seen = new Set<string>();
  for (const stage of stageIds) {
    for (const t of findOpenTasksForRecord({ id: recordId, instanceId: data.instanceId ? String(data.instanceId) : undefined, stageId: stage })) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      if (t.entityRef?.autoCloseOnStageExit === false) continue;
      completeTaskRecord(t.id, "auto:stage_exit");
      closed.push(t.id);
    }
  }
  return closed;
}

let started = false;
export function initTaskAutoClose(): void {
  if (started) return;
  started = true;
  eventBus.subscribe("stage.exited", (event) => {
    try {
      closeTasksForStageExit(event);
    } catch (e) {
      console.warn("[taskAutoClose] failed:", e);
    }
  });
}

initTaskAutoClose();
