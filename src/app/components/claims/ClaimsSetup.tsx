import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { Plus, Shield, Info } from "lucide-react";
import { useCurrentPermissions } from "../../hooks/useCurrentPermissions";
import { useTeamMembers } from "../../../lib/teamStore";
import {
  BILLING_SETUP_EVENT,
  claimDefaultsStore,
  payersStore,
  scrubRulesStore,
  type ClaimDefaults,
  type EnrollmentStatus,
  type Payer,
  type ScrubRule,
} from "../../../lib/billingSetupStore";
import { KNOWN_RCM_NOTIFICATIONS, RCM_NOTIFICATION_EVENT, isRcmNotificationEnabled, setRcmNotificationEnabled } from "../../../lib/rcmNotificationSettings";
import { newId } from "../../../lib/refStore";
import { getOrgLocations } from "../../../lib/orgBilling";
import { VOICE_ENABLED_KEY } from "../../../lib/ruleContextFields";
import { PRIOR_AUTH_RULES_EVENT, priorAuthRulesStore, type PriorAuthRule } from "../../../lib/priorAuthRulesStore";
import { TableComponent, type TableColumn } from "../ui/TableComponent";
import PageTopBar, { type FilterFieldConfig } from "../layout/PageTopBar";
import { Tooltip } from "../ui/Tooltip";
import PayerDetailDrawer from "./PayerDetailDrawer";

type Section = "payers" | "defaults" | "scrub" | "notifications";

