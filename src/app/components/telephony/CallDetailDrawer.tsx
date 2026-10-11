import { useState, useEffect, useMemo } from "react";
import {
  Phone, Download, Play, Pause, Headphones, User, Zap, GitBranch, RefreshCw, Star, Info, CalendarClock,
  Bot, FileText, Sparkles, MessageSquare
} from "lucide-react";
import { Button } from "../ui/Button";
import { Tooltip } from "../ui/Tooltip";
import { Drawer } from "../ui/drawer";
import { toast } from "sonner";
import { CallLog, getStoredCallLogs } from "../../../lib/processLogsStore";
import { TableComponent, TableColumn } from "../ui/TableComponent";

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
  const [activeDrawerTab, setActiveDrawerTab] = useState<"overview" | "retry-history" | "call-review">("overview");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
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
    setActiveDrawerTab("overview");
    setIsPlaying(false);
    setPlaybackSpeed(1);
    setRating(0);
    setHoverRating(0);
    onClose();
  };

  const handleSelectCall = (targetId: string) => {
    if (onSelectCallId) {
      onSelectCallId(targetId);
    } else {
      setCurrentCallId(targetId);
    }
  };

  const getClientPhone = (clientId?: string, clientName?: string): string => {
    try {
      const raw = sessionStorage.getItem("clients");
      const cs = raw ? JSON.parse(raw) : [];
      const found = cs.find((c: any) => (clientId && c.id === clientId) || (clientName && c.name?.toLowerCase() === clientName.toLowerCase()));
      if (found?.phone) return found.phone;
    } catch {}
    return "7795163421";
  };

  const getCallMessages = (call: CallLog) => {
    const clientName = call.client || "Client";
    const firstName = clientName.split(" ")[0] || clientName;
    return [
      {
        id: "m1",
        sender: "ai",
        time: "00:03",
        text: `Hi ${firstName} — this is Arushi calling from MantraCare. You recently submitted an enquiry with us, so I wanted to understand how we can help.`,
      },
      {
        id: "m2",
        sender: "client",
        time: "00:14",
        text: "Hi, Arushi. I just wanted to know which are the available consultation slots.",
      },
      {
        id: "m3",
        sender: "ai",
        time: "00:22",
        text: `The line cut off a little there, ${firstName} — could you repeat that for me?`,
      },
      {
        id: "m4",
        sender: "client",
        time: "00:31",
        text: "Sorry about that! I wanted to check what consultation packages are available.",
      },
      {
        id: "m5",
        sender: "ai",
        time: "00:46",
        text: "We offer comprehensive initial evaluations and ongoing care packages. Would you prefer a virtual consultation or an in-clinic appointment?",
      },
      {
        id: "m6",
        sender: "client",
        time: "01:02",
        text: "A virtual consultation would be ideal. What days and timings are open?",
      },
      {
        id: "m7",
        sender: "ai",
        time: "01:18",
        text: "We have openings tomorrow afternoon at 3:00 PM and Thursday morning at 11:00 AM. Which one works better for your schedule?",
      },
      {
        id: "m8",
        sender: "client",
        time: "01:30",
        text: "Tomorrow at 3:00 PM works great. Please book that for me.",
      },
      {
        id: "m9",
        sender: "ai",
        time: "01:45",
        text: `Confirmed! I've scheduled your consultation for tomorrow at 3:00 PM and updated your stage to ${call.currentStage}. Confirmation details have been emailed. Thank you for choosing MantraCare!`,
      },
    ];
  };

  const clientPhone = selectedCall ? ((selectedCall as any)?.phone || getClientPhone(selectedCall.clientId, selectedCall.client)) : "7795163421";
  const messages = selectedCall ? getCallMessages(selectedCall) : [];

  interface RetryHistoryRow {
    id: string;
    callType: string;
    process: string;
    initialStage: string;
    updatedStage: string;
    status: "COMPLETED" | "BUSY" | "FAILED" | "NO ANSWER" | "PENDING";
    createdAt: string;
    scheduledOn: string;
  }

  const retryHistoryData: RetryHistoryRow[] = useMemo(() => {
    if (!selectedCall) return [];
    const proc = (selectedCall.process || "DERMATEST").toUpperCase();
    const initialStg = selectedCall.lastStage && selectedCall.lastStage !== "N/A" ? selectedCall.lastStage : "New";
    const updatedStg = selectedCall.currentStage || "Appointment Booked";
    const dateStr = selectedCall.date || "Oct 10, 2026, 07:26 PM";

    return [
      {
        id: `retry-${selectedCall.id}-1`,
        callType: selectedCall.type || "Outbound",
        process: proc,
        initialStage: initialStg,
        updatedStage: updatedStg,
        status: (selectedCall.status?.toUpperCase() === "PENDING" ? "PENDING" : selectedCall.status?.toUpperCase() === "FAILED" ? "FAILED" : "COMPLETED") as any,
        createdAt: dateStr,
        scheduledOn: "-",
      },
      {
        id: `retry-${selectedCall.id}-2`,
        callType: selectedCall.type || "Outbound",
        process: proc,
        initialStage: initialStg,
        updatedStage: "N/A",
        status: "BUSY",
        createdAt: "Oct 10, 2026, 07:20 PM",
        scheduledOn: "-",
      },
      {
        id: `retry-${selectedCall.id}-3`,
        callType: selectedCall.type || "Outbound",
        process: proc,
        initialStage: initialStg,
        updatedStage: "Follow-Up Later",
        status: "COMPLETED",
        createdAt: "Oct 10, 2026, 07:15 PM",
        scheduledOn: "-",
      },
      {
        id: `retry-${selectedCall.id}-4`,
        callType: selectedCall.type || "Outbound",
        process: proc,
        initialStage: initialStg,
        updatedStage: "Appointment Booked",
        status: "COMPLETED",
        createdAt: "Oct 10, 2026, 07:10 PM",
        scheduledOn: "-",
      },
      {
        id: `retry-${selectedCall.id}-5`,
        callType: selectedCall.type || "Outbound",
        process: proc,
        initialStage: initialStg,
        updatedStage: "Follow-Up Later",
        status: "COMPLETED",
        createdAt: "Oct 10, 2026, 07:05 PM",
        scheduledOn: "-",
      },
    ];
  }, [selectedCall]);

  const retryColumns: TableColumn<RetryHistoryRow>[] = [
    {
      id: "callType",
      header: "CALL TYPE",
      render: (r) => (
        <span className="text-slate-800 text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
          {r.callType}
        </span>
      ),
    },
    {
      id: "process",
      header: "PROCESS",
      render: (r) => (
        <span className="text-slate-600 text-xs tracking-wider font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
          {r.process}
        </span>
      ),
    },
    {
      id: "initialStage",
      header: "INITIAL STAGE",
      render: (r) => (
        <span className="text-slate-700 text-xs" style={{ fontFamily: "Outfit, sans-serif" }}>
          {r.initialStage}
        </span>
      ),
    },
    {
      id: "updatedStage",
      header: "UPDATED STAGE",
      render: (r) => (
        <span className="text-slate-800 text-xs font-medium truncate max-w-[160px] inline-block" style={{ fontFamily: "Outfit, sans-serif" }}>
          {r.updatedStage}
        </span>
      ),
    },
    {
      id: "status",
      header: "STATUS",
      render: (r) => {
        const isCompleted = r.status === "COMPLETED";
        const isBusy = r.status === "BUSY";
        return (
          <span
            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase whitespace-nowrap ${
              isCompleted
                ? "bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]"
                : isBusy
                ? "bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3]"
                : "bg-slate-100 text-slate-700 border border-slate-200"
            }`}
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {r.status}
          </span>
        );
      },
    },
    {
      id: "createdAt",
      header: "CREATED AT",
      render: (r) => (
        <span className="text-slate-500 text-xs font-mono" style={{ fontFamily: "JetBrains Mono, monospace" }}>
          {r.createdAt}
        </span>
      ),
    },
    {
      id: "scheduledOn",
      header: "SCHEDULED ON",
      render: (r) => (
        <span className="text-slate-400 text-xs" style={{ fontFamily: "Outfit, sans-serif" }}>
          {r.scheduledOn}
        </span>
      ),
    },
  ];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="sm:max-w-4xl lg:max-w-5xl"
      title={
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              Conversation Details
            </h2>
            {selectedCall && (
              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/60 rounded-full text-xs font-mono font-medium">
                #{selectedCall.id}
              </span>
            )}
          </div>
          {selectedCall && (
            <div className="flex items-center gap-3 mt-3">
              <div className="w-10 h-10 rounded-full bg-[#1A73E8] text-white flex items-center justify-center font-bold text-base shadow-xs flex-shrink-0">
                {selectedCall.client ? selectedCall.client.charAt(0).toUpperCase() : "F"}
              </div>
              <div>
                <p className="font-semibold text-sm text-slate-900 lowercase leading-tight" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  {selectedCall.client}
                </p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {clientPhone}
                </p>
              </div>
            </div>
          )}
        </div>
      }
    >
      {selectedCall ? (
        <div className="flex flex-col h-full bg-[#F8FAFC]">
          {/* Sticky Tab Bar */}
          <div className="bg-white border-b border-gray-200 px-6 flex items-center gap-6 flex-shrink-0">
            <button
              onClick={() => setActiveDrawerTab("overview")}
              className={`py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                activeDrawerTab === "overview"
                  ? "border-[#1A73E8] text-[#1A73E8]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveDrawerTab("retry-history")}
              className={`py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                activeDrawerTab === "retry-history"
                  ? "border-[#1A73E8] text-[#1A73E8]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Retry History
            </button>
          </div>

          {/* Tab Content - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            {activeDrawerTab === "overview" && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                  {/* Column 1: Recording, Summary, AI Summary */}
                  <div className="space-y-5">
                    {/* Recording Player Card */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-blue-50 text-[#1A73E8] flex items-center justify-center">
                            <Headphones className="w-3.5 h-3.5" />
                          </div>
                          <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                            Recording
                          </h3>
                        </div>
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          {selectedCall.date || "Oct 10, 2026, 07:26 PM"}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 py-1">
                        <button
                          type="button"
                          onClick={() => setIsPlaying(!isPlaying)}
                          className="w-10 h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-full flex items-center justify-center transition-transform hover:scale-105 flex-shrink-0 cursor-pointer shadow-xs"
                        >
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                        </button>
                        <div className="flex-1 space-y-1">
                          <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden cursor-pointer">
                            <div className="h-full bg-slate-900 rounded-full transition-all" style={{ width: isPlaying ? '50%' : '15%' }} />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                            <span>00:00</span>
                            <span>{selectedCall.duration || "2:11"}</span>
                          </div>
                        </div>
                        <Tooltip text="Download Audio">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600">
                            <Download className="w-4 h-4" />
                          </Button>
                        </Tooltip>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-1.5">
                          {[1, 1.25, 1.5, 2].map((spd) => (
                            <button
                              key={spd}
                              type="button"
                              onClick={() => setPlaybackSpeed(spd)}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                                playbackSpeed === spd
                                  ? "bg-slate-900 text-white border-slate-900"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                              }`}
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            >
                              {spd}x
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-lg">
                          {[1, 2, 3, 4, 5].map((starIdx) => (
                            <button
                              key={starIdx}
                              type="button"
                              onClick={() => setRating(starIdx)}
                              onMouseEnter={() => setHoverRating(starIdx)}
                              onMouseLeave={() => setHoverRating(0)}
                              className="cursor-pointer focus:outline-hidden"
                            >
                              <Star
                                className={`w-3.5 h-3.5 transition-colors ${
                                  (hoverRating || rating) >= starIdx
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-slate-300 hover:text-slate-400"
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Summary Card */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-blue-50 text-[#1A73E8] flex items-center justify-center">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                          Summary
                        </h3>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-slate-800" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                          Call Summary MantraCare {selectedCall.process || "Consultation"} ({selectedCall.client})
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed mt-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          <strong className="text-slate-800 font-semibold">Reason for Call / Intent:</strong> This was an outbound follow-up call from MantraCare to a prospective customer, {selectedCall.client}, who had recently submitted an enquiry with us. The primary purpose was to understand their needs and offer assistance; the caller's underlying goal was to establish intent and transition the stage ({selectedCall.currentStage}).
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-3">
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>Client</p>
                          <p className="text-xs font-bold text-slate-800 truncate mt-0.5">{selectedCall.client}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>Call Time</p>
                          <p className="text-xs font-bold text-slate-800 truncate mt-0.5">{selectedCall.date}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>Type</p>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold mt-0.5 ${
                            selectedCall.type === "Outbound" ? "bg-blue-50 text-blue-700 border border-blue-200/60" : "bg-purple-50 text-purple-700 border border-purple-200/60"
                          }`}>
                            {selectedCall.type}
                          </span>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>Stage</p>
                          <p className="text-xs font-bold text-slate-800 truncate mt-0.5">{selectedCall.currentStage}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>Status</p>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold mt-0.5 ${
                            selectedCall.status === "Completed"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                              : selectedCall.status === "Failed"
                                ? "bg-rose-50 text-rose-700 border border-rose-200/60"
                                : "bg-amber-50 text-amber-700 border border-amber-200/60"
                          }`}>
                            {selectedCall.status}
                          </span>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>Duration</p>
                          <p className="text-xs font-bold text-slate-800 mt-0.5">{selectedCall.duration || "2:11"}</p>
                        </div>
                      </div>
                    </div>

                    {/* AI Summary Card */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-blue-50 text-[#1A73E8] flex items-center justify-center">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                          AI Summary
                        </h3>
                      </div>

                      <div className="space-y-2.5 text-xs text-slate-600" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        <p className="leading-relaxed">
                          This call was processed with AI Speech Engine for <span className="font-semibold text-slate-800">{selectedCall.process || "patient intake"}</span>. The client demonstrated high responsiveness throughout the dialogue.
                        </p>
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#1A73E8] mt-1.5 flex-shrink-0" />
                            <span>Contact confirmed with final state: <strong className="text-slate-800">{selectedCall.status}</strong></span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#1A73E8] mt-1.5 flex-shrink-0" />
                            <span>Lead progressed into pipeline stage: <strong className="text-slate-800">{selectedCall.currentStage}</strong></span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#1A73E8] mt-1.5 flex-shrink-0" />
                            <span>Action triggered: follow-up communication dispatched and confirmed</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Transcription Card */}
                  <div className="space-y-5">
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col h-full min-h-[500px]">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-blue-50 text-[#1A73E8] flex items-center justify-center">
                            <MessageSquare className="w-3.5 h-3.5" />
                          </div>
                          <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                            Transcription
                          </h3>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          17 Messages
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-4 pt-4 pr-1 max-h-[580px]">
                        {messages.map((msg) => {
                          const isAI = msg.sender === "ai";
                          return (
                            <div key={msg.id} className={`flex flex-col ${isAI ? "items-end" : "items-start"}`}>
                              {/* Label + Avatar Icon */}
                              <div className="flex items-center gap-1.5 mb-1 px-1">
                                {!isAI && (
                                  <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center">
                                    <User className="w-2.5 h-2.5" />
                                  </div>
                                )}
                                <span className="text-[11px] font-medium text-slate-500" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                  {isAI ? "AI Assistant" : "Client"}
                                </span>
                                {isAI && (
                                  <div className="w-4 h-4 rounded-full bg-slate-800 text-white flex items-center justify-center">
                                    <Bot className="w-2.5 h-2.5" />
                                  </div>
                                )}
                              </div>

                              {/* Bubble */}
                              <div
                                className={`rounded-2xl p-3.5 text-xs leading-relaxed max-w-[88%] border ${
                                  isAI
                                    ? "bg-slate-50 border-slate-200/80 text-slate-800 rounded-tr-xs"
                                    : "bg-white border-slate-200/80 text-slate-800 rounded-tl-xs shadow-xs"
                                }`}
                                style={{ fontFamily: 'Outfit, sans-serif' }}
                              >
                                {msg.text}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeDrawerTab === "retry-history" && (
              <div className="p-4 sm:p-6 bg-white min-h-[420px] space-y-4">
                <TableComponent
                  data={retryHistoryData}
                  columns={retryColumns}
                  getRowId={(r) => r.id}
                  enableSelection={false}
                  enableColumnCustomization={true}
                  pagination={false}
                  defaultRowsPerPage={10}
                  emptyMessage="No retry history records found."
                />
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
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
