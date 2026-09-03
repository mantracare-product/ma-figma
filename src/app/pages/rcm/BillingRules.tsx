import React from "react";
import { useRcm } from "../../context/RcmContext";
import PageHeader from "../../components/layout/PageHeader";
import { Sliders, Shield, AlertTriangle, CheckCircle2, Plus } from "lucide-react";
import { toast } from "sonner";

export default function BillingRules() {
  const { scrubRules, toggleScrubRule } = useRcm();

  return (
    <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* Section Header */}
      <div className="space-y-1">
        <h2
          className="text-2xl font-bold text-[#1e293b] tracking-tight"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Claim Scrubbing & Billing Rules Engine
        </h2>
        <p className="text-sm text-slate-500 font-normal">
          Priority-ordered validation checks evaluated before electronic claim submission
        </p>
      </div>

      {/* Rules Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Active Validation Rules ({scrubRules.filter((r) => r.isEnabled).length}/{scrubRules.length})
            </h3>
            <p className="text-xs text-slate-500">Evaluated sequentially by priority order</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="w-12 px-4 py-3 text-center">Order</th>
                <th className="px-4 py-3">Rule Code & Name</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-center">Outcome</th>
                <th className="px-4 py-3 text-center">Severity</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {scrubRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 text-center font-mono font-bold text-slate-400">
                    #{rule.priorityOrder}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900">{rule.name}</div>
                    <span className="font-mono text-[10px] text-blue-600 font-semibold">{rule.ruleCode}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-sm text-[11px] leading-relaxed">
                    {rule.description}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[10px] font-semibold text-slate-700 capitalize">
                      {rule.category.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                        rule.actionOutcome === "hard_block"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {rule.actionOutcome.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                        rule.severity === "critical"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {rule.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rule.isEnabled}
                        onChange={() => {
                          toggleScrubRule(rule.id);
                          toast.success(`Rule ${rule.ruleCode} ${rule.isEnabled ? "disabled" : "enabled"}`);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
