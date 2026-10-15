import { useState, useEffect, useRef, useMemo } from "react";
import {
  Mic,
  Square,
  Play,
  Pause,
  UploadCloud,
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
  Calendar,
  Receipt,
  ShieldCheck,
  FileCheck,
  GitBranch,
  Hash,
  Layers,
  Tag,
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
import { useClients } from "../../../lib/clientsStore";
import { useProcessStore, Process, EntityType } from "../../../lib/useProcessStore";
import { appointmentService } from "../../../lib/appointmentService";
import { invoiceService } from "../../../lib/invoiceService";
import { getStoredClaims } from "../../../lib/claimsStore";
import { getStoredCallLogs } from "../../../lib/processLogsStore";

export interface NewConsultationDrawerProps {
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

export interface ScribeEntityOption {
  id: EntityType;
  label: string;
  description: string;
  prefix: string;
  icon: any;
}

export const SCRIBE_ENTITIES: ScribeEntityOption[] = [
  { id: "client", label: "Client / Patient", description: "Client care journeys & lead workflows", prefix: "REC", icon: User },
  { id: "appointment", label: "Appointment", description: "Clinical consultations & visits", prefix: "APT", icon: Calendar },
  { id: "invoice", label: "Invoice", description: "Billing, services & payment lifecycle", prefix: "INV", icon: Receipt },
  { id: "insurance", label: "Insurance", description: "Payer policies & eligibility verification", prefix: "INS", icon: ShieldCheck },
  { id: "claim", label: "Claim", description: "Insurance claim filing & adjudication", prefix: "CLM", icon: FileCheck },
];

export default function NewConsultationDrawer({
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
  zIndex = 650,
}: NewConsultationDrawerProps) {
  // Live reactive client store (matches Clients.tsx and reflects newly created clients instantly)
  const { clients: liveClients } = useClients();

  // Live reactive process store
  const { processes: liveProcesses } = useProcessStore();

  // Client selection state
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [customClientName, setCustomClientName] = useState("");

  // Entity selection state (Choose Entity)
  const [selectedEntityId, setSelectedEntityId] = useState<EntityType>("client");
  const [isEntityDropdownOpen, setIsEntityDropdownOpen] = useState(false);

  // Process selection state (Choose Process mapped to chosen entity & client)
  const [selectedProcessId, setSelectedProcessId] = useState<string>("");
  const [isProcessDropdownOpen, setIsProcessDropdownOpen] = useState(false);

  // Record / Process ID state
  const [recordId, setRecordId] = useState<string>("");

  // Title selection state based on chosen entity (identity)
  const [selectedTitle, setSelectedTitle] = useState<string>("");
  const [isTitleDropdownOpen, setIsTitleDropdownOpen] = useState(false);

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
  const entityDropdownRef = useRef<HTMLDivElement>(null);
  const processDropdownRef = useRef<HTMLDivElement>(null);
  const titleDropdownRef = useRef<HTMLDivElement>(null);

  const getSelectedClient = () => {
    if (selectedClientId === "custom") {
      return {
        id: `WALK-${Date.now().toString().slice(-4)}`,
        name: customClientName.trim() || "Walk-in Patient",
        age: 45,
        gender: "Male",
        phone: "",
        email: "",
        processes: [] as string[],
      };
    }
    const match = liveClients.find((c) => c.id === selectedClientId);
    if (match) return match;
    if (liveClients.length > 0) return liveClients[0];
    return { id: "CL-001", name: "Sarah Johnson", age: 42, gender: "Female", phone: "", email: "", processes: [] as string[] };
  };

  const selectedClient = getSelectedClient();
  const clientProcessesList: string[] = Array.isArray(selectedClient.processes)
    ? selectedClient.processes
    : [];

  // Processes filtered for the chosen Entity
  const entityProcesses = liveProcesses.filter((p) => {
    const pEntity = p.entityType || "client";
    return pEntity === selectedEntityId;
  });

  // Check if a process is enrolled for the currently selected client
  const isProcessEnrolledForClient = (proc?: Process | null) => {
    if (!proc) return false;
    return clientProcessesList.some(
      (cp) =>
        cp.toLowerCase().trim() === (proc.name || "").toLowerCase().trim() ||
        cp.toLowerCase().trim() === (proc.id || "").toLowerCase().trim()
    );
  };

  // Sort entity processes so enrolled processes are at the top
  const sortedEntityProcesses = [...entityProcesses].sort((a, b) => {
    const aEnrolled = isProcessEnrolledForClient(a) ? 1 : 0;
    const bEnrolled = isProcessEnrolledForClient(b) ? 1 : 0;
    return bEnrolled - aEnrolled;
  });

  const selectedEntity =
    SCRIBE_ENTITIES.find((e) => e.id === selectedEntityId) || SCRIBE_ENTITIES[0];

  const selectedProcess: Process =
  entityProcesses.find((p) => p.id === selectedProcessId) ||
  sortedEntityProcesses[0] ||
  liveProcesses[0] ||
  ({ id: "default", name: "Default Process", entityType: "client", stages: [] } as any);

  // Title options computed dynamically based on selected identity/entity & client formula: {client_name}_{Entity}_{created_on_date}
  const titleOptions = useMemo(() => {
    const client = getSelectedClient();
    const clientName = client.name || "Client";
    const today = new Date().toISOString().slice(0, 10);
    const options: { id: string; title: string; subtitle: string; isNew?: boolean }[] = [];

    if (selectedEntityId === "appointment") {
      try {
        const apts = appointmentService.getAppointments();
        const clientApts = apts.filter(
          (a) =>
            (a as any).clientId === client.id ||
            (a.clientName && a.clientName.toLowerCase().trim() === clientName.toLowerCase().trim())
        );
        clientApts.forEach((apt) => {
          const d = apt.date || (apt.createdAt ? apt.createdAt.slice(0, 10) : today);
          const t = `${apt.clientName || clientName}_Appointment_${d}`;
          options.push({
            id: String(apt.id).startsWith("APT-") ? String(apt.id) : `APT-${apt.id}`,
            title: t,
            subtitle: `Apt #${apt.id} • ${apt.time || "Scheduled"} • ${apt.statusLabel || apt.status || ""}`,
          });
        });
      } catch {}
      const newTitle = `${clientName}_Appointment_${today}`;
      if (!options.some((o) => o.title === newTitle)) {
        options.unshift({
          id: `APT-${client.id || "001"}-${Date.now().toString().slice(-4)}`,
          title: newTitle,
          subtitle: `Auto-generated • Today's Appointment`,
          isNew: true,
        });
      }
    } else if (selectedEntityId === "invoice") {
      try {
        const invs = invoiceService.getInvoices();
        const clientInvs = invs.filter(
          (inv) =>
            inv.clientId === client.id ||
            (inv.clientName && inv.clientName.toLowerCase().trim() === clientName.toLowerCase().trim())
        );
        clientInvs.forEach((inv) => {
          const d = inv.issueDate || today;
          const t = `${inv.clientName || clientName}_Invoice_${d}`;
          options.push({
            id: inv.id,
            title: t,
            subtitle: `${inv.invoiceNumber || inv.id} • $${inv.total || 0} • ${inv.status || "Pending"}`,
          });
        });
      } catch {}
      const newTitle = `${clientName}_Invoice_${today}`;
      if (!options.some((o) => o.title === newTitle)) {
        options.unshift({
          id: `INV-${client.id || "001"}-${Date.now().toString().slice(-4)}`,
          title: newTitle,
          subtitle: `Auto-generated • Today's Invoice`,
          isNew: true,
        });
      }
    } else if (selectedEntityId === "claim") {
      try {
        const claims = getStoredClaims();
        const clientClaims = claims.filter(
          (c) =>
            c.patientId === client.id ||
            (c.patientName && c.patientName.toLowerCase().trim() === clientName.toLowerCase().trim())
        );
        clientClaims.forEach((c) => {
          const d = c.serviceDate || (c.createdAt ? c.createdAt.slice(0, 10) : today);
          const t = `${c.patientName || clientName}_Claim_${d}`;
          options.push({
            id: c.claimNumber || c.id,
            title: t,
            subtitle: `${c.claimNumber} • ${c.payer?.name || "Insurance Payer"}`,
          });
        });
      } catch {}
      const newTitle = `${clientName}_Claim_${today}`;
      if (!options.some((o) => o.title === newTitle)) {
        options.unshift({
          id: `CLM-${client.id || "001"}-${Date.now().toString().slice(-4)}`,
          title: newTitle,
          subtitle: `Auto-generated • Today's Claim`,
          isNew: true,
        });
      }
    } else if (selectedEntityId === "insurance") {
      const newTitle = `${clientName}_Insurance_${today}`;
      options.push({
        id: `INS-${client.id || "001"}-${Date.now().toString().slice(-4)}`,
        title: newTitle,
        subtitle: `Policy & Eligibility Coverage • ${today}`,
        isNew: true,
      });
    } else {
      // client / process
      try {
        const logs = getStoredCallLogs();
        const clientLogs = logs.filter(
          (l) =>
            l.clientId === client.id ||
            (l.client && l.client.toLowerCase().trim() === clientName.toLowerCase().trim())
        );
        clientLogs.forEach((l) => {
          const d = l.date ? l.date.slice(0, 10) : today;
          const t = `${l.client || clientName}_Process_${d}`;
          options.push({
            id: l.id,
            title: t,
            subtitle: `${l.process} • Stage: ${l.currentStage}`,
          });
        });
      } catch {}
      const newTitle = `${clientName}_Process_${today}`;
      if (!options.some((o) => o.title === newTitle)) {
        options.unshift({
          id: `PRC-${client.id || "001"}-${Date.now().toString().slice(-4)}`,
          title: newTitle,
          subtitle: `Auto-generated • ${selectedProcess?.name || "Process Journey"}`,
          isNew: true,
        });
      }
    }

    return options;
  }, [selectedEntityId, selectedClientId, customClientName, liveClients, selectedProcess]);

  const handleSelectTitle = (opt: { id: string; title: string }) => {
    setSelectedTitle(opt.title);
    setRecordId(opt.id);
    setIsTitleDropdownOpen(false);
  };

  // Sync title and recordId whenever titleOptions changes
  useEffect(() => {
    if (titleOptions.length > 0) {
      const match = titleOptions.find((o) => o.title === selectedTitle);
      if (!match) {
        setSelectedTitle(titleOptions[0].title);
        setRecordId(titleOptions[0].id);
      }
    }
  }, [titleOptions, selectedTitle]);

  // Initialize or reset on open/close
  useEffect(() => {
    if (isOpen) {
      // 1. Client prefill / fallback
      let targetCid = initialClientId;
      if (initialClientId) {
        const match = liveClients.find((c) => c.id === initialClientId || String(c.id) === String(initialClientId));
        if (match) {
          targetCid = match.id;
          setSelectedClientId(match.id);
        } else if (initialClientName) {
          targetCid = "custom";
          setSelectedClientId("custom");
          setCustomClientName(initialClientName);
        } else {
          setSelectedClientId(initialClientId);
        }
      } else if (initialClientName) {
        const match = liveClients.find((c) => (c.name || "").toLowerCase().trim() === initialClientName.toLowerCase().trim());
        if (match) {
          targetCid = match.id;
          setSelectedClientId(match.id);
        } else {
          targetCid = "custom";
          setSelectedClientId("custom");
          setCustomClientName(initialClientName);
        }
      } else if (liveClients.length > 0 && (!selectedClientId || !liveClients.some((c) => c.id === selectedClientId))) {
        targetCid = liveClients[0].id;
        setSelectedClientId(targetCid);
      } else {
        targetCid = selectedClientId;
      }

      // 2. Entity prefill / mapping
      let targetEntity: EntityType = initialEntityType || "client";
      if (!initialEntityType && (initialProcessId || initialProcessName)) {
        const pMatch = liveProcesses.find((p) => p.id === initialProcessId || p.name === initialProcessName);
        if (pMatch && pMatch.entityType) {
          targetEntity = pMatch.entityType;
        }
      }
      setSelectedEntityId(targetEntity);

      // 3. Process prefill / mapping based on chosen entity & client enrollment
      const procsForEntity = liveProcesses.filter((p) => (p.entityType || "client") === targetEntity);
      let targetProcId = initialProcessId;
      if (!targetProcId && initialProcessName) {
        const pMatch = procsForEntity.find((p) => p.name.toLowerCase() === initialProcessName.toLowerCase()) ||
          liveProcesses.find((p) => p.name.toLowerCase() === initialProcessName.toLowerCase());
        if (pMatch) targetProcId = pMatch.id;
      }

      if (!targetProcId) {
        const clientObj = liveClients.find((c) => c.id === targetCid);
        const cProcs = clientObj?.processes || [];
        const enrolled = procsForEntity.find((p) =>
          cProcs.some(
            (cp) =>
              cp.toLowerCase().trim() === (p.name || "").toLowerCase().trim() ||
              cp.toLowerCase().trim() === (p.id || "").toLowerCase().trim()
          )
        );
        if (enrolled) {
          targetProcId = enrolled.id;
        } else if (procsForEntity.length > 0) {
          targetProcId = procsForEntity[0].id;
        }
      }

      if (targetProcId) {
        setSelectedProcessId(targetProcId);
      } else if (procsForEntity.length > 0) {
        setSelectedProcessId(procsForEntity[0].id);
      }

      // 4. Record ID prefill / calculation
      if (initialRecordId) {
        setRecordId(initialRecordId);
      } else {
        const entOption = SCRIBE_ENTITIES.find((e) => e.id === targetEntity) || SCRIBE_ENTITIES[0];
        const cid = targetCid || "CL";
        setRecordId(`${entOption.prefix}-${cid}-${Date.now().toString().slice(-4)}`);
      }
    } else {
      setIsRecording(false);
      setIsPaused(false);
      setRecordingSec(0);
      setIsProcessing(false);
      setGeneratedSession(null);
      setIsClientDropdownOpen(false);
      setIsEntityDropdownOpen(false);
      setIsProcessDropdownOpen(false);
      setIsTitleDropdownOpen(false);
      setUploadedFile(null);
      setClientSearchQuery("");
      setAudioInputMode("live");
    }
  }, [
    isOpen,
    liveClients,
    liveProcesses,
    initialClientId,
    initialClientName,
    initialEntityType,
    initialProcessId,
    initialProcessName,
    initialRecordId,
  ]);

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
        entityDropdownRef.current &&
        !entityDropdownRef.current.contains(e.target as HTMLElement)
      ) {
        setIsEntityDropdownOpen(false);
      }
      if (
        processDropdownRef.current &&
        !processDropdownRef.current.contains(e.target as HTMLElement)
      ) {
        setIsProcessDropdownOpen(false);
      }
      if (
        titleDropdownRef.current &&
        !titleDropdownRef.current.contains(e.target as HTMLElement)
      ) {
        setIsTitleDropdownOpen(false);
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

  const filteredClients = liveClients.filter((c) => {
    const q = clientSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.name || "").toLowerCase().includes(q) ||
      (c.id || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q)
    );
  });

  const handleSelectEntity = (entityId: EntityType) => {
    setSelectedEntityId(entityId);
    setIsEntityDropdownOpen(false);

    const entOption = SCRIBE_ENTITIES.find((e) => e.id === entityId) || SCRIBE_ENTITIES[0];
    const cid = selectedClientId === "custom" ? "WALK" : selectedClientId || "CL";
    setRecordId(`${entOption.prefix}-${cid}-${Date.now().toString().slice(-4)}`);

    // Map to enrolled process of that entity if client is enrolled!
    const procsForEntity = liveProcesses.filter((p) => (p.entityType || "client") === entityId);
    const enrolledProc = procsForEntity.find((p) =>
      clientProcessesList.some(
        (cp) =>
          cp.toLowerCase().trim() === (p.name || "").toLowerCase().trim() ||
          cp.toLowerCase().trim() === (p.id || "").toLowerCase().trim()
      )
    );
    if (enrolledProc) {
      setSelectedProcessId(enrolledProc.id);
    } else if (procsForEntity.length > 0) {
      setSelectedProcessId(procsForEntity[0].id);
    }
  };

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    setIsClientDropdownOpen(false);

    const entOption = SCRIBE_ENTITIES.find((e) => e.id === selectedEntityId) || SCRIBE_ENTITIES[0];
    if (clientId === "custom") {
      setRecordId(`${entOption.prefix}-WALK-${Date.now().toString().slice(-4)}`);
    } else {
      const c = liveClients.find((cl) => cl.id === clientId);
      if (c) {
        setRecordId(`${entOption.prefix}-${c.id}-${Date.now().toString().slice(-4)}`);
        const cProcs = c.processes || [];

        // Check if client is enrolled in a process for the current entity
        const procsForCurrentEntity = liveProcesses.filter(
          (p) => (p.entityType || "client") === selectedEntityId
        );
        const enrolledCurrent = procsForCurrentEntity.find((p) =>
          cProcs.some(
            (cp) =>
              cp.toLowerCase().trim() === (p.name || "").toLowerCase().trim() ||
              cp.toLowerCase().trim() === (p.id || "").toLowerCase().trim()
          )
        );

        if (enrolledCurrent) {
          setSelectedProcessId(enrolledCurrent.id);
        } else if (cProcs.length > 0) {
          // If not enrolled in current entity but enrolled in another entity's process, map to that!
          const matchAny = liveProcesses.find((p) =>
            cProcs.some((cp) => cp.toLowerCase().trim() === (p.name || "").toLowerCase().trim())
          );
          if (matchAny) {
            setSelectedEntityId((matchAny.entityType || "client") as EntityType);
            setSelectedProcessId(matchAny.id);
            const newEnt = SCRIBE_ENTITIES.find((e) => e.id === matchAny.entityType) || SCRIBE_ENTITIES[0];
            setRecordId(`${newEnt.prefix}-${c.id}-${Date.now().toString().slice(-4)}`);
          }
        }
      }
    }
  };

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
    const finalRecordId = recordId.trim() || `REC-${client.id}-${Date.now().toString().slice(-4)}`;

    const firstName = client.name.split(" ")[0] || client.name;
    const lastName = client.name.split(" ").slice(1).join(" ") || firstName;
    const prefix = client.gender === "Female" ? "Ms." : "Mr.";
    const personalizedText = scenario.transcriptText
      .replace(/Mr\.\s*Rajesh(\s+Kumar)?/gi, `${prefix} ${lastName}`)
      .replace(/Rajesh\s+Kumar/gi, client.name)
      .replace(/Rajesh/gi, firstName);

    const personalizedUtterances = scenario.utterances.map((u) => ({
      ...u,
      text: u.text
        .replace(/Mr\.\s*Rajesh(\s+Kumar)?/gi, `${prefix} ${lastName}`)
        .replace(/Rajesh\s+Kumar/gi, client.name)
        .replace(/Rajesh/gi, firstName),
    }));

    const finalTitle =
      selectedTitle.trim() ||
      `${client.name}_${selectedEntity.label}_${new Date().toISOString().slice(0, 10)}`;

    const session: ScribeSession = {
      id: `scribe-${Date.now()}`,
      clientId: client.id,
      clientName: client.name,
      title: finalTitle,
      patientAge: client.age || 45,
      patientGender: client.gender || "Female",
      entityType: selectedEntityId,
      workflow: selectedEntity.label,
      processId: selectedProcess?.id,
      processName: selectedProcess?.name,
      recordId: finalRecordId,
      sessionName: `${selectedEntity.label} • ${selectedProcess?.name || client.name}`,
      doctorId: doctor.id,
      doctorName: doctor.name,
      sessionDate: new Date().toISOString(),
      durationSeconds: recordingSec || 76,
      audioInputMode: audioInputMode,
      transcript: {
        fullText: personalizedText,
        utterances: personalizedUtterances,
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
      title="Add New Scribe"
      subtitle=""
      icon={<Mic className="w-5 h-5 text-[#2c3e50]" />}
      width="max-w-2xl"
      zIndex={zIndex}
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

        {/* Setup Form (Client, Workflow, Process, and Record ID) */}
        {!isProcessing && (
          <div className="space-y-4">
            {/* 1. Client / Patient Searchable Dropdown */}
            <div className="relative" ref={clientDropdownRef}>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  className="block text-xs font-semibold text-foreground"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Select Client / Patient <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {liveClients.length} clients registered
                </span>
              </div>

              <button
                type="button"
                disabled={isRecording || !!generatedSession}
                onClick={() => {
                  if (!isRecording && !generatedSession) {
                    setIsClientDropdownOpen(!isClientDropdownOpen);
                    setIsEntityDropdownOpen(false);
                    setIsProcessDropdownOpen(false);
                  }
                }}
                className={`w-full h-11 px-3.5 bg-white border rounded-xl text-left flex items-center justify-between text-xs font-medium text-foreground transition-all shadow-2xs ${
                  isRecording || !!generatedSession
                    ? "opacity-75 cursor-not-allowed border-border"
                    : "hover:border-[#181e25] border-border"
                }`}
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-600">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-semibold text-foreground truncate">
                      {selectedClientId === "custom"
                        ? customClientName || "+ Add / Enter Walk-in Patient"
                        : getSelectedClient().name}
                    </span>
                    {selectedClientId !== "custom" && getSelectedClient().id && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        {getSelectedClient().id}
                      </span>
                    )}
                  </div>
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
                        placeholder="Search client by name, ID, phone..."
                        value={clientSearchQuery}
                        onChange={(e) => setClientSearchQuery(e.target.value)}
                        autoFocus
                        className="w-full h-8 pl-8 pr-2 text-xs bg-white border border-border rounded-lg outline-none focus:border-[#181e25]"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      />
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto py-1 divide-y divide-slate-100">
                    {filteredClients.length === 0 ? (
                      <div className="px-3 py-4 text-center text-muted-foreground text-xs">
                        No clients matching "{clientSearchQuery}"
                      </div>
                    ) : (
                      filteredClients.map((client) => {
                        const isSelected = selectedClientId === client.id;
                        return (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => handleSelectClient(client.id)}
                            className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between transition-colors ${
                              isSelected ? "bg-slate-100/80 text-[#181e25] font-semibold" : "hover:bg-slate-50 text-foreground"
                            }`}
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          >
                            <div className="flex flex-col gap-0.5 truncate pr-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">{client.name}</span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                  {client.id}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                {client.phone && <span>{client.phone}</span>}
                                {client.email && <span>• {client.email}</span>}
                              </div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-[#181e25] flex-shrink-0" />}
                          </button>
                        );
                      })
                    )}

                    <div className="p-1.5 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClientId("custom");
                          setIsClientDropdownOpen(false);
                          setRecordId(`REC-WALK-${Date.now().toString().slice(-4)}`);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors ${
                          selectedClientId === "custom"
                            ? "bg-slate-200/70 text-[#181e25]"
                            : "text-[#181e25] hover:bg-slate-200/50"
                        }`}
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        <Plus className="w-3.5 h-3.5" /> + Add / Enter Walk-in Patient
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
                  Enter Patient Full Name <span className="text-red-500">*</span>
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

            {/* 2. Entity & Process / Record ID (2 Columns in same row) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Choose Entity */}
              <div className="relative" ref={entityDropdownRef}>
                <label
                  className="block text-xs font-semibold text-foreground mb-1.5"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Choose Entity <span className="text-red-500">*</span>
                </label>

                <button
                  type="button"
                  disabled={isRecording || !!generatedSession}
                  onClick={() => {
                    if (!isRecording && !generatedSession) {
                      setIsEntityDropdownOpen(!isEntityDropdownOpen);
                      setIsClientDropdownOpen(false);
                      setIsProcessDropdownOpen(false);
                    }
                  }}
                  className={`w-full h-11 px-3 bg-white border rounded-xl text-left flex items-center justify-between text-xs font-medium text-foreground transition-all shadow-2xs ${
                    isRecording || !!generatedSession
                      ? "opacity-75 cursor-not-allowed border-border"
                      : "hover:border-[#181e25] border-border"
                  }`}
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <div className="flex items-center gap-2 truncate">
                    {(() => {
                      const IconComp = selectedEntity.icon || Layers;
                      return <IconComp className="w-4 h-4 text-slate-600 flex-shrink-0" />;
                    })()}
                    <span className="truncate font-semibold">{selectedEntity.label}</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                      isEntityDropdownOpen ? "rotate-180 text-[#181e25]" : ""
                    }`}
                  />
                </button>

                {isEntityDropdownOpen && (
                  <div
                    className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-border rounded-xl shadow-xl z-50 overflow-hidden py-1 max-h-56 overflow-y-auto"
                    style={{ boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
                  >
                    {SCRIBE_ENTITIES.map((ent) => {
                      const isSelected = selectedEntityId === ent.id;
                      const IconComp = ent.icon;
                      return (
                        <button
                          key={ent.id}
                          type="button"
                          onClick={() => handleSelectEntity(ent.id)}
                          className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors ${
                            isSelected ? "bg-slate-100 text-[#181e25] font-semibold" : "hover:bg-slate-50 text-foreground"
                          }`}
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <IconComp className="w-4 h-4 text-slate-500 flex-shrink-0" />
                            <div className="truncate">
                              <div className="truncate font-medium">{ent.label}</div>
                              <div className="text-[10px] text-muted-foreground truncate">{ent.description}</div>
                            </div>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#181e25] flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Select Title Dropdown (based on Identity / Entity) */}
              <div className="relative" ref={titleDropdownRef}>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    className="block text-xs font-semibold text-foreground"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Select Title ({selectedEntity.label}) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Identity: {selectedEntity.label}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsTitleDropdownOpen(!isTitleDropdownOpen)}
                  className="w-full h-11 px-3 bg-white border border-border hover:border-slate-400 rounded-xl text-left flex items-center justify-between transition-colors shadow-2xs cursor-pointer"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <Tag className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <div className="truncate">
                      <div className="text-xs font-semibold text-foreground truncate">
                        {selectedTitle || titleOptions[0]?.title || `${selectedClient.name}_${selectedEntity.label}_${new Date().toISOString().slice(0, 10)}`}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate">
                        {recordId ? `#${recordId}` : "Identity record"}
                      </div>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isTitleDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {isTitleDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto py-1 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-muted-foreground bg-slate-50 tracking-wider flex items-center justify-between">
                      <span>Available Titles ({titleOptions.length})</span>
                      <span className="text-[9px] font-mono lowercase">{selectedEntity.label}</span>
                    </div>
                    {titleOptions.map((opt) => {
                      const isSelected = selectedTitle === opt.title;
                      return (
                        <button
                          key={opt.id + opt.title}
                          type="button"
                          onClick={() => handleSelectTitle(opt)}
                          className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors ${
                            isSelected ? "bg-slate-100 text-[#181e25] font-semibold" : "hover:bg-slate-50 text-foreground"
                          }`}
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          <div className="truncate pr-2">
                            <div className="font-semibold text-xs text-foreground truncate flex items-center gap-1.5">
                              <span>{opt.title}</span>
                              {opt.isNew && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                  Auto
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate font-mono mt-0.5">
                              {opt.subtitle}
                            </div>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#181e25] flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
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
