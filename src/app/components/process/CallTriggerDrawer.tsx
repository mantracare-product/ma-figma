import React, { useState, useEffect } from "react";
import DrawerShell from "../ui/DrawerShell";
import {
  Settings,
  Zap,
  Clock,
  CalendarOff,
  Calendar,
  ChevronDown,
  Info,
  Plus,
  Check,
  RotateCcw,
  X,
} from "lucide-react";
import { Tooltip } from "../ui/Tooltip";
import { toast } from "sonner";
import { CallTriggerSettings } from "../../../lib/useProcessStore";

export interface CallTriggerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stageName?: string;
  settings?: CallTriggerSettings;
  onSave?: (settings: CallTriggerSettings) => void;
}

const DEFAULT_SETTINGS: CallTriggerSettings = {
  timingType: "immediate",
  waitDuration: 15,
  waitUnit: "minutes",
  callingHoursType: "custom",
  callingHoursStart: "09:00",
  callingHoursEnd: "18:00",
  timezoneMode: "lead",
  customTimezone: "America/New_York",
  skipDays: ["Saturday", "Sunday"],
  blackoutDates: [],
};

const WEEKDAYS = [
  { id: "Monday", short: "Mon" },
  { id: "Tuesday", short: "Tue" },
  { id: "Wednesday", short: "Wed" },
  { id: "Thursday", short: "Thu" },
  { id: "Friday", short: "Fri" },
  { id: "Saturday", short: "Sat" },
  { id: "Sunday", short: "Sun" },
];

