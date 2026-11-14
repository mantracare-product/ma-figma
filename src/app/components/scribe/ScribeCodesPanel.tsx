import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { ScribeSession } from "../../../lib/scribeSessionStore";
import { acceptCodes, getSessionCodes, LATERALITY_MODIFIERS, signAndSendToBilling, type ScribeCodes } from "../../../lib/scribeBilling";
import { COMMON_CPT_CODES } from "../../../lib/cptCodes";
import { COMMON_ICD_CODES } from "../../../lib/icdCodes";
import { useCurrentPermissions } from "../../hooks/useCurrentPermissions";

const inputCls = "px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white";
const btnCls = "px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50";

/** Scribe > Codes panel: ICD-10 and CPT (with laterality modifier), Accept codes, Sign and send to billing. */
export default function ScribeCodesPanel({ session }: { session: ScribeSession }) {
  const { hasPermission } = useCurrentPermissions();
  const canSend = hasPermission("claims", "add");
  const [codes, setCodes] = useState<ScribeCodes>(() => getSessionCodes(session));
  const [pickCpt, setPickCpt] = useState("");
  const [pickIcd, setPickIcd] = useState("");
  useEffect(() => setCodes(getSessionCodes(session)), [session.id]);

  const locked = !!codes.signedAt;
  return (
    <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 space-y-3" data-testid="scribe-codes-panel">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Codes</h3>
        <span className="text-[11px] text-slate-500">{locked ? "Signed" : codes.accepted ? "Accepted" : "Draft"}</span>
      </div>

      <div className="space-y-1.5">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Diagnosis (ICD-10)</div>
        {codes.icd.map((d, i) => (
          <div key={d.code + i} className="flex items-center justify-between text-xs">
            <span>{d.code} {d.description ? `· ${d.description}` : ""}</span>
            <button className={btnCls} disabled={locked} onClick={() => setCodes({ ...codes, accepted: false, icd: codes.icd.filter((_, j) => j !== i) })}>Remove</button>
          </div>
        ))}
        <div className="flex gap-2">
          <select className={inputCls} value={pickIcd} disabled={locked} onChange={(e) => setPickIcd(e.target.value)}>
            <option value="">Add ICD-10…</option>
            {COMMON_ICD_CODES.map((c) => <option key={c.code} value={c.code}>{c.code} - {c.shortDescription}</option>)}
          </select>
          <button className={btnCls} disabled={!pickIcd || locked} onClick={() => {
            const it = COMMON_ICD_CODES.find((c) => c.code === pickIcd);
            if (it) setCodes({ ...codes, accepted: false, icd: [...codes.icd, { code: it.code, description: it.shortDescription }] });
            setPickIcd("");
          }}>Add</button>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Procedures (CPT)</div>
        {codes.cpt.map((c, i) => (
          <div key={c.code + i} className="flex items-center gap-2 text-xs">
            <span className="flex-1">{c.code} · {c.description}</span>
            <select className={inputCls} value={c.modifier || ""} disabled={locked} onChange={(e) => setCodes({ ...codes, accepted: false, cpt: codes.cpt.map((x, j) => (j === i ? { ...x, modifier: e.target.value } : x)) })} aria-label="Modifier">
              {LATERALITY_MODIFIERS.map((m) => <option key={m} value={m}>{m || "No modifier"}</option>)}
            </select>
            <input className={inputCls + " w-14"} type="number" min={1} value={c.units} disabled={locked} onChange={(e) => setCodes({ ...codes, accepted: false, cpt: codes.cpt.map((x, j) => (j === i ? { ...x, units: Math.max(1, Number(e.target.value)) } : x)) })} />
            <button className={btnCls} disabled={locked} onClick={() => setCodes({ ...codes, accepted: false, cpt: codes.cpt.filter((_, j) => j !== i) })}>Remove</button>
          </div>
        ))}
        <div className="flex gap-2">
          <select className={inputCls} value={pickCpt} disabled={locked} onChange={(e) => setPickCpt(e.target.value)}>
            <option value="">Add CPT…</option>
            {COMMON_CPT_CODES.map((c) => <option key={c.code} value={c.code}>{c.code} - {c.description}</option>)}
          </select>
          <button className={btnCls} disabled={!pickCpt || locked} onClick={() => {
            const it = COMMON_CPT_CODES.find((c) => c.code === pickCpt);
            if (it) setCodes({ ...codes, accepted: false, cpt: [...codes.cpt, { code: it.code, description: it.description, units: 1 }] });
            setPickCpt("");
          }}>Add</button>
        </div>
      </div>

      <div className="flex gap-2">
        <button className={btnCls} disabled={locked || (codes.icd.length === 0 && codes.cpt.length === 0)} onClick={() => {
          try { setCodes(acceptCodes(session.id, { icd: codes.icd, cpt: codes.cpt })); toast.success("Codes accepted"); } catch (e: any) { toast.error(String(e?.message || e)); }
        }}>Accept codes</button>
        <button
          className={btnCls}
          disabled={!codes.accepted || locked || !canSend}
          title={canSend ? "Sign the note and hand the codes to billing" : "You need the claims permission"}
          onClick={async () => {
            try {
              const r = await signAndSendToBilling(session.id);
              setCodes({ ...codes, signedAt: r.signedAt });
              toast.success(r.claimId ? "Signed; codes sent to the claim" : "Signed; billing notified");
            } catch (e: any) { toast.error(String(e?.message || e)); }
          }}
        >Sign and send to billing</button>
      </div>
    </div>
  );
}
