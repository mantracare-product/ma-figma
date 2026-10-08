import React, { useState } from "react";
import { Plus, Trash2, Globe, ChevronDown, User, Zap, Calendar, Receipt, Check } from "lucide-react";
import type { ScopingRule } from "../../../context/FieldRegistryContext";
import {
  INITIAL_CATEGORIES,
  STANDARD_LOCATIONS,
  getIndustriesForCategory,
} from "../../../../data/industryReferenceData";
import { AdminMultiSelectDropdown } from "./AdminMultiSelectDropdown";
import { AdminCategoryDropdown } from "./AdminCategoryDropdown";
import { InfoTooltip } from "../../../components/help/InfoTooltip";

interface AdminScopingRulesEditorProps {
  rules: ScopingRule[];
  onChange: (rules: ScopingRule[]) => void;
  isReadOnly?: boolean;
  showHeader?: boolean;
  allowEntities?: boolean;
}

export function AdminScopingRulesEditor({
  rules,
  onChange,
  isReadOnly = false,
  showHeader = false,
  allowEntities = false,
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
      industryCategory: INITIAL_CATEGORIES[0]?.name || "Automobile",
      industries: [],
      locations: [],
      ...(allowEntities ? { entities: ["client", "process", "appointment", "invoice"] } : {}),
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
          <p className="text-xs font-medium text-gray-700">All Industries & Countries</p>
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
            const activeCategory =
              rule.industryCategory && rule.industryCategory !== "All"
                ? rule.industryCategory
                : INITIAL_CATEGORIES[0]?.name || "Automobile";
            const availableIndustries = getIndustriesForCategory(activeCategory).filter(
              (ind) => !/^(all|all\s+industr(y|ies))$/i.test(ind.trim())
            );
            const selectedIndustries = (rule.industries || []).filter(
              (ind) => !/^(all|all\s+industr(y|ies))$/i.test(ind.trim())
            );
            const selectedLocations = (rule.locations || []).filter(
              (loc) => !/^(all|all\s+locations|all\s+countries)$/i.test(loc.trim())
            );

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
                      <AdminCategoryDropdown
                        value={activeCategory}
                        disabled={isReadOnly}
                        onChange={(newCat) => {
                          handleUpdateRule(idx, {
                            industryCategory: newCat,
                            industries: [],
                          });
                        }}
                      />
                    </div>

                    {/* Step 2: Industries */}
                    <div>
                      <AdminMultiSelectDropdown
                        label="2. Industries"
                        tooltipText="Select specific industries or click 'Select All' to include all industries in this category."
                        options={availableIndustries}
                        selected={selectedIndustries}
                        onChange={(newIndustries) =>
                          handleUpdateRule(idx, {
                            industries: newIndustries.filter((i) => !/^(all|all\s+industr(y|ies))$/i.test(i.trim())),
                          })
                        }
                        placeholder="Select industries (use 'Select All' for all)"
                        disabled={isReadOnly}
                      />
                    </div>

                    {/* Step 3: Country (Optional) */}
                    <div>
                      <div className="flex items-center mb-1">
                        <label className="block text-[11px] font-medium text-gray-700">
                          3. Country <span className="text-[10px] font-normal text-gray-400">(optional)</span>
                        </label>
                        <InfoTooltip text="Optional. If country conditions are added, they only apply to selected countries. If left empty, it applies to all locations by default." size="sm" />
                      </div>
                      <AdminMultiSelectDropdown
                        options={STANDARD_LOCATIONS}
                        selected={selectedLocations}
                        onChange={(newLocations) =>
                          handleUpdateRule(idx, {
                            locations: newLocations.filter((l) => !/^(all|all\s+locations|all\s+countries)$/i.test(l.trim())),
                          })
                        }
                        placeholder="All countries included by default"
                        disabled={isReadOnly}
                        allowCustomInput={!isReadOnly}
                        customInputPlaceholder="Add other country..."
                      />
                    </div>

                    {/* Step 4: Entity Availability (Multiple selection) */}
                    {allowEntities && (
                      <div>
                        <div className="flex items-center mb-1.5">
                          <label className="block text-[11px] font-medium text-gray-700">
                            4. Entity Availability
                          </label>
                          <InfoTooltip text="Choose one or more entities this rule applies to: Client, Process, Appointment, or Invoice." size="sm" />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { key: "client", label: "Client", icon: User },
                            { key: "process", label: "Process", icon: Zap },
                            { key: "appointment", label: "Appointment", icon: Calendar },
                            { key: "invoice", label: "Invoice", icon: Receipt },
                          ].map((ent) => {
                            const currentEntities = rule.entities && rule.entities.length > 0
                              ? rule.entities
                              : ["client", "process", "appointment", "invoice"];
                            const isSelected = currentEntities.includes(ent.key);
                            const Icon = ent.icon;

                            return (
                              <button
                                key={ent.key}
                                type="button"
                                disabled={isReadOnly}
                                onClick={() => {
                                  if (isReadOnly) return;
                                  let next: string[];
                                  if (isSelected) {
                                    next = currentEntities.filter((k) => k !== ent.key);
                                    if (next.length === 0) {
                                      next = [ent.key]; // keep at least 1 selected
                                    }
                                  } else {
                                    next = [...currentEntities, ent.key];
                                  }
                                  handleUpdateRule(idx, { entities: next });
                                }}
                                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer select-none ${
                                  isSelected
                                    ? "bg-blue-50/80 border-blue-500 text-blue-700 ring-1 ring-blue-500/15"
                                    : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300"
                                }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Icon className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">{ent.label}</span>
                                </div>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
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
