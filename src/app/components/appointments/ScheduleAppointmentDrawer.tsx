import React from "react";
import { CustomSideDrawer } from "../ui/drawer";
import { FieldDefinition } from "../../context/FieldRegistryContext";

export interface ClientOption {
  id: number;
  name: string;
  email: string;
  phone: string;
  specialty?: string;
  avatar?: string;
  availability?: string;
  status?: string;
  process?: string;
  responsiblePerson?: string;
}

export interface Employee {
  id: number;
  name: string;
  email: string;
}

export interface BookingFormValues {
  title: string;
  description: string;
  note: string;
  tags: string;
  processId: string;
  stageId: string;
  date: string;              // YYYY-MM-DD
  startHour: number;
  startMinute: number;
  sessionType: "video" | "inPerson";
  client: ClientOption | null;
  provider: Employee | null;
}

export interface ScheduleAppointmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "reschedule";
  values: BookingFormValues;
  onChange: (patch: Partial<BookingFormValues>) => void;
  onSave: () => void;             // = handleBookingComplete

  employees: Employee[];
  clients: ClientOption[];
  processStages: Record<string, string[]>;

  // Custom fields section
  customFields: FieldDefinition[];        // appointmentCustomFields (source === "custom")
  visibleCustomFieldKeys: string[];       // apptVisibleFieldKeys
  customFieldValues: Record<string, string>;
  onCustomFieldChange: (key: string, value: string) => void;
  onOpenSelectFields: () => void;         // opens SelectFieldsModal
  onOpenCreateField: () => void;          // opens CreateFieldModal
}

