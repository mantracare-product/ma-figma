import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  LogIn, ArrowRightCircle, CheckCircle2, Phone, MessageCircle, MessageSquare,
  Mail, Zap, Calendar, Pencil, Globe, PhoneIncoming, PhoneOutgoing, PhoneOff,
  MoreVertical, X, Clock, CalendarClock, ChevronRight, Send, FileText, Paperclip, Settings
} from "lucide-react";
import {
  appendActivity,
  subscribeToActivity,
  formatDuration,
  formatTimestamp,
} from "../../../lib/activityEngine";
import { useConversations } from "../../../lib/useConversations";
import { useWhatsappTemplates } from "../../../lib/useWhatsappTemplates";
import ConversationThreadDrawer from "../chats/ConversationThreadDrawer";
import EmailThreadDrawer from "../chats/EmailThreadDrawer";
import { AlertTriangle } from "lucide-react";
import { resolveTestVariables } from "../../../lib/chatbotTestReply";
import ScheduleCallDrawer, {
  ScheduleCallClientOption,
  ScheduleCallFormValues,
} from "../telephony/ScheduleCallDrawer";
import ScheduleAppointmentDrawer, {
  BookingFormValues,
} from "../appointments/ScheduleAppointmentDrawer";

// ─── Legacy ActivityLogEntry (kept for backward compat) ───────────────────────

export type ActivityType =
  | "process_entry" | "whatsapp" | "sms" | "email" | "webhook_trigger"
  | "field_update" | "appointment_booked" | "call" | "outbound_call"
  | "inbound_call" | "failed_call" | "stage_update" | "stage_change"
  | "process_completed" | "website_message" | "website" | "form_submitted";

export interface ActivityLogEntry {
  id: string;
  type: ActivityType | string;
  timestamp?: string;
  date?: string;
  time?: string;
  status?: string;
  sourceStepName?: string;
  refId?: string;
  callId?: string;
  direction?: "inbound" | "outbound";
  details: { primary: string; secondary?: string };
  title?: string;
  description?: string;
  rawType?: string;
  processId?: string;
  processName?: string;
  clientId?: string;
  clientActionId?: string;
  seq?: number;
  // New typed fields (all optional for backward compat)
  messageText?: string;
  phoneNumber?: string;
  subject?: string;
  bodyPreview?: string;
  toOrFrom?: string;
  durationSeconds?: number;
  nextScheduledCall?: { date: string; time: string };
  outcomeSummary?: string;
  fromStage?: string;
  toStage?: string;
  fieldLabel?: string;
  oldValue?: string;
  newValue?: string;
  formName?: string;
  fieldsSummary?: { label: string; value: string }[];
  appointmentTitle?: string;
  location?: string;
  notes?: string;
}

// ─── Static maps ──────────────────────────────────────────────────────────────

const ACTIVITY_ICON_BG: Record<string, string> = {
  process_entry: "#1F2937", call: "#1F2937", outbound_call: "#1F2937",
  inbound_call: "#1F2937", failed_call: "#1F2937", whatsapp: "#1F2937",
  sms: "#1F2937", email: "#1F2937", stage_update: "#1F2937", stage_change: "#1F2937",
  webhook_trigger: "#1F2937", appointment_booked: "#1F2937", field_update: "#1F2937",
  process_completed: "#1F2937", website_message: "#1F2937", website: "#1F2937",
  form_submitted: "#1F2937",
};

const HEADING_BY_TYPE: Record<string, string> = {
  process_entry: "Process Entered", stage_update: "Stage Updated",
  stage_change: "Stage Changed", call: "Call", outbound_call: "Outbound Call",
  inbound_call: "Inbound Call", failed_call: "Call Failed",
  whatsapp: "WhatsApp Message", sms: "SMS Message", email: "Email",
  webhook_trigger: "Webhook Triggered", field_update: "Field Updated",
  appointment_booked: "Appointment Booked", process_completed: "Process Completed",
  website_message: "Website Message", website: "Website Message",
  form_submitted: "Form Submitted",
};

// ─── Status pill ──────────────────────────────────────────────────────────────

const STATUS_PILL: Record<string, { bg: string; color: string; label: string }> = {
  completed:  { bg: "#DCFCE7", color: "#16A34A", label: "Completed" },
  Completed:  { bg: "#DCFCE7", color: "#16A34A", label: "Completed" },
  success:    { bg: "#DCFCE7", color: "#16A34A", label: "Success" },
  confirmed:  { bg: "#DCFCE7", color: "#16A34A", label: "Confirmed" },
  read:       { bg: "#DCFCE7", color: "#16A34A", label: "Read" },
  opened:     { bg: "#DCFCE7", color: "#16A34A", label: "Opened" },
  delivered:  { bg: "#DBF8FF", color: "#0891B2", label: "Delivered" },
  scheduled:  { bg: "#DBEAFE", color: "#2563EB", label: "Scheduled" },
  pending:    { bg: "#FEF3C7", color: "#D97706", label: "Pending" },
  Pending:    { bg: "#FEF3C7", color: "#D97706", label: "Pending" },
  partial:    { bg: "#FEF3C7", color: "#D97706", label: "Partial" },
  no_answer:  { bg: "#FEF3C7", color: "#D97706", label: "No Answer" },
  voicemail:  { bg: "#FEF3C7", color: "#D97706", label: "Voicemail" },
  failed:     { bg: "#FEE2E2", color: "#DC2626", label: "Failed" },
  Failed:     { bg: "#FEE2E2", color: "#DC2626", label: "Failed" },
  bounced:    { bg: "#FEE2E2", color: "#DC2626", label: "Bounced" },
  cancelled:  { bg: "#F1F5F9", color: "#64748B", label: "Cancelled" },
  no_show:    { bg: "#FFF7ED", color: "#C2410C", label: "No Show" },
};

function StatusPill({ status }: { status?: string }) {
  if (!status) return null;
  const s = STATUS_PILL[status] ?? { bg: "#F1F5F9", color: "#64748B", label: status };
  return (
    <span
      className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: s.bg, color: s.color, fontFamily: "Outfit, sans-serif" }}
    >
      {s.label}
    </span>
  );
}

// ─── Activity icon ────────────────────────────────────────────────────────────

function ActivityIcon({ type, direction, status }: { type: string; direction?: string; status?: string }) {
  const cls = "w-4 h-4 text-white";
  if (type === "inbound_call" || (type === "call" && direction === "inbound"))
    return <PhoneIncoming className={cls} />;
  if (type === "outbound_call" || (type === "call" && direction === "outbound"))
    return <PhoneOutgoing className={cls} />;
  if (type === "failed_call" || status === "failed" || status === "Failed")
    return <PhoneOff className={cls} />;
  switch (type) {
    case "process_entry":     return <LogIn className={cls} />;
    case "stage_update":
    case "stage_change":      return <ArrowRightCircle className={cls} />;
    case "process_completed": return <CheckCircle2 className={cls} />;
    case "call":              return <Phone className={cls} />;
    case "whatsapp":          return <MessageCircle className={cls} />;
    case "sms":               return <MessageSquare className={cls} />;
    case "email":             return <Mail className={cls} />;
    case "webhook_trigger":   return <Zap className={cls} />;
    case "appointment_booked": return <Calendar className={cls} />;
    case "field_update":      return <Pencil className={cls} />;
    case "form_submitted":    return <FileText className={cls} />;
    case "website_message":
    case "website":           return <Globe className={cls} />;
    default:                  return <Pencil className={cls} />;
  }
}

// ─── Chat bubble (WhatsApp / SMS) ─────────────────────────────────────────────

