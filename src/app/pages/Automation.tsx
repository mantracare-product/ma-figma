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
import { HowItWorksModal, HowItWorksButton } from "../components/help/HowItWorksModal";
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

export default function Automation() {
  const { processes } = useProcessStore();
  const { rules, createRule, updateRule, deleteRule, toggleRule } = useAutomationRules();
  const { activeOrganization } = useOrganization();

  // Filter state
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused" | "failed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null);
  const [isCreatingNewRule, setIsCreatingNewRule] = useState(false);
  const [isAddAutomationDrawerOpen, setIsAddAutomationDrawerOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

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
  }, [rules, statusFilter, searchQuery, activeOrganization]);

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
    return {
      id: activeRule.id,
      orgId: activeRule.orgId || "default",
      name: activeRule.name,
      description: activeRule.description,
      scope: "global" as const,
      status: activeRule.enabled ? ("active" as const) : ("draft" as const),
      trigger: {
        type: (GLOBAL_TRIGGER_CATALOG.find((c) =>
          c.events.some((e) => e.event === activeRule.trigger.event)
        )?.type || "call") as EventTriggerType,
        event: activeRule.trigger.event,
      },
      steps: (activeRule.actions || []).map((s, idx) => ({
        ...s,
        id: s.id,
        name: s.name,
        stepKey: s.stepKey,
        iconKey: s.iconKey,
        kind: (s.kind || (s.executionType === "parallel" ? "parallel" : "wait")) as any,
        executionType: s.executionType || "wait",
        branches: s.branches,
        delay:
          (s.delayValue ?? 0) > 0
            ? { value: s.delayValue!, unit: (s.delayUnit as any) || "minutes" }
            : undefined,
        params: s.params || {},
        order: idx + 1,
      })) as any,
      updatedAt: activeRule.updatedAt || "",
    } as any;
  }, [isCreatingNewRule, activeRule]);

  // Open flow builder view in creation mode without saving until the user explicitly clicks Save
  const handleCreateNewRule = () => {
    setIsCreatingNewRule(true);
    setActiveRuleId(null);
    setIsAddAutomationDrawerOpen(true);
  };

  // Table Columns: Name, Trigger, Activity, Last Updated, Status (consistent neutral grey/black)
  const ruleColumns: TableColumn<AutomationRule>[] = [
    {
      id: "name",
      header: "Name",
      align: "left",
      width: "34%",
      render: (rule) => (
        <div className="flex flex-col py-0.5 min-w-0">
          <span
            className="font-semibold text-gray-900 hover:text-black transition-colors cursor-pointer text-xs sm:text-sm truncate"
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
      header: "Trigger",
      align: "left",
      width: "24%",
      render: (rule) => {
        const catalogEvt = GLOBAL_TRIGGER_CATALOG.flatMap((c) => c.events).find(
          (e) => e.event === rule.trigger.event
        );
        const trigParams = rule.trigger.params || {};
        const stageName = trigParams.stageName || trigParams.triggerStageName;
        const primaryLabel = stageName
          ? `Stage: ${stageName}`
          : catalogEvt?.label || rule.trigger.label || rule.trigger.event || "Custom Trigger";
        return (
          <div className="flex flex-col py-0.5 min-w-0">
            <span className="text-xs font-medium text-gray-900 truncate">
              {primaryLabel}
            </span>
            {stageName && (catalogEvt?.label || rule.trigger.label) && (
              <span className="text-[11px] text-gray-500 truncate">
                {catalogEvt?.label || rule.trigger.label}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "activity",
      header: "Activity",
      align: "left",
      width: "18%",
      render: (rule) => {
        const runCount = (rule as any).runCount ?? (rule.lastRunAt ? 1 : 0);
        return (
          <div className="flex flex-col py-0.5">
            <span className="text-xs font-semibold text-gray-900 tabular-nums">
              {runCount} {runCount === 1 ? "run" : "runs"}
            </span>
            <span className="text-[11px] text-gray-500">
              {rule.lastRunAt
                ? `Last: ${new Date(rule.lastRunAt).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}`
                : "Never executed"}
            </span>
          </div>
        );
      },
    },
    {
      id: "updatedAt",
      header: "Last Updated",
      align: "left",
      width: "14%",
      render: (rule) => {
        const ts = rule.updatedAt || rule.createdAt;
        return (
          <span className="text-xs text-gray-700 font-medium tabular-nums">
            {ts
              ? new Date(ts).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "—"}
          </span>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      align: "center",
      width: "10%",
      render: (rule) => (
        <button
          type="button"
          role="switch"
          aria-checked={rule.enabled}
          aria-label={rule.enabled ? "Disable automation" : "Enable automation"}
          onClick={(e) => {
            e.stopPropagation();
            toggleRule(rule.id);
          }}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none ${
            rule.enabled ? "bg-gray-900" : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition-transform ${
              rule.enabled ? "translate-x-[18px]" : "translate-x-[3px]"
            }`}
          />
        </button>
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
          actions={
            <HowItWorksButton
              label="How Automations Work"
              onClick={() => setShowHelp(true)}
            />
          }
        />

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
          const triggerEvtStr = String((saved.trigger as any)?.event || "").toLowerCase();
          const catalogEvt = GLOBAL_TRIGGER_CATALOG.flatMap((c) => c.events).find(
            (e) => e.event.toLowerCase() === triggerEvtStr
          );
          const triggerCategory = GLOBAL_TRIGGER_CATALOG.find((cat) =>
            cat.events.some((e) => e.event.toLowerCase() === triggerEvtStr)
          );
          const detectedEntityType =
            triggerCategory?.type === "appointment" || triggerEvtStr.startsWith("appointment")
              ? "appointment"
              : triggerCategory?.type === "invoice" || triggerEvtStr.startsWith("invoice")
              ? "invoice"
              : triggerCategory?.type === "task" || triggerEvtStr.startsWith("task")
              ? "task"
              : "client";

          const mappedActions: WorkflowStep[] = (saved.steps || []).map((s: any) => ({
            ...s,
            id: s.id,
            name: s.name,
            description: s.description || "",
            iconKey: s.iconKey || "zap",
            stepKey: s.stepKey,
            trigger: s.trigger || "stage",
            executionType: s.executionType || "wait",
            delayValue: s.delay?.value ?? s.delayValue ?? 0,
            delayUnit: s.delay?.unit ?? s.delayUnit ?? "minutes",
            params: s.params || {},
            branches: s.branches,
          }));

          // Find any update_to_stage / stage movement action in the steps tree
          let stageMovementStep: WorkflowStep | undefined;
          const findStageMovement = (stepsList: WorkflowStep[]): WorkflowStep | undefined => {
            for (const s of stepsList) {
              if (
                s.stepKey === "update_to_stage" ||
                s.stepKey === "update-stage" ||
                s.stepKey === "movetostage" ||
                s.stepKey === "stagemovement" ||
                s.stepKey === "processmovement" ||
                s.stepKey === "move-process" ||
                s.stepKey === "move-stage" ||
                s.stepKey === "move-new-process"
              ) {
                return s;
              }
              if (s.branches && s.branches.length > 0) {
                for (const b of s.branches) {
                  const found = findStageMovement(b.steps || []);
                  if (found) return found;
                }
              }
            }
            return undefined;
          };
          stageMovementStep = findStageMovement(mappedActions);

          const trigParams = (saved.trigger as any)?.params || {};
          const isStageTrigger =
            triggerEvtStr.startsWith("stage.") ||
            triggerEvtStr.includes("stage") ||
            (saved.trigger as any)?.type === "stage" ||
            trigParams?.category === "stage";

          // If trigger is a stage trigger, resolve process/stage from trigger params
          const trigStageId = trigParams.stageId || trigParams.triggerStageId || (saved.trigger as any)?.stage?.stageId || "";
          const trigStageName = trigParams.stageName || trigParams.triggerStageName || "";
          const trigProcessId = trigParams.processId || trigParams.triggerProcessId || (saved.trigger as any)?.stage?.processId || "";
          const trigProcessName = trigParams.processName || trigParams.triggerProcessName || "";

          // Resolve destination stage/process from movement step if present
          const actionStageId = stageMovementStep?.params?.stageId || stageMovementStep?.params?.stepDetailStage || trigStageId;
          const actionStageName = stageMovementStep?.params?.stageName || stageMovementStep?.params?.stepDetailStageName || trigStageName;
          const actionProcessId = stageMovementStep?.params?.processId || stageMovementStep?.params?.stepDetailProcess || trigProcessId;
          const actionProcessName = stageMovementStep?.params?.processName || stageMovementStep?.params?.stepDetailProcessName || trigProcessName;

          // Normalized trigger params ensuring stageId and processId are populated
          const normalizedTriggerParams = {
            ...trigParams,
            ...(isStageTrigger || trigStageId ? {
              stageId: trigStageId || actionStageId,
              stageName: trigStageName || actionStageName,
              processId: trigProcessId || actionProcessId,
              processName: trigProcessName || actionProcessName,
              triggerStageId: trigStageId || actionStageId,
              triggerStageName: trigStageName || actionStageName,
              triggerProcessId: trigProcessId || actionProcessId,
              triggerProcessName: trigProcessName || actionProcessName,
            } : {}),
          };

          const actionPayload = {
            type: "moveToStage" as const,
            processId: actionProcessId || "",
            stageId: actionStageId || "",
            processName: actionProcessName || "",
            stageName: actionStageName || "",
          };

          if (isCreatingNewRule || !activeRule) {
            try {
              const created = createRule({
                orgId: activeOrganization?.id || "default",
                name: saved.name || "New Automation",
                description: saved.description || "",
                entityType: detectedEntityType,
                isAdmin: false,
                createdIn: "client",
                isClientCustomization: true,
                source: "custom",
                trigger: {
                  event: (saved.trigger as any).event || "call.inbound",
                  label: catalogEvt?.label || (saved.trigger as any).event || "Inbound call",
                  source: "any",
                  params: normalizedTriggerParams,
                },
                action: actionPayload,
                actions: mappedActions,
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
                entityType: detectedEntityType,
                isAdmin: false,
                createdIn: "client",
                isClientCustomization: true,
                source: "custom",
                trigger: {
                  event: (saved.trigger as any).event,
                  label: catalogEvt?.label || (saved.trigger as any).event,
                  source: "any",
                  params: normalizedTriggerParams,
                },
                action: actionPayload,
                actions: mappedActions,
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

      {/* Page-level How It Works Modal */}
      <HowItWorksModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="How Automations Work"
        summary="Automations connect lifecycle events — like stage changes, form submissions, and incoming calls — directly to automated actions and human workflows."
        bullets={[
          "Create trigger-based rules to automate routine business and clinical workflows",
          "Route records to specific departments, roles, or individual team members with configurable priority",
          "Configure sequential round robin, strict priority waterfall, or balanced distribution algorithms",
          "Monitor live execution logs, delivery status, and trigger performance",
        ]}
        guideUrl="/guide/automations"
      />
    </div>
  );
}
