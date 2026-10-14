import React from "react";
import { useOutletContext, useNavigate } from "react-router";
import {
  Pill,
  MapPin,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  FileText,
  Clock,
  Sparkles,
  Info,
} from "lucide-react";
import { Client, getStoredClients, saveStoredClients } from "../../../lib/clientsStore";
import { Process, Stage } from "../../../lib/useProcessStore";

interface PortalContext {
  activeClient: Client;
  activeProcess: Process;
  currentStageName: string;
  currentStageIndex: number;
  stages: Stage[];
  onStageChange: (newStageName: string) => void;
}

export default function PatientPharmacyScreen() {
  const navigate = useNavigate();
  const { activeClient, onStageChange } = useOutletContext<PortalContext>();

  const medications = [
    {
      name: "Amoxicillin 500mg Capsules",
      dosage: "1 capsule three times daily with food",
      duration: "5 days",
      instructions: "Complete the full antibiotic course.",
      price: "$24.00",
    },
    {
      name: "Paracetamol 650mg Tablets",
      dosage: "1 tablet every 6 hours as needed for pain/fever",
      duration: "As needed",
      instructions: "Do not exceed 3000mg in 24 hours.",
      price: "$12.00",
    },
    {
      name: "Vitamin D3 60,000 IU Oral Solution",
      dosage: "1 bottle once weekly",
      duration: "4 weeks",
      instructions: "Consume directly after a meal.",
      price: "$9.00",
    },
  ];

  const handleContinueToBilling = () => {
    if (!activeClient) return;

    // Advance patient stage to "Pay Bill" in canonical clientsStore
    const all = getStoredClients();
    const updated = all.map((c) =>
      c.id === activeClient.id
        ? { ...c, stage: "Pay Bill", processes: Array.from(new Set(["Patient Care Journey", ...(c.processes || [])])) }
        : c
    );
    saveStoredClients(updated);

    navigate("/patient/bill");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200/80 text-purple-800 text-xs font-semibold">
          <Pill className="w-3.5 h-3.5 text-purple-600" />
          <span>Stage 3 of 5 • Move to Pharmacy</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Clinic Pharmacy & Prescription
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Informational step: Please proceed to the dispensary counter to collect your prescribed medicine.
        </p>
      </div>

      {/* Main Informational Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
        {/* Dispensary Counter Direction Banner */}
        <div className="flex items-start gap-4 p-4 rounded-xl bg-purple-50/70 border border-purple-200/60 text-purple-900">
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="font-bold text-sm text-purple-950">
              Prescription Ready for Pickup at Pharmacy Counter 3
            </div>
            <p className="text-xs text-purple-800/90 leading-relaxed">
              Ground Floor, East Clinical Wing • Opposite Main Diagnostic Labs. Please present your Patient ID (<strong className="font-mono">{activeClient?.id}</strong>) to the dispensing pharmacist.
            </p>
          </div>
        </div>

        {/* Prescription Items Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Prescribed Medicine Items</span>
            <span>Est. Cost</span>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden bg-slate-50/50">
            {medications.map((med, idx) => (
              <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white transition-colors">
                <div className="space-y-0.5">
                  <div className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                    <Pill className="w-4 h-4 text-purple-600" />
                    {med.name}
                  </div>
                  <div className="text-xs text-slate-600">
                    {med.dosage} • <span className="text-slate-400">Duration: {med.duration}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 italic">
                    Note: {med.instructions}
                  </div>
                </div>
                <div className="text-sm font-bold text-slate-900 sm:text-right">
                  {med.price}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Informational Callout (Assumption Implementation) */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200/60 text-xs text-slate-500">
          <Info className="w-4 h-4 text-blue-500 shrink-0" />
          <span>
            This is an informational step. Tapping Continue will record your arrival at Pharmacy and advance your care journey to Stage 4 (Pay Bill).
          </span>
        </div>

        {/* Single Continue Action */}
        <div className="pt-2 space-y-3">
          <button
            type="button"
            onClick={handleContinueToBilling}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
          >
            <span>Continue to Stage 4 (Pay Bill)</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Updates patient stage to "Pay Bill" in shared store</span>
          </div>
        </div>
      </div>
    </div>
  );
}
