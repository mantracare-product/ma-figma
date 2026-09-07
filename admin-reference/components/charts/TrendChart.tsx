"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { EmptyState } from "../ui/EmptyState";
import { LineChart as LineChartIcon } from "lucide-react";

export interface TrendDataPoint {
  date: string;
  totalCalls: number;
  completedCalls: number;
  failedCalls: number;
}

const DEFAULT_TREND_DATA: TrendDataPoint[] = [
  { date: "Mon", totalCalls: 14200, completedCalls: 13400, failedCalls: 800 },
  { date: "Tue", totalCalls: 18500, completedCalls: 17200, failedCalls: 1300 },
  { date: "Wed", totalCalls: 22100, completedCalls: 20600, failedCalls: 1500 },
  { date: "Thu", totalCalls: 19800, completedCalls: 18450, failedCalls: 1350 },
  { date: "Fri", totalCalls: 24300, completedCalls: 22800, failedCalls: 1500 },
  { date: "Sat", totalCalls: 16400, completedCalls: 15200, failedCalls: 1200 },
  { date: "Sun", totalCalls: 13150, completedCalls: 12270, failedCalls: 880 },
];

export interface TrendChartProps {
  data?: TrendDataPoint[];
  hasData?: boolean;
  className?: string;
}

// Custom Glassmorphic Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-xl border border-white/80 rounded-2xl p-3 shadow-[0_10px_25px_-4px_rgba(0,0,0,0.08)] text-xs">
        <div className="font-semibold text-[#222222] mb-1.5 pb-1 border-b border-slate-100">
          {label}
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="w-2 h-2 rounded-full bg-[#1456f0]" />
              Total Calls:
            </span>
            <span className="font-display font-bold text-[#222222]">
              {payload[0]?.value?.toLocaleString()}
            </span>
          </div>
          {payload[1] && (
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                Completed:
              </span>
              <span className="font-display font-bold text-[#10b981]">
                {payload[1]?.value?.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export const TrendChart: React.FC<TrendChartProps> = ({
  data = DEFAULT_TREND_DATA,
  hasData = true,
  className = "",
}) => {
  const [activeMetric, setActiveMetric] = useState<"all" | "completed">("all");

  if (!hasData || !data || data.length === 0) {
    return (
      <div className={`h-[280px] flex items-center justify-center ${className}`}>
        <EmptyState
          icon={LineChartIcon}
          title="No trend data available for this period"
          description="Adjust your filters or date range above to view activity trends."
          compact
        />
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Chart Sub-toolbar */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1456f0]" />
            <span className="text-[#45515e] font-medium">Total Calls</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
            <span className="text-[#45515e] font-medium">Completed</span>
          </div>
        </div>

        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-100/70 border border-slate-200/50 text-xs">
          <button
            type="button"
            onClick={() => setActiveMetric("all")}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              activeMetric === "all"
                ? "bg-white text-[#222222] shadow-xs"
                : "text-slate-500 hover:text-[#222222]"
            }`}
          >
            Combined
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric("completed")}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              activeMetric === "completed"
                ? "bg-white text-[#222222] shadow-xs"
                : "text-slate-500 hover:text-[#222222]"
            }`}
          >
            Completed Only
          </button>
        </div>
      </div>

      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="totalCallsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1456f0" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#1456f0" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="rgba(226, 232, 240, 0.6)"
            />

            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              dy={6}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
              dx={-4}
            />

            <Tooltip content={<CustomTooltip />} />

            {activeMetric === "all" && (
              <Area
                type="monotone"
                dataKey="totalCalls"
                stroke="#1456f0"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#totalCallsGradient)"
              />
            )}

            <Area
              type="monotone"
              dataKey="completedCalls"
              stroke="#10b981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#completedGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
