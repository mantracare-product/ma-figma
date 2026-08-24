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
  Sparkles,
  Layers,
} from "lucide-react";
import { ScribeSession } from "../../../lib/scribeSessionStore";

export interface TranscriptDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  session: ScribeSession | null;
  onOpenWhatsApp?: (session: ScribeSession) => void;
}

interface ConfiguredSection {
  id: string;
  title: string;
  fieldKeys: string[];
}

const STORAGE_SECTIONS_KEY = "mantra_scribe_simple_sections";
const STORAGE_TOGGLE_KEY = "mantra_scribe_autofetch_toggle";

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

  // Configured sections from Settings
  const [configuredSections, setConfiguredSections] = useState<ConfiguredSection[]>([]);
  const [isAutoFetchActive, setIsAutoFetchActive] = useState(true);

  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      setPlaybackSec(0);
      setPlaybackSpeed(1);
      setRating(0);
      setHoverRating(0);
    } else {
      // Load saved sections from Settings
      try {
        const raw = localStorage.getItem(STORAGE_SECTIONS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setConfiguredSections(parsed);
        } else {
          // Default initial sections matching clinical template
          setConfiguredSections([
            {
              id: "sec-default-clinical",
              title: "Clinical Notes & Findings",
              fieldKeys: ["chief_complaint", "primary_diagnosis", "medications", "follow_up_date"],
            },
          ]);
        }

        const toggleRaw = localStorage.getItem(STORAGE_TOGGLE_KEY);
        if (toggleRaw !== null) {
          setIsAutoFetchActive(JSON.parse(toggleRaw));
        }
      } catch (e) {
        console.error("Error loading configured sections", e);
      }
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

  // Extract intelligent prefilled value from transcript / session data
  const getPrefilledFieldValue = (key: string): string => {
    const normKey = key.toLowerCase().replace(/[-_]/g, "");
    const d: any = session.extractedData || {};

    if (normKey.includes("client") || normKey.includes("patient") || normKey.includes("name")) {
      return session.clientName || "Rajesh Kumar";
    }
    if (normKey.includes("age")) {
      return session.patientAge ? `${session.patientAge} years` : "54 years";
    }
    if (normKey.includes("gender") || normKey.includes("sex")) {
      return session.patientGender || "Male";
    }
    if (normKey.includes("doctor") || normKey.includes("responsible") || normKey.includes("physician")) {
      return session.doctorName || "Dr. Priya Sharma";
    }
    if (normKey.includes("complaint") || normKey.includes("symptom") || normKey.includes("hpi") || normKey.includes("reason")) {
      return d.chiefComplaint || "Blurry vision in right eye with night glare for 3 months";
    }
    if (normKey.includes("diagnosis") || normKey.includes("condition") || normKey.includes("assessment")) {
      return d.diagnosis || "Nuclear Cataract Grade II (Right Eye)";
    }
    if (normKey.includes("medication") || normKey.includes("rx") || normKey.includes("drug") || normKey.includes("prescription")) {
      if (d.medications && d.medications.length > 0) {
        return d.medications.map((m: any) => `${m.drugName} - ${m.dosage}, ${m.frequency} (${m.duration})`).join("; ");
      }
      return "Moxifloxacin Eye Drops 0.5% (1 drop, QID for 7 days); Refresh Tears 0.5% (1 drop, TDS for 30 days)";
    }
    if (normKey.includes("vital") || normKey.includes("bp") || normKey.includes("pulse") || normKey.includes("pressure")) {
      return "BP: 120/80 mmHg • Pulse: 74 bpm • SpO2: 99%";
    }
    if (normKey.includes("investigation") || normKey.includes("lab") || normKey.includes("test") || normKey.includes("scan")) {
      return d.investigations && d.investigations.length > 0
        ? d.investigations.join(", ")
        : "Slit Lamp Examination, Visual Acuity Test";
    }
    if (normKey.includes("followup") || normKey.includes("recall") || normKey.includes("nextvisit") || normKey.includes("review")) {
      return d.followUpDate ? `${d.followUpDays || 14} days (${d.followUpDate})` : "14 days post consultation";
    }
    if (normKey.includes("diet") || normKey.includes("lifestyle") || normKey.includes("advice") || normKey.includes("instruction")) {
      return d.dietaryAdvice || "Avoid rubbing eyes, wear protective sunglasses when outdoors";
    }
    if (normKey.includes("phone") || normKey.includes("contact") || normKey.includes("mobile")) {
      return "+91 98765 43210";
    }
    if (normKey.includes("email")) {
      return "patient.rajesh@gmail.com";
    }
    if (normKey.includes("date") || normKey.includes("created")) {
      return new Date(session.sessionDate || session.createdAt).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }

    return "Extracted from dialogue";
  };

  const formatFieldLabel = (key: string) => {
    return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Generate a clean narrative summary from extractedData
  const getClinicalSummary = () => {
    const d: any = session.extractedData || {};
    const medsText =
      d.medications && d.medications.length > 0
        ? d.medications.map((m: any) => `${m.drugName} (${m.dosage}, ${m.frequency})`).join(", ")
        : "Standard supportive care";

    return `${session.clientName}, a ${session.patientAge || 54}-year-old ${session.patientGender || "patient"}, had a clinical consultation with ${session.doctorName}. Chief complaint presented was "${d.chiefComplaint || "Visual impairment"}". Following examination and dialogue evaluation, the primary diagnosis was established as ${d.diagnosis || "Nuclear Cataract"}. The prescribed treatment plan includes ${medsText}. Additional investigations: ${d.investigations?.join(", ") || "Visual Acuity"}. Follow-up review is scheduled for ${d.followUpDate || "14 days"}.`;
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
        className="relative w-full max-w-5xl bg-[#f8fafc] shadow-2xl h-full flex flex-col z-50 transform transition-transform duration-300 ease-out border-l border-border"
        style={{ fontFamily: "DM Sans, sans-serif" }}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white flex-shrink-0">
          <h2
            className="text-xl font-bold text-foreground"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            Conversation with {session.clientName}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ─── LEFT COLUMN: ALL CONFIGURED SECTIONS (5 cols) ──────────── */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#181e25]" />
                  <span className="font-bold text-xs text-foreground uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Clinical & Profile Fields
                  </span>
                </div>

                {isAutoFetchActive && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-[#181e25] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-mono">
                    <Sparkles className="w-3 h-3 text-[#181e25]" /> Auto-Filled
                  </span>
                )}
              </div>

              {/* Configured Sections List */}
              {configuredSections.length === 0 ? (
                <div className="rounded-2xl bg-white border border-border p-6 text-center text-xs text-muted-foreground shadow-xs">
                  No sections configured yet. Open Settings in AI Scribe to add mapping sections.
                </div>
              ) : (
                configuredSections.map((section) => (
                  <div
                    key={section.id}
                    className="rounded-2xl bg-white border border-border shadow-xs overflow-hidden"
                  >
                    {/* Section Header */}
                    <div className="px-4 py-3 bg-slate-50/70 border-b border-border flex items-center justify-between">
                      <h4
                        className="font-bold text-xs text-foreground"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {section.title}
                      </h4>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {section.fieldKeys.length} fields
                      </span>
                    </div>

                    {/* Section Fields with Prefilled Values */}
                    <div className="p-4 space-y-3">
                      {section.fieldKeys.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic text-center py-2">
                          No fields in this section
                        </p>
                      ) : (
                        section.fieldKeys.map((key) => {
                          const val = getPrefilledFieldValue(key);
                          return (
                            <div
                              key={key}
                              className="rounded-xl bg-slate-50/70 border border-border p-3 space-y-1"
                            >
                              <div
                                className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider"
                                style={{ fontFamily: "Outfit, sans-serif" }}
                              >
                                {formatFieldLabel(key)}
                              </div>
                              <div
                                className="text-xs font-semibold text-foreground leading-relaxed break-words"
                                style={{ fontFamily: "Outfit, sans-serif" }}
                              >
                                {val}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ─── RIGHT COLUMN: RECORDING + SUMMARY + TRANSCRIPTION (7 cols) ─ */}
            <div className="lg:col-span-7 space-y-5">
              {/* 1. Recording Card */}
              <div className="rounded-2xl bg-white p-5 border border-border shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-foreground font-semibold text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
                    <Volume2 className="w-4 h-4 text-[#181e25]" />
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
                      className="w-10 h-10 rounded-full bg-[#181e25] hover:bg-[#2c3e50] text-white flex items-center justify-center transition-all flex-shrink-0 shadow-xs cursor-pointer"
                    >
                      {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                    </button>

                    <div className="flex-1 space-y-1">
                      <div
                        className="h-2 bg-slate-100 rounded-full overflow-hidden cursor-pointer"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const pos = (e.clientX - rect.left) / rect.width;
                          setPlaybackSec(Math.floor(pos * session.durationSeconds));
                        }}
                      >
                        <div
                          className="h-full bg-[#181e25] transition-all duration-150"
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
                          className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all cursor-pointer ${
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

                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setRating(i)}
                          onMouseEnter={() => setHoverRating(i)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="focus:outline-none transition-transform hover:scale-110 p-0.5 cursor-pointer"
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
                  <FileText className="w-4 h-4 text-[#181e25]" />
                  <span>Summary</span>
                </div>
                <p
                  className="text-xs text-[#475569] leading-relaxed"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {getClinicalSummary()}
                </p>
              </div>

              {/* 3. Transcription Speech Timeline */}
              <div className="rounded-2xl bg-white p-5 border border-border shadow-xs flex flex-col min-h-[450px]">
                <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
                  <div className="flex items-center gap-2 text-foreground font-semibold text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
                    <MessageSquare className="w-4 h-4 text-[#181e25]" />
                    <span>Transcription</span>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold text-muted-foreground font-mono">
                    {session.transcript.utterances.length} Messages
                  </span>
                </div>

                {/* Speech Turns Timeline */}
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
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
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[#181e25] mt-0.5">
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
