import React, { useState, useEffect, useMemo } from "react";
import { useOutletContext, useNavigate, Link } from "react-router";
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  FileText,
  ClipboardList,
  CreditCard,
  QrCode,
  MapPin,
  Sparkles,
  ArrowRight,
  Plus,
  Stethoscope,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  Activity,
  Receipt,
  Building2,
  Info,
  Pill,
  Check,
  RotateCcw,
  Bot,
} from "lucide-react";
import { Client, getStoredClients, CLIENTS_STORE_EVENT } from "../../../lib/clientsStore";
import { appointmentService, Appointment } from "../../../lib/appointmentService";
import { invoiceService } from "../../../lib/invoiceService";
import { ClientInvoice } from "../../types/invoiceTypes";
import {
  getStoredProcesses,
  Process,
  Stage,
  isStageEnabledForPortal,
  isProcessConnectedToPortal,
  PROCESS_STORE_EVENT,
} from "../../../lib/useProcessStore";
import { getStoredCallLogs, PROCESS_LOGS_STORE_EVENT } from "../../../lib/processLogsStore";
import { useOrganization } from "../../context/OrganizationContext";
import { findRoomForAppointment } from "../../../lib/roomsStore";
import StageTrack, { StageStep } from "./components/StageTrack";
import MiniStageStepper from "./components/MiniStageStepper";
import ActionCard from "./components/ActionCard";
import QuietList, { QuietRow } from "./components/QuietList";
import StageContentDrawer from "./components/StageContentDrawer";
import { toast } from "sonner";

interface PortalContext {
  activeClient: Client;
  activeProcess?: Process;
  currentStageName?: string;
  currentStageIndex?: number;
  stages?: Stage[];
}

interface AssignedProcessState {
  process: Process;
  currentStageName: string;
  currentStageIndex: number;
  currentStageObj: Stage;
  stageSteps: StageStep[];
  progressPercent: number;
  isCompleted: boolean;
  lastUpdatedTimestamp: number;
}

