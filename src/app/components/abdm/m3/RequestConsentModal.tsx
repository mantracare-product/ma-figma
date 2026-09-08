import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  CreditCard,
  Calendar,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  CheckCircle2,
  FileText,
  Clock,
  Sparkles,
} from "lucide-react";
import { abdmService, ABHAPatientRecord } from "../../../services/abdmService";
import { toast } from "sonner";

interface RequestConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onCheckStatus?: () => void;
  patient?: ABHAPatientRecord | null;
}

const AVAILABLE_RECORD_TYPES = [
  "OPConsultation",
  "Prescription",
  "DiagnosticReport",
  "DischargeSummary",
  "ImmunizationRecord",
  "HealthDocumentRecord",
  "WellnessRecord",
];

const PURPOSE_OPTIONS = [
  "Care management",
  "Clinical consultation",
  "Diagnostic review",
  "Emergency medical care",
];

const EXPIRY_OPTIONS = [
  "1 week",
  "1 month",
  "3 months",
  "6 months",
  "12 months",
];

export const RequestConsentModal: React.FC<RequestConsentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onCheckStatus,
  patient,
}) => {
  const records = abdmService.getRecords();
  const currentPatient = patient || (records.length > 0 ? records[0] : null);

  // Accordion Expand States
  const [expandDateRange, setExpandDateRange] = useState(false);
  const [expandExpiry, setExpandExpiry] = useState(false);
  const [expandAdvanced, setExpandAdvanced] = useState(false);

  // Form selections
  const [datePreset, setDatePreset] = useState<"3m" | "6m" | "12m" | "custom">("6m");
  const [datePresetLabel, setDatePresetLabel] = useState("Last 6 months – Today");
  const [startDate, setStartDate] = useState("2026-03-08");
  const [endDate, setEndDate] = useState("2026-09-08");

  const [selectedExpiry, setSelectedExpiry] = useState("6 months");
  const [selectedPurpose, setSelectedPurpose] = useState("Care management");
  const [selectedRecordTypes, setSelectedRecordTypes] = useState<string[]>([
    "OPConsultation",
    "Prescription",
    "DiagnosticReport",
    "DischargeSummary",
    "ImmunizationRecord",
    "HealthDocumentRecord",
    "WellnessRecord",
  ]);

  const [isRecordTypeDropdownOpen, setIsRecordTypeDropdownOpen] = useState(false);
  const [isPurposeDropdownOpen, setIsPurposeDropdownOpen] = useState(false);

  // Modal Step State
  const [step, setStep] = useState<"configure" | "success">("configure");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep("configure");
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectDatePreset = (preset: "3m" | "6m" | "12m") => {
    setDatePreset(preset);
    const end = new Date("2026-09-08");
    const start = new Date("2026-09-08");
    if (preset === "3m") {
      start.setMonth(start.getMonth() - 3);
      setDatePresetLabel("Last 3 months – Today");
    } else if (preset === "6m") {
      start.setMonth(start.getMonth() - 6);
      setDatePresetLabel("Last 6 months – Today");
    } else if (preset === "12m") {
      start.setMonth(start.getMonth() - 12);
      setDatePresetLabel("Last 12 months – Today");
    }
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  const toggleRecordType = (type: string) => {
    setSelectedRecordTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  const removeRecordType = (type: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRecordTypes((prev) => prev.filter((t) => t !== type));
  };

  const handleSubmit = async () => {
    if (!currentPatient) {
      toast.error("No patient selected");
      return;
    }

    if (selectedRecordTypes.length === 0) {
      toast.error("Please select at least one medical record type");
      return;
    }

    try {
      setLoading(true);
      await abdmService.createConsentRequest({
        patientName: currentPatient.name,
        abhaAddress: currentPatient.abhaAddress,
        requesterName: "MantraAssist Health Center (HIU)",
        purpose: selectedPurpose,
        recordTypes: selectedRecordTypes,
        fromDate: startDate,
        toDate: endDate,
        datePresetLabel,
        expiryDuration: selectedExpiry,
      });

      setStep("success");
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error("Unable to send consent request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = () => {
    onClose();
    if (onCheckStatus) onCheckStatus();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        className="relative w-full max-w-[500px] bg-slate-100 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 select-none max-h-[90vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200/80">
          <h3 className="text-base font-bold text-slate-900 font-display">
            Request Medical Records
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {step === "configure" ? (
            <div className="space-y-4">
              {/* Main White Content Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs divide-y divide-slate-100 overflow-hidden">
                {/* 1. Request to: */}
                <div className="p-4 flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#1456f0] flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-600 font-medium">Request to:</span>
                    <strong className="font-bold text-slate-900 font-mono">
                      {currentPatient?.abhaAddress || "patient@abdm"}
                    </strong>
                  </div>
                </div>

                {/* 2. Request records from: */}
                <div>
                  <div
                    onClick={() => setExpandDateRange((prev) => !prev)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#1456f0] flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-xs">
                        <span className="text-slate-600 font-medium mr-1.5">
                          Request records from:
                        </span>
                        <strong className="font-bold text-slate-900">
                          {datePresetLabel}
                        </strong>
                      </div>
                    </div>
                    {expandDateRange ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  {expandDateRange && (
                    <div className="px-4 pb-4 pt-1 space-y-3 bg-slate-50/50 border-t border-slate-100 animate-in fade-in duration-150">
                      {/* Presets */}
                      <div className="flex items-center gap-2">
                        {(["3m", "6m", "12m"] as const).map((p) => {
                          const label =
                            p === "3m"
                              ? "Last 3 months"
                              : p === "6m"
                              ? "Last 6 months"
                              : "Last 12 months";
                          const isSelected = datePreset === p;
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => handleSelectDatePreset(p)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-[#1456f0] text-white shadow-xs"
                                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom Range Inputs */}
                      <div className="flex items-center gap-2 text-xs">
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => {
                            setStartDate(e.target.value);
                            setDatePreset("custom");
                            setDatePresetLabel(`${e.target.value} – ${endDate}`);
                          }}
                          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl outline-none font-semibold text-slate-700 w-full"
                        />
                        <span className="text-slate-400 font-bold">→</span>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => {
                            setEndDate(e.target.value);
                            setDatePreset("custom");
                            setDatePresetLabel(`${startDate} – ${e.target.value}`);
                          }}
                          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl outline-none font-semibold text-slate-700 w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Shared records will expire in: */}
                <div>
                  <div
                    onClick={() => setExpandExpiry((prev) => !prev)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-xs">
                        <span className="text-slate-600 font-medium mr-1.5">
                          Shared records will expire in:
                        </span>
                        <strong className="font-bold text-slate-900">
                          {selectedExpiry}
                        </strong>
                      </div>
                    </div>
                    {expandExpiry ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  {expandExpiry && (
                    <div className="px-4 pb-4 pt-1 space-y-2.5 bg-slate-50/50 border-t border-slate-100 animate-in fade-in duration-150">
                      <p className="text-[11px] text-slate-500 italic">
                        The expiry date of records can be changed by the patient
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {EXPIRY_OPTIONS.map((exp) => {
                          const isSelected = selectedExpiry === exp;
                          return (
                            <button
                              key={exp}
                              type="button"
                              onClick={() => setSelectedExpiry(exp)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-[#1456f0] text-white shadow-xs"
                                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              {exp}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Advanced Options: */}
                <div>
                  <div
                    onClick={() => setExpandAdvanced((prev) => !prev)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 transition-colors"
                  >
                    <span className="text-xs font-bold text-[#1456f0]">
                      Advanced Options:
                    </span>
                    {expandAdvanced ? (
                      <ChevronDown className="w-4 h-4 text-[#1456f0]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[#1456f0]" />
                    )}
                  </div>

                  {expandAdvanced && (
                    <div className="p-4 bg-slate-50/60 border-t border-slate-100 space-y-4 animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Purpose of Request */}
                        <div className="space-y-1.5 relative">
                          <label className="text-[11px] font-bold text-slate-700 block">
                            Purpose of Request
                          </label>
                          <div
                            onClick={() =>
                              setIsPurposeDropdownOpen((prev) => !prev)
                            }
                            className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-between cursor-pointer shadow-2xs hover:border-blue-400"
                          >
                            <span>{selectedPurpose}</span>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          </div>

                          {isPurposeDropdownOpen && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden text-xs">
                              {PURPOSE_OPTIONS.map((pur) => (
                                <div
                                  key={pur}
                                  onClick={() => {
                                    setSelectedPurpose(pur);
                                    setIsPurposeDropdownOpen(false);
                                  }}
                                  className="p-2.5 hover:bg-blue-50 cursor-pointer font-medium text-slate-800 flex items-center justify-between"
                                >
                                  <span>{pur}</span>
                                  {selectedPurpose === pur && (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-[#1456f0]" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Medical Record Type */}
                        <div className="space-y-1.5 relative">
                          <label className="text-[11px] font-bold text-slate-700 block">
                            Medical record type
                          </label>
                          <div
                            onClick={() =>
                              setIsRecordTypeDropdownOpen((prev) => !prev)
                            }
                            className="p-2 bg-white border border-slate-200 rounded-xl text-xs flex items-center justify-between cursor-pointer shadow-2xs hover:border-blue-400 min-h-[38px]"
                          >
                            <div className="flex items-center gap-1 overflow-hidden">
                              {selectedRecordTypes.length > 0 ? (
                                <>
                                  <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 text-[10.5px] font-bold px-1.5 py-0.5 rounded-md">
                                    {selectedRecordTypes[0]}
                                    <X
                                      className="w-3 h-3 hover:text-rose-600"
                                      onClick={(e) =>
                                        removeRecordType(
                                          selectedRecordTypes[0],
                                          e
                                        )
                                      }
                                    />
                                  </span>
                                  {selectedRecordTypes.length > 1 && (
                                    <span className="text-[11px] font-bold text-slate-500">
                                      + {selectedRecordTypes.length - 1}...
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-slate-400 text-xs">
                                  Select types...
                                </span>
                              )}
                            </div>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          </div>

                          {isRecordTypeDropdownOpen && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto text-xs p-1 space-y-0.5">
                              {AVAILABLE_RECORD_TYPES.map((type) => {
                                const isSelected =
                                  selectedRecordTypes.includes(type);
                                return (
                                  <div
                                    key={type}
                                    onClick={() => toggleRecordType(type)}
                                    className={`p-2 rounded-lg cursor-pointer flex items-center justify-between font-medium ${
                                      isSelected
                                        ? "bg-blue-50 text-[#1456f0] font-bold"
                                        : "hover:bg-slate-50 text-slate-700"
                                    }`}
                                  >
                                    <span>{type}</span>
                                    {isSelected && (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-[#1456f0]" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom CTA Button */}
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSubmit}
                  className="px-8 h-11 rounded-xl bg-[#1456f0] hover:bg-[#1147cc] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      <span>Request Medical Records</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* SUCCESS STATE (Reference Screenshot 2) */
            <div className="bg-white rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-2xs border border-slate-200/80 animate-in fade-in duration-200">
              {/* Prominent Green Success Checkmark */}
              <div className="w-16 h-16 rounded-full bg-emerald-500 text-white mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>

              {/* Heading Message */}
              <div>
                <h4 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                  Your request for medical records has been sent.
                </h4>
              </div>

              {/* Highlighted Yellow/Neutral Banner */}
              <div className="bg-[#FFF8E7] border border-[#FEEBC8] text-[#7B341E] rounded-2xl p-4 text-xs font-semibold max-w-sm mx-auto shadow-2xs leading-relaxed">
                You can see the medical records once the patient approves your request
              </div>

              {/* Check Request Status Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCheckStatus}
                  className="w-full h-11 rounded-xl bg-[#1456f0] hover:bg-[#1147cc] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-colors cursor-pointer"
                >
                  <span>Check Request Status</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