export default function CallTriggerDrawer({
  isOpen,
  onClose,
  stageName,
  settings,
  onSave,
}: CallTriggerDrawerProps) {
  // Collapsible dropdown states
  const [triggerDropdownOpen, setTriggerDropdownOpen] = useState(true);
  const [callingHoursDropdownOpen, setCallingHoursDropdownOpen] = useState(true);
  const [skipDaysDropdownOpen, setSkipDaysDropdownOpen] = useState(true);

  // Form states initialized from props or defaults
  const [timingType, setTimingType] = useState<"immediate" | "wait">("immediate");
  const [waitDuration, setWaitDuration] = useState<number>(15);
  const [waitUnit, setWaitUnit] = useState<"minutes" | "hours" | "days" | "weeks" | "months">("minutes");

  const [callingHoursStart, setCallingHoursStart] = useState<string>("09:00");
  const [callingHoursEnd, setCallingHoursEnd] = useState<string>("18:00");

  const [skipDays, setSkipDays] = useState<string[]>(["Saturday", "Sunday"]);
  const [blackoutDates, setBlackoutDates] = useState<Array<{ id: string; date: string; label?: string }>>([]);

  // Draft fields for custom range
  const [draftStartDate, setDraftStartDate] = useState<string>("");
  const [draftEndDate, setDraftEndDate] = useState<string>("");

  // Sync state whenever settings or isOpen changes
  useEffect(() => {
    if (isOpen) {
      const current = settings || DEFAULT_SETTINGS;
      setTimingType(current.timingType ?? "immediate");
      setWaitDuration(current.waitDuration ?? 15);
      setWaitUnit(current.waitUnit ?? "minutes");
      setCallingHoursStart(current.callingHoursStart ?? "09:00");
      setCallingHoursEnd(current.callingHoursEnd ?? "18:00");
      setSkipDays(current.skipDays ?? ["Saturday", "Sunday"]);
      setBlackoutDates(current.blackoutDates ?? []);
    }
  }, [isOpen, settings]);

  const handleToggleSkipDay = (dayId: string) => {
    if (skipDays.includes(dayId)) {
      setSkipDays(skipDays.filter((d) => d !== dayId));
    } else {
      setSkipDays([...skipDays, dayId]);
    }
  };

  const handleAddCustomRange = () => {
    if (!draftStartDate) {
      toast.error("Please select a start date");
      return;
    }
    const dateStr = draftEndDate && draftEndDate !== draftStartDate
      ? `${draftStartDate} to ${draftEndDate}`
      : draftStartDate;

    const exists = blackoutDates.some((b) => b.date === dateStr);
    if (exists) {
      toast.error("This date or range is already in the list");
      return;
    }
    const newEntry = {
      id: `bd-${Date.now()}`,
      date: dateStr,
    };
    setBlackoutDates([...blackoutDates, newEntry]);
    setDraftStartDate("");
    setDraftEndDate("");
    toast.success("Date added to days off");
  };

  const handleRemoveBlackoutDate = (id: string) => {
    setBlackoutDates(blackoutDates.filter((b) => b.id !== id));
  };

  const handleSave = () => {
    const updated: CallTriggerSettings = {
      timingType,
      waitDuration: Number(waitDuration) || 1,
      waitUnit,
      callingHoursType: "custom",
      callingHoursStart,
      callingHoursEnd,
      timezoneMode: settings?.timezoneMode ?? "lead",
      customTimezone: settings?.customTimezone ?? "America/New_York",
      skipDays,
      blackoutDates,
    };

    if (onSave) {
      onSave(updated);
    }
    toast.success("Call trigger settings saved successfully");
    onClose();
  };

  const handleResetDefaults = () => {
    setTimingType(DEFAULT_SETTINGS.timingType);
    setWaitDuration(DEFAULT_SETTINGS.waitDuration);
    setWaitUnit(DEFAULT_SETTINGS.waitUnit);
    setCallingHoursStart(DEFAULT_SETTINGS.callingHoursStart);
    setCallingHoursEnd(DEFAULT_SETTINGS.callingHoursEnd);
    setSkipDays([...DEFAULT_SETTINGS.skipDays]);
    setBlackoutDates([...DEFAULT_SETTINGS.blackoutDates]);
    toast.info("Reset to default settings");
  };

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title="Call Trigger Settings"
      subtitle={stageName ? `Configure trigger timing, hours, and skip dates for "${stageName}"` : "Configure trigger timing, hours, and skip dates"}
      icon={<Settings className="w-5 h-5 text-primary" />}
      width="max-w-[540px]"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-xs transition-colors cursor-pointer"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              <Check className="w-4 h-4" />
              Save Settings
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* DROPDOWN 1: Trigger Call Timing */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs transition-all">
          <button
            type="button"
            onClick={() => setTriggerDropdownOpen(!triggerDropdownOpen)}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-primary shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <span
                className="text-sm font-bold text-[#222222]"
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                Trigger Call
              </span>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                triggerDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {triggerDropdownOpen && (
            <div className="p-4 border-t border-slate-100 bg-[#fbfcfd] space-y-3">
              {/* Option A: Immediately */}
              <div
                onClick={() => setTimingType("immediate")}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  timingType === "immediate"
                    ? "border-primary bg-primary/5 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                      timingType === "immediate"
                        ? "border-primary bg-primary"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {timingType === "immediate" && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <span
                    className="text-sm font-semibold text-[#222222]"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    Trigger Immediately
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                    Default
                  </span>
                </div>
                <Tooltip text="Initiate outbound call immediately as soon as a lead enters this stage" placement="left">
                  <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" />
                </Tooltip>
              </div>

              {/* Option B: Wait Delay */}
              <div
                onClick={() => setTimingType("wait")}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  timingType === "wait"
                    ? "border-primary bg-primary/5 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                      timingType === "wait"
                        ? "border-primary bg-primary"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {timingType === "wait" && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <span
                    className="text-sm font-semibold text-[#222222]"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    Wait / Delay Before Calling
                  </span>
                </div>
                <Tooltip text="Wait for a specified duration after lead enters stage before placing the call" placement="left">
                  <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" />
                </Tooltip>
              </div>

              {/* Delay Duration Configuration Inputs (shown when Wait selected) */}
              {timingType === "wait" && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="w-28">
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={waitDuration}
                      onChange={(e) => setWaitDuration(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-900"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    />
                  </div>
                  <div className="flex-1">
                    <select
                      value={waitUnit}
                      onChange={(e) => setWaitUnit(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-900 cursor-pointer"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* DROPDOWN 2: Calling Hours */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs transition-all">
          <button
            type="button"
            onClick={() => setCallingHoursDropdownOpen(!callingHoursDropdownOpen)}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-primary shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <span
                className="text-sm font-bold text-[#222222]"
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                Calling Hours
              </span>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                callingHoursDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {callingHoursDropdownOpen && (
            <div className="p-4 border-t border-slate-100 bg-[#fbfcfd]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label
                      className="text-xs font-semibold text-slate-700"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      From
                    </label>
                    <Tooltip text="Earliest daily time outbound calls can be placed">
                      <Info className="w-3 h-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" />
                    </Tooltip>
                  </div>
                  <input
                    type="time"
                    value={callingHoursStart}
                    onChange={(e) => setCallingHoursStart(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-900 transition-colors"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label
                      className="text-xs font-semibold text-slate-700"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      To
                    </label>
                    <Tooltip text="Latest daily time outbound calls can be placed">
                      <Info className="w-3 h-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" />
                    </Tooltip>
                  </div>
                  <input
                    type="time"
                    value={callingHoursEnd}
                    onChange={(e) => setCallingHoursEnd(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-900 transition-colors"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DROPDOWN 3: Days Off */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs transition-all">
          <button
            type="button"
            onClick={() => setSkipDaysDropdownOpen(!skipDaysDropdownOpen)}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-primary shrink-0">
                <CalendarOff className="w-4 h-4" />
              </div>
              <span
                className="text-sm font-bold text-[#222222]"
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                Days Off
              </span>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                skipDaysDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {skipDaysDropdownOpen && (
            <div className="p-4 border-t border-slate-100 bg-[#fbfcfd] space-y-4">
              {/* Part A: Days */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span
                    className="text-xs font-semibold text-slate-700"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    Days
                  </span>
                  <Tooltip text="Select days of the week when outbound calls should be paused">
                    <Info className="w-3 h-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" />
                  </Tooltip>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {WEEKDAYS.map((day) => {
                    const isSkipped = skipDays.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => handleToggleSkipDay(day.id)}
                        className={`h-9 rounded-xl text-xs font-semibold border flex items-center justify-center transition-all cursor-pointer ${
                          isSkipped
                            ? "bg-primary text-white border-primary shadow-xs"
                            : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                        style={{ fontFamily: "DM Sans, sans-serif" }}
                      >
                        {day.short}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Part B: Custom Range */}
              <div className="pt-3 border-t border-slate-200/80 space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-xs font-semibold text-slate-700"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    Custom Range
                  </span>
                  <Tooltip text="Add specific dates or a date range when outbound calls will be paused">
                    <Info className="w-3 h-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" />
                  </Tooltip>
                </div>

                {/* Add Range Form */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] text-slate-500 block mb-1">Start Date</span>
                    <input
                      type="date"
                      value={draftStartDate}
                      onChange={(e) => setDraftStartDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block mb-1">End Date (Optional)</span>
                    <input
                      type="date"
                      value={draftEndDate}
                      min={draftStartDate || undefined}
                      onChange={(e) => setDraftEndDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddCustomRange}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors cursor-pointer shadow-xs"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Date Range
                  </button>
                </div>

                {/* Custom Dates / Ranges Chips */}
                {blackoutDates.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {blackoutDates.map((b) => (
                      <div
                        key={b.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 shadow-2xs"
                      >
                        <Calendar className="w-3 h-3 text-primary shrink-0" />
                        <span className="font-semibold text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                          {b.date}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBlackoutDate(b.id)}
                          className="p-0.5 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer ml-0.5"
                          title="Remove"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DrawerShell>
  );
}
