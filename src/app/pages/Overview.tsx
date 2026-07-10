import { useState, useEffect } from "react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer } from "recharts";
import { Phone, CheckCircle, XCircle, Clock, TrendingUp, Calendar, Filter, Play, Activity, PieChart as PieChartIcon, BarChart3, Sparkles } from "lucide-react";
import { Button } from "../components/ui/Button";
import PageHeader from "../components/layout/PageHeader";
import { useHowItWorks } from "../context/HowItWorksContext";
import { HowItWorksModal, HowItWorksButton } from "../components/help/HowItWorksModal";
import { InfoTooltip } from "../components/help/InfoTooltip";

const performanceData = [
  { id: 1, date: "Mon", calls: 45, completed: 38, failed: 7 },
  { id: 2, date: "Tue", calls: 52, completed: 47, failed: 5 },
  { id: 3, date: "Wed", calls: 48, completed: 42, failed: 6 },
  { id: 4, date: "Thu", calls: 61, completed: 55, failed: 6 },
  { id: 5, date: "Fri", calls: 55, completed: 50, failed: 5 },
  { id: 6, date: "Sat", calls: 28, completed: 25, failed: 3 },
  { id: 7, date: "Sun", calls: 31, completed: 28, failed: 3 },
];

const conversionData = [
  { id: 1, stage: "Initial Contact", value: 95 },
  { id: 2, stage: "Insurance Verify", value: 78 },
  { id: 3, stage: "Appointment", value: 62 },
  { id: 4, stage: "Follow-up", value: 51 },
  { id: 5, stage: "Surgery Adviced", value: 42 },
  { id: 6, stage: "Payment Done", value: 35 },
  { id: 7, stage: "Close Deal", value: 30 },
  { id: 8, stage: "Deal Lost", value: 12 },
];

// Helper function to get CSS variable value
const getCSSVariable = (variable: string) => {
  if (typeof window !== "undefined") {
    return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  }
  return "";
};

