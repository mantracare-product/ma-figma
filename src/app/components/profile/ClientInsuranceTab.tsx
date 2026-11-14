import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  COVERAGES_EVENT,
  getClientDemographics,
  getCoveragesForClient,
  removeCoverage,
  saveClientDemographics,
  saveCoverage,
  type ClientDemographics,
  type Coverage,
  type CoveragePriority,
} from "../../../lib/coveragesStore";
import { BILLING_SETUP_EVENT, payersStore } from "../../../lib/billingSetupStore";

const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white";
const btnCls = "px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50";

function useTick(...events: string[]): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    events.forEach((e) => window.addEventListener(e, bump));
    return () => events.forEach((e) => window.removeEventListener(e, bump));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return tick;
}

const blank = (clientId: string, priority: CoveragePriority): Omit<Coverage, "id"> => ({
  clientId,
  payerId: "",
  memberId: "",
  priority,
  subscriberRelationship: "self",
});

/** Client profile > Insurance tab: typed demographics + Coverages table. */
export default function ClientInsuranceTab({ clientId }: { clientId: string }) {
  const tick = useTick(COVERAGES_EVENT, BILLING_SETUP_EVENT);
  const [demo, setDemo] = useState<ClientDemographics>(() => getClientDemographics(clientId));
  const [editing, setEditing] = useState<(Omit<Coverage, "id"> & { id?: string }) | null>(null);

  useEffect(() => setDemo(getClientDemographics(clientId)), [clientId]);

  const coverages = getCoveragesForClient(clientId);
  const payers = payersStore.get();
  const payerName = (id: string) => payers.find((p) => p.id === id)?.name || id || "—";
  const has = (p: CoveragePriority) => coverages.some((c) => c.priority === p);
  const nextPriority: CoveragePriority = !has("primary") ? "primary" : !has("secondary") ? "secondary" : "tertiary";
  void tick;

  const setD = (k: keyof ClientDemographics, v: any) => setDemo({ ...demo, [k]: v });

  return (
    <div className="space-y-6" data-testid="client-insurance-tab">
      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <h3 className="text-sm font-semibold">Demographics for billing</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <input className={inputCls} placeholder="Legal first name" value={demo.legalFirstName || ""} onChange={(e) => setD("legalFirstName", e.target.value)} />
          <input className={inputCls} placeholder="Legal last name" value={demo.legalLastName || ""} onChange={(e) => setD("legalLastName", e.target.value)} />
          <input className={inputCls} type="date" value={demo.dob || ""} onChange={(e) => setD("dob", e.target.value)} />
          <select className={inputCls} value={demo.sex || ""} onChange={(e) => setD("sex", e.target.value || undefined)}>
            <option value="">Sex</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
            <option value="unknown">Unknown</option>
          </select>
          <input className={inputCls} placeholder="Address" value={demo.address || ""} onChange={(e) => setD("address", e.target.value)} />
          <input className={inputCls} placeholder="Guarantor" value={demo.guarantor || ""} onChange={(e) => setD("guarantor", e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!demo.selfPay} onChange={(e) => setD("selfPay", e.target.checked)} /> Self-pay</label>
          {(["sms", "voice", "cardOnFile"] as const).map((k) => (
            <label key={k} className="flex items-center gap-2">
              <input type="checkbox" checked={!!demo.consents?.[k]} onChange={(e) => setD("consents", { ...demo.consents, [k]: e.target.checked })} />
              Consent: {k === "cardOnFile" ? "card on file" : k}
            </label>
          ))}
        </div>
        <button className={btnCls} onClick={() => { saveClientDemographics(clientId, demo) ? toast.success("Saved") : toast.error("Client not found"); }}>Save demographics</button>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Coverages</h3>
          <button className={btnCls} onClick={() => setEditing(blank(clientId, nextPriority))}>Add coverage</button>
        </div>
        {coverages.length === 0 && <p className="text-sm text-slate-500">No coverage on file.</p>}
        {coverages.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm">
            <div className="min-w-0">
              <span className="font-semibold capitalize">{c.priority}</span> · {payerName(c.payerId)} · Member {c.memberId || "—"}
              {c.groupNumber ? ` · Group ${c.groupNumber}` : ""}
              {c.effectiveDate ? ` · ${c.effectiveDate} → ${c.termDate || "open"}` : ""}
              {c.sample && <span className="ml-2 text-[10px] font-bold uppercase text-amber-700">Mock data</span>}
            </div>
            <div className="flex gap-2 shrink-0">
              <button className={btnCls} onClick={() => setEditing(c)}>Edit</button>
              <button className={btnCls} onClick={() => removeCoverage(c.id)}>Remove</button>
            </div>
          </div>
        ))}
      </section>

      {editing && (
        <section className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-3">
          <h3 className="text-sm font-semibold">{editing.id ? "Edit coverage" : "New coverage"}</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <select className={inputCls} value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: e.target.value as CoveragePriority })}>
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
              <option value="tertiary">Tertiary</option>
            </select>
            <select className={inputCls} value={editing.payerId} onChange={(e) => setEditing({ ...editing, payerId: e.target.value })}>
              <option value="">Select payer</option>
              {payers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input className={inputCls} placeholder="Member ID" value={editing.memberId} onChange={(e) => setEditing({ ...editing, memberId: e.target.value })} />
            <input className={inputCls} placeholder="Group number" value={editing.groupNumber || ""} onChange={(e) => setEditing({ ...editing, groupNumber: e.target.value })} />
            <input className={inputCls} placeholder="Plan" value={editing.planName || ""} onChange={(e) => setEditing({ ...editing, planName: e.target.value })} />
            <input className={inputCls} placeholder="Subscriber name" value={editing.subscriberName || ""} onChange={(e) => setEditing({ ...editing, subscriberName: e.target.value })} />
            <select className={inputCls} value={editing.subscriberRelationship || "self"} onChange={(e) => setEditing({ ...editing, subscriberRelationship: e.target.value as Coverage["subscriberRelationship"] })}>
              <option value="self">Self</option>
              <option value="spouse">Spouse</option>
              <option value="child">Child</option>
              <option value="other">Other</option>
            </select>
            <input className={inputCls} type="date" title="Effective" value={editing.effectiveDate || ""} onChange={(e) => setEditing({ ...editing, effectiveDate: e.target.value })} />
            <input className={inputCls} type="date" title="Term" value={editing.termDate || ""} onChange={(e) => setEditing({ ...editing, termDate: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button
              className={btnCls}
              onClick={() => {
                if (!editing.payerId || !editing.memberId.trim()) {
                  toast.error("Payer and member ID are required");
                  return;
                }
                const { demoted } = saveCoverage({ ...editing, sample: false });
                toast.success(demoted.length ? "Saved; the previous coverage moved down one level" : "Coverage saved");
                setEditing(null);
              }}
            >
              Save coverage
            </button>
            <button className={btnCls} onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </section>
      )}
    </div>
  );
}
