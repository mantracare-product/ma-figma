/**
 * AdminAnalyticsProcessMovement.tsx
 * Path: src/app/pages/admin/AdminAnalyticsProcessMovement.tsx
 *
 * Dedicated Admin Console for Process Movement & Funnel Bottlenecks:
 * - Patient / task journey conversion through clinical stages
 * - Stage dwell time analysis & bottleneck diagnostics
 * - Stuck task alerts & dropout analysis
 * - Global filters & CSV export
 */

import React, { useState } from "react";
import PageHeader from "../../components/layout/PageHeader";
import PageTopBar from "../../components/layout/PageTopBar";
import {
  PROCESS_MOVEMENT_DATA,
  exportToCsv,
} from "../../../lib/productAnalyticsStore";
import { useOrganization } from "../../context/OrganizationContext";
import {
  Workflow,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Download,
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
  Activity,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminAnalyticsProcessMovement() {
  const { organizations } = useOrganization();
  const [dateRange, setDateRange] = useState("30d");
  const [selectedOrg, setSelectedOrg] = useState("all");

  const handleExportCsv = () => {
    const headers = [
      "Stage Name",
      "Tasks Entered",
      "Tasks Completed",
      "Conversion Rate (%)",
      "Avg Dwell Time (Hours)",
      "Is Bottleneck",
    ];
    const rows = PROCESS_MOVEMENT_DATA.funnelStages.map((s) => [
      s.stageName,
      s.tasksEntered,
      s.tasksCompleted,
      `${s.conversionRate}%`,
      s.avgDwellTimeHours,
      s.isBottleneck ? "Yes" : "No",
    ]);
    exportToCsv("mantra-process-movement-funnel", headers, rows);
    toast.success("Exported process movement analytics to CSV");
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#fafafa]">
      <PageHeader
        title="Process Movement Analytics"
        subtitle="End-to-end clinical task progression, stage conversion rates, and operational bottleneck detection"
        actions={
          <div className="flex items-center gap-2">
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-gray-700 focus:outline-none cursor-pointer shadow-2xs"
            >
              <option value="all">All Organizations</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.orgCode || "ORG-0001"})
                </option>
              ))}
            </select>

            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-gray-700 focus:outline-none cursor-pointer shadow-2xs"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last Quarter</option>
            </select>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export CSV
            </button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Workflows</span>
              <Workflow className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold font-display text-gray-900 tabular-nums">
              {PROCESS_MOVEMENT_DATA.totalWorkflows}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Cross-organization active definitions</div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider">In-Flight Tasks</span>
              <Activity className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold font-display text-indigo-700 tabular-nums">
              {PROCESS_MOVEMENT_DATA.activeInstances.toLocaleString()}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Currently progressing through stages</div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider">Overall Completion</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-display text-emerald-700 tabular-nums">
              {PROCESS_MOVEMENT_DATA.completionRate}%
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1">High-reliability flow</div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider">Identified Bottlenecks</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold font-display text-amber-700 tabular-nums">
              {PROCESS_MOVEMENT_DATA.bottlenecks.length} Stages
            </div>
            <div className="text-[11px] text-amber-600 font-semibold mt-1">Requiring administrative focus</div>
          </div>
        </div>

        {/* Funnel Progression Stages */}
        <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 font-display">
                Clinical Workflow Funnel & Stage Transition
              </h3>
              <p className="text-xs text-gray-500">
                Progression volume, completion percentages, and average dwell time per pipeline stage
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {PROCESS_MOVEMENT_DATA.funnelStages.map((stage, idx) => {
              const maxEntered = 2500;
              const widthPct = (stage.tasksEntered / maxEntered) * 100;

              return (
                <div key={stage.stageId} className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/70 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-mono text-xs flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{stage.stageName}</span>
                      {stage.isBottleneck && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/60">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          Bottleneck: {stage.avgDwellTimeHours}h Dwell
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
                      <span className="text-slate-600">
                        Entered: <strong className="text-slate-900">{stage.tasksEntered.toLocaleString()}</strong>
                      </span>
                      <span className="text-slate-600">
                        Completed: <strong className="text-emerald-700">{stage.tasksCompleted.toLocaleString()}</strong>
                      </span>
                      <span className="font-bold text-slate-900">
                        {stage.conversionRate}% Conv.
                      </span>
                    </div>
                  </div>

                  {/* Funnel Bar */}
                  <div className="w-full bg-slate-200/80 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        stage.isBottleneck ? "bg-amber-500" : "bg-blue-600"
                      }`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>

                  {stage.bottleneckReason && (
                    <div className="text-[11px] text-rose-600 font-medium pt-1">
                      Reason: {stage.bottleneckReason}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottleneck Diagnostic Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PROCESS_MOVEMENT_DATA.bottlenecks.map((b, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{b.stage}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    b.impact === "High"
                      ? "bg-rose-50 text-rose-700 border border-rose-200/60"
                      : b.impact === "Medium"
                      ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                      : "bg-blue-50 text-blue-700 border border-blue-200/60"
                  }`}
                >
                  {b.impact} Impact
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Avg Wait</div>
                  <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">{b.avgTime}</div>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Stuck Tasks</div>
                  <div className="text-sm font-bold font-mono text-rose-600 mt-0.5">{b.stuckCount}</div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                Recommended Action: Enable automated escalation webhook to notify case managers after 24h idle time.
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

