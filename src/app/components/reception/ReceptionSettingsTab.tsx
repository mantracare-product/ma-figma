/**
 * ReceptionSettingsTab.tsx
 * Path: src/app/components/reception/ReceptionSettingsTab.tsx
 *
 * MantraAssist Admin Settings panel for AI Receptionist:
 * 1. Physical Rooms & Station Management (CRUD)
 * 2. Queue Configuration & Default Onboarding Process
 *
 * Writes to the shared localStorage schema:
 * - ma_reception_stations
 * - ma_reception_config
 */

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Edit,
  Trash2,
  Building2,
  Sliders,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type {
  Station,
  ReceptionConfig,
  StationType,
} from "../../../reception/types/reception";

const STORAGE_KEYS = {
  STATIONS: "ma_reception_stations",
  CONFIG: "ma_reception_config",
};

const DEFAULT_ORG_ID = "org_mantracare_default";

export default function ReceptionSettingsTab() {
  const [subTab, setSubTab] = useState<"rooms" | "config">("rooms");

  // --- Rooms / Stations State ---
  const [stations, setStations] = useState<Station[]>([]);
  const [showStationModal, setShowStationModal] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [stationFormData, setStationFormData] = useState<{
    name: string;
    type: StationType;
    roomNumber: string;
    providerName: string;
    active: boolean;
  }>({
    name: "",
    type: "doctor_room",
    roomNumber: "",
    providerName: "",
    active: true,
  });

  // --- Queue Config State ---
  const [config, setConfig] = useState<ReceptionConfig>({
    orgId: DEFAULT_ORG_ID,
    tokenPrefixes: {
      doctor: "D-",
      pharmacy: "P-",
      lab: "L-",
      billing: "B-",
      desk: "R-",
    },
    lateArrivalWindowMin: 15,
    earlyArrivalBufferMin: 30,
    queueAgingCapMin: 45,
    defaultLanguages: ["en", "hi"],
    defaultOnboardingProcessId: "Appointment Scheduling",
  });

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedStations = localStorage.getItem(STORAGE_KEYS.STATIONS);
      if (savedStations) setStations(JSON.parse(savedStations));

      const savedConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (savedConfig) setConfig(JSON.parse(savedConfig));
    } catch (err) {
      console.error("Failed to load reception settings:", err);
    }
  }, []);

  // Save Helpers
  const saveStations = (updated: Station[]) => {
    setStations(updated);
    localStorage.setItem(STORAGE_KEYS.STATIONS, JSON.stringify(updated));
  };

  const saveConfig = (updated: ReceptionConfig) => {
    setConfig(updated);
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(updated));
    toast.success("Reception & Queue configuration saved successfully");
  };

  // --- Room Actions ---
  const handleOpenAddStation = () => {
    setEditingStation(null);
    setStationFormData({
      name: "",
      type: "doctor_room",
      roomNumber: "",
      providerName: "",
      active: true,
    });
    setShowStationModal(true);
  };

  const handleOpenEditStation = (st: Station) => {
    setEditingStation(st);
    setStationFormData({
      name: st.name,
      type: st.type,
      roomNumber: st.roomNumber || "",
      providerName: st.providerName || "",
      active: st.active,
    });
    setShowStationModal(true);
  };

  const handleSaveStation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationFormData.name.trim()) {
      toast.error("Please enter a room name");
      return;
    }

    if (editingStation) {
      const updated = stations.map((s) =>
        s.id === editingStation.id
          ? {
              ...s,
              name: stationFormData.name.trim(),
              type: stationFormData.type,
              roomNumber: stationFormData.roomNumber.trim() || undefined,
              providerName: stationFormData.providerName.trim() || undefined,
              active: stationFormData.active,
            }
          : s
      );
      saveStations(updated);
      toast.success("Room updated successfully");
    } else {
      const newStation: Station = {
        id: `room_${Date.now()}`,
        orgId: DEFAULT_ORG_ID,
        name: stationFormData.name.trim(),
        type: stationFormData.type,
        roomNumber: stationFormData.roomNumber.trim() || undefined,
        providerName: stationFormData.providerName.trim() || undefined,
        active: stationFormData.active,
        createdAt: new Date().toISOString(),
      };
      saveStations([...stations, newStation]);
      toast.success("Room added successfully");
    }
    setShowStationModal(false);
  };

  const handleDeleteStation = (id: string) => {
    if (confirm("Are you sure you want to remove this room?")) {
      const updated = stations.filter((s) => s.id !== id);
      saveStations(updated);
      toast.success("Room removed");
    }
  };

  const handleToggleStationActive = (id: string) => {
    const updated = stations.map((s) => (s.id === id ? { ...s, active: !s.active } : s));
    saveStations(updated);
    toast.success("Room status updated");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#111827]" style={{ fontFamily: "DM Sans, sans-serif" }}>
              AI Reception & Queue Management
            </h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/70">
              <Sparkles className="w-3 h-3 text-blue-600" />
              AI Receptionist
            </span>
          </div>
          <p className="text-sm text-[#6B7280] mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>
            Configure clinic consultation rooms, departments, queue token prefixes, and patient onboarding rules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {subTab === "rooms" && (
            <button
              onClick={handleOpenAddStation}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#111827] text-white text-xs font-semibold rounded-xl hover:bg-black transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Room
            </button>
          )}
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setSubTab("rooms")}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            subTab === "rooms"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Building2 className="w-4 h-4" />
          Clinic Rooms & Desks ({stations.length})
        </button>
        <button
          onClick={() => setSubTab("config")}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            subTab === "config"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Sliders className="w-4 h-4" />
          Queue & Onboarding Rules
        </button>
      </div>

      {/* --- SUB-TAB 1: ROOMS --- */}
      {subTab === "rooms" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Room / Station Name</th>
                  <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Room #</th>
                  <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Assigned Provider</th>
                  <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {stations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                      No rooms configured yet. Click &quot;Add Room&quot; above to create consultation rooms and desks.
                    </td>
                  </tr>
                ) : (
                  stations.map((st) => (
                    <tr key={st.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-gray-900">{st.name}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          st.type === "doctor_room"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : st.type === "pharmacy"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : st.type === "lab"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {st.type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-gray-600">{st.roomNumber || "—"}</td>
                      <td className="px-5 py-3.5 text-gray-700">{st.providerName || "—"}</td>
                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleToggleStationActive(st.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-all ${
                            st.active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${st.active ? "bg-emerald-600" : "bg-gray-400"}`} />
                          {st.active ? "Active" : "Disabled"}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-1">
                        <button
                          onClick={() => handleOpenEditStation(st)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Edit Room"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStation(st.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete Room"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- SUB-TAB 2: QUEUE & TOKEN CONFIG --- */}
      {subTab === "config" && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6 shadow-2xs max-w-3xl">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Token Numbering Prefixes</h3>
            <p className="text-xs text-gray-500 mt-0.5">Prefixes attached to token receipts issued to patients.</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Doctor Consult</label>
                <input
                  type="text"
                  value={config.tokenPrefixes.doctor}
                  onChange={(e) => setConfig({ ...config, tokenPrefixes: { ...config.tokenPrefixes, doctor: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono font-bold"
                  placeholder="D-"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Pharmacy Counter</label>
                <input
                  type="text"
                  value={config.tokenPrefixes.pharmacy}
                  onChange={(e) => setConfig({ ...config, tokenPrefixes: { ...config.tokenPrefixes, pharmacy: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono font-bold"
                  placeholder="P-"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Diagnostic Lab</label>
                <input
                  type="text"
                  value={config.tokenPrefixes.lab}
                  onChange={(e) => setConfig({ ...config, tokenPrefixes: { ...config.tokenPrefixes, lab: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono font-bold"
                  placeholder="L-"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Arrival Windows & Queue Priority Rules</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800">Late Arrival Window</label>
                  <span className="font-mono text-xs font-bold text-blue-600">{config.lateArrivalWindowMin} min</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="45"
                  step="5"
                  value={config.lateArrivalWindowMin}
                  onChange={(e) => setConfig({ ...config, lateArrivalWindowMin: Number(e.target.value) })}
                  className="w-full cursor-pointer accent-blue-600"
                />
                <p className="text-[10px] text-gray-400">
                  Appointments arriving &gt; {config.lateArrivalWindowMin}m late are automatically downgraded to standard Priority 0.
                </p>
              </div>

              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800">Anti-Starvation Queue Aging Cap</label>
                  <span className="font-mono text-xs font-bold text-blue-600">{config.queueAgingCapMin} min</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="90"
                  step="5"
                  value={config.queueAgingCapMin}
                  onChange={(e) => setConfig({ ...config, queueAgingCapMin: Number(e.target.value) })}
                  className="w-full cursor-pointer accent-blue-600"
                />
                <p className="text-[10px] text-gray-400">
                  Walk-in tickets waiting &gt; {config.queueAgingCapMin}m receive an automatic priority boost to prevent starvation.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Default Onboarding Process</h3>
            <p className="text-xs text-gray-500">
              New walk-in patients registered at the AI Receptionist are automatically assigned this process in MantraAssist.
            </p>
            <div className="max-w-md">
              <select
                value={config.defaultOnboardingProcessId || 'Appointment Scheduling'}
                onChange={(e) => setConfig({ ...config, defaultOnboardingProcessId: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer font-medium text-slate-800"
              >
                <option value="Appointment Scheduling">Appointment Scheduling (Default)</option>
                <option value="Patient Intake">Patient Intake</option>
                <option value="Follow-up Calls">Follow-up Calls</option>
                <option value="Clinical Visit Journey">Clinical Visit Journey</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="button"
              onClick={() => saveConfig(config)}
              className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors cursor-pointer shadow-sm"
            >
              Save Configuration
            </button>
          </div>
        </div>
      )}

      {/* --- ROOM / STATION MODAL --- */}
      {showStationModal && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setShowStationModal(false)}
        >
          <div
            className="bg-white w-full max-w-md rounded-2xl border border-gray-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                {editingStation ? "Edit Room" : "Add New Room"}
              </h3>
              <button
                type="button"
                onClick={() => setShowStationModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStation} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Room / Station Name *</label>
                <input
                  type="text"
                  required
                  value={stationFormData.name}
                  onChange={(e) => setStationFormData({ ...stationFormData, name: e.target.value })}
                  placeholder="e.g. Dr. Sharma - Room 101"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Type</label>
                  <select
                    value={stationFormData.type}
                    onChange={(e) => setStationFormData({ ...stationFormData, type: e.target.value as StationType })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer"
                  >
                    <option value="doctor_room">Doctor Room</option>
                    <option value="pharmacy">Pharmacy</option>
                    <option value="lab">Diagnostic Lab</option>
                    <option value="billing">Billing Desk</option>
                    <option value="desk">Front Desk</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Room / Counter #</label>
                  <input
                    type="text"
                    value={stationFormData.roomNumber}
                    onChange={(e) => setStationFormData({ ...stationFormData, roomNumber: e.target.value })}
                    placeholder="e.g. 101, Counter A"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Assigned Doctor / Provider (Optional)</label>
                <input
                  type="text"
                  value={stationFormData.providerName}
                  onChange={(e) => setStationFormData({ ...stationFormData, providerName: e.target.value })}
                  placeholder="e.g. Dr. Ananya Sharma"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="stationActive"
                  checked={stationFormData.active}
                  onChange={(e) => setStationFormData({ ...stationFormData, active: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="stationActive" className="text-xs font-medium text-gray-700 cursor-pointer">
                  Active for queue ticket routing
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowStationModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer shadow-sm"
                >
                  {editingStation ? "Save Changes" : "Create Room"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
