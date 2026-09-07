"use client";

import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { EmptyState } from "../ui/EmptyState";
import { PieChart as PieChartIcon } from "lucide-react";
import { CallDistributionPoint } from "@/lib/types";

const DEFAULT_DISTRIBUTION: CallDistributionPoint[] = [
  { name: "Inbound AI", value: 68400, percentage: 53, color: "#1456f0" },
  { name: "Outbound Lead", value: 34200, percentage: 27, color: "#3b82f6" },
  { name: "Direct Support", value: 16850, percentage: 13, color: "#60a5fa" },
  { name: "Escalations", value: 9000, percentage: 7, color: "#f59e0b" },
];

export interface DistributionChartProps {
  data?: CallDistributionPoint[];
  hasData?: boolean;
  className?: string;
}

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as CallDistributionPoint;
    return (
      <div className="bg-white/90 backdrop-blur-xl border border-white/80 rounded-2xl p-2.5 shadow-md text-xs">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: data.color }}
          />
          <span className="font-semibold text-[#222222]">{data.name}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-slate-500">
          <span>{data.value.toLocaleString()} calls</span>
          <span className="font-bold text-[#222222]">{data.percentage}%</span>
        </div>
      </div>
    );
  }
  return null;
};

export const DistributionChart: React.FC<DistributionChartProps> = ({
  data = DEFAULT_DISTRIBUTION,
  hasData = true,
  className = "",
}) => {
  if (!hasData || !data || data.length === 0) {
    return (
      <div className={`h-[280px] flex items-center justify-center ${className}`}>
        <EmptyState
          icon={PieChartIcon}
          title="No distribution data available"
          description="Select a different filter stage or date to view breakdown."
          compact
        />
      </div>
    );
  }

  const totalCalls = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className={`w-full flex flex-col justify-between ${className}`}>
      {/* Chart Canvas */}
      <div className="relative h-[180px] w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomPieTooltip />} />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={76}
              paddingAngle={3}
              dataKey="value"
              stroke="rgba(255, 255, 255, 0.8)"
              strokeWidth={2}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Metric */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Total
          </span>
          <span className="font-display text-lg font-bold text-[#222222]">
            {(totalCalls / 1000).toFixed(1)}k
          </span>
        </div>
      </div>

      {/* Breakdown Legend Grid */}
      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100/80">
        {data.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between p-1.5 rounded-xl bg-white/40 border border-white/50 text-xs"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[#45515e] truncate text-[11px] font-medium">
                {item.name}
              </span>
            </div>
            <span className="font-bold text-[#222222] text-[11px] shrink-0">
              {item.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
