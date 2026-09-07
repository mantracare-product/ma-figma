"use client";

import React, { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatCard } from "@/components/ui/StatCard";
import { ProgressRow } from "@/components/ui/ProgressRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { TrendChart } from "@/components/charts/TrendChart";
import { DistributionChart } from "@/components/charts/DistributionChart";
import {
  PhoneCall,
  CheckCircle2,
  PhoneOff,
  Clock,
  Sparkles,
  TrendingUp,
  Activity,
  Layers,
  Info,
  Eye,
  EyeOff,
  Zap,
} from "lucide-react";

export default function AnalyticsPage({ onMenuToggle }: { onMenuToggle?: () => void }) {
  // State to simulate empty states toggle for design demonstration
  const [showChartData, setShowChartData] = useState(true);
  const [showInsightData, setShowInsightData] = useState(false);

  const funnelData = [
    {
      id: "total",
      label: "Total Calls",
      count: 128450,
      percentage: 100,
      subtitle: "Total dialed and incoming sessions initiated across all channels",
      barColor: "bg-gradient-to-r from-[#1456f0] to-[#3b82f6]",
      badgeVariant: "brand" as const,
    },
    {
      id: "connected",
      label: "Connected Calls",
      count: 123180,
      percentage: 95.9,
      subtitle: "Calls successfully routed and answered by recipient or AI agent",
      barColor: "bg-gradient-to-r from-[#2563eb] to-[#60a5fa]",
      badgeVariant: "brand" as const,
    },
    {
      id: "completed",
      label: "Completed Calls",
      count: 118920,
      percentage: 92.6,
      subtitle: "Goal achieved with resolution and clean session termination",
      barColor: "bg-gradient-to-r from-[#10b981] to-[#34d399]",
      badgeVariant: "success" as const,
    },
  ];

  const keyMetrics = [
    {
      id: "completion-rate",
      label: "Completion Rate",
      value: "92.6%",
      description: "Consistent high-engagement completion across all active campaigns",
      icon: Activity,
      iconBg: "bg-emerald-50 text-emerald-600",
      tag: "Optimal",
    },
    {
      id: "avg-duration",
      label: "Avg. Call Duration",
      value: "3m 42s",
      description: "Optimized resolution time reducing waiting queues by 18%",
      icon: Clock,
      iconBg: "bg-blue-50 text-[#1456f0]",
      tag: "-18s",
    },
    {
      id: "volume-intensity",
      label: "Volume Intensity",
      value: "High (Peak: 2.4k/hr)",
      description: "Automated concurrency scaling handled 99.98% load without drops",
      icon: Zap,
      iconBg: "bg-purple-50 text-purple-600",
      tag: "Automated",
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Top Bar with Page Header & 4 Glass Filter Dropdowns */}
      <TopBar
        title="Overview Analytics"
        subtitle="Track performance and automation health"
        onMenuToggle={onMenuToggle}
      />

      {/* Row 1: 4 Stat Cards */}
      <section aria-label="Key Statistics">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <StatCard
            title="Total Calls"
            value="128,450"
            icon={PhoneCall}
            iconBgColor="bg-blue-50/90"
            iconColor="text-[#1456f0]"
            trend={{ value: "12.4%", isPositive: true, label: "vs last period" }}
          />

          <StatCard
            title="Completed"
            value="118,920"
            icon={CheckCircle2}
            iconBgColor="bg-emerald-50/90"
            iconColor="text-emerald-600"
            badge={{ text: "92.6% Success", variant: "success" }}
            subtitle="Successfully closed calls"
          />

          <StatCard
            title="Failed / Missed"
            value="9,530"
            icon={PhoneOff}
            iconBgColor="bg-rose-50/90"
            iconColor="text-rose-600"
            badge={{ text: "7.4% Rate", variant: "danger" }}
            subtitle="Drop-offs & line busy"
          />

          <StatCard
            title="Avg. Duration"
            value="3m 42s"
            icon={Clock}
            iconBgColor="bg-sky-50/90"
            iconColor="text-[#3b82f6]"
            trend={{ value: "18s faster", isPositive: true, label: "resolution" }}
          />
        </div>
      </section>

      {/* Row 2: Two-Column Charts Row (2/3 + 1/3) */}
      <section aria-label="Performance and Distribution Trends">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Trend Chart (2/3 Column) */}
          <GlassCard
            variant="default"
            rounded="3xl"
            padding="lg"
            className="lg:col-span-2 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg sm:text-xl font-bold text-[#222222]">
                    All Time Performance
                  </h3>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#1456f0] border border-blue-100">
                    Live
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Call throughput and successful completion volume
                </p>
              </div>

              {/* Demo Toggle to preview Empty State */}
              <button
                type="button"
                onClick={() => setShowChartData(!showChartData)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/60 hover:bg-white/90 text-slate-500 hover:text-[#222222] border border-white/60 text-xs font-medium transition-colors shadow-xs"
                title="Toggle chart data / empty state preview"
              >
                {showChartData ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Preview Empty State</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Show Live Data</span>
                  </>
                )}
              </button>
            </div>

            <TrendChart hasData={showChartData} />
          </GlassCard>

          {/* Distribution Chart (1/3 Column) */}
          <GlassCard
            variant="default"
            rounded="3xl"
            padding="lg"
            className="flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <div>
                <h3 className="font-display text-lg sm:text-xl font-bold text-[#222222]">
                  Call Distribution
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Channels & routing allocation
                </p>
              </div>
            </div>

            <DistributionChart hasData={showChartData} />
          </GlassCard>
        </div>
      </section>

      {/* Row 3: Two-Column Bottom Row (Conversion Overview + Performance Analysis) */}
      <section aria-label="Conversion Funnel and Performance Analysis">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Card A: Conversion Overview */}
          <GlassCard variant="default" rounded="3xl" padding="lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-lg sm:text-xl font-bold text-[#222222]">
                  Conversion Overview
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Step-by-step call funnel throughput and success conversion
                </p>
              </div>
              <div className="p-2 rounded-2xl bg-blue-50 text-[#1456f0] border border-blue-100">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-3">
              {funnelData.map((row) => (
                <ProgressRow
                  key={row.id}
                  label={row.label}
                  count={row.count}
                  percentage={row.percentage}
                  subtitle={row.subtitle}
                  barColor={row.barColor}
                  badgeVariant={row.badgeVariant}
                />
              ))}
            </div>
          </GlassCard>

          {/* Card B: Performance Analysis */}
          <GlassCard variant="default" rounded="3xl" padding="lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-lg sm:text-xl font-bold text-[#222222]">
                  Performance Analysis
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automated agent health signals and system intelligence
                </p>
              </div>
              <div className="p-2 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Column 1: Key Metrics */}
              <div className="space-y-2.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Key Metrics
                </div>

                {keyMetrics.map((metric) => {
                  const Icon = metric.icon;
                  return (
                    <div
                      key={metric.id}
                      className="p-3 rounded-2xl bg-white/40 border border-white/50 backdrop-blur-xs space-y-1 hover:bg-white/70 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-semibold ${metric.iconBg}`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-semibold text-[#222222]">
                            {metric.label}
                          </span>
                        </div>
                        <span className="font-display font-bold text-xs text-[#1456f0]">
                          {metric.value}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug pl-9">
                        {metric.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Column 2: System Insights */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    System Insights
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInsightData(!showInsightData)}
                    className="text-[10px] text-slate-400 hover:text-[#1456f0] underline transition-colors"
                  >
                    {showInsightData ? "Show empty" : "Show insight"}
                  </button>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                  {!showInsightData ? (
                    <EmptyState
                      icon={Sparkles}
                      title="No data available for analysis."
                      description="AI diagnostic models are currently calculating system throughput patterns for this cycle."
                      compact
                      className="h-full min-h-[190px]"
                    />
                  ) : (
                    <div className="p-4 rounded-2xl bg-white/50 border border-white/70 backdrop-blur-sm space-y-3 h-full flex flex-col justify-center">
                      <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Optimal System Performance
                      </div>
                      <p className="text-xs text-[#45515e] leading-relaxed">
                        Call completion and voice latency latency is 14% ahead of average SLA benchmarks. No bottleneck detected.
                      </p>
                      <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                        Updated 2 mins ago • Diagnostic Engine v2.4
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
