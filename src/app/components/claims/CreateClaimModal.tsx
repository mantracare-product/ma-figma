import { useMemo, useState } from "react";
import { X, Search } from "lucide-react";
import { toast } from "sonner";
import { getScribeSessions, type ScribeSession } from "../../../lib/scribeSessionStore";
import { getSessionCodes } from "../../../lib/scribeBilling";
import { getStoredClients } from "../../../lib/clientsStore";
import { appointmentService } from "../../../lib/appointmentService";
import { performCreateClaim } from "../../../lib/claimActions";
import { getStoredClaims, type Claim } from "../../../lib/claimsStore";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the claim that was created (or the existing one for that session). */
  onCreated: (claim: Claim, existing: boolean) => void;
}

const statusOf = (s: ScribeSession) => {
  const codes = getSessionCodes(s);
  if (codes.signedAt) return "Signed";
  if (codes.accepted) return "Codes accepted";
  return s.status === "completed" ? "Note ready" : s.status.charAt(0).toUpperCase() + s.status.slice(1);
};

const codesSummary = (s: ScribeSession) => {
  const c = getSessionCodes(s);
  const dx = c.icd.map((d) => d.code).join(", ") || s.extractedData?.icd10Code || "no diagnosis";
  const cpt = c.cpt.map((p) => p.code + (p.modifier ? "-" + p.modifier : "")).join(", ") || "no CPT";
  return `${dx} · ${cpt}`;
};

/** Create Claim: pick the AI Scribe session the claim is built from (or, secondarily, a patient / appointment by hand). */
export default function CreateClaimModal({ isOpen, onClose, onCreated }: Props) {
  const [query, setQuery] = useState("");
  const [manual, setManual] = useState(false);
  const [clientId, setClientId] = useState("");
  const [appointmentId, setAppointmentId] = useState("");
  const [busy, setBusy] = useState(false);

  const sessions = useMemo(() => (isOpen ? getScribeSessions().filter((s) => s.status !== "discarded") : []), [isOpen]);
  const clients = useMemo(() => (isOpen ? getStoredClients() : []), [isOpen]);
  const appointments = useMemo(() => (isOpen ? appointmentService.getAppointments() : []), [isOpen]);
  const clientAppointments = useMemo(
    () => appointments.filter((a) => clientId && (String(a.clientId || "") === clientId || (clients.find((c) => c.id === clientId)?.name || "") === a.clientName)),
    [appointments, clients, clientId]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => `${s.clientName} ${s.doctorName} ${s.sessionDate} ${s.title || ""} ${codesSummary(s)}`.toLowerCase().includes(q));
  }, [sessions, query]);

  if (!isOpen) return null;

  const finish = (input: Parameters<typeof performCreateClaim>[0]) => {
    setBusy(true);
    try {
      const r = performCreateClaim(input);
      const claim = getStoredClaims().find((c) => c.id === r.claimId);
      if (!claim) throw new Error("The claim could not be created");
      if (r.created && r.missingData.length) toast.success(`Claim ${claim.claimNumber} created. Missing: ${r.missingData.join(", ").replace(/_/g, " ")}`);
      else toast.success(r.created ? `Claim ${claim.claimNumber} created` : `Claim ${claim.claimNumber} already exists for this visit`);
      onCreated(claim, !r.created);
      onClose();
    } catch (e: any) {
      toast.error(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const fromSession = (s: ScribeSession) =>
    finish({
      clientId: s.clientId,
      sourceType: "scribe",
      sourceId: s.id,
      sessionId: s.id,
      appointmentId: s.appointmentId !== undefined ? String(s.appointmentId) : undefined,
      linesFrom: "scribe_codes",
      cause: { type: "manual" },
    });

  const fromManual = () => {
    if (!clientId) return toast.error("Choose a patient");
    finish({
      clientId,
      sourceType: appointmentId ? "appointment" : "client",
      sourceId: appointmentId || `${clientId}-${Date.now().toString(36)}`,
      appointmentId: appointmentId || undefined,
      linesFrom: appointmentId ? "service_cpt" : "none",
      cause: { type: "manual" },
    });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" data-testid="create-claim-modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Create claim</h2>
            <p className="text-xs text-slate-500">{manual ? "Choose the patient and, if there is one, the appointment." : "Choose the AI Scribe session to bill. Codes, patient, provider and coverage are filled in for you."}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>

        {!manual ? (
          <>
            <div className="px-5 pt-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input data-testid="create-claim-search" autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by patient, provider, date, diagnosis or CPT" className="w-full h-9 pl-8 pr-3 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-400" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2" data-testid="create-claim-sessions">
              {filtered.length === 0 && <div className="text-xs text-slate-400 italic py-8 text-center">No AI Scribe sessions match.</div>}
              {filtered.map((s) => (
                <button key={s.id} type="button" disabled={busy} data-testid="create-claim-session" onClick={() => fromSession(s)} className="w-full text-left rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 px-3.5 py-2.5 disabled:opacity-50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900 truncate">{s.clientName}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">{statusOf(s)}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{(s.sessionDate || "").slice(0, 10)} · {s.doctorName}</div>
                  <div className="text-xs text-slate-600 mt-0.5 truncate">{codesSummary(s)}</div>
                </button>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-slate-100">
              <button type="button" data-testid="create-claim-manual" onClick={() => setManual(true)} className="text-xs font-semibold text-blue-700 hover:underline">No session: choose patient / appointment manually</button>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <label className="block text-xs font-semibold text-slate-700">Patient
                <select data-testid="create-claim-client" value={clientId} onChange={(e) => { setClientId(e.target.value); setAppointmentId(""); }} className="mt-1 w-full h-9 px-2 text-xs border border-slate-200 rounded-lg bg-white">
                  <option value="">Select a patient</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-700">Appointment (optional)
                <select data-testid="create-claim-appointment" value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)} disabled={!clientId} className="mt-1 w-full h-9 px-2 text-xs border border-slate-200 rounded-lg bg-white disabled:opacity-50">
                  <option value="">No appointment</option>
                  {clientAppointments.map((a) => <option key={String(a.id)} value={String(a.id)}>{a.date} {a.time} · {a.title || a.serviceName || "Appointment"}</option>)}
                </select>
              </label>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
              <button type="button" onClick={() => setManual(false)} className="text-xs font-semibold text-slate-600 hover:underline">Back to sessions</button>
              <button type="button" data-testid="create-claim-confirm" disabled={busy || !clientId} onClick={fromManual} className="px-4 h-9 text-xs font-semibold rounded-lg bg-slate-900 text-white disabled:opacity-50">Create claim</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
