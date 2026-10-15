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
      {/* Capsule Slim Floating Scribe Widget (Toppest z-index above all drawers) */}
      {!isNewConsultationOpen && !isDetailDrawerOpen && (
        <div className="fixed bottom-5 right-5 pointer-events-auto" style={{ zIndex: 2147483647 }}>
          <button
            type="button"
            onClick={() => setIsNewConsultationOpen(true)}
            className="group flex items-center gap-1.5 h-8 px-3 rounded-full bg-gradient-to-r from-[#181e25] to-[#2c3e50] hover:from-[#11161c] hover:to-[#22303e] text-white shadow-[0_4px_16px_rgba(0,0,0,0.35)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.45)] transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] cursor-pointer border border-white/20 select-none backdrop-blur-md"
            title="Open AI Scribe"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {/* Live Indicator Dot */}
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>

            <Mic className="h-3.5 w-3.5 text-white group-hover:scale-110 transition-transform flex-shrink-0" />
            <span className="text-xs font-semibold tracking-wide text-white leading-none">
              Scribe
            </span>
          </button>
        </div>
      )}

      {/* New Consultation / Recording Drawer */}
      <NewConsultationDrawer
        isOpen={isNewConsultationOpen}
        onClose={() => setIsNewConsultationOpen(false)}
        zIndex={2147483640}
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
        zIndex={2147483645}
      />
    </>
  );
}
