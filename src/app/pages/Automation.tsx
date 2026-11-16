import React, { useState, useMemo, useEffect } from "react";
import {
  Zap,
  Plus,
  Trash2,
  Pencil,
  Activity,
  PlayCircle,
  AlertCircle,
} from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import PageTopBar from "../components/layout/PageTopBar";
import TableComponent, { TableColumn, TableRowAction } from "../components/ui/TableComponent";
import AddAutomationDrawer, { STEP_ALLOWED_TRIGGERS } from "../components/process/AddAutomationDrawer";
import type { WorkflowStep } from "../types/workflow";
import type { EventTriggerType } from "../types/automation";
import { GLOBAL_TRIGGER_CATALOG } from "../types/automation";
import {
  useAutomationRules,
  AutomationRule,
  isAutomationRuleMatchingScope,
  isClientAutomationRule,
  isAdminAutomationRule,
} from "../../lib/useAutomationStore";
import { useProcessStore, isProcessMatchingOrg } from "../../lib/useProcessStore";
import { useOrganization } from "../context/OrganizationContext";
import { toast } from "sonner";
import ActionRunsPanel from "../components/automation/ActionRunsPanel";
import { runDaily } from "../../lib/rcmJobs";
import { buildRulePatch, ruleToInitialAutomation } from "../../lib/automationRuleMapping";

/** Real name of a trigger event (catalog label, else the event written out in words). */
const triggerLabel = (ev: string) =>
  GLOBAL_TRIGGER_CATALOG.flatMap((c) => c.events).find((e) => e.event === ev)?.label ||
  ev.replace(/[._]+/g, " ").replace(/^./, (m) => m.toUpperCase());

