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
    <div className="p-6 space-y-6">
      <PageHeader
        title="Transactions"
        subtitle="Track your credit usage and purchases"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Available Credits</p>
              <p className="text-3xl font-bold text-foreground mt-2">1,755</p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Used This Month</p>
              <p className="text-3xl font-bold text-foreground mt-2">1,245</p>
            </div>
            <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-secondary" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Purchased</p>
              <p className="text-3xl font-bold text-foreground mt-2">3,500</p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Usage Chart */}
      <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
        <h2 className="text-lg font-semibold mb-6">Credit Usage Over Time</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={usageData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="date" stroke="#6B7280" />
            <YAxis stroke="#6B7280" />
            <ChartTooltip />
            <Line type="monotone" dataKey="credits" stroke="#4F8EF7" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <Tooltip text="Filter">
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowFilterPanel(!showFilterPanel)}
              >
                <Filter className="w-4 h-4" />
              </Button>

              {showFilterPanel && (
              <div className="absolute left-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-lg p-4 z-50">
                <h3 className="font-semibold mb-4">Filters</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Date Range</label>
                    <select
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value)}
                      className="w-full px-4 py-2 bg-input-background border border-input rounded-xl"
                    >
                      <option>Last 7 days</option>
                      <option>Last 30 days</option>
                      <option>Last 90 days</option>
                      <option>Custom</option>
                    </select>
                  </div>
                  {dateRange === "Custom" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-2">Start Date</label>
                        <div className="relative">
                          <input
                            type="date"
                            className="w-full pl-10 pr-3 py-2 bg-input-background border border-input rounded-xl text-sm"
                          />
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">End Date</label>
                        <div className="relative">
                          <input
                            type="date"
                            className="w-full pl-10 pr-3 py-2 bg-input-background border border-input rounded-xl text-sm"
                          />
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-2">Type</label>
                    <select className="w-full px-4 py-2 bg-input-background border border-input rounded-xl">
                      <option>All Types</option>
                      <option>Usage</option>
                      <option>Purchase</option>
                      <option>Plan Credit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">User</label>
                    <select className="w-full px-4 py-2 bg-input-background border border-input rounded-xl">
                      <option>All Users</option>
                      <option>Admin User</option>
                      <option>Sarah Manager</option>
                      <option>John Agent</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="primary" size="sm" onClick={() => setShowFilterPanel(false)}>Apply</Button>
                    <Button variant="outline" size="sm">Reset</Button>
                  </div>
                </div>
              </div>
              )}
            </div>
          </Tooltip>

          <Tooltip text="Export">
            <Button variant="outline" onClick={handleExport} loading={isExporting}>
              <Download className="w-4 h-4" />
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-white/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5 text-left font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>DATE</th>
                <th className="px-6 py-3.5 text-left font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>TYPE</th>
                <th className="px-6 py-3.5 text-left font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>USER</th>
                <th className="px-6 py-3.5 text-left font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>AMOUNT</th>
                <th className="px-6 py-3.5 text-left font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-muted transition-colors">
                  <td className="px-6 py-4 text-muted-foreground">{transaction.date}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
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
                  <td className="px-6 py-4">{transaction.user}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`font-medium ${
                        transaction.amount.startsWith("+") ? "text-secondary" : "text-destructive"
                      }`}
                    >
                      {transaction.amount}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-secondary/10 text-secondary rounded-full text-sm">
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
