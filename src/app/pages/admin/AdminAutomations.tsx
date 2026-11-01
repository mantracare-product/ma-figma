import React, { useState, useMemo, useEffect } from "react";
import {
  Zap,
  Plus,
  Trash2,
  Pencil,
  Globe,
  SlidersHorizontal,
  ArrowRight,
  Shield,
} from "lucide-react";
import PageHeader from "../../components/layout/PageHeader";
import PageTopBar from "../../components/layout/PageTopBar";
import TableComponent, { TableColumn, TableRowAction } from "../../components/ui/TableComponent";
import AddAutomationDrawer, { STEP_ALLOWED_TRIGGERS } from "../../components/process/AddAutomationDrawer";
import { Modal } from "../../components/ui/Modal";
import type { WorkflowStep } from "../../types/workflow";
import type { EventTriggerType } from "../../types/automation";
import { GLOBAL_TRIGGER_CATALOG } from "../../types/automation";
import {
  useAutomationRules,
  AutomationRule,
  isAdminAutomationRule,
} from "../../../lib/useAutomationStore";
import { useProcessStore } from "../../../lib/useProcessStore";
import { AdminControlAccordion } from "./components/AdminControlAccordion";
import type { ScopingRule } from "../../context/FieldRegistryContext";
import { toast } from "sonner";

