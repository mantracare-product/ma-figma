import { useState, useEffect } from "react";
import { Mic } from "lucide-react";
import NewConsultationDrawer from "./NewConsultationDrawer";
import TranscriptDetailDrawer from "./TranscriptDetailDrawer";
import { ScribeSession } from "../../../lib/scribeSessionStore";

export const OPEN_SCRIBE_DRAWER_EVENT = "open-scribe-drawer";

export default function AIScribeFloatingWidget() {
  const [isNewConsultationOpen, setIsNewConsultationOpen] = useState(false);
  const [selectedDetailSession, setSelectedDetailSession] = useState<ScribeSession | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  useEffect(() => {
    const handleOpenEvent = () => {
      setIsNewConsultationOpen(true);
    };
    window.addEventListener(OPEN_SCRIBE_DRAWER_EVENT, handleOpenEvent);
    return () => {
      window.removeEventListener(OPEN_SCRIBE_DRAWER_EVENT, handleOpenEvent);
    };
  }, []);

  return (
    <>
      {/* Simple Clean Circular Floating Action Widget */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsNewConsultationOpen(true)}
          className="group relative flex flex-col items-center justify-center h-14 w-14 rounded-full bg-gradient-to-r from-[#181e25] to-[#2c3e50] hover:from-[#11161c] hover:to-[#22303e] text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer border border-white/15"
          title="Open AI Scribe"
        >
          {/* Live Indicator Dot */}
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>

          <Mic className="h-4 w-4 text-white group-hover:scale-110 transition-transform" />
          <span
            className="text-[9px] font-bold tracking-tight text-slate-200 mt-0.5 leading-none"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Scribe
          </span>
        </button>
      </div>

      {/* New Consultation / Recording Drawer */}
      <NewConsultationDrawer
        isOpen={isNewConsultationOpen}
        onClose={() => setIsNewConsultationOpen(false)}
        onSessionCreated={() => {
          window.dispatchEvent(new Event("scribe-store-updated"));
        }}
        onViewTranscript={(newSession) => {
          setIsNewConsultationOpen(false);
          setSelectedDetailSession(newSession);
          setIsDetailDrawerOpen(true);
        }}
      />

      {/* Transcript Detail Drawer */}
      <TranscriptDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        session={selectedDetailSession}
      />
    </>
  );
}
