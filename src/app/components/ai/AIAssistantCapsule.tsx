import React, { useState, useRef, useEffect } from "react";
import { Mic, Sparkles, GripVertical, ChevronRight, ChevronLeft } from "lucide-react";
import AIAssistantPopup from "./AIAssistantPopup";
import AIScribePopup from "../scribe/AIScribePopup";
import TranscriptDetailDrawer from "../scribe/TranscriptDetailDrawer";
import { ScribeSession } from "../../../lib/scribeSessionStore";

export const OPEN_SCRIBE_DRAWER_EVENT = "open-scribe-drawer";

export default function AIAssistantCapsule() {
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isNewConsultationOpen, setIsNewConsultationOpen] = useState(false);
  const [selectedDetailSession, setSelectedDetailSession] = useState<ScribeSession | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  // Collapsed / hidden state (persisted in localStorage)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("mantra_ai_capsule_collapsed") === "true";
    }
    return false;
  });

  const handleToggleCollapse = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    try {
      localStorage.setItem("mantra_ai_capsule_collapsed", String(collapsed));
    } catch {}
  };

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
      {/* ── 1. Expanded Horizontal Capsule (Draggable Anywhere) ── */}
      {!isCollapsed && (
        <div
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            zIndex: 2147483646,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="fixed flex items-center bg-[#0f172a] hover:bg-[#182230] text-white rounded-full p-1 pl-1.5 pr-1 shadow-[0_8px_30px_rgba(0,0,0,0.38)] border border-slate-700/60 backdrop-blur-xl select-none cursor-grab active:cursor-grabbing transition-shadow animate-in fade-in zoom-in-95 duration-150"
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

          {/* ── Subtle Divider ── */}
          <div className="w-px h-4 bg-slate-700/90 mx-0.5" />

          {/* ── 3. Hide / Collapse to Right Corner Chevron Button ── */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (hasMovedRef.current) return;
              handleToggleCollapse(true);
            }}
            className="flex items-center justify-center p-1.5 rounded-full hover:bg-white/10 active:bg-white/15 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Hide capsule to right corner"
            aria-label="Hide capsule"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── 2. Collapsed Vertical Capsule in Right Corner (Icons Only) ── */}
      {isCollapsed && (
        <div
          style={{
            zIndex: 2147483646,
          }}
          className="fixed right-3 bottom-6 flex flex-col items-center bg-[#0f172a] hover:bg-[#182230] text-white rounded-full p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.45)] border border-slate-700/60 backdrop-blur-xl select-none transition-all duration-200 animate-in fade-in slide-in-from-right-3"
          title="AI Tools"
        >
          {/* Unhide / Expand Chevron Button */}
          <button
            type="button"
            onClick={() => handleToggleCollapse(false)}
            className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-white/10 active:bg-white/15 text-slate-400 hover:text-white transition-all cursor-pointer group"
            title="Expand AI capsule"
            aria-label="Expand AI capsule"
          >
            <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          </button>

          {/* Divider */}
          <div className="w-4 h-px bg-slate-700/90 my-1" />

          {/* AI Scribe (Icon only) */}
          <button
            type="button"
            onClick={() => setIsNewConsultationOpen(true)}
            className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-white/10 active:bg-white/15 transition-all cursor-pointer text-white group"
            title="Start AI Scribe Consultation"
            aria-label="AI Scribe"
          >
            <Mic className="w-3.5 h-3.5 text-white group-hover:scale-110 transition-transform" />
          </button>

          {/* Divider */}
          <div className="w-4 h-px bg-slate-700/90 my-1" />

          {/* AI Assistant (Icon only) */}
          <button
            type="button"
            onClick={() => setIsAssistantOpen((prev) => !prev)}
            className={`flex items-center justify-center w-7 h-7 rounded-full transition-all cursor-pointer group ${
              isAssistantOpen
                ? "bg-[#1456f0] text-white shadow-xs"
                : "hover:bg-white/10 active:bg-white/15 text-white"
            }`}
            title="Open AI Clinical Assistant"
            aria-label="AI Assistant"
          >
            <Sparkles
              className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 ${
                isAssistantOpen ? "text-white" : "text-blue-400"
              }`}
            />
          </button>
        </div>
      )}

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

