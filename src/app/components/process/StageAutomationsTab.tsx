import React from "react";
import { Zap, GitBranch, Plus, Pencil, Trash2, Sliders, CheckCircle2 } from "lucide-react";
import type { AutomationRule } from "../../../lib/useAutomationStore";

export interface StageAutomationsTabProps {
  stage: { id: string; name: string; color?: string };
  processId: string;
  processName?: string;
  rules: AutomationRule[];
  onToggleRule: (ruleId: string) => void;
  onEditRule: (rule: AutomationRule) => void;
  onDeleteRule: (ruleId: string) => void;
  onAddRule: () => void;
}

export default function StageAutomationsTab({
  stage,
  processId,
  processName,
  rules,
  onToggleRule,
  onEditRule,
  onDeleteRule,
  onAddRule,
}: StageAutomationsTabProps) {
  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-white rounded-2xl border border-gray-200 shadow-2xs">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mb-4 shadow-2xs">
          <Zap className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>
          No Automations for {stage.name}
        </h3>
        <p className="text-xs text-gray-500 max-w-md mb-6 leading-relaxed" style={{ fontFamily: "Outfit, sans-serif" }}>
          Set up automated actions that fire automatically whenever records move into or out of this stage. Automations created here will also sync to the Global Automations library.
        </p>
        <button
          type="button"
          onClick={onAddRule}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-2xs transition-all cursor-pointer"
          style={{ fontFamily: "DM Sans, sans-serif" }}
        >
          <Plus className="w-4 h-4" />
          <span>Add Stage Automation</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table Container */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/75 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              <th className="py-3 px-4">Automation Name</th>
              <th className="py-3 px-4">Trigger</th>
              <th className="py-3 px-4">Actions / Workflow</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {rules.map((rule) => {
              const evt = (rule.trigger?.event || "").toLowerCase();
              const isExit = evt.includes("exit");
              const conds = (rule.trigger?.params?.conditions || rule.conditions || []);
              const condsCount = Array.isArray(conds) ? conds.length : 0;
              const actions = rule.actions || [];

              return (
                <tr key={rule.id} className="hover:bg-blue-50/20 transition-colors">
                  {/* Name & Description */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-gray-900 flex items-center gap-2">
                      <span>{rule.name}</span>
                      {rule.source === "product" && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 uppercase">
                          Product
                        </span>
                      )}
                    </div>
                    {rule.description ? (
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate max-w-xs">
                        {rule.description}
                      </p>
                    ) : (
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Triggered on {isExit ? "exit" : "entry"} of {stage.name}
                      </p>
                    )}
                  </td>

                  {/* Trigger Badge */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      <GitBranch className="w-3.5 h-3.5 text-blue-600" />
                      <span>{isExit ? "On Stage Exit" : "On Stage Entry"}</span>
                      {condsCount > 0 && (
                        <span className="ml-1 text-[10px] text-blue-500 bg-blue-100/70 px-1.5 py-0.2 rounded-full">
                          {condsCount} cond.
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Actions summary */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {actions.length === 0 ? (
                        <span className="text-[11px] text-gray-400 italic">No actions configured</span>
                      ) : (
                        actions.slice(0, 3).map((act, i) => (
                          <span
                            key={act.id || i}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200/60"
                          >
                            <Zap className="w-2.5 h-2.5 text-blue-600" />
                            <span className="truncate max-w-[110px]">{act.name || act.stepKey}</span>
                          </span>
                        ))
                      )}
                      {actions.length > 3 && (
                        <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          +{actions.length - 3} more
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Status Toggle */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={rule.enabled}
                        onChange={() => onToggleRule(rule.id)}
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                    </label>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEditRule(rule)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Automation"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteRule(rule.id)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Automation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
