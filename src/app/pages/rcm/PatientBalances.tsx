import React, { useState } from "react";
import { useRcm } from "../../context/RcmContext";
import PageHeader from "../../components/layout/PageHeader";
import { HowItWorksModal, HowItWorksButton } from "../../components/help/HowItWorksModal";
import CreateInvoiceDrawer from "../../components/invoices/CreateInvoiceDrawer";
import { PatientArBalance } from "../../types/rcmTypes";
import {
  DollarSign,
  AlertTriangle,
  Clock,
  Send,
  CheckCircle2,
  Lock,
  Search,
  ExternalLink,
  Shield,
  MoreVertical,
  Link,
  Plus,
  CreditCard,
  Download,
  Calendar,
  X,
  Sparkles,
  Trash2,
  FileCheck,
} from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

export default function PatientBalances() {
  const navigate = useNavigate();
  const {
    patientBalances,
    generatePatientStatement,
    cancelPatientBalance,
    writeOffPatientBalance,
    batchChargeSavedCards,
  } = useRcm();

  const [search, setSearch] = useState("");
  const [agingFilter, setAgingFilter] = useState<string>("all");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Misc Charge Drawer
  const [miscChargeClientId, setMiscChargeClientId] = useState<string | null>(null);

  // Write-Off Modal
  const [writeOffBalance, setWriteOffBalance] = useState<PatientArBalance | null>(null);
  const [writeOffReason, setWriteOffReason] = useState("Administrative Adjustment");

  // Payment Plan Modal
  const [paymentPlanBalance, setPaymentPlanBalance] = useState<PatientArBalance | null>(null);
  const [planMonths, setPlanMonths] = useState(3);

  // Batch Charge Saved Cards Modal
  const [showBatchChargeModal, setShowBatchChargeModal] = useState(false);
  const [batchCeiling, setBatchCeiling] = useState(250);

  const filtered = patientBalances.filter((b) => {
    const matchesSearch =
      b.clientName.toLowerCase().includes(search.toLowerCase()) ||
      b.primaryPayer.toLowerCase().includes(search.toLowerCase()) ||
      b.clientId.toLowerCase().includes(search.toLowerCase());
    const matchesAging = agingFilter === "all" ? true : b.agingBucket === agingFilter;
    return matchesSearch && matchesAging;
  });

  const totalInvoiceable = patientBalances.reduce((sum, b) => sum + b.invoiceableBalance, 0);
  const totalBlocked = patientBalances.reduce((sum, b) => sum + b.nonInvoiceableBalance, 0);

  const handleGeneratePayLink = (balance: PatientArBalance) => {
    const url = `https://pay.mantracare.com/pr/${balance.clientId}?balance=${balance.invoiceableBalance.toFixed(2)}`;
    navigator.clipboard?.writeText(url);
    toast.success(`Copied payment link for ${balance.clientName} to clipboard!`);
    setActiveMenuId(null);
  };

  const handleCancelBalance = (balance: PatientArBalance) => {
    const result = cancelPatientBalance(balance.id);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
    setActiveMenuId(null);
  };

  const handleConfirmWriteOff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!writeOffBalance) return;
    const result = writeOffPatientBalance(writeOffBalance.id);
    if (result.success) {
      toast.success(`Balance written off (${writeOffReason}) for ${writeOffBalance.clientName}`);
    } else {
      toast.error(result.message);
    }
    setWriteOffBalance(null);
  };

  const handleConfirmPaymentPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentPlanBalance) return;
    const monthlyAmt = (paymentPlanBalance.totalBalance / planMonths).toFixed(2);
    toast.success(
      `Configured ${planMonths}-month payment plan for ${paymentPlanBalance.clientName} at $${monthlyAmt}/month`
    );
    setPaymentPlanBalance(null);
  };

  const handleExecuteBatchCharge = () => {
    const eligibleClientIds = patientBalances
      .filter((b) => b.invoiceableBalance > 0 && b.invoiceableBalance <= batchCeiling)
      .map((b) => b.clientId);

    const res = batchChargeSavedCards(eligibleClientIds, 0, batchCeiling);
    toast.success(`Processed ${res.count} automated card charges totaling $${res.total.toFixed(2)}`);
    setShowBatchChargeModal(false);
  };

  const handleDownloadReport = () => {
    const csvRows = [
      ["Patient ID", "Patient Name", "Primary Payer", "Source", "Invoiceable PR", "Non-Invoiceable", "Total Balance", "Aging Bucket", "Statements Sent"],
      ...patientBalances.map((b) => [
        b.clientId,
        `"${b.clientName}"`,
        `"${b.primaryPayer}"`,
        b.source || "remittance",
        b.invoiceableBalance.toFixed(2),
        b.nonInvoiceableBalance.toFixed(2),
        b.totalBalance.toFixed(2),
        b.agingBucket,
        b.statementCount,
      ]),
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `patient_ar_aging_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Patient A/R Aging report downloaded!");
  };

  return (
    <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* Page Header */}
      <PageHeader
        title="Patient Balances & A/R Aging"
        subtitle="Post-adjudication patient responsibility balances governed by PR sequencing locks and automated payment workflows"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBatchChargeModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" /> Charge Saved Cards
            </button>
            <button
              type="button"
              onClick={handleDownloadReport}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Download Report
            </button>
            <HowItWorksButton onClick={() => setShowHelp(true)} />
          </div>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Invoiceable PR Balance
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
              ${totalInvoiceable.toFixed(2)}
            </span>
            <span className="text-xs text-emerald-600 font-semibold">Fully Adjudicated</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Ready for patient statement dispatch</p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Blocked from Statement (Denial Gate)
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-700 tabular-nums">
              ${totalBlocked.toFixed(2)}
            </span>
            <span className="text-xs text-amber-600 font-semibold">Sequencing Lock</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Pending denial appeal or write-off resolution</p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Total Patient A/R
          </span>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              ${(totalInvoiceable + totalBlocked).toFixed(2)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Across 7 standard aging intervals</p>
        </div>
      </div>

      {/* PR Sequencing Rule Alert Banner */}
      <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-start gap-3 shadow-2xs">
        <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-950 space-y-1">
          <h4 className="font-bold">Sequencing Rule Enforced</h4>
          <p className="text-blue-900/80 leading-relaxed">
            Statements are only sent once all active insurance denials for an encounter are resolved. Patients are never billed prematurely for charges that insurance might still pay under appeal. Remittance balances cannot be cancelled — only written off.
          </p>
        </div>
      </div>

      {/* Toolbar: Search + 7 Aging Buckets */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient ID, name, or primary payer..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* 7 Aging Buckets */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          {[
            { id: "all", label: "All" },
            { id: "0-30", label: "0-30d" },
            { id: "31-60", label: "31-60d" },
            { id: "61-90", label: "61-90d" },
            { id: "91-120", label: "91-120d" },
            { id: "121-180", label: "121-180d (TF Warning)" },
            { id: "181-365", label: "181-365d" },
            { id: "366+", label: "366d+" },
          ].map((bucket) => (
            <button
              key={bucket.id}
              type="button"
              onClick={() => setAgingFilter(bucket.id)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium whitespace-nowrap transition-all ${
                agingFilter === bucket.id
                  ? "bg-blue-600 text-white font-bold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              {bucket.label}
            </button>
          ))}
        </div>
      </div>

      {/* Balances Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="px-5 py-3">Patient</th>
                <th className="px-5 py-3">Payer & Source</th>
                <th className="px-5 py-3 text-right">Invoiceable PR</th>
                <th className="px-5 py-3 text-right">Non-Invoiceable</th>
                <th className="px-5 py-3 text-right">Total Balance</th>
                <th className="px-5 py-3 text-center">Aging Bucket</th>
                <th className="px-5 py-3 text-center">Statements Sent</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400 text-xs">
                    No patient balances found matching your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-bold text-slate-900">{b.clientName}</div>
                      <button
                        type="button"
                        onClick={() => navigate(`/clients/${b.clientId}`)}
                        className="text-[10px] text-blue-600 hover:underline inline-flex items-center gap-0.5"
                      >
                        {b.clientId} <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-slate-900 font-medium">{b.primaryPayer}</div>
                      <span
                        className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          b.source === "manual"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {b.source === "manual" ? "Manual Invoice" : "ERA 835 Remittance"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-emerald-700 tabular-nums">
                      ${b.invoiceableBalance.toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums">
                      {b.nonInvoiceableBalance > 0 ? (
                        <span className="text-amber-700 font-semibold inline-flex items-center gap-1">
                          <Lock className="w-3 h-3" /> ${b.nonInvoiceableBalance.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-400">$0.00</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                      ${b.totalBalance.toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                          b.agingBucket === "121-180" || b.agingBucket === "181-365" || b.agingBucket === "366+"
                            ? "bg-rose-100 text-rose-800"
                            : b.agingBucket === "61-90" || b.agingBucket === "91-120"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {b.agingBucket}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center font-mono text-slate-600">
                      {b.statementCount} sent
                      {b.lastStatementDate && (
                        <span className="block text-[10px] text-slate-400">{b.lastStatementDate}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right relative">
                      <div className="flex items-center justify-end gap-1.5">
                        {b.nonInvoiceableBalance > 0 ? (
                          <span
                            className="px-2.5 py-1 text-[11px] text-slate-400 font-medium inline-flex items-center gap-1"
                            title="Blocked by active denial appeal"
                          >
                            <Lock className="w-3 h-3" /> Gated
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => generatePatientStatement(b.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all"
                          >
                            <Send className="w-3 h-3" /> Statement
                          </button>
                        )}

                        {/* Actions Dropdown Toggle */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setActiveMenuId(activeMenuId === b.id ? null : b.id)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeMenuId === b.id && (
                            <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-lg w-48 py-1 text-left text-xs animate-in fade-in zoom-in-95">
                              <button
                                type="button"
                                onClick={() => handleGeneratePayLink(b)}
                                className="w-full px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                              >
                                <Link className="w-3.5 h-3.5 text-blue-600" /> Generate Pay Link
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setMiscChargeClientId(b.clientId);
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                              >
                                <Plus className="w-3.5 h-3.5 text-emerald-600" /> Misc Charge
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setPaymentPlanBalance(b);
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                              >
                                <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Set Up Payment Plan
                              </button>

                              <div className="border-t border-slate-100 my-1" />

                              {b.source === "manual" ? (
                                <button
                                  type="button"
                                  onClick={() => handleCancelBalance(b)}
                                  className="w-full px-3 py-2 hover:bg-rose-50 flex items-center gap-2 text-rose-700"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Cancel Balance
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setWriteOffBalance(b);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-3 py-2 hover:bg-rose-50 flex items-center gap-2 text-rose-700"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Write Off Balance
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Misc Charge Drawer */}
      {miscChargeClientId && (
        <CreateInvoiceDrawer
          isOpen={!!miscChargeClientId}
          onClose={() => setMiscChargeClientId(null)}
          preSelectedClientId={miscChargeClientId}
        />
      )}

      {/* Write-Off Reason Modal */}
      {writeOffBalance && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Write Off Patient Responsibility</h3>
              <button
                type="button"
                onClick={() => setWriteOffBalance(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Writing off <strong>${writeOffBalance.totalBalance.toFixed(2)}</strong> for{" "}
              <strong>{writeOffBalance.clientName}</strong>. This adjusts the ledger to zero.
            </p>

            <form onSubmit={handleConfirmWriteOff} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Adjustment Reason *</label>
                <select
                  value={writeOffReason}
                  onChange={(e) => setWriteOffReason(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                >
                  <option value="Administrative Adjustment">Administrative Adjustment</option>
                  <option value="Financial Hardship">Financial Hardship</option>
                  <option value="Bad Debt / Uncollectible">Bad Debt / Uncollectible</option>
                  <option value="Timely Filing Limit Exceeded">Timely Filing Limit Exceeded</option>
                  <option value="Charity Care">Charity Care</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWriteOffBalance(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-2xs"
                >
                  Confirm Write-Off
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Plan Modal */}
      {paymentPlanBalance && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Set Up Payment Plan</h3>
              <button
                type="button"
                onClick={() => setPaymentPlanBalance(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-blue-900 space-y-1">
              <span className="font-bold block">{paymentPlanBalance.clientName}</span>
              <span>Total Outstanding: ${paymentPlanBalance.totalBalance.toFixed(2)}</span>
            </div>

            <form onSubmit={handleConfirmPaymentPlan} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Duration / Installments</label>
                <div className="grid grid-cols-3 gap-2">
                  {[3, 6, 12].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPlanMonths(m)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        planMonths === m
                          ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {m} Months
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <span className="text-slate-600">Monthly Installment:</span>
                <span className="font-mono text-sm font-bold text-slate-900">
                  ${(paymentPlanBalance.totalBalance / planMonths).toFixed(2)} / mo
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentPlanBalance(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-2xs"
                >
                  Activate Payment Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Charge Saved Cards Modal */}
      {showBatchChargeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">Batch Charge Saved Cards</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchChargeModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Automatically charge saved cards on file for fully adjudicated patient responsibilities up to your safety ceiling.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Max Charge Ceiling Per Patient ($)</label>
                <input
                  type="number"
                  min="10"
                  max="5000"
                  value={batchCeiling}
                  onChange={(e) => setBatchCeiling(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-900"
                />
              </div>

              <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                <span className="text-[11px] text-emerald-800 font-medium block">
                  Eligible Patients Identified:
                </span>
                <span className="text-lg font-bold font-mono text-emerald-900">
                  {patientBalances.filter((b) => b.invoiceableBalance > 0 && b.invoiceableBalance <= batchCeiling).length} patients
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBatchChargeModal(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBatchCharge}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-2xs"
              >
                Run Batch Charge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* How it Works Modal */}
      <HowItWorksModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="How Patient Balances & A/R Aging Works"
        summary="MantraAssist RCM calculates post-adjudication patient responsibility balances and enforces PR sequencing rules to prevent billing patients for charges still subject to insurance appeals."
        bullets={[
          "PR Sequencing Rule: Statements are locked for encounters with active or appealed claim denials until insurance resolution is final.",
          "Cancel vs Write-Off: Manual invoices can be cancelled; 835 remittance balances cannot be cancelled — they must be written off with an accounting adjustment reason.",
          "Batch Saved Card Charges: Collect balances on file across multiple clients simultaneously with threshold safety limits.",
          "Aging Intervals: Track aging across 7 standard intervals (0-30, 31-60, 61-90, 91-120, 121-180, 181-365, 366+ days) with timely filing warning thresholds.",
        ]}
      />
    </div>
  );
}
