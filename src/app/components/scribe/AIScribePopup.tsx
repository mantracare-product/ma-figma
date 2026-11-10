import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  UploadCloud,
  User,
  Clock,
  Search,
  ChevronDown,
  Check,
  Plus,
  Sparkles,
  Eye,
  FileText,
  X,
  Minus,
  GripHorizontal,
  Stethoscope,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Pill,
  ShieldCheck,
  Calendar,
  Receipt,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useClients } from "../../../lib/clientsStore";
import { useProcessStore, EntityType } from "../../../lib/useProcessStore";
import {
  ScribeSession,
  PRESET_SCENARIOS,
  saveScribeSession,
  issuePrescriptionDocument,
  SCRIBE_DOCTORS,
  SCRIBE_EVENT,
} from "../../../lib/scribeSessionStore";

export interface AIScribePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated?: (session: ScribeSession) => void;
  onViewTranscript?: (session: ScribeSession) => void;
  initialClientId?: string;
  initialClientName?: string;
  initialEntityType?: EntityType;
  initialProcessId?: string;
  initialProcessName?: string;
  initialRecordId?: string;
  zIndex?: number;
}

export const SCRIBE_ENTITIES = [
  { id: "client" as EntityType, label: "Client / Patient", prefix: "REC", icon: User },
  { id: "appointment" as EntityType, label: "Appointment", prefix: "APT", icon: Calendar },
  { id: "invoice" as EntityType, label: "Invoice", prefix: "INV", icon: Receipt },
  { id: "insurance" as EntityType, label: "Insurance", prefix: "INS", icon: ShieldCheck },
  { id: "claim" as EntityType, label: "Claim", prefix: "CLM", icon: FileCheck },
];

