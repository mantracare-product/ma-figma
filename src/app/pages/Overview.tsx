import RcmOverviewRow from "../components/overview/RcmOverviewRow";
import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import {
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
  CheckSquare,
  Bell,
  ArrowRight,
  Calendar,
  Star,
  ExternalLink,
} from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import { getCallsOnly, PROCESS_LOGS_STORE_EVENT, type CallLog } from "../../lib/processLogsStore";
import { isFreshWorkspace } from "../../lib/onboardingWorkspace";
import { getStoredTasks, TASKS_STORE_EVENT } from "../../lib/tasksStore";
import type { TaskEntity } from "../../types/task";
import {
  getStoredNotifications,
  NOTIFICATIONS_STORE_EVENT,
  OPEN_NOTIFICATIONS_DRAWER_EVENT,
  InAppNotification,
  markNotificationAsRead,
} from "../../lib/notificationsStore";
import { CircularProgressRing } from "../components/ui/CircularProgressRing";

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
  const navigate = useNavigate();

  const [filterProcess, setFilterProcess] = useState("All Processes");
  const [filterStage, setFilterStage] = useState("All Stages");
  const [filterDate, setFilterDate] = useState("All Time");
  const [filterCallType, setFilterCallType] = useState("Call Type");

  const [callLogs, setCallLogs] = useState<CallLog[]>(() => getCallsOnly());
  const [tasks, setTasks] = useState<TaskEntity[]>(() => getStoredTasks());
  const [notifications, setNotifications] = useState<InAppNotification[]>(() => getStoredNotifications());

  useEffect(() => {
    const handleUpdate = () => {
      setCallLogs(getCallsOnly());
    };
    const handleTasksUpdate = () => {
      setTasks(getStoredTasks());
    };
    const handleNotifsUpdate = () => {
      setNotifications(getStoredNotifications());
    };

    window.addEventListener(PROCESS_LOGS_STORE_EVENT, handleUpdate);
    window.addEventListener("organizationChanged", handleUpdate);
    window.addEventListener("mantra_organization_changed", handleUpdate);
    window.addEventListener(TASKS_STORE_EVENT, handleTasksUpdate);
    window.addEventListener(NOTIFICATIONS_STORE_EVENT, handleNotifsUpdate);
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("storage", handleTasksUpdate);
    window.addEventListener("storage", handleNotifsUpdate);

    return () => {
      window.removeEventListener(PROCESS_LOGS_STORE_EVENT, handleUpdate);
      window.removeEventListener("organizationChanged", handleUpdate);
      window.removeEventListener("mantra_organization_changed", handleUpdate);
      window.removeEventListener(TASKS_STORE_EVENT, handleTasksUpdate);
      window.removeEventListener(NOTIFICATIONS_STORE_EVENT, handleNotifsUpdate);
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("storage", handleTasksUpdate);
      window.removeEventListener("storage", handleNotifsUpdate);
    };
  }, []);

  const isFresh = isFreshWorkspace();

  const totalCalls = isFresh ? 0 : (callLogs.length > 0 ? callLogs.length : 573);
  const completedCalls = isFresh ? 0 : (callLogs.length > 0 ? callLogs.filter(c => c.status === "Completed").length : 179);
  const failedCalls = isFresh ? 0 : (callLogs.length > 0 ? callLogs.filter(c => c.status === "Failed").length : 21);
  const successRate = totalCalls > 0 ? `${((completedCalls / totalCalls) * 100).toFixed(1)}%` : "0.0%";
  const avgDuration = isFresh ? "0m 00s" : "0m 14s";

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  // Top 5 tasks for quick overview
  const displayedTasks = useMemo(() => {
    return tasks.slice(0, 5);
  }, [tasks]);


  // Top 5 notifications for quick overview
  const displayedNotifications = useMemo(() => {
    return notifications.slice(0, 5);
  }, [notifications]);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="px-10 sm:px-12 py-7.5 sm:py-8 w-full">
        <RcmOverviewRow />

        {/* ── Strict 6-Column Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 items-start">
          {/* ROW 1: Page Header & Dropdown Filter Pills (Col-span 6) */}
          <div className="col-span-1 md:col-span-2 lg:col-span-6 space-y-4">
            <PageHeader
              title="Overview Analytics"
              subtitle="Track call performance, automation health, active tasks, and team notifications"
              badge={
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#1456f0] border border-blue-200/60">
                  Analytics
                </span>
              }
            />

            <div className="flex items-center justify-end">
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
                      className="appearance-none bg-white border border-slate-200/80 rounded-full pl-3.5 pr-8 py-1.5 text-xs font-semibold text-[#222222] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#1456f0]/20 cursor-pointer"
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
                      className="appearance-none bg-white border border-slate-200/80 rounded-full pl-3.5 pr-8 py-1.5 text-xs font-semibold text-[#222222] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#1456f0]/20 cursor-pointer"
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
                      className="appearance-none bg-white border border-slate-200/80 rounded-full pl-3.5 pr-8 py-1.5 text-xs font-semibold text-[#222222] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#1456f0]/20 cursor-pointer"
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
                      className="appearance-none bg-white border border-slate-200/80 rounded-full pl-3.5 pr-8 py-1.5 text-xs font-semibold text-[#222222] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#1456f0]/20 cursor-pointer"
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
          </div>

          {/* ROW 2: 4 Call Stat Cards in a Single Row (Span 6, 4 columns) */}
          <div className="col-span-1 md:col-span-2 lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Total Calls */}
            <div className="bg-white/80 backdrop-blur-xl rounded-[24px] border border-white/80 shadow-[0_2px_16px_rgba(0,0,0,0.02)] p-5 flex items-center gap-4 transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100/80 flex items-center justify-center text-[#1456f0] flex-shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-display">
                  TOTAL CALLS
                </p>
                <p
                  className="text-2xl sm:text-3xl font-bold text-[#222222] tracking-tight mt-0.5 tabular-nums"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {totalCalls}
                </p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  {isFresh ? "No calls registered yet" : "Across selected filters"}
                </p>
              </div>
            </div>

            {/* Card 2: Completed */}
            <div className="bg-white/80 backdrop-blur-xl rounded-[24px] border border-white/80 shadow-[0_2px_16px_rgba(0,0,0,0.02)] p-5 flex items-center gap-4 transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-[#10b981] flex-shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-display">
                  COMPLETED
                </p>
                <p
                  className="text-2xl sm:text-3xl font-bold text-[#222222] tracking-tight mt-0.5 tabular-nums"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {completedCalls}
                </p>
                <p className="text-[11px] text-emerald-600 font-semibold mt-0.5 tabular-nums">
                  {isFresh ? "0% success rate" : `${successRate} success rate`}
                </p>
              </div>
            </div>

            {/* Card 3: Failed / Missed */}
            <div className="bg-white/80 backdrop-blur-xl rounded-[24px] border border-white/80 shadow-[0_2px_16px_rgba(0,0,0,0.02)] p-5 flex items-center gap-4 transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100/80 flex items-center justify-center text-[#ef4444] flex-shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-display">
                  FAILED / MISSED
                </p>
                <p
                  className="text-2xl sm:text-3xl font-bold text-[#222222] tracking-tight mt-0.5 tabular-nums"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {failedCalls}
                </p>
                <p className="text-[11px] text-rose-500 font-semibold mt-0.5">
                  {isFresh ? "Clean record" : "Requires attention"}
                </p>
              </div>
            </div>

            {/* Card 4: Avg Duration */}
            <div className="bg-white/80 backdrop-blur-xl rounded-[24px] border border-white/80 shadow-[0_2px_16px_rgba(0,0,0,0.02)] p-5 flex items-center gap-4 transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-600 flex-shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-display">
                  AVG. DURATION
                </p>
                <p
                  className="text-2xl sm:text-3xl font-bold text-[#222222] tracking-tight mt-0.5 tabular-nums font-mono"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {avgDuration}
                </p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Per successful call
                </p>
              </div>
            </div>
          </div>

          {/* ROW 3: Active Tasks (Span 4) + Call Distribution (Span 2) in the Same Row */}
          {/* Active Tasks */}
          <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-white/80 backdrop-blur-xl rounded-[28px] border border-white/80 shadow-2xs p-6 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-3.5 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1456f0] flex items-center justify-center">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3
                        className="text-xs font-bold uppercase tracking-wider text-slate-900"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        Active Tasks
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 tabular-nums">
                        {tasks.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Active assigned tasks, deliverables, and team execution pipelines
                    </p>
                  </div>
                </div>

                <Link
                  to="/tasks"
                  className="text-xs font-semibold text-[#1456f0] hover:text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>View all tasks</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Tasks Rows List */}
              {displayedTasks.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 italic">
                  No active tasks.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {displayedTasks.map((task) => {
                    const allItems = task.checklists?.flatMap((c) => c.items) || [];
                    const completedItems = allItems.filter((i) => i.isCompleted);
                    const totalItems = allItems.length;
                    const isCompleted = task.status === "completed";
                    const targetUrl = `/${task.scopeLevel === "admin" ? "admin/tasks" : "tasks"}/${task.id}`;

                    return (
                      <div
                        key={task.id}
                        onClick={() => navigate(targetUrl)}
                        className="py-3 px-2 rounded-xl hover:bg-slate-50/80 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {totalItems > 0 ? (
                            <div className="shrink-0 flex items-center">
                              <CircularProgressRing
                                value={completedItems.length}
                                max={totalItems}
                                size={20}
                                strokeWidth={2.5}
                                indicatorColor={isCompleted ? "#10b981" : "#1456f0"}
                              />
                            </div>
                          ) : (
                            <div
                              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                                isCompleted
                                  ? "bg-emerald-500 border-emerald-500 text-white"
                                  : "border-slate-300 text-transparent"
                              }`}
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              {task.isImportant && (
                                <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                              )}
                              <span
                                className={`text-xs font-semibold truncate ${
                                  isCompleted
                                    ? "line-through text-slate-400"
                                    : "text-slate-900 group-hover:text-[#1456f0]"
                                }`}
                              >
                                {task.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-medium">
                              {task.deadline && (
                                <span className="flex items-center gap-1 tabular-nums">
                                  <Calendar className="w-3 h-3" />
                                  {task.deadline}
                                </span>
                              )}
                              {totalItems > 0 && (
                                <span className="tabular-nums">
                                  · {completedItems.length}/{totalItems} done
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {task.stageName || "Task Created"}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-colors" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Call Distribution */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-[28px] border border-white/80 shadow-2xs p-6 flex flex-col justify-between">
            <div>
              <h3
                className="text-base font-bold text-[#222222] mb-1"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Call Distribution
              </h3>
            </div>

            {/* Donut Chart with Inner Total Counter */}
            {isFresh && callLogs.length === 0 ? (
              <div className="relative w-full h-56 flex items-center justify-center my-2">
                <div className="w-40 h-40 rounded-full border-4 border-dashed border-slate-200 flex flex-col items-center justify-center">
                  <span
                    className="text-3xl font-bold text-slate-300 tracking-tight"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    0
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    TOTAL CALLS
                  </span>
                </div>
              </div>
            ) : (
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
                    className="text-3xl font-bold text-[#222222] tracking-tight tabular-nums"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {totalCalls}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    TOTAL CALLS
                  </span>
                </div>
              </div>
            )}

            {/* Legend Pills Grid */}
            {isFresh && callLogs.length === 0 ? (
              <div className="pt-2 border-t border-slate-100 text-center text-xs text-slate-400">
                Awaiting caller outcomes &amp; stages
              </div>
            ) : (
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
            )}
          </div>

          {/* ROW 4: Conversion Overview (Span 3) + Performance Analysis (Span 3) */}
          {/* Conversion Overview */}
          <div className="col-span-1 md:col-span-1 lg:col-span-3 bg-white/80 backdrop-blur-xl rounded-[28px] border border-white/80 shadow-2xs p-6">
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

            {isFresh && callLogs.length === 0 ? (
              <div className="h-56 w-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <BarChart3 className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-700">No Funnel Activity Yet</p>
                <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                  Conversion stages will populate in real-time as callers navigate through AI dialogues.
                </p>
              </div>
            ) : (
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
            )}
          </div>

          {/* Performance Analysis */}
          <div className="col-span-1 md:col-span-1 lg:col-span-3 bg-white/80 backdrop-blur-xl rounded-[28px] border border-white/80 shadow-2xs p-6 space-y-4">
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

            {isFresh && callLogs.length === 0 ? (
              <div className="space-y-3">
                <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100/60">
                  <p className="text-xs font-bold text-[#1456f0] mb-0.5">Fresh Workspace Ready</p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Your practice setup is complete. Connect your phone number or launch an agent workflow to start tracking peak call windows.
                  </p>
                </div>

                <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100/60">
                  <p className="text-xs font-bold text-emerald-600 mb-0.5">AI Engine Primed</p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Your services, business details, and knowledge base sources entered during onboarding are synchronized and ready to assist callers.
                  </p>
                </div>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
