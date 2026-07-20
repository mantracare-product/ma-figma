import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useFieldRegistry, FieldModule, SYSTEM_SEEDS, getLiveTeamMembers } from "../../context/FieldRegistryContext";

const MODULE_LABELS: Record<string, string> = {
  client: "Client Fields",
  process: "Process Fields",
  appointment: "Appointment Fields",
  call: "Call Fields",
  service: "Service Fields",
  organization: "Organization Fields",
  teamMember: "Team Member Fields",
};

const ALL_MODULES: Exclude<FieldModule, "deal">[] = ["client", "process", "appointment", "call", "service", "organization", "teamMember"];

// Live field sources helper for backwards compatibility Proxy
export function getLiveFieldSources() {
  let customFields: Record<string, any> = {};
  try {
    const saved = sessionStorage.getItem("fieldRegistry_v1");
    if (saved) {
      customFields = JSON.parse(saved);
      // Normalize deal to process
      if (customFields.deal && !customFields.process) {
        customFields.process = customFields.deal;
      }
    }
  } catch {}

  const teamOptions = getLiveTeamMembers();

  return ALL_MODULES.map(module => {
    const sysSeeds = SYSTEM_SEEDS[module] || [];
    const custFields = customFields[module] || [];

    const fields = [
      ...sysSeeds.map((f: any) => {
        const isTeamSelect = f.key === "responsible" || f.key === "provider";
        return {
          value: f.key,
          label: f.label,
          options: isTeamSelect ? teamOptions : f.options
        };
      }),
      ...custFields.map((f: any) => ({
        value: f.key,
        label: f.label,
        options: f.options
      }))
    ];

    return {
      value: module,
      label: MODULE_LABELS[module] || module,
      fields
    };
  });
}

// Backwards compatibility dummy exports, reactively proxying to the live field registry
export const FETCH_FIELD_SOURCES = new Proxy([] as any, {
  get(target, prop, receiver) {
    const liveArray = getLiveFieldSources();
    return Reflect.get(liveArray, prop, receiver);
  },
  getOwnPropertyDescriptor(target, prop) {
    const liveArray = getLiveFieldSources();
    return Reflect.getOwnPropertyDescriptor(liveArray, prop);
  },
  ownKeys(target) {
    const liveArray = getLiveFieldSources();
    return Reflect.ownKeys(liveArray);
  }
});

export const FIELDS_BY_SOURCE_MAP: Record<string, any> = {};

export interface VariablePickerButtonProps {
  targetRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  value: string;
  onChange: (newValue: string) => void;
  label?: string;
  moduleFilter?: FieldModule[];
  onBeforeOpen?: () => void;
  mode?: "insert" | "replace";
  customFields?: { key: string; label: string }[];
}

const VariablePickerButton: React.FC<VariablePickerButtonProps> = ({
  targetRef,
  value,
  onChange,
  label = "Insert Variable",
  moduleFilter,
  onBeforeOpen,
  mode = "insert",
  customFields,
}) => {
  const { getAllFields } = useFieldRegistry();
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownPanelRef = useRef<HTMLDivElement>(null);

  const rawModules = moduleFilter || ALL_MODULES;
  const modulesToUse = rawModules.map(m => (m === "deal" ? "process" : m)) as Exclude<FieldModule, "deal">[];

  // Filter and deduplicate modules
  const uniqueModules = Array.from(new Set(modulesToUse));

  const variableGroups = customFields
    ? [
        {
          value: "custom_flow",
          label: "Populated Flow Fields",
          fields: customFields.map((cf) => ({ value: cf.key, label: cf.label })),
        },
      ]
    : uniqueModules
        .map((module) => ({
          value: module,
          label: MODULE_LABELS[module] || module,
          fields: getAllFields(module).map((f) => {
            const tokenVal = module === "teamMember" 
              ? `teamMember.${f.key}` 
              : (module === "client" ? f.key : `${module}.${f.key}`);
            return { value: tokenVal, label: f.label };
          }),
        }))
        .filter((g) => g.fields.length > 0);


  const handleSelectField = (fieldValue: string) => {
    const insertText = `{{${fieldValue}}}`;
    if (mode === "replace") {
      onChange(insertText);
      setIsOpen(false);
      return;
    }

    const textarea = targetRef?.current;
    if (!textarea) {
      // Fallback: simple append
      onChange((value || "") + insertText);
      setIsOpen(false);
      return;
    }

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
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
    if (onBeforeOpen) {
      onBeforeOpen();
    }
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setIsOpen(true);
  };

  const closeDropdown = () => { setIsOpen(false); setDropdownPos(null); };

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
          <div className="fixed inset-0 cursor-default" style={{ zIndex: 9998 }} onClick={closeDropdown} />
          <div
            ref={dropdownPanelRef}
            className="bg-white rounded-xl shadow-[0px_8px_32px_rgba(0,0,0,0.12)] border border-gray-200 overflow-hidden flex flex-col"
            style={{ position: "fixed", top: dropdownPos.top, right: dropdownPos.right, width: "256px", maxHeight: "256px", zIndex: 9999 }}
          >
            <div className="p-2 border-b border-gray-100 bg-gray-50/50">
              <span className="text-[10px] font-semibold text-gray-400 tracking-wider uppercase" style={{ fontFamily: "Outfit, sans-serif" }}>
                Insert Field Variable
              </span>
            </div>
            <div className="overflow-y-auto flex-1 py-1 max-h-[220px]">
              {variableGroups.map(group => (
                <div key={group.value}>
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 bg-gray-50/30 border-y border-gray-100/50 first:border-t-0" style={{ fontFamily: "Outfit, sans-serif" }}>
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
                        <span className="text-[9px] text-gray-400 font-mono">{`{{${field.value}}}`}</span>
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
