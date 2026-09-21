import React, { useState } from "react";
import {
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Users,
  FastForward,
  RotateCcw,
} from "lucide-react";
import { getStoredProcesses } from "../../../../lib/useProcessStore";
import {
  getClientProcessStages,
  setClientProcessStage,
} from "../../../../lib/clientProcessState";
import { toast } from "sonner";

interface AdminSimulatorBarProps {
  currentClientId: string;
  onSelectClient: (clientId: string) => void;
  activeProcessId?: string;
  activeStageId?: string;
}

const DEMO_PATIENTS = [
  { id: "CL-001", name: "Sarah Johnson", phone: "+1 (555) 234-5678", email: "sarah.j@email.com" },
  { id: "c-1", name: "James Wilson", phone: "+1 (555) 123-4567", email: "james.w@example.com" },
  { id: "c-2", name: "Emma Brown", phone: "+1 (555) 234-5678", email: "emma.b@example.com" },
];

export default function AdminSimulatorBar({
  currentClientId,
  onSelectClient,
  activeProcessId,
  activeStageId,
}: AdminSimulatorBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const processes = getStoredProcesses();

  const handleAdvanceStage = () => {
    const stages = getClientProcessStages(currentClientId);
    if (stages.length === 0) {
      toast.error("No active process to advance. Use QR Check-In first!");
      return;
    }

    const currentEnrollment = activeProcessId
      ? stages.find((s) => s.processId === activeProcessId) || stages[0]
      : stages[0];

    const proc = processes.find((p) => p.id === currentEnrollment.processId);
    if (!proc || !proc.stages) return;

    const currentIdx = proc.stages.findIndex(
      (s) =>
        s.id === currentEnrollment.stageId ||
        s.name.toLowerCase() === currentEnrollment.stageName.toLowerCase()
    );

    if (currentIdx < proc.stages.length - 1) {
      const nextStage = proc.stages[currentIdx + 1];
      setClientProcessStage(currentClientId, {
        processId: proc.id,
        processName: proc.name,
        stageId: nextStage.id,
        stageName: nextStage.name,
      });
      toast.success(`Simulated staff advancing to: ${nextStage.name}`);
    } else {
      toast.info(`Already at the final stage (${currentEnrollment.stageName})`);
    }
  };

  const handleResetStage = () => {
    const stages = getClientProcessStages(currentClientId);
    if (stages.length === 0) return;
    const currentEnrollment = activeProcessId
      ? stages.find((s) => s.processId === activeProcessId) || stages[0]
      : stages[0];
    const proc = processes.find((p) => p.id === currentEnrollment.processId);
    if (!proc || !proc.stages || proc.stages.length === 0) return;

    const first = proc.stages[0];
    setClientProcessStage(currentClientId, {
      processId: proc.id,
      processName: proc.name,
      stageId: first.id,
      stageName: first.name,
    });
    toast.info(`Reset to first stage: ${first.name}`);
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-40">
      <div className="bg-white/95 dark:bg-[#1A222D]/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 dark:border-slate-800 transition-all overflow-hidden text-xs">
        {/* Toggle header */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3.5 py-2 flex items-center justify-between gap-3 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-semibold cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#1456f0] dark:text-blue-400" />
            <span>Clinic Demo Controls</span>
          </div>
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>

        {/* Drawer contents */}
        {isOpen && (
          <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 space-y-3 w-72">
            {/* Demo patient switcher */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1 font-sans">
                <Users className="w-3 h-3" /> Active Demo Patient
              </div>
              <div className="space-y-1">
                {DEMO_PATIENTS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectClient(p.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-between ${
                      currentClientId === p.id
                        ? "bg-[#1456f0] text-white font-semibold shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span>{p.name}</span>
                    <span className="text-[10px] opacity-75 font-mono">{p.id}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick advance / reset */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Stage Testing Shortcut
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleAdvanceStage}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 font-semibold hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <FastForward className="w-3 h-3" /> Advance Stage
                </button>
                <button
                  type="button"
                  onClick={handleResetStage}
                  className="py-1.5 px-2 rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Reset to Stage 1"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* External Admin Link */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Official Demo:</span>
              <button
                type="button"
                onClick={() => window.open("/process", "_blank")}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Open Admin Window <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
