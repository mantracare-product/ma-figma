import React, { useEffect } from "react";
import {
  CalendarClock,
  X,
  User,
  Search,
  Phone,
  MessageSquare,
  GitBranch,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export interface ScheduleCallClientOption {
  id: string;
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  countryFlag: string;
  country: string;
  status: string;
  processes: string[];
}

export interface ScheduleCallFormValues {
  client: ScheduleCallClientOption | null;
  clientSearch: string;
  process: string;
  stage: string;
  calendarMonth: Date;
  selectedDate: Date | null;
  hour: number;
  minute: number;
}

export interface ScheduleCallDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: "schedule" | "reschedule";
  values: ScheduleCallFormValues;
  onChange: (patch: Partial<ScheduleCallFormValues>) => void;
  onSave: () => void;
  isSaving: boolean;
  clients: ScheduleCallClientOption[];
  processStagesMap: Record<string, string[]>;
  lockedClient?: ScheduleCallClientOption;
}

export default function ScheduleCallDrawer({
  isOpen,
  onClose,
  mode = "schedule",
  values,
  onChange,
  onSave,
  isSaving,
  clients,
  processStagesMap,
  lockedClient,
}: ScheduleCallDrawerProps) {
  // lockedClient auto-fill behavior
  useEffect(() => {
    if (isOpen && lockedClient && !values.client) {
      onChange({ client: lockedClient });
    }
  }, [isOpen, lockedClient]);

  if (!isOpen) return null;

  const filteredClients = clients.filter(
    (c) =>
      values.clientSearch.trim().length > 0 &&
      (c.name.toLowerCase().includes(values.clientSearch.toLowerCase()) ||
        c.email.toLowerCase().includes(values.clientSearch.toLowerCase()) ||
        c.phone.includes(values.clientSearch))
  );

  const getDaysInMonth = (year: number, month: number) =>
    new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) =>
    new Date(year, month, 1).getDay();

  const calendarMonth = values.calendarMonth || new Date();
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handlePrevMonth = () => {
    onChange({ calendarMonth: new Date(year, month - 1, 1) });
  };

  const handleNextMonth = () => {
    onChange({ calendarMonth: new Date(year, month + 1, 1) });
  };

  const handleSelectClient = (client: ScheduleCallClientOption) => {
    const defaultProcess = client.processes[0] || "";
    const defaultStage =
      defaultProcess && processStagesMap[defaultProcess]
        ? processStagesMap[defaultProcess][0]
        : "";
    onChange({
      client,
      clientSearch: "",
      process: defaultProcess,
      stage: defaultStage,
    });
  };

  const handleProcessChange = (proc: string) => {
    const stages = processStagesMap[proc] || [];
    onChange({
      process: proc,
      stage: stages[0] || "",
    });
  };

  const title = mode === "reschedule" ? "Reschedule Call" : "Schedule Call";
  const saveButtonLabel = isSaving
    ? mode === "reschedule"
      ? "Rescheduling..."
      : "Scheduling..."
    : mode === "reschedule"
    ? "Reschedule"
    : "Schedule";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.35)" }}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden"
        style={{
          width: "520px",
          background: "#ffffff",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.15)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 border-b border-gray-100"
          style={{ background: "#F8F9FF" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg,#6366F1,#4F46E5)",
              }}
            >
              <CalendarClock className="w-5 h-5 text-white" />
            </div>
            <h2
              className="text-[17px] font-semibold text-gray-900"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-red-100 hover:bg-red-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-red-600" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          {/* ── SELECT CLIENT ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-indigo-500" />
              <span
                className="text-[11px] font-bold tracking-widest text-gray-400 uppercase"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Select Client
              </span>
            </div>

            {!values.client ? (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search client by email, phone or name..."
                    value={values.clientSearch}
                    onChange={(e) => onChange({ clientSearch: e.target.value })}
                    className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                    autoFocus
                  />
                </div>

                {/* Search Results */}
                {filteredClients.length > 0 && (
                  <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {filteredClients.slice(0, 8).map((client) => (
                      <button
                        key={client.id}
                        onClick={() => handleSelectClient(client)}
                        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-indigo-50 transition-colors border-b border-gray-50 last:border-0 cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm flex-shrink-0">
                          {client.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {client.name}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {client.email} · {client.countryCode} {client.phone}
                          </p>
                        </div>
                        <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 flex-shrink-0">
                          {client.status}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Selected Client Card */
              <div
                className="bg-white border border-gray-200 rounded-xl p-4"
                style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-base">
                      {values.client.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        {values.client.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600">
                          {values.client.status || "Active"}
                        </span>
                        <span className="text-xs text-gray-400">
                          {values.client.countryFlag || "🇺🇸"}{" "}
                          {values.client.country || "USA"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      onChange({ client: null, process: "", stage: "" })
                    }
                    className="text-xs font-medium px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Change
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">
                    Contact Details
                  </p>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-3.5 h-3.5 text-green-600" />
                    </div>
                    <span className="text-sm text-gray-700">
                      {values.client.countryCode} {values.client.phone}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <span className="text-sm text-gray-700">
                      {values.client.email}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── PROCESS & STAGE ── (only shown when client selected) */}
          {values.client && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <GitBranch className="w-4 h-4 text-indigo-500" />
                <span
                  className="text-[11px] font-bold tracking-widest text-gray-400 uppercase"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Process &amp; Stage
                </span>
              </div>

              {/* Process Dropdown */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Process
                </label>
                <select
                  value={values.process}
                  onChange={(e) => handleProcessChange(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white cursor-pointer"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <option value="">— Select a process —</option>
                  {(values.client.processes && values.client.processes.length > 0
                    ? values.client.processes
                    : Object.keys(processStagesMap)
                  ).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stage Dropdown — only appears after a process is chosen */}
              {values.process && processStagesMap[values.process] && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Stage (Active)
                  </label>
                  <select
                    value={values.stage}
                    onChange={(e) => onChange({ stage: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white cursor-pointer"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {processStagesMap[values.process].map((stage) => (
                      <option key={stage} value={stage}>
                        {stage}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    Choose the active stage at which this call should be scheduled.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── SELECT DATE & TIME ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span
                className="text-[11px] font-bold tracking-widest text-gray-400 uppercase"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Select Date &amp; Time
              </span>
            </div>

            {/* Calendar */}
            <div
              className="bg-white border border-gray-200 rounded-2xl p-4"
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
            >
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span
                    className="font-semibold text-gray-800 text-sm"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {monthNames[month]} {year}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Day Labels */}
              <div className="grid grid-cols-7 mb-2">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <div
                    key={i}
                    className="text-center text-[11px] font-semibold text-gray-400 py-1"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Day Cells */}
              <div className="grid grid-cols-7 gap-y-1">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const cellDate = new Date(year, month, day);
                  cellDate.setHours(0, 0, 0, 0);
                  const isToday = cellDate.getTime() === today.getTime();
                  const isPast = cellDate.getTime() < today.getTime();
                  const isSelected =
                    values.selectedDate !== null &&
                    cellDate.getTime() === values.selectedDate.getTime();
                  return (
                    <div key={day} className="flex flex-col items-center">
                      <button
                        type="button"
                        disabled={isPast}
                        onClick={() => {
                          const d = new Date(year, month, day);
                          d.setHours(0, 0, 0, 0);
                          onChange({ selectedDate: d });
                        }}
                        className={`w-8 h-8 flex items-center justify-center text-sm rounded-full transition-all font-medium ${
                          isSelected
                            ? "bg-indigo-600 text-white font-semibold shadow-md"
                            : isToday
                            ? "text-indigo-600 font-semibold ring-2 ring-indigo-400 ring-offset-1"
                            : isPast
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-gray-700 hover:bg-indigo-50 cursor-pointer"
                        }`}
                      >
                        {day}
                      </button>
                      {isToday && !isSelected && (
                        <span className="w-1 h-1 rounded-full bg-red-400 mt-0.5" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Time Picker */}
              <div className="mt-5 pt-4 border-t border-gray-100">
                <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase text-center mb-3">
                  Time (24H Format)
                </p>
                <div className="flex items-center justify-center gap-3">
                  {/* Hour */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        onChange({ hour: (values.hour + 1) % 24 })
                      }
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 rotate-90" />
                    </button>
                    <div className="w-14 h-12 bg-gray-900 rounded-xl flex items-center justify-center">
                      <span
                        className="text-2xl font-bold text-white"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {String(values.hour).padStart(2, "0")}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onChange({ hour: (values.hour - 1 + 24) % 24 })
                      }
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 -rotate-90" />
                    </button>
                  </div>

                  <span className="text-2xl font-bold text-gray-800">:</span>

                  {/* Minute */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        onChange({ minute: (values.minute + 1) % 60 })
                      }
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 rotate-90" />
                    </button>
                    <div className="w-14 h-12 bg-gray-900 rounded-xl flex items-center justify-center">
                      <span
                        className="text-2xl font-bold text-white"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {String(values.minute).padStart(2, "0")}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onChange({ minute: (values.minute - 1 + 60) % 60 })
                      }
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 -rotate-90" />
                    </button>
                  </div>
                </div>

                {/* Formatted Preview */}
                {values.selectedDate && (
                  <p className="text-center text-xs text-gray-500 mt-3">
                    {monthNames[values.selectedDate.getMonth()]}{" "}
                    {values.selectedDate.getDate()},{" "}
                    {values.selectedDate.getFullYear()} at{" "}
                    <span className="font-semibold text-indigo-600">
                      {String(values.hour).padStart(2, "0")}:
                      {String(values.minute).padStart(2, "0")}
                    </span>{" "}
                    <span className="text-indigo-400">IST</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3"
          style={{ background: "#FAFAFA" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || !values.client || !values.selectedDate}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            style={{
              background: "linear-gradient(135deg,#1A1A2E 0%,#16213E 100%)",
              fontFamily: "Outfit, sans-serif",
              boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
            }}
          >
            {saveButtonLabel}
          </button>
        </div>
      </div>
    </>
  );
}