export default function AdminAutomations() {
  const { processes } = useProcessStore();
  const { rules, createRule, updateRule, deleteRule, toggleRule } = useAutomationRules();

  // Filter state matching MA Automations module
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null);
  const [isCreatingNewRule, setIsCreatingNewRule] = useState(false);
  const [isAddAutomationDrawerOpen, setIsAddAutomationDrawerOpen] = useState(false);

  // New Rule Popup Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleDescription, setNewRuleDescription] = useState("");
  const [newRuleScopingRules, setNewRuleScopingRules] = useState<ScopingRule[]>([]);

  // Scope Config Modal state for existing rules
  const [showScopeConfigModal, setShowScopeConfigModal] = useState(false);
  const [pendingScopingRules, setPendingScopingRules] = useState<ScopingRule[]>([]);
  const [scopingTargetRuleId, setScopingTargetRuleId] = useState<string | null>(null);

  // Product-level rules (excluding client personal customizations)
  const adminRules = useMemo(() => {
    return rules.filter(isAdminAutomationRule);
  }, [rules]);

  // Filtered rules list matching MA Automations module
  const filteredRules = useMemo(() => {
    return adminRules.filter((r) => {
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
  }, [adminRules, statusFilter, searchQuery]);

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

  // Workflow steps bound directly to the active rule
  const activeWorkflowSteps: WorkflowStep[] = useMemo(() => {
    if (isCreatingNewRule || !activeRule) return [];
    return activeRule.actions || [];
  }, [activeRule, isCreatingNewRule]);

  const drawerInitialScopingRules = useMemo(() => {
    if (isCreatingNewRule) {
      return newRuleScopingRules;
    }
    if (activeRule?.scopingRules && activeRule.scopingRules.length > 0) {
      return activeRule.scopingRules;
    }
    if (activeRule?.industryCategory && activeRule.industryCategory !== "All") {
      return [
        {
          industryCategory: activeRule.industryCategory,
          industries: activeRule.industry && activeRule.industry !== "All" ? [activeRule.industry] : [],
          locations: activeRule.locations && !activeRule.locations.includes("All") ? activeRule.locations : [],
        },
      ];
    }
    if (pendingScopingRules && pendingScopingRules.length > 0) {
      return pendingScopingRules;
    }
    return [];
  }, [isCreatingNewRule, newRuleScopingRules, activeRule, pendingScopingRules]);

  const drawerInitialAutomation = useMemo(() => {
    if (isCreatingNewRule) {
      return {
        id: "rule_" + Date.now(),
        orgId: "default",
        name: newRuleName.trim() || "New Global Automation",
        description: newRuleDescription.trim(),
        scope: "global" as const,
        status: "active" as const,
        scopingRules: newRuleScopingRules,
        trigger: {
          type: "client" as EventTriggerType,
          event: "client.created",
        },
        steps: [],
        updatedAt: new Date().toISOString(),
      } as any;
    }
    if (!activeRule) return null;
    return {
      id: activeRule.id,
      orgId: activeRule.orgId || "default",
      name: activeRule.name,
      description: activeRule.description,
      scope: "global" as const,
      status: activeRule.enabled ? ("active" as const) : ("draft" as const),
      scopingRules: activeRule.scopingRules || [],
      trigger: {
        type: (GLOBAL_TRIGGER_CATALOG.find((c) =>
          c.events.some((e) => e.event === activeRule.trigger.event)
        )?.type || "client") as EventTriggerType,
        event: activeRule.trigger.event || "client.created",
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
  }, [isCreatingNewRule, activeRule, newRuleName, newRuleDescription, newRuleScopingRules]);

  // Open modal popup when user clicks New Rule
  const handleOpenAddModal = () => {
    setNewRuleName("");
    setNewRuleDescription("");
    setNewRuleScopingRules([]);
    setShowAddModal(true);
  };

  // Confirm modal and launch builder drawer with name, description, and admin scope
  const handleConfirmAddModal = () => {
    if (!newRuleName.trim()) {
      toast.error("Please enter an automation name");
      return;
    }
    setIsCreatingNewRule(true);
    setActiveRuleId(null);
    setPendingScopingRules(newRuleScopingRules);
    setShowAddModal(false);
    setIsAddAutomationDrawerOpen(true);
  };

  // Table Columns matching MA design
  const ruleColumns: TableColumn<AutomationRule>[] = [
    {
      id: "name",
      header: "Rule Name",
      align: "left",
      width: "36%",
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
      width: "24%",
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
      id: "scope",
      header: "Admin Scope",
      align: "left",
      width: "20%",
      render: (rule) => {
        const hasCustomRules = rule.scopingRules && rule.scopingRules.length > 0;
        const categories = hasCustomRules
          ? Array.from(new Set(rule.scopingRules!.map((s) => s.industryCategory)))
          : rule.industryCategory
          ? [rule.industryCategory]
          : [];

        if (categories.length === 0 || categories.includes("All")) {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
              <Globe className="w-3 h-3 text-gray-500" />
              <span>All Orgs (Global)</span>
            </span>
          );
        }

        return (
          <div className="flex items-center gap-1 flex-wrap">
            {categories.slice(0, 2).map((cat, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200"
              >
                <Globe className="w-2.5 h-2.5 text-blue-500" />
                <span>{cat}</span>
              </span>
            ))}
            {categories.length > 2 && (
              <span className="text-[10px] text-gray-500 font-semibold">
                +{categories.length - 2}
              </span>
            )}
          </div>
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
      width: "10%",
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
        setPendingScopingRules(rule.scopingRules ? [...rule.scopingRules] : []);
        setIsAddAutomationDrawerOpen(true);
      },
    },
    {
      label: "Configure Scope Rules",
      icon: <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />,
      onClick: (rule) => {
        setScopingTargetRuleId(rule.id);
        setPendingScopingRules(rule.scopingRules ? [...rule.scopingRules] : []);
        setShowScopeConfigModal(true);
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

  const handleSaveScopeModal = () => {
    if (!scopingTargetRuleId) return;
    updateRule(scopingTargetRuleId, {
      scopingRules: pendingScopingRules,
      industryCategory: pendingScopingRules[0]?.industryCategory || "All",
      industry: pendingScopingRules[0]?.industries?.[0] || "All",
      locations: pendingScopingRules[0]?.locations || ["All"],
      updatedAt: new Date().toISOString(),
    });
    toast.success("Admin scope rules updated");
    setShowScopeConfigModal(false);
    setScopingTargetRuleId(null);
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="px-10 sm:px-12 py-7.5 sm:py-8 w-full space-y-7">
        {/* Top Header - Exactly matching MA Automation page */}
        <PageHeader
          title="Automations"
          subtitle="Visual rule engine connecting lifecycle events directly to pipeline actions."
        />

        {/* Action Bar powered by PageTopBar - Clean MA design */}
        <PageTopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search rules, events, triggers..."
          filterPresets={[
            {
              id: "all",
              label: "All Rules",
              count: adminRules.length,
              isActive: statusFilter === "all",
              onClick: () => setStatusFilter("all"),
            },
            {
              id: "active",
              label: "Active",
              count: adminRules.filter((r) => r.enabled).length,
              isActive: statusFilter === "active",
              onClick: () => setStatusFilter("active"),
            },
            {
              id: "paused",
              label: "Paused",
              count: adminRules.filter((r) => !r.enabled).length,
              isActive: statusFilter === "paused",
              onClick: () => setStatusFilter("paused"),
            },
          ]}
          primaryAction={{
            label: "New Rule",
            icon: <Plus className="w-3.5 h-3.5" />,
            onClick: handleOpenAddModal,
          }}
        />

        {/* Rules Table View - Exact styling from MA Automation */}
        <TableComponent
          data={filteredRules}
          columns={ruleColumns}
          getRowId={(rule) => rule.id}
          rowActions={ruleRowActions}
          onRowClick={(rule) => {
            setIsCreatingNewRule(false);
            setActiveRuleId(rule.id);
            setPendingScopingRules(rule.scopingRules ? [...rule.scopingRules] : []);
            setIsAddAutomationDrawerOpen(true);
          }}
          defaultRowsPerPage={15}
          emptyMessage="No automation rules found. Click 'New Rule' to create one."
          tableId="admin-automation-rules-table"
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          POPUP MODAL: ADD AUTOMATION (Name, Description & Admin Scope)
          ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        maxWidth="lg"
        title={
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Zap className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
                New Automation Rule
              </h3>
              <p className="text-xs text-gray-500 font-normal">
                Set automation name, description, and tenant scope before configuring steps.
              </p>
            </div>
          </div>
        }
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmAddModal}
              className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <span>Continue to Builder</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        }
      >
        <div className="space-y-4 p-1">
          {/* 1. Automation Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1.5">
              Automation Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={newRuleName}
              onChange={(e) => setNewRuleName(e.target.value)}
              placeholder="e.g. Inbound Patient Welcome & SMS Followup"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-gray-900 font-medium placeholder:text-gray-400 shadow-2xs"
              autoFocus
            />
          </div>

          {/* 2. Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1.5">
              Description
            </label>
            <textarea
              value={newRuleDescription}
              onChange={(e) => setNewRuleDescription(e.target.value)}
              placeholder="Describe what this automation handles and when it should trigger..."
              rows={3}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-gray-800 resize-none placeholder:text-gray-400 shadow-2xs"
            />
          </div>

          {/* 3. Admin Scope Component */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Shield className="w-3.5 h-3.5 text-gray-600" />
              <label className="block text-xs font-semibold text-gray-800">
                Admin Scope Component
              </label>
            </div>
            <AdminControlAccordion
              scopingRules={newRuleScopingRules}
              onScopingRulesChange={setNewRuleScopingRules}
              defaultAdminControlOpen={true}
              defaultScopeOpen={true}
              defaultPermissionsOpen={false}
              scopeTooltip="Define which tenant industry categories, industries, and locations have visibility and execution rights for this automation rule."
              permissionsTooltip="Configure what tenant users are permitted to do with this automation rule."
            />
          </div>
        </div>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          BUILDER DRAWER (Flow Builder)
          ───────────────────────────────────────────────────────────── */}
      {isAddAutomationDrawerOpen && (
        <AddAutomationDrawer
          isOpen={isAddAutomationDrawerOpen}
          onClose={() => {
            setIsAddAutomationDrawerOpen(false);
            setIsCreatingNewRule(false);
            setNewRuleName("");
            setNewRuleDescription("");
            setNewRuleScopingRules([]);
          }}
          isAdmin={false}
          initialScopingRules={drawerInitialScopingRules}
          onScopingRulesChange={(newRules) => setPendingScopingRules(newRules)}
          scope="global"
          defaultView="flowbuilder"
          processes={processes}
          initialAutomation={drawerInitialAutomation}
          processName={isCreatingNewRule ? (newRuleName.trim() || "New Global Automation") : (activeRule ? activeRule.name : "New Global Automation")}
          workflowSteps={!isCreatingNewRule && activeRule ? activeWorkflowSteps : []}
          onSaveAutomation={(saved) => {
            const catalogEvt = GLOBAL_TRIGGER_CATALOG.flatMap((c) => c.events).find(
              (e) => e.event === (saved.trigger as any).event
            );
            const triggerEvtStr = String((saved.trigger as any)?.event || "").toLowerCase();
            const triggerCategory = GLOBAL_TRIGGER_CATALOG.find((cat) =>
              cat.events.some((e) => e.event.toLowerCase() === triggerEvtStr)
            );
            const detectedEntityType =
              triggerCategory?.type === "appointment" || triggerEvtStr.startsWith("appointment")
                ? "appointment"
                : triggerCategory?.type === "invoice" || triggerEvtStr.startsWith("invoice")
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

            const ruleScopingRules =
              (saved as any).scopingRules && (saved as any).scopingRules.length > 0
                ? (saved as any).scopingRules
                : pendingScopingRules.length > 0
                ? pendingScopingRules
                : isCreatingNewRule
                ? newRuleScopingRules
                : activeRule?.scopingRules || [];

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

            const trigStageId = trigParams.stageId || trigParams.triggerStageId || (saved.trigger as any)?.stage?.stageId || "";
            const trigStageName = trigParams.stageName || trigParams.triggerStageName || "";
            const trigProcessId = trigParams.processId || trigParams.triggerProcessId || (saved.trigger as any)?.stage?.processId || "";
            const trigProcessName = trigParams.processName || trigParams.triggerProcessName || "";

            const actionStageId = stageMovementStep?.params?.stageId || stageMovementStep?.params?.stepDetailStage || trigStageId;
            const actionStageName = stageMovementStep?.params?.stageName || stageMovementStep?.params?.stepDetailStageName || trigStageName;
            const actionProcessId = stageMovementStep?.params?.processId || stageMovementStep?.params?.stepDetailProcess || trigProcessId;
            const actionProcessName = stageMovementStep?.params?.processName || stageMovementStep?.params?.stepDetailProcessName || trigProcessName;

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
                const finalRuleName = saved.name || newRuleName.trim() || "New Global Automation";
                const finalRuleDesc = saved.description || newRuleDescription.trim() || "";
                const created = createRule({
                  orgId: "default",
                  name: finalRuleName,
                  description: finalRuleDesc,
                  entityType: detectedEntityType,
                  isAdmin: true,
                  createdIn: "admin",
                  isClientCustomization: false,
                  source: "product",
                  trigger: {
                    event: (saved.trigger as any).event || "client.created",
                    label: catalogEvt?.label || (saved.trigger as any).event || "Client created",
                    source: "any",
                    params: normalizedTriggerParams,
                  },
                  action: actionPayload,
                  actions: mappedActions,
                  enabled: saved.status === "active",
                  health: "ok",
                  scopingRules: ruleScopingRules,
                  industryCategory: ruleScopingRules[0]?.industryCategory || "All",
                  industry: ruleScopingRules[0]?.industries?.[0] || "All",
                  locations: ruleScopingRules[0]?.locations || ["All"],
                });
                setActiveRuleId(created.id);
                setIsCreatingNewRule(false);
                setNewRuleName("");
                setNewRuleDescription("");
                setNewRuleScopingRules([]);
                toast.success("Automation rule created");
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
                  isAdmin: true,
                  createdIn: "admin",
                  isClientCustomization: false,
                  source: "product",
                  trigger: {
                    event: (saved.trigger as any).event,
                    label: catalogEvt?.label || (saved.trigger as any).event,
                    source: "any",
                    params: normalizedTriggerParams,
                  },
                  action: actionPayload,
                  actions: mappedActions,
                  scopingRules: ruleScopingRules,
                  updatedAt: new Date().toISOString(),
                });
                setIsCreatingNewRule(false);
                toast.success("Automation rule updated");
              } catch (err: any) {
                toast.error(err.message || "Failed to update rule");
              }
            }
          }}
          stepAllowedTriggers={STEP_ALLOWED_TRIGGERS}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          ADMIN SCOPE CONFIGURATION MODAL (For existing rules)
          ───────────────────────────────────────────────────────────── */}
      {showScopeConfigModal && (
        <Modal
          isOpen={showScopeConfigModal}
          onClose={() => setShowScopeConfigModal(false)}
          maxWidth="lg"
          title={
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                Configure Admin Scope Rules
              </h3>
            </div>
          }
          footer={
            <div className="flex items-center justify-end gap-2.5 w-full">
              <button
                type="button"
                onClick={() => setShowScopeConfigModal(false)}
                className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveScopeModal}
                className="px-4.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Save Scope Rules
              </button>
            </div>
          }
        >
          <div className="p-1">
            <AdminControlAccordion
              scopingRules={pendingScopingRules}
              onScopingRulesChange={(newRules) => setPendingScopingRules(newRules)}
              defaultAdminControlOpen={true}
              defaultScopeOpen={true}
              defaultPermissionsOpen={false}
              scopeTooltip="Define which tenant industry categories, industries, and locations have visibility and execution rights for this automation rule."
              permissionsTooltip="Configure what tenant users are permitted to do with this automation rule."
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
