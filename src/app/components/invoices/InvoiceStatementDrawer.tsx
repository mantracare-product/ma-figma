import { useState } from "react";
import { toast } from "sonner";
import { createPaymentPlan, getInvoiceStatement } from "../../../lib/invoiceFromClaim";

const inputCls = "px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white";
const btnCls = "px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50";
const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Statement for one invoice (insurance paid, adjustments, patient responsibility) and a simple payment plan. */
export default function InvoiceStatementDrawer({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
  const [tick, setTick] = useState(0);
  const [count, setCount] = useState(3);
  const [first, setFirst] = useState(() => new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
  void tick;
  const s = getInvoiceStatement(invoiceId);
  if (!s) return null;
  return (
    <div className="fixed inset-0 z-[900] flex justify-end bg-black/30" onClick={onClose} data-testid="invoice-statement-drawer">
      <div className="w-full max-w-md bg-white h-full overflow-y-auto p-5 space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Statement · {invoiceId}</h3>
          <button className={btnCls} onClick={onClose}>Close</button>
        </div>
        {s.claimNumber && <p className="text-xs text-slate-500">Claim {s.claimNumber}</p>}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-slate-500">Total</dt><dd className="text-right">{fmt(s.total)}</dd>
          <dt className="text-slate-500">Insurance paid</dt><dd className="text-right">{fmt(s.insurancePaid)}</dd>
          <dt className="text-slate-500">Adjustments</dt><dd className="text-right">{fmt(s.adjustments)}</dd>
          <dt className="text-slate-500">Patient responsibility</dt><dd className="text-right">{fmt(s.patientResponsibility)}</dd>
          <dt className="text-slate-500">Paid by patient</dt><dd className="text-right">{fmt(s.amountPaid)}</dd>
          <dt className="font-semibold">Balance</dt><dd className="text-right font-semibold">{fmt(s.balance)}</dd>
        </dl>
        {s.paymentLink && <p className="text-xs break-all text-blue-700">{s.paymentLink}</p>}

        <div className="rounded-xl border border-slate-200 p-3 space-y-2">
          <div className="text-sm font-semibold">Payment plan</div>
          {s.plan.length > 0 ? (
            <ul className="text-xs space-y-1">
              {s.plan.map((p, i) => (
                <li key={i} className="flex justify-between"><span>{p.dueDate}</span><span>{fmt(p.amount)} · {p.status}</span></li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-2">
              <input className={inputCls + " w-16"} type="number" min={1} value={count} onChange={(e) => setCount(Math.max(1, Number(e.target.value)))} aria-label="Installments" />
              <span className="text-xs">installments from</span>
              <input className={inputCls} type="date" value={first} onChange={(e) => setFirst(e.target.value)} />
              <button
                className={btnCls}
                disabled={s.balance <= 0}
                onClick={() => {
                  try { createPaymentPlan(invoiceId, { installments: count, firstDueDate: first }); setTick((t) => t + 1); toast.success("Payment plan created"); } catch (e: any) { toast.error(String(e?.message || e)); }
                }}
              >
                Create plan
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
