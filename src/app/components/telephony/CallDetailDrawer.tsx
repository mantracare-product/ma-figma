import { useState, useEffect } from "react";
import {
  Phone, Download, Play, Pause, Headphones, User, Zap, GitBranch, RefreshCw, Star, Info, CalendarClock
} from "lucide-react";
import { Button } from "../ui/Button";
import { Tooltip } from "../ui/Tooltip";
import { Drawer } from "../ui/drawer";
import { toast } from "sonner";
import { CallLog, getStoredCallLogs } from "../../../lib/processLogsStore";

export type MetricTone = "success" | "neutral" | "warning";

const metricToneStyles: Record<MetricTone, { bg: string; text: string }> = {
  success: { bg: "bg-emerald-50 border border-emerald-200", text: "text-emerald-700" },
  neutral: { bg: "bg-slate-50 border border-slate-200", text: "text-slate-700" },
  warning: { bg: "bg-amber-50 border border-amber-200", text: "text-amber-700" },
};

function MetricTile({
  label,
  value,
  tone = "neutral",
  tooltip,
}: {
  label: string;
  value: string;
  phrase?: string;
  tone?: MetricTone;
  tooltip?: string;
}) {
  const { bg, text } = metricToneStyles[tone];
  const mutedLabel = tone === "neutral" ? "text-slate-500" : text;

  return (
    <div className={`min-w-0 rounded-xl p-3.5 ${bg} h-full flex flex-col justify-between`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <p
          className={`text-[11px] leading-snug ${mutedLabel}`}
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {label}
        </p>
        <Tooltip text={tooltip || label}>
          <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 flex-shrink-0 cursor-help mt-0.5" />
        </Tooltip>
      </div>
      <p
        className="text-xl font-bold break-words leading-snug"
        style={{ fontFamily: "DM Sans, sans-serif" }}
      >
        <span className={text}>{value}</span>
      </p>
    </div>
  );
}

function MetricGroup({
  label,
  columns = 2,
  defaultOpen = true,
  children,
}: {
  label: string;
  columns?: 2 | 3;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between mb-2 group"
        aria-expanded={open}
      >
        <p
          className="text-[12px] text-slate-400 group-hover:text-slate-600 transition-colors"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {label}
        </p>
      </button>
      {open && (
        <div
          className="grid gap-2.5 items-stretch"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function MetricSection({
  label,
  columns = 2,
  children,
}: {
  label: string;
  columns?: 2 | 3;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p
        className="text-[12px] text-slate-400 mb-2"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        {label}
      </p>
      <div
        className="grid gap-2.5 items-stretch"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {children}
      </div>
    </div>
  );
}

interface CallReviewMetrics {
  callOutcome: { value: string; tone: MetricTone; phrase: string };
  clientHappiness: { value: string; tone: MetricTone; phrase: string };
  howLong: { value: string; phrase: string };
  whatNext: { value: string; phrase: string };
  disconnectReason: { value: string; phrase: string };
  bargeInCount: { value: string; phrase: string };
  toolFailure: { value: string; tone: MetricTone; phrase: string };
  loopDetected: { value: string; tone: MetricTone; phrase: string };
  sentimentStart: { value: string; tone: MetricTone; phrase: string };
  sentimentMid: { value: string; tone: MetricTone; phrase: string };
  sentimentEnd: { value: string; tone: MetricTone; phrase: string };
  aiSpokePercent: { value: string; phrase: string };
  longestStretch: { value: string; phrase: string };
  silencePercent: { value: string; phrase: string };
  warmthPercent: { value: string; phrase: string };
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (Math.imul(h, 16777619) >>> 0);
  }
  return h;
}

function makePrng(seed: number) {
  let s = seed >>> 0;
  return function (): number {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

const SENTIMENT_OPTIONS: Array<{
  value: string;
  tone: MetricTone;
  phrases: string[];
}> = [
  { value: "Positive", tone: "success", phrases: ["Warm greeting", "Engaged and responsive", "Upbeat throughout", "Resolution confirmed"] },
  { value: "Neutral", tone: "neutral", phrases: ["Steady tone", "Clarifying details", "Matter-of-fact", "Calm and focused"] },
  { value: "Negative", tone: "warning", phrases: ["Sounded hesitant", "Signs of frustration", "Uncertain responses", "Needed reassurance"] },
];

function pickSentiment(rng: () => number) {
  const weights = [0.5, 0.35, 0.15];
  const roll = rng();
  let cum = 0;
  for (let i = 0; i < weights.length; i++) {
    cum += weights[i];
    if (roll < cum) {
      const opt = SENTIMENT_OPTIONS[i];
      const phrase = opt.phrases[Math.floor(rng() * opt.phrases.length)];
      return { value: opt.value, tone: opt.tone as MetricTone, phrase };
    }
  }
  const opt = SENTIMENT_OPTIONS[1];
  return { value: opt.value, tone: opt.tone as MetricTone, phrase: opt.phrases[0] };
}

export function getCallReviewMetrics(call: CallLog): CallReviewMetrics {
  const rng = makePrng(hashStr(call.id));
  const isCompleted = call.status === "Completed";

  const callOutcome: CallReviewMetrics["callOutcome"] =
    call.status !== "Completed"
      ? { value: "No Outcome", tone: "neutral", phrase: call.status === "Failed" ? "Call did not connect" : "Call hasn't happened yet" }
      : call.lastStage && call.lastStage !== "N/A" && call.lastStage !== call.currentStage
      ? { value: "Stage Advanced", tone: "success", phrase: `${call.lastStage} → ${call.currentStage}` }
      : { value: "No Change", tone: "neutral", phrase: `Remained at ${call.currentStage}` };

  const rawDuration = call.duration;
  const noDuration = !rawDuration || rawDuration === "0:00";
  const howLong: CallReviewMetrics["howLong"] = noDuration
    ? { value: "—", phrase: "No duration recorded" }
    : { value: rawDuration, phrase: "Total call length" };

  const futureDays = Math.floor(randRange(rng, 3, 14));
  const baseDate = new Date("2024-04-15");
  baseDate.setDate(baseDate.getDate() + futureDays);
  const followUpLabel = baseDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const whatNext: CallReviewMetrics["whatNext"] = call.hasScheduledCall
    ? { value: "Scheduled", phrase: `Follow-up on ${followUpLabel}` }
    : { value: "None", phrase: "No follow-up logged" };

  const disconnectOptions = ["Caller Disconnected", "Completed Naturally", "No Answer", "Voicemail Detected"];
  const disconnectReason = isCompleted
    ? { value: disconnectOptions[Math.floor(rng() * disconnectOptions.length)], phrase: "How the call ended" }
    : { value: "—", phrase: "No data for this call" };

  const bargeIns = isCompleted ? Math.floor(randRange(rng, 0, 8)) : 0;
  const bargeInCount = isCompleted
    ? { value: `${bargeIns}`, phrase: bargeIns > 4 ? "Higher than usual — client interrupted often" : "Normal range" }
    : { value: "—", phrase: "No data for this call" };

  const hadToolFailure = isCompleted ? rng() < 0.15 : false;
  const toolFailure = isCompleted
    ? { value: hadToolFailure ? "Yes" : "No", tone: (hadToolFailure ? "warning" : "success") as MetricTone, phrase: hadToolFailure ? "An automated action failed mid-call" : "All automated actions succeeded" }
    : { value: "—", tone: "neutral" as MetricTone, phrase: "No data for this call" };

  const hadLoop = isCompleted ? rng() < 0.1 : false;
  const loopDetected = isCompleted
    ? { value: hadLoop ? "Yes" : "No", tone: (hadLoop ? "warning" : "success") as MetricTone, phrase: hadLoop ? "AI repeated itself during the call" : "No repetition detected" }
    : { value: "—", tone: "neutral" as MetricTone, phrase: "No data for this call" };

  const noData = { value: "—", tone: "neutral" as MetricTone, phrase: "No data for this call" };

  let clientHappiness: CallReviewMetrics["clientHappiness"];
  if (isCompleted) {
    const score = Math.round(randRange(rng, 3.0, 5.0) * 10) / 10;
    const tone: MetricTone = score >= 4.0 ? "success" : score >= 3.0 ? "neutral" : "warning";
    clientHappiness = { value: `${score.toFixed(1)} / 5`, tone, phrase: "Estimated from tone and words" };
  } else {
    clientHappiness = { ...noData };
  }

  const sentimentStart = isCompleted ? pickSentiment(rng) : { ...noData };
  const sentimentMid = isCompleted ? pickSentiment(rng) : { ...noData };
  const sentimentEnd = isCompleted ? pickSentiment(rng) : { ...noData };

  let aiSpokePercent: CallReviewMetrics["aiSpokePercent"];
  let longestStretch: CallReviewMetrics["longestStretch"];
  let silencePercent: CallReviewMetrics["silencePercent"];
  let warmthPercent: CallReviewMetrics["warmthPercent"];

  if (isCompleted) {
    const ai = Math.round(randRange(rng, 40, 70));
    const stretch = Math.round(randRange(rng, 20, 60));
    const silence = Math.round(randRange(rng, 5, 25));
    const warmth = Math.round(randRange(rng, 40, 80));
    aiSpokePercent = { value: `${ai}%`, phrase: `${Math.round(ai / 100 * parseFloat(rawDuration || "4") * 60)}s of the call` };
    longestStretch = { value: `${stretch}s`, phrase: stretch < 40 ? "Short enough to stay natural" : "Slightly long for a single stretch" };
    silencePercent = { value: `${silence}%`, phrase: silence < 15 ? "Less than average" : "A normal amount of pause" };
    warmthPercent = { value: `${warmth}%`, phrase: warmth >= 60 ? "Friendly and empathetic" : "Fairly professional tone" };
  } else {
    aiSpokePercent = { value: "—", phrase: "No data for this call" };
    longestStretch = { value: "—", phrase: "No data for this call" };
    silencePercent = { value: "—", phrase: "No data for this call" };
    warmthPercent = { value: "—", phrase: "No data for this call" };
  }

  return {
    callOutcome, clientHappiness, howLong, whatNext,
    disconnectReason, bargeInCount, toolFailure, loopDetected,
    sentimentStart, sentimentMid, sentimentEnd,
    aiSpokePercent, longestStretch, silencePercent, warmthPercent,
  };
}

export interface UpdatedField {
  field: string;
  value: string;
}

export function getUpdatedFields(call: CallLog): UpdatedField[] {
  if (call.status !== "Completed") return [];
  const fields: UpdatedField[] = [];
  if (call.lastStage && call.lastStage !== "N/A" && call.lastStage !== call.currentStage) {
    fields.push({ field: "Stage", value: call.currentStage });
  }
  if (call.hasScheduledCall) {
    fields.push({ field: "Next Follow-up", value: "Scheduled" });
  }
  fields.push({ field: "Last Contact", value: call.date.split(" ")[0] });
  return fields;
}

export const getReasonIcon = (reason?: string) => {
  switch (reason) {
    case "Call Trigger":
      return <Zap className="w-4 h-4 text-primary" />;
    case "Stage Change":
      return <GitBranch className="w-4 h-4 text-primary" />;
    case "Retry":
      return <RefreshCw className="w-4 h-4 text-primary" />;
    case "Manual Trigger":
      return <Phone className="w-4 h-4 text-primary" />;
    default:
      return null;
  }
};

export interface CallDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  call?: CallLog | null;
  callId?: string | null;
  callLogs?: CallLog[];
  onSelectCallId?: (callId: string) => void;
}

export default function CallDetailDrawer({
  isOpen,
  onClose,
  call: callProp,
  callId,
  callLogs: callLogsProp,
  onSelectCallId,
}: CallDetailDrawerProps) {
  const [activeDrawerTab, setActiveDrawerTab] = useState<"summary" | "call-review" | "review">("summary");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [callFeedback, setCallFeedback] = useState("");
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  const [currentCallId, setCurrentCallId] = useState<string | null>(callProp?.id || callId || null);

  useEffect(() => {
    if (callProp?.id) {
      setCurrentCallId(callProp.id);
    } else if (callId) {
      setCurrentCallId(callId);
    }
  }, [callProp, callId]);

  const allLogs = callLogsProp && callLogsProp.length > 0 ? callLogsProp : getStoredCallLogs();

  let selectedCall: CallLog | null = null;
  if (callProp && (!currentCallId || callProp.id === currentCallId || callProp.id.toLowerCase() === currentCallId.toLowerCase())) {
    selectedCall = callProp;
  }

  if (!selectedCall && currentCallId) {
    selectedCall = allLogs.find((l) => l.id === currentCallId) || null;
  }

  if (!selectedCall && currentCallId) {
    const lower = currentCallId.toLowerCase();
    selectedCall = allLogs.find((l) => l.id.toLowerCase() === lower) || null;
  }

  if (!selectedCall && currentCallId) {
    const digits = currentCallId.replace(/\D/g, "");
    if (digits) {
      const paddedDigits = digits.padStart(3, "0");
      selectedCall =
        allLogs.find((l) => l.id.endsWith(paddedDigits) || l.id.toLowerCase().includes(`-${paddedDigits}`)) ||
        allLogs.find((l) => l.id.endsWith(digits) || l.id.toLowerCase().includes(digits)) ||
        null;
    }
  }

  if (!selectedCall && callProp) {
    selectedCall = callProp;
  }

  if (!selectedCall && isOpen && allLogs.length > 0) {
    selectedCall = allLogs[0];
  }

  const handleClose = () => {
    setActiveDrawerTab("summary");
    setIsPlaying(false);
    setPlaybackSpeed(1);
    setRating(0);
    setHoverRating(0);
    setCallFeedback("");
    onClose();
  };

  const handleSaveFeedback = () => {
    setIsSavingFeedback(true);
    setTimeout(() => {
      setIsSavingFeedback(false);
      toast.success("Feedback saved successfully");
      setRating(0);
      setCallFeedback("");
    }, 600);
  };

  const handleSelectCall = (targetId: string) => {
    if (onSelectCallId) {
      onSelectCallId(targetId);
    } else {
      setCurrentCallId(targetId);
    }
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <button
          key={i}
          type="button"
          onClick={() => setRating(i)}
          onMouseEnter={() => setHoverRating(i)}
          onMouseLeave={() => setHoverRating(0)}
          className="focus:outline-none transition-transform hover:scale-110 p-1"
        >
          <Star
            className={`w-6 h-6 ${(hoverRating || rating) >= i
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300 hover:text-gray-400"
              }`}
          />
        </button>
      );
    }
    return stars;
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <>
          <h2 className="text-2xl font-semibold text-foreground" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Call Details
          </h2>
          {selectedCall && (
            <span className="px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>
              #{selectedCall.id}
            </span>
          )}
        </>
      }
    >
      {selectedCall ? (
        <div className="flex flex-col h-full">
          {/* Sticky Tab Bar */}
          <div className="bg-white border-b" style={{ borderColor: '#E5E7EB' }}>
            <div className="flex items-center">
              <button
                onClick={() => setActiveDrawerTab("summary")}
                className={`flex-1 flex items-center justify-center text-center transition-all ${activeDrawerTab === "summary" ? "text-primary" : "hover:bg-muted/30"
                  }`}
                style={{
                  height: '44px',
                  fontSize: '13px',
                  fontWeight: 500,
                  fontFamily: 'Outfit, sans-serif',
                  color: activeDrawerTab === "summary" ? "#1A73E8" : "#6B7280",
                  borderBottom: activeDrawerTab === "summary" ? "2px solid #1A73E8" : "2px solid transparent",
                  backgroundColor: activeDrawerTab === "summary" ? "#FFFFFF" : undefined,
                }}
              >
                Summary
              </button>
              <button
                onClick={() => setActiveDrawerTab("call-review")}
                className={`flex-1 flex items-center justify-center text-center transition-all ${activeDrawerTab === "call-review" ? "text-primary" : "hover:bg-muted/30"
                  }`}
                style={{
                  height: '44px',
                  fontSize: '13px',
                  fontWeight: 500,
                  fontFamily: 'Outfit, sans-serif',
                  color: activeDrawerTab === "call-review" ? "#1A73E8" : "#6B7280",
                  borderBottom: activeDrawerTab === "call-review" ? "2px solid #1A73E8" : "2px solid transparent",
                  backgroundColor: activeDrawerTab === "call-review" ? "#FFFFFF" : undefined,
                }}
              >
                Call Analysis
              </button>
              <button
                onClick={() => setActiveDrawerTab("review")}
                className={`flex-1 flex items-center justify-center text-center transition-all ${activeDrawerTab === "review" ? "text-primary" : "hover:bg-muted/30"
                  }`}
                style={{
                  height: '44px',
                  fontSize: '13px',
                  fontWeight: 500,
                  fontFamily: 'Outfit, sans-serif',
                  color: activeDrawerTab === "review" ? "#1A73E8" : "#6B7280",
                  borderBottom: activeDrawerTab === "review" ? "2px solid #1A73E8" : "2px solid transparent",
                  backgroundColor: activeDrawerTab === "review" ? "#FFFFFF" : undefined,
                }}
              >
                Feedback
              </button>
            </div>
          </div>

          {/* Tab Content - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            {activeDrawerTab === "summary" && (
              <div className="space-y-6 p-6">
                {/* Summary Card */}
                <div className="bg-white rounded-lg border shadow-sm" style={{ padding: '20px', borderColor: '#E5E7EB', borderRadius: '8px' }}>
                  <h2 className="text-lg font-semibold mb-4" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Summary</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', rowGap: '20px' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', fontFamily: 'Outfit, sans-serif' }}>Client</p>
                      <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>{selectedCall.client}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', fontFamily: 'Outfit, sans-serif' }}>Call Time</p>
                      <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>{selectedCall.date}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', fontFamily: 'Outfit, sans-serif' }}>Type</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedCall.type === "Outbound"
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary/10 text-secondary"
                        }`} style={{ fontFamily: 'Outfit, sans-serif' }}>
                        {selectedCall.type}
                      </span>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', fontFamily: 'Outfit, sans-serif' }}>Current Stage</p>
                      <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>{selectedCall.currentStage}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', fontFamily: 'Outfit, sans-serif' }}>Call Status</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedCall.status === "Completed"
                        ? "bg-success/10 text-success"
                        : selectedCall.status === "Failed"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-warning/10 text-warning"
                        }`} style={{ fontFamily: 'Outfit, sans-serif' }}>
                        {selectedCall.status}
                      </span>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', fontFamily: 'Outfit, sans-serif' }}>Duration</p>
                      <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>{selectedCall.duration || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Recording Player */}
                {selectedCall.hasRecording && (
                  <div className="bg-card rounded-2xl p-8 border border-border shadow-lg">
                    <h2 className="text-lg font-semibold mb-4" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Recording</h2>
                    <div className="space-y-4">
                      <div className="flex items-center gap-1">
                        <span className="text-xs mr-2" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Speed:</span>
                        {[0.5, 0.75, 1, 1.25, 1.5].map((speed) => (
                          <button
                            key={speed}
                            onClick={() => setPlaybackSpeed(speed)}
                            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${playbackSpeed === speed
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 p-4 bg-muted rounded-xl">
                        <button
                          onClick={() => setIsPlaying(!isPlaying)}
                          className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
                        >
                          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                        </button>
                        <div className="flex-1">
                          <div className="h-2 bg-border rounded-full overflow-hidden">
                            <div className="h-full bg-primary w-1/3" />
                          </div>
                          <div className="flex justify-between mt-2 text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                            <span>1:30</span>
                            <span>{selectedCall.duration || "4:32"}</span>
                          </div>
                        </div>
                        <Tooltip text="Download Recording">
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                )}

                {/* Transcript */}
                {selectedCall.hasTranscript && (
                  <div className="bg-card rounded-2xl p-8 border border-border shadow-lg">
                    <h2 className="text-lg font-semibold mb-4" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Call Transcript</h2>

                    <div className="flex items-center mb-4">
                      <div className="flex items-center gap-2">
                        {[1, 1.25, 1.5, 2].map((speed) => (
                          <button
                            key={speed}
                            onClick={() => setPlaybackSpeed(speed)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${playbackSpeed === speed
                              ? "bg-muted text-foreground border border-border"
                              : "bg-white text-muted-foreground hover:bg-muted border border-border"
                              }`}
                            style={{ fontFamily: 'Outfit, sans-serif' }}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                      <div className="flex justify-end">
                        <div className="max-w-[80%]">
                          <div className="flex items-center justify-end gap-2 mb-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              AI ASSISTANT
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="bg-[#2F3B4E] text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                              <p className="text-sm leading-relaxed" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                Hi {selectedCall.client}, this is Ria from MantraCare. Quick check-did I catch you at an okay time for thirty seconds?
                              </p>
                            </div>
                            <div className="flex-shrink-0 w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                              <Headphones className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-start">
                        <div className="max-w-[80%]">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              CLIENT
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-white" />
                            </div>
                            <div className="bg-primary text-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                              <p className="text-sm leading-relaxed" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                Hello. Yes, I have a moment.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <div className="max-w-[80%]">
                          <div className="flex items-center justify-end gap-2 mb-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              AI ASSISTANT
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="bg-[#2F3B4E] text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                              <p className="text-sm leading-relaxed" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                Thanks for confirming. I am calling to update you on your stage: {selectedCall.currentStage}.
                              </p>
                            </div>
                            <div className="flex-shrink-0 w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                              <Headphones className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Summary Card */}
                <div className="bg-card rounded-2xl p-8 border border-border shadow-lg">
                  <h2 className="text-lg font-semibold mb-4" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>AI Summary</h2>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                        Call Overview
                      </h4>
                      <p className="text-sm leading-relaxed" style={{ color: '#475569', fontFamily: 'Outfit, sans-serif' }}>
                        This was a call regarding {selectedCall.process || "patient intake"} with client {selectedCall.client}. The primary stage during the call was {selectedCall.currentStage}.
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                        Key Points
                      </h4>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span className="text-sm" style={{ color: '#475569', fontFamily: 'Outfit, sans-serif' }}>
                            Contact established with status: {selectedCall.status}
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span className="text-sm" style={{ color: '#475569', fontFamily: 'Outfit, sans-serif' }}>
                            Call duration recorded as {selectedCall.duration || "N/A"}
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Call Relationship */}
                {(selectedCall.parentCallId || (selectedCall.childCallIds && selectedCall.childCallIds.length > 0)) && (
                  <div className="bg-card rounded-2xl p-8 border border-border shadow-lg">
                    <h2 className="text-lg font-semibold mb-4" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Call Relationship</h2>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm mb-1" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Current Call ID</p>
                        <p className="font-mono font-medium text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>#{selectedCall.id}</p>
                      </div>

                      {selectedCall.parentCallId && (
                        <div className="border-t border-border pt-4">
                          <p className="text-sm mb-2" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Created From</p>
                          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              {getReasonIcon(selectedCall.relationshipReason)}
                              <span className="text-xs font-semibold text-primary">
                                {selectedCall.relationshipReason}
                              </span>
                            </div>
                            <button
                              onClick={() => handleSelectCall(selectedCall.parentCallId!)}
                              className="font-mono text-sm text-primary hover:underline cursor-pointer"
                            >
                              Call ID: #{selectedCall.parentCallId}
                            </button>
                          </div>
                        </div>
                      )}

                      {selectedCall.childCallIds && selectedCall.childCallIds.length > 0 && (
                        <div className="border-t border-border pt-4">
                          <p className="text-sm mb-2" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Generated Calls</p>
                          <div className="space-y-2">
                            {selectedCall.childCallIds.map((childId) => (
                              <div key={childId} className="p-3 bg-success/5 border border-success/20 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <Zap className="w-4 h-4 text-success" />
                                  <span className="text-xs font-semibold text-success">Call Trigger</span>
                                </div>
                                <button
                                  onClick={() => handleSelectCall(childId)}
                                  className="font-mono text-sm text-success hover:underline cursor-pointer"
                                >
                                  Call ID: #{childId}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeDrawerTab === "call-review" && (
              (() => {
                const m = getCallReviewMetrics(selectedCall);
                const updatedFields = getUpdatedFields(selectedCall);

                return (
                  <div className="space-y-5 p-6">
                    <div className="grid grid-cols-2 gap-3 items-stretch">
                      <div
                        className={`p-4 rounded-xl border transition-all h-full flex flex-col justify-between ${m.callOutcome.tone === "success"
                          ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                          : m.callOutcome.tone === "warning"
                            ? "bg-amber-50/70 border-amber-200 text-amber-950"
                            : "bg-slate-50 border-slate-200 text-slate-900"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-[12px] text-slate-500 font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
                            Call Outcome
                          </p>
                          <Tooltip text="Whether this call moved the client forward in their pipeline stage.">
                            <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 flex-shrink-0 cursor-help mt-0.5" />
                          </Tooltip>
                        </div>
                        <p className="text-[26px] font-bold break-words leading-tight" style={{ fontFamily: "DM Sans, sans-serif" }}>
                          {m.callOutcome.value}
                        </p>
                      </div>

                      <div className="p-4 rounded-xl border border-slate-200 bg-white h-full flex flex-col justify-between">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-[12px] text-slate-500 font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
                            Client happiness
                          </p>
                          <Tooltip text="Estimated satisfaction based on tone and word choice during the call.">
                            <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 flex-shrink-0 cursor-help mt-0.5" />
                          </Tooltip>
                        </div>
                        <p className="text-[26px] font-bold break-words leading-tight" style={{ fontFamily: "DM Sans, sans-serif" }}>
                          {m.clientHappiness.value}
                        </p>
                      </div>
                    </div>

                    <MetricSection label="Call Outcome & Disconnection" columns={2}>
                      <MetricTile
                        label="Disconnect / End Reason"
                        value={m.disconnectReason.value}
                        phrase={m.disconnectReason.phrase}
                        tooltip="How and why the call ended."
                      />
                      <MetricTile
                        label="Barge-in Count"
                        value={m.bargeInCount.value}
                        phrase={m.bargeInCount.phrase}
                        tooltip="Number of times the client spoke over or interrupted the AI."
                      />
                      <MetricTile
                        label="Tool / Action Failure"
                        value={m.toolFailure.value}
                        tone={m.toolFailure.tone}
                        phrase={m.toolFailure.phrase}
                        tooltip="Whether any automated action failed during the call."
                      />
                      <MetricTile
                        label="Loop Detected"
                        value={m.loopDetected.value}
                        tone={m.loopDetected.tone}
                        phrase={m.loopDetected.phrase}
                        tooltip="Whether the AI repeated the same response pattern."
                      />
                    </MetricSection>

                    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] text-slate-400 font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
                          Fields updated from this call
                        </p>
                        <Tooltip text="CRM fields created or changed by this call.">
                          <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 flex-shrink-0 cursor-help" />
                        </Tooltip>
                      </div>
                      {updatedFields.length === 0 ? (
                        <p className="text-xs text-slate-500 italic" style={{ fontFamily: "Outfit, sans-serif" }}>No fields were updated from this call.</p>
                      ) : (
                        <table className="w-full text-xs" style={{ fontFamily: "Outfit, sans-serif" }}>
                          <thead>
                            <tr className="text-left text-slate-400 uppercase text-[10px] tracking-wide">
                              <th className="pb-2 font-medium">Field</th>
                              <th className="pb-2 font-medium">Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {updatedFields.map((f, i) => (
                              <tr key={i}>
                                <td className="py-2 text-primary font-medium">{f.field}</td>
                                <td className="py-2 text-slate-700">{f.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    <MetricGroup label="Talk and pacing" defaultOpen={true} columns={2}>
                      <MetricTile
                        label="Time the AI spoke"
                        value={m.aiSpokePercent.value}
                        phrase={m.aiSpokePercent.phrase}
                        tooltip="Share of call duration during which AI was speaking."
                      />
                      <MetricTile
                        label="How warm the AI sounded"
                        value={m.warmthPercent.value}
                        phrase={m.warmthPercent.phrase}
                        tooltip="Share of agent responses classified as empathetic."
                      />
                      <MetricTile
                        label="Longest stretch without a break"
                        value={m.longestStretch.value}
                        phrase={m.longestStretch.phrase}
                        tooltip="Longest single block of uninterrupted talking."
                      />
                      <MetricTile
                        label="Silence during the call"
                        value={m.silencePercent.value}
                        phrase={m.silencePercent.phrase}
                        tooltip="Total duration of pauses during conversation."
                      />
                    </MetricGroup>

                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                      <div className="flex items-center gap-2">
                        <CalendarClock className="w-4 h-4 text-slate-400" />
                        <span>{m.whatNext.phrase}</span>
                      </div>
                      <span className="font-semibold text-slate-700">{m.whatNext.value}</span>
                    </div>
                  </div>
                );
              })()
            )}

            {activeDrawerTab === "review" && (
              <div className="space-y-6 p-6">
                <div className="bg-card rounded-2xl p-8 border border-border shadow-lg">
                  <h2 className="text-lg font-semibold mb-4" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Rating & Feedback</h2>

                  <div
                    className="flex items-start gap-3 p-4 rounded-xl mb-4"
                    style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}
                  >
                    <Star className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#1A73E8' }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#1E3A8A', fontFamily: 'Outfit, sans-serif' }}>
                        Rate this call
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#1E40AF', fontFamily: 'Outfit, sans-serif' }}>
                        Your feedback helps improve future AI-driven conversations and call quality.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm mb-2" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Rating</p>
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">{renderStars()}</div>
                        {rating > 0 && (
                          <span className="text-sm font-medium" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                            {rating} / 5
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm mb-2 block" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Feedback</label>
                      <textarea
                        value={callFeedback}
                        onChange={(e) => setCallFeedback(e.target.value)}
                        placeholder="Add feedback on what should improve and highlight important points from this call..."
                        className="w-full px-4 py-3 bg-input-background border border-input rounded-xl resize-none text-sm min-h-[120px]"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSaveFeedback}
                        loading={isSavingFeedback}
                        disabled={rating === 0 && !callFeedback.trim()}
                      >
                        Save Feedback
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
