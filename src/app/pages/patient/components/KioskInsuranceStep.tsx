import { useMemo, useState } from "react";
import { appointmentService } from "../../../../lib/appointmentService";
import { getCoverageOn, getCoveragesForClient, saveCoverage } from "../../../../lib/coveragesStore";
import { getPayer } from "../../../../lib/billingSetupStore";
import { readLocalRecordFields } from "../../../../lib/recordWriter";

/**
 * Kiosk check-in: insurance + copay steps (Slice 3, item 3.7). Shows the coverage on file for today's visit, the copay
 * due from the latest (mock) eligibility result, and lets the patient correct the member ID (saved as a coverage update,
 * which re-runs eligibility through the sample rule). Renders nothing when the client has no coverage and no visit.
 */
export default function KioskInsuranceStep({ clientId, clientName }: { clientId: string; clientName: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const [tick, setTick] = useState(0);
  const [memberId, setMemberId] = useState("");
  const [saved, setSaved] = useState(false);

  const appt = useMemo(
    () =>
      appointmentService
        .getAppointments()
        .filter((a) => (a.clientId === clientId || a.clientName === clientName) && a.date === today && a.status !== "cancelled" && a.status !== "completed")[0],
    [clientId, clientName, today, tick]
  );
  const cov = getCoverageOn(clientId, today, "primary");
  if (!cov && !appt) return null;
  const payer = cov ? getPayer(cov.payerId) : undefined;
  const fields = appt ? readLocalRecordFields("appointment", appt.id) : {};
  const copay = fields.elig_copay;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 text-sm" data-testid="kiosk-insurance-step">
      <div className="font-semibold text-slate-900">Insurance</div>
      {cov ? (
        <div className="text-slate-700">
          {payer?.name || cov.payerId} · Member {cov.memberId}
        </div>
      ) : (
        <div className="text-slate-500">No insurance on file. Please see the front desk.</div>
      )}
      {copay !== undefined && copay !== "" && (
        <div className="rounded-xl bg-blue-50 px-3 py-2 text-blue-900">
          Copay due today: <b>{String(copay)}</b> <span className="text-[10px] uppercase text-amber-700">(mock estimate)</span>
        </div>
      )}
      {cov && (
        <div className="flex items-center gap-2">
          <input
            value={memberId}
            onChange={(e) => {
              setMemberId(e.target.value);
              setSaved(false);
            }}
            placeholder="Correct member ID (optional)"
            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm"
          />
          <button
            type="button"
            disabled={!memberId.trim()}
            onClick={() => {
              const current = getCoveragesForClient(clientId).find((c) => c.id === cov.id) || cov;
              saveCoverage({ ...current, memberId: memberId.trim() });
              setSaved(true);
              setMemberId("");
              setTick((t) => t + 1);
            }}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
          >
            Update
          </button>
        </div>
      )}
      {saved && <div className="text-xs text-emerald-700">Thanks, your insurance will be re-checked.</div>}
    </div>
  );
}
