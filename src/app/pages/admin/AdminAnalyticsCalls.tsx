/**
 * AdminAnalyticsCalls.tsx
 * Path: src/app/pages/admin/AdminAnalyticsCalls.tsx
 *
 * Dedicated Admin Console for Voice Calls Telemetry & AI Outcomes:
 * - Call volume breakdown & Inbound vs Outbound split
 * - AI Outcome distribution (Booked, Resolved, Transferred, Callback)
 * - Peak 24h hourly volume distribution
 * - Answered vs Missed vs Dropped analysis
 * - Global filters & CSV export
 */

import React, { useState } from "react";
import PageHeader from "../../components/layout/PageHeader";
import PageTopBar from "../../components/layout/PageTopBar";
import {
  CALLS_ANALYTICS_DATA,
  exportToCsv,
} from "../../../lib/productAnalyticsStore";
import { useOrganization } from "../../context/OrganizationContext";
import {
  PhoneCall,
  Clock,
  CheckCircle2,
  XCircle,
  Download,
  Calendar,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminAnalyticsCalls() {
  const { organizations } = useOrganization();
  const [dateRange, setDateRange] = useState("30d");
  const [selectedOrg, setSelectedOrg] = useState("all");

  const handleExportCsv = () => {
    const headers = ["Outcome / Metric", "Call Count", "Percentage (%)"];
    const rows = CALLS_ANALYTICS_DATA.outcomeSplit.map((o) => [
      o.label,
      o.count,
      `${o.percentage}%`,
    ]);
    exportToCsv("mantra-voice-call-analytics", headers, rows);
    toast.success("Exported voice calls analytics to CSV");
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#fafafa]">
      <PageHeader
        title="Voice Calls Analytics"
        subtitle="In-depth telephony session telemetry, outcome classification, and peak concurrency analysis"
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
              <span className="text-xs font-semibold uppercase tracking-wider">Total Calls (30d)</span>
              <PhoneCall className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold font-display text-gray-900 tabular-nums">
              {CALLS_ANALYTICS_DATA.totalCalls.toLocaleString()}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              {CALLS_ANALYTICS_DATA.inboundCount.toLocaleString()} Inbound · {CALLS_ANALYTICS_DATA.outboundCount.toLocaleString()} Outbound
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider">Answer Rate</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-display text-emerald-700 tabular-nums">
              {CALLS_ANALYTICS_DATA.answeredRate}%
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1">
              Top industry benchmark: &gt;90%
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Voice Minutes</span>
              <Clock className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold font-display text-indigo-700 tabular-nums">
              {CALLS_ANALYTICS_DATA.totalMinutes.toLocaleString()} min
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              Avg duration: {CALLS_ANALYTICS_DATA.avgDurationSec} seconds
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider">Direct AI Bookings</span>
              <Sparkles className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold font-display text-purple-700 tabular-nums">
              42.0%
            </div>
            <div className="text-[11px] text-purple-600 font-semibold mt-1">
              14,653 appointments confirmed
            </div>
          </div>
        </div>

        {/* AI Outcome Split & Status Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Outcome Classification */}
          <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900 font-display">
                AI Clinical Outcome Distribution
              </h3>
              <p className="text-xs text-gray-500">
                Automated classification of conversation intent and terminal patient state
              </p>
            </div>

            <div className="space-y-3">
              {CALLS_ANALYTICS_DATA.outcomeSplit.map((outcome, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-800">{outcome.label}</span>
                    <span className="font-mono text-slate-500 tabular-nums">
                      {outcome.count.toLocaleString()} calls ({outcome.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${outcome.color}`}
                      style={{ width: `${outcome.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Call Connection Status Split */}
          <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900 font-display">
                Connection Status Breakdown
              </h3>
              <p className="text-xs text-gray-500">
                PSTN termination health, carrier drops, and voicemail pickups
              </p>
            </div>

            <div className="space-y-3">
              {CALLS_ANALYTICS_DATA.statusSplit.map((status, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-800">{status.label}</span>
                    <span className="font-mono text-slate-500 tabular-nums">
                      {status.count.toLocaleString()} calls ({status.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${status.color}`}
                      style={{ width: `${status.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 mt-4">
              <strong>Triage Policy:</strong> Voicemails and missed inquiries trigger automated follow-up SMS tasks within 90 seconds.
            </div>
          </div>
        </div>

        {/* Peak Hourly Volume Heatmap Bar Card */}
        <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 font-display">
                Peak Hourly Inbound Distribution (24-Hour Profile)
              </h3>
              <p className="text-xs text-gray-500">
                Average simultaneous caller traffic throughout operating clinic hours
              </p>
            </div>
            <div className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60">
              Peak: 11:00 AM (4,680 calls)
            </div>
          </div>

          <div className="h-44 flex items-end gap-2 pt-6 pb-2 border-b border-slate-100">
            {CALLS_ANALYTICS_DATA.hourlyVolume.map((item, idx) => {
              const max = 5000;
              const pct = (item.calls / max) * 100;
              const isPeak = item.calls > 4000;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <div
                    style={{ height: `${pct}%` }}
                    className={`w-full rounded-t transition-all ${
                      isPeak ? "bg-indigo-600 group-hover:bg-indigo-700" : "bg-blue-400 group-hover:bg-blue-500"
                    }`}
                    title={`${item.hour}: ${item.calls.toLocaleString()} calls`}
                  />
                  <span className="text-[10px] text-slate-400 font-mono">{item.hour}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

