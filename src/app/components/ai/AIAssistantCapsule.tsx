import React, { useState, useRef, useEffect } from "react";
import { Mic, Sparkles, GripVertical } from "lucide-react";
import AIAssistantPopup from "./AIAssistantPopup";
import NewConsultationDrawer from "../scribe/NewConsultationDrawer";
import TranscriptDetailDrawer from "../scribe/TranscriptDetailDrawer";
import { ScribeSession } from "../../../lib/scribeSessionStore";

export const OPEN_SCRIBE_DRAWER_EVENT = "open-scribe-drawer";

export default function AIAssistantCapsule() {
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isNewConsultationOpen, setIsNewConsultationOpen] = useState(false);
  const [selectedDetailSession, setSelectedDetailSession] = useState<ScribeSession | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  // Capsule draggable position
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    const width = 250;
    const initialX = typeof window !== "undefined" ? Math.max(20, window.innerWidth - width - 28) : 900;
    const initialY = typeof window !== "undefined" ? Math.max(20, window.innerHeight - 56) : 700;
    return { x: initialX, y: initialY };
  });

  const isDraggingRef = useRef(false);
  const hasMovedRef = useRef(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  // Global listener for opening Scribe from other parts of the app
  useEffect(() => {
    const handleOpenScribe = () => {
      setIsNewConsultationOpen(true);
    };
    window.addEventListener(OPEN_SCRIBE_DRAWER_EVENT, handleOpenScribe);
    return () => {
      window.removeEventListener(OPEN_SCRIBE_DRAWER_EVENT, handleOpenScribe);
    };
  }, []);

  // Pointer drag events for the capsule
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position.x,
      startY: position.y,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasMovedRef.current = true;
    }

    const newX = Math.max(10, Math.min(window.innerWidth - 270, dragStartRef.current.startX + dx));
    const newY = Math.max(10, Math.min(window.innerHeight - 55, dragStartRef.current.startY + dy));
    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  return (
    <>
      {/* ── Single Unified Capsule Pill at Bottom (Draggable Anywhere) ── */}
      <div
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 2147483646,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="fixed flex items-center bg-[#0f172a] hover:bg-[#182230] text-white rounded-full p-1 pl-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.38)] border border-slate-700/60 backdrop-blur-xl select-none cursor-grab active:cursor-grabbing transition-shadow"
        title="Drag anywhere to reposition"
      >
        {/* Drag handle grip */}
        <div className="flex items-center text-slate-500 hover:text-slate-300 pr-1">
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        {/* ── 1. AI Scribe Section in Capsule ── */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (hasMovedRef.current) return;
            setIsNewConsultationOpen(true);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-white/10 active:bg-white/15 transition-all cursor-pointer text-xs font-semibold text-white group"
          title="Start AI Scribe Consultation"
        >
          {/* Live pulsing green dot */}
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>

          <Mic className="w-3.5 h-3.5 text-white group-hover:scale-110 transition-transform shrink-0" />
          <span className="tracking-wide whitespace-nowrap">AI Scribe</span>
        </button>

        {/* ── Subtle Divider ── */}
        <div className="w-px h-4 bg-slate-700/90 mx-0.5" />

        {/* ── 2. AI Assistant Section in Capsule ── */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (hasMovedRef.current) return;
            setIsAssistantOpen((prev) => !prev);
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all cursor-pointer text-xs font-semibold group ${
            isAssistantOpen
              ? "bg-[#1456f0] text-white shadow-xs"
              : "hover:bg-white/10 active:bg-white/15 text-white"
          }`}
          title="Open AI Clinical Assistant"
        >
          <Sparkles
            className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 shrink-0 ${
              isAssistantOpen ? "text-white" : "text-blue-400"
            }`}
          />
          <span className="tracking-wide whitespace-nowrap">AI Assistant</span>
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

      {/* ── Scribe Consultation Drawer ── */}
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

