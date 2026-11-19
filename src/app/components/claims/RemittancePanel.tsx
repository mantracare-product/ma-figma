import React, { useMemo } from "react";
import type { Claim, ClaimRemittanceRecord, ClaimRemittanceServiceLine } from "../../../lib/claimsStore";
import { erasStore, type Era, type EraLine } from "../../../lib/eraStore";
import { CARC, RARC } from "../../../lib/denialCodes";
import { TableComponent, type TableColumn } from "../ui/TableComponent";
import { DollarSign, FileText, CheckCircle2, AlertCircle, Clock } from "lucide-react";

export interface RemittancePanelProps {
  claim?: Claim | null;
  onOpenEra?: (eraId: string) => void;
}

const formatCurrency = (val: number | undefined): string => {
  if (val === undefined || isNaN(val)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);
};

export const RemittancePanel: React.FC<RemittancePanelProps> = ({ claim, onOpenEra }) => {
  // 1. Gather all remittances from stored remittances, matched ERAs, or posted payments
  const blocks = useMemo<ClaimRemittanceRecord[]>(() => {
    if (!claim) return [];

    // Priority 1: Direct remittances stored on the claim
    if (claim.remittances && claim.remittances.length > 0) {
      return claim.remittances;
    }

    // Priority 2: Look up matched lines in erasStore
    const allEras: Era[] = erasStore.get();
    const matchedBlocks: ClaimRemittanceRecord[] = [];

    for (const era of allEras) {
      const matchedLines = (era.lines || []).filter(
        (l: EraLine) =>
          l.matchedClaimId === claim.id ||
          l.claimNumber === claim.claimNumber ||
          l.claimNumber === claim.id ||
          (claim.clearinghouseTrackingId && l.claimNumber === claim.clearinghouseTrackingId) ||
          (claim.payerClaimNumber && l.payerClaimNumber === claim.payerClaimNumber)
      );

      if (matchedLines.length > 0) {
        for (const line of matchedLines) {
          const co = line.adjustments
            .filter((a) => a.group === "CO" && ["45", "253"].includes(a.carc))
            .reduce((s, a) => s + a.amount, 0);

          const allowed = line.paid + co + (line.patientResponsibility || 0);
          const adjustmentsTotal = line.adjustments.reduce((s, a) => s + a.amount, 0);

          const remLine: ClaimRemittanceServiceLine = {
            id: line.id,
            cptCode: claim.lines?.[0]?.cptCode || "99214",
            serviceName: claim.lines?.[0]?.description || "Office Visit",
            billed: line.charged,
            allowed,
            paid: line.paid,
            patientResponsibility: line.patientResponsibility,
            adjustments: line.adjustments.map((a) => ({
              group: a.group,
              carc: a.carc,
              rarc: a.rarc,
              amount: a.amount,
              description: CARC[a.carc]?.text || `Adjustment code ${a.carc}`,
            })),
            rarc: line.adjustments.find((a) => a.rarc)?.rarc,
            status: line.status || "posted",
          };

          matchedBlocks.push({
            id: `rem-${era.id}-${line.id}`,
            eraId: era.id,
            traceNumber: era.traceNumber,
            checkNumber: era.traceNumber,
            paymentDate: era.receivedAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
            payerName: claim.payer?.name || "Insurance Payer",
            status: line.paid > 0 ? (line.charged - line.paid <= 0.01 ? "Paid" : "Partially Paid") : "Denied",
            billed: line.charged,
            allowed,
            paid: line.paid,
            patientResponsibility: line.patientResponsibility || 0,
            adjustments: adjustmentsTotal,
            lines: [remLine],
          });
        }
      }
    }

    if (matchedBlocks.length > 0) {
      return matchedBlocks;
    }

    // Priority 3: Fallback from claim.payments
    if (claim.payments && claim.payments.length > 0) {
      return claim.payments.map((p, idx) => ({
        id: p.id || `pay-${idx}`,
        eraId: p.eraId,
        traceNumber: p.traceNumber,
        checkNumber: p.traceNumber,
        paymentDate: p.date,
        payerName: claim.payer?.name || "Insurance Payer",
        status: "Posted",
        billed: claim.totalCharge || p.amount,
        allowed: claim.totalCharge || p.amount,
        paid: p.amount,
        patientResponsibility: claim.patientResponsibility || 0,
        adjustments: claim.contractualAdjustment || 0,
        lines: (claim.lines || []).map((l, lIdx) => ({
          id: `line-${lIdx}`,
          cptCode: l.cptCode,
          serviceName: l.description,
          billed: l.chargeAmount || 0,
          allowed: l.chargeAmount || 0,
          paid: p.amount / Math.max(1, claim.lines.length),
          patientResponsibility: 0,
          adjustments: [],
          status: "posted",
        })),
      }));
    }

    return [];
  }, [claim]);

  if (!claim || blocks.length === 0) {
    return (
      <div className="py-16 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <FileText className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-700">No remittance received yet</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Electronic Remittance Advice (ERA) and 835 payment notices matched to this claim will appear here automatically.
        </p>
      </div>
    );
  }

  const columns: TableColumn<ClaimRemittanceServiceLine>[] = [
    {
      key: "service",
      header: "Service / CPT",
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900 text-xs">
            {row.cptCode ? <span className="font-mono text-blue-600 mr-1.5">{row.cptCode}</span> : null}
            {row.serviceName || "Service"}
          </div>
        </div>
      ),
    },
    {
      key: "billed",
      header: "Billed",
      align: "right",
      render: (row) => <span className="text-xs font-medium text-slate-700">{formatCurrency(row.billed)}</span>,
    },
    {
      key: "allowed",
      header: "Allowed",
      align: "right",
      render: (row) => <span className="text-xs font-medium text-slate-700">{formatCurrency(row.allowed)}</span>,
    },
    {
      key: "paid",
      header: "Paid",
      align: "right",
      render: (row) => <span className="text-xs font-semibold text-emerald-600">{formatCurrency(row.paid)}</span>,
    },
    {
      key: "patientResponsibility",
      header: "Patient Resp.",
      align: "right",
      render: (row) => (
        <span className="text-xs font-medium text-slate-700">{formatCurrency(row.patientResponsibility || 0)}</span>
      ),
    },
    {
      key: "adjustments",
      header: "Adjustments (CARC / Meaning)",
      render: (row) => {
        if (!row.adjustments || row.adjustments.length === 0) {
          return <span className="text-xs text-slate-400">—</span>;
        }
        return (
          <div className="space-y-1 py-0.5">
            {row.adjustments.map((adj, i) => (
              <div key={i} className="text-[11px] leading-tight flex items-start gap-1">
                <span className="inline-block px-1 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-bold text-[10px] shrink-0">
                  {adj.group}-{adj.carc}
                </span>
                <span className="text-slate-600 truncate max-w-[200px]" title={adj.description}>
                  {adj.description || "Adjustment"}:
                </span>
                <span className="font-semibold text-slate-800 shrink-0">{formatCurrency(adj.amount)}</span>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      key: "rarc",
      header: "RARC",
      render: (row) =>
        row.rarc ? (
          <span
            className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200"
            title={RARC[row.rarc] || row.rarc}
          >
            {row.rarc}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const isPaid = row.paid > 0;
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
              isPaid ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}
          >
            {row.status || (isPaid ? "Paid" : "Denied")}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {blocks.map((block) => (
        <div key={block.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          {/* Header */}
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shadow-2xs">
                ERA
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900 font-mono">
                    {block.traceNumber || block.checkNumber || `ERA-${block.id}`}
                  </h4>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                      block.status.toLowerCase().includes("paid")
                        ? "bg-emerald-100 text-emerald-800"
                        : block.status.toLowerCase().includes("denied")
                        ? "bg-rose-100 text-rose-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {block.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                  <span>Payer: <strong className="text-slate-700">{block.payerName || "Payer"}</strong></span>
                  <span>•</span>
                  <span>Date: <strong className="text-slate-700">{block.paymentDate}</strong></span>
                </div>
              </div>
            </div>

            {onOpenEra && block.eraId && (
              <button
                type="button"
                onClick={() => onOpenEra(block.eraId!)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              >
                Open ERA
              </button>
            )}
          </div>

          {/* Totals Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-slate-100 border-b border-slate-200 bg-white text-center py-2.5">
            <div className="px-3 py-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Billed</div>
              <div className="text-xs font-semibold text-slate-800 mt-0.5">{formatCurrency(block.billed)}</div>
            </div>
            <div className="px-3 py-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Allowed</div>
              <div className="text-xs font-semibold text-slate-800 mt-0.5">{formatCurrency(block.allowed)}</div>
            </div>
            <div className="px-3 py-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paid</div>
              <div className="text-xs font-bold text-emerald-600 mt-0.5">{formatCurrency(block.paid)}</div>
            </div>
            <div className="px-3 py-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patient Resp.</div>
              <div className="text-xs font-semibold text-amber-700 mt-0.5">{formatCurrency(block.patientResponsibility)}</div>
            </div>
            <div className="px-3 py-1 col-span-2 sm:col-span-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Adjustments</div>
              <div className="text-xs font-semibold text-slate-800 mt-0.5">{formatCurrency(block.adjustments)}</div>
            </div>
          </div>

          {/* Service Line Details with Shared TableComponent */}
          <div className="p-3">
            <TableComponent<ClaimRemittanceServiceLine>
              data={block.lines || []}
              columns={columns}
              emptyMessage="No service lines on this remittance."
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default RemittancePanel;
