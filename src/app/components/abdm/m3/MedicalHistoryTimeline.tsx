import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Stethoscope,
  Pill,
  FileSpreadsheet,
  Building2,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  Filter,
  Search,
  CheckCircle2,
  User,
  Plus,
  FileText,
} from "lucide-react";
import { abdmService, ABHAPatientRecord, MedicalHistoryItem, ConsentRecord } from "../../../services/abdmService";

interface MedicalHistoryTimelineProps {
  patient: ABHAPatientRecord | null;
  onRequestConsent: () => void;
}

export const MedicalHistoryTimeline: React.FC<MedicalHistoryTimelineProps> = ({
  patient,
  onRequestConsent,
}) => {
  const [historyItems, setHistoryItems] = useState<MedicalHistoryItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(false);
  const [consentGate, setConsentGate] = useState<{ valid: boolean; consent?: ConsentRecord; reason?: string } | null>(null);

  useEffect(() => {
    if (!patient) return;
    const gate = abdmService.verifyConsentStatus(patient.abhaAddress);
    setConsentGate(gate);

    if (gate.valid) {
      setLoading(true);
      abdmService.getPatientMedicalHistory(patient.abhaAddress).then((items) => {
        setHistoryItems(items);
        setLoading(false);
      });
    } else {
      setHistoryItems([]);
    }
  }, [patient]);

  if (!patient) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-200/90 rounded-3xl p-12 text-center text-slate-400 space-y-2">
        <User className="w-10 h-10 mx-auto text-slate-300" />
        <h4 className="text-sm font-bold text-slate-600 font-display">Select a Patient</h4>
        <p className="text-xs text-slate-400">Select a patient above to view their authorized medical history timeline.</p>
      </div>
    );
  }

  const filteredItems = historyItems.filter(
    (item) => categoryFilter === "ALL" || item.category === categoryFilter
  );

  return (
    <div className="space-y-6">
      {/* ── Patient & Consent Header ── */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-base font-display">
              {patient.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 font-display">
                  {patient.name}
                </h3>
                <span className="text-xs text-slate-500">
                  ({patient.gender} • {patient.dob})
                </span>
              </div>
              <span className="text-xs font-semibold text-blue-600">
                {patient.abhaAddress} • {patient.abhaNumber}
              </span>
            </div>
          </div>

          {/* CONSENT STATUS BADGE */}
          <div>
            {consentGate?.valid ? (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Consent: ✓ Valid (Artefact: {consentGate.consent?.artefactId})
              </span>
            ) : (
              <span className="text-xs font-bold text-rose-700 bg-rose-100 border border-rose-300 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Consent Required
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── CONSENT FIRST SECURITY GATE WARNING ── */}
      {!consentGate?.valid && (
        <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center shadow-xs">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h4 className="text-base font-bold text-rose-950 font-display">
              No Valid Patient Consent Found
            </h4>
            <p className="text-xs text-rose-700 leading-relaxed">
              Medical history cannot be accessed or displayed until patient authorization is granted. Request consent to view authorized health records.
            </p>
          </div>
          <button
            type="button"
            onClick={onRequestConsent}
            className="h-10 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs inline-flex items-center gap-2 shadow-md shadow-rose-500/20 active:scale-[0.99] transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Request Patient Consent</span>
          </button>
        </div>
      )}

      {/* ── AUTHORIZED TIMELINE (WHEN CONSENT IS VALID) ── */}
      {consentGate?.valid && (
        <div className="space-y-5">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-display">
                Record Category Filter
              </span>
            </div>

            <div className="flex flex-wrap gap-1 text-xs font-bold">
              {["ALL", "Consultation", "Diagnostic Report", "Hospital Visit", "Prescription"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    categoryFilter === cat
                      ? "bg-[#1456f0] text-white shadow-2xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70"
                  }`}
                >
                  {cat === "ALL" ? "All Categories" : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline Cards */}
          {loading ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-8 h-8 border-3 border-[#1456f0] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-600">Retrieving patient medical history...</p>
            </div>
          ) : (
            <div className="space-y-4 relative before:absolute before:inset-0 before:left-6 before:w-0.5 before:bg-slate-200/80 before:z-0">
              {filteredItems.map((item) => (
                <div key={item.id} className="relative z-10 pl-12">
                  {/* Timeline Node Icon */}
                  <div className="absolute left-3 top-4 -translate-x-1/2 w-7 h-7 rounded-full bg-white border-2 border-[#1456f0] text-[#1456f0] flex items-center justify-center shadow-xs">
                    {item.category === "Consultation" && <Stethoscope className="w-3.5 h-3.5" />}
                    {item.category === "Diagnostic Report" && <FileSpreadsheet className="w-3.5 h-3.5 text-[#1456f0]" />}
                    {item.category === "Hospital Visit" && <Building2 className="w-3.5 h-3.5 text-[#1456f0]" />}
                  </div>

                  {/* Main Record Card */}
                  <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-2xs space-y-3 hover:border-blue-300 transition-all">
                    {/* Record Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-md">
                            {item.category}
                          </span>
                          <span className="text-xs text-slate-400 font-semibold">{item.date}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 font-display mt-1">
                          {item.facilityName}
                        </h4>
                      </div>
                      <span className="text-xs font-semibold text-slate-600">
                        {item.doctorName}
                      </span>
                    </div>

                    {/* Diagnosis / Summary */}
                    {item.diagnosis && (
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-xs">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Diagnosis
                        </span>
                        <span className="font-bold text-slate-800">{item.diagnosis}</span>
                      </div>
                    )}

                    {/* Vitals Grid */}
                    {item.vitals && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-blue-50/50 p-3 rounded-2xl border border-blue-100/70">
                        {item.vitals.bp && (
                          <div>
                            <span className="text-[9.5px] font-bold text-blue-600 uppercase block">BP</span>
                            <span className="font-bold text-slate-800">{item.vitals.bp}</span>
                          </div>
                        )}
                        {item.vitals.pulse && (
                          <div>
                            <span className="text-[9.5px] font-bold text-blue-600 uppercase block">Pulse</span>
                            <span className="font-bold text-slate-800">{item.vitals.pulse}</span>
                          </div>
                        )}
                        {item.vitals.temp && (
                          <div>
                            <span className="text-[9.5px] font-bold text-blue-600 uppercase block">Temp</span>
                            <span className="font-bold text-slate-800">{item.vitals.temp}</span>
                          </div>
                        )}
                        {item.vitals.weight && (
                          <div>
                            <span className="text-[9.5px] font-bold text-blue-600 uppercase block">Weight</span>
                            <span className="font-bold text-slate-800">{item.vitals.weight}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Medications Table */}
                    {item.medications && item.medications.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                          Rx Prescribed Medications
                        </span>
                        <div className="overflow-x-auto border border-slate-200/80 rounded-2xl">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400">
                              <tr>
                                <th className="py-2 px-3">Medicine</th>
                                <th className="py-2 px-3">Dosage</th>
                                <th className="py-2 px-3">Frequency</th>
                                <th className="py-2 px-3">Duration</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {item.medications.map((med, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="py-2 px-3 font-bold text-slate-800">{med.name}</td>
                                  <td className="py-2 px-3">{med.dosage}</td>
                                  <td className="py-2 px-3 text-[#1456f0] font-semibold">{med.frequency}</td>
                                  <td className="py-2 px-3 text-slate-500">{med.duration}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Lab Results Table */}
                    {item.labResults && item.labResults.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase text-[#1456f0] tracking-wider block">
                          Lab Investigation Values
                        </span>
                        <div className="overflow-x-auto border border-slate-200/80 rounded-2xl">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500">
                              <tr>
                                <th className="py-2 px-3">Test Name</th>
                                <th className="py-2 px-3">Observed Value</th>
                                <th className="py-2 px-3">Normal Range</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {item.labResults.map((lab, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="py-2 px-3 font-bold text-slate-800">{lab.testName}</td>
                                  <td className="py-2 px-3 font-bold text-[#1456f0]">{lab.value} {lab.unit}</td>
                                  <td className="py-2 px-3 text-slate-400">{lab.normalRange}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
