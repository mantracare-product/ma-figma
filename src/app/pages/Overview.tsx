import React, { useState, useMemo, useEffect, useRef } from "react";
import { PageTopBar } from "../components/layout/PageTopBar";
import { useCurrentPermissions } from "@/hooks/useCurrentPermissions";
import { getCallsOnly, PROCESS_LOGS_STORE_EVENT, type CallLog } from "../../lib/processLogsStore";
import { getStoredClaims, CLAIMS_CHANGED_EVENT, type Claim } from "../../lib/claimsStore";
import { getStoredArRecords, AR_CHANGED_EVENT, type ArRecord } from "../../lib/arStore";
import { getStoredProcesses, PROCESS_STORE_EVENT, type Process } from "../../lib/useProcessStore";
import { getStoredRules, AUTOMATION_STORE_EVENT, type AutomationRule } from "../../lib/useAutomationStore";
import { getStoredTeamMembers, TEAM_STORE_EVENT, type TeamMember } from "../../lib/teamStore";
import { payersStore, type Payer } from "../../lib/billingSetupStore";
import { WIDGET_REGISTRY } from "./overview/overviewWidgets";
import CreateDashboardDrawer from "./overview/CreateDashboardDrawer";
import type {
  FilterKey,
  FilterValues,
  DashboardDataContext,
  CustomDashboard,
} from "./overview/overviewTypes";
import {
  Plus,
  ChevronDown,
  RotateCcw,
  MoreVertical,
  Edit2,
  Trash2,
  Layers,
  Sparkles,
} from "lucide-react";

const CUSTOM_DASHBOARDS_KEY = "mantra_overview_dashboards_v1";
const CUSTOM_DASHBOARDS_EVENT = "mantra_overview_dashboards_changed";

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
    filters: ["process", "stage", "date", "direction", "teamMember"],
    widgetIds: [
      "calls_total",
      "calls_completed",
      "calls_failed",
      "calls_success_rate",
      "calls_avg_duration",
      "calls_volume_chart",
      "calls_status_distribution",
    ],
  },
  {
    id: "communication",
    label: "Communication",
    filters: ["channel", "direction", "date", "teamMember"],
    widgetIds: ["comm_total_messages", "comm_inbound_outbound", "comm_channel_breakdown"],
  },
  {
    id: "workflows",
    label: "Workflows",
    filters: ["entity", "process", "stage", "date"],
    widgetIds: ["wf_active_processes", "wf_total_records", "wf_stage_distribution"],
  },
  {
    id: "automation",
    label: "Automation",
    filters: ["rule", "trigger", "date"],
    widgetIds: ["auto_total_rules", "auto_success_rate", "auto_runs_by_trigger"],
  },
  {
    id: "revenue",
    label: "Revenue",
    permissionKey: "rcmReports",
    filters: ["payer", "date"],
    widgetIds: [
      "rev_total_billed",
      "rev_total_paid",
      "rev_clean_claim_rate",
      "rev_denial_rate",
      "rev_monthly_trend",
      "rev_payer_mix",
    ],
  },
  {
    id: "ar",
    label: "A/R",
    permissionKey: "arCycle",
    filters: ["payer", "agingBucket", "assignee", "date"],
    widgetIds: ["ar_total_outstanding", "ar_avg_days", "ar_90_plus", "ar_aging_buckets_chart"],
  },
];

