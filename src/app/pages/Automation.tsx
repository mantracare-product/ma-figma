import React, { useState, useMemo, useEffect } from "react";
import {
  Zap,
  GitBranch,
  Plus,
  Trash2,
  Calendar,
  Receipt,
  ShieldCheck,
  Pencil,
} from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import PageTopBar from "../components/layout/PageTopBar";
import TableComponent, { TableColumn, TableRowAction } from "../components/ui/TableComponent";
import AddAutomationDrawer, { STEP_ALLOWED_TRIGGERS } from "../components/process/AddAutomationDrawer";
import type { WorkflowStep } from "../types/workflow";
import {
  useAutomationRules,
  AutomationRule,
  EVENT_CATALOG,
} from "../../lib/useAutomationStore";
import {
  getStoredProcesses,
  Process,
  EntityType,
} from "../../lib/useProcessStore";
import { toast } from "sonner";

const ENTITY_CONFIG: Record<
  EntityType,
  { label: string; icon: React.ReactNode; color: string; bg: string }
> = {
  client: {
    label: "Processes",
    icon: <GitBranch className="w-4 h-4" />,
    color: "#2563EB",
    bg: "#EFF6FF",
  },
  appointment: {
    label: "Appointments",
    icon: <Calendar className="w-4 h-4" />,
    color: "#059669",
    bg: "#ECFDF5",
  },
  invoice: {
    label: "Invoices",
    icon: <Receipt className="w-4 h-4" />,
    color: "#7C3AED",
    bg: "#F5F3FF",
  },
  insurance: {
    label: "Insurance",
    icon: <ShieldCheck className="w-4 h-4" />,
    color: "#D97706",
    bg: "#FFFBEB",
  },
  claim: {
    label: "Claims",
    icon: <ShieldCheck className="w-4 h-4" />,
    color: "#DC2626",
    bg: "#FEF2F2",
  },
};

