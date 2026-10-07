import React, { useState, useMemo, useEffect } from "react";
import {
  Zap,
  Plus,
  Trash2,
  Pencil,
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
} from "../../lib/useAutomationStore";
import { useProcessStore } from "../../lib/useProcessStore";
import { toast } from "sonner";

export default function Automation() {
  const { processes } = useProcessStore();
  const { rules, createRule, updateRule, deleteRule, toggleRule } = useAutomationRules();

  // Filter state
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null);
  const [isCreatingNewRule, setIsCreatingNewRule] = useState(false);
  const [isAddAutomationDrawerOpen, setIsAddAutomationDrawerOpen] = useState(false);

  // Filtered rules list (no entities)
  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      if (statusFilter === "active" && !r.enabled) return false;
      if (statusFilter === "paused" && r.enabled) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = r.name.toLowerCase().includes(q);
        const triggerMatch = (r.trigger.label || r.trigger.event).toLowerCase().includes(q);
        const descMatch = (r.description || "").toLowerCase().includes(q);
        if (!nameMatch && !triggerMatch && !descMatch) return false;
      }
      return true;
    });
  }, [rules, statusFilter, searchQuery]);

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
      <AddAutomationDrawer
        isOpen={isAddAutomationDrawerOpen}
        onClose={() => {
          setIsAddAutomationDrawerOpen(false);
          setIsCreatingNewRule(false);
        }}
        scope="global"
        defaultView="library"
        processes={processes}
        initialAutomation={
          !isCreatingNewRule && activeRule
            ? {
                id: activeRule.id,
                orgId: activeRule.orgId || "default",
                name: activeRule.name,
                description: activeRule.description,
                scope: "global",
                status: activeRule.enabled ? "active" : "draft",
                trigger: {
                  type: (GLOBAL_TRIGGER_CATALOG.find((c) =>
                    c.events.some((e) => e.event === activeRule.trigger.event)
                  )?.type || "call") as EventTriggerType,
                  event: activeRule.trigger.event,
                },
                steps: (activeRule.actions || []).map((s, idx) => ({
                  id: s.id,
                  name: s.name,
                  stepKey: s.stepKey,
                  iconKey: s.iconKey,
                  kind: "wait",
                  delay:
                    (s.delayValue ?? 0) > 0
                      ? { value: s.delayValue!, unit: (s.delayUnit as any) || "minutes" }
                      : undefined,
                  params: s.params || {},
                  order: idx + 1,
                })),
                updatedAt: activeRule.updatedAt || new Date().toISOString(),
              }
            : null
        }
        processName={!isCreatingNewRule && activeRule ? activeRule.name : "New Global Automation"}
        workflowSteps={!isCreatingNewRule && activeRule ? activeWorkflowSteps : []}
        onSaveAutomation={(saved) => {
          const catalogEvt = GLOBAL_TRIGGER_CATALOG.flatMap((c) => c.events).find(
            (e) => e.event === (saved.trigger as any).event
          );
          const triggerCategory = GLOBAL_TRIGGER_CATALOG.find((cat) =>
            cat.events.some((e) => e.event === (saved.trigger as any).event)
          );
          const detectedEntityType =
            triggerCategory?.type === "appointment"
              ? "appointment"
              : triggerCategory?.type === "invoice"
              ? "invoice"
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

          if (isCreatingNewRule || !activeRule) {
            try {
              const created = createRule({
                orgId: "default",
                name: saved.name || "New Automation",
                description: saved.description || "",
                entityType: detectedEntityType,
                trigger: {
                  event: (saved.trigger as any).event || "call.inbound",
                  label: catalogEvt?.label || (saved.trigger as any).event || "Inbound call",
                  source: "any",
                  params: (saved.trigger as any).params || {},
                },
                action: {
                  type: "moveToStage",
                  processId: "",
                  stageId: "",
                  processName: "",
                  stageName: "",
                },
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
                trigger: {
                  event: (saved.trigger as any).event,
                  label: catalogEvt?.label || (saved.trigger as any).event,
                  source: "any",
                  params: (saved.trigger as any).params || {},
                },
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
    </div>
  );
}
