import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Compass,
  Search,
  Building2,
  FileText,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Link2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { abdmService, ABHAPatientRecord, DiscoveredFacility } from "../../../services/abdmService";
import { toast } from "sonner";

interface DiscoverRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiscoverRecordsModal: React.FC<DiscoverRecordsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<ABHAPatientRecord | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredFacilities, setDiscoveredFacilities] = useState<DiscoveredFacility[]>([]);
  const [expandedFacility, setExpandedFacility] = useState<string | null>("FAC-01");

  const records = abdmService.getRecords();
  if (!isOpen) return null;

  const handleReset = () => {
    setSearchQuery("");
    setSelectedPatient(null);
    setIsDiscovering(false);
    setDiscoveredFacilities([]);
    setExpandedFacility("FAC-01");
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const filteredPatients = records.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.abhaAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.mobile.includes(searchQuery)
  );

  const handleDiscover = async (patient: ABHAPatientRecord) => {
    setSelectedPatient(patient);
    try {
      setIsDiscovering(true);
      const facs = await abdmService.discoverHealthRecords(patient.abhaAddress);
      setDiscoveredFacilities(facs);
      toast.success(`Discovered health records across ${facs.length} connected facilities`);
    } catch (err) {
      toast.error("Discovery failed");
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleLinkDiscoveredRecord = (contextId: string, facilityName: string) => {
    if (!selectedPatient) return;
    abdmService.linkCareContext(selectedPatient.abhaAddress, [contextId]);
    toast.success(`Record from ${facilityName} linked to ${selectedPatient.abhaAddress}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        className="relative w-full max-w-[540px] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 select-none"
      >
        {/* Top Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#1456f0] via-[#3b82f6] to-[#181e25]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1456f0] flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display leading-tight">
                Discover Health Records
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Find available records across connected healthcare facilities
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {!selectedPatient ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-display">
                  Select Patient for Record Discovery
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, ABHA or mobile..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#1456f0] focus:ring-3 focus:ring-[#1456f0]/15 outline-none transition-all"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Select Patient
                </span>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
                  {filteredPatients.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleDiscover(p)}
                      className="p-3 bg-white border border-slate-200/80 hover:border-[#1456f0]/40 hover:bg-blue-50/40 rounded-2xl flex items-center justify-between transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-[#1456f0] font-bold flex items-center justify-center text-xs">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 font-display">
                            {p.name}
                          </h4>
                          <p className="text-[11px] font-semibold text-[#1456f0]">
                            {p.abhaAddress}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-[#1456f0] group-hover:translate-x-1 transition-transform">
                        Discover →
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected Patient Banner */}
              <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#1456f0] block">
                    Discovering Records For
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 font-display">
                    {selectedPatient.name}
                  </h4>
                  <span className="text-xs font-semibold text-[#1456f0]">
                    {selectedPatient.abhaAddress}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="text-xs font-bold text-[#1456f0] hover:underline"
                >
                  Change
                </button>
              </div>

              {isDiscovering ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-10 h-10 border-3 border-[#1456f0] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-700 font-display">
                    Discovering health records across ABDM connected facilities...
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Querying HIE-CM & HIP network registries
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                      Connected Facilities ({discoveredFacilities.length})
                    </span>
                    <span>HIE-CM Verified Network</span>
                  </div>

                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1 scrollbar-hide">
                    {discoveredFacilities.map((fac) => {
                      const isExpanded = expandedFacility === fac.id;
                      return (
                        <div
                          key={fac.id}
                          className="border border-slate-200 rounded-2xl bg-white overflow-hidden"
                        >
                          <div
                            onClick={() =>
                              setExpandedFacility(isExpanded ? null : fac.id)
                            }
                            className="p-3.5 bg-slate-50/70 hover:bg-slate-100/70 flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#1456f0] flex items-center justify-center">
                                <Building2 className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-900 font-display">
                                  {fac.facilityName}
                                </h4>
                                <span className="text-[10px] font-semibold text-slate-500">
                                  {fac.facilityType} • {fac.availableRecordsCount} records found
                                </span>
                              </div>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </div>

                          {isExpanded && (
                            <div className="p-3 space-y-2 border-t border-slate-100 bg-white">
                              {fac.careContexts.map((cc) => (
                                <div
                                  key={cc.id}
                                  className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs"
                                >
                                  <div>
                                    <span className="text-[10px] font-bold text-[#1456f0] uppercase">
                                      {cc.encounterType} • {cc.date}
                                    </span>
                                    <p className="text-xs font-medium text-slate-800">
                                      {cc.summary}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleLinkDiscoveredRecord(cc.id, fac.facilityName)
                                    }
                                    className="px-2.5 py-1 rounded-lg bg-[#1456f0] hover:bg-[#1147cc] text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                  >
                                    <Link2 className="w-3 h-3" />
                                    <span>Link Record</span>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
