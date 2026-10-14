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
  Info,
} from "lucide-react";
import { Client, getStoredClients, saveStoredClients } from "../../../lib/clientsStore";
import { Process, Stage } from "../../../lib/useProcessStore";

interface PortalContext {
  activeClient: Client;
  activeProcess?: Process;
  currentStageName?: string;
  currentStageIndex?: number;
  stages?: Stage[];
  onStageChange?: (newStageName: string) => void;
}

export default function PatientPharmacyScreen() {
  const navigate = useNavigate();
  const { activeClient } = useOutletContext<PortalContext>();

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
    <div className="max-w-2xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* ── Page Header (Clean, Zero Subtext) ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dispensary &amp; Pharmacy</h1>
      </div>

      {/* ── Main Pharmacy Card ── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-6">
        {/* Dispensary Counter Direction Banner */}
        <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-blue-50/70 border border-blue-200/70 text-slate-800">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="font-bold text-sm text-slate-900">
              Prescription Ready for Pickup at Pharmacy Counter 3
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Ground Floor, East Clinical Wing • Opposite Main Diagnostic Labs. Please present your Patient ID (<strong className="font-mono text-slate-900">{activeClient?.id}</strong>) to the dispensing pharmacist.
            </p>
          </div>
        </div>

        {/* Prescription Items Table */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Prescribed Medication Items
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/50">
            {medications.map((med, idx) => (
              <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white transition-colors">
                <div className="space-y-0.5">
                  <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Pill className="w-4 h-4 text-blue-600" />
                    <span>{med.name}</span>
                  </div>
                  <div className="text-xs text-slate-600">
                    {med.dosage} • <span className="text-slate-400">Duration: {med.duration}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 italic">
                    Note: {med.instructions}
                  </div>
                </div>
                <div className="text-sm font-bold font-mono text-slate-900 sm:text-right">
                  {med.price}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleContinueToBilling}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-sm shadow-blue-500/25 transition-all active:scale-[0.98] cursor-pointer"
          >
            <span>Proceed to Billing &amp; Invoices</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
