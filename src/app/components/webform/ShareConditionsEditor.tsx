// ShareConditionsEditor.tsx
import React, { useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { FETCH_FIELD_SOURCES } from "../process/VariablePickerButton";
import { ShareCondition, ConditionOperator } from "./shareTypes";

interface ShareConditionsEditorProps {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  conditions: ShareCondition[];
  onConditionsChange: (c: ShareCondition[]) => void;
  disabled?: boolean;
  showToggle?: boolean;
}

export default function ShareConditionsEditor({
  enabled,
  onEnabledChange,
  conditions,
  onConditionsChange,
  disabled = false,
  showToggle = true,
}: ShareConditionsEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleToggleEnable = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    onEnabledChange(val);
    if (val) {
      setIsExpanded(true);
    }
  };

  const handleAddCondition = () => {
    const newCond: ShareCondition = {
      id: `cond-${Date.now()}`,
      fieldSource: "",
      field: "",
      operator: "",
      value: "",
    };
    onConditionsChange([...conditions, newCond]);
  };

  const handleRemoveCondition = (id: string) => {
    onConditionsChange(conditions.filter((c) => c.id !== id));
  };

  const handleFieldSourceChange = (id: string, value: string) => {
    onConditionsChange(
      conditions.map((c) => (c.id === id ? { ...c, fieldSource: value, field: "", operator: "" as ConditionOperator, value: "" } : c))
    );
  };

  const handleFieldChange = (id: string, value: string) => {
    onConditionsChange(conditions.map((c) => (c.id === id ? { ...c, field: value } : c)));
  };

  const handleOperatorChange = (id: string, value: ConditionOperator) => {
    onConditionsChange(
      conditions.map((c) => (c.id === id ? { ...c, operator: value, value: (value === "Is Empty" || value === "Is Not Empty") ? "" : c.value } : c))
    );
  };

  const handleValueChange = (id: string, value: string) => {
    onConditionsChange(conditions.map((c) => (c.id === id ? { ...c, value } : c)));
  };

  return (
    <div className={`w-full rounded-xl border border-gray-200 overflow-hidden bg-white text-left ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      {showToggle && (
        <div
          onClick={() => enabled && !disabled && setIsExpanded(!isExpanded)}
          className={`flex items-center justify-between px-4 py-3 ${enabled && !disabled ? "cursor-pointer select-none" : ""}`}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-semibold text-[#020817]"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              Conditions
            </span>
            <span className="text-xs text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>
              — optional
            </span>
          </div>
          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform ${
                !enabled ? "text-gray-300 cursor-not-allowed opacity-50" : isExpanded ? "rotate-180" : ""
              }`}
            />
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={enabled}
                disabled={disabled}
                onChange={handleToggleEnable}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>
        </div>
      )}

      {(!showToggle || (enabled && isExpanded)) && (
        <div className={`${showToggle ? "border-t border-gray-100" : ""} px-5 py-4 space-y-3 bg-gray-50/40`}>
          <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
            This form will only be sent when all specified conditions are met.
          </p>

          <div className="space-y-3">
            {conditions.map((cond, index) => (
              <div key={cond.id} className="p-3 border rounded-lg space-y-3 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">Condition #{index + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCondition(cond.id)}
                    className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 font-semibold"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={cond.fieldSource}
                    onChange={(e) => handleFieldSourceChange(cond.id, e.target.value)}
                    className="px-3 py-2 text-xs border rounded-md bg-white outline-none focus:border-blue-500 cursor-pointer"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <option value="">Select source...</option>
                    {FETCH_FIELD_SOURCES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={cond.field}
                    disabled={!cond.fieldSource}
                    onChange={(e) => handleFieldChange(cond.id, e.target.value)}
                    className="px-3 py-2 text-xs border rounded-md bg-white outline-none focus:border-blue-500 cursor-pointer"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <option value="">Select field...</option>
                    {(FETCH_FIELD_SOURCES.find((s) => s.value === cond.fieldSource)?.fields || []).map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={cond.operator}
                    onChange={(e) => handleOperatorChange(cond.id, e.target.value as ConditionOperator)}
                    className="px-3 py-2 text-xs border rounded-md bg-white outline-none focus:border-blue-500 cursor-pointer"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <option value="">Operator...</option>
                    <option value="Equal To">Equal To</option>
                    <option value="Not Equal To">Not Equal To</option>
                    <option value="Includes">Includes</option>
                    <option value="Is Empty">Is Empty</option>
                    <option value="Is Not Empty">Is Not Empty</option>
                  </select>
                  {cond.operator !== "Is Empty" && cond.operator !== "Is Not Empty" && (
                    <input
                      type="text"
                      value={cond.value}
                      placeholder="Value..."
                      onChange={(e) => handleValueChange(cond.id, e.target.value)}
                      className="px-3 py-2 text-xs border rounded-md bg-white outline-none focus:border-blue-500"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    />
                  )}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddCondition}
              className="w-full py-2 text-xs border border-dashed border-gray-300 text-blue-600 rounded-md hover:bg-blue-50/20 flex items-center justify-center gap-1 font-semibold"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              <Plus className="w-3.5 h-3.5" /> Add Condition
            </button>
          </div>
        </div>
      )}

      {disabled && (
        <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 flex items-center justify-between text-xs text-amber-700">
          <span style={{ fontFamily: "Outfit, sans-serif" }}>
            Manual selection and conditions can't be combined in v1.
          </span>
        </div>
      )}
    </div>
  );
}
