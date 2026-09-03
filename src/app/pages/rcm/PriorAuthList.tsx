import React, { useState } from "react";
import { useRcm } from "../../context/RcmContext";
import PageHeader from "../../components/layout/PageHeader";
import { FileCheck, AlertTriangle, Clock, Search, Shield } from "lucide-react";

export default function PriorAuthList() {
  const { priorAuths } = useRcm();
  const [search, setSearch] = useState("");

  const filtered = priorAuths.filter(
    (pa) =>
      pa.authNumber.toLowerCase().includes(search.toLowerCase()) ||
      pa.clientName.toLowerCase().includes(search.toLowerCase()) ||
      pa.payerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* Section Header */}
      <div className="space-y-1">
        <h2
          className="text-2xl font-bold text-[#1e293b] tracking-tight"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Prior Authorizations & Utilization
        </h2>
        <p className="text-sm text-slate-500 font-normal">
          Track authorized treatment visit allowances, utilization counters, and expiry dates
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Auth #, patient, or payer..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="px-5 py-3">Auth Reference #</th>
                <th className="px-5 py-3">Patient</th>
                <th className="px-5 py-3">Payer</th>
                <th className="px-5 py-3">Covered CPTs</th>
                <th className="px-5 py-3 w-48">Visits Used / Authorized</th>
                <th className="px-5 py-3">Valid Dates</th>
                <th className="px-5 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filtered.map((pa) => {
                const percent = Math.min(100, Math.round((pa.usedVisits / pa.authorizedVisits) * 100));
                return (
                  <tr key={pa.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 font-mono font-bold text-blue-600">{pa.authNumber}</td>
                    <td className="px-5 py-3 font-bold text-slate-900">{pa.clientName}</td>
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
                          <span className="font-bold">{percent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              percent >= 100
                                ? "bg-rose-600"
                                : percent >= 75
                                ? "bg-amber-500"
                                : "bg-blue-600"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-[11px] text-slate-600">
                      {pa.startDate} to {pa.expirationDate}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-mono ${
                          pa.status === "active"
                            ? "bg-emerald-100 text-emerald-800"
                            : pa.status === "expiring_soon"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
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
    </div>
  );
}
