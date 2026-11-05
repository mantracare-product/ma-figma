import React, { useState, useEffect } from "react";
import { Clock, Calendar, Check, X } from "lucide-react";
import DrawerShell from "../ui/DrawerShell";
import { Tooltip } from "../ui/Tooltip";
import { InfoTooltip } from "../help/InfoTooltip";
import { TaskTimePlanningConfig } from "../../../types/task";

export interface TaskTimePlanningDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  config?: TaskTimePlanningConfig;
  onSave: (config: TaskTimePlanningConfig) => void;
}

export default function TaskTimePlanningDrawer({
  isOpen,
  onClose,
  config,
  onSave,
}: TaskTimePlanningDrawerProps) {
  const [startDate, setStartDate] = useState(config?.startDate ?? new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(config?.dueDate ?? "");
  const [durationDays, setDurationDays] = useState(config?.durationDays ?? 3);
  const [assigneeCanEditDates, setAssigneeCanEditDates] = useState(config?.assigneeCanEditDates ?? true);
  const [skipWeekends, setSkipWeekends] = useState(config?.skipWeekends ?? true);
  const [useSubtaskDates, setUseSubtaskDates] = useState(config?.useSubtaskDates ?? false);

  // Auto-calculate due date or duration when dates change
  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (val && durationDays > 0) {
      const d = new Date(val);
      d.setDate(d.getDate() + Number(durationDays));
      setDueDate(d.toISOString().split("T")[0]);
    }
  };

  const handleDurationChange = (days: number) => {
    const val = Math.max(1, days);
    setDurationDays(val);
    if (startDate) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + val);
      setDueDate(d.toISOString().split("T")[0]);
    }
  };

  const handleDueDateChange = (val: string) => {
    setDueDate(val);
    if (startDate && val) {
      const start = new Date(startDate).getTime();
      const end = new Date(val).getTime();
      const diff = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
      setDurationDays(diff);
    }
  };

  const handleApply = () => {
    onSave({
      startDate,
      dueDate,
      durationDays,
      assigneeCanEditDates,
      skipWeekends,
      useSubtaskDates,
    });
    onClose();
  };

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title="Time Planning"
      subtitle="Schedule & Duration Rules"
      icon={<Clock className="w-5 h-5 text-slate-700" />}
      width="max-w-[540px]"
      zIndex={700}
      headerRight={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-1.5 rounded-xl bg-[#1E293B] hover:bg-slate-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            Apply Planning
          </button>
        </div>
      }
      bodyClassName="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/50"
    >
      {/* ── Dates & Duration Card ── */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Schedule Boundaries
          </h3>
          <InfoTooltip content="Planned start, duration, and completion deadline" />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">Start Date</label>
            <InfoTooltip content="When work is scheduled to commence" />
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] text-slate-900 font-mono"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">Duration (Days)</label>
              <InfoTooltip content="Estimated working days to finish" />
            </div>
            <input
              type="number"
              min={1}
              value={durationDays}
              onChange={(e) => handleDurationChange(parseInt(e.target.value) || 1)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] text-slate-900 font-mono tabular-nums"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">Due Date</label>
              <InfoTooltip content="Hard deadline for deliverables" />
            </div>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => handleDueDateChange(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] text-slate-900 font-mono"
            />
          </div>
        </div>
      </div>

      {/* ── Constraints & Permissions Card ── */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Planning Constraints
          </h3>
          <InfoTooltip content="Enforce operational scheduling rules and delegation boundaries" />
        </div>

        {/* Assignee can edit dates */}
        <div className="flex items-center justify-between py-1 border-b border-gray-50">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-800">Assignee Can Edit Dates</span>
            <InfoTooltip content="Allow the designated assignee to reschedule start or due dates" />
          </div>
          <input
            type="checkbox"
            checked={assigneeCanEditDates}
            onChange={(e) => setAssigneeCanEditDates(e.target.checked)}
            className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 cursor-pointer"
          />
        </div>

        {/* Skip weekends */}
        <div className="flex items-center justify-between py-1 border-b border-gray-50">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-800">Skip Weekends</span>
            <InfoTooltip content="Do not count Saturdays and Sundays when calculating task duration" />
          </div>
          <input
            type="checkbox"
            checked={skipWeekends}
            onChange={(e) => setSkipWeekends(e.target.checked)}
            className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 cursor-pointer"
          />
        </div>

        {/* Use subtask dates */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-800">Use Subtask Dates</span>
            <InfoTooltip content="Derive overall task start and due dates automatically from earliest and latest subtasks" />
          </div>
          <input
            type="checkbox"
            checked={useSubtaskDates}
            onChange={(e) => setUseSubtaskDates(e.target.checked)}
            className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 cursor-pointer"
          />
        </div>
      </div>
    </DrawerShell>
  );
}

