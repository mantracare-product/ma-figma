import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TASK_VIEWS_EVENT, countTasksInView, taskViewsStore, type TaskView } from "../../../lib/taskViewsStore";
import type { TaskEntity } from "../../../types/task";
import { newId } from "../../../lib/refStore";

/** Queue selector + "Save view" for the Tasks page. A queue is a saved view over tasks (Slice 2, 2.5). */
export default function TaskQueueBar({
  tasks,
  activeViewId,
  onChange,
}: {
  tasks: TaskEntity[];
  activeViewId: string;
  onChange: (id: string) => void;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener(TASK_VIEWS_EVENT, bump);
    return () => window.removeEventListener(TASK_VIEWS_EVENT, bump);
  }, []);

  const views = taskViewsStore.get();
  const active = views.find((v) => v.id === activeViewId);
  if (views.length === 0 && !activeViewId) return null;

  const saveCurrent = () => {
    const name = window.prompt("Name for this view");
    if (!name || !name.trim()) return;
    const base: Partial<TaskView> = active ? { queueIds: active.queueIds, priorities: active.priorities, overdueOnly: active.overdueOnly } : {};
    const view: TaskView = { id: newId("view"), name: name.trim(), ...base };
    taskViewsStore.upsert(view);
    onChange(view.id);
    toast.success("View saved");
  };

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="task-queue-bar">
      <span className="text-xs font-semibold text-slate-500">Queue</span>
      <select
        data-testid="task-queue-select"
        value={activeViewId}
        onChange={(e) => onChange(e.target.value)}
        className="h-[34px] px-3 text-xs font-semibold border border-slate-200 rounded-lg bg-white"
      >
        <option value="">All tasks</option>
        {views.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name} ({countTasksInView(tasks, v)})
          </option>
        ))}
      </select>
      <button type="button" onClick={saveCurrent} className="h-[34px] px-3 text-xs font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50">
        Save view
      </button>
      {active && !active.sample && (
        <button
          type="button"
          onClick={() => {
            taskViewsStore.remove(active.id);
            onChange("");
          }}
          className="h-[34px] px-3 text-xs font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50"
        >
          Delete view
        </button>
      )}
    </div>
  );
}
