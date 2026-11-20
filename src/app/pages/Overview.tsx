import React, { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { PageTopBar } from "../components/layout/PageTopBar";
import PageHeader from "../components/layout/PageHeader";
import { Tooltip } from "../components/ui/Tooltip";
import { useCurrentPermissions } from "@/hooks/useCurrentPermissions";
import { getCallsOnly, PROCESS_LOGS_STORE_EVENT } from "../../lib/processLogsStore";
import { getStoredClaims, CLAIMS_CHANGED_EVENT, type Claim } from "../../lib/claimsStore";
import { getStoredArRecords, AR_CHANGED_EVENT, type ArRecord } from "../../lib/arStore";
import { getStoredProcesses, PROCESS_STORE_EVENT, type Process } from "../../lib/useProcessStore";
import { getStoredRules, AUTOMATION_STORE_EVENT, getStoredStageMoves, STAGE_MOVES_STORE_EVENT, type AutomationRule, type StageMove } from "../../lib/useAutomationStore";
import { getStoredTeamMembers, TEAM_STORE_EVENT, type TeamMember } from "../../lib/teamStore";
import { payersStore, type Payer } from "../../lib/billingSetupStore";
import { getStoredConversations, type Conversation } from "../../lib/useConversations";
import { listActionRuns, type ActionRun } from "../../lib/actionRuns";
import { getStoredTasks, TASKS_STORE_EVENT } from "../../lib/tasksStore";
import { appointmentService } from "../../lib/appointmentService";
import { invoiceService } from "../../lib/invoiceService";
import { claimsOnly } from "../../lib/claimWorkflows";
import type { TaskEntity } from "../../types/task";
import { WIDGET_REGISTRY } from "./overview/overviewWidgets";
import CreateDashboardDrawer from "./overview/CreateDashboardDrawer";
import { SkeletonCard } from "./overview/overviewKit";
import { buildPeriod, parseTs } from "./overview/overviewData";
import type { FilterKey, FilterValues, DashboardDataContext, CustomDashboard, WorkflowRecord } from "./overview/overviewTypes";
import { Plus, ChevronDown, MoreHorizontal, Edit2, Trash2, Layers, Sparkles, RotateCcw } from "lucide-react";

void claimsOnly;

const CUSTOM_DASHBOARDS_KEY = "mantra_overview_dashboards_v1";
const CUSTOM_DASHBOARDS_EVENT = "mantra_overview_dashboards_changed";
const ACTIVE_DASHBOARD_KEY = "mantra_overview_active_dashboard_v1";

interface TabConfig {
  id: string;
  label: string;
  permissionKey?: "rcmReports" | "arCycle";
  filters: FilterKey[];
  widgetIds: string[];
  isCustom?: boolean;
}

const BUILT_IN_TABS: TabConfig[] = [
  {
    id: "call_overview",
    label: "Call overview",
    filters: ["date", "process", "stage", "direction", "teamMember"],
    widgetIds: ["calls_total", "calls_completed", "calls_failed", "calls_success_rate", "calls_avg_duration", "calls_volume_chart", "calls_status_distribution", "calls_by_direction", "calls_by_hour", "calls_top_processes"],
  },
  {
    id: "communication",
    label: "Communication",
    filters: ["date", "channel", "direction", "teamMember"],
    widgetIds: ["comm_total_messages", "comm_received", "comm_open_conversations", "comm_first_response", "comm_delivery_rate", "comm_volume_by_channel", "comm_channel_breakdown", "comm_inbound_outbound", "comm_first_response_trend", "comm_delivery_status", "comm_calls_vs_messages"],
  },
  {
    id: "workflows",
    label: "Workflows",
    filters: ["date", "entity", "process", "stage", "owner"],
    widgetIds: ["wf_active_processes", "wf_total_records", "wf_avg_time", "wf_stuck", "wf_win_rate", "wf_stage_distribution", "wf_by_process", "wf_moves_over_time", "wf_time_in_stage", "wf_won_lost"],
  },
  {
    id: "automation",
    label: "Automation",
    filters: ["date", "rule", "trigger", "entity", "status"],
    widgetIds: ["auto_total_rules", "auto_success_rate", "auto_failures", "auto_tasks_created", "auto_avg_actions", "auto_runs_over_time", "auto_outcome", "auto_runs_by_rule", "auto_failures_by_action", "auto_runs_by_trigger"],
  },
  {
    id: "revenue",
    label: "Revenue",
    permissionKey: "rcmReports",
    filters: ["date", "payer", "process", "provider"],
    widgetIds: ["rev_pipeline", "rev_total_billed", "rev_first_pass", "rev_elig_verified", "rev_denial_rate", "rev_pipeline_funnel", "rev_payer_mix", "rev_first_pass_trend", "rev_elig_results", "rev_work_queues"],
  },
  {
    id: "ar",
    label: "A/R",
    permissionKey: "arCycle",
    filters: ["date", "payer", "stage", "agingBucket", "assignee"],
    widgetIds: ["ar_total_outstanding", "ar_avg_days", "ar_90_plus", "ar_denial_rate", "ar_collected", "ar_aging_buckets_chart", "ar_by_payer", "ar_by_stage", "ar_denials_by_category", "ar_rate_collections", "ar_appeals"],
  },
];

const DEFAULT_FILTERS: FilterValues = {
  process: "all", stage: "all", date: "all", customFrom: "", customTo: "", channel: "all", direction: "all", teamMember: "all", entity: "all",
  rule: "all", trigger: "all", payer: "all", agingBucket: "all", assignee: "all", owner: "all", status: "all", provider: "all",
};

function getCustomDashboards(orgId: string): CustomDashboard[] {
  try {
    const raw = localStorage.getItem(CUSTOM_DASHBOARDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((d: any) => !d.orgId || d.orgId === orgId);
  } catch {
    return [];
  }
}

function saveCustomDashboards(dashboards: CustomDashboard[]) {
  try {
    localStorage.setItem(CUSTOM_DASHBOARDS_KEY, JSON.stringify(dashboards));
    window.dispatchEvent(new Event(CUSTOM_DASHBOARDS_EVENT));
  } catch (err) {
    console.error("Failed to save custom dashboards", err);
  }
}

const SPAN_CLASS: Record<number, string> = { 4: "lg:col-span-4", 6: "lg:col-span-6", 8: "lg:col-span-8", 12: "lg:col-span-12" };
const spanOf = (w: { span?: number; colSpan?: number }) => w.span || (w.colSpan === 3 ? 8 : w.colSpan && w.colSpan >= 4 ? 12 : 6);

// ── filter pills ─────────────────────────────────────────────────────────────────────────────────

function FilterPill({ label, value, onChange, options, testId }: { label: string; value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }>; testId?: string }) {
  const active = value !== "all";
  return (
    <label className={`relative inline-flex items-center h-[36px] rounded-full border pl-3.5 pr-8 text-xs shadow-2xs cursor-pointer transition-colors shrink-0 ${active ? "bg-blue-50 border-blue-200" : "bg-white border-border hover:bg-slate-50"}`} data-testid={testId}>
      <span className="text-slate-500 mr-1.5 whitespace-nowrap">{label}:</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent outline-none font-semibold text-[#1E293B] cursor-pointer appearance-none truncate" style={{ fontFamily: "Outfit, sans-serif", width: `${Math.min(150, Math.max(46, (options.find((o) => o.value === value)?.label.length || 3) * 7.4 + 6))}px` }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 pointer-events-none" />
    </label>
  );
}

const DATE_OPTIONS = [
  { value: "all", label: "All time" }, { value: "today", label: "Today" }, { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" }, { value: "this_month", label: "This month" }, { value: "custom", label: "Custom range" },
];

export default function Overview() {
  const orgId = typeof localStorage !== "undefined" ? localStorage.getItem("mantra_active_org_id_v1") || "default" : "default";
  const { hasPermission } = useCurrentPermissions();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    const fromUrl = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("dashboard");
    if (fromUrl) return fromUrl;
    try { return localStorage.getItem(ACTIVE_DASHBOARD_KEY) || "call_overview"; } catch { return "call_overview"; }
  });
  const [filterValues, setFilterValues] = useState<FilterValues>(DEFAULT_FILTERS);
  const [customDashboards, setCustomDashboards] = useState<CustomDashboard[]>(() => getCustomDashboards(orgId));
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState<CustomDashboard | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showCustomMenu, setShowCustomMenu] = useState(false);
  const [ready, setReady] = useState(false);
  const [vw, setVw] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1440));
  useEffect(() => {
    const on = () => setVw(window.innerWidth);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const moreRef = useRef<HTMLDivElement>(null);
  const customRef = useRef<HTMLDivElement>(null);

  // store data
  const [calls, setCalls] = useState<ReturnType<typeof getCallsOnly>>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [arRecords, setArRecords] = useState<ArRecord[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [payers, setPayers] = useState<Payer[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [runs, setRuns] = useState<ActionRun[]>([]);
  const [stageMoves, setStageMoves] = useState<StageMove[]>([]);
  const [tasks, setTasks] = useState<TaskEntity[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    const reload = () => {
      try { setCalls(getCallsOnly()); } catch { /* ignore */ }
      try { setClaims(getStoredClaims()); } catch { /* ignore */ }
      try { setArRecords(getStoredArRecords()); } catch { /* ignore */ }
      try { setProcesses(getStoredProcesses()); } catch { /* ignore */ }
      try { setRules(getStoredRules()); } catch { /* ignore */ }
      try { setTeamMembers(getStoredTeamMembers()); } catch { /* ignore */ }
      try { setPayers(payersStore.get()); } catch { /* ignore */ }
      try { setConversations(getStoredConversations()); } catch { /* ignore */ }
      try { setRuns(listActionRuns()); } catch { /* ignore */ }
      try { setStageMoves(getStoredStageMoves()); } catch { /* ignore */ }
      try { setTasks(getStoredTasks()); } catch { /* ignore */ }
      try { setAppointments(appointmentService.getAppointments() as any[]); } catch { /* ignore */ }
      try { setInvoices((invoiceService.getInvoices?.() as any[]) || []); } catch { /* ignore */ }
      setCustomDashboards(getCustomDashboards(orgId));
    };
    reload();
    const t = window.setTimeout(() => setReady(true), 240);
    const events = [PROCESS_LOGS_STORE_EVENT, CLAIMS_CHANGED_EVENT, AR_CHANGED_EVENT, PROCESS_STORE_EVENT, AUTOMATION_STORE_EVENT, TEAM_STORE_EVENT, CUSTOM_DASHBOARDS_EVENT, STAGE_MOVES_STORE_EVENT, TASKS_STORE_EVENT, "mantra_appointments_changed", "storage"];
    events.forEach((e) => window.addEventListener(e, reload));
    return () => { window.clearTimeout(t); events.forEach((e) => window.removeEventListener(e, reload)); };
  }, [orgId]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setShowMoreMenu(false);
      if (customRef.current && !customRef.current.contains(e.target as Node)) setShowCustomMenu(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // tabs
  const allTabs = useMemo(() => {
    const builtIns = BUILT_IN_TABS.filter((t) => !t.permissionKey || hasPermission(t.permissionKey, "read"));
    const customs: TabConfig[] = customDashboards.map((dash) => ({
      id: dash.id,
      label: dash.name,
      filters: Array.from(new Set((dash.widgetIds || []).flatMap((id) => WIDGET_REGISTRY[id]?.supportedFilters || []))) as FilterKey[],
      widgetIds: dash.widgetIds || [],
      isCustom: true,
    }));
    return [...builtIns, ...customs];
  }, [customDashboards, hasPermission]);

  const activeTab = useMemo(() => allTabs.find((t) => t.id === activeTabId) || allTabs[0] || BUILT_IN_TABS[0], [allTabs, activeTabId]);

  // keep the selection valid, in the URL (?dashboard=) and remembered
  useEffect(() => {
    if (activeTab.id !== activeTabId) { setActiveTabId(activeTab.id); return; }
    try { localStorage.setItem(ACTIVE_DASHBOARD_KEY, activeTab.id); } catch { /* ignore */ }
    if (searchParams.get("dashboard") !== activeTab.id) {
      const next = new URLSearchParams(searchParams);
      next.set("dashboard", activeTab.id);
      setSearchParams(next, { replace: true });
    }
  }, [activeTab.id, activeTabId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const fromUrl = searchParams.get("dashboard");
    if (fromUrl && fromUrl !== activeTabId && allTabs.some((t) => t.id === fromUrl)) setActiveTabId(fromUrl);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const builtInTabs = allTabs.filter((t) => !t.isCustom);
  const customTabs = allTabs.filter((t) => t.isCustom);
  // The built-in dashboards always fit; custom dashboards join the segmented control only while there is room, the rest go into "More".
  const budget = vw - 256 - 96 - 620 - 230; // content width minus the built-in toggles and the More / + / Filters buttons
  const customWidth = (t: TabConfig) => t.label.length * 6.8 + 30;
  const segmentCustom: TabConfig[] = [];
  let used = 0;
  customTabs.forEach((t) => {
    if (t.id === activeTab.id || used + customWidth(t) <= budget) { segmentCustom.push(t); used += customWidth(t); }
  });
  const segmentTabs = [...builtInTabs, ...segmentCustom];
  const moreItems = customTabs.filter((t) => !segmentCustom.some((s) => s.id === t.id));

  // dashboards
  const handleSaveDashboard = (dash: CustomDashboard) => {
    const existing = getCustomDashboards(orgId);
    const idx = existing.findIndex((d) => d.id === dash.id);
    const updated = idx >= 0 ? existing.map((d, i) => (i === idx ? dash : d)) : [...existing, dash];
    saveCustomDashboards(updated);
    setCustomDashboards(updated);
    setActiveTabId(dash.id);
  };
  const handleDeleteDashboard = (dashId: string) => {
    if (!confirm("Are you sure you want to delete this custom dashboard?")) return;
    const updated = getCustomDashboards(orgId).filter((d) => d.id !== dashId);
    saveCustomDashboards(updated);
    setCustomDashboards(updated);
    if (activeTabId === dashId) setActiveTabId("call_overview");
    setShowCustomMenu(false);
  };

  const setFilter = (key: keyof FilterValues, val: string) => setFilterValues((prev) => ({ ...prev, [key]: val }));
  const resetFilters = () => setFilterValues(DEFAULT_FILTERS);
  const filterActive = (k: FilterKey) => k === "date" ? filterValues.date !== "all" : (filterValues as any)[k] !== "all";
  const anyActive = activeTab.filters.some(filterActive);

  // stage names selected (calls carry names, records ids)
  const stageNameById = useMemo(() => {
    const m = new Map<string, string>();
    processes.forEach((p) => p.stages?.forEach((s) => m.set(s.id, s.name)));
    return m;
  }, [processes]);
  const stageMatch = (idOrName: unknown) => {
    if (filterValues.stage === "all") return true;
    const v = String(idOrName ?? "");
    return v === filterValues.stage || (stageNameById.get(filterValues.stage) !== undefined && v === stageNameById.get(filterValues.stage));
  };
  const memberName = (id: string) => String(teamMembers.find((m) => String(m.id) === id)?.name || "");

  const period = useMemo(() => buildPeriod(filterValues.date, filterValues.customFrom, filterValues.customTo), [filterValues.date, filterValues.customFrom, filterValues.customTo]);

  const dataContext: DashboardDataContext = useMemo(() => {
    const f = filterValues;
    const procById = new Map(processes.map((p) => [p.id, p]));
    const channelIsCall = f.channel === "all" || f.channel === "voice";

    const fCalls = !channelIsCall ? [] : calls.filter((c: any) => {
      if (f.process !== "all" && c.processId !== f.process) return false;
      if (!stageMatch(c.stageId || c.currentStage)) return false;
      const dir = String(c.direction || c.type || "").toLowerCase();
      if (f.direction !== "all" && !dir.includes(f.direction === "inbound" ? "in" : "out")) return false;
      if (f.teamMember !== "all" && c.assignedTo !== f.teamMember && c.agentId !== f.teamMember) return false;
      return true;
    });
    const fConvs = conversations.filter((c) => (f.channel === "all" ? true : f.channel === "voice" ? false : c.channel === f.channel));
    const fClaims = claims.filter((c) => {
      if (f.payer !== "all" && !(c.payer?.id === f.payer || c.payer?.name === f.payer || c.payer?.payerId === f.payer)) return false;
      if (f.process !== "all" && c.processId !== f.process) return false;
      if (f.provider !== "all" && c.renderingProviderName !== f.provider) return false;
      if (!stageMatch(c.currentStageId || c.statusLabel)) return false;
      return true;
    });
    const fAr = arRecords.filter((ar) => {
      if (f.payer !== "all" && ar.payerId !== f.payer && ar.payerName !== f.payer) return false;
      if (f.agingBucket !== "all") { const d = ar.ageInDays || 0; const b = d <= 30 ? "0-30" : d <= 60 ? "31-60" : d <= 90 ? "61-90" : d <= 120 ? "91-120" : "120+"; if (b !== f.agingBucket) return false; }
      if (f.assignee !== "all" && ar.assigneeId !== f.assignee && ar.assigneeName !== memberName(f.assignee)) return false;
      if (f.process !== "all" && ar.processId !== f.process) return false;
      if (!stageMatch(ar.currentStageId || ar.statusLabel)) return false;
      return true;
    });
    const fRules = rules.filter((r) => {
      if (f.rule !== "all" && r.id !== f.rule) return false;
      if (f.trigger !== "all" && r.trigger?.event !== f.trigger) return false;
      if (f.entity !== "all" && r.entityType !== f.entity) return false;
      return true;
    });
    const ruleIds = new Set(fRules.map((r) => r.id));
    const fRuns = runs.filter((r) => {
      if (f.status !== "all" && r.status !== f.status) return false;
      if ((f.rule !== "all" || f.trigger !== "all" || f.entity !== "all") && !(r.ruleId && ruleIds.has(r.ruleId))) return false;
      return true;
    });

    // records moving through workflows
    const mk = (entity: string, id: string, processId: string, stageId: string, label: string | undefined, owner: string | undefined, created: unknown, updated: unknown): WorkflowRecord | null => {
      const p = procById.get(processId);
      const st = p?.stages?.find((s) => s.id === stageId) || p?.stages?.find((s) => s.name === label);
      if (!p) return null;
      return { id, entity, processId, processName: p.name, stageId: st?.id || stageId, stageName: st?.name || label || "No stage", stageCategory: (st as any)?.stageCategory || "in_progress", owner, createdAt: parseTs(created), updatedAt: parseTs(updated) };
    };
    const recs: WorkflowRecord[] = [];
    claims.forEach((c) => { const r = mk("claim", c.id, c.processId || "", c.currentStageId || "", c.statusLabel, c.assignee, c.createdAt, c.updatedAt); if (r) recs.push(r); });
    arRecords.forEach((a) => { const r = mk("ar", a.id, a.processId, a.currentStageId, a.statusLabel, a.assigneeName, a.createdAt, a.updatedAt); if (r) recs.push(r); });
    appointments.forEach((a) => { const r = mk("appointment", String(a.id), a.processId || "", a.currentStageId || "", a.statusLabel, a.employeeName, a.createdAt, a.updatedAt); if (r) recs.push(r); });
    invoices.forEach((i) => { const r = mk("invoice", String(i.id), i.processId || "", i.currentStageId || "", i.statusLabel, i.createdBy, i.createdAt, i.createdAt); if (r) recs.push(r); });
    const fRecords = recs.filter((r) => {
      if (f.entity !== "all" && r.entity !== f.entity) return false;
      if (f.process !== "all" && r.processId !== f.process) return false;
      if (!stageMatch(r.stageId)) return false;
      if (f.owner !== "all" && r.owner !== memberName(f.owner)) return false;
      return true;
    });
    const fMoves = stageMoves.filter((m) => {
      if (f.process !== "all" && m.processId !== f.process) return false;
      if (f.entity !== "all" && m.recordType !== f.entity && !(f.entity === "ar" && m.recordType === ("ar" as any))) return false;
      if (!stageMatch(m.toStageId)) return false;
      return true;
    });

    return {
      calls: fCalls, claims: fClaims, arRecords: fAr, processes, rules: fRules, conversations: fConvs, runs: fRuns, stageMoves: fMoves, tasks,
      records: fRecords, members: teamMembers.map((m) => ({ id: m.id, name: m.name || m.email || "" })), period, filterValues,
    };
  }, [calls, claims, arRecords, processes, rules, conversations, runs, stageMoves, tasks, appointments, invoices, teamMembers, period, filterValues]); // eslint-disable-line react-hooks/exhaustive-deps

  // filter option lists
  const stageOptions = useMemo(() => {
    const list = filterValues.process === "all" ? processes.flatMap((p) => p.stages || []) : processes.find((p) => p.id === filterValues.process)?.stages || [];
    const seen = new Set<string>();
    return list.filter((s) => (seen.has(s.name) ? false : (seen.add(s.name), true)));
  }, [processes, filterValues.process]);
  const triggerOptions = useMemo(() => Array.from(new Set(rules.map((r) => r.trigger?.event).filter(Boolean) as string[])), [rules]);
  const payerOptions = useMemo(() => {
    const m = new Map<string, string>();
    payers.forEach((p) => m.set(p.id, p.name));
    claims.forEach((c) => { if (c.payer?.id && c.payer?.name) m.set(c.payer.id, c.payer.name); });
    arRecords.forEach((a) => { if (a.payerId && a.payerName) m.set(a.payerId, a.payerName); });
    return Array.from(m, ([value, label]) => ({ value, label }));
  }, [payers, claims, arRecords]);
  const providerOptions = useMemo(() => Array.from(new Set(claims.map((c) => c.renderingProviderName).filter(Boolean))).map((p) => ({ value: p, label: p })), [claims]);
  const memberOptions = teamMembers.map((m) => ({ value: String(m.id), label: String(m.name || m.email || m.id) }));
  const humanTrigger = (t: string) => t.replace(/[._-]+/g, " ").replace(/^./, (c) => c.toUpperCase());
  const all = (label: string, rest: Array<{ value: string; label: string }>) => [{ value: "all", label }, ...rest];

  const renderFilter = (k: FilterKey) => {
    const v = (filterValues as any)[k] as string;
    switch (k) {
      case "date":
        return (
          <React.Fragment key={k}>
            <FilterPill label="Date" value={v} onChange={(x) => setFilter("date", x)} options={DATE_OPTIONS} testId="ov-filter-date" />
            {filterValues.date === "custom" && (
              <span className="inline-flex items-center gap-1.5 shrink-0">
                <input type="date" value={filterValues.customFrom} onChange={(e) => setFilter("customFrom", e.target.value)} className="h-[36px] rounded-full border border-border bg-white px-3 text-xs shadow-2xs" />
                <span className="text-xs text-slate-400">to</span>
                <input type="date" value={filterValues.customTo} onChange={(e) => setFilter("customTo", e.target.value)} className="h-[36px] rounded-full border border-border bg-white px-3 text-xs shadow-2xs" />
              </span>
            )}
          </React.Fragment>
        );
      case "process": return <FilterPill key={k} label={activeTab.id === "revenue" ? "Workflow" : "Process"} value={v} onChange={(x) => { setFilter("process", x); setFilter("stage", "all"); }} options={all("All", processes.map((p) => ({ value: p.id, label: p.name })))} />;
      case "stage": return <FilterPill key={k} label="Stage" value={v} onChange={(x) => setFilter("stage", x)} options={all("All", stageOptions.map((s) => ({ value: s.id, label: s.name })))} />;
      case "direction": return <FilterPill key={k} label="Direction" value={v} onChange={(x) => setFilter("direction", x)} options={all("All", [{ value: "inbound", label: "Inbound" }, { value: "outbound", label: "Outbound" }])} />;
      case "teamMember": return <FilterPill key={k} label="Member" value={v} onChange={(x) => setFilter("teamMember", x)} options={all("All", memberOptions)} />;
      case "channel": return <FilterPill key={k} label="Channel" value={v} onChange={(x) => setFilter("channel", x)} options={all("All", [{ value: "voice", label: "Voice" }, { value: "whatsapp", label: "WhatsApp" }, { value: "sms", label: "SMS" }, { value: "email", label: "Email" }, { value: "website", label: "Website chat" }, { value: "companion", label: "Companion chat" }])} />;
      case "entity": return <FilterPill key={k} label="Entity" value={v} onChange={(x) => setFilter("entity", x)} options={all("All", activeTab.id === "automation" ? [{ value: "appointment", label: "Appointment" }, { value: "claim", label: "Claim" }, { value: "client", label: "Client" }, { value: "invoice", label: "Invoice" }] : [{ value: "appointment", label: "Appointment" }, { value: "claim", label: "Claim" }, { value: "ar", label: "A/R" }, { value: "invoice", label: "Invoice" }])} />;
      case "owner": return <FilterPill key={k} label="Owner" value={v} onChange={(x) => setFilter("owner", x)} options={all("All", memberOptions)} />;
      case "rule": return <FilterPill key={k} label="Rule" value={v} onChange={(x) => setFilter("rule", x)} options={all("All", rules.map((r) => ({ value: r.id, label: r.name })))} />;
      case "trigger": return <FilterPill key={k} label="Trigger" value={v} onChange={(x) => setFilter("trigger", x)} options={all("All", triggerOptions.map((t) => ({ value: t, label: humanTrigger(t) })))} />;
      case "status": return <FilterPill key={k} label="Status" value={v} onChange={(x) => setFilter("status", x)} options={all("All", [{ value: "success", label: "Succeeded" }, { value: "failed", label: "Failed" }])} />;
      case "payer": return <FilterPill key={k} label="Payer" value={v} onChange={(x) => setFilter("payer", x)} options={all("All", payerOptions)} />;
      case "provider": return <FilterPill key={k} label="Provider" value={v} onChange={(x) => setFilter("provider", x)} options={all("All", providerOptions)} />;
      case "agingBucket": return <FilterPill key={k} label="Aging" value={v} onChange={(x) => setFilter("agingBucket", x)} options={all("All", ["0-30", "31-60", "61-90", "91-120", "120+"].map((b) => ({ value: b, label: `${b} days` })))} />;
      case "assignee": return <FilterPill key={k} label="Assignee" value={v} onChange={(x) => setFilter("assignee", x)} options={all("All", memberOptions)} />;
      default: return null;
    }
  };

  const openCreate = () => { setEditingDashboard(null); setIsCreateDrawerOpen(true); };

  // ── dashboard body ────────────────────────────────────────────────────────────────────────────
  const body = (() => {
    if (!ready) {
      return (
        <div className="space-y-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>{[0, 1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}</div>
          <div className="grid grid-cols-12 gap-4">{[8, 4, 4, 4, 4].map((s, i) => <div key={i} className={`col-span-12 ${SPAN_CLASS[s]}`}><SkeletonCard tall /></div>)}</div>
        </div>
      );
    }
    if (activeTab.widgetIds.length === 0) {
      return (
        <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white border border-dashed border-slate-300 rounded-2xl">
          <Sparkles className="w-8 h-8 text-blue-500 mb-2" />
          <h3 className="text-sm font-bold text-slate-800">No widgets on this dashboard</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">Choose the KPIs and charts this dashboard should show.</p>
          {activeTab.isCustom && (
            <button type="button" onClick={() => { const found = customDashboards.find((d) => d.id === activeTab.id); if (found) { setEditingDashboard(found); setIsCreateDrawerOpen(true); } }} className="mt-4 h-9 px-4 text-xs font-semibold text-white bg-[#1E293B] rounded-full hover:bg-black">
              Configure widgets
            </button>
          )}
        </div>
      );
    }
    // consecutive KPI widgets form one row of equal tiles, charts follow the 12-column grid
    const groups: Array<{ kpi: boolean; ids: string[] }> = [];
    activeTab.widgetIds.forEach((id) => {
      const w = WIDGET_REGISTRY[id];
      if (!w) return;
      const isK = w.type === "kpi";
      const last = groups[groups.length - 1];
      if (last && last.kpi === isK) last.ids.push(id); else groups.push({ kpi: isK, ids: [id] });
    });
    return (
      <div className="space-y-4">
        {groups.map((g, gi) =>
          g.kpi ? (
            <div key={gi} className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
              {g.ids.map((id) => <div key={id} className="min-w-0 flex flex-col [&>*]:flex-1">{WIDGET_REGISTRY[id].render(dataContext)}</div>)}
            </div>
          ) : (
            <div key={gi} className="grid grid-cols-12 gap-4">
              {g.ids.map((id) => <div key={id} className={`col-span-12 ${SPAN_CLASS[spanOf(WIDGET_REGISTRY[id])]} min-w-0 flex flex-col [&>*]:flex-1`}>{WIDGET_REGISTRY[id].render(dataContext)}</div>)}
            </div>
          )
        )}
      </div>
    );
  })();

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <style>{`@keyframes ovFade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }`}</style>
      <PageHeader title="Overview" subtitle="Calls, conversations, workflows, automation, revenue and A/R at a glance. Pick a dashboard, then narrow it with the filters." />
      <div className="px-10 sm:px-12 py-7.5 sm:py-8 w-full space-y-5">
        <PageTopBar
          showSearch={false}
          modes={segmentTabs.map((t) => ({ id: t.id, label: t.label }))}
          activeMode={activeTab.id}
          onModeChange={(id) => setActiveTabId(id)}
          moreLabel="Filters"
          leftElement={
            <div className="flex items-center gap-1.5 shrink-0">
              {moreItems.length > 0 && (
                <div className="relative" ref={moreRef}>
                  <button type="button" onClick={() => setShowMoreMenu((p) => !p)} className="h-[36px] px-3 rounded-full border border-border bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 shadow-2xs cursor-pointer" style={{ fontFamily: "Outfit, sans-serif" }} data-testid="ov-more-dashboards">
                    <span>More</span><ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  {showMoreMenu && (
                    <div className="absolute left-0 top-full mt-2 w-52 bg-white border border-border rounded-xl shadow-2xl z-50 p-1.5 max-h-64 overflow-y-auto">
                      {moreItems.map((t) => (
                        <button key={t.id} type="button" onClick={() => { setActiveTabId(t.id); setShowMoreMenu(false); }} className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-blue-500 shrink-0" /><span className="truncate">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {activeTab.isCustom && (
                <div className="relative" ref={customRef}>
                  <button type="button" onClick={() => setShowCustomMenu((p) => !p)} className="w-[36px] h-[36px] rounded-full border border-border bg-white hover:bg-slate-50 text-slate-500 inline-flex items-center justify-center shadow-2xs cursor-pointer" aria-label="Dashboard options">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  {showCustomMenu && (
                    <div className="absolute left-0 top-full mt-2 w-40 bg-white border border-border rounded-xl shadow-2xl z-50 p-1.5">
                      <button type="button" onClick={() => { const found = customDashboards.find((d) => d.id === activeTab.id); if (found) { setEditingDashboard(found); setIsCreateDrawerOpen(true); } setShowCustomMenu(false); }} className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Edit2 className="w-3.5 h-3.5 text-slate-500" />Edit widgets</button>
                      <button type="button" onClick={() => handleDeleteDashboard(activeTab.id)} className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" />Delete</button>
                    </div>
                  )}
                </div>
              )}
              <Tooltip text="Create dashboard">
                <button type="button" onClick={openCreate} className="w-[36px] h-[36px] rounded-full border border-border bg-white hover:bg-slate-50 text-slate-600 inline-flex items-center justify-center shadow-2xs cursor-pointer" aria-label="Create dashboard" data-testid="ov-create-dashboard">
                  <Plus className="w-4 h-4" />
                </button>
              </Tooltip>
            </div>
          }
          secondaryActions={
            <div className="flex items-center gap-2 justify-end flex-wrap md:flex-nowrap" data-testid="ov-filters">
              {activeTab.filters.map(renderFilter)}
              {anyActive && (
                <button type="button" onClick={resetFilters} className="h-[36px] px-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 cursor-pointer shrink-0" data-testid="ov-reset">
                  <RotateCcw className="w-3 h-3" />Reset
                </button>
              )}
            </div>
          }
        />
        <div key={activeTab.id} style={{ animation: "ovFade 200ms ease-out" }}>{body}</div>
      </div>

      <CreateDashboardDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => { setIsCreateDrawerOpen(false); setEditingDashboard(null); }}
        onSave={handleSaveDashboard}
        dashboardToEdit={editingDashboard}
        orgId={orgId}
      />
    </div>
  );
}
