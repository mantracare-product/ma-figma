import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from "recharts";
import { Filter, Download, DollarSign, Calendar } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Tooltip } from "../components/ui/Tooltip";
import { toast } from "sonner";
import PageHeader from "../components/layout/PageHeader";

const usageData = [
  { id: 1, date: "Apr 1", credits: 45 },
  { id: 2, date: "Apr 3", credits: 52 },
  { id: 3, date: "Apr 5", credits: 48 },
  { id: 4, date: "Apr 7", credits: 61 },
  { id: 5, date: "Apr 9", credits: 55 },
];

const transactions = [
  { id: "1", date: "2024-04-10", type: "Usage", user: "Admin User", amount: "-145 credits", status: "Completed" },
  { id: "2", date: "2024-04-08", type: "Purchase", user: "Admin User", amount: "+500 credits", status: "Completed" },
  { id: "3", date: "2024-04-05", type: "Usage", user: "Sarah Manager", amount: "-89 credits", status: "Completed" },
  { id: "4", date: "2024-04-03", type: "Plan Credit", user: "System", amount: "+2000 credits", status: "Completed" },
  { id: "5", date: "2024-04-01", type: "Usage", user: "John Agent", amount: "-67 credits", status: "Completed" },
];

const handleExportData = () => {
  // This function will be defined inside the component
};

export default function Transactions() {
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [dateRange, setDateRange] = useState("Last 7 days");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    toast.loading("Exporting data...");

    // Simulate export process
    setTimeout(() => {
      setIsExporting(false);
      toast.dismiss();
      toast.success("Transactions exported successfully");
    }, 2000);
  };

  return (
    <div className="p-3 sm:p-4 space-y-2.5">
      <PageHeader
        title="Transactions"
        subtitle="Track your credit usage and purchases"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        <div className="bg-card rounded-xl p-3 border border-border shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Available Credits</p>
              <p className="text-xl font-bold text-foreground mt-0.5">1,755</p>
            </div>
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-3 border border-border shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Used This Month</p>
              <p className="text-xl font-bold text-foreground mt-0.5">1,245</p>
            </div>
            <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-secondary" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-3 border border-border shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Purchased</p>
              <p className="text-xl font-bold text-foreground mt-0.5">3,500</p>
            </div>
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Usage Chart */}
      <div className="bg-card rounded-xl p-3 border border-border shadow-2xs">
        <h2 className="text-sm font-semibold mb-2">Credit Usage Over Time</h2>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={usageData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="date" stroke="#6B7280" tick={{ fontSize: 11 }} />
            <YAxis stroke="#6B7280" tick={{ fontSize: 11 }} />
            <ChartTooltip />
            <Line type="monotone" dataKey="credits" stroke="#4F8EF7" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl p-2.5 border border-border shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <Tooltip text="Filter">
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setShowFilterPanel(!showFilterPanel)}
              >
                <Filter className="w-3.5 h-3.5" />
              </Button>

              {showFilterPanel && (
              <div className="absolute left-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-lg p-3 z-50">
                <h3 className="text-xs font-semibold mb-2">Filters</h3>
                <div className="space-y-2.5 text-xs">
                  <div>
                    <label className="block text-xs font-medium mb-1">Date Range</label>
                    <select
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value)}
                      className="w-full px-2.5 py-1 bg-input-background border border-input rounded-lg text-xs"
                    >
                      <option>Last 7 days</option>
                      <option>Last 30 days</option>
                      <option>Last 90 days</option>
                      <option>Custom</option>
                    </select>
                  </div>
                  {dateRange === "Custom" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium mb-1">Start Date</label>
                        <div className="relative">
                          <input
                            type="date"
                            className="w-full pl-8 pr-2 py-1 bg-input-background border border-input rounded-lg text-xs"
                          />
                          <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">End Date</label>
                        <div className="relative">
                          <input
                            type="date"
                            className="w-full pl-8 pr-2 py-1 bg-input-background border border-input rounded-lg text-xs"
                          />
                          <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium mb-1">Type</label>
                    <select className="w-full px-2.5 py-1 bg-input-background border border-input rounded-lg text-xs">
                      <option>All Types</option>
                      <option>Usage</option>
                      <option>Purchase</option>
                      <option>Plan Credit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">User</label>
                    <select className="w-full px-2.5 py-1 bg-input-background border border-input rounded-lg text-xs">
                      <option>All Users</option>
                      <option>Admin User</option>
                      <option>Sarah Manager</option>
                      <option>John Agent</option>
                    </select>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button variant="primary" size="sm" className="h-7 text-xs" onClick={() => setShowFilterPanel(false)}>Apply</Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs">Reset</Button>
                  </div>
                </div>
              </div>
              )}
            </div>
          </Tooltip>

          <Tooltip text="Export">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleExport} loading={isExporting}>
              <Download className="w-3.5 h-3.5" />
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white/90 backdrop-blur-xl rounded-xl border border-white/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white text-xs font-semibold uppercase tracking-wider">
              <tr className="h-7">
                <th className="px-3 py-1 text-left font-semibold text-xs" style={{ fontFamily: 'Outfit, sans-serif' }}>DATE</th>
                <th className="px-3 py-1 text-left font-semibold text-xs" style={{ fontFamily: 'Outfit, sans-serif' }}>TYPE</th>
                <th className="px-3 py-1 text-left font-semibold text-xs" style={{ fontFamily: 'Outfit, sans-serif' }}>USER</th>
                <th className="px-3 py-1 text-left font-semibold text-xs" style={{ fontFamily: 'Outfit, sans-serif' }}>AMOUNT</th>
                <th className="px-3 py-1 text-left font-semibold text-xs" style={{ fontFamily: 'Outfit, sans-serif' }}>STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="h-[30px] hover:bg-muted/60 transition-colors">
                  <td className="px-3 py-1 text-xs text-muted-foreground whitespace-nowrap">{transaction.date}</td>
                  <td className="px-3 py-1 text-xs whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-medium leading-tight ${
                        transaction.type === "Purchase"
                          ? "bg-primary/10 text-primary"
                          : transaction.type === "Usage"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-secondary/10 text-secondary"
                      }`}
                    >
                      {transaction.type}
                    </span>
                  </td>
                  <td className="px-3 py-1 text-xs font-medium whitespace-nowrap">{transaction.user}</td>
                  <td className="px-3 py-1 text-xs whitespace-nowrap">
                    <span
                      className={`font-medium ${
                        transaction.amount.startsWith("+") ? "text-secondary" : "text-destructive"
                      }`}
                    >
                      {transaction.amount}
                    </span>
                  </td>
                  <td className="px-3 py-1 text-xs whitespace-nowrap">
                    <span className="px-2 py-0.5 bg-secondary/10 text-secondary rounded-full text-[11px] font-medium leading-tight">
                      {transaction.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
