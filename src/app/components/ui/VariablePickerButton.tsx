import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// Shared field-variable data — consumed by VariablePickerButton dropdown
// ---------------------------------------------------------------------------
export const FETCH_FIELD_SOURCES = [
  {
    value: "system", label: "System Fields", fields: [
      { value: "contact_name", label: "Contact Name" },
      { value: "contact_email", label: "Contact Email" },
      { value: "contact_phone", label: "Contact Phone" },
      { value: "country", label: "Country" },
      { value: "language", label: "Language" },
    ]
  },
  {
    value: "call-log", label: "Call Log Fields", fields: [
      { value: "call_status", label: "Call Status" },
      { value: "call_duration", label: "Call Duration" },
      { value: "call_sentiment", label: "Sentiment" },
      { value: "call_intent", label: "Intent" },
      { value: "call_summary", label: "Call Summary" },
      { value: "call_transcription", label: "Call Transcription" },
    ]
  },
  {
    value: "stage", label: "Stage Fields", fields: [
      { value: "stage_name", label: "Stage Name" },
      { value: "stage_entered_at", label: "Stage Entered At" },
    ]
  },
  {
    value: "process", label: "Process Fields", fields: [
      { value: "process_name", label: "Process Name" },
      { value: "process_status", label: "Process Status" },
    ]
  },
  {
    value: "appointment", label: "Appointment Fields", fields: [
      { value: "appointment_date", label: "Appointment Date" },
      { value: "appointment_time", label: "Appointment Time" },
      { value: "appointment_status", label: "Appointment Status" },
      { value: "appointment_with", label: "Appointment With" },
    ]
  },
  {
    value: "org", label: "Organization Fields", fields: [
      { value: "org_name", label: "Organization Name" },
      { value: "org_domain", label: "Organization Domain" },
    ]
  },
  {
    value: "custom", label: "Custom Fields", fields: [
      { value: "custom_field_1", label: "Custom Field 1" },
      { value: "custom_field_2", label: "Custom Field 2" },
    ]
  },
];

// ---------------------------------------------------------------------------
// VariablePickerButton
// ---------------------------------------------------------------------------
export interface VariablePickerButtonProps {
  targetRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  value: string;
  onChange: (newValue: string) => void;
  label?: string;
}

const VariablePickerButton: React.FC<VariablePickerButtonProps> = ({
  targetRef,
  value,
  onChange,
  label = "Insert Variable",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownPanelRef = useRef<HTMLDivElement>(null);

  const handleSelectField = (fieldValue: string) => {
    const textarea = targetRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const insertText = `{{${fieldValue}}}`;
    const currentVal = value || "";

    const newValue = currentVal.slice(0, start) + insertText + currentVal.slice(end);
    onChange(newValue);
    setIsOpen(false);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + insertText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const openDropdown = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
    setIsOpen(true);
  };

  const closeDropdown = () => {
    setIsOpen(false);
    setDropdownPos(null);
  };

  // Close on ancestor scroll/resize, but NOT when the user scrolls inside the dropdown list itself
  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = (e: Event) => {
      if (dropdownPanelRef.current && dropdownPanelRef.current.contains(e.target as Node)) return;
      closeDropdown();
    };
    const handleResize = () => closeDropdown();
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (isOpen ? closeDropdown() : openDropdown())}
        className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
        style={{ fontFamily: "DM Sans, sans-serif" }}
      >
        {label}
      </button>

      {isOpen && dropdownPos && createPortal(
        <>
          {/* Backdrop — click-outside to close */}
          <div
            className="fixed inset-0 cursor-default"
            style={{ zIndex: 9998 }}
            onClick={closeDropdown}
          />
          {/* Dropdown panel — portaled to body, fixed-positioned */}
          <div
            ref={dropdownPanelRef}
            className="bg-white rounded-xl shadow-[0px_8px_32px_rgba(0,0,0,0.12)] border border-gray-200 overflow-hidden flex flex-col"
            style={{
              position: "fixed",
              top: dropdownPos.top,
              right: dropdownPos.right,
              width: "256px",
              maxHeight: "256px",
              zIndex: 9999,
            }}
          >
            <div className="p-2 border-b border-gray-100 bg-gray-50/50">
              <span className="text-[10px] font-semibold text-gray-400 tracking-wider uppercase" style={{ fontFamily: "Outfit, sans-serif" }}>
                Insert Field Variable
              </span>
            </div>
            <div className="overflow-y-auto flex-1 py-1 max-h-[220px]">
              {FETCH_FIELD_SOURCES.map(group => (
                <div key={group.value}>
                  <div
                    className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 bg-gray-50/30 border-y border-gray-100/50 first:border-t-0"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {group.label}
                  </div>
                  <div className="py-0.5">
                    {group.fields.map(field => (
                      <button
                        key={field.value}
                        type="button"
                        onClick={() => handleSelectField(field.value)}
                        className="w-full text-left px-4 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center justify-between"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        <span>{field.label}</span>
                        <span className="text-[9px] text-gray-400 font-mono">
                          {`{{${field.value}}}`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default VariablePickerButton;