export default function Overview() {
  const { shouldShowModal, openModal, closeModal, seeLater, dontShowAgain } = useHowItWorks();
  const [dateFilter, setDateFilter] = useState("1W");
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState("");
  const [selectedStage, setSelectedStage] = useState("");
  const [selectedCallType, setSelectedCallType] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // Chart colors from theme variables
  const [chartColors, setChartColors] = useState({
    success: getCSSVariable("--chart-success"),
    error: getCSSVariable("--chart-error"),
    warning: getCSSVariable("--chart-warning"),
    primary: getCSSVariable("--chart-primary"),
    grid: getCSSVariable("--chart-grid"),
    axis: getCSSVariable("--chart-axis"),
  });

  // Update chart colors when theme changes
  useEffect(() => {
    const updateChartColors = () => {
      setChartColors({
        success: getCSSVariable("--chart-success"),
        error: getCSSVariable("--chart-error"),
        warning: getCSSVariable("--chart-warning"),
        primary: getCSSVariable("--chart-primary"),
        grid: getCSSVariable("--chart-grid"),
        axis: getCSSVariable("--chart-axis"),
      });
    };

    // Update immediately
    updateChartColors();

    // Listen for theme changes
    const observer = new MutationObserver(updateChartColors);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style"],
    });

    return () => observer.disconnect();
  }, []);

  const distributionData = [
    { id: 1, name: "Completed", value: 285, color: chartColors.success },
    { id: 2, name: "Failed", value: 35, color: chartColors.error },
    { id: 3, name: "Pending", value: 20, color: chartColors.warning },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F9FAFB' }}>
      <div className="py-6 px-[150px] space-y-8">
        {/* Enhanced Header with Filters */}
        <PageHeader
          title="Overview"
          subtitle="Your at-a-glance summary — call volume, success rate, and trends for the last 7 days"
        >
              <div className="flex items-center gap-4 relative">
                {/* How MantraAssist Works Link */}
                <HowItWorksButton onClick={openModal} label="How MantraAssist Works" />

                {/* Filters */}
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowFilterDropdown(!showFilterDropdown);
                    }}
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                  </Button>

            {showFilterDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-lg p-4 z-50">
                <h3 className="font-semibold mb-4">Filters</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Process</label>
                    <select
                      value={selectedProcess}
                      onChange={(e) => setSelectedProcess(e.target.value)}
                      className="w-full px-4 py-2 bg-input-background border border-input rounded-xl text-sm"
                    >
                      <option value="">All Processes</option>
                      <option value="insurance-verification">Insurance Verification</option>
                      <option value="appointment-scheduling">Appointment Scheduling</option>
                      <option value="follow-up">Follow-up</option>
                      <option value="payment-reminder">Payment Reminder</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Stage</label>
                    <select
                      value={selectedStage}
                      onChange={(e) => setSelectedStage(e.target.value)}
                      className="w-full px-4 py-2 bg-input-background border border-input rounded-xl text-sm"
                    >
                      <option value="">All Stages</option>
                      <option value="initial-contact">Initial Contact</option>
                      <option value="insurance-verify">Insurance Verify</option>
                      <option value="appointment">Appointment</option>
                      <option value="follow-up">Follow-up</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Call Type</label>
                    <select
                      value={selectedCallType}
                      onChange={(e) => setSelectedCallType(e.target.value)}
                      className="w-full px-4 py-2 bg-input-background border border-input rounded-xl text-sm"
                    >
                      <option value="">All Types</option>
                      <option value="outbound">Outbound</option>
                      <option value="inbound">Inbound</option>
                      <option value="automated">Automated</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Industry</label>
                    <select
                      value={selectedIndustry}
                      onChange={(e) => setSelectedIndustry(e.target.value)}
                      className="w-full px-4 py-2 bg-input-background border border-input rounded-xl text-sm"
                    >
                      <option value="">All Industries</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="dental">Dental</option>
                      <option value="mental-health">Mental Health</option>
                      <option value="physical-therapy">Physical Therapy</option>
                      <option value="chiropractic">Chiropractic</option>
                      <option value="veterinary">Veterinary</option>
                      <option value="other">Other Medical Services</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Date Filter</label>
                    <div className="flex gap-2">
                      {["1W", "1M", "3M"].map((filter) => (
                        <Button
                          key={filter}
                          variant={dateFilter === filter ? "primary" : "outline"}
                          size="sm"
                          onClick={() => {
                            setDateFilter(filter);
                            setShowCustomDatePicker(false);
                          }}
                          className="flex-1"
                        >
                          {filter}
                        </Button>
                      ))}
                      <Button
                        variant={dateFilter === "Custom" ? "primary" : "outline"}
                        size="sm"
                        onClick={() => {
                          setDateFilter("Custom");
                          setShowCustomDatePicker(!showCustomDatePicker);
                        }}
                        className="flex-1"
                      >
                        Custom
                      </Button>
                    </div>
                  </div>

                  {showCustomDatePicker && dateFilter === "Custom" && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Custom Date Range</label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs mb-1" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Start Date</label>
                          <input
                            type="date"
                            value={filterStartDate}
                            onChange={(e) => setFilterStartDate(e.target.value)}
                            className="w-full px-3 py-2 bg-input-background border border-input rounded-xl text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>End Date</label>
                          <input
                            type="date"
                            value={filterEndDate}
                            onChange={(e) => setFilterEndDate(e.target.value)}
                            className="w-full px-3 py-2 bg-input-background border border-input rounded-xl text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setShowFilterDropdown(false);
                      // Apply filters logic here
                    }}
                  >
                    Apply Filters
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedProcess("");
                      setSelectedStage("");
                      setSelectedCallType("");
                      setSelectedIndustry("");
                      setDateFilter("1W");
                      setFilterStartDate("");
                      setFilterEndDate("");
                      setShowCustomDatePicker(false);
                    }}
                  >
                    Clear All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilterDropdown(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </PageHeader>

        {/* KPI Cards - Enhanced with gradients */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="group relative bg-gradient-to-br from-primary/5 to-card rounded-2xl px-5 py-4 border border-border shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Total Calls</p>
                  <InfoTooltip text="Total Calls: all calls placed or received in the selected date range." />
                </div>
                <p className="text-3xl font-bold text-foreground mt-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>340</p>
                <p className="text-sm text-secondary mt-2 flex items-center gap-1.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  <TrendingUp className="w-4 h-4" />
                  +12.5% from last week
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-hover rounded-2xl flex items-center justify-center shadow-lg">
                <Phone className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-secondary/5 to-card rounded-2xl px-5 py-4 border border-border shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Completed</p>
                  <InfoTooltip text="Completed: all calls that finished successfully in the selected date range." />
                </div>
                <p className="text-3xl font-bold text-foreground mt-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>285</p>
                <p className="text-sm text-secondary mt-2 flex items-center gap-1.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  <TrendingUp className="w-4 h-4" />
                  83.8% success rate
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-secondary to-secondary/80 rounded-2xl flex items-center justify-center shadow-lg">
                <CheckCircle className="w-6 h-6 text-secondary-foreground" />
              </div>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-destructive/5 to-card rounded-2xl px-5 py-4 border border-border shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Failed</p>
                  <InfoTooltip text="Failed: all calls that failed to connect or complete in the selected date range." />
                </div>
                <p className="text-3xl font-bold text-foreground mt-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>35</p>
                <p className="text-sm text-destructive mt-2 flex items-center gap-1.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  10.3% failure rate
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-destructive to-destructive-hover rounded-2xl flex items-center justify-center shadow-lg">
                <XCircle className="w-6 h-6 text-destructive-foreground" />
              </div>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-primary/5 to-card rounded-2xl px-5 py-4 border border-border shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Avg Duration</p>
                  <InfoTooltip text="Avg Duration: the average length of all completed calls in the selected date range." />
                </div>
                <p className="text-3xl font-bold text-foreground mt-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>4:32</p>
                <p className="text-sm mt-2" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>minutes</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-hover rounded-2xl flex items-center justify-center shadow-lg">
                <Clock className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts - Enhanced with better spacing and shadows */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl p-7 border border-border shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between mb-6 px-1">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Call Performance Trend</h2>
                </div>
                <p className="text-xs" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Track completed vs failed calls over time</p>
              </div>
              <div className="px-3 py-1.5 bg-primary/10 rounded-lg text-xs text-primary font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Last 7 days
              </div>
            </div>
            <div className="-mx-2">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={performanceData} margin={{ top: 5, right: 20, left: -15, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.success} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={chartColors.success} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.error} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={chartColors.error} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid key="line-grid" strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis key="line-xaxis" dataKey="date" stroke={chartColors.axis} />
                  <YAxis key="line-yaxis" stroke={chartColors.axis} />
                  <ChartTooltip key="line-tooltip" />
                  <Area key="completed-area" type="monotone" dataKey="completed" stroke={chartColors.success} strokeWidth={3} fill="url(#colorCompleted)" dot={{ r: 4, fill: chartColors.success }} activeDot={{ r: 6 }} />
                  <Area key="failed-area" type="monotone" dataKey="failed" stroke={chartColors.error} strokeWidth={3} fill="url(#colorFailed)" dot={{ r: 4, fill: chartColors.error }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.success }}></div>
                <div>
                  <p className="text-xs" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Completed</p>
                  <p className="text-lg font-bold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>285</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.error }}></div>
                <div>
                  <p className="text-xs" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Failed</p>
                  <p className="text-lg font-bold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>35</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-7 border border-border shadow-lg hover:shadow-xl transition-all duration-300 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6 px-1">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <PieChartIcon className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Call Distribution</h2>
                </div>
                <p className="text-xs" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Breakdown of call outcomes and status</p>
              </div>
              <div className="px-3 py-1.5 bg-primary/10 rounded-lg text-xs text-primary font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>
                This week
              </div>
            </div>
            <div className="flex flex-col items-center flex-1">
              <div className="relative w-full max-w-[280px] mb-6" style={{ height: '200px' }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <PieChart width={280} height={200}>
                    <Pie
                      key="distribution-pie"
                      data={distributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={85}
                      innerRadius={55}
                      fill={chartColors.primary}
                      dataKey="value"
                      paddingAngle={4}
                      strokeWidth={0}
                    >
                      {distributionData.map((entry) => (
                        <Cell key={`cell-${entry.id}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip key="pie-tooltip" />
                  </PieChart>
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-foreground" style={{ fontFamily: 'DM Sans, sans-serif' }}>340</p>
                    <p className="text-xs mt-0.5 font-medium" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Total Calls</p>
                  </div>
                </div>
              </div>
              <div className="w-full grid grid-cols-1 gap-3 mt-auto pt-4 border-t border-border">
                {distributionData.map((entry) => {
                  const total = distributionData.reduce((sum, item) => sum + item.value, 0);
                  const percentage = ((entry.value / total) * 100).toFixed(0);
                  return (
                    <div key={entry.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-xs font-medium text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>{entry.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-lg font-bold text-foreground" style={{ fontFamily: 'DM Sans, sans-serif' }}>{entry.value}</p>
                        <p className="text-xs font-medium w-9 text-right" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>{percentage}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-7 border border-border shadow-lg hover:shadow-xl transition-shadow duration-300 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-xl font-bold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Conversion Funnel</h2>
                    <InfoTooltip text="Shows how many clients moved from first contact through to a completed outcome." />
                  </div>
                </div>
                <p className="text-xs" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Client journey from initial contact to follow-up</p>
              </div>
              <div className="px-3 py-1.5 bg-primary/10 rounded-lg text-xs text-primary font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Overall performance
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={conversionData}>
                <CartesianGrid key="bar-grid" strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis key="bar-xaxis" dataKey="stage" stroke={chartColors.axis} />
                <YAxis key="bar-yaxis" stroke={chartColors.axis} />
                <ChartTooltip key="bar-tooltip" />
                <Bar key="conversion-bar" dataKey="value" fill={chartColors.primary} radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insights & Recent Activity - Enhanced */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl p-7 border border-border shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>AI Insights</h2>
                </div>
                <p className="text-xs" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Data-driven recommendations for optimization</p>
              </div>
              <div className="px-3 py-1.5 bg-primary/10 rounded-lg text-xs text-primary font-medium border border-primary/20" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Powered by AI
              </div>
            </div>
            <div className="space-y-3">
              <div className="group p-5 bg-success/5 rounded-xl border border-success/30 hover:border-success/50 hover:shadow-md transition-all duration-300">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-success/20 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-success" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground mb-1.5" style={{ fontFamily: 'DM Sans, sans-serif' }}>Peak Call Times</p>
                    <p className="leading-relaxed" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif', fontSize: '12px' }}>
                      Thursday 2-4 PM shows highest success rate (95%). Consider scheduling priority calls during this window.
                    </p>
                  </div>
                </div>
              </div>
              <div className="group p-5 bg-primary/5 rounded-xl border border-primary/30 hover:border-primary/50 hover:shadow-md transition-all duration-300">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground mb-1.5" style={{ fontFamily: 'DM Sans, sans-serif' }}>Retry Optimization</p>
                    <p className="leading-relaxed" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif', fontSize: '12px' }}>
                      Calls retried after 48 hours have 30% better completion rate than same-day retries.
                    </p>
                  </div>
                </div>
              </div>
              <div className="group p-5 bg-destructive/5 rounded-xl border border-destructive/30 hover:border-destructive/50 hover:shadow-md transition-all duration-300">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-destructive/20 rounded-lg flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground mb-1.5" style={{ fontFamily: 'DM Sans, sans-serif' }}>Action Required</p>
                    <p className="leading-relaxed" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif', fontSize: '12px' }}>
                      12 clients have failed calls for 3+ days. Manual intervention recommended.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-7 border border-border shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-5 h-5 text-success" />
                  <h2 className="text-xl font-bold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Recent Activity</h2>
                </div>
                <p className="text-xs" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Latest call updates and client interactions</p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-success/10 rounded-lg border border-success/20">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-xs text-success font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>Live</span>
              </div>
            </div>
            <div className="space-y-1.5">
              {[
                { id: 1, name: "Sarah Johnson", action: "Appointment scheduled", time: "2 min ago", status: "success", initials: "SJ" },
                { id: 2, name: "Michael Chen", action: "Insurance verified", time: "15 min ago", status: "success", initials: "MC" },
                { id: 3, name: "Emily Davis", action: "Call failed - retry scheduled", time: "23 min ago", status: "warning", initials: "ED" },
                { id: 4, name: "Robert Wilson", action: "Initial contact completed", time: "45 min ago", status: "success", initials: "RW" },
                { id: 5, name: "Jessica Brown", action: "Follow-up call completed", time: "1 hour ago", status: "success", initials: "JB" },
              ].map((activity) => (
                <div key={activity.id} className="group flex items-center gap-3 p-3.5 bg-muted/20 hover:bg-muted/40 rounded-xl transition-all duration-200 cursor-pointer border border-border/30 hover:border-border/60">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-xs ${
                    activity.status === "success" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  }`} style={{ fontFamily: 'DM Sans, sans-serif' }}>
                    {activity.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate" style={{ fontFamily: 'DM Sans, sans-serif' }}>{activity.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>{activity.action}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs whitespace-nowrap" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>{activity.time}</span>
                    <div className={`w-2 h-2 rounded-full ${
                      activity.status === "success" ? "bg-success" : "bg-destructive"
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* How MantraAssist Works Modal */}
        <HowItWorksModal
          isOpen={shouldShowModal}
          onClose={closeModal}
          title="How MantraAssist Works"
          videoUrl="https://www.youtube.com/embed/dQw4w9WgXcQ"
          summary="MantraAssist is your AI-powered receptionist dashboard, helping you track call performance, monitor client journeys, and optimize your operations."
          bullets={[
            "Track calls and outcomes in the KPI dashboard",
            "Follow client conversion stages through the funnel",
            "Read AI Insights for actionable suggestions",
            "Assign services and team members to handle patient booking",
          ]}
          extraFooterButtons={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={seeLater}
              >
                See later
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={dontShowAgain}
              >
                Don't show again
              </Button>
            </>
          }
        />
      </div>
    </div>
  );
}