const SECTIONS: Array<{ id: Section; label: string }> = [
  { id: "payers", label: "Payers & enrollment" },
  { id: "defaults", label: "Claim defaults" },
  { id: "scrub", label: "Scrub rules" },
  { id: "notifications", label: "Notification toggles" },
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

const ENROLLMENT: EnrollmentStatus[] = ["not_started", "pending", "enrolled", "rejected"];

function PayersSection({ canEdit }: { canEdit: boolean }) {
  useStoreTick();
  const [, setPaTick] = useState(0);
  useEffect(() => {
    const bump = () => setPaTick((t) => t + 1);
    window.addEventListener(PRIOR_AUTH_RULES_EVENT, bump);
    return () => window.removeEventListener(PRIOR_AUTH_RULES_EVENT, bump);
  }, []);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [enrollmentFilter, setEnrollmentFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedPayerId, setSelectedPayerId] = useState<string | null>(null);

  const payers = payersStore.get();
  const priorAuthRules = priorAuthRulesStore.get();

  const filteredPayers = useMemo(() => {
    return payers.filter((p) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = (p.name || "").toLowerCase().includes(q);
        const matchCode = (p.payerIdCode || "").toLowerCase().includes(q);
        const matchPhone = (p.phone || "").toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchPhone) return false;
      }
      // Type
      if (typeFilter !== "all" && (p.type || "commercial") !== typeFilter) {
        return false;
      }
      // Active
      if (activeFilter === "active" && p.active === false) return false;
      if (activeFilter === "inactive" && p.active !== false) return false;

      // Enrollment
      if (enrollmentFilter !== "all") {
        const elig = p.enrollment?.eligibility?.status ?? p.enrollment?.status ?? "not_started";
        const clm = p.enrollment?.claims?.status ?? p.enrollment?.status ?? "not_started";
        const era = p.enrollment?.era?.status ?? p.enrollment?.status ?? "not_started";
        const enrolledCount = [elig, clm, era].filter((s) => s === "enrolled").length;

        if (enrollmentFilter === "3" && enrolledCount !== 3) return false;
        if (enrollmentFilter === "partial" && (enrolledCount === 0 || enrolledCount === 3)) return false;
        if (enrollmentFilter === "none" && enrolledCount !== 0) return false;
      }

      return true;
    });
  }, [payers, search, typeFilter, activeFilter, enrollmentFilter]);

  const columns: TableColumn<Payer>[] = useMemo(
    () => [
      {
        header: "Payer Name",
        accessorKey: "name",
        render: (p) => (
          <span
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPayerId(p.id);
              setIsDrawerOpen(true);
            }}
            className="font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          >
            {p.name}
          </span>
        ),
      },
      {
        header: "Payer ID",
        accessorKey: "payerIdCode",
        render: (p) => <span className="font-mono text-xs text-slate-700">{p.payerIdCode || "—"}</span>,
      },
      {
        header: "Type",
        accessorKey: "type",
        render: (p) => {
          const typeLabel = p.type ? p.type.charAt(0).toUpperCase() + p.type.slice(1) : "Commercial";
          return <span className="text-slate-700">{typeLabel}</span>;
        },
      },
      {
        header: "Phone",
        accessorKey: "phone",
        render: (p) =>
          p.phone ? (
            <span className="text-slate-700">{p.phone}</span>
          ) : (
            <span className="text-[11px] text-amber-600 italic">Add the payer phone to enable benefit calls</span>
          ),
      },
      {
        header: "Enrollment",
        render: (p) => {
          const elig = p.enrollment?.eligibility?.status ?? p.enrollment?.status ?? "not_started";
          const clm = p.enrollment?.claims?.status ?? p.enrollment?.status ?? "not_started";
          const era = p.enrollment?.era?.status ?? p.enrollment?.status ?? "not_started";
          const count = [elig, clm, era].filter((s) => s === "enrolled").length;
          const chipText = count === 3 ? "3 of 3 enrolled" : count > 0 ? `${count} of 3 enrolled` : "None";
          const chipClass =
            count === 3
              ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
              : count > 0
              ? "bg-blue-50 text-blue-700 border-blue-200/60"
              : "bg-slate-100 text-slate-500 border-slate-200";
          const tooltip = `Eligibility: ${elig.replace("_", " ")} | Claims: ${clm.replace("_", " ")} | ERA: ${era.replace("_", " ")}`;

          return (
            <Tooltip text={tooltip}>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider inline-block cursor-help ${chipClass}`}>
                {chipText}
              </span>
            </Tooltip>
          );
        },
      },
      {
        header: "Prior-auth rules",
        render: (p) => {
          const count = priorAuthRules.filter((r) => r.payerId === p.id).length;
          return <span className="text-slate-700">{count} {count === 1 ? "rule" : "rules"}</span>;
        },
      },
      {
        header: "Active",
        render: (p) => (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              p.active !== false
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                : "bg-gray-100 text-gray-500 border border-gray-200"
            }`}
          >
            {p.active !== false ? "Active" : "Inactive"}
          </span>
        ),
      },
    ],
    [priorAuthRules]
  );

  const filterFields: FilterFieldConfig[] = [
    {
      id: "type",
      label: "Type",
      type: "select",
      value: typeFilter,
      onChange: setTypeFilter,
      options: [
        { label: "All Types", value: "all" },
        { label: "Commercial", value: "commercial" },
        { label: "Medicare", value: "medicare" },
        { label: "Medicaid", value: "medicaid" },
        { label: "Other", value: "other" },
      ],
    },
    {
      id: "enrollment",
      label: "Enrollment",
      type: "select",
      value: enrollmentFilter,
      onChange: setEnrollmentFilter,
      options: [
        { label: "All Enrollments", value: "all" },
        { label: "3 of 3 Enrolled", value: "3" },
        { label: "Partially Enrolled", value: "partial" },
        { label: "None Enrolled", value: "none" },
      ],
    },
    {
      id: "active",
      label: "Active Status",
      type: "select",
      value: activeFilter,
      onChange: setActiveFilter,
      options: [
        { label: "All Statuses", value: "all" },
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Insurance payers, electronic EDI enrollment (eligibility, claims, ERA), and payer-specific prior authorization rules.
      </p>

      <PageTopBar
        showSearch
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search payers by name, ID, or phone..."
        filterFields={filterFields}
        primaryAction={{
          label: "Add payer",
          icon: <Plus className="w-3.5 h-3.5" />,
          onClick: () => {
            setSelectedPayerId(null);
            setIsDrawerOpen(true);
          },
          disabled: !canEdit,
        }}
      />

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <TableComponent<Payer>
          data={filteredPayers}
          columns={columns}
          getRowId={(p) => p.id}
          enableSelection={false}
          enableColumnCustomization={false}
          onRowClick={(p) => {
            setSelectedPayerId(p.id);
            setIsDrawerOpen(true);
          }}
          emptyMessage="No payers match your search or filter."
        />
      </div>

      <PayerDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        payerId={selectedPayerId}
      />
    </div>
  );
}



function NotificationsSection({ canEdit }: { canEdit: boolean }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener(RCM_NOTIFICATION_EVENT, bump);
    return () => window.removeEventListener(RCM_NOTIFICATION_EVENT, bump);
  }, []);
  return (
    <div className="space-y-2 max-w-2xl">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" disabled={!canEdit} checked={(() => { try { return localStorage.getItem(VOICE_ENABLED_KEY) === "1"; } catch { return false; } })()} onChange={(e) => { try { localStorage.setItem(VOICE_ENABLED_KEY, e.target.checked ? "1" : "0"); } catch { /* ignore */ } setTick((t) => t + 1); }} />
        Voice calls for payer benefits. When on, the Inconclusive rule calls the payer instead of creating a task.
      </label>
      <p className="text-xs text-slate-500">Switch off the automation notifications you do not want. Everything is on by default.</p>
      {KNOWN_RCM_NOTIFICATIONS.map((n) => (
        <label key={n.key} className="flex items-center gap-2 text-sm">
          <input type="checkbox" disabled={!canEdit} checked={isRcmNotificationEnabled(n.key)} onChange={(e) => setRcmNotificationEnabled(n.key, e.target.checked)} />
          {n.label}
        </label>
      ))}
    </div>
  );
}



