/**
 * ConsoleApp.tsx
 * Path: src/reception/console/ConsoleApp.tsx
 *
 * Staff Station Queue Management Console:
 * - Station Switcher (Doctor Room, Pharmacy, Lab, Billing, Desk)
 * - Atomic "Call Next" with LockService mutex protection
 * - Ticket Lifecycle: Call, Recall, Serve, Complete & Route, Transfer, Skip, Requeue
 * - Real-time queue sync across multiple staff tabs via EventBusService + BroadcastChannel
 */

import React, { useState, useEffect } from "react";
import {
  Stethoscope,
  Volume2,
  Play,
  CheckCircle2,
  Forward,
  UserX,
  RotateCcw,
  Sparkles,
  Users,
  Clock,
  ArrowRight,
  Building2,
  RefreshCw,
  FileText,
  AlertCircle,
  X,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { getMaClient } from "../lib/api/maClient";
import type { Station, QueueTicket, Journey, PatientInvoiceSummary } from "../types/reception";

export default function ConsoleApp() {
  const maClient = getMaClient();

  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<string>("");
  const [queueTickets, setQueueTickets] = useState<QueueTicket[]>([]);
  const [activeTicket, setActiveTicket] = useState<QueueTicket | null>(null);
  const [activeJourney, setActiveJourney] = useState<Journey | null>(null);
  const [invoices, setInvoices] = useState<PatientInvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Transfer modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [targetStationId, setTargetStationId] = useState("");

  // Complete Stage modal state
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [nextStageStationType, setNextStageStationType] = useState<string>("pharmacy");

  // Load initial stations
  useEffect(() => {
    const loadStations = async () => {
      setLoading(true);
      try {
        const list = await maClient.getStations();
        setStations(list);
        if (list.length > 0) {
          setSelectedStationId(list[0].id);
        }
      } catch {
        toast.error("Failed to load stations.");
      } finally {
        setLoading(false);
      }
    };
    loadStations();
  }, [maClient]);

  // Load queue for selected station & subscribe to real-time updates
  useEffect(() => {
    if (!selectedStationId) return;

    const loadQueue = async () => {
      try {
        const tickets = await maClient.getStationQueue(selectedStationId);
        setQueueTickets(tickets);

        // Find currently called/serving ticket
        const active = tickets.find((t) => t.status === "called" || t.status === "serving");
        setActiveTicket(active || null);

        if (active?.journeyId) {
          try {
            const jrn = await maClient.getJourney(active.journeyId);
            setActiveJourney(jrn);
          } catch {}
        } else {
          setActiveJourney(null);
        }

        if (active?.clientId) {
          try {
            const invs = await maClient.getPatientInvoices(active.clientId);
            setInvoices(invs);
          } catch {}
        }
      } catch (err) {
        console.error("Failed to load queue tickets:", err);
      }
    };

    loadQueue();

    // Subscribe to realtime queue events
    const unsubscribe = maClient.subscribeToQueue(selectedStationId, () => {
      loadQueue();
    });

    return () => unsubscribe();
  }, [selectedStationId, maClient]);

  // Action: Call Next Patient (Atomic mutex locked)
  const handleCallNext = async () => {
    setActionLoading(true);
    try {
      const ticket = await maClient.callNextTicket(selectedStationId);
      if (ticket) {
        toast.success(`Called token ${ticket.tokenLabel || ticket.ticketNumber}!`);
        setActiveTicket(ticket);
      } else {
        toast.info("No waiting patients in this station's queue.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to call next ticket.");
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Recall
  const handleRecall = async () => {
    if (!activeTicket) return;
    setActionLoading(true);
    try {
      await maClient.recallTicket(activeTicket.id);
      toast.success(`Chime & Callout repeated for ${activeTicket.tokenLabel}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to recall.");
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Start Serving
  const handleStartServing = async () => {
    if (!activeTicket) return;
    setActionLoading(true);
    try {
      const updated = await maClient.serveTicket(activeTicket.id);
      setActiveTicket(updated);
      toast.success("Consultation in progress.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update status.");
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Complete & Route Next
  const handleConfirmComplete = async () => {
    if (!activeTicket) return;
    setActionLoading(true);
    try {
      const nextStageIds = nextStageStationType === "none" ? [] : [nextStageStationType];
      await maClient.completeTicket(activeTicket.id, nextStageIds, `console_comp_${Date.now()}`);
      toast.success("Stage completed & patient routed successfully!");
      setShowCompleteModal(false);
      setActiveTicket(null);
      setActiveJourney(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to complete ticket.");
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Transfer Ticket
  const handleConfirmTransfer = async () => {
    if (!activeTicket || !targetStationId) return;
    setActionLoading(true);
    try {
      await maClient.transferTicket(activeTicket.id, targetStationId, 1);
      toast.success("Ticket transferred to new station.");
      setShowTransferModal(false);
      setActiveTicket(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to transfer ticket.");
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Skip / No-Show
  const handleSkipTicket = async () => {
    if (!activeTicket) return;
    if (!confirm(`Mark token ${activeTicket.tokenLabel} as No-Show?`)) return;
    setActionLoading(true);
    try {
      await maClient.skipTicket(activeTicket.id, "no_show");
      toast.info(`Token ${activeTicket.tokenLabel} marked as No-Show.`);
      setActiveTicket(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to skip ticket.");
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Requeue with Priority Boost
  const handleRequeue = async () => {
    if (!activeTicket) return;
    setActionLoading(true);
    try {
      await maClient.requeueTicket(activeTicket.id, 2);
      toast.success(`Token ${activeTicket.tokenLabel} requeued with high priority.`);
      setActiveTicket(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to requeue.");
    } finally {
      setActionLoading(false);
    }
  };

  const selectedStation = stations.find((s) => s.id === selectedStationId);
  const waitingTickets = queueTickets.filter((t) => t.status === "waiting");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Outfit'] select-none">
      {/* 1. TOP HEADER & STATION SELECTOR */}
      <header className="h-20 bg-slate-900 border-b border-slate-800 px-6 md:px-8 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Staff Station Console</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Staff Terminal
              </span>
            </h1>
            <p className="text-xs text-slate-400">Queue progression & patient lifecycle routing</p>
          </div>
        </div>

        {/* Station Selector Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-400 hidden sm:inline">Active Station:</label>
          <select
            value={selectedStationId}
            onChange={(e) => setSelectedStationId(e.target.value)}
            className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-blue-500 cursor-pointer shadow-inner"
          >
            {stations.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name} ({st.type})
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* 2. MAIN CONSOLE SPLIT VIEW */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: ACTIVE PATIENT CALL CARD & CONTROLS (7 COLS) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Primary Action Hero Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Station Workspace
                </span>
                <h2 className="text-2xl font-bold text-white mt-0.5">
                  {selectedStation?.name || "Station"}
                </h2>
              </div>

              {activeTicket ? (
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                  ● {activeTicket.status === "serving" ? "In Progress" : "Called"}
                </span>
              ) : (
                <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                  Ready for Next
                </span>
              )}
            </div>

            {/* Currently Active Patient Card */}
            {activeTicket ? (
              <div className="p-6 bg-gradient-to-b from-slate-950 to-slate-900 border-2 border-blue-500/40 rounded-3xl space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                      Currently Serving
                    </span>
                    <div className="text-5xl font-black font-mono text-white tracking-tight py-1">
                      {activeTicket.tokenLabel || activeTicket.ticketNumber}
                    </div>
                    <h3 className="text-lg font-bold text-slate-200">
                      {activeTicket.clientName || activeTicket.patientName || "Patient"}
                    </h3>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                      Priority {activeTicket.priority}
                    </span>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {activeTicket.scheduledTime ? `Apt: ${activeTicket.scheduledTime}` : "Walk-in"}
                    </p>
                  </div>
                </div>

                {/* Patient Invoices quick preview */}
                {invoices.length > 0 && (
                  <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      Pending Invoice: {invoices[0].invoiceNumber}
                    </span>
                    <span className="font-mono font-bold text-amber-400">
                      ${invoices[0].amount} ({invoices[0].status})
                    </span>
                  </div>
                )}

                {/* Primary Action Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleRecall}
                    className="py-3 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4 text-blue-400" />
                    Recall
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading || activeTicket.status === "serving"}
                    onClick={handleStartServing}
                    className="py-3 px-3 rounded-2xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-bold flex items-center justify-center gap-1.5 border border-blue-500/30 transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 text-blue-400" />
                    Start
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => setShowCompleteModal(true)}
                    className="py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Complete
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => setShowTransferModal(true)}
                    className="py-3 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                  >
                    <Forward className="w-4 h-4 text-purple-400" />
                    Transfer
                  </button>
                </div>

                {/* Secondary Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleSkipTicket}
                    className="hover:text-red-400 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    Mark No-Show
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleRequeue}
                    className="hover:text-amber-400 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Requeue (Priority Boost)
                  </button>
                </div>
              </div>
            ) : (
              /* No Active Patient -> Big "Call Next" Button */
              <div className="py-12 text-center space-y-6">
                <div className="w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto text-blue-400">
                  <Users className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-white">Station is Idle</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {waitingTickets.length} patient(s) currently waiting in this station's queue.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={actionLoading || waitingTickets.length === 0}
                  onClick={handleCallNext}
                  className="w-full max-w-md mx-auto py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-bold text-lg transition-all shadow-xl shadow-blue-600/30 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-40 active:scale-[0.99]"
                >
                  <Volume2 className="w-6 h-6" />
                  {actionLoading ? "Acquiring Mutex Lock..." : "Call Next Patient"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: WAITING QUEUE LIST (5 COLS) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              <span>Station Queue</span>
            </h3>
            <span className="text-xs font-mono font-bold text-slate-400">
              {waitingTickets.length} Waiting
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-3 min-h-[480px] max-h-[640px] flex flex-col justify-between">
            <div className="space-y-3 overflow-y-auto pr-1">
              {waitingTickets.length > 0 ? (
                waitingTickets.map((tkt, idx) => (
                  <div
                    key={tkt.id}
                    className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="w-7 h-7 rounded-xl bg-slate-800 text-slate-400 font-mono font-bold text-xs flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <div>
                        <h4 className="text-base font-bold font-mono text-white">
                          {tkt.tokenLabel || tkt.ticketNumber}
                        </h4>
                        <p className="text-xs text-slate-400">{tkt.clientName || tkt.patientName || "Patient"}</p>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                        ~{tkt.estimatedWaitMin || (idx + 1) * 10}m
                      </span>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {tkt.scheduledTime || "Walk-in"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-24 text-center text-slate-500 space-y-2">
                  <Users className="w-10 h-10 mx-auto text-slate-700" />
                  <p className="text-sm font-bold">No waiting patients</p>
                  <p className="text-xs">New check-ins will appear in real time</p>
                </div>
              )}
            </div>

            {/* Quick Stats Banner */}
            <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Avg Consultation</span>
                <p className="text-sm font-bold text-white font-mono mt-0.5">12 mins</p>
              </div>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Completed Today</span>
                <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                  {queueTickets.filter((t) => t.status === "done" || t.status === "completed").length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* COMPLETE STAGE & ROUTING MODAL */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 text-white shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold">Complete Stage & Route Patient</h3>
              <button
                onClick={() => setShowCompleteModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Select the next department or checkout stage for token <strong className="text-white font-mono">{activeTicket?.tokenLabel}</strong>:
            </p>

            <div className="space-y-2">
              {[
                { id: "pharmacy", label: "Route to In-House Pharmacy (Counter A)" },
                { id: "billing", label: "Route to Billing & Cashier Desk" },
                { id: "lab", label: "Route to Diagnostic Lab (Counter 1)" },
                { id: "none", label: "Visit Complete / Exit Clinic" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setNextStageStationType(opt.id)}
                  className={`w-full p-3.5 rounded-2xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                    nextStageStationType === opt.id
                      ? "bg-emerald-600/20 border-emerald-500 text-emerald-300"
                      : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <span>{opt.label}</span>
                  {nextStageStationType === opt.id && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmComplete}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-emerald-600/20"
              >
                Confirm Completion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSFER TICKET MODAL */}
      {showTransferModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 text-white shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold">Transfer Token</h3>
              <button
                onClick={() => setShowTransferModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Select Destination Station
              </label>
              <select
                value={targetStationId}
                onChange={(e) => setTargetStationId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="">Select Target Station...</option>
                {stations
                  .filter((s) => s.id !== selectedStationId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.type})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!targetStationId || actionLoading}
                onClick={handleConfirmTransfer}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-600/20 disabled:opacity-50"
              >
                Transfer Token
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
