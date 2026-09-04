import React, { useState } from "react";
import { useRcm } from "../../context/RcmContext";
import PageHeader from "../../components/layout/PageHeader";
import { HowItWorksModal, HowItWorksButton } from "../../components/help/HowItWorksModal";
import DrawerShell from "../../components/ui/DrawerShell";
import { ScrubRule } from "../../types/rcmTypes";
import { Sliders, Shield, AlertTriangle, CheckCircle2, Plus, Edit2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export default function BillingRules() {
  const { scrubRules, toggleScrubRule, addScrubRule, updateScrubRule } = useRcm();
  const [showHelp, setShowHelp] = useState(false);
  const [selectedRule, setSelectedRule] = useState<ScrubRule | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // New rule form state
  const [newCode, setNewCode] = useState(`RULE-${String(scrubRules.length + 1).padStart(2, "0")}`);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState<ScrubRule["category"]>("coding");
  const [newOutcome, setNewOutcome] = useState<ScrubRule["actionOutcome"]>("warning_with_confirm");
  const [newSeverity, setNewSeverity] = useState<ScrubRule["severity"]>("warning");

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCode.trim()) {
      toast.error("Please enter a rule code and name");
      return;
    }

    addScrubRule({
      ruleCode: newCode.trim().toUpperCase(),
      name: newName.trim(),
      description: newDesc.trim() || "Custom scrub rule",
      category: newCategory,
      priorityOrder: scrubRules.length + 1,
      isEnabled: true,
      actionOutcome: newOutcome,
      severity: newSeverity,
    });

    toast.success(`Custom rule ${newCode.toUpperCase()} added to scrub engine`);
    setIsCreating(false);
    setNewName("");
    setNewDesc("");
  };

  const handleUpdateSelectedRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRule) return;
    updateScrubRule(selectedRule.id, {
      name: selectedRule.name,
      description: selectedRule.description,
      actionOutcome: selectedRule.actionOutcome,
      severity: selectedRule.severity,
    });
    toast.success(`Scrub rule ${selectedRule.ruleCode} updated`);
    setSelectedRule(null);
  };

  return (
    <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* Page Header */}
      <PageHeader
        title="Claim Scrubbing & Billing Rules Engine"
        subtitle="Priority-ordered validation checks and NCCI edits evaluated before electronic EDI 837 claim submission"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setNewCode(`RULE-${String(scrubRules.length + 1).padStart(2, "0")}`);
                setIsCreating(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Custom Rule
            </button>
            <HowItWorksButton onClick={() => setShowHelp(true)} />
          </div>
        }
      />

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
                <tr
                  key={rule.id}
                  onClick={() => setSelectedRule(rule)}
                  className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                >
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
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
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

      {/* Add Custom Rule Drawer */}
      {isCreating && (
        <DrawerShell
          isOpen={isCreating}
          onClose={() => setIsCreating(false)}
          title="Add Custom Scrub Rule"
          subtitle="Define a validation check to run during pre-submission claim scrubbing"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="new-rule-form"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-2xs"
              >
                Save Rule
              </button>
            </div>
          }
        >
          <form id="new-rule-form" onSubmit={handleCreateRule} className="space-y-4 text-xs text-slate-800">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Rule Code *</label>
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                required
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono uppercase text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Rule Name *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                placeholder="e.g. Telehealth Modifer -95 Requirement"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Description</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={3}
                placeholder="Explain the clinical or regulatory rationale for this validation check..."
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                >
                  <option value="coding">Coding & NCCI</option>
                  <option value="eligibility">Eligibility</option>
                  <option value="prior_auth">Prior Authorization</option>
                  <option value="npi_credentialing">NPI / Credentialing</option>
                  <option value="timely_filing">Timely Filing</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Action Outcome</label>
                <select
                  value={newOutcome}
                  onChange={(e) => setNewOutcome(e.target.value as any)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                >
                  <option value="hard_block">Hard Block (Must Fix)</option>
                  <option value="warning_with_confirm">Warning (Human Confirm)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Severity</label>
              <select
                value={newSeverity}
                onChange={(e) => setNewSeverity(e.target.value as any)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
              >
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>
          </form>
        </DrawerShell>
      )}

      {/* Edit Selected Rule Drawer */}
      {selectedRule && (
        <DrawerShell
          isOpen={!!selectedRule}
          onClose={() => setSelectedRule(null)}
          title={`Edit Rule: ${selectedRule.ruleCode}`}
          subtitle={selectedRule.name}
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setSelectedRule(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-rule-form"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-2xs"
              >
                Update Rule
              </button>
            </div>
          }
        >
          <form id="edit-rule-form" onSubmit={handleUpdateSelectedRule} className="space-y-4 text-xs text-slate-800">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Rule Name</label>
              <input
                type="text"
                value={selectedRule.name}
                onChange={(e) => setSelectedRule({ ...selectedRule, name: e.target.value })}
                required
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Description</label>
              <textarea
                value={selectedRule.description}
                onChange={(e) => setSelectedRule({ ...selectedRule, description: e.target.value })}
                rows={4}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Action Outcome</label>
                <select
                  value={selectedRule.actionOutcome}
                  onChange={(e) => setSelectedRule({ ...selectedRule, actionOutcome: e.target.value as any })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                >
                  <option value="hard_block">Hard Block (Must Fix)</option>
                  <option value="warning_with_confirm">Warning (Human Confirm)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Severity</label>
                <select
                  value={selectedRule.severity}
                  onChange={(e) => setSelectedRule({ ...selectedRule, severity: e.target.value as any })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                >
                  <option value="critical">Critical</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                </select>
              </div>
            </div>
          </form>
        </DrawerShell>
      )}

      {/* How It Works Modal */}
      <HowItWorksModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="How the Claim Scrubbing Rules Engine Works"
        summary="A deterministic, priority-ordered validation pipeline verifies encounters against NCCI edits, CMS guidelines, and payer-specific policies before transmission."
        bullets={[
          "Sequential Evaluation: Rules execute in strict priority order; earlier failures can halt downstream validation or accumulate into scrub packets.",
          "Hard Blocks vs Human Warnings: Hard blocks completely prevent claim submission until corrected; warnings require a biller confirmation before submission.",
          "Custom Rule Support: Clinic administrators can establish facility-specific rules (e.g., mandatory telehealth modifier -95, state-specific diagnostic requirements).",
          "Toggle Activation: Instantly enable or disable individual rules without modifying core application code.",
        ]}
      />
    </div>
  );
}
