import React, { useState } from "react";
import { Repeat, Calendar, Clock, Check, X, CalendarX2, Plus } from "lucide-react";
import DrawerShell from "../ui/DrawerShell";
import { Tooltip } from "../ui/Tooltip";
import { InfoTooltip } from "../help/InfoTooltip";
import { TaskRecurrenceConfig } from "../../../types/task";

export interface TaskRecurrenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  config?: TaskRecurrenceConfig;
  onSave: (config: TaskRecurrenceConfig) => void;
}

export default function TaskRecurrenceDrawer({
  isOpen,
  onClose,
  config,
  onSave,
}: TaskRecurrenceDrawerProps) {
  const [enabled, setEnabled] = useState(config?.enabled ?? true);
  const [interval, setInterval] = useState(config?.interval ?? 1);
  const [unit, setUnit] = useState<"days" | "weeks" | "months" | "years">(config?.unit ?? "weeks");
  const [startDate, setStartDate] = useState(config?.startDate ?? new Date().toISOString().split("T")[0]);
  const [createAtTime, setCreateAtTime] = useState(config?.createAtTime ?? "09:00");
  const [deadlineOffsetDays, setDeadlineOffsetDays] = useState(config?.deadlineOffsetDays ?? 2);
  const [stopRule, setStopRule] = useState<"never" | "count" | "date">(config?.stopRule ?? "never");
  const [stopCount, setStopCount] = useState(config?.stopCount ?? 10);
  const [stopDate, setStopDate] = useState(config?.stopDate ?? "");
  const [skipOffDays, setSkipOffDays] = useState(config?.skipOffDays ?? config?.skipWeekends ?? true);
  const [weeklyOffDays, setWeeklyOffDays] = useState<string[]>(config?.weeklyOffDays ?? ["sat", "sun"]);
  const [customOffDates, setCustomOffDates] = useState<string[]>(config?.customOffDates ?? []);
  const [newCustomDate, setNewCustomDate] = useState("");
  const [newCustomLabel, setNewCustomLabel] = useState("");

  const handleApply = () => {
    onSave({
      enabled,
      interval: Math.max(1, Number(interval) || 1),
      unit,
      startDate,
      createAtTime,
      deadlineOffsetDays: Math.max(0, Number(deadlineOffsetDays) || 0),
      stopRule,
      stopCount: stopRule === "count" ? Number(stopCount) : undefined,
      stopDate: stopRule === "date" ? stopDate : undefined,
      skipWeekends: skipOffDays,
      skipOffDays,
      weeklyOffDays,
      customOffDates,
    });
    onClose();
  };

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title="Recurring Task"
      subtitle="Automated Task Schedule"
      icon={<Repeat className="w-5 h-5 text-slate-700" />}
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
            Apply Schedule
          </button>
        </div>
      }
      bodyClassName="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/50"
    >
      {/* Enable toggle */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-slate-900 block">
            Enable Recurrence
          </span>
        </div>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 cursor-pointer"
        />
      </div>

      {enabled && (
        <>
          {/* Recurrence Interval Card */}
          <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Recurrence Interval
              </h3>
              <InfoTooltip content="Defines frequency cycle for automated new task creation" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Every</label>
                  <InfoTooltip content="Numerical interval between task instances" />
                </div>
                <input
                  type="number"
                  min={1}
                  value={interval}
                  onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] text-slate-900 font-mono tabular-nums"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Unit</label>
                  <InfoTooltip content="Time dimension unit" />
                </div>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as any)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] text-slate-900 cursor-pointer"
                >
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </div>
            </div>

            {/* Skip Off Days Config (Weekly + Custom Off Dates) */}
            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CalendarX2 className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-700">Skip Off Days</span>
                  <InfoTooltip content="Adjust trigger if recurrence falls on configured weekly rest days or custom holidays/off dates" />
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
          </div>

          {/* Creation & Deadline Times */}
          <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Timing & Deadlines
              </h3>
              <InfoTooltip content="Exact time of day the instance is spawned and deadline offset" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Start Recurrence Date</label>
                <InfoTooltip content="The first calendar date from which recurrence begins" />
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] text-slate-900 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Create-At Time</label>
                  <InfoTooltip content="Daily clock time the task will be generated" />
                </div>
                <input
                  type="time"
                  value={createAtTime}
                  onChange={(e) => setCreateAtTime(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] text-slate-900 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Deadline Offset (Days)</label>
                  <InfoTooltip content="Days allotted from task creation to required completion" />
                </div>
                <input
                  type="number"
                  min={0}
                  value={deadlineOffsetDays}
                  onChange={(e) => setDeadlineOffsetDays(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] text-slate-900 font-mono tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* Stop Recurrence Rules */}
          <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Stop Recurrence
              </h3>
              <InfoTooltip content="Termination condition for recurring automated generation" />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="stopRule"
                  value="never"
                  checked={stopRule === "never"}
                  onChange={() => setStopRule("never")}
                  className="text-slate-900 focus:ring-slate-900"
                />
                <span className="text-xs font-semibold text-slate-800">Never Stop</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="stopRule"
                  value="count"
                  checked={stopRule === "count"}
                  onChange={() => setStopRule("count")}
                  className="text-slate-900 focus:ring-slate-900"
                />
                <span className="text-xs font-semibold text-slate-800">After specific number of times</span>
              </label>
              {stopRule === "count" && (
                <div className="pl-6 pt-1">
                  <input
                    type="number"
                    min={1}
                    value={stopCount}
                    onChange={(e) => setStopCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-32 text-xs p-2 bg-slate-50 border border-gray-200 rounded-xl font-mono tabular-nums"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="stopRule"
                  value="date"
                  checked={stopRule === "date"}
                  onChange={() => setStopRule("date")}
                  className="text-slate-900 focus:ring-slate-900"
                />
                <span className="text-xs font-semibold text-slate-800">On specific end date</span>
              </label>
              {stopRule === "date" && (
                <div className="pl-6 pt-1">
                  <input
                    type="date"
                    value={stopDate}
                    onChange={(e) => setStopDate(e.target.value)}
                    className="w-48 text-xs p-2 bg-slate-50 border border-gray-200 rounded-xl font-mono"
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </DrawerShell>
  );
}

