/**
 * AdminAnalyticsRevenueInvoices.tsx
 * Path: src/app/pages/admin/AdminAnalyticsRevenueInvoices.tsx
 *
 * Dedicated Admin Console for Revenue & Invoices Telemetry:
 * - MRR / ARR tracking and recurring revenue expansion
 * - Invoices issued vs paid vs overdue analysis (NOTE: strictly no standalone invoices page or route)
 * - Revenue contribution by plan tier and top billing organizations
 * - Global filters & CSV export
 */

import React, { useState } from "react";
import PageHeader from "../../components/layout/PageHeader";
import PageTopBar from "../../components/layout/PageTopBar";
import {
  REVENUE_ANALYTICS_DATA,
  exportToCsv,
} from "../../../lib/productAnalyticsStore";
import { useAdminInvoicesData, AdminInvoiceItem } from "../../../lib/ordersBillingStore";
import {
  DollarSign,
  TrendingUp,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Receipt,
  FileText,
  CreditCard,
  Building2,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminAnalyticsRevenueInvoices() {
  const { invoices } = useAdminInvoicesData();
  const [dateRange, setDateRange] = useState("30d");

  const handleExportCsv = () => {
    const headers = [
      "Invoice ID",
      "Organization",
      "Org ID",
      "Plan Name",
      "Amount ($)",
      "Status",
      "Issued Date",
      "Due Date",
    ];
    const rows = invoices.map((inv) => [
      inv.id,
      inv.orgName,
      inv.orgCode,
      inv.planName,
      `$${inv.amount.toFixed(2)}`,
      inv.status,
      new Date(inv.issuedDate).toLocaleDateString(),
      new Date(inv.dueDate).toLocaleDateString(),
    ]);
    exportToCsv("mantra-revenue-invoices-report", headers, rows);
    toast.success("Exported revenue & invoices telemetry to CSV");
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#fafafa]">
      <PageHeader
        title="Revenue & Invoices Analytics"
        subtitle="Consolidated recurring MRR/ARR performance, subscription expansion, and invoice settlement metrics"
      />

      <div className="p-6 space-y-6">
        {/* Filters Toolbar powered by PageTopBar */}
        <PageTopBar
          onExport={handleExportCsv}
          leftElement={
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="h-[34px] px-2.5 pr-7 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none cursor-pointer appearance-none shadow-2xs max-w-[140px] transition-colors"
                >
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last Quarter</option>
                  <option value="1y">Last 12 Months</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          }
        />
        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider">Net Monthly MRR</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-display text-emerald-700 tabular-nums">
              ${REVENUE_ANALYTICS_DATA.mrr.toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1">
              Projected ARR: ${REVENUE_ANALYTICS_DATA.projectedArr.toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider">Settled Invoiced (30d)</span>
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold font-display text-blue-700 tabular-nums">
              ${REVENUE_ANALYTICS_DATA.paidAmount.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Collection rate: {REVENUE_ANALYTICS_DATA.collectionRate}%
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider">Open Invoices</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold font-display text-amber-700 tabular-nums">
              ${REVENUE_ANALYTICS_DATA.openAmount.toLocaleString()}
            </div>
            <div className="text-[11px] text-amber-600 font-semibold mt-1">Within standard payment terms</div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider">Overdue Balance</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold font-display text-rose-700 tabular-nums">
              ${REVENUE_ANALYTICS_DATA.overdueAmount.toLocaleString()}
            </div>
            <div className="text-[11px] text-rose-600 font-semibold mt-1">1 organization past due</div>
          </div>
        </div>

        {/* Plan Breakdown & Monthly Growth Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue by Plan Tier */}
          <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900 font-display">
                Revenue by Subscription Tier
              </h3>
              <p className="text-xs text-gray-500">
                Monthly recurring revenue distribution across subscription tiers
              </p>
            </div>

            <div className="space-y-3">
              {REVENUE_ANALYTICS_DATA.planBreakdown.map((plan, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-800">{plan.planName}</span>
                    <span className="font-mono text-slate-700 font-bold tabular-nums">
                      ${plan.mrr.toLocaleString()} ({plan.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${plan.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly MRR Expansion Trend */}
          <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 font-display">
                  Monthly MRR Growth Trajectory
                </h3>
                <p className="text-xs text-gray-500">
                  Net recurring expansion over the last 6 months
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                +41.1% 6-Mo Gain
              </span>
            </div>

            <div className="h-44 flex items-end gap-3 pt-6 pb-2 border-b border-slate-100">
              {REVENUE_ANALYTICS_DATA.revenueTrend.map((item, idx) => {
                const max = 14000;
                const pct = (item.mrr / max) * 100;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <div
                      style={{ height: `${pct}%` }}
                      className="w-full bg-emerald-500 rounded-t group-hover:bg-emerald-600 transition-all"
                      title={`${item.month}: $${item.mrr.toLocaleString()}`}
                    />
                    <span className="text-[10px] text-slate-400 font-mono">{item.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Invoices Status & Reconciled Entries Table */}
        <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 font-display">
                Recent Issued Invoices & Settlement Records
              </h3>
              <p className="text-xs text-gray-500">
                Cross-workspace billing runs and automated charge settlement status
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-500">
                  <th className="py-2 px-3">Invoice ID</th>
                  <th className="py-2 px-3">ORG ID</th>
                  <th className="py-2 px-3">Organization</th>
                  <th className="py-2 px-3">Plan / Item</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                  <th className="py-2 px-3">Due Date</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 tabular-nums">
                      {inv.id}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs font-medium text-slate-600 tabular-nums">
                      {inv.orgCode}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-900">{inv.orgName}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{inv.planName}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                      ${inv.amount.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono tabular-nums">
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3">
                      {inv.status === "Paid" && (
                        <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                          Paid
                        </span>
                      )}
                      {inv.status === "Open" && (
                        <span className="inline-flex items-center text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                          Open
                        </span>
                      )}
                      {inv.status === "Overdue" && (
                        <span className="inline-flex items-center text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60">
                          Overdue
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