const DEFAULT_FILTERS: FilterValues = {
  process: "all",
  stage: "all",
  date: "all",
  customFrom: "",
  customTo: "",
  channel: "all",
  direction: "all",
  teamMember: "all",
  entity: "all",
  rule: "all",
  trigger: "all",
  payer: "all",
  agingBucket: "all",
  assignee: "all",
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

function getAgingBucket(days: number): string {
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  if (days <= 120) return "91-120";
  return "120+";
}

function isWithinDateRange(
  timestamp: number | string | undefined,
  dateFilter: string,
  customFrom?: string,
  customTo?: string
): boolean {
  if (!timestamp) return true;
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return true;
  const now = new Date();

  if (dateFilter === "today") {
    return d.toDateString() === now.toDateString();
  }
  if (dateFilter === "last_7_days") {
    const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return d >= cutoff;
  }
  if (dateFilter === "last_30_days") {
    const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return d >= cutoff;
  }
  if (dateFilter === "this_month") {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  if (dateFilter === "custom") {
    if (customFrom) {
      const fromD = new Date(customFrom);
      fromD.setHours(0, 0, 0, 0);
      if (d < fromD) return false;
    }
    if (customTo) {
      const toD = new Date(customTo);
      toD.setHours(23, 59, 59, 999);
      if (d > toD) return false;
    }
    return true;
  }
  return true;
}

export default function Overview() {
  const orgId =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("mantra_active_org_id_v1") || "default"
      : "default";
  const { hasPermission } = useCurrentPermissions();

  const [activeTabId, setActiveTabId] = useState<string>("call_overview");
  const [filterValues, setFilterValues] = useState<FilterValues>(DEFAULT_FILTERS);
  const [customDashboards, setCustomDashboards] = useState<CustomDashboard[]>(() =>
    getCustomDashboards(orgId)
  );

  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState<CustomDashboard | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showCustomTabMenu, setShowCustomTabMenu] = useState<string | null>(null);

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const customMenuRef = useRef<HTMLDivElement>(null);

  // Store data states
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [arRecords, setArRecords] = useState<ArRecord[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [payers, setPayers] = useState<Payer[]>([]);

  // Load and subscribe to store events
  useEffect(() => {
    const reload = () => {
      setCalls(getCallsOnly());
      setClaims(getStoredClaims());
      setArRecords(getStoredArRecords());
      setProcesses(getStoredProcesses());
      setRules(getStoredRules());
      setTeamMembers(getStoredTeamMembers());
      setPayers(payersStore.get());
      setCustomDashboards(getCustomDashboards(orgId));
    };

    reload();

    window.addEventListener(PROCESS_LOGS_STORE_EVENT, reload);
    window.addEventListener(CLAIMS_CHANGED_EVENT, reload);
    window.addEventListener(AR_CHANGED_EVENT, reload);
    window.addEventListener(PROCESS_STORE_EVENT, reload);
    window.addEventListener(AUTOMATION_STORE_EVENT, reload);
    window.addEventListener(TEAM_STORE_EVENT, reload);
    window.addEventListener(CUSTOM_DASHBOARDS_EVENT, reload);

    return () => {
      window.removeEventListener(PROCESS_LOGS_STORE_EVENT, reload);
      window.removeEventListener(CLAIMS_CHANGED_EVENT, reload);
      window.removeEventListener(AR_CHANGED_EVENT, reload);
      window.removeEventListener(PROCESS_STORE_EVENT, reload);
      window.removeEventListener(AUTOMATION_STORE_EVENT, reload);
      window.removeEventListener(TEAM_STORE_EVENT, reload);
      window.removeEventListener(CUSTOM_DASHBOARDS_EVENT, reload);
    };
  }, [orgId]);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
      if (customMenuRef.current && !customMenuRef.current.contains(e.target as Node)) {
        setShowCustomTabMenu(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Compute all available tabs
  const allTabs = useMemo(() => {
    const visibleBuiltIns = BUILT_IN_TABS.filter((t) => {
      if (!t.permissionKey) return true;
      return hasPermission(t.permissionKey, "read");
    });

    const customTabs: TabConfig[] = customDashboards.map((dash) => {
      const derivedFilters = Array.from(
        new Set(
          (dash.widgetIds || []).flatMap(
            (id) => WIDGET_REGISTRY[id]?.supportedFilters || []
          )
        )
      ) as FilterKey[];

      return {
        id: dash.id,
        label: dash.name,
        filters: derivedFilters,
        widgetIds: dash.widgetIds || [],
        isCustom: true,
      };
    });

    return [...visibleBuiltIns, ...customTabs];
  }, [customDashboards, hasPermission]);

  // Ensure activeTabId is valid
  useEffect(() => {
    if (!allTabs.some((t) => t.id === activeTabId)) {
      setActiveTabId("call_overview");
    }
  }, [allTabs, activeTabId]);

  const activeTab = useMemo(
    () => allTabs.find((t) => t.id === activeTabId) || allTabs[0] || BUILT_IN_TABS[0],
    [allTabs, activeTabId]
  );

  // Tab overflow handling: Show first 5 tabs, place remaining in More menu
  const MAX_PRIMARY_TABS = 5;
  const primaryTabs = allTabs.slice(0, MAX_PRIMARY_TABS);
  const moreTabs = allTabs.slice(MAX_PRIMARY_TABS);
  const isActiveInMore = moreTabs.some((t) => t.id === activeTabId);

  // Save/Update custom dashboard
  const handleSaveDashboard = (dash: CustomDashboard) => {
    const existing = getCustomDashboards(orgId);
    const idx = existing.findIndex((d) => d.id === dash.id);
    let updated: CustomDashboard[];
    if (idx >= 0) {
      updated = [...existing];
      updated[idx] = dash;
    } else {
      updated = [...existing, dash];
    }
    saveCustomDashboards(updated);
    setCustomDashboards(updated);
    setActiveTabId(dash.id);
  };

  const handleDeleteDashboard = (dashId: string) => {
    if (!confirm("Are you sure you want to delete this custom dashboard?")) return;
    const existing = getCustomDashboards(orgId);
    const updated = existing.filter((d) => d.id !== dashId);
    saveCustomDashboards(updated);
    setCustomDashboards(updated);
    if (activeTabId === dashId) {
      setActiveTabId("call_overview");
    }
    setShowCustomTabMenu(null);
  };

  // Filter handlers
  const handleFilterChange = (key: keyof FilterValues, val: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleResetFilters = () => {
    setFilterValues(DEFAULT_FILTERS);
  };

  const isAnyFilterActive = Object.entries(filterValues).some(([k, v]) => {
    if (k === "customFrom" || k === "customTo") return !!v;
    return v !== "all";
  });

  // Filtered records for DataContext
  const filteredCalls = useMemo(() => {
    return calls.filter((c) => {
      const dateVal = (c as any).createdAt || c.date;
      if (!isWithinDateRange(dateVal, filterValues.date, filterValues.customFrom, filterValues.customTo))
        return false;
      if (filterValues.process !== "all" && c.processId !== filterValues.process)
        return false;
      const stageVal = (c as any).stageId || c.currentStage;
      if (filterValues.stage !== "all" && stageVal !== filterValues.stage)
        return false;
      const dirVal = (c as any).direction || c.type || "";
      if (
        filterValues.direction !== "all" &&
        !dirVal.toLowerCase().includes(filterValues.direction.toLowerCase())
      )
        return false;
      const chanVal = (c as any).channel || "voice";
      if (
        filterValues.channel !== "all" &&
        chanVal.toLowerCase() !== filterValues.channel.toLowerCase()
      )
        return false;
      if (
        filterValues.teamMember !== "all" &&
        (c as any).assignedTo !== filterValues.teamMember &&
        (c as any).agentId !== filterValues.teamMember
      )
        return false;
      return true;
    });
  }, [calls, filterValues]);

  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      const dateVal = (c as any).createdAt || c.serviceDate;
      if (!isWithinDateRange(dateVal, filterValues.date, filterValues.customFrom, filterValues.customTo))
        return false;
      if (filterValues.payer !== "all") {
        const matchesPayer =
          c.payer?.id === filterValues.payer ||
          c.payer?.name?.toLowerCase() === filterValues.payer.toLowerCase() ||
          c.payer?.payerId === filterValues.payer;
        if (!matchesPayer) return false;
      }
      if (filterValues.process !== "all" && (c as any).processId !== filterValues.process)
        return false;
      const stageVal = (c as any).stageId || (c as any).stage;
      if (filterValues.stage !== "all" && stageVal !== filterValues.stage)
        return false;
      return true;
    });
  }, [claims, filterValues]);

  const filteredArRecords = useMemo(() => {
    return arRecords.filter((ar) => {
      const dateVal = (ar as any).createdAt || ar.dateOfService;
      if (!isWithinDateRange(dateVal, filterValues.date, filterValues.customFrom, filterValues.customTo))
        return false;
      if (
        filterValues.payer !== "all" &&
        ar.payerId !== filterValues.payer &&
        ar.payerName?.toLowerCase() !== filterValues.payer.toLowerCase()
      )
        return false;
      if (
        filterValues.agingBucket !== "all" &&
        getAgingBucket(ar.ageInDays) !== filterValues.agingBucket
      )
        return false;
      if (
        filterValues.assignee !== "all" &&
        (ar as any).assigneeId !== filterValues.assignee
      )
        return false;
      if (filterValues.process !== "all" && (ar as any).processId !== filterValues.process)
        return false;
      const stageVal = (ar as any).stageId || ar.currentStageId;
      if (filterValues.stage !== "all" && stageVal !== filterValues.stage)
        return false;
      return true;
    });
  }, [arRecords, filterValues]);

  const filteredProcesses = useMemo(() => {
    return processes.filter((p) => {
      if (filterValues.entity !== "all" && p.entityType !== filterValues.entity)
        return false;
      return true;
    });
  }, [processes, filterValues]);

  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      if (filterValues.rule !== "all" && r.id !== filterValues.rule) return false;
      if (
        filterValues.trigger !== "all" &&
        r.trigger?.event !== filterValues.trigger &&
        (r.trigger as any)?.category !== filterValues.trigger
      )
        return false;
      return true;
    });
  }, [rules, filterValues]);

  const dataContext: DashboardDataContext = useMemo(
    () => ({
      calls: filteredCalls,
      claims: filteredClaims,
      arRecords: filteredArRecords,
      processes: filteredProcesses,
      rules: filteredRules,
      filterValues,
    }),
    [filteredCalls, filteredClaims, filteredArRecords, filteredProcesses, filteredRules, filterValues]
  );

  // Available stages for the currently selected process (if any)
  const availableStages = useMemo(() => {
    if (filterValues.process === "all") {
      const stageMap = new Map<string, string>();
      processes.forEach((p) => {
        p.stages?.forEach((s) => stageMap.set(s.id, s.name));
      });
      return Array.from(stageMap.entries()).map(([id, name]) => ({ id, name }));
    }
    const proc = processes.find((p) => p.id === filterValues.process);
    return proc ? proc.stages || [] : [];
  }, [processes, filterValues.process]);

  // Distinct triggers from rules
  const availableTriggers = useMemo(() => {
    const set = new Set<string>();
    rules.forEach((r) => {
      if (r.trigger?.event) set.add(r.trigger.event);
    });
    return Array.from(set);
  }, [rules]);

  // Distinct payers list
  const allPayerOptions = useMemo(() => {
    const map = new Map<string, string>();
    payers.forEach((p) => map.set(p.id, p.name));
    claims.forEach((c) => {
      if (c.payer?.id && c.payer?.name) map.set(c.payer.id, c.payer.name);
    });
    arRecords.forEach((a) => {
      if (a.payerId && a.payerName) map.set(a.payerId, a.payerName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [payers, claims, arRecords]);

  // Grid column span mapping helper
  const getColSpanClass = (colSpan: number = 1) => {
    switch (colSpan) {
      case 1:
        return "col-span-12 sm:col-span-6 lg:col-span-3";
      case 2:
        return "col-span-12 lg:col-span-6";
      case 3:
        return "col-span-12 lg:col-span-8";
      case 4:
      case 5:
      case 6:
      default:
        return "col-span-12";
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f8fafc]">
      {/* Shared PageTopBar */}
      <PageTopBar
        leftElement={<h1 className="text-base font-bold text-slate-800">Overview</h1>}
        primaryAction={{
          label: "Create Dashboard",
          icon: <Plus className="w-4 h-4 mr-1" />,
          onClick: () => {
            setEditingDashboard(null);
            setIsCreateDrawerOpen(true);
          },
        }}
      />

      {/* Tabs and Add Dashboard Bar */}
      <div className="bg-white border-b border-slate-200 px-6 pt-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
          {primaryTabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div key={tab.id} className="relative flex items-center group">
                <button
                  type="button"
                  onClick={() => setActiveTabId(tab.id)}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? "bg-blue-50 text-blue-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  {tab.isCustom && <Layers className="w-3.5 h-3.5 text-blue-500" />}
                  <span>{tab.label}</span>
                </button>

                {tab.isCustom && isActive && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCustomTabMenu(showCustomTabMenu === tab.id ? null : tab.id);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded ml-0.5"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {showCustomTabMenu === tab.id && (
                      <div
                        ref={customMenuRef}
                        className="absolute right-0 top-full mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            const found = customDashboards.find((d) => d.id === tab.id);
                            if (found) {
                              setEditingDashboard(found);
                              setIsCreateDrawerOpen(true);
                            }
                            setShowCustomTabMenu(null);
                          }}
                          className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>Edit widgets</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDashboard(tab.id)}
                          className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* More Dropdown for Overflow Tabs */}
          {moreTabs.length > 0 && (
            <div className="relative" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setShowMoreMenu((prev) => !prev)}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  isActiveInMore
                    ? "bg-blue-50 text-blue-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                }`}
              >
                <span>{isActiveInMore ? activeTab.label : "More"}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showMoreMenu && (
                <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 max-h-60 overflow-y-auto">
                  {moreTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTabId(tab.id);
                        setShowMoreMenu(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between ${
                        tab.id === activeTabId
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="truncate">{tab.label}</span>
                      {tab.isCustom && <span className="text-[10px] text-slate-400 font-normal">Custom</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* "+" Button to Create Custom Dashboard */}
          <button
            type="button"
            onClick={() => {
              setEditingDashboard(null);
              setIsCreateDrawerOpen(true);
            }}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-dashed border-slate-300 ml-1"
            title="Create custom dashboard"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Contextual Filter Bar */}
      <div className="bg-white/80 border-b border-slate-200/80 px-6 py-2.5 flex flex-wrap items-center gap-2.5">
        {/* Date Filter */}
        {activeTab.filters.includes("date") && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Date:</span>
            <select
              value={filterValues.date}
              onChange={(e) => handleFilterChange("date", e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="last_7_days">Last 7 days</option>
              <option value="last_30_days">Last 30 days</option>
              <option value="this_month">This month</option>
              <option value="custom">Custom range</option>
            </select>
            {filterValues.date === "custom" && (
              <div className="flex items-center gap-1 ml-1">
                <input
                  type="date"
                  value={filterValues.customFrom}
                  onChange={(e) => handleFilterChange("customFrom", e.target.value)}
                  className="text-xs bg-white border border-slate-200 rounded-md px-2 py-0.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="date"
                  value={filterValues.customTo}
                  onChange={(e) => handleFilterChange("customTo", e.target.value)}
                  className="text-xs bg-white border border-slate-200 rounded-md px-2 py-0.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        )}

        {/* Process Filter */}
        {activeTab.filters.includes("process") && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Process:</span>
            <select
              value={filterValues.process}
              onChange={(e) => {
                handleFilterChange("process", e.target.value);
                handleFilterChange("stage", "all");
              }}
              className="text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[160px] truncate"
            >
              <option value="all">All processes</option>
              {processes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Stage Filter */}
        {activeTab.filters.includes("stage") && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Stage:</span>
            <select
              value={filterValues.stage}
              onChange={(e) => handleFilterChange("stage", e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[150px] truncate"
            >
              <option value="all">All stages</option>
              {availableStages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Direction Filter */}
        {activeTab.filters.includes("direction") && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Direction:</span>
            <select
              value={filterValues.direction}
              onChange={(e) => handleFilterChange("direction", e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All directions</option>
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
            </select>
          </div>
        )}

        {/* Channel Filter */}
        {activeTab.filters.includes("channel") && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Channel:</span>
            <select
              value={filterValues.channel}
              onChange={(e) => handleFilterChange("channel", e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All channels</option>
              <option value="voice">Voice</option>
              <option value="email">Email</option>
              <option value="chat">Chat</option>
              <option value="sms">SMS</option>
            </select>
          </div>
        )}

        {/* Team Member Filter */}
        {activeTab.filters.includes("teamMember") && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Member:</span>
            <select
              value={filterValues.teamMember}
              onChange={(e) => handleFilterChange("teamMember", e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[150px] truncate"
            >
              <option value="all">All members</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || m.email}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Entity Filter */}
        {activeTab.filters.includes("entity") && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Entity:</span>
            <select
              value={filterValues.entity}
              onChange={(e) => handleFilterChange("entity", e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All entities</option>
              <option value="appointment">Appointment</option>
              <option value="claim">Claim</option>
              <option value="ar">A/R</option>
              <option value="invoice">Invoice</option>
            </select>
          </div>
        )}

        {/* Rule Filter */}
        {activeTab.filters.includes("rule") && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Rule:</span>
            <select
              value={filterValues.rule}
              onChange={(e) => handleFilterChange("rule", e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[160px] truncate"
            >
              <option value="all">All rules</option>
              {rules.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Trigger Filter */}
        {activeTab.filters.includes("trigger") && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Trigger:</span>
            <select
              value={filterValues.trigger}
              onChange={(e) => handleFilterChange("trigger", e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[150px] truncate"
            >
              <option value="all">All triggers</option>
              {availableTriggers.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Payer Filter */}
        {activeTab.filters.includes("payer") && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Payer:</span>
            <select
              value={filterValues.payer}
              onChange={(e) => handleFilterChange("payer", e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[160px] truncate"
            >
              <option value="all">All payers</option>
              {allPayerOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Aging Bucket Filter */}
        {activeTab.filters.includes("agingBucket") && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Aging:</span>
            <select
              value={filterValues.agingBucket}
              onChange={(e) => handleFilterChange("agingBucket", e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All buckets</option>
              <option value="0-30">0-30 days</option>
              <option value="31-60">31-60 days</option>
              <option value="61-90">61-90 days</option>
              <option value="91-120">91-120 days</option>
              <option value="120+">120+ days</option>
            </select>
          </div>
        )}

        {/* Assignee Filter */}
        {activeTab.filters.includes("assignee") && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Assignee:</span>
            <select
              value={filterValues.assignee}
              onChange={(e) => handleFilterChange("assignee", e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[150px] truncate"
            >
              <option value="all">All assignees</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || m.email}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Reset Filter Button */}
        {isAnyFilterActive && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors ml-auto"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset filters</span>
          </button>
        )}
      </div>

      {/* Main Content Dashboard Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab.widgetIds.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white border border-dashed border-slate-300 rounded-2xl">
            <Sparkles className="w-8 h-8 text-blue-500 mb-2" />
            <h3 className="text-sm font-bold text-slate-800">No widgets on this dashboard</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Click edit to select and arrange KPIs, charts, and breakdown graphs for this dashboard.
            </p>
            {activeTab.isCustom && (
              <button
                type="button"
                onClick={() => {
                  const found = customDashboards.find((d) => d.id === activeTab.id);
                  if (found) {
                    setEditingDashboard(found);
                    setIsCreateDrawerOpen(true);
                  }
                }}
                className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Configure Widgets
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-4">
            {activeTab.widgetIds.map((widgetId) => {
              const widget = WIDGET_REGISTRY[widgetId];
              if (!widget) return null;
              const colClass = getColSpanClass(widget.colSpan);
              return (
                <div key={widget.id} className={colClass}>
                  {widget.render(dataContext)}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Dashboard Drawer */}
      <CreateDashboardDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => {
          setIsCreateDrawerOpen(false);
          setEditingDashboard(null);
        }}
        onSave={handleSaveDashboard}
        dashboardToEdit={editingDashboard}
        orgId={orgId}
      />
    </div>
  );
}
