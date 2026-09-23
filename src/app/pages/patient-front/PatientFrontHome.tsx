import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  FileText,
  CreditCard,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  ArrowRight,
  Building2,
  User,
} from "lucide-react";
import {
  getClientProcessStages,
  findClientById,
  CLIENTS_STORE_EVENT,
  ClientProcessStage,
  setClientProcessStage,
} from "../../../lib/clientProcessState";
import { getStoredProcesses, Process, Stage } from "../../../lib/useProcessStore";
import { getStoredAppointments, Appointment } from "../../../lib/appointmentsStore";
import { getScribeSessions, ScribeSession } from "../../../lib/scribeSessionStore";
import { useInvoices } from "../../context/InvoiceContext";
import { getStoredStageProgress } from "../../../lib/patientStageProgressStore";
import { onSyncEvent } from "../../../lib/syncBroadcast";
import StageTrack, { StageStep } from "./components/StageTrack";
import ActionCard from "./components/ActionCard";
import { QuietList, QuietRow } from "./components/QuietList";
import StageContentDrawer from "./components/StageContentDrawer";
import PatientStageDevBar from "./components/PatientStageDevBar";

interface PatientFrontHomeProps {
  clientId: string;
  onNavigateTab: (tab: "today" | "appointments" | "documents" | "billing" | "profile") => void;
}

