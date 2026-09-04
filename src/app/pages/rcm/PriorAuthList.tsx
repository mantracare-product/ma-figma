import React, { useState } from "react";
import { useRcm } from "../../context/RcmContext";
import PageHeader from "../../components/layout/PageHeader";
import { HowItWorksModal, HowItWorksButton } from "../../components/help/HowItWorksModal";
import DrawerShell from "../../components/ui/DrawerShell";
import { PriorAuthRecord } from "../../types/rcmTypes";
import { getClientList } from "../../../lib/getClientList";
import {
  FileCheck,
  AlertTriangle,
  Clock,
  Search,
  Shield,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

export default function PriorAuthList() {
  const navigate = useNavigate();
  const { priorAuths, addPriorAuth, updatePriorAuth, deletePriorAuth } = useRcm();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [showHelp, setShowHelp] = useState(false);
  const [selectedAuth, setSelectedAuth] = useState<PriorAuthRecord | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // New Auth Form state
  const clients = getClientList();
  const [newClientId, setNewClientId] = useState(clients[0]?.id || "c-1");
  const [newPayer, setNewPayer] = useState("Aetna Behavioral Health");
  const [newAuthNum, setNewAuthNum] = useState("");
  const [newVisits, setNewVisits] = useState(12);
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [newExpDate, setNewExpDate] = useState(
    new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0]
  );
  const [newCptCodes, setNewCptCodes] = useState("90837, 90834");

  // Filter logic
  const now = new Date();
  const filtered = priorAuths.filter((pa) => {
    const matchesSearch =
      pa.authNumber.toLowerCase().includes(search.toLowerCase()) ||
      pa.clientName.toLowerCase().includes(search.toLowerCase()) ||
      pa.payerName.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === "all") return true;
    if (filter === "active") return pa.status === "active";
    if (filter === "exhausted") {
      return (
        pa.usedVisits >= pa.authorizedVisits ||
        pa.status === "exhausted" ||
        pa.status === "expired"
      );
    }

    const exp = new Date(pa.expirationDate);
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (filter === "14_days") {
      return diffDays <= 14 && diffDays >= 0;
    }
    if (filter === "30_days") {
      return diffDays <= 30 && diffDays >= 0;
    }

    return true;
  });

  const handleCreateAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuthNum.trim()) {
      toast.error("Please enter an Authorization Reference Number");
      return;
    }

    const client = clients.find((c) => c.id === newClientId);
    const cpts = newCptCodes
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    addPriorAuth({
      authNumber: newAuthNum.trim().toUpperCase(),
      clientId: newClientId,
      clientName: client?.name || "Client",
      payerName: newPayer,
      authorizedVisits: Number(newVisits) || 10,
      usedVisits: 0,
      startDate: newStartDate,
      expirationDate: newExpDate,
      cptCodes: cpts.length ? cpts : ["90837"],
      status: "active",
      notes: "Created via Prior Authorization manager",
    });

    toast.success(`Prior Auth #${newAuthNum.toUpperCase()} created successfully`);
    setIsCreating(false);
    setNewAuthNum("");
  };

  const handleUpdateVisits = (delta: number) => {
    if (!selectedAuth) return;
    const newUsed = Math.max(0, Math.min(selectedAuth.authorizedVisits, selectedAuth.usedVisits + delta));
    const isExhausted = newUsed >= selectedAuth.authorizedVisits;
    updatePriorAuth(selectedAuth.id, {
      usedVisits: newUsed,
      status: isExhausted ? "exhausted" : "active",
    });
    setSelectedAuth((prev) =>
      prev ? { ...prev, usedVisits: newUsed, status: isExhausted ? "exhausted" : "active" } : null
    );
  };

  return (
    <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* Page Header */}
      <PageHeader
        title="Prior Authorizations & Utilization"
        subtitle="Track authorized treatment visit allowances, utilization counters, and automated expiration warnings"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> New Prior Auth
            </button>
            <HowItWorksButton onClick={() => setShowHelp(true)} />
          </div>
        }
      />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Active Authorizations
          </span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
            {priorAuths.filter((p) => p.status === "active").length}
          </span>
          <span className="text-[10px] text-emerald-600 font-medium">Within valid visit quotas</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Expiring &le; 14 Days
          </span>
          <span className="text-2xl font-bold font-mono text-amber-600 mt-1 block">
            {
              priorAuths.filter((p) => {
                const diff = Math.ceil(
                  (new Date(p.expirationDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                );
                return diff <= 14 && diff >= 0;
              }).length
            }
          </span>
          <span className="text-[10px] text-amber-600 font-medium">Renewal outreach required</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Exhausted / Cap Reached
          </span>
          <span className="text-2xl font-bold font-mono text-rose-600 mt-1 block">
            {priorAuths.filter((p) => p.usedVisits >= p.authorizedVisits || p.status === "exhausted").length}
          </span>
          <span className="text-[10px] text-rose-600 font-medium">Requires re-authorization</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Authorized Visits
          </span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
            {priorAuths.reduce((s, p) => s + p.authorizedVisits, 0)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {priorAuths.reduce((s, p) => s + p.usedVisits, 0)} visits utilized
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative max-w-md flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Auth #, patient, or payer..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { id: "all", label: "All Authorizations" },
            { id: "14_days", label: "Expiring ≤ 14d" },
            { id: "30_days", label: "Expiring ≤ 30d" },
            { id: "exhausted", label: "Exhausted" },
            { id: "active", label: "Active" },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setFilter(pill.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                filter === pill.id
                  ? "bg-blue-600 text-white font-semibold shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="px-5 py-3">Auth Reference #</th>
                <th className="px-5 py-3">Patient</th>
                <th className="px-5 py-3">Payer</th>
                <th className="px-5 py-3">Covered CPTs</th>
                <th className="px-5 py-3 w-52">Visits Used / Cap</th>
                <th className="px-5 py-3">Expiration Date</th>
                <th className="px-5 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filtered.map((pa) => {
                const percent = Math.min(100, Math.round((pa.usedVisits / pa.authorizedVisits) * 100));
                const remaining = pa.authorizedVisits - pa.usedVisits;
                const isExhausted = remaining <= 0 || pa.status === "exhausted" || pa.status === "expired";
                const isAmber = remaining > 0 && remaining <= 2;

                return (
                  <tr
                    key={pa.id}
                    onClick={() => setSelectedAuth(pa)}
                    className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3 font-mono font-bold text-blue-600">{pa.authNumber}</td>
                    <td className="px-5 py-3">
                      <div className="font-bold text-slate-900">{pa.clientName}</div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/clients/${pa.clientId}`);
                        }}
                        className="text-[10px] text-blue-600 hover:underline inline-flex items-center gap-0.5"
                      >
                        {pa.clientId} <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </td>
                    <td className="px-5 py-3 text-slate-700">{pa.payerName}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        {pa.cptCodes.map((code) => (
                          <span
                            key={code}
                            className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-mono text-[10px] font-bold"
                          >
                            {code}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span>
                            {pa.usedVisits} of {pa.authorizedVisits} used
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              isExhausted
                                ? "bg-rose-100 text-rose-800"
                                : isAmber
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {isExhausted ? "Exhausted" : `${remaining} left`}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isExhausted
                                ? "bg-rose-600"
                                : isAmber
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-[11px] text-slate-600">
                      {pa.expirationDate}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-mono ${
                          isExhausted
                            ? "bg-rose-100 text-rose-800"
                            : isAmber
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {pa.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row Click View/Edit Drawer */}
      {selectedAuth && (
        <DrawerShell
          isOpen={!!selectedAuth}
          onClose={() => setSelectedAuth(null)}
          title={`Prior Auth: ${selectedAuth.authNumber}`}
          subtitle={`${selectedAuth.clientName} • ${selectedAuth.payerName}`}
          footer={
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => {
                  deletePriorAuth(selectedAuth.id);
                  toast.info(`Deleted Prior Auth ${selectedAuth.authNumber}`);
                  setSelectedAuth(null);
                }}
                className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
              <button
                type="button"
                onClick={() => setSelectedAuth(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
              >
                Done
              </button>
            </div>
          }
        >
          <div className="space-y-6 text-slate-800">
            {/* Summary card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-base">{selectedAuth.clientName}</h4>
                  <span className="text-xs text-slate-500 font-mono">Patient ID: {selectedAuth.clientId}</span>
                </div>
                <span className="px-3 py-1 bg-white border border-slate-200 font-mono text-xs font-bold rounded-lg text-blue-700">
                  {selectedAuth.authNumber}
                </span>
              </div>
            </div>

            {/* Utilization Controls */}
            <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-blue-950 uppercase tracking-wider block">
                Utilization Management
              </span>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Visits Used / Total Cap</span>
                <span className="font-mono text-sm font-bold text-slate-900">
                  {selectedAuth.usedVisits} of {selectedAuth.authorizedVisits}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateVisits(-1)}
                  disabled={selectedAuth.usedVisits <= 0}
                  className="flex-1 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-xs font-semibold rounded-lg"
                >
                  - Decrement Visit
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateVisits(1)}
                  disabled={selectedAuth.usedVisits >= selectedAuth.authorizedVisits}
                  className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 text-xs font-semibold rounded-lg shadow-2xs"
                >
                  + Record Visit Used
                </button>
              </div>
            </div>

            {/* Covered Services & Dates */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Coverage Specifications
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">Payer Name</span>
                  <span className="font-semibold text-slate-900">{selectedAuth.payerName}</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">Effective Expiration</span>
                  <span className="font-mono font-semibold text-slate-900">{selectedAuth.expirationDate}</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl col-span-2">
                  <span className="text-slate-400 block text-[10px] mb-1">Covered CPT Codes</span>
                  <div className="flex gap-1.5">
                    {selectedAuth.cptCodes.map((c) => (
                      <span
                        key={c}
                        className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono font-bold text-slate-800"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DrawerShell>
      )}

      {/* New Prior Auth Drawer */}
      {isCreating && (
        <DrawerShell
          isOpen={isCreating}
          onClose={() => setIsCreating(false)}
          title="New Prior Authorization"
          subtitle="Register an insurance authorization number, authorized visit allowance, and valid dates"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="new-auth-form"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-2xs"
              >
                Save Authorization
              </button>
            </div>
          }
        >
          <form id="new-auth-form" onSubmit={handleCreateAuth} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Patient *</label>
              <select
                value={newClientId}
                onChange={(e) => setNewClientId(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payer Name *</label>
              <input
                type="text"
                value={newPayer}
                onChange={(e) => setNewPayer(e.target.value)}
                required
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. Aetna, BCBS, Optum"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Authorization Reference Number *
              </label>
              <input
                type="text"
                value={newAuthNum}
                onChange={(e) => setNewAuthNum(e.target.value)}
                required
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono uppercase text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. AUTH-9821-X"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Authorized Visits *</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newVisits}
                  onChange={(e) => setNewVisits(Number(e.target.value))}
                  required
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Covered CPTs</label>
                <input
                  type="text"
                  value={newCptCodes}
                  onChange={(e) => setNewCptCodes(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="90837, 90834"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Expiration Date</label>
                <input
                  type="date"
                  value={newExpDate}
                  onChange={(e) => setNewExpDate(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </form>
        </DrawerShell>
      )}

      {/* How it Works Modal */}
      <HowItWorksModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="How Prior Authorization Management Works"
        summary="Prior authorizations govern treatment utilization allowances granted by payers. The system monitors used visit counts and sends alerts before authorizations lapse."
        bullets={[
          "Pre-Visit Verification: Appointments check if an active authorization is on file and count visits down automatically.",
          "Traffic-Light Indicators: Visual warning indicators flag authorizations with ≤2 visits remaining or expiring within 14 days.",
          "Timely Renewal: Initiate re-authorization outreach before visit allowances run out, avoiding claim denials under CARC 197.",
          "Strict Identity Mapping: Every authorization links directly to the real patient ID and client profile.",
        ]}
      />
    </div>
  );
}
