import React, { useState, useEffect } from "react";
import { useOutletContext, useNavigate, useSearchParams } from "react-router";
import {
  Scan,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  User,
  Sparkles,
  Camera,
  RefreshCw,
  LayoutDashboard,
  Check,
  Zap,
} from "lucide-react";
import { Client, getStoredClients, saveStoredClients, moveClientToStage } from "../../../lib/clientsStore";
import { Process, Stage, getProcessesForPatientPortal } from "../../../lib/useProcessStore";
import { eventBus } from "../../../lib/eventBus";
import { appointmentService } from "../../../lib/appointmentService";
import { getStoredRules } from "../../../lib/useAutomationStore";

interface PortalContext {
  activeClient: Client;
  activeProcess: Process;
  currentStageName: string;
  currentStageIndex: number;
  stages: Stage[];
  onStageChange: (newStageName: string) => void;
}

export default function PatientCheckinScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeClient } = useOutletContext<PortalContext>();

  const [confirmed, setConfirmed] = useState(false);
  const [isScanningActive, setIsScanningActive] = useState(false);
  const [scanFlash, setScanFlash] = useState(false);

  const queryClientId = searchParams.get("clientId") || searchParams.get("id");

  // Helper to determine the target stage and process from active automation rules or portal processes
  const getTargetStageAndProcess = () => {
    try {
      const rules = getStoredRules();
      const checkinRule = rules.find(
        (r) =>
          r.enabled &&
          (r.trigger?.event === "client.checked_in" ||
            r.trigger?.event === "checked_in" ||
            r.trigger?.label?.toLowerCase().includes("checked in"))
      );
      const portalProcs = getProcessesForPatientPortal();
      const targetProcName =
        checkinRule?.action?.processName ||
        checkinRule?.actions?.[0]?.params?.processName ||
        activeClient?.processes?.find((pName) => portalProcs.some((p) => p.name === pName || p.id === pName)) ||
        portalProcs[0]?.name ||
        "Patient Care Journey";
      const targetStageName =
        checkinRule?.action?.stageName ||
        checkinRule?.actions?.[0]?.params?.stageName ||
        "Client Checked In";
      return { targetProcName, targetStageName };
    } catch {
      const portalProcs = getProcessesForPatientPortal();
      return {
        targetProcName: portalProcs[0]?.name || "Patient Care Journey",
        targetStageName: "Client Checked In",
      };
    }
  };

  // Check URL param: if arrived via QR code containing clientId, trigger check-in
  useEffect(() => {
    if (queryClientId) {
      const all = getStoredClients();
      const target = all.find((c) => c.id === queryClientId);
      if (target) {
        const { targetProcName, targetStageName } = getTargetStageAndProcess();
        moveClientToStage(target.id, targetStageName, targetProcName);

        eventBus.emit("client.checked_in", "client", target.id, {
          clientId: target.id,
          clientName: target.name,
          clientPhone: target.phone,
        });

        try {
          const appts = appointmentService.getAppointments();
          const userAppt = appts.find(
            (a) => String(a.clientId) === String(target.id) || a.clientName === target.name
          );
          if (userAppt) {
            appointmentService.checkInAppointment(userAppt.id);
          }
        } catch {}

        const updatedClients = getStoredClients().map((c) =>
          c.id === target.id
            ? {
                ...c,
                status: "Checked In",
                checkedInAt: new Date().toISOString(),
                stage: targetStageName,
                processes: Array.from(new Set([targetProcName, ...(c.processes || [])])),
              }
            : c
        );
        saveStoredClients(updatedClients);
        setConfirmed(true);
      }
    } else if (
      activeClient?.stage &&
      activeClient.stage !== "Confirmed" &&
      activeClient.stage !== "Not Assigned" &&
      activeClient.stage !== "Unregistered" &&
      (activeClient.processes?.length || 0) > 0
    ) {
      setConfirmed(true);
    }
  }, [queryClientId, activeClient?.id, activeClient?.stage, activeClient?.processes]);

  const handlePerformCheckIn = async () => {
    if (!activeClient) return;

    setIsScanningActive(true);
    setScanFlash(true);

    setTimeout(async () => {
      setScanFlash(false);

      const { targetProcName, targetStageName } = getTargetStageAndProcess();

      // 1. Move client to automation stage immediately in store and process logs
      moveClientToStage(activeClient.id, targetStageName, targetProcName);

      // 2. Trigger automation pipeline on check-in
      await eventBus.emit("client.checked_in", "client", activeClient.id, {
        clientId: activeClient.id,
        clientName: activeClient.name,
        clientPhone: activeClient.phone,
      });

      // 3. Mark appointment checked-in if exists
      try {
        const appts = appointmentService.getAppointments();
        const userAppt = appts.find(
          (a) => String(a.clientId) === String(activeClient.id) || a.clientName === activeClient.name
        );
        if (userAppt) {
          appointmentService.checkInAppointment(userAppt.id);
        }
      } catch {}

      // 4. Update client record with Checked In status and timestamp
      const freshClients = getStoredClients();
      const updated = freshClients.map((c) =>
        c.id === activeClient.id
          ? {
              ...c,
              status: "Checked In",
              checkedInAt: new Date().toISOString(),
              stage: targetStageName,
              processes: Array.from(new Set([targetProcName, ...(c.processes || [])])),
            }
          : c
      );
      saveStoredClients(updated);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("patient_portal_client_changed", { detail: activeClient.id })
        );
      }

      setIsScanningActive(false);
      setConfirmed(true);
    }, 700);
  };

  const overviewPath = activeClient?.id ? `/patient/${activeClient.id}` : "/patient";

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200/80 text-cyan-800 text-xs font-semibold">
          <Scan className="w-3.5 h-3.5 text-cyan-600" />
          <span>Hospital Arrival Check-In</span>
        </div>
        <h1
          className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
          style={{ fontFamily: "DM Sans, sans-serif" }}
        >
          Check-In QR Scanner
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto" style={{ fontFamily: "Outfit, sans-serif" }}>
          Scan the QR code displayed at the clinic reception desk or kiosk to verify your arrival.
        </p>
      </div>

      {/* Main Scanner Container Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
        {confirmed ? (
          /* Confirmed State: shows success and button to return to overview (no next step buttons) */
          <div className="text-center py-6 space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner border border-emerald-200">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Arrival Verified
              </span>
              <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                Welcome, {activeClient?.name}!
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto" style={{ fontFamily: "Outfit, sans-serif" }}>
                Your check-in has been recorded and synchronized with MantraAssist. You are now active in the care journey.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 max-w-sm mx-auto text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Patient:</span>
                <span className="font-semibold text-slate-800">{activeClient?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Checked In
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Time:</span>
                <span className="text-slate-600">{new Date().toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate(overviewPath)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition-all cursor-pointer active:scale-98"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Go to Overview</span>
              </button>

              <button
                type="button"
                onClick={() => setConfirmed(false)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Scan Again</span>
              </button>
            </div>
          </div>
        ) : (
          /* Live Scanner Viewfinder */
          <div className="space-y-6">
            {/* Camera Viewfinder Viewport */}
            <div className="relative aspect-[4/3] sm:aspect-[16/10] w-full bg-slate-950 rounded-2xl overflow-hidden shadow-inner flex flex-col items-center justify-center border border-slate-800">
              {/* Flash effect on scan complete */}
              {scanFlash && (
                <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-300 pointer-events-none" />
              )}

              {/* Subtle camera lens glare simulation */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.6)_0%,rgba(2,6,23,0.95)_100%)] pointer-events-none" />

              {/* HUD Header Bar */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-[11px] font-semibold text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>CAMERA LIVE</span>
                </div>
                <div className="px-2.5 py-1 rounded-md bg-slate-900/70 border border-slate-800 text-[10px] font-mono text-slate-400">
                  HD 1080P
                </div>
              </div>

              {/* Central Target Square with Scanning Crosshairs & Laser Beam */}
              <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-3xl border border-dashed border-emerald-400/40 flex items-center justify-center z-10">
                {/* 4 Corner Targeting Brackets */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl" />

                {/* Vertical Scanning Animated Laser */}
                <div
                  className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] z-20"
                  style={{
                    animation: "scannerLaser 2.2s ease-in-out infinite alternate",
                  }}
                />

                {/* Center Camera / Target Focus Reticle */}
                <div className="w-16 h-16 rounded-full border border-emerald-400/30 flex items-center justify-center bg-emerald-500/5">
                  <Camera className="w-7 h-7 text-emerald-400/80" />
                </div>
              </div>

              {/* Bottom Instructions inside Viewfinder */}
              <div className="absolute bottom-4 left-4 right-4 text-center z-20">
                <span className="inline-block px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-[11px] font-medium text-slate-300 border border-slate-700/60">
                  Align clinic reception QR code within the frame
                </span>
              </div>
            </div>

            {/* Inline CSS Animation for Laser */}
            <style>{`
              @keyframes scannerLaser {
                0% {
                  top: 10%;
                  opacity: 0.6;
                }
                50% {
                  top: 90%;
                  opacity: 1;
                }
                100% {
                  top: 10%;
                  opacity: 0.6;
                }
              }
            `}</style>

            {/* Action CTA: "Done (QR Scanned)" */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handlePerformCheckIn}
                disabled={isScanningActive}
                className={`w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl text-sm font-bold shadow-md transition-all cursor-pointer ${
                  isScanningActive
                    ? "bg-emerald-600 text-white animate-pulse"
                    : "bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white hover:shadow-blue-500/25"
                }`}
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {isScanningActive ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Verifying QR Code...</span>
                  </>
                ) : (
                  <>
                    <Scan className="w-5 h-5" />
                    <span>Done (QR Scanned) — Check In Now</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                Clicking <span className="font-semibold text-slate-600">Done (QR Scanned)</span> records your hospital arrival, runs the check-in automation, and moves you into the active care stage.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
