import type { Appointment } from "../../../lib/appointmentService";

const STYLE: Record<string, { cls: string; label: string }> = {
  active: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Covered" },
  inactive: { cls: "bg-red-50 text-red-700 border-red-200", label: "Inactive" },
  not_found: { cls: "bg-amber-50 text-amber-800 border-amber-200", label: "Needs fix" },
  provider_setup: { cls: "bg-amber-50 text-amber-800 border-amber-200", label: "Provider setup" },
  inconclusive: { cls: "bg-amber-50 text-amber-800 border-amber-200", label: "Inconclusive" },
  no_coverage: { cls: "bg-slate-100 text-slate-600 border-slate-200", label: "No coverage" },
};

/** Small coverage status chip driven by Appointment.coverage (written by run_eligibility). Renders nothing without it. */
export default function CoverageChip({ appointment, compact = false }: { appointment: Pick<Appointment, "coverage">; compact?: boolean }) {
  const c = appointment.coverage;
  if (!c?.status) return null;
  const s = STYLE[c.status] || { cls: "bg-slate-100 text-slate-600 border-slate-200", label: c.status };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-1.5 ${compact ? "py-0 text-[9px]" : "py-0.5 text-[10px]"} font-semibold shrink-0 ${s.cls}`}
      title={`${c.summary || s.label}${c.checkedAt ? ` (checked ${c.checkedAt.slice(0, 16).replace("T", " ")})` : ""} - mock data`}
      data-testid="coverage-chip"
    >
      {s.label}
    </span>
  );
}
