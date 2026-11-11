/**
 * AdminAnalyticsOverview.tsx
 * Path: src/app/pages/admin/AdminAnalyticsOverview.tsx
 *
 * Dedicated Admin Console for Platform-Wide Product Analytics Overview:
 * - High-level operational metrics & period-over-period delta badges
 * - Platform volume trends
 * - Top active organizations table with mono chips
 * - System health and automation throughput summary
 * - Global filters & CSV export
 */

import React, { useState } from "react";
import PageHeader from "../../components/layout/PageHeader";
import PageTopBar from "../../components/layout/PageTopBar";
import {
  OVERVIEW_KPIS,
  INITIAL_ORG_USAGE,
  exportToCsv,
} from "../../../lib/productAnalyticsStore";
import {
  Building2,
  PhoneCall,
  Sparkles,
  Zap,
  DollarSign,
  TrendingUp,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router";

export default function AdminAnalyticsOverview() {
  const [dateRange, setDateRange] = useState("30d");

  const handleExportCsv = () => {
    const headers = [
      "Metric",
      "Current Value",
      "Change vs Previous Period",
    ];
    const rows = [
      ["Total Workspaces", OVERVIEW_KPIS.totalOrganizations, OVERVIEW_KPIS.totalOrganizationsChange],
      ["Active AI Agents", OVERVIEW_KPIS.activeAiAgents, OVERVIEW_KPIS.activeAiAgentsChange],
      ["Calls Processed", OVERVIEW_KPIS.callsProcessed, OVERVIEW_KPIS.callsProcessedChange],
      ["Automation Executions", OVERVIEW_KPIS.automationRuns, OVERVIEW_KPIS.automationRunsChange],
      ["Net Platform MRR ($)", `$${OVERVIEW_KPIS.netMrr}`, OVERVIEW_KPIS.netMrrChange],
      ["AI Resolution Rate (%)", `${OVERVIEW_KPIS.avgResolutionRate}%`, OVERVIEW_KPIS.avgResolutionRateChange],
    ];
    exportToCsv("mantra-platform-overview-analytics", headers, rows);
    toast.success("Exported overview analytics to CSV");
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#fafafa]">
      <PageHeader
        title="Product Analytics Overview"
        subtitle="Platform-wide clinical operations, agent concurrency, call throughput, and revenue telemetry"
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
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">Organizations</span>
              <Building2 className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold font-display text-gray-900 tabular-nums">
              {OVERVIEW_KPIS.totalOrganizations}
            </div>
            <div className="text-[10px] font-semibold text-emerald-600 mt-1">
              {OVERVIEW_KPIS.totalOrganizationsChange}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">Active Agents</span>
              <Sparkles className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold font-display text-purple-700 tabular-nums">
              {OVERVIEW_KPIS.activeAiAgents}
            </div>
            <div className="text-[10px] font-semibold text-purple-600 mt-1">
              {OVERVIEW_KPIS.activeAiAgentsChange}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">Calls Processed</span>
              <PhoneCall className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold font-display text-gray-900 tabular-nums">
              {OVERVIEW_KPIS.callsProcessed.toLocaleString()}
            </div>
            <div className="text-[10px] font-semibold text-emerald-600 mt-1">
              {OVERVIEW_KPIS.callsProcessedChange}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">Automations</span>
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold font-display text-gray-900 tabular-nums">
              {OVERVIEW_KPIS.automationRuns.toLocaleString()}
            </div>
            <div className="text-[10px] font-semibold text-emerald-600 mt-1">
              {OVERVIEW_KPIS.automationRunsChange}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">Net MRR</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-display text-emerald-700 tabular-nums">
              ${OVERVIEW_KPIS.netMrr.toLocaleString()}
            </div>
            <div className="text-[10px] font-semibold text-emerald-600 mt-1">
              {OVERVIEW_KPIS.netMrrChange}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">Resolution</span>
              <ShieldCheck className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold font-display text-gray-900 tabular-nums">
              {OVERVIEW_KPIS.avgResolutionRate}%
            </div>
            <div className="text-[10px] font-semibold text-emerald-600 mt-1">
              {OVERVIEW_KPIS.avgResolutionRateChange}
            </div>
          </div>
        </div>

        {/* Operational Trend & Split Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Chart Mock Card */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 font-display">
                  Platform Interaction Volume
                </h3>
                <p className="text-xs text-gray-500">
                  Combined daily voice calls and automated workflow executions
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-blue-600 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Voice Calls
                </span>
                <span className="flex items-center gap-1.5 text-purple-600 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600" /> Automations
                </span>
              </div>
            </div>

            {/* Visual Bar chart presentation */}
            <div className="h-60 flex items-end gap-3 pt-6 pb-2 px-2 border-b border-slate-100">
              {[
                { day: "M", calls: 40, auto: 65 },
                { day: "T", calls: 55, auto: 80 },
                { day: "W", calls: 70, auto: 95 },
                { day: "T", calls: 65, auto: 88 },
                { day: "F", calls: 85, auto: 100 },
                { day: "S", calls: 45, auto: 50 },
                { day: "S", calls: 30, auto: 40 },
                { day: "M", calls: 75, auto: 90 },
                { day: "T", calls: 80, auto: 95 },
                { day: "W", calls: 92, auto: 105 },
                { day: "T", calls: 88, auto: 102 },
                { day: "F", calls: 98, auto: 115 },
              ].map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1 h-full">
                    <div
                      style={{ height: `${(item.calls / 120) * 100}%` }}
                      className="w-full bg-blue-500 rounded-t-sm group-hover:bg-blue-600 transition-all"
                      title={`Calls: ${item.calls * 35}`}
                    />
                    <div
                      style={{ height: `${(item.auto / 120) * 100}%` }}
                      className="w-full bg-purple-500 rounded-t-sm group-hover:bg-purple-600 transition-all"
                      title={`Automations: ${item.auto * 110}`}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{item.day}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>Peak hourly throughput: 4,680 events / hr</span>
              <span className="text-emerald-600 font-semibold">99.98% successful execution</span>
            </div>
          </div>

          {/* Platform Health & Quick Navigation */}
          <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 font-display">
              Telephony & AI Subsystems
            </h3>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-900">Twilio SIP Trunk</div>
                  <div className="text-[11px] text-slate-500">Latency: 28ms · Primary carrier</div>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  Operational
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-900">Exotel India IVR</div>
                  <div className="text-[11px] text-slate-500">Latency: 42ms · Inbound DID stock</div>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  Operational
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-900">Deepgram Voice Transcription</div>
                  <div className="text-[11px] text-slate-500">Nova-2 Medical streaming</div>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  Operational
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-900">ElevenLabs TTS Engine</div>
                  <div className="text-[11px] text-slate-500">Multilingual voice synthesis</div>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  Operational
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <Link
                to="/admin/product-analytics/calls"
                className="w-full flex items-center justify-between text-xs font-semibold text-blue-600 hover:underline p-1"
              >
                <span>Drill down into Voice Calls Telemetry</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Top Active Organizations Strip */}
        <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 font-display">
                Top Active Healthcare Workspaces
              </h3>
              <p className="text-xs text-gray-500">
                Ranked by 30-day voice minutes and automation throughput
              </p>
            </div>
            <Link
              to="/admin/product-analytics/organization-usage"
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              View All Usage Matrix →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-500">
                  <th className="py-2 px-3">ORG ID</th>
                  <th className="py-2 px-3">Organization</th>
                  <th className="py-2 px-3">Plan</th>
                  <th className="py-2 px-3 text-right">Calls (30d)</th>
                  <th className="py-2 px-3 text-right">Task Throughput</th>
                  <th className="py-2 px-3 text-right">AI Accuracy</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {INITIAL_ORG_USAGE.slice(0, 4).map((org) => (
                  <tr key={org.orgId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-xs font-medium text-slate-600 tabular-nums">
                      {org.orgCode}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-900">{org.orgName}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-medium">{org.planName}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900 tabular-nums">
                      {org.callsLast30Days.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700 tabular-nums">
                      {org.taskThroughput.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 tabular-nums">
                      {org.aiAccuracyScore}%
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {org.status}
                      </span>
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

