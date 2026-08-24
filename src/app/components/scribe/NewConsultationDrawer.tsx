import { useState, useEffect, useRef } from "react";
import {
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Calendar,
  User,
  Pill,
  Stethoscope,
  Clock,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import DrawerShell from "../ui/DrawerShell";
import {
  ScribeSession,
  PRESET_SCENARIOS,
  saveScribeSession,
  issuePrescriptionDocument,
  SCRIBE_DOCTORS,
} from "../../../lib/scribeSessionStore";

export interface NewConsultationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated?: (session: ScribeSession) => void;
}

const AVAILABLE_CLIENTS = [
  { id: "1", name: "Rajesh Kumar", age: 54, gender: "Male", phone: "+91 98765 43210" },
  { id: "2", name: "Sunita Devi", age: 48, gender: "Female", phone: "+91 98111 22334" },
  { id: "3", name: "Amit Singhania", age: 62, gender: "Male", phone: "+91 97123 45678" },
  { id: "4", name: "Pooja Sharma", age: 32, gender: "Female", phone: "+91 99887 76655" },
  { id: "CL-001", name: "Sarah Johnson", age: 42, gender: "Female", phone: "+1 555-123-4567" },
  { id: "CL-002", name: "Michael Chen", age: 38, gender: "Male", phone: "+1 555-234-5678" },
  { id: "CL-003", name: "Emily Davis", age: 50, gender: "Female", phone: "+1 555-345-6789" },
];

const AVAILABLE_APPOINTMENTS = [
  { id: "none", label: "None / Walk-in Consultation" },
  { id: "apt-1", label: "Today 10:00 AM — Cataract Post-Op Evaluation" },
  { id: "apt-2", label: "Today 11:30 AM — Knee Osteoarthritis Review" },
  { id: "apt-3", label: "Today 02:15 PM — General Medicine & Infection Check" },
  { id: "apt-4", label: "Today 04:00 PM — Chronic Care Follow-up" },
];

