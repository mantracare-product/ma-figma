import React, { useState } from "react";
import { useRcm } from "../../context/RcmContext";
import PageHeader from "../../components/layout/PageHeader";
import { HowItWorksModal, HowItWorksButton } from "../../components/help/HowItWorksModal";
import DrawerShell from "../../components/ui/DrawerShell";
import { FeeScheduleItem } from "../../types/rcmTypes";
import { DollarSign, Search, Shield, Check, X, Plus, Edit2 } from "lucide-react";
import { toast } from "sonner";

export default function FeeSchedule() {
  const { feeSchedule, addFeeScheduleItem, updateFeeScheduleItem } = useRcm();
  const [search, setSearch] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FeeScheduleItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // New item form
  const [newCpt, setNewCpt] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("Psychotherapy / Behavioral");
  const [newStandardFee, setNewStandardFee] = useState(195);
  const [newMedicareAllowed, setNewMedicareAllowed] = useState(125);
  const [newCommercialAvg, setNewCommercialAvg] = useState(150);
  const [newRequiresPa, setNewRequiresPa] = useState(false);

  const filtered = feeSchedule.filter(
    (item) =>
      item.cptCode.includes(search) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCpt.trim() || !newDesc.trim()) {
      toast.error("Please enter a CPT code and description");
      return;
    }

    addFeeScheduleItem({
      cptCode: newCpt.trim(),
      description: newDesc.trim(),
      category: newCategory,
      standardFee: Number(newStandardFee) || 0,
      medicareAllowed: Number(newMedicareAllowed) || 0,
      commercialExpectedAvg: Number(newCommercialAvg) || 0,
      requiresPriorAuth: newRequiresPa,
    });

    toast.success(`CPT ${newCpt.trim()} added to fee schedule`);
    setIsCreating(false);
    setNewCpt("");
    setNewDesc("");
  };

  const handleUpdateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    updateFeeScheduleItem(selectedItem.id, {
      description: selectedItem.description,
      standardFee: Number(selectedItem.standardFee),
      medicareAllowed: Number(selectedItem.medicareAllowed),
      commercialExpectedAvg: Number(selectedItem.commercialExpectedAvg),
      requiresPriorAuth: selectedItem.requiresPriorAuth,
    });
    toast.success(`Fee schedule for CPT ${selectedItem.cptCode} updated`);
    setSelectedItem(null);
  };

  return (
    <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* Page Header */}
      <PageHeader
        title="Fee Schedule & Allowed Amounts"
        subtitle="Standard practice charge master benchmarked against Medicare allowances and commercial payer expectations"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Fee Item
            </button>
            <HowItWorksButton onClick={() => setShowHelp(true)} />
          </div>
        }
      />

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by CPT code, description, or specialty..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Grid Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="px-5 py-3">CPT Code</th>
                <th className="px-5 py-3">Description</th>
                <th className="px-5 py-3">Specialty / Category</th>
                <th className="px-5 py-3 text-right">Standard Fee</th>
                <th className="px-5 py-3 text-right">Medicare Allowed</th>
                <th className="px-5 py-3 text-right">Commercial Avg</th>
                <th className="px-5 py-3 text-center">Prior Auth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3 font-mono font-bold text-blue-600">{item.cptCode}</td>
                  <td className="px-5 py-3 font-medium text-slate-900 max-w-sm">{item.description}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] text-slate-700">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                    ${item.standardFee.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-slate-600 tabular-nums">
                    ${item.medicareAllowed.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-emerald-700 font-semibold tabular-nums">
                    ${item.commercialExpectedAvg.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {item.requiresPriorAuth ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 font-mono">
                        Required
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Fee Item Drawer */}
      {isCreating && (
        <DrawerShell
          isOpen={isCreating}
          onClose={() => setIsCreating(false)}
          title="Add Fee Schedule Item"
          subtitle="Configure baseline fee amounts and benchmark expectations for a procedure code"
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
                form="new-fee-form"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-2xs"
              >
                Save Item
              </button>
            </div>
          }
        >
          <form id="new-fee-form" onSubmit={handleCreateItem} className="space-y-4 text-xs text-slate-800">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">CPT Procedure Code *</label>
                <input
                  type="text"
                  value={newCpt}
                  onChange={(e) => setNewCpt(e.target.value)}
                  required
                  placeholder="e.g. 90837"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Description *</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                required
                placeholder="e.g. Psychotherapy, 60 minutes with patient"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Standard Fee ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newStandardFee}
                  onChange={(e) => setNewStandardFee(Number(e.target.value))}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Medicare Allowed ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newMedicareAllowed}
                  onChange={(e) => setNewMedicareAllowed(Number(e.target.value))}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Commercial Avg ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newCommercialAvg}
                  onChange={(e) => setNewCommercialAvg(Number(e.target.value))}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newRequiresPa}
                  onChange={(e) => setNewRequiresPa(e.target.checked)}
                  className="rounded text-blue-600 w-4 h-4"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Prior Authorization Required by Standard Payers
                </span>
              </label>
            </div>
          </form>
        </DrawerShell>
      )}

      {/* Edit Selected Fee Item Drawer */}
      {selectedItem && (
        <DrawerShell
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          title={`CPT ${selectedItem.cptCode}`}
          subtitle={selectedItem.description}
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-fee-form"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-2xs"
              >
                Save Changes
              </button>
            </div>
          }
        >
          <form id="edit-fee-form" onSubmit={handleUpdateItem} className="space-y-4 text-xs text-slate-800">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Description</label>
              <input
                type="text"
                value={selectedItem.description}
                onChange={(e) => setSelectedItem({ ...selectedItem, description: e.target.value })}
                required
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Standard Fee ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={selectedItem.standardFee}
                  onChange={(e) => setSelectedItem({ ...selectedItem, standardFee: Number(e.target.value) })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Medicare Allowed ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={selectedItem.medicareAllowed}
                  onChange={(e) => setSelectedItem({ ...selectedItem, medicareAllowed: Number(e.target.value) })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Commercial Avg ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={selectedItem.commercialExpectedAvg}
                  onChange={(e) => setSelectedItem({ ...selectedItem, commercialExpectedAvg: Number(e.target.value) })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedItem.requiresPriorAuth}
                  onChange={(e) => setSelectedItem({ ...selectedItem, requiresPriorAuth: e.target.checked })}
                  className="rounded text-blue-600 w-4 h-4"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Prior Authorization Required by Standard Payers
                </span>
              </label>
            </div>
          </form>
        </DrawerShell>
      )}

      {/* How It Works Modal */}
      <HowItWorksModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="How Fee Schedules & Benchmarks Work"
        summary="A practice chargemaster aligns standard billing rates with geographic Medicare Physician Fee Schedules (PFS) and negotiated commercial payer allowances."
        bullets={[
          "Underpayment Detection: Auto-compares remittance allowed amounts against benchmark rates to catch payer contractual violations.",
          "Prior Auth Flagging: Services requiring pre-authorization automatically trigger warnings during appointment scheduling.",
          "Multi-Tier Allowances: Store Medicare baseline rates alongside commercial averages for accurate patient responsibility estimation.",
        ]}
      />
    </div>
  );
}
