import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useCurrentPermissions } from "../../hooks/useCurrentPermissions";
import { useTeamMembers } from "../../../lib/teamStore";
import {
  BILLING_SETUP_EVENT,
  billingEntityStore,
  billingLocationsStore,
  claimDefaultsStore,
  feeSchedulesStore,
  payersStore,
  providerCredentialsStore,
  scrubRulesStore,
  type BillingEntity,
  type ClaimDefaults,
  type EnrollmentStatus,
  type Payer,
  type ProviderCredential,
  type ScrubRule,
} from "../../../lib/billingSetupStore";
import { newId } from "../../../lib/refStore";

type Section = "entity" | "locations" | "payers" | "fees" | "defaults" | "scrub" | "providers";

const SECTIONS: Array<{ id: Section; label: string }> = [
  { id: "entity", label: "Billing entity" },
  { id: "locations", label: "Locations & POS" },
  { id: "payers", label: "Payers & enrollment" },
  { id: "fees", label: "Fee schedules" },
  { id: "defaults", label: "Claim defaults" },
  { id: "scrub", label: "Scrub rules" },
  { id: "providers", label: "Provider credentials" },
];

const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white disabled:bg-slate-50 disabled:text-slate-500";
const btnCls = "px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50";

function useStoreTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener(BILLING_SETUP_EVENT, bump);
    return () => window.removeEventListener(BILLING_SETUP_EVENT, bump);
  }, []);
  return tick;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-600 mb-1">{label}</span>
      {children}
    </label>
  );
}

function EntitySection({ canEdit }: { canEdit: boolean }) {
  useStoreTick();
  const [form, setForm] = useState<BillingEntity>(() => billingEntityStore.get());
  const set = (k: keyof BillingEntity) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  return (
    <div className="space-y-3 max-w-2xl">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Legal name"><input className={inputCls} disabled={!canEdit} value={form.legalName} onChange={set("legalName")} /></Field>
        <Field label="DBA name"><input className={inputCls} disabled={!canEdit} value={form.dbaName} onChange={set("dbaName")} /></Field>
        <Field label="EIN"><input className={inputCls} disabled={!canEdit} value={form.ein} onChange={set("ein")} /></Field>
        <Field label="Group NPI"><input className={inputCls} disabled={!canEdit} value={form.npi} onChange={set("npi")} /></Field>
        <Field label="Taxonomy code"><input className={inputCls} disabled={!canEdit} value={form.taxonomy} onChange={set("taxonomy")} /></Field>
        <Field label="Phone"><input className={inputCls} disabled={!canEdit} value={form.phone} onChange={set("phone")} /></Field>
      </div>
      <Field label="Address"><input className={inputCls} disabled={!canEdit} value={form.address} onChange={set("address")} /></Field>
      <button className={btnCls} disabled={!canEdit} onClick={() => { billingEntityStore.save({ ...form, sample: false }); toast.success("Billing entity saved"); }}>
        Save
      </button>
    </div>
  );
}

function LocationsSection({ canEdit }: { canEdit: boolean }) {
  useStoreTick();
  const rows = billingLocationsStore.get();
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className="grid grid-cols-[2fr_1fr_3fr_auto] gap-2 items-center">
          <input className={inputCls} disabled={!canEdit} value={r.name} onChange={(e) => billingLocationsStore.upsert({ ...r, name: e.target.value, sample: false })} />
          <input className={inputCls} disabled={!canEdit} value={r.pos} placeholder="POS" onChange={(e) => billingLocationsStore.upsert({ ...r, pos: e.target.value, sample: false })} />
          <input className={inputCls} disabled={!canEdit} value={r.address || ""} placeholder="Address" onChange={(e) => billingLocationsStore.upsert({ ...r, address: e.target.value, sample: false })} />
          <button className={btnCls} disabled={!canEdit} onClick={() => billingLocationsStore.remove(r.id)}>Remove</button>
        </div>
      ))}
      <button className={btnCls} disabled={!canEdit} onClick={() => billingLocationsStore.upsert({ id: newId("loc"), name: "New location", pos: "11" })}>Add location</button>
    </div>
  );
}

const ENROLLMENT: EnrollmentStatus[] = ["not_started", "pending", "enrolled", "rejected"];

