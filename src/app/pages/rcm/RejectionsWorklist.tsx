import React, { useState, useMemo } from "react";
import { useRcm } from "../../context/RcmContext";
import { Claim } from "../../types/rcmTypes";
import ClaimDetailDrawer from "../../components/rcm/ClaimDetailDrawer";
import PageHeader from "../../components/layout/PageHeader";
import { HowItWorksModal, HowItWorksButton } from "../../components/help/HowItWorksModal";
import {
  XCircle,
  AlertTriangle,
  Clock,
  RotateCcw,
  Search,
  ShieldAlert,
  Server,
  Building,
  ChevronDown,
  ChevronUp,
  Layers,
  DollarSign,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router";

interface RejectionCluster {
  reason: string;
  attribution: "site_action_required" | "platform_responsibility";
  claims: Claim[];
  totalAmount: number;
}

export default function RejectionsWorklist() {
  const navigate = useNavigate();
  const { claims, resubmitClaim } = useRcm();
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [search, setSearch] = useState("");
  const [attributionFilter, setAttributionFilter] = useState<"all" | "site" | "platform">("all");
  const [collapsedClusters, setCollapsedClusters] = useState<Record<string, boolean>>({});
  const [showHelp, setShowHelp] = useState(false);

  // All rejected claims
  const rejections = useMemo(() => {
    return claims.filter((c) => {
      if (c.status !== "rejected") return false;
      const matchesSearch =
        c.id.toLowerCase().includes(search.toLowerCase()) ||
        c.clientName.toLowerCase().includes(search.toLowerCase()) ||
        c.payerName.toLowerCase().includes(search.toLowerCase()) ||
        (c.rejectionReason && c.rejectionReason.toLowerCase().includes(search.toLowerCase()));

      if (!matchesSearch) return false;
      if (attributionFilter === "site") return c.faultAttribution !== "platform_responsibility";
      if (attributionFilter === "platform") return c.faultAttribution === "platform_responsibility";
      return true;
    });
  }, [claims, search, attributionFilter]);

  // Group rejections by rejection reason
  const clusters = useMemo(() => {
    const map = new Map<string, RejectionCluster>();
    rejections.forEach((claim) => {
      const reasonKey = claim.rejectionReason || "Unspecified Clearinghouse Syntax Error";
      const attribution =
        claim.faultAttribution === "platform_responsibility"
          ? "platform_responsibility"
          : "site_action_required";

      if (!map.has(reasonKey)) {
        map.set(reasonKey, {
          reason: reasonKey,
          attribution,
          claims: [],
          totalAmount: 0,
        });
      }
      const group = map.get(reasonKey)!;
      group.claims.push(claim);
      group.totalAmount += claim.billedAmount;
    });
    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [rejections]);

  const totalAtRisk = rejections.reduce((sum, c) => sum + c.billedAmount, 0);
  const siteCount = rejections.filter((c) => c.faultAttribution !== "platform_responsibility").length;
  const platformCount = rejections.filter((c) => c.faultAttribution === "platform_responsibility").length;

  const toggleCollapse = (reason: string) => {
    setCollapsedClusters((prev) => ({
      ...prev,
      [reason]: !prev[reason],
    }));
  };

  return (
    <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* Page Header */}
      <PageHeader
        title="Technical Rejections Worklist"
        subtitle="Pre-adjudication clearinghouse 277CA drops clustered by root-cause error and attributed by accountability"
        action={<HowItWorksButton onClick={() => setShowHelp(true)} />}
      />

      {/* Explanation Banner */}
      <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl flex items-start gap-3 shadow-2xs">
        <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-rose-950 space-y-1">
          <h4 className="font-bold">Rejections Never Reached Payer Adjudication</h4>
          <p className="text-rose-900/80 leading-relaxed">
            Unlike 835 claim denials, rejected claims are completely invisible to insurance payers. Timely filing clocks are actively ticking without any payer receipt protection until re-filed.
          </p>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Dollars Blocked
          </span>
          <span className="text-2xl font-bold font-mono text-rose-700 mt-1 block">
            ${totalAtRisk.toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Across {rejections.length} dropped claims
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Site Action Required (Clinic Staff)
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-amber-700">
              {siteCount}
            </span>
            <span className="text-xs text-amber-600 font-semibold">Clinic Demographic/NPI Fix</span>
          </div>
          <span className="text-[10px] text-slate-500">Requires front-desk or provider update</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Platform Responsibility (Internal Ops)
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-purple-700">
              {platformCount}
            </span>
            <span className="text-xs text-purple-600 font-semibold">EDI Syntax / Clearinghouse Ticket</span>
          </div>
          <span className="text-[10px] text-slate-500">MantraCare SLA automated resolution</span>
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
            placeholder="Search by Claim ID, patient, payer, or rejection reason..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          {[
            { id: "all", label: "All Rejections" },
            { id: "site", label: `Site Action (${siteCount})` },
            { id: "platform", label: `Platform Ops (${platformCount})` },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setAttributionFilter(pill.id as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                attributionFilter === pill.id
                  ? "bg-slate-900 text-white font-semibold shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clustered Rejection Accordions */}
      <div className="space-y-4">
        {clusters.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
            No technical rejections found matching your search.
          </div>
        ) : (
          clusters.map((cluster) => {
            const isCollapsed = !!collapsedClusters[cluster.reason];
            const isPlatform = cluster.attribution === "platform_responsibility";

            return (
              <div
                key={cluster.reason}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all"
              >
                {/* Cluster Header */}
                <div
                  onClick={() => toggleCollapse(cluster.reason)}
                  className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                    isPlatform ? "hover:bg-purple-50/40 bg-purple-50/20" : "hover:bg-amber-50/40 bg-amber-50/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isPlatform ? "bg-purple-100 text-purple-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {isPlatform ? <Server className="w-4 h-4" /> : <Building className="w-4 h-4" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-slate-900 leading-tight">
                          {cluster.reason}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase ${
                            isPlatform
                              ? "bg-purple-100 text-purple-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {isPlatform ? "Platform Responsibility" : "Site Action Required"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Clearinghouse 277CA Error • Affecting {cluster.claims.length} claims
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <span className="text-xs font-bold font-mono text-slate-900 tabular-nums">
                        ${cluster.totalAmount.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {cluster.claims.length} claims
                      </span>
                    </div>

                    <button
                      type="button"
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                    >
                      {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Collapsible Claims Table */}
                {!isCollapsed && (
                  <div className="border-t border-slate-100 overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] bg-slate-50/50">
                          <th className="px-5 py-2.5">Claim ID</th>
                          <th className="px-5 py-2.5">Patient</th>
                          <th className="px-5 py-2.5">Payer</th>
                          <th className="px-5 py-2.5">DOS</th>
                          <th className="px-5 py-2.5 text-right">Billed Amount</th>
                          <th className="px-5 py-2.5 text-right">Timely Filing</th>
                          <th className="px-5 py-2.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {cluster.claims.map((claim) => (
                          <tr
                            key={claim.id}
                            onClick={() => setSelectedClaim(claim)}
                            className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                          >
                            <td className="px-5 py-3 font-mono font-bold text-blue-600">
                              {claim.id}
                            </td>
                            <td className="px-5 py-3">
                              <div className="font-bold text-slate-900">{claim.clientName}</div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/clients/${claim.clientId}`);
                                }}
                                className="text-[10px] text-blue-600 hover:underline inline-flex items-center gap-0.5"
                              >
                                {claim.clientId} <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            </td>
                            <td className="px-5 py-3 text-slate-700">{claim.payerName}</td>
                            <td className="px-5 py-3 font-mono text-slate-600">{claim.serviceDate}</td>
                            <td className="px-5 py-3 text-right font-bold font-mono text-slate-900 tabular-nums">
                              ${claim.billedAmount.toFixed(2)}
                            </td>
                            <td className="px-5 py-3 text-right font-mono font-bold text-rose-600 tabular-nums">
                              {claim.timelyDaysRemaining}d
                            </td>
                            <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => resubmitClaim(claim.id)}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                              >
                                <RotateCcw className="w-3 h-3" /> Resubmit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Claim Detail Drawer */}
      <ClaimDetailDrawer
        claim={selectedClaim}
        isOpen={!!selectedClaim}
        onClose={() => setSelectedClaim(null)}
      />

      {/* How it Works Modal */}
      <HowItWorksModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="How Technical Rejections Work"
        summary="Technical rejections occur at the clearinghouse level via EDI 277CA transactions before a claim ever reaches the insurance payer."
        bullets={[
          "Pre-Adjudication Drops: Because rejections never reached the payer, no timely-filing extension applies. Immediate correction is essential.",
          "Root-Cause Clustering: Rejections are clustered by specific clearinghouse error codes so systemic errors can be fixed across multiple claims simultaneously.",
          "Accountability Attribution: Claims are automatically classified into Site Action Required (missing patient ID, invalid provider taxonomy) vs Platform Responsibility (EDI syntax, gateway timeouts).",
          "One-Click Resubmission: After updating client demographics or clinic NPIs, claims can be instantly re-queued for clearinghouse transmission.",
        ]}
      />
    </div>
  );
}
