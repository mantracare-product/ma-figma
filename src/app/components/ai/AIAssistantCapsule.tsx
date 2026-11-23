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
      {/* ── Top Header AI Action Buttons (Not floating) ── */}
      <div className="flex items-center gap-2 shrink-0">
        {/* AI Scribe Button */}
        <button
          type="button"
          onClick={() => setIsNewConsultationOpen(true)}
          className="h-8 flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200/90 shadow-2xs transition-all cursor-pointer"
          title="Start AI Scribe Consultation"
          aria-label="Start AI Scribe Consultation"
        >
          <Mic className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="tracking-tight text-slate-800">Scribe</span>
        </button>

        {/* AI Assistant Button */}
        <button
          type="button"
          onClick={() => setIsAssistantOpen((prev) => !prev)}
          className={`h-8 flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
            isAssistantOpen
              ? "bg-[#1456f0] text-white border border-[#1456f0] shadow-xs"
              : "bg-blue-50/90 text-[#1456f0] border border-blue-200/80 hover:bg-blue-100 hover:border-blue-300"
          }`}
          title={isAssistantOpen ? "Close AI Clinical Assistant" : "Open AI Clinical Assistant"}
          aria-label="AI Assistant"
        >
          <Sparkles
            className={`w-3.5 h-3.5 shrink-0 ${
              isAssistantOpen ? "text-white" : "text-[#1456f0]"
            }`}
          />
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