export default function PatientFrontHome({
  clientId,
  onNavigateTab,
}: PatientFrontHomeProps) {
  const [client, setClient] = useState<any>(() => {
    const found = findClientById(clientId);
    return found && found.name !== "Sarah Johnson"
      ? found
      : {
          id: clientId,
          name: "Ramesh Iyer",
          email: "ramesh.iyer@email.com",
          phone: "+91 98765 43210",
          age: 62,
        };
  });

  const [activeStages, setActiveStages] = useState<ClientProcessStage[]>(() =>
    getClientProcessStages(clientId)
  );
  const [processes, setProcesses] = useState<Process[]>(getStoredProcesses);
  const { invoices } = useInvoices();

  // Drawer states
  const [selectedDrawerStage, setSelectedDrawerStage] = useState<{
    process: Process;
    stage: Stage;
  } | null>(null);

  // Live real-time cross-window sync listener
  useEffect(() => {
    const handleSync = () => {
      const updatedClient = findClientById(clientId);
      if (updatedClient && updatedClient.name !== "Sarah Johnson") {
        setClient(updatedClient);
      }
      setActiveStages(getClientProcessStages(clientId));
      setProcesses(getStoredProcesses());
    };

    window.addEventListener(CLIENTS_STORE_EVENT, handleSync);
    window.addEventListener("storage", handleSync);
    const unsub = onSyncEvent("CLIENTS_UPDATED", handleSync);
    const unsubProc = onSyncEvent("PROCESS_UPDATED", handleSync);

    return () => {
      window.removeEventListener(CLIENTS_STORE_EVENT, handleSync);
      window.removeEventListener("storage", handleSync);
      unsub();
      unsubProc();
    };
  }, [clientId]);

  // Fallback Cataract Stages aligned strictly with v3 Brief
  const defaultCataractStages: Stage[] = [
    {
      id: "cat-0",
      name: "Pre-Checkin",
      description: "Morning fasting verification and arrival reporting at Reception Desk",
      status: "active",
      color: "#3b82f6",
      patientFacingContent: {
        infoText: "Your cataract surgery is scheduled for today. Please arrive by 8:45 AM and report to Reception Desk Counter 1.",
        instructions: [
          "Confirm strict fasting (zero food or water since midnight)",
          "Bring your companion or attendant with you to the clinic",
          "Report to Reception Counter 1 for admission and verification",
        ],
        badge: "Scheduled · Reception Check-In",
        doctorName: "Dr. Meera Nair",
        roomOrCounter: "Reception Desk (Counter 1)",
        estimatedWaitTime: "Surgery at 9:00 AM",
      },
    },
    {
      id: "cat-1",
      name: "Checked In",
      description: "Pre-op check-in, baseline vitals, and surgical prep review",
      status: "active",
      color: "#10b981",
      patientFacingContent: {
        infoText: "You are checked into EyeMantra. Welcome to the Pre-Op Daycare Lounge.",
        instructions: [
          "Take a seat in the Pre-Op Lounge while nursing prepares your record",
          "Confirm you have had zero food or water since midnight (fasting)",
          "Verify identification and prepare for baseline clinical vitals",
        ],
        badge: "Pre-Op Check-In",
        doctorName: "Dr. Meera Nair",
        roomOrCounter: "Pre-Op Daycare Lounge (Bay 3)",
        estimatedWaitTime: "~10 mins",
        checklist: [
          { id: "cat-f-1", label: "Strict fasting since midnight", description: "No food, tea, or water this morning as instructed", required: true },
          { id: "cat-f-2", label: "Attendant or companion present", description: "Priya Iyer is present to accompany you home today", required: true },
          { id: "cat-f-3", label: "Eyewear & personal valuables handed over", description: "Spectacles and personal valuables safely kept with your attendant", required: true },
        ],
      },
    },
    {
      id: "cat-2",
      name: "Dilation & Drops",
      description: "Numbing and pupil-dilating drops placed in preparation room",
      status: "active",
      color: "#F59E0B",
      patientFacingContent: {
        infoText: "Dilating and topical numbing drops have been placed in your right eye. Your vision will blur slightly — this is completely normal and expected.",
        instructions: [
          "Rest comfortably in the holding chair with both eyes relaxed",
          "Pupillary dilation takes approximately 15–20 minutes",
          "Avoid touching or rubbing your right eye",
        ],
        badge: "Dilation in Progress",
        doctorName: "Dr. Meera Nair",
        roomOrCounter: "Holding Area Bay B",
        estimatedWaitTime: "~15 mins",
      },
    },
    {
      id: "cat-3",
      name: "Pre-Op Prep",
      description: "Sterile gowning, right-eye marking confirmation, and transfer prep",
      status: "active",
      color: "#3B82F6",
      patientFacingContent: {
        infoText: "You are in pre-op prep. You will be moved to Operating Theatre 2 shortly.",
        instructions: [
          "Relax on the transfer stretcher while your sterile gown is secured",
          "Nurse will verify your Right Eye surgical marking and +21.5D Toric lens prescription",
          "Dr. Meera Nair's surgical team will escort you into the theatre",
        ],
        badge: "Ready for OR",
        doctorName: "Dr. Meera Nair",
        roomOrCounter: "OT Prep Suite 4",
        estimatedWaitTime: "~5 mins",
      },
    },
    {
      id: "cat-4",
      name: "In Surgery",
      description: "Surgery in progress in Operating Theatre 2",
      status: "active",
      color: "#8B5CF6",
      patientFacingContent: {
        infoText: "Ramesh is in surgery with Dr. Meera Nair. This usually takes about 15 minutes — we'll update this the moment he's out.",
        instructions: [
          "Attendant waiting area: 2nd Floor Lounge (Bay 3)",
          "Complimentary water, coffee, and tea available at Desk 2",
          "Dr. Nair or our nurse coordinator will greet you immediately upon completion",
        ],
        badge: "In Surgery (OT-2)",
        doctorName: "Dr. Meera Nair",
        roomOrCounter: "Operating Theatre 2 (OR-2)",
        estimatedWaitTime: "~15 mins",
      },
    },
    {
      id: "cat-5",
      name: "Recovery & Discharge",
      description: "Post-op rest, clear protective eye shield, and home medication schedule",
      status: "active",
      color: "#10B981",
      patientFacingContent: {
        infoText: "Surgery complete! Ramesh is resting comfortably in the daycare recovery suite.",
        instructions: [
          "Keep the clear protective eye shield taped and dry; wear it while sleeping for 7 days",
          "View and follow the full eye drops medication schedule in Documents",
          "Attend the Post-Op Day 1 Review tomorrow at 10:30 AM with Dr. Meera Nair",
        ],
        badge: "Recovery Suite",
        doctorName: "Dr. Meera Nair",
        roomOrCounter: "Recovery Suite (Bed 4)",
        estimatedWaitTime: "Discharge ready ~30 mins",
        checklist: [
          { id: "cat-dis-1", label: "Clear protective eye shield in place", description: "Shield secured over right eye; do not rub or apply water", required: true },
          { id: "cat-dis-2", label: "Eye drops schedule & prescription received", description: "Moxifloxacin & lubricating drop regimen reviewed with Priya", required: true },
          { id: "cat-dis-3", label: "Day 1 follow-up confirmed", description: "Review appointment tomorrow at 10:30 AM with Dr. Meera Nair", required: true },
        ],
      },
    },
  ];

  // Seed default Cataract Daycare process for Ramesh Iyer if unassigned
  useEffect(() => {
    const list = getClientProcessStages(clientId);
    const cataractProc =
      processes.find((p) => p.id === "op-cataract") || processes[0];

    if (!list || list.length === 0 || !list.some((l) => l.processId === "op-cataract")) {
      if (cataractProc && cataractProc.stages && cataractProc.stages.length > 0) {
        const stage3 =
          cataractProc.stages.find((s) => s.id === "cat-3") ||
          cataractProc.stages[2] ||
          cataractProc.stages[0];
        const defaultEntry: ClientProcessStage = {
          processId: cataractProc.id,
          processName: cataractProc.name || "Cataract Surgery Daycare",
          stageId: stage3.id,
          stageName: stage3.name || "Pre-Op Prep",
          channel: "sms",
        };
        setActiveStages([defaultEntry]);
        setClientProcessStage(clientId, defaultEntry);
      }
    } else {
      setActiveStages(list);
    }
  }, [clientId]);

  const clientName = client?.name || "Ramesh Iyer";

  // Strict isolation: strictly Cataract process only
  const activeEnrollment = activeStages.find((s) => s.processId === "op-cataract") || activeStages[0];
  const cataractProcess: Process =
    processes.find((p) => p.id === "op-cataract") || {
      id: "op-cataract",
      name: "Cataract Surgery Daycare",
      description: "Right-Eye Phacoemulsification with Foldable Toric IOL",
      stages: defaultCataractStages,
      assignedToUserId: 1,
      aiSettings: { platform: "OpenAI", voiceSpeed: 1 },
    };

  const processStagesList =
    cataractProcess.stages && cataractProcess.stages.length > 0
      ? cataractProcess.stages
      : defaultCataractStages;

  const currentStageId = (() => {
    if (activeEnrollment?.stageId) {
      const match = processStagesList.find((s) => s.id === activeEnrollment.stageId);
      if (match) return match.id;
    }
    if (activeEnrollment?.stageName) {
      const matchByName = processStagesList.find(
        (s) => s.name.trim().toLowerCase() === activeEnrollment.stageName.trim().toLowerCase()
      );
      if (matchByName) return matchByName.id;
    }
    return activeEnrollment?.stageId || "pre-checkin";
  })();

  // Special Journey States
  const isPreCheckin = currentStageId === "pre-checkin" || currentStageId === "cat-0" || currentStageId.toLowerCase().includes("pre-checkin");
  const isQuiet = currentStageId === "quiet";
  const isInSurgery = currentStageId === "cat-4";
  const isRecovery = currentStageId === "cat-5";

  // Filter out stages explicitly set as internal-only (visibleToPatient === false) and preserve chronological clinical order
  const patientVisibleStages = useMemo(() => {
    const visible = processStagesList.filter(
      (s) => s.patientFacingContent?.visibleToPatient !== false && s.id !== "cat-0" && s.id !== "pre-checkin"
    );
    const orderMap: Record<string, number> = {
      "cat-1": 1,
      "cat-2": 2,
      "cat-3": 3,
      "cat-4": 4,
      "cat-5": 5,
    };
    const list = visible.length > 0 ? visible : processStagesList.filter(s => s.id !== "cat-0" && s.id !== "pre-checkin");
    return [...list].sort((a, b) => {
      const ordA = orderMap[a.id];
      const ordB = orderMap[b.id];
      if (ordA !== undefined && ordB !== undefined) {
        return ordA - ordB;
      }
      return 0;
    });
  }, [processStagesList]);

  // Current active stage object
  const currentStageObj: Stage =
    patientVisibleStages.find((s) => s.id === currentStageId) ||
    patientVisibleStages[0] ||
    processStagesList[0] ||
    defaultCataractStages[0];

  const currentIdx = patientVisibleStages.findIndex((s) => s.id === currentStageObj.id);
  const activeIdx = currentIdx !== -1 ? currentIdx : 2;

  // Build the stage track steps from patient-visible stages
  const stageSteps: StageStep[] = patientVisibleStages.map((stg, i) => ({
    id: stg.id,
    label: stg.name,
    status: isPreCheckin ? "upcoming" : i < activeIdx ? "done" : i === activeIdx ? "current" : "upcoming",
  }));

  // Dynamic Headline based on active stage
  const getStageHeadline = (stg: Stage) => {
    if (isPreCheckin) return "Your surgery is today at 9:00 AM";
    if (isQuiet) return "You're all set";
    if (stg.id === "cat-1") return "Checked in for Cataract Surgery";
    if (stg.id === "cat-2") return "Pupil dilation in progress";
    if (stg.id === "cat-3") return "Getting ready for surgery";
    if (stg.id === "cat-4") return "Ramesh is in surgery with Dr. Meera Nair";
    if (stg.id === "cat-5") return "Ramesh is in recovery";
    return "Cataract Daycare Surgery";
  };

  // Check for actionable item (e.g. Recovery eye-shield checklist)
  let pendingAction: {
    label: string;
    desc: string;
    actionText: string;
    onClick: () => void;
  } | null = null;

  const progress = getStoredStageProgress(clientId, cataractProcess.id, currentStageObj.id);
  const stageChecklist = currentStageObj.patientFacingContent?.checklist || [];

  if (!isPreCheckin && !isQuiet && !isInSurgery && isRecovery && stageChecklist.length > 0) {
    const isCompleted = stageChecklist.every((item) =>
      progress.completedChecklistIds.includes(item.id)
    );
    if (!isCompleted) {
      pendingAction = {
        label: "Confirm eye-shield care",
        desc: "Acknowledge protective eye shield guidelines and home drop instructions",
        actionText: "Review instructions",
        onClick: () =>
          setSelectedDrawerStage({
            process: cataractProcess,
            stage: currentStageObj,
          }),
      };
    }
  }

  // Next Appointment for QuietList
  const allAppointments = getStoredAppointments();
  const clientAppts = allAppointments.filter(
    (a) =>
      a.clientName.toLowerCase().includes("ramesh") ||
      a.clientName.toLowerCase().includes(clientName.toLowerCase())
  );
  const nextAppt: Appointment | undefined =
    clientAppts.find((a) => a.id === 2) || clientAppts[0];

  // Latest Prescription / Biometry for QuietList
  const scribeSessions = getScribeSessions(clientId);
  const recentSession: ScribeSession | undefined = scribeSessions[0];

  // Invoices & Balance
  const clientInvoices = invoices.filter(
    (inv) =>
      inv.clientId === clientId ||
      inv.clientName?.toLowerCase().includes("ramesh") ||
      inv.clientName?.toLowerCase().includes(clientName.toLowerCase())
  );
  const unpaidInvoices = clientInvoices.filter((inv) => {
    const total = Number((inv as any).totalAmount ?? (inv as any).total ?? 0);
    const paid = Number((inv as any).paidAmount ?? (inv as any).amountPaid ?? 0);
    const bal = Number((inv as any).balanceDue ?? Math.max(0, total - paid));
    return (
      (inv.status === "sent" ||
        inv.status === "draft" ||
        inv.status === "overdue" ||
        inv.status === "partial") &&
      bal > 0
    );
  });
  const totalBalance = unpaidInvoices.reduce((acc, curr) => {
    const total = Number((curr as any).totalAmount ?? (curr as any).total ?? 0);
    const paid = Number((curr as any).paidAmount ?? (curr as any).amountPaid ?? 0);
    const bal = Number((curr as any).balanceDue ?? Math.max(0, total - paid));
    return acc + bal;
  }, 0);

  const handleOpenVisitDetails = () => {
    setSelectedDrawerStage({ process: cataractProcess, stage: currentStageObj });
  };


  return (
    <div className="w-full select-none animate-in fade-in duration-200">
      {/* Top Eyebrow — State 0 & §0 Rule */}
      <div className="mb-3">
        <div className="font-semibold uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400">
          Today
        </div>
      </div>

      {/* =========================================================================
          STATE 0: BEFORE CHECK-IN (MORNING OF SURGERY)
          Blue-tinted pill, one line copy, 2 pills, 1 button, no stage track
          ========================================================================= */}
      {isPreCheckin ? (
        <div className="bg-white dark:bg-[#151c24] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] relative overflow-hidden mb-6">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50/80 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1456f0]" />
              <span>Right Eye Cataract · Daycare</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-[11px] font-semibold">
              <Building2 className="w-3 h-3 text-amber-600" />
              <span>Report to Reception Desk</span>
            </div>
          </div>

          <h1 className="font-display font-semibold text-slate-900 dark:text-white text-xl sm:text-2xl tracking-tight mb-2">
            Your surgery is today at 9:00 AM
          </h1>

          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed mb-5 max-w-xl">
            Right-eye cataract surgery with Dr. Meera Nair. Please arrive by 8:45 AM and report to Reception Desk Counter 1. Staff will verify your details and check you in.
          </p>

          <div className="mt-5 p-3.5 sm:p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5">
            <div className="flex items-center flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Dr. Meera Nair</span>
              </div>
              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
              <div className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Fasting required</span>
              </div>
              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
              <div className="inline-flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Counter 1</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-medium">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Awaiting clinic check-in</span>
              </span>
            </div>
          </div>
        </div>
      ) : isQuiet ? (
        /* =========================================================================
           STATE 2: QUIET STATE (DAYS LATER / POST-DISCHARGE)
           Luminous Pearl Card · "You're all set", next appointment, no forced cards.
           ========================================================================= */
        <div className="bg-white dark:bg-[#151c24] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] relative overflow-hidden mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold mb-3">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Care Completed</span>
          </div>

          <h1 className="font-display font-semibold text-slate-900 dark:text-white text-xl sm:text-2xl tracking-tight mb-2">
            You're all set
          </h1>

          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed mb-5 max-w-xl">
            No active clinic visits today. Your post-operative recovery is progressing normally under the care of Dr. Meera Nair.
          </p>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300">
            <span>Next review: <strong className="font-semibold text-slate-900 dark:text-white">Oct 3, 10:30 AM</strong> with Dr. Meera Nair</span>
            <button
              type="button"
              onClick={() => onNavigateTab("appointments")}
              className="text-[#1456f0] hover:text-blue-700 font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <span>View appointment pass</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* =========================================================================
           STATE 3: ACTIVE SURGICAL VISIT (STAGES 1 TO 5)
           Luminous Pearl Card · Restful contrast, glanceable specs, zero emojis
           ========================================================================= */
        <div className="bg-white dark:bg-[#151c24] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] relative overflow-hidden mb-6">
          {/* Top Context Row — no redundant Stage X of 5 text per spec */}
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50/80 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1456f0]" />
              <span>Right Eye Cataract · Daycare</span>
            </div>
          </div>

          {/* Dominant Headline */}
          <h1 className="font-display font-semibold text-slate-900 dark:text-white text-xl sm:text-2xl tracking-tight mb-5">
            {getStageHeadline(currentStageObj)}
          </h1>

          {/* Stepper Timeline */}
          <StageTrack
            steps={stageSteps}
          />

          {/* State 4 (In Surgery) vs Standard Stage Footer (Stages 1, 2, 3, 5) */}
          {isInSurgery ? (
            /* State 4 — In Surgery (Stage 4 of 5) per spec:
               Directly under the stage track:
               One line: "Started 8 minutes ago · usually takes about 15 minutes."
               One reassurance line: "We'll let you know the moment he's out."
               No button, no timer box, no progress bar, no extra cards. */
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-1">
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                Started 8 minutes ago · usually takes about 15 minutes.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                We'll let you know the moment he's out.
              </p>
            </div>
          ) : (
            /* Standard Stage Footer (Stages 1, 2, 3, 5): Structured Inset Info Tile */
            <div className="mt-5 p-3.5 sm:p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs">
                {/* Location */}
                <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                  <MapPin className="w-3.5 h-3.5 text-[#1456f0] shrink-0" />
                  <span>{currentStageObj.patientFacingContent?.roomOrCounter || "OT Prep Suite 4"}</span>
                </div>

                <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400">
                  <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />

                  {/* Doctor */}
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Dr. Meera Nair</span>
                  </div>

                  <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />

                  {/* Wait / Status */}
                  <div className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>{currentStageObj.patientFacingContent?.estimatedWaitTime || "~10 mins"}</span>
                  </div>
                </div>
              </div>

              {/* Visit Details Action CTA */}
              <button
                type="button"
                onClick={handleOpenVisitDetails}
                className="cursor-pointer shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[#1456f0] hover:text-white bg-blue-50 dark:bg-blue-950/50 hover:bg-[#1456f0] dark:hover:bg-[#1456f0] border border-blue-200/70 dark:border-blue-800/70 hover:border-transparent transition-all shadow-2xs active:scale-95"
              >
                <span>Visit details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          ACTION CARD: Strictly when an urgent action item exists (max 1 block)
          Zero action card during Stage 4 (In Surgery) or once resolved
          ========================================================================= */}
      {pendingAction && (
        <ActionCard
          label={pendingAction.label}
          description={pendingAction.desc}
          actionText={pendingAction.actionText}
          onAction={pendingAction.onClick}
        />
      )}

      {/* =========================================================================
          QUIET LIST: Non-competing secondary details
          ========================================================================= */}
      <QuietList title="Also on your companion">
        {/* Next Appointment Row */}
        <QuietRow
          icon={<Calendar style={{ width: "16px", height: "16px" }} />}
          title="Next appointment"
          subtitle={
            <>
              Post-Op Review · Dr. Meera Nair ·{" "}
              <span className="font-mono">Sept 22 at 10:30 AM</span>
            </>
          }
          right="View pass"
          onClick={() => onNavigateTab("appointments")}
        />

        {/* Latest Clinical Record / Prescription */}
        <QuietRow
          icon={<FileText style={{ width: "16px", height: "16px" }} />}
          title="Prescriptions"
          subtitle={
            <>
              Nuclear Cataract Grade II (Right Eye) · Dr. Meera Nair ·{" "}
              <span className="font-mono">Aug 24</span>
            </>
          }
          right="Open"
          onClick={() => onNavigateTab("documents")}
        />

        {/* Account Balance Row */}
        <QuietRow
          icon={<CreditCard style={{ width: "16px", height: "16px" }} />}
          title="Account balance"
          subtitle={
            totalBalance > 0
              ? `${unpaidInvoices.length} pending invoice`
              : "All paid up · Receipt available"
          }
          right={totalBalance > 0 ? `$${totalBalance.toFixed(2)}` : "$0.00"}
          isRightMuted={totalBalance === 0}
          onClick={() => onNavigateTab("billing")}
        />
      </QuietList>

      {/* Quiet Footer */}
      <div className="text-center font-medium select-none mt-12 text-[11px] text-slate-400 dark:text-slate-500">
        MantraAssist · EyeMantra Daycare Surgical Portal
      </div>

      {/* Stage Detail Drawer (for Visit details & digital signature) */}
      {selectedDrawerStage && (
        <StageContentDrawer
          isOpen={Boolean(selectedDrawerStage)}
          onClose={() => setSelectedDrawerStage(null)}
          clientId={clientId}
          clientName={clientName}
          processId={selectedDrawerStage.process.id}
          processName={selectedDrawerStage.process.name}
          stageId={selectedDrawerStage.stage.id}
          stageName={selectedDrawerStage.stage.name}
          stageColor={selectedDrawerStage.stage.color}
          content={selectedDrawerStage.stage.patientFacingContent || null}
        />
      )}


      {/* Floating Developer Stage Simulator for Instant 1-Tap Testing */}
      <PatientStageDevBar
        clientId={clientId}
        process={cataractProcess}
        currentStageId={currentStageId}
        onStageChanged={(newStageId) => {
          const list = getClientProcessStages(clientId);
          if (list && list.length > 0) {
            setActiveStages(list);
          } else {
            setActiveStages([
              {
                processId: cataractProcess.id,
                processName: cataractProcess.name,
                stageId: newStageId,
                stageName:
                  newStageId === "pre-checkin"
                    ? "Morning (Pre-Checkin)"
                    : newStageId === "quiet"
                    ? "Days Later (Quiet)"
                    : processStagesList.find((s) => s.id === newStageId)?.name || newStageId,
                channel: "sms",
              },
            ]);
          }
        }}
      />
    </div>
  );
}
