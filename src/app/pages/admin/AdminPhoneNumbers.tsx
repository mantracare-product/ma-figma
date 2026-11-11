/**
 * AdminPhoneNumbers.tsx
 * Path: src/app/pages/admin/AdminPhoneNumbers.tsx
 *
 * Dedicated Admin Console for Telephony Phone Numbers Inventory:
 * - Summary KPI cards (Total, In Use, Unassigned, Calls 30d, Provider split)
 * - Filter tabs (All | In Use | Unassigned)
 * - Granular 32px dark-header table with mono ORG-ID chips and capabilities
 * - Row actions: Assign / Reassign, Unassign, Release, View Details
 * - Add Number drawer (Manual entry / carrier allocation)
 * - Number Detail Drawer (Webhook status, carrier SID, assignment timeline)
 */

import React, { useState, useMemo } from "react";
import PageHeader from "../../components/layout/PageHeader";
import PageTopBar from "../../components/layout/PageTopBar";
import TableComponent, { TableColumn, TableRowAction } from "../../components/ui/TableComponent";
import DrawerShell from "../../components/ui/DrawerShell";
import { Modal } from "../../components/ui/Modal";
import {
  useAdminPhoneNumbers,
  assignPhoneNumber,
  unassignPhoneNumber,
  releasePhoneNumber,
  addPhoneNumber,
  PhoneNumberItem,
  PhoneNumberType,
  TelephonyProviderName,
  PhoneNumberCapability,
} from "../../../lib/telephonyAdminStore";
import { useOrganization } from "../../context/OrganizationContext";
import {
  Phone,
  PhoneCall,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  XCircle,
  Activity,
  History,
  Layers,
  Shield,
  Radio,
  MessageSquare,
  Sparkles,
  Download,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { exportToCsv } from "../../../lib/productAnalyticsStore";

export default function AdminPhoneNumbers() {
  const { phoneNumbers, refresh } = useAdminPhoneNumbers();
  const { organizations } = useOrganization();

  // Active Tab: "all" | "in_use" | "unassigned"
  const [activeTab, setActiveTab] = useState<"all" | "in_use" | "unassigned">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");

  // Drawers & Modals state
  const [selectedNumberForDetail, setSelectedNumberForDetail] = useState<PhoneNumberItem | null>(null);
  const [selectedNumberForAssign, setSelectedNumberForAssign] = useState<PhoneNumberItem | null>(null);
  const [showAddDrawer, setShowAddDrawer] = useState(false);

  // Assignment Modal Form
  const [assignOrgId, setAssignOrgId] = useState("");
  const [assignedToInput, setAssignedToInput] = useState("");

  // Add Number Drawer Form
  const [newNumber, setNewNumber] = useState("");
  const [newProvider, setNewProvider] = useState<TelephonyProviderName>("Twilio");
  const [newCountry, setNewCountry] = useState("US");
  const [newType, setNewType] = useState<PhoneNumberType>("Local");
  const [newCost, setNewCost] = useState("15.00");
  const [newCapabilities, setNewCapabilities] = useState<PhoneNumberCapability[]>(["voice", "sms"]);

  // Filtered dataset
  const filteredNumbers = useMemo(() => {
    return phoneNumbers.filter((item) => {
      if (item.status === "Released") return false;

      if (activeTab === "in_use" && item.status !== "In Use") return false;
      if (activeTab === "unassigned" && item.status !== "Unassigned") return false;

      if (providerFilter !== "all" && item.provider !== providerFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNumber = item.number.toLowerCase().includes(q);
        const matchesOrg = item.assignedOrgName?.toLowerCase().includes(q) || false;
        const matchesCode = item.assignedOrgCode?.toLowerCase().includes(q) || false;
        const matchesAssigned = item.assignedTo?.toLowerCase().includes(q) || false;
        if (!matchesNumber && !matchesOrg && !matchesCode && !matchesAssigned) return false;
      }

      return true;
    });
  }, [phoneNumbers, activeTab, providerFilter, searchQuery]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = phoneNumbers.filter((p) => p.status !== "Released").length;
    const inUse = phoneNumbers.filter((p) => p.status === "In Use").length;
    const unassigned = phoneNumbers.filter((p) => p.status === "Unassigned").length;
    const totalCalls30d = phoneNumbers.reduce((acc, p) => acc + (p.callsLast30Days || 0), 0);
    return { total, inUse, unassigned, totalCalls30d };
  }, [phoneNumbers]);

  // Row Actions Handler
  const handleAssignClick = (item: PhoneNumberItem) => {
    setSelectedNumberForAssign(item);
    setAssignOrgId(item.assignedOrgId || (organizations[0]?.id || ""));
    setAssignedToInput(item.assignedTo || "AI Receptionist Agent");
  };

  const handleConfirmAssignment = () => {
    if (!selectedNumberForAssign || !assignOrgId) {
      toast.error("Please select a target organization");
      return;
    }

    const org = organizations.find((o) => o.id === assignOrgId);
    if (!org) {
      toast.error("Invalid organization selected");
      return;
    }

    assignPhoneNumber(
      selectedNumberForAssign.id,
      org.id,
      org.name,
      org.orgCode || "ORG-0001",
      assignedToInput
    );
    refresh();
    setSelectedNumberForAssign(null);
    toast.success(`Assigned ${selectedNumberForAssign.number} to ${org.name}`);
  };

  const handleUnassignClick = (item: PhoneNumberItem) => {
    if (confirm(`Unassign ${item.number} from ${item.assignedOrgName}? The number will return to unassigned pool stock.`)) {
      unassignPhoneNumber(item.id, "Administrative reallocation");
      refresh();
      toast.success(`Unassigned ${item.number}`);
    }
  };

  const handleReleaseClick = (item: PhoneNumberItem) => {
    if (confirm(`Release ${item.number} back to carrier (${item.provider})? This will disconnect incoming calls.`)) {
      releasePhoneNumber(item.id, "Decommissioned from fleet");
      refresh();
      toast.success(`Released ${item.number} back to carrier`);
    }
  };

  const handleCreateNumber = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNumber.trim()) {
      toast.error("Please enter a valid phone number");
      return;
    }

    addPhoneNumber({
      number: newNumber,
      rawNumber: newNumber.replace(/[^\d+]/g, ""),
      provider: newProvider,
      country: newCountry,
      type: newType,
      status: "Unassigned",
      capabilities: newCapabilities,
      monthlyCost: parseFloat(newCost) || 15.0,
    });

    refresh();
    setShowAddDrawer(false);
    setNewNumber("");
    toast.success(`Successfully added ${newNumber} to phone inventory`);
  };

  const handleExportCsv = () => {
    const headers = [
      "Number",
      "Provider",
      "Country",
      "Type",
      "Assigned Org",
      "Org ID",
      "Assigned To",
      "Status",
      "Monthly Cost",
      "Calls (30d)",
      "Purchased Date",
    ];
    const rows = filteredNumbers.map((n) => [
      n.number,
      n.provider,
      n.country,
      n.type,
      n.assignedOrgName || "None",
      n.assignedOrgCode || "None",
      n.assignedTo || "None",
      n.status,
      `$${n.monthlyCost.toFixed(2)}`,
      n.callsLast30Days,
      n.purchasedDate ? new Date(n.purchasedDate).toLocaleDateString() : "",
    ]);
    exportToCsv("mantra-phone-numbers-inventory", headers, rows);
    toast.success("Exported phone numbers inventory to CSV");
  };

  // Table Columns
  const columns: TableColumn<PhoneNumberItem>[] = [
    {
      key: "number",
      header: "PHONE NUMBER",
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold text-gray-900 text-xs tabular-nums">
            {row.number}
          </span>
          <span className="text-[10px] font-bold text-gray-500 uppercase px-1.5 py-0.5 rounded bg-gray-100">
            {row.country}
          </span>
        </div>
      ),
    },
    {
      key: "provider",
      header: "PROVIDER",
      render: (row) => (
        <span className="text-xs font-medium text-gray-700 bg-slate-100 px-2 py-0.5 rounded-md">
          {row.provider}
        </span>
      ),
    },
    {
      key: "type",
      header: "TYPE",
      render: (row) => <span className="text-xs text-gray-600">{row.type}</span>,
    },
    {
      key: "assignedOrgName",
      header: "ASSIGNED WORKSPACE",
      render: (row) =>
        row.assignedOrgName ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-900 truncate max-w-[160px]">
              {row.assignedOrgName}
            </span>
            {row.assignedOrgCode && (
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60 tabular-nums">
                {row.assignedOrgCode}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-400 italic">Unassigned</span>
        ),
    },
    {
      key: "assignedTo",
      header: "ASSIGNED TO",
      render: (row) => (
        <span className="text-xs text-gray-700 truncate max-w-[150px] inline-block">
          {row.assignedTo || "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "STATUS",
      render: (row) => {
        if (row.status === "In Use") {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              In Use
            </span>
          );
        }
        if (row.status === "Unassigned") {
          return (
            <span className="inline-flex items-center text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              Unassigned
            </span>
          );
        }
        return (
          <span className="inline-flex items-center text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
            {row.status}
          </span>
        );
      },
    },
    {
      key: "capabilities",
      header: "CAPABILITIES",
      render: (row) => (
        <div className="flex items-center gap-1 text-slate-500">
          {row.capabilities.includes("voice") && (
            <span className="p-0.5 bg-gray-100 rounded text-slate-700" title="Voice">
              <PhoneCall className="w-3 h-3" />
            </span>
          )}
          {row.capabilities.includes("sms") && (
            <span className="p-0.5 bg-gray-100 rounded text-slate-700" title="SMS">
              <MessageSquare className="w-3 h-3" />
            </span>
          )}
          {row.capabilities.includes("whatsapp") && (
            <span className="p-0.5 bg-emerald-50 text-emerald-700 rounded font-bold text-[9px] px-1" title="WhatsApp">
              WA
            </span>
          )}
        </div>
      ),
    },
    {
      key: "callsLast30Days",
      header: "CALLS (30D)",
      align: "right",
      render: (row) => (
        <span className="text-xs font-mono font-medium text-gray-800 tabular-nums">
          {(row.callsLast30Days || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: "monthlyCost",
      header: "COST/MO",
      align: "right",
      render: (row) => (
        <span className="text-xs font-mono text-gray-700 tabular-nums">
          ${(row.monthlyCost || 0).toFixed(2)}
        </span>
      ),
    },
  ];

  // Table Row Actions (⋮)
  const rowActions: TableRowAction<PhoneNumberItem>[] = [
    {
      label: "View Details & Webhooks",
      icon: <Activity className="w-3.5 h-3.5 text-blue-600" />,
      onClick: (item) => setSelectedNumberForDetail(item),
    },
    {
      label: "Assign / Reassign",
      icon: <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />,
      onClick: (item) => handleAssignClick(item),
    },
    {
      label: "Unassign to Pool",
      icon: <XCircle className="w-3.5 h-3.5 text-amber-600" />,
      disabled: (item) => item.status !== "In Use",
      onClick: (item) => handleUnassignClick(item),
    },
    {
      label: "Release Number",
      icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
      onClick: (item) => handleReleaseClick(item),
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#fafafa]">
      <PageHeader
        title="Phone Numbers"
        subtitle="Manage cross-carrier phone numbers inventory, carrier routing, and workspace assignments"
      />

      <div className="p-6 space-y-5">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Active Fleet</span>
              <Phone className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold font-display text-gray-900 tabular-nums">
              {metrics.total}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Cross-carrier DID stock</div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Assigned & In Use</span>
              <Radio className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-display text-emerald-700 tabular-nums">
              {metrics.inUse}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Routing live inbound calls</div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Unassigned Stock</span>
              <Clock className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-2xl font-bold font-display text-gray-800 tabular-nums">
              {metrics.unassigned}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Available for workspace allocation</div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Calls Handled (30d)</span>
              <PhoneCall className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold font-display text-gray-900 tabular-nums">
              {metrics.totalCalls30d.toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1">
              +18.4% monthly volume
            </div>
          </div>
        </div>

        {/* Filters Toolbar powered by PageTopBar */}
        <PageTopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search number, org, or agent..."
          onExport={handleExportCsv}
          primaryAction={{
            label: "Add Number",
            onClick: () => setShowAddDrawer(true),
          }}
          leftElement={
            <div className="flex items-center gap-2 flex-wrap mr-1">
              <div className="relative">
                <select
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value as any)}
                  className="h-[34px] px-3 pr-7 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none cursor-pointer appearance-none shadow-2xs transition-colors"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <option value="all">All Numbers ({phoneNumbers.filter((p) => p.status !== "Released").length})</option>
                  <option value="in_use">In Use ({metrics.inUse})</option>
                  <option value="unassigned">Unassigned ({metrics.unassigned})</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={providerFilter}
                  onChange={(e) => setProviderFilter(e.target.value)}
                  className="h-[34px] px-2.5 pr-7 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none cursor-pointer appearance-none shadow-2xs max-w-[130px] transition-colors"
                >
                  <option value="all">All Providers</option>
                  <option value="Twilio">Twilio</option>
                  <option value="Exotel">Exotel</option>
                  <option value="Plivo">Plivo</option>
                  <option value="Telnyx">Telnyx</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          }
        />

        {/* Data Table */}
        <TableComponent
          data={filteredNumbers}
          columns={columns}
          rowActions={rowActions}
          actionIcon="menu"
          defaultRowsPerPage={20}
          onRowClick={(item) => setSelectedNumberForDetail(item)}
        />
      </div>

      {/* Number Detail & Webhook Drawer */}
      <DrawerShell
        isOpen={!!selectedNumberForDetail}
        onClose={() => setSelectedNumberForDetail(null)}
        title={selectedNumberForDetail?.number || "Phone Number"}
        subtitle={`Carrier: ${selectedNumberForDetail?.provider} · ${selectedNumberForDetail?.country}`}
        width="max-w-xl"
        icon={<Phone className="w-5 h-5 text-blue-600" />}
      >
        {selectedNumberForDetail && (
          <div className="p-6 space-y-6">
            {/* Status & Webhook Health */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200/90 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Status</span>
                  <div className="text-sm font-semibold text-slate-900 mt-0.5">
                    {selectedNumberForDetail.status}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Webhook Health</span>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs font-semibold text-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {selectedNumberForDetail.webhookStatus}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200/60 pt-2 text-xs font-mono text-slate-600 break-all">
                <span className="text-slate-400 select-none">Webhook URL: </span>
                {selectedNumberForDetail.webhookUrl || "Not configured"}
              </div>
            </div>

            {/* Current Assignment */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Workspace Allocation
              </h4>
              {selectedNumberForDetail.assignedOrgName ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Workspace</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">
                        {selectedNumberForDetail.assignedOrgName}
                      </span>
                      {selectedNumberForDetail.assignedOrgCode && (
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60">
                          {selectedNumberForDetail.assignedOrgCode}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Assigned Recipient</span>
                    <span className="text-xs font-medium text-slate-800">
                      {selectedNumberForDetail.assignedTo || "General Line"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Monthly DID Cost</span>
                    <span className="text-xs font-mono font-semibold text-slate-800">
                      ${selectedNumberForDetail.monthlyCost.toFixed(2)} / month
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic py-2">
                  This number is currently unassigned and resting in fleet pool stock.
                </div>
              )}
            </div>

            {/* Assignment & Activity History */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-slate-500" />
                Audit & Routing Timeline
              </h4>
              <div className="space-y-2.5">
                {selectedNumberForDetail.history.map((hist, i) => (
                  <div
                    key={i}
                    className="p-3 bg-white rounded-xl border border-slate-200/80 text-xs flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{hist.action}</span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(hist.date).toLocaleDateString()}
                      </span>
                    </div>
                    {hist.orgName && (
                      <div className="text-slate-600">
                        Assigned to: <strong className="text-slate-900">{hist.orgName}</strong>{" "}
                        ({hist.orgCode})
                      </div>
                    )}
                    {hist.note && <div className="text-[11px] text-slate-500 italic">{hist.note}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DrawerShell>

      {/* Assign Number Modal */}
      {selectedNumberForAssign && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedNumberForAssign(null)}
          title={`Assign ${selectedNumberForAssign.number}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Select which clinical workspace this number should route calls and inbound messages to.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Target Organization
              </label>
              <select
                value={assignOrgId}
                onChange={(e) => setAssignOrgId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-blue-500"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.orgCode || "ORG-0001"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Assigned Recipient / Department
              </label>
              <input
                type="text"
                value={assignedToInput}
                onChange={(e) => setAssignedToInput(e.target.value)}
                placeholder="e.g. Ophthalmology AI Receptionist"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedNumberForAssign(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAssignment}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1E293B] hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Number Drawer */}
      <DrawerShell
        isOpen={showAddDrawer}
        onClose={() => setShowAddDrawer(false)}
        title="Add Phone Number"
        subtitle="Provision or register a new DID number into administrative stock"
        width="max-w-md"
        icon={<Plus className="w-5 h-5 text-blue-600" />}
      >
        <form onSubmit={handleCreateNumber} className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Phone Number (E.164 Formatted)
            </label>
            <input
              type="text"
              required
              placeholder="+1 (555) 000-0000"
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Carrier Provider
              </label>
              <select
                value={newProvider}
                onChange={(e) => setNewProvider(e.target.value as TelephonyProviderName)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-blue-500"
              >
                <option value="Twilio">Twilio</option>
                <option value="Exotel">Exotel</option>
                <option value="Plivo">Plivo</option>
                <option value="Telnyx">Telnyx</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Country
              </label>
              <select
                value={newCountry}
                onChange={(e) => setNewCountry(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-blue-500"
              >
                <option value="US">United States (US)</option>
                <option value="IN">India (IN)</option>
                <option value="GB">United Kingdom (GB)</option>
                <option value="CA">Canada (CA)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Number Type
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as PhoneNumberType)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-blue-500"
              >
                <option value="Local">Local</option>
                <option value="Toll-free">Toll-free</option>
                <option value="Mobile">Mobile</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Monthly Cost ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={newCost}
                onChange={(e) => setNewCost(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddDrawer(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1E293B] hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              Add to Inventory
            </button>
          </div>
        </form>
      </DrawerShell>
    </div>
  );
}

