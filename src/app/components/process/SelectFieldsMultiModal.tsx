import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, X, Check } from "lucide-react";
import {
  useFieldRegistry,
  ALL_MODULES,
  MODULE_NOUN,
  FieldModule,
  isFieldMatchingOrg,
  isFieldMatchingContactCategory,
  ScopingRule,
} from "../../context/FieldRegistryContext";
import { getStoredProcesses, getWorkflowsForModule } from "../../../lib/useProcessStore";
import { useContactCategories } from "../../../lib/contactCategoriesStore";

export interface SelectFieldsMultiModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSelectedKeys?: string[];
  onApply: (selectedKeys: string[]) => void;
  title?: string;
  subtitle?: string;
  scopingRules?: ScopingRule[];
  singleSelect?: boolean;
}

export default function SelectFieldsMultiModal({
  isOpen,
  onClose,
  initialSelectedKeys = [],
  onApply,
  title = "Select Fields",
  subtitle = "Select fields to watch for changes",
  scopingRules,
  singleSelect = false,
}: SelectFieldsMultiModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>(initialSelectedKeys);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
    
  const { getAllFields } = useFieldRegistry();
  const allProcesses = useMemo(() => getStoredProcesses(), []);
  const [selectedWorkflowByModule, setSelectedWorkflowByModule] = useState<Record<string, string>>({});
  const [openWorkflowDropdownModule, setOpenWorkflowDropdownModule] = useState<string | null>(null);
  const contactCategories = useContactCategories();
  const [selectedContactCategory, setSelectedContactCategory] = useState<string>("all");
  const [showContactCategoryDropdown, setShowContactCategoryDropdown] = useState(false);

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
            return scopingRules.some((rule) => {
              const cat = rule.industryCategory;
              const industries = (rule.industries && rule.industries.length > 0) ? rule.industries : [undefined];
              const locations = (rule.locations && rule.locations.length > 0) ? rule.locations : [undefined];

              if (!cat && industries.every((i) => !i || i === "All") && locations.every((l) => !l || l === "All")) {
                return true;
              }

              return industries.some((ind) =>
                locations.some((loc) => {
                  const scopeOrg = {
                    industryCategory: cat,
                    industry: ind,
                    location: loc,
                    locations: rule.locations,
                  };
                  return isFieldMatchingOrg(f, scopeOrg);
                })
              );
            });
          })
        : allModuleFields;

      const isClient = module === "client";
      const clientFiltered = (isClient && selectedContactCategory && selectedContactCategory !== "all")
        ? scopedFields.filter((f) => isFieldMatchingContactCategory(f, selectedContactCategory))
        : scopedFields;

      const isWorkflowModule = ["process", "appointment", "invoice", "claim"].includes(module);
      const targetWorkflow = selectedWorkflowByModule[module];

      const workflowFiltered = (isWorkflowModule && targetWorkflow && targetWorkflow !== "all")
        ? clientFiltered.filter((f) => {
            if (!f.processIds || f.processIds.length === 0 || f.processIds.includes("all") || f.processIds.includes("*")) {
              return true;
            }
            return f.processIds.includes(targetWorkflow);
          })
        : clientFiltered;

      const fields = workflowFiltered.filter(
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
    if (singleSelect) {
      setSelectedKeys((prev) => (prev.includes(key) ? [] : [key]));
    } else {
      setSelectedKeys((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      );
    }
  };

  const handleSelectAllInGroup = (keys: string[]) => {
    if (singleSelect) return;
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
                  <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleSection(group.module)}
                      className="flex items-center gap-1.5 text-left cursor-pointer hover:text-blue-600 transition-colors"
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

                    {group.module === "client" && (() => {
                      const currentCat = selectedContactCategory || "all";
                      return (
                        <>
                          <span className="text-slate-300 font-light text-xs">|</span>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowContactCategoryDropdown(!showContactCategoryDropdown);
                              }}
                              className="h-6 px-2 bg-white border border-slate-200 rounded-md text-[10px] font-semibold text-slate-700 flex items-center gap-1 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                            >
                              <span className="text-slate-400 font-normal">Category:</span>
                              <span className="max-w-[100px] truncate text-blue-600 font-bold">
                                {currentCat === "all" ? "All Categories" : currentCat}
                              </span>
                              <ChevronDown className={`w-2.5 h-2.5 text-slate-400 transition-transform ${showContactCategoryDropdown ? "rotate-180" : ""}`} />
                            </button>

                            {showContactCategoryDropdown && (
                              <>
                                <div
                                  className="fixed inset-0 z-[10001]"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowContactCategoryDropdown(false);
                                  }}
                                />
                                <div
                                  className="absolute left-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-[10002] py-1 max-h-48 overflow-y-auto"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedContactCategory("all");
                                      setShowContactCategoryDropdown(false);
                                    }}
                                    className={`w-full text-left px-2.5 py-1 text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                                      currentCat === "all" ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                                    }`}
                                  >
                                    <span>All Categories</span>
                                    {currentCat === "all" && <Check className="w-3.5 h-3.5 text-blue-600" />}
                                  </button>

                                  {contactCategories.map((cat) => (
                                    <button
                                      key={cat}
                                      type="button"
                                      onClick={() => {
                                        setSelectedContactCategory(cat);
                                        setShowContactCategoryDropdown(false);
                                      }}
                                      className={`w-full text-left px-2.5 py-1 text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                                        currentCat === cat ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                                      }`}
                                    >
                                      <span className="truncate">{cat}</span>
                                      {currentCat === cat && <Check className="w-3.5 h-3.5 text-blue-600" />}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </>
                      );
                    })()}

                    {["process", "appointment", "invoice", "claim"].includes(group.module) && (() => {
                      const workflows = getWorkflowsForModule(group.module, allProcesses);
                      const currentWfId = selectedWorkflowByModule[group.module] || "all";
                      const currentWf = workflows.find((w) => w.id === currentWfId);
                      const labelText = currentWfId === "all" ? (group.module === "process" ? "All Processes" : "All Workflows") : (currentWf?.name || currentWfId);

                      return (
                        <>
                          <span className="text-slate-300 font-light text-xs">|</span>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenWorkflowDropdownModule(openWorkflowDropdownModule === group.module ? null : group.module);
                              }}
                              className="h-6 px-2 bg-white border border-slate-200 rounded-md text-[10px] font-semibold text-slate-700 flex items-center gap-1 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                            >
                              <span className="text-slate-400 font-normal">
                                {group.module === "process" ? "Process:" : "Workflow:"}
                              </span>
                              <span className="max-w-[100px] truncate text-blue-600 font-bold">
                                {labelText}
                              </span>
                              <ChevronDown className={`w-2.5 h-2.5 text-slate-400 transition-transform ${openWorkflowDropdownModule === group.module ? "rotate-180" : ""}`} />
                            </button>

                            {openWorkflowDropdownModule === group.module && (
                              <>
                                <div
                                  className="fixed inset-0 z-[10001]"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenWorkflowDropdownModule(null);
                                  }}
                                />
                                <div
                                  className="absolute left-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-[10002] py-1 max-h-48 overflow-y-auto"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedWorkflowByModule((prev) => ({ ...prev, [group.module]: "all" }));
                                      setOpenWorkflowDropdownModule(null);
                                    }}
                                    className={`w-full text-left px-2.5 py-1 text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                                      currentWfId === "all" ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                                    }`}
                                  >
                                    <span>{group.module === "process" ? "All Processes" : "All Workflows"}</span>
                                    {currentWfId === "all" && <Check className="w-3.5 h-3.5 text-blue-600" />}
                                  </button>

                                  {workflows.map((wf) => {
                                    const isSel = currentWfId === wf.id;
                                    return (
                                      <button
                                        key={wf.id}
                                        type="button"
                                        onClick={() => {
                                          setSelectedWorkflowByModule((prev) => ({ ...prev, [group.module]: wf.id }));
                                          setOpenWorkflowDropdownModule(null);
                                        }}
                                        className={`w-full text-left px-2.5 py-1 text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                                          isSel ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                                        }`}
                                      >
                                        <span className="truncate">{wf.name}</span>
                                        {isSel && <Check className="w-3.5 h-3.5 text-blue-600" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-2">
                    {!singleSelect && (
                      <button
                        type="button"
                        onClick={() => handleSelectAllInGroup(groupKeys)}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                      >
                        {allSelectedInGroup ? "Deselect All" : "Select All"}
                      </button>
                    )}
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
                            onDoubleClick={() => {
                              if (singleSelect) {
                                onApply([f.key]);
                                onClose();
                              }
                            }}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors border select-none ${
                              isChecked
                                ? "bg-blue-50/80 border-blue-200 text-blue-950"
                                : "hover:bg-slate-50 border-slate-100 text-slate-800"
                            }`}
                          >
                            <input
                              type={singleSelect ? "radio" : "checkbox"}
                              name={singleSelect ? "field-selection-radio" : undefined}
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
            {selectedKeys.length === 0
              ? "No field selected"
              : `${selectedKeys.length} field${selectedKeys.length === 1 ? "" : "s"} selected`}
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
