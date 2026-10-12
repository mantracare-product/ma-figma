import React, { useState } from "react";
import { X, Search, User, UserPlus, ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Building2 } from "lucide-react";
import { getStoredClients, Client } from "../../../../lib/clientsStore";

interface DevPatientSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPatient: (patientId: string) => void;
  onGoToRegister?: () => void;
  activePatientId?: string;
}

export default function DevPatientSwitcherModal({
  isOpen,
  onClose,
  onSelectPatient,
  onGoToRegister,
  activePatientId,
}: DevPatientSwitcherModalProps) {
  const [search, setSearch] = useState("");
  const clients = getStoredClients();

  if (!isOpen) return null;

  const filtered = clients.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (c.name || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.id || "").toLowerCase().includes(q) ||
      (c.responsible || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-bold text-sm shadow-xs">
              🧪
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  Dev: Switch Patient
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Database Fast-Login
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
                Select any patient from Mantra Assist database or create a new one
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Action Header */}
        <div className="p-4 border-b border-slate-100 bg-white space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, phone, email, doctor, ID..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                style={{ fontFamily: "Outfit, sans-serif" }}
                autoFocus
              />
            </div>
            {onGoToRegister && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGoToRegister();
                }}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ New Patient</span>
              </button>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 font-medium">
            <span>Showing {filtered.length} of {clients.length} patients in Mantra Assist</span>
            <span>Click any patient to login instantly</span>
          </div>
        </div>

        {/* Patient List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <User className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-600">No patients found</p>
              <p className="text-xs text-slate-400">Try a different search term or register a new patient.</p>
            </div>
          ) : (
            filtered.map((c) => {
              const isCurrent = c.id === activePatientId;
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    onSelectPatient(c.id);
                    onClose();
                  }}
                  className={`pt-2 first:pt-0 group p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isCurrent
                      ? "bg-blue-50/70 border-blue-300 shadow-xs"
                      : "bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 shadow-2xs"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border ${
                        isCurrent
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-slate-100 text-slate-700 border-slate-200 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-200"
                      }`}
                    >
                      {(c.name || "P").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate" style={{ fontFamily: "DM Sans, sans-serif" }}>
                          {c.name}
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                          {c.id}
                        </span>
                        {c.source && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                            {c.source}
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            Active Now
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-slate-500 font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
                        <span>{c.phone || "No phone"}</span>
                        {c.email && <span>• {c.email}</span>}
                        {c.responsible && <span className="text-slate-600">• Dr: {c.responsible}</span>}
                        {c.stage && <span className="text-slate-400">• Stage: {c.stage}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                        isCurrent
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 group-hover:bg-blue-600 group-hover:text-white"
                      }`}
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <span>{isCurrent ? "Active" : "Login"}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-medium">Direct synchronization with Mantra Assist local database</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
