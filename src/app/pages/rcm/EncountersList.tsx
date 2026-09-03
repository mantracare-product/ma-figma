import React, { useState } from "react";
import { useRcm } from "../../context/RcmContext";
import { Encounter } from "../../types/rcmTypes";
import EncounterDetailDrawer from "../../components/rcm/EncounterDetailDrawer";
import PageHeader from "../../components/layout/PageHeader";
import {
  FileCheck,
  CheckCircle2,
  Clock,
  Search,
  Check,
  Shield,
  Stethoscope,
} from "lucide-react";

export default function EncountersList() {
  const { encounters, lockEncounterDocumentation } = useRcm();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedEncounter, setSelectedEncounter] = useState<Encounter | null>(null);

  const filteredEncounters = encounters.filter((enc) => {
    const matchesSearch =
      enc.id.toLowerCase().includes(search.toLowerCase()) ||
      enc.clientName.toLowerCase().includes(search.toLowerCase()) ||
      enc.providerName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" ? true : enc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* Section Header */}
      <div className="space-y-1">
        <h2
          className="text-2xl font-bold text-[#1e293b] tracking-tight"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Encounters & Charge Capture
        </h2>
        <p className="text-sm text-slate-500 font-normal">
          Clinical visits requiring documentation lock to generate billable claim packages
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search encounters by ID, patient, or clinician..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { id: "all", label: "All Encounters" },
            { id: "pending_documentation", label: "Pending Documentation" },
            { id: "ready_to_bill", label: "Ready to Bill" },
            { id: "billed", label: "Billed" },
            { id: "reconciled", label: "Reconciled" },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setStatusFilter(pill.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                statusFilter === pill.id
                  ? "bg-blue-600 text-white font-semibold shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Encounters Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="px-5 py-3">Encounter ID</th>
                <th className="px-5 py-3">Patient</th>
                <th className="px-5 py-3">Clinician</th>
                <th className="px-5 py-3">Service Date</th>
                <th className="px-5 py-3">Procedures</th>
                <th className="px-5 py-3 text-center">Docs Status</th>
                <th className="px-5 py-3 text-center">Billing State</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredEncounters.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400 text-xs">
                    No encounters match your filters.
                  </td>
                </tr>
              ) : (
                filteredEncounters.map((enc) => (
                  <tr
                    key={enc.id}
                    onClick={() => setSelectedEncounter(enc)}
                    className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3 font-mono font-bold text-blue-600">{enc.id}</td>
                    <td className="px-5 py-3 font-bold text-slate-900">{enc.clientName}</td>
                    <td className="px-5 py-3 text-slate-700">{enc.providerName}</td>
                    <td className="px-5 py-3 text-slate-600 font-mono">{enc.serviceDate}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        {enc.cptCodes.map((code) => (
                          <span
                            key={code}
                            className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-mono text-[10px] font-bold"
                          >
                            {code}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {enc.documentationLocked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 font-mono">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Locked ({enc.documentationSource})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 font-mono">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-mono ${
                          enc.status === "ready_to_bill"
                            ? "bg-blue-100 text-blue-800"
                            : enc.status === "billed"
                            ? "bg-indigo-100 text-indigo-800"
                            : enc.status === "reconciled"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {enc.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {!enc.documentationLocked && (
                        <button
                          type="button"
                          onClick={() => lockEncounterDocumentation(enc.id, "manual")}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Lock Docs
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EncounterDetailDrawer
        encounter={selectedEncounter}
        isOpen={!!selectedEncounter}
        onClose={() => setSelectedEncounter(null)}
      />
    </div>
  );
}
