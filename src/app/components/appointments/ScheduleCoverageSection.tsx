import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { defaultPaymentModeFor, getPaymentModeOptions } from "../../../lib/paymentMode";
import { getCoverageOn } from "../../../lib/coveragesStore";
import { getPayer } from "../../../lib/billingSetupStore";
import { isProviderCredentialed } from "../../../lib/credentialingStore";
import { previewEligibility, type EligibilityPreview } from "../../../lib/verifyNow";
import { useCurrentPermissions } from "@/hooks/useCurrentPermissions";

/**
 * Coverage block for the Schedule drawer: the client's primary coverage on the visit date and a "Verify now" that
 * previews the payer answer. Nothing is written from here; booking runs the automation rules, which write results.
 */
export default function ScheduleCoverageSection({
  clientId,
  date,
  serviceId,
  paymentMode,
  onPaymentModeChange,
  providerId,
  providerName,
}: {
  clientId?: string;
  date: string;
  serviceId?: string | number;
  paymentMode?: string;
  onPaymentModeChange?: (mode: string) => void;
  providerId?: string | number;
  providerName?: string;
}) {
  const { hasPermission } = useCurrentPermissions();
  const [preview, setPreview] = useState<EligibilityPreview | null>(null);
  if (!clientId) return null;
  const cov = getCoverageOn(clientId, date, "primary");
  const payer = cov ? getPayer(cov.payerId) : undefined;
  const canVerify = hasPermission("eligibility", "add");
  const effectiveMode = paymentMode || defaultPaymentModeFor(serviceId);
  const modeOptions = getPaymentModeOptions();

  const isCred = cov?.payerId && providerId ? isProviderCredentialed(providerId, cov.payerId, date) : true;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs space-y-2 p-3" data-testid="schedule-coverage-section">
      <div className="text-xs font-semibold text-slate-700 pb-1 border-b border-slate-100">Coverage</div>
      <div className="space-y-2 text-xs">
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

        {cov && providerId && !isCred && (
          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Credentialing Warning:</strong> {providerName || "The selected provider"} is not credentialed with {payer?.name || cov.payerId} on this visit date.
            </span>
          </div>
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