export default function PatientStatusScreen() {
  const navigate = useNavigate();
  const context = useOutletContext<PortalContext>();
  const activeClient = context?.activeClient;

  // Re-sync trigger for live store changes (staff dashboard, process assignment, stage updates)
  const [storeTick, setStoreTick] = useState(0);

  // Active Primary Process ID (defaults to latest updated process, user can switch from "Other pipelines")
  const [userSelectedProcessId, setUserSelectedProcessId] = useState<string | null>(null);

  // Map of processId -> selected preview stage index (defaults to that process's live stage)
  const [selectedStageIndexMap, setSelectedStageIndexMap] = useState<Record<string, number>>({});

  // Collapsible dropdown state for secondary active/planned pipelines
  const [isOtherPipelinesOpen, setIsOtherPipelinesOpen] = useState(false);



  // Real Appointments & Invoices from shared services
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [drawerTarget, setDrawerTarget] = useState<{ stage: Stage; processName: string } | null>(null);

  // Consent signed state (saved per patient in localStorage)
  const [consentSigned, setConsentSigned] = useState<boolean>(() => {
    if (!activeClient?.id) return false;
    return localStorage.getItem(`consent_signed_${activeClient.id}`) === "true";
  });

  const { activeOrganization } = useOrganization();
  const orgName = activeOrganization?.name || "Mantra Care";
  const clientFirstName = (activeClient?.name || "Patient").split(" ")[0];

  // Load appointments & invoices
  useEffect(() => {
    if (!activeClient) return;

    const loadData = () => {
      // 1. Fetch live appointments from appointmentService
      const allAppts = appointmentService.getAppointments();
      const patientPhoneDigits = (activeClient.phone || "").replace(/\D/g, "");
      const patientNameLower = (activeClient.name || "").toLowerCase().trim();

      const clientAppts = allAppts.filter((a) => {
        if (a.clientId && String(a.clientId) === String(activeClient.id)) return true;
        const aPhoneDigits = (a.clientPhone || "").replace(/\D/g, "");
        if (
          patientPhoneDigits &&
          aPhoneDigits &&
          (patientPhoneDigits === aPhoneDigits ||
            patientPhoneDigits.slice(-10) === aPhoneDigits.slice(-10))
        ) {
          return true;
        }
        if (
          a.clientName &&
          patientNameLower &&
          a.clientName.toLowerCase().trim() === patientNameLower
        ) {
          return true;
        }
        return false;
      });
      setAppointments(clientAppts);

      // 2. Fetch live invoices from invoiceService
      const allInvoices = invoiceService.getInvoices();
      const clientInvoices = allInvoices.filter((inv) => {
        if (inv.clientId && String(inv.clientId) === String(activeClient.id)) return true;
        if (inv.clientName && patientNameLower && inv.clientName.toLowerCase().trim() === patientNameLower)
          return true;
        const invPhoneDigits = (inv.clientPhone || "").replace(/\D/g, "");
        if (
          patientPhoneDigits &&
          invPhoneDigits &&
          (patientPhoneDigits === invPhoneDigits ||
            patientPhoneDigits.slice(-10) === invPhoneDigits.slice(-10))
        ) {
          return true;
        }
        return false;
      });

      const matchedOrPending =
        clientInvoices.length > 0
          ? clientInvoices
          : allInvoices.filter(
              (inv) => inv.total - (inv.amountPaid || 0) > 0 && inv.status !== "paid"
            );

      setInvoices(matchedOrPending.length > 0 ? matchedOrPending : allInvoices);
    };

    loadData();

    const handleDataChange = () => {
      loadData();
      setStoreTick((t) => t + 1);
    };

    window.addEventListener("mantra_appointments_changed", handleDataChange);
    window.addEventListener("mantra_appointments_updated", handleDataChange);
    window.addEventListener("mantra_invoices_changed", handleDataChange);
    window.addEventListener("mantra_payments_changed", handleDataChange);
    window.addEventListener("patient_portal_client_changed", handleDataChange);
    window.addEventListener(CLIENTS_STORE_EVENT, handleDataChange);
    window.addEventListener(PROCESS_LOGS_STORE_EVENT, handleDataChange);
    window.addEventListener(PROCESS_STORE_EVENT, handleDataChange);
    window.addEventListener("deals_updated", handleDataChange);
    window.addEventListener("storage", handleDataChange);

    return () => {
      window.removeEventListener("mantra_appointments_changed", handleDataChange);
      window.removeEventListener("mantra_appointments_updated", handleDataChange);
      window.removeEventListener("mantra_invoices_changed", handleDataChange);
      window.removeEventListener("mantra_payments_changed", handleDataChange);
      window.removeEventListener("patient_portal_client_changed", handleDataChange);
      window.removeEventListener(CLIENTS_STORE_EVENT, handleDataChange);
      window.removeEventListener(PROCESS_LOGS_STORE_EVENT, handleDataChange);
      window.removeEventListener(PROCESS_STORE_EVENT, handleDataChange);
      window.removeEventListener("deals_updated", handleDataChange);
      window.removeEventListener("storage", handleDataChange);
    };
  }, [activeClient?.id]);

  // Keep latest client record reactive
  const latestClient = useMemo(() => {
    if (!activeClient) return null;
    const all = getStoredClients();
    return all.find((c) => c.id === activeClient.id) || activeClient;
  }, [activeClient, storeTick]);

  // Read latest Call Logs for stage tracking
  const callLogs = useMemo(() => {
    return getStoredCallLogs();
  }, [storeTick]);

  // Resolve all assigned processes that have patient portal visibility
  const assignedPortalProcesses: AssignedProcessState[] = useMemo(() => {
    if (!latestClient) return [];
    const allProcs = getStoredProcesses();
    const rawAssigned = latestClient.processes || [];

    // Match assigned processes by name or ID
    const matchedProcs: Process[] = [];
    for (const pNameOrId of rawAssigned) {
      const found = allProcs.find(
        (p) =>
          p.name.toLowerCase() === pNameOrId.toLowerCase() ||
          p.id.toLowerCase() === pNameOrId.toLowerCase()
      );
      if (found && !matchedProcs.some((m) => m.id === found.id)) {
        matchedProcs.push(found);
      }
    }

    // Include all processes assigned to this patient
    let finalProcs = matchedProcs;
    if (finalProcs.length === 0) {
      const portalOnly = allProcs.filter(isProcessConnectedToPortal);
      finalProcs = portalOnly.length > 0 ? portalOnly : [
        allProcs.find(
          (p) => p.name === "Patient Care Journey" || p.id === "demo-patient-care-journey"
        ) || allProcs[0]
      ].filter(Boolean);
    }

    return finalProcs.map((proc) => {
      // ── Stage Resolution Priority:
      // 1. If this process is latestClient.lastUpdatedProcess, prioritize its stage
      // 2. callLogs matching clientId & process (most recent live move from dashboard)
      // 3. client.processStagesMap?.[proc.name]
      // 4. latestClient.stage if present in proc.stages
      // 5. proc.stages[0]?.name
      const stageFromMap =
        latestClient.processStagesMap?.[proc.name] ||
        latestClient.processStagesMap?.[proc.id];

      const logMatch = callLogs.find(
        (l) =>
          (l.clientId === latestClient.id ||
            (l.client && l.client.toLowerCase() === latestClient.name.toLowerCase())) &&
          l.process.toLowerCase() === proc.name.toLowerCase()
      );
      const stageFromLog = logMatch?.currentStage;

      // Timestamp of the latest update for recency determination
      let lastUpdatedTimestamp = 0;
      if (logMatch?.date) {
        const parsed = new Date(logMatch.date.replace(" ", "T")).getTime();
        if (!isNaN(parsed)) lastUpdatedTimestamp = parsed;
      }
      if (
        latestClient.lastUpdatedProcess &&
        (latestClient.lastUpdatedProcess.toLowerCase() === proc.name.toLowerCase() ||
         latestClient.lastUpdatedProcess.toLowerCase() === proc.id.toLowerCase())
      ) {
        lastUpdatedTimestamp = Math.max(lastUpdatedTimestamp, Date.now());
      }

      const clientGlobalStage = latestClient.stage;
      const isGlobalStageInProc = proc.stages.some(
        (s) => s.name.toLowerCase() === (clientGlobalStage || "").toLowerCase()
      );

      const isLastUpdated =
        latestClient.lastUpdatedProcess &&
        (latestClient.lastUpdatedProcess.toLowerCase() === proc.name.toLowerCase() ||
         latestClient.lastUpdatedProcess.toLowerCase() === proc.id.toLowerCase());

      const resolvedStageName =
        (isLastUpdated && (stageFromLog || stageFromMap || clientGlobalStage)) ||
        stageFromLog ||
        stageFromMap ||
        (isGlobalStageInProc ? clientGlobalStage : null) ||
        proc.stages[0]?.name ||
        "Active";

      const stages = proc.stages || [];
      const stageIdx = stages.findIndex(
        (s) =>
          s.name.toLowerCase() === resolvedStageName.toLowerCase() ||
          s.id.toLowerCase() === resolvedStageName.toLowerCase()
      );
      const activeIdx = Math.max(0, stageIdx >= 0 ? stageIdx : 0);
      const currentStageObj = stages[activeIdx] || stages[0];

      const stageSteps: StageStep[] =
        stages.length > 0
          ? stages.map((stg, idx) => ({
              id: stg.id,
              label: stg.portalReceptionSettings?.cardTitle || stg.name,
              status: idx < activeIdx ? "done" : idx === activeIdx ? "current" : "upcoming",
            }))
          : [
              { id: "s-1", label: "Checked In", status: "done" },
              { id: "s-2", label: "Consultation", status: "current" },
              { id: "s-3", label: "Pharmacy & Billing", status: "upcoming" },
              { id: "s-4", label: "Completed", status: "upcoming" },
            ];

      const progressPercent =
        stages.length > 0 ? Math.round(((activeIdx + 1) / stages.length) * 100) : 50;

      const isCompleted = activeIdx === stages.length - 1 && stages.length > 0;

      return {
        process: proc,
        currentStageName: resolvedStageName,
        currentStageIndex: activeIdx,
        currentStageObj,
        stageSteps,
        progressPercent,
        isCompleted,
        lastUpdatedTimestamp,
      };
    });
  }, [latestClient, callLogs]);

  // Recency-Driven: The process that was most recently updated
  const latestUpdatedProcessState = useMemo(() => {
    if (assignedPortalProcesses.length === 0) return null;
    return [...assignedPortalProcesses].sort(
      (a, b) => b.lastUpdatedTimestamp - a.lastUpdatedTimestamp
    )[0];
  }, [assignedPortalProcesses]);

  if (!activeClient) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <User className="w-12 h-12 text-slate-300 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">No Patient Profile Active</h2>
        <p className="text-xs text-slate-500">Please sign in or select a patient to continue.</p>
        <Link
          to="/patient/login"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs"
        >
          <span>Sign In</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  // ── Today's Appointment Logic ──
  const now = new Date();
  const todayIso = now.toISOString().split("T")[0];
  const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;

  const todayAppts = appointments.filter((a) => {
    if (!a.date) return false;
    const d = a.date.split("T")[0];
    return d === todayIso || d === localToday;
  });

  const todayAppt =
    todayAppts.find((a) => a.status !== "completed" && a.status !== "cancelled") ||
    todayAppts.find((a) => a.status === "completed") ||
    todayAppts[0] ||
    null;

  const isTodayApptCompleted = todayAppt ? todayAppt.status === "completed" : false;

  // Upcoming appointment (if none today, or next scheduled)
  const nextAppt =
    appointments.find((a) => a.status === "scheduled" && a.id !== todayAppt?.id) ||
    appointments.find((a) => a.status === "scheduled") ||
    todayAppt;

  // Real matched invoice for today or pending
  const matchedInvoice = isTodayApptCompleted
    ? (todayAppt?.invoiceId
        ? invoices.find(
            (inv) =>
              String(inv.id) === String(todayAppt.invoiceId) ||
              inv.invoiceNumber === todayAppt.invoiceId
          )
        : null) ||
      invoices.find((inv) => String(inv.appointmentId) === String(todayAppt?.id)) ||
      invoices[0] ||
      null
    : invoices.find((inv) => inv.total - (inv.amountPaid || 0) > 0 && inv.status !== "paid") ||
      invoices[0] ||
      null;

  const pendingInvoices = invoices.filter((i) => i.status !== "paid" && i.status !== "void");
  const totalBalanceDue = pendingInvoices.reduce(
    (acc, inv) => acc + Math.max(0, inv.total - (inv.amountPaid || 0)),
    0
  );

  // Dynamic Room Allocation from roomsStore
  const allocatedRoom = todayAppt
    ? findRoomForAppointment({
        serviceName: todayAppt.serviceName || todayAppt.title,
        location: todayAppt.location,
        employeeName: todayAppt.employeeName,
        employeeId: todayAppt.employeeId,
      })
    : null;

  const roomDisplay = todayAppt?.roomNumber
    ? `Room ${todayAppt.roomNumber}`
    : allocatedRoom
    ? `Room ${allocatedRoom.roomNumber}`
    : null;

  const roomDirection = allocatedRoom?.direction;

  const handleConsentSaved = (signatureDataUrl: string) => {
    localStorage.setItem(`consent_signed_${activeClient.id}`, "true");
    setConsentSigned(true);
    setDrawerTarget(null);
  };

  // Active primary process: user explicitly selected or latest updated
  const primaryProcessState = useMemo(() => {
    if (assignedPortalProcesses.length === 0) return null;
    if (userSelectedProcessId) {
      const found = assignedPortalProcesses.find(
        (p) => p.process.id === userSelectedProcessId
      );
      if (found) return found;
    }
    return latestUpdatedProcessState || assignedPortalProcesses[0];
  }, [assignedPortalProcesses, userSelectedProcessId, latestUpdatedProcessState]);

  // When any process has a recent stage update (from dashboard/kanban or patient portal),
  // automatically surface that pipeline to the top as the main expanded view
  const lastUpdatedProcessName = latestClient?.lastUpdatedProcess;
  useEffect(() => {
    if (lastUpdatedProcessName && assignedPortalProcesses.length > 0) {
      const matched = assignedPortalProcesses.find(
        (p) =>
          p.process.name.toLowerCase() === lastUpdatedProcessName.toLowerCase() ||
          p.process.id.toLowerCase() === lastUpdatedProcessName.toLowerCase()
      );
      if (matched) {
        setUserSelectedProcessId(matched.process.id);
      }
    }
  }, [lastUpdatedProcessName, storeTick]);

  // Secondary active/planned pipelines for the collapsible dropdown
  const otherProcesses = useMemo(() => {
    if (!primaryProcessState) return [];
    return assignedPortalProcesses.filter(
      (p) => p.process.id !== primaryProcessState.process.id
    );
  }, [assignedPortalProcesses, primaryProcessState]);



  // Tap handler on mini-pipeline stage blocks:
  // 1st tap: preview that stage in the card
  // 2nd tap on already selected stage: open StageContentDrawer
  const handleStageClick = (procState: AssignedProcessState, stageIdx: number) => {
    const procId = procState.process.id;
    const currentActiveIdx = procState.currentStageIndex;
    const currentSelectedIdx =
      selectedStageIndexMap[procId] !== undefined
        ? selectedStageIndexMap[procId]
        : currentActiveIdx;

    if (currentSelectedIdx === stageIdx) {
      // 2nd tap -> open drawer
      const targetStage = procState.process.stages[stageIdx] || procState.currentStageObj;
      setDrawerTarget({ stage: targetStage, processName: procState.process.name });
    } else {
      // 1st tap -> preview stage in card
      setSelectedStageIndexMap((prev) => ({
        ...prev,
        [procId]: stageIdx,
      }));
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-12 animate-in fade-in duration-200">
      {/* ── 1. CLEAN APP HEADER (Calm, Minimal, Zero AI Slop) ── */}
      <div className="px-1 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Hello, {clientFirstName}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })} • {orgName}
          </p>
        </div>

        {/* Clean Appointment Pill (if visit today) */}
        {(todayAppt || roomDisplay) && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200/90 shadow-2xs text-xs font-semibold text-slate-700">
            {todayAppt?.time && <span>{todayAppt.time}</span>}
            {todayAppt?.employeeName && <span>• {todayAppt.employeeName}</span>}
            {roomDisplay && <span className="text-emerald-700 font-bold">• {roomDisplay}</span>}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* ── 2. HERO CARE STAGE CARD (Clean, Focused, Sketch-Aligned) ── */}
      {/* ─────────────────────────────────────────────────────────── */}
      {primaryProcessState && (() => {
        const procId = primaryProcessState.process.id;
        const currentIdx = primaryProcessState.currentStageIndex;
        const selectedIdx =
          selectedStageIndexMap[procId] !== undefined
            ? selectedStageIndexMap[procId]
            : currentIdx;

        const displayedStage =
          primaryProcessState.process.stages?.[selectedIdx] ||
          primaryProcessState.currentStageObj;

        const isPreviewingNonCurrent = selectedIdx !== currentIdx;

        return (
          <div className="space-y-3">
            {/* Main Primary Hero Pipeline Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs relative overflow-hidden transition-all hover:border-slate-300 space-y-4">
              {/* Top Bar: Pipeline Title on Left, Contiguous Stepper Blocks on Right */}
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <span className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight truncate">
                  {primaryProcessState.process.name}
                </span>

                {/* Top-Right Mini Stepper Blocks */}
                <MiniStageStepper
                  steps={primaryProcessState.stageSteps}
                  currentStageIndex={currentIdx}
                  selectedStageIndex={selectedIdx}
                  onStageClick={(idx) => handleStageClick(primaryProcessState, idx)}
                />
              </div>

              {/* Main Stage Headline & Description (sleek, zero preview banners) */}
              <div className="space-y-1.5 pt-1">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  {displayedStage.portalReceptionSettings?.cardTitle || displayedStage.name}
                </h2>

                {(displayedStage.portalReceptionSettings?.cardDescription ||
                  displayedStage.portalReceptionSettings?.text ||
                  displayedStage.description) && (
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {displayedStage.portalReceptionSettings?.cardDescription ||
                      displayedStage.portalReceptionSettings?.text ||
                      displayedStage.description}
                  </p>
                )}
              </div>

              {/* Video guides if configured */}
              {displayedStage.portalReceptionSettings?.videos &&
                displayedStage.portalReceptionSettings.videos.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {displayedStage.portalReceptionSettings.videos.map((vid) => (
                      <a
                        key={vid.id}
                        href={vid.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                      >
                        <span>📺 {vid.title || "Watch Video Guide"}</span>
                      </a>
                    ))}
                  </div>
                )}

              {/* Bottom Primary Action CTA: Single, Full-Width, Sleek (no split buttons/return) */}
              <div className="pt-2">
                {isTodayApptCompleted &&
                !isPreviewingNonCurrent &&
                primaryProcessState.process.name === "Patient Care Journey" ? (
                  matchedInvoice?.status === "paid" ? (
                    <button
                      type="button"
                      onClick={() => navigate("/patient/bill")}
                      className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99]"
                    >
                      <FileText className="w-4 h-4" />
                      <span>View Paid Receipt</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate(`/patient/pay?invoiceId=${matchedInvoice?.id || ""}`)}
                      className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-blue-500/25 active:scale-[0.99]"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Pay Invoice (${(matchedInvoice?.total || 78.75).toFixed(2)})</span>
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setDrawerTarget({
                        stage: displayedStage,
                        processName: primaryProcessState.process.name,
                      })
                    }
                    className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-blue-500/25 active:scale-[0.99]"
                  >
                    <span>Stage Details &amp; Guidance</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* ── 2b. OTHER PLANNED PIPELINES (Sleek Collapsible Dropdown) ── */}
            {otherProcesses.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all">
                <button
                  type="button"
                  onClick={() => setIsOtherPipelinesOpen((prev) => !prev)}
                  className="w-full px-5 py-3.5 sm:py-4 flex items-center justify-between text-left hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs sm:text-sm font-bold text-slate-800">
                      Other Care Pathways
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-full">
                      {otherProcesses.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <span>{isOtherPipelinesOpen ? "Collapse" : "View"}</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isOtherPipelinesOpen ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>

                {isOtherPipelinesOpen && (
                  <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-3">
                    {otherProcesses.map((pState) => {
                      const pId = pState.process.id;
                      const pCurrentIdx = pState.currentStageIndex;
                      const pSelectedIdx =
                        selectedStageIndexMap[pId] !== undefined
                          ? selectedStageIndexMap[pId]
                          : pCurrentIdx;
                      const pDisplayedStage =
                        pState.process.stages?.[pSelectedIdx] || pState.currentStageObj;

                      return (
                        <div
                          key={pState.process.id}
                          className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:border-slate-300 transition-all space-y-3"
                        >
                          {/* Pipeline Title + Mini Stepper */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                {pState.process.name}
                              </h3>
                            </div>
                            <MiniStageStepper
                              steps={pState.stageSteps}
                              currentStageIndex={pCurrentIdx}
                              selectedStageIndex={pSelectedIdx}
                              onStageClick={(idx) => handleStageClick(pState, idx)}
                            />
                          </div>

                          {/* Stage Title & Short Description */}
                          <div>
                            <h4 className="text-xs sm:text-sm font-semibold text-slate-800">
                              {pDisplayedStage.portalReceptionSettings?.cardTitle || pDisplayedStage.name}
                            </h4>
                            {(pDisplayedStage.portalReceptionSettings?.cardDescription ||
                              pDisplayedStage.description) && (
                              <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                                {pDisplayedStage.portalReceptionSettings?.cardDescription ||
                                  pDisplayedStage.description}
                              </p>
                            )}
                          </div>

                          {/* Action */}
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() =>
                                setDrawerTarget({
                                  stage: pDisplayedStage,
                                  processName: pState.process.name,
                                })
                              }
                              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-[0.99]"
                            >
                              <span>Details</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── 4. QUICK CLINIC ESSENTIALS ── */}
      <QuietList title="Clinic Essentials">
        {/* Next Appointment Row */}
        {nextAppt ? (
          <QuietRow
            icon={<Calendar className="w-4 h-4" />}
            iconBg="#eff6ff"
            iconColor="#2563eb"
            title={nextAppt.title || nextAppt.serviceName || "Clinical Consultation"}
            subtitle={`${
              nextAppt.date
                ? new Date(nextAppt.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : "Upcoming"
            } at ${nextAppt.time || "10:30 AM"} • ${
              nextAppt.employeeName || "Dr. Rajesh Patel"
            }`}
            right="View"
            onClick={() => navigate("/patient/book")}
          />
        ) : (
          <QuietRow
            icon={<Calendar className="w-4 h-4" />}
            iconBg="#f1f5f9"
            iconColor="#64748b"
            title="Book an Appointment"
            subtitle="Follow-up visits & specialist care"
            right="Book"
            onClick={() => navigate("/patient/book")}
          />
        )}

        {/* Documents & Records Row */}
        <QuietRow
          icon={<FileText className="w-4 h-4" />}
          iconBg="#eff6ff"
          iconColor="#2563eb"
          title="Documents & Records"
          subtitle="Consultation notes, active Rx, and reports"
          right="View"
          onClick={() => navigate("/patient/documents")}
        />

        {/* Forms & Questionnaires Row */}
        <QuietRow
          icon={<ClipboardList className="w-4 h-4" />}
          iconBg="#f5f3ff"
          iconColor="#7c3aed"
          title="Forms & Questionnaires"
          subtitle="Clinical intake, health history & consents"
          right="View"
          onClick={() => navigate("/patient/forms")}
        />

        {/* Account Balance Row */}
        <QuietRow
          icon={<Receipt className="w-4 h-4" />}
          iconBg={totalBalanceDue > 0 ? "#fffbeb" : "#ecfdf5"}
          iconColor={totalBalanceDue > 0 ? "#d97706" : "#059669"}
          title={
            totalBalanceDue > 0
              ? `$${totalBalanceDue.toFixed(2)} Balance Due`
              : "Account Settled ($0.00)"
          }
          subtitle={
            totalBalanceDue > 0 ? "Click to pay online" : "No pending clinic invoices"
          }
          right={totalBalanceDue > 0 ? "Pay" : "Invoices"}
          onClick={() => navigate(totalBalanceDue > 0 ? "/patient/pay" : "/patient/bill")}
        />

        {/* Care Bot Assistant Row */}
        <QuietRow
          icon={<Bot className="w-4 h-4" />}
          iconBg="#eff6ff"
          iconColor="#2563eb"
          title="Care Bot"
          subtitle="24/7 Clinical AI Assistant & questions"
          right="Chat"
          onClick={() => navigate("/patient/care-bot")}
        />
      </QuietList>

      {/* ── STAGE CONTENT DRAWER (Slide-Out Guidance & Consent) ── */}
      <StageContentDrawer
        isOpen={Boolean(drawerTarget)}
        onClose={() => setDrawerTarget(null)}
        stage={drawerTarget?.stage || null}
        processName={drawerTarget?.processName || "Patient Care Journey"}
        clientName={activeClient.name}
        doctorName={todayAppt?.employeeName || activeClient.responsible || "Dr. Rajesh Patel"}
        roomName={roomDisplay || orgName}
        onConsentSigned={handleConsentSaved}
      />
    </div>
  );
}
