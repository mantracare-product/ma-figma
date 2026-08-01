import { useState } from "react";
import { useNavigate } from "react-router";
import {
  LogIn, ArrowRightCircle, CheckCircle2, Phone, MessageCircle, MessageSquare,
  Mail, Zap, Calendar, Pencil, Globe, PhoneIncoming, PhoneOutgoing, PhoneOff
} from "lucide-react";

export type ActivityType =
  | "process_entry"
  | "whatsapp"
  | "sms"
  | "email"
  | "webhook_trigger"
  | "field_update"
  | "appointment_booked"
  | "call"
  | "outbound_call"
  | "inbound_call"
  | "failed_call"
  | "stage_update"
  | "stage_change"
  | "process_completed"
  | "website_message"
  | "website";

export interface ActivityLogEntry {
  id: string;
  type: ActivityType | string;
  timestamp?: string;
  date?: string;
  time?: string;
  status?: "success" | "failed" | "pending" | "Completed" | "Failed" | "Pending" | string;
  sourceStepName?: string;
  refId?: string;
  callId?: string;
  direction?: "inbound" | "outbound";
  details: {
    primary: string;
    secondary?: string;
  };
  title?: string;
  description?: string;
  rawType?: string;
}

const CHRONO_RANK: Record<string, number> = {
  process_entry: 0,
  whatsapp: 1,
  sms: 1,
  email: 1,
  webhook_trigger: 1,
  field_update: 1,
  appointment_booked: 1,
  website_message: 1,
  website: 1,
  call: 2,
  outbound_call: 2,
  inbound_call: 2,
  failed_call: 2,
  stage_update: 3,
  stage_change: 3,
  process_completed: 4,
};

const ACTIVITY_ICON_BG: Record<string, string> = {
  process_entry: "#EFF6FF",
  call: "#DBEAFE",
  outbound_call: "#DBEAFE",
  inbound_call: "#DBEAFE",
  failed_call: "#FEE2E2",
  whatsapp: "#DCFCE7",
  sms: "#E0E7FF",
  email: "#FEF3C7",
  stage_update: "#F3E8FF",
  stage_change: "#F3E8FF",
  webhook_trigger: "#FFE4E6",
  appointment_booked: "#CFFAFE",
  field_update: "#F1F5F9",
  process_completed: "#DCFCE7",
  website_message: "#F3E8FF",
  website: "#F3E8FF",
};

const HEADING_BY_TYPE: Record<string, string> = {
  process_entry: "Process Entered",
  stage_update: "Stage Updated",
  stage_change: "Stage Changed",
  call: "Outbound Call Triggered",
  outbound_call: "Outbound Call Completed",
  inbound_call: "Inbound Call Received",
  failed_call: "Outbound Call Failed",
  whatsapp: "WhatsApp Message Triggered",
  sms: "SMS Triggered",
  email: "Email Triggered",
  webhook_trigger: "Webhook Triggered",
  field_update: "Field Updated",
  appointment_booked: "Appointment Booked",
  process_completed: "Process Completed",
  website_message: "Website Message Received",
  website: "Website Message Received",
};

const ActivityIcon = ({ type, direction, status }: { type: string; direction?: string; status?: string }) => {
  const iconClass = "w-4 h-4";
  if (type === "inbound_call" || (type === "call" && direction === "inbound")) {
    return <PhoneIncoming className={`${iconClass} text-blue-600`} />;
  }
  if (type === "outbound_call" || (type === "call" && direction === "outbound")) {
    return <PhoneOutgoing className={`${iconClass} text-blue-600`} />;
  }
  if (type === "failed_call" || status === "failed" || status === "Failed") {
    return <PhoneOff className={`${iconClass} text-red-600`} />;
  }

  switch (type) {
    case "process_entry":
      return <LogIn className={`${iconClass} text-blue-600`} />;
    case "stage_update":
    case "stage_change":
      return <ArrowRightCircle className={`${iconClass} text-purple-600`} />;
    case "process_completed":
      return <CheckCircle2 className={`${iconClass} text-emerald-600`} />;
    case "call":
      return <Phone className={`${iconClass} text-blue-600`} />;
    case "whatsapp":
      return <MessageCircle className={`${iconClass} text-emerald-600`} />;
    case "sms":
      return <MessageSquare className={`${iconClass} text-indigo-600`} />;
    case "email":
      return <Mail className={`${iconClass} text-amber-600`} />;
    case "webhook_trigger":
      return <Zap className={`${iconClass} text-rose-600`} />;
    case "appointment_booked":
      return <Calendar className={`${iconClass} text-cyan-600`} />;
    case "field_update":
      return <Pencil className={`${iconClass} text-slate-600`} />;
    case "website_message":
    case "website":
      return <Globe className={`${iconClass} text-purple-600`} />;
    default:
      return <Pencil className={`${iconClass} text-slate-600`} />;
  }
};

