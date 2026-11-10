/**
 * AdminSubscriptions.tsx
 * Path: src/app/pages/admin/AdminSubscriptions.tsx
 *
 * Dedicated Admin Console for Workspace Subscriptions:
 * - Summary KPI cards (Active Subscriptions, Monthly MRR, Trials Ending, Past Due)
 * - 32px dark-header table with mono chips and tabular-nums
 * - Actions: Change Plan, Pause, Cancel, Extend Trial, Add Credits (all call audit log)
 * - CSV export
 */

import React, { useState, useMemo } from "react";
import PageHeader from "../../components/layout/PageHeader";
import PageTopBar from "../../components/layout/PageTopBar";
import TableComponent, { TableColumn, TableRowAction } from "../../components/ui/TableComponent";
import DrawerShell from "../../components/ui/DrawerShell";
import { Modal } from "../../components/ui/Modal";
import {
  useAdminSubscriptions,
  AdminSubscriptionItem,
  SubscriptionStatus,
  changeSubscriptionPlan,
  pauseSubscription,
  cancelSubscription,
  extendSubscriptionTrial,
  addSubscriptionCredits,
} from "../../../lib/ordersBillingStore";
import { useOrganization } from "../../context/OrganizationContext";
import {
  CreditCard,
  DollarSign,
  Search,
  Download,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Plus,
  Coins,
  Pause,
  XCircle,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { exportToCsv } from "../../../lib/productAnalyticsStore";

const AVAILABLE_PLANS = [
  { id: "plan-starter", name: "AI Receptionist Starter", mrr: 149.0, credits: 1500 },
  { id: "plan-pro", name: "AI Clinic Receptionist Pro", mrr: 299.0, credits: 3500 },
  { id: "plan-ent", name: "Enterprise Health Scale", mrr: 499.0, credits: 10000 },
];

export default function AdminSubscriptions() {
  const { subscriptions, refresh } = useAdminSubscriptions();

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cycleFilter, setCycleFilter] = useState("all");

  // Action Modals State
  const [subForChangePlan, setSubForChangePlan] = useState<AdminSubscriptionItem | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");

  const [subForAddCredits, setSubForAddCredits] = useState<AdminSubscriptionItem | null>(null);
  const [creditAmountInput, setCreditAmountInput] = useState("1000");

  const [subForExtendTrial, setSubForExtendTrial] = useState<AdminSubscriptionItem | null>(null);
  const [trialDaysInput, setTrialDaysInput] = useState("14");

  // Filtered dataset
  const filteredSubs = useMemo(() => {
    return subscriptions.filter((sub) => {
      if (statusFilter !== "all" && sub.status !== statusFilter) return false;
      if (cycleFilter !== "all" && sub.billingCycle !== cycleFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesOrg = sub.orgName.toLowerCase().includes(q);
        const matchesCode = sub.orgCode.toLowerCase().includes(q);
        const matchesPlan = sub.planName.toLowerCase().includes(q);
        if (!matchesOrg && !matchesCode && !matchesPlan) return false;
      }

      return true;
    });
  }, [subscriptions, statusFilter, cycleFilter, searchQuery]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const activeCount = subscriptions.filter((s) => s.status === "Active").length;
    const totalMrr = subscriptions
      .filter((s) => s.status === "Active" || s.status === "Trial")
      .reduce((acc, s) => acc + s.mrr, 0);
    const trialsEnding = subscriptions.filter((s) => s.status === "Trial").length;
    const pastDueCount = subscriptions.filter((s) => s.status === "Past due").length;

    return { activeCount, totalMrr, trialsEnding, pastDueCount };
  }, [subscriptions]);

  // Action Handlers
  const handleConfirmChangePlan = () => {
    if (!subForChangePlan || !selectedPlanId) return;
    const targetPlan = AVAILABLE_PLANS.find((p) => p.id === selectedPlanId);
    if (!targetPlan) return;

    changeSubscriptionPlan(
      subForChangePlan.id,
      targetPlan.id,
      targetPlan.name,
      targetPlan.mrr,
      targetPlan.credits
    );
    refresh();
    setSubForChangePlan(null);
    toast.success(`Updated plan for ${subForChangePlan.orgName} to ${targetPlan.name}`);
  };

  const handleConfirmAddCredits = () => {
    if (!subForAddCredits) return;
    const credits = parseInt(creditAmountInput, 10);
    if (isNaN(credits) || credits <= 0) {
      toast.error("Please enter a valid credit quantity");
      return;
    }

    addSubscriptionCredits(subForAddCredits.id, credits);
    refresh();
    setSubForAddCredits(null);
    toast.success(`Added ${credits.toLocaleString()} credits to ${subForAddCredits.orgName}`);
  };

  const handleConfirmExtendTrial = () => {
    if (!subForExtendTrial) return;
    const days = parseInt(trialDaysInput, 10);
    if (isNaN(days) || days <= 0) {
      toast.error("Please enter valid trial extension days");
      return;
    }

    extendSubscriptionTrial(subForExtendTrial.id, days);
    refresh();
    setSubForExtendTrial(null);
    toast.success(`Extended trial for ${subForExtendTrial.orgName} by ${days} days`);
  };

  const handlePause = (sub: AdminSubscriptionItem) => {
    if (confirm(`Pause billing for ${sub.orgName}? Recurring charges will stop until resumed.`)) {
      pauseSubscription(sub.id);
      refresh();
      toast.success(`Paused subscription for ${sub.orgName}`);
    }
  };

  const handleCancel = (sub: AdminSubscriptionItem) => {
    if (confirm(`Cancel subscription for ${sub.orgName}? This will revoke access at the end of billing cycle.`)) {
      cancelSubscription(sub.id, "Administrative cancellation");
      refresh();
      toast.success(`Cancelled subscription for ${sub.orgName}`);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      "Subscription ID",
      "Organization",
      "Org ID",
      "Plan Name",
      "Billing Cycle",
      "Status",
      "Monthly MRR ($)",
      "Credits Included",
      "Credits Used",
      "Renewal Date",
    ];
    const rows = filteredSubs.map((s) => [
      s.id,
      s.orgName,
      s.orgCode,
      s.planName,
      s.billingCycle,
      s.status,
      `$${s.mrr.toFixed(2)}`,
      s.creditsIncluded,
      s.creditsUsed,
      new Date(s.renewalDate).toLocaleDateString(),
    ]);
    exportToCsv("mantra-subscriptions-inventory", headers, rows);
    toast.success("Exported subscriptions to CSV");
  };

  // Table Columns
  const columns: TableColumn<AdminSubscriptionItem>[] = [
    {
      key: "orgName",
      header: "ORGANIZATION",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-900 truncate max-w-[170px]">
            {row.orgName}
          </span>
          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60 tabular-nums">
            {row.orgCode}
          </span>
        </div>
      ),
    },
    {
      key: "planName",
      header: "CURRENT PLAN",
      render: (row) => (
        <span className="text-xs font-semibold text-slate-800">{row.planName}</span>
      ),
    },
    {
      key: "billingCycle",
      header: "CYCLE",
      render: (row) => (
        <span className="text-xs text-gray-600 font-medium">{row.billingCycle}</span>
      ),
    },
    {
      key: "status",
      header: "STATUS",
      render: (row) => {
        if (row.status === "Active") {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active
            </span>
          );
        }
        if (row.status === "Trial") {
          return (
            <span className="inline-flex items-center text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
              Trial
            </span>
          );
        }
        if (row.status === "Past due") {
          return (
            <span className="inline-flex items-center text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60">
              Past Due
            </span>
          );
        }
        return (
          <span className="inline-flex items-center text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
            {row.status}
          </span>
        );
      },
    },
    {
      key: "mrr",
      header: "MRR",
      align: "right",
      render: (row) => (
        <span className="text-xs font-mono font-bold text-gray-900 tabular-nums">
          ${(row.mrr || 0).toFixed(2)}
        </span>
      ),
    },
    {
      key: "creditsIncluded",
      header: "CREDITS USAGE",
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-700 font-mono tabular-nums">
            {row.creditsUsed.toLocaleString()} / {row.creditsIncluded.toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      key: "renewalDate",
      header: "RENEWAL / TRIAL END",
      render: (row) => (
        <span className="text-xs text-gray-600 font-mono tabular-nums whitespace-nowrap">
          {new Date(row.renewalDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      ),
    },
  ];

  // Table Row Actions (⋮)
  const rowActions: TableRowAction<AdminSubscriptionItem>[] = [
    {
      label: "Change Plan",
      icon: <CreditCard className="w-3.5 h-3.5 text-blue-600" />,
      onClick: (item) => {
        setSubForChangePlan(item);
        setSelectedPlanId(item.planId);
      },
    },
    {
      label: "Add Bonus Credits",
      icon: <Coins className="w-3.5 h-3.5 text-amber-600" />,
      onClick: (item) => {
        setSubForAddCredits(item);
        setCreditAmountInput("1000");
      },
    },
    {
      label: "Extend Free Trial",
      icon: <Calendar className="w-3.5 h-3.5 text-indigo-600" />,
      disabled: (item) => item.status !== "Trial",
      onClick: (item) => {
        setSubForExtendTrial(item);
        setTrialDaysInput("14");
      },
    },
    {
      label: "Pause Subscription",
      icon: <Pause className="w-3.5 h-3.5 text-amber-600" />,
      disabled: (item) => item.status === "Paused" || item.status === "Cancelled",
      onClick: (item) => handlePause(item),
    },
    {
      label: "Cancel Subscription",
      icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
      disabled: (item) => item.status === "Cancelled",
      onClick: (item) => handleCancel(item),
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#fafafa]">
      <PageHeader
        title="Subscriptions"
        subtitle="Manage recurring workspace subscription plans, MRR expansion, and credit allotments"
        actions={
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export CSV
          </button>
        }
      />

      <div className="p-6 space-y-5">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Subscriptions</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-display text-gray-900 tabular-nums">
              {metrics.activeCount}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Paying active workspaces</div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Monthly MRR</span>
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold font-display text-blue-700 tabular-nums">
              ${metrics.totalMrr.toFixed(2)}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1">+14.2% MRR growth</div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Trials Ending Soon</span>
              <Clock className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold font-display text-indigo-700 tabular-nums">
              {metrics.trialsEnding}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Due for conversion this week</div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Past Due Accounts</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold font-display text-rose-700 tabular-nums">
              {metrics.pastDueCount}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Payment retry in progress</div>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search org, plan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-gray-700 focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Trial">Trial</option>
              <option value="Past due">Past due</option>
              <option value="Paused">Paused</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <select
              value={cycleFilter}
              onChange={(e) => setCycleFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-gray-700 focus:outline-none cursor-pointer"
            >
              <option value="all">All Billing Cycles</option>
              <option value="Monthly">Monthly</option>
              <option value="Yearly">Yearly</option>
            </select>
          </div>
        </div>

        {/* Subscriptions Table */}
        <TableComponent
          data={filteredSubs}
          columns={columns}
          rowActions={rowActions}
          actionIcon="menu"
          defaultRowsPerPage={20}
        />
      </div>

      {/* Change Plan Modal */}
      {subForChangePlan && (
        <Modal
          isOpen={true}
          onClose={() => setSubForChangePlan(null)}
          title={`Change Plan: ${subForChangePlan.orgName}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Select the new target plan tier for{" "}
              <strong className="text-slate-900">{subForChangePlan.orgName}</strong> ({subForChangePlan.orgCode}).
            </p>

            <div className="space-y-2">
              {AVAILABLE_PLANS.map((plan) => (
                <label
                  key={plan.id}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedPlanId === plan.id
                      ? "border-blue-500 bg-blue-50/40"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="plan"
                      value={plan.id}
                      checked={selectedPlanId === plan.id}
                      onChange={() => setSelectedPlanId(plan.id)}
                      className="cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">{plan.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {plan.credits.toLocaleString()} credits / mo
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-900">
                    ${plan.mrr}/mo
                  </div>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSubForChangePlan(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmChangePlan}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1E293B] hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Update Plan
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Credits Modal */}
      {subForAddCredits && (
        <Modal
          isOpen={true}
          onClose={() => setSubForAddCredits(null)}
          title={`Allocate Bonus Credits: ${subForAddCredits.orgName}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Inject bonus voice and automation workflow credits into {subForAddCredits.orgName}.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Credits to Add
              </label>
              <input
                type="number"
                step="100"
                value={creditAmountInput}
                onChange={(e) => setCreditAmountInput(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSubForAddCredits(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAddCredits}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Add Credits
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Extend Trial Modal */}
      {subForExtendTrial && (
        <Modal
          isOpen={true}
          onClose={() => setSubForExtendTrial(null)}
          title={`Extend Free Trial: ${subForExtendTrial.orgName}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Extend the trial evaluation window for {subForExtendTrial.orgName}.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Additional Days
              </label>
              <input
                type="number"
                min="1"
                max="90"
                value={trialDaysInput}
                onChange={(e) => setTrialDaysInput(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSubForExtendTrial(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmExtendTrial}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1E293B] hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Extend Trial
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

