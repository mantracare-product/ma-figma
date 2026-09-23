import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  Building2,
  Stethoscope,
  ShieldCheck,
  UserCheck,
  Clock,
  Ticket,
} from "lucide-react";
import {
  getStoredAppointments,
  updateAppointmentStatus,
} from "../../../../lib/appointmentsStore";
import { setClientProcessStage } from "../../../../lib/clientProcessState";
import { getStoredProcesses } from "../../../../lib/useProcessStore";
import { toast } from "sonner";

interface QRCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  onCheckinSuccess: (processId: string) => void;
}

export default function QRCheckinModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  onCheckinSuccess,
}: QRCheckinModalProps) {
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleConfirmCheckin = () => {
    const processes = getStoredProcesses();
    const cataractProc =
      processes.find((p) => p.id === "op-cataract") || processes[0];
    const firstStage = cataractProc?.stages?.[0] || {
      id: "cat-1",
      name: "Checked In",
    };

    // Update process stage manually (Reception staff action)
    setClientProcessStage(clientId, {
      processId: cataractProc?.id || "op-cataract",
      processName: cataractProc?.name || "Cataract Surgery Daycare",
      stageId: firstStage.id,
      stageName: firstStage.name,
      channel: "sms",
    });

    // Mark scheduled appointment arrived if present
    const appts = getStoredAppointments();
    const cataractAppt = appts.find(
      (a) =>
        a.processId === "op-cataract" ||
        a.serviceName?.toLowerCase().includes("cataract")
    );
    if (cataractAppt) {
      updateAppointmentStatus(cataractAppt.id, "arrived");
    }

    setIsSuccess(true);
    toast.success("Reception Check-In Confirmed — Welcome to EyeMantra");

    setTimeout(() => {
      onCheckinSuccess(cataractProc?.id || "op-cataract");
      onClose();
      setIsSuccess(false);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#181e25]/60 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-[#181e25] rounded-3xl shadow-[0_24px_60px_rgba(24,30,37,0.25)] border border-[#e2e8f0] dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-[#e2e8f0] dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#eff6ff] dark:bg-blue-950/60 text-[#1456f0] dark:text-[#60a5fa] flex items-center justify-center">
              <Building2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-[#222222] dark:text-white">
                Reception Desk Check-In
              </h3>
              <p className="text-xs text-[#64748b] dark:text-slate-400">
                Staff Manual Admission · EyeMantra Daycare
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#94a3b8] hover:text-[#222222] dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {isSuccess ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#ecfdf5] text-[#10b981] flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-display text-lg font-bold text-[#222222] dark:text-white">
                Check-in verified by Reception Desk
              </h4>
              <p className="text-xs text-[#45515e] dark:text-slate-300 max-w-xs mx-auto">
                Opening live daycare tracking for Ramesh Iyer…
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Token & Counter Header Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/90 to-slate-50 dark:from-blue-950/30 dark:to-slate-900 border border-blue-100 dark:border-blue-900/40">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100/80 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                    <Ticket className="w-3.5 h-3.5" />
                    <span>Token #04</span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> 8:45 AM Entry
                  </span>
                </div>
                <div className="mt-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Reporting Desk</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">Reception Desk Counter 1 (Admissions)</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">Pre-Op Bay 3 · Daycare Wing</div>
                </div>
              </div>

              {/* Patient & Procedure Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-[#e2e8f0] dark:border-slate-800 text-left">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748b] dark:text-slate-400">
                  Scheduled Procedure
                </div>
                <div className="text-sm font-bold text-[#222222] dark:text-white mt-1">
                  Right-Eye Cataract Surgery (Daycare)
                </div>
                <div className="text-xs text-[#45515e] dark:text-slate-300 mt-1 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-[#1456f0]" />
                  <span>Your surgeon: Dr. Meera Nair</span>
                </div>
                <div className="text-[11px] text-[#64748b] dark:text-slate-400 mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex justify-between">
                  <span>Patient: <strong>{clientName}</strong> (62)</span>
                  <span>ID: <strong>CL-001</strong></span>
                </div>
              </div>

              {/* Desk Instructions & Staff Verification Checklist */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-left">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-200 mb-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Manual Desk Check-In Procedure</span>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
                  Present Token <strong>#04</strong> to the receptionist. Hospital staff confirms fasting status and baseline vitals before manually moving the patient to <strong>Checked In</strong>.
                </p>
              </div>

              {/* Staff Action Button */}
              <button
                type="button"
                onClick={handleConfirmCheckin}
                className="w-full py-3 rounded-full bg-[#1456f0] hover:bg-[#1d4ed8] text-white font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98 mt-2"
              >
                <UserCheck className="w-4 h-4" />
                <span>Confirm Desk Check-In (Staff Action)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