function PayersSection({ canEdit }: { canEdit: boolean }) {
  useStoreTick();
  const rows = payersStore.get();
  const upd = (p: Payer, patch: Partial<Payer>) => payersStore.upsert({ ...p, ...patch, sample: false });
  return (
    <div className="space-y-2">
      {rows.map((p) => (
        <div key={p.id} className="grid grid-cols-[3fr_1fr_1.2fr_auto] gap-2 items-center">
          <input className={inputCls} disabled={!canEdit} value={p.name} onChange={(e) => upd(p, { name: e.target.value })} />
          <input className={inputCls} disabled={!canEdit} value={p.payerIdCode} placeholder="Payer ID" onChange={(e) => upd(p, { payerIdCode: e.target.value })} />
          <select className={inputCls} disabled={!canEdit} value={p.enrollment.status} onChange={(e) => upd(p, { enrollment: { ...p.enrollment, status: e.target.value as EnrollmentStatus } })}>
            {ENROLLMENT.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
          <button className={btnCls} disabled={!canEdit} onClick={() => payersStore.remove(p.id)}>Remove</button>
        </div>
      ))}
      <button className={btnCls} disabled={!canEdit} onClick={() => payersStore.upsert({ id: newId("payer"), name: "New payer", payerIdCode: "", enrollment: { status: "not_started" } })}>Add payer</button>
      {/* TODO(rcm): prior-auth rules table (S3.3) is added to this section. */}
    </div>
  );
}

function FeesSection({ canEdit }: { canEdit: boolean }) {
  useStoreTick();
  const rows = feeSchedulesStore.get();
  const payers = payersStore.get();
  return (
    <div className="space-y-4">
      {rows.map((s) => (
        <div key={s.id} className="rounded-lg border border-slate-200 p-3 space-y-2">
          <div className="grid grid-cols-[2fr_2fr_auto] gap-2">
            <input className={inputCls} disabled={!canEdit} value={s.name} onChange={(e) => feeSchedulesStore.upsert({ ...s, name: e.target.value, sample: false })} />
            <select className={inputCls} disabled={!canEdit} value={s.payerId || ""} onChange={(e) => feeSchedulesStore.upsert({ ...s, payerId: e.target.value || undefined, sample: false })}>
              <option value="">Default (all payers)</option>
              {payers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button className={btnCls} disabled={!canEdit} onClick={() => feeSchedulesStore.remove(s.id)}>Remove</button>
          </div>
          {s.lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <input className={inputCls} disabled={!canEdit} value={l.cpt} placeholder="CPT" onChange={(e) => feeSchedulesStore.upsert({ ...s, sample: false, lines: s.lines.map((x, j) => (j === i ? { ...x, cpt: e.target.value } : x)) })} />
              <input className={inputCls} disabled={!canEdit} type="number" value={l.amount} onChange={(e) => feeSchedulesStore.upsert({ ...s, sample: false, lines: s.lines.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value) } : x)) })} />
              <button className={btnCls} disabled={!canEdit} onClick={() => feeSchedulesStore.upsert({ ...s, sample: false, lines: s.lines.filter((_, j) => j !== i) })}>x</button>
            </div>
          ))}
          <button className={btnCls} disabled={!canEdit} onClick={() => feeSchedulesStore.upsert({ ...s, sample: false, lines: [...s.lines, { cpt: "", amount: 0 }] })}>Add line</button>
        </div>
      ))}
      <button className={btnCls} disabled={!canEdit} onClick={() => feeSchedulesStore.upsert({ id: newId("fee"), name: "New fee schedule", lines: [] })}>Add fee schedule</button>
    </div>
  );
}

function DefaultsSection({ canEdit }: { canEdit: boolean }) {
  useStoreTick();
  const [form, setForm] = useState<ClaimDefaults>(() => claimDefaultsStore.get());
  const locations = billingLocationsStore.get();
  return (
    <div className="space-y-3 max-w-xl">
      <Field label="Claim frequency code"><input className={inputCls} disabled={!canEdit} value={form.frequencyCode} onChange={(e) => setForm({ ...form, frequencyCode: e.target.value })} /></Field>
      <Field label="Default place of service"><input className={inputCls} disabled={!canEdit} value={form.defaultPos} onChange={(e) => setForm({ ...form, defaultPos: e.target.value })} /></Field>
      <Field label="Default billing location">
        <select className={inputCls} disabled={!canEdit} value={form.defaultBillingLocationId} onChange={(e) => setForm({ ...form, defaultBillingLocationId: e.target.value })}>
          <option value="">None</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </Field>
      <Field label="Timely filing (days)"><input className={inputCls} type="number" disabled={!canEdit} value={form.timelyFilingDays} onChange={(e) => setForm({ ...form, timelyFilingDays: Number(e.target.value) })} /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={!canEdit} checked={form.acceptAssignment} onChange={(e) => setForm({ ...form, acceptAssignment: e.target.checked })} /> Accept assignment</label>
      <button className={btnCls} disabled={!canEdit} onClick={() => { claimDefaultsStore.save(form); toast.success("Claim defaults saved"); }}>Save</button>
    </div>
  );
}