export default function ScheduleAppointmentDrawer({
  isOpen,
  onClose,
  mode,
  values,
  onChange,
  onSave,
  employees,
  clients,
  processStages,
  customFields,
  visibleCustomFieldKeys,
  customFieldValues,
  onCustomFieldChange,
  onOpenSelectFields,
  onOpenCreateField,
}: ScheduleAppointmentDrawerProps) {
  const isValid = !!(values.title.trim() && values.provider && values.client && values.date);
  const endHour = (values.startHour + 1) % 24;
  const endMin = values.startMinute;
  const startHHMM = `${String(values.startHour).padStart(2, "0")}:${String(values.startMinute).padStart(2, "0")}`;
  const endHHMM = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;

  const fmtDate = (hhmm: string) => {
    if (!values.date) return "";
    const d = new Date(`${values.date}T${hhmm}`);
    return (
      d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) +
      " at " +
      d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    );
  };

  const inputCls =
    "w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white";
  const labelCls = "block text-xs font-semibold text-slate-700 mb-1.5";

  return (
    <CustomSideDrawer
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm:max-w-[480px]"
      title={
        <div>
          <p className="text-xl font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
            {mode === "reschedule" ? "Reschedule Appointment" : "Schedule Appointment"}
          </p>
          <p className="text-xs text-slate-500 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
            {mode === "reschedule"
              ? "Update the date and time for this appointment"
              : "Create a new appointment with a client"}
          </p>
        </div>
      }
      footer={
        <button
          onClick={onSave}
          disabled={!isValid}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
          style={{
            fontFamily: "Outfit, sans-serif",
            backgroundColor: isValid ? "#1e293b" : "#E5E7EB",
            color: isValid ? "#ffffff" : "#9CA3AF",
            cursor: isValid ? "pointer" : "not-allowed",
            border: "none",
          }}
        >
          {mode === "reschedule" ? "Save Changes" : "Schedule Appointment"}
        </button>
      }
    >
      <div className="space-y-5">
        {/* ① Title */}
        <div>
          <label className={labelCls} style={{ fontFamily: "Outfit, sans-serif" }}>
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g., Follow-up consultation"
            value={values.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className={inputCls}
            style={{ fontFamily: "Outfit, sans-serif" }}
          />
        </div>

        {/* ② Description */}
        <div>
          <label className={labelCls} style={{ fontFamily: "Outfit, sans-serif" }}>
            Description
          </label>
          <textarea
            placeholder="Add appointment details..."
            value={values.description}
            onChange={(e) => onChange({ description: e.target.value })}
            rows={3}
            className={inputCls + " resize-none"}
            style={{ fontFamily: "Outfit, sans-serif" }}
          />
        </div>

        {/* ③ Schedule For / Schedule With */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls} style={{ fontFamily: "Outfit, sans-serif" }}>
              Schedule For <span className="text-red-500">*</span>
            </label>
            <select
              value={values.provider?.id ?? ""}
              onChange={(e) => {
                const emp = employees.find((x) => x.id === Number(e.target.value));
                onChange({ provider: emp || null });
              }}
              className={inputCls}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <option value="">Select a user</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} style={{ fontFamily: "Outfit, sans-serif" }}>
              Schedule With <span className="text-red-500">*</span>
            </label>
            <select
              value={values.client?.id ?? ""}
              onChange={(e) => {
                const cl = clients.find((x) => x.id === Number(e.target.value));
                onChange({ client: cl || null });
              }}
              className={inputCls}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <option value="">Select a client</option>
              {clients.map((cl) => (
                <option key={cl.id} value={cl.id}>
                  {cl.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ④ Process / Stage */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls} style={{ fontFamily: "Outfit, sans-serif" }}>
              Select Process
            </label>
            <select
              value={values.processId}
              onChange={(e) => {
                onChange({ processId: e.target.value, stageId: "" });
              }}
              className={inputCls}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <option value="">Select a process</option>
              {Object.keys(processStages).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} style={{ fontFamily: "Outfit, sans-serif" }}>
              Select Stage
            </label>
            <select
              value={values.stageId}
              onChange={(e) => onChange({ stageId: e.target.value })}
              disabled={!values.processId}
              className={inputCls + (!values.processId ? " opacity-50 cursor-not-allowed" : "")}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <option value="">Select a stage</option>
              {(processStages[values.processId] || []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ⑤ Date / Note */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls} style={{ fontFamily: "Outfit, sans-serif" }}>
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={values.date}
              onChange={(e) => onChange({ date: e.target.value })}
              className={inputCls}
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
          </div>
          <div>
            <label className={labelCls} style={{ fontFamily: "Outfit, sans-serif" }}>
              Note
            </label>
            <input
              type="text"
              placeholder="Quick note..."
              value={values.note}
              onChange={(e) => onChange({ note: e.target.value })}
              className={inputCls}
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
          </div>
        </div>

        {/* ⑥ Times in client timezone */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p
            className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-3"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Times in client timezone
          </p>
          {!values.client ? (
            <p
              className="text-center text-sm py-2"
              style={{ color: "#1A73E8", fontFamily: "Outfit, sans-serif" }}
            >
              Select a client to enable time selection
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {/* Start */}
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Start
                </p>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={values.startHour}
                    onChange={(e) =>
                      onChange({ startHour: Math.min(23, Math.max(0, Number(e.target.value))) })
                    }
                    className="w-12 text-center border border-slate-200 rounded-lg py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  />
                  <span className="text-slate-400 font-bold text-sm">:</span>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={values.startMinute}
                    onChange={(e) =>
                      onChange({ startMinute: Math.min(59, Math.max(0, Number(e.target.value))) })
                    }
                    className="w-12 text-center border border-slate-200 rounded-lg py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  />
                </div>
                {values.date && (
                  <p className="text-[11px] text-slate-400 mt-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {fmtDate(startHHMM)}
                  </p>
                )}
              </div>
              {/* End (auto = start + 60 min) */}
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>
                  End
                </p>
                <div className="flex items-center gap-1">
                  <div
                    className="w-12 text-center border border-slate-100 rounded-lg py-1.5 text-sm font-semibold text-slate-400 bg-slate-100"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    {String(endHour).padStart(2, "0")}
                  </div>
                  <span className="text-slate-400 font-bold text-sm">:</span>
                  <div
                    className="w-12 text-center border border-slate-100 rounded-lg py-1.5 text-sm font-semibold text-slate-400 bg-slate-100"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    {String(endMin).padStart(2, "0")}
                  </div>
                </div>
                {values.date && (
                  <p className="text-[11px] text-slate-400 mt-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {fmtDate(endHHMM)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ⑦ Session Type */}
        <div>
          <label className={labelCls} style={{ fontFamily: "Outfit, sans-serif" }}>
            Session Type
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onChange({ sessionType: "video" })}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                values.sessionType === "video"
                  ? "bg-cyan-500 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Video
            </button>
            <button
              type="button"
              onClick={() => onChange({ sessionType: "inPerson" })}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                values.sessionType === "inPerson"
                  ? "bg-cyan-500 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              In-Person
            </button>
          </div>
        </div>

        {/* ⑧ Tags */}
        <div>
          <label className={labelCls} style={{ fontFamily: "Outfit, sans-serif" }}>
            Tags
          </label>
          <input
            type="text"
            placeholder="Comma-separated tags, e.g., follow-up, urgent"
            value={values.tags}
            onChange={(e) => onChange({ tags: e.target.value })}
            className={inputCls}
            style={{ fontFamily: "Outfit, sans-serif" }}
          />
        </div>

        {/* ⑨ Custom Fields */}
        {(visibleCustomFieldKeys.length > 0 || customFields.length > 0) && (
          <div className="border-t border-slate-200 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className={labelCls} style={{ fontFamily: "Outfit, sans-serif" }}>
                Custom Fields
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onOpenSelectFields}
                  className="text-xs text-cyan-600 hover:text-cyan-700 font-medium"
                >
                  Select Fields
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={onOpenCreateField}
                  className="text-xs text-cyan-600 hover:text-cyan-700 font-medium"
                >
                  + Create Field
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {customFields
                .filter((f) => visibleCustomFieldKeys.includes(f.key))
                .map((f) => (
                  <div key={f.key}>
                    <label className={labelCls} style={{ fontFamily: "Outfit, sans-serif" }}>
                      {f.label}
                      {f.required && " *"}
                    </label>
                    <input
                      type="text"
                      value={customFieldValues[f.key] || ""}
                      onChange={(e) => onCustomFieldChange(f.key, e.target.value)}
                      placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}`}
                      className={inputCls}
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    />
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </CustomSideDrawer>
  );
}
