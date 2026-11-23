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
  Sparkles,
  FileText,
  X,
  Minus,
  GripHorizontal,
  Stethoscope,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Calendar,
  Receipt,
  FileCheck,
  Activity,
  FileSpreadsheet,
  Users,
  Link2,
  Plus,
  List,
} from "lucide-react";
import symbolLogo from "../../../imports/Ma-symbol-mark.png";
import { toast } from "sonner";
import { useClients } from "../../../lib/clientsStore";
import { useProcessStore, EntityType } from "../../../lib/useProcessStore";
import { appointmentService, Appointment } from "../../../lib/appointmentService";
import { useTeamMembers } from "../../../lib/teamStore";
import { useAuth } from "../../context/AuthContext";
import {
  ScribeSession,
  PRESET_SCENARIOS,
  saveScribeSession,
  getScribeSessions,
  SCRIBE_EVENT,
  markScribeSessionFilledWithAi,
  issuePrescriptionDocument,
  generateClinicalSummary,
} from "../../../lib/scribeSessionStore";
import {
  markActivityFilledWithAi,
  formatDuration,
  formatTimestamp,
} from "../../../lib/activityEngine";

export interface AIScribePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated?: (session: ScribeSession, fillWithAi?: boolean) => void;
  onViewTranscript?: (session: ScribeSession) => void;
  onFillWithAi?: (scribeData: {
    transcriptPreview?: string;
    diagnosis?: string;
    chiefComplaint?: string;
    extractedData?: any;
    scribeSessionId?: string;
  }) => void;
  initialClientId?: string;
  initialClientName?: string;
  initialEntityType?: EntityType;
  initialProcessId?: string;
  initialProcessName?: string;
  initialRecordId?: string;
  initialAppointmentId?: string;
  initialAppointmentDate?: string;
  initialAttendeeId?: string;
  initialAttendeeName?: string;
  initialStep?: "list" | "record";
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
  onFillWithAi,
  initialClientId,
  initialClientName,
  initialEntityType,
  initialProcessId,
  initialProcessName,
  initialRecordId,
  initialAppointmentId,
  initialAppointmentDate,
  initialAttendeeId,
  initialAttendeeName,
  initialStep,
  zIndex = 2147483645,
}: AIScribePopupProps) {
  const { clients: liveClients } = useClients();
  const { processes: liveProcesses } = useProcessStore();
  const { teamMembers } = useTeamMembers();
  const { user } = useAuth();

  // Workflow steps:
  // 1. "list"   — Client has existing scribe sessions -> list cards + "+ Add New"
  // 2. "record" — Immediate ambient recording or audio upload
  // 3. "assign" — Name & Scribe summary, then Save transcript / Save and fill with AI
  const [step, setStep] = useState<"list" | "record" | "assign">(() => initialStep || "list");
  const [sessionName, setSessionName] = useState<string>("");
  const [scribeStoreTick, setScribeStoreTick] = useState(0);

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
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Patient assignment & metadata state
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [customPatientName, setCustomPatientName] = useState("");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>("none");
  const [sessionDate, setSessionDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [selectedAttendeeId, setSelectedAttendeeId] = useState<string>("");
  const [selectedAttendeeName, setSelectedAttendeeName] = useState<string>("");
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);

  // Listen for scribe session store changes
  useEffect(() => {
    const handler = () => setScribeStoreTick((t) => t + 1);
    window.addEventListener(SCRIBE_EVENT, handler);
    return () => window.removeEventListener(SCRIBE_EVENT, handler);
  }, []);

  // All available scribe sessions across the practice
  const allScribeSessions = useMemo(() => {
    return getScribeSessions();
  }, [scribeStoreTick]);

  // Scribe sessions specifically for the current client (if opened for one)
  const clientSessions = useMemo(() => {
    const cId = initialClientId ? String(initialClientId).toLowerCase().trim() : undefined;
    const cName = initialClientName?.toLowerCase().trim();
    if (!cId && !cName) return allScribeSessions;
    return allScribeSessions.filter((s) => {
      if (cId && String(s.clientId).toLowerCase().trim() === cId) return true;
      if (cName && s.clientName?.toLowerCase().trim() === cName) return true;
      return false;
    });
  }, [allScribeSessions, initialClientId, initialClientName]);

  // Displayed sessions in the Scribes step: ALWAYS for this contact only when opened for a contact
  const displayedSessions = useMemo(() => {
    if (initialClientId || initialClientName) {
      return clientSessions;
    }
    return allScribeSessions;
  }, [initialClientId, initialClientName, clientSessions, allScribeSessions]);

  // Reset or initialize state when opened/closed
  useEffect(() => {
    if (isOpen) {
      setStep(initialStep || "list");
      setIsRecording(false);
      setIsPaused(false);
      setRecordingSec(0);
      setUploadedFile(null);

      // Refresh appointments
      const appts = appointmentService.getAppointments();
      setAllAppointments(appts);

      // Pre-select patient if provided in props
      if (initialClientId) {
        setSelectedClientId(initialClientId);
        setIsNewPatient(false);
      } else if (initialClientName) {
        const match = liveClients.find(
          (c) => c.name.toLowerCase().trim() === initialClientName.toLowerCase().trim()
        );
        if (match) {
          setSelectedClientId(match.id);
          setIsNewPatient(false);
        } else {
          setIsNewPatient(true);
          setCustomPatientName(initialClientName);
        }
      } else if (liveClients.length > 0) {
        setSelectedClientId(liveClients[0].id);
        setIsNewPatient(false);
      }

      const pName = initialClientName || (liveClients.find((c) => c.id === initialClientId)?.name) || "Consultation";
      setSessionName(`${pName} Consultation`);

      // Link appointment
      if (initialAppointmentId) {
        setSelectedAppointmentId(String(initialAppointmentId));
      } else {
        setSelectedAppointmentId("none");
      }

      // Session / Appointment Date
      if (initialAppointmentDate) {
        setSessionDate(initialAppointmentDate.slice(0, 10));
      } else {
        setSessionDate(new Date().toISOString().slice(0, 10));
      }

      // Attendee Name / Team Member
      if (initialAttendeeName) {
        setSelectedAttendeeName(initialAttendeeName);
        const matchMem = teamMembers.find(
          (m) => m.name.toLowerCase().trim() === initialAttendeeName.toLowerCase().trim()
        );
        if (matchMem) {
          setSelectedAttendeeId(String(matchMem.id));
        } else if (initialAttendeeId) {
          setSelectedAttendeeId(String(initialAttendeeId));
        } else {
          setSelectedAttendeeId("custom-attendee");
        }
      } else if (user?.name) {
        setSelectedAttendeeName(user.name);
        const matchUser = teamMembers.find(
          (m) => m.name.toLowerCase().trim() === user.name.toLowerCase().trim()
        );
        setSelectedAttendeeId(String(matchUser?.id || teamMembers[0]?.id || "member-1"));
      } else if (teamMembers.length > 0) {
        setSelectedAttendeeId(String(teamMembers[0].id));
        setSelectedAttendeeName(teamMembers[0].name);
      }
    } else {
      clearInterval(timerRef.current);
    }
  }, [
    isOpen,
    initialClientId,
    initialClientName,
    initialAppointmentId,
    initialAppointmentDate,
    initialAttendeeId,
    initialAttendeeName,
    liveClients,
  ]);

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
    } catch { }
  };

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
    toast.info("Scribe session reset");
  };

  const handleProceedToAssign = () => {
    if (isRecording) {
      setIsPaused(true);
    }
    const resolvedName = isNewPatient
      ? customPatientName.trim() || "Patient"
      : liveClients.find((c) => c.id === selectedClientId)?.name || initialClientName || "Patient";
    if (!sessionName || sessionName.trim() === "" || sessionName === "Consultation") {
      setSessionName(`${resolvedName} Consultation`);
    }
    setStep("assign");
  };

  const scenario = PRESET_SCENARIOS[0];

  const resolvedPatientName = useMemo(() => {
    if (isNewPatient) {
      return customPatientName.trim() || "Walk-in Patient";
    }
    const found = liveClients.find((c) => c.id === selectedClientId);
    if (found) return found.name;
    return initialClientName || "Patient";
  }, [isNewPatient, customPatientName, liveClients, selectedClientId, initialClientName]);

  const currentAssignedClient = useMemo(() => {
    if (isNewPatient) return null;
    return liveClients.find((c) => c.id === selectedClientId) || null;
  }, [isNewPatient, liveClients, selectedClientId]);

  const assignedAge = currentAssignedClient?.age || (resolvedPatientName.toLowerCase().includes("sarah") ? 42 : 34);
  const assignedGender = currentAssignedClient?.gender || (
    /sarah|emily|jessica|lisa|amanda|priya|ananya|sneha|kavya|deepika|fatima|layla|charlotte|jennifer/i.test(resolvedPatientName)
      ? "Female"
      : "Male"
  );
  const attendingDoctor = selectedAttendeeName || user?.name || "Dr. Priya Sharma";

  const finalStepClinicalSummary = useMemo(() => {
    return generateClinicalSummary(
      {
        doctorName: attendingDoctor,
        extractedData: scenario.extractedData,
        patientAge: assignedAge,
        patientGender: assignedGender as any,
      },
      resolvedPatientName,
      assignedAge,
      assignedGender
    );
  }, [scenario, attendingDoctor, resolvedPatientName, assignedAge, assignedGender]);

  const handleFillFromSession = (session: ScribeSession) => {
    if (onFillWithAi) {
      onFillWithAi({
        transcriptPreview: session.transcript?.fullText?.slice(0, 320),
        diagnosis: session.extractedData?.diagnosis,
        chiefComplaint: session.extractedData?.chiefComplaint,
        extractedData: session.extractedData,
        scribeSessionId: session.id,
      });
    }
    markScribeSessionFilledWithAi(session.id);
    markActivityFilledWithAi(session.id);
    setScribeStoreTick((t) => t + 1);
    toast.success("Fields filled from AI Scribe!");
  };

  const handleSelectClient = (client: any) => {
    setSelectedClientId(client.id);
    setIsNewPatient(false);
    setIsClientDropdownOpen(false);
    if (!sessionName || sessionName.includes("Consultation")) {
      setSessionName(`${client.name} Consultation`);
    }
  };

  const handleAppointmentChange = (apptId: string) => {
    setSelectedAppointmentId(apptId);
    if (apptId !== "none") {
      const match = allAppointments.find((a) => String(a.id) === String(apptId));
      if (match) {
        if (match.date) {
          setSessionDate(match.date);
        }
        if (match.employeeName) {
          setSelectedAttendeeName(match.employeeName);
          const found = teamMembers.find(
            (m) => m.name.toLowerCase().trim() === match.employeeName?.toLowerCase().trim()
          );
          if (found) {
            setSelectedAttendeeId(String(found.id));
          }
        }
      }
    }
  };

  const handleAttendeeChange = (attendeeId: string) => {
    setSelectedAttendeeId(attendeeId);
    const found = teamMembers.find((m) => String(m.id) === String(attendeeId));
    if (found) {
      setSelectedAttendeeName(found.name);
    }
  };

  const handleConfirmSave = (fillWithAi: boolean = false) => {
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
      } else if (initialClientName) {
        patientName = initialClientName;
        patientId = initialClientId || `CL-${Date.now().toString().slice(-4)}`;
      }
    }

    const currentClient = liveClients.find((c) => c.id === patientId);
    const firstName = patientName.split(" ")[0] || patientName;
    const lastName = patientName.split(" ").slice(1).join(" ") || firstName;
    const resolvedGender = (currentClient?.gender as any) || "Female";
    const prefix = resolvedGender === "Female" ? "Ms." : "Mr.";

    // Personalize scenario transcript cleanly
    const customizedTranscript = scenario.transcriptText
      .replace(/Mr\.\s*Rajesh(\s+Kumar)?/gi, `${prefix} ${lastName}`)
      .replace(/Rajesh\s+Kumar/gi, patientName)
      .replace(/Rajesh/gi, firstName);

    const personalizedUtterances = scenario.utterances.map((u) => ({
      ...u,
      text: u.text
        .replace(/Mr\.\s*Rajesh(\s+Kumar)?/gi, `${prefix} ${lastName}`)
        .replace(/Rajesh\s+Kumar/gi, patientName)
        .replace(/Rajesh/gi, firstName),
    }));

    const doctorName = selectedAttendeeName || user?.name || "Dr. Priya Sharma";
    const doctorId = selectedAttendeeId || "member-1";
    const formattedDate = sessionDate || new Date().toISOString().slice(0, 10);
    const finalTitle = sessionName.trim() || `${patientName} Consultation`;

    const linkedApptId = selectedAppointmentId !== "none" ? selectedAppointmentId : undefined;
    const finalEntity: EntityType = linkedApptId ? "appointment" : (initialEntityType || "client");

    const newSession: ScribeSession = {
      id: `scribe-${Date.now()}`,
      clientId: patientId,
      clientName: patientName,
      title: finalTitle,
      sessionName: finalTitle,
      patientAge: assignedAge,
      patientGender: resolvedGender,
      entityType: finalEntity,
      workflow: "Clinical Consultation",
      processId: initialProcessId,
      processName: initialProcessName,
      recordId: linkedApptId || initialRecordId || `REC-${patientId}-${Date.now().toString().slice(-4)}`,
      doctorId: doctorId,
      doctorName: doctorName,
      sessionDate: sessionDate ? new Date(sessionDate).toISOString() : new Date().toISOString(),
      durationSeconds: recordingSec || 78,
      audioInputMode: audioInputMode,
      status: "completed",
      filledWithAi: fillWithAi,
      createdAt: Date.now(),
      transcript: {
        fullText: customizedTranscript,
        utterances: personalizedUtterances,
      },
      extractedData: {
        ...scenario.extractedData,
        chiefComplaint: scenario.extractedData.chiefComplaint,
        clinicalSummary: finalStepClinicalSummary,
        doctorNotes: `Attending Team Member: ${doctorName}. ${scenario.extractedData.doctorNotes || "Follow-up advised in 7 days."}`,
      },
      clinicalSummary: finalStepClinicalSummary,
    };

    saveScribeSession(newSession);
    try {
      issuePrescriptionDocument(newSession);
    } catch { }

    if (fillWithAi) {
      toast.success(`Transcript saved & fields filled with AI for ${patientName}!`);
      if (onFillWithAi) {
        onFillWithAi({
          transcriptPreview: newSession.transcript?.fullText?.slice(0, 320),
          diagnosis: newSession.extractedData?.diagnosis,
          chiefComplaint: newSession.extractedData?.chiefComplaint,
          extractedData: newSession.extractedData,
          scribeSessionId: newSession.id,
        });
      }
    } else {
      toast.success(`Transcript saved for ${patientName}!`);
    }

    onSessionCreated?.(newSession, fillWithAi);
    onClose();
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

  const clientAppointments = useMemo(() => {
    if (isNewPatient) {
      const name = customPatientName.trim().toLowerCase();
      if (!name) return [];
      return allAppointments.filter((a) => a.clientName?.toLowerCase().includes(name));
    }
    if (!selectedClientId) return [];
    const client = liveClients.find((c) => c.id === selectedClientId);
    const clientName = client?.name?.toLowerCase().trim();
    return allAppointments.filter(
      (a) =>
        (a.clientId && String(a.clientId) === String(selectedClientId)) ||
        (clientName && a.clientName?.toLowerCase().trim() === clientName)
    );
  }, [allAppointments, selectedClientId, isNewPatient, customPatientName, liveClients]);

  const selectedApptObj = allAppointments.find((a) => String(a.id) === String(selectedAppointmentId));
  const appointmentOptions = useMemo(() => {
    const list = [...clientAppointments];
    if (selectedApptObj && !list.some((a) => String(a.id) === String(selectedApptObj.id))) {
      list.unshift(selectedApptObj);
    }
    return list;
  }, [clientAppointments, selectedApptObj]);

  if (!isOpen) return null;

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
            onClick={() => setStep("list")}
            className={`p-1 rounded-lg transition-colors cursor-pointer ${
              step === "list"
                ? "text-blue-600 bg-blue-50 dark:bg-blue-950/40"
                : "text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:bg-zinc-800"
            }`}
            title="Available Scribes"
          >
            <List className="w-3.5 h-3.5" />
          </button>

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
            STEP 0: AVAILABLE SCRIBES FOR THIS CLIENT / PRACTICE
           ══════════════════════════════════════════════════════ */}
        {step === "list" && (
          <div className="flex-1 flex flex-col justify-between h-full pt-1">
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Scrollable list of cards */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 no-scrollbar max-h-[460px]">
                {displayedSessions.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 dark:text-zinc-500">
                    <FileText className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600 dark:text-zinc-400">No Scribes Available</p>
                    <p className="text-[11px] mt-0.5">Click below to record your first consultation.</p>
                  </div>
                ) : (
                  displayedSessions.map((session) => (
                    <div
                      key={session.id}
                      className="bg-white dark:bg-zinc-800/95 rounded-2xl p-3 border border-slate-200/90 dark:border-zinc-700/80 shadow-2xs space-y-2 hover:border-blue-400/50 transition-all"
                    >
                      {/* Card Top: Title, Date & Duration */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-zinc-100 truncate">
                            {session.sessionName || session.title || "Clinical Consultation"}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded">
                              {session.clientName || "Patient"}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                              {formatTimestamp(session.sessionDate || new Date(session.createdAt).toISOString())}
                            </span>
                          </div>
                        </div>
                        <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300">
                          {formatDuration(session.durationSeconds || 60)}
                        </span>
                      </div>

                      {/* Card Body: Clean Clinical Summary narrative */}
                      <div className="bg-slate-50/80 dark:bg-zinc-900/50 p-2.5 rounded-xl border border-slate-100/80 dark:border-zinc-800/80">
                        <p className="text-[11px] text-slate-600 dark:text-zinc-300 leading-relaxed line-clamp-3">
                          {session.clinicalSummary ||
                            session.extractedData?.clinicalSummary ||
                            generateClinicalSummary(
                              session,
                              session.clientName || initialClientName || selectedClient?.name
                            )}
                        </p>
                      </div>

                      {/* Card Actions: View Scribe & Fill with AI */}
                      <div className="flex items-center justify-start pt-1 gap-2 border-t border-slate-100 dark:border-zinc-700/60">
                        <button
                          type="button"
                          onClick={() => onViewTranscript?.(session)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-zinc-200 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 transition-colors cursor-pointer"
                        >
                          <FileText className="w-3 h-3 text-slate-500" />
                          <span>View Scribe</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleFillFromSession(session)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#1F2937] hover:bg-gray-800 text-white shadow-xs transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-blue-400" />
                          <span>Fill with AI</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom Add New Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setStep("record")}
                className="w-full py-2.5 px-4 bg-[#1456f0] hover:bg-[#0f46c7] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer group"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Scribe</span>
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 1: CLEAN HERO RECORDING & AMBIENT SCRIBE UI
           ══════════════════════════════════════════════════════ */}
        {step === "record" && (
          <div className="flex-1 flex flex-col justify-between h-full">
            <div className="w-full flex items-center justify-start pb-1">
              <button
                type="button"
                onClick={() => setStep("list")}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Available Scribes ({displayedSessions.length})</span>
              </button>
            </div>
            <div className="flex flex-col items-center my-auto w-full">
              {!isRecording ? (
                /* ── Idle State (Ready to Record / Upload) ── */
                <>
                  {/* Static Brand Mark Badge */}
                  <div className="w-13 h-13 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200/90 dark:border-zinc-700/80 shadow-xs flex items-center justify-center mb-2">
                    <img
                      src={symbolLogo}
                      alt="Mantra AI Scribe"
                      className="w-7 h-7 object-contain"
                    />
                  </div>

                  {/* Title & Subtext */}
                  <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight text-center">
                    AI Clinical Scribe
                  </h2>
                  <p className="text-slate-500 dark:text-zinc-400 text-xs text-center mt-0.5 mb-3.5">
                    Ambient voice intelligence for consultations
                  </p>

                  {/* Mode Pill Switcher (Placed immediately after Title & Subtext) */}
                  <div className="flex items-center bg-white dark:bg-zinc-800/90 p-0.5 rounded-xl border border-slate-200/90 dark:border-zinc-700/80 mb-5 w-full max-w-[240px] shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setAudioInputMode("live")}
                      className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${audioInputMode === "live"
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
                      className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${audioInputMode === "upload"
                        ? "bg-[#1456f0] text-white shadow-xs"
                        : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                        }`}
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      Upload Audio
                    </button>
                  </div>

                  {/* Mode Body */}
                  {audioInputMode === "live" ? (
                    <div className="flex flex-col items-center justify-center my-auto py-2">
                      <button
                        type="button"
                        onClick={handleToggleRecording}
                        className="w-24 h-24 rounded-full bg-white dark:bg-zinc-800 border border-slate-200/90 dark:border-zinc-700/80 shadow-[0_10px_35px_rgba(20,86,240,0.14)] flex items-center justify-center group hover:scale-105 active:scale-95 transition-all cursor-pointer mb-3"
                        title="Click to start ambient recording"
                      >
                        <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#1456f0] dark:text-blue-400 flex items-center justify-center group-hover:bg-[#1456f0] group-hover:text-white transition-colors">
                          <Mic className="w-7 h-7" />
                        </div>
                      </button>
                      <p className="text-xs font-semibold text-slate-700 dark:text-zinc-200 text-center">
                        Click to start ambient recording
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-zinc-500 text-center mt-0.5">
                        Microphone is ready for physician-patient dialogue
                      </p>
                    </div>
                  ) : (
                    /* Audio File Upload Box */
                    <div className="w-full my-auto px-2">
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
                        className="w-full bg-white dark:bg-zinc-800/95 rounded-2xl p-6 border-2 border-dashed border-slate-200 dark:border-zinc-700 hover:border-blue-500 cursor-pointer transition-all text-center shadow-2xs"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center mx-auto mb-2">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-bold text-slate-800 dark:text-zinc-100">
                          {uploadedFile ? uploadedFile.name : "Select or Drop Audio File"}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                          Supports MP3, WAV, M4A recorded consultations
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* ── Active Recording State: Hero Audio Visualizer & Waveform ── */
                <div className="flex flex-col items-center w-full my-auto py-3">
                  {/* Live Pulsing Microphone Centerpiece */}
                  <div className="relative mb-3 flex items-center justify-center">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isPaused
                      ? "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
                      : "bg-blue-600 text-white shadow-[0_0_30px_rgba(20,86,240,0.4)] animate-pulse"
                      }`}>
                      <Mic className="w-9 h-9" />
                    </div>
                    {!isPaused && (
                      <div className="absolute inset-0 rounded-full border-2 border-blue-400/50 animate-ping pointer-events-none" />
                    )}
                  </div>

                  {/* Large Live Timer */}
                  <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100 font-mono">
                    {formatTime(recordingSec)}
                  </div>

                  {/* Status Badge */}
                  <div className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-2xs">
                    <span className={`h-2 w-2 rounded-full ${isPaused ? "bg-amber-500" : "bg-emerald-500 animate-ping"}`} />
                    <span className="text-slate-700 dark:text-zinc-300">
                      {isPaused ? "Recording Paused" : "Listening to Consultation..."}
                    </span>
                  </div>

                  {/* Smooth Sound Waveform Visualizer */}
                  <div className="w-full bg-white dark:bg-zinc-800/95 rounded-2xl p-4 border border-slate-200/90 dark:border-zinc-700/80 shadow-2xs mt-5">
                    <div className="h-10 flex items-center justify-center gap-1.5 overflow-hidden">
                      {[14, 28, 18, 36, 22, 38, 16, 32, 42, 20, 36, 26, 40, 18, 30, 22, 34, 16].map(
                        (h, i) => (
                          <div
                            key={i}
                            style={{
                              height: isPaused ? "6px" : `${Math.max(6, (h * ((i % 4) + 1)) % 38)}px`,
                              transition: "height 180ms ease-in-out",
                            }}
                            className={`w-1 rounded-full ${isPaused
                              ? "bg-slate-300 dark:bg-zinc-700"
                              : "bg-gradient-to-t from-blue-600 to-indigo-400"
                              }`}
                          />
                        )
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 dark:text-zinc-500 text-center mt-2 font-medium">
                      Speech is encrypted & processed in compliance with HIPAA
                    </p>
                  </div>

                  {/* Inline Pause/Resume & Stop Controls */}
                  <div className="flex items-center justify-center gap-3 mt-4">
                    <button
                      type="button"
                      onClick={handleToggleRecording}
                      className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      {isPaused ? (
                        <>
                          <Play className="w-3.5 h-3.5 text-emerald-600" />
                          Resume
                        </>
                      ) : (
                        <>
                          <Pause className="w-3.5 h-3.5 text-amber-600" />
                          Pause
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-500 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Restart recording"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restart
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Primary Action Bar */}
            <div className="pt-2">
              {!isRecording && audioInputMode === "live" ? (
                <button
                  type="button"
                  onClick={handleToggleRecording}
                  className="w-full py-2.5 px-4 bg-[#1456f0] hover:bg-[#0f46c7] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer group"
                >
                  <Mic className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span>Start Ambient Recording</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleProceedToAssign}
                  className="w-full py-2.5 px-4 bg-[#1456f0] hover:bg-[#0f46c7] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer group"
                >
                  <span>Finish & Save Consultation</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 2: ON SAVING — NAME & SUMMARY OF THE SCRIBE
           ══════════════════════════════════════════════════════ */}
        {step === "assign" && (
          <div className="flex-1 flex flex-col justify-between h-full">
            <div className="space-y-2.5 overflow-y-auto max-h-[440px] pr-1 no-scrollbar">
              {/* Back to Recording Bar */}
              <div className="flex items-center justify-between pb-0.5">
                <button
                  type="button"
                  onClick={() => setStep("record")}
                  className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Recording
                </button>
                <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500">
                  Step 2 of 2
                </span>
              </div>

              {/* 1. Contact Selection Card */}
              <div className="bg-white dark:bg-zinc-800/95 rounded-2xl p-3 border border-slate-200/90 dark:border-zinc-700/80 shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    Contact
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewPatient(!isNewPatient);
                      if (!isNewPatient) {
                        setCustomPatientName("");
                      }
                    }}
                    className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
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
                      placeholder="Type contact full name..."
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                ) : (
                  <div className="relative" ref={clientDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 font-medium cursor-pointer"
                    >
                      <span className="truncate">
                        {selectedClient ? selectedClient.name : initialClientName || "Select contact..."}
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
                              placeholder="Search contact..."
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
                              className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${selectedClientId === c.id
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
              </div>

              {/* 2. Scribe Title Input Card (Optional) */}
              <div className="bg-white dark:bg-zinc-800/95 rounded-2xl p-3 border border-slate-200/90 dark:border-zinc-700/80 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    Scribe Title
                  </label>
                  <span className="text-[10px] font-medium text-slate-400 dark:text-zinc-500 lowercase">
                    (optional)
                  </span>
                </div>
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder={`e.g. ${resolvedPatientName} Consultation (optional)`}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>

              {/* 3. Summary of the Scribe Card */}
              <div className="bg-white dark:bg-zinc-800/95 rounded-2xl p-3 border border-slate-200/90 dark:border-zinc-700/80 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Summary of the Scribe
                  </label>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                    AI Extracted
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-zinc-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                  <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed font-normal">
                    {finalStepClinicalSummary}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Two Save Buttons */}
            <div className="pt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleConfirmSave(false)}
                className="w-full py-2.5 px-3 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border border-slate-300 dark:border-zinc-600 rounded-xl text-xs font-semibold shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Save transcript</span>
              </button>

              <button
                type="button"
                onClick={() => handleConfirmSave(true)}
                className="w-full py-2.5 px-3 bg-[#1456f0] hover:bg-[#0f46c7] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                <span>Save and fill with AI</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