export default function Automation() {
  const { processes } = useProcessStore();
  const { rules, createRule, updateRule, deleteRule, toggleRule } = useAutomationRules();
  const { activeOrganization } = useOrganization();

  // Filter state
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused" | "failed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [triggerFilter, setTriggerFilter] = useState("all");
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null);
  const [isCreatingNewRule, setIsCreatingNewRule] = useState(false);
  const [isAddAutomationDrawerOpen, setIsAddAutomationDrawerOpen] = useState(false);

  // Scoped client processes
  const clientProcesses = useMemo(() => {
    if (!activeOrganization) return processes;
    return processes.filter((p) => isProcessMatchingOrg(p, activeOrganization));
  }, [processes, activeOrganization]);

  // Filtered rules list (client personal customizations + active organization product rules)
  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      if (statusFilter === "active" && !r.enabled) return false;
      if (statusFilter === "paused" && r.enabled) return false;
      if (statusFilter === "failed" && r.health !== "failed") return false;
      if (entityFilter !== "all" && (r.entityType || "client") !== entityFilter) return false;
      if (triggerFilter !== "all" && r.trigger.event !== triggerFilter) return false;

      // Product-level rules must match active organization scope
      if (isAdminAutomationRule(r) && activeOrganization) {
        const matchesScope = isAutomationRuleMatchingScope(r, {
          category: activeOrganization.industryCategory,
          industry: activeOrganization.industry,
          location: activeOrganization.location || (activeOrganization.locations && activeOrganization.locations[0]),
        });
        if (!matchesScope) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = r.name.toLowerCase().includes(q);
        const triggerMatch = (r.trigger.label || r.trigger.event).toLowerCase().includes(q);
        const descMatch = (r.description || "").toLowerCase().includes(q);
        if (!nameMatch && !triggerMatch && !descMatch) return false;
      }
      return true;
    });
  }, [rules, statusFilter, entityFilter, triggerFilter, searchQuery, activeOrganization]);

  const entityOptions = useMemo(() => Array.from(new Set(rules.map((r) => r.entityType || "client"))).sort(), [rules]);
  const triggerOptions = useMemo(() => Array.from(new Set(rules.map((r) => r.trigger.event))).sort(), [rules]);

  // Automation stats for capsule pills
  const stats = useMemo(() => {
    const total = rules.length;
    const active = rules.filter((r) => r.enabled).length;
    const paused = total - active;
    const failed = rules.filter((r) => r.health === "failed").length;

    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const runsCount = rules.filter((r) => {
      if (!r.lastRunAt) return false;
      const t = new Date(r.lastRunAt).getTime();
      return !isNaN(t) && t >= oneWeekAgo;
    }).length;

    return {
      total,
      active,
      paused,
      failed,
      runsThisWeek: runsCount,
    };
  }, [rules]);

  // Set default active rule
  useEffect(() => {
    if (isCreatingNewRule) return;
    if (!activeRuleId && filteredRules.length > 0) {
      setActiveRuleId(filteredRules[0].id);
    } else if (activeRuleId && !rules.some((r) => r.id === activeRuleId) && filteredRules.length > 0) {
      setActiveRuleId(filteredRules[0].id);
    }
  }, [filteredRules, activeRuleId, rules, isCreatingNewRule]);

  const activeRule = useMemo(() => {
    if (isCreatingNewRule) return null;
    return rules.find((r) => r.id === activeRuleId) || null;
  }, [rules, activeRuleId, isCreatingNewRule]);

  // Workflow steps bound directly to the active rule without any hardcoded mock injections
  const activeWorkflowSteps: WorkflowStep[] = useMemo(() => {
    if (isCreatingNewRule || !activeRule) return [];
    return activeRule.actions || [];
  }, [activeRule, isCreatingNewRule]);

  const initialAutomationData = useMemo(() => {
    if (isCreatingNewRule || !activeRule) return null;
    return ruleToInitialAutomation(activeRule);
  }, [isCreatingNewRule, activeRule]);

  // Open flow builder view in creation mode without saving until the user explicitly clicks Save
  const handleCreateNewRule = () => {
    setIsCreatingNewRule(true);
    setActiveRuleId(null);
    setIsAddAutomationDrawerOpen(true);
  };

  // Table Columns (no entity column)
  const ruleColumns: TableColumn<AutomationRule>[] = [
    {
      id: "name",
      header: "Rule Name",
      align: "left",
      width: "45%",
      render: (rule) => (
        <div className="flex flex-col py-0.5">
          <span
            className="font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer text-xs sm:text-sm"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {rule.name}
          </span>
          {rule.description && (
            <span className="text-[11px] text-gray-500 truncate max-w-md">
              {rule.description}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "trigger",
      header: "Trigger Event",
      align: "left",
      width: "30%",
      render: (rule) => {
        const catalogEvt = GLOBAL_TRIGGER_CATALOG.flatMap((c) => c.events).find(
          (e) => e.event === rule.trigger.event
        );
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-700 font-medium">
            <Zap className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">
              {catalogEvt?.label || rule.trigger.label || rule.trigger.event || "Custom Trigger"}
            </span>
          </span>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      align: "center",
      width: "12%",
      render: (rule) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleRule(rule.id);
          }}
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
            rule.enabled
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
              : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
          }`}
        >
          {rule.enabled ? "Active" : "Paused"}
        </button>
      ),
    },
    {
      id: "lastRunAt",
      header: "Last Run",
      align: "left",
      width: "13%",
      render: (rule) => (
        <span className="text-xs text-gray-500 font-mono">
          {rule.lastRunAt
            ? new Date(rule.lastRunAt).toLocaleDateString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—"}
        </span>
      ),
    },
  ];

  const ruleRowActions: TableRowAction<AutomationRule>[] = [
    {
      label: "View / Edit Rule",
      icon: <Pencil className="w-3.5 h-3.5" />,
      onClick: (rule) => {
        setIsCreatingNewRule(false);
        setActiveRuleId(rule.id);
        setIsAddAutomationDrawerOpen(true);
      },
    },
    {
      label: "Delete Rule",
      icon: <Trash2 className="w-3.5 h-3.5 text-red-600" />,
      isDanger: true,
      onClick: (rule) => {
        if (confirm(`Delete rule "${rule.name}"?`)) {
          deleteRule(rule.id);
          toast.success("Rule deleted");
        }
      },
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="px-10 sm:px-12 py-7.5 sm:py-8 w-full space-y-7">
        {/* Top Header */}
        <PageHeader
          title="Automations"
          subtitle="Visual rule engine connecting lifecycle events directly to pipeline actions."
        />

        <ActionRunsPanel />

        {/* Stats Cards — thin capsule style matching WebForms */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {/* Pill 1: Total Automations */}
          <div
            onClick={() => setStatusFilter("all")}
            className="bg-white border border-border shadow-xs rounded-xl px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center gap-1.5 shrink-0">
              <Activity className="w-3.5 h-3.5 text-blue-500" />
              <span
                className="text-[10px] font-semibold uppercase tracking-wide shrink-0 whitespace-nowrap"
                style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}
              >
                TOTAL AUTOMATIONS
              </span>
            </div>
            <span
              className="text-base font-bold flex-1 text-center"
              style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}
            >
              {stats.total}
            </span>
            <span
              className="text-[10px] shrink-0 whitespace-nowrap"
              style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}
            >
              {stats.paused > 0 ? `${stats.paused} paused` : "all active"}
            </span>
          </div>

          {/* Pill 2: Active */}
          <div
            onClick={() => setStatusFilter("active")}
            className="bg-white border border-border shadow-xs rounded-xl px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center gap-1.5 shrink-0">
              <PlayCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span
                className="text-[10px] font-semibold uppercase tracking-wide shrink-0"
                style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}
              >
                ACTIVE
              </span>
            </div>
            <span
              className="text-base font-bold flex-1 text-center"
              style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}
            >
              {stats.active}
            </span>
            <span
              className="text-[10px] shrink-0 whitespace-nowrap"
              style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}
            >
              {stats.active} live
            </span>
          </div>

          {/* Pill 3: Runs this week */}
          <div
            className="bg-white border border-border shadow-xs rounded-xl px-3 py-1.5 flex items-center gap-2 hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center gap-1.5 shrink-0">
              <Zap className="w-3.5 h-3.5 text-blue-500" />
              <span
                className="text-[10px] font-semibold uppercase tracking-wide shrink-0"
                style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}
              >
                RUNS THIS WEEK
              </span>
            </div>
            <span
              className="text-base font-bold flex-1 text-center"
              style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}
            >
              {stats.runsThisWeek}
            </span>
            <span
              className="text-[10px] shrink-0 whitespace-nowrap"
              style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}
            >
              7d total
            </span>
          </div>

          {/* Pill 4: Failed Automations */}
          <div
            onClick={() => setStatusFilter("failed")}
            className="bg-white border border-border shadow-xs rounded-xl px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center gap-1.5 shrink-0">
              <AlertCircle className={`w-3.5 h-3.5 ${stats.failed > 0 ? "text-rose-500" : "text-gray-400"}`} />
              <span
                className="text-[10px] font-semibold uppercase tracking-wide shrink-0"
                style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}
              >
                FAILED
              </span>
            </div>
            <span
              className="text-base font-bold flex-1 text-center"
              style={{ fontFamily: "DM Sans, sans-serif", color: stats.failed > 0 ? "#E11D48" : "#020817" }}
            >
              {stats.failed}
            </span>
            <span
              className="text-[10px] shrink-0 whitespace-nowrap"
              style={{ fontFamily: "Outfit, sans-serif", color: stats.failed > 0 ? "#E11D48" : "#94A3B8" }}
            >
              {stats.failed > 0 ? "Needs action" : "All healthy"}
            </span>
          </div>
        </div>

        {/* Action Bar powered by PageTopBar without entity modes */}
        <PageTopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search rules, events, triggers..."
          filterPresets={[
            {
              id: "all",
              label: "All Rules",
              count: rules.length,
              isActive: statusFilter === "all",
              onClick: () => setStatusFilter("all"),
            },
            {
              id: "active",
              label: "Active",
              count: rules.filter((r) => r.enabled).length,
              isActive: statusFilter === "active",
              onClick: () => setStatusFilter("active"),
            },
            {
              id: "paused",
              label: "Paused",
              count: rules.filter((r) => !r.enabled).length,
              isActive: statusFilter === "paused",
              onClick: () => setStatusFilter("paused"),
            },
            {
              id: "failed",
              label: "Failed",
              count: stats.failed,
              isActive: statusFilter === "failed",
              onClick: () => setStatusFilter("failed"),
            },
          ]}
          secondaryActions={
            <div className="flex items-center gap-2" data-testid="automation-filters">
              <select aria-label="Entity" data-testid="automation-filter-entity" value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} className="h-[36px] text-xs px-3 bg-white border border-border rounded-xl font-semibold text-gray-700 outline-none cursor-pointer shadow-2xs" style={{ fontFamily: "Outfit, sans-serif" }}>
                <option value="all">All entities</option>
                {entityOptions.map((en) => <option key={en} value={en}>{en.charAt(0).toUpperCase() + en.slice(1)}</option>)}
              </select>
              <select aria-label="Trigger" data-testid="automation-filter-trigger" value={triggerFilter} onChange={(e) => setTriggerFilter(e.target.value)} className="h-[36px] text-xs px-3 bg-white border border-border rounded-xl font-semibold text-gray-700 outline-none cursor-pointer shadow-2xs" style={{ fontFamily: "Outfit, sans-serif" }}>
                <option value="all">All triggers</option>
                {triggerOptions.map((t) => <option key={t} value={t}>{triggerLabel(t)}</option>)}
              </select>
              <select aria-label="Status" data-testid="automation-filter-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="h-[36px] text-xs px-3 bg-white border border-border rounded-xl font-semibold text-gray-700 outline-none cursor-pointer shadow-2xs" style={{ fontFamily: "Outfit, sans-serif" }}>
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          }
          afterPrimaryAction={
            <button
              type="button"
              data-testid="run-daily-jobs"
              title="Runs every daily job once, now (the rule engine has no scheduler)"
              onClick={async () => {
                const r = await runDaily();
                toast.success(`Daily jobs ran: ${r.emitted} record${r.emitted === 1 ? "" : "s"} processed`);
              }}
              className="px-3 h-[36px] text-xs font-semibold rounded-lg border border-border bg-white hover:bg-slate-50 shadow-2xs"
            >
              Run daily jobs now
            </button>
          }
          primaryAction={{
            label: "New Rule",
            icon: <Plus className="w-3.5 h-3.5" />,
            onClick: handleCreateNewRule,
          }}
        />

        {/* Rules Table View — Separate standalone TableComponent */}
        <TableComponent
          data={filteredRules}
          columns={ruleColumns}
          getRowId={(rule) => rule.id}
          rowActions={ruleRowActions}
          onRowClick={(rule) => {
            setIsCreatingNewRule(false);
            setActiveRuleId(rule.id);
            setIsAddAutomationDrawerOpen(true);
          }}
          defaultRowsPerPage={15}
          emptyMessage="No automation rules found. Click 'New Rule' to create one."
          tableId="automation-rules-table"
        />
      </div>

      {/* Add Automation Drawer (Global Scope) */}
      {isAddAutomationDrawerOpen && (
        <AddAutomationDrawer
          isOpen={isAddAutomationDrawerOpen}
          onClose={() => {
            setIsAddAutomationDrawerOpen(false);
            setIsCreatingNewRule(false);
          }}
          scope="global"
          defaultView="flowbuilder"
          processes={clientProcesses}
          initialAutomation={initialAutomationData}
          processName={!isCreatingNewRule && activeRule ? activeRule.name : "New Global Automation"}
          workflowSteps={!isCreatingNewRule && activeRule ? activeWorkflowSteps : []}
          onSaveAutomation={(saved) => {
          const patch = buildRulePatch(saved, isCreatingNewRule ? null : activeRule);

          if (isCreatingNewRule || !activeRule) {
            try {
              const created = createRule({
                orgId: activeOrganization?.id || "default",
                name: saved.name || "New Automation",
                description: saved.description || "",
                entityType: patch.entityType,
                isAdmin: false,
                createdIn: "client",
                isClientCustomization: true,
                source: "custom",
                trigger: { ...patch.trigger, event: patch.trigger.event || "call.inbound" },
                action: patch.action,
                actions: patch.actions,
                enabled: saved.status === "active",
                health: "ok",
              });
              setActiveRuleId(created.id);
              setIsCreatingNewRule(false);
            } catch (err: any) {
              toast.error(err.message || "Failed to create rule");
            }
          } else {
            try {
              updateRule(activeRule.id, {
                name: saved.name,
                description: saved.description,
                enabled: saved.status === "active",
                entityType: patch.entityType,
                isAdmin: false,
                createdIn: "client",
                isClientCustomization: true,
                source: "custom",
                trigger: patch.trigger,
                action: patch.action,
                actions: patch.actions,
                updatedAt: new Date().toISOString(),
              });
              setIsCreatingNewRule(false);
            } catch (err: any) {
              toast.error(err.message || "Failed to update rule");
            }
          }
        }}
        stepAllowedTriggers={STEP_ALLOWED_TRIGGERS}
      />
      )}
    </div>
  );
}