function ChatBubble({ text, direction }: { text: string; direction: "sent" | "received" }) {
  const [expanded, setExpanded] = useState(false);
  const maxLen = 120;
  const isLong = text.length > maxLen;
  const display = isLong && !expanded ? text.slice(0, maxLen) + "…" : text;
  const sent = direction === "sent";
  return (
    <div className={`flex ${sent ? "justify-end" : "justify-start"} mt-1`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm`}
        style={{
          backgroundColor: sent ? "#E8F5E9" : "#F1F5F9",
          color: sent ? "#1B5E20" : "#374151",
          borderRadius: sent ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          fontFamily: "Outfit, sans-serif",
        }}
      >
        {display}
        {isLong && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="ml-1.5 text-[10px] font-semibold underline opacity-70 hover:opacity-100"
            style={{ color: sent ? "#2E7D32" : "#3B82F6" }}
          >
            {expanded ? "Show less" : "View full"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Kebab action menu ────────────────────────────────────────────────────────

interface MenuAction { label: string; icon?: React.ReactNode; onClick: () => void; danger?: boolean }

function KebabMenu({ actions }: { actions: MenuAction[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
        title="Actions"
      >
        <MoreVertical className="w-4 h-4 text-gray-400" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 bg-white rounded-xl border border-gray-200 shadow-xl py-1 z-50 min-w-[168px]"
          style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
        >
          {actions.map((a, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpen(false); a.onClick(); }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-left transition-colors hover:bg-gray-50 ${a.danger ? "text-red-600 hover:bg-red-50" : "text-gray-700"}`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {a.icon && <span className="flex-shrink-0 opacity-70">{a.icon}</span>}
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Follow-up call scheduler modal ──────────────────────────────────────────

function ScheduleFollowUpModal({
  onClose,
  onSchedule,
}: {
  onClose: () => void;
  onSchedule: (date: string, time: string) => void;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[600]"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-5 w-80 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-sm text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
            Schedule Follow-Up Call
          </p>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1 uppercase" style={{ fontFamily: "Outfit, sans-serif" }}>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              style={{ fontFamily: "Outfit, sans-serif" }} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1 uppercase" style={{ fontFamily: "Outfit, sans-serif" }}>Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              style={{ fontFamily: "Outfit, sans-serif" }} />
          </div>
          <button
            onClick={() => { if (date && time) { onSchedule(date, time); onClose(); } else toast.error("Please pick a date and time"); }}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <CalendarClock className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            Schedule Call
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Per-type content blocks ──────────────────────────────────────────────────

function CallBlock({ entry }: { entry: ActivityLogEntry }) {
  const dirLabel = entry.direction === "inbound" ? "Inbound" : "Outbound";
  const dur = entry.durationSeconds != null
    ? formatDuration(entry.durationSeconds)
    : (entry.details?.primary?.match(/\d+:\d+/)?.[0] ?? null);
  const hasNext = !!entry.nextScheduledCall;
  return (
    <div className="space-y-1.5 mt-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs font-medium text-gray-600" style={{ fontFamily: "Outfit, sans-serif" }}>
          {dirLabel}
        </span>
        {dur && (
          <>
            <span className="text-gray-300">·</span>
            <span className="text-xs font-semibold text-gray-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
              <Clock className="w-3 h-3 inline mr-0.5 text-gray-400" />
              {dur}
            </span>
          </>
        )}
        {!dur && entry.status !== "completed" && entry.status !== "Completed" && (
          <>
            <span className="text-gray-300">·</span>
            <span className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>—</span>
          </>
        )}
      </div>
      {hasNext && (
        <div className="flex items-center gap-1.5 text-[11px] text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg w-fit">
          <CalendarClock className="w-3.5 h-3.5 flex-shrink-0" />
          <span style={{ fontFamily: "Outfit, sans-serif" }}>
            Next call — {entry.nextScheduledCall!.date} {entry.nextScheduledCall!.time}
          </span>
        </div>
      )}
      {entry.outcomeSummary && (
        <p className="text-[11px] text-gray-500 italic line-clamp-1" style={{ fontFamily: "Outfit, sans-serif" }}>
          {entry.outcomeSummary}
        </p>
      )}
    </div>
  );
}

function WhatsAppSmsBlock({
  entry,
  onOpenThreadDrawer,
}: {
  entry: ActivityLogEntry;
  onOpenThreadDrawer?: (convId: string) => void;
}) {
  const dir = (entry.direction as "sent" | "received") || "sent";
  const text = entry.messageText || entry.details?.primary || "";
  const phone = entry.phoneNumber || entry.details?.secondary || "";
  const rawType = (entry as any).rawType || entry.type;
  const isWhatsapp = rawType === "whatsapp";

  const { getConversation, findConversationForClient, getSessionWindow, sendTemplate } = useConversations();
  const [globalTemplates] = useWhatsappTemplates();
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [selectedTplId, setSelectedTplId] = useState("");

  const conv = getConversation(entry.refId || "") || findConversationForClient({ clientId: entry.clientId, phone, name: entry.details?.primary });
  const session = getSessionWindow(conv?.id || entry.refId || "");

  const approvedTemplates = globalTemplates.filter((t) => t.approvalStatus === "approved" || !t.approvalStatus);

  useEffect(() => {
    if (approvedTemplates.length > 0 && !selectedTplId) {
      setSelectedTplId(approvedTemplates[0].id);
    }
  }, [approvedTemplates, selectedTplId]);

  const handleSendTemplateFromCard = () => {
    if (!conv) {
      toast.error("Conversation not found");
      return;
    }
    const tpl = approvedTemplates.find((t) => t.id === selectedTplId) || approvedTemplates[0];
    if (!tpl) {
      toast.error("No approved template available");
      return;
    }

    sendTemplate(conv.id, tpl);
    setShowTemplatePicker(false);
    toast.success(`Template "${tpl.name}" sent`);
  };

  const remainingHours = session.hoursRemaining ?? 24;
  const h = Math.floor(remainingHours);
  const m = Math.round((remainingHours - h) * 60);

  return (
    <div className="mt-2 space-y-2">
      {phone && (
        <p className="text-[11px] text-gray-400 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>{phone}</p>
      )}
      {text ? (
        <ChatBubble text={text} direction={dir} />
      ) : (
        <p className="text-xs text-gray-400 italic" style={{ fontFamily: "Outfit, sans-serif" }}>
          {entry.details?.primary || ""}
        </p>
      )}

      {/* WhatsApp Reply-Window Status Indicator */}
      {isWhatsapp && (
        <div className="mt-2 pt-1">
          {session.freeFormAllowed ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200" style={{ fontFamily: "Outfit, sans-serif" }}>
              <Clock className="w-3 h-3 text-blue-600" />
              <span>Reply window: {h}h {m}m left</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200" style={{ fontFamily: "Outfit, sans-serif" }}>
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span>Session expired — template message required</span>
              </div>

              {!showTemplatePicker ? (
                <div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTemplatePicker(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" /> Send Template
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs" onClick={(e) => e.stopPropagation()}>
                  <p className="font-semibold text-amber-900">Select Approved Template</p>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedTplId}
                      onChange={(e) => setSelectedTplId(e.target.value)}
                      className="flex-1 text-xs px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg"
                    >
                      {approvedTemplates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.category})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleSendTemplateFromCard}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-sm"
                    >
                      Send
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTemplatePicker(false)}
                      className="px-2 py-1.5 text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

function EmailBlock({
  entry,
  onOpenEmailThreadDrawer,
}: {
  entry: ActivityLogEntry;
  onOpenEmailThreadDrawer?: (convId: string, subject?: string) => void;
}) {
  const subject = entry.subject || entry.details?.primary || "";
  const preview = entry.bodyPreview || entry.details?.secondary || "";
  const addr = entry.toOrFrom || "";
  return (
    <div className="mt-2 space-y-1">
      {addr && <p className="text-[11px] text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>{addr}</p>}
      {subject && (
        <p className="text-xs font-semibold text-gray-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
          {subject}
        </p>
      )}
      {preview && (
        <p className="text-[11px] text-gray-500 line-clamp-2" style={{ fontFamily: "Outfit, sans-serif" }}>
          {preview}
        </p>
      )}
      {!subject && !preview && (
        <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
          {entry.details?.primary || ""}
        </p>
      )}
    </div>
  );
}

function AppointmentBlock({ entry }: { entry: ActivityLogEntry }) {
  const dateTime = [entry.date, entry.time].filter(Boolean).join(" · ");
  const loc = entry.location || entry.details?.secondary || "";
  const notes = entry.notes || "";
  return (
    <div className="mt-2 space-y-1.5">
      {dateTime && (
        <div className="flex items-center gap-2 text-sm font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
          <Calendar className="w-4 h-4 text-cyan-600 flex-shrink-0" />
          {dateTime}
        </div>
      )}
      {loc && <p className="text-[11px] text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>{loc}</p>}
      {notes && <p className="text-[11px] text-gray-400 italic" style={{ fontFamily: "Outfit, sans-serif" }}>{notes}</p>}
    </div>
  );
}

function FormBlock({ entry }: { entry: ActivityLogEntry }) {
  const fields = entry.fieldsSummary || [];
  const displayFields = fields.slice(0, 3);
  return (
    <div className="mt-2 space-y-1.5">
      {entry.formName && (
        <p className="text-xs font-semibold text-gray-700" style={{ fontFamily: "DM Sans, sans-serif" }}>
          {entry.formName}
        </p>
      )}
      {displayFields.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {displayFields.map((f, i) => (
            <div key={i}>
              <span className="text-[10px] text-gray-400 uppercase font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                {f.label}
              </span>
              <p className="text-[11px] text-gray-700 font-medium truncate" style={{ fontFamily: "Outfit, sans-serif" }}>
                {f.value}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
          {entry.details?.primary || ""}
        </p>
      )}
    </div>
  );
}

function StageBlock({ entry }: { entry: ActivityLogEntry }) {
  const from = entry.fromStage || "";
  const to = entry.toStage || entry.details?.primary || "";
  return (
    <div className="mt-2 flex items-center gap-2 text-xs" style={{ fontFamily: "Outfit, sans-serif" }}>
      {from && <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{from}</span>}
      {from && <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
      {to && <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-semibold">{to}</span>}
      {!from && !to && (
        <span className="text-gray-500">{entry.details?.primary || ""}</span>
      )}
    </div>
  );
}

function FieldUpdateBlock({ entry }: { entry: ActivityLogEntry }) {
  const label = entry.fieldLabel || "";
  const oldVal = entry.oldValue;
  const newVal = entry.newValue || entry.details?.primary || "";
  return (
    <div className="mt-2 space-y-0.5">
      {label && <p className="text-[11px] text-gray-400 font-semibold uppercase" style={{ fontFamily: "Outfit, sans-serif" }}>{label}</p>}
      <div className="flex items-center gap-2 text-xs flex-wrap" style={{ fontFamily: "Outfit, sans-serif" }}>
        {oldVal && (
          <>
            <span className="text-gray-400 line-through">{oldVal}</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          </>
        )}
        <span className="text-gray-800 font-semibold">{newVal}</span>
      </div>
    </div>
  );
}

function GenericBlock({ entry }: { entry: ActivityLogEntry }) {
  const primary = entry.details?.primary || entry.title || entry.description || "";
  const secondary = entry.details?.secondary || "";
  return (
    <div className="mt-1.5 space-y-0.5">
      {primary && (
        <p className="text-xs text-gray-700 font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>{primary}</p>
      )}
      {secondary && (
        <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>{secondary}</p>
      )}
      {entry.sourceStepName && (
        <p className="text-[11px] text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>via {entry.sourceStepName}</p>
      )}
    </div>
  );
}

// ─── Main card component ──────────────────────────────────────────────────────

interface ActivityCardProps {
  entry: ActivityLogEntry;
  isLast: boolean;
  onView: () => void;
  onOpenCallDetail?: (callId: string, entry?: ActivityLogEntry) => void;
  onCloseParentDrawer?: () => void;
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  onAppendActivity: (entry: Omit<ActivityLogEntry, "id" | "timestamp"> & { id?: string; timestamp?: string }) => void;
  onOpenScheduleFollowUp: () => void;
  onOpenRescheduleAppointment?: () => void;
  onOpenComposePanel: (type: "whatsapp" | "sms" | "email") => void;
  onOpenThreadDrawer?: (conversationId: string, channel?: "whatsapp" | "sms" | "website") => void;
  onOpenEmailThreadDrawer?: (conversationId: string, subject?: string) => void;
  navigate: ReturnType<typeof useNavigate>;
}

function ActivityCard({
  entry,
  isLast,
  onView,
  onOpenCallDetail,
  onCloseParentDrawer,
  clientId,
  clientName,
  clientPhone,
  clientEmail,
  onAppendActivity,
  onOpenScheduleFollowUp,
  onOpenRescheduleAppointment,
  onOpenComposePanel,
  onOpenThreadDrawer,
  onOpenEmailThreadDrawer,
  navigate,
}: ActivityCardProps) {
  const rawType = (entry as any).rawType || entry.type;
  const isFailed = entry.status === "failed" || entry.status === "Failed";
  const isPending = entry.status === "pending" || entry.status === "Pending";

  // Determine heading
  const heading = (() => {
    if (rawType === "call" || rawType === "outbound_call") {
      const dir = entry.direction === "inbound" ? "Inbound" : "Outbound";
      return `${dir} Call${entry.status === "completed" || entry.status === "Completed" ? " Completed" : entry.status === "failed" || entry.status === "Failed" ? " Failed" : ""}`;
    }
    if (rawType === "inbound_call") return "Inbound Call Received";
    if (rawType === "failed_call") return "Outbound Call Failed";
    return HEADING_BY_TYPE[rawType] || HEADING_BY_TYPE[entry.type] || entry.title || "Activity";
  })();

  // Timestamp display
  const ts = entry.timestamp || (entry.date ? `${entry.date}${entry.time ? " " + entry.time : ""}` : "");
  const displayTs = ts ? formatTimestamp(ts) : "";

  // Background + border color for icon (Client Table Header background #1F2937)
  const iconBg = "#1F2937";
  const iconBorder = isFailed ? "#EF4444" : isPending ? "#64748B" : "#374151";

  // Build kebab actions
  const kebabActions: MenuAction[] = [];

  const isCallType = rawType === "call" || rawType === "outbound_call" || rawType === "inbound_call" || rawType === "failed_call" || (entry as any).callId;
  const now = new Date().toISOString();

  if (isCallType) {
    kebabActions.push({
      label: "Schedule Follow-Up Call",
      icon: <CalendarClock className="w-3.5 h-3.5" />,
      onClick: onOpenScheduleFollowUp,
    });
    kebabActions.push({
      label: "Call Again",
      icon: <Phone className="w-3.5 h-3.5" />,
      onClick: () => {
        toast.success(`Initiating call to ${clientName || "client"}…`);
        onAppendActivity({
          type: "outbound_call" as any,
          clientId,
          processId: entry.processId,
          processName: entry.processName,
          direction: "outbound",
          status: "scheduled",
          callId: `CALL-${Date.now()}`,
          timestamp: now,
          details: { primary: "Call Again initiated", secondary: `Following up on ${heading}` },
        });
      },
    });
  }

  if (rawType === "whatsapp") {
    kebabActions.push({
      label: "Reply",
      icon: <MessageCircle className="w-3.5 h-3.5" />,
      onClick: () => {
        if (onOpenThreadDrawer) {
          onOpenThreadDrawer(entry.refId || entry.id, "whatsapp");
        } else {
          onOpenComposePanel("whatsapp");
        }
      },
    });
  }

  if (rawType === "sms") {
    kebabActions.push({
      label: "Reply",
      icon: <MessageSquare className="w-3.5 h-3.5" />,
      onClick: () => {
        if (onOpenThreadDrawer) {
          onOpenThreadDrawer(entry.refId || entry.id, "sms");
        } else {
          onOpenComposePanel("sms");
        }
      },
    });
  }

  if (rawType === "email") {
    kebabActions.push({
      label: "Reply",
      icon: <Mail className="w-3.5 h-3.5" />,
      onClick: () => {
        if (onOpenEmailThreadDrawer) {
          onOpenEmailThreadDrawer(entry.refId || entry.id, entry.subject || entry.details?.primary);
        } else {
          onOpenComposePanel("email");
        }
      },
    });
  }

  if (rawType === "appointment_booked") {
    kebabActions.push({
      label: "Reschedule",
      icon: <CalendarClock className="w-3.5 h-3.5" />,
      onClick: () => {
        if (onOpenRescheduleAppointment) {
          onOpenRescheduleAppointment();
        }
      },
    });
    kebabActions.push({
      label: "Cancel Appointment",
      icon: <X className="w-3.5 h-3.5" />,
      danger: true,
      onClick: () => {
        toast.success("Appointment cancelled");
        onAppendActivity({
          type: "appointment_booked" as any,
          clientId,
          processId: entry.processId,
          processName: entry.processName,
          status: "cancelled",
          date: entry.date || "",
          time: entry.time || "",
          timestamp: now,
          details: { primary: "Appointment cancelled", secondary: `Was: ${entry.date || ""} ${entry.time || ""}` },
        });
      },
    });
  }

  if (rawType === "form_submitted") {
    kebabActions.push({
      label: "Resend Form",
      icon: <Send className="w-3.5 h-3.5" />,
      onClick: () => {
        toast.success(`Form resent to ${clientName || "client"}`);
        onAppendActivity({
          type: "form_submitted" as any,
          clientId,
          processId: entry.processId,
          processName: entry.processName,
          formName: entry.formName || "Form",
          status: "pending",
          fieldsSummary: [],
          timestamp: now,
          details: { primary: `Form resent: ${entry.formName || "Form"}`, secondary: `Awaiting completion by ${clientName || "client"}` },
        });
      },
    });
  }

  // Render type-specific content
  const renderContent = () => {
    const t = rawType || entry.type;
    if (t === "call" || t === "outbound_call" || t === "inbound_call" || t === "failed_call")
      return <CallBlock entry={entry} />;
    if (t === "whatsapp" || t === "sms")
      return <WhatsAppSmsBlock entry={entry} onOpenThreadDrawer={onOpenThreadDrawer} />;
    if (t === "email")
      return <EmailBlock entry={entry} onOpenEmailThreadDrawer={onOpenEmailThreadDrawer} />;
    if (t === "appointment_booked")
      return <AppointmentBlock entry={entry} />;
    if (t === "form_submitted")
      return <FormBlock entry={entry} />;
    if (t === "stage_update" || t === "stage_change")
      return <StageBlock entry={entry} />;
    if (t === "field_update")
      return <FieldUpdateBlock entry={entry} />;
    // Website message — add link
    if (t === "website_message" || t === "website") {
      return (
        <div className="mt-1.5">
          <GenericBlock entry={entry} />
          <div className="mt-2">
            <span
              onClick={(e) => {
                e.stopPropagation();
                if (onCloseParentDrawer) onCloseParentDrawer();
                navigate("/chats", { state: { clientId, channel: "website" } });
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-purple-600" /> View Website Chat
            </span>
          </div>
        </div>
      );
    }
    return <GenericBlock entry={entry} />;
  };

  return (
    <div className="relative flex gap-3 pb-4 last:pb-0">
      {/* Timeline line */}
      {!isLast && (
        <div
          className="absolute left-[17px] top-9 bottom-0 w-[2px] z-0"
          style={{
            backgroundColor: isPending ? "transparent" : "#1F2937",
            backgroundImage: isPending
              ? "repeating-linear-gradient(to bottom, #CBD5E1 0 4px, transparent 4px 8px)"
              : undefined,
          }}
        />
      )}

      {/* Icon node */}
      <div
        className="relative z-10 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border-2"
        style={{ backgroundColor: iconBg, borderColor: iconBorder, boxShadow: "0 2px 6px rgba(0, 0, 0, 0.18)" }}
      >
        <ActivityIcon type={rawType || entry.type} direction={entry.direction} status={entry.status} />
      </div>

      {/* Card */}
      <div
        className="flex-1 p-3 rounded-xl border border-gray-200 bg-white hover:border-[#1F2937] hover:shadow-md transition-all select-none"
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <span
              className="text-sm font-bold text-gray-900 leading-tight"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              {heading}
            </span>
            {/* Status pill + source step */}
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              <StatusPill status={entry.status || "completed"} />
              {entry.sourceStepName && (
                <span className="text-[10px] text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>
                  via {entry.sourceStepName}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span
              className="text-[11px] text-gray-400 whitespace-nowrap"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {displayTs}
            </span>
            {!["process_entry", "stage_update", "stage_change", "process_completed"].includes(rawType) && kebabActions.length > 0 && (
              <KebabMenu actions={kebabActions} />
            )}
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-gray-100 my-2" />

        {/* Type-specific content + kebab spacer */}
        <div>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

// ─── Threaded card for WhatsApp / SMS conversations ─────────────────────────

export interface ThreadGroup {
  id: string;
  type: "whatsapp" | "sms";
  refId: string;
  phone: string;
  entries: ActivityLogEntry[]; // Ascending order: oldest -> newest
  latestTimestamp: string;
}

export type TimelineItem =
  | { isThread: false; entry: ActivityLogEntry }
  | { isThread: true; group: ThreadGroup };

function groupTimelineItems(displayedEntries: ActivityLogEntry[]): TimelineItem[] {
  const result: TimelineItem[] = [];
  let currentGroup: ThreadGroup | null = null;

  for (const entry of displayedEntries) {
    const rawType = (entry as any).rawType || entry.type;
    const isWpOrSms = rawType === "whatsapp" || rawType === "sms";

    if (isWpOrSms) {
      const refId = entry.refId || entry.phoneNumber || entry.clientId || "default";
      if (currentGroup && currentGroup.type === rawType && currentGroup.refId === refId) {
        currentGroup.entries.push(entry);
      } else {
        if (currentGroup) {
          result.push({ isThread: true, group: currentGroup });
        }
        currentGroup = {
          id: `group-${entry.id}`,
          type: rawType as "whatsapp" | "sms",
          refId,
          phone: entry.phoneNumber || "",
          entries: [entry],
          latestTimestamp: entry.timestamp || entry.date || "",
        };
      }
    } else {
      if (currentGroup) {
        result.push({ isThread: true, group: currentGroup });
        currentGroup = null;
      }
      result.push({ isThread: false, entry });
    }
  }

  if (currentGroup) {
    result.push({ isThread: true, group: currentGroup });
  }

  // Ensure entries inside each thread group are sorted ASCENDING (oldest -> newest)
  for (const item of result) {
    if (item.isThread) {
      item.group.entries.sort((a, b) => {
        const ta = new Date(a.timestamp || a.date || "").getTime();
        const tb = new Date(b.timestamp || b.date || "").getTime();
        if (ta !== tb) return ta - tb;
        return ((a as any).seq ?? 0) - ((b as any).seq ?? 0);
      });
    }
  }

  return result;
}

function ThreadedCard({
  group,
  isLast,
  onOpenComposePanel,
  onOpenThreadDrawer,
}: {
  group: ThreadGroup;
  isLast: boolean;
  onOpenComposePanel: (type: "whatsapp" | "sms" | "email") => void;
  onOpenThreadDrawer?: (convId: string, channel?: "whatsapp" | "sms" | "website") => void;
}) {
  const isWhatsapp = group.type === "whatsapp";
  const title = isWhatsapp ? "WhatsApp Conversation" : "SMS Conversation";
  const latestTs = formatTimestamp(group.latestTimestamp);
  const iconBg = isWhatsapp ? "#DCFCE7" : "#E0E7FF";

  const kebabActions: MenuAction[] = [
    {
      label: "Reply",
      icon: isWhatsapp ? <MessageCircle className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />,
      onClick: () => {
        if (onOpenThreadDrawer) {
          onOpenThreadDrawer(group.refId, group.type);
        } else {
          onOpenComposePanel(group.type);
        }
      },
    },
  ];

  return (
    <div className="relative flex gap-3 pb-4 last:pb-0">
      {!isLast && <div className="absolute left-[17px] top-9 bottom-0 w-[2px] z-0 bg-[#1F2937]" />}
      <div className="relative z-10 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border-2" style={{ backgroundColor: "#1F2937", borderColor: "#374151", boxShadow: "0 2px 6px rgba(0, 0, 0, 0.18)" }}>
        {isWhatsapp ? <MessageCircle className="w-4 h-4 text-white" /> : <MessageSquare className="w-4 h-4 text-white" />}
      </div>

      <div className="flex-1 p-3 rounded-xl border border-gray-200 bg-white hover:border-[#1F2937] hover:shadow-md transition-all select-none space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                {title}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {group.entries.length} {group.entries.length === 1 ? "message" : "messages"}
              </span>
            </div>
            {group.phone && <p className="text-[11px] text-gray-400 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>{group.phone}</p>}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[11px] text-gray-400 whitespace-nowrap" style={{ fontFamily: "Outfit, sans-serif" }}>{latestTs}</span>
            <KebabMenu actions={kebabActions} />
          </div>
        </div>

        <div className="border-t border-gray-100 my-2" />

        {/* Threaded message list in ascending order */}
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {group.entries.map((entry) => {
            const dir = (entry.direction as "sent" | "received") || "sent";
            const text = entry.messageText || entry.details?.primary || "";
            const msgTs = formatTimestamp(entry.timestamp || entry.date || "");
            return (
              <div key={entry.id} className="space-y-1">
                <div className={`flex items-center justify-between text-[10px] text-gray-400 px-1`} style={{ fontFamily: "Outfit, sans-serif" }}>
                  <span>{dir === "sent" ? "Sent" : "Received"} · {msgTs}</span>
                  <StatusPill status={entry.status || "delivered"} />
                </div>
                <ChatBubble text={text} direction={dir} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ActivityTabProps {
  activity: ActivityLogEntry[];
  onOpenActivity?: (entry: ActivityLogEntry) => void;
  onOpenCallDetail?: (callId: string, entry?: ActivityLogEntry) => void;
  clientId?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  processTabs?: { id: string; name: string }[];
  activeProcessTab?: string;
  onProcessTabChange?: (tabId: string) => void;
  onCloseParentDrawer?: () => void;
  emptyMessage?: string;
  /** Called when user clicks "Create New Appointment" in the Appointment compose panel */
  onOpenScheduleAppointment?: () => void;
}

// ─── Shared deduplicating merge helper ───────────────────────────────────────

export function mergeActivityEntries(
  existing: ActivityLogEntry[],
  incoming: ActivityLogEntry[]
): ActivityLogEntry[] {
  const incomingIds = new Set(incoming.map((e) => e.id).filter(Boolean));
  const incomingActionIds = new Set(incoming.map((e) => (e as any).clientActionId).filter(Boolean));

  const existingKeep = existing.filter((e) => {
    if (e.id && incomingIds.has(e.id)) return false;
    if ((e as any).clientActionId && incomingActionIds.has((e as any).clientActionId)) return false;
    const isDuplicate = incoming.some((inc) => {
      if (inc.type !== e.type) return false;
      const tInc = new Date(inc.timestamp || inc.date || "").getTime();
      const tExist = new Date(e.timestamp || e.date || "").getTime();
      if (isNaN(tInc) || isNaN(tExist)) return false;
      if (Math.abs(tInc - tExist) > 2000) return false;
      return (inc.details?.primary || "") === (e.details?.primary || "");
    });
    return !isDuplicate;
  });

  return [...incoming, ...existingKeep];
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function ActivityTab({
  activity = [],
  onOpenActivity,
  onOpenCallDetail,
  clientId,
  clientName,
  clientEmail,
  clientPhone,
  processTabs,
  activeProcessTab,
  onProcessTabChange,
  onCloseParentDrawer,
  emptyMessage = "No activity yet",
  onOpenScheduleAppointment,
}: ActivityTabProps) {
  const navigate = useNavigate();
  const { findOrCreateConversationForClient, sendMessage, sendTemplate } = useConversations();

  const normalizedClientId = clientId ? String(clientId) : "";

  useEffect(() => {
    if (!normalizedClientId) {
      console.warn("[ActivityTab] Warning: ActivityTab mounted with falsy clientId:", clientId);
    }
  }, [normalizedClientId, clientId]);

  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("all");
  const [actionText, setActionText] = useState("");
  const [emailSubject, setEmailSubject] = useState("");

  // Conversation Thread Drawer state
  const [showThreadDrawer, setShowThreadDrawer] = useState(false);
  const [threadDrawerConversationId, setThreadDrawerConversationId] = useState<string>("");
  const [threadDrawerChannel, setThreadDrawerChannel] = useState<"whatsapp" | "sms" | "website">("whatsapp");

  // Email Thread Drawer state
  const [showEmailThreadDrawer, setShowEmailThreadDrawer] = useState(false);
  const [emailThreadId, setEmailThreadId] = useState<string>("");
  const [emailThreadSubject, setEmailThreadSubject] = useState<string>("");

  // Live activity from engine (starts from prop, updates on appendActivity)
  const [liveActivity, setLiveActivity] = useState<ActivityLogEntry[]>(activity);

  // Compose panel override: allow kebab "Reply" actions to open the right panel
  const [forcedPanel, setForcedPanel] = useState<"whatsapp" | "sms" | "email" | null>(null);

  // WhatsApp gear and template state
  const [globalTemplates] = useWhatsappTemplates();
  const [showWpGearMenu, setShowWpGearMenu] = useState(false);
  const [showWpTemplateModal, setShowWpTemplateModal] = useState(false);
  const [wpSelectedTplId, setWpSelectedTplId] = useState("");

  const approvedTemplates = globalTemplates.filter((t) => t.approvalStatus === "approved" || !t.approvalStatus);

  // Schedule Call Drawer state
  const [showScheduleCallDrawer, setShowScheduleCallDrawer] = useState(false);
  const [scMode, setScMode] = useState<"schedule" | "reschedule">("schedule");
  const [scFormValues, setScFormValues] = useState<ScheduleCallFormValues>({
    client: null,
    clientSearch: "",
    process: "",
    stage: "",
    calendarMonth: new Date(),
    selectedDate: null,
    hour: new Date().getHours(),
    minute: new Date().getMinutes(),
  });
  const [scIsSaving, setScIsSaving] = useState(false);
  const [currentCallActionId, setCurrentCallActionId] = useState("");

  // Schedule Appointment Drawer state
  const [showScheduleApptDrawer, setShowScheduleApptDrawer] = useState(false);
  const [apptMode, setApptMode] = useState<"create" | "reschedule">("create");
  const [apptIsSaving, setApptIsSaving] = useState(false);
  const [currentApptActionId, setCurrentApptActionId] = useState("");
  const [apptFormValues, setApptFormValues] = useState<BookingFormValues>({
    title: "Follow-up Consultation",
    description: "",
    note: "",
    tags: "",
    processId: "Patient Intake",
    stageId: "Initial Contact",
    date: new Date().toISOString().split("T")[0],
    startHour: 10,
    startMinute: 0,
    sessionType: "video",
    client: {
      id: 1,
      name: clientName || "Client",
      email: clientEmail || "client@email.com",
      phone: clientPhone || "555-0100",
    },
    provider: { id: 1, name: "John Smith", email: "john.smith@healthcare.com" },
  });

  const processStagesMap: Record<string, string[]> = {
    "Patient Intake": ["Initial Contact", "Insurance Verify", "Schedule Appointment"],
    "Follow-up Calls": ["Post-Visit Check", "Medication Reminder", "Follow-up"],
    "Payment Reminder": ["Billing Inquiry", "Issue Resolution", "Payment Notice", "Payment Collected"],
    "Appointment Scheduling": ["Slot Selection", "Confirmation"],
    "Insurance Verification": ["Document Check", "Verification", "Approval"],
  };

  const lockedClientForTab: ScheduleCallClientOption = {
    id: clientId || "CL-001",
    name: clientName || "Client",
    email: clientEmail || "client@email.com",
    phone: clientPhone || "555-0100",
    countryCode: "+1",
    countryFlag: "🇺🇸",
    country: "US",
    status: "Active",
    processes: processTabs ? processTabs.filter((p) => p.id !== "all").map((p) => p.name) : ["Patient Intake", "Follow-up Calls"],
  };

  const handleOpenScheduleCall = (mode: "schedule" | "reschedule" = "schedule", entry?: ActivityLogEntry) => {
    setScMode(mode);
    setCurrentCallActionId(`act-call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    const proc = entry?.processName || (processTabs && processTabs.length > 1 ? processTabs[1].name : "Patient Intake");
    const stg = proc && processStagesMap[proc] ? processStagesMap[proc][0] : "";
    setScFormValues({
      client: lockedClientForTab,
      clientSearch: "",
      process: proc,
      stage: stg,
      calendarMonth: new Date(),
      selectedDate: new Date(),
      hour: new Date().getHours() + 1,
      minute: 0,
    });
    setShowScheduleCallDrawer(true);
  };

  const handleScheduleCallSave = () => {
    if (!scFormValues.selectedDate || scIsSaving) return;
    setScIsSaving(true);
    setTimeout(() => {
      const dateStr = `${scFormValues.selectedDate!.getFullYear()}-${String(scFormValues.selectedDate!.getMonth() + 1).padStart(2, "0")}-${String(scFormValues.selectedDate!.getDate()).padStart(2, "0")}`;
      const timeStr = `${String(scFormValues.hour).padStart(2, "0")}:${String(scFormValues.minute).padStart(2, "0")}`;

      const created = handleAppend({
        clientActionId: currentCallActionId,
        type: "call" as any,
        clientId: normalizedClientId,
        processId: scFormValues.process,
        processName: scFormValues.process,
        direction: "outbound",
        status: "scheduled",
        callId: `CALL-${Date.now()}`,
        nextScheduledCall: { date: dateStr, time: timeStr },
        timestamp: new Date().toISOString(),
        details: {
          primary: `Follow-up call scheduled`,
          secondary: `Date: ${dateStr} at ${timeStr}${scFormValues.process ? ` · ${scFormValues.process}` : ""}`,
        },
      });

      if (!created) {
        toast.error("Couldn't save this activity — client context missing");
        setScIsSaving(false);
        return;
      }

      toast.success(`Call scheduled for ${scFormValues.client?.name || clientName || "client"} on ${dateStr} at ${timeStr}`);
      setScIsSaving(false);
      setShowScheduleCallDrawer(false);
    }, 400);
  };

  const handleOpenScheduleAppt = (mode: "create" | "reschedule" = "create") => {
    setApptMode(mode);
    setCurrentApptActionId(`act-appt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    setApptFormValues((prev) => ({
      ...prev,
      title: mode === "reschedule" ? "Rescheduled Appointment" : "Follow-up Consultation",
      client: {
        id: 1,
        name: clientName || "Client",
        email: clientEmail || "client@email.com",
        phone: clientPhone || "555-0100",
      },
    }));
    setShowScheduleApptDrawer(true);
  };

  const handleScheduleApptSave = () => {
    if (apptIsSaving) return;
    setApptIsSaving(true);
    const timeStr = `${String(apptFormValues.startHour).padStart(2, "0")}:${String(apptFormValues.startMinute).padStart(2, "0")}`;
    const created = handleAppend({
      clientActionId: currentApptActionId,
      type: "appointment_booked" as any,
      clientId: normalizedClientId,
      processId: apptFormValues.processId,
      processName: apptFormValues.processId,
      status: "scheduled",
      date: apptFormValues.date,
      time: timeStr,
      appointmentTitle: apptFormValues.title.trim() || "Appointment",
      location: apptFormValues.sessionType === "inPerson" ? "In-Person" : "Video Call",
      notes: apptFormValues.note || apptFormValues.description || "",
      timestamp: new Date().toISOString(),
      details: {
        primary: apptFormValues.title.trim() || "Appointment Booked",
        secondary: `${apptFormValues.date} at ${timeStr} · ${apptFormValues.provider?.name || "Provider"}`,
      },
    });

    if (!created) {
      toast.error("Couldn't save this activity — client context missing");
      setApptIsSaving(false);
      return;
    }

    toast.success(`Appointment ${apptMode === "reschedule" ? "rescheduled" : "booked"} successfully!`);
    setApptIsSaving(false);
    setShowScheduleApptDrawer(false);
  };

  // Keep liveActivity in sync with incoming prop without discarding local/engine entries
  useEffect(() => {
    setLiveActivity((prev) => mergeActivityEntries(prev, activity));
  }, [activity]);

  // Subscribe to engine events for this client
  useEffect(() => {
    if (!normalizedClientId) return;
    const unsub = subscribeToActivity(normalizedClientId, (entries) => {
      setLiveActivity((prev) => mergeActivityEntries(prev, entries as unknown as ActivityLogEntry[]));
    });
    return unsub;
  }, [normalizedClientId]);

  // When forced panel opens, also set the category tab
  useEffect(() => {
    if (forcedPanel) {
      setActiveCategoryTab(forcedPanel);
    }
  }, [forcedPanel]);



  const getActiveProcessPayload = () => {
    if (!activeProcessTab || activeProcessTab === "all") return { processId: undefined, processName: undefined };
    const matched = processTabs?.find((p) => p.id === activeProcessTab);
    return {
      processId: activeProcessTab,
      processName: matched?.name || activeProcessTab,
    };
  };

  // Helper: append via engine (returns created entry or null on failure)
  const handleAppend = (
    entry: Omit<ActivityLogEntry, "id" | "timestamp"> & { id?: string; timestamp?: string }
  ): ActivityLogEntry | null => {
    if (!normalizedClientId) {
      console.error("[ActivityTab] appendActivity skipped: missing clientId", entry);
      return null;
    }
    const procPayload = getActiveProcessPayload();
    const enriched = {
      processId: entry.processId || procPayload.processId,
      processName: entry.processName || procPayload.processName,
      ...entry,
      clientId: normalizedClientId,
    } as any;

    const created = appendActivity(enriched) as unknown as ActivityLogEntry;
    if (created) {
      setLiveActivity((prev) => [created, ...prev]);
    }
    return created;
  };

  const isMatchingCategory = (entry: ActivityLogEntry) => {
    if (activeCategoryTab === "all") return true;
    const rawType = (entry as any).rawType || entry.type;
    if (activeCategoryTab === "whatsapp") return rawType === "whatsapp" || entry.type === "whatsapp";
    if (activeCategoryTab === "call")
      return ["call", "outbound_call", "inbound_call", "failed_call"].includes(rawType) ||
        ["call", "outbound_call", "inbound_call", "failed_call"].includes(entry.type) ||
        !!(entry as any).callId;
    if (activeCategoryTab === "sms") return rawType === "sms" || entry.type === "sms";
    if (activeCategoryTab === "email") return rawType === "email" || entry.type === "email";
    if (activeCategoryTab === "appointment")
      return rawType === "appointment_booked" || entry.type === "appointment_booked";
    return false;
  };

  // Helper to deduplicate items by ID
  const deduplicateActivities = (entries: ActivityLogEntry[]): ActivityLogEntry[] => {
    const seenIds = new Set<string>();
    return entries.filter((e) => {
      if (e.id && seenIds.has(e.id)) return false;
      if (e.id) seenIds.add(e.id);
      return true;
    });
  };

  const sorted = deduplicateActivities([...liveActivity]).sort((a, b) => {
    const ta = new Date(a.timestamp || a.date || "").getTime();
    const tb = new Date(b.timestamp || b.date || "").getTime();
    if (ta !== tb) return tb - ta; // newest first
    return ((b as any).seq ?? 0) - ((a as any).seq ?? 0);
  });

  const displayed = sorted.filter(isMatchingCategory);
  const timelineItems = groupTimelineItems(displayed);

  const handleCardView = (entry: ActivityLogEntry) => {
    const rawType = (entry as any).rawType || entry.type;
    const isCallType = ["call", "outbound_call", "inbound_call", "failed_call"].includes(rawType) ||
      ["call", "outbound_call", "inbound_call", "failed_call"].includes(entry.type) ||
      !!(entry as any).callId;

    if (isCallType) {
      const callId = (entry as any).callId || entry.refId || entry.id;
      if (onOpenCallDetail) onOpenCallDetail(callId, entry);
      if (onOpenActivity) onOpenActivity(entry);
      return;
    }
    if (rawType === "whatsapp" || entry.type === "whatsapp") {
      setThreadDrawerConversationId(entry.refId || entry.id);
      setThreadDrawerChannel("whatsapp");
      setShowThreadDrawer(true);
      return;
    }
    if (rawType === "sms" || entry.type === "sms") {
      setThreadDrawerConversationId(entry.refId || entry.id);
      setThreadDrawerChannel("sms");
      setShowThreadDrawer(true);
      return;
    }
    if (rawType === "email" || entry.type === "email") {
      if (onCloseParentDrawer) onCloseParentDrawer();
      navigate("/chats", { state: { clientId, channel: "email", emailId: entry.refId } });
      return;
    }
    if (rawType === "website_message" || rawType === "website") {
      if (onCloseParentDrawer) onCloseParentDrawer();
      navigate("/chats", { state: { clientId, channel: "website", threadId: entry.refId } });
      return;
    }
    if (onOpenActivity) onOpenActivity(entry);
  };

  const CATEGORY_TABS = [
    { id: "all", label: "All" },
    { id: "whatsapp", label: "WhatsApp" },
    { id: "call", label: "Call" },
    { id: "sms", label: "SMS" },
    { id: "email", label: "Email" },
    { id: "appointment", label: "Appointment" },
  ];

  const now = new Date().toISOString();

  return (
    <div>
      {/* Top Filter Bar */}
      <div className="flex items-center justify-start gap-2 mb-4 flex-wrap pb-3 border-b border-gray-100">
        {processTabs && processTabs.length > 0 && onProcessTabChange && (
          <select
            value={activeProcessTab || "all"}
            onChange={(e) => onProcessTabChange(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer text-gray-700 transition-all"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {processTabs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name === "All" || p.name === "all" ? "All Processes" : p.name}
              </option>
            ))}
          </select>
        )}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          {CATEGORY_TABS.map((cat) => {
            const isActive = activeCategoryTab === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setForcedPanel(null);
                  setActiveCategoryTab(cat.id);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  isActive ? "bg-[#1F2937] text-white shadow-sm font-semibold" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── WhatsApp compose panel ── */}
      {activeCategoryTab === "whatsapp" && (
        <div className="mb-4 p-3.5 rounded-xl border border-gray-200 bg-gray-50/70 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-900 font-semibold text-xs uppercase tracking-wider">
              <MessageCircle className="w-4 h-4 text-[#1F2937]" />
              <span>Send WhatsApp Message</span>
            </div>
            <span className="text-xs text-gray-800 font-medium bg-gray-200/80 px-2.5 py-0.5 rounded-full">
              {clientPhone || clientEmail || "WhatsApp Direct"}
            </span>
          </div>

          <textarea
            rows={2}
            placeholder={`Type WhatsApp message for ${clientName || "client"}...`}
            value={actionText}
            onChange={(e) => setActionText(e.target.value)}
            className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1F2937]/10 focus:border-[#1F2937] transition-all text-gray-800"
            style={{ fontFamily: "Outfit, sans-serif" }}
          />

          {/* Template inline selector when gear menu option toggled */}
          {showWpTemplateModal && (
            <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-2 text-xs">
              <p className="font-semibold text-gray-900">Select Approved WhatsApp Template</p>
              <div className="flex items-center gap-2">
                <select
                  value={wpSelectedTplId || (approvedTemplates[0]?.id || "")}
                  onChange={(e) => setWpSelectedTplId(e.target.value)}
                  className="flex-1 text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none"
                >
                  {approvedTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.category || "Utility"})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const conv = findOrCreateConversationForClient({
                      clientId: normalizedClientId,
                      phone: clientPhone,
                      name: clientName,
                      channel: "whatsapp",
                    });
                    const tpl = approvedTemplates.find((t) => t.id === (wpSelectedTplId || approvedTemplates[0]?.id)) || approvedTemplates[0];
                    if (tpl) {
                      const created = handleAppend({
                        type: "whatsapp" as any,
                        direction: "outbound" as any,
                        status: "delivered" as any,
                        messageText: `[Template: ${tpl.name}] ${tpl.bodyText || (tpl as any).body || ""}`,
                        phoneNumber: clientPhone || "+1 (555) 123-4567",
                        details: {
                          primary: `Template: ${tpl.name}`,
                          secondary: `To: ${clientName || "client"} (${clientPhone || "WhatsApp"})`,
                        },
                      });
                      if (!created) {
                        toast.error("Couldn't save this activity — client context missing");
                        return;
                      }
                      sendTemplate(conv.id, tpl);
                      toast.success(`Template "${tpl.name}" sent to ${clientName || "client"}`);
                      setShowWpTemplateModal(false);
                    }
                  }}
                  className="px-3 py-1.5 bg-[#1F2937] hover:bg-gray-800 text-white font-semibold rounded-lg shadow-sm"
                >
                  Send Template
                </button>
                <button
                  type="button"
                  onClick={() => setShowWpTemplateModal(false)}
                  className="px-2 py-1.5 text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 relative">
              {/* Paperclip attach button */}
              <label
                className="p-1.5 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
                title="Attach Document / Link"
              >
                <Paperclip className="w-4 h-4" />
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setActionText((prev) => (prev ? `${prev} [Attachment: ${file.name}]` : `[Attachment: ${file.name}]`));
                      toast.success(`Attached ${file.name}`);
                    }
                  }}
                />
              </label>

              {/* Gear Settings menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowWpGearMenu(!showWpGearMenu)}
                  className="p-1.5 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer flex items-center gap-1 text-xs"
                  title="WhatsApp Settings & Templates"
                >
                  <Settings className="w-4 h-4" />
                </button>

                {showWpGearMenu && (
                  <div className="absolute left-0 top-full mt-1 bg-white rounded-xl border border-gray-200 shadow-xl py-1 z-50 min-w-[200px]">
                    <button
                      type="button"
                      onClick={() => {
                        setShowWpGearMenu(false);
                        setShowWpTemplateModal(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-left text-gray-700 hover:bg-gray-50"
                    >
                      <FileText className="w-3.5 h-3.5 text-gray-700" />
                      <span>Send WhatsApp Template</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowWpGearMenu(false);
                        const created = handleAppend({
                          type: "whatsapp" as any,
                          direction: "outbound" as any,
                          status: "delivered",
                          timestamp: new Date().toISOString(),
                          details: {
                            primary: "Enrolled in Intake Campaign",
                            secondary: `Triggered onboarding flow for ${clientName || "client"}`,
                          },
                        });
                        if (!created) {
                          toast.error("Couldn't save this activity — client context missing");
                          return;
                        }
                        toast.success(`Client ${clientName || ""} enrolled in Intake Onboarding Campaign`);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-left text-gray-700 hover:bg-gray-50"
                    >
                      <Zap className="w-3.5 h-3.5 text-gray-700" />
                      <span>Enroll in Automation Campaign</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!actionText.trim()) { toast.error("Please enter a WhatsApp message"); return; }
                const msg = actionText.trim();
                const created = handleAppend({
                  type: "whatsapp" as any,
                  direction: "outbound" as any,
                  status: "delivered" as any,
                  messageText: msg,
                  phoneNumber: clientPhone || "+1 (555) 123-4567",
                  details: {
                    primary: msg,
                    secondary: `To: ${clientName || "client"} (${clientPhone || "WhatsApp"})`,
                  },
                });
                if (!created) {
                  toast.error("Couldn't save this activity — client context missing");
                  return;
                }
                const conv = findOrCreateConversationForClient({
                  clientId: normalizedClientId,
                  phone: clientPhone,
                  name: clientName,
                  channel: "whatsapp",
                });
                sendMessage(conv.id, msg);
                toast.success(`WhatsApp message sent to ${clientName || "client"}`);
                setActionText("");
              }}
              className="px-4 py-1.5 bg-[#1F2937] hover:bg-gray-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <MessageCircle className="w-3.5 h-3.5" /> Send WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* ── Call panel ── */}
      {activeCategoryTab === "call" && (
        <div className="mb-4 p-3.5 rounded-xl border border-gray-200 bg-gray-50/70 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-900 font-semibold text-xs uppercase tracking-wider">
              <Phone className="w-4 h-4 text-[#1F2937]" />
              <span>Outbound Call & AI Dialer</span>
            </div>
            <span className="text-xs text-gray-800 font-medium bg-gray-200/80 px-2.5 py-0.5 rounded-full">
              {clientPhone || "+1 (555) 123-4567"}
            </span>
          </div>
          <p className="text-xs text-gray-600" style={{ fontFamily: "Outfit, sans-serif" }}>
            Schedule a follow-up call or initiate an immediate phone call with {clientName || "the client"}.
          </p>
          <div className="flex items-center justify-end gap-2 pt-1 flex-wrap">
            <button
              type="button"
              onClick={() => handleOpenScheduleCall("schedule")}
              className="px-3.5 py-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <CalendarClock className="w-3.5 h-3.5" /> Schedule Call
            </button>
            <button
              type="button"
              onClick={() => {
                const created = handleAppend({
                  type: "outbound_call" as any,
                  direction: "outbound",
                  status: "scheduled",
                  callId: `CALL-${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  details: { primary: "Outbound call initiated", secondary: `To: ${clientPhone || clientName || "client"}` },
                });
                if (!created) {
                  toast.error("Couldn't save this activity — client context missing");
                  return;
                }
                toast.success(`Outbound call initiated to ${clientName || "client"}`);
              }}
              className="px-4 py-1.5 bg-[#1F2937] hover:bg-gray-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Phone className="w-3.5 h-3.5" /> Trigger Call
            </button>
          </div>
        </div>
      )}

      {/* ── SMS compose panel ── */}
      {activeCategoryTab === "sms" && (
        <div className="mb-4 p-3.5 rounded-xl border border-gray-200 bg-gray-50/70 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-900 font-semibold text-xs uppercase tracking-wider">
              <MessageSquare className="w-4 h-4 text-[#1F2937]" />
              <span>Send SMS Message</span>
            </div>
            <span className="text-xs text-gray-800 font-medium bg-gray-200/80 px-2.5 py-0.5 rounded-full">
              {clientPhone || "+1 (555) 123-4567"}
            </span>
          </div>
          <textarea
            rows={2}
            placeholder={`Type SMS message for ${clientName || "client"}...`}
            value={actionText}
            onChange={(e) => setActionText(e.target.value)}
            className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1F2937]/10 focus:border-[#1F2937] transition-all text-gray-800"
            style={{ fontFamily: "Outfit, sans-serif" }}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-gray-500 font-mono">{actionText.length} / 160 chars</span>
            <button
              type="button"
              onClick={() => {
                if (!actionText.trim()) { toast.error("Please enter an SMS message"); return; }
                const msg = actionText.trim();
                const created = handleAppend({
                  type: "sms" as any,
                  direction: "outbound" as any,
                  status: "delivered" as any,
                  messageText: msg,
                  phoneNumber: clientPhone || "+1 (555) 123-4567",
                  details: {
                    primary: msg,
                    secondary: `To: ${clientName || "client"} (${clientPhone || "SMS"})`,
                  },
                });
                if (!created) {
                  toast.error("Couldn't save this activity — client context missing");
                  return;
                }
                const conv = findOrCreateConversationForClient({
                  clientId: normalizedClientId,
                  phone: clientPhone,
                  name: clientName,
                  channel: "sms",
                });
                sendMessage(conv.id, msg);
                toast.success(`SMS sent to ${clientName || "client"}`);
                setActionText("");
              }}
              className="px-4 py-1.5 bg-[#1F2937] hover:bg-gray-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Send SMS
            </button>
          </div>
        </div>
      )}

      {/* ── Email compose panel ── */}
      {activeCategoryTab === "email" && (
        <div className="mb-4 p-3.5 rounded-xl border border-gray-200 bg-gray-50/70 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-900 font-semibold text-xs uppercase tracking-wider">
              <Mail className="w-4 h-4 text-[#1F2937]" />
              <span>Compose Email</span>
            </div>
            <span className="text-xs text-gray-800 font-medium bg-gray-200/80 px-2.5 py-0.5 rounded-full">
              {clientEmail || "client@email.com"}
            </span>
          </div>
          <input
            type="text"
            placeholder="Subject line..."
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1F2937]/10 focus:border-[#1F2937] transition-all text-gray-800"
            style={{ fontFamily: "Outfit, sans-serif" }}
          />
          <textarea
            rows={2}
            placeholder={`Type email content for ${clientName || "client"}...`}
            value={actionText}
            onChange={(e) => setActionText(e.target.value)}
            className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1F2937]/10 focus:border-[#1F2937] transition-all text-gray-800"
            style={{ fontFamily: "Outfit, sans-serif" }}
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                if (!emailSubject.trim() && !actionText.trim()) {
                  toast.error("Please enter email subject or message body"); return;
                }
                const subj = emailSubject.trim();
                const body = actionText.trim();
                const created = handleAppend({
                  type: "email" as any,
                  direction: "outbound",
                  status: "delivered",
                  subject: subj || "(no subject)",
                  bodyPreview: body.slice(0, 200),
                  toOrFrom: clientEmail || "",
                  timestamp: new Date().toISOString(),
                  details: { primary: subj || body, secondary: `To: ${clientEmail || clientName || "client"}` },
                });
                if (!created) {
                  toast.error("Couldn't save this activity — client context missing");
                  return;
                }
                toast.success(`Email sent to ${clientEmail || clientName || "client"}`);
                setEmailSubject("");
                setActionText("");
              }}
              className="px-4 py-1.5 bg-[#1F2937] hover:bg-gray-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Mail className="w-3.5 h-3.5" /> Send Email
            </button>
          </div>
        </div>
      )}

      {/* ── Appointment panel — opens real drawer ── */}
      {activeCategoryTab === "appointment" && (
        <div className="mb-4 p-3.5 rounded-xl border border-gray-200 bg-gray-50/70 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-900 font-semibold text-xs uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-[#1F2937]" />
              <span>Book Appointment</span>
            </div>
            <span className="text-xs text-gray-800 font-medium bg-gray-200/80 px-2.5 py-0.5 rounded-full">
              {clientName || "Client"}
            </span>
          </div>
          <p className="text-xs text-gray-600" style={{ fontFamily: "Outfit, sans-serif" }}>
            Schedule a new appointment with {clientName || "the client"} using the full booking flow.
          </p>
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => {
                if (onOpenScheduleAppointment) {
                  onOpenScheduleAppointment();
                } else {
                  handleOpenScheduleAppt("create");
                }
              }}
              className="px-5 py-2 bg-[#1F2937] hover:bg-gray-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Calendar className="w-3.5 h-3.5" /> Create New Appointment
            </button>
          </div>
        </div>
      )}

      {/* ── Timeline ── */}
      <div className="relative p-2">
        {timelineItems.length === 0 ? (
          <div className="text-center py-10 text-gray-400 italic text-sm">{emptyMessage}</div>
        ) : (
          timelineItems.map((item, i) => {
            const isLast = i === timelineItems.length - 1;
            if (item.isThread === true) {
              return (
                <ThreadedCard
                  key={item.group.id}
                  group={item.group}
                  isLast={isLast}
                  onOpenComposePanel={(type) => {
                    setForcedPanel(type);
                    setActiveCategoryTab(type);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  onOpenThreadDrawer={(convId, channel = "whatsapp") => {
                    setThreadDrawerConversationId(convId);
                    setThreadDrawerChannel(channel);
                    setShowThreadDrawer(true);
                  }}
                />
              );
            } else {
              const singleEntry = item.entry;
              return (
                <ActivityCard
                  key={singleEntry.id}
                  entry={singleEntry}
                  isLast={isLast}
                  onView={() => handleCardView(singleEntry)}
                  onOpenCallDetail={onOpenCallDetail}
                  onCloseParentDrawer={onCloseParentDrawer}
                  clientId={clientId}
                  clientName={clientName}
                  clientPhone={clientPhone}
                  clientEmail={clientEmail}
                  onAppendActivity={handleAppend}
                  onOpenScheduleFollowUp={() => handleOpenScheduleCall("schedule", singleEntry)}
                  onOpenRescheduleAppointment={() => handleOpenScheduleAppt("reschedule")}
                  onOpenComposePanel={(type) => {
                    setForcedPanel(type);
                    setActiveCategoryTab(type);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  onOpenThreadDrawer={(convId, channel = "whatsapp") => {
                    setThreadDrawerConversationId(convId);
                    setThreadDrawerChannel(channel);
                    setShowThreadDrawer(true);
                  }}
                  onOpenEmailThreadDrawer={(convId, subject) => {
                    setEmailThreadId(convId);
                    setEmailThreadSubject(subject || "");
                    setShowEmailThreadDrawer(true);
                  }}
                  navigate={navigate}
                />
              );
            }
          })
        )}
      </div>

      {/* ── Extracted Schedule Call Drawer ── */}
      <ScheduleCallDrawer
        isOpen={showScheduleCallDrawer}
        onClose={() => setShowScheduleCallDrawer(false)}
        mode={scMode}
        values={scFormValues}
        onChange={(patch) => setScFormValues((prev) => ({ ...prev, ...patch }))}
        onSave={handleScheduleCallSave}
        isSaving={scIsSaving}
        clients={[lockedClientForTab]}
        processStagesMap={processStagesMap}
        lockedClient={lockedClientForTab}
      />

      {/* ── Shared Schedule Appointment Drawer ── */}
      <ScheduleAppointmentDrawer
        isOpen={showScheduleApptDrawer}
        onClose={() => setShowScheduleApptDrawer(false)}
        mode={apptMode}
        values={apptFormValues}
        onChange={(patch) => setApptFormValues((prev) => ({ ...prev, ...patch }))}
        onSave={handleScheduleApptSave}
        isSaving={apptIsSaving}
        employees={[
          { id: 1, name: "John Smith", email: "john.smith@healthcare.com" },
          { id: 2, name: "Sarah Johnson", email: "sarah.j@healthcare.com" },
        ]}
        clients={[
          { id: 1, name: clientName || "Client", email: clientEmail || "client@email.com", phone: clientPhone || "555-0100" },
        ]}
        processStages={processStagesMap}
        customFields={[]}
        visibleCustomFieldKeys={[]}
        customFieldValues={{}}
        onCustomFieldChange={() => {}}
        onOpenSelectFields={() => {}}
        onOpenCreateField={() => {}}
      />

      {/* ── Conversation Thread Drawer (WhatsApp & SMS) ── */}
      <ConversationThreadDrawer
        isOpen={showThreadDrawer}
        onClose={() => setShowThreadDrawer(false)}
        conversationId={threadDrawerConversationId}
        channel={threadDrawerChannel}
        clientId={normalizedClientId}
        clientName={clientName}
        clientPhone={clientPhone}
      />

      {/* ── Email Thread Drawer ── */}
      <EmailThreadDrawer
        isOpen={showEmailThreadDrawer}
        onClose={() => setShowEmailThreadDrawer(false)}
        clientId={clientId}
        clientName={clientName}
        clientEmail={clientEmail}
        threadId={emailThreadId}
        initialSubject={emailThreadSubject}
      />
    </div>
  );
}
