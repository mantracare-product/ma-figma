import React, { useState, useEffect } from "react";
import { Clock, Calendar, Check, X, CalendarX2, Plus } from "lucide-react";
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
  const [skipOffDays, setSkipOffDays] = useState(config?.skipOffDays ?? config?.skipWeekends ?? true);
  const [weeklyOffDays, setWeeklyOffDays] = useState<string[]>(config?.weeklyOffDays ?? ["sat", "sun"]);
  const [customOffDates, setCustomOffDates] = useState<string[]>(config?.customOffDates ?? []);
  const [newCustomDate, setNewCustomDate] = useState("");
  const [newCustomLabel, setNewCustomLabel] = useState("");
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
      skipWeekends: skipOffDays,
      skipOffDays,
      weeklyOffDays,
      customOffDates,
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

        {/* Skip Off Days Config (Weekly + Custom Off Dates) */}
        <div className="py-2 border-b border-gray-100 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CalendarX2 className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-semibold text-slate-800">Skip Off Days</span>
              <InfoTooltip content="Do not count configured weekly rest days or custom holidays when calculating task duration" />
            </div>
            <input
              type="checkbox"
              checked={skipOffDays}
              onChange={(e) => setSkipOffDays(e.target.checked)}
              className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 cursor-pointer"
            />
          </div>

          {skipOffDays && (
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2.5 animate-in fade-in duration-150">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Weekly Off Days</label>
                <div className="grid grid-cols-7 gap-1">
                  {[
                    { id: "mon", label: "M" },
                    { id: "tue", label: "T" },
                    { id: "wed", label: "W" },
                    { id: "thu", label: "T" },
                    { id: "fri", label: "F" },
                    { id: "sat", label: "S" },
                    { id: "sun", label: "S" },
                  ].map((day) => {
                    const active = weeklyOffDays.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => {
                          if (active) {
                            setWeeklyOffDays(weeklyOffDays.filter((d) => d !== day.id));
                          } else {
                            setWeeklyOffDays([...weeklyOffDays, day.id]);
                          }
                        }}
                        className={`py-1 rounded text-xs font-semibold border transition-all cursor-pointer ${
                          active
                            ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Custom Holidays / Blackout Dates</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={newCustomDate}
                    onChange={(e) => setNewCustomDate(e.target.value)}
                    className="text-xs p-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono flex-1"
                  />
                  <input
                    type="text"
                    placeholder="Label (e.g. Labor Day)"
                    value={newCustomLabel}
                    onChange={(e) => setNewCustomLabel(e.target.value)}
                    className="text-xs p-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newCustomDate) {
                        const entry = newCustomLabel ? `${newCustomDate} (${newCustomLabel})` : newCustomDate;
                        if (!customOffDates.includes(entry)) {
                          setCustomOffDates([...customOffDates, entry]);
                        }
                        setNewCustomDate("");
                        setNewCustomLabel("");
                      }
                    }}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {customOffDates.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {customOffDates.map((item) => (
                      <span
                        key={item}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] text-slate-700 font-medium"
                      >
                        <span>{item}</span>
                        <button
                          type="button"
                          onClick={() => setCustomOffDates(customOffDates.filter((c) => c !== item))}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
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

