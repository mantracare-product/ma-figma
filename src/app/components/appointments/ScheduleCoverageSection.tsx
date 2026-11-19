import { useState } from "react";
import { defaultPaymentModeFor, getPaymentModeOptions } from "../../../lib/paymentMode";
import { getCoverageOn } from "../../../lib/coveragesStore";
import { getPayer } from "../../../lib/billingSetupStore";
import { previewEligibility, type EligibilityPreview } from "../../../lib/verifyNow";
import { useCurrentPermissions } from "@/hooks/useCurrentPermissions";

/**
 * Coverage block for the Schedule drawer: the client's primary coverage on the visit date and a "Verify now" that
 * previews the payer answer. Nothing is written from here; booking runs the automation rules, which write results.
 */
export default function ScheduleCoverageSection({ clientId, date, serviceId, paymentMode, onPaymentModeChange }: { clientId?: string; date: string; serviceId?: string | number; paymentMode?: string; onPaymentModeChange?: (mode: string) => void }) {
  const { hasPermission } = useCurrentPermissions();
  const [preview, setPreview] = useState<EligibilityPreview | null>(null);
  if (!clientId) return null;
  const cov = getCoverageOn(clientId, date, "primary");
  const payer = cov ? getPayer(cov.payerId) : undefined;
  const canVerify = hasPermission("eligibility", "add");
  const effectiveMode = paymentMode || defaultPaymentModeFor(serviceId);
  const modeOptions = getPaymentModeOptions();

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs" data-testid="schedule-coverage-section">
      <div className="px-3 py-2 text-xs font-semibold text-slate-700 border-b border-slate-100">Coverage</div>
      <div className="p-3 space-y-2 text-xs">
        <div className="flex items-center gap-2" data-testid="schedule-payment-mode">
          <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">Payment mode</label>
          <select value={effectiveMode} onChange={(e) => onPaymentModeChange?.(e.target.value)} className="h-8 text-xs px-2 bg-white border border-[#E2E8F0] rounded-lg outline-none">
            {modeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {!paymentMode && <span className="text-slate-400">default from the service</span>}
        </div>
        {cov ? (
          <div className="text-slate-800">
            {payer?.name || cov.payerId} · Member {cov.memberId}
            {cov.groupNumber ? ` · Group ${cov.groupNumber}` : ""}
          </div>
        ) : (
          <div className="text-slate-500">No coverage on file for this date. Add it in the Insurance section of the client's Overview.</div>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canVerify}
            onClick={() => setPreview(previewEligibility(clientId, date))}
            title={canVerify ? "Ask the payer now" : "You need the eligibility permission"}
            className="px-2.5 py-1 font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
          >
            Verify now
          </button>
          {preview && (
            <span className="text-slate-700">
              {preview.summary}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
