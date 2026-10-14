import React, { useState, useEffect, useMemo } from "react";
import { useOutletContext, useNavigate, Link } from "react-router";
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  FileText,
  CreditCard,
  QrCode,
  MapPin,
  Sparkles,
  ArrowRight,
  Plus,
  Stethoscope,
  ChevronRight,
  ShieldCheck,
  Activity,
  Receipt,
  Building2,
  Info,
  Pill,
  Check,
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
import ActionCard from "./components/ActionCard";
import QuietList, { QuietRow } from "./components/QuietList";
import StageContentDrawer from "./components/StageContentDrawer";

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

  // Dev View Toggler: 'all' (All Stacked Pipelines) vs 'latest' (Single Explicit Stage Only)
  const [devViewMode, setDevViewMode] = useState<"all" | "latest">(() => {
    try {
      const saved = localStorage.getItem("patient_portal_pipeline_view_mode");
      if (saved === "all" || saved === "latest") return saved;
    } catch {}
    return "latest";
  });

  const handleSetDevViewMode = (mode: "all" | "latest") => {
    setDevViewMode(mode);
    try {
      localStorage.setItem("patient_portal_pipeline_view_mode", mode);
    } catch {}
  };

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
      setStoreTick((t) => t + 1);
    };

    loadData();

    const handleDataChange = () => loadData();

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
  }, [activeClient]);

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

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-12 animate-in fade-in duration-200">
      {/* ── DEV VIEW TOGGLER: [All Pipelines] vs [Latest Active Stage] (Requested by User) ── */}
      <div className="flex items-center justify-between px-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-semibold text-slate-500">
            {devViewMode === "latest" ? (
              <span>
                Active Stage:{" "}
                <strong className="text-slate-800">
                  {latestUpdatedProcessState?.process.name}
                </strong>{" "}
                · {latestUpdatedProcessState?.currentStageName}
              </span>
            ) : (
              <span>
                {assignedPortalProcesses.length} care{" "}
                {assignedPortalProcesses.length === 1 ? "pipeline" : "pipelines"} active
              </span>
            )}
          </span>
        </div>

        {/* Minimalist Top Pill Toggle */}
        <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100/90 rounded-xl border border-slate-200/60 text-[11px] font-medium text-slate-600">
          <button
            type="button"
            onClick={() => handleSetDevViewMode("latest")}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              devViewMode === "latest"
                ? "bg-white text-slate-900 font-bold shadow-2xs"
                : "hover:text-slate-900"
            }`}
          >
            Latest Active Stage
          </button>
          <button
            type="button"
            onClick={() => handleSetDevViewMode("all")}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              devViewMode === "all"
                ? "bg-white text-slate-900 font-bold shadow-2xs"
                : "hover:text-slate-900"
            }`}
          >
            All Pipelines
          </button>
        </div>
      </div>

      {/* ── 1. WELCOME & CLINIC OVERVIEW HEADER (Distinct Top Card with Clean Padding) ── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Patient Portal · {orgName}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Welcome to {orgName}, {clientFirstName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mt-0.5">
              Track your real-time clinic journey, view upcoming appointments, and access digital records.
            </p>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <span className="text-xs font-semibold text-slate-400">
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
            <div className="mt-1 text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full inline-block">
              {devViewMode === "latest"
                ? "Live Stage Sync"
                : `${assignedPortalProcesses.length} Active Pipelines`}
            </div>
          </div>
        </div>

        {/* Key Facts Inline Pills (Doctor, Room, Schedule) */}
        {(todayAppt || roomDisplay) && (
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 text-xs text-slate-600 font-semibold">
            {todayAppt?.employeeName && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-700">
                <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                <span>{todayAppt.employeeName}</span>
              </span>
            )}

            {roomDisplay && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>{roomDisplay}</span>
              </span>
            )}

            {todayAppt?.time && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-700">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{todayAppt.time}</span>
              </span>
            )}

            {roomDirection && (
              <span className="text-[11px] text-slate-400 font-medium ml-1">
                • {roomDirection}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* ── MODE 1: LATEST ACTIVE STAGE ONLY (Recency-Driven)     ── */}
      {/* ─────────────────────────────────────────────────────────── */}
      {devViewMode === "latest" && latestUpdatedProcessState && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs relative overflow-hidden transition-all hover:border-slate-300 space-y-4">
          {/* Top Process & Status Pill */}
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              <span>{latestUpdatedProcessState.process.name}</span>
            </div>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Current Stage</span>
            </span>
          </div>

          {/* Explicit Stage Title & Information from Process Settings */}
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {latestUpdatedProcessState.currentStageObj.portalReceptionSettings?.cardTitle ||
                latestUpdatedProcessState.currentStageObj.name}
            </h2>

            {(latestUpdatedProcessState.currentStageObj.portalReceptionSettings?.cardDescription ||
              latestUpdatedProcessState.currentStageObj.portalReceptionSettings?.text ||
              latestUpdatedProcessState.currentStageObj.description) && (
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {latestUpdatedProcessState.currentStageObj.portalReceptionSettings?.cardDescription ||
                  latestUpdatedProcessState.currentStageObj.portalReceptionSettings?.text ||
                  latestUpdatedProcessState.currentStageObj.description}
              </p>
            )}
          </div>

          {/* Rich HTML Guidance if configured in MA dashboard */}
          {latestUpdatedProcessState.currentStageObj.portalReceptionSettings?.htmlContent && (
            <div
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: latestUpdatedProcessState.currentStageObj.portalReceptionSettings.htmlContent,
              }}
            />
          )}

          {/* Media Links if configured in process settings */}
          {latestUpdatedProcessState.currentStageObj.portalReceptionSettings?.videos &&
            latestUpdatedProcessState.currentStageObj.portalReceptionSettings.videos.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {latestUpdatedProcessState.currentStageObj.portalReceptionSettings.videos.map((vid) => (
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

          {/* Single Action Button */}
          <div className="pt-2">
            {isTodayApptCompleted &&
            latestUpdatedProcessState.process.name === "Patient Care Journey" ? (
              matchedInvoice?.status === "paid" ? (
                <button
                  type="button"
                  onClick={() => navigate("/patient/bill")}
                  className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99]"
                >
                  <FileText className="w-4 h-4" />
                  <span>View Paid Receipt</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate(`/patient/pay?invoiceId=${matchedInvoice?.id || ""}`)}
                  className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-blue-500/25 active:scale-[0.99]"
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
                    stage: latestUpdatedProcessState.currentStageObj,
                    processName: latestUpdatedProcessState.process.name,
                  })
                }
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-blue-500/25 active:scale-[0.99]"
              >
                <span>Stage Details &amp; Guidance</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* ── MODE 2: ALL PIPELINES (Stacked, Identical, Not Collapsible) ── */}
      {/* ─────────────────────────────────────────────────────────── */}
      {devViewMode === "all" && (
        <div className="space-y-4">
          {assignedPortalProcesses.map((pState, index) => {
            const isFirstPipeline = index === 0;

            return (
              <div
                key={pState.process.id}
                className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs relative overflow-hidden transition-all hover:border-slate-300 space-y-4"
              >
                {/* Top Badge & Stage Bar */}
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                    <span>{pState.process.name}</span>
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>
                      Step {pState.currentStageIndex + 1} of {pState.stageSteps.length}:{" "}
                      <strong className="text-slate-800">{pState.currentStageName}</strong>
                    </span>
                  </span>
                </div>

                {/* Pipeline Headline / Summary */}
                <div className="space-y-1">
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                    {pState.process.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                    {pState.process.description ||
                      (isFirstPipeline && todayAppt
                        ? `Active clinical journey with ${todayAppt.employeeName || "assigned physician"}.`
                        : "Active clinical care pathway synchronized live with your clinic care team.")}
                  </p>
                </div>

                {/* Full Horizontal Stage Track */}
                <div className="py-1">
                  <StageTrack
                    steps={pState.stageSteps}
                    onSelectStep={(stageId) => {
                      const matched = pState.process.stages.find((s) => s.id === stageId);
                      if (matched) {
                        setDrawerTarget({ stage: matched, processName: pState.process.name });
                      }
                    }}
                  />
                </div>

                {/* Action Button */}
                <div>
                  {isFirstPipeline && isTodayApptCompleted ? (
                    matchedInvoice?.status === "paid" ? (
                      <button
                        type="button"
                        onClick={() => navigate("/patient/bill")}
                        className="w-full py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99]"
                      >
                        <FileText className="w-4 h-4" />
                        <span>View Paid Receipt</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate(`/patient/pay?invoiceId=${matchedInvoice?.id || ""}`)}
                        className="w-full py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-blue-500/25 active:scale-[0.99]"
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
                          stage: pState.currentStageObj,
                          processName: pState.process.name,
                        })
                      }
                      className="w-full py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-blue-500/25 active:scale-[0.99]"
                    >
                      <span>{isFirstPipeline ? "Visit Details & Guidance" : "Guidance & Documents"}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 3. ACTION NEEDED CARD (Max 1, Zero Footprint When Clear) ── */}
      {!consentSigned && (
        <ActionCard
          label="Action Needed"
          description="Informed consent and baseline medical intake form pending your digital signature."
          actionText="Review & Sign"
          onAction={() => {
            const targetProcess =
              devViewMode === "latest" && latestUpdatedProcessState
                ? latestUpdatedProcessState
                : assignedPortalProcesses[0];
            setDrawerTarget({
              stage: targetProcess.currentStageObj,
              processName: targetProcess.process.name,
            });
          }}
          variant="blue"
        />
      )}

      {totalBalanceDue > 0 && isTodayApptCompleted === false && (
        <ActionCard
          label="Billing Notice"
          description={`You have $${totalBalanceDue.toFixed(2)} pending across ${
            pendingInvoices.length
          } clinical invoice${pendingInvoices.length > 1 ? "s" : ""}.`}
          actionText="Pay Now"
          onAction={() => navigate("/patient/pay")}
          variant="amber"
          icon="alert"
        />
      )}

      {/* ── 4. QUIET LIST (Secondary Essentials Without Visual Clutter) ── */}
      <QuietList title="Clinic Highlights">
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
            title="No upcoming visits scheduled"
            subtitle="Book routine follow-ups or specialist consultations"
            right="Book"
            onClick={() => navigate("/patient/book")}
          />
        )}

        {/* Documents & Rx Row */}
        <QuietRow
          icon={<Pill className="w-4 h-4" />}
          iconBg="#f5f3ff"
          iconColor="#7c3aed"
          title="Clinical Summary &amp; Active Rx"
          subtitle="Consultation notes, prescriptions, and lab results"
          right="Documents"
          onClick={() => navigate("/patient/documents")}
        />

        {/* Account Balance Row */}
        <QuietRow
          icon={<Receipt className="w-4 h-4" />}
          iconBg={totalBalanceDue > 0 ? "#fffbeb" : "#ecfdf5"}
          iconColor={totalBalanceDue > 0 ? "#d97706" : "#059669"}
          title={
            totalBalanceDue > 0
              ? `$${totalBalanceDue.toFixed(2)} Balance Due`
              : "$0.00 — All Paid Up"
          }
          subtitle={
            totalBalanceDue > 0 ? "Pending digital settlement" : "No outstanding clinic bills"
          }
          right={totalBalanceDue > 0 ? "Pay" : "Statements"}
          onClick={() => navigate("/patient/bill")}
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
