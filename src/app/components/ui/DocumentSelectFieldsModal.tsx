import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, X, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  useFieldRegistry,
  FieldModule,
  ALL_MODULES,
  MODULE_NOUN,
  isFieldMatchingOrg,
  ScopingRule,
} from "../../context/FieldRegistryContext";
import { CreateFieldModal } from "../help/FieldManager";
import { getStoredProcesses } from "../../../lib/useProcessStore";
import { Check } from "lucide-react";

export interface DocumentSelectFieldsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (token: string) => void;
  title?: string;
  subtitle?: string;
  targetModules?: Exclude<FieldModule, "deal">[];
  tokenFormat?: "curly" | "double_curly";
  zIndex?: number;
}

export default function DocumentSelectFieldsModal({
  isOpen,
  onClose,
  onInsert,
  title = "Select Fields",
  subtitle = "Insert placeholder variables into your HTML template",
  targetModules = ["client", "process", "appointment", "service", "organization", "teamMember", "invoice", "claim"],
  tokenFormat = "double_curly",
  zIndex = 10020,
}: DocumentSelectFieldsModalProps) {
  const [fieldSearchQuery, setFieldSearchQuery] = useState("");
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [createFieldModalOpenFor, setCreateFieldModalOpenFor] = useState<FieldModule | null>(null);
    
  const { getAllFields } = useFieldRegistry();
  
  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setSelectedFields([]);
      setFieldSearchQuery("");
      // By default all expanded
      setCollapsedSections({});
    }
  }, [isOpen]);

  const toggleSection = (module: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [module]: !prev[module],
    }));
  };

  const formatToken = (key: string): string => {
    return tokenFormat === "double_curly" ? `{{${key}}}` : `{${key}}`;
  };

  const groupedFieldsList = useMemo(() => {
    return targetModules
      .map((module) => {
        const fields = getAllFields(module);
        const q = fieldSearchQuery.toLowerCase().trim();
        const filtered = fields.filter((f) => {
          if (!q) return true;
          return f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q);
        });
        return {
          module,
          label: MODULE_NOUN[module]?.plural.toUpperCase() || module.toUpperCase(),
          fields: filtered,
        };
      })
      .filter((g) => g.fields.length > 0);
  }, [targetModules, getAllFields, fieldSearchQuery]);

  const totalFilteredCount = groupedFieldsList.reduce((acc, curr) => acc + curr.fields.length, 0);

  const handleApply = () => {
    if (selectedFields.length === 0) {
      onClose();
      return;
    }
    const combinedTokens = selectedFields.map((k) => formatToken(k)).join(" ");
    onInsert(combinedTokens);
    onClose();
  };

  const handleDoubleClickField = (key: string) => {
    onInsert(formatToken(key));
    onClose();
  };

  if (typeof document === "undefined" || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150"
      style={{ zIndex }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Card - Styled identically to Document Template Builder Select Fields modal */}
      <div
        className="relative w-[480px] max-w-[92vw] bg-white border border-slate-200 rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[82vh] text-left animate-in zoom-in-95 duration-100"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        {/* Header */}
        <div className="p-3.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between flex-shrink-0">
          <div>
            <h4 className="font-bold text-xs text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
              {title}
            </h4>
            <p className="text-[10px] text-slate-500 mt-0.5">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xs p-1 rounded hover:bg-slate-100 cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Search Input */}
        <div className="p-2.5 border-b border-slate-100 flex-shrink-0 bg-white">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={fieldSearchQuery}
              onChange={(e) => setFieldSearchQuery(e.target.value)}
              placeholder="Search fields across all categories..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 bg-slate-50/50 text-slate-800"
              style={{ fontFamily: "DM Sans, sans-serif" }}
              autoFocus
            />
          </div>
        </div>

        {/* Collapsible Modules List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2 min-h-0 bg-[#fafafa]">
          {groupedFieldsList.map((group) => {
            const isCollapsed = !!collapsedSections[group.module];
            const groupSelectedCount = group.fields.filter((f) => selectedFields.includes(f.key)).length;

            return (
              <div key={group.module} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                <button
                  type="button"
                  onClick={() => toggleSection(group.module)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-slate-50/70 hover:bg-slate-100/70 transition-colors border-b border-slate-100 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      {group.label} ({group.fields.length})
                    </span>
                    {groupSelectedCount > 0 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 leading-none">
                        {groupSelectedCount} selected
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                </button>

                {!isCollapsed && (
                  <div className="p-2 space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      {group.fields.map((f) => {
                        const isChecked = selectedFields.includes(f.key);
                        return (
                          <label
                            key={`${group.module}-${f.key}`}
                            onDoubleClick={() => handleDoubleClickField(f.key)}
                            className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-colors border select-none ${
                              isChecked ? "bg-blue-50/70 border-blue-200" : "hover:bg-slate-50 border-transparent"
                            }`}
                            title="Double-click to insert immediately"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedFields((prev) => [...prev, f.key]);
                                } else {
                                  setSelectedFields((prev) => prev.filter((k) => k !== f.key));
                                }
                              }}
                              className="w-3.5 h-3.5 rounded text-blue-600 accent-blue-600 cursor-pointer"
                            />
                            <div className="flex flex-col min-w-0 flex-1">
                              <span
                                className="text-[11px] font-semibold text-slate-800 truncate"
                                style={{ fontFamily: "DM Sans, sans-serif" }}
                              >
                                {f.label}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono">
                                {"{"}{f.key}{"}"}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    <div className="pt-1.5 border-t border-slate-100 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setCreateFieldModalOpenFor(group.module as FieldModule)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded border border-dashed border-blue-200 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Create Field</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {totalFilteredCount === 0 && (
            <div className="text-center py-6 text-xs text-slate-400">
              No fields found matching &quot;{fieldSearchQuery}&quot;.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-slate-600 font-semibold" style={{ fontFamily: "DM Sans, sans-serif" }}>
            {selectedFields.length} selected
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={selectedFields.length === 0}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                selectedFields.length > 0
                  ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              <span>APPLY</span>
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Create Field Modal */}
      {createFieldModalOpenFor && (
        <CreateFieldModal
          lockModule={createFieldModalOpenFor}
          onClose={() => setCreateFieldModalOpenFor(null)}
          onCreated={(newField) => {
            setSelectedFields((prev) => [...prev, newField.key]);
            setCreateFieldModalOpenFor(null);
            toast.success(`Created field "${newField.label}" (${formatToken(newField.key)})`);
          }}
        />
      )}
    </div>,
    document.body
  );
}
