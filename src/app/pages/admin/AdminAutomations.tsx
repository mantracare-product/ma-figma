import React, { useState, useMemo, useEffect } from "react";
import {
  Zap,
  Plus,
  Trash2,
  Pencil,
  Globe,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import PageHeader from "../../components/layout/PageHeader";
import PageTopBar from "../../components/layout/PageTopBar";
import TableComponent, { TableColumn, TableRowAction } from "../../components/ui/TableComponent";
import AddAutomationDrawer, { STEP_ALLOWED_TRIGGERS } from "../../components/process/AddAutomationDrawer";
import type { WorkflowStep } from "../../types/workflow";
import type { EventTriggerType } from "../../types/automation";
import { GLOBAL_TRIGGER_CATALOG } from "../../types/automation";
import {
  useAutomationRules,
  AutomationRule,
  isAutomationRuleMatchingScope,
} from "../../../lib/useAutomationStore";
import { useProcessStore } from "../../../lib/useProcessStore";
import { AdminScopingRulesEditor } from "./components/AdminScopingRulesEditor";
import type { ScopingRule } from "../../context/FieldRegistryContext";
import {
  INITIAL_CATEGORIES,
  INITIAL_INDUSTRIES,
  STANDARD_LOCATIONS,
  getIndustriesForCategory,
} from "../../../data/industryReferenceData";
import { toast } from "sonner";

export default function AdminAutomations() {
  const { processes } = useProcessStore();
  const { rules, createRule, updateRule, deleteRule, toggleRule } = useAutomationRules();

  // Filter state
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null);
  const [isCreatingNewRule, setIsCreatingNewRule] = useState(false);
  const [isAddAutomationDrawerOpen, setIsAddAutomationDrawerOpen] = useState(false);

  // Admin Scope filters
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("All");
  const [selectedIndustryFilter, setSelectedIndustryFilter] = useState<string>("All");
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>("All");

  // Rule Scoping Modal state
  const [showScopeConfigModal, setShowScopeConfigModal] = useState(false);
  const [pendingScopingRules, setPendingScopingRules] = useState<ScopingRule[]>([]);
  const [scopingTargetRuleId, setScopingTargetRuleId] = useState<string | null>(null);

  const availableIndustriesForFilter = useMemo(() => {
    if (selectedCategoryFilter === "All") {
      return Array.from(new Set(INITIAL_INDUSTRIES.map((i) => i.name)));
    }
    return getIndustriesForCategory(selectedCategoryFilter);
  }, [selectedCategoryFilter]);

  // Filtered rules list with admin scoping
  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      if (statusFilter === "active" && !r.enabled) return false;
      if (statusFilter === "paused" && r.enabled) return false;

      const matchesScope = isAutomationRuleMatchingScope(r, {
        category: selectedCategoryFilter,
        industry: selectedIndustryFilter,
        location: selectedLocationFilter,
      });
      if (!matchesScope) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = r.name.toLowerCase().includes(q);
        const triggerMatch = (r.trigger.label || r.trigger.event).toLowerCase().includes(q);
        const descMatch = (r.description || "").toLowerCase().includes(q);
        if (!nameMatch && !triggerMatch && !descMatch) return false;
      }
      return true;
    });
  }, [rules, statusFilter, searchQuery, selectedCategoryFilter, selectedIndustryFilter, selectedLocationFilter]);

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

  const handleCreateNewRule = () => {
    setIsCreatingNewRule(true);
    setActiveRuleId(null);
    setPendingScopingRules([]);
    setIsAddAutomationDrawerOpen(true);
  };

  // Table Columns
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
      label: "Configure Scope Rules",
      icon: <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />,
      onClick: (rule) => {
        setScopingTargetRuleId(rule.id);
        setPendingScopingRules(rule.scopingRules ? [...rule.scopingRules] : []);
        setShowScopeConfigModal(true);
      },
    },
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
        {/* Top Header */}
        <PageHeader
          title="Automations"
          subtitle="Visual rule engine connecting lifecycle events directly to pipeline actions across tenant organizations."
          badge={
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-[#1456f0] border border-blue-200/60">
              Admin Global Rules
            </span>
          }
        />

        {/* Action Bar powered by PageTopBar with Admin Scope Filters */}
        <PageTopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search rules, events, triggers..."
          leftElement={
            <div className="flex items-center gap-2 flex-wrap">
              {/* 1. Category */}
              <select
                value={selectedCategoryFilter}
                onChange={(e) => {
                  setSelectedCategoryFilter(e.target.value);
                  setSelectedIndustryFilter("All");
                }}
                className="h-[36px] px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none cursor-pointer shadow-2xs hover:border-gray-300"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <option value="All">All Categories</option>
                {INITIAL_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>

              {/* 2. Industry */}
              <select
                value={selectedIndustryFilter}
                onChange={(e) => setSelectedIndustryFilter(e.target.value)}
                className="h-[36px] px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none cursor-pointer shadow-2xs hover:border-gray-300"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <option value="All">All Industries</option>
                {availableIndustriesForFilter.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>

              {/* 3. Location */}
              <select
                value={selectedLocationFilter}
                onChange={(e) => setSelectedLocationFilter(e.target.value)}
                className="h-[36px] px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none cursor-pointer shadow-2xs hover:border-gray-300"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <option value="All">All Locations</option>
                {STANDARD_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          }
          filterPresets={[
            {
              id: "all",
              label: "All Rules",
              count: rules.length,
              isActive: statusFilter === "all" && selectedCategoryFilter === "All" && selectedIndustryFilter === "All" && selectedLocationFilter === "All",
              onClick: () => {
                setStatusFilter("all");
                setSelectedCategoryFilter("All");
                setSelectedIndustryFilter("All");
                setSelectedLocationFilter("All");
              },
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
          onClearAllFilters={() => {
            setSelectedCategoryFilter("All");
            setSelectedIndustryFilter("All");
            setSelectedLocationFilter("All");
            setStatusFilter("all");
            setSearchQuery("");
          }}
          primaryAction={{
            label: "New Rule",
            icon: <Plus className="w-3.5 h-3.5" />,
            onClick: handleCreateNewRule,
          }}
        />

        {/* Rules Table View */}
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
          emptyMessage="No automation rules found matching active filters. Click 'New Rule' to create one."
          tableId="admin-automation-rules-table"
        />
      </div>

      {/* Add Automation Drawer (Admin Global Scope) */}
      <AddAutomationDrawer
        isOpen={isAddAutomationDrawerOpen}
        onClose={() => {
          setIsAddAutomationDrawerOpen(false);
          setIsCreatingNewRule(false);
        }}
        isAdmin={true}
        initialScopingRules={activeRule?.scopingRules || pendingScopingRules}
        onScopingRulesChange={(newRules) => setPendingScopingRules(newRules)}
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
                scopingRules: activeRule.scopingRules || [],
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

          const ruleScopingRules =
            (saved as any).scopingRules && (saved as any).scopingRules.length > 0
              ? (saved as any).scopingRules
              : pendingScopingRules.length > 0
              ? pendingScopingRules
              : activeRule?.scopingRules || [];

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
                scopingRules: ruleScopingRules,
                industryCategory: ruleScopingRules[0]?.industryCategory || (selectedCategoryFilter !== "All" ? selectedCategoryFilter : "All"),
                industry: ruleScopingRules[0]?.industries?.[0] || (selectedIndustryFilter !== "All" ? selectedIndustryFilter : "All"),
                locations: ruleScopingRules[0]?.locations || (selectedLocationFilter !== "All" ? [selectedLocationFilter] : ["All"]),
              });
              setActiveRuleId(created.id);
              setIsCreatingNewRule(false);
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
                trigger: {
                  event: (saved.trigger as any).event,
                  label: catalogEvt?.label || (saved.trigger as any).event,
                  source: "any",
                  params: (saved.trigger as any).params || {},
                },
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

      {/* Admin Scope Rules Configuration Modal */}
      {showScopeConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-white">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  Configure Admin Scope Rules
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowScopeConfigModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                Define which tenant industry categories, industries, and locations have visibility and execution rights for this automation rule.
              </p>

              <AdminScopingRulesEditor
                rules={pendingScopingRules}
                onChange={(rules) => setPendingScopingRules(rules)}
                showHeader={true}
              />
            </div>

            <div className="p-4 bg-gray-50/70 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowScopeConfigModal(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200/60 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveScopeModal}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Save Scope Rules
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