export default function Automation() {
  const { rules, createRule, updateRule, deleteRule, toggleRule } = useAutomationRules();
  const [processes, setProcesses] = useState<Process[]>(() => getStoredProcesses());

  // Filter state
  const [selectedEntity, setSelectedEntity] = useState<EntityType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null);
  const [isAddAutomationDrawerOpen, setIsAddAutomationDrawerOpen] = useState(false);

  useEffect(() => {
    setProcesses(getStoredProcesses());
  }, []);

  // Filtered rules list
  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      if (selectedEntity !== "all" && r.entityType !== selectedEntity) return false;
      if (statusFilter === "active" && !r.enabled) return false;
      if (statusFilter === "paused" && r.enabled) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = r.name.toLowerCase().includes(q);
        const triggerMatch = (r.trigger.label || r.trigger.event).toLowerCase().includes(q);
        const stageMatch = (r.action.stageName || "").toLowerCase().includes(q);
        if (!nameMatch && !triggerMatch && !stageMatch) return false;
      }
      return true;
    });
  }, [rules, selectedEntity, statusFilter, searchQuery]);

  // Set default active rule
  useEffect(() => {
    if (!activeRuleId && filteredRules.length > 0) {
      setActiveRuleId(filteredRules[0].id);
    } else if (activeRuleId && !rules.some((r) => r.id === activeRuleId) && filteredRules.length > 0) {
      setActiveRuleId(filteredRules[0].id);
    }
  }, [filteredRules, activeRuleId, rules]);

  const activeRule = useMemo(() => {
    return rules.find((r) => r.id === activeRuleId) || filteredRules[0] || null;
  }, [rules, activeRuleId, filteredRules]);

  const activeProcess = useMemo(() => {
    if (!activeRule) return processes[0] || null;
    return (
      processes.find((p) => p.id === activeRule.action.processId) ||
      processes.find((p) => p.entityType === activeRule.entityType) ||
      processes[0] ||
      null
    );
  }, [activeRule, processes]);

  const activeStage = useMemo(() => {
    if (!activeProcess) return null;
    return (
      activeProcess.stages.find((s) => s.id === activeRule?.action.stageId) ||
      activeProcess.stages[0] ||
      null
    );
  }, [activeProcess, activeRule]);

  const activeWorkflowSteps: WorkflowStep[] = useMemo(() => {
    if (!activeRule) return [];
    if (activeRule.actions && activeRule.actions.length > 0) {
      return activeRule.actions;
    }
    return [
      {
        id: "act-move-stage",
        name: "Assign Process / Stage",
        description: `Move record to ${activeRule.action.stageName || "target stage"}`,
        iconKey: "zap",
        stepKey: "processmovement",
        trigger: "stage",
        executionType: "wait",
        delayValue: 0,
        delayUnit: "minutes",
        params: {
          processId: activeRule.action.processId,
          stageId: activeRule.action.stageId,
          processName: activeRule.action.processName,
          stageName: activeRule.action.stageName,
        },
      },
    ];
  }, [activeRule]);

  const handleWorkflowStepsChange = (newSteps: WorkflowStep[]) => {
    if (!activeRule) return;
    updateRule(activeRule.id, {
      actions: newSteps,
      updatedAt: new Date().toISOString(),
    });
  };

  // Create new rule & open flow builder view by default
  const handleCreateNewRule = () => {
    const entity: EntityType = selectedEntity === "all" ? "client" : selectedEntity;
    const entityProcesses = processes.filter((p) => (p.entityType || "client") === entity);
    const targetProcess = entityProcesses[0] || processes[0];
    const targetStage = targetProcess?.stages[0];

    const defaultEvents = EVENT_CATALOG[entity] || EVENT_CATALOG.client;
    const defaultEvent = defaultEvents[0] || {
      event: "client.created",
      label: "Contact Created",
    };

    const initialSteps: WorkflowStep[] = [
      {
        id: `ws-${Date.now()}-1`,
        name: "Send Welcome WhatsApp",
        description: "Send instant greeting on intake",
        iconKey: "whatsapp",
        stepKey: "whatsapp",
        trigger: "stage",
        executionType: "wait",
        delayValue: 0,
        delayUnit: "minutes",
        params: {},
      },
    ];

    try {
      const created = createRule({
        orgId: "default",
        name: `New ${ENTITY_CONFIG[entity]?.label || "Rule"} Automation`,
        description: `Automates stage transition when ${defaultEvent.label.toLowerCase()}`,
        entityType: entity,
        trigger: {
          event: defaultEvent.event,
          label: defaultEvent.label,
          source: "any",
        },
        action: {
          type: "moveToStage",
          processId: targetProcess?.id || "proc-1",
          stageId: targetStage?.id || "stg-1",
          processName: targetProcess?.name || "Default Process",
          stageName: targetStage?.name || "Initial Stage",
        },
        actions: initialSteps,
        enabled: true,
        health: "ok",
      });
      setActiveRuleId(created.id);
      setIsAddAutomationDrawerOpen(true);
      toast.success("New automation rule created");
    } catch (err: any) {
      toast.error(err.message || "Failed to create rule");
    }
  };

  // Table Columns
  const ruleColumns: TableColumn<AutomationRule>[] = [
    {
      id: "name",
      header: "Rule Name",
      align: "left",
      width: "40%",
      render: (rule) => (
        <span
          className="font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer text-xs sm:text-sm"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {rule.name}
        </span>
      ),
    },
    {
      id: "entityType",
      header: "Entity",
      align: "left",
      width: "25%",
      render: (rule) => {
        const entInfo = ENTITY_CONFIG[rule.entityType] || ENTITY_CONFIG.client;
        return (
          <span className="text-xs text-gray-700 font-medium">
            {entInfo.label}
          </span>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      align: "center",
      width: "15%",
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
      width: "20%",
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
          subtitle="Visual rule engine connecting lifecycle events directly to entity pipeline stages."
        />

        {/* Action Bar powered by PageTopBar */}
        <PageTopBar
          modes={[
            { id: "all", label: "All Entities" },
            { id: "client", label: "Processes" },
            { id: "appointment", label: "Appointments" },
            { id: "invoice", label: "Invoices" },
            { id: "insurance", label: "Insurance" },
            { id: "claim", label: "Claims" },
          ]}
          activeMode={selectedEntity}
          onModeChange={(m) => setSelectedEntity(m as EntityType | "all")}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search rules, events, stages..."
          filterPresets={[
            {
              id: "all",
              label: "All Rules",
              count: rules.filter((r) => selectedEntity === "all" || r.entityType === selectedEntity).length,
              isActive: statusFilter === "all",
              onClick: () => setStatusFilter("all"),
            },
            {
              id: "active",
              label: "Active",
              count: rules.filter((r) => (selectedEntity === "all" || r.entityType === selectedEntity) && r.enabled).length,
              isActive: statusFilter === "active",
              onClick: () => setStatusFilter("active"),
            },
            {
              id: "paused",
              label: "Paused",
              count: rules.filter((r) => (selectedEntity === "all" || r.entityType === selectedEntity) && !r.enabled).length,
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
            setActiveRuleId(rule.id);
            setIsAddAutomationDrawerOpen(true);
          }}
          defaultRowsPerPage={15}
          emptyMessage="No automation rules found matching your filters."
          tableId="automation-rules-table"
        />
      </div>

      {/* Add Automation Drawer (Same drawer as Process stage tab, opens Flow Builder view by default) */}
      <AddAutomationDrawer
        isOpen={isAddAutomationDrawerOpen && !!activeRule}
        onClose={() => setIsAddAutomationDrawerOpen(false)}
        defaultView="flowbuilder"
        processName={activeProcess?.name || activeRule?.name}
        stageName={activeStage?.name || activeRule?.action.stageName || "Initial Stage"}
        stageColor={activeStage?.color || "#2563EB"}
        stageType={activeStage?.stageType}
        processes={processes}
        currentProcessId={activeProcess?.id}
        workflowSteps={activeWorkflowSteps}
        onWorkflowStepsChange={handleWorkflowStepsChange}
        stepAllowedTriggers={STEP_ALLOWED_TRIGGERS}
      />
    </div>
  );
}
