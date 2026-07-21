import React from "react";
import { Plus, Trash2, Phone, ExternalLink, Mail, MessageSquare } from "lucide-react";
import { ButtonAction } from "../../../lib/chatbotTypes";

interface ButtonActionEditorProps {
  buttons: ButtonAction[];
  onChange: (buttons: ButtonAction[]) => void;
  maxButtons?: number;
  label?: string;
  description?: string;
}

export default function ButtonActionEditor({
  buttons = [],
  onChange,
  maxButtons = 3,
  label = "Buttons / Actions",
  description = "Configure quick reply choices or client actions (call, link, email)."
}: ButtonActionEditorProps) {

  const handleAdd = () => {
    if (buttons.length >= maxButtons) return;
    const newBtn: ButtonAction = {
      id: `btn-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      label: "",
      actionType: "quick_reply",
      value: ""
    };
    onChange([...buttons, newBtn]);
  };

  const handleRemove = (index: number) => {
    onChange(buttons.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, patch: Partial<ButtonAction>) => {
    const updated = buttons.map((btn, i) => {
      if (i !== index) return btn;
      const next = { ...btn, ...patch };
      // Reset value if actionType changes to quick_reply
      if (patch.actionType === "quick_reply") {
        next.value = "";
      }
      return next;
    });
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {label && (
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-xs font-bold text-gray-700" style={{ fontFamily: "DM Sans, sans-serif" }}>
              {label}
            </label>
            {description && <p className="text-[11px] text-gray-500">{description}</p>}
          </div>
          <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {buttons.length}/{maxButtons}
          </span>
        </div>
      )}

      <div className="space-y-2">
        {buttons.map((btn, idx) => (
          <div key={btn.id || idx} className="p-3 border border-gray-200 rounded-lg bg-gray-50/50 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={btn.label}
                onChange={e => handleChange(idx, { label: e.target.value })}
                placeholder={`Button ${idx + 1} Label`}
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-md text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              />
              <select
                value={btn.actionType || "quick_reply"}
                onChange={e => handleChange(idx, { actionType: e.target.value as ButtonAction["actionType"] })}
                className="px-2.5 py-1.5 border border-gray-200 rounded-md text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="quick_reply">Quick Reply</option>
                <option value="call">Call Phone</option>
                <option value="url">Open URL</option>
                <option value="email">Send Email</option>
              </select>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Remove button"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Conditional input based on actionType */}
            {btn.actionType === "call" && (
              <div className="flex items-center gap-2 pl-1">
                <Phone className="w-3.5 h-3.5 text-green-600 shrink-0" />
                <input
                  type="tel"
                  value={btn.value || ""}
                  onChange={e => handleChange(idx, { value: e.target.value })}
                  placeholder="Phone number (e.g. +1 555 123 4567)"
                  className="flex-1 px-2.5 py-1 border border-gray-200 rounded text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}

            {btn.actionType === "url" && (
              <div className="flex items-center gap-2 pl-1">
                <ExternalLink className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <input
                  type="url"
                  value={btn.value || ""}
                  onChange={e => handleChange(idx, { value: e.target.value })}
                  placeholder="URL (e.g. https://mantrahealth.com/book)"
                  className="flex-1 px-2.5 py-1 border border-gray-200 rounded text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}

            {btn.actionType === "email" && (
              <div className="flex items-center gap-2 pl-1">
                <Mail className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <input
                  type="email"
                  value={btn.value || ""}
                  onChange={e => handleChange(idx, { value: e.target.value })}
                  placeholder="Email address (e.g. support@mantrahealth.com)"
                  className="flex-1 px-2.5 py-1 border border-gray-200 rounded text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {buttons.length < maxButtons && (
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 border-dashed transition-colors w-full justify-center"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Button
        </button>
      )}
    </div>
  );
}
