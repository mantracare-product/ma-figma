/**
 * AdminScopingRulesEditor.tsx
 * Path: src/app/pages/admin/components/AdminScopingRulesEditor.tsx
 *
 * Clean, multi-rule builder for assigning Custom Fields & Custom Sections to:
 * - Specific Industry Categories
 * - Multiple Industries within each category (direct clickable chip toggles)
 * - Multiple Locations (direct clickable chip toggles + custom location entry)
 *
 * Multiple rules can be created, allowing different combinations of category/industries/locations.
 */

import React, { useState } from "react";
import { Plus, Trash2, Globe, Check, X, Search } from "lucide-react";
import type { ScopingRule } from "../../../context/FieldRegistryContext";
import {
  INITIAL_CATEGORIES,
  STANDARD_LOCATIONS,
  getIndustriesForCategory,
} from "../../../../data/industryReferenceData";

interface AdminScopingRulesEditorProps {
  rules: ScopingRule[];
  onChange: (rules: ScopingRule[]) => void;
  isReadOnly?: boolean;
}

export function AdminScopingRulesEditor({
  rules,
  onChange,
  isReadOnly = false,
}: AdminScopingRulesEditorProps) {
  const [industrySearch, setIndustrySearch] = useState<Record<number, string>>({});
  const [customLocationInput, setCustomLocationInput] = useState<Record<number, string>>({});

  const handleAddRule = () => {
    if (isReadOnly) return;
    const newRule: ScopingRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      industryCategory: "All",
      industries: [],
      locations: [],
    };
    onChange([...rules, newRule]);
  };

  const handleRemoveRule = (index: number) => {
    if (isReadOnly) return;
    onChange(rules.filter((_, i) => i !== index));
  };

  const handleUpdateRule = (index: number, patch: Partial<ScopingRule>) => {
    if (isReadOnly) return;
    const updated = rules.map((r, i) => (i === index ? { ...r, ...patch } : r));
    onChange(updated);
  };

  const toggleIndustry = (ruleIndex: number, industry: string) => {
    if (isReadOnly) return;
    const rule = rules[ruleIndex];
    if (!rule) return;
    const current = rule.industries || [];
    const updated = current.includes(industry)
      ? current.filter((i) => i !== industry)
      : [...current, industry];
    handleUpdateRule(ruleIndex, { industries: updated });
  };

  const selectAllIndustries = (ruleIndex: number, availableIndustries: string[]) => {
    if (isReadOnly) return;
    handleUpdateRule(ruleIndex, { industries: [...availableIndustries] });
  };

  const clearIndustries = (ruleIndex: number) => {
    if (isReadOnly) return;
    handleUpdateRule(ruleIndex, { industries: [] });
  };

  const toggleLocation = (ruleIndex: number, location: string) => {
    if (isReadOnly) return;
    const rule = rules[ruleIndex];
    if (!rule) return;
    const current = rule.locations || [];
    const updated = current.includes(location)
      ? current.filter((l) => l !== location)
      : [...current, location];
    handleUpdateRule(ruleIndex, { locations: updated });
  };

  const selectAllLocations = (ruleIndex: number) => {
    if (isReadOnly) return;
    handleUpdateRule(ruleIndex, { locations: [...STANDARD_LOCATIONS] });
  };

  const clearLocations = (ruleIndex: number) => {
    if (isReadOnly) return;
    handleUpdateRule(ruleIndex, { locations: [] });
  };

  const handleAddCustomLocation = (ruleIndex: number) => {
    if (isReadOnly) return;
    const text = (customLocationInput[ruleIndex] || "").trim();
    if (!text) return;
    const rule = rules[ruleIndex];
    if (!rule) return;
    const current = rule.locations || [];
    if (!current.includes(text)) {
      handleUpdateRule(ruleIndex, { locations: [...current, text] });
    }
    setCustomLocationInput((prev) => ({ ...prev, [ruleIndex]: "" }));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-bold text-gray-900">
            Scope Rules (Industry Category, Industries & Locations)
          </label>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Define which tenant organizations have visibility to this item
          </p>
        </div>
        {rules.length > 0 && !isReadOnly && (
          <button
            type="button"
            onClick={handleAddRule}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Rule
          </button>
        )}
      </div>

      {rules.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-xl p-4 bg-gray-50/70 text-center">
          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2">
            <Globe className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-gray-700">Global (All Organizations)</p>
          <p className="text-[11px] text-gray-400 mt-0.5 max-w-xs mx-auto">
            No scope rules added. This field will be visible to all organizations across every industry category, industry, and location.
          </p>
          {!isReadOnly && (
            <button
              type="button"
              onClick={handleAddRule}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50/40 rounded-lg text-xs font-medium text-gray-700 hover:text-blue-600 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Scope Rule
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {rules.map((rule, idx) => {
            const availableIndustries = getIndustriesForCategory(rule.industryCategory || "All");
            const selectedIndustries = rule.industries || [];
            const selectedLocations = rule.locations || [];
            const filterText = (industrySearch[idx] || "").toLowerCase();
            const filteredIndustries = availableIndustries.filter((ind) =>
              ind.toLowerCase().includes(filterText)
            );

            return (
              <div
                key={rule.id || `rule_${idx}`}
                className="border border-blue-100/80 bg-[#FAFBFF] rounded-xl p-3.5 shadow-xs space-y-3 relative"
              >
                {/* Rule Header */}
                <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded uppercase tracking-wider">
                      Rule #{idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-gray-800">
                      {rule.industryCategory && rule.industryCategory !== "All"
                        ? rule.industryCategory
                        : "All Categories (Universal)"}
                    </span>
                  </div>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRule(idx)}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove this scoping rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Step 1: Industry Category */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    1. Industry Category
                  </label>
                  <select
                    value={rule.industryCategory || "All"}
                    disabled={isReadOnly}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      handleUpdateRule(idx, {
                        industryCategory: newCat,
                        industries: [], // Reset industries when category changes
                      });
                    }}
                    className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-gray-800 ${
                      isReadOnly ? "bg-gray-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <option value="All">All Categories (Universal)</option>
                    {INITIAL_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Step 2: Industries (Direct click pills) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <label className="text-[11px] font-semibold text-gray-700">
                        2. Industries
                      </label>
                      <span className="text-[10px] text-gray-400">
                        ({selectedIndustries.length > 0 ? `${selectedIndustries.length} selected` : "All included"})
                      </span>
                    </div>
                    {!isReadOnly && (
                      <div className="flex items-center gap-2 text-[10px]">
                        <button
                          type="button"
                          onClick={() => selectAllIndustries(idx, availableIndustries)}
                          className="text-blue-600 hover:underline font-medium cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={() => clearIndustries(idx)}
                          className="text-gray-500 hover:underline cursor-pointer"
                        >
                          Clear (All)
                        </button>
                      </div>
                    )}
                  </div>

                  {availableIndustries.length > 5 && (
                    <div className="relative mb-2">
                      <Search className="w-3 h-3 text-gray-400 absolute left-2.5 top-2" />
                      <input
                        type="text"
                        value={industrySearch[idx] || ""}
                        onChange={(e) =>
                          setIndustrySearch((prev) => ({ ...prev, [idx]: e.target.value }))
                        }
                        placeholder="Search industries in this category..."
                        className="w-full pl-7 pr-2.5 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}

                  {/* Clickable Industry Chips */}
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-white border border-gray-200 rounded-lg">
                    {filteredIndustries.map((ind) => {
                      const isSelected = selectedIndustries.includes(ind);
                      return (
                        <button
                          key={ind}
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => toggleIndustry(idx, ind)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer select-none text-left ${
                            isSelected
                              ? "bg-blue-600 text-white font-medium shadow-xs"
                              : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 flex-shrink-0" />}
                          <span>{ind}</span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedIndustries.length === 0 && (
                    <p className="text-[10px] text-gray-400 italic mt-1">
                      No specific industries picked — all industries under this category are included.
                    </p>
                  )}
                </div>

                {/* Step 3: Locations (Direct click pills) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <label className="text-[11px] font-semibold text-gray-700">
                        3. Locations
                      </label>
                      <span className="text-[10px] text-gray-400">
                        ({selectedLocations.length > 0 ? `${selectedLocations.length} selected` : "All included"})
                      </span>
                    </div>
                    {!isReadOnly && (
                      <div className="flex items-center gap-2 text-[10px]">
                        <button
                          type="button"
                          onClick={() => selectAllLocations(idx)}
                          className="text-emerald-700 hover:underline font-medium cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={() => clearLocations(idx)}
                          className="text-gray-500 hover:underline cursor-pointer"
                        >
                          Clear (All)
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Clickable Location Chips */}
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-white border border-gray-200 rounded-lg">
                    {STANDARD_LOCATIONS.map((loc) => {
                      const isSelected = selectedLocations.includes(loc);
                      return (
                        <button
                          key={loc}
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => toggleLocation(idx, loc)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer select-none text-left ${
                            isSelected
                              ? "bg-emerald-600 text-white font-medium shadow-xs"
                              : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 flex-shrink-0" />}
                          <span>{loc}</span>
                        </button>
                      );
                    })}

                    {/* Any custom added locations */}
                    {selectedLocations
                      .filter((l) => !STANDARD_LOCATIONS.includes(l))
                      .map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => toggleLocation(idx, loc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-emerald-600 text-white font-medium shadow-xs cursor-pointer select-none"
                        >
                          <Check className="w-3 h-3 flex-shrink-0" />
                          <span>{loc}</span>
                          <X className="w-3 h-3 ml-0.5 hover:text-red-200" />
                        </button>
                      ))}
                  </div>

                  {/* Add custom location input */}
                  {!isReadOnly && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <input
                        type="text"
                        value={customLocationInput[idx] || ""}
                        onChange={(e) =>
                          setCustomLocationInput((prev) => ({ ...prev, [idx]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddCustomLocation(idx);
                          }
                        }}
                        placeholder="Add other location..."
                        className="flex-1 px-2.5 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddCustomLocation(idx)}
                        className="px-2.5 py-1 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700 border border-gray-200 rounded-lg text-xs font-medium cursor-pointer"
                      >
                        + Add
                      </button>
                    </div>
                  )}

                  {selectedLocations.length === 0 && (
                    <p className="text-[10px] text-gray-400 italic mt-1">
                      No specific locations picked — all locations are included.
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {!isReadOnly && (
            <button
              type="button"
              onClick={handleAddRule}
              className="w-full py-2 border border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/30 text-xs font-semibold text-gray-600 hover:text-blue-600 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Another Scoping Rule
            </button>
          )}
        </div>
      )}
    </div>
  );
}
