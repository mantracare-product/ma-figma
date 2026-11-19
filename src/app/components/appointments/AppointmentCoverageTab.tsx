import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Appointment } from "../../../lib/appointmentService";
import { readLocalRecordFields } from "../../../lib/recordWriter";
import { verifyAppointmentNow } from "../../../lib/verifyNow";
import { recordAuthDecision } from "../../../lib/authActions";
import { acceptCallResult } from "../../../lib/voiceBenefits";
import { getProcessInstanceById } from "../../../lib/processLogsStore";
import { useCurrentPermissions } from "@/hooks/useCurrentPermissions";
import CoverageChip from "./CoverageChip";
import DraggableOverviewSections, { type OverviewSection } from "../profile/DraggableOverviewSections";
import { ensureRcmFieldSeeds, SEC_APPT_AUTHORIZATION, SEC_APPT_ELIGIBILITY } from "../../../lib/rcmFieldSeeds";

const SECTIONS_KEY = "ma_appt_coverage_sections_v1";
const DEFAULT_SECTIONS: OverviewSection[] = [
  { id: SEC_APPT_ELIGIBILITY, title: "Eligibility", description: "Latest eligibility result for this visit", iconName: "shield", source: "custom", module: "appointment", fieldKeys: ["elig_status", "elig_copay", "elig_deductible_remaining", "elig_checked_at"] },
  { id: SEC_APPT_AUTHORIZATION, title: "Authorization", description: "Prior authorization for this visit", iconName: "file-text", source: "custom", module: "appointment", fieldKeys: ["auth_required", "auth_status", "auth_number"] },
];

/** Appointment detail > Coverage tab: summary written by eligibility / prior-auth actions + Verify now. */
export default function AppointmentCoverageTab({ appointment }: { appointment: Appointment }) {
  const { hasPermission } = useCurrentPermissions();
  const canVerify = hasPermission("eligibility", "add");
  const canDecide = hasPermission("priorAuth", "edit");
  const [authNo, setAuthNo] = useState("");
  const [authUnits, setAuthUnits] = useState("");
  const [, setTick] = useState(0);
  const values = readLocalRecordFields("appointment", appointment.id);
  const [sections, setSections] = useState<OverviewSection[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(SECTIONS_KEY) || "null");
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch { /* ignore */ }
    return DEFAULT_SECTIONS;
  });
  useEffect(() => { try { ensureRcmFieldSeeds(); } catch { /* ignore */ } }, []);
  const saveField = (key: string, value: any) => {
    try {
      const k = `mantra_appt_fields_${appointment.id}`;
      localStorage.setItem(k, JSON.stringify({ ...JSON.parse(localStorage.getItem(k) || "{}"), [key]: value }));
    } catch { /* ignore */ }
    setTick((t) => t + 1);
  };

  return (
    <div className="p-6 space-y-4" data-testid="appointment-coverage-tab">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900">Coverage</h3>
          <CoverageChip appointment={appointment} />
        </div>
        <button
          type="button"
          disabled={!canVerify}
          title={canVerify ? "Ask the payer now" : "You need the eligibility permission"}
          onClick={() => {
            try {
              const r = verifyAppointmentNow(appointment.id);
              toast.success(`Verified: ${r.status.replace("_", " ")}`);
              setTick((t) => t + 1);
            } catch (e: any) {
              toast.error(String(e?.message || e));
            }
          }}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
        >
          Verify now
        </button>
      </div>
      {appointment.coverage?.summary && <p className="text-sm text-slate-700">{appointment.coverage.summary}</p>}
      <DraggableOverviewSections
        mode="appointment"
        sections={sections}
        onSectionsChange={(next) => { setSections(next); try { localStorage.setItem(SECTIONS_KEY, JSON.stringify(next)); } catch { /* ignore */ } }}
        fieldValues={values}
        onFieldValueChange={saveField}
        customFieldsModule="appointment"
      />
      {(() => {
        const iid = appointment.coverage?.instanceId;
        const row: any = iid ? getProcessInstanceById(iid) : undefined;
        if (!row || row.elig_status !== "pending_review") return null;
        return (
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 space-y-2" data-testid="call-result-review">
            <div className="text-xs font-semibold text-violet-900">A phone call captured benefits. Review and accept to make it the verified result.</div>
            <div className="text-xs text-violet-900">Copay {String(row.elig_copay ?? "-")} · deductible remaining {String(row.elig_deductible_remaining ?? "-")}</div>
            <button type="button" disabled={!canVerify} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-violet-300 bg-white hover:bg-violet-100 disabled:opacity-50" onClick={() => {
              try { acceptCallResult({ instanceId: iid! }); toast.success("Call result accepted"); setTick((t) => t + 1); } catch (e: any) { toast.error(String(e?.message || e)); }
            }}>Accept call result</button>
          </div>
        );
      })()}
      {String(values.auth_status) === "requested" && (
        <div className="rounded-xl border border-slate-200 p-3 space-y-2" data-testid="auth-decision">
          <div className="text-xs font-semibold text-slate-700">Record the payer's authorization decision</div>
          <div className="flex flex-wrap gap-2">
            <input className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg" placeholder="Authorization #" value={authNo} onChange={(e) => setAuthNo(e.target.value)} />
            <input className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg w-24" type="number" placeholder="Units" value={authUnits} onChange={(e) => setAuthUnits(e.target.value)} />
            {(["approved", "denied"] as const).map((d) => (
              <button key={d} type="button" disabled={!canDecide} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50" onClick={() => {
                try { recordAuthDecision({ instanceId: appointment.coverage?.instanceId, appointmentId: String(appointment.id), decision: d, authNumber: authNo || undefined, unitsApproved: authUnits ? Number(authUnits) : undefined }); toast.success(`Authorization ${d}`); setTick((t) => t + 1); } catch (e: any) { toast.error(String(e?.message || e)); }
              }}>{d === "approved" ? "Approve" : "Deny"}</button>
            ))}
          </div>
        </div>
      )}
      {appointment.coverage?.instanceId && <p className="text-xs text-slate-500">Process instance: {appointment.coverage.instanceId}</p>}
    </div>
  );
}
