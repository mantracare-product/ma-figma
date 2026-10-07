import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, X, Check } from "lucide-react";
import {
  useFieldRegistry,
  ALL_MODULES,
  MODULE_NOUN,
  FieldModule,
  isFieldMatchingOrg,
  ScopingRule,
} from "../../context/FieldRegistryContext";

export interface SelectFieldsMultiModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSelectedKeys?: string[];
  onApply: (selectedKeys: string[]) => void;
  title?: string;
  subtitle?: string;
  scopingRules?: ScopingRule[];
}

export default function SelectFieldsMultiModal({
  isOpen,
  onClose,
  initialSelectedKeys = [],
  onApply,
  title = "Select Fields",
  subtitle = "Select fields to watch for changes",
  scopingRules,
}: SelectFieldsMultiModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>(initialSelectedKeys);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const { getAllFields } = useFieldRegistry();

  useEffect(() => {
    if (isOpen) {
      setSelectedKeys(initialSelectedKeys);
      setSearchQuery("");
    }
  }, [isOpen, initialSelectedKeys]);

  if (typeof document === "undefined" || !isOpen) return null;

  const targetModules: Exclude<FieldModule, "deal">[] = ALL_MODULES;
  const groupedFieldsList = targetModules
    .map((module) => {
      const allModuleFields = getAllFields(module);
      const scopedFields = (scopingRules && scopingRules.length > 0)
        ? allModuleFields.filter((f) => {
            const firstRule = scopingRules[0];
            const scopeOrg = {
              industryCategory: firstRule.industryCategory,
              industry: firstRule.industries?.[0],
              location: firstRule.locations?.[0],
            };
            return isFieldMatchingOrg(f, scopeOrg);
          })
        : allModuleFields;

      const fields = scopedFields.filter(
        (f) =>
          f.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.key.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return {
        module,
        label: MODULE_NOUN[module]?.plural || module,
        fields,
      };
    })
    .filter((g) => g.fields.length > 0);

  const totalFilteredCount = groupedFieldsList.reduce(
    (acc, curr) => acc + curr.fields.length,
    0
  );

  const toggleSection = (moduleKey: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [moduleKey]: !prev[moduleKey],
    }));
  };

  const handleToggleKey = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSelectAllInGroup = (keys: string[]) => {
    const allSelected = keys.every((k) => selectedKeys.includes(k));
    if (allSelected) {
      setSelectedKeys((prev) => prev.filter((k) => !keys.includes(k)));
    } else {
      setSelectedKeys((prev) => Array.from(new Set([...prev, ...keys])));
    }
  };

  const handleApply = () => {
    onApply(selectedKeys);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-4 animate-in fade-in duration-150">
      {/* Backdrop click */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Dialog */}
      <div
        className="relative w-[480px] max-w-[92vw] bg-white border border-slate-200 rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[82vh] text-left animate-in zoom-in-95 duration-150"
        style={{ fontFamily: "DM Sans, sans-serif" }}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between flex-shrink-0">
          <div>
            <h3
              className="font-bold text-sm text-slate-900"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {title}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-100 flex-shrink-0 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search fields across all categories..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-slate-50/50 text-slate-800"
            />
          </div>
        </div>

        {/* Modules List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0 bg-[#fafafa]">
          {groupedFieldsList.map((group) => {
            const isCollapsed = !!collapsedSections[group.module];
            const groupKeys = group.fields.map((f) => f.key);
            const selectedCountInGroup = groupKeys.filter((k) =>
              selectedKeys.includes(k)
            ).length;
            const allSelectedInGroup =
              groupKeys.length > 0 && selectedCountInGroup === groupKeys.length;

            return (
              <div
                key={group.module}
                className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white"
              >
                <div className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50/70 hover:bg-slate-100/70 transition-colors border-b border-slate-100">
                  <button
                    type="button"
                    onClick={() => toggleSection(group.module)}
                    className="flex items-center gap-2 text-left flex-1 cursor-pointer"
                  >
                    <span
                      className="text-[11px] font-bold text-slate-700 uppercase tracking-wider"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {group.label} ({group.fields.length})
                    </span>
                    {selectedCountInGroup > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 leading-none">
                        {selectedCountInGroup} selected
                      </span>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAllInGroup(groupKeys)}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                    >
                      {allSelectedInGroup ? "Deselect All" : "Select All"}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSection(group.module)}
                      className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${
                          isCollapsed ? "-rotate-90" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="p-2 space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      {group.fields.map((f) => {
                        const isChecked = selectedKeys.includes(f.key);
                        return (
                          <label
                            key={`${group.module}-${f.key}`}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors border select-none ${
                              isChecked
                                ? "bg-blue-50/80 border-blue-200 text-blue-950"
                                : "hover:bg-slate-50 border-slate-100 text-slate-800"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleKey(f.key)}
                              className="w-3.5 h-3.5 rounded text-blue-600 accent-blue-600 cursor-pointer"
                            />
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-[11px] font-semibold text-slate-800 truncate">
                                {f.label}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono">
                                {"{"}
                                {f.key}
                                {"}"}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {totalFilteredCount === 0 && (
            <div className="text-center py-8 text-xs text-slate-400">
              No fields found matching &quot;{searchQuery}&quot;.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-slate-600 font-semibold">
            {selectedKeys.length} field{selectedKeys.length === 1 ? "" : "s"} selected
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
