import React from "react";
import PageHeader from "../../components/layout/PageHeader";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { DollarSign, TrendingUp, Calendar, CreditCard, ArrowUpRight } from "lucide-react";

const MONTHLY_REVENUE_DATA = [
  { month: "Mar 2026", insurance: 42500, patient: 12200, total: 54700, daysToPay: 24.2 },
  { month: "Apr 2026", insurance: 48900, patient: 14100, total: 63000, daysToPay: 22.8 },
  { month: "May 2026", insurance: 53200, patient: 15800, total: 69000, daysToPay: 21.5 },
  { month: "Jun 2026", insurance: 58400, patient: 17400, total: 75800, daysToPay: 20.9 },
  { month: "Jul 2026", insurance: 64100, patient: 18900, total: 83000, daysToPay: 19.8 },
  { month: "Aug 2026", insurance: 71200, patient: 21400, total: 92600, daysToPay: 18.4 },
];

export default function RevenueAnalysis() {
  return (
    <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* Section Header */}
      <div className="space-y-1">
        <h2
          className="text-2xl font-bold text-[#1e293b] tracking-tight"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Revenue Analysis & Collections Trend
        </h2>
        <p className="text-sm text-slate-500 font-normal">
          Monthly insurance vs patient payment splits, reimbursement velocity, and yield
        </p>
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            August Gross Collections
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              $92,600.00
            </span>
            <span className="text-xs text-emerald-600 font-semibold inline-flex items-center">
              <ArrowUpRight className="w-3 h-3" /> 11.5% MoM
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">76.8% Insurance • 23.2% Patient PR</p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Net Collection Rate
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
              96.2%
            </span>
            <span className="text-xs text-emerald-600 font-semibold">Exceeds Benchmark</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Allowed amounts vs collected ledger</p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Days in A/R Velocity
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-blue-700 tabular-nums">
              18.4 days
            </span>
            <span className="text-xs text-blue-600 font-semibold">-5.8d from March</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Time from service to full settlement</p>
        </div>
      </div>

      {/* Chart 1: Monthly Stacked Bar Collections */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-display">
              Collections by Funding Source (6-Month Trend)
            </h3>
            <p className="text-xs text-slate-500">Insurance Remittance vs Patient Responsibility</p>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={MONTHLY_REVENUE_DATA} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} />
              <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip
                formatter={(value: any) => [`$${Number(value).toLocaleString()}`, ""]}
                contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: "12px" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
              <Bar dataKey="insurance" name="Insurance Paid" fill="#2563EB" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="patient" name="Patient Paid" fill="#10B981" stackId="a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Days to Pay Trend */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 font-display">
            A/R Days to Remit Velocity
          </h3>
          <p className="text-xs text-slate-500">Accelerated clearinghouse turnaround time (in days)</p>
        </div>

        <div className="h-56 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={MONTHLY_REVENUE_DATA} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} />
              <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} unit="d" />
              <Tooltip
                formatter={(value: any) => [`${value} days`, "Turnaround Time"]}
                contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: "12px" }}
              />
              <Line
                type="monotone"
                dataKey="daysToPay"
                name="Avg Days to Pay"
                stroke="#6366F1"
                strokeWidth={3}
                dot={{ fill: "#6366F1", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
