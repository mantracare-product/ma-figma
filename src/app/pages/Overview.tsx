import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Phone,
  CheckCircle,
  Clock,
  ChevronDown,
  Sparkles,
  BarChart3,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import PageHeader from "../components/layout/PageHeader";

// Dates series matching reference UI (Jul 7 to Aug 13)
const performanceData = [
  { date: "Jul 7", totalVolume: 12, successful: 8 },
  { date: "Jul 8", totalVolume: 38, successful: 15 },
  { date: "Jul 9", totalVolume: 25, successful: 18 },
  { date: "Jul 10", totalVolume: 18, successful: 22 },
  { date: "Jul 11", totalVolume: 28, successful: 12 },
  { date: "Jul 12", totalVolume: 2, successful: 1 },
  { date: "Jul 13", totalVolume: 4, successful: 2 },
  { date: "Jul 14", totalVolume: 3, successful: 1 },
  { date: "Jul 15", totalVolume: 15, successful: 9 },
  { date: "Jul 16", totalVolume: 17, successful: 10 },
  { date: "Jul 17", totalVolume: 5, successful: 4 },
  { date: "Jul 18", totalVolume: 20, successful: 14 },
  { date: "Jul 26", totalVolume: 4, successful: 2 },
  { date: "Jul 27", totalVolume: 68, successful: 28 },
  { date: "Jul 28", totalVolume: 11, successful: 7 },
  { date: "Jul 29", totalVolume: 15, successful: 11 },
  { date: "Jul 30", totalVolume: 3, successful: 2 },
  { date: "Jul 31", totalVolume: 4, successful: 3 },
  { date: "Aug 1", totalVolume: 18, successful: 12 },
  { date: "Aug 3", totalVolume: 47, successful: 32 },
  { date: "Aug 4", totalVolume: 42, successful: 26 },
  { date: "Aug 5", totalVolume: 40, successful: 24 },
  { date: "Aug 6", totalVolume: 39, successful: 21 },
  { date: "Aug 7", totalVolume: 27, successful: 18 },
  { date: "Aug 8", totalVolume: 4, successful: 2 },
  { date: "Aug 9", totalVolume: 8, successful: 4 },
  { date: "Aug 10", totalVolume: 41, successful: 29 },
  { date: "Aug 11", totalVolume: 20, successful: 15 },
  { date: "Aug 12", totalVolume: 12, successful: 9 },
  { date: "Aug 13", totalVolume: 8, successful: 6 },
];

const distributionData = [
  { id: 1, name: "Skipped", value: 45, color: "#3b82f6" },
  { id: 2, name: "Scheduled", value: 65, color: "#6366f1" },
  { id: 3, name: "Triggered", value: 80, color: "#8b5cf6" },
  { id: 4, name: "Failed", value: 21, color: "#94a3b8" },
  { id: 5, name: "Queued", value: 35, color: "#a855f7" },
  { id: 6, name: "Incomplete", value: 40, color: "#10b981" },
  { id: 7, name: "Busy", value: 38, color: "#2dd4bf" },
  { id: 8, name: "Completed", value: 179, color: "#2563eb" },
  { id: 9, name: "Cancelled", value: 25, color: "#60a5fa" },
  { id: 10, name: "No answer", value: 45, color: "#38bdf8" },
];

const conversionData = [
  { id: 1, stage: "Initial Contact", value: 573 },
  { id: 2, stage: "Insurance Verify", value: 412 },
  { id: 3, stage: "Appointment", value: 285 },
  { id: 4, stage: "Follow-up", value: 198 },
  { id: 5, stage: "Consultation Done", value: 179 },
  { id: 6, stage: "Payment Settled", value: 142 },
];

