import React, { useState, useEffect } from "react";
import { Mic, Sparkles } from "lucide-react";
import AIAssistantPopup from "./AIAssistantPopup";
import AIScribePopup from "../scribe/AIScribePopup";
import TranscriptDetailDrawer from "../scribe/TranscriptDetailDrawer";
import { ScribeSession } from "../../../lib/scribeSessionStore";

export const OPEN_SCRIBE_DRAWER_EVENT = "open-scribe-drawer";
export const OPEN_AI_ASSISTANT_EVENT = "open-ai-assistant";

export default function AIAssistantCapsule() {
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isNewConsultationOpen, setIsNewConsultationOpen] = useState(false);
  const [selectedDetailSession, setSelectedDetailSession] = useState<ScribeSession | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  // Global listener for opening Scribe or AI Assistant from anywhere in the app
  useEffect(() => {
    const handleOpenScribe = () => {
      setIsNewConsultationOpen(true);
    };
    const handleOpenAssistant = () => {
      setIsAssistantOpen(true);
    };
    window.addEventListener(OPEN_SCRIBE_DRAWER_EVENT, handleOpenScribe);
    window.addEventListener(OPEN_AI_ASSISTANT_EVENT, handleOpenAssistant);
    return () => {
      window.removeEventListener(OPEN_SCRIBE_DRAWER_EVENT, handleOpenScribe);
      window.removeEventListener(OPEN_AI_ASSISTANT_EVENT, handleOpenAssistant);
    };
  }, []);

  return (
    <>
      {/* ── Top Header AI Action Buttons (Crisp SaaS rectangular style) ── */}
      <div className="flex items-center gap-2 shrink-0" style={{ fontFamily: "Outfit, sans-serif" }}>
        {/* AI Scribe Button */}
        <button
          type="button"
          onClick={() => setIsNewConsultationOpen(true)}
          className="h-8 flex items-center gap-1.5 px-3 rounded-[8px] text-xs font-semibold text-[#1E293B] bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
          title="Start AI Scribe Consultation"
          aria-label="Start AI Scribe Consultation"
        >
          <Mic className="w-3.5 h-3.5 text-[#1E293B] shrink-0" />
          <span className="tracking-tight">Scribe</span>
        </button>

        {/* AI Assistant Button */}
        <button
          type="button"
          onClick={() => setIsAssistantOpen((prev) => !prev)}
          className={`h-8 flex items-center gap-1.5 px-3.5 rounded-[8px] text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer ${
            isAssistantOpen
              ? "bg-[#0F172A] text-white border border-slate-900 shadow-xs ring-2 ring-slate-900/15"
              : "bg-[#1E293B] hover:bg-[#0F172A] text-white border border-[#1E293B] shadow-xs"
          }`}
          title={isAssistantOpen ? "Close AI Clinical Assistant" : "Open AI Clinical Assistant"}
          aria-label="AI Assistant"
        >
          <Sparkles className="w-3.5 h-3.5 text-slate-200 shrink-0" />
          <span className="tracking-tight">AI Assistant</span>
        </button>
      </div>

      {/* ── Draggable AI Assistant Popup Window ── */}
      <AIAssistantPopup
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        onOpenScribe={() => {
          setIsAssistantOpen(false);
          setIsNewConsultationOpen(true);
        }}
      />

      {/* ── Slim Draggable AI Scribe Popup Window ── */}
      <AIScribePopup
        isOpen={isNewConsultationOpen}
        onClose={() => setIsNewConsultationOpen(false)}
        initialStep="record"
        zIndex={2147483645}
        onSessionCreated={() => {
          window.dispatchEvent(new Event("scribe-store-updated"));
        }}
        onViewTranscript={(newSession) => {
          setIsNewConsultationOpen(false);
          setSelectedDetailSession(newSession);
          setIsDetailDrawerOpen(true);
        }}
      />

      {/* ── Scribe Transcript Detail Drawer ── */}
      <TranscriptDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        session={selectedDetailSession}
        zIndex={2147483645}
      />
    </>
  );
}
