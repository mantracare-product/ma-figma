import React from "react";
import { Plus, Trash2 } from "lucide-react";
import ButtonActionEditor from "../shared/ButtonActionEditor";

export interface ButtonChoiceEditorProps {
  buttons: any[];
  onChange: (buttons: any[]) => void;
  maxButtons?: number;
}

export function ButtonChoiceEditor({ buttons, onChange, maxButtons = 3 }: ButtonChoiceEditorProps) {
  return (
    <ButtonActionEditor
      buttons={buttons}
      onChange={onChange}
      maxButtons={maxButtons}
      label="Interactive Buttons"
      description="Each button creates a dynamic output port on the flow builder canvas."
    />
  );
}

export interface ListChoiceEditorProps {
  items: string[];
  onChange: (items: string[]) => void;
  maxItems?: number;
}

export function ListChoiceEditor({ items = [], onChange, maxItems = 10 }: ListChoiceEditorProps) {
  const handleAdd = () => {
    if (items.length >= maxItems) return;
    onChange([...items, ""]);
  };

  const handleRemove = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const handleChange = (idx: number, val: string) => {
    const updated = items.map((item, i) => (i === idx ? val : item));
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-bold text-gray-700" style={{ fontFamily: "DM Sans, sans-serif" }}>
            List Options
          </label>
          <p className="text-[11px] text-gray-500">Each list item creates a dynamic output port on the flow builder canvas.</p>
        </div>
        <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {items.length}/{maxItems}
        </span>
      </div>

      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 w-5 text-right">{idx + 1}.</span>
            <input
              type="text"
              value={item}
              onChange={e => handleChange(idx, e.target.value)}
              placeholder={`List Option ${idx + 1}`}
              className="flex-1 px-3 py-1.5 border border-gray-200 rounded-md text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            />
            <button
              type="button"
              onClick={() => handleRemove(idx)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Remove item"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {items.length < maxItems && (
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 border-dashed transition-colors w-full justify-center"
        >
          <Plus className="w-3.5 h-3.5" />
          Add List Option
        </button>
      )}
    </div>
  );
}