// Custom sleek chart tooltip matching reference
const CustomPerformanceTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-200/80 shadow-lg text-xs space-y-1">
        <p className="font-bold text-[#222222]">{label}</p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#1456f0]" />
          <span className="text-slate-600">
            Total Volume: <strong className="text-[#222222]">{payload[0]?.value}</strong>
          </span>
        </div>
        {payload[1] && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10b981]" />
            <span className="text-slate-600">
              Successful: <strong className="text-[#222222]">{payload[1]?.value}</strong>
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function Overview() {
  const [filterProcess, setFilterProcess] = useState("All Processes");
  const [filterStage, setFilterStage] = useState("All Stages");
  const [filterDate, setFilterDate] = useState("All Time");
  const [filterCallType, setFilterCallType] = useState("Call Type");

  return (
    <div className="min-h-screen bg-[#fafafa] p-6 lg:p-8">
      <div className="max-w-[1440px] mx-auto space-y-6">
        {/* Header with 4 Dropdown Filters */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1
              className="text-3xl font-bold text-[#222222] tracking-tight"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Overview Analytics
            </h1>
            <p className="text-sm text-[#64748b] font-normal leading-relaxed">
              Track call performance and automation health with precision
            </p>
          </div>

          {/* 4 Filter Dropdown Pills */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter by process */}
            <div className="space-y-1">
              <span className="block text-[10px] font-semibold text-slate-400">
                Filter by process
              </span>
              <div className="relative">
                <select
                  value={filterProcess}
                  onChange={(e) => setFilterProcess(e.target.value)}
                  className="appearance-none bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-full pl-3.5 pr-8 py-1.5 text-xs font-semibold text-[#222222] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#1456f0]/20 cursor-pointer"
                >
                  <option value="All Processes">All Processes</option>
                  <option value="Patient Intake">Patient Intake</option>
                  <option value="Appointment Scheduling">Appointment Scheduling</option>
                  <option value="Follow-up Calls">Follow-up Calls</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Filter by stage */}
            <div className="space-y-1">
              <span className="block text-[10px] font-semibold text-slate-400">
                Filter by stage
              </span>
              <div className="relative">
                <select
                  value={filterStage}
                  onChange={(e) => setFilterStage(e.target.value)}
                  className="appearance-none bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-full pl-3.5 pr-8 py-1.5 text-xs font-semibold text-[#222222] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#1456f0]/20 cursor-pointer"
                >
                  <option value="All Stages">All Stages</option>
                  <option value="Initial Contact">Initial Contact</option>
                  <option value="Insurance Verify">Insurance Verify</option>
                  <option value="Schedule Appointment">Schedule Appointment</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Filter by date */}
            <div className="space-y-1">
              <span className="block text-[10px] font-semibold text-slate-400">
                Filter by date
              </span>
              <div className="relative">
                <select
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="appearance-none bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-full pl-3.5 pr-8 py-1.5 text-xs font-semibold text-[#222222] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#1456f0]/20 cursor-pointer"
                >
                  <option value="All Time">All Time</option>
                  <option value="Today">Today</option>
                  <option value="Last 7 Days">Last 7 Days</option>
                  <option value="This Month">This Month</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Filter by call type */}
            <div className="space-y-1">
              <span className="block text-[10px] font-semibold text-slate-400">
                Filter by call type
              </span>
              <div className="relative">
                <select
                  value={filterCallType}
                  onChange={(e) => setFilterCallType(e.target.value)}
                  className="appearance-none bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-full pl-3.5 pr-8 py-1.5 text-xs font-semibold text-[#222222] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#1456f0]/20 cursor-pointer"
                >
                  <option value="Call Type">Call Type</option>
                  <option value="Outbound">Outbound</option>
                  <option value="Inbound">Inbound</option>
                  <option value="Both">Both</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* 4 KPI Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Calls */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[24px] border border-white/80 shadow-[0_2px_16px_rgba(0,0,0,0.02)] p-5 flex items-center gap-4 transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100/80 flex items-center justify-center text-[#1456f0] flex-shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-display">
                TOTAL CALLS
              </p>
              <p
                className="text-2xl sm:text-3xl font-bold text-[#222222] tracking-tight mt-0.5"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                573
              </p>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Across selected filters
              </p>
            </div>
          </div>

          {/* Completed */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[24px] border border-white/80 shadow-[0_2px_16px_rgba(0,0,0,0.02)] p-5 flex items-center gap-4 transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-[#10b981] flex-shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-display">
                COMPLETED
              </p>
              <p
                className="text-2xl sm:text-3xl font-bold text-[#222222] tracking-tight mt-0.5"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                179
              </p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                31.2% success rate
              </p>
            </div>
          </div>

          {/* Failed / Missed */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[24px] border border-white/80 shadow-[0_2px_16px_rgba(0,0,0,0.02)] p-5 flex items-center gap-4 transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100/80 flex items-center justify-center text-[#ef4444] flex-shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-display">
                FAILED / MISSED
              </p>
              <p
                className="text-2xl sm:text-3xl font-bold text-[#222222] tracking-tight mt-0.5"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                21
              </p>
              <p className="text-[11px] text-rose-500 font-semibold mt-0.5">
                Requires attention
              </p>
            </div>
          </div>

          {/* Avg Duration */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[24px] border border-white/80 shadow-[0_2px_16px_rgba(0,0,0,0.02)] p-5 flex items-center gap-4 transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-600 flex-shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-display">
                AVG. DURATION
              </p>
              <p
                className="text-2xl sm:text-3xl font-bold text-[#222222] tracking-tight mt-0.5"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                0m 14s
              </p>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Per successful call
              </p>
            </div>
          </div>
        </div>

        {/* Charts Row: All Time Performance & Call Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* All Time Performance (Left Card ~65%) */}
          <div className="lg:col-span-8 bg-white/80 backdrop-blur-xl rounded-[28px] border border-white/80 shadow-2xs p-6 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#1456f0] flex items-center justify-center flex-shrink-0 shadow-2xs">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    className="text-base font-bold text-[#222222]"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    All Time Performance
                  </h3>
                  <p className="text-xs text-[#64748b]">
                    Visualizing call performance and volume trends
                  </p>
                </div>
              </div>

              {/* Growth Pill Badge */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/60 shadow-2xs">
                  ↗ +12.5% <span className="text-[10px] text-emerald-500 font-normal">GROWTH</span>
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-end gap-4 text-xs mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1456f0]" />
                <span className="text-slate-600 font-medium">Total Volume</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                <span className="text-slate-600 font-medium">Successful</span>
              </div>
            </div>

            {/* Area Chart */}
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={performanceData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1456f0" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#1456f0" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    fontSize={10}
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    tickLine={false}
                  />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<CustomPerformanceTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="totalVolume"
                    stroke="#1456f0"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#1456f0", stroke: "#ffffff", strokeWidth: 1.5 }}
                    activeDot={{ r: 5, fill: "#1456f0", stroke: "#ffffff", strokeWidth: 2 }}
                    fill="url(#volumeGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Call Distribution (Right Card ~35%) */}
          <div className="lg:col-span-4 bg-white/80 backdrop-blur-xl rounded-[28px] border border-white/80 shadow-2xs p-6 flex flex-col justify-between">
            <div>
              <h3
                className="text-base font-bold text-[#222222] mb-1"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Call Distribution
              </h3>
            </div>

            {/* Donut Chart with Inner Total Counter */}
            <div className="relative w-full h-56 flex items-center justify-center my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {distributionData.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span
                  className="text-3xl font-bold text-[#222222] tracking-tight"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  573
                </span>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  TOTAL CALLS
                </span>
              </div>
            </div>

            {/* Legend Pills Grid */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-2 border-t border-slate-100 text-[11px]">
              {distributionData.map((item) => (
                <div key={item.id} className="flex items-center gap-1.5 truncate">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-slate-600 font-medium truncate">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section: Conversion Overview & Performance Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Conversion Overview */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[28px] border border-white/80 shadow-2xs p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 text-[#1456f0] flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h3
                  className="font-bold text-sm text-[#222222]"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Conversion Overview
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-400">Funnel Stages</span>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={conversionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="stage" stroke="#94a3b8" fontSize={10} interval={0} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <ChartTooltip />
                  <Bar dataKey="value" fill="#1456f0" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Performance Analysis */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[28px] border border-white/80 shadow-2xs p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3
                className="font-bold text-sm text-[#222222]"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Performance Analysis
              </h3>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100/60">
                <p className="text-xs font-bold text-[#1456f0] mb-0.5">Peak Call Windows</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Call completion rates peak at <strong>86.4%</strong> between 2:00 PM and 4:30 PM across all timezones.
                </p>
              </div>

              <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100/60">
                <p className="text-xs font-bold text-emerald-600 mb-0.5">Automated Workflows</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  AI Receptionist handled <strong>74% of initial intakes</strong> without human intervention needed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