function DefaultsSection({ canEdit }: { canEdit: boolean }) {
  useStoreTick();
  const [form, setForm] = useState<ClaimDefaults>(() => claimDefaultsStore.get());
  const locations = getOrgLocations();
  return (
    <div className="space-y-3 max-w-xl">
      <Field label="Claim frequency code"><input className={inputCls} disabled={!canEdit} value={form.frequencyCode} onChange={(e) => setForm({ ...form, frequencyCode: e.target.value })} /></Field>
      <Field label="Default place of service"><input className={inputCls} disabled={!canEdit} value={form.defaultPos} onChange={(e) => setForm({ ...form, defaultPos: e.target.value })} /></Field>
      <Field label="Default billing location (set up under Organization > Locations)">
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

/** Insurance & Claims > Setup (gated by the billingSetup permission; editing needs the edit action). */
export default function ClaimsSetup() {
  const { hasPermission } = useCurrentPermissions();
  const canEdit = hasPermission("billingSetup", "edit");
  const [section, setSection] = useState<Section>("payers");
  useStoreTick();

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[#0F172A]" style={{ fontFamily: "DM Sans, sans-serif" }} data-testid="claims-setup">Setup</h2>
        <p className="text-sm text-[#64748B]" style={{ fontFamily: "Outfit, sans-serif" }}>
          Payers, fees, claim defaults and scrub rules. The billing entity, NPI and place of service are on the Organization (Settings, then Organization).
          {!canEdit && " You have read-only access."}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            data-testid={`billing-section-${s.id}`}
            onClick={() => setSection(s.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${section === s.id ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 hover:bg-slate-50"}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div>
        {section === "payers" && <PayersSection canEdit={canEdit} />}
        {section === "defaults" && <DefaultsSection canEdit={canEdit} />}
        {section === "scrub" && <ScrubSection canEdit={canEdit} />}
        {section === "notifications" && <NotificationsSection canEdit={canEdit} />}
      </div>
    </div>
  );
}