export default function NewConsultationDrawer({
  isOpen,
  onClose,
  onSessionCreated,
}: NewConsultationDrawerProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>("1");
  const [customClientName, setCustomClientName] = useState("");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>("none");
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("cataract-review");

  // Workflow state: 'setup' | 'recording' | 'processing' | 'review'
  const [step, setStep] = useState<"setup" | "recording" | "processing" | "review">("setup");
  const [recordingSec, setRecordingSec] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [generatedSession, setGeneratedSession] = useState<ScribeSession | null>(null);

  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      setStep("setup");
      setRecordingSec(0);
      setIsPaused(false);
      setGeneratedSession(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (step === "recording" && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingSec((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [step, isPaused]);

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getClientInfo = () => {
    if (selectedClientId === "custom") {
      return {
        id: `c-${Date.now()}`,
        name: customClientName.trim() || "Walk-in Patient",
        age: 45,
        gender: "Male",
      };
    }
    return AVAILABLE_CLIENTS.find((c) => c.id === selectedClientId) || AVAILABLE_CLIENTS[0];
  };

  const handleStartRecording = () => {
    setStep("recording");
    setRecordingSec(0);
    setIsPaused(false);
    toast.info("Ambient microphone recording started");
  };

  const handleFinishRecording = () => {
    setStep("processing");
    clearInterval(timerRef.current);

    const client = getClientInfo();
    const scenario = PRESET_SCENARIOS.find((s) => s.id === selectedScenarioId) || PRESET_SCENARIOS[0];
    const doctor = SCRIBE_DOCTORS[0];

    setTimeout(() => {
      const session: ScribeSession = {
        id: `scribe-${Date.now()}`,
        clientId: client.id,
        clientName: client.name,
        patientAge: client.age,
        patientGender: client.gender,
        appointmentId: selectedAppointmentId !== "none" ? selectedAppointmentId : undefined,
        doctorId: doctor.id,
        doctorName: doctor.name,
        sessionDate: new Date().toISOString(),
        durationSeconds: recordingSec || 76,
        transcript: {
          fullText: scenario.transcriptText,
          utterances: scenario.utterances,
        },
        extractedData: JSON.parse(JSON.stringify(scenario.extractedData)),
        status: "completed",
        createdAt: Date.now(),
      };

      setGeneratedSession(session);
      setStep("review");
      toast.success("AI Transcription & Clinical Entities Extracted!");
    }, 1400);
  };

  const handleSaveAndApprove = () => {
    if (!generatedSession) return;
    saveScribeSession(generatedSession);
    issuePrescriptionDocument(generatedSession);
    toast.success(`Transcript saved & prescription issued for ${generatedSession.clientName}!`);
    if (onSessionCreated) onSessionCreated(generatedSession);
    onClose();
  };

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title="New AI Scribe Consultation"
      subtitle="Ambient medical speech-to-text with automated clinical entity extraction"
      icon={<Mic className="w-5 h-5 text-[#1A73E8]" />}
      width="max-w-2xl"
      zIndex={650}
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Cancel
          </button>

          {step === "setup" && (
            <button
              onClick={handleStartRecording}
              className="flex items-center gap-2 rounded-lg bg-[#1A73E8] hover:bg-[#1557b0] px-5 py-2 text-xs font-semibold text-white shadow-xs transition-all"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Mic className="w-3.5 h-3.5" /> Start Recording
            </button>
          )}

          {step === "review" && (
            <button
              onClick={handleSaveAndApprove}
              className="flex items-center gap-2 rounded-lg bg-[#1A73E8] hover:bg-[#1557b0] px-5 py-2 text-xs font-semibold text-white shadow-xs transition-all"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Save Transcript
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-5 text-xs">
        {/* ─── STEP 1: SETUP ─────────────────────────────────────────────── */}
        {step === "setup" && (
          <div className="space-y-4">
            {/* Client Picker */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                Select Client / Patient *
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-border rounded-lg text-xs font-medium text-foreground outline-none focus:border-[#1A73E8]"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {AVAILABLE_CLIENTS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.age}Y, {c.gender}) • {c.phone}
                  </option>
                ))}
                <option value="custom">+ Add / Enter New Walk-in Patient</option>
              </select>
            </div>

            {selectedClientId === "custom" && (
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Patient Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Anand Sharma"
                  value={customClientName}
                  onChange={(e) => setCustomClientName(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-border rounded-lg text-xs outline-none focus:border-[#1A73E8]"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
              </div>
            )}

            {/* Appointment Picker (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center justify-between" style={{ fontFamily: "Outfit, sans-serif" }}>
                <span>Select Appointment</span>
                <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
              </label>
              <select
                value={selectedAppointmentId}
                onChange={(e) => setSelectedAppointmentId(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-border rounded-lg text-xs font-medium text-foreground outline-none focus:border-[#1A73E8]"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {AVAILABLE_APPOINTMENTS.map((apt) => (
                  <option key={apt.id} value={apt.id}>
                    {apt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Simulation Clinical Scenario */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                Clinical Visit Type & Scenario
              </label>
              <select
                value={selectedScenarioId}
                onChange={(e) => setSelectedScenarioId(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-border rounded-lg text-xs font-medium text-foreground outline-none focus:border-[#1A73E8]"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {PRESET_SCENARIOS.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.title} — {sc.chiefComplaint}
                  </option>
                ))}
              </select>
            </div>

            {/* Ambient Microphone Card */}
            <div className="rounded-xl bg-slate-50 border border-border p-4 text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[#1A73E8] border border-blue-200">
                <Mic className="h-7 w-7" />
              </div>
              <div>
                <h4 className="font-bold text-foreground text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Ready to Listen
                </h4>
                <p className="text-muted-foreground text-xs max-w-sm mx-auto mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Click "Start Recording" when the consultation begins. The AI engine will diarize doctor and patient dialogue seamlessly.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 2: RECORDING ─────────────────────────────────────────── */}
        {step === "recording" && (
          <div className="flex flex-col items-center py-6 text-center space-y-5">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-red-50 border border-red-200">
              <span className="absolute h-full w-full rounded-full bg-red-400 opacity-30 animate-ping"></span>
              <Mic className="h-10 w-10 text-red-600 animate-pulse" />
            </div>

            <div>
              <div className="font-mono text-2xl font-bold text-foreground tabular-nums">
                {formatTime(recordingSec)}
              </div>
              <div className="text-xs text-muted-foreground mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                Ambient Medical Speech-To-Text Active...
              </div>
            </div>

            {/* Simulated Waveform */}
            <div className="flex items-center justify-center gap-1.5 h-12 w-full px-6 bg-slate-50 rounded-xl border border-border">
              {[40, 65, 30, 85, 95, 45, 75, 90, 60, 30, 70, 80, 50, 95, 40, 65].map((height, idx) => (
                <div
                  key={idx}
                  className="w-1.5 bg-[#1A73E8] rounded-full transition-all duration-150 animate-pulse"
                  style={{
                    height: isPaused ? "8px" : `${height}%`,
                    animationDelay: `${idx * 80}ms`,
                  }}
                />
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-foreground border border-border hover:bg-slate-50"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {isPaused ? <Play className="h-4 w-4 text-emerald-600" /> : <Pause className="h-4 w-4 text-amber-600" />}
                {isPaused ? "Resume" : "Pause"}
              </button>
              <button
                onClick={handleFinishRecording}
                className="flex items-center gap-2 rounded-full bg-[#1A73E8] hover:bg-[#1557b0] px-6 py-2 text-xs font-semibold text-white shadow-md transition-all"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <Square className="h-4 w-4 fill-white" />
                Finish & Extract Entities
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: PROCESSING ────────────────────────────────────────── */}
        {step === "processing" && (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="h-14 w-14 rounded-full border-4 border-blue-200 border-t-[#1A73E8] animate-spin mb-4"></div>
            <h4 className="font-bold text-sm text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
              Structuring Consultation & Rx...
            </h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
              Extracting diagnosis, dosage, frequency, and follow-up orders...
            </p>
          </div>
        )}

        {/* ─── STEP 4: REVIEW ────────────────────────────────────────────── */}
        {step === "review" && generatedSession && (
          <div className="space-y-4">
            <div className="rounded-xl bg-emerald-50 p-3 border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Diarization & Clinical Entity Extraction Complete!
              </div>
              <span className="font-mono text-xs font-bold text-emerald-700">98.6% High</span>
            </div>

            {/* Diagnosis */}
            <div className="rounded-xl bg-white border border-border p-3.5">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                Primary Diagnosis
              </div>
              <div className="font-bold text-sm text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
                {generatedSession.extractedData.diagnosis}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                <strong>Chief Complaint:</strong> {generatedSession.extractedData.chiefComplaint}
              </div>
            </div>

            {/* Medications */}
            <div className="rounded-xl bg-white border border-border p-3.5">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                <Pill className="w-3.5 h-3.5 text-[#1A73E8]" />
                Prescribed Medications ({generatedSession.extractedData.medications.length})
              </div>
              <div className="space-y-2">
                {generatedSession.extractedData.medications.map((m, idx) => (
                  <div key={m.id} className="rounded-lg bg-slate-50 p-2 border border-border">
                    <div className="flex items-center justify-between font-semibold text-foreground">
                      <span>{idx + 1}. {m.drugName}</span>
                      <span className="font-mono text-[11px] text-[#1A73E8] bg-blue-50 px-1.5 py-0.5 rounded">
                        {m.dosage}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{m.frequency} ({m.duration})</span>
                      <span>{m.instructions}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </DrawerShell>
  );
}
