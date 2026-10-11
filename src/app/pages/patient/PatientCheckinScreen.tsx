import React, { useState, useEffect } from "react";
import { useOutletContext, useNavigate, useSearchParams } from "react-router";
import {
  QrCode,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  User,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Camera,
  RotateCw,
} from "lucide-react";
import { Client, getStoredClients, saveStoredClients, CLIENTS_STORE_EVENT } from "../../../lib/clientsStore";
import { Process, Stage } from "../../../lib/useProcessStore";

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
  const { activeClient, onStageChange } = useOutletContext<PortalContext>();

  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const queryClientId = searchParams.get("clientId") || searchParams.get("id");

  // Check URL param: if arrived via QR code containing clientId, auto confirm Stage 1
  useEffect(() => {
    if (queryClientId) {
      const all = getStoredClients();
      const target = all.find((c) => c.id === queryClientId);
      if (target) {
        const updated = all.map((c) =>
          c.id === queryClientId
            ? { ...c, stage: "Client Checked In", processes: Array.from(new Set(["Patient Care Journey", ...(c.processes || [])])) }
            : c
        );
        saveStoredClients(updated);
        setConfirmed(true);
      }
    } else if (activeClient?.stage === "Client Checked In") {
      setConfirmed(true);
    }
  }, [queryClientId, activeClient?.id, activeClient?.stage]);

  const qrScanUrl = typeof window !== "undefined"
    ? `${window.location.origin}/patient/checkin?clientId=${activeClient?.id || "CL-001"}`
    : `https://mantracare.app/patient/checkin?clientId=${activeClient?.id || "CL-001"}`;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(qrScanUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePerformCheckIn = () => {
    if (!activeClient) return;
    const all = getStoredClients();
    const updated = all.map((c) =>
      c.id === activeClient.id
        ? { ...c, stage: "Client Checked In", processes: Array.from(new Set(["Patient Care Journey", ...(c.processes || [])])) }
        : c
    );
    saveStoredClients(updated);
    setConfirmed(true);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200/80 text-cyan-800 text-xs font-semibold">
          <QrCode className="w-3.5 h-3.5 text-cyan-600" />
          <span>Stage 1 of 5 • Client Checked In</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Patient Self-Service Check-In
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Scan your clinic arrival QR code or confirm check-in below to mark your status in the shared data layer.
        </p>
      </div>

      {/* Main Check-In Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
        {confirmed ? (
          <div className="text-center py-6 space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner border border-emerald-200">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Check-in Confirmed
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                Welcome, {activeClient?.name}!
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Your check-in has been recorded in the canonical client record (ID: {activeClient?.id}) and is visible across the AI Receptionist and MantraAssist dashboard.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 max-w-md mx-auto text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Patient:</span>
                <span className="font-semibold text-slate-800">{activeClient?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Stage:</span>
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Client Checked In
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Timestamp:</span>
                <span className="text-slate-600">{new Date().toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/patient/book")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-all"
              >
                <span>Continue to Book Appointment (Stage 2)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate("/patient")}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors"
              >
                View Journey Status
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Left: QR Code Display */}
            <div className="flex flex-col items-center text-center p-6 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-4">
              <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-200/80">
                {/* SVG QR Code Representation */}
                <svg
                  className="w-44 h-44"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect width="100" height="100" fill="white" />
                  {/* Top-left locator */}
                  <rect x="10" y="10" width="26" height="26" rx="4" fill="#0F172A" />
                  <rect x="14" y="14" width="18" height="18" rx="2" fill="white" />
                  <rect x="18" y="18" width="10" height="10" fill="#0F172A" />

                  {/* Top-right locator */}
                  <rect x="64" y="10" width="26" height="26" rx="4" fill="#0F172A" />
                  <rect x="68" y="14" width="18" height="18" rx="2" fill="white" />
                  <rect x="72" y="18" width="10" height="10" fill="#0F172A" />

                  {/* Bottom-left locator */}
                  <rect x="10" y="64" width="26" height="26" rx="4" fill="#0F172A" />
                  <rect x="14" y="68" width="18" height="18" rx="2" fill="white" />
                  <rect x="18" y="72" width="10" height="10" fill="#0F172A" />

                  {/* Data patterns */}
                  <rect x="42" y="12" width="6" height="6" fill="#0F172A" />
                  <rect x="52" y="12" width="6" height="6" fill="#0F172A" />
                  <rect x="42" y="24" width="6" height="12" fill="#0F172A" />
                  <rect x="52" y="30" width="6" height="6" fill="#0F172A" />

                  <rect x="12" y="44" width="6" height="6" fill="#0F172A" />
                  <rect x="24" y="44" width="12" height="6" fill="#0F172A" />
                  <rect x="42" y="44" width="16" height="16" rx="2" fill="#2563EB" />
                  <rect x="64" y="44" width="6" height="6" fill="#0F172A" />
                  <rect x="76" y="44" width="12" height="6" fill="#0F172A" />

                  <rect x="12" y="54" width="6" height="6" fill="#0F172A" />
                  <rect x="24" y="54" width="6" height="6" fill="#0F172A" />
                  <rect x="64" y="54" width="12" height="6" fill="#0F172A" />
                  <rect x="82" y="54" width="6" height="6" fill="#0F172A" />

                  <rect x="42" y="68" width="6" height="12" fill="#0F172A" />
                  <rect x="52" y="68" width="12" height="6" fill="#0F172A" />
                  <rect x="52" y="80" width="6" height="10" fill="#0F172A" />
                  <rect x="68" y="68" width="8" height="8" fill="#0F172A" />
                  <rect x="80" y="76" width="10" height="14" fill="#0F172A" />
                </svg>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Arrival QR Code
                </span>
                <div className="text-xs font-semibold text-slate-800 mt-0.5">
                  Encodes Patient ID: {activeClient?.id}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Link Copied!" : "Copy Check-in URL"}</span>
              </button>
            </div>

            {/* Right: Check-in Actions */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/60 text-xs text-blue-900 space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-blue-800">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Simulate QR Scan Flow
                </div>
                <p className="text-blue-700/90 leading-relaxed text-[11px]">
                  When scanned with a mobile camera, this QR loads this page with <code className="font-mono bg-white/70 px-1 py-0.5 rounded text-blue-950">?clientId={activeClient?.id}</code> and instantly updates the canonical client record to Stage 1.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handlePerformCheckIn}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Check-In for {activeClient?.name}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const params = new URLSearchParams(window.location.search);
                    params.set("clientId", activeClient?.id || "CL-001");
                    navigate({ pathname: "/patient/checkin", search: params.toString() });
                    handlePerformCheckIn();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors"
                >
                  <Camera className="w-3.5 h-3.5 text-slate-500" />
                  <span>Simulate Mobile QR Scan Action</span>
                </button>
              </div>

              <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Writes stage "Client Checked In" to clientsStore.ts</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