function ScrubSection({ canEdit }: { canEdit: boolean }) {
  useStoreTick();
  const rows = scrubRulesStore.get();
  const upd = (r: ScrubRule, patch: Partial<ScrubRule>) => scrubRulesStore.upsert({ ...r, ...patch, sample: false });
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className="grid grid-cols-[3fr_1fr_1fr_auto_auto] gap-2 items-center">
          <input className={inputCls} disabled={!canEdit} value={r.name} onChange={(e) => upd(r, { name: e.target.value })} />
          <input className={inputCls} disabled={!canEdit} value={r.target || ""} placeholder="Target" onChange={(e) => upd(r, { target: e.target.value })} />
          <select className={inputCls} disabled={!canEdit} value={r.severity} onChange={(e) => upd(r, { severity: e.target.value as ScrubRule["severity"] })}>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
          </select>
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" disabled={!canEdit} checked={r.enabled} onChange={(e) => upd(r, { enabled: e.target.checked })} /> On</label>
          <button className={btnCls} disabled={!canEdit} onClick={() => scrubRulesStore.remove(r.id)}>Remove</button>
        </div>
      ))}
      <button className={btnCls} disabled={!canEdit} onClick={() => scrubRulesStore.upsert({ id: newId("scrub"), name: "New rule", check: "required_field", severity: "warning", enabled: false })}>Add rule</button>
    </div>
  );
}

function ProvidersSection({ canEdit }: { canEdit: boolean }) {
  useStoreTick();
  const { teamMembers } = useTeamMembers();
  const creds = providerCredentialsStore.get();
  const forMember = (id: string): ProviderCredential => creds.find((c) => c.id === id) || { id, npi: "", taxonomy: "", licenseNumber: "", licenseState: "" };
  const upd = (c: ProviderCredential, patch: Partial<ProviderCredential>) => providerCredentialsStore.upsert({ ...c, ...patch, sample: false });
  return (
    <div className="space-y-2">
      {teamMembers.map((m) => {
        const c = forMember(String(m.id));
        return (
          <div key={String(m.id)} className="grid grid-cols-[2fr_1fr_1fr_1fr_0.6fr] gap-2 items-center">
            <div className="text-sm font-medium truncate">{m.name}</div>
            <input className={inputCls} disabled={!canEdit} value={c.npi} placeholder="NPI" onChange={(e) => upd(c, { npi: e.target.value })} />
            <input className={inputCls} disabled={!canEdit} value={c.taxonomy} placeholder="Taxonomy" onChange={(e) => upd(c, { taxonomy: e.target.value })} />
            <input className={inputCls} disabled={!canEdit} value={c.licenseNumber} placeholder="License #" onChange={(e) => upd(c, { licenseNumber: e.target.value })} />
            <input className={inputCls} disabled={!canEdit} value={c.licenseState} placeholder="State" onChange={(e) => upd(c, { licenseState: e.target.value })} />
          </div>
        );
      })}
    </div>
  );
}

/** Settings > Billing setup (gated by the billingSetup permission; editing needs the edit action). */
export default function BillingSetupTab() {
  const { hasPermission } = useCurrentPermissions();
  const canEdit = hasPermission("billingSetup", "edit");
  const [section, setSection] = useState<Section>("entity");
  useStoreTick();
  const hasSample =
    payersStore.get().some((p) => p.sample) || billingLocationsStore.get().some((l) => l.sample) || !!billingEntityStore.get().sample;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[#0F172A]" style={{ fontFamily: "DM Sans, sans-serif" }}>Billing setup</h2>
        <p className="text-sm text-[#64748B]" style={{ fontFamily: "Outfit, sans-serif" }}>
          Enter your billing entity, payers and defaults once; eligibility, claims and the scrubber read them from here.
          {!canEdit && " You have read-only access."}
        </p>
      </div>
      {hasSample && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Mock data: some rows below are sample data loaded for demonstration. Editing a row marks it as yours.
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${section === s.id ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 hover:bg-slate-50"}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div>
        {section === "entity" && <EntitySection canEdit={canEdit} />}
        {section === "locations" && <LocationsSection canEdit={canEdit} />}
        {section === "payers" && <PayersSection canEdit={canEdit} />}
        {section === "fees" && <FeesSection canEdit={canEdit} />}
        {section === "defaults" && <DefaultsSection canEdit={canEdit} />}
        {section === "scrub" && <ScrubSection canEdit={canEdit} />}
        {section === "providers" && <ProvidersSection canEdit={canEdit} />}
      </div>
    </div>
  );
}
