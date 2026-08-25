import { useState, useEffect, useRef } from "react";
import {
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  FileText,
  Pill,
  Stethoscope,
  X,
  Printer,
  Download,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  ScribeSession,
  PRESET_SCENARIOS,
  saveScribeSession,
  issuePrescriptionDocument,
} from "../../../lib/scribeSessionStore";

interface AIScribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
  clientName?: string;
  patientAge?: number;
  patientGender?: string;
  onViewTranscript?: (session: ScribeSession) => void;
}

export default function AIScribeModal({
  isOpen,
  onClose,
  clientId = "1",
  clientName = "Rajesh Kumar",
  patientAge = 54,
  patientGender = "Male",
  onViewTranscript,
}: AIScribeModalProps) {
  const [workflowState, setWorkflowState] = useState<"idle" | "recording" | "processing" | "review" | "prescribed">("idle");
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [activeSession, setActiveSession] = useState<ScribeSession | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (workflowState === "recording" && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [workflowState, isPaused]);

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStart = () => {
    setRecordingTime(0);
    setIsPaused(false);
    setWorkflowState("recording");
  };

  const handleFinish = () => {
    clearInterval(timerRef.current);

    const scenario = PRESET_SCENARIOS[0];
    const newSession: ScribeSession = {
      id: `scribe-${Date.now()}`,
      clientId: clientId,
      clientName: clientName,
      patientAge: patientAge,
      patientGender: patientGender,
      doctorId: "doc-1",
      doctorName: "Dr. Priya Sharma",
      sessionDate: new Date().toISOString(),
      durationSeconds: recordingTime || 68,
      transcript: {
        fullText: scenario.transcriptText,
        utterances: scenario.utterances,
      },
      extractedData: JSON.parse(JSON.stringify(scenario.extractedData)),
      status: "completed",
      createdAt: Date.now(),
    };

    saveScribeSession(newSession);
    issuePrescriptionDocument(newSession);
    toast.success(`Transcript ready for ${clientName}!`);

    if (onViewTranscript) {
      onViewTranscript(newSession);
    }
    onClose();
  };

  const handleApprove = () => {
    if (!activeSession) return;
    saveScribeSession(activeSession);
    issuePrescriptionDocument(activeSession);
    setWorkflowState("prescribed");
    toast.success("Prescription generated & attached to patient documents!");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white/95 backdrop-blur-md p-6 shadow-2xl border border-[#e2e8f0] text-[#222222] max-h-[90vh] flex flex-col justify-between overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#181e25] to-[#2c3e50] text-white shadow-xs">
              <Stethoscope className="h-5 w-5 text-[#60a5fa]" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-[#222222]">
                Ambient AI Scribe • Dr. Priya Sharma
              </h2>
              <p className="text-xs text-[#64748b]">
                Patient: <strong className="text-[#222222]">{clientName}</strong> ({patientAge}y / {patientGender})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="my-6">
          {workflowState === "idle" && (
            <div className="flex flex-col items-center justify-center text-center py-6">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 border border-blue-200">
                <Mic className="h-9 w-9 text-[#1456f0]" />
              </div>
              <h3 className="font-display text-base font-bold text-[#222222]">
                Start Ambient Consultation for {clientName}
              </h3>
              <p className="max-w-md text-xs text-[#64748b] mt-1">
                Audio will be captured and processed in real time. Speak naturally with the patient.
              </p>
              <button
                onClick={handleStart}
                className="mt-6 flex items-center gap-2 rounded-full bg-gradient-to-r from-[#181e25] to-[#2c3e50] px-7 py-2.5 text-xs font-semibold text-white shadow-md hover:scale-[1.02] transition-all"
              >
                <Mic className="h-4 w-4 text-[#60a5fa]" />
                Start Recording
              </button>
            </div>
          )}

          {workflowState === "recording" && (
            <div className="flex flex-col items-center justify-center text-center py-6">
              <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 border border-red-200">
                <span className="absolute h-full w-full rounded-full bg-red-400 opacity-30 animate-ping"></span>
                <Mic className="h-8 w-8 text-red-600 animate-pulse" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                <span className="font-mono text-xl font-bold text-[#222222] tabular-nums">
                  {formatTime(recordingTime)}
                </span>
              </div>
              <p className="text-xs text-[#64748b] mb-6">Listening to consultation audio...</p>

              {/* Waveform */}
              <div className="flex items-center justify-center gap-1.5 h-10 w-full max-w-sm px-6 bg-slate-50 rounded-xl border border-[#e2e8f0] mb-6">
                {[40, 70, 30, 85, 95, 45, 75, 90, 60, 30, 70, 85].map((h, i) => (
                  <div
                    key={i}
                    className="w-1 bg-[#1456f0] rounded-full transition-all duration-150 animate-pulse"
                    style={{ height: isPaused ? "6px" : `${h}%` }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#45515e] border border-[#e2e8f0] hover:bg-slate-50"
                >
                  {isPaused ? <Play className="h-3.5 w-3.5 inline mr-1 text-emerald-600" /> : <Pause className="h-3.5 w-3.5 inline mr-1 text-amber-600" />}
                  {isPaused ? "Resume" : "Pause"}
                </button>
                <button
                  onClick={handleFinish}
                  className="rounded-full bg-gradient-to-r from-[#1456f0] to-[#2563eb] px-6 py-2 text-xs font-semibold text-white shadow-md hover:opacity-95"
                >
                  <Square className="h-3.5 w-3.5 fill-white inline mr-1" />
                  Finish & Extract
                </button>
              </div>
            </div>
          )}

          {workflowState === "processing" && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-12 w-12 rounded-full border-3 border-blue-200 border-t-[#1456f0] animate-spin mb-3"></div>
              <h3 className="font-display text-sm font-bold text-[#222222]">Extracting Clinical Entities...</h3>
              <p className="text-xs text-[#64748b] mt-1">Deepgram STT & LLM Entity Extractor in progress</p>
            </div>
          )}

          {workflowState === "review" && activeSession && (
            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-3.5 border border-[#e2e8f0]">
                <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-0.5">Diagnosis</div>
                <div className="font-display text-sm font-bold text-[#222222] flex items-center justify-between">
                  <span>{activeSession.extractedData.diagnosis}</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">98% Verified</span>
                </div>
              </div>

              <div className="rounded-xl bg-white border border-[#e2e8f0] p-3.5 shadow-2xs">
                <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Pill className="h-3.5 w-3.5 text-[#1456f0]" /> Prescribed Medications
                </div>
                <div className="space-y-2">
                  {activeSession.extractedData.medications.map((m, i) => (
                    <div key={m.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-xs">
                      <div>
                        <strong>{i + 1}. {m.drugName}</strong>
                        <div className="text-[10px] text-[#64748b]">{m.instructions}</div>
                      </div>
                      <span className="font-mono text-[11px] text-[#1456f0] bg-blue-50 px-2 py-0.5 rounded">
                        {m.dosage} • {m.frequency}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {workflowState === "prescribed" && (
            <div className="text-center py-6">
              <CheckCircle2 className="h-12 w-12 text-[#10b981] mx-auto mb-3" />
              <h3 className="font-display text-base font-bold text-[#222222]">Prescription Successfully Saved</h3>
              <p className="text-xs text-[#64748b] mt-1">
                Document added to {clientName}'s Medical Documents tab and synced to CRM.
              </p>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between border-t border-[#e2e8f0] pt-4">
          <button
            onClick={onClose}
            className="rounded-full px-4 py-1.5 text-xs text-[#64748b] hover:bg-slate-100"
          >
            Close
          </button>

          {workflowState === "review" && (
            <button
              onClick={handleApprove}
              className="rounded-full bg-gradient-to-r from-[#1456f0] to-[#2563eb] px-6 py-2 text-xs font-semibold text-white shadow-md hover:opacity-95"
            >
              Approve & Issue Prescription
            </button>
          )}

          {workflowState === "prescribed" && (
            <button
              onClick={onClose}
              className="rounded-full bg-[#181e25] px-6 py-2 text-xs font-semibold text-white shadow-md hover:opacity-95"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
