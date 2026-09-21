/**
 * DisplayApp.tsx
 * Path: src/reception/display/DisplayApp.tsx
 *
 * Public Waiting Lounge TV Queue Display Board:
 * - High-contrast full-screen 1080p/4K layout
 * - Real-time "Now Serving" and "Next Up" queue lists
 * - Audio Chime & Web Speech API Voice Token Callout
 * - Flashing visual alert for newly called tickets
 * - Live clinic info, date/time, and health marquee ticker
 * - Runs in its own window/tab to prevent background throttling
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Clock,
  HeartPulse,
  Sparkles,
  MapPin,
  Bell,
  ArrowRight,
  Tv,
  Info,
} from "lucide-react";
import { getMaClient } from "../lib/api/maClient";
import type { DisplayEvent, QueueTicket } from "../types/reception";

export default function DisplayApp() {
  const maClient = getMaClient();

  const [nowServing, setNowServing] = useState<QueueTicket[]>([]);
  const [nextUp, setNextUp] = useState<QueueTicket[]>([]);
  const [lastCalledTicket, setLastCalledTicket] = useState<QueueTicket | null>(null);
  const [flashingTicketId, setFlashingTicketId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");

  const prevCalledIdRef = useRef<string | null>(null);

  // Digital Clock & Date
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
      );
      setDateStr(
        now.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric", year: "numeric" })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch initial queue tickets
  useEffect(() => {
    const loadInitialState = async () => {
      try {
        const stations = await maClient.getStations();
        const allTickets: QueueTicket[] = [];
        for (const st of stations) {
          const q = await maClient.getStationQueue(st.id);
          allTickets.push(...q);
        }

        const serving = allTickets.filter((t) => t.status === "called" || t.status === "serving");
        const waiting = allTickets
          .filter((t) => t.status === "waiting")
          .sort((a, b) => b.priority - a.priority || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        setNowServing(serving);
        setNextUp(waiting);
      } catch (err) {
        console.error("Failed to load display state:", err);
      }
    };

    loadInitialState();
  }, [maClient]);

  // Subscribe to real-time display broadcast events
  useEffect(() => {
    const unsubscribe = maClient.subscribeToDisplay("default", (event: DisplayEvent) => {
      setNowServing(event.nowServing || []);
      setNextUp(event.nextUp || []);

      // If a ticket was just called
      const called = event.nowServing.find((t) => t.status === "called");
      if (called && called.id !== prevCalledIdRef.current) {
        prevCalledIdRef.current = called.id;
        setLastCalledTicket(called);
        setFlashingTicketId(called.id);

        // Flash for 6 seconds
        setTimeout(() => {
          setFlashingTicketId(null);
        }, 6000);

        // Play audio chime and speak token callout
        if (!isMuted) {
          playChimeAndCallout(called);
        }
      }
    });

    return () => unsubscribe();
  }, [maClient, isMuted]);

  // Audio Synthesis and Web Chime
  const playChimeAndCallout = (ticket: QueueTicket) => {
    try {
      // 1. Synthesize Web Audio Chime Ding-Dong
      if (typeof window !== "undefined" && (window.AudioContext || (window as any).webkitAudioContext)) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(587.33, now); // D5
        osc1.frequency.setValueAtTime(880, now + 0.15); // A5
        gain1.gain.setValueAtTime(0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.8);
      }

      // 2. Speech Callout
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        setTimeout(() => {
          window.speechSynthesis.cancel();
          const tokenCode = (ticket.tokenLabel || ticket.ticketNumber || "").split("").join(" ");
          const station = ticket.stationName || "Room 101";
          const text = `Token ${tokenCode}. Please proceed to ${station}.`;
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.95;
          utterance.pitch = 1.05;
          window.speechSynthesis.speak(utterance);
        }, 600);
      }
    } catch (err) {
      console.warn("Audio chime error:", err);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-['Outfit'] select-none overflow-hidden">
      {/* 1. TOP HEADER BAR */}
      <header className="h-24 bg-slate-900 border-b border-slate-800 px-8 flex items-center justify-between shadow-2xl">
        {/* Clinic Identity */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
            <HeartPulse className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight text-white">
                MantraCare Clinic
              </h1>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                LIVE OPD QUEUE
              </span>
            </div>
            <p className="text-xs text-slate-400">Outpatient Department • Central Waiting Lounge</p>
          </div>
        </div>

        {/* Live Digital Clock & Controls */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-2xl md:text-3xl font-black font-mono tracking-wider text-emerald-400">
              {timeStr}
            </div>
            <p className="text-xs text-slate-400 font-medium">{dateStr}</p>
          </div>

          <div className="flex items-center gap-2 border-l border-slate-800 pl-6">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all cursor-pointer ${
                isMuted
                  ? "bg-slate-800 text-slate-400 border-slate-700"
                  : "bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20"
              }`}
              title={isMuted ? "Unmute Token Chime" : "Mute Token Chime"}
            >
              {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="w-12 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center justify-center transition-all cursor-pointer"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN SPLIT BOARD DISPLAY */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 md:p-8">
        {/* LEFT / HERO SECTION: NOW SERVING (7 COLS) */}
        <section className="lg:col-span-7 flex flex-col space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <h2 className="text-xl md:text-2xl font-black tracking-wider uppercase text-emerald-400">
                Now Serving
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
              {nowServing.length} Active Stations
            </span>
          </div>

          {nowServing.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
              {nowServing.map((tkt) => {
                const isFlashing = flashingTicketId === tkt.id;
                return (
                  <div
                    key={tkt.id}
                    className={`relative rounded-3xl border p-6 flex flex-col justify-between transition-all duration-300 shadow-2xl overflow-hidden ${
                      isFlashing
                        ? "bg-gradient-to-b from-blue-900 to-indigo-950 border-blue-400 ring-4 ring-blue-500/50 scale-[1.02] animate-pulse"
                        : "bg-slate-900/90 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {/* Top Station Tag */}
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1.5 border border-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-blue-400" />
                        {tkt.stationName}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {tkt.status === "serving" ? "In Consultation" : "Called"}
                      </span>
                    </div>

                    {/* Giant Token Code */}
                    <div className="my-4 text-center">
                      <div className="text-6xl md:text-7xl font-black font-mono tracking-tight text-white text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-200 to-emerald-400 drop-shadow-md">
                        {tkt.tokenLabel || tkt.ticketNumber}
                      </div>
                    </div>

                    {/* Patient info */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">
                        Patient: <strong className="text-white">{tkt.clientName || tkt.patientName || "Patient"}</strong>
                      </span>
                      {tkt.calledAt && (
                        <span className="text-[11px] text-blue-400 font-mono">
                          Called {new Date(tkt.calledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 bg-slate-900/40 border border-slate-800/80 rounded-3xl flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500">
                <Bell className="w-8 h-8" />
              </div>
              <p className="text-lg font-bold text-slate-300">All Consultations Clear</p>
              <p className="text-xs text-slate-500 max-w-sm">
                Next patient token will flash here automatically when called by clinic staff.
              </p>
            </div>
          )}
        </section>

        {/* RIGHT SECTION: NEXT UP QUEUE LIST (5 COLS) */}
        <section className="lg:col-span-5 flex flex-col space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl md:text-2xl font-black tracking-wider uppercase text-blue-400">
                Next Up
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
              Waiting ({nextUp.length})
            </span>
          </div>

          <div className="flex-1 bg-slate-900/80 border border-slate-800 rounded-3xl p-5 overflow-hidden shadow-2xl flex flex-col justify-between">
            <div className="space-y-3 overflow-y-auto max-h-[580px] pr-1">
              {nextUp.length > 0 ? (
                nextUp.slice(0, 7).map((tkt, idx) => (
                  <div
                    key={tkt.id}
                    className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-2xl flex items-center justify-between hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-7 h-7 rounded-xl bg-slate-800 text-slate-400 font-mono font-bold text-xs flex items-center justify-center border border-slate-700">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="text-xl font-black font-mono text-white">
                          {tkt.tokenLabel || tkt.ticketNumber}
                        </div>
                        <p className="text-xs text-slate-400">
                          {tkt.stationName || "Clinical Queue"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        ~{tkt.estimatedWaitMin || (idx + 1) * 10} min
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-24 text-center text-slate-500 space-y-2">
                  <p className="text-sm font-bold">Queue is currently empty</p>
                  <p className="text-xs">Checked-in patients will appear here</p>
                </div>
              )}
            </div>

            {/* Bottom Waiting lounge notice */}
            <div className="mt-4 p-3.5 bg-blue-950/40 border border-blue-500/20 rounded-2xl flex items-center gap-3 text-xs text-blue-200">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span>Please keep your token slip ready. Tokens are called by audio chime & screen flash.</span>
            </div>
          </div>
        </section>
      </main>

      {/* 3. BOTTOM TICKER / MARQUEE BAR */}
      <footer className="h-14 bg-slate-900 border-t border-slate-800 px-8 flex items-center justify-between text-xs text-slate-400 overflow-hidden">
        <div className="flex items-center gap-3 flex-shrink-0 pr-6 border-r border-slate-800">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-white uppercase tracking-wider font-mono">CLINIC UPDATE</span>
        </div>

        <div className="flex-1 overflow-hidden px-6">
          <div className="whitespace-nowrap animate-[marquee_25s_linear_infinite] text-slate-300 font-medium">
            🔔 Please have your ID and insurance card ready at billing • 💊 In-house Pharmacy is open on Ground Floor Counter A • 🚗 Validated parking tickets available at Front Desk • 🪪 Use Kiosk at Entrance for Instant Walk-in Check-in
          </div>
        </div>

        <div className="text-[11px] text-slate-500 flex-shrink-0 pl-6 border-l border-slate-800 font-mono">
          MantraAssist TV v1.0
        </div>
      </footer>
    </div>
  );
}
