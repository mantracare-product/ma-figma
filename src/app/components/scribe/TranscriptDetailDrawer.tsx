import { useState, useEffect, useRef } from "react";
import {
  X,
  Play,
  Pause,
  Stethoscope,
  User,
  Star,
  FileText,
  MessageSquare,
  Volume2,
} from "lucide-react";
import { ScribeSession } from "../../../lib/scribeSessionStore";

export interface TranscriptDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  session: ScribeSession | null;
  onOpenWhatsApp?: (session: ScribeSession) => void;
}

export default function TranscriptDetailDrawer({
  isOpen,
  onClose,
  session,
}: TranscriptDetailDrawerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSec, setPlaybackSec] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      setPlaybackSec(0);
      setPlaybackSpeed(1);
      setRating(0);
      setHoverRating(0);
    }
  }, [isOpen, session]);

  useEffect(() => {
    if (isPlaying && session) {
      timerRef.current = setInterval(() => {
        setPlaybackSec((prev) => {
          if (prev >= session.durationSeconds) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, session, playbackSpeed]);

  if (!isOpen || !session) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Generate a clean narrative summary from extractedData if not already present
  const getClinicalSummary = () => {
    const d = session.extractedData;
    const medsText =
      d.medications && d.medications.length > 0
        ? d.medications.map((m) => `${m.drugName} (${m.dosage}, ${m.frequency})`).join(", ")
        : "Standard supportive care";

    return `${session.clientName}, a ${session.patientAge || 54}-year-old ${session.patientGender || "patient"}, had a clinical consultation with ${session.doctorName}. Chief complaint presented was "${d.chiefComplaint}". Following examination and dialogue evaluation, the primary diagnosis was established as ${d.diagnosis}. The prescribed treatment plan includes ${medsText}. Additional investigations ordered: ${d.investigations.join(", ")}. Follow-up review is scheduled for ${d.followUpDate || "14 days"}.`;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className="relative w-full max-w-4xl bg-[#f8fafc] shadow-2xl h-full flex flex-col z-50 transform transition-transform duration-300 ease-out border-l border-border"
        style={{ fontFamily: "DM Sans, sans-serif" }}
      >
        {/* Drawer Header (Conversation with [Patient Name]) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white flex-shrink-0">
          <h2
            className="text-xl font-bold text-foreground"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            Conversation with {session.clientName}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body (2-Column Layout matching Screenshot) */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ─── LEFT COLUMN: Recording & Summary (5 cols) ───────────────── */}
            <div className="lg:col-span-5 space-y-5">
              {/* 1. Recording Card */}
              <div className="rounded-2xl bg-white p-5 border border-border shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-foreground font-semibold text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
                    <Volume2 className="w-4 h-4 text-[#1A73E8]" />
                    <span>Recording</span>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-mono text-muted-foreground">
                    {new Date(session.createdAt).toLocaleDateString("en-IN", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    , {new Date(session.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {/* Player Row */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-10 h-10 rounded-full bg-[#0f172a] text-white flex items-center justify-center hover:opacity-90 transition-opacity flex-shrink-0 shadow-xs"
                    >
                      {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                    </button>

                    <div className="flex-1 space-y-1">
                      {/* Scrubber Progress Track */}
                      <div
                        className="h-2 bg-slate-100 rounded-full overflow-hidden cursor-pointer"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const pos = (e.clientX - rect.left) / rect.width;
                          setPlaybackSec(Math.floor(pos * session.durationSeconds));
                        }}
                      >
                        <div
                          className="h-full bg-[#0f172a] transition-all duration-150"
                          style={{
                            width: `${Math.min(
                              100,
                              (playbackSec / (session.durationSeconds || 1)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                        <span>{formatTime(playbackSec)}</span>
                        <span>{formatTime(session.durationSeconds)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Speed Controls & Star Rating */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center rounded-lg bg-slate-100 p-0.5 border border-border">
                      {[1, 1.25, 1.5, 2].map((s) => (
                        <button
                          key={s}
                          onClick={() => setPlaybackSpeed(s)}
                          className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all ${
                            playbackSpeed === s
                              ? "bg-white text-foreground shadow-2xs font-bold"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>

                    {/* Star Rating Widget */}
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setRating(i)}
                          onMouseEnter={() => setHoverRating(i)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="focus:outline-none transition-transform hover:scale-110 p-0.5"
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              (hoverRating || rating) >= i
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-slate-200"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. AI Summary Card */}
              <div className="rounded-2xl bg-white p-5 border border-border shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-foreground font-semibold text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
                  <FileText className="w-4 h-4 text-[#1A73E8]" />
                  <span>Summary</span>
                </div>
                <p
                  className="text-xs text-[#475569] leading-relaxed"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {getClinicalSummary()}
                </p>
              </div>
            </div>

            {/* ─── RIGHT COLUMN: Transcription Timeline (7 cols) ──────────── */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl bg-white p-5 border border-border shadow-xs flex flex-col min-h-[500px]">
                <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
                  <div className="flex items-center gap-2 text-foreground font-semibold text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
                    <MessageSquare className="w-4 h-4 text-[#1A73E8]" />
                    <span>Transcription</span>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold text-muted-foreground font-mono">
                    {session.transcript.utterances.length} Messages
                  </span>
                </div>

                {/* Speech Turns Timeline */}
                <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1">
                  {session.transcript.utterances.map((u) => {
                    const isDoctor = u.speaker === "doctor";

                    if (isDoctor) {
                      return (
                        <div key={u.id} className="flex flex-col items-end space-y-1">
                          <span
                            className="text-[11px] font-medium text-muted-foreground mr-10"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          >
                            Doctor
                          </span>
                          <div className="flex items-start gap-2.5 max-w-[88%]">
                            <div className="rounded-2xl rounded-tr-xs bg-white border border-border p-3.5 shadow-2xs">
                              <p className="text-xs text-foreground leading-relaxed" style={{ fontFamily: "Outfit, sans-serif" }}>
                                {u.text}
                              </p>
                            </div>
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[#1A73E8] mt-0.5">
                              <Stethoscope className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={u.id} className="flex flex-col items-start space-y-1">
                        <span
                          className="text-[11px] font-medium text-muted-foreground ml-10"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          Patient
                        </span>
                        <div className="flex items-start gap-2.5 max-w-[88%]">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 mt-0.5">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="rounded-2xl rounded-tl-xs bg-slate-50 border border-slate-100 p-3.5">
                            <p className="text-xs text-foreground leading-relaxed" style={{ fontFamily: "Outfit, sans-serif" }}>
                              {u.text}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
