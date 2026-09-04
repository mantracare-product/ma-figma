import React, { useState } from "react";
import { useRcm } from "../../context/RcmContext";
import PageHeader from "../../components/layout/PageHeader";
import { HowItWorksModal, HowItWorksButton } from "../../components/help/HowItWorksModal";
import DrawerShell from "../../components/ui/DrawerShell";
import { EligibilityCheck } from "../../types/rcmTypes";
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  RefreshCw,
  Search,
  ExternalLink,
  Calendar,
  AlertTriangle,
  User,
  CheckCircle2,
  XCircle,
  FileText,
  DollarSign,
  Clock,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router";

export default function EligibilityWorklist() {
  const navigate = useNavigate();
  const { eligibilityChecks, recheckEligibility } = useRcm();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selectedCheck, setSelectedCheck] = useState<EligibilityCheck | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const filtered = eligibilityChecks.filter((c) => {
    const matchesSearch =
      c.clientName.toLowerCase().includes(search.toLowerCase()) ||
      c.payerName.toLowerCase().includes(search.toLowerCase()) ||
      (c.memberId && c.memberId.toLowerCase().includes(search.toLowerCase()));

    const matchesFilter = filter === "all" ? true : c.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* Page Header with Help Button */}
      <PageHeader
        title="Pre-Visit Eligibility & Benefits Verification"
        subtitle="EDI 270/271 real-time coverage checks, copay calculation, and deductible tracking before appointment check-in"
        action={<HowItWorksButton onClick={() => setShowHelp(true)} />}
      />

      {/* Overview stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-bold text-emerald-950 font-display font-mono">
              {eligibilityChecks.filter((c) => c.status === "active").length}
            </span>
            <p className="text-xs text-emerald-800 font-medium">Verified Active Coverage</p>
          </div>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-bold text-amber-950 font-display font-mono">
              {eligibilityChecks.filter((c) => c.status === "inconclusive").length}
            </span>
            <p className="text-xs text-amber-800 font-medium">Inconclusive (Data Mismatch)</p>
          </div>
        </div>

        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-bold text-rose-950 font-display font-mono">
              {eligibilityChecks.filter((c) => c.status === "inactive" || c.status === "not_covered").length}
            </span>
            <p className="text-xs text-rose-800 font-medium">Inactive or Not Covered</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Patient, Payer, or Member ID..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { id: "all", label: "All Checks" },
            { id: "active", label: "Active" },
            { id: "inconclusive", label: "Inconclusive" },
            { id: "inactive", label: "Inactive" },
            { id: "self_pay", label: "Self-Pay" },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setFilter(pill.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                filter === pill.id
                  ? "bg-blue-600 text-white font-semibold shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="px-5 py-3">Patient</th>
                <th className="px-5 py-3">Payer & Policy</th>
                <th className="px-5 py-3">Appt Date</th>
                <th className="px-5 py-3">Copay / Deductible</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3">Notes / Action Reason</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedCheck(c)}
                  className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3">
                    <div className="font-bold text-slate-900">{c.clientName}</div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/clients/${c.clientId}`);
                      }}
                      className="text-[10px] text-blue-600 hover:underline inline-flex items-center gap-0.5"
                    >
                      {c.clientId} <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-900">{c.payerName}</div>
                    <div className="text-[10px] font-mono text-slate-400">{c.memberId || "Self-Pay Record"}</div>
                  </td>
                  <td className="px-5 py-3 font-mono text-slate-600">{c.appointmentDate}</td>
                  <td className="px-5 py-3 font-mono text-slate-800 tabular-nums">
                    {c.copayAmount !== undefined ? (
                      <div>
                        <span className="text-slate-400">Copay:</span> ${c.copayAmount.toFixed(2)}
                      </div>
                    ) : (
                      "-"
                    )}
                    {c.deductibleRemaining !== undefined && (
                      <div className="text-[10px] text-slate-400">
                        Ded: ${c.deductibleRemaining.toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-mono ${
                        c.status === "active"
                          ? "bg-emerald-100 text-emerald-800"
                          : c.status === "inconclusive"
                          ? "bg-amber-100 text-amber-800"
                          : c.status === "inactive" || c.status === "not_covered"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-indigo-100 text-indigo-800"
                      }`}
                    >
                      {c.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-600 text-[11px] max-w-xs">
                    {c.inconclusiveReason || (c.status === "active" ? "EDI 271 Verified" : "-")}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        recheckEligibility(c.id);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                      title="Re-run EDI 270/271 Check"
                    >
                      <RefreshCw className="w-3 h-3" /> Re-run
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row-Click Detail Drawer using DrawerShell */}
      {selectedCheck && (
        <DrawerShell
          isOpen={!!selectedCheck}
          onClose={() => setSelectedCheck(null)}
          title="Eligibility & Benefits Details"
          subtitle={`EDI 271 Electronic Verification • ${selectedCheck.clientName}`}
          footer={
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => {
                  navigate(`/clients/${selectedCheck.clientId}?tab=billing&editInsurance=true`);
                  setSelectedCheck(null);
                }}
                className="text-xs font-medium text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                Edit Insurance in Profile <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCheck(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    recheckEligibility(selectedCheck.id);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Re-run Verification
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-6 text-slate-800">
            {/* Patient Header Card */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{selectedCheck.clientName}</h3>
                <span className="text-xs text-slate-500 font-mono">ID: {selectedCheck.clientId}</span>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
                  selectedCheck.status === "active"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : selectedCheck.status === "inconclusive"
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : selectedCheck.status === "inactive" || selectedCheck.status === "not_covered"
                    ? "bg-rose-100 text-rose-800 border border-rose-300"
                    : "bg-indigo-100 text-indigo-800 border border-indigo-300"
                }`}
              >
                {selectedCheck.status.toUpperCase().replace("_", " ")}
              </span>
            </div>

            {/* Inconclusive Warning */}
            {selectedCheck.inconclusiveReason && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 space-y-1">
                  <h4 className="font-bold">Verification Note / Mismatch</h4>
                  <p className="leading-relaxed">{selectedCheck.inconclusiveReason}</p>
                </div>
              </div>
            )}

            {/* Insurance Policy Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Policy & Subscriber Information
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">Payer Name</span>
                  <span className="font-semibold text-slate-900">{selectedCheck.payerName}</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">Member / Policy ID</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {selectedCheck.memberId || "N/A"}
                  </span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">Appointment Date</span>
                  <span className="font-semibold text-slate-900">{selectedCheck.appointmentDate}</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">Last Checked</span>
                  <span className="font-mono text-slate-700">{selectedCheck.lastCheckedDate}</span>
                </div>
              </div>
            </div>

            {/* Benefit Accumulators & Financials */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Benefits & Cost Sharing
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                  <span className="text-emerald-800/80 block text-[10px] font-medium">Copayment</span>
                  <span className="text-lg font-bold font-mono text-emerald-900">
                    ${(selectedCheck.copayAmount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl">
                  <span className="text-blue-800/80 block text-[10px] font-medium">Deductible Remaining</span>
                  <span className="text-lg font-bold font-mono text-blue-900">
                    ${(selectedCheck.deductibleRemaining || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* EDI 271 Electronic Data Breakdown */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                EDI 271 Response Envelope
              </h4>
              <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-[11px] space-y-1.5 overflow-x-auto">
                <div className="text-slate-400"># X12 271 Health Care Eligibility Benefit Response</div>
                <div>ISA*00* *00* *ZZ*MANTRA_RCM *01*PAYER_GATEWAY</div>
                <div>EB*1*IND*30*PR*{selectedCheck.copayAmount || 0}***{selectedCheck.deductibleRemaining || 0}~</div>
                <div className="text-emerald-400">REF*EJ*AUTH_VERIFIED_ACTIVE~</div>
                <div className="text-slate-400">SE*14*0001~</div>
              </div>
            </div>
          </div>
        </DrawerShell>
      )}

      {/* How It Works Help Modal */}
      <HowItWorksModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="How Eligibility & Benefits Verification Works"
        summary="Automated real-time 270/271 eligibility inquiries verify client health insurance active status, calculate copays, and track deductible balances before visits."
        bullets={[
          "EDI 270 Inquiry: Dispatched automatically 48 hours prior to scheduled appointments to confirm coverage.",
          "EDI 271 Parsing: Direct response decodes individual service copays (Office Visit 98, Health Benefit Plan 30) and deductible accumulators.",
          "Inconclusive Resolution: Flags demographic mismatches (subscriber DOB, spelling, member ID typo) before the encounter happens.",
          "Pre-Visit Collection: Empower front-desk staff to collect accurate copays and self-pay fees at check-in with zero guesswork.",
        ]}
      />
    </div>
  );
}