export default function AIScribePopup({
  isOpen,
  onClose,
  onSessionCreated,
  onViewTranscript,
  initialClientId,
  initialClientName,
  initialEntityType,
  initialProcessId,
  initialProcessName,
  initialRecordId,
  zIndex = 2147483645,
}: AIScribePopupProps) {
  // Live reactive client store & process store
  const { clients: liveClients } = useClients();
  const { processes: liveProcesses } = useProcessStore();

  // Workflow steps:
  // 1. "record" — Immediately add scribe (ambient recording, scenario preset, audio upload, notes)
  // 2. "assign" — On saving, ask user to add/assign patient and consultation metadata
  // 3. "completed" — Success state with quick link to transcript / SOAP notes
  const [step, setStep] = useState<"record" | "assign" | "completed">("record");

  // Free-form Draggable window state matching AIAssistantPopup
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    const initialWidth = 370;
    const initialHeight = 560;
    const initialX =
      typeof window !== "undefined"
        ? Math.max(20, window.innerWidth - initialWidth - 28)
        : 880;
    const initialY =
      typeof window !== "undefined"
        ? Math.max(20, window.innerHeight - initialHeight - 75)
        : 140;
    return { x: initialX, y: initialY };
  });

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  // Step 1: Recording & Dictation state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const [audioInputMode, setAudioInputMode] = useState<"live" | "upload">("live");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState<number>(0);
  const [transcriptDraft, setTranscriptDraft] = useState<string>("");
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Patient assignment & metadata state
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [customPatientName, setCustomPatientName] = useState("");
  const [patientAge, setPatientAge] = useState<number>(45);
  const [patientGender, setPatientGender] = useState<"Female" | "Male" | "Other">("Female");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(SCRIBE_DOCTORS[0]?.id || "doc-1");
  const [selectedEntityId, setSelectedEntityId] = useState<EntityType>("client");
  const [consultationTitle, setConsultationTitle] = useState("");
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // Step 3: Saved result state
  const [savedSession, setSavedSession] = useState<ScribeSession | null>(null);

  // Sync initial scenario transcript draft on mount/scenario switch
  useEffect(() => {
    const sc = PRESET_SCENARIOS[selectedScenarioIndex] || PRESET_SCENARIOS[0];
    if (sc) {
      setTranscriptDraft(sc.transcriptText);
    }
  }, [selectedScenarioIndex]);

  // Reset or initialize state when opened/closed
  useEffect(() => {
    if (isOpen) {
      setStep("record");
      setIsRecording(false);
      setIsPaused(false);
      setRecordingSec(0);
      setUploadedFile(null);
      setSavedSession(null);

      // Pre-select patient if provided in props
      if (initialClientId) {
        setSelectedClientId(initialClientId);
        const match = liveClients.find((c) => c.id === initialClientId);
        if (match) {
          setPatientAge(match.age || 45);
          setPatientGender((match.gender as any) || "Female");
        }
      } else if (initialClientName) {
        const match = liveClients.find(
          (c) => c.name.toLowerCase().trim() === initialClientName.toLowerCase().trim()
        );
        if (match) {
          setSelectedClientId(match.id);
          setPatientAge(match.age || 45);
          setPatientGender((match.gender as any) || "Female");
        } else {
          setIsNewPatient(true);
          setCustomPatientName(initialClientName);
        }
      } else if (liveClients.length > 0) {
        setSelectedClientId(liveClients[0].id);
        setPatientAge(liveClients[0].age || 42);
        setPatientGender((liveClients[0].gender as any) || "Female");
      }

      if (initialEntityType) {
        setSelectedEntityId(initialEntityType);
      }
    } else {
      clearInterval(timerRef.current);
    }
  }, [isOpen, initialClientId, initialClientName, initialEntityType, liveClients]);

  // Recording timer
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingSec((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording, isPaused]);

  // Click outside listener for dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as HTMLElement)) {
        setIsClientDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Window drag handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position.x,
      startY: position.y,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;
    const newX = Math.max(10, Math.min(window.innerWidth - 380, dragStartRef.current.startX + dx));
    const newY = Math.max(10, Math.min(window.innerHeight - 150, dragStartRef.current.startY + dy));
    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Recording controls
  const handleToggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      setIsPaused(false);
      toast.info("Ambient microphone listening started");
    } else if (isPaused) {
      setIsPaused(false);
      toast.info("Recording resumed");
    } else {
      setIsPaused(true);
      toast.info("Recording paused");
    }
  };

  const handleReset = () => {
    setIsRecording(false);
    setIsPaused(false);
    setRecordingSec(0);
    setUploadedFile(null);
    setStep("record");
    setSavedSession(null);
    const sc = PRESET_SCENARIOS[selectedScenarioIndex] || PRESET_SCENARIOS[0];
    if (sc) setTranscriptDraft(sc.transcriptText);
    toast.info("Scribe session reset");
  };

  const handleProceedToAssign = () => {
    // If recording was active, pause it
    if (isRecording) {
      setIsPaused(true);
    }

    // Default title if empty
    const clientName = isNewPatient
      ? customPatientName.trim() || "Walk-in Patient"
      : liveClients.find((c) => c.id === selectedClientId)?.name || "Patient";
    const today = new Date().toISOString().slice(0, 10);
    setConsultationTitle(`${clientName}_Consultation_${today}`);

    setStep("assign");
  };

  const handleSelectClient = (client: any) => {
    setSelectedClientId(client.id);
    setIsNewPatient(false);
    setPatientAge(client.age || 42);
    setPatientGender(client.gender || "Female");
    setIsClientDropdownOpen(false);
  };

  const handleConfirmSave = () => {
    const scenario = PRESET_SCENARIOS[selectedScenarioIndex] || PRESET_SCENARIOS[0];
    const doctor = SCRIBE_DOCTORS.find((d) => d.id === selectedDoctorId) || SCRIBE_DOCTORS[0];

    let patientId = selectedClientId;
    let patientName = "Walk-in Patient";

    if (isNewPatient) {
      patientId = `WALK-${Date.now().toString().slice(-4)}`;
      patientName = customPatientName.trim() || "Walk-in Patient";
    } else {
      const found = liveClients.find((c) => c.id === selectedClientId);
      if (found) {
        patientId = found.id;
        patientName = found.name;
      }
    }

    const firstName = patientName.split(" ")[0] || patientName;
    const lastName = patientName.split(" ").slice(1).join(" ") || firstName;
    const prefix = patientGender === "Female" ? "Ms." : "Mr.";

    // Personalize transcript
    const customizedTranscript = transcriptDraft
      .replace(/Mr\.\s*Rajesh(\s+Kumar)?/gi, `${prefix} ${lastName}`)
      .replace(/Rajesh\s+Kumar/gi, patientName)
      .replace(/Rajesh/gi, firstName)
      .replace(/Mrs\.\s*Sunita/gi, `${prefix} ${lastName}`)
      .replace(/Sunita/gi, firstName)
      .replace(/Mr\.\s*Amit/gi, `${prefix} ${lastName}`)
      .replace(/Amit/gi, firstName);

    const personalizedUtterances = scenario.utterances.map((u) => ({
      ...u,
      text: u.text
        .replace(/Mr\.\s*Rajesh(\s+Kumar)?/gi, `${prefix} ${lastName}`)
        .replace(/Rajesh\s+Kumar/gi, patientName)
        .replace(/Rajesh/gi, firstName),
    }));

    const finalTitle =
      consultationTitle.trim() ||
      `${patientName}_Consultation_${new Date().toISOString().slice(0, 10)}`;

    const newSession: ScribeSession = {
      id: `scribe-${Date.now()}`,
      clientId: patientId,
      clientName: patientName,
      title: finalTitle,
      patientAge: patientAge,
      patientGender: patientGender,
      entityType: selectedEntityId,
      workflow: "Clinical Consultation",
      processId: initialProcessId,
      processName: initialProcessName,
      recordId: initialRecordId || `REC-${patientId}-${Date.now().toString().slice(-4)}`,
      sessionName: `Clinical Consultation • ${patientName}`,
      doctorId: doctor.id,
      doctorName: doctor.name,
      sessionDate: new Date().toISOString(),
      durationSeconds: recordingSec || 78,
      audioInputMode: audioInputMode,
      status: "completed",
      createdAt: Date.now(),
      transcript: {
        fullText: customizedTranscript,
        utterances: personalizedUtterances,
      },
      extractedData: {
        ...scenario.extractedData,
        chiefComplaint: scenario.extractedData.chiefComplaint,
        doctorNotes: `Consultation attended by ${doctor.name}. ${scenario.extractedData.doctorNotes || "Follow-up advised."}`,
      },
    };

    saveScribeSession(newSession);
    try {
      issuePrescriptionDocument(newSession);
    } catch {}

    setSavedSession(newSession);
    setStep("completed");
    toast.success(`Consultation saved & SOAP notes generated for ${patientName}!`);
    onSessionCreated?.(newSession);
  };

  const filteredClients = liveClients.filter((c) => {
    const q = clientSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.name || "").toLowerCase().includes(q) ||
      (c.id || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q)
    );
  });

  const selectedClient = liveClients.find((c) => c.id === selectedClientId);

  return (
    <div
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: zIndex,
      }}
      className="fixed w-[360px] sm:w-[375px] h-[560px] sm:h-[580px] max-w-[calc(100vw-24px)] max-h-[calc(100vh-60px)] bg-[#f3f4f6] dark:bg-[#18181b] rounded-[24px] border border-slate-300/80 dark:border-zinc-700/80 shadow-[0_20px_50px_rgba(15,23,42,0.22)] flex flex-col overflow-hidden select-none animate-in fade-in zoom-in-95 duration-200 font-sans"
    >
      {/* ── Draggable Top Header ── */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full pt-2.5 pb-1 px-4 flex items-center justify-between cursor-grab active:cursor-grabbing bg-transparent shrink-0"
        title="Click and drag to move anywhere"
      >
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400">
          <GripHorizontal className="w-4 h-4 opacity-50" />
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[11px] uppercase font-bold tracking-wider text-slate-700 dark:text-zinc-300">
            AI Scribe
          </span>
        </div>

        {/* Center Drag Grip Pill */}
        <div className="h-1 w-10 bg-slate-300 dark:bg-zinc-600 rounded-full hover:bg-slate-400 transition-colors" />

        {/* Top Control Buttons */}
        <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={handleReset}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors"
            title="Reset scribe session"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Dynamic Content Body ── */}
      <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col justify-between no-scrollbar">
        {/* ══════════════════════════════════════════════════════
            STEP 1: ADD SCRIBE FIRST (Recording / Dictation / Scenario)
           ══════════════════════════════════════════════════════ */}
        {step === "record" && (
          <div className="flex-1 flex flex-col justify-between">
            <div>
              {/* Audio Mode Tabs (Live vs Upload) */}
              <div className="flex items-center justify-between bg-white dark:bg-zinc-800/90 p-0.5 rounded-xl border border-slate-200/90 dark:border-zinc-700/80 mb-2.5">
                <button
                  type="button"
                  onClick={() => setAudioInputMode("live")}
                  className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    audioInputMode === "live"
                      ? "bg-[#1456f0] text-white shadow-xs"
                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  Live Ambient
                </button>
                <button
                  type="button"
                  onClick={() => setAudioInputMode("upload")}
                  className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    audioInputMode === "upload"
                      ? "bg-[#1456f0] text-white shadow-xs"
                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Upload Audio
                </button>
              </div>

              {/* Live Mic Panel */}
              {audioInputMode === "live" ? (
                <div className="bg-white dark:bg-zinc-800/95 rounded-2xl p-3 border border-slate-200/90 dark:border-zinc-700/80 shadow-2xs mb-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-zinc-200 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatTime(recordingSec)}
                      </span>
                      {isRecording && !isPaused && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 animate-pulse">
                          ● Rec
                        </span>
                      )}
                      {isPaused && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                          Paused
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500">
                      {isRecording
                        ? isPaused
                          ? "Paused"
                          : "Listening..."
                        : "Ready to record"}
                    </span>
                  </div>

                  {/* Audio Waveform Bars Visualization */}
                  <div className="h-9 bg-slate-50 dark:bg-zinc-900/60 rounded-xl px-3 flex items-center justify-center gap-1 border border-slate-100 dark:border-zinc-800/80 mb-2.5 overflow-hidden">
                    {[16, 24, 12, 28, 20, 32, 14, 26, 36, 18, 30, 22, 28, 14, 20, 16].map(
                      (h, i) => (
                        <div
                          key={i}
                          style={{
                            height: isRecording && !isPaused ? `${Math.max(6, (h * ((i % 3) + 1.2)) % 32)}px` : "4px",
                            transition: "height 150ms ease-in-out",
                          }}
                          className={`w-1 rounded-full ${
                            isRecording && !isPaused
                              ? "bg-blue-500 dark:bg-blue-400"
                              : "bg-slate-300 dark:bg-zinc-700"
                          }`}
                        />
                      )
                    )}
                  </div>

                  {/* Big Record / Pause Trigger */}
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleRecording}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs ${
                        !isRecording
                          ? "bg-slate-900 hover:bg-slate-800 text-white dark:bg-blue-600 dark:hover:bg-blue-500"
                          : isPaused
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-amber-500 hover:bg-amber-600 text-white"
                      }`}
                    >
                      {!isRecording ? (
                        <>
                          <Mic className="w-4 h-4 text-emerald-400 animate-pulse" />
                          Start Ambient Scribing
                        </>
                      ) : isPaused ? (
                        <>
                          <Play className="w-3.5 h-3.5" /> Resume Scribe
                        </>
                      ) : (
                        <>
                          <Pause className="w-3.5 h-3.5" /> Pause Recording
                        </>
                      )}
                    </button>

                    {isRecording && (
                      <button
                        type="button"
                        onClick={handleProceedToAssign}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-semibold transition-colors"
                        title="Finish recording"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Upload Mode Panel */
                <div className="bg-white dark:bg-zinc-800/95 rounded-2xl p-3 border border-slate-200/90 dark:border-zinc-700/80 shadow-2xs mb-2 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadedFile(file);
                        toast.success(`Loaded audio: ${file.name}`);
                      }
                    }}
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 dark:border-zinc-700 hover:border-blue-400 rounded-xl p-3 cursor-pointer transition-colors"
                  >
                    <UploadCloud className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-zinc-200">
                      {uploadedFile ? uploadedFile.name : "Select or Drop Audio File"}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                      Supports MP3, WAV, M4A up to 50MB
                    </p>
                  </div>
                </div>
              )}

              {/* Quick Scenario Preset Chips */}
              <div className="mb-2">
                <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1 px-0.5">
                  Clinical Presets:
                </span>
                <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5">
                  {PRESET_SCENARIOS.map((sc, idx) => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => setSelectedScenarioIndex(idx)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors shrink-0 ${
                        selectedScenarioIndex === idx
                          ? "bg-blue-600 text-white shadow-2xs"
                          : "bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700/80 hover:bg-slate-50"
                      }`}
                    >
                      {sc.title.split("—")[0].trim()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Transcript / Dictation Note Area */}
              <div className="bg-white dark:bg-zinc-800/95 rounded-2xl p-2.5 border border-slate-200/90 dark:border-zinc-700/80 shadow-2xs">
                <div className="flex items-center justify-between mb-1.5 px-0.5">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    Live Clinical Dialogue
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                    Editable Draft
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={transcriptDraft}
                  onChange={(e) => setTranscriptDraft(e.target.value)}
                  placeholder="Doctor dictation or patient consultation dialogue will stream live here..."
                  className="w-full text-xs bg-slate-50 dark:bg-zinc-900/60 rounded-xl p-2 border border-slate-200/80 dark:border-zinc-700/80 text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-sans leading-relaxed"
                />
              </div>
            </div>

            {/* Bottom Proceed CTA */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleProceedToAssign}
                className="w-full py-2.5 px-3 bg-[#1456f0] hover:bg-[#0f46c7] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all group"
              >
                <span>Save Consultation & Assign Patient</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 2: ON SAVING — ASSIGN PATIENT & METADATA
           ══════════════════════════════════════════════════════ */}
        {step === "assign" && (
          <div className="flex-1 flex flex-col justify-between">
            <div className="space-y-2.5">
              {/* Back to Recording Bar */}
              <div className="flex items-center justify-between pb-1">
                <button
                  type="button"
                  onClick={() => setStep("record")}
                  className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Dictation
                </button>
                <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500">
                  Step 2 of 2
                </span>
              </div>

              {/* Patient Selection Card */}
              <div className="bg-white dark:bg-zinc-800/95 rounded-2xl p-3 border border-slate-200/90 dark:border-zinc-700/80 shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    Patient
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewPatient(!isNewPatient);
                      if (!isNewPatient) {
                        setCustomPatientName("");
                      }
                    }}
                    className="text-[11px] font-semibold text-blue-600 hover:underline"
                  >
                    {isNewPatient ? "Select Existing" : "+ New / Walk-in"}
                  </button>
                </div>

                {isNewPatient ? (
                  <div>
                    <input
                      type="text"
                      value={customPatientName}
                      onChange={(e) => setCustomPatientName(e.target.value)}
                      placeholder="Type patient full name..."
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                ) : (
                  <div className="relative" ref={clientDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 font-medium"
                    >
                      <span className="truncate">
                        {selectedClient ? selectedClient.name : "Select patient..."}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                    </button>

                    {isClientDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-slate-200 dark:border-zinc-700 z-50 overflow-hidden">
                        <div className="p-1.5 border-b border-slate-100 dark:border-zinc-700">
                          <div className="relative flex items-center">
                            <Search className="w-3 h-3 text-slate-400 absolute left-2" />
                            <input
                              type="text"
                              value={clientSearchQuery}
                              onChange={(e) => setClientSearchQuery(e.target.value)}
                              placeholder="Search patient..."
                              className="w-full pl-6 pr-2 py-1 text-xs bg-slate-50 dark:bg-zinc-900 rounded-lg text-slate-700 dark:text-zinc-200 focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="max-h-36 overflow-y-auto p-1">
                          {filteredClients.slice(0, 10).map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleSelectClient(c)}
                              className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                                selectedClientId === c.id
                                  ? "bg-blue-50 text-blue-700 font-semibold"
                                  : "hover:bg-slate-50 text-slate-700 dark:text-zinc-200"
                              }`}
                            >
                              <div>
                                <p className="font-medium">{c.name}</p>
                                <p className="text-[10px] text-slate-400">{c.phone || c.id}</p>
                              </div>
                              {selectedClientId === c.id && <Check className="w-3.5 h-3.5 text-blue-600" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Age & Gender Demographics */}
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                      Age
                    </label>
                    <input
                      type="number"
                      value={patientAge}
                      onChange={(e) => setPatientAge(parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-zinc-900/60 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                      Gender
                    </label>
                    <select
                      value={patientGender}
                      onChange={(e) => setPatientGender(e.target.value as any)}
                      className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-zinc-900/60 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 focus:outline-none"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Attending Doctor */}
              <div className="bg-white dark:bg-zinc-800/95 rounded-2xl p-3 border border-slate-200/90 dark:border-zinc-700/80 shadow-2xs">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                  Attending Doctor
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 font-medium focus:outline-none"
                >
                  {SCRIBE_DOCTORS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.specialty}
                    </option>
                  ))}
                </select>
              </div>

              {/* Entity / Workflow Link */}
              <div className="bg-white dark:bg-zinc-800/95 rounded-2xl p-3 border border-slate-200/90 dark:border-zinc-700/80 shadow-2xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                      Link Entity
                    </label>
                    <select
                      value={selectedEntityId}
                      onChange={(e) => setSelectedEntityId(e.target.value as any)}
                      className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-zinc-900/60 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 focus:outline-none"
                    >
                      {SCRIBE_ENTITIES.map((ent) => (
                        <option key={ent.id} value={ent.id}>
                          {ent.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                      Consultation Title
                    </label>
                    <input
                      type="text"
                      value={consultationTitle}
                      onChange={(e) => setConsultationTitle(e.target.value)}
                      placeholder="Title summary..."
                      className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-zinc-900/60 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Save Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleConfirmSave}
                className="w-full py-2.5 px-3 bg-[#1456f0] hover:bg-[#0f46c7] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Confirm & Generate SOAP Notes</span>
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 3: COMPLETED VIEW & ACTIONS
           ══════════════════════════════════════════════════════ */}
        {step === "completed" && savedSession && (
          <div className="flex-1 flex flex-col justify-between items-center text-center py-3">
            <div className="my-auto w-full">
              {/* Checkmark icon badge */}
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                Consultation Transcribed!
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Clinical documentation and SOAP notes generated.
              </p>

              {/* Patient & Summary Details Card */}
              <div className="w-full bg-white dark:bg-zinc-800/95 rounded-2xl p-3 border border-slate-200/90 dark:border-zinc-700/80 shadow-2xs mt-4 text-left space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-zinc-100">
                      {savedSession.clientName}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {savedSession.patientAge}y • {savedSession.patientGender} • {savedSession.doctorName}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60">
                    Attested
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-300">
                    <Stethoscope className="w-3.5 h-3.5 text-blue-500" />
                    <span className="font-medium truncate">
                      {savedSession.extractedData?.diagnosis || "Consultation Completed"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-300">
                    <Pill className="w-3.5 h-3.5 text-amber-500" />
                    <span>
                      {savedSession.extractedData?.medications?.length || 0} Medications Prescribed
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="w-full space-y-1.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewTranscript?.(savedSession);
                }}
                className="w-full py-2.5 px-3 bg-[#1456f0] hover:bg-[#0f46c7] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Full Transcript & SOAP Notes</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-medium border border-slate-200 dark:border-zinc-700 transition-colors"
              >
                Start Another Scribe
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
