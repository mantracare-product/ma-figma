import React, { useState } from "react";
import { useRcm } from "../../context/RcmContext";
import PageHeader from "../../components/layout/PageHeader";
import { DollarSign, Search, Shield, Check, X } from "lucide-react";

export default function FeeSchedule() {
  const { feeSchedule } = useRcm();
  const [search, setSearch] = useState("");

  const filtered = feeSchedule.filter(
    (item) =>
      item.cptCode.includes(search) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* Section Header */}
      <div className="space-y-1">
        <h2
          className="text-2xl font-bold text-[#1e293b] tracking-tight"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Fee Schedule & Allowed Amounts
        </h2>
        <p className="text-sm text-slate-500 font-normal">
          Standard charges and in-network benchmark allowances across payer tiers
        </p>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by CPT code, description, or specialty..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Grid Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="px-5 py-3">CPT Code</th>
                <th className="px-5 py-3">Description</th>
                <th className="px-5 py-3">Specialty / Category</th>
                <th className="px-5 py-3 text-right">Standard Fee</th>
                <th className="px-5 py-3 text-right">Medicare Allowed</th>
                <th className="px-5 py-3 text-right">Commercial Avg</th>
                <th className="px-5 py-3 text-center">Prior Auth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3 font-mono font-bold text-blue-600">{item.cptCode}</td>
                  <td className="px-5 py-3 font-medium text-slate-900 max-w-sm">{item.description}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] text-slate-700">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                    ${item.standardFee.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-slate-600 tabular-nums">
                    ${item.medicareAllowed.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-emerald-700 font-semibold tabular-nums">
                    ${item.commercialExpectedAvg.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {item.requiresPriorAuth ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 font-mono">
                        Required
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
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
