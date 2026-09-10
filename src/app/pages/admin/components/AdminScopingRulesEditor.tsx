import React, { useState } from "react";
import { Plus, Trash2, Globe, ChevronDown } from "lucide-react";
import type { ScopingRule } from "../../../context/FieldRegistryContext";
import {
  INITIAL_CATEGORIES,
  STANDARD_LOCATIONS,
  getIndustriesForCategory,
} from "../../../../data/industryReferenceData";
import { AdminMultiSelectDropdown } from "./AdminMultiSelectDropdown";
import { InfoTooltip } from "../../../components/help/InfoTooltip";

interface AdminScopingRulesEditorProps {
  rules: ScopingRule[];
  onChange: (rules: ScopingRule[]) => void;
  isReadOnly?: boolean;
  showHeader?: boolean;
}

export function AdminScopingRulesEditor({
  rules,
  onChange,
  isReadOnly = false,
  showHeader = false,
}: AdminScopingRulesEditorProps) {
  const [openRuleIds, setOpenRuleIds] = useState<Record<string, boolean>>({});

  const isRuleOpen = (key: string) => {
    return Boolean(openRuleIds[key]);
  };

  const toggleRule = (key: string) => {
    setOpenRuleIds((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleAddRule = () => {
    if (isReadOnly) return;
    const newId = `rule_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newRule: ScopingRule = {
      id: newId,
      industryCategory: "All",
      industries: [],
      locations: [],
    };
    setOpenRuleIds((prev) => ({ ...prev, [newId]: true }));
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

  return (
    <div className="space-y-2.5">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-gray-700">
              Scope Rules
            </span>
            <InfoTooltip text="Define which tenant organizations have visibility to this item based on industry category, industries, and locations." size="sm" />
          </div>
          {rules.length > 0 && !isReadOnly && (
            <button
              type="button"
              onClick={handleAddRule}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
              title="Add another scope rule"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Rule
            </button>
          )}
        </div>
      )}

      {rules.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-lg p-3.5 bg-gray-50/70 text-center">
          <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center mx-auto mb-1.5">
            <Globe className="w-3.5 h-3.5" />
          </div>
          <p className="text-xs font-medium text-gray-700">All Industries & Locations</p>
          <p className="text-[11px] text-gray-400 mt-0.5 max-w-xs mx-auto">
            No scope restrictions added.
          </p>
          {!isReadOnly && (
            <button
              type="button"
              onClick={handleAddRule}
              className="mt-2.5 inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-200 hover:border-gray-300 rounded-md text-xs font-medium text-gray-700 hover:text-blue-600 shadow-2xs transition-all cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              Add Scope Rule
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule, idx) => {
            const ruleKey = rule.id || `rule_${idx}`;
            const isOpen = isRuleOpen(ruleKey);
            const availableIndustries = getIndustriesForCategory(rule.industryCategory || "All");
            const selectedIndustries = rule.industries || [];
            const selectedLocations = rule.locations || [];

            return (
              <div
                key={ruleKey}
                className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-2xs"
              >
                {/* Rule Header Dropdown Toggle */}
                <div
                  onClick={() => toggleRule(ruleKey)}
                  className="w-full px-3 py-2 bg-gray-50/80 hover:bg-gray-100/70 flex items-center justify-between text-left transition-colors cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`}
                    />
                    <span className="text-xs font-medium text-gray-700">
                      Rule {idx + 1}
                    </span>
                  </div>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveRule(idx);
                      }}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer shrink-0 ml-2"
                      title="Remove this rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Rule Body (Expanded) */}
                {isOpen && (
                  <div className="p-3 space-y-3 border-t border-gray-100 bg-white">
                    {/* Step 1: Industry Category */}
                    <div>
                      <div className="flex items-center mb-1">
                        <label className="block text-[11px] font-medium text-gray-700">
                          1. Industry Category
                        </label>
                        <InfoTooltip text="Filter by industry category, or select Universal for all categories." size="sm" />
                      </div>
                      <select
                        value={rule.industryCategory || "All"}
                        disabled={isReadOnly}
                        onChange={(e) => {
                          const newCat = e.target.value;
                          handleUpdateRule(idx, {
                            industryCategory: newCat,
                            industries: [],
                          });
                        }}
                        className={`w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-800 ${
                          isReadOnly ? "bg-gray-50 cursor-not-allowed" : "cursor-pointer"
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

                    {/* Step 2: Industries */}
                    <div>
                      <AdminMultiSelectDropdown
                        label="2. Industries"
                        tooltipText="Select specific industries or leave empty to include all industries in this category."
                        options={availableIndustries}
                        selected={selectedIndustries}
                        onChange={(newIndustries) => handleUpdateRule(idx, { industries: newIndustries })}
                        placeholder="All industries included (Universal)"
                        disabled={isReadOnly}
                      />
                    </div>

                    {/* Step 3: Locations */}
                    <div>
                      <AdminMultiSelectDropdown
                        label="3. Locations"
                        tooltipText="Select specific states or regions, or leave empty to include all locations."
                        options={STANDARD_LOCATIONS}
                        selected={selectedLocations}
                        onChange={(newLocations) => handleUpdateRule(idx, { locations: newLocations })}
                        placeholder="All locations included (Universal)"
                        disabled={isReadOnly}
                        allowCustomInput={!isReadOnly}
                        customInputPlaceholder="Add other location..."
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {!isReadOnly && (
            <div className="flex justify-end pt-0.5">
              <button
                type="button"
                onClick={handleAddRule}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Rule
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
export default AdminScopingRulesEditor;
