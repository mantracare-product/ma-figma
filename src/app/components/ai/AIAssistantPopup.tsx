import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  ArrowUp,
  Paperclip,
  X,
  Minus,
  RotateCcw,
  ChevronRight,
  GripHorizontal,
  FileText,
} from "lucide-react";
import symbolLogo from "../../../imports/Ma-symbol-mark.png";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";

interface AIAssistantPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenScribe?: () => void;
}

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
}

export default function AIAssistantPopup({
  isOpen,
  onClose,
  onOpenScribe,
}: AIAssistantPopupProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);

  // Free-form Draggable window state
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    const initialWidth = 370;
    const initialHeight = 560;
    const initialX = typeof window !== "undefined" ? Math.max(20, window.innerWidth - initialWidth - 28) : 900;
    const initialY = typeof window !== "undefined" ? Math.max(20, window.innerHeight - initialHeight - 75) : 140;
    return { x: initialX, y: initialY };
  });

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  // Calculate dynamic time of day greeting
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const displayName = user?.name && !user.name.toLowerCase().includes("admin")
    ? user.name.split(" ")[0]
    : "Navodya";

  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Window drag handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
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
    const newX = Math.max(10, Math.min(window.innerWidth - 380, dragStartRef.current.startX + dx));
    const newY = Math.max(10, Math.min(window.innerHeight - 150, dragStartRef.current.startY + dy));
    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  if (!isOpen) return null;

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || query).trim();
    if (!text && !attachedFileName) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: attachedFileName ? `[Attached: ${attachedFileName}] ${text}` : text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuery("");
    setAttachedFileName(null);
    setIsTyping(true);

    setTimeout(() => {
      let replyText = "";
      const lower = text.toLowerCase();

      if (lower.includes("treatment options") || lower.includes("hypertension") || lower.includes("options for")) {
        replyText =
          "Based on current ACC/AHA guidelines for Stage 1 & 2 Hypertension, first-line pharmacological options include:\n\n" +
          "1. **ACE Inhibitors / ARBs**: Lisinopril 10mg daily or Losartan 50mg daily.\n" +
          "2. **Thiazide Diuretics**: Chlorthalidone 12.5-25mg or HCTZ.\n" +
          "3. **CCBs**: Amlodipine 5mg daily for elderly or diabetic cohorts.\n\n" +
          "Would you like me to draft a clinical prescription or initiate an AI Scribe encounter?";
      } else if (lower.includes("medical notes") || lower.includes("review")) {
        replyText =
          "I've scanned recent encounters for today's roster. Dr. Jenkins has 3 pending SOAP notes requiring attestation:\n\n" +
          "• **Sarah Connor** (General Consultation): Vitals normal, pending CBC lab sign-off.\n" +
          "• **Michael Chang** (Post-op Follow-up): Wound healing well, suture removal scheduled.\n\n" +
          "All records conform to ICD-10 coding standards.";
      } else if (lower.includes("availability") || lower.includes("provider") || lower.includes("doctor")) {
        replyText =
          "Here is today's live provider roster:\n\n" +
          "• **Dr. Jenkins** (Cardiology): Next opening at **2:30 PM** (Room 101).\n" +
          "• **Dr. Sarah Patel** (Pediatrics): Next opening at **3:15 PM** (Room 204).\n" +
          "• **Dr. Miller** (Dermatology): Fully booked until 4:45 PM.\n\n" +
          "Would you like to book an appointment directly?";
      } else {
        replyText =
          `I've analyzed your query regarding "${text}". Mantra Clinical Intelligence is synchronized with your EHR database and active clinic queue. How would you like to proceed?`;
      }

      const assistantMsg: ChatMessage = {
        id: `reply-${Date.now()}`,
        sender: "assistant",
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 800);
  };

  const handleVoiceToggle = () => {
    if (!isListening) {
      setIsListening(true);
      toast.info("Listening for clinical command...", { duration: 2000 });
      setTimeout(() => {
        setQuery("Review medical notes for today's appointments");
        setIsListening(false);
      }, 2500);
    } else {
      setIsListening(false);
    }
  };

  const handleAttachFile = () => {
    setAttachedFileName("Lab_Report_CBC_2026.pdf");
    toast.success("Attached: Lab_Report_CBC_2026.pdf");
  };

  return (
    <div
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 2147483645,
      }}
      /* Greyish background theme perfectly complementing the workspace */
      className="fixed w-[360px] sm:w-[375px] h-[560px] sm:h-[580px] max-w-[calc(100vw-24px)] max-h-[calc(100vh-60px)] bg-[#f3f4f6] dark:bg-[#18181b] rounded-[24px] border border-slate-300/80 dark:border-zinc-700/80 shadow-[0_20px_50px_rgba(15,23,42,0.22)] flex flex-col overflow-hidden select-none animate-in fade-in zoom-in-95 duration-200 font-sans"
    >
      {/* ── Draggable Top Header ── */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full pt-2.5 pb-1 px-4 flex items-center justify-between cursor-grab active:cursor-grabbing bg-transparent shrink-0"
        title="Click and drag to move anywhere"
      >
        <div className="flex items-center gap-1.5 text-slate-400 dark:text-zinc-500">
          <GripHorizontal className="w-4 h-4 opacity-50" />
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 dark:text-zinc-400">
            Assistant
          </span>
        </div>

        {/* Center Drag Grip Pill */}
        <div className="h-1 w-10 bg-slate-300 dark:bg-zinc-600 rounded-full hover:bg-slate-400 transition-colors" />

        {/* Top Control Buttons */}
        <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setMessages([])}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors"
              title="Reset conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Content Body (Scrollable if active conversation) ── */}
      <div
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto px-5 py-2 flex flex-col justify-between no-scrollbar"
      >
        {messages.length === 0 ? (
          /* Clean Greyish Initial State (Without spinning satellite animation) */
          <div className="flex flex-col items-center my-auto w-full">
            {/* Clean Static Symbol Logo Badge (No spinning animation rings) */}
            <div className="w-13 h-13 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200/90 dark:border-zinc-700/80 shadow-xs flex items-center justify-center my-2">
              <img
                src={symbolLogo}
                alt="Mantra AI"
                className="w-7 h-7 object-contain"
              />
            </div>

            {/* ── Greeting & Subtitle ── */}
            <h2 className="text-xl sm:text-[22px] font-bold text-slate-900 dark:text-zinc-100 tracking-tight text-center mt-2">
              {timeGreeting}, {displayName}
            </h2>
            <p className="text-slate-500 dark:text-zinc-400 text-xs sm:text-sm text-center mt-0.5">
              How can I help you today?
            </p>

            {/* ── Quick Start Card ── */}
            <div className="w-full bg-white dark:bg-zinc-800/95 rounded-2xl p-3 border border-slate-200/90 dark:border-zinc-700/80 shadow-2xs mt-5">
              <span className="block text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2 px-1">
                Quick Start:
              </span>

              <div className="space-y-1.5">
                {[
                  "What are treatment options for...",
                  "Review medical notes for...",
                  "Check provider availability for...",
                ].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleSend(item)}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-200 text-xs sm:text-[13px] font-medium transition-all border border-slate-150 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600 cursor-pointer flex items-center justify-between group"
                  >
                    <span className="truncate">{item}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-zinc-200 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Active Chat Stream */
          <div className="space-y-3 py-2 w-full">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`text-xs px-3.5 py-2.5 rounded-2xl max-w-[88%] leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-[#182230] text-white rounded-tr-xs shadow-xs"
                      : "bg-white dark:bg-zinc-800 border border-slate-200/90 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 rounded-tl-xs shadow-xs whitespace-pre-line"
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 rounded-2xl rounded-tl-xs px-3.5 py-2.5 w-fit text-xs text-slate-500 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                <span>Mantra Assistant is analyzing...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Attached File Pill (if any) ── */}
      {attachedFileName && (
        <div className="px-4 pb-1">
          <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <FileText className="w-3.5 h-3.5 shrink-0 text-blue-600" />
              <span className="truncate">{attachedFileName}</span>
            </div>
            <button
              type="button"
              onClick={() => setAttachedFileName(null)}
              className="p-0.5 hover:text-red-600"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* ── Bottom Input Container matching Image 2 ── */}
      <div className="p-3 pt-1 bg-transparent shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="bg-white dark:bg-zinc-800/95 rounded-2xl border border-slate-200 dark:border-zinc-700 shadow-xs px-3 py-1.5 flex items-center gap-2"
        >
          {/* Left: Microphone */}
          <button
            type="button"
            onClick={handleVoiceToggle}
            className={`p-1.5 rounded-full transition-colors ${
              isListening
                ? "bg-red-50 text-red-600 animate-pulse"
                : "text-slate-400 hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-zinc-700"
            }`}
            title={isListening ? "Listening..." : "Speak command"}
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* Center: Input */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask Assistant..."
            className="flex-1 bg-transparent text-xs sm:text-sm text-slate-800 dark:text-zinc-100 placeholder-slate-400 outline-none"
          />

          {/* Right: Attachment + Send */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleAttachFile}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-zinc-700 rounded-full transition-colors"
              title="Attach clinical document / lab report"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <button
              type="submit"
              disabled={!query.trim() && !attachedFileName}
              className="w-7 h-7 rounded-full bg-[#182230] hover:bg-blue-600 disabled:opacity-30 disabled:hover:bg-[#182230] text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
              title="Send message"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
