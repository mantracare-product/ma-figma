import React, { useState } from "react";
import { useRcm } from "../../context/RcmContext";
import { Encounter } from "../../types/rcmTypes";
import EncounterDetailDrawer from "../../components/rcm/EncounterDetailDrawer";
import PageHeader from "../../components/layout/PageHeader";
import { HowItWorksModal, HowItWorksButton } from "../../components/help/HowItWorksModal";
import { Clock, CheckCircle2, Search, AlertCircle, Stethoscope, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router";

export default function PendingDocsWorklist() {
  const navigate = useNavigate();
  const { encounters, lockEncounterDocumentation } = useRcm();
  const [selectedEncounter, setSelectedEncounter] = useState<Encounter | null>(null);
  const [search, setSearch] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  const pendingEncounters = encounters
    .filter((e) => e.status === "pending_documentation")
    .filter(
      (e) =>
        e.clientName.toLowerCase().includes(search.toLowerCase()) ||
        e.providerName.toLowerCase().includes(search.toLowerCase()) ||
        e.id.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => (b.daysWaitingDocs || 0) - (a.daysWaitingDocs || 0));

  return (
    <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* Page Header */}
      <PageHeader
        title="Pending Documentation Worklist"
        subtitle="Completed visits awaiting clinician signature or manual verification before claim generation"
        action={<HowItWorksButton onClick={() => setShowHelp(true)} />}
      />

      {/* Info Callout */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 shadow-2xs">
        <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-950 space-y-1">
          <h4 className="font-bold">Zero Silent Unbilled Encounters</h4>
          <p className="text-amber-900/80 leading-relaxed">
            Claims are never silently blocked. Completed appointments without signed documentation stay in this prioritized worklist until clinicians sign the chart note or billing staff executes a manual override.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="px-5 py-3">Encounter ID</th>
                <th className="px-5 py-3">Patient</th>
                <th className="px-5 py-3">Clinician</th>
                <th className="px-5 py-3">Service Date</th>
                <th className="px-5 py-3 text-right">Days Waiting</th>
                <th className="px-5 py-3">Reason / Chart Note</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {pendingEncounters.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    All completed visits have locked documentation and ready claims!
                  </td>
                </tr>
              ) : (
                pendingEncounters.map((enc) => (
                  <tr
                    key={enc.id}
                    onClick={() => setSelectedEncounter(enc)}
                    className="hover:bg-slate-50/60 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3 font-mono font-bold text-blue-600">{enc.id}</td>
                    <td className="px-5 py-3">
                      <div className="font-bold text-slate-900">{enc.clientName}</div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/clients/${enc.clientId}`);
                        }}
                        className="text-[10px] text-blue-600 hover:underline inline-flex items-center gap-0.5"
                      >
                        {enc.clientId} <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </td>
                    <td className="px-5 py-3 text-slate-700">{enc.providerName}</td>
                    <td className="px-5 py-3 text-slate-600 font-mono">{enc.serviceDate}</td>
                    <td className="px-5 py-3 text-right font-mono font-bold tabular-nums">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] ${
                          (enc.daysWaitingDocs || 0) >= 3
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {enc.daysWaitingDocs || 0} days
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600 text-[11px] max-w-xs">
                      {enc.notes || "Awaiting clinician signature lock"}
                    </td>
                    <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => lockEncounterDocumentation(enc.id, "manual")}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all"
                      >
                        Mark Docs Complete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EncounterDetailDrawer
        encounter={selectedEncounter}
        isOpen={!!selectedEncounter}
        onClose={() => setSelectedEncounter(null)}
      />

      <HowItWorksModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="How the Documentation Gate Works"
        summary="Clinical encounters must have locked, signed documentation before claim packages can be generated and submitted to clearinghouses."
        bullets={[
          "Zero Silent Drops: Visits are never forgotten; pending encounters remain visible in this queue until signed.",
          "Aging Alerts: Encounters pending documentation for over 3 days are elevated with amber/red urgency badges.",
          "Manual Override: Billing supervisors can unlock encounters or mark documentation complete with an audit log record.",
        ]}
      />
    </div>
  );
}
