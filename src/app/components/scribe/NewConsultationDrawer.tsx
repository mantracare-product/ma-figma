import { useState, useEffect, useRef } from "react";
import {
  Mic,
  Square,
  Play,
  Pause,
  UploadCloud,
  Calendar,
  User,
  Clock,
  Search,
  ChevronDown,
  FileAudio,
  Check,
  Plus,
  RotateCcw,
  Sparkles,
  Eye,
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
  onViewTranscript?: (session: ScribeSession) => void;
}

const AVAILABLE_CLIENTS = [
  { id: "1", name: "Rajesh Kumar", age: 54, gender: "Male" },
  { id: "2", name: "Sunita Devi", age: 48, gender: "Female" },
  { id: "3", name: "Amit Singhania", age: 62, gender: "Male" },
  { id: "4", name: "Pooja Sharma", age: 32, gender: "Female" },
  { id: "CL-001", name: "Sarah Johnson", age: 42, gender: "Female" },
  { id: "CL-002", name: "Michael Chen", age: 38, gender: "Male" },
  { id: "CL-003", name: "Emily Davis", age: 50, gender: "Female" },
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
  onViewTranscript,
}: NewConsultationDrawerProps) {
  // Client selection state
  const [selectedClientId, setSelectedClientId] = useState<string>("1");
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [customClientName, setCustomClientName] = useState("");

  // Appointment selection state
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>("none");
  const [isAppointmentDropdownOpen, setIsAppointmentDropdownOpen] = useState(false);

  // Audio mode: "live" | "upload"
  const [audioInputMode, setAudioInputMode] = useState<"live" | "upload">("live");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Workflow recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);

  // Processing & Generated Session
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedSession, setGeneratedSession] = useState<ScribeSession | null>(null);

  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const appointmentDropdownRef = useRef<HTMLDivElement>(null);

  // Reset on open/close
  useEffect(() => {
    if (!isOpen) {
      setIsRecording(false);
      setIsPaused(false);
      setRecordingSec(0);
      setIsProcessing(false);
      setGeneratedSession(null);
      setIsClientDropdownOpen(false);
      setIsAppointmentDropdownOpen(false);
      setUploadedFile(null);
      setClientSearchQuery("");
      setAudioInputMode("live");
    }
  }, [isOpen]);

  // Click outside dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        clientDropdownRef.current &&
        !clientDropdownRef.current.contains(e.target as HTMLElement)
      ) {
        setIsClientDropdownOpen(false);
      }
      if (
        appointmentDropdownRef.current &&
        !appointmentDropdownRef.current.contains(e.target as HTMLElement)
      ) {
        setIsAppointmentDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Timer for live recording
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

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getSelectedClient = () => {
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

  const filteredClients = AVAILABLE_CLIENTS.filter((c) =>
    c.name.toLowerCase().includes(clientSearchQuery.toLowerCase())
  );

  const selectedAppointment =
    AVAILABLE_APPOINTMENTS.find((a) => a.id === selectedAppointmentId) || AVAILABLE_APPOINTMENTS[0];

  const handleStartRecording = () => {
    setIsRecording(true);
    setIsPaused(false);
    setRecordingSec(0);
    toast.info("Ambient microphone recording started");
  };

  const handleTogglePause = () => {
    setIsPaused(!isPaused);
    if (!isPaused) {
      toast.info("Recording paused");
    } else {
      toast.info("Recording resumed");
    }
  };

  const handleResetRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
    setRecordingSec(0);
    toast.info("Recording reset");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      toast.success(`Audio loaded: ${file.name}`);
    }
  };

  const handleFinishAndProcess = () => {
    clearInterval(timerRef.current);

    const client = getSelectedClient();
    const scenario = PRESET_SCENARIOS[0];
    const doctor = SCRIBE_DOCTORS[0];

    const session: ScribeSession = {
      id: `scribe-${Date.now()}`,
      clientId: client.id,
      clientName: client.name,
      patientAge: client.age,
      patientGender: client.gender,
      appointmentId: selectedAppointmentId !== "none" ? selectedAppointmentId : undefined,
      sessionName:
        selectedAppointmentId !== "none"
          ? selectedAppointment.label.split("—")[1]?.trim() || "Client Session"
          : undefined,
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

    saveScribeSession(session);
    issuePrescriptionDocument(session);
    toast.success(`Transcript created for ${session.clientName}!`);

    // Reset recording state
    setIsRecording(false);
    setIsPaused(false);
    setRecordingSec(0);
    setUploadedFile(null);

    if (onSessionCreated) onSessionCreated(session);
    if (onViewTranscript) {
      onViewTranscript(session);
    } else {
      onClose();
    }
  };

  const handleViewTranscript = () => {
    if (generatedSession) {
      if (onViewTranscript) {
        onViewTranscript(generatedSession);
      } else {
        onClose();
      }
    }
  };

  // 24 Dynamic waveform bar heights
  const waveHeights = [20, 45, 75, 95, 60, 35, 80, 100, 55, 30, 70, 90, 85, 45, 65, 95, 100, 70, 40, 85, 60, 35, 50, 25];

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title="New AI Scribe Consultation"
      subtitle="Ambient medical speech-to-text with automated clinical entity extraction"
      icon={<Mic className="w-5 h-5 text-[#2c3e50]" />}
      width="max-w-2xl"
      zIndex={650}
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Cancel
          </button>

          {!generatedSession && !isProcessing && (
            <>
              {audioInputMode === "live" ? (
                isRecording ? (
                  <button
                    onClick={handleFinishAndProcess}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#181e25] to-[#2c3e50] hover:from-[#11161c] hover:to-[#22303e] px-5 py-2 text-xs font-semibold text-white shadow-sm hover:shadow transition-all cursor-pointer"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <Square className="w-3.5 h-3.5 fill-white" /> Finish & Extract
                  </button>
                ) : null
              ) : (
                <button
                  onClick={handleFinishAndProcess}
                  disabled={!uploadedFile}
                  className={`flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer ${
                    uploadedFile
                      ? "bg-gradient-to-r from-[#181e25] to-[#2c3e50] hover:from-[#11161c] hover:to-[#22303e]"
                      : "bg-slate-300 cursor-not-allowed"
                  }`}
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <Sparkles className="w-3.5 h-3.5" /> Create
                </button>
              )}
            </>
          )}

          {generatedSession && (
            <button
              onClick={handleViewTranscript}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#181e25] to-[#2c3e50] hover:from-[#11161c] hover:to-[#22303e] px-5 py-2 text-xs font-semibold text-white shadow-sm hover:shadow transition-all cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Eye className="w-3.5 h-3.5" /> View Transcript
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-5 text-xs">
        {/* If Processing State */}
        {isProcessing && (
          <div className="flex flex-col items-center py-20 text-center space-y-4">
            <div className="relative flex items-center justify-center">
              <div className="h-16 w-16 rounded-full border-4 border-slate-200 border-t-[#181e25] animate-spin"></div>
              <Sparkles className="w-6 h-6 text-[#181e25] absolute animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
                Structuring Consultation & Clinical Notes...
              </h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
                Running medical entity extraction on speech turns and formatting prescription...
              </p>
            </div>
          </div>
        )}

        {/* Setup Form (Client & Appointment) */}
        {!isProcessing && (
          <div className="space-y-5">
            {/* 1. Client / Patient Searchable Dropdown */}
            <div className="relative" ref={clientDropdownRef}>
              <label
                className="block text-xs font-semibold text-foreground mb-1.5"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Select Client / Patient <span className="text-red-500">*</span>
              </label>

              <button
                type="button"
                disabled={isRecording || !!generatedSession}
                onClick={() => {
                  if (!isRecording && !generatedSession) {
                    setIsClientDropdownOpen(!isClientDropdownOpen);
                    setIsAppointmentDropdownOpen(false);
                  }
                }}
                className={`w-full h-11 px-3.5 bg-white border rounded-xl text-left flex items-center justify-between text-xs font-medium text-foreground transition-all shadow-2xs ${
                  isRecording || !!generatedSession
                    ? "opacity-75 cursor-not-allowed border-border"
                    : "hover:border-[#181e25] border-border"
                }`}
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <div className="flex items-center gap-2 truncate">
                  <User className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span className="truncate">
                    {selectedClientId === "custom"
                      ? customClientName || "+ Add / Enter Walk-in Patient"
                      : getSelectedClient().name}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    isClientDropdownOpen ? "rotate-180 text-[#181e25]" : ""
                  }`}
                />
              </button>

              {/* Custom Searchable Popover Menu */}
              {isClientDropdownOpen && (
                <div
                  className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-border rounded-xl shadow-xl z-50 overflow-hidden"
                  style={{ boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
                >
                  <div className="p-2 border-b border-border bg-slate-50/70">
                    <div className="relative flex items-center">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search client by name..."
                        value={clientSearchQuery}
                        onChange={(e) => setClientSearchQuery(e.target.value)}
                        autoFocus
                        className="w-full h-8 pl-8 pr-2 text-xs bg-white border border-border rounded-lg outline-none focus:border-[#181e25]"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      />
                    </div>
                  </div>

                  <div className="max-h-52 overflow-y-auto py-1">
                    {filteredClients.length === 0 ? (
                      <div className="px-3 py-3 text-center text-muted-foreground text-xs">
                        No clients matching "{clientSearchQuery}"
                      </div>
                    ) : (
                      filteredClients.map((client) => {
                        const isSelected = selectedClientId === client.id;
                        return (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => {
                              setSelectedClientId(client.id);
                              setIsClientDropdownOpen(false);
                            }}
                            className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between transition-colors ${
                              isSelected ? "bg-slate-100 text-[#181e25] font-semibold" : "hover:bg-slate-50 text-foreground"
                            }`}
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          >
                            <span>{client.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#181e25]" />}
                          </button>
                        );
                      })
                    )}

                    <div className="border-t border-border mt-1 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClientId("custom");
                          setIsClientDropdownOpen(false);
                        }}
                        className={`w-full px-3.5 py-2 text-left text-xs font-semibold flex items-center gap-2 transition-colors ${
                          selectedClientId === "custom"
                            ? "bg-slate-100 text-[#181e25]"
                            : "text-[#181e25] hover:bg-slate-50"
                        }`}
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        <Plus className="w-3.5 h-3.5" /> Add New Walk-in Patient
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Custom patient name input if walk-in selected */}
            {selectedClientId === "custom" && (
              <div>
                <label
                  className="block text-xs font-semibold text-foreground mb-1.5"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Enter Patient Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Anand Sharma"
                  value={customClientName}
                  onChange={(e) => setCustomClientName(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-border rounded-lg text-xs outline-none focus:border-[#181e25]"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
              </div>
            )}

            {/* 2. Select Appointment (Optional) */}
            <div className="relative" ref={appointmentDropdownRef}>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  className="block text-xs font-semibold text-foreground"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Select Appointment
                </label>
                <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
              </div>

              <button
                type="button"
                disabled={isRecording || !!generatedSession}
                onClick={() => {
                  if (!isRecording && !generatedSession) {
                    setIsAppointmentDropdownOpen(!isAppointmentDropdownOpen);
                    setIsClientDropdownOpen(false);
                  }
                }}
                className={`w-full h-11 px-3.5 bg-white border rounded-xl text-left flex items-center justify-between text-xs font-medium text-foreground transition-all shadow-2xs ${
                  isRecording || !!generatedSession
                    ? "opacity-75 cursor-not-allowed border-border"
                    : "hover:border-[#181e25] border-border"
                }`}
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <div className="flex items-center gap-2 truncate">
                  <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span className="truncate">{selectedAppointment.label}</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    isAppointmentDropdownOpen ? "rotate-180 text-[#181e25]" : ""
                  }`}
                />
              </button>

              {/* Custom Appointment Dropdown */}
              {isAppointmentDropdownOpen && (
                <div
                  className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-border rounded-xl shadow-xl z-50 overflow-hidden py-1"
                  style={{ boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
                >
                  {AVAILABLE_APPOINTMENTS.map((apt) => {
                    const isSelected = selectedAppointmentId === apt.id;
                    return (
                      <button
                        key={apt.id}
                        type="button"
                        onClick={() => {
                          setSelectedAppointmentId(apt.id);
                          setIsAppointmentDropdownOpen(false);
                        }}
                        className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between transition-colors ${
                          isSelected ? "bg-slate-100 text-[#181e25] font-semibold" : "hover:bg-slate-50 text-foreground"
                        }`}
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        <span className="truncate">{apt.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#181e25] flex-shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ─── AFTER FINISH: CLEAN MINIMAL TRANSCRIPT CARD ─── */}
            {generatedSession ? (
              <div className="rounded-2xl bg-white border border-border p-5 shadow-xs pt-4 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-[#181e25] flex-shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Transcript Ready • {generatedSession.clientName}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Duration: {formatTime(generatedSession.durationSeconds)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleViewTranscript}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#181e25] to-[#2c3e50] hover:from-[#11161c] hover:to-[#22303e] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <Eye className="w-4 h-4" /> View Transcript
                  </button>
                </div>
              </div>
            ) : (
              /* ─── BEFORE FINISH: ULTRA-PREMIUM WHITE RECORDING HUB ─── */
              <div className="space-y-3.5 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Recording Method
                  </span>
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-border">
                    <button
                      type="button"
                      disabled={isRecording}
                      onClick={() => setAudioInputMode("live")}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                        audioInputMode === "live"
                          ? "bg-white text-[#181e25] shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      Live Ambient Mic
                    </button>
                    <button
                      type="button"
                      disabled={isRecording}
                      onClick={() => setAudioInputMode("upload")}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                        audioInputMode === "upload"
                          ? "bg-white text-[#181e25] shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      Upload Audio
                    </button>
                  </div>
                </div>

                {/* Live Mic Mode */}
                {audioInputMode === "live" ? (
                  !isRecording ? (
                    /* ─── PREMIUM WHITE READY CARD ─── */
                    <div className="rounded-3xl bg-white border border-border p-8 text-center space-y-5 shadow-xs">
                      {/* Dark Header Gradient Button for Mic */}
                      <div className="relative mx-auto flex items-center justify-center">
                        <button
                          type="button"
                          onClick={handleStartRecording}
                          className="group relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-[#181e25] to-[#2c3e50] hover:from-[#11161c] hover:to-[#22303e] text-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
                        >
                          <Mic className="h-9 w-9 text-white group-hover:scale-110 transition-transform" />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-bold text-foreground text-base tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
                          Ready to Record Consultation
                        </h4>
                        <p
                          className="text-muted-foreground text-xs max-w-sm mx-auto leading-relaxed"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          Deepgram Nova-2 Medical STT will listen and diarize speech turns in real-time.
                        </p>
                      </div>

                      {/* Direct Start Button */}
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={handleStartRecording}
                          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#181e25] to-[#2c3e50] hover:from-[#11161c] hover:to-[#22303e] px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          <Mic className="w-4 h-4" /> Start Recording
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ─── PREMIUM WHITE ACTIVE RECORDING CARD ─── */
                    <div className="rounded-3xl bg-white border border-border p-7 text-center space-y-6 shadow-xs">
                      {/* Dark Gradient Pulsing Mic */}
                      <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full">
                        <span
                          className={`absolute h-full w-full rounded-full bg-slate-300 opacity-30 ${
                            isPaused ? "" : "animate-ping"
                          }`}
                        />
                        <div
                          className={`relative flex h-16 w-16 items-center justify-center rounded-full text-white shadow-md transition-all ${
                            isPaused
                              ? "bg-slate-700"
                              : "bg-gradient-to-r from-[#181e25] to-[#2c3e50] animate-pulse"
                          }`}
                        >
                          <Mic className="h-8 w-8 text-white" />
                        </div>
                      </div>

                      {/* Clean Timer & Status */}
                      <div className="space-y-1">
                        <div className="font-mono text-4xl font-extrabold text-[#181e25] tracking-tight tabular-nums">
                          {formatTime(recordingSec)}
                        </div>
                        <div
                          className="text-xs text-muted-foreground font-medium mt-1 flex items-center justify-center gap-2"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              isPaused ? "bg-slate-400" : "bg-[#181e25] animate-pulse"
                            }`}
                          />
                          {isPaused ? "Recording Paused" : "Listening & Diarizing Ambient Dialogue..."}
                        </div>
                      </div>

                      {/* Premium Dark Slate Sound Waves Equalizer */}
                      <div className="flex items-center justify-center gap-1.5 h-14 w-full px-6 bg-slate-50 rounded-2xl border border-border">
                        {waveHeights.map((height, idx) => (
                          <div
                            key={idx}
                            className={`w-1.5 rounded-full transition-all duration-200 ${
                              isPaused
                                ? "bg-slate-300"
                                : "bg-gradient-to-t from-[#181e25] to-[#2c3e50]"
                            }`}
                            style={{
                              height: isPaused ? "5px" : `${height}%`,
                              opacity: isPaused ? 0.3 : 0.85,
                              animation: isPaused
                                ? "none"
                                : `pulse 1.1s infinite ease-in-out ${idx * 45}ms`,
                            }}
                          />
                        ))}
                      </div>

                      {/* Clean Controls (No Yellow/Bright Blue) */}
                      <div className="flex items-center justify-center gap-3 pt-1">
                        {/* Pause / Resume Button */}
                        <button
                          type="button"
                          onClick={handleTogglePause}
                          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all shadow-2xs cursor-pointer border ${
                            isPaused
                              ? "bg-slate-100 text-[#181e25] border-slate-300 hover:bg-slate-200"
                              : "bg-white text-slate-700 border-border hover:bg-slate-50"
                          }`}
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          {isPaused ? (
                            <>
                              <Play className="h-4 w-4 fill-[#181e25] text-[#181e25]" /> Resume
                            </>
                          ) : (
                            <>
                              <Pause className="h-4 w-4 fill-slate-700 text-slate-700" /> Pause
                            </>
                          )}
                        </button>

                        {/* Reset Button */}
                        <button
                          type="button"
                          onClick={handleResetRecording}
                          className="flex items-center gap-1.5 rounded-xl bg-white hover:bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-600 border border-border transition-all shadow-2xs cursor-pointer"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                          title="Reset recording"
                        >
                          <RotateCcw className="h-4 w-4" /> Reset
                        </button>

                        {/* Finish Button */}
                        <button
                          type="button"
                          onClick={handleFinishAndProcess}
                          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#181e25] to-[#2c3e50] hover:from-[#11161c] hover:to-[#22303e] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          <Square className="h-3.5 w-3.5 fill-white" /> Finish
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  /* Upload Audio Mode Card */
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-3xl border-2 border-dashed border-slate-300 hover:border-[#181e25] bg-slate-50/70 p-8 text-center space-y-3 cursor-pointer transition-all hover:bg-slate-100/60 group shadow-xs"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*,.mp3,.wav,.m4a,.webm"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-600 group-hover:text-[#181e25] group-hover:border-slate-400 transition-all shadow-sm group-hover:scale-105">
                      <UploadCloud className="h-7 w-7" />
                    </div>
                    <div>
                      {uploadedFile ? (
                        <div className="space-y-3">
                          <div>
                            <p className="font-bold text-xs text-foreground flex items-center justify-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                              <FileAudio className="w-4 h-4 text-[#181e25]" /> {uploadedFile.name}
                            </p>
                            <span className="text-[11px] text-muted-foreground">
                              {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to transcribe
                            </span>
                          </div>

                          <div className="pt-1 flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFinishAndProcess();
                              }}
                              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#181e25] to-[#2c3e50] hover:from-[#11161c] hover:to-[#22303e] px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:shadow transition-all cursor-pointer"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              <Sparkles className="w-3.5 h-3.5" /> Create
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                fileInputRef.current?.click();
                              }}
                              className="px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground underline cursor-pointer"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              Change file
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h4 className="font-bold text-foreground text-xs" style={{ fontFamily: "Outfit, sans-serif" }}>
                            Upload Consultation Audio File
                          </h4>
                          <p className="text-muted-foreground text-[11px] mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                            Drag and drop or browse files (.mp3, .wav, .m4a)
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </DrawerShell>
  );
}