export interface ActivityTabProps {
  activity: ActivityLogEntry[];
  onOpenActivity?: (entry: ActivityLogEntry) => void;
  onOpenCallDetail?: (callId: string, entry?: ActivityLogEntry) => void;
  clientId?: string;
  processTabs?: { id: string; name: string }[];
  activeProcessTab?: string;
  onProcessTabChange?: (tabId: string) => void;
  onCloseParentDrawer?: () => void;
  emptyMessage?: string;
}

export default function ActivityTab({
  activity = [],
  onOpenActivity,
  onOpenCallDetail,
  clientId,
  processTabs,
  activeProcessTab,
  onProcessTabChange,
  onCloseParentDrawer,
  emptyMessage = "No activity yet",
}: ActivityTabProps) {
  const navigate = useNavigate();

  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("all");

  const toChronologicalOrder = (entries: ActivityLogEntry[]) =>
    [...entries].sort((a, b) => {
      const t = new Date(a.timestamp || "").getTime() - new Date(b.timestamp || "").getTime();
      if (!isNaN(t) && t !== 0) return t;
      const rankA = CHRONO_RANK[a.rawType || a.type] ?? 1;
      const rankB = CHRONO_RANK[b.rawType || b.type] ?? 1;
      return rankA - rankB;
    });

  const displayOrder = [...toChronologicalOrder(activity)].reverse();

  const isMatchingCategory = (entry: ActivityLogEntry) => {
    if (activeCategoryTab === "all") return true;
    const rawType = entry.rawType || entry.type;
    if (activeCategoryTab === "whatsapp") {
      return rawType === "whatsapp" || entry.type === "whatsapp";
    }
    if (activeCategoryTab === "call") {
      return (
        rawType === "call" ||
        rawType === "outbound_call" ||
        rawType === "inbound_call" ||
        rawType === "failed_call" ||
        entry.type === "call" ||
        Boolean(entry.callId)
      );
    }
    if (activeCategoryTab === "sms") {
      return rawType === "sms" || entry.type === "sms";
    }
    if (activeCategoryTab === "email") {
      return rawType === "email" || entry.type === "email";
    }
    if (activeCategoryTab === "appointment") {
      return (
        rawType === "appointment_booked" ||
        rawType === "appointment" ||
        entry.type === "appointment_booked" ||
        entry.type === "appointment"
      );
    }
    return true;
  };

  const filteredDisplayOrder = displayOrder.filter(isMatchingCategory);

  const handleCardClick = (entry: ActivityLogEntry) => {
    const rawType = entry.rawType || entry.type;
    const isCallType =
      rawType === "call" ||
      rawType === "outbound_call" ||
      rawType === "inbound_call" ||
      rawType === "failed_call" ||
      entry.type === "call" ||
      Boolean(entry.callId);

    if (isCallType) {
      const callId = entry.callId || entry.refId || entry.id;
      if (onOpenCallDetail) {
        onOpenCallDetail(callId, entry);
      }
      if (onOpenActivity) {
        onOpenActivity(entry);
      }
      return;
    }

    if (rawType === "whatsapp" || entry.type === "whatsapp") {
      if (onCloseParentDrawer) onCloseParentDrawer();
      navigate("/chats", {
        state: {
          clientId,
          channel: "whatsapp",
          threadId: entry.refId,
        },
      });
      return;
    }

    if (rawType === "sms" || entry.type === "sms") {
      if (onCloseParentDrawer) onCloseParentDrawer();
      navigate("/chats", {
        state: {
          clientId,
          channel: "sms",
          threadId: entry.refId,
        },
      });
      return;
    }

    if (rawType === "email" || entry.type === "email") {
      if (onCloseParentDrawer) onCloseParentDrawer();
      navigate("/chats", {
        state: {
          clientId,
          channel: "email",
          emailId: entry.refId,
        },
      });
      return;
    }

    if (rawType === "website_message" || rawType === "website" || entry.type === "website_message") {
      if (onCloseParentDrawer) onCloseParentDrawer();
      navigate("/chats", {
        state: {
          clientId,
          channel: "website",
          threadId: entry.refId,
        },
      });
      return;
    }

    if (onOpenActivity) {
      onOpenActivity(entry);
    }
  };

  const CATEGORY_TABS = [
    { id: "whatsapp", label: "WhatsApp" },
    { id: "call", label: "Call" },
    { id: "sms", label: "SMS" },
    { id: "email", label: "Email" },
    { id: "appointment", label: "Appointment" },
  ];

  return (
    <div>
      {/* Top Filter Bar: Single Process Dropdown + Activity Category Capsules from the left corner */}
      <div className="flex items-center justify-start gap-2 mb-4 flex-wrap pb-3 border-b border-gray-100">
        {/* Single Process Filter Dropdown */}
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

        {/* Activity Category Capsules (Immediately adjacent) */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          {CATEGORY_TABS.map((cat) => {
            const isActive = activeCategoryTab === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategoryTab((prev) => (prev === cat.id ? "all" : cat.id))}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm font-semibold"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="relative p-2">
        {filteredDisplayOrder.length === 0 ? (
          <div className="text-center py-10 text-gray-400 italic text-sm">
            {emptyMessage}
          </div>
        ) : (
          filteredDisplayOrder.map((entry, i) => {
            const isLast = i === filteredDisplayOrder.length - 1;
            const rawType = entry.rawType || entry.type;
            const heading =
              entry.type === "call" && entry.direction === "inbound"
                ? "Inbound Call Received"
                : HEADING_BY_TYPE[rawType] || HEADING_BY_TYPE[entry.type] || entry.title || "Activity";

            const primaryDetail =
              entry.details?.primary ||
              (entry.title && entry.title !== heading ? entry.title : "") ||
              (entry.description ? entry.description : "");
            const secondaryDetail =
              entry.details?.secondary ||
              (entry.description && entry.description !== primaryDetail ? entry.description : "");
            const isPending = entry.status === "pending" || entry.status === "Pending";
            const isFailed = entry.status === "failed" || entry.status === "Failed";
            const displayTimestamp =
              entry.timestamp ||
              (entry.date ? `${entry.date}${entry.time ? " " + entry.time : ""}` : "");

            return (
              <div key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
                {/* Amazon-tracker connecting line */}
                {!isLast && (
                  <div
                    className="absolute left-[17px] top-9 bottom-0 w-[2px] z-0"
                    style={{
                      backgroundColor: isPending ? "transparent" : "#1E88E5",
                      backgroundImage: isPending
                        ? "repeating-linear-gradient(to bottom, #CBD5E1 0 4px, transparent 4px 8px)"
                        : undefined,
                    }}
                  />
                )}

                {/* Node Icon */}
                <div
                  className="relative z-10 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border-2"
                  style={{
                    backgroundColor: isFailed ? "#FEE2E2" : ACTIVITY_ICON_BG[rawType] || ACTIVITY_ICON_BG[entry.type] || "#F1F5F9",
                    borderColor: isFailed ? "#DC2626" : isPending ? "#CBD5E1" : "transparent",
                  }}
                >
                  <ActivityIcon type={rawType || entry.type} direction={entry.direction} status={entry.status} />
                </div>

                {/* Card Container */}
                <button
                  onClick={() => handleCardClick(entry)}
                  className="flex-1 text-left p-3 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-sm font-bold text-gray-900"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      {heading}
                    </span>
                    <span
                      className="text-xs text-gray-400 whitespace-nowrap"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {displayTimestamp}
                    </span>
                  </div>

                  <div className="mt-1.5 space-y-0.5">
                    <p
                      className="text-xs text-gray-700 font-medium"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {primaryDetail}
                    </p>
                    {secondaryDetail && (
                      <p
                        className="text-xs text-gray-500"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {secondaryDetail}
                      </p>
                    )}
                    {entry.sourceStepName && (
                      <p className="text-[11px] text-gray-400">via {entry.sourceStepName}</p>
                    )}
                  </div>

                  {(rawType === "website_message" ||
                    rawType === "website" ||
                    entry.type === "website_message" ||
                    primaryDetail.toLowerCase().includes("website") ||
                    secondaryDetail.toLowerCase().includes("website")) && (
                      <div className="mt-2.5">
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onCloseParentDrawer) onCloseParentDrawer();
                            navigate("/chats", {
                              state: {
                                clientId,
                                channel: "website",
                              },
                            });
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                        >
                          <Globe className="w-3.5 h-3.5 text-purple-600" />
                          View Website Chat
                        </span>
                      </div>
                    )}

                  {entry.status && entry.status !== "success" && entry.status !== "Completed" && (
                    <span
                      className="inline-block mt-2 text-[11px] px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: isFailed ? "#FEE2E2" : "#FEF3C7",
                        color: isFailed ? "#DC2626" : "#CA8A04",
                      }}
                    >
                      {entry.status}
                    </span>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
